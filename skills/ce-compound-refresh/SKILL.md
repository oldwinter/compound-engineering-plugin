---
name: ce-compound-refresh
description: 通过对照 current codebase review docs/solutions/ 下 stale learning 和 pattern docs，然后更新、consolidate 或删除 drifted docs。用户要求 "refresh my learnings"、"audit docs/solutions/"、"clean up stale learnings"、"consolidate overlapping docs"，或 ce-compound 标记 older doc 被 superseded 时使用。除非用户明确指向 docs/solutions/，不要为 general refactor、debugging 或 code-review work 触发。
argument-hint: "[optional: scope hint — directory, filename, module, 或 keyword] [mode:headless] "
---

# Compound Refresh（复利刷新）

长期维护 `docs/solutions/` 的质量。此 workflow 会对照 current codebase review existing learnings，然后 refresh 依赖它们的任何 derived pattern docs。

## Mode Detection（模式检测）

检查 `$ARGUMENTS` 是否包含 `mode:headless`。如果存在，从 arguments 中移除它（剩余内容作为 scope hint），并以 **headless mode** 运行。

| Mode（模式） | When（何时） | Behavior（行为） |
|------|------|----------|
| **Interactive**（default） | User 在场且可以回答问题 | 针对 ambiguous cases 询问 decisions，确认 actions |
| **Headless** | arguments 中有 `mode:headless` | 无 user interaction。Apply 所有 unambiguous actions（Keep、Update、Consolidate、auto-Delete、Replace with sufficient evidence）。将 ambiguous cases 标为 stale。最后生成 summary report。 |

### Headless Mode Rules（Headless 模式规则）

- **跳过所有 user questions。** 绝不暂停等待 input。
- **处理 scope 内所有 docs。** 不问 scope narrowing questions：如果没有提供 scope hint，就处理全部。
- **尝试所有 safe actions：** Keep（no-op）、Update（fix references）、Consolidate（merge 并 delete subsumed doc）、auto-Delete（满足 unambiguous criteria）、Replace（evidence sufficient 时）。如果 write 成功，将其记录为 **applied**。如果 write 失败（例如 permission denied），在 report 中将 action 记录为 **recommended** 并继续：不要停止或询问 permissions。
- **不确定时标为 stale。** 如果 classification 确实 ambiguous（Update vs Replace vs Consolidate vs Delete），或 Replace evidence insufficient，就在 frontmatter 中用 `status: stale`、`stale_reason` 和 `stale_date` 标为 stale。如果连 stale-marking write 都失败，将其作为 recommendation 纳入。
- **使用 conservative confidence。** Interactive mode 中 borderline cases 询问用户。Headless mode 中 borderline cases 标为 stale。宁可 stale-marking，也不要 incorrect action。
- **始终生成 report。** Report 是 primary deliverable。它有两个 sections：**Applied**（成功写入的 actions）和 **Recommended**（无法写入的 actions，带 full rationale，供 human apply 或 interactively 运行 skill）。无论 granted permissions 如何，report structure 相同：唯一差异是每个 action 落在哪个 section。

## CONCEPTS.md Bootstrap Requests（引导请求）

如果 invocation 明确是创建或 bootstrap `CONCEPTS.md`（例如 "create a CONCEPTS.md"、"build the concept map"、"set up shared vocabulary"），intent 在两个 jobs 之间 ambiguous：building vocabulary file 与 running docs/solutions refresh。因此继续前先 disambiguate。使用平台 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中展示 numbered options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。两个 options：

1. **Create CONCEPTS.md（build the concept map）**：seed repo-wide concept map 并 commit；仅跳过 docs/solutions classification phases（Phases 0–4）。读取 `references/concepts-vocabulary.md` 并遵循其 **Seed goal** 和 **Scope of a seed**（repo-wide）rules：从 declared domain model（schema、core types、primary models、top-level domain docs）seed 项目的 core domain nouns，每个都满足 qualifying bar，数量由 codebase 决定。写入 preamble（见 Phase 4.5），按 organization rules cluster，并运行 Discoverability Check，让 `AGENTS.md`/`CLAUDE.md` surface 新 file。然后 **进入 Phase 5（Commit Changes）**，通过 refresh 使用的同一 durable-write flow commit/PR 新 `CONCEPTS.md` 和任何 instruction-file edit：不要让 bootstrap 保持 uncommitted。
2. **Run a refresh cycle**：继续下方 normal refresh flow；`CONCEPTS.md` 作为 Phase 4.5 的一部分被 seeded（若缺失）并 reconciled。

Headless mode 中没有 user 可问：default 到 refresh cycle（无论如何 vocabulary 都会在 Phase 4.5 内 seeded 并 reconciled），并在 report 中说明未运行 standalone repo-wide bootstrap。

## Interaction Principles（交互原则）

**这些 principles 仅适用于 interactive mode。Headless mode 中跳过所有 user questions，并应用上方 headless mode rules。**

遵循与 `ce-brainstorm` 相同的 interaction style：

- **一次只问一个问题**：使用平台 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 plain text 中展示 numbered options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题
- 当存在 natural options 时，优先 **multiple choice**
- 从 **scope and intent** 开始，然后仅在需要时 narrow
- 在有 evidence 前，**不要** 要求用户做 decisions
- 先给 recommendation，并简要解释

目标不是强迫用户走 checklist，而是用最小 friction 帮助他们做出好的 maintenance decision。

## Refresh Order（刷新顺序）

按以下顺序 refresh：

1. 先 review relevant individual learning docs
2. 记录哪些 learnings 仍 valid、被 updated、被 consolidated、被 replaced 或被 deleted
3. 然后 review 依赖这些 learnings 的任何 pattern docs

为什么按这个顺序：

- learning docs 是 primary evidence
- pattern docs 派生自一个或多个 learnings
- stale learnings 会让 pattern 看起来比实际更 valid

如果用户一开始命名了 pattern doc，可以从那里开始理解 concern，但修改 pattern 前要 inspect supporting learning docs。

## Maintenance Model（维护模型）

对每个 candidate artifact，将其 classify 为五种 outcomes 之一：

| Outcome（结果） | Meaning（含义） | Default action（默认动作） |
|---------|---------|----------------|
| **Keep** | 仍 accurate 且仍 useful | 默认 no file edit；report 它已 review 且仍 trustworthy |
| **Update** | Core solution 仍 correct，但 references drifted | Apply evidence-backed in-place edits |
| **Consolidate** | 两个或更多 docs heavily overlap，但都 correct | 将 unique content merge 到 canonical doc，delete subsumed doc |
| **Replace** | Old artifact 现在 misleading，但已有 known better replacement | 创建 trustworthy successor，然后 delete old artifact |
| **Delete** | 不再 useful、applicable 或 distinct | Delete file：如需恢复，git history 会保留它 |

