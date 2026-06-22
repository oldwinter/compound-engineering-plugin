---
title: Generated documents 与 PR descriptions 中的 conditional visual aids
date: 2026-03-29
category: best-practices
module: compound-engineering plugin skills
problem_type: design_pattern
component: documentation
symptoms:
  - "Generated documents 和 PR descriptions 缺少 visual aids，而这些 visual aids 本可提升 complex workflows 和 relationships 的理解效率"
  - "缺少一致 criteria 来判断何时包含 mermaid diagrams、ASCII art 或 markdown tables"
  - "Dense prose 掩盖了 diagram 可立即澄清的 architectural relationships"
  - "因为 upstream documents 没有包含 visuals，downstream consumers 必须从零 recreate visuals"
root_cause: inadequate_documentation
resolution_type: documentation_update
severity: low
tags:
  - visual-aids
  - mermaid
  - ascii-diagrams
  - markdown-tables
  - pr-descriptions
  - skill-design
  - document-generation
---

# Generated documents 与 PR descriptions 中的 conditional visual aids

## 问题

AI-generated documents 与 PR descriptions 默认输出 prose-only，即使内容 -- multi-step workflows、behavioral mode comparisons、multi-participant interactions、dependency structures -- 通过 visual aid 可以显著更快理解。gap 不是 "没有 diagrams"。真正的 gap 是没有 principled framework 来判断 visual aid 何时值得占位、该用哪种 format，以及如何为不同 output surfaces calibration。

---

## 症状

- Readers 必须从 dense prose paragraphs 中 mentally reconstruct workflows、dependency graphs 或 mode differences
- Downstream consumers（ce:plan reading a brainstorm、reviewers reading a PR）因为 upstream document 没有 visuals，而从零创建自己的 visual aids
- 包含 5+ implementation units 且有 non-linear dependencies 的 plans，迫使 readers 扫描每个 unit 的 Dependencies field 来重建 execution graph
- System-Wide Impact sections 命名多个 interacting surfaces 时像一堵 prose wall，而 component diagram 几秒即可 scan
- architecturally significant changes 的 PR descriptions 是 text-only，尽管它们来自包含 visual aids 的 plans
- 简单、线性的 documents 包含 diagrams，但它们只是在视觉上重复 prose，没有 comprehension value

---

## 不奏效的做法

- **Always adding diagrams** -- 按 depth classification、document length 或 PR size 把 visual aids 当作 mandatory，会制造 noise。反射式加入 diagrams 会训练 readers 跳过它们。
- **Never adding diagrams** -- prose-only output 在 branching flows、mode comparisons 或 multi-participant interactions 上失败。Downstream consumers 最终自己构建 visuals。
- **Wrong diagram type for the content** -- 当价值在每个 step 的 rich annotations（CLI commands、decision logic）中时，使用 mermaid flow diagram 会剥离有用细节。
- **Wrong abstraction level for the surface** -- brainstorm diagram 中的 code-level detail 太早。plan 的 Technical Design section 中的 product-level user flows 抓错重点。PR description 中过大的 diagrams 会拖慢 reviewers。
- **Size/depth as the trigger** -- 按 "Standard" 或 "Deep" depth classification，或按 PR line count gate visual aids，会产生 false positives（长但简单的 docs 出现 unwanted diagrams）和 false negatives（短但复杂的 docs 没有 diagrams）。

---

## 解决方案：Conditional Visual Aid Pattern

Visual aids 取决于 **content patterns** -- 内容描述了什么 -- 而不是 document size、depth classification 或 surface type 本身。内容显著更容易用 visual aid 理解时就加入；prose 已清楚表达概念时就跳过。

### 1. Content-Pattern Triggers（不是 Size/Depth Triggers）

是否加入 visual aid 取决于内容描述了 WHAT，而不是有 HOW MUCH 内容。关于 complex workflow 的 Lightweight brainstorm 可能值得 diagram；关于 straightforward feature 的 Deep brainstorm 可能不需要。

| Content describes...（内容描述） | Visual aid type（visual aid 类型） | Notes（说明） |
|---|---|---|
| 带 branching 的 multi-step workflow 或 process | Flow diagram (mermaid or ASCII) | 展示 sequence、branches、decision points |
| 3+ behavioral modes、variants 或 states | Comparison table (markdown) | 展示 modes 在不同 dimensions 上的差异 |
| 3+ interacting participants（roles、components、services） | Relationship/interaction diagram (mermaid or ASCII) | 展示谁和谁通信，以及顺序 |
| 多个 competing approaches 或 alternatives | Comparison table (markdown) | Structured side-by-side evaluation |
| 4+ units/stages 且有 non-linear dependencies | Dependency graph (mermaid) | 展示 parallelism、fan-in/fan-out、blocking order |
| Data pipeline 或 transformation chain | Data flow sketch (mermaid or ASCII) | 展示 input/output transformations |
| State-heavy lifecycle | State diagram (mermaid) | 展示 transitions 和 guards |
| Before/after performance 或 behavioral changes | Comparison table (markdown) | Structured quantitative comparison |

