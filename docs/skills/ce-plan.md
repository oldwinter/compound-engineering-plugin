# `ce-plan`

> 建立 implementation 所需的 guardrails：decisions、units、files、tests、scope、risks；但不规定实际代码或 step-by-step choreography。Plans 捕获 **WHAT**；implementing agent 判断 **HOW**。

`ce-plan` 产出的 plans 是 **带 execution guardrails 的 decision documents**，不是 implementation choreography。Plan 捕获已经做出的 decisions、scope in/out、atomic units of work、每个 unit 触及的 files、必须通过的 test scenarios，以及需要 mitigation 的 risks。它**不会**预写 code、exact API signatures 或 step-by-step shell command sequences；这些应由 implementing agent（`ce-work`、另一个 AI agent 或 human）在面对代码时决定。

这种 separation 很重要。预写 implementation 的 plans 往往在真正实现时已经错误：signatures 不 compile，choreography 过期，micro-steps 掩盖真正的 decisions。捕获 guardrails 的 plans 可以在数周或数月内保持 portable，并尊重 implementer 在 execution time 带来的 judgment。

它适用于任何需要 structure 的 multi-step task：software features、refactors、bug fixes、study plans、research workflows、event planning，甚至 annual hot-water-tank maintenance。相同的 engine、相同的 U-ID stability、相同的 right-sized template。

这是 compound-engineering ideation chain 的第三步：

```text
/ce-ideate         /ce-brainstorm      /ce-plan             /ce-work
"What's worth      "What does this     "What's needed       "Build it."
 exploring?"        need to be?"        to accomplish
                                        this?"
```

但它也非常适合 standalone 使用。很多 teams 会直接拿 requirements doc、GitHub issue、PRD、rough description 或 non-software multi-step task 来调用 `ce-plan`。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | Research context，捕获 decisions 和 scope，把 work 拆成带 stable IDs 的 atomic units，为每个 unit 枚举 test scenarios，并通过 confidence check 自动 strengthen weak sections |
| 何时使用？ | Requirements 已 ready，需要 execution guardrails；task 足够复杂，值得 plan doc、verification matrix 和 handoff |

---

## 调用示例

```text
# 根据当前 conversation 制定 plan，包括已经完成的 ce-brainstorm
/ce-plan

# 把仅有 requirements 的 brainstorm artifact 丰富成 implementation-ready plan
/ce-plan docs/plans/notification-mute.md

# 直接根据 issue 或 PRD 制定 plan
/ce-plan https://github.com/acme/widgets/issues/1234
/ce-plan docs/product/account-notifications-prd.md

# 从清晰的粗略想法启动 planning
/ce-plan add a background email digest at 8am UTC

# 重新审视并深化现有 plan
/ce-plan deepen docs/plans/auth-rewrite.md

# 规划非软件的多步骤项目
/ce-plan organize a two-day customer advisory workshop

# 用自然语言要求输出自包含 HTML artifact
/ce-plan turn the notification mute requirements into an implementation-ready plan and make it a self-contained HTML page

# 可重复 automation 中的等价简写
/ce-plan turn the notification mute requirements into an implementation-ready plan output:html

# Keep your session on a model like Opus, but send only the heavy planning
# step to Fable -- surgical use of a strong-but-expensive model where it pays off
/ce-plan turn the notification mute requirements into an implementation-ready plan, use fable
```

Product shape 尚未确定时先使用 `ce-brainstorm`；预期 outcome 已经清楚时，direct planning 效果最好。

---

## 问题

Humans（或没有 structure 的 AI）写的 plans 往往以可预测方式失败：

- **Renumbering chaos**：重构 unit list 后，issue、PR 和 conversation 中每个 reference 都错了
- **Vague test "scenarios"**："test the new behavior" 对 implementer 没有帮助
- **Forgotten origin context**：brainstorm 决定了具体 actor，但 plan 从未提及
- **Half-resolved questions**：`TBD: figure out caching strategy` 在 plan 里放几个月
- **Implementation choreography**：exact method signatures、micro-steps 或 shell sequences 被预写，等 implementation 开始时已经错了
- **No depth check**：author 不知道 plan 是否 grounded 到足以 execute

