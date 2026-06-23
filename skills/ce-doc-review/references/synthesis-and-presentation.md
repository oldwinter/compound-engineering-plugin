# Phases 3-5：Synthesis、Presentation 和 Next Action（下一步行动）

## Phase 3：Synthesize Findings（综合 Findings）

通过这个 pipeline 处理所有 agents 返回的 findings。顺序重要：每一步都依赖前一步。该 pipeline 实现 finding-lifecycle state machine：**Raised → (Confidence Gate | FYI-eligible | Dropped) → Deduplicated → Classified → SafeAuto | GatedAuto | Manual | FYI**。在每个 step boundary 都重新评估 state；不要把早先步骤的假设作为 prose-level shortcut 带到后面。

### 3.1 Validate（验证）

按 findings schema 检查每个 agent 返回的 JSON：

- 丢弃缺少 schema 中任何 required field 的 findings
- 丢弃 enum value 无效的 findings（包括旧 personas 中 pre-rename 的 `auto` / `present` values；在所有 persona output 重新生成之前，把它们视为 malformed）
- 在 Coverage section 中记录任何 malformed output 对应的 agent name

**不要向用户叙述 remap / validation diagnostics。** Schema-drift notes（“persona X returned unknown enum Y, remapped to Z”）、persona-prompt-drift commentary，以及其他 validator-internal diagnostics 都是 maintainer-facing information。它们不属于用户阅读的 Phase 4 output。如果某个 persona 的 output malformed，唯一 user-visible consequence 是 Coverage row annotation（例如 persona 显示更少 findings 或 `malformed` marker）。其他内容都留在 internal。

### 3.2 Anchor-Based Confidence Gate（基于 Anchor 的 Confidence Gate）

按 `confidence` anchor value gate findings。Anchors 是离散整数（`0`、`25`、`50`、`75`、`100`），其行为定义记录在 `references/findings-schema.json`，并嵌入 persona rubric（`references/subagent-template.md`）。这用 per-severity gates 替代了先前连续的 0.0-1.0 scale：doc-review economics 不值得按 severity 做 threshold gradation，而粗粒度 anchors 能防止 false-precision gaming。

| Anchor | 含义 | 路由 |
|--------|---------|-------|
| `0`    | False positive 或 pre-existing issue | 静默丢弃 |
| `25`   | 可能真实，但无法验证 | 静默丢弃 |
| `50`   | 已验证为真实，但属于 nitpick / advisory / 不太重要 | 在 FYI subsection 展示 |
| `75`   | 已 double-check，会在实践中触发，直接影响 correctness | 进入 actionable tier（按 `autofix_class` 分类） |
| `100`  | Evidence 直接确认；会频繁发生 | 进入 actionable tier（按 `autofix_class` 分类） |

- **Dropped silently**（anchors `0` 和 `25`）：这些不在任何 output bucket 中展示——既不作为 findings，也不作为 FYI observations 或 residual concerns。非零时，在 Coverage footnote line 中记录总 drop count：`Dropped: N (anchors 0/25 suppressed)`。该 footnote 出现在 Coverage table 下方；当它和 `Chains:` footnote 同时存在时并列展示。这是 drop-count reporting 的 canonical location，不是 summary line，也不是 per-persona Coverage column。N 为零时省略 footnote。
- **FYI-subsection**（anchor `50`）：不管 `autofix_class` 如何，都在 presentation layer 的 FYI subsection 中展示。它们不进入 walk-through 或任何 bulk action：有观察价值，但不强迫用户决策。Advisory observations（“nothing breaks, but...”）自然落在这里。
- **Actionable**（anchors `75` 和 `100`）：进入 classification pipeline。按 `autofix_class` 路由（见 3.7）。

**为什么用这个 threshold，而不是 Anthropic 的 ≥ 80 code-review threshold：** Document review 的经济性与 code review 相反。这里没有 linter backstop；review 本身就是 backstop。Premise-level concerns（product-lens、adversarial）天然会封顶在 anchors 50-75，因为“motivation 是否有效？”无法对照 ground truth 验证。routing menu 已经让 dismissal 很便宜（Skip、Append to Open Questions），因此 surfaced-and-skipped 是低成本结果，而 missed-and-shipped 会破坏下游实现。低门槛过滤（`≥ 50`），让 routing menu 处理 volume。

### 3.3 Deduplicate（去重）

使用 `normalize(section) + normalize(title)` 为每个 finding 生成 fingerprint。Normalization：lowercase、strip punctuation、collapse whitespace。

当 fingerprints 在 personas 之间匹配：

- 如果 findings 推荐相反 actions（例如一个说 cut，另一个说 keep），不要 merge；保留两者，交给 3.5 的 contradiction resolution
- 否则 merge：保留最高 severity，保留最高 confidence anchor（如并列，保留 document order 中先出现的 finding——deterministic，不是 probabilistic），合并所有 evidence arrays，记录所有同意的 reviewers（例如 “coherence, feasibility”）
- **Coverage attribution:** 把 merged finding 归因给 confidence anchor 最高的 persona。如果 anchors 并列，归因给 document order 中 entry 先出现的 persona。递减 losing persona 的 Findings count 和对应 route bucket，确保 totals 精确。

### 3.3b Same-Persona Premise Redundancy Collapse（同 Persona 前提冗余折叠）

单个 persona 有时会提交多个共享同一 root premise 的 findings，只是落在不同 sections 或包裹在不同 framing 中（例如 product-lens 在 Motivation、Unit 4b、Key Technical Decisions 和另外两个 sections 上触发五个“motivation is weak”的变体）。Cross-persona dedup（3.3）抓不到这种情况，因为它基于 section+title 指纹；即使底层 concern 相同，二者也不同。把所有 N 个变体都展示出来，会相对其他五个 personas 过度放大单一 persona 的视角，并用近重复 signal 膨胀 P2 Decisions tier。