## Core Rules（核心规则）

1. **Evidence informs judgment.** 下方 signals 是 inputs，不是 mechanical scorecard。使用 engineering judgment 判断 artifact 是否仍 trustworthy。
2. **Prefer no-write Keep.** 不要只为了留下 review breadcrumb 而 update doc。
3. **Match docs to reality, not the reverse.** 当 current code 与 learning 不同时，update learning 以反映 current code。此 skill 的职责是 doc accuracy，不是 code review：不要问用户 code changes 是否 "intentional" 或 "a regression."。如果 code 变了，doc 应匹配。如果用户认为 code 错了，那是此 workflow 之外的 separate concern。
4. **Be decisive, minimize questions.** 当 evidence 清晰（file renamed、class moved、reference broken），apply update。Interactive mode 中，只有 right action 真正 ambiguous 时才问用户。Headless mode 中，mark ambiguous cases as stale 而不是询问。目标是 automated maintenance，并在 judgment calls 上保留 human oversight，而不是每个 finding 都问问题。
5. **Avoid low-value churn.** 不要为了 typo、polish wording 或 cosmetic changes 编辑 doc，除非这些 materially improve accuracy or usability。
6. **Use Update only for meaningful, evidence-backed drift.** Paths、module names、related links、category metadata、code snippets 和明显 stale wording 都可以修复，前提是 materially improves accuracy。
7. **Use Replace only when there is a real replacement.** 这意味着以下至少一项成立：
   - current conversation 包含 recently solved、verified replacement fix，或
   - 用户提供了足够 concrete replacement context，可 honestly document successor，或
   - codebase investigation 找到 current approach，且可将其 document 为 successor，或
   - newer docs、pattern docs、PRs 或 issues 提供 strong successor evidence。
8. **当 code gone 时 delete，且必须先检查 inbound links。** 如果 referenced code、controller 或 workflow 已不在 codebase 中，且找不到 successor，delete file：不要因为 general advice 仍然 "sound" 就 default to Keep。Keep 和 Delete 拿不准时，问用户（interactive mode）或标为 stale（headless mode）。Inbound links 影响 classification，而不是 cleanup：cleanup 始终是 mechanical，但 **decorative** citations（principle stated inline）允许 Delete，而 **substantive** citations（citing doc 依赖 cited doc）表示 Replace。Auto-delete case 是 missing code、无 matching successor，且 citations absent 或 decorative。
9. **Evaluate document-set design, not just accuracy.** 除了检查每个 doc 是否 accurate，还要评估它是否仍是 right unit of knowledge。如果两个或多个 docs heavily overlap，判断它们是否应保持 separate、需要更清楚 cross-scoped，或 consolidated into one canonical document。Redundant docs 很危险，因为它们会 silently drift：两个说同一件事的 docs 最终会说出不同内容。
10. **Delete, don't archive.** 不存在 `_archived/` directory。当 doc 不再 useful，delete 它。Git history 会保留每个 deleted file：那就是 archive。Dedicated archive directory 会制造问题：archived docs 积累、污染 search results，且没人阅读。如果有人需要 deleted doc，`git log --diff-filter=D -- docs/solutions/` 能找到。

## Scope Selection（范围选择）

从 discover `docs/solutions/` 下的 learnings 和 pattern docs 开始。

排除：

- `README.md`
- `docs/solutions/_archived/`（legacy — 如果此 directory 存在，在 report 中标记为需要 cleanup）

查找 `docs/solutions/` 下所有 `.md` files，排除 `README.md` files 和 `_archived/` 下任何内容。如果 `_archived/` directory 存在，在 report 中将其记录为应 cleanup 的 legacy artifact（files 要么 restored，要么 deleted）。

如果提供了 `$ARGUMENTS`，继续前用它 narrow scope。按顺序尝试这些 matching strategies，在第一个产生 results 的策略处停止：

1. **Directory match**：检查 argument 是否匹配 `docs/solutions/` 下的 subdirectory name（例如 `performance-issues`、`database-issues`）
2. **Frontmatter match**：在 learning frontmatter 的 `module`、`component` 或 `tags` fields 中搜索 argument
3. **Filename match**：匹配 filenames（partial matches 可以）
4. **Content search**：将 argument 作为 keyword 搜索 file contents（对 feature names 或 feature areas 有用）

如果没有 matches，报告该结果并请用户 clarify。Headless mode 中，如果提供了 scope hint 但没有匹配结果，在 summary 中报告 miss 并退出，不要 widen 到 all docs：不要静默 fallback 到 processing everything。（Headless mode rules 中的 "process everything" 规则只在 **没有** 提供 scope hint 时适用。）

如果没有找到 candidate docs，报告：

```text
No candidate docs found in docs/solutions/.
Run `ce-compound` after solving problems to start building your knowledge base.
```

## Phase 0：Assess and Route（评估与路由）

在要求用户 classify 任何内容前：

1. 发现 candidate artifacts
2. 估算 scope
3. 选择适配的 lightest interaction path

### Route by Scope（按范围路由）

| Scope（范围） | When to use it（何时使用） | Interaction style（交互方式） |
|-------|----------------|-------------------|
| **Focused** | 1-2 个 likely files，或用户命名了 specific doc | 直接 investigate，然后呈现 recommendation |
| **Batch** | 最多约 8 个 mostly independent docs | 先 investigate，然后呈现 grouped recommendations |
| **Broad** | 9+ docs、ambiguous，或 repo-wide stale-doc sweep | 先 triage，再分 batches investigate |

### Broad Scope Triage（广范围分诊）

当 scope broad（9+ candidate docs）时，deep investigation 前先做 lightweight triage：

1. **Inventory**：读取所有 candidate docs 的 frontmatter，按 module/component/category 分组
2. **Impact clustering**：识别 learnings + pattern docs 最密集的 areas。覆盖同一 module 的 5 个 learnings 和 2 个 patterns 组成的 cluster，比 5 个孤立 single-doc areas 影响更高，因为一个 doc stale 很可能影响其它 docs。
3. **Spot-check drift**：对每个 cluster，检查 primary referenced files 是否仍存在。High-impact cluster 中的 missing references = 最强 starting signal。
4. **Recommend a starting area**：展示 highest-impact cluster，附 brief rationale，并请用户 confirm 或 redirect。Headless mode 中跳过问题，并按 impact order 处理所有 clusters。

