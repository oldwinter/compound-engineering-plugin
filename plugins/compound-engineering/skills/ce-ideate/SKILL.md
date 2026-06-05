---
name: ce-ideate
description: "围绕某个 topic 生成并批判性评估 grounded ideas。当用户询问要改进什么、请求 idea generation、探索 surprising directions，或希望 AI 在深入 brainstorm 某个想法前主动提出强选项时使用。触发短语包括 'what should I improve'、'give me ideas'、'ideate on X'、'surprise me'、'what would you change'，或任何请求 AI-generated suggestions 而不是 refine 用户自己想法的请求。"
argument-hint: "[feature、focus area 或 constraint]"

---

# Generate Improvement Ideas（生成改进想法）

**Note（注意）：当前年份是 2026。** 给 ideation documents 标日期和检查 recent ideation artifacts 时使用此信息。

`ce-ideate` 位于 `ce-brainstorm` 之前。

- `ce-ideate` 回答："What are the strongest ideas worth exploring?"（哪些最强 idea 值得探索？）
- `ce-brainstorm` 回答："What exactly should one chosen idea mean?"（选中的 idea 到底意味着什么？）
- `ce-plan` 回答："How should it be built?"（应该如何构建？）

此 workflow 会在 `docs/ideation/` 中产出 ranked ideation artifact。它 **不** 产出 requirements、plans 或 code。

## Interaction Method（交互方式）

使用平台的 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中不存在 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中的编号选项；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题。

一次只问一个问题。存在 natural options 时，优先使用 concise single-select choices。

## Focus Hint（聚焦提示）

<focus_hint> #$ARGUMENTS </focus_hint>

将任何提供的 argument 解释为 optional context。它可能是：

- `DX improvements` 这样的 concept
- `plugins/compound-engineering/skills/` 这样的 path
- `low-complexity quick wins` 这样的 constraint
- `top 3`、`100 ideas` 或 `raise the bar` 这样的 volume hint

如果未提供 argument，以 open-ended ideation 继续。

## Core Principles（核心原则）

1. **Ground before ideating（先 grounding，再 ideate）** - 先扫描实际 codebase。不要生成脱离 repository 的抽象 product advice。
2. **Generate many -> critique all -> explain survivors only（大量生成 -> 全部批判 -> 只解释幸存者）** - quality mechanism 是带原因的 explicit rejection，而不是 optimistic ranking。不要让额外 process 掩盖这个 pattern。
3. **Route action into brainstorming（将行动路由到 brainstorming）** - Ideation 识别 promising directions；`ce-brainstorm` 将被选中的方向定义到足够 planning 的精度。不要从 ideation output 直接跳到 planning。

## Execution Flow（执行流程）

### Phase 0：Resume and Scope（恢复与定范围）

#### 0.1 Check for Recent Ideation Work（检查近期 Ideation 工作）

在 `docs/ideation/` 中查找最近 30 天内创建的 ideation documents。

当满足以下条件时，将 prior ideation doc 视为 relevant：

- topic 匹配 requested focus
- path 或 subsystem 与 requested focus 重叠
- request 是 open-ended，且有明显 recent open ideation doc
- issue-grounded status 匹配：当当前 argument 表示 issue-tracker intent 时，不要提供 resume non-issue ideation，反之亦然；将它们视为 distinct topics

如果存在 relevant doc，询问是否：

1. 从它继续
2. 重新开始

如果继续：

- 读取 document
- 总结已探索内容
- 保留 previous idea statuses
- 更新 existing file，而不是创建 duplicate

#### 0.2 Subject-Identification Gate（主题识别关口）

在 classifying mode 或 dispatching 任何 grounding 前，检查 ideation 的 subject 是否 identifiable。每个 downstream agent（grounding 和 ideation）都需要知道自己在处理什么。如果 subject 足够 ambiguous，以至于合理的 sub-agents 会对 topic 到底是什么产生分歧（例如 `improvements`、`ideas`、`birthday cakes`、`vacation destinations` 这类 bare words），output 会很分散。

**Questioning principles（提问原则，适用于此 phase 和 0.4）：**

- Questions 只用于提供 sub-agents 运行所需内容：identifiable subject（此 phase），以及足够让 agent 说出具体内容的 context（0.4，仅 elsewhere modes）。没有别的目的。
- 绝不要询问 solution direction、constraints、audience、tone、success criteria，或任何 characterize subject 的东西：那些属于 `ce-brainstorm`。
- 始终把 "Surprise me"（让 agent 决定 focus）保留为真实 option，而不是用户说不出 subject 时的 fallback。Ideation 按设计允许 greenfield。
- 一旦 subject identifiable，或用户委托给 "Surprise me"，就停止。0.2 和 0.4 总计超过 3 个问题，就是 ideation 可能不是正确 workflow 的信号：考虑建议 `ce-brainstorm`。

**Detection — issue-tracker intent（检测 issue-tracker intent，仅 repo mode；用于识别 subject）。**

Issue-tracker intent 需要明确引用 tracker 或其中 filed 的 reports。只有当 prompt 使用 `github issues`、`open issues`、`issue patterns`、`issue themes`、`what users are reporting` 或 `bug reports` 这类短语时触发：subject 是 "issues in the tracker"。带 issue-tracker intent flag 进入 0.3。

不要因仅把 bugs 作为 focus 提到的 arguments 触发：`bug in auth`、`fix the login issue`、`the signup bug`、`top 3 bugs in authentication`。这些是 regular ideation 的 focus hints，不是请求分析 issue tracker。没有 tracker phrasing 的 bare `bugs` 由下方 vagueness check 处理，而不是这里。

组合出现时（例如 `top 3 issue themes in authentication`、`biggest bug reports about checkout`）：先检测 issue-tracker intent，volume override 在 0.5 处理，其余部分作为 focus hint。focus 收窄哪些 issues 重要；volume override 控制 survivor count。

