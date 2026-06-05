# `ce-clean-gone-branches`

> 删除 remote tracking branch 已被删除的 local branches，包括任何关联 worktrees。

`ce-clean-gone-branches` 是 **branch-hygiene** skill。PRs upstream merge 后，remote tracking branches 会消失，但 local branches 会长期留下，弄乱 `git branch`，并增加 `git fetch` 时间。这个 skill 通过 `git fetch --prune` + `git branch -vv` parsing 发现 orphaned local branches，展示列表，请求确认，然后删除它们，包括任何关联 worktrees。

这是一个简单、高频的 utility。只要你的 branch list 看起来吵，就运行它。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 发现 remote tracking branch 为 `: gone]` 的 local branches，在确认后删除它们（先 worktrees，再 branches） |
| 何时使用 | "Clean up branches"、"delete gone branches"、"prune local branches"：周期性 branch-list hygiene |
| 产出什么 | Removed worktrees、deleted local branches；不会 commit |
| Scope | 对整个列表 yes-or-no；不做 per-branch picking |

---

## 问题

PRs merge 后，local branches 会堆积：

- **`git branch` 变吵**：30+ local branches，大多数代表已经 shipped 的工作
- **`git fetch` 和 tab-completion 变慢**：需要枚举更多 refs
- **Worktrees orphan**：附着在很久前 merged branches 上的 worktrees 仍占 disk space 和 tooling overhead
- **Manual cleanup tedious**：先 `git branch -vv | grep gone`，再逐个 `git branch -D`，还要额外处理 worktrees
- **Auto-generated worktree names**（例如 `worktree-jolly-beaming-raven`）让人不清楚哪些 orphans 属于什么

## 方案

`ce-clean-gone-branches` 分三步运行 cleanup：

- **Discovery**：运行 `git fetch --prune` 刷新 remote state，然后 parse `git branch -vv` 中的 `: gone]` markers
- **Confirmation**：展示完整列表，对整个列表问 yes-or-no（不做 per-branch picking）
- **Deletion**：对每个 branch，若存在 worktree，先 remove worktree，再运行 `git branch -D`

简单的 all-or-nothing decision 让 skill 保持快速。如果只想删除部分 branches，请 decline，然后直接对想删的分支运行 `git branch -D`。

---

## 它的新意

### 1. 通过 `git fetch --prune` + `: gone]` parsing 发现

Skill 先运行 `git fetch --prune` 刷新 local 对 remote state 的认知，然后 parse `git branch -vv`，寻找 tracking branch 显示 `: gone]` 的 branches；这是 remote branch 已删除的 canonical signal。没有 prune 时，local refs 仍会认为 stale remote branches 存在；skill 不依赖用户最近手动 prune 过。

### 2. Worktree-aware cleanup（感知 worktree 的清理）

对每个将被删除的 branch，skill 会检查 `git worktree list` 是否存在 associated worktree。如果存在且不是 main repo root，会先通过 `git worktree remove --force` 删除它，再删除 branch 本身。这样可以避免 bare `git branch -D` 遇到的 "cannot delete branch — checked out in worktree" error。

### 3. All-or-nothing confirmation（全有或全无确认）

用户看到完整列表，并对整个列表回答 yes 或 no。Skill **不会**提供 multi-select 或 per-branch choices。两个原因：

- 列表通常很小（5-20 branches）；看完并说 "yes" 成本很低
- Multi-select 会给高频 routine cleanup task 增加不划算的 UI overhead

如果用户需要更精细控制，decline 后运行 `git branch -D <specific-branch>` 很快。

### 4. 边删边报告

删除时，skill 会打印每个 action：`Removed worktree: ...`、`Deleted branch: ...`，让用户实时看到 progress。Final summary 会说明 count。

---

## 快速示例

你很久没清理 local branches。调用 `/ce-clean-gone-branches`。

Skill 运行 `bash scripts/clean-gone`，它会 fetch with prune 并 parse `git branch -vv`。输出：5 个 gone branches。

