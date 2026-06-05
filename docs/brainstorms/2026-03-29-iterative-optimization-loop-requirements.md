# Iterative Optimization Loop Skill - 需求 Brainstorm

## 问题陈述

CE 已有强大的 knowledge-compounding（从过往工作学习）和 multi-agent review（quality gates），但还没有用于 **metric-driven iterative optimization** 的 skill：先定义可衡量目标，构建 measurement scaffolding，然后运行自动化 loop，尝试多种 approaches，逐个测量，保留改进，并逐步收敛到最佳方案。

### 动机示例

某项目为大型 open-source repo 构建 issue/PR clusters。目前只有约 20% 的 issues/PRs 落入包含 >1 item 的 clusters。推测可达到的目标约为 95%。要达到该目标，需要测试许多 hypotheses：

- 从 noise（让所有 vectors 过于相似的 PR/issue template boilerplate）中提取 signal（用户输入的独特文本）
- 使用 issue-to-PR links 作为新的 clustering signal
- 调整 similarity thresholds
- 尝试不同 embedding models 或 chunking strategies
- 组合多个 signals（text similarity + link graph + label overlap + author patterns）
- 在 embedding 前预过滤或标准化 template sections

没有单一 hypothesis 能从 20% 直接到 95%。这需要 systematic experimentation：尝试数十甚至数百个 variations，逐个衡量，并基于成功结果继续推进。

## 格局分析

### Karpathy 的 AutoResearch（2026-03，21k+ stars）

最简单且影响最大的 model。核心设计：

- **一个 mutable file**（`train.py`）：agent 只编辑这个文件
- **一个 immutable evaluator**（`prepare.py`）：agent 不能碰 measurement
- **一个 instruction file**（`program.md`）：定义 objectives、constraints、stopping criteria
- **一个 metric**（`val_bpb`）：scalar，越低越好
- **Linear keep/revert loop**：modify -> commit -> run -> measure -> 如果改进则 keep，否则 `git reset`
- **History**：`results.tsv` 累积所有 experiment results；git log 保留成功 commits
- **Result**：2 天内 700 个 experiments，发现 20 个 optimizations，约 12 experiments/hour

**优势**：极其简单。Git-native history。易理解和 debug。
**弱点**：Linear，无法同时探索多个方向。单一 scalar metric。无法 backtrack 到早期 promising states。

### AIDE / WecoAI（相关案例）

- 在 solution space 中做 **tree search**：每个 script 是一个 node，LLM patches 产生 children
- 可以 backtrack 到任何 previous node 并探索 alternatives
- 在 MLE-Bench 上获得的 Kaggle medals 是 linear agents 的 4 倍
- 更复杂，但更擅长跳出 local optima

### Sakana AI Scientist v2（相关案例）

- 带 parallel experiment execution 的 **agentic tree search**
- 使用 VLM feedback 分析 figures
- 完整 paper generation，包含 automated peer review
- 对 code optimization 来说过重，但展示了 tree-structured exploration 的价值

### DSPy（Stanford，相关案例）

- 面向 LLM programs 的 automated prompt/weight optimization
- Bayesian optimization（MIPROv2）、iterative feedback（GEPA）、coordinate ascent（COPRO）
- 表明不同 optimization strategies 适合不同 problem shapes

### 现有 Claude Code AutoResearch Forks

- `uditgoenka/autoresearch`：将该 pattern 打包为 Claude Code skill
- `autoexp`：泛化到任何带 quantifiable metric 的项目
- 多个团队报告 overnight 运行 30-70 iterations 后获得 50-80% improvements

## 关键设计决策

### 1. Linear vs. Tree Search（线性与树搜索）

| Approach | 优点 | 缺点 |
|---|---|---|
| Linear (autoresearch) | 简单、易理解、git-native | 无法探索多个方向，容易卡在 local optima |
| Tree search (AIDE) | 可 backtrack 并探索 alternatives | state management 更复杂，更难 review |
| Hybrid: linear with manual branch points | 兼具两者优点：默认简单，用户决定何时 fork | 需要用户交互来 fork |

**Recommendation**：默认从 linear keep/revert（Karpathy model）开始。添加可选 “branch point” support，让用户 snapshot current best 并开启新的 exploration direction。每个 direction 是自己的 branch。这样 core loop 保持简单，同时在需要时允许 multi-direction exploration。

### 2. 测量什么：三层 metric 架构

AutoResearch 使用单一 scalar metric（val_bpb）。当你拥有带清晰 ground truth 的 objective function 时，这很有效。但大多数 real-world optimization problems 并非如此，尤其是 output quality 需要 human judgment 时。

**Key insight**：Hard scalar metrics 往往不是正确 optimization target。对 clustering 而言，“bigger clusters”本身并不更好，“fewer singletons”本身也不更好。一个有 35% singletons、但每个 cluster 都 coherent 的方案，胜过一个只有 5% singletons、但 clusters 都是垃圾的方案。Hard metrics 捕获 *degenerate* solutions；*quality* 需要 judgment。

**三层结构**：

1. **Degenerate-case gates（退化场景 gates）**（hard、cheap、fully automated）：
   - 在昂贵 evaluation 前捕获明显 broken solutions
   - 示例：“all items in 1 cluster”（degenerate merge）、“all singletons”（degenerate split）、“runtime > 10 minutes”（performance regression）
   - 这些是快速 boolean checks：pass/fail。任何 gate 失败时，experiment 立即 reverted，不运行昂贵 judge
   - 把它们当作 “sanity checks”，而不是 “optimization targets”

