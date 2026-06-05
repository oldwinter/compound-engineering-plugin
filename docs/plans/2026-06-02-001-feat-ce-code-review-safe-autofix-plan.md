---
title: "feat: ce-code-review 的安全自应用修复"
type: feat
status: active
date: 2026-06-02
---

# feat: ce-code-review 的安全自应用修复

## 概览

将 auto-fixing 重新引入 `ce-code-review`，但作为 lightweight、judgment-based **act policy**，源自关于不再使用 review-only refactor 移除的 heavyweight `mode:autofix` machinery 的讨论。reviewer（或拥有 tree 的 agent）应用它有信心的 fixes，以清晰方式 surface 它们；safety 来自这些 work 是**由 smart agent 处理、在 visible diff 中可逆的 edits**，而不是来自 permission gate。

这有意部分回退 `refactor/ce-code-review-review-only` 的 "review-only, never mutate" stance。review-only refactor 解决了两个真实问题（apply *machinery* complexity，以及 orchestration interruption）。本 plan 保留这两个解决结果，同时恢复 main-branch version 曾经那种 "it just took things off my plate" 的愉悦感。

## 问题框架

review-only refactor 是过度校正。它混淆了两件可分离的事情：

- **Bad（正确移除）：** apply *machinery*，包括 `mode:autofix`、`autofix_class`-as-permission、in-skill batching/subagent-dispatch/residual-gate。这增加了复杂度，并允许 review mutate 一个由 upstream orchestrator（ce-work）管理的 tree，从而中断 pipeline。
- **Good（错误移除）：** 一种 narrow、behavior-preserving、自动发生的 convenience。例如 main-branch run 会 auto-apply test hardening（"assert the no-op stays a no-op," "cover the unknown-id/empty-array guards"），并在 "Applied automatically" table 中报告。

确定方案前，探索并拒绝了两个失败 framings：

1. **"Apply only when sure / when unsure, report."** Agents 本来就 conservative；"when unsure, report" 这种拇指规则会复合成 "reports everything, fixes nothing." 控制点被放成 *precondition gate*（行动前判断 safety），这正是让 smart agents hedge 的东西。
2. **Categorical deny-list**（"never auto-apply security / contracts / migrations / **anything needing product judgment**"）。"Product judgment" 是可被 game 的 escape hatch，几乎任何 change 都能被推理进它；列表其余部分主要防的是 code-review fix 本来就不会做的 actions：**code-review fixes 是对 git tree 的 edits，构造上可逆，并在 diff 中可见。** 处理 migration finding 是编辑文件，不是运行 migration；处理 payments finding 不是 charge a card。告诉 smart agent "auth is high-stakes" 只是告诉它已经知道的事，`AGENTS.md` 也警告过这种 over-prescription。

## 对话中确定的决策

- **通过移动 guardrail 控制 downside，而不是 gating action。** 对 reversible、visible edits，控制发生在 *after*（revert）、*ambient*（diff + smart agent），以及 *permanence step*；permanence step 是 **push**，不是 commit（local commit 是 private 且 reversible）；而不是 *before*（precondition）。**Gate the push, not the action.**
- **保持 act policy minimal 且 judgment-based，并加入 bias-to-act framing。** 整个 apply policy 只有几行：应用 clear improvements；当 reviewer 错时 push back（不要 apply）；defer 需要 decision 的内容。这可行，因为 agent 足够聪明，唯一 guardrail 是 judgment（"push back if wrong"）。添加显式 anti-conservatism instruction，避免 agent 对 clear、reversible improvements hedge。
- **No deny-list。** 完全移除。唯一真实 residual（auth/contract/concurrency edits 的 "green tests != safe"）通过在 report 中 prominent surface 处理，而不是 block。
- **tree-owner acts。** 谁拥有 working tree，谁 apply。这消解 orchestration-interruption 的伤痕。
- **将 richer signal 保持为 *signal*，而不是 gate。** Severity（P0-P3）、confidence anchors、cross-reviewer agreement 和 `autofix_class` 继续存在，并告知 *what to act on first* 以及 *how prominently to surface*，但它们不 mechanical gate apply decision。decision 是 agent judgment。

## 需求追踪