## 解决方案

`ce-plan` 分离 **需要被遵守的 WHAT decisions** 与 **如何在 code 中满足它们的 HOW**：

- Plan 捕获 decisions、scope boundaries、atomic units、files、test scenarios 和 risks：也就是 execution 的 shape 和 constraints
- 它不预写 code、exact API signatures 或 step-by-step shell choreography；这些 decisions 推迟到 execution time，由 implementing agent 决定
- Stable U-IDs 经得起 reordering、splitting 和 deletion；blocker references 与 PR mentions 在 plan edits 后仍有效
- Plan decisions 可 trace 回 origin（brainstorm 中的 R-IDs；test scenarios 中引用的 AE-IDs）
- Structuring 前并行运行 research（repo、learnings、framework docs、best practices、spec flow）
- 写完 plan 后自动运行 confidence check，并分派 targeted sub-agents strengthen weak sections
- Planning-time 与 implementation-time questions 明确分离；不制造 fake certainty

---

## 新颖之处

### 1. Guardrails over choreography：WHAT，不是 HOW

Plans 捕获 decisions 和 constraints，而不是 code：已经做出的 decisions（含 rationale）、scope boundaries、atomic units of work、touched files、必须通过的 test scenarios、需要 mitigation 的 risks。Plans 刻意排除 exact method signatures、framework-specific syntax、step-by-step shell sequences 和伪装成 implementation specification 的 pseudo-code。Implementing agent 读取 plan，看到 guardrails，然后面对 code 判断 HOW。**Decisions 属于 plan；implementation choices 属于 execution time。**

> Why? 预写 implementation 的 plans 很脆弱：提前 commit 的 signatures 不 compile，choreographed steps 会 stale，还会剥夺 implementer 应在 current context 下做出的 judgment。坚持 guardrails 的 plans 能跨数周 code change、跨 implementer（human 或 AI）、跨 deepening edits 保持 portable。

这也让同一个 engine 能用于 non-software tasks。Hot-water-tank-maintenance plan 也有 decisions、units、files-equivalent（哪些 valves、哪些 manuals）、test scenarios（"verify no leaks after refill"）和 risks，只是没有 code。这个 frame 可以干净迁移。

### 2. U-IDs：implementation units 拥有 stable、never-renumbered identifiers

每个 unit heading 是 `- U1. **Name**`、`- U2. **Name**` 等。Stability rule：reordering、splitting 或 deleting 后，永远不要 renumber existing IDs。Splits 会把 original U-ID 保留在 original concept 上；new units 使用下一个 unused number；deletions 留 gaps（gaps 没问题，永不 backfill）。

这很重要，因为 `ce-work` 会在 plan edits 之间用 U-ID reference units。Deepening pass 中 renumber 会静默破坏每个 blocker reference、每个引用 unit 的 PR description，以及每段 downstream conversation。Stability rule 防止这类 bug。

### 3. Origin tracing：brainstorm 中的 R/A/F/AE IDs 流入 plan

当 plan 来源于 `ce-brainstorm` requirements doc 时，identifiers 会继续流动：Requirements（R-IDs）trace 到 plan 的 Requirements section；Actors（A-IDs）在影响 behavior 或 permissions 时 carry forward；Key Flows（F-IDs）引用到实现它们的 implementation units；Acceptance Examples（AE-IDs）引用到 enforce 它们的 test scenarios（`Covers AE3. <scenario>`）。Finalization 前会用 plan 验证 origin doc 的每个 section。没有内容会 silently drop。

### 4. 每个 unit 的 test scenarios，按 named categories 组织

