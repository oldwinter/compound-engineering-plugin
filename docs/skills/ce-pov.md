# `ce-pov`

> 用主题自身的形状形成 decisive、project-grounded point of view：adoption verdict、document take 或针对既有 approaches 的立场，并可选使用不同 model 做 cross-check。

`ce-pov` 是 **judgment** skill。你可以给它 external-adoption question、需要 holistic response 的 plan/spec/brainstorm，或已经摆上台面的 competing approaches。它会用主题匹配的形状返回 decisive POV：adoption 使用 **Adopt / Trial / Hold / Reject / Not-our-problem**，document 使用 strengths/risks 与 bottom line，既有 options 则给出 preferred approach（或诚实的 toss-up）。它不同于 generic web research，后者解释 topic；`ce-pov` 决定这个 topic 在 *这里* 意味着什么。

核心规则是 **earned grounding**：每个 POV 都必须通过 **project floor**，引用一个 concrete、verified project fact。Adoption verdict 还必须通过完整 **external floor**；document 与 approach POV 则验证那些会实质支撑 bottom line 的 external claims。这就是它和 bare “what's your POV on X?” prompt 的根本差异，后者往往抽象回答并顺从你的 framing。

它填补 exploring（`/ce-ideate`）、scoping（`/ce-brainstorm`）、按 findings review（`/ce-doc-review`）和 building（`/ce-plan`）之间的 judgment 空隙。当 `ce-pov` 得到立场，它会提出正确且独立的下一步：edit it、plan it、scope it 或 spike it，并可把 decision 作为 seed hand off。

---

## 摘要（TL;DR）

| Question | Answer |
|----------|--------|
| 它做什么？ | 把 question、document 或既有 approach set 对照你的 project grounding，并用相同形状返回 decisive POV |
| 何时使用？ | “Should we adopt X?”、“what do you think of this plan?”、“A or B here?”，或 mid-session second opinion |
| 产出什么？ | Compact chat POV；可选 shareable write-up、captured decision 或带 attribution 的 cross-model panel note |
| 下一步 | 从 POV 推导出的独立 handoff：edits、`/ce-plan`、`/ce-brainstorm` 或 spike，而不是预设 |

---

## 调用示例

```text
# 判断 external tool 是否适合此 project
/ce-pov should we adopt Drizzle ORM here?

# 对文档给出 holistic bottom line
# 需要逐项 findings 时改用 ce-doc-review
/ce-pov what do you think of docs/plans/new-checkout.md?

# 在已经提出的 approaches 之间选择
/ce-pov for this service, should we use polling or webhooks?

# 只提供 link，让 ce-pov 先提出可能的问题
/ce-pov https://example.com/tool

# 让 independent panel pressure-test 当前 conversation 中已有的 proposal
/ce-pov oracle that proposal

# 围绕明确问题请求 independent cross-model check
/ce-pov ask an independent panel whether we should adopt this auth provider
/ce-pov compare your take on docs/plans/new-checkout.md with Grok and Composer

# 在 session 中途调用，获得针对当前方向、带 grounding 的 second opinion
/ce-pov
```

---

## 问题

Bare agent 被问 “what's your POV on X?” 时，会以可预测方式失败：

- **Answers in the abstract**：说 “X is great”，但没检查你的 dependencies、conventions 或 call-sites
- **Agrees with your framing**：当 pushover，批准你已经想要的东西
- **Stops at the first source**：没有 verification，citations 可能 hallucinated 或 stale
- **Evaporates**：答案滚走，下个人重新问
- **Guesses the question**：bare link 被理解成 “should we migrate to it”，而你可能只是想比较

## 方案

`ce-pov` 用 explicit gates 运行 disciplined evaluation：

- **Frame before grounding**：先 orient input，settle intent，绝不猜
- **Subject-aware grounding**：每个 POV 都需要 concrete project fact；当 external claim 会支撑 conclusion 时，必须有 external evidence
- **Skeptic stance**：寻找 disconfirming evidence，命名 alternatives；“no” 和 “not our problem” 是 first-class
- **Reversibility-tiered effort**：one-way door 需要 full workup；可逆的 `npm i` 只需 one screen
- **可选 different-model panel**：named peers 与 `oracle` 可 cross-check POV；material dissent 进入 bounded debate，而不是投票
- **Reasoned handoff**：下一步从 verdict 计算，不是假设

---

## 新颖之处

### 1. Dual-grounding as two absolute floors

