# Execution Engines（执行引擎）

`ce-work` 有四种 implementation engine：inline/subagent、goal-mode、dynamic-workflow、cross-model execution。Engine 决定 implementation *如何*运行；绝不改变 shipping tail *归谁*（见下方 Tail ownership）。Native inline/subagent execution 是 dormant-by-default compatibility：除非 applicable live intent、caller binding 或 enabled standing preference 选择第四种 engine，否则保持选中。

Engine selection 只适用于 code execution。Knowledge-work 保持 carve-out。Legacy plans/bare code prompts 可以选择 cross-model execution；否则保留 `SKILL.md` 中 inline/subagent flow。Goal-mode/dynamic-workflow selection 仍只适用于 implementation-ready unified plans。

Invocation origin 不提供 routing authority，也可能无法检测。无论 `ce-work` 是显式调用还是 host 自行选择，都解析相同 inputs：current-task intent、still-active session intent、typed caller binding、active project instructions、enabled checkout config，最后 native execution。

## Capability probe 前解析 cross-model routing

根据 applicable authority/scope 解析一个 implementation binding；不要把 routing 简化为 keyword matching 或 closed state machine。先遵守 host instruction hierarchy。同一 authority 内，优先 narrower、more current intent，source 顺序为：

1. Current task 中 explicit assignment/constraint；
2. still-active session preference/constraint；
3. 带 recorded provenance 的 typed caller binding（例如 LFG current-task assignment 在 `ce-work` seam 保留 current-task authority）；
4. context 中 project active instructions/conventions；
5. enabled per-checkout config；
6. native execution。

Lower source 可以补 unspecified detail，但不能 contradict/broaden higher source。Feature prose、quoted material、example、comparison、filename 或 discussion 中 incidental mention 不激活 routing。同等 authority 的 applicable instructions 在 recipient/egress 上真实冲突时，应展示 conflict，不要猜测。

“use Codex”这类 live request 默认是 preference-strength；“must use Codex”“only use Codex”这类 unambiguous strict intent 是 requirement-strength。Intent 才是 contract，不取决于单一 keyword。Resolved mode 为 `prefer` 或 `require`。

Live/contextual intent 可以命名一个 route 或 ordered fallback list（如“prefer Cursor with Grok, then Codex”）。保留顺序，并按 standing config 相同规则 normalize 每个 harness/model candidate。Typed caller binding 仍是已选择的单一 candidate；不要把 exact four-field grammar 扩成 list。

例如，current-task strict Composer 会以 `require` 解析到 Composer，即使 caller Codex binding 和 config Cursor preference 同时存在。没有该 task instruction 时，来自当前 LFG task 的 caller Codex binding 保留 provenance。没有 applicable live/caller intent 时，只有 standing mode enabled 才应用 ordered config candidates。

### Typed caller binding（类型化调用方绑定）

Automatic caller 可以传恰好包含四个 field 的 `implementation_engine` object：

- `mode`：`prefer` 或 `require`
- `target`：`codex`、`claude`、`grok`、`cursor` 或 `composer`
- `model`：可选 model pin，否则 `null`
- `source`：binding 的 caller-visible provenance

只在 `ce-work` seam、`mode:return-to-caller` 旁接受该 carrier；fields 绝不进入 planning/review input。String-only skill host 的 initial envelope 是 `mode:return-to-caller implementation_engine:<compact-json> <plan-path>`，其中 `<compact-json>` 是无 formatting whitespace 的 exact four-field object（如 `implementation_engine:{"mode":"prefer","target":"codex","model":null,"source":"lfg-current-turn"}`）。原 no-carrier form 仍为 `mode:return-to-caller <plan-path>`。解析后，将 binding/source 保存在 durable run receipt。Downstream consumer/worker 可以收窄 authority/restrictions，绝不能扩大。

Return-to-caller recovery 可在 optional engine carrier 之后、unchanged plan path 之前增加独立 `implementation_run:<safe-id>` carrier。它不是 `implementation_engine` field，只用于 recovery。Safe id 匹配 `^[A-Za-z0-9._-]{1,128}$`，且至少包含一个非句点字符。Carrierless recovery：`mode:return-to-caller implementation_run:run-123 <plan-path>`；engine-bound recovery：`mode:return-to-caller implementation_engine:<compact-json> implementation_run:run-123 <plan-path>`。Malformed/duplicate carrier 应拒绝，不能当作 plan text。Run id 选择 durable state，从不授权 fresh dispatch 或 different route。

