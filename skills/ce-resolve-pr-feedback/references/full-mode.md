# Full Mode（完整模式）

当 Mode Detection（位于 SKILL.md）route 到 **Full Mode** 时读取本 reference：未给 argument，或提供了 PR number。Full mode 处理 PR 上所有 unresolved threads。

## 1. 获取 Unresolved Threads

如果未提供 PR number，从当前 branch 检测：
```bash
gh pr view --json number -q .number
```

然后使用 [scripts/get-pr-comments](../scripts/get-pr-comments) 处的 GraphQL script 获取所有 feedback：

```bash
if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/get-pr-comments" ]; then
  SCRIPT_DIR="${CLAUDE_SKILL_DIR}/scripts"
else
  echo "ce-resolve-pr-feedback bundled scripts are unavailable in this harness; use the fallback gh commands below." >&2
  exit 1
fi

bash "$SCRIPT_DIR/get-pr-comments" PR_NUMBER
```

返回包含三个 keys 的 JSON object：

| Key | Contents | Has file/line? | Resolvable? |
|-----|----------|---------------|-------------|
| `review_threads` | Unresolved inline code review threads（包含 outdated；每个携带 `isOutdated` flag，resolver 可据此处理 line drift） | Yes | Yes (GraphQL) |
| `pr_comments` | Top-level PR conversation comments（排除 PR author） | No | No |
| `review_bodies` | 带 non-empty text 的 review submission bodies（排除 PR author） | No | No |

如果 script 失败，回退到：
```bash
gh pr view PR_NUMBER --json reviews,comments
gh api repos/{owner}/{repo}/pulls/PR_NUMBER/comments
```

## 2. Triage：区分 New 与 Pending

processing 前，将每条 feedback 分类为 **new** 或 **already handled**。

**Review threads**：读取 thread comments。如果已有 substantive reply 承认 concern 但 defer action（例如 "need to align on this"、"going to think through this"，或一个呈现 options 但未 resolve 的回复），它是 **pending decision**，不要 re-process。如果只有 original reviewer comment(s) 而没有 substantive response，则为 **new**。

**PR comments and review bodies**：这些没有 resolve mechanism，因此每次运行都会重新出现。按顺序应用两个 filters：

1. **Actionability**：跳过不包含 actionable feedback 或待回答问题的 items。示例：review wrapper text（"Here are some automated review suggestions..."）、approvals（"this looks great!"）、status badges（"Validated"）、没有 follow-up asks 的 CI summaries。如果没有需要 fix、answer 或 decide 的内容，它就不是 actionable，完全从 count 中 drop。
2. **Already replied**：对 actionable items，检查 PR conversation 中是否已有引用并回应该 feedback 的 reply。如果 reply 已存在，跳过。否则为 new。

区别基于 content，而不是谁发布了什么。来自 teammate、previous skill run 或 manual reply 的 deferral 都算。同样，actionability 基于 content：请求具体 code change 的 bot feedback 是 actionable；包裹这些请求的 bot boilerplate header 不是。

**Silent drop.** Non-actionable items 直接 drop，不叙述。不要在 conversation、task list 或 step 9 summary 中 announce、list 或 count dropped items。CodeRabbit、Codex、Antigravity Code Assist 和 Copilot 的 review-bot wrappers（如 "Here are some automated review suggestions..." 这类 bodies）常出现在这里；按 boilerplate content 识别并静默 drop。只有 CI/status bot summaries（Codecov）在 script level 预过滤；其他全部依赖这个 content-aware check，避免 bot format changes 静默隐藏 actionable findings。

如果所有 feedback types 都没有 new items，跳过 steps 3-8，直接进入 step 9。

## 3. Plan（计划）

创建所有 **new** unresolved items 的 task list（例如 Claude Code 中的 `TaskCreate`，Codex 中的 `update_plan`）；每个待 resolve 的 thread 或 comment 一个 entry。

## 4. Implement（并行）

处理全部三类 feedback types。Review threads 是 primary type；PR comments 和 review bodies 是 secondary，但不应忽略。

