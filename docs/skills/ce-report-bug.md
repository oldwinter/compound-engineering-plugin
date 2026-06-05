# `ce-report-bug`（报告 bug）

> 报告 compound-engineering plugin 中的 bug：收集 structured information，并在 `EveryInc/compound-engineering-plugin` 创建 GitHub issue。

`ce-report-bug` 是 **bug-filing** skill。它引导用户回答六个 structured questions（category、component、what happened、expected behavior、repro steps、error messages），自动收集 environment information（OS、plugin version、agent CLI version），格式化完整 bug report，并通过 `gh` 创建 GitHub issue。此 skill 让提交有用 bug report 变快；否则你需要打开 GitHub、找到正确 repo、记住应包含什么，再从头输入。

Beta-style explicit-invocation only（beta 风格，仅显式调用；`disable-model-invocation: true`）。

---

## TL;DR

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 通过 6 个 questions 收集 structured bug info，自动收集 environment data，并在 `EveryInc/compound-engineering-plugin` filing GitHub issue |
| 何时使用 | Compound-engineering plugin 中某些东西不工作，且你想 report |
| 产出什么 | GitHub issue URL（或在 `gh` 不可用时生成可手动提交的 formatted bug report） |
| Privacy | 不收集 personal info、API keys、credentials 或 private code |

---

## 问题

提交有用 bug report 的 friction 很高：

- **Finding the right repo**：哪个 org、哪个 repo、哪个 label？
- **Remembering what to include**：environment info、repro steps、error messages、expected vs actual behavior；很容易漏掉 maintainer 需要的内容
- **Manual environment gathering**：运行 `uname`、找 plugin version、检查 CLI version、格式化所有信息
- **No template**：每个 bug report 从零开始；有些很清楚，有些只是 "it's broken"
- **Filing without `gh`**：没有 CLI 时，用户必须手动通过 GitHub UI copy-paste
- **Privacy concerns**：天真的 env gathering 可能包含 API keys 或泄露过多的 paths

## 方案

`ce-report-bug` 按 structured intake -> format -> file flow 运行：

- **6 个 questions** 按顺序收集：category、component、actual、expected、repro steps、error messages
- **Automatic env gathering**：通过 `uname -a` 获取 OS，通过 manifest reading 获取 plugin version，通过 `--version` 获取 agent CLI version
- **Template-based formatting**：每个 report 形状一致，maintainers 能快速 scan
- 使用正确 repo、title prefix 和 labels 的 **`gh issue create`**（labels 缺失时 fallback without labels）
- **Manual-fallback**：`gh` 不可用时展示 formatted report，供用户手动提交
- **Privacy by design**：只包含 technical info；绝不包含 personal info、credentials 或 code

---

## 独特之处

### 1. Six structured questions in a deliberate order（按刻意顺序提出 6 个结构化问题）

Skill 会询问：

1. **Bug category（bug 类别）**（multiple choice）：Agent / Command / Skill / MCP server / Installation / Other
2. **Specific component**（free text）：agent、command、skill 或 MCP server 名称
3. **What happened (actual behavior)**：用户观察到的清晰描述
4. **What should have happened (expected behavior)**：expected behavior 的清晰描述
5. **Steps to reproduce**：bug 发生前用户做了什么
6. **Error messages**：任何 error output

顺序重要：category 和 component 先界定 bug；actual vs expected 建立 disconnect；repro steps + errors 给 maintainer 诊断抓手。

### 2. Automatic environment gathering（自动收集环境信息）

Skill 运行：

- `uname -a` 获取 OS info
- 从 platform-specific location 读取 plugin manifest（Claude Code：`~/.claude/plugins/installed_plugins.json`；Codex：`.codex/plugins/` 等）
- 运行平台 CLI version command（`claude --version`、`codex --version` 等）

如果其中任何一步失败，skill 记录 "unknown" 并继续；不要因为 environment-collection issues 阻塞 reporting。

### 3. Single template, consistent shape（单一模板、一致结构）

每个 report 使用相同 template：

```markdown
## Bug Description
**Component:** [Type] - [Name]
**Summary:** [Brief]

## Environment
- **Plugin Version:** ...
- **Agent Platform:** ...
- **Agent Version:** ...
- **OS:** ...

## What Happened
...

## Expected Behavior
...

## Steps to Reproduce
1. ...

## Error Messages
...

## Additional Context
...

---
*Reported via `/ce-report-bug` skill*
```

Footer 标记 report 由 skill 生成，让 maintainer 知道它遵循 canonical template。

### 4. `gh issue create` with the right scope（使用正确 scope 创建 issue）

Skill 通过以下方式 filing：

```bash
gh issue create \
  --repo EveryInc/compound-engineering-plugin \
  --title "[compound-engineering] Bug: [description]" \
  --body "[formatted report]" \
  --label "bug,compound-engineering"
```

正确 repo、正确 title prefix、正确 labels。如果 labels 不存在（某些 forks/clones 可能缺少），skill 会不带 `--label` retry，而不是失败。

### 5. Manual fallback when `gh` is unavailable（`gh` 不可用时手动 fallback）

如果 `gh` 未安装或未认证，skill 会展示 fully-formatted report，供用户手动粘贴到 GitHub web UI。Reporting work 已经完成，没有信息损失。

### 6. Privacy by design（隐私优先设计）

Skill 明确 **不** 收集：

- Personal information（个人信息）
- API keys 或 credentials
- Projects 中的 private code
- 除 `uname` 基本 OS info 之外的 file paths

只包含 bug 的 technical information。Skill 中记录了这一点，让用户知道什么会被 shared。

