# HTML Rendering（HTML 渲染）

这是一个 format-rendering reference；它描述如何将任何 artifact render 成 HTML，
不依赖具体由哪个 skill 产出。

它与 section contract（`plan-sections.md`、`brainstorm-sections.md` 等）配套，
后者描述 artifact 包含*什么*。本 reference 描述 HTML 具体*如何*呈现它。
由不同 skills render 的相同 content 共享同一套 HTML principles。

HTML artifact 是该 skill 在本次 run 中产出的*唯一* artifact；output mode 是 exclusive
的（markdown 或 HTML，永远不是两者同时）。当前读取 HTML 的 downstream consumers
（`ce-work`、human readers）会直接读取它；下方 agent-consumability rules 让这件事可行。
`ce-doc-review` 当前*不是* HTML consumer；它的 mutation mechanics 只支持 markdown，
所以 ce-plan handoff 会将 5.3.8 doc-review pass gate 到 `OUTPUT_FORMAT=md` runs，
并对 HTML 跳过。

## Hard Invariants（硬性不变量）

无论 artifact 由哪个 skill 产出，以下 invariants 都成立。

- **Single self-contained HTML5 file（单个自包含 HTML5 文件）。** 不要 companion `.css`、`.js` 或
  `.svg` files。CSS 放在 `<style>` 中。SVG inline。Images 使用 base64 data URIs
  或 inline SVG。唯一允许的 exception 是指向 CDN webfont CSS endpoint
  （Google Fonts、Bunny Fonts 等）的 `<link rel="stylesheet">`，并配套
  offline-readable fallback font stack，确保 CDN unreachable 时 doc 仍 readable。
- **所有 metadata 以 visible text 出现，且 single source of truth。**
  artifact 的 metadata（title、type、status、date 等；exact fields 由各 skill
  的 section contract 定义）render 为 downstream agents 和 humans 可读的 visible
  HTML elements。不要任何形式的 hidden machine-readable copy：不要
  `<script type="application/json">` frontmatter block，不要 `data-*` attribute
  mirror，也不要在 `<head>` 中用 `<meta name="status">` /
  `<meta name="created">` / `<meta name="origin">` 去重复 visible header
  中已有的相同 values。每个 value 只有一种 representation；这条规则防止的 failure
  就是两份 copy 之间 drift。

  `<time datetime="2026-05-12">2026-05-12</time>` 中的 text-and-attribute redundancy
  是 acceptable 的，因为 attribute 是 parser hint，不是 hidden copy。
- **Editable status render 为 `<span class="status">{value}</span>`。**
  Downstream tooling（下游工具，例如 `ce-work` shipping flip、future HTML-aware consumers）
  通过 selector 查找并 rewrite status。将 status value embed 到 header `<dl>` cell
  （`<dt>Status</dt><dd>active</dd>`）、`<meta>` tag，或没有 `class="status"`
  hook 的 visible text 中，都会 break flip mechanic；consumer 要么找不到 value，
  要么无法将它与 prose disambiguate。status span 可以位于 doc 任意位置（header
  metadata 内、stats strip 中、hero banner 中）；placement 是 visual choice，
  selector shape 才是 contract。
- **Stable IDs 同时作为 anchor IDs 和 visible text。** 每个带 ID 的 item
  （R-IDs、U-IDs、A-IDs、F-IDs、AE-IDs、KTDs）都在其 element 上有 `id="r1"`，
  并在 element 内以 visible text 出现（例如 table cell 或 heading 中的 "R1."）。
  Downstream agents 在 source 中查找 ID 的方式与在 markdown 中一样。
- **Source / composition signal（来源 / 组合信号）。** doc 底部的 visible footer 命名 composition
  timestamp 和 source identifier（user prompt context、存在时的 upstream brainstorm
  doc，或没有 external source 时的 composing skill name）。Example shape：
  `<footer class="composition-signal">Composed 2026-05-17T14:23Z by ce-plan from <code>docs/brainstorms/...-requirements.md</code></footer>`.
  在 exclusive output mode 下，这个 signal 就是 artifact 自己的 provenance；没有
  markdown sibling 可 reference。省略它会让 readers 无法判断 rendering 是否 stale。
