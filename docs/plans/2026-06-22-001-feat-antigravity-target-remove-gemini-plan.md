---
title: "feat: Add Antigravity (agy) target and remove Gemini CLI target"
date: 2026-06-22
type: feat
status: draft
origin: docs/specs/antigravity.md
---

# feat: 添加 Antigravity (`agy`) target，并移除 Gemini CLI target

## Summary

用新的 `antigravity` target 替换 `gemini` converter/install target。新 target emit 已在 `docs/specs/antigravity.md` 中验证的 Antigravity CLI（`agy`）plugin format。本 plugin 自身 shipping 一个 committed `.agy/` folder，让用户可以运行 `git clone … && agy plugin install ./compound-engineering-plugin/.agy`。移除所有 `gemini` target machinery、`gemini-extension.json`、Gemini spec 和 gemini tests，并在两个 cleanup registries 中登记 removed artifacts，确保 upgraders 被清理。保留 `GEMINI.md`（`agy` 仍会作为 workspace context 读取）。

这是 Gemini -> Antigravity migration 的 **Wave 2**。Wave 1（skill prose sweep：在 37 个文件中将 `Gemini CLI` -> `Antigravity CLI (agy)`、`ask_user` -> `ask_question`，并更新 README transition notes）已在 branch `tmchow/antigravity-cli-support` 上完成且尚未提交。

## Problem Frame

Google 已用 Antigravity CLI（`agy`）取代 consumer Gemini CLI。它是一个 distinct Go-based terminal agent，拥有自己的 install model、plugin format 和 permission system，同时仍由 Gemini models 支撑。本仓库目前把 Gemini CLI 当作 first-class converter/install target。consumer Gemini CLI retired 后，该 target 已成 dead weight，install instructions 也已失效。我们需要改为 target Antigravity，并彻底移除 Gemini。

Antigravity format 已针对 `agy` v1.0.10 做 empirical verification（不是 docs；`antigravity.google/docs` 是 client-side render）。下面所有 format facts 都追溯到 `docs/specs/antigravity.md`。

## Requirements

- **R1** — 新 `antigravity` converter target emit 已验证的 `agy` plugin format：root `plugin.json`（`{name, version}`）、`skills/<n>/SKILL.md`、`agents/<n>.md`、commands as skills、`mcp_config.json`（`{mcpServers}`）、`hooks.json`（`{hooks}`）。（origin: `docs/specs/antigravity.md`）
- **R2** — Remote MCP servers emit `serverUrl`（不是 `url`/`httpUrl`）；stdio servers emit `{command, args}`。（origin spec: “remote MCP uses serverUrl”）
- **R3** — 本 plugin shipping committed `.agy/` bundle，可通过 `agy plugin install ./.agy` 安装；`.agy/skills` symlink 到 `../skills`，复用 canonical root `skills/`，不复制。
- **R4** — 移除 `gemini` target 及其所有 machinery；removed artifacts 登记到 `STALE_*`（`src/utils/legacy-cleanup.ts`）和 `EXTRA_LEGACY_ARTIFACTS_BY_PLUGIN`（`src/data/plugin-legacy-artifacts.ts`）。
- **R5** — 保留 `GEMINI.md`（`agy` 仍会读取）；移除 `gemini-extension.json` 和 `docs/specs/gemini.md`。
- **R6** — README install instructions 使用可工作的 `agy plugin install ./compound-engineering-plugin/.agy` flow。
- **R7** — `bun test` 和 `bun run release:validate` pass。

## Key Technical Decisions

**KTD1 — Antigravity 是 “bundle-emitting” target，而不是 “install-into-user-dir” target。**
Gemini writer 会把 skills/agents/commands 写入 live `.gemini/` directory。`agy` 则通过 `agy plugin install <dir>` ingest 一个 plugin *directory* 到自己的内部 registry（通过 `agy plugin list --json` 暴露，没有可读的 `plugins/` tree）。因此 antigravity target 的 writer 会向 output root emit 自包含 plugin *bundle*（`.agy/` shape layout），而不是写入 `~/.gemini/antigravity-cli/`。`install --to antigravity` emit bundle，并展示 `agy plugin install <path>` command，而不是直接 mutate agy registry。

**KTD2 — Committed `.agy/` folder with a `skills` symlink（已与用户确认）。**
本 plugin 的 canonical distribution 是 repo root 下 committed `.agy/` directory，包含 `plugin.json` 以及 `skills -> ../skills` symlink（已验证可工作：`agy plugin install ./.agy` 会 follow symlink 并 register skills）。理由：保持 repo root 清爽（避免 root `plugin.json` 与 `.claude-plugin/`、Codex、Cursor manifests 并列），并复用 canonical `skills/`，而不是复制。当前 plugin 不 shipping root `agents/`、`commands/` 或 MCP servers，所以只需要 `skills` symlink；`mcp_config.json`/`hooks.json` 仅在未来该 plugin 获得这些 components 时 emit。Rejected alternatives：committed root `plugin.json`（root 更乱，虽然 `agy plugin install .` 略简洁）和 generated `dist/`（install path 是 build artifact，不易发现）。Symlink portability 可接受，因为 AGENTS.md 已声明 native Windows 不是 target。

