---
name: ce-plan
description: "为 multi-step tasks 创建 structured plans：software features、research workflows、events、study plans，或任何受益于 breakdown 的 goal。也可通过 interactive sub-agent review deepen existing plans。当用户说 'plan this'、'create a plan'、'how should we build'、'break this down'，或 brainstorm doc 已 ready for planning 时使用。使用 'deepen the plan' 或 'deepening pass' 进入 deepening flow。Exploratory requests 优先使用 ce-brainstorm。"
argument-hint: "[optional: feature description、requirements doc path、要 deepen 的 plan path，或任何待 plan task] [output:html]"
---

# 创建技术计划

**说明：当前年份是 2026。** 为 plans 标日期和搜索 recent documentation 时使用。

`ce-brainstorm` 定义要 build 的 **WHAT**。`ce-plan` 定义如何 build 的 **HOW**。`ce-work` 执行 plan。Prior brainstorm 是有用 context，但从不是 required：`ce-plan` 可从任何 input 工作：requirements doc、bug report、feature idea 或 rough description。

**Directly invoked 时，始终 plan。** 绝不要将 direct invocation classify 为 "not a planning task" 并 abandon workflow。如果 input 不清晰，询问 clarifying questions，或使用 planning bootstrap（Phase 0.4）建立足够 context：但始终留在 planning workflow。

此 workflow 产出 durable implementation plan。它 **不** implement code、run tests，或从 execution-time results 中学习。如果 answer 依赖 changing code 并观察结果，那属于 `ce-work`，不是这里。

## 交互方法

询问用户问题时，使用平台 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中展示 numbered options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。

一次只问一个问题。当存在 natural options 时，优先 concise single-select choice。

## 功能描述

<feature_description> #$ARGUMENTS </feature_description>

**如果上方 feature description 为空，询问用户：** "What would you like to plan? Describe the task, goal, or project you have in mind." 然后等待回复再继续。

如果 input 存在但 unclear 或 underspecified，不要 abandon：询问一两个 clarifying questions，或进入 Phase 0.4 的 planning bootstrap 建立足够 context。目标始终是帮助用户 plan，绝不是退出 workflow。

**重要：Plan document 中所有 file references 必须使用 repo-relative paths（例如 `src/models/user.rb`），绝不要使用 absolute paths（例如 `/Users/name/Code/project/src/models/user.rb`）。这适用于所有位置：implementation unit file lists、pattern references、origin document links 和 prose mentions。Absolute paths 会破坏跨 machines、worktrees 和 teammates 的 portability。**

## 核心原则

1. **以 requirements 作为真源**：如果 `ce-brainstorm` 产出了 requirements document，planning 应从它 build，而不是 re-invent behavior。
2. **记录 decisions，而不是 code**：Capture approach、boundaries、files、dependencies、risks 和 test scenarios。不要预写 implementation code 或 shell command choreography。当 pseudo-code sketches 或 DSL grammars 有助于 reviewer validate direction 时可以使用，但必须明确 framing 为 directional guidance，而不是 implementation specification。
3. **先 research，再 structuring**：Finalizing plan 前，在 warranted 时 explore codebase、institutional learnings 和 external guidance。
4. **按工作大小调整 artifact**：Small work 得到 compact plan。Large work 得到更多 structure。Philosophy 在每个 depth 保持一致。
5. **区分 planning 和 execution discovery**：在这里 resolve planning-time questions。明确将 execution-time unknowns defer 给 implementation。
6. **保持 plan portable**：Plan 应可作为 living document、review artifact 或 issue body 使用，不嵌入 tool-specific executor instructions。
7. **必要时轻量携带 execution posture**：如果 request、origin document 或 repo context 明确暗示 test-first、characterization-first 或其它 non-default execution posture，在 plan 中以 lightweight signal 反映它。不要将 plan 变成 step-by-step execution choreography。
8. **尊重用户命名的 resources**：当用户命名 specific resource：CLI、MCP server、URL、file、doc link 或 prior artifact，将其视为 authoritative input，而不是 suggestion。未知时先 discover（`command -v`、fetch、read），再假设 unavailable。用它替代 generic alternatives。如果失败或不存在，明确说明，不要 silent substitute。

## 计划质量标准

每个 plan 应包含：
- 清晰的 problem frame 和 scope boundary
- 可追溯回 request 或 origin document 的 concrete requirements traceability
- Proposed work 的 repo-relative file paths（绝不使用 absolute paths：见 Planning Rules）
- Feature-bearing implementation units 的 explicit test file paths
- 带 rationale 的 decisions，而不只是 tasks
- 要 follow 的 existing patterns 或 code references
- 每个 feature-bearing unit 的 enumerated test scenarios，足够 specific，让 implementer 无需自行 invent coverage 就知道 exactly what to test
- 清晰 dependencies 和 sequencing

当 implementer 可 confident start，且不需要 plan 替他们 write code 时，plan 就 ready。

## 工作流

### Phase 0：恢复、来源与范围

#### 0.0 解析输出模式

在任何其它 phase 触发前确定 `OUTPUT_FORMAT`。Output mode 是 **exclusive**：plan 写为 markdown（`.md`）或 HTML（`.html`），绝不同时写两者。Precedence：CLI arg > config > default（`md`），并有 hard pipeline-mode override。

**读取 config（skill load 时 pre-resolved）：**
!`cat "$(git rev-parse --show-toplevel 2>/dev/null)/.compound-engineering/config.local.yaml" 2>/dev/null || echo '__NO_CONFIG__'`

解析步骤：

1. **CLI arg。** 扫描 `$ARGUMENTS` 中以 literal prefix `output:` 开头的 token。如果找到，在将剩余内容作为 feature description 前移除该 token，并将其 value case-insensitively 匹配 `md` 和 `html`。
   - `output:` alone（无 value）→ no-op，fall through 到 step 2。
   - `output:<unknown>`（例如 `output:pdf`）→ drop token，fall through 到 step 2，并记住在 final resolution 后的 post-generation menu 上方 emit one-line note：`Ignored unknown output: value '<value>' — using <resolved_format> instead.` 其中 `<resolved_format>` 是 steps 2-4 后 `OUTPUT_FORMAT` 实际 resolved 的 value。不要在 note 中 hardcode `md`：当 config 设置 HTML 时会误导用户。
2. **Config。** 如果 step 1 未 resolve，且上方 pre-resolved YAML 有 **active（non-commented）** `plan_output:` key，其 value 匹配 `md` 或 `html`（case-insensitive），使用它。Missing、invalid 或 commented values silently fall through。Critical：以 `#` 开头的 lines 是 YAML comments，必须 ignored：shipped config template 包含 `# plan_output: html` 这类 commented examples 用于 document option，如果把它们匹配为 active settings，会在用户未 opt in 时 silently force HTML mode。
3. **Default。** 否则 `OUTPUT_FORMAT=md`。
4. **Pipeline override。** 当从 LFG 或任何 `disable-model-invocation` context invoke 时，无论 steps 1-3 如何，强制 `OUTPUT_FORMAT=md`。`ce-work` 和其它 automated downstream consumers 可 reliably parse markdown；pipeline runs 中 HTML 是 unnecessary friction。

**Token-parsing convention：** 只有 literal-prefix flag tokens（`output:`、`mode:`、适用时的 `delegate:`）会被 consumed and stripped。其它 `<word>:<word>` tokens：包括 feature description 中可能出现的 conventional commit prefixes，如 `feat:`、`fix:`、`chore:`，都 verbatim pass through。

**基于 resolved value 加载 format-rendering reference。** 两种 format 中 section content 相同；presentation 不同。两个 references 都与 `references/plan-sections.md` 配对，后者描述 plan 无论 format 如何都包含什么。

- 当 `OUTPUT_FORMAT=md` 时，读取 `references/markdown-rendering.md` 获取 format principles。
- 当 `OUTPUT_FORMAT=html` 时，读取 `references/html-rendering.md` 获取 format principles。

#### 0.1 在适当时恢复现有计划工作

如果用户 reference existing plan file，或 `docs/plans/` 中有 obvious recent matching plan：
- 读取它
- 确认是 update in place 还是 create new plan
- 如果 updating，只 revise 仍 relevant 的 sections。Plans 不携带 per-unit progress state：progress 由 `ce-work` 从 git 派生，因此没有要跨 edits preserve 的 progress

**Deepen intent：** 在 reference plan 时出现 "deepen"（或 "deepening"）是 deepening fast path 的 primary trigger。当用户说 "deepen the plan"、"deepen my plan"、"run a deepening pass" 或类似表达时，target document 是 `docs/plans/` 中的 **plan**，不是 requirements document。使用用户提供的任何 path、keyword 或 context 识别正确 plan。如果提供 path，verify 它实际是 plan document。如果 match 不 obvious，继续前向用户 confirm。

像 "strengthen"、"confidence"、"gaps" 和 "rigor" 这样的词本身 **不足以** 触发 deepening。这些词会出现在 normal editing requests 中（"strengthen that section about the diagram"、"there are gaps in the test scenarios"），不应导致 holistic deepening pass。只有当 request 明确 target 整个 plan，且没有命名 specific section 或 content area to change 时，才将它们视为 deepening intent；即便如此，也优先在进入 deepening flow 前向用户 confirm。

