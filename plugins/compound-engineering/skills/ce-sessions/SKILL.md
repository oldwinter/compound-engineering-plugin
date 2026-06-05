---
name: ce-sessions
description: "跨 Claude Code、Codex 和 Cursor 搜索 coding agent session history 并回答相关问题。当用户询问做过什么、之前尝试过什么、某个问题在多个 sessions 中如何调查、最近发生了什么，或任何关于 past agent sessions 的问题时使用。用户提到 prior sessions、previous attempts 或 past investigations 时也使用，即使没有明确说 'sessions'。"
---

# /ce-sessions

搜索 Claude Code、Codex 和 Cursor 的 session history，并综合 prior sessions 中做过、尝试过、决定过或学到的内容。

## Usage（用法）

```
/ce-sessions [question or topic]
/ce-sessions
```

## 预解析上下文

**Git branch（预解析）：** !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`

如果上一行解析为普通 branch name（例如 `feat/my-branch`），将其用于 branch filtering，并传给 synthesis subagent。如果它仍包含反引号命令字符串或为空，则在 runtime 中派生 branch。

**Repo root（预解析）：** !`git rev-parse --show-toplevel 2>/dev/null || true`

如果上一行解析为 path，取其最后一个 path component 作为 repo folder name，并用于 session discovery。如果它为空或仍包含反引号命令字符串，则在 runtime 中派生 repo name。

## Note：2026（年份提示）

当前年份是 2026。解释 session timestamps 时使用这个信息。

## Guardrails（护栏）

这些规则在 orchestration 和 synthesis 全程适用。

- **绝不要把整个 session files 读入 context。** Session files 可能有 1-7MB。始终先使用 extraction scripts 过滤，再基于过滤后的 output 推理。
- **绝不要逐字提取或复现 tool call inputs/outputs。** 总结尝试了什么以及发生了什么。
- **绝不要包含 thinking 或 reasoning block 内容。** Claude Code thinking blocks 是 internal reasoning；Codex reasoning blocks 是加密的。二者都不可行动。
- **绝不要分析当前 session。** 它的 conversation history 已经对 caller 可用。
- **呈现 technical content，而不是 personal content。** Sessions 包含一切：credentials、frustration、half-formed opinions。判断什么属于 technical summary，什么不属于。
- **遇到 access errors 快速失败。** 如果 session discovery 因权限失败，立即报告问题。不要用不同工具或方法重试同一个操作；重复重试只浪费 tokens，不会改变 outcome。

## Execution（执行流程）

如果没有提供 question argument，询问用户想了解 session history 的什么内容。使用平台的 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到 plain text 提问；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题。

### Step 1 — Determine scan window（确定扫描窗口）

从用户问题推断 time range。先从窄窗口开始；只有当窄扫描没有找到相关内容时才扩大。

| Signal（信号） | Initial scan window（初始扫描窗口） |
|--------|---------------------|
| "today", "this morning" | 1 day |
| "recently", "last few days", "this week"，或无时间信号 | 7 days |
| "last few weeks", "this month" | 30 days |
| "last few months"，宽泛 feature history | 90 days |

Claude Code 默认保留约 30 天 session history。除非用户延长了 retention，否则更宽窗口在 Claude Code 上可能找不到内容。

### Step 2 — Discover sessions and extract metadata（发现 sessions 并提取 metadata）

运行 discovery + metadata pipeline（保留 null-delimited xargs hardening，使 `extract-metadata.py` 能以 batch mode 运行）：

```bash
bash scripts/discover-sessions.sh <repo> <days> | tr '\n' '\0' | xargs -0 python3 scripts/extract-metadata.py --cwd-filter <repo>
```

每个 output line 都是描述某个 session 的 JSON object（platform、file、size、ts、session，以及 platform-specific fields）。最后的 `_meta` line 携带 `files_processed` 和 `parse_errors`。

如果 inventory 的 `_meta` line 显示 `files_processed: 0`，返回 "no relevant prior sessions" 并停止。

如果 `parse_errors > 0`，说明有些 sessions 无法解析，并继续使用已返回内容。

要收窄 platform set，在 `discover-sessions.sh` 调用中添加 `--platform claude`、`--platform codex` 或 `--platform cursor`。默认使用三者。

### Step 3 — Filter and rank（过滤和排序）

按顺序应用这些 filters，挑选值得 deep-diving 的 sessions：

1. **Branch filter（仅 Claude Code）。** 保留 `branch == dispatch_branch` 完全匹配的 sessions，或 branch name 包含问题 topic keyword 的 sessions（例如关于 "auth middleware" 的问题会匹配 branches `feat/auth-fix`、`chore/auth-refactor`）。Codex sessions 不携带 `gitBranch`，对它们跳过此 filter。

2. **如果 branch filter 返回零 sessions，或正在处理 Codex sessions：**
   - 从问题 topic 派生 2-4 个 keywords。对于 "a recent crash in the auth middleware where session-validation rejects valid tokens"，派生 `auth,middleware,session,token`（或类似）。
   - 重新调用 discovery pipeline，并在 `extract-metadata.py` 调用后追加 `--keyword K1,K2,...`。脚本返回 `match_count` 非零的 sessions，以及每个 keyword 的 counts。
   - **如果 `files_matched: 0`，返回 "no relevant prior sessions" 并停止。** 不要提取任何内容。
   - 如果 `files_matched > 0`，将这些 sessions 视为 candidates。按 `match_count` 排序，平手时按 per-keyword counts 打破。

3. **丢弃 scan window 外的 sessions。** 可用时使用 `last_ts`，否则回退到 `ts`。如果二者都早于 window start，丢弃该 session。

4. **排除当前 session**：它的 conversation history 已对 caller 可用。

5. **应用 deep-dive cap。** 所有 platforms 合计最多取 **5 个 sessions**。按 branch-match → `match_count` → file size > 30KB → recency 收窄。

6. **只有过滤后至少剩一个 session 才继续。** 否则返回 "no relevant prior sessions" 并停止。

**注意：`gitBranch` 只在第一条用户消息时捕获。** 一个从 `main` 开始、随后通过 mid-session `git checkout` 在 feature branch 上做了大量工作的 session，会记录为 `branch: "main"`。Branch-match 没有返回结果不是决定性证据，这就是 step 2 需要 keyword-filter fallback 的原因。

### Step 4 — Set up scratch space（设置 scratch space）

创建 per-run throwaway scratch directory：

```bash
SCRATCH=$(mktemp -d -t ce-sessions-XXXXXX)
```

捕获 absolute path，并将它贯穿 Step 5 和 Step 6。OS 会在 session 结束时处理 cleanup；在 Step 7 末尾显式 `rm -rf "$SCRATCH"` 也无害，并让意图更明确。

### Step 5 — Extract per-session content（file-mediated，提取每个 session 的内容）

对每个 selected session，使用 `--output` 运行 skeleton extractor，让 content 直接写入 scratch file：extraction bytes 永远不通过 orchestrator 的 tool results 往返。

```bash
python3 scripts/extract-skeleton.py --output "$SCRATCH/<session-id>.skeleton.txt" < <session-file>
```

Stdout 只接收一行 JSON status（`{"_meta": true, "wrote": "...", "bytes": N, ...}`）。从每个 status line 捕获 `bytes` 和 `parse_errors`。

**Conditional tail-extract**：如果 skeleton 在 mid-investigation 处终止（最后可见 turn 是无结论的 tool call，或 assistant 正处于无结论的 mid-debugging），用 `tail` shape 重新提取：

```bash
python3 scripts/extract-skeleton.py --output "$SCRATCH/<session-id>.skeleton.tail.txt" < <session-file>
```

（skeleton script 不直接接受 `tail:N` cap；如果需要 tail-only view，在提取后用 shell 对 scratch file 做 `tail -n 50` post-process。只有当 head output 显示 session 在 mid-investigation 被截断时才使用。）

**Conditional errors-mode**：用于 investigation dead-ends 可能有价值的 sessions：

```bash
python3 scripts/extract-errors.py --output "$SCRATCH/<session-id>.errors.txt" < <session-file>
```

选择性使用：只有当理解哪里出了问题有价值时才使用。Cursor agent transcripts 不记录 tool results，所以 errors-mode 对 Cursor sessions 不产生内容。

### Step 6 — Dispatch synthesis subagent（派发综合 subagent）

通过平台的 subagent primitive 派发 `ce-session-historian` subagent（Claude Code 中的 `Agent`、Codex 中的 `spawn_agent`、Pi 中通过 `pi-subagents` extension 使用 `subagent`）。省略 `mode` 参数，让用户配置的 permission settings 生效。使用 mid-tier model（例如 Claude Code 中的 `model: "sonnet"`）：synthesizer 不需要 frontier reasoning。

dispatch prompt 是 agent 的 input contract。传入这些字段：

- `problem_topic` — 用一句话命名具体问题。从用户 argument 中提取；如果缺失，则从 no-arg prompt 的回答中提取。
- `scratch_dir` — `$SCRATCH` 的 absolute path。
- `sessions` — objects 数组，每个 extracted session 一个，每个包含：
  - `path` — skeleton file 的 absolute path（提取 errors file 时可选带 `errors_path`）
  - `platform` — `claude`、`codex` 或 `cursor`
  - `branch` — 存在时的 git branch（仅 Claude Code）
  - `cwd` — 存在时的 working directory（仅 Codex）
  - `ts` 和 `last_ts` — session timestamps
  - `match_count` 和 `keyword_matches` — 使用 keyword filtering 时
- `output_schema` — agent response 应遵循的结构。默认 schema：
  ```
  Structure your response with these sections (omit any with no findings):
  - What was tried before
  - What didn't work
  - Key decisions
  - Related context
  ```
  当 caller（例如 `ce-compound`）在 skill argument 中提供 schema 时，逐字传递。

Example dispatch shape（dispatch 形状示例）:

```
Synthesize findings from these prior sessions:

