---
name: ce-code-review
description: "使用 tiered persona agents、confidence-gated findings 和 merge/dedup pipeline 进行 structured code review。Interactive mode 中，它会 apply safe、verified fixes，并在 working tree clean 时 commit（绝不 push）；mode:agent 中只 report，由 caller apply。创建 PR 前 review code changes 时使用。"
argument-hint: "[mode:agent] [留空则 review current branch，或提供 PR link]"
---

# 代码审查

使用 dynamically selected reviewer personas review code changes。Spawn parallel sub-agents 返回 structured JSON，然后将 findings merge 和 deduplicate 成 single report。

## 使用时机

- 创建 PR 前
- Iterative implementation 期间完成 task 后
- 任何 code changes 需要 feedback 时
- 可 standalone invocation
- 可在 larger workflows 内运行；当 caller 需要 JSON 而非 markdown tables 时，使用 `mode:agent`

## 参数解析

解析 `$ARGUMENTS` 中的 optional tokens。在将剩余内容解释为 PR number、GitHub URL 或 branch name 前，先移除每个 recognized token。

| Token | Example（示例） | Effect（效果） |
|-------|---------|--------|
| `mode:agent` | `mode:agent` | **Report-only**：返回 **JSON** 而不是 markdown tables，并跳过 Stage 5c apply（由 caller apply）。不改变 reviewer selection、merge logic 或 scope rules（见 Output format） |
| `mode:headless` | `mode:headless` | `mode:agent` 的 **Deprecated alias** |
| `mode:report-only` | `mode:report-only` | **Deprecated：ignored。** 旧 no-artifacts mode；default behavior 是不 checkout 的 review-only |
| `base:<sha-or-ref>` | `base:abc1234` or `base:origin/main` | **Current checkout** 上的 diff base（explicit；跳过 auto base detection） |
| `plan:<path>` | `plan:docs/plans/2026-03-25-001-feat-foo-plan.md` | Requirements verification 用的 plan file（explicit） |

**Mode alias：** `mode:headless` normalize 为 `mode:agent`。`mode:agent` + `mode:headless` 不是 conflict。

**Conflicting arguments：** 以下情况 stop，不 dispatch reviewers：
- 多个 incompatible scope selectors 同时出现（例如 `base:` **以及** PR number/branch target：`base:` 表示 "review the current checkout against this base"）
- 除 `mode:agent`/`mode:headless` alias pair 外，出现多个 distinct `mode:` tokens

Deprecated `mode:autofix` **不是** conflict：ignore token 并按 normal flow 继续（见下方）。

Emit one-line failure reason。在 `mode:agent` 中返回 JSON：`{"status":"failed","reason":"..."}`。

## 运行原则

Default 和 `mode:agent` 使用相同 pipeline：

- **本地 apply，绝不 push。** 任何 mode 都绝不 push、open PRs 或 file tickets：push 是用户拥有的 outward step。在 **default (interactive)** mode 中，review 会 apply safe、verified fixes，并在 pre-review tree clean 时 commit（完整规则由 Stage 5c 拥有）。在 **`mode:agent`** 中，它绝不 mutate tree：只 report，由 caller apply。
- **不使用 blocking prompts。** 绝不使用 `AskUserQuestion`、`request_user_input`、`ask_user` 或其它 blocking question tools。根据 explicit tokens、git state、PR metadata 和 conversation 推断 intent、plan 和 scope。在 Coverage 或 verdict 中记录 uncertainty：不要停下来问。
- **只做显式 mutations。** 绝不运行 `gh pr checkout`、`git checkout`、`git switch` 或类似 branch-switch commands。传入 PR number、URL 或 branch name 只选择 **review scope**，不授权 mutate working tree。要 review feature branch 上的 local uncommitted work，请自己 checkout 该 branch（或保持在该 branch），并传 `base:` 或不传 target。
- **Smart defaults。** Untracked files：只 review tracked changes，并在 Coverage 中列出 excluded paths。Plan：传入 `plan:` 时使用；否则从 PR body 或 branch keywords conservative discovery。仅来自 testing/maintainability 的 weak advisory P2/P3：按 Stage 5 demote 到 `testing_gaps` / `residual_risks`。

## 输出格式

| Invocation（调用方式） | Deliverable（交付物） |
|------------|-------------|
| **Default** | Markdown report（pipe-delimited finding tables）+ Actionable Findings summary |
| **`mode:agent`** | One JSON object（见下方 ### JSON output format）+ 相同 `/tmp/.../ce-code-review/<run-id>/` artifacts |

`mode:agent` 是 **report-only**：它跳过 Stage 5c apply（由 caller apply），并将 findings 序列化为 JSON 而不是 markdown。它不改变 reviewer selection、merge logic 或 scope rules：JSON 是 programmatic 和 cross-harness callers（Codex、Gemini 等）的 deterministic contract。Default markdown 是 human view；保持 ASCII-safe（pipe tables、`->` 而不是 middot `·`，不使用 box-drawing），让它在不同 terminals 中优雅降级。

## Quick Review 短路

如果 `$ARGUMENTS` 表明用户想要 quick、fast 或 light code review，且 **`mode:agent` 未 active**，不要 dispatch multi-agent flow。

在任何其它 work 前 **announce chosen path**（Quick review vs Multi-agent review）。当 `mode:agent` active 时跳过此 announcement。

流程：

1. **运行 harness built-in code review。** 移除 tokens 后 forward 任何 review target。然后 stop：不要 dispatch multi-agent pipeline。
2. **Exemption：** 如果没有 built-in review，继续进入 full multi-agent review。
3. **`mode:agent` 绕过此 short-circuit**：始终运行 full multi-agent review 并返回 JSON。

**Deprecated：** `mode:autofix` 不再支持：不存在 apply *mode*。如果传入，ignore token 并按 normal flow 继续（default 通过 Stage 5c apply safe fixes；`mode:agent` report，由 caller apply）。

## 严重级别

所有 reviewers 使用 P0-P3：

| Level | Meaning（含义） | Action（动作） |
|-------|---------|--------|
| **P0** | Critical breakage、exploitable vulnerability、data loss/corruption | merge 前必须修复 |
| **P1** | Normal usage 中 likely hit 的 high-impact defect、breaking contract | 应修复 |
| **P2** | 有 meaningful downside 的 moderate issue（edge case、perf regression、maintainability trap） | straightforward 时修复 |
| **P3** | Low-impact、narrow scope、minor improvement | 由用户决定 |

## Action Routing（动作路由）

Severity 回答的是 **urgency**。`autofix_class` 和 `owner` 是描述 caller follow-up shape 的 **signal**：**不是 apply permission 或 apply gate。** Apply decision 是 judgment（Stage 5c），不是 `autofix_class` 的函数：default mode 会 apply；在 `mode:agent` 中此 skill 不 mutate checkout，由 caller apply。Persona guidance 见 `references/action-class-rubric.md`。

| `autofix_class` | Default owner（默认 owner） | Meaning（含义） |
|-----------------|---------------|---------|
| `gated_auto` | `downstream-resolver` or `human` | 提出 concrete `suggested_fix`；caller judgment 后 apply |
| `manual` | `downstream-resolver` or `human` | 需要 design input 或 handoff 的 actionable work |
| `advisory` | `human` or `release` | Report-only：learnings、rollout notes、residual risk |

Routing rules（路由规则）：

- **Synthesis 拥有 final route。** Persona-provided routing metadata 是 input，不是最后结论。
- **Disagreement 时选择更 conservative route。** Merged finding 可从 `gated_auto` 移到 `manual`，但没有 stronger evidence 时绝不 widen。
- **如果出现 `safe_auto` 和 `review-fixer`，reject 它们**：在 synthesis 期间 drop finding，或 remap 到 `gated_auto` / `downstream-resolver`。
- **`requires_verification: true` 表示任何 caller-applied fix 需要 targeted tests 或 follow-up validation。**

## Reviewers（审查者）

14 个 reviewer personas 使用 layered conditionals，外加 CE agents。下方是带 one-line triggers 的 quick roster；底部 persona catalog 包含完整 per-persona selection criteria 和 spawn gates。

