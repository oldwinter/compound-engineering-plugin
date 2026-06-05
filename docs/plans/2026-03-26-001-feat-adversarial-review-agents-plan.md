---
title: "feat: 为 code 和 documents 添加 adversarial review agents"
type: feat
status: completed
date: 2026-03-26
deepened: 2026-03-26
---

# feat: 为 code 和 documents 添加 adversarial review agents

## 概览

向 compound-engineering plugin 添加两个 adversarial review agents -- 一个用于 code review，一个用于 document review。这些 agents 采取与现有 reviewers 根本不同的姿态：不是根据已知 criteria 评估 quality，而是主动尝试通过构造会 break artifact 的 scenarios、挑战 assumptions，并探查 pattern-matching reviewers 会错过的问题，来 *falsify* artifact。

两个 agents 都作为 conditional reviewers 集成到 existing review ensembles 中，并由 skill-level filtering 激活。两个 agents 都会根据 artifact size 和 risk signals 在内部 auto-scale depth。两个 agents 都使用 standard JSON contract 产出 findings，因此可以干净地 merge into existing synthesis pipelines。

## 问题框架

现有 review infrastructure 已经很全面 -- 24 个 code review agents 和 6 个 document review agents，覆盖 correctness、security、reliability、maintainability、performance、scope、feasibility 和 coherence。但所有 reviewers 都共享一种 *evaluative* stance：根据已知 quality criteria 检查 artifacts。

缺失的是一种 *falsification* stance -- 主动构造会 break artifact 的 scenarios，挑战 decisions 背后的 assumptions，并探查没有任何单一 pattern reviewer 能抓到的 emergent failures。这正是 gstack 的 adversarial evaluation 所填补的 gap（cross-model challenge mode、spec review loops、proxy skepticism、shadow path tracing），也是 compound-engineering 当前缺少的能力。

## 需求追踪

- R1. Code adversarial-reviewer agent 通过构造 failure scenarios 尝试 break implementations
- R2. Document adversarial-reviewer agent 挑战 plans/requirements 中的 premises、assumptions 和 decisions
- R3. 两个 agents 均使用各自 pipeline 的 standard JSON findings contract
- R4. Skill-level filtering：orchestrating skills 决定是否 dispatch adversarial review
- R5. Agent-level auto-scaling：agents 根据 artifact size 和 risk 自行调整 depth（quick/standard/deep）
- R6. Direct invocation：agents 在直接调用时也能工作，不仅限于 skill pipelines
- R7. Clear boundaries：每个 agent 都有 explicit "do not flag" rules，以防与 existing reviewers overlap

## 范围边界

