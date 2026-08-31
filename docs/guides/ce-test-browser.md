# `ce-test-browser`

> 使用当前可用的最佳 approved browser driver，对当前 PR 或 branch 影响到的页面运行 end-to-end browser tests。

`ce-test-browser` 是 **end-to-end browser testing** skill。它把 changed files 映射到可测试 routes，启动（或验证）dev server；有 host-native integrated browser 时优先使用，否则 fall back to `agent-browser`。它会捕获 rendered state 和 screenshots，执行 critical interactions，在 external flows 上暂停等待 human verification，并产出 structured test summary。

---

## 摘要（TL;DR）

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 将 changed files 映射到 routes，选择 approved browser driver，捕获 rendered state/screenshots，并在 external-flow steps 上请求 human verification |
| 何时使用 | UI changes 后、打开 PR 前、验证 branch 或 PR 上的 page behavior 时 |
| 产出什么 | Per-page status table、console errors、human verifications confirmed、screenshots、overall result（PASS / FAIL / PARTIAL） |
| 模式 | Manual（default；用户控制 server）、Pipeline（`mode:pipeline`：auto-start server，扫描 free port） |

---

## 调用示例

```text
# 测试当前 branch 影响的 routes；dev server 由用户负责
/ce-test-browser

# 从已在本地 checkout 的 PR 或 branch 推导 routes，并测试其 running server
/ce-test-browser 847
/ce-test-browser feature/new-dashboard

# 在 manual mode 中连接自定义端口上的现有 server
/ce-test-browser --port 5000
```

PR 和 branch 参数只选择用来推导 routes 的 diff，不会切换本地 checkout。调用前请 checkout 目标代码并启动其 server。没有 server 运行时，skill 会停止并给出正确的启动命令。

---

## 问题

End-to-end browser testing 常被工具碎片化，也很容易跳过：

- **错误的 browser fallback**：preferred driver 缺失时，agent 可能安装 standalone Playwright、Puppeteer 或 ad hoc automation，而不是使用 supported host capability
- **手动 test mapping**：判断 "which routes did this PR affect" 本身就是一项任务
- **Server orchestration**：dev server 没跑、port 错、state stale，都会让 tests 失败
- **Console errors 静默溜过**：页面看起来渲染了，但 JS errors 在后台堆积
- **External flows 被跳过**：OAuth、payments、email delivery 需要 human；没有 structured pause 时，会被误标为 pass
- **没有 artifact**：screenshots 留在 developer filesystem，而不是 PR description 中

## 方案

`ce-test-browser` 把 E2E tests 作为 structured flow：

- **Approved driver hierarchy**：优先使用 host-native integrated browser，然后 fallback 到 `agent-browser`；绝不引入第三套 standalone automation stack
- **File-to-route mapping** 将 changed files 转成需要测试的 URLs
- **Server orchestration**：manual mode 要求用户已启动 server；pipeline mode 自动启动并扫描 free port
- **Per-page test loop（逐页测试循环）**：navigate、snapshot、verify elements、exercise critical interactions、capture screenshots
- 对需要外部交互的 flows 加 **human verification step**
- **Failure handling asks how to proceed**：fix now（debug + retest）或 skip（继续）
- **Structured test summary** 可用于 PR descriptions

---

## 独特之处

### 1. Host-native 优先，portable fallback

Skill 会区分 `embedded in or directly owned by the active harness`（嵌入 active harness 或由其直接提供）的 browser surface，与 separately configured substitute tooling：

- 优先使用 capable host-native integrated browser，因为它让测试留在 harness 内，并可提供用户能观察的 visible、non-blocking surface。
- 没有该能力的 harness fallback 到 portable `agent-browser` CLI。
- Driver 一旦选定，整个 run 的 navigation、element state、screenshots、console inspection 和 authentication 都由它负责。
- Standalone Playwright、Puppeteer、separately configured browser extensions or MCPs，以及 ad hoc browser automation 仍是禁止使用的 substitutes。

Host-native browser 暴露的 Playwright API 仍属于该 integrated capability，不是 standalone Playwright。没有 qualifying native browser 且未安装 `agent-browser` 时，skill 会停止并指向 `/ce-setup`。

### 2. File-to-route mapping table（文件到 route 映射表）

Changed files 到 URLs 的 mapping 是重复任务。Skill 携带 explicit mapping table：

| File pattern | Routes |
|--------------|--------|
| `app/views/users/*` | `/users`, `/users/:id`, `/users/new` |
| `app/controllers/settings_controller.rb` | `/settings` |
| `app/javascript/controllers/*_controller.js` | 使用该 Stimulus controller 的 pages |
| `app/components/*_component.rb` | 渲染该 component 的 pages |
| `app/views/layouts/*` | 所有 pages（至少 test homepage） |
| `app/assets/stylesheets/*` | key pages 上的 visual regression |
| `src/app/*` _(Next.js)_ | 对应 routes |
| `src/components/*` | 使用这些 components 的 pages |

