# HITL Review Mode（人工参与 Review 模式）

面向通过 Proof 共享的 markdown document 的 human-in-the-loop iteration loop。它可以由 upstream skill（`ce-brainstorm`、`ce-ideate`、`ce-plan`）交接自己生成的 draft 调用，也可以由用户直接要求迭代磁盘上已有 markdown 文件时调用（“share this to proof and iterate”、“HITL this doc with me”）。两种情况的 mechanics 相同：上传 local doc，让用户在 Proof 的 web UI 中批注，摄取 feedback 作为 in-thread replies 和 agreed edits，再把 final doc sync 回磁盘。

此 mode 假设本地 markdown file 已存在。没有 “from scratch” entry；如果用户想要 fresh doc，先用常规 proof create workflow 创建，再调用 HITL。

当请求 HITL review mode 时加载此文件——不管是 upstream caller 还是用户直接请求。

---

## Invocation Contract（调用契约）

Inputs（输入）：

- **Source file path**（required）：本地 markdown file 的 absolute 或 repo-relative path。upstream caller 调用此 mode 时会显式传入 path。用户直接调用时（“share that doc to proof and let's iterate”），从 conversation context 推导 path：用户刚刚引用、创建或编辑的文件。如果有歧义，询问用户是哪一个文件。
- **Doc title**（required）：Proof doc 的 display title。Upstream callers 会显式传入；direct-user invocation 默认用文件的 H1 heading；如果没有 H1，则 fallback 到 filename（去掉 extension）。
- **Recommended next step**（optional，caller-specific）：caller 希望在 final terminal output 中回显的短字符串（例如 “Recommended next: `/ce-plan`”）。direct-user invocation 不使用；terminal report 只总结 iteration 并询问下一步。

Agent identity 固定，不是参数：每个 API call 都使用 agent ID `ai:compound-engineering` 和 display name `Compound Engineering`。Callers 不覆盖它。

Return shape（返回结构，供 upstream callers 恢复 handoff，也会在 direct invocation 时显示给 terminal 用户）：

- `status`: `proceeded` | `done_for_now` | `aborted`
- `localPath`: source file path（与 input 相同）
- `localSynced`: 如果 Phase 5 已把 reviewed doc 写回 `localPath`，为 `true`；如果用户拒绝 sync 且 local 已 stale，为 `false`。仅在 `proceeded` 时出现。
- `docUrl`: Proof doc 的 tokenUrl
- `openThreadCount`: doc 中 unresolved threads 数量
- `revision`: end-sync 后的 final doc revision（仅在 `proceeded` 时）

---

## Phase 1：Upload and Wait（上传并等待）

1. 读取本地 markdown file 到内存。把这份内容记为 `uploadedMarkdown`——Phase 5 会用它比较 session 中是否发生了任何变化。
2. `POST https://www.proofeditor.ai/share/markdown`，body 为 `{title, markdown}` → 捕获 `slug`、`accessToken`、`tokenUrl`
3. `POST /api/agent/{slug}/presence`，带 `X-Agent-Id: ai:compound-engineering`、`x-share-token: <token>`，body 为 `{"name":"Compound Engineering","status":"reading","summary":"Uploaded doc for review"}`
4. 在 terminal 中醒目展示：

   ```
   Doc ready for review: <tokenUrl>
   ```

