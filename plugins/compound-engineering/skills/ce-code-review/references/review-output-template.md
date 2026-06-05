# Code Review Output Template（代码审查输出模板）

呈现 synthesized review findings 时使用此**精确格式**；该示例是 **canonical skeleton：复制它的结构并填充内容**，不要重新推导 layout。Findings 按 severity 分组，而不是按 reviewer 分组。

**IMPORTANT（重要）：** 使用 pipe-delimited markdown tables（`| col | col |`）。不要使用 ASCII box-drawing characters。

**IMPORTANT（重要）：** 转义 table cells 中的 literal pipe characters。任何出现在 finding title、issue description、code snippet、regex pattern 或 delimited-string example 中的 `|`（例如 `userName + "|" + groups` 这类 cache key examples）都必须写成 `\|`，让 column boundaries 只由未转义 pipes 决定。未转义 pipes 会把 cell 拆到多个 columns，并破坏该 row 的 `Reviewer` 和 `Confidence` 值（以及 Actionable Findings table 中的 `Route`）。

## Example（示例）

```markdown
## Code Review Results

**Scope:** merge-base with the review base branch -> working tree (14 files, 342 lines)
**Intent:** Add order export endpoint with CSV and JSON format support
**Mode:** interactive

**Reviewers:** correctness, testing, maintainability, security, api-contract
- security -- new public endpoint accepts user-provided format parameter
- api-contract -- new /api/orders/export route with response schema

### Applied (safe, verified)

| # | File | Fix | Reviewer |
|---|------|-----|----------|
| 6 | `export_helper_test.rb:40` | Added missing test for the empty-format branch | testing |
| 7 | `orders_controller.rb:88` (+test) | Tightened export file perms `0644 -> 0600` (security-posture — verify in diff) | security |

Validation: export tests 11 -> 13; suite 214 pass, lint clean.
Committed: `fix(review): cover empty-format branch + tighten export perms` (working tree was clean before review).

### P0 -- Critical

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 1 | `orders_controller.rb:42` | User-supplied ID in lookup, no ownership check | security | 100 |

- **#1** — `find(params[:id])` on the export path has no `where(account: current_account)` scope, so any authenticated user can export another account's orders. Scope the lookup to the current account.

### P1 -- High

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 2 | `export_service.rb:87` | Loads all orders into memory -- unbounded | performance | 100 |
| 3 | `export_service.rb:91` | No pagination contract | api-contract, performance | 75 |

- **#2** — `Order.where(...).to_a` materializes the full result set; a large account OOMs the worker. Stream with `find_each` or paginate.
- **#3** — the endpoint returns every row in one response; needs a cursor/page contract before GA. Design decision — see Actionable Findings.

### P2 -- Moderate

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 4 | `export_service.rb:45` | No error handling for CSV serialization failure | correctness | 75 |

### P3 -- Low

| # | File | Issue | Reviewer | Confidence |
|---|------|-------|----------|------------|
| 5 | `export_helper.rb:12` | Format detection could use an early return | maintainability | 75 |

### Actionable Findings

| # | File | Issue | Route | Notes |
|---|------|-------|-------|-------|
| 1 | `orders_controller.rb:42` | Ownership check missing on export lookup | `gated_auto -> downstream-resolver` | `suggested_fix` present — caller decides whether to apply |
| 3 | `export_service.rb:91` | Pagination contract needs a broader API decision | `manual -> downstream-resolver` | Needs design input before implementation |

### Pre-existing Issues

| # | File | Issue | Reviewer |
|---|------|-------|----------|
| 1 | `orders_controller.rb:12` | Broad rescue masking failed permission check | correctness |

### Learnings & Past Solutions

- [Known Pattern] `docs/solutions/export-pagination.md` -- previous export pagination fix applies to this endpoint

### Agent-Native Gaps

- New export endpoint has no CLI/agent equivalent -- agent users cannot trigger exports

### Deployment Notes

- Pre-deploy: capture baseline row counts before enabling the export backfill
- Verify: `SELECT COUNT(*) FROM exports WHERE status IS NULL;` should stay at `0`
- Rollback: keep the old export path available until the backfill has been validated

### Coverage

- Suppressed: 2 findings below anchor 75 (1 at anchor 50, 1 at anchor 25)
- Residual risks: No rate limiting on export endpoint
- Testing gaps: No test for concurrent export requests

---

> **Verdict:** Ready with fixes
>
> **Reasoning:** 1 critical auth bypass must be fixed. The memory/pagination issues (P1) should be addressed for production safety.
>
> **Fix order:** P0 auth bypass -> P1 memory/pagination -> P2 error handling if straightforward
```

## Anti-patterns（反模式）

不要产出如下输出。下面是错误示例：

```markdown
Findings

Sev: P1
File: foo.go:42
Issue: Some problem description
Reviewer(s): adversarial
Confidence: 75
Route: advisory -> human
────────────────────────────────────────
Sev: P2
File: bar.go:99
Issue: Another problem
```

它失败的原因是：没有 pipe-delimited tables、没有按 severity 分组的 `###` headers、使用了 box-drawing horizontal rules、没有 numbered findings、没有 `## Code Review Results` title，并且 verdict 不在 blockquote 中。始终使用上方示例中的 table format。当某个 finding 需要的解释超过简短 `Issue` cell 能承载的内容时，将其放到 table 下方 keyed detail list（`- **#N** — …`）中；绝不要展开成以 `Field:` 为前缀的 blocks。

## Formatting Rules（格式规则）

