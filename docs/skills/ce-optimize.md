# `ce-optimize`

> 运行 metric-driven iterative optimization loops：定义可测目标，构建 measurement scaffolding，运行尝试多种 approaches 的 parallel experiments，保留 improvements，并向最佳方案收敛。

`ce-optimize` 是 **measurement-driven experimentation** skill。它适用于 right change 不明显、可以生成多个 plausible variants、有 repeatable measurement harness，并且 "better" 可表达为 hard metric 或 LLM-as-judge evaluation 的问题。Skill 会定义 goal、构建 measurement loop、在 parallel worktrees（或通过 Codex）中运行 experiments、保留 wins、revert losses，并把每个 result 持久化到磁盘，让 multi-hour run 能跨 context compaction 和 crashes 存活。

灵感来自 Karpathy 的 autoresearch，并被泛化到 multi-file code changes 和非 ML domains。真实用途包括 clustering quality、search relevance、build performance、prompt quality、latency tuning，以及任何 optimization target 比 guess-and-check 更适合 systematic experimentation 的场景。

---

## TL;DR

| Question（问题） | Answer（答案） |
|----------|--------|
| 它做什么？ | 定义 optimization spec、建立 baseline、运行以 gates 和/或 LLM judge 评估的 parallel experiments、保留最佳方案，并迭代到 stopping criterion 触发 |
| 何时使用 | Clustering、search、prompts、build performance；任何 right change 不明显且值得尝试多种 approaches 的 measurable outcome |
| 产出什么 | 一个合入 kept experiments 的 `optimize/<spec-name>` git branch，以及 `.context/compound-engineering/ce-optimize/<spec-name>/` 中的 experiment log 和 strategy digest |
| 下一步 | 对 cumulative diff 运行 `/ce-code-review`；用 `/ce-compound` 捕获 winning strategy；创建 PR |

---

## 问题

Optimization-shaped problems 常见 failure modes：

- **Guess-and-check**：尝试一个 change，measure，tweak；永远看不到更大的 design space
- **Optimizing the proxy, not the target**：提升 hard metric（cluster count、response length），但它并不真正关联 quality
- **Lost results**：multi-hour runs crash、context compacts，results 只在 chat 中，随后消失
- **Symptom over root cause**：fix 提升 metric，但因为只 tune 了 flaky proxy 而无法 generalize
- **Degenerate solutions**："100% accuracy" 是因为 algorithm 把所有东西分到一个 bucket
- **Sequential when parallel would work**：worktree isolation 本可并行测试五个 experiments，却一次只跑一个

## 方案

`ce-optimize` 以 explicit gates 运行 structured experimentation loop：

- **Spec-driven**：YAML spec 定义 metric、gates、scope、measurement command 和 stopping criteria；或由 skill 交互式帮你写
- **Three-tier evaluation**：degenerate gates（cheap、hard）-> LLM-as-judge（quality 需要 semantic understanding 时）-> diagnostics（logged，不 gate）
- **Persistence discipline**：磁盘上的 experiment log 是 source of truth；每个 result 在下一个 experiment 开始前写入并验证
- **Worktree-isolated parallel experiments**：independent variants 在各自 worktrees 和 branches 中并发运行
- **File-disjoint runner-up cherry-picks**：多个 touched files 不相交的 winning experiments 会组合并 re-measure，寻找 compounding improvements
- **Strategy digest**：每个 batch 的 compressed learnings 会进入下一轮 hypothesis generation
- **Crash recovery**：worktrees 中的 per-experiment `result.yaml` markers 支持在任何 interruption 后 resume

---

## 它的新意

### 1. Three-tier evaluation（三层评估）：degenerate gates、judge、diagnostics

`ce-optimize` 不依赖单个 metric，而是用三层评估每个 experiment：

- **Degenerate gates**（hard、cheap、fast）：在支付 expensive evaluation 前捕获明显 broken solutions。例如："all items in 1 cluster"、"0% test pass rate"。先运行；任何 gate 失败就跳过后续。
- **LLM-as-judge**（qualitative work 的真实 optimization target）：sample outputs、按 rubric 打分、aggregate。当 "better" 需要 semantic understanding 时，loop 优化的是它。
- **Diagnostics**（logged，不 gated）：distribution stats、counts、timing、cost。用于理解 *why* judge score 改变，而不污染 optimization signal。

Three-tier approach 防止最常见 failure：优化一个不追踪真实 quality 的 proxy。

### 2. Qualitative outputs 使用 LLM-as-judge

对于 clustering、search relevance 或 prompt quality 这类 hard metrics 容易误导的问题，skill 使用 stratified sampling 和 rubric 评估 outputs：

- **Stratified sampling**：对 output space 分桶（例如 "top by size"、"mid range"、"small clusters"、"singletons"），跨 buckets sample，让 judge 看到 representative quality
- **Rubric-driven scoring**：1-5 scale，配 concrete level descriptions；supplementary fields（`distinct_topics`、`outlier_count`）提供 diagnostic value
- **Singleton evaluation**：当 coverage 重要时，单独 sample singletons，捕捉 false negatives（本应 grouped 的 items）
- **Cost capping**：`max_total_cost_usd` 限制 total judge spend；uncapped spend 需要 explicit user approval

