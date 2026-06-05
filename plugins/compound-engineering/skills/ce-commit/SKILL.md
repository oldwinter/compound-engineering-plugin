---
name: ce-commit
description: 创建带有清晰、传达 value 的 message 的 git commit。当用户说 "commit"、"commit this"、"save my changes"、"create a commit"，或想 commit staged/unstaged work 时使用。会产出遵循 repo conventions 的 well-structured commit messages；没有 convention 时默认 conventional commit format。
---

# Git Commit（Git 提交）

从 current working tree changes 创建一个 well-crafted git commit。

## Context（上下文）

**在 Claude Code 以外的平台上**，跳到下方 "Context fallback" section，并运行其中 command 收集 context。

**在 Claude Code 中**，下方五个 labeled sections（Git status、Working tree diff、Current branch、Recent commits、Remote default branch）包含 pre-populated data。在整个 skill 中直接使用它们；不要 re-run 这些 commands。

**Git status（Git 状态）:**
!`git status`

**Working tree diff（工作区 diff）:**
!`git diff HEAD`

**Current branch（当前分支）:**
!`git branch --show-current`

**Recent commits（最近 commits）:**
!`git log --oneline -10`

**Remote default branch（远端默认分支）:**
!`git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo '__DEFAULT_BRANCH_UNRESOLVED__'`

### Context fallback（上下文兜底）

**在 Claude Code 中跳过此 section；上方 data 已可用。**

运行这一条 command 收集全部 context：

```bash
printf '=== STATUS ===\n'; git status; printf '\n=== DIFF ===\n'; git diff HEAD; printf '\n=== BRANCH ===\n'; git branch --show-current; printf '\n=== LOG ===\n'; git log --oneline -10; printf '\n=== DEFAULT_BRANCH ===\n'; git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo '__DEFAULT_BRANCH_UNRESOLVED__'
```

---

## Workflow（工作流）

### Step 1: Gather context（收集上下文）

使用上方 context（git status、working tree diff、current branch、recent commits、remote default branch）。此 step 所需 data 已经可用；不要 re-run 这些 commands。

Remote default branch value 会返回类似 `origin/main` 的内容。去掉 `origin/` prefix 得到 branch name。如果返回 `__DEFAULT_BRANCH_UNRESOLVED__` 或裸 `HEAD`，尝试：

```bash
gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'
```

如果两者都失败，fallback 到 `main`。

如果上方 context 中的 git status 显示 clean working tree（没有 staged、modified 或 untracked files），报告没有内容可 commit 并停止。

如果上方 context 中 current branch 为空，repo 处于 detached HEAD state。解释：如果用户希望此 work attached to a branch，commit 前需要 branch。询问是否现在创建 feature branch。使用平台 blocking question tool：Claude Code 中用 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 搭配 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Gemini 中用 `ask_user`、Pi 中用 `ask_user`（需要 `pi-ask-user` extension）。只有 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到在 chat 中展示 options；不要因为需要 schema load 就 fallback。绝不要 silently skip 该问题。

- 如果用户选择创建 branch，从 change content derive name，用 `git checkout -b <branch-name>` 创建，然后再次运行 `git branch --show-current`，并在 workflow 剩余部分把该结果作为 current branch name。
- 如果用户拒绝，继续 detached HEAD commit。

### Step 2: Determine commit message convention（确定 commit message 约定）

按此 priority order：

1. **Repo conventions already in context** -- 如果 project instructions（AGENTS.md、CLAUDE.md 或类似文件）已加载并指定 commit message conventions，遵循它们。不要 re-read 这些 files；它们在 session start 已加载。
2. **Recent commit history** -- 如果没有明确 documented convention，检查 Step 1 中最近 10 个 commits。如果出现 clear pattern（例如 conventional commits、ticket prefixes、emoji prefixes），匹配该 pattern。
3. **Default: conventional commits** -- 如果两个来源都没有 pattern，使用 conventional commit format：`type(scope): description`，其中 type 是 `feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`perf`、`ci`、`style`、`build` 之一。

使用 conventional commits 时，选择最精确描述 change 的 type（见上方 type list）。当 `fix:` 和 `feat:` 都似乎适用时，默认 `fix:`：修复 broken 或 missing behavior 的 change 是 `fix:`，即使用新增代码实现。`feat:` 保留给用户此前无法完成的 capabilities。其他 types 更适合时仍优先。用户可对 specific change override。

### Step 3: Consider logical commits（考虑逻辑 commits）

在把所有内容一起 stage 前，扫描 changed files 是否存在自然 distinct concerns。如果 modified files 明显分成 separate logical changes（例如一个 directory 中的 refactor 和另一个中的 new feature，或 test files 与 source files 属于不同 change），为每组创建 separate commits。

保持 lightweight：
- 只在 **file level** 分组；不要使用 `git add -p`，也不要尝试拆分 file 内 hunks。
- 如果 separation obvious（different features、unrelated fixes），就 split。如果 ambiguous，一个 commit 就好。
- 两三个 logical commits 是 sweet spot。不要 over-slice 成许多 tiny commits。

### Step 4: Stage and commit（暂存并提交）

如果上方 context 中 current branch 是 `main`、`master` 或 Step 1 resolved default branch，commit 前自动创建 feature branch。从 change content derive branch name，用 `git checkout -b <branch-name>` 创建，运行 `git branch --show-current` 确认，并在 workflow 剩余部分使用 new branch 作为 current branch。不要询问是否 branch；在 default branch 上 commit 不是选项。

写 commit message：
- **Subject line**：Concise、imperative mood，关注 *why* 而不是 *what*。遵循 Step 2 确定的 convention。
- **Body**（需要时）：对 non-trivial changes 添加用 blank line 分隔的 body。说明 motivation、trade-offs 或 future reader 需要的任何内容。对 obvious single-purpose changes 省略 body。

对每个 commit group，在 single call 中 stage and commit。优先按文件名 staging specific files，而不是 `git add -A` 或 `git add .`，避免意外包含 sensitive files（.env、credentials）或 unrelated changes。使用 heredoc 保持 formatting：

```bash
git add file1 file2 file3 && git commit -m "$(cat <<'EOF'
type(scope): subject line here

Optional body explaining why this change was made,
not just what changed.
EOF
)"
```

### Step 5: Confirm（确认）

Commit 后运行 `git status` 验证成功。报告 commit hash(es) 和 subject line(s)。
