---
name: ce-proof
description: 通过 Proof（proofeditor.ai）publish、view、comment 和 edit markdown：创建 shareable doc、读取 shared doc，并通过 API 进行 comment/suggestion/block edits。当用户说 "view this in proof"、"share to proof"、"publish to proof"，或想为 spec、plan、draft 提供 shareable markdown surface 时使用，包括来自 ce-brainstorm、ce-ideate 或 ce-plan 的 publish handoffs。不要因表示 evidence、math proofs、proof-of-concept 或 "proofread this" 的 "proof" 触发。
allowed-tools:
  - Bash
  - Read
  - Write
  - WebFetch
---

# Proof - Collaborative Markdown Editor（协作式 Markdown 编辑器）

Proof 是面向 humans 和 agents 的 collaborative document editor。它支持两种模式：

1. **Web API** - 通过 HTTP 创建和编辑 shared documents（无需安装）
2. **Local Bridge** - 通过 localhost:9847 驱动 macOS Proof app

## Identity and Attribution（身份与署名）

写入 Proof doc 的每次操作都必须 attribution。两个字段携带 agent identity：

- **Machine ID（每个 op 上的 `by`、`X-Agent-Id` header）：** `ai:compound-engineering` — stable、lowercase-hyphenated、machine-parseable。出现在 marks、events 和 API response 中。
- **Display name（`POST /presence` 上的 `name`）：** `Compound Engineering` — human-readable，显示在 Proof 的 presence chips 和 comment-author badges 中。

每个 doc session 通过带 `X-Agent-Id` header 的 presence post 设置一次 display name；Proof 会在该 session 中将 name 绑定到该 agent ID。这些值是此 skill 任何 caller 的默认值；如果 distinct sub-agent 应 own doc，caller 可以传入不同的 `identity` pair。不要使用 `ai:compound` 或其他 ad-hoc variants：除非 caller 明确 override，否则 identity 保持统一。

## Publish Mode（发布模式）

主要用途是 one-way publishing：读取 existing local markdown file（brainstorm、plan、learning、draft）的完整内容，作为新 doc body 发布（source-file recipe 见 "Workflow: Create and Share a New Document"；绝不要发布 placeholder content），然后把 shareable URL 给用户。Local file 保持 canonical；publishing 不会把任何内容 sync 回磁盘。用户可以打开链接 read、comment、share；agent 在拿到 URL 后也可以通过下方 edit APIs 参与。两个入口机制相同（见 "Workflow: Create and Share a New Document"）：

- **Direct user request** — 用户直接命名 local markdown file，并要求通过 Proof 分享："share this to proof"、"publish this to proof"、"open this in proof editor so I can review"、"get me a proof link for this doc"。文件就是用户刚创建、编辑或引用的 markdown；如果模糊，询问是哪一个文件。这是一等入口：不要要求 upstream caller。
- **Upstream skill handoff** — `ce-brainstorm`、`ce-ideate` 或 `ce-plan` 完成 draft，并 handoff 给 publish for human review，显式传入 file path 和 title。

## Web API（分享的主要方式）

### 创建 Shared Document（共享文档）

不需要 authentication。返回带 access token 的 shareable URL。

```bash
curl -X POST https://www.proofeditor.ai/share/markdown \
  -H "Content-Type: application/json" \
  -d '{"title":"My Doc","markdown":"# Hello\n\nContent here."}'
```

**Response format（响应格式）：**
```json
{
  "slug": "abc123",
  "tokenUrl": "https://www.proofeditor.ai/d/abc123?token=xxx",
  "accessToken": "xxx",
  "ownerSecret": "yyy",
  "_links": {
    "state": "https://www.proofeditor.ai/api/agent/abc123/state",
    "ops": "https://www.proofeditor.ai/api/agent/abc123/ops"
  }
}
```

使用 `tokenUrl` 作为 shareable link。`_links` 提供精确 API paths。

