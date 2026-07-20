# `ce-debug`

> 系统找出 root causes：提出任何 fix 前先追完整 causal chain，拒绝 symptom-level patches，卡住时升级。

`ce-debug` 是 **investigation-first** debugging skill。除非它能无缺口解释从 trigger 到 symptom 的完整 causal chain，否则拒绝提出 fix。对于 chain 中 uncertain links，它要求给出一个 **prediction**：如果这个 link 是对的，那么另一个 code path 或 scenario 中也必须为真的东西。**当 prediction 错了但 fix 看起来有效，skill 会标出来：你找到的是 symptom，不是 cause。**

它会 right-size。Trivial bugs（typos、missing imports、明显 one-line fixes）在 Phase 0 有 explicit fast-path：修掉，留一行 note，停止。其他所有情况进入完整 framework；复杂 bugs 自然会在每个 phase 花更多时间。Fix 是可选的；diagnosis-only 是 first-class outcome。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-debug` 是 `/ce-work` 的 bug-shaped sibling：当输入是 broken behavior，而不是要 build 的 feature 时，由它接手。当 investigation 揭示这个 bug 其实不是 bug，而是 design problem 时，它也可以升级到 `/ce-brainstorm`。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 端到端调查 bug（reproduce、trace、root-cause），形成带 predictions 的 hypotheses，可选实现 test-first fix，并 hand off 到 commit + PR |
| 何时使用 | Failed tests、error messages、regressions、GitHub/Linear/Jira issue references、"I've been stuck on this for hours" |
| 产出什么 | Debug summary，包含 root cause、recommended tests，以及（如果 opt in）带 fix 的 PR |
| 下一步 | 默认 auto commit + PR；也可选择 "diagnosis only" 自己接手 |

---

## 调用示例

```text
# 从 failing test 开始
/ce-debug spec/models/notification_subscription_spec.rb

# 从 issue 或 ticket 开始，并纳入完整 discussion
/ce-debug https://github.com/acme/widgets/issues/1234
/ce-debug ABC-456

# 没有 ticket 时，从已观察到的 behavior 开始
/ce-debug the digest job sends duplicate emails after a retry

# Error 是最佳 evidence 时，先调用再粘贴 stack trace
/ce-debug
```

描述可观察到的故障，而不是你猜测的 fix；该 skill 会在修改代码前验证 causal chain。

---

## 问题

常见 debugging anti-patterns：

- **Shotgun fixes**：一次改三件事 "to see if it helps"；即使有用，也不知道为什么
- **Symptom-level patches**：change 后 bug 不再显现，但 root cause 仍活着，几周后在别处出现
- **Wrong-assumption fixation**：hypothesis 是对的，但测试它依赖的 assumption 不成立（framework 实际不是这样、function 返回值不像名字暗示的那样）
- **"Just try one more thing" loops**：连续三个 failed fixes 意味着 diagnosis 错了；更努力尝试只会更糟
- **Fixing the first thing that looks wrong**：root cause 在 bad state 起源处，不在第一次观察到它的地方

## 方案

`ce-debug` 以 explicit gates 运行 structured investigation：

- **Causal chain gate**：chain 未被无缺口端到端解释前，不提出 fix
- **Predictions for uncertain links**：如果某个 link 是对的，另一个 code path 中也必须为真的东西
- **Assumption audit**：列出理解依赖的 "this must be true" beliefs，并标记 verified 或 assumed
- **One change at a time（一次只改一件事）**：anti-shotgun discipline
- **Smart escalation when stuck**：诊断 *为什么* hypotheses exhausted，而不是继续硬试
- **Test-first fix**：先写 failing test，确认它因正确原因失败，再实现；绝不两者同时做

---

## 它的新意

### 1. Causal chain gate：chain 未解释前不 fix

`ce-debug` 在能无缺口解释从 trigger 到 symptom 的完整 causal chain 前，不会提出 fix。"Somehow X leads to Y" 就是 gap。Fix gate 是结构性的：有一个 explicit phase transition，要求 chain explanation 通过。

### 2. Predictions for uncertain links（不确定 link 的预测）：anti-symptom-fix

对 causal chain 中每个 uncertain link，skill 都陈述一个 **prediction**：如果该 link 正确，另一个 code path 或 scenario 中也必须为真的东西。**如果 prediction 错了但 fix 看起来有效，你找到的是 symptom，不是 cause。** Obvious links（missing imports、clear null dereference）不需要 predictions；它是测试 uncertainty 的工具，不是每个 hypothesis 的仪式。

### 3. Assumption audit：抓住 right-hypothesis-wrong-assumption

形成 hypotheses 前，skill 会枚举理解依赖的 "this must be true" beliefs：framework 在这里这样工作、function 返回值符合名字、config 在这里运行前已加载、database 处于 test 暗示的状态。每项标记为 verified（读过 code、检查过 state 或运行过）或 assumed。许多 "wrong hypotheses" 其实是正确 hypotheses 被拿去测试了错误 assumption。

### 4. Smart escalation when stuck：诊断，而不是更用力

当 2-3 个 hypotheses exhausted 且没有 confirmation，skill 会诊断 *为什么* 卡住：

- Hypotheses 指向不同 subsystems -> 可能是 architecture problem；建议 `/ce-brainstorm`
- Evidence 自相矛盾 -> 对 code 的 mental model 错了；后退一步，不带 assumptions 重读
- Locally works、CI/prod fails -> environment problem；聚焦 env、config、dependencies、timing
- Fix works 但 prediction wrong -> symptom fix；real cause 仍然 active

### 5. Issue tracker integration：读取完整 thread

当输入引用 issue（`#123`、GitHub URL、Linear URL、Jira key）时，skill 会 fetch 完整 conversation，包括所有 comments，而不只是 original description。Comments 经常包含更新的 reproduction steps、缩小后的 scope、此前失败尝试，以及转向另一个 suspected root cause 的 pivots。把 opening post 当成全貌，经常会把 investigation 带错方向。

