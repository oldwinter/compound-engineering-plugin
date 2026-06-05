---
title: "受支持 harnesses 的 native plugin 安装策略"
date: 2026-04-19
category: integrations
module: installer
problem_type: integration_decision
component: installer
symptoms:
  - "多个 harnesses 可从 shared roots discover 同一批 CE skills，造成 duplicates 或 shadowing"
  - "部分 harnesses 现在支持 native Claude-compatible plugin installs，使 custom Bun installs 变得冗余"
  - "旧 manual installs 可能在 CE rename 或 deprecate 后留下 stale skills 和 agents"
root_cause: evolving_platform_install_surfaces
resolution_type: install_strategy
severity: medium
tags:
  - install-strategy
  - native-plugins
  - legacy-cleanup
  - cursor
  - codex
  - copilot
  - droid
  - qwen
  - gemini
  - opencode
  - kiro
---

# Native Plugin 安装策略

最后验证：2026-04-19

本文记录按 harness 划分的目标 install model。当前优先级是把 native marketplace installs 与 custom Bun installs 分开，避免 CE 在不同工具之间创建 duplicate 或 shadowing skills。

## 摘要

| Harness | 预期安装路径 | 是否 custom Bun install? | 是否需要 legacy cleanup? | 说明 |
| --- | --- | --- | --- | --- |
| Claude Code | 使用现有 `.claude-plugin/marketplace.json` 和 `plugins/compound-engineering/.claude-plugin/plugin.json` 的 native plugin marketplace | 否 | 仅针对旧的/手动的 non-native installs（如有） | 当前 repo shape 已满足 Claude Code。 |
| Cursor | 使用现有 `.cursor-plugin/marketplace.json` 和 `plugins/compound-engineering/.cursor-plugin/plugin.json` 的 native Cursor Plugin Marketplace | 否，CE plugin install/convert target 已移除 | marketplace installs 不需要；只有确认存在 historical custom Cursor artifacts 时才添加 targeted cleanup | 用户从 Cursor Agent chat 用 `/add-plugin compound-engineering` 安装，或在 plugin marketplace 中搜索。 |
| GitHub Copilot CLI | 使用相同现有 `.claude-plugin` metadata 的 native plugin marketplace | 否，CE plugin install/convert target 已移除 | 是，在从旧 `.github/` custom installs migration 前或期间 | 已手工测试：Copilot 可以从现有 CE marketplace 安装并 load agents。 |
| Factory Droid | 指向 CE GitHub repository 的 native plugin marketplace | 否，CE plugin install/convert target 已移除 | 是，在从旧 `~/.factory` custom installs migration 前或期间 | Droid docs 表示 Claude Code plugins 可直接安装并自动转换；`ce-doc-review` 已在 Droid 中手工测试。 |
| Qwen Code | 从 CE GitHub repository 和现有 Claude plugin metadata 进行 native extension install | 否，CE plugin install/convert target 已移除 | 是，在从旧 `~/.qwen` custom installs migration 前或期间 | Qwen docs 表示 Claude Code extensions 可直接从 GitHub 安装并自动转换；native install 已于 2026-04-19 手工测试。 |
| OpenCode | Custom CE install 到 `~/.config/opencode/{skills,agents,plugins}` 加 merged `opencode.json`；仅在 source commands 存在时写入 | 是 | 是，每次 install | OpenCode plugins 是 JS/TS 或 npm hooks/tools，不是 CE full plugin payload 的 Claude-compatible marketplace install path。 |
| Pi | Custom CE install 到 `~/.pi/agent/{skills,prompts,extensions}` 加 MCPorter config；仅在 source commands 存在时写入 | 是，直到 CE 发布并测试 Pi package | 是，每次 install | Pi 有 package install support，但 CE 尚未把 compat extension、generated skills、prompts 和 MCPorter config 打包成经过测试的 Pi package。 |
| Codex | Hybrid：skills 使用 native Codex plugin install，custom agents 使用 active Codex root 下的 CE Bun install | 是，仅 agents，因为 native Codex plugins 当前不注册 bundled custom agents | 是，每次 Bun agent install | 安装到 non-default profile 时，每个 Codex step 使用相同 `CODEX_HOME` 或 `--codex-home`。 |
| Gemini CLI | 目前 custom CE install 到 `~/.gemini/{skills,agents}`；仅在 source commands 存在时写入；native extension packaging 存在但不适配 CE 当前 repo/package layout | 是，直到 CE 发布 Gemini extension root、release artifact 或 dedicated distribution branch/repo | 是，每次 install | 避免 `~/.agents/skills`；把 normalized Gemini agents 写到 `~/.gemini/agents`。 |
| Kiro CLI | Custom CE install 到 project `.kiro/{skills,agents,steering,settings}` | 是 | 是，每次 install；也有 manual `cleanup --target kiro` | Kiro 有自己的 JSON agent format 和 project-local install root。 |

已弃用的 targets：

- Windsurf 不再是 active CE install、convert 或 sync target。`cleanup --target windsurf` 仅保留用于备份之前 Bun installs 在 `~/.codeium/windsurf/` 或 workspace `.windsurf/` 下留下的旧 CE-owned files。

