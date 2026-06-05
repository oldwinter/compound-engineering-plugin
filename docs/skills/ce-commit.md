# `ce-commit`

> 从 working tree changes 创建一个精心组织的 git commit：遵循 convention、避开 sensitive files，并在 concerns 明确不同时做 logical splitting。

`ce-commit` 是 **commit-only** skill，是 `/ce-commit-push-pr` 的 sibling，用于你只想要 commits、不想 push 或打开 PR 的情况。它会读取 repo 的既有 commit conventions（先看 project instructions，再看 recent commit history，最后 fallback 到 conventional-commits），按自然不同的 concerns 对 changed files 分组（不使用 `git add -p`，只在 file level 操作），并避免 `git add -A` / `git add .`，防止 sensitive files（`.env`、credentials、build artifacts）混入。

完整 shipping flow（commit + push + PR）请使用 `/ce-commit-push-pr`。只需要 commit 时，用这个 skill。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 从 working tree 创建一两个 well-formed commits，遵循 repo conventions，并显式 stage files |
| 何时使用？ | "Commit this"、"save my changes"；想要 commits 但不 push、不 PR 时 |
| 产出什么？ | 当前 branch 上的一两个 commits（不 push，不 PR） |
| 下一步 | 之后如需打开 PR，可用 `/ce-commit-push-pr`；否则手动 `git push` |

---

## 问题

手动 commits 常以可预测方式出错：

- **`git add -A` / `git add .`** 会扫入 unintended files：`.env` files、build artifacts、generated files、untracked notes
- **错误的 commit convention**：repo 用 ticket-prefix style，却默认 conventional commits，或反过来
- **混合 distinct concerns**：backend models + frontend components + docs 全塞进一个 commit，只因为没人拆
- **Subject lines 只描述改了什么，不说明为什么**：`update foo.rb` 对未来读者没有帮助
- **Detached-HEAD commits**：用户没意识到之后会很难找回
- **Default-branch commits**：在 `main` 上 commit 前没有 warning，造成 surprise

## 解决方案

`ce-commit` 把 commit creation 作为 structured pass：

- **Convention detection**：先看 context 中的 repo conventions，再看最近 10 个 commits，最后 fallback 到 conventional-commits
- **Explicit staging**：绝不 `git add -A`/`git add .`；按文件名 stage
- **File level logical splitting**：当存在 2-3 个 distinct concerns 时拆 commit（不 `git add -p`）；ambiguous 时一个 commit 即可
- **Detached-HEAD handling**：commit 前询问是否先创建 feature branch
- **Default-branch warning**：在 `main`/`master` 上 commit 前先询问
- **Heredoc commit messages**：保留 multi-line formatting，避免 shell escaping pain

---

## 新颖之处

### 1. 按优先级检测 convention

对于 commit message format，skill 按优先级读取来源：

1. **Context 中的 repo conventions**：session start 已加载的 project instructions（`AGENTS.md`、`CLAUDE.md`）；如果指定 convention，就遵守它
2. **Recent commit history**：检查最近 10 个 commits；如果出现清晰 pattern（conventional commits、ticket prefixes、emoji prefixes），就匹配它
3. **默认 conventional commits**：`type(scope): description`，types 包括 `feat`、`fix`、`docs`、`refactor`、`test`、`chore`、`perf`、`ci`、`style`、`build`

使用 conventional commits 时，如果 `fix:` 和 `feat:` 都看起来合适，skill 默认 `fix:`（修复 broken 或 missing behavior 的 change 是 `fix:`，即使用新增代码实现）。用户可以 override。

### 2. Explicit staging：不用 `git add -A`

Skill 在单条命令中按文件名 stage（`git add file1 file2 file3`）。这避免意外包含：

- 带 credentials 的 `.env` files
- Build artifacts（build artifacts，构建产物，`dist/`、`.next/`、compiled binaries）
- Generated files（生成文件）
- Untracked directories 中的 notes 或 scratch files

这种刻意规避写在 skill 中：`git add -A` 和 `git add .` 被明确标为错误动作。

### 3. File-level logical splitting（file-level 逻辑拆分）

Stage 前，skill 会扫描 changed files，寻找自然不同的 concerns。如果文件明显分成 2-3 个 logical changes（一个 directory 的 refactor，另一个 directory 的 new feature；或 test files 属于与 source files 不同的 change），skill 会创建 separate commits。Splits 只发生在 **file level**：不 `git add -p`，不做 hunk-level interactive splitting。拆分 ambiguous 时，一个 commit 就好。甜点区间是 2-3 个 commits，而不是很多 tiny commits。

### 4. Detached-HEAD handling（detached HEAD 处理）

如果当前 branch 为空（detached HEAD），skill 会解释状况，并询问是否先创建 feature branch。用户可以：

- 创建 branch（skill 根据 change content 推导 name）
- 继续 detached-HEAD commit（很少是正确答案）

### 5. Default-branch warning（default branch 警告）

如果当前 branch 是 `main`、`master` 或 resolved default branch，skill 会在 commit 前 warning，并提供先创建 feature branch 的选项。这能避免有人意外 commit 到有 branch protection 的 default branch，随后还要回退。

### 6. Heredoc commit messages：干净的 multi-line formatting

Skill 使用 `cat <<'EOF'` heredoc 生成 commit message，确保 multi-line bodies 保留格式。示例：

```bash
git add file1 file2 file3 && git commit -m "$(cat <<'EOF'
type(scope): subject line here

Optional body explaining why this change was made,
not just what changed.
EOF
)"
```

