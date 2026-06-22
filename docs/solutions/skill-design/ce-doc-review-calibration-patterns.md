---
title: "ce-doc-review calibration patterns：tier classification、chain grouping 和 FYI routing"
date: 2026-04-19
category: skill-design
module: compound-engineering / ce-doc-review
problem_type: design_pattern
component: tooling
severity: medium
tags:
  - ce-doc-review
  - autofix-classification
  - synthesis-pipeline
  - persona-calibration
  - premise-dependency
  - fyi-routing
  - calibration
applies_when:
  - 修改 doc-review persona agents 中的 persona confidence calibration（`skills/*/references/agents/` 下扁平的 `ce-*-reviewer.md` files）
  - 修改 `skills/ce-doc-review/references/synthesis-and-presentation.md` 中的 synthesis pipeline
  - 调整 `references/subagent-template.md` 中 subagent template 的 output contract
  - 新增或修改 `tests/fixtures/ce-doc-review/` 下的 seeded test fixtures
  - 调试为什么 finding 落入不同于预期的 tier
---

# ce-doc-review calibration patterns（ce-doc-review 校准模式）

ce-doc-review 的 calibration work（PR #601 系列，2026-04-18 和 -19）暴露出 synthesis pipeline 分类 findings 时的几个非显而易见 patterns。这些 patterns 是 durable 的：任何时候重新调优 personas 或 synthesis guidance，它们都会再次出现。未来修改 calibration 的 contributors 应预期这些现象，不要把它们当作 bugs 来“修复”。

## Tier classification 是 context-sensitive，不是纯形式规则

tier spec 的直观读法是 `safe_auto` = “一个清楚正确的 fix，可静默应用”。实践中，同形态 finding 会根据 scope 和 verifiability 合法地落到不同 tiers。两个反复出现的 patterns：

### External stale cross-reference → gated_auto（不是 safe_auto）

当文档写着 `see Unit 7`，而同一文档中不存在 Unit 7，这就是 **internal** stale cross-reference，coherence 可以仅凭 document text 验证并应用 `safe_auto`。当文档写着 `see docs/guides/keyboard-nav.md Section 4`，而该文件无法从 document content 中验证时，这就是 **external** cross-reference；静默应用“删除这个引用”有掩盖合法 external doc 的风险。reviewer 应将这些 route 到 `gated_auto`，并提供 "verify before applying" fix，而不是 `safe_auto`。

观察于：feature-plan fixture runs。external cross-ref 以 `gated_auto` 落到 P2，fix 为 "Verify docs/guides/keyboard-nav.md exists... If stale, either remove the reference or replace with inline guidance."

### Multi-surface terminology drift → gated_auto（不是 safe_auto）

当两个 synonyms 只出现在 prose 中（`data store` / `database`），`safe_auto` 可正确归一化。当 drift 跨越 surfaces，包括 UI copy、aria-labels、toast messages、analytics events、file names、code identifiers，fix 的 scope 超出 prose normalization，需要 user confirmation。Security-adjacent terminology（`token` / `credential` / `secret` / `API key`）承载不同语义重量，也应 route 到 `gated_auto`，并建议 glossary-fix。

观察于：auth-plan fixture runs（security-lens escalated）、feature-plan fixture runs（UI-surface escalated）。

**不要收紧 coherence 的 `safe_auto` guidance 来强迫这些进入 `safe_auto`。** 这种 reclassification 是 reviewer judgment 在做有用工作。

## Premise-dependency chains 有 scope hierarchy

Synthesis step 3.5c 会把 fix 从单一 premise challenge 级联而来的 manual findings 分组。当出现多个 premise-level candidates 时，它们可能是 **peer roots**（不同 scopes 上的独立 premises）或 **nested**（一个 premise 的 resolution 会 moot 另一个）。决策规则：

### Peer vs nested：mechanical test（机械测试），而不是 example-based（基于示例）

> "Two candidate roots are peers when accepting root A's proposed fix would not resolve root B's concern (and vice versa). They are nested when one root's fix would moot the other — in which case the subsumed candidate becomes a dependent of the surviving root."

中文含义：如果接受 root A 的 proposed fix 不能解决 root B 的 concern（反之亦然），两个 candidate roots 就是 peers；如果一个 root 的 fix 会让另一个 root 失去意义，它们就是 nested，此时被包含的 candidate 成为 surviving root 的 dependent。

对称应用：决策前检查两个方向。Example-based teaching（例如 "drop the alias"）会过拟合特定词汇；mechanical decision test 可跨 domains 泛化。

### Nested 场景下的 surviving root：scope 支配 confidence

nested 时，surviving root 是其 fix 会 moot 另一个的 root，而**不是** higher-confidence candidate。在 rename plan 中，scope 更广的 "rename premise unsupported" root 支配 confidence 更高的 "alias machinery unjustified" candidate，因为拒绝 rename 会让 alias 完全失去意义，而拒绝 alias 仍保留 rename。早期 synthesis 选择 higher-confidence candidate 作为 root，导致 broader-scope premise 的 natural dependents 被滞留为 independent findings。

Confidence 用于 *among peers* 的 tie-breaking，而不是决定两个 nested candidates 中谁支配谁。

### Multi-root 需要显式 elevation

当多个 candidates 匹配时，synthesis 默认会选择单个 root。类似 "typically 0–2 roots surface per review" 的短语会 anchor synthesizer 只 elevate 一个。需要明确 guidance：elevate 所有匹配 candidates（只受 peer-vs-nested test 约束）。criteria 本身就是过滤器，不要对 roots 设置数字上限。

