---
title: "feat(resolve-pr-feedback): cross-invocation cluster analysis（跨 invocation 聚类分析）"
type: feat
status: completed
date: 2026-04-01
origin: docs/brainstorms/2026-04-01-cross-invocation-cluster-analysis-requirements.md
---

# resolve-pr-feedback 的 Cross-Invocation Cluster Analysis

## 概览

将 resolve-pr-feedback skill 中已经失效的 verify-loop re-entry gate signal，替换为 cross-invocation awareness signal，用于检测同一个 PR 多轮 review 中反复出现的 feedback patterns。该 change 触及三个文件：`get-pr-comments` script（data）、SKILL.md（orchestration）和 pr-comment-resolver agent（cluster handling）。

## 问题框架

该 skill 的 cluster analysis 有两个 gates：volume（3+ items）和 verify-loop re-entry（同一 invocation 的第 2+ pass）。verify-loop gate 已经失效 -- automated reviewers 在 push 后几分钟才 post，但 verify 在几秒后就运行。这使 volume 成为唯一 gate，并错过最高价值场景：reviewer 在多轮中每轮只发 1-2 个 threads，但都指向同一类问题。Cross-invocation awareness 通过同时检查 resolved threads 和 new ones 来检测这种 pattern -- 这是 multi-round review 的证据。（see origin: `docs/brainstorms/2026-04-01-cross-invocation-cluster-analysis-requirements.md`）

## 需求追踪

- R1. 用 cross-invocation awareness signal 替换 verify-loop re-entry gate
- R2. Prior resolutions + new feedback = re-entry signal，即使只有 1 个 new item
- R3. Volume gate（3+）不变，并与 cross-invocation signal 做 OR
- R4. Clustering input 包含 new + prior threads（bounded to last N）
- R5. Previously-resolved threads 参与 category assignment 和 spatial grouping
- R6. 三模式 resolver 评估：band-aid（redo）、correct-but-incomplete（investigate siblings）、sound-and-independent（context only）
- R7. Cluster brief 增加带 metadata 的 `<prior-resolutions>` element
- R8. Session 内 verify loop 并入 cross-invocation signal
- R9. 零 additional GraphQL calls -- broaden existing query's jq filter
- R10. 有界回看：last N resolved threads（从 "rounds" 简化 -- 见关键技术决策）

## 范围边界

