---
date: 2026-03-29
topic: testing-addressed-gate
---

# 关闭 ce:work 和 ce:plan 中的 Testing Gap

## 问题框架

ce:work 有大量 testing instructions——test discovery、test-first execution posture、system-wide test checks，以及 test scenario completeness checklist。但两个狭窄 gaps 会让未经测试的 behavioral changes 静默 slip through：

1. **ce:work 的 quality gate 写着 "All tests pass"**——当没有 tests 存在时，这句话 vacuously true。一个 passing empty test suite 与 passing comprehensive one 无法区分。“No tests” 可能是 deliberate decision，也可能是 accidental omission，而 skill 不区分二者。

2. **ce:plan 允许 blank test scenarios without annotation**——当 plan unit 没有 test scenarios 时，无法判断 planner 是评估过 testing 并确定不需要，还是根本没想到。ce:plan 已经要求 feature-bearing units 有 test scenarios（Plan Quality Bar、Phase 5.1 review），但 non-feature-bearing units 合法地省略它们，而 template 没要求说明原因。

ce:review 中的 testing-reviewer 会在事后通过检查 diffs 的 untested branches 和 missing edge case coverage 捕获其中一些问题。但它不会专门 flag 更宽的 pattern：behavioral changes 没有任何 corresponding test additions。

existing testing instructions 很完整但 generic。gap 不在 instruction 量，而在正确时刻的 specificity。这里针对三层做 focused changes：planning（ce:plan annotation）、execution（ce:work per-task deliberation）和 review（testing-reviewer detection）。

## 需求

**ce:plan -- Handle the Blank Case（处理空白场景）**

- R1. 当 plan unit 没有 test scenarios 时，planner 应 annotate 原因（例如 "Test expectation: none -- config-only, no behavioral change"），而不是留空 field
- R2. feature-bearing unit 上 blank 或 missing test scenarios field 应在 ce:plan Phase 5.1 review 中被视为 incomplete，而不是静默接受

---

**ce:work -- Per-Task Testing Deliberation（逐 task 测试审慎判断）**

- R3. 在标记 task done 之前，ce:work execution loop 应包含 explicit testing deliberation：这个 task 是否改变 behavior？如果是，是否写入或更新 tests？如果没有添加 tests，为什么？这是 action point 上的 deliberation prompt，不是 formal artifact
- R4. Phase 3 quality checklist item "Tests pass (run project's test command)" 和 Final Validation item "All tests pass" 都应更新为 "Testing addressed -- tests pass AND new/changed behavior has corresponding test coverage (or an explicit justification for why tests are not needed)"
- R5. 将 R3 和 R4 应用于 ce:work-beta（AGENTS.md 要求对 beta counterparts 做 explicit sync decisions）

---

**testing-reviewer -- Flag the Missing-Test Pattern（标记缺失测试模式）**

- R6. testing-reviewer agent 应新增 check：当 diff 包含 behavioral code changes（new logic branches、state mutations、API changes）但没有任何 corresponding test additions 或 modifications 时，将其 flag 为 finding
- R7. 这个 check 补充 existing checks（untested branches、weak assertions、brittle tests、missing edge cases）——它捕获那些 checks 漏掉的情况：new behavior 完全没有 tests

**Contract Tests -- Practice What We Preach（用 contract tests 落实规则）**

- R8. 添加 contract tests，验证每个 behavioral change 都按预期 shipped。遵循 `pipeline-review-contract.test.ts` 和 `review-skill-contract.test.ts` 中的 existing pattern（对 skill/agent file content 做 string assertions）：
  - ce:work 在 execution loop 中包含 per-task testing deliberation（R3）
  - ce:work checklist 写 “Testing addressed”，而不是 “Tests pass” 或 “All tests pass”（R4）
  - ce:work-beta mirror testing deliberation 和 checklist changes（R5）
  - ce:plan Phase 5.1 review 将 feature-bearing units 上的 blank test scenarios 视为 incomplete（R2）
  - testing-reviewer agent 包含 behavioral-changes-with-no-test-additions check（R6）

## 成功标准

- 带有 behavioral changes 且没有 test changes 的 diff 会被 testing-reviewer flag（R6）——detective layer 能在真实 artifacts 上捕获它
- 没有 test scenarios 的 ce:plan units 要么有 explicit annotation，要么在 plan review 中被 flag（R1-R2）——preventive layer 在 planning time 运作
- ce:work execution loop 会逐 task 提示 testing deliberation，checklist 让 agent 显式考虑 testing 是否 addressed，而不仅是 suite 是否 green（R3-R4）
- 带 justification 的 “No tests needed” 仍是 valid outcome——目标是 deliberate decisions，不是强制 ceremony

## 范围边界

- 不添加 CI-level enforcement 或 programmatic gates——这些是 prompt-level changes
- 不添加 “testing assessment artifacts” 或 structured output schemas 等新 abstractions
- 不强制 coverage thresholds 或 specific testing frameworks
- 不改变 testing-reviewer output format——只在其 existing review protocol 中添加一个 check

## 关键决策

- **Layered approach -- deliberation + detection**：ce:work 的 per-task deliberation（R3）在 action point 提示 agent 思考 testing。testing-reviewer（R6）作为 backstop 作用于 actual diff。正确时刻的 instruction specificity 很重要——“did you address testing for this task?” 比 “tests pass” targeted 得多。
- **Targeted edits over a new system**：不引入 “testing assessment gate” abstraction，而是对 ce:plan、ce:work 和 testing-reviewer 做 focused changes，关闭 identified gaps。
- **Deliberate omission is a first-class outcome**：带 justification 的 “No tests needed” 是 valid。目标是让 “no tests” 成为 deliberate decision，而不是 accidental one。

## 未决问题

### 延后到 Planning 阶段

- [Affects R1][Technical] 对真正不需要 tests 的 plan units，最轻量 annotation 是什么——field、comment，还是 convention？
- [Affects R6][Needs research] review testing-reviewer 当前 check implementation，确定新的 “behavioral changes with no test changes” check 应放在其 analysis protocol 的哪里
- [Affects R3][Technical] ce:work execution loop（Phase 2 task loop）中 testing deliberation prompt 应放在哪里——在 “Run tests after changes” 之后，还是作为 “Mark task as completed” 的一部分？
- [Affects R4-R5][Resolved] ce:work 的 Phase 3 checklist 是 SKILL.md 中的 plaintext markdown（line ~433 和 ~289）。ce:work-beta 有相同 pattern。变更是编辑 bullet points，不需要 dynamic infrastructure。

## 下一步

-> `/ce:plan` 进行 structured implementation planning
