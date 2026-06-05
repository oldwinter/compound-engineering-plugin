---
name: ce-clean-gone-branches
description: 清理 remote tracking branch 已 gone 的 local branches。当用户说 "clean up branches"、"delete gone branches"、"prune local branches"、"clean gone"，或想移除 remote 上已不存在的 stale local branches 时使用。也会处理有 associated worktrees 的 branches。
---

# Clean Gone Branches（清理 gone branches）

删除 remote tracking branch 已被删除的 local branches，包括任何 associated worktrees。

## Workflow（工作流）

### Step 1: Discover gone branches（发现 gone branches）

运行 discovery script，fetch 最新 remote state 并识别 gone branches：

```bash
bash scripts/clean-gone
```

[scripts/clean-gone](./scripts/clean-gone)

Script 会先运行 `git fetch --prune`，再解析 `git branch -vv` 中标记为 `: gone]` 的 branches。

如果 script 输出 `__NONE__`，报告未发现 stale branches 并停止。

### Step 2: Present branches and ask for confirmation（展示 branches 并请求确认）

向用户展示将被删除的 branches list。格式为 simple list：

```
These local branches have been deleted from the remote:

  - feature/old-thing
  - bugfix/resolved-issue
  - experiment/abandoned

Delete all of them? (y/n)
```

使用平台的 blocking question tool 等待用户回答：Claude Code 中用 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 搭配 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Gemini 中用 `ask_user`、Pi 中用 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到在 chat 中展示 list；不要因为需要 schema load 就 fallback。绝不要 silently skip 该问题。

这是针对整个 list 的 yes-or-no decision；不要提供 multi-selection 或 per-branch choices。

### Step 3: Delete confirmed branches（删除已确认的 branches）

如果用户确认，删除每个 branch。对每个 branch：

1. 检查是否有 associated worktree（`git worktree list | grep "\\[$branch\\]"`）
2. 如果 worktree 存在且不是 main repo root，先移除：`git worktree remove --force "$worktree_path"`
3. 删除 branch：`git branch -D "$branch"`

边执行边报告 results：

```
Removed worktree: .worktrees/feature/old-thing
Deleted branch: feature/old-thing
Deleted branch: bugfix/resolved-issue
Deleted branch: experiment/abandoned

Cleaned up 3 branches.
```

如果用户拒绝，acknowledge 并停止，不删除任何内容。
