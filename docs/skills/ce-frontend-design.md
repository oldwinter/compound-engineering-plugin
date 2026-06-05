# `ce-frontend-design`（前端设计）

> 构建真正有设计质量的 web interfaces，而不是 AI slop。检测 existing design systems，有意图地 plan、build，然后 visually verify。

`ce-frontend-design` 是 **design-quality** skill。AI 容易滑向 generic SaaS aesthetics：purple-on-white、Inter font、card-grid hero、decorative gradients，以及听起来像 prompt-language 泄漏到 UI 的 copy。此 skill 用 explicit defaults 抵消这种倾向；用户（或 existing design system）可以 override。它用 structured pre-build planning 强制形成 visual thesis，并在宣称 done 前做 visual verification。它适用于 greenfield builds 和 existing apps 的修改；存在 design system 时会 auto-detect 并让位。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 检测 existing design system，带 visual thesis 做 design plan，按 intentional defaults build，并 visually verify |
| 何时使用 | 任何 frontend work：landing pages、web apps、dashboards、admin panels、components、interactive experiences |
| 产出什么 | 匹配 existing design system（Module C）或 distinctive greenfield aesthetics（Module A 或 B）的 frontend code |
| 权威层级 | Existing system > user instructions > skill defaults |

---

## 问题

AI-generated frontend 会塌缩成一种可识别形状：

- **Generic SaaS aesthetic**：purple-on-white、Inter font、card-grid hero，每个 dashboard 都像同一个 tutorial template
- **Cards everywhere**：即使 layout 不需要，也误把 cards 当作 "structure" 的默认
- **Hero sections cluttered**：stats、schedules、pill clusters、logo clouds 同时抢 attention
- **Decorative gradients** 替代真实 visual content
- **Prompt language** 泄漏到 UI：例如 "Experience the seamless integration"
- **Mode bias**：purple-on-white default、dark-mode default，从不变化
- **Yields to nothing**：agents 要么忽略 existing design system，要么 bulldoze through it
- **No verification**：build 页面后宣称 done，却从不检查实际观感

## 方案

`ce-frontend-design` 把 frontend work 作为带 explicit defaults 和 verification 的 structured pass：

- **Layer 0: Context Detection**：扫描 existing design tokens、component libraries、CSS frameworks、typography、color palettes、animation libraries；分类为 Existing system、Partial system、Greenfield 或 Ambiguous
- **Layer 1: Pre-Build Planning**：任何 code 前写三个短 statements（visual thesis、content plan、interaction plan）；用户可在写 code 前 redirect
- **Layer 2: Design Guidance Core**：typography、color、composition、motion、accessibility、imagery 的 opinionated defaults；每项都让位于 existing system
- **Context Modules**：Module A（Landing pages）、Module B（Apps & dashboards）、Module C（Components in existing apps；existing-app work 的 default）
- **Hard Rules & Anti-Patterns**：可 override defaults 加真正 quality floor（broken contrast、missing focus states、semantic div soup）
- **Visual Verification**：用 project existing browser tooling 或 `agent-browser` 做一轮 against visual thesis 的 assessment

---

## 独特之处

### 1. Authority hierarchy：让位于 existing systems

Skill 中每条 rule 都是 default，不是 mandate。优先级：

1. **Existing design system / codebase patterns**：最高优先级，始终尊重
2. **用户的 explicit instructions**：override skill defaults
3. **Skill defaults**：用于 greenfield work，或用户请求 guidance 时

在有 established patterns 的 existing codebase 中工作时，遵循这些 patterns。当用户指定矛盾方向时，遵循用户。Skill 的 opinions 只在没有其他依据时应用。

### 2. Layer 0: Context Detection（上下文检测）：explicit signals（显式信号）

任何 design work 前，skill 扫描 codebase 中的 design signals：

