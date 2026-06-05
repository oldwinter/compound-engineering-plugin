# Markdown Rendering（Markdown 渲染）

这是 format-rendering reference：它描述如何将任意 artifact 渲染为 markdown，与产出它的是哪个 skill 无关。

它与描述 artifact *包含什么*的 section contract（`plan-sections.md`、`brainstorm-sections.md` 等）配对。本 reference 描述 markdown 具体*如何*呈现它。由不同 skills 渲染的相同内容共享同一套 markdown principles。

## Hard invariants（硬性不变量）

无论 artifact 由哪个 skill 产出，以下规则都成立。

- **文件顶部有 YAML frontmatter。** 标准 `---` 分隔 block，包含 artifact 的 stable metadata（title、status、date、type 等；确切 fields 按 skill 而定，定义在 section contract 中）。可就地编辑；执行 status flips（`active → completed`）的 tools 和 agents 直接更新 YAML。
- **anchors 使用 ASCII identifiers。** Markdown headings 会从 heading text 自动生成 anchors。保持 headings 为 ASCII，让 anchors 可预测（`#implementation-units`，不是 `#implementación-units`）。
- **file references 使用 repo-relative paths。** 始终如此。绝不要使用 absolute paths；它们会破坏跨 machines、worktrees、teammates 的 portability。
- **不混入 HTML。** 保持 markdown 纯净。不要 `<div>`、不要 `<details>`、不要 inline `<style>`。如果 layout idea 只有 HTML 能实现，将其留给 HTML rendering。Markdown stays markdown。

## Format principles（格式原则）

这些原则塑造“好”markdown 的样子；agent 会根据 content shape 对每个 artifact 应用它们。

### ID prefix format（ID 前缀格式）

Stable IDs（R、U、A、F、AE、KTD）作为 plain prefixes 出现在 bullet 或 heading 开头；不要 bold prefix。prefix 本身已经有视觉区分度；bold 会增加 visual noise。

```markdown
- R1. The plan returns paginated sessions.   ← right
- **R1.** The plan returns paginated sessions.   ← wrong (bolded prefix)
```

unit headings 同理：`### U1. Cloak detection in preflight contract`。

### Content shape: prose vs bullets vs tables（内容形状：段落、列表和表格）

同一内容可用三种方式渲染；agent 按 content shape 选择，而不是按 template default。

- **Prose**：当内容有 narrative flow（motivation、decision rationale、problem framing）时使用。Bullets 会把叙事切成 disconnected pieces。
- **Bullets**：当 items 共享 parallel shape，但每项都有足够多 prose、不适合放入 table cell 时使用。
- **Tables**：当 5+ items 共享 uniform structure（`ID + body`、`name + value`、`decision + rationale`、`risk + mitigation`）时使用。在这个规模下，tables 扫描更快，并可解锁 bullets 无法清晰承载的 additional columns（status、traceability、severity）。

测试标准：读者用哪种形状最快扫描这段内容？如果 items 有 parallel structure 且有 5+ instances，用 table。如果 items 有 3-5 个且每个有几行 prose，用 bullets。如果内容是单一 narrative thought，用 prose。

### Bold leader labels within bullets（列表中的加粗引导标签）

当 bullet 有 substructure，且 named fields 有帮助时（Key Flows 中的 Trigger / Actors / Steps / Outcome，Acceptance Examples 中的 Covers / Given / When / Then），在 nested bullets 开头使用 bold leader labels；不要使用更深 heading levels。

```markdown
- F1. Anonymous capture
  - **Trigger:** Agent enters Step 2a with no session.
  - **Actors:** A1, A2
  - **Steps:** Preflight detects cloak; agent launches; capture proceeds.
  - **Covered by:** R1, R2, R5
```

这能提供 bullet structure，而无需使用会 clutter doc 并破坏 TOC generation 的 H4/H5 headings。

### Section separators（章节分隔）

对 substantial artifacts，在 top-level H2 sections 之间使用 horizontal rules（`---`）。对短文档省略，否则 separators 会喧宾夺主。

### Tables for genuinely comparative info only（表格只用于真正适合比较的信息）

仅对上方 "Content shape" 中的 uniform-shape 情况使用 tables。不要用 tables 渲染本质上是 bullets 的 content lists；markdown tables 在 raw form 中更嘈杂，对 diffs 也更糟。

## Section anatomy（章节结构）

section types 在 markdown 中的常见渲染方式。这些是 patterns，不是 contracts；agent 选择适合内容的形状。

