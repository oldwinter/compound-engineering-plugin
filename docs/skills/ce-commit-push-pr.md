# `ce-commit-push-pr`

> 从 working changes 到 open PR，并生成 adaptive、value-first description，深度随 change 缩放。也可重写现有 PR description，或只生成 description 而不触碰 git。

`ce-commit-push-pr` 是 **shipping** skill。三种 modes：full workflow、description update on existing PR、description-only generation，覆盖常见的 "I want to ship" 形态，而不会强迫你走不必要步骤。PR descriptions 会按 change complexity 自适应（不是 cookie-cutter templates），并覆盖 **full PR commit range**，不只是 invocation 时的 working-tree diff。

Skill 对几个曾经坑过 contributors 的具体点很 opinionated：绝不 `git add -A`，当存在自然不同 concerns 时拆成 separate commits，并通过 temp files 写 PR bodies（绝不通过 stdin pipes；它们可能静默产出 empty PR bodies，而 `gh` 仍 exit 0）。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-commit-push-pr` 是 `/ce-work` 的 Phase 4 handoff target：它生成带 summary、testing notes、evidence（behavior observable 时）和 operational validation section 的 PR。它也常在你已经写完 code、想 ship 时直接调用。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | Commit、push 并 open PR；或只重写 existing PR description；或只生成 description 而不触碰 git |
| 何时使用 | 想要 commits + PR；重写 existing PR description；为 branch 起草 description |
| 产出什么 | Open PR（返回 URL）；或 updated PR description；或打印 description 供你自己应用 |
| 下一步 | Review PR；ready 后 merge |

---

## 问题

从 "code written" 到 "PR open" 本应一步完成，但常以可预测方式失败：

- **Cookie-cutter PR descriptions** 不随 complexity 缩放：one-line bug fix 和 2,000-line refactor 得到同样 Summary / Test Plan / Notes 形状
- **`git add -A`** 会扫入 unintended files（`.env`、build artifacts、generated files）
- **Description 只覆盖 invocation 时的 working-tree diff**，漏掉已经 pushed 的 commits
- **Empty PR bodies via stdin pipes**：`--body-file -`、heredoc-to-stdin 或 `--body "$(cat ...)"` 可能静默产生 empty PR body，同时 `gh` 仍 exit 0 并返回 URL
- **Convention detection 错误**：即使 repo 有清晰 established style，也 fallback 到 default convention
- **Branch state surprises**：在 default branch commit、在 detached HEAD 创建 commits、push 到 stale base

## 方案

`ce-commit-push-pr` 明确处理这些问题：

- **Three-mode dispatch（三模式分发）**：full workflow / description update / description-only generation
- **Adaptive PR descriptions**：深度随 change 缩放；one-line fixes 得到 tight description，large refactors 得到应有结构
- **Smart commit splitting at file level**：自然 distinct concerns 变成 separate commits（最多 2-3 个），不使用 `git add -p`
- **Branch state decision tree**：明确处理 detached HEAD、default branch、unpushed commits、no upstream、existing PR cases
- **Body-file safety**：每个 PR description 写入 temp file，并通过 `--body-file <path>` 传递，绝不通过 stdin
- **Convention detection**：context 中的 repo conventions > recent commit history > conventional-commits default
- **Full PR commit-range resolution**：descriptions 覆盖 PR 中所有 commits，而不只是 working-tree diff

---

## 它的新意

### 1. Three-mode dispatch：选择真正想要的形状

Skill 会 upfront 检测 intent，并走匹配 path：

- **Full workflow**：commit pending work、push、open PR。是 "ship this" / "create a PR" / "commit push PR" 的默认模式。
- **Description update on existing PR**：refresh、rewrite 或 refocus existing PR description，不触碰 git state。
- **Description-only generation**：生成 PR description 并打印回来，不 commit、不 push、不 apply。由 "draft a PR description"、"describe this PR"，或单独粘贴 PR URL 触发。

当用户不想 commit/push/edit 时跳过这些步骤，符合人们实际表达的意思，而不是每次强行 full workflow。

### 2. Adaptive PR descriptions：随 change 缩放

PR descriptions 不是从 fixed template 渲染的。Composition step 会按 change 选择 structure 和 depth：

- Trivial typo fix 得到 one-line summary，不需要 test plan 或 notes section
- Medium feature 得到 summary + test plan + relevant context
- Large refactor 得到 summary、motivation、key decisions、test plan、evidence、operational notes 和 risks
- Composition 读取 **full PR commit range**（不只是 invocation 时 working-tree diff），所以 multi-commit PR 的 description 反映所有会 land 的 commits

### 3. File level 的 smart commit splitting

当 changes 触及自然不同 concerns（例如 backend models + frontend components + docs），skill 会创建 separate commits，通常最多 2-3 个，并按 file level grouping。不使用 `git add -p`（interactive hunk-level staging 可能把 hunks 跨 commits split，破坏 atomicity）。当 split ambiguous，一个 commit 就好。

### 4. Branch state decision tree（分支状态决策树）

每种怪 branch state 都有 explicit branch：

- Detached HEAD -> 询问是否创建 feature branch
- On default branch with unpushed commits -> 询问是否创建 feature branch
- On default branch、all pushed、no PR -> "no feature branch work" 并停止
- Feature branch、no upstream -> push 并继续
- Feature branch、all pushed、no open PR -> skip commit/push、生成 description、open PR
- Feature branch、all pushed、open PR -> 报告 up to date

没有 silent commits to default，没有 surprise re-pushes，没有 flow 中途才出现的 missing-upstream errors。

### 5. Body-file safety：避免 empty-PR-body 陷阱

每个 PR description 都写入 temporary file，使用 quoted heredoc sentinel，并通过 `gh ... --body-file "$BODY_FILE"` 传入。Skill 明确不使用 `--body-file -`、stdin pipes、heredoc-to-stdin 或 `--body "$(cat ...)"`；这些 wrappers 会静默产出 empty PR body，而 `gh` 仍 exit 0 并返回 URL。Quoted sentinel 防止 body 中的 `$VAR`、backticks 和 stray `EOF` markers 被展开。

### 6. 按优先级进行 convention detection

Commit messages 和 PR titles：context 中的 repo conventions 最优先；recent commit history 是下一个 signal；conventional commits 是 fallback default。使用 conventional commits 时，如果 `fix:` 和 `feat:` 都看起来合适，skill 默认 `fix:`（修复 broken 或 missing behavior 的 change 是 `fix:`，即使用新增代码实现；`feat:` 用于用户此前无法完成的 capability）。用户可以 override。

### 7. Evidence integration（证据集成）

当 change 有 observable behavior（UI rendering、CLI output、带 runnable example 的 API behavior、generated artifacts），skill 会询问是否 capture evidence；如果 yes，加载 `/ce-demo-reel` 捕获 GIF、terminal recording 或 screenshot，然后 splice 到 body 的 `## Demo` section。Categorical no-evidence cases（docs-only、markdown-only、changelog-only、CI/config-only、test-only 或 pure internal refactors）会直接 skip prompt。Agent judgment 也可对自己 authored 且确认 non-observable 的 changes skip prompt（internal plumbing、type-only changes 等）。

