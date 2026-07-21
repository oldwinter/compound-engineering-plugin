# Cross-Model Adversarial Pass

**中文导读：** 本 reference 是所属 skill 的 load-bearing execution detail。请先阅读对应 `SKILL.md` 的中文导读；下方英文内容是 canonical executable contract，命令、字段、阶段顺序和安全边界必须按原文执行。

Runs the **adversarial** review through one separately routed model target in a read-only process. The peer gets the **same** `references/personas/adversarial-reviewer.md` brief the in-process reviewer uses, returns the same `findings-schema.json` shape, and folds into Stage 5 as reviewer `adversarial-<provider>`. It counts as independent corroboration and can promote agreement only when its receipt records `independence_verified: true`; otherwise it remains attributed review evidence without a promotion bonus.

This pass is **adversarial-only**. No other persona gets a cross-model twin, and there is no whole-diff generalist peer. Cost stays gated on the existing Stage 3 adversarial selection.

Host 在 egress 前解析并批准一条具体 route；`scripts/cross-model-adversarial-review.sh` 强制使用该固定 route、应用 read-only controls、捕获符合 schema 的 JSON，并记录 identity receipts。分派前，它会保守估算 diff tokens 和 file count。Oversized diffs 不会 inline：worker 向 peer 提供 orchestrator 的精简 semantic review map，并把 exact diff 保留为私有、可选择读取的 artifact。Tool-limited routes 会把该 temp directory 作为额外 read root；Codex 在现有 read-only sandbox 下选择性调用 `git diff <base> -- <path>`。失败的 route 不写入 artifact，也绝不在内部切换 recipients。

## Gates — run only when all hold

