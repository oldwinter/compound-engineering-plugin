---
title: 将 Cursor CLI 添加为 Target Provider
type: feat
date: 2026-02-12
---

# 将 Cursor CLI 添加为 Target Provider

## 概览

在 converter CLI 中添加 `cursor` 作为第四个 target provider，与 `opencode`、`codex` 和 `droid` 并列。这样 `convert` 和 `install` 命令都可以使用 `--to cursor`，把 Claude Code plugins 转换为 Cursor-compatible format。

Cursor CLI（`cursor-agent`）于 2025 年 8 月发布，支持 rules（`.mdc`）、commands（`.md`）、skills（`SKILL.md` standard）和 MCP servers（`.cursor/mcp.json`）。由于 Cursor 采用了开放的 SKILL.md standard，并且 command format 类似，从 Claude Code 到 Cursor 的映射相对直接。

## 组件映射

| Claude Code | Cursor 等价物 | 说明 |
|---|---|---|
| `agents/*.md` | `.cursor/rules/*.mdc` | Agents 转为 "Agent Requested" rules（`alwaysApply: false`，设置 `description`），让 AI 按需激活，而不是塞满 context |
| `commands/*.md` | `.cursor/commands/*.md` | 普通 markdown 文件；Cursor commands 不支持 frontmatter -- description 转为 markdown heading |
| `skills/*/SKILL.md` | `.cursor/skills/*/SKILL.md` | **标准完全相同** -- 直接 copy |
| MCP servers | `.cursor/mcp.json` | 相同 JSON structure（`mcpServers` key），format compatible |
| `hooks/` | No equivalent | Cursor 没有 hook system；emit `console.warn` 并 skip |
| `.claude/` paths | `.cursor/` paths | 需要 content rewriting |

### 关键设计决策

**1. Agents 使用 `alwaysApply: false`（Agent Requested mode）**

如果 29 个 agents 都设置 `alwaysApply: true`，每个 Cursor session 的 context 都会被淹没。因此 agents 会变成 "Agent Requested" rules：`alwaysApply: false`，并填充 `description` field。Cursor 的 AI 会读取 description，只在相关时激活 rule -- 这与 Claude Code agents 的按需调用方式匹配。

**2. Commands 是 plain markdown（无 frontmatter）**

Cursor commands（`.cursor/commands/*.md`）是简单 markdown 文件，filename 会成为 command name。与 Claude Code commands 不同，它们不支持 YAML frontmatter。converter 会把 description 作为前置 markdown comment 输出，然后输出 command body。

**3. Flattened command names 并进行 deduplication**

Cursor 使用 flat command names（无 namespaces）。`workflows:plan` 会变成 `plan`。如果两个 commands flatten 后同名，则复用 codex converter 的 `uniqueName()` pattern，追加 `-2`、`-3` 等后缀。

### Rules (`.mdc`) Frontmatter Format（frontmatter 格式）

```yaml
---
description: "What this rule does and when it applies"
globs: ""
alwaysApply: false
---
```

- `description`（string）：AI 用它判断相关性 -- 从 agent `description` 映射
- `globs`（string）：逗号分隔的 file patterns，用于 auto-attachment -- converted agents 留空
- `alwaysApply`（boolean）：Agent Requested mode 下设置为 `false`

### MCP Servers (`.cursor/mcp.json`)（MCP servers 配置）

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

支持 local（command-based）和 remote（url-based）servers。remote servers 的 `headers` pass through。

## 验收标准

- [x] `bun run src/index.ts convert --to cursor ./plugins/compound-engineering` 生成 valid Cursor config
- [x] Agents 转为 `.cursor/rules/*.mdc`，包含 `alwaysApply: false` 和 populated `description`
- [x] Commands 转为 `.cursor/commands/*.md` plain markdown（无 frontmatter）
- [x] Flattened command names 发生冲突时会 deduplicate（`plan`、`plan-2` 等）
- [x] Skills copied to `.cursor/skills/`（format identical，格式相同）
- [x] MCP servers 写入 `.cursor/mcp.json`，并 backup existing file
- [x] Content transformation 将 `.claude/` 和 `~/.claude/` paths rewrite 为 `.cursor/` 和 `~/.cursor/`
- [x] `/workflows:plan` 转换为 `/plan`（flat command names）
- [x] `Task agent-name(args)` 转换为 natural-language skill reference
- [x] 带 hooks 的 plugins 会 emit `console.warn` 提示 unsupported hooks
- [x] Writer 不会 double-nest `.cursor/.cursor/`（遵循 droid writer pattern）
- [x] `model` 和 `allowedTools` fields silently dropped（无 Cursor equivalent）
- [x] Converter and writer tests pass（converter 和 writer tests 通过）
- [x] Existing tests still pass（existing tests 仍通过，`bun test`）

## 实现

### 阶段 1：Types