**KTD3 — MCP field mapping `url` -> `serverUrl`。** Gemini converter 会为 HTTP MCP servers emit `url`；antigravity converter 必须在 `mcp_config.json` 中 emit `serverUrl`（已验证：validator 会以 “must have either command or serverUrl” reject `url`/`httpUrl`）。Stdio servers 保留 `{command, args, env}`。

**KTD4 — Commands 作为 commands emit；`agy` 在 install 时将其转换为 skills。** `agy plugin validate` 把 `commands/*.{toml,md}` 报告为 “converted to skills”。Converter 可用任一形式 emit commands；选择 emit `commands/<n>.toml`（复用现有 gemini TOML serialization，是 lowest-delta path）并记录 `agy` 会转换它们。本 plugin 不 shipping commands，因此该路径只由 general converter 和 tests 覆盖。

**KTD5 — Hooks：只 emit container；per-event schema defer。** `agy` 接受 `{hooks: {...}}` shape（container 已验证），但 per-event matcher/command schema 和 supported event names 尚未在 spike 中验证。Converter emit `{hooks}` wrapper，并结构性映射 Claude hook entries；真实 per-event hook fidelity defer 到 schema 经 live `agy` run 验证之后。Gemini converter 完全跳过 hooks，因此这已经是 net improvement。

**KTD6 — Release component swap。** 在 `src/release/components.ts` 中移除 `gemini-extension.json` prefix，并添加 `.agy/plugin.json`（新的 committed、release-owned manifest）。保留 `GEMINI.md` prefix（文件保留）。相应更新 `src/release/metadata.ts` 的 gemini manifest type。

**KTD7 — Content path rewriting。** Gemini converter 的 `transformContentForGemini` 会重写 `.claude/` -> `.gemini/`，以及 `Task X()` -> `Use the @X subagent`。对 Antigravity 来说，这些 rewrite 的 agy conventions 在 spike 中未验证。默认：保留 subagent-call rewrite（harness-neutral phrasing），但不做未经验证的 `.claude/` path rewrite，避免 emit 未验证的 `.gemini`/`.agy` path rewrite。标记为 execution-time check。

## High-Level Technical Design

New-target touch-points（`gemini` 和 `opencode` wiring 的并集），按 dependency order：

```
types/antigravity.ts ─┐
                      ├─> converters/claude-to-antigravity.ts ─┐
                      │                                        ├─> targets/index.ts (register)
                      └─> targets/antigravity.ts (writer) ─────┘        │
                                                                        ├─> commands/convert.ts  (--to)
                                                                        ├─> commands/install.ts  (--to)
                                                                        ├─> commands/cleanup.ts  (case + fn)
                                                                        ├─> utils/detect-tools.ts (~/.gemini/antigravity-cli)
                                                                        ├─> utils/resolve-output.ts (.agy output root)
                                                                        ├─> data/plugin-legacy-artifacts.ts (getLegacyAntigravityArtifacts)
                                                                        └─> release/{components,metadata}.ts
```

Emitted `agy` bundle shape（general converter output；本 plugin committed bundle 是 **bold** subset）：

```
<output-root>/
  plugin.json          # { "name", "version" }          (committed: .agy/plugin.json)
  skills/<name>/SKILL.md                                 (committed: .agy/skills -> ../skills symlink)
  agents/<name>.md
  commands/<name>.toml # agy converts these to skills
  mcp_config.json      # { "mcpServers": { "<n>": {command,args} | {serverUrl} } }
  hooks.json           # { "hooks": { ... } }  (container only; see KTD5)
```

## Output Structure（this plugin's committed bundle）

```
.agy/
  plugin.json          # { "name": "compound-engineering", "version": <release-owned> }
  skills -> ../skills  # symlink to canonical root skills/
```

## Implementation Units

### U1. Antigravity types

**Goal:** 定义 bundle 和 sub-types，镜像 `src/types/gemini.ts`，并适配 agy format。
**Requirements:** R1, R2
**Dependencies:** none
**Files:** `src/types/antigravity.ts`
**Approach:** 定义 `AntigravityBundle`（pluginName、generatedSkills、skillDirs、agents?、commands、mcpServers?、hooks?）、`AntigravitySkill`、`AntigravitySkillDir`、`AntigravityAgent`、`AntigravityCommand` 和 `AntigravityMcpServer`，其中 MCP server 使用 `command? / args? / env? / serverUrl? / headers?`（注意 `serverUrl`，不是 `url`）。添加 `pluginManifest` shape `{ name: string; version: string }`。
**Patterns to follow:** `src/types/gemini.ts`。
**Test scenarios:** 无单独测试；pure type definitions 由 U2/U3 tests 覆盖。

