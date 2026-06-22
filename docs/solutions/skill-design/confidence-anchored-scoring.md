---
title: "ce-doc-review confidence scoring: 用 anchored rubric 替代 continuous floats"
date: 2026-04-21
category: skill-design
module: compound-engineering / ce-doc-review
problem_type: design_pattern
component: tooling
severity: medium
tags:
  - ce-doc-review
  - scoring
  - calibration
  - personas
  - persona-rubric
---

# ce-doc-review confidence scoring: 用 anchored rubric 替代 continuous floats

## 问题

Persona-based document review 最初使用 continuous `confidence` field（0.0 到 1.0），synthesis 会将其与 per-severity numeric gates（0.50 / 0.60 / 0.65 / 0.75）以及 0.40 FYI floor 比较。实践中，continuous scale 诱发 false precision：personas 聚集在 round values（0.60、0.65、0.72、0.80、0.85）上，而 gate boundaries 形成 coin-flip bands，微小 score shifts 就让 findings 进出 actionable tier。personas 并没有真实地区分 0.65 与 0.72；model 无法在这种粒度上校准 self-reported confidence。

review output 中出现的症状：

- 单个 personas 提交 3+ findings，全部 rated 0.68-0.72，且都是同一 root premise 的 variants
- 0.65 的 findings 因噪音而不是信号进入 actionable tier
- Residual concerns 与 deferred questions 近似重复已经 surfaced 的 findings，说明 persona 自身 ordering 没有区分 "raise this" 与 "note this"

## 参考模式：Anthropic 的 anchored rubric

Anthropic official code-review plugin（`anthropics/claude-plugins-official/plugins/code-review/commands/code-review.md`）用 5 个 discrete anchors（`0`、`25`、`50`、`75`、`100`）解决 calibration problem，每个 anchor 都绑定一个 model 可诚实自用的 behavioral criterion：

- `0` -- false positive 或 pre-existing issue
- `25` -- 可能真实但无法 verify；stylistic-not-in-CLAUDE.md
- `50` -- verified real 但 nitpick / not very important
- `75` -- double-checked，会在实践中命中，直接影响 functionality
- `100` -- confirmed，evidence 直接确认，会频繁发生

rubric 会 verbatim 传给独立 scoring agent。Filter threshold：`>= 80`。

## ce-doc-review 采用的方案

移植 structural techniques -- anchored rubric、verbatim persona-facing text、explicit false-positive catalog -- 并根据 document-review economics 调整 filter threshold。doc-review threshold 是 `>= 50`，不是 Anthropic 的 `>= 80`。

### Anchor-to-route 映射

| Anchor | Route |
|--------|-------|
| `0`, `25` | 静默 drop（只在 Coverage 中计数） |
| `50` | FYI subsection（仅 surface，无 forced decision） |
| `75`, `100` | Actionable tier，按 `autofix_class` 分类 |

Cross-persona corroboration 会 promote 一个 anchor step（`50 → 75`、`75 → 100`、`100 → 100`）。这取代了之前的 `+0.10` numeric boost。

Within-severity sort：anchor descending，然后 document order 作为 deterministic final tiebreak。

### 文件

- `skills/ce-doc-review/references/findings-schema.json` -- `confidence` 是 integer enum `[0, 25, 50, 75, 100]`，behavioral definitions embedded 在 `description` field 中
- `skills/ce-doc-review/references/subagent-template.md` -- personas verbatim 看到的 rubric section，以及 consolidated false-positive catalog
- `skills/ce-doc-review/references/synthesis-and-presentation.md` -- 3.2 中的 anchor-based gate、3.4 中的 anchor-step promotion、3.8 中的 anchor-sorted ordering、3.7 中的 anchor+autofix routing
- `plugins/compound-engineering/agents/ce-*-reviewer.md`（7 个 doc-review personas，flat files）-- 每个都带 persona-specific calibration section，把 domain criteria 映射到 shared anchors
- `tests/pipeline-review-contract.test.ts` -- contract tests，断言 schema enforce discrete anchors，template embeds rubric

## 为什么 threshold 与 Anthropic 不同

Code review 和 document review 有不同 economics。Anthropic 的 `>= 80` filter 对 code review 是 load-bearing，因为有三个 constraints 不适用于 doc review：

