# 跨模型执行协议

仅在选中 cross-model engine，或已激活 existing external run recovery 后加载此 reference。它定义 fixed-route、authority、fallback、identity、receipt 和 serial transaction contract。Host 驱动 bundled controller、detached runner 和 adapter；worker response 或 process exit 都不能代替 controller 与 Git evidence。

## 解析一个 requested route

只使用这些 target：`codex`、`claude`、`grok`、`cursor`、`composer`。每次 disclosure 和 receipt 都要分别记录五项 identity fact：target、harness/intermediary route、requested model、actual model、receipt status。

**Fixed controller route tokens：** egress sanction 中必须精确记录 `codex`、`claude`、`grok-cli`、`cursor`、`composer` 或 `grok-cursor`。`grok-cli` 将 target `grok` 映射到其 native harness；`grok-cursor` 将 target `grok` 经 intermediary `cursor` 映射。这些 controller tokens 不是 descriptive route label。

- `cursor` 表示使用 configured default model 的 Cursor harness。
- `composer` 表示经 Cursor 使用 Composer-family model。
- `grok` 优先使用固定 native route；经 Cursor 使用 Grok model 属于不同 intermediary，必须单独 permit 和 sanction。

对于有序 standing preference，在不 egress 的情况下按顺序 preflight candidates。只有 candidate harness 及 requested/default model 与当前 host 等价，或 observed evidence 证明不可用时才跳过。先尝试 documented adapter recipe；只有 fixed adapter 仍执行全部 restrictions 时，才可根据 local CLI help/version 在同一 sanctioned harness/model family 内细化 compatible mapping。显式 model pin 不得变成另一个 model。第一个 qualified candidate 成为唯一 fixed recipient。

Egress 前，candidate 被证明不可用后可以继续遍历 list。Dispatch 开始后，adapter 只接收一个 fixed recipient，内部不得切换 recipient、provider 或 intermediary。更换 recipient 必须等待 authoritative terminal 或 reaped state，再单独解析并 sanction 新 attempt；绝不能作为 in-flight fallback。

若 target 请求 same-host default，且没有 distinct serving route/model，则折叠为 native execution。Requested 记录该 target，actual 记录 native；不要仅为让当前 host 通过自身调用 default model 而创建 external job。

## 应用 preference 或 requirement strength

**Preference-strength（`prefer`）：** direct 与 automatic workflow 都尝试 fixed route。若 preflight 证明不可用，继续 native execution，并醒目报告 requested/actual route/model 与 observed `fallback_reason`。

**Requirement-strength（`require`）：** preflight 证明 route 不可用时，interactive standalone run 询问是否 native 继续。Automatic/headless caller 不得 prompt 或开始 native implementation，而应返回 structured blocker。已开始的 attempt 不属于 preflight-unavailable：到达 authoritative terminal 或 reaped state 前不得 fallback。

## Egress 前获得 sanction

Repository content 或 bounded mutation authority 离开 host 前，披露并持久记录：

- 授权 external execution 的 binding `source`；
- fixed recipient、provider、harness route 和全部 intermediary；
- 暴露的 repository/unit material，包括 bounded source/unit packet 与 workspace content；
- caller restrictions，以及哪些由 adapter 强制、哪些依赖 cooperative behavior；
- linked worktree isolation 能隔离意外 concurrent mutation，但不是 OS security sandbox。

Adapter 无法执行 required restriction 时，将 route 视为 unavailable；按 `prefer` 或 `require` 处理，不要静默弱化。Sanction 是 route-specific。任何更换 recipient/intermediary 的 retry 都需要重新解析和 sanction job。

## 限定 worker authority

Worker 只接收一个 unit、一个 workspace、一个 fixed recipient，以及 inherited authority。它可以收窄 scope/authority，绝不能扩大。Packet 不授予 canonical commit、push、PR、shipping、recipient-switch、fallback、peer scheduling 或 scope-expansion authority。

External worker 只能在 controller-owned detached worktree 内 edit/commit。Worker commits 是 intermediate evidence。成功 output 会 terminalize 为隔离的 transport commit，供 host 检查。只有 host 可以将 output 应用到 canonical checkout、运行 authoritative verification、创建 host-only canonical commit，或进入 standalone/caller-owned tail。