示例：

```text
Found 24 learnings across 5 areas.

The auth module has 5 learnings and 2 pattern docs that cross-reference
each other — and 3 of those reference files that no longer exist.
I'd start there.

1. Start with auth (recommended)
2. Pick a different area
3. Review everything
```

不要现在询问 action-selection questions。先 gather evidence。

## Phase 1：Investigate Candidate Learnings（调查候选 Learnings）

对 scope 内每个 learning，读取它，将其 claims 与 current codebase cross-reference，并形成 recommendation。

Learning 有多个 dimensions 可能独立 go stale。Surface-level checks 能捕获 obvious drift，但 staleness 常藏得更深：

- **References**：它提到的 file paths、class names 和 modules 是否仍存在，或已经移动？
- **Recommended solution**：fix 是否仍匹配今天 code 实际工作方式？一个 renamed file 如果 implementation pattern 完全不同，就不只是 path update。
- **Code examples**：如果 learning 包含 code snippets，它们是否仍反映 current implementation？
- **Related docs**：cross-referenced learnings 和 patterns 是否仍 present 且 consistent？
- **Auto memory**（仅 Claude Code）：注入 system prompt 的 auto-memory block 是否包含同一 problem domain 中的 entries？直接扫描该 block。如果 block 不存在，跳过此 dimension。描述与 learning recommendation 不同 approach 的 memory note 是 supplementary drift signal。
- **Overlap**：investigating 时，注意 scope 中是否有另一个 doc 覆盖相同 problem domain、reference 相同 files，或推荐 similar solution。对每个 overlap，记录：两个 file paths、哪些 dimensions overlap（problem、solution、root cause、files、prevention），以及哪个 doc 看起来 broader 或更 current。这些 signals 进入 Phase 1.75（Document-Set Analysis）。
- **Vocabulary**：记录 learning 引用的 domain terms（entities、named processes、status concepts with project-specific meaning）。对每个 term：它是否出现在 `CONCEPTS.md`？如果是，definition 是否仍匹配 code 对该 term 的使用？如果否，将 term 标记给 Phase 4.5 添加或 bootstrap。Investigation 期间不要编辑 `CONCEPTS.md`：只集中 collect signal。

让 investigation depth 匹配 learning 的 specificity：reference exact file paths 和 code snippets 的 learning，比描述 general principle 的 learning 需要更多 verification。

### Drift Classification：Update vs Replace（漂移分类）

关键 distinction 是 drift 是 **cosmetic**（references moved 但 solution 相同）还是 **substantive**（solution 本身 changed）：

- **Update territory**：file paths moved、classes renamed、links broke、metadata drifted，但 core recommended approach 仍是 code 的工作方式。`ce-compound-refresh` 直接修复这些。
- **Replace territory**：recommended solution 与 current code 冲突、architectural approach changed，或 pattern 不再是 preferred way。这意味着需要写入 new learning。Replacement subagent 使用已收集的 investigation evidence，按照 `ce-compound` 的 document format（frontmatter、problem、root cause、solution、prevention）写 successor。Orchestrator 不 inline rewrite learnings：它 delegate 给 subagent 以获得 context isolation。

**Boundary：** 如果你发现自己正在 rewrite solution section，或改变 learning 推荐的内容，停下：这是 Replace，不是 Update。

**Memory-sourced drift signals** 是 supplementary，不是 primary。描述不同 approach 的 memory note 不能单独 justify Replace 或 Delete。使用 memory signals 来：
- Corroborate codebase-sourced drift（强化 Replace case）
- 当 codebase evidence borderline 时，提示 deeper investigation
- 向 evidence report 添加 context（"(auto memory [claude]) notes suggest approach X may have changed since this learning was written"）

Headless mode 中，memory-only drift（无 codebase corroboration）应导致 stale-marking，而不是 action。

### Judgment Guidelines（判断指南）

三个容易搞错的 guidelines：

1. **Contradiction = strong Replace signal.** 如果 learning recommendation 与 current code patterns 或 recently verified fix 冲突，这不是 minor drift：learning 正在 actively misleading。Classify as Replace。
2. **Age alone is not a stale signal.** 仍匹配 current code 的 2-year-old learning 没问题。只把 age 当作 prompt，让你更仔细 inspect。
3. **Check for successors before deleting.** 推荐 Replace 或 Delete 前，查找覆盖相同 problem space 的 newer learnings、pattern docs、PRs 或 issues。如果 successor evidence 存在，prefer Replace over Delete，让 readers 指向 newer guidance。

## Phase 1.5：Investigate Pattern Docs（调查 Pattern Docs）

Review underlying learning docs 后，investigate `docs/solutions/patterns/` 下任何 relevant pattern docs。

Pattern docs high-leverage：stale pattern 比 stale individual learning 更危险，因为 future work 可能把它当作 broadly applicable guidance。基于它依赖的 learnings 的 refreshed state，评估 generalized rule 是否仍成立。

没有 clear supporting learnings 的 pattern doc 是 stale signal：keeping unchanged 前要 carefully investigate。

## Phase 1.75：Document-Set Analysis（文档集分析）

Investigating individual docs 后，退一步 evaluate document set as a whole。目标是捕获只有在 docs 相互比较时才显现的问题，而不只是对照 reality。

### Overlap Detection（重叠检测）

对于共享相同 module、component、tags 或 problem domain 的 docs，按这些 dimensions 比较：

- **Problem statement**：是否描述相同 underlying problem？
- **Solution shape**：即使用词不同，是否推荐相同 approach？
- **Referenced files**：是否指向相同 code paths？
- **Prevention rules**：是否重复相同 prevention bullets？
- **Root cause**：是否识别相同 root cause？

3+ dimensions high overlap 是 strong Consolidate signal。要问的问题是："Would a future maintainer need to read both docs to get the current truth, or is one mostly repeating the other?"

### Supersession Signals（取代信号）

检测 "older narrow precursor, newer canonical doc" patterns：

- Newer doc 覆盖相同 files、相同 workflow，且比 older doc 覆盖更广的 runtime behavior
- Older doc 描述 specific incident，而 newer doc 将其 generalizes into a pattern
- 两个 docs 推荐相同 fix，但 newer one 有更好的 context、examples 或 scope

