# Skill Documentation（Skill 文档）

面向最终用户的 compound-engineering plugin skills 文档。每个页面覆盖该 skill 的 high-level purpose、novel mechanics、use cases，以及它在其他 skills 链条中的位置。

Runtime behavior 和 contributor reference 以每个 skill source folder（`skills/`）下的 `SKILL.md` 为准。

Skills 共享的 checkout-local defaults 记录在 [Compound Engineering 配置](./configuration.md)中。

---

## compound-engineering core loop（核心循环）

```text
[/ce-ideate] (optional) "What's worth exploring?"
      |
      v
   /ce-brainstorm  "What does this need to be?"
      |
      v
   /ce-plan        "What's needed to accomplish this?"
      |
      v
   /ce-work        "Build it."
      |
      v
   /ce-compound    "Capture what we learned."
      |
      +-- back into the next brainstorm/plan
```

`/ce-compound` 是让 loop 真正 *compound* 的收尾：它把 learnings 写入 `docs/solutions/`，下一轮 `/ce-brainstorm` 和 `/ce-plan` 会读取这些内容作为 grounding。这个 return arrow 就是全部重点。`/ce-ideate` 是可选前奏，用于你还不知道该做什么时。这个 catalog 里的其他内容，要么是围绕 loop 的 anchor，要么是在出现特定需求时调用的 on-demand tool，不是每次都要走一遍的步骤。

---

## Core Loop（核心循环）

每次工程 iteration 的步骤。`/ce-ideate` 只在需要先找方向时运行；其他 steps 按每项工作的顺序运行。

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-ideate`](./ce-ideate.md) | *可选第一步*：用六个 conceptual frames、warrant requirement 和 adversarial filtering 发现值得探索的强方向 |
| [`/ce-brainstorm`](./ce-brainstorm.md) | 定义某个东西应该变成什么：collaborative dialogue、named gap lenses、requirements-only unified plan |
| [`/ce-plan`](./ce-plan.md) | 用 guardrails 约束 execution：把 unified plans enrich 为带 U-IDs、test scenarios 和 automatic confidence check 的 implementation-ready plans；做 WHAT decisions，而不是 HOW code |
| [`/ce-work`](./ce-work.md) | 按 implementation-ready plan guardrails 执行：面对代码决定 HOW，并通过 quality gates ship |
| [`/ce-compound`](./ce-compound.md) | 通过把 learnings 捕获到 `docs/solutions/` 来闭环，让下一次 iteration 更聪明：bug track + knowledge track |

---

## Around the Loop（围绕循环）

不作为 loop 内部步骤、但用于锚定、供给或维护 loop 的 skills。

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-strategy`](./ce-strategy.md) | 创建或维护 `STRATEGY.md`，作为上游 anchor，被 `ce-ideate`、`ce-brainstorm`、`ce-plan` 读取作为 grounding |
| [`/ce-product-pulse`](./ce-product-pulse.md) | 外层 feedback loop：单页 time-windowed report，覆盖 usage、performance、errors、followups；保存到 `docs/pulse-reports/` 作为 timeline |
| [`/ce-sweep`](./ce-sweep.md) | Recurring feedback sweep：按 per-source cursor 摄取 Slack/GitHub items（email experimental），在源头 acknowledge，分析 recordings，验证 fixes 已 merge，并 reconcile `/lfg`-ready rolling plan |
| [`/ce-compound-refresh`](./ce-compound-refresh.md) | 随时间维护 `docs/solutions/`：五种 outcomes（Keep / Update / Consolidate / Replace / Delete），支持 Interactive + Autofix modes |

---

## On-Demand（按需调用）