**Detection — subject identifiability（检测主题可识别性）。**

测试：读者只看到这个 prompt，是否知道 agent 应该围绕什么 subject ideate？判断 words *refer to* 什么，而不是它们的长度或 surface form。

- **Vague — ask the scope question（模糊：询问 scope question）。** prompt 指向 quality、category 或 placeholder，但没有命名 specific thing。合理读者会选择不同 subjects。Illustrative cases：`improvements`、`ideas`、`things to fix`、`quick wins`、`what to build`、`bugs`（作为完整 prompt，而不是像 "bugs in auth" 这样的 topic）、空 prompt。这些是 pattern examples，不是 lookup table：通过 words 指向什么（catch-all quality）识别 vagueness，而不是匹配特定 words。

- **Identifiable — proceed to 0.3（可识别：进入 0.3）。** prompt 命名或 plausibly names 一个 specific subject：feature、concept、document、subsystem、page、flow 或 concrete topic。即使不知道 domain，读者也知道把思考指向哪里。Illustrative cases：`authentication system`、`our sign-up page`、`browser sniff`、`dark mode`、`cache invalidation`、`a unicorn cake for my 7-year-old`、`plot ideas for a short story`。

**Key distinction（关键区别）：** vagueness 关乎 words *refer to* 什么，而不是 phrase length。`browser sniff` 是两个词，但 plausibly names a feature，所以 identifiable。`quick wins` 也是两个词，但只指向 quality，所以 vague。不要默认把短语当 vague。

**处在 repo 内不能解决 vagueness。** 任何 repo 中的 `improvements` 仍散布在 DX、reliability、features、docs、tests、architecture。repo 在 subject settled *之后* 为 grounding 提供 material，而不是 subject 本身。不要静默把 vague prompt 解释为 "about this repo" 并继续。

**Genuine ambiguity（repo mode）。** 当判断对某个短语仍有真实疑问：它可能是 named feature，也可能是 vague concept，做一次 cheap check 即可解决：Glob filenames 中的该 phrase，或 Grep README/docs。如果它出现在任何地方，视为 identifiable 并继续。如果没有 repo footprint 且仍读起来 vague，询问 scope question。

其他拿不准时，倾向提问：相比基于分散 interpretation 派发约 9 个 agents，一个问题成本很低。

**The scope question（范围问题）。**

使用平台的 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 blocking tool 不存在或调用报错时，才退回到聊天中的编号选项；不要仅因为需要加载 schema 就退回。绝不要静默跳过。

- **Stem（题干）：** "Agent 应该围绕什么进行 ideation？"
- **Options（选项）：**
  - "指定 agent 应 ideate 的 subject"
  - "Surprise me — 让 agent 决定 focus"
  - "Cancel — 我来重新表述"

Routing（路由）：

- **Specify** → 接受用户 follow-up 作为 subject。重新应用一次 identifiability check。如果仍 ambiguous，再问一次，且 menu 中仍保留 "Surprise me"。不要 cascade 到关于 *how* to solve 的 specificity，只问 *what* the subject is。
- **Surprise me** → 将 run 标记为 **surprise-me mode**。agent 会从 Phase 1 material 中 discover subjects，而不是携带 user-specified subject。这是一等 mode：它改变 Phase 1 如何扫描以及 Phase 2 sub-agents 如何操作（见这些 phases）。**surprise-me 的 dispatch routing 是 deterministic：** 如果 CWD 位于 git repo 内，路由到 repo-grounded（codebase 提供 substance）；否则路由到 elsewhere-software，并要求 Phase 0.4 在 dispatch 前收集至少一条 substance（URL、description、draft 或 paste）：repo 外的 "surprise me" 只有在用户提供了可被 surprise 的材料后才可行。跳过 Phase 0.3 的 Decision 1/2：没有 user subject 就没有 prompt content 可权衡，且 surprise-me 永不路由到 elsewhere-non-software（没有 subject 就无法推断 naming/narrative/personal intent）。用户可以 interrupt 并用 named subject 重新调用来纠正。
- **Cancel** → 干净退出。说明用户可以 rephrase 并 re-invoke。

#### 0.3 Mode Classification（模式分类）

将 **subject of ideation**（在 0.2 settled）分类为三个 modes 之一，用于 dispatch routing。位于任何 repo 内的用户可以 ideate 与该 repo 无关的内容；位于 `/tmp` 的用户也可以 ideate 他们脑中的代码。

**Surprise-me short-circuit（Surprise-me 短路）。** 当 Phase 0.2 路由到 surprise-me mode 时，跳过下方 two-decision classification，并使用 0.2 中说明的 deterministic rule：CWD 在 git repo 内时为 repo-grounded，否则为 elsewhere-software。本节末尾的 ambiguity-confirmation step 对 surprise-me 也不触发：没有 user subject 可产生 ambiguity。用一句话说明 chosen mode，并进入 0.4。

对于 specified subjects，做两个 sequential binary decisions，并在每步枚举 negative signals：

**Decision 1 — repo-grounded vs elsewhere（repo 内 grounding vs repo 外）。** 首先权衡 prompt content，其次 topic-repo coherence，CWD repo presence 仅作为 supporting evidence。

- **repo-grounded** 的 positive signals：prompt 引用 repo files、code、architecture、modules、tests 或 workflows；topic 明确被当前 codebase bounded。0.2 的 issue-tracker intent 始终是 repo-grounded。
- negative signals（推向 **elsewhere**）：prompt 命名 repo 中不存在的事物（pricing、naming、narrative、business model、personal decisions、brand、content、market positioning）；topic 是 creative、business 或 personal，且无 code surface。

