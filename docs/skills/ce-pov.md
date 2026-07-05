# `ce-pov`

> 对外部输入形成 decisive、project-grounded point of view：根据 *这个* project 判断，而不是抽象评价，并返回 graded verdict。

`ce-pov` 是 **judgment** skill。你带来外部世界中的东西：正在权衡的 framework、library、pattern、CVE，或 “our approach dead?” 这类问题。它会为 *你的* project 给出 decisive、graded verdict：**Adopt / Trial / Hold / Reject / Not-our-problem**。它不同于 generic web research，后者解释 topic；`ce-pov` 决定这个 topic 在 *这里* 意味着什么。

核心规则是 **dual-grounding**：没有 verdict 会在低于两个 absolute floors 时发出。一个是 **project floor**（引用 repo 中 concrete、verified fact），另一个是 **external floor**（至少一个 verified external source）。强 external evidence 不能补偿薄 project read，反过来也一样。这就是它和 bare “what's your POV on X?” prompt 的根本差异，后者往往抽象回答并顺从你的 framing。

它填补 exploring（`/ce-ideate`）、scoping（`/ce-brainstorm`）和 building（`/ce-plan`）之间的空隙：这些 skill 没有一个会 *evaluate a fixed external thing for fit*。当 `ce-pov` 得到 verdict，它会提出正确下一步：plan it、scope it、spike it，并可把 decision 作为 seed hand off。

---

## 摘要（TL;DR）

| Question | Answer |
|----------|--------|
| 它做什么？ | Research external input，并基于你的 repo grounding，返回 graded、conditional verdict 和 recommended next step |
| 何时使用？ | “Should we adopt/migrate to X?”、“what should we use for Y?”、“does this CVE affect us?”、“is our approach still right?”，或 mid-session second opinion |
| 产出什么？ | Compact chat verdict（grade + conditions + next step）；可选 shareable write-up 或 captured decision record |
| 下一步 | 从 verdict 推导出的 reasoned handoff：`/ce-plan`、`/ce-brainstorm` 或 spike，而不是预设 |

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
- **Dual-grounding floors**：verdict 必须同时引用 verified external evidence 和 concrete project fact
- **Skeptic stance**：寻找 disconfirming evidence，命名 alternatives；“no” 和 “not our problem” 是 first-class
- **Reversibility-tiered effort**：one-way door 需要 full workup；可逆的 `npm i` 只需 one screen
- **Reasoned handoff**：下一步从 verdict 计算，不是假设

---

## 新颖之处

### 1. Dual-grounding as two absolute floors

Verdict 必须通过 **project floor**（named incumbent + concrete touchpoint、已验证不存在 incumbent 但存在 integration point，或 prior decision）和 **external floor**（至少一个 verified external source）。两个 floors 独立：强 external evidence 救不了薄 project read；丰富 repo read 也不能替代 verified external facts。任一 floor 失败时，skill 返回对应 `Hold` subtype，而不是 confident guess。

### 2. Intake framing gate：propose, never guess

在任何 grounding 前，skill 会先 orient 你给的东西（bare link 会 fetch 以了解它是什么，topic 会被识别），并 settle **POV intent**：adopt、migrate、compare、is-this-our-problem，或 just-an-explainer。清晰输入得到一行 inferred frame；模糊输入得到 proposed framings 供确认。纯 explainer 会作为 general research question 回答，绝不会被强行变成 verdict。这防止 skill grounding 错问题。

### 3. Project grounding a generic tool can't do

差异点是读取 *你的* project：dependency manifests 和 lockfiles、license compatibility、incumbent 和 call-sites、conventions、git history、Issue tracker、PRs（descriptions 和 comments，绝不读 diffs）。它也会浮现 **prior decisions**（`docs/solutions/`、ADRs、closed issues、abandoned PRs），避免 verdict 重复争论 team 已经 settled 的事。Project grounding 对非代码 project folder（docs、decks、data）也有效；唯一 out of scope 是完全没有 local context。

### 4. Scout-based grounding keeps the verdict context clean

Grounding 在 **scout sub-agents** 中运行，它们在自己的 context 中搜索，并返回 compact dossier + gist；orchestrator 按需读取 dossiers，在干净 context 中推理 verdict。这避免 noisy issue/PR/code search 挤掉 judgment。Dispatch 会按 tier 缩放：可逆 Tier-1 call 用 single combined pass；full fleet 保留给 one-way decisions。

### 5. Cold and warm invocation：one method

