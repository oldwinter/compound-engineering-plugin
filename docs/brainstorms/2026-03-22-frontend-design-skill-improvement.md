# Frontend Design Skill 改进

**日期：** 2026-03-22
**状态：** Design approved，pending implementation plan
**范围：** 重写 `frontend-design` skill + 对 `ce:work-beta` 做 surgical addition

## 上下文

当前 `frontend-design` skill（43 行）是从 Anthropic official skill fork 出来的简短 aesthetic manifesto。它强调 bold design 和避免 AI slop，但缺少实用结构、具体 constraints、context-specific guidance，以及任何 verification mechanism。

两个外部来源影响了这次 redesign：
- **Anthropic official frontend-design skill（Anthropic 官方 frontend-design skill）** -- 与我们的几乎一致，存在相同 gaps
- **OpenAI frontend skill（OpenAI frontend skill）**（来自其 "Designing Delightful Frontends with GPT-5.4" article，March 2026）-- 内容显著更完整，包含 composition rules、context modules、card philosophy、copy guidelines、motion specifics 和 litmus checks

此外，beta workflow（`ce:plan-beta` -> `deepen-plan-beta` -> `ce:work-beta`）没有调用 frontend-design skill 的机制。旧的 `deepen-plan` 会动态发现并应用它；`deepen-plan-beta` 使用 deterministic agent mapping，完全跳过 skill discovery。该 skill 在 beta workflow 中实际上已被孤立。

## 设计决策

### 权威层级（Authority Hierarchy）

skill 中每条规则都是 default，而不是 mandate：
1. **Existing design system / codebase patterns（现有设计系统 / codebase patterns）** -- 最高优先级，始终尊重
2. **User's explicit instructions（用户明确指令）** -- 覆盖 skill defaults
3. **Skill defaults（skill 默认值）** -- 只在 greenfield 或用户要求 design guidance 时完整应用

这解决了 OpenAI approach 的一个关键弱点：其规则读起来像绝对命令（"No cards by default"、"Full-bleed hero only"），缺少 escape hatches。想在 hero 中使用 cards 的用户不应被自己的工具阻碍。

### 分层架构（Layered Architecture）

该 skill 按 layers 组织：

- **Layer 0: Context Detection（上下文检测）** -- 在做任何事之前检查 codebase 是否已有 design signals。当 established patterns 存在时，短路 opinionated guidance。
- **Layer 1: Pre-Build Planning（构建前规划）** -- visual thesis + content plan + interaction plan（3 个短 statement）。适配 greenfield 与 existing codebase。
- **Layer 2: Design Guidance Core（设计指导核心）** -- always-applicable principles（typography、color、composition、motion、accessibility、imagery）。全部让位于 existing systems。
- **Context Modules（上下文模块）** -- agent 根据正在构建的内容选择一个：
  - Module A: Landing pages & marketing（landing pages 与 marketing，greenfield）
  - Module B: Apps & dashboards（apps 与 dashboards，greenfield）
  - Module C: Components & features（components 与 features；在 existing app 内工作时默认使用，无论具体构建什么）

### Layer 0：检测信号（Detection Signals，Concrete Checklist）

agent 在分类 codebase 时查找这些具体 signals：

- **Design tokens / CSS variables（设计 token / CSS 变量）**: `--color-*`、`--spacing-*`、`--font-*` custom properties、theme files
- **Component libraries（组件库）**: shadcn/ui、Material UI、Chakra、Ant Design、Radix，或 project-specific component directories
- **CSS frameworks（CSS framework）**: `tailwind.config.*`、`styled-components` theme、Bootstrap imports、具有 consistent naming 的 CSS modules
- **Typography（排版）**: HTML/CSS 中的 font imports、`@font-face` declarations、Google Fonts links
- **Color palette（色彩 palette）**: Defined color scales、brand color files、design token exports
- **Animation libraries（动画库）**: Framer Motion、GSAP、anime.js、Motion One、Vue Transition imports
- **Spacing / layout patterns（间距 / layout pattern）**: Consistent spacing scale usage、grid systems、layout components

