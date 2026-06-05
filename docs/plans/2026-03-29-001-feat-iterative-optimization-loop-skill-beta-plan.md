---
title: "feat(ce-optimize): 添加 iterative optimization loop skill"
type: feat
status: completed
date: 2026-03-29
origin: docs/brainstorms/2026-03-29-iterative-optimization-loop-requirements.md
deepened: 2026-03-29
---

# feat(ce-optimize): 添加 iterative optimization loop skill

## 概览

添加新的 `/ce-optimize` skill，实现 metric-driven iterative optimization：先定义可衡量目标，构建 measurement scaffolding，再运行自动化 loop，尝试多个 parallel experiments，根据 hard gates 和/或 LLM-as-judge quality scores 衡量每个实验，保留改进，并逐步收敛到最佳方案。灵感来自 Karpathy 的 autoresearch，但泛化到 multi-file code changes、complex metrics 和非 ML 领域。

## 问题框架

CE 已有 knowledge-compounding 和 quality gates，但缺少用于 systematic experimentation 的 skill。当 developer 需要改进可衡量结果（clustering quality、build performance、search relevance）时，目前只能手动迭代：一次改一个点，然后凭肉眼判断结果。该 skill 自动化 modify-measure-decide cycle，通过 worktrees 或 Codex sandboxes 并行运行 experiments，并将所有 experiment history 保存在 git 中，便于后续引用。（见 origin：`docs/brainstorms/2026-03-29-iterative-optimization-loop-requirements.md`）

## 需求追踪

- R1. 用户可以在 <15 分钟内定义 optimization target（spec file）
- R2. Measurement scaffolding 在 loop 开始前完成验证（hard phase gate）
- R3. 三层 metric architecture：degenerate gates（廉价 boolean checks）-> LLM-as-judge quality score（sampled、cost-controlled）-> diagnostics（记录但不作为 gate）
- R4. 带 stratified sampling 和 user-defined rubric 的 LLM-as-judge 是一等 primary metric type，而不是 deferred
- R5. Experiments 默认使用 worktree isolation 或 Codex sandboxes 并行运行
- R6. Parallelism blockers（ports、shared DBs、exclusive resources）在 Phase 1 主动检测并缓解
- R7. Dependencies 在 hypothesis generation 期间批量预批准；未批准 deps 会 defer 对应 hypothesis，但不阻塞 pipeline
- R8. Flaky metrics 可配置（repeat N times，通过 median/mean 聚合，noise threshold）
- R9. 所有 experiments 保存在 git 中用于后续引用；experiment log 捕获 hypothesis、metrics、outcome 和 learnings
- R10. Winning strategy 通过 `/ce:compound` integration 文档化
- R11. v1 即支持 Codex，使用既有 `codex exec` stdin-pipe pattern
- R12. Loop 能优雅处理 failures（坏 experiments 不污染 state）
- R13. 多种 stopping criteria：target reached、max iterations、max hours、plateau（N iterations 无改进）、manual stop

## 范围边界

- v1 不做 tree search / backtracking，只做 linear keep/revert，并可选手动 branch points
- 不做 batch size adaptation，使用固定且用户可调的 `max_concurrent`
- v1 不包含 LLM-as-judge calibration anchors，推迟到未来 iteration
- v1 不包含 rubric mid-loop iteration protocol
- 不强制 judge cost budget；cost 记录在 log 中，由用户决定
- 本计划覆盖 skill、reference files 和 scripts；不覆盖 CLI converter 或其他 targets 的变更

## 上下文与调研

### 相关代码和模式

- **Skill format**：`plugins/compound-engineering/skills/ce-work/SKILL.md`，带 YAML frontmatter、`#$ARGUMENTS` input、parallel subagent dispatch 的 multi-phase skill。
- **Parallel dispatch**：`plugins/compound-engineering/skills/ce-review/SKILL.md`，并行生成 N 个 reviewers，并 merge structured JSON results。
- **Subagent template（subagent 模板）**：`plugins/compound-engineering/skills/ce-review/references/subagent-template.md`，confidence rubric、false-positive suppression。
- **Codex delegation（Codex 委派）**：`plugins/compound-engineering/skills/ce-work-beta/SKILL.md`，`codex exec` stdin pipe、security posture、3-failure auto-disable、environment guard。
- **Worktree management（worktree 管理）**：`plugins/compound-engineering/skills/git-worktree/SKILL.md` + `scripts/worktree-manager.sh`。
- **Scratch space**：`.context/compound-engineering/<skill-name>/`，带 per-run subdirs 支持 concurrent runs。
- **State file patterns**：plan files 中的 YAML frontmatter，ce:review references 中的 JSON schemas。
- **Skill-to-skill references**：pass-through 使用 `Load the <skill> skill`；published commands 使用 `/ce:compound` slash syntax。

### 机构经验

- **State machine design 对 multi-phase workflows 是强制要求**：每次 transition 后重新读取 state，绝不携带 stale values（`docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`）
- **Measurement harnesses 采用 script-first**：把 mechanical work（parsing、classification、aggregation）移入 bundled scripts，节省 60-75% tokens（`docs/solutions/skill-design/script-first-skill-architecture.md`）
- **Confidence rubric pattern**：使用 0.0-1.0 scale，带显式 suppression threshold（0.60 已在 production 验证），并定义 false-positive categories（`ce:review subagent-template.md`）
- **传 paths 而不是 content 给 sub-agents**：orchestrator 发现 paths，workers 自行读取所需内容（`docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`）
- **State transitions 必须 load-bearing**：如果存在 experiment states（proposed/running/measured/evaluated），至少一个 consumer 必须基于它们 branch（`docs/solutions/workflow/todo-status-lifecycle.md`）
- **Branch name sanitization**：`/` 到 `~` 对 filesystem paths 是 injective（`docs/solutions/developer-experience/branch-based-plugin-install-and-testing.md`）

