---
title: "feat(ce-brainstorm): 为 requirements documents 添加 conditional visual aids"
type: feat
status: completed
date: 2026-03-29
deepened: 2026-03-29
---

# feat(ce-brainstorm): 为 requirements documents 添加条件性 visual aids

## 概览

向 ce:brainstorm 添加 guidance，使 requirements documents 在内容值得时包含 visual communication（flow diagrams、comparison tables、relationship diagrams）。目标是让读者更快理解 workflows、mode differences 和 component relationships，而不是为了画图而画图。

## 问题框架

今天的 requirements documents 完全由 prose 和 structured bullets 组成。对简单 features 这没问题。但当 requirements 描述 multi-step workflows（release automation：关于 pipeline 的 26 条 requirements）、behavioral modes（ce:review headless：4 个 modes 且 behaviors 不同）或 multi-actor systems 时，读者必须从密集文本中重建 mental model。ce:plan 经常必须在 planning 期间从零创建这些 visuals；headless mode plan 构建了 decision matrix，而它在 requirements level 就会很有用。

onboarding skill 会为 ONBOARDING.md 生成 ASCII architecture 和 flow diagrams，但它有 implemented codebase 可分析。Brainstorm 基于 ideas 和 decisions 工作，因此它的 visual aids 必须是 conceptual，也就是从 requirements content 本身派生，而不是从 code 派生。

## 需求追踪（Requirements Trace）

- R1. brainstorm skill 包含 guidance，说明何时 visual aids 能真正改善 requirements document
- R2. Visual aids 基于 content patterns 条件性出现，而不是基于 depth classification；关于复杂 workflow 的 Lightweight brainstorm 可能值得 diagram，关于 straightforward feature 的 Deep brainstorm 可能不需要
- R3. Visual aids 放在最相关的位置 inline（通常在 Problem Frame 后，或 Requirements 内），而不是单独 "Diagrams" section
- R4. requirements level 支持三类 diagram：user/workflow flow diagrams（mermaid 或 ASCII，取决于 annotation density）、mode/variant comparison tables，以及 actor/component relationship diagrams（mermaid 或 ASCII，取决于 layout needs）
- R5. Visual aids 保持在 conceptual level：user flows、information flows、mode comparisons；不是 implementation architecture、data schemas 或 code structure
- R6. 现有 document template、pre-finalization checklist 和 brainstorm-to-plan contract 保持不变

## 范围边界

- 不向 ce:plan 添加 visual aids（它已有 High-Level Technical Design guidance）
- 不让 diagrams 对任何 depth classification mandatory
- 不添加 code-analysis-driven diagrams（brainstorm 没有 implemented codebase 可分析）
- 不修改 document template structure 或 section ordering
- 不向 template 添加单独 "Diagrams" section

## 背景与调研（Context & Research）

### 相关代码与模式（Relevant Code and Patterns）

- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md` — 待修改 skill；Phase 3（lines 154-260）包含 output template 和 document guidance
- `plugins/compound-engineering/skills/ce-plan/SKILL.md`（Section 3.4，lines 301-326）— planning level 的现有 diagram type selection matrix；作为 design reference
- `plugins/compound-engineering/skills/onboarding/SKILL.md` — skill output 中生成 ASCII diagrams 的 prior art；使用 format constraints（80-column max），并基于 system complexity 条件性 include
- `docs/brainstorms/2026-03-17-release-automation-requirements.md` — workflow flow diagram 会有帮助的 example（26 requirements 描述 multi-step release pipeline）
- `docs/brainstorms/2026-03-28-ce-review-headless-mode-requirements.md` — mode comparison table 会有帮助的 example（4 modes 行为不同；ce:plan 必须从零构建）
- `docs/brainstorms/2026-03-25-vonboarding-skill-requirements.md` — 不需要 diagram 的 example（simple, linear feature）
- `docs/plans/2026-03-28-001-feat-ce-review-headless-mode-plan.md` — ce:plan 创建的 decision matrix，本该在 upstream 有用

### 机构经验（Institutional Learnings）

- brainstorm-to-plan contract 被严格指定（ce-plan-rewrite requirements，R7）。变更必须保留 ce:plan 依赖的 fields。
- ce:plan 的 diagram selection matrix 将 work characteristics 映射到 diagram types。Brainstorm-level visuals 应更简单（conceptual，而不是 technical）。
- docs/solutions/ 中没有关于 diagram generation quality 或 mermaid gotchas 的现有 learnings。

## 关键技术决策

- **Inline placement，而不是单独 section**：Visual aids 出现在与内容最相关的位置（Problem Frame 后、比较 modes 时位于 Requirements 内等）。专门的 "Diagrams" section 会诱导为了 diagram 而 diagram。这 mirror 好技术写作使用 figures 的方式：在 relevance point，而不是 appendix。

- **Product-level content triggers，而不是 depth triggers**：是否 include visual aid 取决于 requirements 正在描述什么，而不是 brainstorm 是 Lightweight/Standard/Deep。Triggers 是 product-level patterns（user workflows、approach comparisons、entity relationships），不是 implementation-level patterns（multi-component integration、state machines、data pipelines；这些属于 ce:plan）。"Actors" 指 requirements 描述其 interactions 的 distinct participants：user roles、system components 或 external services。

- **按 diagram complexity 选择 format**：两类 formats，由 diagram 需要传达什么决定：
  - **Mermaid** 用于 simple flows（5-15 nodes、no in-box annotations、standard flowchart shapes）。可在 GitHub 和 Proof 中 render 为 SVG；source text 可作为 fallback 阅读。使用 top-to-bottom（`TB`）direction 保持 source narrow。这是多数 brainstorm diagrams 的 default。
  - **ASCII/box-drawing diagrams** 用于需要 rich in-box content 的 annotated flows（每步 CLI commands、decision logic branches、file path layouts、multi-column spatial arrangements）。当 diagram value 来自 *annotations within steps* 而不仅是 steps 之间 flow 时，它们比 mermaid 更 expressive。遵循 onboarding 的 width constraints：vertical stacking，code blocks 80-column max。
  - **Markdown tables** 用于 mode/variant comparisons 和 approach comparisons。Tables 在 renderers 中自然 wrap，无 width concern。
  - diagrams 与 content 保持 proportionate。5-step workflow 得到约 5-10 nodes。一个复杂 5-step workflow 如果每步都有 decision branches 和 CLI commands，可能需要约 15-20 nodes；只要每个 node 都有价值，这是可以的。如果 diagram 超过约 15 nodes，应是因为 workflow 真有那么多 meaningful steps，而不是 diagram over-detailed。

- **Prose is authoritative over diagrams**：当 visual aid 与 surrounding prose 不一致时，以 prose 为准。Document-review 已在 auto-fix patterns 中编码该 assumption。Diagrams 说明 prose 描述的内容；它们不是 independent source of truth。

- **Guidance, not enforcement**：在 Phase 3 中用已建立的 "When to include / When to skip" pattern 添加 visual communication guidance（matching ce:plan Section 3.4）。pre-finalization checklist 增加一个 check。template 不新增 required section。

## 未决问题

### Planning 期间已解决

- **Where in the skill?** Phase 3（Capture the Requirements），作为 template 与 pre-finalization checklist 之间的新 guidance block。这里正是 model composing document 和 making formatting decisions 的位置。
- **What format for flow diagrams?** Mermaid。比 ASCII 更 portable，在 GitHub/Proof 中 render，并与 ce:plan approach 对齐。
- **Should the template itself change?** 不。template 保持原样。guidance block 指示 model 在现有 template structure 中何时、何处添加 visual aids。

### 延后到实现阶段（Deferred to Implementation）

- detection heuristics 的精确 wording，应匹配 skill 现有 tone 和 concision
- 是否包含每种 diagram type 的 small inline example，还是只描述它们

## 实施单元（Implementation Units）

- [x] **Unit 1：向 Phase 3 添加 visual communication guidance**

**Goal:** 向 ce:brainstorm 的 Phase 3 添加 guidance block，教 model 何时以及如何在 requirements documents 中 include visual aids。

**需求:** R1, R2, R3, R4, R5, R6

**依赖:** None

**文件:**

- 修改: `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`

**实现方法:**

在 Phase 3 中，在 document template code block 结束后、"For **Standard** and **Deep** brainstorms" 段落前，添加新 subsection。该 block 应包含：

1. **When to include** — 使用已建立的 "When to include / When to skip" structure（matching ce:plan Section 3.4）。include visual aid 当：
   - Requirements 描述 multi-step user workflow 或 process -> Problem Frame 后放 mermaid flow diagram
   - Requirements 定义 3+ behavioral modes、variants 或 states -> Requirements section 中放 markdown comparison table
   - Requirements 涉及 3+ interacting participants（user roles、system components、external services），且 requirements 描述它们的 interactions -> Problem Frame 后放 mermaid relationship diagram
   - 比较多个 competing approaches -> approach exploration 中放 comparison table

2. **When to skip** — 不添加 visual aid 当：
   - prose 已经清楚传达 concept
   - diagram 只是以 visual form 重述 requirements，没有增加 comprehension value
   - visual 描述 implementation architecture、data schemas、state machines 或 code structure（那是 ce:plan domain）
   - brainstorm 简单且线性，没有 multi-step flows、mode comparisons 或 multi-actor interactions

3. **Format selection（格式选择）:**
   - **Mermaid**（default）用于 simple flows：5-15 nodes、no in-box annotations、standard flowchart shapes。使用 `TB`（top-to-bottom）direction。source 在 diff views 和 terminals 中应可作为 fallback 阅读。
   - **ASCII/box-drawing diagrams** 用于需要 rich in-box content 的 annotated flows：每步 CLI commands、decision logic branches、file path layouts、multi-column spatial arrangements。遵循 onboarding width constraints：vertical stacking，code blocks 80-column max。
   - **Markdown tables** 用于 mode/variant comparisons 和 approach comparisons。
   - 保持 diagrams proportionate：5-step workflow 得到约 5-10 nodes；复杂 workflow 如果每步都有 decision branches 和 annotations，可能需要约 15-20 nodes。每个 node 都应有价值。
   - inline 放在 relevance point，而不是 separate section。substantial flow（>10 nodes）可以在 Problem Frame 与 Requirements 之间拥有自己的 `## User Flow` 或 `## Architecture` heading。
   - 只到 conceptual level：user flows、information flows、mode comparisons、component responsibilities
   - Prose is authoritative：当 visual aid 与 surrounding prose 不一致时，以 prose 为准

