# `ce-worktree`

> 确保工作在 isolated git worktree 中进行，同时不扰动当前 checkout：先检测 existing isolation，优先交给 harness native worktree tool，最后才 fallback 到 plain git。

`ce-worktree` 是 **isolation guardrail** skill。它的价值是 judgment，不是 mechanics：多数 coding harness 现在会在 session start 时默认创建 worktree，所以常见情况是你*已经*被隔离。这个 skill 编码了必要纪律：识别这种状态，优先 defer 给 harness 自己的 worktree tooling，仅在最后才用 plain git 创建 worktree，从而避免 nested worktrees 或创建 harness 无法管理的 state。

它是 pure prose + inline git，**没有 bundled script**，所以能在所有 targets（Claude Code、Codex、Gemini、OpenCode、Pi、Kiro）上原样工作。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 确保 isolation 存在。先检测 existing worktree，优先使用 harness native worktree tool，最后 fallback 到 `.worktrees/<branch>` 下的 `git worktree add` |
| 何时使用？ | 开始一项应该和当前 checkout 隔离的工作；或 `ce-work` / `ce-code-review` 提供 worktree option 时 |
| 产出什么？ | 要么报告 "you are already isolated, work in place"，要么创建新的 isolated worktree |
| 何时跳过？ | 单个 task 放在当前 checkout 的 branch 中就足够 |

---

## 调用示例

```text
# 在 isolation 中开始新工作；会先检测现有 isolation
/ce-worktree for the account-notifications feature

# 隔离现有 branch，而不是创建新 branch
/ce-worktree isolate feature/account-notifications

# 隔离 pull request，且不扰动当前 checkout
/ce-worktree isolate PR 1234
```

如果当前 checkout 已经是 isolated worktree，所有调用形式都会原地工作，不再嵌套另一个 worktree。

---

## 问题

要求 agent "make a worktree" 越来越常常是*错误默认值*，因为 agent 通常已经在 worktree 里：

- **Worktree-from-worktree**：从 linked worktree 内创建 worktree 时，新 worktree 会相对 *main* clone resolve，落在用户并不正在工作的另一个 directory tree 里。
- **Phantom state**：偷偷执行的 `git worktree add` 对拥有 worktree lifecycle 的 harness（Orca、Cursor 等）不可见；它无法 list、navigate 或 cleanup。
- **Committed worktree contents**：如果 `.worktrees/` 没有 gitignore，worktree 会污染 `git status`，并有被 commit 的风险。
- **Cryptic branch names**：`worktree-jolly-beaming-raven` 这类 auto-generated names 会掩盖 worktree 的真实用途。

## 方案

`ce-worktree` 把 isolation 作为 ordered decision 运行，而不是 creation script：

1. **Detect existing isolation**（比较 `--git-dir` 和 `--git-common-dir`，并带 submodule guard）。如果已经 isolated，就报告并原地工作。
2. **Prefer the harness's native worktree tool**（例如 `EnterWorktree` tool、`/worktree` command、`--worktree` flag），让 worktree 保持被 harness 管理。
3. **Inline git fallback** 只在前两者都不适用时运行：先确认 `.worktrees` 已 gitignored，再用 meaningful branch name 创建 `.worktrees/<branch>`。

---

## 新颖之处

### 1. Detection before creation

最重要的行为：创建任何东西之前，先判断当前 directory 是否已经是 linked worktree。`git rev-parse --git-dir` 和 `--git-common-dir` 在 linked worktrees 与 submodules 中都会不同，因此还要用 `git rev-parse --show-superproject-working-tree` submodule guard 消歧。已经 isolated 时，skill 会原地工作，而不是 nesting。

### 2. Native-tool deference

如果 harness 提供 worktree primitive，skill 会使用它，而不是 shell out 到 git。这样避免创建 harness 看不到、也无法 cleanup 的 phantom worktrees，也就是 "don't fight the harness" rule。

### 3. Portable by construction

没有 bundled script，也不依赖 `${CLAUDE_SKILL_DIR}`，只有 agent 从 project directory 运行的 inline git。这就是该 skill 在每个 target 上 resolve 一致、也不需要 `ce_platforms` gate 的原因。

### 4. Gitignore safety before creation

运行 git fallback 时，skill 会先验证 `.worktrees` 已被 gitignored（`git check-ignore`），再创建 worktree，确保其 contents 不会被 commit。

### 5. Naming guidance for upstream callers

当 `ce-work` 或 `ce-code-review` 调用该 skill 时，它们会传入从工作内容 derive 的 meaningful branch name（`feat/crowd-sniff`、`fix/email-validation`），绝不会使用 opaque auto-generated name。

---

## 快速示例

你位于 Orca-managed worktree 中（harness 在 session start 时已创建），并要求 `ce-work` isolate the work。Skill 运行 Step 0：`--git-dir` 和 `--git-common-dir` 不同，submodule guard 返回 empty -> **you are already isolated**。它报告 worktree path 和 current branch，然后原地继续；不会创建第二个 worktree，也不会产生 phantom state。

在没有 native worktree tool 的 plain terminal checkout 中，同样的 invocation 会进入 Step 2：确认 `.worktrees` 已 gitignored，fetch base branch，运行 `git worktree add -b feat/login .worktrees/feat/login origin/main`，然后 `cd` 进去。

---

## 何时使用

在以下情况使用 `ce-worktree`：

- 你要开始一项应当和当前 checkout 隔离的工作
- 某个 skill（`ce-work`、`ce-code-review`）提供 worktree 作为 option

以下情况跳过：

- Work 是 single-task，放在当前 checkout 的 branch 中即可
- 你已经 isolated，且不需要第二个 parallel workspace（skill 会替你检测）

---

## 作为 Workflow 的一部分使用

`ce-worktree` 会被 chain skills 作为 isolation step 调用：

- **`/ce-work`**：开始工作时，用户可选择 worktree isolation，而不是在当前 checkout 中 branch
- **`/ce-code-review`**：并发 review PR，且不扰动 in-progress work

Upstream callers 会传 meaningful branch names；skill 期望 `feat/...`、`fix/...`、`refactor/...` 形状，而不是 auto-generated random names。

---

## Other worktree operations（其他 worktree 操作）

List、remove 和 switch 直接使用 `git`；该 skill 不提供 wrapper：

```bash
git worktree list                          # list worktrees
git worktree remove .worktrees/<branch>    # remove a worktree
cd .worktrees/<branch>                     # switch to a worktree
cd "$(git rev-parse --show-toplevel)"      # return to the current checkout root
```

---

## FAQ

**为什么用 skill，而不是直接 `git worktree add`？**
价值不在 `git worktree add` 命令本身，agent 已经知道它。价值在 *judgment*：检测你很可能已经 isolated，defer 给 harness worktree tooling，并避免 nesting 或创建 phantom state。这套纪律由 `ce-work` 和 `ce-code-review` 共享，所以放在一个 named skill 中，而不是到处复制并 drift。

**我已经在 worktree 里了，它还会再建一个吗？**
不会。Step 0 会检测 existing isolation 并原地工作。Worktree-from-worktree 正是该 skill 要防止的 failure mode。

**如何清理 worktree？**
运行 `cd "$(git rev-parse --show-toplevel)"` 离开它，然后运行 `git worktree remove .worktrees/<branch>`。当 remote tracking branch 已消失时，用 `git branch --merged` 和 `git fetch --prune` 辅助清理 stale branches。

---

## 另见（See Also）

- [`/ce-work`](./ce-work.md) - 将此 skill 作为 isolation option 提供
- [`/ce-code-review`](./ce-code-review.md) - 为 concurrent review 提供 worktree isolation
