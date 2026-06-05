---
title: "refactor: 在 ce-code-review 中采用 anchored confidence、validation gate 和 mode-aware precision"
type: refactor
status: active
date: 2026-04-21
---

# refactor: 在 ce-code-review 中采用 anchored confidence、validation gate 和 mode-aware precision

## 概览

将 ce-doc-review 的 anchored-confidence pattern 移植到 ce-code-review，并加入三个受 Anthropic 官方 `code-review` plugin 启发的 code-review-specific precision controls：externalization 前的 per-finding validation stage、mode-aware false-positive policy，以及 explicit lint-ignore suppression rule。同时增加 PR-mode-only skip-condition pre-check（closed/draft/trivial/already-reviewed），避免浪费 review cycles。

目标是显著提高 ce-code-review 的 externalizing modes（autofix、headless、未来 PR-comment）的 precision，同时保留 interactive mode 更宽的 review surface。

## 问题框架

ce-code-review 当前使用 continuous `confidence: 0.0-1.0` field，带 0.60 suppress gate、0.50+ P0 exception，以及 `+0.10` cross-reviewer agreement boost。ce-doc-review 刚修复的同一种 false-precision 问题也适用于这里：personas 会锚定 round numbers（0.65、0.72、0.85），gate boundary 形成 coin-flip band，additive boost 掩盖 score 实际衡量的内容。

Review Anthropic 官方 `code-review` plugin（`anthropics/claude-plugins-official/plugins/code-review/commands/code-review.md`）后，发现四个值得采用的 precision techniques：

1. **Anchored 0/25/50/75/100 rubric**：与 behavioral criteria 绑定的离散 buckets 能降低 model-fabricated precision。ce-doc-review 已证明该模式有效（commit `6caf3303`）；ce-code-review 当时被 deferred。
2. **Per-finding validation subagent**：Anthropic 的实际 command 比起 numeric score 更依赖 binary validated/not-validated gate。独立 validation 能捕获 confident-sounding personas 产出的 false positives。我们依赖 cross-reviewer agreement，但它只在 2+ reviewers 恰好收敛时触发；许多真实 findings 只会触发一次。
3. **Skip-condition pre-check**：Anthropic 在做任何工作前跳过 closed、draft、trivial 或 already-reviewed PRs。我们没有等价机制；PR-mode invocations 会在不该 review 的 PR 上花完整 review effort。
4. **Lint-ignore suppression**：如果 code 带有 explicit `eslint-disable`、`rubocop:disable` 等针对 reviewer 即将 flag 的 rule 的 suppress comment，应 suppress 该 finding。当前 false-positive catalog 中没有这一条。

ce-code-review 更宽 review surface 的正确 framing 不是 "narrow to Anthropic's 4-agent shape"，而是 "按 mode 分层 precision bar"：externalizing modes（PR-comment、autofix、headless）需要窄的 Anthropic-style precision；interactive mode 可以允许更宽 findings，只要弱的 general-quality concerns route 到 soft buckets（`advisory` / `residual_risks` / `testing_gaps`），而不是 primary findings。

将 independent validation 作为 Stage 5b *gate*（drop rejected findings，keep approved ones）是正确 framing。该 plan 的早期草稿给每个 finding 增加了 `validated: boolean` field；该 field 是 YAGNI，已移除。validator 的影响体现在 surviving findings 的集合上，而不是 per-finding metadata 上。

## 需求追踪

- R1. 将 continuous `confidence` field 替换为 5 个 discrete anchor points（0、25、50、75、100）和每个 anchor 的 behavioral rubric。镜像 ce-doc-review pattern。
- R2. 更新 Stage 5 synthesis 以消费 anchor values：`>= 75` filter threshold（P0 exception at 50+）、one-anchor cross-reviewer promotion（替代 `+0.10`）、anchor-descending sort。
- R3. 增加新的 Stage 5b validation pass，在 externalization 前对每个 surviving finding spawn 一个 validator subagent。Scope：autofix/headless externalization 和 downstream-resolver handoff 必须运行；interactive terminal display 跳过，因为 human 是 validator。Validation 是 process logic：validator 拒绝的 findings 被 drop；surviving findings 不新增 metadata field。
- R4. 在 synthesis 中让 false-positive policy mode-aware。Headless 和 autofix 应用窄的 Anthropic-style filter（只保留 concrete bugs、compile/parse failures、traceable security、explicit standards violations）。Interactive 将弱的 general-quality concerns demote 到 `advisory` / `residual_risks` / `testing_gaps`，而不是 suppress。
- R5. 在 subagent template 的 false-positive catalog 中增加 explicit lint-ignore suppression rule：如果 code 对 reviewer 即将 flag 的 rule 带有 lint disable comment，则 suppress，除非该 suppression 本身违反 project standards。
- R6. 增加 PR-mode-only skip-condition pre-check（closed、draft、trivial automated、或 already-reviewed by Claude）。干净 skip，不 dispatch reviewers。Standalone branch 和 `base:` modes 不受影响。
- R7. 更新所有 persona files 中 hardcoded float confidence references，以及相关 mode-aware suppression hints。
- R8. 更新 `tests/review-skill-contract.test.ts` 和相关 fixtures 中的 test fixtures 和 contract tests。
- R9. 在 `docs/solutions/skill-design/` 中记录 migration，扩展现有 ce-doc-review note，包含 ce-code-review 特定 threshold 的 rationale 和 validation-stage scoping decision。

## 范围边界

- 不改变 persona-specific domain logic（每个 persona 查找什么）。只改变 confidence rubric、validation flow、mode-aware policy 和 skip-conditions。
- 不改变 severity taxonomy（`P0 | P1 | P2 | P3`）。
- 不改变 `autofix_class` 或 `owner` enums。
- 不把 17-persona architecture collapse 成 Anthropic 的 4-agent shape。ce-code-review 更宽的 surface 是刻意设计。
- 不改变 standalone / branch / PR / `base:` scope-resolution paths in Stage 1。

### 推迟到单独任务

