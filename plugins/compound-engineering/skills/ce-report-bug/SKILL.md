---
name: ce-report-bug
description: 报告 compound-engineering plugin 中的 bug
argument-hint: "[可选：bug 的简短描述]"
disable-model-invocation: true
---

# 报告 Compound Engineering Plugin Bug

报告使用 compound-engineering plugin 时遇到的 bugs。此 skill 收集 structured information，并为 maintainer 创建 GitHub issue。

## Step 1：收集 Bug Information

使用平台 blocking question tool 向用户询问以下问题：Claude Code 中用 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 搭配 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Gemini 中用 `ask_user`、Pi 中用 `ask_user`（需要 `pi-ask-user` extension）。只有 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中的 numbered options；不要因为需要 schema load 就 fallback。绝不要 silently skip 该问题：

**Question 1：Bug Category（bug 类别）**
- 你遇到的是什么类型 issue？
- Options（选项）：Agent not working（Agent 不工作）、Command not working（Command 不工作）、Skill not working（Skill 不工作）、MCP server issue（MCP server 问题）、Installation problem（安装问题）、Other（其他）

**Question 2：Specific Component（具体组件）**
- 哪个 specific component 受到影响？
- 询问 agent、command、skill 或 MCP server 的名称

**Question 3：What Happened（实际行为）**
- Ask（询问）: "What happened when you used this component?"
- 获取 actual behavior 的清晰描述

**Question 4：What Should Have Happened（预期行为）**
- Ask（询问）: "What did you expect to happen instead?"
- 获取 expected behavior 的清晰描述

**Question 5：Steps to Reproduce（复现步骤）**
- Ask（询问）: "What steps did you take before the bug occurred?"
- 获取 reproduction steps

**Question 6：Error Messages（错误信息）**
- Ask（询问）: "Did you see any error messages? If so, please share them."
- Capture 任何 error output

## Step 2: 收集 Environment Information（环境信息）

自动收集 environment details。检测 coding agent platform，并收集可用信息：

**OS info（OS 信息，all platforms）：**
```bash
uname -a
```

**Plugin version（Plugin 版本）:** 读取 plugin manifest 或 installed plugin metadata。常见位置：
- Claude Code：`~/.claude/plugins/installed_plugins.json`
- Codex：`.codex/plugins/` 或 project config
- Other platforms（其他平台）：检查该平台的 plugin registry

**Agent CLI version（Agent CLI 版本）:** 运行平台 version command：
- Claude Code：`claude --version`
- Codex：`codex --version`
- Other platforms（其他平台）：使用合适的 CLI version flag

如果其中任何一步失败，记录 "unknown" 并继续；不要 block report。

## Step 3: 格式化 Bug Report（bug 报告）

创建结构清晰的 bug report：

```markdown
## Bug Description

**Component:** [Type] - [Name]
**Summary:** [Brief description from argument or collected info]

## Environment

- **Plugin Version:** [from plugin manifest/registry]
- **Agent Platform:** [e.g., Claude Code, Codex, Copilot, Pi, Kilo]
- **Agent Version:** [from CLI version command]
- **OS:** [from uname]

## What Happened

[Actual behavior description]

## Expected Behavior

[Expected behavior description]

## Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Step 3]

## Error Messages

[Any error output]

## Additional Context

[Any other relevant information]

---
*Reported via `/ce-report-bug` skill*
```

## Step 4: 创建 GitHub Issue（GitHub issue）

使用 GitHub CLI 创建 issue：

```bash
gh issue create \
  --repo EveryInc/compound-engineering-plugin \
  --title "[compound-engineering] Bug: [Brief description]" \
  --body "[Formatted bug report from Step 3]" \
  --label "bug,compound-engineering"
```

**Note（注意）:** 如果 labels 不存在，不带 labels 创建：
```bash
gh issue create \
  --repo EveryInc/compound-engineering-plugin \
  --title "[compound-engineering] Bug: [Brief description]" \
  --body "[Formatted bug report]"
```

## Step 5: 确认提交

Issue 创建后：
1. 向用户展示 issue URL
2. 感谢他们 reporting bug（报告 bug）
3. 告诉他们 maintainer（Kieran Klaassen）会收到通知

## Output Format（输出格式）

```
Bug report submitted successfully!

Issue: https://github.com/EveryInc/compound-engineering-plugin/issues/[NUMBER]
Title: [compound-engineering] Bug: [description]

Thank you for helping improve the compound-engineering plugin!
The maintainer will review your report and respond as soon as possible.
```

## Error Handling（错误处理）

- 如果 `gh` CLI 未安装或未认证：提示用户先 install/authenticate（安装或认证）
- 如果 issue creation 失败：展示 formatted report，让用户可以手动创建 issue
- 如果 required information 缺失：针对该 specific field 重新 prompt

## Privacy Notice（隐私说明）

此 skill **不** 收集：
- Personal information（个人信息）
- API keys 或 credentials
- Projects 中的 private code
- 除 basic OS info 外的 file paths

Report 中只包含关于 bug 的 technical information（技术信息）。