- **ASCII identifiers。** Class names、element IDs、data attribute names 只用 ASCII。

## Style Preferences（样式偏好）的优先级栈

按以下顺序遵循 user style preferences（从高到低）：

1. **In-session conversation（本次会话）** — 用户在本次 run 中给出的 explicit direction。
2. **Preferred stylesheet reference（首选样式表 reference）** — loaded agent-instruction context 中命名的
   reference（通常是 `AGENTS.md` / `CLAUDE.md`，但应 scan loaded context；不要枚举
   locations）。reference 可以是 file path（`docs/style.css`）、URL、named library
   （"Tailwind"）或 style brand（"Stripe docs"）。Agent-instruction files 带有
   deliberate agent-aware preferences，所以这一层高于 DESIGN.md。
3. **DESIGN.md** — filesystem 中发现的 DESIGN.md（见下方 "DESIGN.md discovery"）。
4. **Fallback default（默认 fallback）** — 没有 preference 时，agent 自行选择的 opinionated palette /
   typography（排版）。

### Compose Time 的 Active Recall（compose 时主动回忆）

写 CSS 前，扫描 loaded context，寻找用户为这类 documents 指定的 stylesheet reference。
如果找到且可 inline（short local file、budget 内 fetchable URL），将它 inline 到
`<style>`。如果找到但不可 inline（large framework、paywalled stylesheet、没有
fetchable source 的 named system），就按其精神 compose CSS：从 named system
提取 typography（排版）、color（颜色）、density cues（密度线索）。只有在没有 preference signal 时，才回退
到 default style。

无论哪种情况，都必须保留 single-file invariant。External `<link rel="stylesheet">`
只允许用于 CDN webfont CSS（并带 offline fallback font stack）；永远不要 link 到承载
layout（布局）、color（颜色）或 typography rules（排版规则）的 external stylesheet，因为 doc offline 时无法读取。

### DESIGN.md Discovery（发现规则）

当 precedence stack 的 tier 3 适用时，在以下 locations 查找 DESIGN.md，first match wins：

1. Worktree root（通过 `git rev-parse --show-toplevel` resolve）。
2. `docs/DESIGN.md`.
3. `.compound-engineering/DESIGN.md`.

compose time 读取一次。Absent → fall through 到 fallback default。

仅限 worktree-root；不要 fall through 到 main checkout。使用 worktree 的用户如果想要
HTML defaults，可以将 DESIGN.md 添加到该 worktree。

**DESIGN.md 是 partial override，不是 all-or-nothing。** 真实 DESIGN.md files 差异很大：
有些是 token tables，有些是 CSS variables，有些是 prose；多数只覆盖 HTML composition
所需内容的 subset。应用适合 long-form text doc 的 tokens：typography roles（排版角色）、text colors（文本颜色）、
contrast targets（对比度目标）、border-radius scale（圆角尺度）、elevation primitives（层级/阴影 primitives）、muted-vs-accent split（弱化色与强调色的分工）。
跳过其余内容。要防御三个 specific failure modes：

- **Scope mismatch（product UI vs doc surface）。** 面向 product marketing 或 app UI 的
  DESIGN.md 可能命名 page-surface colors（页面表面色）、button states（按钮状态）、input borders（输入框边框）或 hero backgrounds（hero 背景）；
  这些 tied to *that* surface，而不是 generic doc。Page-surface colors 是典型陷阱：
  `--surface: #c0f0fb` 属于 product marketing page，不属于团队写的每个 plan 或
  requirements doc。当 token 是 product-UI-scoped 时，提取 principle（design language
  使用 tinted surface），而不是 literal value。只有 token 足够 generic 可 transfer 时
  才应用 literal values（text color、type scale ratio、radius scale、contrast ratio）。
