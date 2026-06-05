---
name: triage-prs
description: 使用 parallel agents triage 所有 open PRs，打 label、分组，并逐个 review
argument-hint: "[可选：repo owner/name 或 GitHub PRs URL]"
disable-model-invocation: true
allowed-tools: Bash(gh *), Bash(git log *)
---

# Triage Open Pull Requests（整理 Open Pull Requests）

使用 parallel review agents review、label 并处理某个 repository 的所有 open PRs。产出分组 triage report，应用 labels，与 issues 做 cross-reference，并逐个走查 PR 以做 merge/comment decisions。

## Step 0: Detect Repository（检测 repository）

检测 repo context：
- Current repo（当前 repo）：!`gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo "no repo detected"`
- Current branch（当前 branch）：!`git branch --show-current 2>/dev/null`

如果 `$ARGUMENTS` 包含 GitHub URL 或 `owner/repo`，改用该值。如果 repo ambiguous，向用户确认。

## Step 1: Gather Context (Parallel)（并行收集上下文）

并行运行：

1. **List all open PRs（列出所有 open PRs）：**
   ```bash
   gh pr list --repo OWNER/REPO --state open --limit 50
   ```

2. **List all open issues（列出所有 open issues）：**
   ```bash
   gh issue list --repo OWNER/REPO --state open --limit 50
   ```

3. **List existing labels（列出现有 labels）：**
   ```bash
   gh label list --repo OWNER/REPO --limit 50
   ```

4. **Check recent merges（检查最近 merges）**（用于检测 duplicate/superseded PRs）：
   ```bash
   git log --oneline -20 main
   ```

## Step 2: Batch PRs by Theme（按主题分批 PRs）

按 apparent type 将 PRs 分成 4-6 个一组的 review batches：

- **Bug fixes（bug 修复）** - title 中有 `fix`、`bug` 或 error descriptions
- **Features（功能）** - title 中有 `feat`、`add` 或 new functionality
- **Documentation（文档）** - title 中有 `docs`、`readme` 或 terminology
- **Configuration/Setup（配置/设置）** - title 中有 `config`、`setup` 或 `install`
- **Stale/Old（陈旧/旧）** - 超过 30 天的 PRs

## Step 3: Parallel Review (Team of Agents)（并行 review）

使用 Task tool 为每个 batch spawn 一个 review agent。每个 agent 应：

对其 batch 中的每个 PR：
1. 运行 `gh pr view --repo OWNER/REPO <number> --json title,body,files,additions,deletions,author,createdAt`
2. 运行 `gh pr diff --repo OWNER/REPO <number>`（large diffs 可 pipe 到 `head -200`）
3. Determine（判断）：
   - **Description（描述）：** 对 change 的 1-2 句 summary
   - **Label（标签）：** 最匹配的 existing repo label
   - **Action（动作）：** merge / request changes / close / needs discussion
   - **Related PRs（相关 PRs）：** 当前或其他 batches 中触及相同 files 或 feature 的 PRs
   - **Quality notes（质量 notes）：** Code quality、test coverage、staleness concerns

指示每个 agent：
- 标记触及相同 files 的 PRs（potential merge conflicts）
- 标记 duplicate recently merged work 的 PRs
- 标记同一组中以不同方式解决同一问题的 PRs
- 以 markdown table 报告 findings
- 完成后通过 message 返回 findings

## Step 4: Cross-Reference Issues（交叉引用 issues）

所有 agents 报告后，将 issues 与 PRs 匹配：

- 检查是否有 PR title/body 提到 `Fixes #X` 或 `Closes #X`
- 检查是否有 issue title 匹配某个 PR 的 topic
- 查找 duplicate issues（同一 bug 被报告两次）

构建 mapping table：
```
| Issue | PR | Relationship |
|-------|-----|--------------|
| #158  | #159 | PR fixes issue |
```

## Step 5: Identify Themes（识别主题）

