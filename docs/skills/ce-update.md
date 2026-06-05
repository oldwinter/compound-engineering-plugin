# `ce-update`

> 检查已安装的 compound-engineering plugin 是否最新；如果不是，推荐 update command。仅 Claude Code。

`ce-update` 是 **plugin version check** skill。它会比较 Claude Code session 已加载的 version 和 `main` 上的 `plugin.json`（marketplace 从那里安装），告诉你是否 up to date；如果不是，给出要运行的精确 `claude plugin update` command。

它仅适用于 Claude Code，因为 version detection 依赖 plugin harness cache layout（`~/.claude/plugins/cache/<marketplace>/compound-engineering/<version>/...`）。在其他 platforms 或 `claude --plugin-dir` local development 下，skill 会识别该情况并告诉你不需要 action。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 比较 loaded plugin version 和 `main` 上的 `plugin.json`；如果 out of date，推荐 update command |
| 何时使用 | "Update compound engineering"、"is ce up to date"，或 bug behavior 暗示 stale plugin 时 |
| 产出什么 | "Up to date" 或带精确 `claude plugin update` command 的 `out of date` message |
| Status（状态） | Claude Code only（`disable-model-invocation: true`） |

---

## 问题

Plugin version drift 会导致 confusing failure modes：

- **Bug reports against fixed bugs**：用户报告两版前已修的 issue，但他们的 plugin stale
- **Skills 表现像旧版本**：用户运行 skill，得到与当前 docs 不一致的 behavior
- **No obvious way to check**："what version am I on" 在 Claude Code 里没有明显入口
- **Wrong update command suggestion**：在 `claude plugin update` 发布前的 manual cache-sweep / marketplace-refresh advice 已过时
- **Marketplace name confusion**：plugin 通过多个 marketplace names 分发（public vs internal/team installs）；update command 中 hardcoded name 会对一半用户错误

## 方案

`ce-update` 运行 focused version probe：

- **Three parallel scripts** probe upstream version（通过 `gh api` 从 `main` HEAD 读取）、currently-loaded version（从 plugin cache path）、marketplace name（也从 cache path）
- **Compare against `main` HEAD `plugin.json`**，不是 latest GitHub release tag；marketplace 从 `main` 安装，因此当 `main` ahead 时，release tags 会 false-positive
- **Sentinel-driven failure handling**：`__CE_UPDATE_VERSION_FAILED__`（gh unavailable / rate-limited）和 `__CE_UPDATE_NOT_MARKETPLACE__`（loaded outside standard cache，例如 `claude --plugin-dir` local dev）是 skill 识别的 explicit cases
- **Recommended update command 使用检测到的 marketplace name**，而不是 hardcoded one；适用于 public、internal 和 team marketplaces
- **Beta-style explicit-invocation only**：不会因为 prose mentions of "update" 自动触发

---

## 它的新意

### 1. 比较 `main` HEAD，而不是 release tags

Marketplace 从 `main` HEAD 安装 plugin contents，不是 latest release tag。与 tags 比较会在 `main` ahead of last tag 时 false-positive，而这正是 releases 之间的正常状态。Skill 通过 `gh api` 直接读取 `main` 上的 `plugins/compound-engineering/.claude-plugin/plugin.json`。

### 2. Marketplace name 从 skill path 检测，而不是 hardcoded

Plugin 通过多个 marketplace names 分发：public installs 使用 `compound-engineering-plugin`（按 README），internal 或 team marketplaces 使用其他名字。把 name hardcode 进 update command 会让一半 audience 错误。Skill 会根据 `${CLAUDE_SKILL_DIR}` 按 marketplace-cache layout（`~/.claude/plugins/cache/<marketplace>/compound-engineering/<version>/skills/ce-update`）parse，并从 path 中提取 marketplace name。推荐的 `claude plugin update compound-engineering@<marketplace>` command 使用检测到的 name。

### 3. 带 explicit sentinels 的 three parallel probes

三个 scripts 通过 Bash tool 并行运行：

- `scripts/upstream-version.sh`：通过 `gh api` 读取 `main` 上的 `plugin.json`；打印 version 或 `__CE_UPDATE_VERSION_FAILED__`
- `scripts/currently-loaded-version.sh`：parse `${CLAUDE_SKILL_DIR}` 中的 version segment；打印 version 或 `__CE_UPDATE_NOT_MARKETPLACE__`
- `scripts/marketplace-name.sh`：parse `${CLAUDE_SKILL_DIR}` 中的 marketplace segment；打印 name 或 `__CE_UPDATE_NOT_MARKETPLACE__`

Sentinels 让 failure modes 结构化：skill 知道是 upstream fetch failed（不同 recovery），还是 skill loaded outside standard cache（不同 message）。

### 4. 识别 `--plugin-dir` local-dev mode

当 `scripts/currently-loaded-version.sh` 返回 `__CE_UPDATE_NOT_MARKETPLACE__`，两类情况用同一处理：

- `claude --plugin-dir` local-development session（skill 从 local checkout 加载，而不是 marketplace cache）
- Non-Claude-Code platform（此 skill 是 Claude Code-only）

Skill 告诉用户："Loaded from outside the marketplace cache. Normal when using `claude --plugin-dir` for local development. No action for this session. Your marketplace install (if any) is unaffected — run `/ce-update` in a regular Claude Code session (no `--plugin-dir`) to check that cache."

### 5. Pinned narrow `allowed-tools`（固定且收窄的 `allowed-tools`）

