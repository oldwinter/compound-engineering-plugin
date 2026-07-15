# Document Review Output Template（Document Review 输出模板）

在 Interactive mode 中展示 synthesized review findings 时，使用此**精确格式**。Findings 按 severity 分组，而不是按 reviewer 分组。

**IMPORTANT（重要）：** 使用 pipe-delimited markdown tables（`| col | col |`）。不要使用 ASCII box-drawing characters。

**IMPORTANT（重要）：** Escape table cells 中的 literal pipe characters。任何出现在 finding section reference、issue description、code snippet、regex pattern 或 delimited-string example 内的 `|` 都必须写成 `\|`，让 column boundaries 只由 unescaped pipes 决定。Unescaped pipes 会把 cell 拆到多个 columns，并破坏该 row 的 `Reviewer`、`Confidence` 和 `Tier` values。

此 template 描述 Phase 4 interactive presentation：用户在 routing question（`references/walkthrough.md`）触发前看到的内容。Headless-mode envelope 记录在 `references/synthesis-and-presentation.md`（Phase 4 "Route Remaining Findings" section）中，与此 template 分开。

**Vocabulary note（词汇说明）。** Internal enum values（`safe_auto`、`gated_auto`、`manual`、`FYI`）存在于 schema 和 synthesis pipeline 中。User-facing rendered text 改用 plain-language labels：fixes（对应 `safe_auto`）、proposed fixes（对应 `gated_auto`）、decisions（对应 `manual`）和 FYI observations（对应 `FYI`）。下方 tables 中的 `Tier` column 是唯一仍命名 internal enum 的地方，让用户能看到 synthesis decision；其他内容都用 plain language。

**Confidence column（Confidence 列）。** `Confidence` column 显示 integer anchor value（`50`、`75` 或 `100`），绝不是 decimal 或 percentage。Anchor `50` = advisory（路由到 FYI）；anchor `75` = verified，实践中会命中；anchor `100` = certain，evidence 直接确认。Anchors `0` 和 `25` 在本层前已由 synthesis drop，永不出现在 rendered output 中。Cross-persona agreement 会提升一个 anchor step；发生时，Reviewer column 会注明（例如 `coherence, feasibility (+1 anchor)`）。

## Example（示例）

