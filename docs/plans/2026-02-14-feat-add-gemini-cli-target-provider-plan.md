---
title: 将 Gemini CLI 添加为 Target Provider
type: feat
status: completed
completed_date: 2026-02-14
completed_by: "Claude Opus 4.6"
actual_effort: "单次 session 完成"
date: 2026-02-14
---

# 将 Gemini CLI 添加为 Target Provider

## 概览

在 converter CLI 中添加 `gemini` 作为第六个 target provider，与 `opencode`、`codex`、`droid`、`cursor` 和 `pi` 并列。这样 `convert` 和 `install` 命令都可以使用 `--to gemini`，将 Claude Code plugins 转换为 Gemini CLI-compatible format。

Gemini CLI（[google-gemini/gemini-cli](https://github.com/google-gemini/gemini-cli)）是 Google 面向 terminal 的 open-source AI agent。它支持 GEMINI.md context files、custom commands（TOML format）、agent skills（SKILL.md standard）、MCP servers 和 extensions，因此是一个覆盖 Claude Code plugin concepts 很完整的 conversion target。

## 组件映射

| Claude Code | Gemini 对应项 | 说明 |
|---|---|---|
| `agents/*.md` | `.gemini/skills/*/SKILL.md` | Agents 变成 skills -- Gemini 会根据 description matching，通过 `activate_skill` tool 按需激活 |
| `commands/*.md` | `.gemini/commands/*.toml` | TOML format，包含 `prompt` 和 `description` fields；通过 directory structure namespaced |
| `skills/*/SKILL.md` | `.gemini/skills/*/SKILL.md` | **标准完全相同** -- 直接 copy |
| MCP servers | `settings.json` `mcpServers` | 同一 MCP protocol；config location 不同（`settings.json` vs `.mcp.json`） |
| `hooks/` | `settings.json` hooks | Gemini 有 hooks（`BeforeTool`, `AfterTool`, `SessionStart` 等），但 format 不同；暂时 emit `console.warn` 并 skip |
| `.claude/` paths | `.gemini/` paths | 需要 content rewriting |

### 关键设计决策

**1. Agents become skills（不是 GEMINI.md context）**

如果把 29 个 agents dump 到 GEMINI.md，会淹没每个 session 的 context。因此 agents 转为 skills -- Gemini 会在相关时根据 skill description 自主激活它们。这匹配 Claude Code agents 通过 Task tool 按需调用的方式。

**2. Commands 使用带 directory-based namespacing 的 TOML format**

Gemini CLI commands 是 `.toml` files，path 决定 command name：`.gemini/commands/git/commit.toml` 变成 `/git:commit`。这能干净映射 Claude Code 的 colon-namespaced commands（`workflows:plan` -> `.gemini/commands/workflows/plan.toml`）。

**3. Commands 使用 `{{args}}` placeholder**

Gemini 的 TOML commands 支持 `{{args}}` 做 argument injection，对应 Claude Code 的 `argument-hint` field。带 `argument-hint` 的 commands 会把 `{{args}}` append 到 prompt。

**4. MCP servers 写入 project-level settings.json**

Gemini CLI 从 `.gemini/settings.json` 的 `mcpServers` key 读取 MCP config。format compatible -- 同样的 `command`、`args`、`env` fields，外加 Gemini-specific `cwd`、`timeout`、`trust`、`includeTools`、`excludeTools`。

**5. Skills 原样透传**

Gemini 采用同一 SKILL.md standard（YAML frontmatter with `name` and `description`, markdown body）。Skills 直接 copy。

### TOML Command Format（命令格式）

```toml
description = "Brief description of the command"
prompt = """
The prompt content that will be sent to Gemini.

User request: {{args}}
"""
```

- `description`（string）：`/help` 中展示的一行 description
- `prompt`（string）：发送给 model 的 prompt；支持 `{{args}}`、`!{shell}`、`@{file}` placeholders

### Skill（SKILL.md）Format（格式）

```yaml
---
name: skill-name
description: 说明 Gemini 应该何时以及如何使用此 skill
---

# Skill Title

Detailed instructions...
```

与 Claude Code format 完全相同。`description` field 很关键 -- Gemini 用它决定何时 activate the skill。

### MCP Server Format（MCP server 格式，settings.json）

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": { "KEY": "value" }
    }
  }
}
```

## 验收标准

- [x] `bun run src/index.ts convert --to gemini ./plugins/compound-engineering` 产生 valid Gemini config
- [x] Agents 转换为 `.gemini/skills/*/SKILL.md`，frontmatter 中填充 `description`
- [x] Commands 转换为 `.gemini/commands/*.toml`，包含 `prompt` 和 `description` fields
- [x] Namespaced commands 创建 directory structure（`workflows:plan` -> `commands/workflows/plan.toml`）
- [x] 带 `argument-hint` 的 commands 在 prompt 中包含 `{{args}}` placeholder
- [x] 带 `disable-model-invocation: true` 的 commands 仍被包含（TOML commands 是 prompts，不是 code）
- [x] Skills copy 到 `.gemini/skills/`（identical format）
- [x] MCP servers 写入 `.gemini/settings.json` 的 `mcpServers` key
- [x] Existing `.gemini/settings.json` 在 overwrite 前备份，且 MCP config 被 merged（not clobbered）
- [x] Content transformation 将 `.claude/` 和 `~/.claude/` paths 重写为 `.gemini/` 和 `~/.gemini/`
- [x] `/workflows:plan` 转换为 `/workflows:plan`（Gemini 通过 directories 保留 colon namespacing）
- [x] `Task agent-name(args)` 转换为 `Use the agent-name skill to: args`
- [x] 带 hooks 的 plugins emit `console.warn` 提醒 format differences
- [x] Writer 不会 double-nest `.gemini/.gemini/`
- [x] `model` 和 `allowedTools` fields 被静默丢弃（skills/commands 中没有 Gemini equivalent）
- [x] Converter 和 writer tests pass
- [x] Existing tests 仍 pass（`bun test`）

## 实施

### 阶段 1：Types

**创建 `src/types/gemini.ts`**

```typescript
export type GeminiSkill = {
  name: string
  content: string // Full SKILL.md with YAML frontmatter
}

export type GeminiSkillDir = {
  name: string
  sourceDir: string
}

export type GeminiCommand = {
  name: string       // e.g. "plan" or "workflows/plan"
  content: string    // Full TOML content
}

export type GeminiBundle = {
  generatedSkills: GeminiSkill[]     // From agents
  skillDirs: GeminiSkillDir[]         // From skills (pass-through)
  commands: GeminiCommand[]
  mcpServers?: Record<string, {
    command?: string
    args?: string[]
    env?: Record<string, string>
    url?: string
    headers?: Record<string, string>
  }>
}
```

### 阶段 2：Converter

**创建 `src/converters/claude-to-gemini.ts`**

核心函数：

1. **`convertClaudeToGemini(plugin, options)`** -- main entry point（主入口）
   - 通过 `convertAgentToSkill()` 将每个 agent 转换为 skill
   - 通过 `convertCommand()` 转换每个 command
   - 将 skills 作为 directory references 透传
   - 将 MCP servers 转换为 settings-compatible object
   - 如果 `plugin.hooks` 有 entries，则 emit `console.warn`

2. **`convertAgentToSkill(agent)`** -- agent -> SKILL.md（agent 转 SKILL.md）
   - Frontmatter：`name`（from agent name）、`description`（from agent description, max ~300 chars，最多约 300 chars）
   - Body：应用 content transformations 后的 agent body
   - 如果存在 capabilities section，则 prepend
   - 静默丢弃 `model` field（no Gemini equivalent）
   - 如果 description 为空，根据 agent name 生成：`"Use this skill for ${agent.name} tasks"`

3. **`convertCommand(command, usedNames)`** -- command -> TOML file（command 转 TOML file）
   - 保留 namespace structure：`workflows:plan` -> path `workflows/plan`
   - `description` field 来自 command description
   - `prompt` field 来自经过 content transformations 的 command body
   - 如果 command 有 `argument-hint`，将 `\n\nUser request: {{args}}` append 到 prompt
   - Body：应用 `transformContentForGemini()` transformations
   - 静默丢弃 `allowedTools`（no Gemini equivalent）

4. **`transformContentForGemini(body)`** -- content rewriting（内容重写）
   - `.claude/` -> `.gemini/` and `~/.claude/` -> `~/.gemini/`
   - `Task agent-name(args)` -> `Use the agent-name skill to: args`
   - `@agent-name` references -> `the agent-name skill`
   - 跳过 file paths（containing `/`）和 common non-command patterns

5. **`convertMcpServers(servers)`** -- MCP config（MCP config 转换）
   - 将每个 `ClaudeMcpServer` entry map 到 Gemini-compatible JSON
   - 透传：`command`、`args`、`env`、`url`、`headers`
   - 丢弃 `type` field（Gemini infers transport）

6. **`toToml(description, prompt)`** -- TOML serializer（TOML 序列化器）
   - 正确 escape TOML strings
   - prompt field 使用 multi-line strings（`"""`）
   - description 使用 simple string

### 阶段 3：Writer

**创建 `src/targets/gemini.ts`**

Output structure（输出结构）：

```
.gemini/
├── commands/
│   ├── plan.toml
│   └── workflows/
│       └── plan.toml
├── skills/
│   ├── agent-name-1/
│   │   └── SKILL.md
│   ├── agent-name-2/
│   │   └── SKILL.md
│   └── original-skill/
│       └── SKILL.md
└── settings.json          (only mcpServers key)
```

核心函数：`writeGeminiBundle(outputRoot, bundle)`

- `resolveGeminiPaths(outputRoot)` -- detect if path already ends in `.gemini` to avoid double-nesting（follow droid writer pattern）
- 将 generated skills 写入 `skills/<name>/SKILL.md`
- 通过 `copyDir()` 将 original skill directories copy 到 `skills/`
- 将 commands 作为 `.toml` files 写入 `commands/`，为 namespaced commands 创建 subdirectories
- 通过 `writeJson()` 写入带 `{ "mcpServers": {...} }` 的 `settings.json`，并对 existing files 使用 `backupFile()`
- 如果 settings.json 已存在，先读取并 merge `mcpServers` key（don't clobber other settings）

### 阶段 4：接入 CLI

**修改 `src/targets/index.ts`**

```typescript
import { convertClaudeToGemini } from "../converters/claude-to-gemini"
import { writeGeminiBundle } from "./gemini"
import type { GeminiBundle } from "../types/gemini"

// Add to targets:
gemini: {
  name: "gemini",
  implemented: true,
  convert: convertClaudeToGemini as TargetHandler<GeminiBundle>["convert"],
  write: writeGeminiBundle as TargetHandler<GeminiBundle>["write"],
},
```

**修改 `src/commands/convert.ts`**

- 更新 `--to` description：`"Target format (opencode | codex | droid | cursor | pi | gemini)"`
- 添加到 `resolveTargetOutputRoot`：`if (targetName === "gemini") return path.join(outputRoot, ".gemini")`

**修改 `src/commands/install.ts`**

- 与 convert.ts 相同的两处修改

### 阶段 5：Tests（测试）

**创建 `tests/gemini-converter.test.ts`**

测试场景（使用 inline `ClaudePlugin` fixtures，遵循 existing converter test patterns）：

- Agent 转换为带 SKILL.md frontmatter 的 skill（填充 `name` 和 `description`）
- Empty description 的 agent 获得 default description text
- 带 capabilities 的 agent 会将其 prepend 到 body
- Agent `model` field 被静默丢弃
- Empty body 的 agent 获得 default body text
- Command 转换为带 `prompt` 和 `description` fields 的 TOML
- Namespaced command 创建正确 path（`workflows:plan` -> `workflows/plan`）
- 带 `disable-model-invocation` 的 command 仍被包含
- Command `allowedTools` 被静默丢弃
- 带 `argument-hint` 的 command 在 prompt 中获得 `{{args}}` placeholder
- Skills 作为 directory references 透传
- MCP servers 转换为 settings.json-compatible config
- Content transformation（内容转换）：`.claude/` paths -> `.gemini/`
- Content transformation（内容转换）：`~/.claude/` paths -> `~/.gemini/`
- Content transformation（内容转换）：`Task agent(args)` -> natural language skill reference（自然语言 skill reference）
- Hooks present -> emit `console.warn`（存在 hooks 时输出 `console.warn`）
- Zero agents 的 plugin 产生 empty generatedSkills array
- 只有 skills 的 plugin 正确工作
- TOML output valid（TOML 输出有效，description and prompt properly escaped）

**创建 `tests/gemini-writer.test.ts`**

测试场景（使用 temp directories，遵循 existing writer test patterns）：

- Full bundle 写入 skills、commands、settings.json
- Generated skills 写入 `skills/<name>/SKILL.md`
- Original skills copy 到 `skills/` directory
- Commands 作为 `.toml` files 写入 `commands/` directory
- Namespaced commands 创建 subdirectories（`commands/workflows/plan.toml`）
- MCP config 作为带 `mcpServers` key 的 valid JSON `settings.json` 写入
- Existing `settings.json` 在 overwrite 前备份
- 已以 `.gemini` 结尾的 output root 不会 double-nest
- Empty bundle 不产生 output

### 阶段 6：Documentation（文档）

**创建 `docs/specs/gemini.md`**

按照 existing `docs/specs/codex.md` pattern，将 Gemini CLI spec 记录为 reference：

- GEMINI.md context file format（GEMINI.md context file 格式）
- Custom commands format（custom commands 格式，TOML with `prompt`, `description`）
- Skills format（skills 格式，identical SKILL.md standard）
- MCP server configuration（MCP server 配置，`settings.json`）
- Extensions system（仅作参考，不转换）
- Hooks system（仅作参考，记录 format differences）
- Config file locations（config file 位置，user-level `~/.gemini/` vs project-level `.gemini/`）
- Directory layout conventions（目录布局约定）

**更新 `README.md`**

在 CLI usage section 中把 `gemini` 加入 supported targets。

## 不做什么

- 不转换 hooks（Gemini 有 hooks 但 format 不同：`BeforeTool`/`AfterTool` with matchers；warn and skip）
- 不生成 full `settings.json`（only `mcpServers` key；user-specific settings like `model`, `tools.sandbox` are out of scope）
- 不创建 extensions（extension format 用于 distributing packages，不用于 converted plugins）
- 不在 converted commands 中使用 `@{file}` 或 `!{shell}` placeholders（需要分析 command intent）
- 不转换 copied SKILL.md files 内部内容（known limitation -- skills 可能内部引用 `.claude/` paths）
- 不在写入前清理 old output（matches existing target behavior）
- 除 `mcpServers` key 外，不 intelligent merge existing settings.json（修改 user config 风险太高）

## 复杂度评估

这是一个 **medium change**。converter architecture 已有五个 targets，因此主要是 pattern-following。关键新点是：

1. TOML command format（所有 targets 中独有 -- 需要 simple TOML serializer）
2. Agents 映射为 skills，而不是 direct 1:1 concept（但这与 codex pattern 相同）
3. Namespaced commands 使用 directory structure（不同于 cursor/codex 的 flattening）
4. MCP config 写入 broader `settings.json` file（需要 merge, not clobber）

Skills 在各平台格式相同，显著简化工作。TOML serialization 也很简单（只有两个 fields：`description` string 和 `prompt` multi-line string）。

## 参考

- [Gemini CLI Repository](https://github.com/google-gemini/gemini-cli)（Gemini CLI 仓库）
- [Gemini CLI Configuration](https://geminicli.com/docs/get-started/configuration/)（Gemini CLI 配置）
- [Custom Commands (TOML)](https://geminicli.com/docs/cli/custom-commands/)（Custom Commands，custom commands 文档）
- [Agent Skills](https://geminicli.com/docs/cli/skills/)（Agent Skills，agent skills 文档）
- [Creating Skills](https://geminicli.com/docs/cli/creating-skills/)（Creating Skills，创建 skills 文档）
- [Extensions](https://geminicli.com/docs/extensions/writing-extensions/)（Extensions，extensions 文档）
- [MCP Servers](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)（MCP Servers，MCP servers 文档）
- 现有 cursor plan：`docs/plans/2026-02-12-feat-add-cursor-cli-target-provider-plan.md`
- 现有 codex converter：`src/converters/claude-to-codex.ts`（has `uniqueName()` and skill generation patterns）
- 现有 droid writer：`src/targets/droid.ts`（has double-nesting guard pattern）
- Target registry（target registry，target 注册表）：`src/targets/index.ts`

## 完成摘要

### 已交付内容
- [x] 阶段 1：Types（`src/types/gemini.ts`）
- [x] 阶段 2：Converter（`src/converters/claude-to-gemini.ts`）
- [x] 阶段 3：Writer（`src/targets/gemini.ts`）
- [x] 阶段 4：CLI wiring（`src/targets/index.ts`, `src/commands/convert.ts`, `src/commands/install.ts`）
- [x] 阶段 5：Tests（`tests/gemini-converter.test.ts`, `tests/gemini-writer.test.ts`）
- [x] 阶段 6：Documentation（`docs/specs/gemini.md`, `README.md`）

### 实施统计
- 10 个 files changed
- 新增 27 个 tests（总计 129，全部 passing）
- 从 compound-engineering plugin conversion 生成 148 个 output files
- 新增 0 个 dependencies

### Git Commits（Git 提交）
- `201ad6d` feat(gemini): add Gemini CLI as sixth target provider
- `8351851` docs: add Gemini CLI spec and update README with gemini target

### 完成详情
- **Completed By（完成人）：** Claude Opus 4.6
- **Date（日期）：** 2026-02-14
- **Session（会话）：** Single session
