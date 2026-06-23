---
name: ce-debug
description: '系统性寻找 root causes 并修复 bugs。用于 debugging errors、investigating test failures、从 issue trackers（GitHub、Linear、Jira）复现 bugs，或在多次失败修复后卡住时。当用户说 ''debug this''、''why is this failing''、''fix this bug''、''trace this error''，或粘贴 stack traces、error messages、issue references 时也使用。'
argument-hint: "[issue reference、error message、test path，或 broken behavior 描述]"
---

# Debug and Fix（调试与修复）

先找到 root causes，再修复它们。这个 skill 会系统性调查 bugs：在提出 fix 前追踪完整 causal chain，并可选地以 test-first discipline 实现修复。

<bug_description> #$ARGUMENTS </bug_description>

## 核心原则

1. **Investigate before fixing.** 在你能无缺口地解释从 trigger 到 symptom 的完整 causal chain 之前，不要提出 fix。"Somehow X leads to Y" 就是缺口。
2. **Predictions for uncertain links.** 当 causal chain 中存在不确定或不明显的 links 时，形成一个 prediction：在另一个 code path 或 scenario 中也必须为真的东西。如果 prediction 错了但 fix “works”，你找到的是 symptom，不是 cause。当链条显而易见时（missing import、明确 null reference），chain explanation 本身就足够。
3. **One change at a time.** 测试一个 hypothesis，改一件事。如果你在改多件事来 “see if it helps”，停下：这是 shotgun debugging。
4. **When stuck, diagnose why — don't just try harder（卡住时诊断原因，而不是硬试）.**

## Execution Flow（执行流程）

| Phase | Name | Purpose |
|-------|------|---------|
| 0 | Triage | 解析 input，如果引用 issue 则 fetch，然后进入 investigation |
| 1 | Investigate | Reproduce the bug，trace the code path |
| 2 | Root Cause | 为 uncertain links 形成带 predictions 的 hypotheses，测试它们，执行 **causal chain gate** 和 smart escalation |
| 3 | Fix | 仅当用户选择修复时执行。带 workspace safety checks 的 test-first fix |
| 4 | Handoff | Structured summary，然后询问用户下一步 action |

除 Phase 0 中的 trivial-bug fast-path 外，不再跳过 phase：complex bugs 只是自然地在每个 phase 花更多时间。没有额外 complexity tiers。

---

### Phase 0: Triage（分诊）

解析 input，并形成清晰 problem statement。

**如果 input 引用了 issue tracker**，fetch 它：
- GitHub（`#123`、`org/repo#123`、github.com URL）：从 `<bug_description>` 解析 issue reference，并用 `gh issue view <number> --json title,body,comments,labels` fetch。对于 URLs，直接将 URL 传给 `gh`。
- 其他 trackers（Linear URL/ID、Jira URL/key、任何 tracker URL）：尝试使用可用 MCP tools 或 fetch URL content。如果 fetch 失败（auth、missing tool、non-public page），请用户粘贴相关 issue content。确保 fetch 包含完整 comment thread，而不只是 opening description。

阅读完整 conversation：original description 以及每条 comment，尤其注意最新 comments。Comments 经常包含更新后的 reproduction steps、收窄后的 scope、prior failed attempts、additional stack traces，或转向另一个 suspected root cause；把 opening post 当作全貌，常会让 investigation 走错方向。从合并后的 thread 中提取 reported symptoms、expected behavior、reproduction steps 和 environment details。然后进入 Phase 1。

**其他所有输入**（stack traces、test paths、error messages、broken behavior 描述）：problem statement 就是 input 本身。

**Trivial-bug fast-path：** 问题清晰后，判断是否真的需要完整 framework。如果 cause 可从 input 中立即读出（single-file typo、missing import、明显 null deref，或一行 fix 的 off-by-one），且 verification 不需要 deep tracing，先呈现 cause 和 proposed one-line fix，并在编辑前运行 Phase 2 的 **Fix it now / Diagnosis only** 用户选择 gate：fast-path 省的是 investigation 仪式，不是用户是否应用 fix 的选择权。如果用户选择 fix，运行 Phase 3 的 **Workspace and branch check**（uncommitted-work confirmation 和 default-branch branch-creation prompt），应用 fix，留下一行 note 解释 cause，并跳到 Phase 4 的 structured summary。如果 diagnosis only，写 summary 并停止。拿不准时，运行完整 framework；错误 root cause 的代价高于几分钟流程。

