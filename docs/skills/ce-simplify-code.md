# `ce-simplify-code`

> Refine recently changed code — three parallel reviewer agents find reuse, quality, and efficiency issues; apply the fixes; verify behavior is preserved by typecheck, lint, and scoped tests.

`ce-simplify-code` is the **refinement** skill. It does the homework that's easy to skip after writing code: searches for existing utilities your new code accidentally duplicates, flags hacky patterns and dead code, surfaces missed efficiency wins. Three parallel reviewer agents work the same diff from different angles — Reuse, Quality, Efficiency — and the orchestrator applies their findings, then verifies behavior is preserved.

It's a **utility skill** — point it at whatever you want refined. With no argument it resolves the branch diff; given a file path or a description ("the function I just wrote") it scopes to exactly that. That makes it the natural cleanup pass for AI-generated code, which is its highest-yield use. Agents reliably write more code than a problem needs: industry analysis of hundreds of millions of changed lines shows duplicated and copy-pasted code climbing sharply since coding assistants went mainstream, while refactoring — moving and reusing existing code — has fallen by more than half. The reason is structural, not a model defect: an agent optimizes each fragment locally to *look* well-engineered without the whole-system context to notice that the helper already exists, that the abstraction is single-use, or that the comment restates the code. The result works but carries duplication, single-use wrappers, defensive over-engineering, and tutorial-style comments. `ce-simplify-code` exists to strip that back to what the change actually requires.

The premise is that simplification preserves exact functionality. The skill enforces this by running typecheck, lint, and scoped tests after fixes. **It refuses to relax assertions, weaken type signatures, or skip tests to make checks pass** — that defeats the guarantee.

The compound-engineering ideation chain is `/ce-ideate → /ce-brainstorm → /ce-plan → /ce-work`. `ce-simplify-code` runs automatically as a quality gate inside `/ce-work` Phase 3 (for diffs ≥30 changed lines) and as step 3 of the autonomous `/lfg` loop (before review, skipped for docs-only or trivial changes), and is directly invocable for refining a feature branch before you open a PR.

---

## TL;DR

| Question | Answer |
|----------|--------|
| What does it do? | Spawns three parallel reviewer agents on the recently-changed code, applies their findings, and verifies behavior is preserved |
| When to use it | Before opening a PR; after writing a feature; after AI generated code that works but feels heavy |
| What it produces | Updated code (in place) + a summary of what was changed, what was good as-is, which checks ran, and a quantified impact by dimension (fixes applied per reuse/quality/efficiency, skipped count, verification result) |
| What's next | Open the PR via `/ce-commit-push-pr` |

---

## The Problem

After writing a feature, the code usually has refinement debt that's easy to miss in the moment:

- **Re-implemented utilities** — you wrote a string-trim helper that already exists in `lib/utils/`
- **Hacky patterns** — copy-paste with slight variation, redundant state, parameter sprawl, leaky abstractions
- **Dead code** — unused imports, exports nothing references, code paths no longer reachable
- **Stringly-typed values** where an enum or branded type already exists
- **Missed efficiency** — sequential operations that could be parallel, redundant computations, N+1 patterns
- **Comments that explain WHAT** the code does (which the identifiers already do) instead of non-obvious WHY

A single reviewer can find some of these but rarely all. Asking the agent to "review and improve" tends to surface the most obvious issues and miss the ones that require cross-cutting search.

## The Solution

`ce-simplify-code` runs three parallel reviewers, each focused on one dimension:

- **Reuse Reviewer** searches for existing utilities the new code duplicates
- **Quality Reviewer** flags hacky patterns, dead code, stringly-typed code, unnecessary comments, nested conditionals
- **Efficiency Reviewer** finds missed concurrency, hot-path bloat, recurring no-op updates, broad operations

The orchestrator aggregates their findings, applies fixes, and runs typecheck + lint + scoped tests to verify behavior is preserved.

---

## What Makes It Novel

### 1. Three parallel reviewer agents — different angles, same diff

A single "review and improve" prompt collapses into the agent's most-trained directions. Three reviewers each focused on one dimension cover meaningfully more ground:

