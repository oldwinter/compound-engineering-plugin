# `ce-worktree`

> 在 `.worktrees/<branch>` 下创建 git worktree，并补上 `git worktree add` 本身不会处理的 branch-specific setup：`.env` copying、带 branch-aware safety 的 dev-tool trust、gitignore management。

`ce-worktree` 是 **isolated-checkout** skill。普通 `git worktree add` 会创建 worktree，但跳过大多数项目需要的 per-checkout setup：`.env` files 不会跟过去，`mise`/`direnv` configs 未 trust（hooks 会卡在 prompts），`.worktrees/` 不会被 gitignore。此 skill 会处理这些，同时用 safety rules 防止对用户尚未看过的 untrusted PR-review branch 自动 trust `.envrc` content。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 创建 `.worktrees/<branch>`，从 main repo 复制 `.env*`，按安全规则 trust `mise`/`direnv` configs，并把 `.worktrees` 加入 `.gitignore` |
| 何时使用 | Review PR 且保持 main checkout 空闲；并行运行多个 features；保持 default branch 干净 |
| 产出什么 | 位于 `.worktrees/<branch-name>`、可直接 `cd` 进入的 worktree |
| 何时跳过 | 单个 task 放在 main checkout 的 branch 中就足够 |

---

## 问题

普通 `git worktree add` 会给你一个技术上 checked out、实际却可能 broken 的 working tree：

- **`.env*` files 不会跟随**：新 worktree 没有 `.env`，dev servers 会失败或 fallback 到 fragile defaults
- **`mise`/`direnv` configs 未 trust**：每次 `cd` 进 worktree 都会被 trust prompt 阻塞，拖慢 agent flows
- **Review branches 上危险的 `.envrc` auto-trust**：在 PR-review worktree 上 naïvely 运行 `direnv allow`，等于 trust contributor 放进 `.envrc` 的任意内容；`.envrc` 可以 source direnv 不验证的 files
- **`.worktrees/` 不在 `.gitignore`**：main checkout 中每次 `git status` 都会显示 worktree directory 是 untracked
- **Main checkout 被扰动**：`git worktree add origin/<branch>` 可能以用户不预期的方式改变 main checkout state
- **Cryptic auto-generated branch names**（例如 `worktree-jolly-beaming-raven`）会掩盖 worktree 的真实用途

## 方案

`ce-worktree` 以 structured pass 创建 worktree：

- 在 `.worktrees/<branch>` 创建 worktree（consistent location，绝不 random）
- 复制 `.env`、`.env.local`、`.env.test` 等（跳过 `.env.example`）
- 用 branch-aware safety rules trust `mise`/`direnv` configs：modified configs 永不 auto-trust，PR-review branches 上永不 `direnv allow`
- 如果 `.worktrees` 尚未在 `.gitignore`，添加它
- Fetch `from-branch`，而不是 check it out；main repo 保持不受扰动
- 为 upstream callers 提供清晰 naming guidance（`feat/crowd-sniff`、`fix/email-validation`，绝不 random）

---

## 它的新意

### 1. Branch-aware dev-tool trust（分支感知的 dev-tool trust）

`mise`/`direnv` 的 trust 按 base branch 分开：

| Base branch（基准分支） | Behavior（行为） |
|-------------|----------|
| **Trusted base**（`main`、`develop`、`dev`、`trunk`、`staging`、`release/*`） | Configs 与该 branch 比较；unchanged configs auto-trusted；允许 `direnv allow` |
| **Other branches**（feature、PR review） | Configs 与 default branch 比较；无论如何跳过 `direnv allow`，因为 `.envrc` 可以 source direnv 不验证的 files |

这个 split 存在是因为 review branches 经常包含外部 contributors 的 code。Auto-trusting 他们的 `.envrc` 与 auto-running 他们的 setup script 是同形错误；你不会这么做，所以 skill 也不会。

**Modified configs 永远不 auto-trusted。** 当 config 与 base 不同时，skill 会打印 manual trust command，并等待用户先 review diff。