### U2. claude-to-antigravity converter

**Goal:** 将 `ClaudePlugin` 转换为 `AntigravityBundle`。
**Requirements:** R1, R2
**Dependencies:** U1
**Files:** `src/converters/claude-to-antigravity.ts`、`tests/antigravity-converter.test.ts`
**Approach:** mirror `convertClaudeToGemini`。按 `antigravity` platform tag 过滤 skills（如果 `ce_platforms` gating 需要，保留对旧 gemini key 的 back-compat acceptance，执行时确认）。通过 `convertAgent` analog 转换 agents（YAML frontmatter）。通过 `toToml` analog 将 commands 转成 `commands/<n>.toml`（KTD4）。映射 MCP servers：`url` -> `serverUrl`（KTD3）。Emit `{hooks}` container（KTD5）。提供 `transformContentForAntigravity`，保留 subagent-call rewrite；省略未验证的 path rewrites（KTD7）。
**Patterns to follow:** `src/converters/claude-to-gemini.ts`（`convertClaudeToGemini`、`convertMcpServers`、`convertAgent`、`convertCommand`、`toToml`、`transformContentForGemini`）。
**Test scenarios:**
- Happy path：skills pass through as skillDirs；agents map to `AntigravityAgent[]` with frontmatter。
- MCP remote server `{url}` input emits `{serverUrl}`；stdio `{command,args,env}` preserved。**Covers R2.**
- MCP server with neither command nor serverUrl is dropped/flagged（matches agy validation）。
- Command with `argumentHint` serializes to TOML with args placeholder。
- Content transform rewrites `Task agent(x)` call to harness-neutral subagent phrasing；does NOT introduce `.gemini`/`.agy` path rewrite（KTD7 guard）。
- Hooks input produces `{hooks}` container（不断言 per-event fidelity；KTD5）。

### U3. Antigravity writer

**Goal:** 将 `AntigravityBundle` 作为 agy bundle layout 写入 output root。
**Requirements:** R1, R3
**Dependencies:** U1, U2
**Files:** `src/targets/antigravity.ts`、`tests/antigravity-writer.test.ts`
**Approach:** 导出 `writeAntigravityBundle(outputRoot, bundle)`。写入 `plugin.json`（`{name, version}`）、`skills/<n>/SKILL.md`（复制 dirs + generatedSkills，并应用 `transformContentForAntigravity`）、`agents/<n>.md`、`commands/<n>.toml`，且仅在存在时写入 `mcp_config.json`（`{mcpServers}`）和 `hooks.json`（`{hooks}`）。Version 解析沿用 gemini path 的 source（release-owned）。不要写入 `~/.gemini/antigravity-cli/`（KTD1）。
**Patterns to follow:** `src/targets/gemini.ts`（`writeGeminiBundle`、`resolveGeminiPaths`）。
**Test scenarios:**
- Happy path：给定包含一个 skillDir + 一个 agent 的 bundle，expected files 出现在正确 paths。
- `plugin.json` contains `{name, version}`，并满足 minimal-manifest contract。
- 仅当 servers 存在时写 `mcp_config.json`；否则缺省（本 plugin 的 case）。
- 仅当 hooks 存在时写 `hooks.json`。
- Remote MCP server serializes with `serverUrl`。**Covers R2.**

### U4. Register target + wire convert/install/detect/resolve-output

**Goal:** 让 `antigravity` 成为可选择、可检测 target。
**Requirements:** R1
**Dependencies:** U2, U3
**Files:** `src/targets/index.ts`、`src/commands/convert.ts`、`src/commands/install.ts`、`src/utils/detect-tools.ts`、`src/utils/resolve-output.ts`、`tests/cli.test.ts`、`tests/detect-tools.test.ts`、`tests/resolve-output.test.ts`
**Approach:** 在 `targets` 中添加 `antigravity` entry（`implemented: true`、`convertClaudeToAntigravity`、`writeAntigravityBundle`）。在 `convert.ts` 和 `install.ts` 的 `--to` option descriptions 中加入 `antigravity`。在 `detect-tools.ts` 中检测 `~/.gemini/antigravity-cli/`（以及 workspace `.agy/`）。在 `resolve-output.ts` 中添加 `antigravity` case，将 output root 解析为 `<base>/.agy`。

## Validation

- `bun test`
- `bun run release:validate`
- `agy plugin validate ./.agy`（如果本机安装了 `agy`）

## Scope Boundaries

- 不实现 Antigravity marketplace distribution；仅支持 local directory install。
- 不声称 per-event hooks fidelity 完整，直到 live `agy` schema 被验证。
- 不移除 `GEMINI.md`，因为 `agy` 仍会读取它作为 workspace context。