**模式分类（Mode classification）:**
- **Existing system（现有系统）**: 检测到跨多个 categories 的 4+ signals。让位给它。
- **Partial system（部分系统）**: 检测到 1-3 个 signals。在没有 convention 的地方应用 skill defaults；在已有 detected conventions 的地方让位。
- **Greenfield（绿地）**: 未检测到 signals。完整应用 skill guidance。
- **Ambiguous（模糊）**: Signals 互相矛盾或不清晰。询问用户。

### 用户问题的交互方式

当 Layer 0 需要询问用户（ambiguous detection）时，使用平台的 blocking question tool：
- Claude Code：`AskUserQuestion`
- Codex：`request_user_input`
- Gemini CLI：`ask_user`
- Fallback（fallback）：如果没有 question tool，假设为 "partial" mode 并保守推进。

### 相比 OpenAI 的改进

1. **Accessibility 作为一等 concern（无障碍优先）** -- OpenAI 的 skill 纯粹偏 aesthetics。我们把 semantic HTML、contrast ratios、focus states 放到与 typography 和 color 同等的位置。

2. **Existing codebase integration（现有 codebase 集成）** -- OpenAI 的例外说明藏在 rules 中的一行。我们把 context detection 作为第一步，并专门增加 Module C 用于 "adding a feature to an existing app" -- 这是 OpenAI 和 Anthropic 都完全忽略的最常见真实场景。

3. **Defaults with escape hatches（带 escape hatch 的默认值）** -- 两层 anti-pattern system："default against"（可覆盖 preferences）与 "always avoid"（真实 quality failures）。OpenAI 把这些混在一个 flat list 中。

4. **Framework-aware animation defaults（framework 感知的动画默认值）** -- OpenAI 假设 Framer Motion。我们先检测 existing animation libraries。若没有 existing library，则默认根据 framework 条件选择：CSS animations 作为通用 baseline，React 用 Framer Motion，Vue 用 Vue Transition / Motion One，Svelte 用 Svelte transitions。

5. **Visual self-verification（视觉自验证）** -- OpenAI 与 Anthropic 都没有 verification。我们增加 browser-based screenshot + assessment step，并采用 tool preference cascade：
   1. Existing project browser tooling（现有项目 browser tooling，Playwright、Puppeteer 等）
   2. Browser MCP tools（claude-in-chrome 等）
   3. agent-browser CLI（没有其他工具时的默认方案 -- 加载 `agent-browser` skill 进行 setup）
   4. 针对 litmus checks 做 mental review（last resort）

6. **Responsive guidance（响应式 guidance）** -- 保持轻量（信任 smart models）但明确存在，不像 OpenAI 只提一次。

7. **Performance awareness（性能意识）** -- 保持谨慎平衡，说明 heavy animations 和 multiple font imports 有成本，但不武断规定具体 thresholds。

8. **Copy guidance without arbitrary thresholds（不使用任意阈值的 copy guidance）** -- OpenAI 说 "if deleting 30% of the copy improves the page, keep deleting." 我们使用："Every sentence should earn its place. Default to less copy, not more."

### Verification 的范围控制

Visual verification 是 sanity check，不是 pixel-perfect review。只做一轮。如果有明显问题，修掉。如果看起来稳，就继续。目标是在用户看到之前抓住 "this clearly doesn't work"。

### ce:work-beta 集成

在 Phase 2（Execute）中，在现有 Figma Design Sync section 后添加一小段：

**UI task detection heuristic（UI task 检测启发式）:** 如果以下任一条件成立，task 就是 "UI task"：
- task 的 implementation files 包含 view、template、component、layout 或 page files
- task 创建新的 user-visible routes 或 pages
- plan text 包含明确的 "UI"、"frontend"、"design"、"layout" 或 "styling" language
- task 涉及构建或修改用户会在 browser 中看到的内容

agent 使用 judgment -- 这些是 heuristics，不是 rigid classifier。

**ce:work-beta 添加内容（What ce:work-beta adds）:**

> 对没有 Figma design 的 UI tasks，在实现前加载 `frontend-design` skill。遵循它的 detection、guidance 和 verification flow。