5. 使用平台阻塞式问题工具询问用户：Claude Code 中为 `AskUserQuestion`（如果 schema 未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`），Codex 中为 `request_user_input`，Gemini 中为 `ask_user`，Pi 中为 `ask_user`（需 `pi-ask-user` extension）。只有在 harness 中不存在 blocking tool 或调用报错时（例如 Codex edit modes），才 fallback 到在 chat 中展示 options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。

   **Question（问题）:** "在 Proof 中高亮文本即可留下 comment。agent 会读取每条 comment，在线程中回复或应用 fix，然后把 changes sync 回你的本地文件。下一步怎么做？"

   **Options（选项）:**
   - **我已经完成 feedback — 读取并应用**
   - **我没有 feedback — 继续**

   如果用户仍在 reviewing，他们会让 prompt 保持打开；blocking question 会自然等待。第三个 “still working” option 只是 no-op wrapper，不需要提供。

   选择 **我没有 feedback — 继续**：跳到 Phase 5（end-sync）；以 `status: proceeded` 返回 caller。

   选择 **我已经完成 feedback**：继续 Phase 2。

---

## Phase 2：Ingest Pass（摄取回合）

对当前 doc state 做一次 pass。Deterministic、idempotent，且可从 marks 推导——没有 session cache，没有 sidecar state。

pass 开始时，将 presence 更新为 `status: "acting"`，summary 类似 `"Reading your feedback"`，这样正在看 Proof tab 的人会看到 agent 正在处理他们的 comments。在 Phase 3 terminal report 之前更新为 `status: "waiting"`，这样 tab 会在 terminal 询问下一步信号时显示 “ball is in your court”。使用与 Phase 1 相同的 `POST /presence` call，只是 `status`/`summary` 不同。

### 2.1 读取 fresh state

```
GET /api/agent/{slug}/state?kinds=comment
Headers: x-share-token: <token>
```

捕获：
- `markdown`（当前正文——包含任何用户 direct edits 和 accepted suggestions）
- `revision`
- `marks`（以 markId 为 key 的 object，filtered to comment marks）
- `mutationBase.token`——本轮 mutations 所需的 baseToken

### 2.2 识别需要 attention 的 marks

把 `marks` 过滤为同时满足以下条件的 items：

- `kind` 是 `comment`（`?kinds=comment` 读取应已保证这一点，但保留 local guard）
- `by` 以 `human:` 开头（由 human authored，而不是 agent）
- `resolved` 是 `false`
- 要么 `thread` 中没有任何 `ai:*` identity authored 的 entry，**要么** `thread` 最新 entry 是 `human:*` authored，且其 `at` timestamp 新于最新 `ai:*` entry（用户回复了先前的 agent reply）

跳过其他所有内容。Agent-authored marks、resolved threads、non-comment marks，以及已经回复且没有新 human response 的 threads 都已完成。不要只根据 `by` 构造 needs-reply filters：Proof 的完整 `marks` bag 可能包含 provenance/authored marks，它们也共享 `human:` prefix，但不是 review comments。

### 2.3 阅读每个 mark 并决定如何回应

HITL 的重点是给用户一个自然方式来 steer 文档，而不把每个 decision 都拖入 terminal。大多数 feedback 可以 auto-apply。只有当 agent 确实无法自信决策时才 escalate。

真实 feedback 会混合多种类型——“this is wrong, rename to Y” 同时是 objection 和 directive；“why X? I'd prefer Z” 同时是 question 和 suggestion。不要强行 clean classification。阅读 comment text、anchored `quote` 和 prior thread replies，然后决定：

**Can the agent apply a fix directly with confidence?（agent 能否有信心直接应用 fix？）** Imperatives（“rename X to Y”、“remove this”、“add a section about Z”）通常符合。应用 edit，用一行 summary 回复改了什么，然后 resolve。

**Is this a question with a clear answer?（这是否是有清晰答案的问题？）** 在 thread 中回答。如果答案自足，resolve。如果回答暴露出需要用户参与的新 decision，则保持 open，并在 terminal report 中展示。

**Is this a disagreement?（这是否是 disagreement？）**（“this is wrong”、“contradicts §2”、“this won't work”）。根据当前 content 评估 claim。如果 agent 同意，则 fix 并回复 “Agreed — updated to X”。如果 agent 不同意，回复 reasoning 并保持 open。不要在不评估的情况下静默应用 objection——用户标记它，正是因为他们认为 plan 错了。

**Is the intent genuinely unclear?（intent 是否真的不清楚？）** 第一尝试：采用最合理 interpretation，应用它，并回复 “I read this as X — let me know if I should revert.” 低风险场景下这比 round-trip 更便宜。只有当多种 interpretations 会导致 meaningfully different outcomes 时，才请求 clarification。询问时，如果 options 离散，使用平台 blocking question tool 做快速 multiple-choice；如果 free-form response 更自然，则留作 open thread comment。无论哪种方式，thread 保持 open，以便下一 pass 捕捉用户回复。

**Invariant:** 每个需要 attention 的 mark 在本 pass 结束时都必须有 agent reply。Unreplied = “still to do”——下一 pass 会重新 classify。即使 agent 不同意或无法决定，也要 reply（带 reasoning 或 question），不要静默 skip。

**Batch thread replies and resolves.** 在 pass 中构建所有 thread responses，然后尽可能用单个 `/ops` batch 写入。`comment.reply` 支持 `resolve: true`，因此一个 handled thread 通常应是一个 operation，而不是 `reply` 加 `resolve` 两个 operation。batched `/ops` shape 使用一个 `baseToken` 和一个 mutation：

```json
{"by":"ai:compound-engineering","baseToken":"<token>","operations":[
  {"type":"comment.reply","markId":"<id-1>","text":"Updated the terminology.","resolve":true},
  {"type":"comment.reply","markId":"<id-2>","text":"I disagree because X; leaving this open."}
]}
```

batch 中只包含 existing-thread comment mutations：`comment.reply`、`comment.resolve` 和 `comment.unresolve`。当 thread 仍需用户 decision 而保持 open 时，不带 `resolve`（或设为 false）。这替代旧的 N 个 separate reply/resolve calls 或 sub-agent parallelism；batching 更快、更容易推理，并产生一个 authoritative marks mutation。

### 2.4 应用 edits

用户正在 doc 中协作，不是在等待 approval。每个 mutation 都与 live clients 协同工作——只有 whole-doc `rewrite.apply` 被 gated。按 intent 选择工具：

**Default: 对 agent-applied content changes 使用 `/edit/v2`。** comment thread 是 review/audit trail：用户请求变更，agent 应用变更，然后在 thread 中回复改了什么。对 direct fixes、insertions、deletions 和 coordinated rewrites 使用 block edits，避免 doc 为用户已请求的 work 积累额外 suggestion marks。

**Use `suggestion.add` with `status: "accepted"`** 当 visible track-change mark 本身有价值时——例如用户请求为某个具体 edit 保留 reject-to-revert affordance，或该 change 足够 judgment-sensitive，visible suggestion trail 比只在 comment thread 中回复更清楚。一次 call 会创建 suggestion mark 并提交 change。

```json
{"type":"suggestion.add","kind":"replace","quote":"<anchor>","content":"<new>","by":"ai:compound-engineering","status":"accepted","baseToken":"<token>"}
```

按需使用 `kind: "insert" | "delete" | "replace"`；三者都支持 `status: "accepted"`。

**尤其在以下情况使用 `/edit/v2`：**

- **Atomicity is required** —— 多个 coordinated edits 必须一起 commit 或一起不 commit（例如 insert new section + update another block 中的 reference + delete obsolete paragraph）。`/edit/v2` 接受 `operations` array 并原子提交；separate `suggestion.add` calls 可能部分成功。
- **Pre-user self-correction** —— agent 在用户看文档之前修正自己的 output（例如 ingest-pass 中发现错误）。tracked mark 会暗示“曾有旧版本”，从用户视角看会误导。
- **Pure structural insertion with no quote anchor** —— 在没有 existing text 可作为 anchor 的地方添加全新 block/section。`suggestion.add` 需要 `quote`；`/edit/v2` 有基于 block `ref` 的 `insert_before` / `insert_after`。
- **Structural list-item or block removal** —— `suggestion.add` with `kind: "delete"` 只删除 list item 内部 text；bullet marker（`*`、`-` 或 numeric `1.`）会作为 orphan line 留下。使用 `/edit/v2 delete_block` 删除整个 block，或用 `find_replace_in_block` 干净地移除 item 及其周围 whitespace。

```bash
# Get snapshot for block refs + baseToken
curl -s "https://www.proofeditor.ai/api/agent/{slug}/snapshot" -H "x-share-token: <token>"
# Apply
curl -X POST "https://www.proofeditor.ai/api/agent/{slug}/edit/v2" \
  -H "Content-Type: application/json" -H "x-share-token: <token>" \
  -H "X-Agent-Id: ai:compound-engineering" -H "Idempotency-Key: <uuid>" \
  -d '{"by":"ai:compound-engineering","baseToken":"<token>","operations":[...]}'