### 2. `.env*` propagation，跳过 `.env.example`

大多数 projects 需要 `.env`、`.env.local`、`.env.test` 等文件才能在 worktree 中运行。Skill 会从 main repo 复制所有 `.env*` files，**但跳过 `.env.example`**（它是 committed template，不是用户 local secrets）。创建后，worktree 可以运行依赖 env state 的 dev servers、tests 或 scripts，无需手动 setup。

### 3. 不扰动 main checkout

`git worktree add` 搭配 remote ref 时，行为取决于 local branch 是否存在。Plain usage 可能意外在 main repo 中 check out 某些内容，或以 confusing error 失败。此 skill 会 **fetch** `from-branch`，而不是 check it out；new worktree 从 remote ref 创建，main checkout 保持原样。

### 4. Consistent location（一致位置）：`.worktrees/<branch>`

Worktrees 固定放到 `.worktrees/<branch>`，没有例外。这样对 `cd` shortcuts、cleanup，以及扫描 worktrees 的 tooling 都 predictable。带 slash 的 branch names（`feat/login`）会变成 directory paths（`.worktrees/feat/login`），所有主要 filesystems 都支持。

### 5. Auto-`.gitignore` for `.worktrees`（自动为 `.worktrees` 更新 `.gitignore`）

如果 `.worktrees` 尚未在 `.gitignore`，skill 会添加它。否则，从 main checkout 运行每次 `git status` 都会把 worktree directory 显示成 noisy untracked entry。添加后，该 directory 对 main checkout 的 git operations 不可见。

### 6. 给 upstream callers 的 naming guidance

当 `/ce-work` 或 `/ce-code-review` 调用此 skill，它们会传入从 work description 派生的 meaningful branch name（`feat/crowd-sniff`、`fix/email-validation`）。Skill 明确不鼓励 auto-generated cryptic names；它们会掩盖 worktree 用途，让后续 cleanup 更难。

### 7. 不包装 read/list/remove：直接用 `git`

其他 worktree operations（list、remove、switch）不提供 wrapper。Skill 明确告诉你直接使用 `git worktree list`、`git worktree remove .worktrees/<branch>`、`cd .worktrees/<branch>`、`cd "$(git rev-parse --show-toplevel)"`。包装 bare git commands 没有价值，还会增加 maintenance burden；skill 聚焦于 setup matters 的部分。

---

## 快速示例

你要开始 notification-mute feature，希望它与 main checkout 隔离（main checkout 中还有另一个 feature 进行中）。调用 `/ce-worktree feat/notification-mute`。

Skill 运行 `bash scripts/worktree-manager.sh create feat/notification-mute`。Defaults：`from-branch` 是 `origin/main`。它从 fetched `origin/main` 创建 `.worktrees/feat/notification-mute`。复制 `.env`、`.env.local`、`.env.test`。检测到 `.mise.toml` 与 `main` 匹配；因为 base branch 是 `main` 且 config unchanged，所以 auto-trust。`.worktrees` 已在 `.gitignore`，无需 edit。

Output（输出）：

```text
Worktree created: .worktrees/feat/notification-mute
Copied .env files: .env, .env.local, .env.test
Trusted .mise.toml (matches main, auto-trust permitted)

Switch with: cd .worktrees/feat/notification-mute
```

你 `cd .worktrees/feat/notification-mute`，运行 `bin/dev`，开始工作：无需 env setup，无 trust prompts，也不会扰动 main checkout 中的另一个 feature。

---

## 何时使用

在以下情况使用 `ce-worktree`：

- 正在 review PR，并希望 main checkout 可继续其他工作
- 并行运行多个 features，不想通过 `git checkout` context-switch
- 希望 default branch 没有 in-progress state
- 某个 skill（`ce-work`、`ce-code-review`）提供 worktree 作为 option

以下情况跳过 `ce-worktree`：

