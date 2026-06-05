---
title: "feat: 用 layered architecture 和 visual verification 重写 frontend-design skill"
type: feat
status: completed
date: 2026-03-22
origin: docs/brainstorms/2026-03-22-frontend-design-skill-improvement.md
---

# feat: 用 layered architecture 与 visual verification 重写 frontend-design skill

## 概览

将 `frontend-design` skill 从 43 行 aesthetic manifesto 重写为结构化、分层的 skill：它能检测 existing design systems，提供 context-specific guidance，并通过 browser screenshots 验证自身输出。在 `ce-work-beta` 中添加一个 surgical trigger，使其在没有 Figma designs 的 UI tasks 上加载该 skill。

## 问题框架

当前 skill 提供含糊的 creative encouragement（"be bold"、"choose a BOLD aesthetic direction"），但缺乏实用结构。它无法检测 existing design systems，没有 context-specific guidance（landing pages vs dashboards vs existing apps 中的 components）、没有 concrete constraints、没有 accessibility guidance，也没有 verification step。beta workflow（`ce:plan-beta` -> `deepen-plan-beta` -> `ce:work-beta`）没有调用它的方式 -- 该 skill 实际上已被孤立。

两个外部来源影响了这次 redesign：Anthropic's official frontend-design skill（与我们的几乎一致，存在相同 gaps）以及 OpenAI 于 March 2026 发布的综合 frontend skill（see origin: `docs/brainstorms/2026-03-22-frontend-design-skill-improvement.md`）。

## 需求追踪

- R1. 在应用 opinionated guidance 前检测 existing design systems（Layer 0）
- R2. 强制 authority hierarchy：existing design system > user instructions > skill defaults
- R3. 提供 pre-build planning step（visual thesis、content plan、interaction plan）
- R4. 用 concrete constraints 覆盖 typography、color、composition、motion、accessibility 和 imagery
- R5. 提供 context-specific modules：landing pages、apps/dashboards、components/features
- R6. 在 existing app 中工作时，Module C（components/features）是默认值
- R7. 两层 anti-pattern system：overridable defaults vs quality floor
- R8. 通过 browser screenshot 进行 visual self-verification，并使用 tool cascade
- R9. Cross-agent compatibility（Claude Code、Codex、Gemini CLI）
- R10. ce-work-beta 为没有 Figma designs 的 UI tasks 加载该 skill
- R11. Verification screenshot reuse -- skill 的 screenshot 满足 ce-work-beta Phase 4 的 requirement

## 范围边界