**Decision 2（仅当 Decision 1 = elsewhere 时触发）— software vs non-software（software vs non-software）。** 根据 ideation 的 *subject* 是否是 software artifact 或 system 分类，而不是根据 individual ideas 最终会落在哪里。如果 topic 涉及 product、app、SaaS、web/mobile UI、feature、page 或 service，它就是 **elsewhere-software**，即使 ideas 本身讨论的是 *for that software product* 的 copy、UX、CRO、pricing、onboarding、visual design 或 positioning。**Elsewhere-non-software** 仅保留给完全没有 software surface 的 topics：company 或 brand naming（独立于 product）、narrative and creative writing、personal decisions、non-digital business strategy、physical-product design。

示例 classifications：

- "Improve conversion on our sign-up page" → elsewhere-software（subject 是 page）
- "Redesign the onboarding flow" → elsewhere-software（subject 是 flow）
- "Pricing page A/B test ideas" → elsewhere-software（subject 是 page）
- "Features to add to our note-taking app"（给 note-taking app 添加 features） → elsewhere-software
- "Name my new coffee shop" → elsewhere-non-software（subject 是 brand）
- "Plot ideas for a short story" → elsewhere-non-software（subject 是 narrative）
- "Options for my next career move" → elsewhere-non-software（subject 是 personal decision）

在顶部用一句用户能识别的 plain language 说明 inferred approach。绝不要向用户打印 internal taxonomy label（`repo-grounded`、`elsewhere-software`、`elsewhere-non-software`）：这些名称只用于 routing。将下方 template 适配到实际 topic；从 topic 本身选 domain word（例如 "landing page"、"onboarding flow"、"naming"、"career decision"），不要使用 mode label。

- **Repo-grounded（repo 内 grounding）:** "Treating this as a topic in this codebase — about X."
- **Elsewhere-software（repo 外 software）:** "Treating this as a product/software topic outside this repo — about X."
- **Elsewhere-non-software（repo 外 non-software）:** "Treating this as a [naming | narrative | business | personal] topic — about X."

不要规定 correction phrases（"say X to switch"）。清楚说明 inferred mode 并继续。如果用户不同意，他们会用自己的话纠正或 interrupt 重新调用；届时 reclassify 并重跑任何 affected routing。

**Active confirmation on mode ambiguity。** 仅当 0.2 settled subject 后，mode classification 仍 genuinely ambiguous 时触发：例如 "our docs" 可能表示 repo docs（repo-grounded），也可能表示 public marketing docs（elsewhere-software）。多数在 0.2 settled 的 subjects 在这里都能 cleanly classify。当 ambiguous 时，通过 blocking tool 问一个 confirmation question，使用两个 self-contained labels，以 plain language 命名两个 candidate interpretations（例如 "Treat as repo docs in this codebase" vs "Treat as public marketing docs"）：绝不要泄漏 internal mode names。否则一句 inferred-mode statement 足够，不要提问。

**Routing rule（non-software mode 路由规则）。** 当 Decision 2 = non-software，仍运行 Phase 1 Elsewhere-mode grounding（默认 user-context synthesis + web-research；尊重 skip phrases）。此 mode 默认跳过 Learnings-researcher：CWD 的 `docs/solutions/` 很少能迁移到 naming、narrative、personal 或 non-digital business topics；完整 rationale 见 Phase 1。然后加载 `references/universal-ideation.md`，并用它替代 Phase 2 的 software frame dispatch 和 Phase 6 menu narrative。此加载不可选：该文件包含替代此 mode 中 Phase 2 和 post-ideation menu 的 domain-agnostic generation frames、critique rubric 和 wrap-up menu，而这些 details 不存在于 main body。凭记忆 improvising 会为 non-software topics 产生错误 facilitation。任何时候都不要运行 repo-specific codebase scan。`references/post-ideation-workflow.md` 中的 §6.5 Proof Failure Ladder 仍适用：只要 Proof save（elsewhere-mode 中 Save and end 的默认）失败，就加载并遵循它，确保 local-save fallback path 在 non-software elsewhere runs 中仍可到达。

#### 0.4 Context-Substance Gate（仅 Elsewhere Modes）

repo mode 中跳过：repo 提供 Phase 1 agents 工作所需 substance。在 elsewhere modes（software 和 non-software）中，Phase 1 agents 依赖 user-supplied context 作为 substance。没有 description、URL 或 artifact 的 bare prompt 会让 user-context-synthesis agent 无物可 synthesize，并削弱 web research 的 relevance。

应用 discrimination test：如果把用户 stated context 中的一部分替换成 contrasting alternative，会不会 materially change 哪些 ideas survive？如果会，context 是 load-bearing，继续。如果不会，问 1-3 个 narrowly chosen questions，聚焦 **supplying substance，而不是 characterizing the subject**：

- 要读取的 URL 或 file
- current state 的 brief description
- existing draft 或 brief 的 paste

基于用户已经提供的内容继续，而不是从 template 开始。默认使用 free-form questions；只有当 answer space 小且 discrete 时才用 single-select。每次回答后，在询问下一题前重新应用 test。遇到 dismissive responses（"idk just go"）时停止：把 genuine "no context" answers 当作真实答案，并在 summary 中注明 context thin，让 Phase 2 可以用 broader generation 补偿。

**Surprise-me exception。** 当 run 处于 surprise-me mode 且被路由到 elsewhere-software（按 0.2 中 no-repo CWDs 的 deterministic routing）时，至少需要一条 substance：没有 subject，也没有 repo，所以 Phase 1 和 2 agents 没有可用于 discover subjects 的东西。这里不接受 dismissive responses；如果问一次后用户仍没有 context，告诉他们此 run 需要 URL、description 或 paste 才能继续，并干净结束，方便他们带材料重新调用。

当用户 upfront 提供 rich context（paste、brief、existing draft、URL）时，用一行确认理解，并完全跳过此步骤。

如果此步骤 materially changes topic（不只是添加 context，而是 shift subject），在 dispatch Phase 1 前基于 refined scope 重跑 0.2 和 0.3：根据实际正在 ideate 的内容分类，而不是 first read 时的 scope。

