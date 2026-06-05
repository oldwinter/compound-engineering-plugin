# Shipping Workflow（交付工作流）

本文件包含 shipping workflow（Phase 3-4）。仅当所有 Phase 2 tasks 完成、execution 转入 quality check 时加载。

## Phase 3：Quality Check（质量检查）

1. **Run Core Quality Checks（运行核心质量检查）**

   提交前始终运行：

   ```bash
   # Run full test suite (use project's test command)
   # Examples: bin/rails test, npm test, pytest, go test, etc.

   # Run linting (per AGENTS.md)
   # Use linting-agent before pushing to origin
   ```

2. **Simplify**（conditional — 独立于 code review tiers）

   code review 前，当 diff 非 mechanical 且大到值得受益时调用 **`ce-simplify-code`**（默认：**>=30 changed lines**）。当 diff 纯 mechanical（formatting、dependency bumps、lint-only fixes、generated artifacts）时跳过。

   本步骤针对**当前 diff**优化 reuse、quality 和 efficiency，让后续 review 看到更干净的代码。它不能替代 Tier 1 或 Tier 2 review。

   当 plan 或用户收窄了变更范围时，传入 `plan:<path>` 或 scope hint。如果 harness 上没有该 skill，跳过或对明显 duplicate/dead code 做一次简短 manual pass；不要因为 simplify 被跳过就升级到 Tier 2。

3. **Code Review（代码审查）**

   当 harness 提供 built-in review 时使用 **Tier 1**。仅当下面的 escalation criteria 匹配时使用 **Tier 2**；**不要**因为 Tier 1 缺失就使用 Tier 2。

   **Tier 1 -- harness-native review（可用时默认）。** 运行 harness built-in code review（例如 Claude Code 中的 `/review`）。在 Final Validation 前 inline 处理 blocking 和 suggested findings。跳过 Residual Work Gate。

   **Tier 2 -- `ce-code-review`（仅升级时）。** 两步：**review is not fix.**

   **2a. Review（read-only）。** 用 `mode:agent` 调用 `ce-code-review`（已知时加 `plan:<path>`；diff base 已 resolve 时加 `base:<ref>`）。解析 JSON 或 Actionable Findings。不要传 `mode:autofix`。

   **2b. Apply fixes（caller-owned）。** 加载 `references/review-findings-followup.md`：按 JSON 过滤，按文件批处理，分派 fix subagents。然后进入 Residual Work Gate。

   **当 Tier 1 不可用且 Tier 2 criteria 未满足时：** 跳过 dedicated review step。Phase 2 testing、simplify（如已运行）、lint 和 Final Validation 仍适用。在 shipping summary 中注明：`Code review: skipped (no Tier 1 tool; Tier 2 criteria not met).`

   当以下**任一**条件为真时，升级到 Tier 2：

   - **Sensitive surface touched.** diff 修改了以下任一项：authentication 或 authorization、payments 或 billing、data migrations 或 backfills、cryptography 或 secret handling、security-relevant configuration、public API 或 library contracts、dependency manifests。
   - **Large and diffuse change.** diff 超过 >=400 changed lines，**且**跨越 3 个以上目录或 2 个 distinct subsystems。单独一个只是 soft signal；两者同时出现才是 escalation trigger。
   - **Very large change.** diff 超过 >=1,000 changed lines，无论是否 diffuse。
   - **Plan or task explicitly requests it.** plan、originating task 或 scope 内其他指令要求 full / deep / thorough code review。

   当变更小、集中且不在 sensitive surface list 内时，Tier 1 足够；不要为了 "to be safe" 而升级。

4. **Residual Work Gate（剩余工作 Gate，Tier 2 运行后 REQUIRED）**

   Tier 2 code review 和 review-findings followup 之后，检查 **Actionable Findings** summary（或读取 `/tmp/compound-engineering/ce-code-review/<run-id>/` 中的 run artifact）。如果一个或多个 actionable `downstream-resolver` findings 未在 followup 中应用，在用户决定如何处理前，不要进入 Final Validation。

   使用平台 blocking question tool 询问用户（Claude Code 中的 `AskUserQuestion`，必要时预加载 `ToolSearch select:AskUserQuestion`；Codex 中的 `request_user_input`；Gemini 中的 `ask_user`；Pi 中的 `ask_user`（需要 `pi-ask-user` extension））。只有当 harness 真正缺少 blocking tool 时，才回退到聊天中的编号选项。绝不要静默跳过该 gate。

   Stem（问题主干）: `Code review left N actionable finding(s) not yet fixed. How should the agent proceed?`

   Options（选项，四个或更少，self-contained labels）：
   - `Apply/fix now` — 加载 `references/review-findings-followup.md`，为剩余 eligible findings 分派 batched fix subagents，运行 tests，必要时 commit。
   - `File tickets via project tracker` — 以 Interactive mode 加载 `references/tracker-defer.md`；agent 在项目检测到的 tracker 中创建 tickets（或使用 `gh` fallback，若无 sink 则留在 report 中），然后进入 Final Validation。
   - `Accept and proceed` — shipping 前，将 residual findings 原样记录到 durable "Known Residuals" sink。如果 Phase 4 会创建或更新 PR，将它们包含在 PR description 的 "Known Residuals" section（调用 `ce-commit-push-pr` 时由 agent 负责）。如果用户稍后选择 no-PR `ce-commit` path，创建 `docs/residual-review-findings/<branch-or-head-sha>.md`，包含 accepted findings 和 source review-run context，与 implementation commit 一起 stage，并在最终 summary 中提及 file path。用户已确认风险，但 findings 不能只存在于 transient session。
   - `Stop — do not ship` — 中止 shipping workflow。用户会在重新调用前手动处理 findings。

   当 review 报告 `Actionable findings: none.`（且 followup 已应用所有 mechanical 项）或仅使用 Tier 1 时，完全跳过该 gate。在 `Accept and proceed` 决策下，在 agent 记录 durable sink 是 `PR Known Residuals` 还是 `docs/residual-review-findings/<branch-or-head-sha>.md` 前，不要越过该 gate。

