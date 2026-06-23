---
name: ce-optimize
description: "运行 metric-driven iterative optimization loops：定义 measurable goal、运行 parallel experiments、用 hard gates 或 LLM-as-judge scores 衡量每个实验、保留 improvements，并 converge 到 best solution。优化 clustering quality、search relevance、build performance、prompt quality，或任何受益于 systematic experimentation 的 measurable outcome 时使用。"
argument-hint: "[optimization spec YAML 路径，或描述 optimization goal]"
---

# Iterative Optimization Loop（迭代优化循环）

运行 metric-driven iterative optimization。定义 goal、构建 measurement scaffolding，然后运行 parallel experiments，向 best solution converge。

## Interaction Method（交互方式）

使用平台 blocking question tool：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中展示 numbered options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。

## Input（输入）

<optimization_input> #$ARGUMENTS </optimization_input>

如果上方 input 为空，询问："你想优化什么？请描述目标，或提供 optimization spec YAML file 的路径。"

## Optimization Spec Schema（优化规格 Schema）

参考 spec schema 进行 validation：

`references/optimize-spec-schema.yaml`

## Experiment Log Schema（实验日志 Schema）

参考 experiment log schema 进行 state management：

`references/experiment-log-schema.yaml`

## Quick Start（快速开始）

首次 run 时，优化 signal 和 safety，而不是 maximum throughput：

- 当 metric objective 且 cheap to measure 时，从 `references/example-hard-spec.yaml` 开始
- 只有 actual quality 需要 semantic judgment 时，才使用 `references/example-judge-spec.yaml`
- 优先使用 `execution.mode: serial` 和 `execution.max_concurrent: 1`
- 首次 run 用 `stopping.max_iterations: 4` 和 `stopping.max_hours: 1` 设置上限
- Baseline 和 measurement harness 可信前，避免 new dependencies
- 对 judge mode，从 `sample_size: 10`、`batch_size: 5` 和 `max_total_cost_usd: 5` 开始

想了解此 skill 用途、何时使用 hard metrics vs LLM-as-judge，以及 example kickoff prompts，见：

`references/usage-guide.md`

---

## Persistence Discipline（持久化纪律）

**CRITICAL：磁盘上的 experiment log 是 single source of truth。Conversation context 不是 durable storage。只存在于 conversation 中的 results 一定会丢失。**

`.context/compound-engineering/ce-optimize/<spec-name>/` 下的 files 是 local scratch state。它们被 git ignored，因此可在同一机器上 local resumes 时保留，但不会被 commits、branches 或 pushes 保存，除非用户另行 export。

此 skill 可能运行数小时。Context windows 会 compact，sessions 会 crash，agents 会 restart。每个重要 state 都 **必须** 存在于 disk，而不是 agent memory。

**如果你在未先将 results 写入 disk 的情况下，在 conversation 中产出 results table，那就是 bug。** Conversation 是给用户看的。Experiment log file 用于 durability。

### Core Rules（核心规则）

1. **每个 experiment result 在 measurement 后立即写入 disk**：不是 batch 后，不是 evaluation 后，而是立即。Metrics 已知的那一刻，将 experiment entry append 到 experiment log file，再评估下一个 experiment。这是 #1 crash-safety rule。

2. **VERIFY 每个 critical write**：写入 experiment log 后，读回 file 并确认 entry 存在。这会捕获 silent write failures。Verification 通过前，不要进入下一个 experiment。

3. **每个 phase boundary 和每个 decision 前都从 disk re-read**：跨 phase transitions、batch boundaries，或任何可能耗时较长的 operation 后，绝不要信任 in-memory state。从 disk 重新读取 experiment log 和 strategy digest。

4. **Phase 3 期间 experiment log 是 append-only**：绝不 rewrite full file。Append new experiment entries。只有发现 new best 时才 in place update `best` section。这可防止 write 被 interrupted 时 data loss。

5. **用于 crash recovery 的 per-experiment result markers**：每个 experiment 在 measurement 后立即在其 worktree 中写入 `result.yaml` marker。Resume 时扫描这些 markers，recover 已 measured 但尚未 logged 的 experiments。

6. **每个 batch 后、生成 new hypotheses 前写入 strategy digest**：agent 决定下一步尝试什么时读取 digest（不是 memory）。

7. **绝不要在先写入 disk 前向用户 present results**：pattern 是 measure -> write to disk -> verify -> THEN show the user。不是反过来。

### Mandatory Disk Checkpoints（强制磁盘 Checkpoints）

这些是 non-negotiable write-then-verify steps。每个 checkpoint，agent 必须写入指定 file，然后读回确认 write succeeded。