每个 feature-bearing unit 都会从适用类别中枚举 test scenarios：happy path、edge cases（boundaries、empty/nil、concurrency）、error/failure paths（invalid input、downstream failures、permissions）和 integration（仅 mocks 无法证明的 cross-layer behaviors）。每个 scenario 都命名 input、action 和 expected outcome，具体到 implementer 不必发明 coverage。

### 5. Confidence check and automatic deepening（confidence check 与 automatic deepening）

Plan 写完后，`ce-plan` 会自动按 checklists 给 sections 打分，带 risk-weighted bonuses，选择最弱 sections，分派 targeted sub-agents strengthen 它们（implementation units 用 correctness reviewer，migrations 用 data integrity guardian，key technical decisions 用 architecture strategist），并把 findings synthesis 回 plan。Auto mode 直接整合 findings；interactive mode（当你要求 deepen existing plan 时）会展示 findings 供 accept/reject。发现 thin section 的昂贵时刻应在 planning，而不是 execution。

### 6. 并行 multi-agent research

Phase 1 总是并行运行 local research：repo-research-analyst（technology、architecture、patterns）和 learnings-researcher（来自 `docs/solutions/` 的 institutional memory），加上 spec-flow-analyzer（Standard/Deep plans 的 edge-case completeness）和 optional Slack research。External research 由 **intent** 决定，而不是一个单一开关：明确请求（"research competitors"、"best practices from the web"、"which library"）总会运行，并覆盖 strong local patterns；implicit signals（local patterns thin，或 recommendations 依赖的 external option set 未定）也可触发。Intent 决定 agent 路由：framework-docs-researcher 和 best-practices-researcher 负责 *how to build it well*（implementation-guidance），web-researcher 负责 *what options or prior art exist*（landscape/competitor scans）；mixed requests 先运行 landscape scan，再对 shortlist 查 docs。

### 7. Universal planning：同一个 engine 用于 non-software work

Guardrails-not-choreography frame 可以干净跨 domains。真实（非 hypothetical）用途包括 annual hot-water-tank maintenance、study plans、trip planning、research workflows 和 event planning。Non-software path 跳过 software-specific confidence check，但 U-IDs、dependency ordering、scope boundaries、test/verification scenarios 和 right-sized template 都保留。

Universal planning 还区分两种 **dispositions**。*Plan-seeking* tasks（trip、study curriculum、event）产出 saved plan；artifact 就是 deliverable。*Answer-seeking* tasks 是 investigative 或 analytical questions（"how often does X happen — is it a big deal?"、"how does our approach compare to Y?"），此时 *answer* 才是 deliverable，没有人想要 plan file。对这些任务，`ce-plan` 不会 bail，也不会写文档：它在 chat 中说明简短、right-sized plan-of-attack，作为引导 agent 并展示 approach 的 working scaffold，然后执行（research and synthesis，never code）并交付 answer。Plan 会用问题自身的语言表达，而不是 skill 的语言；internal machinery 保持隐藏，但影响 answer trust 的 caveats 必须 surface。只有真正 trivial 的 single-fact lookups 会完全跳过 planning，直接回答。

### 8. Approach altitude：当 deliverable 很难时，先 plan the plan

面对 hard problem，`ce-plan` 可以上提一层回答：先产出 grounded **approach-plan**，也就是 *deliverable 将如何被制作* 的 plan，并在 checkpoint 停住，再决定是否 commit 到 deliverable。这让用户获得 structure 和 certainty，而不是 zero-shot 一个脆弱结果。入口可以是 explicit（"plan for a plan"、"don't write it yet -- plan how you'd approach it"），也可以很少见地 proactive offer：只有当 method 真的未定且搞错成本很高时才触发，所以不会变成 nag。对提供的 inputs 做 light recon（skim，不 deep-read）后，它在 chat 中给出 approach；file-optional，也可 deepen。Checkpoint 时，用户选择现在执行或保存到以后。它划出的边界是 **code vs. knowledge-work**，不是 plan vs. execute：code 仍进入 `ce-work` 正常路径；non-code deliverable 会标记为 `execution: knowledge-work`，并通过 `ce-work` 的 lightweight carve-out 运行（或交给任何 agent；plan 保持 portable）。`ce-plan` 自己永远不 execute；它产出 approach-plan 并 hand off。

