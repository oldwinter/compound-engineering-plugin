---
title: 用 .local.md pattern 简化 Plugin Settings
type: feat
date: 2026-02-08
---

# 简化 Plugin Settings

## 概览

用 `.local.md` plugin-settings pattern 替换 486 行的 `/compound-engineering-setup` wizard 和 JSON config。让 agent configuration 极其简单：一个用户直接编辑的 YAML frontmatter file，加上一个生成 template 的轻量 setup command。

## 问题陈述

当前分支（`feat/compound-engineering-setup`）包含：
- 一个 486 行 setup command，带 Quick/Advanced/Minimal modes、add/remove loops、custom agent discovery
- JSON config file（`.claude/compound-engineering.json`）-- 不是 plugin-settings convention
- 将在 4 个 workflow commands 中重复的 config-loading boilerplate
- 对 "which agents should review my code?" 这个问题来说 over-engineered

同时，main 上的 workflow commands 使用硬编码 agent lists，无法按 project customize。

## 提议方案

使用带 YAML frontmatter 的 `.claude/compound-engineering.local.md`。三个简单 changes：

1. **Rewrite `setup.md`**（486 → 约 60 行）-- 检测 project type，创建 template file
2. **Add config reading to workflow commands**（每个约 5 行）-- 读取文件，fallback 到 defaults
3. **Config is optional** -- 没有 config 时也通过 auto-detection 工作

### Settings File Format（Settings 文件格式）

```markdown
---
review_agents: [kieran-rails-reviewer, code-simplicity-reviewer, security-sentinel]
plan_review_agents: [kieran-rails-reviewer, code-simplicity-reviewer]
---

# Review Context

Any extra instructions for review agents go here.
Focus on N+1 queries — we've had issues in the brief system.
Skip agent-native checks for internal admin pages.
```

就是这样。不需要 `conditionalAgents`，不需要 `options`，不需要 `customAgents` mapping。Conditional agents（migration、frontend、architecture、data）继续硬编码在 review command 中 -- 它们基于 file patterns 触发，而不是基于 config。

## 实现计划

### 阶段 1：重写 setup.md

**文件:** `plugins/compound-engineering/commands/setup.md`
**From（原）：** 486 lines → **To（目标）：** ~60 lines

setup command 应该：

- [x] 检测 project type（Gemfile+Rails、tsconfig、pyproject.toml 等）
- [x] 检查 `.claude/compound-engineering.local.md` 是否已存在
- [x] 若存在：显示当前 config，询问用户是否 regenerate
- [x] 若不存在：用检测到的类型对应 smart defaults 创建 `.claude/compound-engineering.local.md`
- [x] 显示 file path，并告诉用户可直接编辑
- [x] 不要 wizard、multi-step AskUserQuestion flows 或 modify loops

**按 project type 设置的 default agents：**

| Type | review_agents | plan_review_agents |
|------|--------------|-------------------|
| Rails | kieran-rails-reviewer, dhh-rails-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle | kieran-rails-reviewer, code-simplicity-reviewer |
| Python | kieran-python-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle | kieran-python-reviewer, code-simplicity-reviewer |
| TypeScript | kieran-typescript-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle | kieran-typescript-reviewer, code-simplicity-reviewer |
| General | code-simplicity-reviewer, security-sentinel, performance-oracle | code-simplicity-reviewer, architecture-strategist |

### 阶段 2：更新 review.md

**文件:** `plugins/compound-engineering/commands/workflows/review.md`
**变更:** 用 config-aware section 替换硬编码 agent list（lines 64-81）

在 parallel agents section 前添加（约 5 行）：

```markdown
#### Load Review Agents

Read `.claude/compound-engineering.local.md` (project) or `~/.claude/compound-engineering.local.md` (global).
If found, use `review_agents` from YAML frontmatter. If not found, auto-detect project type and use defaults:
- Rails: kieran-rails-reviewer, dhh-rails-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle
- Python: kieran-python-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle
- TypeScript: kieran-typescript-reviewer, code-simplicity-reviewer, security-sentinel, performance-oracle
- General: code-simplicity-reviewer, security-sentinel, performance-oracle

Run all review agents in parallel using Task tool.
```

**Keep conditional agents hardcoded** -- 它们基于 file patterns（db/migrate、*.ts 等）触发，而不是 user preference。这是正确行为。

**Add `schema-drift-detector` as a conditional agent** -- 当前它作为 agent 已存在，但没有 wire 到任何 command。把它加入 migrations conditional block：

