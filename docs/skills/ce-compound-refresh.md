# `ce-compound-refresh`

> 随时间维护 `docs/solutions/`：用当前 codebase review existing learnings，然后 update、consolidate、replace 或 delete 已经 drift 的内容。

`ce-compound-refresh` 是 institutional knowledge 的 **maintenance** skill。随着 code 演进，learnings 会 drift：file paths 改了、classes 重命名了、原本推荐的 fix 变成 anti-pattern、两篇 docs 从略不同角度覆盖同一问题。没有周期性维护时，`docs/solutions/` 会变成一片半真半假的 guidance，误导多于帮助。此 skill 是让它保持精简可信的 periodic review。

它与 `ce-compound` 配对：那个 skill **captures** new learnings；这个 skill **maintains** existing set。二者共同形成 feedback loop：每个 solved problem 都变成 doc，每次 refresh 都让这些 docs 随 codebase 演进保持 honest。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 用当前 codebase review `docs/solutions/` 中的 learnings，并应用五种 outcomes 之一：Keep、Update、Consolidate、Replace、Delete |
| 何时使用？ | Significant refactors 后；`ce-compound` 标记旧 doc 被 superseded 时；learnings 开始 drift 时；周期性 hygiene sweeps |
| 产出什么？ | Updated、consolidated、replaced 或 deleted docs，外加 maintenance report |
| 模式 | **Interactive**（default）和 **Autofix**（`mode:autofix`） |

---

## 问题

`docs/solutions/` 会以可预测方式积累 drift：

- **Renames and moves**：learning 引用 `app/models/auth_token.rb`，但文件现在是 `app/models/session_token.rb`
- **Architectural shifts**：推荐 fix 现在成了 anti-pattern；new architecture 以不同方式处理问题
- **Silent duplication**：两篇 learnings 从不同角度描述同一问题，写于数月前后，并开始互相矛盾
- **Pattern docs without supporting learnings**：generalized rule 的 underlying evidence 已经变化
- **Dead docs that won't die**：三季度前 code 就删了，但 learning 还在
- **Archive folders that grow**：`_archived/` directories 污染 search results，没人阅读

没有主动维护，knowledge store 会失去 trustworthiness。未来 agents（和 humans）会查到部分错误的 docs，采纳不再适用的建议，compound effect 反转：bad learnings 让工作 *更难*，而不是更轻松。

## 解决方案

`ce-compound-refresh` 作为 structured review 运行，并给出五种 explicit outcomes：

- **Keep**：准确且有用；不编辑
- **Update**：references drifted，但 solution 仍正确；in-place 修复
- **Consolidate**：两篇 docs 高度 overlap；把 unique content 合并进 canonical doc，删除被 subsumed 的一篇
- **Replace**：旧 guidance 已误导；写 successor（用 subagent 隔离 context）并删除旧 doc
- **Delete**：code 已消失，problem domain 已消失，没有 substantive inbound citations；删除文件（git history 就是 archive）

Skill 先调查（Phase 1 用当前 codebase 读取每篇 doc），再执行 document-set analysis（Phase 1.75 捕获只有跨 docs 才可见的问题），然后 classify，最后 execute：通过 PR 或直接在当前 branch commit changes。

---

## 新颖之处

### 1. Five maintenance outcomes：explicit decisions，而不是模糊 "audit"

多数 "review the docs" prompts 会塌缩成 "is this still right?"，答案也很模糊。Five-outcome model 强制每篇 doc 做具体 decision 和具体 action：Keep 不做事，Update 做 in-place fixes，Consolidate 合并并删除，Replace 写 successor，Delete 移除文件。每个 outcome 都有自己的 evidence bar。

### 2. Two modes：Interactive default，`mode:autofix` 开启 Autofix

**Interactive**（default）对 ambiguous cases 一次问一个问题，并先给 recommendation。**Autofix** 在没有用户交互的情况下处理所有 docs，应用所有 unambiguous actions，并把 ambiguous cases 标为 stale（frontmatter 中加入 `status: stale`、`stale_reason`、`stale_date`），供之后 human review。Autofix report 有两个 sections：**Applied**（成功写入的内容）和 **Recommended**（无法应用的写入，例如 permission denied，带完整 rationale，方便 human 应用）。

### 3. Document-set analysis：捕获 per-doc review 看不到的问题

Phase 1.75 把 document set 作为整体评估：按五个 dimensions（problem statement、solution shape、referenced files、prevention rules、root cause）做 overlap detection、查找 supersession signals（newer canonical doc 吞并 older narrow precursor）、识别每个 topic cluster 的 canonical doc，并检查 cross-doc conflicts。两篇 docs 覆盖同一主题时，最终会 drift 并互相矛盾；这比一篇稍长的 single doc 更糟。

### 4. 通过 subagent 执行 Replace：context isolation

