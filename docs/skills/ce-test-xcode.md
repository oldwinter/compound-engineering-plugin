# `ce-test-xcode`

> 使用 XcodeBuildMCP 在 simulator 上 build 和 test iOS apps；捕获 screenshots、logs，并验证 key screens 上的 app behavior。

`ce-test-xcode` 是 **iOS simulator testing** skill。它 build iOS project，boot simulator，install 并 launch app，在 key screens 上捕获 screenshots 和 logs，在 Sign in with Apple、push、in-app purchases、camera/photos、location 等需要 device interaction 的 flows 上暂停等待 human verification，并产出 structured test summary。Beta-style behavior（`disable-model-invocation: true`）：只显式调用。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 在 simulator 上 build、install、launch iOS app；截图；检查 logs errors；对 device-only flows 请求 human verification |
| 何时使用 | iOS code changes 后；创建 PR 前；验证 app behavior 或检查 simulator crashes 时 |
| 产出什么 | Screenshots、captured logs、structured test summary（per screen pass/fail、console errors、human verifications、overall result） |
| 状态 | Explicit-invocation only（`disable-model-invocation: true`） |

---

## 问题

Manual iOS simulator testing 又慢又不一致：

- **Build -> install -> launch -> exercise -> screenshot** 每次 change 都要 5+ steps
- **Logs lost**：没有 explicit capture 时，simulator restart 后 console errors 消失
- **No structured summary**："I tested it and it looks fine" 没说明测了什么、跳过什么
- **Device-only flows can't be automated**：Sign in with Apple、sandbox purchases、push notifications 需要 human in the loop，但很容易忘记或跳过
- **SwiftUI inline links don't respond to simulated taps**：taps 报 success 但无 effect，teams 容易踩坑
- **No artifact to share**：screenshots 和 logs 留在 developer filesystem，而不是 PR description

## 方案

`ce-test-xcode` 把 simulator testing 作为带 explicit gates 的 structured flow：

- **Pre-flight check**：touch 任何东西前确认 XcodeBuildMCP connected
- **Project + scheme discovery**：auto-detect build target，并支持 user-supplied scheme override
- **Build、install、launch、log-capture**：作为离散 MCP calls 执行，带 failure handling
- **Screen-by-screen testing**：screenshots、log inspection、每 screen pass/fail
- 对需要 device interaction 的 flows 加 **human verification step**（含 SwiftUI inline links workaround）
- **Failure handling**：询问用户 fix now 或 skip，而不是 silent abort
- **Structured test summary（结构化测试摘要）**：per-screen status、console errors、human verifications、overall result

---

## 独特之处

### 1. XcodeBuildMCP as the substrate（作为底层执行基座）