1. `adversarial-reviewer` was selected in Stage 3 (reuse that diff gate — don't run a costly external CLI on a trivial diff).
2. Scope is `local-aligned` or standalone — the working tree IS the reviewed head. Skip in `pr-remote` / `branch-remote`: the peer reviews the local tree, which is not the PR/branch head.

## Step 1 — Attest host identity, then sanction one fixed route

Keep requested **target**, CLI **harness/intermediary**, serving **family/provider**, and served model separate. `cursor` means `cursor-agent` with its configured default/Auto model and no `--model` flag. `composer` means an explicit Composer-family model through Cursor. `grok` prefers its native CLI; Grok through Cursor is a distinct route and recipient.

Attest both the host harness and its serving family:

```bash
if [ "${CLAUDECODE:-}" = "1" ]; then XHOST_HARNESS=claude; XHOST_FAMILY=claude;
elif [ -n "${CODEX_SANDBOX:-}${CODEX_SANDBOX_NETWORK_DISABLED:-}${CODEX_SESSION_ID:-}${CODEX_THREAD_ID:-}${CODEX_CI:-}" ]; then XHOST_HARNESS=codex; XHOST_FAMILY=codex;
elif [ -n "${CURSOR_AGENT:-}${CURSOR_CONVERSATION_ID:-}" ]; then XHOST_HARNESS=cursor; XHOST_FAMILY=unknown;
else XHOST_HARNESS=unknown; XHOST_FAMILY=unknown; fi
```

Pass `XHOST_HARNESS` as `CROSS_MODEL_HOST_HARNESS`; pass `XHOST_FAMILY` as the first worker argument. Claude Code maps to harness/family `claude`; Codex to `codex`. Cursor maps to harness `cursor` and family `unknown` unless an observable serving-family attestation lets you set `XHOST_FAMILY` to `codex`, `claude`, `grok`, or `composer`. An unknown host family cannot satisfy automatic same-family exclusion, so skip the automatic cross-model pass. Never infer serving family from the Cursor brand.

Resolve the preference in this order:

1. A preference the user **states in conversation** (e.g. "use grok for the cross-model pass").
2. `cross_model_peer:` in `.compound-engineering/config.local.yaml` (the only file the script/skill reads for this).
3. A preference already in your **project instructions** (the active instructions in your context) — consumed from context, **never** read from a named file.
4. **Default:** first available attested-different target in `codex → claude → grok → composer`; Cursor-default participates only when explicitly preferred.

Before egress, resolve the target to one concrete installed route, verify every recipient against `CROSS_MODEL_PEERS`, announce it, and pass it as `CROSS_MODEL_FIXED_ROUTE`. A failed route returns no artifact and never changes provider or intermediary internally. A retry is a new disclosed and sanctioned dispatch. For backward compatibility, either `cursor` or `composer` in `CROSS_MODEL_PEERS` sanctions Cursor as an intermediary, but selecting Cursor-default requires target `cursor`; `grok` alone never sanctions Grok-via-Cursor.

`CROSS_MODEL_PEERS` is an optional restriction: when unset, it leaves the resolved route unfiltered and this skill invocation plus the concrete pre-egress disclosure sanctions that route; when set, the selected target/intermediary must appear. Use this contract directly. Do not inspect the worker source to rediscover its allowlist behavior.

Preferred mappings run first. Only after an observed unavailable, obsolete, or incompatible model may the host choose the closest compatible same-target/same-family replacement. Bind it with `CROSS_MODEL_MODEL_OVERRIDE_TARGET=<target>` and `CROSS_MODEL_MODEL_OVERRIDE=<model-id>`. Never substitute across families, leak an override to another route, silently change an explicit model, or add a recipient.

## Step 2 — Provider model + reasoning tier (owned by the script)

Peer 按 **每个 provider 一个经审慎选择的 model 和 reasoning tier** 运行。具体 model IDs 和 route effort flags 集中在 `scripts/cross-model-adversarial-review.sh` 的单一 mapping 中；本 reference 不重复定义。目前 Claude Opus 和 native Grok 使用 high，Codex 使用 extra-high；cursor-agent routes 使用其 model 隐含的 tier 或 ceiling。用户选择 peer target，而不是任意 model/effort matrix。绝不继承 harness 配置的默认 model。只有在有区分度的 effectiveness eval 之后才能采用较低 tier，绝不能仅凭成本决定。

The script always uses the adversarial persona brief; fold-in forces `reviewer` to `adversarial-<provider>`.

## Step 3 — Announce

The ce-code-review invocation authorizes the selected configured/allowlisted route after this disclosure. The announce is a transparent notice, not a second confirmation gate. Skip for an explicit user prohibition or an observed scope/allowlist/route/authentication failure, never solely because the user did not separately authorize the external pass in the same prompt.

- **Interactive host, default mode:** surface a **prominent standalone line** that frames it as an **independent cross-model adversarial review** (say "cross-model" / "independent model" — not the internal "peer" jargon), names the requested **model and reasoning level** from the in-script mapping, and — because two different models can arrive over the *same* `cursor-agent` CLI — names **the route as well as the model** for cursor-agent routes, and states that reviewed code/diff content is sent to that provider. **Announce wording follows the receipt:** name a model as serving only where the route carries a served-model receipt; on receipt-less routes say "requested <model> at <effort>; serving model/effort unverified on this route." Placed with the Stage 3 team announce, not buried after it.
  - Call the pass **independent** only when host and target serving families are attestably different. For Cursor default/Auto or an unknown host family, call it a cross-harness review and state that independence is unverified; do not promise agreement promotion before the receipt exists.
  - Announce the one fixed route and every recipient before dispatch. A failure may be retried only after resolving, sanctioning, and disclosing a new route. Reconcile target, harness, route, requested model, and actual model from the artifact.
- **Interactive host, no peer resolved** (host serving family un-attestable, or no different provider installed/authed): one quiet line that the cross-model pass was skipped and why. Never an error.
- **`mode:agent`:** emit no user-facing prose. The script still emits a one-line stderr audit log per send that review content was sent cross-model to the named provider, so the third-party data egress is auditable.

## Step 4 — Start the detached peer job before local dispatch

The script is a CLI shell-out, not a subagent, so it doesn't consume the subagent concurrency budget. **Never hold a tool call open for the peer's runtime** — some harnesses kill long tool calls, which silently vanishes the pass. At the Stage 3d routing boundary, start it as a **detached, supervised job** through the bundled runner in one short Bash call (prints the job id in under ~2s). Only after that call returns may the host finalize the local roster and enter Stage 4. The detached worker still overlaps the local reviewers; binding it first prevents the host from accidentally dispatching the in-process adversarial fallback too.

`start` 前，orchestrator 写入 `<run-dir>/adversarial-review-brief.md`。内容保持精简（最多 32 KiB）且聚焦语义：

- Stage 2 intent summary；
- 从当前 file inventory 和 diff 中选出的 2-8 个 material risk divisions，每个附一行 reason 和代表性 paths 或 path prefixes；
- 哪些 divisions 属于明确的 generated repetition，应通过 generator inputs、manifests、tests 和 representative outputs 覆盖；
- adversarial lens 必须测试的任何 cross-division interaction。

该 map 是 agent judgment，不是确定性的 directory taxonomy。不要把完整 file list、diff hunks 或按扩展名机械拆分的结果复制进去。简单 change 只需一个 division。存在该 brief 时，worker 会把它嵌入 peer prompt。其 transport preflight 只在 prompt 外测量并暂存 exact diff；绝不拆分 semantic shards，也不选择或改写 orchestrator 的 divisions。

Invoke via the skill-dir anchor — set `SKILL_DIR` to the absolute directory of **this** skill's `SKILL.md` (the Bash tool's CWD is the user's project, not the skill dir, on every host):

```bash
SKILL_DIR="<absolute path of the directory containing the ce-code-review SKILL.md you read>";
CROSS_MODEL_HOST_HARNESS="<host-harness>" CROSS_MODEL_FIXED_ROUTE="<fixed-route>" python3 "$SKILL_DIR/scripts/peer-job-runner.py" start --skill ce-code-review --run-id "<run-id>" --label adversarial -- env CROSS_MODEL_HOST_HARNESS="<host-harness>" CROSS_MODEL_FIXED_ROUTE="<fixed-route>" bash "$SKILL_DIR/scripts/cross-model-adversarial-review.sh" "<host-serving-family>" "<target>" "<base-ref>" "<run-dir>"
```

- `<run-id>` = the Stage 3d run id (the same one that forms `<run-dir>`); job state lives under `<run-dir>/jobs/<job-id>/`.
- `<host-serving-family>` is `codex`, `claude`, `grok`, `composer`, or `unknown`; `<host-harness>` is `codex`, `claude`, `grok`, `cursor`, or `unknown`.
- `<target>` is one of `codex`, `claude`, `grok`, `cursor`, or `composer`; `<fixed-route>` is its already-sanctioned concrete route.
- `<base-ref>` = the Stage 1 `BASE` (the diff base the peer reviews via `git diff <base-ref>`).
- `<run-dir>` = the absolute Stage 4 run dir. The script writes `adversarial-<provider>.json` there **only after** forcing `reviewer` to `adversarial-<provider>` and downgrading peer `safe_auto` → `gated_auto`.

**Single-reap finish。** Runner 把 worker 分离到独立的受监督 session。`start` 后立即捕获 epoch time（`date +%s`），local reviewers 活跃期间不要轮询。收集完 local returns 后检查一次 status。如果仍在运行且共享 610s deadline 还有时间，执行一次与剩余 deadline 相称的 bounded `wait`（上限 480s；Luna xhigh run 合理情况下可能耗时约 419s，较低上限可能在健康 peer 返回前结束）；不要反复进行短轮询。进入 terminal 后纳入 artifact。达到 deadline 时运行 `reap <job-id>`，并执行最后一次 `wait --max-secs 10`，因为 reap 是异步的。Script 自带边界（idle timeout 480s；hard backstop 600s），所以 deadline reaping 应属例外。Done detection 仍以文件是否存在为准：worker 只在 normalization 后发布 `<run-dir>/adversarial-<provider>.json`。Script 从 skill dir 读取 persona brief 和 schema，并依据 `<base-ref>` review 当前 work tree。Large-diff preflight 只处理 transport：它在 prompt 外测量并暂存 exact diff；orchestrator 选择 semantic divisions，reviewer 在其中选择 representatives 和 evidence。

The `start` command's returned job ID is the successful-start receipt. Do not immediately call `status`, inspect `--help`, or otherwise verify that receipt; persist it and continue to local dispatch. Status collection begins only after the local wave completes.

The commands in this reference are the executable contract. Do not inspect or grep the worker script for its model mapping/allowlist, run `CROSS_MODEL_DRY_RUN`, call `--emit-adapter`, or probe runner `--help` before dispatch. Those exploratory calls replay host context and cannot strengthen the runner's enforced route.

After local reviewers complete, the one status read is exactly:

```bash
python3 "$SKILL_DIR/scripts/peer-job-runner.py" status "<job-id>" --json
```

If it is still running and time remains, use the documented single `wait`; do not invent alternate status flags or inspect help.

## Step 5 — Fold into Stage 5

- Read the artifact through the runner's verified read — `python3 "$SKILL_DIR/scripts/peer-job-runner.py" result --path <run-dir>/adversarial-<target>.json`. Its findings enter ordinary dedup, but agreement promotion is allowed **only when `independence_verified` is `true`**. A false or absent value may contribute findings but never raises confidence. `independence_verified` attests a different serving family; it does not claim the exact served model was verified. `receipt_supported`, `model_actual`, and `effort_actual` carry that separate identity evidence. Peer findings never grant silent-apply authority.
- In final Coverage, name `cross_model_route`, `model_requested`, `effort_requested`, `receipt_supported`, `model_actual`, `effort_actual`, and `independence_verified` from the artifact. Keep the literal `unverified`; never compress a request into a serving claim such as "via Codex high" when actual model or effort is unverified.
- **Never started / not run** — the job was never started (gates not met, host un-attestable, no different provider reachable, CLI missing/unauthed): the pass simply didn't run. Note "cross-model pass: not run" in Coverage for human-facing markdown; stay silent in `mode:agent`. Ignore any `*.raw.json` leftovers — they are not fold-in artifacts.
- **Dispatch-infrastructure failure** — the runner or worker itself crashed: a non-zero exit before any job starts, a preflight/detach failure, or an unresolved `$SKILL_DIR`/script path. This is distinct from the gate-not-met skips above (there, no dispatch was attempted), so do not fold it into the silent not-run bucket on the first error. The two failure shapes recover at different points. A **no-job-id** preflight failure (exit before any job id, unresolved `$SKILL_DIR`) is recovered entirely at **Stage 3d's no-job branch**, before the local roster is materialized — the only point where re-running the start can still recover cross-model corroboration and, failing that, cleanly fall to the in-process reviewer (which then covers the lens; only corroboration is lost). Do **not** re-attempt that case here at fold-in: Stage 4 may already have dispatched the in-process `adversarial-reviewer`, so a fold-in peer re-run would put both on the same brief and violate the exclusive routing boundary. This step handles only the **job-id-returned-then-failed** crash — its failed job is reaped here and the in-process reviewer is already gone. For it, re-run the **same resolved fixed route** by hand — holding the target and model, the `git diff <base-ref>` read scope, and the adversarial persona brief fixed — while each failure is a new, plausibly recoverable one and the shared 610s deadline holds. This is a same-route retry, deliberately distinct from the quota rule below, which requires a newly disclosed route. Stop once a failure repeats or the deadline is spent; the hand recovery is then the adversarial lens's only cover, so the Coverage line must report the adversarial lens as **degraded**, not merely cross-model corroboration lost. A hand recovery may not substitute a different target or provider, widen the read scope, or relax the read-only trust boundary — those make the recovered peer untrustworthy, not merely unavailable.
- **Ran but produced no usable output** — the job reached `done` (or any terminal state) yet no `adversarial-<provider>.json` exists (the peer ran and egressed but returned nothing schema-shaped — unparseable output, empty findings the script dropped). Distinct from not-run: note "cross-model pass: peer ran, no usable output" in human-facing markdown Coverage. Never fail the review.
- **Started but not `done`** — the final status read reports `failed`, `timeout`, or `died-without-result` (a job reaped at the 610s deadline records `timeout`, with the reap noted in its reason) → still non-blocking, but never silent: name the peer and its terminal state in Coverage (e.g. "cross-model adversarial peer: timeout"). Silent absence stays correct only for passes that never started or were skipped.
- Empty `findings` → note "cross-model pass: no additional issues" in Coverage.
- **删除前先归类 skip reason。** Cleanup 前读取 `out.log`，包括以 `peer skip evidence:` 为前缀的有界行，并指出观察到的 quota、authentication 或 capability failure。Authentication-shaped peer failure（`not logged in`、`please log in`、401 或提示登录的 CLI 文本）只描述 peer 的 execution context：sandboxed host，例如限制 spawned commands 访问 network 或 keychain 的 Codex task，会产生与真实 account logout 完全相同的 signal。因此应归类为 cross-model execution-context authentication failure；绝不要据此报告用户 account 已退出登录，或提示用户运行 login command。Cross-model pass 是附加项，local review 仍已完成；要获取该 pass，需要 peer CLI 可访问 network 的 context（例如 restricted sandbox 之外）。同一 quota 或 usage-limit evidence 在本 session 出现超过一次后，不要自动重试该 route。重试必须使用新解析、已披露且获批准的固定 route；绝不静默转向另一个 recipient。
- After fold-in (or after deadline reaping), delete the consumed job directory (`<run-dir>/jobs/<job-id>/`) — its log and result are review content and must not outlive their use.
- A finding sharing a fingerprint with in-process `adversarial` promotes only when the artifact records `independence_verified: true`. Cursor-default artifacts default false; an unattested host skips automatic dispatch.

## Trust boundary (maintainers)

The peer reviews the **current work tree** (read-only) against `git diff <base-ref>`. Reviewed code/diff content is sent to an external model provider (OpenAI, Anthropic, xAI, or Cursor, depending on the resolved peer). `CROSS_MODEL_PEERS` restricts which providers may receive content.

**Isolation differs from ce-doc-review by design.** Doc-review embeds a self-contained document into a tool-less empty scratch. Code-review needs surrounding code context, so peers run **in-tree read-only**:

- **codex:** `-s read-only` with cwd at the repo root (may fetch `git diff` itself).
- **claude:** deny mutators / Bash / Task / `mcp__*`; **Read allowed** for context; diff is embedded because Bash is denied.
- **grok / cursor-agent:** ask/dontAsk + no write/force/yolo; Read allowed; workspace/cwd at the repo root.

Impact is bounded to disclosure, not repo mutation. The script's stderr audit log records each send so the egress is auditable even in `mode:agent`.