- Design tokens / CSS variables（设计 tokens / CSS variables；`--color-*`、`--spacing-*`、`--font-*`）
- Component libraries（组件库；shadcn、MUI、Chakra、Radix、Ant Design、project-specific dirs）
- CSS frameworks（CSS frameworks / CSS 框架；`tailwind.config.*`、styled-components themes、CSS modules）
- Typography（字体与排版；`@font-face`、Google Fonts links）
- Color palettes（色板；defined scales、brand color files、design token exports）
- Animation libraries（动画库；Framer Motion、GSAP、anime.js、Motion One、Vue Transition）
- Spacing/layout patterns（间距 / 布局模式；consistent scale usage、grid systems）

基于 signals 分类为 **Existing system**（4+ signals；defer to it；aesthetic opinions yield）、**Partial system**（1-3 signals；follow what exists，defaults fill gaps）、**Greenfield**（no signals；full guidance applies）或 **Ambiguous**（询问用户）。

### 3. Layer 1: Pre-Build Planning：需要 visual thesis

写 code 前，skill 写三个短 statements：

- **Visual thesis**：一句话描述 mood、material 和 energy（"Clean editorial feel, lots of whitespace, serif headlines, muted earth tones"）
- **Content plan**：页面放什么、顺序如何（landing：hero / support / detail / CTA；apps：primary workspace / nav / inspector；components：states）
- **Interaction plan**：2-3 个具体 motion ideas（"staggered fade-in on hero load, parallax on scroll between sections, scale-up on card hover"，不是 vague "add animations"）

这些给用户一个在 code 写入前 redirect 的 checkpoint；此时纠正成本很低。跳过这步正是 AI ship generic SaaS template 的原因。

### 4. Three context modules：不同 surfaces 用不同 patterns

| Module | When | Defaults |
|--------|------|----------|
| **A: Landing & Marketing** | Greenfield landing page | Hero（one composition，不是 dashboard）、support、detail、final CTA。Brand first、headline second。<=6 sections。Copy：让 headline 承载；一个短 supporting sentence。 |
| **B: Apps & Dashboards** | Greenfield app/dashboard | Calm surface hierarchy、strong typography & spacing、few colors、dense but readable、minimal chrome。只有 card *本身就是 interaction* 时才用 cards。Copy：utility，不是 marketing。 |
| **C: Components & Features** | Existing app（default） | 匹配 existing visual language。继承 spacing、radius、color tokens、typography。关注 interaction quality（clear states、smooth transitions、obvious affordances）。不要因为一个 component 引入新 design system。 |

在 existing application 内工作时，无论 feature 是什么都默认 Module C。目标不是 stand out，而是 fit in。

### 5. Default-against（可 override）vs Always-avoid（quality floor）

Skill 区分 opinions 和 quality failures：

**Default against（可 override）：**

- Generic SaaS card grid 作为 first impression
- Purple-on-white、dark-mode bias（紫白配色 / dark-mode 偏置）
- Greenfield 中过度使用 fonts（Inter、Roboto、Arial、Space Grotesk、system defaults）
- Hero sections 被 stats/pills/logos 塞满
- 没有 narrative purpose 的 carousels
- 多个 competing accent colors
- Decorative gradients 替代真实 visual content
- 听起来像 design commentary 的 copy（"Experience the seamless integration"）
- Text 放在 busy side of image 的 split-screen heroes

**Always avoid（quality floor，质量底线）：**

- Prompt language 或 AI commentary 泄漏到 UI
- Broken contrast：text 在 images 或 backgrounds 上不可读
- Interactive elements 没有 visible focus states
- 有 proper HTML elements 时仍使用 semantic div soup

用户可以 override 第一组。第二组 non-negotiable：这些是没人想要的 quality failures。

### 6. Visual verification 前的 litmus checks（快速判断）

启动 visual verification 前，skill 做快速 self-review：