已移除的能力：

- Personal Claude Code home sync（`bunx @every-env/compound-plugin sync`）已移除。跨 unrelated harnesses 同步任意 `~/.claude` skills、commands、agents 和 MCP config 不是有边界的 compatibility surface；CE 只支持安装 CE plugin 并清理旧 CE-owned artifacts。

当前 CE command posture（命令姿态）：

- `compound-engineering` plugin 当前不发布 Claude `commands/` files。其 workflow entry points 是用 slash syntax 调用的 skills，例如 `/ce-plan`、`/ce-work` 和 `/ce-doc-review`。
- CLI 仍理解 source plugin commands，用于 legacy cleanup，以及转换仍发布 commands 的非 CE Claude plugins。除 legacy/source-plugin compatibility 外，CE install docs 不应把 commands 描述为当前 CE payload 的一部分。

## 全局决策：CE-Owned Installs 避免使用 `~/.agents`

正常 target installs 不要把 CE-owned skills 或 agents 安装到 `~/.agents`。

多个 harnesses 会读取 `~/.agents/skills`，但 Copilot CLI 会让 personal/project skill roots 优先于 plugin skills。写入 `~/.agents/skills` 的 Codex、Gemini、Pi 或其他 target 的 CE skill，可能静默 shadow Copilot native plugin install 中的同名 skill。这让 `~/.agents` 不适合作为共享 CE-managed install root。

改用 target-owned roots：

```text
OpenCode: ~/.config/opencode/skills/<skill>/SKILL.md
          ~/.config/opencode/agents/<agent>.md
          ~/.config/opencode/commands/*.md  # source commands only, if present
          ~/.config/opencode/opencode.json

Pi:       ~/.pi/agent/skills/<skill>/SKILL.md
          ~/.pi/agent/prompts/*.md  # source commands only, if present
          ~/.pi/agent/extensions/*.ts
          ~/.pi/agent/compound-engineering/mcporter.json

Codex:  ~/.codex/skills/compound-engineering/<skill>/SKILL.md
        ~/.codex/agents/compound-engineering/<agent>.toml

Gemini: ~/.gemini/skills/<skill>/SKILL.md
        ~/.gemini/agents/<agent>.md
        ~/.gemini/commands/*.toml  # source commands only, if present

Copilot: managed by native plugin install under ~/.copilot
Cursor:  managed by native Cursor Plugin Marketplace install
Droid:   managed by native plugin install under ~/.factory for user scope
Qwen:    managed by native extension install under ~/.qwen
```

`~/.agents/skills` 仅保留为 cleanup target，因为之前的 CE installs 或 experiments 可能在那里留下 shadowing skills。

## Claude Code（原生 plugin 安装）

### 决策

Claude Code 已经由当前 repo layout 满足：

- Root marketplace 路径：`.claude-plugin/marketplace.json`
- Plugin root 路径：`plugins/compound-engineering/`
- Plugin manifest 路径：`plugins/compound-engineering/.claude-plugin/plugin.json`
- Plugin components：plugin root 下的 `agents/`、`skills/` 和相关 files。如果未来重新引入 Claude `commands/`，也会支持；但 CE 当前不 ship 它们。

用户使用以下方式安装：

```text
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering
```

Claude Code 不应使用 custom Bun install 或 conversion。

### 清理

Native Claude plugin installs 由 Claude Code 拥有。CE cleanup command 不应删除 Claude Code 的 plugin cache。只有在发现 historical non-native Claude install path 时，它才应处理明确已知的 old/manual CE artifacts。

## Cursor（原生 marketplace 安装）

### 决策

Cursor 应使用 native Cursor Plugin Marketplace，而不是 `bunx @every-env/compound-plugin install compound-engineering --to cursor`。
Custom Cursor plugin install/convert target 已从 CLI target registry 移除。

repo 将 Cursor marketplace metadata 与 Claude marketplace 分开发布：

- Root marketplace 路径：`.cursor-plugin/marketplace.json`
- Plugin manifest 路径：`plugins/compound-engineering/.cursor-plugin/plugin.json`

用户从 Cursor Agent chat 安装：

```text
/add-plugin compound-engineering
```

也可以在 plugin marketplace 中搜索 "compound engineering"。

Cursor 不应使用 custom Bun install 或 conversion。

### 清理

Cursor marketplace installs 由 Cursor 拥有。CE 不应删除 Cursor 的 plugin marketplace cache。

如果发现来自旧 custom writer、可能 shadow marketplace installs 的 historical CE-owned Cursor artifacts，就为这些已知 artifacts 添加 targeted cleanup path。不要重新引入 Cursor 作为 active `convert` 或 `install` target。

## GitHub Copilot CLI（原生 plugin 安装）

### 决策

Copilot 应使用 native plugin install，而不是 `bunx @every-env/compound-plugin install compound-engineering --to copilot`。
Custom Copilot plugin install/convert target 已从 CLI target registry 移除。

Copilot CLI 可以读取：

- 来自 `.claude-plugin/marketplace.json` 的 marketplace manifests
- 来自 `.claude-plugin/plugin.json` 的 plugin manifests
- plugin `agents/` directory 中的 plugin agents
- plugin `skills/` directory 中的 plugin skills