1. **Code review 有 linter backstop。** CI 运行 linters、typecheckers 和 tests。LLM reviewer 是 automated tooling 之上的第二层，而第二层只有在 *更 selective* 时才有价值。如果 automation 已经捕获 50-75 tier，LLM 再 surface 它就是 noise。
2. **Code review 高频且 publicly visible。** 每个 surfaced finding 都会变成 PR comment。一个 cry wolf 5 次的 reviewer 会被 muted。Precision 优先于 recall。
3. **Code claims 可 ground-truth verify。** "The code does X" 可以通过读代码证明或反驳。code review 中的 75 往往意味着 "I couldn't verify" -- 也就是等待能 verify 的人。

Document review 将三者反转：

1. **Doc review 就是 backstop。** 没有 linter 能抓 plan 的 premise gaps 或 scope drift。plan 中漏掉一个 finding，可能让 implementation 几周后 derail。
2. **Doc review 低频且 private。** 每个 plan 一次，不是每个 PR 一次。Surfaced findings 可通过 routing menu 一键 dismiss；它们不是公开 commentary。
3. **Premise claims 有自然 confidence ceiling。** "Is the motivation valid?" 和 "does this scope match the goal?" 无法针对 ground truth verify。strategy、premise 和 adversarial domains（product-lens、adversarial）中的 personas 合理地 capped at anchors 50-75，因为仅凭 document text 不可能 full verification。`>= 80` filter 会让这些 personas 静音。

Doc review 使用 `>= 50` filter；让 routing menu 处理 volume。dismiss 一个 surfaced finding 很便宜；漏掉真实 concern 很贵。

## 何时移植此 pattern

- 其他具有类似 economics 的 persona-based review skills（无 linter backstop、one-shot consumption、通过 routing dismiss 很便宜）。这类 skills 的默认 threshold：`>= 50`。
- 任何要求 model 在 continuous scale 上 self-report confidence，且观察到 round numbers clustering 的 scoring workflow。

## 何时不要直接移植

- Code review workflows 有 linter backstops 和 public-comment costs。移植 rubric structure，但 threshold 调高（`>= 75`）。已完成移植见下方 "ce-code-review migration" section。
- High-throughput pipelines 中，如果 `25` anchor（"couldn't verify"）代表大多数 findings，drop 所有低于 `50` 的内容可能太 aggressive；可考虑把 `25` surface 为 "needs human triage"。

## Migration 历史

以单个 atomic change 落地，因为 schema、template、synthesis、rendering、personas 与 tests 相互耦合 -- partial migration 会在每个 boundary 都 fail validation。schema change 是 load-bearing commit；persona updates 和 test updates consume 它。

## 评估

Migration 后，A/B evaluation 对 baseline（continuous float）与 treatment（anchored integer rubric）进行了比较，覆盖四份不同 size/type 的 documents：7KB in-repo plan、63KB in-repo plan、27KB external-repo plan，以及 10KB in-repo brainstorm。两个版本都由 orchestrator subagents 执行，这些 subagents 读取各自匹配的 skill snapshot 作为 prompt material，dispatch 全部 7 personas，并输出 Phase 4 headless envelope。workspace、per-run envelopes 和 timing data 在 evaluation 期间位于 `.context/compound-engineering/ce-doc-review-eval/`。

### 已确认效果

- **Score dispersion collapsed（分数离散度收敛）。** Baseline 每个 document 产生 7-12 个 distinct float values（典型：0.45、0.50、0.55、0.65、0.72、0.80、0.85）-- 正是 migration 要消除的 false-precision clustering。Treatment 每个 document 集中到 2-3 个 anchors。任何 persona 都没有 emitted anchors `0` 和 `25`，这符合 template 对这些 tiers "suppress silently" 的 instruction。
- **Cross-persona +1 anchor promotion（跨 persona +1 anchor promotion）按规范触发。** 在 cli-printing-press plan（security-lens + feasibility 将 IP-range-check finding promote 到 anchor 100）和 interactive-judgment plan（product-lens + adversarial 将 premise finding promote 到 anchor 100）上观察到。
- **Chain linking、safe_auto silent-apply、FYI routing 和 per-persona redundancy collapse** 都至少在一次 run 中正确 exercised。
- **`>= 50` threshold 对 large plans 是 load-bearing。** 在 cli-printing-press 上，baseline 的 graduated per-severity gates 接纳 13 个 Decisions；treatment 接纳 21 个。检查 delta 后确认 new findings 是旧 gates 在 boundaries 上 coin-flip behavior 抑制掉的真实 concerns，而不是 noise。migration doc 对 "missing a real concern is expensive" 的预测在实践中成立。

