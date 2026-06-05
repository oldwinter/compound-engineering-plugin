# Plan Sections（计划章节）

本 reference 描述什么构成优秀的 implementation plan。它**不**规定 plan 在页面上的视觉呈现；rendering 由 format-specific references（`markdown-rendering.md`、`html-rendering.md`）处理。

## The outcome（目标结果）

优秀 plan 让三类受众能够行动：

- **implementing agent**（`ce-work` 或人类）从 informed baseline 开始：load-bearing decisions 已命名，research breadcrumbs 能引导他们自己的调查，unit boundaries 清晰。plan 给 implementer 一个起点，不替代他们自己的调查。
- **reviewer** 能一次性识别 load-bearing decisions 以及正在变更内容的 boundaries。
- **future reader**（几个月后返回阅读的人）能追溯为什么做这项工作、它受什么塑造，以及 artifacts 位于何处。

sections 必须服务上述某类受众才值得存在。省略 padding。

## Decide whether a plan doc is warranted at all（判断是否需要计划文档）

并非每次调用 `ce-plan` 都应产出 plan document。对真正 atomic 的工作，doc 是 ceremony；implementer（无论是 `ce-work` 还是人类）可直接行动，不需要带 ID 的 units、KTDs 或作为 checklist 的 Requirements。

**Bias toward producing a plan（默认倾向于产出计划）。** 风险不对称倾向于写 plan：小工作上的 thin plan doc 只是轻微 ceremony，但在需要 plan 时跳过它，会让 implementer 付出真实时间成本（重新发明 decisions、丢失 unit boundaries、没有带 ID 的 requirements 可验证）。不确定时，写 plan。

**仅当以下条件全部成立时，才跳过 plan creation：**

- 工作是 **atomic**：适合一个 commit，且没有值得独立拆出的 meaningful unit boundaries。
- **没有约束 implementation 的 design choices**：没有值得记录的 Key Technical Decisions。如果工作需要 implementer 在两种 approaches 之间做选择，这些 approaches 就是 KTDs，plan 就有必要。
- **没有值得写下来的 scope boundaries**：work scope 从用户请求中已 self-evident。
- **没有 upstream artifact**（带 R-IDs 的 brainstorm、incident report、prior plan 中的 deferred-follow-up item）需要通过此 plan 保持 traceability。

**Stress test the "looks atomic" case（压力测试“看似 atomic”的情况）。** 许多请求乍看是 atomic，但隐藏 design decisions：

- *"Add caching to this endpoint"* — 听起来 atomic，但 TTL、invalidation、cache key shape 和 backend selection 都是 KTDs。写 plan。
- *"Migrate from package A to package B"* — 听起来 mechanical，但 packages 之间的 semantic differences 会产生 migration KTDs。写 plan。
- *"Add rate limiting"* — 听起来小，但 algorithm、scope 和 configurability 都是 KTDs。写 plan。

对比真正的 skip cases：

- *"Fix typo in README line 47"* — atomic、没有 KTDs，跳过 plan。
- *"Rename `oldFn` to `newFn` across the repo"* — mechanical、没有 design choices，跳过 plan。
- *"Bump dependency X to v2.3.1"* — mechanical，跳过 plan（除非 bump 引入 breaking changes，值得 unit-by-unit migration）。

跳过 plan doc 时，工作直接进入 `ce-work` 或 implementation；沿途产生的任何 decisions，如果值得延续，应落到 commit message 或 `docs/solutions/` 中。

## Hard floor（最低必备章节）

当 plan doc 有必要时，这些 sections 必须存在。它们承载 downstream consumers 依赖的 contracts。

- **Summary（摘要）** — plan 提议什么，用 1-3 行说明。Forward-looking；在读者投入细节前提供方向。
- **Problem Frame（问题框架）** — 为什么做这项工作。Backward-looking / situational。对 motivation 只有一句话的 compact plans，可与 Summary 合并。
- **Requirements（需求，带 stable R-IDs）** — work ships 后必须为真的内容。reviewer 的 checklist；downstream code review 根据它们验证。
- **Key Technical Decisions（关键技术决策，KTDs）** — 约束 implementation 的 load-bearing choices。每个 entry 是 `<decision>: <rationale>`。没有这些，implementer 无法判断哪些 design choices 仍开放、哪些已固定。
- **Implementation Units（实现单元，带 stable U-IDs）** — discrete units of work，大小应让每个 unit 可独立 land。`ce-work` 消费它们来执行。对 trivial single-step plans，工作可折叠进 Summary prose，且可省略 U-IDs；这很少见。

