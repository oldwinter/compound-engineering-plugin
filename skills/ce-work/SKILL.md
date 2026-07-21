---
name: ce-work
description: 端到端执行 plan 或具体 work prompt。适用于从 docs/plans、spec path 或明确 build request 开始实施；开放式 bug 使用 ce-debug。Standalone 使用方式负责 shipping tail；outer orchestrators 传入 `mode:return-to-caller [implementation_engine:<compact-json>] [implementation_run:<safe-id>] <plan path>`，仅执行 implementation、recovery 和 local verification。
argument-hint: "[Plan path、work description，或带 run id 的 recovery request；留空使用最新项] | [供 outer orchestrators 使用的 mode:return-to-caller [implementation_engine:<compact-json>] [implementation_run:<safe-id>] <plan path>]"
---

# Work Execution Command

## Outcome（结果）

- **Result：** 根据 plan、specification 或 concrete work prompt 得到 fully implemented、locally verified change set。
- **Next consumer：** Standalone 使用时，shipping workflow 将 verified change 带过 review/delivery。Return-to-Caller Mode 下，invoking workflow 接收 structured implementation/verification envelope，并拥有 remaining gates。
- **Done：** 每个 in-scope task 完成，required verification evidence 已记录，relevant checks 通过，run 到达 owned shipping handoff、complete return envelope 或 explicit blocker。
- **Intent：** 不 renegotiate plan，也不转移 canonical integration authority，完成 requested feature。Workers 接收 bounded units；host orchestrator 检查 actual changes，并拥有 authoritative verification/canonical commits。

## Input Document

The **input document** for this run is the input this skill was invoked with — present in the current prompt or conversation, whether the user provided it directly or a calling skill passed it (e.g. `lfg` in `mode:pipeline`, which passes a plan path). It may be a plan or spec path, a `mode:` token followed by a path, or a bare work prompt. The rest of this skill refers to it as `<input_document>`; if nothing was provided, treat `<input_document>` as blank.

Invocation origin 不可观察也不相关：无论用户显式调用 `ce-work`，还是 host 自动选择，都应用相同 source-resolution rules。

## Execution Workflow

**Bundled reference loading fail-closed。** 使用 harness 提供的 skill full path，从 loaded `SKILL.md` directory 解析下方每个 bundled reference/script path；绝不 glob target repository 寻找 bundled file。Harness 不暴露该 directory 或 required file 无法读取时，在其 governing action 前停止并报告 missing reference，不要近似 protocol 或 native 继续。

### Phase 0: Input Triage

**Recovery activation 最先。** Normal plan/path/blank-input/bare-prompt classification 前，判断用户是否在语义上要求 resume、inspect status、reap 或 cleanup existing external implementation run，并已提供 run id。这是 intent recognition，不是 verb-only matching。按 controller safe-id contract 验证 id：`^[A-Za-z0-9._-]{1,128}$` 且至少一个非句点字符。存在 direct recovery intent 时，读取 `references/cross-model-execution.md`，将该 run id 作为 requested controller operation 的 authority，返回 observed state/blocker。Recovery 不得 dispatch new worker、select new route、fall through 到 latest-plan discovery，或运行任何 shipping tail。全部 units 已 cleaned 时，**completed recovery 是 read-only reconciliation**：不重跑 test、build、format、install、generation 或 `verify-run`；报告 stored unit 与 plan-wide verification receipts。Intent 清晰但缺 run id 时请求 id，不猜测或当作 new work。

**否则解析 leading mode token。** `<input_document>` 以 `mode:return-to-caller`（或 legacy alias `mode:caller-owned-tail` / `caller:lfg`）开头时，先 strip token，进入 **Return-to-Caller Mode**：只 implement/local verify，返回 structured envelope，不运行 standalone shipping tail。Plan path 前按固定顺序接受最多两个 optional carriers：先是精确以 `implementation_engine:` 为 prefix 的 compact JSON object，再是精确以 `implementation_run:` 为 prefix 的 run id。Engine object 是 typed caller binding，必须恰好含 `references/execution-engines.md` 定义的 `mode`、`target`、`model`、`source`；run carrier 只接受 return-to-caller recovery，必须满足 safe-id contract。拒绝 malformed JSON、missing/extra fields、unsafe run id 或 duplicate carrier。余下整个 string 是 plan path。Mode token/carrier 后无 path 是 error，应报告，不能把 control data 当 bare prompt。没有 optional carrier 时，原 `mode:return-to-caller <plan-path>` form 不变，standing config 仍 eligible。

存在 `implementation_run:<safe-id>` 时，recovery 优先于 ordinary input classification：读取 `references/cross-model-execution.md`，以 `resume --run-id <safe-id>` 为 authoritative entrypoint，reconciliation 后返回正常 Return-to-Caller envelope。存在 supplied `implementation_engine` binding 时保留它。不要解析 different route、redispatch、reimplement、重跑 completed verification 或启动另一 caller tail。

