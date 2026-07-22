# Compound Engineering

[![Build Status](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml)

让每一个工程工作单元都比上一个更容易的 AI skills。

## 安装中文版

> 这是由社区维护的中文 fork，不是上游 EveryInc 的官方发行版。当前已同步至上游 commit `5c7cb347`。

在 Claude Code 中安装这个中文 fork：

```text
/plugin marketplace add oldwinter/compound-engineering-plugin
/plugin install compound-engineering
```

安装后，runtime 会加载这个 fork 中的 `skills/*/SKILL.md` 及各 skill 自带的 `references/`；这些是中文本地化的实际执行入口。下方保留的 `EveryInc/compound-engineering-plugin` 命令指向上游英文版，不应当作中文版安装命令。

**使用其他编辑器或 CLI？** Claude Code、Cursor、Codex、Kimi Code CLI、Cline、Grok Build CLI、Devin CLI、GitHub Copilot、Factory Droid、Qwen Code、OpenCode、Pi 和 Antigravity CLI 均受支持，详见[更多安装方式](#更多安装方式)。

## Philosophy（理念）

**每一个工程工作单元都应该让后续工作更容易，而不是更困难。**

调用语法：本 README uses `/skill-name` examples for slash-skill hosts。在 Codex 中，invoke installed skills with `$skill-name`（for example, `$ce-plan` and `$lfg`）；`/goal` remains a Codex built-in command。

传统开发会积累技术债。每个 feature 都增加 complexity。每个 bug fix 都留下一点 local knowledge，后来的人还得重新发现。Codebase 越来越大，context 越来越难 hold，下一次 change 也越来越慢。

Compound engineering 反过来做：80% 在 planning 和 review，20% 在 execution：

- 写 code 前用 `/ce-brainstorm` 和 `/ce-plan` 基于 readiness 的统一 plan artifact 充分 plan
- 用 `/ce-code-review` 和 `/ce-doc-review` review，捕获问题并校准判断
- 用 `/ce-compound` 把 knowledge codify 成可复用资产
- 保持质量，让未来 changes 更容易

重点不是 ceremony，而是 leverage。好的 brainstorm 让 plan 更锋利。好的 plan 让 execution 更小。好的 review 捕获 pattern，而不只是 bug。好的 compound note 让下一个 agent 不必从零学同一课。

**了解更多**

- [Skill documentation catalog](docs/skills/README.md)
- [Compound engineering: how Every codes with agents](https://every.to/chain-of-thought/compound-engineering-how-every-codes-with-agents)
- [The story behind compounding engineering](https://every.to/source-code/my-ai-had-already-fixed-the-code-before-i-saw-it)

## Workflow（工作流）

核心 loop 有六步：**brainstorm** requirements，**plan** implementation，按 plan **work**，**simplify** 刚写的 code，**review** 结果，然后 **compound** learning，并带着更好的 context 重复。

| Skill | Purpose（用途） |
|-------|---------|
| [`/ce-brainstorm`](docs/skills/ce-brainstorm.md) | 通过 interactive Q&A 思考 feature 或 problem，并在 planning 前写出 requirements-only unified plan |
| [`/ce-plan`](docs/skills/ce-plan.md) | 将 feature ideas 或 requirements-only plans enrich 为 implementation-ready plans |
| [`/ce-work`](docs/skills/ce-work.md) | 原生执行 implementation-ready plans，或通过合格的跨模型 author（qualified cross-model author）实施，同时由 host 保留 verification、commits 和 shipping |
| [`/ce-simplify-code`](docs/skills/ce-simplify-code.md) | 在 review 前 refinement 新写的 code，提升 clarity 和 reuse |
| [`/ce-code-review`](docs/skills/ce-code-review.md) | 合并前按 plan 进行 report-only multi-agent review；本地应用修复必须显式授权 |
| [`/ce-compound`](docs/skills/ce-compound.md) | 把 learning 捕获到 `docs/solutions/`，让下一轮 loop 更聪明 |

每个 cycle 都会 compound：`/ce-compound` 写下 learnings，下一次 `/ce-brainstorm` 和 `/ce-plan` 会读取它们作为 grounding。Brainstorms sharpen plans，plans inform future plans，reviews catch more issues，patterns get documented。这个 return arrow 就是重点。

### Additional skills（额外 skills）

这些 skills 位于 loop 周边，或按需使用；并不是每个 cycle 都需要它们。

| Skill | 何时使用 |
|-------|---------|
| [`/ce-ideate`](docs/skills/ce-ideate.md) | *Loop 之前*，当你还不知道要 build 什么时使用：生成并严格排序 grounded ideas，然后把最强的一个送入 `/ce-brainstorm` |
| [`/ce-strategy`](docs/skills/ce-strategy.md) | *Upstream anchor*：创建并维护 `STRATEGY.md`，由 ideate、brainstorm 和 plan 读取作为 grounding，让 strategy choices 流入每个 feature |
| [`/ce-product-pulse`](docs/skills/ce-product-pulse.md) | *Outer loop*：给定时间窗口内用户实际经历了什么（usage、performance、errors）的 report，保存到 `docs/pulse-reports/`；follow-ups 反馈到 ideation 和 brainstorming |
| [`/ce-debug`](docs/skills/ce-debug.md) | 当输入是 bug 而不是 feature 时，替代 brainstorm -> plan -> work：reproduce，trace root cause，fix，然后在必要时 polish/review 并 handoff 给 PR |
| [`/ce-pov`](docs/skills/ce-pov.md) | *On demand, before you commit*：给出 decisive、project-grounded adoption verdict、holistic document take 或针对既有 approaches 的立场；可由 named peers 或 `oracle` 通过 blind initial round 和 bounded reconciliation 做 cross-check |
| [`/ce-explain`](docs/skills/ce-explain.md) | *On demand, to keep learning*：把 concept、diff、idea 或 “what did I do this week?” 变成写给你个人的 dense visual explainer，可选 check-in（diff 的 predict-then-reveal、corrected exercises）让内容留下来 |

完整 catalog 和 skill chaining 见 [docs/skills](docs/skills/README.md)。完整 inventory 见[下方](#full-skill-inventory)。

## Quick Example（快速示例）

**寻找方向**：当你还没有具体 idea 时，先 ideate，再把最强 survivor 带入 loop：

```text
/ce-ideate new drawing tools
/ce-ideate surprise me
/ce-ideate open issues     # ground ideas in your tracker's open issues (GitHub, Linear, Jira)
```

`/ce-ideate` 会先做 homework（codebase、past learnings、web 上的 prior art，以及可选的 issue tracker），然后给出一组 ranked grounded candidates，供你带入 `/ce-brainstorm`。

**标准 feature loop**：把 rough idea 变成 shipped、reviewed code：

```text
/ce-brainstorm make background job retries safer
/ce-plan
/ce-work
/ce-simplify-code
/ce-code-review
/ce-compound
```

**Simplifying code**：在 fresh implementation work 后使用，或指向持续拖慢 changes 的 code：

```text
/ce-simplify-code
/ce-simplify-code simplify the code in my most-churned file
```

第一种用法会在 review 前收紧 recent branch changes。Targeted pass 适用于某个 file 持续吸收 unrelated fixes、follow-ups 或 merge conflicts 的情况。

**Debugging a bug**：当你从 broken behavior 而不是 feature 开始：

```text
/ce-debug the checkout webhook sometimes creates duplicate invoices
/ce-code-review
/ce-compound
```

**Autonomous**：交出一个 feature，让 agent 跑完整 pipeline：

```text
/ce-brainstorm describe the feature
/lfg
```

`/lfg` 会 hands-off 跑完整 loop：plan，按 plan work，simplify，运行 code review 并应用 fixes，运行 browser tests，commit，push，open PR，然后 watch CI 并修复 failures 直到 green。建议在 `/ce-brainstorm` 之后启动，让它基于真实 requirements plan，而不是基于一行 prompt。它是 standard loop 的 autopilot 版本，适合你想离开一会儿、回来看到一个打开且 green 的 PR。当 eligible multi-area plan 仍有 unplanned work 时，`lfg` 还会推荐并说明 next separately planned area；只有你接受后，才会为 fresh session 和 separate plan 创建 `/ce-handoff`。

## Getting Started（开始使用）

安装后，在任意 project 中运行 `/ce-setup`。它会检查 repo-local config、报告 optional tool capabilities，并帮助把 machine-local CE settings 安全地放进 gitignore。

`compound-engineering` plugin 当前包含 31 个 skills 和 0 个 standalone agents。Specialist review、research 和 workflow behavior 位于所属 skill 内，作为 skill-local prompt assets。

### Full Skill Inventory（完整 Skill 清单）

| Skill | Purpose（用途） |
|-------|---------|
| [`/ce-strategy`](docs/skills/ce-strategy.md) | 创建或维护 `STRATEGY.md` |
| [`/ce-ideate`](docs/skills/ce-ideate.md) | 生成并严格评估 grounded ideas |
| [`/ce-pov`](docs/skills/ce-pov.md) | 对 adoption、document 或 approach set 形成 decisive、project-grounded POV |
| [`/ce-explain`](docs/skills/ce-explain.md) | 将 concept、diff、idea 或你自己的一段 work 解释成个人学习 artifact |
| [`/ce-brainstorm`](docs/skills/ce-brainstorm.md) | 探索 requirements 并写出尺寸合适的 requirements doc |
| [`/ce-plan`](docs/skills/ce-plan.md) | 创建 structured implementation plans |
| [`/ce-work`](docs/skills/ce-work.md) | 以 native 或 cross-model implementation 执行 plans，并保持 durable progress 与 transactional host-owned integration |
| [`/ce-code-review`](docs/skills/ce-code-review.md) | 使用 skill-local reviewer personas review code |
| [`/ce-doc-review`](docs/skills/ce-doc-review.md) | Review requirements 和 plan documents |
| [`/ce-debug`](docs/skills/ce-debug.md) | Reproduce failures，trace root cause，fix bugs，并为 non-trivial fixes 准备 PR |
| [`/ce-compound`](docs/skills/ce-compound.md) | 记录已解决问题，compound team knowledge |
| [`/ce-compound-refresh`](docs/skills/ce-compound-refresh.md) | Refresh stale 或 drifting learnings |
| [`/ce-optimize`](docs/skills/ce-optimize.md) | 运行 iterative optimization loops |
| [`/ce-product-pulse`](docs/skills/ce-product-pulse.md) | 生成 time-windowed product pulse reports |
| [`/ce-riffrec-feedback-analysis`](docs/skills/ce-riffrec-feedback-analysis.md) | 把 Riffrec recordings 或 notes 转成 structured feedback |
| [`/ce-sweep`](docs/skills/ce-sweep.md) | Sweep feedback sources，track item lifecycles，并产出 `/lfg`-ready plan |
| [`/ce-resolve-pr-feedback`](docs/skills/ce-resolve-pr-feedback.md) | Resolve PR review feedback |
| [`/ce-commit`](docs/skills/ce-commit.md) | 创建带清晰 message 的 git commit |
| [`/ce-commit-push-pr`](docs/skills/ce-commit-push-pr.md) | Commit、push 并 open PR，同时讲解本次 change 新引入的任何 concept |
| [`/ce-babysit-pr`](docs/skills/ce-babysit-pr.md) | 持续 watch open PR，根据新到达的 review comments 和 CI 状态推动它走向 merge-ready |
| [`/ce-worktree`](docs/skills/ce-worktree.md) | 确保 work 在 isolated git worktree 中进行 |
| [`/ce-promote`](docs/skills/ce-promote.md) | Draft user-facing announcement copy |
| [`/ce-test-browser`](docs/skills/ce-test-browser.md) | 对 PR-affected pages 运行 browser tests |
| [`/ce-test-xcode`](docs/skills/ce-test-xcode.md) | 在 simulator 上 build 和 test iOS apps |
| [`/ce-setup`](docs/skills/ce-setup.md) | Diagnose optional tool capabilities 和 project config |
| [`/ce-handoff`](docs/skills/ce-handoff.md) | 在默认临时存储或指定位置创建 session handoff，并从选定来源恢复上下文 |
| [`/ce-simplify-code`](docs/skills/ce-simplify-code.md) | Simplify recent code changes |
| [`/ce-polish`](docs/skills/ce-polish.md) | 启动 dev server 并迭代 UX polish |
| [`/ce-proof`](docs/skills/ce-proof.md) | 创建、编辑和分享 Proof documents |
| [`/ce-dogfood`](docs/skills/ce-dogfood.md) | 对 active branch 做 hands-off diff-scoped browser QA，并可自主修复小 breakages |
| [`/lfg`](docs/skills/lfg.md) | 完整 autonomous engineering workflow |

---

## 更多安装方式

中文 fork 的 Claude Code 安装方式位于[文档顶部](#安装中文版)。以下命令均指向上游英文版，上游对这些平台提供同等支持。

### Claude Code

```text
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

> **Already have Compound Engineering installed?** Compound Engineering moved to a root-native layout. You must refresh the marketplace *before* updating — see [Existing Installs](#existing-installs). Running `/plugin update` alone keeps you on the old version.

### Cursor

In Cursor Agent chat, install from the plugin marketplace:

```text
/add-plugin compound-engineering
```

Or search for "compound engineering" in the plugin marketplace.

### Codex App

Compound Engineering is not listed in Codex's built-in plugin marketplace yet. Add it as a custom marketplace:

1. In the Codex app, open **Plugins** from the sidebar.
2. Click **Add** / **Add plugin marketplace**.
3. Enter:

   | Field | Value |
   | --- | --- |
   | Source | `EveryInc/compound-engineering-plugin` |
   | Git ref | `main` |
   | Sparse paths | leave blank |

4. Click **Add marketplace**.
5. Select **Compound Engineering**, install **compound-engineering**, then restart Codex.

The Codex app install is self-contained for Compound Engineering. Specialist reviewer and research behavior lives inside the skills as local prompt assets; no separate custom-agent install step is required.

### Codex CLI

Register the marketplace, then install the plugin.

1. **Register the marketplace with Codex:**

   ```bash
   codex plugin marketplace add EveryInc/compound-engineering-plugin
   ```

2. **Install the plugin:**

   ```bash
   codex plugin add compound-engineering@compound-engineering-plugin
   ```

   You can also launch `codex`, run `/plugins`, find the **Compound Engineering** marketplace, select the **compound-engineering** plugin, and choose **Install**. Restart Codex after install completes.

The native Codex plugin install is self-contained for Compound Engineering. Specialist reviewer and research behavior lives inside the skills as local prompt assets; no separate custom-agent install step is required.

For a non-default Codex profile, run every Codex-related step against the same `CODEX_HOME`. This example installs CE into a `work` profile:

```bash
CODEX_HOME="$HOME/.codex/profiles/work" codex plugin marketplace add EveryInc/compound-engineering-plugin
CODEX_HOME="$HOME/.codex/profiles/work" codex plugin add compound-engineering@compound-engineering-plugin
```

The marketplace step only makes the plugin available; the plugin install is what activates the native CE skills for that profile.

#### 移除旧版 Codex tool map（native plugin 推出前的安装）

如果你曾在 native Codex plugin 支持推出前，通过 Bun `convert` / `install --to codex` CLI 安装 Compound Engineering，该路径可能在你的**全局** Codex instructions file 中插入过一个 managed block：

`<!-- BEGIN COMPOUND CODEX TOOL MAP -->` … `<!-- END COMPOUND CODEX TOOL MAP -->`

它位于 `$CODEX_HOME/AGENTS.md`（默认 `~/.codex/AGENTS.md`）。这个 Claude-compat tool map 已经过时，因为 CE skills 会直接在内部指明 Codex tools；其中一行还错误地要求 Codex 把 subagent dispatch 收缩到 main thread。Native plugin 安装**不会**添加该 block。

把以下 prompt 粘贴给 Codex（或任何可访问 home directory 的 agent）即可移除：

```text
从我的 Codex home AGENTS.md 中移除过时的 Compound Engineering Codex tool-map block。

1. 如果设置了 CODEX_HOME，检查 `$CODEX_HOME/AGENTS.md`；否则检查 `~/.codex/AGENTS.md`。如果我使用 Codex profiles，还要检查 `~/.codex/profiles/*/AGENTS.md`。
2. 查找精确 sentinels：`<!-- BEGIN COMPOUND CODEX TOOL MAP -->` 和 `<!-- END COMPOUND CODEX TOOL MAP -->`。
3. 如果两者都存在，只删除从 BEGIN 行到 END 行（含首尾两行）的内容，其他 user content 保持不变。除非 project/repo AGENTS.md 中也出现了这两个精确 sentinels，否则不要编辑它。
4. 如果移除后文件为空，则删除该文件。
5. 简短展示修改前后的摘要；如果 block 原本就不存在，也请说明。不要添加 replacement tool map。
```

重新运行面向 Codex 的 Bun convert/install CLI，也会移除仍然存在的 block；新版 CLI 不再插入它。

**使用其他 editor 或 CLI？** Kimi Code CLI、Cline、Grok Build CLI、Devin CLI、GitHub Copilot、Factory Droid、Qwen Code、OpenCode、Pi 和 Antigravity CLI 均受支持，参见[更多安装方式](#more-install-options)。

---

### 其他 editor 和 CLI

[Claude Code、Cursor 和 Codex](#claude-code) 的说明在上方；这里列出的平台同样受到支持。

### Kimi Code CLI

Kimi Code CLI can install Compound Engineering directly from this repository because the repo ships a native `.kimi-plugin/plugin.json` manifest:

```text
/plugins install https://github.com/EveryInc/compound-engineering-plugin
```

You can also browse it through Kimi's custom marketplace flow:

```text
/plugins marketplace https://raw.githubusercontent.com/EveryInc/compound-engineering-plugin/main/.kimi-plugin/marketplace.json
```

After installing or updating, run `/reload` or start a new Kimi session so the plugin skills are loaded.

### Cline

Cline 从包含 `SKILL.md` 的目录中按需加载 CE skills。先在 Cline 扩展中启用 **Settings -> Features -> Enable Skills**，再将本中文 fork 的 skills link 到全局或单个 project：

```bash
git clone https://github.com/oldwinter/compound-engineering-plugin
./compound-engineering-plugin/.cline/scripts/install-skills.sh --global
```

从 checkout 安装到单个 project：

```bash
./compound-engineering-plugin/.cline/scripts/install-skills.sh --project
```

安装或更新 skills 后，请启动新的 Cline task。固定版本、本地开发和卸载步骤见 [`.cline/INSTALL.md`](.cline/INSTALL.md)。

### Grok Build CLI (`grok`)

xAI 的 [Grok Build CLI](https://x.ai/cli)（`grok`）可以直接从本 repository 安装 Compound Engineering。Repo root 本身就是有效的 Grok plugin：`grok` 会读取现有的 Claude-compatible manifests，而且 repo 也提供 native `.grok-plugin/plugin.json`：

```bash
grok plugin install EveryInc/compound-engineering-plugin
```

这种安装会跟踪 repository；运行 `grok plugin update` 即可拉取最新版。如果想将其作为 marketplace source 浏览，repo 也提供 native `.grok-plugin/marketplace.json`：

```bash
grok plugin marketplace add EveryInc/compound-engineering-plugin
grok plugin install compound-engineering
```

两种 path 都会直接跟踪 repository（没有 commit pin），因此不需要 Bun install step。添加 `--trust` 可跳过安装确认。`grok` 把 config 存在 `~/.grok` 下；安装后启动新 session，以便加载 skills。

Compound Engineering 也正在提交到官方 [xAI plugin marketplace](https://github.com/xai-org/plugin-marketplace)；maintainer runbook 见 [`docs/grok-marketplace-submission.md`](docs/grok-marketplace-submission.md)。

### Devin CLI

Repo 提供 native `.devin-plugin/plugin.json` manifest，因此 Devin CLI 可以直接从 GitHub 安装 Compound Engineering：

```bash
devin plugins install EveryInc/compound-engineering-plugin
```

验证安装并检查 skills：

```bash
devin plugins list
devin plugins info compound-engineering
```

使用 `devin plugins update compound-engineering` 更新到最新版。Plugins 会在 session 开始时加载，因此安装或更新后需要启动新 Devin session，skills 才会以 `/compound-engineering:<skill>` slash commands 出现。

少数 skills 声明了 Devin 尚未映射的 Claude-style `allowed-tools` names（例如 `Bash`）。这些 skills 仍可工作，但某些 actions 会请求 permission，而不是 auto-approved 运行。详见 [`docs/specs/devin.md`](docs/specs/devin.md)。

### GitHub Copilot

For **VS Code Copilot Agent Plugins**:

1. Run `Chat: Install Plugin from Source` from the VS Code command palette
2. Use `EveryInc/compound-engineering-plugin` for the repo
3. Select `compound-engineering` when VS Code shows the plugins in this repository

For **Copilot CLI**, use:

Inside Copilot CLI:

```text
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering@compound-engineering-plugin
```

From a shell with the `copilot` binary:

```bash
copilot plugin marketplace add EveryInc/compound-engineering-plugin
copilot plugin install compound-engineering@compound-engineering-plugin
```

Copilot CLI reads the existing Claude-compatible plugin manifests, so no separate Bun install step is needed.

### Factory Droid

From a shell with the `droid` binary:

```bash
droid plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin
droid plugin install compound-engineering@compound-engineering-plugin
```

Droid uses `plugin@marketplace` plugin IDs; here `compound-engineering` is the plugin and `compound-engineering-plugin` is the marketplace name. Droid installs the existing Claude Code-compatible plugin and translates the format automatically, so no Bun install step is needed.

### Qwen Code

```bash
qwen extensions install EveryInc/compound-engineering-plugin:compound-engineering
```

Qwen Code installs Claude Code-compatible plugins directly from GitHub and converts the plugin format during install, so no Bun install step is needed.

### OpenCode

Add Compound Engineering to the `plugin` array in your global or project `opencode.json`:

```json
{
  "plugin": ["compound-engineering@git+https://github.com/EveryInc/compound-engineering-plugin.git"]
}
```

Restart OpenCode after changing the config. The OpenCode plugin registers the Compound Engineering skills directory directly; no Bun installer or generated skill copy is required. See [`.opencode/INSTALL.md`](.opencode/INSTALL.md) for pinning examples.

### Pi

Install Compound Engineering as a Pi package from this repository:

```bash
pi install git:github.com/EveryInc/compound-engineering-plugin
```

Required companion for CE workflows that dispatch reviewer, research, or implementation subagents:

```bash
pi install npm:pi-subagents
```

Recommended companion for richer blocking questions:

```bash
pi install npm:pi-ask-user
```

### Antigravity CLI (`agy`)

Google 已用 [Antigravity CLI](https://antigravity.google)（`agy`）替代 consumer Gemini CLI，后者仍运行在 Gemini models 上。直接从 GitHub 安装 Compound Engineering，无需 clone：

```bash
agy plugin install https://github.com/EveryInc/compound-engineering-plugin
```

用下面命令验证：

```bash
agy plugin list
```

repository root 就是 plugin package（`plugin.json` 加 `skills/`）。

本地 checkout 或 pinned release 可用：

```bash
git clone https://github.com/EveryInc/compound-engineering-plugin
agy plugin install ./compound-engineering-plugin
```

bundled `.agy/` directory 仍可作为 compatibility entry point：

```bash
agy plugin install ./compound-engineering-plugin/.agy
```

`agy` 也会从 checkout 加载 `GEMINI.md` workspace context。

pinning、本地开发、uninstall 和 legacy Gemini import 见 [`.agy/INSTALL.md`](.agy/INSTALL.md)。

### Existing Installs

Compound Engineering moved to a root-native, skills-only layout. An existing marketplace install keeps a **cached** marketplace snapshot that still points at the old `plugins/compound-engineering` path, so updating the plugin on its own reads that stale snapshot and leaves you on the previous version. Refresh the cached marketplace **first**, then update the plugin — order matters.

**Claude Code**

```text
/plugin marketplace update compound-engineering-plugin
/plugin update compound-engineering
```

**Codex CLI**

```bash
codex plugin marketplace upgrade compound-engineering-plugin
codex plugin add compound-engineering@compound-engineering-plugin
```

There is no `codex plugin update`; re-running `add` reinstalls from the refreshed snapshot. For a non-default profile, run both commands against the same `CODEX_HOME`.

**Codex App**

Refresh the marketplace from the **Plugins** panel (remove and re-add the `EveryInc/compound-engineering-plugin` marketplace if there is no refresh control), then reinstall **compound-engineering** and restart Codex.

If you configured a host with a direct path or sparse path under `plugins/compound-engineering`, edit or reinstall that source so it points at the repository root with no sparse path.

If a previous Bun-installed copy is still shadowing native plugin skills, run the current cleanup command from a checkout of this repository:

```bash
git clone https://github.com/EveryInc/compound-engineering-plugin.git /tmp/compound-engineering-plugin-cleanup
cd /tmp/compound-engineering-plugin-cleanup
bun install
bun run cleanup --target all
```

---

## Local Development

```bash
bun install
bun test
bun run release:validate
```

### From your local checkout

For active development, load this checkout directly in the harness you want to test.

**Claude Code**

```bash
claude --plugin-dir "$PWD"
```

**Cursor Agent CLI**

```bash
cursor-agent --plugin-dir "$PWD"
```

**Codex**

常规、接近生产环境的 plugin 安装请使用上方 [Codex App](#codex-app) 或 [Codex CLI](#codex-cli) 说明。下面的流程仅供贡献者测试某个精确 checkout 或 linked worktree 中尚未发布的文件。

<details>
<summary><strong>高级：在 Codex 中测试当前 checkout</strong></summary>

把当前 worktree 选为 Codex 的 active development source：

```bash
bun run codex:dev -- local
```

该命令会在 `$CODEX_HOME/skills/compound-engineering-local`（默认 `~/.codex/skills/compound-engineering-local`）创建一个指向当前 worktree `skills/` 目录的 collection symlink。它还会通过 Codex CLI 移除已安装的 Compound Engineering plugin variants，避免 marketplace cache 遮蔽或重复加载本地 skills。它不会复制 skills、修改 checkout、执行 `git pull`，也不会触碰 `$CODEX_HOME/skills` 下无关条目。

这个 link 会暴露所选 worktree 中的精确内容，包括 modified 和 untracked skills。普通编辑无需重装；当前 Codex 版本会自动检测直接的 skill 变更。切换 local/remote 安装模式后请启动新 session；普通 skill 修改未出现时，重启 Codex。

检查和切换模式：

```bash
bun run codex:dev -- status
bun run codex:dev -- refresh
bun run codex:dev -- remote
bun run codex:dev -- remove
```

- `status` 报告 local、remote、mixed、drifted 或 absent 状态，以及 linked checkout、worktree 类型、branch、commit SHA 和 dirty counts。
- `refresh` 是幂等的 `local` alias，用于修复误装的 plugin；live link 已会直接反映文件变化。
- `remote` 刷新官方 Git marketplace，安装并验证 `compound-engineering@compound-engineering-plugin`，然后移除 local link，用于模拟已发布版本的用户体验。
- `remove` 移除 Compound Engineering plugin variants 和 managed link，保留 checkout 与其他用户 skills。

脚本会自动推导 repository path，因此可用于任意位置的 checkout，包括带空格的路径。它继承当前 `CODEX_HOME`；测试隔离 profile 时，在命令上设置 `CODEX_HOME`。所有模式必须针对启动 Codex 时使用的同一 `CODEX_HOME` 运行。

不要把 `codex plugin marketplace add "$PWD"` 当作本地开发捷径。仓库提交的 `.agents/plugins/marketplace.json` 会刻意把 Compound Engineering 指回公开 Git repository，因此从该 marketplace 安装仍可能缓存远端内容。Manifest version 相同也不能证明 cache 与 worktree 一致。

</details>

**Kimi Code CLI**

Inside Kimi Code CLI:

```text
/plugins install /path/to/compound-engineering-plugin
```

To test the local marketplace catalog instead, pass the catalog path:

```text
/plugins marketplace /path/to/compound-engineering-plugin/.kimi-plugin/marketplace.json
```

**Cline**

```bash
/path/to/compound-engineering-plugin/.cline/scripts/install-skills.sh --global
```

在 Cline 扩展中启用 **Settings -> Features -> Enable Skills**，然后启动新的 task。

**Devin CLI**

```bash
devin plugins install /path/to/compound-engineering-plugin
```

Local install 会 link 到 checkout，而不是复制内容，因此无需重新安装，skill edits 就会在下一个 Devin session 生效。

**OpenCode**

```json
{
  "plugin": ["/path/to/compound-engineering-plugin"]
}
```

Restart OpenCode after changing `opencode.json`.

**Pi**

```bash
pi -e "$PWD"
```

**Antigravity CLI (`agy`)**

```bash
agy plugin install "$PWD/.agy"
```

`agy` installs the bundled `.agy` plugin directory from your checkout and loads `GEMINI.md` workspace context.

## Limitations

OpenCode and Pi use native package/plugin loading from this repository. The Bun CLI remains for repository development and converter maintenance, not normal installation.

Release versions are owned by release automation. Routine feature PRs should not hand-bump plugin or marketplace manifest versions.

## FAQ

### Do I need Bun to install Compound Engineering?

No. Bun is only needed for repo development tasks and converter maintenance.

### Where do I see all available skills?

The skill inventory is in this README. Each skill's authoritative runtime spec lives in `skills/<skill>/SKILL.md`.

### Where is release history?

GitHub Releases are the canonical release-notes surface. The root [`CHANGELOG.md`](CHANGELOG.md) points to that history.

## Contributing

Contributions are welcome. Issues, bug reports, and pull requests all help make this better, and we genuinely appreciate them — bug reports especially.

A note on what to expect: Compound Engineering is opinionated by design. It's maintained by [@kieranklaassen](https://github.com/kieranklaassen) and [@tmchow](https://github.com/tmchow), and its direction reflects a specific point of view about how AI-assisted engineering should work. So while we welcome help, we can't promise to accept every change — some proposals won't fit that vision even when they're good ideas on their own.

Open an issue or send a PR, and we'll fold in what moves the plugin in the right direction. We just want to be upfront that not everything will land.

## License

[MIT](LICENSE)