可以 cold run（你提出 question），也可以 warm run（在 live session 中插入 `/ce-pov` 要 second opinion）。Warm mode 中，conversation 只提供 *question and claims to verify*，绝不提供 grounding。**Provenance buckets** 会把 “chat assumed” 与 verified facts 分开，避免二十轮 mutual assumption 静默变成 “grounding”。Warm mode 是 guest：给出 verdict block，然后交还控制权。

### 6. Reversibility-tiered effort：no ritual on reversible calls

Skill 会将 decision 分类为 one-way 或 two-way door，并按此调整 effort。可逆 dependency 得到 one-screen verdict 且没有 reversal trigger；data store、auth provider 或 migration 得到 deep workup。Reversibility classification 会被明说，因此 shallow verdict 是 defensible，而不是 lazy。

### 7. Fixed, graded verdict vocabulary

每个 verdict 使用同一套五级 grades（Adopt / Trial / Hold / Reject / Not-our-problem）和固定 schema（grade、incumbent、verified facts、conditions、handoff，以及 weighty calls 的 reversal trigger）。`Hold` 是完整有效的 “wait” decision，不是失败。固定形状让 verdicts 可比较，也让后续 run 找到 prior decision。

### 8. Reasoned, tier-gated follow-up

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
- 你在 brainstorm 中，想对 direction 做 grounded second opinion

Skip `ce-pov` when:

- 你只想理解一个 topic，且没有 project angle -> general research（这不是 verdict）
- 你想从 blank slate 生成 options -> 用 ideas sibling `/ce-ideate`
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

- **Adoption**：`/ce-pov should we adopt Drizzle ORM here?`
- **Migration**：`/ce-pov should we migrate off Moment to Temporal?`
- **Selection**：`/ce-pov what should we use for feature flags?`
- **Comparison**：`/ce-pov how does Biome compare to our ESLint + Prettier setup?`
- **Exposure**：`/ce-pov does CVE-2026-1234 in tar affect us?`
- **Revisit**：`/ce-pov we passed on tRPC last year — still the right call?`
- **Bare link**：只贴 URL；intake gate 会提出 framings
- **Warm**：在 brainstorm 中输入 `/ce-pov` 要 second opinion

---

## Reference

| Argument | Effect |
|----------|--------|
| _(empty, mid-session)_ | Warm second opinion；从 conversation 推断 question 并确认 |
| `<a question>` | Cold evaluation，例如 “should we adopt X?”、“does this CVE affect us?” |
| `<a bare link>` | 先 orient link，再提出 candidate framings，之后才 grounding |
| `<a selection question>` | 从 bounded field 中选择；若 field 无法 bound，route 到 `/ce-ideate` |

---

## FAQ

**它和一般 “deep research” tool 有什么不同？** 一般 research tool 抽象解释 topic。`ce-pov` 拒绝在没有引用 *你的* project 中 concrete fact 时发出 verdict；project floor 是全部重点。它以 decision 结束，而不是 report。

**为什么需要两个 floors？** 只基于 web evidence 的 verdict 是 abstract opinion；只基于 repo read 的 verdict 是 uninformed。二者都要求，能防止 skill 自信推荐一个没有真正对照代码评估过的东西，也防止把薄读数包装成 “lowered confidence”。

**它总会写文档吗？** 不。默认是 compact chat verdict。完整 shareable write-up 和 durable `ce-compound` capture 都是 opt-in：提供，但不强迫。

**它会一直追问 clarify 吗？** 只有 intent 真正 ambiguous 时，例如 bare link 或未说明 intent。清晰 question 得到一行 inferred frame 后直接继续。

**没有 code repo 可以用吗？** 可以，只要 project folder 有真实材料（docs、decks、data）可 grounding。唯一 out-of-scope 是完全没有 local context；那时它会要求 context，而不是给 generic advice。

---

## See Also

- [`ce-ideate`](./ce-ideate.md) — 从 blank slate 生成 options；`ce-pov` 判断一个 *given* external thing
- [`ce-brainstorm`](./ce-brainstorm.md) — 已经是 yes 后做 scope；`ce-pov` 决定 *whether*
- [`ce-plan`](./ce-plan.md) — verdict accepted 后的 build-side handoff
- [`ce-debug`](./ce-debug.md) — 调查 *observed* broken behavior；`ce-pov` 判断 *exposure*（这个 CVE 是否影响我们）
- [`ce-compound`](./ce-compound.md) — 把 weighty verdict 捕获到 `docs/solutions/`，供 future precedent 使用