Valid `implementation_engine:` binding 存在且无 recovery 时，**pre-controller discovery 只读**。解析 binding 并初始化 external controller 前，不在 canonical checkout 运行 baseline/test/build/format/install/generation commands；它们可能在 controller 记录 clean starting point 前创建 ignored/untracked artifacts。Triage 限于 metadata、source、config、branch、status、command-availability probes 等 reads。若决定 route 能否启动确实需要 non-read probe，只能在 artifact suppression 下运行，并在继续前证明 canonical Git snapshot byte-for-byte unchanged；否则以 route blocker 停止。

**Blank/bare-prompt classification 前解析 session-carried plan。** 当前 request 是“proceed”等 continuation language，且 conversation 恰好指出一个已为该 work author/select/accept 的 current plan/spec path 时，将其视为 `<input_document>`。多个 session plans plausible 时询问，不按 recency 选择。不要用 unrelated earlier plan 替换 concrete new work request。该规则只依赖 visible conversation state，不依赖 explicit/automatic invocation。

**每个 non-recovery code path 都必须在 execution 前解析 implementation engine。** Metadata/prompt triage 识别 code work 后，但在读取 active implementation units、创建 tasks、写 files 或 commit 前，读取 `references/execution-engines.md` 并执行 route-resolution gate。有无 `implementation_engine:` carrier 都适用；存在 `.compound-engineering/config.local.yaml` 时检查，因为 standing config 在 standalone 与 carrierless Return-to-Caller Mode 都 eligible。Gate 排除或 validly exhaust applicable higher-authority routes 前，不选择 inline/native execution。

Determine how to proceed based on what was provided in `<input_document>` (after any mode token is stripped).

**Plan document** (input is a file path to an existing plan or specification): read the plan's metadata first — YAML frontmatter for a markdown plan, or the visible header text for an HTML plan (both formats carry the same fields).

- If it carries `artifact_contract: ce-unified-plan/v1`, classify `artifact_readiness` before reading the body.
  - `artifact_readiness: requirements-only` -> stop and tell the user this Product Contract needs `ce-plan` enrichment before implementation. Offer the exact `ce-plan <plan-path>` handoff.
  - `artifact_readiness: implementation-ready` plus `execution: code` -> continue to Phase 1 using the unified-plan reader strategy below.
  - Any other readiness value or any non-code/unclassified execution mode -> do not auto-execute as code. Route `execution: knowledge-work` to the non-code carve-out; otherwise ask the user to return to `ce-plan` to produce an implementation-ready code plan.
  - Progress-like values (`active`, `in_progress`, `completed`, `done`) are invalid readiness values. Stop and ask for plan repair rather than guessing.
- If it carries `execution: knowledge-work`, this is a **non-code plan** — read `references/non-code-execution.md` and follow that carve-out instead of the rest of this workflow.
- Otherwise (legacy plan, field absent, or `execution: code`) -> continue to Phase 1 and run the normal code lifecycle.

**Blank invocation latest-plan discovery:** when `<input_document>` is blank, glob `docs/plans/*.md` and `docs/plans/*.html`, inspect metadata for the newest candidates, and only auto-select a plan that is `artifact_readiness: implementation-ready` plus `execution: code` or a legacy code plan. Stop instead of silently executing when the newest matching artifact is requirements-only, `execution: knowledge-work`, an approach-plan, or an unclassified universal/answer-seeking output. Ask for an explicit path or a `ce-plan` enrichment step. **Superseded sibling:** if a requirements-only candidate has a same-basename file in the other format (`<basename>.md` / `<basename>.html`) that is `implementation-ready`, a format conversion left the requirements-only copy stale — select the implementation-ready sibling and execute it rather than stopping.

**Bare prompt** (input is a description of work, not a file path):

1. **Scan the work area**

   - Identify files likely to change based on the prompt
   - Find existing test files for those areas (search for test/spec files that import, reference, or share names with the implementation files)
   - Note local patterns and conventions in the affected areas

2. **Assess complexity and route**

   | Complexity | Signals | Action |
   |-----------|---------|--------|
   | **Trivial** | 1-2 个 files，无 behavior change（typo、config、rename） | 进入 Phase 1 step 2（environment setup），只跳过 task list；直接实施前仍运行 step 4 的 mandatory engine-resolution gate，不进入 unit execution loop。如果 change 触及承载行为的代码，应用 Test Discovery |
   | **Small / Medium** | Clear scope, under ~10 files | Build a task list from discovery. Proceed to Phase 1 step 2 |
   | **Large** | Cross-cutting, architectural decisions, 10+ files, touches auth/payments/migrations | Inform the user this would benefit from `/ce-brainstorm` or `/ce-plan` to surface edge cases and scope boundaries. Honor their choice. If proceeding, build a task list and continue to Phase 1 step 2 |

   不要把 unclear prompt 当 external-worker authority。Discovery 无法说明 concrete goal、bounded scope、authoritative verification 时，在任何 cross-model egress 前 clarify 或 route 到 `ce-plan`。

---

### Phase 1: Quick Start