当 newer doc 明确 subsumes older one 时，older doc 是 consolidation candidate：其 unique content（如果有）应 merge 到 newer doc，older doc 应 delete。

### Canonical Doc Identification（Canonical Doc 识别）

对每个 topic cluster（共享 problem domain 的 docs），识别哪个 doc 是 **canonical source of truth**：

- 通常是 cluster 中最新、最广、最 accurate 的 doc
- Maintainer 搜索此 topic 时应最先找到的 doc
- 其它 docs 应 point to 它，而不是 duplicate 它

Cluster 中所有其它 docs 要么是：
- **Distinct**：覆盖 meaningfully different sub-problem，并有 independent retrieval value。保持 separate。
- **Subsumed**：其 unique content 适合作为 canonical doc 中的 section。Consolidate。
- **Redundant**：没有添加 canonical doc 尚未说明的内容。Delete。

### Retrieval-Value Test（检索价值测试）

推荐两个 docs 保持 separate 前，应用此 test："If a maintainer searched for this topic six months from now, would having these as separate docs improve discoverability, or just create drift risk?"

Separate docs 只有在以下情况才站得住：
- 它们覆盖 genuinely different sub-problems，且有人可能 independently search
- 它们面向 different audiences 或 contexts（例如一个关于 debugging，另一个关于 prevention）
- Merge 会创建一个 unwieldy doc，比两个 focused docs 更难 navigate

如果这些都不适用，prefer consolidation。两个覆盖相同 ground 的 docs 最终会 drift apart 并相互 contradict：这比一个稍长的 single doc 更糟。

### Cross-Doc Conflict Check（跨文档冲突检查）

查找 scope 内 docs 之间的 outright contradictions：
- Doc A 说 "always use approach X"，而 Doc B 说 "avoid approach X"
- Doc A reference 某个 file path，而 Doc B 说它已 deprecated
- Doc A 和 Doc B 对看似同一 problem 描述了不同 root causes

Docs 之间的 contradictions 比 individual staleness 更紧急：它们会 actively confuse readers。将这些标记为 immediate resolution，通过 Consolidate（如果一个正确，另一个是同一 truth 的 stale version）或 targeted Update/Replace 解决。

## Subagent Strategy（Subagent 策略）

Investigating multiple artifacts 时，为 context isolation 使用 subagents，而不是因为任务听起来复杂就用。选择适配的 lightest approach：

| Approach（方式） | When to use（何时使用） |
|----------|-------------|
| **Main thread only** | Small scope、short docs |
| **Sequential subagents** | 1-2 个 artifacts，且有许多 supporting files 要读 |
| **Parallel subagents** | 3+ truly independent artifacts，且 low overlap |
| **Batched subagents** | Broad sweeps：先 narrow scope，再分 batches investigate |

**Spawning any subagent 时**，省略 `mode` 参数，让用户配置的 permission settings 生效。在其 task prompt 中包含此 instruction：

> 所有 investigation 都使用 dedicated file search 和 read tools（Glob、Grep、Read）。不要使用 shell commands（ls、find、cat、grep、test、bash）执行 file operations。这样可以避免 permission prompts，也更可靠。
>
> 同时扫描注入到 system prompt 中的 "user's auto-memory" block（仅 Claude Code）。检查与该 learning problem domain 相关的 notes。将任何 memory-sourced drift signals 与 codebase-sourced evidence 分开报告，并在 evidence section 中标记 "(auto memory [claude])"。如果 context 中没有该 block，跳过此检查。

有两种 subagent roles：

1. **Investigation subagents**：read-only。它们不得 edit files、create successors 或 delete anything。每个返回：file path、evidence、recommended action、confidence 和 open questions。当 artifacts independent 时，这些可以 parallel run。
2. **Replacement subagents**：写入单个 new learning，用于替换 stale one。这些 **one at a time, sequentially** 运行（每个 replacement subagent 可能需要读取大量 code，并行运行多个会带来 context exhaustion 风险）。每个 replacement 完成后，orchestrator 处理所有 deletions 和 metadata updates。

Orchestrator merge investigation results、detect contradictions、coordinate replacement subagents，并集中执行所有 deletions/metadata edits。Interactive mode 中，它针对 ambiguous cases 问用户。Headless mode 中，它改为将 ambiguous cases 标为 stale。如果两个 artifacts overlap 或讨论相同 root issue，一起 investigate，而不是 parallelize。

## Phase 2：Classify the Right Maintenance Action（分类正确的维护动作）

Gathering evidence 后，分配一个 recommended action。

### Keep（保留）

Learning 仍 accurate 且 useful。不要 edit file：report 它已被 review 且仍 remains trustworthy。只有当你已经因其它原因进行 meaningful update 时，才添加 `last_refreshed`。

### Update（更新）

Core solution 仍 valid，但 references 已 drifted（paths、class names、links、code snippets、metadata）。直接 apply fixes。

### Consolidate（合并）

当 Phase 1.75 识别到 heavily overlap 但都 materially correct 的 docs 时，选择 **Consolidate**。这不同于 Update（修复 single doc 中的 drift）和 Replace（rewrite misleading guidance）。Consolidate 处理 "both right, one subsumes the other" 的情况。

**何时 consolidate：**

- 两个 docs 描述相同 problem，并推荐相同（或 compatible）solution
- 一个 doc 是 narrow precursor，newer doc 更广地覆盖相同 ground
- Subsumed doc 的 unique content 可作为 canonical doc 的 section 或 addendum
- 同时保留二者会产生 drift risk，且没有 meaningful retrieval benefit

**何时不要 consolidate**（应用 Phase 1.75 的 Retrieval-Value Test）：

- Docs 覆盖 genuinely different sub-problems，且有人会 independently search
- Merge 会创建 unwieldy doc，对 navigation 的伤害大于 drift risk 对 accuracy 的伤害

**Consolidate vs Delete：** 如果 subsumed doc 有值得保留的 unique content（edge cases、alternative approaches、extra prevention rules），先使用 Consolidate merge 这些内容。如果 subsumed doc 没有添加 canonical doc 尚未说明的内容，直接跳到 Delete。

Consolidate action 是：将 subsumed doc 的 unique content merge 到 canonical doc，然后 delete subsumed doc。不是 archive：delete。Git history 会保留它。

### Replace（替换）

当 learning 的 core guidance 现在 misleading 时，选择 **Replace**：recommended fix materially changed、root cause 或 architecture shifted，或 preferred pattern 不同。

