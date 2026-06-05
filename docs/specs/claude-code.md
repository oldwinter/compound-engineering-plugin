# Claude Code Plugin Spec（Plugin 规格）

最后验证：2026-01-21

## 主要来源

```
https://docs.claude.com/en/docs/claude-code/plugins-reference
https://docs.claude.com/en/docs/claude-code/hooks
https://docs.claude.com/en/docs/claude-code/slash-commands
https://docs.claude.com/en/docs/claude-code/skills
https://docs.claude.com/en/docs/claude-code/plugin-marketplaces
```

## Plugin layout and file locations（plugin 布局与文件位置）

- plugin root 包含 `.claude-plugin/plugin.json`，以及可选的 default directories，例如 `commands/`、`agents/`、`skills/`、`hooks/`；还可在 plugin root 放置 `.mcp.json` 和 `.lsp.json`。 citeturn2view7
- `.claude-plugin/` directory 只保存 manifest；component directories（commands/agents/skills/hooks）必须位于 plugin root，而不是 `.claude-plugin/` 内部。 citeturn2view7
- reference table 列出 default locations，并注明 `commands/` 是 skills 的 legacy home；新 skills 应位于 `skills/<name>/SKILL.md`。 citeturn2view7

## Manifest schema（manifest schema，清单结构，`.claude-plugin/plugin.json`）

- `name` 是 required，必须是 kebab-case 且不含 spaces。 citeturn2view8
- Metadata fields 包括 `version`、`description`、`author`、`homepage`、`repository`、`license` 和 `keywords`。 citeturn2view8
- Component path fields 包括 `commands`、`agents`、`skills`、`hooks`、`mcpServers`、`outputStyles` 和 `lspServers`。它们可以是 strings 或 arrays，也可以是 hooks/MCP/LSP 的 inline objects。 citeturn2view8turn2view9
- Custom paths 只补充 defaults，不替换 defaults；所有 paths 必须相对于 plugin root，且以 `./` 开头。 citeturn2view9

## Commands（slash commands，斜杠命令）

- Command files 是带 frontmatter 的 Markdown。支持的 frontmatter 包括 `allowed-tools`、`argument-hint`、`description`、`model` 和 `disable-model-invocation`，每个都有 documented defaults。 citeturn6search0

## Skills（skills，技能，`skills/<name>/SKILL.md`）

- Skills 是包含 `SKILL.md` 的 directories（可附带 optional support files）。安装 plugin 后，skills 和 commands 会被 auto-discovered。 citeturn2view7
- Skills 可通过 `/<skill-name>` 调用，并存储在 `~/.claude/skills` 或 `.claude/skills`（project-level）；plugins 也可以 ship skills。 citeturn12view0
- Skill frontmatter examples 包括 `name`、`description` 和 optional `allowed-tools`。 citeturn12view0

## Agents（agents，agent 文件，`agents/*.md`）

- Agents 是 markdown files，带有 `description`、`capabilities` 等 frontmatter，以及说明何时调用该 agent 的 descriptive content。 citeturn2view7

## Hooks（`hooks/hooks.json` 或 inline）

- Hooks 可通过 `hooks/hooks.json` 提供，也可在 manifest 中 inline 提供。Hooks 按 event → matcher → hook list 组织。 citeturn2view7
- plugin enabled 后，Plugin hooks 会与 user 和 project hooks merge，matching hooks 会 parallel run。 citeturn1search0
- Supported events 包括 `PreToolUse`、`PostToolUse`、`PostToolUseFailure`、`PermissionRequest`、`UserPromptSubmit`、`Notification`、`Stop`、`SubagentStart`、`SubagentStop`、`Setup`、`SessionStart`、`SessionEnd` 和 `PreCompact`。 citeturn2view7
- Hook types 包括 `command`、`prompt` 和 `agent`。 citeturn2view7
- Hooks 可以用 `${CLAUDE_PLUGIN_ROOT}` 引用 plugin files。 citeturn1search0

## MCP servers（MCP servers，MCP 服务器）

- Plugins 可以在 `.mcp.json` 中定义 MCP servers，也可以在 manifest 的 `mcpServers` 下 inline 定义。Configuration 包括 `command`、`args`、`env` 和 `cwd`。 citeturn2view7turn2view10
- Plugin MCP servers 在 enabled 后自动启动，并以 standard MCP tools 形式出现。 citeturn2view10

## LSP servers（LSP servers，LSP 服务器）

- LSP servers 可在 `.lsp.json` 中定义，也可在 manifest 中 inline 定义。Required fields 包括 `command` 和 `extensionToLanguage`，可选 settings 包括 transport、args、env 和 timeouts。 citeturn2view7turn2view10

## Plugin caching and path limits（plugin cache 与路径限制）

- Claude Code 会把 plugin files 复制到 cache directory，而不是原地使用它们。Plugins 无法访问 copied root 之外的 paths（例如 `../shared-utils`）。 citeturn2view12
- 如需访问 external files，在 plugin directory 内使用 symlinks，或重构 marketplace，让 plugin root 包含 shared files。 citeturn2view12

## Marketplace schema（marketplace schema，marketplace 结构，`.claude-plugin/marketplace.json`）

- marketplace JSON file 列出 plugins，并包含 marketplace metadata 和一个 `plugins` array。 citeturn8view2
- 每个 plugin entry 至少包含 `name` 和 `source`，也可以包含 additional manifest fields。 citeturn8view2