1. **Read Plan and Clarify** _(skip if arriving from Phase 0 with a bare prompt)_

   - For unified plans, size your read. A short plan (lightweight or requirements-only, a screen or two) can be read in full. For a long implementation-ready plan, do **not** read the whole document first — it is expensive and unnecessary. Build a section map, then read only what the active unit needs: metadata, then `Goal Capsule`, `Verification Contract`, `Definition of Done`, the `Implementation Units` heading list, and only the active U-ID section plus referenced R/F/AE/KTD excerpts. Read appendices or unrelated U-IDs only when the active unit cites them. To build the map: in **markdown** scan headings (`rg -n '^#{1,3} ' <plan>` — top-level sections plus `### U<N>.` units); in **HTML** scan the `<h1>`–`<h3>` heading elements and their anchor ids. Match on the stable section names / unit IDs (`Goal Capsule`, `Verification Contract`, `### U<N>.`, …), ignoring HTML wrapper tags — not on a format-specific pattern.
   - For legacy plans, read the work document completely. Both formats (`.md`, `.html`) carry the same section names and IDs; HTML just wraps them in semantic elements (`<section>`, `<article>`, etc.).
   - Treat the plan as a decision artifact, not an execution script
   - If the plan includes sections such as `Implementation Units`, `Work Breakdown`, `Requirements` (or legacy `Requirements Trace`), `Files`, `Test Scenarios`, or `Verification`, use those as the primary source material for execution
   - Check for `Execution note` on each implementation unit — these carry the plan's natural-language execution direction for that unit (for example, start from failing proof, characterize legacy behavior, or prefer smoke/runtime verification). Note them when creating tasks, but do not reduce them to keyword matching.
   - Check for a `Deferred to Implementation` or `Implementation-Time Unknowns` section — these are questions the planner intentionally left for you to resolve during execution. Note them before starting so they inform your approach rather than surprising you mid-task
   - Check for a `Scope Boundaries` section — these are explicit non-goals. Refer back to them if implementation starts pulling you toward adjacent work
   - Review any references or links provided in the plan
   - If the user explicitly asks for TDD, test-first, characterization-first execution, or a specific verification style in this session, honor that direction even if the plan has no `Execution note`
   - If anything is unclear or ambiguous, ask clarifying questions now
   - If clarifying questions were needed above, get user approval on the resolved answers. If no clarifications were needed, proceed without a separate approval step — plan scope is the plan's authority, not something to renegotiate
   - **Do not skip this** - better to ask questions now than build the wrong thing
   - **Do not edit the plan body during execution.** The plan is a decision artifact; progress lives in git commits and the task tracker, not the plan. `ce-work` does not mutate the plan — whether it shipped is derived from git, not recorded in the doc. Legacy plans may contain `- [ ]` / `- [x]` marks on unit headings or a `status:` field — ignore them as state; per-unit completion is determined during execution by reading the current file state.

2. **Setup Environment**

   First, check the current branch:

   ```bash
   current_branch=$(git branch --show-current)
   default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')

   # Fallback if remote HEAD isn't set
   if [ -z "$default_branch" ]; then
     default_branch=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo "main" || echo "master")
   fi
   ```

   **If already on a feature branch** (not the default branch):

   First, check whether the branch name is **meaningful** — a name like `feat/crowd-sniff` or `fix/email-validation` tells future readers what the work is about. Auto-generated worktree names (e.g., `worktree-jolly-beaming-raven`) or other opaque names do not.

   If the branch name is meaningless or auto-generated, suggest renaming it before continuing:
   ```bash
   git branch -m <meaningful-name>
   ```
   Derive the new name from the plan title or work description (e.g., `feat/crowd-sniff`). Present the rename as a recommended option alongside continuing as-is.

   Then ask: "Continue working on `[current_branch]`, or create a new branch?"
   - If continuing (with or without rename), proceed to step 3
   - If creating new, follow Option A or B below

   **If on the default branch**, choose how to proceed:

   **Option A: Create a new branch**
   ```bash
   git pull origin [default_branch]
   git checkout -b feature-branch-name
   ```
   Use a meaningful name based on the work (e.g., `feat/user-authentication`, `fix/email-validation`).

   **Option B: Use a worktree (recommended for parallel development)**
   ```bash
   skill: ce-worktree
   # Ensures isolation: detects an existing worktree, prefers the harness's
   # native worktree tool, else creates one from the default branch
   ```

   **Option C: Continue on the default branch**
   - Requires explicit user confirmation
   - Only proceed after user explicitly says "yes, commit to [default_branch]"
   - Never commit directly to the default branch without explicit permission

   **Recommendation**: Use worktree if:
   - You want to work on multiple features simultaneously
   - You want to keep the default branch clean while experimenting
   - You plan to switch between branches frequently

