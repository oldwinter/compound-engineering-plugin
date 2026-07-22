---
name: ce-explain
description: "Create a durable, visual teaching artifact — plus an optional check-in (predict-then-reveal for diffs, corrected exercises) that makes it stick — for something worth learning: a concept, a diff, an idea, or a window of your own recent work. Use when the user wants to be taught, wants a deep explainer, wants to understand a substantial change, or wants a work recap built for retention. Not for ordinary Q&A, brief 'why?' follow-ups, operational diagnosis, status updates, or a concise trade-off answer that belongs inline in chat. For learning, not repo docs or verdicts."
argument-hint: "[a concept, a diff ref, an idea, or 'what happened this week?'] — or invoke bare to be asked"
---

# Explain It To Me

**中文导读：** 只有用户明确想学习、需要 deep explainer 或希望保留 durable teaching artifact 时才运行完整流程。普通 Q&A、operational diagnosis、status update 或简短 trade-off 应直接在 chat 回答；只有背后确有值得学习的 concept 时，才另行提议生成 visual explainer。下方英文内容是 canonical executable contract，必须按原文执行。

Teach the user one thing well: a concept, a change, an idea, or a window of their own recent work. Agent-driven development removed the learning that writing code by hand used to provide; this skill is the replacement — the human keeps learning while agents do the writing.

What to explain is the input this skill was invoked with, present in the current prompt or conversation (whether the user asked directly or a calling skill passed it).

**Note: The current year is 2026.** Use this when weighting external sources and dating artifacts.

## Who the explainer is for

The user personally — dense, technical, one voice, no audience adaptation. Meeting prep preps the user; it never produces the deck. The artifact is display-only: no embedded quizzes, forms, or widgets — the doing happens in the session, where answers can be checked.

## Interaction Method

When you must ask the user a question, use the platform's blocking question tool: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex, `ask_question` in Antigravity CLI (`agy`), `ask_user` in Pi (requires the `pi-ask-user` extension). Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors (e.g., Codex edit modes) — not because a schema load is required. In the fallback, stop and wait for the user's reply. Never silently skip the question. Ask one question at a time.

## Model Tiers

Dispatch is tiered by task shape, never hardcoded to a model name:

- **Extraction tier** — the work-recap scout: search-and-quote work. Use the platform's cheapest capable model when the harness exposes a known override; otherwise inherit.
- **Ceiling tier** — the explainer composition, the check-in reasoning, and the corrections. These run in the main conversation on the orchestrator's model; nothing is dispatched for them.

**Degradation rule.** When the platform's subagent primitive cannot select per-agent models, dispatch scouts on the inherited model and keep their read budgets. When the platform has no subagent primitive at all, run the scout work inline with the same budgets.

## Execution Flow

### Phase 1: Classify the input

Read `references/intake.md` now and classify the request into one of the four input shapes — concept, diff, idea, or work-recap window. It owns the token table (`diff:`, `since:`, `output:`), the explicit-token-beats-inference rule, the concept-vs-diff tiebreak, and conflict handling. Do not improvise classification.

**Bare invocation** (no input at all): ask one blocking question — "What should I explain?" — offering a shortcut option for a recap of recent work in this repo alongside free-text. Do not produce a default artifact unprompted.

**Operational-question gate.** Not every *concept by inference* wants the teaching flow this skill runs — many just want a direct answer. When such a request (no `diff:`/`since:` token, no wording that plainly asks to learn or build like "teach me how X works") reads as one better answered in chat — e.g. diagnosing or operating current behavior ("why is X doing Y", "is X configured right") — answer it directly. Then offer to teach it only when a real underlying concept sits behind the question that the user would plausibly want to learn — not as a reflexive add-on to every answer — phrased plainly, e.g. "Want me to actually walk you through how this works? I can build you a visual explainer to keep." Create the run directory and profile the repo only if they take it. A request that plainly wants to learn, or that carries a build signal, skips the gate and is taught in full.

### Phase 2: Ground

Match grounding to the input shape. Create the run directory first — every run gets one, before any artifact exists:

```bash
SCRATCH_ROOT="/tmp/compound-engineering-$(id -u)";
if [ -L "$SCRATCH_ROOT" ]; then echo "unsafe scratch root symlink: $SCRATCH_ROOT" >&2; exit 1; fi;
install -d -m 700 "$SCRATCH_ROOT" || exit 1;
if [ -L "$SCRATCH_ROOT" ] || [ ! -O "$SCRATCH_ROOT" ]; then echo "scratch root is not owned by the current user: $SCRATCH_ROOT" >&2; exit 1; fi;
chmod 700 "$SCRATCH_ROOT" || exit 1;
RUN_DIR="$SCRATCH_ROOT/ce-explain/$(date +%Y%m%d)-$(openssl rand -hex 3)";
(umask 077; mkdir -p "$RUN_DIR") || exit 1; chmod 700 "$RUN_DIR" || exit 1;
echo "$RUN_DIR";
```

