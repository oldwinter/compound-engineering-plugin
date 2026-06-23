---
title: Verify a new target platform's plugin format against the CLI binary, not its docs
date: 2026-06-23
category: conventions
module: converters
problem_type: convention
component: converter-cli
severity: medium
applies_when:
  - Adding a new converter or install Target for an agent platform
  - The platform's official docs render client-side or are otherwise not machine-readable
  - Establishing the ground-truth plugin layout before writing converter or writer code
  - Migrating an existing Target to a successor platform (e.g. Gemini CLI to Antigravity)
tags: [antigravity, agy, new-target, plugin-format, empirical-verification, converter]
---

# 用 CLI binary 验证新 target platform 的 plugin format，而不是只信 docs

## Context

添加新的 converter Target（结构化 6-phase checklist 见 [adding-converter-target-providers.md](../adding-converter-target-providers.md)）的前提，是你已经知道 target 的 plugin format：manifest schema、directory layout、MCP/hook config shape 和 install command。通常这些信息来自平台文档。

当 target **Antigravity CLI**（`agy`，Google 对 retired consumer Gemini CLI 的后继）时，这条路失效了：`antigravity.google/docs` 是 client-side app，`WebFetch` 只能拿到 page title，没有 schema、commands 或 field names。两个只基于 docs 和 training data 的独立 research agents 对具体事实给出了互相矛盾的结论，例如 interactive tool 是否为 `ask_user`、remote MCP servers 使用 `url` 还是 `serverUrl`。基于任一猜测实现 converter，都会 shipping 一个被 `agy` 静默 reject 或 mis-read 的 format。

## Guidance

**当 target platform 提供 CLI 时，把 installed binary 当作 authoritative format spec，并在写 converter code 前做 empirical probing。** 用 throwaway fixture plugin 运行 CLI 自带的 validate/install/list commands，观察它接受、转换和存储什么。把 findings 记录到 `docs/specs/<target>.md`，再基于 spec 实现 converter，而不是基于 docs 猜测。

对 `agy` v1.0.10 有效的 probing loop：

1. **从最小形态开始，让 validator 教你 schema。** 只有 `{ "name", "version" }` 的 `plugin.json` 可以通过 `agy plugin validate`；validator 的 per-section output（`skills`、`agents`、`commands`、`mcpServers`、`hooks`，每项为 `processed` 或 `skipped (not found)`）在无 docs 情况下揭示了完整 component surface。
2. **一次添加一个 candidate component** 并重复 validate，学习每个 component 的 expected location 和 form（`agents/<n>.md`、`commands/<n>.{toml,md}` 被报告为 “converted to skills”、root `mcp_config.json`、root `hooks.json`）。
3. **用 validator error messages 解决 field-name 分歧。** 给 remote MCP server 输入 `{ "url": ... }` 会得到 `must have either command or serverUrl`，明确确认 `serverUrl`，而不是 docs/agents 猜测的 `url` / `httpUrl`。
4. **先 `install`，再 `list --json`，最后 `uninstall`**，学习 install model 和 storage，同时不留下 residue：`agy plugin install <dir>` 要求**本地目录**（不支持 install-from-URL），installed plugins 存在内部 registry 中（`agy plugin list --json` 显示 `source ∈ {antigravity, gemini-cli, claude}`），而不是可读的 `plugins/` tree。
5. **挖 binary 和 bundled assets** 获取 probing 不能暴露的内容；例如 `~/.gemini/antigravity-cli/builtin/skills/.../cli.md` 记录了 `/permissions` 和 `toolPermission` setting。

**无法确认的内容要 defer，不要猜。** Per-event `hooks.json` schema 无法通过 fixture 建立，因此 converter 只 emit `{ hooks: {...} }` container，并在 spec 记录缺口，而不是 emit 未验证的 per-event shape。同样，当 human operator 有 probe 缺少的 live knowledge 时，优先采用它：`ask_question` tool name 是用户基于 live `agy` usage 确认的，binary string-inspection 没找到。

## Why This Matters

Converter 写出的文件会被另一个 tool ingest。错误的 field name、manifest location 或 install assumption 会**静默失败**：target 跳过 section 或 reject bundle，而我们的 pipeline 没有报错，最终把坏 output 交给该 target 的每个用户。这里 docs 是比 binary 更弱的 oracle，原因有三：它们可能无法 fetch（client-rendered）、可能落后于 CLI 实际行为、LLM 会用 training prior 自信补空并给出错误细节。CLI binary 才是用户实际运行的 artifact，因此它的 acceptance behavior 是唯一不可能 stale 或 hallucinate 的 spec。成本很低（对 fixture 跑几次 `validate`/`install`），产出的 spec 可被所有后续 converter changes 复用。

## When to Apply

- 每次新增或显著修改 converter/install Target，且平台暴露了你可本地运行的 CLI。
- 尤其当平台 docs 是 client-rendered、稀疏、很新或快速变化时。
- 迁移 Target 到后继平台时；不要假设 format continuity。Antigravity 继承了 Gemini 的 *models*，并读取 `GEMINI.md`，但 plugin format、install model、MCP field names 和 permission model 都不同。
- 只有当平台发布可直接 validate 的 machine-readable schema，或提供可 diff 的 official converter/import 时，才可以跳过或降低强度。

## Examples

**通过 probing 确认的 Antigravity facts（完整记录见 [docs/specs/antigravity.md](../../specs/antigravity.md)）：**

| Question | Docs/agent guess | Probe result |
| --- | --- | --- |
| Remote MCP field | `url` / `httpUrl` | **`serverUrl`**（validator: “must have either command or serverUrl”） |
| Install source | repo URL | **包含 root `plugin.json` 的本地目录**（`agy plugin install <dir>`） |
| Commands | command primitive | **install 时 converted to skills** |
| Interactive tool | `ask_user` | **`ask_question`**（live use 已确认；binary strings 中没有） |
| Minimal manifest | unknown | **`{ name, version }`** |

**Converter consequence：** `src/converters/claude-to-antigravity.ts` 把 Claude remote-MCP `url` 映射为 `serverUrl`，`src/targets/antigravity.ts` emit 已验证的 bundle layout。这些 mappings 来自 spec；docs 无法提供。

**Packaging consequence：committed `.agy/` bundle with a symlink。** 因为 `agy plugin install` 会相对 `plugin.json` location 解析 component dirs，本 plugin shipping 一个 committed `.agy/` directory，其中包含 `plugin.json` 和 `skills -> ../skills` symlink（已验证：`agy plugin validate ./.agy` 会通过 symlink process all skills）。这既保持 repo root 清爽，又复用 canonical root `skills/`，无需复制；用户可运行 `git clone … && agy plugin install ./compound-engineering-plugin/.agy`。（另见 [native-plugin-install-strategy.md](../integrations/native-plugin-install-strategy.md) 中的 per-platform choices。）

Related: GitHub issue #911（Transition to Antigravity CLI）；plan `docs/plans/2026-06-22-001-feat-antigravity-target-remove-gemini-plan.md`。