### 7. Explicit-invocation only（仅显式调用）

`disable-model-invocation: true` 防止 skill 因 prose 中提到 bugs 而 auto-fire。Bug reporting 是 deliberate user choice：直接调用 `/ce-report-bug`。

---

## 快速示例

你遇到 `/ce-plan` 生成 U-IDs 不连续的 bug。调用 `/ce-report-bug`。

Skill 走完 6 个 questions：

1. **Category（类别）**：Skill not working
2. **Component（组件）**：ce-plan
3. **What happened（实际发生）**："Plan was generated with U-IDs U1, U2, U4 — U3 was skipped without explanation."
4. **Expected（预期行为）**："U-IDs should be sequential without gaps in initial generation."
5. **Repro（复现步骤）**："Run `/ce-plan` from a brainstorm doc with 4 implementation units. The third unit gets numbered U4 instead of U3."
6. **Error messages（错误信息）**："None visible; just the wrong numbering."

Environment gathering 在后台运行：

- `uname -a`：macOS arm64
- Plugin version（plugin 版本）：3.4.1
- Agent platform（agent 平台）：Claude Code
- Agent version（agent 版本）：claude-code 1.2.3

Formatted report 被传给 `gh issue create --repo EveryInc/compound-engineering-plugin --title "[compound-engineering] Bug: U-ID numbering skips U3 in initial plan generation" --body "..." --label "bug,compound-engineering"`。

返回：

```text
Bug report submitted successfully!

Issue: https://github.com/EveryInc/compound-engineering-plugin/issues/812
Title: [compound-engineering] Bug: U-ID numbering skips U3 in initial plan generation

Thank you for helping improve the compound-engineering plugin!
The maintainer will review your report and respond as soon as possible.
```

---

## 何时使用

在以下情况使用 `ce-report-bug`：

- Compound-engineering 中的 skill、command、agent 或 MCP integration 没按预期工作
- 想报告 maintainer 可以 action 且无需 follow-up questions 的问题
- 不确定应包含哪些 details；structured questions 会捕获所需内容

以下情况跳过 `ce-report-bug`：

- Bug 在不同 plugin 或 tool 中（此 filing target hardcoded 到 compound-engineering）
- 这是 feature request，不是 bug -> 手动 filing discussion 或 feature-request issue
- 不确定这是 bug 还是 expected behavior -> 先查 `/ce-release-notes`，看 recent release 是否改变了 behavior

---

## 作为 Workflow 的一部分使用

`ce-report-bug` 是 standalone utility，不在 chain 内。当出错且用户想让 maintainer 知道时调用。

常见 companion skills：

- **`/ce-update`**：先检查 version；你可能正在报告 newer version 已修复的 bug
- **`/ce-release-notes`**：检查 behavior 最近是否变化；可能是 intended

---

## 单独使用

直接调用：

- `/ce-report-bug`：走完 6 个 questions
- `/ce-report-bug "brief description"`：把 description 作为 initial context；仍然走 structured questions，以确保完整

Skill 驱动 intake。没有 skip-questions option：structured intake 就是价值；如果它对 one-line report 显得过重，请直接通过 GitHub UI filing。

---

## 参考

| 步骤 | 操作 |
|------|--------|
| 1 | Gather bug info（收集 bug 信息；6 structured questions） |
| 2 | Collect environment info（收集环境信息；OS、plugin version、agent CLI version） |
| 3 | Format the bug report（格式化 bug report；consistent template） |
| 4 | 通过 `gh` 创建 GitHub issue（with labels；fallback without） |
| 5 | Confirm submission 并 display issue URL（确认提交并显示 issue URL） |

Repo target：`EveryInc/compound-engineering-plugin`。Title prefix：`[compound-engineering]`。Labels：`bug,compound-engineering`（missing 时 fallback to no labels）。

---

## 常见问题

**Skill 会收集哪些环境信息？**
只收集 technical info：来自 `uname -a` 的 OS string、manifest 中的 plugin version、agent platform name、agent CLI version。不收集 personal info、API keys、credentials 或 private code。Report 的 `Environment` section 会明确显示包含内容。

**如果 `gh` 没安装怎么办？**
Skill 会展示 fully-formatted bug report，并请你通过 GitHub web UI 手动提交。信息不会丢；structured intake 和 formatting 仍已完成。

**可以报告 non-compound-engineering bug 吗？**
此 skill 专门 filing 到 `EveryInc/compound-engineering-plugin`。其他 plugins 或 tools 请直接到对应 repos filing。此 skill 的结构可泛化，但 repo target 是 hardcoded。

**如果 repo 上 labels 不存在怎么办？**
Skill 会不带 `--label` retry。某些 forks 或 clones 可能没有设置 `bug` label；report 仍会成功 filing。

**提交前可以编辑 report 吗？**
Skill 会互动式走完 questions，因此你可以在进入下一步前 refine 每个 answer。Report 格式化后，skill 会直接通过 `gh` filing。如果你想 manual review，请拒绝 `gh`，用 formatted text 自己通过 web UI 提交。

**重复 filing 同一个 bug 可以吗？**
Skill 不 deduplicate；它会 filing 你要求的内容。如果担心 duplicate，请先搜索 issue tracker。Maintainer 可按需关闭 duplicates。

---

## 另见（See Also）

- [`/ce-update`](./ce-update.md) - 检查 plugin version；older versions 可能已有 fixed bugs
- [`/ce-release-notes`](./ce-release-notes.md) - 检查 behavior 是否在 recent release 变化；可能不是 bug
