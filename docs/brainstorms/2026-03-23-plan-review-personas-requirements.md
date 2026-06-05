---
date: 2026-03-23
topic: plan-review-personas
---

# document-review 的 Persona-Based Plan Review

## 问题框架

`document-review` skill 当前使用 single-voice evaluator，带五个 generic criteria（Clarity、Completeness、Specificity、Appropriate Level、YAGNI）。这能捕获 surface-level issues，但会漏掉 role-specific concerns：security engineer、product leader 和 design reviewer 会在同一 plan 中看到不同问题。ce:review skill 已经证明 multi-persona review 会为 code 产出更丰富、更 actionable 的 feedback。同样 architecture 应用于 plan review。

## 需求

- R1. 用 persona pipeline 替换当前 single-voice `document-review`，对 target document parallel dispatch specialized reviewer agents。

- R2. 实现 2 个 always-on personas，每次 document review 都运行：
  - **coherence**：Internal consistency、contradictions、terminology drift、structural issues、ambiguity。检查 readers 是否会对 interpretation 产生分歧。
  - **feasibility**：Can this actually be built? Architecture decisions、external dependencies、performance requirements、migration strategies。吸收 “tech-plan implementability” 角度（implementer 能否从这里开始 code？）。

- R3. 实现 4 个 conditional personas，基于 document content analysis 激活：
  - **product-lens**：当 document 包含 user-facing features、market claims、scope decisions 或 prioritization 时激活。以 “premise challenge” 开场——3 个 diagnostic questions，质疑 plan 是否解决正确问题。询问：“What's the 10-star version? What's the narrowest wedge that proves demand?”
  - **design-lens**：当 document 包含 UI/UX work、frontend changes 或 user flows 时激活。使用 “rate 0-10 and describe what 10 looks like” dimensional rating method。具体评价 design dimensions，并识别每项的 “great” 是什么样子。
  - **security-lens**：当 document 包含 auth、data handling、external APIs 或 payments 时激活。在 plan level 评估 threat model，而不是 code level。surface plan 未考虑的内容。
  - **scope-guardian**：当 document 包含 multiple priority levels、unclear boundaries，或 goals 与 requirements 不一致时激活。吸收 “skeptic” 角度——质疑 unnecessary complexity、premature abstractions 和 ahead-of-need frameworks。以针对 codebase 的 “what already exists?” check 开场。

- R4. skill 通过分析 document content 自动检测哪些 conditional personas 相关。不需要 user configuration 选择 personas。

- R5. persona findings synthesis 后使用 hybrid action model：
  - **Auto-fix**：Document quality issues（contradictions、terminology drift、structural problems、可推断的 missing details）。这些都是 unambiguously improvements。
  - **Present for user decision**：Strategic/product questions（problem framing、scope challenges、priority conflicts、“is this the right thing to build?”）。这些需要 human judgment。

- R6. 每个 persona 返回带 confidence scores 的 structured findings。orchestrator 对 personas 之间 overlapping findings deduplicate，并 synthesize 成 single prioritized report。

- R7. 保持与所有 existing callers 的 backward compatibility：
  - `ce-brainstorm` Phase 4 "Review and refine" option
  - `ce-plan` / `ce-plan-beta` post-generation "Review and refine" option
  - `deepen-plan-beta` post-deepening "Review and refine" option
  - Standalone invocation
  - done 时返回 "Review complete"，符合 callers expectation

- R8. Pipeline-compatible：当 automated pipelines 调用时（例如 future lfg/slfg integration），auto-fixes silently run，只有真正 blocking strategic questions 才 surface 给用户。

## 成功标准

- 在 plan 上运行 document-review，会 surface 当前 single-voice evaluator 漏掉的 role-specific issues（例如 security gaps、product framing problems、scope concerns）。
- Conditional personas 只在相关时激活——backend refactor plan 不会 spawn design-lens。
- Auto-fix changes 改善 document，且不要求用户 approve 每个 edit。
- Strategic findings 以清晰 questions 呈现，而不是 vague observations。
- 所有 existing callers（brainstorm、plan、plan-beta、deepen-plan-beta）无需修改即可工作。

## 范围边界

- 不添加 new callers 或 pipeline integrations，除了维护 existing ones。
- 不改变 deepen-plan-beta 的工作方式（它用 research strengthen；document-review 负责 review issues）。
- 不添加 persona selection 的 user configuration（当前只做 auto-detection）。
- 不发明 new review frameworks——把 established review patterns（premise challenge、dimensional rating、existing-code check）纳入相应 personas。

## 关键决策

- **Replace, don't layer**：document-review 被 persona pipeline 完全替换，而不是增加 optional mode。mental model 更简单，只有一种 behavior。
- **2 always-on + 4 conditional**：Coherence 和 feasibility 在每个 document 上运行。Product-lens、design-lens、security-lens 和 scope-guardian 根据 content 激活。让 cost 与 document complexity 成比例。
- **Hybrid action model**：Auto-fix document quality issues，present strategic questions。匹配 personas 自然 surface 的内容分界。
- **Absorb skeptic into scope-guardian**：二者都质疑 plan 是否 right-sized。一个 persona 吸收两个角度可避免 redundancy。
- **Absorb tech-plan implementability into feasibility**：二者都问 “can this work?”。一个 persona 吸收两个角度。
- **Review patterns as persona behavior, not separate mechanisms**：Premise challenge 放入 product-lens，dimensional rating 放入 design-lens，existing-code check 放入 scope-guardian。

## 依赖与假设

- 假设 ce:review agent orchestration pattern（parallel dispatch、synthesis、dedup）可用于 plan review，而无需 fundamental changes。
- 假设 plan/requirements documents 是 text-based，且包含足够 signal 用于 content-based conditional persona selection。

## 未决问题

### 延后到 Planning 阶段

- [Affects R6][Technical] persona findings 的 exact structured output format 是什么？应 mirror ce:review 的 P1/P2/P3 severity model，还是使用不同 classification？
- [Affects R4][Needs research] 哪些 content signals 能可靠检测各 conditional persona 的 relevance？需要定义 heuristics（keyword-based、section-based 或 semantic）。
- [Affects R1][Technical] personas 应作为 compound-engineering agents 实现（像 code review agents），还是作为 skill 内 inline prompt sections？Agents 支持 parallel dispatch；inline 更简单。
- [Affects R5][Technical] auto-fix mechanism 应如何工作——像当前 document-review 一样 direct inline edits，还是 synthesis 后单独 “apply fixes” pass？
- [Affects R7][Technical] 4 个 existing callers 中是否有任何需要小幅更新来处理 new output format，还是 "Review complete" contract 已足够？

## 下一步

-> /ce:plan 进行结构化 implementation planning