将所有 issues 分组为 themes（3-6 个 themes）：
- 统计每个 theme 的 issue 数量
- 记录哪些 themes 有 PRs 处理，哪些没有
- 标记存在 competing/overlapping PRs 的 themes

## Step 6: Compile Triage Report（编写 triage report）

展示一份单一 report，包含：

1. **Summary stats（摘要统计）：** X 个 open PRs、Y 个 open issues、Z 个 themes
2. 带 recommended actions 的 **PR groups（PR 分组）**：
   - Group name 和 related PRs
   - Per-PR：#、title、author、description、label、action
3. **Issue-to-PR mapping（Issue 到 PR 的映射）**
4. **Themes across issues（issues 中的 themes）**
5. **Suggested cleanup（建议清理）：** spam issues、duplicates、stale items

## Step 7: Apply Labels（应用 labels）

展示 report 后，询问用户：

> "Apply these labels to all PRs on GitHub?"
> 中文含义：是否将这些 labels 应用到 GitHub 上的所有 PRs？

如果用户同意，对每个 PR 运行 `gh pr edit --repo OWNER/REPO <number> --add-label "<label>"`。

## Step 8: One-by-One Review（逐个 review）

使用 **AskUserQuestion** 询问：

> "Ready to walk through PRs one-by-one for merge/comment decisions?"
> 中文含义：是否准备好逐个走查 PRs，并决定 merge/comment？

然后按 priority 处理每个 PR（bug fixes 优先，然后 docs、features、stale）：

### Show the PR（展示 PR）：

```
### PR #<number> - <title>
Author: <author> | Files: <count> | +<additions>/-<deletions> | <age>
Label: <label>

<1-2 sentence description>

Fixes: <linked issues if any>
Related: <related PRs if any>
```

展示 diff（如果很大，trim 到 key changes）。

### Ask for decision（询问决策）：

使用 **AskUserQuestion**：
- **Merge** - 现在 merge 这个 PR
- **Comment & skip** - 留下 comment 解释为什么不 merge，并保持 open
- **Close** - 带 comment 关闭
- **Skip** - 不采取 action，进入下一个

### Execute decision（执行决策）：

- **Merge:** `gh pr merge --repo OWNER/REPO <number> --squash`
  - 如果 PR 修复了某个 issue，也关闭该 issue
- **Comment & skip:** `gh pr comment --repo OWNER/REPO <number> --body "<comment>"`
  - 询问用户要说什么，或生成 grateful + specific comment
- **Close:** `gh pr close --repo OWNER/REPO <number> --comment "<reason>"`
- **Skip:** 继续下一个

## Step 9: Post-Merge Cleanup（merge 后清理）

所有 PRs review 完后：

1. **Close resolved issues（关闭已解决 issues）**：关闭 merged PRs 修复的 issues
2. **Close spam/off-topic issues（关闭 spam/off-topic issues）**（先向用户确认）
3. **Summary of actions taken（已执行 actions 摘要）：**
   ```
   ## Triage Complete

   Merged: X PRs
   Commented: Y PRs
   Closed: Z PRs
   Skipped: W PRs

   Issues closed: A
   Labels applied: B
   ```

## Step 10: Post-Triage Options（triage 后选项）

使用 **AskUserQuestion**：

1. **Run `/release-docs`** - 如果 components changed，更新 documentation site
2. **Run `/changelog`** - 为 merged PRs 生成 changelog
3. **Commit any local changes** - 如果需要 version bumps
4. **Done** - 收尾

## Important Notes（重要说明）

- **DO NOT merge without user approval**：每个 PR 都必须获得用户 approval 后才能 merge
- **DO NOT force push or destructive actions**（不要 force push，也不要执行 destructive actions）
- 对 declined PRs 的 comments 应该 grateful 且 constructive
- 当 PRs 彼此 conflict 时，指出这一点并建议 merge order
- 当多个 PRs 以不同方式解决同一问题时，标记出来让用户选择一个
- 使用 Haiku model 运行 review agents 以节省 cost（它们只做 read-only analysis）