**Always-on（每次 review）：** `ce-correctness-reviewer`、`ce-testing-reviewer`、`ce-maintainability-reviewer`、`ce-project-standards-reviewer`，以及 CE agents `ce-agent-native-reviewer` 和 `ce-learnings-researcher`。

**Cross-cutting conditional（per diff，跨领域条件）：**

- `ce-security-reviewer` — auth、public endpoints、user input、permissions
- `ce-performance-reviewer` — DB queries、data transforms、caching、async
- `ce-api-contract-reviewer` — routes、serializers、type signatures、versioning
- `ce-data-migration-reviewer` — migration files / schema dumps / backfills（见 Stage 3 的 spawn gate）
- `ce-reliability-reviewer` — error handling、retries、timeouts、background jobs
- `ce-adversarial-reviewer` — >=50 changed code lines，或 auth / payments / data mutations / external APIs
- `ce-previous-comments-reviewer` — 带 existing review comments 的 PR（PR-only，comment-gated）

**Stack-specific conditional（per diff）：** `ce-julik-frontend-races-reviewer`（Stimulus/Turbo、DOM events、async UI）和 `ce-swift-ios-reviewer`（Swift/SwiftUI/UIKit、entitlements、Core Data、`.pbxproj`）。

**CE conditional（migration-specific）：** `ce-deployment-verification-agent`：migration gate 适用且 change risky 时，提供 deployment checklist + rollback。

## 审查范围

每次 review 都 spawn 所有 4 个 always-on personas 和 2 个 CE always-on agents，然后添加任何符合 diff 的 cross-cutting 和 stack-specific conditionals。Model 会自然 right-size：small config change 触发 0 个 conditionals = 6 reviewers。Rails auth feature 可能触发 security + reliability + adversarial = 9 reviewers。

## 受保护 Artifacts

以下 paths 是 compound-engineering pipeline artifacts，任何 reviewer 都绝不能将它们 flagged for deletion、removal 或 gitignore：

- `docs/brainstorms/*`：ce-brainstorm 创建的 requirements documents
- `docs/plans/*.md`：ce-plan 创建的 plan files（decision artifacts；execution progress 从 git 派生，不存储在 plan bodies 中）
- `docs/solutions/*.md`：pipeline 期间创建的 solution documents

如果 reviewer 将这些 directories 中任何 file flagged for cleanup 或 removal，在 synthesis 期间 discard 该 finding。

## 运行方式

### Stage 1：确定 scope

计算 diff range、file list 和 diff。通过合并为尽可能少的 commands 来最小化 permission prompts。

**如果提供 `base:` argument（fast path）：**

Caller 已知 diff base。跳过所有 base-branch detection、remote resolution 和 merge-base computation。直接使用提供的值：

```
BASE_ARG="{base_arg}"
BASE=$(git merge-base HEAD "$BASE_ARG" 2>/dev/null) || BASE="$BASE_ARG"
```

然后生成与其它 paths 相同的 output：

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

此 path 适用于任何 ref：SHA、`origin/main`、branch name。Reviewing current checkout 的 callers 在不需要 auto-detection 时应传 explicit `base:`。**不要将 `base:` 与 PR number 或 branch target 组合。** 如果二者都存在，stop 并报错："Cannot use `base:` with a PR number or branch target — `base:` implies the current checkout is already the correct branch. Pass `base:` alone, or pass the target alone and let scope detection resolve the base."

**如果 argument 提供了 PR number 或 GitHub URL：**

**不要** checkout PR branch。Scope 来自 GitHub read APIs，以及当 HEAD 已匹配 PR head branch 时的 optional local alignment。

**Skip-condition pre-check。** Scope detection 前，运行 PR-state probe：

```
gh pr view <number-or-url> --json state,title,body,files
```

按顺序应用 skip rules：

- `state` 为 `CLOSED` 或 `MERGED` -> stop，reason 为 `PR is closed/merged; not reviewing.`
- **Trivial-PR judgment**：使用 PR title、body 和 changed file paths spawn lightweight sub-agent（Claude Code 中使用 `model: haiku`；Codex 中使用 gpt-5.4-nano 或 equivalent）。Agent task："Is this an automated or trivial PR that does not warrant a code review? Consider: dependency lock-file or manifest-only bumps, automated release commits, chore version increments with no substantive code changes. When in doubt, answer no — false negatives (skipped reviews that should have run) are more costly than false positives (unnecessary reviews)." 如果 judgment 返回 yes：stop，reason 为 `PR appears to be a trivial automated PR; not reviewing. Run without a PR argument to review the current branch, or pass base:<ref> if review is intended.`

任何 skip rule 触发时，stop，不 dispatch reviewers。**Default mode：** 以 plain text emit reason。**`mode:agent`：** 只 emit JSON：`{"status":"skipped","reason":"<same message>"}`，让 programmatic callers 可 parse outcome。**Standalone**、**`base:`** 和 **branch-remote** paths 不受影响。**Draft PRs 正常 review。**

如果没有 skip rule 触发，**不 checkout**，fetch PR metadata：

```
gh pr view <number-or-url> --json title,body,baseRefName,headRefName,headRefOid,isCrossRepository,url,files,reviews,comments --jq '{title, body, baseRefName, headRefName, headRefOid, isCrossRepository, url, files: [.files[].path], hasPriorComments: ((.reviews | map(select(.state != "APPROVED" or .body != "")) | length) > 0 or (.comments | length) > 0)}'
```

将 `BASE:` 设为 `pr:<number-or-url>`（logical marker，不是 git SHA）。从 **current** checkout 上的 `git ls-files --others --exclude-standard` 设置 `UNTRACKED:`（PR-remote review 期间通常为空）。

**PR scope mode。** 只有以下条件 **全部** 成立时，classify as **`local-aligned`**；否则使用 **`pr-remote`**。仅 matching branch name 不够：fork PR 或 stale local branch 可能与 PR head 同名，但指向 unrelated code；信任名称会 diff 并 inspect wrong tree。

1. `git rev-parse --abbrev-ref HEAD` 等于 `headRefName`。
2. PR **不是** cross-repository（`isCrossRepository` 为 false）。
3. PR head commit 包含在 local checkout 中：`git merge-base --is-ancestor <headRefOid> HEAD` exit 0。这确认 working tree 实际包含 PR head（允许其上叠加 unpushed local fixes），而不是 unrelated same-named branch。

- **`local-aligned`**：三个 checks 全部 pass。对 workspace files 进行 local Read/Grep/git blame，对 PR changed paths 是 valid 的。
- **`pr-remote`**：任一 check fails。Working tree **不是** PR head；changed paths 的 workspace file contents 可能 stale 或 unrelated。

**按 scope mode 取 diff**（不要混合 remote 和 local diffs：contradictory hunks 会导致 false positives）：

- **`local-aligned`：** 从 `baseRefName` resolve `<resolved-base-ref>`（需要时 fetch）。计算 `BASE=$(git merge-base HEAD <resolved-base-ref>)`，然后从 `git diff --name-only $BASE` 设置 `FILES:`，从 `git diff -U10 $BASE` 设置 `DIFF:`（包含 PR branch 上 committed、staged 和 unstaged changes）。**不要** 调用 `gh pr diff` 或 append remote hunks：当存在 unpushed fixes 时，local tree 是 canonical。在 Coverage 中注明：`scope: local-aligned (PR; local tree diff)`。
- **`pr-remote`：** 从 PR `files` array 设置 `FILES:`。从 `gh pr diff <number-or-url> --color=never` 设置 `DIFF:`。如果 `gh pr diff` fails，stop 并给出 actionable error：不要 fall back 到 checkout。

当 **`pr-remote`** 时，在 Stage 4 前：

