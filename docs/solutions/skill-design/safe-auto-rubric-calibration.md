---
title: "safe_auto rubric calibration: variance reduction 胜过把 safe_auto-rate 当目标"
date: 2026-04-25
last_updated: 2026-04-25
category: skill-design
module: compound-engineering / ce-code-review
problem_type: design_pattern
component: subagent-template
severity: low
tags:
  - ce-code-review
  - autofix-class
  - rubric
  - calibration
  - eval
  - eval-methodology
  - variance
related_issue: EveryInc/compound-engineering-plugin#686
related_pr: "PR #685 (本工作建立在该 suggested_fix 推进之上)"
---

# safe_auto rubric calibration: variance reduction 胜过把 safe_auto-rate 当目标

## TL;DR

Issue #686 假设 personas 将 findings *过少* 分类为 `safe_auto`，并提议收紧 rubric，让更多 findings 进入 auto-apply。60-trial eval 显示：

- 该 hypothesis 对 textbook cases 不成立。**9 个 fixture shapes 中有 6 个** 在 baseline 与 tightened rubric 之间分类完全一致（mechanical 的都为 `safe_auto`，touching contract 的都为 `gated_auto`）。
- 真正收益是 **ambiguous cases 上的 variance reduction**，尤其是没有明确 "no callers" annotation 的 orphan code，baseline rubric 对同一 fixture 在 4 次 trials 中产生近乎随机的分类（manual / safe_auto / gated_auto）。
- tightened rubric 换来一个 stable disagreement：cross-file Rails service extraction 从 baseline `safe_auto`（4/4）变为 tightened `gated_auto`（6/7）。两种分类都 internally defensible。Tightened 是更 conservative 的读法，也更符合 careful operator 在 auto-apply 前想要的行为。

已 shipped 的 change 主要是 determinism patch，而不是 safe_auto-rate increase。两个 methodological lessons 可泛化到这次 calibration 之外：**measure variance, not just classification-rate-shift**，以及 **synthetic-fixture eval harness 是 "ship and watch" 与 "stare at the diff" 之间的正确 tier**。两者在下方专门章节中记录。

---

## 背景

[`ce-code-review` 的 subagent template](../../plugins/compound-engineering/skills/ce-code-review/references/subagent-template.md) 将每个 finding 分类到四个 `autofix_class` buckets 之一：`safe_auto`、`gated_auto`、`manual`、`advisory`。这些 buckets 控制 downstream fixer dispatch。Headless mode 只 auto-applies `safe_auto`；其他全部 surface 给 user routing。

Issue #686 引用了一起 #685 前的 incident（"8 findings ended up in tickets that should have been fixes"），并推断 personas 对 `safe_auto` 太 conservative，把 genuine-mechanical fixes 推进了 `gated_auto` 或 `manual`。PR #685 已通过 `suggested_fix` propagation 直接修复 LFG defer-bias。#686 的问题是：是否还应收紧 `safe_auto` boundary，使更多 findings 流入 auto-apply？

---

## Eval 探测内容

9 个 fixtures 覆盖不同 finding shapes，在 post-#685 baseline subagent template 与 tightened version 上同时运行。Single-persona dispatches（根据 fixture 使用 correctness / maintainability / testing / security）。5 iterations 中共 60 trials：

| Fixture | 形态 | Persona |
|---|---|---|
| F1 | internal helper 内的 nil guard | correctness |
| F1b | Cart subtotal 的 `min_by` semantic bug | correctness |
| F2 | scope 中有 parallel pattern 的 off-by-one | correctness |
| F3 | 带明确 "no callers" comment 的 dead code | maintainability |
| F3b | 没有明确 deadness signal 的 orphan code | maintainability |
| F4 | 单个 class 内的 local helper extraction | maintainability |
| F4b | Cross-file helper extraction | maintainability |
| F5 | 新 public method 缺少 test | testing |
| F6 | Admin auth gate（negative control，应保持 gated_auto） | security |

tightened rubric 增加了：一条 `safe_auto` 的 one-sentence "test" 和 explicit exclusion list（no contract / permission / signature change）、四个 "boundary cases that feel risky but are safe_auto" examples、一个 symmetry-of-error opening sentence，以及一个 "do not default to gated_auto" anti-pattern guard。

