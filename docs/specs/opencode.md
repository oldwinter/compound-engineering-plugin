# OpenCode Spec（OpenCode 规格：Config、Agents、Plugins）

最后验证：2026-04-19

## 主要来源

```
https://opencode.ai/docs/config/
https://opencode.ai/docs/tools
https://opencode.ai/docs/permissions
https://opencode.ai/docs/plugins/
https://opencode.ai/docs/agents/
https://opencode.ai/docs/commands/
https://opencode.ai/docs/skills
https://opencode.ai/config.json
```

## Config files and precedence（配置文件与优先级）

- OpenCode 支持 JSON 和 JSONC configs。
- Config sources 会 merge，而不是 replace；global 和 project config 都参与 final config。
- Global config 存储在 `~/.config/opencode/opencode.json`，project config 是 project root 下的 `opencode.json`。
- 可通过 `OPENCODE_CONFIG` 和 `OPENCODE_CONFIG_DIR` 提供 custom config file 和 directory。
- `.opencode` 和 `~/.config/opencode` directories 使用 plural subdirectory names（`agents/`、`commands/`、`modes/`、`plugins/`、`skills/`、`tools/`、`themes/`）。

## Core config keys（核心 config key）

- `model` 和 `small_model` 设置 primary 与 lightweight models；`provider` 配置 provider options。
- `tools` 仍被支持，但自 OpenCode v1.1.1 起 deprecated；permissions 现在是 canonical control surface。
- `permission` 控制 tool approvals，可 globally 或 per tool 配置，也支持 pattern-based rules。
- 支持 `mcp`、`instructions`、`disabled_providers`、`enabled_providers` 和 `plugin` config sections。
- `plugin` 可列出 startup 时加载的 npm packages。
- `skills.paths` 和 `skills.urls` 可添加 extra skill discovery locations，但在用 local OpenCode smoke-test 该 layout 之前，CE 不应依赖它们。

## Tools（工具）

- OpenCode 自带 built-in tools；permissions 决定每个 tool 是自动运行、需要 approval，还是 denied。
- Tools 默认 enabled；permissions 提供 gating mechanism。

## Permissions（权限）

- Permissions 解析为 `allow`、`ask` 或 `deny`，可 globally 或 per tool 配置，也支持 pattern-based rules。
- Defaults 较 permissive，但 `.env` file reads 等有 special cases。
- Agent-level permissions 会覆盖 global permission block。

## Agents（agents，agent）

- Agents 可在 `opencode.json` 中配置，也可作为 markdown files 放在 `~/.config/opencode/agents/` 或 `.opencode/agents/`。
- Agent config 支持 `mode`、`model`、`variant`、`temperature`、`top_p`、`hidden`、`steps`、`options`、`permission` 和其他 schema fields。`tools` 仍存在但 deprecated。
- `mode` 可以是 `primary`、`subagent` 或 `all`；省略 mode 时默认为 `all`。
- `hidden: true` 会把 subagents 从 `@` autocomplete menu 中隐藏。
- `permission.task` 控制一个 agent 可调用哪些 subagents。
- Model IDs 使用 `provider/model-id` format。

## Skills（skills，skill）

- Skills 是可复用的 `SKILL.md` definitions，通过 OpenCode native `skill` tool 按需加载。
- OpenCode 会在 built-in roots 中搜索 direct child skill directories：
  - `.opencode/skills/<name>/SKILL.md`
  - `~/.config/opencode/skills/<name>/SKILL.md`
  - `.claude/skills/<name>/SKILL.md`
  - `~/.claude/skills/<name>/SKILL.md`
  - `.agents/skills/<name>/SKILL.md`
  - `~/.agents/skills/<name>/SKILL.md`
- config schema 也暴露 `skills.paths` 和 `skills.urls` 用于 extra skill sources。在本地 OpenCode install 测试之前，不要把 CE 切换到这些字段；direct `~/.config/opencode/skills/<name>/SKILL.md` 仍是 stable writer shape。
- Skill frontmatter 识别 `name`、`description`、`license`、`compatibility` 和 `metadata`；unknown fields 会被 ignored。
- Skill names 必须是 lowercase alphanumeric，使用 single hyphen separators，并且必须匹配 directory name。

## Commands（commands，命令）

- Commands 可在 `opencode.json` 中配置，也可作为 Markdown files 放在 `~/.config/opencode/commands/` 或 `.opencode/commands/`。
- Markdown command frontmatter 可包含 `description`、`agent`、`model` 和 `subtask` 等 fields；body 会成为 prompt template。
- 如果 command 目标 agent 的 mode 是 `subagent`，OpenCode 默认将其作为 subagent 调用。`subtask: true` 可强制 subagent invocation。

## Plugins and events（plugins 与 events）

- Local plugins 从 `.opencode/plugins/` 和 `~/.config/opencode/plugins/` 加载。npm plugins 可在 `opencode.json` 的 `plugin` 中列出。
- Plugins 是 JavaScript/TypeScript modules。每个 exported plugin function 接收 OpenCode context，并返回 hooks/event handlers。
- Local plugins 和 custom tools 可使用 OpenCode config directory 中 `package.json` 声明的 npm dependencies；OpenCode 在 startup 时运行 `bun install`。

## 本仓库说明

- 当前 documented global CE install root 应保持为 `~/.config/opencode`，而不是 `~/.agents`，以避免与同样读取 `~/.agents` 的 harnesses 冲突。
- 2026 年 4 月时，当前 CE writer shape 仍然合适：
  - `~/.config/opencode/opencode.json`
  - `~/.config/opencode/agents/*.md`
  - 仅当 source plugin ships commands 时，写入 `~/.config/opencode/commands/*.md`
  - `~/.config/opencode/plugins/*.ts`
  - `~/.config/opencode/skills/*/SKILL.md`
- OpenCode 的 plugin system 对 JS/TS hooks 和 custom tools 有用，但当前 docs 没有描述一个 native marketplace command 可以消费 CE 的 `.claude-plugin/marketplace.json` 并安装完整 skills/agents/commands payload。
- 在 OpenCode 记录 packaged skills 和 agents 的 native distribution path 之前，保留 custom Bun writer。
- `compound-engineering` plugin 当前为 OpenCode 产出 skills 和 subagent Markdown files。它不应输出 deprecated `tools` config；permission config 足以支持 non-default permission modes。