用户可能在 original learning 写入数月后才 invoke refresh。不要向他们索要他们很可能没有的 replacement context：使用 agent intelligence investigate codebase 并 synthesize replacement。

**Evidence assessment（证据评估）：**

当你识别 Replace candidate 时，Phase 1 investigation 已经收集了 significant evidence：old learning 的 claims、current code 实际做什么，以及 drift 发生在何处。评估这些 evidence 是否足以写出 trustworthy replacement：

- **Sufficient evidence**：你同时理解 old learning 推荐什么，以及 current approach 是什么。Investigation 找到了 current code patterns、new file locations、changed architecture。→ 继续写 replacement（见 Phase 4 Replace Flow）。
- **Insufficient evidence**：drift 太 fundamental，以至于无法 confidently document current approach。整个 subsystem 被替换，或 new architecture 过于复杂，仅靠 file scan 难以理解。→ In place 标为 stale：
   - 向 frontmatter 添加 `status: stale`、`stale_reason: [what you found]`、`stale_date: YYYY-MM-DD`
   - Report 你找到的 evidence，以及缺失内容
   - 推荐用户下次 encounter 该 area 且拥有 fresh problem-solving context 后运行 `ce-compound`

### Delete（删除）

当以下情况出现时，选择 **Delete**：

- Code 或 workflow 不再存在，且 problem domain 已 gone
- Learning obsolete，且没有值得 document 的 modern replacement
- Learning 与另一个 doc fully redundant（如果有 unique content 需要先 merge，使用 Consolidate）
- 没有 meaningful successor evidence 表明应改为 replaced

Action：delete file。没有 archival directory，没有 metadata：直接 delete。若以后需要 recovery，Git history 会保留每个 deleted file。

### 删除前：检查 problem domain 是否仍 active

当 learning 的 referenced files 已 gone，这是 strong evidence，但只说明 **implementation** gone。Deleting 前，reason 该 **learning 解决的问题** 是否仍是 codebase 中的 concern：

- 关于 session token storage 的 learning 中 `auth_token.rb` gone：application 是否仍 handle session tokens？如果是，concept 在 new implementation 下仍存在。这是 Replace，不是 Delete。
- 关于 deprecated API endpoint 的 learning，且整个 feature 已移除：problem domain gone。这是 Delete。

不要机械搜索 old learning 中的 keywords。而是先理解 learning address 的 problem，再 investigate 该 problem domain 是否仍存在于 codebase。Agent understands concepts：使用这种理解寻找 problem 现在在哪里，而不是 old code 曾经在哪里。

### 删除前：检查 inbound links

被其它 files cite 的 doc 可能以 doc 自身未说明的方式 load-bearing。在 classifying as Delete 前，搜索 repo 的 markdown content（other docs、plans、instruction files、READMEs）中对该 file 的 citations：不要搜 source code，那里 citations 很少且通常只出现在 comments 中。Filename slug 通常足够 unique，一个 query 可覆盖所有 citation sites。

高效 search：

- 优先使用平台 native content-search tool（例如 Claude Code 中的 Grep），而不是 shell。仅当 shell 对该 case 明显更好时再使用。
- 搜索 filename slug（不带 `.md`）；只有 matches noisy 时才 narrow 到 full path。
- 读取每个 match 周围的 context lines（例如 Grep 的 `-B`/`-A`），不要读取 whole files。

**Inbound links 影响 classification，而不是 cleanup。** 移除 citation 始终是 mechanical（drop parenthetical、bare entry 或 deferring clause）。Judgment 在 upstream：考虑这些 citations 后，Delete 是否仍正确，还是 Replace 更接近正确？

按 citation 在 citing context 中的作用 classify：

- **Decorative**：principle 已 inline stated，citation 是 "see also" pointer 或 bare attribution。Delete 可以；在同一 commit 中 cleanup citations。
- **Substantive**：citing doc 依赖 cited doc 提供未 inline stated 的内容（例如 "see X for details on Y"，但没有 inline Y）。Signal Replace：在同一路径写 successor，或当 doc 实际内容比 title 暗示更广时，**Keep with narrowed scope**。
- **Mixed or unclear（混合或不清楚）**：stale-mark。

Headless mode 中，Delete + decorative cleanup 可以。任何 substantive citation 或 genuine ambiguity 都 downgrade 到 stale-marking：writing Replace successor judgment-heavy，不应 unattended 发生。

**只有同时满足以下三项时才 auto-delete：**

- Implementation 已 gone（或已被 clearly better successor 完全 superseded，或该 doc 明显 redundant）。
- Problem domain 已 gone — app 不再处理该 learning 关注的问题。
- Inbound links 不存在，或明确只是 decorative。

如果任一 condition fails，按上方 rules classify as Replace、Update、Consolidate 或 stale-mark。不要 delete problem domain 仍 active 或 principles 被 substantively cited 的 learning：改用 replacement 填补 gap。

## Pattern Guidance（Pattern 指导）

对 pattern docs 应用相同五种 outcomes（Keep、Update、Consolidate、Replace、Delete），但将它们作为 **derived guidance** 而不是 incident-level learnings 来 evaluate。关键差异：

- **Keep**：underlying learnings 仍支持 generalized rule，且 examples 仍 representative
- **Update**：rule 仍成立，但 examples、links、scope 或 supporting references drifted
- **Consolidate**：两个 pattern docs generalize 相同 learnings 集合，或覆盖相同 design concern：merge into one canonical pattern
- **Replace**：generalized rule 现在 misleading，或 underlying learnings 支持 different synthesis。Replacement 基于 refreshed learning set：不要靠 guesswork 发明 new rules
- **Delete**：pattern 不再 valid、不再 recurring，或 fully subsumed by 更强 pattern doc 且没有 remaining unique content

## Phase 3：Ask for Decisions（请求决策）

### Headless mode（Headless 模式）

**完整跳过此 phase。不要询问任何问题。不要展示 options。不要等待 input。** 直接进入 Phase 4，并基于 Phase 2 的 classifications 执行所有 actions：

- Unambiguous Keep、Update、Consolidate、auto-Delete 和 Replace（with sufficient evidence）→ 直接 execute
- Ambiguous cases → 标为 stale
- 然后生成 report（见 Output Format）

### Interactive mode（Interactive 模式）

大多数 Updates 和 Consolidations 应直接 apply，无需询问。仅在以下情况询问用户：

