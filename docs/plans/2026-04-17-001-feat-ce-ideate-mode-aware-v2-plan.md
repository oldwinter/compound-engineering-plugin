---
title: "feat: ce:ideate v2 — 带 web-researcher 和 opt-in persistence 的 mode-aware ideation"
type: feat
status: active
date: 2026-04-17
origin: docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md
---

# ce:ideate v2 — 带 Web-Researcher 和 Opt-In Persistence 的 Mode-Aware Ideation

## 概览

`ce:ideate` v1 假设 ideation subject 是当前 repository。Phase 1 总是扫描 codebase，rubric 会加权 "groundedness in current repo"，且 skill 总是写入 `docs/ideation/`。这排除了 non-repo use cases（greenfield product ideation、business model exploration、UX/naming/narrative work、personal decisions），也把 persistence 过度耦合到 file system。

v2 让 skill **mode-aware**：保留 repo-grounded ideation 中有效的全部机制，同时将 audience 扩展到 **elsewhere mode**（greenfield product ideation、business model exploration、design/UX/naming/narrative work、personal decisions）。它还新增 `web-researcher` agent，让两个 modes 都能获得 external context（默认 always-on，可为速度 opt-out），用两个新的 universal frames 升级 ideation frame set，并将 persistence 改为 **terminal-first / opt-in**，默认 destination 由 mode 决定（elsewhere 用 Proof，repo 用 `docs/ideation/`）。

**术语说明：** "elsewhere mode" 是本 plan 中的 canonical term。早期 conversation drafts 混用了 "greenfield"、"non-repo" 和 "non-software"；这些术语描述的是 elsewhere-mode use cases 中相互重叠但不完全相同的子集。

让该 skill 好用的机制，即 generate many → adversarial critique → present survivors with reasons，保持不变。只有 grounding、frames 和 persistence 变成 mode-variable。

---

## 问题框架

**Conversation 中暴露出的 v1 limitations：**

- Skill description 写着 "for the current project"，Phase 1 是 mandatory codebase scan，rubric 明确加权 repo groundedness；elsewhere-mode subjects 没有 escape hatch（见 origin: `docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md`）。
- 在任意 repo 中运行 `/ce:ideate pricing model for a new SaaS` 的 user 会得到受 codebase 污染的 grounding，并被一个惩罚不绑定当前 repo ideas 的 rubric 评估。
- Handoff 前 persistence 是 mandatory（`Phase 5: Always write or update the artifact before handing off`），即使 user 只想在 conversation 中探索，也会被强制 file write。
- v1 明确将 external research defer 为 future enhancement（origin scope boundary: "The skill does not do external research ... in v1"）。对于 elsewhere mode，user-supplied context 是唯一 grounding，此时 external research 不再是 optional，而是 load-bearing。

**v2 expansion 支持的 audience（全部为 elsewhere-mode use cases）：**

- 正在 ideate 尚未 build 的 widget/interaction concepts 的 designers
- 探索 pricing、business models、product directions 的 PMs/founders
- 处理 naming、narrative beats、positioning 的 writers/creatives
- 在 codebase 中工作但 ideate 无关主题的任何人
- 既有 repo-grounded users（repo path 不回退）

---

## 需求追踪

本 plan 必须满足的 numbered requirements。继承适用的 v1 requirements（origin doc 中 R-prefix），并新增 v2-specific requirements（V-prefix）。

**从 v1 origin 继承（v2 中不变）：**
- R4. 保留 Generate many → critique → survivors mechanism
- R5. 使用 adversarial filtering，并给出明确 rejection reasons
- R6. 展示 survivors，并包含 description、rationale、downsides、confidence、complexity
- R7. 简短 rejection summary
- R10. Presentation 后的 handoff options：brainstorm、refine、share to Proof、end
- R11. Acting on an idea 时始终 route to `ce:brainstorm`
- R13. Resume behavior：检查 `docs/ideation/` 中 recent docs（v2 中仅 repo mode）
- R14. 写 artifact 前先 present survivors
- R16. 按 intent 路由 refinement（more ideas / re-evaluate / dig deeper）
- R17. Agent intelligence 支持 prompt mechanism，而不替代它
- R22. Orchestrator owns final scoring；sub-agents 只 emit local signals

**v2 新增：**

- V1. Phase 0 基于 prompt + topic-repo coherence + CWD signals 将 ideation **subject** 分类为 `repo-grounded` 或 `elsewhere`。Mode classification 结构上是 **two sequential binary decisions**：(a) repo-grounded vs elsewhere；(b) 对 elsewhere，再分 software vs non-software（后者 route 到 `references/universal-ideation.md`）。两个 decision points 都应用 negative-signal enumeration。Agent 用一句话说明 inferred mode；ambiguous prompts（signals 真冲突，或 single-keyword/short-prompt invocation 能 cleanly map 到任一 mode）先问一个 confirmation question，再 dispatch grounding。
- V2. Phase 0 light context intake（仅 elsewhere mode）应用 **discrimination test**：如果将一块 context 换成 contrasting alternative，会不会 materially change 哪些 ideas survive？默认 proceed；只有 context fail 该 test 时，才问 1-3 个 narrowly chosen questions。遇到 dismissive responses 停止追问；把真正的 "no constraint" answers 当作有效 answers。
- V3. 新 agent `web-researcher` 执行 iterative web search + fetch，并返回 structured external grounding（prior art、adjacent solutions、market signals、cross-domain analogies）。Tools: WebSearch + WebFetch。Model: Sonnet。可跨 skills reuse。
- V4. `web-researcher` 遵循 phased search budget：scoping（2-4）→ narrowing（3-6）→ deep extraction（3-5 fetches）→ gap-filling（1-3），带 soft ceilings（约 15-20 searches、约 5-8 fetches）和 early-stop heuristic（当 marginal queries 主要返回 redundant findings 时停止）。
- V5. Phase 1 对两个 modes 都 always-on dispatch `web-researcher`。User 可用 "no external research" / "skip web research" 等短语跳过。
- V6. Phase 1 grounding 是 mode-aware：repo-mode dispatch v1 codebase scan + learnings + optional issues；elsewhere-mode 跳过 codebase scan，并把 user-supplied context 作为 primary grounding。两个 modes 都始终运行 learnings-researcher 和新的 web-researcher。
- V7. Phase 2 对两个 modes dispatch **6 always-on frames**：pain/friction、inversion/removal/automation、assumption-breaking/reframing、leverage/compounding、**cross-domain analogy（new）**、**constraint-flipping（new）**。Per-agent target 从 8-10 ideas 降到 6-8 ideas，使 raw output volume 与 v1 可比。
- V8. Phase 3 rubric phrasing 从 "grounded in current repo" 改为 "grounded in stated context"：mode-neutral wording，mechanism 相同。
- V9. Persistence 改为 **terminal-first and opt-in**。Terminal review loop 是完整 end state；refinement loops 在 conversation 中进行，不产生 file 或 network cost。只有 user 明确选择 save、share 或 hand off 时才触发 persistence。
- V10. Persistence defaults 是 **mode-determined**：repo-mode 默认 `docs/ideation/`（保留 v1 behavior），elsewhere-mode 默认 Proof。任一 mode 也可按 request 使用另一个 destination。
- V11. Proof failure ladder，**orchestrator-side**：proof skill 自身会在 `STALE_BASE`/`BASE_TOKEN_REQUIRED` 上内部 single-retry-once，然后 surface failure（通过 `report_bug` 或 returned status）。ce:ideate orchestrator 在 proof skill invocation 外包一层 **one additional best-effort retry**（single retry，约 2s pause）；它不从 skill 外部尝试 classify error types，因为 proof skill 的 contract 今天不向 callers surface error classes。persistent failure（从 orchestrator 视角 proof skill 两次返回 failure）后，通过平台 question tool 展示 fallback menu。Fallback options 和 partial-URL surfacing 在 Unit 6 详述。2-vs-3 option count 记录在 Open Questions；implementation 时确定一个 wording，避免重新争论。
- V12. Cost transparency：orchestrator 每次 invocation 简短 disclosure agent dispatch count，让 multi-agent cost 不再隐形。Skip-phrases（web research、slack 等）降低 dispatch count。Phrasing format 和 placement defer 到 implementation（见 Open Questions）。
- V13. 新 file `references/universal-ideation.md` 提供 parallel non-software facilitation reference，镜像 `ce-brainstorm/references/universal-brainstorming.md` 的形状。在 elsewhere-mode 且 topic 是 non-software 时加载。
- V14. `web-researcher` 是 named agent（agent file in `agents/research/web-researcher.md`），不是 inline frame，因此可被 `ce:brainstorm`、future skills 和 direct user invocation reuse。跨其他 skills 的 reuse defer（见 Scope Boundaries）；named-agent decision 主要由 tool scoping、model pinning、discoverability 和 stable output contract 支撑，reuse 是 forward-looking，不是今天的 load-bearing 理由。
- V15. **Session-scoped web-research reuse via sidecar cache file:** orchestrator 将每次 `web-researcher` result persist 到 `.context/compound-engineering/ce-ideate/<run-id>/web-research-cache.json`。Cache key 为 `{mode, focus_hint_normalized, topic_surface_hash}`。每次 Phase 1 dispatch 前，orchestrator 先检查 `.context/compound-engineering/ce-ideate/*/web-research-cache.json` 下的所有 cache files（跨 run-ids：同一 session 内 refinement loops 按 topic reuse，而不是按 run-id），找到 matching entry 就 reuse。reuse 触发时，提示 "Reusing prior web research from this session — say 're-research' to refresh." User override "re-research" 会删除 matching cache entry 并重新 dispatch。**Graceful degradation:** 如果当前平台的 orchestrator 无法跨 turns 读取 prior tool-results（Unit 4 implementation 期间通过尝试 sidecar cache read，并确认后续同 session skill invocations 中 file 可读来验证），V15 降级为 "no reuse, dispatch every time"，并在 consolidated grounding summary 中注明。这样可限制 rapid refinement loops 反复支付完整约 15-20 search budget 的 iteration-cost failure mode，同时不虚构一个可能不存在的平台能力。
- V16. **Active mode confirmation on ambiguous prompts:** 当 mode classifier confidence 低（single-keyword invocations、short prompts cleanly map 到任一 mode、CWD/prompt signals 冲突）时，orchestrator 在 dispatch Phase 1 grounding 前问一个 confirmation question。清晰 case 默认只用 cheap one-sentence inferred-mode statement；explicit confirmation 只用于 ambiguity，避免把 multi-agent dispatch 烧在错误 mode 上。
- V17. **Auto-compact safety with two checkpoints:** Phases 1-2（multi-agent grounding + 6-frame ideation dispatch）是最长、最贵的 stages；只保护 post-filter Phase 4 state 是表演。orchestrator 在 `.context/compound-engineering/ce-ideate/<run-id>/` 下写两个 checkpoints：(a) `raw-candidates.md` 在 Phase 2 merge/dedupe 完成后立即写入（在 Phase 3 critique 前保留昂贵 multi-agent output），(b) `survivors.md` 在 Phase 4 survivors presentation 前立即写入（在 user 到达 persistence menu 前保留 post-critique survivor list）。二者都不是 durable artifact（由 V9-V11 管理）。它们都是 best-effort：write fail（disk full、perms）时 log warning 并继续；checkpoints 不 load-bearing。Phase 6 完成（任一路径）后一起 cleanup，除非 user 选择 inspect。若当前平台不能使用 `.context/` namespacing，则按 repo Scratch Space convention fallback 到 `mktemp -d`。Resume 时 orchestrator 可通过 `.context/compound-engineering/ce-ideate/*/survivors.md` glob 检测 checkpoint，但 auto-resume from partial checkpoint 不在 v2 scope：V17 防止 *silent* loss，而不是实现 lost-work recovery。