```

Per-op body shape（`replace_block` 使用 singular `block`；所有可添加 content 的操作使用 plural `blocks:[{markdown},...]`；shape 错误时 server 返回 422）：

```json
{"op":"replace_block","ref":"b8","block":{"markdown":"new content"}}
{"op":"insert_after","ref":"b3","blocks":[{"markdown":"new block"}]}
{"op":"insert_before","ref":"b3","blocks":[{"markdown":"new block"}]}
{"op":"delete_block","ref":"b6"}
{"op":"find_replace_in_block","ref":"b4","find":"old","replace":"new","occurrence":"first"}
{"op":"find_replace_in_doc","find":"old","replace":"new","occurrence":"all"}
{"op":"replace_range","fromRef":"b2","toRef":"b5","blocks":[{"markdown":"..."}]}
```

Block `ref` values 是绑定到 snapshot/baseToken 的 opaque request tokens。如果上次 snapshot 后已有任何 writes landed，则在下一次 `/edit/v2` call 前重新 fetch `/snapshot` 获取 fresh refs。完整成功的 `/edit/v2` responses 会包含 fresh `mutationBase.token`；除非使用了 `?return=minimal`，还会包含 fresh snapshot，便于 chaining。

**Bulk mechanical sweep —— 当规则是 literal 时优先使用 `find_replace_in_doc`。** 对 terminology renames、punctuation swaps 或其他 literal doc-wide replacements，使用一个 `/edit/v2` operation：

```json
{"op":"find_replace_in_doc","find":"old term","replace":"new term","occurrence":"all"}
```

大型 sweeps 先通过 `/edit/v2?dryRun=1` 运行同一 payload；dry-run 返回 `valid`、`appliedCount` 和每个 op 的 `results[]`，不写入。真实写入时，如果只需要 `ok`、`revision`、`appliedCount` 和下一个 `mutationBase.token`，使用 `/edit/v2?return=minimal`。带 `operationResults` 的 responses 包含 per-block match counts；把这些 refs 只当作 reporting/display data，后续 block-ref mutations 前重新读取 `/snapshot`。

当 edit 是 semantic 而不是 literal 时，在一个 `/edit/v2` call 中 batch `replace_block`、`insert_*`、`delete_block` 或 `replace_range` operations。当 edits 彼此独立且每个都值得自己的 visible reject-to-revert trail 时，使用 `suggestion.add` + `accepted`。

**Use pending `suggestion.add`（no status）** 当 change 足够 judgment-sensitive，agent 希望在 commit 前获得 explicit user approval——这在 HITL 中很少见，因为 auto-applied edits 的目的就是减少 round-trips。大多数 judgment-sensitive cases 更适合通过 clarifying question 保持 thread open。

**live review 期间不需要 `rewrite.apply`。** 它也会被 `LIVE_CLIENTS_PRESENT` 阻塞。

**Mutation requirements（每次 write，包括 replies 和 resolves）：**

- single `/ops` writes 的 top-level field 是 `type`；`/ops` comment batches 的 top-level 是 `operations`；`/edit/v2` 中是 `operations[].op`。不要混用 `/ops` 的 `type` entries 和 `/edit/v2` 的 `op` entries。
- 包含来自 `/state.mutationBase.token` 的 `baseToken`（或 `/edit/v2` 用来自 `/snapshot.mutationBase.token` 的 token）。
- 设置 `by: "ai:compound-engineering"` 和 header `X-Agent-Id: ai:compound-engineering`。
- 包含 `Idempotency-Key` header。只有 exact same-body resend 才复用同一个 key；如果用 fresh `baseToken` 重建 body，就 mint new key。
- 成功 mutation responses 包含下一个 `mutationBase.token`；下一次 write 直接复用它，不要只为获取 token 而重新读取。
- 完成时 reply 和 resolve 放在一起：`{"type":"comment.reply","markId":"<id>","text":"...","resolve":true}` inside a `/ops` batch。需要 reopen 时用：`{"type":"comment.unresolve", ...}`。

**Retry after any error is verify-first, not retry-first.** Proof API 可能已 canonically commit，但仍返回 non-2xx，或返回带 `collab.status: "pending"` 的 202；network timeouts 也可能发生在 server 已写入之后。不先 verify 就 retry，是产生 duplicate marks（同一 comment 两次、同一 suggestion 两次）的最常见原因，之后还要手动 cleanup。

- 对 `STALE_BASE` / `BASE_TOKEN_REQUIRED` / `MISSING_BASE` / `INVALID_BASE_TOKEN`：pre-commit、token-related。重新读取 `/state`，用 fresh `baseToken` 重建 request body，并用 new `Idempotency-Key` retry 一次。下方 `mutate()` helper 会自动 retry 这些。
- 对 `ANCHOR_NOT_FOUND` / `ANCHOR_AMBIGUOUS`：pre-commit，但 `quote` 不再唯一匹配。只 re-read 不够；caller 必须 tighten 或 regenerate anchor 后再 retry。helper 会 surface error，而不是 auto-retry。
- 对 `INVALID_OPERATIONS` / `INVALID_REQUEST` / `INVALID_REF` / `INVALID_BLOCK_MARKDOWN` / `INVALID_RANGE` / `INVALID_MARKDOWN` / 422：payload 错误。不要 retry——修复 payload 后发送新 write。
- 对 `COLLAB_SYNC_FAILED` / `REWRITE_BARRIER_FAILED` / `PROJECTION_STALE` / `INTERNAL_ERROR` / 5xx / network error / timeout / **带 `collab.status: "pending"` 的 202**：write 可能已经 landed。重新读取 `/state`，对 intended change 做 diff（mark exists? suggestion applied? quote replaced?），只有当 server 确实没有 commit 时才 retry。如果 diff 显示 write 已 landed，即使 response 说失败，也视为成功。

**When the loop breaks.** 如果 mutation 在 fresh read 和 verified-needed retry 后仍然失败，或两次 reads 的 state 不一致，先调用 `POST https://www.proofeditor.ai/api/bridge/report_bug`，带 request ID、slug 和 raw response body，然后再 fallback。不要静默 skip——这会丢失用户依赖的 audit trail。