3. **Create Task List** _(skip if Phase 0 already built one, or if Phase 0 routed as Trivial)_
   - Use the platform's task-tracking capability when available (`TaskCreate`/`TaskUpdate`/`TaskList` in Claude Code, `update_plan` in Codex, or the equivalent on other harnesses) to break the plan into actionable tasks. If none is available, continue normally without simulating a task list in chat
   - Derive tasks from the plan's implementation units, dependencies, files, test targets, and verification criteria
   - When the plan defines U-IDs for Implementation Units, name each task from a brief, outcome-led form of the unit's Goal and append the stable U-ID (e.g., "Add parser coverage (U3)"). Never use a bare U-ID or lead with the identifier; the user should understand the work before the traceability label. Aim for five words or fewer before the ID
   - When the full unit list is visible, do not repeat ordinal counts such as "unit 1 of 5" in every task. Add an ordinal only when the harness exposes the current task without the surrounding list and the count materially improves orientation
   - Carry each unit's `Execution note` into the task when present
   - For each unit, read the `Patterns to follow` field before implementing — these point to specific files or conventions to mirror
   - Use each unit's `Verification` field as the primary "done" signal for that task
   - Do not expect the plan to contain implementation code, micro-step TDD instructions, or exact shell commands
   - Include dependencies between tasks
   - Prioritize based on what needs to be done first
   - Include testing and quality check tasks
   - Keep tasks specific and completable