---

## 结果

| Fixture | Baseline | Tightened | Delta |
|---|---|---|---|
| F1 | 3/3 safe_auto | 3/3 safe_auto | 完全一致 |
| F1b | 3/3 safe_auto | 3/3 safe_auto | 完全一致 |
| F2 | 3/3 safe_auto | 3/3 safe_auto | 完全一致 |
| F3 | 3/3 safe_auto | 3/3 safe_auto | 完全一致 |
| F4 | 2/3 safe_auto, 1/3 advisory | 3/3 safe_auto | tightened 降低 variance |
| **F3b** | **manual / safe_auto / gated_auto / safe_auto（4 trials，3 个不同 classes）** | **7/7 gated_auto** | **tightened 显著降低 variance** |
| F4b | 4/4 safe_auto | 6/7 gated_auto, 1/7 advisory | stable disagreement，方向相反 |
| F5 | 3/3 safe_auto | 3/3 safe_auto | 完全一致 |
| F6 (control) | 1/1 gated_auto | 1/1 gated_auto | 完全一致（正确且稳定） |

---

## 解读

### Hypothesis 大致错误，但 rubric tightening 仍大致正确

"personas under-classify safe_auto" hypothesis 假设 personas 在 boundary 上系统性 conservative。数据表明 post-#685 personas 已经把 textbook mechanical cases（nil guards、off-by-ones with parallel patterns、explicit dead code、local helper extraction、missing tests for existing methods）分类为 `safe_auto` -- 9 个 fixtures 中有 6 个在 baseline 与 tightened 间没有差异。

rubric tightening 实际做的是在旧 wording genuinely ambiguous 的 cases 上降低 **variance**。F3b 是 headline：一个没有 explicit "no callers" comment 的 orphan method。baseline 在同一 input 的四次 trials 中产生 `manual`、`safe_auto` 和 `gated_auto`，基本随机。tightened rubric 通过给 persona 更清晰的 test（"the surrounding refactor obviously displaces it" requires positive signal，而该 fixture 缺少该 signal），将其 deterministic pin 到 `gated_auto`。

classification variance 是真实成本：当 rubric ambiguous 时，ce-work 的 headless mode 会在相同 inputs 的不同 runs 中表现不同。只要分类 defensible，determinism 比具体选择哪个 classification 更有价值。

### F4b 是一个 stable disagreement，且两边都 defensible

两个 service objects with identical bodies 的 cross-file extraction：baseline rubric 的 "extracting a duplicated helper" example 匹配，因此 4/4 分类为 `safe_auto`。tightened rubric 的 "naming or placement requires a design conversation" criterion 捕获 Rails service-layering placement（base class vs concern vs module），因此 6/7 分类为 `gated_auto`。

两者 internally consistent。支持 `safe_auto` 的论点是："consolidation 是 mechanical，新 module 的 name 来自 shared shape，两个 call sites 在同一 diff 中 lockstep update。" 支持 `gated_auto` 的论点是："在 Rails app 中，shared module 放在哪里是用户应在落地前 approve 的真实 architectural decision。" 合理 operators 可能偏好任一方。

tightened rubric 选择 conservative reading。这是 trade-off，不是 regression：ce-work headless 现在会把 cross-file extraction flag 给 user review，而不是 auto-apply。对 careful operators 来说这是正确选择；对 autonomous bulk refactor flows 来说是 modestly more friction。

### Eval 没有告诉我们的事

这是 single-persona、synthetic-fixture eval。真实 reviews 会让多个 personas 经过 synthesis 与 conservative tie-breaks；我测量的 persona-side classification 只是一个 input。Synthesis-layer effects 可能 amplify 或 dampen eval 结果。对真实 branch 做 proper end-to-end test，并 multi-persona dispatch，才能捕获 surprises。

fixtures 也是 synthetic。原始 "8 findings to tickets" incident 可能涉及我没 probe 的 finding shape。如果 calibration ships 后类似 incident 再次发生，那是 rubric 仍有 gap、值得再次迭代的证据。