一旦 plan 已识别且看起来 complete（所有 major sections present、implementation units defined、`status: active`）：
- **Routing 先基于 file extension，再看 frontmatter。** HTML plans（`.html`）始终是 software plans：html-rendering invariant 禁止 YAML frontmatter，因此 missing frontmatter 对 HTML 不是 non-software signal。将 visible-header metadata（title、status、date）视为 frontmatter equivalent。
  - **`.html` plan：** 在 **interactive mode** 中 short-circuit 到 Phase 5.3（Confidence Check and Deepening）。绝不要基于 missing YAML route 到 `references/universal-planning.md`。
  - **带 YAML frontmatter 的 `.md` plan：** 在 **interactive mode** 中 short-circuit 到 Phase 5.3。
  - **无 YAML frontmatter 的 `.md` plan**（non-software plans 使用 simple `# Title` heading 和 `Created:` date）：route 到 `references/universal-planning.md` 进行 editing 或 deepening，而不是 Phase 5.3。Non-software plans 不使用 software confidence check。

Phase 5.3 short-circuit 避免重新运行 full planning workflow，并让用户控制 integrated 哪些 findings。

Normal editing requests（例如 "update the test scenarios"、"add a new implementation unit"、"strengthen the risk section"）不应触发 fast path：它们遵循 standard resume flow。

如果 plan 已有 `deepened: YYYY-MM-DD` frontmatter field，且没有 explicit user request 要 re-deepen，fast path 仍应用相同 confidence-gap evaluation：它不强制 deepening。

**Resume 会 preserve existing artifact format，pipeline mode 除外。** Resuming existing plan 时，resume run 按 existing artifact 使用的 format 写回：existing file 是 `.md` 则 markdown，是 `.html` 则 HTML，这样 resume 不会 silently change artifact shape。本 run 的 explicit `output:` arguments 会 override（例如用 `output:md` resume `.html` plan 会将 artifact switch 到 markdown）。Pipeline mode（LFG、任何 `disable-model-invocation` context）始终按 Phase 0.0 获胜：即使 resuming existing `.html` plan，pipeline runs 也强制 `OUTPUT_FORMAT=md`，让 downstream automation 收到其预期的 markdown shape。Resume 会在 parallel path（`<plan-basename>.md`）rewrite markdown file，原 `.html` 保持 untouched。

#### 0.1b 分类任务领域

如果 task 要求 build、modify、refactor、deploy 或 architect software（code、schemas、infrastructure），继续 Phase 0.2。

按 task-type classify，而不是按 topic。仅仅 *references* code、repo、API 或 database 的 request，并不自动是 software work：building 或 modifying code 是 software；investigating 或 analyzing 它是 answer-seeking question。"How often does X star repos — is it a big deal?" 或 "how does our approach compare to Y?" route 到 `references/universal-planning.md`（answer-seeking），而不是 implementation-plan path。

如果 domain genuinely ambiguous（例如 "plan a migration" 但没有其它 context），routing 前询问用户。

否则，读取 `references/universal-planning.md` 并改用该 workflow。跳过所有 subsequent phases。Named tools 或 source links 不改变此 routing：它们是 inputs，按 Core Principle 8 处理。

#### 0.2 查找上游需求文档

在询问 planning questions 前，搜索 `docs/brainstorms/` 中匹配 `*-requirements.md` 或 `*-requirements.html` 的 files（ce-brainstorm 会按其 resolved output format emit 对应 extension；二者都是 valid upstream requirements docs，任一都可作为 plan 的 `origin:`）。

**Relevance criteria（相关性标准）：** Requirements document relevant 的条件：
- topic 在语义上匹配 feature description
- 它在最近 30 天内创建（如果 document 明显仍 relevant 或明显 stale，可用 judgment override）
- 它看起来覆盖相同 user problem 或 scope

如果多个 source documents match，在可用时使用平台 blocking question tool 询问使用哪个（见 Interaction Method）。否则，在 chat 中 present numbered options，并等待用户回复再继续。

#### 0.3 将来源文档作为主要输入

如果 relevant requirements document 存在：
1. Thoroughly 读取它
2. Announce 它将作为 planning 的 origin document
3. Carry forward 以下全部：
   - problem frame（问题框架）
   - Actors（A-IDs）、Key Flows（F-IDs）和 Acceptance Examples（AE-IDs）（如果存在）：将这些 preserve 为 implementation units 必须 honor 的 constraints
   - Requirements 和 success criteria
   - Scope boundaries（如果存在，包含 "Deferred for later" 和 "Outside this product's identity" subsections）
   - Key decisions 和 rationale
   - Dependencies 或 assumptions
   - Outstanding questions，并 preserve 它们是 blocking 还是 deferred
4. 将 source document 作为 planning 和 research 的 primary input
5. 在 plan 中用 `(see origin: <source-path>)` reference important carried-forward decisions
6. 不要 silently omit source content：如果 origin document 讨论了它，plan 必须 address，即使只是 briefly。Finalizing 前，scan origin document 的每个 section，verify nothing was dropped。

如果不存在 relevant requirements document，planning 可直接从用户 request 继续。

#### 0.4 Planning Bootstrap（无需求文档或输入不清晰）

如果不存在 relevant requirements document，或 input 需要更多 structure：
- 评估 request 是否已经足够 clear，可 direct technical planning：如果是，继续 Phase 0.5
- 如果 ambiguity 主要是 product framing、user behavior 或 scope definition，推荐 `ce-brainstorm` 作为 suggestion：但始终也 offer 在这里继续 planning
- 如果用户想在这里继续（或已明确想要 plan），运行下方 planning bootstrap

Planning bootstrap 应 establish：
- problem frame（问题框架）
- intended behavior（预期行为）
- Scope boundaries 和 obvious non-goals
- success criteria（成功标准）
- Blocking questions 或 assumptions

保持此 bootstrap brief。它用于 preserve direct-entry convenience，不用于替代 full brainstorm。

如果 bootstrap uncover major unresolved product questions：
- 再次 recommend `ce-brainstorm`
- 如果用户仍想继续，proceeding 前要求 explicit assumptions

如果 bootstrap reveals 不同 workflow 更适合用户：

- **Bug-shaped prompt**（用户描述 broken behavior："fix the bug where X"、error message、regression、"doesn't work"）。只要 bug surface reachable（在 cwd 中，或 named repo 可在另一本地路径找到），surface `ce-debug` 作为 route-out option，并同时提供继续 `ce-plan`。当 named code 在本地任何地方都找不到时，静默留在 `ce-plan`：对 unreachable surfaces，paper-planning 是唯一有用 output。

  **当 bug 位于另一本地路径（不是 cwd）时：**
  - 在任何 cross-repo investigation **之前** 明确 announce target：会读取哪个 path，以及 plan outputs 会落在哪里（default：target repo 的 `docs/plans/`，不是 cwd 的）。
  - Default：从 target repo 进行 investigation 和 plan-write。用户可 interrupt 来 redirect（switch context、paper-plan、abandon 等）。不要 location menu：announcement 已让 cross-repo nature 可见，用户如果想要 unusual path 会开口。
  - Announcing 并 proceeding 后，触发 standard ce-debug routing menu（继续 `ce-plan` vs switch to `ce-debug`）：shape 与 in-cwd case 相同。Cross-repo location 和 ce-debug skill routing 是 orthogonal decisions；不要将它们 merge 成单个问题。

  原则上读取另一路径的 code 没问题：那只是 file access。要避免的伤害是 silent operation on the wrong repo，尤其是将 plan doc 写到不会被 discover 的位置（busyblock plan 落到 `cli-printing-press/docs/plans/` 就是 discoverability disaster）。Announcement requirement 让 target 可见；investigation 和 outputs 都 default 到 target repo，尊重用户 stated intent（他们命名了该 repo）；orthogonal ce-debug menu 保持 skill-choice question 干净。

  Accessibility classification 是 conservative，在 monorepos、dependency bugs 或 renames 后可能 under-suggest。用户始终可手动 invoke `/ce-debug`。

  **Headless mode**：完全跳过 ce-debug suggestion menu；default 为继续 `/ce-plan`（用户 explicit invocation）。没有 synchronous user 可 resolve route-out choice，auto-routing 到 ce-debug 会未经授权 mid-flight change skill。

- **Clear task ready to execute**（known root cause、obvious fix、无 architectural decisions）：suggest `ce-work` 作为 faster alternative，并同时提供继续 planning。由用户决定。

#### 0.5 在规划前分类未决问题

如果 origin document 包含 `Resolve Before Planning` 或类似 blocking questions：
- Proceeding 前 review 每一个
- **只有当** 它实际是 technical、architectural 或 research question 时，才 reclassify 为 planning-owned work
- 如果它会 change product behavior、scope 或 success criteria，将其保留为 blocker

如果仍有 true product blockers：
- Clearly surface 它们
- 可用时使用平台 blocking question tool（见 Interaction Method）询问用户是否：
  1. Resume `ce-brainstorm` 来 resolve 它们
  2. 将它们 convert 为 explicit assumptions 或 decisions 并继续
- True blockers unresolved 时，不要继续 planning

#### 0.6 评估计划深度

将 work classify 为以下 plan depths 之一：

- **Lightweight**：小型、边界清楚、低歧义
- **Standard**：普通 feature 或 bounded refactor，有一些 technical decisions 要 document
- **Deep**：cross-cutting、strategic、高风险或高度模糊的 implementation work

如果 depth unclear，询问一个 targeted question，然后继续。

#### 0.7 Solo-Mode 范围综合

向用户 surface call-outs：scope 或 approach 中那些 user input 会 materially change plan 的 specific forks，让 scope 可在 **Phase 1 research 被消耗前** corrected。Sub-agent dispatch（repo-research-analyst、learnings-researcher 等）是 expensive next step，此 phase 防止在其上 wasted effort。

