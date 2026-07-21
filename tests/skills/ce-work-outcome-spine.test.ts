import { readFile } from "fs/promises"
import path from "path"
import { describe, expect, test } from "bun:test"

async function readRepoFile(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relativePath), "utf8")
}

async function readImplementationContract(): Promise<string> {
  const skill = await readRepoFile("skills/ce-work/SKILL.md")
  const implementationLoop = await readRepoFile("skills/ce-work/references/implementation-loop.md").catch(() => "")
  return `${skill}\n${implementationLoop}`
}

function sliceSection(content: string, startAnchor: string, endAnchor: string): string {
  const start = content.indexOf(startAnchor)
  expect(start, `start anchor not found: ${startAnchor}`).toBeGreaterThanOrEqual(0)
  const end = content.indexOf(endAnchor, start + startAnchor.length)
  expect(end, `end anchor not found: ${endAnchor}`).toBeGreaterThan(start)
  return content.slice(start, end)
}

describe("ce-work native characterization", () => {
  test("opens with result, next consumer, done condition, and host-owned canonical integration", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const outcome = sliceSection(skill, "## Outcome", "## Input Document")

    expect(outcome).toContain("**Result：**")
    expect(outcome).toContain("**Next consumer：**")
    expect(outcome).toContain("**Done：**")
    expect(outcome).toContain("**Intent：**")
    expect(outcome).toContain("host orchestrator")
    expect(outcome).toContain("authoritative verification/canonical commits")
    expect(skill.indexOf("## Outcome")).toBeLessThan(skill.indexOf("## Execution Workflow"))
  })

  test("classifies caller mode, legacy aliases, bare prompts, and plans before execution", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const triage = sliceSection(skill, "### Phase 0: Input Triage", "### Phase 1: Quick Start")

    expect(triage).toContain("**否则解析 leading mode token。**")
    expect(triage).toContain("mode:return-to-caller")
    expect(triage).toContain("mode:caller-owned-tail")
    expect(triage).toContain("caller:lfg")
    expect(triage).toContain("**Plan document**")
    expect(triage).toContain("**Blank/bare-prompt classification 前解析 session-carried plan。**")
    expect(skill).toContain("Invocation origin 不可观察也不相关")
    expect(triage).toContain("**Blank invocation latest-plan discovery:**")
    expect(triage).toContain("**Bare prompt**")
    expect(triage).toContain("只跳过 task list")
    expect(triage).toContain("mandatory engine-resolution gate")
  })

  test("activates direct recovery before ordinary input classification", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const triage = sliceSection(skill, "### Phase 0: Input Triage", "### Phase 1: Quick Start")

    expect(triage).toContain("**Recovery activation 最先。**")
    expect(triage).toContain("resume、inspect status、reap 或 cleanup")
    expect(triage).toContain("implementation_run:<safe-id>")
    expect(triage).toContain("读取 `references/cross-model-execution.md`")
    expect(triage).toContain("不得 dispatch new worker")
    expect(triage).toContain("completed recovery 是 read-only reconciliation")
    expect(triage).toContain("不重跑 test、build、format、install、generation 或 `verify-run`")
    expect(triage).toContain("报告 stored unit 与 plan-wide verification receipts")
    expect(triage.indexOf("**Recovery activation 最先。**")).toBeLessThan(triage.indexOf("**否则解析 leading mode token。**"))
  })

  test("keeps the existing native engines and synchronous inline path", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const engineGate = sliceSection(skill, "4. **Choose Execution Engine, then Strategy**", "### Phase 2: Execute")

    expect(engineGate).toContain("inline/subagent")
    expect(engineGate).toContain("goal-mode")
    expect(engineGate).toContain("dynamic-workflow")
    expect(engineGate).toMatch(/\*\*Inline\*\* \| Trivial work/)
    expect(engineGate).toContain("普通 native workers")
    expect(engineGate).toContain("不要自行运行 `git worktree add`")
    expect(engineGate).toContain("external cross-model controller")
  })

  test("bounds worker scope while leaving canonical verification and commits with the orchestrator", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const dispatch = sliceSection(skill, "**Native dispatch（仅 inline/subagent engines）**", "### Phase 2: Execute")

    expect(dispatch).toContain("**有边界的 unit packet**")
    expect(dispatch).toContain("Downstream worker 可以收窄 unit 和 authority，绝不能扩大")
    expect(dispatch).toContain("不要把“读取整个 plan”作为 worker prompt")
    expect(dispatch).toContain("**不要 commit。**")
    expect(dispatch).toContain("**orchestrator 拥有 staging、committing、authoritative test runs**")
    expect(dispatch).toContain("**按 dependency order review、test、commit 每个 unit；orchestrator 拥有 commits。**")
  })

  test("does not re-enter native dispatch after selecting cross-model execution", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const engineGate = sliceSection(skill, "4. **Choose Execution Engine, then Strategy**", "### Phase 2: Execute")

    expect(engineGate).toContain("**Native dispatch（仅 inline/subagent engines）**")
    expect(engineGate).toContain("不能重新进入 ordinary subagent dispatch")
    expect(engineGate).toContain("**Controller `init` 成功后，该 unit 锁定到 selected cross-model engine。**")
    expect(engineGate).toContain("不要将其重新分类为 trivial、为速度 abandon，或 native implement")
    expect(engineGate).toContain("**每个 serial inline/subagent unit 后：**")
    expect(engineGate).toContain("**Parallel inline/subagent batch 后")
  })

  test("preserves standalone shipping and return-to-caller tail ownership", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const standalone = sliceSection(skill, "### Phase 3-4: Quality Check and Finishing Work", "## Return-to-Caller Mode")
    const caller = sliceSection(skill, "## Return-to-Caller Mode", "## Key Principles")

    expect(standalone).toContain("references/shipping-workflow.md")
    expect(caller).toContain("implementation and local verification only")
    expect(caller).toContain("structured summary instead of running the standalone shipping tail")
    expect(caller).toContain("standalone_shipping_skipped: true")
    expect(caller).toContain("must not open a PR")
  })
})