| Checkpoint（检查点） | File Written（写入文件） | Phase |
|---|---|---|
| CP-0: Spec saved | `spec.yaml` | Phase 0, after user approval |
| CP-1: Baseline recorded | `experiment-log.yaml` (initial with baseline) | Phase 1, after baseline measurement |
| CP-2: Hypothesis backlog saved | `experiment-log.yaml` (hypothesis_backlog section) | Phase 2, after hypothesis generation |
| CP-3: Each experiment result | `experiment-log.yaml` (append experiment entry) | Phase 3.3, immediately after each measurement |
| CP-4: Batch summary | `experiment-log.yaml` (outcomes + best) + `strategy-digest.md` | Phase 3.5, after batch evaluation |
| CP-5: Final summary | `experiment-log.yaml` (final state) | Phase 4, at wrap-up |

**Verification step 的格式：**
1. 使用 native file-write tool 写入 file
2. 使用 native file-read tool 读回 file
3. 确认 expected content 存在
4. 如果 verification fails，retry write。如果失败两次，alert 用户。

### File Locations（文件位置，全部位于 `.context/compound-engineering/ce-optimize/<spec-name>/` 下）

| File（文件） | Purpose（用途） | Written When（写入时机） |
|------|---------|-------------|
| `spec.yaml` | Optimization spec（run 期间 immutable） | Phase 0（CP-0） |
| `experiment-log.yaml` | 所有 experiments 的 full history | CP-1 初始化，CP-3 append，CP-4 update |
| `strategy-digest.md` | 用于 hypothesis generation 的 compressed learnings | 每个 batch 后在 CP-4 写入 |
| `<worktree>/result.yaml` | Per-experiment crash-recovery marker | Measurement 后立即写入，在 CP-3 前 |

### On Resume（恢复时）

当 Phase 0.4 检测到 existing run：
1. 从 disk 读取 experiment log：这是 ground truth
2. 扫描 worktree directories 中尚未写入 log 的 `result.yaml` markers
3. Recover 任何 measured-but-unlogged experiments
4. 从 log 停止处继续

---

## Phase 0：Setup（设置）

### 0.1 Determine Input Type（判断输入类型）

检查 input 是：
- **Spec file path**（以 `.yaml` 或 `.yml` 结尾）：读取并 validate
- **Optimization goal 描述**：帮助用户 interactively 创建 spec

### 0.2 Load or Create Spec（加载或创建 Spec）

**如果提供 spec file：**
1. 读取 YAML spec file。Orchestrating agent 原生 parse YAML：不要 shell script parsing。
2. 根据 `references/optimize-spec-schema.yaml` validate：
   - 所有 required fields present
   - `name` 是 lowercase kebab-case，并且可安全用于 git refs / worktree paths
   - `metric.primary.type` 是 `hard` 或 `judge`
   - 如果 type 是 `judge`，`metric.judge` section 存在且包含 `rubric` 和 `scoring`
   - 至少定义一个 degenerate gate
   - `measurement.command` non-empty
   - `scope.mutable` 和 `scope.immutable` 各至少有一个 entry
   - Gate check operators valid（gate 检查操作符有效：`>=`、`<=`、`>`、`<`、`==`、`!=`）
   - `execution.max_concurrent` 至少为 1
   - 当 backend 是 `worktree` 时，`execution.max_concurrent` 不超过 6
3. 如果 validation fails，report errors 并请用户修复

**如果提供 description：**
1. Analyze project，理解可 measure 的内容
2. **Detect optimization target 是 qualitative 还是 quantitative**：这决定 `type: hard` vs `type: judge`，也是最重要的 spec decision：

   **使用 `type: hard`** 的情况：
   - Metric 是 scalar number，且有明确 "better" direction
   - Metric objectively measurable（metric 可客观测量：build time、test pass rate、latency、memory usage）
   - 评估 "is this result actually good?" 不需要 human judgment
   - Examples（示例）：reduce build time、increase test coverage、reduce API latency、decrease bundle size

   **使用 `type: judge`** 的情况：
   - Output quality 需要 semantic understanding 才能 evaluate
   - Human reviewer 需要查看 results 才能判断 "this is better"
   - Proxy metrics 存在但可能 mislead（例如 "more clusters" 不等于 "better clusters"）
   - Optimization 可能产生纸面上好看的 degenerate solutions
   - Examples（示例）：clustering quality、search relevance、summarization quality、code readability、UX copy、recommendation relevance

   **IMPORTANT（重要）：** 如果 target 是 qualitative，**strongly recommend `type: judge`**。解释 hard metrics alone 会优化 proxy numbers，却不检查 actual quality。向用户展示 three-tier approach：
   - **Degenerate gates**（hard、cheap、fast）：捕获 obviously broken solutions，例如 "all items in 1 cluster" 或 "0% coverage"。先运行。如果 gates fail，跳过昂贵的 judge step。
   - **LLM-as-judge**（actual optimization target）：sample outputs、按 rubric score、aggregate。这是 loop 优化的对象。
   - **Diagnostics**（logged, not gated）：distribution stats、counts、timing，用于理解 WHY judge score changed。

   如果用户坚持对 qualitative target 使用 `type: hard`，继续，但 warn results 可能 optimize misleading proxy。