2. **LLM-as-judge quality score**（实际 optimization target）：
   - 对 quality 需要 judgment 的问题，这就是 primary metric
   - 通过 stratified sampling 控制成本（不是 exhaustive）
   - 产生 loop 可优化的 scalar score
   - 可包含多个 dimensions（coherence、granularity、completeness）
   - 详见下方 detailed design

3. **Diagnostics**（用于理解而记录，不作为 gate）：
   - Distribution stats、counts、histograms（分布统计、计数、直方图）
   - 用于理解 judge score 为什么变化
   - 示例：median cluster size、singleton %、largest cluster size、cluster count
   - 记录在 experiment record 中，但绝不用于 keep/revert decisions

**何时使用哪种配置**：

| Problem Type | Degenerate Gates | Primary Metric | 示例 |
|---|---|---|---|
| Objective function exists | Yes | Hard metric (scalar) | Build time, test pass rate, API latency |
| Quality requires judgment | Yes | LLM-as-judge score | Clustering quality, search relevance, content generation |
| Hybrid | Yes | Hard metric + LLM-judge as guard rail | Latency (optimize) + response quality (must not drop) |

**Recommendation**：支持全部 three tiers。用户声明 primary optimization target 是 hard metric 还是 LLM-judge score。Degenerate gates 总是先运行（cheap）。Judge 只在通过 gates 的 experiments 上运行。

### 3. Agent 可以编辑什么

AutoResearch 将 agent 限制在一个文件内。这很优雅，但对大多数 software projects 过于受限。

**Recommendation**：定义显式 mutable files/directories allowlist，以及显式 denylist（measurement harness、test fixtures、evaluation data）。agent 只在 allowlist 内操作。measurement harness 是 immutable，agent 不能通过改变 measurement 方式来 game the metric。

### 4. 先构建 Measurement Scaffolding

这是关键点，也让它区别于“just run the code in a loop”：

1. 在任何 optimization 开始前，**定义 measurement spec**
2. **构建并验证 measurement harness**：确保它产生 reliable、reproducible results
3. **建立 baseline**：在当前代码上运行 harness，得到 starting metrics
4. 然后才开始 optimization loop

**Recommendation**：把它设为 hard phase gate。直到 measurement harness 通过 validation check（成功运行、产生预期 metric types、baseline 已记录），skill 都拒绝进入 optimization loop。

### 5. History and Memory（历史与记忆）

跨 iterations 需要记住的内容：

- **Results log**：每个 experiment 的 metrics、hypothesis 和 outcome（kept/reverted）
- **Git history**：成功 experiments 是 commits；branches 会保留
- **Hypothesis log**：尝试了什么、为什么、学到了什么，避免重复尝试失败 approaches
- **Strategy evolution**：随着 agent 学会什么有效，应调整 exploration strategy

**Recommendation**：使用 structured experiment log（YAML 或 JSON）捕获 iteration number、hypothesis、changes made、metrics before/after、outcome（kept/reverted/error）和 learnings。agent 在提出下一个 hypothesis 前读取它。所有 kept experiments 都保留 git branches。

### 6. 运行多久

- AutoResearch 会 “indefinitely until manually stopped”
- Real-world needs：time budgets、iteration budgets、metric targets，或 “until no improvement for N iterations”

**Recommendation**：支持多个 stopping criteria（任意一个都可触发 stop）：
- 达到 target metric
- 达到 max iterations
- 达到 max wall-clock time
- 连续 N 次 iterations 无改进
- Manual stop（用户中断）

### 7. Parallelism（并行）

AutoResearch 是 single-threaded。AIDE 和 AI Scientist 会运行 parallel experiments。对 CE 而言：

- **Phase 1（v1）**：single-threaded linear loop。简单、可 debug，适配 git worktrees。
- **Phase 2（future）**：使用多个 worktrees 或 Codex sandboxes 的 parallel experiments。每个 experiment 都独立。

**Recommendation**：先 single-threaded 启动。设计 experiment log 和 branching model 时支持未来 parallelism。

### 8. 与现有 CE Skills 集成

optimization loop 应与现有 CE capabilities 组合：

- **`/ce:ideate`** 或 **`/ce:brainstorm`** 用于生成 initial hypothesis space
- **Learnings researcher** 用于检查是否曾做过类似 optimization
- **`/ce:compound`** 用于在 loop 完成后把 winning strategy 捕获为 institutional knowledge
- **`/ce:review`** 可选，用于在 merge 前 review final winning diff

## 提议 Skill：`/ce-optimize`

### Workflow Phases（工作流阶段）