这只是 starting point，不是 exhaustive；skill 会根据 project-specific layouts 判断。

### 3. Two modes：Manual（default）和 Pipeline

| Mode | Server | Port | Browser behavior |
|------|--------|------|-----------------|
| **Manual** _(default)_ | 用户启动 | 直接使用 preferred port；用户控制 | Native browser 保持 integrated、observable；`agent-browser` 询问 headed or headless |
| **Pipeline** _(`mode:pipeline`)_ | 后台 auto-started | 扫描 free port；不假设 3000 空闲 | 不提问；native browser 保持 visible、non-blocking，`agent-browser` 使用 headless |

Pipeline mode 面向 LFG 和其他 automated runners：同一机器可能有多个 agents，3000 可能被占用。

### 4. Port detection cascade（port 检测级联）

Preferred port 来源优先级：

1. Explicit argument（显式参数，例如 `--port 5000`）
2. Project instructions（项目说明，例如 `AGENTS.md`、`CLAUDE.md`）
3. `package.json`（dev/start scripts，dev/start 脚本）
4. Environment files（环境文件，例如 `.env`、`.env.local`、`.env.development`）
5. Default `3000`（默认 `3000`）

Pipeline mode 会验证该 port 是否空闲，不空闲则向上扫描。Manual mode 直接使用 preferred port，因为 server 由用户控制。

### 5. Visibility 与 orchestration 分离

Unattended 不等于 hidden。Host-native integrated browser 在 manual 和 pipeline run 中都保持正常的 visible、non-blocking experience，用户可以观看而不打断进度。只有 `agent-browser` fallback 在 manual mode 需要选择 headed/headless；pipeline mode 会直接以 headless 运行该 fallback，不提问。

### 6. Human verification for external flows（外部流程人工确认）

一些 flows 无法自动化：

| Flow | Human verification 会询问内容 |
|------|------------------------------|
| OAuth | "Please sign in with [provider] and confirm it works" |
| Email | "Check your inbox for the test email and confirm receipt" |
| Payments | "Complete a test purchase in sandbox mode" |
| SMS | "Verify you received the SMS code" |
| External APIs | "Confirm the [service] integration is working" |

Skill 用 blocking question 暂停；用户完成操作后回答 yes（continue）或 no（describe issue）。External flows 因此显式化，而不是 silently skipped。

### 7. Failure handling（失败处理）：fix now or skip

Route 失败时（console error、missing element、broken interaction），skill 捕获 error state（screenshot + reproduction steps），并询问：fix now（debug、propose fix、retest）或 skip（继续测试其他 pages）。两条路都有效；关键是 choice explicit。

### 8. Structured test summary（结构化测试摘要）

所有 routes 测完后，输出 markdown summary：

- Test scope（PR / branch；测试范围）
- Server URL（server URL，server 地址）
- Per-route status table（Pass / Fail / Skip with notes；逐 route 状态表）
- Console errors found（发现的 console errors）
- Human verifications completed（已完成的 human verifications）
- Failures（route + issue description；失败项）
- Overall result（PASS / FAIL / PARTIAL；整体结果）

可直接放入 PR description 作为 test evidence。

---

## 快速示例

你完成 notification settings page 和 layout change，调用 `/ce-test-browser`。

Skill 检测到 capable host-native integrated browser，并选择它执行本次 run。它从 `git diff --name-only main...HEAD` 判断 test scope：`app/views/layouts/application.html.erb`、`app/views/settings/notifications.html.erb`、`app/javascript/controllers/notification_toggle_controller.js`。

映射 routes：`/`（layout change 影响所有页面，至少 test homepage）、`/settings/notifications`（new page），以及使用 toggle controller 的其他 pages。它从 `bin/dev` config 检测 port 3000，并验证用户 dev server 正在该 port 运行。

它在 integrated browser 中逐个 route 测试：navigate，检查 rendered 和 interactive state，验证 primary content，检查 console errors，截图，并 exercise notification toggle。Browser 保持 visible、non-blocking，你可以切换过去观看，而无需暂停 run。

Settings flow 包含 OAuth sign-in step；测试到 protected route 时，skill 暂停 human verification："Please sign in with Google and confirm the redirect back works." 你在可见 browser 中完成，然后回答 yes。

所有 routes pass。Summary 显示：4 routes tested、0 console errors、1 human verification confirmed、overall PASS。

---

## 何时使用

在以下情况使用 `ce-test-browser`：

- 改了 views、components、controllers、layouts 或 stylesheets，想验证页面仍工作
- 打开 PR 前想 exercise actual UI
- Change 触及 OAuth、payments 或其他需要 HITL verification 的 external flows
- 想为 PR description 提供 test evidence（per-page status + screenshots）

