# Brainstorm Sections（Brainstorm 章节）

本 reference 描述什么构成优秀的 brainstorm requirements document。它**不**规定 doc 在页面上的视觉呈现；rendering 由 format-specific references（`markdown-rendering.md`、`html-rendering.md`）处理。

## The outcome（产出结果）

优秀 brainstorm 会产出一个让三类受众能够行动的 doc：

- **planning agent**（`ce-plan` 或人类）能产出 implementation plan，而不需要发明 user behavior、scope boundaries 或 success criteria；这些已由 brainstorm 回答。
- **reviewer** 能看到 framing choices，区分 pinned 与 open，并在 planning 前捕获 scope gaps。
- **future reader** 能追溯 proposed thing 为什么重要、为谁而做，以及成功是什么样子。

sections 必须服务上述某类受众才值得存在。省略 padding。

## Decide whether a doc is warranted at all（判断是否真的需要 doc）

Brainstorm dialogue 不一定总要产出 durable document。当**两个**条件同时成立时，跳过 document creation：

- 用户只需要 brief alignment；exploration 没有产出值得以 IDed shape 保存的 novel scope、framing 或 decisions。
- dialogue 中做出的任何 durable decisions 都能自然流向 downstream artifacts（`ce-plan`、commit message、`docs/solutions/`），不需要 brainstorm doc 作为中间层。

创建 doc 的 trigger 是：dialogue surface 了足够多 structural decisions、scope boundaries 或 acceptance criteria，使 downstream consumers（planner、reviewer、future reader）需要它们以 durable、IDed form 存在，而不只是 conversational artifacts。

**Stress test（压力测试）:** 关于 tiny bug fix 的 brainstorm 中，用户问 "fix this with a null check or with upstream validation?"，agent 确认 "upstream validation, here's why"，这不需要 brainstorm doc。decision 可流向 `ce-plan`（或直接到 commit message；如果是值得延续的 pattern，则到 `docs/solutions/`），中间无需 brainstorm artifact。

相反，一个关于 multi-actor feature、scope 有争议且有多个 behavioral conditions 的 brainstorm，可能确实需要 doc；planning agent 需要 dialogue 产出的 structured content。

## Match depth to content（让深度匹配内容）

当 doc 有必要时，depth 与 dialogue 产出匹配。内容 sparse 的 brainstorm 产出 sparse doc；内容 rich 的产出 rich doc。不要添加 ceremony 让 slim brainstorm 看起来 substantial。

## Hard floor（最低要求）

当 doc 有必要时，这些必须存在。

- **Summary** — 正在提议什么，用 1-3 行说明。Forward-looking。在读者投入细节前提供方向。
- **Requirements**（带 stable R-IDs）— 关于 proposed thing 必须为真的内容。对于非常 sparse 的 brainstorms（≤3 个简单 items，且 bullets 本身就是 summary），可接受无 IDs 的 plain bullets；R-IDs 的 trigger 是 downstream consumers 是否会引用它们。当 requirements 跨 distinct concerns（例如 "Packaging" / "Migration and compatibility" / "Contributor workflow"）时，在 Requirements section 内用 bold inline headers 分组；按 capability 或 concern 分组，不按 requirements 被讨论的顺序。触发条件是 distinct concerns，不是 item count；即使只有四个 requirements，如果覆盖三个不同 topics，也值得分组。只有当所有 requirements 真正关于同一件事时才跳过 grouping；长 flat list 是漏掉 subgroups 的信号。R-IDs 跨 groups 保持连续（第一组 R1、R2；第二组 R3、R4；绝不要每组从 R1 重新开始）。

## Include when material（有实质内容时包含）

agent 按每个 brainstorm 判断各 section 是否承载 elsewhere 未覆盖的信息。用 placeholder prose 填 section 比省略它更糟。

- **Problem Frame** — 当 motivation 无法仅从 Summary 看出时包含（*why* 需要 paragraphs，而不是一句话）。Backward-looking / situational。不要 restate proposal；remedy 位于 Summary。

- **Key Decisions** — 当 brainstorm 产出约束下方 Requirements / Flows / Scope 的 opinionated framing choices（defaults、scope narrowings、foundational technical picks）时包含。每个 entry 用 bold 命名 decision，并带 prose rationale。位于 rendered doc 较高位置，让读者在深入细节前先看到 framing choices。

