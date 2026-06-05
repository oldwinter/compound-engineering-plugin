# Tier：Static Screenshots（静态截图）

捕获单独的 PNG screenshots。不做 animation，不做 stitching。

**Best for（适用场景）：** 其他 tools 不可用时的 fallback、library demos，或 animation 没有额外价值的 features。
**Output（输出）：** PNG files
**Label（标签）：** "Screenshots"
**Required tools（必需工具）：** Varies（web 使用 agent-browser，CLI 使用 silicon，或 native screenshot）

**Secrets rule 也适用。** 对 browser captures，不要打开 DevTools，不要截图带 tokens 的 URLs，并避免会显示 unmasked credentials 的页面。对 CLI captures，只渲染已确认没有 credentials 的 output：不要 env-var dumps，不要 `--api-key` flag values，不要 error traces 中的 auth headers。上传前扫描每个 PNG；如果出现任何 credential-like 内容，丢弃并重新 capture。

## 按 Project Type capture

### Web app 或 desktop app（agent-browser available）

如果未安装 `agent-browser`，告知用户："`agent-browser` is not installed. Run `/ce-setup` to install required dependencies." 然后跳到下面的 CLI 或 fallback sections。

```bash
agent-browser open [URL]
```

```bash
agent-browser wait 2000
```

```bash
agent-browser screenshot [RUN_DIR]/screenshot-01.png
```

捕获 1-3 张 screenshots：before state、feature in action、result state。

### CLI tool（CLI tool，silicon 可用）

运行 command，将 output 捕获到 text file，然后用 silicon 渲染：

```bash
silicon [RUN_DIR]/output.txt -o [RUN_DIR]/screenshot-01.png --theme Dracula -l bash --pad-horiz 20 --pad-vert 20
```

### CLI tool（CLI tool，无 silicon）

运行 command 并捕获 raw terminal output。在 PR description 中以 code block 包含 output，而不是 image。Label 为 "Terminal output"，不要标为 "Screenshot"。

### Library（库）

运行能 exercise new API 的 example code。按上面方式捕获 output（有 silicon 用 silicon，否则用 code block）。

## Upload（上传）

每个 PNG 单独上传。对每个文件进入 `references/upload-and-approval.md`，或全部上传后一起展示给用户 approval。

多个 screenshots 时，markdown embed 使用多行 image：

```markdown
## Screenshots

![Before](url-1)
![After](url-2)
```
