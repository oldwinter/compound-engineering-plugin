---
title: "feat(git-commit-push-pr): 为 PR descriptions 添加 conditional visual aids"
type: feat
status: completed
date: 2026-03-29
---

# feat(git-commit-push-pr): 为 PR descriptions 添加条件式 visual aids

## 概览

向 git-commit-push-pr 的 Step 6 添加 visual communication guidance，使 PR descriptions 在变更复杂到值得使用视觉辅助时，可以包含 mermaid diagrams、ASCII art 或 comparison tables。它遵循 ce:brainstorm（#437）和 ce:plan（#440）已经使用的同一 content-pattern-based conditional approach，并适配 PR description 这个 reviewers 快速扫读而不是深入研读的表面。

## 问题框架

涉及 architectural changes、user flow modifications 或 multi-component interactions 的复杂 PRs 目前只有 text-only descriptions。即便 PR 来自包含 visual aids 的 plan，这些视觉内容也不会传递到 PR description。Reviewers 必须只靠 prose 重建 mental model。

PR #442 展示了这一点：它是 cross-target change，包含 6-row decision matrix（确实作为 markdown table 包含了）和 multi-component interaction patterns。但对于涉及 workflow changes、data flow modifications 或 component architecture shifts 的 PRs，description 没有 guidance 要求包含 flow diagrams 或 interaction diagrams，而这些图能显著改善 reviewer comprehension。

gap 在于：ce:brainstorm 和 ce:plan 现在都会在内容值得时生成 visual aids，但下游 PR description，也就是 reviewers 实际最先看到的 artifact，没有等价 guidance。

## 需求追踪

- R1. skill 包含 guidance，说明何时 visual aids 能真正改善 PR description
- R2. Visual aids 基于 content patterns（PR 改了什么）有条件出现，而不是只看 PR size；一个小 PR 如果改变复杂 workflow，也可能值得 diagram；大型 mechanical refactor 可能不需要
- R3. trigger bar 高于 ce:brainstorm 或 ce:plan；PR descriptions 是给 reviewers 扫读，不是深入研读
- R4. 三种 visual aid types：mermaid flow/interaction diagrams、ASCII annotated flows 和 markdown tables（tables 已被现有 "Markdown tables for data" writing principle 部分覆盖）
- R5. 在 generated PR descriptions 中，visual aids 放在 relevance 所在位置 inline，而不是单独 section
- R6. skill 现有 Step 6 structure、sizing table、writing principles 和 state machine flow 保持不变

## 范围边界

- 不为每个 PR 添加 visual aids；guidance 是 conditional，并有显式 skip criteria
- 不修改 sizing table 或其他 Step 6 subsections
- 不触碰 Steps 1-5 或 Steps 7-8（根据 institutional learnings，必须保留 state machine structure）
- 不添加 plan/brainstorm document extraction；这里关注 PR diff，而不是 upstream artifacts

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/git-commit-push-pr/SKILL.md` -- 待修改 skill；Step 6 覆盖 lines 187-333，含 subsections：Detect base branch、Gather branch scope、Sizing the change、Writing principles、Numbering and references、Compound Engineering badge
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`（lines 223-249）-- visual communication pattern："When to include / When to skip" table、format selection、prose-is-authoritative rule
- `plugins/compound-engineering/skills/ce-plan/SKILL.md`（lines 581-612）-- plan-readability visual aids，遵循相同 structural pattern，并与 Section 3.4 disambiguation
- 现有 "Markdown tables for data" writing principle（line 280）-- 已覆盖一种 visual medium（before/after 和 trade-off data 的 tables）；新 guidance 扩展到 mermaid 和 ASCII

### 组织内经验

- git-commit-push-pr skill 被构造为带 explicit transition checks 的 state machine。变更必须严格 additive 到 PR body composition phase；不要 alter 或 reorder git state checks（见 `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`）
- GitHub 在 PR descriptions 中原生渲染 mermaid code blocks（自 2022 年支持）
- docs/solutions/ 中没有关于 mermaid gotchas 或 diagram generation failures 的现有 learnings
- Prose-is-authoritative 是 brainstorm 和 document-review skills 中已建立的 invariant

## 关键技术决策

- **插入点：Writing principles 后新增 `#### Visual communication` subsection（line 290 后），位于 Numbering and references（line 292）之前**：这扩展 writing guidance，而不是 sizing logic。sizing table 决定 description *depth*；visual aids 关乎 *medium*。放在这里保留 flow：size the description -> write it following principles -> add visual aids when warranted -> handle numbering -> add badge。

- **比 sibling skills 更高的 trigger bar**：PR descriptions 是 scanning surface，不是 studying surface。ce:brainstorm 会在 "multi-step user workflow" 触发，ce:plan 会在 "4+ units with non-linear dependencies" 触发。PR triggers 应反映什么会让 *reviewer's job harder without a visual*：触及 3+ interacting components 的 architectural changes、带 non-obvious flow 的 workflow/pipeline changes、state 或 mode changes。"When to skip" list 应显式强化 small/simple changes（已由 sizing table 处理）永不需要 diagrams。

- **超出现有 "Markdown tables for data" principle**：line 280 的现有 bullet 覆盖 performance data 和 trade-offs 的 tables。新的 Visual communication subsection 在自身 format selection list 中纳入 table format guidance（与 sibling skills 的 self-contained pattern 一致），并扩展到 mermaid flow diagrams 和 ASCII interaction diagrams。现有 bullet 保持原样。