- **Actors** — 当 proposed thing 有 multi-party behavior（多个 humans、agents 或 systems 有意义参与）时包含。对 non-behavioral brainstorms（naming briefs、data-shape briefs、pure research、decision frameworks）跳过。

- **Key Flows** — 当 proposed thing 有 multi-step behavior 时包含。对 behavioral brainstorms 默认期望存在，除非 proposed thing 真正 non-flow-shaped（pure API surface、policy、artifact output），且 Actors / Requirements / Scope Boundaries / Acceptance Examples 共同防止 downstream invention of paths。从 behavioral brainstorm 省略时，在 doc 中注明 reason。

- **Visualizations** — 当 brainstorm 包含 diagram-shaped concept，且图片比 prose 更快承载时，加入 diagram。常见 shapes：data-shape transformation（before/after schema 或 field mapping）、source-of-truth fan-out（一个 authority feeding many derived surfaces）、state-or-lifecycle logic、multi-step flow 或 quantitative comparison。diagram 是 cross-cutting，不是独立 section；它放在它所说明的 Key Decision、Requirements group 或 Flow 旁边。命名测试：*does the picture let a reader grasp the concept faster than the paragraph alone?* 如果是，添加；如果 prose 已能一眼传达，则跳过。每个 load-bearing concept 一个 diagram；不要为 ceremony 添加 visuals。此 affordance 是 conceptual-diagram path；它不同于 wireframe affordance（wireframe 用于 visual-product UI，不适用于 data models 或 agent workflows 这类 non-visual systems，但 conceptual diagram 适用）。

  **Diagrams complement prose; they never replace it.** diagram 是通向它所说明 prose 的 on-ramp，不是替代品。IDed prose（Requirements、Key Decisions、Acceptance Examples）保持 complete and standalone；忽略所有 diagrams 的读者仍能通过文本获得完整内容，按 linear text 读取 artifact 的 downstream agent 也不会只在 SVG 中看到某个关系。添加 before/after diagram 不意味着可以削薄它所描绘的 requirement 或 decision prose。

- **Acceptance Examples** — 当任一 requirement 有 state-dependent 或 conditional shape（"When X, Y"），且 prose alone 会让 edge cases 模糊时包含。**始终包含覆盖 behavioral-conditional requirements 的 AEs**；那里最容易受 ambiguity 影响。当所有 requirements 都 unconditional 且 unambiguous 时跳过。

- **Success Criteria** — 当存在 Requirements 尚未承载的 quality / metric / handoff signals 时包含：quantitative metrics（"p95 latency under 200ms"）、qualitative criteria（"the agent's output reads as one voice"）、process / handoff quality（"ce-doc-review can act on this without follow-ups"）。当 Requirements 本身就是 success criteria 时跳过（每个 R 都是 "done when the R is true"）。

- **Scope Boundaries** — 当 scope 有争议，或存在值得明确命名的 tempting non-goals 时包含。当 brainstorm 涉及将 product 定位在相邻产品之外（team 原本可构建但选择拒绝）时，拆成 "Deferred for later"（最终可能做，但不是 v1）和 "Outside this product's identity"（positioning decision）。否则单个 list 即可。

- **Dependencies / Assumptions** — 当存在 material upstream dependencies，或需要 surface load-bearing assumptions 时包含。

- **Outstanding Questions** — 当存在 unresolved items 时包含。区分 "Resolve Before Planning"（blocks planning）和 "Deferred to Planning"（在 planning 或 codebase exploration 中回答）。

- **Sources / Research** — surface 能引导 planner 或证明 framing choices 的 research。测试：*"if I were the planner reading this cold, would this breadcrumb help me make better choices?"* 是 → surface（code locations、external docs、RFCs、constraints、prior plans；此 category 是 inclusive，不是 enumerated）。Process exhaust（阅读用户 prompt、扫一眼 obvious files）→ 省略。

## Agent agency（agent 自主判断）

catalog 是 floor，不是 ceiling。当 brainstorm 的 content 不适合任何 catalog section 时，引入新 section；不要将内容强塞进不属于它的 section。Content drives section choices，而不是反过来。

agent 还会按 artifact 选择：

- Acceptance Examples 是渲染为 separate section，还是嵌入每个 requirement
- 每个 present section 获得多少 depth

（Requirements grouping 已在上方 Hard Floor item 中覆盖：默认按 concern 分组；只有当所有 requirements 都关于同一件事时才渲染 flat list，并且 R-IDs 跨 groups 连续。）

## Brainstorm metadata fields（Brainstorm 元数据字段）

