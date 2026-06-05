---
title: Plugin 版本与文档要求
category: workflow
tags: [versioning, changelog, readme, plugin, documentation]
created: 2025-11-24
date: 2026-03-17
severity: process
component: plugin-development
---

# Plugin 版本与文档要求

## 问题

修改 compound-engineering plugin 时，文档可能与实际组件（agents、commands、skills）不同步。这会让每个版本包含哪些内容变得不清楚，也让长期追踪变更更困难。

本文适用于 `compound-engineering` plugin 中由 release 拥有的 plugin metadata 和 changelog 表面，不适用于普通 feature work。

更大的 repo-level release model 现在记录在：

- `docs/solutions/workflow/manual-release-please-github-releases.md`

该文档覆盖常驻 release PR、`cli`、`compound-engineering`、`coding-tutor` 和 `marketplace` 之间的组件 ownership，以及用于发布 release notes 的 GitHub Releases 模型。本文范围更窄：它是给修改 `plugins/compound-engineering/**` 的贡献者看的 plugin-scoped 提醒。

## 解决方案

**常规 PR 不应切 plugin releases。**

内嵌 plugin versions 是 release-owned metadata。release automation 会在决定哪些已合并变更一起发布后，准备下一批 versions 和 changelog entries。由于多个 PR 可能在 release 前合并，贡献者不应在单个 PR 内猜测 release versions。

贡献者应：

1. **避免在常规 PR 中做 release bookkeeping**
   - 不要手动 bump `plugins/compound-engineering/.claude-plugin/plugin.json`
   - 不要手动 bump `.claude-plugin/marketplace.json` 中的 `compound-engineering` 条目
   - 不要在根目录 `CHANGELOG.md` 中切 release sections

2. **保持实质性文档准确**
   - 验证 component counts 与实际文件匹配
   - 验证 agent/command/skill 表格准确
   - 如果功能发生变化，更新 descriptions
   - 当 plugin inventories 或 release-owned descriptions 可能发生变化时，运行 `bun run release:validate`

## Plugin 变更检查清单

```markdown
Before committing changes to compound-engineering plugin:

- [ ] No manual version bump in `plugins/compound-engineering/.claude-plugin/plugin.json`
- [ ] No manual version bump in the `compound-engineering` entry inside `.claude-plugin/marketplace.json`
- [ ] No manual release section added to `CHANGELOG.md`
- [ ] README.md component counts verified
- [ ] README.md tables updated (if adding/removing/renaming)
- [ ] plugin.json description updated (if component counts changed)
- [ ] `bun run release:validate` passes
```

## 文件位置

- Plugin version 由 release 拥有：`plugins/compound-engineering/.claude-plugin/plugin.json`
- Marketplace entry 由 release 拥有：`.claude-plugin/marketplace.json`
- Release notes 由 release 拥有：GitHub release PRs 和 GitHub Releases
- Readme（README）：`plugins/compound-engineering/README.md`

## 示例 Workflow

添加新 agent 时：

1. 在 `plugins/compound-engineering/agents/[category]/` 中创建 agent 文件
2. 更新 `plugins/compound-engineering/README.md`
3. 将 plugin version 选择和 canonical release-note 生成留给 release automation
4. 运行 `bun run release:validate`

## 预防

本文档作为提醒。maintainers 或 agents 处理该 plugin 时应：

1. 在提交变更前检查本文档
2. 遵循上面的检查清单
3. 不要在 feature PRs 中猜测 release versions
4. 当问题涉及 batching、release PR 行为或 multi-component ownership，而不是 plugin-only bookkeeping 时，参考 repo-level release learning

## 相关文件

- `plugins/compound-engineering/.claude-plugin/plugin.json`
- `plugins/compound-engineering/README.md`
- `package.json`
- `CHANGELOG.md`
- `docs/solutions/workflow/manual-release-please-github-releases.md`