## Include when material（有实质内容时包含）

当这些 sections 承载 elsewhere 未覆盖的信息时才出现。测试标准不是“这是不是 substantial plan？”，而是 *"does this specific plan have content this section would surface?"* 用 placeholder prose 填 section 比省略它更糟。

- **High-Level Technical Design（高层技术设计）** — 当 technical approach 有 prose alone 不易承载的形状时包含：跨 components 的 architecture、跨 processes 的 sequencing、state machines、branching gates。Visualizations（component topology、sequence、swim lane、flowchart、data-flow）通常位于这里。当 approach 是一段 prose 自身就能表达的 pattern application 时跳过。

- **Scope Boundaries（范围边界）** — 当 scope 有争议、存在值得明确命名的 tempting non-goals，或需要区分 "deferred for later" 与 "outside the product's identity" 时包含。当仅凭 Requirements 就能看出 scope 时跳过。

- **Open Questions（开放问题）** — 当确有阻塞 planning 或 implementation 的 unresolved items 时包含。当 plan 完整时跳过；空的 "Open Questions: none" section 会传递 false uncertainty。

- **System-Wide Impact（系统级影响）** — 当 change 影响 cross-cutting concerns（data lifecycles、auth boundaries、performance posture、cardinal rules、shared infrastructure）时包含。对局限于单个 component、impact self-evident 的 changes 跳过。

- **Risks & Dependencies（风险与依赖）** — 当存在值得标记的真实 risks（external service changes、version pins under churn、值得强调的 behavioral assumptions）或 material upstream dependencies 时包含。对 low-risk localized work 跳过。

- **Acceptance Examples（验收示例）** — 当任何 requirement 有 state-dependent 或 conditional shape（"When X, Y"），且 prose alone 会让 edge cases 模糊时包含。当所有 requirements 都 unconditional 且 unambiguous 时跳过。

- **Documentation / Operational Notes（文档/运维备注）** — 当 documentation、monitoring、runbooks 或 rollout steps 需要明确 notes 时包含。当工作纯内部且使用未修改的 existing operational scaffolding 时跳过。

- **Sources / Research（来源/调研）** — surface 能引导 implementer 或证明 load-bearing choices 的 research。测试标准：*"if I were the implementer reading this cold, would this breadcrumb help me make better choices?"* 是 → surface（code locations 如 `services/convex/reports.ts:174-176`、external docs、RFCs、constraints、prior plans；此 category 是 inclusive，不是 enumerated）。Process exhaust（阅读用户 prompt、扫一眼 obvious entry points、复述 prose）→ 省略。可 inline 放在它所证明的 KTD 或 unit 旁，也可作为 dedicated section；两种形态都可以。

## Agent agency（Agent 自主权）

catalog 是 floor，不是 ceiling。当 plan 内容不适合任何 catalog section 时，引入新 section；不要将内容强塞进不属于它的 section。Content drives section choices，而不是反过来。

agent 还会按 artifact 选择：

- Problem Frame 是否合并进 Summary
- Sub-groupings（子分组：Requirements by capability、KTDs by component、Units phased into milestones）
- 每个 section 承载多少 detail
- HTD 是一个 diagram、多个 diagram 还是没有 diagram；以及 visualizations 位于 HTD 还是嵌入其他 sections

## Plan metadata fields（计划元数据字段）

每个 plan 都携带一小组 downstream tooling 依赖的 stable metadata fields。该 contract 与格式无关：在 markdown 中，这些 fields 出现在文件顶部的 YAML frontmatter；在 HTML 中，它们作为 visible header text 出现（通常是 `<dt>`/`<dd>` pairs 组成的 `<dl>` 或 stats strip）。两个格式中的 field names 和 semantics 相同，因此 consumers 无需知道 plan 由哪种格式产出，也能定位它们。