### 6. Test-first fix discipline（测试先行修复纪律）

如果你选择 fix（而不是 "diagnosis only"），skill 会写一个捕获 bug 的 failing test，验证它因正确原因失败（root cause，而不是 unrelated setup），实现 minimal fix，并验证 test passes。明确禁止 test-and-fix-in-the-same-step shortcut。

### 7. Conditional defense-in-depth（条件式纵深防御）

当 root-cause pattern 出现在 3+ 其他 files，或 bug 若在 production 中发生会 catastrophic，skill 会考虑四层 defense（entry validation、invariant check、environment guard、diagnostic breadcrumb）并应用合适部分。对没有 realistic recurrence 的 one-off errors，会跳过 defense-in-depth。

### 8. Bug 暴露 design problem 时升级到 brainstorm

具体 signals 会触发 `/ce-brainstorm` recommendation，而不是 fix：root cause 是 wrong responsibility 或 interface；requirements 错误或不完整；每种 fix 都是 workaround。Size alone 不会让事情变成 design problem；clear-fix-but-large bugs 仍然是 bugs。

---

## 快速示例

你粘贴 stack trace 或 GitHub issue URL。Skill fetch 完整 issue thread（包括带最新 reproduction details 的 comments），在本地 reproduce bug，并验证 environment sanity（正确 branch、dependencies installed、env vars present）。

它从 error 反向 upstream trace code path，不断问 "where did this value come from?"，直到到达 valid state 首次变 invalid 的点。它做 assumption audit，并标记一个 belief 未验证。

它形成两个 hypotheses，并按 likelihood 排序。第一个可直接测试；第二个有 uncertain link，因此生成 prediction：如果这个 link 是对的，另一个在不同 conditions 下调用同一 function 的 code path 也应该 fail。它测试 prediction。

Prediction 成立。Skill 用 file:line references 呈现 root cause、proposed fix，以及应添加的具体 tests（含 assertion guidance）。它询问：现在 fix、diagnosis only，还是 rethink design？

你选择 "fix it now"。它创建 feature branch，写 failing test，验证它因正确原因失败，实现 minimal fix，运行 tests，并 hand off 给 `/ce-commit-push-pr`。

---

## 何时使用

在以下情况使用 `ce-debug`：

- Test 正在失败，需要知道原因
- 有 error message、stack trace 或 unexpected behavior
- 出现 regression，需要找出何时坏掉
- 有 GitHub、Linear 或 Jira issue reference
- 几次 failed fix attempts 后仍卡在问题上
- 怀疑 bug surface 比单个 symptom 更宽（defense-in-depth territory）

以下情况跳过 `ce-debug`：