## 关键技术决策

- **Linear keep/revert with parallel batches**：每个 batch 并行运行 N 个 experiments；如果 best-in-batch 优于 current best，就保留它，其余全部 revert。比 tree search 简单，并兼容 git-native workflows。（见 origin：Decision 1）
- **Three-tier metrics**：Degenerate gates（fast、free、boolean）-> LLM-as-judge 或 hard primary metric -> diagnostics（仅记录）。Gates 先运行，避免把 judge calls 浪费在明显坏掉的 solutions 上。（见 origin：Decision 2）
- **通过 stratified sampling 做 LLM-as-judge**：每次 evaluation 约 30 个 samples，按 output category 分层（small/medium/large clusters），并使用 user-defined rubric。成本约每个 experiment $0.30-0.90。Judge prompt 是 immutable（measurement harness 的一部分）。Judge score 必须超过 `minimum_improvement`（默认在 1-5 scale 上为 0.3）才可接受为“better”，以处理 experiments 之间 output structure 变化导致的 sample-composition variance。（见 origin：D4）
- **Model-parsed spec, script-executed measurement**：orchestrating agent 直接读取并解析 YAML spec file（agents 原生能够处理 YAML）。measurement script 接收 flat arguments（command、timeout、working directory），运行 command，并返回 raw JSON output。agent 评估 gates 并聚合 stability repeats。这遵循既有 plugin pattern：shell scripts 不解析 YAML，model 解释 structure，scripts 处理 I/O。
- **Parallel-batch merge strategy**：当一个 batch 中多个 experiments 都改进 metric 时：(1) 保留最佳 experiment，merge 到 optimization branch。(2) 对每个同样改进的 runner-up：检查它与已保留 experiment 的 **file-level disjointness**（两者修改同一文件即 overlapping，即使是不同 lines）。(3) 若 disjoint：把 runner-up cherry-pick 到新 baseline，并重新运行完整 measurement。(4) 若 combined measurement 严格更好：保留 cherry-pick；否则 revert，并记录为“单独看有前途，但组合后 neutral/harmful”。(5) 按 metric 降序处理 runners-up；第一次组合失败后停止。Config：`max_runner_up_merges_per_batch`（默认 1）。Rationale：两个各自独立提升 metric 的 changes 在组合时可能互相干扰（例如一个收紧 thresholds，另一个放宽）。这是预期情况，不是 bug。
- **Worktree isolation for parallel experiments**：每个 experiment 在 `.worktrees/` 下获得一个 git worktree（与既有 convention 对齐），并复制 shared resources。Codex sandboxes 作为 opt-in alternative。Orchestrator 保持 git control。worktree backend 的 max concurrent 上限为 6（git performance 在约 10-15 个 concurrent worktrees 后下降）；8+ 仅对 Codex backend 有效。（见 origin：D6）
- **通过 stdin pipe dispatch Codex**：把 prompt 写入 temp file，pipe 到 `codex exec`，完成后收集 diff。Security posture 每个 session 选择一次。（见 origin：D5）
- **通过 rolling window + strategy digest 管理 context window**：experiment log 无限增长（每个 experiment 20-30 行）。orchestrator 不在每次 iteration 读取完整 log；而是：(1) 在 working memory 中维护最近 10 个 experiments 的 rolling window，(2) 每个 batch 后写入 strategy digest，总结尝试过的 categories、成功/失败内容以及 exploration frontier，(3) 仅在检查某个 specific hypothesis 是否已经尝试过时，按过滤 section（例如 category）读取完整 log。完整 log 仍是磁盘上的 durable ground truth。
- **通过 batched parallel sub-agents dispatch judge**：Orchestrator 按 stratification config 选择 samples，将其分组为 `judge.batch_size`（默认 10）的 batches，并 dispatch `ceil(sample_size / batch_size)` 个 parallel sub-agents。每个 sub-agent 评估自己的 batch 并返回 structured JSON scores。Orchestrator 聚合结果。这遵循 ce:review parallel reviewer dispatch pattern，并避免为每个 sample 启动一个 sub-agent 的 overhead。

## 开放问题

### 规划期间已解决

- **Skill naming**：`ce-optimize`，directory 为 `ce-optimize/`。frontmatter name 现在匹配 directory 和 slash command。
- **Experiment state 存放位置**：`.context/compound-engineering/ce-optimize/<spec-name>/`，包含 spec、experiment log、strategy digest 和 per-batch scratch。成功完成后清理，最终 experiment log 除外，它会移动到 optimization branch。
- **Experiment branches 命名方式**：main optimization branch 使用 `optimize/<spec-name>`。per-experiment worktree branches：`optimize/<spec-name>/exp-<NNN>`。filesystem paths 中用 `/` 到 `~` 进行 sanitization。
- **Judge model selection**：默认 Haiku（fast、cheap），可选 Sonnet。写在 spec file 中。
- **谁解析 YAML spec**：orchestrating agent（model），不是 measurement script。CE scripts 不解析 YAML；既有 pattern 是 model 读取 structure，scripts 处理 I/O。measurement script 接收 flat arguments 并返回 raw JSON。
- **Judge dispatch mechanism**：遵循 ce:review pattern 的 batched parallel sub-agents。Orchestrator 选择 samples，分组为 `judge.batch_size`（默认 10）的 batches，dispatch parallel sub-agents，并聚合 JSON scores。
- **Re-run 时 branch collision**：Phase 0 检测已有 `optimize/<spec-name>` branch 和 experiment log。向用户提供选择：resume（继承既有 state，从上次 iteration 继续）或 fresh start（将旧 branch archive 到 `optimize/<spec-name>/archived-<timestamp>`，清空 log）。
- **Judge score comparability**：添加 `judge.minimum_improvement`（默认在 1-5 scale 上为 0.3）作为接受改进所需的 minimum improvement。这处理 output structure 变化时的 sample-composition variance。它不同于处理 run-to-run flakiness 的 `noise_threshold`。

