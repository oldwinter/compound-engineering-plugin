# Compound Engineering

[![Build Status](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml/badge.svg)](https://github.com/EveryInc/compound-engineering-plugin/actions/workflows/ci.yml)

让每一个工程工作单元都比上一个更容易的 AI skills。

## Philosophy（理念）

**每一个工程工作单元都应该让后续工作更容易，而不是更困难。**

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
| [`/ce-work`](docs/skills/ce-work.md) | 使用 worktrees 和 task tracking 执行 implementation-ready plans |
| [`/ce-simplify-code`](docs/skills/ce-simplify-code.md) | 在 review 前 refinement 新写的 code，提升 clarity 和 reuse |
| [`/ce-code-review`](docs/skills/ce-code-review.md) | 合并前按 plan 进行 multi-agent review |
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
| [`/ce-pov`](docs/skills/ce-pov.md) | *On demand, before you commit*：对是否采用、切换或重新评估外部 technology、library、pattern、platform 给出 decisive、project-grounded verdict；支持 cold 或 mid-session，并基于 verdict 提议下一步（`/ce-plan`、`/ce-brainstorm` 或 spike） |
| [`/ce-explain`](docs/skills/ce-explain.md) | *On demand, to keep learning*：把 concept、diff、idea 或 “what did I do this week?” 变成写给你个人的 dense visual explainer，可选 check-in（diff 的 predict-then-reveal、corrected exercises）让内容留下来 |

完整 catalog 和 skill chaining 见 [docs/skills](docs/skills/README.md)。完整 inventory 见[下方](#full-skill-inventory)。

## Quick Example（快速示例）

**寻找方向**：当你还没有具体 idea 时，先 ideate，再把最强 survivor 带入 loop：

```text
/ce-ideate new drawing tools
/ce-ideate surprise me
/ce-ideate github issues   # ground ideas in your open issues instead of a prompt
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

`/lfg` 会 hands-off 跑完整 loop：plan，按 plan work，simplify，运行 code review 并应用 fixes，运行 browser tests，commit，push，open PR，然后 watch CI 并修复 failures 直到 green。建议在 `/ce-brainstorm` 之后启动，让它基于真实 requirements plan，而不是基于一行 prompt。它是 standard loop 的 autopilot 版本，适合你想离开一会儿、回来看到一个打开且 green 的 PR。

## Getting Started（开始使用）

安装后，在任意 project 中运行 `/ce-setup`。它会检查 repo-local config、报告 optional tool capabilities，并帮助把 machine-local CE settings 安全地放进 gitignore。

`compound-engineering` plugin 当前包含 29 个 skills 和 0 个 standalone agents。Specialist review、research 和 workflow behavior 位于所属 skill 内，作为 skill-local prompt assets。

### Full Skill Inventory（完整 Skill 清单）

| Skill | Purpose（用途） |
|-------|---------|
| `/ce-strategy` | 创建或维护 `STRATEGY.md` |
| `/ce-ideate` | 生成并严格评估 grounded ideas |
| `/ce-pov` | 对外部输入形成 decisive、project-grounded verdict |
| `/ce-explain` | 将 concept、diff、idea 或你自己的一段 work 解释成个人学习 artifact |
| `/ce-brainstorm` | 探索 requirements 并写出尺寸合适的 requirements doc |
| `/ce-plan` | 创建 structured implementation plans |
| `/ce-work` | 系统性执行 implementation plans |
| `/ce-code-review` | 使用 skill-local reviewer personas review code |
| `/ce-doc-review` | Review requirements 和 plan documents |
| `/ce-debug` | Reproduce failures，trace root cause，fix bugs，并为 non-trivial fixes 准备 PR |
| `/ce-compound` | 记录已解决问题，compound team knowledge |
| `/ce-compound-refresh` | Refresh stale 或 drifting learnings |
| `/ce-optimize` | 运行 iterative optimization loops |
| `/ce-product-pulse` | 生成 time-windowed product pulse reports |
| `/ce-riffrec-feedback-analysis` | 把 Riffrec recordings 或 notes 转成 structured feedback |
| `/ce-sweep` | Sweep feedback sources，track item lifecycles，并产出 `/lfg`-ready plan |
| `/ce-resolve-pr-feedback` | Resolve PR review feedback |
| `/ce-commit` | 创建带清晰 message 的 git commit |
| `/ce-commit-push-pr` | Commit、push、open PR，并保留 related work references |
| `/ce-worktree` | 确保 work 在 isolated git worktree 中进行 |
| `/ce-promote` | Draft user-facing announcement copy |
| `/ce-test-browser` | 对 PR-affected pages 运行 browser tests |
| `/ce-test-xcode` | 在 simulator 上 build 和 test iOS apps |
| `/ce-setup` | Diagnose optional tool capabilities 和 project config |
| `/ce-simplify-code` | Simplify recent code changes |
| `/ce-polish` | 启动 dev server 并迭代 UX polish |
| `/ce-proof` | 创建、编辑和分享 Proof documents |
| `/ce-dogfood` | 对 active branch 做 hands-off diff-scoped browser QA，并可自主修复小 breakages |
| `/lfg` | 完整 autonomous engineering workflow |

---

## Install

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

Google has replaced the consumer Gemini CLI with [Antigravity CLI](https://antigravity.google) (`agy`), which still runs on Gemini models. Unlike Gemini CLI, `agy` installs plugins from a **local checkout** (not a repository URL), so clone this repository and install the bundled `.agy` plugin directory:

```bash
git clone https://github.com/EveryInc/compound-engineering-plugin
agy plugin install ./compound-engineering-plugin/.agy
```

`agy` also loads `GEMINI.md` workspace context from the checkout.

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

**Codex App**

In the app's **Add plugin marketplace** form, use this checkout as the source:

| Field | Value |
| --- | --- |
| Source | `/path/to/compound-engineering-plugin` |
| Git ref | current branch, or leave blank for a local folder |
| Sparse paths | leave blank |

**Codex CLI**

```bash
codex plugin marketplace add "$PWD"
codex plugin add compound-engineering@compound-engineering-plugin
```

Use a separate `CODEX_HOME` when you want to keep local testing isolated from your normal Codex profile. The Codex marketplace entry points at the public Git plugin source so root-shaped plugin repos install correctly; use a temporary marketplace catalog with a `source.url` plus `ref` when testing unpublished plugin-content changes end to end.

**Kimi Code CLI**

Inside Kimi Code CLI:

```text
/plugins install /path/to/compound-engineering-plugin
```

To test the local marketplace catalog instead, pass the catalog path:

```text
/plugins marketplace /path/to/compound-engineering-plugin/.kimi-plugin/marketplace.json
```

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
