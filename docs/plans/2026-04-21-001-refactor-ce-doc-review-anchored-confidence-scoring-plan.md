---
title: "将 ce-doc-review confidence scoring 重构为 anchored rubric"
type: refactor
status: active
date: 2026-04-21
---

# 将 ce-doc-review confidence scoring 重构为 anchored rubric

## 概览

将 ce-doc-review 的 continuous `confidence: 0.0-1.0` field 替换为 5-anchor rubric（`0 | 25 | 50 | 75 | 100`），每个 anchor 都绑定到 persona 可以诚实 self-apply 的 behavioral definition。该 change 采用 Anthropic official code-review plugin 中的 structural techniques（anchored scoring、agent prompt 中 verbatim rubric、explicit false-positive catalog），同时将 threshold（`>= 50`）调整为适合 document-review economics：它与 code review 有相反 asymmetries（无 linter backstop、premise challenges 难以 verification、surfaced findings 可通过 routing menu 廉价 dismiss、missed findings 会 derail downstream implementation）。

目标是消除 false-precision gaming（personas 锚定 0.65 / 0.72 / 0.85 等 round numbers，并暗示 model 实际无法产生的 differentiation），用含义稳定且 behaviorally grounded 的 discrete anchors 取而代之。

## 问题框架

当前状态：`confidence` 是 0.0 到 1.0 的 float。Synthesis 使用 per-severity gates（0.50 / 0.60 / 0.65 / 0.75）和 0.40 FYI floor。LLM-generated confidence 在这种粒度下并没有 meaningful calibration：personas 实践中聚集在 round numbers（0.60, 0.65, 0.72, 0.80, 0.85），而 gate boundaries 创建了 coin-flip bands，微小分数移动就会让 findings 进出 actionable tier。

最近一次 review run 中 surfaced evidence：
- 一个 0.65 adversarial finding 正好卡在 P2 gate：below-noise admission
- 多个 0.68-0.72 区间的 product-lens findings 共享同一个 underlying premise（"motivation weak"）：redundant signal 上的 fake precision
- Residual concerns 和 deferred questions 近似重复 actionable findings，说明 persona 的 internal confidence ordering 不能 coherent 区分 "above-gate finding" 和 "below-gate concern"

Anthropic official code-review plugin（`anthropics/claude-plugins-official/plugins/code-review/commands/code-review.md`）用以下方式解决：
- 5 anchor points（0/25/50/75/100），每个绑定 behavioral criterion（"double-checked and verified", "wasn't able to verify", "evidence directly confirms"）
- 将 rubric verbatim 传给 separate scoring agent
- Threshold >= 80（code-review-specific；doc review 使用不同 threshold）
- Explicit false-positive catalog（明确的 false-positive catalog）

本 plan port structural techniques，并将 threshold tune 到 document-review economics。

## 需求追踪

- R1. 用 5 个 discrete anchor points（0, 25, 50, 75, 100）和每个 anchor 的 behavioral rubric 替换 continuous `confidence` field。
- R2. 更新 synthesis pipeline，使其 consume anchor values（gates, tiebreaks, dedup, promotion, cross-persona boost, FYI floor）。
- R3. 更新全部 7 个 document-review persona agents 的 prompts，使 rubric embedded verbatim。
- R4. 向 subagent template 添加 explicit false-positive catalog（从 scattered current guidance consolidated）。
- R5. 采用适合 doc-review 的 filter threshold：all severities `>= 50`（只 drop "false positive" 和 "stylistic-unverified" tiers）。替换 graduated per-severity gates。
- R6. Preserve current tier routing semantics（保留当前 tier routing 语义）：50 -> FYI，75 -> Decision，100 -> Proposed fix / safe_auto。
- R7. 更新 rendering surfaces（template, walkthrough, headless envelope），让 anchors consistently display as integer scores，而不是 floats。
- R8. 更新 tests and fixtures，不 regress coverage。
- R9. Keep `ce-code-review` unchanged in this PR；它是 separate migration，economics different（see Scope Boundaries）。

