---
title: "feat: 补上 ce:work、ce:plan 与 testing-reviewer 的 testing gap"
type: feat
status: active
date: 2026-03-29
origin: docs/brainstorms/2026-03-29-testing-addressed-gate-requirements.md
---

# feat: 补上 ce:work、ce:plan 与 testing-reviewer 的 testing gap

## 概览

对三个 skill/agent files 做 targeted edits，使 "no tests" 成为 deliberate decision，而不是 accidental omission。在 ce:work 的 execution loop 中加入 per-task testing deliberation，在 ce:plan review 中处理 blank-test-scenarios，并在 testing-reviewer agent 中加入 missing-test-pattern check。按现有 repo pattern 一起交付 contract tests。

## 问题框架

ce:work 有详尽 testing instructions，但两个 narrow gaps 会让 untested behavioral changes 静默滑过：quality gate 写的是 "All tests pass"（没有 tests 时 vacuously true），ce:plan 允许 blank test scenarios 且不要求 annotation。testing-reviewer 事后能抓一些 gaps，但没有 flag "behavioral changes with zero test additions" 这个 broad pattern。（see origin: docs/brainstorms/2026-03-29-testing-addressed-gate-requirements.md）

## 需求追踪

- R1. 没有 test scenarios 的 ce:plan units 应 annotate 原因，而不是留空 field
- R2. Feature-bearing units 上的 blank test scenarios 在 Phase 5.1 review 中视为 incomplete
- R3. ce:work execution loop 在 mark task done 前做 per-task testing deliberation
- R4. Quality checklist 和 Final Validation 从 "Tests pass" 更新为 "Testing addressed"
- R5. 将 R3 与 R4 应用到 ce:work-beta，并给出 explicit sync decision
- R6. testing-reviewer 添加一个 check，检测 behavioral changes with no corresponding test additions
- R7. 新 check 补充现有 checks（untested branches、weak assertions、brittle tests、missing edge cases）
- R8. 交付 contract tests，验证每个 behavioral change 按预期 shipped

## 范围边界

- 仅 prompt-level changes -- 无 CI enforcement、无 programmatic gates
- 不新增 abstractions（无 "testing assessment artifacts" 或 structured output schemas）
- 不修改 testing-reviewer 的 output format（findings JSON 保持不变）
- 带 justification 的 deliberate test omission 是 valid outcome

## 上下文与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-plan/SKILL.md` -- Phase 5.1 review checklist at lines 583-601，test scenario quality checks at lines 591-592。两个 edit sites：line 339（section 3.5）Test scenarios 的 instruction prose，以及 line 499 带 HTML comment 的 plan output template
- `plugins/compound-engineering/skills/ce-work/SKILL.md` -- Phase 2 task loop at lines ~143-155，Final Validation at lines 287-295（"All tests pass"），Quality Checklist at lines 427-443（"Tests pass (run project's test command)"）
- `plugins/compound-engineering/skills/ce-work-beta/SKILL.md` -- 相同 loop/checklist structure。Final Validation at lines 296-304，Quality Checklist at lines 500-516
- `plugins/compound-engineering/agents/review/ce-testing-reviewer.agent.md` -- "What you're hunting for" 中 4 个 existing checks（lines 15-20）、confidence calibration（lines 22-29）、output format（lines 37-48）
- `tests/pipeline-review-contract.test.ts` -- ce:work、ce:work-beta、ce:brainstorm、ce:plan 的 contract tests，使用 `readRepoFile()` + `toContain`/`not.toContain` assertions
- `tests/review-skill-contract.test.ts` -- ce:review agent 的 contract tests，使用同样 pattern，包含 frontmatter parsing 和 cross-file schema alignment

### 组织经验

- 根据 AGENTS.md（lines 161-163），Beta-to-stable sync 必须 explicit。现有 `pipeline-review-contract.test.ts` 已测试 ce:work-beta mirrors ce:work's review contract -- 遵循同一 pattern。
- Skill review checklist 警告不要在 phases 之间制造 contradictory rules -- 新的 "testing deliberation" 必须补充而不是 contradict 现有 "Run tests after changes" instruction。
- 使用 negative assertions（`not.toContain`）防止 regression -- 断言旧的 "Tests pass" / "All tests pass" language 被完全替换。

## 关键技术决策