当 learning 的 core guidance 已经误导时，orchestrator 会分派 subagent 写 replacement（一次一个、顺序执行；replacements 可能需要读取大量 code，parallelism 会带来 context exhaustion 风险）。Subagent 接收 old learning、investigation evidence、target path 和 contract files（schema、category mapping、template），在不污染 orchestrator context 的情况下写出干净 successor。

### 5. Evidence 不足时标记 stale

当 drift 根本到 agent 无法自信记录当前 approach（整个 subsystem 被替换，new architecture 过于复杂，无法仅凭 file scan 理解）时，doc 会原地标记 `status: stale`，而不是错误 Replace。Recommendation：下次遇到该 area 且有新鲜 problem-solving context 时运行 `/ce-compound`。

### 6. Auto-delete safety：三个条件

Auto-delete 只有在 **三个条件全部为真** 时触发：

- Implementation 消失了（或被明显更好的 successor 完全 superseded，或 doc 明显 redundant）
- Problem domain 消失了：app 不再处理 learning 讨论的内容
- Inbound links 不存在，或明确只是 decorative

任何条件失败，包括其他 docs 的 substantive citations，skill 都会降级为 Replace、Update、Consolidate 或 stale-mark。**Auto-delete + decorative-citation cleanup 可以；substantive citations 或真实 ambiguity 会降级为 stale-marking。**

### 7. Inbound link classification：decorative vs substantive（入站链接分类）

删除 doc 前，skill 会搜索 repo markdown 中对该文件的 citations。每个 citation 会分类为：

- **Decorative**：principle 已在正文说明，citation 只是 "see also" pointer。Delete + cleanup 是 mechanical。
- **Substantive**：citing doc 依赖 cited doc 中未在正文说明的内容。Signal Replace；不要 delete。
- **Mixed/unclear（混合或不清楚）**：stale-mark。

Inbound links 会影响 classification，而不只是 cleanup：citations 会改写 action choice，不只是 post-delete fixup。

### 8. 让 docs 匹配 reality，而不是反过来

当 current code 与 learning 不同时，skill 会更新 learning，使其反映 current code。**它不会问用户 code change 是 "intentional" 还是 "a regression"**：那是 code-review question，不是 doc-maintenance question。Skill 的职责是 doc accuracy。如果用户认为 code 错了，那是此 workflow 之外的另一个 concern。

### 9. Delete, don't archive（删除，不归档）

Deleted docs 会被删除，而不是移动到 `_archived/`。Git history 保留每个 deleted file（`git log --diff-filter=D -- docs/solutions/`）。专门的 archive directory 会积累并污染 search results。如果过去已存在 `_archived/` directory，skill 会在 report 中标记 cleanup。

### 10. Discoverability check 也会延续

与 `ce-compound` 一样，每次 refresh 都检查 `AGENTS.md`/`CLAUDE.md` 是否暴露 `docs/solutions/`。每次都跑这个检查：knowledge 只有被 agents 找到才会 compound value。在 autofix mode 中，recommendation 会出现在 report 里，而不是被应用（autofix scope 是 doc maintenance，不是 project config）。

---

## 快速示例

你刚 merge 一个 refactor，重命名了 auth subsystem 中的多个 models。你调用 `/ce-compound-refresh auth`。

Skill 发现 5 篇 learnings 和 2 篇 pattern docs 与 `auth` 匹配（通过 directory、frontmatter、filename 或 content search）。Phase 0 将其路由为 focused scope。

Phase 1 调查每篇 doc。三篇引用了不再存在的 files（auth_token.rb -> session_token.rb）。一篇被更新的 doc 完全 superseded。一篇仍准确。一篇 pattern doc 概括的 rule 被 recent architectural change 打破。

Phase 1.75 暴露 overlap：两篇 learnings 从略不同角度覆盖同一个 authentication-error-handling problem。更新的一篇更宽、更准确。

Phase 2 分类：3 个 Updates（rename references），1 个 Consolidate（把较旧 auth-error doc 合并进较新的 doc 并删除旧 doc），1 个 Keep，1 个 Replace（pattern doc；旧 generalization 不再成立）。Replacement 分派给 subagent，它读取 contract files 并写 successor；orchestrator 删除旧 doc。

Phase 3（interactive mode）与用户确认 consolidation choice（canonical doc selection 并不总是显而易见）。其他 actions 直接应用。Phase 5 在当前 feature branch 上创建一个 separate commit，message 描述这次维护。

Report 列出每篇 doc、做了什么以及为什么。

---

## 何时使用

在以下情况使用 `ce-compound-refresh`：

- Significant refactor 或 rename 刚 landed，相关 area 的 learnings 很可能 drifted
- `ce-compound` 标记某篇 older doc 被 new learning superseded
- 你注意到 learnings 在没有周期性 review 的情况下累积
- `docs/solutions/` 中两篇 docs 看起来覆盖同一问题
- 想做周期性 hygiene sweep（例如 quarterly），保持 knowledge store 精简