### 9. Session-settled decisions：继承，不再重复询问

当某个 decision 已在触发会话中被审视并由用户选定，或已经提炼进 caller brief，`ce-plan` 会在对应 Key Technical Decision 上记录可见的 `(session-settled: user-directed|user-approved — chosen over X: reason)` annotation，并且不再重复询问。Scoping synthesis 会把它呈现为 `Carrying forward:` 行，而不是要求再次确认的 fork。Research 可以补充 settled decision；只有 evidence 才能与其冲突，并按 severity ladder 路由：未发现问题时静默继续；suboptimal-but-workable 时仍按 settled decision 推进，并在 KTD 上附加 conflict call-out；invalidating evidence（不可行、解决了错误问题或具有破坏性）会停止运行，pipeline mode 下返回 `settled-decision-invalidated` blocked report。未经审视的 assertion 不属于 settled decision；它只会在 planning 阶段接受一次 challenge，结果会记录到 plan 中，而不是交给下游反复争论。

---

## 快速示例

你用 `ce-brainstorm` 产出的 requirements doc 调用 `ce-plan`。Skill 检测 origin，把它作为 primary input，并确认没有 resolve-before-planning blockers。

它并行分派 research：repo analyst、learnings researcher；发现 strong local patterns 且没有请求 external comparison，于是跳过 external research（明确的 "research competitors" 或 "best practices from the web" 会 override 并运行 landscape 或 implementation-guidance scan）。Spec-flow analyzer 运行以浮现 edge cases。Brainstorm-sourced scoping synthesis 会输出 tier-shaped summary（prose、bullets 或混合，取决于 plan depth 和沟通效果），以及零个或多个 "Call outs"：plan-time forks 中另一个 reasonable agent 可能不同选择的位置（例如 "mute state stored on the subscription, not the user"）。用户 confirm 或 redirect；auto-proceed skip 只对没有值得 flag 的 forks 的 Lightweight plans 触发；Standard 和 Deep plans 总是有 explicit checkpoint。

Plan 写入。Confidence check 随后自动运行：它发现 `Risks & Dependencies` 对 mute-leak risk 描述较薄，且某 unit 的 test scenarios 缺少 permission edge cases，于是分派 data-integrity reviewer 和 correctness reviewer，并把 findings synthesis 回 plan。Plan 加盖 `deepened:` date。

Document review 随后以 headless mode 运行。因为 plan 设置了 origin 且不触及 high-stakes domains，cheap minimum dispatches（coherence + feasibility）；`safe_auto` fixes（typo、broken cross-reference）静默应用。Remaining findings 作为 one-line summary 回到 plan handoff。

---

## 何时使用

在以下情况使用 `ce-plan`：

- 有来自 `ce-brainstorm` 的 requirements doc ready
- 有足够清晰的 GitHub issue、PRD 或 feature description
- Work 是 multi-step，并受益于 sequencing、dependency ordering 和 scope boundaries
- 想在 execution 前枚举 test 或 verification scenarios
- 正在接手 stale plan，想 deepen 它（使用 "deepen the plan" 或 "deepening pass"）
- Task 是 **non-software but multi-step**：study plan、event、trip、maintenance routine、research workflow、personal project

以下情况跳过 `ce-plan`：

- Task 真正 one-step（直接做；或用 `ce-work` 直接 execution）
- Product 或 outcome 尚未决定 -> 先 `ce-brainstorm`
- Bug 有 known root cause 且 fix obvious -> `ce-debug` 或直接修

---