4. **Pre-finalization checklist addition** — 向现有 "Before finalizing, check:" block 添加一个 check："Would a visual aid (flow diagram, comparison table, relationship diagram) help a reader grasp the requirements faster than prose alone?"

5. **Diagram accuracy self-check** — 添加 guidance：生成 visual aid 后，model 应验证 diagram 准确表示 prose requirements（correct sequence、no missing branches、no merged steps）。没有 code 可 validate 的 diagrams 比 code-backed diagrams 有更高 inaccuracy risk。

**遵循的模式:**

- ce:plan SKILL.md Section 3.4 — 带 "when to include" / "when to skip" guidance 的 diagram type selection matrix
- 现有 Phase 3 guidance style：concise、directive、带清晰 inclusion triggers

**测试场景:**

- Happy path：为 multi-step workflow feature 生成 requirements document 时，产生 inline mermaid flow diagram
- Happy path：为有多个 behavioral modes 的 feature 生成 requirements document 时，产生 comparison table
- Edge case：为 simple、linear feature 生成 requirements document 时，不产生 visual aids
- Edge case：关于复杂 workflow 的 Lightweight brainstorm 仍 include diagram（depth 不 gate visual aids）
- Integration：修改后的 skill 仍产生 ce:plan 可消费的 valid requirements documents（brainstorm-to-plan contract preserved）

**验证:**

- SKILL.md change self-contained within Phase 3（变更自包含于 Phase 3）
- document template section ordering 和 required fields 不变
- pre-finalization checklist 多了一个 visual-aid check
- 对 workflow-heavy feature 运行 brainstorm skill 应生成带 inline mermaid diagram 的 document
- 对 simple feature 运行 brainstorm skill 应生成无 diagrams 的 document

## 系统级影响（System-Wide Impact）

- **Brainstorm-to-plan contract:** Preserved。没有添加或移除 template fields。Visual aids 是 existing sections 内的 optional inline additions。ce:plan 的 Phase 0.3 会 carry forward Problem Frame、Requirements、Success Criteria、Scope Boundaries、Key Decisions、Dependencies/Assumptions 和 Outstanding Questions；这些都不受影响。
- **Document-review compatibility:** document-review skill 会 review brainstorm output。Inline mermaid blocks 和 markdown tables 是 standard markdown，document-review 无需变更即可处理。
- **Converter compatibility:** Brainstorm output 不被 converters 消费。无 cross-platform impact。
- **Unchanged invariants:** Template structure、section ordering、requirement ID format、Outstanding Questions split（Resolve Before Planning / Deferred to Planning），以及 pre-finalization checklist 的现有 checks 全部保持。

## 风险与依赖（Risks & Dependencies）

| Risk | Mitigation |
|------|------------|
| Visual aids become reflexive (added when not helpful) | Detection heuristics are explicit: multi-step workflow, 3+ modes, 3+ actors. Anti-patterns section explicitly calls out when NOT to include visuals |
| Diagrams introduce inaccurate mental models (no code to validate against) | Conceptual-level constraint: user flows and mode comparisons only, not implementation architecture. Explicit diagram accuracy self-check: verify diagram matches prose requirements (correct sequence, no missing branches). Prose is authoritative — document-review already auto-corrects prose/diagram contradictions toward prose |
| Mermaid syntax errors in generated output | Low risk — mermaid flow syntax is simple. ASCII/box-drawing diagrams are an alternative for complex annotated flows. If mermaid fails to render, the source text is still readable |

## 来源与参考（Sources & References）

- 相关代码: `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`（Phase 3）
- 相关代码: `plugins/compound-engineering/skills/ce-plan/SKILL.md`（Section 3.4 diagram guidance）
- 相关代码: `plugins/compound-engineering/skills/onboarding/SKILL.md`（ASCII diagram generation、width constraints）
- 相关 brainstorms: `docs/brainstorms/2026-03-17-release-automation-requirements.md`（would have benefited from flow diagram）
- 相关 plans: `docs/plans/2026-03-28-001-feat-ce-review-headless-mode-plan.md`（built decision matrix that would have been useful upstream）
- Reference example: printing-press publish skill requirements doc — requirements document 中 ASCII flow diagram（5-step user flow with decision branches）和 architecture diagram（file layout + component responsibilities）的 strong real-world example，含 34 requirements