以下情况跳过 `ce-test-browser`：

- Change backend-only，没有 observable browser-visible behavior
- Capable host-native browser 和 `agent-browser` 都不可用
- 想要 unit / integration tests，而不是 E2E -> 使用 project test runner
- Dev server 无法本地启动（cloud-only setup）-> 使用其他 testing approach

---

## 作为 Workflow 的一部分使用

`ce-test-browser` 位于 chain 的 verification 侧：

- **`/ce-code-review` Tier 2**：browser-affecting PRs 可 spawn 此 skill 来验证 behavior，补充 static review
- **`/ce-work` Phase 3**：UI-heavy work 打开 PR 前很适合；test summary 成为 PR description 的 verification narrative

Bare markdown 和 `mode:agent` 的 `ce-code-review` 都是 report-only，可与此 skill 在同一 checkout 安全并发。显式授权 local apply 的 review 可能 mutate checkout，干扰 running dev server state。

---

## 单独使用

Skill 可直接运行：

- **Current branch（当前 branch）**：`/ce-test-browser`
- **Specific PR（指定 PR）**：`/ce-test-browser 847`
- **Specific branch（指定 branch）**：`/ce-test-browser feature/new-dashboard`
- **Custom port（自定义 port）**：`/ce-test-browser --port 5000`
- **Pipeline mode**：`/ce-test-browser mode:pipeline`（auto-starts server，扫描 free port）

Manual mode 中 dev server 未运行时，skill 会告知正确 start command 并停止。Pipeline mode 会通过 `bin/dev`、`bin/rails server` 或 `npm run dev`（project-detected）auto-start。

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | 测试 current branch 的 changes |
| `<PR number>` | 测试该 PR 影响的 routes |
| `<branch name>` | 测试该 branch 影响的 routes |
| `current` | 测试 current branch（explicit） |
| `--port <number>` | 覆盖 port detection |
| `mode:pipeline` | Auto-start server，scan for free port，suppress browser questions |

Required：qualifying host-native integrated browser 或 `agent-browser` CLI。Manual mode 需要 local dev server running；pipeline mode 需要可用 start command。

Selected driver 必须支持 local navigation、rendered/interactive state inspection、click/fill/press actions、screenshots 和 console-error inspection。Driver-specific mechanics 来自 host-native browser 自身 instructions，或 skill 的 `agent-browser` fallback reference。

---

## 常见问题

**为什么不要求所有环境都使用 `agent-browser`？**
Host-native integrated browser 与任意 substitute automation stack 有实质区别：它嵌入 harness 或由 harness 直接提供，遵循该 harness 的 browser instructions，并能提供更好的 observable experience。Separately configured browser extension 或 integration 不符合条件。`agent-browser` 仍是 CLI 环境和没有 integrated browser 的 harness 的一致 fallback。

**哪些 alternatives 仍禁止使用？**
Skill 不会安装或切换到 standalone Playwright、Puppeteer、separately configured browser extensions/MCPs 或 ad hoc browser automation。Selected host-native browser 内名为 Playwright 的 API 仍属于该 browser，不算 standalone substitution。

**Pipeline mode 有什么不同？**
Pipeline mode 面向 LFG 等 automated runners，preferred port 可能已被占用。它会扫描 free port、auto-start dev server、suppress blocking questions，并跳过 human-only flows。它不会改变 driver selection，也不会强制隐藏 host-native browser。

**如果 project layout 不匹配 file-to-route table 怎么办？**
Mapping table 是 starting point。Skill 会对 project-specific layouts 做判断。你也可以通过调整 test scope detection 来直接测试 known-affected route，例如传 branch name review。

**Dev server 没跑怎么办？**
Manual mode 会给出正确 start command 并停止。Pipeline mode 会根据 project detection 通过 `bin/dev`、`bin/rails server` 或 `npm run dev` auto-start，并等待最多 30 秒。

**能和 `ce-code-review` 并发吗？**
Code review 以 report-only 方式运行时可以，包括 bare markdown 和 `mode:agent`。显式授权 local apply 的 review 可能 mutate checkout，破坏 running dev server state。要么配合 report-only review，要么把 applying review 放在 isolated worktree。

---

## 另见

- [`ce-code-review`](./ce-code-review.md) - 可为 browser-affecting PRs spawn 此 skill（同一 checkout 并发时使用 report-only invocation）
- [`ce-test-xcode`](./ce-test-xcode.md) - iOS simulator testing 的 sibling skill
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - 可在 PR descriptions 中包含用户提供的 evidence，或汇总 validation
- [`ce-work`](./ce-work.md) - Phase 3 verification 中可能调用此 skill 的 orchestrator
- [`ce-setup`](./ce-setup.md) - 检查 `agent-browser` 是否可用，缺失时输出安装命令