用户在 Copilot CLI 内使用以下方式安装：

```text
/plugin marketplace add EveryInc/compound-engineering-plugin
/plugin install compound-engineering@compound-engineering-plugin
```

Shell 等价命令：

```bash
copilot plugin marketplace add EveryInc/compound-engineering-plugin
copilot plugin install compound-engineering@compound-engineering-plugin
```

除非出现真实 compatibility failure，否则不要添加并行的 `.github/plugin/marketplace.json`、`.github/plugin/plugin.json` 或 generated `agents-copilot/` directory。手工测试显示 Copilot 可以从现有 CE marketplace 安装并 load CE agents。

Copilot skill conflicts 不会像 Codex duplicate skills 那样显示。Copilot 按 `SKILL.md` 中的 `name` field deduplicate skills，并使用 first-found-wins precedence。Project 和 personal skill locations（包括 `~/.agents/skills`）先于 plugin skills load。因此，一个带 `name: ce-plan` 的 stale `~/.agents/skills/ce-plan/SKILL.md` 会 shadow plugin 的 `ce-plan`，导致 plugin skill 被静默忽略。

### 清理

旧 custom Copilot target 会在 `.github/` 风格 output 下写 generated files。以这种方式安装过的用户，应在 migration 前或期间运行 CE legacy cleanup，避免同时拥有来自旧 Bun output 和 native plugin 的 duplicate agents 或 skills。

对 Copilot 来说，“duplicate”通常意味着 silent shadowing，而不是两个可见 entries。切换到 native plugin install 前，cleanup 必须从 project 和 personal skill roots 中移除 CE-owned stale skills，否则用户看起来安装了 native plugin，实际却在运行旧 flat skill。

运行：

```bash
bunx @every-env/compound-plugin cleanup --target copilot
```

cleanup command 会备份已知 CE-owned Copilot artifacts，例如：

- 旧 installs 生成的 `.github/agents/*.agent.md` files
- 旧 installs 生成的 `.github/skills/*/SKILL.md` directories
- personal old installs 生成的 `~/.copilot/{agents,skills}` files
- 会 shadow native Copilot plugin skills 的 shared `~/.agents/skills/*` CE skills
- old writer 中任何 tracked install-manifest entries

除非 manifest/history 证明 CE ownership，否则不得删除 user-authored `.github/agents` 或 `.github/skills` content。

## Factory Droid（原生 plugin 安装）

### 决策

Droid 应使用 native plugin marketplace install，而不是 `bunx @every-env/compound-plugin install compound-engineering --to droid`。
Custom Droid plugin install/convert target 已从 CLI target registry 移除。

用户使用以下方式安装：

```bash
droid plugin marketplace add https://github.com/EveryInc/compound-engineering-plugin
droid plugin install compound-engineering@compound-engineering-plugin
```

Factory docs 描述 GitHub marketplace installation、user/project/org plugin scopes，以及 direct Claude Code plugin compatibility。它们明确表示 Droid 可以直接安装 Claude Code plugin 并自动 translate format。2026-04-19 的手工测试确认 Droid 可以从 CE plugin 运行 `ce-doc-review`，并 load skill 和 agents。

这意味着 Droid 现在在 CE distribution 上与 Claude Code 和 Copilot 属于同一类别：使用 native marketplace/plugin install path，而不是 generated custom Bun install。

### 清理

旧 custom Droid target 会在 `~/.factory` 下写 CE-owned artifacts，尤其是：

- `~/.factory/skills/*`
- `~/.factory/droids/*.md`
- `~/.factory/commands/*.md`
- old writer 创建的任何 CE install manifest 或 managed backup directory

在用户从旧 Bun install migration 到 native Droid plugin 前，legacy cleanup 应移除或备份 CE-owned generated files，避免 native plugin 被 stale local artifacts shadow。

运行：

```bash
bunx @every-env/compound-plugin cleanup --target droid
```

cleanup command 不得删除 Droid 的 native plugin cache 或 user-authored Droid files。它只应移除由 install manifest、known historical CE names 或 generated CE metadata 证明属于 CE-owned 的 artifacts。

## Qwen Code（原生 extension 安装）

### 决策

Qwen 应使用 native extension install，而不是 `bunx @every-env/compound-plugin install compound-engineering --to qwen`。
Custom Qwen plugin install/convert target 已从 CLI target registry 移除。

用户使用以下方式安装：

```bash
qwen extensions install EveryInc/compound-engineering-plugin:compound-engineering
```

Qwen Code extension docs 表示它可以直接从 GitHub 安装 Claude Code extensions，并自动将 Claude plugin metadata 转换为 Qwen extension metadata。2026-04-19 的手工测试确认 CE plugin 可通过 Qwen native path 成功安装。

这比 old custom writer 更合适，因为 Qwen 现在拥有 Claude-plugin compatibility layer。old writer 重复了这部分逻辑，并且没有完整地把 CE 的 agent-heavy skill content 重写成 Qwen subagent invocation syntax。

### 清理

旧 custom Qwen target 会在 `~/.qwen` 下写 CE-owned artifacts，尤其是：