#### 0.5 Interpret Focus and Volume（解释 Focus 与 Volume）

从 argument 和目前任何 intake 推断两件事：

- **Focus context** — concept、path、constraint 或 open-ended
- **Volume override** — 任何改变 candidate 或 survivor counts 的 hint

Default volume（默认数量）：

- 每个 ideation sub-agent 生成约 6-8 个 ideas（default path 中跨 6 个 frames 产出约 36-48 个 raw ideas，issue-tracker mode 中跨 4 个 frames 产出约 24-32 个；6-frame path 中 dedupe 后约 25-30 个 survivors，4-frame path 更少）
- 保留 top 5-7 survivors

遵守 clear overrides，例如：

- `top 3`
- `100 ideas`
- `go deep`
- `raise the bar`

**Tactical scope detection。** 解析 focus hint（以及 0.2 中任何指定 path 的 intake answers）中的 tactical signals：`polish`、`typo`、`typos`、`quick wins`、`small improvements`、`cleanup`、`small fixes`。存在时，降低 Phase 2 ambition floor：用户已明确 opt into tactical scope。否则默认是 step-function（见 Phase 2 meeting-test floor）。

使用 reasonable interpretation，而不是 formal parsing。

#### 0.6 Cost Transparency Notice（成本透明提示）

在 dispatch Phase 1 前，用一行短句呈现 inferred mode 的 agent count，让 multi-agent cost 不隐形。根据实际 dispatch decision 计算数量：1 个 grounding-context agent（repo mode 中 codebase scan；elsewhere 中 user-context synthesis）+ 1 个 learnings（elsewhere-non-software 中跳过）+ 1 个 web researcher + 6 个 ideation = repo mode 和 elsewhere-software baseline 9，elsewhere-non-software 为 8。当 issue-tracker intent 触发（仅 repo mode）：增加 1 个 issue-intelligence agent，并将 ideation 从 6 降到 4，net -1（baseline 8）。如果用户 opt into Slack research，+1。如果用户发出 web-research skip phrase 或 V15 reuse 将触发，-1。在 **surprise-me mode** 中，agent count 相同，但每个 agent exploration 更深：active 时注明 "(surprise-me mode: deeper exploration per agent)"。当 generation 留下空 topic axis 时，Phase 2 的 axis-coverage check 可能 dispatch 最多 2 个 additional recovery sub-agents（surprise-me mode 中跳过）；不在 surprise-me 时，在 count line 追加 "(+up to 2 if axis-coverage requires recovery)"。

Examples（示例：defaults、no skips、no opt-ins）:

- **Repo mode, specified subject（repo mode，指定 subject）:** "将 dispatch 约 9 个 agents：codebase scan + learnings + web research + 6 个 ideation sub-agents。Skip phrases: 'no external research', 'no slack'."
- **Repo mode, surprise-me（repo mode，surprise-me）:** "将 dispatch 约 9 个 agents（surprise-me mode: 每个 agent 进行更深 exploration）：codebase scan + learnings + web research + 6 个 ideation sub-agents。Skip phrases: 'no external research', 'no slack'."
- **Repo mode, issue-tracker intent（repo mode，issue-tracker intent）:** "将 dispatch 约 8 个 agents：codebase scan + learnings + web research + issue intelligence + 4 个 ideation sub-agents。Skip phrases: 'no external research', 'no slack'." 表示 successful-theme path；如果 issue intelligence 返回 insufficient signal（见 Phase 1），ideation 会回退到 6 个 sub-agents，总数变为约 9。
- **Elsewhere-software（repo 外 software）:** "将 dispatch 约 9 个 agents：context synthesis + learnings + web research + 6 个 ideation sub-agents。Skip phrases: 'no external research'."
- **Elsewhere-non-software（repo 外 non-software）:** "将 dispatch 约 8 个 agents：context synthesis + web research + 6 个 ideation sub-agents。Skip phrases: 'no external research'."

该行仅作信息提示；用户无需 acknowledge。

### Phase 1：Mode-Aware Grounding（模式感知 Grounding）

生成 ideas 前，收集 grounding。dispatch set 取决于 Phase 0.3 中选择的 mode。Web research 在所有 modes 中运行（尊重 skip phrases）。Learnings 在 repo mode 和 elsewhere-software 中运行，并且在 **elsewhere-non-software 中默认跳过**：CWD repo 的 `docs/solutions/` 几乎总是包含无法迁移到 naming、narrative、personal 或 non-digital business topics 的 engineering patterns。

**Surprise-me grounding depth。** 当 Phase 0.2 路由到 surprise-me mode 时，Phase 1 必须比 specified mode 产出更丰富 material：Phase 2 sub-agents 会从 Phase 1 返回内容中 discover 自己的 subjects，所以 texture 很重要：

- **Repo mode surprise-me：** codebase-scan sub-agent 每个 top-level area 采样几个 representative files（而不只是读取 top-level layout + AGENTS.md），浮现 recent PR/commit activity 作为 actively being worked on 的 signal，并且当 issue intelligence 运行时，将 issue themes 作为 first-class input，而不是 footnote。保持 scan bounded：representative，不 exhaustive。
- **Elsewhere mode surprise-me：** user-context synthesis 从用户提供的任何内容中提取 themes、recurring language、tensions 和 omissions，而不只是复述它。Web research 从单一 subject 的 narrow prior-art 扩展到 domain landscape。
- Specified mode 保持当前较浅 scan：用户命名的 subject 会锚定 relevant 内容，因此不需要更广 exploration。

在 Phase 1 开始时生成一次 `<run-id>`（8 hex chars）。将它复用于 V15 cache file（此 phase）和 V17 checkpoints（Phases 2 和 4），使它们共享同一个 per-run scratch directory。