3. **Design sampling strategy（采样策略）**（用于 `type: judge`）：

   引导用户定义 stratified sampling。关键问题是："What parts of the output space do you need to check quality on?"

   依次询问这些问题：
   - **一个 "item" 长什么样？**（cluster、search result page、summary 等）
   - **Natural size/quality strata 是什么？**（例如 large clusters vs small clusters vs singletons）
   - **Quality failures 最可能在哪里出现？**（例如 very large clusters 可能是 degenerate merges；singletons 可能是 missed groupings）
   - **什么 total sample size 能平衡 cost vs signal？**（default：30 items，按 output volume 调整）

   Example stratified sampling for clustering（聚类的 stratified sampling 示例）:
   ```yaml
   stratification:
     - bucket: "top_by_size"     # largest clusters — check for degenerate mega-clusters
       count: 10
     - bucket: "mid_range"       # middle of non-solo cluster size range — representative quality
       count: 10
     - bucket: "small_clusters"  # clusters with 2-3 items — check if connections are real
       count: 10
   singleton_sample: 15          # singletons — check for false negatives (items that should cluster)
   ```

   Sampling strategy 是 domain-specific。对于 search relevance，strata 可能是 "top-3 results"、"results 4-10"、"tail results"。对于 summarization，strata 可能是 "short documents"、"long documents"、"multi-topic documents"。

   **当 goal 涉及 coverage 时，Singleton evaluation 很关键**：用 singleton rubric sampling singletons，可检查 system 是否 missing obvious groupings。

4. **Design rubric（评分 Rubric）**（用于 `type: judge`）：

   帮助用户定义 scoring rubric。好的 rubric：
   - 有 1-5 scale（或类似 scale），并为每个 level 提供 concrete descriptions
   - 包含帮助 diagnose issues 的 supplementary fields（例如 `distinct_topics`、`outlier_count`）
   - 足够 specific，使两个 judges 会给出 similar scores
   - **不** 假设 bigger/more is better："3 items per cluster average" 本身不一定好或坏

   Example for clustering（聚类示例）:
   ```yaml
   rubric: |
     Rate this cluster 1-5:
     - 5: All items clearly about the same issue/feature
     - 4: Strong theme, minor outliers
     - 3: Related but covers 2-3 sub-topics that could reasonably be split
     - 2: Weak connection — items share superficial similarity only
     - 1: Unrelated items grouped together
     Also report: distinct_topics (integer), outlier_count (integer)
   ```

5. 引导用户完成剩余 spec fields：
   - 应 reject 哪些 degenerate cases？（gates：例如 "solo_pct <= 0.95" 捕获 all-singletons，"max_cluster_size <= 500" 捕获 mega-clusters）
   - 什么 command 运行 measurement？
   - 哪些 files 可修改？哪些 immutable？
   - 是否有 constraints 或 dependencies？
   - 如果这是 first run：recommend `execution.mode: serial`、`execution.max_concurrent: 1`、`stopping.max_iterations: 4` 和 `stopping.max_hours: 1`
   - 如果 `type: judge`：在 rubric 和 harness 可信前，recommend `sample_size: 10`、`batch_size: 5` 和 `max_total_cost_usd: 5`
6. 将 spec 写到 `.context/compound-engineering/ce-optimize/<spec-name>/spec.yaml`
7. 继续前向用户 present spec 以获得 approval

### 0.3 Search Prior Learnings（搜索 Prior Learnings）

Read `references/agents/learnings-researcher.md`，并 dispatch 一个由该 local prompt seed 的 generic subagent，搜索 similar topics 上的 prior optimization work。不要按 type/name dispatch standalone agent。如果 relevant learnings 存在，将它们纳入 approach。

### 0.4 Run Identity Detection（运行 Identity Detection）

检查 `optimize/<spec-name>` branch 是否已存在：

```bash
git rev-parse --verify "optimize/<spec-name>" 2>/dev/null
```

**如果 branch exists**，检查 `.context/compound-engineering/ce-optimize/<spec-name>/experiment-log.yaml` 中是否有 existing experiment log。

通过 platform question tool 向用户呈现 choice：
- **Resume**：从 disk 上的 experiment log 读取全部 state（不要依赖 prior session 的任何 in-memory context）。通过扫描 worktree directories 中的 `result.yaml` markers，recover 任何 measured-but-unlogged experiments。从 log 中最后一个 iteration number 继续。
- **Fresh start**：将 old branch archive 到 `optimize-archive/<spec-name>/archived-<timestamp>`，clear experiment log，从 scratch 开始

### 0.5 Create Optimization Branch and Scratch Space（创建 Optimization Branch 和 Scratch Space）

```bash
git checkout -b "optimize/<spec-name>"  # or switch to existing if resuming
```