## 范围边界

- 不修改 persona-specific domain logic（每个 persona 查什么）。只修改 confidence rubric 和 synthesis consumption。
- 不修改 severity taxonomy（`P0 | P1 | P2 | P3`）。
- 不修改 `finding_type` 或 `autofix_class` enums。
- 不修改 `residual_risks` / `deferred_questions` schema shape（仍为 string arrays）。
- 不新增 schema fields（explicitly rejected `finding_type: grounded | pattern | premise` tag；与 persona attribution redundant）。

### 推迟到单独任务

- **ce-code-review scoring migration**：同样 pattern，但 code-review economics 不同（linter backstop、PR-comment cost、ground-truth verifiability）。threshold 可能是 `>= 75`，更接近 Anthropic。等 ce-doc-review migration 在实践中 proven 后再单独 plan。
- **Separate neutral-scorer agent pass**：第二个 scoring pass，由 neutral agent 独立于 producing persona 重新按 rubric score 每个 finding。结构上有价值（打破 self-serving score inflation），但增加 latency 和 token cost。等 anchor rubric 到位且能直接 measure score inflation effect 后，作为 follow-up 评估。

## 上下文与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-doc-review/references/findings-schema.json`：confidence field definition（lines 60-65, continuous 0.0-1.0）
- `plugins/compound-engineering/skills/ce-doc-review/references/subagent-template.md`：schema rule（line 27）、advisory band rule（line 116）、false-positive list（lines 109-114）
- `plugins/compound-engineering/skills/ce-doc-review/references/synthesis-and-presentation.md`：per-severity gate table（lines 15-25）、FYI floor（line 28）、cross-persona boost（line 45）、promotion patterns（section 3.6）、sort（section 3.8）
- `plugins/compound-engineering/skills/ce-doc-review/references/review-output-template.md`：confidence column rendering（line 67 and section rules）
- `plugins/compound-engineering/skills/ce-doc-review/references/walkthrough.md`：per-finding block 中的 confidence display
- `plugins/compound-engineering/agents/document-review/*.md`：7 persona files。只有 `ce-coherence-reviewer.agent.md` 当前引用 specific confidence floor（`0.85+` for safe_auto patterns, line 26）；其他依赖 template
- `tests/pipeline-review-contract.test.ts`, `tests/review-skill-contract.test.ts`, `tests/fixtures/ce-doc-review/seeded-*.md`：test fixtures with embedded confidence values

### 机构经验

此前没有关于 scoring calibration 的 `docs/solutions/` entry。本 plan 完成后应产出一篇（under `docs/solutions/workflow/` 或 `docs/solutions/skill-design/`），记录 migration 和 doc-review threshold vs Anthropic code-review threshold 背后的 reasoning，因为 tradeoff 不明显，future contributors 可能会质疑 divergence。

### 外部参考

- `anthropics/claude-plugins-official/plugins/code-review/commands/code-review.md`：canonical anchored-rubric pattern。rubric text 和 filter approach 是 structural model；threshold 不直接 port（see Key Technical Decisions）。
- Calibration research context：LLM verbal-confidence studies 显示 coarse anchor scales 优于 continuous numeric scales，因为 continuous scales 会邀请 model 无法产生的 false precision。这也是 Anthropic 选择 5 anchors 而不是 0-100 continuous 的原因。

## 关键技术决策