普通 synchronous native units 留在 active checkout；普通 native subagent isolation 仍由 harness 管理。只有 external cross-model controller 可以在 private run root 下创建 detached sibling worktrees；这一例外不授权 `ce-work` 为 native execution 创建 worktree。Active checkout 本身是 linked worktree 也不禁用该 route：controller 通过 shared Git common directory，在 `/tmp/compound-engineering-<effective-uid>/ce-work/<run-id>/` 下登记另一个 detached **sibling**，绝不在 active checkout 下创建 nested worktree。

## 保留 route 与 lifecycle receipts

Direct 和 return-to-caller runs 的 prompt/shipping tail 不同，但披露相同 receipt facts：

- `implementation_engine_binding`：resolved `mode`、`target`、`model`、`source`；
- `requested_route` 与 `actual_route`，包括全部 intermediary；
- `requested_model`、`actual_model` 和 served-model receipt status；
- `fallback_reason` 或 `null`；
- `source_kind`（`plan` 或 `prompt`）及 controller-recorded digest；
- `run_id` 和 per-unit `unit_receipts`，区分 process terminal state、integration、authoritative verification、host canonical commit、cleanup；
- `plan_checkpoint`：只有 resolved selected plan 是唯一 canonical dirt 时，才是 disclosed host commit；
- `blockers`；
- preserved inspectable state 的 `recovery_path`。

绝不能只根据 detached-process completion 推断成功。只有每个 required unit 都到达 host-owned canonical state，run receipt 才完整。Plan-only checkpoint 会披露给 direct user 或返回 automatic caller；unrelated dirt 不会获得 implicit checkpoint，而会让 external route unavailable。

## 为 bare-prompt work 构建 source

Phase 0 已判断 bare prompt 足够具体可执行时，不要求 formal plan。Controller initialization 前，将一份 bounded implementation brief 直接写到 repository 外的 OS temp。Brief 是提炼后的 authority artifact，不是 transcript：不得包含 raw conversation history、unrelated session context、credentials 或 speculative scope。

根据 request 与 Phase 0 discovery 的 concrete evidence 填写：

- `Request`：当前 implementation request，只为去除 unrelated conversation 而转述；
- `Goal`：一个 observable outcome；
- `Scope`：expected files/surfaces 和 discovered patterns/tests；
- `Acceptance and verification`：证明 completion 的 behavior 与 authoritative checks；
- `Constraints and exclusions`：inherited restrictions、non-goals、unresolved boundaries；
- `Units`：默认一个 conservative `P1` unit；只有 discovery 在不猜测的情况下确定 distinct goals、dependencies、expected files、verification 时才增加。

若 Goal、bounded Scope 或 Acceptance and verification 任一无法填写，不要 initialize 或 egress；返回 Phase 0 clarification/planning。计算 brief SHA-256，使用 `--prompt-brief <temp-path> --prompt-digest <sha256>` 调用 controller `init`，此后只使用 controller-owned private copy 与 digest。Initialization 后 caller temp path 不再 authoritative。Invocation origin 不改变本 contract。

## 串行 external-unit protocol

从 host checkout 每次为一个 ready unit 运行该 protocol。根据 skill directory 解析 bundled scripts。Host 始终是 orchestrator；external CLI 只是 bounded author。所有 host Git operation 使用 `git -C <canonical-checkout>`；解析或运行 bundled script 后，绝不能依赖 shell current directory。

**Visibility and stop invariant：** 到 terminal scope inspection 前，每个 host tool call 只执行一个 state-changing controller transition。绝不生成或运行跨越 `start` 到 wait/integration、跨多个 units、循环 external runtime，或有条件继续下一 transition 的 shell script。`start` 必须在 supervision 前返回。每次 runner wait 最多 60 秒，之后在后续 host tool calls 中 sync 并发布 progress。Scope inspection 后使用 controller 单一 fail-stop `integrate` transaction，不要手工串联内部 Git/controller transitions。Controller、runner、verification 或 Git 非零退出会结束当前 host tool call；后续 transition 前先检查 controller status，进入规定的 restoration/recovery path。

