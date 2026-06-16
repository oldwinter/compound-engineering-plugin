# Skill Documentation（Skill 文档）

面向最终用户的 compound-engineering plugin skills 文档。每个页面覆盖该 skill 的 high-level purpose、novel mechanics、use cases，以及它在其他 skills 链条中的位置。

Runtime behavior 和 contributor reference 以每个 skill source folder（`plugins/compound-engineering/skills/`）下的 `SKILL.md` 为准。

---

## compound-engineering core loop（核心循环）

```text
   [/ce-ideate]       (optional) "What's worth exploring?"
        │
        ▼
┌─→ /ce-brainstorm    "What does this need to be?"
│       │
│       ▼
│   /ce-plan          "What's needed to accomplish this?"
│       │
│       ▼
│   /ce-work          "Build it."
│       │
│       ▼
└── /ce-compound      "Capture what we learned."
```

`/ce-compound` 是让 loop 真正 *compound* 的收尾：它把 learnings 写入 `docs/solutions/`，下一轮 `/ce-brainstorm` 和 `/ce-plan` 会读取这些内容作为 grounding。图中的回环就是全部重点。`/ce-ideate` 是可选前奏，用于你还不知道该做什么时。这个 catalog 里的其他内容，要么是围绕 loop 的 anchor，要么是在出现特定需求时调用的 on-demand tool，不是每次都要走一遍的步骤。

---

## Core Loop（核心循环）

每次工程 iteration 的步骤。`/ce-ideate` 只在需要先找方向时运行；其他四个按每项工作的顺序运行。

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-ideate`](./ce-ideate.md) | *可选第一步*：用六个 conceptual frames、warrant requirement 和 adversarial filtering 发现值得探索的强方向 |
| [`/ce-brainstorm`](./ce-brainstorm.md) | 定义某个东西应该变成什么：collaborative dialogue、named gap lenses、尺寸合适的 requirements doc |
| [`/ce-plan`](./ce-plan.md) | 用 guardrails 约束 execution：U-IDs、test scenarios、automatic confidence check；做 WHAT decisions，而不是 HOW code |
| [`/ce-work`](./ce-work.md) | 按 plan 的 guardrails 执行：面对代码决定 HOW，通过 quality gates ship |
| [`/ce-compound`](./ce-compound.md) | 通过把 learnings 捕获到 `docs/solutions/` 来闭环，让下一次 iteration 更聪明：bug track + knowledge track |

---

## Around the Loop（围绕循环）

不作为 loop 内部步骤、但用于锚定、供给或维护 loop 的 skills。

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-strategy`](./ce-strategy.md) | 创建或维护 `STRATEGY.md`，作为上游 anchor，被 `ce-ideate`、`ce-brainstorm`、`ce-plan` 读取作为 grounding |
| [`/ce-product-pulse`](./ce-product-pulse.md) | 外层 feedback loop：单页 time-windowed report，覆盖 usage、performance、errors、followups；保存到 `docs/pulse-reports/` 作为 timeline |
| [`/ce-compound-refresh`](./ce-compound-refresh.md) | 随时间维护 `docs/solutions/`：五种 outcomes（Keep / Update / Consolidate / Replace / Delete），支持 Interactive + Autofix modes |

---

## On-Demand（按需调用）

