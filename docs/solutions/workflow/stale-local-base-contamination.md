---
title: "多 session 创建分支时的 stale local base contamination"
category: workflow
date: 2026-04-27
created: 2026-04-27
severity: medium
component: ce-commit-push-pr
problem_type: workflow_issue
tags:
  - branching
  - multi-agent
  - multi-session
  - pre-push
  - stacked-prs
  - contamination
---

# 多 session 创建分支时的 stale local base contamination

## 问题

当多个 agent sessions（Claude Code、Cursor、Codex，加上人类）共享同一个 local clone 时，本地 `<default-branch>` 可能相对远端 counterpart 发生漂移。两类具体漂移会造成下游问题：

1. **Local default behind remote。** 另一个 session 已经 push 并 merge 了 work；当前 session 的本地 `main` 还不知道。
2. **Local default ahead of remote with unpushed work。** 另一个 session 在 push 前向本地 `main` 提交，或把 feature branch merge 到本地 `main`，然后从未将这些 commits push 到 `origin/main`。

当存在第 2 类漂移时，如果某个 session 从本地 `main` 创建 feature branch，新分支会静默继承这些 unpushed work。最终打开的 PR 在发起 session 看起来干净，但在 GitHub 上显示为 contaminated。解决它需要在 PR review 期间做 force-push surgery。

这来自 [issue #707](https://github.com/EveryInc/compound-engineering-plugin/issues/707)。

## 为什么事后检测是错误工具

直觉上的修复是在 push 前或打开 PR 前检测 contamination。曾考虑并拒绝了两种检测方案：

### 方案 A：显示 foreign commit authors

读取 `git log <base>..HEAD --pretty=format:'%h %ae %s'`，当任何 commit 的 author email 与 `git config user.email` 不同时警告。

它能捕获 cross-author 场景（cherry-picks、teammate-authored work），但会漏掉主导场景：multi-agent setups 中每个 session 都使用相同的 `user.email`。该检查会对有意的 cherry-picks 触发，却对真正的 contamination pattern 保持沉默。

### 方案 B：cross-branch reachability

对 `<base>..HEAD` 中的每个 commit，检查它是否可从其他 `origin/*` ref 到达。如果可以，就视为可疑。

它与 authorship 无关，因此能捕获 same-user contamination。但它测量的信号——“这个 commit 位于另一个 remote branch 上”——正是 stacked-PR workflows 的**定义特征**，其中 stack 中的 parent commits 会有意与 sibling branches 共享。Graphite 和 git-spice 等工具依赖这一点。随着 GitHub-native stacked PRs 走向 general availability，并可能被广泛采用，false-positive rate 会从“窄人群”变成“高级用户大多数 push”。该检查会从有用信号反转为默认噪音。

可以围绕它打补丁（从 PR base refs 解析 stack metadata），但每个相邻 workflow（PR 存在前的首次 push、multi-level stacks、fork-based stacks）都会让补丁倍增。每个补丁都是某处会出错的 heuristic。

## 解决方案

在 branch creation 时预防，而不是在 push 或 PR 时检测。

`ce-commit-push-pr` Step 4，即用户在 default branch 且有 working-tree changes 时调用 skill 所使用的 branch-creation path，已从：

```bash
git checkout -b <branch-name>
```

改为：

```bash
git fetch --no-tags origin <base>
git checkout -b <branch-name> origin/<base>
```

当 fetch 失败（offline、restricted network、expired auth）时，会 graceful fallback 到 local-base 形式。fallback 会向用户说明，让他们知道 base freshness 未被验证。

这让 skill 的 branch-creation path 在构造上安全：

- Drift type 1（local behind remote）：新分支从 fresh remote `<base>` 开始，而不是 stale local `<base>`。
- Drift type 2（local ahead of remote with unpushed work）：unpushed local commits 留在 local `<base>` 上（可通过 reflog 或 branch ref 恢复）；新的 feature branch 干净开始。

该原则也能干净推广到 stacked PRs：当用户想叠在一个 open PR 之上时，同样的 `git fetch && git checkout -b <name> origin/<parent>` pattern 可用，`<parent>` 只是另一个 ref。预防本身不依赖检测“这个 commit 是否可疑”。

## 不覆盖的范围

- **在 skill 外创建的 branches。** 手动运行 `git checkout -b` 的用户，或 IDE 在不 fetch 的情况下创建 branches，仍可能产生 contaminated branches。skill 的路径变安全了；用户的一般 workflow 没有。pre-push hook（原 reporter 已安装）可覆盖该场景，opt-in hooks 仍是合理的 user-side mitigation。
- **已经 contaminated 的 branches。** 一旦 branch 携带 foreign commits，此变更不会对它做任何事。恢复仍是手动流程：识别 foreign commits，通过 interactive rebase 或 `git reset` 把它们丢到 clean base，再 force-push。
- **语义不同的 Step 1 branch-creation paths。** 当用户在 default branch 上有 unpushed commits，并请求创建 feature branch 来“拯救”这些 commits 时，期望行为是把本地 commits 带到新分支上，这与 Step 4 场景相反。Step 1 行为保持不变。

## User-side mitigations（用户侧缓解措施）

对于在 skill 外创建 branch 的 workflows，建议：

- 使用 `git switch -c <name> origin/<base>`，而不是 `git checkout -b <name> <base>`
- 一个 `git config --global alias.nb '!f() { git fetch origin "${2:-main}" && git switch -c "$1" "origin/${2:-main}"; }; f'` 风格的 alias
- 一个 opt-in pre-push hook，将 HEAD 的 parent chain 与 `origin/<base>` 比较以查找 unexpected commits；这对个体用户有用，但不由该 plugin 发布，因为在 hook 中正确处理 stacked-PR semantics 的成本超过 plugin level 的收益

## 为什么完全没有发布 detection check

reporter 将他们的问题描述为“a pattern, not a request for a merge”。按这个说法认真对待，并基于 structural signal 行动，也就是把它视为值得永久修复的真实 failure mode，带来了以下结果：

- skill 中一个小的 preventive change，且在构造上安全
- 一个带有 rationale、供未来读者使用的 documented pattern
- 没有给 high-traffic skill 增加 behavioral prompt
- 没有引入可能被 stacked PRs 淘汰的 detection heuristic

即使严格限定范围，在 push 或 PR 时增加 detection check 也不是免费的：它会给 frictionless workflow 增加 prompt，会对跨 branches 共享 commits 的合法 workflows 产生 false-positives，并且会随着 stacked-PR conventions 演进而需要持续 tuning。在正确层级预防可以避免这一切。
