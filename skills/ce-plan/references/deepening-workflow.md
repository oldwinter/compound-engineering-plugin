# Deepening 工作流

本文件包含 confidence-check execution path（5.3.3-5.3.7）。仅当 5.3.2 的 deepening gate 判定 deepening 有必要时加载。

## 5.3.3 为 Confidence Gaps 评分

使用 checklist-first、risk-weighted 的 scoring pass。

对每个 section，计算：
- **Trigger count（触发数量）** - 适用的 checklist problems 数量
- **Risk bonus（风险加分）** - 如果 topic 是 high-risk，且该 section 与该 risk materially relevant，加 1
- **Critical-section bonus（关键 section 加分）** - 在 `Standard` 或 `Deep` plans 中，对 `Key Technical Decisions`、`Implementation Units`、`System-Wide Impact`、`Risks & Dependencies` 或 `Open Questions` 加 1

若满足以下任一条件，将 section 视为 candidate：
- 达到 **2+ total points**，或
- 在 high-risk domain 中达到 **1+ point**，且 section materially important

仅按 score 选择 top **2-5** sections。如果 deepening lightweight plan（high-risk exception），上限为 **1-2** sections。

如果 plan 已有 `deepened:` date：
- 当 scores 相近时，优先选择尚未 substantively strengthened 的 sections
- 仅当 already-deepened section 的 score 仍明显高于 alternatives 时，才 revisit 它

**Section Checklists（Section 检查清单）：**

**Requirements（需求）**
- Requirements vague，或与 implementation units disconnected
- Success criteria 缺失，或未在 downstream 中反映
- Units 未清晰推进 traced requirements
- Origin requirements 未清晰 carry forward
- Origin A/F/AE IDs（当 upstream brainstorm 提供时）在 planning decisions 触及它们的位置未保留，或在 Requirements、units 和 test scenarios 中 referenced inconsistently

**Context & Research / Sources & References（上下文、研究、来源与引用）**
- 相关 repo patterns 被命名，但从未用于 decisions 或 implementation units
- cited learnings 或 references 没有 materially shape plan
- High-risk work 缺少适当 external 或 internal grounding
- Research 是 generic，而不是 tied to this repo or this plan

**Key Technical Decisions（关键技术决策）**
- decision 陈述时没有 rationale
- rationale 未解释 tradeoffs 或 rejected alternatives
- decision 未连接回 scope、requirements 或 origin context
- 存在明显 design fork，但 plan 从未说明为什么一个 path 胜出

**Open Questions（开放问题）**
- Product blockers 被隐藏为 assumptions
- Planning-owned questions 被错误 deferred to implementation
- Resolved questions 在 repo context、research 或 origin decisions 中没有清晰 basis
- Deferred items 过于 vague，日后无用

**High-Level Technical Design（高层技术设计，存在时）**
- sketch 对该 work 使用了错误 medium
- sketch 包含 implementation code，而不是 pseudo-code
- non-prescriptive framing 缺失或弱
- sketch 未连接到 key technical decisions 或 implementation units

**High-Level Technical Design（高层技术设计，缺失时）** *(仅 Standard 或 Deep plans)*
- work 涉及 DSL design、API surface design、multi-component integration、complex data flow 或 state-heavy lifecycle
- Key technical decisions 若有 visual 或 pseudo-code representation 会更易验证
- implementation units 的 approach section 较薄，而 higher-level technical design 能提供 context

**Implementation Units（实现单元）**
- Dependency order 不清晰或可能错误
- 需要 explicit 的 file paths 或 test file paths 缺失
- Units 过大、过 vague，或被拆成 micro-steps
- Approach notes 较薄，或未命名要 follow 的 pattern
- Test scenarios vague（未命名 inputs 和 expected outcomes）、跳过 applicable categories（例如有 failure modes 的 unit 没有 error paths，crossing layers 的 unit 没有 integration scenarios），或与 unit complexity 不成比例
- Feature-bearing units 有空白或缺失 test scenarios（feature-bearing units 需要实际 test scenarios；`Test expectation: none` annotation 仅对 non-feature-bearing units 有效）
- Verification outcomes vague，或未表达为 observable results
- Existing U-IDs 在 unit reorder、split 或 delete 后被 renumbered（U-IDs 是 stable：绝不 renumber existing IDs；删除产生的 gaps 保留；new units 使用下一个 unused number）
- 当 origin 提供 F-ID/AE-ID 时，实现 origin Key Flow 的 unit 未 cite F-ID，或 enforcing origin Acceptance Example 的 unit 未 cite AE-ID

