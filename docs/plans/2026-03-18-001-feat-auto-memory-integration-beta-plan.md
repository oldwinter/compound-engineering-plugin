---
title: "feat: 将 auto memory 作为 ce:compound 和 ce:compound-refresh 的 data source"
type: feat
status: completed
date: 2026-03-18
origin: docs/brainstorms/2026-03-18-auto-memory-integration-requirements.md
---

# 将 Auto Memory 作为 ce:compound 和 ce:compound-refresh 的 Data Source

## 概览

将 Claude Code 的 Auto Memory 作为 supplementary read-only data source 添加到 ce:compound 和 ce:compound-refresh。orchestrator 和 investigation subagents 检查 auto memory directory 中的相关 notes，以丰富 documentation，或 signal existing learnings 中的 drift。

## 问题框架

Auto memory 会跨 sessions 被动捕获 debugging insights、fix patterns 和 preferences。在长 sessions 或 compaction 后，它会保留 conversation context 已经丢失的 insights。对 ce:compound-refresh 而言，它可能包含更新 observations，能 signal drift，即使没人显式标记。两个 skills 目前都没有利用这个免费 data source。（see origin: `docs/brainstorms/2026-03-18-auto-memory-integration-requirements.md`）

## 需求追踪

- R1. ce:compound 将 auto memory 用作 supplementary evidence：orchestrator pre-reads MEMORY.md，并将 relevant content 传给 Context Analyzer 和 Solution Extractor subagents（see origin: R1）
- R2. ce:compound-refresh investigation subagents 在 learning 的 problem domain 中检查 auto memory 以寻找 drift signals（see origin: R2）
- R3. Graceful absence：如果 auto memory 不存在或为空，skills 无 errors 地照常 proceed（see origin: R3）

## 范围边界

- Read-only：两个 skills 都不写入 auto memory（see origin: Scope Boundaries）
- 不新增 subagents：增强既有 subagents（see origin: Key Decisions）
- 不改变 docs/solutions/ output structure（see origin: Scope Boundaries）
- 仅 MEMORY.md：topic files deferred to future iteration
- 不改变 auto memory format 或 location（see origin: Scope Boundaries）

## 上下文与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-compound/SKILL.md` — Phase 1 subagents 接收 implicit context（conversation history）；orchestrator 协调 launch 和 assembly
- `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md` — investigation subagents 接收 explicit task prompts 与 tool guidance；每个返回 evidence + recommended action
- ce:compound-refresh 已有显式 "When spawning any subagent, include this instruction" block，可自然扩展
- ce:plan 有 precedent pattern：orchestrator 在 launching agents 前 pre-reads source documents（Phase 0 requirements doc scan）

### 机构经验

- `docs/solutions/skill-design/compound-refresh-skill-improvements.md` — replacement subagents pattern、tool guidance convention、context isolation principle
- Plugin AGENTS.md tool selection rules：按 capability class 描述 tools，并给 platform hints，而不是只写 Claude Code-specific tool names

## 关键技术决策

- **Relevance matching via semantic judgment, not keyword algorithm**：MEMORY.md 最多 200 行。orchestrator 全量读取，并使用 Claude semantic understanding 识别与 problem 相关的 entries。不需要 keyword matching logic。（Resolves origin: Deferred Q1）
- **本 iteration 仅使用 MEMORY.md**：Topic files deferred。MEMORY.md 作为 index，足以做 first pass。扩展到 topic files 会增加复杂度，而在验证核心 integration 前价值不确定。（Resolves origin: Deferred Q2）
- **增强既有 subagents，而不是新增一个**：ce:compound-refresh investigation subagents 在 investigation 期间需要 memory context。单独 Memory Scanner subagent 会太晚交付结果。对 ce:compound，orchestrator pre-reads 一次并传递 excerpts。（see origin: Key Decisions）
- **Memory drift signals 是 supplementary，不是 primary**：memory note 单独不能在 ce:compound-refresh 中触发 Replace 或 Archive。Memory signals corroborate codebase evidence 或 prompt deeper investigation。在 autonomous mode 中，memory-only drift 导致 stale-marking，而不是 action。
- **必须 provenance labeling**：传给 subagents 的 memory excerpts 必须包在清晰标记 section 中，防止 subagents 将其与 verified conversation history 混淆。
- **Conversation history 是 authoritative**：当 memory 与 current session verified fix 矛盾时，fix 优先。Memory contradictions 可作为 cautionary context note。
- **所有 partial memory states 都视为 absent**：没有 directory、没有 MEMORY.md、empty MEMORY.md、malformed MEMORY.md，都会 graceful skip，不产生 error 或 warning。