- **5 anchors, not 3 or 10**：匹配 Anthropic proven format。比 Low/Medium/High resolution 更高，同时足够 discrete 以 avoid gaming。anchor values（0/25/50/75/100）是 literal integer scores，在 schema 中保留为 integers。
- **Filter threshold `>= 50`, not `>= 80`**：Doc review 的 economics 与 code review 相反。threshold 只 drop tier 0（"false positive, pre-existing, or can't survive light scrutiny"）和 tier 25（"might be real but couldn't verify; stylistic-not-in-origin"）。Tiers 50+ 会以适当 routing surface。Rationale inline documented in rubric，让 future contributors 明白 doc review 为什么 diverges from Anthropic 的 `>= 80`。
- **No separate scoring agent（this PR）**：rigorous rubric 下 self-scoring 是第一步。neutral scorer 是 follow-up，等我们能 measure anchors self-scoring 是否仍相对 ground truth inflate。
- **Anchor-to-tier mapping**：50 -> FYI subsection，75 -> Decision / Proposed fix，100 -> eligible for safe_auto when `autofix_class` also warrants。Tier 25 -> dropped。Tier 0 -> dropped。这同时替换 graduated per-severity gate 和 FYI floor。
- **Cross-persona corroboration promotes by one anchor, not `+0.10`**：当 2+ personas raise same finding，promote one anchor step（50 -> 75, 75 -> 100）。比 magic `+0.10` 更 clean，且 semantically meaningful（independent corroboration 真正把 "verified but nitpick" finding 推到 "very likely, will hit in practice"）。
- **Tiebreak ordering**：sorting findings within a severity tier 时，使用 anchor descending，然后 document order（deterministic）。移除当前使用 float confidence 的 pseudo-precision tiebreak。
- **Preserve reviewer attribution as the persona-calibration signal**：不添加 `finding_type: grounded | pattern | premise` tag。如果 persona 的 domain natural ceiling 是 50-75，anchors and threshold 会处理；findings 进入 FYI 或 Decision。output 中 reviewer name 已告诉用户哪个 persona raised it；用户可应用自己的 mental model。
- **Strawman rule stays; advisory band rule absorbed into the rubric**：advisory-band guidance 当前作为 "0.40-0.59 LOW" instruction 存在。在新 rubric 下，"advisory observations" 根据 verifiability 清晰 map 到 tier 25 或 50。重写 advisory rule，使其 refer to anchors，而不是 float range。

## 开放问题

### 规划期间已解决

- **同一个 PR 中 port ce-code-review？** 否。Different economics require different threshold；bundling 会混淆 migration 与 threshold tuning。先做 ce-doc-review，observe，再 plan ce-code-review。
- **保留 numeric anchors，还是使用 semantic labels（weak / plausible / verified / certain）？** 保留 numeric。匹配 Anthropic，为 synthesis comparisons 保留 ordinality，并保持 rendering compact（`Tier: 75` vs `Tier: verified-strong`）。
- **添加 `finding_type: grounded | pattern | premise` dimension？** 否。与 persona attribution redundant，增加 decoding overhead 却不改变 user 如何处理 finding。
- **single threshold 还是 severity-graduated？** all severities 使用 single `>= 50`。Severity 已经排序 list；额外 gate gradient 增加 complexity，不能区分 signal。

### 推迟到实现阶段

- **每个 anchor 的 exact rubric wording。** implementation pass 写 final text；本 plan 捕捉 behavioral criteria。wording 必须足够 concrete，让 persona 可 self-apply without inventing interpretation；"double-checked against evidence" 是 concrete；"highly confident" 不是。
- **是否有 persona 需要 persona-specific floor override。** Coherence 当前将 `0.85+` 作为 safe_auto threshold。新 scale 下，"safe_auto" maps to anchor 100（evidence directly confirms）-- 不需要 separate floor。如果 implementation 时发现其他 persona 有等价 guidance，按 persona 决定 preserve or remove。
- **Fixture value choices。** seeded plan fixtures 带 specific confidence values。将 `0.85` -> `75` 还是 `100` 是 per-fixture judgment call；implementer 根据 fixture demonstrates what 决定。

## 实施单元

- [ ] **Unit 1：更新 schema 和 rubric authority file**

**目标：** 将 `confidence` field definition 替换为 integer enum，并在一个地方写 canonical behavioral rubric。

**需求：** R1