对每个 persona，按 shared root premise 聚类该 persona 的 surviving findings。当同一个 persona 的 3 个或更多 findings 共享以下特征时形成 cluster：

- 相同的 `finding_type`（error 或 omission）
- `why_it_matters` phrasing 实质重叠（相同关键名词/动词表示同一 concern，例如 “motivation”、"justification"、"premise unsupported"、"scope creep"）
- fixes 会被同一个 upstream decision 统一 moot（例如 “add the triggering incident” 会使五个 motivation-weakness findings 全部失效）

对每个 size N ≥ 3 的 cluster：

- 保留 evidence 最强的单个 finding（最高 confidence anchor；如并列，选择引用最具体 document reference 的那个）
- 将其余 N-1 个 findings 降级为 FYI-subsection status（anchor `50`），不管原 anchor 是什么
- 在保留的 finding 上，在 Reviewer column 中注明该 persona 提出了 N-1 个 related variants（例如 `product-lens (+4 related variants demoted to FYI)`）

这一步在 3.4 cross-persona boost 之前按 persona 运行。跨 persona agreement 只会基于 *kept* finding 参与 3.4 中的 anchor-step promotion；被降级的 variants 不参与 cross-persona promotion（collapse 之后它们只是 observational）。

不要在此步骤跨 personas collapse：不同 personas 提出相同 concern 正是 cross-persona boost 奖励的 independence signal。collapse 只应用于同一个 persona 的 output 内部。

### 3.4 Cross-Persona Agreement Promotion（跨 Persona 一致性提升）

当 2 个以上 independent personas 标记同一个 merged finding（来自 3.3）时，将 merged finding 的 anchor 提升一个 step：`50 → 75`，`75 → 100`。Anchor `100` 不再提升（已在 ceiling）。Anchors `0` 或 `25` 的 findings 不会到达此步骤（它们已在 3.2 dropped）。

Independent corroboration 是强 signal：多个 reviewers 收敛到同一 issue，比任何单个 reviewer 的 anchor 更可靠。提升 one anchor step 在语义上有意义（两个 personas 独立提出的 “verified but nitpick” finding 很可能是 “will hit in practice”）。这替代了先前的 `+0.10` boost：magic-number bump 是针对连续 scale 校准的，不再适用。

在 output 的 Reviewer column 中注明 promotion（例如 `coherence, feasibility (+1 anchor)`）。

这替代了早先的 residual-concern promotion step。Anchors `0` / `25` 的 findings 不会被重新提升回 review surface；它们只作为 Coverage 中的 drop counts 出现。如果某个 dropped finding 真的重要，reviewer 应通过更强 evidence 把 anchor 提到 `50` 或更高，而不是依赖 promotion rule。

### 3.5 Resolve Contradictions（解决矛盾）

当 personas 对同一 section 存在分歧：

- 创建一个 combined finding，展示两种 perspectives
- 设置 `autofix_class: manual`（contradictions 按定义都是 judgment calls）
- 设置 `finding_type: error`（contradictions 关乎文档所说内容互相冲突，而不是遗漏）
- 表述为 tradeoff，而不是 verdict

具体 conflict patterns：

- Coherence 说 “keep for consistency” + scope-guardian 说 “cut for simplicity” → combined finding，让用户决定
- Feasibility 说 “this is impossible” + product-lens 说 “this is essential” → P1 finding，表述为 tradeoff
- 多个 personas 标记同一 issue（无分歧）→ 由 3.3 merge 处理，不在这里处理

### 3.5b Deterministic Recommended-Action Tie-Break（确定性推荐动作平局处理）

每个 merged finding 都携带 exactly one `recommended_action` 字段，供 walk-through（`references/walkthrough.md`）标记 `(recommended)` option、best-judgment path（`references/bulk-preview.md`）选择 bulk 执行内容，以及 stem 的 yes/no framing 使用。当一个 merged finding 被多个 personas 标记且它们暗示不同 actions 时，synthesis 以 deterministic 方式选择 recommended action，确保相同 review artifacts 在不同 runs 中产生相同 walk-through 和 best-judgment 行为。

**Tie-break order（最保守优先）：** `Skip > Defer > Apply`。按这个顺序扫描，贡献 personas 中至少有一个暗示的第一个 action 获胜。

- 如果任何 contributing persona 暗示 Skip → `recommended_action: Skip`
- 否则，如果任何 contributing persona 暗示 Defer → `recommended_action: Defer`
- 否则 → `recommended_action: Apply`

**Persona-to-action mapping.** persona 通过 classification 暗示 action：

- `safe_auto` 或 `gated_auto` → 暗示 Apply
- `manual` 带有具体 `suggested_fix` 且推荐某个 resolution → 暗示 Apply（persona 对要做什么有意见）
- `manual` 被标记为 tradeoff 或 scope question 且没有 recommended resolution → 暗示 Defer（值得回看，但现在不值得行动）
- 任何 persona 通过 residual concerns 把 finding 标为 low-confidence 或 suppression-eligible → 暗示 Skip
- contradiction set（3.5）中暗示 “keep as-is / do not change” 的 persona → 暗示 Skip

如果 contributing personas 对 action 全部静默（例如某个 merged `manual` finding 来自一组只把它标为 observation、没有 recommendation 的 personas），则根据 merged finding 是否携带可执行 `suggested_fix` 选择 default：

