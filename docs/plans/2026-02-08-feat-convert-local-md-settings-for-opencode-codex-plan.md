---
title: 为 OpenCode 和 Codex 转换 .local.md Settings
type: feat
date: 2026-02-08
---

# 为 OpenCode 和 Codex 转换 .local.md Settings

## 概览

PR #124 引入 `.claude/compound-engineering.local.md`，这是一个 YAML frontmatter settings file，workflow commands（`review.md`、`work.md`）会在 runtime 读取它，以决定运行哪些 agents。conversion script 已经处理 agents、commands、skills、hooks 和 MCP servers，但**没有**处理 `.local.md` settings files。

问题是：OpenCode 和 Codex 是否能支持同一 pattern？converter 需要做什么？

## Analysis（分析）：`.local.md` 实际做什么

settings file 做两件事：

1. **YAML frontmatter**，包含 structured config：`review_agents: [list]`、`plan_review_agents: [list]`
2. **Markdown body**，包含传给 review agents 作为 context 的 free-text instructions

commands（`review.md`、`work.md`）会在 runtime 使用 Read tool 读取该文件，并使用其中 values 决定 spawn 哪些 Task agents。这是 **prompt-level logic**：它是 command body 中告诉 AI “读取这个文件、解析它、按它行动”的 instructions。

## 关键 insight：这已经能工作

converter 已经将 `review.md` 和 `work.md` command bodies 原样转换（OpenCode）或转换为 generated skills（Codex）。那些写着 "Read `.claude/compound-engineering.local.md`" 的 instructions 只是 command body 中的 markdown text。converter 输出它们时：

- **OpenCode**：command template 包含完整 body。AI 读取它，遵循 instructions，读取 settings file。
- **Codex**：command 变成 prompt + generated skill。skill body 包含 instructions。AI 读取它，遵循 instructions，读取 settings file。

**`.local.md` file 本身不是 plugin component**，而是用户按 project 创建的 runtime artifact（通过 `/compound-engineering-setup`）。converter 不需要 bundle 它。

## 需要注意的事项

### 1. Setup Command 有 `disable-model-invocation: true`

`setup.md` 有 `disable-model-invocation: true`。converter 已经正确处理：

- **OpenCode**（`claude-to-opencode.ts:117`）：跳过带 `disableModelInvocation` 的 commands
- **Codex**（`claude-to-codex.ts:22`）：从 prompts 和 generated skills 中过滤掉它们

这意味着 `/compound-engineering-setup` 在两个 targets 中都不会 auto-invocable。这是正确的，因为它是 deliberate user action。但这也意味着 converted plugin 的用户**无法运行 setup**。他们需要手动创建 `.local.md` file。

### 2. `.local.md` file path 是 Claude-specific

commands 引用 `.claude/compound-engineering.local.md`。在 OpenCode 中，等价 directory 是 `.opencode/`；在 Codex 中是 `.codex/`。converter 目前**不会**重写 command bodies 中的 file paths。

### 3. Config-aware sections 中的 slash command references

commands 会写类似 "Run `/compound-engineering-setup` to create a settings file." 的内容。Codex converter 已经将 `/command-name` 转换为 `/prompts:command-name`，但由于 setup 有 `disable-model-invocation`，没有匹配 prompt。该 reference 会变成 dead link。

### 4. Review Commands 中的 `Task {agent-name}(...)` Syntax

`review.md` 使用 `Task {agent-name}(PR content)`；Codex converter 已经将这些转换为 `$skill-name` references。OpenCode 会将它们作为 template text 透传。

## 解决方案提议

### Phase 1：向 converters 添加 Settings File Path Rewriting（settings 文件路径重写）

两个 converters 都应将 command bodies 中的 `.claude/` paths 重写为 target-appropriate directory。

**File（文件）：** `src/converters/claude-to-opencode.ts`

添加 `transformContentForOpenCode(body)` function，替换：