- `~/.qwen/extensions/compound-engineering/`，其中 `qwen-extension.json` 带 CE-managed tracking keys
- `~/.qwen/skills/*`
- `~/.qwen/agents/*.yaml`
- `~/.qwen/agents/*.md`
- `~/.qwen/commands/*.md`

用户从旧 Bun install 迁移到 native Qwen extension 前，legacy cleanup 应移除或备份 CE-owned generated files，避免 native extension 被 stale local artifacts shadow。

运行：

```bash
bunx @every-env/compound-plugin cleanup --target qwen
```

Cleanup 只有在发现 legacy writer 写入的 CE-managed tracking keys 时，才备份 old extension root。这样可避免 successful native install 后误删 Qwen 当前的 native extension cache。

## OpenCode（保留 custom writer）

### 当前平台事实

OpenCode 当前 install/discovery model 是 file-based：

- Skills 是带 `SKILL.md` 的 direct child directories，位于 `.opencode/skills/<name>/`、`~/.config/opencode/skills/<name>/`、`.claude/skills/<name>/`、`~/.claude/skills/<name>/`、`.agents/skills/<name>/` 或 `~/.agents/skills/<name>/`。
- Agents 可在 `opencode.json` 中配置，或作为 Markdown files 放在 `~/.config/opencode/agents/` 或 `.opencode/agents/` 下。
- Commands 可在 `opencode.json` 中配置，或作为 Markdown files 放在 `~/.config/opencode/commands/` 或 `.opencode/commands/` 下。
- Plugins 是从 `.opencode/plugins/` 或 `~/.config/opencode/plugins/` 加载的 JavaScript/TypeScript modules，或 `opencode.json` 的 `plugin` option 中列出的 npm packages。

OpenCode 有 plugin system，但它不等价于 Claude/Copilot/Droid plugin marketplaces。官方 docs 描述的是 JS/TS hooks、custom tools、local plugin files 和 npm package loading。它们没有记录一个 native marketplace command，可指向 CE GitHub repository、读取 `.claude-plugin/marketplace.json`，并把 CE skills 和 agents 作为完整 plugin 安装。

### 决策

暂时保留 custom CE OpenCode writer：

```text
~/.config/opencode/opencode.json
~/.config/opencode/skills/<skill>/SKILL.md
~/.config/opencode/agents/<agent>.md
~/.config/opencode/commands/*.md  # source commands only, if present
~/.config/opencode/plugins/*.ts
~/.config/opencode/compound-engineering/install-manifest.json
```

这匹配 OpenCode 记录的 global config root，并允许 CE 转换完整 Claude-authored payload：skills、agents、hooks/plugins、MCP config，以及 source plugin 发布 commands 时的 source commands。未来 npm OpenCode plugin 可能对 hooks/tools 有用，但除非 OpenCode 增加更丰富的 package/install surface，否则它无法替代把 CE skills 和 agents 放入 OpenCode discovery roots 的需求。

CE-managed OpenCode installs 应避免 `~/.agents/skills`，理由与 Codex 和 Gemini 相同：OpenCode 可读取该 shared root，但 Copilot 也能读取它，并 shadow native plugin skills。

### 清理

OpenCode custom writer 应继续在每次 install 时 track 并 clean CE-owned files：

- 旧 CE-owned `~/.config/opencode/skills/*`
- 旧 CE-owned `~/.config/opencode/agents/*`
- 旧 CE-owned `~/.config/opencode/commands/*`
- 旧 CE-owned `~/.config/opencode/plugins/*`
- previous experiments 或 installs 留在 `~/.agents/skills/*` 下的旧 CE-owned shared skills
- 因 skill、agent 或 command rename/remove 而消失的 manifest-tracked files

## Pi（保留 custom writer）

### 当前平台事实

Pi 支持 file-based skills 和 package installs。它的 package surface 可 bundle skills、prompts、extensions 及相关 package metadata，`pi install` 可从 npm、git、URLs 或 local paths 等 package sources 安装。

Pi 也通过 `~/.agents/skills` 和 `.agents/skills` 提供 shared skill discovery，但 CE 不应使用这些 shared roots，理由与 OpenCode、Codex 和 Gemini 相同：Copilot 会在 plugin skills 之前读取 shared personal/project skills，因此为 Pi 安装在那里的 CE skill 可能 shadow Copilot 的 native plugin install。

CE 当前 Pi compatibility 不是 raw Claude-compatible plugin install。converter 当前会：

- 复制 platform-compatible CE skills。
- 将 Claude agents 转换为 generated Pi skills，因为 Pi 今天没有为此 payload 提供 Claude-style plugin `agents/` runtime equivalent。
- 写入 `compound-engineering-compat.ts` extension，提供 subagent invocation 和 MCPorter access 等 compatibility tools。
- 将 Claude MCP server config 转换为供 MCPorter 使用的 `compound-engineering/mcporter.json`。
- 仅当 source plugin 发布 commands 时，将 source commands 写为 prompts。

### 决策

暂时保留 custom CE Pi writer：