创建 scratch directory：
```bash
mkdir -p .context/compound-engineering/ce-optimize/<spec-name>/
```

---

## Phase 1：Measurement Scaffolding（测量脚手架）

**此 phase 是 HARD GATE。进入 Phase 2 前，用户必须 approve baseline 和 parallel readiness。**

### 1.1 Clean-Tree Gate（Clean Tree Gate，干净工作区门禁）

验证 `scope.mutable` 或 `scope.immutable` 范围内 files 没有 uncommitted changes：

```bash
git status --porcelain
```

按 scope paths filter output。如果任何 in-scope files 有 uncommitted changes：
- Report 哪些 files dirty
- 继续前请用户 commit 或 stash
- In-scope files 的 working tree clean 前，不要继续

### 1.2 Build or Validate Measurement Harness（构建或验证测量 Harness）

**如果用户提供 measurement harness**（`measurement.command` 已存在）：
1. 通过 measurement script 运行一次：
   ```bash
   bash scripts/measure.sh "<measurement.command>" <timeout_seconds> "<measurement.working_directory or .>"
   ```
2. Validate JSON output（验证 JSON 输出）：
   - 包含所有 degenerate gate metric names 的 keys
   - 包含所有 diagnostic metric names 的 keys
   - Values 按预期为 numeric 或 boolean
3. 如果 validation fails，report 缺失内容，并请用户修复 harness

**如果 agent 必须 build harness：**
1. Analyze codebase，理解 current approach 和应 measure 的内容
2. Build evaluation script（例如 `evaluate.py`、`evaluate.sh` 或等价物）
3. 将 evaluation script path 添加到 `scope.immutable`：experiment agent 不得修改它
4. 运行一次并 validate output
5. 将 harness 及其 output present 给用户 review

### 1.3 Establish Baseline（建立 Baseline）

在 current code 上运行 measurement harness。

**If stability mode is `repeat`（如果 stability mode 为 `repeat`）：**
1. 运行 harness `repeat_count` 次
2. 使用 configured aggregation method（median、mean、min、max）aggregate results
3. Calculate variance across runs（计算多次运行间方差）
4. 如果 variance 超过 `noise_threshold`，warn 用户并建议增加 `repeat_count`

在 experiment log 中记录 baseline：
```yaml
baseline:
  timestamp: "<current ISO 8601 timestamp>"
  gates:
    <gate_name>: <value>
    ...
  diagnostics:
    <diagnostic_name>: <value>
    ...
```

如果 primary type 是 `judge`，也对 baseline output 运行 judge evaluation，以 establish starting judge score。

### 1.4 Parallelism Readiness Probe（并行就绪探测）

运行 parallelism probe script：
```bash
bash scripts/parallel-probe.sh "<project_directory>" "<measurement.command>" "<measurement.working_directory>" <shared_files...>
```

读取 JSON output。将任何 blockers 及 suggested mitigations present 给用户。将 probe 视为 intentionally narrow：它应 inspect measurement command、measurement working directory 和 explicit declared shared files，而不是整个 repository。

### 1.5 Worktree Budget Check（Worktree 预算检查）

统计 existing worktrees：
```bash
bash scripts/experiment-worktree.sh count
```

如果 count + `execution.max_concurrent` 会超过 12：
- Warn 用户
- 建议 cleaning up existing worktrees 或 reducing `max_concurrent`
- 不要 block：用户可自行承担风险继续

### 1.6 Write Baseline to Disk（CP-1，写入 Baseline 到磁盘）

**MANDATORY CHECKPOINT（强制 checkpoint）。** 向用户 present results 前，将带 baseline metrics 的 initial experiment log 写入 disk：

1. 在 `.context/compound-engineering/ce-optimize/<spec-name>/experiment-log.yaml` 创建 experiment log file
2. 包含 `references/experiment-log-schema.yaml` 中所有 required top-level sections：`spec`、`run_id`、`started_at`、`baseline`、`experiments` 和 `best`
3. 将 `experiments` seed 为空 array，并从 baseline snapshot seed `best`（使用 `iteration: 0`、baseline metrics，以及如果存在则使用 baseline judge scores），让 later phases 有 valid current-best state 可比较
4. 也可在此 optionally seed `hypothesis_backlog: []`，让 log shape 在 Phase 2 填充前保持 stable
5. **Verify**：读回 file，确认 required sections 存在且 baseline values 匹配
6. 只有之后才向用户 present results

### 1.7 User Approval Gate（用户 Approval Gate）

通过 platform question tool 向用户 present：

- **Baseline metrics**：所有 gate values、diagnostic values，以及 judge scores（如果适用）
- **Experiment log location**：显示 file path，让用户知道 results 保存在哪里
- **Parallel readiness**：probe results、任何 blockers、applied mitigations
- **Clean-tree status（干净工作区状态）**：confirmed clean
- **Worktree budget**：current count 和 projected usage
- **Judge budget**：estimated per-experiment judge cost 和 configured `max_total_cost_usd` cap（或明确说明 spend uncapped）