- **Partial coverage。** 当 DESIGN.md 定义了一些 categories 但没有定义其他 categories
  （例如有 colors 但没有 spacing scale，有 typography 但没有 elevation）时，对它覆盖的部分
  使用 DESIGN.md，其余使用 fallback default。不要要求 DESIGN.md complete 后才 honor 它。
- **Named font without a fetchable source。** 当 DESIGN.md 命名 font（例如 "Signifier"、
  "Every"）但没有 CDN URL 或 local `@font-face` source 可 inline 时，将 name 视为 design
  intent 的 hint，而不是 literal directive。输出同 family 的 system-font stack（serif vs sans
  vs mono），并选择匹配 intent 的 weight。single-file invariant 仍然成立；不要 link 到 external
  stylesheet 来 fetch named font。
- **Typography-scale mismatch。** DESIGN.md typography tokens 常按 product UI 尺寸设定：
  marketing pages、app screens、hero sections，body text 为 18-20px、headings 为 32-52px。
  long-form doc surface 需要 body 约 14-16px，headings 约 body 的 1.2-1.6 倍。当 DESIGN.md
  size scale 看起来 product-scaled 时，使用 **family**、**weight** 和 **OpenType feature**
  assignments（这些承载 design language），并为 doc surface 选择 agent 自己的 **size scale**。
  只有当 tokens 明确 doc-scaled（body tokens 14-16px、headings 低于约 32px）时，才 literal
  应用 DESIGN.md sizes。

## Format Principles（格式原则）

这些原则塑造 "good" HTML 的样子；agent 根据 content 对每个 artifact 应用它们。

### 可读行长，而不是 Full Bleed（全宽铺满）

long-form text 在 full viewport width 下不可读；每行超过约 80 characters 后，眼睛会失去
回扫节奏，scanning 变慢。作为 fallback-default（precedence tier 4，可被 in-session
direction 或 DESIGN.md override），将 document 居中放入 content container，并将 prose
限制在 comfortable measure。

- **Page container（页面容器）。** 使用 max-width 约 820-960px 的 centered column
  （`margin-inline: auto`），让 doc 不贴到 wide monitors 的远边，同时给 format 的 richer
  shapes 留出空间。
- **Prose measure（正文行宽）。** 将 running paragraphs 控制在约 65-80 characters
  （text blocks 上 `max-width: ~70ch`）。named test：在 wide display 上以 full window width
  读一段 paragraph；如果回到下一行很费劲，measure 就太宽。
- **Let wide content break out（允许宽内容突破约束）。** Tables、diagrams 和 side-by-side columns 在 content
  需要时可以使用 full container width（或更宽）；measure constraint 针对 prose，不针对所有内容。

用 `ch`/`rem` 表达 constraint，而不是单一 hardcoded pixel value，这样它能 survive font-size
和 DESIGN.md overrides。DESIGN.md 或 in-session instruction 可以 override 这些 values；
这里是没有 layout preference 时的 fallback。

### Markdown Source 是内容，不是设计

当 markdown（或 markdown-shaped chat context）是 input 的一部分时，将它用于 semantic
content：doc 关于什么、有哪些 sections、每个 section establishes 哪些 facts。不要把其中
bullet-vs-table 的 presentation choices 视为 authoritative；应在 HTML 更丰富的 affordance
space 中按 content shape 重新选择 rendering。如果 markdown 将 13 个 requirements render
为 bulleted list，这并不意味着 HTML 必须 render 为 list；应问 13 个共享 `ID + body` shape
的 items 是否更适合 table。

### Prose 具有权威性

当 visualization（可视化）与 surrounding prose（周边正文）不一致时，以 prose 为准。如果两者 diverge，错的是
visualization（可视化）。

### 为 Reference Index 添加链接