```
Phase 0: Setup
  |-- Read/create optimization spec (target metric, guard rails, mutable files, constraints)
  |-- Search learnings for prior related optimization attempts
  '-- Validate spec completeness

Phase 1: Measurement Scaffolding (HARD GATE - user must approve before Phase 2)
  |-- If user provides harness:
  |     |-- Review docs (or document usage if undocumented)
  |     |-- Run harness once against current implementation
  |     '-- Confirm baseline measurement is accurate with user
  |-- If agent builds harness:
  |     |-- Build measurement harness (immutable evaluator)
  |     |-- Run validation: harness executes, produces expected metric types
  |     '-- Establish baseline metrics
  |-- Parallelism readiness probe:
  |     |-- Check for hardcoded ports -> parameterize via env var
  |     |-- Check for shared DB files (SQLite, etc.) -> plan copy strategy
  |     |-- Check for shared external services -> warn user
  |     |-- Check for exclusive resource needs (GPU, etc.)
  |     '-- Produce parallel_readiness assessment
  |-- Stability validation (if mode: repeat):
  |     |-- Run harness repeat_count times
  |     |-- Verify variance is within noise_threshold
  |     '-- Confirm aggregation method produces stable baseline
  '-- GATE: Present baseline + parallel readiness to user. Refuse to proceed until approved.

Phase 2: Hypothesis Generation + Dependency Approval
  |-- Analyze the problem space (read code, understand current approach)
  |-- Generate initial hypothesis list (agent + optionally /ce:ideate)
  |-- Prioritize by expected impact and feasibility
  |-- Identify new dependencies across ALL planned hypotheses
  |-- Present dependency list for bulk approval
  '-- Record hypothesis backlog (with dep approval status per hypothesis)

Phase 3: Optimization Loop (repeats in parallel batches)
  |-- Select batch of hypotheses (batch_size = min(backlog, max_concurrent))
  |     '-- Prefer diversity: mix different hypothesis categories per batch
  |-- For each experiment in batch (PARALLEL by default):
  |     |-- Create worktree or Codex sandbox
  |     |-- Copy shared resources (DB files, data files)
  |     |-- Apply parameterization (ports, env vars)
  |     |-- Implement hypothesis (within mutable scope)
  |     |-- Run measurement harness (respecting stability config)
  |     '-- Collect metrics + diff
  |-- Wait for batch completion
  |-- Evaluate results:
  |     |-- Rank by primary metric improvement
  |     |-- Filter by guard rails (reject any that violate)
  |     |-- If best > current: KEEP (merge to optimization branch)
  |     |-- If best has unapproved dep: mark deferred_needs_approval
  |     '-- All others: REVERT (log results, clean up worktrees)
  |-- Handle unapproved deps:
  |     '-- Set aside, don't block pipeline, batch-ask at end or check-in
  |-- Update experiment log with ALL results (kept + reverted)
  |-- Re-baseline: remaining hypotheses evaluated against new best
  |-- Generate new hypotheses based on learnings from this batch
  |-- Check stopping criteria
  '-- Next batch

Phase 4: Wrap-Up
  |-- Present deferred hypotheses needing dep approval (if any)
  |-- Summarize results: baseline -> final metrics, total iterations, kept improvements
  |-- Preserve ALL experiment branches for reference
  |-- Optionally run /ce:review on cumulative diff
  |-- Optionally run /ce:compound to capture winning strategy as learning
  '-- Report to user
```

### Optimization Spec File Format（Optimization Spec 文件格式）

包含 parallel execution 和 stability config 的完整 spec 见下方 Resolved Design Decisions section 中的 “Updated Spec File Format”。

### Experiment Log Format（Experiment Log 格式）

```yaml
# .context/compound-engineering/optimize/experiment-log.yaml
spec: "improve-issue-clustering"

baseline:
  timestamp: "2026-03-29T10:00:00Z"
  gates:
    largest_cluster_pct: 0.02
    singleton_pct: 0.79
    cluster_count: 342
    runtime_seconds: 45
  diagnostics:
    singleton_pct: 0.79
    median_cluster_size: 2
    cluster_count: 342
    avg_cluster_size: 2.8
    p95_cluster_size: 7
  judge:
    mean_score: 3.1
    pct_scoring_4plus: 0.33
    mean_distinct_topics: 1.8
    singleton_false_negative_pct: 0.45   # 45% of sampled singletons should be clustered
    sample_seed: 42
    judge_cost_usd: 0.42

experiments:
  - iteration: 1
    batch: 1
    hypothesis: "Remove PR template boilerplate before embedding to reduce noise"
    category: "signal-extraction"
    changes:
      - file: "src/preprocessing/text_cleaner.py"
        summary: "Added template detection and removal using common PR template patterns"
    gates:
      largest_cluster_pct: 0.03
      singleton_pct: 0.62
      cluster_count: 489
      runtime_seconds: 48
    gates_passed: true
    diagnostics:
      singleton_pct: 0.62
      median_cluster_size: 3
      cluster_count: 489
      avg_cluster_size: 3.4
    judge:
      mean_score: 3.8
      pct_scoring_4plus: 0.57
      mean_distinct_topics: 1.4
      singleton_false_negative_pct: 0.31
      judge_cost_usd: 0.38
    outcome: "kept"
    primary_delta: "+0.7"       # mean_score: 3.1 -> 3.8
    learnings: "Template removal significantly improved coherence. Clusters now group by actual issue content rather than shared boilerplate. Singleton rate dropped 17pp."
    commit: "abc123"

  - iteration: 2
    batch: 1                    # same batch as iteration 1 (ran in parallel)
    hypothesis: "Lower similarity threshold from 0.85 to 0.75"
    category: "clustering-algorithm"
    changes:
      - file: "config/clustering.yaml"
        summary: "Changed similarity_threshold from 0.85 to 0.75"
    gates:
      largest_cluster_pct: 0.08
      singleton_pct: 0.35
      cluster_count: 210
      runtime_seconds: 47
    gates_passed: true
    diagnostics:
      singleton_pct: 0.35
      median_cluster_size: 5
      cluster_count: 210
    judge:
      mean_score: 2.4
      pct_scoring_4plus: 0.13
      mean_distinct_topics: 3.1   # clusters covering too many unrelated topics
      singleton_false_negative_pct: 0.12
      judge_cost_usd: 0.41
    outcome: "reverted"
    primary_delta: "-0.7"       # mean_score: 3.1 -> 2.4
    learnings: "Lower threshold pulled in more items but destroyed coherence. Clusters became grab-bags. The hard metrics looked good (fewer singletons!) but judge correctly identified the quality drop. Validates that singleton_pct alone is a misleading optimization target."

  - iteration: 3
    batch: 2                    # new batch, runs on top of iteration 1's changes
    hypothesis: "Use issue-to-PR link graph as additional clustering signal"
    category: "graph-signals"
    changes:
      - file: "src/clustering/signals.py"
        summary: "Added link-graph signal extraction from issue-PR references"
      - file: "src/clustering/merger.py"
        summary: "Combined text similarity with link-graph signal using weighted average"
    gates:
      largest_cluster_pct: 0.04
      singleton_pct: 0.48
      cluster_count: 520
      runtime_seconds: 52
    gates_passed: true
    diagnostics:
      singleton_pct: 0.48
      median_cluster_size: 3
      cluster_count: 520
    judge:
      mean_score: 4.1
      pct_scoring_4plus: 0.70
      mean_distinct_topics: 1.2
      singleton_false_negative_pct: 0.22
      judge_cost_usd: 0.39
    outcome: "kept"
    primary_delta: "+0.3"       # mean_score: 3.8 -> 4.1 (from iteration 1 baseline)
    learnings: "Link graph is a strong complementary signal. Issues referencing the same PR are almost always related. Judge scores jumped — 70% of clusters now score 4+. Singleton false negatives dropped further."
    commit: "def456"

  - iteration: 4
    batch: 2
    hypothesis: "Add scikit-learn HDBSCAN for hierarchical density clustering"
    category: "clustering-algorithm"
    changes: []
    gates_passed: false         # not evaluated — deferred
    outcome: "deferred_needs_approval"
    deferred_reason: "Requires unapproved dependency: scikit-learn"
    learnings: "Set aside for batch approval at end of loop."

best:
  iteration: 3
  judge:
    mean_score: 4.1
    pct_scoring_4plus: 0.70
  total_judge_cost_usd: 1.60   # running total across all experiments
```

