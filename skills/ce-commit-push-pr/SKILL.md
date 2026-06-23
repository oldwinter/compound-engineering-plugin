---
name: ce-commit-push-pr
description: Commit、push 并 open PR，生成 adaptive、value-first description，深度随 change 缩放。当用户说 "commit and PR"、"ship this"、"create a PR" 或 "open a pull request" 时使用。也处理 description-only flows（"write a PR description"、"rewrite the PR body"、"describe this PR"），不 commit 或 push。
---

# Git Commit、Push 和 PR

**Asking the user（询问用户）：** 当此 skill 说 "ask the user" 时，使用平台 blocking question tool：Claude Code 中用 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 搭配 `select:AskUserQuestion`）、Codex 中用 `request_user_input`、Antigravity 中用 `ask_question`、Pi 中用 `ask_user`（需要 `pi-ask-user` extension）。只有 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到在 chat 中展示 question；不要因为需要 schema load 就 fallback。绝不要 silently skip 该问题。

## Mode（模式）

- **Description-only（仅 description）** — 用户只想要 description（"write/draft a PR description"、"describe this PR"，或单独粘贴 PR URL/number）。只运行 Step 4；打印结果。只有用户要求时才 apply。如果粘贴了 PR ref，传给 Step 4，让 Pre-A resolve 正确 range。
- **Description update（更新 description）** — 用户想 refresh/rewrite existing PR description，但没有 commit/push intent。如果没有 open PR，报告并停止。否则运行 Step 4（使用 existing PR URL 的 PR mode），再运行 Step 5 preview、confirm，并通过 `gh pr edit` apply。
- **Full workflow（完整 workflow）** — 其他情况。按顺序运行 Steps 1-5。

## Context（上下文）

**在 Claude Code 以外的平台上**，运行下方 Context fallback。**在 Claude Code 中**，labeled sections 包含 pre-populated data；直接使用它们。

**Git status（Git 状态）:**
!`git status`

**Working tree diff（工作区 diff）:**
!`git diff HEAD`

**Current branch（当前分支）:**
!`git branch --show-current`

**Recent commits（最近 commits）:**
!`git log --oneline -10`

**Remote default branch（远端默认分支）:**
!`git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo 'DEFAULT_BRANCH_UNRESOLVED'`

**Existing PR check（现有 PR 检查）:**
!`gh pr view --json url,title,state 2>/dev/null || echo 'NO_OPEN_PR'`

### Context fallback（上下文 fallback）

```bash
printf '=== STATUS ===\n'; git status; printf '\n=== DIFF ===\n'; git diff HEAD; printf '\n=== BRANCH ===\n'; git branch --show-current; printf '\n=== LOG ===\n'; git log --oneline -10; printf '\n=== DEFAULT_BRANCH ===\n'; git rev-parse --abbrev-ref origin/HEAD 2>/dev/null || echo 'DEFAULT_BRANCH_UNRESOLVED'; printf '\n=== PR_CHECK ===\n'; gh pr view --json url,title,state 2>/dev/null || echo 'NO_OPEN_PR'
```

---

## Step 1：Resolve branch and PR state（解析分支和 PR 状态）

Remote default branch 返回类似 `origin/main`；去掉 `origin/` prefix。如果返回 `DEFAULT_BRANCH_UNRESOLVED` 或裸 `HEAD`，尝试 `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`。如果两者都失败，fallback 到 `main`。

Branch routing（分支路由）：

- **Detached HEAD（分离 HEAD）** — 解释需要 branch，并询问是否创建 feature branch。如果 yes，从 change content derive name。如果 no，停止。
- **On default branch with work to do（在 default branch 且有 work 要处理）**（uncommitted、unpushed 或 no upstream）— 自动创建 feature branch（不支持直接 push default）。从 change content derive name，并继续 Step 3；Step 3 会安全处理 branch creation。不要询问是否 branch；在 default branch 上 commit 不是选项。
- **On default branch with no work（在 default branch 且没有 work）** — 报告没有 feature branch work 并停止。
- **Feature branch（feature branch）** — 继续。

如果 PR check 中 `state: OPEN`，记录 existing PR URL。Step 5 使用它在 new-PR 和 existing-PR application 之间 route。

## Step 2：Determine conventions（确定约定）

匹配 repo style 的 commit messages 和 PR titles（context 中 project instructions > recent commits > conventional commits default）。使用 conventional commits 时，ambiguous 时默认 `fix:` 而不是 `feat:`；添加 code 来修复 broken 或 missing behavior 是 `fix:`。`feat:` 保留给用户此前无法完成的 capabilities。用户可 override。

## Step 3：Commit and push（提交并推送）