- **Testing deliberation 放在 loop 中 "Run tests after changes" 之后**：这是自然 deliberation point -- tests 刚刚运行（或未运行），agent 应在 mark task done 前评估 testing 是否 adequately addressed。放得更早（test execution 前）会 premature；放在 "Mark task as completed" 会与 completion bookkeeping 混在一起。
- **Annotation 使用现有 template field，不新增 field**：`Test expectation: none -- [reason]` 放在 Test scenarios section，而不是新增 template field。这保持 template stable，并复用现有 Phase 5.1 check surface。
- **新的 testing-reviewer check 是第 5 个 bullet，不替代任何现有项**：它与 check #1（new code 内 untested branches）概念不同。Check #1 看已有 tests 中的 branch coverage；新 check flag 完全没有 tests 的 behavioral changes。
- **Contract tests 扩展现有 files**：新的 ce:work/ce:plan assertions 放入 `pipeline-review-contract.test.ts`。Testing-reviewer assertion 放入 `review-skill-contract.test.ts`。遵循现有 convention，不新建 file。

## 开放问题

### 规划期间已解决

- **testing deliberation 放在 loop 哪里？** 在 "Run tests after changes"（bullet 8）之后、"Mark task as completed"（bullet 9）之前。agent 刚刚 run 或 skip tests -- 现在做 deliberation。
- **没有 tests 的 units 用什么 annotation format？** 在 Test scenarios field 中写 `Test expectation: none -- [reason]`。遵循现有 template structure。
- **new check 放在 testing-reviewer 哪里？** "What you're hunting for" 中 existing 4 checks 之后的第 5 个 bullet。
- **新 test file 还是扩展 existing？** 扩展 existing -- skill changes 用 `pipeline-review-contract.test.ts`，agent change 用 `review-skill-contract.test.ts`。

### 延后到实现阶段

- execution loop 中 testing deliberation prompt 的 exact wording -- 应 concise 且 action-oriented，final phrasing 在 implementation 中确定
- testing-reviewer 的 "What you don't flag" section 是否需要对应 exclusion，用于 non-behavioral changes（config、formatting、comments）-- implementation 时 inspect

## 实施单元

- [ ] **Unit 1：ce:plan -- Blank test scenarios handling（处理空白 test scenarios）**

**目标:** 让 feature-bearing units 上的 blank test scenarios 在 plan review 中被 flag as incomplete，并为确实不需要 tests 的 units 建立 annotation convention。

**需求:** R1, R2

**依赖:** None

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-plan/SKILL.md`

**方法:**
- ce:plan 中 annotation convention 有两个 edit sites：
  - 描述如何编写 Test scenarios 的 instruction prose（section 3.5，around line 339）-- 在这里提到 `Test expectation: none -- [reason]` convention，使 planner agent 读取 instructions 时学到它
  - plan output template（around line 499），其中包含 HTML comment `<!-- Include only categories that apply to this unit. Omit categories that don't. -->` -- 更新 comment，同时展示 no test scenarios units 的 annotation convention
- 在 Phase 5.1 review checklist（line 592 后）加入新 bullet：feature-bearing unit（按 ce:plan 现有 Plan Quality Bar language 定义）上的 blank 或 missing test scenarios 应 flag as incomplete
- 在 Phase 5.3.3 confidence-scoring checklist for Implementation Units（around line 717）添加 parallel item，使 confidence check 也捕获 blank test scenarios

**遵循模式:**
- lines 591-592 的 existing Phase 5.1 test scenario quality checks
- line 499 的 unit template comment style
- ce:plan 在 Plan Quality Bar 中现有 "feature-bearing unit" terminology

**测试场景:**
- Happy path：Plan 有 feature-bearing unit，test scenarios 中写 `Test expectation: none -- config-only change` -> Phase 5.1 review accepts it
- Error path：Plan 有 feature-bearing unit，Test scenarios field 完全 blank/absent -> Phase 5.1 review flags it as incomplete
- Happy path：Plan 有 non-feature-bearing unit（scaffolding、config），使用 annotation -> accepted without issue

**验证:**
- Phase 5.1 checklist 明确处理 blank test scenarios
- Plan template comment 提到 `Test expectation: none -- [reason]` convention
- Confidence scoring checklist 包含 blank test scenarios 作为 scoring trigger

---

- [ ] **Unit 2：ce:work 与 ce:work-beta -- Testing deliberation 和 checklist update（测试审慎判断与 checklist 更新）**