**创建 `src/types/cursor.ts`**

```typescript
export type CursorRule = {
  name: string
  content: string  // Full .mdc file with YAML frontmatter
}

export type CursorCommand = {
  name: string
  content: string  // Plain markdown (no frontmatter)
}

export type CursorSkillDir = {
  name: string
  sourceDir: string
}

export type CursorBundle = {
  rules: CursorRule[]
  commands: CursorCommand[]
  skillDirs: CursorSkillDir[]
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

**创建 `src/converters/claude-to-cursor.ts`**

核心函数：

1. **`convertClaudeToCursor(plugin, options)`** -- main entry point（主入口）
   - 通过 `convertAgentToRule()` 将每个 agent 转换为 `.mdc` rule
   - 通过 `convertCommand()` 转换每个 command（包括 `disable-model-invocation` commands）
   - 将 skills 作为 directory references pass through
   - 将 MCP servers 转换为 JSON-compatible object
   - 如果 `plugin.hooks` 有 entries，则 emit `console.warn`

2. **`convertAgentToRule(agent, usedNames)`** -- agent -> `.mdc` rule（agent 转 rule）
   - Frontmatter fields（frontmatter 字段）: `description`（from agent description）、`globs: ""`、`alwaysApply: false`
   - Body：应用 content transformations 后的 agent body
   - 如存在 capabilities section，则 prepend
   - 通过 `uniqueName()` deduplicate names
   - Silently drop `model` field（无 Cursor equivalent）

3. **`convertCommand(command, usedNames)`** -- command -> plain `.md`（command 转纯 `.md`）
   - Flatten namespace（扁平化 namespace）：`workflows:plan` -> `plan`
   - 通过 `uniqueName()` deduplicate flattened names
   - 以 plain markdown 输出：description 作为 `<!-- description -->` comment，然后是 body
   - 如果存在 `argument-hint`，加入 `## Arguments` section
   - Body：应用 `transformContentForCursor()` transformations
   - Silently drop `allowedTools`（无 Cursor equivalent）

4. **`transformContentForCursor(body)`** -- content rewriting（内容重写）
   - `.claude/` -> `.cursor/` and `~/.claude/` -> `~/.cursor/`
   - `Task agent-name(args)` -> `Use the agent-name skill to: args`（same as codex）
   - `/workflows:command` -> `/command`（flatten slash commands）
   - `@agent-name` references -> `the agent-name rule`（use codex's suffix-matching pattern）
   - Skip file paths（包含 `/`）和常见 non-command patterns

5. **`convertMcpServers(servers)`** -- MCP config（MCP 配置）
   - 将每个 `ClaudeMcpServer` entry 映射为 Cursor-compatible JSON
   - Pass through（透传）: `command`、`args`、`env`、`url`、`headers`
   - Drop `type` field（丢弃 `type` field；Cursor infers transport from `command` vs `url`）

### 阶段 3：Writer

**创建 `src/targets/cursor.ts`**

Output structure（输出结构）:

```
.cursor/
├── rules/
│   ├── agent-name-1.mdc
│   └── agent-name-2.mdc
├── commands/
│   ├── command-1.md
│   └── command-2.md
├── skills/
│   └── skill-name/
│       └── SKILL.md
└── mcp.json
```

核心函数：`writeCursorBundle(outputRoot, bundle)`

- `resolveCursorPaths(outputRoot)` -- 检测 path 是否已经以 `.cursor` 结尾，避免 double-nesting（遵循 `src/targets/droid.ts:31-50` 的 droid writer pattern）
- 将 rules 作为 `.mdc` files 写入 `rules/`
- 将 commands 作为 `.md` files 写入 `commands/`
- 通过 `copyDir()` 将 skill directories 复制到 `skills/`
- 通过 `writeJson()` 写入 `mcp.json`，并用 `backupFile()` 备份 existing files

### 阶段 4：接入 CLI

**修改 `src/targets/index.ts`**

```typescript
import { convertClaudeToCursor } from "../converters/claude-to-cursor"
import { writeCursorBundle } from "./cursor"
import type { CursorBundle } from "../types/cursor"

// Add to targets:
cursor: {
  name: "cursor",
  implemented: true,
  convert: convertClaudeToCursor as TargetHandler<CursorBundle>["convert"],
  write: writeCursorBundle as TargetHandler<CursorBundle>["write"],
},
```

**修改 `src/commands/convert.ts`**

- 更新 `--to` description: `"Target format (opencode | codex | droid | cursor)"`
- 添加到 `resolveTargetOutputRoot`: `if (targetName === "cursor") return path.join(outputRoot, ".cursor")`

**修改 `src/commands/install.ts`**

- 与 convert.ts 相同的两处修改

### 阶段 5：Tests

**创建 `tests/cursor-converter.test.ts`**

测试用例（使用 inline `ClaudePlugin` fixtures，并遵循 codex converter test pattern）：