**System-Wide Impact（系统级影响）**
- 受影响的 interfaces、callbacks、middleware、entry points 或 parity surfaces 缺失
- Failure propagation 探索不足
- 相关时缺少 state lifecycle、caching 或 data integrity risks
- cross-layer work 的 integration coverage 较弱

**Risks & Dependencies / Documentation / Operational Notes（风险、依赖、文档与运维说明）**
- Risks 列出但没有 mitigation
- 应有 rollout、monitoring、migration 或 support implications 时缺失
- External dependency assumptions 较弱或未陈述
- 明显适用时缺少 security、privacy、performance 或 data risks

使用 plan 自身的 `Context & Research` 和 `Sources & References` 作为 evidence。如果这些 sections cite 了 pattern、learning 或 risk，但从未影响 decisions、implementation units 或 verification，将其视为 confidence gap。

## 5.3.4 报告并派发 Targeted Research

dispatch agents 前，报告正在 strengthen 哪些 sections 以及原因：

```text
Strengthening [section names] — [brief reason for each, e.g., "decision rationale is thin", "cross-boundary effects aren't mapped"]
```

对每个 selected section，选择最小有用 agent set。**不要**运行每个 agent。每个 section 最多使用 **1-3 agents**，通常总共不超过 **8 agents**。

在 Task calls 中使用 fully-qualified agent names。

**Deterministic Section-to-Agent Mapping（确定性 Section 到 Agent 映射）：**

**Requirements / Open Questions classification（需求与开放问题分类）**
- `ce-spec-flow-analyzer` 用于 missing user flows、edge cases 和 handoff gaps
- `ce-repo-research-analyst`（Scope: `architecture, patterns`）用于 repo-grounded patterns、conventions 和 implementation reality checks

**Context & Research / Sources & References gaps（上下文、研究、来源与引用缺口）**
- `ce-learnings-researcher` 用于 institutional knowledge 和 past solved problems
- `ce-framework-docs-researcher` 用于 official framework 或 library behavior
- `ce-best-practices-researcher` 用于 current external patterns 和 industry guidance
- `ce-web-researcher` 用于 landscape/prior-art gaps：competitor patterns、market signals，或 recommendations 依赖的 unsettled external option set（哪个 library/provider/approach）
- 仅当 historical rationale 或 prior art materially missing 时，添加 `ce-git-history-analyzer`

**Key Technical Decisions（关键技术决策）**
- `ce-architecture-strategist` 用于 design integrity、boundaries 和 architectural tradeoffs
- 当 decision 需要 repo evidence 之外的 external grounding 时，添加 `ce-framework-docs-researcher` 或 `ce-best-practices-researcher`

**High-Level Technical Design（高层技术设计）**
- `ce-architecture-strategist` 用于验证 technical design 是否准确表示 intended approach，并识别 gaps
- `ce-repo-research-analyst`（Scope: `architecture, patterns`）用于将 technical design grounded in existing repo patterns and conventions
- 当 technical design 涉及 DSL、API surface 或受益于 external validation 的 pattern 时，添加 `ce-best-practices-researcher`

**Implementation Units / Verification（实现单元与验证）**
- `ce-repo-research-analyst`（Scope: `patterns`）用于 concrete file targets、patterns to follow 和 repo-specific sequencing clues
- `ce-pattern-recognition-specialist` 用于 consistency、duplication risks 和 alignment with existing patterns
- 当 sequencing 依赖 user flow 或 handoff completeness 时，添加 `ce-spec-flow-analyzer`

**System-Wide Impact（系统级影响）**
- `ce-architecture-strategist` 用于 cross-boundary effects、interface surfaces 和 architectural knock-on impact
- 添加匹配实际 risk 的 specific specialist：
  - `ce-performance-oracle` 用于 scalability、latency、throughput 和 resource-risk analysis
  - `ce-security-sentinel` 用于 auth、validation、exploit surfaces 和 security boundary review
  - `ce-data-integrity-guardian` 用于 migrations、persistent state safety、consistency 和 data lifecycle risks