当 doc 有 Sources & References（或 equivalent reference-index）section 时，将每个 entry
hyperlink 到其 canonical destination，让 readers 可直接打开。长长的 bare-text paths 和
ticket IDs list 是这个 format 最大的非必要 UX 缺陷；reader 必须将每个 entry copy-paste
到 browser 或 IDE。

compose time 解析一次 repo 的 GitHub URL：

```bash
git remote get-url origin
```

对三类 reference shapes 应用 linking：

- **Repo-relative code/doc paths（repo 相对 code/doc 路径）**（`services/foo.ts`、`docs/solutions/bar.md`）
  → `<repo-url>/blob/main/<path>`。
- **Named GitHub PRs/issues（命名的 GitHub PRs/issues）**（`PR #636`、`issue #1048`）→
  `<repo-url>/pull/636` 或 `<repo-url>/issues/1048`。
- **Named external trackers（命名的外部 trackers）**（Linear `ESP-1705`、Jira `PROJ-123`）→ 只有当
  workspace URL 已在 loaded context 中 established（例如 session 早些时候或 `AGENTS.md`
  中出现过 `linear.app/<workspace>/...` URL）时才 link；否则保留为 text。

**不要编造 URLs。** 如果 `origin` 不是 GitHub URL（GitLab、Bitbucket、internal host），
且 equivalent main-tree URL pattern 不明显，就将 entries 保留为 `<code>` text。如果 external
tracker workspace 未 established，保留为 text。broken 或 guessed link 比没有 link 更糟。

**Scope：仅 reference index，不包括 inline prose。** paragraph prose 内 inline `<code>`
mentions 的 paths 或 PRs 保持 code 或 text。为每个 mention 都加 link 会 clutter；readers
期待 clickable jumps 出现在 doc 自称为 reference index 的地方。

### Text Contrast 是局部要求（文字对比度是局部要求）

每个 text-on-background pairing 都必须 independently hold up。适合 page background 上
prose 的 color，不会自动适合 tinted container 内的小 label。最常见 violation：将 generic
"muted" text variable（为 prose-on-bg calibrated）用于 accent-soft / warn-soft /
info-soft container 内的 secondary text。

测试方法是在 rendered scale 下阅读每个 filled shape 的 labels。如果 subtitle 或 secondary
text 在 fill 上显得 washed-out，说明该 local context 的选择错误；选择与 fill 同 family 的
color（accent-soft 对应 accent-text 等），或完全 drop muting，改靠 font-size 和 weight
建立 hierarchy。

### Body Bold 默认不上色

将 accent text color 保留给 status chips、ID chips、links 和 section borders。默认不要给
body content 中的 `<strong>` 上色。Bold weight 已经承载 emphasis；在 long list 中给每个
`<strong>` 应用 accent color 会压垮视觉，尤其在 dark mode 中。CSS 应让 `strong` 保持
`color: inherit`，除非正在 styling specific surface（status pill、ID chip）。

### 不使用 JS Framework Runtimes（JS framework runtimes）

用于 active-section TOC tracking 或 anchor-permalink behavior 的 small inline `<script>`
是 acceptable 的。React、Vue、Svelte 或任何 framework runtime 不 acceptable。single-file
invariant 不允许 framework bundles，artifact 的 longevity 也不值得引入 build dependency。

## Section Anatomy（Section 结构）

section types 在 HTML 中通常如何 render。这些是 patterns，不是 contracts；agent 选择适合
content 的 shapes。

- **Summary / Problem Frame（摘要 / 问题框架）** — 带 prose paragraphs 的 semantic `<section>`。可选地
  在 title 上方加 eyebrow label（small-caps tag）以增加 editorial polish。
- **Requirements（需求）** — 5+ uniform items 时默认用 `<table>`；更少时用 bullets。
  Concern-grouping 优先于 flat-table default：当 requirements 跨 distinct concerns 时，
  先将它们 group 到 bold inline headers（或 per-group sections）下，再在每个 group *内部*
  应用 5+ table default，而不是将整个 section flatten 成一个 table。每行将 R-ID 作为
  visible text 放在自己的 column 中。当 ID-anchored items 在同一 doc 中有 downstream
  references 时，可考虑添加 "covered by" column 以支持 reverse traceability。