这刻意保持最小：
- 不把 skill content 复制进 ce:work-beta
- 不为 non-UI tasks 加载 skill
- 当存在 Figma designs 时不加载 skill（Figma sync 已覆盖）
- 不改变其他 phase

**Verification screenshot reuse（验证截图复用）:** frontend-design skill 的 visual verification screenshot 满足 ce:work-beta Phase 4 的 screenshot requirement。agent 不需要 screenshot 两次 -- 复用 skill 的 verification output 用于 PR。

**Relationship to design-iterator agent（与 design-iterator agent 的关系）:** frontend-design skill 的 verification 是 single sanity-check pass。若需要超出这一步的 iterative refinement（多轮 screenshot-assess-fix），请看 `design-iterator` agent。skill 不会自动调用 design-iterator。

## 变更文件

| 文件 | 变更 |
|------|--------|
| `plugins/compound-engineering/skills/frontend-design/SKILL.md` | 全面重写 |
| `plugins/compound-engineering/skills/ce-work-beta/SKILL.md` | 向 Phase 2 添加约 5 行 |

## Skill Description（已优化）

```yaml
name: frontend-design
description: 构建有真实 design quality、不是 AI slop 的 web interfaces。用于
  任何 frontend work：landing pages、web apps、dashboards、admin panels、components、
  interactive experiences。适用于 greenfield builds 和对 existing applications 的修改。
  检测并尊重 existing design systems。覆盖 composition、typography、color、motion 和 copy。
  宣称完成前通过 screenshots 验证结果。
```

## Skill Structure（skill 结构，frontend-design/SKILL.md）

```
Frontmatter (name, description)
Preamble (what, authority hierarchy, workflow preview)
Layer 0: Context Detection
  - Detect existing design signals
  - Choose mode: existing / partial / greenfield
  - Ask user if ambiguous
Layer 1: Pre-Build Planning
  - Visual thesis (one sentence)
  - Content plan (what goes where)
  - Interaction plan (2-3 motion ideas)
Layer 2: Design Guidance Core
  - Typography (2 typefaces max, distinctive choices, yields to existing)
  - Color & Theme (CSS variables, one accent, no purple bias, yields to existing)
  - Composition (poster mindset, cardless default, whitespace before chrome)
  - Motion (2-3 intentional motions, use existing library, framework-conditional defaults)
  - Accessibility (semantic HTML, WCAG AA contrast, focus states)
  - Imagery (real photos, stable tonal areas, image generation when available)
Context Modules (select one)
  - A: Landing Pages & Marketing (greenfield -- hero rules, section sequence, copy as product language)
  - B: Apps & Dashboards (greenfield -- calm surfaces, utility copy, minimal chrome)
  - C: Components & Features (default in existing apps -- match existing, inherit tokens, focus on states)
Hard Rules & Anti-Patterns
  - Default against (overridable): generic card grids, purple bias, overused fonts, etc.
  - Always avoid (quality floor): prompt language in UI, broken contrast, missing focus states
Litmus Checks
  - Context-sensitive self-review questions
Visual Verification
  - Tool cascade: existing > MCP > agent-browser > mental review
  - One iteration, sanity check scope
  - Include screenshot in deliverable
```

## 保留当前 Skill 的哪些内容

- 强烈的 anti-AI-slop identity 和 messaging
- Greenfield work 中的 creative energy / 鼓励 bold
- Tone-picking exercise（例如 brutally minimal、maximalist chaos、retro-futuristic...）
- "Differentiation" prompt：what makes this unforgettable?（是什么让它令人难忘？）
- Framework-agnostic approach（HTML/CSS/JS、React、Vue 等）

## Cross-Agent Compatibility（跨 agent 兼容性）

按 AGENTS.md rules：
- 用 capability class 描述 tools，并给出 platform hints，而不是只写 Claude-specific names
- 使用 platform-agnostic question patterns（列出 known equivalents + fallback）
- 不为 routine exploration 写 shell recipes
- 用 relative paths 引用 co-located scripts
- Skill 写一次，按原样复制到其他 platforms