### 推迟到实现阶段

- **Exact gate check evaluation**：agent 解释 spec 中类似 `">= 0.85"` 的 operator strings，并用 metric values 评估。具体 edge cases 取决于用户提供的 metric shapes。
- **Codex exec flag compatibility**：精确的 `codex exec` flags 可能变化。skill 应检查 `codex --version` 并适配。
- **Worktree cleanup timing**：是在每个 batch 后立即清理 worktrees，还是推迟到 end-of-loop，可能取决于 runtime 发现的 disk space constraints。
- **Loop 中发现 harness bug**：如果 measurement harness 本身在 loop 中被发现有 bug，用户必须手动修复。harness 按设计 immutable，agent 不能修改。修复后，用户应重新 baseline 并 resume（或 fresh start）。具体 UX 取决于 implementation。

## 高层技术设计

> *此处展示 intended approach，并为 review 提供方向性 guidance，不是 implementation specification。实现 agent 应把它视为 context，而不是要照抄的 code。*

```
                    +-----------------+
                    |  User provides  |
                    |  goal + scope   |
                    +--------+--------+
                             |
                    +--------v--------+
                    | Phase 0: Setup  |
                    | Create/load spec|
                    +--------+--------+
                             |
                    +--------v-----------+
                    | Phase 1: Scaffold  |
                    | Build/validate     |
                    | harness + baseline |
                    | Probe parallelism  |
                    +--------+-----------+
                             |
                      [USER GATE]
                             |
                    +--------v-----------+
                    | Phase 2: Hypotheses|
                    | Generate + approve |
                    | deps in bulk       |
                    +--------+-----------+
                             |
              +--------------v--------------+
              |   Phase 3: Optimize Loop    |
              |                             |
              |  +--- Batch N hypotheses    |
              |  |                          |
              |  |  +--+ Worktree/Codex     |
              |  |  |  | per experiment     |
              |  |  |  |  implement         |
              |  |  |  |  measure           |
              |  |  |  |  collect metrics   |
              |  |  +--+                    |
              |  |                          |
              |  +--- Evaluate batch        |
              |  |    gates -> judge -> rank |
              |  |    KEEP best / REVERT    |
              |  |                          |
              |  +--- Update log + backlog  |
              |  +--- Check stop criteria   |
              |  +--- Next batch            |
              +--------------+--------------+
                             |
                    +--------v--------+
                    | Phase 4: Wrap-Up|
                    | Summarize       |
                    | /ce:compound    |
                    | /ce:review      |
                    +--------+--------+
                             |
                        [DONE]
```

## 实施单元

### Phase A：Reference Files 和 Scripts（units 之间无依赖）

- [ ] **Unit 1：Optimization spec schema（优化 spec schema）**

**目标：** 定义 optimization spec file 的 YAML schema，供用户配置 optimization run。

**需求：** R1, R3, R4, R5, R8, R13

**依赖：** 无

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/references/optimize-spec-schema.yaml`

**方法：**
- 定义带注释的 YAML schema document（不是 JSON Schema：YAML 在 skill-authoring context 中更易读），供 skill reference 用来 validate user-provided specs。
- 覆盖全部三个 metric tiers：`metric.primary`（type: hard|judge）、`metric.degenerate_gates`、`metric.diagnostics`、`metric.judge`。
- 包含 `measurement`（command、timeout、stability）、`scope`（mutable/immutable）、`execution`（mode、backend、max_concurrent）、`parallel`（port strategy、shared files、exclusive resources）、`dependencies`、`constraints`、`stopping`
- 包含 inline comments，说明每个 field、valid values 和 defaults。
- 使用 brainstorm 中的两个 example specs（hard-metric primary 和 LLM-judge primary）作为 validation targets。

**遵循模式：**
- `plugins/compound-engineering/skills/ce-review/references/findings-schema.json`：structured schema reference
- `plugins/compound-engineering/skills/ce-compound/references/schema.yaml`：带 inline comments 的 YAML schema

**测试场景：**
- Schema 覆盖 brainstorm 中两个 example specs 的所有 fields
- Required vs optional fields 标记清晰
- 每个 optional field 都记录 default values

**验证：**
- 用户只读此文件即可创建 valid spec，无需查阅其它 docs

---

- [ ] **Unit 2：Experiment log schema（experiment log schema，实验日志 schema）**

**目标：** 定义 experiment log 的 YAML schema；它会在 optimization run 期间持续累积。

**需求：** R9, R12

**依赖：** 无

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/references/experiment-log-schema.yaml`