1. Best-effort fetch PR head，不 checkout：`git fetch --no-tags origin <headRefName>:refs/review/pr-<number>-head`（从 metadata 替换 PR number）。
2. Fetch 成功时，为 reviewers 和 validators 设置 `PR_HEAD_REF=refs/review/pr-<number>-head`。Fetch 失败时，省略 `PR_HEAD_REF` 并在 Coverage 中 note：reviewers 必须只依赖 diff hunks。
3. Best-effort fetch PR base，不 checkout：`git fetch --no-tags origin <baseRefName>`。成功时，用 `git rev-parse FETCH_HEAD` resolve concrete ref，并将 `PR_BASE_REF` 设为该 SHA：这是 reviewers 和 validators 用于 file-level git diffs 的 **real git base ref**（例如 `ce-data-migration-reviewer` 运行 `git diff <PR_BASE_REF> -- db/schema.rb`/`structure.sql`）。`BASE:` 中的 `pr:<number-or-url>` logical marker 保持为 scope marker；`PR_BASE_REF` 是 diffable base。Fetch 失败时，省略 `PR_BASE_REF` 并在 Coverage 中 note：schema-drift 和其它 git-diff checks 只 fallback 到 diff hunks，且 **不得** assume `main`。
4. 在 Stage 4 review context bundle 中包含 `<pr-scope-mode>pr-remote</pr-scope-mode>`，以及设置时的 `<pr-head-ref>...</pr-head-ref>` 和 `<pr-base-ref>...</pr-base-ref>`。

**`pr-remote`** mode 中的 reviewers 和 Stage 5b validators **不得** Read/Grep `FILES:` 中 files 的 workspace paths。当 `PR_HEAD_REF` 已设置时，通过 `git show <PR_HEAD_REF>:<path>` inspect；否则只使用 provided diff hunks。**`local-aligned`** 使用 normal workspace inspection。

**如果 argument 提供了 branch name：**

将提供的 branch name 代入为 `<branch>`。**不要** checkout `<branch>`。

如果 `git rev-parse --abbrev-ref HEAD` 等于 `<branch>`，使用下方 **standalone (current branch)** path：same tree、explicit branch name；不要使用 remote-only diff。

否则 **不 checkout**，diff remote/local ref：

1. 尝试 `gh pr view <branch> --json baseRefName,url,headRefName`：如果 PR exists，prefer 上方 **PR number/URL path**（same remote diff rules）。
2. 否则，需要时 `git fetch --no-tags origin <branch>`，然后将 `<branch>` resolve 为 `origin/<branch>` 或 `<branch>`。
3. Resolve default base branch（与 standalone 相同逻辑）。计算 `BASE=$(git merge-base <base-ref> <branch-ref>)` 和 `git diff -U10 $BASE <branch-ref>`。
4. 如果 `<branch-ref>` 无法 locally resolve，stop："Cannot diff branch `<branch>` without checkout. Check out that branch, pass its open PR URL/number, or review the current branch with `base:`."

Remote branch diff 成功时，设置 **branch-remote scope**。Working tree **不是** `<branch>`。在 Stage 4 review context bundle 中包含 `<pr-scope-mode>branch-remote</pr-scope-mode>` 和 `<branch-head-ref><branch-ref></branch-head-ref>`。Reviewers 和 Stage 5b validators **不得** Read/Grep `FILES:` 中 files 的 workspace paths。只能通过 `git show <branch-ref>:<path>` 或 diff hunks inspect。

生成：

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE <branch-ref> && echo "DIFF:" && git diff -U10 $BASE <branch-ref> && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

**如果无 argument（standalone on current branch）：**

使用 current branch 应用与上方 branch mode 相同的 base-detection logic（即不带 argument 的 `gh pr view --json baseRefName,url` default 到 current branch）。

如果无法 resolve base，**stop**。不要 fall back 到 `git diff HEAD`：没有 base 的 standalone review 只会显示 uncommitted changes，并 silent miss branch 上所有 committed work。

成功时，生成 diff：

```
echo "BASE:$BASE" && echo "FILES:" && git diff --name-only $BASE && echo "DIFF:" && git diff -U10 $BASE && echo "UNTRACKED:" && git ls-files --others --exclude-standard
```

使用 `git diff $BASE`（不带 `..HEAD`）会将 merge-base 与 working tree diff，包含 committed、staged 和 unstaged changes。

**Untracked file handling：** 始终 inspect `UNTRACKED:`。Untracked paths 除非 staged，否则 out of scope。非空时，在 Coverage 中列出 excluded files，并只继续 tracked changes：绝不 stop 或 prompt。

### Stage 2：Intent discovery（意图发现）

理解 change 试图完成什么。Intent source 取决于采用了哪个 Stage 1 path：

**PR/URL mode：** 使用 `gh pr view` metadata 中的 PR title、body 和 linked issues。如果 body sparse，用 PR commit messages 补充。

**Branch mode：** 使用 Stage 1 中 resolved merge-base 和 resolved branch ref 运行 `git log --oneline ${BASE}..<branch-ref>`。使用 `<branch-ref>`（resolved `origin/<branch>` 或 fetched ref），不要使用 raw `<branch>` argument：remote-only branch 没有 matching local ref，因此 raw name 会失败或读取 stale same-named local branch。

**Standalone（current branch）：** 运行：

```
echo "BRANCH:" && git rev-parse --abbrev-ref HEAD && echo "COMMITS:" && git log --oneline ${BASE}..HEAD
```

结合 conversation context（plan section summary、PR description），写 2-3 行 intent summary：

```
Intent: Simplify tax calculation by replacing the multi-tier rate lookup
with a flat-rate computation. Must not regress edge cases in tax-exempt handling.
```

将此传给每个 reviewer 的 spawn prompt。Intent 决定 *每个 reviewer 看得多仔细*，不决定选择哪些 reviewers。

**当 intent ambiguous 时：** 从 branch name、commits、PR title/body、diff、`plan:` 和 conversation 推断。写 best-effort intent summary，并在 Coverage 中 note uncertainty：绝不因 clarifying question 而 block。

### Stage 2b：Plan discovery（requirements verification，需求验证）

定位 plan document，让 Stage 6 能 verify requirements completeness。按 priority order 检查这些 sources：命中第一个就停止：

1. **`plan:` argument。** 如果 caller 传入 plan path，直接使用它。读取 file 以确认其存在。
2. **PR body。** 如果 Stage 1 fetch 了 PR metadata，扫描 body 中匹配 `docs/plans/*.md` 的 paths。如果恰好找到一个 match 且 file 存在，将其作为 `plan_source: explicit`。如果出现多个 plan paths，将其视为 ambiguous：对 disk 上存在的最新 match demote 为 `plan_source: inferred`，或在不存在/没有 clearly relate to PR title/intent 时跳过。使用前始终 verify selected file exists：PR descriptions 中 stale 或 copied plan links 很常见。
3. **Auto-discover。** 从 branch name 提取 2-3 个 keywords（例如 `feat/onboarding-skill` -> `onboarding`、`skill`）。Glob `docs/plans/*`，并 filter 包含这些 keywords 的 filenames。如果恰好一个 match，使用它。如果多个 matches 或 match 看起来 ambiguous（例如 `review`、`fix`、`update` 这类 generic keywords 可能命中很多 plans），**跳过 auto-discovery**：wrong plan 比 no plan 更糟。如果 zero matches，跳过。

**Confidence tagging：** 记录 plan 是如何找到的：
- `plan:` argument -> `plan_source: explicit`（high confidence）
- 单个 unambiguous PR body match -> `plan_source: explicit`（high confidence）
- 多个或 ambiguous PR body matches -> `plan_source: inferred`（lower confidence）
- Auto-discover 找到单个 unambiguous match -> `plan_source: inferred`（lower confidence）

如果找到 plan，读取其 **Requirements** section：current plans 中是 `## Requirements`，legacy ones 中是 `## Requirements Trace`；以及其中列出的 R-IDs（R1、R2 等），再读取 **Implementation Units**（`## Implementation Units` 下当前 numeric subsections，如 `### U1.`、`### U2.` 或 `### Unit 1:`；该 section 下 legacy bullet 或 checkbox unit entries 也算）。为 Stage 6 存储 extracted requirements list 和 `plan_source`。如果没有找到 plan，不要 block review：requirements verification 是 additive，不是 required。