---

## 范围边界

- **不改变 v1 mechanism。** Many → critique → survivors 保持。Sub-agent fan-out 保持。Resume behavior 保持。Handoff to `ce:brainstorm` 保持。
- **不新增 persona-style ideation agents。** Frames 仍按 origin R18 由 prompt 定义，并通过 anonymous Phase 2 sub-agents dispatch。Reasoning：named personas 会固化为 stereotypes；frames 保持 flexible。
- **不使用 keyword-driven mode rules。** Mode classification 依赖 agent 对 prompt + signals 的 reasoning，镜像 `ce:brainstorm` Phase 0.1b 的 approach。
- **不对 Phase 3（adversarial filtering）或 Phase 4（presentation）做结构性修改**，除了 V8 中的 rubric phrasing change。
- **不自动混合 grounding sources。** Hybrid topics（"ideate pricing for our open-source CLI"）默认 mode-pure（elsewhere）；如果 user 需要 repo facts，会自行作为 context 提供。

### 推迟到单独任务

- **Per-skill cost surfacing UI/UX 标准化。** V12 的 "disclose dispatch count" 这里只适用于 ce:ideate。跨所有 multi-agent skills（`ce:plan`、`ce:review` 等）的 broader convention 值得单独做。
- **在其他 skills 中采用 `web-researcher`。** 本 plan 创建 agent 并在 ce:ideate 中使用。将其接入 `ce:brainstorm`、`ce:plan` external research stage 和其他 future consumers 的工作放在 follow-up PRs。
- **Linear/Jira issue intelligence integration。** Origin issue-intelligence requirements（`docs/brainstorms/2026-03-16-issue-grounded-ideation-requirements.md`）已 defer。v2 不改变它。
- **Frame quality measurement。** learnings researcher 指出 ideation frame design 没有 captured prior art。v2 ships 之后 capture 一个 `docs/solutions/skill-design/` learning 在 scope；formal frame-quality study 不在 scope。

---