### 8. 重写 existing PR 前确认

当 skill 在有 open PR 的 branch 上运行，且你想 rewrite description 时，它会 preview：new Summary 前两句加 total body line count，并在 apply 前询问 confirmation。前两句承载 reviewer 大部分注意力。如果 decline，可以传入 focus text regenerate，不 apply 任何东西。

---

## 快速示例

你在 feature branch 上完成 notification-mute feature，调用 `/ce-commit-push-pr`。

Skill 检测到你在 meaningful-named feature branch 上、没有 upstream，并且有四个 uncommitted files，覆盖 database migration、model change、controller update 和 UI component。它从 recent commits 识别 repo convention（带 scope 的 conventional commits），并把工作拆成两个 commits（data layer；UI），按 file level grouping，不做 interactive hunk staging。然后用 `-u` push。

它 resolve PR commit range，读取所有 commits 的 diff（不只是 working-tree diff），并检测到 change 有 observable UI behavior。它询问是否 capture evidence；你说 yes；它加载 `/ce-demo-reel` 并获得 GIF。

Composition pass 产出 title（`feat(notifications): add per-type mute with TTL`）和 body，包含 summary、key decisions、test plan、demo GIF 和 operational validation section。它用 quoted heredoc sentinel 把 body 写入 temp file，并运行 `gh pr create --title ... --body-file ...`。

它返回 PR URL。

---

## 何时使用

在以下情况使用 `ce-commit-push-pr`：

- Code 已写好，想要 commits + PR
- 想重写 existing PR description（例如 merge `main` 后 original description stale）
- 需要 PR description draft，但还不想 commit 或 push
- 想要 adaptive description sizing，而不是 cookie-cutter template
- Changes 触及 distinct concerns，希望 smart commit splitting

以下情况跳过 `ce-commit-push-pr`：