- **Implementation Units（实现单元）** — repeating `<article>` cards，包含 stable ID chip（visible
  "U1" text）、metadata strip（`<dl>`，含 Goal、Files、Dependencies 的 field labels 和
  values），以及放在 `<details>` collapsibles 中、**default-closed** 的 secondary content
  （Approach、Test Scenarios、Verification、Patterns to Follow）。当 units 达到 3+ 时，
  default-closed rule 是 load-bearing；如果所有 units fully expanded，doc 会变成一整段
  continuous scroll，reader 无法一眼看到 unit list。metadata strip 是 primary always-visible
  surface；subsection labels（`<summary>`）是 readers on demand expand 的 clickable
  affordances。一个没有 secondary content 的 single unit 可以完全跳过 `<details>`；当存在可隐藏
  content 时规则触发。`<dl>` strip 用于 *descriptive* fields（Goal、Files、Dependencies）。
  *directive* field（`Execution note` 是 canonical case，承载 implementer 必须 act on 的
  procedural instruction，例如 "start with a failing integration test"）不属于 strip；在 strip
  中它会 render 成像 date 一样的 passive pair，容易被 skimmed past。将它 render 成 advisory
  callout（见 Tinted callout cards），让 visual weight 匹配 actionability。测试：descriptive
  value -> metadata pair；reader 必须 act on 的内容 -> callout。
- **Key Technical Decisions（关键技术决策）** — repeating cards，包含 decision ID、bold decision title
  （常带 technical identifiers 的 inline code）和 prose rationale。使用 flat cards（不是
  collapsibles）；这些是 readers scan 的 reference material，不是 drill into 的内容。
- **Risks（风险）** — color-coded cards，带 status eyebrow（例如 "RISK · MITIGATED" /
  "OPEN · DEFERRED FOLLOW-UP"）和 prose body。left-border 或 accent 的 color 一眼传达 status。
- **Scope Boundaries（范围边界）** — 当 distinction 有意义时，用 color-coded left borders 的 callout cards
  表示 in-scope vs deferred vs outside。

agent 会根据每个 specific artifact 的 content needs 选择更 elaborate 或更 simple 的 shapes。

## Diagrams（图表）

当 section contract 要求 diagram（architecture、sequence、flowchart、state machine、swim
lane、data-flow、quantitative comparison）时，HTML 将其 render 为 **inline SVG**。agent
选择能最快 convey content 的 shape；不存在固定的 "approved" diagram types catalog。如果 content
是跨 categories 的 quantitative comparison，bar chart 就是正确 shape；如果是 component
relationships，则 topology diagram；如果是 participants 间的 process flow，则 swim lane，等等。

**Conceptual diagrams 不是 wireframes。** 下方 wireframe affordance 只 scoped 到关于
*visual products* 的 brainstorm requirements docs，并排除 non-visual systems。这个 exclusion
仅针对 wireframes；关于 data model、schema、agent workflow 或 migration 的 brainstorm 仍可使用
conceptual diagram（概念图；before/after field map、source-of-truth fan-out、state diagram）。
不要让 wireframe exclusion suppress content 本来 warrants 的 conceptual diagram。

**Diagrams complement prose；它们永远不 replace prose。** diagram 是放在它所 illustrate 的
prose 旁边的 accelerant，不是 substitute。IDed prose 保持 complete 和 standalone；忽略所有
diagrams 的 reader 仍能从 text 获得 full content，不 parse SVG geometry 的 text-reading downstream
agent 也不会遇到只存在于图片中的 relationship。这扩展了上方 prose-is-authoritative rule：prose
不仅在 disagreement 上 governs，也在 completeness 上 governs；添加 diagram 不代表可以 thin
它所描绘的 prose。

### Layout legibility for hand-authored SVG（手写 SVG 的布局可读性）