describe("ce-work cross-model engine contract", () => {
  test("resolves live routing intent and ordered harness/model preferences", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const engines = await readRepoFile("skills/ce-work/references/execution-engines.md")
    const engineGate = sliceSection(skill, "4. **Choose Execution Engine, then Strategy**", "### Phase 2: Execute")

    expect(engineGate).toContain("cross-model execution")
    expect(engineGate).toContain("native execution 仍默认")
    expect(engineGate).toContain("Route resolution 是 mandatory pre-write gate")
    expect(engineGate).toContain(".compound-engineering/config.local.yaml")
    expect(engineGate).toContain("不要仅因没有 typed carrier 就推断 native execution")
    expect(engines).toContain("still-active session")
    expect(engines).toContain("project active instructions/conventions")
    expect(engines).toContain("recorded provenance")
    expect(engines).toContain("incidental mention")
    expect(engines).toContain("work_engine_mode")
    expect(engines).toContain("`off | prefer | require`")
    expect(engines).toContain("work_engine_preferences")
    expect(engines).toContain("`harness`")
    expect(engines).toContain("可选 `model`")
    expect(engines).toContain("configured default")
    expect(engines).toContain("ordered candidate")
    expect(engines).toContain("继续下一项")
    expect(engines).toContain("Candidate 等于 current host")
    expect(engines).toContain("`off` 只禁用 standing preference")
    expect(engines).toContain("strict Composer")
    expect(engines).toContain("caller Codex")
    expect(engines).toContain("config Cursor")
  })

  test("turns clear planless work into a private bounded source without exporting the session", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const engines = await readRepoFile("skills/ce-work/references/execution-engines.md")
    const external = await readRepoFile("skills/ce-work/references/cross-model-execution.md")

    expect(skill).toContain("private **bounded implementation brief**")
    expect(skill).toContain("不发送 raw conversation history")
    expect(skill).toContain("在任何 cross-model egress 前 clarify 或 route 到 `ce-plan`")
    expect(engines).toContain("Invocation origin 不提供 routing authority")
    expect(engines).toContain("concrete goal、bounded scope、authoritative verification")
    expect(external).toContain("## 为 bare-prompt work 构建 source")
    for (const heading of ["Request", "Goal", "Scope", "Acceptance and verification", "Constraints and exclusions", "Units"]) {
      expect(external).toContain(`\`${heading}\``)
    }
    expect(external).toContain("默认一个 conservative `P1` unit")
    expect(external).toContain("--prompt-brief <temp-path> --prompt-digest <sha256>")
    expect(external).toContain("Prompt-backed run 必须使用 disclosed run id")
  })

  test("uses agent judgment above fixed safety boundaries when local harness CLIs drift", async () => {
    const engines = await readRepoFile("skills/ce-work/references/execution-engines.md")
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")

    expect(engines).toContain("先尝试 documented adapter recipe")
    expect(engines).toContain("local CLI help/version")
    expect(engines).toContain("同一 sanctioned harness/model family")
    expect(protocol).toContain("第一个 qualified candidate")
    expect(protocol).toContain("Egress 前")
    expect(protocol).toContain("Dispatch 开始后")
    expect(protocol).toContain("不得切换 recipient")
  })

  test("keeps explicit cross-model activation read-only until the controller owns the workspace", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const triage = sliceSection(skill, "### Phase 0: Input Triage", "### Phase 1: Quick Start")

    expect(triage).toContain("每个 non-recovery code path 都必须在 execution 前解析 implementation engine")
    expect(triage).toContain("carrierless Return-to-Caller Mode")
    expect(triage).toContain(".compound-engineering/config.local.yaml")
    expect(triage).toContain("pre-controller discovery 只读")
    expect(triage).toContain("不在 canonical checkout 运行 baseline/test/build/format/install/generation commands")
    expect(triage).toContain("证明 canonical Git snapshot byte-for-byte unchanged")
  })

  test("keeps the caller carrier implementation-only and exactly four fields", async () => {
    const engines = await readRepoFile("skills/ce-work/references/execution-engines.md")
    const carrier = sliceSection(engines, "### Typed caller binding", "### Target 与 identity vocabulary")

    expect(carrier).toContain("implementation_engine")
    for (const field of ["mode", "target", "model", "source"]) {
      expect(carrier).toContain(`\`${field}\``)
    }
    expect(carrier).toContain("恰好包含四个 field")
    expect(carrier).toContain("mode:return-to-caller implementation_engine:<compact-json> <plan-path>")
    expect(carrier).toContain('implementation_engine:{"mode":"prefer","target":"codex","model":null,"source":"lfg-current-turn"}')
    expect(carrier).toContain("只在 `ce-work` seam")
    expect(carrier).toContain("fields 绝不进入 planning/review input")
    expect(engines).not.toContain("work_delegate_")
  })

  test("preserves ordered LFG intent without truncating the scalar carrier", async () => {
    const lfg = await readRepoFile("skills/lfg/SKILL.md")

    expect(lfg).toContain("ordered fallback list")
    expect(lfg).toContain("不要 truncate 为 scalar carrier")
    expect(lfg).toContain("将完整 ordered assignment 保留为 current-task implementation intent")
    expect(lfg).toContain("不传 `implementation_engine:` object")
    expect(lfg).toContain("host 无法跨 skill invocation 保留")
    expect(lfg).toContain("routing-carrier blocker")
  })

  test("gives string-only callers an exact optional carrier grammar", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const phase0 = sliceSection(skill, "### Phase 0: Input Triage", "**Plan document**")

    expect(phase0).toContain("implementation_engine:")
    expect(phase0).toContain("compact JSON object")
    expect(phase0).toContain("`mode`、`target`、`model`、`source`")
    expect(phase0).toContain("implementation_run:<safe-id>")
    expect(phase0).toContain("`^[A-Za-z0-9._-]{1,128}$`")
    expect(phase0).toContain("拒绝 malformed JSON、missing/extra fields、unsafe run id 或 duplicate carrier")
    expect(phase0).toContain("余下整个 string 是 plan path")
    expect(phase0).toContain("原 `mode:return-to-caller <plan-path>` form 不变")
  })

  test("keeps external dispatch policy out of the implementation-worker persona", async () => {
    const worker = await readRepoFile("skills/ce-work/references/agents/implementation-worker.md")

    expect(worker).toContain("Caller、unit packet 与 controller 负责 dispatch")
    expect(worker).toContain("只在提供的 workspace 中实现指定的 implementation unit")
    expect(worker).toContain("返回 `completed` 前")
    expect(worker).toContain("完整 Git delta")
    expect(worker).toContain("你自己的检查产生的 disposable artifacts")
    expect(worker).toContain("全部剩余 changed paths")
    for (const dispatchPolicy of ["recipient", "model", "harness", "intermediary", "retry", "route", "additional workers"]) {
      expect(worker.toLowerCase()).not.toContain(dispatchPolicy)
    }
  })

  test("distinguishes Cursor from Composer and collapses same-host default execution", async () => {
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")

    expect(protocol).toContain("`cursor` 表示使用 configured default model 的 Cursor harness")
    expect(protocol).toContain("`composer` 表示经 Cursor 使用 Composer-family model")
    expect(protocol).toContain("same-host default")
    expect(protocol).toContain("折叠为 native execution")
    expect(protocol).toContain("codex")
    expect(protocol).toContain("claude")
    expect(protocol).toContain("grok")
    expect(protocol).toContain("Fixed controller route tokens")
    expect(protocol).toContain("`codex`、`claude`、`grok-cli`、`cursor`、`composer` 或 `grok-cursor`")
  })

  test("defines prefer, require, fixed-recipient sanction, and restriction failure", async () => {
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")

    expect(protocol).toContain("Preference-strength")
    expect(protocol).toContain("Requirement-strength")
    expect(protocol).toContain("Automatic/headless")
    expect(protocol).toContain("不得 prompt")
    expect(protocol).toContain("fixed recipient")
    expect(protocol).toContain("全部 intermediary")
    expect(protocol).toContain("暴露的 repository/unit material")
    expect(protocol).toContain("caller restrictions")
    expect(protocol).toContain("required restriction")
    expect(protocol).toContain("route 视为 unavailable")
    expect(protocol).toContain("不得切换 recipient")
  })

  test("preserves host-only canonical authority and narrows the worktree exception", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")
    const engineGate = sliceSection(skill, "4. **Choose Execution Engine, then Strategy**", "### Phase 2: Execute")

    expect(engineGate).toContain("普通 native workers")
    expect(engineGate).toContain("external cross-model controller")
    expect(protocol).toContain("隔离的 transport commit")
    expect(protocol).toContain("host-only canonical")
    for (const forbiddenAuthority of ["canonical commit", "push", "PR", "shipping", "recipient-switch"]) {
      expect(protocol).toContain(forbiddenAuthority)
    }
    expect(protocol).toContain("可以收窄")
    expect(protocol).toContain("绝不能扩大")
  })

  test("loads the cross-model protocol only for selected execution or recovery", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const engineGate = sliceSection(skill, "4. **Choose Execution Engine, then Strategy**", "### Phase 2: Execute")
    const triage = sliceSection(skill, "### Phase 0: Input Triage", "**Plan document**")

    expect(engineGate).toContain("当且仅当选中 cross-model execution")
    expect(engineGate).toContain("读取 `references/cross-model-execution.md`")
    expect(triage.match(/references\/cross-model-execution\.md/g)?.length).toBe(2)
    expect(skill.match(/references\/cross-model-execution\.md/g)?.length).toBe(3)
  })

  test("returns requested and actual route, model, fallback, run, unit, blocker, and recovery receipts", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const caller = sliceSection(skill, "## Return-to-Caller Mode", "## Key Principles")

    for (const receipt of [
      "implementation_engine_binding",
      "requested_route",
      "actual_route",
      "requested_model",
      "actual_model",
      "fallback_reason",
      "run_id",
      "source_kind",
      "source_digest",
      "unit_receipts",
      "blockers",
      "recovery_path",
      "plan_checkpoint",
    ]) {
      expect(caller).toContain(receipt)
    }
    expect(caller).toContain("standalone_shipping_skipped: true")
  })

  test("defines an executable serial external-unit transaction before any parallel protocol", async () => {
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")
    const runner = await readRepoFile("skills/ce-work/scripts/peer-job-runner.py")
    const serial = sliceSection(protocol, "## 串行 external-unit protocol", "## 保留 tail ownership")

    for (const command of [
      "unit-workspace.py` `init",
      "`checkpoint-plan`",
      "`prepare`",
      "`authorize-dispatch`",
      "peer-job-runner.py start --no-sweep --input-digest <controller-packet-digest>",
      "cross-model-work.sh",
      "`record-job`",
      "`terminalize`",
      "unit-workspace.py integrate",
      "`verify-run`",
      "`integration-acquire`",
      "`preflight`",
      "git cherry-pick --no-commit",
      "`mark-applied`",
      "`mark-verified`",
      "`mark-committed`",
      "`cleanup`",
      "`integration-release`",
    ]) {
      expect(serial).toContain(command)
    }
    expect(serial).toContain("cross-model-work.sh <authorization_path> <workspace> <unit-packet> <expected-packet-sha256> <result-dir>")
    expect(serial).toContain("controller-returned `authorization_path`")
    expect(serial).toContain("controller-returned `attempt_id`")
    expect(serial).toContain("returned adapter path 必须直接作为第一个 worker argv")
    expect(serial).toContain("不加 `bash`、`sh`、`env` prefix")
    expect(serial).toContain("runner label 必须精确等于 unit id")
    expect(serial).toContain("<controller-result-dir>/implementation-result.json")
    expect(serial).toContain("不要预创建")
    expect(serial).toContain("`git -C <canonical-checkout>`")
    expect(serial).toContain("new verification artifacts")
    expect(serial).toContain("authoritative command exit status")
    expect(serial).toContain("绝不从 stdout 推断 pass")
    expect(serial).toContain("`run_id`、`unit_id`、`attempt_id`")
    expect(serial).toContain("`CE_PEER_HARD_SECS=7200`")
    expect(serial).toContain("route-qualified `incremental` activity 设置 `CE_PEER_IDLE_SECS=600`")
    expect(serial).toContain("`hard-only`/不可信 activity 设置 `CE_PEER_IDLE_SECS=0`")
    expect(serial).toContain("600 秒 window 随 progress 重置，用来检测 stall，不是 wall-clock maximum")
    expect(serial).toContain(
      "包含全部 `<run-id>/` 的父 CE Work directory，不是某个 run directory",
    )
    expect(runner).toContain("CE_WORK_RUNS_ROOT         parent CE Work dir containing all <run-id>/ dirs")
    expect(serial).toContain("`--input-digest` 与 adapter expected-packet argument 都必须")
    expect(serial).toContain("调用 `authorize-dispatch` 获得成功")
    expect(serial).toContain("Runner 向 worker export controller-visible job id")
    expect(serial).toContain("atomic 地将 job id 绑定 exact attempt")
    expect(serial).toContain("同 attempt 的第二个 job 会被拒绝")
    expect(serial).toContain("actual runner metadata 与 exact worker argv")
    expect(serial).toContain("authorization digest、workspace、packet path/digest、result directory")
    expect(serial).toContain("hand-authored/cross-attempt authorization")
    expect(serial).toContain("controller-owned exact route/model/intermediary contract")
    expect(serial).toContain("构建 prompt 或启动 external CLI 前")
    expect(serial).toContain("`--emit-adapter` 只用于 introspection")
    expect(serial).not.toContain("CE_WORK_MODEL_OVERRIDE")
    expect(serial).not.toContain("CE_WORK_MODEL_OVERRIDE_TARGET")
    expect(serial).toContain("准备 bounded unit packet")
    expect(serial).toContain("精确复数 key `route`、`intermediaries`、`restrictions`")
    expect(serial).toContain("direct `codex`、`claude`、`grok-cli`、`cursor` 使用 `intermediaries: []`")
    expect(serial).toContain("Packet source 直接写到 canonical checkout 外的 OS temp")
    expect(serial).toContain("绝不能先在 repository 起草再移动")
    expect(serial).toContain("把 `$(...)` 作为 direct arg 引用不会展开")
    expect(serial).toContain("-- bash -o pipefail -c")
    expect(serial).toContain("后续 host tool calls")
    expect(serial).toContain("绝不生成或运行")
    expect(serial).toContain("`start` 必须在 supervision 前返回")
    expect(serial).toContain("只执行一个 state-changing controller transition")
    expect(serial).toContain("controller 单一 fail-stop `integrate` transaction")
    expect(serial).toContain("不要手工串联")
    expect(serial).toContain("60 秒")
    expect(serial).toContain("Controller、runner、verification 或 Git 非零退出会结束当前 host tool call")
    expect(serial).toContain("所有 bare-job-id `status`、`wait`、`result`、`reap` 都要带 `--skill ce-work`")
    expect(serial).toContain("检查 actual transport diff")
    expect(serial).toContain("Generated byproduct")
    expect(serial).toContain("在 `mark-verified` 前发生")
    expect(serial).toContain("authoritative verification")
    expect(serial).toContain("restore")
    expect(serial).toContain("在 fallback/retry/next unit 前")
    expect(serial).toContain("plan-wide Verification Contract gates")
    expect(serial).toContain("恢复 verification-created artifacts")
    expect(serial.indexOf("integration-acquire")).toBeLessThan(serial.indexOf("git cherry-pick --no-commit"))
    expect(serial.indexOf("mark-verified")).toBeLessThan(serial.indexOf("mark-committed"))
  })

  test("defines exactly-once resume, recovery discovery, and post-start fallback gates", async () => {
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")

    expect(protocol).toContain("使用 `resume --run-id <id>`")
    expect(protocol).toContain("列出 run ids/recovery paths")
    expect(protocol).toContain("completed run 只允许 observation")
    expect(protocol).toContain("不得仅为重确认 evidence 而重跑 Verification Contract gate")
    expect(protocol).toContain("不得 redispatch、reapply、recommit 或运行任一 owning tail")
    expect(protocol).toContain("调用 `claim-fallback`")
    expect(protocol).toContain("调用 `complete-fallback`")
    expect(protocol).toContain("只授权一次 native fallback")
    expect(protocol).toContain("FALLBACK_ALREADY_AUTHORIZED")
    expect(protocol).toContain("FALLBACK_COMPLETED")
    expect(protocol).toContain("`RUN_VERIFIED`")
    expect(protocol).toContain("CHOICE_REQUIRED")
    expect(protocol).toContain("headless `require` 保持 blocked")
    expect(protocol).toContain("Exact restoration")
    expect(protocol).toContain("expected post-apply tree/changed-path set")
    expect(protocol).toContain("unknown dirt 则阻塞且不 destructive restore")
    expect(protocol).toContain("`status`、`reap`、`cleanup`")
    expect(protocol).toContain("同一 scalar `run_id`")
    expect(protocol).toContain("fresh `attempt_id`")
    expect(protocol).toContain("并阻塞，不自行选择")
    expect(protocol).toContain("不得创建第三个 run")
  })

  test("separates scheduling from engine/workspace selection and declines unsafe waves", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const loop = await readRepoFile("skills/ce-work/references/implementation-loop.md")
    const gate = sliceSection(skill, "**Parallel Safety Check**", "**Native dispatch（仅 inline/subagent engines）**")

    expect(gate).toContain("scheduling 与 engine/workspace selection 分离")
    expect(gate).toContain("拒绝 parallelism")
    expect(gate).toContain("dependencies")
    expect(gate).toContain("declared files")
    expect(gate).toContain("shared types/APIs/interfaces")
    expect(gate).toContain("migrations")
    expect(gate).toContain("lockfiles")
    expect(gate).toContain("generated")
    expect(gate).toContain("registry")
    expect(gate).toContain("config")
    expect(gate).toContain("environment singleton")
    expect(gate).toContain("expected merge")
    expect(gate).toContain("3-5")
    expect(gate).toContain("每个 concurrent worker")
    expect(gate).toContain("isolated workspace")
    expect(gate).toContain("Synchronous native")
    expect(gate).toContain("active checkout")
    expect(loop).toContain("反复 collision")
    expect(loop).toContain("禁用本次 run 的后续 parallel waves")
  })

  test("makes linked-checkout siblings and silent-route supervision explicit", async () => {
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")

    expect(protocol).toContain("Active checkout 本身是 linked worktree 也不禁用该 route")
    expect(protocol).toContain("detached **sibling**")
    expect(protocol).toContain("/tmp/compound-engineering-<effective-uid>/ce-work/<run-id>/")
    expect(protocol).toContain("绝不在 active checkout 下创建 nested worktree")
    expect(protocol).toContain("此状态可 checkpoint，不是 route blocker")
    expect(protocol).toContain("`hard-only`")
    expect(protocol).toContain("禁用 idle timeout")
    expect(protocol).toContain("绝不因缺少 incremental activity 推断 failure/fallback")
  })

  test("defines same-base parallel authoring with serial semantic fold-in", async () => {
    const protocol = await readRepoFile("skills/ce-work/references/cross-model-execution.md")
    const wave = sliceSection(protocol, "## 并行 external-wave protocol", "## 精确 resume 与只 fallback 一次")

    expect(wave).toContain("一个 recorded wave base")
    expect(wave).toContain("将每个 worker terminalize")
    expect(wave).toContain("之前")
    expect(wave).toContain("serial integrate")
    expect(wave).toContain("wave-advance")
    expect(wave).toContain("exact earlier host-owned canonical commits")
    expect(wave).toContain("semantic")
    expect(wave).toContain("Clean textual apply")
    expect(wave).toContain("restoration")
    expect(wave).toContain("affected dependents 保持 queued")
    expect(wave).toContain("unaffected siblings")
    expect(wave).toContain("redispatch")
    expect(wave).toContain("serial fallback")
    expect(wave).toContain("绝不 blind-merge")
  })

  test("ships an evaluator-owned fresh-context fixture pack for the weakest seams", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const evalPack = await readRepoFile("skills/ce-work/references/cross-model-work-eval.md")

    expect(evalPack).toContain("不得注入被测 agent")
    expect(evalPack).toContain("可安装最弱 practical model tier")
    expect(evalPack).toContain("强 installed model tier")
    expect(evalPack).toContain("Change")
    expect(evalPack).toContain("Verify")
    expect(evalPack).toContain("Consider")
    for (let fixture = 1; fixture <= 39; fixture += 1) {
      expect(evalPack).toContain(`E${fixture} `)
    }
    for (const seam of [
      "native restraint",
      "LFG carrier",
      "selected-plan dirt",
      "lost contact",
      "ambiguous recovery",
      "authority narrowing",
      "hidden interface collision",
      "silent route",
      "unsupported restriction",
      "transactional failure",
      "return boundary",
      "linked-checkout sibling",
      "direct recovery",
      "LFG recovery carrier",
      "session preference",
      "same-harness explicit model",
      "ordered fallback",
      "LFG ordered live assignment",
      "trivial configured engine",
      "exact dispatch digest",
      "clean packet and shell argv",
      "exact egress object",
      "session-carried plan",
      "bounded bare-prompt delegation",
      "unclear bare-prompt restraint",
      "host-native matrix",
      "strict alternate matrix",
      "post-init recipient lock",
      "sibling-clone recovery isolation",
      "plugin-bundled reference load",
      "incremental idle window",
    ]) {
      expect(evalPack).toContain(seam)
    }
    expect(evalPack).toContain("| E20 linked-checkout sibling | CE Work 自己运行在 linked worktree，某 unit 选择 external implementation | 经 shared Git common directory 创建 detached **sibling**，放在 `/tmp/compound-engineering-<effective-uid>/ce-work/<run-id>/`，不放在 active checkout 下；以 recorded clean canonical SHA 为 base，fold-in 归 host。不得因 active checkout 已是 worktree 就拒绝 route，也不得创建 nested worktree。 |")
    expect(skill).toContain("从 loaded `SKILL.md` directory")
    expect(skill).toContain("绝不 glob target repository")
    expect(skill).toContain("native 继续")
  })
})