## 上下文与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-ideate/SKILL.md`：当前 v1 implementation；Phase 1 codebase scan dispatch 约从 line 96 开始
- `plugins/compound-engineering/skills/ce-ideate/references/post-ideation-workflow.md`：当前 Phase 3-6 spec；要重写 persistence 和 handoff logic
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md:59-71`：Phase 0.1b "Classify Task Domain"；要镜像的 mode classification pattern
- `plugins/compound-engineering/skills/ce-brainstorm/references/universal-brainstorming.md`：要为 `universal-ideation.md` 镜像的 56-line shape
- `plugins/compound-engineering/agents/research/ce-learnings-researcher.agent.md`：frontmatter 和 structure exemplar（mid-size，约 9.6K）
- `plugins/compound-engineering/agents/research/ce-issue-intelligence-analyst.agent.md`：methodology + tool guidance + integration points pattern（约 13.9K）
- `plugins/compound-engineering/agents/research/ce-slack-researcher.agent.md`：`model: sonnet` 范例；precondition-check pattern
- `plugins/compound-engineering/skills/proof/SKILL.md`：Proof skill API 和 HITL handoff contract；line 3 已命名 ce:ideate 为 consumer

### 机构经验

- Classification pipeline invariants（general）：按 action 所在的同一 scope classify；任何 broadening step 后 re-evaluate；enumerate negative signals（不只列 positive）。应用到 V1 mode classifier。
- `docs/solutions/skill-design/research-agent-pipeline-separation.md`：research agents 必须按 information type 分类，并只从 matching pipeline stage dispatch。应用：`web-researcher` 服务 grounding（Phase 1），不是 generation（Phase 2）。
- `docs/solutions/best-practices/codex-delegation-best-practices.md`：评估 "always-on" defaults 的 token-economics method。Implication：V12 cost transparency 存在，是因为 always-on web-research 有值得 disclosure 的真实 overhead。
- `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`：instruction phrasing 会显著影响 tool-call count（同一 task 14 vs 2）。Implication：`web-researcher` prompt 稳定前应使用 stream-json benchmark。
- `docs/solutions/skill-design/compound-refresh-skill-improvements.md`：explicit opt-in 优于 auto-detection。应用到 V11 Proof failure ladder：不要从 environment 推断 "terminal-only is fine"；要明确询问。
- `docs/solutions/skill-design/script-first-skill-architecture.md`：当 judgment 不是 load-bearing 时，将 deterministic work 推给 scripts。本 plan 不直接适用，但任何 future `web-researcher` triage logic 应记住这一点。

**暴露出的 documentation gaps:** 没有 prior learnings 覆盖 (a) mode classification heuristics generally，(b) web research agents，(c) Proof integration patterns/fallbacks，(d) ideation frame design。从这次 v2 build 中 capture learnings 是 follow-up scope。

### 外部参考

- [How we built our multi-agent research system — Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)：multi-agent systems 使用约 15× chat tokens；用于 budgets 的 "scale effort with task complexity" framing；parallel sub-agent dispatch（并行 sub-agent 分发）
- [Claude Sonnet vs Haiku 2026: Which Model Should You Use?](https://serenitiesai.com/articles/claude-sonnet-vs-haiku-2026)：Sonnet 用于 multi-source synthesis；Haiku 用于 single-source extraction（单源提取）
- [Claude Benchmarks (2026): Every Score for Opus 4.6, Sonnet 4.6 & Haiku](https://www.morphllm.com/claude-benchmarks)：Sonnet 用于 `web-researcher` 的 pricing/perf justification（价格/性能论证）
- [From Web Search towards Agentic Deep ReSearch (arxiv)](https://arxiv.org/html/2506.18959v1)：frontier/explored query model（frontier/explored 查询模型）
- [Deep Research: A Survey of Autonomous Research Agents (arxiv)](https://arxiv.org/html/2508.12752v1)：分阶段 iterative pattern（broad → narrow → extract → gap-fill）
- [EigentSearch-Q+ (arxiv)](https://arxiv.org/html/2604.07927)：query decomposition 与 gap-filling architecture

---

## 关键技术决策

- **基于 subject 做 mode classification，而不是基于 environment。** CWD repo presence 是 weak signal；prompt 是 strong signal。user 在 Rails repo 中可以 ideate future product pricing，在 `/tmp` 中也可以 ideate 脑中的 code。（见 origin: conversation alignment，镜像 `ce:brainstorm` 0.1b approach。）
- **使用两个 modes，而不是三个。** "Adjacent greenfield"（existing app 的 new feature）可 cleanly collapse 到 repo-grounded，因为 repo 是 constraint set，即使 feature 是新的。Three-bucket modes 增加 ceremony 而不增加 insight。
- **用 discrimination test 做 intake gating。** "Would swapping one piece of context change which ideas survive?" 比 "do you have enough?" 更 sharp，因为它测试 context 是否 *load-bearing*，而不只是 present。替代 rote "ask 4 standard questions" pattern。
- **两个 modes 都让 6 个 frames always-on。** 当前四个 frames 在 creative/business/UX domains 中比初始直觉更稳（inversion 适用于 plot/pricing/UX；leverage 适用于任意 domain 中的 compounding choices）。不做 mode-asymmetric frame sets，而是 universally dispatch all six。Cost increase 有界；predictability 和 simplicity 的收益真实。
- **将 per-agent idea target 从 8-10 降到 6-8。** 在增加两个 frames 的同时，将 raw-idea volume 保持在与 v1 相同量级（约 36-48），让 dedupe 和 adversarial filter load 可管理。
- **`web-researcher` 使用 Sonnet。** 2026 benchmarks 确认 Sonnet 擅长 multi-source synthesis；Opus 只在 expert-reasoning benchmarks（GPQA Diamond）上拉开 meaningful gap，而 web research 不是该任务；Haiku 不擅长 cross-source synthesis。Pricing 让 Sonnet 成为唯一 economically viable always-on choice。
- **`web-researcher` 使用 phased search budget，而不是 fixed query counts。** "Scale effort with task complexity" 是 Anthropic 自己的 framing。固定 counts（conversation 最初提出的 5-8）对一轮 broad scoping 太低；真正 deep research 是 iterative。
- **`web-researcher` 是 named agent，而不是 inline frame。** 主要理由是 tool scoping（WebSearch + WebFetch only）、explicit model pinning（`model: sonnet`）、agent roster 中的 discoverability，以及 stable output contract。跨其他 skills 的 reuse（ce:brainstorm、future ce:plan external-research stage）已 defer，因此只是 forward-looking，不是今天的 load-bearing 理由。但这四个 structural reasons 已足以 justify agent file。Phase 2 ideation sub-agents 保持 anonymous，因为它们与 skill tightly coupled。
- **Terminal-first opt-in persistence。** 大多数 ideation sessions 是 exploratory，并且完全可以 no artifact 结束。v1 的 "always write before handoff" rule 混淆了 handoff 与 end-of-session。拆分后：只有 user 想要 persistence 时才 write/share；conversation-only 是 first-class end state。
- **Persistence defaults 由 mode 决定，而不是由 user-configured。** Repo-mode 默认 file（保留 v1）；elsewhere-mode 默认 Proof（没有自然 file home）。User 在 Phase 6 总能 override（"save to file even though this is elsewhere"）。这比每次都询问更干净。
- **Proof failure 会 surface real options。** 不要 silent fall through to file；不要无限 retry loop。在 proof skill 自己的内部 retry-once 之上，orchestrator 做 single best-effort retry 后，surface fallback menu，让 user 显式选择 next step。最终 option count（2 vs 3）和 exact labels 留给 Open Questions 中的 maintainer judgment；design commitment 是 "ask, don't infer"，不是某个特定 option count。

---

## 开放问题

### 规划期间已解决

- **External research 应该 opt-in 还是 always-on？** 已解决：两个 modes 都 always-on。Ideation 是 exploratory；users 最不适合判断 external context 是否有帮助。提供 skip-phrase 以提速。
- **两个新 frames 应该 flexible/per-topic 还是 always-on？** 已解决：两个 modes 都 always-on。Per-topic flexibility 强迫 agent 做 frame-selection decision，而 agent 经常会错；predictability 比 adaptive selection 更有价值。
- **`web-researcher` 应该使用 Sonnet 还是 Haiku？** 已解决：Sonnet。已用 2026 benchmarks 验证：multi-source synthesis 是 Sonnet 的 domain。
- **`web-researcher` 的 search budget 应该多大？** 已解决：phased（scoping 2-4 / narrowing 3-6 / extraction 3-5 fetches / gap-filling 1-3），soft ceilings（约 15-20 searches、约 5-8 fetches），early-stop heuristic。
- **`web-researcher` 应该是 named agent 还是 inline？** 已解决：named agent。Reusability 和 tool scoping justify 它。
- **mode 应如何 classify？** 已解决：agent 根据 prompt + signals infer，在顶部一句话说明，只在 conflict 时提问。
- **elsewhere mode 的 artifact 放哪里？** 已解决：Proof default；Proof failure 或 user request 时 file fallback。
- **in-conversation refinement loop 怎么办？** 已解决：terminal-first；persistence opt-in；conversation-only is fine。
- **elsewhere mode 的 intake question pattern 是什么？** 已解决：discrimination test，不用 rote template，基于 user-provided context，dismissive answers 后停止。

### 推迟到实现阶段

- **`web-researcher` system prompt 的准确措辞。** 会按 `pass-paths-not-content` learning 使用 `claude -p --output-format stream-json --verbose` benchmark。初始 draft 基于 existing research-agent patterns；观察 tool-call counts 后 refine。
- **`references/universal-ideation.md` 应该 near-clone `universal-brainstorming.md`，还是 substantially different。** Shape 会镜像（scope tiers、generation techniques、convergence、wrap-up menu），但 wrap-up 专门 route 到 ideation outputs（top-N candidate list），而不是 brainstorm outputs（chosen direction）。最终结构在 writing 时决定。
- **Phase 0.x 的准确 numbering。** 当前 Phase 0 有 0.1（resume）和 0.2（interpret focus and volume）。Mode classification + intake 插入其间。最终 numbering（0.1b vs 0.3 vs renumber）在 edit 时决定。
- **Mode-classification statement format。** 一句话 mode statement 的具体 phrasing（例如 "Reading this as repo-grounded ideation about X" vs "Treating this as elsewhere ideation focused on Y"）在 draft 时确定。
- **Cost-transparency line 的 phrasing 和 placement。** 是用 agent count（"This will dispatch 9 agents"）、wall-clock estimate（"~30s"），还是 token/dollar estimate；line 是出现在 mode-classification confirmation 前（便于 users 在回答前 opt out），还是之后（count 更 mode-accurate）。Defer to implementation；选一个并在 modes 间保持一致。
- **Active-confirmation question wording。** 当 V16 的 ambiguous-mode confirmation 触发时，exact stem 和 option labels 要遵循 AGENTS.md "Interactive Question Tool Design" rules（self-contained labels、max 4、third person、front-loaded distinguishing words）。在 edit 时决定。

### 提供给 Maintainer 判断（document review 中被质疑）

这些在 conversation 中已 resolved，但 reviewers 提出过 non-trivial counterarguments。记录在这里，让 future-us（或 follow-up PR）能 deliberate revisit，而不是 accidental drift：

- **`universal-ideation.md` 作为 full mirror vs routing stub。** Plan 创建一个约 60-line parallel facilitation reference，镜像 `universal-brainstorming.md`。Reviewer challenge：这从第一天就 fork（wrap-up menu 已 divergence），且无 enforcement mechanism，会带来 maintenance-sync burden。更窄的 stub design（只有 routing rule + grounding override + mode-neutral rubric phrasing，将 6 frames 留在 SKILL.md）能避免 divergence problem。Maintainer 选择 full mirror，因为 parallel facilitation references 是 established pattern；若 sync drift 成为真实成本，再 revisit。
- **Proof failure ladder：3 options vs 2。** Plan 指定 retry 2-3× 后展示 3-option fallback menu（file save / custom path / skip）。Reviewer challenge：单个 fallback（"save locally or skip?"）覆盖 common case；custom-path option 在 error-path 中引入自身 edge handling。Maintainer 选择 3 options，因为 explicit choice 尊重 user effort；如果 custom-path branch 实践中很少使用，再 revisit。
- **是否移除 constraint-flipping（使用 5 frames 而非 6）。** Plan 添加 cross-domain analogy 和 constraint-flipping。Reviewer challenge：constraint-flipping 在结构上是 assumption-breaking/reframing 的 special case，frame overlap 会产生 thematic collisions。Maintainer 选择两者都保留，因为 conversation testing 中它们产生了不同 idea types；如果 Phase 3 dedupe 经常 merge 这两个 frames，再 revisit。
- **Frame-quality measurement gap。** 没有 v1 survivor quality baseline，意味着 v2 的 "capture as a learning" risk mitigation 没有比较对象；regression detection 依赖 maintainer vibe。Reviewer challenge：轻量 measurement（例如对 10 个 representative ideation runs 做 pre/post-v2 manual scoring）能闭环。Maintainer 选择 defer measurement，因为目前没有 measurement infrastructure；若 v2 survivors visibly degrade，再 revisit。

---

## 实施单元

> **耦合说明：** Units 3、4、5 都修改同一 file（`plugins/compound-engineering/skills/ce-ideate/SKILL.md`），并共享 structural decisions：phase numbering（Unit 3 defer numbering to edit time）、dispatch-list format（Unit 4 reference Unit 3's cost-transparency line）、grounding-summary schema（Unit 5 假设 Unit 4 的 "structural shape preserved"）。**Units 3-5 应作为 single PR、single author ship。** 拆成多个 PR 会在 moving target 上制造 rebase pain，并重新争论 phase numbering。Unit 6 也触及 `references/post-ideation-workflow.md` 并 cross-reference SKILL.md 中的 Phase 0.1，因此要么与 Units 3-5 PR 协调，要么在 Unit 3 numbering settle 后 sequence。

- [ ] **Unit 1：创建 `web-researcher` agent**

**目标：** 向 `agents/research/` roster 添加 reusable、mode-agnostic web research agent。为 ideation 和后续其他 skills 返回 structured external grounding（prior art、adjacent solutions、market signals、cross-domain analogies）。

**需求：** V3, V4, V14

**依赖：** 无

**文件：**
- 新增： `plugins/compound-engineering/agents/research/ce-web-researcher.agent.md`
- 修改： `plugins/compound-engineering/README.md`（添加 row 到 research agents table；更新 agent count：当前 count 是 49，添加 `web-researcher` 跨过 50+ threshold，**README count update required, not conditional**）

**方法：**
- 遵循 `learnings-researcher.md` 和 `slack-researcher.md` 的结构：frontmatter（`name`、以 verb + "Use when..." 写的 `description`、`model: sonnet`）、opening "You are an expert ... Your mission is to ..." paragraph、带 phased steps 的 numbered `## Methodology`、`## Tool Guidance`、`## Output Format`、`## Integration Points`。
- **Frontmatter tools field:** 在 frontmatter 中声明 `tools: WebSearch, WebFetch`：agents 使用 comma-separated `tools:` string form（已对照 `agents/review/*.md` 验证，例如 `agents/review/correctness-reviewer.md:5` 使用 `tools: Read, Grep, Glob, Bash`）。不要使用 `allowed-tools:`（这是 *skill* frontmatter format），也不要使用 array form `["WebSearch", "WebFetch"]`。`agents/research/` 中的 existing research agents 今天没有声明 tool restrictions，但 tool-restricted reusable agent 应在 structural level enforce restriction，避免被其他 skills adopt 时意外继承更宽 tool surface。
- Frontmatter `description`：以 "Performs iterative web research..." 开头；"Use when ideating outside the codebase, validating prior art, scanning competitor patterns, finding cross-domain analogies, or any task that benefits from current external context. Prefer over manual web searches when the orchestrator needs structured external grounding."
- Methodology 编码 phased budget：Step 1 Scoping（2-4 broad queries to map the space）、Step 2 Narrowing（基于 Step 1 findings 的 3-6 targeted queries）、Step 3 Deep Extraction（3-5 fetches of high-value sources）、Step 4 Gap-Filling（synthesis 发现 holes 时 1-3 follow-ups）。Soft caps：约 15-20 total searches、约 5-8 fetches。当 marginal queries 返回大多 redundant findings 时 stop。**Budget 是 prompt-enforced，不是 rate-limited**：当前平台没有 sub-agents harness-level tool-call cap。early-stop heuristic 和 phased structure 是 advisory；首次 implementation 后按 `pass-paths-not-content` learning benchmark actual tool-call counts。
- Tool Guidance section 限定 WebSearch + WebFetch；按 AGENTS.md "Tool Selection in Agents and Skills" rule 明确禁止 shell-based web tools 和 inline pipes。
- Output Format 镜像其他 research agents：concise structured summary，sections 包含 prior art、adjacent solutions、market/competitor signals、cross-domain analogies、带 URLs 的 source list。
- 集成 Points 列出 ce:ideate 作为 initial consumer；注明 ce:brainstorm 和 ce:plan 之后可 adopt。
- README update：在 research agents table 中按字母位置添加 row（after `slack-researcher`）；更新 component count table 中的 agent count（49 → 50，跨过 50+ threshold）。

