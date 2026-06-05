---
date: 2026-03-31
topic: codex-delegation
---

# ce:work 的 Codex Delegation Mode

## 问题框架

从 Claude Code（或其他 non-Codex agents）运行 ce:work 的用户，可能想把实际 code-writing delegate 给 Codex。两个动机：(1) Codex 对某些 tasks 可能产出更好的 code，(2) 将 token-heavy implementation work delegate 给 Codex，可节省用户当前 model 的 tokens。

PR #364 试图通过单独的 `ce-work-beta` skill 与 prose-based delegation instructions 实现这一点。agent 每次运行都 improvises CLI syntax，产生 non-deterministic results，PR author 自己的测试也确认 flaky。root cause：用 prose 描述 Codex CLI invocation 会让 agent 每次以不同方式猜测。

ce-work-beta 确实有 structured 7-step External Delegate Mode（environment guards、availability checks、prompt file writing、circuit breaker），但 CLI invocation step 本身是 prose-based，导致 non-determinism。本 feature 移植有用的 structural elements（guards、circuit breaker pattern），同时用 concrete bash templates 替代 prose invocations。

> **Implementation note (2026-03-31):** 最终 rollout 被 redirect 到 `ce:work-beta`，使 stable `ce:work` 在 beta 期间保持不变。`ce:work-beta` 必须手动 invoke；`ce:plan` 与 workflow handoffs 在 promotion 前继续使用 stable `ce:work`。

## Delegation Flow（委托流程）

```
/ce:work delegate:codex ~/plan.md
         │
         ▼
┌──────────────────────────┐
│ Parse arguments           │
│ - Extract delegate flag   │
│ - Require plan file       │
│ - Check local.md default  │
│ - Resolution chain:       │
│   flag > local.md > off   │
└────────┬─────────────────┘
         │
         ▼
┌──────────────────────────┐     ┌───────────────────────┐
│ Environment guard         │────>│ Notify if explicit,   │
│ $CODEX_SANDBOX set?       │ yes │ use standard mode     │
│ $CODEX_SESSION_ID set?    │     └───────────────────────┘
└────────┬─────────────────┘
         │ no
         ▼
┌──────────────────────────┐     ┌───────────────────────┐
│ Availability check        │────>│ Fall back to          │
│ command -v codex          │ no  │ standard mode + notify│
└────────┬─────────────────┘     └───────────────────────┘
         │ yes
         ▼
┌──────────────────────────┐     ┌───────────────────────┐
│ Consent + mode selection  │────>│ Ask: disable          │
│ work_delegate_consent set?   │ no  │ delegation?           │
│ Show warning + sandbox    │     │ Set local.md          │
│ mode choice (yolo/full-   │     └───────────────────────┘
│ auto). Recommend yolo.    │
│ (headless: require prior) │
└────────┬─────────────────┘
         │ accepted
         ▼
┌──────────────────────────┐
│ Per-unit execution loop   │
│ (SERIAL, not parallel)    │
│ For each implementation   │
│ unit in the plan:         │
│                           │
│ 1. Check unit eligibility │
│    (out-of-repo? trivial?)│
│    -> local if ineligible │
│ 2. Named stash snapshot   │
│ 3. Write prompt + schema  │
│    to .context/compound-  │
│    engineering/codex-      │
│    delegation/             │
│ 4. codex exec w/ flags    │
│ 5. Classify result:       │
│    CLI fail | task fail | │
│    verify fail | success  │
│ 6. Pass: commit, drop     │
│    stash, clean scratch   │
│    Fail: rollback,        │
│          increment ctr    │
│ 7. If 3 consecutive       │
│    failures: fall back    │
│    to standard mode       │
└──────────────────────────┘
```

## 需求

**Activation and Configuration（激活与配置）**