## Hypothesis 生成策略

对 clustering example，agent 应探索的 hypothesis space 大致如下：

### Signal Extraction（信号提取）
- 在 embedding 前移除 PR/issue template boilerplate
- 只提取用户创作文本（剥离 auto-generated sections）
- 提高 title 相对 body 的权重
- 将提到的 code snippets / file paths 用作 signals
- 提取 error messages 和 stack traces 作为 high-signal features

### Graph-Based Signals（基于图的信号）
- Issue-to-PR links（引用同一 PR 的 issues 相关）
- issues 之间的 cross-references（`#123` mentions）
- Author patterns（同一 author 提交相似 issues）
- Label co-occurrence（标签共现）
- Milestone/project board grouping（milestone/project board 分组）

### Embedding 与 Similarity
- 尝试不同 embedding models（不同 size/quality tradeoffs）
- 在 embedding 前对 long issues 做 chunk，而不是 truncate 或 summarize
- 对多个 similarity signals 做 weighted combination
- Asymmetric similarity（非对称相似度：issue-to-PR vs. issue-to-issue）

### Clustering Algorithm（聚类算法）
- 调整 similarity thresholds（per-signal 或 combined）
- 尝试 hierarchical clustering vs. graph-based community detection
- Two-pass：先 coarse clusters，再做 split/merge refinement
- Minimum cluster size constraints（最小 cluster size 约束）
- 处理确实不应进入 cluster 的 outlier issues

### Pre-processing（预处理）
- 标准化 markdown formatting
- 在 clustering 前对 near-identical issues 去重
- 为 multilingual repos 做 language detection 和 translation
- Time-decay weighting（recent issues 权重更高）

## 已解决的设计决策

### D1：Measurement Harness Ownership -> DECIDED：Agent 构建，user 验证

agent 在 Phase 1 构建 measurement harness，并用当前 implementation 评估它。如果用户提供现有 harness，agent 会记录如何使用它（或 review 现有 docs），运行一次，并确认 baseline measurement 准确。不论哪种方式，用户都要在 loop 开始前 review 并 approve。这是 hard gate。

### D2：Flaky Metrics -> DECIDED：User-configurable，默认 stable

spec 支持 `stability` block：

```yaml
measurement:
  command: "python evaluate.py"
  stability:
    mode: "stable"          # default: run once, trust the result
    # mode: "repeat"        # run N times, aggregate
    # repeat_count: 5       # how many runs
    # aggregation: "median" # median | mean | min | max | custom
    # noise_threshold: 0.02 # improvement must exceed this to count
```

当 `mode: repeat` 时，harness 运行 `repeat_count` 次。`aggregation` function 将 results reduce 为每个 metric 的单一值。`noise_threshold` 防止接受 noise floor 内的 improvements。默认是 `stable`：运行一次并信任结果。

### D3：New Dependencies -> DECIDED：预先批准 expected dependencies，defer surprises

在 Phase 2（Hypothesis Generation）期间，agent 会梳理所有 planned variations 中预期的新 dependencies，并预先获得 bulk approval。如果 loop 中某个 experiment 发现需要未批准 dependency，agent 会：
1. 将该 hypothesis 放到一边（在 experiment log 中标记为 `deferred_needs_approval`）
2. 继续处理不需要新 deps 的其他 hypotheses
3. 在 loop 结束时（或 user check-in 时）展示 deferred hypotheses 及其 dep requirements，供 batch approval
4. 如果获批，这些 hypotheses 进入下一轮 iteration batch

这可以避免在长时间 unattended runs 中因 interactive approval 阻塞 pipeline。

### D4：LLM-as-Judge -> DECIDED：纳入 v1（通过 sampling 控制成本）

对于 quality 需要 judgment 的问题，LLM-as-judge 是 essential，它往往是 *actual* optimization target，而不是 nice-to-have。Hard metrics 可以捕获 degenerate cases，但无法告诉你 clusters 是否 coherent，或 search results 是否 relevant。