- Right action genuinely ambiguous（正确 action 确实 ambiguous：Update vs Replace vs Consolidate vs Delete）
- 你即将 Delete 一个 document，**且** evidence 不是 unambiguous（见 Phase 2 的 auto-delete criteria）。当满足 auto-delete criteria 时，无需询问即可继续。
- 你即将 Consolidate，且 canonical doc 的选择不是 clear-cut
- 你即将通过 Replace 创建 successor

**不要** 问 code changes 是否 intentional、用户是否想修复 code 中的 bugs，或其它超出 doc maintenance 的 concerns。Stay in your lane：doc accuracy。

#### Question Style（问题风格）

始终使用平台 blocking question tool 呈现 choices：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 plain text 中展示 numbered options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。

Question rules（提问规则）：

- **一次只问一个问题**
- 优先 **multiple choice**
- 以 **recommended option** 开头
- 用一个 concise sentence 解释 recommendation rationale
- 避免要求用户从实际上不 plausible 的 actions 中选择

#### Focused Scope（聚焦范围）

对于 single artifact，呈现：

- file path（文件路径）
- 2-4 条 evidence bullets
- recommended action（推荐动作）

然后询问：

```text
This [learning/pattern] looks like a [Keep/Update/Consolidate/Replace/Delete].

Why: [one-sentence rationale based on the evidence]

What would you like to do?

1. [Recommended action]
2. [Second plausible action]
3. Skip for now
```

除非五个 actions 都 genuinely plausible，否则不要列出全部五个。

#### Batch Scope（批量范围）

对于 several learnings：

1. 将 obvious **Keep** cases group together
2. 当 fixes straightforward 时，将 obvious **Update** cases group together
3. 当 canonical doc 清晰时，一起呈现 **Consolidate** cases
4. 将 **Replace** cases 单独或以 very small groups 呈现
5. 除非是 strong auto-delete candidates，否则单独呈现 **Delete** cases

分 stages ask for confirmation：

1. Confirm grouped Keep/Update recommendations（确认分组后的 Keep/Update recommendations）
2. 然后处理 Consolidate groups（呈现 canonical doc 和要 merge 的内容）
3. 然后逐个处理 Replace
4. 然后逐个处理 Delete，除非 deletion unambiguous 且 safe to auto-apply

#### Broad Scope（广范围）

如果用户要求 sweeping refresh，保持 interaction incremental：

1. 先 narrow scope
2. Investigate manageable batch（调查可管理的 batch）
3. 呈现 recommendations
4. 询问是否继续 next batch

不要一开始就把 full maintenance queue 塞给用户。

## Phase 4：Execute the Chosen Action（执行所选 Action）

对每个 candidate，执行与 Phase 2 classification（Phase 3 中 confirmed）匹配的 flow。读取 `references/per-action-flows.md` 并遵循匹配 section：

- **Keep**：默认 no file edit；summarize learning 为什么 remains trustworthy。
- **Update**：当 solution 仍 substantively correct 时进行 in-place edits（path renames、link refreshes、module renames）。
- **Consolidate**：将 overlapping docs merge into canonical doc，delete subsumed docs，update cross-references。Orchestrator 直接处理 consolidation。
- **Replace**：通过 subagent 写 successor learning（传入 documentation contract files），validate frontmatter，然后 delete old。Evidence insufficient 时，改为 mark stale。
- **Delete**：final inbound-link check，然后 remove。如果 late-discovered substantive citations surface，reclassify。

每个 candidate 只运行一个 flow；reference 包含 per-action criteria、examples 和 step-by-step instructions。

## Phase 4.5：Vocabulary Capture（词汇捕获）

Per-learning actions 执行后，aggregate Phase 1 的 Vocabulary dimension 中 flagged domain terms，并与 `CONCEPTS.md` reconcile。

**首先，读取 `references/concepts-vocabulary.md`。** 这是 unconditional。不要凭 memory 预判哪些 Phase 1 signals qualify：reference 的 criteria 并不显然，未读取就判断 "nothing qualifies" 是 shortcut，不是 result。

**Procedure（流程）：**

1. **Aggregate.** 应用 reference criteria，收集 scope 内 learnings surfaced 的 qualifying terms。如果相同 term 在多个 learnings 中以不同 shades of precision surfaced，**union the shades into one entry**：不是三个 entries，也不是 most-recent-wins。
2. **如果 `CONCEPTS.md` 存在**，添加 missing terms，并在 corpus surfaced new precision 时 refine existing entries。不要 duplicate already present entries。**然后 reconcile in-scope core nouns：** 根据 reference 中的 **Seed goal**，从 area in scope 的 declared model 重新 derive core domain nouns，并 backfill 任何 central but missing 的 terms。这是每次 run 的 safety net，用于 stable-central terms that friction never surfaces：bounded to area in scope，只定义本次调查过的 terms，绝不做 repo-wide sweep。
3. **如果 `CONCEPTS.md` 不存在** 且至少一个 qualifying term surfaced，**bootstrap 它：seed，不要只写单个 term。** 除 surfaced term(s) 外，按 reference 的 **Seed goal** seed area in scope 的 core domain nouns，让 file 从创建起就被 anchored，而不是孤立 peripheral entry（也避免 captured terms 悬在 undefined siblings 旁）。Seed 保持 scoped to area in scope：repo-wide concept map 只来自上方 explicit bootstrap path，不来自 scoped refresh。**创建时，对 borderline terms 保持 conservative qualifying bar**：borderline term 或伪装成 entity 的 class/table/file name 推迟到 later run；clear core nouns seeded，borderline ones wait。Conservatism 关注 quality，不是 count；existing file updates 遵循 normal criteria。
4. **Scope discipline and citation hygiene.** Bootstrap、seed 和 reconcile 只反映 area in scope：不要 expand 到其它 categories，也不要 retroactively 向 existing learnings 注入 `(see CONCEPTS.md)` pointers。（上方 repo-wide bootstrap path 是 deliberate exception：它有意覆盖 whole declared model。）Report 应说明 additional entries 可能来自其它 scopes 的 refresh runs。
5. **Initial structure.** Bootstrapping 时，在 `# Concepts` heading 下以此 preamble 开头：

   > 本项目的 shared domain vocabulary — 具有项目特定含义的 entities、named processes 和 status concepts。先用 core domain vocabulary seed，然后随着 ce-compound 和 ce-compound-refresh 处理 learnings 而累积；可以直接编辑。它是 glossary，不是 spec 或 catch-all。

   然后添加 entries。让 term count 驱动 shape：1-4 terms → flat headings；更多 → 按 `references/concepts-vocabulary.md` rules 以 domain relationship cluster。
