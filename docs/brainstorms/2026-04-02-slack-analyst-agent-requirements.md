---
date: 2026-04-02
topic: ce-slack-researcher-agent
---

# Slack Analyst Agent（Slack 分析 Agent）

## 问题框架

在 compound-engineering workflows（ideate、plan、brainstorm）中运行的 coding agents 看不到存在于 Slack 中的组织知识。关于项目的决策、约束、持续讨论和 context，往往除了 Slack conversations 之外没有记录。当 developer 准备修改时，相关 Slack context——例如某个设计为何如此的讨论、弃用某功能的决定、其他团队提到的约束——对辅助他们的 agent 是不可见的。

官方 Slack plugin 提供 user-facing commands（`/slack:find-discussions`、`/slack:summarize-channel`），但它们是 standalone 且手动的。compound-engineering workflows 还没有可 programmatically dispatch 的 research agent，无法在正常 research phase 中浮现 Slack context。

## 需求

**Agent 身份与位置**

- R1. 在 `agents/research/ce-slack-researcher.md` 创建 research-category agent，遵循既有 research agent pattern（frontmatter 包含 name、description、model:inherit；examples block；phased execution）。
- R2. 该 agent 的角色是 analytical：搜索 Slack 中与当前任务相关的 context，并返回简洁、结构化的 digest。它不发送消息、不创建 canvases，也不在 Slack 中执行任何 write actions。

---

**Precondition 与 Short-Circuit 设计**

- R3. 两级 short-circuit 以最小化 token waste：
  - **Caller level：** Calling workflows 在 dispatch agent 前检查 Slack MCP server 是否已连接。不可用时完全跳过 dispatch。检测应检查 MCP availability（而不是可能变化的具体 tool names）。
  - **Agent level：** agent 进入时执行自己的 precondition check。如果 Slack MCP tools 不可访问，返回短消息（"Slack MCP not connected -- skipping Slack analysis"）并立即退出。
- R4. 如果 caller 没有提供有意义的 search context（例如 topic 为空或过于泛化），agent 也应 short-circuit。返回说明 context 不足的消息，而不是运行宽泛、低价值搜索。

---

**Search Strategy（搜索策略）**

- R5. 默认行为是 search-first：基于从 task topic 派生的 keywords，使用 `slack_search_public_and_private` 运行 2-3 次 targeted searches。默认同时搜索 public 和 private channels（用户已经 auth 过 Slack MCP）。
- R6. 只针对 high-relevance search hits 读取 threads（`slack_read_thread`），不要 speculative 读取。限制 thread reads，避免 runaway token consumption（每次 invocation 上限约 3-5 个 thread reads）。
- R7. 接受 caller 提供的可选 channel hint。提供时，也使用 `slack_read_channel` 并配合适当 time bounds 读取指定 channel(s) 的 recent history。没有 channel hint 时，不读取 channel history，search results 已足够。
- R8. 未来考虑（不在范围内）：为应始终搜索的 channels 提供 user preference/setting。推迟到后续迭代。

---

**输出格式**

- R9. 返回按 topic/theme 组织的简洁 summary digest。每条 finding 应包含：
  - topic 或 theme
  - 对讨论/决定内容的简短摘要
  - Source attribution（来源标注：channel name、approximate date、participants if notable）
  - 与当前任务的 relevance
- R10. 找不到相关 Slack context 时，返回简短明确陈述（"No relevant Slack discussions found for [topic]"），而不是生成 filler。
- R11. 保持输出足够紧凑，使其能作为有用 context，但不主导 calling workflow 的 token budget。典型结果目标约 200-500 tokens。

---

**Workflow Integration（Workflow 集成）**

- R12. 集成到三个 calling workflows：
  - **ce-ideate** -- 在 Phase 1（Codebase Scan）期间与 learnings-researcher 一起 dispatch。Slack context 通过浮现关于 focus area 的组织讨论来丰富 ideation。
  - **ce-plan** -- 在 research/context-gathering phase 期间 dispatch。Slack context 会浮现与 implementation 相关的 constraints、prior decisions 和 ongoing discussions。
  - **ce-brainstorm** -- 在 Phase 1.1（Existing Context Scan）期间 dispatch。Brainstorming 尤其受益于了解组织已经围绕该 topic 讨论过什么。
- R13. 在所有 calling workflows 中，将 Slack analyst agent 与其他 research agents（learnings-researcher 等）并行 dispatch，以避免增加 latency。Callers 等待所有 parallel agents 返回后再 consolidating results（这是 parallel research dispatch 的既有 pattern）。Slack analyst 的 dispatch condition 是 MCP availability（R3）。agent 自身在内部处理 meaningful-context check（R4）。
- R14. Callers 应将 Slack analyst 的输出与其他 research results 一起纳入现有 context summary，而不是作为单独 section。

---

**对外部 Plugin 的依赖**

- R15. Slack MCP server 由官方 Slack plugin 拥有，不属于 compound-engineering。该 agent 使用 Slack plugin 配置的 MCP tools。这会形成 soft dependency：只有在 Slack plugin 已安装并认证时，该 agent 才有用，但 compound-engineering 不能强制依赖它。
- R16. 不要在 compound-engineering 内 bundle 或 reference Slack plugin 的 `.mcp.json` 或配置。该 agent 仅依赖 runtime 可用的 MCP tools。

## 成功标准

- 当 Slack MCP 已连接时，agent 能浮现仅靠 codebase analysis 无法得到的相关 org context，从而丰富 ideate/plan/brainstorm workflows 的输出。
- 当 Slack MCP 未连接时，agent 增加零 token overhead（caller-level short-circuit 防止 dispatch）。
- agent 在合理 time budget（约 10-15 秒）内完成，并返回不会膨胀 calling workflows 的紧凑输出。

## 范围边界

- 不对 Slack 执行 write actions（不发送消息、不创建 canvases）。
- 除非 caller 提供显式 channel hint，否则不读取 channel history。
- 不提供 default channels 的 user preference/settings system（deferred）。
- 不替代现有 Slack plugin commands；该 agent 是 complementary，不是 competitive。
- 不安装或配置 Slack MCP；这仍是 Slack plugin 的责任。

## 关键决策

- **Agent, not skill：** 这是 workflows programmatically 调用的 sub-agent，不是 user-facing slash command。它位于 `agents/research/`。
- **默认 public + private search：** 用户已经 auth 了 Slack MCP，因此搜索 private channels 可避免错过最丰富的 context。
- **Search-first, reads on demand：** 避免 speculative 读取 channel history 的 token 成本。Thread reads 限于 high-relevance hits。
- **Concise digest output：** Callers 负责为其具体 context 解读输出。agent 返回有用摘要，而不是 raw message dumps。
- **检查 MCP availability，而不是 tool-name：** Callers 检查 Slack MCP 是否已连接，而不是检查具体 tool names（它们可能在未来 Slack MCP versions 中变化）。

## 未决问题

### 推迟到 Planning

- [Affects R3][Technical] callers 应如何精确检测 Slack MCP availability？Claude Code 的 tool list inspection、检查任意 `slack_*` tool prefix，还是其他机制？
- [Affects R5][Needs research] 每次 invocation 的最优 search query 数量是多少，才能平衡 coverage 与 token cost？从 2-3 开始，并基于真实使用调优。
- [Affects R12][Technical] 为添加 conditional dispatch，需要在 ce-ideate、ce-plan 和 ce-brainstorm skill files 中做哪些修改？Review 每个 skill 的 research phase，找到正确插入点。

## 下一步

-> `/ce:plan` 进行 structured implementation planning