- **Pipe-delimited markdown tables** 用于 findings；绝不要使用 ASCII box-drawing characters，也不要在 entries 之间使用 per-finding horizontal-rule separators（verdict 前的 report-level `---` 仍然必需）
- **转义 table cells 中的 literal `|`**；任何出现在 finding title、issue description、code snippet、regex pattern 或 delimited-string example 中的 `|` 都必须写成 `\|`。未转义 pipes 会被解析为 column separators，破坏该 row 的 `Reviewer` 和 `Confidence` columns（以及 Actionable Findings table 中的 `Route`）。尤其适用于 cache-key delimiter examples、regex alternations 和 findings 中引用的 logical-OR operators。
- **Severity-grouped sections**：`### P0 -- Critical`、`### P1 -- High`、`### P2 -- Moderate`、`### P3 -- Low`。省略空 severity levels。
- **Stable sequential finding numbers**：排序后只分配一次 finding numbers，跨 severity sections 连续编号，并在 findings 重复出现在 Actionable Findings 中时复用同一编号。不要在每个 severity 或 route bucket 中从 `1` 重新开始。
- **Always include file:line location（始终包含 file:line 位置）**，用于 code review issues
- **Reviewer column** 显示哪些 persona(s) 标记了 issue。多个 reviewers = cross-reviewer agreement。
- **Confidence column** 以整数显示 finding 的 anchor（`50`、`75` 或 `100`）。绝不要渲染为 float。
- **per-severity tables 中没有 `Route` column**；synthesized route（``<autofix_class> -> <owner>``）只出现在 Actionable Findings table 和 `mode:agent` JSON 中。可扫描的 severity tables 是 5 columns：`# | File | Issue | Reviewer | Confidence`。
- **Detail line（按 finding 需要）**：将 `Issue` cell 保持为**一个短 clause**（大约 12 个词或更少，不要第二句；它是 scannable index，不是解释）；完整解释放在 severity table 下面的 bullet list 中，使用 stable `#` 作为 key：`- **#N** — <why it matters + concrete fix direction>`。对 one-liner 不足以自解释的 findings 添加 detail line，通常是 P0/P1；P2/P3 通常只需简短项。这个 keyed list 是允许承载深度的地方；绝不要把 finding 展开成 `Field:`-prefixed blocks。
- **Header includes（Header 包含项）**：scope、intent 和 reviewer team，并包含 per-conditional justifications
- **Mode line**：包含 `interactive` 或 `agent`
- **Applied section（仅 default mode）**：当 review 已应用 fixes（Stage 5c）时，先列出它们，放在 severity tables 前，格式为 `# | File | Fix | Reviewer`，随后是一行 validation outcome（例如 "suite 214 pass, lint clean"）和 **commit status**：如果 review 前 working tree 干净，则作为 isolated review-labeled fix commit 提交（`fix(review): …`，或当 `review` 不是允许 scope 时使用 repo 最接近 convention）；如果 working tree 已经 dirty，则保持 uncommitted（留给用户 commit）。跨多个文件的 fix 是**一行一个 `#`**（例如 `controller.rb:88 (+test)`），绝不要跨行重复编号。对 green-but-unverifiable edits（auth/contract/concurrency）在 `Fix` cell 中 inline 标记，例如 `(security-posture — verify in diff)`。Applied findings 保留其 stable `#`，且只出现在这里，不出现在 severity tables 中。在 `mode:agent` 或没有 applied 内容时省略。
- **Actionable Findings section**：当 actionable queue 非空时包含（供 caller 处理的 findings）
- **Pre-existing section**：单独 table，没有 confidence column（这些是 informational）
- **Learnings & Past Solutions section**：来自 ce-learnings-researcher 的结果，并链接到 docs/solutions/ files
- **Agent-Native Gaps section**：来自 ce-agent-native-reviewer 的结果。没有 gaps 时省略。
- **Deployment Notes section**：来自 ce-deployment-verification-agent 的关键 checklist items。该 agent 未运行时省略。Schema drift 作为 `data-migration` findings 暴露，不另设 section。
- **Coverage section**：suppressed count、residual risks、testing gaps、failed reviewers（失败的 reviewers）
- **Summary uses blockquotes**，用于 verdict、reasoning 和 fix order
- **Horizontal rule**（`---`）将 findings 与 verdict 分隔
- **`###` headers** 用于每个 section；绝不要使用 plain text headers

## Agent mode (JSON)（Agent 模式）

当 `mode:agent` 激活时，**不要**输出上方 markdown table report。以**一个可解析 JSON object** 作为 primary response，并将同一 payload 写入 `/tmp/compound-engineering/ce-code-review/<run-id>/` 下的 `review.json`。

contract 定义在 SKILL.md 的 **`### JSON output format (`mode:agent` only)`** 下。Minimum fields：`status`、`verdict`、`scope`、`intent`、`reviewers`、`findings`、`actionable_findings`、`artifact_path`、`run_id`。

与 interactive markdown format 的关键差异：

- **No pipe-delimited tables**：findings 是带 merged fields 的 JSON arrays（`#`、`title`、`severity`、`file`、`line`、`confidence`、`autofix_class`、`owner`、`suggested_fix`、`why_it_matters`、`evidence`、`reviewers` 等）。
- **`actionable_findings`**：caller apply workflows 的 subset（`gated_auto` / `manual` with `downstream-resolver`）。
- **没有 `applied_fixes`，也没有 Applied section**：`mode:agent` 不应用 fixes；由 caller 执行。Applied work 只出现在 default-mode markdown（Stage 5c/6）中。handoff 是 `actionable_findings`。
- **Failure/degraded paths**：`{"status":"failed","reason":"..."}` 或带 reason 的 `"status":"degraded"`；绝不要将 markdown tables 混入 JSON response。
- **Stable `#`**：与 Stage 5 synthesis 相同的编号，携带在 JSON finding objects 中，用于下游 apply/residual tracking。
