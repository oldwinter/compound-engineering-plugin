---
date: 2026-03-14
topic: ce-plan-rewrite
---

# 重写 `ce:plan`：分离 Planning 与 Implementation

## 问题框架

`ce:plan` 位于 `ce:brainstorm` 和 `ce:work` 之间，但当前 skill 混合了 issue authoring、technical planning 和 pseudo-implementation。这会让 plans 变脆，并迫使 planning phase 预测许多其实只能在 implementation 期间发现的 details。PR #246 加剧了这一点，它要求 plans 包含 complete code、exact commands，以及 micro-step TDD 和 commit choreography。rewrite 应让 planning 强到足以让 capable agent 或 engineer 执行，同时把 code-writing、test-running 和 execution-time learning 放回 `ce:work`。

## 需求

- R1. `ce:plan` 必须接受 raw feature description 或 `ce:brainstorm` 产出的 requirements document 作为 primary input。
- R2. `ce:plan` 必须保留 compound-engineering 的 planning strengths：repo pattern scan、institutional learnings、conditional external research，以及必要时的 requirements-gap checks。
- R3. `ce:plan` 必须产出 durable implementation plan，聚焦 decisions、sequencing、file paths、dependencies、risks 和 test scenarios，而不是 implementation code。
- R4. `ce:plan` 不得指示 planner 运行 tests、生成 exact implementation snippets，或从 execution-time results 学习。这些属于 `ce:work`。
- R5. Plan tasks 和 subtasks 必须适合 implementation handoff，但 sizing 应是 logical units 或 atomic commits，而不是 2-5 分钟的 copy-paste steps。
- R6. Plans 必须作为 documents 或 issues 保持 shareable 和 portable，artifact 本身不要包含 TodoWrite instructions、`/ce:work` choreography 或 git command recipes 这类 tool-specific executor litter。
- R7. `ce:plan` 必须 carry forward `ce:brainstorm` 中的 product decisions、scope boundaries、success criteria 和 deferred questions，而不是重新发明它们。
- R8. `ce:plan` 必须明确区分哪些内容在 planning 中 resolved，哪些 intentional deferred 到 implementation-time discovery。
- R9. `ce:plan` 必须 cleanly hand off 到 `ce:work`，提供足够 task creation 信息，但不预写 code。
- R10. 如果 detail levels 保留，它们必须改变 analysis 和 documentation depth，而不是 planning philosophy。small plan 可以 terse，但仍应 decision-first。
- R11. 如果 upstream requirements document 包含 unresolved `Resolve Before Planning` items，`ce:plan` 必须在继续前 classify 它们是真正 product blockers，还是 misfiled technical questions。
- R12. `ce:plan` 不得越过会改变 behavior、scope 或 success criteria 的 unresolved product decisions 去 plan，但可以把 technical 或 research questions reclassify 为 planning-owned investigation 并吸收。
- R13. 当 true blockers 仍存在时，`ce:plan` 必须 helpful 地 pause：surface blockers，允许用户把它们转换为 explicit assumptions 或 decisions，或 route 回 `ce:brainstorm`。

## 成功标准

- fresh implementer 可以从 plan 开始工作，不需要 clarifying questions，但 plan 不包含 implementation code。
- `ce:work` 可以从 plan 派生 actionable tasks，而不依赖 micro-step commands 或 embedded git/test instructions。
- 随着 repo context 变化，plans 更长久 accurate，因为它们捕获 decisions 和 boundaries，而不是 speculative code。
- 来自 `ce:brainstorm` 的 requirements document 进入 planning 后，不丢失 decisions、scope boundaries 或 success criteria。
- 除非用户显式把 unresolved product blockers 转换为 assumptions 或 decisions，否则 plans 不会越过它们继续。
- 对同一 feature，rewritten `ce:plan` 产出的 output 比当前 skill 或 PR #246 proposed format materially shorter 且 less brittle，同时仍 execution-ready。

## 范围边界

- 不 redesign `ce:brainstorm` 的 product-definition role。
- 不从 `ce:plan` 移除 decomposition、file paths、verification 或 risk analysis。
- 不把 planning 移入 vague、under-specified artifact，让 execution 猜测。
- 此阶段不改变 `ce:work`，除了可能的 follow-up clarification：它应偏好什么 plan structure。
- 不要求 small 或 straightforward work 采用 heavyweight PRD ceremony。

## 关键决策

- 使用 hybrid model：保留 compound-engineering 的 research 和 handoff strengths，但采用 iterative-engineering 的 “decisions, not code” boundary。
- Planning 在 execution 前停止：不运行 tests、不做 fail/pass learning、不放 exact implementation snippets、不在 plan 中放 commit shell commands。
- 使用围绕 atomic changes 或 commit units sizing 的 logical tasks 和 subtasks，而不是 2-5 分钟 micro-steps。
- 保留 explicit verification 和 test scenarios，但把它们表达为 expected coverage 和 validation outcomes，而不是带 predicted output 的 commands。
- 当可用时保留 `ce:brainstorm` 作为 preferred upstream input，并清晰处理 deferred technical questions。
- 将 `Resolve Before Planning` 视为 classification gate：planning 先区分 true product blockers 和 technical questions，然后只调查后者。

## 高层方向

- Phase 0：相关时 resume existing plan work，detect brainstorm input，并 assess scope。
- Phase 1：通过 repo research、institutional learnings 和 conditional external research 收集 context。
- Phase 2：resolve planning-time technical questions，并单独捕获 implementation-time unknowns。
- Phase 3：围绕 components、dependencies、files、test targets、risks 和 verification 组织 plan。
- Phase 4：写入 right-sized plan artifact；其 depth 随 scope 变化，但 boundary 保持 planning-only。
- Phase 5：review 并 hand off 到 refinement、deeper research、issue sharing 或 `ce:work`。

## 考虑过的替代方案

- 保留当前 `ce:plan`，只 reject PR #246。
  Rejected，因为底层 issue 仍存在：当前 skill 已经 drift toward issue-template output plus pseudo-implementation。
- 几乎 wholesale 采用 Superpowers `writing-plans`。
  Rejected，因为它有意是 execution-script-oriented，会把 planning 折叠进 detailed code-writing 和 command choreography。
- wholesale 采用 iterative-engineering `tech-planning`。
  Rejected，因为这会丢失有用的 compound-engineering behaviors，例如 brainstorm-origin integration、institutional learnings 和 richer post-plan handoff options。

## 依赖与假设

- `ce:work` 可以继续从 decision-first plan 创建自己的 actionable task list。
- 如果 `ce:work` 之后受益于 explicit section，例如 `## Implementation Units` 或 `## Work Breakdown`，那应作为 separate follow-up，围绕 execution needs 设计，而不是 micro-step code generation。

## Planning 期间已解决

- [Affects R10][Technical] 将 `MINIMAL` / `MORE` / `A LOT` 替换为 `Lightweight` / `Standard` / `Deep`，使 `ce:plan` 与 `ce:brainstorm` 的 scope model 对齐。
- [Affects R9][Technical] 更新 `ce:work`，显式消费 decision-first plan sections，例如 `Implementation Units`、`Requirements Trace`、`Files`、`Test Scenarios` 和 `Verification`。
- [Affects R2][Needs research] 保留 SpecFlow 作为 conditional planning aid：当 `Standard` 或 `Deep` plans 的 flow completeness 不清楚时使用它，而不是强制每个 plan 都用。

## 下一步

-> Review、refine，并 commit `ce:plan` 和 `ce:work` rewrite