### 3. Persistence discipline：disk 是 source of truth

Multi-hour runs 不能信任 in-memory state。Skill 强制六个 mandatory disk checkpoints（CP-0 到 CP-5）：spec saved、baseline recorded、hypothesis backlog written、每个 experiment result 在 measurement 后**立即** appended、batch summaries with strategy digest、final state。每次 write 后都会 read back 验证；silent write failures 会被捕捉，而不是传播。

> **如果你在先写入磁盘前就产出 results table，那就是 bug。** Conversation context 给用户看；experiment log file 才是 durability。

### 4. Worktree isolation 中的 parallel experiments

对 independent hypotheses，skill 会在各自 branches 上创建 per-experiment worktrees。每个 subagent 隔离工作；merges 按 dependency order 串行发生；predicted overlaps 会以 merge conflicts 显示，由 orchestrator 明确处理。没有 shared-directory git index contention，也没有 concurrent experiments 之间的 test interference。

当 worktree isolation 不可用（某些 platforms）时，execution fallback 到 serial subagents：correctness 一样，parallelism 更少。

### 5. File-disjoint runner-up cherry-picks（文件不相交的 runner-up cherry-picks）

Batch 结束后，skill 按 improvement 排序 experiments。Best 会保留到 optimization branch。然后检查 runners-up 与 kept experiment 是否 **file-level disjoint**；如果 runner-up 完全 touched different files，就 cherry-pick 到 new baseline 并 re-measure。如果 combined measurement strictly better，则保留；否则 revert，并记录 "promising alone but neutral/harmful in combination"。每个 batch 有 configurable cap。

### 6. Strategy digest：compressed learnings 驱动 hypothesis generation

每个 batch 后，strategy digest 写入磁盘：尝试过的 categories 及 success/failure counts、key learnings、exploration frontier（untried categories）、current best metrics。下一批 hypothesis generation 读取 digest，而不是 agent memory，让 loop 受 accumulated evidence 驱动，而不是 recency bias。

### 7. Crash recovery and resume（崩溃恢复与 resume）

每个 experiment 在 measurement 后、orchestrator 更新 main log 前，立即在 worktree 中写 `result.yaml` marker。Resume（Phase 0.4）时，skill scan worktrees，寻找尚未写入 log 的 markers，并恢复任何 measured-but-unlogged experiments。Optimization branch 存活；磁盘上的 experiment log 存活；你可以从中断处继续。

### 8. Phase 2 前的 hard gate

Phase 1 是 hard gate：skill 建立 baseline metrics、验证 measurement harness、运行 parallelism readiness probe、检查 worktree budget，并在 dispatch 任何 experiments 前展示 judge cost estimate（或标记 uncapped spend）请求 explicit approval。没有 surprise cost 或 runaway loops。

---

## 快速示例

你想提升 notification-categorization feature 的 clustering quality。当前 approach 把所有东西分成 12 个 clusters，其中一些看起来弱。

调用 `/ce-optimize "clustering quality on notification categorization"`。Skill 检测这是 qualitative，推荐 `type: judge`，因为 cluster count 这类 hard metrics 会优化 misleading proxy。它带你定义 stratified sampling（top by size、mid range、small clusters，再加 singletons）、rubric（1-5，带 concrete level descriptions）和 gates（`solo_pct <= 0.95`、`max_cluster_size <= 500`）。第一次运行推荐 serial mode 和 4-iteration cap。

Phase 1 在 baseline 上运行 measurement harness，dispatch `ce-learnings-researcher` 查找 prior optimization context，运行 parallelism probe，并基于 judge cost estimate 请求 explicit approval。你批准。

Phase 2 生成 18 个 hypotheses（signal-extraction、embedding、algorithm、parameter-tuning categories）。其中一个需要 new dependency；你 bulk-approve。

Phase 3 分 batch 运行。每个 experiment 有自己的 worktree，应用 change，运行 measurement harness，先评估 degenerate gates（cheap），gates pass 后在 stratified samples 上运行 judge，把 results 立即写入磁盘，然后进入 evaluation。每个 batch 的 best 会 merge 到 optimization branch；file-disjoint runners-up 会 cherry-pick 并 re-measure。

4 iterations 后，judge score 提升 1.2 points，三个 experiments 组合进 kept branch。Phase 4 展示 post-completion options：code review、通过 `/ce-compound` 捕获 winning strategy，或创建 PR。

---

## 何时使用

在以下情况使用 `ce-optimize`：

- Right change 事先不明显
- 可以生成多个 plausible variants
- 有 repeatable measurement harness（或可以构建一个）
- "Better" 可表达为 hard metric 或 LLM-as-judge evaluation
- Optimization target 有 proxy gaming 风险（qualitative outputs、degenerate solutions）