### Required（必填）

- **`title`** — verbatim plan title。匹配 H1（markdown）或 document `<h1>`（HTML），避免 file metadata 和 visible heading drift。
- **`type`** — conventional-commit-prefix-aligned classification（`feat`、`fix`、`refactor`、`chore`、`docs`、`perf`、`test` 等）。承载最终 commit message 应反映的 intent。
- **`status`** — 创建时为 `active`；`ce-work` 在 ship 时翻转为 `completed`。`ce-plan` 的 Phase 0.1 resume fast path 以 `active` 为 key。在 HTML 中，status 必须渲染为 `<span class="status">{value}</span>`，这样 flip mechanic 能通过 selector 定位并 rewrite 它（见 `references/html-rendering.md`）。
- **`date`** — ISO 8601 (`YYYY-MM-DD`) creation date，仅 ASCII digits。

### Optional but well-known（可选但约定俗成）

这些 fields 不是 required，但一旦设置，它们有固定 names 和 semantics，便于 downstream tooling 依赖：

- **`origin`** — 指向 upstream brainstorm requirements doc 的 repo-relative path（例如 `docs/brainstorms/2026-05-12-pagination-requirements.md`）。从 upstream brainstorm planning 时设置；用于 traceability，并在 `ce-plan` re-deepens 时重新 resolve。HITL Proof flow 使用 `origin` 追溯到 source brainstorm。
- **`deepened`** — ISO 8601 date，标记 confidence check 首次实质性强化 plan 的日期。存在与否会影响 Phase 0.1 resume fast-path logic（见 `references/deepening-workflow.md`）。

Field names 跨 plan revisions 稳定；绝不要 rename field 或 repurpose semantics。编写 new plans 的 agents 必须使用这些精确 names；添加新 fields 可以，但将 `status` 改名为 `state` 或将 `origin` 改名为 `source` 会破坏上方 downstream consumers。

## ID and content rules（ID 与内容规则）

无论 rendering format 如何，以下规则都适用。

- **Stable IDs（稳定 ID）。** R-IDs（Requirements）、U-IDs（Implementation Units）、A-IDs（如果 Actors 触发）、F-IDs（如果 Flows 触发）、AE-IDs（如果 Acceptance Examples 触发）。IDs 跨 plan revisions 稳定；绝不要为了 "clean up gaps" 而 renumber。
- **Plain prefix（普通前缀）。** 使用 `R1.`、`U1.` 作为 bullet prefixes。不要 bold；prefix 本身已有视觉区分度。
- **Repo-relative paths（repo 相对路径）。** 始终使用。plan content 中绝不要用 absolute paths；它们会破坏跨 machines、worktrees、teammates 的 portability。
- **No process exhaust（不记录过程废气）。** 不写 "captured at Phase X" notes，不写指向 next skill 的 `## Next Steps`，不写 italic provenance lines。Engineering process metadata 属于 commit messages 和 tool output，不属于 artifact。
- **当 Requirements 跨 distinct logical areas 时，按 concern 分组。** 触发条件是 distinct concerns，不是 item count；即使只有四个 requirements，如果覆盖三个不同 topics，也值得分组。只有当所有 requirements 真正关于同一件事时才跳过 grouping；长 flat list 是漏掉 subgroups 的信号。按 capability 分组（例如 "Packaging"、"Migration and compatibility"、"Contributor workflow"），不要按 requirements 被讨论的顺序分组。R-IDs 跨 groups 保持连续（第一组 R1、R2；第二组 R3、R4；绝不要每组从 R1 重新开始）。

## Rendering（渲染）

format-specific references 描述如何在每种 output format 中渲染这些 sections：

- **Markdown rendering（Markdown 渲染）：** `references/markdown-rendering.md`
- **HTML rendering（HTML 渲染）：** `references/html-rendering.md`

本 reference（`plan-sections.md`）说明 plan 包含**什么**；rendering references 说明每种格式**如何**呈现它。plan 基于 resolved output mode 写成一种格式：markdown 或 HTML，绝不两者同时存在。section catalog 与格式无关。