仅在 **solo invocation** 中 fire：Phase 0.2 未找到 upstream brainstorm doc，且 Phase 0.4 留在 ce-plan（未 route 到 ce-debug、ce-work 或 universal-planning），且 Phase 0.5 cleared（无 unresolved blockers），且不在 Phase 0.1 fast paths（resume normal、deepen-intent）上。每个 guard 都是 explicit conditional。任何 guard fails 时完全跳过 Phase 0.7：brainstorm-sourced invocations 改为 defer 到 Phase 5.1.5。

**Composing scoping synthesis 前读取 `references/synthesis-summary.md`。** 它携带 affirmability test、keep-test criteria、detail test、summary shape budgets、granularity rules、anti-patterns、revision-vs-confirmation discipline、doc-shape routing、soft-cut behavior、self-redirect support、worked PII compression example，以及完整 headless-mode routing：这些都是 well-shaped synthesis 所必需。

**Required gate output：不要跳过；不允许 silent proceeding。** Compose internal three-bucket scope draft（Stated / Inferred / Out of scope：这是供 Phase 5.2 plan-body routing 使用的 internal thinking，不是下方 chat output）。Derive call-outs（user input materially changes plan 的 specific forks），然后在继续 Phase 1 前，在 chat 中 emit 下方两个 literal templates 之一。

**Synthesis 是 pre-plan-write。** Agent 尚不知道 plan-write 会如何 sequence work。不要在 synthesis 中声称 PR count（"one PR"）、commit/branch shape、effort 或 time estimates、Implementation Unit boundaries 或 exact file paths。Synthesis surface 此刻可知的 decisions：对 solo variant 来说，就是用户 request、Phase 0.4 bootstrap dialogue，以及 agent 自身 internal three-bucket draft。Phase 1 research 尚未发生，也没有 upstream brainstorm；不要声称来自二者的 grounding。剩余内容由 plan-write 产生。即使 agent 在 session 更早形成了 plan-write opinions，此规则仍成立：这些 opinions 在 plan-write 前保持 internal。

**Summary shape：** summary 是 **scope claim**：plan 会 target 什么，不会 target 什么，处于 affirm-or-redirect level。它 **不是** Implementation Units enumeration。Form 可以是 prose、bullets 或 mix；tier budgets 是 **ceilings，不是 targets**（Lightweight 1-3 lines；Standard 最多 3-5 lines 或 2-4 bullets；Deep 最多 4-6 lines 或 3-6 bullets）。每个 bullet 1-2 lines，conversational 而非 documentary。没有更多内容时，少就是正确。Keep test、detail test 和 source-vocabulary discipline 见 reference。

**不要 enumerate touch surface。** "The touch surface is..."、"This plan touches..."、"The implementation reaches into..." 这类句子是 plan-pitch leaks。File paths、module names、directory introductions 和 per-file change descriptions 属于 plan body（Phase 5.2 的 Implementation Units），不属于 synthesis。Synthesis 命名 plan targets 的 *what*，不是 code lives 的 *where*。

**Pre-emit scans。** Emit synthesis 前，scan output：
- Bare ID references（`AE\d+`、`R\d+`、`F\d+`、`A\d+`、`U\d+`）→ 替换为 plain names。
- File paths（`path/like.md`、`path/like.py` 等）→ cut，除非 path 本身就是 call-outs 中 explicit fork 的 topic。

**Auto-proceed 的 tier guard：** auto-proceed path（announce 而不等待 confirmation）只在 plan depth 为 **Lightweight 且 zero call-outs survive** 时 fire。Standard 和 Deep plans 始终 fire confirmation gate，即使 zero call-outs：checkpoint 来自 substance，不是 interaction history。

**Confirmation template（Standard/Deep 无论 call-out count，或任何 tier 有一个或多个 surviving call-outs）：**

````text
Based on your request and our brief discussion, here's the scope I'm proposing to plan against:

[scope claim — what the plan will target, what it will not; affirm-or-redirect level; NOT an enumeration of Implementation Units]

**Call outs:** (omit this header when zero forks survived the keep test)
- [用 1-2 行写 decision-level fork：命名选择，并可在括号中写一个从句的 trade-off。不要写多句 rationale，不要写 "my default is X" 式 pitch]

确认后我会基于这个 scope 开始 research。（如果这件事比你最初想的更大，也可以 redirect 到 /ce-brainstorm；我会停在这里并为你加载它。）
````

继续 Phase 1 前等待用户 confirmation。

**Auto-proceed template（仅 Lightweight with zero call-outs）：**

````text
正在规划：[1-3 行 scope claim]

没有需要你权衡的开放决定 — 我会继续 research。如果我理解错了 scope，请随时打断。
````

然后不使用 blocking question，继续 Phase 1。

**Headless mode**：compose internal draft，但跳过 stage 2（chat-time call-outs）：没有 synchronous user 可 confirm。照常继续 Phase 1 research。在 plan-write time（Phase 5.2），internal draft 中的 Inferred bets route 到 plan 的 `## Assumptions` section，而不是 Key Technical Decisions。完整 routing 见 `references/synthesis-summary.md` Headless mode。

### Phase 1：收集上下文

#### 1.1 本地调研（始终运行）

准备 concise planning context summary（一两段），作为 input 传给 research agents：
- 如果 origin document 存在，summarize 该 document 的 problem frame、requirements 和 key decisions
- 否则直接使用 feature description
- 如果 `STRATEGY.md` 存在，读取它，并在 summary 中包含 relevant pieces（target problem、approach、active tracks），让 downstream research 和 planning decisions anchored to product strategy
- 如果 repo root 存在 `CONCEPTS.md`，读取它：其 definitions 是 domain entities、named processes 和 status concepts 的 canonical names。Plan 时使用这些 terms，而不是 synonyms。

并行运行这些 agents：

- Task ce-repo-research-analyst(Scope: technology, architecture, patterns. {planning context summary})
- Task ce-learnings-researcher(planning context summary)

第一项收集技术栈、架构和 patterns；第二项收集仓库内已有 learnings。保留上述 Task invocation 的英文参数形式，作为跨 runtime 的调用提示。

收集：
- Technology stack 和 versions（section 1.2 用来做更 sharp 的 external research decisions）
- 要 follow 的 architectural patterns 和 conventions
- Implementation patterns、relevant files、modules 和 tests
- Materially affects plan 的 AGENTS.md guidance；CLAUDE.md 仅在 present 时作为 compatibility fallback 使用
- `docs/solutions/` 中的 institutional learnings
- 当 `STRATEGY.md` present 时的 product strategy context：flag 任何偏离 active tracks 或 stated approach 的 plan decisions

**Slack context（opt-in，需用户明确启用）：** 绝不 auto-dispatch。按 condition route：

- **Tools available + user asked**：将 planning context summary 传给 `ce-slack-researcher`，并与其它 Phase 1.1 agents 并行 dispatch。如果 origin document 有 Slack context section，verbatim 传入，让 researcher 聚焦 gaps。将 findings 纳入 consolidation。
- **Tools available + user didn't ask**：在 output 中 note："Slack tools detected. Ask me to search Slack for organizational context at any point, or include it in your next prompt."
- **No tools + user asked**：在 output 中 note："Slack context was requested but no Slack tools are available. Install and authenticate the Slack plugin to enable organizational context search."

#### 1.1b 检测执行姿态信号

判断 plan 是否应携带 lightweight execution posture signal。

查找以下 signals：
- 用户明确要求 TDD、test-first 或 characterization-first work
- Origin document 要求 test-first implementation，或对 legacy code 做 exploratory hardening
- Local research 显示 target area 是 legacy、weakly tested 或 historically fragile，暗示 changing behavior 前需要 characterization coverage

当 signal clear 时，在 relevant implementation units 中 silently carry forward。

只有当 posture 会 materially change sequencing 或 risk，且无法 responsibly inferred 时，才询问用户。

#### 1.2 决定是否做外部调研

基于 origin document、user signals 和 local findings，判断 external research **是否** adds value，以及如果有价值，属于 **哪种**。按三阶段 resolve：explicit-request priority、intent classification，然后是下方 implicit signals。

**Stage 1：explicit request 优先。** 如果 user prompt **或** origin requirements document 明确要求 external input：这是 answer lives outside the repo 的 signal，例如 competitor/prior-art comparison、"what should we borrow"、"from the web"、"best practices"、"official docs"、"alternatives to"、market scan，或命名要 consult 的 specific external technology，那么 external research 是 **required**，无论 local patterns 看起来多强。该 list 是 illustrative；根据 signal，而不是 exact phrase 判断：任何 clearly points outside the repo 的 wording 都 qualify。下方 skip conditions **不** 适用于 explicit request。唯一 override 是 explicit opt-out（"no web research"、"skip external research"）：honor 它、skip 并 note。Improvement 或 quality verbs（"improve"、"make better"）本身不携带 external signal，也绝不单独触发 research。

**Stage 2：Classify research intent（分类 research 意图）**（无论 external research 是由 Stage 1 还是下方 implicit signals 触发），让 Phase 1.3 正确 route。使用此 mechanical test，而不是 fixed phrase list：
- **Implementation-guidance（实现指导）**：approach 或 technology 已 settled；问题是 *how to build it well*（best practices、version-specific docs、API constraints、known pitfalls、deprecations）。
- **Landscape / option-discovery（格局/选项发现）**：问题是 *what options or prior art exist*（competitor scans、build-vs-buy、library/provider selection、prior art、market signals、cross-domain analogies）。
- **Mixed（混合）**：两者都有：先 discover unsettled external option set，再为 shortlisted choice research implementation guidance。

