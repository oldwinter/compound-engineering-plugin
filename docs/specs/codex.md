# Codex Spec（Codex 规格：Config、Prompts、Skills、Subagents、MCP）

最后验证：2026-04-19

## 主要来源

```
https://developers.openai.com/codex/config-basic
https://developers.openai.com/codex/config-advanced
https://developers.openai.com/codex/custom-prompts
https://developers.openai.com/codex/skills
https://developers.openai.com/codex/skills/create-skill
https://developers.openai.com/codex/subagents
https://developers.openai.com/codex/guides/agents-md
https://developers.openai.com/codex/mcp
```

## Config location and precedence（配置位置与优先级）

- Codex 从 `~/.codex/config.toml` 读取 local settings；该文件由 CLI 和 IDE extension 共享。 citeturn2view0
- Configuration precedence 是：CLI flags → profile values → `config.toml` 中的 root-level values → built-in defaults。 citeturn2view0
- Codex 将 local state 存在 `CODEX_HOME` 下（默认 `~/.codex`），其中包括 `config.toml`。 citeturn4view0

## Profiles and providers（profiles 与 providers）

- Profiles 定义在 `[profiles.<name>]` 下，并通过 `codex --profile <name>` 选择。 citeturn4view0
- Top-level `profile = "<name>"` 设置 default profile；CLI flags 可以覆盖它。 citeturn4view0
- Profiles 是 experimental，IDE extension 不支持。 citeturn4view0
- Custom model providers 可用 base URL、wire API 和 optional headers 定义，再通过 `model_provider` 引用。 citeturn4view0

## Custom prompts（custom prompts，slash commands，自定义 prompts）

- Custom prompts 是存储在 `~/.codex/prompts/` 下的 Markdown files。 citeturn3view0
- Custom prompts 需要显式调用，且不会通过 repository 共享；需要共享或 auto-invoke 时使用 skills。 citeturn3view0
- Prompts 在 slash command UI 中以 `/prompts:<name>` 调用。 citeturn3view0
- Prompt front matter 支持 `description:` 和 `argument-hint:`。 citeturn3view0turn2view3
- Prompt arguments 支持 `$1`–`$9`、`$ARGUMENTS`，以及以 `KEY=value` 提供的 named placeholders，如 `$FILE`。 citeturn2view3
- Codex 会忽略 prompts directory 中的 non-Markdown files。 citeturn2view3

## AGENTS.md instructions（AGENTS.md 指令）

- Codex 在做任何 work 之前读取 `AGENTS.md` files，并构建 combined instruction chain。 citeturn3view1
- Discovery order（发现顺序）：global（`~/.codex`，先 `AGENTS.override.md` 再 `AGENTS.md`），然后从 repo root 到 CWD 进行 project directory traversal，且 override > AGENTS > fallback names。 citeturn3view1
- Codex 从 root 向下 concatenate files；更接近 working directory 的 files 出现在后面，并覆盖更早 guidance。 citeturn3view1

## Skills（Agent Skills，agent skills，agent skills）

- skill 是包含 `SKILL.md` 以及 optional `scripts/`、`references/` 和 `assets/` 的 folder。 citeturn3view3turn3view4
- `SKILL.md` 使用 YAML front matter，并要求 `name` 和 `description`。 citeturn3view3turn3view4
- Required fields 是 single-line，且有长度限制（name ≤ 100 chars，description ≤ 500 chars）。 citeturn3view4
- 启动时，Codex 只加载每个 skill 的 name/description；完整内容在 invoked 时注入。 citeturn3view3turn3view4
- Skills 可 repo-scoped 放在 `.agents/skills/`，并从 current working directory 向上到 repository root 发现。User-scoped skills 位于 `~/.agents/skills/`。 citeturn1view1turn1view4
- Inference：部分 existing tooling 和 user setups 仍使用 `.codex/skills/` 和 `~/.codex/skills/` 作为 compatibility paths，但这些位置没有记录在上方链接的当前 OpenAI Codex skills docs 中。
- Compound Engineering managed installs 应避免使用 `~/.agents/skills`，因为这个 shared root 可能 shadow Copilot 的 native plugin skills。CE Codex skills 使用 Codex-specific compatibility root：`~/.codex/skills/compound-engineering/<skill-name>/SKILL.md`，并用 CE manifest 跟踪 generated files。
- Codex 还支持 `/etc/codex/skills` 中的 admin-scoped skills，以及 Codex bundled 的 built-in system skills。 citeturn1view4
- Skills 可通过 `/skills` 或 `$skill-name` 显式调用。 citeturn3view3

## Subagents 和 custom agents

- 当前 releases 中，Codex subagent workflows 默认 enabled。
- Codex 只在用户明确要求时 spawn subagents。
- Custom agent files 是 standalone TOML files，personal agents 位于 `~/.codex/agents/`，project-scoped agents 位于 `.codex/agents/`。
- 每个 TOML file 定义一个 custom agent。Required fields：
  - `name`
  - `description`
  - `developer_instructions`
- Optional fields 可包括 `nickname_candidates`、`model`、`model_reasoning_effort`、`sandbox_mode`、`mcp_servers` 和 `skills.config`。
- TOML `name` field 是 source of truth；让 filename 匹配 agent name 只是 convention。
- CE 会把 Claude Markdown agents 转换成 Codex custom-agent TOML files，放在 `~/.codex/agents/compound-engineering/` 下。
- CE 将 generated agents 保持在 `~/.codex/agents` 下，而不是 `~/.agents/skills`，因为 `~/.agents` 在 harnesses 之间共享，可能 shadow native plugin installs。
- Generated TOML agent names 保留 CE 的 hyphenated naming，并包含 source category，例如 `review-ce-correctness-reviewer` 和 `research-ce-repo-research-analyst`。
- 2026-04-19 的 empirical test 确认 Codex 会发现 `~/.codex/agents/compound-engineering/` 下的 nested custom-agent TOML files，并接受 hyphenated TOML `name` values。
- 2026-04-19 的 empirical plugin test 发现 Codex native plugins 不会注册 bundled 在 plugin-local `agents/`、plugin-local `.codex/agents/` 或 undocumented plugin manifest `agents` field 下的 custom agents。因此，CE 的 agent-heavy workflows 仍需要 custom Bun Codex installer。

## MCP (Model Context Protocol，MCP 协议)

- MCP configuration 位于 `~/.codex/config.toml`，由 CLI 和 IDE extension 共享。 citeturn3view2turn3view5
- 每个 server 配置在 `[mcp_servers.<server-name>]` 下。 citeturn3view5
- STDIO servers 支持 `command`（required）、`args`、`env`、`env_vars` 和 `cwd`。 citeturn3view5
- Streamable HTTP servers 支持 `url`（required）、`bearer_token_env_var`、`http_headers` 和 `env_http_headers`。 citeturn3view5