- **Self-contained format selection，与 sibling skills 一致**：Skills 不能引用彼此的 guidance。重述 format framework（mermaid default with TB direction、ASCII for annotated flows、markdown tables for comparisons），并按 PR 场景校准。保持 diagrams 比 plan/brainstorm 更小：PR description 通常 5-10 nodes，只有真正复杂变更才到 15。

## 未决问题

### Planning 期间已解决

- **description update workflow（DU-3）是否也需要 visual aid guidance？** 是。DU-3 写着 "write a new description following the writing principles in Step 6." 由于 visual communication guidance 是 Step 6 writing guidance 的一部分，DU-3 会通过现有 reference 自动继承。无需单独添加。
- **是否应将 plan/brainstorm visuals extract 到 PR descriptions？** 否。PR description 应从 branch diff 派生，而不是从 upstream artifacts 派生。如果 diff 显示 workflow change，PR description 应基于 diff 展示的内容绘制 workflow。

### 推迟到 Implementation

- Mermaid node count thresholds 以 5-10 typical、真正复杂变更最多 15 开始（按 Key Technical Decisions）。这些是初始值，需观察初始输出，并在 diagrams 太稀疏或太密集时调整

## 实现单元

- [x] **Unit 1：向 Step 6 添加 visual communication subsection**

**目标：** 向 Step 6 添加 `#### Visual communication` subsection，使用已建立的 "When to include / When to skip" pattern 提供 conditional inclusion guidance。

**需求：** R1, R2, R3, R4, R5, R6

**依赖：** 无

**文件：**

- 修改：`plugins/compound-engineering/skills/git-commit-push-pr/SKILL.md`

**做法：**

- 在 Writing principles section 后（line 290 后）、Numbering and references（line 292）前插入新 subsection
- 使用与 ce:brainstorm 和 ce:plan 相同的 structural template：opening conditional principle、"When to include" table、"When to skip" list、format selection guidance、prose-is-authoritative rule、verification instruction
- 适配 PR-specific content patterns 的 triggers：带 3+ components 的 architectural changes、workflow/pipeline changes、state/mode introduction、带 entity relationships 的 data model changes
- 按 PR scanning context 校准：更高 inclusion bar、更小 diagrams（5-10 nodes typical）、显式 skip small/simple changes
- 引用现有 "Markdown tables for data" writing principle 作为 table guidance，而不是复制它

**遵循的模式：**

- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md` lines 223-249（visual communication section structure）
- `plugins/compound-engineering/skills/ce-plan/SKILL.md` lines 581-612（plan-readability visual aids）

**测试场景：**

- 正常路径：新 subsection 是 syntactically valid markdown，heading level（`####`）与 Step 6 的 sibling subsections 匹配
- 正常路径："When to include" table 包含 PR-appropriate triggers（不是从 brainstorm/plan copy-paste）
- 正常路径："When to skip" list 明确覆盖 small/simple changes，以强化 sizing table
- 边界情况：line 280 的现有 "Markdown tables for data" writing principle 保持不变
- 集成：DU-3 通过现有 "following the writing principles in Step 6" reference 继承新 guidance，不需要修改 DU-3 section

**验证：**

- SKILL.md file 在 Writing principles 与 Numbering and references 之间有新的 `#### Visual communication` subsection
- 该 subsection 遵循 ce:brainstorm lines 223-249 的同一 structural pattern（conditional principle、When to include table、When to skip list、format selection、verification）
- triggers 按 PR descriptions 校准（bar 高于 plan/brainstorm）
- Step 6 description writing guidance area 之外没有变更
- `bun test` passes（如果该 skill 存在 frontmatter 或 structure tests）

## 系统级影响

- **Interaction graph（交互图）:** description update workflow（DU-3）引用 Step 6 writing principles，并自动继承新 guidance。没有其他 skills 引用 git-commit-push-pr 的 internal guidance。
- **Unchanged invariants（不变 invariant）:** Steps 1-5（git state machine）、Step 7（PR creation/update）、Step 8（reporting）不触碰。Step 6 中的 sizing table、numbering/references 和 badge sections 不修改。

## 风险与依赖

| Risk | Mitigation |
|------|------------|
| Visual aids trigger too often, bloating simple PR descriptions | Higher trigger bar than sibling skills + explicit skip for small/simple changes + "Brevity matters" principle already in Step 6 |
| Mermaid diagrams don't render in all PR viewing contexts (email, Slack previews) | Mermaid source is readable as text fallback; TB direction keeps source narrow |
| Diagram accuracy -- no code to validate against | Verification instruction (same as sibling skills) to check diagram matches the diff |

## 来源与参考

- Related PRs（相关 PR）：#437（brainstorm visual aids）、#440（plan visual aids）
- Related plans（相关 plan）：`docs/plans/2026-03-29-001-feat-brainstorm-visual-aids-plan.md`, `docs/plans/2026-03-29-002-feat-plan-visual-aids-plan.md`
- Institutional learning（组织经验）：`docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`
- GitHub mermaid support（GitHub mermaid 支持）：自 2022 年起已确认在 PR descriptions 中原生支持
