---
title: "在 substantial feature 上完整运行 CE pipeline 的端到端经验"
date: 2026-04-17
category: best-practices
module: compound-engineering
problem_type: best_practice
component: development_workflow
severity: medium
applies_when:
  - 在任何 non-trivial feature（超过约 1 个 implementation unit）上运行 ce:brainstorm → ce:plan → ce:work → ce:review
  - 在单个 session 中端到端编排完整 compound-engineering pipeline
  - 决定何时在 pipeline stages 之间插入 document-review passes
  - 任何引入新 user-facing flow 的 feature，尤其是 bulk actions 或 single-keystroke commitments
  - 任何 research agent 返回 confident architectural recommendation，且会新增 stage、schema field 或 module
tags: [compound-engineering, ce-pipeline, ce-brainstorm, ce-plan, ce-work, ce-review, document-review, workflow, hitl, pipeline-discipline]
---

# 在 substantial feature 上完整运行 CE pipeline 得到的端到端经验

## 背景

compound-engineering pipeline 被设计为一串成本逐渐升高的 stages：`ce:brainstorm` → `document-review` → `ce:plan` → `document-review` → `ce:work` → `ce:review` → `resolve-pr-feedback`。每个 stage 操作不同 artifact（requirements doc、plan doc、diff、PR），并施加不同 lens（exploration、critique、execution、synthesis、defense）。

在 substantial feature 上，很容易想把这条 sequence 折叠掉：从 rough idea 直接跳到 implementation，或因为 plan "looks right" 而跳过 document-review。最近一次 session 在一个 non-trivial feature 上端到端运行了完整 pipeline：redesign `ce:review` 的 Interactive mode，加入 per-finding walk-through、compact bulk-action preview、four-option routing model，以及 defer-to-tracker integration。

那次 run 的 cross-cutting insight 是：**pipeline 本身会 compound**。brainstorm 阶段本来便宜的问题，到 PR review 时会变贵；document-review 在 plan 阶段抓住的问题，如果滑过去，会污染 implementation。每个 stage 抓不同类型的问题，且每个更便宜的 stage 会在问题进入 downstream 变贵之前消除它。完整运行 pipeline 的价值不是 process-for-its-own-sake，而是这些 stages 并不 redundant。它们发现不同东西。

本文档 codify 反复出现的 concrete patterns，使未来 runs，无论由 humans 还是 agents 执行，都能继承这些 lessons，而不是重新发现。

---

## 指导

### 1. 接受 research-agent claims 前，sample actual evidence

Research agents 和 sub-agents 会返回 confident conclusions。只要 architectural decision 依赖这些 conclusions，就把它们当作 hypotheses，而不是 facts。任何以 "our analysis shows..." framing 的 recommendation，如果下游错误成本是 new stage、new schema 或 new module，正确反应都是 "Did you check?"

具体做法：

- 当 research agent 推荐 structural intervention（new stage、new field、new module）时，命名该 claim derived from 的 specific artifacts。
- 沿 relevant axes sample 10-20 个 real artifacts。
- 比较 sampled evidence 实际显示的内容与 research claim 声称的内容。
- 让 intervention 匹配 evidence，而不是 claim。

Sampled evidence 往往 directionally correct but mechanistically wrong，而 mechanism 决定 fix。

### 2. Brainstorm 后和 plan 后都运行 document-review

Document-review 不是单一 gate。它在 requirements 上（is this the right problem, framed coherently?）和 plans 上（does this design hold together, and does it contradict its own scope?）的工作方式不同。跳过任一 application 都是不同 failure mode：

- 跳过 post-brainstorm doc-review：你会 plan the wrong thing。
- 跳过 post-plan doc-review：你会 implement 带 internal contradictions 的 plan。

多个 doc-review personas 经常抓到 architectural contradictions -- 一个 unit 添加 plan 自己 scope boundary 禁止的 schema field，或一个 feature framing 破坏其 stated goal。这些在 plan time 很便宜，在 implementation 中 expensive，在 PR review 中几乎无法修。

### 3. 将 "trust the agent" UX options 视为 rubber-stamp vectors

任何提供 single-keystroke commit-a-lot action 的 feature，都是 rubber-stamping risk，不管 label 写得多好。如果 redesign 目标是 *reducing* rubber-stamping，那么这类 action 需要 visible plan，用户可在执行前 inspect。

模式：

- Compact preview grouped by action class（按 action class 分组的 compact preview：Applying / Filing / Skipping）。
- execution 前 Proceed / Cancel gate。
- Preview 便宜可 render，且难 misuse。

这是 *reviewing a pre-computed plan* 的正确 surface。它明确不是 *per-item decisions* 的正确 surface -- 带 per-item options 的 numbered list 在 low volume 时看起来高效，一到 high volume 就 collapse working memory。

