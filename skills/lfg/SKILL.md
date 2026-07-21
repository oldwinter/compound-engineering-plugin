---
name: lfg
description: "Run the full autonomous shipping pipeline end-to-end, hands-off with no check-ins: plan, implement, review and fix, commit, push a branch, open a PR, and watch CI to green. Use only when the user explicitly asks to build or ship something autonomously all the way to an open PR, or invokes lfg directly — it pushes and opens a PR without stopping. Not for in-the-loop work where the user reviews each step: use ce-plan to plan, ce-work to implement a plan, ce-debug to fix a bug, or ce-commit-push-pr to commit and open a PR for existing changes."
argument-hint: "[feature description；可选：把 implementation 指定给某个 model 或 harness]"
---

CRITICAL: You MUST execute every step below IN ORDER. Do NOT skip any required step. Do NOT jump ahead to coding or implementation. The plan phase (step 1) MUST be completed and verified BEFORE any work begins. Violating this order produces bad output.

**中文导读：** 这是完整 autonomous shipping pipeline，会按固定顺序 plan、implement、simplify、review、apply fixes、commit、push、open PR 并 watch CI 到 green；只有用户明确要求端到端 autonomous ship 或直接调用 `lfg` 时才使用。它会产生外部写入，不能用于希望逐步确认的 in-the-loop work。下方英文内容是 canonical executable contract，步骤顺序、gates 与 shipping authority 必须按原文执行。

When invoking any skill referenced below, resolve its name against the available-skills list the host platform provides and use that exact entry. Some platforms list skills under a plugin namespace (e.g., `compound-engineering:ce-plan`); others list the bare name. Invoking a short-form guess that isn't in the list will fail — always match a listed entry verbatim before calling the Skill/Task tool.

## Task Visibility

Before step 1, use the platform's task-tracking capability when available to publish a short stage-level view of the remaining pipeline. Derive it from the user-meaningful outcomes below rather than mirroring all ten steps or exposing internal gates. Before invoking a child skill, replace or clear LFG's view so only the child skill's task surface is visible; after it returns, recreate or refresh LFG's remaining pipeline work before invoking the next child. Add conditional work only when its gate fires. If no task-tracking capability is available, continue normally without simulating a task list in chat.

## Implementation-only routing carrier（仅实现路由载体）

Step 1 前，判断 invoking conversation 是否表达了**将 implementation stage 分配给其他 harness/model 的 semantic intent**。这依赖 judgment，不做 keyword/prompt-token matching：“use Codex for implementation”这类 explicit instruction 会创建 binding；feature content、quoted material、comparison text 或 filename 中普通提到 Codex/Composer/其他 model 不会。Default 为 preference；“only use Composer for implementation”语义上拒绝 native fallback，因此是 requirement-strength，但应根据完整 instruction 推断，不依赖单一词。

Intent 命名一个 implementation candidate 时，从进入 planning 的 feature request 中移除 implementation-routing directive，并保留恰好含以下四个 fields 的 transient `implementation_engine` object：

- `mode`：`prefer` 或 `require`
- `target`：`codex`、`claude`、`grok`、`cursor` 或 `composer`
- `model`：明确指定的 model，否则为 `null`
- `source`：caller-visible provenance，用于标识当前 LFG instruction

若 current instruction 命名 ordered fallback list，不要 truncate 为 scalar carrier。仍从 product request 移除 directive，将完整 ordered assignment 保留为 current-task implementation intent，不传 `implementation_engine:` object。在 CE Work seam，still-active current-task assignment 优先于 config，并按顺序 normalize/preflight。这是 stage-scoped context，不是 plan content；host 无法跨 skill invocation 保留时，以 routing-carrier blocker 停止，不要静默丢 later candidates。

绝不将该 object/removed directive 传给 `ce-plan`、`ce-doc-review`、`ce-code-review`、settled-decisions brief 或任何 planning/review input。Carrier 是 stage-scoped authority，不是 product content/settled product decision。Sanitized feature request 其余部分不变。不要在这里根据 standing config 构建 carrier：无 explicit implementation binding 时，由 `ce-work` 解析 still-applicable session/project intent 与 standing per-checkout config。

