---
title: "Local development shell aliases 因 zsh word-splitting、npm dependency 和缺失 Codex alias 而损坏"
date: 2026-03-26
category: developer-experience
module: developer-tooling
problem_type: developer_experience
component: tooling
symptoms:
  - "codex-ce alias 从 published npm 安装，而不是 local checkout"
  - "ccb 在 zsh 中报错 'no such file or directory: bun run /Users/.../src/index.ts'"
  - "bunx plugin-path 因 npm publishing 损坏而失败（已发布 2.42.0，但需要 2.54.1）"
  - "README 将 local dev 拆成两个无关 sections，导致 setup 不清楚"
  - "Codex local dev 没有 shell alias"
root_cause: incomplete_setup
resolution_type: documentation_update
severity: medium
related_components:
  - documentation
tags:
  - shell-aliases
  - local-development
  - zsh
  - codex
  - cli
  - readme
  - bunx
---

# Local development shell aliases 因 zsh word-splitting、npm dependency 和缺失 Codex alias 而损坏

## 问题

用于 local plugin development 的 shell aliases 以多种方式失败：Codex alias 从 remote npm package 而不是 local checkout 安装，string-variable CLI wrapper 在 zsh 中损坏，README 将 local dev instructions 分散在两个不连贯 sections 中。

## 症状

- `codex-ce` 运行 `bunx @every-env/compound-plugin install compound-engineering --to codex`（remote npm），而不是 local CLI，因此 local changes 从未被测试
- `ccb feat/fix-issue-389` 报错：`no such file or directory: bun run /Users/tmchow/code/compound-engineering-plugin/src/index.ts`，因为 zsh 将 `$CE_CLI` string variable 视为单个 command name
- `bunx @every-env/compound-plugin plugin-path` 因 `Unknown command plugin-path` 失败，因为 npm publishing 损坏（latest published：2.42.0，但 `plugin-path` 在 2.54.1 才添加）
- README 将 "Installing from a Branch" 和 "Local Development" 作为独立 sections，但二者都是 local dev scenarios
- 虽然 raw command 已记录，但没有 Codex local dev shell alias

## 无效做法

- **用 string variable 存 CLI path**：`CE_CLI="bun run $CE_REPO/src/index.ts"` 然后 `$CE_CLI args` -- zsh 不会像 bash 那样对未引用变量展开做 word-split。整个字符串会被视为单个 command name，导致 "no such file or directory."
- **所有 aliases 都用 `bunx`**：依赖最新版本已经发布到 npm。当 publishing 损坏或滞后时，任何新 CLI feature（例如 `plugin-path`）都无法通过 `bunx` 使用。
- **对需要 positional args 的函数使用 `alias`**：Shell aliases 无法将 `$1` 与剩余 args 分开消费。只有 functions 能 route positional parameters。

## 解决方案

将 README 重构为一个 "Local Development" section，包含三个 subsections，并修复所有 aliases，使其通过 function wrapper 使用 local CLI：

```bash
CE_REPO=~/code/compound-engineering-plugin

ce-cli() { bun run "$CE_REPO/src/index.ts" "$@"; }

# --- Local checkout (active development) ---
alias cce='claude --plugin-dir $CE_REPO/plugins/compound-engineering'

codex-ce() {
  ce-cli install "$CE_REPO/plugins/compound-engineering" --to codex "$@"
}

# --- Pushed branch (testing PRs, worktree workflows) ---
ccb() {
  claude --plugin-dir "$(ce-cli plugin-path compound-engineering --branch "$1")" "${@:2}"
}

codex-ceb() {
  ce-cli install compound-engineering --to codex --branch "$1" "${@:2}"
}
```

关键设计决策：

- **`ce-cli()` function** 替代 string variable，functions 在 bash 和 zsh 中都会正确 word-split
- **给 `cce` 用 `alias`** 可行，因为 trailing args 会被 shell 自动追加（不需要 positional routing）
- **给 `ccb`/`codex-ceb` 用 functions**，因为它们需要将 `$1` route 到 `--branch`，并单独 forward `${@:2}`
- **短名称**：`cce`/`ccb`（3 个字符）用于 Claude Code（最常见），`codex-ce`/`codex-ceb` 用于较少见的 target
- **所有 aliases 使用 local CLI**，因此不依赖 npm publishing

README 从以下结构重组：
- "Installing from a Branch"（独立 section）
- "Local Development"（独立 section）

变为：
- "Local Development" > "From your local checkout"（从本地 checkout）
- "Local Development" > "From a pushed branch"（从已 push 的 branch）
- "Local Development" > "Shell aliases"（shell aliases）

## 为什么有效

1. **Function wrappers 避免 zsh word-splitting 问题**：`ce-cli arg1 arg2` 在 bash 和 zsh 中都会将 `bun run "/path/to/index.ts" arg1 arg2` 作为独立 arguments 调用。String variables 只因 bash 默认 word-splitting 行为才可用。
2. **Local CLI 消除 npm dependency**：`bun run src/index.ts` 使用本地 checkout 的任何代码，因此新 commands 无需等待 publish cycle 就能立即工作。
3. **按 intent 分组，而不是按 mechanism**："Local Development" 才是用户关心的内容。source 是 local checkout 还是 pushed branch 是子细节，不是独立概念。

## 预防

- **Shell aliases 中的 multi-word commands 始终使用 function wrappers** -- zsh（自 Catalina 起为 macOS 默认）和 bash 对变量 word-splitting 的处理不同。Functions 在二者中都能正确工作。
- **Local dev tooling 默认使用 local CLI** -- npm publishing latency 或 breakage 不应阻塞 local development workflows。将 `bunx` 留给 consumer-facing install instructions。
- **按 user intent 组织文档** -- 按用户想做什么组织（例如 "local development"），而不是按 implementation mechanism（例如 "branch installs" vs "local checkout"）。
- **写入文档前在 zsh 中测试 shell aliases** -- 许多 developers 使用 zsh；添加到 README 前，测试 simple aliases 和 function wrappers。

## 相关 Issues

- [PR #395](https://github.com/EveryInc/compound-engineering-plugin/pull/395)：添加了 `plugin-path` command 和初始 shell alias examples，本文修复了其中问题
- [branch-based-plugin-install-and-testing.md](../developer-experience/branch-based-plugin-install-and-testing.md)：引入 branch-based workflow 的前置文档；本文记录的 aliases 是修正版