Skill 使用 Sentry 的 [XcodeBuildMCP](https://github.com/getsentry/xcodebuildmcp)：一个 MCP server，把 Xcode project discovery、simulator management、build/install/launch、log capture 和 screenshot capture 暴露为 tool calls。这意味着 skill 是 MCP tools 上的 thin orchestrator，而不是 `xcodebuild` shell invocations 的 wrapper：

- `discover_projs`：在 workspace 中查找 Xcode projects
- `list_schemes`：获取 project 可用 schemes
- `list_simulators`、`boot_simulator`、`shutdown_simulator`：simulator management
- `build_ios_sim_app`：build for simulator
- `install_app_on_simulator`、`launch_app_on_simulator`：install + launch
- `take_screenshot`、`capture_sim_logs`、`get_sim_logs`、`stop_log_capture`：observation

当 XcodeBuildMCP 不可用时，skill 会停止并提供 install instructions；不会尝试 fallback paths。

### 2. Structured test flow，而不是 shell script

每个 phase 都是 explicit step：discover、boot、build、install、launch、log-capture、test screens、handle failures、summary、cleanup。每步都有 failure handling。这样 test run 在 chat 中可 audit：你能看到测了什么、pass 了什么、skip 了什么。

### 3. Human verification step（人工验证步骤）：Sign in with Apple、IAP、push、camera、location

有些 flows 无法在 simulator 上自动化：

| Flow | Human verification 询问内容 |
|------|------------------------------|
| Sign in with Apple | "Please complete Sign in with Apple on the simulator" |
| Push notifications | "Send a test push and confirm it appears" |
| In-app purchases | "Complete a sandbox purchase" |
| Camera / Photos | "Grant permissions and verify camera works" |
| Location | "Allow location access and verify map updates" |

Skill 用 blocking question 暂停；用户在 simulator 上完成操作，然后回答 yes（continue）或 no（describe issue）。Device-only flows 因此显式化，而不是 silently skipped。

### 4. 已记录的 platform limitation：SwiftUI Text links

Simulated taps 不会触发带 inline `AttributedString` links 的 SwiftUI `Text` views 上的 gesture recognizers：它们会 report success，但没有 effect。这是 platform limitation（inline links 不作为 separate elements 暴露在 accessibility tree 中）。Skill 知道这一点；当 inline link 不响应时，会提示用户手动 tap，并在 target URL 已知时提供 `xcrun simctl openurl` fallback。

### 5. Failure handling（失败处理）：fix now or skip

Screen 失败时，skill 捕获 error state（screenshot + console logs + reproduction steps），并询问用户如何继续：

- **Fix now（立即修复）**：investigate、propose fix、rebuild、retest
- **Skip**：记录为 skipped，继续测试其他 screens

两条路径都有效。重点是显式选择，而不是第一处 failure 就 silent abort。

### 6. Structured test summary（结构化测试摘要）

所有 screens 测完后，skill 产出 markdown summary：

- Project name、scheme、simulator（project 名、scheme、simulator）
- Build status（Success / Failed；build 状态）
- Per-screen status table（Pass / Fail / Skip with notes；逐 screen 状态表）
- Console errors found（发现的 console errors）
- Human verifications completed（已完成的 human verifications）
- Overall result（PASS / FAIL / PARTIAL；整体结果）

适合粘贴到 PR description 或 release-readiness report。

### 7. Beta-style explicit invocation only（仅显式调用）

Frontmatter 中的 `disable-model-invocation: true` 防止 skill auto-fire。Simulator testing 是 deliberate choice；你不希望它作为询问其他内容的 side-effect 被触发。直接调用 `/ce-test-xcode`。

---

## 快速示例

你完成 profile-edit screen 的 iOS feature，调用 `/ce-test-xcode`。

Skill 调用 XcodeBuildMCP 的 `list_simulators`，验证 MCP connected。然后 `discover_projs` 找到 Xcode project；`list_schemes` 返回三个 schemes；你未传 argument，因此它选择 default last-used scheme。

Boot iPhone 15 Pro simulator。用 `build_ios_sim_app` build，成功。通过 `install_app_on_simulator` 和 `launch_app_on_simulator` install + launch。开始 log capture。

测试 key screens：Launch（screenshot，无 errors）、Home（screenshot，无 errors）、Profile（screenshot；但路径中有 Sign in with Apple flow）。Skill 暂停 human verification："Please complete Sign in with Apple on the simulator." 你在 simulator 上完成。回答 "yes — continue testing." Profile screen 测试通过。Settings（screenshot；tap "Privacy" row 后 crash）。Skill 捕获 crash log，surface failure，并询问：fix now or skip？

你选择 "fix now"。Skill 调查 crash log，发现 missing nil check，提出 fix，rebuild、reinstall、retest Settings，pass。

所有 screens 完成后，test summary：4 screens tested、0 console errors、1 human verification confirmed、testing 中应用了 1 个 fix。Overall result：PASS。

Skill 停止 log capture，并可选 shutdown simulator。

---

## 何时使用

在以下情况使用 `ce-test-xcode`：

- 完成 iOS code changes，想在打开 PR 前验证
- Refactor 后检查 simulator 上是否 crash
- PR 包含需要 visual verification 的 UI changes
- 需要手动 exercise device-only flows（Sign in with Apple、IAP、push），但想要 structured wrapper
- 想要适合 PR descriptions 的 test summary

以下情况跳过 `ce-test-xcode`：

- Change 是 non-UI（model layer only、已有 unit-test coverage 的 internal services）
- XcodeBuildMCP 不可用：skill 会停止并给 install instructions；先安装它
- 想跑 unit-test verification -> 直接使用 `xcodebuild test` 或 project test runner
- 不在 macOS / 没有 Xcode -> skill 无法工作

---

## 作为 Workflow 的一部分使用

`ce-test-xcode` 与 chain 的 verification 侧互锁：

- **`/ce-code-review` Tier 2**：review iOS-touching PRs 时，workflow 可以 spawn agent 运行此 skill，在 simulator 上 build、测试 key screens，并检查 crashes
- **`/ce-work` Phase 3 / Phase 4**：iOS-heavy work 打开 PR 前适合运行；test summary 成为 PR description 的 verification narrative

Skill output（test summary）适合作为 PR descriptions 中的 evidence，补充人工或自动化捕获的 visual demos。

---

## 单独使用

最常见直接用法：

- **Default scheme（默认 scheme）**：`/ce-test-xcode`
- **Specific scheme（指定 scheme）**：`/ce-test-xcode MyApp-Debug`
- **Last-used（最近使用）**：`/ce-test-xcode current`

Skill 发现 project，选择 simulator（推荐 iPhone 15 Pro），并运行 full flow。XcodeBuildMCP 缺失时，skill 停止并给 install instructions：

```text
Install via Homebrew:
  brew tap getsentry/xcodebuildmcp && brew install xcodebuildmcp

Or via npx:
  npx -y xcodebuildmcp@latest mcp

Then add "XcodeBuildMCP" as an MCP server in your agent configuration
and restart your agent.
```

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty)_ | 发现 project 并使用 default scheme |
| `<scheme name>` | 使用该 scheme build |
| `current` | 使用 default / last-used scheme |