- **PR inline comment posting mode**：Anthropic 的 `--comment` flag 会通过 `mcp__github_inline_comment__create_inline_comment` 将 findings 作为 inline GitHub PR comments 发布，并要求 full-SHA link discipline 和适用于 small fixes 的 committable suggestion blocks。我们今天完全没有 PR-comment mode。这是一个 substantial new mode（link format、suggestion-block handling、deduplication semantics、tracker integration overlap），值得单独 plan；本 refactor 为它建立 precision foundation。
- **Haiku-tier orchestrator-side checks**：Anthropic 使用 haiku 做 skip-condition probe 和 CLAUDE.md path discovery。我们目前所有步骤都用 sonnet；将 cheap checks 推到 haiku 是单独的 cost-optimization task。
- **Re-evaluating which always-on personas earn their noise**：Anthropic 的 HIGH-SIGNAL philosophy 引出一个问题：`testing` 和 `maintainability` 是否仍应 always-on。本 plan 不处理；通过 mode-aware soft-bucket routing 暂时承接，但更深 rethink 应单独讨论。

## 上下文与调研

### 相关代码和模式

**直接移植目标（ce-doc-review prior art）：**
- `plugins/compound-engineering/skills/ce-doc-review/references/findings-schema.json`：anchored integer enum precedent
- `plugins/compound-engineering/skills/ce-doc-review/references/subagent-template.md`：verbatim rubric + consolidated false-positive catalog
- `plugins/compound-engineering/skills/ce-doc-review/references/synthesis-and-presentation.md`：anchor gate、one-anchor promotion、anchor-descending sort
- Commit `6caf3303`：migration diff 是该 skill 需要修改内容的 canonical reference

**本 plan 修改的 files：**
- `plugins/compound-engineering/skills/ce-code-review/SKILL.md`：Stage 1（skip-condition gate）、Stage 5（anchor gate、promotion）、new Stage 5b（validation）、Stage 6（mode-aware false-positive policy）
- `plugins/compound-engineering/skills/ce-code-review/references/findings-schema.json`：confidence enum、`_meta` 中的 threshold table
- `plugins/compound-engineering/skills/ce-code-review/references/subagent-template.md`：anchored rubric、加入 lint-ignore rule 的 expanded false-positive catalog、mode-aware suppression hints
- `plugins/compound-engineering/skills/ce-code-review/references/persona-catalog.md`：确认无 float references 残留（无需行为变化）
- `plugins/compound-engineering/skills/ce-code-review/references/review-output-template.md`：confidence column 中的 anchor-as-integer rendering
- `plugins/compound-engineering/skills/ce-code-review/references/walkthrough.md`：per-finding block 中的 anchor display
- `plugins/compound-engineering/skills/ce-code-review/references/bulk-preview.md`：若出现 confidence，则 anchor rendering
- `plugins/compound-engineering/agents/ce-*-reviewer.agent.md`：sweep hardcoded float references
- `tests/review-skill-contract.test.ts`：anchor enum assertions、validation-stage assertions、skip-condition assertions
- `tests/fixtures/`：任何含 embedded confidence values 的 seeded review fixtures
- `docs/solutions/skill-design/confidence-anchored-scoring.md`：扩展 ce-code-review section

### 机构经验

- `docs/solutions/skill-design/confidence-anchored-scoring.md`：anchored-rubric pattern 的 canonical writeup。它确立 ce-doc-review 的 `>= 50` threshold，并明确预期 ce-code-review 的 threshold 是 `>= 75`，因为经济学相反（有 linter backstop、PR-comment cost、高可验证性 code claims）。
- `docs/plans/2026-04-21-001-refactor-ce-doc-review-anchored-confidence-scoring-plan.md`：ce-doc-review plan，尤其是 "Deferred to Separate Tasks" 中点名本 follow-up 的条目。Sequencing rationale（"do ce-doc-review first, observe, then plan ce-code-review"）已被遵守。

### 外部参考

- `anthropics/claude-plugins-official/plugins/code-review/commands/code-review.md`：四个 code-review-specific patterns（anchored rubric、validation step、skip-conditions、lint-ignore）的 canonical source。注意：README 描述了 0/25/50/75/100 scale 和 threshold 80，但实际 command prompt 更依赖 binary validated/not-validated gate（他们的 Step 5）而不是 numeric score。我们忠实建模该设计：同时采用 anchored rubric 和 validation gate，并承认 validation gate 是 load-bearing precision mechanism。
- Two-model comparative analysis（this conversation, 2026-04-21）：原始 reflection 加第二模型 critique，提出 (a) validation gate 比 upstream design 中的 numeric score 更重要，(b) false-positive policy 应 mode-aware，(c) confidence 与 validation 应是 decoupled fields。三点 insights 都已 R-traced。

### Slack 上下文

Slack tools detected。可随时要求我搜索 Slack 获取 organizational context，或在下一条 prompt 中包含它。

## 关键技术决策