**Risks & Dependencies / Operational Notes（风险、依赖与运维说明）**
- 使用匹配实际 risk 的 specialist：
  - `ce-security-sentinel` 用于 security、auth、privacy 和 exploit risk
  - `ce-data-integrity-guardian` 用于 migrations、backfills、persistent data safety、constraints、transaction boundaries 和 production data transformation risk（plan context；不是 PR-review 的 `ce-data-migration-reviewer` persona）
  - `ce-deployment-verification-agent` 用于 rollout checklists、rollback planning 和 launch verification
  - `ce-performance-oracle` 用于 capacity、latency 和 scaling concerns

**Agent Prompt Shape（Agent Prompt 形状）：**

对每个 selected section，传入：
- 当 agent 支持 scoped invocation 时，传入上方 mapping 的 scope prefix
- 简短 plan summary
- 精确 section text
- 为什么选择该 section，包括触发了哪些 checklist triggers
- plan depth 和 risk profile
- 要回答的 specific question

指示 agent 返回：
- 能改变 planning quality 的 findings
- 更强的 rationale、sequencing、verification、risk treatment 或 references
- 不要 implementation code
- 不要 shell commands

## 5.3.5 选择 Research Execution Mode

使用能工作的最轻量 mode：

- **Direct mode（直接模式）** - 默认。selected section set 较小，且 parent 可以安全 inline 读取 agent outputs 时使用。
- **Artifact-backed mode（artifact 支撑模式）** - 仅当 selected research scope 足够大，inline returns 会造成不必要 context pressure 时使用。

证明 artifact-backed mode 合理的 signals：
- 超过 5 个 agents 可能返回 meaningful findings
- selected section excerpts 足够长，在多个 agent outputs 中重复会浪费
- topic high-risk，且可能引来 bulky source-backed analysis

如果 artifact-backed mode 没有明显必要，留在 direct mode。

Artifact-backed mode 使用 per-run OS-temp scratch directory。dispatching sub-agents 前创建一次，并捕获其 **absolute path**；将该 absolute path 传给每个 sub-agent，让它们直接写入。不要使用 `.context/`；artifacts 是 per-run throwaway，会在 deepening 结束时清理（见 5.3.6b），符合 repo Scratch Space 对 one-shot artifacts 的约定。不要向 sub-agents 传递未解析的 shell-variable strings；它们需要 resolved absolute path。

```bash
SCRATCH_DIR="$(mktemp -d -t ce-plan-deepen-XXXXXX)"
echo "$SCRATCH_DIR"
```

在本 workflow 剩余部分，将 echoed absolute path 称为 `<scratch-dir>`。

## 5.3.6 运行 Targeted Research

使用上方选择的 execution mode 并行启动 selected agents。如果当前平台不支持 parallel dispatch，则改为 sequentially 运行。dispatch 时省略 `mode` parameter，让用户配置的 permission settings 生效。

优先使用 local repo 和 institutional evidence。只有当 gap 无法从 repo context 或 already-cited sources 负责地关闭时，才使用 external research。

如果某个 selected section 通过更仔细读取 origin document 就能改善，在 dispatching external agents 前先这样做。

**Direct mode（直接模式）：** 让每个 selected agent 直接向 parent 返回 findings。保持 return payload focused：只包含 strongest findings、重要 evidence 或 sources，以及 finding 暗示的 concrete planning improvement。

**Artifact-backed mode（artifact 支撑模式）：** 对每个 selected agent，传入之前捕获的 absolute `<scratch-dir>` path，并指示 agent 在该 directory 中写入一个 compact artifact file，然后只返回 short completion summary。每个 artifact 应包含：target section、why selected、3-7 findings、source-backed rationale、每个 finding 暗示的 specific plan change。不要 implementation code，不要 shell commands。

如果 artifact 缺失或明显 malformed，重新运行该 agent，或对该 section 回退到 direct-mode reasoning。

如果 agent outputs 冲突：
- 相比 generic advice，优先 repo-grounded 和 origin-grounded evidence
- 当冲突涉及 library behavior 时，相比 secondary best-practice summaries，优先 official framework documentation
- 如果仍存在真实 tradeoff，在 plan 中明确记录

## 5.3.6b Interactive Finding Review（仅 Interactive Mode）

在 auto mode 中跳过本步骤；直接进入 5.3.7。

在 interactive mode 中，integration 前向用户呈现每个 agent 的 findings。对每个返回 findings 的 agent：

