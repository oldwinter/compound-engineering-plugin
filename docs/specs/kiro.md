# Kiro CLI Spec（Kiro CLI 规格：Custom Agents、Skills、Steering、MCP、Settings）

最后验证：2026-02-17

## 主要来源

```
https://kiro.dev/docs/cli/
https://kiro.dev/docs/cli/custom-agents/configuration-reference/
https://kiro.dev/docs/cli/skills/
https://kiro.dev/docs/cli/steering/
https://kiro.dev/docs/cli/mcp/
https://kiro.dev/docs/cli/hooks/
https://agentskills.io
```

## Config 位置

- Project-level config：project root 下的 `.kiro/` directory。
- 没有 global/user-level config directory——所有 config 都是 project-scoped。

## 目录结构

```
.kiro/
├── agents/
│   ├── <name>.json              # Agent configuration
│   └── prompts/
│       └── <name>.md            # Agent prompt files
├── skills/
│   └── <name>/
│       └── SKILL.md             # Skill definition
├── steering/
│   └── <name>.md                # Always-on context files
└── settings/
    └── mcp.json                 # MCP server configuration
```

## Custom agents（custom agents，JSON config + prompt files，prompt 文件）

- Custom agents 是 `.kiro/agents/` 中的 JSON files。
- 每个 agent 都有对应 prompt `.md` file，通过 `file://` URI 引用。
- Agent config 有 14 个 possible fields（见下方）。
- Agents 由 user selection 激活（没有 auto-activation）。
- converter 输出与 converted plugins 相关的 fields 子集。

### Agent config fields（agent config 字段）

| Field | Type | Used in conversion | Notes（说明） |
|---|---|---|---|
| `name` | string | Yes | Agent display name |
| `description` | string | Yes | Human-readable description |
| `prompt` | string or `file://` URI | Yes | System prompt or file reference |
| `tools` | string[] | Yes (`["*"]`) | Available tools |
| `resources` | string[] | Yes | `file://`, `skill://`, `knowledgeBase` URIs |
| `includeMcpJson` | boolean | Yes (`true`) | Inherit project MCP servers |
| `welcomeMessage` | string | Yes | Agent switch greeting |
| `mcpServers` | object | No | Per-agent MCP config (use includeMcpJson instead) |
| `toolAliases` | Record | No | Tool name remapping |
| `allowedTools` | string[] | No | Auto-approve patterns |
| `toolsSettings` | object | No | Per-tool configuration |
| `hooks` | object | No (future work) | 5 trigger types |
| `model` | string | No | Model selection |
| `keyboardShortcut` | string | No | Quick-switch shortcut |

### Agent config 示例

```json
{
  "name": "security-reviewer",
  "description": "Reviews code for security vulnerabilities",
  "prompt": "file://./prompts/security-reviewer.md",
  "tools": ["*"],
  "resources": [
    "file://.kiro/steering/**/*.md",
    "skill://.kiro/skills/**/SKILL.md"
  ],
  "includeMcpJson": true,
  "welcomeMessage": "Switching to security-reviewer. Reviews code for security vulnerabilities"
}
```

## Skills（SKILL.md standard，SKILL.md 标准）

- Skills 遵循 open [Agent Skills](https://agentskills.io) standard。
- skill 是包含 `SKILL.md` 以及 optional supporting files 的 folder。
- Skills 位于 `.kiro/skills/`。
- `SKILL.md` 使用 YAML frontmatter，包含 `name` 和 `description` fields。
- Kiro 根据 description matching 按需激活 skills。
- `description` field 很关键——Kiro 用它决定何时 activate skill。

### 约束

- Skill name：最多 64 characters，pattern `^[a-z][a-z0-9-]*$`，不能有 consecutive hyphens（`--`）。
- Skill description：最多 1024 characters。
- Skill name 必须匹配 parent directory name。

### 示例

```yaml
---
name: workflows-plan
description: 通过分析 requirements 并创建 actionable steps 来规划 work
---

# Planning Workflow

Detailed instructions...
```

## Steering files（steering 文件）

- 位于 `.kiro/steering/` 的 Markdown files。
- 始终加载进每个 agent session 的 context。
- 等同于 Claude-oriented workflows 使用的 repo instruction file；在此 repo 中，`AGENTS.md` 是 canonical，`CLAUDE.md` 可能只作为 compatibility shim 存在。
- 用于 project-wide instructions、coding standards 和 conventions。

## MCP server configuration（MCP server 配置）

- MCP servers 配置在 `.kiro/settings/mcp.json`。
- **只支持 stdio transport**——`command` + `args` + `env`。
- Kiro CLI 不支持 HTTP/SSE transport（`url`、`headers`）。
- converter 会跳过 HTTP-only MCP servers，并发出 warning。

### 示例

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    }
  }
}
```

## Hooks（hooks，钩子）

- Kiro 支持 5 种 hook trigger types：`agentSpawn`、`userPromptSubmit`、`preToolUse`、`postToolUse`、`stop`。
- Hooks 配置在 agent JSON configs 内（不是 separate files）。
- 5 个 triggers 中有 3 个可映射到 Claude Code hooks（`preToolUse`、`postToolUse`、`stop`）。
- MVP 中 plugin converter 不转换它们——会发出 warning。

## Conversion lossy mappings（有损转换映射）

| Claude Code Feature | Kiro Status | Notes（说明） |
|---|---|---|
| `Edit` tool (surgical replacement) | Degraded -> `write` (full-file) | Kiro write overwrites entire files |
| `context: fork` | Lost | No execution isolation control |
| `!`command`` dynamic injection | Lost | No pre-processing of markdown |
| `disable-model-invocation` | Lost | No invocation control |
| `allowed-tools` per skill | Lost | No tool permission scoping per skill |
| `$ARGUMENTS` interpolation | Lost | No structured argument passing |
| Claude hooks | Skipped | Future follow-up (near-1:1 for 3/5 triggers) |
| HTTP MCP servers | Skipped | Kiro only supports stdio transport |

## 转换期间的覆盖行为

| Content Type | Strategy | Rationale（理由） |
|---|---|---|
| Generated agents (JSON + prompt) | Overwrite | Generated, not user-authored |
| Generated skills (from commands) | Overwrite | Generated, not user-authored |
| Copied skills (pass-through) | Overwrite | Plugin is source of truth |
| Steering files | Overwrite | Generated from `AGENTS.md` when present, otherwise `CLAUDE.md` |
| `mcp.json` | Merge with backup | User may have added their own servers |
| User-created agents/skills | Preserved | Don't delete orphans |