- **Reuse** — 搜索 existing utilities 与 helpers；标记重复 existing functionality 的 new functions、可改用 existing utility 的 inline logic，以及重新实现 language standard-library 或 runtime primitive 的 diff code（必须 behavior-equivalent，排除改变 UX 的替换）；还会标记手工维护 platform、framework 或 downstream layer 已验证 guarantee 的 code
- **Quality** — redundant state、parameter sprawl、带 variation 的 copy-paste（提议 merge 前先检查 duplicated construct 能否直接消除）、leaky abstractions、stringly-typed code、component-tree UI framework 中的 unnecessary wrappers、deeply nested conditionals、unnecessary comments、dead code / unused imports / unused exports
- **Efficiency** — unnecessary work (redundant computations, repeat reads), missed concurrency, hot-path bloat, recurring no-op updates, TOCTOU pre-checks, memory issues, overly broad operations

### 2. Smart scope detection — user-named > git diff > recent edits

The skill resolves the simplification scope in priority order: explicit user-named scope (a file, "the function I just wrote") is authoritative; otherwise the git diff between the current branch and its base; otherwise recent edits; otherwise it asks rather than guessing. **User-named scope is never widened.**

### 3. Behavior preservation verification

After applying fixes, the skill runs typecheck and lint over the project and runs tests scoped to the changed paths (broadening when the change has wide reach — e.g., a heavily-imported utility was rewritten). Failures are surfaced clearly with the failing check name and relevant output. **The skill refuses to relax assertions, weaken type signatures, or skip tests to make checks pass** — either fix the underlying break or revert the specific simplification that caused it. It also **never simplifies away a safety check** — input validation at trust boundaries, data-loss-preventing error handling, security checks, and accessibility affordances are preserved even when a finding frames them as removable boilerplate.

### 4. Mid-tier model selection — cost-aware

The reviewer agents are dispatched on the platform's mid-tier model. Code review of a known diff doesn't need top-tier reasoning. On platforms where the model override is unavailable, the skill omits the override rather than failing the dispatch.

### 5. 遵守 caller 传入的 structure pins

当 caller（`/ce-work` 或 `/lfg`）传入 plan path，且其中带 `session-settled:` 标签的 KTD 指定了 structural constraints 时，`ce-simplify-code` 会把这些 constraints 当作 pins：刻意重复的 block 继续保持重复，有意保留的 wrapper 也不会被移除。用户明确作出的 settled structural decision，不会只因为孤立来看似乎可以简化就被折叠。

---

## Quick Example

You've spent an hour writing a notification-mute feature. Before opening the PR, you invoke `/ce-simplify-code`.

The skill detects you're on a feature branch with a base of `origin/main`, takes the diff as the scope, and dispatches three reviewers in parallel.

Reuse comes back with three findings: your new `formatDuration` function is a near-duplicate of `lib/utils/formatTime.ts`; your inline path-handling logic should use `path.join` instead; a custom env check should use the existing `isProduction()` helper.

Quality flags two stringly-typed comparisons against `"active"` and `"paused"` where the codebase already has a `SubscriptionStatus` union; one nested ternary chain that flattens cleanly with early returns; an export that nothing references; one comment explaining what a well-named function does.

Efficiency identifies that two API calls in a single handler could run in parallel and that a polling loop dispatches a state update on every tick without a change-detection guard.

The orchestrator applies all the fixes (skipping one Quality finding it judges a false positive). It runs typecheck (pass), lint (pass), and scoped tests for the changed paths (pass). The summary names what was good, what was changed, which checks ran.

---

## When to Reach For It

Reach for `ce-simplify-code` when:

- You've finished a feature and want to refine before opening a PR
- AI generated code that works but feels heavy
- A refactor produced new utilities and you want to confirm they don't duplicate existing ones
- A diff has been touching shared code and you want a behavior-preservation guarantee with checks

Skip `ce-simplify-code` when:

- The diff is mechanical (formatting, dependency bumps, lint fixes, generated artifacts) — simplification has no useful yield on those
- The diff is tiny (a couple of lines) — review overhead exceeds yield
- You explicitly want the code as written (e.g., teaching or illustrative purposes)

---

## Use as Part of the Workflow

`ce-simplify-code` is invoked automatically by two workflows, always **before** the review step so reviewers see the simplified diff:

- **`/ce-work` Phase 3** — runs when a diff is ≥30 changed lines, ahead of the harness-native or `/ce-code-review` review tier.
- **`/lfg` step 3** — the autonomous build loop runs it on the branch diff after the build step and before code review. It's skipped only for docs-only changes (markdown/docs paths) or trivial ones (roughly under 10 changed lines), and it leaves its edits uncommitted so the loop's later commit step sweeps them up with the rest of the work.

It's also commonly invoked manually before `/ce-commit-push-pr`, when you want a refinement pass on a branch you've been building over multiple sessions.