**通过 stratified sampling 控制成本**：
- 不 judge 每个 output item，而是 sample 一组 representative set
- Stratified sampling 确保覆盖 edge cases（small clusters、large clusters、singletons）
- 默认每次 evaluation 约 30 samples（可配置）
- 如果每次 judgment call 约 $0.01-0.03，30 samples = 每个 experiment 约 $0.30-0.90
- 100 个 experiments 总计 $30-90，仍可管理

**Sampling strategy（采样策略）**：
```yaml
judge:
  sample_size: 30
  stratification:
    - bucket: "small"       # 2-3 items
      count: 10
    - bucket: "medium"      # 4-10 items
      count: 10
    - bucket: "large"       # 11+ items
      count: 10
  # For singletons: sample 10 and ask "should any of these be in a cluster?"
  singleton_sample: 10
```

**Rubric-based scoring（由用户按 problem 定义）**：
```yaml
judge:
  rubric: |
    Rate this cluster 1-5:
    - 5: All items clearly about the same issue/feature
    - 4: Strong theme, minor outliers
    - 3: Related but covers 2-3 sub-topics
    - 2: Weak connection
    - 1: Unrelated items grouped together

    Also answer:
    - How many distinct sub-topics does this cluster represent?
    - Should any items be removed from this cluster?

  scoring:
    primary: "mean_score"          # mean of 1-5 ratings
    secondary: "pct_scoring_4plus" # % of samples scoring 4 or 5
    output_format: "json"          # {"score": 4, "distinct_topics": 1, "remove_items": []}
```

**Judge execution order（Judge 执行顺序）**：
1. 运行 degenerate-case gates（fast、free），拒绝 obviously broken solutions
2. 运行 hard metrics（fast、free），收集 diagnostics
3. 只有 gates 通过时，才对 sampled outputs 运行 LLM-as-judge（慢、花钱）
4. keep/revert decision 使用 judge score 作为 primary metric

**Judge consistency（一致性）**：
- 尽可能跨 experiments 使用相同 sample indices（相同 random seed）
- 这会降低 sample variance 带来的 noise，因为你在跨 runs 比较同一批 clusters
- 当 output structure 变化时（cluster 数量不同），重新 sample，但记录 seed change

**Judge model selection（模型选择）**：
- 默认：Haiku（fast、cheap，足够做 rubric-based scoring）
- 可选：Sonnet，用于 nuanced judgment（成本 2-3 倍）
- judge prompt 是 immutable measurement harness 的一部分，agent 不能修改

**Singleton evaluation（容易被忽略的场景）**：
- Low singleton % 不自动代表好。High singleton % 也不自动代表坏。
- sample singletons 并询问 judge：“Given these other clusters, should this item be in one of them? Which one? Or is it genuinely unique?”
- 这既能捕获 false-negative clustering（本应 cluster 但未 cluster 的 items），也能验证 true singletons

### D5：Codex Support -> DECIDED：从 v1 开始支持

基于 compound-engineering plugin 中 PRs #364/#365 的 patterns：

**Dispatch pattern**：将 experiment prompt 写入 temp file，并通过 stdin pipe 给 `codex exec`：
```bash
cat /tmp/optimize-exp-XXXXX.txt | codex exec --skip-git-repo-check - 2>&1
```

**Security posture**：用户每个 session 选择一次（与 ce-work-beta 相同）：
- Workspace write（工作区写入，`--full-auto`）
- Full access（完整访问，`--dangerously-bypass-approvals-and-sandbox`）

**Result collection**：`codex exec` 完成后检查 working directory diff。没有 structured result format；Codex 写文件，orchestrator 读取 diff 并运行 measurement harness。

**Guard rails（保护栏）**：
- 检查 `CODEX_SANDBOX` / `CODEX_SESSION_ID` env vars，防止 recursive delegation
- 连续 3 次 delegate failures 后，对剩余 experiments 自动禁用 Codex
- Orchestrator 保留对 git operations、measurement 和 keep/revert decisions 的控制

### D6：Parallel Execution -> DECIDED: 默认 parallel

Experiments 默认 parallel 运行。如果 system under test 有要求，用户可以指定 serial execution。skill 会主动探测 parallelism blockers。

完整 parallel execution design 见下文。

---

## Parallel Execution Design（并行执行设计）

### 默认：Parallel Experiments

除非用户明确要求 serial execution，否则 optimization loop 会同时 dispatch 多个 experiments。这是主要 throughput lever：并行运行 4-8 个 experiments，而不是一次 1 个，意味着每小时 iterations 增加 4-8 倍。

### Isolation Strategy（隔离策略）

每个 parallel experiment 都需要完整 filesystem isolation。每个 session 可选择两种机制：

**Local worktrees**（默认）：
```
.claude/worktrees/optimize-exp-001/   # full repo copy
.claude/worktrees/optimize-exp-002/
.claude/worktrees/optimize-exp-003/
```
- 通过 `git worktree add` 创建，每个 experiment 使用唯一 branch
- 每个 worktree 获取自己的 shared resources 副本（见下文）
- measurement 后清理：kept experiments merge 到 optimization branch；reverted experiments 的 worktree 被移除

**Codex sandboxes（Codex 沙盒）**（opt-in）：
- 每个 experiment 作为独立 `codex exec` invocation dispatch
- Codex 提供内建 filesystem isolation
- Orchestrator 完成后收集 diffs
- 最适合最大化 parallelism（无 local resource limits）

**Hybrid（混合模式）**（future）：
- 使用 Codex 做 implementation，local worktree 做 measurement
- 当 measurement 需要 local resources（GPU、specific hardware、large datasets）时很有用

### Parallelism Blocker Detection（并行阻塞检测，Phase 1）