**方法：**
- 定义结构：baseline metrics、experiments array（iteration、batch、hypothesis、category、changes、gates、diagnostics、judge、outcome、primary_delta、learnings、commit），以及 best-so-far summary
- 包含全部 experiment outcome states：`kept`、`reverted`、`degenerate`、`error`、`deferred_needs_approval`、`timeout`
- 这些 states 是 load-bearing：loop 会基于它们 branch（遵循 todo-status-lifecycle learning）

**遵循模式：**
- `plugins/compound-engineering/skills/ce-compound/references/schema.yaml`

**测试场景：**
- Schema 覆盖 brainstorm 中完整的 experiment log example
- 所有 outcome states 都记录 transition rules

**验证：**
- implementer 只读此 schema 就能无歧义地生成或解析 experiment log

---

- [ ] **Unit 3：Experiment worker prompt template（experiment worker prompt 模板）**

**目标：** 定义用于将每个 experiment dispatch 给 subagent 或 Codex 的 prompt template。

**需求：** R5, R11

**依赖：** 无

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/references/experiment-prompt-template.md`

**方法：**
- Template 包含 variable substitution slots：`{iteration}`、`{spec.name}`、`{current_best_metrics}`、`{hypothesis.description}`、`{scope.mutable}`、`{scope.immutable}`、`{constraints}`、`{approved_dependencies}`、`{recent_experiment_summaries}`
- 包含 explicit instructions：只 implement，不要运行 harness，不要 commit，不要修改 immutable files
- 末尾包含 `git diff --stat` instruction，供 orchestrator 收集 changes
- 遵循 path-not-content pattern：large context 传 file paths，只 inline 小型 structural data

**遵循模式：**
- `plugins/compound-engineering/skills/ce-review/references/subagent-template.md`：variable substitution pattern 和 output contract

**测试场景：**
- 所有 slots 填充后，template 生成清晰且无歧义的 prompt
- Immutable file constraints 足够突出且无歧义
- 同时适用于 subagent 和 Codex dispatch（template body 中没有 platform-specific assumptions）

**验证：**
- implementer 可填充此 template 并 dispatch，无需读取其它 reference files

---

- [ ] **Unit 4：Judge evaluation prompt template（judge evaluation prompt 模板）**

**目标：** 定义用于 sampled outputs 的 LLM-as-judge evaluation prompt template。

**需求：** R3, R4

**依赖：** 无

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/references/judge-prompt-template.md`

**方法：**
- 两个 template sections：cluster/item evaluation（使用 spec 中的 user rubric）和 singleton evaluation（使用用户的 `singleton_rubric`）
- Template 包含：rubric text、待 evaluate 的 sample data，以及明确 JSON output format instructions
- 包含从 ce:review rubric pattern 适配的 confidence calibration guidance：每次 judge call 返回 score + structured metadata
- Template 默认面向 Haiku 设计：prompt 保持 concise 且 well-structured，适配 smaller models
- 包含 false-positive suppression concept：sample ambiguous 时 judge 应 flag，而不是强行给分

**遵循模式：**
- `plugins/compound-engineering/skills/ce-review/references/subagent-template.md` — confidence rubric structure、JSON output contract

**测试场景：**
- Template 同时适用于 cluster coherence rubric 和 generic quality rubric
- JSON output format 无歧义且可 parse
- Template 处理 edge cases：empty clusters、single-item clusters、very large clusters

**验证：**
- 用 rubric 和 sample data 填充此 template 后，model 能以 valid JSON 响应

---

- [ ] **Unit 5：Measurement runner script（measurement runner 脚本）**

**目标：** 创建运行 measurement command、捕获 JSON output，并处理 timeouts/errors 的 script。由 orchestrating agent（不是此 script）评估 gates 并处理 stability repeats。

**需求：** R2, R12

**依赖：** 无

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/scripts/measure.sh`

**方法：**
- Division of labor 遵循既有 plugin pattern：scripts 处理 I/O，model 解释 structure
- Input：仅使用 flat positional arguments：要运行的 command、timeout seconds、working directory、optional environment variables（用于 port parameterization 的 KEY=VALUE pairs）
- Steps：设置 environment variables -> cd 到 working directory -> 带 timeout 运行 measurement command -> 捕获 stdout（expected JSON）和 stderr（error context）-> 用 command exit code 退出
- Output：measurement command 的 raw JSON 输出到 stdout，stderr pass through。不 post-processing、不解析 YAML、不评估 gate；orchestrating agent 读取 script output 后处理这些工作
- Handle：command timeout（通过 `timeout` command）、non-zero exit（pass through）、stderr capture 用于 error diagnosis
- Script **不**：解析 YAML spec files、评估 gate checks、聚合 stability repeats，或生成 structured result envelopes。这些都是 orchestrator responsibilities。

**遵循模式：**
- `plugins/compound-engineering/skills/git-worktree/scripts/worktree-manager.sh` — flat positional arguments，不解析 structured data
- `plugins/compound-engineering/skills/resolve-pr-feedback/scripts/get-pr-comments` — 运行 command 并返回 JSON 的 simple script

**测试场景：**
- Command succeeds：JSON output pass through 到 stdout
- Command fails（non-zero exit）：exit code pass through，stderr 可用
- Command times out：返回 timeout exit code
- Environment variables applied：command 运行前设置 PORT env var

**验证：**
- Script 可用 command 和 timeout standalone 运行，并返回 command 的 raw output

---

- [ ] **Unit 6：Parallelism probe script（parallelism probe 脚本）**

**目标：** 创建检测 target project 中常见 parallelism blockers 的 script。

**需求：** R5, R6

**依赖：** 无

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/scripts/parallel-probe.sh`