```markdown
## Document Review Results

**Document:** docs/plans/2026-03-15-feat-user-auth-plan.md
**Type:** plan
**Reviewers:** coherence, feasibility, security-lens, scope-guardian
- security-lens -- plan adds public API endpoint with auth flow
- scope-guardian -- plan has 15 requirements across 3 priority levels

Applied 5 fixes. 4 items need attention (2 errors, 2 omissions). 2 FYI observations.

### Applied fixes

- Standardized "pipeline"/"workflow" terminology to "pipeline" throughout (coherence)
- Fixed cross-reference: Section 4 referenced "Section 3.2" which is actually "Section 3.1" (coherence)
- Updated unit count from "6 units" to "7 units" to match listed units (coherence)
- Added "update API rate-limit config" step to Unit 4 -- implied by Unit 3's rate-limit introduction (feasibility)
- Added auth token refresh to test scenarios -- required by Unit 2's token expiry handling (security-lens)

### P0 — Must Fix

#### Errors

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 1 | Requirements Trace | Goal states "offline support" but technical approach assumes persistent connectivity | coherence | 100 | manual |

### P1 — Should Fix

#### Errors

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 2 | Scope Boundaries | 8 of 12 units build admin infrastructure; only 2 touch stated goal | scope-guardian | 75 | manual |

#### Omissions

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 3 | Implementation Unit 3 | Plan proposes custom auth but does not mention existing Devise setup or migration path | feasibility | 100 | gated_auto |

### P2 — Consider Fixing

#### Omissions

| # | Section | Issue | Reviewer | Confidence | Tier |
|---|---------|-------|----------|------------|------|
| 4 | API Design | Public webhook endpoint has no rate limiting mentioned | security-lens | 75 | gated_auto |

### FYI Observations

Low-confidence observations surfaced without requiring a decision. Content advisory only.

| # | Section | Observation | Reviewer | Confidence |
|---|---------|-------------|----------|------------|
| 1 | Naming | Filename `plan.md` is asymmetric with command name `user-auth`; could go either way | coherence | 50 |
| 2 | Risk Analysis | Rollout-cadence decision may benefit from monitoring thresholds, though not blocking | scope-guardian | 50 |

### Residual Concerns

Residual concerns are issues the reviewers noticed but could not confirm at confidence anchor `50` or higher. These are not actionable; they appear here for transparency only and are not promoted into the review surface.

| # | Concern | Source |
|---|---------|--------|
| 1 | Migration rollback strategy not addressed for Phase 2 data changes | feasibility |

### Deferred Questions

| # | Question | Source |
|---|---------|--------|
| 1 | Should the API use versioned endpoints from launch? | feasibility, security-lens |

### Coverage

| Persona | Status | Findings | Auto | Proposed | Decisions | FYI | Residual |
|---------|--------|----------|------|----------|-----------|-----|----------|
| coherence | completed | 5 | 3 | 0 | 1 | 1 | 0 |
| feasibility | completed | 3 | 1 | 1 | 0 | 0 | 1 |
| security-lens | completed | 2 | 1 | 1 | 0 | 0 | 0 |
| scope-guardian | completed | 2 | 0 | 0 | 1 | 1 | 0 |
| product-lens | not activated | -- | -- | -- | -- | -- | -- |
| design-lens | not activated | -- | -- | -- | -- | -- | -- |

Dropped: 3 (anchors 0/25 suppressed)
Chains: 1 root with 2 dependents
Restated: 2 (residual/deferred items suppressed as duplicates of actionable findings)
```

## Section Rules（Section 规则）