在 Phase 1（Measurement Scaffolding）期间，skill 会主动探测常见 parallelism blockers：

**Port conflicts（端口冲突）**：
- 运行 measurement harness，检查它是否绑定 fixed ports
- 搜索 config 和 code 中的 hardcoded port numbers
- 如果发现：通过 environment variable parameterize（例如 `PORT=0` 表示 random，或 `BASE_PORT + experiment_index`）
- 写入 spec：`parallel.port_strategy: "parameterized"`，并记录 env var name

**Shared database files（共享数据库文件）**：
- 检查 SQLite databases、local file-based stores
- 如果发现：每个 experiment 在其 worktree 中获得 database 副本
- Cleanup：measurement 后移除副本
- 写入 spec：`parallel.shared_files: ["data/clusters.db"]`，并记录 copy strategy

**Shared external services（共享外部服务）**：
- 检查 system 是否写入 shared external database、API 或 queue
- 如果发现：警告用户，建议 serial mode 或 test database isolation
- 除非用户确认 isolation，否则这是 parallel 的 hard blocker

**Resource contention（资源争用）**：
- 检查 GPU usage、large memory requirements
- 如果 system 需要独占某个 resource，则必须使用 serial mode
- 写入 spec：`parallel.exclusive_resources: ["gpu"]`

**Detection output**：Phase 1 产生 `parallel_readiness` assessment：
```yaml
parallel:
  mode: "parallel"            # parallel | serial | user-decision
  max_concurrent: 4           # default, adjustable
  blockers_found: []          # or list of issues
  mitigations_applied:
    - type: "port_parameterization"
      env_var: "EVAL_PORT"
      strategy: "base_port_plus_index"
      base: 9000
    - type: "database_copy"
      source: "data/clusters.db"
      strategy: "copy_per_worktree"
  blockers_unresolved: []     # these force serial unless user resolves
```

### Parallel Loop Mechanics（并行 loop 机制）

```
Orchestrator (main branch)
  |
  |-- Batch N experiments from hypothesis backlog
  |     (batch_size = min(backlog_size, max_concurrent))
  |
  |-- For each experiment in batch (parallel):
  |     |-- Create worktree / Codex sandbox
  |     |-- Copy shared resources (DB files, etc.)
  |     |-- Apply parameterization (ports, env vars)
  |     |-- Implement hypothesis (agent edits mutable files)
  |     |-- Run measurement harness
  |     |-- Collect metrics + diff
  |     |-- Clean up shared resource copies
  |
  |-- Wait for all experiments in batch to complete
  |
  |-- Evaluate results:
  |     |-- Rank by primary metric improvement
  |     |-- Filter by guard rails
  |     |-- Select best experiment that passes all guards
  |     |-- If best > current best: KEEP (merge to optimization branch)
  |     |-- All others: REVERT (remove worktrees, log results)
  |     |-- If none improve: log all results, advance to next batch
  |
  |-- Update experiment log with all results (kept + reverted)
  |-- Update hypothesis backlog based on learnings from ALL experiments
  |-- Check stopping criteria
  |-- Next batch
```

### Parallel-Aware Keep/Revert（感知并行的保留/回退）

在 parallel experiments 中，多个 experiments 可能都改进 metric，但彼此冲突（以不兼容方式修改同一批文件）。Resolution strategy：

1. **Non-overlapping changes**：如果最佳 experiment 的 changes 与第二名不重叠，考虑同时保留两者（顺序 merge，merge 后重新 measure 确认）
2. **Overlapping changes**：只保留最佳项。将第二名记录为 “promising but conflicts with experiment N”，方便未来基于新 baseline 重试
3. **Re-baseline**：保留任何 experiment 后，batch 中所有已 reverted 的剩余 experiments 都要针对新 baseline 重新评估；它们的 hypotheses 回到 backlog，供未来可能重试

### Experiment Prompt Template（用于 Codex dispatch）

```markdown
# Optimization Experiment #{iteration}

## Context
You are running experiment #{iteration} for optimization target: {spec.name}
Current best metrics: {current_best_metrics}
Baseline metrics: {baseline_metrics}

## Your Hypothesis
{hypothesis.description}

## What To Change
Modify ONLY files in the mutable scope:
{spec.scope.mutable}

DO NOT modify:
{spec.scope.immutable}

## Constraints
{spec.constraints}
{approved_dependencies}

## Previous Experiments (for context)
{recent_experiment_summaries}

## Instructions
1. Implement the hypothesis
2. Do NOT run the measurement harness (orchestrator handles this)
3. Do NOT commit (orchestrator handles this)
4. Run `git diff --stat` when done so the orchestrator can see your changes
```

### Concurrency Limits（并发限制）

```yaml
parallel:
  max_concurrent: 4           # default for local worktrees
  # max_concurrent: 8         # default for Codex (no local resource limits)
  codex_rate_limit: 10        # max Codex invocations per minute
  worktree_cleanup: "immediate"  # or "batch" (clean up after full batch)
```

---

## Updated Spec File Format（更新后的 Spec 文件格式）

### Example A：Hard-Metric Primary（硬指标优先：build performance、test pass rate）

```yaml
# .context/compound-engineering/optimize/spec.yaml
name: "reduce-build-time"
description: "Reduce CI build time while maintaining test pass rate"

metric:
  primary:
    type: "hard"               # hard | judge
    name: "build_time_seconds"
    direction: "minimize"
    baseline: null             # filled by Phase 1
    target: 60                 # optional target to stop at

  degenerate_gates:            # fast boolean checks, run first
    - name: "test_pass_rate"
      check: ">= 1.0"         # all tests must pass
    - name: "build_exits_zero"
      check: "== true"

  diagnostics:
    - name: "cache_hit_rate"
    - name: "slowest_step"
    - name: "total_test_count"

measurement:
  command: "python evaluate.py"
  timeout_seconds: 600
  output_format: "json"
  stability:
    mode: "stable"
```