- No cross-model adversarial review（无 Codex/external model integration）-- 那是 separate feature
- 不修改 findings schemas -- 两个 agents 原样使用 existing schemas
- 不新增 skills -- agents 集成到 existing `ce-review` 和 `document-review` skills
- 不修改 synthesis/dedup pipelines -- agents produce standard output，由 existing pipelines 处理
- No beta framework -- 这些是 additive conditional reviewers，不影响 existing behavior

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/agents/review/ce-*.agent.md` -- 24 个 existing code review agents，遵循 consistent structure（identity、hunting list、confidence calibration、suppress conditions、output format）
- `plugins/compound-engineering/agents/document-review/ce-*.agent.md` -- 6 个 existing document review agents（identity、analysis focus、confidence calibration、suppress conditions）
- `plugins/compound-engineering/skills/ce-review/SKILL.md` -- 带 tiered persona ensemble 的 code review orchestration
- `plugins/compound-engineering/skills/ce-review/references/persona-catalog.md` -- reviewer registry，包含 always-on、cross-cutting conditional 和 stack-specific conditional tiers
- `plugins/compound-engineering/skills/document-review/SKILL.md` -- document review orchestration，包含 2 always-on + 4 conditional personas
- `plugins/compound-engineering/skills/ce-review/references/findings-schema.json` -- code review findings contract
- `plugins/compound-engineering/skills/document-review/references/findings-schema.json` -- document review findings contract

### 组织内 learnings

- Reviewer selection 是 agent judgment，不是 keyword matching -- orchestrator 读取 diff 并推理应激活哪些 conditionals
- Per-persona confidence calibration 和 explicit suppress conditions 是主要 noise-control mechanism
- Intent shapes review depth（每个 reviewer 看得多深），不决定 reviewer selection
- Conservative routing on disagreement：merged findings narrow，但没有 evidence 时 never widen
- Subagent template pattern 将 persona + schema + context 包装起来，保证 consistent dispatch

### 外部参考

- 已分析的 gstack adversarial patterns：`/codex` challenge mode（chaos engineer prompting）、`/plan-ceo-review`（proxy skepticism, independent spec review loop）、`/plan-design-review`（auto-scaling by diff size）、`/plan-eng-review`（error & rescue map, shadow path tracing）、`/cso`（20 hard exclusion rules + 22 precedents）

## 关键技术决策

- **Two agents, not one**：Document 和 code adversarial review 需要 fundamentally different reasoning techniques（strategic skepticism vs. chaos engineering）。单一 agent 的 prompt 会过于 sprawling，导致两端都失去 sharpness。
- **Conditional tier, not always-on**：Adversarial review expensive。Small config changes 和 trivial fixes 不需要它。Skill-level filtering gates dispatch；agent-level auto-scaling gates depth。
- **Same short persona name in both pipelines**：两个 agents 都在 JSON output 中使用 `"reviewer": "adversarial"`。这是安全的，因为两个 pipelines（ce-review 和 document-review）不会互相 merge findings。
- **Depth determined by artifact size + risk signals**：agent 读取 artifact 并决定 quick/standard/deep。Callers 可通过 intent summary override depth（例如 "this is a critical auth change, review deeply"）。
- **Agent-internal auto-scaling, not template-driven**：没有 existing review agent 会 auto-scale depth -- 这是 plugin 中的新 pattern。subagent templates 传递 full raw diff/document，但不传 sizing metadata（无 line count、word count 或 risk classification）。与其用 new variables 扩展 shared templates（会影响所有 reviewers），不如让每个 adversarial agent 从已收到的 raw content 估计 size。code agent 统计 diff hunk lines；document agent 从 text 估计 word/requirement count。这样保持 change additive -- 无 template modifications，无 orchestrator changes。
- **Auto-scaling thresholds grounded in gstack precedent**：50-line code threshold 匹配 gstack `plan-design-review` 的 small-diff cutoff，在那里 adversarial review 会被完全 skip。200-line threshold 匹配 gstack escalates to full multi-pass adversarial 的位置。Document thresholds（1000/3000 words）按比例设定 -- 1000-word doc 大致是 lightweight plan，3000-word doc 是 Standard/Deep plan。起始值，后续按 usage tune。
- **No overlap with existing reviewers by design**：每个 agent 的 "What you don't flag" section 明确 defer to existing specialists。adversarial agent 找的是从 system 的 *combination* 或 *assumptions* 涌现的问题，而不是 individual patterns 中的问题。

## 开放问题

### 规划期间已解决

- **agents 是否共享 name？** 是 -- 二者都在各自目录中命名为 `adversarial-reviewer`。fully-qualified names（`compound-engineering:review:adversarial-reviewer` 和 `compound-engineering:document-review:adversarial-reviewer`）不同。persona catalog 使用 FQ names。
- **使用什么 model？** 两者都用 `model: inherit`，匹配其他 review agents。Adversarial review 受益于 strongest available model。
- **confidence thresholds？** Code adversarial：0.60 floor（matching ce-review pipeline）。Document adversarial：0.50 floor（matching document-review pipeline）。High confidence（0.80+）需要 concrete constructed scenario with traceable evidence。

### 延后到实现阶段

- system prompt scenarios and examples 的 exact wording -- 编写 agent 时根据 clarity refine
- depth auto-scaling thresholds（code 的 50/200 lines，docs 的 1000/3000 words）是否需要 tuning -- 先以这些值开始，再按 usage 调整

---

## 实现单元

- [x] **Unit 1：创建 code adversarial-reviewer agent**

  **目标：** 定义用于 code diffs 的 adversarial reviewer，通过构造 failure scenarios 尝试 break implementations

  **需求：** R1, R3, R5, R6, R7

  **依赖：** None

  **文件：**
  - 新增: `plugins/compound-engineering/agents/review/ce-adversarial-reviewer.agent.md`

  **做法：**
  遵循 standard code review agent structure（identity、hunting list、confidence calibration、suppress conditions、output format）。关键差异在 *hunting list* -- 这些不是待匹配的 patterns，而是 *scenario construction techniques*：

  1. **Assumption violation** -- 识别 code 对环境做出的 assumptions（API always returns JSON、config always set、queue never empty、input always within range），并构造这些 assumptions 失效的 scenarios。不同于 correctness-reviewer，后者是在 assumptions 成立时检查 logic。
  2. **Composition failures** -- 追踪 component boundaries 之间的 interactions：每个 component 单独看正确，但组合后失败（ordering assumptions、shared state mutations、caller/callee contract mismatches）。不同于 correctness-reviewer，后者检查 individual code paths。
  3. **Cascade construction** -- 构造 multi-step failure chains："A times out, causing B to retry, overwhelming C." 不同于 reliability-reviewer，后者检查 individual failure handling。
  4. **Abuse cases** -- 找到看似 legitimate 的 usage patterns 造成 bad outcomes："user submits this 1000 times"、"request arrives during deployment"、"two users edit the same resource simultaneously." 这不是 security exploits（security-reviewer），也不是 performance anti-patterns（performance-reviewer）-- 而是 emergent misbehavior。

  Auto-scaling logic 放在 system prompt 中。agent 通过 subagent template 的 `{diff}` variable 接收 full raw diff，通过 `{intent_summary}` 接收 intent summary。不预先计算 sizing metadata -- agent 从收到的 content 估计 diff size，并从 free-text intent summary 提取 risk signals（例如 "Simplify tax calculation" = low risk；"Add OAuth2 flow for payment provider" = high risk）。

  - **Quick**（<50 changed lines）：仅做 assumption violation scan -- 识别 2-3 个 code assumptions，以及它们是否可能 violated
  - **Standard**（50-199 lines）：增加 scenario construction 和 abuse cases
  - **Deep**（200+ lines OR risk signals like auth/payments/data mutations）：增加 composition failures、cascade construction 和 multi-pass

  Suppress conditions（不要 flag 的内容）:
  - 没有 cross-component impact 的 individual logic bugs（correctness-reviewer）
  - SQL injection、XSS 这类 known vulnerability patterns（security-reviewer）
  - 单独的 missing error handling（reliability-reviewer）
  - N+1 queries 这类 performance anti-patterns（performance-reviewer）
  - Code style、naming、structure issues（代码风格、命名、结构问题；maintainability-reviewer）
  - Test coverage gaps（测试覆盖缺口；testing-reviewer）
  - API contract changes（API contract 变更；api-contract-reviewer）

  **遵循的模式：**
  - `plugins/compound-engineering/agents/review/ce-correctness-reviewer.agent.md` -- 最接近的 structural analog
  - `plugins/compound-engineering/agents/review/ce-reliability-reviewer.agent.md` -- 用于 cascade/failure-chain framing

  **测试场景：**
  - Agent file 解析为 valid YAML frontmatter（有效 YAML frontmatter；name、description、model、tools、color fields present）
  - System prompt 包含全部 4 个 hunting techniques，并有 concrete descriptions（具体说明）
  - Confidence calibration 有 3 tiers（三级），匹配 ce-review thresholds（0.80+, 0.60-0.79, below 0.60）
  - Suppress conditions 明确命名每个 defer territory 的 existing reviewer
  - Output format section 匹配 standard JSON skeleton with `"reviewer": "adversarial"`
  - Auto-scaling thresholds 在 system prompt 中 documented

  **验证：**
  - `bun run release:validate` passes
  - Agent file 遵循 existing review agents 的 exact section ordering

---

- [x] **Unit 2：创建 document adversarial-reviewer agent**

  **目标：** 定义用于 planning/requirements documents 的 adversarial reviewer，挑战 premises、assumptions 和 decisions

  **需求：** R2, R3, R5, R6, R7

  **依赖：** None

  **文件：**
  - 新增: `plugins/compound-engineering/agents/document-review/ce-adversarial-document-reviewer.agent.md`

  **做法：**
  遵循 standard document review agent structure（identity、analysis focus、confidence calibration、suppress conditions）。Analysis techniques：

  1. **Premise challenging** -- 质疑 stated problem 是否是真正的问题。"The document says X is the goal -- but the requirements described actually solve Y. Which is it?" 不同于 coherence-reviewer，后者检查 internal consistency，但不质疑 goals themselves 是否正确。
  2. **Assumption surfacing** -- 强制暴露 unstated assumptions。"This plan assumes Z will always be true. Where is that stated? What happens if it's not?" 不同于 feasibility-reviewer，后者在 assumptions 给定时检查 approach 是否可行。
  3. **Decision stress-testing** -- 对每个 major technical or scope decision 追问："What would make this the wrong choice? What evidence would falsify this decision?" 不同于 scope-guardian，后者检查 stated scope 和 stated goals 的 alignment，而不是 goals themselves 是否 well-chosen。
  4. **Simplification pressure** -- "What's the simplest version that would validate this? Does this abstraction earn its keep? What could be removed without losing the core value?" 不同于 scope-guardian，后者检查 scope creep，而不是 scope 内部的 over-engineering。
  5. **Alternative blindness** -- "What approaches were not considered? Why was this path chosen over the obvious alternatives?" 不同于 feasibility-reviewer，后者评估 proposed approach，而不是评估 omitted alternatives。

  Auto-scaling logic。agent 通过 subagent template 的 `{document_content}` variable 接收 full document text，并通过 `{document_type}` 接收 document type（"requirements" or "plan"）。不预先计算 word count 或 requirement count -- agent 从 content 估计。Risk signals 来自 document content itself（domain keywords、abstraction proposals、scope size）。

  - **Quick**（small doc, <1000 words or <5 requirements）：仅 premise check + simplification pressure
  - **Standard**（medium doc）：增加 assumption surfacing + decision stress-testing
  - **Deep**（large doc, >3000 words or >10 requirements, or high-stakes domain like auth/payments/migrations）：增加 alternative blindness + multi-pass

	  Suppress conditions（抑制条件）：
  - Internal contradictions 或 terminology drift（coherence-reviewer）
  - Technical feasibility 或 architecture conflicts（feasibility-reviewer）
  - Scope-goal alignment 或 priority dependency issues（scope-guardian-reviewer）
  - UI/UX quality 或 user flow completeness（design-lens-reviewer）
  - Plan level 的 security implications（security-lens-reviewer）
  - Product framing 或 business justification（product-lens-reviewer）

  **遵循的模式:**
  - `plugins/compound-engineering/agents/document-review/ce-scope-guardian-reviewer.agent.md` -- 最接近的 structural analog（also challenges scope decisions）
  - `plugins/compound-engineering/agents/document-review/ce-feasibility-reviewer.agent.md` -- 用于 assumption-adjacent framing

  **测试场景:**
  - Agent file 解析为 valid YAML frontmatter（name、description、model fields present）
  - System prompt 包含全部 5 个 analysis techniques，并有 concrete descriptions
  - Confidence calibration 有 3 tiers，匹配 document-review thresholds（0.80+, 0.60-0.79, below 0.50）
  - Suppress conditions 明确命名每个 defer territory 的 existing document reviewer
  - Auto-scaling thresholds 在 system prompt 中 documented
  - 无 output format section（document review agents get output contract from subagent template）

  **验证:**
  - `bun run release:validate` passes
  - Agent file 遵循 existing document review agents 的 structural conventions

---

- [x] **Unit 3: 将 code adversarial-reviewer 集成进 ce-review skill**

  **目标:** 将 adversarial-reviewer 注册为 ce-review persona catalog 中的 cross-cutting conditional，并在 skill 中添加 selection logic

  **需求:** R4, R5

  **依赖:** Unit 1

  **文件:**
  - 修改: `plugins/compound-engineering/skills/ce-review/references/persona-catalog.md`
  - 修改: `plugins/compound-engineering/skills/ce-review/SKILL.md`

  **做法:**

	  *Persona catalog（persona catalog，persona 目录）：*
  将 `adversarial` 添加到 cross-cutting conditional tier table：
  ```
  | `adversarial` | `compound-engineering:review:adversarial-reviewer` | Select when diff is >=50 changed lines, OR touches auth, payments, data mutations, external API integrations, or other high-risk domains |
  ```

  *Skill selection logic（Stage 3，skill 选择逻辑）：*
  将 adversarial-reviewer 加入 conditional selection，activation rules：
	  - Diff size >= 50 changed lines（排除 test files、generated files、lockfiles）
	  - OR diff touches high-risk domains（或者 diff 触及高风险领域）：authentication/authorization、payment processing、data mutations/migrations、external API integrations、cryptography
  - intent summary 传给 agent，用于 inform auto-scaling depth（agent decides quick/standard/deep, not the skill）

  *Announcement format（announcement 格式）：*
  ```
  - adversarial -- 147 changed lines across auth controller and payment service
  ```

  **遵循的模式:**
  - `security` 在 persona catalog cross-cutting conditional table 中的列法
  - `reliability` selection logic 在 Stage 3 中的描述方式

  **测试场景:**
  - Persona catalog 的 cross-cutting conditional table 包含 adversarial，且 FQ agent name 正确
  - Selection logic 同时引用 size threshold 和 risk domain triggers
  - Announcement format 匹配 existing conditional reviewer pattern（`name -- justification`）

  **验证:**
  - `bun run release:validate` passes
  - Persona catalog table 在 markdown preview 中正确渲染

---

- [x] **Unit 4: 将 document adversarial-reviewer 集成进 document-review skill**

  **目标:** 在 document-review skill 中将 adversarial-reviewer 注册为 conditional reviewer，并添加 activation signals

  **需求:** R4, R5

  **依赖:** Unit 2

  **文件:**
  - 修改: `plugins/compound-engineering/skills/document-review/SKILL.md`

  **做法:**

  将 adversarial-reviewer 加入 conditional persona selection（Phase 1），activation signals：
  - Document 包含 >5 个 distinct requirements 或 implementation units
  - Document 做出带 stated rationale 的 explicit architectural 或 scope decisions
  - Document 覆盖 high-stakes domains（auth, payments, data migrations, external integrations）
  - Document 提出 new abstractions、frameworks 或 significant architectural patterns

  Announcement format（announcement 格式）：
  ```
  - adversarial-reviewer -- plan proposes new abstraction layer with 8 requirements across auth and payments
  ```

  **遵循的模式:**
  - `scope-guardian-reviewer` activation signals 的列法（bulleted under "activate when the document contains:"）
  - `security-lens-reviewer` activation signals 引用 domain keywords 的方式

  **测试场景:**
  - Activation signals 按 existing conditional reviewers 的同一 format 列出
  - Announcement format 匹配 existing pattern
  - 如果 skill 记录了 cap，则更新 maximum reviewer count（currently 6 max -- now 7 possible）

  **验证:**
  - `bun run release:validate` passes

---

- [x] **Unit 5: 更新 plugin metadata 和 documentation**

  **目标:** 更新 agent counts，并在 plugin README 中 document new adversarial reviewers

  **需求:** None（housekeeping）

  **依赖:** Units 1-4

  **文件:**
  - 修改: `plugins/compound-engineering/README.md`（agent count, reviewer table if one exists）
  - 修改: `.claude-plugin/marketplace.json`（if it tracks agent counts）
  - 修改: `plugins/compound-engineering/.claude-plugin/plugin.json`（if it tracks agent counts）

  **做法:**
  - 更新所有 agent count references（24 code review agents -> 25, 6 document review agents -> 7）
  - 将 adversarial reviewers 添加到所有 agent listing tables
  - 保持 descriptions 与 agent frontmatter descriptions 一致

  **遵循的模式:**
  - 用于 listing agents 的 existing README format
  - 之前添加 agents 时更新 metadata 的方式

  **测试场景:**
  - `bun run release:validate` passes（validates agent counts match between plugin.json and actual files）
  - README 准确反映 new agent count

  **验证:**
  - `bun run release:validate` passes with no warnings

## 系统级影响

- **Interaction graph:** adversarial agents 是 read-only reviewers，通过 subagent template dispatch。它们不修改 code 或 documents。findings 进入 existing synthesis pipeline（confidence gating, dedup, routing），contract 不变。
- **Error propagation:** 如果 adversarial agent fails 或 returns invalid JSON，existing synthesis pipeline 会像处理任何 reviewer failure 一样处理 -- review continues with other reviewers' findings。
- **Token cost:** Adversarial review 在 activated 时为每个 pipeline 添加一个 additional subagent。auto-scaling mechanism（quick/standard/deep）按 artifact size 成比例地 bound token usage。quick depth 下，agent 产生 minimal findings；deep depth 下，它可能产生 ensemble 中最详细的 findings。
- **Dedup behavior with adversarial findings:** ce-review dedup fingerprint 是 `normalize(file) + line_bucket(line, ±3) + normalize(title)`。Adversarial findings 和 pattern-based findings 在同一 code location 通常会有不同 title（例如 "API assumes JSON response format" vs. "Missing null check on API response"），所以 `normalize(title)` 防止 false merging。通过分析 existing overlap zones（correctness vs. reliability at the same `rescue` block，correctness vs. security at parameter parsing lines）已确认 title component 足以区分 truly different problems。document-review pipeline 使用 `normalize(section) + normalize(title)`，collision risk 更低。adversarial agents 应使用 distinctive、scenario-oriented titles（例如 "Cascade: payment timeout triggers unbounded retry loop"），自然区别于 pattern-based reviewer titles。
- **Intent summary interaction:** code adversarial agent 以 free-text 2-3 lines 接收 intent summary（例如 "Add OAuth2 flow for payment provider. Must not regress existing session management."）。agent 用它检测 auto-scaling 的 risk signals -- domain keywords 如 "auth"、"payment"、"migration" 会触发 deeper review。intent 不是 structured data，因此 agent 必须 heuristically parse。这匹配当前所有 other reviewers 接收 intent 的方式。
- **Ensemble dynamics:** 添加 conditional reviewer 不改变 existing reviewers behavior。每个 adversarial agent 的 suppress conditions 在 upstream 最大限度减少 overlap；dedup fingerprint 在 synthesis time 处理剩余 incidental overlap。

## 风险与依赖

- **Risk: Noise generation** -- Adversarial review 本质上会产生可能显得 subjective 或 speculative 的 findings。Mitigation：strict confidence calibration（0.80+ high-confidence adversarial findings 要求 concrete constructed scenario with traceable evidence）、explicit suppress conditions，以及 synthesis 中 existing 0.60/0.50 confidence gates。
- **Risk: Reviewer overlap despite suppress conditions** -- 有些 adversarial findings 可能瞄准与 correctness 或 reliability findings 相同的 code location。Mitigation：dedup fingerprint 的 `normalize(title)` component 可区分 truly different problems（通过分析 existing reviewer overlap zones confirmed）。adversarial agents 应使用 scenario-oriented titles，自然区别于 pattern-based titles。
- **Risk: Auto-scaling is prompt-controlled, not programmatic** -- 如果 agent 忽略 depth guidance，在 small diff 上 deep review，没有 programmatic guard。这是 plugin 中所有 agent behavior 的固有限制（也没有 existing agent 具备 programmatic depth controls）。Mitigation：confidence calibration 和 suppress conditions 会 bound finding volume regardless of depth；noisy quick-mode review 仍会在 synthesis 中被 0.60 confidence gate 过滤。
- **Dependency: Existing synthesis pipeline handles new persona** -- `"reviewer": "adversarial"` persona name 是新的，但遵循同一 JSON contract。不需要 pipeline changes。

## 来源与参考

- Competitive analysis（竞品分析）：位于 `~/Code/gstack/` 的 gstack plugin -- `/codex`、`/plan-ceo-review`、`/plan-design-review`、`/plan-eng-review`、`/cso` skills 中的 adversarial patterns
- Existing agent conventions（现有 agent 约定）：`plugins/compound-engineering/agents/review/ce-correctness-reviewer.agent.md`, `plugins/compound-engineering/agents/document-review/ce-scope-guardian-reviewer.agent.md`
- Persona catalog（persona 目录）：`plugins/compound-engineering/skills/ce-review/references/persona-catalog.md`
- Findings schemas（findings schema）：`plugins/compound-engineering/skills/ce-review/references/findings-schema.json`, `plugins/compound-engineering/skills/document-review/references/findings-schema.json`