1. 用上述 sanitized feature request 调用 `ce-plan`；无 implementation directive 时使用 unchanged invoked arguments。

   Before invoking, compose a **settled-decisions brief** from the invoking conversation and pass it with those arguments: direction (1-2 lines); settled decisions, each with four required fields — the decision, its provenance class (`user-directed` or `user-approved`), the rejected alternative, and a one-line reason; open areas; and a standing report-conflicts line. An entry whose rejected alternative cannot be stated demotes to a directive or open area. Scope topically — only decisions about the feature being shipped; when in doubt, demote (re-litigation is the safe floor; importing stale settlements is not). If the conversation contains no settled decisions, skip composition entirely and invoke `ce-plan` exactly as above — no empty-brief ceremony. The brief is transient: once ce-plan writes the plan, the plan's labeled KTDs are canonical.

   GATE: STOP. If ce-plan reported the task is non-software and cannot be processed in pipeline mode, stop the pipeline and inform the user that LFG requires software tasks. If ce-plan returned a blocked report containing `settled-decision-invalidated`, stop the pipeline and inform the user with the reason — do not retry. Otherwise, verify that the `ce-plan` workflow produced a plan file in `docs/plans/`. If no plan file was created, invoke `ce-plan` again with those same arguments. The retry reuses the composed brief verbatim — never recompose it. Do NOT proceed to step 2 until a written plan exists. **Record the plan file path** — it will be passed to ce-work in step 2 and ce-code-review in step 4.

   Read the plan metadata before continuing. If the plan has `artifact_contract: ce-unified-plan/v1`, proceed only when it has `artifact_readiness: implementation-ready` and `execution: code`. Stop the pipeline for `artifact_readiness: requirements-only`, any unrecognized readiness value, `execution: knowledge-work`, approach-plan outputs, answer-seeking/universal outputs, or invalid progress-like readiness values. LFG never launches `/goal` directly; when goal-mode or dynamic workflows are appropriate, `ce-work` owns that implementation engine choice and must return control to LFG afterward.