### Dispatch（分发）

**对 review threads**（`review_threads`）：为每个 new thread spawn 一个 `ce-pr-comment-resolver` agent。

每个 agent 接收：
- thread ID（thread ID，线程 ID）
- file path 和 location fields：`line`、`originalLine`、`startLine`、`originalStartLine`（任意字段可为 null；outdated 和 file-level threads 常有 `line == null`，必须 fall back to `originalLine`）
- full comment text（thread 中所有 comments）
- PR number（用于 context）
- feedback type（feedback 类型：`review_thread`）
- 来自 thread node 的 `isOutdated` flag（告诉 agent reported line 可能已 drift）

**对 PR comments 和 review bodies**（`pr_comments`、`review_bodies`）：它们缺少 file/line context。为每个 actionable item spawn 一个 `ce-pr-comment-resolver` agent。agent 接收 comment ID、body text、PR number 和 feedback type（`pr_comment` 或 `review_body`）。agent 必须从 comment text 和 PR diff 中识别 relevant files。

### Agent return format（agent 返回格式）

每个 agent 返回 short summary：
- **verdict**：处理结论，值为 `fixed`、`fixed-differently`、`replied`、`not-addressing`、`declined` 或 `needs-human`
- **feedback_id**：已处理的 thread ID 或 comment ID
- **feedback_type**：`review_thread`、`pr_comment` 或 `review_body`
- **reply_text**：要发布的 markdown reply（引用 original feedback 的相关部分）
- **files_changed**：修改过的 files list（如果只是 replied/not-addressing 则为空）
- **reason**：简短说明做了什么，或为什么跳过

Verdict meanings（结论含义）：
- `fixed` -- 按请求完成 code change
- `fixed-differently` -- 完成 code change，但采用比建议更好的 approach
- `replied` -- 不需要 code change；回答问题、解释 design decision，或判断正确点不值得改动
- `not-addressing` -- feedback 对代码事实判断错误；带 evidence 跳过
- `declined` -- observation 可能有效，但实现 suggested fix 会主动让代码变差；reply cite specific harm
- `needs-human` -- 无法判断正确 action；需要 user decision

### Batching and conflict avoidance（批处理与冲突规避）

**Batching**：如果总共 1-4 items，全部 parallel dispatch。对 5+ items，按 4 个一组 batch。

**Conflict avoidance**：触及同一 file 的两个 agents 不应并行运行。dispatching 前，检查 items 之间的 file overlaps。如果两个 items reference 同一 file，将它们 serialize：dispatch 一个，等它完成，再 dispatch 下一个。Non-overlapping items 并行运行。当一个 agent 处理同一 file 上的多个 threads 时，它 sequentially 处理它们。

**Sequential fallback**：不支持 parallel dispatch 的平台应 sequentially 运行 agents。

Fixes 偶尔会扩展到其 referenced file 之外（例如重命名 method 会更新其他位置的 callers）。这很少见，但可能导致 parallel agents 碰撞。Step 5（combined validation）捕获 test breakage；step 8（verify）捕获 unresolved threads。如果任一步发现 parallel fixes 产生 inconsistent changes，sequentially 重新运行受影响 agents。

## 5. Validate Combined State（验证合并后的状态）

所有 agents 完成后，聚合每个 returned summary 中的 `files_changed`。如果为空（所有 verdicts 都是 `replied`、`not-addressing`、`declined` 或 `needs-human`），完全跳过 steps 5 和 6，进入 step 7。

Resolvers 只对自己的 changes 运行 targeted tests。本步骤针对 combined diff **运行一次**项目 full validation，以捕获 targeted runs 看不到的 cross-agent interactions。

1. **运行项目 validation command**（test suite、type check，或 repo 的 AGENTS.md/CLAUDE.md 指定的内容）。运行一次，不要 per-agent。

2. **Green** -> 进入 step 6。

3. **Red，failures 触及 resolvers changed 的 files** -> 做一次 inline diagnose-and-fix pass。重新运行 validation。如果仍 red，使用包含 test output 的 `needs-human` item escalate；**不要** commit。

