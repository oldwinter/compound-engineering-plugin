# Ideation Sections（Ideation 章节）

这是 ce-ideate artifact 的 section contract：它描述 persisted ideation document
包含*什么*，不依赖 output format。它与 format-rendering reference
（`references/markdown-rendering.md` 或 `references/html-rendering.md`）配套，
后者描述 resolved format 如何呈现这些 sections。同一份 content 可以渲染为任一格式；
差异只在 presentation。

在 save time 加载本文件，同时加载与 `OUTPUT_FORMAT` 匹配的 rendering reference
（见 `references/post-ideation-workflow.md` §4.1）。

## What the artifact contains（Artifact 包含什么）

Ideation artifact 是一个已排序、已批判的 candidate set，包含 candidates 被 qualification
时所依据的 grounding，以及被 cut 内容的记录。它是面向 human 的 discovery document，
不是 requirements doc 或 plan：保持聚焦于 ideas 及其 basis，而不是 implementation。

### Metadata（元数据）

- **date** — composition date (`YYYY-MM-DD`)。
- **topic** — kebab-case topic slug。
- **focus** — 提供 focus hint 时记录；open-ended 时省略。
- **mode** — `repo-grounded`、`elsewhere-software` 或 `elsewhere-non-software`。

Markdown 将 metadata 渲染为文件顶部的 YAML frontmatter。HTML 将它渲染为 visible header text
（遵循 html-rendering hard invariant：每个 value 只有一个 visible source of truth，
没有 hidden machine-readable copy）。

**no status field（没有 status field）：doc 上没有，per idea 也没有。** Ideation doc 是 point-in-time
discovery artifact，不是 tracked work item：它没有 `active → completed` lifecycle，
也没有 per-idea 的 "explored" marker。把 mutable workflow progress 放进 artifact 会制造
会 drift 的第二真源；某个 idea 后来是否被推进，可以从 downstream artifacts
（选中它的 brainstorm 或 plan）得知，所以不在这里重复。

### Grounding Context（Grounding 上下文）

Phase 1 grounding summary，也就是 ideas 被 qualification 时依据的内容。Repo mode 中 label 为
"Codebase Context"，elsewhere mode 中 label 为 "Topic Context"。

### Topic Axes（条件性）

Phase 1.5 产出的 3-5 个 axes，每行一个。当 Phase 1.5 被跳过时，用一行记录原因：
`Decomposition skipped — atomic subject` 或 `Decomposition skipped — surprise-me mode`。
不适用时整体省略该 section。

### Ranked Ideas（排序后的想法）

保留下来的 candidates，按排名呈现。每个 idea 包含：

- **title**
- **description** — 具体说明。
- **axis** — 该 idea 主要 targeting 的 topic axis；decomposition 被跳过时省略。
- **basis** — 标记为 `direct:`（quoted evidence）/ `external:`（named prior art）/
  `reasoned:`（写出来的 first-principles argument）。
- **rationale** — basis 如何连接到这个 move 的 significance。
- **downsides** — tradeoffs 或 costs。
- **confidence** — 0-100%。
- **complexity** — Low / Medium / High。

**Idea cards 保持展开；section 很长时添加 jump-list。** 不同于 plan Implementation Units，
ideation idea cards 的目的就是让读者完整阅读后选择方向：不要把它们的 substance 藏在默认关闭的
`<details>` 后面。但 Ranked Ideas section 通常有 5-7 张 cards，HTML 中会很长，因此按照
rendering reference 的 within-section sub-nav affordance，在 section 顶部添加 ranked titles
的 within-section jump-list（anchor links to each card）。

**Illustrative visuals：按 idea 的形状决定，而不是按 prose 是否清楚决定。** 放得好的 visual
可以让 human 在扫描 candidate set 时更快理解方向。逐个 survivor 判断：可以没有、少数几个有、
或大多数都有；没有 quota，也没有 cap。

做这个判断时要警惕一个陷阱：prose 总是必须能传达 idea（这是下方 hard rule），而作为 text-native
reasoner，你会倾向于读自己的 prose，觉得它 "clear"，然后推断不需要 visual。这会悄悄减少真正
能帮助读者的 visuals。因此，"prose 已经清楚" 永远不是跳过 visual 的理由。真正的问题是：
这个 idea *hinges on* 什么，以及它是否有一种图片比句子更快承载的 shape。