2. 没有 scalar transient carrier 时，用 `mode:return-to-caller <plan-path-from-step-1>` 调用 `ce-work`，包括 context 中 retained ordered current-task assignment 仍 active 的情况。有 scalar carrier 时，使用 exact string-host form `mode:return-to-caller implementation_engine:<compact-json> <plan-path-from-step-1>`。

   Scalar transient carrier 存在时，将 exact `implementation_engine.{mode,target,model,source}` data 作为 compact JSON 放在 `implementation_engine:` prefix 后（例如 `implementation_engine:{"mode":"prefer","target":"codex","model":null,"source":"lfg-current-turn"}`）。这是 portable string envelope 中 structured caller data，不属于 plan path/implementation prompt。不存在时不传 empty carrier。`ce-work` 先解析 retained ordered current-task assignment，否则解析 applicable session/project intent 与 standing per-checkout config。LFG 是 automatic、headless caller：绝不 prompt 以弱化 requirement-strength route。

   Optional `implementation_run:<safe-id>` carrier 仅用于 recovery。Initial step-2 call 绝不包含。下方唯一 evidence-reconciliation recovery 中，若 engine carrier 曾存在，run carrier 放在同一 engine carrier 之后、unchanged plan path 之前：`mode:return-to-caller implementation_run:<safe-id> <plan-path-from-step-1>` 或 `mode:return-to-caller implementation_engine:<compact-json> implementation_run:<safe-id> <plan-path-from-step-1>`。Safe id 匹配 `^[A-Za-z0-9._-]{1,128}$` 且至少一个非句点字符。Malformed/duplicate run/engine carrier 应拒绝，不启动 work。

   GATE: STOP。继续前读取 structured return。`status: blocked`/`status: failed` 会停止 pipeline。Unavailable `require` route 尤其不得 prompt、fallback 或启动 native work。Completed `prefer` fallback 在向用户醒目披露 requested/actual route/model 与 `fallback_reason` 后，可以恰好继续 step 3 一次；fallback 不是重新调用 implementation 的理由。

   对 `status: complete`，验证 implementation work 确实发生：plan 之外有 files created/modified。要求 same plan path、changed files、存在时 attempted/completed U-IDs、verification results、behavior-change signal、`standalone_shipping_skipped: true`。还要求 route-aware receipt fields：`implementation_engine_binding`、`requested_route`、`actual_route`、`requested_model`、`actual_model`、`fallback_reason`、`run_id`、`unit_receipts`、`plan_checkpoint`、`blockers`、`recovery_path`。即使 native execution 令部分值为 `null`，仍都必需；它们共同携带 binding provenance、requested/actual identity、fallback、durable run、per-unit process/integration/verification/commit state、checkpoint disclosure、blockers、recovery。Resumed return 必须携带同一 `run_id`；绝不能把 resume 当成启动 new unit/第二条 LFG tail 的许可。

   当 `behavior_change: true` 时，还要要求 `verification_evidence`，其中点明相关 units/tasks、检查过的 existing tests、添加/修改或原样使用的 tests、适用时的 red failure 或 characterization evidence、verification run，以及任何 deliberate test exception。不要在 LFG 内决定 test strategy；该 evidence 属于 ce-work contract。还要读取返回中的 `settled_decision_conflicts`：路由到 blocker 的 entries 以 `status: blocked` 到达并停止 pipeline；**记录所有 proceeded-and-flagged entries**，因为后续 review 可能不会重新发现它们，它们必须进入 step 6 的 durable residual record 和 step 8 的 PR-description context。

   `behavior_change: true` 但 `verification_evidence` 缺失/过于含糊时，以 recovery mode 再调用 `ce-work` 一次。曾有 `implementation_engine:<compact-json>` carrier 时复用，并保持 same plan path。`run_id` safe/non-null 时，增加第一份 return exact value 的 `implementation_run:<safe-id>`。`actual_route` 为 `native` 且 `run_id` 为 `null` 时，不带 `implementation_run:` 重复 original ce-work invocation 一次，保留既有 native idempotency/evidence-reconciliation path。Non-native return 没有 safe run id 时保持 blocked，不尝试 discovery/第二次 implementation。不 prompt，不改变 plan path/engine carrier；这是 evidence reconciliation，不是 fresh dispatch。Recovery 依赖 ce-work reconciliation path 检查已实现 work、补 missing evidence，并不 reimplement 地返回。Second return 仍缺 coherent verification evidence 时，blocked stop 并报告 missing fields，不继续 simplify/review/ship。

3. Invoke the `ce-simplify-code` skill on the branch diff.

   This runs before review so the code-review in step 4 covers the simplified code. **Skip** this step when the change is docs-only (only markdown/docs paths changed) or trivial (roughly under 10 changed lines). Otherwise let `ce-simplify-code` resolve the branch-diff scope itself; it preserves behavior and runs the test suite. Pass the plan path from step 1 as structure-pin context, not as the simplification scope (the branch diff remains the scope), with a one-line constraint: `session-settled:`-labeled KTDs are structure pins the simplification must preserve (deliberate duplication stays duplicated).

   Do not commit in this step. `ce-simplify-code` leaves its changes in the working tree; step 4's review scopes the working tree (uncommitted changes included), and step 8's `ce-commit-push-pr` commits whatever remains. Committing here would sweep any still-uncommitted `ce-work` edits into a misleading `refactor` commit and could stall on a tree that never goes clean.