### 发现 Anchor-75 Calibration Boundary（Anchor-75 校准边界）

Evaluation 暴露了一个 boundary issue：在 large plans 上，personas 对 premise-strength concerns（"motivation is thin"、"premise is unconvincing"）emitted anchor 75，但其 "will be hit in practice" claim 是 reviewer 的解读，而不是 concrete downstream outcome。这把 strength-of-argument critique 过度推入 actionable tier，而它更适合作为 observational。

subagent template 的 anchor 75 bullet 增加了 calibration paragraph：

> **Anchor `75` 要求命名某人会遇到的 concrete downstream consequence** — 错误 deploy order、无法实现的 step、contract mismatch，或会 block decision 的 missing evidence。Strength-of-argument concerns（"motivation is thin," "premise is unconvincing," "a different reader might disagree"）本身不达到这个门槛；它们是 advisory observations，应落到 anchor `50`，除非同时命名 reader 会遇到的 specific downstream outcome。

template 添加的 test 是：*"will a competent implementer or reader concretely encounter this, or is this my opinion about the document's strength?"* 前者是 `75`；后者是 `50`。

用收紧后的 criterion 重新 evaluation 后，cli-printing-press 从 21 Decisions/4 FYI 变为 10 Decisions/23 FYI -- premise-strength concerns 移到 observational routing。该 change *不是* blanket suppression of premise findings：在 interactive-judgment plan 上，premise challenge 在收紧后仍保留，并因 cross-persona promotion 升到 anchor 100，因为其 concrete consequence 是 explicit 的（"8-unit redesign creates maintenance debt across three reference files if the premise is wrong"）。该 refinement 区分 grounded premise challenges 与 hand-wavy framing critique -- 这正是 rubric 一开始要获得的 precision。

### 局限

- **Small corpus。** 四份 documents 足以确认 macro patterns（clustering、severity inflation、feature coverage），但不足以微调 threshold values 或 anchor boundaries。
- **Harness drift between iterations。** Iteration-1 orchestrators dispatch parallel persona subagents；iteration-2 orchestrators inline 执行 personas（该 session 中 nested Agent tool 不可用）。这影响 side metrics（cli-printing-press iteration-2 的 proposed-fix count 从 15 降到 4，可能是 harness-driven 而非 tweak-driven），但没有掩盖 tweak 的 core effect，因为 effect magnitude 很大。
- **No absolute-calibration ground truth。** Evaluation 衡量的是 migration 声明的 failure modes 消失。一个 anchor-75 finding 是否真的有 75% 的命中率仍未衡量；不存在 labeled doc-review corpus。

## ce-code-review migration（2026-04-21）

将同样的 anchored-rubric structure 移植到 `ce-code-review`，并与三个 additional code-review-specific precision controls 打包。两个 skills 现在共享 calibration discipline，但在 threshold 和 independent verification 实现上分歧。

### Threshold（阈值）：`>= 75`（不是 ce-doc-review 的 `>= 50`，也不是 Anthropic 的 `>= 80`）

ce-code-review 使用 anchor 75 作为 gate。P0 findings 在 anchor 50 时 escape。

`>= 75` 与 ce-doc-review 一样，使用 anchor 本身作为 threshold（没有尴尬的 middle-bucket gap）。在 `>= 75` 下，anchors 75（"real, will hit in practice"）和 100（"verifiable from code alone"）保留；anchors 0/25/50 drop。Anthropic 在 discrete `{0,25,50,75,100}` scale 下的 `>= 80` 会变成 "只保留 anchor 100"，过于狭窄 -- 会让 personas 可以 construct trace 但无法 literally read bug off code 的 findings 静音。

与 ce-doc-review 的 threshold divergence（`>= 50`）是正确的，理由与上方 "Why the threshold diverges from Anthropic" section 相同，只是反向应用：code review HAS a linter backstop、IS publicly visible、code claims ARE ground-truth verifiable。Code review 需要 narrow precision；doc review 需要 broad surfacing。

### Validation pass（Stage 5b）：已落地的 deferred follow-up

