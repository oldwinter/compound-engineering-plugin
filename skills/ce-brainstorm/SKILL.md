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
4. **默认使用平台的 blocking question tool** - 使用 Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。这些工具包含 free-text fallback（例如 Claude Code 中的 "Other"），因此 options 会 scaffold answer 而不限制它：选得好的 options 能浮现用户可能尚未区分的 dimensions，而 pick-plus-optional-note 比从零写 prose 更低 activation energy。这个 default 也适用于 opening 和 elicitation questions，不只适用于 narrowing。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中的编号选项；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题。**Exception — visual-probe gate：** 对 inherently-visual topic（Phase 0.3 tripwire），在提出第一个 shape/behavior/state/layout/flow/diagram decision 前，必须先单独提供 text-vs-visual offer；在普通聊天或 blocking tool 问题中嵌入 ASCII 或文字 mockup 不算满足该 offer。详见 Phase 1.3 gate。
5. **只有问题确实开放时才使用 open-ended question** - 只有在以下情况才放下 blocking tool：(a) answer 天然是 narrative（"walk me through how you got here"），(b) question 是 diagnostic 或 introspective，且呈现 options 会无意影响用户答案（例如 "what concerns you most?"：4-option menu 会把用户推向那些 axes，而不是他们脑中真实 axes），或 (c) 你无法写出 3-4 个 genuinely distinct、plausibly-correct、覆盖空间且不 padding/strawmen 的 options。测试方法：如果你费力填 option slots，这个 question 就是 open，问 open-ended。Rule 1 仍适用：仍然每轮一个问题。
6. **open-ended questions 必须具体到能引出实质答案** - 静默应用 Rule 5：直接问问题，不要叙述 form choice。问题本身必须给用户一个具体 anchor。Good：*"What's the most concrete thing someone's already done about this — paid for it, built a workaround, quit a tool over it?"*（它说明了什么算答案，赢得 open-endedness）。Too thin：*"What's your take?"*（没有可咬合点；暗示短回答的 framing，例如 "briefly" 和 yes/no 问法，会同样浪费 open question）。

## Output Guidance（输出指导）

- **Keep outputs concise** - 优先使用 short sections、brief bullets，以及足够支持下一个 decision 的 detail。
- **Use repo-relative paths** - 引用 files 时，使用相对 repo root 的 paths（例如 `src/models/user.rb`），绝不要使用 absolute paths。Absolute paths 会让 documents 无法跨 machines 和 teammates portable。

## Model Tiers（模型层级）

Sub-agent dispatch 按 task shape 分层，绝不 hardcode 某个 model name：

- **Extraction tier** — grounding scout：retrieval 和 quoting work。使用平台 cheapest capable model（Claude Code 中为 `model: "haiku"`；Codex 中为最快的 mini-class model；Antigravity 中为 flash-class）。"Capable" 是 spec 的一部分：当 repo 很大或 stack obscure 时，升级到 generation tier。
- **Generation tier** — claim verifier：evidence-driven mechanical verification。使用平台 mid-tier model（Claude Code 中为 `model: "sonnet"`；Codex 中为 standard tier）。
- **Ceiling tier** — dialogue 本身。Questions、approaches、synthesis 和 requirements doc 都在 main conversation 中使用 orchestrator 的模型运行；这些内容不 dispatch。

**Degradation rule。** 当平台的 subagent primitive 不支持 per-agent model selection 时，在 inherited model 上 dispatch scout 和 verifier，并保留它们的 read budgets 和 output caps：此时 cost control 来自 structure，而不是 tiering。当平台完全没有 subagent primitive 时，在 Phase 1.1 inline 完成 topic scan，但仍将 grounding dossier 写入 scratch path，因为 downstream consumers（Phase 2.6 verifier、ce-plan handoff）会接收该 path；并在 Phase 3 写入前以相同 budgets inline verify claims。

## Feature Description（Feature 描述）

<feature_description> #$ARGUMENTS </feature_description>

**如果上方 feature description 为空，询问用户：** "What would you like to explore? Please describe the feature, problem, or improvement you're thinking about."

在从用户获得 feature description 前，不要继续。

## Execution Flow（执行流程）

### Phase 0：Resume, Assess, and Route（恢复、评估与路由）

