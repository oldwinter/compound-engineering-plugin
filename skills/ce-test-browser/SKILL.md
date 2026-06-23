---
name: ce-test-browser
description: 对当前 PR 或 branch 影响到的 pages 运行 browser tests
argument-hint: "[PR number、branch name、'current' 或 --port PORT]"
---

# Browser Test Skill（浏览器测试 Skill）

使用 `agent-browser` CLI，对 PR 或 branch changes 影响到的 pages 运行 end-to-end browser tests。

## Browser Automation 只使用 `agent-browser`

此 workflow 只使用 `agent-browser` CLI。不要使用任何 alternative browser automation system、browser MCP integration 或 built-in browser-control tool。如果平台提供多种 browser 控制方式，始终选择 `agent-browser`。

使用 `agent-browser` 执行：opening pages、clicking elements、filling forms、taking screenshots，以及 scraping rendered content。

Platform-specific hints（平台特定提示）：
- 在 Claude Code 中，不要使用 Chrome MCP tools（`mcp__claude-in-chrome__*`）。
- 在 Codex 中，不要替换成无关 browsing tools。

## Prerequisites（前置条件）

- Local development server 正在运行（例如 `bin/dev`、`rails server`、`npm run dev`）
- 已安装 `agent-browser` CLI（见下方 Setup）
- Git repository 中有待测试 changes

## Setup（设置）

检查是否已安装 `agent-browser`：

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Installed" || echo "NOT INSTALLED"
```

如果未安装，告知用户："`agent-browser` is not installed. Run `/ce-setup` to install required dependencies." 然后停止：没有 agent-browser，此 skill 无法运行。

## Workflow（工作流）

### 1. 验证安装

开始前，验证 `agent-browser` 可用：

```bash
command -v agent-browser >/dev/null 2>&1 && echo "Ready" || echo "NOT INSTALLED"
```

如果未安装，告知用户："`agent-browser` is not installed. Run `/ce-setup` to install required dependencies." 然后停止。

### 2. 询问 Browser Mode

**Pipeline mode（`mode:pipeline`）：** 完全跳过此步骤。默认 headless：不提问，不 blocking。直接进入 step 3。

**Manual mode：** 使用平台的 blocking question tool 询问用户要 headed 还是 headless：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才退回到聊天中呈现 options；不要仅因为需要加载 schema 就退回。绝不要静默跳过问题：

```
Do you want to watch the browser tests run?

