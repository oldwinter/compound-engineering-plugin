---
name: ce-brainstorm
description: '通过 collaborative dialogue 探索 requirements 和 approaches，然后写一份 right-sized requirements document。当用户说 "let''s brainstorm"、"what should we build" 或 "help me think through X"，提出模糊或有野心的 feature request，或看起来不确定 scope 或 direction 时使用，即使没有明确要求 brainstorm。'
argument-hint: "[要探索的 feature idea 或 problem] [output:html]"
---

# Brainstorm a Feature or Improvement（头脑风暴 Feature 或 Improvement）

**Note：当前年份是 2026。** 给 requirements documents 标日期时使用此信息。

Brainstorming 通过 collaborative dialogue 帮助回答要构建 **WHAT**。它位于 `/ce-plan` 之前，后者回答如何构建 **HOW**。

此 workflow 的 durable output 是 **requirements document**。在其他 workflows 中，它可能被称为 lightweight PRD 或 feature brief。在 compound engineering 中，workflow name 保持为 `brainstorm`，但 written artifact 要足够强，使 planning 不需要发明 product behavior、scope boundaries 或 success criteria。

此 skill 不实现代码。它为后续 planning 或 execution 探索、澄清并记录 decisions。

**IMPORTANT：生成 documents 中的所有 file references 必须使用 repo-relative paths（例如 `src/models/user.rb`），绝不要使用 absolute paths。Absolute paths 会破坏跨 machines、worktrees 和 teammates 的 portability。**

## Core Principles（核心原则）

1. **先评估 scope** - 让 ceremony 数量匹配工作的 size 和 ambiguity。
2. **做思考伙伴** - 提出 alternatives、challenge assumptions、explore what-ifs，而不是只提取 requirements。
3. **在这里解决 product decisions** - User-facing behavior、scope boundaries 和 success criteria 属于此 workflow。Detailed implementation 属于 planning。
4. **默认不要把 implementation 写进 requirements doc** - 不要包含 libraries、schemas、endpoints、file layouts 或 code-level design，除非 brainstorm 本身天然就是 technical 或 architectural change。
5. **让 artifact 大小匹配问题** - 简单工作得到 compact requirements document 或 brief alignment。更大的工作得到更完整 document。不要添加对 planning 没帮助的 ceremony。
6. **把 YAGNI 应用于 carrying cost，而不是 coding effort** - 优先选择能交付 meaningful value 的最简单 approach。避免 speculative complexity 和 hypothetical future-proofing，但当 low-cost polish 或 delight 的 ongoing cost 小且易维护时，值得纳入。

## Interaction Rules（交互规则）

这些规则适用于每个 brainstorm，包括路由到 `references/universal-brainstorming.md` 的 universal（non-software）flow。

