---
title: "feat: 添加 ce:ideate 开放式想法生成 skill"
type: feat
status: completed
date: 2026-03-15
origin: docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md
deepened: 2026-03-16
---

# feat: 添加 ce:ideate 开放式想法生成 skill

## 概览

为 compound-engineering plugin 新增 `ce:ideate` skill，用于对任意项目执行开放式、先发散再收敛的想法生成。该 skill 会深度扫描 codebase，生成约 30 个想法，自我批判并筛选它们，再以带结构化分析的 ranked list 展示前 5-7 个。它使用 agent intelligence 改善候选池，但不替代核心 prompt 机制；在幸存想法完成 review 后，将 durable artifact 写入 `docs/ideation/`，并把选中的想法 handoff 给 `ce:brainstorm`。

## 问题框架

`ce:*` workflow pipeline 在最开始存在缺口。`ce:brainstorm` 要求用户先带来一个 idea；它负责 refine，但不负责 generate。希望 AI 主动建议改进的用户只能依赖 ad-hoc prompting，而这缺少 codebase grounding、structured output、durable artifacts 和 pipeline integration。（见 origin: docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md）

## 需求追踪

- R1. 在 `plugins/compound-engineering/skills/ce-ideate/` 下提供 standalone skill
- R2. 可选 freeform argument 作为 focus hint（concept、path、constraint，或空）
- R3. 生成想法前，通过 research agents 深度扫描 codebase
- R4. 保留已验证的 prompt 机制：先大量生成想法，再严厉过滤，再详细展开幸存者
- R5. 使用 explicit rejection reasoning 进行 self-critique
- R6. 以 structured analysis 展示前 5-7 个想法（description、rationale、downsides、confidence 0-100%、complexity）
- R7. Rejection summary（每个被拒想法一行）
- R8. 在 `docs/ideation/YYYY-MM-DD-<topic>-ideation.md` 写入 durable artifact
- R9. 可通过 argument 覆盖 volume
- R10. Handoff: brainstorm an idea、refine、share to Proof，或 end session
- R11. 对选中想法的 follow-up 始终路由到 `ce:brainstorm`
- R12. Session end 时提供 commit 选项
- R13. 可从现有 ideation docs 恢复（30-day recency window）
- R14. 写入 durable artifact 之前，先展示 survivors
- R15. handoff/share/end 之前，先写入 artifact
- R16. refine 时如需保留 refined state，则原地更新 doc
- R17. 使用 agent intelligence 支撑核心机制，而不是替代核心机制
- R18. 使用 research agents 做 grounding；ideation/critique sub-agents 是 prompt-defined roles
- R19. 将 grounding summary、focus hint 和 volume target 传给 ideation sub-agents
- R20. Focus hints 同时影响 generation 和 filtering
- R21. 使用来自 ideation sub-agents 的标准化 structured outputs
- R22. Orchestrator 负责最终 scoring、ranking 和 survivor decisions
- R23. 使用宽泛的 prompt-framing methods 鼓励 creative spread，避免过度约束 ideation
- R24. 使用最小有用 sub-agent 集，而不是 hardcoded fixed count
- R25. 当想法被 brainstormed 后，将其标记为 "explored"

## 范围边界