**方法：**
- Input：spec file path（用于 measurement command 和 mutable scope）、project directory
- Checks（检查项）：
  1. Port detection：在 measurement command output 和 config files 中搜索 hardcoded port patterns（`:\d{4,5}`、`PORT=`、`--port`、`bind`、`listen`）
  2. Shared file detection：检查 mutable/measurement paths 中的 SQLite files（`.db`、`.sqlite`、`.sqlite3`）和 local file stores
  3. Lock file detection：检查 measurement command 创建的 `.lock`、`.pid` files
  4. Resource contention：检查 GPU references（`cuda`、`torch.device`、`gpu`）和 large memory markers
- Output：JSON，包含 `mode`（parallel|serial|user-decision）、`blockers_found` array、`mitigations` array、`unresolved` array
- 这是 advisory：skill 将结果展示给用户 approval，不自动 mitigate

**遵循模式：**
- `plugins/compound-engineering/skills/git-worktree/scripts/worktree-manager.sh`

**测试场景：**
- No blockers found（未发现 blockers）：`mode = parallel`
- Port hardcoded：检测到并带 suggested mitigation 报告
- SQLite file in scope：检测到并报告
- Multiple blockers：全部列出

**验证：**
- Script 可对 sample project directory 运行，并产出 valid JSON

---

- [ ] **Unit 7：Experiment worktree manager script（experiment worktree manager 脚本）**

**目标：** 创建管理 experiment worktrees 的 script：创建时复制 shared files，并支持 cleanup。

**需求：** R5, R6, R12

**依赖：** 无

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/scripts/experiment-worktree.sh`

**方法：**
- Subcommands（子命令）：`create`、`cleanup`、`cleanup-all`
- `create`：接收 spec name、experiment index、要复制的 shared files list、base branch
  - 在 branch `optimize/<spec>/exp-<NNN>` 上创建 worktree：`.claude/worktrees/optimize-<spec>-exp-<NNN>/`
  - 从 main repo 将 shared files 复制到 worktree
  - 若 `.env`、`.env.local` 存在，则复制（按既有 worktree convention）
  - 若已配置 port parameterization，则应用它（将 env var 写入 worktree 的 `.env`）
  - 返回 worktree path
- `cleanup`：移除单个 experiment worktree 及其 branch
- `cleanup-all`：移除给定 spec name 的所有 experiment worktrees
- Error handling：verify git repo、检查 existing worktrees、处理 partially created worktrees 的 cleanup

**遵循模式：**
- `plugins/compound-engineering/skills/git-worktree/scripts/worktree-manager.sh` — worktree creation、`.env` copying、branch management

**测试场景：**
- Create worktree（创建 worktree）：directory exists、branch created、shared files copied
- Create with port parameterization：env var 写入 worktree
- Cleanup（清理）：worktree removed、branch deleted
- Cleanup-all：指定 spec 的所有 experiment worktrees 被移除
- Partial failure：cleanup 能处理 partially created state

**验证：**
- Script 可在 test git repo 中创建并清理 worktrees

---

### Phase B：Core Skill（依赖全部 Phase A units）

- [ ] **Unit 8：SKILL.md — Phase 0（Setup）和 Phase 1（Measurement Scaffolding）**

**目标：** 创建 SKILL.md file，包含 frontmatter、Phase 0（setup、spec validation、run identity、learnings search）和 Phase 1（harness validation、baseline、parallelism probe、clean-tree gate、user approval gate）。

**需求：** R1, R2, R6, R8

**依赖：** Units 1-7

**文件：**
- 新增：`plugins/compound-engineering/skills/ce-optimize/SKILL.md`

**方法：**

*Frontmatter（前置元数据）：*
- `name: ce-optimize`
- `description:` — 覆盖它做什么（iterative optimization）、何时使用（measurable improvement goals）以及关键能力（parallel experiments、LLM-as-judge、git-native history）的 rich description
- 不设置 `disable-model-invocation` — 这是 v1 skill，不是 beta

*Phase 0：Setup（设置）*
- 接受 spec file path 作为 argument，或基于 spec schema reference（`references/optimize-spec-schema.yaml`）交互式创建一个
- Agent 读取并验证 spec（required fields、valid metric types、valid operators）。Agent 原生解析 YAML，不用 shell script 解析。
- 通过 `compound-engineering:research:learnings-researcher` 搜索类似 topic 的 prior optimization work
- **Run identity detection**：检查 `optimize/<spec-name>` branch 是否已存在。如果存在，检查 existing experiment log。通过平台 question tool 给用户选择：resume（继承 state，从 last iteration 继续）或 fresh start（把旧 branch archive 到 `optimize/<spec-name>/archived-<timestamp>`，清空 log）
- 创建或切换到 optimization branch
- 创建 scratch directory：`.context/compound-engineering/ce-optimize/<spec-name>/`

*Phase 1：Measurement Scaffolding（度量脚手架，HARD GATE）*
- **Clean-tree gate**：验证 `git status` 显示 `scope.mutable` 或 `scope.immutable` 内 files 没有 uncommitted changes。如果 dirty，要求先 commit 或 stash 再继续。
- 如果用户提供 measurement harness：通过 measurement script 运行一次（command 和 timeout 作为 flat args 传入），验证 JSON output 匹配 expected metric names，并向用户展示 baseline
- 如果 agent 必须构建 harness：分析 codebase、构建 evaluation script、验证它，并向用户展示 baseline
- 运行 parallelism probe script，并展示结果
- **Worktree budget check**：统计 existing worktrees。如果总数 + `max_concurrent` 会超过 12，给出 warning。
- 如果 stability mode 是 repeat：运行 harness `repeat_count` 次，agent 聚合结果（median/mean/min/max），验证 variance 在 `noise_threshold` 内
- GATE：向用户展示 baseline metrics + parallel readiness + clean-tree status。使用平台 question tool。未获批准前拒绝继续。
- State re-read：gate approval 后，从磁盘重新读取 spec 和 baseline（按 state-machine learning）

**遵循模式：**
- `plugins/compound-engineering/skills/ce-work/SKILL.md` — Phase 0 input triage 和 Phase 1 setup pattern
- `plugins/compound-engineering/skills/ce-plan/SKILL.md` — Phase 0 resume detection pattern

**测试场景：**
- Spec validation 能捕获 missing required fields
- 检测到 existing optimization branch：resume 和 fresh-start paths 都能工作
- Clean-tree gate：dirty worktree 会阻塞，clean 时通过
- Baseline measurement：harness 运行并产出 valid JSON
- Parallelism probe：blockers 被检测并展示

**验证：**
- YAML frontmatter 通过 `bun test tests/frontmatter.test.ts`
- 所有 reference file paths 使用 backtick syntax（不用 markdown links）
- user gate 使用 cross-platform question tool pattern

---

- [ ] **Unit 9：SKILL.md — Phase 2（Hypothesis Generation，hypothesis 生成）**

**目标：** 向 SKILL.md 添加 Phase 2：hypothesis generation、categorization、dependency pre-approval 和 backlog recording。

**需求：** R7

**依赖：** Unit 8

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-optimize/SKILL.md`

