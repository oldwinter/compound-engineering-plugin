---
title: Interactive menus 的 always-on routing 应 inline 放在 SKILL.md，而不是 references
date: 2026-04-28
category: skill-design
module: compound-engineering
problem_type: architecture_pattern
component: ce-plan
severity: medium
applies_when:
  - Authoring a skill that ends in an `AskUserQuestion`-style menu where the user picks the next action
  - Deciding whether per-option routing belongs in SKILL.md or in a reference file
  - Reviewing a skill where the agent renders a menu and stops at the user's selection without acting
tags:
  - skill-design
  - menu-routing
  - skill-md-vs-references
  - ce-plan
  - extraction-rule
  - load-bearing-rules
related_issue: https://github.com/EveryInc/compound-engineering-plugin/issues/714
---

## Problem（问题）

`ce-plan` Phase 5.4 展示了四选项 post-generation menu（`Start /ce-work`、`Create Issue`、`Open in Proof`、`Done for now`）。当用户选择某个选项时应触发的 action 只存在于 `references/plan-handoff.md`。skill body 写着 "Routing each selection ... lives in `references/plan-handoff.md` — follow it for every branch"，并在 5.3.8 中有一条 "Load `references/plan-handoff.md` now" instruction。

实践中，agents 会渲染 menu，捕获用户 selection，然后停止，而不触发 routed action。用户选择 "Start `/ce-work` (Recommended)" 后，看到 agent 只用 prose acknowledge 这个选择（"User picked Start /ce-work. Handing off — invoke `/ce-work` next"），而不是 programmatically invoking `ce-work`。

## Root Cause（根因）

两个 failure modes 叠加：

1. **agent 没有加载 reference。** SKILL.md content 在 session start 时 cache；references 按需加载。一个 agent 在走向 menu 的途中越过 "Load `references/plan-handoff.md` now" instruction 后，如果没有加载 reference，就没有 per-option routing 在 loaded context 中。menu 变成一个没有 associated action 的 textual handoff。
2. **即使加载了 reference，语言也有歧义。** reference 写着 `**Start /ce-work** -> Call /ce-work with the plan path`。这没有命名平台的 skill-invocation primitive。"Call /ce-work" 可以被理解为“告诉用户在 chat 里输入 /ce-work”，而不是“现在触发 Skill tool”。

plugin 自己的 `plugins/compound-engineering/AGENTS.md` 中 “Conditional and Late-Sequence Extraction” section 给出了 extraction guidance：extract 的 content 应该是 *conditional or late-sequence and represents ~20%+ of the skill*。裸 per-option routing 是 late-sequence（只在 Phase 5 后触发），但**不是 conditional**——option 1 永远意味着 “invoke ce-work”，option 4 永远意味着 “end the turn”。这个 always-on subset 不应该被抽取出去。

同一个 AGENTS.md 在 “Skill Design Principles” 中已经阐明底层规则：*"For load-bearing rules (those that MUST fire reliably), put strong language at the top of the relevant phase in SKILL.md, not just in the reference. References can be skipped; SKILL.md is always loaded."* post-menu routing 满足 load-bearing definition。没有应用这个原则就是 authoring mistake。

## Fix（修复）

1. 在 SKILL.md Phase 5.4 中 inline 一个 `### Routing` block，每个 menu option 对应一个 explicit action。使用 platform-explicit invocation language："Invoke the `ce-work` skill via the platform's skill-invocation primitive (`Skill` in Claude Code, `Skill` in Codex, the equivalent on Gemini/Pi), passing the plan path as the skill argument. Do not merely tell the user to type `/ce-work` — fire the invocation now so the plan executes in this session."
2. 在 `references/plan-handoff.md` 中 mirror 同样 platform-explicit phrasing，让两个 surfaces converge。reference 仍负责 elaborate sub-flows（Proof HITL state machine、Issue Creation tracker detection、post-HITL `ce-doc-review` resync、upload-failure fallback）——这些才是真正 conditional 且 multi-step 的内容。
3. 添加 regression test（`tests/skills/ce-plan-handoff-routing.test.ts`），如果四条 inline routing lines 中任何一条消失则 fail，并特别 assert `Start /ce-work` routing 命名了 skill-invocation primitive 和 plan path。

## 未来 Skills 的 Authoring Checklist

在把 block 抽取到 reference file 之前，先问：

- **当进入这个 phase 时，该 block 是否总会执行？** 如果是，倾向 inline。References 用于 agent 只在某些时候进入的 branches。
- **该 block 是否承载 skill 自己渲染的 interactive menu routing？** 如果是，裸 per-option action 应 inline。每个 option 的 elaborate sub-flow（multi-status state machines、retry logic、downstream skill dispatch）可以留在 reference。
- **如果 agent 跳过 reference，还能正确完成 skill 吗？** 如果不能——没有 reference 时 agent 会停止或猜测——缺失内容就是 load-bearing，属于 inline。
- **语言是否 platform-explicit？** 当 routing line 写 “Call /ce-work” 时，问问 agent 是否可能把它理解成“告诉用户”，而不是“触发 tool”。命名 platform primitive（Skill tool、skill-invocation primitive）和 argument shape（plan path、file path）。

## Related Patterns（相关模式）

- `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md` — 同一类问题：渲染 decision points 的 skills，需要在 loaded context 中拥有 deterministic state transitions，而不是隔着一次 reference-load。
- `docs/solutions/skill-design/confidence-anchored-scoring.md` — load-bearing scoring rubrics 也应 inline 在 SKILL.md 中，确保跨 sessions 稳定触发。