**Concrete-vs-abstract 是错误轴。** 不要因为 idea 看起来 big 或 conceptual 就添加 visual，
也不要因为它看起来 small 或 concrete 就跳过 visual。New-feature *concept* 常常最值得画：
读者需要想象一个不熟悉的 arrangement；而很多 concrete changes（error fix、drop-in dependency
swap）没有任何 structural content 可画。问 idea hinges on 什么，而不是它有多 abstract。

- **Hinges on a structure → 倾向 visual。** Parts 之间的关系、flow 或 sequence、before/after
  contrast、structural arrangement、analogy mapping（尤其是 cross-domain ideas）、
  quantitative comparison。即使 prose 完全清楚，图片也能更快落地；而且它应展示 *basis*
  或 *why-it-matters*，不是复述 title。New-feature concepts 经常在这里。
- **只有一个 point，没有 structural content → 不要 visual。** Rename、copy change、
  "handle the null case"、drop-in library swap：没有 diagram 能增加的 shape；画出来只是 decoration。
  Size 和 abstraction 不决定这件事：一个 sweeping concept 仍可能只是一个 proposition
  （"ship dark mode"），一个 small concrete fix 也可能重新路由两个 parts 的通信
  （真实 shape，值得画）。

Decoration 是 failure mode：visual 没有要展示的 shape，或只是复述 title。无论出现一次还是五次，
这都是 slop。真正展示 idea shape 的 visual 从来不是 slop，无论有多少 ideas 值得画。

添加 visual 时有两个约束：

- **保持在 idea 的 altitude：illustrative，不是 spec。** 这与 plan 或 requirements diagram
  *相反*。Shared rendering reference 将 plan diagrams 视为 authoritative content，并禁止
  "directional sketch" framing；ideation visuals 正好相反：它们是对一个尚未 commit 方向的
  deliberately directional overview。保持 conceptual（contrast、analogy、rough flow）。
  Detailed architecture、sequence diagrams 和 wireframes 应在选定方向后的 ce-brainstorm /
  ce-plan 中出现，不在这里。
- **Prose 必须独立成立。** 忽略 visual 的读者仍能得到完整 idea 及其 basis。Visual 加速理解；
  它永远不能承载 prose 中不存在的内容。

Rendering mechanics 遵循 rendering reference 的 Diagrams section：HTML 使用 inline SVG
并遵守 layout-legibility 和 halo rules；markdown 在 shape 适合时使用 fenced mermaid block。
但这里用上方 illustrative、decide-per-idea stance 覆盖该 section 中 plan-centric、
authoritative-diagram framing。

### Rejection Summary（拒绝摘要）

用 table 记录 considered-and-cut ideas，每个 idea 一行 reason。即使 recovery 后某个 axis 仍然
没有 survivors，也将它作为单独 row 记录，让 coverage gap 可见，而不是静默缺席。

## Markdown skeleton（Markdown 骨架）

这是两种格式都携带的 section shape。在 markdown 中按字面写出（仅在确实无关时省略字段）；
在 HTML 中，同样的 sections 按 `html-rendering.md` 渲染。

```markdown
---
date: YYYY-MM-DD
topic: <kebab-case-topic>
focus: <optional focus hint>
mode: <repo-grounded | elsewhere-software | elsewhere-non-software>
---

# Ideation: <Title>

## Grounding Context
[Grounding summary from Phase 1 — "Codebase Context" in repo mode, "Topic Context" in elsewhere mode]

## Topic Axes
[3-5 axes from Phase 1.5, one per line, OR a single `Decomposition skipped — ...` line. Omit the section if not applicable.]

## Ranked Ideas

### 1. <Idea Title>
**Description:** [Concrete explanation]
**Axis:** [Topic axis this idea targets — omit when decomposition was skipped]
**Basis:** [`direct:` / `external:` / `reasoned:` — quoted, cited, or written-out argument]
**Rationale:** [How the basis connects to the move's significance]
**Downsides:** [Tradeoffs or costs]
**Confidence:** [0-100%]
**Complexity:** [Low / Medium / High]

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | <Idea> | <Reason rejected> |

[When applicable, append axis-coverage gaps as their own rows so the gap is visible:]
| - | axis: <name> | recovery skipped (cap reached) — no survivors on this axis |
```

## No process exhaust（不写流程噪音）

不要把 engineering-process metadata 放进 artifact：不写 "captured at Phase X" notes，
不写 skill-pointer "next steps"，不写 italic provenance lines。读者要的是 ideas 及其 basis。
（HTML 按 html-rendering invariant 带有一个 visible composition-signal footer；这是唯一属于
doc 的 provenance element。）
