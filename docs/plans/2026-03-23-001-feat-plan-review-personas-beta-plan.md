---
title: "feat: 用 persona-based review pipeline 替换 document-review"
type: feat
status: completed
date: 2026-03-23
deepened: 2026-03-23
origin: docs/brainstorms/2026-03-23-plan-review-personas-requirements.md
---

# 用 Persona-Based Review Pipeline 替换 document-review

## 概览

用 multi-persona review pipeline 替换单一声音的 `document-review` skill，并并行 dispatch 专门 reviewer agents。两个 always-on personas（coherence、feasibility）在每次 review 中运行。四个 conditional personas（product-lens、design-lens、security-lens、scope-guardian）基于 document content analysis 激活。Quality issues 自动修复；strategic questions 呈现给 user。

## 问题框架

当前 `document-review` 通过单一 evaluator voice 应用五个 generic criteria（Clarity、Completeness、Specificity、Appropriate Level、YAGNI）。这会遗漏 role-specific concerns：security engineer、product leader、design reviewer 会在同一 plan 中看到不同问题。`ce:review` skill 已经证明 multi-persona review 能为 code 产出更丰富、更 actionable 的 feedback。同样架构适用于 plan/requirements review。（见 origin: docs/brainstorms/2026-03-23-plan-review-personas-requirements.md）

## 需求追踪

- R1. 用可 parallel dispatch specialized agents 的 persona pipeline 替换 document-review
- R2. 2 个 always-on personas：coherence、feasibility
- R3. 4 个 conditional personas：product-lens、design-lens、security-lens、scope-guardian
- R4. 根据 document content 自动检测 conditional persona relevance
- R5. Hybrid action model（混合 action 模型）：auto-fix quality issues，present strategic questions
- R6. Structured findings（结构化 findings），包含 confidence、dedup、synthesized report
- R7. 与全部 4 个 callers（brainstorm、plan、plan-beta、deepen-plan-beta）保持 backward compatibility
- R8. 兼容未来 automated workflows 的 pipeline

## 范围边界