- **Threshold `>= 75`, not `>= 80`**：匹配 ce-doc-review 的风格，即用 anchor 本身作为 threshold（避免离散 scale 下 awkward 的 `>= 80` middle-bucket gap，因为那实际上意味着只剩 "100"）。在 `>= 75` 下，anchor 75（"real, will hit in practice"）和 anchor 100（"evidence directly confirms"）会 survive；anchors 0 / 25 / 50 被 drop。P0 exception at 50+ 保留当前对 critical-but-uncertain issues 的 escape hatch。
- **Validation is process logic, not a metadata field**：该 plan 早期草稿给每个 finding 增加 `validated: boolean` field。已移除：rejected findings 被 drop，因此 post-validation 的 surviving findings 默认已 validated；不运行 validation 的 modes 中，没有 consumer 需要 per-finding flag，因为 run mode 已说明 validation 是否运行。任何 mode 中常量的 field 都没有工作要做，而且 `validated` 这个名字暗含它并不承载的 truth claim。Validation 只作为 Stage 5b gate；不做 schema change。
- **Validation is scoped to externalization, not universal**：验证每个 finding 大致会使 agent calls 翻倍。只有 findings 将发布到 GitHub、自动 apply、或 hand off 给 downstream automation 时，这个成本才合理，因为 false positives 有实际代价。Interactive terminal display 中，user 通过阅读提供 validation。
- **One validator subagent per finding, not batched**：独立性就是产品价值。单个 batched validator 同时看所有 findings，会在它们之间 pattern-match，本质上变成 opinionated re-reviewer，重新制造 persona-bias 问题。Per-finding parallel dispatch 为每次调用保持 fresh context。Per-file batching 是未来 plausible optimization，适合许多 findings clustered in few files 的 review，但今天不需要（typical reviews post-gate 后产生 3-8 findings）。
- **Validator dispatch budget cap**：为限制异常大 finding set 的 worst-case cost，将 parallel validator dispatch cap 设为 15。如果 Stage 5 后有更多 findings survive，先按最高 severity 验证前 15 个，剩余 queue 到第二 wave。这是 safety bound；typical reviews 不会触发。
- **Mode-aware false-positive policy uses existing soft buckets, not a new schema field**：弱的 general-quality findings 已经有明确归宿（`residual_risks` 表示 noticed but couldn't confirm，`testing_gaps` 表示 missing coverage，`advisory` autofix_class 表示 report-only）。Mode-aware demotion 在 interactive mode 中把 weak findings route 到这些 buckets，在 headless/autofix 中 suppress。无需新 schema。
- **One-anchor cross-reviewer promotion replaces `+0.10` boost**：镜像 ce-doc-review。比 additive math 更清晰，语义上也有意义（independent corroboration 将 "real but minor" finding 提升为 "real, will hit in practice"）。
- **Skip-condition gate is PR-mode only**：Standalone、branch、`base:` modes 始终运行。closed/draft/trivial/already-reviewed checks 只在存在 PR 时有意义。Already-reviewed detection 使用 `gh pr view <PR> --comments` 过滤 prior Claude-authored comments；与 Anthropic 使用的模式相同。
- **Lint-ignore suppression has a project-standards exception**：如果 finding 关于 CLAUDE.md/AGENTS.md rule violation，而 code 使用 lint disable 来 suppress 该 specific rule，那么 suppression 本身可能违反 project standards（例如 "do not use `eslint-disable-next-line` for security rules"）。规则是 "suppress the finding *unless* the suppression itself is the violation."
- **No haiku-tier downgrade in this plan**：skip-condition pre-check 自然适合 haiku，但 model-tier choices 不在本 scope。使用该 skill 其余部分同样的 mid-tier（sonnet）；haiku 是自己的 optimization plan。

## 开放问题

### 规划期间已解决

- **Threshold value（`>= 75` vs `>= 80`）？** 结论：`>= 75`。匹配 ce-doc-review 用 anchor 作为 threshold 的方式，并避免离散 scale 下 "`>= 80` collapses to anchor 100 only" 的坑。
- **在 findings 上添加 `validated` field，还是让 validation 保持 process-only？** 结论：process-only。post-validation surviving findings 默认已 validated；`metadata.json` 中的 mode metadata 已说明 validation 是否运行。Per-finding flag 是 YAGNI，而且名字暗含它不承载的 truth claim。
- **Validate every finding or only externalizing ones?** 结论：只验证 externalizing（autofix、headless、downstream-resolver handoff）。Interactive 使用 human as validator。
- **One validator per finding、batched、or per file?** 结论：per finding，parallel。独立性是设计点。若真实数据表明 reviews 经常在少数 files 中聚集大量 findings，则未来可做 per-file batching optimization。
- **Adopt PR-comment posting mode in this plan?** 结论：deferred。这是 substantial new mode，会冲淡 precision-foundation focus。
- **Should we collapse to Anthropic's 4-agent architecture?** 结论：不。我们的 17-persona surface 服务更宽 workflow（pre-PR review、learnings、deployment notes）。采用他们的 precision techniques，而不采用他们的 narrowness。

### 推迟到实现阶段

- **code-review economics 下的 exact rubric wording per anchor**。ce-doc-review wording 可作为起点，但 code review 有 doc review 不具备的 unambiguous ground truth（compile errors、runtime bugs）。Anchor 100 应提及 "directly verifiable from the code without execution" 或类似内容；implementation pass 写最终文本。
- **Validator subagent prompt design**。validator 的工作是 independent re-verification，不是 re-reasoning。Prompt 应给它 finding title、file、line range、`why_it_matters`、diff 和 surrounding code，并询问 "is this real, introduced by this diff, and not handled elsewhere?" 最终措辞在 implementation 期间决定；Anthropic 的 Step 5 prompt 是 reference material。
- **Whether to validate findings about to be presented in interactive mode's walk-through**。walk-through 技术上是 interactive（human in the loop），但 user 可能 LFG-bulk-apply，这跨入 externalization。Decision-deferral candidate：在 LFG bulk-apply 前 validate；否则 skip。
- **Persona files 是否需要除 float-reference sweep 以外的其他更新**。少数 personas 可能带有 domain-specific calibration text（例如 security："always flag SQL injection at high confidence"），需要改写为 anchors。逐文件判断。

## 实施单元

- [ ] **Unit 1：用 anchored confidence 更新 findings schema**

**目标：** 将 continuous `confidence` 替换为 integer enum。更新 `_meta.confidence_thresholds`，描述 anchor-based gates。

**需求：** R1

**依赖：** None：本 unit 建立后续所有 units 消费的 contract。

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-code-review/references/findings-schema.json`
- 测试：`tests/review-skill-contract.test.ts`（schema-shape assertions）

**方法：**
- 将 `confidence: { type: "number", minimum: 0.0, maximum: 1.0 }` 替换为 `confidence: { type: "integer", enum: [0, 25, 50, 75, 100] }`。
- 重写 `_meta.confidence_thresholds` table，描述 anchors 和 `>= 75` gate（with P0 exception at 50+）。
- 不增加 `validated` field：validation 是 Stage 5b 中的 process logic。post-validation surviving findings 默认已 validated；rejected findings 被 drop。rationale 见 Key Technical Decisions。

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-doc-review/references/findings-schema.json`：anchor enum precedent

