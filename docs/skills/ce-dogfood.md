# `ce-dogfood`

> 对 active branch 做 hands-off、diff-scoped browser QA：map flows，驱动真实 browser，自主修复小 breakages（带 regression tests 和 commits），并写 durable report。仅手动调用。

`ce-dogfood` 像 QA engineer 一样端到端 dogfood **active branch**：理解相对 trunk 的每个 change，map diff 触及的 user flows，通过 `agent-browser` 在真实 browser 中 exercise 每条 flow，同时判断 correctness 和 experience（包括 per-persona paper cuts），自主修复安全可修的小问题，给每个 fix 加 regression test 并 commit；无法安全修复的则 escalate，并在 `docs/dogfood-reports/` 下留下 durable report。

它是 **diff-scoped**，不是 whole-app exploration；也是 **hands-off**：调用后会自主跑完整 loop。因为它会编辑代码并创建 commits，所以 **只能手动调用**（`disable-model-invocation: true`）。

---

## 摘要（TL;DR）

| Question | Answer |
|----------|--------|
| 它做什么？ | 将 diff -> flows -> test matrix，驱动 browser 测每条 flow，自主修复小 breakages（带 regression tests + commits），escalate 大问题，并写 report |
| 何时使用？ | Branch ship 前，需要一次真实 browser pass，且希望它不仅 report，还能 *fix* 发现的问题 |
| 产出什么？ | Durable report（`docs/dogfood-reports/<date>-<branch>-dogfood.md`）：flows、test matrix、fixes、paper cuts、escalations、learnings、verdict |
| 与 `ce-test-browser` 的区别 | `ce-test-browser` test and report；`ce-dogfood` 增加 autonomous fixing、regression tests、fix commits、persona-level experiential judgment 和 durable report artifact |
| Invocation | 仅手动，输入 `/ce-dogfood` |

---

## 问题

Branch 可以通过 static review 和 unit tests，却在 browser 中 broken 或 rough。发现这些通常需要人工 click-through，而且常有这些问题：

- **Tests pages, not journeys**：email “sends”，但落到错误 thread；form save 了，但 redirect 到让人困惑的位置
- **Stops at "does it work"**：只看它是否能用，不问对真正使用者是否 *feels right*
- **Finds bugs but doesn't fix them**：QA pass 产出 list，修复变成之后的另一项任务
- **Lets fixed bugs regress**：没有 test 锁住修复
- **Leaves no durable trace**：下个人又从零推导同样 flows

## 方案

`ce-dogfood` 用一次 hands-off pass 跑完整 loop：

- **Flow-first**：先把 diff 触及的 journeys 映射为 Mermaid flowcharts，再构建 test matrix，所以测试的是 journey，不是孤立 widgets
- **Persona-grounded**：基于 product personas（来自 `STRATEGY.md` / `VISION.md` / persona docs，或 inferred persona）审视 flows，寻找 **paper cuts**
- **Autonomous fix loop**：small、low-risk、unambiguous breakages 原地修复，每个 fix 都有 fails-before/passes-after regression test 和自己的 commit
- **Knows when to stop**：large、ambiguous 或 product-altering changes 被记录为 “Decisions for a human”，不会强行修改
- **Verifies before the verdict**：宣称 branch ready 前，先跑项目 existing test suite
- **Durable artifact**：report doc 同时也是 resume checkpoint

---

## 新颖之处

### 1. Flows before the matrix

Skill 将每个 user-visible change 映射成 Mermaid `flowchart`：entry point、actions、branch points、side effects、true end state（包括 email click-through destinations），然后才从 diagrams 推导 test matrix。Flowcharts 是 understanding，本身会成为 matrix 的 spine，并进入 report。Mapping 随 diff 缩放：单 route change 得到一张小 flowchart，而不是跳过步骤。

### 2. Functional and experiential judgment

每个 scenario 判断两次：“does it work?”（正确 data、正确 destination、没有 console errors）和 “does it feel right?”。Skill 会以每个 primary persona 走 flow，并记录 **paper cuts**：functional test 能通过、但会伤害该 persona experience 的小摩擦。Scenario 可以 functionally `Pass`，但仍带 paper cuts。

### 3. Autonomous fix loop with a size gate