- 存在 `suggested_fix` → `recommended_action: Apply` 作为 pragmatic default。
- 缺少 `suggested_fix` → `recommended_action: Defer`（walk-through 和 best-judgment path 无法执行没有 fix 的 Apply；把无 action 的 finding 路由到 Defer 会把它放进 Open Questions，由用户决定如何处理）。

这个 gate 对 tie-break 的每个 branch 都成立：如果 winning action 是 `Apply`，但在 3.6（Promote）和 3.7（Route）之后 merged finding 没有 `suggested_fix`，则降级为 `Defer`。walk-through 仍允许用户选择四个 options 中任意一个；该规则只控制 agent 的 default recommendation，让 best-judgment path 和 bulk-preview 永远不会调度不可执行的 Apply。

**Conflict-context surface.** 当 tie-break 触发（contributing personas 暗示不同 actions）时，在 merged finding 上记录一行 conflict-context string。walk-through 会在 R15 conflict-context line 上渲染它（见 `references/walkthrough.md`）。示例：`Coherence recommends Apply; scope-guardian recommends Skip. Agent's recommendation: Skip.`

**Downstream invariant.** walk-through 和 bulk-preview 永远不重新计算 recommendation；它们读取 `recommended_action`，并在匹配 option 上渲染 `(recommended)`。Best-judgment-the-rest 和 routing option B 会跨 scoped finding set bulk 执行 `recommended_action`。这让 best-judgment outcomes 可复现、可审计：同一个 review artifact 始终产生同一个 bulk plan。

### 3.5c Premise-Dependency Chain Linking（前提依赖链链接）

Document reviews 常产生 fanout：一个 premise challenge（“is this work justified?”）会生成一批 downstream findings；如果 premise 被 rejected，它们都会消失（“alias unjustified”、“abstraction overkill”、“migration lacks rollback”、“naming forecloses future”）。把每个都作为独立 decision 展示，会迫使用户重复争论同一个 root question N 次。本步骤将 dependent findings 链接到 root，这样 presentation 可以分组，walk-through 可以用单个 root decision cascade 整条 chain。

在 3.5b（recommended_action normalized）之后、3.6（auto-promotion）之前运行此步骤，作用于 merged finding set。

**Step 1：Identify roots（识别 roots）。** 当 finding 满足以下全部条件时，它是 candidate root：

- Severity 是 `P0` 或 `P1`（premise-level issues 天然高优先级）
- `autofix_class` 是 `manual`（root 本身需要 judgment；safe/gated root 会被 acted on，不会 cascade）
- `why_it_matters` 或 `title` 质疑 foundational premise，而不是细节。Signal phrases（形态而非固定词表）包括："premise unsupported"、"justification missing"、"do-nothing baseline not evaluated"、"is X justified"、"unsupported by evidence"、"is the proposed solution the right approach"
- finding 的 `section` 是 framing-level（Problem Frame、Summary、Overview、Why、Motivation、Goals——`Summary` 是新的 ce-plan / ce-brainstorm template heading；`Overview` 保留为 legacy），或 finding 明确质疑某个 named component 是否应该存在

如果多个 candidates 符合条件，提升全部。以上 criteria（P0/P1、manual、framing-level section、premise-challenge signal phrases）已经足够严格，任何 well-formed document 的列表都会很短；不要再施加额外数量上限。只选择一个 root 会让第二个 valid root 的 natural dependents 作为独立 manual findings 漂浮出来，正是 chains 要解决的 UX 问题。

**Peer vs nested test（同级与嵌套测试）。** 当接受 root A 的 proposed fix 不会解决 root B 的 concern（反之亦然）时，两者是 peers。当一个 root 的 fix 会 moot 另一个 root 时，两者是 nested；被覆盖的 candidate 变成 surviving root 的 dependent，而不是 peer root。对称应用测试：决定前检查两个方向。

**Surviving-root selection under asymmetric subsumption（非对称包含下的 surviving root 选择）。** 当 nested 时，surviving root 是 fix 会 moot 另一个 concern 的那个，**不是** confidence 更高的那个。如果接受 Root A 的 fix 会 moot Root B 的 concern，但接受 Root B 的 fix 仍留下 Root A 的 concern，则 A 是 surviving root，B 成为它的 dependent，不管哪一个 confidence 更高。subsumption direction 决定 scope（更宽的 premise 获胜）；confidence 决定 strength，不决定 scope。Confidence 用于 peers 之间的 tie-breaking，不用于判断两个 nested candidates 谁支配谁。

**Sanity diagnostic（合理性诊断）。** 如果超过 3 个 candidates 匹配，重新检查 criteria 是否应用正确：单个 document 中出现超过 3 个真正 distinct premise-level challenges 并不常见。不要静默丢弃 candidates；要么确认每个都独立满足 criteria（并全部展示），要么收紧 criteria 的应用。如果数量确实很高，展示全部比隐藏任何一个更有用。

如果没有匹配项，跳过此步骤剩余部分：不存在 chains。

**Dependent assignment under multiple roots（多个 roots 下的 dependent 分配）。** 当存在多个 roots，且某个 candidate dependent 可能链接到多个 root 时，把它分配给 rejection 最直接 dissolves 该 dependent concern 的 root。若仍有歧义，分配给 confidence anchor 更高的 root；若 anchors 并列，分配给 document order 中更早出现的 root。dependent 永远只链接到一个 root：单个 `depends_on` value。

**Step 2：Identify dependents（识别 dependents）。** 对每个 candidate root，扫描剩余 findings 寻找 dependents。predicate 必须匹配 `references/walkthrough.md` 中的 cascade trigger：dependents 在用户 reject（Skip/Defer）root 时 cascade，所以 dependency 定义在 rejection branch，而不是 acceptance branch。当 finding 满足以下条件时，是 root 的 dependent：