设置时，`CE_WORK_RUNS_ROOT` 是包含全部 `<run-id>/` 的父 CE Work directory，不是某个 run directory。

1. **Resolve、preflight、sanction。** 应用 `execution-engines.md` 的 authority/scope resolution。Ordered standing preference 跳过 equivalent self-route，并依次 preflight remaining candidates，直到第一个 qualified；记录所有 rejected candidate 与 reason。验证 fixed adapter/caller restrictions，然后披露 sanction source、route/intermediaries、material exposed、restriction posture。Controller `init` egress object 必须使用精确复数 key `route`、`intermediaries`、`restrictions`：direct `codex`、`claude`、`grok-cli`、`cursor` 使用 `intermediaries: []`，`composer`、`grok-cursor` 使用 `intermediaries: ["cursor"]`。全部不可用时，`prefer` 在披露 requested/actual 后 native 继续；`require` 只在 interactive standalone run 询问，automatic/headless run 不开始 native work，直接返回 blocker。
2. **建立 durable source 与 clean canonical state。** 用 `unit-workspace.py` `init` 初始化 private run；controller 负责创建 `/tmp/compound-engineering-<effective-uid>/ce-work/<run-id>`，不要预创建。Repository plan 传 `--plan <path> --plan-digest <sha256>`；selected plan 可以是唯一 dirty path，`checkpoint-plan` 记录该 exact plan-only checkpoint。此状态可 checkpoint，不是 route blocker。Bounded prompt brief 传 `--prompt-brief <temp-path> --prompt-digest <sha256>`；controller 复制到 private run state，而 canonical checkout 必须已 clean。只有 checkpoint failure 或 unrelated dirt 会使 route unavailable。Prepare unit 前重新读取 canonical repository、branch、HEAD、source kind/digest 与 cleanliness。
   `init` 返回 `READY` 后，该 unit 的 engine decision 已关闭：下一 implementation path 是 `prepare` 后 fixed-author start，或保留 returned recovery path 的 blocker。Expected latency、orchestration cost，或后来认为 native 更简单，都不是 route unavailability，也不授权 canonical writes。只有后续 controller fallback gate 才能让 native implementation eligible。
