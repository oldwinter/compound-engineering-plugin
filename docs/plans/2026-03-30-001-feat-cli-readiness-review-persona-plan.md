---
title: "feat: 为 ce:review 添加 CLI agent-readiness 条件 persona"
type: feat
status: active
date: 2026-03-30
origin: docs/brainstorms/2026-03-30-cli-readiness-review-persona-requirements.md
---

# 为 ce:review 添加 CLI Agent-Readiness 条件 Persona

## 概览

创建一个轻量 review persona，在 ce:review 期间评估 CLI code 的 agent readiness。该 persona 将 standalone `cli-agent-readiness-reviewer` agent 的 7 条 principles 提炼为紧凑的、面向 diff 的 reviewer，并输出 structured JSON findings -- 与其他所有 conditional persona（security-reviewer、performance-reviewer 等）的模式一致。

## 问题框架

`cli-agent-readiness-reviewer` agent 已存在，但只有在有人知道要调用它时才会运行。通过 ce:review 的 CLI code 得不到 agent-readiness feedback。新增 conditional persona 可让此检查自动发生。（see origin: docs/brainstorms/2026-03-30-cli-readiness-review-persona-requirements.md）

## 需求追踪

- R1. 由 orchestrator 基于 diff analysis 进行 conditional selection
- R2. 在 CLI command definitions、argument parsing、CLI framework usage 上激活
- R3. 与 agent-native-reviewer scope 不重叠
- R4. Self-scoping：从 diff 中进行 framework detection 与 command identification
- R5. 输出标准 JSON findings schema
- R6. Severity mapping：Blocker->P1，Friction->P2，Optimization->P3（绝不 P0 -- CLI readiness issues 不会 crash 或 corrupt）
- R7. Autofix class：`manual` 或 `advisory`，owner 为 `human`
- R8. 在 suggested_fix 中给出 framework-idiomatic recommendations
- R9. 新 persona agent file + persona catalog entry
- R10. Standalone agent 不变

## 范围边界

- 不修改 standalone `cli-agent-readiness-reviewer` agent
- 不给 ce:brainstorm 或 ce:plan 添加 CLI awareness
- 不为 CLI readiness findings 引入 autofix

## 背景与调研

### 相关代码和模式

- Persona agent pattern：`plugins/compound-engineering/agents/review/ce-security-reviewer.agent.md`（3.4 KB）、`performance-reviewer.md`（3.0 KB）-- 要遵循的精确结构
- Persona catalog：`plugins/compound-engineering/skills/ce-review/references/persona-catalog.md` -- cross-cutting conditional section（横切 conditional section）
- Subagent template：`plugins/compound-engineering/skills/ce-review/references/subagent-template.md` -- 提供 output schema、scope rules、PR context（persona 不需要包含这些）
- Standalone agent：`plugins/compound-engineering/agents/review/ce-cli-agent-readiness-reviewer.agent.md`（24.3 KB）-- 要提炼的 7 条 principles 来源
- Agent-native-reviewer：`plugins/compound-engineering/agents/review/ce-agent-native-reviewer.agent.md` -- non-overlapping domain reference（非重叠 domain reference）

### 组织内 learnings

- Conditional personas 大小通常为 3.0-5.7 KB，并采用固定结构：frontmatter、identity paragraph、hunting patterns、confidence calibration、suppress list、output format
- subagent template 注入 findings schema、scope rules 和 PR context -- persona file 只需要 domain-specific content
- Activation 是 orchestrator judgment（不是 keyword matching）-- catalog 描述 conceptual domain

## 关键技术决策