- v1 不做 external research（competitive analysis、similar projects）（见 origin）
- 不提供 configurable depth modes：固定 volume，只允许基于 argument 的 override（见 origin）
- 不修改 `ce:brainstorm`：仅通过 skill description 做 discovery（见 origin）
- 不提供已弃用的 `workflows:ideate` alias：`workflows:*` prefix 已弃用
- 不拆分 `references/`：预估 skill 长度约 300 行，远低于 500 行 threshold

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md` - 最接近的 sibling。镜像：resume behavior（Phase 0.1）、artifact frontmatter（date + topic）、通过 platform question tool 提供 handoff options、document-review integration、Proof sharing
- `plugins/compound-engineering/skills/ce-plan/SKILL.md` - Agent dispatch pattern: `Task compound-engineering:research:repo-research-analyst(context)` parallel 运行。Phase 0.2 upstream document detection
- `plugins/compound-engineering/skills/ce-work/SKILL.md` - Session completion：incremental commit pattern、staging specific files、conventional commit format
- `plugins/compound-engineering/skills/ce-compound/SKILL.md` - Parallel research assembly：subagents only return text，orchestrator 写单一文件
- `plugins/compound-engineering/skills/document-review/SKILL.md` - Utility invocation: "Load the `document-review` skill and apply it to..." 返回 "Review complete" signal
- `plugins/compound-engineering/skills/deepen-plan/SKILL.md` - broad parallel agent dispatch pattern
- PR #277 (`fix: codex workflow conversion for compound-engineering`) - 建立了 Codex 中 canonical `ce:*` workflows 的模型：canonical entrypoints 的 prompt wrappers、transformed intra-workflow handoffs，以及省略 deprecated `workflows:*` aliases

### 组织内 learnings

- `docs/solutions/plugin-versioning-requirements.md` - feature PR 中不要 bump versions 或 cut changelog entries。需要更新 README counts 和 plugin.json descriptions。
- `docs/solutions/codex-skill-prompt-entrypoints.md`（来自 PR #277）- 对 Codex 中的 compound-engineering workflows，prompts 是 canonical user-facing entrypoints，copied skills 是其下方的 reusable implementation units

## 关键技术决策

- **Agent dispatch for codebase scan**: 并行使用 `repo-research-analyst` + `learnings-researcher`（匹配 ce:plan Phase 1.1）。默认跳过 `git-history-analyzer`，因为相对成本而言 ideation value 边际较低。Focus hint（R2）会作为 context 传给两个 agents。
- **Core mechanism first, agents second**: 核心设计仍然是用户已验证的 prompt pattern：生成大量想法、严厉拒绝、只解释幸存者。Agent intelligence 改善 candidate pool 和 critique quality，但不替代此机制。
- **Prompt-defined ideation and critique sub-agents**: 使用带不同 framing methods 的 prompt-shaped sub-agents 做 ideation，以及可选 skeptical critique；不强行复用目的不同的现有 named review agents。
- **Orchestrator-owned synthesis and scoring**: Orchestrator 合并与去重 sub-agent outputs，应用统一 rubric，并做最终 scoring/ranking。Sub-agents 可以输出轻量 local signals，但不拥有 authoritative final rankings。
- **Artifact frontmatter**: `date`、`topic`、`focus`（可选）。保持 minimal，平行于 brainstorm 的 `date` + `topic` pattern。
- **Volume override via natural language**: skill instructions 告诉 Claude 将 argument 中的 number patterns（"top 3"、"100 ideas"）解释为 volume overrides。不做 formal parsing。
- **Artifact timing**: 先展示 survivors，允许 brief questions 或 lightweight clarification，然后在任何 handoff、Proof share 或 session end 前写入/更新 durable artifact。
- **No `disable-model-invocation`**: 当用户说 "what should I improve?"、"give me ideas for this project"、"ideate on improvements" 之类表达时，该 skill 应可 auto-load。遵循与 ce:brainstorm 相同的 pattern。
- **Commit pattern**: 只 stage `docs/ideation/<filename>`，使用 conventional format `docs: add ideation for <topic>`，提供但不强制 commit。
- **Relationship to PR #277**: `ce:ideate` 必须遵循其他 canonical `ce:*` workflows 相同的 Codex workflow model。原因：如果没有 #277 的 prompt-wrapper 与 handoff-rewrite 模型，copied workflow skill 仍可能指向在 Codex 中不存在 coherent surface 的 Claude-style slash handoffs。`ce:ideate` 应作为同一 surface 上的另一个 canonical `ce:*` workflow 引入，而不是 one-off pass-through skill。

## 开放问题

### 规划期间已解决

- **Which agents for codebase scan?** -> `repo-research-analyst` + `learnings-researcher`。理由：与 ce:plan 的 proven pattern 相同，同时覆盖 current code 和 institutional knowledge。
- **Additional analysis fields per idea?** -> 保持 R6 规定的字段。"What this unlocks" 会进入 brainstorm scope。YAGNI。
- **Volume override detection?** -> Natural language interpretation。skill instructions 描述如何检测 overrides。不需要 formal parsing。
- **Artifact frontmatter fields?** -> `date`、`topic`、`focus`（可选）。遵循 brainstorm pattern。
- **Need references/ split?** -> 不需要。预计约 300 行，低于 500-line threshold。
- **Need deprecated alias?** -> 不需要。`workflows:*` 已弃用；新 skills 直接进入 `ce:*`。
- **How should docs regeneration be represented in the plan?** -> checked-in tree 当前不包含先前假设的 generated files（`docs/index.html`、`docs/pages/skills.html`）。将 `/release-docs` 视作 repo-maintenance validation step，它可能更新 tracked generated artifacts，而不是 guaranteed edit 到预设 file paths。
- **How should skill counts be validated across artifacts?** -> 不强制每个 surface 使用统一 count。Plugin manifests 应反映 parser-discovered skill directories，而 `plugins/compound-engineering/README.md` 应保留其人类可读 taxonomy：workflow commands vs. standalone skills。
- **What is the dependency on PR #277?** -> 将 #277 视作 Codex correctness 的 upstream prerequisite。如果它先 merge，`ce:ideate` 应接入其 canonical `ce:*` workflow model。如果它没有先 merge，则在 `ce:ideate` 视为完成前，必须包含等价的 Codex workflow behavior。
- **How should agent intelligence be applied?** -> Research agents 用于 grounding，prompt-defined sub-agents 用于扩大 candidate pool 并 critique，orchestrator 仍是 final judge。
- **Who should score the ideas?** -> Orchestrator，而不是 ideation sub-agents，也默认不是单独 scoring sub-agent。
- **When should the artifact be written?** -> 在 survivors 被展示并经过足够 review 以便保存之后；但始终在 handoff、sharing 或 session end 之前。

### 延后到实现阶段

- **Exact wording of the divergent ideation prompt section**: plan 指定 structure 和 mechanisms，但精确措辞会在 implementation 阶段 refine。这本身就是 iterative design element。
- **Exact wording of the self-critique instructions**: 同上，structure 已定义，具体 prose 在 implementation-time 完成。

## 实现单元

- [x] **Unit 1: 创建 ce:ideate SKILL.md**

**目标:** 编写完整 skill definition，包含所有 phases、ideation prompt structure、可选 sub-agent support、artifact template 和 handoff options。

**需求:** R1-R25（全部 requirements，这是 core deliverable）

**依赖:** None

**文件:**
- 创建: `plugins/compound-engineering/skills/ce-ideate/SKILL.md`
- 测试（conditional）: `tests/claude-parser.test.ts`, `tests/cli.test.ts`

**做法:**

- 保持该 unit 主要是 content-only，除非 implementation 发现真实 parser 或 packaging gap。`loadClaudePlugin()` 已经会 discover 任何 `skills/*/SKILL.md`，且多数 target converters/writers 已通过 `skillDirs` 传递 `plugin.skills`。
- 不依赖对 Codex 的纯 pass-through。因为 PR #277 为 Codex 中的 compound-engineering `ce:*` workflows 提供 canonical prompt-wrapper model，`ce:ideate` 必须对该模型验证；如果 #277 尚未存在，可能需要 Codex-target updates。
- 将 artifact lifecycle rules 视作 skill contract，而不是 polish：resume detection、present-before-write、refine-in-place，以及 brainstorm handoff state 都在这个 SKILL.md 内，且必须自洽。
- 让 prompt sections 基于 Phase 1 findings，以免 ideation quality 退化为 generic product advice。
- 保持用户原始 prompt mechanism 作为 workflow 主干。额外 agent structure 应增强该机制，而不是取代它。
- 使用 sub-agents 时，让它们保持 prompt-defined 且 lightweight：shared grounding/focus/volume input、structured output、orchestrator-owned merge/dedupe/scoring。

该 skill 遵循 ce:brainstorm phase structure，但 phases 本质不同：

```
Phase 0: Resume and Route
  0.1 Check docs/ideation/ for recent ideation docs (R13)
  0.2 Parse argument — extract focus hint and any volume override (R2, R9)
  0.3 If no argument, proceed with fully open ideation (no blocking ask)

Phase 1: Codebase Scan
  1.1 Dispatch research agents in parallel (R3):
      - Task compound-engineering:research:repo-research-analyst(focus context)
      - Task compound-engineering:research:learnings-researcher(focus context)
  1.2 Consolidate scan results into a codebase understanding summary

Phase 2: Divergent Generation (R4, R17-R21, R23-R24)
  Core ideation instructions tell Claude to:
  - Generate ~30 ideas (or override amount) as a numbered list
  - Each idea is a one-liner at this stage
  - Push past obvious suggestions — the first 10-15 will be safe/obvious,
    the interesting ones come after
  - Ground every idea in specific codebase findings from Phase 1
  - Ideas should span multiple dimensions where justified
  - If a focus area was provided, weight toward it but don't exclude
    other strong ideas
  - Preserve the user's original many-ideas-first mechanism
  Optional sub-agent support:
  - If the platform supports it, dispatch a small useful set of ideation
    sub-agents with the same grounding summary, focus hint, and volume target
  - Give each one a distinct prompt framing method (e.g. friction, unmet
    need, inversion, assumption-breaking, leverage, extreme case)
  - Require structured idea output so the orchestrator can merge and dedupe
  - Do not use sub-agents to replace the core ideation mechanism

Phase 3: Self-Critique and Filter (R5, R7, R20-R22)
  Critique instructions tell Claude to:
  - Go through each idea and evaluate it critically
  - For each rejection, write a one-line reason
  - Rejection criteria: not actionable, too vague, too expensive relative
    to value, already exists, duplicates another idea, not grounded in
    actual codebase state
  - Target: keep 5-7 survivors (or override amount)
  - If more than 7 pass scrutiny, do a second pass with higher bar
  - If fewer than 5 pass, note this honestly rather than lowering the bar
  Optional critique sub-agent support:
  - Skeptical sub-agents may attack the merged list from distinct angles
  - The orchestrator synthesizes critiques and owns final scoring/ranking

Phase 4: Present Results (R6, R7, R14)
  - Display ranked survivors with structured analysis per idea:
    title, description (2-3 sentences), rationale, downsides,
    confidence (0-100%), estimated complexity (low/medium/high)
  - Display rejection summary: collapsed section, one-line per rejected idea
  - Allow brief questions or lightweight clarification before archival write

Phase 5: Write Artifact (R8, R15, R16)
  - mkdir -p docs/ideation/
  - Write the ideation doc after survivors are reviewed enough to preserve
  - Artifact includes: metadata, codebase context summary, ranked
    survivors with full analysis, rejection summary
  - Always write/update before brainstorm handoff, Proof share, or session end

Phase 6: Handoff (R10, R11, R12, R15-R16, R25)
  6.1 Present options via platform question tool:
      - Brainstorm an idea (pick by number → feeds to ce:brainstorm) (R11)
      - Refine (R15)
      - Share to Proof
      - End session (R12)
  6.2 Handle selection:
      - Brainstorm: update doc to mark idea as "explored" (R16),
        then invoke ce:brainstorm with the idea description
      - Refine: ask what kind of refinement, then route:
        "add more ideas" / "explore new angles" → return to Phase 2
        "re-evaluate" / "raise the bar" → return to Phase 3
        "dig deeper on idea #N" → expand that idea's analysis in place
        Update doc after each refinement when preserving the refined state (R16)
      - Share to Proof: upload ideation doc using the standard
        curl POST pattern (same as ce:brainstorm), return to options
      - End: offer to commit the ideation doc (R12), display closing summary
```

Frontmatter（frontmatter 元数据）:
```yaml
---
name: ce:ideate
description: 'Generate and critically evaluate improvement ideas for any project through deep codebase analysis and divergent-then-convergent thinking. Use when the user says "what should I improve", "give me ideas", "ideate", "surprise me with improvements", "what would you change about this project", or when they want AI-generated project improvement suggestions rather than refining their own idea.'
argument-hint: "[optional: focus area, path, or constraint]"
---
```

Artifact template（artifact 模板）:
```markdown
---
date: YYYY-MM-DD
topic: <kebab-case-topic>
focus: <focus area if provided, omit if open>
---

# Ideation: <Topic or "Open Exploration">

## Codebase Context
[Brief summary of what the scan revealed — project structure, patterns, pain points, opportunities]

## Ranked Ideas

### 1. <Idea Title>
**Description:** [2-3 sentences]
**Rationale:** [Why this would be a good improvement]
**Downsides:** [Risks or costs]
**Confidence:** [0-100%]
**Complexity:** [Low / Medium / High]

### 2. <Idea Title>
...

## Rejection Summary
| # | Idea | Reason for Rejection |
|---|------|---------------------|
| 1 | ... | ... |

## Session Log
- [Date]: Initial ideation — [N] generated, [M] survived
```

**遵循的模式:**
- ce:brainstorm SKILL.md - phase structure、frontmatter style、argument handling、resume pattern、handoff options、Proof sharing、interaction rules（阶段结构、frontmatter 风格、参数处理、resume 模式、handoff 选项、Proof 分享和交互规则）
- ce:plan SKILL.md - agent dispatch syntax（agent 分发语法：`Task compound-engineering:research:*`）
- ce:work SKILL.md - session completion commit pattern（会话完成 commit 模式）
- Plugin CLAUDE.md - skill compliance checklist（imperative voice、cross-platform question tool、no second person）

**测试场景:**
- 无 arguments 调用 -> 完全开放式 ideation，生成想法，展示 survivors，然后在保存结果时写入 artifact
- 使用 focus area 调用（`/ce:ideate DX improvements`）-> ideation 加权偏向 focus
- 使用 path 调用（`/ce:ideate plugins/compound-engineering/skills/`）-> scoped scan
- 使用 volume override 调用（`/ce:ideate give me your top 3`）-> 调整 volume
- Resume（恢复）：存在 recent ideation doc 时调用 -> 提供 continue 或 start fresh
- Resume + refine loop: 重新访问现有 ideation doc，添加更多想法，然后重新 critique，且不创建 duplicate artifact
- 如果使用 sub-agents：每个 sub-agent 接收 grounding + focus + volume context，并返回 structured outputs 供 orchestrator merge
- 如果使用 critique sub-agents：orchestrator 仍是 final scorer 和 ranker
- Brainstorm handoff: 选择一个 idea -> doc 更新 "explored" marker，调用 ce:brainstorm
- Refine: 请求 dig deeper -> doc 原地更新 refined analysis
- End session: 提供 commit -> 只 stage ideation doc，使用 conventional message
- Initial review checkpoint: survivors 可在 archival write 前被提问
- PR #277 之后的 Codex install path: `ce:ideate` 暴露为 canonical `ce:ideate` workflow entrypoint，而不仅是 copied raw skill
- Codex intra-workflow handoffs: copied `SKILL.md` 中对 `/ce:*` routes 的任何引用都会解析到 canonical Codex prompt surface，且不 emit deprecated `workflows:ideate` alias

**验证:**
- SKILL.md 低于 500 行
- Frontmatter 包含 `name`、`description`、`argument-hint`
- Description 包含 auto-discovery 的 trigger phrases
- Phase structure 覆盖全部 25 条 requirements
- Writing style 是 imperative/infinitive，无 second person
- 带 fallback 的 cross-platform question tool pattern
- 无 `disable-model-invocation`（可 auto-load）
- 仓库仍可正常加载 plugin skills，因为 `ce:ideate` 被 discover 为 `skillDirs` entry
- Codex output 对该新 canonical `ce:*` workflow 遵循 PR #277 的 compound-engineering workflow model

---

- [x] **Unit 2: 更新 plugin metadata 和 documentation**

**目标:** 更新所有出现 component counts 和 skill listings 的位置。

**需求:** R1（plugin 中存在该 skill）

**依赖:** Unit 1

**文件:**
- 修改: `plugins/compound-engineering/.claude-plugin/plugin.json` - 更新 description 中的新 skill count
- 修改: `.claude-plugin/marketplace.json` - 更新 plugin description 中的新 skill count
- 修改: `plugins/compound-engineering/README.md` - 将 ce:ideate 加入 skills table/list，更新 count

**做法:**
- 添加 ce:ideate 后统计实际 skill directories，用于 manifest-facing descriptions（`plugin.json`、`.claude-plugin/marketplace.json`）
- 保留 README 对 `Commands` vs `Skills` 的独立 human-facing breakdown，而不是强制它等于 manifest-level skill-directory count
- 按现有 table format 将 ce:ideate 加入 README skills section，并给出简短 description
- 不 bump version numbers（遵循 plugin versioning requirements）
- 不新增 CHANGELOG.md release entry

**遵循的模式:**
- CLAUDE.md checklist: "Updating the Compounding Engineering Plugin"（更新 Compounding Engineering Plugin 的 checklist）
- README.md 中现有 skill entries 的 description format（description 格式）
- `src/parsers/claude.ts` loading model: manifests 和 targets 从 discovered `skills/*/SKILL.md` directories 派生 skill inventory

**测试场景:**
- Manifest descriptions 反映 post-change skill-directory count
- README component table 和 skill listing 在 README 自身 taxonomy 内保持一致
- JSON files 保持 valid
- README skill listing 包含 ce:ideate

**验证:**
- `grep -o "Includes [0-9]* specialized agents" plugins/compound-engineering/.claude-plugin/plugin.json` 匹配实际 agent count
- Manifest-facing skill count 匹配 `plugins/compound-engineering/skills/` 下 skill directories 数量
- README counts 和 tables 内部一致，即使它们有意不同于 manifest-facing skill-directory totals
- `jq . < .claude-plugin/marketplace.json` 成功
- `jq . < plugins/compound-engineering/.claude-plugin/plugin.json` 成功

---

- [x] **Unit 3: 如果 local docs workflow 产生 tracked changes，则刷新 generated docs artifacts**

**目标:** 让 generated documentation outputs 保持同步，但不发明当前 tree 中不存在的 source-of-truth files。

**需求:** R1（skill 在 docs 中可见）

**依赖:** Unit 2

**文件:**
- 修改（conditional）: local docs release workflow 更新的 `docs/` 下 tracked files（如果当前 checkout 产生任何此类文件）

**做法:**
- Durable source files 更新后，运行 repo-maintenance docs regeneration workflow
- 只 review 它实际改动的 tracked artifacts，而不是假设特定 generated paths
- 如果当前 checkout 的 local docs workflow 未产生 tracked changes，则停止，不手工编辑猜测的 HTML files

**遵循的模式:**
- CLAUDE.md: "After ANY change to agents, commands, skills, or MCP servers, run `/release-docs`"（对 agents、commands、skills 或 MCP servers 做任何修改后，运行 `/release-docs`）

**测试场景:**
- Generated docs（如存在）从 durable sources 拾取 ce:ideate 和 updated counts
- Docs regeneration 不在 generated artifacts 中引入无关 count drift

**验证:**
- 任何 tracked generated docs diffs 都与更新后的 plugin metadata 和 README 机械一致
- 不为 working tree 中不存在的 files 发明 manual HTML edits

## 系统级影响

- **Interaction graph:** `ce:ideate` 位于 `ce:brainstorm` 之前，并调用 `repo-research-analyst`、`learnings-researcher`、platform question tool、可选 Proof sharing 和可选 local commit flow。plan 必须保留它是横跨多个现有 workflow seams 的 orchestration skill，而不是 standalone document generator。
- **Error propagation:** Resume mismatches、write-before-present failures 或 refine-in-place write failures 可能让 ideation artifact 与用户看到的内容不同步。该 skill 应优先使用 conservative routing 和 explicit state updates，而不是 optimistic wording。
- **State lifecycle risks:** `docs/ideation/` 成为新的 durable state surface。Topic slugging、30-day resume matching、refinement updates，以及 brainstorm handoff 的 "explored" marker 都需要 stable rules，避免重复运行创建 duplicate 或 contradictory ideation records。
- **API surface parity:** 多数 targets 可以继续依赖 copied `skillDirs`，但 Codex 因 PR #277 已成为 compound-engineering 的特殊 workflow surface。`ce:ideate` 需要与 canonical `ce:*` workflow model 保持 parity：explicit prompt entrypoint、rewritten intra-workflow handoffs、无 deprecated alias duplication。
- **Integration coverage:** 只阅读 SKILL.md 做 unit-level verification 不够。Verification 必须覆盖 end-to-end workflow behavior：initial ideation、artifact persistence、resume/refine loops，以及 handoff to `ce:brainstorm` 且不丢 ideation state。

## 风险与依赖

- **Divergent ideation quality 难以在 planning time 验证**: Phase 2 和 Phase 3 的 self-prompting instructions 是 novel design element。其效果取决于精确措辞，以及 Phase 1 findings 回灌到 ideation 的质量。Mitigation: 用真实 repo 对 open 和 focused prompts 做验证，然后只在 groundedness 或 rejection quality 弱的地方收紧 prompt structure。
- **Resume/refine/handoff 之间的 artifact state drift**: 该 feature 依赖反复更新同一个 ideation doc。弱 state model 可能 duplicate docs、丢失 "explored" markers，或在 refinement 后展示 stale survivors。Mitigation: 每个 session/topic 保持一个 canonical ideation file，并让每条 refine/handoff path 在返回 control 前显式更新该文件。
- **Docs 和 manifests 之间的 count taxonomy drift**: 该 repo 已经在不同 surfaces 上使用不同 count semantics。天真的 "make every number match" implementation 可能破坏 manifest descriptions，或扭曲 README taxonomy。Mitigation: 按每个 artifact 自身 intended counting model 验证，并在 plan 中记录差异。
- **依赖 PR #277 来保证 Codex workflow correctness**: `ce:ideate` 是另一个 canonical `ce:*` workflow，因此它的 Codex install surface 不应退回旧的 copied-skill-only behavior。Mitigation: 先 land #277，或在认为此 feature 完成之前显式纳入同等 Codex workflow behavior。
- **Local docs workflow dependency**: `/release-docs` 是 repo-maintenance workflow，不是 distributed plugin 的一部分。其 generated outputs 可能随环境不同而变化，或当前 checkout 不产生 tracked files。Mitigation: 将 docs regeneration 视为 durable source edits 之后的 conditional maintenance verification，而不是 primary source of truth。
- **Skill length**: 预计约 300 行。如果 ideation 和 self-critique instructions 需要更多 detail，skill 可能接近 500-line limit。Mitigation: implementation 时监控长度；只有最终内容确实需要时才拆到 `references/`。

## 文档 / 运行备注

- README.md 在 Unit 2 更新
- Generated docs artifacts 仅在当前 checkout 的 local docs workflow 产生 tracked changes 时刷新
- Local `release-docs` workflow 在该 repo 中以 Claude slash command 形式存在，但此 implementation pass 使用的 shell environment 无法直接运行它
- 此 PR 不写 CHANGELOG entry（遵循 versioning requirements）
- 不 bump versions（由 automated release process 处理）

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md](docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md)
- 相关代码: `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`, `plugins/compound-engineering/skills/ce-plan/SKILL.md`, `plugins/compound-engineering/skills/ce-work/SKILL.md`
- 相关组织 learning: `docs/solutions/plugin-versioning-requirements.md`
- 相关 PR: #277 (`fix: codex workflow conversion for compound-engineering`) - 此 plan 现在依赖的 upstream Codex workflow model
- 相关组织 learning: `docs/solutions/codex-skill-prompt-entrypoints.md`