### 4. 区分 bulk-preview ergonomics 与 per-item walk-through ergonomics

两种 review modalities 有不同 affordances：

| Modality | 适合 | 不适合 |
|---|---|---|
| Bulk preview grouped by action | Reviewing a pre-computed plan | Making per-item decisions |
| Per-item walk-through | Making per-item decisions | Reviewing dozens of items at once |

混合两者 -- 带 per-row options 的 numbered list -- 在 volume 上来前显得 dense 且 efficient。一旦 volume 变大，它会坏掉。决定每个 surface 属于哪种 modality，然后 commit。

### 5. 将 tool/platform caps 当作 structural constraints

Cross-platform tool limits（例如 `AskUserQuestion` 的 4-option cap）不是要绕过的 annoyances。它们强制 design decisions。把 5-option set collapse 成 4 + follow-up question，在 architecture 上不同于 5-option set。早接受 cap 并为它设计；不要在 implementation 中对抗它、之后付出代价。

### 6. 永远不要在一个 flag 中混合两个 semantic meanings

在一个 callsite 中读起来合理的 flag name，可能在另一个 callsite 静默错误。症状是：flag definition（"is X available?"）一致，但其 *use* 回答两个不同问题（"can we invoke X?" vs. "should we offer X as an option?"）。一个 flag 无法同时正确回答两者。

当 flag meaning 依赖 caller 时，split it（见 Example 2）。

该 pattern 在 codebase 中反复出现。之前的 instances 包括 document-review 中 `batch_confirm` collapse（session history）-- 三层 routing 被 collapse 成两层，因为 middle tier 混淆了 "high confidence in the fix" 与 "needs user judgment"。以及 plan deepening 的 signal-word tightening 中，"strengthen" / "confidence gaps" 作为 standalone trigger words 混淆 targeted-edit intent 与 holistic-deepening intent，直到要求 explicit "deepen" 后才消除 false positives。

### 7. Contract tests assert structure，而不是 prose

pin exact wording 的 contract test 会变成未来 copy improvements 的税。每次 wording refinement 都会破坏 test，即使 contract 完整。其 philosophy 是 "regression guard, not authoring ossification."

Assert：file existence、required section headings、required tokens、distinguishing words 的 regex。不要 assert：sentence-level wording、punctuation 或 copy editors 合理会触碰的 phrasing。这与 skill-creator evals 中的 structural-evaluation practice 一致，assertion names 映射到 output JSON 中的 concrete fields（`overlap_detected`、`update_not_create`），而不是 subjective prose judgments。

### 8. 不要在 durable artifacts 中引用 external plugins 或 tools

External references 在 brainstorming *dialogue* 中可能有用 -- "plugin X's review flow does Y, what if we did Z?" -- 但不应出现在 requirements docs、plan docs、PR descriptions 或 commit messages 中。Artifacts 需要自洽。

- Dialogue（对话）："X's design is interesting because..."
- Artifact（产物）：将同一 insight re-frame 为 self-contained terms，不依赖 reader 知道 X。

违反这一点的成本 low-visibility：artifact 今天读起来没问题，但 future reader（或 pattern re-user）会遇到 unexplained proper noun，且没有 resolution path。

### 9. Skill bodies 是 product code，按此标准 author

Skills 是未来 dispatch 的 instruction substrate。被 shipped 的 skill 中的 violations 会传播到每次 future invocation。适用于 agent definitions 的 authoring rules 同样适用于 skill bodies：

- Third-person agent voice（"What should the agent do?"，而不是 "What should I do?"）。
- Front-load distinguishing words，使 truncated labels 仍可区分。
- Rationale discipline：conditional 与 late-sequence blocks 必须说明 *why*，而不只是 *what*，因为 agents 可能从 skill 中段落地，需要 reasoning 才能正确 route。

### 10. 每个 pipeline stage 抓不同类型的问题

不要因为 "previous one looked fine" 就 skip stages。各 stages 的 value distribution：

| Stage | 抓住的问题 | 相对修复成本 |
|---|---|---|
| Brainstorm | Wrong problem, wrong framing | Cheapest |
| Doc-review (requirements) | Incoherent requirements, missing constraints | Cheap |
| Plan | Wrong design | Medium |
| Doc-review (plan) | Self-contradicting plan, scope violations | Medium |
| Work | Execution bugs | Expensive |
| ce-code-review | Scope drift in implementation | Expensive |
| PR review | Subtle semantic conflations (flags, schema, contracts) | Most expensive |

这些 stages 不 redundant。每个都抓其他 stages structurally cannot 的东西。

---

## 为什么重要