5. **Final Validation（最终验证）**
   - 所有 tasks 已标记 completed
   - Testing 已处理：tests pass，且 new/changed behavior 有对应 test coverage（或明确说明为何不需要 tests）
   - Linting passes（lint 通过）
   - Code 遵循 existing patterns
   - Figma designs match（如适用）
   - 没有 console errors 或 warnings
   - 如果 plan 有 `Requirements` section（或旧版 `Requirements Trace`），验证 completed work 满足每项 requirement
   - 如果记录了任何 `Deferred to Implementation` questions，确认它们已在 execution 中解决

6. **Prepare Operational Validation Plan（准备运营验证计划，REQUIRED）**
   - 为每个 change 在 PR description 中添加 `## Post-Deploy Monitoring & Validation` section。
   - 包含具体：
     - Log queries/search terms（日志查询 / 搜索词）
     - 需要观察的 metrics 或 dashboards
     - Expected healthy signals（预期健康信号）
     - Failure signals 和 rollback/mitigation trigger
     - Validation window 和 owner
   - 如果确实没有 production/runtime impact，仍包含该 section，并写入：`No additional operational monitoring required` 和一句理由。

## Phase 4：Ship It（交付）

1. **Prepare Evidence Context（准备 Evidence Context）**

   本步骤不要直接调用 `ce-demo-reel`。Evidence capture 属于 PR creation 或 PR description update flow，因为那里有最终 PR diff 和 description context。

   记录 completed work 是否有 observable behavior（UI rendering、CLI output、带 runnable example 的 API/library behavior、generated artifacts 或 workflow output）。只有当 evidence 可能存在时，`ce-commit-push-pr` skill 才会询问是否 capture evidence。

2. **Update Plan Status（更新 Plan 状态）**

   如果 input document 有带 `status` field 的 YAML frontmatter，将其更新为 `completed`：
   ```
   status: active  ->  status: completed
   ```

3. **Commit and Create Pull Request（提交并创建 Pull Request）**

   加载 `ce-commit-push-pr` skill 处理 committing、pushing 和 PR creation。该 skill 负责 convention detection、branch safety、logical commit splitting、adaptive PR descriptions 和 attribution badges。

   为 PR description 提供 context 时，包含：
   - plan 的 summary 和 key decisions
   - Testing notes（新增/修改的 tests、执行过的 manual testing）
   - step 1 中的 evidence context，让 `ce-commit-push-pr` 能决定是否询问 capture evidence
   - Figma design link（如适用）
   - Post-Deploy Monitoring & Validation section（见 Phase 3 Step 6）
   - Phase 3 Residual Work Gate 中接受的任何 "Known Residuals"，在 PR body 中渲染为专门 section，并按 finding 写入 severity、file:line 和 title

   如果用户偏好 commit 但不创建 PR，改为加载 `ce-commit` skill。

4. **Notify User（通知用户）**
   - 总结已完成内容
   - 链接到 PR（如果创建了）
   - 说明任何需要的 follow-up work
   - 如适用，建议 next steps

## Quality Checklist（质量检查清单）

创建 PR 前，验证：

- [ ] 所有 clarifying questions 已问并已回答
- [ ] 所有 tasks 已标记 completed
- [ ] Testing 已处理：tests pass，且 new/changed behavior 有对应 test coverage（或明确说明为何不需要 tests）
- [ ] Linting passes（使用 linting-agent）
- [ ] Code 遵循 existing patterns
- [ ] Figma designs 与 implementation match（如适用）
- [ ] 当 change 有 observable behavior 时，evidence decision 已由 `ce-commit-push-pr` 处理
- [ ] Commit messages 遵循 conventional format
- [ ] PR description 包含 Post-Deploy Monitoring & Validation section（或明确 no-impact rationale）
- [ ] Simplify：diff >=30 lines 时运行 `ce-simplify-code`（或带 reason 跳过）
- [ ] Code review：Tier 1 completed；或升级时 Tier 2；或 skipped（no Tier 1 + Tier 2 criteria not met，并在 summary 中注明）
- [ ] PR description 包含 summary、testing notes，以及 captured evidence
- [ ] PR description 包含准确 model 和 harness 的 Compound Engineered badge

## Code Review Tiers（Code Review 层级）

当 harness 有 built-in review 时使用 **Tier 1**。仅当 escalation criteria 匹配时使用 **Tier 2**（`ce-code-review` + followup）；缺失 Tier 1 不是升级理由。

**Tier 1 -- harness-native review.** Built-in command 或 skill（例如 `/review`）。inline 修复 findings。

**Tier 2 -- `ce-code-review` (escalation).** (2a) 通过 `mode:agent` 做 review-only。(2b) 按 `references/review-findings-followup.md` 分派 batched fix subagents；residuals → Residual Work Gate。

当没有 Tier 1 且 Tier 2 criteria 未满足时，**跳过 dedicated review**（在 summary 中记录）。

当以下任一条件成立时升级到 Tier 2：
- Sensitive surface touched（auth/authz、payments/billing、data migrations 或 backfills、cryptography 或 secrets、security-relevant config、public API 或 library contracts、dependency manifests）
- Large and diffuse change（>=400 changed lines 且 >3 directories 或 2 subsystems）
- Very large change（超大变更，>=1,000 changed lines）
- Plan 或 task 明确要求 full / deep / thorough code review