- `.claude/compound-engineering.local.md` -> `.opencode/compound-engineering.local.md`
- `~/.claude/compound-engineering.local.md` -> `~/.config/opencode/compound-engineering.local.md`

在 `convertCommands()` 中存储为 template 前应用到 command body。

**File（文件）：** `src/converters/claude-to-codex.ts`

扩展 `transformContentForCodex(body)`，也替换：

- `.claude/compound-engineering.local.md` -> `.codex/compound-engineering.local.md`
- `~/.claude/compound-engineering.local.md` -> `~/.codex/compound-engineering.local.md`

### Phase 2：为每个 Target 生成 Setup Equivalent（setup 等价入口）

由于 `setup.md` 被 `disable-model-invocation` 排除，converter 应生成 **target-native setup instruction**，告诉用户如何创建 settings file。

**Option A：仍然 include setup as a non-auto-invocable command**（推荐）

修改 converters，让它们 include `disable-model-invocation` commands，但进行适当标记：

- **OpenCode**：include in command map，但添加 `manual: true` flag 或 comment
- **Codex**：include as a prompt（用户仍可通过 `/prompts:compound-engineering-setup` 手动调用）

这是最简单方式：setup instructions 有用，即使不会 auto-trigger。

**Option B：生成 README/instructions file**

在 output 中创建 `compound-engineering-settings.md` 文件，记录如何为 target platform 创建 settings file。更复杂，也没那么有用。

**Recommendation（建议）：Option A** — 直接停止过滤 `disable-model-invocation` commands。OpenCode 和 Codex 都支持 user-invoked commands/prompts。该 flag 的用途是防止 Claude 在 conversation 中 auto-invoking，不是完全隐藏 command。

### Phase 3：更新 Tests（测试）

**File（文件）：** `tests/converter.test.ts`

- 添加 test，验证 command bodies 中的 `.claude/` paths 被重写为 `.opencode/` paths
- 更新现有 `disable-model-invocation` test，验证 command 被 include（如果采用 Option A）

**File（文件）：** `tests/codex-converter.test.ts`

- 添加 test，验证 `.claude/` paths 被重写为 `.codex/` paths
- 添加 test，验证 setup command 被 include as a prompt（如果采用 Option A）
- 添加 test，验证指向 setup 的 slash command references 被正确保留

### Phase 4：为 Settings-Aware Command 添加 Fixture

**File（文件）：** `tests/fixtures/sample-plugin/commands/settings-aware-command.md`

```markdown
---
name: workflows:review
description: 运行 comprehensive code reviews
---

Read `.claude/compound-engineering.local.md` for agent config.
If not found, use defaults.
Run `/compound-engineering-setup` to create settings.
```

测试 converter 是否正确 rewrite paths 和 command references。

## 验收标准

- [ ] OpenCode converter 在 command bodies 中 rewrite `.claude/` -> `.opencode/`
- [ ] Codex converter 在 command/skill bodies 中 rewrite `.claude/` -> `.codex/`
- [ ] Global path `~/.claude/` rewrite 为 target-appropriate global path
- [ ] `disable-model-invocation` commands 在两个 targets 中都 include（不被 filter）
- [ ] Tests 覆盖两个 targets 的 path rewriting
- [ ] Tests 覆盖 setup command inclusion
- [ ] Existing tests 仍通过

## 不做什么

- 不 bundle `.local.md` file 本身（它是用户按 project 创建的）
- 不转换 YAML frontmatter format（两个 targets 都能读取带 YAML 的 `.md` files）
- 不添加 target-specific setup wizards（command body 中的 instructions 跨所有 targets 可用）
- 不重写 `AskUserQuestion` tool references（三个平台都支持等价 interactive tools）

## 复杂度评估

这是一个**小变更**：主要是在 converters 中做 string replacement，并更新 `disable-model-invocation` filter。`.local.md` pattern 是 prompt-level instructions，不是 proprietary API。它在任何 AI 能读取文件并遵循 instructions 的地方都能工作。