**Pre-resolve scratch directory path。** Scratch 直接位于 `/tmp` 下（不在 `$TMPDIR` 下，也不在 `.context/` 下）。macOS 上 `$TMPDIR` 会解析为类似 `/var/folders/64/.../T/` 的 obscure per-user path，对想检查 checkpoints、复制到别处或之后引用它们的用户不友好；`/tmp` 在 macOS、Linux 和 WSL 上都 universally accessible，而 `$TMPDIR` 提供的 per-user isolation 对 ephemeral ideation scratch 没有价值。运行一个 bash command 创建目录，并捕获其 absolute path 供 downstream 使用。

```bash
SCRATCH_DIR="/tmp/compound-engineering/ce-ideate/<run-id>"
mkdir -p "$SCRATCH_DIR"
echo "$SCRATCH_DIR"
```

将 echo 出来的 absolute path（`/tmp/compound-engineering/ce-ideate/<run-id>`）作为此 run 中后续每次 checkpoint write 和 cache read 的 `<scratch-dir>`。run directory 不会在 Phase 6 completion 时删除：V15 cache 是 session-scoped 且跨 run-ids 复用，checkpoints 遵循 cross-invocation-reusable convention，将 session-scoped artifacts 留给后续 invocations 查找。

在 **foreground** 中并行运行 grounding agents（不要 background：Phase 2 前需要结果）：

**Repo mode dispatch（repo mode 派发）：**

1. **Quick context scan** — 使用平台 cheapest capable model（例如 Claude Code 中的 `model: "haiku"`）dispatch 一个 general-purpose sub-agent，并使用以下 prompt：

   > 读取项目的 AGENTS.md（仅在兼容性 fallback 时读取 CLAUDE.md；如果两者都不存在，再读取 README.md），然后使用 native file-search/glob tool 发现 top-level directory layout（例如 Claude Code 中用 `Glob` pattern `*` 或 `*/*`）。如果存在 `STRATEGY.md`，也读取它；它记录 product 的 target problem、approach、persona、metrics 和 tracks。
   >
> **Two paths for other root-level `*.md` files（其他 root-level `*.md` files 的两条路径）**, depending on whether the focus hint names them:
   >
> - **User-named references（用户命名的 references）** — if the focus hint names a specific root-level `*.md` file (e.g., focus is "ideate based on FEEDBACK.md", "use NOTES.md as input", "review the gaps in TODO.md"), fully read that file and include its content under a heading `User-named references`. Phase 2 treats these as *constraint*, so sub-agents need actual content, not a gist. Quote or summarize substantive sections; keep one-line gists for files that are mentioned but not the actual subject.
> - **Additional context（补充上下文）** — for any other root-level `*.md` files (not named in the focus), read briefly and include a one-line gist under a heading `Additional context`. Phase 2 treats these as *background*, so a gist is sufficient.
   >
   > 返回 concise summary（少于 40 行；如果 user-named references 包含 substantial content，可更长），覆盖：
   >
   > - project shape (language, framework, top-level directory layout)（项目形态：语言、框架、顶层目录布局）
   > - notable patterns or conventions（显著 patterns 或 conventions）
   > - obvious pain points or gaps（明显痛点或缺口）
   > - likely leverage points for improvement（可能的改进杠杆点）
   > - product strategy summary, if `STRATEGY.md` was present — include the approach and active tracks verbatim so ideation can weight toward strategy-aligned directions（如果存在 `STRATEGY.md`，提供 product strategy summary，并逐字包含 approach 和 active tracks，以便 ideation 向 strategy-aligned directions 加权）
   > - `User-named references` section (when the focus hint named root-level `*.md` files)（当 focus hint 命名 root-level `*.md` files 时）
   > - `Additional context` section (when other root-level `*.md` files exist that the focus did not name)（当存在 focus 未命名的其他 root-level `*.md` files 时）
   >
   > 除上述情况外保持 scan shallow：只读取 top-level documentation 和 directory structure。不要分析 GitHub issues、templates 或 contribution guidelines。不要做 deep code search。
   >
   > Focus hint: {focus_hint}

2. **Learnings search** — 用 ideation focus 的 brief summary dispatch `ce-learnings-researcher`。

3. **Web research**（always-on；skip-phrase 和 V15 cache handling 见下方 "Web research" subsection）。

4. **Issue intelligence**（conditional）— 如果 Phase 0.3 检测到 issue-tracker intent，使用 focus hint dispatch `ce-issue-intelligence-analyst`。与其他 agents 并行运行。

   如果 agent 返回 error（gh not installed、no remote、auth failure），向用户 log warning（"Issue analysis unavailable: {reason}. Proceeding with standard ideation."），并继续剩余 grounding。

   如果 agent 报告 total issues 少于 5，注明 "Insufficient issue signal for theme analysis"，并在 Phase 2 中继续 default ideation frames。

**Elsewhere mode dispatch（跳过 codebase scan；user-supplied context 是 primary grounding）：**

1. **User-context synthesis** — dispatch 一个 general-purpose sub-agent（cheapest capable model），读取 Phase 0.4 intake 中的 user-supplied context 以及任何 rich-prompt material，并返回 structured grounding summary，镜像 codebase-context shape（project shape → topic shape；notable patterns → stated constraints；pain points → user-named pain points；leverage points → context implied opportunity hooks）。这让 Phase 2 sub-agents 对 grounding source 保持 agnostic。

2. **Learnings search**（仅 elsewhere-software；elsewhere-non-software 中默认跳过）— 使用 topic summary dispatch `ce-learnings-researcher`，以防存在 relevant institutional knowledge（skill-design patterns、类似形状的 prior solutions）。elsewhere-non-software 中跳过：CWD 的 `docs/solutions/` 不太可能与 non-digital topics topic-relevant，运行它有用 unrelated engineering patterns 污染 generation 的风险。

3. **Web research** — 与 repo mode 相同（见下方 subsection）。

Issue intelligence 不适用于 elsewhere mode。Slack research 对两种 modes 都是 opt-in（见下方 "Slack context"）。

