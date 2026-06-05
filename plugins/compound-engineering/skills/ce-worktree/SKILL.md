---
name: ce-worktree
description: 为 parallel feature work 或 PR review 创建 isolated git worktree。当开始不应扰动 current checkout 的工作，或 `ce-work` / `ce-code-review` 提供 worktree option 时使用。
allowed-tools: Bash(bash *worktree-manager.sh)
---

# Worktree Creation（创建 Worktree）

在 `.worktrees/<branch>` 下创建 worktree，并完成 `git worktree add` 本身不会处理的 branch-specific setup：

- 从 main repo 复制 `.env`、`.env.local`、`.env.test` 等（跳过 `.env.example`）
- Trust `mise`/`direnv` configs，并带 branch-aware safety rules，确保 review branches 不会自动 trust untrusted `.envrc` content
- 如果 `.worktrees` 尚未 ignored，则加入 `.gitignore`
- 不修改 main repo checkout；`from-branch` 被 fetched，而不是 checked out

## Creating a worktree（创建 worktree）

通过 runtime Bash tool 调用 bundled script。在 Claude Code 中，`${CLAUDE_SKILL_DIR}` 会在 marketplace-cached installs 和 `claude --plugin-dir` local development 中 resolve 到 skill 自身目录；runtime Bash tool 的 CWD 是用户 project，而不是 skill directory，所以裸 `bash scripts/worktree-manager.sh` 会失败。在其他 targets（Codex、Gemini、Pi 等）中，`${CLAUDE_SKILL_DIR}` 未设置，`:-.` fallback 会得到这些 harnesses 期待的裸 relative path。

```bash
bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create <branch-name> [from-branch]
```

Defaults（默认值）:
- `from-branch` 默认为 origin 的 default branch（无法 resolve 时为 `main`）
- New branch 基于 `origin/<from-branch>` 创建（remote 不可用时使用 local ref）

Examples（示例）:
```bash
bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create feat/login
bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create fix/email-validation develop
```

创建后，用 `cd .worktrees/<branch-name>` 切到 worktree。

## Other worktree operations（其他 worktree 操作）

直接使用 `git`；不需要 wrapper，也没有提供 wrapper：

```bash
git worktree list                          # list worktrees
git worktree remove .worktrees/<branch>    # remove a worktree
cd .worktrees/<branch>                     # switch to a worktree
cd "$(git rev-parse --show-toplevel)"      # return to main checkout
```

要把 `.env*` files 复制到此前创建但缺少它们的 existing worktree，请从 main repo 运行（不要在 worktree 内运行，因为 branch names 常含 `feat/login` 这类 slashes）：
```bash
cp .env* .worktrees/<branch>/
```

## Dev tool trust behavior（开发工具 trust 行为）

当存在 mise 或 direnv configs 时，script 会尝试 trust 它们，避免 hooks 和 scripts 被 interactive prompts 阻塞。Trust 会 against reference branch 做 baseline-check：

- **Trusted base branches**（`main`、`develop`、`dev`、`trunk`、`staging`、`release/*`）：new worktree 的 configs 会与该 branch 比较；unchanged configs 自动 trust。允许 `direnv allow`。
- **Other branches**（feature branches、PR review branches）：configs 与 default branch 比较；无论如何跳过 `direnv allow`，因为 `.envrc` 可以 source direnv 不验证的 files。

Modified configs 永不 auto-trusted。Script 会打印 review 后可运行的 manual trust command。

## When to create a worktree（何时创建 worktree）

在以下情况创建 worktree：
- Review PR，同时保持 main checkout 可用于其他工作
- 并行运行多个 features，避免 branch-switching overhead
- 保持 default branch 没有 in-progress state

对于可以在 main checkout 的 branch 中完成的 single-task work，不要创建 worktree。

## Integration（集成）

`ce-work` 和 `ce-code-review` 会把此 skill 作为 option 提供。当用户在这些 flows 中选择 "worktree" 时，调用 `bash "${CLAUDE_SKILL_DIR:-.}/scripts/worktree-manager.sh" create <branch>`，并使用从 work description 派生的 meaningful branch name（例如 `feat/crowd-sniff`、`fix/email-validation`）。避免 `worktree-jolly-beaming-raven` 这类 obscure work 的 auto-generated names。

## Troubleshooting（故障排除）

**"Worktree already exists"**：path 已被使用。重新创建前，切到它（`cd .worktrees/<branch>`）或移除它（`git worktree remove .worktrees/<branch>`）。

**"Cannot remove worktree: it is the current worktree"**：先 `cd` 离开 worktree，再运行 `git worktree remove`。

**Dev tool trust was skipped**：script 会打印 manual command。先 review config diff（`git diff <base-ref> -- .envrc`），再从 worktree directory 运行打印的 command。
