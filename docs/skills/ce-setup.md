# `ce-setup`

> 诊断你的环境、安装缺失 tools，并 bootstrap project-local config：一个 interactive flow 完成。

`ce-setup` 是 **onboarding** skill。它诊断已安装内容、缺失内容、plugin version、repo-local config 状态，并为缺失部分提供 guided installation。首次安装、升级 plugin 后、排查为什么某个 skill 说 tool 不可用，或把新 repo onboarding 到 compound-engineering 前，都可以运行它。

Beta-style explicit-invocation only（`disable-model-invocation: true`）：不会 auto-fire。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 运行 environment diagnostic，展示 missing tools/skills 和 install commands，bootstrap `.compound-engineering/config.local.yaml`，可选添加 `.gitignore` entry |
| 何时使用？ | First-time install、post-upgrade health check、"why does this skill say X isn't installed?"、new repo onboarding |
| 产出什么？ | Confirmed-installed report，或 missing tools 的 guided install flow，外加 bootstrapped local config |
| 状态 | Explicit-invocation only |

---

## 问题

Compound-engineering 依赖多个 external CLIs 和 per-repo config，很容易漏掉：

- **Tool dependencies**：`agent-browser`、`gh`、`jq`、`vhs`、`silicon`、`ffmpeg`、`ast-grep`；每个 install command 不同，且并非都显而易见
- **Skill dependencies**：一些 skills 依赖其他 agent skills（例如 `ast-grep` skill）；哪些需要、装到哪里并不透明
- **Plugin version drift**：旧 installed plugin 行为与 current docs 不同；不检查的话，用户会把已修复 bugs 报成 bug reports
- **Per-repo config**：`.compound-engineering/config.local.yaml` 存放 machine-local settings；没有 bootstrap 时，`ce-product-pulse` 等 skills 每次都会问相同问题
- **Stale legacy config**：`compound-engineering.local.md` 是旧格式；遗留文件会造成混淆
- **Gitignore gotchas**：`.compound-engineering/config.local.yaml` 应该 gitignored（machine-local），但不总是；用户可能意外 commit secrets
- **Manual setup is tedious**：逐个安装 7 个 tools 并记住正确命令很有 friction

## 解决方案

`ce-setup` 用 diagnostic-then-fix flow 执行 setup：

- **Phase 1: Diagnose**：运行一次 `bash scripts/check-health`；一次性报告 tool/skill installation status、plugin version、repo-local CE config state
- **Phase 2: Fix**（仅当存在 issues）：
  - 处理 repo-local cleanup（存在 obsolete `compound-engineering.local.md` 时删除）
  - Bootstrap `.compound-engineering/config.local.yaml`（询问是否从 template 创建，是否加入 `.gitignore`）
  - 为 missing tools 和 skills 提供 guided install（multiSelect，全部预选）
  - 逐个运行 install commands，每一步继续前验证
- **Final summary**：报告 installed / skipped，并在 Claude Code 中推荐 `/ce-update`

---

## 新颖之处

### 1. 单次 diagnostic pass

Skill 运行 **一个** check script，覆盖所有 CLI tools、agent skills、repo-local CE files 和 `.gitignore` guidance。没有逐 tool 手工检查，没有重复提问。Output 是可直接展示给用户的 colored report。如果所有内容都已安装、不需要 repo-local cleanup、local config 存在且已 gitignored，skill 打印 success message 并停止。

### 2. Repo-local config bootstrapping（repo-local config 初始化）

`.compound-engineering/config.local.yaml` 是 machine-local settings 的位置（使用哪些 tools、workflows 如何表现、pulse settings）。Skill 会：

- 始终从 template 刷新 `.compound-engineering/config.local.example.yaml`（committed；给 teammates 参考可用 settings）
- 缺失时创建一次 `.compound-engineering/config.local.yaml`（gitignored；实际 local settings，全部注释掉，只 opt in 需要项）
- 如果 `.compound-engineering/*.local.yaml` 尚未被覆盖，询问是否加入 `.gitignore`

