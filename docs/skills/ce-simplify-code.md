# `ce-simplify-code`

> Refine 最近改动的 code：三个 parallel reviewer agents 分别找 reuse、quality 和 efficiency 问题；应用 fixes；通过 typecheck、lint 和 scoped tests 验证 behavior preserved。

`ce-simplify-code` 是 **refinement** skill。它会做写完代码后很容易跳过的功课：搜索你的新代码是否意外重复了已有 utilities，标出 hacky patterns 和 dead code，指出遗漏的 efficiency wins。三个 parallel reviewer agents 从不同角度审同一个 diff：Reuse、Quality、Efficiency；orchestrator 应用 findings，然后验证 behavior 是否 preserved。

前提是 simplification 必须保留 exact functionality。Skill 通过在 fixes 后运行 typecheck、lint 和 scoped tests 来强制这一点。**它拒绝通过放松 assertions、削弱 type signatures 或跳过 tests 来让 checks pass**，因为那会破坏保证。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-simplify-code` 在 `/ce-work` Phase 3 中作为 quality gate 运行（diff >=30 changed lines），也可以在 open PR 前直接调用，用于 refine feature branch。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 对 recently-changed code spawn 三个 parallel reviewer agents，应用 findings，并验证 behavior preserved |
| 何时使用 | Open PR 前；写完 feature 后；AI 生成的 code 能跑但感觉 heavy 时 |
| 产出什么 | 就地更新的 code + summary，说明改了什么、哪些保持原样很好、运行了哪些 checks |
| 下一步 | 用 `/ce-commit-push-pr` 打开 PR |

---

## 问题

写完 feature 后，代码里通常会有当下容易漏掉的 refinement debt：

- **重复实现 utilities**：写了一个 string-trim helper，而 `lib/utils/` 已经有类似功能
- **Hacky patterns**：带细微差异的 copy-paste、redundant state、parameter sprawl、leaky abstractions
- **Dead code**：unused imports、没有引用的 exports、不再 reachable 的 code paths
- **Stringly-typed values**，而 codebase 中已经有 enum 或 branded type
- **Missed efficiency**：本可 parallel 的 sequential operations、redundant computations、N+1 patterns
- **解释 WHAT 的 comments**，而不是 non-obvious WHY；WHAT 通常已经由 identifiers 表达

单个 reviewer 能找到其中一些，但很少全部找到。要求 agent "review and improve" 往往只会浮现最明显的问题，漏掉需要 cross-cutting search 的问题。

## 方案

`ce-simplify-code` 运行三个 parallel reviewers，各自聚焦一个 dimension：

- **Reuse Reviewer** 搜索 new code 重复的 existing utilities
- **Quality Reviewer** 标记 hacky patterns、dead code、stringly-typed code、unnecessary comments、nested conditionals
- **Efficiency Reviewer** 找 missed concurrency、hot-path bloat、recurring no-op updates、broad operations

Orchestrator 聚合 findings、应用 fixes，并运行 typecheck + lint + scoped tests 验证 behavior preserved。

---

## 它的新意

### 1. 三个 parallel reviewer agents：不同角度，同一个 diff

单个 "review and improve" prompt 会收缩到 agent 最熟悉的方向。三个 reviewers 分别专注一个 dimension，能覆盖更大范围：

- **Reuse**：搜索 existing utilities 和 helpers；标记重复 existing functions 的 new functions；标记可以使用 existing utility 的 inline logic
- **Quality**：redundant state、parameter sprawl、带 variation 的 copy-paste、leaky abstractions、stringly-typed code、unnecessary wrappers（component-tree UI frameworks 中）、deeply nested conditionals、unnecessary comments、dead code / unused imports / unused exports
- **Efficiency（效率）**：unnecessary work（redundant computations、repeat reads）、missed concurrency、hot-path bloat、recurring no-op updates、TOCTOU pre-checks、memory issues、overly broad operations

### 2. Smart scope detection（智能范围检测）：user-named > git diff > recent edits

Skill 按优先级 resolve simplification scope：用户明确指定的 scope（某个 file、"the function I just wrote"）是 authoritative；否则用当前 branch 与 base 的 git diff；否则用 recent edits；否则询问而不是猜测。**User-named scope 永远不会被扩大。**

### 3. Behavior preservation verification（行为保持验证）

应用 fixes 后，skill 会对 project 运行 typecheck 和 lint，并运行 scoped 到 changed paths 的 tests（当 change 影响范围很大时会扩大，例如重写 heavily-imported utility）。Failures 会清楚显示 failing check name 和 relevant output。**Skill 拒绝通过放松 assertions、削弱 type signatures 或跳过 tests 来让 checks pass**；要么修复 simplification 引入的 underlying break，要么 revert 导致问题的 specific simplification。

### 4. Mid-tier model selection（中档模型选择）：cost-aware

Reviewer agents 会 dispatch 到 platform 的 mid-tier model。对 known diff 的 code review 不需要 top-tier reasoning。在无法使用 model override 的 platforms 上，skill 会省略 override，而不是让 dispatch 失败。

---

## 快速示例

你花了一小时写 notification-mute feature。Open PR 前调用 `/ce-simplify-code`。

Skill 检测到你在 feature branch，base 是 `origin/main`，于是把 diff 作为 scope，并并行 dispatch 三个 reviewers。

Reuse 返回三个 findings：新的 `formatDuration` function 几乎重复 `lib/utils/formatTime.ts`；inline path-handling logic 应使用 `path.join`；custom env check 应使用现有 `isProduction()` helper。

Quality 标记两个针对 `"active"` 和 `"paused"` 的 stringly-typed comparisons，而 codebase 已有 `SubscriptionStatus` union；一个 nested ternary chain 可以用 early returns 平铺；一个没人引用的 export；一条解释 well-named function 做什么的 comment。

Efficiency 发现单个 handler 中两个 API calls 可以 parallel，并且 polling loop 在每个 tick 都 dispatch state update，缺少 change-detection guard。

Orchestrator 应用所有 fixes（跳过一个它判断为 false positive 的 Quality finding）。它运行 typecheck（pass）、lint（pass）和 changed paths 的 scoped tests（pass）。Summary 会说明哪些内容本来就好、改了什么、运行了哪些 checks。

---

## 何时使用

在以下情况使用 `ce-simplify-code`：

- 已完成 feature，想在 open PR 前 refine
- AI 生成的 code 能工作但感觉 heavy
- Refactor 产生了 new utilities，想确认没有重复 existing ones
- Diff 触及 shared code，希望通过 checks 获得 behavior-preservation guarantee

以下情况跳过 `ce-simplify-code`：

- Diff 是 mechanical（formatting、dependency bumps、lint fixes、generated artifacts）；simplification 对这些没有收益
- Diff 很小（几行）；review overhead 超过收益
- 你明确想保留当前写法（例如教学或示例目的）

---

## 作为 Workflow 的一部分使用

当 diff >=30 changed lines 时，`ce-simplify-code` 会由 `/ce-work` Phase 3 自动调用；它会在 harness-native 或 `/ce-code-review` review tier 之前运行，让 reviewers 看到 simplified diff。它也常在 `/ce-commit-push-pr` 前手动调用，用来对多 session 中持续构建的 branch 做 refinement pass。

手动调用时的典型 flow：

```text
write code -> /ce-simplify-code -> /ce-commit-push-pr
```

---

## 单独使用

该 skill 在 chain 外同样有效：

- **Pre-PR refinement**：在 feature branch 上运行 `/ce-simplify-code`
- **Post-AI cleanup**：当 LLM 生成的 code 能 ship 但 over-engineered
- **Targeted refinement**：`/ce-simplify-code "the changes I made to NotificationDispatcher"` 会尊重 user-named scope
- **Single-file pass（单文件处理）**：`/ce-simplify-code app/services/notification_dispatcher.rb`

当在 git repository 外调用，或没有可用 diff 时，skill 会 fallback 到 conversation 中最近 modified files。如果两者都不能产生 non-empty scope，它会询问而不是猜测。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 默认：branch diff vs base；fallback 到 staged + unstaged；再 fallback 到 recent edits |
| `<file path>` | 把 scope 限制到该 file |
| `<description>` | 例如 "the function I just wrote"、"the changes from this morning"；user-named scope 是 authoritative |

---

## 常见问题

**为什么用三个 reviewers，而不是一个？**
单个 reviewer 会收缩到 agent 最熟悉的方向。三个 reviewers 分别聚焦一个 dimension（reuse / quality / efficiency），能并行覆盖更多地面，尤其是寻找 new code 重复 existing utilities 的 cross-cutting search；generalist reviewer 经常漏掉它。

**如果 finding 是错的或不值得处理怎么办？**
Orchestrator 会聚合 findings 并直接应用。如果 finding 是 false positive，会记录并跳过；skill 不会争论，也不会把它抛回给你。Summary 会说明实际处理了什么。

**如果应用 fixes 后 tests 失败怎么办？**
Skill 不会放松 assertions、削弱 type signatures 或跳过 tests 来掩盖 break。它要么修复 simplification 引入的 underlying issue，要么 revert 导致 regression 的 specific change。前提是 preserve exact functionality。

**为什么 simplification 不直接作为原始写代码的一部分？**
可以是，但实践中，找 existing utility 的时刻通常是专门搜索它的时候，而不是写 feature 的时候。一个带 parallel cross-cutting search 的独立 refinement pass 能抓到原始 write 没抓到的东西。

**它会跑在 tiny diffs 上吗？**
默认会针对 resolve 到的任何 scope 运行，但 tiny diffs（几行）的收益很低。在 `ce-work` 内，该 skill 因此以 >=30-line threshold gate。

---

## 另请参阅

- [`ce-work`](./ce-work.md) - 在 Phase 3 中对 significant size 的 diffs 调用此 skill
- [`ce-commit-push-pr`](./ce-commit-push-pr.md) - refinement pass 后通常的下一步
- [`ce-code-review`](./ce-code-review.md) - 更深的 code review skill；`ce-simplify-code` 是 complement，不是 substitute
