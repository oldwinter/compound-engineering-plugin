# `/ce-optimize` 使用指南

## 此 skill 用途

`/ce-optimize` 用于以下 hard engineering problems：

1. 可以尝试多个 code 或 config variants。
2. 可以对每个 variant 运行相同 evaluation。
3. 希望 skill 保留 good variants，并 reject bad ones。

它最适合 "search the space and score the results" 类工作，而不是 one-shot implementation work。

## 何时使用

当 problem 类似以下情况时使用 `/ce-optimize`：

- "找到能阻止 OOM crashes 且不浪费 RAM 的最小 memory limit。"
- "调优 clustering parameters，但不要把所有东西都坍缩成一个垃圾 cluster。"
- "找到更便宜、但仍能产出足够好 summaries 供 downstream clustering 使用的 prompt。"
- "在同一个 harness 下比较多种 ranking、retrieval、batching 或 threshold strategies。"

当 success 是 objective 且测量成本低时，选择 `type: hard`：

- Memory usage（内存使用）
- Latency（延迟）
- Throughput（吞吐量）
- Test pass rate（测试通过率）
- Build time（构建时间）

当 numeric metric 可能被 game，或 human usefulness 很重要时，选择 `type: judge`：

- Cluster coherence（cluster 一致性）
- Search relevance（搜索相关性）
- Summary quality（summary 质量）
- Prompt quality（prompt 质量）
- Classification quality with semantic edge cases（带 semantic edge cases 的分类质量）

## 何时不使用

以下情况中，`/ce-optimize` 通常不是合适工具：

- fix 很 obvious，不需要 experimentation
- 没有 repeatable measurement harness
- search space 是假的，只有一个 plausible answer
- evaluating variants 成本太高，不值得 multiple runs

## 如何理解

Pattern 是：

1. 定义 target。
2. 先 build 或 validate measurement harness。
3. 生成多个 plausible variants。
4. 对每个 variant 运行相同 evaluation loop。
5. 保留在不违反 guard rails 前提下改善 target 的 variants。

Core rule 很简单：

- 如果 hard metric 能捕获 "better"，优化 hard metric。
- 如果 hard metric 可以被 game，添加 LLM-as-judge。

示例：降低 clustering threshold 可能提高 cluster coverage。听起来不错，直到所有东西都进入一个 giant cluster。Hard metrics 可能说 "improved"；而 sampling real clusters 的 LLM judge 可以说 "this is trash."

## First-Run Advice（首次运行建议）

首次运行时：

- 优先使用 `execution.mode: serial`
- 设置 `execution.max_concurrent: 1`
- 保持 `stopping.max_iterations` 较小
- 保持 `stopping.max_hours` 较小
- 在 baseline trustworthy 前避免 new dependencies
- 在 judge mode 中，使用 small sample 和 low cost cap

首次运行的目标是 validate harness，而不是立刻赢得 optimization。

## Example Prompts（示例 prompts）

### 1. Memory Tuning（内存调优）

```text
使用 /ce-optimize 找到能让这个 service 在我们的 load test 下保持稳定的最小 memory setting。

当前 container limit 是 512 MB，app 有时会 OOM-crash。不要直接跳到 8 GB。尝试一小组 realistic memory limits，对每个 limit 运行相同 load test，并用以下标准评分：
- process 是否 OOM
- tail latency 是否严重 spike
- GC pauses 是否变得 excessive

优先选择通过 guard rails 的最小 memory limit。
```

### 2. Clustering Quality（聚类质量）

```text
使用 /ce-optimize 改善 issue 和 PR clustering quality。

我们大约有 18k 个 open issues 和 PRs。我们想测试能改善 clustering quality、减少 singleton clusters，并提升每个 cluster 内 match quality 的 changes。

不要修改 shared default database。为本次 run 复制它，然后在需要时使用 per-experiment copies。

不要只针对 coverage optimize。使用 LLM-as-judge 对 clusters 采样，确认它们仍保留真实 semantic similarity，而不是坍缩成巨大的 low-quality clusters。
```

### 3. Prompt Optimization（Prompt 优化）

```text
使用 /ce-optimize 为 issues 和 PRs 创建 summarization prompt，在尽量降低 token spend 的同时，仍产出足够好、可供 downstream clustering 使用的 summaries。

我希望这个 loop 比较 prompt variants，测量 token cost，并判断 summaries 是否保留了把 related issues 聚在一起、同时不合并 unrelated issues 所需的区分度。
```

## 在 Hard Metrics 和 Judge Mode 之间选择

以下情况只用 hard metrics：

- "better" 从 numbers 中显而易见。

以下情况添加 judge mode：

- numbers 可能改善，但真实 output 变差。

常见 pattern：

- Hard gates（硬门禁）reject broken outputs。
- Judge mode 对 surviving candidates 的实际 usefulness 打分。

这种 hybrid setup 通常是 ranking、clustering 和 prompt work 的最佳 default。
