---
title: 为 ce-plan 和 ce-brainstorm 添加 output:html mode
type: feat
status: active
date: 2026-05-11
---

# 为 ce-plan 和 ce-brainstorm 添加 output:html mode

## 摘要

为 `ce-plan` 和 `ce-brainstorm` 添加 `output:html` / `output:md` argument（默认 `md`），使用户 opt in 时，它们在 markdown 旁边输出一个 single self-contained HTML rendering。Defaults 来自 `.compound-engineering/config.local.yaml`。HTML composition 由 agent 基于一小组 content-shape questions 和 minimal opinionated fallback style 驱动；不使用 hardcoded template grammar。可选 `DESIGN.md` taste hook 允许每个 repo 覆盖 style。

---

## 问题框架

长 plans 和 requirements docs 经常越过 Markdown rendering 会伤害 readability 和 shareability 的阈值。Thariq Shihipar 的 HTML-effectiveness essay 清楚阐释了这一点，最近两个 ce-plan PR（#765、#766）也正好为 markdown Implementation Units template 中的这种痛点发布了 fixes。Plugin 当前没有方式为 review、sharing 和 consumption 产生更丰富的 document surface。社区 PR（#809）尝试过添加此能力，并提供了有用输入可供借鉴；但我们想要的设计是一层更小、更少 prescriptive 的 layer，让 agent 按 artifact 表达 HTML affordances，而不是锁死单一 visual grammar。

---

## 需求

- R1. `output:html` 和 `output:md` 被 `ce-plan` 与 `ce-brainstorm` 接受为 arguments，并使用已用于 `mode:` 的相同 literal-prefix-strip convention 解析。
- R2. Default output format 从 `.compound-engineering/config.local.yaml` 读取（新增 optional keys `plan_output` 和 `brainstorm_output`）；CLI argument 覆盖 config；built-in default 为 `md`。Missing 或 invalid config silent fallthrough。
- R3. 当 `output:html` 时，skill 写入 BOTH markdown file（如今日）AND parallel path 下的 single self-contained HTML file（`-plan.html` / `-requirements.html`）。
- R4. HTML file 完全 self-contained：inline CSS、inline SVG、inline images。无 companion `.css` / `.js` / `.svg` files。仅当有完整 offline-readable fallback font stack 时，允许 CDN webfonts。
- R5. Default styling 要 opinionated、neutral 且 delightful：针对 HTML affordances（tables、callouts、diagrams、light interactivity）实现真实 readability，且不臃肿。Agent 根据 content-shape questions 选择 affordances，而不是固定 template。
- R6. Agent 按以下 precedence order honor user style preferences：(1) in-session conversation，(2) loaded agent-instruction context 中用户提到的任何 preferred stylesheet reference（file path、URL、named library 或 style brand，通常在 AGENTS.md / CLAUDE.md；agent 扫描 loaded context，不枚举位置），(3) repo 的 `DESIGN.md`（worktree root、`docs/DESIGN.md`、`.compound-engineering/DESIGN.md`；first match wins），(4) skill fallback default。可 inline 的 stylesheets inline 到 `<style>`；不可 inline 的 references 以精神和风格指导 CSS。无论哪种 source wins，都保持 single-file invariant。
- R7. Frontmatter 在 HTML 中保留为 `<script type="application/json">` block（对 `</script>` injection 做 safe escaping），使 downstream consumers 可 round-trip。
- R8. R-IDs 和 U-IDs（以及 ce-brainstorm 中等价的 A/F/AE IDs）在 HTML 中保留为 stable anchor IDs，确保 requirements traceability 经 format change 后仍存在。
- R9. Pipeline mode（LFG 和任何 `disable-model-invocation` context）强制 `output:md`，无视 config，因此 ce-work 始终有 markdown input。
- R10. HTML composition 在 ce-doc-review 的 `safe_auto` fixes 已应用到 `.md` 之后执行，因此首次 HTML emission 已反映 autofixes。在单次 skill run 中，只要 `.md` 被 mutate（deepen、doc-review、HITL Proof resync），HTML 就 re-render。
- R11. Headless 和 interactive modes 在设置后都 honor `output:html`；headless mode 与今日一样跳过 post-generation menu。
- R12. 当选择 `output:html` 时，post-generation menu 提供 "Open in browser" option 来替换 "Open in Proof"（mutual exclusion 让 menu 保持在 option cap 内）。`/ce-work`（ce-plan）和 `/ce-plan`（ce-brainstorm）仍是 recommended option；HTML 被视作更丰富的 review/share surface，而不是 review gate。
- R13. Tests 只 assert invariants：HTML5 doctype、single-file（除 optional fonts 外无 external resources）、frontmatter JSON round-trip、anchor ID preservation。不做 styling assertions，不做 snapshot tests。
- R14. HTML-rendering reference content 在 `ce-plan/references/` 和 `ce-brainstorm/references/` 之间 byte-for-byte duplicated，并由现有 `tests/compound-support-files.test.ts` pattern enforce。不新增 `_shared/` directory。

---

## 范围边界

- v1 只覆盖 `ce-plan` 和 `ce-brainstorm`。不为 `ce-code-review`、`ce-product-pulse`、`ce-doc-review`、`ce-sessions`、`ce-compound`、`ce-debug`、`ce-strategy`、`ce-ideate` 或其他 document-producing skills 添加 HTML support。
- 不教 `ce-work`（或任何其他 consumer skill）读取 HTML；markdown 仍是 workflow input format。HTML 是 markdown 的 projection。
- 不做 two-way interactivity（source essay 中提到的 sliders、copy-back-to-Claude buttons）- v1 是 static HTML。
- 不做 upload-to-S3 或 shareable-link generation。
- 不提供 locked anchor-ID glossary、pill-class scheme、250+ 行 hardcoded CSS theme 或 fixed SVG diagram primitives；agent 选择 affordances。
- 不在 artifact 中加入 "Implementation Note: re-run without --html" callout（process exhaust）。
- 不新增 `_shared/` directory 或其他 cross-skill shared-content mechanism；适用 plugin documented duplicate-per-skill rule。
- 不修改 CLI converter；`argument-hint` 通过现有 converter logic 原样传播。