以下情况跳过 `ce-compound-refresh`：

- 你还没注意到任何 drift；没有 evidence 的 broad sweeps 会制造 churn
- Docs 很新，且 codebase area 没动
- 仍在 debugging 或 build session 中；先用 `/ce-compound` capture，之后再 refresh

---

## 作为工作流的一部分使用

`ce-compound-refresh` 是 `/ce-compound` 的 maintenance counterpart：

- **由 `/ce-compound` 触发**：Phase 2.5 的 selective refresh check 在 new learning 暗示 older doc 可能 stale 时，传入 narrow scope hint
- **Manual periodic invocation**：通常带 scope（`/ce-compound-refresh auth`、`/ce-compound-refresh performance-issues`），避免没有 evidence 的 sweeping reviews
- **Pre-release hygiene**：major release 前 sweep `docs/solutions/`，确保 documented learnings 反映 shipping reality

这对 pairing 很重要：`ce-compound` 添加 new docs；`ce-compound-refresh` 保持 existing set lean。缺少后者，前者最终会制造 clutter。

---

## 单独使用

Skill 直接通过 scope hint 调用，用于缩小 review：

- **Specific file（指定文件）**：`/ce-compound-refresh plugin-versioning-requirements`
- **Module/component（模块 / 组件）**：`/ce-compound-refresh payments`
- **Category（类别）**：`/ce-compound-refresh performance-issues`
- **Pattern topic（模式主题）**：`/ce-compound-refresh critical-patterns`
- **Autofix mode**：`/ce-compound-refresh auth mode:autofix`（无用户交互；report 是 deliverable）
- **Broad sweep**（少见）：不带 scope 运行 `/ce-compound-refresh`，处理所有内容

没有 scope hint 时，skill 会 discover candidate set，做 broad-scope triage（按 module/component 分组，识别 highest-impact clusters），并在 deep investigation 前推荐 starting area。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | Broad sweep with triage；推荐 starting cluster |
| `<directory>` | 例如 `performance-issues`；按 category 缩小 |
| `<filename slug>` | 例如 `plugin-versioning-requirements`；按 file 缩小 |
| `<module/keyword>` | 例如 `auth`、`payments`；按 content/frontmatter 缩小 |
| `mode:autofix` | 附加到任意参数；无用户交互运行，应用所有 unambiguous actions，将 ambiguous 标为 stale |

---

## 常见问题（FAQ）

**Update 和 Replace 有什么区别？**
Update 修复 drift，同时保留 core solution（renamed file、moved class、broken link）。Replace 会重写 guidance，因为推荐 approach 已发生实质变化。边界是：如果你发现自己在重写 solution section，那就是 Replace，不是 Update。

**为什么 skill 不问 code changes 是否 intentional？**
Stay-in-your-lane discipline。Skill 的职责是 doc accuracy：让 doc 匹配 current code。Code change 是对是错属于 code-review concern；如果用户认为 code 错了，那是另一个 workflow。

**什么时候用 autofix mode？**
用于 periodic sweeps、scheduled maintenance runs，或 large-scope reviews；这些场景里为每个问题停下来询问不现实。Autofix 会把 ambiguous cases 标为 stale，而不是错误解决，因此 deliverable 是 human 可 review 的 self-contained report。

**如果 skill 想 delete 一篇我认为应保留的 doc 怎么办？**
Interactive mode 中，delete 前你会看到带 evidence 的 recommendation。拒绝后 doc 保留。Autofix mode 中 auto-delete safety conditions 很保守；substantive citations 会自动降级为 stale-marking。

**为什么 delete，而不是 archive？**
Archive folders 会积累并污染 search results，没人阅读，还会制造 "we'll come back to this" 的假象却没有实际行动。Git history 保留每个 deleted file。`git log --diff-filter=D -- docs/solutions/` 可以找到需要恢复的任何内容。

**它会区别处理 pattern docs 吗？**
会。Pattern docs 是 derived guidance，不是 incident-level learnings。Five outcomes 都适用，但 evidence 不同：Keep 表示 underlying learnings 仍支持规则；Replace 表示 synthesis 已误导，需要基于 refreshed learnings 形成不同 generalization。

---

## 另见（See Also）

- [`ce-compound`](./ce-compound.md) - 捕获 new learnings；此 skill 维护 existing set
- [`ce-plan`](./ce-plan.md) - 读取 `docs/solutions/` 作为 institutional memory；受益于 clean、current docs
- [`ce-ideate`](./ce-ideate.md) - grounding 时也查阅 `docs/solutions/`
- [`ce-doc-review`](./ce-doc-review.md) - 不同 skill：persona-based review 单篇 doc，而不是跨文档集维护
