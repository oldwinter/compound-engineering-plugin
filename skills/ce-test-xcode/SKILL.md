---
name: ce-test-xcode
description: "使用 XcodeBuildMCP 在 simulator 上 build 和 test iOS apps。在完成 iOS code changes 后、创建 PR 前，或需要在 simulator 上验证 app behavior 并检查 crashes 时使用。"
argument-hint: "[scheme name，或用 'current' 使用默认值]"
disable-model-invocation: true
---

# Xcode Test Skill（Xcode 测试 Skill）

使用 XcodeBuildMCP 在 simulator 上 build、install 和 test iOS apps。捕获 screenshots、logs，并验证 app behavior。

## Prerequisites（前置条件）

- 已安装带 command-line tools 的 Xcode
- XcodeBuildMCP MCP server 已连接
- 有效的 Xcode project 或 workspace
- 至少一个 iOS Simulator 可用

## Workflow（工作流）

### 0. 验证 XcodeBuildMCP 可用

通过调用 XcodeBuildMCP MCP server 的 `list_simulators` tool，检查它是否已连接。

MCP tool names 因平台而异：
- Claude Code（Claude Code）: `mcp__xcodebuildmcp__list_simulators`
- 其他平台：使用 `XcodeBuildMCP` server 的 `list_simulators` method 对应 MCP tool call

如果找不到 tool 或出现错误，告知用户需要添加 XcodeBuildMCP MCP server：

```
XcodeBuildMCP not installed

Install via Homebrew:
  brew tap getsentry/xcodebuildmcp && brew install xcodebuildmcp

Or via npx (no global install needed):
  npx -y xcodebuildmcp@latest mcp

Then add "XcodeBuildMCP" as an MCP server in your agent configuration
and restart your agent.
```

在确认 XcodeBuildMCP 正常工作前，Do NOT 继续。

### 1. 发现 Project 和 Scheme

调用 XcodeBuildMCP 的 `discover_projs` tool 查找 available projects，然后用 project path 调用 `list_schemes` 获取 available schemes。

如果提供了 argument，使用该 scheme name。如果是 "current"，使用 default/last-used scheme。

### 2. 启动 Simulator

调用 `list_simulators` 查找 available simulators。使用 simulator UUID 调用 `boot_simulator` 启动 preferred simulator（推荐 iPhone 15 Pro）。

等待 simulator ready 后再继续。

### 3. Build App（构建 App）

使用 project path 和 scheme name 调用 `build_ios_sim_app`。

**On failure（失败时）：**
- 捕获 build errors
- 向用户报告具体 error details

**On success（成功时）：**
- 记录用于 installation 的 built app path
- 进入 step 4

### 4. Install and Launch（安装并启动）

1. 使用 built app path 和 simulator UUID 调用 `install_app_on_simulator`
2. 使用 bundle ID 和 simulator UUID 调用 `launch_app_on_simulator`
3. 使用 simulator UUID 和 bundle ID 调用 `capture_sim_logs` 开始 log capture

### 5. 测试 Key Screens

对 app 中每个 key screen：

**Take screenshot（截图）：**
使用 simulator UUID 和描述性 filename（例如 `screen-home.png`）调用 `take_screenshot`。

**Review screenshot for（检查截图）：**
- UI elements 正确渲染
- 无可见 error messages
- 显示 expected content
- Layout 看起来正确

**Check logs for errors（检查日志错误）：**
使用 simulator UUID 调用 `get_sim_logs`。查找：
- Crashes（崩溃）
- Exceptions（异常）
- Error-level log messages（error 级日志）
- Failed network requests（失败的网络请求）

**Known automation limitation — SwiftUI Text links（已知自动化限制）：**
Simulated taps（通过 XcodeBuildMCP 或任何 simulator automation tool）不会触发带 inline `AttributedString` links 的 SwiftUI `Text` views 上的 gesture recognizers。Taps 会报告 success，但没有效果。这是 platform limitation：inline links 没有作为独立 elements 暴露在 accessibility tree 中。当点击 Text link 没有可见效果时，请用户在 simulator 中手动点击。如果 target URL 已知，`xcrun simctl openurl <device> <URL>` 可作为 fallback 直接打开它。

### 6. Human Verification（需要时）

当 testing 触及需要 device interaction 的 flows 时，暂停等待 human input。

| Flow Type | What to Ask |
|-----------|-------------|
| Sign in with Apple | "Please complete Sign in with Apple on the simulator" |
| Push notifications | "Send a test push and confirm it appears" |
| In-app purchases | "Complete a sandbox purchase" |
| Camera/Photos | "Grant permissions and verify camera works" |
| Location | "Allow location access and verify map updates" |
| SwiftUI Text links | "Please tap on [element description] manually — automated taps cannot trigger inline text links" |

使用平台的 blocking question tool 询问用户：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中的编号选项；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题：

```
Human Verification Needed

This test requires [flow type]. Please:
1. [Action to take on simulator]
2. [What to verify]

Did it work correctly?
1. Yes - continue testing
2. No - describe the issue
```

### 7. 处理 Failures

当 test 失败时：

1. **Document the failure（记录失败）：**
   - 截取 error state screenshot
   - 捕获 console logs
   - 记录 reproduction steps

2. **询问用户如何继续：**

   ```
   Test Failed: [screen/feature]

   Issue: [description]
   Logs: [relevant error messages]

   How to proceed?
   1. Fix now - debug, propose a fix, rebuild and retest
   2. Skip - continue testing other screens
   ```

3. **如果 "Fix now"：** investigate、propose a fix、rebuild and retest
4. **如果 "Skip"：** log as skipped，然后继续

### 8. Test Summary（测试摘要）

所有 tests 完成后，呈现 summary：

```markdown
## Xcode Test Results

**Project:** [project name]
**Scheme:** [scheme name]
**Simulator:** [simulator name]

### Build: Success / Failed

### Screens Tested: [count]

| Screen | Status | Notes |
|--------|--------|-------|
| Launch | Pass | |
| Home | Pass | |
| Settings | Fail | Crash on tap |
| Profile | Skip | Requires login |

### Console Errors: [count]
- [List any errors found]

### Human Verifications: [count]
- Sign in with Apple: Confirmed
- Push notifications: Confirmed

### Failures: [count]
- Settings screen - crash on navigation

### Result: [PASS / FAIL / PARTIAL]
```

### 9. Cleanup（清理）

测试后：

1. 使用 simulator UUID 调用 `stop_log_capture`
2. 可选使用 simulator UUID 调用 `shutdown_simulator`

## Quick Usage Examples（快速使用示例）

```bash
# Test with default scheme
/ce-test-xcode

# Test specific scheme
/ce-test-xcode MyApp-Debug

# Test after making changes
/ce-test-xcode current
```

## Integration with ce-code-review（与 ce-code-review 集成）

当 review 触及 iOS code 的 PR 时，`ce-code-review` workflow 可以 spawn 一个 agent 运行此 skill，在 simulator 上 build、test key screens，并检查 crashes。
