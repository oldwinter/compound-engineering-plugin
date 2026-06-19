# `ce-proof`

> 通过 [Proof](https://www.proofeditor.ai) publish、share、view、comment 和 edit markdown documents。Proof 是 Every 的 collaborative markdown editor。`ce-proof` 是 **collaborative-doc** skill。Proof 是实时 markdown editor，不是 generic file host。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 将 local markdown publish 成 shareable Proof doc，读取 shared docs，并通过 API comment / suggestion / block edit |
| 何时使用 | "Share to Proof"、"publish this to Proof"、"view this in Proof"，或 chain skill 想为 brainstorm、plan、draft 提供 shareable markdown surface |

---

## 问题

Sharing markdown drafts for review 比看起来更难：

- **Chat is the wrong surface**：把 2,000 行 plan 粘进 chat 要 "feedback" 会丢掉 structure
- **Pasting comments is lossy**："see the bullet on line 47" 不 anchor；一周后没人记得是哪条 bullet
- **Tracked changes need infrastructure**："suggest this edit" 只有在真实 accept/reject affordance 存在时才有意义
- **Identity drifts**：agent edit 时是谁改的？没有 consistent attribution，rendered doc 中的 comment authorship 会错
- **State management is fragile**：concurrent edits 会 collide；mutations 需要 base tokens；retry logic 充满 footguns
- **PII / secrets in transit**：上传内容到 third-party editor 是真实 concern；用户需要知道什么离开 local

## 方案

`ce-proof` 通过 Proof 的 structured API 运行 publishing 与 collaboration：
- **One-way publish** — 从 local markdown file 创建 shared doc 并返回 shareable URL；local file 保持 canonical
- **Web API** 用于 shared docs：无需安装；通过 HTTP create、read、edit
- **Direct shared-link reads**：agents 可用 `Accept: application/json` 或 `Accept: text/markdown` 读取内容
- **Local Bridge** 用于 macOS Proof app：通过 localhost:9847 驱动 open docs

---

## 独特之处

### 1. Web API + Local Bridge：同时支持，identity model 一致

Proof 暴露两个 surfaces：

- **Web API**（位于 `proofeditor.ai`）：拥有 share URL 的任何人都可 read/edit；适合 shared review
- **Local Bridge**（位于 `localhost:9847`）：直接驱动 macOS 上打开的 Proof.app；适合 one-machine workflows

Skill 两者都记录。Identity 保持一致：`ai:compound-engineering` machine ID，`Compound Engineering` display name。如果 distinct sub-agent 应 own doc，caller 可以 override identity pair。

### 2. One-way publish is the primary mode（一次性发布是主要模式）

- **Direct user request**：例如 "share this to proof so we can iterate" 或 "HITL this doc"
- **Upstream skill handoff**：`ce-brainstorm` / `ce-ideate` / `ce-plan` 完成 draft 后传给它 review

### 3. Mutation discipline：token chaining 与 retry 前验证

每个 Proof mutation 都需要 `baseToken`。Skill 教授正确 pattern：

- **Read once, chain tokens**：从 `/state` 或 `/snapshot` seed，然后复用 successful mutations 返回的 next `mutationBase.token`
- **遇到 `STALE_BASE` / `BASE_TOKEN_REQUIRED` / `MISSING_BASE` / `INVALID_BASE_TOKEN`**：re-read `/state`，用 fresh token 重建 body，mint new idempotency key 后 retry once
- **遇到 `INVALID_OPERATIONS` / `INVALID_REQUEST` / 422 errors**：先修 payload，不要 blind retry
- **遇到 `COLLAB_SYNC_FAILED` / 5xx / network timeout / `202 with collab.status: "pending"`**：canonical doc *可能* 已写入；retry 前 re-read `/state`，检查 intended mark/edit 是否已存在
- **`Idempotency-Key`** 推荐用于每个 mutation；contract 要求时必须使用。只有 exact same-body resend 才复用同一个 key；如果 body 改变（包括 fresh `baseToken`），就 mint new key

> Duplicate-mark incidents 通常来自 timeout 后未 verify 就 retry `comment.add` 或 `suggestion.add`。不确定时：re-read、diff，然后再决定。

### 4. 两种 endpoint shape：`/ops` 和 `/edit/v2`

Proof 有两个 write surfaces，且 **差异很关键**：

- **`/api/agent/{slug}/ops`**：top-level `type` 用于单个 mark op，或 top-level `operations` 用于 batched comment thread mutations。最适合 comments、suggestions、replies 和 resolves。
- **`/api/agent/{slug}/edit/v2`**：`operations` array，其中每项有 `op`。Atomic batch：全部落地或全部不落地。最适合 block-level edits 和 bulk sweeps（`replace_block`、`insert_after`、`find_replace_in_doc` 等）。

### 5. Efficient comment passes：先 edit batch，再 comment batch

当 agent 参与 shared doc 的 comment threads 时，高效 pass shape 是：

对普通 HITL feedback，comment thread 是 audit trail。高效 pass shape 是：

- 读取 `GET /state?kinds=comment`，让 provenance/authorship marks 不污染 needs-reply list
- 尽可能用一个 `/edit/v2` batch 应用 agreed content edits
- 对 terminology 或 punctuation sweeps 等 literal doc-wide replacements 使用 `find_replace_in_doc`
- 用一个 `/ops` batch 通过 `comment.reply` + `resolve: true` reply 并 resolve handled threads

这样 8-comment review 可从 dozens of sequential reply/resolve/state-read requests 变成少量 authoritative mutations。

### 6. Rewrite 是最后手段

Agents 不应从 replacing full document 开始。推荐 edit ladder：

- `find_replace_in_doc` 用于 exact repeated substitutions
- `/edit/v2` block operations 用于 known paragraphs、list items、sections、insertions 和 deletions
- 当 visible track changes 是 desired review surface 时使用 `suggestion.add`
- 只有用户明确要求 whole-doc replacement，或 change 无法用更窄 operations 安全表达时，才用 `rewrite.apply`

这能保持 human comments 稳定，避免 clobber live collaborators，并让 retries 更容易推理。

### 7. 使用 `status: "accepted"` 的 tracked suggestion

### 8. `LIVE_CLIENTS_PRESENT` awareness（感知在线客户端）

### 8. `LIVE_CLIENTS_PRESENT` 感知

当 client 连接到 Proof doc 时，skill 知道哪些安全：

- **`/edit/v2`**：active collab 时可用
- **`suggestion.add`**（包括 `status: "accepted"`）：active collab 时可用
- **All comment ops**：active collab 时可用
- **`rewrite.apply`**：被 `LIVE_CLIENTS_PRESENT` 阻止，因为会 clobber in-flight Yjs edits

### 9. Atomic pull-to-local（独立显式动作）

Publishing 是 one-way，但用户仍可把 Proof doc 的当前状态作为 deliberate、separate step 拉回 local markdown file（例如其他人编辑后）。

```bash
# Stream .markdown bytes directly to a temp sibling, then rename.
TMP="${LOCAL}.proof-sync.$$"
jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$LOCAL"
```

`jq -jr`（无 trailing newline，raw string）保留 byte-for-byte content，包括 trailing newlines。同一 filesystem 内 `mv` 是 atomic：crashed write 会留下 original untouched，绝不会 half-written。这个 sync 只有在用户明确要求 pull 时执行。

### 10. Consistent agent identity（一致的 agent identity）

Skill 强制每个 op 使用 `by: "ai:compound-engineering"`，headers 中使用 `X-Agent-Id: ai:compound-engineering`。Display name `Compound Engineering` 每 session 通过 `/presence` 绑定一次。**不要使用 `ai:compound` 或其他 ad-hoc variants**；除非 caller 为 sub-agent context 明确 override，identity 保持统一。

---

## 快速示例

`/ce-plan` 完成 notification-mute plan，用户在 Phase 5.4 menu 选择 "Publish to Proof"。Plan 调用 `ce-proof`，传入 plan path 和 title。

Skill 通过 `POST /share/markdown` 创建 Proof doc，内容来自 plan file。返回带 token 的 URL，并通过 `POST /presence` 绑定 display name。Local plan file 保持 canonical；Proof link 用于 read、comment 和 share。

---

## 何时使用

在以下情况使用 `ce-proof`：

- 想为 markdown doc（brainstorm、plan、learning、draft）获得 shareable URL
- Chain skill（`ce-brainstorm`、`ce-plan`、`ce-ideate`）handoff 到 publish for human review
- 正从 Proof URL 工作，并想 read state、comment 或 suggest edits

以下情况跳过 `ce-proof`：

- Doc 很小，chat-paste-and-discuss 就足够
- 没有 network access（web API 需要 `proofeditor.ai`）；local bridge 只支持 macOS
- 内容过于敏感，不应上传到 third-party editor；保持 local

---

## 作为 Workflow 的一部分使用

`ce-proof` 在多个 publish touchpoints 与 chain 集成：
- **`/ce-brainstorm` Phase 4** — "Publish to Proof" handoff，用于 share requirements doc
- **`/ce-plan` Phase 5.4** — "Publish to Proof" handoff，用于 share plan
- **`/ce-ideate` Phase 5** — "Publish to Proof" option，用于 share markdown deliverable

---

## 单独使用

Ad-hoc Proof work 可直接调用：

- **Publish local markdown** — `/ce-proof "share docs/plans/foo.md to Proof"`
- **From a Proof URL** — `/ce-proof https://www.proofeditor.ai/d/abc123?token=xxx`（read state、add comments、suggest edits）
- **Publish the just-written plan or brainstorm** — 从 `ce-plan` / `ce-brainstorm` handoff 进入

---

## 参考

| API surface（API 表面） | When（何时使用） |
|-------------|------|
| Web API at `proofeditor.ai` | Default；无需安装；shareable URLs |
| Local Bridge at `localhost:9847` | macOS Proof.app running；one-machine workflow |

| Op (Web API `/ops`) | Purpose |
|---------------------|---------|
| `comment.add` | Comment on a quote |
| `comment.reply` | Reply within a thread；`resolve: true` replies and closes in one mutation |
| `comment.resolve` / `comment.unresolve` | Toggle thread resolution |
| `suggestion.add` | Tracked edit（pending 或 `status: "accepted"`） |
| `suggestion.accept` / `suggestion.reject` | Resolve a suggestion |
| `rewrite.apply` | Last-resort whole-doc replacement（被 `LIVE_CLIENTS_PRESENT` 阻止） |

| Endpoint | Wire format | Best for |
|----------|-------------|----------|
| `/api/agent/{slug}/ops` | Top-level `type` 或 comment `operations` batch | Marks、batched replies/resolves |
| `/api/agent/{slug}/edit/v2` | `operations: [{op, ...}, ...]` | Atomic block batches 和 `find_replace_in_doc` sweeps |

Identity defaults：`by: "ai:compound-engineering"`、`X-Agent-Id: ai:compound-engineering`、`name: "Compound Engineering"`。每个 mutation 推荐使用 `Idempotency-Key`；contract 要求时必须使用。

---

## 常见问题

**Publishing 会把 edits sync 回我的 local file 吗？** 不会。Publishing 是 one-way：它创建 shared Proof doc 并返回 URL；local file 保持 canonical。如果你想把当前 Proof state 写到磁盘，需要把它作为单独动作 pull down。

**我应该 rewrite whole doc 吗？**
几乎永远不要作为第一步。Literal sweeps 用 `find_replace_in_doc`，scoped edits 用 block-level `/edit/v2`。只有用户要求 full replacement，或 change 无法用更窄 operations 表达时，才用 `rewrite.apply`。

**正确 mutation pattern 是什么？** Comment work 读取 `/state?kinds=comment`，block refs 读取 `/snapshot`，捕获 `mutationBase.token`，然后从 successful mutation responses 更新 cached token。遇到 `STALE_BASE` 时 re-read，并用 fresh token retry 一次。

**为什么使用 `ai:compound-engineering` identity？**
为了 consistent attribution。Rendered doc 中的 mark authorship 会显示是谁编辑；如果 agent 今天用 `ai:compound`，明天用 `ai:compound-engineering`，audit trail 会 fragmented。Skill 强制单一 identity，除非 caller 明确 override。

**有用户连接时还能 edit doc 吗？** 可以，`/edit/v2`、`suggestion.add`（包括 `status: "accepted"`）和所有 comment ops 都可以。`rewrite.apply` 不可以：它会被 `LIVE_CLIENTS_PRESENT` 阻塞，因为它会 clobber in-flight Yjs edits。

**Upload fails 怎么办？**
Skill retry once。仍失败时，callers 得到清晰 error 并决定后续（通常：停留在 chain skill menu，不做 Proof handoff，或 fallback 到 local-only）。Persistent failures 会通过 `POST /api/bridge/report_bug` 报给 Proof 做 diagnosis。

---

## 另见

- [`/ce-brainstorm`](./ce-brainstorm.md) — Phase 4 "Publish to Proof" handoff
- [`/ce-plan`](./ce-plan.md) — Phase 5.4 "Publish to Proof" handoff
- [`/ce-ideate`](./ce-ideate.md) — Phase 5 "Publish to Proof" option
- [Proof](https://www.proofeditor.ai) — shared editor surface
