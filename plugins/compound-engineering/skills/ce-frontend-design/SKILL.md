---
name: ce-frontend-design
description: '构建真正有设计质量的 web interfaces，而不是 AI slop。用于任何 frontend work：landing pages、web apps、dashboards、admin panels、components、interactive experiences。greenfield builds 和修改现有 applications 时都会激活。检测并尊重 existing design systems。覆盖 composition、typography、color、motion 和 copy。在宣称完成前通过 screenshots 验证结果。'
---

# Frontend Design（前端设计）

指导创建有辨识度、production-grade 的 frontend interfaces，避免 generic AI aesthetics。此 skill 覆盖完整 lifecycle：检测现有内容、规划设计、有意图地构建，并进行视觉验证。

## 权威层级

此 skill 中的每条规则都是 default，不是 mandate。

1. **Existing design system / codebase patterns** -- 最高优先级，始终尊重
2. **User's explicit instructions** -- 覆盖 skill defaults
3. **Skill defaults** -- 适用于 greenfield work，或用户要求 design guidance 时

在带有 established patterns 的 existing codebase 中工作时，遵循那些 patterns。当用户指定的方向与 default 矛盾时，遵循用户。

## Workflow（工作流）

```
Detect context -> Plan the design -> Build -> Verify visually
```

---

## Layer 0：Context Detection（上下文检测）

在任何 design work 前，检查 codebase 中的 existing design signals。这决定 skill 中带主张的 guidance 有多少适用。

### 要查找什么

- **Design tokens / CSS variables（设计 tokens / CSS variables）**：`--color-*`、`--spacing-*`、`--font-*` custom properties、theme files
- **Component libraries**：shadcn/ui、Material UI、Chakra、Ant Design、Radix，或项目专用 component directories
- **CSS frameworks**：`tailwind.config.*`、`styled-components` theme、Bootstrap imports、命名一致的 CSS modules
- **Typography**：HTML/CSS 中的 font imports、`@font-face` declarations、Google Fonts links
- **Color palette**：已定义的 color scales、brand color files、design token exports
- **Animation libraries（动画库）**：Framer Motion、GSAP、anime.js、Motion One、Vue Transition imports
- **Spacing / layout patterns**：一致使用的 spacing scale、grid systems、layout components

使用平台原生 file-search 和 content-search tools（例如 Claude Code 中的 Glob/Grep）扫描这些 signals。不要为了 routine file exploration 使用 shell commands。

### Mode Classification（模式分类）

基于检测到的 signals，选择 mode：

- **Existing system**（跨多个 categories 有 4+ signals）：让位给它。skill 的 aesthetic opinions（typography、color、motion）服从 established system。结构性 guidance（composition、copy、accessibility、verification）仍适用。
- **Partial system**（1-3 signals）：遵循已有内容；只在未检测到 convention 的区域应用 skill defaults。例如，如果 Tailwind 已配置但没有 component library，就遵循 Tailwind tokens，并对 component structure 应用 skill guidance。
- **Greenfield**（未检测到 signals）：完整 skill guidance 适用。
- **Ambiguous**（signals 矛盾或不清楚）：继续前询问用户。

### 询问用户

当 context ambiguous 时，使用平台的 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中呈现 options；不要仅因为需要加载 schema 就退回。绝不要静默跳过。如果用户拒绝选择，假设为 "partial" mode 并保守继续。

Example question（示例问题）："I found [detected signals]. Should I follow your existing design patterns or create something distinctive?"

---

## Layer 1：Pre-Build Planning（构建前规划）

写代码前，写三段简短 statement。它们创造 coherence，并在代码写入前给用户一个可 redirect 的 checkpoint。

1. **Visual thesis（视觉主张）** -- 用一句话描述 mood、material 和 energy
   - Greenfield examples（greenfield 示例）："Clean editorial feel, lots of whitespace, serif headlines, muted earth tones" 或 "Dense data-forward dashboard, monospace accents, dark surface hierarchy"
   - Existing codebase：描述 *existing* aesthetic，以及新工作如何 extend 它

2. **Content plan（内容计划）** -- 页面上放什么，以及顺序
   - Landing page（landing page，落地页）：hero、support、detail、CTA
   - App（app，应用）：primary workspace、nav、secondary context
   - Component：它有哪些 states、传达什么

3. **Interaction plan（交互计划）** -- 2-3 个会改变 feel 的具体 motion ideas
   - 不是 "add animations"，而是 "staggered fade-in on hero load, parallax on scroll between sections, scale-up on card hover"
   - 在 existing codebase 中，只描述正在添加的 interactions，并使用 existing motion library

---

## Layer 2：Design Guidance Core（设计指导核心）

这些 principles 适用于所有 context types。每条都会根据权威层级让位于 existing design systems 和用户指令。

### Typography（排版）