**遵循的模式：**
- `plugins/compound-engineering/agents/research/ce-learnings-researcher.agent.md`：frontmatter、中等体量 structure
- `plugins/compound-engineering/agents/research/ce-slack-researcher.agent.md`：`model: sonnet` 范例、precondition pattern、tool guidance
- `plugins/compound-engineering/agents/research/ce-issue-intelligence-analyst.agent.md`：带 ~Step N structure 的 phased methodology

**测试场景：**
- 正常路径：agent file 通过 `bun test tests/frontmatter.test.ts`（YAML strict-parses，required fields present）。
- 正常路径：`bun run release:validate` succeeds（note：validator 只检查 plugin.json/marketplace.json description+version drift；不 validate agent registration 或 README counts；这些在下面 manual verify）。
- 集成：从 test ce:ideate dispatch 中对真实 topic invoke agent，返回 phased-budget bounds 内的 structured response（manual smoke test，非 CI automated）。
- 边界情况：agent dispatch 的 topic 外部信号稀疏（例如高度 internal/proprietary）时，应报告 "limited external signal found"，并在 early-stop heuristic 内 clean exit，不 exhaust search budget。
- 边界情况：dispatch agent 时 WebSearch/WebFetch 不可用，应在 Step 1 precondition check 检测 tool absence，返回明确 unavailability message 并 stop（镜像 `slack-researcher.md:25` precondition pattern）。
- 边界情况：同一 conversation 中同一 topic 第二次 dispatch agent：orchestrator 应按 V15 skip second dispatch（在 Unit 4 的 orchestrator level verify，不在 agent 内）。

**验证：**
- New agent file present，frontmatter test passes，**manually confirmed** 已列在 README research-agents table 中且 alphabetical position 正确，count incremented（49 → 50）
- `bun run release:validate` passes（不捕获 README drift；见 scope note）
- Manual smoke：agent 对 representative ideation topic（"pricing models for an open-source dev tool"）返回 phased budget 内的 structured external grounding

---

- [ ] **Unit 2：创建 `references/universal-ideation.md`**

**目标：** 为 ce:ideate 提供 parallel non-software facilitation reference，镜像 `ce-brainstorm/references/universal-brainstorming.md`。当 topic 是 non-software 时加载，避免 skill 将 software-flavored ideation phases 应用到 band names、plot beats 或 business decisions。

**需求：** V13

**依赖：** 无（独立于 Unit 1，可 parallel build）

**文件：**
- 新增： `plugins/compound-engineering/skills/ce-ideate/references/universal-ideation.md`

**方法：**
- 目标约 60 lines，镜像 `universal-brainstorming.md` shape
- Header：明确 instruction："this replaces software ideation phases — do not follow Phase 1 codebase scan or Phase 2 software frame dispatch"
- `## Your role`：divergent thinker 立场、tone-matching
- `## How to start`：quick scope tier（give them ideas now）、standard scope（light intake then ideate）、full scope（rich intake、multiple frames、deep critique）。Single-question intake pattern（discrimination-test driven，不 rote）
- `## How to generate`：适用于 non-software contexts 的 frames：friction（pain）、inversion、assumption-breaking、leverage、cross-domain analogy、constraint-flipping。与 software path 相同六个 frames，但使用 domain-agnostic language 描述。注明 frames 是 starting biases，不是 constraints
- `## How to converge`：使用 mode-neutral rubric（"grounded in stated context"）的 adversarial critique、5-7 个 survivors、简短 rejection summary
- `## When to wrap up`：适配 ideation 的 post-presentation menu：brainstorm a chosen idea / refine ideas / save to Proof / save to local file / done in conversation。镜像 elsewhere-mode persistence defaults。

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-brainstorm/references/universal-brainstorming.md`：整体结构
- Conversational、imperative tone；按 AGENTS.md writing-style rules 尽量避免 second person

**测试场景：**
- 正常路径：file exists，valid markdown，无 broken backtick references
- 边界情况：从 ce:ideate SKILL.md 通过 backtick path reference（不是 `@`-inclusion），所以只在 elsewhere-mode + non-software detected 时按需加载
- Content quality 无 automated test surface：manual reading review

**验证：**
- File 存在于正确 path
- Unit 3 中从 SKILL.md routing block 通过 backtick path reference

---

- [ ] **Unit 3：SKILL.md — Phase 0 mode classification 与 intake**

**目标：** 向 ce:ideate 添加 Phase 0.x block：(a) 将 subject mode 分类为 repo-grounded vs elsewhere，并采用 **two sequential binary decisions**；(b) 将 non-software elsewhere-mode invocations route 到 `references/universal-ideation.md`；(c) 对 elsewhere-mode software topics 通过 discrimination test gate light context intake；(d) 对 ambiguous-mode classifications 进行 active confirmation，而不是 silent。

**需求：** V1, V2, V12, V13, V16

**依赖：** Unit 2（routing target 必须存在）

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-ideate/SKILL.md`

**方法：**
- 将 Phase 0.x 插入当前 Phase 1（Codebase Scan）之前，在 existing 0.1（Resume）和 0.2（Focus and Volume）blocks 之后。可能 numbering：将当前 0.2 rename 为 0.3，插入新 mode classifier 为 0.2；或追加为 0.3 并 shift focus/volume。edit 时根据 flow 决定。
- **Mode classifier** 是两个 sequential binary decisions，且各自有 negative-signal enumeration：
  - Decision 1：repo-grounded vs elsewhere。Positive signals：prompt references repo files/code/architecture；topic clearly bounded by current codebase。Negative signals：prompt references repo 中不存在的 things（pricing、naming、narrative、business model）。三个按强度排序的 inputs：(1) prompt content，(2) topic-repo coherence，(3) CWD repo presence 仅作为 supporting evidence。
  - Decision 2（仅当 Decision 1 = elsewhere 时触发）：software vs non-software。non-software 的 positive signals：topic 是 creative、business、personal 或无 code surface 的 design。Routes non-software to `references/universal-ideation.md`。
