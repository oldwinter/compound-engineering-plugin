# `ce-sessions`

> 跨 Claude Code、Codex 和 Cursor 搜索并询问你的 coding agent session history。

`ce-sessions` 是 **session-history search** skill。它是轻量 user-facing entry point，会 dispatch `ce-session-historian`，在三大 coding harnesses（Claude Code、Codex、Cursor）的 session files 中搜索与你问题相关的 context：你做过什么、之前尝试过什么、问题如何调查、最近发生了什么、做过哪些 decisions。

当 memory fades、在新 session 中接上工作、怀疑 "we tried this before but I can't remember the result"，或需要重建导致当前状态的路径时，它很有用。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 跨 Claude Code / Codex / Cursor 搜索你的 session history，寻找与问题相关的 context |
| 何时使用？ | "What did we work on this week?"、"What did I try before?"、"How was X investigated?"、"What did the agent decide about Y?" |
| 产出什么？ | Relevant findings 的 synthesized digest：尝试过什么、什么没成功、关键 decisions、相关 context |
| Cross-platform（跨平台） | 从 `~/.claude/projects/`、`~/.codex/sessions/`、`~/.cursor/projects/` 读取 sessions |

---

## 问题

Coding agent session history 默认很 ephemeral：

- **Memory fades between sessions**：即使 prior context 很相关，新 session 也会冷启动
- **Repeated investigations**：同一个 hypothesis 会被测试两次，因为第一次 session 的 negative result 被忘了
- **Cross-harness blindness**：Codex 中的工作不会出现在 Claude Code agent 面前，即使在同一个 repo 上
- **Branch-scoped context lost**：两周前在同一 branch 上的讨论，没有 tooling 就不可达
- **Knowing-it-happened isn't enough**：只知道 "we tried this" 但不知道 *result*，仍会导致重试

## 解决方案

`ce-sessions` dispatch `ce-session-historian`：一个 specialized agent，会读取三种 harness platforms 的 session files，应用 time 和 repo filters，提取与用户问题相关的 findings，并合成 structured digest：

- 之前尝试过什么
- 什么没成功（以及为什么）
- Key decisions（关键 decisions）
- Related context（相关 context）

Agent 在 working directory 外部运行（harness session-file directories 中），orchestrator-level tools 通常无法访问这些位置，因此这里 delegate 给 agent，而不是 inline 处理。

---

## 新颖之处

### 1. Cross-harness session reading（跨 harness session 读取）

`ce-session-historian` 从 agent 可能留下 context 的三个 locations 读取：

- `~/.claude/projects/`（Claude Code）
- `~/.codex/sessions/`（Codex）
- `~/.cursor/projects/`（Cursor）

如果你昨天用 Codex、今天用 Claude Code，这个 skill 能找到昨天的 context。Single-harness tools 做不到。

### 2. Question-driven synthesis，而不是 raw transcript dump

Agent 不会返回平铺的 session content list。它会围绕用户问题，把 findings 合成为 structured sections：

- **What was tried before**：agent 尝试过的 approaches 和 outcomes
- **What didn't work**：failed hypotheses 和 reasons
- **Key decisions**：prior sessions 中做出的 choices 及 reasoning
- **Related context**：与问题相关的 adjacent findings

如果没有 relevant prior sessions，digest 会明确说明，而不是 fabricated findings。

### 3. Branch-aware filtering（branch 感知过滤）

Skill 会 pre-resolve current git branch 并传给 agent，让 session searches 可以 filter 到同一 branch 上做过的工作；这通常是接续工作或重建 recent context 时最相关的内容。Pre-resolution 使用 `!` backtick mechanism：如果 resolve 为 plain branch name，就传入；如果返回 literal command string（resolution failed），则省略，并由 agent 在 runtime derive branch。

### 4. Thin orchestrator，agent 做重活

Skill 本身是 thin entry point；它的工作是在没有提供 question 时询问 "what would you like to know?"，然后 dispatch historian。Historian 处理实际 search、time filtering、transcript parsing 和 synthesis。这样 user-facing surface 很小，heavy lifting 留给 specialist agent。

### 5. Time-window control（时间窗口控制）

Historian 接受 question 本身中的 time hints（"recently"、"last week"、"since the auth refactor"、explicit dates）。它会把这些解析成 real time windows，并在 filtering sessions 时应用。Default window 有边界，避免 agent 读取所有历史 session files；relevance 优先于 recall。

---

## 快速示例

你正在接续两周前开始的 feature。你不太记得当时是否决定把 notification mute state 放在 per-subscription 还是 per-user 上，想继续前确认。调用 `/ce-sessions "did we decide where notification mute state lives?"`。

Skill pre-resolves branch（`tmchow/notification-mute`），并把 question、current working directory 和 branch hint dispatch 给 `ce-session-historian`。

Historian 在过去 30 天内，跨三个 harness locations 搜索此 branch 上的 sessions。它找到 4 个 Claude Code sessions、1 个 Codex session。它阅读这些 sessions，寻找 mute-state question 的 evidence。返回 digest：