- **Cheaper stages eliminate expensive bugs。** `sink_available` conflation（Example 2）在 PR review 中被抓到；如果 shipped，会成为 interactive flow 中的 user-visible bug。若不是在 plan time 通过 sample real artifacts 而不是接受 research claim 抓住，一个 hypothetical new "Stage 5b synthesis-time rewrite pass" 会给 pipeline 增加 persistent stage 与 per-finding model dispatch。
- **Document-review finds contradictions authors miss。** plan draft 包含一个向 merged findings 添加 new field 的 unit -- 这是 schema change，违反 plan 自己的 "no changes to the findings schema" scope boundary。authors 没看到；多个 doc-review personas 看到了。（session history: 同样 pattern 出现在 testing-addressed-gate、universal-planning 和 deepen-plan work 中 -- adversarial 与 scope-guardian reviewers 一贯能抓 scope contradictions。）
- **Rubber-stamping risk 没有 preview gate 时不可见。** Compact preview 实现便宜且难 misuse。缺失它在 interactive flow 已于 production 中 rubber-stamped 前不可见。这正是早期 LFG-autopilot session 的 failure mode：7 个 reviewers 中 6 个对 legitimately fixable issues 打分刚低于 80 threshold，随后被 auto-suppressed。
- **Contract tests that ossify prose become a hidden tax on iteration。** 每个 future wording improvement 都触发 false-positive test break，训练 contributors 要么跳过 wording improvements，要么 mechanical update tests without thinking。两者都不是 intended outcome。
- **Pipelines compound only if run in full。** Running brainstorm-then-work 不是 compound engineering。那只是带额外 syntax 的 ad-hoc engineering。compounding effect 来自 stages catching each other's misses。

---

## 适用时机

- 在任何 non-trivial feature（超过约 1 个 implementation unit）上运行 `ce:brainstorm` → `ce:plan` → `ce:work` → `ce:review`。
- 任何引入 new user-facing flow 的 feature，尤其是包含 bulk actions、routing decisions 或 single-keystroke commitments 的 feature。
- 任何时候 research agent 或 sub-agent 返回 confident architectural recommendation，且该 recommendation 会添加 stage、schema field 或 module。
- 任何 scope boundary 被明确写出的 PR（"no changes to X schema"、"no new stages"）-- implementation 前对 requirements 和 plan 都做 doc-review。
- 任何针对 generated documentation 编写的 contract test 或 snapshot test。
- 任何 flag name 可能 plausibly answer more than one question。
- 任何正在 author 或 revise 的 skill body。

---

## 示例

### 示例 1：Sampling-over-assumption（Stage 5b → shared-template upgrade）

**Before（之前）** -- research agent 断言 "personas will not reliably produce R22-R25 framing." plan 起草了一个 new Stage 5b synthesis-time rewrite pass，通过新的 per-finding model dispatch post-hoc enforce framing。

**Intervention（干预）** -- user pushback："are you sure?" Sampled 15+ real review artifacts across 5 personas。

**Sampled finding（抽样发现）** -- research directionally correct but mechanistically wrong。实际问题是：

- `adversarial` 和 `api-contract` personas 中 Null `why_it_matters` fields。
- `correctness` 和 `maintainability` personas 中 code-structure-first framing（vs. impact-first）。

**After** -- intervention 从 "new per-finding model-dispatch stage" 变为 "one-file shared-template upgrade"（`references/subagent-template.md`）。surface area 更小、implementation 更便宜，并针对真实 failure modes。无 new stage，无 recurring per-review model cost。

这映射一个 prior pattern（session history）：在 `feat/plan-review-personas` work 中，model-tiering assumption（"Codex probably ignores the `sonnet` param"）被 "are you sure other platforms ignore it?" 挑战。检查 converter code 后发现 `model: sonnet` 已传播到所有 targets，将 design 从 Claude-Code-only 翻转为 universal。

### Example 2：拆分 `sink_available`

**Before** -- 一个 flag，在两个地方有两个不同 meanings：

```
# Detection output
{ tracker_name, confidence, sink_available }

# sink_available definition: "the detected tracker can be invoked"

# Callsite A — label logic
if confidence == "high" and sink_available:
    label = f"File a {tracker_name} ticket..."
else:
    label = "File a ticket..."   # generic

# Callsite B — no-sink suppression (subtly wrong)
if not sink_available:
    omit_option_C()
    # Question really being answered: "should we offer Defer at all?"
    # which is NOT the same as "can we invoke the named tracker?"
```

bug：当 named tracker 的 `sink_available = false`，但 GitHub Issues via `gh` 或 harness task primitive *would* work 时，Callsite B 会 silent drop Defer，即使 fallback sink available。

**After** -- 两个 flags，各自一个 meaning：

```
# Detection output
{ tracker_name, confidence, named_sink_available, any_sink_available }

# named_sink_available — the specifically-named tracker is invokable
# any_sink_available  — any tier in the fallback chain works

# Callsite A — label logic uses the narrow flag
if confidence == "high" and named_sink_available:
    label = f"File a {tracker_name} ticket..."
elif any_sink_available:
    label = "File a ticket..."   # generic, fallback works
# else: option omitted

# Callsite B — suppression uses the broad flag
if not any_sink_available:
    omit_option_C()
```