#### Web Research（V5, V15）

两种 modes 中都是 always-on。当用户在 prompt 或早先回答中说 "no external research"、"skip web research" 或等价表达时跳过；此时从 dispatch 中省略 `ce-web-researcher`，并在 consolidated grounding summary 中注明 skip。

通过 sidecar cache 在 session 内复用 prior web research：cache file shape、reuse check、append behavior 和 platform-degradation rules 见 `references/web-research-cache.md`。在本 run 中第一次准备 dispatch `ce-web-researcher` 时读取它（以及之后每次 cache 可能适用的 dispatch）。

dispatch `ce-web-researcher` 时传入：focus hint、一段 brief planning context summary（一两句）和 mode。不要传 codebase content：该 agent 在外部操作。

#### Consolidated Grounding Summary（整合 Grounding Summary）

将所有 dispatched results 合并为 short grounding summary，使用这些 sections（省略无内容的 section）。Phase 1.5 会在 consolidation 完成后向同一个 summary 追加 `Topic axes` section：

- **Codebase context**（repo mode）— project shape、notable patterns、pain points、leverage points（project-defining files：AGENTS.md/CLAUDE.md/README.md/STRATEGY.md）或 **Topic context**（elsewhere mode）— topic shape、stated constraints、user-named pain points、opportunity hooks
- **User-named references**（repo mode，当 focus hint 命名 root-level `*.md` files 时）— 用户在 prompt 或 focus 中明确命名的 files 的 full content。Phase 2 将这些视为 constraint
- **Additional context**（repo mode，当发现其他 root-level markdown 但未被命名时）— 每个 file 的 one-line gist。Phase 2 将这些视为 background，不是 direction
- **Past learnings** — 来自 `docs/solutions/` 的 relevant institutional knowledge
- **Issue intelligence**（存在时，仅 repo mode）— 带 titles、descriptions、issue counts 和 trend directions 的 theme summaries
- **External context**（web research 运行时）— prior art、adjacent solutions、market signals、cross-domain analogies。V15 reuse 触发时注明 "(reused from earlier dispatch)"
- **Slack context**（存在时）— organizational context

**Failure handling（失败处理）。** Grounding agent failures 遵循 "warn and proceed"：绝不因 grounding failure 阻塞。如果 `ce-web-researcher` 失败（network、tool unavailable），log warning（"External research unavailable: {reason}. Proceeding with internal grounding only."）并继续。如果 elsewhere-mode intake 没有产出 usable context，在 grounding summary 中注明 context thin，让 Phase 2 sub-agents 用 broader generation 补偿。

**Slack context（Slack context，opt-in，两种 modes）** — 绝不 auto-dispatch。当用户请求 Slack context 且 Slack tools 可用时（在当前 environment 查找任何 `slack-researcher` agent 或 `slack` MCP tools），将 focus hint 传给 `ce-slack-researcher`，并与其他 Phase 1 agents 并行 dispatch。当 tools 存在但用户未请求时，在 grounding summary 中提到可用性，以便他们 opt in。当用户请求但没有可达 Slack tools 时，改为呈现 install hint。

### Phase 1.5：Topic-Surface Decomposition（Topic Surface 分解）

在 Phase 2 dispatching frame agents 前，将 topic 分解为 3-5 个 orthogonal **axes**，命名 *subject 中要思考哪些 aspects*。Phase 2 frames 决定 *how to think*（lens）；axes 决定 *what to think on*（surface）。如果没有 explicit axis list，parallel frames 往往会收敛到首次阅读时 subject 最 salient 的 interpretation：无论运行多少 frames，surface 的其他部分都不会被 examined。只有 lens diversity 不会产生 surface coverage。

此步骤是对已经在 context 中的 grounding summary 做一次 orchestrator-side analysis。没有 sub-agent dispatch，没有 additional grounding read，没有 user-facing question。

**Axis criteria（axis 标准）：**

- **3-5 axes（3-5 个 axes）。** 少于 3 表示 topic atomic：按下方规则跳过。多于 5 会 fragment dispatch，并在每个 axis 上产生 thin coverage。
- **Orthogonal（正交）。** 单个 idea 应自然落在一个 axis 上，而不是跨多个。合并严重重叠的 axes。
- **Derived from grounding（来自 grounding）。** grounding summary 包含 axes 命名的 substance；不要从 generic template 中选 axes（例如把 "discovery / engagement / retention" 应用到每个 topic）。
- **At the same level（处于同一层级）。** 不要在同一列表中混合 "the entire pricing page" 和 "the $9.99 tier copy"。
- **Named in the topic's language（使用 topic 自己的语言命名）。** "Send mechanics" 胜过 "outbound flow optimization"。使用 topic 读者会识别的 words，而不是关于 ideation 的 meta-language。

**Worked examples（illustrative，不是 template：从 actual grounding 派生）：**

| Topic（主题） | Axes（轴） |
|---|---|
| Social sharing of crossfire and convergence pages | Send mechanics; discovery (receive side); arrival/dwell experience; compounding over time; actor types (first-party, expert, reader) |
| Improve our authentication system | Sign-in flow; session management; account recovery; permissions; identity providers |
| Dark mode for our app | Visual surfaces; toggle UX; system-preference detection; asset variants; edge cases (third-party content) |
| Cache invalidation in the data layer | Trigger surfaces; coordination across replicas; staleness tolerance per data class; observability of invalidation events |

**Skip condition（跳过条件）。** 有些 subjects 是 atomic，抗拒 meaningful decomposition：single string output（name、tagline）、narrowly-scoped tactical fix（"the typo on line 47 of README"），或 candidate axes 本身 *就是* deliverable 的 topic（例如 "what surface should the API expose?"）。当无法生成 3+ 个通过上方 criteria 的 orthogonal axes 时，跳过 decomposition。在 grounding summary 中注明 `Decomposition skipped — atomic subject`，让 artifact 记录此选择。