6. **Scrub violations.** 扫描 existing entries 中违反 `references/concepts-vocabulary.md` criteria 的 content：implementation specifics（file paths、class names、function signatures、code references）、current-config values（thresholds、counts、会 drift 的 enum values）、status/owner/date metadata、以不同 name 覆盖相同 term 的 duplicates，或依赖 undefined project-specific sibling 的 entries（添加 sibling 或 rephrase）。Rewrite 或 consolidate。这里 full sweep 是合适的，因为 refresh 是 audit；ce-compound 的同名 phase 将 corrections 限定在 touched entries 的 coherence neighborhood。

如果应用 reference criteria 后没有 Phase 1 signals qualified，在 report 的 `CONCEPTS.md` line 中明确记录 outcome（例如 "scanned, no qualifying terms"）。不要静默跳过：可见的 scan-and-no-result record 是 reference 已被 consult 的 audit signal。

Note：如果此 run 从零 **creates** `CONCEPTS.md`，下方 Discoverability Check 也会 surface 它，让 future agents 可 discover：interactive mode 中（经 consent）编辑 `AGENTS.md`/`CLAUDE.md`；headless mode 中，在 report 中 emit "Discoverability recommendation" line，而不是编辑 instruction files（按 step 4c 中 headless boundary：headless 做 doc maintenance，不做 project config）。无论哪种方式，created file 要么 surfaced，要么 flagged for surfacing；后续 runs 会跳过，因为 instruction file 已 current，或 recommendation 已 reported。

**静默 apply edits：任何 mode 都不提示用户。** Vocabulary capture 是 refreshing 的 side effect，不是用户每次 run 要做的 decision。

## Output Format（输出格式）

**Full report 必须作为 markdown output 打印。** 不要内部 summarize findings 后只输出 one-liner。Report 是 deliverable：完整打印每个 section，并以 headers、tables 和 bullet points 格式化为 readable markdown。

处理 selected scope 后，输出以下 report：

```text
Compound Refresh Summary
========================
Scanned: N learnings

Kept: X
Updated: Y
Consolidated: C
Replaced: Z
Deleted: W
Skipped: V
Marked stale: S

CONCEPTS.md: <scanned, no qualifying terms | created with N entries (M seeded) | updated — N added, N refined, N reconciled, N scrubbed | repo-wide map created with N entries>
```

然后对每个 processed file，列出：
- File path（文件路径）
- Classification（分类：Keep/Update/Consolidate/Replace/Delete/Stale）
- 找到的 evidence：用 "(auto memory [claude])" 标记任何 memory-sourced findings，以区别于 codebase-sourced evidence
- 已采取（或 recommended）的 action
- 对 Consolidate：哪个 doc 是 canonical、merge 了哪些 unique content、delete 了什么

对于 **Keep** outcomes，将它们列在 reviewed-without-edits section 下，让 result 可见，同时不制造 git churn。

### Headless mode report（Headless 模式报告）

Headless mode 中，report 是唯一 deliverable：没有 user 可问 follow-up questions，因此 report 必须 self-contained 且 complete。**打印 full report。不要 abbreviate、summarize 或 skip sections。**

将 actions 分为两个 sections：

**Applied（已应用）**（writes succeeded）：
- 对每个 **Updated** file：file path、fixed references，以及 why
- 对每个 **Consolidated** cluster：canonical doc、从每个 subsumed doc merge 了哪些 unique content，以及 deleted 的 subsumed docs
- 对每个 **Replaced** file：old learning 推荐什么 vs current code 做什么，以及 new successor 的 path
- 对每个 **Deleted** file：file path 以及为何 removed（problem domain gone、fully redundant 等）
- 对每个 **Marked stale** file：file path、找到的 evidence，以及它为什么 ambiguous

**Recommended**（无法写入的 actions，例如 permission denied）：
- 与上方相同 detail，但 framed as recommendations，供 human apply
- 包含足够 context，让用户可手动 apply change，或 interactively re-run skill

如果所有 writes 成功，Recommended section 为空。如果没有 writes 成功（例如 read-only invocation），所有 actions 都出现在 Recommended 下：report 变成 maintenance plan。

**Legacy cleanup**（如果 `docs/solutions/_archived/` 存在）：
- 列出 found archived files，并推荐 disposition：restore（如果仍 relevant）、delete（如果 truly obsolete），或 consolidate（如果与 active docs overlapping）

## Phase 5：Commit Changes（提交变更）

所有 actions 执行且 report 生成后，处理 committing changes。如果没有 files modified（all Keep，或 all writes failed），跳过此 phase。

### Detect git context（检测 git 上下文）

提供 options 前，检查：
1. 当前 checked out 的 branch（main/master vs feature branch）
2. Working tree 是否有 compound-refresh modified 之外的其它 uncommitted changes
3. Recent commit messages，用于匹配 repo commit style

### Headless mode（Headless 模式）

使用 sensible defaults：没有 user 可问：

| Context | Default action |
|---------|---------------|
| On main/master | 创建一个按 refreshed 内容命名的 branch（例如 `docs/refresh-auth-and-ci-learnings`）、commit，并尝试 open PR。如果 PR creation 失败，report branch name。 |
| On a feature branch | 在当前 branch 上作为 separate commit 提交 |
| Git operations fail | 在 report 中包含 recommended git commands 并继续 |

只 stage compound-refresh modified 的 files，不要 stage working tree 中其它 dirty files。

### Interactive mode（Interactive 模式）

首先运行 `git branch --show-current` 判断 current branch。然后基于结果呈现正确 options。无论用户选择哪个 option，都只 stage compound-refresh files。

**如果 current branch 是 main、master 或 repo default branch：**

1. Create a branch、commit 并 open PR（recommended）：branch name 应 specific to what was refreshed，而不是 generic（例如 `docs/refresh-auth-learnings`，不是 `docs/compound-refresh`）
2. 直接 commit 到 `{current branch name}`
3. Don't commit：I'll handle it（不要 commit：我来处理）

**如果 current branch 是 feature branch，且 working tree clean：**

1. 作为 separate commit 提交到 `{current branch name}`（recommended）
2. 创建 separate branch 并 commit
3. Don't commit（不要 commit）

**如果 current branch 是 feature branch，且 working tree dirty（存在其它 uncommitted changes）：**