## 作为链式工作流的一部分使用

```text
/ce-ideate          (optional)
   |
   v
/ce-brainstorm      (define one direction)
   |  requirements-only unified plan — R/A/F/AE-IDs in software mode
   v
/ce-plan
   |  guardrails — U-IDs traced to R/A/F/AE-IDs
   |  test scenarios with AE-link convention (Covers AE<N>)
   |  scope boundaries preserved (incl. "Outside this product's identity")
   |  confidence-checked and auto-deepened
   v
/ce-work            (execute against the guardrails)
   |  reads U-IDs as the unit of execution
   |  figures out the actual HOW with code in front of it
   |  derives progress from git, not plan body
   v
/ce-code-review     (optional)
   |
   v
/ce-compound        — capture the learning
```

从 `ce-plan` 到 `ce-work` 的 handoff 很具体：`ce-work` 读取 U-IDs、file paths、scope boundaries 和 test scenarios，然后决定 actual implementation。Plan 告诉 implementer unit 完成时 **what must be true**；implementer 判断 **how to make it true**。这个分工让 plans 能跨 implementer 和时间保持 portable。

---

## 单独使用

很多人在已经知道要做什么时直接使用 `ce-plan`；software 和 non-software multi-step tasks 都很常见。

**Software（软件）：**

- **From a GitHub issue**：`/ce-plan https://github.com/.../issues/1234`（或粘贴 issue body）
- **From a PRD**：带 PRD path 调用 `/ce-plan`；planning bootstrap 会把它作为 origin 读取
- **From a rough idea**：`/ce-plan "add background email digest at 8am UTC"` 运行 bootstrap；synthesis 让你在 research dispatch 前纠正 scope
- **Re-deepening an existing plan**：`/ce-plan deepen the auth-rewrite plan`；interactive mode 中 agents 逐条展示 findings 供 accept/reject
- **Cross-repo planning**：从另一个 repo 调用 `/ce-plan "fix the busyblock bug in cli-printing-press"`；会 announce cross-repo target，plan 落在 target 的 `docs/plans/`

**Non-software（非软件，universal-planning mode）:**

- **Maintenance tasks**：annual hot-water-tank maintenance，每个 unit 有 verification
- **Study plans**：带 prerequisites 和 per-unit knowledge checks 的 phased units
- **Trip planning（旅行规划）**：bookings、packing、daily itinerary、contingency boundaries
- **Research workflows**：literature gathering、synthesis、drafting phases，带 explicit deliverables
- **Event planning（活动规划）**：venue、vendors、agenda、day-of run-of-show、follow-ups
- **Personal projects（个人项目）**：workshop build-outs、home renovations

在 universal-planning mode 中，U-IDs、dependency ordering、scope boundaries 和 right-sized template 都保留。Software-specific confidence check 会跳过；其他流程相同。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | Asks for the task description |
| `<feature description>` | Solo planning; runs the bootstrap |
| `<requirements-only plan path>` | Enrich the same unified plan in place |
| `<legacy requirements doc path>` | Origin-sourced planning into a new unified plan |
| `<plan path>` | Resume offer (or deepen, if intent matches) |
| `deepen the plan` / `deepening pass` | Re-deepen fast path (interactive mode) |
| `<bug description>` | Routes to `ce-debug` suggestion menu |
| `<task in another repo>` | Cross-repo announcement, plan lands in target |
| `output:html` | Write the plan as a single self-contained HTML file instead of markdown. Exclusive — the plan is `.md` OR `.html`, never both. Default is markdown. Set `plan_output: html` in `.compound-engineering/config.local.yaml` to make HTML the default. Pipeline mode (LFG, `disable-model-invocation`) always forces markdown so downstream automation gets a stable text shape. See the [configuration reference](./configuration.md). |
| `confirm:auto` | Skip the pre-plan scoping-confirmation pause for this run — ce-plan writes the scope summary for itself, records inferred scope under an `Assumptions` section, announces it's proceeding, and keeps going without waiting. Skips only that confirmation; genuine blockers and the post-plan menu still appear. Use `confirm:ask` to force the gate on for one run. Set `plan_skip_scoping_confirm: true` in `.compound-engineering/config.local.yaml` to make skipping the default. |

