---
title: "fix: Setup skill 因 AskUserQuestion 依赖在非 Claude LLM 上静默失败"
type: fix
status: active
date: 2026-03-01
---

## 增强摘要

**Deepened on（深化日期）：** 2026-03-01
**Research agents used（使用的 research agents）：** best-practices-researcher, architecture-strategist, code-simplicity-reviewer, scope-explorer

### 关键改进

1. 将 preamble 从 16 行简化到 4 行，移除 platform name list 和 example blockquote（YAGNI）
2. 扩大 scope：`create-new-skill.md` 也使用 `AskUserQuestion`，需要同样 fix
3. 澄清 `codex-agents.ts` 变更只帮助 command/agent contexts，**不会**触达 skill execution（skills 不经过 converter transform）
4. 添加 CLAUDE.md skill compliance policy 作为第三个 deliverable，防止复发
5. 分离两种不同 failure modes：tool-not-found error 与 silent auto-configuration

### 新发现的考虑事项

- 只有 Pi converter 会 transform `AskUserQuestion`（且不完整）；所有其他 converters 都原样透传 skill content，codex-agents.ts fix 与 skill execution 独立
- `add-workflow.md` 和 `audit-skill.md` 已经明确禁止 `AskUserQuestion`，这条未记录 policy 应被正式化
- Prose fallback 是概率性的（LLM compliance）；converter-level transformation 才是正确的长期架构 fix
- brainstorming skill 完全避开 `AskUserQuestion`，并可跨平台工作，这是 gold standard pattern

---

# fix: Setup Skill 的 AskUserQuestion 跨平台 Fallback

## 概览

`setup` skill 在 5 个 decision points 使用 `AskUserQuestion`。在非 Claude platforms（Codex、Gemini、OpenCode、Copilot、Kiro 等）上，该 tool 不存在；LLM 会读取 skill body，但无法调用 tool，导致 silent failure 或未经同意的 auto-configuration。修复方式是在 skill body 中添加最小 fallback instruction，对 `create-new-skill.md` 应用相同变更，并向 CLAUDE.md skill checklist 添加 policy，防止复发。

## 问题陈述

**两种不同 failure modes：**

1. **Tool-not-found error** — LLM 尝试将 `AskUserQuestion` 作为 function 调用；platform 返回 error。Setup 停止。
2. **Silent skip** — LLM 将 `AskUserQuestion` 当作 prose 读取，忽略 decision gate，直接 auto-configures。用户从未被咨询。这更糟，会产生用户从未批准的 `compound-engineering.local.md`。

`plugins/compound-engineering/skills/ce-setup/SKILL.md` 有 5 个 `AskUserQuestion` blocks：

| Line | Decision Point |
|------|----------------|
| 13 | Check existing config: Reconfigure / View / Cancel |
| 44 | Stack detection: Auto-configure / Customize |
| 67 | Stack override (multi-option) |
| 85 | Focus areas (multiSelect) |
| 104 | Review depth: Thorough / Fast / Comprehensive |

`plugins/compound-engineering/skills/create-agent-skills/workflows/create-new-skill.md` lines 22 和 45 也使用 `AskUserQuestion`。

只有 Pi converter 会 transform 该 reference（且不完整）。所有其他 converters（Codex、Gemini、Copilot、Kiro、Droid、Windsurf）都原样透传 skill content：**skills are not converter-transformed**。

## 解决方案提议

三个 deliverables，各自处理不同层级：

### 1. 向 `setup/SKILL.md` 添加 4 行 "Interaction Method" preamble

紧接 `# Compound Engineering Setup` heading 后插入：

```markdown
## Interaction Method

If `AskUserQuestion` is available, use it for all prompts below.

If not, present each question as a numbered list and wait for a reply before proceeding to the next step. For multiSelect questions, accept comma-separated numbers (e.g. `1, 3`). Never skip or auto-configure.
```

**为什么是 4 行，而不是 16 行：** LLMs 知道 numbered list 是什么，不需要 example blockquote。分支条件是 tool availability，而不是 platform identity，因此不需要 platform name list（YAGNI：新 platforms 会增加，列表会过期）。在这里声明一次 "never skip" rule，不要在 `codex-agents.ts` 中重复。