---

## Phase 3：Terminal Report（终端报告）

Exception-based。不要复述用户已经能在 Proof doc 中看到的内容——每个 thread 的完整 reasoning 都在那里。terminal 用于展示用户接下来需要做的 decisions。

每个 report 覆盖三件事，并按当前 state 自然措辞：

- **What got handled**（例如 resolved 了多少 comments、auto-applied 了哪些 edits）
- **What's still open** —— 如有 escalations，每个用一行 anchored quote 加一行 agent reply 或 question。更完整 context 留在 Proof thread
- **The doc URL** —— 始终包含；用户可能关掉了 tab

保持整个 report 一眼可扫。三种常见形态自然出现：

- clean pass 且全部 handled：收缩为一行加 doc URL
- escalation pass：在 handled summary 后紧凑列出 open threads
- 没有 new feedback 的 pass：说明无新 feedback 并指向 doc

按 situation 匹配 voice 即可，不必套模板——“handled 4, 1 still needs you” 和 “all 5 addressed, doc's ready” 都可以。

---

## Phase 4：Next-Signal Prompt（下一步信号提示）

使用平台阻塞式问题工具询问用户：Claude Code 中为 `AskUserQuestion`（如果 schema 未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`），Codex 中为 `request_user_input`，Gemini 中为 `ask_user`，Pi 中为 `ask_user`（需 `pi-ask-user` extension）。只有在 harness 中没有 blocking tool 或调用报错时（例如 Codex edit modes），才 fallback 到在 chat 中展示 options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。

**Question（问题）:** "Proof review pass 已完成。下一步怎么做？"

提供覆盖这些 intents 的 options——使用具体 user-facing labels，不要使用 agent-internal jargon（不要写 “end-sync”、“ingest pass”等）。只包含适合当前 state 的 options。Labels 用 imperative 和 third-person（不要用 “I'll” / “I'm”——在 tool-mediated menu 中，speaker 是用户还是 agent 会变得含混），并在所有 options 中保持 `[short label] — [description]` 形态一致。不提供 “still working, come back later” option：blocking question 已经会等待，所以它只是 no-op wrapper。

- **Discuss（讨论）** → `Discuss — walk through the open threads in terminal`
  在 terminal 中讨论 open threads；agent 会把 decisions 回写到 Proof threads。只有存在 escalations 时才有用。
- **Proceed（继续）** → `Save — save the reviewed doc back to the local file`
  进入 Phase 5 end-sync。如果仍有 escalations open，在 label 中说明（例如 `Save with 3 threads still open`），这样用户显式接受 tradeoff，而不是通过 nested confirm。
- **Another pass（再跑一轮）** → `Re-check — look for new comments in Proof`
  重新读取 state 并 re-ingest。即使 clean pass 后也值得提供，因为用户可能在 report 渲染时添加了 comments。
- **Done for now（暂时完成）** → `Pause — stop without saving`
  不 sync 就停止；以 `status: done_for_now` 返回 caller，不做 end-sync。

sync confirmation 总是在 Phase 5 发生，不管 threads 是否 open——这一步只询问用户下一步想做什么，而不是询问是否覆盖本地文件。

---

## Phase 5：End-Sync（结束同步）

当用户选择 **Proceed** 时运行。在询问任何内容之前，先检查 Proof content 是否真的与 uploaded 内容不同；如果没有不同，就没有东西要 sync，也没有理由询问。

1. Fetch current state：`GET /api/agent/{slug}/state`，带 `x-share-token: <token>`。把完整 response body 保存到 temp file（`$STATE_TMP`），这样稍后 markdown bytes 可以 stream 到磁盘，而不用经过 `$(...)`（它会 strip trailing newlines）。从该文件提取 `state.revision` 到 `$REVISION`。读取该文件中的 `state.markdown` 用于 step 2 的比较。

2. 将 `state.markdown` 与 `uploadedMarkdown`（Phase 1 捕获）比较。

   **If identical** —— session 中没有 content changes。完全跳过 sync prompt。Display：

   ```
   No changes to sync. Local file is unchanged.
   Doc: <tokenUrl>
   ```

   设置 presence `status: completed`，summary `"Review complete, no changes"`。以 `status: proceeded`、`localSynced: true`（local 与 Proof 一致——不需要 write，local 不 stale）、`revision: <state.revision>` 和其余标准 fields 返回 caller。

   **If different（如果不同）** —— 继续 step 3。

3. 使用平台阻塞式问题工具询问：Claude Code 中为 `AskUserQuestion`（如果 schema 未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`），Codex 中为 `request_user_input`，Gemini 中为 `ask_user`，Pi 中为 `ask_user`（需 `pi-ask-user` extension）。只有在 harness 中没有 blocking tool 或调用报错时（例如 Codex edit modes），才 fallback 到 chat 中展示 options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。

   **Question（问题）:** "Sync the reviewed doc back to `<localPath>`? Proof has your review changes; local still has the pre-review copy."

   **Options（选项）:**
   - **Yes, sync now**（是，现在同步；default, recommended）
   - **Not yet, I'll pull it later**（暂不同步，稍后拉取；returns to caller with `localSynced: false`）

   需要额外 prompt 的原因：用户可能几小时前开始 review，已经忘记涉及的 local file。短确认让 file write 可见，而不是点击 Proceed 后的 silent side-effect。caller 通过 `localSynced` signal 告知 downstream workflows：local 是否 stale。

