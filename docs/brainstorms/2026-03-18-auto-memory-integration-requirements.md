---
date: 2026-03-18
topic: auto-memory-integration
---

# ce:compound 与 ce:compound-refresh 的 Auto Memory 集成

## 问题框架

Claude Code 的 Auto Memory feature 会在 sessions 之间被动捕获 debugging insights、fix patterns 和 preferences，位置在 `~/.claude/projects/<project>/memory/`。`ce:compound` 和 `ce:compound-refresh` skills 当前没有利用这个 data source，尽管其中正好包含这些 workflows 需要的 raw material：关于已解决问题、尝试过的方法和发现的 patterns 的 notes。

在长 session 或 compaction 之后，auto memory 可能保留 conversation context 已丢失的 insights。对 `ce:compound-refresh` 来说，auto memory 可能包含较新的 observations，暗示 existing `docs/solutions/` learnings 已经 drift，但没有人显式 flag。

## 需求

- R1. **ce:compound uses auto memory as supplementary evidence.** orchestrator 在启动 Phase 1 subagents 之前读取 MEMORY.md，扫描与当前待记录问题相关的 entries，并把 relevant memory content 作为 additional context 传给 Context Analyzer 和 Solution Extractor subagents。这些 subagents 将 memory notes 与 conversation history 一起视为 supplementary evidence。
- R2. **ce:compound-refresh investigation subagents check auto memory.** 调查某个 candidate learning 是否 stale 时，investigation subagents 也会检查同一 problem domain 中的 auto memory notes。描述了不同 approach、且不同于 learning recommendation 的 memory note，会被视为 drift signal。
- R3. **Graceful absence handling.** 如果项目没有 auto memory（没有 memory directory 或 MEMORY.md 为空），所有 skills 都完全按今天的方式继续，不报错也不 warning。

## 成功标准

- 当 auto memory 中有与 fix 相关的 notes 时，ce:compound 能产出更丰富的 documentation，尤其是在经历 compaction 的 sessions 之后
- ce:compound-refresh 能 surface 原本需要 manual discovery 的 staleness signals
- auto memory 缺失或为空时没有 regression

## 范围边界

- **不改变 auto memory 的 output location 或 format** -- 这些 skills 按原样消费它
- **Read-only** -- 两个 skill 都不写入 auto memory；ce:compound 写入 `docs/solutions/`（team-shared、structured），其用途不同于 machine-local auto memory
- **不新增 subagent** -- 只用 memory-checking instructions 增强 existing subagents
- **不改变 `docs/solutions/` output structure** -- final artifacts 保持相同

## 依赖与假设

- Claude 在每个 session 的 system prompt context 中都知道其 auto memory directory path -- skills 中不需要 path discovery logic

## 关键决策

- **增强 existing subagents，而不是新增一个**：ce:compound-refresh investigation subagents 在自己的 investigation 中需要 memory context（不是单独 report），因此 dedicated Memory Scanner subagent 会很别扭。对 ce:compound，orchestrator 预先读取一次 MEMORY.md，并把 relevant excerpts 传给 subagents，避免重复读取，同时保持 subagent count 不变。

## 待决问题

### 延后到 Planning

- [Affects R1][Technical] orchestrator 应如何判断哪些 MEMORY.md entries 与当前 problem “related”？对 problem description 做 keyword matching，还是使用更宽泛 heuristic？
- [Affects R2][Technical] ce:compound-refresh investigation subagents 应读取完整 MEMORY.md，还是只读取与 learning domain 匹配的 topic files？200-line MEMORY.md 足够小，可以完整读取，但 topic files 可能更 targeted。

## 下一步

-> `/ce:plan` 进行 structured implementation planning
