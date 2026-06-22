# Universal Planning Workflow（通用规划工作流）

当 ce-plan 检测到 non-software task（Phase 0.1b）时加载本文件。它用 domain-agnostic planning workflow 替换 software-specific phases（0.2 到 5.1）。

## 开始前：verify classification（验证分类）

SKILL.md 中的 detection stub 会将任何不明确属于 software 的内容 route 到这里。继续前，验证 classification 是否正确：

- **这实际上是 software task 吗？** 关键区分是 task-type，而不是 topic-domain。关于 Rust 的 study guide 是 non-software（产出教育内容）。Rust library refactor 是 software（修改代码）。如果这实际上是 software，返回 main SKILL.md 的 Phase 0.2。
- **这是 trivial single-fact lookup 吗？** 只有那种无需 research、retrieval 或 judgment、用一个 fact 就能回答的问题才跳过 planning；直接用用户语境回答并停止。不要叙述它 "isn't a planning task"，也不要解释 routing；那是 process exhaust（见下方 Veil of value）。示例："zsh: command not found: brew"、"what's the capital of France." 一个需要 multiple steps、任何 retrieval 或 synthesis 才能答好的问题**不**符合 quick-help exit；它是 answer-seeking task（见下方 Disposition），不是快速帮助出口。不确定时，不要退出。
- **Pipeline mode?** 如果从 LFG 或任何 `disable-model-invocation` context 调用：输出 "This is a non-software task. The LFG pipeline requires ce-work, which only supports software tasks. Use `/ce-plan` directly for non-software planning." 然后停止。

通过这些检查后，commit to the task；不要因为它看起来像 "lookup" 或 "research question" 就退出。用户是有意调用 planning tool。然后选择下方 disposition。

---

## Disposition（取向）：plan-seeking vs. answer-seeking

这里会进入两类 task，它们有不同 deliverables：

- **Plan-seeking** — deliverable 是一个 *plan*：trip itinerary、study curriculum、event runbook、project plan。plan 是 artifact，可保存或分享。→ 遵循下方 Steps 1-3。
- **Answer-seeking** — deliverable 是一个 *answer*：调查性或分析性问题（"how often does X happen — is it a big deal?"、"how does our approach compare to Y?"、"should we Z?"）。没人想为此保存 plan document；planning 是得到好答案的手段，不是输出。→ 遵循下方 **Answer-seeking flow**；跳过 Step 3 artifact handling。

如果请求混合两者（"research X, then plan Y"），先做 answer-seeking research，再产出 plan artifact。

继续阅读前，commit 到一种 disposition，并只遵循对应 flow：plan-seeking task 仍会产出 plan document（Steps 1-3），不会止步于聊天答案；answer-seeking task 不写 plan file。

---

## Answer-seeking flow（答案型流程）

planning instinct 仍适用；但 plan 是 *working scaffold*，不是 artifact。在聊天中陈述它以引导工作并向人类展示 approach；执行它；然后丢弃。不要写 plan file。

### 说明简短 plan-of-attack，然后继续

说明将如何回答问题，并按问题大小调节：轻量问题给一行 approach；多部分分析问题给简短 bulleted plan（几个 steps）。这是 **non-blocking**：宣布 approach 后立即继续。不要要求用户 approve plan；已陈述的 approach 本身就是 checkpoint，如果 framing 错了，用户可以打断。只有在 agent 无法 resolve 的真实 fork 上才停下来询问（例如 "his personal account or the org's?"）。

### 执行 plan

执行 approach。当答案依赖模型无法可靠从 memory 提供的 facts 时（current data、recent events、会 drift 的 specifics），使用下方 Step 1 的 **Research decomposition pattern** 收集它们（分解为 focused questions，通过平台 subagent/web primitive 并行 dispatch，collate）。对于模型已经熟悉的内容，跳过 research。

**关于用户自己的 code、repo 或 named artifacts 的答案，必须基于 actual sources，而不是 memory。** 当问题引用 local code、特定 file、命名 CLI 或 service，或 "our X" 时，先读取这些 sources（以及用户命名的任何 resource；见 SKILL.md 中的 Core Principle 8）。"The model already knows the topic" 只覆盖 general knowledge，绝不覆盖用户 codebase 的内容：关于未读取 local code 的比较或建议都是 ungrounded。先 inspect，再 answer。

**这里的 execution 仅限 research 和 analysis，绝不写 code。** 读取 code 和 artifacts 来理解它们属于 in-bounds research；写或运行 code 来改变系统则不属于这里，那属于 `ce-work`。这保持 planning/execution boundary 完整。

### 交付答案