The flow when manually invoked typically looks like:

```text
write code → /ce-simplify-code → /ce-commit-push-pr
```

---

## Use Standalone

The skill works just as well outside the chain:

- **Pre-PR refinement** — `/ce-simplify-code` on a feature branch before opening a PR
- **Post-AI cleanup** — point it at code an agent just generated to strip the duplication, single-use wrappers, and over-engineering agents tend to leave behind; this is its highest-yield use
- **Targeted refinement** — `/ce-simplify-code "the changes I made to NotificationDispatcher"` honors a user-named scope
- **Single-file pass** — `/ce-simplify-code app/services/notification_dispatcher.rb`

When invoked outside a git repository or when no diff is available, the skill falls back to the most recently modified files in the conversation. If neither produces a non-empty scope, it asks rather than guesses.

---

## 让它自动运行

`ce-simplify-code` 在一段 work 已经稳定下来时最有价值，而这恰好也是 commit 前最容易直接跳过的 checkpoint。可以在 agent instruction file 中添加 standing instruction，让 agent 在这个边界主动提出或直接运行 refinement pass，再进入 review 或 commit。

最容易出错的是 timing。这是针对 *settled* diff 的 pass，不应在每次 edit 后触发。若在 build 中途、每次单独修复后、仍在塑造 code 时运行，它反而会阻碍工作，重写你马上还要修改的 lines。应把它固定在 completion boundary：feature 已完成、即将打开 PR，或 logical unit 已收尾。下方措辞表达的正是这个 timing。

把 instruction 放进 repo 的 `AGENTS.md`/`CLAUDE.md`；若希望应用到每个 repo，则放进 global instruction file（`~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`）。

下面两个 variants 的差别是 interruption，不是 risk。`ce-simplify-code` 在设计上会保持 behavior：不削弱 tests 或 type signatures，不移除 safety check（validation、error handling、auth、escaping、accessibility），并在结束前运行 typecheck、lint 和 scoped tests。Edits 会落在当前 branch，和其他 change 一样由你在 commit 前 review。因此 auto-run 并不鲁莽，offer-first 也不等于更“安全”；选择更符合你工作方式的 variant：

**先询问**：agent 会暂停并提问，让你有机会拒绝或观察该 pass：

> When you finish a coherent unit of work — a feature is complete, or you're wrapping up to open a PR — and before you review, commit, or hand it off, offer once to invoke the `ce-simplify-code` skill on the changed code. Do this at that completion checkpoint only, not after every individual edit or intermediate fix while you're still building. Offer only when the accumulated diff has at least 10 substantive code lines and the skill hasn't already run since the last code edit. Do not offer for documentation- or Markdown-only changes; formatting-, lint-, or dependency/lockfile-only changes; generated or vendored files; other purely mechanical changes; or code you've said to keep as written.

**自动运行**：不发 prompt，直接在 boundary 运行；这个选项适合希望避免此时被打断的场景：

> When you finish a coherent unit of work — a feature is complete, or you're wrapping up to open a PR — and before you review, commit, or hand it off, automatically invoke the `ce-simplify-code` skill on the changed code. Do this at that completion checkpoint only, not after every individual edit or intermediate fix while you're still building. Run it only when the accumulated diff has at least 10 substantive code lines and the skill hasn't already run since the last code edit. Never run it for documentation- or Markdown-only changes; formatting-, lint-, or dependency/lockfile-only changes; generated or vendored files; other purely mechanical changes; or code you've said to keep as written.

Exclusions 是最关键的部分。三个 reviewers 在 *code* 中寻找 reuse、quality 和 efficiency 问题，因此只有 documentation 或 Markdown 的 diff 不会产生任何收益，只会浪费三次 subagent dispatch；这是过于积极的 standing instruction 最常见的无效开销。Mechanical churn（formatting、lint autofix、dependency bump、lockfile、generated 或 vendored output）也一样：deterministic diff 没有 simplification surface。应把这些条件保留为 hard exclusions，不要依赖 agent 自行推断“这次值不值得”；literal agents 往往会在两个方向都判断错误。

其他措辞同样经过刻意选择：