Example（committed）与 local（gitignored）的 split 是 repo 中 machine-local config 的 canonical pattern。Bootstrap 后，未来 skills 就不用重复处理。

### 3. 全部预选的 multi-select install

当 tools 或 skills 缺失时，skill 会以 multi-select 展示它们，并且 **全部预选**。用户可以取消不想安装的项。Items 分组在 `Tools:` 和 `Skills:` 下，清楚表明各自 target runtime。已安装 items 完全不展示。

### 4. 每次 install 后验证再继续

每个 install command 运行后，skill 验证 tool 是否真的安装：

- CLI tools（CLI 工具）：`command -v <tool>`
- Agent skills：如果 `npx` 可用，使用 `npx skills list --global --json | jq -r '.[].name' | grep -qx <skill-name>`；否则检查 `~/.claude/skills/<skill-name>` / `~/.agents/skills/<skill-name>` / `~/.codex/skills/<skill-name>` paths

验证成功就报告 success。失败时展示 project URL 作为 fallback，然后继续下一个 dependency，而不是阻塞。

### 5. Legacy `compound-engineering.local.md` cleanup（旧配置清理）

Skill 检测 repo root 是否存在 obsolete `compound-engineering.local.md`。如果存在，它会解释该文件已 obsolete（review-agent selection 现在自动完成，machine-local state 移至 `.compound-engineering/config.local.yaml`），并询问是否 delete。Cleanup 由用户控制；skill 不会 silent delete repo files。

### 6. 为 Claude Code detection 预先解析 plugin root

Skill 使用 pre-resolution（skill load 时的 `!` backtick）捕获 `${CLAUDE_PLUGIN_ROOT}`。如果它 resolve 为 absolute path，则这是 Claude Code，skill 会推荐 `/ce-update` 做 upgrades。如果没有 resolve（empty、literal token 或 non-Claude harness），则省略 `/ce-update` references。不猜平台。

### 7. Explicit-invocation only（仅显式调用）

`disable-model-invocation: true` 防止 skill 因 "setup" 或 installation discussion 的 prose mentions 而 auto-fire。Setup 应是 deliberate user choice：直接调用 `/ce-setup`。

---

## 快速示例

你刚安装 compound-engineering，想确认一切配置正确。调用 `/ce-setup`。

Skill 宣布 "Compound Engineering — checking your environment..."，并运行 `bash scripts/check-health --version 3.4.1`。

Diagnostic report（诊断报告）:

```text
Tools:
  🟢 agent-browser  🟡 gh (not installed)  🟢 jq  🟡 vhs (not installed)
  🟢 silicon  🟢 ffmpeg  🟡 ast-grep (not installed)

Skills:
  🟡 ast-grep (not installed)

Config:
  ❌ .compound-engineering/config.local.yaml not found
```

Skill 检测到 3 个 missing tools、1 个 missing skill、没有 local config。它依次处理：

1. Bootstrap config："Set up a local config file for this project? (y/n)"；你说 yes。复制 template 到 `.compound-engineering/config.local.yaml`。询问是否把 `.compound-engineering/*.local.yaml` 加入 `.gitignore`，并添加。
2. 安装 missing tools："Select which to install (all pre-selected): [x] gh, [x] vhs, [x] ast-grep, [x] ast-grep skill"；你保留全部选择。
3. 每一项：展示 install command，询问 approval，运行并验证。`gh` 通过 Homebrew 成功安装。`vhs` 成功。`ast-grep` 成功。`ast-grep` skill 通过 `npx skills add ...` 安装。

Final summary（最终摘要）:

```text
✅ Compound Engineering setup complete

   Installed: gh, vhs, ast-grep (CLI), ast-grep (skill)
   Config:    ✅

   Run /ce-update to grab the latest plugin version.
   Run /ce-setup anytime to re-check.
```

---

## 何时使用

在以下情况使用 `ce-setup`：