**方法：**

*Phase 2：Hypothesis Generation（hypothesis 生成）*
- 分析 mutable scope code，以理解 current approach
- 生成 hypothesis list；如需更深 codebase analysis，可选择通过 `compound-engineering:research:repo-research-analyst`
- 对 hypotheses 分类（signal-extraction、graph-signals、embedding、algorithm、preprocessing 等）
- 识别所有 hypotheses 涉及的新 dependencies
- 通过平台 question tool 展示 dependency list，进行 bulk approval
- 在 experiment log file 中记录 hypothesis backlog（每个 hypothesis 带 dep approval status）
- 如果 input 中给了 user-provided hypotheses，将其纳入

**遵循模式：**
- `plugins/compound-engineering/skills/ce-ideate/SKILL.md` — hypothesis generation、categorization、iterative refinement

**测试场景：**
- 从 codebase analysis 生成 hypotheses
- user-provided hypotheses 合并进 backlog
- dependencies 被识别并展示给用户做 bulk approval
- 需要 unapproved deps 的 hypotheses 在 backlog 中标记

**验证：**
- Hypothesis backlog 以 categories 和 dep status 记录在 experiment log 中

---

- [ ] **Unit 10：SKILL.md — Phase 3（Optimization Loop，优化 loop）**

**目标：** 向 SKILL.md 添加 Phase 3：核心 parallel batch dispatch、measurement、judge evaluation、keep/revert logic 和 stopping criteria。这是最大、风险最高的 unit。

**需求：** R3, R4, R5, R9, R11, R12, R13

