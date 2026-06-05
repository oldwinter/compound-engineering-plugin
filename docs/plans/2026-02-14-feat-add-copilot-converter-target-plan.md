---
title: "feat: 添加 GitHub Copilot converter target"
type: feat
date: 2026-02-14
status: complete
---

# feat: 添加 GitHub Copilot converter target

## 概览

按照既有 `TargetHandler` pattern 添加 GitHub Copilot 作为 converter target。它会把 compound-engineering Claude Code plugin 转换为 Copilot 的 native format：custom agents（`.agent.md`）、agent skills（`SKILL.md`）和 MCP server configuration JSON。

**Brainstorm 来源：** `docs/brainstorms/2026-02-14-copilot-converter-target-brainstorm.md`

## 问题陈述

CLI tool（`compound`）已经支持将 Claude Code plugins 转换为 5 种 target formats（OpenCode、Codex、Droid、Cursor、Pi）。GitHub Copilot 是广泛使用的 AI coding assistant，现在支持 custom agents、skills 和 MCP servers -- 但目前没有 converter target。

## 提议方案

严格遵循 existing converter pattern：

1. 定义 types（`src/types/copilot.ts`）
2. 实现 converter（`src/converters/claude-to-copilot.ts`）
3. 实现 writer（`src/targets/copilot.ts`）
4. 注册 target（`src/targets/index.ts`）
5. 添加 sync support（`src/sync/copilot.ts`, `src/commands/sync.ts`）
6. 编写 tests 和 documentation

### 组件映射

| Claude Code | Copilot | 输出路径 |
|-------------|---------|-------------|
| Agents (`.md`) | Custom Agents (`.agent.md`) | `.github/agents/{name}.agent.md` |
| Commands (`.md`) | Agent Skills (`SKILL.md`) | `.github/skills/{name}/SKILL.md` |
| Skills (`SKILL.md`) | Agent Skills (`SKILL.md`) | `.github/skills/{name}/SKILL.md` |
| MCP Servers | Config JSON | `.github/copilot-mcp-config.json` |
| Hooks | Skipped | Warning to stderr |

## 技术方案

### 阶段 1：Types

**文件：** `src/types/copilot.ts`

```typescript
export type CopilotAgent = {
  name: string
  content: string // Full .agent.md content with frontmatter
}

export type CopilotGeneratedSkill = {
  name: string
  content: string // SKILL.md content with frontmatter
}

export type CopilotSkillDir = {
  name: string
  sourceDir: string
}

export type CopilotMcpServer = {
  type: string
  command?: string
  args?: string[]
  url?: string
  tools: string[]
  env?: Record<string, string>
  headers?: Record<string, string>
}

export type CopilotBundle = {
  agents: CopilotAgent[]
  generatedSkills: CopilotGeneratedSkill[]
  skillDirs: CopilotSkillDir[]
  mcpConfig?: Record<string, CopilotMcpServer>
}
```

### 阶段 2：Converter

**文件：** `src/converters/claude-to-copilot.ts`

**Agent 转换：**
- Frontmatter: `description`（required，fallback 为 `"Converted from Claude agent {name}"`）、`tools: ["*"]`、`infer: true`
- 存在 `model` 时 pass through
- 将 `capabilities` fold into body as `## Capabilities` section（same as Cursor）
- 使用 `formatFrontmatter()` utility
- 如果 body exceeds 30,000 characters（`.length`），warn

**Command -> Skill 转换:**
- 转换为带 frontmatter 的 SKILL.md format：`name`, `description`
- Flatten namespaced names（扁平化 namespaced names）：`workflows:plan` -> `plan`
- 静默丢弃 `allowed-tools`、`model`、`disable-model-invocation`
- 将 `argument-hint` 作为 body 中的 `## Arguments` section

**Skill 透传:**
- 按原样 map to `CopilotSkillDir`（same as Cursor）

**MCP server 转换:**
- 转换 env var names: `API_KEY` -> `COPILOT_MCP_API_KEY`
- 跳过 already prefixed with `COPILOT_MCP_` 的 vars
- 为 command-based servers 添加 `type: "local"`，为 URL-based 添加 `type: "sse"`
- 为所有 servers 设置 `tools: ["*"]`

**Content transformation（内容转换，`transformContentForCopilot`）：**

| 模式 | 输入 | 输出 |
|---------|-------|--------|
| Task calls | `Task repo-research-analyst(desc)` | `Use the repo-research-analyst skill to: desc` |
| Slash commands | `/workflows:plan` | `/plan` |
| Path rewriting | `.claude/` | `.github/` |
| Home path rewriting | `~/.claude/` | `~/.copilot/` |
| Agent references | `@security-sentinel` | `the security-sentinel agent` |