每个 POV 都必须通过 **project floor**：与 decision 或 take 相关的 verified project fact。Adoption question 还需要 verified external source；document 与 approach subject 只有在 external claim 会实质支撑 bottom line 时才需要。Adoption floor 失败时返回现有 `Hold` subtype；document/approach floor 失败时返回显式 `Blocked`，而不是 confident guess。

### 2. Intake framing gate：propose, never guess

在任何 grounding 前，skill 会先 orient 你给的东西（bare link 会 fetch 以了解它是什么，topic 会被识别），并 settle **POV intent**：adopt、migrate、compare、is-this-our-problem，或 just-an-explainer。清晰输入得到一行 inferred frame；模糊输入得到 proposed framings 供确认。纯 explainer 会作为 general research question 回答，绝不会被强行变成 verdict。这防止 skill grounding 错问题。

### 3. Project grounding a generic tool can't do

差异点是读取 *你的* project：dependency manifests 和 lockfiles、license compatibility、incumbent 和 call-sites、conventions、git history、Issue tracker、PRs（descriptions 和 comments，绝不读 diffs）。它也会浮现 **prior decisions**（`docs/solutions/`、ADRs、closed issues、abandoned PRs），避免 verdict 重复争论 team 已经 settled 的事。Project grounding 对非代码 project folder（docs、decks、data）也有效；唯一 out of scope 是完全没有 local context。

### 4. Scout-based grounding keeps the verdict context clean

Grounding 在 **scout sub-agents** 中运行，它们在自己的 context 中搜索，并返回 compact dossier + gist；orchestrator 按需读取 dossiers，在干净 context 中推理 verdict。这避免 noisy issue/PR/code search 挤掉 judgment。Dispatch 会按 tier 缩放：可逆 Tier-1 call 用 single combined pass；full fleet 保留给 one-way decisions。

### 5. Cold and warm invocation：one method

可以 cold run（你提出 question），也可以 warm run（在 live session 中插入 `/ce-pov` 要 second opinion）。Warm mode 中，conversation 只提供 *question and claims to verify*，绝不提供 grounding。**Provenance buckets** 会把 “chat assumed” 与 verified facts 分开，避免二十轮 mutual assumption 静默变成 “grounding”。Warm mode 是 guest：给出 POV block，然后交还控制权；只有用户显式请求时才运行 peers。

### 6. Reversibility-tiered effort：no ritual on reversible calls

Skill 会将 decision 分类为 one-way 或 two-way door，并按此调整 effort。可逆 dependency 得到 one-screen verdict 且没有 reversal trigger；data store、auth provider 或 migration 得到 deep workup。Reversibility classification 会被明说，因此 shallow verdict 是 defensible，而不是 lazy。

### 7. Shape-specific output contracts

Adoption verdict 保留同一套五级 grades（Adopt / Trial / Hold / Reject / Not-our-problem）和固定 schema。Document take 以 bottom line、strengths 与 risks 开头。Approach-set position 会选择并解释一个 supplied option；如果两者都可行，则明确说明 “Either is viable” 及 material tradeoffs，而不是强行用 scoreboard 选 winner。

### 8. Independent、bounded cross-model panels

Peer 永远不会取代 ce-pov 自己的 judgment。可以指定一个或多个 providers 直接 cross-check，用普通语言要求其他 models 提供 independent opinions，使用 `oracle` 作为 shorthand fan out 到最多两个可达的 different-model peers，或在 correction cost 明显的 decision 上接受 proactive offer。Named peers 会被精确遵守且不受数量上限约束。Skill 会说明 selected peers 并以 read-only 方式继续；只有 retry 引入意外 recipient/intermediary，或 active instruction 要求单独批准时才会询问。

Peers 会直接检查 shared working tree。Project 中已有 proposal 或 document 时，ce-pov 会把 peer 指向它，不再构建重复 review packets。Initial independent round 包含 subject，但不透露 ce-pov 的 conclusion 或其他 voice 的 judgment；若请求 critique 某个 position，该 position 本身就是 subject，因此会提供给 peer。

When voices materially disagree, they get up to two reconciliation exchanges by default — so a full default run is **up to three exchanges total**: one blind independent round plus at most two reconciliations. Before each exchange ce-pov verifies disputed, decision-changing project claims and gives every voice the same evidence delta (`verified`, `contradicted`, or `unverifiable`) plus the already-formed positions. Each peer reports whether it `moved` or `held`. A user-supplied pass or round limit overrides the default.

**Why two, and not five.** Three total exchanges is where debate stops paying: cross-model agreement converges within two to three rounds, and past that the marginal accuracy gain flattens or reverses while cost and latency keep climbing. Extra rounds also make the panel *worse* at its actual job — models with correlated training tend to converge on each other rather than on new evidence, so a high round count mostly manufactures agreement that reads as confidence. Most runs never reach the cap anyway: convergence is ce-pov's reasoned confidence, not a vote tally, so a run ends the moment the POV is settled or every peer holds.