```text
These local branches have been deleted from the remote:

  - feat/notification-mute
  - fix/auth-redirect
  - refactor/extract-service
  - chore/upgrade-deps
  - experiment/new-clustering

Delete all of them? (y/n)
```

你回答 yes。Skill 逐个处理：

- `feat/notification-mute` 在 `.worktrees/feat-notification-mute` 有 worktree。先 remove worktree：✓。再 delete branch：✓。
- `fix/auth-redirect` 没有 worktree。Delete branch：✓。
- ...

Final summary（最终摘要）：

```text
Removed worktree: .worktrees/feat-notification-mute
Deleted branch: feat/notification-mute
Deleted branch: fix/auth-redirect
Deleted branch: refactor/extract-service
Deleted branch: chore/upgrade-deps
Deleted branch: experiment/new-clustering

Cleaned up 5 branches.
```

---

## 何时使用

在以下情况使用 `ce-clean-gone-branches`：

- 多个 PRs merge 后，`git branch` list 开始变吵
- 你注意到一些已不记得的 branches 仍有 lingering worktrees
- 已经一段时间没清理；periodic hygiene 过期了

以下情况跳过 `ce-clean-gone-branches`：

- 只想删除 specific branches：直接运行 `git branch -D <name>`
- 即使 remote 已 gone，也想保留 local branch：decline prompt
- 当前不是配置了 remote 的 working copy：skill 需要 remote 才能比较

---

## 作为 Workflow 的一部分使用

`ce-clean-gone-branches` 基本是 standalone，不位于 chain 内。以下情况调用：

- 几个 PRs 已 merge，用户想整理 local state
- Worktree creation 因 dead branches 上的 orphaned worktrees 失败
- 用户准备开始新一条 work line，希望 clean slate

---

## 单独使用

不带 arguments 直接调用：

- `/ce-clean-gone-branches`

Skill 会 discover、ask 并 delete。没有 flags，没有 selection；只对完整列表 yes 或 no。

---

## 参考

| Step | Action（动作） |
|------|--------|
| 1 | 运行 `bash scripts/clean-gone`（fetches with prune，parse `: gone]`） |
| 2 | 展示 stale branches 列表；对整个列表问 yes/no |
| 3 | 对每个 confirmed branch：如果存在 worktree，先 remove worktree，再 `git branch -D` |
| 4 | 删除过程中报告 results；final summary 带 count |

如果 script 输出 `__NONE__`，skill 会报告没有发现 stale branches 并停止。

---

## 常见问题

**什么是 "gone" branch？**
Remote tracking branch 已在 upstream 删除的 local branch（通常因为 PR merged，GitHub 删除了 source branch）。`git branch -vv` 会在这类 branch 旁显示 `: gone]`。

**为什么 all-or-nothing，而不是 per-branch picking？**
因为列表通常很小，全部 review 只要几秒。Multi-select UI 会给高频任务增加 friction。如果需要 surgical control，请 decline，并对 specific branches 使用 `git branch -D <name>`。

**为什么先 remove worktree 再 delete branch？**
因为对 checked-out branch（位于 worktree 中）运行 `git branch -D` 会失败。Skill 先 remove worktree 来避免该 error。

**如果 worktree 有 uncommitted changes 怎么办？**
`git worktree remove` 使用 `--force`，所以 uncommitted changes 会被丢弃。如果 branch 已经 "gone"（远端 merged 并删除），你几乎肯定不需要那里 lingering 的 uncommitted changes。如果确实需要，请 decline prompt，并先手动处理该 worktree。

**如果 script 失败或没有返回 branches 怎么办？**
如果不存在 gone branches，skill 会 cleanly stop 并报告 "no stale branches found"。如果 script 本身报错，skill 会 surface error。

---

## 另见

- [`/ce-worktree`](./ce-worktree.md) - sibling skill，用于 worktree creation；本 skill 在 worktrees 变成 orphan 后负责 cleanup
