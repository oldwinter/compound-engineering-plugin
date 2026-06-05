# Tier：Terminal Recording（终端录屏）

使用 VHS（charmbracelet/vhs）录制 terminal session，生成 GIF demo。

**Best for（适用场景）：** CLI tools、scripts，以及带 interaction 或 motion（typing、streaming output、progressive rendering）的 command-line features。
**Output（输出）：** GIF（direct from VHS）
**Label（标签）：** "Demo"
**Required tools（必需工具）：** vhs

## Step 1：Plan the Recording（规划录制）

生成 .tape file 前，确定：

- **要运行什么 command(s)** -- 实际 product command，而不是 test commands。"I ran npm test" 是 test evidence，不是 demo。
- **Expected output（预期输出）** -- command 成功时 terminal 应显示什么。
- **Terminal dimensions（终端尺寸）** -- 足够宽以容纳最长 output line，足够高以避免 scrolling。
- **Timing（时长）** -- 总时长目标 5-10 seconds。每个 command 后 sleep 足够长，让 output 渲染出来。
- **Secret exposure points（secret 暴露点）** -- 任何可能暴露 credential 的步骤：env exports、`source .env`、`printenv`/`env`/`set`、带 `--api-key`/`--token` flags 的 CLIs、verbose/debug flags、在 output 或 error traces 中 echo tokens 的 commands、带 env-interpolated `$VAR` segments 的 shell prompts。在 `.tape` 顶部的 `Hide` block 内设置真实 credentials，在 block 末尾运行 `clear` flush buffer，然后 `Show`。在 `Hide` 内使用干净 `HOME`（`export HOME=$(mktemp -d)`），避免 personal dotfiles、cached CLI tokens 和 env-interpolated prompts 泄漏。

## Step 2：生成 .tape File

将 VHS tape file 写入 `[RUN_DIR]/demo.tape`：

```tape
Output [RUN_DIR]/demo.gif

Set FontSize 16
Set Width 800
Set Height 500
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

# Hidden prelude: clean HOME, set real secrets, any setup that would leak.
# These commands execute for real but never appear in the GIF.
# `clear` at the end flushes the buffer so Show starts on a clean screen.
Hide
Type "export HOME=$(mktemp -d)"
Enter
Type "export API_KEY='real-secret-value'"
Enter
Type "cd /path/to/project"
Enter
Type "clear"
Enter
Show

# Visible demo: commands consume the env set above, but never re-export,
# echo, or print it. Show the feature working -- not the auth mechanism.
Type "your-cli-command --flag value"
Enter
Sleep 3s

# Let viewer read the output
Sleep 2s
```

**为什么采用这种形态：** visible command 成功本身就是 credential 已设置的 evidence；无需展示 auth step。永远不要添加带 fake value 的 visible `export SECRET=...`：它会泄漏 variable name，并破坏 demo。

**Key .tape directives（关键 .tape 指令）：**
- `Output [path]` -- GIF 写入位置（必须是第一行）
- `Set FontSize [14-18]` -- 为 readability 使用较大字号
- `Set Width/Height [pixels]` -- 匹配 content needs
- `Set Theme [name]` -- "Catppuccin Mocha" 或 "Dracula" 是可读的 defaults
- `Set TypingSpeed [ms]` -- 30-50ms 感觉自然
- `Hide`/`Show` -- 跳过无聊 setup（cd、source、npm install）
- `Type [text]` -- 输入 characters（不执行）
- `Enter` -- 按回车（执行已输入 command）
- `Sleep [duration]` -- 等待 output 渲染

**Avoid（避免）：**
- Non-deterministic output（random IDs、每次 run 变化的 timestamps）
- 需要 interactive input 的 commands（prompts、password entry）
- 会滚出屏幕的超长 output

## Step 3：运行 VHS

使用 capture pipeline script 执行 tape file 并 validate output：

```bash
python3 scripts/capture-demo.py terminal-recording --output [RUN_DIR]/demo.gif --tape [RUN_DIR]/demo.tape
```

该 script 会运行 VHS，验证 output 存在，并报告 file size。如果 GIF 超过 10 MB，通过调整 .tape 减小：更小 terminal dimensions（`Set Width/Height`）、更短 recording（更少 sleeps）或更低 font size。然后重新运行。

## Step 4：Quality Check（质量检查）

读取生成的 GIF，验证：

1. Commands 可见且可读
2. Output 完整渲染（未 cut off）
3. 被展示的 feature 清晰可见

**Secrets scan（hard gate）：** 扫描 GIF 中的 credential material。如果出现任何 credential，丢弃并重新录制，将泄漏步骤包在 `Hide`/`Show` 中或替换掉。不要 upload，不要 blur。

**Drift check（漂移检查）：** Broken visible command（`401 Unauthorized`、`Invalid API key`、`0 credits remaining`、预期有 data 却 empty output）通常意味着 `Show` 后某个 visible `export SECRET=...` 覆盖了 real env。修复 `.tape`，确保 secrets 只在 `Hide` 中设置，绝不 re-export，然后重新录制。

如果 quality 差，修订 .tape file 并重新录制。

**如果 VHS 失败**（crash、生成 empty GIF，或被展示 command 失败）：fallback 到 screenshot reel tier。把相同 commands 和 expected output 写成 text frames，并通过 silicon + ffmpeg stitch。如果 silicon 也不可用，fallback 到 static screenshots。

继续进入 `references/upload-and-approval.md`。
