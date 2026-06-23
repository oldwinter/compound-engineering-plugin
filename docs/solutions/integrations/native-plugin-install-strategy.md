---
title: "受支持 harnesses 的 native plugin 安装策略"
date: 2026-06-19
last_updated: 2026-06-23
category: integrations
module: installer
problem_type: integration_decision
component: installer
symptoms:
  - "正式 standalone agent definitions 在不同 coding-agent harnesses 中支持不均"
  - "Custom Bun installs 会给用户增加额外 update 和 cleanup 行为"
  - "OpenCode 和 Pi 可以直接从 git-backed package/plugin shape 加载 skills"
root_cause: evolving_platform_install_surfaces
resolution_type: install_strategy
severity: medium
tags:
  - install-strategy
  - native-plugins
  - cursor
  - codex
  - copilot
  - droid
  - qwen
  - gemini
  - opencode
  - pi
---

# Native Plugin 安装策略

最后验证：2026-06-20

Compound Engineering 现在把 plugin 视为 self-contained skills package。Specialist reviewer 和 researcher behavior 位于 skill-local prompt assets 中，路径是 `references/agents/` 或 `references/personas/`；当当前 harness 暴露 subagent primitive 时，skills 会用这些文件 seed generic subagents。Plugin surface 中不再有 formal standalone CE agents。

安装策略也由此确定：优先使用各 harness 的 native plugin/package mechanism，避免 generated agent installs，并把 Bun converter 保留为 repo tooling，而不是面向用户的 installer。

## 摘要

| Harness | 当前安装路径 | 是否需要 Bun CLI? | 说明 |
| --- | --- | --- | --- |
| Claude Code | 使用 `.claude-plugin/marketplace.json` 和 `.claude-plugin/plugin.json` 的 native plugin marketplace | 否 | Claude 仍是 source plugin format。 |
| Codex | 从指向本仓库 root 的 custom marketplace 安装 native Codex plugin | 否 | Codex App 用户手动添加 marketplace，且不使用 sparse path；Codex CLI 用户注册 repo 后通过 `/plugins` 安装。Skill-local personas 避免了旧的 custom-agent copy step。 |
| Cursor | 使用 `.cursor-plugin/marketplace.json` 和 `.cursor-plugin/plugin.json` 的 native Cursor Plugin Marketplace | 否 | 用户可在 Cursor Agent chat 中用 `/add-plugin compound-engineering` 安装，或在 marketplace 中搜索。 |
| GitHub Copilot CLI | 使用现有 Claude plugin metadata 的 native plugin marketplace | 否 | Copilot 会自行转换 Claude plugin metadata。 |
| Factory Droid | 指向 CE GitHub repository 的 native plugin marketplace | 否 | Droid 会自动转换 Claude Code plugins。 |
| Qwen Code | 从 CE GitHub repository 和现有 Claude plugin metadata 进行 native extension install | 否 | Qwen 会自动转换 Claude Code extensions。 |
| OpenCode | `opencode.json` 中的 git-backed OpenCode plugin entry | 否 | `.opencode/plugins/compound-engineering.js` 会直接注册 CE skills directory。 |
| Pi | 从本仓库进行 git-backed Pi package install | 否 | 根 `package.json` 暴露 `.pi/extensions/compound-engineering.ts` 和 CE skills directory。`pi-ask-user` 是 richer prompts 的推荐 companion。 |
| Antigravity CLI | 从已提交的 `.agy/` bundle 安装 native Antigravity plugin | No | Clone repo，然后执行 `agy plugin install ./compound-engineering-plugin/.agy`。`.agy/` bundle 包含 `plugin.json` 以及 `skills -> ../skills` symlink。`agy` 仍会读取 `GEMINI.md` 作为 workspace context。 |

Kiro 不再是 documented CE install target。Historical converter 和 cleanup code 可以为 regression coverage 或旧 artifact handling 保留，但 user-facing install docs 不应继续宣传 Kiro。

## OpenCode

OpenCode 可以从 `opencode.json` 中的 git package entries 加载 plugins。CE 发布 `.opencode/plugins/compound-engineering.js`，它会解析本仓库的 `skills` directory，并把它追加到 OpenCode 的 skill paths。

推荐配置：

```json
{
  "plugin": ["compound-engineering@git+https://github.com/EveryInc/compound-engineering-plugin.git"]
}
```

本地开发时，指向当前 checkout：

```json
{
  "plugin": ["/path/to/compound-engineering-plugin/.opencode/plugins/compound-engineering.js"]
}
```

这会替代普通 CE 用户的旧 custom OpenCode Bun install path。Converter 仍可作为 development 或 compatibility tooling 存在，但它不是 primary install story。

## Pi

Pi 可以从 git repositories 安装 packages。CE 通过根 `package.json` 暴露 Pi package：

```json
{
  "pi": {
    "extensions": ["./.pi/extensions/compound-engineering.ts"],
    "skills": ["./skills"]
  }
}
```

安装：

```bash
pi install git:github.com/EveryInc/compound-engineering-plugin
```

推荐 companion：

```bash
pi install npm:pi-subagents
pi install npm:pi-ask-user
```

`pi-subagents` 是 CE workflows dispatch reviewer、research 或 implementation subagents 时必需的。`pi-ask-user` 只用于 richer blocking question UX。

本地开发：

```bash
pi -e /path/to/compound-engineering-plugin
```

## Antigravity CLI

Antigravity 从**本地目录**安装 plugins，不能从 URL 直接安装。已提交的 `.agy/` bundle 包含 `plugin.json` 以及 `skills -> ../skills` symlink，让 `agy` 通过 symlink 解析所有 skills，而无需复制它们：

```bash
git clone https://github.com/EveryInc/compound-engineering-plugin
agy plugin install ./compound-engineering-plugin/.agy
```

`agy` 仍会读取 `GEMINI.md` 作为 workspace context（即使 Gemini CLI converter target 已移除，仍保留该文件）。本地开发时，让 `agy` 指向 checkout 下的 `.agy/` 子目录，以便它同时找到 `plugin.json`、`skills` symlink 和 `GEMINI.md`。

## Bun Package Posture（Bun 包定位）

Root package 仍对以下场景有用：

- Repo development scripts 和 tests。
- OpenCode package metadata（`main`）。
- Pi package metadata（`pi` field）。
- Historical 或 fixture targets 的 shared converter code 与 regression tests。

它不是 public npm installer。Release automation 不应发布 `@every-env/compound-plugin`，README install instructions 也不应依赖 `bunx`。
