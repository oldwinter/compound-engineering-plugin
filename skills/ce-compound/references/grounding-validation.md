# Grounding Validation（Phase 2.45）

在 Phase 2.45 运行时读取本文件。刚写好的 doc 会变成持久、可信任的 knowledge，未来 agents 会直接根据其 claims 行动，而不会重新验证。本 phase 在 claims compound 前将它们与现实对照：先做 deterministic mechanical pass（bundled script），再做 semantic pass（一个 read-only validator subagent）。两个 pass 都不是 hard gate；每个 flag 都需要 adjudication，因为 solution docs 可能合理地引用已删除 paths 和 pre-fix states。

## 哪棵 tree 是 ground truth

两类 claims 需要对照不同 trees 验证：

- **Code-behavior claims**（enum values、status semantics、limits、defaults）对照 **local working tree** 验证；它们描述本 session 的 work 在当前产生并验证的结果。
- **Merge-state claims**（"fixed in #1608"、"landed"、"shipped"）对照 **remote truth** 验证。Checkout 可能早于 merge，因此 `gh pr view`（或 tracker equivalent）是 primary，local git reachability 只是 fallback。Script 输出的 `INFO: worktree is N commits behind …` 行会告诉你：对这类 claim 而言，local tree 有多不可信。

运行 script 前，可选执行 `git fetch --quiet`（best-effort；失败或 offline 时静默跳过；network 绝不是 correctness dependency）。当 remote state 完全无法检查时，保留 claim，增加 as-of qualifier（"as of this writing"），并在 run report 中记录 degraded verification。

## Step 1：Adjudicate mechanical flags

Script 负责报告 flags；你负责决定如何处理每一个。只有三种 resolution：**fix**、**annotate** 或 **confirm intentional**。绝不自动 rewrite，也绝不自动 pass：

| Flag | 可能含义 | Resolution |
|------|----------|------------|
| 任何地方都找不到 path | Typo，或基于 memory 起草 | 修正 citation 或删除 claim |
| 当前缺少 path，upstream 存在 | Stale checkout | 对照 upstream 验证 claim；如果 doc 暗示 file 当前存在于 local，则添加 annotation |
| Path 被有意移除（doc 说已 removed/renamed） | Historical citation | 确认 surrounding prose 已标记为 historical（"removed by this fix"、"pre-fix state"）；如果缺少，则添加该 marker |
| SHA 无法 resolve | Fabricated，或来自其他 repo | 替换为 PR number，或删除 |
| SHA 只能从 HEAD reachable | Local-only commit；SHA 会在 rebase/squash merge 时改变 | 替换为 PR number |
| SHA 只能从 upstream reachable | Checkout 早于 merge | 保留，但增加 temporal qualifier；通过 `gh` 验证 landed claim |
| SHA 存在但 unreachable | 已被 rebase 掉的 commit | 替换为 PR number |
| scaffold（"Learning 3"、`{{…}}`） | Drafting-context leak | 始终 fix；rewrite 为真实 path 或 link |
| relative link 无法 resolve | Target 错误 | 修正 path |

如果当前 platform 无法 resolve script，以相同 scope 手动应用其 checks：扫描 body 中不存在的 cited paths、hex SHAs、`Learning(s) N` / `{{…}}` scaffold，以及 broken relative links。在 run output 中说明这是 manual check。不要静默跳过。

在本 step 或 Step 2 修改 body 后，重新运行 script，直到它报告 clean，或每个剩余 flag 都已确认为 intentional。

## Step 2：Semantic validator subagent（Full 和 headless；lightweight 跳过）

Dispatch **一个 generic read-only subagent**，覆盖 written solution doc，以及本次 run 新增或编辑的任何 `CONCEPTS.md` entries。Phase 2.4 entries 同样是 claims；从 session-level summary 写出 glossary entry，正是错误 semantics 进入 vocabulary 的方式。当 platform 提供对应能力时，使用与其他 reviewer subagents 相同的 mid-tier model class。使用下方模板构建 prompt；这是 canonical executable prompt contract，保留英文原文：

```
You are a grounding validator for documentation about to enter a permanent
knowledge store. You are read-only: never edit files. Inspect with Read,
Grep, Glob, git (non-mutating), and gh when available.

Inputs: the doc content below, the CONCEPTS.md entries below (if any), and
this staleness context: <INFO line from the mechanical script, or "none">.

Check every factual claim in three categories:

1. CODE-BEHAVIOR CLAIMS — assertions about how code behaves: enum values,
   status semantics, limits, defaults, ordering, state transitions. For
   each, locate the defining source in the current tree and quote the
   defining line(s) with file:line. Verdict: verified (with quote),
   contradicted (with the quote showing otherwise), or unverifiable
   (defining source not found).

2. MERGE-STATE CLAIMS — assertions that a change landed ("fixed in",
   "merged", "shipped in", "resolved by #N"). Primary check: gh pr view
   <n> --json state,mergedAt,baseRefName (remote truth). Fallback: git
   reachability from the upstream default branch. Verdict: verified,
   contradicted (e.g. PR open, not merged), or unverifiable (offline / no
   gh) — mark unverifiable as "degraded", do not guess.

3. INTERNAL COMPLETENESS — countable assertions ("six PRs", "three root
   causes", "all N consumers"). Count the substantiating items in the doc
   itself. Verdict: complete, or short (found M of N).

Ignore session narrative ("we first tried X") — that describes the
conversation, not the tree. Ignore style.

Return a structured list, one entry per claim checked:
  claim (verbatim) | category | verdict | evidence (quote + file:line, or
  command output) | suggested edit (only for non-verified claims)
```

**Orchestrator 处理 verdicts 的方式：**

- **contradicted** → 使用 quoted evidence 修正 doc；quote 而不是 conversation 才是 authoritative
- **unverifiable**（behavior）→ 软化或归因，例如 "per this session's conclusion…"；或删除 claim
- **unverifiable/degraded**（merge-state）→ 保留但增加 as-of qualifier；在 report 中记录 degraded verification
- **short**（completeness）→ 补全 enumeration，或把 count 改为与 doc 实际支撑的数量一致
- **verified** → 不改变

## Reporting（报告）

在 run output 中用一行总结该 phase（headless report 的 `Grounding:` 行；interactive success output）：包含已 adjudicate 的 flags（fixed / annotated / confirmed）、已检查的 claims、已软化或修正的 claims，以及适用时的 `degraded — merge-state claims unverified offline`。