1. **Summarize the agent and its target section（总结 agent 及其 target section）** — 例如："The ce-architecture-strategist reviewed Key Technical Decisions and found:"
2. **Present the findings concisely（简洁呈现 findings）** — 以 bullets 呈现 key points，而不是 raw agent output。包含足够 context 供用户评估：agent 发现了什么、什么 evidence 支持它、它暗示什么 plan change。
3. **Ask the user**：可用时使用平台 blocking question tool（见 Interaction Method）：
   - **Accept（接受）** — 将这些 findings integrate into the plan
   - **Reject（拒绝）** — 完全 discard 这些 findings
   - **Discuss（讨论）** — 用户想先讨论 findings 再决定

如果用户选择 "Discuss"，围绕 findings 进行简短对话，然后只带 accept/reject 重新询问（第二次询问没有 discuss option）。无论哪种，用户都要做 deliberate choice。

当多个 agents 针对同一 section 返回 findings 时，一次呈现一个 agent，让用户能独立决定。展示前不要合并不同 agents 的 findings。

所有 agents review 完成后，只将 accepted findings 带入 5.3.7。

如果用户没有接受任何 findings，报告 "No findings accepted — plan unchanged." 然后直接进入 Phase 5.4（跳过 document-review 和 synthesis；plan 未修改）。这个 interactive-mode-only skip 不适用于 auto mode；auto mode 总是继续通过 5.3.7 和 5.3.8。无需显式 scratch cleanup；`$SCRATCH_DIR` 是 OS temp，会由 OS 清理；保留它可保存 rejected agent artifacts 以便 debugging。

如果有 findings 被接受且 plan 被修改，按正常流程继续 5.3.7 和 5.3.8；document-review 作为 changes 的 quality gate。

## 5.3.7 综合并更新 Plan

只 strengthen selected sections。保持 plan coherent，并保留整体 structure。

**在 interactive mode 中：** 只 integrate 用户在 5.3.6b 接受的 findings。如果不同 agents 的 findings 触及同一 section，coherently reconcile 它们，但不要重新引入 rejected findings。

Deepening 可以 tighten，而不只是 grow。Section 的强化可以通过删减和添加完成：collapse multi-idea sentences、drop hedges，并直接删除 superseded text，而不是保留 strikethrough 或在上面堆一个 separate "resolutions" layer。更短且 contradiction-free 的 section 更强。这不同于下方仍然禁止的 "rewrite the entire plan from scratch"。

Allowed changes（允许的 changes）：
- Tighten strengthened section 中的 prose：cut hedges、split sentences carrying more than one idea，并 in place remove superseded text（version control holds the history）
- Clarify 或 strengthen decision rationale
- Tighten requirements trace 或 origin fidelity
- 当 sequencing 较弱时 reorder 或 split implementation units；但**绝不要 renumber existing U-IDs**。Reordering 会在新顺序中保留 U-IDs（例如 U1、U3、U5 reordered 是正确的；renumbering to U1、U2、U3 不正确）。Splitting 会将 original U-ID 保留给 original concept，并将下一个 unused number 分配给 new unit。Renumbering 会破坏针对 original IDs 写下的 ce-work blocker 和 verification references
- 添加缺失的 pattern references、file/test paths 或 verification outcomes
- 在有依据时扩展 system-wide impact、risks 或 rollout treatment
- 当 evidence 支持 change 时，在 `Resolved During Planning` 与 `Deferred to Implementation` 之间 reclassify open questions
- 当 work 值得且当前 representation 较弱时，strengthen、replace 或 add High-Level Technical Design section
- 当 unit 的 approach 不明显时，strengthen 或 add per-unit technical design fields
- 当 plan 被 substantively improved 时，在 frontmatter 中 add 或 update `deepened: YYYY-MM-DD`

Do **not（不要）**：
- 添加 implementation code：不要 imports、exact method signatures 或 framework-specific syntax。允许 pseudo-code sketches 和 DSL grammars
- 添加 git commands、commit choreography 或 exact test command recipes
- 到处添加 generic `Research Insights` subsections
- 从头 rewrite 整个 plan
- 在未明确 surface 的情况下 invent new product requirements、scope changes 或 success criteria
- 在 reordering、splitting、deletion 或 "tidying" unit list 时 renumber existing U-IDs。Deepening 是最可能 accidental-renumber 的 vector；即使新顺序用 sequential numbering 看起来更干净，也要保留 U-IDs

如果 research 揭示了应改变 behavior 或 scope 的 product-level ambiguity：
- 不要在这里静默决定
- 将其记录在 `Open Questions` 下
- 如果 gap 真正 product-defining，推荐 `ce-brainstorm`
