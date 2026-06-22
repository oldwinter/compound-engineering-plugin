# 从 default branch 创建 branch

Local `<base>` 可能有 stale commits（另一个 session/worktree 推进了它），也可能有用户本来想稍后从中 branch 的 commits。Local git 无法区分两者；当存在 unpushed commits 时要询问。

## Decision flow（决策流程）

### 1. Fetch fresh remote base（获取最新 remote base）

```bash
git fetch --no-tags origin <base>
```

如果 fetch 失败（network、auth、no remote），使用底部 fallback。

### 2. 检查 `<base>` 上的 unpushed local commits

```bash
git log origin/<base>..HEAD --oneline
```

- **Empty output：** 设置 `BASE_REF=origin/<base>`，并继续 step 3。
- **Non-empty output：** 展示 commit list，并按 `SKILL.md` 中的 "Asking the user" convention 询问：

  > "Local `<base>` has N unpushed commits not on `origin/<base>`. Carry them onto the new feature branch, or leave them on local `<base>`?"
  > （中文含义：本地 `<base>` 有 N 个不在 `origin/<base>` 上的未推送 commits。要把它们带到新的 feature branch，还是留在本地 `<base>`？）

  - **Carry forward（带上这些 commits）** -> `BASE_REF=HEAD`。New branch 从 local HEAD 开始，保留这些 commits。
  - **Leave on `<base>`（留在 `<base>`）** -> `BASE_REF=origin/<base>`。New branch 干净开始；commits 留在 local `<base>`。

  永远不要 silent default：把 foreign commits 带进 PR 比多问一次更糟。

### 3. 创建 feature branch

```bash
git checkout -b <branch-name> "$BASE_REF"
```

如果 checkout 因 uncommitted changes 会被覆盖而失败，stash 后重试：

```bash
git stash push -u -m "ce-commit-push-pr: pre-branch <branch-name>"
git checkout -b <branch-name> "$BASE_REF"
git stash pop
```

如果 `git stash pop` 报告 conflicts，向用户展示 conflict output 和 stash ref；不要 auto-resolve。

## Fetch failure fallback（fetch 失败 fallback）

如果 `git fetch` 失败，从当前 local HEAD branch：

```bash
git checkout -b <branch-name>
```

在 user-facing summary 中说明 base freshness 未验证。跳过 unpushed-commits check；没有 fresh `origin/<base>` 时，答案不可靠。