1. 只将 compound-refresh changes commit 到 `{current branch name}`（selective staging：其它 dirty files 保持 untouched）
2. Don't commit（不要 commit）

### Commit message（提交信息）

写一个 descriptive commit message：
- 总结刷新了什么（例如 "update 3 stale learnings, consolidate 2 overlapping docs, delete 1 obsolete doc"）
- 遵循 repo 现有 commit conventions（查看 recent git log 确认 style）
- 保持 succinct — 细节已经在 changed files 中

## Relationship to ce-compound（与 ce-compound 的关系）

- `ce-compound` 捕获 newly solved、verified problem
- `ce-compound-refresh` 随 codebase 演进维护 older learnings，包括它们各自的 accuracy，以及作为 document set 的 collective design

只有当 refresh process 有足够 real evidence 能写出 trustworthy successor 时才使用 **Replace**。Evidence insufficient 时，标为 stale，并建议用户下次 encounter 该 problem area 时运行 `ce-compound`。

当 document set 已 organically grown 且 redundancy 已 creep in 时，主动使用 **Consolidate**。每次 `ce-compound` invocation 都会添加 new doc；随着时间推移，多个 docs 可能从略微不同角度覆盖同一个 problem。Periodic consolidation 让 document set 保持 lean 且 authoritative。

## Discoverability Check（可发现性检查）

生成 refresh report 后，检查项目 instruction files 是否会引导 agent 在 documented area 开始工作前 discover 并搜索 `docs/solutions/`。每次都运行此检查：只有 agents 能找到 knowledge store，它才会持续 compound value。如果此检查产生 edits，它们会作为 Phase 5 commit flow 的一部分（或紧随其后）提交，见下方 step 5。

1. 识别哪些 root-level instruction files 存在（AGENTS.md、CLAUDE.md，或两者）。读取 file(s)，判断哪个包含 substantive content：一个 file 可能只是 `@`-includes 另一个的 shim（例如 `CLAUDE.md` 只包含 `@AGENTS.md`，或反过来）。Substantive file 是 assessment 和 edit target；忽略 shims。如果二者都不存在，完整跳过此检查。
2. 评估 agent 阅读 instruction files 后是否会学到三件事：
   - 存在一个可搜索的 documented solutions knowledge store
   - 了解足够结构以便有效搜索（category organization、YAML frontmatter fields，如 `module`、`tags`、`problem_type`）
   - 何时搜索它（在 documented areas 中 implementing features、debugging issues 或 making decisions 前；learnings 可能覆盖 bugs、best practices、workflow patterns 或其它 institutional knowledge）

   这是 semantic assessment，不是 string match。信息可以是 architecture section 中的一行、gotchas section 中的 bullet、分散在多个位置，或完全不使用精确 path `docs/solutions/`。使用 judgment：如果 agent 读完该 file 后能合理 discover 并使用 knowledge store，则检查通过。

3. 如果 spirit 已满足，无需 action。
4. If not:
   a. 基于 file 的 existing structure、tone 和 density，识别 mention 自然适合的位置。创建 new section 前，先检查信息是否能作为 closest related section 中的一行：architecture tree、directory listing、documentation section 或 conventions block。添加到 existing section 的一行几乎总是优于 new headed section。只有当 file 有清晰 sectioned structure，且没有任何 remotely related 的位置时，才把 new section 作为 last resort。
   b. 起草能传达这三件事的最小 addition。匹配 file 的 existing style 和 density。Addition 应描述 knowledge store 本身，而不是 plugin。

      保持 informational tone，而不是 imperative。把 timing 表达为 description，而不是 instruction：使用 "relevant when implementing or debugging in documented areas"，不要写 "check before implementing or debugging." 像 "always search before implementing" 这样的 imperative directives，会在 workflow 已包含 dedicated search step 时导致 redundant reads。目标是 awareness：agents 知道 folder 存在以及里面有什么，然后自己判断何时 consult。

      Calibration examples（不是 templates，请适配该 file）：

      当已有 directory listing 或 architecture section 时，添加一行：
      ```
      docs/solutions/  # documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (module, tags, problem_type)
      ```

      当 file 中没有自然位置时，一个小 headed section 是合适的：
      ```
      ## Documented Solutions

      `docs/solutions/` — documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing or debugging in documented areas.
      ```
   c. Interactive mode 中，向用户解释为什么这重要：在此 repo 中工作的 agents（包括 fresh sessions、其它 tools，或没有 plugin 的 collaborators）不会知道要检查 `docs/solutions/`，除非 instruction file surface 了它。展示 proposed change 以及将放置的位置，然后使用平台 blocking question tool 获得 consent 再编辑：Claude Code 中为 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中为 `request_user_input`、Gemini 中为 `ask_user`、Pi 中为 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中展示 proposal；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。Headless mode 中，将它作为 report 中的 "Discoverability recommendation" line 纳入；不要尝试编辑 instruction files（headless scope 是 doc maintenance，不是 project config）。

5. **如果 repo root 存在 `CONCEPTS.md`，对它运行 parallel discoverability check。** 使用与上方 `docs/solutions/` check 相同的 workflow：同一个 target file、同样的 edit-placement judgment，以及按 mode 匹配的同样 consent-then-edit interaction shape。当存在 directory listing 时的 example calibration：

   ```
   CONCEPTS.md  # shared domain vocabulary — read when orienting to the codebase or before discussing domain concepts
   ```

   **如果 `CONCEPTS.md` 不存在，完整跳过此 step** — 绝不为了项目尚未采用的 artifact nag 用户。跳过时，此 step 不产生 output，也不产生 edit。

6. **当检查产生 edits 时，amend 或创建 follow-up commit。** 如果 step 4 或 step 5 导致 instruction file edit，且 Phase 5 已经 commit refresh changes，则 stage 新编辑的 file，并 either amend existing commit（如果仍在同一 branch 且尚未 push）或创建一个 small follow-up commit（例如 `docs: add docs/solutions/ discoverability to AGENTS.md`，或 `docs: add CONCEPTS.md discoverability to AGENTS.md`，两者都落地时使用 combined message）。如果 Phase 5 已把 branch push 到 remote（例如 branch+PR path），也 push follow-up commit，让 open PR 包含 discoverability change。这会让 run 结束时 working tree clean，remote 也保持同步。如果用户在 Phase 5 选择 "Don't commit"，则让 instruction-file edits 与其它 uncommitted refresh changes 一起保持 unstaged；无需 separate commit logic。