Skill 在 `allowed-tools` 中声明三个 specific scripts：`Bash(bash *upstream-version.sh)`、`Bash(bash *currently-loaded-version.sh)`、`Bash(bash *marketplace-name.sh)`；没有 `bypassPermissions` 的用户运行它们时可跳过 approval prompts。按 filename pin，而不是宽泛 `Bash(bash *)`。

### 6. Beta-style explicit-invocation only（beta 风格的显式调用限定）

`disable-model-invocation: true` 防止 skill 因 "update" 或 version-related discussion 的 prose mentions 自动触发。Plugin updates 是 deliberate user choice；请直接调用 `/ce-update`。

---

## 快速示例

你怀疑某个 skill behavior 与 docs 不一致，想知道 plugin 是否 stale。调用 `/ce-update`。

Skill 并行运行三个 scripts：

- `upstream-version.sh` 返回 `2.42.0`（`main` 上当前 `plugin.json`）
- `currently-loaded-version.sh` 返回 `2.40.0`（从 loaded skill path parse）
- `marketplace-name.sh` 返回 `compound-engineering-plugin`（从同一路径 parse）

Currently-loaded != upstream -> out of date。Skill 回复：

```text
compound-engineering is on v2.40.0 but v2.42.0 is available.

Update with:
  claude plugin update compound-engineering@compound-engineering-plugin

Then restart Claude Code to apply.
```

你运行 command，重启，下一个 session 就有新 version。

---

## 何时使用

在以下情况使用 `ce-update`：

- 你说了 "update compound engineering"、"ce update"、"is ce up to date"
- Skill behavior 与 docs 描述不同
- Filing bug 前想确认自己在 current version
- 即将使用最近添加的 feature，想确认它可用

以下情况跳过 `ce-update`：

- 你在 non-Claude-Code platform：skill 会以 "no action" message 停止；update 通过该 platform 的机制进行
- 你在 `claude --plugin-dir` local-dev session：skill 会识别并停止
- 你想检查 specific component version，而不是 whole plugin：直接读取 `plugin.json`

---

## 作为 Workflow 的一部分使用

`ce-update` 是 standalone utility，不位于 chain 内。它在怀疑 version drift 时调用：

- **From `/ce-report-bug`**：version check 应是 bug report 首要确认事项
- **From the user directly**：当 agent behavior 闻起来 stale

Output 直接给用户阅读；没有 downstream skill 消费它。

---

## 单独使用

直接调用：

- `/ce-update`：运行 version check

没有 arguments。Skill probe、compare 并 report。如果 upstream fetch fails（gh unavailable 或 rate-limited），它会说明并停止，不推荐 partial answer。

---

## 参考

| Sentinel | Meaning（含义） |
|----------|---------|
| `__CE_UPDATE_VERSION_FAILED__` | `gh api` 无法 fetch upstream `plugin.json`（gh unavailable、rate-limited）；skill 带 message 停止 |
| `__CE_UPDATE_NOT_MARKETPLACE__` | Skill loaded outside `~/.claude/plugins/cache/`；通常是 `claude --plugin-dir` local dev。Skill 以 "no action" message 停止 |

Scripts（位于 `scripts/`）：

- `upstream-version.sh`：对 `main` 上的 `plugins/compound-engineering/.claude-plugin/plugin.json` 运行 `gh api`
- `currently-loaded-version.sh`：parse `${CLAUDE_SKILL_DIR}` 中的 version segment
- `marketplace-name.sh`：parse `${CLAUDE_SKILL_DIR}` 中的 marketplace segment

三者都只使用 Python 3 stdlib 和 `gh`，不依赖 PyYAML 或其他 deps。

---

## 常见问题

**为什么比较 `main` HEAD，而不是 latest release tag？**
因为 marketplace 从 `main` HEAD 安装 plugin contents，而不是 release tags。与 tags 比较会在 `main` ahead of last tag 时 false-positive，这是 releases 之间的正常状态。

**为什么 marketplace name 从 path 检测？**
因为 plugin 通过多个 marketplace names 分发：public installs 使用 `compound-engineering-plugin`，internal/team marketplaces 使用其他 names。把 name hardcode 到 update command 会对一半 audience 错误。从 cache path 检测可让 recommendation 对当前 marketplace 保持正确。

**为什么仅 Claude Code？**
因为 version detection 依赖 Claude Code plugin harness cache layout（`~/.claude/plugins/cache/<marketplace>/compound-engineering/<version>/...`）。其他 platforms 有自己的 update mechanisms；此 skill defer 给它们。当 skill 检测到不在 standard cache 中，会 cleanly 说明并停止。

**如果 `gh api` rate-limited 怎么办？**
Skill 会告诉你 upstream version 无法 fetch 并停止。它不会 guess 或推荐 partial answer。等待 rate limit，或通过 GitHub UI 手动检查 version。

**`--plugin-dir` local development 怎么办？**
Skill 会识别该情况（path-parsing scripts 返回 `__CE_UPDATE_NOT_MARKETPLACE__`）并告诉你：使用 `--plugin-dir` 时这是正常的；此 session 不需要 action；你的 marketplace install（如果有）不受影响。

**为什么不 auto-invocation？**
`disable-model-invocation: true` 防止 skill 因 "update the plan" 或 "is this up to date" 这类与 plugin versions 无关的 prose 自动触发。Update 是 deliberate user choice。

---

## 另见

- [`ce-setup`](./ce-setup.md) - 安装缺失 dependencies；与 version checks 互补
- [`ce-report-bug`](./ce-report-bug.md) - 报告 bug；应先确认 version
- [`ce-release-notes`](./ce-release-notes.md) - 总结最近 compound-engineering plugin releases
