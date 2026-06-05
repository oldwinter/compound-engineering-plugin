---
date: 2026-03-26
topic: merge-deepen-into-plan
---

# 将 Deepen-Plan 合并进 ce:plan

## 问题框架

`ce:plan` 和 deepen-plan skills 形成了一个顺序 workflow：用户会被询问一个选择（“want to deepen?”），但这个判断用户并不比 agent 更会做。当 deepen-plan 运行时，它已经会评估 deepening 是否值得，并据此自我 gate。用户 decision 增加了摩擦，却没有增加价值。

以当前 model capabilities 来看，早先关于 planning 过度投入的担忧已经不再是 meaningful risk——deepening skill 已经会基于 scope 和 confidence scoring 自我 gate。

## 需求

- R1. ce:plan 在 initial plan 写完后，自动评估并 deepen 自己的 output，不再询问用户 approval。
- R2. 当 deepening 运行时，ce:plan 报告它正在 strengthen 哪些 sections 以及原因（透明，但不要求 decision）。
- R3. 对 Lightweight plans，除非检测到 high-risk topics，否则跳过 deepening（保留 deepen-plan 现有 gate logic）。
- R4. 对 Standard 和 Deep plans，ce:plan 使用 deepen-plan 的 checklist-first、risk-weighted scoring 对 confidence gaps 打分。如果没有 gaps 超过 threshold，报告 "confidence check passed" 并继续。
- R5. 发现 gaps 时，ce:plan dispatch targeted research agents（deepen-plan 的 deterministic agent mapping），只 strengthen weak sections。
- R6. 删除 deepen-plan skill 作为 standalone command。对 existing plan 的 re-deepening 通过在 resume mode 下重新运行 ce:plan 处理。在 resume mode 中，ce:plan 应用与 fresh plan 相同的 confidence-gap evaluation——只有 gaps warrant it 时才 deepen，除非用户显式请求 deepening。
- R7. 移除 ce:plan 中的 "Run deepen-plan" post-generation option。Post-generation options 变得更简单。

## 成功标准

- ce:plan 产出的 plans 至少与旧的 ce:plan + manual deepen-plan flow 一样强
- 用户无需决定是否 deepen——由 agent 处理
- 用户能看到哪些内容正在被 strengthened（不是 black box）
- 少一个需要知道的 skill，workflow 更简单
- 任何 scope tier（Lightweight、Standard、Deep）下 plan quality 都没有 regression

## 范围边界

- 不改变 deepening 做什么——只改变它位于哪里，以及由谁决定运行
- 不改变 deepening logic 本身（confidence scoring、agent selection、section rewriting）
- 不改变 ce:brainstorm 或 ce:work
- 保留 planning boundary（no code、no commands）
- deepen-plan scratch space（`.context/compound-engineering/deepen-plan/`）移动到 ce:plan namespace 下

## 关键决策

- **Agent decides, user informed**：agent 评估 deepening 是否增加价值，并自动继续。用户看到关于正在 strengthen 什么的简短 status message，但不 approve。原因：用户无法比 agent 更好地评估这个问题，而 existing gate logic 已经能防止 wasteful deepening。
- **No standalone deepen command**：existing plans 的 re-deepening 通过 ce:plan resume mode 处理。原因：mental model 更简单，所有 planning work 使用一个 entry point。
- **Absorb, don't invoke**：deepening logic 被折叠进 ce:plan，作为 new phase，而不是 ce:plan 把 deepen-plan 当成 sub-skill 调用。原因：消除 skill boundary，并简化 maintenance。

## 待决问题

### 延后到 Planning

- [Affects R1][Technical] confidence check 和 deepening phase 应准确落在 ce:plan phase structure 的哪里——作为当前 post-generation options 之前的新 Phase 5，还是集成进 Phase 4（plan writing）？
- [Affects R6][Technical] ce:plan resume mode 应如何区分 “resume an incomplete plan” 和 “re-deepen a completed plan”？可能基于 frontmatter（是否存在 `deepened: YYYY-MM-DD`）。
- [Affects R5][Technical] deepen-plan 的 artifact-backed research mode（用于 larger scope）应使用 `.context/compound-engineering/ce-plan/deepen/` 还是 per-run subdirectory？

## 下一步

-> /ce:plan 进行 structured implementation planning