- 不新增 callers 或 pipeline integrations
- 不改变 deepen-plan-beta behavior
- 不为 persona selection 新增 user configuration
- 不发明新的 review frameworks，而是把 established review patterns 纳入各自 persona
- 不修改 4 个 existing caller skills

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/ce-review/SKILL.md`：Multi-agent orchestration reference：通过 Task tool 并行 dispatch、always-on + conditional agents、P1/P2/P3 severity、带 dedup 的 finding synthesis。
- `plugins/compound-engineering/skills/document-review/SKILL.md`：要替换的当前 single-voice skill。关键 contract："Review complete" terminal signal。
- `plugins/compound-engineering/agents/review/ce-*.agent.md`：15 个现有 review agents。Frontmatter schema：`name`、`description`、`model: inherit`。Body：examples block、role definition、analysis protocol、output format。
- `plugins/compound-engineering/AGENTS.md`：Agent naming：fully-qualified `compound-engineering:<category>:<agent-name>`。Agent placement：`agents/<category>/<name>.md`。

### Caller 集成点

全部 4 个 callers 使用同一 contract：
- `ce-brainstorm/SKILL.md` line 301："Load the `document-review` skill and apply it to the requirements document"
- `ce-plan/SKILL.md` line 592："Load `document-review` skill"
- `ce-plan-beta/SKILL.md` line 611："Load the `document-review` skill with the plan path"
- `deepen-plan-beta/SKILL.md` line 402："Load the `document-review` skill with the plan path"

它们都期待 "Review complete" 作为 terminal signal。没有 caller 检查具体 output format。不需要 caller changes。

### 组织内经验

- **Subagent design**（docs/solutions/skill-design/compound-refresh-skill-improvements.md）：每个 persona agent 需要 explicit context（file path、scope、output format），不要依赖 inherited context。使用 native file tools，不使用 shell commands。避免 hardcoded tool names；使用 capability-first language，并给出 platform examples。
- **Parallel dispatch safety**：Persona reviewers 是 read-only（分析 document，不修改）。并行 dispatch 是安全的。这不同于 compound-refresh，后者因 subagents 会修改 files 而使用 sequential subagents。
- **Contradictory findings**：6 个独立 reviewers 会产生冲突 findings（scope-guardian 想删减；coherence 想保留 narrative flow）。Synthesis 需要 conflict-resolution rules，而不只是 dedup。
- **Classification pipeline ordering**：Pipeline ordering 很重要：filter -> normalize -> group -> threshold -> re-classify -> output。Post-grouping safety checks 捕获误分类 findings。classification logic 应有 single source of truth。
- **Beta skills framework**（docs/solutions/skill-design/beta-skills-framework.md）：由于这里是完全替换 document-review（不是 side-by-side 运行），beta framework 不适用。

### 研究洞察：iterative-engineering plan-review

iterative-engineering plugin（v1.16.1）实现了成熟的带 persona agents 的 plan-review skill。要采用的关键架构模式：

**Structured output contract**：所有 personas 返回一致的 JSON-like structure，包含：title（<=10 words）、priority（HIGH/MEDIUM/LOW）、section、line、why_it_matters（影响而非症状）、confidence（0.0-1.0）、evidence（quoted text，至少 1 个）、optional suggestion。该一致性让 synthesis 可靠。

**Fingerprint-based dedup**：`normalize(section) + line_bucket(line, +/-5) + normalize(title)`。fingerprints 匹配时：保留最高 priority、最高 confidence、合并 evidence，并记录所有 reviewers。这比 judgment-based dedup 更精确。

**Residual concerns**：低于 confidence threshold（0.50）的 findings 单独存为 residual concerns。synthesis 期间，如果 residual concerns 与其他 reviewers 的 findings 重叠，或描述 concrete blocking risks，则 promote to findings。这能捕获一个 persona 隐约看到、另一个 persona 确认的问题。

**Per-persona confidence calibration**：每个 persona 定义自己的 confidence bands，即该领域里 HIGH（0.80+）、MODERATE（0.60-0.79）、LOW 的含义。避免 apples-to-oranges confidence comparisons。

**Explicit suppress conditions**：每个 persona 列出不应 flag 的内容（例如 coherence suppress style preferences 和 missing content；feasibility suppress implementation style choices）。这能降低噪音，让 personas 聚焦。

**Subagent prompt template**：共享 template 包装每个 persona 的 identity + output schema + review context。这保证所有 personas 行为一致，无需在每个 agent file 中重复 boilerplate。

### 已确立的 Review Patterns

三个经过验证的 review approaches 为特定 personas 提供 behavioral foundation：

**Premise challenge pattern（前提挑战 pattern，-> product-lens persona）：**
- Nuclear scope challenge，三个问题：(1) 这是正确的问题吗？不同 framing 是否能带来更简单或更有影响力的 solution？(2) 实际 user/business outcome 是什么？该 plan 是最直接路径吗？(3) 如果什么都不做会怎样？是真实 pain 还是假设？
- Implementation alternatives：产出 2-3 个 approaches，包含 effort（S/M/L/XL）、risk（Low/Med/High）、pros/cons。
- Search-before-building（先搜索再构建）：Layer 1（conventional）、Layer 2（search results）、Layer 3（first principles）。

**Dimensional rating pattern（维度评分 pattern，-> design-lens persona）：**
- 0-10 rating loop（0-10 评分 loop）：Rate dimension -> explain gap（"4 because X; 10 would have Y"）-> suggest fix -> re-rate -> repeat。
- 7 个 evaluation passes：Information architecture、interaction state coverage、user journey/emotional arc、AI slop risk、design system alignment、responsive/a11y、unresolved design decisions。
- AI slop blacklist：10 个 recognizable AI-generated patterns to avoid（3-column feature grids、purple gradients、icons in colored circles、uniform border-radius 等）。

**Existing-code audit pattern（现有代码 audit pattern，-> scope-guardian + feasibility personas）：**
- "What already exists?" check：(1) 哪些 existing code 已部分/完全解决各 sub-problem？(2) 为 stated goal 所需的最小 changes 是什么？(3) Complexity check（>8 files 或 >2 new classes = smell）。(4) 按 architectural pattern 做 search check。(5) TODOS cross-reference。
- Completeness principle：对 AI 来说，completeness cost 低 10-100x。如果 shortcut 为人节省 hours 但对 AI 只省 minutes，则推荐 complete version。
- Error & rescue map：对每个可能 fail 的 method/codepath，命名 exception class、trigger、handler 和 user-visible outcome。

## 关键技术决策

- **Agents, not inline prompts**：Persona reviewers 作为 agent files 放在 `agents/review/` 下。这支持通过 Task tool 并行 dispatch，遵循既有 patterns，并让 SKILL.md 聚焦 orchestration。（解决 origin 中 deferred question）

- **Structured output contract aligned with ce:review-beta（PR #348）**：同一 normalization mechanism：findings-schema.json、subagent-template.md、review-output-template.md 作为 reference files。尽量复用相同 field names 和 enums（severity P0-P3、autofix_class、owner、confidence、evidence）。Document-specific adaptations：`section` 替代 `file`+`line`，`deferred_questions` 替代 `testing_gaps`，删除 `pre_existing`。每个 persona 定义自己的 confidence calibration 和 suppress conditions。（解决 origin 中 deferred question：output format）

- **Content-based activation heuristics**：orchestrator skill 检查 document 中的 keyword 和 structural patterns 以选择 conditional personas。Heuristics 定义在 skill 中，而不是 agents 中，这让 selection logic 集中，agents 聚焦 review。（解决 origin 中 deferred question）

- **Separate auto-fix pass after synthesis**：Personas 是 read-only（只产出 findings）。Dedup 和 synthesis 后，orchestrator 用单独一轮应用 quality issues 的 auto-fixes，再呈现 strategic questions。这避免多个 agents 产生 conflicting edits。（解决 origin 中 deferred question）

- **No caller modifications needed**："Review complete" contract 已足够。全部 4 个 callers 都按 skill name 引用 document-review，并检查 terminal signal。（解决 origin 中 deferred question）

- **Fingerprint-based dedup over judgment-based**：使用 `normalize(section) + normalize(title)` fingerprinting 进行 deterministic dedup。比要求 model "remove duplicates" 更可靠。fingerprints 匹配时：保留最高 severity/confidence，合并 evidence，记录所有同意的 reviewers。

- **Residual concerns with cross-persona promotion**：低于 0.50 confidence 的 findings 存为 residual concerns。synthesis 期间，如果被另一个 persona corroborate，或描述 concrete blocking risks，则 promote to findings。这能捕获一个 persona 隐约看到、另一个 persona 确认的问题。

## 开放问题

### 规划期间已解决

- **Agent category**：放在 `agents/review/`，与 existing code review agents 并列。Names distinct（coherence-reviewer、feasibility-reviewer 等），不与 existing agents 冲突。Fully-qualified：`compound-engineering:review:<name>`。
- **Parallel vs serial dispatch**：始终 parallel。每次运行 2-6 个 agents（低于 ce:review pattern 中 auto-serial threshold 5 的常见范围；即使 max 为 6，也是阅读单个 document 的 document reviewers，bounded scope）。
- **Review pattern integration**：Premise challenge -> product-lens opener。Dimensional rating -> design-lens evaluation method。Existing-code audit -> scope-guardian opener。这些纳入 agent behavior，而不是单独 orchestration mechanisms。
- **Output format**：对齐 ce:review-beta（PR #348）normalization pattern。同一机制：JSON schema reference file、shared subagent template、output template。相同 enums（P0-P3 severity、autofix_class、owner）。Document-specific field swaps：`section` 替代 `file`+`line`，`deferred_questions` 替代 `testing_gaps`，删除 `pre_existing`。

### 延后到实现阶段

- conditional persona activation 的 exact keyword lists：先用明显 signals，再基于真实使用 refine
- auto-fix pass 是否应在应用 changes 后重新读取 document 验证 consistency，还是信任 single pass

## 高层技术设计

> *这说明预期 approach，是给 review 的方向性指导，不是 implementation specification。实现 agent 应把它当作 context，而不是要复写的代码。*

```
Document Review Pipeline 流程：