### Stage 3：选择 reviewers

读取 Stage 1 的 diff 和 file list。4 个 always-on personas 和 2 个 CE always-on agents 自动启用。对下方 persona catalog 中每个 cross-cutting 和 stack-specific conditional persona，判断 diff 是否 warrant 它。这是 agent judgment，不是 keyword matching。

**Conditional selection 的 file-type awareness：** Instruction-prose files（Markdown skill definitions、JSON schemas、config files）是 product code，但 runtime-focused reviewers 对它们收益不大。Adversarial reviewer 的 techniques（race conditions、cascade failures、abuse cases）面向 executable code behavior。只修改 instruction-prose files 的 diffs，除非 prose 描述 auth、payment 或 data-mutation behavior，否则跳过 adversarial。Line-count thresholds 只统计 executable code lines。

**`previous-comments` 仅 PR-only 且 comment-gated。** 只有两个条件都成立时才选择此 persona：

1. Stage 1 收集了 PR metadata（argument 提供了 PR number 或 URL，或 `gh pr view` 为 current branch 返回了 metadata）。
2. Stage 1 的 `hasPriorComments` 为 true（PR 至少有一个 review submission 或 issue comment）。

对没有 associated PR 的 standalone branch reviews 跳过它；对还没有 prior feedback 的 PRs 也跳过：没有内容可让 persona verify，而且即使 spawned subagent 返回 empty findings，仍要付出完整 subagent startup overhead（persona spec、diff、schema，加上自己的 gh calls）。

当 runtime behavior warrant 时，stack-specific personas 是 additive。Hotwire UI change 可能 warrant `julik-frontend-races`；TypeScript API diff 可能 warrant `api-contract` 和 `reliability`。

**`data-migration` spawn gate。** 只有 diff 至少包含一个 migration 或 schema artifact 时才选择 `ce-data-migration-reviewer`：`db/migrate/*`、`db/schema.rb`、`db/structure.sql`、Alembic/Flyway/Liquibase migration paths，或 explicit backfill/data-transform scripts（rake tasks、one-off data migration classes）。对 model-only changes、query-only refactors、serializers/controllers 中引用 columns 但 diff 中无 migration 或 schema dump、或仅 migration tests 的情况，**不要 spawn**。

对 `ce-deployment-verification-agent`，当 change risky（destructive DDL、backfills、NOT NULL without default、column renames/drops）时，使用相同 migration-artifact gate。

Spawning 前 announce team：

```
Review team:
- correctness (always)
- testing (always)
- maintainability (always)
- project-standards (always)
- ce-agent-native-reviewer (always)
- ce-learnings-researcher (always)
- security -- new endpoint in routes.rb accepts user-provided redirect URL
- julik-frontend-races -- Stimulus controller with async DOM updates
- data-migration -- adds migration 20260303_add_index_to_orders
- ce-deployment-verification-agent -- destructive migration with backfill
```

这是 progress reporting，不是 blocking confirmation。

### Stage 3b：发现 project standards paths（项目标准路径）

Spawning sub-agents 前，为 `project-standards` persona 查找所有 relevant standards files 的 file paths（不是 contents）。使用 native file-search/glob tool 定位：

1. 使用 native file-search tool（例如 Claude Code 中的 Glob）查找 repo 中所有 `**/CLAUDE.md` 和 `**/AGENTS.md`。
2. Filter 目录是至少一个 changed file ancestor 的 files。Standards file governs 其下所有 files（例如 `plugins/compound-engineering/AGENTS.md` 适用于 `plugins/compound-engineering/` 下所有内容）。

将 resulting path list 作为 review context 中 `<standards-paths>` block 传给 `project-standards` persona（见 Stage 4）。Persona 自行读取 files，并只针对 changed file types relevant 的 sections。这让 orchestrator work 保持 cheap（只做 path discovery），也避免用 reviewer 可能不完全需要的 content 膨胀 subagent prompt。

### Stage 4：Spawn sub-agents（派发 sub-agents）

#### Model tiering（模型分层）

三个 reviewers 继承 session model 且不 override：`ce-correctness-reviewer`、`ce-security-reviewer` 和 `ce-adversarial-reviewer`。它们执行 highest-stakes analysis：logic bugs、security vulnerabilities、adversarial failure scenarios，应以用户配置的 capability level 运行。如果用户在用 Opus，它们也使用 Opus。

所有其它 persona sub-agents 和 CE agents 使用平台 mid-tier model，以降低 cost 和 latency。具体 dispatch-time override 见下方 Spawning subsection。

Orchestrator（此 skill）也继承 session model；它处理 intent discovery、reviewer selection、finding merge/dedup 和 synthesis。

#### Run ID（运行 ID）

Dispatching any agents 前，生成 unique run identifier。此 ID 将所有 agent artifact files 和 post-review run artifact scope 到同一 directory。

```bash
RUN_ID=$(date +%Y%m%d-%H%M%S)-$(head -c4 /dev/urandom | od -An -tx1 | tr -d ' ')
mkdir -p "/tmp/compound-engineering/ce-code-review/$RUN_ID"
```

将 `{run_id}` 传给每个 persona sub-agent，让它们可将 full analysis 写入 `/tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`。

**Large shared context：传 paths，不传 contents。** Diff 和 file list 会传给每个 reviewer 和 validator。当把它们 inline 到每个 subagent prompt 会造成浪费（many files / big diff）时，将它们一次性写入 run dir（例如 `full.diff`、`files.txt`），然后在 diff / changed-files slots 中传这些 **paths**，而不是 inline content：subagent 和 validator templates 会指示 child Read staged path。Small diff 直接 inline。

#### Spawning（派发）

Dispatching sub-agents 时省略 `mode` 参数，让用户配置的 permission settings 生效。不要传 `mode: "auto"`。

**Dispatch time 的 model override。** 除 `ce-correctness-reviewer`、`ce-security-reviewer` 和 `ce-adversarial-reviewer` 外，每次 dispatch 都传平台 mid-tier model；这三者按上方 Model tiering subsection 继承 session model。Claude Code 中，在 `Agent` tool call 加 `model: "sonnet"`。Codex 中，在 `spawn_agent` 上传 equivalent mid-tier（例如 2026 年 4 月时的 `gpt-5.4-mini`）。Pi 中，通过 `pi-subagents` extension 在 `subagent` 上传 equivalent。如果平台 dispatch primitive 没有 model-override parameter，或 available model names 未知，省略 override：使用 parent model 的 working review 胜过 unrecognized name 导致 broken dispatch。Parallel dispatch 中每个 Agent / `spawn_agent` / `subagent` call 都要检查这一点；Opus sessions 中省略它会 silently 让 review cost 变成 3-4 倍。

**Bounded parallel dispatch。** 尊重 current harness 的 active-subagent limit。Queue selected reviewers，只 dispatch harness 接受的数量，并在 reviewers 完成时填充 freed slots。将 active-agent/thread/concurrency-limit spawn errors 视为 backpressure，而不是 reviewer failure：保留 reviewer queued，并在 slot frees 后 retry。只有 successful dispatch 后 timeout/fails，或 dispatch 因 non-capacity reason 失败时，才 record reviewer as failed。

使用下方 included subagent template spawn 每个 selected persona reviewer。每个 persona sub-agent receives：

1. 它们的 persona file content（identity、failure modes、calibration、suppress conditions）
2. 下方 diff-scope reference 中的 shared diff-scope rules
3. 下方 findings schema 中的 JSON output contract
4. PR metadata：reviewing PR 时的 title、body 和 URL（否则为空 string）。放在 `<pr-context>` block 中，让 reviewers 可根据 stated intent verify code
5. Review context：intent summary、file list、diff、scope mode（`local-aligned` | `pr-remote` | `branch-remote`），以及设置时的 remote head ref（`PR_HEAD_REF` 或 `<branch-head-ref>`）
6. Artifact file path 用的 Run ID 和 reviewer name
7. **仅 `project-standards`：** Stage 3b 的 standards file path list，包裹在 append 到 review context 的 `<standards-paths>` block 中
8. **仅 `data-migration`：** Stage 1 的 resolved review base ref（`BASE:` marker），包裹在 review context 内的 `<review-base>` 中，让 schema drift checks 绝不 assume `main`