#### 0.0 Resolve Output Mode（解析输出模式）

在任何其他 phase 触发前确定 `OUTPUT_FORMAT`。Output mode 是 **exclusive**：requirements doc 要么写成 markdown（`.md`），要么写成 HTML（`.html`），绝不两者都写。优先级：CLI arg > config > default（`md`），并带 hard pipeline-mode override。

**Read config。** Repo root 在 skill load 时 pre-resolved：
!`git rev-parse --show-toplevel 2>/dev/null || true`

如果上方行是 absolute path，将其用作 `<repo-root>`。如果为空，或仍显示 backtick command string（non-Claude harness 没有运行 pre-resolution），则在 runtime 用 shell tool 运行 `git rev-parse --show-toplevel` 解析 `<repo-root>`。然后用 native file-read tool 读取 `<repo-root>/.compound-engineering/config.local.yaml`。如果 root 无法解析（不是 git repo）或文件不存在，fall through 到下方 defaults。

解析步骤：

1. **CLI arg。** 扫描 `$ARGUMENTS` 中以 literal prefix `output:` 开头的 token。如果找到，在把剩余内容当作 feature description 前将其剥离，并将其值与 `md` 和 `html` 做 case-insensitive 匹配。
   - 只有 `output:`（无值）→ no-op，fall through 到 step 2。
   - `output:<unknown>`（例如 `output:pdf`）→ drop 该 token，fall through 到 step 2，并记得在 final resolution 后、post-generation menu 上方输出一行 note：`Ignored unknown output: value '<value>' — using <resolved_format> instead.` 其中 `<resolved_format>` 是 steps 2-4 后 `OUTPUT_FORMAT` 实际解析出的值。不要在 note 中 hardcode `md`：当 config 已设置 HTML 时，这会误导用户。
2. **Config。** 如果 step 1 未解析，且上方读取的 config file 有一个 **active（non-commented）** `brainstorm_output:` key，其值 case-insensitive 匹配 `md` 或 `html`，则使用它。Missing、invalid 或 commented values 静默 fall through。Critical：以 `#` 开头的 lines 是 YAML comments，必须忽略：shipped config template 包含 `# brainstorm_output: html` 这类 commented examples 用于记录 option，如果把它们匹配成 active settings，会在用户未 opt in 的情况下静默强制每次运行进入 HTML mode。
3. **Default。** 否则 `OUTPUT_FORMAT=md`。
4. **Pipeline override。** 当从 LFG 或任何 `disable-model-invocation` context 调用时，无论 steps 1-3 如何，都强制 `OUTPUT_FORMAT=md`。Downstream consumers（`ce-plan`、`ce-work`）能可靠解析 markdown；pipeline runs 中的 HTML 是不必要摩擦。

**Token-parsing convention：** 只消费并剥离 literal-prefix flag tokens（`output:`、`mode:`、适用时的 `delegate:`）。其他 `<word>:<word>` tokens，包括可能出现在 feature description 内的 conventional commit prefixes（`feat:`、`fix:`、`chore:`），都逐字保留。

**在这里 resolve format；到 Phase 3 再加载 rendering reference，而不是现在加载。** Format-rendering reference（`md` 使用 `references/markdown-rendering.md`，`html` 使用 `references/html-rendering.md`）只在 compose doc 时消费。Phase 0 就加载会让 200+ 行内容贯穿整个 dialogue。Phase 3 会命名加载时机。两种格式的 section content 相同，presentation 不同。

`output:` preference does NOT auto-propagate 到 `ce-plan` handoff：ce-plan 会 re-resolves its own `plan_output` config independently。Asymmetric output（`requirements.html` + `plan.md`）是可接受的；希望两者都是 HTML 的用户，需要在 `.compound-engineering/config.local.yaml` 中设置两个 keys。

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

**如果检测到 non-software brainstorming：** 立即读取 `references/universal-brainstorming.md` 并遵循它：它会完整替代 Phases 0.2-4。此路线的 scope assessment、exploration moves、convergence 和 wrap-up menu 都在那里，而不是在 main body 中；临场 improvising 会产生无 synthesis、无 handoff 的松散 chat。上方 **Core Principles and Interaction Rules 仍原样适用**，包括 one-question-per-turn，以及默认使用平台 blocking question tool；这是此路线中本文件唯一保留的部分。

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