1. 读取 document
2. 分类 document type（requirements doc vs plan）
3. 分析 content，寻找 conditional persona signals
   - product signals? -> activate product-lens
   - design/UI signals? -> activate design-lens
   - security/auth signals? -> activate security-lens
   - scope/priority signals? -> activate scope-guardian
4. 公布 review team，并给出每个 conditional persona 的 justification
5. 通过 Task tool parallel dispatch agents
   - Always: coherence-reviewer, feasibility-reviewer
   - Conditional: activated personas from step 3
   - Each receives: subagent-template.md populated with persona + schema + doc content
6. 收集所有 agents 的 findings（用 findings-schema.json 验证）
7. 执行 synthesis
   a. Validate：按 schema 检查结构合规性，丢弃 malformed
   b. Confidence gate：suppress 低于 0.50 的 findings
   c. Deduplicate：fingerprint matching，保留最高 severity/confidence
   d. Promote residual concerns：corroborated 或 blocking -> promote to finding
   e. Resolve contradictions：conflicting personas -> combined finding，manual + human
   f. Route：safe_auto -> apply，其余 -> present
8. 应用 safe_auto fixes（inline edit document，single pass）
9. 向 user 呈现 remaining findings，并按 severity 分组
10. 使用 review-output-template.md 格式化 output
11. 提供下一步 action："Refine again" 或 "Review complete"
```

**Finding structure（与 ce:review-beta PR #348 对齐）：**

```
Envelope（每个 persona）：
  reviewer:            Persona name (e.g., "coherence", "product-lens")
  findings:            Array of finding objects
  residual_risks:      Risks noticed but not confirmed as findings
  deferred_questions:  Questions that should be resolved in a later workflow stage

Finding object：
  title:               Short issue title (<=10 words)
  severity:            P0 / P1 / P2 / P3  (same scale as ce:review-beta)
  section:             Document section where issue appears (replaces file+line)
  why_it_matters:      Impact statement (what goes wrong if not addressed)
  autofix_class:       safe_auto / gated_auto / manual / advisory
  owner:               review-fixer / downstream-resolver / human / release
  requires_verification: Whether fix needs re-review
  suggested_fix:       Optional concrete fix (null if not obvious)
  confidence:          0.0-1.0 (calibrated per persona)
  evidence:            Quoted text from document (minimum 1)