**依赖：** 无（本 unit 建立其他内容消费的 contract）

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-doc-review/references/findings-schema.json`
- 测试： `tests/frontmatter.test.ts`（schema-shape test if one exists；otherwise covered by contract tests in later units）

**方法：**
- 将 `confidence: { type: "number", minimum: 0.0, maximum: 1.0 }` 替换为 `confidence: { type: "integer", enum: [0, 25, 50, 75, 100] }`
- 将 rubric embed 到 `description` field 作为 multi-line string，让 consuming schema 的 agents inline see it。每个 anchor point 都有 behavioral criterion（see "Patterns to follow" below）
- 移除 `"calibrated per persona"` language -- rubric 是 shared，不是 per-persona

**遵循的模式：**
- Anthropic verbatim rubric from `anthropics/claude-plugins-official/plugins/code-review/commands/code-review.md` step 5。将 criteria 适配 document-review context：将 "PR bug" framing 改为 "document issue" framing；将 "directly impacts code functionality" 改为 "directly impacts plan correctness or implementer understanding"；在适用处 preserve "double-checked" / "wasn't able to verify" / "evidence directly confirms" behavioral anchors verbatim

**测试场景：**
- Happy path：带 `confidence: 75` 的 JSON finding 通过 schema validation
- Error path：带 `confidence: 0.72` 的 JSON finding validation 失败（continuous values rejected）
- Error path：带 `confidence: 10` 的 JSON finding validation 失败（non-anchor integer rejected）
- Edge case：`confidence: 0` validates（false-positive anchor 是 legitimate value，不是 validation failure；surface-then-drop 发生在 synthesis）

**验证：**
- `bun test tests/frontmatter.test.ts` passes
- 手动用 schema validator against fixture finding with `confidence: 0.85` 时，produces clear error message

- [ ] **Unit 2：重写 subagent template 中的 rubric guidance**

**目标：** 更新所有 7 个 personas include 的 shared template，使 rubric、false-positive catalog 和 advisory rule 都 reference new anchors。

**需求：** R3, R4

**依赖：** Unit 1（schema 是该 template communicates 的 contract）

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-doc-review/references/subagent-template.md`

**方法：**
- 将 line 27 的 `confidence: a number between 0.0 and 1.0 inclusive` 替换为 anchor definition plus full behavioral rubric（5 bullets, one per anchor）。rubric 放进 template verbatim -- 这是每个 persona render 时看到的内容
- 重写 advisory-band rule（line 116），用 anchor 25 或 anchor 50 替代 "0.40-0.59 LOW band"
- 将 false-positive catalog（currently lines 109-114, scattered）consolidate 为一个 bulleted list，放在 rubric adjacent。添加 adapted from Anthropic code-review list 的 explicit false-positive categories："Issues already resolved elsewhere in the document", "Content inside prior-round Deferred / Open Questions sections", "Stylistic preferences without evidence of impact", "Pre-existing issues the document didn't introduce", "Issues that belong to other personas", "Speculative future-work concerns with no current signal"
- 将 suppress-below-floor rule（line 53）从 "your stated confidence floor" 更新为 "anchor tier 50 (the actionable floor) unless your persona sets a stricter floor"
- 将 example finding（lines 33-48）改为 `confidence: 100`，而不是 `0.92`，并加 one-line inline note 解释原因（"all three conditions met: double-checked, will hit in practice, evidence directly confirms"）

**遵循的模式：**
- Existing autofix_class section structure（lines 60-63）-- three tiers with one-sentence behavioral definition each。对 confidence anchors mirror this format

**测试场景：**
- 测试预期：无 -- 这是 prompt-content file。Behavioral changes 通过 Unit 6 的 persona output-shape tests 测试

**验证：**
- Rubric text 在 template 中 verbatim present
- 文件中不再有 float confidence values（0.0-1.0）references
- False-positive catalog 作为单一 consolidated list 出现，而不是散落的 sentences

