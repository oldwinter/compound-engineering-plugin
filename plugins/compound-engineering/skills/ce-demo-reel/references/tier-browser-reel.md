# Tier：Browser Reel（浏览器演示 GIF）

在关键 UI states 捕获 3-5 张 browser screenshots，并 stitch 成 animated GIF。

**Best for（最适合）：** 可通过 localhost 或 CDP 访问的 web apps、desktop apps。
**Output（输出）：** GIF (PNG screenshots stitched via ffmpeg two-pass palette)
**Label（标签）：** "Demo"
**Required tools（必需工具）：** agent-browser, ffmpeg

如果未安装 `agent-browser`，告知用户："`agent-browser` is not installed. Run `/ce-setup` to install required dependencies." 然后 fallback 到较低 tier（static screenshots 或 skip）。

## Step 1：Connect to the Application（连接应用）

**对 web apps** -- 验证 dev server 可访问：

- 读取 `package.json` `scripts` 中的 `dev`、`start`、`serve` commands
- 如果存在，检查 `Procfile`、`Procfile.dev` 或 `bin/dev`
- 检查 `Gemfile` 中的 Rails（`bin/rails server`）或 Sinatra
- 检查 common ports（3000、5000、8080）上的 running processes

如果 server 未运行：

- **Headless / background mode**（没有可用 blocking question tool）：尝试用 detected start command 在 background process 中自动启动 server。对 Rails apps，在 background 运行 `bin/dev` 或 `bin/rails server`。Poll 直到 port 3000（或 detected port）接受 connections（最多 30s）。如果启动失败，fallback 到 static screenshots tier。跟踪 server PID，以便 Step 4 cleanup 停止它。
- **Interactive mode**：告诉用户检测到的 start command，并请他们启动。不要自动启动（它可能需要 environment variables、database setup 等）。

如果用户确认 server 应已运行后仍无法访问，fallback 到 static screenshots tier。

可访问后，记录 base URL（例如 `http://localhost:3000`）。

**对 Electron/desktop apps** -- 通过 Chrome DevTools Protocol（CDP）连接：

1. 检查 app 是否已经以 CDP enabled 状态运行：probe common ports：
   ```bash
   curl -s http://localhost:9222/json/version
   ```
   如果返回 JSON response，app 已 ready；连接 agent-browser：
   ```bash
   agent-browser connect 9222
   ```

2. 如果未运行，app 需要用 `--remote-debugging-port` 启动。从 `package.json` 检测 entry point（查找 `main` field 或 scripts 中的 `electron`），然后请用户用以下方式启动：
   ```
   your-electron-app --remote-debugging-port=9222
   ```
   如果 port 9222 被占用，尝试 9223-9230。

3. Poll 直到 CDP ready（30 seconds 后 timeout）：
   ```bash
   curl -s http://localhost:9222/json/version
   ```

4. 连接 agent-browser：
   ```bash
   agent-browser connect 9222
   ```

**CDP advantages：** Screenshots 来自 renderer frame buffer，而不是 macOS screen capture；不需要 Accessibility 或 Screen Recording permissions。

**如果 CDP connection 失败：** fallback 到 static screenshots tier。告诉用户："Could not connect to the app via CDP. Falling back to static screenshots."

## Step 2：Capture Screenshots（捕获截图）

Navigate 到 relevant pages，并在关键 UI states 捕获 3-5 张 screenshots：

1. **Initial/empty state** -- feature 使用前
2. **Navigation** -- 用户如何到达 feature（如果不是 landing page）
3. **Feature in action** -- 展示 feature 工作的 hero shot
4. **Result state** -- interaction 后（data present、items created、success message）
5. **Detail view（详情视图）**（optional）-- expanded item、settings panel、modal

对每个 screenshot，写入 parent skill 创建的具体 `RUN_DIR`：

```bash
agent-browser open [URL]
```

```bash
agent-browser wait --load networkidle
```

```bash
agent-browser wait 1000
```

```bash
agent-browser screenshot [RUN_DIR]/frame-01-initial.png
```

**Capture tips（捕获提示）：**
- 使用 URL navigation（`agent-browser open URL`），而不是点击 SPA elements（clicks 在 React/Vue/Svelte SPAs 上经常失败）
- Navigation 后等待 `--load networkidle`，然后再加一个短 fixed buffer 给 post-fetch render。单独固定 `wait 2000` 对 paint 后 fetch data 的 SPAs 不够；screenshots 会捕获 empty shell。
- 对保持 network activity open 的 pages（websockets、long-polling），使用 `agent-browser wait --text "<known content>"` 等待 populated UI 中的特定 string，或用 `agent-browser wait --fn "<expression>"` 设置 custom readiness condition。
- 捕获 full viewport（sidebar、header 会给 reviewers context）

**Keep secrets out of frame（不要让 secrets 入镜）：**
- 不要打开 DevTools、Network panel 或 Application/Storage；这些会明文暴露 auth headers、cookies、session storage 和 tokens
- 跳过显示 raw credentials 的 pages（unmasked API-key settings、OAuth consent screens、`.env` viewers、billing/payment detail）
- 每次 screenshot 前检查 URL bar；如果它带 session token 或 credential query param（`?access_token=`、`?api_key=`、`#id_token=`），先 navigate 到干净 canonical URL
- 当 screenshot 会包含本身敏感的 account identifiers 时，优先使用 demo account 或 seeded fixture data，而不是真实 logged-in account

## Step 3：Stitch into GIF（拼接成 GIF）

使用 capture pipeline script normalize frame dimensions、用 two-pass palette stitch，并在超过 10 MB 时 auto-reduce：

```bash
python3 scripts/capture-demo.py stitch [RUN_DIR]/demo.gif [RUN_DIR]/frame-*.png
```

该 script 处理 dimension normalization（通过 ffprobe + ffmpeg padding）、concat demuxer stitching、palette generation，并在 GIF 超过 GitHub 10 MB inline limit 时自动 reduce frames。Default 为每帧 3 seconds。要调整：

```bash
python3 scripts/capture-demo.py stitch --duration 2.0 [RUN_DIR]/demo.gif [RUN_DIR]/frame-*.png
```

**如果 stitching 失败：** 使用已捕获的 individual PNGs fallback 到 static screenshots tier。如果没有捕获 PNGs，报告 failure。

## Step 4：Secrets Scan and Cleanup（Secret 扫描与清理）

上传前，检查 final GIF 中是否有任何 credential material 在屏幕上可见。如果出现，丢弃 GIF，并将 offending page 或 state 移出 frame 后重新 capture。不要 upload，不要 blur。

确认 GIF 干净后，移除 individual PNG frames。只保留 final GIF 用于 upload。如果在 Step 1（headless mode）中 auto-started dev server，现在用 tracked PID 停止它。

继续进入 `references/upload-and-approval.md`。