```text
~/.pi/agent/skills/<skill-name>/SKILL.md
~/.pi/agent/prompts/*.md
~/.pi/agent/extensions/compound-engineering-compat.ts
~/.pi/agent/compound-engineering/mcporter.json
~/.pi/agent/compound-engineering/install-manifest.json
~/.pi/agent/AGENTS.md  # CE-managed compatibility block
```

这是 pragmatic install target，不是理想的长期 distribution shape。长期方向应是可用 `pi install` 安装的真实 Pi package，但在我们打包并测试完整 payload 之前，CE 不应把它宣传为 primary path：copied skills、generated agent skills、prompts、compatibility extension、MCPorter config 和 cleanup behavior 都必须覆盖。

不要把 CE Pi artifacts 安装到 `~/.agents/skills`。

### 清理

Pi custom writer 应继续在每次 install 时 track 并 clean CE-owned files：

- 旧 CE-owned `~/.pi/agent/skills/*`
- 旧 CE-owned `~/.pi/agent/prompts/*`
- 旧 CE-owned `~/.pi/agent/extensions/*`
- prior CE installs 生成的旧 agent-as-skill artifacts
- 因 skill、prompt、generated agent skill 或 extension rename/remove 而消失的 manifest-tracked files

也可手动 cleanup：

```bash
bunx @every-env/compound-plugin cleanup --target pi
```

Future Pi package work 在把用户从当前 custom writer 切换到 native `pi install` package 前，应保留相同 cleanup semantics。

## Codex（hybrid native plugin + Bun agents，混合 native plugin 与 Bun agents）

### 当前平台事实

2026-05-14 更新：CE 的 Codex install 现在是 hybrid profile-aware flow：

1. `codex plugin marketplace add <source>` 在 active Codex home 中注册 marketplace。
2. Codex `/plugins` TUI 从该 marketplace 安装 native CE plugin skills。
3. `bunx @every-env/compound-plugin install compound-engineering --to codex` 安装这些 skills delegation 所需的 CE custom agents。

三个操作必须指向同一个 Codex root。对于 named profile，应一致设置 `CODEX_HOME`：

```bash
CODEX_HOME="$HOME/.codex/profiles/work" codex plugin marketplace add EveryInc/compound-engineering-plugin
CODEX_HOME="$HOME/.codex/profiles/work" bunx @every-env/compound-plugin install compound-engineering --to codex
CODEX_HOME="$HOME/.codex/profiles/work" codex
```

在 Codex 内运行 `/plugins`，选择 Compound Engineering marketplace，并安装 `compound-engineering`。仅注册 marketplace 只会让 plugin 可用；TUI install 才会激活 native skills。在 Codex native plugins 能注册 bundled agents 之前，CE custom agents 仍需要 Bun step。

当前 Codex docs 将 user skills 描述在 `~/.agents/skills` 下，repo skills 描述在 `.agents/skills` 下。Codex 还会从 `/etc/codex/skills` 读取 admin skills，并读取 OpenAI bundled system skills。Codex 支持 symlinked skill folders，并 follow symlink targets。

Empirical note：Codex 仍会 discover legacy `~/.codex/skills` entries。2026-04-18，我们在 `~/.agents/skills/ce-duplicate-discovery-smoke` 和 `~/.codex/skills/ce-duplicate-discovery-smoke` 中创建相同 skill name；Codex skill picker 显示了两个 entries。

尽管当前 Codex docs 偏向 `~/.agents/skills`，CE 不应写入那里，因为这些 files 可能 shadow Copilot 的 native plugin skills。CE 应使用 Codex-specific compatibility root：

```text
~/.codex/skills/compound-engineering/<skill-name>/SKILL.md
```

这种 shape 让 CE Codex skills 与 Copilot/Gemini shared discovery roots 隔离，同时仍为 Codex 提供 namespaced skill pack。

Codex 也有 custom agents 和 plugin model：

- Custom agents 是 `~/.codex/agents/` 或 `.codex/agents/` 下的 standalone TOML files。
- 每个 custom agent 都需要 `name`、`description` 和 `developer_instructions`。
- Codex 只有在明确要求时才会 spawn subagents。

Codex plugins 存在，但当前 public distribution 仍是 local/personal：

- Repo marketplace 路径：`$REPO_ROOT/.agents/plugins/marketplace.json`
- Personal marketplace 路径：`~/.agents/plugins/marketplace.json`
- Typical personal plugin storage 路径：`~/.codex/plugins/<plugin-name>`
- Installed plugin cache 路径：`~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`
- Official public plugin publishing 仍标记为 coming soon。

这意味着 Codex 有 plugin model，但还没有足够替代普通用户 CE custom install 的 Copilot-style “point at GitHub marketplace repo and install globally” distribution path。

### Superpowers 的做法（参考模式）

Superpowers 的 Codex install guide 是 skill-discovery install，不是 Codex plugin install：

```bash
git clone https://github.com/obra/superpowers.git ~/.codex/superpowers
mkdir -p ~/.agents/skills
ln -s ~/.codex/superpowers/skills ~/.agents/skills/superpowers
```

真实内容位于：

```text
~/.codex/superpowers
```

discovery entry 位于：