4. **Choose Execution Engine, then Strategy**

   **Route resolution 是 mandatory pre-write gate。** 任何 implementation write、native worker dispatch 或 implementation commit 前，读取 `references/execution-engines.md`；检查 applicable live/session/project intent、typed caller binding，以及存在时的 `.compound-engineering/config.local.yaml`；再解析并记录 engine。不要仅因没有 typed carrier 就推断 native execution。只有 gate 未发现 higher-authority cross-model selection，或按 reference fallback contract exhaust `prefer` route 后，native 才 eligible。

   首先选择运行 implementation 的 **engine**：inline/subagent、goal-mode、dynamic-workflow 或 cross-model execution。当没有适用的 live intent、typed caller binding 或已启用 standing configuration 选择 cross-model execution 时，native execution 仍默认使用 inline/subagent path。Goal-mode 和 dynamic-workflow 仍仅适用于 implementation-ready unified code plans，且只有 host 提供 callable primitive 时才能使用；Codex 提供 `create_goal`（skill 可直接启动 goal），Claude Code 不提供 goal tools，因此在 Claude Code 上只能生成 prompt（绝不从该 skill 内调用）。对于大型 fan-out plans（许多独立 U-IDs、codebase-wide sweeps、migrations、adversarial cross-checking），优先使用 dynamic-workflow 而不是 goal-mode。已加载 reference 定义 authority-and-scope route resolution、ordered standing preference contract、host-capability probe、plan-shape selection table、可复制的 goal-mode/`ultracode:` prompts 和 resume-tail rules。Engine 选择绝不改变 tail ownership；implementation 后，正常 standalone 使用恢复 quality gates，由 `lfg` 调用时则返回 return-to-caller envelope。其他 legacy 和 bare-prompt code work 直接使用 inline/subagent engine。

   当且仅当选中 cross-model execution 时，在任何 repository content、bounded mutation authority 或其他 material 跨 fixed route 前，必须读取 `references/cross-model-execution.md`。该 reference 定义 fixed-route transaction、controller commands、failure stops 和 receipts。不要用普通 subagent dispatch 近似。

   **Controller `init` 成功后，该 unit 锁定到 selected cross-model engine。** 从此只能通过 controller protocol 推进，或带 recovery path 返回 blocked。除非 protocol 后续返回 explicit fallback authorization，否则不要将其重新分类为 trivial、为速度 abandon，或 native implement。

   Bare prompt 没有 resolved plan 时，loaded reference 要求在 controller initialization 前建立 private **bounded implementation brief**：只 synthesize concrete request、discovered scope、acceptance/verification、inherited constraints、exclusions、conservative unit breakdown。不发送 raw conversation history。无法在不猜测的情况下填写时不 egress，返回 Phase 0 clarification/planning。Explicit/automatically selected invocation 使用相同 bridge。

   For the inline/subagent engine, **prefer subagents for any structured multi-unit plan** — each worker gets a fresh context window for one unit. **Parallelize independent units whenever it is safe**; fall back to serial only when parallel isn't safe or the harness can't isolate concurrent writes. Let the plan's `Dependencies` and `Files` drive batching: run an independent dependency layer together, then the next.

   | Strategy | When to use |
   |----------|-------------|
   | **Inline** | Trivial work (1-2 files, no real decomposition), work needing user interaction mid-flight, or bare prompts that lack structured units |
   | **Serial subagents** | The default for structured multi-unit plans whose units are dependent, few, or whose parallel-safety is uncertain. Fresh context per unit, executed in dependency order |
   | **Parallel subagents** | Independent units (per the Parallel Safety Check) when you want the speed and the harness can isolate concurrent work. Run a dependency layer at once, then the next |

   **Parallel Safety Check**：scheduling 与 engine/workspace selection 分离。Dispatch wave 前，对 native/cross-model candidates 应用该 gate：

   1. 只启动 dependencies 已 committed，且 same readiness layer peers 互不依赖的 units。
   2. 根据每个 candidate `Files:` 映射 declared files，再超越声明做 reasoning。File overlap 必要但不充分：shared types/APIs/interfaces、migrations、lockfiles、generated artifacts/clients、registry/config/schema surfaces，以及 environment singleton（一个 dev server/port、shared database、browser session、package install、rate limit）都会造成 contention。
   3. 估算 expected merge/verification cost。即使 workers isolated，若共享 contract，或 reconcile likely outputs 并不明显小于/安全于 serial authoring，也应 serialize。
   4. 只有 dependencies、declared files、semantic surfaces、runtime resources、expected merge cost 都支持 independence 时才一起 dispatch；**不确定时拒绝 parallelism**。Speed 是 optional。
   5. 每个 concurrent worker 都要求 isolated workspace。Synchronous native unit 留在 active checkout；shared-workspace worker 无论 declared files 是否 disjoint 都 serial 运行。
   6. Concurrency 限制为 bounded batch（约 3-5 workers），即使更多 units 看似 independent。
   7. Abort criteria：broad unplanned edits、semantic overlap、out-of-scope failures、repeated collision 会禁用后续 waves；保留 affected work 或 serial 完成。

   **普通 native workers 的 isolation 由 harness 负责，绝不由 ce-work 负责**：inline/subagent、goal-mode、dynamic-workflow execution 不要自行运行 `git worktree add`。唯一例外是 external cross-model controller；它依据独立 cross-model protocol，在 repository 外拥有 detached sibling worktrees。Probe native subagent mechanism 提供的 capability，再选择 parallel path：
   - **Harness-native isolated workers**：每个 worker 编辑 harness 管理的 isolated workspace，例如带 worktree isolation 的 Claude Code `Agent`，或 receipt 确认 isolated workspace 的 harness worker capability。即使当前已在 worktree 中也可用，因为 harness-managed worktrees 是 peers，不是 nested。只有通过 Safety Check 的 units 才 parallel；isolation 让 recovery 可行，不代表 overlap safe。
   - **Only shared workspace**：subagents 编辑 working directory，应 serial 运行。不要根据存在 subagent API 推断 isolation；只使用 active harness 实际暴露的 capability。
   - **无 subagent mechanism：** inline 运行。

   **Native dispatch（仅 inline/subagent engines）** 使用 harness subagent/worker mechanism。Unit 一旦选中 cross-model execution，就使用 loaded controller protocol，不能重新进入 ordinary subagent dispatch。每个 native worker 获得：
   - Plan path，加上**有边界的 unit packet**和 inherited authority：Goal Capsule、Definition of Done、该 unit section、与其相关的 Verification Contract entries，以及引用的 R/F/AE/KTD excerpts。Downstream worker 可以收窄 unit 和 authority，绝不能扩大。不要把“读取整个 plan”作为 worker prompt。（Legacy non-unified plan 可只提供 plan path 供参考。）
   - The unit's Goal, Files, Approach, Execution note, Patterns, Test scenarios, Verification, and any resolved deferred questions for it.
   - Instruction to check whether the unit's test scenarios cover all applicable categories (happy paths, edge cases, error paths, integration) and supplement gaps before writing tests.
   - **Instruction to choose the unit's evidence strategy and gather the evidence** (see Evidence Strategy in Phase 2) — for behavior-bearing changes, honor the Execution note and default to proof-first or characterization-first: create/update/strengthen the test and observe the red failure or characterization baseline **before** changing production code. The worker is the only party that witnesses this, so it must capture it as it goes.
   - **Instruction to report, in its final message, both (a) the file paths it changed and (b) the unit's verification evidence** — `behavior_changed`, existing tests inspected, tests added/changed or used unchanged, the red failure or characterization observed (when applicable), the verification run and result, and any deliberate no-test exception with its reason. The handoff is a text summary on most harnesses with no guaranteed diff, so reported paths are the orchestrator's starting hint (it still verifies the actual tree); the evidence fields are **not** reconstructable from the tree afterward, so a worker that omits them forces the orchestrator to re-derive or leave `verification_evidence` incomplete.
   - **不要 commit。** 普通 native workers 可以 implement，并在 isolation 中运行自己 unit 的 focused tests 做 self-check；但 **orchestrator 拥有 staging、committing、authoritative test runs**。External cross-model worker 只有在 conditional protocol 下可创建 isolated transport commits；它们只是 change transport，绝不是 canonical commits。（Capability note：若 harness 在 worker completion 时 *reap* isolated workspace，worker 才需要 commit 到 branch；当前 targets 都不会，假设前应确认。）

   **Shared-workspace constraints** — when subagents share your working directory (no isolation): they must not `git add`, commit, or run the full test suite concurrently (index corruption + test interference); the orchestrator does all of that after the batch. A worker may run a single focused unit test only if it touches no shared state.

   **Permission mode:** Omit the `mode` parameter when dispatching subagents so the user's configured permission settings apply. Do not pass `mode: "auto"` — it overrides user-level settings like `bypassPermissions`.

   **每个 serial inline/subagent unit 后：** 根据 unit scope/`Files:` review diff，运行 relevant tests，在 dispatch next 前 fix（绝不在 broken tree 上继续），从 worker return 记录 unit verification evidence（用于 Phase 2 `verification_evidence` roll-up），更新 task list（绝不 edit plan body；progress 在 commits 中），并 commit。再 dispatch next unit。

   **Parallel inline/subagent batch 后，由 orchestrator integrate；绝不只信 handoff summary：**
   1. Wait for every worker in the batch to finish.
   2. **Inspect the actual tree, not reported paths.** Determine what each worker really changed (`git status`/diff in its workspace or the shared dir). Reported paths are a hint; declared `Files:` are often incomplete — workers create/modify files the plan didn't anticipate.
   3. **检测真实 collisions 与 semantic contention**：比较 actual paths，以及 shared contracts、generated/config surfaces、verification effects。Clean merge 不是 compatibility proof。在 advancing canonical base 上 preserve/re-run colliding units，绝不 blind-merge。
   4. **按 dependency order review、test、commit 每个 unit；orchestrator 拥有 commits。** Integrate 一个 result，检查 actual scope，运行 authoritative verification，并创建 canonical commit 后才考虑下一个。针对 advancing canonical tree 重新验证 remaining results。将每个 worker returned verification evidence 收入 run `verification_evidence` roll-up；若 worker 漏报，只 re-derive tree 允许的内容，其余标 unverified，不伪造 worker 未报告的 red-before-implementation observation。
   5. Update the task list (progress lives in the commits).
   6. **Release the workers** — close/clean up each worker handle so it stops holding a concurrency slot or leaving orphans (e.g., Codex `close_agent`; for a Claude per-worker worktree: `git worktree unlock <path>` → `git worktree remove <path>` → `git branch -d <branch>`). These isolated worktrees are peers invisible to any outer orchestrator (e.g., Orca), so cleanup is entirely ce-work's.
   7. Dispatch the next dependency layer.

   **Per-harness integration (examples — the universal flow above is the contract):**
   - **Harness-owned worktree/branch：** 按 dependency order integrate 一个 branch，verify/commit 后再下一个；conflict 时 abort 并 re-run，或针对 advanced tree 显式 resolve unit。
   - **Harness-owned uploaded change set：** 接受一个 isolated result，inspect/verify，canonical commit，再 release worker 后处理下一个。
   - **Shared workspace：** 不允许 parallel batch，使用 serial path。
   - **External cross-model workspace：** 遵循 conditionally loaded cross-model parallel-wave protocol/controller receipts；ordinary branch-merge shortcut 不适用。

