# `autofix_class` 评判标准（personas）

`autofix_class` 描述 follow-up work 的**内在形态**；它是信号，**不是 apply gate 或 permission**。在 `mode:agent` 中，caller 负责解释 findings 并拥有 apply 决策；在默认（interactive）模式中，review 会按 judgment 自行应用 safe fixes（SKILL.md Stage 5c）。无论哪种情况，该 class 都用于提示*先做什么*和*标记什么*，而不是机械决定什么会被应用。

| `autofix_class` | Meaning |
|-----------------|---------|
| `gated_auto` | 在 `suggested_fix` 中提出了具体 change。Callers 可以在自行判断后 apply。 |
| `manual` | 需要 design input 或 decision 才能改代码的 actionable work。能提出可辩护默认方案时，包含 `suggested_fix`。 |
| `advisory` | 仅报告：learnings、residual risk、rollout notes。 |

## Persona 指引

- 当可以为 localized change 写出可辩护的 `suggested_fix` 时，优先使用 `gated_auto`。
- 当正确修复依赖 product intent、architecture 或 cross-cutting refactors 时，使用 `manual`。
- 当不修也不会破坏任何东西、但观察结果有价值时，使用 `advisory`。
- Do **not** emit `safe_auto`：callers 决定 apply 什么；reviewers 负责分类和提出方案。

## `owner` 字段

| `owner` | Meaning |
|---------|---------|
| `downstream-resolver` | Caller 或 human 应在 review 后处理。 |
| `human` | implementation 前需要 judgment。 |
| `release` | Operational / rollout follow-up。 |

Do not use `review-fixer`。