### 读取 Shared Document（共享文档）

如果已有 shared Proof URL，不需要 browser automation。直接用 content negotiation fetch URL：

```bash
curl -s -H "Accept: application/json" "https://www.proofeditor.ai/d/{slug}?token=<token>"
curl -s -H "Accept: text/markdown" "https://www.proofeditor.ai/d/{slug}?token=<token>"
```

JSON response 包含 markdown、API links 和 agent auth hints。需要 mutation metadata、marks 或 presence 时使用 `/state`：

```bash
curl -s "https://www.proofeditor.ai/api/agent/{slug}/state" \
  -H "x-share-token: <token>"
```

对于 comment-ingest workflows，优先使用 server-side filter：

```bash
curl -s "https://www.proofeditor.ai/api/agent/{slug}/state?kinds=comment" \
  -H "x-share-token: <token>"
```

`state.marks` 是 comments、suggestions 和 provenance/authorship marks 的 union。`?kinds=comment` filter 可以避免把 human-authored provenance marks 当作 review comments。

### 编辑 Shared Document（共享文档）

Comment、suggestion 和 rewrite operations 发送到 `POST https://www.proofeditor.ai/api/agent/{slug}/ops`。Block edits 使用 `/api/agent/{slug}/edit/v2`。

**Note：** 使用 `/api/agent/{slug}/ops` path（来自 create response 中的 `_links`），不要使用 `/api/documents/{slug}/ops`。

**Authentication for protected docs（受保护文档的认证）：**
- Header：`x-share-token: <token>` 或 `Authorization: Bearer <token>`
- Token 来自 URL parameter：`?token=xxx`，或 create response 中的 `accessToken`
- Header：`X-Agent-Id: ai:compound-engineering`（presence 必需；ops 中也包含它以保持 consistent attribution）

**Wire-format reminder。** `/api/agent/{slug}/ops` 使用 top-level `type` field；`/api/agent/{slug}/edit/v2` 使用 `operations` array，其中每个 entry 有 `op`。不要混用：向 `/ops` 发送 `op` 会返回 422。

**每个 mutation 都需要 `baseToken`。** 复用最近一次 `/state` 或 `/snapshot` read 得到的 `mutationBase.token`，然后从 successful mutation responses（`.mutationBase.token`）中更新它。遇到 `BASE_TOKEN_REQUIRED` 或 `STALE_BASE` 时，重新读取并重试一次。只有当本 session 中还没有 prior read，或需要 fresh document/comment/snapshot content 时，才做 pre-mutation read。

`/edit/v2` block refs 是另一项 concern：它们可能跨 revisions drift，所以如果自上次 snapshot 后已有 writes landed，在 block edit 前重新 fetch `/snapshot` 获取 fresh refs。

### Edit Strategy（编辑策略）：避免 Whole-Doc Rewrite

不要默认做 full-document replacement。选择与 requested change 匹配的最窄 edit primitive：

1. **Literal repeated change：** 使用带 `find_replace_in_doc` 的 `/edit/v2`（可选用 `fromRef`、`toRef` 或 `block_filter` 约束）。这是 terminology renames、punctuation/style sweeps 和其他 exact text substitutions 最快且最不易出错的路径。
2. **Known block or section change：** 基于 fresh `/snapshot` 使用 `/edit/v2` block operations：`replace_block`、`insert_before`、`insert_after`、`delete_block`、`replace_range` 或 `find_replace_in_block`。
3. **需要 visible track-changes：** 当用户应看到特定 edit 的 suggestion mark 和 reject/revert affordance 时，使用 `/ops` `suggestion.add`（pending 或 `status: "accepted"`）。
4. **Whole-doc replacement：** 仅在用户明确要求替换整个 document、intended change 真正 global 且无法表达为 block/range/find-replace operations，并且没有 live clients 时，才把 `rewrite.apply` 作为 last resort。rewrite 前读取 current state，保留 comments/marks expectations，并说明 rewrite 很 broad。