如果在 default branch 上，branch creation 需要处理 stale local `<base>`、local `<base>` 上的 unpushed commits，以及与 fresh remote base 冲突的 uncommitted changes。继续前读取 `references/branch-creation.md` 并遵循其 decision flow。

扫描 changed files 中的 naturally distinct concerns。如果它们明显分成 separate logical changes，创建 separate commits（最多 2-3 个）。只在 file level 分组；不使用 `git add -p`。Ambiguous 时一个 commit 就好。

Stage 并 commit 每个 group。**避免 `git add -A` 和 `git add .`**；它们会扫入 `.env`、build artifacts 和 generated files：

```bash
git add file1 file2 file3 && git commit -m "$(cat <<'EOF'
commit message here
EOF
)"
```

Then push（然后推送）:

```bash
git push -u origin HEAD
```

如果 working tree clean 且所有 commits 已 pushed，此 step 是 no-op。

## Step 4：Compose the PR title and body（撰写 PR 标题和正文）

**你 MUST 完整阅读 `references/pr-description-writing.md`**；顶部 core principle 支配每一步。它从此 skill 唯一需要的 input 是 PR ref（如果 mode dispatch 识别出一个：description-only 粘贴 URL，或 description update）。

Composition 前做 **Evidence decision**。先两个 short-circuits，再完整 decision：

1. **User explicitly asked for evidence**（"ship with a demo"、"include a screenshot"）— 直接 proceed to capture。如果 capture impossible 或明显无用，简要 note 并继续 without。
2. **Agent judgment on authored changes** — 如果 commits 是你 authored，且你知道 change non-observable（internal plumbing、type-only、无 user-facing effect 的 backend refactor、docs/markdown/changelog/CI/test-only、pure refactors），不询问，直接 skip prompt。

否则，如果 branch diff 改变 observable behavior（UI、CLI output、带 runnable code 的 API behavior、generated artifacts、workflow output），且 evidence 未被 blocked（unavailable credentials、paid services、deploy-only infrastructure、hardware），询问："This PR has observable behavior. Capture evidence for the PR description?"

- **Capture now** — 用 branch diff 中的 target description 加载 `ce-demo-reel`。它返回 `Tier`、`Description`、`URL`、`Path`。`URL`/`Path` 中恰好一个包含真实 value；另一个是 `"none"`。如果是 `URL`，splice 为 `## Demo` section。如果是 `Path`（用户选择 local save），在 body 中 note 已录制 demo 但未 embedded。若 skipped，继续 without evidence。
- **Use existing evidence** — 询问 URL 或 markdown embed；splice 为 `## Demo` section。
- **Skip** — 继续，不加 evidence section。

然后继续 reference 其余部分（Steps A through G），compose title 和 body。

## Step 5：Apply and report（应用并报告）

**Description-only mode** — 打印 title 和 body。除非用户要求 apply，否则停止。

**New PR**（full workflow，Step 1 没有 existing PR）— 按下方 "Applying via gh" 使用 `gh pr create` apply。报告 URL。

**Existing PR**（full workflow，Step 1 找到）— Step 3 的 new commits 已在 PR 上。报告 PR URL，然后询问是否 rewrite description。

- **No（否）** — done。
- **Yes** — 如果尚未运行 Step 4，则运行；然后 preview and apply（见下）。

**Description update mode，或 existing-PR rewrite confirmed** — apply 前 preview。询问："New title: `<title>` (`<N>` chars). Summary leads with: `<first two sentences>`. Total body: `<L>` lines. Apply?" 如果 declined，用户可传回 focus text 以 regenerate；不要 apply。如果 confirmed，按下方 "Applying via gh" 使用 `gh pr edit` apply，并报告 URL。

---

## Applying via gh（通过 gh 应用）

Body **must** 写入 temp file，并通过 `--body-file <path>` 传递。绝不要使用 `--body-file -`、stdin pipes、heredoc-to-stdin 或 `--body "$(cat ...)"`；wrappers 和 stdin handling 可能静默产生 empty PR body，同时 `gh` 仍 exit 0 并返回 URL。

```bash
BODY_FILE=$(mktemp "${TMPDIR:-/tmp}/ce-pr-body.XXXXXX") && cat > "$BODY_FILE" <<'__CE_PR_BODY_END__'
<the composed body markdown goes here, verbatim>
__CE_PR_BODY_END__
```

Quoted sentinel 防止 body 内的 `$VAR`、backticks 和任何 literal `EOF` 被展开。

对于 `<TITLE>`：verbatim substitute。如果包含 `"`、`` ` ``、`$` 或 `\`，escape 它们或改用 single quotes。

```bash
gh pr create --title "<TITLE>" --body-file "$BODY_FILE"   # new PR
gh pr edit   --title "<TITLE>" --body-file "$BODY_FILE"   # existing PR
```