## FYI routing 需要 band + template-level anchoring

没有可表达 consequence 的 advisory observations 需要落点，否则它们要么被提升到 gate 之上（看起来像真实 decisions），要么被完全抑制。FYI bucket 给它们一个归宿，但除非两个变更一起做，否则它会保持为空：

1. **Per-persona advisory band**，按每个 persona 的 scope 定制。7 个 personas 各自需要自己的 band；单一 template-level rule 不会覆盖 persona-specific calibrations。
2. **Template-level advisory rule**，位于 `subagent-template.md` 的 output-contract 中，使用 "what actually breaks if we don't fix this?" heuristic。当 persona 自身 rubric 没有让 band 适用性变得显然时，它会 anchor scoring decision。

单独任一项都不足。只有 persona bands 而没有 template rule，会在 personas 之间产生不一致结果；只有 template rule 而没有 per-persona bands，则没有校准依据。

> **Scoring model note:** 该 pattern 早于 anchored-rubric migration。原始 calibration 使用 continuous float bands；现在 scoring 是 anchored rubric（离散 `0/25/50/75/100`，其中 FYI = anchor `50`）。canonical scoring model 见 [confidence-anchored-scoring.md](./confidence-anchored-scoring.md)。上面的 band-plus-template structural insight 独立于 numeric scale。

## Schema compliance 需要 inline enum callouts，而不只是 `{schema}` injection

subagent template 会将完整 JSON schema 注入每个 persona 的 prompt。尽管如此，schema conformance 仍在更长 personas 上损坏（adversarial 89 行、scope-guardian 54 行）：severity 输出为 `"high"/"medium"/"low"` 而不是 `P0/P1/P2/P3`，evidence 输出为 strings 而不是 arrays。

有效的 fix：在 output contract prose 顶部添加 **"Schema conformance — hard constraints"** block，列出精确 enum values，并禁止常见 deviations。单靠 schema injection 会被密集 persona rubrics 在注意力中下推；inline enum callouts 会将其 anchor 在 output contract 顶部，并能撑过更长 prompts。

severity translation rule（"if your persona's prose discusses 'critical/important/low-signal', map to P0/P1/P2/P3 at emit time"）防止 persona rubrics 中的非正式 priority language 泄漏到 JSON output。

## Coverage/rendering count invariants 需要单一事实源

早期 chain runs 报告的 coverage count（`1 root with 6 dependents`）与 rendered output（显示 5 个 dependents）不匹配。spec 没有说明哪个 step 的 count 是 authoritative（Step 2 的 candidate count、Step 3 的 post-safeguard，还是 Step 4 的 post-cap），所以 orchestrator 对 coverage 和 rendering 使用了不同 values。

**需要保持的 invariant：** final annotation step（所有 filtering 之后）填充的 `dependents` array 是 coverage 和 rendering 的单一事实源。出现在某个 root 的 `dependents` array 中的 finding，必须在 presentation 中嵌套显示在该 root 下，且不得出现在自身 severity position。Coverage count 等于 `dependents` array 的长度。

任何未来添加 filtering 或 reorganization steps 的 pipeline change，都必须重新说明哪个 post-step snapshot 是 authoritative。

## Reviewer variance 是内在的；single runs 不是 baselines

在 rename fixture 的 7+ 次 runs 中，同一文档产生的 user-engagement counts 分别为：`safe_auto` applied 的 0、1、2、3，以及 total user decisions 的 14、19、6、12、8、6。Calibration work 降低但没有消除 variance。主要 variance sources：

- **Adversarial reviewer activation** — activation signals（requirement count、architectural decisions、high-stakes domain）会在 borderline documents 上产生非确定性 decisions
- **多个 candidates 存在时的 root selection** — 即使有 scope-dominance guidance，synthesizer 的 root choice 也会跨 runs 变化
- **Borderline findings 上的 confidence calibration** — 同一 finding 在一次 run 中落入 FYI，下一次落入 manual，因为 reviewer 的 anchor choice 在边界上跨 runs 翻转

**Testing implication：** 用多次 runs 验证 calibration changes，而不是单个 samples。单次“bad” run 很可能是 noise；跨 3+ runs 出现的 pattern 才是 signal。Seeded fixtures 将 expected tier distributions 作为 targets 记录，而不是 pass/fail assertions。

## 相关文档

- `skills/ce-doc-review/references/synthesis-and-presentation.md` — canonical synthesis pipeline spec，包含 3.5c premise-dependency chain linking
- `skills/ce-doc-review/references/subagent-template.md` — output contract，包含 schema conformance block 和 advisory routing rule
- `skills/*/references/agents/` — 7 个 doc-review persona agents（扁平 `ce-*-reviewer.md` files：`ce-coherence-reviewer.md`、`ce-feasibility-reviewer.md`、`ce-design-lens-reviewer.md`、`ce-security-lens-reviewer.md`、`ce-scope-guardian-reviewer.md`、`ce-product-lens-reviewer.md`、`ce-adversarial-document-reviewer.md`），以及各自的 confidence calibration bands
- `tests/fixtures/ce-doc-review/` — 用于 manual calibration testing 的三个 seeded fixtures（rename、auth、feature）；每个 fixture 的具体 seed map 见其 header comment
- `docs/solutions/developer-experience/branch-based-plugin-install-and-testing.md` — 如何从 branch checkout 运行 skill 进行 testing
