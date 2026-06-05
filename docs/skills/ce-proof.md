# `ce-proof`

> 通过 [Proof](https://www.proofeditor.ai) 创建、分享、查看、评论 markdown documents，并运行 human-in-the-loop review loops。Proof 是 Every 的 collaborative markdown editor。

`ce-proof` 是 **collaborative-doc** skill。Proof 是实时 markdown editor，humans 和 agents 在同一 document 上协作：用户在浏览器中用 comments 和 suggestions annotation；agent ingest 这些 threads，应用 agreed edits，并原地 reply。Skill 暴露 Proof 的 web API（无需安装；通过 HTTP create、read、edit shared docs）和 local bridge（驱动 `localhost:9847` 上的 macOS Proof app）。大多数 chain skills 用它做 HITL review handoffs。

最常见用法是 **HITL review mode**：上传 local markdown file（brainstorm、plan、learning），让用户在 Proof UI 中 annotate，ingest 每个 comment thread，应用 agreed edits，然后把 reviewed doc atomically sync 回磁盘。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 上传 markdown 到 Proof，让用户在 web UI comment / suggest，ingest feedback 作为 in-thread replies 和 agreed edits，并把 reviewed doc sync 回 local |
| 何时使用 | "Share to Proof"、"view this in Proof"、"HITL this doc with me"、"iterate with Proof on this draft"；`ce-brainstorm` / `ce-plan` / `ce-ideate` HITL handoffs 会 auto-invoke |
| 产出什么 | Shareable Proof URL、iterative review loop，以及（source 是 local file 时）带用户 edits 的 synced markdown file |
| 两层能力 | Web API（HTTP，无需安装）和 Local Bridge（驱动 macOS Proof app） |

---

## 问题

Collaboratively review markdown drafts 比看起来更难：

- **Chat is the wrong surface**：把 2,000 行 plan 粘进 chat 要 "feedback" 会丢掉 structure
- **Pasting comments is lossy**："see the bullet on line 47" 不 anchor；一周后没人记得是哪条 bullet
- **Tracked changes need infrastructure**："suggest this edit" 只有在真实 accept/reject affordance 存在时才有意义
- **Identity drifts**：agent edit 时是谁改的？没有 consistent attribution，rendered doc 中的 comment authorship 会错
- **State management is fragile**：concurrent edits 会 collide；mutations 需要 base tokens；retry logic 充满 footguns
- **PII / secrets in transit**：上传内容到 third-party editor 是真实 concern；用户需要知道什么离开 local

## 方案

`ce-proof` 通过 Proof 的 structured API 运行 collaboration：

- **Web API** 用于 shared docs：无需安装；通过 HTTP create、read、edit；用户获得带 access token 的 shareable URL
- **Direct shared-link reads**：agents 可用 `Accept: application/json` 或 `Accept: text/markdown` fetch Proof URLs，无需 browser automation
- **Local Bridge** 用于 macOS Proof app 正在运行时：通过 `localhost:9847` 直接驱动 open document
- **HITL review mode** 作为 primary chain integration：atomic upload + iterative ingest + atomic end-sync to disk
- **Consistent identity**：每个 op 都使用 `by: "ai:compound-engineering"`；通过 `/presence` 一次性绑定 `name: "Compound Engineering"`
- **Efficient ingest passes**：filtered comment reads，一个 block-edit batch 处理 content changes，一个 comment batch 处理 replies/resolutions
- **Rewrite-last edit strategy**：先用 exact replacements 和 block edits；只有真正无法避免时才 whole-doc replacement
- **`baseToken` discipline**：从 read seed token，从 mutation responses chain next token；遇到 `STALE_BASE` 时 re-read 并 retry once；对 potentially-applied mutations retry 前先 verify
- **Idempotency keys**：安全重试 exact requests，避免 duplicate writes

---

## 独特之处

### 1. Web API + Local Bridge：同时支持，identity model 一致

Proof 暴露两个 surfaces：

- **Web API**（位于 `proofeditor.ai`）：拥有 share URL 的任何人都可 read/edit；适合 shared review
- **Local Bridge**（位于 `localhost:9847`）：直接驱动 macOS 上打开的 Proof.app；适合 one-machine workflows

Skill 两者都记录。Identity 保持一致：`ai:compound-engineering` machine ID，`Compound Engineering` display name。运行 HITL review 的 callers 如果在不同 sub-agent contexts 中，可 override identity pair，让 distinct sub-agent own 该 doc。

### 2. HITL review as a structured mode（结构化 HITL review）

Human-in-the-Loop Review path（从 `references/hitl-review.md` 加载）是 chain 的 primary use case：

- 上传 local markdown file 到 Proof；用户获得 URL
- 用户在 Proof web UI 中 annotate（comments、suggested edits）
- Skill ingest threads：读取 filtered comment state，用 `/edit/v2` 应用 agreed edits，in-thread reply，并通过 batched comment mutation resolve handled threads
- End-sync 时，将 final markdown **atomically** sync 回 local file（写入 temp sibling，再 `mv`）

两个 entry points，机制相同：

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

把 `op` shape operation 发给 `/ops` 会返回 422；wire format 不可互换。Skill 明确记录两者。

### 5. 快速 HITL passes：先 edit batch，再 comment batch

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

`suggestion.add` 默认创建 pending suggestion，需要用户 accept/reject。Skill 也暴露 `status: "accepted"`：一次调用同时创建 suggestion mark **并** commit change。Mark 作为 audit trail 保留，带 per-edit attribution；用户仍可 reject 来 revert。当 agent 自信且用户想看到 landed 内容而不做 explicit accept step 时很有用。

HITL default 现在是 `/edit/v2` 加 in-thread reply；当 visible track-change mark 本身是 desired review experience 的一部分时，使用 accepted suggestions。

### 8. `LIVE_CLIENTS_PRESENT` 感知

当 client 连接到 Proof doc 时，skill 知道哪些安全：

- **`/edit/v2`**：active collab 时可用
- **`suggestion.add`**（包括 `status: "accepted"`）：active collab 时可用
- **All comment ops**：active collab 时可用
- **`rewrite.apply`**：被 `LIVE_CLIENTS_PRESENT` 阻止，因为会 clobber in-flight Yjs edits

Skill 告诉 callers 把 `rewrite.apply` 留给 no-client scenarios；active sessions 中使用 granular ops 或 `/edit/v2`。

### 9. 原子 end-sync 回 local file

当 source 是 local markdown file 时，end-sync 会把 reviewed Proof state **atomically** 写回磁盘：

```bash
# Stream .markdown bytes directly to a temp sibling, then rename.
TMP="${LOCAL}.proof-sync.$$"
jq -jr '.markdown' "$STATE_TMP" > "$TMP" && mv "$TMP" "$LOCAL"
```

`jq -jr`（无 trailing newline，raw string）保留 byte-for-byte content，包括 trailing newlines。同一 filesystem 内 `mv` 是 atomic：crashed write 会留下 original untouched，绝不会 half-written。

当 pull 不是用户直接要求时（例如 HITL completion 的 side-effect），skill 会在写入前请用户 confirm；silent overwrites 令人意外。

### 10. Consistent agent identity（一致的 agent identity）

Skill 强制每个 op 使用 `by: "ai:compound-engineering"`，headers 中使用 `X-Agent-Id: ai:compound-engineering`。Display name `Compound Engineering` 每 session 通过 `/presence` 绑定一次。**不要使用 `ai:compound` 或其他 ad-hoc variants**；除非 caller 为 sub-agent context 明确 override，identity 保持统一。

---

## 快速示例

`/ce-plan` 完成 notification-mute plan，用户在 Phase 5.4 menu 选择 "Open in Proof"。Plan 以 HITL-review mode 调用 `ce-proof`，传入 plan path 和 title。

Skill 通过 `POST /share/markdown` 创建 Proof doc，内容为 plan。返回带 token 的 URL。通过 `POST /presence` 绑定 display name。把 URL 展示给用户。

用户在浏览器中打开 URL。10 分钟内添加 4 个 inline comments 和 2 个 suggested edits。然后在 chat 中说 "ready"。

Skill 读取 `/state`，找到 6 个 new marks。对每个 comment thread：

- Fresh read thread（重新读取 thread）
- 通过 `/edit/v2` small batch 应用 agreed content edits
- 用一个 `/ops` comment batch post thread replies 并 resolve handled comments

所有 threads 处理后，skill 请求用户确认 end-sync。用户确认。Skill atomically 将 reviewed markdown 写回 `docs/plans/2026-05-04-001-feat-notification-mute-plan.md`。返回 `ce-plan` Phase 5.4，状态为 `status: proceeded` 和 `localSynced: true`。

---

## 何时使用

在以下情况使用 `ce-proof`：

- 想为 markdown doc（brainstorm、plan、learning、draft）获得 shareable URL
- 想进行 HITL review：comment threads、agent-applied edits、最后 atomic disk sync
- Chain skill（`ce-brainstorm`、`ce-plan`、`ce-ideate`）handoff 到 human review
- 正从 Proof URL 工作，想让 agent 参与

以下情况跳过 `ce-proof`：

- Doc 很小，chat-paste-and-discuss 就足够
- 没有 network access（web API 需要 `proofeditor.ai`）；local bridge 只支持 macOS
- 内容过于敏感，不应上传到 third-party editor；保持 local

---

## 作为 Workflow 的一部分使用

`ce-proof` 在多个 HITL touchpoints 与 chain 集成：

- **`/ce-brainstorm` Phase 4**："Open in Proof" handoff，用于 collaborative iteration requirements doc
- **`/ce-plan` Phase 5.4**："Open in Proof" handoff，用于 plan 的 HITL review
- **`/ce-ideate` Phase 6**："Open and iterate in Proof" option（non-software topics 的 default save destination）
- **`/ce-compound`**：commit 到 `docs/solutions/` 前分享 learning

HITL review 完成后，originating skill 会以四种 statuses 之一恢复控制：

- `proceeded` with `localSynced: true`：disk 已 sync；继续
- `proceeded` with `localSynced: false`：Proof 有新版本，local stale；提供 pull
- `done_for_now`：用户 pause；提供 pull current Proof state
- `aborted`：无 changes，fallback 到 menu

---

## 单独使用

Ad-hoc Proof work 可直接调用：

- **Upload local markdown（上传本地 markdown）**：`/ce-proof "share docs/plans/foo.md to Proof for iteration"`
- **From a Proof URL（从 Proof URL 开始）**：`/ce-proof https://www.proofeditor.ai/d/abc123?token=xxx`（read state、add comments、suggest edits）
- **HITL on the just-edited file（对刚编辑的文件做 HITL）**："share this to proof so we can iterate" 会拾取刚刚 touched 的 markdown
- **Pull a Proof doc to local（拉取 Proof doc 到本地）**：sync current Proof state 到 markdown file（atomic write）

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

**为什么有两种 endpoint shapes？**
不同 concerns。`/ops` 处理 mark mutations，包括 batched existing-thread comment replies/resolves。`/edit/v2` 处理 atomic batches of block-level edits 和 document-wide literal replacement。Wire formats 不同：把 `op` shape 发到 `/ops` 会返回 422。

**我应该 rewrite whole doc 吗？**
几乎永远不要作为第一步。Literal sweeps 用 `find_replace_in_doc`，scoped edits 用 block-level `/edit/v2`。只有用户要求 full replacement，或 change 无法用更窄 operations 表达时，才用 `rewrite.apply`。

**正确 mutation pattern 是什么？**
Comment ingest 读取 `/state?kinds=comment`，或为 block refs 读取 `/snapshot`，捕获 `mutationBase.token`，然后从 successful mutation responses 更新 cached token。遇到 `STALE_BASE` 时 re-read，并用 fresh token retry once。遇到 potentially-applied errors（5xx、timeout、`202 pending`）时，re-read 并检查 change 是否已存在，再 retry；duplicate marks 来自未 verify 的 retry。

**为什么使用 `ai:compound-engineering` identity？**
为了 consistent attribution。Rendered doc 中的 mark authorship 会显示是谁编辑；如果 agent 今天用 `ai:compound`，明天用 `ai:compound-engineering`，audit trail 会 fragmented。Skill 强制单一 identity，除非 caller 明确 override。

**HITL review mode 做什么？**
上传 local markdown file 到 Proof，让用户在 web UI 中用 comments 和 suggestions annotate；用 filtered comment reads ingest 每个 thread；通过 Proof edit APIs 应用 agreed edits；in-thread reply/resolve；然后 atomically sync reviewed markdown 回 local file。完整 loop spec 在 `references/hitl-review.md`。

**用户连接时我能 edit doc 吗？**
`/edit/v2`、`suggestion.add`（包括 `status: "accepted"`）和所有 comment ops 都可以。`rewrite.apply` 不行：它被 `LIVE_CLIENTS_PRESENT` 阻止，因为会 clobber in-flight Yjs edits。

**Upload fails 怎么办？**
Skill retry once。仍失败时，callers 得到清晰 error 并决定后续（通常：停留在 chain skill menu，不做 Proof handoff，或 fallback 到 local-only）。Persistent failures 会通过 `POST /api/bridge/report_bug` 报给 Proof 做 diagnosis。

---

## 另见

- [`/ce-brainstorm`](./ce-brainstorm.md) - Phase 4 "Open in Proof" handoff（在 Proof 中打开的 handoff）
- [`/ce-plan`](./ce-plan.md) - Phase 5.4 "Open in Proof" handoff（在 Proof 中打开的 handoff）
- [`/ce-ideate`](./ce-ideate.md) - Phase 6 "Open and iterate in Proof" option（在 Proof 中打开并迭代的选项）
- [Proof](https://www.proofeditor.ai) - editor itself（编辑器本体）；此 skill 是 agent client
