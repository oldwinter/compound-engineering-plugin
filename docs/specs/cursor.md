# Cursor Spec（Cursor 规格：Plugin Marketplace、Rules、Commands、Skills、MCP）

最后验证：2026-02-12

## 主要来源

```
https://docs.cursor.com/context/rules
https://docs.cursor.com/context/rules-for-ai
https://docs.cursor.com/customize/model-context-protocol
```

## Plugin Marketplace（Plugin 市场）

Compound Engineering 通过 Cursor Plugin Marketplace 发布。

在 Cursor Agent chat 中使用以下命令安装：

```text
/add-plugin compound-engineering
```

用户也可以在 plugin marketplace 中搜索 "compound engineering"。

repo-owned marketplace files 是：

```text
.cursor-plugin/marketplace.json
.cursor-plugin/plugin.json
```

不要再为 Cursor 使用旧的 custom Bun converter/install path。

## Config locations（配置位置）

| Scope（范围） | Path（路径） |
|-------|------|
| Project rules（project rules） | `.cursor/rules/*.mdc` |
| Project commands（project commands） | `.cursor/commands/*.md` |
| Project skills（project skills） | `.cursor/skills/*/SKILL.md` |
| Project MCP（project MCP） | `.cursor/mcp.json` |
| Project CLI permissions（project CLI permissions） | `.cursor/cli.json` |
| Global MCP（global MCP） | `~/.cursor/mcp.json` |
| Global CLI config（global CLI config） | `~/.cursor/cli-config.json` |
| Legacy rules（legacy rules，已弃用） | `.cursorrules` (deprecated) |

## Rules（rules，.mdc files）

- Rules 是存储在 `.cursor/rules/` 中、扩展名为 `.mdc` 的 Markdown files。
- 每个 rule 有 YAML frontmatter，包含三个 fields：`description`、`globs`、`alwaysApply`。
- Rules 有四种 activation types，取决于 frontmatter configuration：

| Type（类型） | `alwaysApply` | `globs` | `description` | Behavior（行为） |
|------|:---:|:---:|:---:|---|
| Always（始终） | `true` | ignored | optional | Included in every conversation（每次 conversation 都包含） |
| Auto Attached（自动附加） | `false` | set | optional | Included when matching files are in context（context 中有匹配 files 时包含） |
| Agent Requested（agent 请求） | `false` | empty | set | AI decides based on description relevance（AI 基于 description relevance 决定） |
| Manual（手动） | `false` | empty | empty | Only included via `@rule-name` mention（仅通过 `@rule-name` mention 包含） |

- Precedence（优先级）：Team Rules > Project Rules > User Rules > Legacy `.cursorrules` > `AGENTS.md`。

## Commands（commands，slash commands，命令）

- Custom commands 是存储在 `.cursor/commands/` 下的 Markdown files。
- Commands 是 plain markdown，不支持 YAML frontmatter。
- filename（不含 `.md`）成为 command name。
- Commands 通过在 chat UI 中输入 `/` 调用。
- Commands 通过 `$1`、`$2` 等支持 parameterized arguments。

## Skills（Agent Skills，agent skills，agent skills）

- Skills 遵循 open SKILL.md standard，与 Claude Code 和 Codex 相同。
- skill 是包含 `SKILL.md` 以及 optional `scripts/`、`references/` 和 `assets/` 的 folder。
- `SKILL.md` 使用 YAML frontmatter，required fields 为 `name` 和 `description`。
- Skills 可 repo-scoped 放在 `.cursor/skills/`，或 user-scoped 放在 `~/.cursor/skills/`。
- 启动时只加载每个 skill 的 name/description；完整内容在 invocation 时注入。

## MCP (Model Context Protocol，MCP 协议)

- MCP configuration 位于 `.cursor/mcp.json`（project）或 `~/.cursor/mcp.json`（global）。
- 每个 server 配置在 `mcpServers` key 下。
- STDIO servers 支持 `command`（required）、`args` 和 `env`。
- Remote servers 支持 `url`（required）和 optional `headers`。
- Cursor 根据是否存在 `command` 或 `url` 推断 transport type。

示例：

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

## CLI (cursor-agent，命令行)

- Cursor CLI 于 2025 年 8 月以 `cursor-agent` 名称发布。
- 支持 interactive mode、headless mode（`-p`）和 cloud agents。
- 读取 `.cursor/rules/`、`.cursorrules` 和 `AGENTS.md` 作为 instructions。
- CLI permissions 通过 `.cursor/cli.json` 中的 allow/deny lists 控制。
- Permission tokens（权限 token）：`Shell(command)`、`Read(path)`、`Write(path)`、`Delete(path)`、`Grep(path)`、`LS(path)`。
