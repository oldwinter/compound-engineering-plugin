---
title: "feat(ce-plan): 为 plan documents 添加 conditional visual aids"
type: feat
status: completed
date: 2026-03-29
---

# feat(ce-plan): 为 plan documents 添加条件性 visual aids

## 概览

向 ce:plan 添加 visual communication guidance，让 plan documents 在内容值得时包含 inline visual aids：dependency graphs、interaction diagrams、comparison tables。它将 PR #437 的 brainstorm visual aids 扩展到 planning level，填补 brainstorm product-level visuals 与 ce:plan 现有 Section 3.4 solution-level technical design diagrams 之间的 gap。

## 问题框架

当 requirements 描述 multi-step workflows、mode comparisons 或 multi-participant systems 时，ce:brainstorm 现在会生成 visual aids（PR #437）。ce:plan 有 Section 3.4 "High-Level Technical Design"，覆盖 solution-level diagrams：mermaid sequences、state diagrams、pseudo-code，也就是关于 *technical solution being planned* 的 diagrams。

但 plan documents 有自己的 readability needs，既不是 upstream 的 ce:brainstorm visuals，也不是 Section 3.4 能解决的。当 plan 有 6 个 implementation units 且 dependencies 非线性时，读者必须扫描每个 unit 的 Dependencies field 来重建 execution graph。当 System-Wide Impact 用密集 prose 描述 5 个 interacting surfaces 时，读者必须把全部内容记在脑中。当 problem 涉及 4 个 behavioral modes 时，读者在 Overview 中遇到概念，却直到 Technical Design section（如果有）才看到 comparison。

真实 plans 证据：

- Release automation plan（606 lines、6 units、linear chain、3 release modes、4-component model）— dependency flow 不明显，mode differences 埋在 prose 中
- Merge-deepen-into-plan（6 units、non-linear dependencies）— parallelization opportunities 被隐藏
- Adversarial review agents（5 units、diamond dependency、dense System-Wide Impact）— findings through synthesis and dedup 未 visualized
- Token usage reduction plan — 已在 Problem Frame 中使用 budget tables（不是 Technical Design），说明该 pattern 自然可用

## 需求追踪（Requirements Trace）

- R1. ce:plan 包含 guidance，说明何时 visual aids 真正改善 plan document readability
- R2. Visual aids 基于 content patterns 条件性出现，而不是基于 plan depth classification
- R3. Visual aids 与 Section 3.4（High-Level Technical Design）不同：它们改善 *plan document readability*，而不是 *solution's technical design*
- R4. plan level 的三类 diagram：implementation unit dependency graphs、system-wide interaction diagrams，以及 modes/decisions 的 comparison tables
- R5. 现有 plan template、Section 3.4 和 planning rules 保持不变；Phase 5.1 的 pre-finalization checklist 增加一个 visual-aid check
- R6. Format selection self-contained，遵循 brainstorm guidance 的同一结构（mermaid default、ASCII for annotated flows、markdown tables for comparisons），但用 plan-appropriate detail 重述

## 范围边界

- 不修改 Section 3.4（High-Level Technical Design），它覆盖 solution-level diagrams
- 不让任何 visual aid 对任何 depth classification mandatory
- 不修改 plan template structure 或 section ordering
- 不向 template 添加 separate "Diagrams" section
- 不向 confidence check section checklists 添加 visual aids（保持 lightweight；pre-finalization check 已足够）

## 背景与调研（Context & Research）

### 相关代码与模式（Relevant Code and Patterns）