拿不准时，从 `/snapshot` 开始，构建小型 `/edit/v2` batch。窄 failed edit 比 broad rewrite 更容易 inspect 和 retry，也避免 clobber concurrent human work。

**Retry discipline after mutation errors：重试前先验证。** Error response 不能证明没有写入任何内容。

- `STALE_BASE`、`BASE_TOKEN_REQUIRED`、`MISSING_BASE`、`INVALID_BASE_TOKEN` — pre-commit、token-related。重新读取 `/state`，用 fresh `baseToken` 重建 request body，并用新的 `Idempotency-Key` 重试一次。
- `ANCHOR_NOT_FOUND`、`ANCHOR_AMBIGUOUS` — pre-commit，但 `quote` 不再唯一匹配 content。单纯重新读取没有帮助；caller 必须在重试前 tighten 或 regenerate anchor。不要 blindly auto-retry。
- `INVALID_OPERATIONS`、`INVALID_REQUEST`、`INVALID_REF`、`INVALID_BLOCK_MARKDOWN`、`INVALID_RANGE`、`INVALID_MARKDOWN`、422 — pre-commit，但 payload 错误。不要 blindly retry；先修 payload。
- `COLLAB_SYNC_FAILED`、`REWRITE_BARRIER_FAILED`、`PROJECTION_STALE`、`INTERNAL_ERROR`、5xx、network timeout，以及任何 **202 with `collab.status: "pending"`**：canonical doc 可能已经写入，即使 call 看起来失败。任何 retry 前，重新读取 `/state` 并检查 intended mark/edit 是否已存在；只有不存在时才 retry。
- `Idempotency-Key`（见下方）防止 *同一 request* double-apply（例如 TCP-level retry）。如果你构建新的 request body 并发送第二个 call，它没有帮助：那是带新 key 的新 logical write。

Duplicate-mark incidents 通常来自 timeout 后未验证就重试 `comment.add` 或 `suggestion.add`。拿不准时：re-read、diff，再决定。

**`Idempotency-Key` header** 建议用于每个 mutation，以支持 safe automation retries；当 `/state.contract.idempotencyRequired` 为 true 时必需。只有在重发完全相同的 serialized request body 时才使用同一个 key。如果 body 改变（包括因为 `STALE_BASE` 后替换了 `baseToken`），生成新 key，否则 Proof 会将其作为不同 payload 的 key reuse 拒绝。

**Comment on text（对文本评论）：**
```json
{"type": "comment.add", "quote": "text to comment on", "by": "ai:compound-engineering", "text": "Your comment here", "baseToken": "<token>"}
```

**Reply to a comment（回复评论）：**
```json
{"type": "comment.reply", "markId": "<id>", "by": "ai:compound-engineering", "text": "Reply text", "baseToken": "<token>"}
```

**Reply and resolve in one mutation（一次 mutation 中回复并 resolve）：**
```json
{"type": "comment.reply", "markId": "<id>", "by": "ai:compound-engineering", "text": "Fixed.", "resolve": true, "baseToken": "<token>"}
```

**Batch existing-thread comment mutations（批量处理既有 thread comment mutations）：**
```json
{"by": "ai:compound-engineering", "baseToken": "<token>", "operations": [
  {"type": "comment.reply", "markId": "<id-1>", "text": "Fixed.", "resolve": true},
  {"type": "comment.reply", "markId": "<id-2>", "text": "Leaving this open because X."}
]}
```

Batch `/ops` 支持针对 existing threads 的 `comment.reply`、`comment.resolve` 和 `comment.unresolve`。用它在一次 call 中 reply/resolve 多个 threads，而不是为每个 thread 分别发 reply 和 resolve requests。