1. **一次只问一个问题** - 每轮一个问题，即使 sub-questions 看起来相关。单条消息堆叠多个问题会稀释回答；选择最有用的单个问题并提出。
2. **优先使用单选 multiple choice** - 选择一个 direction、priority 或 next step 时使用 single-select。
3. **谨慎且少量使用多选** - 只用于可以共存的 compatible sets，例如 goals、constraints、non-goals 或 success criteria。如果 prioritization 重要，follow up 询问所选项中哪一个是 primary。
4. **默认使用平台的 blocking question tool** - 使用 Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。这些工具包含 free-text fallback（例如 Claude Code 中的 "Other"），因此 options 会 scaffold answer 而不限制它：选得好的 options 能浮现用户可能尚未区分的 dimensions，而 pick-plus-optional-note 比从零写 prose 更低 activation energy。这个 default 也适用于 opening 和 elicitation questions，不只适用于 narrowing。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中的编号选项；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题。
5. **只有问题确实开放时才使用 open-ended question** - 只有在以下情况才放下 blocking tool：(a) answer 天然是 narrative（"walk me through how you got here"），(b) question 是 diagnostic 或 introspective，且呈现 options 会无意影响用户答案（例如 "what concerns you most?"：4-option menu 会把用户推向那些 axes，而不是他们脑中真实 axes），或 (c) 你无法写出 3-4 个 genuinely distinct、plausibly-correct、覆盖空间且不 padding/strawmen 的 options。测试方法：如果你费力填 option slots，这个 question 就是 open，问 open-ended。Rule 1 仍适用：仍然每轮一个问题。
6. **open-ended questions 必须具体到能引出实质答案** - 静默应用 Rule 5：直接问问题，不要叙述 form choice。问题本身必须给用户一个具体 anchor。Good：*"What's the most concrete thing someone's already done about this — paid for it, built a workaround, quit a tool over it?"*（这是 Phase 1.2 的 rigor probes 之一：它通过说明什么算答案，赢得 open-endedness）。Too thin：*"What's your take?"*（没有可咬合点；用户默认给一行回答，浪费 open question）。避免 (a) 叙述 form choice（"the most useful question I can ask here is..."），(b) 暗示短回答的 framing（"briefly"、"in one sentence"），(c) yes/no traps，以及 (d) AI-slop warmth wrappers（"take it wherever feels relevant"）。

## Output Guidance（输出指导）

- **Keep outputs concise** - 优先使用 short sections、brief bullets，以及足够支持下一个 decision 的 detail。
- **Use repo-relative paths** - 引用 files 时，使用相对 repo root 的 paths（例如 `src/models/user.rb`），绝不要使用 absolute paths。Absolute paths 会让 documents 无法跨 machines 和 teammates portable。

## Feature Description（Feature 描述）

<feature_description> #$ARGUMENTS </feature_description>

**如果上方 feature description 为空，询问用户：** "What would you like to explore? Please describe the feature, problem, or improvement you're thinking about."

在从用户获得 feature description 前，不要继续。

## Execution Flow（执行流程）

### Phase 0：Resume, Assess, and Route（恢复、评估与路由）

#### 0.0 Resolve Output Mode（解析输出模式）

在任何其他 phase 触发前确定 `OUTPUT_FORMAT`。Output mode 是 **exclusive**：requirements doc 要么写成 markdown（`.md`），要么写成 HTML（`.html`），绝不两者都写。优先级：CLI arg > config > default（`md`），并带 hard pipeline-mode override。

**Read config（skill load 时预解析）：**
!`cat "$(git rev-parse --show-toplevel 2>/dev/null)/.compound-engineering/config.local.yaml" 2>/dev/null || echo '__NO_CONFIG__'`

解析步骤：

1. **CLI arg。** 扫描 `$ARGUMENTS` 中以 literal prefix `output:` 开头的 token。如果找到，在把剩余内容当作 feature description 前将其剥离，并将其值与 `md` 和 `html` 做 case-insensitive 匹配。
   - 只有 `output:`（无值）→ no-op，fall through 到 step 2。
   - `output:<unknown>`（例如 `output:pdf`）→ drop 该 token，fall through 到 step 2，并记得在 final resolution 后、post-generation menu 上方输出一行 note：`Ignored unknown output: value '<value>' — using <resolved_format> instead.` 其中 `<resolved_format>` 是 steps 2-4 后 `OUTPUT_FORMAT` 实际解析出的值。不要在 note 中 hardcode `md`：当 config 已设置 HTML 时，这会误导用户。
2. **Config。** 如果 step 1 未解析，且上方预解析 YAML 有一个 **active（non-commented）** `brainstorm_output:` key，其值 case-insensitive 匹配 `md` 或 `html`，则使用它。Missing、invalid 或 commented values 静默 fall through。Critical：以 `#` 开头的 lines 是 YAML comments，必须忽略：shipped config template 包含 `# brainstorm_output: html` 这类 commented examples 用于记录 option，如果把它们匹配成 active settings，会在用户未 opt in 的情况下静默强制每次运行进入 HTML mode。
3. **Default。** 否则 `OUTPUT_FORMAT=md`。
4. **Pipeline override。** 当从 LFG 或任何 `disable-model-invocation` context 调用时，无论 steps 1-3 如何，都强制 `OUTPUT_FORMAT=md`。Downstream consumers（`ce-plan`、`ce-work`）能可靠解析 markdown；pipeline runs 中的 HTML 是不必要摩擦。