**Options（选项）：**
1. **Proceed（继续）**：approve baseline 和 parallel config，进入 Phase 2
2. **Adjust spec（调整 spec）**：继续前修改 spec settings
3. **Fix issues（修复问题）**：用户需要先 resolve blockers

用户 explicit approves 前，不要进入 Phase 2。

如果 primary type 是 `judge` 且 `max_total_cost_usd` 为 null，将其指出为 uncapped spend，并在继续前要求 explicit approval。

**State re-read：** Gate approval 后，从 disk 重新读取 spec 和 baseline。不要携带 stale in-memory values 前进。

---

## Phase 2：Hypothesis Generation（Hypothesis 生成）

### 2.1 Analyze Current Approach（分析当前 Approach）

读取 `scope.mutable` 内的 code，理解：
- Current implementation approach（当前实现方式）
- Obvious improvement opportunities（明显改进机会）
- Components 之间的 constraints 和 dependencies

如果 scope large 或 unfamiliar，可 optionally read `references/agents/repo-research-analyst.md`，并 dispatch 一个由该 local prompt seed 的 generic subagent，进行 deeper codebase analysis。不要按 type/name dispatch standalone agent。

### 2.2 Generate Hypothesis List（生成 Hypothesis 列表）

生成 initial hypotheses set。每个 hypothesis 应包含：
- **Description（描述）**：要尝试什么
- **Category（类别）**：standard categories 之一（signal-extraction、graph-signals、embedding、algorithm、preprocessing、parameter-tuning、architecture、data-handling），或 domain-specific category
- **Priority（优先级）**：基于 expected impact 和 feasibility，为 high、medium 或 low
- **Required dependencies（所需依赖）**：所需任何 new packages 或 tools

如果 input 中给出了 user-provided hypotheses，将其包含在内。

Initial backlog 目标为 10-30 个 hypotheses。Loop 期间可基于 learnings 生成更多。

### 2.3 Dependency Pre-Approval（依赖预审批）

收集所有 hypotheses 中 unique new dependencies。

如果任何 hypotheses 需要 new dependencies：
1. 通过 platform question tool 向用户 present full dependency list
2. 请求 bulk approval
3. 将每个 hypothesis 的 `dep_status` 标为 `approved` 或 `needs_approval`

带 unapproved dependencies 的 hypotheses 保留在 backlog 中，但在 batch selection 期间跳过。Wrap-up 时重新 present，以便 potential approval。

### 2.4 Record Hypothesis Backlog（CP-2，记录 Hypothesis Backlog）

**MANDATORY CHECKPOINT（强制 checkpoint）。** 将 initial backlog 写入 experiment log file 并 verify：
```yaml
hypothesis_backlog:
  - description: "Remove template boilerplate before embedding"
    category: "signal-extraction"
    priority: high
    dep_status: approved
    required_deps: []
  - description: "Try HDBSCAN clustering algorithm"
    category: "algorithm"
    priority: medium
    dep_status: needs_approval
    required_deps: ["scikit-learn"]
```

---

## Phase 3：Optimization Loop（优化循环）

此 phase 按 batches 重复，直到满足 stopping criterion。

### 3.1 Batch Selection（Batch 选择）

为此 batch 选择 hypotheses：
- 排除 `dep_status: needs_approval` 的 hypotheses，构建 runnable backlog
- 如果 `execution.mode` 是 `serial`，强制 `batch_size = 1`
- 否则，`batch_size = min(runnable_backlog_size, execution.max_concurrent)`
- Prefer diversity：尽可能从不同 categories 中选择
- 同一 category 内按 priority 选择（high first）

如果 backlog 为空且无法生成 new hypotheses，进入 Phase 4（wrap-up）。
如果 backlog 非空，但因为所有内容都需要 approval 或以其它方式 blocked 而没有 runnable hypotheses，进入 Phase 4，让用户 approve dependencies，避免无限 spinning。

### 3.2 Dispatch Experiments（派发 Experiments）

对 batch 中每个 hypothesis，按 `execution.mode` dispatch。在 `serial` mode 中，完整运行一个 experiment 后再选择下一个 hypothesis。在 `parallel` mode 中，同时 dispatch full batch。

**Worktree backend（worktree backend，worktree 后端）：**
1. 创建 experiment worktree：
   ```bash
   WORKTREE_PATH=$(bash scripts/experiment-worktree.sh create "<spec_name>" <exp_index> "optimize/<spec_name>" <shared_files...>)  # creates optimize-exp/<spec_name>/exp-<NNN>
   ```