- 顶部用一句话 state inferred mode："Reading this as [repo-grounded | elsewhere-software | elsewhere-non-software] ideation about X — say 'actually [other-mode]' to switch."
- **V16 active confirmation on ambiguity:** 当 classifier confidence 低时，即 single-keyword/short prompts cleanly map 到任一 mode（`/ce:ideate ideas`、`/ce:ideate ideas for the docs`）、CWD/prompt signals 冲突、或 topic 同时提到 repo-internal 和 external surfaces，在 dispatch Phase 1 grounding 前通过平台 blocking question tool 问一个 confirmation question。Question stem 和 option labels 必须遵循 AGENTS.md "Interactive Question Tool Design" rules（self-contained labels、max 4、third person、front-loaded distinguishing word、no anaphoric references、no leaked internal mode names）。Sample wording（按 Open Questions 在 edit 时 refine）：stem "What should the agent ideate about?"；options "Code in this repository — features, refactors, architecture"、"A topic outside this repository — business, design, content, personal decisions"、"Cancel — let me rephrase the prompt"。清晰 case 只需 one-sentence inferred-mode statement。
- Light context intake block（仅 elsewhere-mode software topics）："Apply the discrimination test before asking anything: would swapping one piece of the user's context for a contrasting alternative materially change which ideas survive? If yes, you have grounding — proceed. If no, ask 1-3 narrowly chosen questions, building on what the user already provided rather than starting over. Default to free-form; use single-select only when the answer space is small and discrete (e.g., genre, tone). After each answer, re-apply the test before asking another. Stop on dismissive responses; treat genuine 'no constraint' answers as real answers."
- 应用 learnings 中的 classification-pipeline invariants：classify on the same scope you act on；如果 0.x 中发生 prompt-broadening，之后 re-evaluate。
- 包含 cost-transparency notice（V12）：一行列出将 dispatch 的 agents。Mode-aware：exact phrasing、format（count vs time vs cost），以及该 line 出现在 V16 confirmation 前还是后，defer 到 implementation（见 Open Questions）。Repo-mode example："Will dispatch ~9 agents: codebase scan + learnings + web-researcher + 6 ideation sub-agents. Skip phrases: 'no external research', 'no slack'." Elsewhere-mode example："Will dispatch ~8 agents: context synthesis + learnings + web-researcher + 6 ideation sub-agents."

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md:59-71`：Phase 0.1b classifier mechanism（三个 buckets：software / non-software / neither；routing rule）
- AGENTS.md "Cross-Platform User Interaction"：命名 `AskUserQuestion`/`request_user_input`/`ask_user`
- AGENTS.md "Interactive Question Tool Design"：labels self-contained、最多 4 options、third person

**测试场景：**
- 正常路径：SKILL.md edits 后通过 `bun test tests/frontmatter.test.ts`
- 正常路径：在有 auth code 的 repo 中调用 `/ce:ideate ideas for our auth system` → infers repo-grounded，不提问，继续
- 正常路径：在任意 repo 中调用 `/ce:ideate pricing model for a new dev tool` → infers elsewhere，不提问，进入 intake
- 边界情况：在 multi-skill repo 内调用 `/ce:ideate`（无 argument）→ ambiguous；V16 confirmation 在 dispatch 前触发
- 边界情况：在带 docs/ 的 repo 中调用 `/ce:ideate ideas for the docs` → ambiguous（current docs vs hypothetical doc product）；V16 confirmation 触发
- 边界情况：user-provided pasted context fail discrimination test → agent 基于 paste 问一个 question，而不是套 template
- 边界情况：user paste rich context 且 passes discrimination test → agent 一句话确认理解，无 questions，proceed
- 边界情况：V16 confirmation 触发且 user 选择 "elsewhere"：Decision 2（software vs non-software）仍运行，可能 route 到 `universal-ideation.md`
- 错误路径：user 对 intake question 回复 "idk just go" → agent 停止询问，基于已有内容 proceed
- 集成：classifier output 正确流入 Phase 1（repo mode 触发 codebase scan；elsewhere mode skip）

**验证：**
- Frontmatter test 通过
- 上述 scenarios 的 manual smoke 显示 agent 进行 sensible mode inferences，仅在 ambiguity 时触发 V16 confirmation，并正确 gate intake
- `bun run release:validate` 通过（validator scope：plugin.json/marketplace.json description+version drift only）

---

- [ ] **Unit 4：SKILL.md — Phase 1 mode-aware grounding 与 always-on web-researcher**

**目标：** 更新 Phase 1，根据 mode dispatch grounding agents。Repo mode 保留 v1 dispatch；elsewhere mode 跳过 codebase scan；两个 modes 都 always run learnings-researcher 和新的 `web-researcher`（with session-scoped reuse）。

**需求：** V5, V6, V12, V15

**依赖：** Unit 1（`web-researcher` 必须存在）、Unit 3（mode classification 必须先发生）

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-ideate/SKILL.md`

**方法：**
- 将 existing Phase 1 dispatch list 重构为 mode-conditional table：

| Source | Repo mode | Elsewhere mode |
  |---|---|---|
  | Codebase quick scan (Haiku) | always | skip |
  | learnings-researcher | always | always |
  | issue-intelligence-analyst | when issue intent detected | n/a |
  | slack-researcher | opt-in (current behavior) | opt-in |
  | web-researcher (new, Sonnet) | always-on (skip phrase available) | always-on (skip phrase available) |
  | User-provided context | n/a | primary grounding source |

- 用 prose 表达 dispatch list（skill format 不用 tables 进行 sub-agent dispatch；table 只作为 structural reference，实际 dispatch text 用 prose 写）。
- 对 elsewhere mode：将 "codebase quick scan" dispatch 替换为 "synthesize the user-supplied context (from Phase 0 intake or rich-prompt material) into a structured grounding summary with the same shape as the codebase context summary." 这样 Phase 2 sub-agents 不需要感知 grounding source。
- Always-on web-researcher dispatch：传入 focus hint 和简短 planning context summary；不要传 codebase content（web-researcher 面向 external）。
- Skip-phrase handling：如果 user 在 prompt 或前面回答中说过 "no external research" / "skip web research"，omit web-researcher dispatch，并在 consolidated grounding summary 中记录 skip。
- **V15 session-scoped reuse via sidecar cache:** dispatch `web-researcher` 前，glob `.context/compound-engineering/ce-ideate/*/web-research-cache.json` 并读取 matches。Cache file 是 JSON array，entries 为 `{key: {mode, focus_hint_normalized, topic_surface_hash}, result: <web-researcher output>, ts: <iso>}`。若 key 匹配当前 dispatch（same mode + same case-insensitive normalized focus hint + same topic surface hash），skip dispatch，并将 cached result 传入 consolidated grounding summary；提示 "Reusing prior web research from this session — say 're-research' to refresh." 使用 override "re-research" 时，删除 matching entry 并 fresh dispatch。fresh dispatch 后，将 new result append 到 run-id 的 cache file（必要时 create dir + file）。**Verification step（Unit 4 implementation 期间执行）：** invoke skill、dispatch web-researcher、退出 skill、同 session 重新 invoke，确认 orchestrator 能读取 prior cache file。如果 file 在 invocations 间不可达，V15 降级为 "no reuse"：在 consolidated grounding summary 中 surface limitation，并 proceed without reuse。这样避免对 orchestrator 可能没有的平台能力 hand-waving。
- Cost note（V12）：更新 Phase 0.x cost-transparency line，使其反映 inferred mode 的实际 dispatch count（例如 no slack/issues 的 elsewhere mode 比两者都有的 repo mode 少）。V15 reuse 触发时，line 应反映 reduced count。

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-ideate/SKILL.md` 当前 Phase 1（codebase scan dispatch 约 line 96-130）：repo-mode dispatch text 尽量 closely preserve；只重构 mode-conditional layer
- AGENTS.md "Sub-Agent Permission Mode"：dispatch 时省略 `mode` parameter
- `docs/solutions/skill-design/research-agent-pipeline-separation.md`：Phase 1 拥有 grounding-information dispatch；不要在其他 stages duplicate

**测试场景：**
- 正常路径：repo mode invocation 并行 dispatch Haiku scan + learnings-researcher + web-researcher
- 正常路径：elsewhere mode invocation dispatch synthesis-of-user-context + learnings-researcher + web-researcher；不做 codebase scan
- 边界情况：repo mode + "skip web research" → 只 dispatch Haiku scan + learnings-researcher
- 边界情况：elsewhere mode + "skip web research" → 只 dispatch synthesis + learnings-researcher
- 边界情况：web-researcher failure（network、tool unavailable）→ log warning，继续，无 external grounding（镜像 existing issue-intelligence-analyst failure handling）
- 边界情况：elsewhere mode 无 usable user-supplied context（intake 没产出 meaningful content）→ grounding summary 明确注明 thin context；Phase 2 sub-agents 知情
- 边界情况：同一 conversation 中同 topic re-invocation → V15 reuse 触发；web-researcher 不 re-dispatch；user 看到 reuse note
- 边界情况：re-invocation with "re-research" override → web-researcher fresh dispatch
- 边界情况：re-invocation 带 substantively different focus hint → V15 equivalence test fail；web-researcher fresh dispatch
- 集成：consolidated grounding summary 保持同一 structural shape（codebase/synthesis context、past learnings、[issue intelligence]、external context），因此 Phase 2 prompts 不需要 branching

**验证：**
- Manual smoke across scenarios 显示每个 mode 的 dispatch sets 正确
- Failure handling 保留 v1 invariant："warn and proceed"，永不因 grounding failure block
- `bun run release:validate` 通过

---

- [ ] **Unit 5：SKILL.md — Phase 2（6 个 always-on frames）与 Phase 3 mode-neutral rubric**

**目标：** 将 Phase 2 从 4 frames 扩展到两个 modes 都使用的 6 always-on frames，增加 cross-domain analogy 和 constraint-flipping。Per-agent target 从 8-10 降到 6-8 ideas。将 Phase 3 rubric phrasing 从 "grounded in current repo" soften 为 "grounded in stated context"：mode-neutral wording，mechanism 不变。Phase 2 merge/dedupe 后写入 V17 Checkpoint A。

**需求：** V7, V8, V17（Checkpoint A only；Checkpoint B 位于 Unit 6）

**依赖：** Unit 4（grounding summary feed Phase 2）

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-ideate/SKILL.md`
- 修改： `plugins/compound-engineering/skills/ce-ideate/references/post-ideation-workflow.md`（只改 Phase 3 rubric phrasing）