- Brand 或 product 是否在 first screen unmistakable？
- 是否有一个 strong visual anchor？
- 只扫 headlines 能否理解页面？
- 每个 section 是否只有一个 job？
- Cards 被使用的位置是否真的必要？
- Motion 是否改善 hierarchy 或 atmosphere，还是只是存在？
- 如果移除所有 decorative shadows，design 是否仍 premium？
- Copy 是否像 product，而不是 prompt？

这些 gates 防止 ship 通过不了 basic legibility 和 intent tests 的 work。

### 7. Visual verification with tool preference cascade（按工具优先级做视觉验证）

实现后，skill 会 visually verify：sanity check，不是 pixel-perfect review。Tool preference：

1. **Existing project browser tooling**：deps 中已有 Playwright、Puppeteer、Cypress；使用它
2. **Browser MCP tools**：可用时使用
3. **`agent-browser` CLI**：fallback；未安装时提示 "run `/ce-setup`"
4. **Mental review**：无法 browser access 时，用 litmus checks 做 self-review，并说明 visual verification skipped

一轮 iteration。截图，against litmus checks 评估，修复 glaring issues，然后继续。Multi-round iterative refinement 由 `ce-design-iterator` agent 处理。

### 8. Creative energy：bold direction over formula（大胆方向优先于公式化）

对 greenfield work，skill 明确鼓励 commit 到 bold aesthetic direction。可能 tones：brutally minimal、maximalist、retro-futuristic、organic/natural、luxury/refined、playful、editorial、brutalist、art deco、soft/pastel、industrial，或 invent something。重点不是 weird，而是避免产生 undifferentiated AI output 的 formula。

> Match implementation complexity to the aesthetic vision. Maximalist designs need elaborate code with extensive animations. Minimalist designs need restraint, precision, and careful attention to spacing, typography, and subtle details.（实现复杂度要匹配 aesthetic vision；maximalist designs 需要更丰富的代码和动画，minimalist designs 需要克制、精确，并仔细处理 spacing、typography 与 subtle details。）

---

## 快速示例

你正在为一个 new product 构建 landing page，repo 没有 existing conventions。调用 `/ce-frontend-design "build a landing page for a notion-style note-taking app"`。

Layer 0：扫描 empty repo。Greenfield。没有 existing system 可让位；full guidance applies。

Layer 1 写出三个 statements：

- **Visual thesis（视觉论点）**："Quiet, thoughtful, almost paper-like — warm cream background with deep ink black, serif headline, soft fade-in transitions. Material: paper, not glass."
- **Content plan（内容计划）**：hero with product name + one-line promise + soft visual；one feature deep-dive；one quote from a user；final CTA
- **Interaction plan（交互计划）**：staggered fade-in on hero text load、gentle parallax between sections、hover-lift on CTA button

你 confirm 或 redirect。批准后，skill 开始 build。Module A（Landing & Marketing）提供 patterns。它选择 serif display font（不是 Inter），使用 constrained palette（cream、ink、one accent），并让 hero 成为 single composition。

实现后，skill 跑 litmus checks，再用 `agent-browser` visually verify。Screenshot coherent。Hero supporting copy 有一句像 prompt-language（"Experience effortless thought capture"），违反 quality-floor。改成 "A note-taking app that stays out of your way." 重新 screenshot。完成。

---

## 何时使用

在以下情况使用 `ce-frontend-design`：

- 正在构建 landing page、app、dashboard 或 component，并希望结果 distinctive（不是 AI-generic）
- 想要 existing design system detection：让位于已有系统，只填补 gaps
- 想先有 structured visual-thesis-first plan，而不是直接写 code
- 想要 litmus checks 和 visual verification step

以下情况跳过 `ce-frontend-design`：

- Work 非 frontend（API、backend、scripts）：scope 错
- 有 fixed Figma spec，需要 exact translation：`ce-design-iterator` 或 design-sync agent 更合适
- Change mechanical（机械变更，例如 copy typo、single-line CSS tweak）：overkill

---

