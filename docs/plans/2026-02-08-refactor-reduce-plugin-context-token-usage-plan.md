---
title: 减少 compound-engineering plugin context token usage
type: refactor
date: 2026-02-08
---

# 降低 compound-engineering Plugin Context Token Usage

## 概览

compound-engineering plugin **超出默认 context budget 约 3x**，导致 Claude Code 静默 drop components。plugin 在 always-loaded descriptions 中消耗约 50,500 characters，而默认 budget 是 16,000 characters（context window 的 2%）。这意味着 Claude 在 session 中实际上不知道某些 agents/skills 存在。

## 问题陈述

### Context Loading 的工作方式

Claude Code 对 plugin content 使用 progressive disclosure：

| Level | 加载内容 | 何时加载 |
|-------|-----------|------|
| **Always in context** | skills、commands 和 agents 的 `description` frontmatter | Session startup（除非 `disable-model-invocation: true`） |
| **On invocation** | 完整 SKILL.md / command body / agent body | Triggered 时 |
| **On demand** | skill directories 中的 reference files | Claude 读取时 |

所有 descriptions 加总的 budget 是 **context window 的 2%**（fallback 约 16,000 chars）。超过时，components 会被 **silently excluded**。

### 当前状态：Budget 的 316%

| Component | Count | Always-Loaded Chars | 16K Budget 占比 |
|-----------|------:|--------------------:|----------------:|
| Agent descriptions | 29 | ~41,400 | 259% |
| Skill descriptions | 16 | ~5,450 | 34% |
| Command descriptions | 24 | ~3,700 | 23% |
| **Total** | **69** | **~50,500** | **316%** |

### 根因：Agent Descriptions 过大

Agent `description` fields 包含完整 `<example>` blocks 与 user/assistant dialog。这些 examples 属于 agent body（system prompt），而不是 description。description 的唯一工作是 **discovery** -- 帮助 Claude 决定是否 delegate。

问题示例：

- `design-iterator.md`: description 中 2,488 chars（应约 200）
- `spec-flow-analyzer.md`: description 中 2,289 chars
- `security-sentinel.md`: description 中 1,986 chars
- `kieran-rails-reviewer.md`: description 中 1,822 chars
- 平均 agent description：约 1,400 chars（应为 100-250）

与 Anthropic official examples 的 100-200 chars 对比：

```yaml
# Official (140 chars)
description: 专家级 code review specialist。主动 review code 的 quality、security 和 maintainability。写入或修改 code 后立即使用。

# Current plugin (1,822 chars)
description: "Use this agent when you need to review Rails code changes with an extremely high quality bar...\n\nExamples:\n- <example>\n  Context: The user has just implemented..."
```

### 次要原因：Manual Commands 没有 `disable-model-invocation`

没有任何 command 设置 `disable-model-invocation: true`。`/deploy-docs`、`/lfg`、`/slfg`、`/triage`、`/feature-video`、`/test-browser`、`/xcode-test` 等 commands 是带 side effects 的 manual workflows。它们的 descriptions 不必要地消耗 budget。

official docs 明确说明：
> Use `disable-model-invocation: true` for workflows with side effects: `/deploy`, `/commit`, `/triage-prs`. You don't want Claude deciding to deploy because your code looks ready.
> 中文含义：对带 side effects 的 workflows（如 `/deploy`、`/commit`、`/triage-prs`）使用 `disable-model-invocation: true`；不要让 Claude 仅因为代码看起来 ready 就决定 deploy。

---

## 建议方案

三个 changes，按 impact 排序：

### Phase 1：精简 Agent Descriptions（节省约 35,600 chars）

对全部 29 agents：将 `<example>` blocks 从 `description` field 移入 agent body markdown。Descriptions 保持 1-2 句（100-250 chars）。

**Before（之前）**（agent frontmatter）：
```yaml
---
name: kieran-rails-reviewer
description: "Use this agent when you need to review Rails code changes with an extremely high quality bar. This agent should be invoked after implementing features, modifying existing code, or creating new Rails components. The agent applies Kieran's strict Rails conventions and taste preferences to ensure code meets exceptional standards.\n\nExamples:\n- <example>\n  Context: The user has just implemented a new controller action with turbo streams.\n  user: \"I've added a new update action to the posts controller\"\n  ..."
---

Detailed system prompt...
```

**After（之后）**（agent frontmatter）：
```yaml
---
name: kieran-rails-reviewer
description: 使用 Kieran 的严格 conventions review Rails code。在实现 features、修改 code 或创建 new Rails components 后使用。
---

<examples>
<example>
Context: The user has just implemented a new controller action with turbo streams.
user: "I've added a new update action to the posts controller"
...
</example>
</examples>

Detailed system prompt...
```

examples 移入 body（只有 agent 实际 invoked 时才加载）。

**Impact（影响）:** ~41,400 chars → ~5,800 chars（86% reduction）

### Phase 2：给 Manual Commands 添加 `disable-model-invocation: true`（节省约 3,100 chars）

只应由用户显式调用的 commands：