**方法：**
- Phase 2 frame catalog（两个 modes）：pain/friction · inversion/removal/automation · assumption-breaking/reframing · leverage/compounding · cross-domain analogy · constraint-flipping
- 定义 cross-domain analogy："Generate ideas by asking how completely different fields solve analogous problems. The grounding domain is the user's topic; the analogy domain is anywhere else (other industries, biology, games, infrastructure, history). Push past the obvious analogy to non-obvious ones."
- 定义 constraint-flipping："Generate ideas by inverting the obvious constraint to its opposite or extreme. What if the budget were 10x or 0? What if the team were 100 people or 1? What if there were no users, or 1M? Use the resulting design as a candidate even if the constraint flip itself isn't realistic."
- Dispatch 6 parallel sub-agents，每个以一个 frame 作为 starting bias（遵循当前 "starting bias, not a constraint" rule）。
- Per-agent target：约 6-8 ideas（从 8-10 降下），使 total raw output 保持在约 36-48，与 v1 的约 30 raw → 约 20-25 dedupe → 5-7 survivors 相近。
- 更新 merge step，expect 约 6 sub-agent returns，而不是 3-4。Dedupe 和 synthesis 无 structural changes。
- 对 issue-tracker mode：theme-derived frames 保持（current behavior，不变）；但若少于 4 themes，则从新的 6-frame default pool padding，而不是旧 4-frame pool。
- Phase 3 rubric：在 `references/post-ideation-workflow.md`（Phase 3 rubric section）中将 "groundedness in the current repo" 改为 "groundedness in stated context"。只做一行 phrasing change。Mechanism（rejection criteria、rubric weights、second-stricter-pass behavior）其余不变。
- **V17 Checkpoint A（after Phase 2）：** cross-cutting synthesis step 完成、raw candidate list consolidated 后，立即写 `.context/compound-engineering/ce-ideate/<run-id>/raw-candidates.md`，包含完整 candidate list 和 sub-agent attribution。Best-effort；write fail 时 log 并 proceed。Phase 4 checkpoint（Checkpoint B，`survivors.md`）在 Unit 6 的 `post-ideation-workflow.md` edits 中添加。

**遵循的模式：**
- 当前 SKILL.md 中 Phase 2 dispatch text（约 line 134-160）：保留 "starting bias, not constraint" framing 以及 merge-and-dedupe synthesis step
- `references/post-ideation-workflow.md` Phase 3 rubric section：保留全部 rejection criteria

**测试场景：**
- 正常路径：repo mode invocation 用 6 frames dispatch 6 sub-agents；total raw output 落在约 36-48 range
- 正常路径：elsewhere mode invocation dispatch 同样 6 frames（mode-symmetric）；raw output 类似
- 正常路径：Phase 3 critique 使用 mode-neutral rubric phrasing；所有 rejection criteria 仍适用
- 边界情况：issue-tracker mode 有 2 themes → 2 cluster-derived frames + 从 6-frame pool 中 padding 2 frames（不是旧 4-frame pool）；总计 dispatch 4 frames（按 existing issue-tracker behavior，不是 6）
- 边界情况：某 ideation topic 下某 frame 产出 zero usable ideas（例如对无 obvious constraints 的 topic 做 "constraint-flipping"）→ 该 sub-agent honest 返回 "no strong candidates from this frame"；orchestrator merge 其他 outputs，不 inflate
- 集成：cross-cutting synthesis step（当前 "Synthesize cross-cutting combinations"）仍在所有 6 sub-agent outputs merge 后运行

**验证：**
- Manual smoke：dispatch count 是 6（或 expected mode-conditional count），raw output volume 在 expected range
- Survivors 不 visibly weaker than v1（qualitative，manual review）
- Frontmatter test + release:validate 通过

---

- [ ] **Unit 6：post-ideation-workflow.md — terminal-first opt-in persistence、Proof failure ladder 与 auto-compact checkpoint**

**目标：** 重构 Phase 5（Write Artifact）和 Phase 6（Refine or Hand Off），使其 terminal-first 且 opt-in。Mode-determined defaults：repo-mode → `docs/ideation/`，elsewhere-mode → Proof。添加 Proof failure ladder（指定 retry harness：proof skill 只提供 single-retry-once）。在 Phase 4 前添加 lightweight survivor checkpoint，限制 auto-compact loss。Conversation-only 是 first-class end state。

**需求：** V9, V10, V11, V17

