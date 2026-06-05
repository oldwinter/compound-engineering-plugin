---
name: ce-setup
description: "诊断并配置 compound-engineering environment。检查 CLI dependencies、plugin version 和 repo-local config。为 missing tools 提供 guided installation。用于 troubleshooting missing tools、verifying setup，或 onboarding 前。"
disable-model-invocation: true
---

# Compound Engineering Setup（Compound Engineering 设置）

## Interaction Method（交互方式）

使用平台 blocking question tool 向用户询问下方每个问题：Claude Code 中用 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 搭配 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Gemini 中用 `ask_user`、Pi 中用 `ask_user`（需要 `pi-ask-user` extension）。只有 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中的 numbered list；不要因为需要 schema load 就 fallback。绝不要 silently skip 或 auto-configure。对于 multiSelect questions，接受 comma-separated numbers（例如 `1, 3`）。

Compound-engineering 的 interactive setup：诊断 environment health、清理 obsolete repo-local CE config，并帮助配置 required tools。Review agent selection 由 `ce-code-review` 自动处理；project-specific review guidance 属于 `CLAUDE.md` 或 `AGENTS.md`。

## Phase 1：Diagnose（诊断）

### Step 1：Determine Plugin Version（确定 Plugin Version）

通过读取 plugin metadata 或 manifest 检测 installed compound-engineering plugin version。这是 platform-specific：使用任何可用机制（例如从 plugin root 或 cache directory 读取 `plugin.json`）。如果无法确定 version，跳过此 step。

如果找到 version，通过 `--version` 传给 check script。否则省略该 flag。

### Step 2：Run the Health Check Script（运行健康检查 Script）

运行 script 前，显示："Compound Engineering -- checking your environment..."

运行 bundled check script。不要执行 manual dependency checks；script 会在一次 pass 中处理所有 CLI tools、agent skills、repo-local CE file checks 和 `.gitignore` guidance。

```bash
bash scripts/check-health --version VERSION
```

如果 Step 1 无法确定 version，则不带 version 运行：

```bash
bash scripts/check-health
```

Script reference（script 引用）：`scripts/check-health`

向用户展示 script output。

### Step 3：Evaluate Results（评估结果）

**Plugin root（pre-resolved，plugin 根目录）:** !`echo "${CLAUDE_PLUGIN_ROOT}"`

如果上方 line resolved 为 absolute path（以 `/` 开头且不含 `${`），这是 Claude Code session，`/ce-update` 可用。其他任何情况：empty、literal `${CLAUDE_PLUGIN_ROOT}` token，或 non-Claude harness 未处理 `!` pre-resolution 而留下的 unresolved command string（如 `echo "${CLAUDE_PLUGIN_ROOT}"`），都表示这不是 Claude Code；从 output 中省略任何 `/ce-update` references。

Diagnostic report 后，检查是否：

- 有 CLI tools missing（Tools section 中 yellow）
- 有 agent skills missing（Skills section 中 yellow）
- `compound-engineering.local.md` 存在且需要 cleanup
- `.compound-engineering/config.local.yaml` 不存在或未 safely gitignored
- `.compound-engineering/config.local.example.yaml` missing 或 outdated

如果所有内容已安装、不需要 repo-local cleanup，且 `.compound-engineering/config.local.yaml` 已存在并 gitignored，展示 tool 和 skill list 及 completion message。从 script output parse tool 和 skill names，并用 green circle 列出每项。如果 script output 中没有 Skills section，省略 Skills line：

```
 ✅ Compound Engineering setup complete

    Tools:  🟢 agent-browser  🟢 gh  🟢 jq  🟢 vhs  🟢 silicon  🟢 ffmpeg  🟢 ast-grep
    Skills: 🟢 ast-grep
    Config: ✅

    Run /ce-setup anytime to re-check.
```

如果这是 Claude Code session（上方 **Plugin root** resolved 为 non-empty path），在 message 后追加："Run /ce-update to grab the latest plugin version."

在此停止。

否则进入 Phase 2 resolve issues。先处理 repo-local cleanup（Step 4），再 config bootstrapping（Step 5），最后 missing dependencies（Step 6）。

## Phase 2：Fix（修复）

