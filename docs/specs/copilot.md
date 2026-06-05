# GitHub Copilot Spec（Agents、Skills、MCP 规格）

最后验证：2026-04-18

## 主要来源

```
https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli
https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference
https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference
https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-plugins
https://docs.github.com/en/copilot/reference/custom-agents-configuration
https://docs.github.com/en/copilot/concepts/agents/about-agent-skills
https://docs.github.com/en/copilot/concepts/agents/coding-agent/mcp-and-coding-agent
```

## Config locations（配置位置）

| Scope | Path |
|-------|------|
| Project agents | `.github/agents/*.agent.md` |
| Project agents（Claude-compatible） | `.claude/agents/*.md` |
| Personal agents | `~/.copilot/agents/*.agent.md` |
| Personal agents（Claude-compatible） | `~/.claude/agents/*.md` |
| Plugin agents | 默认 `agents/`，可在 plugin manifest 中覆盖 |
| Project skills | `.github/skills/*/SKILL.md` |
| Project skills（auto-discovery） | `.agents/skills/*/SKILL.md` |
| Project instructions | `.github/copilot-instructions.md` |
| Path-specific instructions | `.github/instructions/*.instructions.md` |
| Project prompts | `.github/prompts/*.prompt.md` |
| Org/enterprise agents | `.github-private/agents/*.agent.md` |
| Personal skills | `~/.copilot/skills/*/SKILL.md` |
| Personal skills（auto-discovery） | `~/.agents/skills/*/SKILL.md` |
| Directory instructions | `AGENTS.md`（nearest ancestor wins） |

## Agents (.agent.md files，agent 文件)

- Custom agents 是带 YAML frontmatter 的 Markdown files，存储在 `.github/agents/`。
- File extension 是 `.agent.md`（或 `.md`）。Filenames 只能包含：`.`、`-`、`_`、`a-z`、`A-Z`、`0-9`。
- documented custom-agent extension 是 singular `.agent.md`，不是 `.agents.md`。
- `description` 是唯一 required frontmatter field。
- 当前 Copilot CLI docs 没有把 `.agents/agents` 或 `~/.agents/agents` 列为 custom-agent discovery paths。`.agents/*` convention 记录用于 skills（`.agents/skills`、`~/.agents/skills`），不是 agents。
- Copilot CLI 还会在 native Copilot agent directories 之后、plugin agents 之前加载 Claude-compatible agent directories（`.claude/agents`、`~/.claude/agents`）。
- `AGENTS.md` files 被支持为 custom instruction/context files，而不是 custom-agent profile files。

## Plugins（插件）

- Copilot CLI plugins 会 bundle reusable agents、skills、hooks、MCP servers 和相关 configuration。
- 从 registered marketplace 安装：

```text
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering@compound-engineering-plugin
```

- terminal 等价命令为：

```bash
copilot plugin marketplace add EveryInc/compound-engineering-plugin
copilot plugin install compound-engineering@compound-engineering-plugin
```

- Copilot CLI 会在 `.plugin/plugin.json`、`plugin.json`、`.github/plugin/plugin.json` 或 `.claude-plugin/plugin.json` 查找 plugin manifests。
- Copilot CLI 会在 `marketplace.json`、`.plugin/marketplace.json`、`.github/plugin/marketplace.json` 或 `.claude-plugin/marketplace.json` 查找 marketplace manifests。
- 因此，现有 repository-level `.claude-plugin/marketplace.json` 和 plugin-level `plugins/compound-engineering/.claude-plugin/plugin.json` 应足以支持 Copilot native plugin install。除非未来 Copilot 要求 Copilot-only manifest field，否则不要添加平行 `.github/plugin` surface。

### Frontmatter fields（frontmatter 字段）

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | No | Derived from filename | Display name |
| `description` | **Yes** | — | agent 的用途 |
| `tools` | No | `["*"]` | Tool access list；`[]` 会禁用所有 tools |
| `target` | No | both | `vscode`、`github-copilot`，或省略表示两者都适用 |
| `infer` | No | `true` | 根据 task context 自动选择 |
| `model` | No | Platform default | AI model（在 IDE 中有效，在 github.com 上可能被忽略） |
| `mcp-servers` | No | — | MCP config（仅 org/enterprise agents） |
| `metadata` | No | — | 任意 key-value annotations |

### Character limit（字符限制）

Agent body content 限制为 **30,000 characters**。

### Tool names（tool 名称）