- 不添加 persistent state files 或 `.context/` storage
- 不改变 volume gate threshold 或 spatial grouping rules
- 不改变 standard（non-cluster）thread handling
- 不新增 scripts -- 扩展 existing `get-pr-comments` script

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md` -- skill orchestration，steps 1-9
- `plugins/compound-engineering/skills/resolve-pr-feedback/scripts/get-pr-comments` -- GraphQL query + jq filter；query 已经 fetches resolved threads，但 jq 中将其 drop（`isResolved == false`）
- `plugins/compound-engineering/agents/workflow/ce-pr-comment-resolver.agent.md` -- resolver agent，包含 standard 和 cluster modes

### 组织内经验

- **Script-first architecture（脚本优先架构）**（`docs/solutions/skill-design/script-first-skill-architecture.md`）：Classification 和 filtering logic 必须放在 script 中，而不是 SKILL.md instructions。script 应输出 pre-computed analysis，让 model 接收 structured decisions，而不是 raw data to classify。节省 60-75% tokens。
- **Explicit state machines（显式状态机）**（`docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`）：将 cross-invocation gate 建模为 explicit outcomes 的 decision table，而不是 prose conditionals。
- **Pass paths, not content（传路径而不是内容）**（`docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`）：`<prior-resolutions>` element 应包含 metadata（thread IDs、categories、file paths、timestamps），而不是 full comment bodies。resolver 按需读取 full content。
- **Status-gated resolution（状态门控 resolution）**（`docs/solutions/workflow/todo-status-lifecycle.md`）：Previously-resolved threads 必须在 dispatch boundary enforced -- 它们参与 clustering，但绝不 individually dispatched。

## 关键技术决策

- **jq filter change, not GraphQL change（改 jq filter 而不是 GraphQL）**：现有 query 已经 fetch all threads including resolved ones。`isResolved == false` filter 位于 jq 中。扩展这个 filter 可以零 API 成本将 resolved threads 加入 output。（see origin: R9）
- **Any resolved thread is a prior resolution -- no author matching needed（任意 resolved thread 都是 prior resolution）**：brainstorm 原本要求检测 skill 自己的 prior replies。本 plan 简化为：PR 上任意 resolved thread 都是 prior review round 的证据。这样消除了 `gh api user` call、`author.login` matching、reply pattern detection 和 `set -e` error handling complexity。无论谁 resolve 了 threads，multi-round review 都是信号。
- **N bounds total resolved threads, not "rounds"（N 限制 thread 总数而不是 rounds）**：brainstorm 将 "rounds" 定义为单次 invocation 中 resolved 的 thread groups，这需要 fragile timestamp-based clustering in jq。本 plan 简化为：取 last N resolved threads（按 most recent comment 的 `createdAt`）。这是简单 jq sort + limit。N=10 作为初始值（覆盖 typical PR history，避免 excessive data）。Successive reviews 自然会聚集在 changed code 附近，因此 thread-level bounding 足够。
- **No spatial overlap check（不做 spatial overlap check）**：brainstorm 的 R11 指定在 full clustering 前做 lightweight overlap check。本 plan 放弃它：successive reviews 几乎总会聚集在相同 code areas，因此 overlap check 几乎总会 pass。它避免的成本（用约 10 个 resolved threads + 1-2 个 new ones clustering）很小。跳过它能保持 orchestration simpler。
- **Script computes the cross-invocation envelope（由 script 计算 cross-invocation envelope）**：按照 script-first learning，script 输出包含 `signal`（boolean）和 `resolved_threads`（array）的 `cross_invocation` object。SKILL.md 接收 pre-computed analysis。

## 开放问题

### 规划期间已解决

- **如何检测 prior resolutions**：任何 resolved thread = prior resolution。无需 author matching、reply pattern matching 或 user API call。Resolved threads 会与 new ones 一起存在于 script output 中。
- **如何限制回看范围**：按 most-recent comment timestamp 取 last N=10 resolved threads。Simple jq sort + slice。
- **是否先检查 spatial overlap**：否。Successive reviews 自然聚集在 changed code 附近。overlap check 为 negligible token savings 增加 orchestration complexity。

### 延后到实现阶段

- **N 的最佳取值**：从 10 开始。如果 resolved thread history 很多的 PR 出现 performance issues，则调低。如果 patterns 被 missed，则调高。

---

## 高层技术设计

> *这说明预期 approach，是给 review 的方向性指导，不是 implementation specification。实现 agent 应把它当作 context，而不是要复写的代码。*

```
┌──────────────────────────────────────────────────────┐
│  get-pr-comments script (data layer)                 │
│                                                      │
│  GraphQL query (unchanged)                           │
│       │                                              │
│       ▼                                              │
│  jq filter (broadened)                               │
│       │                                              │
│       ├── review_threads: [unresolved, as before]    │
│       ├── pr_comments: [as before]                   │
│       ├── review_bodies: [as before]                 │
│       └── cross_invocation:                          │
│             signal: true/false                        │
│             resolved_threads: [                       │
│               { thread_id, path, line,               │
│                 first_comment_body, last_comment_at } │
│               ...last N by recency                   │
│             ]                                        │
└──────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  SKILL.md (orchestration layer)                      │
│                                                      │
│  Step 1: Fetch (calls modified script)               │
│                                                      │
│  Step 2: Triage (as before)                          │
│                                                      │
│  Step 3: Cluster gate (CHANGED)                      │
│    ┌────────────────────────────────────────────┐    │
│    │ Volume (3+)? ─── YES ──> full clustering   │    │
│    │      │                                     │    │
│    │      NO                                    │    │
│    │      │                                     │    │
│    │ cross_invocation.signal? ─ NO ──> skip     │    │
│    │      │                                     │    │
│    │     YES                                    │    │
│    │      │                                     │    │
│    │ Full clustering (new + resolved threads)   │    │
│    └────────────────────────────────────────────┘    │
│                                                      │
│  Step 5: Dispatch                                    │
│    - resolved threads: cluster input only            │
│    - new threads: cluster or individual              │
│                                                      │
│  Step 8: Verify loop (simplified)                    │
│    - removes old verify-loop re-entry logic          │
│    - relies on cross-invocation signal next run      │
└──────────────────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│  pr-comment-resolver agent (cluster mode)            │
│                                                      │
│  Receives <cluster-brief> with <prior-resolutions>   │
│                                                      │
│  Three-mode assessment:                              │
│    1. Band-aid: redo prior fixes holistically        │
│    2. Correct-but-incomplete: keep fixes,            │
│       investigate sibling code                       │
│    3. Sound-and-independent: context only            │
└──────────────────────────────────────────────────────┘
```

## 实现单元

- [x] **Unit 1：扩展 `get-pr-comments` script**

**目标：** 扩展 jq filter，使其包含 resolved threads，并与 existing data 一起输出 cross-invocation envelope。

**需求：** R1, R2, R9, R10

**依赖：** 无

**文件：**
- 修改：`plugins/compound-engineering/skills/resolve-pr-feedback/scripts/get-pr-comments`

**做法：**
- 扩展 jq filter：保留 existing `review_threads` array（unresolved、non-outdated，as before）。为 resolved threads（`isResolved == true`）添加一个 new selection，按 most-recent comment `createdAt` 排序，限制为 last N=10。
- 输出 existing three keys（`review_threads`、`pr_comments`、`review_bodies`）不变，另加一个 `cross_invocation` object，包含：`signal`（boolean -- resolved threads 和 unresolved review threads 同时存在时为 true）和 `resolved_threads`（objects array，含 `thread_id`、`path`、`line`、`first_comment_body`、`last_comment_at`）。
- 无 `gh api user` call。无 author matching。无 reply pattern detection。signal 只是：resolved threads exist AND new threads exist。

**遵循的模式：**
- 复用 `get-pr-comments` 中现有 jq pipeline -- 扩展 `$pr` extraction，不重构它
- 保持全部 logic 在 jq 中

**测试场景：**
- 正常路径：PR 有 2 个 resolved threads 和 1 个 new thread -> `cross_invocation.signal: true`，`resolved_threads` 有 2 entries，`review_threads` 有 1 个
- 正常路径：PR 没有 resolved threads -> `cross_invocation.signal: false`，`resolved_threads` empty
- 正常路径：PR 有 resolved threads 但没有 unresolved threads -> `cross_invocation.signal: false`（nothing new to cluster）
- 边界情况：PR 有 20 个 resolved threads -> 只 included last 10（by recency）
- 边界情况：PR 有 resolved threads 但所有 unresolved threads 都 outdated -> `review_threads` empty，signal false

**验证：**
- 针对一个已知有 resolved threads 的 test PR 运行，并 verify output JSON shape
- Existing `review_threads`、`pr_comments`、`review_bodies` output 与当前 behavior 相同

---

- [x] **Unit 2：更新 SKILL.md orchestration**

**目标：** 用 cross-invocation signal 替换 verify-loop re-entry gate，更新 cluster brief format，enforce dispatch boundary for resolved threads，并简化 verify loop。

**需求：** R1, R2, R3, R4, R5, R7, R8

**依赖：** Unit 1（script must output the cross-invocation envelope）

**文件：**
- 修改：`plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md`

**做法：**

*Step 1（Fetch）*: 无变更 -- script 现在会自动返回 cross-invocation envelope。

*Step 2（Triage）*: 无变更。Triage 在 unresolved threads 中 classify new vs already-handled。来自 `cross_invocation` 的 resolved threads 不是 triage subjects -- 它们是 clustering 的独立 input。

*Step 3（Cluster Analysis）*: 替换 gate table：

| Gate signal | Check |
|---|---|
| **Volume** | 3+ new items from triage |
| **Cross-invocation** | `cross_invocation.signal == true` |

当 cross-invocation gate 触发：将 `cross_invocation.resolved_threads` 中的 resolved threads 与 new threads 一起用于 category assignment 和 spatial grouping。Resolved threads 标记为 `previously_resolved`。

更新 cluster brief XML，加入 `<prior-resolutions>`：
```xml
<cluster-brief>
  <theme>[concern category]</theme>
  <area>[common directory path]</area>
  <files>[comma-separated file paths]</files>
  <threads>[comma-separated thread/comment IDs]</threads>
  <hypothesis>[one sentence]</hypothesis>
  <prior-resolutions>
    <thread id="PRRT_..." path="..." category="..."/>
  </prior-resolutions>