**Visual probe tripwire。** 如果 feature 本质上是 visual 或 spatial，例如 drawing/canvas tools、annotation behavior、visual editors、UI layout/navigation、interaction states、charts、diagrams、animation、maps、timelines 或 spatial flows，现在读取 `references/visual-probes.md`，并记住 visual-probe gate pending。强信号包括 freehand vs constrained drawing behavior、canvas annotation tools、layout comparisons 和 state/flow placement。此处加载 reference 只是 readiness；直到第一个 concrete shape/behavior decision 时才提供 visual path。如果用户之后选择 visual，通过相对已加载的 `ce-brainstorm` skill directory 解析并运行 `scripts/visual-probe-server.js`；如果 runtime 没有暴露具体 skill directory，不要从 project CWD 猜测，使用 text path。

### Phase 1：Understand the Idea（理解想法）

#### 1.1 Existing Context Scan（现有 Context 扫描）

在 substantive brainstorming 前扫描 repo。让 depth 匹配 scope：

**Lightweight（轻量）** — 搜索 topic，检查是否已存在类似内容，然后继续。

**Standard and Deep（标准和深度）** — 两轮：

*Constraint Check（inline，约束检查）* — 检查 project instruction files（`AGENTS.md`，以及仅当作为 compatibility context 保留时的 `CLAUDE.md`），寻找会影响 brainstorm 的 workflow、product 或 scope constraints。如果存在，也读取 `STRATEGY.md`：产品的 target problem、approach、persona 和 active tracks 是此 brainstorm 应交付内容的直接输入，并应塑造 scope、success criteria，以及哪些 approaches aligned 或 out-of-scope。如果 repo root 存在 `CONCEPTS.md`，也读取它：这是项目的 authoritative vocabulary。在 dialogue、approaches 和 requirements doc 中使用这些名称；将用户提供的 synonyms 映射回来。如果其中任何文件没有增量，继续。此 pass 保持在 main conversation 中：dialogue 需要这些 material 留在 context 里来塑造问题。

*Topic Scan（grounding scout，主题扫描）* — 在 `/tmp/compound-engineering/ce-brainstorm/<run-id>/`（short unique slug）创建 scratch dir，然后通过平台 subagent primitive（Claude Code 中的 `Agent`/`Task`、Codex 中的 `spawn_agent`、Pi 中经 `pi-subagents` extension 的 `subagent`）dispatch 一个 extraction-tier sub-agent。平台支持时让它在 background 运行，并 **不等待** 就继续 Phase 1.2/1.3：scout 会在用户思考 opening questions 时运行。Scout prompt：

> Gather grounding for a requirements brainstorm about **{topic}** in this repo. Search first with the native file-search and content-search tools, then read targeted sections — budget ~20 reads, preferring ranges over whole files. Find: whether something similar already exists, the most relevant existing artifacts (brainstorms, plans, specs, feature docs), adjacent examples of similar behavior, and the current state of anything the topic would touch (tables, routes, config, dependencies). Write a **grounding dossier** to `{scratch-dir}/grounding.md`: at most 150 lines of verbatim quotes and short code snippets, each with a `file:line` pointer. Extraction only — quote what the repo says; do not interpret or propose. If the topic has little footprint, write less rather than padding. Return only a gist: 3-5 lines summarizing what the dossier holds, plus its absolute path.

Dialogue 中只 carry gist。当 conversation 需要 gist 无法回答的 specifics，例如用户 challenge claim、某个 approach 需要 grounding，按需读取 dossier：它是 condensed、verified quote-sheet，总比重新扫描 raw files 更便宜。Downstream consumers（Phase 2.6 verifier、ce-plan handoff）接收 dossier path，而不是内容。如果到 Phase 2 需要它时 scout 尚未返回，那时再等待。

如果 scan 和 scout 都没有发现 relevant 内容，说明这一点并继续。扫描期间有两条规则管理 technical depth：

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