**否则**，进入 Phase 1。

**Questions（问题）：**
- 默认不要提问：先 investigation（read code、run tests、trace errors）
- 只有当真正的 ambiguity 阻塞 investigation，且无法通过阅读代码或运行测试解决时才提问
- 提问时，问一个具体问题

**Prior-attempt awareness：** 如果用户表示之前已有失败尝试（"I've been trying"、"keeps failing"、"stuck"），在 investigation 前询问他们已经尝试过什么。这能避免重复失败方案，也是少数“先问”才正确的情况之一。

---

### Phase 1: Investigate（调查）

#### 1.1 Reproduce the bug（复现 bug）

确认 bug 存在并理解其行为。运行 test、触发 error、遵循 reported reproduction steps：选择与 input 匹配的方式。

- **Browser bugs：** 如果已安装，优先使用 `agent-browser`。否则使用任何可行方式：MCP browser tools、direct URL testing、screenshot capture 等。
- **Manual setup required：** 如果 reproduction 需要 agent 无法独自创建的特定条件（data states、user roles、external services、environment config），记录准确 setup steps，并引导用户完成。即使流程完全手动，清晰 step-by-step instructions 也能节省大量时间。
- **2-3 次尝试后仍无法 reproduce：** 阅读 `references/investigation-techniques.md` 获取 intermittent-bug techniques。
- **在此 environment 中完全无法 reproduce：** 记录尝试过什么，以及看起来缺少哪些 conditions。
- **Writing the reproduction test：** 如果项目有 testing-conventions guidance（专门的 testing skill、`AGENTS.md`/`CLAUDE.md` testing section，或现有 tests 中清晰的 style），在编写 failing test 时应用它。否则编写最小 isolated test：它在当前 bug 上失败，并在 corrected behavior 落地后通过；命名要描述性强，让 failure message 本身解释 bug。

#### 1.2 Verify environment sanity（验证环境正常）

在 deep code tracing 前，确认 environment 与你的认知一致：

- Correct branch checked out；没有 unintended uncommitted changes
- Dependencies 已安装且 up to date（`bun install`、`npm install`、`bundle install` 等）：stale `node_modules`/`vendor` 是常见 false lead
- Expected interpreter 或 runtime version（检查 `.tool-versions`、`.nvmrc`、`Gemfile` 等，并与实际 active 版本对照）
- Required env vars 存在且非空
- 没有 stale build artifacts（`dist/`、`.next/`、来自早先 branch 的 compiled binaries）
- 当 bug 可能涉及 dependent local services（database、cache、queue）时，它们以 expected versions 运行

#### 1.3 Trace the code path（追踪 code path）

从 symptom 向后追踪 data flow，找到 valid state 最初变为 invalid 的地方。阅读 code-shape 以形成 hypothesis，然后用 observed values 验证：不要只从代码理论化。

具体 recipe：

1. 自底向上阅读 stack trace，并打开每个 frame 的 source。底部 frame 是 symptom；root cause 在上游某处。
2. 找到 input data 已经 invalid 的第一个 frame：这是搜索范围的上界。
3. 对该 frame 周围的 boundaries 做 instrument：targeted log/print statements、debugger breakpoints，或捕获 function entry/exit 处 *actual* values 的 test assertions。Assumed values 会骗人；observed values 不会。
4. 沿 boundaries 走，直到 valid input 变成 invalid output。这个 transition 就是 root cause site。

不要停在第一个看起来不对的 function：root cause 是 bad state 起源之处，而不是它第一次被观察到之处。

Tracing 时：
- 检查你正在阅读文件的 recent changes：`git log --oneline -10 -- [file]`
- 如果 bug 看起来像 regression（"it worked before"），使用 `git bisect`（见 `references/investigation-techniques.md`）
- 检查项目的 observability tools，寻找 additional evidence：
- Error trackers（错误追踪器：Sentry、AppSignal、Datadog、BetterStack、Bugsnag）
- Application logs（应用日志）
- Browser console output（浏览器 console 输出）
- Database state（数据库状态）
- 每个项目可用系统不同；使用任何能给出更完整图景的东西

---

### Phase 2: Root Cause（根因）

*Reminder：investigate before fixing。在你能无缺口地解释从 trigger 到 symptom 的完整 causal chain 之前，不要提出 fix。*