- root 质疑某个 named component 的 foundational premise：它是否应该存在、proposed approach 是否正确、work 是否 justified。需要识别的形态（不是词表，映射到文档自己的 domain）：necessity 被质疑的 compatibility layer、justification 有疑问的 planned feature、warrant 被质疑的 abstraction、scope 有争议的 proposed change、choice 有争议的 migration target、basis unsupported 的 architectural commitment
- candidate 的 `suggested_fix` 修改、补充细节或约束同一个 component
- 如果 root premise 被 rejected，candidate 的 concern 会 dissolve：也就是说，如果用户 reject root（Skip/Defer），dependent 目标 component 不再是 plan 中稳定的一部分，因此 dependent 的 fix 没有稳定对象可作用，会随 root 一起 batch-reject

用 substitution check 测试：“如果用户 reject root（Skip/Defer），dependent 的 finding 是否仍描述一个用户本轮想处理的 actionable concern？”如果否——dependent 的 premise 随 root dissolves——它是 dependent。如果是（finding 识别的问题在 root rejection 后仍存在），它不是。

**Step 3：Independence safeguard（独立性保护）。** 即使 finding 的 target component 被 root 涉及，也不要链接以下情况：

- dependent 识别的问题不管 root 如何 resolution 都存在。migration 的 rollback plan、module 的 error handling、feature 的 test coverage——这些是 operational obligations，不会因为 premise 改变而蒸发。它们描述的是 component 只要存在就必须怎样表现。
- dependent 的 `why_it_matters` 引用独立成立的 evidence（codebase fact、framework convention、production data），不依赖该 premise
- dependent 是 `safe_auto`——它有一个明确正确的 fix，应无视 root resolution 而应用

不确定时，默认不要链接。误链接的 chain 会隐藏真实 issue；不链接只多花一个 decision。

**Step 4：Annotate（标注）。** 在每个 dependent 上记录 `depends_on: <root_finding_id>`（用 section + normalized title 作为 id）。在每个 root 上记录 `dependents: [<dependent_ids>]`。每个 root 的 `dependents` 最多 6 个；如果超过 6 个 candidates 链接到同一个 root，按 severity、confidence anchor（降序）和 document order（deterministic final tiebreak）保留前 6 个；其余保持 unlinked（过度 aggressive chaining 有遮蔽 independent concerns 的风险）。

不要在此步骤 reclassify、re-route 或改变任何 finding 的 confidence anchor。Linking 纯粹是 annotative；walk-through 和 presentation 使用 annotation，synthesis proper 不使用。

**Step 5：Report in Coverage（在 Coverage 中报告）。** 在 coverage summary 中添加一行：`Chains: N root(s) with M total dependents`。当 N = 0 时省略该行。

**Count invariant（critical，不要违反）：** coverage line 中的 `M` 是 Step 4 完成后设置了 `depends_on` 的 findings 数量，也就是经过 steps 2（candidacy）、3（independence safeguard）和 4（cap）后的最终 linked count。它不是 Step 2 中考虑过的 candidates 数量。同一个 `dependents` array 是 coverage counting 和渲染 `Dependents (...)` sub-block 的 source of truth。如果 finding 出现在 root 的 `dependents` array 中，它必须嵌套显示在该 root 下，且绝不能出现在自己的 severity position。如果 finding 没有出现在任何 root 的 `dependents` array 中，它必须出现在自己的 severity position，且不得嵌套在任何地方。Coverage count 与 rendering 只有在 orchestrator 使用了两个不同 source-of-truth values 时才会漂移；这里只有一个 source of truth：每个 root 上 post-Step-4 的 `dependents` array。

**Worked example A（rename-shape）。** 对一个 refactor plan 的 review 产出 11 个 findings。其中一个是 Problem Frame 中的 P0 manual “Rename premise unsupported by user-facing evidence”——candidate root。扫描其他 10 个：

- P1 manual “Alias mechanism unjustified scope” —— root 提议 scope down 到 pure alias-free rename；dependent 的 fix 提议丢弃 alias infrastructure。Linked。
- P2 manual “AliasedCommand abstraction overkill” —— abstraction 存在是为了支持 alias；如果 alias dropped，abstraction dissolves。Linked。
- P2 manual “Rename forecloses dual-mode future” —— concern 只有 rename proceeds 时才存在。Linked。
- P2 manual “Identity drift: command vs artifact names” —— naming asymmetry 只有 rename proceeds 时才存在。Linked。
- P1 manual “Migration lacks rollback strategy” —— migration 不管 scope 如何都需要 rollback。NOT linked（independence safeguard）。
- P0 gated_auto “Deployment-ordering between migration and code” —— 用户无论如何都确认的 concrete fix。NOT linked（safeguard：gated_auto 有自己的 resolution path）。

结果：1 root + 4 dependents。用户先看到 root；reject 它会 cascade 4 个 dependents 为 auto-resolved。Manual engagement 从 11 → 7（6 unlinked + 1 visible root）。

**Worked example B（auth-shape）。** 对引入新 session-management middleware 的 plan 进行 review。其中一个 finding 是 Problem Frame 中的 P1 manual “Middleware rewrite premise unsupported — existing session handling has no reported reliability issues”。扫描其他 findings：

- P2 manual “Middleware abstraction boundary unclear vs existing request context” —— boundary 只有 middleware 被 build 时才重要。Linked。
- P2 manual “Rollout strategy for new session store not specified” —— rollout 只有 new store shipping 时才重要。Linked。
- P1 gated_auto “CSRF token regeneration missing on session rotation” —— plan written design 中真实 security gap，独立于 middleware 是否是正确 approach。NOT linked（safeguard：gated_auto，concrete fix 无论如何应用）。
- P2 manual “Existing session timeout behavior not captured in tests” —— 这是 pre-existing test coverage gap。不管 rewrite 是否发生，它都存在于当前 code。NOT linked（independence safeguard）。