Severity definitions（与 ce:review-beta 相同）：
  P0: Contradictions or gaps that would cause building the wrong thing. Must fix.
  P1: Significant gap likely hit during planning/implementation. Should fix.
  P2: Moderate issue with meaningful downside. Fix if straightforward.
  P3: Minor improvement. User's discretion.

Autofix classes（为了 schema compatibility，与 ce:review-beta 使用相同 enum）：
  safe_auto:  Terminology fix, formatting, cross-reference -- local and deterministic
  gated_auto: Restructure or edit that changes document meaning -- needs approval
  manual:     Strategic question requiring user judgment -- becomes residual work
  advisory:   Informational finding -- surface in report only

Orchestrator routing（document review 简化版）：
  The 4-class enum is preserved for schema compatibility with ce:review-beta,
  but the orchestrator routes as 2 buckets:
    safe_auto           -> apply automatically
    gated_auto + manual + advisory -> present to user
  The gated/manual/advisory distinction is blurry for documents (all need user
  judgment). Personas still classify precisely; the orchestrator collapses.
```

## 实现单元

- [x] **Unit 1：创建 always-on persona agents**

**目标：** 创建每次 document review 都运行的 coherence 和 feasibility reviewer agents。

**需求：** R2

**依赖：** 无

**文件：**
- Create（创建）：`plugins/compound-engineering/agents/document-review/ce-coherence-reviewer.agent.md`
- Create（创建）：`plugins/compound-engineering/agents/document-review/ce-feasibility-reviewer.agent.md`

**做法：**
- 遵循 existing agent structure：frontmatter（name、description、model: inherit）、examples block、role definition、analysis protocol
- 每个 agent 定义：role identity、analysis protocol、confidence calibration、suppress conditions
- Agents 不定义自己的 output format；shared `references/findings-schema.json` 和 `references/subagent-template.md` 负责 output normalization（与 ce:review-beta PR #348 相同模式）

**coherence-reviewer（一致性 reviewer）：**
- Role：阅读 internal consistency 的 technical editor
- Hunts：sections 间 contradictions、terminology drift（同一概念用不同名字）、structural issues（sections flow 不合逻辑）、读者会产生不同解释的 ambiguity
- Confidence calibration：HIGH（0.80+）= 可从文本证明的 contradictions。MODERATE（0.60-0.79）= likely，但可被 charitable reading 调和。Suppress below 0.50。
- Suppress：style preferences、missing content（其他 personas 处理）、不构成实际 ambiguity 的 imprecision、formatting opinions

**feasibility-reviewer（可行性 reviewer）：**
- Role：评估 proposed approaches 是否能经受现实约束的 systems architect
- Hunts：与 existing patterns 冲突的 architecture decisions、无 fallback plans 的 external dependencies、无 measurement plans 的 performance requirements、存在 gaps 的 migration strategies、在 known constraints 下不可行的 approaches
- 吸收 tech-plan implementability：implementer 能否读后开始 coding？file paths、interfaces、dependencies 是否足够具体？
- 以 "what already exists?" check 开场：plan 是否先承认 existing code，再提出 new abstractions？
- Confidence calibration：HIGH（0.80+）= 阻塞 approach 的 specific technical constraint。MODERATE（0.60-0.79）= constraint likely，但取决于 document 中缺失的 specifics。
- Suppress：implementation style choices（实现风格选择）、testing strategy details（测试策略细节）、code organization preferences（代码组织偏好）、theoretical scalability concerns（理论扩展性担忧）

**遵循的模式：**
- `plugins/compound-engineering/agents/review/ce-code-simplicity-reviewer.agent.md`：agent structure 和 output format conventions
- `plugins/compound-engineering/agents/review/ce-architecture-strategist.agent.md`：systematic analysis protocol style
- iterative-engineering agents：confidence calibration 和 suppress conditions pattern

**测试场景：**
- coherence-reviewer 识别一个 Section 3 声称 "no external dependencies" 但 Section 5 提出调用 external API 的 plan
- coherence-reviewer flag 同一概念在 document 中混用 "pipeline" 和 "workflow"
- coherence-reviewer 不 flag minor formatting inconsistency（suppress condition 生效）
- feasibility-reviewer 识别没有 measurement 或 caching strategy 的 "sub-millisecond response time" requirement
- feasibility-reviewer 识别 plan 在 codebase 已有 auth system 的情况下提出 build custom auth system
- plan 未承认 existing patterns 时，feasibility-reviewer surface "what already exists?"
- 两个 agents 都产出包含全部 required fields（title、priority、section、confidence、evidence、action）的 findings

**验证：**
- 两个 agents 都有 valid frontmatter（name、description、model: inherit）
- 两个 agents 都包含 examples、role definition、analysis protocol、confidence calibration、suppress conditions
- Agents 依赖 shared findings-schema.json 进行 output normalization（无 per-agent output format）
- 每个 persona domain 的 suppress conditions 明确且合理

---

- [x] **Unit 2：创建 conditional persona agents**

**目标：** 创建四个根据 document content 激活的 conditional persona agents。

**需求：** R3

**依赖：** Unit 1（保持一致的 agent structure）

**文件：**
- 创建: `plugins/compound-engineering/agents/document-review/ce-product-lens-reviewer.agent.md`
- 创建: `plugins/compound-engineering/agents/document-review/ce-design-lens-reviewer.agent.md`
- 创建: `plugins/compound-engineering/agents/document-review/ce-security-lens-reviewer.agent.md`
- 创建: `plugins/compound-engineering/agents/document-review/ce-scope-guardian-reviewer.agent.md`

**做法：**
四个 agents 都使用 Unit 1 建立的同一结构（frontmatter、examples、role、protocol、confidence calibration、suppress conditions）。Output normalization 由 shared reference files 处理。

**product-lens-reviewer（产品视角 reviewer）：**
- Role：评估 plan 是否解决正确问题的 senior product leader
- 用 premise challenge 开场，三个 diagnostic questions：
  1. 这是正确的问题吗？换一种 framing 是否能得到更简单或更有影响力的 solution？
  2. 实际 user/business outcome 是什么？这个 plan 是最直接路径，还是在解决 proxy problem？
  3. 如果什么都不做会怎样？是真实 pain point 还是 hypothetical？
- Evaluates：scope decisions and prioritization rationale、implementation alternatives（是否有 simpler paths？）、goals 是否连接到 requirements
- Confidence calibration：HIGH（0.80+）= specific text 展示 stated goal 与 proposed work 不一致。MODERATE（0.60-0.79）= likely，但取决于 business context。
- Suppress：implementation details（实现细节）、technical specifics（技术细节）、measurement methodology（度量方法）、style

**design-lens-reviewer（设计视角 reviewer）：**
- Role：审查 plans 中 missing design decisions 的 senior product designer
- 使用 "rate 0-10 and describe what 10 looks like" dimensional rating method
- Evaluates design dimensions：information architecture（user 先/后/再看到什么？）、interaction state coverage（loading、empty、error、success、partial）、user flow completeness、responsive/accessibility considerations
- Produces rated findings（产出带评分 findings）："Information architecture: 4/10 -- it's a 4 because [gap]. A 10 would have [what's needed]."
- AI slop check：flag 会产出 generic AI-looking interfaces 的 plans（3-column feature grids、purple gradients、icons in colored circles、uniform border-radius）
- Confidence calibration：HIGH（0.80+）= missing states 或 flows 会明确导致 UX problems。MODERATE（0.60-0.79）= 存在 design gap，但 skilled designer 可从 context 解决。
- Suppress：backend implementation details、performance concerns、security（其他 persona 处理）、business strategy

**security-lens-reviewer（安全视角 reviewer）：**
- Role：在 plan level 评估 threat model 的 security architect
- Evaluates：auth/authz gaps（认证/授权缺口）、data exposure risks（数据暴露风险）、API surface vulnerabilities、input validation assumptions、secrets management、third-party trust boundaries、plan-level threat model completeness
- 与 code-level `security-sentinel` agent 不同：这里 review 的是 PLAN 是否考虑 security，而不是 CODE 是否 secure
- Confidence calibration：HIGH（0.80+）= plan 明确引入 attack surface 却未提 mitigation。MODERATE（0.60-0.79）= security concern likely，但 plan 可能 implicitly address。
- Suppress：code quality issues（代码质量问题）、performance、non-security architecture、business logic

**scope-guardian-reviewer（范围守护 reviewer）：**
- Role：审查 scope decisions 是否 aligned 的 product manager，以及评估 complexity 是否值得的 skeptic
- 以 "what already exists?" check 开场：(1) 哪些 existing code/patterns 已解决 sub-problems？(2) 为 stated goal 所需的 minimum changes 是什么？(3) Complexity check：如果 plan 触及很多 files 或引入许多 new abstractions，是否有充分理由？
- Challenges：scope size 相对于 stated goals、unnecessary complexity、premature abstractions、framework-ahead-of-need、priority dependency conflicts（例如 core feature 依赖 nice-to-have）、requirements 违反 scope boundaries、goals 与 requirements 脱节
- Completeness principle check：plan 是否在 complete version 几乎不多花成本时仍选择 shortcuts？
- Confidence calibration：HIGH（0.80+）= 能指向 specific text 展示 scope conflict 或 unjustified complexity。MODERATE（0.60-0.79）= misalignment likely，但取决于 interpretation。
- Suppress：implementation style choices、priority preferences（其他 persona 处理）、missing requirements（coherence 处理）、business strategy

**遵循的模式：**
- Unit 1 agents，保持 consistent structure
- `plugins/compound-engineering/agents/review/ce-security-sentinel.agent.md` 的 security analysis style（plan-level adaptation）

**测试场景：**
- product-lens-reviewer challenge 一个 stated goal 是 "improve user onboarding" 却构建复杂 admin dashboard 的 plan
- product-lens-reviewer 以 premise challenge 作为 opening findings
- design-lens-reviewer 将 user flow 评为 6/10，并具体描述 10/10 需要哪些 missing states
- design-lens-reviewer flag 描述 "a modern card-based dashboard layout" 的 plan 为 AI slop risk
- security-lens-reviewer flag 新增 public API endpoint 却未提 auth 或 rate limiting 的 plan
- security-lens-reviewer 不 flag code quality issues（suppress condition 生效）
- scope-guardian-reviewer 识别一个 12 个 implementation units 但 4 个即可交付 core value 的 plan
- scope-guardian-reviewer 识别 plan 在 existing framework 可用时提出 custom solution
- 四个 agents 都产出包含全部 required fields 的 findings

**验证：**
- 四个 agents 都有 valid frontmatter，并遵循 Unit 1 的同一结构
- product-lens-reviewer 包含 3-question premise challenge
- design-lens-reviewer 包含 "rate 0-10, describe what 10 looks like" evaluation pattern
- scope-guardian-reviewer 包含 "what already exists?" opening check
- 全部 agents 定义 confidence calibration 和 suppress conditions
- 全部 agents 依赖 shared findings-schema.json 进行 output normalization

---

- [x] **Unit 3：用 persona pipeline 重写 document-review skill**

**目标：** 用 persona pipeline orchestrator 替换当前 single-voice document-review SKILL.md。

**需求：** R1, R4, R5, R6, R7, R8

**依赖：** Unit 1, Unit 2

**文件：**
- 修改: `plugins/compound-engineering/skills/document-review/SKILL.md`
- 创建: `plugins/compound-engineering/skills/document-review/references/findings-schema.json`
- 创建: `plugins/compound-engineering/skills/document-review/references/subagent-template.md`
- 创建: `plugins/compound-engineering/skills/document-review/references/review-output-template.md`

**做法：**

**Reference files（参考文件，aligned with ce:review-beta PR #348 mechanism）：**
- `findings-schema.json`：所有 persona agents 必须遵守的 JSON schema。与 ce:review-beta 相同结构，但做 document-specific swaps：`section` 替代 `file`+`line`，`deferred_questions` 替代 `testing_gaps`，删除 `pre_existing`。severity、autofix_class、owner 使用相同 enums。
- `subagent-template.md`：包含 variable slots（{persona_file}、{schema}、{document_content}、{document_path}、{document_type}）的 shared prompt template。Rules："Return ONLY valid JSON matching the schema"、suppress below confidence floor、每个 finding 需要 evidence。从 ce:review-beta template 改写到 document context，而不是 diff context。
- `review-output-template.md`：synthesized output 的 Markdown template。Findings 按 severity（P0-P3）分组，pipe-delimited tables 包含 section、issue、reviewer、confidence、route（autofix_class -> owner）。从 ce:review-beta template 改写为 sections 而不是 file:line。

重写后的 skill 包含以下 phases：

**Phase 1 -- 获取并分析 Document：**
- 与当前 entry point 相同：接受 path，或在 `docs/brainstorms/` / `docs/plans/` 中查找最近 doc
- 读取 document
- Classify document type：requirements doc（来自 brainstorms/）或 plan（来自 plans/）
- 分析 content 以激活 conditional persona signals：
  - product-lens：user-facing features、market claims、scope decisions、prioritization language、带 user/customer focus 的 requirements
  - design-lens：UI/UX references、frontend components、user flows、wireframes、screen/page/view mentions（screen/page/view 提及）
  - security-lens：auth/authorization mentions（auth/authorization 提及）、API endpoints、data handling、payments、tokens、credentials、encryption
  - scope-guardian：multiple priority tiers（P0/P1/P2）、large requirement count（>8）、stretch goals、nice-to-haves、看似不 aligned 的 scope boundary language

**Phase 2 -- 公布并 Dispatch Personas：**
- Announce review team，并给出每个 conditional persona 的 justification（例如 "scope-guardian-reviewer -- plan has 12 requirements across 3 priority levels"）
- 构建 agent list：always coherence-reviewer + feasibility-reviewer，加上 activated conditional agents
- 通过 Task tool 并行 dispatch 所有 agents，使用 fully-qualified names（`compound-engineering:review:<name>`）
- 向每个 agent 传入：document content、document path、document type（requirements vs plan）、structured output schema
- 每个 agent 接收完整 document；不要按 sections 拆分

**Phase 3：Synthesize Findings（综合 Findings）**
Synthesis pipeline（顺序很重要）：
1. **Validate**：检查每个 agent output 是否符合 findings-schema.json。丢弃 malformed findings，但在 coverage section 中记录 agent name。
2. **Confidence gate**：Suppress findings below 0.50 confidence。将它们存为 residual concerns。
3. **Deduplicate**：使用 `normalize(section) + normalize(title)` 为每个 finding 生成 fingerprint。fingerprints 匹配时：保留最高 severity、最高 confidence、合并 evidence、记录所有同意 reviewers。
4. **Promote residual concerns**：扫描 residual concerns，如果与其他 reviewers 的 existing findings 重叠，或是 concrete blocking risks，则以 P2 和 confidence 0.55-0.65 promote to findings。
5. **Resolve contradictions**：当 personas 在同一 section 上意见冲突（例如 scope-guardian 说 cut，coherence 说为 narrative flow 保留），创建 combined finding，呈现双方 perspective，并设 `autofix_class` 为 `manual`、owner 为 `human`，让 user 决定。
6. **Route by autofix_class**：`safe_auto` -> 立即 apply。其他所有（`gated_auto`、`manual`、`advisory`）-> 呈现给 user。Personas 精确分类；orchestrator 折叠为 2 buckets。
7. **Sort**：P0 -> P1 -> P2 -> P3，然后按 confidence（descending），再按 document order。

**Phase 4：Apply and Present（应用并呈现）**
- Inline apply `safe_auto` fixes 到 document（single pass）
- 将其他所有 findings（`gated_auto`、`manual`、`advisory`）按 severity 分组呈现给 user
- 展示 brief summary：N auto-fixes applied、M findings to consider
- 展示 coverage：哪些 personas 运行、suppressed/residual counts
- 使用 review-output-template.md format 保持 consistent presentation

**Phase 5：Next Action（下一步 action）**
- 可用时使用平台 blocking question tool（Claude Code 中的 AskUserQuestion、Codex 中的 request_user_input、Gemini 中的 ask_user）。否则展示 numbered options 并 wait。
- 提供："Refine again" 或 "Review complete"
- 2 轮 refinement pass 后，推荐 completion（继承当前行为）
- "Review complete" 作为 callers 的 terminal signal

**Pipeline mode：** 从 automated workflows 调用时，auto-fixes silent 运行。Strategic questions 仍会 surfaced（由 calling skill 决定 present 还是 convert to assumptions）。

**Protected artifacts：** 从 ce:review 继承：永不 flag `docs/brainstorms/`、`docs/plans/` 或 `docs/solutions/` files for deletion。在 synthesis 期间丢弃任何此类 findings。

**What NOT to do section：** 继承当前 guardrails：
- 不重写整个 document
- 不添加 user 未讨论的新 requirements
- 不创建单独 review files 或 metadata sections
- 不 over-engineer 或添加 complexity
- 不添加 brainstorm/plan 中未讨论的新 sections

**Synthesis 的 conflict resolution rules：**
- coherence 说 "keep for consistency" 而 scope-guardian 说 "cut for simplicity" -> combined finding，autofix_class: manual，owner: human
- feasibility 说 "this is impossible" 而 product-lens 说 "this is essential" -> P1 finding，autofix_class: manual，owner: human，frame as tradeoff
- 多个 personas flag 同一 issue -> merge 成 single finding，注明 consensus，increase confidence
- 一个 persona 的 residual concern 与另一个 persona 的 finding 匹配 -> promote concern，注明 corroboration

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-review/SKILL.md`：agent dispatch 和 synthesis patterns
- 当前 `document-review/SKILL.md`：entry point、iteration guidance、"What NOT to Do" guardrails
- iterative-engineering `plan-review/SKILL.md`：synthesis pipeline ordering 和 fingerprint dedup