Persona sub-agents 对 project 是 **read-only**：它们 review 并返回 structured JSON。它们不 edit project files，也不 propose refactors。唯一 permitted write 是将 full analysis 保存到 output contract 指定的 run-artifact path（`/tmp/compound-engineering/ce-code-review/<run-id>/` 下）。

这里的 read-only 表示 **non-mutating**，不是 "no shell access."。Reviewer sub-agents 可在需要 gather evidence 或 verify scope 时使用 non-mutating inspection commands，包括 read-oriented `git` / `gh` usage，如 `git diff`、`git show`、`git blame`、`git log` 和 `gh pr view`。在 **`pr-remote`** 或 **`branch-remote`** scope 中（见 Stage 1），通过 `git show <remote-head-ref>:<path>` 或 diff hunks inspect changed files：不要 Read/Grep scope 内 files 的 workspace paths。它们不得 edit project files、change branches、commit、push、create PRs，或以其它方式 mutate checkout 或 repository state。

每个 persona sub-agent 将 full JSON（all schema fields）写入 `/tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json`，并只返回带 merge-tier fields 的 compact JSON：

```json
{
  "reviewer": "security",
  "findings": [
    {
      "title": "User-supplied ID in account lookup without ownership check",
      "severity": "P0",
      "file": "orders_controller.rb",
      "line": 42,
      "confidence": 100,
      "autofix_class": "gated_auto",
      "owner": "downstream-resolver",
      "requires_verification": true,
      "pre_existing": false,
      "suggested_fix": "Add current_user.owns?(account) guard before lookup"
    }
  ],
  "residual_risks": [...],
  "testing_gaps": [...]
}
```

Artifact file **必须** 携带 detail-tier fields（`why_it_matters`、`evidence`）；compact *return* 会省略它们，但把 compact shape 写入 artifact（常见 reviewer slip）会 silently strip detail，而 Coverage 和 keyed detail lines 依赖这些字段。无论 review context 是 inlined，还是因 large diff staged to disk，每个 reviewer 仍收到完整 subagent-template output contract；staging context 从不授权更薄的 contract。`suggested_fix` 在两种 tiers 中都是 optional：present 时包含在 compact returns 中，方便 callers 在 review 后 apply fixes。如果 file write fails，compact return 仍提供 merge 所需的一切。

**CE always-on agents**（ce-agent-native-reviewer、ce-learnings-researcher）通过与 persona agents 相同的 bounded parallel scheduler 作为 standard Agent calls dispatch。给它们与 personas 相同的 review context bundle：entry mode、Stage 1 收集的任何 PR metadata、intent summary、已知时的 review base branch name、`BASE:` marker、file list、diff 和 `UNTRACKED:` scope notes。不要用 generic "review this" prompt 调用它们。它们的 output 是 unstructured，并在 Stage 6 单独 synthesized。

**CE conditional agents**（仅 `ce-deployment-verification-agent`）在 migration-artifact gate 适用时，通过相同 bounded parallel scheduler 作为 standard Agent calls dispatch。传入相同 review context bundle，加上 applicability reason（例如哪些 migration files 触发了 agent）。它们的 output 是 unstructured，必须像 CE always-on agents 一样为 Stage 6 synthesis 保留。Schema drift 由 `data-migration` persona 作为 structured findings 处理：不是这里。

### Stage 5：合并 findings

将多个 reviewer compact JSON returns 转换成一个 deduplicated、confidence-gated finding set。Compact returns 包含 merge-tier fields（title、severity、file、line、confidence、autofix_class、owner、requires_verification、pre_existing），以及 optional suggested_fix。Detail-tier fields（why_it_matters、evidence）位于 disk 上的 per-agent artifact files，此 stage 不加载。

`confidence` 是 5 个 discrete anchors（`0`、`25`、`50`、`75`、`100`）之一，behavioral definitions 位于 findings schema。Synthesis 将 anchors 视为 integers；不要 coerce to floats。

1. **Validate.** 检查每个 compact return 的 required top-level 和 per-finding fields，以及 value constraints。Drop malformed returns 或 findings。Record drop count。
   - **Top-level required：** reviewer（string）、findings（array）、residual_risks（array）、testing_gaps（array）。任何缺失或 type 错误时，drop entire return。
   - **每个 finding 必需：** title、severity、file、line、confidence、autofix_class、owner、requires_verification、pre_existing
   - **Value constraints（值约束）：**
     - severity：P0 | P1 | P2 | P3（严重级别枚举）
     - autofix_class：gated_auto | manual | advisory（修复路由枚举）
     - owner：downstream-resolver | human | release（负责人枚举）
     - confidence：integer in {0, 25, 50, 75, 100}（整数锚点）
     - line：positive integer（正整数）
     - pre_existing、requires_verification：boolean
   - 此处不要 validate against full schema：full schema（包括 why_it_matters 和 evidence）适用于 disk 上的 artifact files，不适用于 compact returns。
2. **Deduplicate.** 计算 fingerprint：`normalize(file) + line_bucket(line, +/-3) + normalize(title)`。Fingerprints match 时 merge：保留 highest severity、highest anchor，并记录哪些 reviewers flagged it。Dedup 覆盖 full validated set（包括 anchor 50），让 step 3 的 cross-reviewer promotion 可将 matching anchor-50 findings 提升到 actionable tier。
3. **Cross-reviewer agreement.** 当 2+ independent reviewers flag same issue（same fingerprint）时，将 merged finding promote one anchor step：`50 -> 75`、`75 -> 100`、`100 -> 100`。在 output 的 Reviewer column 中 note agreement（例如 "security, correctness"）。
4. **Separate pre-existing.** 将 `pre_existing: true` 的 findings pull out 到 separate list。
5. **Resolve disagreements.** 当 reviewers flag same code region 但在 severity、autofix_class 或 owner 上 disagree 时，在 Reviewer column 中 annotate disagreement（例如 "security (P0), correctness (P1) -- kept P0"）。
6. **Normalize routing.** 对每个 merged finding，设置 final `autofix_class`、`owner` 和 `requires_verification`。如果 reviewers disagree，保留 more conservative route。将任何 legacy `safe_auto` 或 `review-fixer` remap 为 `gated_auto` / `downstream-resolver`。
6b. **Mode-aware demotion of weak general-quality findings.** 某些 persona output 是 real signal，但不 warrant primary-findings attention。将其 reroute 到 existing soft buckets，让 primary findings table 聚焦 actionable issues。

Finding 只有在以下条件 **全部** 成立时才 qualifies for demotion：
   - Severity 是 P2 或 P3（P0 和 P1 始终保留在 primary findings）
   - `autofix_class` 是 `advisory`（concrete-fix findings 保留在 primary）
   - **所有** contributing reviewers 都是 `testing` 或 `maintainability`：如果任何其它 persona 也 flagged 此 finding，则存在 cross-reviewer corroboration，该 finding 无论 severity 或 advisory status 如何都保留在 primary findings（以后只有基于 evidence 才扩展 weak-signal list）

当 finding qualifies：
   - 将 demoted findings 移出 primary set。如果 contributing reviewer 是 `testing`，向 `testing_gaps` append `<file:line> -- <title>`。如果是 `maintainability`，append 到 `residual_risks`。使用 title-only lines（compact return 省略 `why_it_matters`）。为 Coverage record demotion count。

7. **Confidence gate.** Dedup、promotion 和 demotion 塑造 primary set 后，suppress anchor 75 以下的 remaining findings。Exception：anchor 50+ 的 P0 findings survive the gate：critical-but-uncertain issues 不得 silent drop。按 anchor record suppressed count（让 Coverage 可 report "N findings suppressed at anchor 50, M at anchor 25"）。Gate 故意 late run：anchor-50 findings 需要机会在 any drop decision 前被 step 3 promote（cross-reviewer corroboration）或被 step 6b rerouted（mode-aware demotion to soft buckets）。
8. **Partition the work.** 构建两个 sets：
   - actionable queue：owner 为 `downstream-resolver` 的 `gated_auto` 或 `manual` findings（hand off to caller）
   - report-only queue：`advisory` findings，加上任何 owned by `human` 或 `release` 的内容
