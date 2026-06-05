---
title: "feat(ce-review): 为 programmatic callers 添加 headless mode"
type: feat
status: completed
date: 2026-03-28
origin: docs/brainstorms/2026-03-28-ce-review-headless-mode-requirements.md
---

# feat(ce-review): 为 programmatic callers 添加 headless mode

## 概览

向 ce:review 添加 `mode:headless`，让其他 skills 可以 programmatically invoke 它，并在没有 interactive prompts 的情况下接收 structured findings。遵循 document-review headless mode（PR #425）已建立的 pattern。

## 问题框架

ce:review 有三个 modes（interactive、autofix、report-only），但没有一个是为 skill-to-skill invocation 设计的；这类 caller 想要 structured findings 作为 parseable output 返回。Autofix 会 applies fixes 并 writes todos；report-only 是 read-only，输出 human-readable report。两者都不会返回 calling workflow 可 consume and route 的 structured output。（see origin: `docs/brainstorms/2026-03-28-ce-review-headless-mode-requirements.md`）

## 需求追踪

- R1. 添加 `mode:headless` argument，与 existing mode flags 一起 parsed
- R2. 在 headless mode 中，silently apply `safe_auto` fixes（matching autofix behavior）
- R3. 将所有 non-auto findings 作为 structured text output 返回，preserving severity、autofix_class、owner、requires_verification、confidence、evidence[]、pre_existing
- R4. headless mode 中没有 `AskUserQuestion` 或其他 interactive prompts
- R5. 以 clear completion signal 结束，让 callers 能检测 review done
- R6. 遵循 document-review 的 structural output *pattern*（completion header、metadata block、autofix-class-grouped findings、trailing sections），但使用 ce:review 自己的 section headings 和 per-finding fields

## 范围边界