4. 选择 **Yes, sync now** 时，把 fetched markdown 写入 local——见 `SKILL.md` 中的 `Workflow: Pull a Proof Doc to Local`：

   ```bash
   # $STATE_TMP is the temp file holding the /state response from step 1.
   TMP="${SOURCE}.proof-sync.$$"
   jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$SOURCE"
   rm "$STATE_TMP"
   ```

   用 `jq -jr` 从保存的 state file 直接 stream `.markdown` bytes——不要把 markdown 捕获到 shell variable，因为 `$(...)` 会 strip trailing newlines 并破坏写入。`$REVISION`（在 step 1 中单独提取）可以安全保存在 variable 中；它是 opaque scalar。

   选择 **Not yet** 时，跳过 write（仍清理 `$STATE_TMP`）。

5. 设置 presence `status: completed`，summary `"Review synced to <localPath>"`（或 sync 被拒绝时 `"Review complete, local not updated"`），这样 Proof UI 显示 loop 已完成。

6. Display（显示）以下之一：

   Synced（已同步）:
   ```
   Doc synced to <localPath> (revision <N>).
   Doc: <tokenUrl>
   ```

   Declined（已拒绝）:
   ```
   Review complete. Local file kept as-is — pull from Proof when ready.
   Doc: <tokenUrl>
   ```