两个 callsites 现在正确回答各自问题。没有 documented tracker 但 `gh` 可用的 repo，会正确提供 generic label 的 Defer，而不是 silent suppress。

### 示例 3：Structural-vs-prose contract test assertion

**Before（之前）：**

```
def test_release_notes_contract():
    doc = (root / "RELEASE_NOTES.md").read_text()
    assert "only when one or more fixes landed" in doc
    assert "applied during the review" in doc
```

任何 sentence rephrase 都会 break test，即使 contract 完整。

**After（之后）：**

```
def test_release_notes_contract():
    doc_path = root / "RELEASE_NOTES.md"
    assert doc_path.exists(), "release notes file must be generated"

    doc = doc_path.read_text()

    # Required sections (structural landmarks)
    assert "## Fixes applied" in doc
    assert "## Findings deferred" in doc

    # Required distinguishing tokens
    assert re.search(r"\bfix(es)?\b.*\bland", doc, re.I), \
        "must describe fixes landing"
    assert re.search(r"\bdefer(red)?\b", doc, re.I), \
        "must describe deferrals"
```

Structural landmarks（file exists、section exists、token present）才是 contract。Sentence-level wording 不是。这与 skill-creator evals 中的 structural-evaluation style 匹配，assertion names 映射到 output JSON 中的 concrete fields（`overlap_detected`、`update_not_create`）。

### Example 4：为 bulk "trust the agent" action 添加 preview gate

**Before** -- 一个 LFG-style routing option 一键执行 full bulk plan。看起来 efficient；实际是 rubber-stamp vector。

**After** -- LFG 展示按 action class grouped 的 compact preview，然后用 explicit Proceed/Cancel gate 阻止执行：

```
Review plan:

Applying (3):
  - src/auth.ts:44  fix stale session on logout
  - src/auth.ts:112 null-check refresh token
  - src/api.ts:87   handle 429 retry-after

Filing (2):
  - src/ui/modal.tsx:23  a11y focus trap (defer)
  - src/db/migrate.ts:9  idempotency audit (defer)

Skipping (1):
  - docs/README.md:4  prose nit

[Proceed]  [Cancel]
```

plan visible。Rubber-stamping 现在是 explicit、informed act，而不是 UI design 的 side effect。

### Example 5：External plugin references 留在 dialogue 中

**Dialogue（acceptable，对话中可接受）：** "Plugin X's review flow groups findings by file, which works well for their navigation-driven use case. What if we grouped by action class instead, since our Interactive mode is decision-driven?"

**Artifact（acceptable，artifact 中可接受）：** "Findings are grouped by action class (Applying / Filing / Skipping) because Interactive mode is decision-driven: the user's question at this surface is 'what is about to happen?', not 'where in the tree am I?'."

**Artifact（not acceptable，artifact 中不可接受）：** "Findings are grouped by action class, similar to plugin X's review flow but adapted for our decision-driven Interactive mode."

artifact version 自洽，不依赖 external reference。future reader 不需要知道 X 才能理解 design。*(auto memory [claude]: this rule was applied throughout the ce:review redesign session — the requirements doc, plan, and PR description all re-framed externally-inspired patterns in self-contained terms.)*

---

## 相关

- [research-agent-pipeline-separation.md](../skill-design/research-agent-pipeline-separation.md) -- 建立 brainstorm / plan / work stage separation。本 learning 向下游延伸到 doc-review、ce:review 和 resolve-pr-feedback，关注每个 stage surface 什么 issues，而不是 dispatch 哪些 research。
- [compound-refresh-skill-improvements.md](../skill-design/compound-refresh-skill-improvements.md) -- 6-item skill review checklist 是 review-time prevention rules 的自然 companion，尤其是 cross-phase consistency 与 blind-user-question avoidance。
- [beta-promotion-orchestration-contract.md](../skill-design/beta-promotion-orchestration-contract.md) -- ce:review surface 的 contract-tests-enforce-orchestration-assumptions pattern；structural assertion philosophy 的直接 prior art。
- [git-workflow-skills-need-explicit-state-machines.md](../skill-design/git-workflow-skills-need-explicit-state-machines.md) -- 方法论一致（"state machine over prose" ≈ "structural assertions over prose"），domain 不同。
- [pass-paths-not-content-to-subagents.md](../skill-design/pass-paths-not-content-to-subagents.md) -- subagent-template changes 的 companion，尤其涉及 instruction phrasing。
- [codex-delegation-best-practices.md](codex-delegation-best-practices.md) -- sampling-evidence-over-assumption at depth 的 canonical example（6 evaluation iterations，empirical token measurement）。