**依赖：** Unit 3（cross-references Phase 0.x mode classification；本 unit 的 Phase 6 menu 和 persistence defaults 按 mode branch）。按上方 coupling note，与 Units 3-5 single PR 协调 authoring，避免 phase numbering 和 grounding-summary schema 上的 rebase pain。

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-ideate/references/post-ideation-workflow.md`

**方法：**
- 将 Phase 5 从 "Write the Ideation Artifact" rename/reframe 为 "Persistence (Opt-In, Mode-Aware)"。顶部清晰声明 new invariant："Persistence is opt-in. The terminal review loop is a complete ideation cycle. Refinement loops happen in conversation with no file or network cost. Persistence triggers only when the user explicitly chooses to save, share, or hand off."
- 将 v1 "always write before handoff" rule 替换为："If the user is handing off to brainstorm/Proof/file-save, ensure a durable record exists first. If they're ending in conversation, no record needed unless they ask. If they're refining, no record yet — refinement is in-conversation."
- Mode-determined defaults 表：

| 动作 | Repo mode default | Elsewhere mode default |
  |---|---|---|
  | 保存 | `docs/ideation/YYYY-MM-DD-*-ideation.md` | Proof |
  | 分享 | Proof（additional） | Proof（primary） |
  | Brainstorm handoff | `ce:brainstorm` | `ce:brainstorm` (universal-brainstorming) |
| 结束 | conversation-only 即可 | conversation-only 即可 |

- Phase 6 menu（使用 `AskUserQuestion` / equivalent）：按 AGENTS.md "Interactive Question Tool Design" 最多 4 options：
  - "Brainstorm a selected idea" → 加载 `ce:brainstorm`
  - "Refine the ideation in conversation" → 返回 Phase 2 或 3
  - "Save and end" → 保存到 mode default（file or Proof），然后结束
  - "End in conversation only" → 不保存，直接结束
- 每个 label 都 self-contained，并按 AGENTS.md interactive-question rules front-load distinguishing word。
- **V17 auto-compact checkpoints — 两个写入点：**
  - **Checkpoint A — Phase 2 merge/dedupe 后（在 Unit 5 SKILL.md edits 中添加，但规则属于本 workflow doc）：** Phase 2 的 cross-cutting synthesis step 完成、raw candidate list consolidation 后，立即写入 `.context/compound-engineering/ce-ideate/<run-id>/raw-candidates.md`，包含完整 candidate list 和 sub-agent attribution。它在 Phase 3 critique 可能压缩 context 前，保护最昂贵的 output（6 个 parallel sub-agent dispatches + dedupe）。
  - **Checkpoint B — Phase 4 survivors presentation 前：** 展示 survivors 前，写入 `.context/compound-engineering/ce-ideate/<run-id>/survivors.md`，其中包含 survivor list + key context。在 user 到达 persistence menu 前保护 post-critique state。
  - **Common rules：** 两个 checkpoint 都不是 durable artifact，V9-V11 管理 persistence。二者都是 best-effort：write fail（disk full、perms）时 log warning and proceed；checkpoints 不得 block phase progression。Phase 6 completion（any path）后 cleanup 两个 files，除非 user opt to inspect。只有当当前 platform 无法使用 `.context/` namespacing 时，才使用 OS temp（按 repo Scratch Space convention 的 `mktemp -d`）。Auto-resume from partial checkpoint 不在 v2 scope：V17 防止 *silent* loss，而不是 lost-work recovery；若 stale `<run-id>/` directory 来自 aborted prior run，orchestrator 可将其作为 recovery hint surface，但不 auto-load。
  - **Run-id generation：** 在 Phase 1 开始时生成一次 `<run-id>`，格式为 8 hex chars（precedent：repo 中 existing `.context/` usage）。两个 checkpoints 和 V15 cache file 使用同一 id，cleanup 是一次 directory remove。
- **Proof failure ladder（作为 Phase 6.x sub-section 插入）。** 重要：proof skill（`skills/proof/SKILL.md:79,145,291`）会在 `STALE_BASE`/`BASE_TOKEN_REQUIRED` 上内部 single-retry-once，然后 surface failure（通过 `report_bug` 或 returned status）。proof skill 的 return contract 不向 callers expose typed error classes，因此 orchestrator 在外部无法区分 retryable vs terminal failures，除非 proof contract change。v2 design 接受该约束：
  - **Retry harness（orchestrator-side, intentionally minimal）：** 将 proof skill invocation 包在 ONE additional best-effort retry 中，带短 pause（约 2s）。Proof skill 已内部 retry，所以这里只捕获 orchestrator boundary 上的 transient races，避免 compounding latency。不要从 skill 外部 classify error types（没有 detection mechanism）。区分 create-failure（retry create）与 ops-failure（proof 返回 partial URL：只 retry failing op，不要 recreate）。orchestrator 通过检查 proof skill fail 前是否返回 `docUrl` 来识别 ops-vs-create。
  - **Fallback menu after persistent failure：** 通过 platform question tool 展示 options。Final option count（2 vs 3）和 exact labels 按 Open Questions defer 到 implementation；option set 是以下组合：(a) save to `docs/ideation/`（仅当 CWD 存在 repo），(b) save to custom path provided by user（validate writable，create parent dirs），(c) skip save and keep in conversation。如果 proof fail 前返回 partial URL，则在 fallback options 旁 surface 该 URL。
  - **Failure narration：** 向 terminal narrate single retry，让 pause 不像 hang（"Retrying Proof... attempt 2/2"）。Persistent failure 时，展示 menu 前说明 retry exhausted。
  - **Future work（out of v2 scope）：** 如果 proof skill 的 return contract 扩展为 expose typed error classes，orchestrator 可升级到更丰富 retry policy（transient classes 用 longer backoff，auth failures immediate skip）。只有当 simpler retry 实践中不足时，才 capture follow-up。
- Resume behavior（SKILL.md 当前 Phase 0.1，reference 此 file）对 repo mode 不变。对 elsewhere mode（Proof-saved artifacts），cross-session resume 是 best-effort：取决于 Proof API 是否支持按 topic list user docs。记录为 known limitation；elsewhere-mode resume 默认 in-session only。

**遵循的模式：**
- AGENTS.md "Interactive Question Tool Design"：labels self-contained、最多 4 options、third person、front-loaded distinguishing words
- AGENTS.md "Cross-Platform Reference Rules"：semantic 地说 "load the `proof` skill"，不要写 `/proof` slash
- `compound-refresh-skill-improvements.md` learning：explicit opt-in 优于 auto-detection（应用到 Phase 6 menu）

**测试场景：**
- 正常路径：repo-mode user 选择 "Save and end" → 写入 `docs/ideation/YYYY-MM-DD-*-ideation.md`
- 正常路径：elsewhere-mode user 选择 "Save and end" → share to Proof，返回 URL
- 正常路径：任意 mode user 选择 "End in conversation only" → 无 file/Proof side effects
- 正常路径：任意 mode user 选择 "Refine" → 返回 Phase 2/3，不触发 persistence
- 正常路径：任意 mode user 选择 "Brainstorm" → 先写 durable record（mode default），再 load `ce:brainstorm`
- 边界情况：Proof create fails 3×（network）→ retry harness narrates each backoff，fallback menu appears；user 选择 file save → 若 repo exists 则写入 `docs/ideation/`，否则 custom path
- 边界情况：Proof create fails 3×，CWD 无 repo → fallback menu 省略 docs/ideation option；只保留 custom path + skip
- 边界情况：Proof create succeeded 但 later refinement op fails → ops-only retry（不要 recreate）；persistent failure 时，existing URL 与 fallback options 一并 surface
- 边界情况：Proof returns terminal auth error → 除 proof skill 自己的 single retry 外不再 retry；immediate fallback menu
- 边界情况：repo mode user 显式要求 "save to Proof" → 使用 Proof，不用 file；elsewhere mode user 要求 "save to docs/ideation/" 同理
- 边界情况：V17 Checkpoint A 在 Phase 2 后 write fails（disk full、perms）→ log warning，仍 proceed to Phase 3（checkpoint best-effort，not load-bearing）
- 边界情况：V17 Checkpoint B 在 Phase 4 前 write fails → log warning，仍 proceed to Phase 4
- 边界情况：context 在 Checkpoint B 后、Phase 6 completion 前 compact → survivors.md reachable；向 user document recovery hint
- 边界情况：context 在 Checkpoint A 后、Phase 4 前 compact → raw-candidates.md reachable；告知 user 可从 persisted candidates 手动 re-trigger Phase 3（manual；auto-resume out of v2 scope）
- 错误路径：custom path provided 不可写 → agent surface error 并 re-prompt
- 集成：Phase 0.1 resume check 仍能找到 repo-mode docs in `docs/ideation/`；elsewhere-mode resume 说明 in-session only

**验证：**
- 覆盖所有 menu paths 的 manual smoke
- 通过 tool unavailability 或 forced retry exhaustion 模拟 Proof failure（确认 retry harness 真的按 correct backoff retry 并 narrate）
- V17 Checkpoint A（`raw-candidates.md`）在 Phase 2 后创建，Checkpoint B（`survivors.md`）在 Phase 4 前创建；两者在 Phase 6（any path）后 cleanup
- Resume invariant for repo mode 在 edits 后仍 work

---

- [ ] **Unit 7：最终集成检查 + release validation**

**目标：** 验证 v2 changes 作为一个 system 能串起来。通过 automated checks。若 counts change，更新 plugin description。

**需求：** 全部

**依赖：** Units 1-6 已完成

**文件：**
- 修改： `plugins/compound-engineering/.claude-plugin/plugin.json`（仅当 description text 提到 outdated count 或 capability description；按 AGENTS.md "Versioning Requirements" **不要 bump version**）
- 验证： `plugins/compound-engineering/skills/ce-ideate/SKILL.md`、`references/post-ideation-workflow.md`、`references/universal-ideation.md`、`agents/research/web-researcher.md`、`README.md`

**方法：**
- 运行 `bun test tests/frontmatter.test.ts`：验证所有 touched YAML frontmatter parses cleanly
- 运行 `bun run release:validate`：**scope note：** validator 只检查 plugin.json/marketplace.json description+version drift。不 validate agent registration、README counts 或 skill content。README updates 由下面 manual verify。
- 阅读 AGENTS.md "Skill Compliance Checklist"，逐项验证 ce:ideate SKILL.md：backtick references（约 150-line files 不用 `@`，也不用 markdown links）、description format、imperative writing style、rationale discipline（每行都值得 load cost）、platform question tool naming、task tool naming、script path conventions、cross-platform reference rules、tool selection
- **Manual README verification**（validator 不捕获）：
  - Research agents table 包含 `web-researcher` row，且 alphabetical position 正确
  - Component count table 反映 50 agents（was 49）
  - 任何提到 "ce:ideate scans the codebase" 的 prose 已更新为 mode-aware grounding
- 检查 `plugins/compound-engineering/AGENTS.md` "Stable/Beta Sync"：确认 ce:ideate 没有需要 sync 的 `-beta` counterpart（用 glob verify）
- 手动 smoke test full workflow 的 4 个 scenarios：
  1. 带 focus hint 的 repo-grounded（`/ce:ideate ideas for our skill compliance checks`）
  2. open-ended repo-grounded（`/ce:ideate`）：预期触发 V16 confirmation；tester 选择 "Repo mode"
  3. Elsewhere software 场景（`/ce:ideate pricing model for an open-source dev tool`）
  4. Elsewhere non-software（`/ce:ideate names for my band`）：预期 route 到 `universal-ideation.md`；tester verify wrap-up menu 使用 ideation labels，而不是 brainstorm labels
- 验证每个 manual scenario 命中正确 mode、dispatch 正确 agents、用 mode-neutral rubric present survivors、提供正确 mode-aware persistence menu
- 验证 V15 reuse：连续调用 scenario 3 两次；确认第二次用 reuse note skip web-researcher dispatch
- 验证 V17 checkpoints：调用 scenario 1，确认 `.context/compound-engineering/ce-ideate/<run-id>/raw-candidates.md` 在 Phase 2 后存在，`survivors.md` 在 Phase 4 和 Phase 6 之间存在，且二者在 Phase 6 后 cleaned up
- 如果 plugin.json description 提到具体 agent count 或 capability 且已 outdated，更新 prose（不要 bump version）

**遵循的模式：**
- AGENTS.md "Pre-Commit Checklist"：确认 no manual version bump、no manual changelog entry、README counts accurate、plugin.json description matches counts
- Repo working agreement："改动影响 parsing、conversion 或 output 后运行 `bun test`。"

**测试场景：**
- 正常路径：`bun test tests/frontmatter.test.ts` exit 0
- 正常路径：`bun run release:validate` exit 0（validator scope：plugin.json/marketplace.json description+version drift only）
- 正常路径：全部 4 个 manual smoke scenarios complete，没有 orchestrator confusion
- 正常路径：通过 verification steps 确认 V15 reuse 和 V17 checkpoint behaviors
- 边界情况：skill compliance checklist surface missed item → fix and re-verify
- 测试预期：skill behavior 通过 manual end-to-end ideation exercise；没有 automated regression test

**验证：**
- 两个 bun commands exit clean
- 全部 4 个 manual scenarios 产出 sensible output
- V15 reuse + V17 checkpoint behaviors 已 manual verify
- Skill compliance checklist items 全部 satisfied
- README manual verify 已确认（counts、table row、prose），plugin.json description coherent

---

## 系统级影响

- **交互图：** ce:ideate 现在 always-on dispatch `web-researcher`；future skills（`ce:brainstorm`、`ce:plan` external research stage）可 adopt 同一 agent。Mode classification pattern 镜像 `ce:brainstorm` 的 0.1b，建立了一个值得应用到其他需要跨 software/non-software audiences skills 的 convention。
- **错误传播：** Phase 1 grounding agent failures 已遵循 "warn and proceed"（issue-intelligence pattern）。`web-researcher` failure 也遵循同一 pattern。Proof failure 引入新 pattern：通过 fallback menu 让 user 明确选择。这刻意不同于 "silently degrade"，原因是 persistence 对 user 可见，值得 surface。
- **状态生命周期风险：** v2 引入 asymmetric resume story：repo-mode resume 从 `docs/ideation/` 读取（cross-session、file-system-backed）；elsewhere-mode resume 依赖 Proof listing API（best-effort，可能仅 in-session）。在 `post-ideation-workflow.md` 中记录该 asymmetry，避免 user 意外。**Mid-session compaction risk** 由 V17 的两个 checkpoints 限制：Checkpoint A（`raw-candidates.md`）在 Phase 2 merge/dedupe 后落盘，保护最昂贵 output（multi-agent dispatch）；Checkpoint B（`survivors.md`）在 Phase 4 presentation 前落盘，保护 post-critique state。二者合起来覆盖 longest-running stages。Phase 1 grounding dispatch 期间的 compaction（短暂，Checkpoint A 前）仍是 residual risk；mitigation 是保持 Phase 1 short-running，并接受 partial-run abort 后 full-rerun。Auto-resume from checkpoint files out of v2 scope。
- **Validator scope（已校正）：** `bun run release:validate` 只检查 plugin.json/marketplace.json description+version drift。不 validate agent registration、README counts、skill content 或 component-table accuracy。README updates 和 component-table edits 是 manual responsibilities，需要 edit time verify，不是 validator-caught。
- **API surface parity：** `web-researcher` 作为 agent file 可供所有 skills 使用。其他 skills 可以 incremental adopt，无需 coordinated rollout。Phase 2 frame changes 限于 ce:ideate。
- **集成覆盖：** skill behavior 没有 automated end-to-end test surface。Unit 7 的 manual smoke testing 覆盖四个 primary scenarios；future regression risk 真实但可接受（与当前 ecosystem testing posture 一致）。
- **不变不变量：**
  - many → critique → survivors mechanism（origin R4-R7）：保留
  - Adversarial filtering criteria（origin R5）：保留；只改 rubric phrasing
  - Resume behavior for repo mode（origin R13）：保留
  - Handoff to `ce:brainstorm`（origin R11）：保留
  - Sub-agent role pattern（origin R18：prompt-defined frames，不复用 named agent）：Phase 2 保留；`web-researcher` 是 Phase 1 grounding agent，遵循 established named-research-agent pattern
  - Orchestrator owns scoring（origin R22）：保留
  - Plugin versioning rules（feature PRs 不 bump version）：保留

---

## 风险与依赖

| 风险 | 缓解措施 |
|------|------------|
| Mode classifier 误判并静默产出错误风味的 ideation | 每次 invocation 顶部的一句话 mode statement 给 user 一个 cheap correction surface（"actually elsewhere"）。Ambiguous prompts 中，V16 在 dispatch grounding 前触发 active confirmation question，将 silent miscarriage of intent 限制到 clearly-classifiable prompts。应用 learnings 中的 classification-pipeline invariants：prompt-broadening 后 re-evaluate；两个 binary decisions 都 enumerate negative signals。 |
| Always-on `web-researcher` 让 ideation 明显更慢或更贵 | Sonnet model + phased budget + early-stop heuristic 限制 single-invocation cost。V15 session-scoped reuse 在同一 conversation 中 substantively-equivalent reruns 时 skip re-dispatch。Skip-phrases 尊重 speed-over-context preference。Cost-transparency line（V12）让 dispatch count 可见，user 知道自己在付出什么。 |
| Phase 2 从 4 个 sub-agents 增到 6 个，产出太多 ideas，难以 filter | Per-agent target 从 8-10 降到 6-8，将 total raw output 保持在 v1 range。如果实践中 filter quality degrade，则 capture 为 `docs/solutions/` learning，并在 v2.1 tune。Frame overlap（尤其 cross-domain analogy vs assumption-breaking）已在 Open Questions 承认；若 Phase 3 dedupe 经常 merge 它们，再 revisit。 |
| Proof failure ladder 带来 UX confusion（retry 后的 3-option menu） | 使用平台 question tool，并按 AGENTS.md interactive-question rules 使用 self-contained labels。按 likely usefulness 排序 options（如果 repo exists，则 file save first）。不循环 retry，清晰 surface choice。Narrate retry backoff，使 9s waits 不像 hang。3-option ladder vs simpler 2-option fallback 已记录在 Open Questions，供 future revisit。 |
| Universal-ideation reference 随时间偏离 universal-brainstorming | 创建时镜像 shape；在两个 files 中添加 comment，说明它们是 parallel facilitation references，structural changes 应一起考虑。Open Questions 中记录 full-mirror vs routing-stub design tradeoff；若 sync drift 成为真实成本，再 revisit。 |
| `web-researcher` prompt 产生过多 tool calls | 按 `pass-paths-not-content` learning，instruction phrasing 会显著影响 tool-call count。Phased budget 是 prompt-enforced（无 harness rate limiter）。Unit 1 implementation 后用 `claude -p --output-format stream-json --verbose` benchmark；稳定前 tune wording。 |
| Conversation-only end state 导致用户后来希望保存的 ideas 丢失 | V17 的两个 checkpoints（Phase 2 后 raw-candidates；Phase 4 前 survivors）限制 auto-compact loss case。Phase 6 menu 总是提供 save options；users 通过 selection opt in。Future enhancement 可添加 "save before timeout" prompt；out of v2 scope。 |
| Mid-session context compaction 破坏 ideation work | V17 在 Phase 2 merge/dedupe 后写 Checkpoint A（`raw-candidates.md`），在 Phase 4 presentation 前写 Checkpoint B（`survivors.md`）。Phase 1 grounding dispatch 期间（唯一未保护窗口，短运行）compaction 仍是 residual risk；mitigation 是保持 Phase 1 short，并接受 partial-run abort 后 full-rerun。Auto-resume from checkpoint files out of v2 scope。 |
| 新 agent 导致 plugin.json 或 marketplace.json drift | `bun run release:validate` 捕获 plugin.json/marketplace.json description+version drift。**它不捕获 README count drift 或 agent-registration drift**：这些是 Unit 1 verification 和 Unit 7 README-verification step 中的 manual responsibilities。 |
| Converted target platform 不支持 `web-researcher` frontmatter 的 `tools:` field | Field 已为 Claude Code 验证（`agents/review/*.md` 使用它），但其他 targets（Codex、Gemini）可能不 honor。Converters 会在 writer level scope tools；如果 target 忽略该 field，agent 会继承平台 default tool surface。v2 可接受；若 target adoption 暴露 over-broad tool access，再 revisit。 |

---

## 文档与运维说明

- **AGENTS.md updates：** 本 plan 不需要修改 `plugins/compound-engineering/AGENTS.md`：new agent 符合 existing `agents/research/` category，ce:ideate changes 不引入 new conventions，universal-ideation reference 遵循 established universal-brainstorming pattern。
- **README.md updates（manual, not validator-caught）：** 将 `web-researcher` row 添加到 research agents table；agent count 从 49 → 50（跨过 50+ threshold）；更新任何提到 "ce:ideate scans the codebase" 的 prose，使其反映 mode-aware grounding。
- **Ship 后 capture learnings：** learnings-researcher findings 明确指出 (a) mode classification heuristics，(b) web research agents，(c) Proof integration patterns，(d) ideation frame design 四类 documentation gaps。v2 ships 后，在 `docs/solutions/skill-design/` 写 entries 记录 what worked and what didn't。这正是这些 gaps 暴露出的 institutional knowledge。
- **Pre-commit checklist（按 plugin AGENTS.md）：**
  - [ ] 未在 `.claude-plugin/plugin.json` 中手动 bump release version
  - [ ] 未在 `.claude-plugin/marketplace.json` 中手动 bump release version
  - [ ] 未向 root `CHANGELOG.md` 手动添加 release entry
  - [ ] README.md component counts 已验证
  - [ ] README.md research-agents table 包含 new row
  - [ ] plugin.json description 匹配 current counts
- **Stable/beta sync：** ce:ideate 没有 `-beta` counterpart（通过 `ls plugins/compound-engineering/skills/` 验证）；无需 sync decision。

---

## 来源与参考

- **Origin 文档：**
  - `docs/brainstorms/2026-03-15-ce-ideate-skill-requirements.md`（v1 requirements）
  - `docs/brainstorms/2026-03-16-issue-grounded-ideation-requirements.md`（issue-grounded mode，v2 中保持不变）
- **Conversation-derived design alignment：** 本 plan 反映 maintainer 和 planning agent 于 2026-04-16/17 conversation 中达成的一系列 design decisions。关键 resolved questions 记录在上方 "Open Questions → Resolved During Planning"。
- **相关代码：**
  - `plugins/compound-engineering/skills/ce-ideate/SKILL.md`（编辑目标）
  - `plugins/compound-engineering/skills/ce-ideate/references/post-ideation-workflow.md`（编辑目标）
  - `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md:59-71`（mode classifier reference）
  - `plugins/compound-engineering/skills/ce-brainstorm/references/universal-brainstorming.md`（universal-ideation reference shape）
  - `plugins/compound-engineering/skills/proof/SKILL.md`（Proof handoff contract）
  - `plugins/compound-engineering/agents/research/ce-learnings-researcher.agent.md`、`slack-researcher.md`、`issue-intelligence-analyst.md`（agent file conventions）
- **相关 learnings：**
  - `docs/solutions/skill-design/research-agent-pipeline-separation.md`
  - `docs/solutions/best-practices/codex-delegation-best-practices.md`
  - `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`
  - `docs/solutions/skill-design/compound-refresh-skill-improvements.md`
- **外部研究：**
  - [How we built our multi-agent research system — Anthropic](https://www.anthropic.com/engineering/multi-agent-research-system)
  - [Claude Sonnet vs Haiku 2026: Which Model Should You Use?](https://serenitiesai.com/articles/claude-sonnet-vs-haiku-2026)
  - [Claude Benchmarks (2026)](https://www.morphllm.com/claude-benchmarks)
  - [From Web Search towards Agentic Deep ReSearch (arxiv)](https://arxiv.org/html/2506.18959v1)
  - [Deep Research: A Survey of Autonomous Research Agents (arxiv)](https://arxiv.org/html/2508.12752v1)
  - [EigentSearch-Q+ (arxiv)](https://arxiv.org/html/2604.07927)