**Surprise-me skip（Surprise-me 跳过）。** 在 surprise-me mode 中，没有 settled subject 可分解：不同 frames 会在 Phase 2 中 surface 不同 subjects，那里 cross-cutting synthesis step 承担类似 coverage role。在 surprise-me mode 中跳过 Phase 1.5，并在 grounding summary 中注明 `Decomposition skipped — surprise-me mode`。

将 axis list（或 skip-reason）追加到 consolidated grounding summary 的 `Topic axes` section 下。Phase 2 读取此 section，将 axes 织入 sub-agent prompts；Phase 3 用它做 axis-spread scoring；Phase 5 的 artifact template 将它包含在 Grounding Context 下。

### Phase 2：Divergent Ideation（发散式 Ideation）

在 critique 任何 idea 前，先生成完整 candidate list。

在 inherited model 上 dispatch parallel ideation sub-agents（不要 tier down：creative ideation 需要 orchestrator 的 reasoning level）。省略 `mode` 参数，让用户配置的 permission settings 生效。Dispatch count 是 mode-conditional：**仅当 Phase 0.2 检测到 issue-tracker intent 且 issue intelligence agent 返回 usable themes 时，使用 4 个 sub-agents**（见下方 override：cluster-derived frames cap 为 4）；**否则使用 6 个 sub-agents**，包括 Phase 1 中 intent 触发但未返回 themes 的 insufficient-issue-signal fallback。每个 agent 目标约 6-8 个 ideas（6 frames 下产出约 36-48 个 raw ideas，4 frames 下产出约 24-32 个；6-frame path 中 dedupe 后约 25-30 个 survivors，4-frame path 更少）。当 volume overrides 适用时调整 per-agent targets（例如 "100 ideas" 提高目标，"top 3" 可能改为降低 survivor count）。

给每个 sub-agent：grounding summary、focus hint、per-agent volume target、**Phase 1.5 的 topic axis list**（当 decomposition 产出时），以及只生成 raw candidates（not critique）的指令。每个 agent 的前几个 ideas 往往 obvious：push past them。每个 idea 都要 grounded in Phase 1 grounding summary。

**Axis spread instruction（axis 分布指令）。** 当 axis list 存在时，指示每个 sub-agent 将 ideas 分布到多个 axes：frame 的 lens 适用于每个 axis，但 ideas 不应全都 cluster 在一个 axis 上。每个 idea 必须 tagged with 它 targets 的 axis。frame 是 lens；axis list 是 surface map。一个 plausibly reaches 某 axis 的 frame，应先在那里产出至少一个 idea，再在不同 axis 上 double up。当 decomposition 被跳过（atomic subject 或 surprise-me）时，完全省略 axis instruction：不要在 dispatch time 发明 axes。

**Constraint vs background（约束 vs 背景）。** 在 dispatch prompt 中，将用户 prompt、focus hint，以及任何 *User-named references*（用户在 focus 中命名且 codebase-scan fully read 的 root-level files）标记为 *constraints*：违反它们的 ideas 无论 basis 如何都 out。将 grounding summary 的其余部分（codebase context、additional context、learnings、external context）标记为 *background*：informative，不 directive。Background 可以支持 idea 的 basis 并 inform direction；但当用户命名了不同 focus 时，它不能把 ideation 拉向 corpus 中最 loud 的内容。这是防止 grounding noise（用户未命名的无关 `FEEDBACK.md`、tangentially-cited prior-art result）违背 user intent 塑造 survivors 的主要防线。

为每个 sub-agent 分配不同 ideation frame，作为 **starting bias，而不是 constraint**。提示每个 agent 从分配的 perspective 开始，但跟随任何 promising thread：跨多个 frames 的 cross-cutting ideas 很有价值。

**Frame selection（frame 选择；mode-symmetric：repo 和 elsewhere modes 使用相同六个 frames）：**

1. **Pain and friction（痛点和摩擦）** — user、operator 或 topic-level pain points；持续 slow、broken 或 annoying 的内容。
2. **Inversion, removal, or automation（反转、移除或自动化）** — invert 某个 painful step、完全 remove it，或 automate it away。
3. **Assumption-breaking and reframing（打破假设与重构框架）** — 哪些被视为 fixed 的东西其实是 choice；向上一级或侧向 reframe。
4. **Leverage and compounding（杠杆与复利）** — 一旦做出就让许多 future moves 更便宜或更强的 choices；second-order effects。
5. **Cross-domain analogy（跨领域类比）** — 通过询问 completely different fields 如何解决 structurally analogous problem 来生成 ideas。grounding domain 是用户 topic；analogy domain 可以是任何其他地方（other industries、biology、games、infrastructure、history）。越过 obvious analogy，推进到 non-obvious ones。
6. **Constraint-flipping（约束翻转）** — 将 obvious constraint 反转到 opposite 或 extreme。如果 budget 是 10x 或 0 呢？如果 team 是 100 人或 1 人呢？如果没有 users，或有 1M 呢？即使 constraint flip 本身不现实，也使用 resulting design 作为 candidate。

**Issue-tracker mode override（issue-tracker mode 覆盖，仅 repo mode）。** 当 issue-tracker intent active 且 issue intelligence agent 返回 themes 时：每个 high/medium-confidence theme 成为一个 frame。如果 cluster-derived frames 少于 3 个，则按上方顺序用 6-frame default pool 中的 frames 补齐。总数 cap 为 4：issue-tracker mode 按设计保持 tighter dispatch。

**Per-idea output contract（per-idea 输出契约，所有 frames、所有 modes 统一）：**

每个 sub-agent 对每个 idea 返回此结构：