**Stage 3：Implicit signals（隐含信号）** 在没有 explicit request 触发时决定是否 research。

**Read between the lines（读懂言外之意）。** 注意当前 conversation 中的 signals：
- **User familiarity（用户熟悉度）**：他们是否指向 specific files 或 patterns？他们可能很熟悉 codebase。
- **User intent（用户意图）**：他们想要 speed 还是 thoroughness？Exploration 还是 execution？
- **Topic risk（主题风险）**：Security、payments、external APIs 不管 user signals 如何，都 warrant more caution。
- **Uncertainty level（不确定性水平）**：Approach clear，还是仍 open-ended？

**利用 ce-repo-research-analyst 的 technology context：**

ce-repo-research-analyst output 包含 structured Technology & Infrastructure summary。用它做更 sharper 的 external research decisions：

- 如果检测到 specific frameworks 和 versions（例如 Rails 7.2、Next.js 14、Go 1.22），将这些 exact identifiers 传给 ce-framework-docs-researcher，让它 fetch version-specific documentation
- 如果 feature 触及 scan 发现 repo 中 well-established 的 technology layer（例如 planning new background job 时已有 Sidekiq jobs），lean toward skipping external research：local patterns 很可能 sufficient
- 如果 feature 触及 scan 发现 absent 或 thin 的 technology layer（例如 planning new gRPC service 时没有 existing proto files），lean toward external research：没有 local patterns 可 follow
- 如果 scan 检测到 deployment infrastructure（Docker、K8s、serverless），在传给 downstream agents 的 planning context 中 note，让它们 account for deployment constraints
- 如果 scan 检测到 monorepo 并 scoped 到 specific service，将该 service 的 tech context 传给 downstream research agents：不要传所有 services 的 aggregate。如果 scan surfaced workspace map 但未 scoping，继续 research 前用 feature description 识别 relevant service

**以下情况始终 lean toward external research：**
- topic 高风险：security、payments、privacy、external APIs、migrations、compliance
- Codebase 缺少 relevant local patterns：此 plan 所需 pattern 的 direct examples 少于 3 个
- Local patterns 存在于 adjacent domain，但不是 exact one：例如 codebase 有 HTTP clients 但没有 webhook receivers，或有 background jobs 但没有 event-driven pub/sub。Adjacent patterns 表明 team 熟悉 technology layer，但可能不了解 domain-specific pitfalls。当此 signal present 时，external research query 应专门围绕 domain gap，而不是 general technology
- 用户正在 explore unfamiliar territory
- Technology scan 发现 relevant layer 在 codebase 中 absent 或 thin
- Plan recommendations 依赖 genuinely external、**unsettled** option set：采用哪个 library、provider 或 approach，或 competitors/prior art 做什么；**即使 local implementation patterns 很强**（intent: landscape）。此 implicit landscape trigger 受三道 gates 限制：(a) option set 确实 lives outside repo，(b) decision materially shapes plan（KTD、dependency 或 architecture choice，而不是 incidental detail），且 (c) 不存在 settled local 或 team choice。Improvement verbs alone 永不满足此条件。

**Skip external research 的条件**（仅当 Stage 1 未发现 explicit request：explicit request 绝不 skipped）：
- Codebase 已显示 strong local pattern：多个 direct examples（不是 adjacent-domain）、recently touched、following current conventions
- 用户已经知道 intended shape
- Additional external context practical value 很低
- Technology scan 发现 relevant layer well-established，且有 existing examples 可 follow

当 explicit request *确实* 触发，但 settled local 或 team choice 已存在时，**narrow research，而不是 skip**：research chosen library/pattern 的 current pitfalls、docs 和 practices，而不是重新 survey entire option set。

继续前 briefly announce decision 和 intent。Examples：
- "你的 codebase 对此已有稳固 patterns。我会跳过 external research 继续。"
- "这涉及 payment processing，所以我会先 research current best practices（implementation-guidance）。"
- "你要求判断可从 competitors 借鉴什么，所以我会先做 landscape scan（landscape/option-discovery）。"

#### 1.3 外部调研（条件触发）

如果 Step 1.2 表示 external research 有用，按 Stage 2 classified 的 **intent** dispatch，使用平台 subagent primitive（Claude Code 中的 `Agent`/`Task`、Codex 中的 `spawn_agent`、Pi 中的 `subagent`）。对 `ce-web-researcher`，传 focus hint 加 planning context summary，且 **不要** 传 codebase content：它在 external 范围工作。

- **Implementation-guidance**：并行运行：
  - Task ce-best-practices-researcher(planning context summary)
- Task ce-framework-docs-researcher(planning context summary, 如果 Phase 1.1 中有 exact frameworks/versions，则一并传入)
- **Landscape / option-discovery**：Task ce-web-researcher(focus hint, planning context summary)。当 request targets code host 上的 projects（例如 "competitors on GitHub"）时，在 focus hint 中命名 discovery dimensions：project names and URLs、release recency and activity、CLI/UX shape、install path、docs and examples、plugin/extension surfaces、recurring issue themes 和 license：star counts 仅作为 weak signal。
- **Mixed**：**sequential, not parallel**：先运行 `ce-web-researcher` map landscape 并产出 shortlist；然后仅当 shortlisted technologies 的 details materially shape plan 时，针对它们运行 `ce-framework-docs-researcher` 和/或 `ce-best-practices-researcher`。

**Tool-unavailable handling（工具不可用处理）。** `ce-web-researcher` 会 self-check web tools，缺失时 stop。绝不要因此 block：如果它报告 research unavailable，或任何 researcher fails，warn 并继续，并将 gap 带入 Phase 1.4，让 plan 诚实记录它；尤其是用户明确 requested external research 时，silent skip 会让 plan 看起来 evidence-based，但实际不是。

#### 1.4 汇总调研

汇总：
- Relevant codebase patterns 和 file paths
- relevant institutional learnings（相关组织内 learnings）
- 如果 gathered，来自 Slack conversations 的 organizational context（与 feature relevant 的 prior discussions、decisions 或 domain knowledge）
- 如果 gathered，external references、prior art、competitor/landscape findings 和 best practices
- Related issues、PRs 或 prior art
- 任何应 materially shape plan 的 constraints

**将 external findings 落在 decisions 中，而不是 appendix。** 任何运行过的 external research 都必须在它改变 choice 的地方 surface：Key Technical Decisions rationale、Alternatives、Risks 或 Sources & Research；不要作为 detached list 且对 plan 没影响。如果 finding 没有 shape anything，它就不是 load-bearing；不要用它 pad plan。

**标记 external research 是否 load-bearing。** Record 一个 internal flag：external findings 是否 materially shape KTD、Alternative、Scope boundary 或 Risk？此 flag 只回答该问题：它 **不** gate research 是否运行（该 decision 属于 Phase 1.2）。Phase 5.3.2 读取它来决定是否进入 confidence-scoring pass。

**Record requested-but-unavailable（记录已请求但不可用）。** 如果用户明确 requested external research 但无法运行（web tools unavailable、researcher failed），在 plan 中将其声明为 assumption 或 open question，而不是将 plan 呈现为 externally grounded。

#### 1.4b 当调研发现外部契约面时重新分类深度

如果 current classification 是 **Lightweight**，且 Phase 1 research 发现 work 触及以下任何 external contract surfaces，reclassify 为 **Standard**：

- 被 external systems、CI 或其它 repositories 消费的 environment variables
- exported public APIs、CLI flags 或 command-line interface contracts
- CI/CD configuration files（CI/CD 配置文件：`.github/workflows/`、`Dockerfile`、deployment scripts）
- 被 downstream consumers import 的 shared types 或 interfaces
- external URLs 引用或其它 systems link 到的 documentation

这确保 flow analysis（Phase 1.5）运行，且 confidence check（Phase 5.3）应用 critical-section bonuses。Briefly announce reclassification："Reclassifying to Standard — this change touches [environment variables / exported APIs / CI config] with external consumers."

#### 1.5 Flow 和边界情况分析（条件触发）

对 **Standard** 或 **Deep** plans，或当 user flow completeness 仍 unclear 时，运行：

- Task ce-spec-flow-analyzer(planning context summary, research findings)

该 Task 用 planning context summary 和 research findings 检查 flow、边界情况与 handoff gaps；保留英文 invocation，确保不同 runtime 能按原提示 dispatch。

使用 output 来：
- Identify missing edge cases、state transitions 或 handoff gaps
- Tighten requirements trace 或 verification strategy
- 只添加 materially improve plan 的 flow details

### Phase 2：解决规划问题

从以下来源构建 planning question list：
- Origin document 中的 deferred questions
- Repo 或 external research 中 discovered 的 gaps
- 产出 useful plan 所需的 technical decisions

对每个 question，判断它应当：
- **Resolved during planning**：answer 可从 repo context、documentation 或 user choice 得知
- **Deferred to implementation**：answer 依赖 code changes、runtime behavior 或 execution-time discovery

只有当 answer materially affects architecture、scope、sequencing 或 risk，且无法 responsibly inferred 时，才询问用户。可用时使用平台 blocking question tool（见 Interaction Method）。

此 phase **不要** run tests、build app 或 probe runtime behavior。目标是 strong plan，不是 partial execution。

### Phase 3：组织计划结构

#### 3.1 标题和文件命名