- 第一次安装 compound-engineering
- 升级 plugin 后想确认 dependencies 仍匹配
- 某个 skill 报 "X is not installed"，你想修复
- 正在 onboarding 新 repo，想 bootstrap `.compound-engineering/config.local.yaml`
- 很久没检查，想要 health snapshot

以下情况跳过 `ce-setup`：

- 尚未对 package managers 完成 authentication（它帮不上）
- 只想安装一个已知 command 的 specific tool：直接安装更快

---

## 作为工作流的一部分使用

`ce-setup` 基本是 standalone；它不在 chain 内。它是 setup utility：

- 其他 skills 报 "X is not installed" 后，用户运行 `ce-setup` 来修复
- 定期作为 health check 运行
- Onboarding 新 repo 或新 machine 前运行

运行后，用户通常继续到 `/ce-update`（Claude Code only）检查 plugin version，或回到原本想运行的 skill。

---

## 单独使用

直接调用：

- `/ce-setup`

Skill 会诊断、展示 missing pieces 和 install commands，并 bootstrap config。无 arguments、无 flags；diagnostic pass 驱动一切。

---

## 参考

| Phase | Step |
|-------|------|
| 1. Diagnose | Determine plugin version，运行 health check script，evaluate results |
| 2. Fix | Resolve repo-local issues（delete obsolete `compound-engineering.local.md`），bootstrap `.compound-engineering/config.local.yaml`，为 missing dependencies 提供 install |
| Final | Summary report；如果在 Claude Code 上，推荐 `/ce-update` |

Required tools list（默认值；按 repo 变化）：`agent-browser`、`gh`、`jq`、`vhs`、`silicon`、`ffmpeg`、`ast-grep`。Required skills：`ast-grep`（当 repo needs 中存在时）。

---

## 常见问题（FAQ）

**`compound-engineering.local.md` 是什么，为什么要删除？**
旧 machine-local config 格式，已被 `.compound-engineering/config.local.yaml` 替代。Skill 会检测 obsolete file、解释原因，并在删除前询问。Review-agent selection 现在通过 `ce-code-review` 自动完成；`compound-engineering.local.md` 中的 manual selection 不再适用。

**为什么 `.compound-engineering/config.local.yaml` 要 gitignored？**
因为它携带 machine-local settings（tool preferences、pulse configuration 等），不应污染 teammates 的 setups。Committed `.compound-engineering/config.local.example.yaml` 展示可用配置；每个用户本地 opt in。

**如果 tool 安装了但 verification 失败怎么办？**
Skill 会展示 project URL 作为 fallback，并继续下一个 dependency。Verification failed 不会阻塞剩余 install pass。

**我可以选择性跳过不想要的 tools 吗？**
可以。Multi-select 会预选所有 missing items，但确认前可取消任何项。Skill 只安装被选中的内容。

**为什么 explicit-invocation only？**
`disable-model-invocation: true` 防止因 prose 中提到 "setup" 或 "install" 自动触发。Setup 是用户 deliberate action；把它作为询问其他内容的 side-effect 会令人意外。

**它能在 non-Claude-Code platforms 上运行吗？**
能。Diagnostic 和 install flow 到处都能工作。末尾的 `/ce-update` recommendation 只出现在 Claude Code（其 cache layout 支持 version detection）；其他 platforms 获得其余 flow，但没有该行。

---

## 另见（See Also）

- [`/ce-update`](./ce-update.md) - 检查 plugin version 并推荐 update command（Claude Code only）
- [`/ce-test-browser`](./ce-test-browser.md) - 依赖 `agent-browser`，由 `ce-setup` 安装
- [`/ce-demo-reel`](./ce-demo-reel.md) - 依赖 `vhs` / `silicon` / `ffmpeg`，均由 `ce-setup` 安装
- [`/ce-product-pulse`](./ce-product-pulse.md) - 使用 `ce-setup` bootstrap 的 `.compound-engineering/config.local.yaml`