形成 hypotheses 前，读取 `references/anti-patterns.md`。作为它覆盖的 rationalizations 的 load-time preview，如果 internal monologue 包含以下任何内容，停止并重新检查：

- "Quick fix for now, investigate later"（先快速修，之后再调查）
- "This should work"（没有测试过 prediction 的“这应该能行”）
- "Let me just try..."（没有 hypothesis 的“我试一下”）

这些短语标记的是向 symptom patches 的 mode-drift，而不是 root cause 进展。（failed fix 后的 "One more attempt" 和 "works on my machine" 会在它们触发的地方覆盖：Phase 3 的 invalidation step 和下方 Smart Escalation table。）

**Assumption audit（hypothesis formation 前）：** 列出你的理解依赖的具体 "this must be true" beliefs：framework 在这里按预期行为、这个 function 返回其名称暗示的内容、config 在此运行前加载、caller 传入 non-null value、database 处于 test 暗示的 state。对每项标记 *verified*（你读了代码、检查了 state，或运行过）或 *assumed*。Assumptions 是 stuck debugging 最常见来源。很多 "wrong hypotheses" 实际上是 against a wrong assumption 测试的正确 hypotheses。

**Form hypotheses**，按 likelihood 排序。对每个 hypothesis，说明：
- 什么错了，在哪里（file:line）
- **至少一个支持它的 concrete observation**：runtime variable value、log line、instrumented boundary capture、相对 working comparison case 的 behavior delta，或具体 code reference。"X seems off" 不是 evidence；"X equals null at line 42 because Y was never initialized in the constructor path that runs under condition Z" 才是。没有 grounding observations 的 hypotheses 是 theorizing：回到 Phase 1 并 instrument。
- causal chain：trigger 如何一步步导致 observed symptom
- **对于 chain 中 uncertain links**：一个 prediction：如果该 link 正确，则某个不同 code path 或 scenario 中也必须为真的东西

当 causal chain 明显且没有 uncertain links（missing import、明确 type error、显式 null dereference）时，chain explanation 本身就是 gate：不需要 prediction。Predictions 是测试 uncertain links 的工具，不是每个 hypothesis 的仪式。

形成新 hypothesis 前，review 已经 ruled out 的内容和原因。

**Causal chain gate：** 在你能无缺口地解释完整 causal chain（从 original trigger 到 observed symptom 的每一步）之前，不要进入 Phase 3。如果 investigation 卡住，用户可以明确授权基于 best-available hypothesis 继续。

*Reminder：如果 prediction 错了但 fix 看起来 work，你找到的是 symptom。真正 cause 仍然 active。*

#### Present findings（呈现发现）

一旦 root cause 确认，呈现：
- root cause（带 file:line references 的 causal chain summary）
- proposed fix，以及哪些 files 会改变
- 应添加或修改哪些 tests 以防 recurrence（具体 test file、test case description、assertion 应验证什么）
- existing tests 是否本应捕获此问题，以及为什么没有

然后提供 next steps。

使用平台的 blocking question tool（Claude Code 中的 `AskUserQuestion`、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`，Pi 需要 `pi-ask-user` extension）。在 Claude Code 中，如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`；pending schema load 不是 fallback 的理由。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中的编号选项。绝不要静默跳过问题。

提供的 options：

1. **Fix it now** — 进入 Phase 3
2. **Diagnosis only — I'll take it from here** — 跳过 fix，进入 Phase 4 summary，并结束 skill
3. **Rethink the design**（`/ce-brainstorm`）— 仅当 root cause 揭示 design problem 时使用（见下方）

不要假设用户现在想要 action。无论选择哪条路径，test recommendations 都是 diagnosis 的一部分。

**When to suggest brainstorm：** 只有当 investigation 揭示 bug 无法在当前 design 内被正确修复，也就是 design 本身需要改变时才建议。Debugging 中可观察的具体 signals：

- **root cause 是 wrong responsibility 或 interface**，不是 wrong logic。该 module 根本不该做这件事，或 components 之间的 boundary 放错了。（可观察：fix 需要在 modules 之间移动 responsibility，而不是在某个 module 内纠正代码。）
- **requirements 错误或不完整。** system 按设计运行，但 design 不匹配用户真正需要。"bug" 实际上是 product gap。（可观察：代码正是在做它被写来做的事情：spec 才是问题。）
- **每个 fix 都是 workaround。** 你可以 patch symptom，但无法阐明 clean fix，因为 surrounding code 建立在一个不再成立的 assumption 上。（可观察：你一直想添加 special cases 或 flags，而不是直接纠正。）