**测试场景：**
- Happy path：Schema 可通过 `confidence: 75` 的 finding。
- Edge case：Schema 拒绝 `confidence: 0.85` 的 finding（float not in enum）。
- Edge case：Schema 拒绝 `confidence: 80` 的 finding（not in enum）。
- Edge case：`_meta` 以 human-readable form 记录 threshold semantics（smoke test：assert key strings present）。

**验证：**
- `tests/review-skill-contract.test.ts` 中所有 schema assertions 按新 shape 通过。
- `bun run release:validate` 报告无 parity drift。

---

- [ ] **Unit 2：用 anchored rubric、expanded false-positive catalog 和 mode-aware hints 重写 subagent template**

**目标：** 用 verbatim 5-anchor behavioral rubric 替换 float rubric。扩展 false-positive catalog，加入 lint-ignore suppression。添加 mode-aware suppression hint，让 personas 知道它们的 findings 会在 headless/autofix 下被不同过滤。

**需求：** R1, R4, R5

**依赖：** Unit 1（schema 必须接受 anchor values）。

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-code-review/references/subagent-template.md`

**方法：**
- 将 "Confidence rubric (0.0-1.0 scale)" section（lines 41-49）替换为 5-anchor rubric，每个 anchor 命名并绑定一个 persona 可自我应用的 behavioral criterion（例如 "100: Verifiable from the code alone without running it"）。
- 将 suppress-threshold sentence 更新为 "Suppress threshold: anchor 75. Do not emit findings below anchor 75 (except P0 at anchor 50)."
- 扩展 false-positive catalog（lines 75-81），明确加入 lint-ignore rule："Code with an explicit lint disable comment for the rule you are about to flag — suppress unless the suppression itself violates a project-standards rule."

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-doc-review/references/subagent-template.md`：rubric 和 false-positive catalog structure

**测试场景：**
- Happy path：Template 渲染出全部 5 个 anchors 和 behavioral definitions。
- Integration：spawn 一个 persona against a fixture diff，返回 findings with anchor values。

**验证：**
- rubric 出现在 template 中，且匹配 schema enum。
- false-positive catalog 包含 lint-ignore handling。
- 本 unit 落地后，无 persona sub-agent prompt 继续引用 continuous floats。

---

- [ ] **Unit 3：用 anchor gate、one-anchor promotion 和 anchor-descending sort 更新 synthesis Stage 5**

**目标：** 更新 merge stage，使其消费 integer anchors。用 `>= 75`（P0 exception at 50+）替换 `0.60` threshold。用 one-anchor promotion 替换 `+0.10` cross-reviewer boost。将 sort 改为 anchor descending。

**需求：** R2

**依赖：** Units 1, 2.

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Stage 5）

**方法：**
- 在 Stage 5 step 1（"Validate"）中，将 `confidence` value constraint 从 `numeric, 0.0-1.0` 更新为 `integer in {0, 25, 50, 75, 100}`。
- 在 Stage 5 step 2（"Confidence gate"）中，将 "Suppress findings below 0.60 confidence. Exception: P0 findings at 0.50+" 改为 "Suppress findings below anchor 75. Exception: P0 findings at anchor 50+ survive."
- 在 Stage 5 step 4（"Cross-reviewer agreement"）中，将 "boost the merged confidence by 0.10 (capped at 1.0)" 替换为 "promote the merged finding by one anchor step (50 -> 75, 75 -> 100, 100 -> 100). Cross-reviewer corroboration is a stronger signal than any single reviewer's anchor; the promotion routes the finding from the soft tier into the actionable tier or strengthens its already-actionable position."
- 在 Stage 5 step 9（"Sort"）中，将 "confidence (descending)" 改为 "anchor (descending)"。
- 更新 Stage 5 preamble，描述新 contract（integer anchors 而非 floats）。

**测试场景：**
- Happy path：两个 reviewers 以 anchor 50 flag 同一 fingerprint；merged result 为 anchor 75（one-anchor promotion）。
- Happy path：两个 reviewers 以 anchor 75 flag 同一 fingerprint；merged result 为 anchor 100。
- Happy path：一个 reviewer 以 anchor 100 flag；merged result 保持 anchor 100（不过度 promotion）。
- Edge case：单个 reviewer 以 anchor 50 flag，无其他 reviewer 同意；merged result 被过滤（below threshold）。
- Edge case：P0 finding at anchor 50 survives gate；P1 finding at anchor 50 不 survive。
- Edge case：Sort order：两个 same severity findings，一个 anchor 100、一个 anchor 75；anchor-100 finding 排在前。

**验证：**
- `tests/review-skill-contract.test.ts` synthesis assertions 在新 gate、promotion、sort 下通过。
- 对 fixture diff 的 manual review run 产出 expected anchor distributions 和 routing。

---

- [ ] **Unit 4：为 externalizing findings 添加 Stage 5b validation pass**

**目标：** 插入新的 synthesis stage：当 run 将 externalize 时，对每个 surviving finding spawn 一个 validator subagent。Validator yes -> finding survives；validator no、timeout 或 malformed output -> finding dropped。纯 process logic；surviving findings 不新增 metadata。

**需求：** R3

**依赖：** Units 1, 3.

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Stage 5 和 Stage 6 之间的新 Stage 5b）
- 新增：`plugins/compound-engineering/skills/ce-code-review/references/validator-template.md`：validator subagent 的 prompt template

**方法：**
- Stage 5 merge 产出 deduplicated finding set 后，决定是否运行 validation。Validation 在以下情况下运行：
  - Mode 是 `headless` 或 `autofix`
  - Mode 是 `interactive` 且 routing path 是 LFG（option B）或 File-tickets（option C）
  - 未来 PR-comment mode（添加后）
- Validation 在以下情况下不运行：
  - Mode 是 `report-only`
  - Mode 是 `interactive` 且 routing 是 walk-through（option A）per-finding（user 是 validator）或 Report-only（option D）