- Draft clear、searchable title，使用 conventional format，如 `feat: Add user authentication` 或 `fix: Prevent checkout double-submit`
- 确定 plan type：`feat`、`fix` 或 `refactor`
- 按 repository convention 构建 filename：`docs/plans/YYYY-MM-DD-NNN-<type>-<descriptive-name>-plan.md`
  - 如果 `docs/plans/` 不存在，创建它
  - 检查今天日期的 existing files，确定 next sequence number（zero-padded to 3 digits，从 001 开始）
  - Descriptive name 保持 concise（3-5 words）且 kebab-cased
  - Examples（示例）：`2026-01-15-001-feat-user-authentication-flow-plan.md`、`2026-02-03-002-fix-checkout-race-condition-plan.md`
  - Avoid：missing sequence numbers、"new-feature" 这类 vague names、invalid characters（colons、spaces）

#### 3.2 Stakeholder 和影响感知

对 **Standard** 或 **Deep** plans，briefly consider 谁会受此 change 影响：end users、developers、operations、other teams，以及这应如何 shape plan。对 cross-cutting work，在 System-Wide Impact section 中 note affected parties。

#### 3.3 将工作拆分为 Implementation Units

将 work 拆成 logical implementation units。每个 unit 应代表一个 meaningful change，implementer 通常可将其作为 atomic commit land。

好的 units：
- 聚焦一个 component、behavior 或 integration seam
- 通常触及 small cluster of related files
- 按 dependency 排序
- 足够 concrete，可在不预写 code 的情况下 execution

避免：
- 2-5 分钟级别的 micro-steps
- 跨 multiple unrelated concerns 的 units
- 过于 vague，以至于 implementer 仍需 invent plan 的 units

每个 unit 携带 Phase 3.5 分配的 stable plan-local **U-ID**（`U1`、`U2` …）。U-IDs 会跨 reordering、splitting 和 deletion 保留：new units 使用 next unused number，gaps 没问题，existing IDs 绝不 renumber。这让 `ce-work` 可跨 plan edits unambiguously reference units。

#### 3.4 高层技术设计

当 plan 的 technical approach 具有 prose alone 难以承载的 shape 时：components 间 architecture、processes 间 sequencing、state machines、branching gates、lifecycles、quantitative comparisons，包含一个 High-Level Technical Design section 来 convey shape。Exact form（component diagram、sequence、swim lane、flowchart、state machine、decision matrix、pseudo-code grammar、bar chart for sizing concerns）由 agent 按 artifact 决定：选择能让 reader 最快理解 content 的形式。

Section catalog（包括 HTD 的 "include when material" criterion）见 `references/plan-sections.md`。Visualizations 如何在 target format 中 render（markdown 中 mermaid，HTML 中 inline SVG；HTML 时包含 halo、contrast 和 label placement 的 layout-legibility principles）见 Phase 0.0 加载的 format-rendering reference。

当 plan approach 是 prose 可直接 convey 的 one-paragraph pattern application 时，跳过此 section。HTD 的存在必须以 genuinely benefits from visualization 的 content 赚回其成本。

Plan diagrams 与 prose 一起 render authoritative content：它们不是 "directional sketches."。不要给 plan diagrams 添加 *"directional guidance for review, not implementation specification"* 这类 hedging captions；prose-is-authoritative rule 已处理 disagreement，hedging 会不必要地削弱 diagram。

#### 3.4b 输出结构（可选）

对创建 new directory structure 的 greenfield plans（new plugin、service、package 或 module），包含一个 `## Output Structure` section，用 file tree 展示 expected layout。这让 reviewers 在进入 per-unit details 前看到 overall shape。

**何时 include：**
- Plan 在 new directory hierarchy 中创建 3+ new files
- Directory layout 本身是 meaningful design decision

**何时 skip：**
- Plan 只 modifies existing files
- Plan 在 existing directory 中创建 1-2 files：per-unit file lists 已足够

Tree 是展示 expected output shape 的 scope declaration。它不是 constraint：如果 implementation reveals 更好 layout，implementer 可 adjust structure。每个 unit 的 `**Files:**` sections 仍对该 unit create 或 modify 什么保持 authoritative。

#### 3.5 定义每个 Implementation Unit

每个 unit 是 level-3 heading，携带 stable U-ID prefix，格式匹配 requirements docs 中 R/A/F/AE 的用法：`### U1. [Name]`。在 plan 内从 U1 开始 sequentially number。不要将 units render 为 bulleted list items，也不要用 `- [ ]` / `- [x]` checkbox markers prefix。List-based unit titles 会在每个 standard renderer 中 fragment，因为 per-unit fields（`**Goal:**`、`**Files:**`、`**Approach:**` 等）写在 flush-left，会终止 CommonMark list continuation，并使 fields 与它们描述的 unit 脱离。Headings everywhere render correctly，语义上也适合包含 multi-block content 的 sections，并为每个 unit 提供 anchor link。Plan 是 decision artifact；execution progress 由 `ce-work` 从 git 派生，而不是存储在 plan body 中。

**Stability rule。** U-ID 一旦 assigned，绝不 renumber。Reordering units 保留其 IDs（例如 new order 中 U1、U3、U5 是正确的；renumber 为 U1、U2、U3 不正确）。Splitting unit 时，在 original concept 上保留 original U-ID，并将 next unused number 分配给 new unit。Deletion 留下 gap；gaps 没问题。此 rule 在 deepening（Phase 5.3）期间最重要，因为那是最可能 accidental-renumber 的 vector。

每个 unit 包含：
- **Goal**：此 unit accomplishes 什么
- **Requirements**：推进哪些 requirements 或 success criteria（cite R-IDs，以及 origin 提供时的 A/F/AE IDs）
- **Dependencies**：必须先存在什么（用 U-ID cite，例如 "U1, U3"）
- **Files**：要 create、modify 或 test 的 repo-relative file paths（绝不使用 absolute paths）
- **Approach**：key decisions、data flow、component boundaries 或 integration notes
- **Execution note**：optional，仅当 unit 受益于 non-default execution posture，如 test-first 或 characterization-first
- **Technical design**：optional pseudo-code 或 diagram；当 unit approach non-obvious 且 prose alone 会留下 ambiguity 时使用。明确 frame 为 directional guidance，而不是 implementation specification
- **Patterns to follow**：要 mirror 的 existing code 或 conventions
- **Test scenarios**：枚举 implementer 应写的 specific test cases，按 unit complexity 和 risk right-sized。考虑下方每个 category，并包含该 unit 适用的每个 category 的 scenarios。Simple config change 可能只需一个 scenario；payment flow 可能需要一打。Quality signal 是 specificity：每个 scenario 应命名 input、action 和 expected outcome，让 implementer 无需 invent coverage。对于无 behavioral change 的 units（pure config、scaffolding、styling），使用 `Test expectation: none -- [reason]`，不要留空 field。**AE-link convention：** 当 test scenario 直接 enforce origin Acceptance Example 时，用 `Covers AE<N>.` prefix（或 `Covers F<N> / AE<N>.`）。这 sparse-by-design：大多数 test scenarios 比 AEs 更 fine-grained，不需要 link。不要将 AE links 强行加到只覆盖 lower-level implementation details 的 tests 上。
  - **Happy path behaviors**：带 expected inputs 和 outputs 的 core functionality
  - **Edge cases**（当 unit 有 meaningful boundaries 时）：boundary values、empty inputs、nil/null states、concurrent access
  - **Error and failure paths**（当 unit 有 failure modes 时）：invalid input、downstream service failures、timeout behavior、permission denials
  - **Integration scenarios**（当 unit crosses layers 时）：mocks alone 无法证明的 behaviors，例如 "creating X triggers callback Y which persists Z"。任何触及 callbacks、middleware 或 multi-layer interactions 的 unit 都要 include
- **Verification**：implementer 如何知道 unit complete，以 outcomes 而不是 shell command scripts 表达

每个 feature-bearing unit 都应在 `**Files:**` 中包含 test file path。

节制使用 `Execution note`。好的用法包括：
- `Execution note: Start with a failing integration test for the request/response contract.`
- `Execution note: Add characterization coverage before modifying this legacy parser.`
- `Execution note: Implement new domain behavior test-first.`

不要将 units 展开为 literal `RED/GREEN/REFACTOR` substeps。

#### 3.6 区分规划时未知项和实现时未知项

如果某事重要但尚不可知，在 deferred implementation notes 下明确记录，而不是假装在 plan 中 resolve 它。

示例：
- exact method 或 helper names
- 接触真实代码后才能确定的 final SQL 或 query details
- 依赖实际 test failures 才能观察到的 runtime behavior
- implementation 开始后可能变得不必要的 refactors

#### 3.7 反扩张：旁支清理和范围膨胀进入 Deferred

不同于 3.6（关于 plan time 的 *unknowns*）：3.7 关于 agent 在 planning 时注意到、但落在用户 confirmed scope 之外的 *known but tangential* work。当 research surface adjacent refactor、"while we're here" cleanup，或 scope-adjacent nice-to-have（"we could also add rate limiting"），将其 route 到 Scope Boundaries 中现有的 `### Deferred to Follow-Up Work` subsection（Phase 4.2 Core Plan Template），不要放入 active Implementation Units。

这强化 Phase 0.7 / Phase 5.1.5 建立的 synthesis discipline：active plan 执行的是用户 confirmed scope；其它一切 deferred。它 **不** 对 confirmed scope 内的 extend-vs-invent decisions 施加 architectural bias：该 judgment 仍由 agent 做出（material 时通过 Phase 5.1.5 synthesis surface）。用户 explicit ask 会 override 此 default：如果用户明确 requested refactor，它就是 in-scope，不是 deferred。