- 不修改 existing three modes（interactive、autofix、report-only）
- 不添加 new reviewer personas，也不改变 review pipeline（Stages 3-5）
- 不构建 specific caller workflow -- 只 enable capability
- 不在本 change 中把 headless invocations 加入 existing orchestrators（lfg, slfg）

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-review/SKILL.md` -- 要修改的 skill（mode detection at line 32, argument parsing at line 19, post-review flow at line 440）
- `plugins/compound-engineering/skills/ce-review/references/review-output-template.md` -- existing output template，含 pipe-delimited tables 和 severity-grouped sections
- `plugins/compound-engineering/skills/ce-review/references/findings-schema.json` -- ce:review findings schema，含 `safe_auto|gated_auto|manual|advisory` autofix_class 和 `review-fixer|downstream-resolver|human|release` owner
- `plugins/compound-engineering/skills/document-review/SKILL.md` -- 要遵循的 headless mode pattern（Phase 0 parsing, Phase 4 headless output, Phase 5 immediate return）
- `tests/review-skill-contract.test.ts` -- 需要扩展的 contract test

### 组织内 learnings

- `docs/solutions/skill-design/beta-promotion-orchestration-contract.md` -- new mode flags 必须与 contract tests atomic extend
- `docs/solutions/skill-design/compound-refresh-skill-improvements.md` -- autonomous modes 只 explicit opt-in（不从 tool availability auto-detect）；borderline cases 保守处理
- `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md` -- 添加 new mode branch 时，walk all mode x state combinations
- `docs/solutions/agent-friendly-cli-principles.md` -- 面向 programmatic callers 的 structured parseable output with stable field contracts

## 关键技术决策

- **Headless is a fourth explicit mode, not an overlay**：每个 mode 都是 self-contained，并有自己的 complete behavior specification。这避免 overlay interactions 带来的 whack-a-mole regressions（per state-machine learning）。Headless 拥有与 autofix 和 report-only 平行的独立 rules section。

- **No shared checkout switching, but NOT safe for concurrent use**：Headless 遵循 report-only 的 checkout guard -- 如果传入 PR/branch target，headless 必须在 isolated worktree 中运行或 stop。但与 report-only 不同，headless 会 mutate files（applies safe_auto fixes）。Callers 绝不能让 headless 与同一 checkout 上的其他 mutating operations 并发运行。headless rules section 应明确说明。

- **Single-pass, no re-review rounds**：Headless 只 apply `safe_auto` fixes 一次，然后返回。不做 bounded fixer loop。Rationale：autofix 使用 max_rounds:2，是因为它在更大 workflow 内 autonomous operates；headless 会把 structured output 返回给 caller，由 caller 决定是否 re-invoke。这样 headless 保持 simple and predictable。Applied fixes 若引入 new issues，可在 caller 选择 subsequent invocation 时被捕捉。

- **Write run artifacts, skip todos**：Run artifacts（`.context/compound-engineering/ce-review/<run-id>/`）提供 headless 做了什么的 audit trail。Todo files 会跳过，因为 caller 会收到 structured findings，并自行 route downstream work。

- **Reject conflicting mode flags**：`mode:headless` incompatible with `mode:autofix` and `mode:report-only`。如果多个 mode tokens 出现，emit error and stop。遵循 "fail fast with actionable errors" principle。

- **Require diff scope with structured error**：像 document-review 在 headless mode 中要求 document path 一样，ce:review headless 要求 diff scope 可确定（branch、PR 或 `base:` ref）。如果 scope cannot be determined，emit structured error：`Review failed (headless mode). Reason: <no diff scope detected | merge-base unresolved | conflicting mode flags>`。不 dispatch agents。相同 structured error format 也用于 conflicting mode flags。

## 开放问题

### 规划期间已解决

- **Fourth mode vs overlay?** Fourth mode。Self-contained behavior avoids overlay ambiguity。（基于 state-machine learning，以及现有三个 modes 都有 independent rules sections 这一事实。）
- **Artifacts and todos?** Write artifacts（audit trail），skip todos（caller routes findings）。Headless 拥有 mutation，但不拥有 downstream handoff。
- **Checkout behavior?** No shared checkout switching。Same guard as report-only，因为 headless callers 需要 stable checkouts。
- **Re-review rounds?** Single-pass。Callers 可在需要时 re-invoke。

### 延后到实现阶段

- **Conflicting flags and missing scope error messages**：decision 已定（reject with structured error），但 exact wording 和 error envelope format deferred to implementation
- run artifact format 是否需要 headless-specific metadata（例如 marking the run as headless）

## 高层技术设计

> *这说明预期做法，并作为 review 的方向性指导，而不是实现规范。实现 agent 应把它当作上下文，而不是要逐字复刻的代码。*

### Mode x behavior decision matrix（mode 行为决策矩阵）

| 行为 | Interactive | Autofix | Report-only | **Headless** |
|----------|------------|---------|-------------|--------------|
| User questions | Yes | No | No | **No** |
| Checkout switching | Yes | Yes | No (worktree or stop) | **No (worktree or stop)** |
| Intent ambiguity | Ask user | Infer conservatively | Infer conservatively | **Infer conservatively** |
| Apply safe_auto fixes | After policy question | Automatically | Never | **safe_auto only, single pass** |
| Apply gated_auto/manual fixes | After user approval | Never | Never | **Never (returned in output)** |
| Re-review rounds | max_rounds: 2 | max_rounds: 2 | N/A | **Single pass (no re-review)** |
| Write run artifact | Yes | Yes | No | **Yes** |
| Create todo files | No (user decides) | Yes (downstream-resolver) | No | **No (caller routes)** |
| Structured text output | No (interactive report) | No (interactive report) | No (interactive report) | **Yes (headless envelope)** |
| Commit/push/PR | Offered | Never | Never | **Never** |
| Completion signal | N/A | Stops after artifacts | Stops after report | **"Review complete"** |
| Safe for concurrent use | No | No | Yes (read-only) | **No (mutates files)** |

### Headless output envelope（headless 输出信封）

遵循 document-review 的 structural pattern，并适配 ce:review 的 schema：

```
Code review complete (headless mode).

Scope: <scope-line>
Intent: <intent-summary>
Reviewers: <reviewer-list with conditional justifications>
Verdict: <Ready to merge | Ready with fixes | Not ready>
Artifact: .context/compound-engineering/ce-review/<run-id>/

Applied N safe_auto fixes.

Gated-auto findings (concrete fix, changes behavior/contracts):

