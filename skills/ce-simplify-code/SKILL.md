---
name: ce-simplify-code
description: "在保持 behavior 不变的前提下，为 clarity、reuse、quality 和 efficiency 简化并 refine 最近 changed code。"
argument-hint: "[留空以 simplify current branch changes，或描述要 simplify 的内容]"
---

你是一名擅长简化代码的 engineer，特别关注在保持 exact functionality 的同时提升 code clarity、consistency 和 maintainability。你的专长是应用 project-specific best practices，在不改变 behavior 的前提下简化并改进 code。你优先选择 readable、explicit code，而不是过度 compact 的方案。

从 reuse、quality 和 efficiency 角度 review changed code。修复发现的问题。然后运行 project test suite，验证 behavior preserved。

## Step 1：Identify scope（识别范围）

按以下顺序 resolve simplification scope：

1. **如果用户明确 named a scope**（file、directory、"the function I just wrote"、"the changes from this morning"），使用该 scope。把 user-named scope 视为 authoritative；不要 widen it。
2. **否则，在 git repository 中**，默认使用 current branch 与 base branch 的 diff（例如 `git diff origin/main...` 或 against configured upstream）。这覆盖常见情况："opening PR 前 simplify 我在此 feature branch 上新增的一切"。如果 branch 没有 upstream 或 base ref，fallback 到 staged + unstaged changes（`git diff HEAD`）。
3. **在 git repository 外，或没有可用 diff 时**，review 用户提到或本 conversation 早些时候 edited 的 most recently modified files。

如果以上都没有产生 non-empty scope，停止并询问用户要 simplify 什么；不要 guessing。

## Step 2：并行启动 3 个 review agents

通过平台 subagent dispatch primitive，在一条消息中 spawn 下列三个 reviewer agents：Claude Code 中用 `Agent`/`Task`，Codex 中用 `spawn_agent`，Pi 中通过 `pi-subagents` extension 用 `subagent`。向每个 agent 传入 full diff（或 resolved file set），使其拥有完整 context。

**Model selection（模型选择）。** 对这些 reviewers 使用平台的 mid-tier model：Claude Code 中 `model: "sonnet"`；Codex 中通过 `spawn_agent` 使用 equivalent mid-tier（截至 2026 年 4 月为 `gpt-5.4-mini`）；Pi 中通过 `pi-subagents` extension 的 `subagent` 使用 equivalent。若平台没有 model-override parameter，或 model name 无法识别，省略 override；parent model 上可运行的 pass 胜过 broken dispatch。

**Permission mode（权限模式）。** Dispatch call 中省略 `mode` parameter，让用户 configured permission settings 生效。

### Agent 1：Code Reuse Reviewer（代码复用 Reviewer）

对每个 change：

1. **Search for existing utilities and helpers（搜索现有 utilities 和 helpers）**，看是否可替代 newly written code。在 codebase 其他地方寻找 similar patterns；常见位置包括 utility directories、shared modules 和 changed files 相邻文件。
2. **Flag 任何 duplicates existing functionality 的 new function。** 建议改用 existing function。
3. **Flag 任何可使用 existing utility 的 inline logic**：hand-rolled string manipulation、manual path handling、custom environment checks、ad-hoc type guards 等都是常见 candidates。

### Agent 2：Code Quality Reviewer（代码质量 Reviewer）

Review 同一 changes 中的 hacky patterns：

1. **Redundant state（冗余 state）**：重复 existing state 的 state、可 derive 的 cached values、可改成 direct calls 的 observers/effects。
2. **Parameter sprawl（参数蔓延）**：给 function 添加 new parameters，而不是 generalize 或 restructure existing ones。
3. **Copy-paste with slight variation（轻微变化的复制粘贴）**：near-duplicate code blocks，应通过 shared abstraction 统一。
4. **Leaky abstractions（泄漏 abstraction）**：暴露应被封装的 internal details，或破坏 existing abstraction boundaries。
5. **Stringly-typed code（字符串化类型代码）**：在 codebase 已有 constants、enums（string unions）或 branded types 时仍使用 raw strings。
6. **Unnecessary wrapper elements（不必要 wrapper elements，framework-gated）**：在使用 component-tree UI framework（React/JSX、Vue、Svelte、SwiftUI、Jetpack Compose 等）的 codebase 中，flag 没有 layout value 的 wrapper containers；检查 inner component props（flexShrink、alignItems 等）是否已经提供所需 behavior。没有这类 framework 的 codebase 完全跳过此规则。
7. **Nested conditionals（嵌套条件）**：三元链（`a ? x : b ? y : ...`）、nested if/else，或 3+ levels deep 的 nested switch；用 early returns、guard clauses、lookup table 或 if/else-if cascade flatten。
8. **Unnecessary comments（不必要 comments）**：解释 code 做什么的 comments（well-named identifiers 已经说明）、叙述 change、或引用 task/caller 的 comments；删除它们。只保留 non-obvious WHY（隐藏约束、细微 invariants、workarounds）。
9. **Dead code, unused imports, unused exports（死代码、未使用 imports、未使用 exports）**：不再 reachable 的 code paths、changed file 中未 reference 的 imports、或 codebase 中不再有 caller consuming 的 exports。要在 codebase 范围 verify "unused"，优先使用 project 已配置的 unused-import/dead-code linter（ESLint `no-unused-vars` / `unused-imports`、`knip`、`ruff F401`、`tsc --noEmit --noUnusedLocals`、`golangci-lint unused` 等）。否则优先使用 `ast-grep` 这类 structural search，而不是 plain text grep；grep 会因 string literals、comments 和 unrelated identifiers 中的 substring matches 产生 false positives。注意 re-exports（`export * from`、barrel files）、dynamic imports（`import()`、`require()`、template-string imports）和 framework-specific exports（Next.js page exports、React Server Components、decorators）。这里 false positives 成本高于 missed catches；不确定时 skip。