### Example B：LLM-Judge Primary（LLM judge 优先：clustering quality、search relevance）

```yaml
# .context/compound-engineering/optimize/spec.yaml
name: "improve-issue-clustering"
description: "Improve coherence and coverage of issue/PR clusters"

metric:
  primary:
    type: "judge"
    name: "cluster_coherence"
    direction: "maximize"
    baseline: null
    target: 4.2               # mean judge score (1-5 scale)

  degenerate_gates:            # cheap checks that reject obviously broken solutions
    - name: "largest_cluster_pct"
      description: "% of all items in the single largest cluster"
      check: "<= 0.10"        # if >10% of items are in one cluster, it's degenerate
    - name: "singleton_pct"
      description: "% of items that are singletons"
      check: "<= 0.80"        # if >80% singletons, clustering isn't working at all
    - name: "cluster_count"
      check: ">= 10"          # fewer than 10 clusters for 18k items is degenerate
    - name: "runtime_seconds"
      check: "<= 600"

  diagnostics:                 # logged for understanding, never gated on
    - name: "singleton_pct"    # note: same metric can be diagnostic AND gate
    - name: "median_cluster_size"
    - name: "cluster_count"
    - name: "avg_cluster_size"
    - name: "p95_cluster_size"

  judge:
    model: "haiku"             # haiku (cheap) | sonnet (nuanced)
    sample_size: 30
    stratification:
      - bucket: "small"       # 2-3 items per cluster
        count: 10
      - bucket: "medium"      # 4-10 items
        count: 10
      - bucket: "large"       # 11+ items
        count: 10
    singleton_sample: 10       # also sample singletons to check false negatives
    sample_seed: 42            # fixed seed for cross-experiment consistency
    rubric: |
      Rate this cluster 1-5:
      - 5: All items clearly about the same issue/feature
      - 4: Strong theme, minor outliers
      - 3: Related but covers 2-3 sub-topics
      - 2: Weak connection
      - 1: Unrelated items grouped together

      Also answer in JSON:
      - "score": your 1-5 rating
      - "distinct_topics": how many distinct sub-topics this cluster represents
      - "outlier_count": how many items don't belong
    singleton_rubric: |
      This item is currently a singleton (not in any cluster).
      Given the cluster titles listed below, should this item be in one of them?

      Answer in JSON:
      - "should_cluster": true/false
      - "best_cluster_id": cluster ID it belongs in (or null)
      - "confidence": 1-5 how confident you are
    scoring:
      primary: "mean_score"              # what the loop optimizes
      secondary:
        - "pct_scoring_4plus"            # % of samples scoring 4+
        - "mean_distinct_topics"         # lower is better (tighter clusters)
        - "singleton_false_negative_pct" # % of sampled singletons that should be clustered

measurement:
  command: "python evaluate.py"          # outputs JSON with gate + diagnostic metrics
  timeout_seconds: 600
  output_format: "json"
  stability:
    mode: "stable"

scope:
  mutable:
    - "src/clustering/"
    - "src/preprocessing/"
    - "config/clustering.yaml"
  immutable:
    - "evaluate.py"
    - "tests/fixtures/"
    - "data/"

execution:
  mode: "parallel"
  backend: "worktree"
  max_concurrent: 4
  codex_security: null

parallel:
  port_strategy: null
  shared_files: ["data/clusters.db"]
  exclusive_resources: []

dependencies:
  approved: []

constraints:
  - "Do not change the output format of clusters"
  - "Preserve backward compatibility with existing cluster consumers"

stopping:
  max_iterations: 100
  max_hours: 8
  plateau_iterations: 10
  target_reached: true
```

### Evaluation Execution Order（每个 experiment 的评估执行顺序）

```
1. Run measurement command (evaluate.py)
   -> Produces JSON with gate metrics + diagnostics
   -> Fast, free

2. Check degenerate gates
   -> If ANY gate fails: REVERT immediately, log as "degenerate"
   -> Do NOT run the judge (saves money)

3. If primary type is "judge": Run LLM-as-judge
   -> Sample outputs according to stratification config
   -> Send each sample to judge model with rubric
   -> Aggregate scores per scoring config
   -> This is the number the loop optimizes against

4. Keep/revert decision
   -> Based on primary metric (hard or judge score)
   -> Must also pass all degenerate gates (already checked in step 2)
```

---

## 开放问题（Remaining）

1. **应该由 agent 提出 hypotheses，还是由用户提供？**
   - 两者都支持：agent 基于 analysis 生成，用户也可以注入 ideas，agent 负责优先级排序

2. **跨 experiments 的 judge calibration**
   - LLM judges 可能在 calls 之间 drift 或不一致
   - 是否应在每个 judge batch 中包含 “anchor samples”：一组带已知 scores 的固定 clusters，用于检测 drift？
   - 如果 anchor scores 相对 baseline 偏移 >0.5，则 re-calibrate 或标记给用户 review

3. **Judge rubric iteration（judge rubric 迭代）**
   - rubric 本身在看到 early results 后可能需要改进
   - 但在 mid-loop 修改 rubric 会让与早期 experiments 的比较失效
   - 可能解法：如果 rubric 变化，用新 rubric 重新 judge current best，建立新 baseline？

4. **与 `/lfg` 和 `/slfg` 的关系？**
   - `/lfg` 是单个任务的 autonomous execution
   - `/ce-optimize` 是 iterative search 的 autonomous execution
   - `/ce-optimize` 可以将每个 experiment delegate 给 Codex（已在 D5 决定）
   - Local experiments 使用类似 `/ce:review` 的 subagent dispatch