[P1][gated_auto -> downstream-resolver][needs-verification] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix or "none">
  Evidence: <evidence[0]>
  Evidence: <evidence[1]>

Manual findings (actionable, needs handoff):

[P1][manual -> downstream-resolver] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>
  Evidence: <evidence[0]>

Advisory findings (report-only):

[P2][advisory -> human] File: <file:line> -- <title> (<reviewer>, confidence <N>)
  Why: <why_it_matters>

Pre-existing issues:
- <file:line> -- <title> (<reviewer>)

Residual risks:
- <risk>

Testing gaps:
- <gap>
```

`[needs-verification]` marker 只出现在 `requires_verification: true` 的 findings 上。`Artifact:` line 给 callers 提供 full run artifact 路径，以便 machine-readable access to complete findings schema。text envelope 是 primary handoff；artifact 用于 debugging 和 full-fidelity access。

`owner: release` 的 findings 出现在 Advisory section（它们是 operational/rollout items，而不是 code fixes）。`pre_existing: true` 的 findings 无论 autofix_class 如何，都出现在 Pre-existing section。

Omit any section with zero items。如果所有 reviewers fail 或 time out，emit degraded signal：`Code review degraded (headless mode). Reason: 0 of N reviewers returned results.` followed by "Review complete"，让 caller 能检测 failure 并决定下一步。

然后输出 "Review complete" 作为 terminal signal。

## 实现单元

- [ ] **Unit 1：Mode infrastructure（模式基础设施）**

**目标:** 将 `mode:headless` 加入 argument parsing、mode detection，以及 conflicting flags / missing scope 的 error handling。

**需求:** R1, R4

**依赖:** None

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-review/SKILL.md`

**做法:**
- 将 `mode:headless` row 加到 Argument Parsing token table（与 `mode:autofix` 和 `mode:report-only` 并列）
- 将 headless row 加到 Mode Detection table，并给出 behavior summary
- 添加 "Headless mode rules" subsection，与 "Autofix mode rules" 和 "Report-only mode rules" 平行
- 更新 `argument-hint` frontmatter，包含 `mode:headless`
- 添加 conflicting-flag guard：如果 arguments 中出现多个 mode tokens，emit error message listing the conflict and stop
- 添加 scope-required guard：如果 headless mode 无法 without user interaction 确定 diff scope，emit error with re-invocation syntax（matching document-review's nil-path pattern）

**遵循的模式:**
- SKILL.md line 34 处 existing mode detection table structure
- SKILL.md lines 40-54 处 existing mode rules subsections
- document-review SKILL.md lines 12-37 处 document-review Phase 0 parsing and nil-path guard

**测试场景:**
- 成功路径：`mode:headless` token 被 parsed，且 headless mode 被 activated
- 成功路径：`mode:headless` 搭配 branch name 或 PR number 时，两者都能正确 parse
- 错误路径：`mode:headless mode:autofix` 被 rejected，并返回清晰 error
- 错误路径：`mode:headless mode:report-only` 被 rejected，并返回清晰 error
- 边界情况：只有 `mode:headless` 且无 branch/PR、无法确定 scope 时，emit scope-required error

**验证:**
- SKILL.md 在 argument-hint、token table、mode detection table 和 dedicated rules subsection 中包含 `mode:headless`
- Conflicting-flag 和 missing-scope guard text 存在

---

- [ ] **Unit 2：Pipeline behavior adjustments（流水线行为调整）**

**目标:** 为 Stage 1（checkout guard）和 Stage 2（intent ambiguity）添加 headless-specific behavior。

**需求:** R1, R4