3. **准备 bounded unit packet。** Plan source 只包含 Goal Capsule、Definition of Done、active unit、相关 Verification Contract rows、引用的 R/F/AE/KTD excerpts、inherited restrictions、expected files、evidence strategy、explicit exclusions。Prompt brief 只包含匹配 P-unit 的 Goal、Scope、Acceptance and verification、Constraints and exclusions、expected files、evidence strategy。默认不暴露整个 plan、prompt brief 或 conversation。Packet source 直接写到 canonical checkout 外的 OS temp，例如 controller-returned recovery path 下的 source file；绝不能先在 repository 起草再移动。用 source path、unit id、recorded base、dependencies、wave fields 和 route-qualified activity posture 调用 `prepare`。Dispatch 只使用 controller-returned `attempt_id`、controller-owned `packet_path`、computed `packet_digest`；不要替换为 caller source path、自算 digest 或假设的 attempt name。
4. **启动一个 fixed author。** Controller-issued authorization schema 将 `run_id`、`unit_id`、`attempt_id` 与 fixed route/model/intermediary、packet contract 绑定。以 skill `ce-work` 调用 `peer-job-runner.py start --no-sweep --input-digest <controller-packet-digest>`；runner label 必须精确等于 unit id，不带 attempt id/suffix，`--result-path` 必须为 `<controller-result-dir>/implementation-result.json`。`--input-digest` 与 adapter expected-packet argument 都必须使用 `prepare` 返回的 exact `packet_digest`；省略、重算或替换会让 job 无资格 `record-job`。Runner/controller 自动共享 root：设置时 `CE_WORK_RUNS_ROOT` 优先，否则都从 `CE_PEER_JOBS_ROOT` 推导。每次 production start 都设置 `CE_PEER_HARD_SECS=7200`；route-qualified `incremental` activity 设置 `CE_PEER_IDLE_SECS=600`，`hard-only`/不可信 activity 设置 `CE_PEER_IDLE_SECS=0`。600 秒 window 随 progress 重置，用来检测 stall，不是 wall-clock maximum。Production worker command 为 `cross-model-work.sh <authorization_path> <workspace> <unit-packet> <expected-packet-sha256> <result-dir>`；returned adapter path 必须直接作为第一个 worker argv，不加 `bash`、`sh`、`env` prefix；只传 controller-returned `authorization_path`，绝不传 caller route string 或 ambient model override。Runner 向 worker export controller-visible job id。构建 prompt 或启动 external CLI 前，adapter 必须传入该 job id，并调用 `authorize-dispatch` 获得成功。它读取 actual runner metadata 与 exact worker argv，egress 前拒绝 shell prefix/substituted adapter，并 atomic 地将 job id 绑定 exact attempt、authorization digest、workspace、packet path/digest、result directory，同时重新验证 controller-owned exact route/model/intermediary contract。同 attempt 的第二个 job 会被拒绝。Missing/refused handshake（含 hand-authored/cross-attempt authorization）拒绝 egress。Model pin 只来自 authorized projection。`--emit-adapter` 只用于 introspection，从不授权 production dispatch。立即以 controller-returned `attempt_id` 原样调用 `record-job` 记录 returned job id；它会 idempotently 确认同一 validated binding。不要让一个 host tool call 持续等待 external runtime，也不要让 adapter 选择其他 recipient。
5. **只观察，不 steer。** Runner `status --skill ce-work` 或 `wait --skill ce-work --max-secs 60` 与独立 `sync-job` calls 交替；所有 bare-job-id `status`、`wait`、`result`、`reap` 都要带 `--skill ce-work`，并使用 start 时相同 root selection。每轮报告 unit、route、elapsed time、latest meaningful activity、activity posture、terminal state。Qualified silent terminal-only route 正常使用 `hard-only`：禁用 idle timeout、保留 universal hard cap，绝不因缺少 incremental activity 推断 failure/fallback。Live 或 temporarily unreachable attempt 仍 authoritative，不要启动 fallback/duplicate work。只通过 explicit controller/runner path reap，并保留 workspace。
6. **Terminalize 完整 Git output。** Authoritative `done` 后调用 `terminalize`。Pinned synthetic transport commit 必须以 recorded base 为唯一 parent，并包含完整 final workspace tree。后续 host call 检查 actual transport diff、changed paths、binary/mode/rename/delete evidence、adapter result、packet expected scope、scope-expansion request。Generated byproduct 或 actual paths/expected scope/worker evidence 之间任何 unexplained difference 都是 unexpected scope：保留给 host 处理，不要 acquire integration。
7. **通过 fail-stop controller transaction integrate。** 独立 scope-inspection call 接受 complete transport 后，调用 `unit-workspace.py integrate --run-id <run-id> --unit-id <unit-id> --commit-message <message> --verification-summary <summary> [--allowed-head <recorded-head>] -- <verification-command-and-argv>`。Simple Verification Contract command 作为 direct argv。若含 `$(...)`、pipe、`&&`、redirect 或 glob，首次就显式使用支持 pipe-failure 的 shell，例如 `-- bash -o pipefail -c 'test "$(cat delegated.txt)" = "expected"'`；把 `$(...)` 作为 direct arg 引用不会展开。不要手工串联或条件复刻该 transaction。
8. **让 `integrate` 拥有 canonical mutation。** 它执行 `integration-acquire`、`preflight`、`git cherry-pick --no-commit`、`mark-applied`、禁用 Python bytecode 的 authoritative canonical verification、exact canonical-state reconciliation、`mark-verified`、一个 host-owned commit、`mark-committed`。Wave 还记录 `wave-advance`；reconciled commit 后执行 `cleanup` 与 `integration-release`。
9. **将 outcome 视为 authoritative。** 直接捕获 authoritative command exit status，绝不从 stdout 推断 pass。任何 new verification artifacts 或其他 canonical-state change 都会让 reconciliation 失败。Verification/clean-state reconciliation 在 `mark-verified` 前发生；rejected verification 或 pre-commit controller/Git step 禁止 commit，调用 `restore` 证明 exact pre-fold equality，并在 fallback/retry/next unit 前释放 lock。无法证明 exact restoration 时，保留 lock、workspace、transport ref、recovery path。Canonical commit 后 crash 仍是 resumable evidence，不得 redispatch。
10. **通过 controller 运行 source-wide gates。** 全部 external units committed/cleaned 后，用 `verify-run --run-id <run-id> --verification-summary <summary> -- <verification-command-and-argv>` 运行 plan-wide Verification Contract gates 或 prompt brief authoritative checks。不要直接在 canonical checkout 运行 final commands，或将 status 隐藏在后续 command 后。`verify-run` 只从 clean canonical snapshot 开始，禁用 Python bytecode 并直接捕获 exit status，恢复 verification-created artifacts，再次证明 exact starting snapshot，记录 durable receipt。即使 cleanup 成功，failing gate 仍保留 private log 并阻止 return/shipping tail。