</cluster-brief>
```

移除 `<just-fixed-files>` element -- 已由 `<prior-resolutions>` subsume。

*Step 5（Dispatch）*: 添加 dispatch boundary rule：resolved threads 参与 clustering 并出现在 cluster briefs 中，但 NEVER individually dispatched。只有 new threads 会进入 individual or cluster dispatch。

*Step 8（Verify）*: 简化。移除 "Record which files were modified and which concern categories were addressed" 和 verify-loop re-entry language。如果 2 个 fix-verify cycles 后仍有 new threads，escalate。Cross-invocation signal 处理跨 sessions 的 re-entry；within-session re-entry 也可工作，因为 earlier cycles 的 replies 在 re-fetch 后会使 threads 变为 resolved。

**遵循的模式：**
- step 3 中的 existing gate table format
- 现有 cluster brief XML structure
- step 5 中的 existing dispatch boundary logic

**测试场景：**
- 正常路径：1 new thread + cross-invocation signal -> cluster analysis runs，resolved threads included
- 正常路径：3 new threads + no cross-invocation signal -> volume gate fires，no resolved threads
- 正常路径：1 new thread + no cross-invocation signal -> both gates skip，no clustering
- 边界情况：cross-invocation cluster 有 1 new + 2 resolved -> brief includes all 3，dispatch only addresses the new thread（plus siblings the resolver identifies）
- 边界情况：resolved thread in a cluster -> 作为 context 放进 brief，NOT dispatched individually
- 集成：verify loop 在本 session 的 fixes 后 re-fetches，本 cycle 的 resolved threads appear in `cross_invocation`

**验证：**
- step 3 中的 gate table exactly two rows（Volume, Cross-invocation）
- 不再有 "verify-loop re-entry" references
- `<just-fixed-files>` 从 cluster brief documentation 中移除
- Step 5 有 "resolved threads are cluster-only" rule
- Step 8 不再 track files/categories，也不再将 re-entry 作为 gate signal 引用

---

- [x] **Unit 3：更新 pr-comment-resolver agent 以支持 cross-invocation clusters**

**目标：** 在 cluster mode 中添加对 `<prior-resolutions>` element 的 handling，并为 cross-invocation clusters 实现 three-mode assessment。

**需求：** R6, R7

**依赖：** Unit 2（SKILL.md must send the new cluster brief format）

**文件：**
- 修改：`plugins/compound-engineering/agents/workflow/ce-pr-comment-resolver.agent.md`

**做法：**

更新 Cluster Mode Workflow section：

Step 1（Parse cluster brief）: 将 `<prior-resolutions>` 加入 parsed elements。

Step 3（Assess root cause）: 当 `<prior-resolutions>` 存在时，从两个 modes（systemic vs coincidental）扩展为三个：

- **Band-aid fixes** -- prior fixes 只处理 symptoms，未处理 root cause。做法：重新检查 prior fix locations，实施 holistic fix。
- **Correct but incomplete** -- prior fixes 对其文件而言正确，但 recurring pattern 可能也存在于 untouched sibling code。这是 highest-value mode。做法：保留 prior fixes，修复 new thread，并主动调查 same directory/module 中的 files 是否存在相同 pattern。在 cluster assessment 中 report findings。
- **Sound and independent** -- prior fixes adequate，new thread genuinely unrelated。做法：individual fix，仅将 prior context 用于 awareness。

添加一个 cross-invocation example，展示 "correct but incomplete" mode。

更新 `cluster_assessment` return，使其包含 applied mode；对于 "correct but incomplete" mode，还要包含 investigated additional files。

**遵循的模式：**
- 现有 cluster mode workflow structure
- 现有 `<examples>` example format
- 现有 `cluster_assessment` return structure

**测试场景：**
- 正常路径：带 `<prior-resolutions>` 的 cluster，pattern extends to untouched code -> "correct but incomplete"，investigates siblings
- 正常路径：带 `<prior-resolutions>` 的 cluster，prior fixes were shallow -> "band-aid"，holistic fix
- 正常路径：带 `<prior-resolutions>` 的 cluster，new thread is unrelated -> "sound and independent"
- 正常路径：不带 `<prior-resolutions>` 的 cluster -> existing two-mode assessment，无 behavior change
- 边界情况：`<prior-resolutions>` present but empty -> fall back to existing behavior

**验证：**
- Cluster mode workflow 提到全部三种 assessment modes
- `<prior-resolutions>` 被列为 parsed element
- 新 example 展示 "correct but incomplete" mode
- `cluster_assessment` format 记录全部三种 modes
- 移除对 `<just-fixed-files>` 的 references（已由 `<prior-resolutions>` subsume）
- 现有 standard mode 和 non-prior cluster mode 不变

## 系统级影响

- **Interaction graph（交互图）:** `get-pr-comments` 由 SKILL.md step 1 和 step 8（verify）调用。两个 callers 现在都会收到 `cross_invocation` envelope。Step 8 的 re-fetch 会把本 session 的 replies 作为 resolved threads 拾取。
- **Error propagation（错误传播）:** 没有新的 external calls 会失败。唯一 change 是 jq filter broadening -- 如果 resolved threads 未出现在 GraphQL response 中，`cross_invocation.signal` 为 false（graceful degradation）。
- **API surface parity（API surface 对等）:** script 现有三个 output keys 不变。不读取 `cross_invocation` 的 callers 不受影响。
- **Unchanged invariants（不变 invariant）:** Targeted mode 不受影响。Volume gate threshold、spatial grouping rules 和 individual dispatch logic 不变。

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| 手动（non-skill）resolve 的 resolved threads 被纳入 prior resolutions | Acceptable -- 任意 resolved thread 都是 prior review attention 的证据。如果它是手动 resolved 且未 fix，与其 clustering 可能产生 "sound and independent" assessment，这是正确结果 |
| 含 50+ comments 的 resolved threads 触发 pagination limits | Existing query fetches `comments(first: 50)`。`last_comment_at` timestamp 来自已 fetch 的 comments -- graceful degradation |
| "Correct but incomplete" mode 导致 resolver 触碰不在 review threads 中的 files | 由 cluster 的 `<area>`（directory path）bounded。Resolver 在 cluster mode 中本来就会 broader read |
| Within-session verify loop 依赖 GitHub API 快速反映 resolved state | GitHub GraphQL eventually consistent。如果 just-resolved thread 尚未传播，re-fetch 中该 thread 不会触发 cross-invocation signal -- 会在下一次 invocation 捕获。Acceptable degradation |

## 来源与参考

- **Origin document（来源文档）：** [docs/brainstorms/2026-04-01-cross-invocation-cluster-analysis-requirements.md](docs/brainstorms/2026-04-01-cross-invocation-cluster-analysis-requirements.md)
- Related skill（相关 skill）：`plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md`
- Related agent（相关 agent）：`plugins/compound-engineering/agents/workflow/ce-pr-comment-resolver.agent.md`
- Related script（相关 script）：`plugins/compound-engineering/skills/resolve-pr-feedback/scripts/get-pr-comments`
- Learnings（经验沉淀）：`docs/solutions/skill-design/script-first-skill-architecture.md`, `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`
