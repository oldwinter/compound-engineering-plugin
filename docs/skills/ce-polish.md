# `ce-polish`

> 启动 dev server，在 browser 中打开 feature，然后一起迭代：你说哪里感觉不对，agent 落地 fixes。

`ce-polish` 是 **conversational UX polish** skill。它会自动检测 dev-server setup（或读取 `.claude/launch.json`），在后台启动 server，通过 IDE preferred mechanism 在 browser 中打开 feature，然后进入紧凑 iteration loop：你描述要修什么，change 落地，hot-reload 生效，如此重复直到满意。没有 checklist，没有 envelope；就是 conversation 配一个 running browser。

这个 skill 是 **manual-invocation only**（`disable-model-invocation: true`）。它只会在你通过 slash command 明确调用时触发，绝不会 auto-trigger。Polish 会启动 dev server 并运行 branch code，因此必须是 deliberate user choice。Framework auto-detection 覆盖较广（Rails / Next / Vite / Nuxt / Astro / Remix / SvelteKit / Procfile），但 polish loop 有意保持 minimal。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 启动 dev server、在 browser 中打开 feature，并通过 conversation 迭代 UX/visual polish |
| 何时使用？ | 已经能工作的 feature 的 late-stage UX polish；很难提前写清的 visual 或 interaction refinement |
| 产出什么？ | 当前 branch 上 committed fixes（默认不创建 PR；之后使用 `/ce-commit-push-pr`） |
| 状态 | Stable；manual invocation only |

---

## 问题

Late-stage UX polish 不太适合其他 skills：

- **Pre-implementation review** 不适用：feature 已经工作，你是在 refine feel
- **Code review** 角度不对：你不需要 static analysis，而是需要 *use* the thing
- **Chat 里的 static screenshots 不够**：interaction、hover states、transitions、edge-case data 都需要真实 session
- **写 polish plan 太重**：等你列完 issues，可能已经能修三个了
- **Manual loop 太多 handoffs**：启动 dev server、打开 browser、把 screenshots 贴回 chat、描述 issue、看 fix、refresh

## 解决方案

`ce-polish` 把 loop 压缩起来：

- **Phase 0** 选择正确 branch（PR number、branch name 或 current）
- **Phase 1** 启动 dev server（auto-detect framework 或读取 `.claude/launch.json`），并在 IDE preferred browser surface 中打开 feature
- **Phase 2** 是 conversation：你描述要修什么，agent 修改，hot-reload 生效，你继续指出下一件事

没有 decision tree，没有 envelope，没有 scoring rubric；只有 running iteration。Skill 处理无聊部分（resolve port、选择 package manager、route 到 framework start command、打开正确 browser），让你把时间花在 polish，而不是 plumbing。

---

## 新颖之处

### 1. 跨 8 种 frameworks 的 auto dev-server detection

Skill 通过 `scripts/detect-project-type.sh` 检测 project type（Rails、Next.js、Vite、Nuxt、Astro、Remix、SvelteKit、Procfile-based），并 route 到匹配 recipe（`references/dev-server-<framework>.md`）。每个 recipe 包含该 framework 的 typical start command、port defaults 和 quirks。对于 unknown projects，skill 会询问如何 start。

### 2. `.claude/launch.json` override（覆盖配置）

如果 project 有 `.claude/launch.json`，skill 会使用该 configuration，而不是 auto-detect；你已经告诉 skill 如何启动 project，它不需要猜。Schema 记录在 `references/launch-json-schema.md`。

### 3. IDE-aware browser handoff（感知 IDE 的 browser 交接）

Skill 通过 env-var probes（`references/ide-detection.md`）检测 host IDE（Claude Code、Cursor、VS Code），并用匹配机制打开 dev server URL：Claude Code 用 `open`，Cursor 用 built-in browser，VS Code 用 Simple Browser。正确 environment 用正确 surface，不需要 manual juggling。

### 4. Conversational iteration：没有 checklist

Phase 2 是 polish loop。用户描述要修什么；agent 修改；dev server hot-reload；用户看结果并说下一件事。当 `agent-browser` 已安装时，agent 可按请求截图或 inspect page。当用户说完成时，fixes 会被 commit。

> 没有 checklist。没有 envelope。只有 conversation。

这不是偷懒，而是 late-stage polish 的正确形状。固定 checklist 会让工作像 audit；conversation 会让它像 collaborative refinement。

### 5. 带 health probe 的 background dev server

Dev server 会在后台启动，output 记录到 temp file。Skill 最多 probe `http://localhost:<port>` 30 秒。如果 server 没起来，它会展示 log 最后 20 行并询问下一步，而不是 silent wait 或继续打开 dead URL。

### 6. Manual invocation only（仅手动调用）

Frontmatter 中的 `disable-model-invocation: true` 防止 skill auto-trigger。Polish 是 deliberate user choice；只有当你直接输入 `/ce-polish` 时才触发。这避免用户只是想看页面时被意外启动 dev server。

---

## 快速示例