将每个 transition 投射到 direct commentary 或 return envelope：resolved source kind、route、适用时 plan checkpoint、dispatch、activity、terminal result、transport/scope inspection、integration、可能的 restoration、authoritative verification、canonical commit、cleanup、blocker、recovery path。Serial protocol 不授权 parallel wave 或 automatic redispatch；它们需要后续 gates。

## 并行 external-wave protocol

只有 always-loaded Parallel Safety Check 证明 ready units 在 dependencies、declared files、shared contracts/interfaces、migrations、lockfiles、generated/registry/config surfaces、environment singletons 和 expected merge cost 上独立后，才使用 wave。不确定即选择 serial execution。Scheduler 仍由 host 负责：workers 不得添加 peers、扩大 wave 或修改自身 dependency。Wave 限制为 3-5 workers。

1. 从 clean canonical checkout 记录一个 wave id、dependency order、**一个 recorded wave base**。所有 member 从同一 base 准备，使用不同 controller-owned workspace。Synchronous native work 留在 active checkout；每个 concurrent worker 都隔离。
2. Concurrent 启动 fixed-route jobs，只观察不 steer，并在首次 fold-in **之前**将每个 worker terminalize 为以 base 为 parent 的 synthetic transport commit。任何 worker 未 terminalize 时一个也不 integrate。Mutation 前检查全部 actual transport inventories；same-path change 停止 wave，路径不同但 shared-interface/semantic contention 也返回 host 处理。
3. 在 canonical integration lock 下按 dependency order serial integrate。First unit 对 wave base preflight。Clean textual apply 不等于 semantic compatibility：检查 scope、对 advancing canonical tree 运行 unit authoritative verification，并创建一个 host-owned canonical commit。
4. Unit lock 仍持有时，以 exact recorded canonical commit 调用 `wave-advance`。Controller 只接受 parent 为 recorded pre-fold HEAD 的 manifest-confirmed commit，并将其作为 **exact earlier host-owned canonical commits** 之一加入 later siblings。Acquire next sibling lock 前 cleanup/release completed unit。
5. 每个 later result 的 `preflight` 只传 current exact recorded wave commit。Unknown HEAD movement 会阻塞。即使 three-way apply clean，也重复 actual-scope inspection、semantic revalidation、authoritative verification 和独立 host commit。Transport commit 绝不直接 merge/commit。
6. Conflict、scope expansion、semantic collision、test failure 或 commit failure 在 lock 持有时进入 serial protocol exact restoration。证明 restoration 并释放 lock 前，不启动 sibling/retry/fallback；affected dependents 保持 queued。重新计算 readiness 后，unaffected siblings 可继续；affected unit 需要 host 显式处理、在 new base redispatch 或 serial fallback，绝不 blind-merge colliding/stale result。
7. Repeated collision、broad unplanned edits 或无法证明 exact restoration 会禁用本 run 后续 waves。保留 inspectable workspaces/refs；一个 unit failure 不丢弃 unaffected sibling，但绝不提前授权 dependent unit。

## 精确 resume 与只 fallback 一次