结果：1 root + 2 dependents。形态与 Example A 相同：不同 vocabulary、不同 domain，但要识别的是同一 pattern。

### 3.6 Promote Auto-Eligible Findings（提升可自动处理 Findings）

扫描 `manual` findings，判断是否 promote 为 `safe_auto` 或 `gated_auto`。当 finding 满足以下 consolidated auto-promotion patterns 之一时 promote：

- **Codebase-pattern-resolved（由 codebase pattern 解决）。** `why_it_matters` 引用特定 existing codebase pattern（具体 file/function/usage reference，而不只是 “best practice” 或 “convention”），且 `suggested_fix` 遵循该 pattern。Promote to `gated_auto`——用户仍需确认，但 codebase evidence 解决了歧义。
- **Factually incorrect behavior（事实错误的行为描述）。** 文档描述的 behavior 在事实层面错误，且正确 behavior 可从 context 或 codebase 推导。Promote to `gated_auto`。
- **Missing standard security/reliability controls（缺少标准安全/可靠性控制）。** omission 显然是 gap（不是该系统的合法 design choice），且 fix 遵循 established practice（HTTPS enforcement、checksum verification、input sanitization、fallback-with-deprecation-warning on renames）。Promote to `gated_auto`。
- **Framework-native-API substitutions（替换为 framework-native API）。** 手写实现重复了 first-class framework behavior，且引用了 framework API。Promote to `gated_auto`。
- **Mechanically-implied completeness additions（机械推导出的完整性补充）。** missing content 可由文档自己 explicit、concrete decisions 机械推导（不是 high-level goals）。当确实只有一个正确 addition 时 promote to `safe_auto`；当 addition substantive 时 promote to `gated_auto`。

如果 finding 涉及 scope 或 priority changes，而 author 可能权衡了 reviewer 看不到的 tradeoffs，不要 promote。

**Strawman-downgrade safeguard（稻草人降级保护）。** 如果 `safe_auto` finding 在 `why_it_matters` 中命名 dismissed alternatives（按 subagent template 的 strawman rule），确认这些 alternatives 确实是 strawmen。如果任何 alternative 是 plausible design choice 且 persona dismiss 得过于激进，则 downgrade to `gated_auto`，让用户在 fix 应用前看到 tradeoff。

### 3.7 Route by Autofix Class（按 Autofix Class 路由）

**Severity 与 autofix_class 独立。** P1 finding 可以是 `safe_auto`，如果正确 fix 显而易见。测试不是“它有多重要？”，而是“是否只有一个明确正确的 fix，还是需要 judgment？”

**Anchor 与 autofix_class 也独立。** Anchor 决定 finding 进入哪个 surface（FYI vs actionable）；`autofix_class` 决定 actionable surface 如何处理它。本步骤会同时查阅二者。

到达 3.7 的 findings 已由 3.2 gate 为 anchors `50`、`75` 或 `100`（anchors `0` 和 `25` 已 dropped）。

| Anchor | Autofix Class | 路由 |
|--------|---------------|-------|
| `100`  | `safe_auto`   | 在 Phase 4 静默应用。需要 `suggested_fix`；缺失时降级为 `gated_auto`。 |
| `100`  | `gated_auto`  | 进入 per-finding walk-through，并将 Apply 标记为 recommended。需要 `suggested_fix`；缺失时降级为 `manual`。 |
| `100`  | `manual`      | 进入带 user-judgment framing 的 per-finding walk-through。`suggested_fix` 可选。 |
| `75`   | `safe_auto`   | routing 前降级为 `gated_auto` —— silent apply 只保留给 evidence 直接确认 fix 的 anchor `100` findings。进入 walk-through，并将 Apply 标记为 recommended。 |
| `75`   | `gated_auto`  | 进入 per-finding walk-through，并将 Apply 标记为 recommended。需要 `suggested_fix`；缺失时降级为 `manual`。 |
| `75`   | `manual`      | 进入带 user-judgment framing 的 per-finding walk-through。`suggested_fix` 可选。 |
| `50`   | any           | 不管 `autofix_class` 如何，都在 FYI subsection 展示。不进入 walk-through 或任何 bulk action。这些是 observations，不是 decisions。 |

**safe_auto 的 auto-eligible patterns：** summary/detail mismatch（body authoritative over overview）、wrong counts、missing list entries derivable from elsewhere in the document、stale internal cross-references、terminology drift、prose-vs-diagram inconsistency where the diagram can be mechanically updated to match the prose（deletion is never the fix——diagrams 是 intentional communication choices，帮助 spatial comprehension，而不是 prose 的 redundancy）、missing steps mechanically implied by other content、unstated thresholds implied by surrounding context。

**gated_auto 的 auto-eligible patterns：** codebase-pattern-resolved fixes、factually incorrect behavior、missing standard security/reliability controls、framework-native-API substitutions、substantive completeness additions mechanically implied by explicit decisions。

### 3.8 Sort（排序）

按以下顺序排序 findings 用于 presentation：P0 → P1 → P2 → P3，然后 finding type（errors before omissions），然后 confidence anchor（降序：先 `100`，再 `75`，再 `50`），最后用 document order（section position）作为 deterministic final tiebreak。

### 3.9 Suppress Restatements in Residual Concerns and Deferred Questions（压制 residual/deferred 重述）

Persona outputs 会携带 `residual_risks` 和 `deferred_questions` arrays，与 `findings` 并列。在 actionable-tier set finalized（post-3.7 routing）之后，personas 常会在自己的 residual/deferred arrays 中重新提出同一 substance：persona 自己的 finding 和自己的 residual concern 指向同一个 issue。把两个 sections 都逐字渲染会用无新 signal 的 restatements 膨胀 output。