- R1. Codex delegation 是 ce:work 内的 optional mode，不是单独 skill。ce-work-beta 被 superseded：其 delegation logic 由此 feature 替代；其 non-delegation features（例如 Frontend Design Guidance）若有价值，应作为 separate concern port 到 ce:work。ce-work-beta 的 disposition（delete vs. retain without delegation）是 planning decision，不是 product decision。
- R2. Delegation 通过 resolution chain 触发：(1) per-invocation argument wins，(2) `.claude/compound-engineering.local.md` 中的 `work_delegate` setting 作为 fallback，(3) hard default 是 `false`（off）。
- R3. Canonical activation argument 是 `delegate:codex`。skill 也识别 fuzzy variants：`codex mode`、`codex`、`delegate codex` 以及类似 intent expressions。Agent intent recognition 处理 fuzzy matching -- set 不需要 exhaustive enumeration。
- R4. Canonical deactivation argument 是 `delegate:local`。也识别 `no codex`、`local mode`、`standard mode` 等 fuzzy variants。
- R5. Delegation 只适用于 structured plan execution。没有 plan file 的 ad-hoc prompts 始终使用 standard mode，不受 delegation setting 影响。当 plan 的 delegation mode active 时，每个 implementation unit 默认 delegate 给 Codex。agent 可在以下情况用 standard mode 本地执行某个 unit：(a) unit 明确需要修改 repository root 外的内容，或 (b) unit trivially small（single-file config change、simple substitution），delegation overhead 超过工作本身。agent 在执行前说明每个 unit 使用哪种 mode。

**Environment Safety（环境安全）**

- R6. 当运行在 Codex sandbox 内（通过 `$CODEX_SANDBOX` 或 `$CODEX_SESSION_ID` environment variables 检测）时，delegation disabled，ce:work 使用 standard mode 继续。如果用户明确请求 delegation（via argument），emit brief notification："Already inside Codex sandbox — using standard mode." 如果 delegation 只是由 local.md default 启用，则 silent proceed。
- R7. 所有 delegation logic 都位于 skill 本身。Converters 不修改 skill behavior 来实现 cross-platform compatibility -- environment guard 在 runtime 处理 platform detection。

**Availability and Fallback（可用性与 fallback）**

- R8. delegation 前检查 `command -v codex`。如果 Codex CLI 不在 PATH，fallback 到 standard mode，并 brief notification："Codex CLI not found — using standard mode."
- R9. 暂无 minimum version check。如果未来 CLI change 打破 delegation，invocation 会 loudly fail，fix 是更新一行 bash。

**Consent and Mode Selection（同意与 mode 选择）**

- R10. project 中第一次 delegation activates 时，展示 one-time consent flow：(1) 解释 delegation 做什么以及 security implications，(2) 展示 sandbox mode choice 并给出 recommendation，(3) 记录用户 decisions。sandbox modes：
  - **yolo**（recommended）：映射到 `--yolo`（`--dangerously-bypass-approvals-and-sandbox`）。Full system access including network。运行 tests 或 install dependencies 的 verification steps 需要它。解释为什么 recommended。
  - **full-auto**：映射到 `--full-auto`。Workspace-write sandbox，无 network access。需要 network 的 tests/installs 会失败。适合没有 verification dependencies 的 pure code-writing tasks。
- R11. 用户接受后，在 `.claude/compound-engineering.local.md` 中存储 `work_delegate_consent: true` 和 `work_delegate_sandbox: yolo`（或 `full-auto`）。该 project 不再显示 consent flow。
- R12. 用户 decline 后，询问是否完全 disable codex delegation。如果 yes，在 local.md 中设置 `work_delegate: false` 并以 standard mode 继续。
- R13. 在 headless mode 中，只有 local.md 中 `work_delegate_consent` 已为 `true` 时才进行 delegation。若未设置或为 `false`，silent fallback 到 standard mode。Headless runs 从不 prompt consent，也不会在无 prior interactive consent 的情况下 silent escalate 到 unsandboxed mode。

**Execution Mechanism（执行机制）**

- R14. Delegation 使用 concrete bash commands，而不是 prose instructions。精确 invocation template：

  ```bash
  # Read sandbox mode from settings (default: yolo)
  if [ "$CODEX_SANDBOX_MODE" = "full-auto" ]; then
    SANDBOX_FLAG="--full-auto"
  else
    SANDBOX_FLAG="--yolo"
  fi

  codex exec \
    $SANDBOX_FLAG \
    --output-schema .context/compound-engineering/codex-delegation/result-schema.json \
    -o .context/compound-engineering/codex-delegation/result-<unit-id>.json \
    - < .context/compound-engineering/codex-delegation/prompt-<unit-id>.md
  ```

  agent verbatim 执行它 -- 不 improvisation CLI syntax。