**Visual-probe gate — 把它当作前置条件检查，不要依赖记忆。** 如果 Phase 0.3 tripwire fired（inherently-visual topic），那么在提出第一个关于 shape、behavior、state、layout、flow 或 diagram 的 decision 前，无论是 plain chat 还是 blocking tool，都必须先通过 `references/visual-probes.md` 中的 text-vs-visual offer。保留验证敏感契约：before asking behavior/shape questions, the visual offer must fire first. 这个条件是 state-based：除非这个 specific decision 已经经过 offer（用户已为它选择 text 或 visual），否则就要 offer。检查要锚定到你即将提出的 decision，而不是记忆里从 Phase 0.3 保留下来的 "pending gate"。

此 gate **takes precedence over default blocking-question path**（Interaction Rule 4）：在用户 decline visual（或 visual feedback 已回到 chat）之前，不要把 shape decision 作为 `AskUserQuestion`/`request_user_input` menu 提出，也不要在 plain-chat 中直接问 shape question。**在问题选项里放 ASCII preview 或 text mockup does not satisfy the offer，这是此 gate 要阻止的捷径。** Offer 本身是一个 prior question，带两个 options：在 local browser 中 sketch rough options，或在 chat 中描述它们。Use the platform's blocking question tool for the text-vs-visual opt-in when available. 用户选择 text 后，继续在 chat 中推进，且不要为同一个 decision 重复 offer。用户选择 visual 时，按 `references/visual-probes.md` 构建 cheapest display-only probe，再用 blocking question tool 收集 bounded feedback；browser artifact 保持 display-only。

**Guidelines（指导原则）：**
- 在提供自己的 ideas 前，先问用户已经在想什么。这会浮现 hidden context，并防止固定在 AI-generated framings 上。
- 从 broad 开始（problem、users、value），再 narrow（constraints、exclusions、edge cases）
- **Rigor probes 在 Phase 2 前触发，并且是 open-ended，不是 menus。** Phase 1.2 中发现的每个 scope-appropriate gap 都作为 **separate** direct open-ended probe 触发：一个 probe 只满足一个 gap，不要合并多个。它们可以穿插在 narrowing moves 中逐步浮现，但在 Phase 2 前必须 probe 每个发现的 gap。Menu 会暗示哪些证据算数并让用户选择；open probe 会迫使真实 observation 出现，或浮现真实 uncertainty。Phase 1.2 每条 "when present, ask..." 就是该 probe；按 Interaction Rule 6 phrasing。**当 Attachment gap 存在时，它是 Phase 2 前最后一个 rigor probe：是否存在由 opening 判断，不能因为 narrowing 已经产出 shape 就跳过；它的职责是在 Phase 2 继承该 framing 前 pressure-test 用户的 implicit framing。** 如果 probe 的答案暴露 genuine uncertainty，把它作为 explicit assumption 记录在 requirements document 中，而不是跳过 probe。
- Clarify the problem frame、validate assumptions，并询问 success criteria
- 让 requirements 具体到 planning 不需要发明 behavior
- 只有当 dependencies 或 prerequisites materially affect scope 时才浮现它们
- Product decisions 在这里解决；technical implementation choices 留给 planning
- 带来 ideas、alternatives 和 challenges，而不是只做 interview
- **Visual-probe gate。** 由本 phase 顶部的 bold gate checkpoint 管理：offer 在第一个 shape/behavior/state/layout/flow/diagram question 前触发；blocking question 中的 ASCII 或 text mockup 永远不满足该 gate。

**Before exiting Phase 1.3：integration check。** 在脑中组合用户目前所说内容，并浮现 dialogue 尚未 probe 的任何 non-obvious consequences。如果 user-stated X 加 user-stated Y 加 your-default-Z 会产生用户不太可能通过 one-question-at-a-time dialogue 跟踪到的 downstream effect（"if mute lives on the rule AND we don't warn on delete, then rule-delete silently loses pause state"），趁仍在 dialogue 中现在 probe。每个 genuine combination effect 一个 probe，open-ended 提问，纪律同 rigor probes。Phase 2.5 的 call-outs 是 residuals 的安全网（silent agent inferences、无 dialogue 的 pre-loaded contexts），不是把现在本可以询问的 consequences 推后的 punt list。

**Exit condition：** 持续到 idea 清晰且没有 pending integration-check questions，或用户明确想继续。

### Phase 2：Explore Approaches（探索方案）