### 推迟到后续工作

- `ce-code-review` 和 `ce-product-pulse` 的 HTML output：可能是高价值 next candidates；等本功能落地并测量 uptake 后再 revisit。
- 让 `ce-work` 直接 consume HTML plans（需要解析 HTML structure 中的 sections、U-IDs 和 frontmatter；即使有 agent-consumability rules，仍然是 significant lift，因为它会改变 ce-work 的 discovery glob 和 resume logic）。
- 小型 ce-work adjustment：如果用户明确给 ce-work 一个 `.html` plan path，ce-work 检测同路径的 `.md` sibling 并改读它，同时说明 redirect。Glob behavior 仍保持 markdown-only；这只处理用户复制浏览器中 HTML path 时的自然困惑。可作为 ce-work Phase 0.1 detection 的一段补充，因当前 scope 保证 HTML emitted 时始终存在 `.md` sibling（R3），所以可 deferred。
- 针对自动以 `output:` 调用 `ce-plan` / `ce-brainstorm` 的 callsites 的 behavior contract tests（仅当 orchestration 开始关心 output format 后 relevant）。
- 在 `ce-setup` 中添加 health-check warning，提示 unknown sibling keys（例如 `plan-output` vs `plan_output`）- 这是 generic key-typo detection，不专属于本 feature。

---

## 上下文与调研

### 相关代码与模式

