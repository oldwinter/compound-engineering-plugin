---
title: "ce-work-beta promotion 需要清理 manual handoff 并迁移 contract"
category: skill-design
date: 2026-03-31
module: skills
component: SKILL.md
tags:
  - skill-design
  - beta-testing
  - workflow
  - rollout-safety
severity: medium
description: "Promoting ce-work-beta 不只是复制 SKILL.md content：stable handoffs、contract tests、beta-only wording 和 planning neutrality 必须一起切换。"
related:
  - docs/solutions/skill-design/beta-skills-framework.md
  - docs/solutions/skill-design/beta-promotion-orchestration-contract.md
---

## 问题

`ce-work-beta` 是有意设计为 manual-invocation beta skill。beta 期间，`ce-plan`、`ce-brainstorm`、`lfg`、`slfg` 以及其他 workflow handoffs 仍指向 stable `ce-work`，这样 repo 就不需要同时支持两条 execution paths。

这意味着将 `ce-work-beta` promote 到 stable 不只是 content copy。该 rollout 会同时切换多个 contracts：

- active implementation surface 从 `ce-work-beta` 移到 `ce-work`
- beta-only manual invocation caveats 变成错误信息
- planner 和 workflow handoffs 可以开始承认 promoted path
- tests 需要断言 stable surface，而不是 beta surface

如果这些变更没有一起发生，repo 最终会教用户错误 skill，保留 stale beta caveats，或保留会彼此漂移的重复 active paths。

## 当前 Beta 限制

beta 期间，预期行为是：

- `ce-work-beta` 包含 experimental implementation
- 用户想要新行为时，手动调用 `ce-work-beta`
- `ce-plan` 保持 neutral，并继续提供 stable `ce-work`
- workflow orchestrators 继续指向 stable `ce-work`

这个限制是有意的。它避免把 beta-specific branching 推入每个 planning 和 orchestration surface。

## Promotion 检查清单

当 `ce-work-beta` 准备 promote 时：

1. 将 validated implementation 从 `skills/ce-work-beta/SKILL.md` 复制到 `skills/ce-work/SKILL.md`。
2. 在 `ce-work` 上恢复 stable frontmatter：
   - stable `name:`（稳定版 name）
   - 不带 `[BETA]` 的 stable description
   - 移除 `disable-model-invocation: true`
3. 从 promoted stable skill 中移除 beta-only manual invocation wording。
4. 重做或移除 `ce-work-beta`，让它不再看起来像 active parallel implementation：
   - 删除它，或
   - 缩减为 thin redirect/deprecation note
5. 原子化更新 planning 和 workflow handoffs：
   - `ce-plan`
   - `ce-brainstorm`
   - 任何其他推荐或调用 `ce-work` 的 skills 或 workflows
6. 重新审视 planner wording，必要时让它可以安全提到 promoted stable behavior。
7. 将 contract tests 从 beta surface 移到 stable surface。
8. 重新运行 release validation，以及任何覆盖 handoff chain 的 workflow-level tests。

## 特有 Gotchas

### 必须移除 manual-invocation caveats

beta skill 有意说明它必须手动调用，且 handoffs 仍指向 stable `ce-work`。promotion 后，这些 wording 会变成 false，并主动误导用户。

### `ce-plan` 应在 beta 期间保持 neutral，然后有意切换

当 beta 还是 manual-only 时，`ce-plan` 不应教 beta-only invocation details。promotion 后，planner 可以承认 promoted stable path，但这应发生在 promotion PR 中，而不是更早。

### Test ownership 必须迁移

beta 期间，contract tests 应断言 `ce-work-beta` 上的 delegation behavior。promotion 后，这些 assertions 应属于 `ce-work`。只复制 skill content 而不移动 tests，会保护错误 surface。

### 不要留下两条 active delegation paths

如果 promotion 后 `ce-work` 和 `ce-work-beta` 都保留 live delegation logic，它们会漂移。Promotion 结束时应只剩一个 canonical implementation surface。

### Promotion 既是 beta-to-stable 变更，也是 orchestration 变更

这次 promotion 不寻常，因为 beta skill 被有意与 workflow handoffs 隔离。因此 promotion PR 必须同时做到：

- 常规 beta-to-stable file/content promotion
- 在 stable surface 可以拥有该 feature 后，清理 workflow contract

caller-update principle 见 `docs/solutions/skill-design/beta-promotion-orchestration-contract.md`。

## 验证

merge promotion PR 前，确认：

- stable `ce-work` 包含 implementation
- `ce-work-beta` 不再读起来像 active implementation path
- stable path 上不再残留 beta-only manual invocation caveats
- workflow handoffs 指向预期位置
- contract tests 断言正确 surface
- release validation 通过

## 预防

- 将 `ce-work-beta` promotion 视为 coordinated workflow change，而不只是 text replacement。
- 在同一个 PR 中更新 skill content、planner wording、workflow handoffs 和 tests。
- 在 beta 阶段留下类似本文的 durable note，让后续 promotion work 不依赖记忆。