---

## Shipped 内容

两个 files changed：

1. **`subagent-template.md`（autofix_class decision guide, ~138-160）。** Net +14 lines，-6 lines。
   - 顶部加入 one-sentence "symmetry of wrong-side cost" framing。
   - 用 operational test 替换 "without design judgment"：one-sentence fix、无 "depends on" clauses、不改变 function signature / public-API contract / error contract / security posture / permission model。
   - 新增 "Boundary cases that often feel risky but are still safe_auto" subsection，覆盖 nil guards、off-by-ones、dead code、helper extraction（带 cross-file discriminator，使 F4b 在 placement is design-shaped 时 pin 到 gated_auto）。
   - 在现有 "do not default to advisory" anti-pattern guard 旁，新增 "do not default to gated_auto"。

2. **`findings-schema.json`（autofix_class field description）。** 用 mirror subagent-template wording 的 operational summary 替换简短的 "Reviewer's conservative recommendation"。

---

## 方法论经验 1：variance reduction 胜过 classification-rate-shift

这个 headline lesson 可泛化到 `autofix_class` 之外。评估任何 persona-rubric change 时，**先衡量 ambiguous fixtures 上的 variance reduction；把 textbook fixtures 上的 classification-rate shifts 视为 noise-prone third-tier signal。**

### 证据层级

1. **First-order signal：ambiguous fixtures 上的 variance reduction。** 每个 ambiguous cell 每版至少跑 N=3 trials；如果 N=3 仍 noisy，就 bump 到 N=7+。Measure：同一 input 上每个 version across trials 产生多少 distinct classifications？baseline 在 4 trials 中 emitted 3 个不同 classes，而 tightened version 在 7 trials 中 pin 到一个 class，这是 clear win，且不取决于 tightened version 选择了 *哪个* class。
2. **Second-order signal：boundary cases 上的 stable disagreements。** 一个 cell 中 baseline 稳定给 `X`，tightened 稳定给 `Y`，这是真实 trade-off，不是 noise。两种 reading 可能都 defensible；问题变成 "which is the right side to land on?"。这是 judgment call，但清晰可讨论。
3. **Third-order signal：textbook cases 上的 classification-rate shifts。** 这是最 noisy、价值最低的 signal，因为 synthetic textbook fixtures 在调好的 model 上通常不会移动。如果唯一 "win" 是 textbook cases 上的 rate-shifts，很可能测到的是 noise。

### 为什么 N=1 synthetic-fixture eval 会误导

同一 input 上的 persona dispatches 可能在不同 runs 产生不同 classifications，因为 rubric 旧 wording genuinely ambiguous，而不是 model 坏了。在 synthetic fixtures 上，很容易想读 N=1：fixture *感觉* deterministic，所以一次 trial *感觉* 足够。但事实并非如此。

在这次 calibration 中，两个早期 N=1 reads 连续产生了两个 confident but wrong conclusions：先是 "tightened rubric has no effect"，接着是 "tightened rubric is causing a wrong-direction regression"。两者都在 N=3 时反转，并且只在 noisy cells 上跑到 N=4 到 N=7 后清晰收敛。

机制是：F3b baseline 从 tri-modal distribution {manual, safe_auto, gated_auto} 采样。因此同一 prompt pair、同一 fixture 的两次 single-trial reads 可产生完全不同故事：

- (baseline=safe_auto, tightened=gated_auto) → "regression: tightening pushed a safe_auto into gated_auto"（回归：收紧把 safe_auto 推到了 gated_auto）
- (baseline=manual, tightened=gated_auto) → "improvement: tightening pulled a manual into gated_auto"（改进：收紧把 manual 拉到了 gated_auto）
- (baseline=gated_auto, tightened=gated_auto) → "no effect"（无影响）

三种 reads 都来自同一 prompt pair 与同一 fixture。只有 variance summary 说明真相：baseline 在该 input 上基本随机；tightened pinned。这才是 win。

### 实用规则