- 已经知道 root cause，fix obvious：直接修（或用 `/ce-work` 做 small change）
- "Bug" 实际是伪装成 bug 的 feature decision：使用 `/ce-brainstorm`
- 工作是实现新东西，而不是调查 broken behavior：使用 `/ce-work`

---

## 作为 Workflow 的一部分使用

`ce-debug` 通过三种方式与 chain interlock：

- **Called from `/ce-plan`**：当 planning prompt 是 bug-shaped（error message、"fix the bug where X"、regression），`ce-plan` 会在做 structural planning 前把 `ce-debug` 作为 route-out option
- **Escalates to `/ce-brainstorm`**：当 investigation 揭示 design problem，而不是 logic error，skill 会建议先 rethink 再 implement
- **Runs post-fix quality checks**：non-trivial fixes 在 shipping 前运行 `/ce-simplify-code` 和 `/ce-code-review`；tiny mechanical fixes 会说明原因后 skip
- **Hands off to `/ce-commit-push-pr branding:on`**：当 skill-created branch 上成功 fix 后，skill 会显式标记 CE provenance，并默认 commit-and-PR，不再额外 prompt（如果 repo 的 `AGENTS.md` 另有 explicit override path，则遵守）

PR 打开后，skill 可选提供 `/ce-compound` 来捕获 learning，但只在 bug 可 generalize 时（3+ recurrence、对 shared dependency 的 wrong assumption）。Localized mechanical fixes 会 silently skip，避免用 one-off entries 弄乱 `docs/solutions/`。

---

## 单独使用

`ce-debug` 是大多数 bug work 的 standalone entry point：

- **Failing test（失败测试）**：`/ce-debug spec/models/notification_subscription_spec.rb`
- **Error message paste**：`/ce-debug` 后跟 stack trace
- **GitHub issue**：`/ce-debug #1234` 或 `/ce-debug https://github.com/.../issues/1234`
- **Linear ticket**：`/ce-debug ABC-456` 或粘贴 URL
- **Stuck on something（卡在某个问题上）**：`/ce-debug "why is X returning undefined when Y"`

如果只想要 diagnosis（你自己处理 fix），在 Phase 2 handoff 选择 "Diagnosis only — I'll take it from here"。Summary 仍会生成；test recommendations 是 diagnosis 的一部分。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 询问 bug description |
| `<error message or stack trace>` | Direct investigation |
| `<test path>` | Reproduce failing test，并从那里 trace |
| `<issue reference>` (`#123`, URL, Linear ID, Jira key) | Fetch 完整 thread，读取所有 comments |
| `<description>` | 例如 "why is the cart total wrong on checkout" |

---

## 常见问题

**为什么 fix 前要 investigation？**
不绑定 clear causal chain 的 fixes 往往处理 symptom，而不是 cause。Bug 不再显现，但真实问题仍活着，几周后会在别处出现。Causal chain gate 是对此的 structural defense。

**Hypothesis 和 prediction 有什么区别？**
Hypothesis 说 "I think this is the cause." Prediction 说 "if my hypothesis is right, then *this other thing* must also be true." Predictions 用 independent evidence 测试 hypothesis；如果 prediction 错了但 fix 有效，你找到的是 symptom。

**什么时候 skill 应建议 `/ce-brainstorm`？**
只有当 bug 无法在当前 design 内 proper fix 时：wrong responsibility、wrong interface、requirements gap，或每个 fix 都是 workaround。Size alone 不会让它成为 design problem。

**如果我只想不走流程直接修呢？**
跳过这个 skill，直接用 `/ce-work` 或编辑文件。`ce-debug` 适用于 root cause 不明显，或 fix 一直不稳定的场景。

**它适用于非 software bugs 吗？**
不太适合。Skill 假设有 code、tests 和 tracker。Investigation discipline（causal chain、predictions、assumption audit）可以 generalize，但 skill mechanics（test-first fix、defense-in-depth、PR handoff）是 software-shaped。

---

## 另见

- [`ce-plan`](./ce-plan.md) - 从 planning 开始时，把 bug-shaped prompts route 到这里
- [`ce-brainstorm`](./ce-brainstorm.md) - bug 暴露 design problem 时的 escalation target
- [`ce-work`](./ce-work.md) - feature work 的 sibling skill；当 input 不是 bug-shaped 时使用它
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - fix 后处理 final commit + PR
- [`ce-compound`](./ce-compound.md) - bug 可 generalize 时捕获 reusable learning