- `frontend-design` skill 本身处理所有 design guidance 和 verification。ce-work-beta 只获得一个 trigger。
- ce-work（non-beta）不修改。
- design-iterator agent 不修改。skill 不调用它。
- agent-browser skill 是 upstream-vendored，不修改。
- design-iterator 的 `<frontend_aesthetics>` block（重复 current skill content）不在本 plan 中 cleanup -- 那是独立 follow-up。

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/frontend-design/SKILL.md` -- full rewrite target（当前 43 行）
- `plugins/compound-engineering/skills/ce-work-beta/SKILL.md` -- surgical Phase 2 addition target（lines 210-219，在 Figma Design Sync 与 Track Progress 之间）
- `plugins/compound-engineering/skills/ce-plan-beta/SKILL.md` -- cross-agent interaction patterns 参考（Pattern A：platform's blocking question tool with named equivalents）
- `plugins/compound-engineering/skills/reproduce-bug/SKILL.md` -- cross-agent patterns 参考
- `plugins/compound-engineering/skills/agent-browser/SKILL.md` -- upstream-vendored，browser automation CLI 参考
- `plugins/compound-engineering/agents/design/ce-design-iterator.agent.md` -- 包含与 current skill 重叠的 `<frontend_aesthetics>` block；新 skill 会在两者同时加载时 supersede 它
- `plugins/compound-engineering/AGENTS.md` -- skill compliance checklist（cross-platform interaction、tool selection、reference rules）

### 组织内经验

- **Cross-platform tool references**（`docs/solutions/skill-design/compound-refresh-skill-improvements.md`）：绝不要硬编码单一 tool name 再附 escape hatch。使用 capability-first language，提供 platform examples 和 plain-text fallback。Anti-pattern table 可直接应用。
- **Beta skills framework**（`docs/solutions/skill-design/beta-skills-framework.md`）：frontend-design 不是 beta skill -- 它是正在改进的 stable skill。ce-work-beta 应通过 stable name 引用它。
- **Codex skill conversion**（`docs/solutions/codex-skill-prompt-entrypoints.md`）：Skills 会按原样复制到 Codex。SKILL.md 内的 slash references 不会改写。使用 semantic wording（"load the `agent-browser` skill"），而不是 slash syntax。
- **Context token budget**（`docs/plans/2026-02-08-refactor-reduce-plugin-context-token-usage-plan.md`）：Description field 的唯一作用是 discovery。提议的 6 行 description 对 budget 来说合适。
- **Script-first architecture**（`docs/solutions/skill-design/script-first-skill-architecture.md`）：当 skill 的核心价值是 model judgment 时，script-first 不适用。Frontend-design 是 judgment-based。Detection checklist 应 inline，而不是放 reference files。

## 关键技术决策

- **不加 `disable-model-invocation`**：该 skill 应在 model 检测到 frontend work 时 auto-invoke。当前 skill 没有该字段；rewrite 保持这一点。
- **删除 `license` frontmatter field**：只有当前 frontend-design skill 有这个字段。其他 skill 都不用。为一致性删除。
- **全部 inline 在 SKILL.md 中**：不建 reference files 或 scripts directory。该 skill 是纯 guidance（约 300-400 行 markdown）。Detection checklist、context modules、anti-patterns、litmus checks 和 verification cascade 都放在一个文件内。
- **修复 ce-work-beta duplicate numbering**：当前 Phase 2 有两个编号 "6."（Figma Design Sync 和 Track Progress）。插入新 section 时一起修复。
- **Framework-conditional animation defaults**：CSS animations 作为 universal baseline。React 用 Framer Motion，Vue 用 Vue Transition / Motion One，Svelte 用 Svelte transitions。仅在未检测到 existing animation library 时使用。
- **Semantic skill references only**：将 agent-browser 引用为 "load the `agent-browser` skill"，不是 `/agent-browser`。遵循 AGENTS.md 与 Codex conversion learnings。

## 开放问题

### 规划期间已解决

- **skill 是否应有 `disable-model-invocation: true`？** 不。它应为 frontend work auto-invoke。当前 skill 也没有。
- **Module A/B 是否可用于 existing app？** 不。在 existing app 内工作时，无论构建什么，都默认使用 Module C。Modules A 和 B 用于 greenfield work。
- **是否保留 `license` field？** 不。它是该 skill 独有字段，与其他所有 skills 不一致。

### 延后到实现阶段

- **重写后 skill 的精确 line count**：估计 300-400 行。implementer 应优先 clarity，同时避免 bloat。
- **design-iterator 的 `<frontend_aesthetics>` block 是否需要更新**：out of scope。新 skill 在加载时 supersedes 它。cleanup 是独立 follow-up。

## 实现单元

- [x] **Unit 1：重写 frontend-design SKILL.md**

  **目标：** 用完整 layered skill 替换 43 行 aesthetic manifesto，覆盖 detection、planning、guidance、context modules、anti-patterns、litmus checks 和 visual verification。

  **需求：** R1, R2, R3, R4, R5, R6, R7, R8, R9

  **依赖：** None

  **文件：**
- Modify（修改）: `plugins/compound-engineering/skills/frontend-design/SKILL.md`

  **做法：**
  - Full rewrite，仅保留当前 frontmatter 的 `name` field
  - 使用 brainstorm doc 中优化过的 description（see origin: Section "Skill Description (Optimized)"）
  - 结构：Frontmatter -> Preamble（authority hierarchy、workflow preview）-> Layer 0（context detection with concrete checklist、mode classification、cross-platform question pattern）-> Layer 1（pre-build planning）-> Layer 2（design guidance core，subsections 覆盖 typography、color、composition、motion、accessibility、imagery）-> Context Modules（A/B/C）-> Hard Rules & Anti-Patterns（two tiers）-> Litmus Checks -> Visual Verification（tool cascade with scope control）
  - 从 current skill 保留：anti-AI-slop identity、greenfield 的 creative energy、tone-picking exercise、differentiation prompt
  - 应用 AGENTS.md skill compliance checklist：imperative voice、capability-first tool references with platform examples、semantic skill references、no shell recipes for exploration、cross-platform question patterns with fallback
  - 所有 rules 都 framed as defaults，向 existing design systems 和 user instructions 让位
  - Copy guidance 使用 "Every sentence should earn its place. Default to less copy, not more."（不用 arbitrary percentage thresholds）
  - Animation defaults 是 framework-conditional：CSS baseline，然后 Framer Motion（React）、Vue Transition/Motion One（Vue）、Svelte transitions（Svelte）
  - Visual verification cascade：existing project tooling -> browser MCP tools -> agent-browser CLI（加载 `agent-browser` skill 进行 setup）-> mental review as last resort
  - 一轮 verification，并控制 scope（"sanity check, not pixel-perfect review"）
  - 说明与 design-iterator 的关系："For iterative refinement beyond a single pass, see the `design-iterator` agent"

  **遵循的模式：**
  - `plugins/compound-engineering/skills/ce-plan-beta/SKILL.md` -- cross-agent interaction pattern（Pattern A）
  - `plugins/compound-engineering/skills/reproduce-bug/SKILL.md` -- cross-agent tool reference pattern
  - `plugins/compound-engineering/AGENTS.md` -- skill compliance checklist
  - `docs/solutions/skill-design/compound-refresh-skill-improvements.md` -- tool references 的 anti-pattern table

  **测试场景：**
  - Skill 通过 AGENTS.md skill compliance checklist 的全部 items
  - Description field 存在，并遵循 "what + when" format
  - 没有 hardcoded Claude-specific tool names，除非同时给出 platform equivalents
  - 没有对其他 skills 的 slash references（使用 semantic wording）
  - 没有 `TodoWrite`/`TodoRead` references
  - 没有用于 routine file exploration 的 shell commands
  - Cross-platform question pattern 包含 AskUserQuestion、request_user_input、ask_user 和 fallback
  - 所有 design rules 都明确 framed as defaults（非 absolutes）
  - Layer 0 detection checklist 具体（specific file patterns 和 config names）
  - Mode classification 有清晰 thresholds（4+ signals = existing，1-3 = partial，0 = greenfield）
  - Visual verification section 以 semantic 方式引用 agent-browser（"load the `agent-browser` skill"）

  **验证：**
  - `grep -E 'description:' plugins/compound-engineering/skills/frontend-design/SKILL.md` 返回 optimized description
  - `grep -E '^\`(references|assets|scripts)/[^\`]+\`' plugins/compound-engineering/skills/frontend-design/SKILL.md` 无结果（没有 unlinked references）
  - Manual review 确认 layered structure 匹配 brainstorm doc 的 "Skill Structure" outline
  - `bun run release:validate` passes

- [x] **Unit 2：在 ce-work-beta Phase 2 中添加 frontend-design trigger**

  **目标：** 在 ce-work-beta Phase 2 中插入 conditional section，对没有 Figma designs 的 UI tasks 加载 `frontend-design` skill，并修复 duplicate item numbering。

  **需求：** R10, R11

  **依赖：** Unit 1（skill 必须以新形式存在，引用才有意义）

  **文件：**
- Modify（修改）: `plugins/compound-engineering/skills/ce-work-beta/SKILL.md`

  **做法：**
  - 在 Figma Design Sync（line 217）后、Track Progress（line 219）前插入 new section
  - New section 标题为 "Frontend Design Guidance"（if applicable），遵循与 Figma Design Sync 相同的 conditional "(if applicable)" pattern
  - 内容：UI task detection heuristic（implementation files 包含 views/templates/components/layouts/pages、创建 user-visible routes、plan text 含 UI/frontend/design language，或 task 构建 browser 中 user-visible 的东西）+ 加载 `frontend-design` skill 的 instruction + skill 的 verification screenshot 满足 Phase 4 screenshot requirement 的说明
  - 修复 duplicate "6." numbering：Figma Design Sync = 6，Frontend Design Guidance = 7，Track Progress = 8
  - 加法保持在约 10 行，包括 heuristic 和 verification-reuse note
  - 使用 semantic skill reference："load the `frontend-design` skill"（不是 slash syntax）

  **遵循的模式：**
  - 现有 Figma Design Sync section（lines 210-217）-- 同样的 conditional "(if applicable)" pattern，同样简洁

  **测试场景：**
  - New section 遵循与 Figma Design Sync 相同的 formatting
  - Phase 2 中无 duplicate item numbers
  - 使用 semantic skill reference（无 frontend-design slash syntax）
  - 明确说明 verification screenshot reuse
  - `bun run release:validate` passes

  **验证：**
  - Phase 2 items 按顺序编号，无 duplicates
  - New section 以 semantic 方式引用 `frontend-design` skill
  - verification-reuse note 存在
  - `bun run release:validate` passes

## 系统级影响

- **Interaction graph:** frontend-design skill 可 auto-invocable（没有 `disable-model-invocation`）。加载后可能与 agent-browser CLI（用于 verification screenshots）、browser MCP tools 或 existing project browser tooling 交互。ce-work-beta Phase 2 会 conditional trigger skill load。design-iterator agent 的 `<frontend_aesthetics>` block 会在 skill 与 agent 同时 active 时被 supersede。
- **Error propagation:** 如果 browser tooling 不可用于 verification，skill 会 fallback 到 mental review。没有 hard failure path。
- **State lifecycle risks:** 无。这是 markdown document work -- 无 runtime state、无 data、无 migrations。
- **API surface parity:** skill description change 会影响 Claude 发现和触发该 skill 的方式。新 description 更宽（覆盖 existing app modifications），可能提升 trigger rate。
- **Integration coverage:** 主要 integration 是 ce-work-beta -> frontend-design skill -> agent-browser。该 flow 应通过 beta workflow 中的 UI task 进行一次 end-to-end manual test。

## 风险与依赖

- **Trigger rate change:** 更宽的 description 可能让 skill 对边缘情况触发（例如只碰一个 CSS class 的 task）。Layer 0 detection step 可缓解：它会快速识别 "existing system" mode 并短路大多数 opinionated guidance。
- **Skill length:** 估计 300-400 行，对 skill body 来说较长。Layered architecture 可缓解 -- "existing system" mode 中的 agent 可完全跳过 Layer 2 opinionated sections。
- **design-iterator overlap:** design-iterator 的 `<frontend_aesthetics>` block 现在部分重复 skill 的 Layer 2 content。功能上不是问题（skill 加载时 supersedes 它），但带来 maintenance overhead。标记为 follow-up cleanup。

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-03-22-frontend-design-skill-improvement.md](docs/brainstorms/2026-03-22-frontend-design-skill-improvement.md)
- Related code（相关代码）: `plugins/compound-engineering/skills/frontend-design/SKILL.md`, `plugins/compound-engineering/skills/ce-work-beta/SKILL.md`
- External inspiration（外部灵感）: Anthropic official frontend-design skill, OpenAI "Designing Delightful Frontends with GPT-5.4" skill（March 2026）
- Institutional learnings（机构经验）: `docs/solutions/skill-design/compound-refresh-skill-improvements.md`, `docs/solutions/skill-design/beta-skills-framework.md`, `docs/solutions/codex-skill-prompt-entrypoints.md`