4. **Red，failures 只触及 resolver 未改动的 files** -> 视为 pre-existing。进入 step 6，但在 commit message 中添加 footer：`Note: pre-existing failure in <test> not addressed by this PR.`

记录 validation outcome（运行的 command、pass/fail counts、任何 noted pre-existing failures），供 step 9 summary 使用。

## 6. Commit and Push（提交并推送）

1. 只 stage sub-agents 报告的 files，并用引用 PR 的 message commit：

```bash
git add [files from agent summaries]
git commit -m "Address PR review feedback (#PR_NUMBER)

- [list changes from agent summaries]"
```

2. Push 到 remote：
```bash
git push
```

## 7. Reply and Resolve（回复并解决）

push 成功后，post replies，并在适用时 resolve。机制取决于 feedback type。

### Reply format（回复格式）

所有 replies 都应 quote original feedback 的 relevant part 以保持 continuity。引用正在回应的 specific sentence 或 passage；如果 comment 很长，不要引用整段。

For fixed items（已修复 items）:
```markdown
> [quoted relevant part of original feedback]

Addressed: [brief description of the fix]
```

For items not addressed（未处理 items）:
```markdown
> [quoted relevant part of original feedback]

Not addressing: [reason with evidence, e.g., "null check already exists at line 85"]
```

For declined items（已拒绝 items）:
```markdown
> [quoted relevant part of original feedback]

Declined: [specific harm cited, e.g., "this would add a defensive null check the type system already guarantees" or "violates the no-premature-abstraction guidance in CLAUDE.md"]
```

For `needs-human` verdicts（需要人工决策的 verdict），post reply，但**不要** resolve thread。让它保持 open，等待 human input。

### Review threads（review threads，审查线程）

0. **Reply 前先 verify thread ID。** GitHub Enterprise 可能因 query path 不同，为同一 thread 返回不一致的 node IDs。始终用 comment 的 numeric URL ID 通过 [scripts/get-thread-for-comment](../scripts/get-thread-for-comment) 确认 `get-pr-comments` 返回的 ID 是否 resolve 到正确 thread：
```bash
if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/get-thread-for-comment" ]; then
  SCRIPT_DIR="${CLAUDE_SKILL_DIR}/scripts"
else
  echo "ce-resolve-pr-feedback bundled scripts are unavailable in this harness; verify the thread ID with gh api if supported." >&2
  exit 1
fi

# 从 comment URL 提取 numeric comment ID（例如 discussion_r2589700 → 2589700）
GH_REPO=OWNER/REPO gh api repos/{owner}/{repo}/pulls/comments/COMMENT_ID --jq .node_id
bash "$SCRIPT_DIR/get-thread-for-comment" PR_NUMBER COMMENT_NODE_ID OWNER/REPO
```
返回的 `id` 是 reply 和 resolve 应使用的 authoritative thread ID。如果它不同于 `get-pr-comments` 返回的 ID，使用这个 script 返回的 ID。

1. 使用 [scripts/reply-to-pr-thread](../scripts/reply-to-pr-thread) **Reply**：
```bash
if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/reply-to-pr-thread" ]; then
  SCRIPT_DIR="${CLAUDE_SKILL_DIR}/scripts"
else
  echo "ce-resolve-pr-feedback bundled scripts are unavailable in this harness; post the reply with gh api or gh pr comment as appropriate." >&2
  exit 1
fi

echo "REPLY_TEXT" | bash "$SCRIPT_DIR/reply-to-pr-thread" THREAD_ID
```

2. 使用 [scripts/resolve-pr-thread](../scripts/resolve-pr-thread) **Resolve**：
```bash
if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/resolve-pr-thread" ]; then
  SCRIPT_DIR="${CLAUDE_SKILL_DIR}/scripts"
else
  echo "ce-resolve-pr-feedback bundled scripts are unavailable in this harness; resolve the thread with gh api if supported." >&2
  exit 1
fi

bash "$SCRIPT_DIR/resolve-pr-thread" THREAD_ID
```