- R15. Sandbox posture 默认 `yolo`（`--yolo`，`--dangerously-bypass-approvals-and-sandbox` 的 shorthand），但用户可在 consent flow 中选择 `full-auto`（R10）。选择存储在 local.md 的 `work_delegate_sandbox` 中。推荐 `yolo`，因为 `--full-auto` 阻止 network access，而 verification steps（running tests、installing dependencies）需要它。如果选择 `full-auto` 并导致 repeated verification failures，circuit breaker（R18）处理 fallback。

- R16. delegation mode active 时，ALL units serially 执行 -- delegated 与 locally-executed units 都如此。Git stash 是 global stack；在同一 working tree 上混合 parallel 与 serial execution 会导致 stash entanglement。这意味着 delegation mode 与 swarm mode（Agent Teams）mutually exclusive。每个 delegated unit 前，loop 假设 clean working tree（由 ce:work 的 Phase 1 setup 和每个 successful unit 后 mandatory commits enforce）。通过 named stash snapshot working tree：`git stash push --include-untracked -m "ce-codex-<unit-id>"`。失败时通过 `git checkout -- . && git clean -fd && git stash drop "$(git stash list | grep 'ce-codex-<unit-id>' | head -1 | cut -d: -f1)"` rollback。成功时 commit changes，再 drop named stash。

- R17. structured prompt template 写到 `.context/compound-engineering/codex-delegation/prompt-<unit-id>.md` file，而不是通过 stdin pipe，以避免 large CURRENT PATTERNS sections 触发 ARG_MAX limits。template 包含：TASK（implementation unit 的 goal）、FILES TO MODIFY（file list）、CURRENT PATTERNS（relevant code context）、APPROACH（来自 implementation unit）、CONSTRAINTS（no git commit、restrict modifications to files within the repository root、scoped changes、line limit、mandatory result reporting），以及 VERIFY（test/lint commands）。每个 successful unit 后 cleanup prompt files。

- R18. consecutive failure counter 跟踪 delegation failures。3 次 consecutive failures 后，skill 对 remaining units fallback 到 standard mode，并 notification。

- R19. Failure classification 使用 multi-signal approach。`codex exec` 即使 task fail 也会返回 exit code 0 -- exit code 只反映 CLI infrastructure，不反映 task success。

  | Category | Signal | Action（动作） |
  |---|---|---|
  | **CLI failure** | Exit code != 0 | Hard failure -- fall back to standard mode |
  | **Result absent** | Exit code 0, result JSON missing or malformed | Count as task failure |
  | **Task failure** | Exit code 0, result schema `status: "failed"` | Count toward circuit breaker, rollback |
  | **Task partial** | Exit code 0, result schema `status: "partial"` | Keep changes, report gaps to main agent |
  | **Verify failure** | Exit code 0, `status: "completed"`, VERIFY fails | Count toward circuit breaker, rollback |
  | **Success** | Exit code 0, `status: "completed"`, VERIFY passes | Commit, drop stash, continue |

- R20. result schema file 与 prompt file 写在一起。通过 `--output-schema` 指示 Codex 生成符合该 schema 的 structured JSON。`-o` flag 将 result 写到 `result-<unit-id>.json`。schema：

  ```json
  {
    "type": "object",
    "properties": {
      "status": { "enum": ["completed", "partial", "failed"] },
      "files_modified": { "type": "array", "items": { "type": "string" } },
      "issues": { "type": "array", "items": { "type": "string" } },
      "summary": { "type": "string" }
    },
    "required": ["status", "files_modified", "issues", "summary"],
    "additionalProperties": false
  }
  ```

  prompt CONSTRAINTS section 包含 mandatory result reporting instructions，要求 Codex MUST honestly 填写 schema：只有全部 changes 完成时才 `status: "completed"`，incomplete 时 `"partial"`，没有 meaningful progress 时 `"failed"`。Known limitation：`--output-schema` 只适用于 `gpt-5` family models，不适用于 `gpt-5-codex` 或 `codex-` prefixed models（Codex CLI bug #4181）。如果 result JSON absent 或 malformed，classify as task failure。