- `plugins/compound-engineering/skills/ce-plan/SKILL.md` — 待修改 skill；Phase 4（lines 366-580）包含 plan writing guidance 和 planning rules
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`（lines 222-249）— 待遵循的 visual communication guidance pattern
- `plugins/compound-engineering/skills/ce-plan/SKILL.md`（Section 3.4，lines 301-326）— 现有 solution-level diagram guidance；必须保持 distinct
- `docs/plans/2026-03-17-001-feat-release-automation-migration-beta-plan.md` — 最强 evidence case：6 units、3 modes、5 System-Wide Impact surfaces
- `docs/plans/2026-03-26-001-refactor-merge-deepen-into-plan.md` — non-linear dependency graph（parallelization opportunities hidden）
- `docs/plans/2026-03-26-001-feat-adversarial-review-agents-plan.md` — diamond dependency、System-Wide Impact 中 dense dedup interaction
- `docs/plans/2026-03-28-001-feat-ce-review-headless-mode-plan.md` — Technical Design 中的 decision matrix，其实是 plan-readability visual
- `docs/plans/2026-02-08-refactor-reduce-plugin-context-token-usage-plan.md` — Problem Frame 中的 token budget tables（Technical Design 外的 plan-readability visuals precedent）

### 机构经验（Institutional Learnings）

- brainstorm-to-plan handoff contract（ce-plan-rewrite requirements，R7）被严格指定；plan template changes 必须保留 downstream consumers 依赖内容
- ce:plan canonical readability bar："a fresh implementer can start work from the plan without needing clarifying questions"；visual aids 服务该目标
- Prose governs diagrams 是 brainstorm 和 document-review skills 中已建立 invariant
- docs/solutions/ 中没有 mermaid gotchas 的现有 learnings

## 关键技术决策

- **Plan-readability visuals vs. solution-design visuals**：Section 3.4 问的是 "does the plan need a dedicated technical design section about the solution?" 新 guidance 问的是 "do other sections of the plan benefit from inline visual aids for reader comprehension?" 二者互补，不重叠。区别是：Section 3.4 diagrams 描述 *architecture of what's being built*；新的 visual aids 帮助读者 *navigate and comprehend the plan document itself*。

- **放在 Phase 4，planning rules 之后**：brainstorm 在 Phase 3 添加 visual communication guidance（model composing document 的位置）。对 ce:plan，analogous location 是 Phase 4（Write the Plan），位于 Section 4.3（Planning Rules）之后。这里是 model 对 plan document 做 formatting decisions 的位置。

- **Content triggers，而不是 depth triggers**：复用 brainstorm 已建立原则。关于复杂 workflow 的 Lightweight plan 可能值得 dependency graph；关于 straightforward feature 的 Deep plan 可能不需要。

- **Self-contained format selection，与 brainstorm 结构相同**：Skills self-contained，不能引用彼此 guidance。format selection section 重述 framework（mermaid default、ASCII for annotated flows、markdown tables for comparisons），并加入 plan-appropriate detail，而不是指向 brainstorm。

- **与现有 Section 4.3 mermaid rule 的关系**：Section 4.3 Planning Rules 已有一行鼓励在 "when they clarify relationships or flows that prose alone would make hard to follow — ERDs for data model changes, sequence diagrams for multi-service interactions, state diagrams for lifecycle transitions, flowcharts for complex branching logic" 时使用 mermaid diagrams。该现有 rule 适用于 High-Level Technical Design section 和 per-unit technical design fields 内的 solution-design diagrams，是 Section 3.4 guidance 在 planning rules 中的延伸。新的 visual communication guidance 适用于其他 sections 中的 plan-readability diagrams（dependency graphs、System-Wide Impact 中的 interaction diagrams、Overview 中的 comparison tables）。保留现有 Section 4.3 rule，并在其后添加新的 distinct subsection。introductory paragraph 应区分它与 Section 3.4 以及现有 4.3 mermaid rule。

## 未决问题

### Planning 期间已解决

- **Should we add to the confidence check checklists?** 不。confidence check（Phase 5.3）已有大量 section checklists。向那里添加 visual aid checks 会把 confidence machinery 与 optional formatting guidance 耦合。Phase 5.1 的 pre-finalization check 是正确位置，matching brainstorm approach。
- **What about brainstorm visual aids flowing into plans?** brainstorm 在 requirements doc 中生成 visual aid 时，ce:plan 的 Phase 0.3 会将其作为 origin document 的一部分 carry forward。plan 可基于它在 implementation level 是否仍有用来 enrich、replace 或 drop。无需显式 guidance；现有 "carry forward" contract 已处理。

### 延后到实现阶段（Deferred to Implementation）

- content-pattern triggers 的精确 wording，应匹配 skill 现有 directive tone
- 是否在 comment 中 reference specific plans as examples（可能过于 brittle）

## 实施单元（Implementation Units）

- [x] **Unit 1：向 Phase 4 添加 visual communication guidance**

**Goal:** 向 ce:plan 的 Phase 4 添加 guidance block，教 model 何时以及如何在 plan documents 中为 reader comprehension include visual aids，并与 Section 3.4 solution-level technical design 区分。

**需求:** R1, R2, R3, R4, R5, R6

**依赖:** None

**文件:**

- 修改: `plugins/compound-engineering/skills/ce-plan/SKILL.md`

**实现方法:**

在 Section 4.3（Planning Rules）之后、Phase 5（Final Review）之前添加新 subsection。该 block 应包含：

1. **Introductory paragraph** — 区分 Section 3.4："Section 3.4 covers diagrams about the *solution being planned*. This guidance covers visual aids that help readers *comprehend the plan document itself*."

2. **When to include** — 使用 matching brainstorm 和 Section 3.4 的 "When to include / When to skip" pattern：

   | Plan content pattern | Visual aid | Placement |
   |---|---|---|
   | 4+ implementation units with non-linear dependencies | Mermaid dependency graph | Before or after the Implementation Units heading |
   | System-Wide Impact naming 3+ interacting surfaces | Mermaid interaction/component diagram | Within System-Wide Impact section |
   | Problem/Overview describing 3+ modes, states, or variants | Markdown comparison table | Within Overview or Problem Frame |
   | Key Technical Decisions with 3+ interacting decisions, or Alternative Approaches with 3+ alternatives | Markdown comparison table | Within the relevant section |

3. **When to skip（跳过时机）** — Anti-patterns：
   - plan 简单线性，只有 3 个或更少 units 且为 straight dependency chain
   - prose 已经清楚传达 relationships
   - visual 会 duplicate Section 3.4 High-Level Technical Design 已展示内容
   - visual 描述 code-level detail（specific method names、SQL columns、API field lists）

4. **Format selection** — Self-contained guidance，matching brainstorm 结构但用 plan-appropriate detail：
   - Mermaid（default）用于 dependency graphs 和 interaction diagrams：5-15 nodes、no in-box annotations、TB direction
   - ASCII/box-drawing 用于需要 rich in-box content 的 annotated flows：file path layouts、decision logic branches
   - Markdown tables 用于 mode/variant/decision comparisons
   - Proportionality、inline placement、plan-structure level only、prose-is-authoritative（比例合适、就地放置、只到 plan-structure 层级、prose-is-authoritative）

5. **Pre-finalization check addition** — 向 Phase 5.1 添加一个 check："Would a visual aid (dependency graph, interaction diagram, comparison table) help a reader grasp the plan structure faster than scanning prose alone?"

6. **Prose-is-authoritative and accuracy self-check** — 简短重述：visual 与 prose 不一致时 prose governs；verify diagrams match 它们说明的 plan sections。

**遵循的模式:**

- ce:brainstorm SKILL.md lines 222-249 — visual communication guidance structure（视觉沟通指导结构）
- ce:plan Section 3.4 — "When to include / When to skip" table-based guidance pattern（表格化 guidance pattern）

**测试场景:**

- Happy path：规划有 5+ non-linear implementation units 的 feature 时，生成带 mermaid dependency graph 的 plan
- Happy path：规划 System-Wide Impact 有 4+ interacting surfaces 的 feature 时，生成 interaction diagram
- Happy path：problem 涉及 3+ modes 的 feature，Overview 中生成 comparison table
- Edge case：简单 2-unit feature 不产生 plan-readability visual aids
- Edge case：关于复杂 multi-unit workflow 的 Lightweight plan 仍 include dependency graph
- Edge case：Section 3.4 已包含 technical design diagram；新 visual aids 不 duplicate 它
- Integration：修改后的 skill 仍生成 ce:work 可消费的 valid plan documents

**验证:**

- SKILL.md change contained within Phase 4，位于 Section 4.3 和 Phase 5 之间
- Section 3.4（High-Level Technical Design）不变
- plan template 不变
- Phase 5.1 多一个 pre-finalization check
- 对 complex multi-unit feature 运行 ce:plan 应生成带 inline visual aids 的 plan
- 对 simple feature 运行 ce:plan 应生成无 plan-readability visual aids 的 plan

## 系统级影响（System-Wide Impact）

- **Section 3.4 boundary:** Preserved。new guidance 明确区分 plan-readability visuals 与 solution-design visuals。Section 3.4 仍是 technical design diagrams 的 home。
- **Plan template:** Unchanged。Visual aids 出现在 existing sections 内 inline，而不是新 required sections。
- **Confidence check（Phase 5.3）:** Not modified。Phase 5.1 中的 pre-finalization check 足够。
- **Document-review compatibility:** Plan-level mermaid blocks 和 markdown tables 是 standard markdown，document-review 已能处理。
- **Brainstorm-to-plan handoff:** Unaffected。ce:brainstorm visual aids 通过 Phase 0.3 的 "carry forward" contract 流入。
- **不变的 invariants:** Plan template、Section 3.4 content、confidence check checklists、planning rules、phase ordering。

## 风险与依赖（Risks & Dependencies）

| Risk | Mitigation |
|------|------------|
| Visual aids become reflexive (added to every plan) | Content-pattern triggers are explicit and quantitative (4+ units, 3+ surfaces, 3+ modes). Anti-patterns section calls out when to skip |
| Confusion between plan-readability visuals and Section 3.4 solution visuals | Introductory paragraph explicitly distinguishes them. "When to skip" includes "would duplicate what Section 3.4 already shows" |
| Diagram inaccuracy (no code to validate against) | Prose-is-authoritative rule; accuracy self-check instruction; proportionality guideline prevents over-detailed diagrams |

## 来源与参考（Sources & References）

- 相关 PR: #437（feat(ce-brainstorm): add conditional visual aids to requirements documents）
- 相关代码: `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`（lines 222-249，visual communication guidance）
- 相关代码: `plugins/compound-engineering/skills/ce-plan/SKILL.md`（Section 3.4 diagram guidance）
- 相关 plan: `docs/plans/2026-03-29-001-feat-brainstorm-visual-aids-plan.md`（completed, direct precedent）