## 未决问题

### Planning 期间已解决

- **哪些 subagents 在 ce:compound 中接收 memory？** 只有 Context Analyzer 和 Solution Extractor。Related Docs Finder 可能受益，但先窄范围更安全。之后可扩展。
- **Compact-safe mode？** 仍读取 MEMORY.md。200 行即使在 compact-safe mode 中 context cost 也可忽略。orchestrator 在 single pass 中 inline 使用 memory。
- **ce:compound-refresh：谁读取 MEMORY.md？** 每个 investigation subagent 通过其 task prompt instructions 读取。orchestrator 不 pre-filter，因为每个 subagent 知道自己的 investigation domain，且每个读 200 行很便宜。
- **Observability？** 当 memory 贡献内容时，在 ce:compound success output 中添加一行。在 ce:compound-refresh reports 中 tag memory-sourced evidence。不改变 YAML frontmatter schema。

### 推迟到 Implementation

- **subagent instruction additions 的精确措辞**：implementation 期间会调整 precise markdown wording，使其自然融入现有 SKILL.md prose style。
- **是否也增强 Related Docs Finder**：推迟到 initial integration 显示当前 scope 是否足够后再定。

## 实施单元

- [ ] **Unit 1：向 ce:compound SKILL.md 添加 auto memory integration**

**目标：** 让 ce:compound 读取 auto memory，并将 relevant notes 作为 supplementary evidence 传给 subagents。

**需求：** R1, R3

**依赖：** None

**文件：**

- Modify（修改）: `plugins/compound-engineering/skills/ce-compound/SKILL.md`

**方法：**

- 在 Full Mode critical requirement block 与 Phase 1 之间插入新的 "Phase 0.5: Auto Memory Scan" section。该 section 指示 orchestrator：
  1. 从 auto memory directory 读取 MEMORY.md（path 来自 system prompt context）
  2. 如果 absent 或 empty，skip 并照常进入 Phase 1
  3. 扫描与正在 documented 的 problem 相关的 entries
  4. 准备带 provenance marking 的 labeled excerpt block（"Supplementary notes from auto memory -- treat as additional context, not primary evidence"）
  5. 将该 block 作为 additional context 传给 Context Analyzer 和 Solution Extractor task prompts
- 增强 Context Analyzer description（Phase 1 下），说明：识别 problem type、component 和 symptoms 时，将 auto memory excerpts 作为 supplementary evidence 纳入
- 增强 Solution Extractor description（Phase 1 下），说明：将 auto memory excerpts 作为 supplementary evidence；conversation history 和 verified fix 优先；contradictions 作为 cautionary context note
- 向 Compact-Safe Mode step 1 添加：如果 MEMORY.md 存在，也读取它，并 inline 使用 relevant notes 作为 supplementary context
- 向 Success Output template 添加可选行：`Auto memory: N relevant entries used as supplementary evidence`（仅当 N > 0）

**遵循的模式：**

- ce:plan 在 launching agents 前 pre-reading source documents 的 Phase 0 pattern
- ce:compound-refresh 现有 "When spawning any subagent" instruction block pattern
- Plugin AGENTS.md convention：按 capability class 描述 tools，并给 platform hints

**测试场景：**

- Memory present with relevant entries：orchestrator 识别 related notes，并传给 2 个 subagents；最终 documentation 被 enriched
- Memory present but no relevant entries：orchestrator 读取 MEMORY.md，未发现相关内容，不传 memory context 并继续
- Memory absent（无 directory）：skill 与之前完全一样 proceed，无 error
- Memory empty（directory 存在，MEMORY.md empty 或 boilerplate）：skill 与之前完全一样 proceed
- Compact-safe mode with memory：single-pass flow 将 memory 与 conversation history 一起 inline 使用
- Post-compaction session：关于 fix 的 memory notes 弥补 lost conversation context