- **Key decisions（关键 decisions）:** "Settled on per-subscription mute state (notification_subscription.mute_until) rather than per-user, per session 2026-04-22. Rationale: per-user would force a global mute across all notification types; users wanted per-type control."
- **Related context（相关 context）:** "Earlier session considered a separate `mutes` table with subscription_id foreign keys. Rejected because the lifecycle is identical to the subscription itself."

你得到了答案。带着恢复的 previous decision context 继续工作。

---

## 何时使用

在以下情况使用 `ce-sessions`：

- 正在接续工作，需要知道之前决定或尝试过什么
- 新 session 看不到 earlier session 学到的内容
- 怀疑 "we tried this before but I can't remember"
- 正在重建导致当前状态的路径
- 问题是 "when did we decide X" 或 "how did we investigate Y"

以下情况跳过 `ce-sessions`：

- Context 位于 committed code 或 docs，而不是 agent sessions：直接读 code/docs
- 只想要 general session metadata（count、timestamps、sizes），不需要 semantic search：直接运行 `plugins/compound-engineering/skills/ce-sessions/scripts/` 中的 `discover-sessions.sh` 和 `extract-metadata.py`
- 你清楚记得某个 single specific session：直接打开 session file

---

## 作为工作流的一部分使用

`ce-sessions` 大多 standalone 调用，但也与其他 skills interlock：

- **`/ce-compound` Phase 1 (Full mode)**：可选地通过 platform 的 skill-invocation primitive 调用 `ce-sessions`，搜索 prior sessions 中的 related context，并把 findings fold 到新 learning 的 "What Didn't Work" section
- **`/ce-debug` Triage**：prior-attempt awareness；当用户暗示已有失败尝试时，investigating 前先问 "what have you already tried"，避免重复 known-failed approaches

此 skill 是跨 Claude Code、Codex 和 Cursor 搜索 sessions 的 canonical entry point；其他 skills 需要 session-history context 时，会通过 platform 的 skill-invocation primitive 调用它。

---

## 单独使用

最常见的是直接使用：

- **With a question（带 question）**：`/ce-sessions "did we decide where notification mute state lives?"`
- **Without a question**：`/ce-sessions` 会问 "what would you like to know about your session history?"
- **Time-bounded**：question 可以包含 time hints（"recently"、"last week"、"since the auth refactor"）
- **Topic-bounded**：question 可以命名 topic、file 或 feature（"how was the migration tested"、"what did we try for the N+1 query"）

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | 询问 "what would you like to know?" |
| `<question>` | 要搜索历史的 direct question |
| `<topic>` | 要收集 context 的 topic |

Skill 会 pre-resolve current git branch；如果 cleanly resolve，就用于 branch filtering。Orchestrator 会从 question 中选择 time windows；default 有边界（7 days）。

---

## 常见问题（FAQ）

**它能跨 Claude Code、Codex 和 Cursor 工作吗？**
可以。`ce-sessions` 从 `~/.claude/projects/`、`~/.codex/sessions/` 和 `~/.cursor/projects/` 读取。Cross-harness work 会被看到。

**没有 relevant prior session 时返回什么？**
Digest 中会有 "no relevant prior sessions" message。Skill 不会 fabricate findings 来填充 digest。

**它如何 filter relevance？**
Skill 用 question 驱动 relevance filter：先 repo、branch 和 time window；如果 branch 无结果，再 keyword match。最多 deep-dive 5 个 sessions；其余跳过。Synthesis subagent 只读取 pre-extracted skeleton/error files，不读取 raw session JSONL。

**为什么这个 skill 存在，而不是直接 dispatch historian agent？**
User-facing surface 应在没有问题时提出正确问题；orchestrator 负责 branch pre-resolution、scan-window choice、deep-dive selection 和 per-session extraction，这些在 main context 中调用 scripts 更 portable。Synthesis-only `ce-session-historian` subagent 接收 pre-extracted file paths 并产出 prose findings；它按设计不能自己运行 discovery pipeline。

**能读取我不在使用的机器上的 sessions 吗？**
不能。它只读取 local session files，例如 `~/.claude/projects/`。其他机器上的 sessions 不可访问。

**它适用于非 software questions 吗？**
Skill 不关心 topic；它搜索你 session files 中的任何内容。如果你用 agent 做过非软件工作，并想查相关历史，这个 skill 也能用。

---

## 另见（See Also）

- [`ce-compound`](./ce-compound.md) - Full-mode capture 期间可 opt-in 调用 `ce-sessions` 做 prior-context enrichment
- [`ce-debug`](./ce-debug.md) - prior-attempt awareness 使用类似 context；有 signal 时询问用户之前失败过什么尝试
- `plugins/compound-engineering/skills/ce-sessions/scripts/` - ce-sessions 调用的 underlying scripts（`discover-sessions.sh`、`extract-metadata.py`、`extract-skeleton.py`、`extract-errors.py`）；需要 raw metadata 或 extraction output 且不需要 orchestration 时可直接运行