如果仍有多个 plausible directions，基于 research 和 conversation 提出 **2-3 个 concrete approaches**。否则直接说明 recommended direction。

至少使用一个 non-obvious angle：inversion（what if we did the opposite?）、constraint removal（what if X weren't a limitation?），或借鉴 another domain 如何解决它。最先想到的 approaches 通常只是同一轴线上的 variations。对每个 approach 应用 anti-genericness test：如果它会出现在该 problem category 的 generic listicle 中，就基于 grounding dossier sharpen 它，或丢弃。

先呈现 approaches，再 evaluate。让用户先看到所有 options，再听推荐哪一个：在用户看到 alternatives 前就先给 recommendation，会过早 anchor conversation。

如果 approach differences 足够 spatial、behavioral 或 visual，以至于 prose 更慢或 fidelity 更低，在呈现 choice 前使用 `references/visual-probes.md`。对于 Phase 0.3 tripwire 捕获的 inherently visual topics，默认提供 visual probe option，而不是只靠文字比较。

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

**STOP。在 composing synthesis 前，读取 `references/synthesis-summary.md`。** two-stage shape（internal three-bucket draft → chat-time scoping synthesis）、带 keep tests 的四个 scoping synthesis sections、per-bullet affirmability 和 detail tests、带 re-cut rule 的 tier-aware bullet budget、anti-pattern guidance、soft-cut behavior、self-redirect support，以及 internal-draft routing into doc body sections 都在那里：本 main body 不重复它们。未加载这些规则就 compose synthesis，会稳定产生 malformed output：把完整 internal three-bucket draft 原样粘到 chat、implementation-detail 泄漏进 scoping synthesis、proposal-pitch anti-pattern。下方 Path A / Path B routing 只决定 *是否* 触发 confirmation，不是 synthesis spec。

在 Phase 3 写 requirements doc 前，向用户呈现 scoping synthesis：这是 artifact 落地前用户最后一次纠正 scope 的机会。scoping synthesis 的形状应像两个 product collaborators 在写 PRD 前会确认的内容，而不是 comprehensive audit 或 one-line preview。

对包括 Lightweight 在内的 **all tiers** 触发。在 Phase 0.1b non-software（universal-brainstorming）路线中完全跳过 Phase 2.5。

**Path A vs Path B：** scoping synthesis shape 依赖两个 signals：是否有 blocking question fired，以及 Phase 0.3 将 scope 分类为什么 tier。

- **Path A — no blocking questions fired AND tier is Lightweight**：announce-mode。只输出 "What we're building" prose（1-3 句），然后在同一 turn 进入 Phase 3 doc-write。无其他 sections，无 confirmation question。Do NOT 结束 turn 等待 acknowledgement。如果 shape 错了，用户可以在 doc 落地后修改：Lightweight Path A docs 很短，post-hoc revision 成本低。
- **Path B — at least one blocking question fired，OR tier is Standard / Deep-feature / Deep-product**：带 confirmation gate 的 full tier-aware scoping synthesis。两种场景触发 Path B：(a) 用户在 dialogue 中投入了 answer-time，或 (b) 用户预先加载了 substantive scope content（Phase 0.2 fast-path 带 richly-specified opening prompt）。无论哪种，substance 都值得一个真正 checkpoint。即使 zero call-outs 通过 keep test，confirmation 也 unconditional。

**Why the tier guard on Path A**：Phase 0.2 的 fast path 同时服务紧凑 one-liners 和不需要 dialogue 的 richly pre-loaded openings。Pre-loaded substance 会让 Phase 0.3 tier 变成 Standard 或 Deep，从而路由到 Path B；没有这个 guard，20+ 项 pre-stated scope 也只会得到 1-sentence checkpoint。

#### 2.6 Claim Verification（在 Path B confirmation wait 中）

当即将生成的 requirements doc 会 assert 关于 repo 的 checkable claims 时，例如 absence claims（"no retry logic exists"）、specific files/config/dependencies references，或任何 planning 会基于其构建的内容，在 Path B confirmation question 发出同一时刻 dispatch 一个 generation-tier verifier，让它在用户思考时间运行。传入 claim list（每行一个）、grounding dossier path（若存在），以及指令：directly against the codebase verify each claim，budget 约 15 个 targeted reads，并为每个 claim 返回 verdict：**confirmed**（带 `file:line`）、**refuted**（带 contradicting evidence）或 **unverifiable**。不要让 verifier 阻塞 confirmation question。