**为什么 content patterns 优于 size thresholds：** Size 与 structural complexity 只弱相关。一个 200-line brainstorm 讲简单 CRUD feature，结构上很简单。一个 50-line brainstorm 讲 multi-actor authorization workflow，结构上很复杂。Pattern-based triggers 能正确区分这些；size-based triggers 不能。

**通用 skip criteria:**
- Prose 已清楚传达概念
- Diagram 只会以视觉形式复述内容，没有增加 comprehension value
- 内容简单且线性，没有 multi-step flows、mode comparisons 或 multi-participant interactions
- Visual 在该 surface 上描述了错误 abstraction level 的 detail
- 三个或更少 items 的 straight chain -- text 足够
- Diagram 只有 3 nodes 或更少 -- 它增加 ceremony，而不增加理解

### 2. 如何选择 Visual Aid

```
                    +---------------------------+
                    | Does the content warrant   |
                    | a visual aid at all?        |
                    +-------------+-------------+
                                  |
                         +--------+--------+
                         |                 |
                        No                Yes
                         |                 |
                    Skip entirely    What kind of content?
                                         |
                    +--------------------+--------------------+
                    |                    |                    |
              Flows/sequences     Comparisons/data     Relationships
                    |                    |                    |
              +-----+-----+       Markdown table       +-----+-----+
              |           |                            |           |
         Annotation    Simple flow               Simple graph   Complex
         density high? (5-15 nodes)              (5-15 nodes)   spatial
              |           |                            |        layout
              |        Mermaid                      Mermaid        |
           ASCII                                                ASCII
```

**Mermaid diagrams（大多数 flow 与 relationship content 的默认选择）**

- Best for（适合）：simple flows（5-15 nodes）、dependency graphs、sequence diagrams、state diagrams、component diagrams
- Strengths（优势）：在 GitHub 中渲染为 SVG；source text 在 email、Slack、terminal、diff views 中作为 fallback 仍可读；syntax 标准化；易维护
- Limitations（限制）：不擅长 rich in-box annotations；node labels 必须 concise；node 内 multi-line content awkward
- 使用 `TB`（top-to-bottom）direction，以便 SVG 与 source fallback 都窄屏友好

**ASCII/box-drawing diagrams（annotation density 高时）**

- Best for（适合）：带 CLI commands、decision logic、file paths 的 annotated flows；multi-column spatial arrangements；价值在 *step 内 annotations* 而不只是 step 间 flow 的 layouts
- Strengths（优势）：everywhere 渲染一致（无 renderer dependency）；更适合 in-box content
- Constraints（约束）：terminal 和 diff view compatibility 要求 max 80-column；用 vertical stacking 适配
- Choose over mermaid when（何时优先于 Mermaid）：diagram 的价值来自每个 box 内写了什么，而不是 graph shape

**Markdown tables（Markdown 表格，structured comparison data）**

- Best for（适合）：mode/variant comparisons（3+ modes）、before/after data、decision matrices、approach evaluations、trade-off summaries
- Strengths（优势）：在 renderers 中自然 wrap；universally supported；scannable form 中承载 dense information
- 任何把 inputs 映射到 outputs，或跨 dimensions 比较 items 的 structured data 都选它

### 3. Surface-Specific Calibration（按输出 surface 校准）

每个 output surface 有不同 reading patterns。trigger bar 和 diagram density 必须调整。

| Surface（输出 surface） | Reading pattern（阅读模式） | Trigger bar（触发门槛） | Abstraction level（抽象层级） | Typical diagram size（典型 diagram 大小） |
|---|---|---|---|---|
| Requirements (ce-brainstorm) | Studied deeply | Standard | Conceptual/product-level: user flows, information flows, mode comparisons | 5-20 nodes |
| Plan -- Technical Design (ce-plan 3.4) | Studied deeply | Work-characteristic-driven | Solution architecture: component interactions, data flow, state machines | 5-15 nodes |
| Plan -- Readability (ce-plan 4.4) | Studied deeply | Standard | Document structure: unit dependencies, impact surfaces, mode overviews | 5-15 nodes |
| PR description (git-commit-push-pr) | Scanned quickly | High | Change impact: what changed architecturally, what flows differently | 5-10 nodes |

关键区别：
- **Brainstorm**: 仅 conceptual level。没有 implementation architecture、data schemas 或 code structure。
- **Plan Technical Design vs. Plan Readability**: Section 3.4 diagrams 描述 *正在构建什么*。Section 4.4 diagrams 帮助 readers *理解 plan document 本身*。两者 complementary，不重叠。
- **PR description**: highest bar。只有当 change 涉及 reviewer 难以仅从 prose 重建的 structural complexity 时才包含。来自 branch diff，而不是 upstream plan/brainstorm artifacts。

### 4. Layout 与 Cross-Device Optimization