在聊天中回答。默认**不要**写 plan file，也**不要**运行 Step 3 save/share menu。如果调查产出了用户可能想保留的内容（comparison table、sourced summary），提供保存选项；否则直接给出答案。在 headless 或 non-interactive runs 中，跳过 offer 并交付答案。

### Veil of value：哪些展示，哪些隐藏

plan-of-attack 和答案是给 caller 的；skill 的 internal machinery 不是。像专家顾问一样按 relevance 编辑；他们告诉你他们如何思考你的问题，而不是他们后台套用了哪个 template。

- **Surface**（question-domain — 读起来有价值）：针对用户实际问题的 approach，用用户的语境表达。
- **Hide**（skill-domain — process exhaust）：正在运行哪个 skill、mode 或 phase；是否写了 plan file；routing 或 disposition decision 本身。
- **Never hide**（audit content — 影响答案可信度）：caveats、gaps 和 uncertainty。"I could only pull his last ~100 stars, so this is partial" 或 "this is my read, not a hard signal" 不是垃圾信息；这是优秀 assistant 会展示的内容。veil 隐藏 plumbing，绝不隐藏答案边界。

针对 "how often does he star things — is this a big deal?" 的 register example（语气示例）：

> Wrong（错误示例）: "Quick note first: /ce-plan builds implementation plans, so I ignored the template and just answered the question. Here's what the data says..."

泄露 skill 名称，叙述 internal routing decision，并为偏离道歉；caller 看到了工具接缝。

> Right（正确示例）: "Let me size this up — I'll check how active a starrer he is overall, his recent cadence, and the kinds of repos he tends to star, then weigh where this one lands. [gathers data] Yes, this is a real signal: ..."

底层流程相同；没有 machinery 暴露。caller 看到的是对其问题的思考。

---

## Step 1：Assess Ambiguity and Research Need（评估歧义和研究需求）

planning 前评估两件事：

**1-3 个 quick questions 是否会显著改善这个 plan？**

- **Default: ask 1-3 questions**：当答案会改变 plan 结构或内容时，通过 Step 1b 询问。始终包含一个最终选项，例如 "Skip — just make the plan with reasonable assumptions"，让用户可立即 opt out。
- **Skip questions entirely**：仅当请求已经指定所有 major variables，或 task 足够简单、reasonable assumptions 能很好覆盖时。

**Research need — 这个 plan 是否依赖比 training data 变化更快的 facts？**

| Research need | Signals | Action |
|--------------|---------|--------|
| **None** | Generic、timeless 或 conceptual plan（study curriculum methodology、project management approach、personal goal breakdown） | 跳过 research。Model knowledge 足够。structuring plan 后，提供："I based this on general knowledge. Want me to search for [specific thing research would improve]?"，例如 sourced recipes、current product recommendations、expert frameworks。仅在用户接受时执行。 |
| **Recommended** | Plan 引用了 specific locations、venues、dates、prices、schedules、seasonal availability 或 current events；任何 stale information 会破坏 plan 的内容（closed restaurants、changed prices、cancelled events、wrong seasonal dates）。 | planning 前 research。分解为 2-5 个 focused research questions，并 dispatch parallel web searches。在 Claude Code 中，为每个 search 使用带 `model: "haiku"` 的 Agent tool 以降低成本。structuring plan 前 collate findings。 |

当 research 是 recommended 时，执行它；不要只是 offer。Stale recommendations（closed restaurants、rethemed attractions、outdated prices）比没有 recommendations 更糟。用户调用 `/ce-plan` 是因为想要好 plan，不是想要 training data disclaimer。

**Research decomposition pattern（研究分解模式）：**
1. 根据 task 识别 2-5 个 independent research questions。好问题针对模型最没把握的 facts：current prices、hours、availability、recent changes、seasonal specifics。
2. Dispatch parallel research。按 SKILL.md Core Principle 8 优先使用 user-named surfaces；对于这些 surfaces 无法覆盖的问题，回退到 web search。
3. 进入 planning 前，将 findings collate 为 brief research summary。

Example（示例），针对 "plan a date night in Seattle this Saturday":
- "Seattle Capitol Hill 2026 周六深夜营业的最佳餐厅"
- "Seattle 在 [specific date] 举办的 events"
- "Seattle waterfront 当前状态和营业时间"

## Step 1b：Focused Q&A（聚焦问答）

最多问 3 个问题，针对最会改变 plan 的 unknowns。使用平台 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当没有 blocking tool 或调用报错时（例如 Codex edit modes）才回退到聊天中的编号选项；不能因为需要 schema load 就回退。绝不要静默跳过问题。

