---
title: "ce-compound-refresh skill redesign：无 live user context 的 autonomous maintenance"
category: skill-design
date: 2026-03-13
module: plugins/compound-engineering/skills/ce-compound-refresh
component: SKILL.md
tags:
  - skill-design
  - compound-refresh
  - maintenance-workflow
  - drift-classification
  - subagent-architecture
  - platform-agnostic
severity: medium
description: "重新设计 ce-compound-refresh，使其能处理 autonomous drift triage、通过 subagents 做 in-skill replacement，以及 smart scoping，而不依赖 ce-compound 期望的 live problem-solving context。"
related:
  - docs/solutions/plugin-versioning-requirements.md
  - https://github.com/EveryInc/compound-engineering-plugin/pull/260
  - https://github.com/EveryInc/compound-engineering-plugin/issues/204
  - https://github.com/EveryInc/compound-engineering-plugin/issues/221
---

## 问题

初始 `ce-compound-refresh` skill 在真实使用测试中暴露了几个设计问题：

1. Interactive questions 从未触发正确 tool（AskUserQuestion），因为 instruction 使用了较弱的 "when available" qualifier
2. Auto-delete criteria 与后续 phase 中的 "always ask before deleting" rule 矛盾
3. Broad scope（9+ docs）要求用户在没有 analysis 的情况下盲选 area
4. Replace flow 尝试 hand off 给 `ce-compound`，但后者期待 fresh problem-solving context；几个月后用户已经没有这种 context
5. Subagents 使用 shell commands 做 file existence checks，触发 permission prompts
6. 无法 unattended 运行 skill（例如按 schedule 运行）；每次运行都需要 user interaction

## 根因

六个独立设计问题，各自有不同 root cause：

1. **带 escape hatch 的 hardcoded tool name。** 说 "Use AskUserQuestion when available" 等于允许模型跳过 tool 并只输出文本；也无法移植到 Codex 和其他 platforms。
2. **跨 phases 的矛盾规则。** Phase 2 定义 auto-delete criteria。Phase 3 又说 "always ask before deleting"，且没有例外。模型遵循了 Phase 3。
3. **Question before evidence。** skill 在收集任何关于哪些 areas 最 stale 或 interconnected 的信息前，就提示用户选择 scope。
4. **Cross-skill handoff 中未满足的 precondition。** `ce-compound` 期待最近刚解决过、context 新鲜的问题。maintenance refresh 拥有的是 investigation evidence：等价数据，不同形态。
5. **subagents 缺少 tool preference guidance。** 没有显式 instruction 时，subagents 默认用 bash 做 file operations。
6. **Interactive-only design。** 每个 phase 都假设用户在场。无法为 scheduled maintenance 或 hands-off sweeps 自主运行。

## 解决方案

### 1. Platform-agnostic interactive questions（平台无关的交互问题）

将 "the platform's interactive question tool" 作为概念引用，并给出具体示例：

```markdown
Ask questions **one at a time** — use the platform's interactive question tool
(e.g. `AskUserQuestion` in Claude Code, `request_user_input` in Codex) and
**stop to wait for the answer** before continuing.
```

"stop to wait" language 移除了 escape hatch。示例帮助每个平台的模型选择正确 tool。

### 2. 为明确场景添加 auto-delete exemption

Phase 3 现在 defer 到 Phase 2 的 auto-delete criteria：

```markdown
You are about to Delete a document **and** the evidence is not unambiguous
(see auto-delete criteria in Phase 2). When auto-delete criteria are met,
proceed without asking.
```

### 3. Broad scope 的 smart triage

发现 9+ candidate docs 时，先 triage 再提问：

1. **Inventory** — 读取 frontmatter，按 module/component/category 分组
2. **Impact clustering** — interconnected learnings + pattern docs 的 dense clusters 比 isolated docs 更 high-impact
3. **Spot-check drift** — 检查 primary referenced files 是否仍存在
4. **Recommend** — 呈现 highest-impact cluster 及 rationale

关键 insight："code changed recently" 不是可靠 staleness signal。High-impact cluster 中 missing references 才是最强 signal。

