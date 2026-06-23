---
name: ce-worktree
description: 确保 work 在 isolated git worktree 中进行且不扰动 current checkout。当开始应保持隔离的工作，或 `ce-work` / `ce-code-review` 提供 worktree option 时使用。先检测 existing isolation，优先 harness native worktree tool，最后 fallback 到 plain git。
---

# Worktree Isolation（Worktree 隔离）

确保当前工作在 isolated workspace 中进行，同时不扰动用户的 main checkout。多数 coding harness 现在会在 session start 时默认创建 worktree，所以常见情况是 **isolation already exists**。先检测这一点，不要创建 redundant worktree。

操作顺序：**detect existing isolation -> prefer a native worktree tool -> fall back to plain git**。永远不要创建 harness 看不到的 worktree。

## Step 0: Detect existing isolation（检测已有隔离）

创建任何东西之前，检查当前 directory 是否已经是 linked worktree。比较 **resolved absolute** git dir 和 **resolved absolute** common git dir；先把两者 resolve 成 absolute path 再比较，不要比较 raw `git rev-parse` output。Git 会根据当前 directory 混用 absolute 和 relative forms（从普通 checkout 的 subdirectory 运行时，`--git-dir` 返回 absolute，而 `--git-common-dir` 可能是 relative），所以 raw string compare 会误判为 "already isolated"：

```bash
git rev-parse --absolute-git-dir                     # absolute git dir for this worktree
(cd "$(git rev-parse --git-common-dir)" && pwd -P)   # absolute shared (common) git dir
```

如果两个 absolute paths **相等**，这是 normal checkout，继续 Step 1。

如果它们**不同**，你处在 linked worktree *或* submodule 中。用下面命令区分：

```bash
git rev-parse --show-superproject-working-tree
```

- **Non-empty** output -> 你在 submodule 中；把它当作 normal checkout，继续 Step 1。
- **Empty** output -> 你**已经在 isolated worktree 中**。报告 worktree path（`git rev-parse --show-toplevel`）和 current branch，并 **work in place（原地工作）**。不要再创建另一个 worktree；worktree-from-worktree 会落到错误 tree 中，而且对创建当前 worktree 的 harness 不可见。

## Step 1: Prefer the harness's native worktree tool（优先 harness native tool）

如果 harness 提供 native worktree primitive，例如 `EnterWorktree` / `WorktreeCreate` tool、`/worktree` command 或 `--worktree` flag，使用它并停止。Native tools 会放置、跟踪和清理 worktree，让 harness 能管理它。背着 harness 运行 `git worktree add` 会创建它看不到、无法 navigate、也无法 cleanup 的 phantom state。

## Step 2: Git fallback

仅当没有 native tool，且 Step 0 没有发现 existing isolation 时执行。

1. **Run from the repo root（从 repo root 运行）。** 下方 `.worktrees/` 和 `.gitignore` paths 是 repo-root-relative，但 skill 从用户当前 directory 运行，而当前 directory 可能是 subdirectory。因此先移动到 root：`cd "$(git rev-parse --show-toplevel)"`。否则 `.worktrees/<branch>` 和 `.gitignore` edit 会落在 subdirectory（例如 `src/.worktrees/...`、`src/.gitignore`），而不是 repo root。
2. 从 work description 选择 meaningful branch name（例如 `feat/login`、`fix/email-validation`），避免 opaque auto-generated names。选择 base branch（默认 origin default branch，否则 `main`）。
3. **创建任何东西前，确保 `.worktrees/` 已 gitignored**，这样 worktree contents 永远不会被 commit：检查 `git check-ignore -q .worktrees/`，**保留 trailing slash**，这样 existing directory-only `.worktrees/` rule 即使在 directory 尚不存在时也会被尊重（没有 slash 的 `git check-ignore .worktrees` 会 miss，并 dirty 一个已经正确配置的 repo）。如果未 ignored，向 `.gitignore` 添加 `.worktrees/` line。
4. Best-effort refresh base branch，同时不扰动 current checkout：`git fetch origin <from-branch>`。这是 **non-fatal**；如果出错（没有 `origin` remote、remote 名不同，或 local-only branch），不要 abort，继续下一步并使用 local ref。
5. 当 remote base 可用时从 remote base 创建 worktree，否则从 local ref 创建：`git worktree add -b <branch-name> .worktrees/<branch-name> origin/<from-branch>`。如果 `origin/<from-branch>` 不存在，改用 local `<from-branch>` ref。
6. 切进去：`cd .worktrees/<branch-name>`。

如果 `git worktree add` 因 sandbox 或 permission error 失败，说明无法创建请求的 isolation。在触碰 current checkout 前需要一个 **blocking** 用户决策；不要静默继续在那里工作（用户选择 isolation 正是为了避免这一点，尤其是 `ce-work` / `ce-code-review` 因 worktree option 路由到这里时）。报告 failure，并通过平台 blocking question tool 询问：Claude Code 中用 `AskUserQuestion`（schema 未加载时先用 `ToolSearch` 且 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Antigravity 中用 `ask_question`、Pi 中通过 `pi-ask-user` extension 用 `ask_user`。选项可包括 "work in the current checkout" 和 "stop and resolve the permission issue"。如果 harness 没有 blocking tool 或调用失败，在 chat 中展示 numbered options 并等待回复；绝不要跳过确认。只有用户明确确认时，才在 current checkout 中工作；不要自动尝试替代路径。

## Other worktree operations（其他 worktree 操作）

直接使用 `git`；不需要 wrapper：

```bash
git worktree list                          # list worktrees
git worktree remove .worktrees/<branch>    # remove a worktree
cd .worktrees/<branch>                     # switch to a worktree
cd "$(git rev-parse --show-toplevel)"      # return to the current checkout root
```

## When to create a worktree（何时创建 worktree）

只有在你**尚未** already isolated，且需要 separate workspace 时，才创建（Step 1/2）：

- Review PR，同时保持 current checkout 可继续其他工作
- 并行运行多个 features，避免 branch-switching overhead

对于可以在 current checkout 的 branch 中完成的 single-task work，不要创建 worktree。Step 0 显示你已经在 worktree 中时也绝不要创建。

## Integration（集成）

`ce-work` 和 `ce-code-review` 会把此 skill 作为 option 提供。用户在这些 flows 中选择 "worktree" 时，先运行 Step 0：如果 work 已经 isolated，原地继续；否则用从 work description derive 的 meaningful branch name 创建 worktree（优先 native tool）。

## Troubleshooting（故障排除）

**"Worktree already exists"**：path 已被使用。重新创建前切到它（`cd .worktrees/<branch>`）或移除它（`git worktree remove .worktrees/<branch>`）。

**"Cannot remove worktree: it is the current worktree"**：先 `cd` 离开 worktree，再运行 `git worktree remove`。
