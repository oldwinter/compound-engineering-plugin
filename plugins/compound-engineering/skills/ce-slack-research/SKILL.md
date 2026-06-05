---
name: ce-slack-research
description: "搜索 Slack 中可解释的 organizational context：decisions、constraints 和 discussion arcs，并产出带 cross-cutting analysis 的 synthesized research digest。当用户说 'search slack for'、'what did we discuss about'、'slack context for' 或 'what does the team think about' 时使用。不同于 slack:find-discussions；后者只返回 raw message results，不做 synthesis。"
---

# /ce-slack-research

搜索 Slack 中的 organizational context，并获得 interpreted research digest。

## Usage（用法）

```
/ce-slack-research [topic or question]
/ce-slack-research
```

## Examples（示例）

```
/ce-slack-research free trial
/ce-slack-research What did we say about free trial recently?
/ce-slack-research free trial in #proj-reverse-trial
/ce-slack-research onboarding flow after:2026-03-01
```

Input 可以是 keyword、natural language question，也可以包含 Slack search modifiers，例如 channel hints（`in:#channel`）和 date filters（`after:YYYY-MM-DD`）。Agent 会从任意 input 形态中抽取 topic 并制定 searches。

## Execution（执行）

如果未提供 argument，询问要 research 什么 topic。使用平台的 blocking question tool：Claude Code 中用 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 搭配 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Gemini 中用 `ask_user`、Pi 中用 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 plain text 提问；不要因为需要 schema load 就 fallback。绝不要 silently skip 该问题。

用用户 topic 作为 task prompt 分派 `ce-slack-researcher`。省略 `mode` parameter，让用户配置的 permission settings 生效。

后续由该 agent 全部处理：Slack MCP discovery、search execution、thread reads 和 synthesis。它返回 digest，包含：

- **Workspace identifier（workspace 标识）**，让用户确认搜索的是正确 Slack instance
- **Research-value assessment（研究价值评估）**（high / moderate / low / none），并带 justification
- **Findings organized by topic（按 topic 组织的 findings）**，包含 source channels 和 dates
- **Cross-cutting analysis（跨主题分析）**，surface 跨 findings 的 patterns

如果 agent 报告 Slack unavailable（MCP not connected 或 auth expired），将 message 转达给用户。不要尝试 alternative research methods。