### Phase 4：撰写计划

**此 skill 期间绝不 CODE。** Research、decide 并 write plan：不要 start implementation。

所有 depths 使用同一 planning philosophy。改变 detail 数量，而不是 planning 和 execution 之间的边界。

#### 4.1 计划深度指南

**Lightweight（轻量）**
- 保持 plan compact
- 通常 2-4 implementation units
- 省略 value 不大的 optional sections

**Standard（标准）**
- 使用 full core template，omit 对此 particular work 无 value 的 optional sections（包括 High-Level Technical Design）
- 通常 3-6 implementation units
- Relevant 时 include risks、deferred questions 和 system-wide impact

**Deep（深入）**
- 使用 full core template，并在 warranted 时添加 optional analysis sections
- 通常 4-8 implementation units
- 当能 improve clarity 时，将 units group into phases
- Warranted 时 include alternatives considered、documentation impacts 和 deeper risk treatment

#### 4.1b 可选 Deep Plan 扩展

对 sufficiently large、risky 或 cross-cutting work，添加 genuinely help 的 sections：
- **Alternative Approaches Considered（备选方案）**
- **Success Metrics（成功指标）**
- **Dependencies / Prerequisites（依赖 / 前置条件）**
- **Risk Analysis & Mitigation（风险分析与缓解）**
- **Phased Delivery（分阶段交付）**
- **Documentation Plan（文档计划）**
- **Operational / Rollout Notes（运营 / rollout 说明）**
- **Future Considerations**：仅当它们会 materially affect current design 时才包含

不要将这些作为 boilerplate 添加。只有当它们 improve execution quality 或 stakeholder alignment 时才 include。

**Alternatives Considered：what to vary。** 包含此 section 时，alternatives 必须在 work 如何 build 上有差异：architecture、sequencing、boundaries、integration pattern、rollout strategy。Tiny implementation variants（哪个 hash function、哪个 serialization format）属于 Key Technical Decisions，不属于 Alternatives。Product-shape alternatives（different actors、different core outcome、different positioning）属于 `ce-brainstorm`，不是这里：将它们 surface back upstream，而不是在 planning 期间重新争论 product questions。

#### 4.2 Section Contract 和渲染

使用两份 paired references compose plan：

- `references/plan-sections.md`：section contract。描述 plan 包含什么：plan 必须为 downstream consumers enable 的 outcome、hard floor（Summary、Problem Frame、Requirements、KTDs、Implementation Units）、include-when-material catalog（HTD、Scope Boundaries、Open Questions、System-Wide Impact、Risks & Dependencies、Acceptance Examples、Documentation/Operational Notes、Sources & Research）、agency-driven escape hatch（content warrants 时 introduce new sections），以及 ID/content rules。
- Phase 0.0 加载的 format-rendering reference（`markdown-rendering.md` 或 `html-rendering.md`）：如何以 resolved output format present sections。

无论 format 如何，section catalog 相同。Format-specific principles（按 content shape 决定 table-vs-prose、ID prefix format、diagram rendering 等）位于 rendering reference。

Omit 对此 specific plan 不携带 information 的 "include when material" sections。用 placeholder prose 填充 section 比 omit 更糟。

#### 4.3 规划规则

- Standard 和 Deep plans 中，在 top-level sections 之间使用 **horizontal rules（`---`）**，mirror `ce-brainstorm` requirements doc convention。对于 many H2 sections 靠得很近的 dense plans，可 improve scannability。Whole doc 可 fits on single screen 的 Lightweight plans 中 omit。
- **所有 file paths 必须 repo-relative**：绝不使用 `/Users/name/Code/project/src/file.ts` 这类 absolute paths。改用 `src/file.ts`。Absolute paths 让 plans 在 machines、worktrees 和 teammates 之间 non-portable。当 plan target 的 repo 与 document home 不同时，在 plan 顶部 state target repo 一次（例如 `**Target repo:** my-other-project`），并全程使用 repo-relative paths
- Prefer path 加 class/component/pattern references，而不是 brittle line numbers
- 不要 include implementation code：无 imports、exact method signatures 或 framework-specific syntax
- 当 pseudo-code sketches 和 DSL grammars communicate design direction 时，允许放在 High-Level Technical Design section 和 per-unit technical design fields。明确 frame 为 directional guidance，而不是 implementation specification
- Mermaid diagrams 在能 clarify prose alone 难以 follow 的 relationships 或 flows 时 encouraged：data model changes 用 ERDs，multi-service interactions 用 sequence diagrams，lifecycle transitions 用 state diagrams，complex branching logic 用 flowcharts
- 不要 include git commands、commit messages 或 exact test command recipes
- 不要将 implementation units 展开成 micro-step `RED/GREEN/REFACTOR` instructions
- 不要为了让 plan 看起来 complete，就假装 execution-time question 已 settled

### Phase 5：最终审查、写入文件和交接

#### 5.1 写入前审查

Finalizing 前，检查：
- Plan 没有 invent 应在 `ce-brainstorm` 中定义的 product behavior
- 如果没有 origin document，bounded planning bootstrap 已建立足够 product clarity，可 responsibly plan
- 每个 major decision 都 grounded in origin document 或 research
- 每个 implementation unit concrete、dependency-ordered 且 implementation-ready
- 如果 test-first 或 characterization-first posture 是 explicit 或 strongly implied，relevant units 用 lightweight `Execution note` carry forward
- 每个 feature-bearing unit 都有来自每个 applicable category（happy path、edge cases、error paths、integration）的 test scenarios：按 unit complexity right-sized，既不 padded 也不 skimped
- Test scenarios 命名 specific inputs、actions 和 expected outcomes，但不变成 test code
- Blank 或 missing test scenarios 的 feature-bearing units flagged as incomplete：feature-bearing units 必须有 actual test scenarios，而不只是 annotation。`Test expectation: none -- [reason]` annotation 仅对 non-feature-bearing units valid（pure config、scaffolding、styling）
- Deferred items explicit，且不 hidden as fake certainty
- **High-Level Technical Design presence audit（load-bearing）。** 对 Phase 3.4 中 plan content 满足的每个 architecture trigger（3+ components with directed relationships、3+ protocol steps、3+ state machine states、lifecycle、3+ decision points、3+ data-flow stages、mode/flag combinations、DSL/API surface design、non-obvious single-component shape），verify High-Level Technical Design section 中存在 corresponding sketch/diagram。Count firing triggers；count sketches；sketch count 必须至少等于 fired 的 distinct trigger categories count。Trigger fired 但 missing section，或包含 section 但跳过 triggered sketch，都是 incomplete：回到 Phase 3.4 并添加 missing sketch。Token cost 不是 fail 此 check 的 valid reason。
- 如果包含 High-Level Technical Design section，它使用适合 work 的 medium，携带 non-prescriptive framing，且不包含 implementation code（无 imports、exact signatures 或 framework-specific syntax）
- Per-unit technical design fields 如果 present，应 concise 且 directional，而非 copy-paste-ready
- 如果 plan 创建 new directory structure，Output Structure tree 是否能帮助 reviewers 看到 overall shape？
- 如果 Scope Boundaries 列出的 items 是 separate PR、issue 或 repo 的 planned work，它们是否位于 `### Deferred to Follow-Up Work` 下，而不是与 true non-goals 混在一起？
- U-IDs 在 plan 内 unique 且遵循 stability rule：没有两个 units 共享 ID；reordering 或 splitting 未 renumber existing units；preserve deletion gaps
- Visual aid（dependency graph、interaction diagram、comparison table）是否能比扫描 prose 更快帮助 reader grasp plan structure？

如果 plan 源自 requirements document，重新读取该 document 并 verify：
- Chosen approach 仍匹配 product intent
- Scope boundaries 和 success criteria 已 preserved
- Blocking questions 要么 resolved、explicitly assumed，要么 sent back to `ce-brainstorm`
- Origin document 的每个 section 都在 plan 中 addressed：scan 每个 section 确认 nothing was silently dropped
- 如果 origin supplies A/F/AE IDs：每个 *affects implementation* 的 origin R/F/AE 都在 Requirements、U-ID unit、test scenarios、verification、scope boundaries 中 referenced，或 explicitly deferred。当 Actors affect behavior、permissions、UX、orchestration、handoff 或 verification 时 carry forward。Standard 是 preservation of product intent，不是 mandatory ID spam：irrelevant origin IDs 可 omitted
- 如果 origin 是 Deep-product（origin 包含 `Outside this product's identity` subsection）：plan 的 Scope Boundaries preserve three-way split：`Deferred for later` 和 `Outside this product's identity` 从 origin verbatim carried，`Deferred to Follow-Up Work` 保留给 plan-local implementation sequencing

#### 5.1.5 Brainstorm-Sourced 范围综合

在 Phase 5.2 将 plan commit to disk 前，向用户 surface plan-time call-outs：这是捕获 plan-time scope errors 的最后 cheap moment。Brainstorm 已验证 WHAT to build；此 phase surface plan 会如何在 matter 的 forks 上 execute。

仅当 plan 源自 upstream brainstorm doc（Phase 0.2 找到 `*-requirements.md` 或 `*-requirements.html` match），且不在 Phase 0.1 fast paths（resume normal、deepen-intent）上时 fire。Solo invocation 中跳过 Phase 5.1.5：solo plans 已在 Phase 0.7 处理 synthesis。