ce-doc-review plan 将 "neutral-scorer second pass" defer 到 follow-up plan。ce-code-review 将其实现为 **Stage 5b**：每个 surviving finding 一个 independent validator sub-agent、mode-conditional dispatch，以及 15-finding budget cap。

- **Why now for code review, not doc review:** code review 有 externalizing modes（autofix applies fixes、headless returns findings to programmatic callers），false positives 有真实成本 -- 错误 fixes 会被 committed，下游 automation 会基于坏 signal 行动。Doc review 最坏情况是用户一键 dismiss 的 noisy report；code review 最坏情况是 wrong-fix PR 被 merge。
- **Mode-conditional dispatch:** validation 在 `headless`、`autofix` 与 interactive LFG/File-tickets routing paths 中运行。在 interactive walk-through 中跳过（human 是 per-finding validator），在 report-only 中跳过（没有 externalized）。这把 cost 限定在 false positives 真有成本的 cases。
- **Per-finding parallel dispatch, not batched:** independence 是设计重点。一个 batched validator 同时看所有 findings，会在它们之间 pattern-match，重建我们试图摆脱的 persona-bias problem。Per-file batching 留作未来 optimization，用于许多 findings clustered in few files 的 reviews。
- **No `validated` field on findings:** early plan 添加过 `validated: boolean` field；planning 期间移除。validation 后 surviving findings by definition 已 validated（rejected ones drop）；在 validation 不运行的 modes 中，run mode 已经告诉 consumers 所需信息。任何 mode 内恒定的 field 都不做事。
- **Conservative failure mode:** validator timeout、malformed output 或 dispatch error → drop finding。未验证 findings 不应 externalize。

validator protocol 是 `{ "validated": true | false, "reason": "<one sentence>" }`，回答三个问题：issue 是否真实、是否由 THIS diff 引入、是否没有 elsewhere handled。Template：`references/validator-template.md`。

### Mode-aware false-positive 降级

ce-code-review 更宽的 persona surface（约 14 reviewers vs ce-doc-review 的 7）意味着更多 weak general-quality signal。Externalizing modes 中的 stricter precision 已通过更高 threshold 实现；interactive mode 则采用另一策略：将 weak findings route 到 existing soft buckets（`testing_gaps`、`residual_risks`、`advisory`），而不是 suppress。

demotion rule 有意保持 narrow：severity P2 或 P3、`autofix_class` advisory、contributing reviewer 是 `testing` 或 `maintainability`。Headless 和 autofix 完全 suppress 这些；interactive 与 report-only 将它们 demote 到 soft buckets，使它们仍 visible，但不与 primary-findings 争夺注意力。

这就是 "tier the precision bar by mode" framing。Synthesis own 它；personas 不会根据 mode 改变自己 flag 的内容。

### Lint-ignore 抑制

如果 code 中带有明确 lint disable comment，且正是 reviewer 将要 flag 的 rule（`eslint-disable-next-line no-unused-vars`、`# rubocop:disable Style/...`、`# noqa: E501` 等）-- suppress，除非该 suppression 本身违反 project-standards rule。作者已经选择 suppress；通过另一个 reviewer 再次 flag 会制造 noise，并忽视他们的决定。

这是 ce-code-review catalog 中唯一全新的 false-positive category；其余都从 existing pre-anchor catalog 移植。

### PR-mode skip-condition 预检查

在对 PR 运行完整 review 前，单个 `gh pr view` call 探测 skip conditions：
- Closed 或 merged PR
- Draft PR（草稿 PR）
- Trivial automated PR（保守的 `chore(deps)` / `build(deps)` / release-bump pattern，且 body empty）
- 已有 ce-code-review report comment

满足条件时 cleanly skip，不 dispatch reviewers。Standalone branch 与 `base:` modes 始终运行 -- skip-check 仅限 PR-mode。Already-reviewed detection 有意忽略 commits-since-comment；"I want to re-review after pushing more commits" 的 escape hatch 是 branch mode 或 `base:` mode，两者都完全 bypass skip-check。

这避免了在不应 review 的 PRs（closed、draft、dependabot-style 或 already-reviewed）上浪费 multi-agent review cost。它是本 migration 中最便宜的机制，并且对任何把 skill 跑在 arbitrary PR queues 上的团队都极其有价值。

### 文件