每个 brainstorm 都携带一小组 downstream tooling 依赖的 stable metadata fields。该 contract 与格式无关：在 markdown 中，这些 fields 出现在文件顶部的 YAML frontmatter；在 HTML 中，它们作为 visible header text 出现（通常是 `<dt>`/`<dd>` pairs 组成的 `<dl>` 或 stats strip）。两个格式中的 field names 和 semantics 相同，因此 consumers 无需知道 brainstorm 由哪种格式产出，也能定位它们。

### Required（必填）

- **`date`** — ISO 8601 (`YYYY-MM-DD`) creation date，仅 ASCII digits。用于 filename（`docs/brainstorms/YYYY-MM-DD-<topic>-requirements.<md|html>`）。
- **`topic`** — 标识 brainstorm subject 的 kebab-case slug（例如 `surface-scope-earlier`、`demo-reel-local-save`）。与 `date` 一起用于 filename，并在 `ce-brainstorm` Phase 0.1 扫描 `docs/brainstorms/` 查找 existing artifact 以继续时作为 resume-detection key。

### Status flip does not apply to brainstorm（status flip 不适用于 brainstorm）

不同于 plans，brainstorm artifacts 没有 `status` field，也没有 `active → completed` lifecycle。brainstorm 是 one-time output，downstream consumers（`ce-plan`、`ce-doc-review`）通过 plan 的 `origin:` field 引用它。`html-rendering.md` 中描述的 `<span class="status">` HTML hook 是 plan-side mechanic，不会渲染在 brainstorm artifacts 上。

### Field-name stability（field name 稳定性）

Field names 跨 brainstorm revisions 稳定；绝不要 rename field 或 repurpose semantics。编写 new brainstorms 的 agents 必须使用这些精确 names；添加新 fields 可以，但将 `topic` 改名为 `subject` 或将 `date` 改名为 `created` 会破坏 filename construction 和 resume detection。

## ID and content rules（ID 与内容规则）

与 plan rules 同形。

- **Stable IDs.** R-IDs（Requirements）、A-IDs（如果 Actors 触发）、F-IDs（如果 Flows 触发）、AE-IDs（如果 Acceptance Examples 触发）。没有其他 ID namespaces。
- **Plain prefix.** 使用 `R1.`、`A1.`、`F1.`、`AE1.` 作为 bullet prefixes。不要 bold；prefix 本身已有视觉区分度。
- Flows 和 Acceptance Examples 内的 **Bold leader labels**（`**Trigger:**`、`**Covers R4, R8.**`）提供 structure，而不需要更深 heading levels。
- **Repo-relative paths.** 始终使用。绝不要 absolute paths。
- **No process exhaust.** 不写 "captured at Phase X" notes，不写指向 ce-plan 的 `## Next Steps`，不写 italic provenance lines。Engineering process metadata 属于 commit messages 和 tool output，不属于 artifact。
- **No implementation details by default.** 默认不包含 libraries、schemas、endpoints、file layouts、code structure，除非 brainstorm 本身 inherently about technical or architectural change，且这些 details 是 decision 的 subject。

## Discipline: Summary vs Problem Frame（Summary 与 Problem Frame 的纪律）

当两个 sections 都存在时，只有它们承担不同 purposes，才值得分成 separate sections：

| Section | Question it answers | Time direction | Length |
|---|---|---|---|
| `## Summary` | What is this doc proposing? | Forward-looking | 1-3 lines |
| `## Problem Frame` | Why does this proposal exist? | Backward-looking / situational | Paragraphs |

- **Summary 不需要 problem context。** 扫描 Summary 的读者能一眼得到 proposal。
- **Problem Frame 不 restate proposal。** 它建立 situation、specific moment of pain 和 cost shape，然后停止。remedy 位于 Summary；在 Problem Frame 中重述它，会造成让两个 sections 显得 redundant 的 duplication。

## Rendering（渲染）

format-specific references 描述如何在每种 output format 中渲染这些 sections：

- **Markdown rendering（Markdown 渲染）:** `references/markdown-rendering.md`
- **HTML rendering（HTML 渲染）:** `references/html-rendering.md`

本 reference（`brainstorm-sections.md`）说明 brainstorm 包含**什么**；rendering references 说明每种格式**如何**呈现它。brainstorm 基于 resolved output mode 写成一种格式：markdown 或 HTML，绝不两者同时存在。section catalog 与格式无关。