Caller 直接或通过 return-to-caller `implementation_run:<safe-id>` 提供 run id 时，使用 `resume --run-id <id>` 并将该 id 视为 authoritative。Recovery activation 发生在 ordinary input classification 前，不得 dispatch new work。没有 run id 时，plan-backed run 必须用 `resume --repo <canonical-checkout> --plan-digest <selected-plan-digest>` 发现；绝不通过列 shared run root 推断/选择 run id。Prompt-backed run 必须使用 disclosed run id，不从 conversation text/caller temp path 重新发现。只 resume 一个匹配 repository identity、branch、plan digest 的 unfinished plan-backed run；多个匹配时列出 run ids/recovery paths 并阻塞，不自行选择。Ambiguous unfinished state 存在时不得创建第三个 run。Unsafe/foreign-mode manifest 是 blocker，不是可跳过 candidate。

所有 units 都 terminal（`cleaned` 或 `native-completed`）且已有 successful plan-wide verification receipt 时，completed run 只允许 observation。根据 manifest/stored receipts 构建 return envelope；recovery 不得仅为重确认 evidence 而重跑 Verification Contract gate、调用 `verify-run` 或执行 test/build/format/install/generation command。缺失 required receipt 应报告 recovery blocker，不得即兴追加 loose verification tail。

Resume 会 reconcile durable evidence，但不得 redispatch、reapply、recommit 或运行任一 owning tail。它可以 adopt 恰好一个 matching unbound runner job、monitor recorded live job、terminalize authoritative `done` output、继续 interrupted exact restoration，或记录 parent/tree 与 pre-fold evidence 匹配的 verified canonical commit。Manifest row 前写入的 transport ref 只有 sole parent/final tree 匹配时可复用。Preflight 记录 expected post-apply tree/changed-path set：exact match 可 reconcile 在 manifest row 前落地的 apply；unknown dirt 则阻塞且不 destructive restore。

Preserved work 使用 controller `status`、`reap`、`cleanup`。Loss of contact 仍将 recorded job 视为 live，直到 runner evidence terminal 或 explicit reap 记录 termination。Interrupted worktree removal 后 cleanup 是 idempotent。Explicit abandonment 需要 exact transport SHA；若 failed/reaped attempt 无 transport，则需要 exact terminal job id。

Exact restoration、exact abandonment cleanup 和 integration-lock release 后，在同一 scalar `run_id` 下通过 `prepare` 使用 fresh `attempt_id` redispatch corrected unit。保留 earlier attempt receipts；不要创建另一个 run id 或将单一 logical run 表示为 run-id list。Controller 会拒绝改变 unit recorded dependency 或 wave/base contract 的 retry。

Post-start fallback 是独立 atomic gate。Authoritative failure、timeout、`died-without-result`，或 exact restoration/lock release 后，native implementation 前调用 `claim-fallback`。第一个 `prefer` claim 只授权一次 native fallback；`FALLBACK_ALREADY_AUTHORIZED` 表示不得再次启动。Live job 或 successful unreconciled output 会拒绝 claim。Interactive `require` 返回 `CHOICE_REQUIRED`，直到用户明确确认 native continuation；headless `require` 保持 blocked。Integration 已开始时，记录 exact restoration 且 canonical checkout 仍等于该 snapshot 前，retry/sibling/fallback claim 都不 eligible。Claimed native implementation committed/locally verified 后，以 accepted HEAD、local verification evidence SHA-256 digest、bounded summary 调用 `complete-fallback`；`prefer` 和已明确确认的 interactive `require` 都可完成。`FALLBACK_COMPLETED` 只关闭该 unit。全部 units terminal 后，通过 `verify-run` 运行 plan-wide Verification Contract；controller 返回 `RUN_VERIFIED` 并存储 success receipt 前不得报告 run complete。

## 保留 tail ownership

Engine 只改变 implementation authorship。Standalone invocation 在 local implementation 后恢复 `ce-work` quality/shipping workflow。`mode:return-to-caller` 返回 implementation/local-verification receipts，并设置 `standalone_shipping_skipped: true`；绝不运行 caller 拥有的 simplify/review/PR/CI gates。External workers 不继承任何 tail。