- [ ] **Unit 3：更新 synthesis pipeline 以消费 anchor values**

**目标：** 用 anchor-based logic 替换 synthesis pipeline 中每个 numeric-confidence comparison。

**需求：** R2, R5, R6

**依赖：** Unit 1

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-doc-review/references/synthesis-and-presentation.md`

**方法：**
- **Section 3.2 (Confidence Gate):** 用 single rule 替换 per-severity gate table：`confidence: 0` 或 `confidence: 25` 的 findings dropped；`confidence: 50` route to FYI；`confidence: 75` or `100` enters actionable tier，并由 autofix_class classify。删除 separate "FYI floor at 0.40" concept -- 它现在是 `confidence: 50` anchor
- **Section 3.3 (Deduplicate):** 将 "keep the highest confidence" tiebreak 替换为 "keep the highest anchor; if tied, keep the first by document order"
- **Section 3.3b (Same-persona redundancy, added in prior session):** 更新 kept-finding selection rule，使用 anchor ordering
- **Section 3.4 (Cross-persona boost):** 将 `+0.10` boost 替换为 "promote by one anchor step (50 -> 75, 75 -> 100). Anchor 100 does not promote further. Record the promotion in the Reviewer column (e.g., `coherence, feasibility (+1 anchor)`)"
- **Section 3.5b (Tiebreak):** 更新 `suggested_fix present` default-to-Apply gate，reference anchor ordering for tiebreaks
- **Section 3.6 (Promote):** "promote manual to safe_auto/gated_auto" logic 与 confidence orthogonal，保持 as-is；添加 note：promotion does not change the confidence anchor（autofix_class and confidence are independent）
- **Section 3.7 (Route):** 更新 routing table：anchor 100 + `safe_auto` -> silent apply；anchor 100 + `gated_auto` -> proposed fix（recommended Apply）；anchor 75 -> proposed fix / decision per autofix_class；anchor 50 -> FYI subsection regardless of autofix_class
- **Section 3.8 (Sort):** 将 sort-key chain 中的 "confidence (descending)" 替换为 "anchor (descending)"
- **Section 3.9（Residual/Deferred restatement suppression，prior session 新增）：** 无 confidence-dependent logic；无需修改

**遵循的模式：**
- Existing vocabulary-rule pattern at Phase 4 preamble -- 一个 strong directive followed by examples。对 anchor-routing rules 使用同样 style，避免 drift

**测试场景：**
- Happy path：带 `confidence: 75, autofix_class: gated_auto` 的 finding surface 到 Proposed Fixes bucket
- Happy path：带 `confidence: 50, autofix_class: manual` 的 finding surface 到 FYI subsection
- Happy path：带 `confidence: 100, autofix_class: safe_auto` 的 finding silently apply
- Edge case：带 `confidence: 25` 的 finding 被完全 dropped（不 surface 到 FYI，也不 surface 到 Residual Concerns）
- Edge case：两个 personas raise same finding，且都在 anchor 50；post-boost anchor 为 75，finding routes as Decision
- Edge case：一个 persona 在 anchor 100、另一个在 anchor 50 raise same finding；merged keeps 100，boost 不超过 cap

**验证：**
- synthesis file 中不再有 numeric thresholds（0.40, 0.50, 0.60, 0.65, 0.75）
- routing table 明确列出每个 anchor 及其 destination
- Cross-persona boost 使用 "anchor step"，而不是 "+0.10"

- [ ] **Unit 4：更新 rendering surfaces**

**目标：** 在 user-facing output 中将 anchors 显示为 integer scores；移除 float-formatting artifacts。

**需求：** R7

**依赖：** Unit 1, Unit 3

**文件：**
- 修改： `plugins/compound-engineering/skills/ce-doc-review/references/review-output-template.md`
- 修改： `plugins/compound-engineering/skills/ce-doc-review/references/walkthrough.md`
- 修改： `plugins/compound-engineering/skills/ce-doc-review/references/open-questions-defer.md`（if it renders confidence）
- 修改： `plugins/compound-engineering/skills/ce-doc-review/references/bulk-preview.md`（if it renders confidence）

**方法：**
- Table `Confidence` columns 按原样显示 integer score（e.g., `75`），不格式化为 decimal（`0.75`）
- Walkthrough per-finding block 显示 `confidence 75`，而不是 `confidence 0.75`
- `synthesis-and-presentation.md` Phase 4 中的 Headless envelope template 显示 integer anchor
- 添加一行 user-visible rubric legend，让首次看到 `75` 的 reader 无需读取 schema 就理解含义。候选：Coverage table 下的 footer，或 findings list 顶部的一行 note。implementation 时决定 -- whichever integrates cleanly with existing layout

**遵循的模式：**
- Existing `Tier` column in output template（透明 surface internal enum values）。添加 `Confidence` 或 rename `Confidence` 以显示 anchor integer；保持 `Tier` column separate，因为 anchor and tier independent

**测试场景：**
- Happy path：rendered table 在 Confidence column 中显示 `75`，而不是 `0.75`、`75%` 或 `75 (high)`
- Happy path：Walkthrough per-finding block 使用 integer anchor 时读起来自然
- Edge case：当 finding cross-persona-boosted，display shows post-boost anchor value（e.g., 75），Reviewer column notes boost（`coherence, feasibility (+1 anchor)`）

**验证：**
- 通过 synthesis pipeline end-to-end render 一个 fixture finding，输出全程使用 integer anchors，无 float values

- [ ] **Unit 5：更新 persona files**

**目标：** 移除 per-persona 对 specific float confidence values 的 references；确保每个 persona 的 domain instructions 与 shared rubric 配合。

**需求：** R3

**依赖：** Unit 2

**文件：**
- 修改： `plugins/compound-engineering/agents/document-review/ce-coherence-reviewer.agent.md`
- 修改： `plugins/compound-engineering/agents/document-review/ce-adversarial-document-reviewer.agent.md`
- 修改： `plugins/compound-engineering/agents/document-review/ce-design-lens-reviewer.agent.md`
- 修改： `plugins/compound-engineering/agents/document-review/ce-feasibility-reviewer.agent.md`
- 修改： `plugins/compound-engineering/agents/document-review/ce-product-lens-reviewer.agent.md`
- 修改： `plugins/compound-engineering/agents/document-review/ce-scope-guardian-reviewer.agent.md`
- 修改： `plugins/compound-engineering/agents/document-review/ce-security-lens-reviewer.agent.md`

**方法：**
- 对每个 persona file grep `confidence` 和 float values。将 specific numeric references（e.g., coherence's `confidence: 0.85+`）替换为 anchor-based equivalents（`anchor 100 when ... ; otherwise anchor 75`）
- 如果 persona 的 domain naturally caps at anchor 75（例如 adversarial critiques of premises），在 persona domain rubric 中加一句说明，避免它 over-reach for 100。不要添加 per-persona floor override -- shared >= 50 threshold handles all personas
- Verify each persona's suppress-conditions section（验证每个 persona 的 suppress-conditions section）在 anchor vocabulary 下仍然合理；rewrite any float-referencing lines

**遵循的模式：**
- shared subagent template 的 rubric，每个 persona 都 include。任何 persona-specific guidance 应 defer to shared rubric，仅添加与该 persona domain 相关的 calibration hints

**测试场景：**
- Test expectation：per-persona 无单独测试；behavior 通过 Unit 6 的 contract tests 测试

**验证：**
- 任何 persona file 中都不再保留 float confidence values
- 每个 persona 的 prompt 与 new rubric 搭配时读起来 coherent

- [ ] **Unit 6：更新 tests 和 fixtures**

**目标：** 更新所有 test fixtures 和 contract assertions 使用 anchor values；添加 migration-correctness test，确保 rejects float confidence。

**需求：** R8

**依赖：** Unit 1, Unit 3

**文件：**
- 修改： `tests/pipeline-review-contract.test.ts`
- 修改： `tests/review-skill-contract.test.ts`
- 修改： `tests/fixtures/ce-doc-review/seeded-plan.md`
- 修改： `tests/fixtures/ce-doc-review/seeded-auth-plan.md`
- 测试： new contract case in `tests/pipeline-review-contract.test.ts` asserting float confidence is rejected

**方法：**
- Grep every test and fixture file for `confidence` float values。根据 fixture 展示的内容逐个 convert：
- 展示 strong findings 的 fixtures -> `confidence: 100` 或 `75`
- 展示 low-confidence findings 的 fixtures -> `confidence: 25` 或 `50`
- 展示 FYI-band findings 的 fixtures -> `confidence: 50`
- 将 reference threshold values（0.40, 0.60, 0.65）的 contract assertions 更新为 anchor equivalents（50, 75, 100）
- 添加 new contract case：构造 `confidence: 0.72` 的 finding，assert schema validator rejects it

**遵循的模式：**
- 复用 `tests/pipeline-review-contract.test.ts` 中用于 fixture loading 和 schema validation 的 existing test patterns

**测试场景：**
- Happy path：所有 existing fixtures 在 conversion 后都通过 new schema validation
- Error path：带 `confidence: 0.72` 的 synthesized finding validation 失败
- Edge case：由 `confidence: 0.65`（previously above-gate for P2）converted to `confidence: 75` 的 fixture，在 post-migration 中仍 surface in same tier（migration does not drop borderline findings）

**验证：**
- `bun test` passes with 0 failures
- Total test count（测试总数）匹配或超过 pre-migration count（new rejection-test added）

- [ ] **Unit 7：记录 migration 和 threshold divergence**

**目标：** 写一篇 `docs/solutions/` entry，让 future contributors 理解 doc review 为什么使用不同于 Anthropic code-review reference 的 threshold。

**需求：** R1-R9（documents the whole migration）

**依赖：** Units 1-6 complete

**文件：**
- 新增： `docs/solutions/skill-design/confidence-anchored-scoring.md`

**方法：**
- Frontmatter（frontmatter 字段）：`module: ce-doc-review`, `problem_type: design_pattern`, `tags: [scoring, calibration, personas]`
- Body sections（正文 sections）：
  - Problem（问题）：continuous confidence invites false precision；LLMs cluster on round numbers
  - Reference pattern（参考 pattern）：Anthropic's 5-anchor rubric
  - Doc-review-specific divergence（doc-review 专属差异）：threshold >= 50 vs Anthropic's >= 80，with economics argument（no linter backstop, premise challenges resist verification, routing menu makes dismissal cheap）
  - When to port this pattern（何时迁移该 pattern）：other persona-based review skills with similar economics
  - When NOT to port directly（何时不要直接迁移）：ce-code-review has linter-backstop economics and should tune threshold higher

**遵循的模式：**
- 遵循 `docs/solutions/skill-design/` 下 existing entries 的 frontmatter shape 和 section structure

**测试场景：**
- 测试预期：无 -- documentation file with no executable behavior

**验证：**
- File 可通过现有用于检查 `docs/solutions/` frontmatter 的 tooling（如有）
- 不熟悉 migration 的 reader 能读懂 mechanic 和 threshold-tuning rationale

## 系统级影响

- **Interaction graph:** `confidence` field 被每个 synthesis step（3.2, 3.3, 3.3b, 3.4, 3.5b, 3.6, 3.7, 3.8）、每个 rendering surface（template, walkthrough, open-questions-defer, bulk-preview, headless envelope）以及每个 persona output contract 读取。任何漏改都会留下 format mismatch，并作为 validation or rendering bug surface。
- **Error propagation:** 如果 schema change 先于 persona prompts update landing，persona outputs 会 validation fail，pipeline 会 drop all findings。因此 Unit sequencing（Unit 1 before Unit 2 before Unit 5）是 load-bearing。
- **State lifecycle risks:** multi-round decision primer（R29 suppression, R30 fix-landed）将 prior-round findings 存在 memory 中。以 float confidence serialized 的 prior-round findings 不会与 current-round anchor confidence 在 fingerprint comparisons 中 match。Implementation 应检查 primer 是否把 confidence 带入 fingerprint -- 如果是，添加 one-time migration 或 matcher tolerance。
- **API surface parity:** ce-code-review 有相同 field shape 和类似 synthesis pipeline。本 PR 有意 NOT update 它（Scope Boundaries）。当 ce-code-review migration 运行时，可复用 rubric structure，但需要更高 threshold。
- **Integration coverage:** against seeded plan 调用 full ce-doc-review flow 的 end-to-end test，是验证所有 surfaces stay in sync 的唯一方式。Unit 6 contract tests 应包含此类 end-to-end case。
- **Unchanged invariants:** Severity taxonomy、finding_type enum、autofix_class enum、rendering structure（sections, coverage table, routing menu）、multi-round decision primer shape、chain-linking logic（3.5c）、strawman rule。该 change strictly about confidence dimension；其他 dimensions stable。

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| Personas over-cluster on anchor 75（new version of gaming） | Rubric criteria for 75 vs 100 must be behaviorally distinct：75 = "double-checked, will hit in practice"；100 = "evidence directly confirms, will happen frequently"。如果 post-migration 仍 clustering，consider neutral-scorer follow-up（deferred scope） |
| Tests and fixtures update incompletely, leaving hidden float references | Unit 6 includes a grep-all-fixtures audit step；new rejection test catches any fixture that slips through |
| Anchor routing rule in synthesis contradicts rendering rule, causing tier/display drift | Unit 3 and Unit 4 share a test case（end-to-end fixture through pipeline）that catches this。Single-source-of-truth routing table in synthesis-and-presentation.md is canonical；rendering reads from it, not reinvents it |
| `confidence: 0` findings surface in user output by mistake（they should drop silently） | Synthesis 3.2 explicitly drops anchor 0 and anchor 25。Contract test in Unit 6 asserts neither surfaces in any output bucket |
| Doc review threshold >= 50 proves too permissive in practice（too many noisy findings surface） | Threshold easy to tune post-migration（change one rule in synthesis 3.2）。Documented in solution entry（Unit 7），future contributors know where to adjust |
| Persona prompt changes degrade finding quality | Unit 5 preserves persona-specific domain logic；only confidence-related language changes。Run reference plan through migrated flow as smoke test（Unit 6 end-to-end case） |

## 文档与运维说明

- 这是 ce-doc-review schema 的 breaking change。任何 findings JSON 的 external consumer（当前没有 -- schema 是 internal）都需要 update。No external-consumer impact expected。
- No rollout flag needed -- migration atomic across skill。对同一 document 的 before-and-after review 产生 comparable output；anchor scores 统一替换 float scores。
- `docs/solutions/skill-design/confidence-anchored-scoring.md` entry（Unit 7）是解释为什么 doc review diverges from Anthropic code-review threshold 的 canonical explanation。在 PR description 中 link to it。

## 来源与参考

- Anthropic reference rubric（Anthropic 参考 rubric）：`anthropics/claude-plugins-official/plugins/code-review/commands/code-review.md`
- Current schema（当前 schema）：`plugins/compound-engineering/skills/ce-doc-review/references/findings-schema.json`
- Current synthesis pipeline（当前 synthesis pipeline）：`plugins/compound-engineering/skills/ce-doc-review/references/synthesis-and-presentation.md`
- Related prior session work（相关前序 session work）：2026-04-21 review of a ce-doc-review output that surfaced the fine-grained-score gaming problem, leading to this plan
