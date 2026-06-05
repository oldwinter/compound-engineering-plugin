---
title: "feat: 将 ce:plan-beta 和 deepen-plan-beta 提升为 stable"
type: feat
status: completed
date: 2026-03-23
---

# Promote ce:plan-beta and deepen-plan-beta to stable（提升到 stable）

## 概览

用经过验证的 beta counterparts 替换 stable `ce:plan` 和 `deepen-plan` skills，遵循 `docs/solutions/skill-design/beta-skills-framework.md` 中记录的 9-step promotion path。

## 问题陈述

`ce:plan` 和 `deepen-plan` 的 beta versions 已经测试完毕，准备 promotion。它们目前作为独立 skill directories 与 stable versions 并存，并带有 `disable-model-invocation: true`，意味着用户必须手动调用它们。Promotion 会让它们成为所有 workflows 的默认版本，包括 `lfg`/`slfg` orchestration。

## 建议方案

严格遵循 beta-skills-framework promotion checklist，并同时应用到两组 skill pairs。

## 实施计划

### Phase 1：用 beta content 替换 stable SKILL.md content

**待修改文件：**

1. **`skills/ce-plan/SKILL.md`** -- 用 `skills/ce-plan-beta/SKILL.md` 替换全部内容
2. **`skills/deepen-plan/SKILL.md`** -- 用 `skills/deepen-plan-beta/SKILL.md` 替换全部内容

### Phase 2：恢复 stable frontmatter 并移除 beta markers

**在 promoted `skills/ce-plan/SKILL.md` 中：**

- 将 `name: ce:plan-beta` 改为 `name: ce:plan`
- 从 description 移除 `[BETA] ` 前缀
- 移除 `disable-model-invocation: true` 行

**在 promoted `skills/deepen-plan/SKILL.md` 中：**

- 将 `name: deepen-plan-beta` 改为 `name: deepen-plan`
- 从 description 移除 `[BETA] ` 前缀
- 移除 `disable-model-invocation: true` 行

### Phase 3：将所有 internal references 从 beta names 更新为 stable names

**在 promoted `skills/ce-plan/SKILL.md` 中：**

- 所有 `/deepen-plan-beta` references 改为 `/deepen-plan`
- 所有 `ce:plan-beta` references 改为 `ce:plan`（headings、prose 等）
- 所有 `-beta-plan.md` file suffix references 改为 `-plan.md`
- 使用 `-beta-plan.md` 的示例 filenames 改为 `-plan.md`

**在 promoted `skills/deepen-plan/SKILL.md` 中：**

- 所有 `ce:plan-beta` references 改为 `ce:plan`
- 所有 `deepen-plan-beta` references 改为 `deepen-plan`
- Scratch directory paths：`deepen-plan-beta` 改为 `deepen-plan`

### Phase 4：清理 ce-work-beta cross-reference

**在 `skills/ce-work-beta/SKILL.md`（line 450）中：**

- 从文本中移除 `ce:plan-beta or `，使其只读作 `ce:plan`

### Phase 5：删除 beta skill directories

- 完整删除 `skills/ce-plan-beta/` directory
- 完整删除 `skills/deepen-plan-beta/` directory

### Phase 6：更新 README.md

**在 `plugins/compound-engineering/README.md` 中：**

1. **更新 Workflow Commands table 中的 `ce:plan` description**（line 81）：从 `Create implementation plans` 改为 `Transform features into structured implementation plans grounded in repo patterns`
2. **更新 Utility Commands table 中的 `deepen-plan` description**（line 93）：Description 已经是 `Stress-test plans and deepen weak sections with targeted research`，与 beta 匹配，验证并保留
3. **移除整个 Beta Skills section**（lines 156-165）：`### Beta Skills` heading、解释段落、包含 `ce:plan-beta` 和 `deepen-plan-beta` rows 的表格，以及 "To test" 行
4. **更新 skill count**：Components table 中目前是 `40+`。移除 2 个 beta directories 会降低 count。用 `bun run release:validate` 验证并按需更新