**The cap is a checkpoint, not a ceiling.** Two bounds *automatic* spend; it does not bound the debate. At the effective limit, automatic dispatch stops and ce-pov exposes the convergence or stalemate. It recommends a specific bounded extension only when it can name the unresolved question, new evidence or framing, and why another exchange could move a position; continuing requires user approval unless a larger limit was supplied in advance. That way the rare decision that genuinely needs a fourth exchange can reach one by reasoning, instead of every routine run pre-paying for it. ce-pov remains the decision-maker, not a vote counter, and a failed or timed-out peer never blocks the solo POV.

### 9. Reasoned, tier-gated follow-up

默认 chat verdict 是 compact TL;DR。Follow-up 从 verdict 推导：`Adopt` 提议 `/ce-plan`（scope 模糊则 `/ce-brainstorm`），`Trial` 提议 spike，`Reject` 结束。你也可以要求完整 shareable write-up（默认 HTML，本地打开或发布），或通过 `/ce-compound` 将 decision 捕获到 `docs/solutions/`；这些都是 opt-in，trivial verdicts 只给 one-line prose offer，而不是 menu。

---

## 快速示例

你贴了一个新 auth service 的 link。因为 intent ambiguous，skill 先 fetch link，发现它是 passkeys provider，然后提出 framing：adopt passkeys、migrate auth to them，还是 compare them to our current sign-in？你选择 “adopt”。

它把 decision 分类为 one-way door（auth 很难 reverse），所以运行 full scout fleet：project-grounding scout 发现当前使用 password + email，auth code 集中在一个 module；precedent scout 没找到 prior decision；external researcher 验证 passkey maturity 和 migration pitfalls。每个 scout 返回 dossier；orchestrator 在 clean context 中阅读。

两个 floors 都通过。Skill 返回 `Trial`：“可以，如果先在 internal admin app pilot”，并附上 conditions、reversal trigger（“如果 enterprise SSO 变成 requirement，则重新评估”）和 proposed next step。它提供把 decision 带入 `/ce-plan`，或写完整 shareable case。你选择进入 `/ce-plan`，并用 verdict seed 它。

---

## 何时使用

Reach for `ce-pov` when:

- 你看到一个 framework、library 或 pattern，想知道它是否适合 *你的* project
- 你正在权衡是否从现有东西 migration away
- 你需要在一组 bounded real options 中选择（例如 “what should we use for feature flags?”）
- CVE 或 deprecation 出现，需要判断这是不是 *你的* problem
- 你想 revisit past decision（“we passed on X last year，still right?”）
- 你想对 plan、spec 或 brainstorm 得到 holistic take，而不是 issue list
- 你提供了 competing approaches，希望得到 project-grounded choice 或诚实 tradeoff
- 你希望 named different-model peers 或 `oracle` cross-check ce-pov 的判断
- 你在 brainstorm 中，想对 direction 做 grounded second opinion

Skip `ce-pov` when:

- 你只想理解一个 topic，且没有 project angle -> general research（这不是 verdict）
- 你想从 blank slate 生成 options -> 用 ideas sibling `/ce-ideate`
- 你需要 document 的 findings 或逐 issue review -> `/ce-doc-review`
- 你已经决定了，只想 scope 或 build -> `/ce-brainstorm` 或 `/ce-plan`
- 你在诊断 broken behavior -> `/ce-debug`

---

## 放在 workflow 中使用

`ce-pov` 位于 build loop 上游，并向其供给：

- **Routes into `/ce-plan`**：accepted `Adopt` 且 scope 清楚时 hand off 到 planning，并用 verdict seed
- **Routes into `/ce-brainstorm`**：当 “adopt” 没 pin down，或 selection field 过于开放时，先 Hold 并 route 到 brainstorm/ideate，再 offer re-run
- **Routed into from `/ce-brainstorm`**：当 brainstorm request（或 mid-brainstorm turn）实际是针对特定 external candidate 的 *whether-to-adopt* verdict，`ce-brainstorm` 会 offer handoff 到这里
- **Captures into `/ce-compound`**：按需将 weighty verdict 存入 `docs/solutions/`，作为 `tooling_decision` / `architecture_pattern` record，让后续 precedent check 能找到
- **Mid-session second opinion**：在任何 skill session 中插入它，用于 pressure-test direction，而不接管 session

---

## 单独使用