agent 在不 rendering 的情况下设计 SVG coordinates；source 中看起来没问题的 layouts 在实践中可能
collide。emitting 前，trace 每个 labeled arrow 和每个 text label：

- **No arrow path passes through a text label（箭头路径不要穿过文字 label）。** 如果 arrow line 或 curve 穿过 label 的
  bounding box，text 会读起来像 struck-through，arrow 也会像是 terminate 在错误 element。
  通过 re-routing arrow、moving label，或应用 `paint-order: stroke fill` 并使用匹配 diagram
  background 的 stroke color 给 label 加 halo 来修复。halo width 是 judgment call：要窄到不
  bleed into glyph strokes（halo width 接近 glyph 自身 stroke width 会 muddle text color），也要
  宽到能 mask underlying arrows（至少 arrow stroke width 加一条 hairline）。通过在 target font
  size 下 inspect rendered text 验证；如果 glyphs 看起来比 diagram 外同样 text 更粗或更偏 halo
  color，halo 就太宽。
- **Arrow labels sit adjacent to the arrow's midpoint（箭头 label 应贴近箭头中点）**（通常在它描述的 line 上方或旁边约
  10-15px 内）。如果 label 漂浮在 diagram edge，readers 必须 trace back 到 arrow，那就是 broken；
  readers 会 misread。
- **避免穿越整个 diagram 的 long curves（长曲线）** 来连接一侧 component 与另一侧 component。如果 A 和 D
  在 multi-component layout 中需要 labeled connection，优先 reorder boxes 让 A 和 D adjacent、
  在每个 participant 旁放 numbered step badges 并由 caption 连接，或使用 short labeled-channel
  notation；不要用一条 curve 穿过多个 unrelated elements。
- **先用 geometry（几何形状）区分 diagram shapes，再用 fill semantics（填充语义）。** Geometry（diamond = decision、
  rect = step、oval = start/end、parallelogram = data）能 unambiguously carry role。Fill
  semantics（highlighted path 用 accent-soft、fallthrough 用 warn-soft）carry meaning。
  Resist introducing additional neutral-tint tiers（例如用稍浅的 grey 标记 "decision shapes are
  different from boxes"）；当 geometry 已经 differentiates 时，额外 luminance tier 不增加
  information，还会制造 fragility：small RGB deltas 在 native browser rendering 中可保留，
  但可能被 dark-mode extensions、accessibility plugins 或 printing inconsistent 地 flatten 或 invert。

### Plan architecture diagrams are not directional sketches（plan 架构图不是方向性草图）

不要给 plan SVG diagrams 添加 hedging captions 或 section preambles；类似 "directional
guidance for review, not implementation specification" 的 phrases 不属于 plan diagrams，也不属于
unit-card technical-design subsections。Plan diagrams render 与 surrounding prose 相同的
authoritative content；prose-is-authoritative rule 已经 governs disagreement。Hedging language（保留性措辞）
保留给下方 wireframe affordance，因为 wireframe 明确 NOT a spec，所以带有 *required*
directional caption（方向性说明 caption）。

## Wireframe mockups（线框图，仅 requirements docs）

当 brainstorm requirements document 描述 user-facing visual surface（UI feature、screen
layout、screen flow、component placement）时，HTML rendering 可以包含 wireframe mockup。
这个 affordance 只适用于描述 visual products 的 brainstorm requirements docs；不适用于
plan artifacts，也不适用于关于 non-visual systems（API design、agent workflows、infrastructure）
的 brainstorms。

包含 wireframe 时：

- **Fidelity ceiling: wireframe, not mockup（保真度上限是线框图，不是 mockup）。** layout regions 使用 gray boxes，content
  placeholders 使用 text labels，并使用 intentional placeholder copy（`[Product name]`、
  `[CTA label]`、`[user avatar]`）。不要 pixel-perfect colors，不要 exact typography
  choices，不要 specific component-library references。wireframe 传达 spatial arrangement
  和 structure，不传达 visual style。
