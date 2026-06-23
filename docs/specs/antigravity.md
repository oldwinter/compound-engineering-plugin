# Antigravity CLI (`agy`) target spec

Status: spike findings, 已在 macOS 上针对 `agy` v1.0.10 做 empirical verification（2026-06-22）。本文记录 Antigravity CLI plugin format，供 `claude-to-antigravity` converter target 实现使用。它取代 `docs/specs/gemini.md` 作为后续工作的依据；Gemini CLI 将从 target 中移除。

## Background

Google 已用 **Antigravity CLI**（binary `agy`）取代 consumer Gemini CLI。它是一个基于 Go 的 terminal agent，仍运行在 Gemini models 上，但拥有独立的 install model、plugin format 和 permission system；它不是 `gemini` 的简单改名。根据公开报道，consumer Gemini CLI access（free / AI Pro / Ultra）约在 2026-06-18 被切断，而 enterprise Gemini Code Assist 和付费 API-key access 继续可用。本仓库的决策是完全移除 Gemini target，改为 target Antigravity。

下面所有事实都通过构建 fixture plugin 并运行 `agy plugin validate` / `agy plugin install` / `agy plugin list` / `agy plugin uninstall` 验证，而不是来自文档（`antigravity.google/docs` 通过 client-side rendering 输出，机器不可读）。

## Install model（面向用户）

`agy` 从**本地目录**安装 plugin，而不是 repository URL：

```bash
git clone https://github.com/EveryInc/compound-engineering-plugin
agy plugin install ./compound-engineering-plugin
```

- `agy plugin install <target>` 要求 `<target>` 是包含 root-level `plugin.json` 的目录；否则 `agy plugin validate .` 会以 “missing plugin.json” 失败。
- 不支持 install-from-URL。`agy plugin install <plugin>@<marketplace>` 用于 marketplace。
- `agy plugin import [gemini|claude]` 会 import 现有 Gemini-CLI / Claude install；本机上 `agy plugin list` 显示 `compound-engineering` 已通过 `source: gemini-cli` import。
- 其他 subcommands：`list`、`uninstall <name>`、`enable <name>`、`disable <name>`、`validate [path]`、`link <mp> <target>`。

Installed/imported plugins 记录在内部 registry 中，可通过 `agy plugin list --json` 查看；它不是可读的 `plugins/` directory tree。每个 entry 记录 `name`、`source`（`antigravity` | `gemini-cli` | `claude`）、`importedAt` 和识别出的 `components`。

## Plugin layout（converter 必须 emit 的内容）

```
<plugin-root>/
  plugin.json              # required manifest, at root
  skills/<name>/SKILL.md   # skills (SKILL.md with YAML frontmatter)
  agents/<name>.md         # subagents (markdown + frontmatter)
  commands/<name>.{toml,md} # commands -- CONVERTED TO SKILLS on install/import
  mcp_config.json          # MCP servers (root file)
  hooks.json               # hooks (root file)
```

`agy plugin validate` 会把每个 section 报告为 `processed` 或 `skipped (not found)`，因此所有 component dirs/files 都是 optional，并按 convention 发现。

### `plugin.json`

最小 valid manifest（已验证）：

```json
{ "name": "compound-engineering", "version": "0.0.0" }
```

- `name` 和 `version` 足以通过 validate。`description` 和其他字段是 optional，validator 不要求它们。（本仓库中 version 由 release 管理；见 release notes。）

### Skills

- `skills/<name>/SKILL.md`，使用标准 YAML frontmatter（`name`、`description`）。这与 Claude/Gemini surfaces 已使用的 SKILL.md contract 相同；skills 看起来可直接 port。

### Agents（subagents）

- `agents/<name>.md`，带 frontmatter（`name`、`description`）的 markdown。每个 agent 一个 `.md` 文件。

### Commands -> skills

- `commands/<name>.toml` 和 `commands/<name>.md` 都可以 validate，并被报告为 **“converted to skills”**。Antigravity 没有独立 runtime command primitive；commands 会在 install 时变成 skills。Converter implication：可以直接把 commands emit 为 skills，而不是 shipping command format。

### MCP servers（`mcp_config.json`）

Root file shape 为 `{ "mcpServers": { "<name>": { ... } } }`。已验证字段名：

- **stdio server:** `{ "command": "...", "args": [...] }`
- **remote server:** `{ "serverUrl": "https://..." }`，不是 `url`，也不是 `httpUrl`。错误 key 的 validator message：`MCP server "<name>" must have either command or serverUrl`。

Converter implication：把 Gemini/Claude remote-MCP `url` field 映射到 `serverUrl`。

### Hooks（`hooks.json`）

Root file shape 为 `{ "hooks": { ... } }`。`{ "hooks": { "PreToolUse": [] } }` shape 可以 validate（top-level container 已确认）。Per-event hook schema（matchers、command shape，以及除 `PreToolUse` 外的 event names）尚未在本 spike 中穷尽验证，emit real hooks 前必须确认。

## Permissions / interactive question tool

- `agy` 通过 TUI permission prompts gate tool execution（`/permissions` slash command 以及 `toolPermission` setting：`always-proceed` | `request-review` | `strict` | `proceed-in-sandbox`），并通过 settings 中的 `permissions` allow/deny/ask rules 控制；它不是 Gemini-CLI-style `ask_user` tool。
- 暴露给 agents 的 interactive blocking-question tool 是 **`ask_question`**（live usage 已确认）。列举 per-harness blocking-question tools 的 plugin skill prose 应为 Antigravity 使用 `ask_question`（这已在 Wave 1 skill sweep 中应用）。

## Context files

- `agy` 仍会读取 `GEMINI.md`（workspace）和 `AGENTS.md` 作为 context。因此即使 Gemini *converter target* 被移除，也保留 `GEMINI.md`。Google 后续可能会统一到 `AGENTS.md`；暂记为 TBD。

## Settings（reference）

Global settings 位于 `~/.gemini/antigravity-cli/settings.json`（bundled CLI guide 中观察到的 keys 包括 `permissions`、`toolPermission`、`trustedWorkspaces`、model、sandbox、status line）。Builtin skills 位于 `~/.gemini/antigravity-cli/builtin/skills/`。

## Implementation open questions

- 精确的 `hooks.json` per-event schema（matcher/command shape、supported event names）。
- `agy plugin install` 是否支持 monorepo subdirectory，还是只支持 root `plugin.json`。
- Generated root `plugin.json`（相对 `.claude-plugin/plugin.json`）是否是正确 emission target，以及它如何与现有 Claude/Codex manifests 在 repo root 共存。
- Marketplace（`<plugin>@<marketplace>`、`agy plugin link`）distribution，如果以后需要。
