# Diff Scope Rules（Diff 范围规则）

这些规则适用于每个 reviewer。它们定义什么是“需要 review 的代码”，以及什么是 pre-existing context。

## Scope Discovery（范围发现）

按以下优先级确定要 review 的 diff：

1. **User-specified scope（用户指定范围）。** 如果 caller 传入了 `BASE:`、`FILES:` 或 `DIFF:` markers，精确使用该 scope。
2. **Working copy changes（工作副本变更）。** 如果存在 unstaged 或 staged changes（`git diff HEAD` 非空），review 这些 changes。
3. **Unpushed commits vs base branch（相对 base branch 的未推送提交）。** 如果 working copy 干净，review `git diff $(git merge-base HEAD <base>)..HEAD`，其中 `<base>` 是 default branch（main 或 master）。

SKILL.md 中的 scope step 会处理 discovery，并传入 resolved diff。除非 PR scope mode 要求（见下文），不需要自行运行 git commands。

## Remote scope（`pr-remote` 和 `branch-remote`）

当 review context 包含 `<pr-scope-mode>pr-remote</pr-scope-mode>` 或 `<pr-scope-mode>branch-remote</pr-scope-mode>` 时，working tree **不是**被 review 的 head。不要对 changed-file list 中的文件使用 Read/Grep 读取 workspace paths；它们可能与正在 review 的 branch 或 PR 不匹配。

改为：

- 当 context 中提供 `<pr-head-ref>` 或 `<branch-head-ref>` 时，优先使用 `git show <remote-head-ref>:<path>`。
- 否则只依赖提供的 `<diff>` 中的 diff hunks。
- 不要把 local workspace contents 当作 changed files finding 的证据。

## Evidence Tools（适配工具）

Recall 取决于如何查找相关代码。只读取 diff 并执行文本 `grep`，会漏掉通过 re-exports、aliases 和 barrel files 到达的 callers，也会误命中 strings、comments 或更长名称中的 identifiers。当 claim 依赖某个 symbol 的 callers、implementations，或某个 construct 是否在别处出现时，使用 harness 实际提供的最强 search，按以下顺序优先，并在某一 tier 不可用时向下回退：

1. **Symbol-aware search** — references/definitions/implementations capability（LSP 或同等 MCP tool），可追踪 text search 无法处理的 renames、re-exports 和 barrels。多数 reviewer harnesses 不提供此能力；缺失时直接进入下一 tier。
2. **Structural（AST）search** — `ast-grep` 等 syntax-tree matcher（可选，可能未安装）。判断“construct X 是否在别处出现”时，它优于 regex：它匹配 parsed tree、忽略 formatting，并跳过 `grep` 作为 false positives 返回的 string/comment hits。
3. **Text search（`grep`）** — 始终可用；适合真正 lexical 的检查（config keys、string literals、log messages），也是上述 tiers 不可用时的 fallback。

没有任何 tool 能做到完整覆盖：dynamic dispatch、reflection、dependency injection、string-keyed routes/config、generated code 和 external consumers 都会隐藏 usages。这只会影响依赖*穷尽*覆盖的 claim，例如“该 symbol 未使用”“没有其他位置调用它”“可以安全修改”。对于此类 claim，如果 coverage 仅来自 text search，或可能存在隐藏 construct，就在 `residual_risks` 中记录未解决边界（例如 `callsite completeness: grep-only`），或降低 finding 等级，而不是断言不存在风险或可以安全修改。不依赖穷尽覆盖的 finding 无需此说明。

在 `pr-remote` / `branch-remote` scope 中，这些 tiers 检查的是 working tree，而不是被 review 的 head；应应用上方 Remote scope rules（`git show` / `git grep <remote-head-ref>`），而不是 local search。

## Finding Classification Tiers

报告的每个 finding 都要根据它与 diff 的关系归入以下三层之一：

### Primary（直接变更的代码）

diff 中新增或修改的 lines。这是主要关注点。针对这些 lines 报告 findings 时可以用 full confidence。

### Secondary（紧邻上下文代码）

与 changed line 位于同一 function、method 或 block 中的 unchanged code。如果某个 change 引入的 bug 只有阅读 surrounding context 才能看出，报告它；但说明该 issue 存在于 new code 与 existing code 的交互中。

### Pre-existing（与此 diff 无关的既有问题）

位于 unchanged code 中、diff 未触碰且没有交互的 issues。在输出中将它们标记为 `"pre_existing": true`。它们单独报告，不计入 review verdict。当 history 是判断 pre-existing 的依据时，附上一行来自 targeted blame/log 的简洁 provenance evidence（参见 `subagent-template.md` 中 load-bearing line provenance rule）。

**规则：** 如果面对不包含 surrounding file 的同样 diff 时仍会标记同一 issue，它就是 pre-existing。如果 diff 让该 issue *newly relevant*（例如新的 caller 命中了既有 buggy function），它就是 secondary。
