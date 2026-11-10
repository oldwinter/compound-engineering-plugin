# `ce-test-browser`

> 使用当前可用的最佳 approved browser driver，对当前 PR 或 branch 实际改动的页面运行 end-to-end browser tests。

`ce-test-browser` 是按需运行的 browser testing。它把 changed files 映射到 routes，检查（pipeline 模式下启动）dev server，驱动每个受影响的页面，捕获 rendered state 和 screenshots，在 external flows 上暂停等待人工确认，并打印 structured summary。

它只测试并报告。它不是 `ce-dogfood`（会修复小破损并写持久报告的自主 QA），不是 `ce-polish`（你和可运行的功能坐在一起讨论手感），也不是 `ce-test-xcode`（iOS simulator）。

默认是 manual：server 由你负责。`mode:pipeline` 供 `lfg` 等无人值守 runner 使用。

---

## TL;DR（摘要）

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 把 diff 映射到 routes，在 approved browser 中驱动这些页面，并请用户确认 external flows |
| 何时使用 | UI changes 之后、开 PR 之前，或需要"受影响的页面仍然可用"的证据时 |
| 它产出什么 | Per-route status table、console errors、human verifications、screenshots、overall PASS / FAIL / PARTIAL |
| 模式 | Manual（default：由你启动 server）。`mode:pipeline` 自动启动 server 并挑选空闲 port |

---

## 调用示例

PR 与 branch 参数决定选择 routes 所用的 diff，不会切换你的 checkout。请先检出目标代码；manual 模式下还要让它对应的 server 处于运行状态。

```text
# 空参数：routes 来自 git diff main...HEAD。server 由你负责
/ce-test-browser

# 与空参数相同，只是显式写出
/ce-test-browser current

# routes 来自某个 PR 的 file list。不会 checkout 该 PR
/ce-test-browser 847

# routes 来自具名 branch 与 main 的 diff。不会 checkout 该 branch
/ce-test-browser feature/new-dashboard

# Manual 模式，连接已在自定义 port 上运行的 server
/ce-test-browser --port 5000

# 无人值守 / LFG：启动 server，扫描空闲 port，不提问
/ce-test-browser mode:pipeline
```

manual 模式下若没有 server 在监听，skill 会打印启动命令并停止。

---

## The Problem（问题所在）

Browser checks 很容易被跳过，或用错工具：

- 缺少首选 driver 会诱使 agent 转向 standalone Playwright、Puppeteer 或本 skill 不会使用的其他 stack
- 弄清某个 PR 动了哪些 routes 本身就是一项任务
- server 没起、port 不对或状态 stale，都会让 tests 失败
- 页面看起来正常，console errors 却在堆积
- OAuth、payments、email 需要真人；没有暂停就会被标记为 pass
- screenshots 留在某一台 laptop 上，而不是进入 PR

## The Solution（方案）

一条固定的 flow：

- 选定一个 approved driver，并在整个 run 中保持使用它
- 把 changed files 映射到 URLs
- manual 模式要求你自己的 server；pipeline 模式会自行启动一个，且不会假定 port 3000 空闲
- 对每个页面：navigate、inspect、exercise critical actions、screenshot
- 在 external flows 上暂停（pipeline 中跳过）
- 失败时询问"立即修复"还是"跳过"（pipeline 记录失败后继续）
- 以一段可直接粘贴进 PR 的 markdown summary 收尾

---

## What Makes It Novel（特别之处）

### 优先 host-native browser，`agent-browser` 作为 fallback

skill 优先使用 host-native integrated browser：一个 embedded in or directly owned by the active harness 的 surface，能够打开 local URLs、检查 rendered 与 interactive state、click/fill/press、screenshot，并读取 console errors。separately configured browser extensions or MCPs 不算。若 host 没有这样的 surface，run 必须 fall back to `agent-browser`。

一个 driver 独占整个 run。skill 不会安装或使用 standalone Playwright、Puppeteer 或其他 automation stack。选定 host browser 内部的 Playwright API 仍属于该 browser，不是替代 stack。

若 host-native browser 与 `agent-browser` 都不可用，则停止并指向 `/ce-setup`。

### File-to-route mapping（文件到路由的映射）

以下是起始模式，不是 closed list。真实 layout 仍需 skill 自行判断：

| File pattern | Routes |
|--------------|--------|
| `app/views/users/*` | `/users`, `/users/:id`, `/users/new` |
| `app/controllers/settings_controller.rb` | `/settings` |
| `app/javascript/controllers/*_controller.js` | 使用该 Stimulus controller 的页面 |
| `app/components/*_component.rb` | 渲染该 component 的页面 |
| `app/helpers/*_helper.rb` | 使用该 helper 的页面 |
| `app/views/layouts/*` | 所有页面（至少 homepage） |
| `app/assets/stylesheets/*` | 关键页面的 visual check |
| `src/app/*`（Next.js） | 对应的 routes |
| `src/components/*` | 使用这些 components 的页面 |

### 两种模式

| Mode | Server | Port | Browser |
|------|--------|------|---------|
| Manual（default） | 由你启动 | 直接使用首选 port | Native browser 保持可见；`agent-browser` 会询问 headed 还是 headless |
| `mode:pipeline` | 后台自动启动 | 从首选 port 向上一路扫描 | 不提问。Native browser 保持可见且 non-blocking；`agent-browser` 使用 headless |