不要仅因为 bug 大但有 clear fix 就建议 brainstorm：size alone 不会让某事变成 design problem。

#### Smart escalation（智能升级）

如果 2-3 个 hypotheses 都耗尽且未确认，诊断原因：

| Pattern | Diagnosis | Next move |
|---------|-----------|-----------|
| Hypotheses point to different subsystems | Architecture/design problem，不是 localized bug | Present findings，建议 `/ce-brainstorm` |
| Evidence contradicts itself | 代码 mental model 错误 | 后退一步，无 assumptions 地重读 code path |
| Works locally, fails in CI/prod | Environment problem | 聚焦 env differences、config、dependencies、timing |
| Fix works but prediction was wrong | Symptom fix，不是 root cause | 真正 cause 仍然 active：继续 investigating |

**Parallel investigation option：** 当 hypotheses 在明显 independent subsystems 上被 evidence-bottlenecked 时，并行派发 read-only sub-agents，每个都带明确 hypothesis 和 structured evidence-return format。sub-agents 不做 code edits；当 hypotheses 依赖彼此 outcomes 时跳过此选项。如果平台不支持 parallel sub-agent dispatch，就按 ranked-likelihood order 串行运行相同 hypothesis probes：parallelism 是 latency optimization，不是 correctness requirement。

继续前，先向用户呈现 diagnosis。

---

### Phase 3: Fix（修复）

*Reminder：one change at a time。如果你正在改多件事，停下。*

如果用户在 Phase 2 末尾选择 "Diagnosis only"，跳过此 phase，直接进入 Phase 4 summary：skill 的工作是 diagnosis。如果他们选择 "Rethink the design"，control 已转移到 `/ce-brainstorm`，此 skill 结束。

**Workspace and branch check：** 编辑文件前：

- 检查 uncommitted changes（`git status`）。如果用户在需要修改的 files 中有 unstaged work，编辑前确认：不要覆盖 in-progress changes。
- 如果当前 branch 是 default branch，先使用平台的 blocking question tool 询问是否创建 feature branch（per-platform names 见 Phase 2）。检测 default branch 时，与 `main`、`master`，或去掉 `origin/` prefix 后的 `git rev-parse --abbrev-ref origin/HEAD` 值比较（raw output 是 `origin/<name>`，未剥离的比较永远不会匹配 local branch name）。默认创建一个；从 bug 派生 name 并运行 `git checkout -b <name>`。其他 branch 上直接继续。

**Test-first（测试优先）：**
1. 编写捕获 bug 的 failing test（或使用 existing failing test）
2. 验证它因正确原因失败：root cause，而不是 unrelated setup
3. 实现 minimal fix：只处理 root cause，不做其他事。不要把 drive-by refactors、formatting 或 unrelated cleanup 打包进 bug-fix change；它们属于 separate commits。
4. 验证 test passes
5. 运行更广的 test suite 检查 regressions
6. 在宣布 fix done 前 self-review diff：阅读每一行 changed line，检查 style violations、missed edge cases、adjacent behavior regressions，以及 fix 的 test coverage 是否缺失。对于 non-trivial fixes（多文件、risky surface area），还要运行 harness 的 lightweight review tool（例如 Claude Code 中的 `/review`，其他 harness 中的等价物）：不要运行完整 `ce-code-review` multi-agent flow，它是 PR-tier，对单个 bug fix 过大。

**On a failed fix：** 返回 Phase 2，并在形成新 hypothesis 前 *explicitly invalidate the current hypothesis*。大声说明什么 evidence 排除了 prior hypothesis，然后形成带有自己的 grounding observation 和 prediction 的新 hypothesis。不要重试同一理论的 variants（"maybe it was the other branch"、"let me also catch this case"）：那是 rationalization spiral，不是 iteration。

**3 failed fix attempts = smart escalation。** 使用 Phase 2 中同一张表诊断。如果 fixes 持续失败，root cause identification 很可能错了。返回 Phase 2。