对所有 persona outputs 中的每个 `residual_risk` 和 `deferred_question`，与 finalized actionable-finding set（confidence anchor `75` 或 `100` 的 findings，加上 anchor `50` 的 FYI-subsection findings）比较。如果以下任一成立，则丢弃该 residual/deferred item：

- **Section-and-substance overlap（section 和 substance 重叠）。** residual/deferred item 命名了与 actionable finding 相同的 section，且其 substance 与 finding 的 `title` 或 `why_it_matters` fuzzy-match（共享表示同一 concern 的关键名词/动词）。
- **Question form of an actionable finding（actionable finding 的问题形式）。** deferred question 的 subject 已被 actionable finding 的 recommendation 直接回答或 obviated。示例：actionable finding “Motivation cites no real incident” → deferred question “Is there a concrete triggering event?”——finding 已经提出这一点；question 只是以疑问形式重述。

不要丢弃引入真正新 signal 的 residual/deferred items（actionable findings 未触及的 concern 或 question）。不确定时保留：本 pass 只处理 obvious restatements，不处理 borderline calls。

在所有 personas 的 merged set 上运行此 pass。非零时，在 Coverage footnote line 记录 dropped count：`Restated: N (residual/deferred items suppressed as duplicates of actionable findings)`。Ordering：footnotes 在 Coverage table 下方按 `Dropped:`、`Chains:`、`Restated:` 顺序逐行出现。count 为零时省略对应 footnote。

## Phase 4：Apply and Present（应用并呈现）

**User-facing vocabulary rule（适用于 Phase 4 的所有 user-visible output，而不只是 rendered template）。** Internal enum values——`safe_auto`、`gated_auto`、`manual`、`FYI`——保留在 schema 和 synthesis prose 内。用户在 Phase 4 output 中看到的每个词，包括 sections 之间的 free-text narration、transition preambles、status lines 和 confirmation messages，都必须使用 user-facing vocabulary：“fixes”（对应 `safe_auto`）、“proposed fixes”（对应 `gated_auto`）、“decisions”（对应 confidence anchor `75` 或 `100` 的 `manual` findings）、“FYI observations”（对应 anchor `50` 的任何 finding）。唯一例外是 rendered tables 中的 `Tier` column，它被明确记录为为了 transparency 展示 internal enum。不要输出 “safe_auto fixes applied” 或 “N safe_auto findings” 这样的 narration；写成 “fixes applied” 或 “N fixes”。

### Apply safe_auto fixes（应用 safe_auto fixes）

只把 confidence anchor `100` 的 `safe_auto` findings 单次遍历应用到文档。这匹配 3.7 routing table：anchor `100` + `safe_auto` silent-applies；anchor `75` + `safe_auto` 已在 3.7 降级为 `gated_auto` 并进入 walk-through；anchor `50` + 任意 `autofix_class` 路由到 FYI，绝不能 auto-apply。

- 使用平台 edit tool inline 编辑文档
- 为 rendered output 中的 “Applied fixes” section 跟踪改动内容（`safe_auto` 是 internal enum；rendered section header 读作 “Applied fixes”）
- 不要请求 approval：这些有一个明确正确的 fix，且 evidence 直接确认（anchor `100`）
- 不要 silent-apply 任何 anchor `75` 或 `50` 的 `safe_auto` finding。如果 finding 到达此步骤时 `autofix_class: safe_auto` 但 anchor 低于 `100`，说明 3.7 routing rule 未正确应用；继续前重新对该 finding 运行 3.7。

在 output summary 中列出每个 applied fix，让用户看到发生了什么。使用足够 detail 表达每个 fix 的 substance（section、改了什么、reviewer attribution）。对于添加内容或影响文档语义的 fixes 尤其重要：用户不应必须通过 diff 才理解 review 做了什么。

### Route Remaining Findings（路由剩余 Findings）

safe_auto fixes apply 后，剩余 findings 分成 buckets：

- confidence anchor `75` 或 `100` 的 `gated_auto` 和 `manual` findings → 进入 routing question（见 Unit 5 / `references/walkthrough.md`）
- FYI-subsection findings → 只在 presentation 中展示，不路由
- 没有 remaining actionable findings → 跳过 routing question，直接进入 Phase 5 terminal question

**Headless mode（无头模式）：** 不使用 interactive question tools。把所有 findings 输出为 caller 可解析的 structured text envelope。Internal enum values（`safe_auto`、`gated_auto`、`manual`、`FYI`）保留在 schema 和 synthesis prose 中；下方 envelope 使用 user-facing vocabulary——“fixes”、“Proposed fixes”、“Decisions”、“FYI observations”——让 headless output 与 interactive output 阅读形态一致。

```
Document review complete (headless mode).

Applied N fixes:
- <section>: <what was changed> (<reviewer>)
- <section>: <what was changed> (<reviewer>)

Proposed fixes (concrete fix, requires user confirmation):

[P0] Section: <section> — <title> (<reviewer>, confidence <anchor>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix>

Decisions (requires user judgment):

[P1] Section: <section> — <title> (<reviewer>, confidence <anchor>)
  Why: <why_it_matters>
  Suggested fix: <suggested_fix or "none">

  Dependents (would resolve if this root is rejected):
    [P2] Section: <section> — <title> (<reviewer>, confidence <anchor>)
      Why: <why_it_matters>
    [P2] Section: <section> — <title> (<reviewer>, confidence <anchor>)
      Why: <why_it_matters>

FYI observations (anchor 50, no decision required):

[P3] Section: <section> — <title> (<reviewer>, confidence <anchor>)
  Why: <why_it_matters>

Residual concerns:
- <concern> (<source>)

Deferred questions:
- <question> (<source>)

Dropped: N (anchors 0/25 suppressed)
Chains: N root(s) with M dependents
Restated: N (residual/deferred items suppressed as duplicates of actionable findings)

Review complete
```