- R21. prompt constraint 告诉 Codex 将所有 modifications 限制在 repository root 内的 files。如果 Codex 在 mid-execution 发现需要修改 repo root 外的 files，应完成 repo 内能做的部分，并通过 result schema `issues` field 报告无法完成内容。main agent 随后以 standard mode 处理 out-of-repo work。Out-of-repo changes 不能被 git stash detect 或 rollback -- 这是 accepted risk，由 prompt constraint 和 per-unit pre-screening（R5）mitigate。

**compound-engineering.local.md 中的 Settings**

- R22. `.claude/compound-engineering.local.md` 中的新 YAML frontmatter keys：
  - `work_delegate`: `codex`/`false`（default: `false`）-- enabled 时的 delegation target
  - `work_delegate_consent`: `true`/`false` -- 用户是否完成 one-time consent flow
  - `work_delegate_sandbox`: `yolo`/`full-auto`（default: `yolo`）-- codex exec 的 sandbox posture

## 成功标准

- Codex 能在多种 task types（new features、bug fixes、refactors）上成功实现 ce:plan output 中的 implementation units
- CLI invocations deterministic -- 不再有 agent 在 runs 之间 improvisation shell syntax
- Delegation 只在 explicit requested（argument 或 local.md）时激活，只对 plan file 激活，并且永远不在 Codex 内部运行时激活
- Failed delegation 通过 named git stash cleanly rollback，且不 corrupt tracked repository files
- result schema 为 success/failure classification 提供 reliable signal
- 从不启用 delegation 的用户体验到 ce:work behavior 零变化

## 范围边界

- **不是 separate skill。** ce-work-beta 被 superseded。本工作直接修改 ce:work。
- **No app-server integration。** 使用 bare `codex exec`，而不是 codex-companion.mjs app server 或 codex plugin 的 rescue skill。delegation pattern 是 fire-prompt -> wait -> inspect-result，正是 `codex exec` 提供的东西。
- **No ad-hoc delegation。** Delegation 只适用于带 plan file 的 structured plan execution。没有 plans 的 bare prompts 始终使用 standard mode。
- **No minimum version gating。** 只有真正发生 breaking CLI change 时再添加。
- **No periodic re-consent。** 每个 project 一次 acceptance。未来如需要，可添加 version-gated 或 calendar-based re-consent。
- **No converter changes。** skill 通过 environment variable checks 内部处理 platform detection。
- **No out-of-repo detection。** Git stash 不能保护 repo 外 files。防线是 prompt constraint + per-unit pre-screening，而不是 post-execution validation。
- **No timeout for v1。** `codex exec` 与最成熟的 codex integration（osc-work）都未实现 timeouts。用户报告 hung processes 后再加。

## 关键决策