```text
~/.agents/skills/superpowers -> ~/.codex/superpowers/skills
```

因此 `~/.codex/superpowers` 是 backing store，`~/.agents/skills/superpowers` 是用于让 Codex discover skills 的 symlink。它们的 migration instructions 还会从 `~/.codex/AGENTS.md` 移除旧 bootstrap block，这暗示早期存在 non-skill-discovery install path。

这很有用，但有一些不应盲目复制的 tradeoffs：

- 它要求用户手动 clone 和 update Git repo。
- 它使用 `~/.agents/skills` 下的 namespaced subfolder。
- 它针对 Codex 优化，但 `~/.agents/skills` 可能 shadow Copilot native plugin skills。
- 它适用于 pass-through source skills，但 CE 的 Codex target 还会从 agents/commands 生成 target-specific artifacts、转换 content、写 prompt wrappers，并管理 cleanup。除非我们有意放弃这些 converted artifacts，否则 raw clone + symlink 仍需要 generation/cleanup step。

值得借鉴的是把 plugin files 隔离到 named folder 下的思路。应避免的是把 CE-owned files 写入 `~/.agents/skills`，或要求普通用户执行 manual clone/update workflow。

### Subfolder 决策（子目录策略）

CE Codex installs 不要使用 `~/.agents/skills`。即使 Codex 能 discover 它，Copilot 也会读取它，并让这些 skills shadow native plugin skills。

CE 的 Codex target 使用 Codex-specific namespaced folder：

```text
~/.codex/skills/compound-engineering/<skill-name>/SKILL.md
```

这不是 documented modern Codex skill path，因此 implementation 应保留 current Codex discovery behavior 的 smoke test。这个 tradeoff 是有意的：比起写入会破坏 Copilot plugin isolation 的 shared root，我们更偏好 Codex-only compatibility path。

### Source-of-Truth 决策（真源策略）

对 Codex 而言，`~/.codex` 是 CE-owned Codex artifacts 的 durable source of truth。将所有 generated Codex artifacts 保持在 Codex-owned roots 下，并用 manifest track：

```text
~/.codex/skills/compound-engineering/<skill-name>/SKILL.md
~/.codex/agents/compound-engineering/<agent-name>.toml
~/.codex/compound-engineering/install-manifest.json
```

不要从 `~/.agents/skills` 创建指向这些 Codex-owned files 的 symlinks。

### 预期 CE Codex Plan

目前：

- 保留 custom CE Codex install path。
- 每次 custom Codex install 都运行 legacy cleanup。
- 将 generated/converted skills 安装到 `~/.codex/skills/compound-engineering/<skill-name>/SKILL.md`。
- 将 Claude Markdown agents 转换为 `~/.codex/agents/compound-engineering/<agent-name>.toml` 下的 Codex TOML custom agents。
- 用 source category 和 CE agent name 命名 converted agents，例如 `review-ce-correctness-reviewer` 或 `research-ce-repo-research-analyst`，并重写 skill orchestration text 来 spawn 这些 names。
- 在 `~/.codex/compound-engineering/install-manifest.json` 中 track generated skills、prompts 和 agents。
- 将 Codex-only artifacts 保持在 `~/.codex` 下，例如 prompt wrappers、`config.toml` MCP entries 和 Codex TOML custom agents。
- 当 referenced agent 已知时，将 `Task`/agent references 重写为 spawn generated Codex custom agents。
- Track install manifest，以便之后清理 removed skills 和 renamed skills。
- 从 git history track historical CE artifacts，以便安全清理 old flat installs、prompt files 和 converted-agent skills。

不要要求用户为 Codex clone CE repo。CLI 应继续从 package 或 branch source fetch/install，然后写入 local Codex-compatible output。

### Smoke Test 结果（烟测结果）

2026-04-18，我们用 local smoke test 验证了 proposed Codex split：

```text
~/.agents/skills/ce-codex-agent-smoke/SKILL.md
~/.codex/agents/ce-codex-agent-smoke.toml
```

该 skill 显式要求 Codex spawn `ce_codex_agent_smoke` custom agent。Codex discover 了 skill，spawn 了 TOML custom agent，等待完成，并返回 expected marker：

```text
CODEX_TOML_AGENT_SMOKE_OK
```

这确认了预期 CE Codex architecture 可行：workflow skills 可以 invoke 转换为 `~/.codex/agents` 中 Codex TOML custom agents 的 Claude-authored agents。skill root 现在应从测试用的 `~/.agents/skills` path 移到 `~/.codex/skills/compound-engineering` 下的 isolated CE path。

2026-04-19，我们还验证了 Codex 能 discover 下列 nested TOML custom agents：

```text
~/.codex/agents/compound-engineering/<agent-name>.toml
```

并接受 `ce-codex-hyphen-toml-smoke` 这样的 hyphenated TOML `name` values。因此 CE 应使用 nested `compound-engineering` agent root，以便与 `~/.codex/skills/compound-engineering/` 保持 cleanup parity。

我们还测试了三种形态的 Codex native plugin-bundled agents：

```text
plugins/<plugin>/agents/<agent>.toml
plugins/<plugin>/.codex/agents/<agent>.toml
plugins/<plugin>/.codex-plugin/plugin.json with "agents": "./agents/"
```