```markdown
**MIGRATIONS: If PR contains database migrations or schema.rb changes:**

- Task schema-drift-detector(PR content) - Detects unrelated schema.rb changes (run FIRST)
- Task data-migration-expert(PR content) - Validates ID mappings, rollback safety
- Task deployment-verification-agent(PR content) - Go/No-Go deployment checklist

**When to run:** PR includes `db/migrate/*.rb` OR `db/schema.rb`
```

`schema-drift-detector` 应按自身 docs 先运行 -- 在其他 DB reviewers 把时间浪费在 unrelated changes 前捕获 drift。

### 阶段 3：更新 work.md

**文件:** `plugins/compound-engineering/commands/workflows/work.md`
**变更:** 替换 "Consider Reviewer Agents" section 中的硬编码 agent list（lines 180-193）

替换为：

```markdown
If review agents are needed, read from `.claude/compound-engineering.local.md` frontmatter (`review_agents`).
If no config, use project-appropriate defaults. Run in parallel with Task tool.
```

### 阶段 4：更新 compound.md

**文件:** `plugins/compound-engineering/commands/workflows/compound.md`
**变更:** 更新 Phase 3 "Optional Enhancement"（lines 92-98）和 "Applicable Specialized Agents" section（lines 214-234）

compound.md 中的 specialized agents 是按 problem-type 触发的（performance → performance-oracle、security → security-sentinel）。这些应保持 hardcoded -- 它们不是 "review agents"，而是由 problem category 触发的 domain experts。不需要 config。

**Only change:** 添加说明：用户可通过 `/compound-engineering-setup` customize review agents，但不要在这里添加 config-reading logic。

## 验收标准

- [ ] `setup.md` 少于 80 行
- [ ] 运行 `/compound-engineering-setup` 会用正确 defaults 创建 `.claude/compound-engineering.local.md`
- [ ] 当 config 已存在时，运行 `/compound-engineering-setup` 会显示当前 config，并在 overwrite 前询问
- [ ] `/workflows:review` 在存在 `.local.md` 时读取其中 agents
- [ ] `/workflows:review` 在没有 config 时 fallback 到 auto-detected defaults
- [ ] `/workflows:work` 在存在 `.local.md` 时读取 agents
- [ ] `compound.md` 除 setup command 引用外保持不变
- [ ] 无 JSON config files -- 只有 `.local.md`
- [ ] Config file 是 optional -- 没有它一切也能工作
- [ ] Conditional agents（migrations、frontend、architecture、data）继续 hardcoded 在 review.md 中

### 阶段 5：结构清理

**5a. 删除 `technical_review.md`**

`commands/technical_review.md` 是一个单行 command（`Have @agent-dhh-rails-reviewer @agent-kieran-rails-reviewer @agent-code-simplicity-reviewer review...`），带 `disable-model-invocation: true`。它重复了 `/plan_review` skill。删除它。

- [x] Delete（删除）`plugins/compound-engineering/commands/technical_review.md`

**5b. 向 `setup.md` 添加 `disable-model-invocation: true`**

setup command 是 deliberate -- 用户显式运行它。它不应被 auto-invoked。

- [x] Add（添加）`disable-model-invocation: true` to `setup.md` frontmatter

**5c. 更新 component counts**

变更后：29 agents、24 commands（25 - 1 deleted technical_review）、18 skills、1 MCP。

等等 -- 加上 setup.md 并删除 technical_review.md：25 - 1 = 24。与 main 相同。变更后验证实际 count。

- [x] Update（更新）`plugin.json` description with correct counts
- [x] Update（更新）`marketplace.json` description with correct counts
- [x] Update（更新）`README.md` component counts table

**5d. 更新 CHANGELOG.md**

- [x] Add（添加）entry for v2.32.0 documenting: settings support, schema-drift-detector wired in, technical_review removed

## 验收标准

- [ ] `setup.md` 少于 80 行
- [ ] `setup.md` 有 `disable-model-invocation: true`
- [ ] 运行 `/compound-engineering-setup` 会用正确 defaults 创建 `.claude/compound-engineering.local.md`
- [ ] 当 config 已存在时，运行 `/compound-engineering-setup` 会显示当前 config，并在 overwrite 前询问
- [ ] `/workflows:review` 在存在 `.local.md` 时读取 agents
- [ ] `/workflows:review` 在没有 config 时 fallback 到 auto-detected defaults
- [ ] `/workflows:review` 会对包含 migrations 或 schema.rb 的 PRs 运行 `schema-drift-detector`
- [ ] `/workflows:work` 在存在 `.local.md` 时读取 agents
- [ ] `compound.md` 除 setup command 引用外保持不变
- [ ] `technical_review.md` deleted
- [ ] 无 JSON config files -- 只有 `.local.md`
- [ ] Config file 是 optional -- 没有它一切也能工作
- [ ] Conditional agents（migrations、frontend、architecture、data）继续 hardcoded 在 review.md 中
- [ ] Component counts 在 plugin.json、marketplace.json 和 README.md 中一致

## 不做的事

- 没有 multi-step wizard（用户直接编辑文件）
- 没有 custom agent discovery（用户把 agent names 加到 YAML list）
- 没有 `conditionalAgents` config（继续由 file pattern hardcoded）
- 没有 `options` object（agentNative、parallelReviews -- 不需要）
- command 中没有 global vs project distinction（只检查两个路径）
- 没有在 commands 间重复 config-loading boilerplate