7. 返回 caller：
   ```
   status: proceeded
   localPath: <source>
   localSynced: true | false
   docUrl: <tokenUrl>
   openThreadCount: <K>
   revision: <N>
   ```

不要删除 Proof doc。它是 durable review record；caller 的 workflow 可能想链接回它。

---

## Recipes（操作配方）

### BaseToken-aware mutation（感知 BaseToken 的 mutation）

从最近一次 `/state` 或 `/snapshot` read seed `baseToken`，然后从每次成功 mutation response 的 `mutationBase.token` 更新它。只有在 `STALE_BASE` / `BASE_TOKEN_REQUIRED` 时，或需要 fresh document/comment/snapshot content 时，才重新 read。对 ingest pass 来说，这意味着一次 comment-filtered `/state` read，一次 `/edit/v2` batch（如果需要 content changes），以及一次 `/ops` comment batch 写 replies/resolutions。

两类 retry 行为不同。下方 helper 只覆盖 safe class；ambiguous class 需要 caller-supplied verifier，因为“这次 write 是否 landed？”取决于 payload 内容（查找 markId、quote replacement、thread reply 等）。

```bash
SLUG=<slug>
TOKEN=<accessToken>
AGENT_ID=ai:compound-engineering
BASE=<cached from most recent /state or /snapshot read>

mutate() {
  local PAYLOAD="$1"  # jq template without baseToken
  local IDEM_KEY BODY RESP CODE NEXT_BASE
  # Fresh key for this request body. If the body changes, including because
  # baseToken changes after STALE_BASE, the retry below mints a new key.
  IDEM_KEY=$(uuidgen)
  BODY=$(jq -n --arg base "$BASE" --argjson payload "$PAYLOAD" '$payload + {baseToken: $base}')
  RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
    -H "Content-Type: application/json" \
    -H "x-share-token: $TOKEN" \
    -H "X-Agent-Id: $AGENT_ID" \
    -H "Idempotency-Key: $IDEM_KEY" \
    -d "$BODY")
  CODE=$(printf '%s' "$RESP" | jq -r '.code // .error // empty')
  # Pre-commit token-related errors — safe to auto-retry with the same
  # payload and a fresh baseToken. Anchor errors (ANCHOR_NOT_FOUND,
  # ANCHOR_AMBIGUOUS) are also pre-commit but require a tighter quote,
  # so they are surfaced instead of auto-retried.
  if [ "$CODE" = "STALE_BASE" ] \
    || [ "$CODE" = "BASE_TOKEN_REQUIRED" ] \
    || [ "$CODE" = "MISSING_BASE" ] \
    || [ "$CODE" = "INVALID_BASE_TOKEN" ]; then
    BASE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
      -H "x-share-token: $TOKEN" | jq -r '.mutationBase.token')
    BODY=$(jq -n --arg base "$BASE" --argjson payload "$PAYLOAD" '$payload + {baseToken: $base}')
    IDEM_KEY=$(uuidgen)
    RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
      -H "Content-Type: application/json" \
      -H "x-share-token: $TOKEN" \
      -H "X-Agent-Id: $AGENT_ID" \
      -H "Idempotency-Key: $IDEM_KEY" \
      -d "$BODY")
  fi
  NEXT_BASE=$(printf '%s' "$RESP" | jq -r '.mutationBase.token // empty')
  if [ -n "$NEXT_BASE" ]; then
    BASE="$NEXT_BASE"
  fi
  printf '%s' "$RESP"
}
```

