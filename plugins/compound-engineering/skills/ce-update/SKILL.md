---
name: ce-update
description: |
  检查 compound-engineering plugin 是否 up to date；如果不是，推荐 update
  command。当用户说 "update compound engineering"、"check compound engineering
  version"、"ce update"、"is compound engineering up to date"、"update ce
  plugin"，或报告可能来自 stale compound-engineering plugin version 的问题时使用。
  此 skill 只在 Claude Code 中工作，因为它依赖 plugin harness cache layout。
disable-model-invocation: true
ce_platforms: [claude]
allowed-tools: Bash(bash *upstream-version.sh), Bash(bash *currently-loaded-version.sh), Bash(bash *marketplace-name.sh)
---

# Check Plugin Version（检查 Plugin 版本）

验证 installed compound-engineering plugin version 是否匹配 `main` 上的 upstream `plugin.json`；如果不匹配，推荐 update command。仅 Claude Code。

Upstream version 来自 `main` 上的 `plugins/compound-engineering/.claude-plugin/plugin.json`，而不是 latest GitHub release tag，因为 marketplace 从 `main` HEAD 安装 plugin contents。只要 `main` ahead of last tag（releases 之间的 normal state），与 release tags 比较就会 false-positive。

## Step 1：Probe versions（探测版本）

通过 Bash tool 并行运行以下三个 scripts。每个 script 打印单行 output；捕获这些 values，用于下方 decision logic。使用 `${CLAUDE_SKILL_DIR}`，确保路径在 `claude --plugin-dir` local-development sessions 和 standard marketplace-cached installs 中都正确 resolve。

```bash
bash "${CLAUDE_SKILL_DIR}/scripts/upstream-version.sh"
bash "${CLAUDE_SKILL_DIR}/scripts/currently-loaded-version.sh"
bash "${CLAUDE_SKILL_DIR}/scripts/marketplace-name.sh"
```

`scripts/upstream-version.sh` 通过 `gh api` 读取 `main` 上的 `plugin.json`。它打印 version string；如果 `gh` unavailable 或 rate-limited，则打印 sentinel `__CE_UPDATE_VERSION_FAILED__`。

`scripts/currently-loaded-version.sh` 和 `scripts/marketplace-name.sh` 按 marketplace-cache layout 解析 `${CLAUDE_SKILL_DIR}`：`~/.claude/plugins/cache/<marketplace>/compound-engineering/<version>/skills/ce-update`。它们打印 version segment / marketplace segment；如果 path 不匹配（`claude --plugin-dir` local development 的典型情况），则打印 sentinel `__CE_UPDATE_NOT_MARKETPLACE__`。

## Step 2: Apply decision logic（应用决策逻辑）

### Handle failure cases（处理失败情况）

如果 `scripts/upstream-version.sh` 打印 `__CE_UPDATE_VERSION_FAILED__`：告诉用户 upstream version 无法 fetched（gh 可能 unavailable 或 rate-limited），然后停止。

如果 `scripts/currently-loaded-version.sh` 打印 `__CE_UPDATE_NOT_MARKETPLACE__`：说明 skill 从 standard marketplace cache 外加载。两种情况使用同一处理：`claude --plugin-dir` local-development session，或 non-Claude-Code platform（此 skill 因依赖 plugin harness cache layout 而仅支持 Claude Code）。告诉用户：

> "Skill 是从 `~/.claude/plugins/cache/` 的 marketplace cache 外加载的。使用 `claude --plugin-dir` 做 local development 时这是正常情况。本 session 无需操作。你的 marketplace install（如果有）不受影响；请在 regular Claude Code session（不带 `--plugin-dir`）中运行 `/ce-update` 检查该 cache。"

然后停止。

### Compare versions（比较版本）

**Up to date（已是最新）** — `currently_loaded == upstream`：

> "compound-engineering **v{version}** is installed and up to date."

中文含义：compound-engineering **v{version}** 已安装且是最新版本。

**Out of date（需要更新）** — `currently_loaded != upstream`：

> "compound-engineering is on **v{currently_loaded}** but **v{upstream}** is available.
>
> Update with（使用以下命令更新）:
> ```
> claude plugin update compound-engineering@{marketplace_name}
> ```
> 然后 restart Claude Code 以应用。"

中文含义：compound-engineering 当前为 **v{currently_loaded}**，已有 **v{upstream}** 可用；用上述 command 更新，然后 restart Claude Code 以应用。

`claude plugin update` command 随 Claude Code 本身提供，用于把 installed plugins 更新到 latest version；它替代了早期 manual cache sweep / marketplace-refresh workarounds。Marketplace name 从 skill path 派生，而不是 hardcoded，因为此 plugin 以多个 marketplace names 分发（例如 README 中 public installs 使用 `compound-engineering-plugin`，internal/team marketplaces 可能使用其他 names）。