### 4. Replacement subagents 替代 ce-compound handoff

当识别出 Replace 时，Phase 1 investigation 已经收集了 `ce-compound` 会 research 的 evidence：

- old learning 的 claims
- 当前 code 实际做什么
- drift 在哪里以及为什么发生

replacement subagent 直接使用 `ce-compound` 的 document format（frontmatter、problem、root cause、solution、prevention）写 successor。顺序运行，一次一个，因为每个都可能读取大量 code。

当 evidence 不足时（例如整个 subsystem 已被替换，new architecture 过于复杂，无法仅靠 investigation 理解），标记为 stale，并建议用户下次遇到该 area 后运行 `ce-compound`。

### 5. Dedicated file tools over shell commands（优先专用文件工具而非 shell 命令）

添加到 subagent strategy：

```markdown
Subagents should use dedicated file search and read tools for investigation —
not shell commands. This avoids unnecessary permission prompts and is more
reliable across platforms.
```

### 6. 为 scheduled/unattended runs 添加 headless mode

添加 `mode:headless` argument support，让 skill 可在没有 user interaction 的情况下运行（例如按 schedule、在 CI 中，或当用户只想 hands-off sweep 时）。

关键设计决策：

- **仅显式 opt-in。** arguments 中必须有 `mode:headless`。拒绝基于 tool availability 的 auto-detection，因为没有 question tool 的 interactive agent（例如 Cursor、Windsurf）仍然是 interactive，只是使用 plain-text replies。
- **Conservative confidence。** interactive mode 中会询问用户的 borderline cases，在 headless mode 中标记为 stale。宁可 stale-marking，也不要 incorrect action。
- **Detailed report as deliverable。** 因为没有用户在场，output report 会包含每个 action 的完整 rationale，便于人类事后 review。
- **Process everything。** 不做 scope narrowing questions；如果没有 scope hint，则处理所有 docs。对于 broad scope，按 impact order 处理 clusters，不询问。

## 预防

### Skill review checklist additions（skill review checklist 补充）

任何 skill review 都应检查这六个 patterns：

1. **No hardcoded tool names** — 所有 tool references 都使用 capability-first language，并提供 platform examples 和 plain-text fallback
2. **No contradictory rules across phases** — 追踪每种 action type 在所有 phases 中的规则，验证绝对语言（"always," "never"）没有在其他地方被矛盾
3. **No blind user questions** — 展示给用户的每个问题都由 agent 先收集到的 evidence 支撑
4. **No unsatisfied cross-skill preconditions** — 每个 skill handoff 都验证 target skill 的 preconditions 已由 calling context 满足
5. **No shell commands for file operations in subagents** — Subagent instructions 明确偏好 dedicated tools，而不是 shell commands
6. **Headless mode for long-running skills** — 任何可能 unattended 运行的 skill 都应支持 explicit opt-in mode，并具备 conservative confidence 和 detailed reporting

### Key anti-patterns（关键反模式）

| Anti-pattern（反模式） | Better pattern（更好的模式） |
|---|---|
| "Use the AskUserQuestion tool when available" | "Use the platform's interactive question tool (e.g. AskUserQuestion in Claude Code, request_user_input in Codex)" |
| Defining auto-delete conditions, then "always ask before deleting" | Single-source-of-truth: define the rule once, reference it elsewhere |
| "Which area should we review?" before any investigation | Triage first, recommend with evidence, let user confirm or redirect |
| "Create a successor learning through ce-compound" during a refresh | Replacement subagent writes directly using gathered evidence |
| No tool guidance for subagents | "Use dedicated file search and read tools, not shell commands" |
| Auto-detecting "no question tool = headless" | Explicit `mode:headless` argument — interactive agents without question tools are still interactive |

## Cross-References（交叉引用）

- **PR #260**：包含所有这些 improvements 的 PR
- **Issue #204**：Platform-agnostic tool references（平台无关 tool references；AskUserQuestion dependency）
- **Issue #221**：maintenance at scale 的 motivating issue
- **PR #242**：ce-audit（detection counterpart，closed；检测侧 counterpart，已关闭）
- **PR #150**：建立了 subagent context-isolation pattern