- Agent 转换为带 `.mdc` frontmatter 的 rule（`alwaysApply: false`，`description` populated）
- 空 description 的 agent 获得 default description text
- 带 capabilities 的 agent 会把 capabilities prepend 到 body
- Agent `model` field 被静默丢弃
- 空 body 的 agent 获得 default body text
- Command 转换时使用 flattened name（`workflows:plan` -> `plan`）
- Flattening 后的 command name collision 会被 deduplicate（`plan`、`plan-2`）
- 带 `disable-model-invocation` 的 command 仍会 included
- Command `allowedTools` 被静默丢弃
- 带 `argument-hint` 的 command 获得 Arguments section
- Skills 作为 directory references 透传
- MCP servers 转换为 JSON config（local and remote）
- remote servers 的 MCP `headers` pass through
- Content transformation（内容转换）：`.claude/` paths -> `.cursor/`
- Content transformation（内容转换）：`~/.claude/` paths -> `~/.cursor/`
- Content transformation（内容转换）：`Task agent(args)` -> natural language
- Content transformation（内容转换）：slash commands flattened
- 存在 hooks -> emit `console.warn`
- 零 agents 的 plugin 产生 empty rules array
- 只有 skills 的 plugin 能正确工作

**创建 `tests/cursor-writer.test.ts`**

测试用例（使用 temp directories，并遵循 droid writer test pattern）：

- Full bundle 写入 rules、commands、skills、mcp.json
- Rules 作为 `.mdc` files 写入 `rules/` directory
- Commands 作为 `.md` files 写入 `commands/` directory
- Skills 被复制到 `skills/` directory
- MCP config 写成 valid JSON `mcp.json`
- Existing `mcp.json` overwrite 前会备份
- 已经以 `.cursor` 结尾的 output root 不会 double-nest
- Empty bundle（no rules, commands, skills, or MCP）不产生 output

### 阶段 6：Documentation

**创建 `docs/specs/cursor.md`**

按照 `docs/specs/codex.md` pattern，记录 Cursor CLI spec 作为 reference：

- Rules format（带 `description`, `globs`, `alwaysApply` frontmatter 的 `.mdc`）
- Commands format（plain markdown, no frontmatter；纯 markdown，无 frontmatter）
- Skills format（identical SKILL.md standard；相同 SKILL.md standard）
- MCP server configuration（MCP server 配置：`.cursor/mcp.json`）
- CLI permissions（`.cursor/cli.json` -- for reference, not converted；仅供参考，不转换）
- Config file locations（project-level vs global；project-level 与 global）

**更新 `README.md`**

在 CLI usage section 中把 `cursor` 加入 supported targets。

## 不做什么

- 不转换 hooks（Cursor 没有 hook system -- warn and skip）
- 不生成 `.cursor/cli.json` permissions（user-specific, not plugin-scoped）
- 不创建 `AGENTS.md`（Cursor 会 natively read it，但它不属于 plugin conversion）
- 不智能使用 `globs` field（需要分析 agent content 来猜 file patterns）
- 不添加 sync support（follow-up task）
- 不转换 copied SKILL.md files 内部的内容（known limitation -- skills 可能在内部引用 `.claude/` paths）
- 不在写入前清理 old output（matches existing target behavior -- re-runs accumulate）

## 复杂度评估

这是一个 **medium change**。converter architecture 已经有三个现有 targets，因此主要是 follow pattern。关键新点是：

1. `.mdc` frontmatter format（不同于其他 targets）
2. Agents 映射为 "rules"，而不是 direct equivalent
3. Commands 是 plain markdown（no frontmatter），不同于其他 targets
4. flattened command namespaces 需要 name deduplication

Skills 在各平台格式相同，显著简化工作。MCP config 基本是 1:1。

## 参考资料

- Cursor Rules：带 `description`, `globs`, `alwaysApply` frontmatter 的 `.cursor/rules/*.mdc`
- Cursor Commands：`.cursor/commands/*.md`（plain markdown, no frontmatter；纯 markdown，无 frontmatter）
- Cursor Skills：`.cursor/skills/*/SKILL.md`（open standard, identical to Claude Code；开放标准，与 Claude Code 相同）
- Cursor MCP：带 `mcpServers` key 的 `.cursor/mcp.json`
- Cursor CLI：`cursor-agent` command（launched August 2025；2025 年 8 月发布）
- 现有 codex converter：`src/converters/claude-to-codex.ts`（包含 `uniqueName()` deduplication pattern）
- 现有 droid writer：`src/targets/droid.ts`（包含 double-nesting guard pattern）
- 现有 codex plan：`docs/plans/2026-02-08-feat-convert-local-md-settings-for-opencode-codex-plan.md`
- Target provider checklist：`AGENTS.md` section "Adding a New Target Provider"（新增 Target Provider 的 checklist）