- 对每个 surviving finding，parallel spawn 一个 validator subagent。Validator prompt（在 `references/validator-template.md` 中）给出：finding title、file、line、`why_it_matters`、diff，以及通过平台 read tool 获取 surrounding code。Validator 返回 `{ "validated": true | false, "reason": "..." }`。
- validator 返回 `false` 的 findings 被 drop。validator 返回 `true` 的 findings unchanged 流入 Stage 6；不在 finding 上设置 field（validation 是 process logic，不是 metadata）。
- Validator 与 personas 一样使用 mid-tier（sonnet）。Validator 是 read-only，与 persona reviewers 相同 constraints。
- **Dispatch budget cap: max 15 parallel validators.** 当 Stage 5 后超过 15 个 findings survive，按 severity desc 排序取前 15 个进行 validate（P0 first，然后 P1/P2/P3，同级按 anchor descending 打破 ties），剩余全部 drop 并在 Coverage 中注明。这是 safety bound；typical reviews post-gate 后 < 10 findings，不会触发。直白的 "drop the rest" behavior 是刻意的：一场 review 产生 15+ surviving findings 时，已经进入 second wave 不会改变 user triage approach 的 territory。
- 在 Coverage 中记录 validation drop count 和任何 over-budget drops。
- 如果 validator subagent fail、timeout 或返回 malformed JSON，将其视为 no-vote 并 drop finding。未经验证的 findings 不应 externalize。保守偏置正确。
- **Future optimization（not implemented here）：** per-file batching。按 file group surviving findings，每个 file dispatch 一个 validator（validator 读一次 file，评估该 file 中所有 findings）。当 reviews 在少数 files 中聚集大量 findings（large refactors）时才有真实收益。真实数据证明重要之前先不做；per-finding parallel dispatch 是 typical reviews 的正确 default。

**Execution note：** 先为 validation stage 增加 contract test，再 wire into orchestrator，这样有 known-good harness 做 fixture-based verification。

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-code-review/references/subagent-template.md`：validator template 的 output contract structure
- Anthropic `commands/code-review.md` 中的 Step 5：validator 的工作是 independent re-verification，不是 re-reasoning

**Technical design：** *(方向性指导，不是 implementation specification)*

```
Stage 5 -> merged findings
  |
  v
Stage 5b: Validation gate
  |
  +-- mode in {headless, autofix} OR (interactive AND routing in {LFG, File-tickets})?
  |     YES -> sort findings by severity desc, take top 15
  |     |     spawn one validator subagent per finding, in parallel
  |     |     each validator: { validated: true | false, reason: ... }
  |     |     drop findings the validator rejects; survivors flow through unchanged
  |     |     drop findings beyond the 15-cap with a Coverage note
  |     NO  -> pass through unchanged
  |
  v
Stage 6 -> synthesize and present
```

**测试场景：**
- Happy path（正常路径）：Headless mode，validator confirms a finding；finding unchanged survive 到 Stage 6。
- Happy path（正常路径）：Headless mode，validator rejects a finding；finding dropped，并在 Coverage 中计数且带 validator reason。
- Happy path（正常路径）：Interactive mode，walk-through routing；validation stage 完全 skipped，所有 surviving findings pass through。
- Edge case（边界情况）：Validator subagent timeout；finding dropped。
- Edge case（边界情况）：Validator returns malformed JSON；finding dropped，记录 drop reason。
- Edge case（边界情况）：Headless mode 中 20 个 findings survive Stage 5；前 15 个（按 severity desc 排序）parallel validate，剩余 5 个 dropped，并带 Coverage note "5 findings exceeded validator budget cap and were not externalized."
- Integration（集成）：Autofix mode 只 apply validator-approved `safe_auto` findings；validator-rejected `safe_auto` finding 不进入 fixer queue。

**验证：**
- `tests/review-skill-contract.test.ts` validation-stage assertions 通过。
- Coverage section 报告 validator drop count 和任何 second-wave deferrals。
- Autofix mode 不 apply validator-rejected findings。

---

- [ ] **Unit 5：在 Stage 1 添加 PR-mode-only skip-condition pre-check**

**目标：** 在 PR mode（提供 PR number 或 URL）下，在标准 Stage 1 scope-detection 运行前做 cheap skip-condition check。如果 PR closed、draft、marked trivial/automated，或 already reviewed by a prior Claude run，则不 dispatch reviewers，干净 skip。

**需求：** R6

**依赖：** None：这是 pre-stage gate，独立于 schema 和 synthesis changes。

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Stage 1 PR/URL path，existing checkout step 前）

**方法：**
- 在 Stage 1 的 "PR number or GitHub URL is provided" branch 顶部增加 sub-step。
- 运行单个 `gh pr view <number-or-url> --json state,isDraft,title,body,comments` call，一次 round trip 获取所有 skip-relevant data。
- 应用 skip rules：
  - `state` 是 `CLOSED` 或 `MERGED` -> skip，并提示 "PR is closed/merged; not reviewing."
  - `isDraft` 是 `true` -> skip，并提示 "PR is a draft; not reviewing. Re-invoke once it's marked ready."
  - `title` 匹配 trivial-PR pattern（例如 `^(chore\\(deps\\)|build\\(deps\\)|chore: bump|chore: release)`）且 body empty/template-only -> skip，并提示 "PR appears to be a trivial automated PR; not reviewing. Pass `mode:headless` or another explicit invocation if review is intended."
  - `comments` 包含任何 body 以 ce-code-review report header 开头的 comment（例如 `## Code Review` 或 headless completion line）-> skip，并提示 "PR already has a ce-code-review report. To re-review, run from the branch (no PR target) or pass `base:<ref>` against the current checkout."
- Skip detection 故意忽略 commits-since-comment。是的，如果 prior review 后有 new commits，这会 over-suppress；user 的 escape hatch 是 branch mode 或 `base:` mode，两者都完全绕过 PR-mode skip-check。相比 commit-vs-comment timestamp logic，这更容易检测和解释。
- 干净 skip：emit message 后停止，不 dispatch reviewers，也不 run scope detection。
- Standalone branch 和 `base:` modes 不受影响，始终运行。

