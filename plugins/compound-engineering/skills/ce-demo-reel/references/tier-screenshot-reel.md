# Tier：Screenshot Reel（截图动图）

从 text 渲染 styled terminal frames，并 stitch 成 animated GIF。每一帧展示 CLI demo 的一个步骤（command + output）。

**Best for（适用场景）：** 以 discrete steps 展示的 CLI tools（command -> output -> next command -> output）。当 VHS 在 quoting 或 special characters 上出问题时也有用。
**Output（输出）：** GIF（silicon PNGs stitched via ffmpeg）
**Label（标签）：** "Demo"
**Required tools（必需工具）：** silicon、ffmpeg

## Step 1：写 Demo Content

创建一个 text file，用 `---` 作为 frames 之间的 delimiter。每帧展示一个步骤的 terminal state：

写入 `[RUN_DIR]/demo-steps.txt`：

```
$ your-cli-command --flag value
Output line 1
Output line 2
Success: feature works correctly
---
$ your-cli-command --another-flag
Different output showing another aspect
Result: 42 items processed
---
$ your-cli-command --verify
All checks passed
```

**Tips（提示）：**
- 包含 `$` prompt，以展示用户输入什么
- 为了 readability，每帧保持在约 80 characters 宽以内
- 3-5 帧最理想，足够讲清故事，又不会让 GIF 过大
- 移除 silicon 默认字体无法渲染的 unicode characters（checkmarks、fancy arrows）

**永远不要把 secrets 写进 demo text：**
- 不要把真实 credentials、API keys、tokens 或 session IDs 粘进任何 frame，即使它们来自真实运行
- 也不要替换成 `sk-xxxxxxxxx` 这类看起来像假的 credentials；这会产生 misleading artifact。改为重写 command，使用只显示*名称*且没有 value 的 env var（例如 `your-cli --api-key "$API_KEY"`），或展示不需要 secret 的其他 command
- 如果 sample output line 会包含 token、带 auth header 的 error trace 或其他 credential，删掉该行或选择不同 scenario；不要渲染它

## Step 2：拆分为 Frame Files

按 `---` lines 拆分 demo content，生成独立 text files，每帧一个：

- `[RUN_DIR]/frame-001.txt`
- `[RUN_DIR]/frame-002.txt`
- `[RUN_DIR]/frame-003.txt`
- etc.

## Step 3：Render and Stitch（渲染并拼接）

使用 capture pipeline script，在一次调用中通过 silicon 渲染每个 text frame，并 stitch 成 animated GIF：

```bash
python3 scripts/capture-demo.py screenshot-reel --output [RUN_DIR]/demo.gif --duration 2.5 --text [RUN_DIR]/frame-001.txt [RUN_DIR]/frame-002.txt [RUN_DIR]/frame-003.txt
```

该 script 会处理 silicon rendering、dimension normalization、two-pass palette generation，并在 GIF 超过 limits 时自动 reduce frames。Default duration 是每帧 2.5 seconds（比 browser reels 更快，因为 terminal frames 读起来更快）。

**如果 script 失败**（silicon rendering error、stitching error、empty output）：fallback 到 static screenshots tier。改为在 PR description 中用 code block 包含 raw terminal output。标记为 "Terminal output"，不要标为 "Screenshots"。

## Step 4：Cleanup（清理）

移除单独的 PNGs 和 text files。只保留 final GIF 用于 upload。

继续进入 `references/upload-and-approval.md`。