**目标:** 在 execution loop 中加入 per-task testing deliberation，并将两个 checklist surfaces 从 "Tests pass" 更新为 "Testing addressed."

**需求:** R3, R4, R5

**依赖:** None

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-work/SKILL.md`
- 修改: `plugins/compound-engineering/skills/ce-work-beta/SKILL.md`

**方法:**
- 在 Phase 2 task execution loop（ce:work lines ~143-155，ce:work-beta lines ~144-156）中，在 "Run tests after changes" 和 "Mark task as completed" 之间添加 **new bullet**。该 bullet 提示 agent 评估：这个 task 是否改变 behavior？如果是，是否写/更新了 tests？如果没有添加 tests，justification 是什么？保持 concise -- 一个 bullet 内 2-3 个 questions，匹配现有 loop bullet style。不要扩展成 multi-paragraph section
- 在 Quality Checklist（ce:work line ~433，ce:work-beta line ~506）中，将 `- [ ] Tests pass (run project's test command)` 替换为 `- [ ] Testing addressed -- tests pass AND new/changed behavior has corresponding test coverage (or an explicit justification for why tests are not needed)`
- 在 Final Validation（ce:work line ~289，ce:work-beta line ~298）中，将 `- All tests pass` 替换为 `- Testing addressed -- tests pass and new/changed behavior has corresponding test coverage (or an explicit justification for why tests are not needed)`
- 确保两个 files 获得 identical changes

**Sync decision:** Propagating to beta -- shared testing deliberation guidance，不是 experimental delegate-mode behavior。

**遵循模式:**
- lines 138-155 的 existing execution loop bullet style
- existing Quality Checklist item style（带 parenthetical guidance 的 checkbox）
- mandatory review pattern（也在 stable 与 beta 之间 identical synced）

**测试场景:**
- Happy path：ce:work execution loop 在正确位置包含 testing deliberation step（after "Run tests" and before "Mark task as completed"）
- Happy path：Quality Checklist 包含 "Testing addressed"，且不包含 "Tests pass (run project's test command)"
- Happy path：Final Validation 包含 "Testing addressed"，且不包含 "All tests pass"
- Integration：ce:work-beta 与 ce:work 有 identical testing deliberation 和 checklist wording

**验证:**
- 两个 files 的 execution loop 都包含 testing deliberation step
- 两个 files 的 Quality Checklist 和 Final Validation 使用 "Testing addressed" language
- 旧的 "Tests pass" 和 "All tests pass" language 从两个 files 中完全移除

---

- [ ] **Unit 3：testing-reviewer -- Behavioral changes with no test additions check（无测试新增的行为变更检查）**

**目标:** 向 testing-reviewer agent 添加第 5 个 check，flag diff 中 behavioral code changes 且没有 corresponding test additions 或 modifications 的情况。

**需求:** R6, R7

**依赖:** None

**文件:**
- 修改: `plugins/compound-engineering/agents/review/ce-testing-reviewer.agent.md`

**方法:**
- 在 "What you're hunting for" 中添加第 5 个 bold-titled bullet（line 20 的 existing 4th check 后）。该 check 应：描述 pattern（behavioral code changes -- new logic branches、state mutations、API changes -- 且 diff 中 zero corresponding test file additions or modifications）、解释它与 check #1 的区别（check #1 看 code that has tests 内的 untested branches；此 check flag 完全没有 tests）、并说明 non-behavioral changes（config、formatting、comments、type-only changes）excluded
- 如果有助 clarity，考虑在 "What you don't flag" 中添加对应 non-behavioral changes item

**遵循模式:**
- Existing check format：bold title 后跟 `--` 和 explanation
- Existing checks 使用 specific、concrete language（"new `if/else`, `switch`, `try/catch`"）
- Confidence calibration tiers（confidence 校准分层；High 0.80+ when provable from diff alone）

**测试场景:**
- Happy path：testing-reviewer.md 的 "What you're hunting for" section 包含 behavioral-changes-with-no-tests check
- Happy path：Check 被描述为 distinct from existing untested-branches check

**验证:**
- testing-reviewer.md 的 "What you're hunting for" 从 4 个 checks 变为 5 个
- new check 专门处理 "behavioral changes with no corresponding test additions"

---

- [ ] **Unit 4：覆盖所有变更的 Contract tests**

**目标:** 添加 contract tests，验证每个 skill/agent modification 按预期 shipped，遵循现有 string-assertion pattern。

**需求:** R8

**依赖:** Units 1, 2, 3

**文件:**
- 修改: `tests/pipeline-review-contract.test.ts`
- 修改: `tests/review-skill-contract.test.ts`

**方法:**
- 在 `pipeline-review-contract.test.ts` 中，扩展 existing `ce:work review contract` describe block，加入 new tests：
  - ce:work includes testing deliberation in execution loop（ce:work 在执行循环中包含 testing deliberation）
  - ce:work Quality Checklist contains "Testing addressed" and does not contain "Tests pass (run project's test command)"（Quality Checklist 包含 "Testing addressed" 且不包含旧测试通过表述）
  - ce:work Final Validation contains "Testing addressed" and does not contain "All tests pass"（Final Validation 包含 "Testing addressed" 且不包含 "All tests pass"）
  - ce:work-beta mirrors all testing deliberation and checklist changes（ce:work-beta 镜像所有 testing deliberation 和 checklist 变更）
- 在 `pipeline-review-contract.test.ts` 中，扩展或添加 `ce:plan review contract` test：
  - ce:plan Phase 5.1 review addresses blank test scenarios on feature-bearing units（ce:plan Phase 5.1 review 覆盖 feature-bearing units 上的空白测试场景）
- 在 `review-skill-contract.test.ts` 中，为 testing-reviewer 添加 new describe block：
  - testing-reviewer includes the behavioral-changes-with-no-test-additions check（testing-reviewer 包含“行为变更但无测试新增”的检查）

对旧 checklist language 使用 negative assertions（`not.toContain`）防止 regression。

**遵循模式:**
- existing contract tests 中的 `readRepoFile()` helper + `expect(content).toContain(...)` / `expect(content).not.toContain(...)`
- pipeline-review-contract.test.ts lines 39-50 的 ce:work-beta mirror test pattern
- 两个 files 中的 `describe`/`test` block naming convention

**测试场景:**
- Happy path：Units 1-3 完成后，所有 new contract tests pass
- Error path：reverting 任一 skill change 会导致对应 contract test fail（通过 assertion specificity inspection 验证）

**验证:**
- `bun test` passes with the new contract tests
- R3-R7 每个 change surface 至少有一个 contract test assertion

## 系统级影响

- **Interaction graph:** 这些是 prompt-level skill edits。无 callbacks、middleware 或 runtime dependencies。testing-reviewer 由 ce:review 调用，ce:review 由 ce:work 调用 -- chain 是：ce:work -> ce:review -> testing-reviewer。reviewer check list 的变化影响 ce:review surface 什么，但不影响它如何 surface。
- **Error propagation:** 不适用 -- 无 runtime error paths。如果 testing deliberation prompt wording 不好，最坏情况是 agent 忽略它（与今天相同）。
- **API surface parity:** ce:work 与 ce:work-beta 必须按 AGENTS.md 保持 sync。Contract tests enforce 这一点。
- **Unchanged invariants:** testing-reviewer 的 output format（JSON with `findings`, `residual_risks`, `testing_gaps`）不变。plan template structure 不变 -- 只修改 comment 与 Phase 5.1 checklist。

## 风险与依赖

| Risk | Mitigation |
|------|------------|
| Testing deliberation prompt 太 verbose，被 agent 忽略 | 保持 concise -- 2-3 questions，不是 paragraph。匹配 existing loop bullet style。 |
| 旧的 "Tests pass" language 在某处残留，造成 contradiction | Negative contract test assertions（`not.toContain`）捕获任何残留 old language |
| ce:work-beta 与 ce:work drift | Contract tests 明确断言两个 files 包含 identical testing changes |

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-03-29-testing-addressed-gate-requirements.md](docs/brainstorms/2026-03-29-testing-addressed-gate-requirements.md)
- Related learning（相关 learning）: `docs/solutions/skill-design/beta-promotion-orchestration-contract.md`
- Related learning（相关 learning）: `docs/solutions/skill-design/compound-refresh-skill-improvements.md`（avoid contradictory rules across phases）
- Related test（相关 test）: `tests/pipeline-review-contract.test.ts`
- Related test（相关 test）: `tests/review-skill-contract.test.ts`