2. 如果 configured，apply port parameterization（为 measurement script 设置 env vars）
3. 填充 experiment prompt template（`references/experiment-prompt-template.md`），包含：
   - Iteration number（iteration 编号）、spec name
   - Hypothesis description 和 category
   - Current best 和 baseline metrics
   - Mutable 和 immutable scope
   - Constraints 和 approved dependencies
   - Last 10 experiments 的 rolling window（concise summaries）
4. 使用 filled prompt dispatch subagent，并在 experiment worktree 中工作

**Codex backend（Codex backend，Codex 后端）：**
1. 检查 environment guard：如果已经在 Codex sandbox 内，不要 delegate：
   ```bash
   # If these exist, we're already in Codex -- fall back to subagent
   test -n "${CODEX_SANDBOX:-}" || test -n "${CODEX_SESSION_ID:-}" || test ! -w .git
   ```
2. 填充 experiment prompt template
3. 将 filled prompt 写入 temp file
4. 通过 Codex dispatch：
   ```bash
   cat /tmp/optimize-exp-XXXXX.txt | codex exec --skip-git-repo-check - 2>&1
   ```
5. Security posture：使用用户选择（如果 spec 中未设置，每个 session 询问一次）

### 3.3 Collect and Persist Results（收集并持久化 Results）

Experiments 完成时就处理：写 results 前不要等待 entire batch finish。

对每个 completed experiment，**立即**：

1. 在 experiment worktree 中 **Run measurement（运行 measurement）**：
   ```bash
   bash scripts/measure.sh "<measurement.command>" <timeout_seconds> "<worktree_path>/<measurement.working_directory or .>" <env_vars...>
   ```
   - 如果 stability mode 是 `repeat`，在该 working directory 中运行 measurement harness `repeat_count` 次，并在 evaluating gates 或 ranking experiment 前，完全按 Phase 1 的方式 aggregate results。
   - 使用 aggregated metrics 作为 experiment score；如果 variance 超过 `noise_threshold`，在 learnings 中记录，让 operator 知道 result noisy。

2. **Write crash-recovery marker（写入 crash-recovery marker）**：measurement 后立即在 experiment worktree 中写入包含 raw metrics 的 `result.yaml`。这确保即使 agent 在更新 main log 前 crash，measurement 仍可 recover。

3. 从 measurement script **读取 raw JSON output**

4. **Evaluate degenerate gates（评估 degenerate gates）**：
   - 对 `metric.degenerate_gates` 中每个 gate，parse operator 和 threshold
   - 将 metric value 与 threshold 比较
   - 如果任何 gate fails：将 outcome 标为 `degenerate`，跳过 judge evaluation，节省成本

5. **如果 gates pass 且 primary type 是 `judge`**：
   - 读取 experiment output（cluster assignments、search results 等）
   - 按 `metric.judge.stratification` config apply stratified sampling（使用 `sample_seed`）
   - 将 samples 分组成 `metric.judge.batch_size` 大小的 batches
   - 为每个 batch 填充 judge prompt template（`references/judge-prompt-template.md`）
   - Dispatch `ceil(sample_size / batch_size)` 个 parallel judge sub-agents
   - 每个 sub-agent 返回 structured JSON scores
   - Aggregate scores：从 `metric.judge.scoring.primary`（应匹配 `metric.primary.name`）计算 configured primary judge field，并加上任何 `scoring.secondary` values
   - 如果 `singleton_sample > 0`：也 dispatch singleton evaluation sub-agents

6. **如果 gates pass 且 primary type 是 `hard`**：
   - 直接使用 measurement output 中的 metric value

7. **立即 append 到 disk 上的 experiment log（CP-3）**：不要推迟到 batch evaluation。现在就将 experiment entry（iteration、hypothesis、outcome、metrics、learnings）写入 `.context/compound-engineering/ce-optimize/<spec-name>/experiment-log.yaml`。当 experiment 有 valid metrics 但尚未与 current best 比较时，使用 transitional outcome `measured`。在 evaluation step 中将 outcome 更新为 `kept`、`reverted` 或其它 terminal state，但 raw metrics 已在 disk 上，避免 context compaction 丢失。

8. **VERIFY write（CP-3 verification）**：从 disk 读回 experiment log，确认刚写入的 entry 存在。如果 verification fails，retry write。此 entry confirmed on disk 前，不要继续下一个 experiment。

**为什么 immediately + verify？** Agent 的 context window 不是 durable store。Long runs 期间 context compaction、session crashes 和 restarts 都是预期情况。如果 results 只存在于 agent memory，就会丢失。Karpathy 的 autoresearch 在每个 single experiment 后写入 `results.tsv`：此 skill 必须对 experiment log 做同样的事。Verification step 捕获 silent write failures，否则会丢 data。

### 3.4 Evaluate Batch（评估 Batch）

Batch 中所有 experiments measured 后：