顶部示例覆盖了主要 subject shapes 和 panel routes。其他实用 prompts 包括 migration decision、bounded technology selection、CVE exposure、重新审视过去的 decision，以及 Cursor-default cross-check。

---

## Reference

| Argument | Effect |
|----------|--------|
| _(empty, mid-session)_ | Warm second opinion；从 conversation 推断 question 并确认 |
| `<a question>` | Cold evaluation，例如 “should we adopt X?”、“does this CVE affect us?” |
| `<a bare link>` | 先 orient link，再提出 candidate framings，之后才 grounding |
| `<a selection question>` | 从 bounded field 中选择；若 field 无法 bound，route 到 `/ce-ideate` |
| `<a document or supplied approach set>` | 返回 holistic take，或以该 subject 的形状给出 project-grounded position |
| `compare/cross-check with <peers>` | 先形成 ce-pov 自己的 POV，再咨询每个 named peer |
| `oracle` | 先用最多两个可达的 different-model peers 进行 blind initial cross-check，必要时再做 bounded evidence-based reconciliation |

### Peer target names

Target names distinguish models from harnesses, and are intentionally not aliases for each other:

| Name | Resolves to |
|------|-------------|
| `Cursor` | `cursor-agent` using its configured default/Auto model |
| `Composer` | A Composer model through Cursor |
| `Grok` | The Grok CLI preferred; a sanctioned Grok-via-Cursor route otherwise |

Cursor Auto is labeled unverified unless a serving-model receipt exists, and without that proof it does not count as independent cross-model corroboration.

Concrete model IDs and CLI flags are preferred adapter defaults, not permanent product promises. If the landscape changes, ce-pov tries the declared mapping first, then may discover the closest compatible equivalent within the same requested target and hard safety/egress boundaries. It discloses the substitution and actual route; an explicitly named model or newly receiving intermediary never changes silently.

---

## FAQ

**它和一般 “deep research” tool 有什么不同？** 一般 research tool 抽象解释 topic。`ce-pov` 拒绝在没有引用 *你的* project 中 concrete fact 时发出 verdict；project floor 是全部重点。它以 decision 结束，而不是 report。

**为什么 floors 要理解 subject？** 只基于 web evidence 的 adoption verdict 是 abstract opinion；document take 则不需要 ceremonial web research，除非 external claim 真正支撑其 conclusion。Project floor 始终适用，external floor 在它可能改变答案时适用。

**它和 `ce-doc-review` 有什么不同？** “What do you think of this doc?” 使用 `ce-pov`，得到包含 strengths、risks 的 holistic bottom line；“review this doc” 或 “find the issues” 使用 `ce-doc-review`，得到 structured findings 与 remediation。

**Why only two reconciliation rounds — why not five?**
Because two is the cap on *automatic* spend, not on the debate. A default run is up to three exchanges (one blind independent round plus two reconciliations), which is where cross-model debate converges; beyond that the marginal gain flattens while cost, latency, and correlated-model false consensus all rise. Most runs stop earlier still, because ce-pov ends on reasoned confidence rather than a round count. When a decision genuinely needs more, the limit is a checkpoint: ce-pov proposes a bounded extension with the specific unresolved question it would answer, and you can supply a larger limit up front.

**Does it always write a document?**
No. The default is a compact chat POV. A full shareable write-up and a durable `ce-compound` capture are both opt-in — offered, never forced.

**它会一直追问 clarify 吗？** 只有 intent 真正 ambiguous 时，例如 bare link 或未说明 intent。清晰 question 得到一行 inferred frame 后直接继续。

**没有 code repo 可以用吗？** 可以，只要 project folder 有真实材料（docs、decks、data）可 grounding。唯一 out-of-scope 是完全没有 local context；那时它会要求 context，而不是给 generic advice。

---

## See Also

- [`ce-ideate`](./ce-ideate.md) — 从 blank slate 生成 options；`ce-pov` 判断一个 *given* external thing
- [`ce-brainstorm`](./ce-brainstorm.md) — 已经是 yes 后做 scope；`ce-pov` 决定 *whether*
- [`ce-plan`](./ce-plan.md) — verdict accepted 后的 build-side handoff
- [`ce-doc-review`](./ce-doc-review.md) — 为 document 产出 issue-shaped findings；`ce-pov` 给出 holistic take
- [`ce-debug`](./ce-debug.md) — 调查 *observed* broken behavior；`ce-pov` 判断 *exposure*（这个 CVE 是否影响我们）
- [`ce-compound`](./ce-compound.md) — 把 weighty verdict 捕获到 `docs/solutions/`，供 future precedent 使用