**Mermaid 使用 TB direction。** Top-to-bottom diagrams 在 rendered SVG 和 source text fallback 中都保持窄。这对以下场景重要：
- GitHub 的 PR description view（horizontal space 有限）
- Side-by-side diff views（source text 显示为 code block）
- Email/Slack notifications（只有 source text 会 render）

**ASCII max 80-column。** Terminal windows、diff views 和 email clients 在超过 80 columns 后会 clip 或 wrap。用 vertical stacking 让 complex content 适配 column limits。

**Proportionality: 典型为 5-15 nodes。** 每个 node 都应 earn its place：
- Simple 5-step workflow（简单 5 步 workflow） -> 5-10 nodes
- 带 decision branches 的 complex workflow -> 如果每个 node 都值得，可到 15-20 nodes
- PR descriptions 倾向更小（5-10 nodes）；brainstorms 和 plans 可更大
- 超过 15 应仅因为内容确实有那么多 meaningful steps

**Mermaid source as text fallback。** 许多 consumers 第一次接触 generated documents 时所处 contexts 不 render mermaid：
- PR descriptions 的 Email notifications（邮件通知）
- Slack link previews（Slack 链接预览）
- Terminal diff views 与 `git log` output
- RSS readers（RSS 阅读器）
Source text 必须作为 text 可读。TB direction 和 concise node labels 有帮助。

**Inline placement at point of relevance。** 始终把 visual aids 放在有助 comprehension 的地方：
- Workflow diagram 放在 Problem Frame 后，而不是 "Diagrams" appendix
- Dependency graph 放在 Implementation Units heading 前或后
- Comparison table 放在讨论 modes 或 alternatives 的 section 内
- 单独 "Diagrams" section 会邀请为了 diagram 而 diagram
- Exception: substantial flows（>10 nodes）可在 relevant point 附近有自己的 heading

---

## 为什么有效

conditional、content-pattern-based approach 把 inclusion decision 绑定到内容本身的 observable property，而不是 proxy metric。这在两端都产生正确 decisions：关于 complex multi-actor workflow 的短 brainstorm 会得到 diagram（trigger 匹配）；关于 straightforward feature 的长 brainstorm 不会得到 diagram（没有 trigger 匹配）。

Surface-specific calibration 确保同一个 core principle -- "include when content patterns warrant it" -- 可适配 consumption context。随着 reading pattern 从 deep study 转向 quick scanning，trigger bar 升高，diagram sizes 缩小。

每个 skill 自包含 format selection（而不是 cross-references）让 skills 独立可用，同时 shared structural patterns（When to include / When to skip / Format selection / Prose-is-authoritative）保持一致性。

prose-is-authoritative invariant 解决 trust problem：diagram 与 prose 不一致时，以 prose 为准。reviewers 或 implementers 不会有 ambiguity。

---

## 预防措施

任何生成带 visual aids 文档的 skill，都应遵循这些 concrete guidance：

1. **使用 content-pattern triggers，不用 size/depth gates。** 定义明确 "When to include" table，将 content patterns 映射到 visual aid types。绝不要按 depth classification 或 line count gate。

2. **定义 explicit skip criteria。** 每个 "When to include" 都需要 "When to skip"。至少包含：prose 已清楚、diagram 会无价值复述、content 简单/线性、visual abstraction level 错误。

3. **每个 skill 自包含 format selection。** 每个 skill 包含自己的 format guidance（mermaid、ASCII、markdown tables），并按 surface calibration。不要 cross-reference 其他 skills 的 guidance。

4. **按 surface reading pattern calibration。** 相对于 consumption context 定义 trigger bar。Studied surfaces 用 standard bar；scanned surfaces 用更高 bar 和更小 diagrams。

5. **指定 abstraction level。** 说明该 surface 的 visual aids 应包含什么 detail level。"Conceptual level only -- not implementation architecture" 是 brainstorm 示例。

6. **Enforce prose-is-authoritative。** 说明 visual aid 与 prose 不一致时，以 prose 为准。Cross-skill invariant。

7. **要求 post-generation accuracy check。** 生成任何 visual aid 后，验证它匹配 surrounding content -- sequence 正确、没有 missing branches、没有 merged steps、没有 omitted participants。

8. **Mermaid 使用 TB direction，ASCII max 80-column。** cross-device compatibility 的 layout constraints。

9. **Inline 放在 relevant point。** 永远不要创建单独 "Diagrams" section。

10. **保持 diagrams proportionate。** 每个 node 都 earn its place。典型 5-15 nodes。只有真正复杂的 content 才超过 15。

---

## 相关 Issues（相关 issue 与 PR）

- `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md` -- 相关但不同：覆盖 git-commit-push-pr state machine correctness，不是 output content quality
- GitHub issue #44 -- mermaid dark mode rendering，与 diagram styling 相关
- PR #437 -- ce:brainstorm visual aids implementation（visual aids 实现）
- PR #440 -- ce:plan visual aids implementation（visual aids 实现）
- `docs/plans/2026-03-29-003-feat-pr-description-visual-aids-plan.md` -- git-commit-push-pr visual aids plan（visual aids plan）
