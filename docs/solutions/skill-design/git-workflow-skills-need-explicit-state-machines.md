---
title: "Git workflow skills 需要显式 state machines 来处理 branch、push 和 PR state"
category: skill-design
date: 2026-03-27
last_refreshed: 2026-07-12
module: skills/ce-commit and ce-commit-push-pr
problem_type: architecture_pattern
component: tooling
symptoms:
  - Detached HEAD 可能落入 invalid push 或 PR paths
  - 只有 untracked files 的 work 可能被误判为 clean working tree
  - PR detection 可能选中错误 PR，或错误处理 no-PR case
  - Default-branch flows 可能尝试 invalid "open a PR from the default branch" behavior
root_cause: missing_workflow_step
resolution_type: workflow_improvement
severity: high
tags:
  - git-workflows
  - skill-design
  - state-machine
  - detached-head
  - gh-cli
  - pr-detection
  - default-branch
---

# Git workflow skills 需要显式 state machines 来处理 branch、push 与 PR state

## 问题

`ce-commit` 和 `ce-commit-push-pr` skills 因为用宽泛 prose 描述 Git flow，而不是把 workflow 建模为一串 explicit state checks，已经积累了 branch-state 与 PR-state bugs。围绕 detached HEAD、untracked files、upstream detection、default-branch pushes 和 PR lookup 的小 wording changes 不断引入 regressions。

## 症状

- detached HEAD 时可能走到 `git push -u origin HEAD`，Git 会拒绝 push，因为 `HEAD` 不是 branch ref
- 只有 untracked files 的 repo 可能被视为 "nothing changed"，因为 `git diff HEAD` 对 untracked files 为空
- no-PR branch 可能触发一个看起来像 fatal failure 的 error path，而不是 expected "no PR for this branch" state
- `gh pr list --head "<branch>"` 可能匹配到另一个 fork 中同名 branch 的 unrelated PR
- default branch 上的 clean-working-tree flows 可能 push default-branch commits，然后尝试从 default branch 对自己 open PR

## 无效做法

- 使用一次 early `git branch --show-current` result，并在后续引用它。一旦 workflow 创建 branch，早期 value 就 stale。
- 用 `git diff HEAD` 定义 "has changes"。它不包含 untracked files。
- 将 PR-detection command 的每个 non-zero exit 都视为 fatal failure。"No PR for this branch" 往往是 normal branch state。
- 在 `gh pr view` 与 `gh pr list` 之间来回切换，却不记录 trade-off。`gh pr view` 能感知 current branch，但在 normal no-PR state 上 exit 1；`gh pr list --head <branch>` 具有清晰的 exit-0-`[]` = "no PR" semantics，却只按 branch name filter。正确做法不是静默选一个，而是记录 trade-off 和 branch-name-collision caveat（见 §4），让选择不再 regression。
- 在重新检查当前 branch 是否仍为 default branch 前，添加 "clean working tree" fast path。这会让 workflow 跳过 feature-branch safety gate，直接走向 invalid push/PR transitions。

## 解决方案

把 skill 当作一个小 state machine。对每个 transition，运行能直接回答下一个问题的 command，然后根据该 result branch，而不是在 prose 中 carry state forward。

### 1. 使用 `git status` 作为 working-tree cleanliness 的 source of truth

使用 Step 1 中的 `git status` result 判断 tree 是否 clean。这覆盖 staged、modified 和 untracked files。

```text
Clean working tree:
- no staged files
- no modified files
- no untracked files
```

不要使用 `git diff HEAD` 作为 cleanliness check。

### 2. 每次 branch-changing transition 后重新读取 branch state

workflow 从 detached HEAD 开始时：

```bash
git branch --show-current
git checkout -b <branch-name>
git branch --show-current
```

第二个 `git branch --show-current` 不是 redundant。它把 "skill thinks it created branch X" 转换为 "Git says the current branch is X."

同一 pattern 应用于 default-branch safety checks 前：