- **R1. Act policy.** 对 findings 行动时，默认应用每个 clear improvement 且 reversible edit 的 finding，不管 severity。reviewer 错时 push back（不 apply），并说明理由。用 judgment skip taste/conflicting findings，但要 **surface** skipped 内容；永不 silent drop。明确将把 clear、reversible improvement 因 "to be safe" 而不应用定义为 failure mode。
- **R2. Tree-owner-acts placement.** review 在 **default (interactive) mode** 中自行 apply fixes，也就是它是 top-level agent 时。在 `**mode:agent**`（machine-handoff mode；`mode:headless` 是 deprecated alias，`mode:report-only` ignored）中，review 保持 **report-only**，caller apply。这保留 programmatic callers 依赖的 read-only contract，并移除 interruption。
- **R3. Scope correctness invariant.** 只在被 review 的 tree 上 apply（`local-aligned` / standalone）。在 `pr-remote` / `branch-remote` 中，working tree 不是 reviewed head，因此不 apply，只 report。（这是 correctness，不是 safety gate。）
- **R4. Verify-then-keep.** apply 后运行 relevant tests/lint。失败则 revert 该 fix，并改为将其作为 finding report。这是 competence（未验证的 fix 不算完成），轻量 framing，不是 ceremonial gate。
- **R5. Legible reporting.** 向 markdown report 添加 **Applied** section（"Applied automatically" table：`# | File | Fix | Reviewer`），再加 one-line validation outcome（例如 "pin tests 4 -> 6; suite 94 pass, lint clean"）。Applied findings 移入 Applied section；其他所有内容留在 severity/actionable tables。没有 `applied_fixes` JSON field：唯一 emit JSON 的 mode（`mode:agent`）是 report-only，不 apply，因此 applied work 只在 default-mode markdown 中 surface。
- **R6. "Green != safe" surfacing.** 已 apply 的 auth/authz、public 或 cross-service contract/schema、concurrency edits 必须在 Applied section 中 prominent flag，让 diff reviewer 看到。是 nudge，不是 block。
- **R7. ce-work apply step adopts the same act philosophy.** `references/review-findings-followup.md` 当前 eligibility filter（"apply only if `suggested_fix` present AND confidence 100/75 AND mechanical AND evidence matches; when unsure, skip"）是 conservative trap。将它 reframe 为 tree-owner 的 bias-to-act，与 R1 一致，让 orchestrated path 不 timid，而 standalone path bold。
- **R8. Explicit non-revival.** 不重新引入 `mode:autofix`、`autofix_class`-as-permission 或 deny-list。保持 apply policy judgment-based。
- **R9. Tests + docs.** 按需更新 `tests/review-skill-contract.test.ts`、numbering fixture、output template 和 skill doc；检查 `ce-work-beta` counterpart。
- **R10. Commit ownership = permanence owner.** permanence gate 是 **push**，不是 commit（local commit 是 private 且 reversible）。在 default (interactive) mode 中，review apply，并且**当 review 前 working tree clean 时，将 fixes 作为 isolated `fix(review):` commit 提交**；在 dirty tree 上，apply 但留给 human commit（fixes 无法与用户 WIP 隔离）。它永不 push。在 `mode:agent` 中，**caller**（ce-work）在自己的 diff review 后 apply 并 commit。这就是 "gate the push, not the action"：apply 和 local commit 都可逆，永不 push。

## 行为规范

### Act policy（行动策略，R1）

skill 携带的 instruction（paraphrase，需在 SKILL.md 中收紧）：

> Default to applying every finding that is a clear improvement and a reversible edit. Don't hedge: the work is a tracked, visible diff you can revert, so leaving a clean fix unapplied "to be safe" is the failure mode, not the safe choice. Push back — don't apply — when the reviewer is wrong, and say why. Skip taste calls and conflicting suggestions using judgment, but list what you skipped and why. Severity, confidence, and cross-reviewer agreement tell you what to do first and what to flag loudly — they don't decide for you.

中文含义：默认应用所有明确改进且可回退的 findings。不要犹豫：工作会形成可见且可 revert 的 tracked diff，因此为了“安全”留下干净 fix 不应用才是 failure mode，而不是 safe choice。reviewer 错时要 push back，不要应用，并说明原因。对 taste calls 和冲突建议用 judgment 跳过，但列出跳过内容和原因。severity、confidence 和 cross-reviewer agreement 只告诉你先做什么、哪些要高亮提醒；它们不会替你做决定。

### 谁行动、谁 commit（R2, R10）

只有两个 modes：**default**（interactive markdown）和 `**mode:agent**`（machine handoff；`mode:headless` aliases it，`mode:report-only` ignored）。

| Invocation | Tree/permanence owner | Apply | Commit |
| --- | --- | --- | --- |
| Default (interactive) | The human | Review applies + verifies + reports Applied section | **Commit when the pre-review tree was clean** — isolated `fix(review):` commit. On a dirty tree, apply but leave the fixes for the human's commit (can't isolate from WIP). Never push. |
| `mode:agent` | The caller (e.g., ce-work) | Review is **report-only**; `applied_fixes: []` | Caller applies *and* commits after its own diff review (ce-work already does `fix(review): ...` today) |

这将之前的 "`mode:agent` changes serialization only" invariant 放宽为 "`mode:agent` is the machine-handoff mode: serialization *and* defer-apply-to-caller." 这是 intentional、explainable evolution，因为 `mode:agent` 已经意味着 "a caller owns the workflow."

**Edge case：default mode run without a human（例如接入 cron/loop）。** Behavior 不变：apply；tree clean 时 commit（否则把 fixes 留给 whatever commits the WIP）；report；永不 push。想在 dirty tree 上 autonomous apply-and-commit 的 operators 应使用 `mode:agent` 加拥有 commit 的 caller（ce-work）。不为此新增第三种 mode。