- **提炼，不复刻**：7 条 principles 变成约 8 个 hunting pattern bullets。persona 中不放 Framework Idioms Reference -- model 根据检测到的 frameworks 用 general knowledge 生成具体的 `suggested_fix`。保持 persona 小于 5 KB。（see origin: Key Decisions -- "New persona agent file"）
- **覆盖全部 7 条 principles，按 command type 加权**：每次 dispatch 都评估所有 principles，但加入精简的 command-type priority table，使 persona 适当加权 findings（例如 structured output 对 read/query commands 最重要，idempotency 对 mutating commands 最重要）。限制约 5-7 条 findings，避免泛滥。（解决 origin 中 deferred question）
- **Severity 上限是 P1**：CLI readiness issues 不到 P0。Blocker->P1，Friction->P2，Optimization->P3。（see origin: Key Decisions）
- **无 autofix**：所有 findings 使用 `manual` 或 `advisory` autofix_class，owner 为 `human`。CLI readiness findings 需要 design judgment。（see origin: Key Decisions）
- **Framework detection 作为行为 instruction**：不嵌入 framework-specific patterns，而是指示 persona “detect the CLI framework from imports in the diff and provide framework-idiomatic recommendations in suggested_fix”。这在满足 R8 的同时保持文件较小。

## 开放问题

### 规划期间已解决

- **从 standalone agent 取多少内容？** 将 7 条 principles 提炼为 hunting pattern bullets（每条约 1 句）。包含精简 command-type priority table。不放 Framework Idioms Reference、step-by-step methodology 或 examples section。目标约 4 KB。
- **覆盖全部 principles 还是 prioritize？** 全部覆盖，并按 command type 加权。persona 从 diff 中检测 command types，并调整哪些 principles 最值得关注。每次 review 限制 5-7 条 findings。

### 延后到实现阶段

- hunting pattern bullets 的精确措辞 -- 编写 agent file 时，使用 standalone agent 的 principle descriptions 作为 source material 进一步打磨

## 实现单元

- [ ] **Unit 1：创建 persona agent file**

**目标：** 在 review agents directory 中创建 `cli-readiness-reviewer.md`，遵循 existing conditional personas 的精确结构。

**需求：** R4, R5, R6, R7, R8

**依赖：** None

**文件：**
- 创建: `plugins/compound-engineering/agents/review/ce-cli-readiness-reviewer.agent.md`

**做法：**
- 遵循 `security-reviewer.md` 与 `performance-reviewer.md` 的精确结构：frontmatter、identity paragraph、hunting patterns、confidence calibration、suppress list、output format
- Frontmatter：`name: cli-readiness-reviewer`，description 使用标准 conditional persona format，`model: inherit`，`tools: Read, Grep, Glob, Bash`，`color: blue`
- Identity paragraph：建立 persona 的 lens -- 评估 CLI code 服务 autonomous agents 的程度，而不只是 human users
- "What you're hunting for" section：将 7 条 principles 提炼为约 8 个 bullets。每个 bullet 说明 issue pattern 以及它为何影响 agents。包含一个精简 command-type priority note
- "Confidence calibration"：high（0.80+）用于 diff 中直接可见的问题（缺失 --json flag、prompt without bypass）；moderate（0.60-0.79）用于依赖 diff 外上下文的问题（其他 commands 是否已有 structured output）；low（<0.60）则 suppress
- "What you don't flag"：agent-native parity concerns（这是 agent-native-reviewer 的 domain）、non-CLI code、framework choice itself、test files、documentation-only changes
- "Output format"：标准 JSON template，severity capped at P1，autofix_class 限制为 `manual`/`advisory`，owner 始终为 `human`
- 包含 severity mapping guidance：Blocker->P1，Friction->P2，Optimization->P3
- 包含 framework detection instruction："Detect the CLI framework from imports in the diff. Reference framework-idiomatic patterns in suggested_fix (e.g., Click decorators, Cobra persistent flags, clap derive macros)."

**遵循的模式：**
- `plugins/compound-engineering/agents/review/ce-security-reviewer.agent.md` -- structure、sections、size
- `plugins/compound-engineering/agents/review/ce-performance-reviewer.agent.md` -- structure、brevity
- `plugins/compound-engineering/agents/review/ce-cli-agent-readiness-reviewer.agent.md` -- 要提炼的 7 条 principles 来源（Principles 1-7, lines 94-252）

**测试场景：**
- 成功路径：persona file parses valid YAML frontmatter（persona file 可解析为 valid YAML frontmatter），含所有 required fields（name、description、model、tools、color）
- 成功路径：persona content follows the 6-section structure（persona content 遵循 6-section structure：identity、hunting patterns、calibration、suppress、output format）
- 边界情况：persona file size 在 existing personas 的 3-5.7 KB range 内（不因 framework reference material 而 bloated）