9. **Sort and number.** 按 severity（P0 first）-> anchor（descending）-> file path -> line number 排序，然后在 full primary finding set 中按该 sorted order 分配 monotonically increasing `#` values。不要在每个 severity table 或 autofix/routing bucket 内 restart numbering。如果 later sections repeat finding（例如 Actionable Findings），reuse same stable `#`，让 users 和 downstream workflows 可在 report 和 caller handoff 中通过 `#` reference findings。
10. **Collect coverage data.** Union reviewers 的 residual_risks 和 testing_gaps。
11. **Preserve CE agent artifacts.** 将 learnings、agent-native 和 deployment-verification outputs 与 merged finding set 一起保留。不要因为 unstructured agent output 不匹配 persona JSON schema 就 drop。来自 `data-migration` 的 schema drift 已在 merged finding set 中。

### Stage 5b：Validation pass（可选 quality gate，质量门）

Independent verification gate。使用 `references/validator-template.md`，为每个 surviving finding spawn 一个 validator sub-agent。Validator reject 的 findings 会被 dropped；confirmed findings 原样 flow through。

**此 stage 何时运行：** Stage 5 后只要至少一个 finding survives 就运行；只有 zero survive 时才跳过。超过 15 个 survives 时，**不要** 跳过此 stage；按 step 2 中的 budget cap validate。Default method 是 per-finding validator wave（下方 steps）；surviving **P2/P3 finding at anchor 100** 可改用 direct first-party verification（见下方）。Default 和 `mode:agent` 使用相同规则。

**步骤：**

1. **Select findings to validate（选择待验证 findings）。** Stage 5 的所有 survivors。
2. **Apply dispatch budget cap（应用 dispatch 预算上限）。** 如果 selected set 超过 15 findings，validate highest-severity 15（P0 first，然后 P1、P2、P3，ties 按 anchor descending 打破），只从 P2/P3 tail drop。**绝不要从 validation 中 drop P0 或 P1**：如果仅 P0/P1 findings 就超过 15，raise cap 以包含它们全部。为 Coverage section record over-budget count（dropped P2/P3 tail）。
3. **Spawn validators with bounded parallelism（以有界并行启动 validators）。** 每个 finding 一个 sub-agent，使用 validator template 和 Stage 4 的 same bounded scheduler 独立 dispatch。每个 validator receives：
   - Finding 的 title、severity、file、line、suggested_fix、original reviewer name 和 confidence anchor
   - 可用时的 `why_it_matters`：从 `/tmp/compound-engineering/ce-code-review/{run_id}/{reviewer_name}.json` 的 per-agent artifact file 加载；file absent 或 artifact write failed 时省略。Validator 没有它也继续，直接使用 diff 和 cited code。
   - Full diff（完整 diff）
   - Scope mode 和 remote head ref，mirror Stage 4 reviewer bundle：注入 `<pr-scope-mode>local-aligned | pr-remote | branch-remote</pr-scope-mode>`，以及设置时的 `<pr-head-ref>...</pr-head-ref>` 或 `<branch-head-ref>...</branch-head-ref>`。这些 absent 时 validator template default 到 local-aligned workspace inspection，因此在 `pr-remote`/`branch-remote` 中省略它们会让 validators 对 stale working tree verify findings：drop valid findings 或在 wrong tree 上 confirm false ones。
   - 按 mode scoped 的 inspection access：在 `local-aligned` 中，Read/Grep/git blame cited code、callers、guards、framework defaults 和 history；在 `pr-remote`/`branch-remote` 中，只通过 `git show <remote-head-ref>:<path>` 或 provided diff hunks inspect：不要 Read/Grep scope 内 files 的 workspace paths。
4. **Collect verdicts（收集判定）。** 每个 validator 返回 `{ "validated": true | false, "reason": "<one sentence>" }`。
   - `validated: true` -> finding 不变，survive into Stage 6
   - `validated: false` -> finding dropped；在 Coverage 中 record validator reason
   - Validator **infrastructure** failure（timeout、dispatch error、malformed JSON：不是 `validated:false` verdict）：对 **P2/P3**，以 "validator failed" 为 reason drop finding（conservative bias）。对 **P0/P1**，infra failure 时 **不要** drop：keep finding 并将 validation 标为 **degraded**（在 Coverage 中 note）。Transient validator failure 绝不能 silently remove critical/high finding；上方 genuine `validated:false` rejection 仍会在任何 severity drop。
5. **Use mid-tier model for validators（validators 使用中档模型）。** 与 persona reviewers 使用相同 model class（sonnet）。Validators read-only，constraints 与 persona reviewers 相同。它们可使用 non-mutating inspection commands（Read、Grep、Glob、git blame、gh）。
6. **Record metrics for Coverage（记录 Coverage 指标）。** Total dispatched、validated true count、validated false count（带 reasons）、infra failures（以及任何 P0/P1 kept-on-failure as degraded）、over-budget drops。

**Orchestrator direct verification.** 当 finding 依赖 orchestrator 可 cheaply 且 authoritatively 检查的 fact：pinned dependency source、repo 中 wiring/config fact、build tag，直接用 single-purpose native tools（Read/Grep/Glob、一次一个 git command）verify，绝不使用 chained 或 error-suppressed shell。将 confirmed facts fold into synthesis。它是否可 *replace* independent validator 取决于一个 distinction：orchestrator **不是** independent second opinion（它 synthesized 这些 findings），因此 direct verification 能捕获 wrong **fact**，但不能捕获 orchestrator 自身 **bias**。Independence 对 mechanically-checkable fact 没有增益，但对 judgment call 至关重要：

- **P0/P1, any anchor：** per-finding validator wave **required**；direct verification 只 *complements* 它，绝不 replace 它。
- **P2/P3 at anchor 100**（仅从 code 即可 verify：compile/type error、definitive logic bug、quotable standards violation、无 interpretation）：direct verification **may stand in for** wave；在 Coverage 中 note method。
- **P2/P3 at anchor 75**（judgment call："will affect users"，不是 airtight）：independent wave **required**：这里正是 fresh second opinion 过滤 false positives 的地方，orchestrator 无法为自己的 findings 提供这一点。

**为什么 per-finding bounded dispatch（而不是 batched）：** Independence 才是重点。单个 batched validator 同时看所有 findings，会在它们之间 pattern-match，并重建 persona-bias problem。Per-finding dispatch 保留 fresh context，同时 scheduler 尊重 harness limits。

### Stage 5c：Act on findings（仅 default mode，处理 findings）

**在 `mode:agent` 中完全跳过**：该 mode 是 machine handoff，由 caller owns apply。Default（interactive）mode 中，review 是 top-level agent，因此在 presenting report 前 apply 它有信心的 fixes。

**Act policy（bias to act）。** 默认 apply 每个 clear improvement 且 reversible edit 的 finding，不论 severity。Work 是 tracked、visible diff，可 reverted，因此为了 "to be safe" 而留下 clean fix unapplied 才是 failure mode，不是 safe choice。用 judgment 决定，而不是 safety checklist：

- **Apply** clear improvements：常见情况（test hardening、dead-code removal、带 concrete `suggested_fix` 的 localized fix）。
- **Push back**：当 reviewer wrong 时，不 apply；保留 finding 并用 reasoning state disagreement。
- **Skip with judgment** taste calls 和 conflicting suggestions，但 surface skipped 内容和原因。绝不 silently drop。

Severity、confidence 和 cross-reviewer agreement 告诉你先做什么、什么要 loudly flag：它们不 gate decision。没有 deny-list：downside 通过事后控制（revert + visible diff + commit checkpoint），不是通过 precondition。