### Output（输出，R5）

Markdown（top-level runs），在 severity tables 上方新增 section：

```markdown
### Applied (safe, verified)

| # | File | Fix | Reviewer |
|---|------|-----|----------|
| 1 | `worktrees.test.ts:2987` | no-op test now asserts isPinned stays unchanged | testing |

Validation: pin tests 4 -> 6; worktrees.test.ts 94 pass, lint clean.
```

JSON（`mode:agent`，以及 top-level runs 的 machine record）：

```json
"applied_fixes": [
  { "n": 1, "file": "worktrees.test.ts", "line": 2987, "fix": "...", "reviewer": "testing", "verified": true }
]
```

在 `mode:agent` 中，`applied_fixes` 为空（caller applies），同一批 findings 像今天一样出现在 `actionable_findings` 中。

## 非目标

- 不复活 `mode:autofix`；完全不设 autofix *mode*。
- 不设 `autofix_class`-as-permission gate；该 class 只保留为 caller-handoff signal。
- 不设 deny-list / "product judgment" category。
- 不把 confidence anchor 用作 apply gate（它仍是 synthesis/surfacing signal）。
- 不修改 reviewer selection、scope detection 或 merge/dedup pipeline。

## 实施映射

- `plugins/compound-engineering/skills/ce-code-review/SKILL.md`
  - 在 synthesis/output phase inline 添加 act policy + bias-to-act framing（R1，load-bearing）。
  - 向 apply guidance 添加 who-acts table（R2）和 scope invariant（R3）。
  - 添加 verify-then-keep（R4）和 "green != safe" surfacing nudge（R6）。
  - 将 skill 重新记录为 "review + safe self-apply when top-level; report-only as a stage"（operating-principles 的 "review-only" line 改变）。
- `plugins/compound-engineering/skills/ce-code-review/references/review-output-template.md`
  - 添加 **Applied** section + example（R5）；在 agent-mode subsection 中 note `applied_fixes`。
- `plugins/compound-engineering/skills/ce-code-review/references/action-class-rubric.md`
  - 澄清 routing classes 是 caller-handoff signal，不是 apply gate（R8）。
- `plugins/compound-engineering/skills/ce-work/references/review-findings-followup.md`（加上 `ce-work-beta` counterpart，以及受影响时的 `ce-work` SKILL.md anchor）
  - 将 apply step reframe 为 tree-owner 的 bias-to-act（R7）。
- `tests/review-skill-contract.test.ts`、`tests/fixtures/ce-code-review-stable-numbering.md`
  - 更新 contract assertions：top-level 时 review applies，`mode:agent` 中 report-only；`applied_fixes` field；template 中的 Applied section；no deny-list / no `mode:autofix`。
- `docs/skills/ce-code-review.md`
  - 如果 high-level purpose 改变（review-only -> review + safe self-apply），更新 framing。此次很可能需要。

## 测试计划

- Contract test（contract 测试）：assert SKILL.md carries act policy、who-acts split、scope invariant、verify-then-keep、Applied/`applied_fixes` output contract；assert no `mode:autofix` and no deny-list language。
- Fixture（测试 fixture）：扩展 `ce-code-review-stable-numbering.md`（或新增 fixture），包含 Applied section，并 assert numbering across Applied + severity + Actionable sections remains stable。
- Full suite green（完整 suite 通过） vs. current 47 pre-existing failures（CLI install/cleanup），zero new。

## 已解决决策

- **ce-work apply boldness（R7）。** 与 standalone review 相同的 act policy：bias-to-act、judgment。ce-work 已经会在 committing 前 review diffs，这是它的 permanence gate。
- **Commit behavior（R10）。** permanence gate 是 **push, not the commit**（local commit 是 private 且 reversible）。Interactive review applies，并且**当 review 前 working tree clean 时，将 fixes 作为 isolated `fix(review):` commit 提交**；在 dirty tree 上，apply 但留给用户 commit（fixes 无法与用户 WIP 干净隔离）。它永不 push。`mode:agent` caller applies and commits。不新增第三种 "autonomous top-level" mode。
- **Modes。** 只有 `default` 和 `mode:agent`（`mode:headless` 是 deprecated alias；`mode:report-only` ignored）。早期 draft 中单独的 `mode:headless` apply row 是错误的，已移除。

## 待决问题

1. **Verify granularity（R4）。** 对 touched files 跑 targeted tests，还是多个 files changed 时跑 broader run。倾向：默认 targeted；fixes 跨 files 时 broader（mirror existing Stage 6 validation guidance）。

## Stable/Beta 同步

`ce-code-review` 没有 `-beta` counterpart。`ce-work` 有（`ce-work-beta`），因此 R7 必须传播到 `ce-work/references/review-findings-followup.md` 和 `ce-work-beta/references/review-findings-followup.md`，并在 implementation time 显式说明 sync decision。