所有 installed plugin skills 都能 load，但 spawning bundled custom agents 时失败，错误为 `unknown agent_type`。因此 Codex native plugins 目前还不足以作为 agent-heavy workflows 的完整 CE install path。

同一天，我们通过安装两个同 `name` skills 验证了 duplicate discovery behavior：

```text
~/.agents/skills/ce-duplicate-discovery-smoke/SKILL.md
~/.codex/skills/ce-duplicate-discovery-smoke/SKILL.md
```

Codex 在 picker 中显示了两个 skill entries，一个来自 `~/.agents/skills`，一个来自 `~/.codex/skills`。这确认任一 root 中残留的旧 CE skills 都可能造成 visible duplicates。在写入 namespaced `~/.codex/skills/compound-engineering` install 前，cleanup 必须同时移除 `~/.agents/skills` 和 legacy flat `~/.codex/skills` 中的 CE-owned stale skills。

同样在 2026-04-18，我们用三种 shape 测试了 Codex、Copilot 和 Gemini 的 nested skill discovery：

```text
~/.agents/skills/ce-flat-discovery-smoke/SKILL.md
~/.agents/skills/ce-nested-pack/ce-nested-discovery-smoke/SKILL.md
~/.agents/skills/ce-symlink-pack -> ~/.agents/ce-discovery-packs/ce-symlink-pack/skills
```

结果：

| Harness | Flat direct skill | Regular nested skill | Superpowers-style symlink pack |
| --- | --- | --- | --- |
| Codex | Worked | Worked | Worked |
| Copilot CLI | Worked | Not found | Not found |
| Gemini CLI | Worked | Not found | Not found |

shared skill roots 的结论：cross-harness `~/.agents/skills` installs 只有在 skills 是 direct children 时才具备 portability：

```text
~/.agents/skills/<skill-name>/SKILL.md
```

但 CE 不应再安装到那里，因为 Copilot plugin skills 可能被 `~/.agents/skills` shadow。应把这些结果视为 cleanup/discovery context，而不是 target install shape。

### 未来的 Codex Plugin 选项（后续方向）

Codex 现在有 documented marketplace/plugin install path。CE 将其用于 skills，但它仍不能作为唯一 install path，因为 plugin-bundled custom agents 在测试中没有注册成功。

当 Codex documented 并支持 plugin-bundled custom agents，或 plugin installer 能声明应安装到用户 custom-agent roots 的 files 时，再 revisit Codex native plugins。

在此之前，预期 Codex install 仍是 hybrid：skills 使用 native plugin install，converted custom agents 使用 CE Bun install。

## Gemini CLI（保留 custom install）

### 当前平台事实

Gemini 有两个相关 install surfaces：

1. Shared/user skills（共享/用户 skills）：
   - Workspace skills 路径：`.gemini/skills/` 或 `.agents/skills/`
   - User skills 路径：`~/.gemini/skills/` 或 `~/.agents/skills/`
   - Installed extensions 内 bundled 的 extension skills
2. Extensions（扩展）：
   - 使用 `gemini extensions install <source>` 安装
   - `<source>` 可以是 GitHub repository URL 或 local path
   - Gemini 在 installation 期间复制 extension
   - Installed extensions 位于 `~/.gemini/extensions`
   - `gemini extensions link <path>` 会 symlink 一个 local development extension，以便 immediate iteration

Gemini extension roots 要求 `gemini-extension.json`。extension 可 bundle：

- `skills/<skill-name>/SKILL.md`
- `commands/*.toml`
- 用于 preview subagents 的 `agents/*.md`
- `GEMINI.md` context via `contextFileName`
- MCP server config（MCP server 配置）
- hooks（hooks）
- policies（策略）
- themes（主题）

对于 remote distribution 和 public gallery discovery，Gemini 要求 `gemini-extension.json` 位于 GitHub repository 或 release archive 的 absolute root。`gemini extensions install <source>` 接受 GitHub repository URL 或 local path，但 documented 且 locally verified 的 command 不包含用于 extension installs 的 monorepo `--path` option。

Gemini subagents 是带 YAML frontmatter 的 Markdown files。Local user/project agents 记录在：

```text
~/.gemini/agents/*.md
.gemini/agents/*.md
```

Extension subagents 记录在：

```text
<extension-root>/agents/*.md
```

Shared `.agents/*` alias 只记录用于 skills，不用于 subagents。

Gemini CLI 0.38.2 implementation 也确认了这一点：user agents resolve 到 `~/.gemini/agents`，project agents resolve 到 `.gemini/agents`，而 shared aliases 只存在于 skill directories（`~/.agents/skills` 和 `.agents/skills`）。不要把 `~/.agents/agents` 用作 Gemini 的 shared CE agent install root。

### Discovery Test 结果

2026-04-18，我们用三种 shape 测试了 Gemini shared skill discovery：

```text
~/.agents/skills/ce-flat-discovery-smoke/SKILL.md
~/.agents/skills/ce-nested-pack/ce-nested-discovery-smoke/SKILL.md
~/.agents/skills/ce-symlink-pack -> ~/.agents/ce-discovery-packs/ce-symlink-pack/skills
```