## 作为 Workflow 的一部分使用

`ce-frontend-design` 多数直接在 frontend work 开始时调用，但也与以下流程互锁：

- **`/ce-work` Phase 2**：实现 frontend feature 时，此 skill 提供 design pass
- **`/ce-polish`**：feature functional 后做 late-stage UX refinement；complementary，不是 substitute
- **`ce-design-iterator` agent**：超过单轮 visual-verification pass 的 multi-round iterative refinement
- **`ce-design-implementation-reviewer` agent**：验证 UI 是否匹配 Figma design

Skill output 是 frontend code；downstream skills 处理 commit、PR、polish 和 review。

---

## 单独使用

直接调用：

- **Greenfield landing（全新 landing page）**：`/ce-frontend-design "build a landing page for X"`
- **App / dashboard（应用 / dashboard）**：`/ce-frontend-design "build a settings dashboard"`
- **Component（组件）**：`/ce-frontend-design "build a NotificationToggle component"`
- **Modification（修改）**：`/ce-frontend-design "redesign the pricing page"`（existing app；auto-detects）

Skill 会 auto-detect context。Pre-build planning（Layer 1）是用户在 code commit 到某方向前 redirect 的 checkpoint。

---

## 参考

| Layer | Purpose |
|-------|---------|
| 0 | Context Detection：扫描 design signals；分类 Existing / Partial / Greenfield / Ambiguous |
| 1 | Pre-Build Planning：visual thesis、content plan、interaction plan；用户 redirect checkpoint |
| 2 | Design Guidance Core：typography、color、composition、motion、accessibility、imagery defaults |
| Modules | A（Landing）、B（Apps/Dashboards）、C（Components in existing apps；existing-app work default） |
| Verification | Litmus checks -> browser tool cascade 做 visual verification |

---

## 常见问题

**为什么它要让位于 existing design systems？**
因为 existing system 是 deliberate choice，匹配它会产生 fits 的 work；比打破一致性的 beautiful greenfield design 更好。Skill opinions 用于 greenfield 或 gap-filling，绝不用于 override established patterns。

**为什么需要三个 pre-build statements？**
因为在写 code 前捕捉错误方向，比写完后便宜得多。三个 statements（thesis、content、interaction）很短，2 分钟写完、几秒即可 redirect。跳过它们就是 AI ship generic templates 的原因。

**为什么分 "Default against" 和 "Always avoid"？**
Defaults 可由用户 override（purple-on-white 不是 quality bug，只是 skill 在 greenfield 中抵制的 default）。Always-avoid 是 quality floor（broken contrast 就是 bug，没人想要）。这个 split 让用户 override 清晰：用户可以要求 purple-on-white，但不能要求 broken contrast。

**Figma-pixel-perfect work 怎么办？**
这是不同 scope。此 skill 目标是 distinctive、production-grade design with self-verification。Pixel-perfect Figma matching 应使用 `ce-design-implementation-reviewer` agent 或 `ce-figma-design-sync` agent。

**可以 multi-round iteration 吗？**
此 skill 做一轮 visual-verification pass。Multi-round refinement 由 `ce-design-iterator` agent 处理；`/ce-frontend-design` 提供 foundation，iterator 负责 polish。

**如果 project 有 1-3 个 design signals（Partial）怎么办？**
遵循已有内容；只在未检测到 convention 的 areas 使用 skill defaults。例如 Tailwind 已配置（spacing/colors 遵循它），但没有 component library；那就应用 skill 的 component-structure guidance。

---

## 另见

- [`/ce-work`](./ce-work.md) - frontend implementation 期间调用此 skill
- [`/ce-polish`](./ce-polish.md) - feature functional 后的 late-stage UX refinement
- [`/ce-test-browser`](./ce-test-browser.md) - design pass 后验证 implementation works
- [`/ce-demo-reel`](./ce-demo-reel.md) - 捕获 PR descriptions 的 visual evidence