**依赖:** Unit 1

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-review/SKILL.md`

**做法:**
- 在 Stage 1 scope detection 中，将 headless 与 report-only 一起加入 checkout guard：`mode:headless` 和 `mode:report-only` 不得在 shared checkout 上运行 `gh pr checkout` 或 `git checkout`。它们必须在 isolated worktree 中运行或 stop。当 headless 因 checkout guard stop 时，emit structured error with re-invocation syntax（例如 "Re-invoke with base:\<ref\> to review the current checkout, or run from an isolated worktree."）。
- 在 Stage 1 untracked file handling 中添加 headless behavior：如果 UNTRACKED list 非空，则只处理 tracked changes，并在 structured output 的 Coverage section 记录 excluded files。Never stop to ask the user -- matches "infer conservatively" pattern。
- 在 Stage 2 intent discovery 中，将 headless 加入 non-interactive path，与 autofix 和 report-only 并列：conservatively infer intent，并把 uncertainty 记录在 Coverage/Verdict reasoning 中，而不是 blocking。
- 所有 changes 都是对 existing conditional text 的 small additions -- 在 report-only 和 autofix 已经区分的位置，把 headless 加入 existing mode lists。

**遵循的模式:**
- SKILL.md line 53 处 existing report-only checkout guard（"mode:report-only cannot switch the shared checkout"）
- SKILL.md（~line 298）处 existing autofix/report-only intent handling

**测试场景:**
- 成功路径：headless mode with a PR target 使用 worktree 或 stop，而不是 switching shared checkout
- 成功路径：headless mode 在 diff metadata thin 时 conservatively infers intent
- 成功路径：headless mode with untracked files 只处理 tracked changes，并 notes exclusions
- 错误路径：headless 因 checkout guard stop，并 emit re-invocation syntax

**验证:**
- SKILL.md 在 checkout guard sections 中将 headless 与 report-only 并列提及
- SKILL.md 在 intent discovery sections 中将 headless 与 autofix/report-only 并列提及
- SKILL.md specifies headless behavior for untracked files（SKILL.md 明确 untracked files 的 headless behavior：proceed, don't prompt）

---

- [ ] **Unit 3：Headless output format 和 post-review flow（headless 输出格式与 review 后流程）**

**目标:** 定义 headless structured text output 和 headless post-review behavior（apply safe_auto, write artifacts, skip todos, output structured text, return completion signal）。

**需求:** R2, R3, R4, R5, R6

**依赖:** Unit 1, Unit 2

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-review/SKILL.md`
- 修改: `plugins/compound-engineering/skills/ce-review/references/review-output-template.md`

**做法:**

*Stage 6 output（Stage 6 输出）：*
- 在 SKILL.md 中添加 headless-specific output section，定义 structured text envelope format
- envelope 遵循 document-review 的 structural pattern：completion header、metadata（scope/intent/reviewers/verdict）、applied fixes count、按 autofix_class 分组的 findings（每个 finding 含 severity/route/file/line）、trailing sections（pre-existing、residual risks、testing gaps）
- Per-finding format：`[severity][autofix_class -> owner] File: <file:line> -- <title> (<reviewer>, confidence <N>)`，并带 Why 和 Suggested fix lines
- Omit sections with zero items（省略零条目的 sections）
- 在 headless mode 中输出这个 structured text，而不是 interactive pipe-delimited table report

*Post-review flow（After Review section，review 后流程）：*
- 在 Step 2（Choose policy by mode）中添加 "Headless mode"，与 autofix 和 report-only 平行
- Headless rules（headless 规则）：不提问；single pass apply `safe_auto -> review-fixer` queue（no re-review rounds）；完全跳过 Step 3 的 bounded loop
- Step 4（Emit artifacts）：headless writes run artifacts（like autofix），但不创建 todo files（caller handles routing from structured output）
- Step 5：headless 在 structured text output 和 "Review complete" signal 后停止。No commit/push/PR。

*Review output template（review 输出模板）:*
- 在 `review-output-template.md` 中添加 "Headless mode format" section，包含 structured text template 和 formatting rules（格式规则）
- 更新 Mode line documentation（Mode line 文档），使其包含 `headless`

**遵循的模式:**
- document-review SKILL.md lines 219-248 处 document-review headless output format（headless 输出格式）
- SKILL.md lines 471-483 处 existing autofix and report-only post-review steps（已有 review 后步骤）
- Existing review-output-template.md formatting rules（现有 formatting rules）