- 选择有辨识度、有性格的 fonts。除非 existing codebase 使用它们，否则避免 usual suspects（Inter、Roboto、Arial、system defaults）。
- 如果没有明确理由，最多两种 typefaces。将 display/headline font 与 body font 搭配。
- *Layer 0 检测到 existing font choices 时让位给它们。*

### Color & Theme（色彩与主题）

- 使用 CSS variables 坚定采用 cohesive palette。一个 dominant color 加鲜明 accents，胜过胆怯且平均分布的 palettes。
- 不要 purple-on-white bias，也不要 dark-mode bias。根据 context 在 light 和 dark 之间变化。
- 默认使用一个 accent color，除非产品已有 multi-color system。
- *检测到 existing color tokens 时让位给它们。*

### Composition（构图）

- 从 composition 开始，而不是 components。将 first viewport 当作 poster，而不是 document。
- 添加 chrome（borders、shadows、cards）前，先使用 whitespace、alignment、scale、cropping 和 contrast。
- 默认 cardless layouts。当 cards 作为 user interaction 的 container（clickable item、draggable unit、selectable option）时允许使用。如果移除 card styling 不会伤害 comprehension，它就不该是 card。
- *所有 composition rules 都是 defaults。用户可以 override。*

### Motion（动效）

- 对 visually-led work，ship 2-3 个 intentional motions：一个 entrance sequence、一个 scroll-linked 或 depth effect、一个 hover/reveal transition。
- 如果项目已有 animation library，使用它。
- 如果未找到 existing library，使用 framework-conditional defaults：
  - **CSS animations** 作为 universal baseline
  - React projects 使用 **Framer Motion**
  - Vue projects 使用 **Vue Transition / Motion One**
  - Svelte projects 使用 **Svelte transitions**
- Motion 应该在快速 recording 中可见、在 mobile 上顺滑，并在页面内一致。如果纯粹 ornamental，就移除。

### Accessibility（可访问性）

- 默认使用 semantic HTML：`nav`、`main`、`section`、`article`、`button`，而不是一切都用 div。
- Color contrast 满足 WCAG AA minimum。
- 所有 interactive elements 都有 focus states。
- 做得好时，accessibility 与 aesthetics 并不冲突。

### Imagery（图像）

- 需要 images 时，优先使用 real 或 realistic photography，而不是 abstract gradients 或 fake 3D objects。
- 选择或生成带 stable tonal area 的 images，用于 text overlay。
- 如果 environment 中有 image generation tools，使用它们创建 contextually appropriate visuals，而不是 placeholder stock。

---

## Context Modules（上下文模块）

选择与正在构建内容匹配的 module。在 existing application 内工作时，无论 feature 是什么，默认使用 Module C。

### Module A：Landing Pages & Marketing（landing pages 与 marketing，Greenfield）

**Default section sequence（默认 section 顺序）：**
1. Hero -- brand/product、promise、CTA、一个 dominant visual
2. Support -- 一个 concrete feature、offer 或 proof point
3. Detail -- atmosphere、workflow、product depth 或 story
4. Final CTA -- convert、start、visit 或 contact

**Hero rules（默认规则）：**
- 一个 composition，而不是 dashboard。Full-bleed image 或 dominant visual plane。
- Brand first、headline second、body third、CTA fourth（先 brand，再 headline，再 body，最后 CTA）。
- 保持 text column 狭窄，并锚定到 image 的 calm area。
- 没有明确理由时，总 sections 不超过 6 个。
- 一个 H1 headline。above the fold 一个 primary CTA。

**Copy（文案）：**
- 让 headline 承载 meaning。Supporting copy 通常是一句短句。
- 使用 product language，而不是 design commentary。UI 中不要出现 prompt language 或 AI commentary。
- 每个 section 只有一个 job：explain、prove、deepen 或 convert。
- 每个句子都应该值得存在。默认 copy 更少，而不是更多。

### Module B：Apps & Dashboards（apps 与 dashboards，Greenfield）

**Default patterns（默认模式）：**
- Calm surface hierarchy、强 typography 和 spacing、少量 colors、dense but readable information、minimal chrome。
- 围绕这些组织：primary workspace、navigation、secondary context/inspector，以及一个清晰 action 或 state accent。
- 只有当 card 本身就是 interaction（clickable item、draggable unit、selectable option）时才使用 cards。如果 panel 变成 plain layout 也不丢失 meaning，移除 card treatment。

**Copy（utility，而不是 marketing）：**
- 优先 orientation、status 和 action，而不是 promise、mood 或 brand voice。
- Section headings 应说明该区域是什么，或用户能在那里做什么。好例子："Plan status", "Search metrics"。坏例子："Unlock Your Potential"。
- 如果某句话可以出现在 homepage hero 中，重写它，直到它听起来像 product UI。
- Litmus：如果 operator 只扫 headings、labels 和 numbers，是否能立即理解页面？

### Module C：Components & Features（components 与 features，Existing Apps 默认）