**测试场景：**
- backend refactor plan 只触发 coherence + feasibility（无 conditional personas）
- 提到 "user authentication flow" 的 plan 触发 coherence + feasibility + security-lens
- 带 UI mockups 和 15 requirements 的 plan 触发全部 6 personas
- `safe_auto` finding 正确更新 terminology inconsistency，无需 user approval
- `gated_auto` finding 虽有 suggested_fix，也呈现给 user（不 auto-apply）
- contradiction finding（scope-guardian vs coherence）作为 combined manual finding 呈现，而不是两个 separate findings
- 一个 persona 的 residual concern 被另一个 persona 的 finding corroborate 后 promote
- 低于 0.50 confidence 的 findings 被 suppressed（不展示给 user）
- 两个 personas 的 duplicate findings merge 成一个，并带两个 reviewer names
- "Review complete" signal 能在 caller context 中正确工作
- 第二轮 refinement pass 推荐 completion
- Protected artifacts 不被 flag for deletion

**验证：**
- Skill 有 valid frontmatter（name: document-review，description 更新为 persona pipeline）
- 所有 agent references 使用 fully-qualified namespace（`compound-engineering:review:<name>`）
- Entry point 匹配当前 skill（path 或 auto-find）
- 保留 terminal signal "Review complete"
- Conditional persona selection logic 集中在 skill 中
- Synthesis pipeline 遵循正确顺序（validate -> gate -> dedup -> promote -> resolve -> route -> sort）
- Reference files 存在：findings-schema.json、subagent-template.md、review-output-template.md
- 包含 cross-platform guidance（platform question tool with fallback）
- Protected artifacts section 存在