首选 port 的判定顺序：`--port`、agent 当前 project instructions 中已声明的 port、`package.json` 的 dev/start scripts、`.env` / `.env.local` / `.env.development`，最后是 `3000`。manual 模式不会另找 port；pipeline 模式会。

可见性与无人值守是两件事。host-native browser 在两种模式下都保持 visible，方便你观看且 non-blocking。

### External flows 与失败处理

| Flow | 它要求你做什么 |
|------|----------------|
| OAuth | 用 provider 登录并确认可用 |
| Email | 到收件箱查看 test mail |
| Payments | 完成一次 sandbox purchase |
| SMS | 确认 code 已收到 |
| External APIs | 确认 integration 可用 |

你回答 yes（继续）或 no（描述问题）。pipeline 模式会把上述每一项记为 Skip。

失败的 route 会得到 screenshot 与 repro steps，然后选择 fix-now（debug、patch、retest）或 skip。pipeline 模式不提问。

---

## Quick Example（快速示例）

你刚完成一个 notification settings 页面和一处 layout 调整，server 已经在跑，于是执行 `/ce-test-browser`。

它选择 host-native browser。scope 来自 `git diff --name-only main...HEAD`：layout、notifications template，以及一个 Stimulus toggle controller。routes 为 `/`（layout）、`/settings/notifications`，以及其他渲染该 toggle 的页面。

它使用 port 3000，确认你的 server 正在监听，然后逐个测试 route：heading 与 primary content、console、screenshot、toggle interaction。窗口保持可见。

settings 路径遇到 Google sign-in，它暂停。你在可见的 browser 中登录并回答 yes。

Summary：4 个 routes，0 个 console errors，1 次 human verification，PASS。

---

## When to Reach For It（何时使用）

在以下情况使用 `ce-test-browser`：

- Views、components、controllers、layouts 或 styles 有改动，你想让这些页面被实际跑一遍
- 开 PR 之前需要 UI 证据
- 改动涉及 OAuth、payments 或其他需要真人的 external flow

以下情况跳过：

- 改动没有 browser 可见行为
- host-native browser 与 `agent-browser` 都不可用
- 你想要 unit 或 integration tests → 用项目自己的 test runner
- 你想要自主修复与一份持久的 QA 文档 → `/ce-dogfood`
- 你想和页面坐在一起打磨手感 → `/ce-polish`
- 应用无法在本地运行

---

## Chain Position（在流程中的位置）

按需触发的验证，不是 `ce-work` 的必需步骤。

`lfg` 会在 review 之后、开 PR 之前以 `mode:pipeline` 调用它。UI 需要过一遍时，你也可以随时自己运行。

`ce-code-review` 的 bare 与 `mode:agent` run 是 report-only，可以共享同一 checkout。`ce-code-review apply:local` 可能在 running server 之下改动文件。

---

## Reference（参考）

| 参数 | 作用 |
|----------|--------|
| _（空）_ 或 `current` | routes 来自 `main...HEAD` |
| `<PR number>` | routes 来自该 PR 的 files。不会 checkout |
| `<branch name>` | routes 来自 `main...<branch>`。不会 checkout |
| `--port <number>` | 跳过 port 检测 |
| `mode:pipeline` | 自动启动 server、扫描空闲 port、不提问、跳过 human-only flows |

必需条件：host-native integrated browser 或 `agent-browser`。manual 模式还需要一个正在监听的 server（或你启动一个后重启 run）。

选定的 driver 必须能在本地 navigate、检查 rendered 与 interactive state、click/fill/press、screenshot，并读取 console errors。

pipeline 模式通过 `bin/dev`、`bin/rails server` 或 `npm run dev` 启动 server（哪个存在用哪个），最多等待 30 秒。

---

## FAQ（常见问题）

**为什么不要求处处使用 `agent-browser`？**
host 自有的 browser 留在 harness 内部，通常更容易观看。`agent-browser` 是 CLI host 以及没有 integrated browser 的 host 的 fallback。

**现在仍然禁止什么？**
Standalone Playwright、Puppeteer、单独配置的 browser extensions 或 MCPs，以及临时拼凑的 automation。选定 host browser 内部名为 Playwright 的 API 不构成替代 stack。

**pipeline 模式改变了什么？**
server 启动、空闲 port 扫描、不提问、human-only flows 记为 Skip。driver 选择不变。native browser 不会被隐藏。

**repo 的 layout 与表格不一致怎么办？**
表格只是起点。skill 会按真实项目做映射。你也可以传入一个 branch，其 diff 已经点明了你关心的文件。

**server 没跑怎么办？**
manual 模式打印启动命令后停止。pipeline 模式会启动它并最多等待 30 秒。

**它能与 `ce-code-review` 并行吗？**
review 为 report-only（默认 markdown 或 `mode:agent`）时可以。`apply:local` 可能破坏 running server 所看到的 tree。

---

## See Also（另见）

- [`ce-dogfood`](./ce-dogfood.md)：同类 browser pass，另加自主修复与持久报告
- [`ce-test-xcode`](./ce-test-xcode.md)：iOS simulator 的对应版本
- [`lfg`](./lfg.md)：以 `mode:pipeline` 调用本 skill
- [`ce-commit-push-pr`](./ce-commit-push-pr.md)：PR body 可以带上这段 summary
- [`ce-setup`](./ce-setup.md)：`agent-browser` 是否已安装，以及如何安装
- [`ce-polish`](./ce-polish.md)：在可运行功能上做对话式 UX 打磨