1. 按 primary metric improvement **rank** experiments：
   - 对 hard metrics：使用 `metric.primary.direction` 与 current best 比较（`maximize` 表示越高越好，`minimize` 表示越低越好），并要求 absolute improvement 超过 `measurement.stability.noise_threshold` 才视为 real win
   - 对 judge metrics：将 configured primary judge score（`metric.judge.scoring.primary` / `metric.primary.name`）与 current best 比较，并要求其超过 `minimum_improvement`

2. **Identify best experiment（识别最佳 experiment）**：它通过所有 gates，且 improves primary metric

3. **如果 best improves on current best：KEEP**
   - 先 commit experiment branch，让 winning diff 在任何 merge 或 cherry-pick 前作为 real commit 存在
   - 该 commit 只包含 mutable-scope changes；如果没有 remaining eligible diff，将 experiment 视为 non-improving 并 revert
   - 将 committed experiment branch merge 到 optimization branch
   - Experiment commit 使用 message `optimize(<spec-name>): <hypothesis description>`
   - Merge 成功后，cleanup winner 的 experiment worktree 和 branch；optimization branch 上 integrated commit 是 durable artifact
   - 这现在是 subsequent batches 的 new baseline

4. **Check file-disjoint runners-up（检查 file-disjoint runners-up）**（最多 `max_runner_up_merges_per_batch`）：
   - 对每个也 improved 的 runner-up，检查其与 kept experiment 的 file-level disjointness
   - **File-level disjointness**：如果两个 experiments 修改完全不同 files，则它们 disjoint。Same file = overlapping，即使是不同 lines。
   - 如果 disjoint：将 runner-up cherry-pick 到 new baseline，并重跑 full measurement
   - 如果 combined measurement strictly better：保留 cherry-pick（outcome：`runner_up_kept`），然后 cleanup 该 runner-up 的 experiment worktree 和 branch
   - 否则：revert cherry-pick，log 为 "promising alone but neutral/harmful in combination"（outcome：`runner_up_reverted`），然后 cleanup runner-up 的 experiment worktree 和 branch
   - 第一个 failed combination 后停止

5. **Handle deferred deps（处理 deferred deps）**：需要 unapproved dependencies 的 experiments 得到 outcome `deferred_needs_approval`

6. **Revert all others（revert 其他所有内容）**：cleanup worktrees，log as `reverted`

### 3.5 Update State（CP-4，更新 State）

**MANDATORY CHECKPOINT（强制 checkpoint）。** 到此时，individual experiment results 已在 disk 上（step 3.3 写入）。此 step update aggregate state 并 verify。

1. **从 disk re-read experiment log**：不要信任 in-memory state。Log 是 source of truth。

2. **Finalize outcomes**：更新 step 3.4 evaluation 中的 experiment entries（标记 `kept`、`reverted`、`runner_up_kept` 等）。立即将这些 outcome updates 写入 disk。

3. 如果发现 new best，**update experiment log 中的 `best` section**。写入 disk。

4. **Write strategy digest** 到 `.context/compound-engineering/ce-optimize/<spec-name>/strategy-digest.md`：
   - So far tried 的 categories（带 success/failure counts）
   - 本 batch 和整体的 key learnings
   - Exploration frontier：哪些 categories 和 approaches 仍 untried
   - Current best metrics 和 improvement from baseline

5. 基于 learnings **generate new hypotheses**：
   - 从 disk 重新读取 strategy digest（不是 memory）
   - 读取 rolling window（disk 上 log 中的 last 10 experiments）
   - 不要读取 full experiment log：使用 digest 获取 broad context
   - 将 new hypotheses 添加到 backlog，并将 updated backlog 写入 disk

6. **将 updated hypothesis backlog 写入 disk**：experiment log 的 backlog section 必须反映 newly added hypotheses 和 removed（tested）ones。

**CP-4 Verification：** 从 disk 读回 experiment log。确认：(a) 此 batch 的所有 experiment outcomes finalized，(b) `best` section 反映 current best，(c) hypothesis backlog updated。读回 `strategy-digest.md` 并确认其存在。只有之后才进入 next batch 或 stopping criteria check。

**Checkpoint：此时，此 batch 的所有 state 都在 disk 上。如果 agent crashes and restarts，可从 experiment log 无损 resume。**

### 3.6 Check Stopping Criteria（检查停止条件）

如果任一条件为 true，则 stop loop：
- **Target reached（达到目标）**：`stopping.target_reached` 为 true、`metric.primary.target` 已设置，且 primary metric 根据 `metric.primary.direction` 达到 target（`maximize` 用 `>=`，`minimize` 用 `<=`）
- **Max iterations（最大迭代数）**：total experiments run >= `stopping.max_iterations`
- **Max hours（最长小时数）**：Phase 3 start 后 wall-clock time >= `stopping.max_hours`
- **Judge budget exhausted（judge 预算耗尽）**：cumulative judge spend >= `metric.judge.max_total_cost_usd`（如果设置）
- **Plateau（平台期）**：连续 `stopping.plateau_iterations` 个 experiments 无 improvement
- **Manual stop（手动停止）**：user interrupts（save state 并进入 Phase 4）
- **Empty backlog（backlog 为空）**：没有 remaining hypotheses，且无法生成 new ones