`Idempotency-Key` 是为正在发送的 exact request body minted。如果 retry 用 fresh `baseToken` 重建 body，那就是不同 payload hash，因此需要 new key；复用前一个 key 会触发 `IDEMPOTENCY_KEY_REUSED`。只有 transport-level resend 的 exact same body 才复用同一 key。在 function 外部 mint 会让无关 writes 共用一个 key，server 会把后续 payloads 视为 invalid key reuse。

**Ambiguous failures（不在上方 pre-commit set 中的任何内容——`COLLAB_SYNC_FAILED`、`INTERNAL_ERROR`、5xx、network timeout、带 `collab.status: "pending"` 的 202）：** 不要从 helper retry。在 caller 中重新读取 `/state`，将 marks/content 与 intended change diff，只有当 diff 证明没有任何内容 landed 时才重新发出 write。Pattern：

```bash
# After an ambiguous failure on comment.add with quote "X" and text "Y":
STATE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN")
LANDED=$(printf '%s' "$STATE" | jq --arg q "X" --arg t "Y" \
  '[.marks[]? | select(.by == "ai:compound-engineering" and .quote == $q and (.thread[0].text // .text) == $t)] | length')
if [ "$LANDED" -gt 0 ]; then
  echo "Already applied — skipping retry."
else
  # Safe to retry with a fresh BASE.
  ...
fi
```

根据 payload-identifying field 匹配（`comment.add` 用 quote + text；`suggestion.add` 用 quote + content；`comment.reply` 用 markId + text；`/edit/v2` 用 block ordinal + markdown）。当没有可用 invariant 时，宁可让 write 保持未完成并在 terminal report 中展示，也不要冒 duplicate 的风险。

### jq gotcha when inspecting responses（检查 responses 时的 jq 陷阱）

用 jq 的 `//` alternative operator 从 API responses 提取字段时，在 object constructors 内要加括号——jq 会把 `{markId: .markId // .result.markId}` 解析为 syntax error。使用 `{markId: (.markId // .result.markId)}`，或把 value 提到 object 外：`jq -r '.markId // .result.markId'`。

### Identity（身份）

所有 ops 必须包含：
- request body 中的 `by: "ai:compound-engineering"`
- headers 中的 `X-Agent-Id: ai:compound-engineering`（presence 必需；ops 推荐使用以保持 consistent attribution）

Display name `Compound Engineering` 通过 `POST /presence` 绑定，body 为 `{"name":"Compound Engineering", ...}`。上传后设置一次；后续 ops 会继承。