**Token-parsing convention：** 只消费并剥离 literal-prefix flag tokens（`output:`、`mode:`、适用时的 `delegate:`）。其他 `<word>:<word>` tokens，包括可能出现在 feature description 内的 conventional commit prefixes（`feat:`、`fix:`、`chore:`），都逐字保留。

**根据解析值加载 format-rendering reference。** 两种格式的 section content 相同，presentation 不同。两个 rendering references 都与 `references/brainstorm-sections.md` 配套，后者描述 brainstorm 无论格式如何都包含什么。

- 当 `OUTPUT_FORMAT=md`，读取 `references/markdown-rendering.md` 获取 format principles。
- 当 `OUTPUT_FORMAT=html`，读取 `references/html-rendering.md` 获取 format principles。

`output:` preference 不会在 handoff 时 auto-propagate 到 `ce-plan`：ce-plan 会独立重新解析自己的 `plan_output` config。Asymmetric output（`requirements.html` + `plan.md`）是可接受的；希望两者都是 HTML 的用户，需要在 `.compound-engineering/config.local.yaml` 中设置两个 keys。

#### 0.1 Resume Existing Work When Appropriate（适当时恢复现有工作）

如果用户引用 existing brainstorm topic 或 document，或 `docs/brainstorms/` 中有明显 recent matching 的 `*-requirements.{md,html}` 文件：
- 读取 document
- resume 前与用户确认："Found an existing requirements doc for [topic]. Should I continue from this, or start fresh?"
- 如果 resume，简要总结 current state，从其 existing decisions 和 outstanding questions 继续，并更新 existing document，而不是创建 duplicate
- **Resume 会保留 existing artifact 的 format，pipeline mode 除外。** 使用 existing artifact 的格式写回：existing file 是 `.md` 就写 markdown，是 `.html` 就写 HTML。本次运行中的显式 `output:` arguments 会 override（例如用 `output:md` resume 一个 `.html` doc 会把 artifact 切到 markdown）。Pipeline mode（LFG、任何 `disable-model-invocation` context）始终按 Phase 0.0 胜出：即使 resume existing `.html` brainstorm，pipeline runs 也会强制 `OUTPUT_FORMAT=md`，让 downstream automation 收到它期望的 markdown shape。resume 会在 parallel path 重写 markdown file，原始 `.html` 保持 untouched。

#### 0.1b Classify Task Domain（分类任务领域）

进入 Phase 0.2 前，分类这是否是 software task。关键问题是：**该任务是否涉及 building、modifying 或 architecting software？** 而不是它是否 *mentions* software topics。

**Software**（继续 Phase 0.2）-- 任务引用 code、repositories、APIs、databases，或要求 build/modify/debug/deploy software。

**Non-software brainstorming**（路由到 universal brainstorming）-- 必须同时满足两个条件：
- 上方 software signals 均不存在
- 任务描述的是用户想在 non-software domain 中 explore、decide 或 think through 的内容

**Neither**（直接回复，跳过所有 brainstorming phases）-- input 是 quick-help request、error message、factual question，或不需要 brainstorm 的 single-step task。

**如果检测到 non-software brainstorming：** 读取 `references/universal-brainstorming.md` 并使用其中 facilitation principles。跳过下方 Phases 0.2-4：上方 **Core Principles and Interaction Rules 仍原样适用**，包括 one-question-per-turn，以及默认使用平台 blocking question tool。

#### 0.2 Assess Whether Brainstorming Is Needed（评估是否需要 Brainstorming）