### Target 与 identity vocabulary

将 `target`、harness/intermediary route、requested model、served model、receipt status 分开。Target `cursor` 表示使用 configured default model 的 Cursor harness；`composer` 是经 Cursor 请求 Composer-family model 的 shorthand。Host 必须先尝试 documented adapter recipe。Installed harness 不同时，只能在同一 sanctioned harness/model family 内检查 local CLI help/version 并适配，且 fixed adapter 仍须执行 route/restrictions；否则 candidate unavailable。披露 compatible model alias/substitution，绝不重标 unverified served model。

Target 解析为当前 host default execution route，且未请求 distinct model/serving route 时，折叠到 native execution，记录 requested/actual identity，不要 shell out 到同一 host。

### 每个 checkout 的配置

Standing config 使用一个 mode 加 ordered route list：

```yaml
work_engine_mode: prefer
work_engine_preferences:
  - harness: cursor
    model: composer
  - harness: codex
    model: gpt-5.6
  - harness: claude
```

- `work_engine_mode`：`off | prefer | require`
- `work_engine_preferences`：一个或多个 ordered candidate objects
- `harness`：`codex | claude | grok | cursor`
- 可选 `model`：该 harness 理解的 model id/family；省略表示 configured default

Config 中不要放 CLI commands/flags。List 表达 implementation intent；skill adapter recipes/local inspection 决定如何调用。因此 Composer 是 `{ harness: cursor, model: composer }`，而 `{ harness: cursor }` 表示 Cursor configured default。

将 qualified candidate normalize 为 controller fixed route：Codex -> `codex`、Claude -> `claude`、native Grok -> `grok-cli`、Cursor 无 model -> `cursor`、Composer-family Cursor model -> `composer`、Grok-family Cursor model -> `grok-cursor`，其他 explicit Cursor model -> `cursor` + controller-authorized model selector。Model selector 是 data，绝不是 shell syntax；无法用 fixed adapter safe model token 表示时，candidate unavailable。

Preflight 时遍历 ordered candidates。Candidate 等于 current host 及 current/default model 时继续下一项，不 shell out 到自己；同一 harness 的 explicit different model 仍是 distinct candidate。Candidate 在 egress 前 unavailable 时，记录原因并继续。First qualified candidate 成为 fixed recipient。Dispatch 开始后 cross-model contract 锁定 recipient，停止 list traversal。

`off` 只禁用 standing preference，不取消 applicable live intent/typed caller binding。Enabled mode 没有 valid candidate list 时是 unavailable，不猜测。List 用尽后，`prefer` 披露全部 attempted routes/reasons 并 native fallback；`require` 遵循 interactive/headless blocker rule。Standing config 提供 defaults，不授权更换 recipient 或扩大 authority。

## Step 1：探测 host capability

只有 host 暴露 callable primitive 时 engine 才可用，不要从名称推断。

| Engine | 可用条件 | Claude Code 现状 |
|---|---|---|
| **Inline / subagent** | 始终可用。Orchestrator inline 运行 units，或经 platform subagent primitive dispatch（Claude Code `Agent`/`Task`、Codex `spawn_agent`、Pi `subagent`）。 | Session 内始终 callable，是 default。 |
| **Goal-mode** | Host 暴露 skill 可调用的 goal *tool*，如 Codex `create_goal`（设置并激活 persistent objective）及 terminal `update_goal(complete|blocked)`。 | **无 goal tools。** `/goal` 只是 top-level user command，skill 无法调用。输出可复制 `/goal` prompt，或 inline/subagents。**Codex 不同，会暴露 `create_goal`。** |
| **Dynamic-workflow** | Host 暴露 callable dynamic-workflow / ultracode-style primitive，可在无 mid-run user decisions 时返回 structured results/blockers。 | **Skill 内不可调用。** Dynamic workflow 从 user prompt（`ultracode:` 或 `/effort ultracode`）启动；`ce-work` 只能输出 copyable prompt block。 |
| **Cross-model execution** | Resolved fixed route 有 qualified write-capable adapter，并满足全部 caller restrictions。只在选中 engine 后加载 `cross-model-execution.md`。 | Availability 取决于 installed target CLI/qualified adapter，不取决于 host native subagent tools。Same-host default request 折叠为 native execution。 |