describe("ce-work implementation evidence characterization", () => {
  test("loads the extracted protocol only at the implementation gate", async () => {
    const skill = await readRepoFile("skills/ce-work/SKILL.md")
    const implementationLoop = await readRepoFile("skills/ce-work/references/implementation-loop.md")
    const phase2 = sliceSection(skill, "### Phase 2: Execute", "### Phase 3-4: Quality Check and Finishing Work")

    expect(phase2).toContain("必须读取 `references/implementation-loop.md`")
    expect(phase2.indexOf("references/implementation-loop.md")).toBeLessThan(phase2.indexOf("2. **Incremental Commits**"))
    expect(skill).not.toContain("1. **任务执行循环**")
    expect(skill).not.toContain("**Evidence Strategy**：Test discovery 决定 proof 应放在哪里")
    expect(implementationLoop).toContain("1. **任务执行循环**")
    expect(implementationLoop).toContain("**Evidence Strategy**：Test discovery 决定 proof 应放在哪里")
  })

  test("retains every task evidence and verification stop across relocation", async () => {
    const contract = await readImplementationContract()
    const orderedStops = [
      "将 task 标为 in-progress",
      "在改变 behavior 前为 task 选择 evidence strategy",
      "在修改 production code 前确认 expected failure 或 baseline capture",
      "按 existing conventions 实现",
      "运行 System-Wide Test Check",
      "修改后运行 tests",
      "评估 testing coverage",
      "记录 task verification evidence",
      "将 task 标为 completed",
      "评估 incremental commit",
    ]

    let previous = -1
    for (const stop of orderedStops) {
      const current = contract.indexOf(stop)
      expect(current, `missing implementation stop: ${stop}`).toBeGreaterThan(previous)
      previous = current
    }

    expect(contract).toContain("Execution evidence guardrails：")
    expect(contract).toContain("**Test Discovery**")
    expect(contract).toContain("**Evidence Strategy**")
    expect(contract).toContain("**Test Scenario Completeness**")
    expect(contract).toContain("**System-Wide Test Check**")
  })
})