**为什么有效：** 在所有 platforms 上调用 `/ce-setup` 时，LLM 都会读取 skill body。agent 会遵循 prose instructions，不管 tool availability 如何。这与 `brainstorming/SKILL.md` 使用的 pattern 相同：它完全避开 `AskUserQuestion`，使用 inline numbered lists，是 gold standard cross-platform approach。

### 2. 对 `create-new-skill.md` 应用相同 preamble

`plugins/compound-engineering/skills/create-agent-skills/workflows/create-new-skill.md` 在 lines 22 和 45 使用 `AskUserQuestion`。在该文件顶部应用相同 preamble。

### 3. 强化 `codex-agents.ts` AskUserQuestion mapping

该变更**不会**修复 skill execution（skills 会绕过 converter pipeline）。它改进 Codex command/agent contexts 的 AGENTS.md guidance。

替换（`src/utils/codex-agents.ts` line 21）：

```
- AskUserQuestion/Question: ask the user in chat
```

为：

```
- AskUserQuestion/Question: present choices as a numbered list in chat and wait for a reply number. For multi-select (multiSelect: true), accept comma-separated numbers. Never skip or auto-configure — always wait for the user's response before proceeding.
```

### 4. 向 CLAUDE.md skill compliance checklist 添加 lint rule

添加到 `plugins/compound-engineering/CLAUDE.md` 的 "Skill Compliance Checklist"：

```
### AskUserQuestion Usage

- [ ] If the skill uses `AskUserQuestion`, it must include an "Interaction Method" preamble explaining the numbered-list fallback for non-Claude environments
- [ ] Prefer avoiding `AskUserQuestion` entirely (see brainstorming/SKILL.md pattern) for skills intended to run cross-platform
```

## 技术考虑

- `setup/SKILL.md` 有 `disable-model-invocation: true`，它只控制 session-startup context loading，不控制 invocation time 的 skill-body execution
- prose fallback 是概率性的（LLM compliance），不是 build-time guarantee。正确长期架构 fix 是 converter-level transformation of skill content（每个 converter 中的 `transformSkillContent()` pass），但这不在本次 scope 内
- 使用 `AskUserQuestion` 的 Commands（`ce/brainstorm.md`、`ce/plan.md`、`test-browser.md` 等）存在同样 gap，但不在 scope 内，并明确记录为 future task

## 验收标准

- [ ] `setup/SKILL.md` 在 opening heading 后有 4 行 "Interaction Method" preamble
- [ ] `create-new-skill.md` 有相同 preamble
- [ ] skills 仍以 `AskUserQuestion` 为 primary，不改变 Claude Code behavior
- [ ] `codex-agents.ts` AskUserQuestion 行已更新为 structured guidance
- [ ] `plugins/compound-engineering/CLAUDE.md` skill checklist 包含 AskUserQuestion policy
- [ ] No regression：在 Claude Code 上，setup 与之前完全一样工作

## 文件

- `plugins/compound-engineering/skills/ce-setup/SKILL.md` — 在 line 8 后添加 4 行 preamble
- `plugins/compound-engineering/skills/create-agent-skills/workflows/create-new-skill.md` — 在顶部添加相同 preamble
- `src/utils/codex-agents.ts` — 强化 AskUserQuestion mapping（line 21）
- `plugins/compound-engineering/CLAUDE.md` — 向 skill compliance checklist 添加 AskUserQuestion policy

## Future Work（范围外）

- 面向所有 targets 的 converter-level `transformSkillContent()`，用 build-time guarantee 替代 prose fallback
- 使用 `AskUserQuestion` 的 Commands（`ce/brainstorm.md`、`ce/plan.md`、`test-browser.md`）存在同样 failure mode，需要单独 fix

## Sources & References（来源与参考）

- Issue: [#204](https://github.com/EveryInc/compound-engineering-plugin/issues/204)
- `plugins/compound-engineering/skills/ce-setup/SKILL.md`
- `plugins/compound-engineering/skills/create-agent-skills/workflows/create-new-skill.md:22,45`
- `src/utils/codex-agents.ts:21`
- `src/converters/claude-to-pi.ts:106` — Pi converter (reference pattern)
- `plugins/compound-engineering/skills/brainstorming/SKILL.md` — gold standard cross-platform skill (no AskUserQuestion)
- `plugins/compound-engineering/skills/create-agent-skills/workflows/add-workflow.md:12,37` — existing "DO NOT use AskUserQuestion" policy
- `docs/solutions/adding-converter-target-providers.md`