**Scope invariant.** 只有 working tree *就是* reviewed 内容时才 apply：`local-aligned` 或 standalone。在 `pr-remote` / `branch-remote` 中，working tree 不是 reviewed head；不要 apply：只 report。

**Verify, then keep.** Applying 后运行 affected tests 和 lint（default targeted；当 fixes 跨 files 时 broaden）。如果它们 fail，revert 该 fix 并改为 report as finding：unverified fix 不算 finished。绝不留下 red tree。

**Pre-review tree clean 时 commit。** Applying 前，note working tree 是否已有 uncommitted changes（`git status --porcelain`）。Permanence gate 是 **push**，不是 commit：local commit 是 private 且 reversible（`git reset --soft HEAD~1`）。

- **Review 前 clean：** applying and verifying 后，将 fixes 作为一个 isolated、review-labeled fix commit 提交：`fix(review): <summary>`，如果 `review` 不是 allowed scope，则使用 repo 最近的 convention。Labeled 且 reversible，让 tree 回到 known state。
- **Review 前 dirty：** apply 但 **不** commit：fixes 会与用户 in-flight work interleave，并随他们本来要做的 commit 一起走。Applied section 列出 changed 内容。
- **绝不 push、open PR 或 file tickets**：这是用户拥有的 outward-facing step。

**Surface green-but-unverifiable edits.** 当 applied fix 触及 auth/authz、public 或 cross-service contract/schema、或 concurrency/ordering 时，passing test 不证明 safety：在 Applied section 中 prominently flag，让 diff reviewer 注意。

### Stage 6：综合并呈现

Assemble final report。**Default：** findings 使用 pipe-delimited markdown tables（mandatory：见 review output template）。**`mode:agent`：** 跳过 markdown 并 emit JSON（见 ### JSON output format）。其它 sections（Actionable Findings、Learnings、Coverage 等）仅在 markdown mode 中使用 bullets，并在 verdict 前使用 `---`。

**Writing report 前，加载 `references/review-output-template.md` 并 mirror it**：该 file 是 canonical skeleton（完整 per-section structure）。下方 block 是 always-loaded fallback，确保即使 template 未重新加载，shape 也能跨 long session 保留。

**Findings table shape（default mode：load-bearing，不要 improvise）。** 每个 finding 是按 severity 分组的 pipe-delimited table 中的一行，带 **terse** `Issue` cell；深度内容放在 table 下的 keyed detail line。复制此 shape；不要 invent layout：

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 1 | `path/to/file.go:42` | One terse line — the scannable index | correctness | 100 |

- **#1** — full explanation here（why it matters + concrete fix direction），作为 table 下的 keyed detail line。

Per-severity tables 是 **5 columns**：这里不显示 `Route`（它只出现在 Actionable Findings table 和 JSON 中）。将 `Issue` cell 保持为 **one short clause**（大约 12 words 或更少；无 second sentence；无 because/so/which explanation）：它是 scannable index，不是 explanation。当 cell 想要 comma-plus-clause 或 reason 时，把 depth 移到 **keyed detail line**（`- **#N** — …`），不要塞进 cell：通常用于 P0/P1；P2/P3 通常 terse-only。

**绝不要产出这些 shapes（instant fail：适用于 *every* tabular section，包括 Applied table，不只是 severity findings；如果 mid-draft 发现，delivery 前 re-render）：**
- 任何 row：finding **或** Applied entry，被渲染为 `Field:`-prefixed blocks（`#:` / `Sev:` / `File:` / `Issue:` / `Fix:` / `Route:` lines）：depth 放在 keyed detail line，绝不放 field block
- 使用 horizontal rules 或 box-drawing characters（`────`、`———`）作为 per-row separators
- 用 plain bulleted/numbered list 替代表格（table 下的 keyed `- **#N** —` detail line 是 supplement，不是 replacement：这是 expected）
- Cells 中出现 Unicode separators 或 arrows（middot `·`）；使用 ASCII `->`
- **Severities 或 sections 之间 inconsistent treatment**（例如 P1 用 blocks，而 P2/P3 用 tables；或 Applied table 用 field-blocks 而 findings 用 tables）：每个 table 使用相同 pipe-delimited shape

1. **Header.** Scope、intent、mode、reviewer team 及 per-conditional justifications。
2. **Applied（default mode only）。** 当 Stage 5c applied fixes 时，先列出它们：在 findings tables 前的 Applied section（见 review output template）中，以 pipe table `| # | File | Fix | Reviewer |` 呈现：**绝不** 使用 `Field:`-blocks 或 `────` separators，规则与 findings tables 相同；然后给一行 validation outcome（例如 "pin tests 4 -> 6; suite 94 pass, lint clean"）和 commit status（clean tree 上 committed as `fix(review): …` 或 repo 最近 convention；dirty tree 上 left uncommitted for the user）。Prominently flag green-but-unverifiable edits（auth/contract/concurrency）。在 `mode:agent` 和没有 applied 内容时省略此 section。Applied findings 出现在这里，不出现在 severity tables 中。
3. **Findings.** 按 severity 分组的 pipe-delimited tables（`### P0 -- Critical`、`### P1 -- High`、`### P2 -- Moderate`、`### P3 -- Low`），使用上方 shape：每个 severity 使用 **same** shape。Omit empty severity levels。Finding numbers 来自 Stage 5 stable assignment：绝不按 severity table 重新 derive。
4. **Requirements Completeness.** 仅当 Stage 2b 找到 plan 时包含。对 plan 中每个 requirement（R1、R2 等）和 implementation unit，report diff 中是否出现 corresponding work。使用 simple checklist：met / not addressed / partially addressed。Routing 取决于 `plan_source`：
   - **`explicit`**（caller-provided 或 PR body）：将 unaddressed requirements 或 implementation units flag 为 P1 findings，`autofix_class: manual`、`owner: downstream-resolver`。这些进入 actionable queue。
   - **`inferred`**（auto-discovered）：将 unaddressed requirements 或 implementation units flag 为 P3 findings，`autofix_class: advisory`、`owner: human`。这些只留在 report 中：无 autonomous follow-up。Inferred plan match 是 hint，不是 contract。
   未找到 plan 时，完全省略此 section：不要提及 absence of plan。
5. **Actionable Findings.** 当 actionable queue 非空时包含：caller 应 address 的 findings（`gated_auto` / `manual` 且 `downstream-resolver`），加上 Stage 5c 选择不 apply 的任何内容。Default mode 中，已 applied findings 出现在 Applied section，不在这里。
6. **Pre-existing.** Separate section，不计入 verdict。
7. **Learnings & Past Solutions.** Surface ce-learnings-researcher results：如果 past solutions relevant，将其 flag 为 "Known Pattern"，并附 docs/solutions/ files links。
8. **Agent-Native Gaps.** Surface ce-agent-native-reviewer results。无 gaps 时 omit section。
9. **Deployment Notes.** 如果 ce-deployment-verification-agent 运行，surface key Go/No-Go items：blocking pre-deploy checks、最重要 verification queries、rollback caveats 和 monitoring focus areas。保持 checklist actionable，不要 drop 到 Coverage。Schema drift 以 `data-migration` P1 rows 出现在 findings tables：不要添加 separate Schema Drift section。
10. **Coverage.** Applied count（当 Stage 5c 运行）、按 anchor suppressed count（例如 "N findings suppressed at anchor 50, M at anchor 25"）、mode-aware demotion count、validator drop count 和 reasons（当 Stage 5b 运行）、任何 degraded validation 的 P0/P1（kept on validator infra failure）、validator over-budget drops（15-cap 触发时）、residual risks、testing gaps、failed/timed-out reviewers，以及适用时的 inferred-intent uncertainty。
11. **Verdict.** Ready to merge / Ready with fixes / Not ready。适用时提供 fix order。当 `explicit` plan 有 unaddressed requirements 或 implementation units，verdict 必须反映：code-clean 但 missing planned requirements 的 PR 是 "Not ready"，除非 omission intentional。当 `inferred` plan 有 unaddressed requirements 或 implementation units，在 verdict reasoning 中 note，但不要仅因此 block。