- **"when you finish a coherent unit of work … not after every edit"**：防止 pass 触发过于频繁。它用于 refine *settled* diff；若每次 intermediate fix 后运行，就会重新编辑仍在 build 的 code，反而不如不运行。Trigger 应绑定 completion boundary，而不是 change code 这个动作。
- **"invoke the `ce-simplify-code` skill"**，而不是 "run `/ce-simplify-code`"：instruction files 可能由 Codex、Gemini、Cursor 或 Claude Code 等任意 agent 读取，slash-command form 无法保证在每个平台上都能由 agent 调用。应引用 capability，而不是 keystroke。
- **"before review, commit, or handoff"**，而不是 "at the end of the session"：agent 无法可靠判断 session 是否已经*结束*，但能判断自己是否即将 review、commit 或把 change 交还给你；此时 diff 正应已经完成 refine。
- **"offer once"**：没有这一限制，offer-first instruction 会在每个 verification step 后重复询问。
- **"human-authored code"**，而不是 filename allowlist：tests、migrations 和包含 code 的 config 都可能有真实 simplification yield，因此边界是*你写下的 substantive code*，不是固定 extension list。混合 code 与 docs 的 diff 仍符合条件；reviewers 会把 scope 缩到 code。
- **"at least 10 substantive code lines"**：只有几行 change 时，收益低于 review overhead。10 与 `/lfg` 已使用的 floor 一致；若希望 policy 更安静、只对较大 change 触发，可提高到 30（`ce-work` 的 floor）。
- **"hasn't already run since the last code edit"**：`/ce-work` 和 `/lfg` 已在各自 flow 内运行该 pass，这一条件可避免 global instruction 重复执行刚刚完成的 pass，同时仍允许它处理你手动 build 的 branches。

Skill 自身也会防御无效调用：直接针对不含 code 的 scope 调用时，它会输出简短的 "nothing to simplify" note 并停止，不 dispatch reviewers。因此，上述 exclusions 属于双重保险；standing instruction 仍应带完整 gate（包括 size floor），因为完全不 invoke 比 invoke 后再 bail 更便宜。

---

## Reference

| Argument | Effect |
|----------|--------|
| _(empty)_ | Default: branch diff vs base; falls back to staged + unstaged; falls back to recent edits |
| `<file path>` | Limits scope to that file |
| `<description>` | e.g., "the function I just wrote", "the changes from this morning" — user-named scope is authoritative |

---

## FAQ

**Why three reviewers instead of one?**
A single reviewer collapses into the agent's most-trained directions. Three reviewers each focused on one dimension (reuse / quality / efficiency) cover meaningfully more ground in parallel — especially the cross-cutting search for existing utilities the new code duplicates, which a generalist reviewer often misses.

**What if a finding is wrong or not worth addressing?**
The orchestrator aggregates findings and applies them directly. If a finding is a false positive, it's noted and skipped — the skill doesn't argue or surface it back to you. The summary mentions what was acted on.

**What if applying fixes breaks tests?**
The skill won't relax assertions, weaken type signatures, or skip tests to paper over the break. Either it fixes the underlying issue introduced by the simplification, or it reverts the specific change that caused the regression. The premise is preservation of exact functionality.

**Why isn't simplification just part of the original write?**
It can be, but in practice the moment to find an existing utility is when you're searching for it, not when you're writing the feature. A separate refinement pass with parallel cross-cutting search catches things the original write didn't.

**Does it run for tiny diffs?**
默认情况下，它会针对最终 resolve 的 code scope 运行，但 tiny diff（只有几行）的收益很低。因此，自动 callers 会按 size 设 gate：`ce-work` 只在 diff 至少有 30 个 changed lines 时运行；`/lfg` 会跳过 docs-only 或 trivial（大约少于 10 个 changed lines）的 change。Skill 自身不按 size 设 gate：显式指定一个 small function 时，该 scope 仍具有权威性并会照常运行；size floor 属于 caller 和你添加的 [standing instruction](#让它自动运行) 的 cost policy。

**What if I point it at a docs-only or mechanical diff?**
Skill 会检测 resolved scope 是否不含 substantive code，例如只有 documentation/Markdown，或只有 generated、vendored、lockfile、纯 mechanical churn。此时它会输出简短的 "nothing to simplify" note 后停止，而不会 dispatch 三个注定找不到问题的 reviewers。面对 mixed diff 时，它会把 scope 缩到 code files 后继续。这个 self-guard 根据 change 的*类型*判断，而不是 size。

---

## See Also

- [`ce-work`](./ce-work.md) — calls this skill in Phase 3 for diffs of significant size
- `lfg` — the autonomous build loop runs this skill as step 3, before its review step
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) — usual next step after a refinement pass
- [`ce-code-review`](./ce-code-review.md) — the deeper code review skill; `ce-simplify-code` is a complement, not a substitute