- **Summary line**：始终出现在 reviewer list 后。格式："Applied N fixes. K items need attention (X errors, Y omissions). Z FYI observations." 除 FYI clause 为零时保留外，省略任何 zero clause（没有 FYI surfaced 也是有信息量的）。
- **Applied fixes**：列出所有自动应用的 fixes（`safe_auto` tier）。每个 fix 包含足够 detail 以传达 substance，尤其是添加 content 或影响 document meaning 的 fixes。没有时省略 section。
- **Self-contained references**：当 fix line 或 table cell 引用 reviewed document 定义的 identifier（例如 requirement/unit ID `R6`、`U3`）时，该 finding 中首次出现必须配上从 document 提取的简短 plain-language handle（例如 `R6 (suppress peer panels on low-stakes calls)`）；绝不能只用 bare identifier 描述它。该规则重申 `references/synthesis-and-presentation.md` Phase 4 的 “Self-contained rendered lines”，防止 interactive output 与 headless envelope drift。
- **P0-P3 sections**：只包含有 actionable findings（`gated_auto` 或 `manual`）的 sections。省略 empty severity levels。每个 severity 内拆成 **Errors** 和 **Omissions** sub-headers。该 severity 没有某 type 时，省略对应 sub-header。`Tier` column 暴露 finding 是 `gated_auto`（存在 concrete fix，walk-through 中推荐 Apply）还是 `manual`（需要 user judgment）。
- **FYI Observations**：Confidence anchor `50` 的 findings，无论 `autofix_class` 如何。为 transparency 在此展示；这些不是 actionable，也不进入 walk-through。没有时省略 section。
- **Residual Concerns**：Personas 记录但未超过 confidence gate 的 residual concerns。为 transparency 列出；不会 promoted into review surface（按 synthesis step 3.4，cross-persona agreement boost 只在已 survived gate 的 findings 上运行）。没有时省略 section。
- **Deferred Questions**：供后续 workflow stages 使用的问题。没有时省略。
- **Compact rendering for FYI / Residual / Deferred（high-count mode）**：当这三个 sections 的 combined count **大于等于 5** 时，将每个 section collapse 为 one-line summary，后接 tight bullet list（无 table，无 per-item `Why` elaboration）。Rationale：这些 sections 是 observational，不是 decision-forcing；当它们很长时，会埋掉上方 actionable tiers。P0/P1/P2 actionable finding 无论 FYI/Residual/Deferred items 有多少，都保持 fully rendered。Combined count 为 4 或更少时，按当前方式 render 每个 section。
- **Coverage**：始终包含。所有 counts 都是 **post-synthesis**。**Findings** 必须精确等于 Auto + Proposed + Decisions + FYI；如果 deduplication 跨 personas merge 了 finding，将其归因给 confidence anchor 最高的 persona，并减少其他 persona count。**Residual** = 此 persona raw output 中 `residual_risks` 的 count（不是 Residual Concerns section 中 promoted subset）。`Auto` column 计数 anchor `100` 的 `safe_auto` findings，`Proposed` 计数 anchor `75` 或 `100` 的 `gated_auto` findings，`Decisions` 计数 anchor `75` 或 `100` 的 `manual` findings，`FYI` 计数 anchor `50` 的 findings，无论 `autofix_class` 如何。Anchors `0` 或 `25` 的 findings 已被 synthesis drop，不出现在任何 column。不要 invent additional columns（例如 `Dropped`、`Surviving`）。上方 column schema 是 canonical set。
- **Coverage footnote lines**（optional，non-zero 时出现在 table 下方）：当 synthesis 3.2 drop 了任何 findings，写 `Dropped: N (anchors 0/25 suppressed)`。当存在 premise-dependency chains，写 `Chains: N root(s) with M dependents`。当 synthesis 3.9 suppress 了任何 restatements，写 `Restated: N (residual/deferred items suppressed as duplicates of actionable findings)`。这些 footnotes，而不是 summary line 或 per-persona columns，是不适合 per-persona shape 的 cross-cutting counts 的 canonical location。顺序：`Dropped:`，然后 `Chains:`，然后 `Restated:`，每个单独一行。省略 count 为零的 footnote。

## Chain-Rendering Rules（Chain 渲染规则）

来自 synthesis step 3.5c 的 premise-dependency chains 会 annotate roots 和 dependents。Rendering 遵循 synthesis reference 中记录的相同 count invariant；此 template 重申规则，避免 interactive output 与 headless envelope drift。

- **Dependents 只在其 root 下 render。** 当 finding 有 `dependents` 时，在 root 的正常 severity position（其 P-tier Errors 或 Omissions table 中）render root。紧接 root table row 下方，emit 一个 indented `Dependents (N)` sub-block，列出每个 dependent 的 `# | Section | Issue | Reviewer | Confidence | Tier` entry。Dependents **不得**出现在自己的 severity position。没有 `depends_on` 且没有 `dependents` 的 findings 按当前方式 render。
- **Count invariant。** Coverage 中的 `Findings` column 继续等于 Auto + Proposed + Decisions + FYI。每个 finding 只计数一次：dependent 计入其 assigned bucket（`Auto` / `Proposed` / `Decisions` / `FYI`），但**不**在自己的 severity position render。Source of truth 是每个 root 上 post-Step-4 的 `dependents` array，也就是 headless envelope 读取的同一 array，因此 coverage count 和 rendering 不会 drift。
- **Chains line（optional）。** 当存在一个或多个 chains 时，在 coverage block 末尾添加一行：`Chains: N root(s) with M dependents`，其中 N 是 roots 数量，M 是所有 roots 的 dependent count 总和。没有 chains 时省略。它 mirror `references/synthesis-and-presentation.md` 中 headless envelope emit 的 `Chains:` line，让 reviewers 在两种 modes 中获得相同 chain visibility。
