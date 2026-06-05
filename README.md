# Compound Engineering

[![Build Status](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@every-env/compound-plugin)](https://www.npmjs.com/package/@every-env/compound-plugin)

让每个工程工作单元都比上一个更容易的 AI skills 和 agents。

## Philosophy（理念）

**每个工程工作单元都应该让后续工作更容易，而不是更难。**

传统开发会积累技术债。每个 feature 都会增加复杂度。每个 bug fix 都会留下更多本地知识，等着后来的人重新发现。Codebase 越来越大，context 越来越难 hold，下一次 change 也越来越慢。

Compound engineering 反过来做：80% 放在 planning 和 review，20% 放在 execution：

- 写代码前用 `/ce-brainstorm` 和 `/ce-plan` 充分规划
- 用 `/ce-code-review` 和 `/ce-doc-review` review，捕捉问题并校准判断
- 用 `/ce-compound` 把知识 codify 成可复用内容
- 保持质量，让未来 change 更容易

重点不是仪式感，而是杠杆。好的 brainstorm 会让 plan 更锐利。好的 plan 会让 execution 更小。好的 review 捕获的是 pattern，而不只是 bug。好的 compound note 意味着下一个 agent 不必从零学同一课。

**Learn more（了解更多）**

- [Full component reference](plugins/compound-engineering/README.md) - 所有 agents 和 skills
- [Compound engineering: how Every codes with agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)
- [The story behind compounding engineering](https://every.to/source-code/my-ai-had-already-fixed-the-code-before-i-saw-it)

## Workflow（工作流）

`/ce-strategy` 位于 loop 上游。它把产品的 target problem、approach、persona、metrics 和 tracks 捕获为 `STRATEGY.md` 中简短、durable 的 anchor。`ce-ideate`、`ce-brainstorm` 和 `ce-plan` 会在它存在时读取它作为 grounding，让 strategy choices 流入 feature conception、prioritization 和 spec。

核心 loop 是：brainstorm requirements，plan implementation，work through the plan，review result，compound learning，然后带着更好的 context 重复。

当你希望 agent 先生成并批判更大的 ideas，再选择一个进入 brainstorm 时，在 loop 之前使用 `/ce-ideate`。它产出 ranked ideation artifact，而不是 requirements、plans 或 code。

| Skill | Purpose（用途） |
|-------|---------|
| `/ce-strategy` | 创建或维护 `STRATEGY.md`，记录产品的 target problem、approach、persona、key metrics 和 tracks。`ce-ideate`、`ce-brainstorm`、`ce-plan` 会读取它作为 grounding |
| `/ce-ideate` | 可选的 big-picture ideation：生成并严格评估 grounded ideas，然后把最强的一个送入 brainstorming |
| `/ce-brainstorm` | 通过交互式 Q&A 思考 feature 或 problem，并在 planning 前写出尺寸合适的 requirements doc |
| `/ce-plan` | 把 feature ideas 转成详细 implementation plans |
| `/ce-work` | 用 worktrees 和 task tracking 执行 plans |
| `/ce-debug` | 系统复现 failures，追踪 root cause，并实现 fixes |
| `/ce-code-review` | Merge 前的 multi-agent code review |
| `/ce-compound` | 记录 learnings，让未来工作更容易 |
| `/ce-product-pulse` | 生成单页、time-windowed pulse report，覆盖 usage、performance、errors 和 followups。保存到 `docs/pulse-reports/` |

`/ce-product-pulse` 是 read-side companion：它针对给定时间窗口（24h、7d 等）报告用户实际经历了什么、产品表现如何，并保存到 `docs/pulse-reports/`，让过去的 pulses 形成可浏览的 user outcomes 时间线。下一次 strategy update 和下一次 brainstorm 会获得真实 signal 作为 anchor。

每个 cycle 都在 compound：brainstorms sharpen plans，plans inform future plans，reviews catch more issues，patterns get documented。

## Quick Example（快速示例）

一个典型 cycle 会先把粗略 idea 转成 requirements doc，再从该 doc 出发规划，最后把执行交给 `/ce-work`：

```text
/ce-brainstorm "make background job retries safer"
/ce-plan docs/brainstorms/background-job-retry-safety-requirements.md
/ce-work
/ce-code-review
/ce-compound
```

针对聚焦的 bug investigation：

```text
/ce-debug "the checkout webhook sometimes creates duplicate invoices"
/ce-code-review
/ce-compound
```

## Getting Started（开始使用）

安装后，在任意 project 中运行 `/ce-setup`。它会检查你的 environment、安装缺失工具，并 bootstrap project config。

`compound-engineering` plugin 当前包含 39 个 skills 和 43 个 agents。完整清单见 [full component reference](plugins/compound-engineering/README.md)。

---

## Install（安装）

### Claude Code

```text
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

### Cursor

在 Cursor Agent chat 中，从 plugin marketplace 安装：

```text
/add-plugin compound-engineering
```

也可以在 plugin marketplace 搜索 "compound engineering"。

### Codex

三步：注册 marketplace，安装 agent set，然后通过 Codex 的 TUI 安装 plugin。

1. **在 Codex 中注册 marketplace：**

   ```bash
   codex plugin marketplace add EveryInc/compound-engineering-plugin
   ```

2. **安装 Compound Engineering agents**（Codex 的 plugin spec 目前还不会注册 custom agents）：

   ```bash
   bunx @every-env/compound-plugin install compound-engineering --to codex
   ```

3. **通过 Codex 的 TUI 安装 plugin：** 启动 `codex`，运行 `/plugins`，找到 **Compound Engineering** marketplace，选择 **compound-engineering** plugin，然后选择 **Install**。安装完成后重启 Codex。Codex CLI 可以注册 marketplaces，但目前没有暴露用于从已添加 marketplace 安装 plugin 的 plugin-install subcommand，所以 CE skills 需要通过 `/plugins` TUI 安装。

这三步都需要。Marketplace registration 加 TUI install 会处理 skills；Bun 步骤会添加 review、research 和 workflow agents，让 `$ce-code-review`、`$ce-plan`、`$ce-work` 等 skills 能在 Codex 中 spawn 它们。缺少 agent 步骤时，delegating skills 会报告 agents missing。

如果使用非默认 Codex profile，请让每个 Codex 相关步骤使用同一个 `CODEX_HOME`。下面示例把 CE 安装到 `work` profile：

```bash
CODEX_HOME="$HOME/.codex/profiles/work" codex plugin marketplace add EveryInc/compound-engineering-plugin
CODEX_HOME="$HOME/.codex/profiles/work" bunx @every-env/compound-plugin install compound-engineering --to codex
CODEX_HOME="$HOME/.codex/profiles/work" codex
```

在 Codex 内运行 `/plugins`，选择 **Compound Engineering**，然后安装 **compound-engineering**。Marketplace 步骤只让 plugin 可用；TUI install 才会为该 profile 激活 native CE skills。

如果要从当前 checkout 做 local development，请注册当前 worktree 并使用 local CLI：

```bash
CODEX_HOME="$HOME/.codex/profiles/work" codex plugin marketplace add "$PWD"
CODEX_HOME="$HOME/.codex/profiles/work" bun run src/index.ts install ./plugins/compound-engineering --to codex
CODEX_HOME="$HOME/.codex/profiles/work" codex
```

> **Heads up:** 一旦 Codex 的 native plugin spec 支持 custom agents，Bun agent 步骤就会移除。届时只需要 TUI install。

如果你之前使用过 Bun-only Codex install，请在切换前备份 stale CE artifacts：

```bash
bunx @every-env/compound-plugin cleanup --target codex
```

### GitHub Copilot

对于 **VS Code Copilot Agent Plugins**：

1. 从 VS Code command palette 运行 `Chat: Install Plugin from Source`
2. Repo 填 `EveryInc/compound-engineering-plugin`
3. 当 VS Code 显示本仓库 plugins 时，选择 `compound-engineering`

对于 **Copilot CLI**，使用：

在 Copilot CLI 内：

```text
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering@compound-engineering-plugin
```

从带有 `copilot` binary 的 shell 中：

```bash
copilot plugin marketplace add EveryInc/compound-engineering-plugin
copilot plugin install compound-engineering@compound-engineering-plugin
```

Copilot CLI 会读取现有 Claude-compatible plugin manifests，因此不需要单独的 Bun install 步骤。

如果你之前使用过旧的 Bun Copilot install，请在切换到 native plugin 前备份 stale CE artifacts：

```bash
bunx @every-env/compound-plugin cleanup --target copilot
```

### Factory Droid

从带有 `droid` binary 的 shell 中：

```bash
droid plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin
droid plugin install compound-engineering@compound-engineering-plugin
```

Droid 使用 `plugin@marketplace` plugin IDs；这里 `compound-engineering` 是 plugin，`compound-engineering-plugin` 是 marketplace 名称。Droid 会安装现有 Claude Code-compatible plugin，并自动转换格式，因此不需要 Bun install 步骤。

如果你之前使用过旧的 Bun Droid install，请在切换到 native plugin 前备份 stale CE artifacts：

```bash
bunx @every-env/compound-plugin cleanup --target droid
```

### Qwen Code

```bash
qwen extensions install EveryInc/compound-engineering-plugin:compound-engineering
```

Qwen Code 会直接从 GitHub 安装 Claude Code-compatible plugins，并在安装期间转换 plugin format，因此不需要 Bun install 步骤。

如果你之前使用过旧的 Bun Qwen install，请在切换到 native extension 前备份 stale CE artifacts：

```bash
bunx @every-env/compound-plugin cleanup --target qwen
```

### OpenCode, Pi, Gemini, and Kiro

本仓库包含一个 Bun/TypeScript installer，可把 Compound Engineering plugin 转换到 OpenCode、Pi、Gemini CLI 和 Kiro CLI。

```bash
bunx @every-env/compound-plugin install compound-engineering --to opencode
bunx @every-env/compound-plugin install compound-engineering --to pi
bunx @every-env/compound-plugin install compound-engineering --to gemini
bunx @every-env/compound-plugin install compound-engineering --to kiro
```

**Pi prerequisites.** Pi 没有内置 native subagent primitive，所以 Pi install 依赖 [nicobailon/pi-subagents](https://github.com/nicobailon/pi-subagents)（必需），并推荐 [edlsh/pi-ask-user](https://github.com/edlsh/pi-ask-user)，用于更好的 blocking user questions：

```bash
pi install npm:pi-subagents    # required — provides the `subagent` tool used by skills that dispatch parallel agents
pi install npm:pi-ask-user     # recommended — provides the `ask_user` tool; skills fall back to numbered options in chat when it is missing
```

自动检测 custom-install targets 并全部安装：

```bash
bunx @every-env/compound-plugin install compound-engineering --to all
```

Custom install targets 会在安装期间运行 CE legacy cleanup。要手动为特定 target 运行 cleanup：

```bash
bunx @every-env/compound-plugin cleanup --target codex
bunx @every-env/compound-plugin cleanup --target opencode
bunx @every-env/compound-plugin cleanup --target pi
bunx @every-env/compound-plugin cleanup --target gemini
bunx @every-env/compound-plugin cleanup --target kiro
bunx @every-env/compound-plugin cleanup --target copilot   # old Bun installs only
bunx @every-env/compound-plugin cleanup --target droid     # old Bun installs only
bunx @every-env/compound-plugin cleanup --target qwen      # old Bun installs only
bunx @every-env/compound-plugin cleanup --target windsurf  # deprecated legacy installs only
```

Cleanup 会把已知 CE artifacts 移动到 target root 下的 `compound-engineering/legacy-backup/` 目录。

---

## Local Development（本地开发）

```bash
bun install
bun test
bun run release:validate
```

### From your local checkout（从本地 checkout）

用于 active development；对 plugin source 的 edits 会立即反映出来。

**Claude Code** -- 添加一个 shell alias，让本地副本和常规 plugins 一起加载：

```bash
alias cce='claude --plugin-dir ~/Code/compound-engineering-plugin/plugins/compound-engineering'
```

运行 `cce` 而不是 `claude` 来测试 changes。你的 production install 不会被触碰。

**Codex and other targets** -- 针对当前 checkout 运行 local CLI：

```bash
# from the repo root
bun run src/index.ts install ./plugins/compound-engineering --to codex

# same pattern for other targets
bun run src/index.ts install ./plugins/compound-engineering --to opencode
```

### From a pushed branch（从已 push 的 branch）

用于测试别人的 branch，或从 worktree 测试自己的 branch，而不切换 checkout。它使用 `--branch` 把 branch clone 到 deterministic cache directory。

> **Unpushed local branches**: 如果 branch 只存在于本地 worktree、尚未 push，请直接把 `--plugin-dir` 指向该 worktree path（例如 `claude --plugin-dir /path/to/worktree/plugins/compound-engineering`）。

**Claude Code** -- 用 `plugin-path` 获取 cached clone path：

```bash
# from the repo root
bun run src/index.ts plugin-path compound-engineering --branch feat/new-agents
# Output:
#   claude --plugin-dir ~/.cache/compound-engineering/branches/compound-engineering-feat~new-agents/plugins/compound-engineering
```

Cache path 是 deterministic 的。重新运行会把 checkout 更新到该 branch 的最新 commit。

**Codex, OpenCode, and other targets** -- 给 `install` 传 `--branch`：

```bash
# from the repo root
bun run src/index.ts install compound-engineering --to codex --branch feat/new-agents

# works with any target
bun run src/index.ts install compound-engineering --to opencode --branch feat/new-agents

# combine with --also for multiple targets
bun run src/index.ts install compound-engineering --to codex --also opencode --branch feat/new-agents
```

两个功能都使用 `COMPOUND_PLUGIN_GITHUB_SOURCE` env var 解析 repository，默认是 `https://github.com/EveryInc/compound-engineering-plugin`。

### Shell aliases（Shell aliases，shell 别名）

添加到 `~/.zshrc` 或 `~/.bashrc`。所有 aliases 都使用 local CLI，因此不依赖 npm publish。`plugin-path` 只向 stdout 打印路径，所以可以与 `$()` 组合。

```bash
CE_REPO=~/Code/compound-engineering-plugin

ce-cli() { bun run "$CE_REPO/src/index.ts" "$@"; }

# --- Local checkout (active development) ---
alias cce='claude --plugin-dir $CE_REPO/plugins/compound-engineering'

codex-ce() {
  ce-cli install "$CE_REPO/plugins/compound-engineering" --to codex "$@"
}

# --- Pushed branch (testing PRs, worktree workflows) ---
ccb() {
  claude --plugin-dir "$(ce-cli plugin-path compound-engineering --branch "$1")" "${@:2}"
}

codex-ceb() {
  ce-cli install compound-engineering --to codex --branch "$1" "${@:2}"
}
```

Usage：

```bash
cce                              # local checkout with Claude Code
codex-ce                         # install local checkout to Codex
ccb feat/new-agents              # test a pushed branch with Claude Code
ccb feat/new-agents --verbose    # extra flags forwarded to claude
codex-ceb feat/new-agents        # install a pushed branch to Codex
```

Codex installs 会把 generated plugin skills 隔离在 `~/.codex/skills/compound-engineering/` 下，并且不会向 `~/.agents` 写入新文件。当 installer 能证明旧的 CE-managed `.agents/skills` symlinks 指回 CE 的 Codex-managed store 时，会移除它们，以防 stale Codex installs shadow Copilot 的 native plugin install。

## Troubleshooting（故障排查）

### Codex skills work but review or research delegation fails（Codex skills 可用但 review/research delegation 失败）

运行 agent install 步骤：

```bash
bunx @every-env/compound-plugin install compound-engineering --to codex
```

Native Codex plugin install 会处理 skills。Bun 步骤会安装这些 skills delegate 到的 custom agents。

### Codex shows stale or duplicate CE skills（Codex 显示 stale 或重复的 CE skills）

切换到 native Codex plugin flow 前，备份旧 Bun-installed artifacts：

```bash
bunx @every-env/compound-plugin cleanup --target codex
```

### Copilot, Droid, or Qwen loads stale CE skills（Copilot、Droid 或 Qwen 加载 stale CE skills）

使用 native plugin path 前，备份旧 Bun-installed artifacts：

```bash
bunx @every-env/compound-plugin cleanup --target copilot
bunx @every-env/compound-plugin cleanup --target droid
bunx @every-env/compound-plugin cleanup --target qwen
```

## Limitations（限制）

Codex native plugin install 目前处理 skills，不处理 custom agents。在 Codex native plugin spec 支持 agents 前，仍需要文档中的 Bun followup。

OpenCode、Pi、Gemini 和 Kiro installs 由 converter 支撑，并可能随着这些 target formats 演进而变化。

Release versions 由 release automation 管理。常规 feature PR 不应手工 bump plugin 或 marketplace manifest versions。

## FAQ（常见问题）

### Do I need Bun for Claude Code?（Claude Code 需要 Bun 吗？）

不需要。Claude Code 直接从 plugin marketplace 安装。只有 converter-backed targets、Codex 当前的 agent followup、local development，以及清理旧 converted installs 时才需要 Bun。

### Why does Codex need a separate Bun step?（为什么 Codex 需要单独的 Bun 步骤？）

Codex native plugin flow 会从 Codex plugin manifest 安装 skills。它目前不会安装 Compound Engineering skills delegate 到的 custom reviewer、researcher 和 workflow agents。Bun 步骤填补这个缺口。

### Where do I see all available skills and agents?（在哪里查看所有可用 skills 和 agents？）

阅读 [Compound Engineering plugin README](plugins/compound-engineering/README.md)。它列出了当前 skill 和 agent inventory。

### Where is release history?（release history 在哪里？）

GitHub Releases 是 canonical release-notes surface。根目录 [`CHANGELOG.md`](CHANGELOG.md) 指向该历史。

## About Contributions（关于贡献）

*About Contributions:* 请不要误会，但我不接受任何项目的外部 contributions。我确实没有足够心力 review 所有内容，而且这些东西挂着我的名字，所以它造成的任何问题都由我负责；从我的视角看，risk-reward 极不对称。我也必须考虑其他 "stakeholders"，而对这些主要为自己免费制作的工具来说，这似乎并不明智。欢迎提交 issues；如果你想说明 proposed fix，也可以提交 PR，但请知道我不会直接 merge。相反，我会让 Claude 或 Codex 通过 `gh` review submissions，并独立决定是否以及如何处理。Bug reports 尤其欢迎。如果这冒犯到你，我很抱歉，但我想避免浪费时间和伤害感情。我理解这与追求社区贡献的主流 open-source ethos 不一致，但这是我保持这种速度并维持清醒的唯一方式。

## License（许可证）

[MIT](LICENSE)