**Conditional defense-in-depth**（trigger：grep root-cause pattern 在 3+ 其他 files 中找到，或 bug 若进入 production 会造成灾难）：读取 `references/defense-in-depth.md` 了解 four-layer model（entry validation、invariant check、environment guard、diagnostic breadcrumb），并选择适用 layers。当 root cause 是 one-off error 且无现实 recurrence path 时跳过。

**Conditional post-mortem**（trigger：bug 已在 production 中，或 pattern 出现在 3+ locations）：
分析它如何被引入，以及什么让它得以存活。记下任何 systemic gap 或 repeated pattern：这会影响 Phase 4 是否提供 learning capture。

---

### Phase 4: Handoff（交接）

**Structured summary**：始终先写这个：

```
## Debug Summary
**Problem**: [What was broken]
**Root Cause**: [Full causal chain, with file:line references]
**Recommended Tests**: [Tests to add/modify to prevent recurrence, with specific file and assertion guidance]
**Fix**: [What was changed — or "diagnosis only" if Phase 3 was skipped]
**Prevention**: [Test coverage added; defense-in-depth if applicable]
**Confidence**: [High/Medium/Low]
```

**如果 Phase 3 被跳过**（用户在 Phase 2 选择 "Diagnosis only"），summary 后停止：用户已经告诉你他们会接手。不要 prompt。

**如果 Phase 3 运行过**，下一步取决于 skill 是否在 Phase 3 创建了 branch。

#### Skill-owned branch（在 Phase 3 创建）：默认无需 prompt，直接 commit-and-PR

1. **先检查 contextual overrides。** 查看用户 original prompt、loaded memories，以及 user/repo `AGENTS.md` 或 `CLAUDE.md` 中是否有与 auto commit-and-PR 冲突的 preferences，例如 "always review before pushing"、"open PRs as drafts" 或 "don't open PRs from skills"。signal 必须是明确 instruction 或清晰适用的 rule，而不是模糊 tonal cue。如果有任何适用项，遵守它们：切换到下方 pre-existing-branch menu，或完全跳过 PR step，取决于用户 stated preference。
2. **简短 preview 将发生什么**：会 commit 什么、在哪个 branch 上，以及将打开 PR，然后无需等待确认继续。preview 的存在是为了让用户可以 interrupt；它不是 blocking question。格式和长度由你决定，保持可扫读。
3. **运行 `/ce-commit-push-pr`。** 当入口来自 issue tracker 时，在该 tracker 要求的位置包含合适 auto-close syntax：多数 trackers 解析 PR descriptions（例如 GitHub 的 `Fixes #N`、Linear 的 `Closes ABC-123`），但有些只解析 commit messages（例如 Jira Smart Commits），这样 diagnosis 和 fix 会流回 issue，并在 merge 时关闭它。呈现 resulting PR URL。

#### Pre-existing branch（skill 没有创建它）：询问用户

使用平台的 blocking question tool（Claude Code 中的 `AskUserQuestion`、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`，Pi 需要 `pi-ask-user` extension）。在 Claude Code 中，如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`；pending schema load 不是 fallback 的理由。只有当 harness 中不存在 blocking tool 或调用报错时，才退回到聊天中的编号选项。绝不要在没有收集 response 的情况下结束 phase。

Options（选项）:

1. **Commit and open a PR (`/ce-commit-push-pr`)** — 大多数情况下的默认项
2. **Commit the fix (`/ce-commit`)** — 仅 local commit
3. **Stop here** — 用户从这里接手

#### PR 打开后（任一路径）：考虑提供 learning capture

多数 bugs 都是 localized mechanical fixes（typo、missed null check、missing import），唯一 "lesson" 就是 bug 本身。把这些 compounding 进 `docs/solutions/` 会制造噪音而没有增值。判断适用哪条路径：

- **Skip silently**：当 fix 是 mechanical 且没有 generalizable insight 时。拿不准时默认这样做。
- **Offer neutrally**：当 lesson 能用一句话说明时，例如 "X.foo() returns T | undefined when Y, not just T"，或 "the diagnostic path was non-obvious and worth recording." 如果你无法阐明 lesson，跳过而不是 offer。
- **Lean into the offer**：当 pattern 出现在 3+ locations，或 root cause 揭示关于 shared dependency、framework 或 convention 的 wrong assumption，而其他代码很可能重复它时。

提供时，使用上文描述的 blocking question tool。如果用户接受，运行 `/ce-compound`，然后将生成的 learning doc commit 到同一 branch 并 push，让 open PR 获得新 commit。
