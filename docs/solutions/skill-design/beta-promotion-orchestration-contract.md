---
title: "Beta-to-stable promotions 必须 atomic update orchestration callers"
category: skill-design
date: 2026-03-23
module: skills
component: SKILL.md
tags:
  - skill-design
  - beta-testing
  - rollout-safety
  - orchestration
severity: medium
description: "将 beta skill promote 到 stable 时，在同一个 PR 中更新所有 orchestration callers，让它们传递正确 mode flags，而不是继承 defaults。"
related:
  - docs/solutions/skill-design/beta-skills-framework.md
---

## Problem（问题）

当 beta skill 引入新的 invocation semantics（例如 explicit mode flags）时，如果直接用它替换 stable counterpart，却不更新 orchestration callers，这些 callers 会静默继承错误的 default behavior。

## Solution（解决方案）

把 promotion 视为 orchestration contract change，而不是 file rename。

1. 用 promoted content 替换 stable skill
2. 在同一个 PR 中更新每个调用该 skill 的 workflow
3. 在每个 callsite hardcode intended mode，而不是依赖 default
4. 添加或更新 contract tests，让 orchestration assumptions 可执行

## Applied（已应用）：ce-review-beta -> ce-code-review (2026-03-24)

该 pattern 已在把 review beta（`ce-review-beta`，在 cleanup registry 中以 legacy artifact `ce:review-beta`/`ce-review-beta` 跟踪）promote 为 stable `ce-code-review` skill 时应用。caller contract：

- `lfg` -> `/ce-code-review mode:autofix`（由 `tests/review-skill-contract.test.ts` enforced）
- `slfg` parallel phase -> `/ce-code-review mode:report-only`（intended；当前没有 contract test 覆盖）

## Prevention（预防）

- 当 beta skill 改变 invocation semantics 时，promotion plan 必须把 caller updates 作为 first-class implementation unit
- Promotion PRs 应保持 atomic：在同一 branch 中 promote skill 并更新 orchestrators
- 为 promoted callsites 添加 contract coverage，避免未来 refactors 静默丢掉 required mode flags
- 不要依赖 “remembering later” 处理 orchestration mode changes；把它们编码进 docs、plans 和 tests
