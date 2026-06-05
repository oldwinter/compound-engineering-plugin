---
title: "Beta skills framework：使用 -beta 后缀的 parallel skills 实现安全 rollout"
category: skill-design
date: 2026-03-17
module: plugins/compound-engineering/skills
component: SKILL.md
tags:
  - skill-design
  - beta-testing
  - skill-versioning
  - rollout-safety
severity: medium
description: "使用 -beta 后缀让新 skill versions 与 stable versions 并行试用的 pattern。覆盖命名、plan file 命名、internal references 和 promotion path。"
related:
  - docs/solutions/skill-design/compound-refresh-skill-improvements.md
  - docs/solutions/skill-design/beta-promotion-orchestration-contract.md
---

## 问题

像 `ce-plan` 这样的核心 workflow skills 被深度串联（`ce-brainstorm` → `ce-plan` → `ce-work`），并由 `lfg` 和 `slfg` 编排。重写这些 skills 有可能同时破坏所有用户的整个 workflow。此前没有机制让用户在 stable versions 旁边试用新的 skill versions。

曾考虑并拒绝的替代方案：
- **SKILL.md 中的 Beta gate**，通过配置驱动 routing（`compound-engineering.local.md` 中的 `beta: true`）：依赖 prompt-level conditional routing，存在 instruction blending 风险，需要 setup integration，并给 skill 文件自身增加复杂度。
- **Pure router SKILL.md**，两个版本都放在 `references/` 中：增加 file-read penalty，并不必要地重构 stable skills。
- **单独的 beta plugin**：为临时需求引入过重基础设施。

## 解决方案

### 使用 `-beta` 后缀的 parallel skills

在 stable skills 旁边创建单独的 skill directories。每个 beta skill 都是完全独立的副本，拥有自己的 frontmatter、instructions 和 internal references。

```
skills/
├── ce-plan/SKILL.md           # Stable (unchanged)
└── ce-plan-beta/SKILL.md      # New version
```

### 命名与 frontmatter 约定

- **Directory（目录）**：`<skill-name>-beta/`
- **Frontmatter name**：`<skill-name>-beta`（例如 `ce-plan-beta`）
- **Description**：写预期的 stable description，然后加上 `[BETA]` 前缀。这样 promotion 时只需移除前缀，而不是重写。
- **`disable-model-invocation: true`**：防止模型 auto-trigger beta skill。用户通过 slash command 手动调用。promotion 到 stable 时移除此字段。
- **Plan files**：使用 `-beta-plan.md` 后缀（例如 `2026-03-17-001-feat-auth-flow-beta-plan.md`），避免覆盖 stable plan files

### Internal references（内部引用）

Beta skills 必须用 beta names 引用其他 beta skills。例如，如果 `ce-plan` 和 `ce-code-review` 都有 beta versions：
- `ce-plan-beta` 引用 `ce-code-review-beta`（不是 `ce-code-review`）
- `ce-code-review-beta` 引用 `ce-plan-beta`（不是 `ce-plan`）

### 不变项

- Stable skills 完全不动
- `lfg`/`slfg` orchestration 继续使用 stable skills，无需修改
- `ce-brainstorm` 仍 hand off 给 stable `ce-plan`，无需修改
- `ce-work` 可消费任一版本生成的 plan files（它读取文件，不关心哪个 skill 写的）

### 取舍

**Simplicity over seamless integration。** Beta skills 作为独立、手动调用的 skills 存在。除非进一步改造相关 skills，否则它们不会被 `ce-brainstorm` handoffs 或 `lfg`/`slfg` orchestration 自动触发；为了试用期付出这种复杂度不值得。

**预期使用模式：** 用户可以先运行 `/ce-plan` 得到 stable output，再对同一输入运行 `/ce-plan-beta`，并排比较两个 plan documents。`-beta-plan.md` 后缀确保两个输出可在 `docs/plans/` 中共存而不冲突。

## Promotion path（晋级路径）

当 beta version 被验证后：

1. 用 beta skill content 替换 stable `SKILL.md` content
2. 恢复 stable frontmatter：从 description 移除 `[BETA]` 前缀，恢复 stable `name:`
3. 移除 `disable-model-invocation: true`，让模型可以 auto-trigger 它
4. 将所有 internal references 改回 stable names
5. 恢复 stable plan file naming（从约定中移除 `-beta`）
6. 删除 beta skill directory
7. 更新 README.md：从 Beta Skills section 移除，并验证 counts
8. 验证 `lfg`/`slfg` 可配合 promoted skill 工作
9. 验证 `ce-work` 可消费 promoted skill 生成的 plans

如果 beta skill 改变了 invocation contract，promotion 必须在同一个 PR 中更新所有 orchestration callers，而不是依赖 stable default behavior。具体 review-skill 示例见 [beta-promotion-orchestration-contract.md](./beta-promotion-orchestration-contract.md)。

## 验证

创建 beta skill 后，在其 SKILL.md 中搜索它替代的 stable skill name。任何不带 `-beta` 的 stable name 都是漏改 rename，可能导致 output collisions 或 route 到错误 skill。

检查：
- **Output file paths** 是否使用 stable naming convention 而不是 `-beta` 变体
- **Cross-skill references** 是否指向 stable skill names 而不是 beta counterparts
- **User-facing text**（questions、confirmations）是否提到 stable paths 或 names

## 预防

- 添加 beta skill 时，始终在 directory name、frontmatter name、description、plan file naming 以及所有 internal skill-to-skill references 中一致使用 `-beta` 后缀
- 创建 beta skill 后，运行上面的 validation checks，捕获 file paths、user-facing text 和 cross-skill references 中漏改的 renames
- 始终测试 stable skills 完全不受 beta skill 存在影响
- 保持 beta 与 stable plan file suffixes 不同，让输出可共存以便比较