**依赖：** Unit 9

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-optimize/SKILL.md`

**方法：**

*Phase 3：Optimization Loop（优化 loop）*
- 对每个 batch：
  1. 选择 hypotheses（batch_size = min(backlog_size, max_concurrent)）。每个 batch 内优先保持 category diversity。
  2. 并行 dispatch experiments：
     - **Worktree backend**：每个 experiment 创建一个 worktree（通过 script），并用 experiment prompt template（`references/experiment-prompt-template.md`）dispatch subagent
     - **Codex backend**：将 prompt 写入 temp file，并通过 `codex exec` stdin pipe dispatch（按 ce-work-beta pattern）
     - Environment guard：检查 `CODEX_SANDBOX`/`CODEX_SESSION_ID`，防止 recursive delegation
  3. 等待 batch completion
  4. 对每个 completed experiment：
     - 在该 experiment 的 worktree 中运行 measurement script（flat args：command、timeout、working dir、env vars）
     - Agent 读取 raw JSON output，并评估 degenerate gates
     - 如果 gates 通过且 primary type 是 judge：按 judge prompt template（`references/judge-prompt-template.md`）dispatch batched parallel judge sub-agents。将 samples 按 `judge.batch_size`（默认 10）分组，dispatch `ceil(sample_size / batch_size)` 个 sub-agents，并聚合返回的 JSON scores。
     - 如果 gates 通过且 primary type 是 hard：直接使用 hard metric value
     - 将所有 results 记录到 experiment log
  5. 使用 parallel-batch merge strategy（见 Key Technical Decisions）评估 batch：
     - 按 primary metric improvement 排序（hard metric delta 或 judge `mean_score` delta，必须超过 `minimum_improvement`）
     - Best 优于 current：KEEP（把 experiment branch merge 到 optimization branch）
     - 检查 file-disjoint runners-up：cherry-pick、重新 measurement，如果 combined 严格更好就 keep
     - 处理 deferred deps：把 hypothesis 标为 `deferred_needs_approval`，继续
     - 其余全部：REVERT（log，cleanup worktree）
  6. 用本 batch 的全部 results 更新 experiment log
  7. 写入 strategy digest，总结 tried categories、successes、failures 和 exploration frontier
  8. 基于本 batch 的 learnings 生成新 hypotheses（读取最近 10 个 experiments 的 rolling window + strategy digest，而不是 full log）
  9. 检查 stopping criteria（target reached、max iterations、max hours、plateau、manual stop）
  10. State re-read：下一个 batch 前从 experiment log 重新读取 current best

*Cross-cutting concerns（横切关注点）：*
- **Codex failure cascade**：连续 3 次 delegate failures 后，对剩余 experiments 自动 disable Codex，fallback 到 subagent
- **Error handling**：experiment errors（command crash、timeout、malformed output）记录为 `outcome: error`，并 revert 该 experiment。Loop 继续。
- **Progress reporting**：每个 batch 后报告：batch N of ~M、experiments run、current best metric、相对 baseline 的 improvement、累计 judge cost
- **Manual stop**：如果用户 interrupt，保存 current experiment log state 并提供 wrap-up
- **Crash recovery**：每个 experiment 在 measurement completion 后在其 worktree 中写入 `result.yaml` marker。Resume 时，开始 new batch 前扫描 completed-but-unlogged experiments。

**Execution note：** Execution target：external-delegate — 此 unit 很大且已充分 spec

**遵循模式：**
- `plugins/compound-engineering/skills/ce-review/SKILL.md` — parallel subagent dispatch（Stage 4）、structured result merging（Stage 5）
- `plugins/compound-engineering/skills/ce-work-beta/SKILL.md` — Codex delegation section
- `plugins/compound-engineering/skills/ce-review/references/subagent-template.md` — sub-agent prompt structure 和 JSON output contract

**测试场景：**
- Spec 使用 hard primary metric：gates + hard metric evaluation，不调用 judge
- Spec 使用 judge primary metric：gates -> batched judge sub-agents -> 基于 aggregated judge score keep/revert
- 4 个 experiments 的 parallel batch：全部 dispatch、收集 results、keep best、revert others
- 违反 degenerate gate 的 experiment：立即 revert，不调用 judge，没有 judge cost
- 需要 unapproved dep 的 experiment：deferred，pipeline 继续
- Codex dispatch failure：3 次 failures 后 fallback 到 subagent
- Plateau stopping：连续 10 个 batches 无 improvement -> stop
- Repeat mode 下的 flaky metric：agent 运行 harness N 次、聚合并应用 noise threshold
- Runner-up merge：file-disjoint runner-up 被 cherry-pick、重新 measurement，combined 更好 -> kept
- Runner-up merge fails：combined 比 best-only 更差 -> runner-up reverted 并 logged
- Context management：50 个 experiments 后使用 strategy digest，而不是 full log

**验证：**
- Experiment log 在每个 batch 后更新（不是只在结尾）
- Strategy digest file 在每个 batch 后写入
- Measurement 后 worktrees 被 cleanup
- 所有 reference file paths 使用 backtick syntax
- Script references 使用 relative paths（`bash scripts/measure.sh`）

---

- [ ] **Unit 11：SKILL.md — Phase 4（Wrap-Up，收尾）**

**目标：** 向 SKILL.md 添加 Phase 4：deferred hypothesis presentation、result summary、branch preservation，以及与 ce:review 和 ce:compound 的 integration。

**需求：** R9, R10

**依赖：** Unit 10

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-optimize/SKILL.md`

**方法：**

*Phase 4：Wrap-Up（收尾）*
- 展示需要 dep approval 的 deferred hypotheses（如果有）
- 总结：baseline -> final metrics、total iterations run、kept count、reverted count、judge cost total
- 保留包含全部 commits 的 optimization branch
- 通过平台 question tool 提供 post-completion options：
  1. 对 cumulative diff（baseline -> final）运行 `/ce:review`
  2. 运行 `/ce:compound` 来 document winning strategy
  3. 从 optimization branch 创建 PR
  4. 继续更多 experiments（重新进入 Phase 3）
  5. Done（完成）

**遵循模式：**
- `plugins/compound-engineering/skills/ce-work/SKILL.md` — Phase 4（Ship It）post-completion options
- `plugins/compound-engineering/skills/lfg/SKILL.md` — skill-to-skill handoff pattern

**测试场景：**
- Deferred hypotheses 随 dep requirements 一起展示
- Summary 包含所有 key metrics 和 cost data
- 每个 post-completion option 都可工作（ce:review、ce:compound、PR creation、continue、done）
- "Continue" 能带着 state re-read 干净重新进入 Phase 3

**验证：**
- Optimization branch 保留 full commit history
- Post-completion options 使用 platform question tool pattern

---

### Phase C：Registration（依赖 Unit 11）

- [ ] **Unit 12：Plugin registration and validation（plugin 注册与验证）**

**目标：** 在 plugin documentation 中注册 new skill，并验证 consistency。

**需求：** R1

**依赖：** Unit 11

**文件：**
- 修改：`plugins/compound-engineering/README.md`

**方法：**
- 将 `ce-optimize` 加到 README.md 的 skills table 中，并写入 description
- 更新 README.md 中的 skill count
- 运行 `bun run release:validate` 验证 plugin consistency
- 不要 bump plugin.json 或 marketplace.json 中的 version（遵循 versioning rules）

**遵循模式：**
- `plugins/compound-engineering/README.md` 中已有 skill table entries

**测试场景：**
- `bun run release:validate` passes
- README 中的 skill count 匹配 actual skill count
- Skill table entry 按字母顺序放置，并有准确 description

