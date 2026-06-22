# Compound Engineering

[![Build Status](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml)

让每个工程工作单元都比上一个更容易的 AI skills。

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

安装后，在任意 project 中运行 `/ce-setup`。它会检查 repo-local config，报告 optional tool capabilities，并帮助把 machine-local CE settings 安全地加入 gitignore。

`compound-engineering` plugin 当前发布 27 个 skills 和 0 个 standalone agents。Specialist review、research 和 workflow behavior 位于 owning skills 内的 skill-local prompt assets。

### Full Skill Inventory（完整 Skill 清单）

| Skill | Purpose（用途） |
|-------|---------|
| `/ce-strategy` | 创建或维护 `STRATEGY.md` |
| `/ce-ideate` | 生成并严格评估 grounded ideas |
| `/ce-brainstorm` | 探索 requirements，并写出尺寸合适的 requirements doc |
| `/ce-plan` | 创建 structured implementation plans |
| `/ce-work` | 系统执行 implementation plans |
| `/ce-code-review` | 使用 skill-local reviewer personas review code |
| `/ce-doc-review` | Review requirements 和 plan documents |
| `/ce-debug` | 复现 failures、追踪 root cause，并修复 bugs |
| `/ce-compound` | 记录已解决问题，让 team knowledge compound |
| `/ce-compound-refresh` | 刷新 stale 或 drifting learnings |
| `/ce-optimize` | 运行 iterative optimization loops |
| `/ce-product-pulse` | 生成 time-windowed product pulse reports |
| `/ce-riffrec-feedback-analysis` | 将 Riffrec recordings 或 notes 转成 structured feedback |
| `/ce-resolve-pr-feedback` | 解决 PR review feedback |
| `/ce-commit` | 创建 message 清晰的 git commit |
| `/ce-commit-push-pr` | Commit、push 并打开 PR |
| `/ce-worktree` | 确保 work 发生在 isolated git worktree 中 |
| `/ce-promote` | 起草 user-facing announcement copy |
| `/ce-test-browser` | 在 PR 影响的 pages 上运行 browser tests |
| `/ce-test-xcode` | 在 simulator 上 build 和 test iOS apps |
| `/ce-setup` | 诊断 optional tool capabilities 和 project config |
| `/ce-simplify-code` | 简化 recent code changes |
| `/ce-polish` | 启动 dev server 并迭代 UX polish |
| `/ce-proof` | 创建、编辑并分享 Proof documents |
| `/ce-dogfood-beta` | 对 active branch 做 diff-scoped browser QA |
| `/ce-work-beta` | 带 Codex delegation mode 的 experimental execution workflow |
| `/lfg` | 完整 autonomous engineering workflow |

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

### Codex App

Compound Engineering 还没有列在 Codex 内置 plugin marketplace 中。请把它作为 custom marketplace 添加：

1. 在 Codex app 中，从 sidebar 打开 **Plugins**。
2. 点击 **Add** / **Add plugin marketplace**。
3. 输入：

   | Field | Value |
   | --- | --- |
   | Source | `EveryInc/compound-engineering-plugin` |
   | Git ref | `main` |
   | Sparse paths | 留空 |

4. 点击 **Add marketplace**。
5. 选择 **Compound Engineering**，安装 **compound-engineering**，然后重启 Codex。

Codex app install 对 Compound Engineering 来说是自包含的。Specialist reviewer 和 research behavior 位于 skills 内的 local prompt assets；不需要单独的 custom-agent install 步骤。

### Codex CLI

注册 marketplace，然后通过 Codex 的 TUI 安装 plugin。

1. **在 Codex 中注册 marketplace：**

   ```bash
   codex plugin marketplace add EveryInc/compound-engineering-plugin
   ```

2. **通过 Codex 的 TUI 安装 plugin：** 启动 `codex`，运行 `/plugins`，找到 **Compound Engineering** marketplace，选择 **compound-engineering** plugin，然后选择 **Install**。安装完成后重启 Codex。Codex CLI 可以注册 marketplaces，但目前没有暴露用于从已添加 marketplace 安装 plugin 的 plugin-install subcommand；因此需要 `/plugins` TUI install。

Native Codex plugin install 对 Compound Engineering 来说是自包含的。Specialist reviewer 和 research behavior 位于 skills 内的 local prompt assets；不需要单独的 custom-agent install 步骤。

如果使用非默认 Codex profile，请让每个 Codex 相关步骤使用同一个 `CODEX_HOME`。下面示例把 CE 安装到 `work` profile：

```bash
CODEX_HOME="$HOME/.codex/profiles/work" codex plugin marketplace add EveryInc/compound-engineering-plugin
CODEX_HOME="$HOME/.codex/profiles/work" codex
```

在 Codex 内运行 `/plugins`，选择 **Compound Engineering**，然后安装 **compound-engineering**。Marketplace 步骤只让 plugin 可用；TUI install 才会为该 profile 激活 native CE skills。

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

### Factory Droid

从带有 `droid` binary 的 shell 中：

```bash
droid plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin
droid plugin install compound-engineering@compound-engineering-plugin
```

Droid 使用 `plugin@marketplace` plugin IDs；这里 `compound-engineering` 是 plugin，`compound-engineering-plugin` 是 marketplace 名称。Droid 会安装现有 Claude Code-compatible plugin，并自动转换格式，因此不需要 Bun install 步骤。

### Qwen Code

```bash
qwen extensions install EveryInc/compound-engineering-plugin:compound-engineering
```

Qwen Code 会直接从 GitHub 安装 Claude Code-compatible plugins，并在安装期间转换 plugin format，因此不需要 Bun install 步骤。

### OpenCode

Add Compound Engineering to the `plugin` array in your global or project `opencode.json`:

```json
{
  "plugin": ["compound-engineering@git+https://github.com/EveryInc/compound-engineering-plugin.git"]
}
```

Restart OpenCode after changing the config. The OpenCode plugin registers the Compound Engineering skills directory directly; no Bun installer or generated skill copy is required. See [`.opencode/INSTALL.md`](.opencode/INSTALL.md) for pinning examples.

### Pi

从本仓库安装 Compound Engineering 作为 Pi package：

```bash
pi install git:github.com/EveryInc/compound-engineering-plugin
```

CE workflows 需要 dispatch reviewer、research 或 implementation subagents 时，必需 companion：

```bash
pi install npm:pi-subagents
```

更好的 blocking questions 推荐 companion：

```bash
pi install npm:pi-ask-user
```

### Gemini CLI

从本仓库安装 native Gemini extension：

```bash
gemini extensions install https://github.com/EveryInc/compound-engineering-plugin
```

之后用这个命令更新：

```bash
gemini extensions update compound-engineering
```

### Existing Installs（现有安装）

Marketplace-managed installs 会在 marketplace/plugin version 更新时迁移到 root plugin layout。在 Claude Code 上，更新 plugin 前先 refresh cached marketplace definition：

```text
/plugin marketplace update compound-engineering-plugin
/plugin update compound-engineering
```

只更新 plugin 本身仍可能读取指向旧 `plugins/compound-engineering` path 的 stale cached marketplace entry。如果你为某个 host 配置了 `plugins/compound-engineering` 下的 direct path 或 sparse path，请编辑或重装该 source，让它指向 repository root，且不带 sparse path。

如果之前 Bun-installed copy 仍在 shadow native plugin skills，请从本仓库 checkout 运行当前 cleanup command：

```bash
git clone https://github.com/EveryInc/compound-engineering-plugin.git /tmp/compound-engineering-plugin-cleanup
cd /tmp/compound-engineering-plugin-cleanup
bun install
bun run cleanup --target all
```

---

## Local Development（本地开发）

```bash
bun install
bun test
bun run release:validate
```

### From your local checkout（从本地 checkout）

用于 active development；对 plugin source 的 edits 会立即反映出来。

用于 active development；直接在目标 harness 中加载当前 checkout。

**Claude Code**

```bash
claude --plugin-dir "$PWD"
```

**Codex App**

在 app 的 **Add plugin marketplace** 表单中，把当前 checkout 作为 source：

| Field | Value |
| --- | --- |
| Source | `/path/to/compound-engineering-plugin` |
| Git ref | 当前 branch，或作为 local folder 留空 |
| Sparse paths | 留空 |

**Codex CLI**

```bash
codex plugin marketplace add "$PWD"
codex
```

然后运行 `/plugins`，选择 **Compound Engineering**，安装 **compound-engineering**。如果要把 local testing 与常规 Codex profile 隔离，请使用单独的 `CODEX_HOME`。

**OpenCode**

```json
{
  "plugin": ["/path/to/compound-engineering-plugin"]
}
```

修改 `opencode.json` 后重启 OpenCode。

**Pi**

```bash
pi -e "$PWD"
```

**Gemini CLI**

```bash
gemini extensions install "$PWD"
```

## Limitations（限制）

OpenCode、Pi 和 Gemini 使用本仓库的 native package/plugin loading。Bun CLI 仍用于 repository development 和 converter maintenance，不用于常规安装。

Release versions 由 release automation 管理。常规 feature PR 不应手工 bump plugin 或 marketplace manifest versions。

## FAQ（常见问题）

### Do I need Bun to install Compound Engineering?（安装 Compound Engineering 需要 Bun 吗？）

不需要。Bun 只用于 repo development tasks 和 converter maintenance。

### Where do I see all available skills?（在哪里查看所有可用 skills？）

Skill inventory 在本 README 中。每个 skill 的权威 runtime spec 位于 `skills/<skill>/SKILL.md`。

### Where is release history?（release history 在哪里？）

GitHub Releases 是 canonical release-notes surface。根目录 [`CHANGELOG.md`](CHANGELOG.md) 指向该历史。

## Contributing（贡献）

欢迎 contributions。Issues、bug reports 和 pull requests 都能帮助这个项目变得更好，我们也真心感谢这些反馈，尤其是 bug reports。

也先说明预期：Compound Engineering 从设计上就是 opinionated 的。它由 [@kieranklaassen](https://github.com/kieranklaassen) 和 [@tmchow](https://github.com/tmchow) 维护，方向反映了关于 AI-assisted engineering 应该如何工作的特定观点。所以我们欢迎帮助，但不能保证接受每一个 change。有些 proposals 即使本身是好点子，也可能不适合这个 vision。

你可以开 issue 或提交 PR。只要能推动 plugin 朝正确方向前进，我们就会吸收进去。我们只是想提前说明，并不是所有内容都会落地。

## License（许可证）

[MIT](LICENSE)