**测试场景:**
- 成功路径：headless mode with safe_auto findings applies fixes，并返回列出 remaining findings 的 structured output
- 成功路径：headless mode with no actionable findings 返回 "Applied 0 safe_auto fixes" 和 completion signal
- 成功路径：headless mode with mixed findings（safe_auto + gated_auto + manual + advisory）applies safe_auto，并在 structured output 中按 autofix_class 返回其余 findings
- 边界情况：headless mode with only advisory findings 返回 structured output，且不应用 fixes
- 边界情况：headless mode with only pre-existing findings 将它们分到 pre-existing section
- 集成：headless output 包含 Verdict line，让 callers 可以做 merge decisions
- 集成：run artifact 写入 `.context/compound-engineering/ce-review/<run-id>/`
- 错误路径：clean review（zero findings）返回 completion signal，且没有 findings sections

**验证:**
- SKILL.md 有 headless output format section，包含 structured text envelope
- review-output-template.md includes headless mode format（review-output-template.md 包含 headless mode format）
- Post-review flow 在 Steps 2、4 和 5 中有 headless branch
- headless mode 中没有可达的 AskUserQuestion 或 interactive prompts

---

- [ ] **Unit 4：Contract test extension（契约测试扩展）**

**目标:** 扩展 `tests/review-skill-contract.test.ts`，assert headless mode contract invariants。

**需求:** R1, R4, R5

**依赖:** Units 1-3

**文件:**
- 修改: `tests/review-skill-contract.test.ts`
- 测试: `tests/review-skill-contract.test.ts`

**做法:**
- 在 existing "documents explicit modes and orchestration boundaries" test 中加入 headless mode presence assertions
- 为 headless-specific contract invariants 添加 new test case：completion signal text、no-checkout-switching guard、artifact behavior、no-todo rule、structured output format presence、conflicting-flags guard
- Assert `mode:headless` appears in argument-hint and mode detection table（断言 `mode:headless` 出现在 argument-hint 和 mode detection table 中）
- Assert headless rules section exists with key behavioral commitments（断言 headless rules section 存在且包含关键行为承诺）

**遵循的模式:**
- `tests/review-skill-contract.test.ts` 中 existing contract test structure -- 对 SKILL.md content 做 string containment assertions

**测试场景:**
- 成功路径：contract test 带所有 headless mode assertions 通过
- 边界情况：如果任何 headless rule text 被意外从 SKILL.md 移除，contract test fails

**验证:**
- `bun test tests/review-skill-contract.test.ts` passes
- Test covers（测试覆盖）：mode detection、checkout guard、artifact/todo behavior、completion signal、conflicting flags guard

## 系统级影响

- **Interaction graph:** 无 new callbacks 或 middleware。Headless mode 是 existing mode-dispatch logic 中的新 branch。Existing callers（lfg, slfg）不变 -- 继续使用 autofix 和 report-only。
- **Error propagation:** 新 error paths（conflicting flags, missing scope）emit text errors and stop。无 cascading failure risk。
- **State lifecycle risks:** Headless writes run artifacts but not todos。若 caller 期待 headless 创建 todos，将不会得到 -- 这是 intentional and documented。
- **API surface parity:** Headless mode 是 skill-to-skill invocation 的 new API surface。Future orchestrators 可采用它，但 existing ones unchanged。
- **Unchanged invariants:** Stages 3-5（reviewer selection、sub-agent dispatch、merge/dedup pipeline）完全 unchanged。findings schema unchanged。confidence threshold（0.60）unchanged。

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| Headless checkout guard text 随时间与 report-only diverges | 二者共享相同 guard language -- 在同一句中 alongside report-only mention headless，使它们保持同步 |
| Caller assumes headless creates todos and depends on them | Headless rules section explicitly states no todos；contract test asserts it |
| Structured output format drifts from document-review's envelope | Format documented in review-output-template.md and tested by contract；changes require deliberate updates |

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-03-28-ce-review-headless-mode-requirements.md](docs/brainstorms/2026-03-28-ce-review-headless-mode-requirements.md)
- 相关代码: `plugins/compound-engineering/skills/ce-review/SKILL.md`, `plugins/compound-engineering/skills/document-review/SKILL.md`
- 相关 PRs: #425（document-review headless mode）
- Learnings（learnings）: `docs/solutions/skill-design/beta-promotion-orchestration-contract.md`, `docs/solutions/skill-design/compound-refresh-skill-improvements.md`, `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`