**Requirements 清晰的指标：**
- 已提供 specific acceptance criteria
- 引用了要遵循的 existing patterns
- 描述了 exact expected behavior
- constrained、well-defined scope（受约束且定义清楚的 scope）

**如果 requirements 已经清晰：**
保持交互简短。确认理解并呈现简洁 next-step options，而不是强行进入长 brainstorm。只有当 durable handoff 给 planning 或后续 review 有价值时，才写 short requirements document。完全跳过 Phase 1.1 和 1.2，直接进入 Phase 1.3 或以 announce-mode 进入 Phase 2.5（synthesis 仅为可见性输出，不做 blocking confirmation），然后进入 Phase 3。

#### 0.3 Assess Scope（评估 Scope）

使用 feature description 加 light repo scan 对工作分类：
- **Lightweight** - 小、well-bounded、low ambiguity
- **Standard** - 正常 feature 或 bounded refactor，有一些 decisions 需要做
- **Deep** - cross-cutting、strategic 或 highly ambiguous

如果 scope 不清楚，问一个 targeted question 来 disambiguate，然后继续。

**Deep sub-mode：feature vs product。** 对 Deep scope，还要分类 brainstorm 必须 establish product shape 还是 inherit 它：

- **Deep — feature**（默认）：existing product shape 锚定 decisions。Primary actors、core outcome、positioning 和 primary flows 已在 product 或 repo 中建立。brainstorm 在该 shape 内 extend 或 refine。
- **Deep — product**：brainstorm 必须 establish product shape，而不是 inherit 它。Primary actors、core outcome、相对 adjacent products 的 positioning，或 primary end-to-end flows 存在实质 unresolved。Existing code 会降低 product-tier 的可能性，但本身不能排除它：一个 shape 模糊的半成品 tool 仍是 product-tier。

Product-tier 会触发额外 Phase 1.2 questions 和 requirements document 中的额外 sections。Feature-tier 使用当前 Deep behavior，不变。

### Phase 1：Understand the Idea（理解想法）

#### 1.1 Existing Context Scan（现有 Context 扫描）

在 substantive brainstorming 前扫描 repo。让 depth 匹配 scope：

**Lightweight（轻量）** — 搜索 topic，检查是否已存在类似内容，然后继续。

**Standard and Deep（标准和深度）** — 两轮：

*Constraint Check（约束检查）* — 检查 project instruction files（`AGENTS.md`，以及仅当作为 compatibility context 保留时的 `CLAUDE.md`），寻找会影响 brainstorm 的 workflow、product 或 scope constraints。如果存在，也读取 `STRATEGY.md`：产品的 target problem、approach、persona 和 active tracks 是此 brainstorm 应交付内容的直接输入，并应塑造 scope、success criteria，以及哪些 approaches aligned 或 out-of-scope。如果 repo root 存在 `CONCEPTS.md`，也读取它：这是项目的 authoritative vocabulary。在 dialogue、approaches 和 requirements doc 中使用这些名称；将用户提供的 synonyms 映射回来。如果其中任何文件没有增量，继续。

*Topic Scan（主题扫描）* — 搜索 relevant terms。如果存在最 relevant existing artifact（brainstorm、plan、spec、skill、feature doc），读取它。浏览覆盖类似 behavior 的 adjacent examples。

如果短扫描后没有明显发现，说明这一点并继续。扫描期间有两条规则管理 technical depth：

1. **Verify before claiming** — 当 brainstorm 触及可检查 infrastructure（database tables、routes、config files、dependencies、model definitions）时，读取相关 source files 确认实际存在什么。任何关于某物不存在的 claim（missing table、不存在的 endpoint、不在 Gemfile 中的 dependency、当前不支持的 config option）都必须先 against codebase 验证；如果未验证，标记为 unverified assumption。这适用于任何 topic 的每个 brainstorm。