**验证：**

- 修改后的 SKILL.md 与新 sections 自然融合到现有 flow 中
- Phase 0.5 section 清楚描述 graceful absence behavior
- subagent augmentations 指定 provenance labeling
- success output template 显示 optional memory line
- `bun run release:validate` passes

- [ ] **Unit 2：向 ce:compound-refresh SKILL.md 添加 auto memory checking**

**目标：** 让 ce:compound-refresh investigation subagents 使用 auto memory 作为 supplementary drift signal source。

**需求：** R2, R3

**依赖：** None（可与 Unit 1 并行）

**文件：**

- Modify（修改）: `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md`

**方法：**

- 在 Phase 1 中添加 "Auto memory" 作为第五个 investigation dimension（位于 References、Recommended solution、Code examples、Related docs 之后）。指示：检查 auto memory directory 中的 MEMORY.md，寻找同一 problem domain 的 notes。描述不同 approach 的 memory note 是 supplementary drift signal。如果 MEMORY.md 不存在或为空，skip 该 dimension。
- 在 Drift Classification section（Update/Replace territory 之后）添加 paragraph，说明 memory signal weight：memory drift signals 是 supplementary；它们 corroborate codebase-sourced drift 或 prompt deeper investigation，但不能单独 justify Replace 或 Archive；在 autonomous mode 中，memory-only drift 产生 stale-marking 而不是 action。
- 扩展现有 "When spawning any subagent" instruction block，包含：如果存在，从 auto memory directory 读取 MEMORY.md；检查与 learning problem domain 相关的 notes；在 evidence section 中将 memory-sourced drift signals 单独报告，并标记 `(auto memory)`。
- 更新 output format guidance，说明 memory-sourced findings 应 tag `(auto memory)`，以区别 codebase-sourced evidence。

**遵循的模式：**

- Phase 1 中现有 investigation dimensions structure（References、Recommended solution、Code examples、Related docs）
- 现有 "When spawning any subagent" instruction block
- 现有 drift classification guidance style（Update territory vs Replace territory）
- Plugin AGENTS.md convention：按 capability class 描述 tools，并给 platform hints

**测试场景：**

- Memory 包含与 learning recommended approach 矛盾的 note：investigation subagent 将其作为 "(auto memory)" drift signal，与 codebase evidence 一起报告
- Memory 包含确认 learning approach 的 note：无 drift signal，learning stays as Keep
- Memory-only drift（codebase 仍匹配 learning）：interactive mode 中，drift 被 noted，但不会单独改变 classification；autonomous mode 中结果是 stale-marking
- Memory absent：investigation 与之前完全一样 proceed，第五 dimension skip
- Broad scope refresh with memory：每个 parallel investigation subagent 独立读取 MEMORY.md
- Report output：memory-sourced evidence 与 codebase evidence 视觉上可区分

**验证：**

- 修改后的 SKILL.md 与新 dimension 和 drift guidance 自然融合
- "When spawning any subagent" block 干净地把 memory instructions 加入现有 tool guidance
- drift classification section 清楚说明 memory signals 是 supplementary
- `bun run release:validate` passes

## 风险与依赖

- **Auto memory format changes**：如果 Claude Code 未来改变 MEMORY.md format，这些 skills 可能需要更新。mitigation 是 skills 只指示 Claude "read MEMORY.md"，由 Claude 自身 semantic understanding 处理 format interpretation。
- **Assumption: system prompt contains memory path**：如果该 assumption 失效，skills 会 skip memory（graceful absence）。该 assumption 目前在 Claude Code versions 中稳定。

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-03-18-auto-memory-integration-requirements.md](docs/brainstorms/2026-03-18-auto-memory-integration-requirements.md) — Key decisions（关键决策）: augment existing subagents, read-only, graceful absence, orchestrator pre-read for ce:compound
- Related code（相关代码）: `plugins/compound-engineering/skills/ce-compound/SKILL.md`, `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md`
- Institutional learning（机构经验）: `docs/solutions/skill-design/compound-refresh-skill-improvements.md`
- External docs（外部文档）: https://code.claude.com/docs/en/memory#auto-memory