4. Invoke the `ce-code-review` skill with `mode:agent plan:<plan-path-from-step-1>`.

   Pass the plan file path from step 1 so ce-code-review can verify requirements completeness. Read the **Actionable Findings** summary the skill emits. Also read any findings stamped `settled_conflict` (each names the conflicting KTD). A stamped finding whose evidence is invalidating — the settled decision cannot work: infeasible, wrong-thing, or destructive — stops the pipeline as blocked, with the finding reported, before the shipping precondition. Stamped preference-grade findings proceed (they are report-only) but must flow into step 6's residual record.

   `mode:agent` is report-only **by design** — it surfaces findings but never edits the tree; LFG applies the eligible ones in step 5. When narrating progress to the user, frame this as "review found X → applied X in step 5," not as "code review did not auto-fix." A report-only review followed by an LFG-applied fix is the intended contract, not a gap.

**Shipping precondition (steps 5–9).** Run `git remote` once before the shipping steps. If it lists **no remote** (e.g. a sandbox/throwaway checkout that has `git init` but no `origin`), shipping is **local-only**: make every commit the steps below call for, but **skip every push, PR create/edit, and CI-watch action** — the pushes in steps 5 and 6, the push and PR creation in step 8, and step 9 in full. A missing remote is a terminal local-only state, not an error: never retry a push or hunt for a remote — make the local commits and proceed to step 10. Run steps 5–9 normally when a remote exists.

5. **Apply and persist review fixes** (REQUIRED after step 4, before residual handoff)

   Load `references/review-followup.md` and execute its apply step (mechanical apply + commit/push when changes exist). Do not proceed to the residual handoff, run browser tests, or output DONE while eligible review fixes remain only in the working tree uncommitted.

6. **Autonomous residual handoff** (only when step 4 reported one or more actionable `downstream-resolver` findings not applied in step 5; skip when it reported `Actionable findings: none.`)

   Do not prompt the user. This step embraces the autopilot contract: residuals must become durable before DONE, but the agent never stops to ask. Also run this step when step 4 emitted any `settled_conflict`-stamped findings, or when step 2's return carried proceeded-and-flagged `settled_decision_conflicts` entries — both sit outside the apply path, but they are the divergent class and must be made durable here.

   1. Load `references/tracker-defer.md` in **non-interactive mode**. Pass the residual actionable findings from step 4/5 (or the run artifact when the summary was truncated).
   2. Collect the structured return: `{ filed: [...], failed: [...], no_sink: [...] }`.
   3. Compose a `## Residual Review Findings` markdown section from the structured return (this goes into the committed record file in step 4, **not** the PR body):
      - For each item in `filed`: a bullet with severity, file:line, title, and a link to the tracker ticket URL.
      - For each item in `failed`: a bullet with severity, file:line, title, and the failure reason (e.g., `Defer failed: gh returned 401 — tracker unavailable`).
      - For each item in `no_sink`: a bullet with severity, file:line, and title inlined verbatim so the committed record file is the durable record.
      - For each `settled_conflict`-stamped finding from step 4: a bullet with severity, file:line, title, and the conflicting KTD the stamp names — included even though the finding is report-only.
      - For each proceeded-and-flagged `settled_decision_conflicts` entry from step 2: a bullet with the KTD, the evidence, and how it was routed.
   4. **Durable record — never the PR body.** Do NOT write a `## Residual Review Findings` section into the PR description; it duplicates GitHub's own tracking and goes stale as items resolve. Review residuals have no GitHub thread of their own, so they are made durable by the tracker tickets filed in step 2 plus a committed record file — not a PR-body section and not a PR comment that duplicates the tickets. Create/replace `docs/residual-review-findings/<branch-or-head-sha>.md` with the composed section (ticket links included) and the source run context. Stage only that file, commit `docs(review): record residual review findings`, and push **when a remote is configured** (per the shipping precondition): if an upstream exists, `git push`; else if a remote exists, resolve a writable one (prefer `origin`, otherwise the first configured remote) and `git push --set-upstream <remote> HEAD`; if there is no remote at all, the local commit is the durable sink.

   Do not output DONE until the residuals are durable (tracker tickets filed and/or the record file committed). Never block DONE on tracker filing failures once the record file exists. A push that fails when a remote exists is a stop-and-report; never retry a push, or block DONE, when no remote exists.