### PR comments and review bodies（PR comments 和 review bodies）

这些无法通过 GitHub API resolve。用 top-level PR comment reply，并 reference original：

```bash
gh pr comment PR_NUMBER --body "REPLY_TEXT"
```

在 reply 中包含足够 quoted context，让读者不用滚动也能看出正在回应哪条 comment。

## 8. Verify（验证）

重新 fetch feedback 以确认 resolution：

```bash
if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/get-pr-comments" ]; then
  SCRIPT_DIR="${CLAUDE_SKILL_DIR}/scripts"
else
  echo "ce-resolve-pr-feedback bundled scripts are unavailable in this harness; use the fallback gh commands from Step 1." >&2
  exit 1
fi

bash "$SCRIPT_DIR/get-pr-comments" PR_NUMBER
```

`review_threads` array 应为空（`needs-human` items 除外）。

**如果仍有 new threads**，检查本次运行的 iteration count：

- **First or second fix-verify cycle**：对 remaining threads 从 step 2 重复。

- **After the second fix-verify cycle**（第 3 pass 将开始时）：停止 looping。向用户 surface remaining issues，并提供 recurring pattern 的 context："Multiple rounds of feedback on [area/theme] suggest a deeper issue. Here's what we've fixed so far and what keeps appearing." 使用同样的 `needs-human` escalation pattern；保持 threads open，并呈现 pattern 供用户决定。

PR comments 和 review bodies 没有 resolve mechanism，因此仍会出现在 output 中。通过检查 PR conversation 验证它们已被 replied。

## 9. Summary（总结）

呈现所有已完成工作的 concise summary。按 verdict 分组，每个 item 一行，描述*做了什么*，而不只是*在哪里*。这是用户看到的 primary output。

Format（格式）：

```
Resolved N of M new items on PR #NUMBER:

Fixed (count): [brief description of each fix]
Fixed differently (count): [what was changed and why the approach differed]
Replied (count): [what questions were answered]
Not addressing (count): [what was skipped and why]
Declined (count): [what was declined and the harm cited]

Validation: [one line -- e.g., "bun test passed (893/893)" or "bun test passed with pre-existing failure in X noted"; omit when no code changes were committed]
```

如果任何 agent 返回 `needs-human`，追加 decisions section。这类情况少见但 high-signal。每个 `needs-human` agent 返回 `decision_context` field，包含 structured analysis：reviewer 说了什么、agent 调查了什么、为什么需要 decision、带 tradeoffs 的 concrete options，以及 agent 的 lean（如有）。

直接呈现 `decision_context`；它已经为用户快速阅读和决策而结构化：

```
Needs your input (count):

1. [decision_context from the agent -- includes quoted feedback,
   investigation findings, why it needs a decision, options with
   tradeoffs, and the agent's recommendation if any]
```

`needs-human` threads 已经发布 natural-sounding acknowledgment reply，并在 PR 上保持 open。

如果存在 **pending decisions from a previous run**（step 2 中检测为 already responded 但仍 unresolved 的 threads），在 new work 后 surface 它们：

```
Still pending from a previous run (count):

1. [Thread path:line] -- [brief description of what's pending]
   Previous reply: [link to the existing reply]
   [Re-present the decision options if the original context is available,
   or summarize what was asked]
```

如果 blocking question tool 可用，用它一次性询问所有 pending decisions（新的 `needs-human` 和 previous-run pending）。如果只有 pending decisions 且没有 new work，summary 就只包含 pending items。

使用平台 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用）、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。用它呈现 decisions 并等待用户回应。用户决定后，处理 remaining items：fix code、compose reply、post it，并 resolve thread。

只有当 harness 中没有 blocking tool 或调用报错时（例如 Codex edit modes），才回退到在 summary output 中呈现 decisions 并在 conversation 中等待；不能因为需要 schema load 就回退。绝不要静默跳过。如果用户未回应，items 会留在 PR 上 open，之后处理。