```bash
git branch --show-current
```

在需要 decision 的时刻再运行它。不要依赖 workflow 早先 captured branch value。

### 3. 拆分 "upstream exists" 与 "there are unpushed commits"

先检查 upstream existence：

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u}
```

只有成功后，才检查 unpushed commits：

```bash
git log <upstream>..HEAD --oneline
```

这避免把 "no upstream configured yet" 与 "nothing to push" 混为一谈。

### 4. 使用 `gh pr list` 检测 existing PR，并把 exit status 解释为 state

对于 "does this branch already have a PR?"，使用能区分 "no PR" 与 "lookup failed" 的 command：

```bash
gh pr list --head <branch> --state open --json number,url,title,body,state,headRefName,headRepositoryOwner
```

把 result 解释为 state check：

- Exit 0 且返回 `[]` -> 当前 branch 没有 open PR（继续 creation）
- Exit 0 且有 entries -> PR 已存在；选择 `headRepositoryOwner`/`headRefName` 与 current head 匹配的 entry，而不是 index 0。如果来自不同 owners 的多个 entries 共用 branch name，且无法确认哪个属于你，应将其视为 ambiguous 并停止，绝不能操作他人的 PR
- Non-zero exit -> `gh` 缺失、未认证或 offline；PR state 是 **unknown**，绝不是 "no PR"。创建前先解决 auth/connectivity，防止 lookup failure 造成 duplicate PR

只传 branch **name**。`gh pr list --head` 不接受 `<owner>:<branch>` syntax（会静默返回 `[]`，被解释为 "no PR" 并打开 duplicate）。Fork checkout 的 PR 位于 base repo，因此应使用 `gh` 的 default-repo resolution 或 `-R <base-owner>/<repo>` 指向 base。在 detached HEAD（empty branch）上完全跳过此 check：empty `--head` 会移除 filter 并列出 unrelated PRs。

**Known tradeoff（branch-name collision）。** `gh pr list --head <branch>` 按 head-branch *name* filter；在繁忙 multi-fork repo 中，不同 owners 的两个 open PR 可能共用 branch name，该 command 无法像 current-branch-aware 的 `gh pr view` 那样 disambiguate。仍选择它是因为 clean exit semantics：`gh pr view` 在 normal no-PR state 上 exit 1，把 "no PR" 与真实 failure 混在一起，不仅更难解释，而且一旦 check 在 skill *load* time 运行就会 fatal（参见 [no-load-time-pre-resolution-for-fallible-context.md](no-load-time-pre-resolution-for-fallible-context.md)）。在 `gh pr create` 前立即 re-verify，并检查 returned entry，而不是假定第一个 match 属于你，以此约束 collision risk。

### 5. 将 default-branch safety gate 保持在 push/PR transitions 前

如果当前 branch 是 `main`、`master` 或 resolved default branch，且 workflow 即将 push 或 create PR：

- 询问是否先创建 feature branch
- 如果用户同意，创建 branch 并重新读取 branch name
- 如果用户在 `ce-commit-push-pr` 中拒绝，则 stop，而不是尝试从 default branch open PR

这可以防止 "push default branch, then attempt impossible PR flow" behavior。

## 为什么有效

Git workflows 在 prose 中看似 linear，但实际上 stateful。Detached HEAD、missing upstreams、untracked files、existing-vs-missing PRs 都是独立 state dimensions。bug pattern 始终相同：skill 观察某个 dimension 一次，然后假设后来 transition 后它仍为真。

修复不是更多 prose。修复是每个 transition boundary 都 explicit re-check：

- branch creation 后检查 branch state
- 用 `git status` 而不是 partial diff 检查 cleanliness
- 在 unpushed-commit checks 前检查 upstream existence
- 通过 `gh pr list --head <branch>` 检查 PR existence，并区分 exit-0-`[]` = none 与 non-zero = unknown（同时遵守 §4 的 branch-name-collision caveat）
- 任何 push/PR transition 前做 default-branch safety

这把 brittle narrative 变成 deterministic control flow，具有少量 clear state transitions。

## 修复过程中遇到的边界情况

这些不是 hypothetical concerns。每一项都在修订 `ce-commit` 与 `ce-commit-push-pr` 时出现过，其中几次 "fixes" 在 flow 的下一步引入新 bug。

### 1. Detached HEAD 即使看似 "handled"，也会作为后续 bug 再出现

早期版本只在 PR-detection step guard detached HEAD。看起来没问题，直到 workflow 在 PR detection 前加入 "clean working tree" shortcut。在 detached HEAD 且已有 committed local work 时，该 shortcut 可能直接跳到 push logic 并触发：

```bash
git push -u origin HEAD
```

这会失败，因为 detached HEAD 不是 branch ref。

Learning: detached HEAD 必须在任何可能 skip around it 的后续 shortcut 前处理。

### 2. 创建 branch 不够；skill 必须重新读取 Git 认为当前是哪条 branch

另一个 revision 从 detached HEAD 创建了 branch，但后续 steps 仍描述为使用 "the branch name from Step 1." 如果 Step 1 最初运行在 detached HEAD，早期 branch value 是空。后续 PR detection 仍可能使用 stale empty value。

Learning: `git checkout -b <branch-name>` 后，重新运行 `git branch --show-current`，并把 output 作为唯一可信 branch name。

### 3. Bare branch-name PR lookup 修复一个问题，又制造另一个问题

我们从 `gh pr view` 切换到：

```bash
gh pr list --head "<branch>" --json url,title,state --jq '.[0] // empty'
```

因为 `gh pr view` 在没有 PR 时会 surface non-zero exit。这改善了 no-PR path，但引入 correctness problem：`gh pr list --head` 只按 branch name 匹配，而 GitHub CLI 不支持该 flag 的 `<owner>:<branch>` syntax。在 multi-fork repo 中，另一个人的 PR 可以复用同一 branch name。

Learning：这是真实 trade-off，而不是已有唯一赢家。Skills 最终保留 `gh pr list --head <branch> --state open`，因为它具有 clean exit semantics（exit-0-`[]` = no PR，non-zero = unknown）；这一点也很重要，因为如果 check 曾在 skill *load* time 运行，`gh pr view` 的 exit-1-on-no-PR 会 fatal。通过指向 base repo，并在 `gh pr create` 前 re-verify（见 §4），约束 branch-name collision。无论选择哪种 command，都要把 trade-off 写下来，让它不再 regression。

### 4. "No PR" 在 workflow 中不是 error，即使 CLI exits non-zero

最初改掉 `gh pr view` 的原因是 branch 没有 PR 时看起来像 command failure。但对这个 workflow，"no PR yet" 通常是 expected state，应导向 creation logic，而不是 stop skill。

Learning: 将 expected non-zero exits 记录为 state transitions，而不是 generic failures。

### 5. `git diff HEAD` 漏掉最常见 commit cases 之一：untracked files

某个版本用 `git diff HEAD` 判断是否存在 work。只有 newly created file 的 repo 中，`git diff HEAD` 为空，但 `git status` 显示 `?? file`。

Learning: untracked-only work 是 first-class case。使用 `git status` 作为 cleanliness check。

### 6. "No upstream" 与 "nothing to push" 是不同 states

早期 shortcut 把 `git log @{u}..HEAD` 的 error 当作 "nothing to push." 这在有 local commits 但尚未配置 upstream 的 new feature branch 上是错的。branch 仍需要 first push。

Learning: 先检查 upstream 是否存在，再检查是否有 unpushed commits。

### 7. Default-branch safety 会被 convenience shortcut 绕过

另一个 revision 添加了 clean-working-tree shortcut："if there are unpushed commits, skip commit and continue to push." 这在 feature branches 上有效，但意外跳过了正常的 "don't work directly on main/default branch" safety gate。结果是：push default-branch commits，然后走向 PR creation。

Learning: 每条可能导向 push 或 PR creation 的 path 都必须经过 default-branch safety check。

### 8. 在 default branch 上拒绝 feature-branch creation 必须停止 PR workflow

一次 fix 在 clean-tree logic 发现 unpushed default-branch commits 时询问用户是否先创建 feature branch。但如果用户拒绝，workflow 仍继续 push，然后尝试 PR creation。这会导致 impossible "open a PR from the default branch to itself" 状况。

Learning: 在 `ce-commit-push-pr` 中，default branch 上拒绝 feature-branch creation 是 stop condition，不是 continue condition。

### 9. Clean-working-tree shortcuts 同时牵涉 branch safety、PR state 与 upstream state

最难的 bugs 来自 "no local edits, but there may still be work to do" path。这一条 logic branch 必须回答：

- 当前 branch 是否 detached？
- 当前 branch 是否 default branch？
- branch 是否有 upstream？
- 是否有 unpushed commits？
- 是否已经存在 PR？

漏掉任一 check 都会产生新 bug。

Learning: clean-working-tree shortcuts 是 Git workflow skills 中风险最高的部分，因为它们同时组合最多 state dimensions。

### 10. Git workflow skills 极易出现 whack-a-mole regressions

这些 fixes 背后的 meta-pattern 是：

1. 改善一个 failure mode
2. 暴露另一个 state transition 其实只被隐式建模
3. 在 prose 中添加一个 new branch
4. 发现 new branch 跳过了先前安全的 checkpoint

Learning: 这些 skills 应像 tiny state machines 一样设计和 review，而不是 narrative instructions。对一个 state transition 的任何 change，都应触发相邻所有 states 的 walkthrough，然后才认为 skill fixed。

## 预防

- 对 Git/GitHub skills，将 workflow design 视为 state machine，而不是 linear checklist。
- 在 decision point 重新运行能回答当前问题的 command。如果 mutating command 可能改变了值，不要依赖 earlier gathered values。
- 用 `git status` 判断 "is there local work?"，将 `git diff` 留给 describing content，而不是 determining whether work exists。
- 当 non-zero CLI exits 代表 state（例如 branch 无 PR 时的 `gh pr view`），显式建模 expected exits。
- 当 tool 会将 non-zero exits 视觉高亮为 failures 时，自己捕获 expected state probes 的 exit code，使正确 logic 不会看起来 broken。
- 理解 PR-detection trade-off，并记录选择。`gh pr list --head <branch>` 具有 clean exit semantics（exit-0-`[]` = no PR，non-zero = unknown），但只按 branch name filter；`gh pr view` 能感知 current branch，却在 normal no-PR state 上 exit 1（且在 skill load time 会 fatal）。当前 skills 使用 `gh pr list`，指向 base repo 且只传 branch name，并通过 `gh pr create` 前 re-verify 来约束 multi-fork branch-name collision。
- 在每条可导向 push 或 PR creation 的 path 中保留 default-branch safety checks，包括 "clean working tree but unpushed commits" shortcuts。
- 编辑 skill logic 时，在认为 change complete 前，手动 walkthrough 这些 cases：
  - detached HEAD 且有 uncommitted changes
  - detached HEAD 且有 committed but unpushed work
  - 只有 untracked files
  - feature branch 没有 upstream
  - feature branch 有 upstream 但没有 PR
  - feature branch 有 upstream 且已有 PR
  - default branch 有 unpushed commits
  - 非 `main` 的 default branch names，例如 `develop` 或 `trunk`

## 相关 Issues

- [no-load-time-pre-resolution-for-fallible-context.md](no-load-time-pre-resolution-for-fallible-context.md) — why the PR check moved to `gh pr list` and out of load-time pre-resolution; the source of the current §4 decision.
- [script-first-skill-architecture.md](script-first-skill-architecture.md)
- [pass-paths-not-content-to-subagents.md](pass-paths-not-content-to-subagents.md)