**Hooks:** 如果存在则 warn to stderr 并 skip。

### 阶段 3：Writer

**文件：** `src/targets/copilot.ts`

**路径解析:**
- 如果 `outputRoot` basename 是 `.github`，直接写入其中（避免 `.github/.github/` double-nesting）
- 否则 nest under `.github/`

**写入操作:**
- Agents -> `.github/agents/{name}.agent.md`（注意：`.agent.md` extension）
- Generated skills（from commands，从 commands 生成）-> `.github/skills/{name}/SKILL.md`
- Skill dirs（skill 目录）-> `.github/skills/{name}/`（copy via `copyDir`）
- MCP config -> `.github/copilot-mcp-config.json`（用 `backupFile` backup existing）

### 阶段 4：Target 注册

**文件：** `src/targets/index.ts`

添加 import 并注册：

```typescript
import { convertClaudeToCopilot } from "../converters/claude-to-copilot"
import { writeCopilotBundle } from "./copilot"

// In targets record:
copilot: {
  name: "copilot",
  implemented: true,
  convert: convertClaudeToCopilot as TargetHandler<CopilotBundle>["convert"],
  write: writeCopilotBundle as TargetHandler<CopilotBundle>["write"],
},
```

### 阶段 5：Sync 支持

**文件：** `src/sync/copilot.ts`

遵循 Cursor sync pattern（`src/sync/cursor.ts`）:
- 使用 `forceSymlink` 将 skills symlink 到 `.github/skills/`
- 使用 `isValidSkillName` validate skill names
- 使用 `COPILOT_MCP_` prefix transformation 转换 MCP servers
- 将 MCP config merge 进 existing `.github/copilot-mcp-config.json`

**文件：** `src/commands/sync.ts`

- 将 `"copilot"` 添加到 `validTargets` array
- 在 `resolveOutputRoot()` 中添加 case: `case "copilot": return path.join(process.cwd(), ".github")`
- 为 `syncToCopilot` 添加 import 和 switch case
- 更新 meta description，包含 "Copilot"

### 阶段 6：Tests（测试）

**文件:** `tests/copilot-converter.test.ts`

测试场景（遵循 `tests/cursor-converter.test.ts` pattern）:

```
describe("convertClaudeToCopilot")
  ✓ converts agents to .agent.md with Copilot frontmatter
  ✓ agent description is required, fallback generated if missing
  ✓ agent with empty body gets default body
  ✓ agent capabilities are prepended to body
  ✓ agent model field is passed through
  ✓ agent tools defaults to ["*"]
  ✓ agent infer defaults to true
  ✓ warns when agent body exceeds 30k characters
  ✓ converts commands to skills with SKILL.md format
  ✓ flattens namespaced command names
  ✓ command name collision after flattening is deduplicated
  ✓ command allowedTools is silently dropped
  ✓ command with argument-hint gets Arguments section
  ✓ passes through skill directories
  ✓ skill and generated skill name collision is deduplicated
  ✓ converts MCP servers with COPILOT_MCP_ prefix
  ✓ MCP env vars already prefixed are not double-prefixed
  ✓ MCP servers get type field (local vs sse)
  ✓ warns when hooks are present
  ✓ no warning when hooks are absent
  ✓ plugin with zero agents produces empty agents array
  ✓ plugin with only skills works

describe("transformContentForCopilot")
  ✓ rewrites .claude/ paths to .github/
  ✓ rewrites ~/.claude/ paths to ~/.copilot/
  ✓ transforms Task agent calls to skill references
  ✓ flattens slash commands
  ✓ transforms @agent references to agent references
```

**文件:** `tests/copilot-writer.test.ts`

测试场景（遵循 `tests/cursor-writer.test.ts` pattern）:

```
describe("writeCopilotBundle")
  ✓ writes agents, generated skills, copied skills, and MCP config
  ✓ agents use .agent.md file extension
  ✓ writes directly into .github output root without double-nesting
  ✓ handles empty bundles gracefully
  ✓ writes multiple agents as separate .agent.md files
  ✓ backs up existing copilot-mcp-config.json before overwriting
  ✓ creates skill directories with SKILL.md
```

**文件:** `tests/sync-copilot.test.ts`

测试场景（遵循 `tests/sync-cursor.test.ts` pattern）:

```
describe("syncToCopilot")
  ✓ symlinks skills to .github/skills/
  ✓ skips skills with invalid names
  ✓ merges MCP config with existing file
  ✓ transforms MCP env var names to COPILOT_MCP_ prefix
  ✓ writes MCP config with restricted permissions (0o600)
```

### 阶段 7：Documentation（文档）

**文件：** `docs/specs/copilot.md`