### Phase 7：验证

1. **搜索残留 `-beta` references**：Grep `plugins/compound-engineering/` 下所有文件中的 `plan-beta` strings；每个命中都是 bug，但 `CHANGELOG.md` 中的历史 entries 是预期命中，不要修改
2. **运行 `bun run release:validate`**：检查 plugin/marketplace 一致性和 skill counts
3. **运行 `bun test`**：确保 converter tests 仍通过（它们使用 skill names 作为 fixtures）
4. **验证 `lfg`/`slfg` references**：确认它们引用 stable `/ce:plan` 和 `/deepen-plan`（它们已经如此，无需修改）
5. **验证 `ce:brainstorm` handoff**：确认它 hand off 到 stable `/ce:plan`（已经如此，无需修改）
6. **验证 `ce:work` compatibility**：promoted skills 生成的 plans 使用 `-plan.md` suffix，与之前一致

## 已改文件

| File | Action | Notes（说明） |
|------|--------|-------|
| `skills/ce-plan/SKILL.md` | Replace | Beta content with stable frontmatter |
| `skills/deepen-plan/SKILL.md` | Replace | Beta content with stable frontmatter |
| `skills/ce-plan-beta/` | Delete | Entire directory |
| `skills/deepen-plan-beta/` | Delete | Entire directory |
| `skills/ce-work-beta/SKILL.md` | Edit | Remove `ce:plan-beta or` reference at line 450 |
| `README.md` | Edit | Remove Beta Skills section, verify counts and descriptions |

## 未改文件（已验证安全）

这些文件引用 stable `ce:plan` 或 `deepen-plan`，因为 stable names 被保留，所以**无需修改**：

- `skills/lfg/SKILL.md` -- calls `/ce:plan` and `/deepen-plan`
- `skills/slfg/SKILL.md` -- calls `/ce:plan` and `/deepen-plan`
- `skills/ce-brainstorm/SKILL.md` -- hands off to `/ce:plan`
- `skills/ce-ideate/SKILL.md` -- explains pipeline
- `skills/document-review/SKILL.md` -- references `/ce:plan`
- `skills/ce-compound/SKILL.md` -- references `/ce:plan`
- `skills/ce-review/SKILL.md` -- references `/ce:plan`
- `AGENTS.md` -- lists `ce:plan`
- `agents/research/learnings-researcher.md` -- references both
- `agents/research/git-history-analyzer.md` -- references `/ce:plan`
- `agents/review/code-simplicity-reviewer.md` -- references `/ce:plan`
- `plugin.json` / `marketplace.json` -- no individual skill listings

## 验收标准

- [ ] `skills/ce-plan/SKILL.md` contains the beta planning approach（包含 beta planning approach：decision-first、phase-structured）
- [ ] `skills/deepen-plan/SKILL.md` contains the beta deepening approach（包含 beta deepening approach：selective stress-test、risk-weighted）
- [ ] No `disable-model-invocation` in either promoted skill（两个 promoted skill 都不包含该字段）
- [ ] No `[BETA]` prefix in either description（两个 description 都没有 `[BETA]` prefix）
- [ ] No remaining `-beta` references in any file under `plugins/compound-engineering/`（该目录下不再有 `-beta` references）
- [ ] `skills/ce-plan-beta/` and `skills/deepen-plan-beta/` directories deleted（两个 beta directories 已删除）
- [ ] README Beta Skills section removed（README 的 Beta Skills section 已移除）
- [ ] `bun run release:validate` passes（通过）
- [ ] `bun test` passes（通过）

## 来源

- **Promotion checklist（promotion checklist）:** `docs/solutions/skill-design/beta-skills-framework.md`（steps 1-9）
- **Versioning rules（versioning 规则）:** `docs/solutions/plugin-versioning-requirements.md`（no manual version bumps）