**在撰写 scoping synthesis 前阅读 `references/synthesis-summary.md`。** 它包含 affirmability test、keep-test criteria、detail test、summary shape budgets、granularity rules、anti-patterns、revision-vs-confirmation discipline、doc-body reading rules、doc-shape routing、soft-cut behavior、self-redirect support、PII 压缩 worked example，以及完整 headless-mode routing；这些都是写出合格 synthesis 所必需的。

**必须输出 gate；不要跳过，也不允许静默继续。** 先拟定内部三桶 scope 草稿（Stated / Inferred / Out of scope，这是供 Phase 5.2 plan body routing 使用的内部思考，不是下面的 chat 输出）。再提炼 call-outs（用户输入会实质改变 plan 的具体分叉），然后在继续 Phase 5.2 之前，于 chat 中发出下面两个 literal templates 之一。

**Synthesis 发生在 pre-plan-write。** agent 此时还不知道 plan-write 会如何安排 work。不要在 synthesis 中声称 PR 数量（如 "one PR"）、commit/branch 形态、工作量或时间估计、Implementation Unit 边界，或精确文件路径。Synthesis 只 surface 此刻可知的决定（brainstorm + research + agent posture）；其余由 plan-write 产出。即使 agent 在 session 早些时候已经形成 plan-write 倾向，这条规则仍然成立：那些想法要留到 plan-write。

**Summary shape：两段。**

1. **Brainstorm-scope restatement**（1-2 句，prose）。用 brainstorm 自己的词汇复述其 scope，作为 orientation。不要枚举 Implementation Units、重述 constraints，或列出 acceptance examples；这些是用户已经写过的。
2. **Plan-specific scoping decisions**（prose；多面向时可用 bullets）。记录 agent 做出的、brainstorm 未明确给出的 scope-level commitments：完整覆盖 brainstorm 还是缩窄子集；相邻 refactors 纳入还是排除；scenario level 的 test scope。每一项都必须让用户不读代码也能确认。形式服务于内容；tier budgets 是**上限，不是目标**（Lightweight 1-3 行；Standard 最多 3-5 行或 2-4 个 bullets；Deep 最多 4-6 行或 3-6 个 bullets）。每个 bullet 1-2 行即可。没有更多内容时，更少才是正确。keep test、detail test 和 source-vocabulary discipline 见 reference。

**不要枚举 touch surface。** 像 "The touch surface is..."、"This plan touches..."、"The implementation reaches into..."、"Files modified include..." 这类句子都是 plan-pitch 泄漏。文件路径、module 名、directory introductions 和 per-file change descriptions 属于 plan body（Phase 5.2 的 Implementation Units），不属于 synthesis。Synthesis 命名 plan 针对的 *what*，不是代码里的 *where*。

**Pre-emit scans。** 发出 synthesis 前扫描输出：
- Bare ID references（`AE\d+`、`R\d+`、`F\d+`、`A\d+`、`U\d+`）→ 替换成 plain names。
- File paths（`path/like.md`、`path/like.py` 等）→ 删除，除非该 path 本身就是 call-outs 中显式分叉的主题。

**Auto-proceed 的 tier guard：** auto-proceed path（宣布而不等待确认）只在 plan depth 为 **Lightweight 且 zero call-outs survive** 时触发。Standard 和 Deep plans 即使 zero call-outs 也始终触发 confirmation gate；检查点由内容分量决定，不由 interaction history 决定。

**Confirmation template（Standard/Deep 不管 call-out 数量如何，或任何 tier 只要有一个以上 call-outs survive）：**

````text
Brainstorm 的 scope 是：[使用 brainstorm 词汇写 1-2 句 restatement，作为 orientation；不要枚举 Implementation Units、constraints 或 acceptance examples]。

这个 plan 会：[写 plan-specific scoping decisions：完整覆盖 brainstorm 还是缩窄子集；相邻 refactors 纳入或排除；scenario level 的 test scope。不要写 PR count、sequencing、IU lists 或 file paths]。

**Call outs:** (omit this header when zero forks survived the keep test)
- [用 1-2 行写 plan-time fork：命名选择，并可在括号中写一句 trade-off。不要多句 rationale，不要写 "my default is X" 式 pitch]

确认后我会基于 brainstorm、research 和这份 synthesis 写出 plan。
````

等待用户确认后再继续 Phase 5.2。

**Auto-proceed template（仅 Lightweight 且 zero call-outs）：**

````text
正在规划 [brief brainstorm-scope restatement] — [用一个从句写 plan-specific shape]。

没有需要你权衡的开放决定 — 我会继续 plan-write。如果我理解错了 scope，请随时打断。
````

然后不提出 blocking question，直接继续 Phase 5.2。

**Headless mode**：仍然撰写 internal draft，但跳过 stage 2（chat-time call-outs），因为没有同步用户可确认。继续 Phase 5.2 plan-write。Internal draft 中的 inferred bets 进入 plan 的 `## Assumptions` section，而不是 Key Technical Decisions。完整 routing 见 `references/synthesis-summary.md` 的 Headless mode。

#### 5.2 写入计划文件

**必须：在呈现任何 options 前，先把 plan file 写入磁盘。**

使用 Write tool，把完整 plan 保存为 resolved format 对应的 extension：

```text
docs/plans/YYYY-MM-DD-NNN-<type>-<descriptive-name>-plan.<md|html>
```

Extension 遵循 Phase 0.0 的 `OUTPUT_FORMAT`：markdown 时为 `.md`，HTML 时为 `.html`。Sequence number `NNN` 根据 `docs/plans/` 中已有 plan files 计算，不区分 extension（同时计入 `.md` 和 `.html`），以保证当天排序唯一。

使用 `references/plan-sections.md` 的内容，以及 Phase 0.0 加载的 rendering reference 中的 format-specific principles（`markdown-rendering.md` 或 `html-rendering.md`）来撰写 plan。

**HTML composition timing。** 当 `OUTPUT_FORMAT=html` 时，Phase 5.3 deepening 会在本次写入最终成形前运行，但 HTML mode 会跳过 `ce-doc-review`（它今天的 mutation mechanics 仅支持 markdown；见 `references/plan-handoff.md` 的 Phase 5.3.8 format gate）。HTML artifact 会反映 deepening synthesis，但不包含 doc-review autofixes；这是 `ce-doc-review` 支持 HTML-aware mutation 前的已知 gap。

确认（使用 absolute path，让现代 terminal 中的引用可点击）：

```text
Plan written to <absolute path to plan>
```

**Pipeline mode：** 如果由 LFG 等 automated workflow 或任何 `disable-model-invocation` context 调用，跳过 interactive questions。自动做出必要选择并继续写 plan。Pipeline mode 在 Phase 0.0 强制 `OUTPUT_FORMAT=md`。

**CONCEPTS.md gap-fill（仅当文件已存在）：** 如果 plan body 使用了 `CONCEPTS.md` 中缺少定义的 domain term，添加对应 entry。**只添加具有 project-specific meaning 的 domain entities、named processes 和 status concepts**；不要添加文件路径、class names、function signatures 或 implementation decisions。`CONCEPTS.md` 是 glossary，不是 spec 或 catch-all。遵循现有 entries 的格式。静默应用。如果 `CONCEPTS.md` 不存在则完全跳过；创建职责属于 `ce-compound` 和 `ce-compound-refresh`。

#### 5.3 Confidence Check 和 Deepening

写入 plan file 后，自动评估 plan 是否需要 strengthening。

**两种 deepening modes：**

- **Auto mode**（plan generation 的默认模式）：运行时不向用户请求 approval。用户会看到哪些内容正在被 strengthened，但不需要做决定。Sub-agent findings 会直接 synthesized into the plan。
- **Interactive mode**（由 Phase 0.1 的 re-deepen fast path 激活）：用户明确要求 deepen 一个 existing plan。Sub-agent findings 在集成前逐条呈现给用户 review。用户可以 accept、reject，或讨论每个 agent 的 findings。只有 accepted findings 会 synthesized into the plan。

Interactive mode 存在是因为 on-demand deepening 是不同的用户姿态：用户已经有一份投入过的 plan，并希望精准控制哪些 change 被纳入。无论 plan 是由本 skill 生成、手写，还是由其他工具产出，都适用。

`ce-doc-review` 和本 confidence check 不同：
- 当 document 需要 clarity、simplification、completeness 或 scope control 时，使用 `ce-doc-review` skill
- 当 plan 结构上已经 sound、但仍需要更强 grounding 时，本 confidence check 用来加强 rationale、sequencing、risk treatment 和 system-wide thinking

**Pipeline mode：** 在 pipeline/disable-model-invocation contexts 中，本 phase 始终以 auto mode 运行。不需要用户交互。

##### 5.3.1 分类 Plan Depth 和 Topic Risk

根据 document 判断 plan depth：
- **Lightweight** - 小、边界清晰、低歧义，通常 2-4 个 implementation units
- **Standard** - 中等复杂度，包含一些 technical decisions，通常 3-6 个 units
- **Deep** - cross-cutting、高风险或具备战略重要性的 work，通常 4-8 个 units 或 phased delivery

构建 risk profile。将以下情况视为 high-risk signals：
- Authentication、authorization 或 security-sensitive behavior
- Payments、billing 或 financial flows
- Data migrations、backfills 或 persistent data changes
- External APIs 或 third-party integrations
- Privacy、compliance 或 user data handling
- Cross-interface parity 或 multi-surface behavior
- 重要的 rollout、monitoring 或 operational concerns