---

- [x] **Unit 4：更新 README 并验证**

**目标：** 更新 plugin documentation，反映 new agents 和 revised skill。

**需求：** R1, R7

**依赖：** Unit 1, Unit 2, Unit 3

**文件：**
- 修改: `plugins/compound-engineering/README.md`

**做法：**
- 将 6 个 new agents 加入 README.md 的 Review table（coherence-reviewer、design-lens-reviewer、feasibility-reviewer、product-lens-reviewer、scope-guardian-reviewer、security-lens-reviewer）
- 将 agent count 从 "25+" 更新为 "31+"（或添加 6 个后合适的 count）
- 如果 skills table 中存在 document-review description，则更新它
- 运行 `bun run release:validate` 验证 consistency

**遵循的模式：**
- 现有 README.md table formatting
- Review agent table 内按字母排序

**测试场景：**
- README Review table 中出现全部 6 个 new agents
- Agent count 准确
- `bun run release:validate` 通过

**验证：**
- README agent count 匹配实际 agent file count
- 所有 new agents 都列出并带准确 descriptions
- release:validate 通过且无错误

## 系统级影响

- **Interaction graph:** document-review 被 4 个 skills 调用（ce-brainstorm、ce-plan、ce-plan-beta、deepen-plan-beta）。"Review complete" contract 保留，所以无需 caller changes。
- **Error propagation:** 如果某个 persona agent 在 parallel dispatch 中 fail 或 timeout，orchestrator 应继续使用已完成 agents 的 findings。不要因为单个 agent failure block 整个 review。在 coverage section 中注明 failed agent。
- **State lifecycle risks:** 无：personas 是 read-only。只有 orchestrator 会在 single auto-fix pass 中修改 document。
- **API surface parity:** Skill name（`document-review`）和 terminal signal（"Review complete"）保持不变。对 callers 无 breaking changes。
- **Integration coverage:** 验证 skill 在 standalone 调用以及 4 个 caller contexts 中都能工作。
- **Finding noise risk:** 最多 6 个 personas 可能让 finding count 较高。confidence gate（suppress below 0.50）、dedup（fingerprint matching）和 suppress conditions（per-persona）是三个控噪机制。如果实践中仍然噪音太高，第一 lever 是提高 confidence gate 或增加 suppress conditions。