- `skills/ce-code-review/references/findings-schema.json` -- `confidence` 是 integer enum `[0, 25, 50, 75, 100]`，description 中含 code-review-specific behavioral definitions；`_meta.confidence_anchors` 与 `_meta.confidence_thresholds` document anchors 和 `>= 75` gate
- `skills/ce-code-review/references/subagent-template.md` -- verbatim 5-anchor rubric with code-review framing、expanded false-positive catalog including lint-ignore rule、reject floats 的 hard schema-conformance constraints
- `skills/ce-code-review/references/validator-template.md` -- Stage 5b validator subagent prompt
- `skills/ce-code-review/SKILL.md` -- Stage 5 anchor gate 与 one-anchor promotion（替代 `+0.10`）、Stage 5 step 7c mode-aware demotion、Stage 5b validation pass with budget cap、Stage 1 PR-mode skip-condition pre-check、After-Review options B 与 C 在 externalizing 前调用 validation
- `plugins/compound-engineering/agents/ce-*-reviewer.md` -- code-review reviewer personas 从 float bands 更新为 anchored language，并保留每个 persona 的 specific calibration signal
- `skills/ce-code-review/references/review-output-template.md` -- Confidence column 渲染为 integer（`75`、`100`），不是 float
- `tests/review-skill-contract.test.ts` -- schema、synthesis、validation pass、skip-conditions、mode-aware demotion 和 per-persona anchored-language assertions

### 何时把这个 combined pattern 应用到新 skill

当 **全部** 条件成立时，应用完整 bundle（anchored rubric + validation pass + mode-aware demotion + skip-conditions + lint-ignore）：
1. skill 是 multi-persona review workflow，产生 structured findings。
2. skill 有 externalizing modes -- outputs 会在没有 further human review 的情况下被行动（PR comments、autofix、downstream automation、headless callers）。
3. skill 调用频率足以让 wasted runs 可见（此时 skip-conditions 是 pure win；低频 cases 中成本适中）。

只应用 **anchored rubric**（ce-doc-review subset）当：
- skill 是 single-shot，或通过 UI/menu dismiss 很便宜 -- validation pass 增加成本，却没有保护任何原本不会由 human triage 的东西。
- skill 处理缺乏 ground-truth verification 的 premise/strategy claims -- anchor 100 不可达；threshold 应为 `>= 50`。

跳过整个 pattern 当：
- skill 输出单个 value，而不是一组 findings。
- skill 处理 user input，且用户本身就是 source of truth（例如 interactive Q&A skills）。

### Migration 历史（ce-code-review）

以单个 PR 落地 anchored rubric、validation pass、skip-conditions、mode-aware demotion、lint-ignore suppression 和 persona sweep。schema change 是 load-bearing commit；subagent template、synthesis 和 persona updates consume 它。Branch：`refactor/ce-code-review-precision-and-validation`。包含完整 decision rationale 的 plan 位于 `docs/plans/2026-04-21-002-refactor-ce-code-review-precision-and-validation-plan.md`。

## 延后 follow-ups

- **ce-code-review 的 PR inline comment posting mode。** Anthropic's plugin 通过 `mcp__github_inline_comment__create_inline_comment` 发布 findings 为 inline GitHub PR comments，并带 full-SHA link discipline 与 committable suggestion blocks。ce-code-review 当前完全没有 PR-comment mode（只有 terminal output、fixer auto-apply 或 headless return）。这是实际 workflow gap；defer 是因为它是 substantial new mode（link format、suggestion-block handling、deduplication semantics、tracker integration overlap）。
- **Per-file validator batching。** 当真实 reviews 经常 surface 许多 clustered in few files 的 findings（large refactors）时，per-file validator 可读一次 file，并对所有 findings 评估它，能在保持 cross-file independence 的同时显著降低成本。等数据表明 savings 重要时再实现。
- **Haiku-tier orchestrator-side checks。** ce-code-review 当前所有 subagent dispatch 都用 sonnet，包括 cheap PR skip-condition probe。把明显便宜 checks（skip-conditions、standards path discovery）推到 haiku。
- **重新评估哪些 always-on personas 值得它们的 noise。** ce-code-review 保留 `testing` 和 `maintainability` always-on，并用 mode-aware demotion 作为 safety valve。如果真实 review runs 显示 demotion 经常触发，考虑让它们 conditional，而不是 always-on。