Quoted sentinel（`'EOF'`）防止 `$VAR`、backticks 和嵌入的 `EOF` 在 body 中被展开。

### 7. Subject 关注 *why*，不只是 *what*

Skill 用 imperative mood 写 subject line，关注 motivation，而不是机械描述。"Fix double-submit on checkout" 比 "Update checkout.rb" 更好。Body 说明未来读者需要的 motivation、trade-offs 或 context；显而易见的 single-purpose changes 则省略 body。

---

## 快速示例

你完成了一个 feature，触及 backend models、controller 和 frontend component。你调用 `/ce-commit`。

Skill 读取 git status：4 个 files modified，分布在 `app/models/`、`app/controllers/` 和 `app/javascript/`。读取 recent commits 后发现 project 使用带 scope 的 conventional commits（`feat(auth): ...`、`fix(billing): ...`）。当前在 feature branch `tmchow/notification-mute`，不是 default branch。

Skill 扫描 changed files 的 distinct concerns：model + controller 属于同一组（data layer）；JS component 是自己的 concern（UI）。于是创建两个 logical commits。

Commit 1：stage `app/models/notification_subscription.rb`、`app/controllers/settings_controller.rb`。Message（message，提交信息）：

```text
feat(notifications): add per-subscription mute_until column

Subscriptions can now carry a mute timestamp; nil means not muted.
Controller exposes the toggle endpoint.
```

Commit 2：stage `app/javascript/controllers/notification_toggle_controller.js`。Message（message，提交信息）：

```text
feat(notifications): wire toggle UI to mute endpoint
```

最后报告两个 commit hashes 和 subject lines。

---

## 何时使用

在以下情况使用 `ce-commit`：

- 有 changes 要 commit，且只想放在 local branch 上：不 push、不 PR
- 在流程中途 commit，计划之后再 push
- 想要遵循 repo convention 的 commit messages
- 想避免 `git add -A`，并让 logical splitting 被处理

以下情况跳过 `ce-commit`：

- 还想 push 并打开 PR -> `/ce-commit-push-pr` 会全做
- 需要非常具体的 hunk-level splitting -> 直接使用 `git add -p`；此 skill 是 file-level
- Change 简单到 agent 可以一口气跑 `git add` + `git commit`，不过即使 tiny changes 也会受益于 convention detection

---

## 作为工作流的一部分使用

`ce-commit` 会被明确需要 commit-only flow 的 skills 调用：

- **`/ce-debug` Phase 4**：当 skill 在 pre-existing branch（非 skill-owned）上，且用户选择 "Commit the fix" 而不是 "Commit and PR" 时，由 `ce-commit` 处理 local commit
- **`/ce-work` Phase 4（no-PR path）**：当用户偏好 commit 而不 push 时，`ce-commit` 是 alternate handoff
- Standalone：通过 `/ce-commit`

完整 shipping flow（commit + push + PR）是 `/ce-commit-push-pr`；此 skill 是 local-only sibling。

---

## 单独使用

无参数直接调用；skill 读取 git context 并继续：

- `/ce-commit`：按 repo conventions commit 当前 changes
- 用户在对话中描述要 commit 什么（"commit the auth changes"）；skill 把它作为 grouping 或 message composition 的 hint

没有 arguments。Convention detection、file grouping 和 message composition 都从 context 中完成。

---

## 参考

| Step | Action |
|------|--------|
| 1 | Gather context（git status、diff、branch、recent commits、default branch） |
| 2 | Determine commit message convention（instructions > recent history > conventional-commits） |
| 3 | Consider logical commits（concerns 明显不同时 file-level split） |
| 4 | Stage and commit（per-group；default branch warning；detached HEAD handling） |
| 5 | 通过 `git status` 确认；报告 commit hashes |

---

## 常见问题（FAQ）

**为什么不用 `git add -A`？**
因为它会扫入 unintended files：带 credentials 的 `.env`、build artifacts、generated files。按文件名 explicit staging 能保持 commits 干净，并防止 secret leakage。

**为什么不做 hunk-level splitting？**
因为 hunk-level splitting（`git add -p`）在 agent flows 中 interactive 且脆弱。File-level splitting 是 "logical commits" 的合适粒度：distinct concerns 通常自然分离在 file level。如果你确实需要 hunk-level，请手动完成。

**如果我的 repo 使用 non-standard convention 怎么办？**
Skill 先从 project instructions 检测（这是记录 conventions 的正确位置），再看 recent commit history（即使没有文档，它也是事实上的 convention）。Conventional commits 只是两者都不适用时的 fallback。

**为什么在 default branch 上 commit 前要询问？**
因为大多数带 branch protection 的 repos 会拒绝 default-branch commit，而且用户通常不想在那里 commit。Warning 会在不可逆操作前拦住这种情况。

**如果之后我想 push 和 PR 怎么办？**
使用 `/ce-commit-push-pr` 走完整 flow，或在此 skill commit 后手动运行 `git push` 和 `gh pr create`。

---

## 另见（See Also）

- [`/ce-commit-push-pr`](./ce-commit-push-pr.md) - full flow（完整 flow）：commit + push + PR
- [`/ce-debug`](./ce-debug.md) - commit-only handoff path 的 Phase 4 会调用此 skill
- [`/ce-work`](./ce-work.md) - 用户选择 no-PR 时，Phase 4 会调用此 skill