2. **Defer design decisions to planning** — schemas、migration strategies、endpoint structure 或 deployment topology 等 implementation details 属于 planning，不属于这里；除非 brainstorm 本身就是关于 technical 或 architectural decision，在这种情况下这些 details 是 brainstorm 的 subject，应被探索。

**Slack context**（opt-in，仅 Standard 和 Deep）— 绝不 auto-dispatch。按 condition 路由：

- **Tools available + user asked**：在 Phase 1.1 work 同时，带 brainstorm topic 的 brief summary 派发 `ce-slack-researcher`。将 findings 纳入 constraint 和 context awareness。
- **Tools available + user didn't ask**：在 output 中注明："Slack tools detected. Ask me to search Slack for organizational context at any point, or include it in your next prompt."
- **No tools + user asked**：在 output 中注明："Slack context was requested but no Slack tools are available. Install and authenticate the Slack plugin to enable organizational context search."

#### 1.2 Product Pressure Test（产品压力测试）

生成 approaches 前，扫描用户 opening 中的 rigor gaps。让 depth 匹配 scope。

这是 agent-internal analysis，不是 user-facing checklist。阅读 opening，记录哪些 gaps 实际存在，并只在 Phase 1.3 将这些 gaps 作为问题提出：折入正常 dialogue flow，而不是作为 pre-flight gauntlet 发射。模糊 opening 可能值得三四个 probes；具体、well-framed 的 opening 可能一个都不需要，因为没有发现 scope-appropriate gaps。

**Lightweight（轻量）：**
- 这是否在解决真实 user problem？
- 我们是否在重复已有覆盖？
- 是否存在几乎零 extra cost 且明显更好的 framing？

**Standard — 扫描这些 gaps：**

- **Evidence gap。** opening 声称 want 或 need，但没有指出 would-be user 已经做过的任何事情：投入时间、付费、构建 workaround 等能让 want 可观察的证据。存在时，询问某人已经为此做过的最具体事情。

- **Specificity gap。** opening 对 beneficiary 的描述过于抽象，以至于 agent 若不静默发明他们是谁以及这会如何改变他们，就无法设计。存在时，请用户命名一个 specific person 或 narrow segment，以及 ship 后对这个人有什么变化。

- **Counterfactual gap。** opening 没有让用户今天遇到这个问题时做什么变得可见，也没有说明如果什么都不 ship 会有什么变化。存在时，询问 current workaround 是什么，即使它很乱，以及它的成本。

- **Attachment gap。** opening 把某个 particular solution shape 当成要构建的东西，而不是该 shape 应交付的 value，且没有与可能交付同等 value 的更小 forms 对照。存在时，询问仍能交付真实 value 的最小版本是什么样。

再加上这些 synthesis questions：它们不是 gap lenses，而是 agent 在自身 reasoning 中权衡的 product-judgment：
- 是否有 nearby framing 能在不增加 carrying cost 的情况下创造更多 user value？如果有，它增加了什么 complexity？
- 给定当前 project state、user goal 和 constraints，现在 single highest-leverage move 是什么：按原 request 做、reframing、一个 adjacent addition、simplification，还是不做？

优先选择能 compound value、降低 future carrying cost，或让产品显著更有用/更有吸引力的 moves。用结果 sharpen conversation，而不是 bulldoze 用户 intent。

**Deep** — Standard lenses 和 synthesis questions 之外再加：
- 这是 local patch，还是推动 broader system 走向它想成为的方向？

**Deep — product** — Deep 之外再加：

- **Durability gap。** opening 的 value proposition 建立在一种 current state of the world 上，而这种状态可能在用户关心的 horizon 内以可预测方式变化。存在时，询问这个 idea 在最可能 near-term shifts 下表现如何，并推动超越每个 competitor 都能说的 rising-tide answers。

- 我们可能意外构建成什么 adjacent product，为什么那是错的？
- 世界中什么必须为真，这件事才会失败？

这些问题会迫使 explicit product thesis，并供给 requirements document 中的 Scope Boundaries subsections（"Deferred for later" 和 "Outside this product's identity"）以及 Dependencies / Assumptions。