省略所有零 items 的 section。section headers 使用 user-facing vocabulary：“Proposed fixes” bucket 承载 anchor `75` 或 `100` 的 `gated_auto` findings（persona 有 concrete fix，用户确认），“Decisions” 承载 anchor `75` 或 `100` 的 `manual` findings（judgment calls），“FYI observations” 承载 anchor `50` 的任何 finding，不管 `autofix_class`。当 root 有 dependents 时，把 root 渲染在 severity-sorted list 中的正常位置，并在其下方立即缩进嵌套 `Dependents (...)` sub-block。不要在 dependents 自己的 severity position 再次列出它们——它们只出现在 root 下方。以 “Review complete” 作为 terminal signal 结尾，方便 callers 检测 completion。

**FYI observations、residual concerns 和 deferred questions 的 compact rendering（high-count mode）。** 当这三个 buckets 的 combined count 为 5 或更多时，每个 bucket 收缩为一行 count，后跟紧凑 bullet list，不展开每项 `Why`。Actionable buckets（Proposed fixes / Decisions）无论数量多少都保持完整渲染。这与 `references/review-output-template.md` 中的 interactive-mode rule 对齐，因此两种 mode 产生相同形态。

**Interactive mode（交互模式）：**

使用 review output template 展示 findings（读取 `references/review-output-template.md`）。在每个 severity level 内，按 type 分开 findings：

- Errors（design tensions、contradictions、incorrect statements）在前——这些需要 resolution
- Omissions（missing steps、absent details、forgotten entries）在后——这些需要 additions

顶部 brief summary："Applied N fixes. K items need attention (X errors, Y omissions). Z FYI observations."

包含 Coverage table、applied fixes、FYI observations（作为 distinct subsection）、residual concerns 和 deferred questions。

**所有 tables 必须是 pipe-delimited markdown（`| col | col |`）。任何情况下都不要使用 ASCII box-drawing characters（`┌ ┬ ┐ ├ ┼ ┤ └ ┴ ┘ │ ─`），包括 Coverage table。** 此规则在 rendering point 重申 template 的 formatting requirement，防止漂移。Pipe-delimited tables 在所有 target harnesses 中都能正确渲染；box-drawing characters 会在部分 harnesses 中破坏渲染，并违反 root `AGENTS.md` 中记录的 repo convention。

### R29 Rejected-Finding Suppression（Round 2+，压制已拒绝 Finding）

当 orchestrator 在同一 session 中对同一文档运行 round 2+ 时，decision primer（见 `SKILL.md` — Decision primer）会携带前几轮所有 Skipped、Deferred 和 Acknowledged findings。Synthesis 会压制 re-raised rejected findings，而不是再次展示给用户。Acknowledged 在这里被视为 rejected-class decision：用户看过该 finding，选择不行动（没有 Apply、没有 Defer append），并希望留下记录——在 suppression 语义上等同于 Skip。

对每个 current-round finding，与 primer 的 rejected list 比较：

- **Matching predicate（匹配谓词）：** 与 R30 相同——`normalize(section) + normalize(title)` fingerprint，再加 evidence-substring overlap check（>50%）。如果 current-round finding 在 fingerprint 和 evidence overlap 上匹配 prior-round rejected finding，丢弃 current-round finding。
- **Materially-different exception（实质不同例外）：** 如果当前 document state 在 finding 的 section 周围自上一轮后发生变化（例如该 section 被编辑，且 evidence quote 不再出现在当前文本中），则把 finding 视为 new：底层 context 已变，concern 可能真的不同。persona 的 evidence 自身会揭示这一点：当前文档中不存在的 quote 是 prior-round rejection 不再适用的 signal。
- **On suppression（压制时）：** 在 Coverage 中记录 drop，并注明 “previously rejected, re-raised this round”，让用户看到什么被压制了。如果用户认为 suppression 错误，可以通过在不同 context 上再次调用 review 来显式升级。

此规则在 synthesis time 运行，而不是 persona level。Personas 通过 subagent template 的 `{decision_primer}` variable 获得 soft instruction，避免重新提出 rejected findings；但 orchestrator 才是 authoritative gate——如果 persona 尽管 primer 仍重新提出，synthesis 会丢弃该 finding。

### R30 Fix-Landed Matching Predicate（Fix 已落地匹配谓词）

当 orchestrator 对同一 document 运行 round 2+ 时（见 Unit 7 multi-round memory），synthesis 会验证 prior-round Applied findings 是否真的 landed。对每个 current-round finding，如果其 `normalize(section) + normalize(title)` fingerprint 匹配 prior-round Applied finding（与 3.3 dedup 相同 fingerprint），按 evidence overlap 分支：

- **Strong match — evidence overlap >50% with the prior-round evidence: fix-landed regression（强匹配：fix 未落地回归）。** current-round finding 引用了 prior-round fix 本应移除的同一 problematic text。把它在 report 中标为 “fix did not land”，而不是作为 new finding 展示。包含 prior-round finding 的 title 和 current-round persona 的 evidence，让用户看到为什么 verification flagged it。