在出现特定需求时调用；不属于任何固定 chain。

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-debug`](./ce-debug.md) | 系统找出 root causes：causal chain gate、uncertain links 的 predictions、smart escalation |
| [`/ce-code-review`](./ce-code-review.md) | 带 tiered persona agents、confidence-gated findings 和四种 modes 的 structured code review |
| [`/ce-doc-review`](./ce-doc-review.md) | 使用 parallel persona agents review requirements 或 plan documents：coherence、feasibility、product-lens、design-lens、security-lens、scope-guardian、adversarial |
| [`/ce-simplify-code`](./ce-simplify-code.md) | Refine 最近改动的 code：三个 parallel reviewer agents（reuse、quality、efficiency）；验证 behavior preservation |
| [`/ce-optimize`](./ce-optimize.md) | Metric-driven iterative optimization loops：three-tier evaluation、parallel experiments、persistence discipline |

---

## Research & Context（研究与上下文）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-sessions`](./ce-sessions.md) | 搜索 Claude Code、Codex 和 Cursor 的 session history，寻找与问题相关的 context |
| [`/ce-slack-research`](./ce-slack-research.md) | 搜索 Slack 中已解释的 organizational context：workspace identity、research-value assessment、cross-cutting analysis |
| [`/ce-riffrec-feedback-analysis`](./ce-riffrec-feedback-analysis.md) | 把原始 [Riffrec](https://github.com/kieranklaassen/riffrec) recordings 转成 structured feedback：quick bug 或 extensive analysis，并 hand off 给 `ce-brainstorm` |

---

## Git Workflow（Git 工作流）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-commit`](./ce-commit.md) | 创建单个精心组织的 git commit：convention-aware、sensitive-file-safe、file-level logical splitting |
| [`/ce-commit-push-pr`](./ce-commit-push-pr.md) | 从 working changes 到 open PR，并生成 adaptive descriptions：三种 modes（full workflow / description update / description-only generation） |
| [`/ce-clean-gone-branches`](./ce-clean-gone-branches.md) | 删除 remote tracking branch 已消失的 local branches，包括关联 worktrees |
| [`/ce-worktree`](./ce-worktree.md) | 确保 work 在 isolated git worktree 中进行：先检测 existing isolation，优先使用 harness native worktree tool，最后才 fallback 到 plain git |

---

## Frontend Design（前端设计）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-frontend-design`](./ce-frontend-design.md) | 用真正的 design quality 构建 web interfaces：context detection、visual-thesis pre-build、opinionated defaults、visual verification |
| [`/ce-polish`](./ce-polish.md) | 对话式 UX polish：启动 dev server、打开 browser、一起迭代；自动检测 8 种 frameworks（仅手动调用） |

---

## Collaboration（协作）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-proof`](./ce-proof.md) | 通过 [Proof](https://www.proofeditor.ai)（Every 的 collaborative editor）创建、share 并运行 human-in-the-loop review loops，覆盖 markdown、Web API 和 Local Bridge surfaces |

---

## Workflow Utilities（Workflow 工具）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-demo-reel`](./ce-demo-reel.md) | 为 PR descriptions 捕获 visual evidence（GIF、terminal recording、screenshots）：与 test output 严格分离 |
| [`/ce-promote`](./ce-promote.md) | 为已发布 feature 起草 user-facing announcement copy（X、changelog、LinkedIn、email）：可选 Spiral CLI 做 voice matching，未安装时提供轻量 editorial & social expertise，只生成 drafts |
| [`/ce-resolve-pr-feedback`](./ce-resolve-pr-feedback.md) | 并行评估、修复并回复 PR review feedback，包括 nitpicks |
| [`/ce-test-browser`](./ce-test-browser.md) | 只使用 `agent-browser`，在 PR / branch 影响的 pages 上做 end-to-end browser tests |
| [`/ce-test-xcode`](./ce-test-xcode.md) | 用 XcodeBuildMCP 在 simulator 上 build 和 test iOS apps：screenshots、logs、human verification |
| [`/ce-setup`](./ce-setup.md) | 诊断 environment、安装缺失工具、bootstrap project-local config：一个交互式 onboarding flow |
| [`/ce-update`](./ce-update.md) | 对比已安装 compound-engineering plugin version 和 `main`，并推荐 update command（仅 Claude Code） |
| [`/ce-release-notes`](./ce-release-notes.md) | 查询最近 compound-engineering plugin releases：summary 或带 version citation 的特定问题 |
| [`/ce-report-bug`](./ce-report-bug.md) | 报告 compound-engineering plugin 的 bug：structured intake、automatic env gathering、GitHub issue creation |

---

## 另请参阅

完整 skills catalog（包括这里没有独立文档的 skills）见 [`plugins/compound-engineering/README.md`](../../plugins/compound-engineering/README.md)。每个 skill 的权威 runtime spec 位于 `plugins/compound-engineering/skills/<skill>/SKILL.md`。