你刚完成 notification settings page。它能工作，但 spacing 感觉不对，toggle states 不够清晰，empty-state copy 有点干。调用 `/ce-polish`。

Skill 验证你在 feature branch（不是 main），检查 `.claude/launch.json`（没有），运行 `detect-project-type.sh`（检测到 `next`），读取 `references/dev-server-next.md` 获取 start command，通过 `resolve-package-manager.sh` 解析 package manager（pnpm），选择 port 3000，并在后台启动 `pnpm dev`。4 秒后，`localhost:3000` 有响应。Skill 在 Cursor built-in browser 中打开它。

你浏览到 `/settings/notifications`。你说："toggle rows 之间的 spacing 太紧。" Agent 找到 component，调整 spacing，hot-reload 生效。你说："现在 toggle states 需要更清晰的 affordance，让 off state 看起来更明显是 off。" Agent 更新 component。你浏览 empty state，说："这段 copy 太冷了，让它更温暖一点。" Agent 重写 copy。

你满意了。Agent commit fixes。你继续运行 `/ce-commit-push-pr`。

---

## 何时使用

在以下情况使用 `ce-polish`：

- Feature 已经工作，你在 refine UX/visual feel
- 你能通过 *seeing* 问题来表达，而不是预先写清楚
- Hot-reload + browser-side iteration 胜过替代方案（chat -> screenshot -> describe -> fix -> repeat）
- Change set 是 visual：spacing、copy、transitions、affordances、empty states、micro-interactions

以下情况跳过 `ce-polish`：

- Feature 还没 build：使用 `/ce-work`
- Polish 需要 design specs（Figma comparison、brand-system alignment）：使用 `/ce-frontend-design` 或 dedicated design-sync skill
- 工作不是 frontend（API behavior、backend logic）：没有东西可 browse

---

## 作为工作流的一部分使用

`ce-polish` 在后期调用，即 feature functionally complete 之后：

```text
/ce-work or /ce-debug -> feature works -> /ce-polish -> /ce-commit-push-pr
```

它在 chain 中没有 direct callers；polish 是工作需要 visual refinement 时的 deliberate user invocation。Polish loop 结束后，standard shipping handoff 是用 `/ce-commit-push-pr` 打开 PR。

---

## 单独使用

Skill 总是 standalone 调用：

- **Current branch（当前 branch）**：`/ce-polish`
- **Specific PR（指定 PR）**：`/ce-polish 1234`（checkout PR）
- **Specific branch（指定 branch）**：`/ce-polish feat/notification-settings`

当 framework 不在 auto-detector list 中时，skill 会询问如何 start project。向 repo 添加 `.claude/launch.json` 可为下次持久化答案。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | 使用 current branch |
| `<PR number>` | Check out PR（先 probe existing worktrees） |
| `<branch name>` | Check out branch |

Supporting files（辅助文件）：

- `.claude/launch.json`（project-local override）：schema 在 `references/launch-json-schema.md`
- Framework recipes（framework recipes，框架 recipes）：`references/dev-server-<rails|next|vite|nuxt|astro|remix|sveltekit|procfile>.md`
- IDE detection（IDE detection，IDE 检测）：`references/ide-detection.md`
- Scripts（scripts，脚本）：`scripts/detect-project-type.sh`、`scripts/read-launch-json.sh`、`scripts/resolve-package-manager.sh`、`scripts/resolve-port.sh`

---

## 常见问题（FAQ）

**为什么它是 manual-invocation only？**
Polish 会启动 dev server 并运行 checked-out branch code，这是 side-effecting action，应该是 deliberate choice，而不是 model 在你只是看页面时 auto-fire。`disable-model-invocation: true` 会阻止它被触发，除非你明确调用。想用时输入 `/ce-polish`。

**如果我的 framework 不在 detection list 里怎么办？**
Skill 会询问如何 start project。你可以添加 `.claude/launch.json`，让 future runs 记住答案。

**没有 `agent-browser` 也能用吗？**
可以。Phase 2 仍然是 conversation；agent 只是不能按请求截图或 inspect page。Hot-reload + 你的眼睛仍然很好用。如果希望 agent 在你不描述的情况下 capture state，请安装 `agent-browser`。

**非 Claude Code IDEs 怎么办？**
Skill 会通过 env-var probes 检测 Cursor 和 VS Code，并使用各 IDE preferred browser surface。除此之外 fallback 到 `open`。Framework detection 和 dev-server start 与 IDE 无关。

**为什么最后不创建 PR？**
Polish 往往需要不止一个 session；每次都强制 PR 会造成 clutter。Commit-and-PR 是通过 `/ce-commit-push-pr` 做的独立 user choice。

---

## 另见（See Also）

- [`ce-work`](./ce-work.md) - 先 build feature，再 polish
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - polish 完成后 open PR
- [`ce-frontend-design`](./ce-frontend-design.md) - 从零开始做 high-quality frontend design（scope 不同）
- [`ce-debug`](./ce-debug.md) - polish 中发现 bugs 且需要 root-cause investigation 时使用
