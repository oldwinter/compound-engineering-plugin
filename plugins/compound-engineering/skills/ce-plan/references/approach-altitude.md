# Approach Altitude

当 SKILL.md Phase 0.1a 需要把请求上提一层回答时加载：产出 grounded **approach-plan**，也就是 *deliverable 将如何被制作* 的 plan，在 checkpoint 停住，然后现在执行或保存到以后。入口可以是 explicit（"plan for a plan"），也可以是用户接受了 proactive offer。它是 domain-general：deliverable 可以是 document、synthesis、study artifact，也可以是 software implementation plan。它维护的边界是 **code vs. knowledge-work**，不是 plan vs. execute。`ce-plan` 永远不写或运行 code；code execution 始终属于 `ce-work`。

## Stage 1: Light recon（低成本 grounding）

Approach-plan 的意义，是足够具体到值得用户判断。Generic methodology（"read the book, extract themes, synthesize"）不值得 approval。因此在 compose 前，先 skim 用户提供的 inputs，用具体信息 ground approach，但**不要** full read；full read 是 deliverable 本身的工作，延后到 execution。

- **按 input type 限定 recon**，让 checkpoint 保持便宜。以下是方向性 guidance，不是硬规则：PDF 看 section headers、first/last pages 和少量 sampled sections；长 transcript 看 sampled spans 和 topic shifts；codebase 看 entry points 和相关 module shape。Skim 到足以定位什么重要、各部分如何关联，然后停止。
- **Ground in specifics:** 命名 approach 会连接的具体 bridge，例如 "the transcript spends ~40 minutes on pricing, which maps to the book's chapter-3 framework -- I'll connect them there"，不要输出 generic recipe。
- **Graceful degrade。** 如果 inputs 缺失或稍后才到，根据 request 本身提出 provisional/ungrounded 的 approach-plan；不要阻塞等待 inputs，也不要把 generic methodology 包装成 plan。
- **No process exhaust。** Approach-plan 应读起来对用户有价值，而不是 recon step audit log（"I skimmed the PDF, then sampled the transcript, then..."）。Surface 结论，不要 surface plumbing。参见 `references/universal-planning.md` 的 Veil of value。

## Stage 2: Compose the approach-plan（chat-first）

在 chat 中交付 approach-plan。它是 **file-optional**：由用户决定是否持久化。保持可扫读。按请求大小覆盖：

- **每个 input 如何处理**：会从中挖什么，且基于 recon grounding。
- **它们如何组合**：synthesis strategy / sequencing；这通常是最有风险、也最值得确认的部分。
- **Deliverable 的形状**：执行后会产出什么结构 / outline。
- **值得确认的 forks**：少数用户 steer 会实质改变结果的 decisions（例如某个 source 权重更高、depth vs. breadth、audience）。
- **Open questions**：execution 前真正需要用户回答的 unresolved items。

这不是 software plan template（没有 implementation units / test scenarios），除非 deliverable 本身就是 software implementation plan；那种情况下，"execute now / code" 会进入正常 `ce-plan` flow，而不是在这里 compose deliverable。

## Stage 3: Checkpoint

停在 approach。使用平台 blocking question tool（Claude Code 中的 `AskUserQuestion`；schema 未加载时先用 `ToolSearch` 且 `select:AskUserQuestion`；Codex 中用 `request_user_input`；Gemini/Pi 中用 `ask_user`）。只有在没有 blocking tool 或 tool 调用失败时，才 fallback 到 chat 中的 numbered options。不要 silently skip。

**按 orthogonal axes 顺序提问**，不要把它们塞进同一个 menu（遵循 "split orthogonal decisions" rule 和 4-option cap）：

1. **先问：** "现在执行，还是保存到以后？"
2. **只有当选择现在执行且 domain 仍不明显时：** 确认 code vs. knowledge-work deliverable。作为 "save for later" 的一部分，可以 offer deepen approach-plan。

## Stage 4: Route

**Save for later。** 将 approach-plan 持久化到 `docs/plans/`。如果 deliverable 是 non-code，在持久化时写入 marker（`execution: knowledge-work`，见 `references/plan-sections.md`），这样之后 `ce-work` 读取该 plan 会进入 carve-out，而不是 code path。Offer deepen。保持 plan **agent-agnostic**，不要在 body 中写入 `ce-work`-specific choreography，让任何 agent 都能稍后执行。

**Execute now -- code deliverable。** Approach-plan 的工作已经结束；继续进入正常 `ce-plan` flow（Phase 0.1b onward）产出 implementation plan，然后 hand off 给 `ce-work` 写 code。`ce-plan` 不自己写 code。

**Execute now -- non-code deliverable。** 这是 knowledge-work path，没有 `ce-work` 等价的 code lifecycle，因此 route 到 `ce-work` carve-out：

1. 在 plan frontmatter 写入 marker `execution: knowledge-work`。
2. **Persist** marked plan 到 `docs/plans/`（marker 需要文件承载，才能 travel；R7 的 file-optional 只适用于用户保留 chat-only copy，non-code *execution* 必须 persist）。
3. 通过平台 skill invocation primitive 触发 `ce-work` skill，并传入 plan path（Claude Code 中为 `Skill`）。不要只是告诉用户去运行；要触发它，让本 session 继续执行。

`ce-plan` 在任何路径中都不执行 deliverable；它产出 approach-plan 并 hand off。该 portable plan 也能由没有 `ce-work` 的任意其他 agent 执行。

## Boundaries: not the other approach surfaces

已有三种 in-chat "approach" mechanics。Approach altitude 是独立但协同的 surface。通过 distinguishing properties 保持 disjoint，不靠 vocabulary 区分：

- **Answer-seeking's plan-of-attack**（`references/universal-planning.md`）：non-blocking（说明 approach 后立即继续）、丢弃 scaffold、产出 chat answer，并且只存在于 non-software answer-seeking branch。Approach altitude 是 domain-general，**停在 checkpoint** 等用户决定，并产出 **persistable、deepenable** 的 approach-plan。没有 approach-language 的 investigative request 属于 answer-seeking，不属于本机制。
- **Scoping synthesis**（Phase 0.7 / 5.1.5）：对已经 committed 的 deliverable 做 *scope* checkpoint，确认 implementation plan 要瞄准什么。Approach altitude 是 *altitude* checkpoint，决定是否要 commit 到 deliverable；它位于 implementation plan 之上，不在生产 implementation plan 的内部。
- **Deepening**（Phase 5.3）：作用于已存在的 plan，通过 confidence sub-agents 强化它。Approach altitude 发生在任何 artifact 存在之前。Approach-altitude checkpoint 中的 "deepen" affordance 是用户选择丰富 approach-plan，不是 Phase 5.3 confidence pass。
