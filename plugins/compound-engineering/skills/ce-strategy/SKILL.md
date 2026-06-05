---
name: ce-strategy
description: "创建或维护 STRATEGY.md：product 的 target problem、approach、users、key metrics 和 tracks of work。用于开始 new product、更新 direction，或出现 'write our strategy'、'update the roadmap'、'what are we working on'、'set up the strategy doc' 这类 prompts 时。也会在 ce-ideate、ce-brainstorm 或 ce-plan 需要 upstream grounding 且尚无 strategy doc 时触发。"
argument-hint: "[可选：要 revisit 的 section，例如 'metrics' 或 'approach']"
---

# Product Strategy（产品策略）

**Note（注意）: The current year is 2026.** 给 strategy document 标日期时使用这一点。

`ce-strategy` 产出并维护 `STRATEGY.md`：一份短小、durable anchor document，记录 product 是什么、服务谁、如何成功，以及 team 正在投资哪里。它位于 repo root，是 canonical、well-known file（与 `README.md` 同级）。Downstream skills（`ce-ideate`、`ce-brainstorm`、`ce-plan`）在它存在时读取它作为 grounding。

Document 刻意短而 structured。几个 sharp questions 的好答案，比大量 prose 更能形成 strategy。此 skill 会提出这些问题，对 weak answers push back，并写出 doc。

## Interaction Method（交互方式）

默认使用平台的 blocking question tool：Claude Code 中用 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 搭配 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Gemini 中用 `ask_user`、Pi 中用 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中的 numbered options；不要因为需要 schema load 就 fallback。绝不要 silently skip 该问题。

一次只问一个问题。Substantive sections（problem、approach、persona）优先使用 free-form responses；single-select 只用于 routing decisions（revisit 哪个 section）。每个 option label 必须 self-contained。

## Focus Hint（Focus 提示）

<focus_hint> #$ARGUMENTS </focus_hint>

将任何 argument 解释为 optional focus：要 revisit 的 section name（`metrics`、`approach`、`tracks`）或 scope hint。没有 argument 时，open-ended 继续，并让 file state 决定 path。

## Core Principles（核心原则）

1. **Anchor, not plan.** Strategy 是 product 是什么以及为什么。Features 属于 `ce-brainstorm`；schedules 属于 issue tracker。不要让二者 creep into doc。
2. **Rigor in the questions, not the headings.** Section headers 使用 plain English。Interview questions enforce strategy discipline。
3. **Short is a feature.** Template 有约束。添加 sections 的成本比看起来高。对 expansion push back。
4. **Durable across runs.** 此 skill 可 rerun。第二次运行时 in place update，保留有效内容，只 challenge 看起来 stale 或 weak 的 sections。

## Execution Flow（执行流程）

### Phase 0：Route by File State（按文件状态路由）

使用 native file-read tool 读取 `STRATEGY.md`。

- **File does not exist** -> First run。进入 Phase 1。
- **File exists and argument names a specific section** -> Targeted update。进入 Phase 2。
- **File exists, no argument** -> 询问要 revisit 哪些 section(s)，然后进入 Phase 2。

用一行 announce path："Strategy doc not found - let's write it." 或 "Found existing strategy - let's review and update."

### Phase 1：First-Run Interview（首次 Interview）

读取 `references/interview.md`。此加载 non-optional：每个 section 的 pushback rules、anti-pattern examples 和 quality bar 都在那里。凭记忆 improvising 会产出 passive transcription，而不是 strategy doc。

按 final document 的 section order 运行 interview：

1. Target problem（目标问题）
2. Our approach（我们的方法）
3. Who it's for（服务对象）
4. Key metrics（关键指标）
5. Tracks（轨道）
6. Milestones（里程碑，可选）
7. Not working on（不做什么，可选）
8. Marketing（营销，可选）

对每个 section，询问 opening question，应用 pushback rules，并用用户自己的语言 capture final answer。不要跳过 pushback step；这是 skill 核心。每个 section 最多两轮 pushback；之后 capture 用户已给出的内容，并 note 该 section 值得下次 revisiting。

当所有 required sections（1-5）都 capture 后，读取 `references/strategy-template.md`，填充，并在写入前把 full draft 展示在 chat 中。提供一轮 edits。然后写入 `STRATEGY.md`。

### Phase 2：Update Run（更新运行）

彻底读取 existing `STRATEGY.md`。用 3-5 行 summarize current state，让用户看到已记录内容。

如果 argument named a specific section，跳到 `references/interview.md` 中该 section。其他所有 sections 完全 preserve。像 first run 一样应用 pushback；不要仅因 weak content 已经写下就 rubber-stamp。

如果没有 specific target，使用 blocking question tool 询问用户要 revisit 哪个 section。Options（选项）：

- "Target problem"（目标问题）
- "Our approach"（我们的方法）
- "Who it's for"（服务对象）
- "Metrics, tracks, or other"（指标、tracks 或其他）

对每个 revisited section，带 full pushback 重新 interview。用户确认仍准确的 sections 保持 untouched。将 YAML frontmatter 中的 `last_updated` value 更新为今天的 ISO date。

将 updated doc 写回 `STRATEGY.md`。

### Phase 3：Downstream Handoff（下游交接）

写入后，用一行说明 file 所在位置，以及 `ce-ideate`、`ce-brainstorm` 和 `ce-plan` 会在下次运行时将它作为 grounding 读取。

如果此 repo 尚未运行 downstream skill，建议下一步使用 `ce-ideate` 或 `ce-brainstorm`。

## What This Skill Does Not Do（此 Skill 不做什么）

- 不更新 issue tracker，也不 reconcile in-flight work。Strategy 是 doc；execution 在别处。
- 不 prioritize backlog。Prioritization 是 separate workflow。
- 不写 product requirements 或 implementation plans；那些属于 `ce-brainstorm` 和 `ce-plan`。
- 不计算 metric values。它记录哪些 metrics 重要、在哪里，而不是今天读数是多少。

## Learn More（延伸阅读）

"Target problem / Our approach / Tracks" structure 受 Richard Rumelt 的 *Good Strategy Bad Strategy* 启发，尤其是他的 diagnosis、guiding policy 和 coherent action kernel。`references/interview.md` 中的 interview questions 旨在越过他称为 "bad strategy" 的 patterns：fluff、伪装成 strategy 的 goals，以及代替 guiding choice 的 feature lists。如果 slogan 和 strategy 的区别还不够 sharp，这本书是推荐 follow-up reading。