Problem topic: <one-line topic>

Sessions to read (paths in $SCRATCH):
1. /tmp/ce-sessions-XXXX/abc123.skeleton.txt
   platform=claude branch=feat/auth-fix ts=2026-05-01
2. /tmp/ce-sessions-XXXX/def456.skeleton.txt  errors=/tmp/ce-sessions-XXXX/def456.errors.txt
   platform=codex cwd=/Users/.../my-project ts=2026-05-03
...

Output schema:
- What was tried before
- What didn't work
- Key decisions
- Related context

Filter rule: only surface findings directly relevant to this specific problem.
Ignore unrelated work from the same sessions or branches.
```

agent 通过平台的 native file-read tool 读取每个 path，并返回 prose findings。Bulk extraction content 只存在于 agent 的 subagent context 中；orchestrator 的 working state 只保留 file paths 和小型 inventory metadata。

### Step 7 — Return findings（返回 findings）

将 synthesizer 的 output text 逐字返回给 caller。如果 discovery 或 keyword filtering 返回零 sessions（Step 2 或 Step 3），则返回 literal string `no relevant prior sessions`。

可选 cleanup scratch：

```bash
rm -rf "$SCRATCH"
```

无论如何 OS 最终都会处理 cleanup；显式 cleanup 是给期待看到它的读者看的。

## Output（输出）

当 caller（通常是输入 `/ce-sessions` 的用户，或另一个通过平台 skill-invocation primitive 调用 ce-sessions 的 skill）没有指定 output format 时，包含简短 header，说明搜索了什么：

```
**Sessions searched**: [count] ([N] Claude Code, [N] Codex, [N] Cursor) | [date range]
```

然后输出 synthesizer 的 prose findings。当 caller 提供 schema 时，逐字遵守它，并省略默认 header。

## Time budget（时间预算）

一旦有完整答案就停止。几秒内得到的可信 "no relevant prior sessions" 就是完整答案；不要为了填时间而延长搜索。Step 3（最多 deep-dive 5 个 sessions）和 Step 5（conditional tail/errors extraction）的结构性 caps 从构造上限制 runtime。

## Error handling（错误处理）

如果 discovery pipeline 失败（例如 home directory 不可读、permission failure），向 caller 呈现 error。不要用 git log、file listings 或其他来源替代：此 skill 的 contract 是 session metadata 和 synthesis。

如果 extraction `--output` 写入失败（disk full、permission），呈现清晰 error，不要用 partial paths 派发 synthesizer。

如果任何 script 的 `_meta` 报告 `parse_errors > 0`，在 dispatch prompt 中注明 partial extraction 并继续；synthesizer 会在 findings 中标记 partial。