### Phase 2: Execute

实现第一个 task 前，必须读取 `references/implementation-loop.md`。每个 task 的 evidence choice、implementation、verification、completion stops 都遵循该 reference，再进入 incremental commits。

2. **Incremental Commits**

   After completing each task, evaluate whether to create an incremental commit:

   | Commit when... | Don't commit when... |
   |----------------|---------------------|
   | Logical unit complete (model, service, component) | Small part of a larger unit |
   | Tests pass + meaningful progress | Tests failing |
   | About to switch contexts (backend → frontend) | Purely scaffolding with no behavior |
   | About to attempt risky/uncertain changes | Would need a "WIP" commit message |

   **Heuristic:** "Can I write a commit message that describes a complete, valuable change? If yes, commit. If the message would be 'WIP' or 'partial X', wait."

   If the plan has Implementation Units, use them as a starting guide for commit boundaries — but adapt based on what you find during implementation. A unit might need multiple commits if it's larger than expected, or small related units might land together. Use each unit's Goal to inform the commit message.

   **Commit workflow:**
   ```bash
   # 1. Verify tests pass (use project's test command)
   # Examples: bin/rails test, npm test, pytest, go test, etc.

   # 2. Stage only files related to this logical unit (not `git add .`)
   git add <files related to this logical unit>

   # 3. Commit with conventional message
   git commit -m "feat(scope): description of this unit"
   ```

   **Handling merge conflicts:** If conflicts arise during rebasing or merging, resolve them immediately. Incremental commits make conflict resolution easier since each commit is small and focused.

   **Note:** Incremental commits use clean conventional messages without attribution footers. The final Phase 4 handoff passes `branding:on` so `ce-commit-push-pr` can add generic Compound Engineering branding to the PR.

   **Parallel subagent mode:** Commit ownership is split by isolation mode (see Phase 1 Step 4):
   - **Worktree-isolated:** subagents may stage and commit inside their own worktree branch; the orchestrator merges those branches in dependency order after the batch.
   - **Shared-directory fallback:** subagents do not commit; the orchestrator stages and commits each unit after the entire parallel batch completes.

3. **Follow Existing Patterns**

   - The plan should reference similar code - read those files first
   - Match naming conventions exactly
   - Reuse existing components where possible
   - Follow the project's coding standards already in your context
   - When in doubt, grep for similar implementations