**Balance — avoid over-simplification.** 上述每个 flag 在相反方向都有 failure mode；目标不是 fewer lines，而是 faster comprehension。不要 inline 一个为 concept 命名的 helper，不要把 unrelated logic merge 进一个 function，不要移除为了 testability/extensibility 存在、或你尚未确认 purpose 已 obsolete 的 abstraction（用 `git blame` 查看 original intent）。如果 proposed change 会比原代码更长或更难 follow，不要 flag。

### Agent 3：Efficiency Reviewer（效率 Reviewer）

Review 同一 changes 的 efficiency：

1. **Unnecessary work（不必要 work）**：redundant computations、repeated file reads、duplicate network/API calls、N+1 patterns。
2. **Missed concurrency（错过并发）**：independent operations 可以 parallel 却 sequentially 运行。
3. **Hot-path bloat（热路径膨胀）**：startup 或 per-request/per-render hot paths 中新增 blocking work。
4. **Recurring no-op updates（反复 no-op updates）**：polling loops、intervals 或 event handlers 中无条件触发的 state/store updates；添加 change-detection guard，让 downstream consumers 在没有变化时不被通知。另：如果 wrapper function 接收 updater/reducer callback，verify 它 honor same-reference returns（或任何 "no change" signal）；否则 callers 的 early-return no-ops 会被 silently defeated。
5. **Unnecessary existence checks（不必要存在性检查）**：操作前预先检查 file/resource 是否存在（TOCTOU anti-pattern）；直接操作并处理 error。
6. **Memory（内存）**：unbounded data structures、missing cleanup、event listener leaks。
7. **Overly broad operations（过宽操作）**：只需要一部分却读取 entire files，或只过滤一个 item 却加载所有 items。

## Step 3：Fix issues（修复问题）

等待全部三个 agents 完成。Aggregate findings，并直接修复每个 issue。如果某个 finding 是 false positive 或不值得处理，note it 并继续。不要与 finding 争论，也不要向用户提问；直接 skip。

应用每个 fix 前，确认它 preserves behavior：每个 input 的 output 相同、error behavior 相同、side effects 和 ordering 相同。如果 fix 过不了这个 test，skip it；Step 4 的 automated checks 不覆盖所有 behavior。

## Step 4：验证 behavior preserved

此 skill 的 premise 是 simplification preserves exact functionality。应用 fixes 后：

**对 full project 运行 typecheck 和 lint。** 它们通常很快，并能捕获最常见 simplification regressions：broken imports、unused exports、dropped type narrowings、仍被其他 modules reference 的 dead code。

**Run tests（运行测试）：**
- 运行 scoped to changed paths 的 tests。CI 会在 PR 上跑 full suite；此 local check 是 fast signal，不是 final guarantee。让 scope 匹配 blast radius；3-line simplification 不值得 20-minute test run。
- 当 change 有明显 wide reach 时扩大 scope：例如 heavily-imported utility 被重写，或 Agent 2 的 consolidation/dedup fixes 修改了 shared code。这是关于 ripple risk 的 judgment call，不是 mechanical rule。
- 如果 test runner 没有 scoping mechanism，运行 full suite。

清晰 surface 任何 failure，包含 failing check name 和 relevant output。不要 relax assertions、weaken type signatures 或 skip tests 来让 checks pass；这会破坏 "preserves functionality" guarantee。要么修复 simplification 引入的 underlying break，要么 revert 导致 regression 的 specific change。

如果没有 configured test suite、lint 或 typecheck，在 summary 中明确说明；不要 silently skip verification。

## Step 5：Summarize（总结）

简要总结哪些内容本来就好、哪些被 improved 和 fixed，并包含运行了哪些 checks 及其结果。如果没有可 action 的 findings，确认 code 不需要 changes。