- **Summary / Problem Frame（摘要 / 问题框架）** — prose paragraphs。
- **Requirements** — 带 `R<N>.` prefix 的 bullets。当 requirements 跨越多个 concerns 时，默认形状是在 bold inline headers 下分组，而不是 optional polish（按 capability 分组，不按 discussion order）；只有当每个 requirement 都关于同一件事时，才渲染为 flat list。当 requirements 有 status、traceability 或 severity，值得 additional columns 时，升级为 table。
- **Implementation Units** — 每个 unit 用带 `U<N>.` prefix 的 H3 heading。Fields（Goal、Files、Patterns、Test Scenarios、Verification）渲染为带 bold leader labels 的 bullets；如果 field 有 multi-paragraph content，则可作为 sub-headings。
- **Key Technical Decisions** — 使用 bold decision name + prose rationale 的 bullets；当 traceability 重要时，使用 numbered KTD-N pattern。
- **Key Flows / Acceptance Examples** — 使用带 bold leader labels 的 bullets（Trigger / Actors / Steps / Outcome / Covers / Given-When-Then）。
- **Scope Boundaries** — bullets；当 positioning distinction 重要时，可拆成 "Deferred for later" / "Outside this product's identity" sub-headings。

agent 会根据每个 specific artifact 的内容需要，选择更 elaborate 或更 simple 的 shapes。

## Diagrams（图表）

当 section contract 要求 diagram（architecture、sequence、flowchart、state machine、swim lane、data-flow）时，markdown 将其渲染为 fenced mermaid block：

```markdown
` ``mermaid
flowchart TB
  A[Start] --> B{Decision}
  B -->|yes| C[Action]
  B -->|no| D[Other action]
` ``
```

（`TB` direction default；让 diagrams 在 source view 和 narrow rendered viewports 中保持较窄。）

Markdown 的 diagram affordances 相比 HTML 有限。对 quantitative comparisons（bar charts、scatter plots），markdown 没有 native equivalent；使用包含数据的 table，并让 prose 或 caption 承载 interpretation。更丰富的 visualization 发生在 HTML rendering 中。

## Inline code and code blocks（行内代码和代码块）

- **Inline code** 用于 identifiers（variable names、function names、flag names、file paths、不是 section anchors 的 IDs）。
- **Fenced code blocks** 带 language tag，用于 code、shell commands、API request/response samples。始终指定 language，以支持 syntax highlighting 和 accessibility。

```markdown
The flag `--cdp-url` accepts a URL.

` ``bash
browser-use --cdp-url http://localhost:9222
` ``
```

## No process exhaust（不记录过程废气）

Engineering process metadata 不进入 artifact：

- 不写 "captured at Phase X" notes
- 不写指向 next skill 的 `## Next Steps`
- 不写 italic provenance lines（"*Brainstorm completed 2026-05-13*"）
- 不写 engineering-flow shepherding（"Now read this file:"、"Next, run that command:"）

这些信息属于 commit messages、tool output 和 agent transcripts；不属于读者几周后返回查看的 artifact。

## Frontmatter shape（Frontmatter 形状）

Per-skill frontmatter fields 定义在各 skill 的 section contract 中（`plan-sections.md` 列出 plan frontmatter；`brainstorm-sections.md` 列出 brainstorm frontmatter）。通用规则：

- YAML 位于文件顶部，上下用独立一行的 `---` 分隔。
- Field names 使用 lowercase snake_case（`status`、`created_at`，不是 `Status`、`CreatedAt`）。
- **Status lifecycle 按 contract 而定。** 当 section contract 定义带 lifecycle 的 `status` field 时（plans 使用 `active → completed`，由 ce-work 在 shipping time 通过 direct YAML edit 翻转），可就地编辑。当 section contract 未定义 status lifecycle 时（例如 brainstorms 没有 `active → completed` flip；它们位于 plans 上游，并通过 plan 的 `origin:` 引用），不要引入 lifecycle。
- 跨 artifact revisions 保持稳定；绝不要 rename 或 repurpose field。

## Post-write audit（写入后审计）

宣称 markdown file 已写入前，扫描这些常见 slips：

- 所有 stable IDs 都是 plain-prefix format，未 bold。
- 没有混入 HTML elements。
- 所有 file paths 都是 repo-relative。
- H2 之间有 horizontal rule separators（用于 Standard / Deep artifacts）。
- 没有 process exhaust（Phase X notes、Next Steps pointers、provenance lines）。
- 只有 5+ uniform-shape items 足以证明需要 table 时才使用 tables。
- Frontmatter 包含所有 per-skill required fields，且值合理。