- **Static only（仅静态）。** layout 使用 inline SVG 或 simple HTML/CSS。不要 JS interaction，不要
  working form fields，不要 state changes，不要 live data。
- **Anti-padding（避免填充式 wireframe）。** 每个 distinct visual concept 一个 wireframe。
- **Mandatory directional caption（必需的方向性 caption）。** 每个 wireframe 旁边都带 explicit "directional, not
  the spec" note（明确说明“仅供方向参考，不是 spec”）。必需 wording（或 close paraphrase）：*"Directional only — illustrates
  the intended user-facing shape. Exact colors, spacing, copy, and component choices are
  placeholders for review, not requirements."*（中文含义：仅供方向参考，用来说明预期的用户可见形态；具体颜色、间距、文案和组件选择都是 review 用 placeholder，不是 requirements。）

没有这个 caption，wireframe 可能被读成 binding visual spec，而该 affordance 明确就是为了避免这种情况。

## Affordance idioms（affordance 惯用法）

当 content 受益时，agent 可使用的 common HTML affordances。这些是 examples，不是 requirements；
agent 选择每个 artifact content warrants 的 affordances。content 暗示的其他 affordances 即使未列出也可以。

- **Sticky TOC sidebar with active-section indicator（带当前 section 指示的 sticky TOC sidebar）** — 当 agent 判断 navigation 会 materially
  help 且 implementation reliable 时可用：desktop 上 two-column layout，mobile 上 collapse 到
  top-of-page，并配套 small inline `IntersectionObserver` script，切换 matching nav anchor 上的
  `.active`。Trade-off（权衡）：broken sticky TOC（layout collisions、active-section state drift、
  dark-mode CSS issues）比 static top-of-doc TOC 更糟。对多数 long docs，repeating cards 上的
  default-closed `<details>`（见 Implementation Units anatomy）已经足够减少 visible scroll
  length，让 static TOC 可用；只有 collapsibles alone 无法解决 navigation problem 时才使用 sticky。
- **Within-section sub-nav（section 内 sub-nav）** 用于包含 6+ repeating cards 的 sections（Implementation Units、
  KTDs、large count Risks）。section 顶部 render 一小段 card-anchor links list（`<ul>` 里的
  `<a href="#u1">U1. ...</a>`），给 readers 一个 jump table；无需 JS。对 long card sections
  这个 specific case，它是 sticky TOC 的 lower-complexity alternative。
- **Eyebrow labels（眉标 label）**（section titles 上方的 small-caps tag）用于 editorial polish，尤其当
  section titles 是 narrative 而不是 literal 时。
- **Stats strip（统计条）** 当 artifact 有 3+ 个值得一眼 surface 的 quantifiable signals 时，放在 doc 顶部。
- **`<details>` + `<summary>`** 用于 repeating cards 内 collapsible secondary content。
  所有 collapsibles 默认 closed；默认情况下，repeating cards 内任何 `<details>` 都不应出现
  `open` attribute（属性）。
- **Side-by-side columns（并排 columns）** 用于 parallel content（Request / Response、Before / After、
  Two alternatives，即两个备选方案）。
- **Tinted callout cards** 用于 "different in kind" 的 content（Deferred、Open Questions、
  advisory notes、unit-level execution notes）；color-coded left borders 一眼传达 kind。

## Agent-consumability rules（agent 可消费性规则）

当前读取 HTML 的 downstream agents（`ce-work`、future consumers）会将 HTML file 作为 text
linear 读取，而不是通过 DOM extraction。`ce-doc-review` 当前不是 HTML consumer（见开头 note）。
compose 时要让 semantic understanding 可从 source 中获得：

- **使用 semantic HTML，而不是 `<div>` soup。** 每个 unit card 用 `<article>`，metadata
  pairs 用 `<dl>`，tabular content 用 `<table>`，collapsibles 用 `<details>` /
  `<summary>`，top-level doc sections 用 `<section>`。Structure markers 会向 text-reading
  agent carry meaning（让 agent 可读到语义）。