遵循 `docs/specs/cursor.md` format：
- Last verified date（最后验证日期）
- Primary sources（主要来源，GitHub Docs URLs）
- Config locations table（config 位置表）
- Agents section（Agents 小节，`.agent.md` format, frontmatter fields）
- Skills section（Skills 小节，`SKILL.md` format）
- MCP section（MCP 小节，config structure, env var prefix requirement）
- Character limits（字符限制，30k agent body）

**文件：** `README.md`

- 将 "copilot" 添加到 supported targets 列表
- 添加 usage example: `compound convert --to copilot ./plugins/compound-engineering`
- 添加 sync example: `compound sync copilot`

## 验收标准

### Converter（转换器）
- [x] Agents 转换为 `.agent.md`，包含 `description`, `tools: ["*"]`, `infer: true`
- [x] 存在 Agent `model` 时 pass through
- [x] Agent `capabilities` fold into body as `## Capabilities`（折叠进 body）
- [x] 缺失 description 时生成 fallback
- [x] Empty body 生成 fallback
- [x] Body 超过 30k chars 时触发 stderr warning
- [x] Commands 转换为 SKILL.md format
- [x] Command names flatten（command names 扁平化，`workflows:plan` -> `plan`）
- [x] Name collisions 使用 `-2`, `-3` suffix 去重
- [x] Command `allowed-tools` silently dropped（静默丢弃）
- [x] Skills pass through as `CopilotSkillDir`（透传为 `CopilotSkillDir`）
- [x] MCP env vars prefixed with `COPILOT_MCP_`（添加 `COPILOT_MCP_` 前缀）
- [x] 已有 prefix 的 env vars 不会 double-prefix
- [x] MCP servers 获得 `type` field（`local` or `sse`）
- [x] Hooks 触发 warning 并 skip conversion
- [x] Content transformation（内容转换）：Task calls, slash commands, paths, @agent refs

### Writer（写入器）
- [x] Agents 写入 `.github/agents/{name}.agent.md`
- [x] Generated skills 写入 `.github/skills/{name}/SKILL.md`
- [x] Skill dirs copied to `.github/skills/{name}/`（skill dirs 复制到该路径）
- [x] MCP config 写入 `.github/copilot-mcp-config.json`
- [x] overwrite 前 backup existing MCP config
- [x] outputRoot 是 `.github` 时不 double-nesting
- [x] Empty bundles handled gracefully（优雅处理 empty bundles）

### CLI 集成
- [x] `compound convert --to copilot` works（可用）
- [x] `compound sync copilot` works（可用）
- [x] Copilot registered in `src/targets/index.ts`（已注册）
- [x] Sync 将 output resolve 到 current directory 的 `.github/`

### Tests（测试）
- [x] `tests/copilot-converter.test.ts` -- all converter tests pass（converter tests 全部通过）
- [x] `tests/copilot-writer.test.ts` -- all writer tests pass（writer tests 全部通过）
- [x] `tests/sync-copilot.test.ts` -- all sync tests pass（sync tests 全部通过）

### Documentation（文档）
- [x] `docs/specs/copilot.md` -- format specification（格式规格）
- [x] `README.md` -- updated with copilot target（已更新 copilot target）

## 需新增文件

| 文件 | 用途 |
|------|---------|
| `src/types/copilot.ts` | Type definitions |
| `src/converters/claude-to-copilot.ts` | Converter 逻辑 |
| `src/targets/copilot.ts` | Writer 逻辑 |
| `src/sync/copilot.ts` | Sync handler |
| `tests/copilot-converter.test.ts` | Converter tests |
| `tests/copilot-writer.test.ts` | Writer tests |
| `tests/sync-copilot.test.ts` | Sync tests |
| `docs/specs/copilot.md` | Format specification |

## 需修改文件

| 文件 | 变更 |
|------|--------|
| `src/targets/index.ts` | Register copilot target |
| `src/commands/sync.ts` | Add copilot to valid targets, output root, switch case |
| `README.md` | Add copilot to supported targets |

## 参考

- [Custom agents configuration - GitHub Docs](https://docs.github.com/en/copilot/reference/custom-agents-configuration)（GitHub Docs）
- [About Agent Skills - GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/about-agent-skills)（GitHub Docs）
- [MCP and coding agent - GitHub Docs](https://docs.github.com/en/copilot/concepts/agents/coding-agent/mcp-and-coding-agent)（GitHub Docs）
- 现有 converter：`src/converters/claude-to-cursor.ts`
- 现有 writer：`src/targets/cursor.ts`
- 现有 sync：`src/sync/cursor.ts`
- 现有 tests：`tests/cursor-converter.test.ts`, `tests/cursor-writer.test.ts`
