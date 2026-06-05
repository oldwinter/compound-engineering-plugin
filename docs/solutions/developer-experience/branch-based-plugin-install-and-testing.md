---
title: "Claude Code plugins 的 branch-based plugin install 和 testing"
date: 2026-03-26
problem_type: developer_experience
category: developer-experience
component: development_workflow
root_cause: missing_workflow_step
resolution_type: workflow_improvement
severity: medium
tags:
  - cli
  - plugin-install
  - branch-testing
  - developer-experience
  - git-clone
  - plugin-path
symptoms:
  - "无法从特定 git branch 安装或测试 Claude Code plugin"
  - "install command 总是从 GitHub clone default branch"
  - "claude --plugin-dir 只接受 local filesystem path，没有 branch support"
  - "Developers 必须手动 checkout branches 才能测试他人的 plugin changes"
root_cause_detail: "CLI 缺少在安装或测试 plugins 时指定特定 git branch 的机制。Claude Code 的 --plugin-dir flag 只接受 local paths，install command 没有 --branch option。"
solution_summary: "新增 plugin-path subcommand，将特定 branch clone 到 deterministic cache path（~/.cache/compound-engineering/branches/），并输出给 claude --plugin-dir 使用。也为 non-Claude targets 的 install command 添加 --branch flag。"
key_insight: "Worktree-based development 意味着多个 branches 同时 active，repo root checkout 无法作为可靠 plugin source。基于 sanitized branch name 的 deterministic cache path 支持 branch-specific plugin testing，且不打扰任何 checkout；重复运行通过 git fetch + reset --hard 原地更新。"
files_changed:
  - src/commands/plugin-path.ts
  - src/commands/install.ts
  - src/index.ts
  - tests/plugin-path.test.ts
  - tests/cli.test.ts
verification_steps:
  - "运行 bun test，确认所有 tests 通过，包括 5 个新的 plugin-path tests 和 1 个新的 CLI test"
  - "测试 plugin-path subcommand 会为给定 branch 输出正确 deterministic cache path"
  - "测试 install --branch flag 会为 non-Claude targets 从指定 branch clone"
  - "验证在同一 branch 上重新运行 plugin-path 会通过 fetch+reset 更新，而不是重新 clone"
related_docs:
  - docs/solutions/adding-converter-target-providers.md
  - docs/solutions/plugin-versioning-requirements.md
---

## 问题

compound-engineering plugin CLI 的 `install` command 总是从 GitHub clone default branch，而 Claude Code 的 `--plugin-dir` flag 只接受 local filesystem paths。想从特定 git branch 测试 plugin 的 developers 必须在本地 repo 中手动 checkout 该 branch，从而打断 working tree。

这在 worktree-based workflows 中尤其痛苦，因为 `./plugins/compound-engineering` 总是指向 main checkout 当前所在的 branch。两个具体场景：

- **Cross-repo**：你在另一个 project 中工作，并想使用某个 CE branch 作为 plugin。没有该能力时，你必须切换 CE repo 的 checkout，而它很可能正有其他 WIP。
- **Same-repo**：你在 CE 自身工作，main checkout 是 `feat/feature-2`，某个 worktree 是 `feat/feature-1`。你想在继续开发 feature-1 的 plugin 时继续开发 feature-2。main checkout 无法同时服务两个目的。

注意：`--branch` flag 适用于 pushed branches（remote 上可用的 branches）。对于 unpushed local worktree branches，developers 可以直接将 `--plugin-dir` 指向 worktree path（例如 `claude --plugin-dir /path/to/worktree/plugins/compound-engineering`）。

---

## 症状

- 运行 `bunx compound-engineering install <plugin>` 总是 fetch default branch，不管接受 review 的 changes 位于哪个 branch。
- `claude --plugin-dir` 需要 local path，因此无法在不手动 `git clone` 或 `git checkout` 的情况下指向 remote branch。
- 测试 PR branches 的 developers 必须 stash 或 commit 本地工作、切换 branches、测试，再切回来，这是 disruptive 且 error-prone 的 workflow。
- 在 worktree-based workflows 中，repo root 的 `./plugins/compound-engineering` 总是指向 main checkout 的 branch，而不是正在开发的 worktree branch。同时处理多个 branches 的 developers 没有符合人体工学的方式从特定 worktree branch 安装。
- 不存在为 automated testing 启动 branch-specific plugin directory 的 scripting path。

---

## 无效做法