4. **Test Continuously**

   - Run relevant tests after each significant change
   - Don't wait until the end to test
   - Fix failures immediately
   - Add new tests for new behavior, update tests for changed behavior, remove tests for deleted behavior
   - **Unit tests with mocks prove logic in isolation. Integration tests with real objects prove the layers work together.** If your change touches callbacks, middleware, or error handling — you need both.

5. **Simplify as You Go**

   After completing a cluster of related implementation units (or every 2-3 units), review recently changed files for simplification opportunities — consolidate duplicated patterns, extract shared helpers, and improve code reuse and efficiency. This is especially valuable when using subagents, since each agent works with isolated context and can't see patterns emerging across units.

   Don't simplify after every single unit — early patterns may look duplicated but diverge intentionally in later units. Wait for a natural phase boundary or when you notice accumulated complexity.

   If **`ce-simplify-code`** is available, invoke it at phase boundaries (especially before Phase 3 when the diff is >=30 lines). Otherwise, review the changed files yourself for reuse and consolidation opportunities.

   When the plan carries `session-settled:`-labeled KTDs, pass the plan path as structure-pin context, not as the simplification scope, with the one-line constraint that labeled KTDs are structure pins the simplification must preserve (e.g., deliberate duplication stays duplicated).

6. **Figma Design Sync** (if applicable)

   For UI work with Figma designs:

   - Implement components following design specs
   - Read `references/agents/figma-design-sync.md` and dispatch a generic subagent seeded with that local prompt to compare implementation against the Figma design. Do not dispatch a standalone agent by type/name.
   - Fix visual differences identified
   - Repeat until implementation matches design

7. **Frontend Design Guidance** (if applicable)

   For UI tasks without a Figma design -- where the implementation touches view, template, component, layout, or page files, creates user-visible routes, or the plan contains explicit UI/frontend/design language:

   - Apply the frontend guidance embedded in this skill and the active repo instructions: preserve existing design-system conventions, use real UI controls and states, keep layouts responsive, and verify text does not overflow or overlap.
   - When browser tooling is available, inspect the changed UI at desktop and mobile widths before final validation. If no browser access is available, do a code-level responsive/layout review and record that browser verification was unavailable.
   - Phase 4's screenshot capture still applies when the change is user-visible.

8. **Track Progress**
   - Keep the task list updated as you complete tasks
   - Note any blockers or unexpected discoveries
   - Create new tasks if scope expands
   - Keep user informed of major milestones
   - When the plan defines U-IDs for Implementation Units, or the plan or origin document carries stable R-IDs (and optionally A/F/AE IDs), reference them in blockers, deferred-work notes, task summaries, and final verification — not routine status updates. U-IDs anchor units across plan edits; R/A/F/AE anchor product intent across the brainstorm-plan handoff. Use the IDs the plan supplies and do not invent ones it does not. This preserves traceability without burying signal under noise.

### Phase 3-4: Quality Check and Finishing Work

When all Phase 2 tasks are complete and execution transitions to quality check, you must read `references/shipping-workflow.md` for the full shipping workflow. Do not skip this.

**Code review: one portable path.** Review with `ce-code-review`, which self-sizes (lite roster for small low-risk code-only diffs, full roster otherwise). No harness-native review detection and no escalation tiers — the size/sensitive-surface judgment lives inside `ce-code-review`. Skip dedicated review only for a purely mechanical diff (formatting, dep-bumps, lint-only, generated). Full rules (autonomous Residual Gate, infra fallback) in `shipping-workflow.md`.

**Review is two steps — review, then fix.** `ce-code-review` is review-only. It returns findings (markdown or `mode:agent` JSON); it never edits the checkout, commits, or applies fixes.

1. **Review** — Invoke the `ce-code-review` skill (invocation command in `references/review-findings-followup.md` § Fallback). Use `mode:agent` in orchestrated workflows; pass `plan:<path>` when you have a plan, `base:<ref>` when the merge base is known, and `depth:full` when a deep/thorough review was explicitly requested.
2. **Apply fixes** — Load `references/review-findings-followup.md`. Filter eligibility on JSON only, **batch applicable findings by file**, dispatch fix subagents (parallel when file sets are disjoint). The orchestrator merges diffs, runs tests, and commits — it does not pre-investigate findings.
3. **Residual Work Gate** — Only after followup; unresolved actionable findings go through the gate in `shipping-workflow.md` (autonomous sessions auto-accept + record residuals; interactive sessions ask).

## Return-to-Caller Mode

`mode:return-to-caller [implementation_engine:<compact-json>] [implementation_run:<safe-id>] <plan-path>`（legacy alias：`mode:caller-owned-tail`）
仅供 `lfg` 等负责 post-implementation shipping gates（final simplify、code review、
PR creation、CI watching）的 orchestrators 使用。
In this mode `ce-work` performs implementation and local verification only —
including mid-implementation Phase 2 "Simplify as You Go" — then returns a
structured summary instead of running the standalone shipping tail.

Return:

