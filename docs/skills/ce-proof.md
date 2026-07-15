# `ce-proof`

> 通过 [Proof](https://www.proofeditor.ai) publish、share、view、comment 和 edit markdown documents。Proof 是 Every 的 collaborative markdown editor。

`ce-proof` 是 **collaborative-doc** skill。Proof 是 humans 与 agents 可共同编辑同一文档的 real-time markdown editor。该 skill 的主要用途是 **one-way publishing**：把 local markdown file（brainstorm、plan、learning、draft）创建为 shared Proof doc，并向用户提供 shareable URL。Local file 保持 canonical；publish 不会把任何内容 sync 回 disk。当 agent 获得 Proof URL 参与协作时，该 skill 也会通过 Proof 的 **v3 Web API** 读取 shared doc，并执行 comment、suggestion 和 content edits。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 将 local markdown publish 成 shareable Proof doc，读取 shared docs，并通过 Proof v3 HTTP API edit |
| 何时使用 | "Share to Proof"、"publish to Proof"、"view this in Proof"；也会由 `ce-brainstorm` / `ce-plan` / `ce-ideate` 的 publish handoff 自动调用 |
| 产出什么 | Publish 时产出 shareable Proof URL；也可对你指定的 shared doc 执行 edits/comments |
| API surface | `proofeditor.ai` 上的 hosted Web API：`v3/document`（read）和 `v3/edit`（write） |
| Sync direction | 默认 one-way publish，local file 保持 canonical；把 Proof doc 拉回 local 是独立、显式的动作 |
| Ownership | 捕获 `accessToken`（日常操作）和 `ownerSecret`（delete）；在 UI claim 后会 revoke `ownerSecret` |

---

## 问题

Sharing markdown drafts for review 比看起来更难：

- **Chat is the wrong surface**：把 2,000 行 plan 粘进 chat 要 "feedback" 会丢掉 structure
- **Pasting comments is lossy**："see the bullet on line 47" 不 anchor；一周后没人记得是哪条 bullet
- **Tracked changes need infrastructure**："suggest this edit" 只有在真实 accept/reject affordance 存在时才有意义
- **Identity drifts**：agent edit 时是谁改的？没有 consistent attribution，rendered doc 中的 comment authorship 会错
- **Credentials are easy to drop**：create 会返回 `ownerSecret`，这是 ownerless doc 唯一的 delete credential；agent 若只复制不完整 example，会留下无法删除的 orphan
- **PII / secrets in transit**：上传内容到 third-party editor 是真实 concern；用户需要知道什么离开 local

## 方案

`ce-proof` 通过 Proof 的 structured v3 API 运行 publishing 与 collaboration：

- **One-way publish**：从 local markdown file 创建 shared doc 并返回 shareable URL；local file 保持 canonical
- **Web API**：无需安装；通过 HTTP create、read、edit；用户获得带 access token 的 shareable URL
- **v3 one-read / one-write**：`GET /api/agent/<slug>/v3/document` 和 `POST /api/agent/<slug>/v3/edit`；使用 visible-text targets；可选 `baseRevision`；没有 base tokens
- **Credential roles**：`accessToken` 用于日常 calls，`ownerSecret` 用于 owner delete；始终交付 `tokenUrl`
- **Consistent identity**：每个 op 使用 `by: "ai:compound-engineering"`；每 session 通过 `/presence` 绑定一次 `name: "Compound Engineering"`
- **Narrow-first edit ladder**：优先 `replace` / `insert` / `delete`；需要 track changes 时使用 `suggest`；最后才用 `set_document`（collab-safe）
- **Retry against `error.current`**：error envelope 以 `retryable` 封闭；遇到 `202` / `PENDING` 时 re-read

---

## 独特之处

### 1. Proof 当前 agent contract 上的 CE publish shell

Proof 官方 agent docs 定义 v3 + ownership。`ce-proof` 保留 compound-engineering 的 product shell（publish-primary、fixed identity、pull-to-local、upstream handoffs），同时使用当前 HTTP contract，而不是过时的 dual-endpoint agent surface。

### 2. One-way publish is the primary mode（一次性发布是主要模式）

- **Direct user request**：例如 "share this to proof so we can iterate" 或 "HITL this doc"
- **Upstream skill handoff**：`ce-brainstorm` / `ce-ideate` / `ce-plan` 完成 draft 后传给它 review

- 通过 `POST /share/markdown` 从 local markdown file 创建 shared Proof doc，并向用户交付 URL
- 通过 `POST /presence` 绑定 display name
- 展示 `tokenUrl`，供用户打开、阅读、评论并分享给其他人
### 3. Owner credential lifecycle

Create 同时返回 `accessToken` 和 `ownerSecret`。Skill 要求提取两者，并只把 `ownerSecret` 保留在 session memory 中（绝不写入 repo tree）；当用户要清理尚未 claim 的 doc 时，使用它调用 `DELETE /api/documents/<slug>`。Publish handoff **不会**自动 delete，因为 review URL 必须继续存在。Human claim doc 后，`ownerSecret` 会永久 revoke；`accessToken` 继续有效，delete 权限转移给 owner。

### 4. v3 mutation discipline

每次 edit 都通过带 `operations` array 的 `v3/edit` 执行。Targets 是 visible text。Ambiguous matches 会以 `TARGET_AMBIGUOUS` + candidates fail closed。Content ops 是 atomic，review ops 随后执行。Retryable failure 携带 `error.current`，让 agent 重新 resolve，而不是 blind retry。

### 5. Atomic pull-to-local（独立、显式动作）

Publishing 是 one-way，但用户仍可把 Proof doc 的 current state 作为 deliberate step 拉回 local markdown file。Skill 读取 `v3/document`，使用 `jq -jr` stream `.markdown`，然后 atomic rename。当 pull 是 side-effect 时，skill 会请求 confirmation。

### 6. Consistent agent identity

Skill 强制每个 op 使用 `by: "ai:compound-engineering"`，headers 使用 `X-Agent-Id: ai:compound-engineering`。Display name `Compound Engineering` 每 session 通过 `/presence` 绑定一次。**不要使用 `ai:compound` 或其他 ad-hoc variants**；除非 caller 显式 override，identity 始终一致。

---

## 快速示例

`/ce-plan` 完成 notification-mute plan，用户在 Phase 5.4 menu 选择 "Publish to Proof"。Plan 调用 `ce-proof`，传入 plan path 和 title。

Skill 通过 `POST /share/markdown` 使用 plan content 创建 Proof doc，保留 `accessToken` + `ownerSecret`，返回 `tokenUrl`，并通过 `POST /presence` 绑定 display name。它向用户展示 URL，然后把控制权交还 `ce-plan` Phase 5.4；local plan file 保持 canonical 且 untouched。

用户在 browser 中打开 URL，阅读 plan、添加 inline comments，并把 link 分享给 teammate。任何内容都不会 sync 回 disk；menu 会重新 render，让用户启动 `/ce-work`、创建 issue 或 pause。

---

## 何时使用

在以下情况使用 `ce-proof`：

- 想为 markdown doc（brainstorm、plan、learning、draft）获得 shareable URL
- Chain skill（`ce-brainstorm`、`ce-plan`、`ce-ideate`）handoff 到 publish for human review
- 正从 Proof URL 工作，并想 read state、comment 或 suggest edits
- 想把 shared Proof doc 的 current state 拉回 local file

以下情况跳过 `ce-proof`：

- Doc 很小，chat-paste-and-discuss 就足够
- 没有 network access（Web API 需要 `proofeditor.ai`）
- 内容过于敏感，不应上传到 third-party editor；保持 local

---

## 作为 Workflow 的一部分使用

`ce-proof` 在多个 publish touchpoints 与 chain 集成：
- **`/ce-brainstorm` Phase 4** — "Publish to Proof" handoff，用于 share requirements doc
- **`/ce-plan` Phase 5.4** — "Publish to Proof" handoff，用于 share plan
- **`/ce-ideate` Phase 5** — "Publish to Proof" option，用于 share markdown deliverable
- **`/ce-compound`** — 在把 learning commit 到 `docs/solutions/` 前分享

每种 handoff 都是 one-way：`ce-proof` publish、展示 URL，然后交还控制权。Originating skill 的 local artifact 保持 canonical，因此 upstream menu 原样 re-render，不需要 reconcile review-state machine。

---

## 单独使用

Ad-hoc Proof work 可直接调用：

- **Publish local markdown** — `/ce-proof "share docs/plans/foo.md to Proof"`
- **From a Proof URL** — `/ce-proof https://www.proofeditor.ai/d/abc123?token=xxx`（read state、add comments、suggest edits）
- **Publish the just-edited file** — "share this to proof" 会选择刚刚改动的 markdown
- **Pull a Proof doc to local** — 把 current Proof state sync 到 markdown file（atomic write；explicit、confirmed）
- **Cleanup** — 用户要求移除你创建且尚未 claim 的 doc 时，使用 session `ownerSecret` 执行 `DELETE`

---

## 参考

| API surface（API 表面） | When（何时使用） |
|-------------|------|
| `POST /share/markdown` | Create / publish |
| `GET /api/agent/{slug}/v3/document` | Read markdown + comments + suggestions |
| `POST /api/agent/{slug}/v3/edit` | Content and review mutations |
| `DELETE /api/documents/{slug}` | Owner delete (`ownerSecret` or Every owner session) |

| v3 content op | Purpose |
|---------------|---------|
| `replace` / `insert` / `delete` | Narrow prose edits (visible-text targets) |
| `set_document` | Whole-doc replacement (last resort; collab-safe) |

| v3 review op | Purpose |
|--------------|---------|
| `comment` / `reply` / `resolve` / `unresolve` | Comment threads (no comment delete) |
| `suggest` / `accept` / `reject` | Tracked suggestions |

Identity defaults：`by: "ai:compound-engineering"`、`X-Agent-Id: ai:compound-engineering`、`name: "Compound Engineering"`。

---

## 常见问题

**Publishing 会把 edits sync 回我的 local file 吗？** 不会。Publishing 是 one-way：它创建 shared Proof doc 并返回 URL；local file 保持 canonical。如果你想把当前 Proof state 写到磁盘，需要把它作为单独动作 pull down。

**为什么 create 返回两个 tokens？**
`accessToken` 是 read/edit/presence 的日常 bearer。`ownerSecret` 是能够删除 ownerless agent-created doc 的唯一 credential；丢失它会留下无法删除的 orphan。

**我应该 rewrite whole doc 吗？**
几乎永远不要作为第一步。优先使用 `replace` / `insert` / `delete`；需要 visible track changes 时使用 `suggest`。只有用户要求 full replacement，或 change 无法用更窄 operations 表达时，才用 `set_document`。

**正确 mutation pattern 是什么？**
读取一次 `v3/document`，用一次 `v3/edit` 发送所需 operations，然后检查 settled response（遇到 `202` 时 re-read）。Retryable errors 要对照 `error.current` 重新 resolve。

**为什么使用 `ai:compound-engineering` identity？**
为了 consistent attribution。Rendered doc 中的 authorship 会显示是谁编辑；如果 agent 今天用 `ai:compound`，明天用 `ai:compound-engineering`，audit trail 会 fragmented。Skill 强制单一 identity，除非 caller 明确 override。

**有用户连接时还能 edit doc 吗？**
可以。v3 content 与 review ops 在 active collab 期间可用。`set_document` 会作为 minimal diff 应用，官方 contract 说明它对 live collaborators 安全。

**清空 doc 会移除 comments 吗？**
不会。清空 markdown 不会清理 comment marks。Doc 尚未 claim 时用 `ownerSecret` 删除；claim 后请 owner 删除。

**Upload fails 怎么办？**
Skill retry once。仍失败时，callers 得到清晰 error 并决定后续（通常：停留在 chain skill menu，不做 Proof handoff，或 fallback 到 local-only）。Persistent failures 会通过 `POST /api/bridge/report_bug` 报给 Proof 做 diagnosis。

---

## 另见

- [`/ce-brainstorm`](./ce-brainstorm.md) — Phase 4 "Publish to Proof" handoff
- [`/ce-plan`](./ce-plan.md) — Phase 5.4 "Publish to Proof" handoff
- [`/ce-ideate`](./ce-ideate.md) — Phase 5 "Publish to Proof" option
- [Proof](https://www.proofeditor.ai) — editor 本体；此 skill 是 agent client
- [Proof agent docs](https://www.proofeditor.ai/agent-docs) — hosted agent contract