向 existing application 添加内容时：

- 匹配 existing visual language。此 module 关注的是让东西属于这里，而不是让它突出。
- 从 surrounding code 继承 spacing scale、border radius、color tokens 和 typography。
- 聚焦 interaction quality：清晰 states（default、hover、active、disabled、loading、error）、states 之间的 smooth transitions、明显 affordances。
- 一个 new component 不应引入 new design system。如果 existing app 使用 4px border radius，不要添加 8px 的 component。

---

## Hard Rules & Anti-Patterns（硬规则与反模式）

### Default Against（可覆盖）

这些是 skill 的 opinionated 部分。用户可以 override 其中任何一条。

- 以 generic SaaS card grid 作为 first impression
- Purple-on-white color schemes（紫白配色）、dark-mode bias（深色模式偏置）
- greenfield work 中使用 overused fonts（Inter、Roboto、Arial、Space Grotesk、system defaults）
- Hero sections 被 stats、schedules、pill clusters、logo clouds 塞满
- 用不同措辞重复同一个 mood statement 的 sections
- 没有 narrative purpose 的 carousel
- 多个相互竞争的 accent colors
- 用 decorative gradients 或 abstract backgrounds 代替真实 visual content
- 听起来像 design commentary 的 copy（"Experience the seamless integration"）
- text 位于 image busy side 的 split-screen heroes

### Always Avoid（质量底线）

这些是真正的 quality failures，没有用户会想要。

- Prompt language 或 AI commentary 泄露到 UI 中
- Broken contrast：text 在 images 或 backgrounds 上不可读
- Interactive elements 没有 visible focus states
- 明明有 proper HTML elements，却做成 semantic div soup

---

## Litmus Checks（快速检验）

进入 visual verification 前的快速 self-review。并非所有 checks 都适用于每个 context：判断哪些 relevant。

- brand 或 product 是否在 first screen 中 unmistakable？
- 是否有一个 strong visual anchor？
- 只扫 headlines 是否能理解页面？
- 每个 section 是否只有一个 job？
- 使用 cards 的地方，它们是否真的必要？
- motion 是否改善 hierarchy 或 atmosphere，还是只是存在？
- 如果移除所有 decorative shadows，design 是否仍感觉 premium？
- copy 是否听起来像 product，而不是 prompt？
- new work 是否匹配 existing design system？（Module C）

---

## Visual Verification（视觉验证）

实现后，进行 visual verification。这是 sanity check，不是 pixel-perfect review。一轮即可。如果有 glaring issue，修复它。如果看起来 solid，就继续。

### Tool Preference Cascade（工具优先级）

使用第一个可用选项：

1. **Existing project browser tooling（现有项目浏览器工具）** -- 如果 Playwright、Puppeteer、Cypress 或类似工具已经在项目 dependencies 中，使用它。不要只为 verification 引入 new dependencies。
2. **Browser MCP tools（Browser MCP 工具）** -- 如果 agent environment 中有 browser automation tools（例如 claude-in-chrome），使用它们。
3. **agent-browser CLI** -- 如果没有其他可用项且已安装 `agent-browser`，使用它。如果未安装，告知用户："`agent-browser` is not installed. Run `/ce-setup` to install required dependencies." 然后跳到下一选项。
4. **Mental review（心智检查）** -- 如果无法 browser access（headless CI、无安装权限），将 litmus checks 用作 self-review，并注明 visual verification 被跳过。

### 要评估什么

- output 是否匹配 pre-build plan 中的 visual thesis？
- 是否有 obvious visual problems（broken layout、unreadable text、missing images）？
- 它是否符合 context module 的意图（landing page 感觉像 landing page、dashboard 感觉像 dashboard、component 融入 surroundings）？

### Scope Control（范围控制）

一轮 iteration。截图，对照 litmus checks 评估，修复任何 glaring issues，然后继续。在 deliverable（PR description、conversation output 等）中包含 screenshot。

对于超出单轮的 iterative refinement（多轮 screenshot-assess-fix），见 `ce-design-iterator` agent。

---

## Creative Energy（创造性能量）

此 skill 提供 structure，但目标是避免 AI slop 的 distinctive work，而不是 formulaic output。

对于 greenfield work，坚定采用 bold aesthetic direction。考虑 tone：brutally minimal、maximalist、retro-futuristic、organic/natural、luxury/refined、playful、editorial、brutalist、art deco、soft/pastel、industrial，或发明一个适合 context 的方向。flavors 无穷无尽。把这些当灵感，但设计一个真实契合项目的方向。

询问：什么让它 unforgettable？别人会记住的一件事是什么？

让 implementation complexity 匹配 aesthetic vision。Maximalist designs 需要 elaborate code、丰富 animations 和 effects。Minimalist designs 需要 restraint、precision，以及对 spacing、typography 和 subtle details 的细致关注。Elegance 来自把 vision 执行好，而不是来自强度。