- **永远不要相信 synthetic fixture 上用于 directional read 的 N=1。** 把 single-trial reads 当作 "dispatches 是否能 end-to-end run" 的 smoke checks，而不是 behavior measurements。
- **N=3 是底线；bump 直到 variance stops moving。** 如果三次 trials disagree，先跑更多 trials，*再* 加更多 fixtures。confident read 的 bottleneck 是 noisy cell 上的 depth，而不是新 cells 的 breadth。
- **在 summary table 中显式 aggregate variance。** 像 `F3b: baseline manual / safe_auto / gated_auto / safe_auto (4 trials, 3 distinct classes)` 这样的 row，比 single-class summary 提供更多信息。
- **把每个 cell 的 *distinct classes 数量减少* 当作 prompt-tightening changes 的 headline metric。** 这是 determinism win，也是 prompt 增加 token cost 的 justification。
- **保留一个 negative control fixture**，它不应移动。如果它在任一 version 的 trials 中移动，说明 rubric 有 stability problem，而 calibration 正在遮蔽它。

### 适用场景

当 eval 使用 synthetic fixtures（无 ground-truth label）、rubric 输出少量 discrete buckets，或 change 由声称 systematic mis-classification 的 incident report 触发时，应用 variance-first lens。当你有 ground-truth labels（rate-shift against truth 变得 meaningful），或 rubric 输出 free-text 而非 discrete bucket 时，该 lens 适用性较低。

repo 中的相关 precedent：[`docs/solutions/skill-design/ce-doc-review-calibration-patterns.md`](./ce-doc-review-calibration-patterns.md) 有 "Reviewer variance is inherent; single runs aren't baselines" section，针对 ce-doc-review 的 tier classification 发出同样 warning。原则可泛化：任何 persona-rubric eval 在 rubric 可能 ambiguous 的 cells 上都至少需要 N≥3。

---

## 方法论经验 2：shipping 前验证 persona-rubric prompt changes

这是一个 reusable harness pattern，用于在 merge 前 evaluation 任何 subagent-template / persona-prompt change。

### 它填补的空白

"ship the prompt and watch real reviews"（慢、信号低、混入 synthesis-layer effects）与 "stare at the diff and reason about it"（无信号）之间存在一个 tier。下方 pattern 用一个 lightweight、scriptable harness 填补这个 tier，它保持除待测 prompt 外的所有东西 constant。

### Workspace pattern（复现 safe_auto eval，可直接复用）

```
/tmp/<eval-name>/
  fixtures/
    F<N>-<short-label>/
      fixture.json        # id, intent, expected outcome, metric, persona
      diff.patch          # the unified diff under review
      context/            # repo files visible as surrounding context (NOT in diff)
      files/              # post-change versions of touched files
  skill-snapshot/         # the BASELINE prompt(s), copied verbatim before any edits
  persona-runner-prompt.md
  iteration-1/
    F<N>-old_skill-trial-1/outputs/findings.json
    F<N>-with_skill-trial-1/outputs/findings.json
    ...
  iteration-2/
  ...
```

`persona-runner-prompt.md` 定义每个 dispatch 必须遵守的 strict contract：(1) 精确读取四个 input paths（subagent template、persona profile、diff、context dir），(2) 不 fallback 到 prompt 的任何其他版本，(3) stay in persona，(4) 将 findings JSON 写到指定 `OUTPUT_PATH`，(5) dispatch reply 中不写 prose。这让 workspace reproducible -- 每个 cell 的行为除你 vary 的 parameters 外都相同。

### 应用步骤

1. **先 snapshot baseline。** 编辑 prompt 前，把当前版本 copy 到 `skill-snapshot/`。在 eval 期间将该 directory 视为 immutable。
2. **构建覆盖 boundary 的 fixture matrix，而不只是 easy cases。** 包含 textbook positives、textbook negatives、一个 explicit negative control（不应移动），以及至少两个你 genuinely cannot predict 的 boundary cases。每个 fixture 用小型 `fixture.json` 记录 intent 和 expected outcome，防止 post-hoc rationalization。
3. **通过 parallel Agent dispatches spawn cells。** 每个 cell 传入四个 paths 和唯一 `OUTPUT_PATH`。使用简单 naming scheme（`F3b-old_skill-trial-2`），这样 aggregation 就是对 glob 跑 `jq`。
4. **每个 cell 跑 multiple trials。** 三次是实际 minimum；N=3 时看起来 noisy 的 cells bump 到七次或更多。（完整论证见上方 variance lesson。）
5. **用 `jq` aggregate under-test structured field**（例如跨 iteration directories 运行 `jq '.findings[0].autofix_class'`）。按 fixture 与 prompt version 构建 summary table。
6. **Iterate，如果 prompt 再变化则重新 snapshot。** 每个 iteration directory 是 separate run；`iteration-N` 让你能跨 prompt revisions 比较，而不会丢失早期 data。