5. **Branch strategy details（branch 策略细节）？**
   - Main optimization branch（主 optimization branch）：`optimize/<spec-name>`
   - 每个 kept experiment 都是该 branch 上的一个 commit
   - Branch points 创建 `optimize/<spec-name>/direction-<N>`
   - 所有 branches 都保留，供之后 reference 和 comparison

6. **Batch size adaptation（batch size 自适应）？**
   - batch size 是否应根据 success rate grow/shrink？
   - High success rate -> 更大的 batches（更多 exploration）
   - Low success rate -> 更小的 batches（更聚焦）
   - 或保持简单，让用户调整 `max_concurrent`

7. **batch 内的 hypothesis diversity？**
   - 同一 batch 中的 parallel experiments 是否应刻意保持 diverse？
   - 例如，一个 threshold tweak + 一个 new signal + 一个 preprocessing change
   - 或让 prioritization algorithm 自然决定？

8. **Judge cost budgets（judge 成本预算）？**
   - spec 是否应包含 `max_judge_cost_usd` budget？
   - 当 budget 用尽时，切换到 hard-metrics-only mode 还是 stop？
   - 或者只在 log 中 track cost，让用户决定？

## 它与“直接使用 AutoResearch”的区别

AutoResearch 面向 single GPU 上的 ML training 设计。CE 版本需要处理：

1. **Multi-file changes**：真实 code changes 会跨多个 files
2. **Complex metrics**：不只是一个 scalar，而是 primary + guard rails + diagnostics
3. **Varied execution environments**：不只是 `python train.py`，而是任意 commands
4. **Integration with existing workflows（与现有 workflow 集成）**：learnings、review、ideation
5. **User-in-the-loop**：对 scope-expanding changes 暂停等待 approval，注入 new hypotheses
6. **Knowledge capture**：为团队记录什么有效以及为什么，而不只是留在 agent 的 context 中
7. **Non-ML domains**：clustering、search quality、API performance、test coverage、build times 等

## 此 Skill 的成功标准

- 用户可以在 <15 分钟内定义 optimization target
- Measurement scaffolding 在 loop 开始前完成验证
- Loop 可 unattended 运行数小时，并产生 measurable improvement
- 所有 experiments 都保存在 git 中，供之后 reference
- Winning strategy 被记录为 learning
- 人类 review experiment log 时，能理解尝试了什么以及为什么
- skill 能 graceful 处理 failures（bad experiments 不会污染 state）

## 第一次运行的经验（2026-03-30）

该 skill 在 clustering problem 上测试约 90 分钟。结果：

**有效的部分：**
- 运行 16 个 experiments，将 multi_member_pct 从 31.4% 提升到 72.1%
- 探索了多个 algorithm modes（basic、refine、bounded union-find）
- 正确识别 size-bounded union-find 是 winning approach
- parameter sweeps 中的 hypothesis diversity 合理

**失败的部分：**

1. **没有 LLM-as-judge evaluation** -- skill 默认使用 `type: hard`，并将 `multi_member_pct` 作为 primary metric 优化。这是可能误导的 proxy metric。如果 clusters 不 coherent，把 72% items 放入 clusters 的方案也没有价值。Phase 0.2 interactive spec creation 没有主动探测 target 是否是 qualitative，也没有引导到 judge mode。

   **已应用修复**：Phase 0.2 现在包含明确的 qualitative vs quantitative detection、何时使用每种 type 的具体示例、带 walkthrough questions 的 sampling strategy guidance，以及 rubric design guidance。skill 现在会强烈建议 qualitative targets 使用 `type: judge`。

2. **没有 disk persistence** -- Experiment results 只存在于 conversation context 中（作为表格 dump 到 chat）。如果 session 被 compact 或 crash，90 分钟 results 都会丢失。这直接违背了 Karpathy model：每个 experiment 后都会写入 `results.tsv`。

   **已应用修复**：在每个 phase boundary 增加 mandatory disk checkpoints（CP-0 到 CP-5）。每个 checkpoint 都要求 write-then-verify cycle：写文件、读回、确认内容存在。persistence discipline section 现在明确写明：“If you produce a results table in the conversation without writing those results to disk first, you have a bug.”

3. **没有提示 sampling strategy** -- 即使使用了 `type: judge`，skill 也没有引导用户设计 sampling strategy。对 clustering 来说，用户需要跨这些维度做 stratified sampling：按 size 排序的 top clusters（检查 mega-clusters）、mid-range clusters（代表性质量）、small clusters（检查连接是否真实）和 singletons（检查 false negatives）。缺少这种 domain-specific guidance。

   **已应用修复**：Phase 0.2 现在会用具体 questions 和 domain-specific examples 引导 sampling strategy design。

**关键 takeaway**：skill 在 schema 和 templates 中已经有正确 machinery，但 SKILL.md instructions 没有足够有力地引导 agent 使用这些 machinery。当 skill 静默默认到 hard type 时，“if judge type, do X” 这种 instructions 会被忽略。Instructions 需要主动检测正确路径并引导过去。

## 下一步

1. 使用 `type: judge` 重新测试 clustering use case，验证 judge loop 可 end-to-end 工作
2. 在带 context compaction 的长时间运行（2+ hours）中验证 disk persistence 可用
3. 使用第二个 use case（例如 prompt optimization、build performance）测试 generality
4. 考虑为跨 experiments 的 judge calibration 增加 anchor samples（Open Question #2）
5. 考虑 judge cost budgets（Open Question #8）