1. Headed (watch) - Opens visible browser window so you can see tests run
2. Headless (faster) - Runs in background, faster but invisible
```

保存选择；当用户选择 option 1 时使用 `--headed` flag。

### 3. 确定 Test Scope（测试范围）

**If PR number provided（如果提供 PR number）：**
```bash
gh pr view [number] --json files -q '.files[].path'
```

**If 'current' or empty（如果为 current 或空）：**
```bash
git diff --name-only main...HEAD
```

**If branch name provided（如果提供 branch name）：**
```bash
git diff --name-only main...[branch]
```

### 4. 将 Files 映射到 Routes

将 changed files 映射到 testable routes：

| File Pattern（文件模式） | Route(s)（路由） |
|-------------|----------|
| `app/views/users/*` | `/users`, `/users/:id`, `/users/new` |
| `app/controllers/settings_controller.rb` | `/settings` |
| `app/javascript/controllers/*_controller.js` | Pages using that Stimulus controller |
| `app/components/*_component.rb` | Pages rendering that component |
| `app/views/layouts/*` | All pages (test homepage at minimum) |
| `app/assets/stylesheets/*` | Visual regression on key pages |
| `app/helpers/*_helper.rb` | Pages using that helper |
| `src/app/*` (Next.js) | Corresponding routes |
| `src/components/*` | Pages using those components |

基于 mapping 构建要测试的 URLs 列表。

### 5. 检测并占用 Free Port

**仅 Pipeline mode（`mode:pipeline`）：** 当从 LFG 或另一个 automated pipeline 调用时，始终寻找实际 free 的 port：绝不要假设 3000 可用，因为同一机器上可能有多个 agents 并行运行。

**Manual mode（无 `mode:pipeline`）：** 直接使用 preferred port。不要扫描 alternatives：用户控制自己的 server。

按此优先级确定 preferred port：

1. **Explicit argument** — 如果用户传入 `--port 5000`，直接使用它（跳过 free-port scan）
2. **Project instructions** — 检查 `AGENTS.md`、`CLAUDE.md` 或其他 instruction files 中的 port references
3. **package.json** — 检查 dev/start scripts 中的 `--port` flags
4. **Environment files** — 检查 `.env`、`.env.local`、`.env.development` 中的 `PORT=`
5. **Default** — 回退到 `3000`

**在 pipeline mode 中**，验证 preferred port 是否 free；如果不是，向上扫描。**在 manual mode 中**，直接使用 preferred port。

```bash
# Step 1: Determine preferred port
PORT="${EXPLICIT_PORT:-}"
if [ -z "$PORT" ]; then
  PORT=$(grep -Eio '(port\s*[:=]\s*|localhost:)([0-9]{4,5})' AGENTS.md 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
fi
if [ -z "$PORT" ]; then
  PORT=$(grep -Eio '(port\s*[:=]\s*|localhost:)([0-9]{4,5})' CLAUDE.md 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
fi
if [ -z "$PORT" ]; then
  PORT=$(grep -Eo '\-\-port[= ]+[0-9]{4,5}' package.json 2>/dev/null | grep -Eo '[0-9]{4,5}' | head -1)
fi
if [ -z "$PORT" ]; then
  PORT=$(grep -h '^PORT=' .env .env.local .env.development 2>/dev/null | tail -1 | cut -d= -f2)
fi
PORT="${PORT:-3000}"

# Step 2 (pipeline mode only): scan for a free port
if [ "${PIPELINE_MODE}" = "1" ]; then
  find_free_port() {
    local p=$1
    while lsof -i ":$p" -sTCP:LISTEN -t >/dev/null 2>&1; do
      p=$((p + 1))
    done
    echo $p
  }
  PORT=$(find_free_port "$PORT")
fi
echo "Using dev server port: $PORT"
```

当 argument 中存在 `mode:pipeline` 时，在 shell 中设置 `PIPELINE_MODE=1`。

### 6. 如果 Dev Server 未运行则启动，然后验证

**仅 Pipeline mode：** 如果 `$PORT` 上尚无 server listening，在后台自动启动一个。在 manual mode 中，告知用户并停止。

```bash
if lsof -i ":${PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Server already running on port ${PORT}"
else
  if [ "${PIPELINE_MODE}" = "1" ]; then
    # Auto-start in pipeline — pick the right command for this project
    echo "Starting dev server on port ${PORT}..."
    if [ -f "bin/dev" ]; then
      PORT=${PORT} bin/dev > /tmp/dev-server-${PORT}.log 2>&1 &
    elif [ -f "bin/rails" ]; then
      bin/rails server -p ${PORT} > /tmp/dev-server-${PORT}.log 2>&1 &
    elif [ -f "package.json" ]; then
      PORT=${PORT} npm run dev > /tmp/dev-server-${PORT}.log 2>&1 &
    fi
    # Wait up to 30 seconds for server to become ready
    for i in $(seq 1 30); do
      lsof -i ":${PORT}" -sTCP:LISTEN -t >/dev/null 2>&1 && break
      sleep 1
    done
    if ! lsof -i ":${PORT}" -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "Server did not start in 30s. Last output:"
      tail -20 /tmp/dev-server-${PORT}.log 2>/dev/null
      exit 1
    fi
  else
    # Manual mode — ask the user to start the server
    echo "Server not running on port ${PORT}"
    echo ""
    echo "Please start your development server:"
    echo "  Rails: bin/dev  or  rails server -p ${PORT}"
    echo "  Node/Next.js: npm run dev"
    echo "  Custom port: run this skill again with --port <your-port>"
    exit 0
  fi
fi

agent-browser open http://localhost:${PORT}
agent-browser snapshot -i
```

### 7. 测试每个受影响页面

对每个 affected route：

**Navigate and capture snapshot（导航并捕获 snapshot）：**
```bash
agent-browser open "http://localhost:${PORT}/[route]"
agent-browser snapshot -i
```

**For headed mode（headed mode，带界面模式）：**
```bash
agent-browser --headed open "http://localhost:${PORT}/[route]"
agent-browser --headed snapshot -i
```

**Verify key elements（验证关键元素）：**
- 使用 `agent-browser snapshot -i` 获取带 refs 的 interactive elements
- Page title/heading 存在
- Primary content 已渲染
- 无可见 error messages
- Forms 有 expected fields

**Test critical interactions（测试关键交互）：**
```bash
agent-browser click @e1
agent-browser snapshot -i
```

**Take screenshots（截图）：**
```bash
agent-browser screenshot page-name.png
agent-browser screenshot --full page-name-full.png
```

### 8. Human Verification（需要时）

当 testing 触及需要 external interaction 的 flows 时，暂停等待 human input：

| Flow Type | What to Ask |
|-----------|-------------|
| OAuth | "Please sign in with [provider] and confirm it works" |
| Email | "Check your inbox for the test email and confirm receipt" |
| Payments | "Complete a test purchase in sandbox mode" |
| SMS | "Verify you received the SMS code" |
| External APIs | "Confirm the [service] integration is working" |

询问用户（使用平台 question tool，或呈现编号选项并等待）：

```
Human Verification Needed

This test touches [flow type]. Please:
1. [Action to take]
2. [What to verify]

Did it work correctly?
1. Yes - continue testing
2. No - describe the issue
```

### 9. 处理 Failures

当 test 失败时：

1. **Document the failure（记录失败）：**
   - 截取 error state：`agent-browser screenshot error.png`
   - 记录 exact reproduction steps

2. **询问用户如何继续：**

   ```
   Test Failed: [route]

   Issue: [description]
   Console errors: [if any]

   How to proceed?
   1. Fix now - debug and fix the failing test
   2. Skip - continue testing other pages
   ```

3. **如果 "Fix now"：** investigate、propose a fix、apply、重新运行 failing test
4. **如果 "Skip"：** log as skipped，然后继续

### 10. Test Summary（测试摘要）

所有 tests 完成后，呈现 summary：

```markdown
## Browser Test Results

**Test Scope:** PR #[number] / [branch name]
**Server:** http://localhost:${PORT}

### Pages Tested: [count]

| Route | Status | Notes |
|-------|--------|-------|
| `/users` | Pass | |
| `/settings` | Pass | |
| `/dashboard` | Fail | Console error: [msg] |
| `/checkout` | Skip | Requires payment credentials |

### Console Errors: [count]
- [List any errors found]

### Human Verifications: [count]
- OAuth flow: Confirmed
- Email delivery: Confirmed

### Failures: [count]
- `/dashboard` - [issue description]

### Result: [PASS / FAIL / PARTIAL]
```

## Quick Usage Examples（快速使用示例）

```bash
# Test current branch changes (auto-detects port)
/ce-test-browser

# Test specific PR
/ce-test-browser 847

# Test specific branch
/ce-test-browser feature/new-dashboard

# Test on a specific port
/ce-test-browser --port 5000
```

## agent-browser CLI Reference（CLI 参考）

运行 `agent-browser --help` 查看所有 commands。

Key commands（关键命令）：

```bash
# Navigation
agent-browser open <url>           # Navigate to URL
agent-browser back                 # Go back
agent-browser close                # Close browser

# Snapshots (get element refs)
agent-browser snapshot -i          # Interactive elements with refs (@e1, @e2, etc.)
agent-browser snapshot -i --json   # JSON output

# Interactions (use refs from snapshot)
agent-browser click @e1            # Click element
agent-browser fill @e1 "text"      # Fill input
agent-browser type @e1 "text"      # Type without clearing
agent-browser press Enter          # Press key

# Screenshots
agent-browser screenshot out.png       # Viewport screenshot
agent-browser screenshot --full out.png # Full page screenshot

# Headed mode (visible browser)
agent-browser --headed open <url>      # Open with visible browser
agent-browser --headed click @e1       # Click in visible browser

# Wait
agent-browser wait @e1             # Wait for element
agent-browser wait 2000            # Wait milliseconds
```