在 Phase 3 消费 verdicts：写入前纠正 refuted claims，并将 unverifiable claims 标记为 explicit assumptions。Fresh-context verifier 替代 self-graded verification：作者验证自己的 claims 会被 anchor，而 verifier 没有看过 dialogue。

当 Path A 触发、doc 不会提出 checkable claims，或走 non-software route 时跳过。如果 verifier dispatch 失败，fallback 为在 Phase 3 write 前 inline verify claims：无论哪种路径，Phase 1.1 的 verify-before-claiming rule 仍成立。

### Phase 3: Capture the Requirements（记录 Requirements）

只有当 conversation 产出值得保留的 durable decisions 时，才 write 或 update requirements document：criteria 和 bug-fix stress test 见 `references/brainstorm-sections.md` 的 "Decide whether a doc is warranted at all"。当用户只需要 brief alignment，且 decisions 可以直接流向 downstream（ce-plan、commit message、docs/solutions/）而不需要中间 brainstorm artifact 时，跳过 document creation。

当 doc 有必要时，用以下内容 compose：

- `references/brainstorm-sections.md` — section contract（outcomes、hard floor、include-when-material catalog、agency rules、ID conventions）。
- Phase 0.0 resolved 的 `OUTPUT_FORMAT` 对应的 format-specific rendering reference：compose 前 **现在** 读取 `references/markdown-rendering.md`（md）或 `references/html-rendering.md`（html）。它定义 format 如何呈现 sections，并且是刻意从 Phase 0.0 defer 到这里的；不加载它就 compose，会产生仅靠 section contract 无法防止的 format drift。

**Write tight。** 一个 section 有实质，不代表可以 padding。对每个保留的 section 应用 `references/brainstorm-sections.md` 中的 prose-economy discipline：一句话一个 idea；一个 requirement 是 intent 加最多一个 qualifier；把 forks defer 到 Outstanding Questions，不要同时写完整两条分支；对 superseded text 做 in-place resolution，不要堆叠 strata。宣称 doc written 前，运行其中的 named test：读者能否一遍在每个 section 中找到 contradiction？

写入 `docs/brainstorms/YYYY-MM-DD-<topic>-requirements.<md|html>`：extension 跟随 `OUTPUT_FORMAT`。用 absolute path 确认，以便 reference 可点击。

#### Vocabulary Capture — after the requirements doc（Vocabulary 捕获，仅当 CONCEPTS.md 已存在）

**如果 repo root 不存在 `CONCEPTS.md`，完全跳过此步骤**：creation 由 ce-compound 和 ce-compound-refresh 拥有。

在 approaches、scope synthesis 和 requirements doc **之后** 运行此步骤：canonical term 常在这些地方被选择或纠正，因此在早期 dialogue 捕获会错过最终 resolved name。如果 `CONCEPTS.md` 存在，扫描完整 dialogue 和 requirements doc，寻找 **resolved** domain terms：conversation 主动固定了 precise local meaning 的 terms，而不是随口提到的 terms。**Resolved 表示 definition 已 settled，不是仍在 discussion。** 可能还会 revise 的 provisional terms 只留在 conversation 中。

对每个 resolved term：如果缺失，添加；如果已存在但出现了 new precision，refine；如果已一致，不操作。

**仅限具有 project-specific meaning 的 domain entities、named processes 和 status concepts。** 不包括 file paths、class names、function signatures 或 implementation decisions：`CONCEPTS.md` 是 glossary，不是 spec 或 catch-all。

遵循 existing entries 设置的 format。静默应用 edits。（如果 Phase 3 跳过 doc，仍对 resolved dialogue 运行此步骤。）

### Phase 4：Handoff（交接）

现在读取 `references/handoff.md`，然后再呈现任何 options。Option set 及其 visibility conditions、rendering-mode rule、per-selection dispatch instructions（包括传给 `ce-plan` 的内容）和 closing summary formats 都在那里：本 main body 不重复。Improvised menu 会静默破坏 pipeline routing：options 会在必须 hidden 的状态出现，downstream skills 也会收到错误 payload。
