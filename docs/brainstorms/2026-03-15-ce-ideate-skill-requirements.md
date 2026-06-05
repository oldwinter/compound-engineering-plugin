---
date: 2026-03-15
topic: ce-ideate-skill
---

# ce:ideate — 开放式 Ideation Skill

## 问题框架

`ce:brainstorm` skill 是 reactive 的——用户带来 idea，skill 通过 collaborative dialogue 帮助 refine 它。但反方向没有 workflow：让 AI 通过深入理解 project 主动生成 ideas，然后通过 critical self-evaluation 过滤它们。用户当前只能通过 ad-hoc prompting 达成（例如 “come up with 100 ideas and give me your best 10”），但这种方式没有 codebase grounding、没有 structured output、没有 durable artifact，也没有连接到 `ce:*` workflow pipeline。

## 需求

- R1. ce:ideate 是 standalone skill，独立于 ce:brainstorm，在 `plugins/compound-engineering/skills/ce-ideate/` 中有自己的 SKILL.md
- R2. 接受 optional freeform argument 作为 focus hint——可以是 concept（“DX improvements”）、path（`plugins/compound-engineering/skills/`）、constraint（“low-complexity quick wins”），也可以为空，表示完全 open ideation
- R3. 生成 ideas 前执行 deep codebase scan，让 ideation 基于 actual project state，而不是 abstract speculation
- R4. 保留用户已证明有效的 prompt mechanism 作为 core workflow：先生成 many ideas，再系统性、批判性地 reject weak ones，最后只详细解释 surviving ideas
- R5. 对 full list 做 self-critique，用 explicit reasoning reject weak ideas——adversarial filtering step 是核心 quality mechanism
- R6. 用 structured analysis 展示 top 5-7 surviving ideas：description、rationale、downsides、confidence score（0-100%）、estimated complexity
- R7. 包含 brief rejection summary——每个 rejected idea 一行 reason——让用户看到考虑过什么，以及为什么 cut
- R8. 写入 durable ideation artifact 到 `docs/ideation/YYYY-MM-DD-<topic>-ideation.md`（无 focus area 时为 `YYYY-MM-DD-open-ideation.md`）。这会 compounding——rejected ideas 防止重复探索 dead ends，未行动 ideas 可供 future sessions 使用。
- R9. 默认 volume（约 30 ideas，展示 top 5-7）可被用户 argument 覆盖（例如 “give me your top 3” 或 “go deep, 100 ideas”）
- R10. 展示 ideas 后的 handoff options：brainstorm selected idea（进入 ce:brainstorm）、refine ideation（dig deeper、re-evaluate、explore new angles）、share to Proof，或 end session
- R11. 当用户想对某个 idea 采取行动时，始终 route 到 ce:brainstorm——ideation output 永远不够详细，不应跳过 requirements refinement
- R12. Session completion：结束时，询问是否把 ideation doc commit 到 current branch。如果用户拒绝，保留 file uncommitted。不要 create branches 或 push——只做 local commit。
- R13. Resume behavior：调用 ce:ideate 时，检查 `docs/ideation/` 中最近 30 天创建的 ideation docs。如果存在相关文档，提供 continue from it（add new ideas、revisit rejected ones、act on un-explored ideas）或 start fresh 的选择。
- R14. 在写入 durable ideation artifact 之前，先向用户展示 surviving candidates，这样用户可以提问或轻微 reshape candidate set，然后再 archive
- R15. 在任何 downstream handoff、Proof sharing 或 session end 之前，必须写入或更新 ideation artifact，即使 initial survivor presentation 先发生
- R16. Refine routes based on intent： “add more ideas” 或 “explore new angles” 返回 generation（Phase 2），“re-evaluate” 或 “raise the bar” 返回 critique（Phase 3），“dig deeper on idea #N” 在原地扩展该 idea 的 analysis。当 refined state 需要 preserved 时，ideation doc 在每次 refinement 后更新
- R17. 使用 agent intelligence 提升 ideation quality，但只作为 core prompt mechanism 的支撑，而不是替代它
- R18. 使用 existing research agents 做 codebase grounding，但 ideation 和 critique sub-agents 是具有不同 perspectives 的 prompt-defined roles，而不是强行复用 existing named review agents
- R19. 当 ideation 使用 sub-agents 时，每个 sub-agent 接收相同 grounding summary、user focus hint 和 current volume target
- R20. Focus hints 同时影响 candidate generation 和 final filtering；它们不只是 evaluation-time bias
- R21. Ideation sub-agents 以 standardized structured format 返回 ideas，让 orchestrator 能一致地 merge、dedupe 和 reason
- R22. orchestrator 拥有跨 merged idea set 的 final scoring、ranking 和 survivor decisions；sub-agents 可以 emit lightweight local signals，但不能 authoritative 地 rank 自己的 ideas
- R23. Distinct ideation perspectives 应通过 prompt framing methods 创建，以鼓励 creative spread，同时不过度约束 workflow；examples 包括 friction、unmet need、inversion、assumption-breaking、leverage 和 extreme-case prompts
- R24. skill 不为所有 runs hardcode 固定 sub-agent 数量；它应使用 smallest useful set，在不压垮 orchestrator context window 的同时保留 diversity
- R25. 当用户选择某个 idea 进入 brainstorm 时，更新 ideation doc，将该 idea 标记为 “explored”，并引用 resulting brainstorm session date，让 future revisits 显示哪些 ideas 已被行动过。