- **使用 `/tmp/` 存放 cloned branches** 被拒绝，因为 temporary directories 会在 reboot 时清除，迫使每个 session 完整 re-clone，并丢失 fast-update path。
- **随机 temp directory names**（例如 `mktemp -d`）被拒绝，因为它们会导致 directory proliferation，并且无法重新运行同一命令进行原地更新。
- **扩展 `claude --plugin-dir` 本身** 不可行，因为该 flag 归 Claude Code 所有，且只接受 local filesystem paths；solution 必须位于 plugin CLI layer。
- **Symlinking bundled plugin** 无济于事，因为 bundled copy 总是 pinned 到已安装 CLI version，而不是任意 remote branch。
- **Naive branch sanitization**（`replace(/[^a-zA-Z0-9._-]/g, "-")`）会将不同 branches 折叠到同一 cache path（例如 `feat/foo-bar` 和 `feat-foo/bar` 都变成 `feat-foo-bar`）。随后尝试 escape-then-replace scheme（`~` -> `~~`、`/` -> `~`），但仍不是 injective：`feat~~foo` 和 `feat~//foo` 都会产生 `feat~~~~foo`。正确 insight 是 `~` 在 git branch names 中非法（`git-check-ref-format` 将其保留给 reflog notation），因此简单的 `/` -> `~` replacement 无需 escape step 就是 injective。

---

## 解决方案

添加了两个互补 features：

### 1. 新 `plugin-path` command（用于 Claude Code）

将 branch clone 到 deterministic cache directory，并打印 path 供 `claude --plugin-dir` 使用。

```bash
bun run src/index.ts plugin-path compound-engineering --branch feat/new-agents
# Output: claude --plugin-dir ~/.cache/compound-engineering/branches/compound-engineering-feat~new-agents/plugins/compound-engineering
```

`src/commands/plugin-path.ts` 中的关键 implementation details：

- Cache path（缓存路径）：`~/.cache/compound-engineering/branches/<plugin>-<sanitized-branch>/`
- Branch sanitization：`/` -> `~`，然后去掉剩余非 `[a-zA-Z0-9._~-]` 字符。这是 injective，因为 `~` 在 git branch names 中非法（`git-check-ref-format` 将其保留给 reflog notation），因此没有合法 branch input 包含 `~`，mapping 是 1:1。
- 首次运行：`git clone --depth 1 --branch <name> <source> <dest>`
- 重新运行：`git fetch origin <branch>` + `git reset --hard origin/<branch>`

### 2. `install` command 上的 `--branch` flag（用于 Codex、OpenCode 等）

将 branch name 贯穿完整 resolution chain，让 `install` 从指定 branch 而不是 default clone。

```bash
bun run src/index.ts install compound-engineering --to codex --branch feat/new-agents
```

`src/commands/install.ts` 中的变更：

- 提供 `--branch` 时，跳过 bundled plugin lookup（用户明确想要 remote version）
- 贯穿 `resolvePluginPath` -> `resolveGitHubPluginPath` -> `cloneGitHubRepo`
- `cloneGitHubRepo` 有条件地向 `git clone --depth 1` 添加 `--branch <name>`

### 二者关键区别

`plugin-path` 将 checkout 缓存在 `~/.cache/`，以便跨 sessions 复用。`install --branch` 使用 ephemeral temp directory，install 完成后会清理；它只需要 clone 存活到读取并转换 plugin 为止。

---

## 为什么有效

根本问题是缺少 indirection layer：CLI 假设 "install" 总是意味着“使用 default branch”，而 Claude Code 假设 "plugin directory" 总是意味着“本地已经存在的 path”。该 solution 通过以下方式弥合差距：

- **Deterministic cache paths** 意味着同一 branch 始终映射到同一 directory。无 proliferation，无歧义。
- **重新运行时 fetch + hard reset** 可保持 cached checkout 最新，而不需要完整 re-clone，使 iteration 快速。
- **`~/.cache/`** 遵循 XDG conventions，跨 reboot 保留，并被 users 和 tooling 理解为可安全删除的 cache layer。
- **`COMPOUND_PLUGIN_GITHUB_SOURCE` env var** 适用于两个 features，允许 tests 使用 local git repos 并避免 network dependency。

---

## 预防

- **Test coverage**：`tests/plugin-path.test.ts`（6 个 tests：clone-to-cache、slash sanitization、update-on-rerun、slash-placement collision resistance、nonexistent branch error、nonexistent plugin error）和 `tests/cli.test.ts`（1 个 test：install --branch clones specific branch）。所有 tests 都通过 `COMPOUND_PLUGIN_GITHUB_SOURCE` 使用 local git repos。
- **Cache directory convention**：任何未来需要 ephemeral 或 semi-persistent clones 的 features，都应使用带 deterministic、sanitized subdirectory names 的 `~/.cache/compound-engineering/<purpose>/`。对任何受益于跨 reboot 保留的内容，避免使用 `/tmp/`。
- **Branch sanitization**：在 filesystem paths 中使用 branch names 前，始终 sanitize。使用 `~` 作为 slash replacement 是 injective，因为 `~` 在 git branch names 中非法（`git-check-ref-format`）。Naive `replace(/[^a-zA-Z0-9._-]/g, "-")` 不足，因为它会将 `feat/foo-bar` 和 `feat-foo/bar` 这样的 branches 折叠到同一路径。
- **Resolution chain threading**：向 CLI 添加新的 resolution strategies 时，将 optional parameters 贯穿完整 `resolvePluginPath -> resolveGitHubPluginPath -> cloneGitHubRepo` chain，而不是在 top level 分支。这能保持 resolution logic 可组合。