| Name | Aliases | Purpose |
|------|---------|---------|
| `execute` | `shell`, `Bash` | 运行 shell commands |
| `read` | `Read` | 读取 files |
| `edit` | `Edit`, `Write` | 修改 files |
| `search` | `Grep`, `Glob` | 搜索 files |
| `agent` | `Task` | 调用其他 agents |
| `web` | `WebSearch`, `WebFetch` | Web access |

## Skills (SKILL.md，skill 文件)

- Skills 遵循 open SKILL.md standard（与 Claude Code 和 Cursor 相同 format）。
- skill 是包含 `SKILL.md` 以及 optional `scripts/`、`references/` 和 `assets/` 的 directory。
- YAML frontmatter 要求 `name` 和 `description` fields。
- Copilot 判断相关性后按需加载 skills。

### Discovery locations（发现位置）

| Scope | Path |
|-------|------|
| Project | `.github/skills/*/SKILL.md` |
| Project（Claude-compatible） | `.claude/skills/*/SKILL.md` |
| Project（auto-discovery） | `.agents/skills/*/SKILL.md` |
| Personal | `~/.copilot/skills/*/SKILL.md` |
| Personal（auto-discovery） | `~/.agents/skills/*/SKILL.md` |

## MCP (Model Context Protocol，模型上下文协议)

- MCP configuration 通过 GitHub 上的 **Repository Settings > Copilot > Coding agent > MCP configuration** 设置。
- Repository-level agents **不能** inline 定义 MCP servers；应使用 repository settings。
- Org/enterprise agents 可以在 frontmatter 中嵌入 MCP server definitions。
- 所有 env var names 必须使用 `COPILOT_MCP_` prefix。
- 只支持 MCP tools（不支持 resources 或 prompts）。

### Config structure（配置结构）

```json
{
  "mcpServers": {
    "server-name": {
      "type": "local",
      "command": "npx",
      "args": ["package"],
      "tools": ["*"],
      "env": {
        "API_KEY": "COPILOT_MCP_API_KEY"
      }
    }
  }
}
```

### Server types（server 类型）

| Type（类型） | Fields（字段） |
|------|--------|
| Local/stdio（本地/stdio） | `type: "local"`, `command`, `args`, `tools`, `env` |
| Remote/SSE（远程/SSE） | `type: "sse"`, `url`, `tools`, `headers` |

## Prompts (.prompt.md，prompt 文件)

- Reusable prompt files 存储在 `.github/prompts/`。
- 仅在 VS Code、Visual Studio 和 JetBrains IDEs 中可用（不在 github.com 上可用）。
- 在 chat 中通过 `/promptname` 调用。
- 支持 variable syntax：`${input:name}`、`${file}`、`${selection}`。

## Precedence（优先级）

1. Built-in agents（内置 agents）
2. `~/.copilot/agents`
3. `<project>/.github/agents`
4. `<parents>/.github/agents`
5. `~/.claude/agents`
6. `<project>/.claude/agents`
7. `<parents>/.claude/agents`
8. Plugin `agents/` directories（plugin 的 `agents/` directories）
9. Remote organization/enterprise agents（远程 organization/enterprise agents）

在 repo 内，directories 中的 `AGENTS.md` files 提供 nearest-ancestor-wins instructions。

Skills 使用独立的 first-found-wins precedence。当前 docs 列出的顺序是 project `.github/skills`、`.agents/skills`、`.claude/skills`、inherited project skills、personal `~/.copilot/skills`、personal `~/.agents/skills`、personal `~/.claude/skills`，然后 plugin skill directories。

Skills 按 `SKILL.md` 内的 `name` field deduplicated，而不是按 directory name。如果 personal 或 project skill 与 plugin skill 拥有相同 `name`，Copilot 使用 first-loaded personal/project skill，并静默忽略 plugin skill。例如，带 `name: ce-plan` 的 stale `~/.agents/skills/ce-plan/SKILL.md` 会 shadow native plugin 的 `ce-plan`；它不应在 Copilot CLI 中显示为两个 separate skills。使用 `/skills info ce-plan` 确认哪一个 location 获胜。

这让 Copilot cleanup 不同于 Codex duplicate cleanup：`~/.agents/skills`、`~/.copilot/skills`、`.agents/skills` 或 `.github/skills` 中的 stale CE skills 可能不会产生 visible duplicates，但会静默覆盖更新的 plugin-provided CE skills。