**How to ask well（如何问得好）：**
- 提供 informed options，而不是 open-ended blanks。不要问 "When are you going?"，可问 "Mid-week visits have 30-40% shorter lines — are you flexible on timing?" 问题应给用户 frame of reference，而不只是提取信息。
- 当多个 independent choices 可在一个问题中捕获时，使用 multi-select。这紧凑且尊重用户时间。
- 始终包含一个最终选项，例如 **"Skip — just make the plan with reasonable assumptions"**，让用户可随时 opt out。

聚焦于该 task 特有、会改变 plan 推荐内容或结构的 unknowns。不要问超过 3 个；之后对剩余内容使用 assumptions 继续。

## Step 2：Structure the Plan（组织计划）

按这些 quality principles 创建 structured plan。不要使用 software plan template（implementation units、test scenarios、file paths 等）。

### Format：何时直接规定路径，何时呈现选项

不是每个 plan 都应该是单一路径。让格式匹配 task：

| Task type（任务类型） | Best format（最佳格式） | Why（原因） |
|-----------|------------|-----|
| **High personal preference**（food、entertainment、activities、gifts） | 每个 category 提供 curated options；呈现 2-3 个 choices，让用户组合 | Preferences 会变化；单个选择可能 miss。Options 尊重用户 taste。 |
| **Logical sequence**（study plan、project timeline、multi-day trip logistics） | 带清晰顺序的 single prescriptive path | Sequencing 重要；每一步都给 options 会造成 decision paralysis。 |
| **Hybrid**（结构固定但细节可变的 event） | 固定结构，并标记 choice points | skeleton 已定，但具体 vendors/venues/activities 是 options。 |

示例：date night plan 应提供 2-3 个 restaurant options、2-3 个 activity options 和一个 suggested flow，而不是选一家餐厅并围绕它构建整个夜晚。study plan 应 prescribe 一个 single weekly progression，而不是呈现 3 个不同 curricula 供选择。

### Formatting（格式）：bullets 优先于 prose

- 对 actionable content（steps、options、logistics、budgets）优先使用 bullets 和 tables
- 只在 context、rationale 或连接逻辑的解释中使用 prose
- Plans 是用来扫描和执行的，不是从头读到尾的

### Quality principles（质量原则）

- **Actionable steps**：每个 step 都足够具体，无需进一步 research 即可执行
- **Sequenced by dependency**：Steps 顺序正确，并注明 dependencies
- **Time-aware**：相关时包含 timing、durations、deadlines 或 phases
- **Resource-identified**：说明需要什么：tools、materials、people、budget、locations
- **Contingency-aware**：对重要 decisions，注明 alternatives 或 plans change 时怎么办
- **Appropriately detailed**：detail 与 task complexity 匹配。weekend trip 需要的结构少于 3-month curriculum。dinner plan 应简洁，而不是 200-line document。
- **Domain-appropriate format**：选择适合 domain 的结构：
  - travel 用 Itinerary（day-by-day，带 times 和 locations）
  - study plans 用 Syllabus 或 curriculum（topics、resources、milestones）
  - events 用 Runbook（timeline、responsibilities、logistics）
  - business 或 operational tasks 用 Project plan（phases、owners、deliverables）
  - investigations 用 Research plan（questions、methods、sources）
  - preference-driven tasks 用 Options menu（每个 category 的 curated picks）

## Step 3：Save or Share（保存或分享）

structuring plan 后，使用平台 blocking question tool 询问用户希望如何接收它：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当没有 blocking tool 或调用报错时（例如 Codex edit modes）才回退到聊天中的编号选项；不能因为需要 schema load 就回退。绝不要静默跳过问题。

**Question（问题）:** "Plan ready. How would you like to receive it?"

**Options（选项）:**

1. **Save to disk** — 将 plan 写为 markdown file。询问写到哪里：
   - `docs/plans/`（仅当此目录存在时显示）
   - Current working directory（当前工作目录）
   - `/tmp`
   - A custom path（自定义路径）
   - 使用 filename convention：`YYYY-MM-DD-<descriptive-name>-plan.md`
   - 文档以 `# Title` heading 开头，下一行写 `Created: YYYY-MM-DD`。不要 YAML frontmatter。

2. **Publish to Proof — shareable link** — 将 doc 发布到 Every 的 Proof editor，并获得可阅读、评论或分享的链接。加载 `ce-proof` skill 创建 shared document 并返回 URL。
3. **Save summary to disk** — 将 summary 写为 markdown file。

不要提供 `/ce-work`（software-only）或 issue creation（不适用于 non-software plans）。