- `status`: `complete`, `blocked`, or `failed`
- `plan_path`
- `changed_files`
- `u_ids_attempted`
- `u_ids_completed`
- `verification_results`
- `verification_evidence`: one entry per attempted behavior-bearing unit, plus any non-behavioral unit where tests were intentionally skipped. Each entry states the unit/task, `behavior_changed`, `existing_tests_inspected`, `tests_added_or_changed`, tests used unchanged, red failure or characterization observed when applicable, verification commands/results, and any exception reason. For units executed by subagents, this entry is assembled from each worker's returned evidence (Phase 1 Step 4), not reconstructed from the diff — the red-before-implementation observation exists only in the worker's report.
- `implementation_engine_binding`：resolved one-run `mode`、`target`、`model`、`source`；native execution 无 binding 时为 `null`
- `requested_route` 与 `actual_route`：target + harness/intermediary identity；发生 fallback 或 same-family substitution 时保持分离
- `requested_model` 与 `actual_model`：request 与 receipt-attributed served identity（route 无 trustworthy receipt 时为 `unverified`）
- `fallback_reason`：无则 `null`，否则为 observed route-unavailable/substitution reason
- `run_id`：durable external run identifier；native execution 为 `null`
- `source_kind` 与 `source_digest`：controller-recorded implementation authority（Return-to-Caller Mode 为 `plan` + digest；standalone bare-prompt run 用 `prompt`）
- `unit_receipts`：每个 attempted unit 的 route、model、detached-process、integration、verification、canonical-commit、cleanup state
- `plan_checkpoint`：selected plan 是唯一 canonical dirt 时 disclosed checkpoint commit，否则 `null`
- `blockers`
- `recovery_path`：仍需 recovery 时 preserved owner-checked run/workspace location，否则 `null`
- `settled_decision_conflicts`: conflicts with `session-settled:`-labeled KTDs encountered during implementation — each entry names the KTD, the evidence, and how it was routed (proceeded-and-flagged vs blocker); empty when none
- `behavior_change`: whether behavior-bearing code changed
- `standalone_shipping_skipped: true`

Return `status: complete` only when behavior-bearing work has verification evidence or a deliberate exception. If a previous return-to-caller run implemented code but omitted evidence, a later same-plan return-to-caller run should use the idempotency check to inspect the existing work, complete the evidence, and return without reimplementing.

Engine selection (`references/execution-engines.md`) still applies in this mode,
but only for implementation. In return-to-caller mode do not emit a copyable
goal/workflow prompt — a manual paste step strands the caller; run
inline/subagents or return a blocker instead. Any goal/workflow engine used here
must not open a PR, run the owner workflow tail, or bypass the caller-owned
gates.

## Key Principles

### Start Fast, Execute Faster

- Get clarification once at the start, then execute
- Don't wait for perfect understanding - ask questions and move
- The goal is to **finish the feature**, not create perfect process

### The Plan is Your Guide

- Work documents should reference similar code and patterns
- Load those references and follow them
- Don't reinvent - match what exists
- A KTD carrying a `session-settled:` annotation (classes `user-directed` / `user-approved`) records a decision the user already made — it is not yours to improve. This scopes to labeled KTDs only: details the plan leaves open remain your judgment, and a real defect discovered inside a settled approach is still surfaced at full strength — the label never suppresses defect evidence. If implementation reveals a labeled decision is invalidating-grade unworkable (infeasible, wrong-thing, destructive), that is a genuine blocker: surface it rather than silently working around or "fixing" the decision

### Test As You Go

- Run tests after each change, not at the end
- Fix failures immediately
- Continuous testing prevents big surprises

### Quality is Built In

- Review every non-mechanical diff with `ce-code-review` (it self-sizes; see `shipping-workflow.md`)

### Ship Complete Features

- Mark all tasks completed before moving on
- Don't leave features 80% done
- A finished feature that ships beats a perfect feature that doesn't

## Common Pitfalls to Avoid

- **Analysis paralysis** - Don't overthink, read the plan and execute
- **Skipping clarifying questions** - Ask now, not after building wrong thing
- **Ignoring plan references** - The plan has links for a reason
- **Testing at the end** - Test continuously or suffer later
- **Forgetting to track progress** - Update task status as you go or lose track of what's done
- **80% done syndrome** - Finish the feature, don't move on early
- **Skipping review without reason** — review every non-mechanical diff with `ce-code-review`; skip only for a purely mechanical diff or when it is genuinely unavailable, and document the skip reason
- **Re-scoping the plan into human-time phases** - The plan's Implementation Units define the scope of execution. Do not estimate human-hours per unit, propose multi-day breakdowns, or ask the user to pick a subset of units for "this session". Agents execute at agent speed, and context-window pressure is addressed by subagent dispatch (Phase 1 Step 4), not by phased sessions. If a plan-file input is genuinely too large for a single execution, say so plainly and suggest the user return to `/ce-plan` to reduce scope — don't invent session phases as a workaround. For bare-prompt input, Phase 0's Large routing already handles oversized work