#### 1.3 Collaborative Dialogue（协作对话）

遵循上方 Interaction Rules。可用时使用平台的 blocking question tool。

**Guidelines（指导原则）：**
- 在提供自己的 ideas 前，先问用户已经在想什么。这会浮现 hidden context，并防止固定在 AI-generated framings 上。
- 从 broad 开始（problem、users、value），再 narrow（constraints、exclusions、edge cases）
- **Rigor probes 在 Phase 2 前触发，并且是 open-ended，不是 menus。** Narrowing 是正当的，但 Phase 1 不能带着未 probe 的 rigor gaps 结束。Phase 1.2 中每个 scope-appropriate gap 都作为 **separate** direct open-ended probe 触发：一个 probe 满足一个 gap，不满足多个。Standard brainstorms 扫描四个 gap lenses（evidence、specificity、counterfactual、attachment）；Deep-product 增加 durability（共五个），但只有 opening 中实际存在的 gaps 必须被 probe。把这些 probes 渐进地放进 conversation：可以与 narrowing moves 交错，只要 Phase 1.2 中发现的每个 scope-appropriate gap 都在 Phase 2 前被 open-ended probe。Rigor probes 映射到 Interaction Rule 5(b)：4-option menu 会暗示哪些 evidence 算数，并让用户 pick 而不是 produce。Open-ended questions 会迫使他们 produce 真实 observation 或显露 uncertainty。Examples（每个 gap 一个）：*evidence — "What's the most concrete thing someone's already done about this — paid, built a workaround, quit a tool over it?"* / *specificity — "Can you name a team you've actually watched hit this, or are you reasoning?"* / *counterfactual — "What do teams do today when this breaks — who reconciles?"* / *attachment — "Before we move to shapes or approaches — what's the smallest version that would still prove the bet right, and what's excluded?"* — **当 attachment gap 存在时，attachment 是 Phase 2 前的 final rigor probe。无论通过 narrowing 是否已经出现 specific shape，都要触发它；它的工作是在 Phase 2 继承用户 implicit framing 前 pressure-test 它** / *durability — "Under the most plausible near-term shifts, how does this bet hold?"* 如果答案揭示 genuine uncertainty，将其作为 requirements document 中的 explicit assumption 记录，而不是跳过 probe。
- 澄清 problem frame、validate assumptions，并询问 success criteria
- 让 requirements 足够具体，使 planning 不需要发明 behavior
- 只有当 dependencies 或 prerequisites materially affect scope 时才呈现它们
- 在这里 resolve product decisions；把 technical implementation choices 留给 planning
- 带来 ideas、alternatives 和 challenges，而不只是 interviewing

**Before exiting Phase 1.3：integration check。** 在脑中组合用户目前所说内容，并浮现 dialogue 尚未 probe 的任何 non-obvious consequences。如果 user-stated X 加 user-stated Y 加 your-default-Z 会产生用户不太可能通过 one-question-at-a-time dialogue 跟踪到的 downstream effect（"if mute lives on the rule AND we don't warn on delete, then rule-delete silently loses pause state"），趁仍在 dialogue 中现在 probe。每个 genuine combination effect 一个 probe，open-ended 提问，纪律同 rigor probes。Phase 2.5 的 call-outs 是 residuals 的安全网（silent agent inferences、无 dialogue 的 pre-loaded contexts），不是把现在本可以询问的 consequences 推后的 punt list。

**Exit condition：** 持续到 idea 清晰且没有 pending integration-check questions，或用户明确想继续。

### Phase 2：Explore Approaches（探索方案）

如果仍有多个 plausible directions，基于 research 和 conversation 提出 **2-3 个 concrete approaches**。否则直接说明 recommended direction。

至少使用一个 non-obvious angle：inversion（what if we did the opposite?）、constraint removal（what if X weren't a limitation?），或借鉴 another domain 如何解决它。最先想到的 approaches 通常只是同一轴线上的 variations。