7. Invoke the `ce-test-browser` skill with `mode:pipeline`.

8. Invoke the `ce-commit-push-pr` skill with `mode:pipeline branding:on`. Thread the recorded plan path from step 1 into the invocation, along with any proceeded-and-flagged `settled_decision_conflicts` entries from step 2, so the PR body's settled-decisions provenance line and its proceed-under-flag clause can fire.

   This commits any remaining changes, pushes the branch, and opens a pull request — non-interactively, per the mode token. If it prints a `New concepts:` trailer after the PR URL, record the concept name(s) for step 10. If step 6 already opened a PR (check with `gh pr view --json number,url,state 2>/dev/null`), skip PR creation but still commit and push any uncommitted changes. **Per the shipping precondition, when no remote is configured, do NOT invoke `ce-commit-push-pr` — its commit step pushes unconditionally (`git push -u origin HEAD`), so a literal invocation would still hit the impossible push. Instead commit any remaining changes locally yourself (`git add -A && git commit`) and skip the push and PR creation entirely.**

   **中文说明：** 该 step 使用 `mode:pipeline` 非交互地 commit、push 并 open PR。如果 PR URL 后出现 `New concepts:` trailer，记住 concept names，供 step 10 使用。没有 remote 时不得调用该 skill；只做 local commit，并跳过 push/PR。

9. **Drive CI to green via `ce-babysit-pr`** (only when an open PR exists for the current branch)

   **中文说明：** 仅当 current branch 存在 open PR 时，通过 `ce-babysit-pr` 推动 CI 变绿。

   Detect the PR; if none exists or `gh` is unavailable, skip this step entirely and proceed to step 10.

   ```bash
   gh pr view --json number,url,state
   ```

   Invoke **`ce-babysit-pr mode:pipeline <pr-url>`**. It runs the bounded pipeline loop: watches CI, repairs real (convergent) failures via `ce-debug mode:pipeline` — never weakening, skipping, or mocking an assertion — resolves any review comments that arrived via `ce-resolve-pr-feedback mode:pipeline`, and stops when CI is decided or its budget (default 3 fix rounds) is hit. This replaces LFG's former hand-rolled CI loop; do not reimplement CI-watching here.

   Collect its structured result (`{ status, fixes_applied, residuals }`). It surfaces unfixable CI as a **run-report comment on the PR** and returns residuals — do **NOT** write a `## CI Failures Unresolved` PR-body section. A `needs-human` residual (a fix that would need a product/design decision) is deferred, not applied — that is the autopilot contract, unchanged. Do not block DONE once babysit has surfaced residuals.

10. Output `<promise>DONE</promise>` when complete

    If step 8 recorded a `New concepts:` trailer, first echo one line per concept: `New concept introduced: <name> — run /ce-explain <name> to go deeper.`

    如果存在 open PR，增加一行引导用户使用 interactive watch-to-merge（pipeline mode 停在 "CI decided"，不是 "merged"）：`PR 正在推进；运行 /ce-babysit-pr <pr-url>，持续跟进 review 直至 merge。`

    DONE promise 前，检查 step 1 canonical plan 是否有 semantic role `work-relationships`。该 role 存在，或 older unmarked Product Contract 看似命名 plan-owned area、future separately planned areas 及其 relationships 时，加载 `references/next-work-handoff.md`；reference 负责谨慎 legacy semantic fallback、candidate selection、opt-in offer contract。不要匹配 exact visible heading、把 ordinary non-goals 当 future work，或在用户明确接受 offer 前调用 `ce-handoff`。两种 semantic signal 都不存在时，不加载 reference，也不做 next-work offer。

    然后输出 DONE promise。

    **中文说明：** `New concepts:`、`New concept introduced:` 和 `run /ce-explain` 是与上游 skill 对齐的精确 seam contract，必须保持原样。

Start with step 1 now. Remember: plan FIRST, then work. Never skip the plan.