Gemini 只 discover 了 flat direct skill。它没有 discover regular nested skill，也没有 discover Superpowers-style symlink pack。

如果手动使用 `~/.agents/skills`，Gemini-compatible skills 必须是 direct children：

```text
~/.agents/skills/<skill-name>/SKILL.md
```

CE 不应将该 path 用于 managed Gemini installs，因为它可能 shadow Copilot plugin skills。

### 预期 CE Gemini Plan

目前，保留 custom CE Gemini install path，并直接写入 Gemini-owned roots：

```text
~/.gemini/skills/<skill-name>/SKILL.md
~/.gemini/agents/<agent-name>.md
~/.gemini/commands/*.toml  # source commands only, if present
~/.gemini/compound-engineering/install-manifest.json
```

Gemini writer 应将 pass-through skills 复制到 `~/.gemini/skills`，在 `~/.gemini/agents` 中生成 normalized flat Gemini subagents，并在 CE 重新发布 commands 时，将 command TOML files 写到 `~/.gemini/commands` 下。

Gemini extension distribution 已经支持。CE 的 blocker 是 packaging shape：我们的 source repo 是 multi-plugin repo，CE plugin root 是 `plugins/compound-engineering/`，而 Gemini extension installs 期望 `gemini-extension.json` 位于 extension source root。当前 Gemini extension install 不支持 documented monorepo `--path` flow。

一旦 CE 发布以下任一 shape，Native Gemini extension packaging 就应成为 preferred Gemini distribution path：

- 以 repository 或 release archive root 发布的 generated extension root（生成式 extension root）
- dedicated Gemini extension repository（专用 Gemini extension repository）
- root 为 Gemini extension root 的 distribution branch（distribution branch）

该 extension root 应是 generated/normalized，而不只是加了 `gemini-extension.json` 的 Claude plugin directory，因为 Gemini 会 load direct `agents/*.md` files，并 validate Gemini-shaped agent frontmatter。

implementation 中需要验证的 open questions：

- Gemini 是否支持 extensions 的 undocumented repository subdirectory syntax。当前 docs 和 local help 只显示 whole GitHub repository URLs 或 local paths。
- Gemini preview subagents 是否对所有 users 默认启用，或某些 versions/environments 中需要 settings。
- Gemini extension subagent invocation names 如何从 nested Claude agent paths 映射。

### 清理

Gemini custom writer 必须 clean 旧 CE-owned artifacts，避免用户看到 duplicates 或 stale converted-agent skills。

Cleanup 应覆盖：

- 旧 CE-owned `.gemini/skills/*`
- 旧 CE-owned `.gemini/agents/*`
- 旧 CE-owned `.gemini/commands/*`
- 旧 CE-owned `~/.gemini/skills/*`
- 旧 CE-owned `~/.gemini/agents/*`
- 旧 CE-owned `~/.gemini/commands/*`
- older experiments 或 installs 留在 `~/.agents/skills/*` 下的任何 CE-owned flat shared skills
- 如果需要 uninstall/reinstall broken pre-release，则包括任何 future CE-owned extension install

## 来源

- Claude/Copilot marketplace metadata 路径：`.claude-plugin/marketplace.json`
- Cursor marketplace metadata 路径：`.cursor-plugin/marketplace.json`
- Claude plugin manifest 路径：`plugins/compound-engineering/.claude-plugin/plugin.json`
- Cursor plugin manifest 路径：`plugins/compound-engineering/.cursor-plugin/plugin.json`
- Copilot plugin reference 文档：`https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference`
- Copilot CLI plugins overview 文档：`https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-plugins`
- Factory Droid plugin configuration 文档：`https://docs.factory.ai/cli/configuration/plugins`
- Factory Droid plugin build guide 文档：`https://docs.factory.ai/guides/building/building-plugins`
- OpenCode config 文档：`https://opencode.ai/docs/config/`
- OpenCode skills 文档：`https://opencode.ai/docs/skills`
- OpenCode agents 文档：`https://opencode.ai/docs/agents/`
- OpenCode commands 文档：`https://opencode.ai/docs/commands/`
- OpenCode plugins 文档：`https://opencode.ai/docs/plugins/`
- Pi overview 文档：`https://buildwithpi.ai/README.md`
- Pi skills/packages 文档：`https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md`, `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md`
- Codex skills 文档：`https://developers.openai.com/codex/skills`
- Codex plugin build/distribution docs 文档：`https://developers.openai.com/codex/plugins/build`
- Superpowers Codex install guide 文档：`https://github.com/obra/superpowers/blob/main/.codex/INSTALL.md`
- Gemini extension reference 文档：`https://geminicli.com/docs/extensions/reference/`
- Gemini extension build guide 文档：`https://geminicli.com/docs/extensions/writing-extensions/`
- Gemini skills 文档：`https://geminicli.com/docs/cli/skills/`
- Gemini subagents 文档：`https://geminicli.com/docs/core/subagents/`
- Gemini subagents announcement 文章：`https://developers.googleblog.com/subagents-have-arrived-in-gemini-cli/`