- 只想 commit，不 push 或 PR：使用 `/ce-commit`
- 在 default branch 上且确实想在那里 commit：手动处理（此 skill 不会在没有 explicit feature-branch creation 的情况下 push to default）
- PR shape 特殊到需要 hand-crafted git work（interactive rebase、complex history rewrite）

---

## 作为 Workflow 的一部分使用

`ce-commit-push-pr` 是多个 skills 的 standard shipping handoff：

- **`/ce-work` Phase 4**：传递 plan summary、key decisions、testing notes、evidence context、operational validation 和任何 accepted Known Residuals
- **`/ce-debug` Phase 4**（skill-owned branch）：successful fix 后默认 commit-and-PR，不再 prompt；包含 issue tracker 的 auto-close syntax（例如 GitHub 的 `Fixes #N`、Linear 的 `Closes ABC-123`）
- **`/ce-compound`**：写入 learning doc 后，可 commit + push，并用新 commit 更新 open PR

---

## 单独使用

Skill 直接调用比作为 chain 一部分更常见：

- **Full ship**：在有 uncommitted 或 unpushed work 的 feature branch 上运行 `/ce-commit-push-pr`
- **Refresh existing PR description**：`/ce-commit-push-pr "update the PR description"` 或 `/ce-commit-push-pr "include the benchmarking results"`（会尊重 focus）
- **Draft description without applying**：`/ce-commit-push-pr "draft a PR description for this branch"` 打印 description 供你复制或手动 apply
- **Describe a different PR**：`/ce-commit-push-pr <PR URL>` resolve 该 PR 的 commit range

当 skill mode detection 选错 path，可用匹配 target mode 的明确 phrasing（例如 "just write the description, don't apply it"）。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 在 current branch 上运行 full workflow |
| `"draft a PR description"` / `"describe this PR"` | Description-only generation；打印回来，不 apply |
| `"update the PR description"` / `"refresh the PR description"` | 更新 existing PR description |
| `<PR URL or number>` | 对该 PR 操作（description-only 或 update，取决于 intent） |
| `"...<focus text>"` | 引导 description composition（例如 "include the benchmarking results"） |

---

## 常见问题

**为什么用 adaptive description，而不是 fixed template？**
Cookie-cutter templates 让 trivial PRs 显得 ceremonial，让 large PRs 显得 under-described。Adaptive composition 按 change 选择 structure 和 depth：one-line fix 得到 tight description；large refactor 得到应有结构。Description 匹配 change 时，reviewer 工作更轻松。

**为什么用 body-file，而不是 inline `--body`？**
Wrappers 和 stdin handling 可能静默产出 empty PR body，同时 `gh` 仍 exit 0 并返回 URL。Skill 把每个 body 写入 temp file，使用 quoted heredoc sentinel，并通过 `--body-file <path>` 传入。Quoted sentinel 防止 body 中的 `$VAR`、backticks 和 literal `EOF` markers 被展开。

**Description-only 和 description update 有什么区别？**
Description-only 生成 description 并打印回来，不触碰任何东西（不 `gh pr edit`、不 commit、不 push）。Description update 会找到 current branch 的 existing open PR，生成新 description，preview，询问 confirmation，然后通过 `gh pr edit` apply。

**支持不同 commit message conventions 吗？**
支持。`AGENTS.md`/`CLAUDE.md` 中的 repo conventions 优先；recent commit history 是下一个 signal；conventional commits 是 fallback default。使用 conventional commits 时，`fix:` vs `feat:` ambiguous 时默认 `fix:`。

**Commit signing 或 hooks 怎么办？**
Skill 尊重你的 git config 和 pre-commit hooks。它绝不会传 `--no-verify`、`--no-gpg-sign` 或类似 flags 来跳过它们。如果 hook fails，skill 会 investigate 并 surface underlying issue。

**能创建 draft PR 吗？**
使用 description-only mode 生成 body，然后自己用 `gh pr create --draft --title "..." --body-file "..."` apply。Full workflow 目前没有暴露 draft flag。

---

## 另见

- [`ce-work`](./ce-work.md) - Phase 4 handoff target（Phase 4 交接目标）；standard upstream caller
- [`ce-debug`](./ce-debug.md) - skill-owned branch 上 successful fix（成功修复）后调用此 skill
- [`ce-commit`](./ce-commit.md) - local-commit-only sibling；不想 push 或 open PR 时使用
- [`ce-demo-reel`](./ce-demo-reel.md) - behavior observable 时用于 evidence capture
- [`ce-compound`](./ce-compound.md) - 捕获 reusable learning；可 chain 回此 skill push learning doc