先呈现 approaches，再 evaluate。让用户先看到所有 options，再听推荐哪一个：在用户看到 alternatives 前就先给 recommendation，会过早 anchor conversation。

有用时，包含一个刻意的 higher-upside alternative：
- 识别哪个 adjacent addition 或 reframing 最能提高 usefulness、compounding value 或 durability，且不带来 disproportionate carrying cost。将其作为 challenger option 与 baseline 并列呈现，而不是默认项。当工作已明显 over-scoped，或 baseline request 明显是正确 move 时省略。

在 product tier，alternatives 应在构建 *what* 上不同（product shape、actor set、positioning），而不是构建 *how* 不同。Implementation-variant alternatives 属于 feature tier。

对每个 approach，提供：
- Brief description（2-3 句）
- Pros and cons（优缺点）
- Key risks 或 unknowns（关键风险或未知项）
- 何时最适合

**Approach granularity：mechanism / product shape，而不是 architecture。** Approach descriptions 命名 mechanism-level distinctions（"pause as a rule property" vs "pause as an event filter" vs "pause as a separate entity"）和 product-relevant trade-offs（plan-tier coupling、complexity surface、migration difficulty）。它们 do NOT 命名 implementation specifics：column names、table names、file paths、service classes、JSON shapes、exact method names。这些是 ce-plan 的工作。Brainstorm 时把 architecture 提前，会迫使用户基于 ce-brainstorm 刻意浅层的 research 做 architectural decisions，而 Phase 2.5 的 synthesis 随后还必须过滤这些泄漏。

呈现所有 approaches 后，说明你的 recommendation 并解释原因。当 added complexity 创造 real carrying cost 时，偏好更简单 solutions；但不要仅因某个 low-cost、high-value polish 并非严格必要就拒绝它。

如果某个 approach 明显最佳且 alternatives 没有意义，跳过 menu 并直接说明 recommendation。

如果 relevant，指出该选择是：
- Reuse an existing pattern（复用既有 pattern）
- Extend an existing capability（扩展既有 capability）
- Build something net new（构建全新内容）

### Phase 2.5：Synthesis Summary（综合摘要）

**STOP。在 composing synthesis 前，读取 `references/synthesis-summary.md`。** two-stage shape（internal three-bucket draft → chat-time scoping synthesis）、Path A / Path B gate、带 keep tests 的四个 scoping synthesis sections、带 re-cut rule 的 tier-aware bullet budget、anti-pattern guidance、soft-cut behavior、self-redirect support，以及 internal-draft routing into doc body sections 都在那里。未加载这些规则就 compose synthesis，会稳定产生 malformed output：把完整 internal three-bucket draft 原样粘到 chat、implementation-detail 泄漏进 scoping synthesis、proposal-pitch anti-pattern。**每个 scoping synthesis bullet 必须通过 affirmability test（用户不读代码能否评估？）和 detail test（最多 1-2 行，conversational 而非 documentary）；over-share 和 over-detail 是要避免的 failure modes。** 这不是可选 supplementary reading；它是该 phase 行为的 source of truth。

在 Phase 3 写 requirements doc 前，向用户呈现 scoping synthesis：这是 artifact 落地前用户最后一次纠正 scope 的机会。scoping synthesis 的形状应像两个 product collaborators 在写 PRD 前会确认的内容，而不是 comprehensive audit 或 one-line preview。

对包括 Lightweight 在内的 **all tiers** 触发。在 Phase 0.1b non-software（universal-brainstorming）路线中完全跳过 Phase 2.5。

**Path A vs Path B：** scoping synthesis shape 依赖两个 signals：是否有 blocking question fired，以及 Phase 0.3 将 scope 分类为什么 tier。