**Resolve / unresolve a comment（resolve / unresolve 评论）：**
```json
{"type": "comment.resolve", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
{"type": "comment.unresolve", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

**Suggest a replacement（pending — user must accept/reject，建议替换）：**
```json
{"type": "suggestion.add", "kind": "replace", "quote": "original text", "by": "ai:compound-engineering", "content": "replacement text", "baseToken": "<token>"}
```

**Suggest and immediately apply（tracked but committed — user can reject to revert，建议并立即应用）：**
```json
{"type": "suggestion.add", "kind": "replace", "quote": "original text", "by": "ai:compound-engineering", "content": "replacement text", "status": "accepted", "baseToken": "<token>"}
```

`status: "accepted"` 会在一次 call 中创建 suggestion mark 并 commit change。该 mark 作为 audit trail 持久存在，带有 per-edit attribution 和 reject-to-revert affordance。适用于 `kind: "insert" | "delete" | "replace"`。

**Accept or reject an existing suggestion（接受或拒绝既有 suggestion）：**
```json
{"type": "suggestion.accept", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
{"type": "suggestion.reject", "markId": "<id>", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

不支持 `suggestion.resolve`：改用 accept 或 reject。

**Whole-doc rewrite（last resort，最后手段）：**
```json
{"type": "rewrite.apply", "content": "full new markdown", "by": "ai:compound-engineering", "baseToken": "<token>"}
```

优先使用 `find_replace_in_doc` 或 block-level `/edit/v2` operations。`rewrite.apply` 范围 broad、具有 disruptive，并且 live clients connected 时会被阻塞。

**通过 `/edit/v2` 做 block-level edits**（独立 endpoint、独立 shape）：
```bash
curl -X POST "https://www.proofeditor.ai/api/agent/{slug}/edit/v2" \
  -H "Content-Type: application/json" \
  -H "x-share-token: <token>" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: <uuid>" \
  -d '{
    "by": "ai:compound-engineering",
    "baseToken": "mt1:<token>",
    "operations": [
      {"op": "replace_block", "ref": "b3", "block": {"markdown": "Updated paragraph."}},
      {"op": "insert_after", "ref": "b3", "blocks": [{"markdown": "## New section"}]}
    ]
  }'
```

Per-op body shape（单数 `block` 与复数 `blocks` 是 load-bearing：发错会返回 422）：

| op | body fields（body 字段） |
|---|---|
| `replace_block` | `ref`, `block: {markdown}` |
| `insert_after` | `ref`, `blocks: [{markdown}, ...]` |
| `insert_before` | `ref`, `blocks: [{markdown}, ...]` |
| `delete_block` | `ref` |
| `replace_range` | `fromRef`, `toRef`, `blocks: [{markdown}, ...]` |
| `find_replace_in_block` | `ref`, `find`, `replace`, `occurrence: "first" \| "all"` |
| `find_replace_in_doc` | `find`, `replace`, `occurrence: "first" \| "all"`, optional `fromRef`, `toRef`, `block_filter` |

读取 `/snapshot` 获取 block `ref` IDs 和 `mutationBase.token`。`ref` values 是绑定到 snapshot/baseToken 的 opaque request tokens；如果已有 writes landed，在 follow-up block edits 前重新读取 `/snapshot`。`operations` 原子提交：要么每个 op 都 landed，要么都不 landed，所以一个 `/edit/v2` call 可以安全高效地 batch 数十个 block edits。成功的 full responses 包含下一个 `mutationBase.token` 和用于 chaining 的 fresh `snapshot.blocks[].ref` values。

对于 literal doc-wide sweeps，优先使用 `find_replace_in_doc`，而不是大量 block replacements 或 whole-doc rewrite。用 `?dryRun=1` 或 `?validate=1` 验证 large batches；当你只需要 `ok`、`revision`、`appliedCount` 和下一个 `mutationBase` 时，使用 `?return=minimal`。

**client connected 时编辑是可以的。** `/edit/v2`、`suggestion.add`（包括 `status: "accepted"`）和所有 comment ops 都能在 active collab 中工作。只有 `rewrite.apply` 会被 `LIVE_CLIENTS_PRESENT` 阻塞，因为它会 clobber in-flight Yjs edits。

**When the loop breaks。** 如果 mutation 在 fresh read 和一次 retry 后仍持续失败，或多次 reads 之间 state 看起来不一致，调用 `POST https://www.proofeditor.ai/api/bridge/report_bug`，附上 failing request ID、slug 和 raw response。server 会 enrich 并 file an issue。

### Known Limitations（Web API 已知限制）

- Bridge-style endpoints（`/d/{slug}/bridge/*`）需要 client version headers（`x-proof-client-version`、`x-proof-client-build`、`x-proof-client-protocol`），缺少时会返回 426 CLIENT_UPGRADE_REQUIRED。改用 `/api/agent/{slug}/ops`。

## Local Bridge（macOS App 本地桥接）

需要 Proof.app 正在运行。Bridge 位于 `http://localhost:9847`。

**Required headers（必需 headers）：**
- `X-Agent-Id: ai:compound-engineering`（presence identity；与 `by` 保持一致）
- `Content-Type: application/json`
- `X-Window-Id: <uuid>`（多个 docs 打开时）

### Key Endpoints（关键端点）

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/windows` | 列出 open documents |
| GET | `/state` | 读取 markdown、cursor、word count |
| GET | `/marks` | 列出所有 suggestions 和 comments |
| POST | `/marks/suggest-replace` | `{"quote":"old","by":"ai:compound-engineering","content":"new"}` |
| POST | `/marks/suggest-insert` | `{"quote":"after this","by":"ai:compound-engineering","content":"insert"}` |
| POST | `/marks/suggest-delete` | `{"quote":"delete this","by":"ai:compound-engineering"}` |
| POST | `/marks/comment` | `{"quote":"text","by":"ai:compound-engineering","text":"comment"}` |
| POST | `/marks/reply` | `{"markId":"<id>","by":"ai:compound-engineering","text":"reply"}` |
| POST | `/marks/resolve` | `{"markId":"<id>","by":"ai:compound-engineering"}` |
| POST | `/marks/accept` | `{"markId":"<id>"}` |
| POST | `/marks/reject` | `{"markId":"<id>"}` |
| POST | `/rewrite` | Last-resort whole-doc replacement: `{"content":"full markdown","by":"ai:compound-engineering"}` |
| POST | `/presence` | `{"status":"reading","summary":"..."}` |
| GET | `/events/pending` | Poll for user actions |

### Presence Statuses（Presence 状态）

`thinking`, `reading`, `idle`, `acting`, `waiting`, `completed`

## Workflow: Review a Shared Document（审阅共享文档）

给定类似 `https://www.proofeditor.ai/d/abc123?token=xxx` 的 Proof URL 时：

1. 从 URL 中提取 slug（`abc123`）和 token
2. 通过 shared URL 上的 content negotiation 读取 document；当需要 marks/mutation metadata 时，通过 `/api/agent/{slug}/state` 读取
3. 对 content edits，优先使用 `/edit/v2` 的 `find_replace_in_doc` 或 block operations；对 comments、suggestions 和 comment replies/resolution 使用 `/ops`
4. author 会实时看到 changes

```bash
SHARE_URL="https://www.proofeditor.ai/d/abc123?token=xxx"
curl -s -H "Accept: application/json" "$SHARE_URL"
curl -s -H "Accept: text/markdown" "$SHARE_URL"

# Read once for content + the initial baseToken.
# After each successful mutation, update BASE from the response's mutationBase.token.
STATE=$(curl -s "https://www.proofeditor.ai/api/agent/abc123/state" \
  -H "x-share-token: xxx")
BASE=$(printf '%s' "$STATE" | jq -r '.mutationBase.token')
# Inspect doc fields as needed: printf '%s' "$STATE" | jq '.markdown, .revision'

# Comment
OP_RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "$(jq -n --arg base "$BASE" '{type:"comment.add",quote:"text",by:"ai:compound-engineering",text:"comment",baseToken:$base}')")
NEXT_BASE=$(printf '%s' "$OP_RESP" | jq -r '.mutationBase.token // empty')
[ -n "$NEXT_BASE" ] && BASE="$NEXT_BASE"

# Suggest edit (tracked, pending)
OP_RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "$(jq -n --arg base "$BASE" '{type:"suggestion.add",kind:"replace",quote:"old",by:"ai:compound-engineering",content:"new",baseToken:$base}')")
NEXT_BASE=$(printf '%s' "$OP_RESP" | jq -r '.mutationBase.token // empty')
[ -n "$NEXT_BASE" ] && BASE="$NEXT_BASE"

# Suggest and immediately apply (tracked, committed)
OP_RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/abc123/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "$(jq -n --arg base "$BASE" '{type:"suggestion.add",kind:"replace",quote:"old",by:"ai:compound-engineering",content:"new",status:"accepted",baseToken:$base}')")
NEXT_BASE=$(printf '%s' "$OP_RESP" | jq -r '.mutationBase.token // empty')
[ -n "$NEXT_BASE" ] && BASE="$NEXT_BASE"

# Direct content edit (preferred when visible suggestion marks are not needed)
SNAPSHOT=$(curl -s "https://www.proofeditor.ai/api/agent/abc123/snapshot" \
  -H "x-share-token: xxx")
EDIT_BASE=$(printf '%s' "$SNAPSHOT" | jq -r '.mutationBase.token')
curl -X POST "https://www.proofeditor.ai/api/agent/abc123/edit/v2?return=minimal" \
  -H "Content-Type: application/json" \
  -H "x-share-token: xxx" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "$(jq -n --arg base "$EDIT_BASE" '{by:"ai:compound-engineering",baseToken:$base,operations:[{op:"find_replace_in_doc",find:"old",replace:"new",occurrence:"all"}]}')"
```

## Workflow: Create and Share a New Document（创建并分享新文档）

**Publishing a local file（主要场景）：**读取文件，并用 `jq --rawfile` 将完整内容 JSON-encode 到 `markdown` field，确保 newlines、quotes 和 backticks 被正确 escape。绝不要手写 body，也不要留下 inline placeholder，否则发布出去的是 placeholder doc，而不是 caller 传入的 source artifact（plan、requirements 或 ideation file）。

```bash
SRC="docs/plans/2026-05-04-001-feat-foo-plan.md"   # source file from the caller
TITLE="Plan: Foo"                                   # caller-provided title

# 1. Create — from a local source file:
RESPONSE=$(jq -n --arg title "$TITLE" --rawfile md "$SRC" '{title:$title, markdown:$md}' \
  | curl -s -X POST https://www.proofeditor.ai/share/markdown \
    -H "Content-Type: application/json" -d @-)
# (Ad-hoc inline content instead of a file:
#  -d '{"title":"My Doc","markdown":"# Title\n\nContent here."}')

# 2. Extract URL and token
URL=$(echo "$RESPONSE" | jq -r '.tokenUrl')
SLUG=$(echo "$RESPONSE" | jq -r '.slug')
TOKEN=$(echo "$RESPONSE" | jq -r '.accessToken')

# 3. Bind display name via presence
curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/presence" \
  -H "Content-Type: application/json" \
  -H "x-share-token: $TOKEN" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -d '{"name":"Compound Engineering","status":"reading","summary":"Uploaded doc"}'

# 4. Share the URL
echo "$URL"

# 5. Make comment/suggestion edits using the ops endpoint (baseToken required)
BASE=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN" | jq -r '.mutationBase.token')
OP_RESP=$(curl -s -X POST "https://www.proofeditor.ai/api/agent/$SLUG/ops" \
  -H "Content-Type: application/json" \
  -H "x-share-token: $TOKEN" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "$(jq -n --arg base "$BASE" '{type:"comment.add",quote:"Content here",by:"ai:compound-engineering",text:"Added a note",baseToken:$base}')")
NEXT_BASE=$(printf '%s' "$OP_RESP" | jq -r '.mutationBase.token // empty')
[ -n "$NEXT_BASE" ] && BASE="$NEXT_BASE"

# For content edits, prefer /edit/v2 over rewrite.apply.
SNAPSHOT=$(curl -s "https://www.proofeditor.ai/api/agent/$SLUG/snapshot" \
  -H "x-share-token: $TOKEN")
EDIT_BASE=$(printf '%s' "$SNAPSHOT" | jq -r '.mutationBase.token')
curl -X POST "https://www.proofeditor.ai/api/agent/$SLUG/edit/v2?return=minimal" \
  -H "Content-Type: application/json" \
  -H "x-share-token: $TOKEN" \
  -H "X-Agent-Id: ai:compound-engineering" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d "$(jq -n --arg base "$EDIT_BASE" '{by:"ai:compound-engineering",baseToken:$base,operations:[{op:"find_replace_in_doc",find:"Content",replace:"Updated content",occurrence:"all"}]}')"
```

## Workflow: Pull a Proof Doc to Local（将 Proof doc 拉取到本地）

将当前 Proof doc state sync 到 local markdown file。用于：

- 将 Proof doc 的 ad-hoc snapshots 写到磁盘（关闭 tab、archiving、handoff 前）
- 将用户（或其他人）编辑过的 shared Proof doc 拉回 local working copy
- 根据 live Proof version 刷新 local working copy

```bash
SLUG=<slug>
TOKEN=<accessToken>
LOCAL=<absolute-path>

# One read to a temp file — avoids passing markdown through $(...), which would strip trailing newlines.
STATE_TMP=$(mktemp)
curl -s "https://www.proofeditor.ai/api/agent/$SLUG/state" \
  -H "x-share-token: $TOKEN" > "$STATE_TMP"
REVISION=$(jq -r '.revision' "$STATE_TMP")

# Atomic write: stream .markdown bytes directly to a temp sibling, then rename.
TMP="${LOCAL}.proof-sync.$$"
jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$LOCAL"
rm "$STATE_TMP"
```

`jq -jr`（`-j` no trailing newline，`-r` raw string）会将 markdown bytes 直接 stream 到 temp file，不经过 shell variable，因此 trailing newlines 能完整保留。同一 filesystem 内的 `mv` 是 atomic：crashed write 会保留原文件不动，而不是留下 half-written file。

**当 pull 不是用户直接要求时，写入前先确认。** 如果某个 workflow 最终把 pull 作为另一动作的 side-effect，用简短确认提示即将写入，例如 "Sync Proof doc to `<localPath>`?" 静默覆盖会让人意外：用户可能忘了该 session 中存在 local file，或预期在明确要求 pull 前 Proof 保持 canonical。

## Safety（安全）

- 编辑前使用 `/state` content 作为 source of truth
- active collab 期间使用 `edit/v2`（direct block changes）或 `suggestion.add`（tracked changes）；将 `rewrite.apply` 留给 no-client scenarios，因为有人连接时它会被 `LIVE_CLIENTS_PRESENT` 阻塞
- 考虑 `rewrite.apply` 前，优先使用 `find_replace_in_doc` 和 block-level `/edit/v2` edits
- 不要在单次 replace 中跨越 table cells
- 每个 op 都始终包含 `by: "ai:compound-engineering"`，headers 中包含 `X-Agent-Id: ai:compound-engineering`，以保持 consistent attribution
- 复用最近一次 `/state` 或 `/snapshot` read 得到的 `baseToken`；遇到 `STALE_BASE` 时，重新读取并重试一次