如果未满足 stopping criterion，进入 next batch（step 3.1）。

### 3.7 Cross-Cutting Concerns（横切关注点）

**Codex failure cascade（Codex 失败级联）：** Track consecutive Codex delegation failures。连续 3 次 failures 后，对 remaining experiments auto-disable Codex 并 fall back 到 subagent dispatch。Log switch。

**Error handling（错误处理）：** 如果 experiment 的 measurement command crashes、times out 或产生 malformed output：
- 用 error message log as outcome `error` 或 `timeout`
- Revert experiment（回退 experiment，cleanup worktree）
- Loop 继续处理 batch 中 remaining experiments

**Progress reporting（进度报告）：** 每个 batch 后 report：
- Batch N of estimated M（基于 backlog size）
- This batch 和 total 中已 run 的 experiments
- Current best metric 和 improvement from baseline
- Cumulative judge cost（如果适用）

**Crash recovery（崩溃恢复）：** 见 Persistence Discipline section。Per-experiment `result.yaml` markers 在 step 3.3 写入。Individual experiment results 在 step 3.3 立即 append 到 log。Batch-level state（outcomes、best、digest）在 step 3.5 写入。Resume（Phase 0.4）时，disk 上的 log 是 ground truth：扫描任何尚未 reflected in log 的 `result.yaml` markers。

---

## Phase 4：Wrap-Up（收尾）

### 4.1 Present Deferred Hypotheses（呈现 Deferred Hypotheses）

如果任何 hypotheses 因 unapproved dependencies 被 deferred：
1. 列出它们及其 dependency requirements
2. 询问用户是 approve、skip，还是 save for a future run
3. 如果 approved：添加到 backlog，并 offer re-enter Phase 3 再跑一轮

### 4.2 Summarize Results（总结结果）

Present comprehensive summary（呈现完整 summary）：

```
Optimization: <spec-name>
Duration: <wall-clock time>
Total experiments: <count>
  Kept: <count> (including <runner_up_kept_count> runner-up merges)
  Reverted: <count>
  Degenerate: <count>
  Errors: <count>
  Deferred: <count>

Baseline -> Final:
  <primary_metric>: <baseline_value> -> <final_value> (<delta>)
  <gate_metrics>: ...
  <diagnostics>: ...

Judge cost: $<total_judge_cost_usd> (if applicable)

Key improvements:
  1. <kept experiment 1 hypothesis> (+<delta>)
  2. <kept experiment 2 hypothesis> (+<delta>)
  ...
```

### 4.3 Preserve and Offer Next Steps（保留结果并提供下一步）

Optimization branch（`optimize/<spec-name>`）保留所有 kept experiments 的 commits。
Experiment log 和 strategy digest 保留在 local `.context/...` scratch space 中，仅供本机 resume 和 audit；它们不会随 branch 传播，因为 `.context/` 被 gitignored。

通过 platform question tool present post-completion options：

1. 对 cumulative diff（baseline to final）**运行 `/ce-code-review`**。在 optimization branch 上加载 `ce-code-review` skill（interactive 或 `mode:agent`）。要在 next option 前 land eligible fixes，应用下方 mechanical-apply bar。

   **Mechanical-apply bar：** Apply 任何带 concrete `suggested_fix` 且明显是 clear、reversible improvement 的 finding；当 reviewer wrong 时 push back（keep，不 apply），并说明原因。Defer 任何正确 fix 需要 design 或 product decision 的内容（architecture direction、contract shape、需要 sign-off 的 behavior change），以及任何没有 concrete fix 可执行的 finding：surface deferred 内容。Editing 前确认 evidence 仍匹配 `file:line`。Applying 后运行 tests（至少对 changed 内容运行 targeted tests；multi-file edits 运行 broader suite）。此 step 不 commit 或 push：将 diff 留在 optimization branch，供 Create PR option 使用。
2. **运行 `/ce-compound`**，将 winning strategy 记录为 institutional learning。
3. 从 optimization branch 到 default branch **Create PR**。
4. **Continue** more experiments：使用 current state re-enter Phase 3。先 State re-read。
5. **Done**：保留 optimization branch 供 manual review。

### 4.4 Cleanup（清理）

Clean up scratch space（清理 scratch space）：
```bash
# Keep the experiment log for local resume/audit on this machine
# Remove temporary batch artifacts
rm -f .context/compound-engineering/ce-optimize/<spec-name>/strategy-digest.md
```

如果用户可能 local resume 或想要 local audit trail，不要 delete experiment log。如果他们需要 durable shared artifact，cleanup 前将 results summarize 或 export 到 tracked path。
不要 delete 仍被 referenced 的 experiment worktrees。