| Command | Reason（原因） |
|---------|--------|
| `/deploy-docs` | Side effect: deploys |
| `/release-docs` | Side effect: regenerates docs |
| `/changelog` | Side effect: generates changelog |
| `/lfg` | Side effect: autonomous workflow |
| `/slfg` | Side effect: swarm workflow |
| `/triage` | Side effect: categorizes findings |
| `/resolve_parallel` | Side effect: resolves TODOs |
| `/resolve_todo_parallel` | Side effect: resolves todos |
| `/resolve_pr_parallel` | Side effect: resolves PR comments |
| `/feature-video` | Side effect: records video |
| `/test-browser` | Side effect: runs browser tests |
| `/xcode-test` | Side effect: builds/tests iOS |
| `/reproduce-bug` | Side effect: runs reproduction |
| `/report-bug` | Side effect: creates bug report |
| `/agent-native-audit` | Side effect: runs audit |
| `/heal-skill` | Side effect: modifies skill files |
| `/generate_command` | Side effect: creates files |
| `/create-agent-skill` | Side effect: creates files |

这些保持 **without** the flag（Claude 应该知道它们）：
- `/workflows:plan` -- Claude 可能建议 planning
- `/workflows:work` -- Claude 可能建议 starting work
- `/workflows:review` -- Claude 可能建议 review
- `/workflows:brainstorm` -- Claude 可能建议 brainstorming
- `/workflows:compound` -- Claude 可能建议 documenting
- `/deepen-plan` -- Claude 可能建议 deepening a plan

**Impact（影响）:** context 中 command descriptions 从 ~3,700 chars 降到 ~600 chars

### Phase 3：给 Manual Skills 添加 `disable-model-invocation: true`（节省约 1,000 chars）

属于 manual workflows 的 skills：

| Skill | Reason（原因） |
|-------|--------|
| `skill-creator` | Only invoked manually |
| `orchestrating-swarms` | Only invoked manually |
| `git-worktree` | Only invoked manually |
| `resolve-pr-parallel` | Side effect |
| `compound-docs` | Only invoked manually |
| `file-todos` | Only invoked manually |

保持 without the flag（Claude 应 auto-invoke）：
- `dhh-rails-style` -- Claude 写 Rails code 时应使用
- `frontend-design` -- Claude 构建 UI 时应使用
- `brainstorming` -- Claude 应在 implementation 前建议
- `agent-browser` -- Claude 应用于 browser tasks
- `gemini-imagegen` -- Claude 应用于 image generation
- `create-agent-skills` -- Claude 创建 skills 时应使用
- `every-style-editor` -- Claude 应用于 editing
- `dspy-ruby` -- Claude 应用于 DSPy.rb
- `agent-native-architecture` -- Claude 应用于 agent-native design
- `andrew-kane-gem-writer` -- Claude 应用于 gem writing
- `rclone` -- Claude 应用于 cloud uploads
- `document-review` -- Claude 应用于 doc review

**Impact:** context 中 skill descriptions 从 ~5,450 chars 降到 ~4,000 chars

---

## 预期结果

| Component | Before（chars） | After（chars） | Reduction |
|-----------|---------------:|-------------:|-----------:|
| Agent descriptions | ~41,400 | ~5,800 | -86% |
| Command descriptions | ~3,700 | ~600 | -84% |
| Skill descriptions | ~5,450 | ~4,000 | -27% |
| **Total** | **~50,500** | **~10,400** | **-79%** |
| **% of 16K budget** | **316%** | **65%** | -- |

从 budget 的 316%（components silently dropped）降到 65%（仍有 growth room）。

---

## 验收标准

- [x] 所有 29 个 agent description fields 低于 250 characters
- [x] 所有 `<example>` blocks 已从 description 移到 agent body
- [x] 18 个 manual commands 有 `disable-model-invocation: true`
- [x] 6 个 manual skills 有 `disable-model-invocation: true`
- [x] Total always-loaded description content 低于 16,000 characters
- [ ] 运行 `/context` 验证没有 "excluded skills" warnings
- [x] 所有 agents 仍正常工作（examples 在 body 中，没有丢失）
- [x] 所有 commands 仍可通过 `/command-name` invoke
- [x] 更新 plugin.json 和 marketplace.json 中的 plugin version
- [x] 更新 CHANGELOG.md

## 实现说明

- Agent examples 应在 body 中使用 `<examples><example>...</example></examples>` tags -- Claude 原生理解这些
- Description format："[What it does]. Use [when/trigger condition]." -- 最多两句
- `lint` agent 的 115 words 说明 compact agents 效果很好
- 变更后用 `claude --plugin-dir ./plugins/compound-engineering` 测试
- `SLASH_COMMAND_TOOL_CHAR_BUDGET` env var 可覆盖默认 budget 以便测试

## 参考资料

- [Skills docs](https://code.claude.com/docs/en/skills) -- "Skill descriptions are loaded into context... If you have many skills, they may exceed the character budget"（skill descriptions 会进入 context）
- [Subagents docs](https://code.claude.com/docs/en/sub-agents) -- description field used for automatic delegation（description field 用于 automatic delegation）
- [Skills troubleshooting](https://code.claude.com/docs/en/skills#claude-doesnt-see-all-my-skills) -- "The budget scales dynamically at 2% of the context window, with a fallback of 16,000 characters"（budget 会随 context window 动态调整）