---

## 常见问题（FAQ）

**Plan 不应该告诉你 HOW to build something 吗？**
在 `ce-plan` 的 framing 中不是。Plan 告诉你必须被遵守的内容：decisions、scope、units、files、tests、risks。它刻意不预写 code、exact API signatures 或 step-by-step shell choreography。Implementing agent 面对 code 判断 HOW。这个 separation 让 plans portable，防止脆弱的 pre-commitments，并尊重 implementer 在 execution time 带来的 judgment。它也让同一个 engine 能以相同 structural rigor 规划 software refactor、hot-water-tank maintenance 和 6-week study plan。

**为什么用 U-IDs，而不是普通 numbered units？**
Units reorder、split 或 delete 时，普通 numbering 会断；issue、PR 和 downstream conversation 中每个 reference 都变错。U-IDs 稳定：reorder 保持不变，splits 把 original ID 留给 original concept，deletes 留 gaps。`ce-work` 的 blocker references 因此能跨 plan edits 工作。

**为什么 confidence check 自动运行？**
发现 thin section 的昂贵时刻应该在 planning，而不是 execution。Auto-deepening 会在 research context 仍 warm 时分派 targeted research；比几周后 implementation 发现 missed risk 再重新 research 更便宜。

**如果我想保留 existing plan，只 review 它怎么办？**
使用 deepen-intent fast path：`/ce-plan deepen <plan>`。它以 interactive mode 运行；agents 逐条展示 findings 供 accept/reject。用户可以 surgical control 哪些 changes integrate。

**Plan 里可以有 implementation code 吗？**
默认不允许。Pseudo-code 和 DSL grammars 可以在 High-Level Technical Design 中使用，但必须用于传达 solution **shape**，并明确标注为 **directional guidance, not implementation specification**。Exact method signatures、imports、framework-specific syntax 和 step-by-step shell sequences 不属于 plans。

**它真的适合 non-software plans 吗？**
是，而且越来越常见。Universal-planning 保留 U-ID concept、dependency ordering、right-sized template 和 guardrails-not-choreography frame。真实用途包括 hot-water-tank maintenance、study plans、trip planning、research workflows 和 event planning。

---

## Model elevation

When you want a specific model for the heavy reasoning step, `ce-plan` can author the plan on a model you choose instead of your session model. It dispatches only the interpret-findings-then-author step to that model, with read access so it can verify its brief; the rest of the skill (dialogue, research) stays on your session model. Choose per run by naming a model in your prompt ("use fable", "have opus plan this"), or set a default with `plan_model: <model>` in `.compound-engineering/config.local.yaml`. A prompt request overrides the config key.

This works on any harness: the host serves the chosen model natively where it can, otherwise it invokes the Claude CLI (which must be installed and authenticated), otherwise it runs the step on your session model and tells you which precondition was unmet. **Setting `plan_model` therefore takes effect in every harness you run `ce-plan` in**, not just Claude Code. See `references/reasoning-elevation.md`.

## 另见（See Also）

- [`ce-brainstorm`](./ce-brainstorm.md) - 产出成为 plan origin 的 requirements doc
- [`ce-ideate`](./ce-ideate.md) - 上游 "what to even work on" ideation
- [`ce-work`](./ce-work.md) - 按 U-ID 执行 plan
- [`ce-doc-review`](./ce-doc-review.md) - plan 的 persona-based review
- [`ce-debug`](./ce-debug.md) - bug-shaped prompts 路由到这里
- [`ce-strategy`](./ce-strategy.md) - 将 plans 锚定到 documented product strategy
