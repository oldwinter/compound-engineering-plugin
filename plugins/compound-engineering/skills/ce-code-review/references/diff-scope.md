# Diff Scope Rules（Diff 范围规则）

这些规则适用于每个 reviewer。它们定义什么是“需要 review 的代码”，以及什么是 pre-existing context。

## Scope Discovery（范围发现）

按以下优先级确定要 review 的 diff：

1. **User-specified scope（用户指定范围）。** 如果 caller 传入了 `BASE:`、`FILES:` 或 `DIFF:` markers，精确使用该 scope。
2. **Working copy changes（工作副本变更）。** 如果存在 unstaged 或 staged changes（`git diff HEAD` 非空），review 这些 changes。
3. **Unpushed commits vs base branch（相对 base branch 的未推送提交）。** 如果 working copy 干净，review `git diff $(git merge-base HEAD <base>)..HEAD`，其中 `<base>` 是 default branch（main 或 master）。

SKILL.md 中的 scope step 会处理 discovery，并传入 resolved diff。除非 PR scope mode 要求（见下文），不需要自行运行 git commands。

## Remote scope（`pr-remote` 和 `branch-remote`）

当 review context 包含 `<pr-scope-mode>pr-remote</pr-scope-mode>` 或 `<pr-scope-mode>branch-remote</pr-scope-mode>` 时，working tree **不是**被 review 的 head。不要对 changed-file list 中的文件使用 Read/Grep 读取 workspace paths；它们可能与正在 review 的 branch 或 PR 不匹配。

改为：

- 当 context 中提供 `<pr-head-ref>` 或 `<branch-head-ref>` 时，优先使用 `git show <remote-head-ref>:<path>`。
- 否则只依赖提供的 `<diff>` 中的 diff hunks。
- 不要把 local workspace contents 当作 changed files finding 的证据。

## Finding Classification Tiers（Finding 分类层级）

报告的每个 finding 都要根据它与 diff 的关系归入以下三层之一：

### Primary（直接变更的代码）

diff 中新增或修改的 lines。这是主要关注点。针对这些 lines 报告 findings 时可以用 full confidence。

### Secondary（紧邻上下文代码）

与 changed line 位于同一 function、method 或 block 中的 unchanged code。如果某个 change 引入的 bug 只有阅读 surrounding context 才能看出，报告它；但说明该 issue 存在于 new code 与 existing code 的交互中。

### Pre-existing（与此 diff 无关的既有问题）

位于 unchanged code 中、diff 未触碰且没有交互的 issues。在输出中将它们标记为 `"pre_existing": true`。它们单独报告，不计入 review verdict。

**规则：** 如果面对不包含 surrounding file 的同样 diff 时仍会标记同一 issue，它就是 pre-existing。如果 diff 让该 issue *newly relevant*（例如新的 caller 命中了既有 buggy function），它就是 secondary。