## 成功标准

- 用户可以在任意 project 上无参数调用 `/ce:ideate`，获得真正 surprising、high-quality 且基于 actual codebase 的 improvement ideas
- 通过 filter 存活的 ideas 明显优于 naive “give me 10 ideas” prompt 的结果
- workflow 使用 agent intelligence 扩大 candidate pool，但不遮蔽 core generate -> reject -> survivors mechanism
- 用户在 surviving candidates 写入 durable artifact 前能看到并提问
- ideation artifact 持久存在，并在数周后 revisit 时仍有价值
- skill 与 existing pipeline 自然组合：ideate → brainstorm → plan → work

## 范围边界

- ce:ideate 不产出 requirements、plans 或 code——只产出 ranked ideas
- ce:ideate 不修改 ce:brainstorm behavior——通过 skill description 和 catalog 处理 ce:ideate discovery，而不是改动其他 skills
- v1 不做 external research（competitive analysis、similar projects）——这可以是 future enhancement，但会增加 cost 和 latency，且尚未证明必要
- v1 没有 configurable depth modes——fixed volume 加 argument-based override 已足够

## 关键决策

- **Standalone skill, not a mode within ce:brainstorm**：这两个 workflows 是根本不同的 cognitive modes（proactive/divergent vs. reactive/convergent），有不同 phases、outputs 和 success criteria。合并会让 ce:brainstorm 更难维护，并模糊它的 identity。
- **Durable artifact in docs/ideation/**：丢弃 ideation results 违背 compounding。file 写入成本低，并在 revisit 未行动 ideas 或避免重新探索 rejected ones 时提供价值。
- **Artifact written after candidate review, not before initial presentation**：首次 survivor presentation 是 collaborative review，不是 archival finalization。artifact 应只在 candidate set 好到值得保存后写入，但必须在 handoff、sharing 或 session end 之前写入。
- **Always route to ce:brainstorm for follow-up**：在 ideation depth 上，ideas 只是 one-paragraph concepts——永远不够详细，不能跳过 requirements refinement。
- **Survivors + rejection summary output format**：完全透明地展示考虑过什么，同时不用 rejected ideas 的详细分析压垮用户。
- **Freeform optional argument**：concept、path，或什么都不写——skill 把拿到的任何东西解释为 context。不要人为区分 “focus area” 和 “target path”。
- **Agent intelligence as support, not replacement**：价值来自已验证的 ideation-and-rejection mechanism。parallel sub-agents 帮助产出更丰富 candidate pool 和更强 critique，但 orchestrator 仍负责 synthesis、scoring 和 final ranking。

## 待决问题

### 延后到 Planning

- [Affects R3][Technical] v1 中除了 `repo-research-analyst` 和 `learnings-researcher` 外，哪些 research agents 应始终运行以做 codebase grounding（如果有）？
- [Affects R21][Technical] ideation sub-agents 应返回什么 exact structured output schema，才能让 orchestrator 一致地 merge 和 score，同时不过早 overfit format？
- [Affects R6][Technical] 每个 surviving idea 的 structured analysis 是否应在当前 fields（description、rationale、downsides、confidence、complexity）之外包含 “suggested next steps” 或 “what this would unlock”？
- [Affects R2][Technical] skill 应如何在 freeform argument 中检测 volume overrides 与 focus-area hints？simple heuristic 还是 explicit parsing？

## 下一步

→ `/ce:plan` 进行 structured implementation planning