**遵循的模式：**
- Anthropic `commands/code-review.md` 的 Step 1：同一组 skip conditions
- Existing Stage 1 "uncommitted changes" check：同样形状，probe state，如果 conditions 不允许继续则 emit message 并 early stop

**测试场景：**
- Happy path：PR open、draft false、title normal、无 prior Claude comment；skip-check 通过，scope detection 运行。
- Edge case：PR closed；skip-check 以 closed message early stop；不 dispatch reviewers。
- Edge case：PR draft；skip-check 以 draft message early stop。
- Edge case：PR title 为 `chore(deps): bump foo from 1.0 to 1.1`；skip-check 以 trivial message early stop。
- Edge case：PR 有 prior ce-code-review report comment；skip-check early stop，并且不管后续 commits。
- Negative：Standalone mode（无 PR argument）不运行 skip-check。
- Negative：`base:` mode 不运行 skip-check。

**验证：**
- `tests/review-skill-contract.test.ts` skip-check assertions 通过。
- 对 closed PR 的 manual run 干净退出，且不 dispatch reviewers。

---

- [ ] **Unit 6：在 Stage 5/6 添加 mode-aware false-positive demotion**

**目标：** 在 Stage 5（merge 后、validation 前）中，interactive mode 将弱 general-quality findings demote 到 soft buckets，headless/autofix mode 则 suppress。重点是保留 personas 产出的相同 content，但在 interactive 中将 weak signal route 到 `residual_risks` / `testing_gaps` / `advisory`，而不是 primary findings；在 externalizing modes 中完全 suppress。

**需求：** R4