**验证：**
- `bun run release:validate` exits 0
- `bun test` passes（尤其是 frontmatter tests）

## 系统级影响

- **交互图：** 该 skill 会 dispatch 到 learnings-researcher（Phase 0）、repo-research-analyst（Phase 2）、parallel judge sub-agents（Phase 3），并可选调用 ce:review 和 ce:compound（Phase 4）。它会创建 git worktrees 和 branches，并把 Codex 作为 external process 调用。
- **错误传播：** Experiment failures 被隔离：每个 experiment 都在 isolated worktree 中运行。Failures 会被 logged and reverted。Optimization branch 只在 successful、validated improvements 上前进。如果 orchestrator 在 batch 中途 crash，每个已完成 experiment 应在自己的 worktree 中有 `result.yaml` marker；resume 时 orchestrator 会先扫描 completed-but-unlogged experiments，再开始新 batch。
- **状态生命周期风险：** Experiment log 是 critical state artifact。它必须在每个 batch 后写入（不只在最后写入），以抵御 crashes。Log atomicity 由 batch-then-evaluate architecture 保证：只有 single-threaded orchestrator 写 log，concurrent workers 永不写。
- **Context window pressure：** Experiment log 每个 experiment 增长约 25 行。100 个 experiments 就是约 2,500 行 YAML。Orchestrator 通过 rolling summary window（last 10 experiments）+ strategy digest file 管理这一点；除非为了 duplicate-hypothesis detection 按 category filter，否则永不读取完整 log。
- **Branch collision：** 如果 `optimize/<spec-name>` 已由 prior run 创建，Phase 0 会检测到，并提供 resume vs. fresh start。这避免意外覆盖 prior experiment history。
- **Dirty working tree：** Phase 1 包含 clean-tree gate：`git status` 必须显示 `scope.mutable` 或 `scope.immutable` 内的 files 没有 uncommitted changes。如果 dirty，继续前要求 commit 或 stash。这防止 main worktree 和 experiment worktrees 的 baseline measurement 不一致。
- **Worktree budget：** Optimization worktrees 位于 `.worktrees/` 下（与 git-worktree skill 使用相同 convention）。创建 experiment worktrees 前，检查 total worktree count（包括来自 ce:work 或 ce:review 的 non-optimize worktrees）。拒绝超过 12 个 total worktrees，以避免 git performance degradation。
- **API surface parity：** 这是 new skill，没有需要保持 parity 的 existing surface。
- **Integration coverage：** Parallelism readiness probe 应在已知 blockers（SQLite DBs、hardcoded ports）的 real projects 上验证，确保 detection 有效。

## 风险与依赖

- **Codex exec flags may change** — skill 应检测 `codex` version 并适配。Mitigation：首次 dispatch 前检查 `codex --version`。
- **Worktree disk usage** — large repos 上的 parallel experiments 会消耗 disk。Mitigation：measurement 后立即 cleanup worktrees，将 worktree backend cap 到 6 concurrent，并在所有 CE skills 之间 enforce 12-worktree budget。
- **LLM-as-judge consistency** — judge scores 对同一 input 的 calls 可能波动。Mitigation：使用 fixed sample seeds，要求 `minimum_improvement` threshold（默认 0.3）才 accept，并记录 per-sample scores 供 post-hoc analysis。v2 可添加 anchor-based calibration。
- **Long-running unattended execution** — loop 可能运行数小时。Mitigation：每个 batch 后保存 experiment log，写入 per-experiment `result.yaml` markers 用于 crash recovery，并设计 graceful resume from saved state。
- **Context window exhaustion** — experiment log 每个 experiment 增长约 25 行。Mitigation：rolling summary window（last 10 experiments）+ strategy digest file。Orchestrator 永不一次性读取完整 log。
- **Judge API rate limiting** — 如果使用 Claude API 做 judge calls，rate limits 可能 throttle parallel judge evaluation。Mitigation：batch judge calls（每个 sub-agent 10 个）以减少总 API calls，并在 rate-limited 时在 judge sub-agent dispatches 之间添加 brief delay。
- **Runner-up merge interactions** — 两个 independently beneficial changes 组合后可能有害。Mitigation：每次 merge 后重新 measurement，每个 batch 第一次组合失败后停止，并将 interactions 记录为 learnings。

## 文档与运维说明

- 更新 `plugins/compound-engineering/README.md` skill table
- Plugin 本身不新增 MCP servers 或 external dependencies
- SKILL.md 存在后，该 skill 会自动出现在 Claude Code 的 skill list 中

## 来源与参考

- **Origin document（来源 document）：** [docs/brainstorms/2026-03-29-iterative-optimization-loop-requirements.md](docs/brainstorms/2026-03-29-iterative-optimization-loop-requirements.md)
- Related code（相关 code）：`plugins/compound-engineering/skills/ce-work-beta/SKILL.md`（Codex delegation）、`plugins/compound-engineering/skills/ce-review/SKILL.md`（parallel dispatch）
- Related PRs（相关 PRs）：#364（Codex security posture）、#365（Codex exec pitfalls）
- External（外部参考）：Karpathy autoresearch（github.com/karpathy/autoresearch）、AIDE/WecoAI（github.com/WecoAI/aideml）
- Learnings（经验）：`docs/solutions/skill-design/script-first-skill-architecture.md`、`docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`、`docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`、`docs/solutions/workflow/todo-status-lifecycle.md`