- Work 是 single-task，放在 main checkout 的 branch 中即可；worktree overhead 超过收益
- 已经在 worktree 中；nested worktrees 不是此 skill 设计目标
- Repo 没有 `.env` files 或 dev-tool configs；普通 `git worktree add` 足够

---

## 作为 Workflow 的一部分使用

`ce-worktree` 是 chain skills 的 parallel-isolation option：

- **`/ce-work` Phase 1.2**：开始工作时，用户可选择 worktree（parallel features 推荐）而不是在 main checkout 中 branch
- **`/ce-code-review`**：用于在 separate checkout 上并发 review PR 和 browser tests
- **`/ce-debug`**：调查非当前 branch 上的 bug，且不扰动 in-progress work

Upstream callers 传 meaningful branch names；skill 期望 `feat/...`、`fix/...`、`refactor/...` 形状，而不是 auto-generated random names。

---

## 单独使用

直接调用：

- `/ce-worktree feat/notification-mute`：从 default branch 创建
- `/ce-worktree fix/email-validation develop`：从不同 base 创建

其他 worktree operations（list、remove、switch）直接使用 `git`：

```bash
git worktree list                          # list worktrees
git worktree remove .worktrees/<branch>    # remove a worktree
cd .worktrees/<branch>                     # switch to a worktree
cd "$(git rev-parse --show-toplevel)"      # return to main checkout
```

要把 `.env*` 复制到此前创建但缺少这些文件的 existing worktree，请从 main repo 运行（不要在 worktree 内运行，因为带 slash 的 branch names 会混淆 relative path）：

```bash
cp .env* .worktrees/<branch>/
```

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| `<branch-name>` | 从 default branch 创建 worktree |
| `<branch-name> <from-branch>` | 从指定 base 创建 worktree |

Defaults（默认值）：

- `from-branch` 默认为 origin 的 default branch（无法 resolve 时为 `main`）
- New branch 在 `origin/<from-branch>` 创建（remote 不可用时使用 local ref）

---

## 常见问题

**为什么要单独的 worktree skill，而不是直接 `git worktree add`？**
因为 per-checkout setup 很重要：`.env` copying、`mise`/`direnv` trust、`.gitignore` management。Plain `git worktree add` 留下的 tree 往往跑不起来。

**为什么在 review branches 上跳过 `direnv allow`？**
因为 `.envrc` 可以 source direnv 不验证的其他 files。Auto-trusting 外部 contributor 的 `.envrc` 与 auto-running 他们的 setup script 是同形错误。Skill 在 review branches 上跳过 `direnv allow`，并打印 manual command；你先 review diff，再在合适时 trust。

**如果 worktree 创建时没有 `.env*` files 怎么办？**
从 main repo 运行 `cp .env* .worktrees/<branch>/`（不要在 worktree 内运行，因为 branch names 常含 slashes，会混淆内部 relative paths）。

**如何清理 worktree？**
先运行 `cd "$(git rev-parse --show-toplevel)"` 离开 worktree，再运行 `git worktree remove .worktrees/<branch>`。如果 branch upstream 已删除，`/ce-clean-gone-branches` 会一起处理 worktree 和 branch cleanup。

**为什么是 `.worktrees/<branch>`，而不是其他位置？**
Predictability。扫描 worktrees 的 tooling、tab-completion、branch-to-path lookup 都受益于一个 canonical location。该 directory 已 gitignored，不会污染 git status。

**对 remote 上尚不存在的 branches 有效吗？**
有效。New branch 会基于 resolved base ref 在本地创建。Skill 会 fetch `origin/<from-branch>` 以保持 current，但不要求 new branch name 已存在于 remote。

---

## 另见

- [`/ce-work`](./ce-work.md) - 用户为 parallel features 选择 worktree mode 时，在 Phase 1.2 调用此 skill
- [`/ce-code-review`](./ce-code-review.md) - 推荐 worktree，用于 review 与 browser tests 并发
- [`/ce-clean-gone-branches`](./ce-clean-gone-branches.md) - remote tracking branch gone 时一起清理 worktrees 和 branches
