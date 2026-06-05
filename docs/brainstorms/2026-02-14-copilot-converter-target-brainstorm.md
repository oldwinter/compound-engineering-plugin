---
date: 2026-02-14
topic: copilot-converter-target
---

# 添加 GitHub Copilot Converter Target

## 我们要构建什么

一个新的 converter target，用于将 compound-engineering Claude Code plugin 转换为 GitHub Copilot 的 native format。它遵循现有 converters（Cursor、Codex、OpenCode、Droid、Pi）已经建立的同一 pattern，并输出 Copilot 可直接从 `.github/`（repo-level）或 `~/.copilot/`（user-wide）消费的文件。

Copilot 的 customization system（截至 2026 年初）支持：custom agents（`.agent.md`）、agent skills（`SKILL.md`）、prompt files（`.prompt.md`）、custom instructions（`copilot-instructions.md`）和 MCP servers（通过 repo settings）。

## 为什么采用这种方式

该 repository 已经有稳健的 multi-target converter infrastructure，并采用一致的 `TargetHandler` pattern。将 Copilot 作为新 target 添加，沿用这个已验证 pattern，而不是发明新体系。Copilot 的 format 与 Claude Code 足够接近，转换很直接，而且 SKILL.md format 已经 cross-compatible。

### 考虑过的方案

1. **Full converter target（已选）** — 遵循现有 pattern，包含 types、converter、writer 和 target registration。最符合 codebase conventions。
2. **Minimal agent-only converter** — 只转换 agents，跳过 commands/skills。过于有限；用户会失去 plugin 的大部分价值。
3. **Documentation-only approach** — 只记录如何手动设置 Copilot。无法 compound，每个用户都会重复这项工作。

## 关键决策

### Component Mapping（组件映射）

| Claude Code Component（Claude Code 组件） | Copilot Equivalent（Copilot 对应项） | Notes（说明） |
|----------------------|-------------------|-------|
| **Agents** (`.md`) | **Custom Agents** (`.agent.md`) | Full frontmatter mapping: description, tools, target, infer |
| **Commands** (`.md`) | **Agent Skills** (`SKILL.md`) | Commands become skills since Copilot has no direct command equivalent. `allowed-tools` dropped silently. |
| **Skills** (`SKILL.md`) | **Agent Skills** (`SKILL.md`) | Copy as-is — format is already cross-compatible |
| **MCP Servers** | **Repo settings JSON** | Generate a `copilot-mcp-config.json` users paste into GitHub repo settings |
| **Hooks** | **Skipped with warning** | Copilot doesn't have a hooks equivalent |

### Agent Frontmatter Mapping（Agent Frontmatter 映射）

| Claude Field（Claude 字段） | Copilot Field（Copilot 字段） | Mapping（映射） |
|-------------|--------------|---------|
| `name` | `name` | Direct pass-through |
| `description` | `description` (required) | Direct pass-through, generate fallback if missing |
| `capabilities` | Body text | Fold into body as "## Capabilities" section (like Cursor) |
| `model` | `model` | Pass through (works in IDE, may be ignored on github.com) |
| — | `tools` | Default to `["*"]` (all tools). Claude agents have unrestricted tool access, so Copilot agents should too. |
| — | `target` | Omit (defaults to `both` — IDE + github.com) |
| — | `infer` | Set to `true` (auto-selection enabled) |

### Output Directories（输出目录）

- **Repository-level（默认）：** `.github/agents/`、`.github/skills/`
- **User-wide（带 --personal flag）：** `~/.copilot/skills/`（该层级只支持 skills）

### Content Transformation（内容转换）

应用类似 Cursor converter 的 transformations：

1. **Task agent calls（Task agent 调用）:** `Task agent-name(args)` → `Use the agent-name skill to: args`
2. **Slash commands（slash commands）:** `/workflows:plan` → `/plan`（flatten namespace）
3. **Path rewriting（路径重写）:** `.claude/` → `.github/`（Copilot 的 repo-level config path）
4. **Agent references（agent 引用）:** `@agent-name` → `the agent-name agent`

### MCP Server Handling（MCP server 处理）

生成 Copilot 期望结构的 `copilot-mcp-config.json` 文件：

```json
{
  "mcpServers": {
    "server-name": {
      "type": "local",
      "command": "npx",
      "args": ["package"],
      "tools": ["*"],
      "env": {
        "KEY": "COPILOT_MCP_KEY"
      }
    }
  }
}
```

注意：Copilot 要求 env vars 使用 `COPILOT_MCP_` 前缀。converter 应相应转换 env var names，并包含相关 comment/note。

## 待创建/修改文件

### 新文件

- `src/types/copilot.ts` — Type definitions（CopilotAgent、CopilotSkill、CopilotBundle 等）
- `src/converters/claude-to-copilot.ts` — 带 `transformContentForCopilot()` 的 Converter
- `src/targets/copilot.ts` — 带 `writeCopilotBundle()` 的 Writer
- `docs/specs/copilot.md` — Format specification document（格式规范文档）

### 修改文件

- `src/targets/index.ts` — 注册 copilot target handler
- `src/commands/sync.ts` — 将 "copilot" 添加到 valid sync targets

### 测试文件

- `tests/copilot-converter.test.ts` — 遵循 existing patterns 的 Converter tests

### Character Limit（字符限制）

Copilot 对 agent body content 施加 30,000 字符限制。如果 agent body 在 folding in capabilities 后超过该限制，converter 应截断并向 stderr 输出 warning。

### Agent File Extension（Agent 文件扩展名）

使用 `.agent.md`（不是普通 `.md`）。这是 canonical Copilot convention，并让 agent files 可立即识别。

## 未决问题

- converter 是否应为需要特殊 dependencies（例如 `uv`、`pipx`）的 MCP servers 生成 `copilot-setup-steps.yml` workflow file？
- 是否应生成带有 plugin base instructions 的 `.github/copilot-instructions.md`？

## 下一步

→ `/workflows:plan` for implementation details（查看实现细节）