经验法则：**probe callable tool，不根据 command 存在推断。** Host 有 callable goal tool（Codex `create_goal`）时，goal-mode 是真实 callable engine；只有 user-typed `/goal`（Claude Code）时，只能 prompt-emission。任何 host 上 literal `/goal` slash command 都不能由 skill 调用；Codex 可调用的是 *tool* path。

**Codex 特别说明。** Codex 在 `features.goals` 开启时向 skill 暴露 goal **tools**，因此要 probe：`create_goal(objective)` 设置并激活 persistent objective，**当前 session** 会自动朝它工作（它 steer 当前 agent，不是 background worker，也不返回 awaitable envelope）；`update_goal(status: complete|blocked)` 只用于 objective 真正完成/反复阻塞后的 terminal status。因此 Codex skill 可以**直接启动 goal-mode，无需 copy-paste**：用下方 copyable prompt 相同内容调用 `create_goal`。这就是 skill 的全部工作；current session 自动追求 objective，goal lifecycle 在 DoD 满足时由 working session 调用 `update_goal` 标记 complete。**Skill 自己不调用 `update_goal`。** Literal `/goal` 仍只能 user type；Claude Code 没有 goal tools，只能 copy-paste。

## Step 2：按 plan shape 选择 engine

多个 engine callable 时，根据 plan decomposition shape 选择：

| Plan shape | Engine | 原因 |
|---|---|---|
| Sequential/modest U-ID decomposition；units 共享 files 或相互依赖 | **Inline / subagent**（default），或 callable 时用 **goal-mode** prompt 保持 focus | DoD 已定义 end condition；ordinary persistence 可完成。 |
| 大量 independent U-IDs 且 file ownership disjoint；codebase-wide sweep；large migration；adversarial cross-checking | Callable 时 **Dynamic-workflow**，否则 parallel subagents | Workflow scripts 将 branching/loops/intermediate worker state 放在 main context 外并协调多 agents。Large fan-out 优先于 goal-mode。 |
| Host 无 callable goal/workflow primitive（如 Claude Code in-session） | **Inline / subagent** | 不依赖 unavailable features，保留 heading-scan/DoD/U-ID discipline。 |
| Applicable live intent、caller binding 或 enabled config 解析出 qualified fixed external route | **Cross-model execution** | 其他 harness/model author bounded units，host 保留 canonical integration、verification、commits、tail ownership。 |

Bare prompt 只有在 Phase 0 建立 concrete goal、bounded scope、authoritative verification 后才可 cross-model execution。Cross-model reference 将 discovery 转为 private prompt brief/conservative P-unit packet。Unclear bare prompt 在 egress 前返回 clarification/planning；不得把 scope 发给“更聪明”的 external worker 发明。

只推荐一个 path。Non-default engine 只有在 plan shape 确实适合时才作为“advanced / large-scale option”，绝不当作 equal coin-flip。

## Step 3：运行选定 engine

### Inline / subagent（default）

遵循 `SKILL.md` Phase 1 Step 4 dispatch strategy（inline、serial subagents、parallel subagents）及 Phase 2 execution loop。`ce-work` 负责 task creation、unit sequencing、dispatch、verification、commits。

### Cross-model execution（跨模型执行）

Routing 选中该 engine 后才读 `cross-model-execution.md`。Egress 前解析/披露 fixed recipient/restrictions，再通过 bundled controller、detached runner、fixed adapter 执行 serial external-unit transaction。Preflight route unavailable 时，按文档 `prefer`/`require` behavior 处理；绝不让 detached worker 选择 fallback recipient。

### Goal-mode 与 dynamic-workflow

**有 callable goal tool（Codex `create_goal`）：** 以 copyable prompt 内容（去掉 leading `/goal`）调用 `create_goal`。这会激活 objective，**当前 session** 继续工作；没有 separate worker/envelope 可等待，因此 session 继续到 Step 4 tail，由 goal lifecycle 标记 completion。**Skill 不调用 `update_goal`**，由 working session 处理。**仅 standalone 使用 `create_goal`，return-to-caller mode 绝不使用**；后者需要 `ce-work` 返回 caller，而 `create_goal` 会让 session 继续追求 objective，应改用 inline/subagents。

**无 callable goal tool，或 dynamic-workflow（当前 Claude Code）：** 不要尝试调用，而应：