- **Modify ce:work, not a separate skill**: 避免 skill proliferation。用户留在 existing workflow 中。ce-work-beta 的 delegation section 被 superseded；其 structural patterns（guards、circuit breaker）被 port。
- **`delegate:codex` namespace, not `mode:codex`**: Existing `mode:` tokens 描述 interaction style（headless、autofix）。Delegation 描述 execution target。独立 namespace 避免 semantic overloading。
- **Bare `codex exec` over app-server**: App server 提供 structured output 和 thread management，但需要 fragile path discovery 到另一个 plugin 的 versioned install directory。`codex exec` 是一行 bash，可在 subagents 中同样工作，并且正好提供 fire-and-wait delegation 所需能力。
- **User-selected sandbox mode（yolo default, full-auto option）**: 推荐 yolo，因为 `--full-auto` 阻止 tests/lint commands 所需的 network access。但偏好 sandboxed execution 的用户可选择 `full-auto`，接受 verification 可能失败。circuit breaker 处理 repeated failures。
- **One-time consent with mode selection**: Consent 是 informed awareness，不是 ongoing compliance。sandbox mode choice 是 consent flow 的一部分，并持久化到 local.md。
- **Per-unit delegation eligibility, not all-or-nothing**: 默认 delegate all units，但 agent 会 pre-screen 需要 out-of-repo access 或 trivially small 的 units。这避免 delegate 无法在 unsandboxed environment 成功的工作，也减少 trivial changes 的 overhead。
- **Prompt file over stdin**: 将 prompts 写到 `.context/compound-engineering/codex-delegation/` 避免 ARG_MAX limits，在 failure 时提供 debugging artifacts，并遵循 repo 的 scratch space convention。
- **Complete-and-report over error-and-rollback**: 当 Codex mid-execution 发现需要 out-of-repo access 时，完成 repo 内 changes 并报告未完成项。保留有用工作，而不是浪费。
- **Plan-only delegation**: Ad-hoc prompts 使用 standard mode。Delegation 需要 structured plan decomposition 来构建有效 prompts，并提供 meaningful implementation units。
- **Serial execution for all units when delegation is active**: Git stash 是 global stack。混合 parallel 与 serial execution 会导致 stash entanglement。delegation mode 开启时，所有 units（包括 locally-executed ones）serially run。这使 delegation mode 与 swarm mode（Agent Teams）mutually exclusive -- 是以 parallelism 换取使用 Codex 能力的 deliberate tradeoff。
- **`--output-schema` for result classification**: `codex exec` 即使 task failure 也返回 exit code 0。structured result schema 结合 VERIFY commands 提供 reliable success/failure signal。Prompt-enforced honest reporting 加上与 VERIFY 的 cross-validation，可捕获 model misreporting。
- **No timeout for v1**: `codex exec` 没有 built-in timeout，最成熟的 integration（osc-work）也没有实现。若用户报告 hung processes 再添加。

## 依赖与假设

- Codex CLI `exec` subcommand 的 `--yolo`、`--full-auto`、`--output-schema`、`-o` 和 `-m` flags 保持 stable
- `--output-schema` 适用于 `gpt-5` family models。Known bug #4181 会在 `gpt-5-codex` / `codex-` prefixed models 上打破它 -- delegation 应使用 `gpt-5` family models（例如 `o4-mini`、`gpt-5.4`）
- 在 Codex 内运行时，`$CODEX_SANDBOX` 和 `$CODEX_SESSION_ID` environment variables 继续被设置
- `.claude/compound-engineering.local.md` YAML frontmatter read/write infrastructure 必须作为本工作的一部分构建 -- 当前没有 existing skill 读取或写入这些 keys。这是 prerequisite，不是 assumption。

## 未决问题

### 延后到 Planning 阶段

- [Affects R17][Needs research] 哪种 prompt template structure 最能最大化 Codex code quality？printing-press skill 提供一个 template；codex plugin 的 prompting skill（`gpt-5-4-prompting`）可能提供如何专门为 Codex/GPT models 组织 prompts 的 insights。
- [Affects R14][Technical] delegation branch 精确插入 ce:work Phase 2 task execution loop 的哪个位置？需要读取当前 task-worker dispatch logic，找到最干净 insertion point。
- [Affects R18][Technical] circuit breaker（3 consecutive failures）应 per-unit reset，还是在整个 plan execution 中 persist？Per-unit 更 forgiving；per-plan 更 conservative。
- [Affects R22][Technical] agent 在 runtime 如何 parse `.claude/compound-engineering.local.md` YAML frontmatter？是否有现有 utility，还是 skill 必须指示 agent 通过 bash 直接 parse？
- [Affects R20][Needs testing] `--output-schema` 对 Codex final response 的约束有多可靠？需要用 representative implementation prompts 测试，验证 result classification approach。测试时使用 `--ephemeral` flag 避免 session file clutter（production invocations 不用 `--ephemeral` -- session persistence 对 debugging 有价值）。
- [Affects R20][Technical] 当 `--output-schema` 失败（wrong model family、malformed output）时的 fallback behavior：定义 result JSON absent 时的 exact classification logic。

## 下一步

-> `/ce:plan` 做 structured implementation planning