不要包含 time estimates。

**Format verification（default only：delivery 前最后 gate）。** Delivery 前，scan **every table：Applied table 和每个 severity findings table**，查找 forbidden shapes：`Field:`-prefixed blocks（`#:` / `File:` / `Fix:` / `Issue:`）、box-drawing 或 horizontal-rule separators（`────`）、middot `·`，或用 list 替代表格。**Applied table 是最常见 offender：明确检查它。** 如果任何 table 命中，STOP，并在 delivering 前 re-render 为相同 pipe-delimited shape。（Table 下 keyed `- **#N** —` detail line 是 expected，不是 failure。）仅当 `mode:agent` active 时跳过。

### JSON output format（仅 `mode:agent`）

Emit **one raw JSON object** 作为 primary response：single bare JSON value，**no markdown code fence**。开头的 ```` ```json ```` fence 会让 response 以 backticks 开始，并 break naive `JSON.parse` consumers，因此绝不要 wrap。也用相同 payload 写入 `/tmp/compound-engineering/ce-code-review/<run-id>/` 下的 `review.json`。

`mode:agent` 不 apply fixes：由 caller 执行。因此没有 `applied_fixes` field；handoff 是 `actionable_findings`。Applied work 只在 default-mode markdown Applied section（Stage 5c/6）中出现。

Minimum shape（最小结构）：

```json
{
  "status": "complete",
  "verdict": "Ready to merge | Ready with fixes | Not ready",
  "scope": {
    "base": "<merge-base sha, pr:NNN marker, or base: ref>",
    "branch": "<current branch name>",
    "head_sha": "<git rev-parse HEAD>",
    "pr_url": "<url or null>",
    "files_changed": 0
  },
  "intent": "<2-3 line summary>",
  "intent_confidence": "explicit | inferred | uncertain",
  "reviewers": ["correctness", "security"],
  "findings": [],
  "actionable_findings": [],
  "pre_existing_findings": [],
  "requirements_completeness": null,
  "learnings": [],
  "agent_native_gaps": [],
  "deployment_notes": [],
  "residual_risks": [],
  "testing_gaps": [],
  "coverage": {},
  "artifact_path": "/tmp/compound-engineering/ce-code-review/<run-id>/",
  "run_id": "<run-id>"
}
```

`findings` 中每个 object 使用 merged finding fields：`#`、`title`、`severity`、`file`、`line`、`confidence`、`autofix_class`、`owner`、`requires_verification`、`pre_existing`、`suggested_fix`、`why_it_matters`、`evidence`、`reviewers`。

`actionable_findings` 列出 `gated_auto` / `manual` + `downstream-resolver` subset，使用相同 fields 并包含 stable `#`。

Review completes 前 failure 时，设置 `"status": "failed"` 和 `"reason": "<one sentence>"`。当所有 reviewers fail，使用 `"status": "degraded"` 并附 reason。当 PR skip rule fires（closed/merged/trivial），使用 `"status": "skipped"` 和 skip reason。`mode:agent` active 时不要 emit markdown tables。

## 质量门禁

Delivering review 前，verify：

1. **Every finding is actionable。** Re-read 每个 finding。如果它写 "consider"、"might want to" 或 "could be improved"，但没有 concrete fix，用 specific action rewrite。Vague findings 浪费 engineering time。
2. **No false positives from skimming。** 对每个 finding，verify surrounding code 确实已读取。检查 "bug" 是否已在同一 function 中 elsewhere handled，"unused import" 是否用于 type annotation，"missing null check" 是否由 caller guarded。
3. **Severity is calibrated。** Style nit 绝不是 P0。SQL injection 绝不是 P3。重新检查每个 severity assignment。
4. **Line numbers are accurate。** 根据 file content verify 每个 cited line number。指向 wrong line 的 finding 比没有 finding 更糟。
5. **Protected artifacts are respected。** Discard 任何建议 deleting 或 gitignoring `docs/brainstorms/`、`docs/plans/` 或 `docs/solutions/` 中 files 的 findings。
6. **Findings don't duplicate linter output。** 不要 flag 项目 linter/formatter 会捕获的内容（missing semicolons、wrong indentation）。聚焦 semantic issues。

## 语言感知条件

Stack-specific reviewers 只有当 diff 触及它们 specialize 的 runtime behavior（async UI races、iOS/Swift lifecycle）时才 fire：绝不只因 file extensions mechanically 触发；trigger 是该 stack runtime domain 中 meaningful changed behavior。Structural quality（complexity deletion、1k-line regressions、type-boundary leaks）属于 always-on `ce-maintainability-reviewer`；不要为 language conventions、philosophy 或 "strict bar" passes spawn extra reviewers。

## Review 后

Stage 6 后 stop。绝不要从此 skill push、open PRs 或 file tickets。Default（interactive）mode 中，Stage 5c 已经 applied，并且在 clean pre-review tree 上 committed safe fixes；在 `mode:agent` 中 review 不 mutate anything：caller（例如 `ce-work`）和用户使用 report 与 artifact apply fixes、file tickets 或 accept residual risk。

### Emit actionable findings summary（仅 default mode）

Stage 6 后，**default mode** 中 emit compact **Actionable Findings** summary 给 callers：

- 列出每个 actionable finding（`gated_auto` 或 `manual` 且 `downstream-resolver`），包含 stable `#`、severity、file:line、title、`autofix_class`、是否有 `suggested_fix`，以及 `confidence`。
- 如果写入 run-artifact path，包含它：`/tmp/compound-engineering/ce-code-review/<run-id>/`
- Actionable queue 为空时，明确说明 `Actionable findings: none.`。

在 `mode:agent` 中 **不要** emit 此 markdown summary：actionable findings 仅由 JSON object 的 `actionable_findings` field 承载。JSON object 后不要 emit 任何内容，让 response 保持 single parseable JSON value。

不要运行 post-review triage（无 per-finding walk-through、bulk ticket filing 或 routing questions）。Report 和 summary 是完整 handoff。

### Mode-specific completion（按 mode 完成）

| Mode | After Stage 6 + actionable summary |
|------|-----------------------------------|
| **Default** | Markdown tables + Actionable Findings summary。 |
| **`mode:agent`** | JSON object + run artifact dir 中的 `review.json`。 |

不要从此 skill offer push/PR/create-branch next steps。

#### Run artifacts（运行产物）

始终将 run artifacts 写入 `/tmp/compound-engineering/ce-code-review/<run-id>/`：

- synthesized findings（综合后的 findings）
- actionable findings list（可执行 findings 列表）
- advisory outputs（建议性输出）
- Stage 4 的 per-agent `{reviewer_name}.json`
- `report.md`：完全按呈现给用户的 rendered markdown report（仅 default mode），让 format 和 numbering 在 run 后仍 auditable

`metadata.json` minimum fields：

```json
{
  "run_id": "<run-id>",
  "branch": "<git branch --show-current at dispatch time>",
  "head_sha": "<git rev-parse HEAD at dispatch time>",
  "verdict": "<Ready to merge | Ready with fixes | Not ready>",
  "completed_at": "<ISO 8601 UTC timestamp>"
}
```

在 dispatch time capture `branch` 和 `head_sha`（之后不会 land in-skill fixes）。

## Fallback（降级路径）

如果平台不支持 parallel sub-agents，sequentially 运行 reviewers。如果平台支持 sub-agents 但限制 active concurrency，使用 Stage 4 的 bounded queueing rules，而不是将 cap-related spawn failures 视为 reviewer failures。其它内容（stages、output format、merge pipeline）保持不变。

---

## Included References（内联参考）

下方 files 在 load time inlined。Review output template **不** inline：Stage 6 按需加载它（`references/review-output-template.md`）。

### Persona Catalog（persona 目录）

@./references/persona-catalog.md

### Subagent Template（subagent 模板）

@./references/subagent-template.md

### Diff Scope Rules（diff scope 规则）

@./references/diff-scope.md

### Action class rubric（action class rubric）

@./references/action-class-rubric.md

### Findings Schema（findings schema）

@./references/findings-schema.json