以下情况跳过 `ce-optimize`：

- 已经知道正确 change：直接做
- Change 是 one-shot，无法有 measurement harness
- "Better" 无法一致 measure 或 judge；optimization 需要 signal

---

## 作为 Workflow 的一部分使用

`ce-optimize` 是自己的 loop，但与 chain interlock：

- **Triggered from a brainstorm or plan**：当工作是 "make X better" 而不是 "build X new" 时，brainstorm 或 plan 经常会发现 optimization 是正确形状
- **Calls `ce-learnings-researcher`**：Phase 0.3 查询 `docs/solutions/`，寻找类似 topics 的 prior optimization work
- **Hands off to `/ce-code-review`**：Phase 4.3，对 cumulative diff（baseline 到 final）在 merge 前 review
- **Hands off to `/ce-compound`**：把 winning strategy 记录为 institutional learning

Branch（`optimize/<spec-name>`）和 experiment log 会保留到 Phase 4；之后可以 resume、audit 或 extend optimization。

---

## 单独使用

`ce-optimize` 最常 standalone 使用；long-running optimization 本身就是一项活动：

- **From a spec**：`/ce-optimize path/to/spec.yaml`（可用 `references/example-hard-spec.yaml` 或 `references/example-judge-spec.yaml` 作为 starting points）
- **From a description**：`/ce-optimize "reduce build time by 30%"` 会带你 interactive 写 spec
- **Resume an existing run**：`/ce-optimize <spec-name>` 检测 existing branch，并提供 Resume vs Fresh Start

关于该 skill 用途、何时用 hard metrics vs LLM-as-judge，以及 example kickoff prompts 的友好 overview，见 `references/usage-guide.md`。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 询问 optimization goal |
| `<spec.yaml path>` | 加载并 validate spec，从 Phase 0 运行 |
| `<description>` | 进入 interactive spec creation |

Spec schema（spec schema）：`references/optimize-spec-schema.yaml`。Experiment log schema（experiment log schema）：`references/experiment-log-schema.yaml`。Example specs（示例 specs）：`references/example-hard-spec.yaml`（hard metric）、`references/example-judge-spec.yaml`（LLM-as-judge）。

首次运行推荐起点：`execution.mode: serial`、`max_concurrent: 1`、`max_iterations: 4`、`max_hours: 1`。Judge mode：`sample_size: 10`、`batch_size: 5`、`max_total_cost_usd: 5`。Measurement harness 可信后再 tighten。

---

## 常见问题

**什么时候用 hard metrics，什么时候用 LLM-as-judge？**
Hard metrics 用于 objective targets，也就是 higher/lower 明确更好（build time、test pass rate、latency）。LLM-as-judge 用于 qualitative targets，需要 human reviewer 看 output 才能判断 "this is better"（clustering quality、search relevance、prompt quality）。Qualitative work 拿不准时，用 judge；hard metrics alone 会优化 misleading proxies。

**为什么有六个 disk checkpoints？**
因为 skill 会运行数小时，context 可能随时丢失。每个 checkpoint 都写文件并 read back 验证；silent write failures 不会传播。最重要的是 CP-3（每个 experiment result 在 measurement 后、评估下一个 experiment 前立即 append）。

**什么是 degenerate gate？**
Cheap、hard、fast 的 check，用于捕获明显 broken solutions。对 clustering 来说，"All items in 1 cluster" 就是 degenerate gate；它在某些 hard metrics 上可能 perfect，但显然错误。Gates 先运行；任何 gate fail，experiment 会被 reject，不再支付 expensive judge evaluation。

**如果 optimization 需要 new dependency 怎么办？**
Hypothesis generation phase 会收集所有 unique new dependencies，并在 loop 开始前请求 bulk approval。含 unapproved deps 的 hypotheses 会跳过，并在 wrap-up 时重新呈现。

**可以在 Codex 上运行而不是 subagents 吗？**
可以。`execution.backend: codex` 会通过 `codex exec` 把每个 experiment dispatch 到 Codex sandbox。如果 Codex sandboxing 在当前 context 中不可用（已经在 Codex sandbox 内、没有 `.git` write permission），则 fallback 到 subagent dispatch。

**Run 后保留什么？**
Optimization branch（`optimize/<spec-name>`）会保留，其中包含所有 kept-experiment commits。Experiment log 和 strategy digest 留在 `.context/compound-engineering/ce-optimize/<spec-name>/`，用于 local resume 和 audit（`.context/` gitignored，所以它们不会随 branch 传播）。

---

## 另见

- [`ce-code-review`](./ce-code-review.md) - Phase 4.3 hand-off，用于 review cumulative diff
- [`ce-compound`](./ce-compound.md) - 把 winning strategy 捕获为 institutional learning
- [`ce-worktree`](./ce-worktree.md) - 如果想在 optimize loop 外设置 isolation，可手动创建 worktree