**Repo-touching inputs** (a concept with footprint in this repo, a diff, a recap): use the project's active instructions already in context and go directly to the diff, call-sites, current source, or commits. Read `CONCEPTS.md` when canonical vocabulary matters. If the topic cannot be scoped from the input and existing context, allow one targeted root or workspace probe.

- **Diff mode:** resolve the change (the `diff:` ref, or the most recent substantial change when the request points at one implicitly) and gather its evidence — the diff itself, the files it touches, any plan or solution doc that motivated it. Gather silently: nothing learned here is narrated to the user until Phase 3's ordering rule is satisfied.
- **Recap mode：** 直接分派一个 generic subagent，以 `references/agents/work-recap-scout.md`（extraction tier）为 prompt，并传入 resolved window、repo root 和 `$RUN_DIR`。不要在主对话中预先扫描、计数或描述 window；该 evidence pass 由 scout 负责，过早的 `git --all` summary 可能让它基于错误的 branch 或 activity model 工作。它返回包含 commit shas 和 `file:line` pointers 的 evidence summary。**Empty window**（无 git activity、无 doc changes）：如实说明，提议扩大 window，不写 artifact，并在用户回应后结束 run。
- **External concepts** (no footprint in this repo): skip repo grounding entirely — do not force repo context into the output. Research with whatever web tools are reachable. When none are, you may explain from model knowledge, but the artifact must label that content **Unverified — from model knowledge, not checked against current sources** in its metadata header.
- **Idea mode:** the idea is a fixed given. Explain its implications, mechanics, and trade-offs for the user's understanding. Never scope it (`ce-brainstorm`'s job), never generate and rank alternatives (`ce-ideate`'s job).

### Phase 3: Check-in gate — before anything is revealed

判断材料是否值得 check-in（常规 recap 不需要；复杂 diff 或困难 concept 需要），然后用 blocking question tool 提供选择。先放 **Just the explainer (Recommended)**，再放 **Quiz me**；常见路径是 report，而不是 exercise loop。把用户 Phase 3 的确切选择记录为 **Just the explainer** 或 **Quiz me**，不要把两者都压缩成 "accepted" boolean。只有 **Quiz me** 启用 prediction 和 exercise mechanics；**Just the explainer** 跳过两者，但仍组成并展示 report。如果 warrant test 跳过 offer，则不使用任一 mechanic，直接继续。用户始终可以拒绝，且拒绝后不得重新争论。Warrant test、prediction protocol 和 exercise design 见 `references/check-in.md`。

**Diff mode 且选择 Quiz me — 严格 ordering rule。** 用户的 prediction turn 结束前，不得展示任何 interpretive content，包括 explanation、annotation、diagram 或 surfaced opportunity。只展示 raw change reference（diff 或其 stat summary），询问 prediction（"你认为这项 change 做了什么，为什么要这样改？"），然后**在此结束 turn**。没有 blocking tool 时，在 chat 中提问并停止；绝不要在 prediction prompt 的同一条消息中输出 reveal。只有 prediction 返回后才组成 explainer；reveal 要指出 prediction 与 change 实际作用之间的差距。

### Phase 4: Compose the explainer

Read the rendering reference for the resolved format **now**, not earlier: `references/explainer-html.md` (default) or `references/explainer-markdown.md` (when intake resolved `output:md`). Compose per its contract — visible metadata header, show-n-tell form matched to the material, ~70ch measure, single self-contained file — and write the artifact to `$RUN_DIR/explainer.html` (or `$RUN_DIR/explainer.md` when intake resolved `output:md`) before anything else happens with it. Display it to the user (inline summary plus the file path; open locally per Phase 6 when chosen). The artifact exists at that stable path from this moment — a declined destination ask never loses it.

### Phase 5：Exercises（仅当选择 Quiz me）

仅当记录的 Phase 3 确切选择为 **Quiz me** 时运行本 phase。对于 concepts、ideas 和 dense recaps，在 chat 中逐个提出 `references/check-in.md` 中的 exercises；选项形式适合时使用 blocking question tool，答案属于 narrative 时使用 free chat。检查并纠正每个回答，指出它暴露的 gap。不要把 exercises 放进 artifact。选择 **Just the explainer** 时跳过本 phase，直接进入 destination ask。

### Phase 6: Destination ask and close

按 capability 检测 destinations：探测 agent 自身 toolset 和 session context，绝不依赖封闭列表；当 connector 可能提供 capability 时，也绝不能把缺少 binary、env var 或尚未加载的 MCP tool 当作 destination 不可用的证明。Local file 和 Leave it 不设 gate，始终提供。默认 HTML run 只提供一个首选 publisher：在 Claude Code 中且存在 Artifact tool 时使用 Claude Artifact，否则使用 ht-ml.app。默认不要同时显示两者，但应遵从用户对任一项的明确请求。Publishing 始终需要用户选择 destination；ht-ml.app 是公开服务，绝不能 headlessly 选择。只提供检测到的选项；缺失选项静默隐藏。使用 blocking question tool 提问一次，先根据平台上限计算可见选项数（Claude Code `AskUserQuestion` 最多 4 个明确选项；Codex `request_user_input` 只有 2-3 个）；如果可见集合超过上限，改在 chat 中渲染编号列表和 "请选择一个编号，或描述你想要的处理方式。"，然后等待。各选项路由如下：

- **Claude Artifact**（仅 HTML；Claude Code 存在 Artifact tool 时首选） — 按 `references/destinations.md` 从 canonical explainer 创建 artifact，并遵循 Artifact tool 当前 contract。
- **公开发布到 ht-ml.app**（仅 HTML；未选择 Claude Artifact adapter 时首选） — 标为 Recommended，并在选项说明中声明页面公开，可能被索引、爬取、复制或归档。如果明确的 publish 请求绕过了菜单，先在 chat 中给出完整警告，再取得明确确认后才可调用；警告前的请求不算确认。如果无法取得确认，不得发布；保留 canonical HTML，并报告本地 `$RUN_DIR/explainer.html` path。用户选择已警告的菜单选项，或在警告后明确确认时，读取并遵循 `references/destinations.md` 的 ht-ml.app sub-flow，把完整 canonical HTML 传给已解析的 publisher。不要假设某个特定 skill 存在，也不要添加 ce-explain 专用 publisher。
- **Local file** — copy the artifact out of `$RUN_DIR` to the path the user names, then where the platform exposes a browser-opening primitive (`open` on macOS, `xdg-open` on Linux, `start` on Windows) offer to open it; otherwise print the absolute path.
- **Publish to Proof** (markdown output only) — publish per `references/destinations.md` and surface the returned share URL; on failure retry once, then report and move on.
- **Send to Thinkroom** (offered only when a Thinkroom skill or CLI capability is detected) — send per `references/destinations.md`.
- **Leave it** — report the `$RUN_DIR` path and state it is a temporary location that does not survive reboot; nothing else is written.

**Non-interactive degradation:** when no interaction is possible at this ask (no blocking tool and no reply), do not hang and do not discard — the artifact is already at `$RUN_DIR`; report that path and end, skipping the improvement-observation handoffs below (they are offers, and an offer cannot fire without a user).

**Improvement observations.** When composing the explainer surfaced things that could be better, route them by type after the destination ask — offer, don't auto-fire:

**User-runnable invocation rendering.** Only the user-run handoff below uses printed invocation syntax. Default to `/ce-polish`; use `$ce-polish` only when the active host is Codex or explicitly documents dollar-prefixed skill invocation. Render only the invocation as inline code and output one form only.

- **New-capability ideas** — offer first; on acceptance invoke the `ce-ideate` skill via the platform's skill-invocation primitive, passing the observations as seed context. Do not merely tell the user to run it.
- **Code-clarity findings** — offer first; on acceptance invoke the `ce-simplify-code` skill via the platform's skill-invocation primitive, passing the observations and the files they concern. Do not merely tell the user to run it.
- **UI/UX polish opportunities** — present the observations in chat and tell the user to invoke `ce-polish` themselves using the rendering rule above; `ce-polish` is user-invoked only (`disable-model-invocation`), so never attempt to invoke it via the skill primitive. The in-session observations carry into their run.

## Boundaries

- **Not a verdict.** "Should we adopt X?" is `ce-pov`. ce-explain teaches what X is and how it works.
- **Not repo memory.** Documenting a solved problem for future work is `ce-compound`. ce-explain teaches the human, not the repo.
- **Not ideation or scoping.** An idea input is explained as given — implications and trade-offs — never expanded into options or a requirements dialogue.
- **The check-in is never headless.** It exists to exercise the human; automating the answers deletes the product.