- **Path A — no blocking questions fired AND tier is Lightweight**：announce-mode。只输出 "What we're building" prose（1-3 句），然后在同一 turn 进入 Phase 3 doc-write。无其他 sections，无 confirmation question。Do NOT 结束 turn 等待 acknowledgement。如果 shape 错了，用户可以在 doc 落地后修改：Lightweight Path A docs 很短，post-hoc revision 成本低。
- **Path B — at least one blocking question fired，OR tier is Standard / Deep-feature / Deep-product**：带 confirmation gate 的 full tier-aware scoping synthesis。两种场景触发 Path B：(a) 用户在 dialogue 中投入了 answer-time，或 (b) 用户预先加载了 substantive scope content（Phase 0.2 fast-path 带 richly-specified opening prompt）。无论哪种，substance 都值得一个真正 checkpoint。即使 zero call-outs 通过 keep test，confirmation 也 unconditional。

**Why the tier guard on Path A**：Phase 0.2 的 fast path 服务两种非常不同的情况：不需要 dialogue 的紧凑 one-liner（"fix the typo on line 47"），以及因为用户预先说明了一切、同样不需要 dialogue 的 richly pre-loaded brainstorm context。没有 tier guard，两者都会路由到 Path A，而 pre-loaded 情况可能有 20+ 项 scope，却只得到 1-sentence checkpoint。Phase 0.3 的 tier-classifying 区分二者：pre-loaded substance 会让 tier 变成 Standard 或 Deep，然后路由到 Path B。

### Phase 3：Capture the Requirements（记录 Requirements）

只有当 conversation 产出值得保留的 durable decisions 时，才 write 或 update requirements document：criteria 和 bug-fix stress test 见 `references/brainstorm-sections.md` 的 "Decide whether a doc is warranted at all"。当用户只需要 brief alignment，且 decisions 可以直接流向 downstream（ce-plan、commit message、docs/solutions/）而不需要中间 brainstorm artifact 时，跳过 document creation。

当 doc 有必要时，用以下内容 compose：

- `references/brainstorm-sections.md` — section contract（outcomes、hard floor、include-when-material catalog、agency rules、ID conventions）。
- Phase 0.0 加载的 format-specific rendering reference（`markdown-rendering.md` 或 `html-rendering.md`）— resolved format 如何呈现 sections。

写入 `docs/brainstorms/YYYY-MM-DD-<topic>-requirements.<md|html>`：extension 跟随 `OUTPUT_FORMAT`。用 absolute path 确认，以便 reference 可点击。

#### Vocabulary Capture — after the requirements doc（Vocabulary 捕获，仅当 CONCEPTS.md 已存在）

**如果 repo root 不存在 `CONCEPTS.md`，完全跳过此步骤**：creation 由 ce-compound 和 ce-compound-refresh 拥有。

在 approaches、scope synthesis 和 requirements doc **之后** 运行此步骤：canonical term 常在这些地方被选择或纠正，因此在早期 dialogue 捕获会错过最终 resolved name。如果 `CONCEPTS.md` 存在，扫描完整 dialogue 和 requirements doc，寻找 **resolved** domain terms：conversation 主动固定了 precise local meaning 的 terms，而不是随口提到的 terms。**Resolved 表示 definition 已 settled，不是仍在 discussion。** 可能还会 revise 的 provisional terms 只留在 conversation 中。

对每个 resolved term：如果缺失，添加；如果已存在但出现了 new precision，refine；如果已一致，不操作。

**仅限具有 project-specific meaning 的 domain entities、named processes 和 status concepts。** 不包括 file paths、class names、function signatures 或 implementation decisions：`CONCEPTS.md` 是 glossary，不是 spec 或 catch-all。

遵循 existing entries 设置的 format。静默应用 edits。（如果 Phase 3 跳过 doc，仍对 resolved dialogue 运行此步骤。）

### Phase 4：Handoff（交接）

呈现 next-step options 并执行用户选择。读取 `references/handoff.md` 获取 option logic、dispatch instructions 和 closing summary format。