- **Weak match — evidence overlap ≤50%: not a fix-landed regression（弱匹配：不是 fix 未落地回归）。** 低 evidence overlap 表明 prior problematic text 不再被引用，因此不要标记 “fix did not land”。不要仅凭 fingerprint match 压制。如果 current-round item 明确是 non-actionable verification observation（例如其 title 或 `why_it_matters` 表示 prior finding 已正确 landed，且不请求变更），压制它并在 Coverage 中记录 `Verified: round-{N} '{title}' landed correctly`。否则，把 finding 视为 new，并让它正常流经 dedup 和 routing。

  **Materially-different exception（实质不同例外）。** 如果 current-round finding 的 `why_it_matters` 描述的是与 prior-round finding 实质不同的 concern——即使 section/title fingerprint 匹配——也把它视为 new finding，而不是 fix-verified suppression。section 可能因为无关原因被编辑，新 edit 引入了不同 issue。信号来自 persona 的 substance，而不只是 fingerprint。

- **Section renames count as different locations（section rename 视为不同位置）。** 如果 section name 在 rounds 之间改变了（edit 引入 heading rename），把新 section 视为不同 location，current-round finding 视为 new——两个 branch 都不触发。

- **No fingerprint match（无 fingerprint 匹配）：** 不是 verification candidate；finding 正常流动到 3.3 dedup 及后续 routing。

此规则防止两个 failure modes：（1）fix 实际没有 landed 的 regressions；（2）persona over-emission，即 round-{N+1} reviewer 正确观察到 prior-round resolution 并发出 non-actionable “already addressed” finding。persona-side guidance in `subagent-template.md`（“Do not emit findings to note prior-round resolutions”）是 primary defense；此规则是 synthesis backstop。

### Protected Artifacts（受保护产物）

synthesis 期间，丢弃任何建议删除或移除以下路径中文件的 finding：

- `docs/brainstorms/`
- `docs/plans/`
- `docs/solutions/`

这些是 pipeline artifacts，不应被标记为 removal。

## Phase 5：Next Action — Terminal Question（下一步行动终端问题）

**Headless mode（无头模式）：** 立即返回 “Review complete”。不要提问。caller 接收 Phase 4 的 text envelope 并处理任何 remaining findings。

**Interactive mode（交互模式）：** 使用平台阻塞式问题工具触发 terminal question（Claude Code 中为 `AskUserQuestion`，Codex 中为 `request_user_input`，Antigravity 中为 `ask_question`，Pi 中为 `ask_user`，需 `pi-ask-user` extension）。在 Claude Code 中，该工具应已通过 `SKILL.md` 的 Interactive-mode pre-load step 加载；如果没有，立即用 `select:AskUserQuestion` 调用 `ToolSearch`。只有当 harness 没有阻塞式工具或工具调用报错时（例如 Codex edit modes），才退回到 chat 中的 numbered options；等待 schema 加载不是 fallback 条件。绝不要静默跳过问题。这个问题不同于 mid-flow routing question（`references/walkthrough.md`）：routing question 选择 *如何* 处理 findings，terminal question 选择 engagement 完成后 *下一步做什么*。不要合并它们。

**Stem（问题主干）：** `Apply decisions and what next?`

**Options（三个默认；zero-actionable case 中两个）：**

当 `fixes_applied_count > 0`（至少一个 safe_auto 或 Apply decision 已在本 session landed）：

```
A. Apply decisions and proceed to <next stage>
B. Apply decisions and re-review
C. Exit without further action
```

当 `fixes_applied_count == 0`（zero-actionable case，或用户选择 routing option D / 每个 walk-through decision 都是 Skip）：

```
A. Proceed to <next stage>
B. Exit without further action
```

`<next stage>` substitution 使用 Phase 1 中的 document type：

- Requirements document（需求文档）→ `ce-plan`
- Plan document（计划文档）→ `ce-work`

**Label adaptation（标签适配）：** 当没有 queued decisions 可 apply 时，primary option 去掉 `Apply decisions and` prefix——label 应匹配系统实际在做的事。有 queued fixes 时用 `Apply decisions and proceed`；没有 queued 时用 `Proceed`。

**Caller-context handling（implicit，调用方上下文处理）：** terminal question 的 “Proceed to <next stage>” 选项由 agent 根据可见 conversation state 做 contextual interpretation。当 ce-doc-review 在另一个 skill flow 内部调用时（例如 ce-brainstorm Phase 4 re-review、ce-plan phase 5.3.8），agent 不触发 nested `/ce-plan` 或 `/ce-work` dispatch，而是把控制权返回给 caller flow，由其继续自己的逻辑。当 standalone 调用时，“Proceed” dispatch 对应 next skill。不需要 explicit caller-hint argument；如果此 implicit handling 在实践中不可靠，可作为 follow-up 增加 explicit `nested:true` flag。

### Iteration limit（迭代上限）

2 次 refinement passes 后，建议完成——收益可能递减。但如果用户想继续，允许继续；primer 会携带所有 prior-round decisions，让后续 rounds 干净地压制 repeat findings。

无论用户选择哪个 option，都以 “Review complete” 作为 callers 的 terminal signal 返回。

## What NOT to Do（不要做什么）

- 不要 rewrite entire document
- 不要添加用户没有讨论过的新 sections 或 requirements
- 不要 over-engineer 或增加 complexity
- 不要创建 separate review files 或添加 metadata sections
- 不要修改 caller skills（ce-brainstorm、ce-plan 或调用 ce-doc-review 的 external plugin skills）

## Iteration Guidance（迭代指导）

在后续 passes 中，使用 multi-round decision primer（见 Unit 7）重新 dispatch personas，并重新 synthesize。Fixed findings 会因为 evidence 已从当前 doc 消失而 self-suppress；rejected findings 由 R29 pattern-match suppression rule 处理；applied-fix verification 使用上方 R30 matching predicate。如果这些机制运行后 findings 仍在 passes 之间重复，建议完成。