Required：XcodeBuildMCP MCP server connected。Auto-detected：Xcode project、available simulators（有 iPhone 15 Pro 时优先）。

---

## 常见问题

**为什么用 XcodeBuildMCP，而不是直接 `xcodebuild`？**
因为 MCP server 以 tool calls 提供更高层 semantics（project discovery、simulator boot/shutdown、screenshot、log capture）。Skill 变成 thin orchestrator，而不是 shell-script wrapper；platform-specific edge cases（simulator state、log capture lifecycle）由 MCP 处理。

**如果 SwiftUI Text link 上的 tap 不工作怎么办？**
这是 known platform limitation：simulated taps 不触发 inline `AttributedString` links 上的 gesture recognizers。Skill 会提示你在 simulator 中手动 tap。如果 target URL 已知，`xcrun simctl openurl <device> <URL>` 可作为 fallback 直接打开。

**为什么 explicit-invocation only？**
因为 `disable-model-invocation: true` 防止 skill auto-fire。Simulator testing 是 deliberate user choice；你不希望只是让 agent 看某个东西时触发它。请直接调用 `/ce-test-xcode`。

**UI tests（XCUITest）怎么办？**
此 skill 通过 simulator interaction（taps、screenshots、log inspection）exercise running app，不通过 XCUITest scripts。Unit/UI test runs 请用 `xcodebuild test` 或 project runner。二者互补。

**没有 iPhone 15 Pro 也能运行吗？**
可以。`list_simulators` 返回可用设备；skill 会选择其中之一。iPhone 15 Pro 是推荐 default，但不是 required。

**Build 失败怎么办？**
Skill 捕获 build errors 并报告具体细节。Build failed 时不会继续 install/launch。

---

## 另见

- [`ce-code-review`](./ce-code-review.md) - 可为 iOS-touching PRs spawn 此 skill 作为 verification step
- [`ce-test-browser`](./ce-test-browser.md) - 通过 host-native browser 或 `agent-browser` fallback 做 web-app testing 的 sibling skill
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - 可在 PR description 中加入 user-supplied evidence 或 summarize validation
- [`ce-work`](./ce-work.md) - Phase 3 verification 中可能调用此 skill 的 orchestrator