### Step 4：Resolve Repo-Local CE Issues（解决 Repo-Local CE 问题）

Resolve repository root（`git rev-parse --show-toplevel`）。如果 repo root 存在 `compound-engineering.local.md`，解释它已 obsolete，因为 review-agent selection 已自动化，CE 现在使用 `.compound-engineering/config.local.yaml` 存放仍需保留的 machine-local state。询问是否现在删除。删除时使用 repo-root path。

### Step 5：Bootstrap Project Config（初始化 Project Config）

Resolve repository root（`git rev-parse --show-toplevel`）。下方所有 paths 都相对 repo root，而不是 current working directory。

**Example file（示例文件，always refresh）:** 将 `references/config-template.yaml` 复制到 `<repo-root>/.compound-engineering/config.local.example.yaml`，必要时创建 directory。该文件会 commit 到 repo，并始终用 latest template overwrite，让 teammates 能看到 available settings。

**Local config（本地 config，create once）:** 如果 `.compound-engineering/config.local.yaml` 不存在，询问是否创建：

```
Set up a local config file for this project?
This saves your Compound Engineering preferences (like which tools to use and how workflows behave).
Everything starts commented out -- you only enable what you need.

1. Yes, create it (Recommended)
2. No thanks
```

如果用户 approve，将 `references/config-template.yaml` 复制到 `<repo-root>/.compound-engineering/config.local.yaml`。如果 `.compound-engineering/config.local.yaml` 尚未被 `.gitignore` 覆盖，提供添加 entry：

```text
.compound-engineering/*.local.yaml
```

如果 local config 已存在，检查它是否 safely gitignored。如果没有，按上方提供添加 `.gitignore` entry。

### Step 6：Offer Installation（提供安装）

用 multiSelect question 展示 missing tools 和 skills，且所有 items pre-selected。使用 script diagnostic output 中的 install commands 和 URLs。将 items 分组到 `Tools:` 和 `Skills:` 下，让用户看到每项 target 的 runtime；如果某 group 全部已安装，则省略该 group。

```
The following items are missing. Select which to install:
(All items are pre-selected)

Tools:
  [x] agent-browser - Browser automation for testing and screenshots
  [x] gh - GitHub CLI for issues and PRs
  [x] jq - JSON processor
  [x] vhs (charmbracelet/vhs) - Create GIFs from CLI output
  [x] silicon (Aloxaf/silicon) - Generate code screenshots
  [x] ffmpeg - Video processing for feature demos
  [x] ast-grep - Structural code search using AST patterns

Skills:
  [x] ast-grep - Agent skill for structural code search with ast-grep
```

只展示实际 missing 的 items。省略已安装 items。

### Step 7：Install Selected Dependencies（安装选中的依赖）

对每个 selected dependency，按顺序：

1. **展示 install command**（来自 diagnostic output），并请求 approval：

   ```
   Install agent-browser?
   Command: CI=true npm install -g agent-browser --no-audit --no-fund --loglevel=error && agent-browser install && npx skills add https://github.com/vercel-labs/agent-browser --skill agent-browser -g -y

   1. Run this command
   2. Skip - I'll install it manually
   ```

2. **如果 approved:** 使用 shell execution tool 运行 install command。Command 完成后，verify installation：
   - 对 CLI tool，运行 dependency 的 check command（例如 `command -v agent-browser`）。
   - 对 agent skill，当 `npx` 可用时优先使用 `npx --yes skills list --global --json | jq -r '.[].name' | grep -qx <skill-name>`；否则 fallback 到检查 `~/.claude/skills/<skill-name>`、`~/.agents/skills/<skill-name>` 或 `~/.codex/skills/<skill-name>` 是否存在（file、directory 或 symlink）。

3. **如果 verification succeeds:** Report success。

4. **如果 verification fails 或 install errors:** Display project URL as fallback，并继续下一个 dependency。

### Step 8：Summary（总结）

展示 brief summary：

```
 ✅ Compound Engineering setup complete

    Installed: agent-browser, gh, jq
    Skipped:   rtk

    Run /ce-setup anytime to re-check.
```

如果这是 Claude Code session（按 Step 3 的 platform detection），追加："Run /ce-update to grab the latest plugin version."