在出现特定需求时调用；不属于任何固定 chain。

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-pov`](./ce-pov.md) | 以 adoption verdict、holistic document take 或既有 approaches 立场的形式形成 decisive、project-grounded POV；支持 blind initial round、bounded evidence-based reconciliation 和 user-extensible checkpoint 的 named/`oracle` panel |
| [`/ce-explain`](./ce-explain.md) | 把 concept、diff、idea 或你最近一段 work 转成写给你个人的 dense visual explainer；可选 check-in（diff 的 predict-then-reveal、corrected exercises）和 capability-detected destination ask |
| [`/ce-debug`](./ce-debug.md) | 系统找出 root causes：causal chain gate、predictions、post-fix polish/review、PR handoff |
| [`/ce-code-review`](./ce-code-review.md) | 使用 skill-local reviewer personas、confidence-gated findings 和四种 modes 的 structured code review |
| [`/ce-doc-review`](./ce-doc-review.md) | 使用 skill-local reviewer personas review requirements 或 plan documents：coherence、feasibility、product-lens、design-lens、security-lens、scope-guardian、adversarial |
| [`/ce-simplify-code`](./ce-simplify-code.md) | Refine 最近改动的 code：reuse、quality、efficiency review，并验证 behavior preservation |
| [`/ce-optimize`](./ce-optimize.md) | Metric-driven iterative optimization loops：three-tier evaluation、parallel experiments、persistence discipline |

---

## Research & Context（研究与上下文）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-riffrec-feedback-analysis`](./ce-riffrec-feedback-analysis.md) | 把原始 [Riffrec](https://github.com/kieranklaassen/riffrec) recordings 转成 structured feedback：quick bug 或 extensive analysis，并 hand off 给 `ce-brainstorm` |

---

## Git Workflow（Git 工作流）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-commit`](./ce-commit.md) | 创建单个精心组织的 git commit：convention-aware、sensitive-file-safe、file-level logical splitting |
| [`/ce-commit-push-pr`](./ce-commit-push-pr.md) | 从 working changes 到 open PR，并生成 adaptive descriptions，保留 related references；支持三种 modes（full workflow / description update / description-only generation），并为本次 change 新引入的任何 concept 添加 concept-teaching section |
| [`/ce-babysit-pr`](./ce-babysit-pr.md) | Watch open PR 并推动它走向 merge：comments-first 处理新 review comments（通过 `/ce-resolve-pr-feedback`）和 CI failures（通过 `/ce-debug`），使用 crash-safe、可恢复 tick；根据 harness 采用 continuous 或 checkpoint mode，并通过 settle window 避免过早报告 "ready to merge" |
| [`/ce-worktree`](./ce-worktree.md) | 确保 work 在 isolated git worktree 中进行：检测 existing isolation，优先使用 harness native worktree tool，最后 fallback 到 plain git |

---

## Autonomous Pipeline（自治流水线）

| Skill | Description（说明） |
|-------|-------------|
| [`/lfg`](./lfg.md) | 运行完整 hands-off engineering pipeline 直至得到 green PR；条件满足时推荐一个 opt-in fresh-session handoff，用于下一个单独规划的 area |

---

## Frontend Design（前端设计）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-polish`](./ce-polish.md) | 对话式 UX polish：启动 dev server、打开 browser、一起迭代；自动检测 8 种 frameworks（仅手动调用） |

---

## Collaboration（协作）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-proof`](./ce-proof.md) | 通过 [Proof](https://www.proofeditor.ai)（Every 的 collaborative editor）publish、view、comment 和 edit markdown；使用 hosted v3 Web API 和 owner credential lifecycle |

---

## Workflow Utilities（Workflow 工具）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-promote`](./ce-promote.md) | 为已发布 feature 起草 user-facing announcement copy（X、changelog、LinkedIn、email）：可选 Spiral CLI 做 voice matching，未安装时提供轻量 editorial & social expertise，只生成 drafts |
| [`/ce-resolve-pr-feedback`](./ce-resolve-pr-feedback.md) | 并行评估、修复并回复 PR review feedback，包括 nitpicks |
| [`/ce-dogfood`](./ce-dogfood.md) | 对 active branch 做 hands-off diff-scoped browser QA：map flows，自主修复小 breakages 并带 regression tests commit，写 durable report（仅手动调用） |
| [`/ce-test-browser`](./ce-test-browser.md) | 采用 host-native browser 优先、`agent-browser` fallback 的层级，对 PR / branch 影响的 pages 做 end-to-end browser tests |
| [`/ce-test-xcode`](./ce-test-xcode.md) | 用 XcodeBuildMCP 在 simulator 上 build 和 test iOS apps：screenshots、logs、human verification |
| [`/ce-setup`](./ce-setup.md) | 诊断 optional tool capabilities，并 bootstrap safe project-local config |
| [`/ce-handoff`](./ce-handoff.md) | 在默认临时存储或指定位置创建 session handoff，再从选定来源发现并恢复上下文；不会自动继续执行 |

---

## 另请参阅

Top-level install 和 usage guide 见 [`README.md`](../../README.md)。每个 skill 的权威 runtime spec 位于 `skills/<skill>/SKILL.md`。