## 风险与依赖

- **Agent dispatch limit:** ce:review 在 >5 agents 时 auto-switch to serial mode。这里 maximum dispatch 是 6（2 always-on + 4 conditional）。如果全部 6 个激活，orchestrator 仍应使用 parallel dispatch，因为这些是阅读单个 document 的 lightweight document reviewers，而不是扫描 codebase 的 code analyzers。在 skill 中记录该 decision。
- **Contradictory findings:** synthesis phase 必须显式处理 conflicting persona findings。初始实现应倾向于呈现 contradictions（将双方 perspectives 合成 combined finding），而不是 auto-resolve。这样即使稍微更 noisy，也能保留 value。
- **Finding volume at full activation:** 全部 6 个 personas 在大 document 上激活时，pre-dedup finding count 可能超过 20-30。synthesis pipeline（confidence gate + dedup + suppress conditions）应将其降到可管理数量。如果没有，首先 tighten per-persona suppress conditions。
- **Persona prompt quality:** agents 的质量取决于 prompts。Established review patterns 和 iterative-engineering references 提供了 battle-tested material，但 compound-engineering 版本仍是新的，可能需要 iteration。初始 implementation 后计划 1-2 轮 prompt refinement。

## 来源与参考

- **Origin document（来源 document）：** [docs/brainstorms/2026-03-23-plan-review-personas-requirements.md](docs/brainstorms/2026-03-23-plan-review-personas-requirements.md)
- Related code（相关 code）：`plugins/compound-engineering/skills/ce-review/SKILL.md`（multi-agent orchestration pattern）
- Related code（相关 code）：`plugins/compound-engineering/skills/document-review/SKILL.md`（current implementation to replace）
- Related code（相关 code）：`plugins/compound-engineering/agents/review/`（agent structure reference）
- Related pattern（相关 pattern）：iterative-engineering `skills/plan-review/SKILL.md`（synthesis pipeline、findings schema、subagent template）
- Related pattern（相关 pattern）：iterative-engineering `agents/coherence-reviewer.md`、`feasibility-reviewer.md`、`scope-guardian-reviewer.md`、`prd-reviewer.md`、`tech-plan-reviewer.md`、`skeptic-reviewer.md`（persona prompt design、confidence calibration、suppress conditions）
- Related learning（相关 learning）：`docs/solutions/skill-design/compound-refresh-skill-improvements.md`（subagent design patterns）