- **将 field labels render 为 visible text，而不是 attributes。** emit
  `<dt>GOAL</dt><dd>...</dd>`，不要 `<dd data-field="goal">...</dd>`。label 是 semantic anchor。
- **U-IDs、R-IDs 和类似 IDs 保持 visible text**，出现在 headings 和 table cells 中，而不只作为
  `id=""` attributes。agent 在 source 中查找 "U1." 的方式与在 markdown 中一样。
- **section heading vocabulary 匹配 section contract 定义。** 当 section contract 写
  "Implementation Units" 时，HTML heading 就是 "Implementation Units"，不是 "How we'll build it"，
  即使 narrative version 更好读。Section heading vocabulary 是 downstream consumers grep 的 contract。
  （Editorial re-titles 可作为 eyebrow labels、sub-headings 或 visual framing 出现，但 load-bearing
  section heading 匹配 contract name。）
- **所有 semantic content 都位于 actual HTML text 中。** 不要用 CSS `::before { content: "..." }`
  carry meaning，不要把 background images 当 content，不要只在 render 后才存在的 semantic info。
  agent 在 source 中看到什么，它就知道什么。
- **Stable structure is the public API（稳定结构就是 public API）。** Element types、ID and label scheme、field-label
  vocabulary 不应跨 versions break。visual styling 可自由变化。

## Post-compose audit（compose 后审计）

return artifact 前，scan 以下 common slips（常见疏漏）：

- **Single self-contained file（单个自包含文件）。** 不要 companion `.css` / `.js` / `.svg`。
- **No hidden machine-readable metadata copy（不要隐藏的机器可读 metadata 副本）。** 不要 `<script type="application/json">`
  frontmatter block，不要 mirroring visible values 的 `data-*` attributes，**不要在 `<head>`
  中用 `<meta name="status">` / `<meta name="created">` / `<meta name="origin">` 等 duplicate
  visible header**。Metadata 位于 visible text；每个 value 一个 source of truth。
- **Status render 为 `<span class="status">{value}</span>`**，让 downstream tooling 可通过
  selector 将 `active → completed`。
- **All stable IDs（所有稳定 IDs）** 同时作为 `id=""` 和 visible text 出现。
- **Section heading vocabulary（section heading 词汇）** 匹配 section contract names（downstream agents 会 grep 这些）。
- **Source / composition signal** 作为 doc 底部 visible footer 存在（composition timestamp +
  source identifier，即来源标识）。
- **3+ instances 的 repeating cards 将 secondary content 放在 default-closed `<details>` 内。**
  在长 Implementation Units section 中 fully-expanded unit cards 是 failure mode；reader 无法一眼看到
  unit list。通过 skim rendered units 验证：每个 `<article>` 应 render 为 ID + title +
  metadata strip，下方是 collapsibles，而不是一个 long block。
- **Within-section sub-nav（section 内 sub-nav）** 对 6+ repeating cards 的 sections 存在。
- **Body `<strong>`** 不使用 accent palette 上色。
- repeating cards 内的 **`<details>`** 没有 `open` attribute。
- **Diagram labels（diagram label）** legible；没有 arrow paths crossing text，halo width 适合 font size。
- **Diagrams complement prose, not replace it（diagram 补充 prose，而不是替代 prose）。** diagram convey 的每个 relationship 也都存在于
  surrounding IDed prose 中；没有 content 只存在于 SVG。
- **No JS framework runtimes（不包含 JS framework runtime）** included。用于 active-section TOC tracking 或 anchor-permalink
  behavior 的 small inline `<script>` 是唯一 acceptable JS。
- **每个 heading level** 在视觉上与其他 heading levels 和 inline bold 区分开。
- **No template placeholders（无 template placeholders）**（`{skill}`、`<value>`、`[plan title]`）leaked into output。
- artifact 中 **No process exhaust** callouts。