- **title**
- **summary**（2-4 句）
- **axis** — 当 Phase 1.5 产出 axis list 时必需。选择该 idea 最核心 target 的一个 axis；不要跨越。decomposition 被跳过时完全省略。
- **basis**（required, tagged）— 以下之一：
  - `direct:` quoted line / specific file / named issue / explicit user-supplied context
  - `external:` named prior art, domain research, adjacent pattern, with source
  - `reasoned:` explicit first-principles argument for why this move likely applies — not a gesture; the argument is written out
- **why_it_matters** — 将 basis 连接到该 move 的 significance
- **meeting_test** — 一行确认这值得 team discussion（当 Phase 0.5 检测到 tactical focus signals 时豁免）

Basis 是 required，不是 optional。如果 sub-agent 无法阐明至少一种 basis，该 idea 不 surface。要防止的 failure mode 是 generic "AI-slop" ideas：听起来 plausible，但缺少用户可验证的 basis。

**Generation rules（生成规则，所有 frames、所有 modes 统一）：**

- 每个 idea 都携带 articulated basis。Unjustified speculation 不 surface，无论听起来多 plausible。
- 偏向你的 frame 自然产生的 basis type：pain/inversion/leverage 倾向 `direct:`；analogy 和 constraint-flipping 倾向 `reasoned:`；assumption-breaking 混合。但不要排除其他 basis types。
- 将 meeting-test 作为 default floor：这个 idea 是否值得 team discussion？如果不值得，它低于 floor，不 surface。只有当 Phase 0.5 检测到 tactical focus signals 时，floor 才放松。
- 保持在 subject identity 内。Product expansions、new surfaces、new markets、retirements 和 architectural pivots 在 basis 支持时都是 fair game。Subject-replacement moves（abandoning the project、pivoting to unrelated domains、becoming a different organization）无论 basis 如何都 out。
- **Honor the asked scope。** 当 focus hint 命名 subject 的某一部分（larger product 中的 flow、stage、section 或 feature，例如 "account settings"、"onboarding flow"、"pricing page copy"、"gameplay rules"）时，在 *该 scope 内* 以 full ambition ideate。将 surface 扩展到整个 subject：当用户命名一个 slice 时，却提出 broader product 的 fundamental changes，即使没有发生 subject-replacement，也是 scope mismatch。Big-picture thinking 仍适用；它只是运行在用户命名的 bounded surface 内，而不是扩大 surface。

**Surprise-me mode addendum（Surprise-me mode 附加说明）。** 当 Phase 0.2 路由到 surprise-me 时，在每个 sub-agent 的 dispatch prompt 中包含此额外指令：

> 没有 user-specified subject。通过你的 frame lens 探索 Phase 1 material，并识别你认为对该 frame 最有趣的 subject(s)。不同 frames 找到不同 subjects 是 feature；cross-subject divergence 正是 surprise-me 有价值的原因。每个 idea 仍然必须携带 basis；basis 可以包含对 subject 本身的识别（为什么 *this* subject 值得通过你的 lens 进行 ideation，并引用 Phase 1 material 中指向它的 signals）。

所有 sub-agents 返回后：

1. Merge and dedupe 成一个 master candidate list。
2. Synthesize cross-cutting combinations：扫描来自不同 frames、组合后更强的 ideas。在 specified mode 中，预计最多 3-5 个 additions。**在 surprise-me mode 中，cross-cutting 是 magic layer**：frames 经常收敛到 overlapping subjects，或发现 complementary angles；预计 5-8 个 additions，并更关注此步骤。将跨多个 frame-chosen subjects 的 combinations 作为 distinctive surprise-me output pattern 呈现。
3. **Axis-coverage check（当 Phase 1.5 产出 axis list 时；否则跳过）。** dedupe 后统计每个 axis 的 ideas。对任何 zero ideas 的 axis，dispatch 一个 recovery sub-agent（任何 unused frame，或 lens 最适合 missing axis 的 frame，例如 usability axes 用 Pain & friction，distribution 或 compounding axes 用 Cross-domain analogy），专门 target 该 axis。recovery dispatch 携带相同 per-idea output contract，目标约 3-5 个 ideas。**Recovery 总数 cap 为 2 axes**：如果第一轮后超过 2 个 axes 为空，接受 thin coverage 而不是进一步 fan out。recovery 返回后，merge 进 master list 并再次 dedupe。在 rejection summary 中将未 recovered 的 empty axes 记录为 "axis: <name> — recovery skipped (cap reached)"，让 gap 对用户可见。
4. 如果提供了 focus，将 merged list 向其加权，但不排除更强的 adjacent ideas。
5. 有理由时，让 ideas 分布到多个 dimensions：workflow/DX、reliability、extensibility、missing capabilities、docs/knowledge compounding、quality/maintenance、leverage on future work。

**Checkpoint A (V17)（Checkpoint A）。** cross-cutting synthesis step 完成且 raw candidate list consolidated 后，立即写入 `<scratch-dir>/raw-candidates.md`（使用 Phase 1 捕获的 absolute path），内容包含带 sub-agent attribution 的完整 candidate list。这会在 Phase 3 critique 可能 compact context 之前，保护最昂贵的 output（6 个 parallel sub-agent dispatches + dedupe）。Best-effort：如果写入失败（disk full、permissions），log warning 并继续；checkpoint 不是 load-bearing。run 结束时不 cleanup（run directory 会保留，让 V15 cache 在同一 session 中跨 run-ids 可复用：见 Phase 6）。

在 merging and synthesis 之后、presenting survivors 之前，加载 `references/post-ideation-workflow.md`。此加载不可选。该文件包含 adversarial filtering rubric、artifact template、quality bar，以及 canonical Phase 6 handoff menu（Refine、Open and iterate in Proof、Brainstorm、Save and end）：这些 options 不出现在 main body 的任何位置。跳过加载会静默降低后续每一步质量：agent 会凭记忆 improvises menu，而不是呈现 documented options。"Quickly" 意味着更少 Phase 2 sub-agents，不是跳过 references。不要在 Phase 2 agent dispatch 完成前加载此文件。