### Fixture matrix design（泛化 shape，而不是 content）

| Fixture role | 探测内容 | 本次 eval 示例 |
|---|---|---|
| Textbook positive | 两个 versions 下都应 classify 为 "right" way | F1 internal helper 内的 nil guard |
| Textbook negative | 两个 versions 下都应 classify 为 "wrong-direction" way | F2 带 parallel pattern 的 off-by-one |
| Explicit negative control | 必须不移动；若移动，prompt 有 regression | F6 admin auth gate |
| Ambiguous boundary | eval 存在的原因：outcome a priori unknown | F3b 没有 "no callers" comment 的 orphan code |
| Stable disagreement candidate | 两个 versions 都 defensible；你想看清 trade | F4b cross-file Rails service extraction |

### 可复现性

Workspace：`/tmp/safe-auto-eval/`（synthetic fixtures、snapshot baseline、persona-runner prompt、per-iteration outputs；合成 fixtures、snapshot baseline、persona-runner prompt 和每轮输出）。

为不同 rubric change 重新运行：
1. 将当前 `subagent-template.md`（或其他 persona prompt）snapshot 到 `/tmp/<eval-name>/skill-snapshot/`
2. 复用 `/tmp/safe-auto-eval/persona-runner-prompt.md` 中的 persona-runner pattern
3. 每个 cell × trial spawn 一个 Agent dispatch，参数化 SUBAGENT_TEMPLATE_PATH（current vs snapshot）+ PERSONA_PATH + DIFF_PATH + FILES_DIR + CONTEXT_DIR
4. 通过 `jq '.findings[0].<field>'` 聚合 iteration directories

fixtures 本身（`/tmp/safe-auto-eval/fixtures/F{1,1b,2,3,3b,4,4b,5,6}/`）为 reproducibility 保留，但不 committed。它们是 synthetic eval scaffolding，不是 plugin 的一部分。

### 何时应用此 pattern

使用该 harness 当：

- 正在编辑 persona rubric、decision guide 或 output-contract section，且 change 旨在改变 classification behavior。
- rubric 驱动 downstream automation（auto-apply gates、fixer dispatch、escalation routing），wrong classification 有真实成本。
- 因 change 触及 headless 或 auto-apply paths，"Just ship it and watch" 太慢或太 risky。
- 某个 reported incident 触发了 change，你想在 shipping 前验证 hypothesis（safe_auto calibration 正是这种情况：Issue #686 假设 under-classification；eval falsified 该 hypothesis，但 surfaced 一个不同的真实问题，值得修）。

当 change 纯文本（typo、link fix）、在低 bad-ship 成本 feature flag 后，或 real-branch test 能以相似成本给出 equally clean signal（persona-layer changes 中少见）时，skip 或 downscale。

---

## 相关

- PR #685：`fix(ce-code-review): replace LFG with best-judgment auto-resolve`（本工作建立在该 suggested_fix push 上）
- Issue #686：触发 eval 的 calibration request
- [`docs/solutions/skill-design/confidence-anchored-scoring.md`](./confidence-anchored-scoring.md)：repo 中 eval-as-validation 的 prior art；建立了 A/B-against-baseline pattern，本 doc 将其泛化
- [`docs/solutions/skill-design/ce-doc-review-calibration-patterns.md`](./ce-doc-review-calibration-patterns.md)：见 "Reviewer variance is inherent; single runs aren't baselines" section，它针对 ce-doc-review 的 tier classification 警告同一个 N=1 trap