- `plugins/compound-engineering/skills/ce-plan/SKILL.md` - Phase 5.2 write step（lines 543-559）、filename convention（lines 328-332）、post-generation menu（lines 613-628）。
- `plugins/compound-engineering/skills/ce-plan/references/plan-template.md` - frontmatter shape（lines 10-17）、section order。
- `plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md` - Phase 5.3.8 / 5.4 routing 和 menu rendering rules。
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md` - Phase 3 write step（line 226-230）、Phase 4 handoff（line 234）。
- `plugins/compound-engineering/skills/ce-brainstorm/references/requirements-capture.md` - write mechanics（lines 51-179, 231）、frontmatter（lines 55-59）、Actors/Flows/Acceptance Examples sections。
- `plugins/compound-engineering/skills/ce-brainstorm/references/handoff.md` - menu shape（lines 46-95）、4-vs-5-option rendering rule（lines 9-14）。
- `plugins/compound-engineering/skills/ce-doc-review/SKILL.md:18-20` - 需要 mirror 的 canonical `mode:` token-parsing prose。
- `plugins/compound-engineering/skills/ce-compound/SKILL.md:28` - 第二个 `mode:` parsing example，mode-table 位于 lines 30-33。
- `plugins/compound-engineering/skills/ce-work-beta/SKILL.md:46` - canonical `!`backtick config-read pre-resolution pattern，带 `__NO_CONFIG__` sentinel。
- `plugins/compound-engineering/skills/ce-product-pulse/SKILL.md:55-59` - pre-resolution 后的 config-key consumption pattern。
- `plugins/compound-engineering/skills/ce-setup/references/config-template.yaml` - flat `key: value` style，现有 `pulse_*` 和 `work_delegate_*` keys 可作 namespaced flat keys precedent。
- `plugins/compound-engineering/skills/ce-setup/SKILL.md:81-104` - `config-template.yaml` 如何被复制到 `config.local.example.yaml`（always refreshed）并 conditional 复制到 `config.local.yaml`。
- `plugins/compound-engineering/skills/ce-compound/` 和 `ce-compound-refresh/` - 两个 skills 间 byte-for-byte duplicated reference content 的 precedent，由 `tests/compound-support-files.test.ts:7-31` enforce。

### 组织内 learnings

- `docs/solutions/skill-design/post-menu-routing-belongs-inline.md` - always-fire options 的 per-mode routing 属于 SKILL.md inline，而不是 deferred 到 reference。适用于这里：`output:` resolution + write-branch dispatch 每次 invocation 都 load-bearing，必须 inline；HTML composition guidance（conditional、late-sequence）可放在 backtick-loaded reference。
- `docs/solutions/skill-design/script-first-skill-architecture.md` - 这里 **不适用**。"do not apply when the skill's core value is the model's judgment" exception 成立。该 feature 的重点是模型按 artifact 判断 content shape 与 affordance fit；deterministic HTML rendering 会违背目标。下方作为 rejected alternative 记录。
- `docs/solutions/best-practices/conditional-visual-aids-in-generated-documents.md` - 使用 content-pattern triggers，而不是 size/depth gates。Prose-is-authoritative invariant（Markdown 是 source of truth；HTML 是 projection）。
- `docs/solutions/integrations/colon-namespaced-names-break-windows-paths.md` - 如果任何 filename component 来自 user content（例如 titles 含 colons），通过 `src/utils/files.ts` 中的 `sanitizePathName()`。我们的 HTML filenames 镜像现有 markdown filenames，因此没有新增 sanitization surface，但值得注意。
- `plugins/compound-engineering/AGENTS.md` "Reading Config Files from Skills" - 使用 `git rev-parse --show-toplevel`；`__NO_CONFIG__` sentinel；worktree config 是 per-worktree（不 fall-through 到 main checkout）。DESIGN.md 遵循同一规则。
- `plugins/compound-engineering/AGENTS.md` "Reference File Inclusion" - 默认使用 backtick path；`@`-inline 只用于约 150 行以下且 always needed 的 files。HTML-output reference 很可能超过 150 行（CSS + content-shape questions + invariants），因此 backtick path 正确。
- `plugins/compound-engineering/AGENTS.md` "Runtime vs Authoring Context" - 两个 skills 必须 duplicate 各自 HTML reference；plugin 的 `AGENTS.md` 在 runtime 不可见。
- User memory `feedback_headless_argument_hint.md` - 为人类 discoverability，`output:html` 应放入 `argument-hint`，而不仅是 model auto-invocation。
- User memory `feedback_no_external_plugin_references.md` - 不要在 plan body、commit messages 或 PR description 中引用其他 plugins 或 PR #809。
- User memory `feedback_hr_separators.md` - 在 dense generated docs 的 top-level sections 之间使用 `---`（该 plan 已全程应用）。

### 外部参考

- Thariq Shihipar, "Using Claude Code: The Unreasonable Effectiveness of HTML" - 激发该 feature 的 source thinking。Agent-judgment-per-artifact approach with minimal prescription 直接来自此 essay；companion page（`thariqs.github.io/html-effectiveness`）上的多样 treatment 是 operational goal。

---

## 关键技术决策

- **Agent-driven HTML composition, not script-driven.** 理由：该 skill 的核心价值在于按 artifact 判断哪些 HTML affordances 适合当前 content（tabular、sequential、branching、interactive 等）。deterministic transformer 会产生 uniform output，违背 feature 目标。Reference content 给 agent 一小组 content-shape questions 和 opinionated fallback style；agent 按 artifact composition。
- **Token-parsing convention: literal-prefix-only.** 只有 `output:` 和 `mode:`（以及适用时的 `delegate:`）prefixes 被作为 flags consume；其他 `<word>:<word>` tokens，包括可能出现在 feature description 中的 conventional commit prefixes（如 `feat:`、`fix:`、`chore:`），都原样 pass through。Skill prose 中显式说明，避免 implementer 泛化成 "any `key:value` token"。
- **Precedence: CLI arg > config > built-in default (`md`).** 镜像既有 convention。Unknown values（例如 `output:pdf`）drop token，并在 post-generation menu 上方 emit 一行 note；case-insensitive matching（`output:HTML` -> `html`），bare `output:` 是 no-op。用轻微 chat noise 换取非 silent failure。
- **Pipeline mode forces `md`.** 从 LFG 或任何 `disable-model-invocation` context 调用时，skill 忽略 CLI 和 config `output:` preference，只写 markdown。ce-work consume markdown；pipeline runs 中 emit orphan HTML 只是成本。
- **HTML composes AFTER ce-doc-review's `safe_auto` fixes land on `.md`, never before.** 在单次 run 中，只要 `.md` 被 mutate（deepen、doc-review、HITL Proof resync），HTML 就 re-render。这避免用户 review pre-fix HTML，而 markdown 已被修正。
- **Worktree-root only for config and DESIGN.md.** 使用 `git rev-parse --show-toplevel`。不 fall-through 到 main checkout（AGENTS.md 规则说明为何 `git-common-dir` derivation 对 Claude Code shell-safety check 不友好）。使用 worktrees 的用户若希望 HTML defaults，可在对应 worktree 添加 config 和 DESIGN.md。
- **Per-skill duplicate, not `_shared/`.** Reference content 在 `ce-plan/references/html-output.md` 和 `ce-brainstorm/references/html-output.md` 之间 byte-for-byte duplicated。通过扩展 `tests/compound-support-files.test.ts` enforce。Plugin 的 documented cross-skill rule 禁止 shared mechanisms；该决策遵守该规则。
- **Reference inclusion via backtick path, not `@`-inline.** HTML-output reference 会超过 150 行（fallback CSS + content-shape questions + invariants + DESIGN.md handling）。Backtick path 是该大小文件的 documented default，并降低 SKILL.md tokens。
- **Frontmatter preserved as `<script type="application/json">`.** 在 JSON payload 中将 `<` escape 为 `&lt;`（HTML entity），防止任何 frontmatter value 含 literal substring `</script>` 时 injection。Values 转为 JSON-native types（`date: 2026-05-11` 成为 string，而不是 Date）。Reference 中记录为 transform rule。
- **Sequence number `NNN` counts `.md` files only.** `.html` files 镜像 `.md` 获得的 `NNN`。否则同一天 re-run 可能 double-count。
- **HTML committed by default.** 偏好 ephemeral HTML 的用户可将 `docs/plans/*.html` 和 `docs/brainstorms/*.html` 加入 `.gitignore`；在 skill Phase 5.2 note 中标记为 opt-out。HTML 小且 self-contained，因此 diffs 可作为 rendered artifacts review。
- **Defer to user-stated preferences via active-recall, not re-reading agent-instruction files.** Agent-instruction files（CLAUDE.md / AGENTS.md）已在 system prompt 中；skill 不指示重新读取。相反，html-output reference 包含 compose-time active-recall instruction，要求 agent 在 fallback 前扫描 loaded context 中任何 *preferred stylesheet reference*（file path、URL、named library 或 style brand）。可 inline references（短 local files、预算内 fetchable URLs）inline 到 `<style>`；不可 inline references（大型 frameworks、paywalled stylesheets、无 fetchable source 的 named systems）则以精神指导 CSS composition。Single-file invariant 通过两条路径都产生 inline CSS 来保持，绝不使用外部 `<link rel="stylesheet">`。完整 precedence：**conversation > preferred-stylesheet-reference (agent-instruction context) > DESIGN.md > skill default**。User-instruction tier 高于 DESIGN.md，因为 agent-instruction files 承载 deliberate agent-aware preferences；DESIGN.md 可能是 generic pre-existing design file。DESIGN.md 仍是 skill *主动从 filesystem 读取* 的唯一文件；其他都来自 loaded context。

---

## 待解决问题

### 规划期间已解决

- _ce-brainstorm -> ce-plan handoff propagation_: ce-plan 独立 re-resolve 自己的 `plan_output` config。handoff 不会自动从 brainstorm 向 plan propagate `output:` arg。理由：保持每个 skill 的 config 自包含；想要两者都输出 HTML 的用户可以同时设置两个 keys。Asymmetric output（requirements.html + plan.md）可接受。
- _Recommended option in HTML-mode post-generation menu_: ce-plan 仍为 `/ce-work`，ce-brainstorm 仍为 `/ce-plan`。"Open in browser" 作为新 option 添加，不升为 recommended。HTML 是 archival/share，不是 review gate。
- _Unknown `output:` value handling_: drop token，emit one-line note，fall back to default。不 loud-fail。

### 推迟到实现阶段

- Fallback default style 的 exact font 和 color choices。"opinionated, neutral, delightful" target 将 specific palette 留给 implementation；reference 将命名一个 tasteful default。DESIGN.md overrides。
- 是否添加 stable token-parsing test，覆盖 `mode:` 与 `output:` 同时存在；或让新 test 只 scope 到 `output:`。Implementation 时根据现有 skill tests 形状决定。
- post-generation `Doc review applied N fixes` summary line（`ce-plan/SKILL.md:608`）是否应明确说明 HTML 已一并 re-render。大概率 yes，以提升 user clarity，但精确措辞可在 implementation 中确定。

---

## 实现单元

### U1. 编写 shared `html-output.md` reference content

**目标：** 产出小型 agent-facing reference，捕获 invariants、content-shape questions、DESIGN.md discovery rules、fallback default style 和 JSON-frontmatter embed contract。这是 `ce-plan` 与 `ce-brainstorm` 将 byte-for-byte duplicate 的 content。

**需求：** R3, R4, R5, R6, R7, R8.

**依赖：** 无。

**文件：**
- 创建：`plugins/compound-engineering/skills/ce-plan/references/html-output.md`
- 创建：`plugins/compound-engineering/skills/ce-brainstorm/references/html-output.md`（byte-for-byte identical）

**方法：**
- 以 precedence stack 和 active-recall instruction 开头。Precedence（从高到低）：(1) in-session conversation，(2) 用户在 loaded agent-instruction context 中提到的任何 *preferred stylesheet reference*（file path、URL、named library 如 "Tailwind"，或 style brand 如 "Stripe docs"；最常见于 AGENTS.md / CLAUDE.md，但 agent 不应枚举位置，而应扫描 loaded context），(3) repo 的 `DESIGN.md`，(4) skill fallback default。User-instruction tier 位于 `DESIGN.md` **之上**，因为 agent-instruction files 承载 deliberate agent-aware preferences，而 DESIGN.md 可能是 generic 或 pre-existing。
- Active-recall instruction（compose-time）："写 CSS 前，扫描已加载 context，查找用户是否为这类文档指明过任何 stylesheet reference：file path、URL、named library 或 style brand。若找到且可 inline（短 local file、预算内可 fetch 的 URL），将其 inline 到 `<style>`。若找到但不可 inline（大型 framework、paywalled stylesheet、没有可 fetch source 的 named system），就按其精神 compose CSS：typography、color、density cues 来自该 named system。只有完全没有 preference signal 时，才 fallback 到 default style。" Single-file invariant 得以保持，因为两条路径都产出 inline CSS，绝不使用 `<link rel="stylesheet">` 指向外部 sheet。
- Hard invariants（硬性不变量：single self-contained HTML file；inline CSS in `<style>`；inline SVG；inline images via base64 or SVG；no companion `.css`/`.js`/`.svg` files；CDN webfonts only with a fallback font stack readable offline；ASCII identifiers；frontmatter preserved as `<script type="application/json">` with `<` escaped to `&lt;` (HTML entity)；R-IDs / U-IDs / A-IDs / F-IDs / AE-IDs preserved as anchor IDs）。
- DESIGN.md discovery：依次尝试 worktree root、`docs/DESIGN.md`、`.compound-engineering/DESIGN.md`。First match wins。HTML compose time 读取一次。Absent -> fall through to skill default（或 preferred stylesheet found via active recall，该 tier 更高）。
- Content-shape questions 以 agent prompts 表达（不是 recipes）："这个 doc 中是否有 tabular 或 comparative 内容？是否有 spatial、relational 或 sequential 信息被 prose 压平了？是否存在用 matrix 更易扫描的 decision points 或 branches？是否有 status、severity 或 readiness 的差异可通过 color 或 emphasis 更清楚表达？interactivity 是否真正有益，还是只是装饰？是否有 repeating rich-content cards（Implementation Units、finding cards、persona reviews），其中 secondary subsections 用 collapsibles 会更易扫描？" 每个 question 都要求 agent 针对 THIS artifact's content 作答。
- Agent 可采用的 affordance idioms（非必需；内容 warrant 时才选择）：
  - `<details>` + `<summary>` 用于 repeating rich-content cards 内部的 collapsible subsections。保持 card headline metadata（Goal、primary IDs、file lists）始终 visible 于 collapsibles 之上；将每个 secondary subsection（Approach、Test scenarios、Verification、Patterns to follow）包装在自己的 `<details>` 中，使读者只展开需要部分。Native HTML，无 JS required，保持 single-file invariant。仅用于真正 repeating dense content；一个只有单个 unit 或 short sub-content 的 doc 不需要它。
  - Inline SVG flowcharts/sequences/data-flow，用于 prose 会 flatten 的 branching 或 temporal logic。将 overrides/exceptions 与 main flow 在空间上分离，并使用 labeled connector 或 "FIRST CHECK" banner；spatial position 必须匹配 logical scope。
  - Two-column lists 用于 compact heterogeneous bibliographies（Sources & References），当 prose items 较短时。
  - Tinted callout cards 或 accent-bordered subsections 用于 "different in kind" content（Deferred to Follow-Up、Open Questions）- 这是打破 visual sameness 的 variety budget，而不是发明新 layout system。
- Fallback default style：约 40-60 行 CSS，opinionated 且 tasteful：modern type scale、generous line-height、max-width body container、subtle accent color、prefers-color-scheme dark variant、small-screen breakpoint。一个 web font，并带完整 fallback stack（例如 Google Fonts-hosted body font 前置 `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`）。
- Composition timing rule：HTML 在 ce-doc-review 的 `safe_auto` fixes 应用到 `.md` 之后 compose。在单次 run 内，每次 `.md` 被 re-written（deepen fast path、post-doc-review、post-HITL）都 re-compose。
- Agent-consumability rules（让 downstream agent 将 HTML file 作为 text 读取时，获得与读取 markdown 相同的 semantic understanding）：
  - **优先使用 semantic HTML elements，避免 `<div>` soup。** 每个 unit card 用 `<article>`，metadata pairs 用 `<dl>`，tabular content 用 `<table>`，collapsibles 用 `<details>`/`<summary>`，top-level doc sections 用 `<section>`。Agent 读取 source 中的这些 structure markers，就知道每个 block 是什么。
  - **Field labels 作为 visible text 存在，而不是 attributes。** 渲染 `<dt>GOAL</dt><dd>...</dd>`，而不是 `<dd data-field="goal">...</dd>`。Visible label 是 semantic anchor；agents 不运行 `querySelectorAll`，而是线性读取文件，label 必须作为 text reachable。
  - **U-IDs / R-IDs / A-IDs / F-IDs / AE-IDs 保持为 headings 和 table cells 中的 visible text，而不只存在于 `id=""` attributes。** Agent 像在 markdown 中找 "U1." 一样，在 source 中找 "U1."。`id=""` 是给 browsers 和 humans 的 anchor-link plumbing；visible text 才让 IDs 可被任何 reader 稳定 parse。
  - **匹配 markdown template 的 section order 和 field vocabulary。** 知道 ce-plan markdown structure 的 agent，可以在 HTML 中以相同顺序找到相同 labels。HTML 应读起来像 "同一份 plan，只是加了 agent 可以略过的 visual chrome"。
  - **所有 semantic content 都必须存在于真实 HTML text 中。** 不用 CSS `::before { content: "..." }` 承载 meaning，不把 background images 当 content，不把 semantic info 只放在 rendered result 中。Agent 在 source 中看到的才是它知道的；只通过 CSS render 的内容对 text-reading agent 不可见。
  - **Stable structure 是 public API。** Element types、ID/label scheme 和 field-label vocabulary 不随版本破坏。Visual styling 可自由改变；semantic skeleton 是 downstream consumers（current and future）依赖的 contract。
- 要指出的 anti-patterns：不要发明单一 fixed visual template；不要锁定除 R/U/A/F/AE preservation 外的 specific pill classes 或 anchor schemes；不要添加 JS framework dependencies；不要添加 "re-run without `--html` to produce markdown" 这样的 process-exhaust callout。
- 返回 artifact 前，扫描 common slips：每个 heading level（H2/H3/H4/summary）在视觉上彼此不同，也不同于 inline bold；无 template placeholders（`{skill}`、`<value>`）泄漏到 output；每个 anchored heading 或 row 都有 visible permalink affordance；存在 staleness signal（source path + composition timestamp）；如果 5+ sections 使用 identical card styling，至少有一个有变化；对每个 diagram，spatial position 匹配 logical scope（overrides/exceptions 与 main flow 空间分离）；table column widths 匹配 content shape，不让 prose columns 被挤压。

**遵循模式：**
- `plugins/compound-engineering/skills/ce-doc-review/references/subagent-template.md` - reference file shape，prose-only with embedded contract。
- `plugins/compound-engineering/skills/ce-compound/references/` - sibling skills 之间 content duplicated 的 precedent。

**测试场景：**
- 正常路径：`tests/compound-support-files.test.ts` extension 确认两个 files byte-for-byte match（drift fails the test）。
- 边界情况：reference file 低于或高于约 150 行 - track length；cross-platform reference rules 要求 >150 行时使用 backtick inclusion，而不是 `@`。

**验证：**
- 两个 files 存在于 parallel paths，内容 identical。
- Content 覆盖全部 R3-R8 requirements，且不 prescribes fixed visual template。
- Composition timing rule（after `safe_auto`）表述无歧义。

---

### U2. 向 ce-plan 添加 `output:` mode（parsing、write branch、menu）

**目标：** 将 `output:html` / `output:md` 接入 ce-plan：token parsing、config-read pre-resolution、precedence resolution、`.html` sibling write-branch、post-generation menu addition，以及 pipeline-mode force-`md` rule。

**需求：** R1, R2, R3, R9, R10, R11, R12.

**依赖：** U1（reference content 必须存在，SKILL.md 才能指向它）。

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-plan/SKILL.md`
- 修改：`plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md`
- 修改：`tests/skills/ce-plan-handoff-routing.test.ts`（现有 test pin 住每个 menu option 的 inline routing；新 "Open in browser" routing 必须加入 assertions）
- 测试：`tests/skills/ce-plan-output-mode.test.ts`

**方法：**
- 在 SKILL.md 顶部添加 `!`backtick pre-resolution config read（若已有 pre-resolution block，则放在其后），镜像 `ce-work-beta/SKILL.md:46`：
  ```
  !`cat "$(git rev-parse --show-toplevel 2>/dev/null)/.compound-engineering/config.local.yaml" 2>/dev/null || echo '__NO_CONFIG__'`
  ```
  在 Phase 0 下（Phase 0.1 之前）添加短 "Output Mode" subsection，解析 `OUTPUT_FORMAT`：
  1. 如果 `$ARGUMENTS` 包含以 literal `output:` 开头的 token，则 strip 并使用其值（case-insensitive）。将 `output:`（bare）、unknown values 或不在 `{md, html}` 的 values 视作 ignored：drop token，并记住在 post-generation menu 上方 emit one-line note。
  2. 否则，如果 config block 包含 `plan_output: <value>`，且 `<value>` 在 `{md, html}` 内（case-insensitive），使用它。
  3. 否则 default `md`。
  4. 如果 pipeline mode（`disable-model-invocation`），无论上面如何都强制 `md`。
- 更新 `argument-hint`（SKILL.md line 4），按 user-discoverability convention 加入 `[output:html]`。显示 non-default value，而不是 disjunction。
- 更新 token-stripping convention prose：在将 remainder 当作 feature description / path 之前被 strip 的 literal-prefix flag tokens 列表中，添加 `output:` 与 `mode:`。
- Phase 5.2 write step：始终先写 `.md`（仍按今日 sequence-numbered）。Phase 5.3.8 的 `safe_auto` fixes 应用后（让 markdown 的 doc-review path 不变），如果 `OUTPUT_FORMAT == html`，读取 `references/html-output.md` 并基于刚写入的 `.md` 遵循其 guidance compose HTML rendering。将 `.html` sibling 写入相同 path，extension 为 `.html`。通过 `Plan written to <absolute path to .md>` 确认；当 emit HTML 时，另加 `HTML view written to <absolute path to .html>`。
- Deepen fast path（Phase 0.1）：deepening edits 落到 `.md` 后，检测是否存在 `.html` sibling；如存在，则 re-compose。同样的 re-render rule 应用于 HITL Proof resync。
- Post-generation menu（SKILL.md:613-628）：当 `OUTPUT_FORMAT == html` 时，将 "Open in browser" 作为新 option 插入（现有 5-option list 的 item 5 - 见 Menu shape note）。Recommended option 仍是 `Start /ce-work`（item 1）。为新 option 编写 inline routing：优先使用平台的 local browser-opening primitive 打开保存的 `.html`；若不可用，则显示 absolute HTML path 供用户打开。此 option 不调用 `ce-work`。
- Menu shape note：今日 menu 在 actionable findings remain 时是 5 options，否则 4。添加 "Open in browser" 会让 actionable-findings case 到 6，超过 AGENTS.md narrow-exception cap。Implementation 时在二者中选择：(a) 仅当选择 `output:html` 时，用 `Open in browser` 替换 `Open in Proof`（mutually exclusive）；或 (b) 保持两者共存为 6，并接受 one-off overflow。Default: option (a) - Proof 和 local browser 都服务于 overlapping review purposes；mutual exclusion 保持 cap。
- 如果见到 unknown `output:` value，在 menu 上方 emit one-line note：`Ignored unknown output: value '<value>' — defaulting to md.`

**执行说明：** 从一个 failing test 开始，验证 precedence matrix 中代表性 cell 的 argument precedence resolution；再按 table fleshing out implementation。

**遵循模式：**
- `plugins/compound-engineering/skills/ce-doc-review/SKILL.md:18-20` - token-parsing prose。
- `plugins/compound-engineering/skills/ce-compound/SKILL.md:28-33` - mode-table style。
- `plugins/compound-engineering/skills/ce-work-beta/SKILL.md:46-50` - config pre-resolution + consumption pattern。
- `tests/skills/ce-plan-handoff-routing.test.ts` - 用于 menu routing 的 static-regex SKILL.md assertion style。

**测试场景：**
- 正常路径：`output:html` argument -> `OUTPUT_FORMAT == html`，both files written，menu 显示 "Open in browser"。
- 正常路径：无 argument，无 config -> `md`，只写 `.md`。
- 边界情况：`output:HTML`（uppercase）-> case-insensitive match，选择 `html`。
- 边界情况：bare `output:` token -> no-op，default applies。
- 边界情况：`output:pdf` -> token dropped，default applies，emit one-line note。
- 边界情况：`output:html mode:headless`（两者均存在，顺序可变）-> 两者都 honored，不显示 menu（headless skips menu），both files written。
- 边界情况：feature description 包含 `fix:` -> `fix:` 不被当作 flag，原样 pass through。
- 边界情况：deepen fast path on existing `.md` whose `.html` sibling exists -> `.html` after deepening re-rendered。
- 边界情况：pipeline mode（`disable-model-invocation`）且 config 中 `plan_output: html` -> only `.md`，no `.html`。
- 错误路径：config file unreadable / missing -> silent fallthrough to default。
- 错误路径：config key typo（`plan-output` 而非 `plan_output`）-> silently ignored，default applies。
- 集成：ce-doc-review 对 `.md` 应用 `safe_auto` fix -> HTML afterwards compose，反映 fix。
- Static analysis（按现有 test pattern）：`output:html`、`output:md`、"Open in browser" strings 出现在 SKILL.md；新 menu-routing block 存在；token-parsing prose 将 `mode:` 和 `output:` 都称作 literal-prefix flags。

**验证：**
- 运行 `bun test` 后，新 test file 和所有现有 ce-plan tests 通过。
- 用 `output:html` 手动 smoke 调用 ce-plan，产生 `.md` 和 `.html`。
- Skill 的 argument-hint 明确提到 `output:html`。

---

### U3. 向 ce-brainstorm 添加 `output:` mode（parsing、write branch、menu）

**目标：** 在 ce-brainstorm 中 mirror U2：相同 parsing、相同 precedence、相同 HTML-compose-after-md rule、相同 handoff-menu addition。针对 ce-brainstorm frontmatter（更轻量，无 `title`/`type`/`status`）和 handoff menu shape（今日最多 6 visible options）调整。

**需求：** R1, R2, R3, R7, R8, R9, R10, R11, R12.

**依赖：** U1（reference content）、U2（提供待 mirror convention）。

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`
- 修改：`plugins/compound-engineering/skills/ce-brainstorm/references/handoff.md`
- 修改：`plugins/compound-engineering/skills/ce-brainstorm/references/requirements-capture.md`（如 frontmatter shape 需要）
- 测试：`tests/skills/ce-brainstorm-output-mode.test.ts`

**方法：**
- 在 SKILL.md 顶部添加同样的 `!`backtick config pre-resolution，读取 `brainstorm_output` 而不是 `plan_output`。
- 在 Phase 0 下添加 "Output Mode" subsection，使用相同四步 resolution（arg -> config -> default -> pipeline-force-md）。
- 更新 `argument-hint`，加入 `[output:html]`。
- 在现有 token-stripping prose 中添加 `output:`（如果 ce-brainstorm 尚无等价 prose，则新增；implementation 时验证）。
- Phase 3（write step）和 Phase 4（handoff）获得相同 dual-emit behavior：markdown 写入且任何 post-write transforms（如适用 ce-doc-review）完成后，如 `OUTPUT_FORMAT == html`，compose HTML。
- Handoff menu（`handoff.md:46-95`）今日最多有 6 visible options。`output:html` 时加入 "Open in browser" 会增加到 7。应用与 U2 相同的 mutual-exclusion rule：HTML mode 中 `Open in browser` 替换 `Open in Proof`。Item 1 仍是 `/ce-plan` as recommended。
- HTML 的 frontmatter parity：ce-brainstorm frontmatter 是 `date: YYYY-MM-DD` + `topic: <kebab-case-topic>`（见 `requirements-capture.md:55-59`）。将同样 shape embed 为 `<script>` block 中的 JSON。A-IDs / F-IDs / AE-IDs 在 HTML 中 preserved as anchor IDs。
- Sanitize-on-write：topic 已经 kebab-cased；无新增 sanitization surface。

**遵循模式：**
- U2 的 resolution shape，替换为 `brainstorm_output` key 和 ce-brainstorm-specific menu。
- `plugins/compound-engineering/skills/ce-brainstorm/references/handoff.md:9-14` - 现有 4-vs-5+ option rendering rule 适用；不要破坏它。

**测试场景：**
- 正常路径：`output:html` -> 写入 `requirements.md` 和 `requirements.html`。
- 正常路径：无 argument，无 config -> only `md`。
- 边界情况：case-insensitive value match、bare `output:`、unknown value - 与 U2 相同。
- 边界情况：pipeline mode forces `md`。
- 边界情况：ce-brainstorm -> ce-plan handoff 中 brainstorm 为 `html` mode，但 config 设置 `plan_output: md` -> ce-plan 重新 resolve 自己 config；结果是 brainstorm.html + plan.md（acceptable）。
- 边界情况：A-IDs / F-IDs / AE-IDs 在 HTML 中 preserved as anchor IDs。
- 静态分析：menu rule 记录 Open-in-browser-vs-Proof mutual exclusion；argument-hint 提到 `output:html`；token-parsing prose 同时提到 `mode:` 和 `output:`。

**验证：**
- `bun test` 通过新 file 和所有现有 ce-brainstorm tests。
- 手动 smoke：`output:html` brainstorm 产生 both files；可在 browser 中正常打开。

---

### U4. 向 ce-setup template 添加 config keys，并传播到 existing copies

**目标：** 通过标准 `ce-setup` config-bootstrap path 让 `plan_output` 和 `brainstorm_output` 可发现。新用户运行 `/ce-setup` 时获得展示这些 keys 的 `config.local.example.yaml`（commented out，并标注 allowed values）。

**需求：** R2.

**依赖：** U2, U3（确保 exact key names 已确定）。

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-setup/references/config-template.yaml`

**方法：**
- 在 `config-template.yaml` 现有 sections 下方添加新 section header（例如 `# --- Output format ---`）。
- 用与文件其余部分相同的 flat `key: value` style 添加两个 commented examples：
  ```
  # plan_output: html              # md | html (default: md)
  # brainstorm_output: html        # md | html (default: md)
  ```
- 添加简短 comment block 说明："When `html`, the skill writes a single self-contained HTML rendering alongside the markdown. Markdown stays the source of truth. See `DESIGN.md` to influence styling."
- 不修改 `ce-setup/SKILL.md`。按 Step 5（SKILL.md:81-104），template 会 always-refreshed 到 `config.local.example.yaml`；existing users 下次 `/ce-setup` 时看到新 keys。

**测试场景：**
- 正常路径：`bun run release:validate` passes（template additions 不改变 manifest counts 或 marketplace metadata）。
- 静态分析：keys 存在于 template；默认 commented-out；line comment 中记录 allowed values。

**验证：**
- `bun test` 和 `bun run release:validate` 都通过。
- Manual: 在 fresh project 运行 `/ce-setup` 生成的 `config.local.example.yaml` 包含新 keys。

---

### U5. 添加 HTML output invariant tests

**目标：** Pin 新 feature 必须满足的 invariants，但不锁定 visual style。Tests assert STRUCTURE，而非 appearance。

**需求：** R13, R14.

**依赖：** U1, U2, U3（需要新 files 存在才能 assert）。

**文件：**
- 创建：`tests/skills/html-output-invariants.test.ts`（关于 duplicated reference 的 shared invariant assertions）
- 修改：`tests/compound-support-files.test.ts`（扩展 byte-for-byte duplication check，包含两个 `html-output.md` files）

> Note: `tests/skills/ce-plan-output-mode.test.ts` 和 `tests/skills/ce-brainstorm-output-mode.test.ts` 分别在 U2 与 U3 下创建（per-skill assertions 跟随 owning unit）。U5 只拥有 shared invariants file 和 duplication-check extension。

**方法：**
- `html-output-invariants.test.ts` assert `html-output.md` 的 static contents（任意一个 skill 下的都可，因为 identical）携带 hard invariants：诸如 "single self-contained"、"inline CSS"、"no companion"、"JSON" / `<script type="application/json">`、`<` escape rule、DESIGN.md path order、precedence sentence、content-shape questions block 等 words。使用 regex assertions，不做 snapshots。
- `compound-support-files.test.ts` extension：将 `ce-plan/references/html-output.md` 和 `ce-brainstorm/references/html-output.md` 加到必须 byte-for-byte match 的 file pairs list。遵循现有 ce-compound / ce-compound-refresh pattern。
- `ce-plan-output-mode.test.ts` 和 `ce-brainstorm-output-mode.test.ts` files（在 U2 / U3 创建）承载 per-skill assertions：argument-hint 包含 `output:html`，token-parsing prose 同时提到 `output:` 和 `mode:`，new option 的 menu inline-routing 存在，SKILL.md prose 中存在 pipeline-force-md rule。
- 如果可通过 static analysis 实现，则 precedence resolution 做成 table-driven test；否则记录为 verification section 中的 manual smoke test。按现有 convention，这些 tests 是 static-analysis（不 runtime invoke skill）。

**遵循模式：**
- `tests/skills/ce-plan-handoff-routing.test.ts:30-76` - static-regex SKILL.md assertion style。
- `tests/compound-support-files.test.ts:7-31` - byte-for-byte file-pair enforcement。
- `tests/frontmatter.test.ts` - 带 quoted expectation strings 的 invariant-shaped assertion style。

**测试场景：**
- 正常路径：三个 new test files 在 `bun test` 下全部 pass。
- 边界情况：两个 `html-output.md` files drift 时，byte-for-byte test fails；CI catches forks。
- 边界情况：从 `argument-hint` 移除 `output:html` 会 fail per-skill static check。
- 边界情况：从 SKILL.md 移除 pipeline-force-md rule 会 fail per-skill check。

**验证：**
- `bun test` 报告所有 new tests passing。
- 故意 drift（例如对一个 html-output.md 做一字节变更）会 fail duplication test。

---

### U6. 同步 user-facing docs

**目标：** 更新提到 ce-plan 和 ce-brainstorm 的 public-facing surfaces，使新 mode 可被发现。

**需求：** _(documentation; supports R1 discoverability)_

**依赖：** U2, U3.

**文件：**
- 修改：`plugins/compound-engineering/README.md`
- 修改：`docs/skills/ce-plan.md`
- 修改：`docs/skills/ce-brainstorm.md`

**方法：**
- `plugins/compound-engineering/README.md` lines 28-29 的 Core Workflow table：修改 ce-plan 和 ce-brainstorm description，提到 `output:html` 是可选项（例如 "...with optional HTML output via `output:html`"）。保持简洁；table 很 dense。
- `docs/skills/ce-plan.md` 和 `docs/skills/ce-brainstorm.md` 是 user-facing skill docs。按 plugin AGENTS.md "Skill Documentation" rule，只更新已经不准确的部分："What it does" / "Quick example" 可能需要一行提到 `output:html`；"Use cases" 或 FAQ 可能需要一句 HTML-as-shareable-projection model。保持 edits minimal，不重写以匹配 SKILL.md。
- 仅在 counts 变化时更新 README.md component counts（它们不应变化：same skill count、same agent count）。

**遵循模式：**
- README.md 当前 ce-plan / ce-brainstorm rows - 保持相同 row shape。
- `docs/skills/ce-compound.md` - 最近 skill-doc edits 的 tone 和 depth 参考。

**测试场景：**
- 静态分析：`bun run release:validate` passes（无 version bumps、无 manifest drift）。
- README table preview 时正确 render。

**验证：**
- `bun test` 和 `bun run release:validate` 都通过。
- README.md changes 不让 table row 臃肿。

---

## 系统级影响

- **交互图：** ce-plan 和 ce-brainstorm 是用户直接 invoke 的 entry-points；新的 arg/config layer 位于两者前方。Downstream chain（ce-plan -> ce-doc-review -> ce-work）仍由 markdown 驱动。ce-setup 只通过 `config-template.yaml` touched。
- **错误传播：** Config-read failures silent fall through to default。Argument parse failures（unknown value）drop token，并在 menu 上方 emit one-line note。Agent authoring step 中的 HTML composition failure 会是在 chat 中可见的 in-flight error，而不是 silent failure。
- **状态生命周期风险：** `.md` mutation 后 stale `.html` sibling 是主要 hazard。通过 "re-render whenever `.md` is mutated within the same run" rule 缓解。跨 multi-run lifecycle（用户在 skill 外手动编辑 `.md`）时，`.html` 会 drift；v1 可接受，并作为 known limitation surfaced。
- **API surface parity：** 如果将 `output:` arg convention 扩展到 future skills，应保持一致。Literal-prefix-strip rule（mode:、output:、delegate:）是本 plan 强化的 existing convention。
- **集成覆盖：** Pipeline（LFG）integration；brainstorm -> plan handoff with mismatched config；带 sibling re-render 的 deepen fast path - 都在上方 test scenarios surfaced。
- **不变的 invariants：** markdown plan / requirements format 不变。ce-work、ce-doc-review 和 Proof HITL flow 继续操作 markdown。argument-hint additions 是 additive，不 breaking。现有 test scaffolding patterns 被扩展，而不是替换。

---

## 风险与依赖

| 风险 | 缓解措施 |
|------|------------|
| Agent compose 的 HTML 违反 single-file invariant（例如 emit `<link rel="stylesheet" href="...">`） | 在 `html-output.md` reference 中声明 invariants；static-analysis tests assert reference 中存在 invariants；用户看到 violation 可 re-prompt 或 report。 |
| 多次运行间在 skill 外编辑 `.md` 后 `.html` 变 stale | v1 可接受 limitation；在 user-facing skill doc 中简短说明 HTML 仅在 skill run 时 regenerate。 |
| 两个 duplicated `html-output.md` files drift | 通过 `tests/compound-support-files.test.ts` extension enforce；CI catches divergence。 |
| 添加 "Open in browser" 后 menu overflow，使 total options 超过 AGENTS.md narrow-exception cap | Default approach：HTML mode 中 `Open in browser` 与 `Open in Proof` mutual exclusion。Cap honored。 |
| Frontmatter values 包含 literal substring `</script>` 时发生 `</script>` injection | JSON embed 中使用 `<` -> `&lt;` escape rule，并在 reference 中记录。 |
| Webfont CDN down 或 blocked -> 用户看到 fallback font | 这正是 fallback stack 的用途：fonts degrade gracefully，document 仍 readable。 |
| DESIGN.md 或 config 在 main checkout 中，对 worktrees 不可见 | 这是现有 repo-wide convention（config.local.yaml 也一样）；使用 worktrees 的用户可添加自己的版本。在 `html-output.md` 中记录。 |
| `mode:` 和 `output:` 之间的 token-parsing convention drift | 两条规则在每个 SKILL.md 的同一个 parsing-prose paragraph 中 co-located；tests assert 两个名称都存在。 |

---

## 来源与参考

- `plugins/compound-engineering/skills/ce-plan/SKILL.md`（current ce-plan skill）
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`（current ce-brainstorm skill）
- `plugins/compound-engineering/skills/ce-doc-review/SKILL.md` 和 `ce-compound/SKILL.md`（canonical `mode:` parsing precedent）
- `plugins/compound-engineering/skills/ce-work-beta/SKILL.md`（canonical config pre-resolution pattern）
- `plugins/compound-engineering/skills/ce-setup/references/config-template.yaml`（config-template style）
- `plugins/compound-engineering/AGENTS.md`（cross-skill duplication rule、reading config files、reference inclusion rules）
- `docs/solutions/skill-design/post-menu-routing-belongs-inline.md`
- `docs/solutions/skill-design/script-first-skill-architecture.md`（此处记录为 not-applicable）
- `docs/solutions/best-practices/conditional-visual-aids-in-generated-documents.md`
- Thariq Shihipar, "Using Claude Code: The Unreasonable Effectiveness of HTML"（motivating essay，启发性文章）