**验证：**
- File exists at the expected path with valid frontmatter（文件位于预期路径且 frontmatter 有效）
- File follows the exact 6-section structure of existing conditional personas（文件遵循现有 conditional personas 的精确 6-section structure）
- File size is under 6 KB（文件小于 6 KB）
- All 7 CLI readiness principles are represented in hunting patterns（7 条 CLI readiness principles 都体现在 hunting patterns 中）
- Severity guidance caps at P1（severity guidance 上限为 P1）
- Autofix class restricted to manual/advisory（autofix class 限制为 manual/advisory）
- No Framework Idioms Reference reproduced from the standalone agent（不从 standalone agent 复制 Framework Idioms Reference）

---

- [ ] **Unit 2：将 persona 加入 catalog**

**目标：** 在 ce:review persona catalog 中注册新 persona，使 orchestrator 知道何时 dispatch 它。

**需求：** R1, R2, R3, R9

**依赖：** Unit 1

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-review/references/persona-catalog.md`
- 修改: `plugins/compound-engineering/README.md`

**做法：**
- 在 cross-cutting conditional personas table 中添加一行
- Persona name（persona 名称）：`cli-readiness`
- Agent reference（agent 引用）：`compound-engineering:review:cli-readiness-reviewer`
- Activation（激活条件）："CLI command definitions, argument parsing, CLI framework usage, command handler implementations"
- 使用与其他 conditional personas 一致的 domain description style（不是 framework names）
- 放在 existing conditional personas 后、stack-specific section 前
- 将 persona catalog section header 从 "Conditional (7 personas)" 更新为 "Conditional (8 personas)"
- 在 persona-catalog.md header 和 ce-review SKILL.md 中将 total persona count 从 16 更新为 17
- 将 cli-readiness-reviewer 加入 `plugins/compound-engineering/README.md` 的 Review agents table，并验证 agent count

**遵循的模式：**
- `persona-catalog.md` 中 existing conditional persona entries（security、performance、api-contract 等）

**测试场景：**
- 成功路径：`bun test` passes（无 frontmatter 或 parsing regressions）
- 成功路径：catalog entry follows the same column format as other conditional personas
- 边界情况：activation description 使用 domain language，而不是 specific framework names

**验证：**
- catalog 中 cross-cutting conditional section 有 cli-readiness 新行
- agent reference 使用 fully-qualified namespace
- activation description 是 domain-level，不是 keyword-level

## 系统级影响

- **Interaction graph:** ce:review 的 orchestrator 读取 diff，决定 dispatch cli-readiness-reviewer 与其他 conditional personas。Findings 通过标准 merge/dedup pipeline（Stage 5）流入 review report
- **API surface parity:** agent-native-reviewer 覆盖 UI/agent parity；cli-readiness-reviewer 覆盖 CLI agent-friendliness。两者可在同一 diff 上激活 -- findings 互补，并由 ce:review 现有 dedup fingerprinting 处理
- **Unchanged invariants:** Standalone `cli-agent-readiness-reviewer` agent 不变。Direct invocations 继续与之前完全相同

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| Persona 太大，因为 principles 没有足够提炼 | 目标 4 KB，以 security-reviewer 作为 size benchmark。若超过 6 KB，裁剪 framework guidance |
| Persona findings 用低信号条目淹没 review | 通过 confidence calibration 限制为 5-7 条 findings。Optimization-level items 使用 P3 severity（由用户自行取舍） |

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-03-30-cli-readiness-review-persona-requirements.md](docs/brainstorms/2026-03-30-cli-readiness-review-persona-requirements.md)
- 相关代码: `plugins/compound-engineering/agents/review/ce-security-reviewer.agent.md`, `performance-reviewer.md`
- 相关代码: `plugins/compound-engineering/agents/review/ce-cli-agent-readiness-reviewer.agent.md`（7 条 principles 来源）
- 相关代码: `plugins/compound-engineering/skills/ce-review/references/persona-catalog.md`