- **Standalone interactive use：** 输出 copyable prompt block；用户没有 paste 时继续 inline/subagents，不要停住等待。
- **Return-to-caller（如 `lfg`）：** 不输出 copyable prompt，manual paste 会卡住 caller。改用 inline/subagents；若 plan 确实依赖 unavailable engine，则返回 blocker。

无论何种 path，goal/workflow 都不得 open PR、finalize session 或绕过 owning workflow gates。

Copyable goal-mode prompt（standalone，除 literal plan path 外原样输出）。**必须 plan-agnostic：任何 plan 除 substituted path 外都应完全相同。** 输出前做 deletion test：draft 若命名 specific command、file path、U-ID dependency、stop condition 或 DoD item，说明从 plan 复制了内容，应删除（goal 自行读 plan）。PR/shipping 不 hardcode open/do-not-open PR directive，而携带下方 precedence line：plan 有 PR/landing strategy 时遵循；repo conventions/user preferences 可以覆盖。

```text
/goal Implement <plan-path> to its Definition of Done.

The plan is the authority — don't read it whole. Scan headings, read the Goal Capsule, then work the units in dependency order, reading each unit plus its cited R/F/AE/KTD as you go. Run the plan's Verification Contract gates and satisfy each unit's test scenarios. Track progress outside the plan file, not in it.

This top-level goal owns the implementation tail: run simplification and code review when the diff meets the repo's normal criteria, apply eligible fixes, and surface residual findings. Follow the plan's PR/landing strategy if it defines one; the repo's conventions and the user's preferences override it. Surface a genuine blocker — something that changes scope or contradicts the plan — instead of guessing; use your judgment on details the plan leaves open.

Done when the transcript shows: every non-deferrable Per-Unit DoD row has an observed verification result; the Verification Contract's required checks passed or are documented as not applicable; applicable simplification/review gates ran or were explicitly skipped with reason; dead-end or experimental code from approaches that did not pan out has been removed from the diff; and no progress/status was written into the plan file. Before declaring done, re-open the plan and re-check the active units, Verification Contract, and Definition of Done against the diff — context may have been compacted to a summary that dropped detail.
```

Copyable dynamic-workflow prompt（large fan-out，原样输出）：

```text
ultracode: Execute <plan-path> as an end-to-end dynamic workflow.

Use the plan as authority. Build the workflow around the Implementation Units and Definition of Done. Parallelize only independent U-IDs with disjoint file ownership, keep intermediate agent results inside the workflow, run simplification/review/verification gates inside the workflow tail, and return a final summary with changed files, U-IDs completed, verification results, residual findings, and blockers.
```

Emitted prompt 限制在 4,000 characters 内，始终替换 literal plan path。

## Step 4：恢复正确 tail

任何 engine 完成 implementation 后，检查 diff，并按 caller 匹配的 tail 继续。Engine 自身永远只拥有 implementation + local verification。

| Mode | Implementation 后 `ce-work` ... |
|---|---|
| **Standalone**（用户直接调用 `ce-work`，或 `ce-plan` interactive handoff） | 恢复正常 post-implementation tail：Phase 3-4 quality gates、simplification、review、commit，以及 `references/shipping-workflow.md` handoff。Goal-mode 不跳过；确认已运行或明确说明跳过原因。 |
| **Return-to-caller**（`mode:return-to-caller`，如 `lfg` 下） | 只做 implementation/local verification，然后返回 `SKILL.md` Return-to-Caller Mode 的 structured summary（`standalone_shipping_skipped: true`）。不运行 simplify/review/PR/CI，由 caller 负责。 |

Goal-mode/dynamic workflow 用于得到更持续的 implementation focus，不是跳过 owning workflow finish discipline 的方法。

## Progress visibility（独立于 tail ownership）

Tail ownership 决定谁开**最终** PR，不禁止 long run 中的 progress signals。Multi-hour goal 应在 unit 完成时创建 meaningful commits，也可使用 plan body 外 optional scratch progress artifact，使 trajectory observable。只 gate final PR creation：standalone top-level goal 只有明确拥有该 channel 时才可 open **draft** PR；return-to-caller mode 下 `ce-work` 不得 open PR，但可以 commit，并在 structured envelope 返回 progress report。绝不要将 progress/status 写入 plan body；由 git、commits、envelope 承载。