当 scenario 失败，或 passing scenario 带有值得现在修的 sharp paper cut 时，skill 先判断这个 fix 是否该由 **它** 来做。它只 auto-fix small、well-understood、low-risk changes；任何需要 architecture/schema decision、改变 product behavior、跨很多文件，或存在多个合理解法的内容都会 escalate，而不是强行修。每个 autonomous fix 都带 regression test；纯 copy/visual fix 则带 documented replay/screenshot check，并说明为什么 automated test 不 meaningful。

### 4. Escalation as a first-class outcome

“太大，无法 autonomous fix” 是正常结果，不是失败。Skill 会把这类内容记录在 **Decisions for a human** 下：哪里 broken，为什么不适合 safe autonomous fix，选项与 trade-offs，以及 recommendation，并把 scenario 标记为 `Blocked (human decision)`。

### 5. Resumable by design

Report doc 在 matrix 出现后立即创建，并 incremental 更新，所以 run 可中断并 resume，或由 teammate 接手。Resume 时已完成 scenarios 保持完成，pending ones 重新 queue；但两个 `Blocked` states 会展示给用户，而不是静默 rerun，因为它们在等人。

### 6. A suite check before "ready"

Browser matrix green 但 test suite red，不是 “ready”。Verdict 前，skill 会根据项目 conventions 发现并运行 existing automated tests（加上新 regression tests），而不是假设某个 runner。

---

## `ce-dogfood` vs `ce-test-browser`

二者都接受 PR / branch，并通过 browser 测试 diff-affected pages。`ce-test-browser` 优先使用 capable host-native browser，并 fallback 到 `agent-browser`；`ce-dogfood` 当前仍要求 `agent-browser`。按你想要的结尾选择：

| | `ce-test-browser` | `ce-dogfood` |
|---|---|---|
| Output | Test summary | Durable report + committed fixes |
| Fixes breakages? | 不修，只 report | 修 small ones，并带 regression tests |
| Experiential judgment | Functional focus | Functional + per-persona paper cuts |
| Flow modeling | Route-oriented | Journey-first（Mermaid flowcharts） |
| Autonomy | Failures 后询问怎么处理 | Hands-off：fix、escalate、continue |
| Invocation | Model 或 user 都可触达 | 仅手动 |

需要较轻的 “affected pages still work?” pass 时用 `ce-test-browser`；希望 branch 被推向 genuinely-ready，并且 fixes 已应用时用 `ce-dogfood`。

---

## 何时使用

Reach for `ce-dogfood` when:

- 你有一个 branch，希望它在真实 browser 中被推进到 genuinely-ready，而不只是 smoke-tested
- 你希望 breakages 被 *fixed and locked in with tests*，而不只是列出来
- 你关心 change 对真实用户是否 feels right，不只是是否能用
- 你希望为 branch 留下一份 durable QA artifact

Skip it when:

- Change 是 backend-only，没有 browser-visible behavior -> 用项目 test runner
- 你只想快速确认 “does it still render” -> 用 `/ce-test-browser`
- `agent-browser` 未安装 -> 先运行 `/ce-setup`
- 本地 dev server 无法启动 -> 换一种 approach

---

## 单独使用

- **Current branch**：`/ce-dogfood`
- **Specific PR**：`/ce-dogfood 847`
- **Specific branch**：`/ce-dogfood feature/new-dashboard`
- **Custom port**：`/ce-dogfood --port 5000`

Skill 会拒绝在 trunk 上运行（没有 diff 可 dogfood），并会提议在 isolated worktree 中运行，避免污染 main checkout。

---

## Reference

| Argument | Effect |
|----------|--------|
| _(empty)_ | Dogfood current branch |
| `<PR number>` | Checkout 并 dogfood 该 PR |
| `<branch name>` | Checkout 并 dogfood 该 branch |
| `--port <number>` | Override port detection |

Required：已安装 `agent-browser` CLI（缺失时运行 `/ce-setup`）；skill 能启动的 local dev server。

---

## See Also

- [`ce-test-browser`](./ce-test-browser.md) — 较轻的 test-and-report sibling
- [`ce-worktree`](./ce-worktree.md) — Phase 0 提供的 isolation
- [`ce-debug`](./ce-debug.md) — 非明显 failures 的 root-cause analysis
- [`ce-commit`](./ce-commit.md) — 每个 fix 的 well-scoped commit message
- [`ce-compound`](./ce-compound.md) — 捕获本 pass 浮现出的 reusable lessons
- [`ce-setup`](./ce-setup.md) — 报告 `agent-browser` 是否可用，缺失时打印 install command