**依赖：** Units 1, 3.

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-code-review/SKILL.md`（Stage 5 step ordering 和 Stage 6 rendering）

**方法：**
- 精确定义 "weak general-quality finding"：finding 的 `severity` 是 P2 或 P3、`autofix_class` 是 `advisory`，且 persona 是 `testing` 或 `maintainability`（最容易产生 general-quality flagging 的 always-on personas）。这是保守定义；实践证明需要时再扩展。
- 在 Stage 5（merge 后、partition 前）应用 mode-aware demotion：
  - **Interactive mode:** 将 weak general-quality findings 移出 primary findings list。如果 finding 来自 `testing`，将 `title` + `why_it_matters` append 到 `testing_gaps`。如果来自 `maintainability`，append 到 `residual_risks`。finding 不出现在 Stage 6 findings table。
  - **Headless and autofix modes:** 完全 suppress weak general-quality findings。在 Coverage 中记录 suppressed count。
  - **Report-only mode:** 与 interactive 相同，demote 到 soft buckets，不 suppress。
- Stage 6 rendering 已显示 `residual_risks` 和 `testing_gaps`；demoted destinations 不需要 template change。更新 Coverage section，分别报告 mode-aware suppressions/demotions 和现有 confidence-gate suppressions。

**测试场景：**
- Happy path：Interactive mode，`testing` persona 产出 P3 advisory finding；demotion 后它出现在 `testing_gaps`，不在 findings table 中。
- Happy path：Headless mode，同一 finding 被 suppressed 并在 Coverage 中计数。
- Happy path：`correctness` persona 产出 P3 advisory finding；不适用 demotion（保守定义只包含 `testing` 和 `maintainability`），finding 出现在 findings table。
- Edge case：`testing` persona 产出 P0 finding；不适用 demotion（severity 超出 threshold）。
- Edge case：`maintainability` persona 产出 P2 `safe_auto` finding；不适用 demotion（autofix_class 不是 `advisory`）。

**验证：**
- `tests/review-skill-contract.test.ts` mode-demotion assertions 通过。
- Interactive mode 的 Stage 6 output 在 `testing_gaps`/`residual_risks` 中显示 demoted findings，而不是 findings table。

---

- [ ] **Unit 7：扫描 persona files 并更新 walkthrough/template/bulk-preview rendering**

**目标：** 更新所有 reviewer persona files 中的 hardcoded float references（例如某个 persona 写着 "always file SQL injection at 0.85+"）。更新 rendering surfaces，使 anchors 作为 integers 一致显示。

**需求：** R7

**依赖：** Units 1, 2.

**文件：**
- 修改：`plugins/compound-engineering/agents/ce-correctness-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-testing-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-maintainability-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-project-standards-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-security-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-performance-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-api-contract-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-data-migrations-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-reliability-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-adversarial-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-cli-readiness-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-previous-comments-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-dhh-rails-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-kieran-rails-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-kieran-python-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-kieran-typescript-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-julik-frontend-races-reviewer.agent.md`
- 修改：`plugins/compound-engineering/agents/ce-swift-ios-reviewer.agent.md`：lines 75/77/79 的 explicit float bands（`0.80+` -> anchor 75/100；`0.60-0.79` -> anchor 50；`below 0.60` -> anchor 0/25）
- 修改：`plugins/compound-engineering/skills/ce-code-review/references/review-output-template.md`
- 修改：`plugins/compound-engineering/skills/ce-code-review/references/walkthrough.md`
- 修改：`plugins/compound-engineering/skills/ce-code-review/references/bulk-preview.md`
- 修改：`plugins/compound-engineering/skills/ce-code-review/references/persona-catalog.md`（确认无 float references 残留；无需 behavior changes）

**方法：**
- 对每个 persona file：grep confidence references（`0.\\d`、"0.6"、"0.7" 等）并改写为 anchors。大多数 personas 依赖 template，不需要 changes；sweep 捕获 outliers。
- 对每个 rendering surface：将 confidence-column rendering 从 float（`0.85`）更新为 integer-anchor（`75` 或 `100`）。更新 walkthrough per-finding block 以显示 anchor。
- 对 `persona-catalog.md`：无需行为变化；selection rules 不变。确认无 float references 残留。
- 对 `review-output-template.md`：如需要，更新 Confidence column header/format。

**测试场景：**
- Edge case：sweep 后，对 `agents/` grep float-confidence references 返回空。
- Happy path：finding 的 Walkthrough rendering 显示 `Confidence: 75`（integer），不是 `Confidence: 0.85`。
- Happy path：Bulk-preview rendering 使用与 walkthrough 一致的 anchor format。
- Happy path：`review-output-template.md` 中 findings table 将 anchor 显示为 integer。

**验证：**
- `plugins/compound-engineering/agents/` 或 `plugins/compound-engineering/skills/ce-code-review/references/` 中不再有 hardcoded float confidence values。
- 所有 rendering surfaces 一致使用 anchor integers。

---

- [ ] **Unit 8：更新 test fixtures 和 contract tests**

**目标：** 更新 `tests/review-skill-contract.test.ts`，assert 新 schema、synthesis behavior、validation stage、skip-conditions 和 mode-aware demotion。更新或新增带 anchor values 的 fixtures。

**需求：** R8

**依赖：** Units 1-6（units 1-6 产出的 behavior 必须已经在 code 中，这样 tests 才能通过）。

**文件：**
- 修改：`tests/review-skill-contract.test.ts`
- 修改：`tests/fixtures/`（任何带 embedded confidence values 的 seeded ce-code-review fixtures；检查 `tests/fixtures/ce-code-review/`，或共享的 `tests/fixtures/sample-plugin/`）

**Execution note：** 镜像 ce-doc-review commit `6caf3303` 对 `tests/pipeline-review-contract.test.ts` 添加的 tests（73 lines added）。已有模式，复制结构。

**方法：**
- 增加 schema-shape assertions：`confidence` 是 integer enum，`_meta.confidence_thresholds` 描述新 gates。
- 增加 synthesis assertions：`>= 75` gate、P0 exception at 50、one-anchor promotion、anchor-descending sort。
- 增加 validation-stage assertions：mode-conditional dispatch、validator approval 后 finding survives、validator rejection 或 timeout 后 finding drops、budget cap drops overflow with Coverage note。
- 增加 skip-condition assertions：closed/draft/trivial/already-reviewed cases early stop；standalone 和 `base:` modes 不运行 skip-check。
- 增加 mode-aware demotion assertions：interactive 中 `testing` P3 advisory 进入 `testing_gaps`；同 finding 在 headless 中 suppress。
- 将 fixtures 中 embedded confidence values 从 float 转为 anchor integers。按 behavior 转换：`0.85` -> `75`（如果是 "real, will hit in practice"）；`0.92+` -> `100`（如果 "verifiable from code"）。

**测试场景：**
- （Implicit：本 unit 本身就是 prior units 的 test scenarios。）

**验证：**
- `bun test` 通过所有新 assertions。
- `bun run release:validate` 通过。
- 对 known-bad fixture 的 targeted test run（旧 gate 会 surface，新 gate 应 suppress 的 finding）展示 behavior change。

---

- [ ] **Unit 9：在 `docs/solutions/` 中记录 migration**

**目标：** 扩展现有 ce-doc-review writeup，加入 ce-code-review section。记录 threshold-divergence rationale（为什么 code review 用 `>= 75`，而 doc review 用 `>= 50`）、validation-stage rationale，以及 mode-aware policy framing。

**需求：** R9

**依赖：** Units 1-8（记录实际 build 出来的内容）。

**文件：**
- 修改：`docs/solutions/skill-design/confidence-anchored-scoring.md`（增加 ce-code-review section）
- 如果 file 变得太长，可选 split：create `docs/solutions/skill-design/code-review-precision-and-validation-2026-04-2X.md`（使用当天日期）

**方法：**
- 在 existing ce-doc-review content 后增加 "ce-code-review migration" section。
- 记录：
  - Threshold choice（threshold 选择，`>= 75`）以及它为何不同于 ce-doc-review 的 `>= 50`。两者都选择 anchor 作为 threshold；doc review 更宽 surface，因为 dismiss 成本低；code review 更窄 surface，因为 false positives 会侵蚀 trust。
  - validation stage 和其 scope（externalization only）。引用 Anthropic Step 5 作为 design pattern；解释为什么 upstream 的 binary validated/not-validated gate 比 numeric score 更重要。
  - Mode-aware false-positive policy 和 interactive mode 的 "demote-not-suppress" rule。
  - lint-ignore suppression rule（lint-ignore 抑制规则）。
  - 链接 ce-code-review SKILL.md 和 findings-schema.json。
- 增加 "When to apply this pattern to a new skill" section，让 future skill authors 知道何时需要 anchored rubric + validation gate，何时 continuous confidence 足够。

**测试场景：**
- Test expectation：无，文档更新。

**验证：**
- 对没看过任一 codebase 的新 contributor 来说，该 doc 读起来 coherent，并能理解 ce-doc-review 和 ce-code-review 的 confidence handling。
- "when to apply" guidance 足够具体，可执行。

## 系统级影响

- **Interaction graph:** Stage 5b（new）位于 Stage 5（merge）和 Stage 6（synthesis）之间。Stage 1 PR-mode path 增加 pre-stage skip-check，可能 early exit。两个 interaction-graph changes 都局限于 ce-code-review；不影响 callers（`ce-work`、`lfg`、`slfg`、`ce-polish-beta`）。
- **Error propagation:** Validator subagent failures（timeout、malformed output、dispatch error）会 drop finding，而不是 abort review。failed validator 不 block review；它只意味着一个 finding 不 externalize。保守偏置正确。
- **State lifecycle risks:** 无。该 plan 是 in-memory orchestration changes；没有 persistent state migrations。磁盘上的 run-artifact JSON files shape 不变，不新增 fields。Validator drop count 报告在 Coverage 中，但不进入 artifact schema。
- **API surface parity:** Headless output envelope shape 不变。validator 的效果是当 validation 运行时 envelope 中 findings 更少（rejected ones drop out）。没有新 markers；downstream consumers 无 schema change。
- **Integration coverage:** Cross-skill：`ce-polish-beta` 读取 ce-code-review run artifacts；artifact format 不变，所以无需 compat work。`ce-work` 以 headless mode invoke ce-code-review；验证 new validation stage 不破坏 headless contract（不应破坏，因为 contract 是 envelope shape，未改变）。
- **Unchanged invariants:** Severity taxonomy（P0-P3）、`autofix_class` enum（`safe_auto`/`gated_auto`/`manual`/`advisory`）、`owner` enum（`review-fixer`/`downstream-resolver`/`human`/`release`）、persona selection logic、scope-resolution paths、run-artifact directory layout and shape、mode definitions（interactive/autofix/report-only/headless）、Stage 6 section ordering。`pre_existing` field semantics 不变。

## 风险与依赖

| 风险 | 缓解措施 |
|------|------------|
| Validation stage 为 externalizing modes 增加显著 latency | Validation 按 findings 并行运行（每个 finding 一个 subagent）。大多数 reviews surface < 10 findings；parallel mid-tier dispatch 有界。Headless/autofix users 已接受 multi-agent latency cost；validation 增加几秒是成比例的。 |
| Validator subagent 本身产生 false negatives（reject real findings） | Validator failure mode 是 "drop the finding"，与现有 confidence-gate suppression 类似。对 externalizing modes 来说保守偏置正确（漏掉真实 finding 比公开发布 false one 更好）。interactive walk-through mode 跳过 validation，因此 per-finding human judgment 仍能 surface borderline findings。 |
| Unit 6 的 mode-aware demotion 过窄（只覆盖 `testing` 和 `maintainability`），导致其他 personas 的 weak findings 污染 primary results | 保守定义是刻意的。真实 review runs 会揭示哪些其他 personas 过度生产 weak findings；基于证据逐步扩展定义，而不是猜测。 |
| Skip-condition 的 "trivial PR pattern" 误分类一个 chore-style title 但非 trivial 的 PR | pattern 保守（`^(chore\\(deps\\)|build\\(deps\\)|chore: bump|chore: release)` 要求 colon-prefixed convention）。手写的 informal commits 不会 match。如果真实 PR 被误分类，user 可从 branch 重新 invoke（无 PR target）或使用 `base:` bypass skip-check。在 skip message 中记录这一点。 |
| Threshold 从 0.60 改为 75，本质上更严格；部分当前会 surfaced 的 findings 将消失 | 这是期望行为，stricter gates 正是目的。Safety net：P0 exception at anchor 50 确保 critical-but-uncertain issues 仍 surfaced。上线后一周观察真实 review runs，必要时调整 gate 或扩展 P0 exception。 |
| Validator dispatch budget cap（15）drop 超限 findings | Drop 是 loud，不是 silent：Coverage section 报告 over-budget count，让 user 知道是否需要 follow up。Cap 是 worst-case safety bound；typical reviews 不会触发。如果真实数据表明 reviews 经常超过 15，则提高 cap 或重新评估 second-wave logic。 |
| 与其他 in-flight ce-code-review work 的 sequencing | Branch 是 `tmchow/review-skill-compare`。未发现其他 in-flight ce-code-review PRs。落地 artifact-format change 前，与任何在 `ce-polish-beta`（downstream consumer）上工作的人协调。 |

## 文档与运维说明

- 如果 `plugins/compound-engineering/README.md` 的 ce-code-review entry 提到 confidence scoring specifics，则更新它（大概率不提；大多数 plugin READMEs 不覆盖 internal scoring mechanics）。
- `docs/solutions/skill-design/` writeup（Unit 9）是 primary documentation deliverable。
- Unit 8 后运行 `bun run release:validate`，确认 marketplace parity 和 counts。
- 不手动 bump plugin manifests version，release-please 负责。按 repo convention，该工作使用 `refactor(ce-code-review):` commit。
- 合并后观察接下来几次真实 ce-code-review runs（interactive 和 headless mode），确认：(a) anchor distribution 合理，(b) validation stage 没 drop 太多真实 findings，(c) skip-conditions 不误分类 legitimate PRs，(d) mode-aware demotion 产出有用的 `testing_gaps`/`residual_risks` content。

## 来源与参考

- **Origin conversation:** 对 ce-code-review 与 Anthropic 官方 `code-review` plugin 的 two-model comparative analysis（this conversation, 2026-04-21）。没有正式 `docs/brainstorms/` document；conversation 本身是 requirements input。
- **Prior plan（sister skill, established pattern）：** `docs/plans/2026-04-21-001-refactor-ce-doc-review-anchored-confidence-scoring-plan.md`：explicit "Deferred to Separate Tasks" entry 点名本工作。
- **Institutional learning（机构经验）:** `docs/solutions/skill-design/confidence-anchored-scoring.md`：anchored-rubric pattern 的 canonical writeup。
- **Reference commit:** `6caf3303 refactor(ce-doc-review): anchor-based confidence scoring (#622)`：sister skill 的 migration diff。
- **External canonical reference:** `https://github.com/anthropics/claude-code/blob/main/plugins/code-review/commands/code-review.md`：Anthropic 的 command prompt 是 skip-conditions、validation-stage design 和 lint-ignore semantics 的 authoritative source。`https://github.com/anthropics/claude-code/blob/main/plugins/code-review/README.md` 中的 README 只是 product description；command prompt 才是真实 behavior。
- **Files modified by this plan:** `plugins/compound-engineering/skills/ce-code-review/SKILL.md`、`plugins/compound-engineering/skills/ce-code-review/references/findings-schema.json`、`plugins/compound-engineering/skills/ce-code-review/references/subagent-template.md`、`plugins/compound-engineering/skills/ce-code-review/references/persona-catalog.md`、`plugins/compound-engineering/skills/ce-code-review/references/review-output-template.md`、`plugins/compound-engineering/skills/ce-code-review/references/walkthrough.md`、`plugins/compound-engineering/skills/ce-code-review/references/bulk-preview.md`、`plugins/compound-engineering/skills/ce-code-review/references/validator-template.md`（new）、all `plugins/compound-engineering/agents/ce-*-reviewer.agent.md` files（包括 recent-added `ce-swift-ios-reviewer.agent.md`）、`tests/review-skill-contract.test.ts`、`tests/fixtures/`（as needed）、`docs/solutions/skill-design/confidence-anchored-scoring.md`。