##### 5.3.2 Gate：决定是否 Deepen

- **Lightweight** plans 通常不需要 deepening，除非它们是 high-risk
- **Standard** plans 如果一个或多个重要 sections 仍显得 thin，通常会受益于 deepening
- **Deep** 或 high-risk plans 通常会受益于 targeted second pass
- **Thin local grounding override：** 如果 Phase 1.2 因 local patterns thin（少于 3 个 direct examples 或 adjacent-domain match）而触发 external research，无论 plan 看起来多 grounded，都始终进入 scoring。当 plan 建立在陌生区域上时，关于 system behavior 的 claim 更可能是 assumptions，而不是 verified facts。Scoring pass 成本很低；如果 plan 确实 solid，scoring 会快速发现无事可做并退出
- **Load-bearing external research override：** 如果 Phase 1.4 将 external research 标记为 load-bearing（它实质塑造了 KTD、Alternative、Scope boundary 或 Risk），始终进入 scoring，**即使 local implementation patterns 很强**。Landscape 或 prior-art finding 可能塑造 local codebase 无法验证的 recommendations，而上面的 thin-grounding override 会漏掉这一类情况。这只进入 scoring pass；并不强制 deepening

如果 plan 已显得足够 grounded，且 thin-grounding 与 load-bearing-external-research overrides 都不适用，报告 "Confidence check passed — no sections need strengthening"，然后**立刻加载 `references/plan-handoff.md` 并依次执行 5.3.8 → 5.3.9 → 5.4**。Markdown plans 必须做 document review；不要因为 confidence check passed 就跳过。两个工具捕获的是不同类别的问题。对于 HTML plans（`OUTPUT_FORMAT=html`），plan-handoff 的 5.3.8 format gate 会跳过 `ce-doc-review`，因为它今天的 mutation mechanics 仅支持 markdown；menu summary 会显式说明这个限制。

##### 5.3.3–5.3.7 执行 Deepening

当 deepening 有必要时，阅读 `references/deepening-workflow.md`，获取 confidence scoring checklists、section-to-agent dispatch mapping、execution mode selection、research execution、interactive finding review 和 plan synthesis instructions。执行该文件中的 5.3.3 到 5.3.7，然后回到这里继续 5.3.8。

##### 5.3.8–5.4 Document Review、Final Checks 和 Post-Generation Options

**STOP。继续前立刻加载 `references/plan-handoff.md`。** 它包含 5.3.8（document review）、5.3.9（final checks and cleanup）和 5.4（post-generation handoff，包括 Proof HITL flow、post-HITL re-review 和 Issue Creation branching）的完整 instructions。**这一步不可选**；否则 agent 会渲染 post-generation menu、捕获用户选择，然后没有触发 routed action 就停下。只要 `OUTPUT_FORMAT=md`，无论 confidence check 是否已经运行，5.3.8 的 document review 都无条件运行；对于 `OUTPUT_FORMAT=html`，plan-handoff 的 5.3.8 format gate 会跳过 `ce-doc-review`，因为它今天的 mutation mechanics 仅支持 markdown。Markdown 的默认模式是 headless（`mode:headless`）：`safe_auto` fixes 静默应用，remaining findings 在 menu 上方按上下文 surface，更深的 interactive review 通过 free-form prompt opt in。

Document review 和 final checks 后，在 menu 上方打印一行 headless review state summary（例如 `Doc review applied 3 fixes. 2 decisions, 1 proposed fix, 4 FYI observations remain (1 at P1).`；对于 5.3.8 被跳过的 HTML plans，打印 `Doc review skipped — ce-doc-review is markdown-only today; the HTML plan was not reviewed.`），然后呈现 menu。当仍有 actionable findings（`proposed_fixes_count + decisions_count > 0`）时，menu 有 5 个 options；否则有 4 个 options，包括 FYI-only case 和 HTML-skip case（`skipped_reason: output_format_html`）。后两者都隐藏 option 2，因为 `ce-doc-review` walkthrough 只面向 actionable markdown findings，此时没有有效内容可 walkthrough。完整规则见 `references/plan-handoff.md`。5-option menu 按 AGENTS.md 对 legitimate option overflow 的 narrow exception，在 chat 中渲染为 numbered list，并附上提示 "Pick a number or describe what you want." 对 blocking question tool 没有 option 上限的平台（Codex `request_user_input`、Pi `ask_user`），使用平台 blocking tool；当该 tool 不可用或报错（例如 Codex edit modes 未暴露 `request_user_input`）时，fallback 到同样的 numbered-list-in-chat 渲染，并保留 "Pick a number or describe what you want." 提示。4-option case 正常通过平台 blocking tool routing（Claude Code 中是 `AskUserQuestion`；如果 schema 未加载，先调用 `ToolSearch` 并使用 `select:AskUserQuestion`），当 blocking tool 不可用或调用失败时，同样 fallback 为 numbered-list-in-chat。绝不要静默跳过该 question。

**问题：** "Plan ready at `<absolute path to plan>`. What would you like to do next?"（使用 absolute path，让现代 terminal 中的引用可点击）

**选项。** Option 4 的 label 要匹配 artifact 的 format。在 exclusive output mode 下，每次运行只适用 "Open in Proof" 或 "Open in browser" 之一：`OUTPUT_FORMAT=md` 显示 Proof；`OUTPUT_FORMAT=html` 显示 browser。Proof 基于 markdown，不能 ingest HTML；browser option 会打开本地 `.html` 文件。渲染与本次产出 format 匹配的 option。

1. **Start `/ce-work`**（recommended）- 在当前 session 中开始实现这个 plan
2. **Run deeper doc review** - 以 interactive 方式 walkthrough remaining findings（完整 `ce-doc-review` walkthrough）
3. **Create Issue** - 从这个 plan 在已配置的 issue tracker（GitHub 或 Linear）中创建 tracked issue
4. **Open in Proof (web app) — review and comment to iterate with the agent** - 在 Every 的 Proof editor 中打开 doc，通过 comments 与 agent 迭代，或复制 link 分享给他人。**仅当 `OUTPUT_FORMAT=md` 时渲染。**
4. **Open in browser** - 在本地打开 HTML plan file，用于 review 和 sharing。**仅当 `OUTPUT_FORMAT=html` 时渲染。**
5. **Done for now** - 暂停；plan file 已保存，之后可 resume

**路由。** 根据用户选择采取行动；不要只是宣布。复杂 sub-flows（Proof HITL state machine、Issue Creation tracker detection、post-HITL resync）位于 `references/plan-handoff.md`。

- **Start `/ce-work`** — 通过平台的 skill-invocation primitive（Claude Code 中的 `Skill`、Codex 中的 `Skill`、Gemini/Pi 上的等价机制）调用 `ce-work` skill，并把 plan path 作为 skill argument。不要只是告诉用户输入 `/ce-work`；现在就触发 invocation，让 plan 在本 session 中执行。
- **Run deeper doc review** — 在 plan path 上重新调用 `ce-doc-review` skill，且**不带** `mode:headless`，以触发 interactive routing question 和 walkthrough。返回后，用刷新后的 counts 重新渲染此 menu，让用户选择 next-stage action。
- **Create Issue** — 检测 project tracker（GitHub 用 `gh`，Linear 用 `linear`），并按 `references/plan-handoff.md` 中 "Issue Creation" 的说明，从 plan file 创建 issue。创建后显示 issue URL，并通过平台 blocking question tool 询问是否继续 `/ce-work`。
- **Open in Proof (web app) — review and comment to iterate with the agent** — 以 HITL-review mode 加载 `ce-proof` skill，参数包括：plan file 作为 `source file`，plan title 作为 `doc title`，identity 为 `ai:compound-engineering` / `Compound Engineering`，recommended next step 为 `/ce-work`。然后遵循 `references/plan-handoff.md` 的 post-HITL resync logic；它会处理四种 `ce-proof` return statuses，在 material edits 后重新运行 `ce-doc-review`，并在 upload failure 时 graceful fallback。
- **Open in browser** — 显示 `.html` plan file 的 absolute path，让用户可在本地打开。若平台暴露 browser-opening primitive（例如 macOS 的 `open`、Linux 的 `xdg-open`、Windows 的 `start`），agent 可以使用；否则打印 absolute path，让用户打开。不要从这个 option 调用 `ce-work`；用户选择 HTML 是为了 review/sharing，不是 handoff。
- **Done for now** — 简短确认 plan file 已保存，然后结束本 turn。没有用户明确后续 prompt 时，不要启动 follow-up work。

如果用户输入针对 findings 的 free-form prompts（例如 "review"、"walk through"、"deep review"），按其选择了 `Run deeper doc review` 来 routing；触发 skill，而不是回到 menu。对于其他 free-text revisions，接受输入，应用 revision 后再回到此 menu。

**完成检查：** 直到上方 post-generation menu 已呈现、用户已选择 action，且该选择的 inline routing 已执行，本 skill 才算 complete。只呈现 menu 并停在用户选择处并不算完成；必须触发 routed action。

**Pipeline mode exception：** 在 LFG 或任何 `disable-model-invocation` context 中，跳过 interactive menu；在 plan file 已写入、confidence check 已运行，且 `ce-doc-review` 已按 `references/plan-handoff.md` 以 headless mode 运行后，把控制权交还 caller。Pipeline mode 在 Phase 0.0 强制 `OUTPUT_FORMAT=md`，因此 pipeline runs 中 5.3.8 format gate 永远不会选择 HTML skip path。
