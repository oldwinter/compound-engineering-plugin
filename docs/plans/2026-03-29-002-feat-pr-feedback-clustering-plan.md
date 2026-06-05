---
title: "feat(resolve-pr-feedback): 添加 feedback clustering 以检测 systemic issues"
type: feat
status: completed
date: 2026-03-29
deepened: 2026-03-29
---

# feat(resolve-pr-feedback): 添加 feedback clustering 以检测 systemic issues

## 概览

向 resolve-pr-feedback skill 添加一个 gated cluster analysis phase，用于检测 concentrated、thematically similar feedback 何时代表 systemic issue，而不是 isolated bugs。该分析是 gated 的 -- 只有当 feedback patterns 足以 warrant 时才运行（same-file concentration、high volume 或 verify-loop re-entry），从而让 common case（2-3 条 unrelated comments）保持 zero extra cost。检测到 clusters 时，每个 cluster dispatch 一个 investigation-aware agent，它会先读取 broader area 再修复，而不是让 N 个 individual fixers 玩 whack-a-mole。Verify-loop re-entry（fix round 后出现 new feedback）会自动触发 gate，因此无需 separate detection mechanism 也能捕捉 cross-cycle patterns。

## 问题框架

resolve-pr-feedback skill 当前逐个处理 feedback items。唯一 grouping 是 same-file conflict avoidance（将引用同一文件的 threads 分组到一次 agent dispatch）。它没有语义分析多个 feedback items 是否 collectively point to a deeper structural issue。

这会导致 whack-a-mole pattern：
1. Review bots 在 `auth.ts` 的不同 functions 中发布 4 条关于 missing error handling 的 comments
2. skill 逐个修复 -- 这里加一个 try/catch，那里加一个 null check
3. review bot 重新运行，发现 individual fixes 未覆盖的 3 个 error handling gaps
4. cycle 继续，因为 underlying issue（该 module 的 error handling *strategy*）从未被检查

核心 insight：individual comments 不会说 "this whole approach is wrong"，但当同一区域代码中出现 2+ 条同类 concern comments 时，可以推断该区域的 approach 需要重新思考 -- 而不是打 N 个 individual patches。

## 需求追踪

- R1. 在 dispatching fix agents 前检测 thematic+spatial clusters in feedback
- R2. 检测到 clusters 时，在 making targeted fixes 前 investigate broader area
- R3. 将 verify-loop re-entry（fix round 后出现 new feedback）作为 signal，通过 cluster analysis gate 做更广泛调查
- R4. 保留 non-clustered feedback 的 existing behavior（isolated items still get individual agents）
- R5. 保持 skill prompt-driven（no code changes -- 全部是 SKILL.md 和 agent markdown）
- R6. 根据信号强度 gate cluster analysis -- 不要每次 pass 都无条件运行，只在 feedback patterns warrant cost 时运行

## 范围边界

- 不修改 GraphQL scripts（fetch, reply, resolve）
- 不修改 targeted mode（single-thread URL）-- clustering 只适用于 full mode
- 不新增 agents -- 扩展 existing pr-comment-resolver agent，使其处理 cluster context
- 不修改 verdict taxonomy（fixed, fixed-differently, replied, not-addressing, needs-human）
- Clustering 是 orchestrator 的 signal，不是新的 data structure 或 API

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md` -- orchestrator skill，285 lines
- `plugins/compound-engineering/agents/workflow/ce-pr-comment-resolver.agent.md` -- worker agent，134 lines
- Current same-file grouping at SKILL.md lines 107-113 -- 要扩展的 conflict avoidance pattern
- ce:review skill 的 confidence-gated merge/dedup pipeline -- pre-dispatch analysis 的 precedent
- todo-resolve skill 使用相同 pr-comment-resolver agent 和 batching pattern

### 组织内 learnings

- **Whack-a-mole state machines**（`docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`）：处理多维 state 的 skills 需要在每次 mutating action 后 explicit re-verification。这里直接适用 -- fix cluster 后，re-verify whole area，而不只是 individual threads。
- **Cluster before filter**：Pipeline ordering 是 architectural invariant。先 group/cluster related items，再决定如何处理它们，否则属于 meaningful pattern 的 individually below-threshold items 会被丢弃。
- **Status-gated resolution**（`docs/solutions/workflow/todo-status-lifecycle.md`）：Quality gates 属于 triage upstream，而不是 resolve boundary。cluster analysis step 正是这样 -- dispatch 前的 quality gate。
- **Pass paths not content**（`docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`）：dispatch cluster-aware agents 时，传 thread IDs 和 file paths，而不是 full comment bodies。

## 关键技术决策

- **Cluster analysis lives in the orchestrator (SKILL.md), not the agent**：orchestrator 能看到全部 feedback，可检测 cross-thread patterns。individual agents 只看到被分配的 threads。orchestrator synthesizes cluster brief；agent 将其作为 context 与 thread details 一起接收。

- **Extend existing grouping rather than replacing it**：当前 same-file grouping（SKILL.md lines 107-113）已经把引用同一文件的 threads 分组。Cluster analysis 是叠在其上的 semantic layer -- 按 theme + proximity 分组；same-file grouping 成为空间 proximity 的 special case。

- **Single agent per cluster, not a new "investigator" agent**：pr-comment-resolver agent 已经负责 read code、evaluate validity 和 fix。对于 clusters，它会接收 additional context（cluster brief 和所有 related threads），并遵循 extended workflow：先 read broader area，assess root cause，再在 holistic fix 和 individual fixes 之间选择。这避免新增 agent，并保留 existing parallel dispatch architecture。

- **Cross-cycle detection is a gate signal, not a separate mechanism**：Verify step 在 fix round 后发现 new feedback 时，这种 re-entry 会自动触发 cluster analysis gate。无需 separate concern-category matching 或 structural comparison -- cluster analysis step 会使用 just-fixed file context 处理 thematic grouping。这避免跨 inference passes 比较 LLM-generated category labels 的脆弱性。

- **Cluster threshold: 2+ items with shared theme AND proximity**：single comment 绝不是 cluster。两个 items 同时 shared thematic similarity 和 spatial proximity 即构成 minimum cluster。threshold deliberately low，因为 broader investigation 的成本小（agent time cheap），miss systemic issue 的成本高（another review loop）。

- **Cluster analysis is gated, not always-on**：每次 pass 都运行 cluster analysis 会为 common case（2-3 条 unrelated comments）增加 latency 和 token cost。相反，只在 feedback 已显示 concentration signals 时触发。gate 使用 triage byproducts 中 cheap structural checks -- 不是新的 LLM inference。Gate signals：(a) volume threshold（4+ new items total -- patterns plausible），或 (b) verify-loop re-entry（fix round 后出现 new feedback -- 最强信号）。same-file concentration 有意排除为 gate signal，因为它是最常见 feedback pattern，且已由 existing same-file grouping 处理；否则 gate 会在大多数 runs 上触发。如果没有 gate signal，完全 skip cluster analysis，并像 today 一样直接进入 plan/dispatch。

- **Verify-loop re-entry is a gate signal, not a separate comparison mechanism**：Cross-cycle detection 不需要自己的 concern-category matching 或 structural comparison。fix round 后出现 new feedback 这个事实本身就是 whack-a-mole signal。任何 verify-loop re-entry 都自动触发 cluster analysis gate。cluster analysis step 自己处理 thematic grouping -- 不需要 separate mechanism 告诉它 "this is cross-cycle." re-entry 时，cluster analysis step 接收 just-fixed files 作为 additional context，以评估 new feedback 是否关联 just-fixed areas。

## 开放问题

### 规划期间已解决

- **clusters 应替代还是补充 individual dispatch？** 补充。Non-clustered items 仍交给 individual agents。一个 cluster dispatch 一个 agent 来共同处理所有 threads。同一次 run 中两者可以同时发生。
- **holistic vs. individual 应由 agent 还是 orchestrator 决定？** 由 agent。orchestrator 检测 cluster 并 synthesize brief，但 agent 会读 code，更适合判断 individual fixes 是否足够，或是否需要 broader change。
- **cluster brief 如何传递？** 在 agent prompt 中用 `<cluster-brief>` XML block -- structurally delimited，activation 明确。brief 包含：theme label、affected directory/area、file paths、thread IDs 和 one-sentence hypothesis。没有 full comment bodies -- agent 自己读取 threads。这防止 accidental cluster mode activation（例如 todo-resolve 传入碰巧提到 "cluster" 的文本），并遵循 pass-paths-not-content principle。

### 延后到实现阶段

- **cluster analysis prompt 的 exact wording**：heuristics 已定义，但让 LLM orchestrator reliably detect clusters 的 prompt phrasing 需要 iteration。
- **"holistic fix" mode 是否需要 agent examples**：agent 可能需要在 `<examples>` section 中加入 1-2 个 cluster-aware evaluation examples。testing 会显示 current examples + new workflow instructions 是否足够。

## 高层技术设计

> *这说明预期做法，并作为 review 的方向性指导，而不是实现规范。实现 agent 应把它当作上下文，而不是要逐字复刻的代码。*

```
Current flow:
  Fetch -> Triage -> Plan -> Dispatch(per-thread) -> Commit -> Reply -> Verify -> Summary

New flow:
  Fetch -> Triage -> [Gate Check] -> Plan -> Dispatch -> Commit -> Reply -> Verify -> Summary
                         |                     |                              |
                    Gate fires?            If clusters:                  New feedback?
                    /        \             1 agent/cluster               /          \
                 YES          NO           If isolated:              YES            NO
                  |            |            1 agent/thread        (re-entry         done
           Cluster Analysis    |            (same as today)     triggers gate)
                  |            |
           Synthesize briefs   |
                  \           /
                   v         v
                 Plan step (unified)
```

**Cluster analysis gate（cluster 分析 gate）:**

gate 使用 cheap structural checks -- triage byproducts，不是 new LLM inference。至少一个 gate signal 触发时，才运行 cluster analysis：

| Gate signal | Source | Cost |
|---|---|---|
| Volume: 4+ new items total | Item count from triage | Zero -- simple count |
| Verify-loop re-entry: this is the 2nd+ pass | Iteration state | Zero -- binary flag |

Same-file concentration deliberately NOT a gate signal。多个 items 命中 same file 是最常见 feedback pattern，且已经由 existing same-file grouping 处理 conflict avoidance。如果每次 2+ items 命中同一文件都运行 cluster analysis，会给大多数 runs 增加 overhead，却收益很小。Same-file concentration 在 analysis 内部（gate 已因其他理由触发后）作为 spatial proximity signal 有价值，但不应自己打开 gate。

如果没有 gate signal（common case：1-3 items across different files），完全 skip cluster analysis，并以 zero clustering overhead 继续 plan/dispatch。如果 first pass 因 low volume 漏掉 cluster，verify-loop re-entry 会在 second pass 捕捉。

**Cluster detection decision matrix（cluster detection 决策矩阵）:**

Spatial proximity 是 clustering 的 hard requirement。没有 proximity 的 thematic similarity 更适合由 cross-cycle escalation 处理（Unit 4），捕捉同一 theme 不断在 codebase 各处产生 new issues 的场景。

| Thematic similarity | Spatial proximity | Item count | Action |
|---|---|---|---|
| Yes | Yes (same file) | 2+ | Cluster -> investigate area |
| Yes | Yes (same directory/module) | 2+ | Cluster -> investigate area |
| Yes | No (unrelated locations) | any | No cluster (cross-cycle escalation catches recurring themes) |
| No | Yes (same file) | any | Same-file grouping only (existing behavior for conflict avoidance) |
| No | No | any | Individual dispatch (existing behavior) |

Spatial proximity means：same file，或 same directory subtree 中的 files（例如 `src/auth/login.ts` 和 `src/auth/middleware.ts` proximate；`src/auth/login.ts` 和 `src/database/pool.ts` not proximate）。

**Cluster brief structure（cluster brief 结构）:**

cluster brief 通过 `<cluster-brief>` XML block 传给 agents，以便 unambiguous activation。内容受限，避免膨胀 agent context：

```xml
<cluster-brief>
  <theme>Missing input validation</theme>
  <area>src/auth/</area>
  <files>src/auth/login.ts, src/auth/register.ts, src/auth/middleware.ts</files>
  <threads>PRRT_abc123, PRRT_def456, PRRT_ghi789</threads>
  <hypothesis>Individual validation gaps suggest the module lacks a consistent validation strategy</hypothesis>
</cluster-brief>
```

brief 中没有 full comment bodies。agent 通过 IDs 读取 threads。

**Cross-cycle escalation（跨 cycle 升级）:**

```
Verify re-fetch finds new threads
  -> Any new feedback after a fix round = verify-loop re-entry
  -> Re-entry automatically triggers the cluster analysis gate
  -> Cluster analysis receives additional context: files just fixed in previous cycle
  -> Cap at 2 fix-verify iterations before surfacing to user
```

Cross-cycle detection 不做 separate concern-category matching。re-entry 本身就是 signal。cluster analysis step（因为 gate fired 才运行）负责 thematic grouping，并判断 new feedback 是否关联 just-fixed areas。

## 实现单元

- [x] **Unit 1: 向 SKILL.md 添加 gated cluster analysis step**

**目标:** 在 Triage（Step 2）和 Plan（Step 3）之间插入 gated step，检查 feedback patterns 是否 warrant cluster analysis，并且只有 warrant 时才运行分析。common case（2-3 unrelated comments）完全 skip。

**需求:** R1, R4, R6

**依赖:** None

**文件:**
- 修改: `plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md`

**做法:**
- 在 triage step 后添加 new "Step 2.5: Cluster Analysis (Gated)"
- **Gate check first**：在任何 thematic analysis 前，检查两个 structural signals：(a) volume -- 4+ new items total，(b) verify-loop re-entry -- workflow 第 2+ pass。若两者都未触发，skip 到 Plan step，zero clustering overhead。same-file concentration 不是 gate signal（它是最常见 pattern，且已由 existing same-file grouping 处理），但 gate fired 后，它在 analysis 内作为 spatial proximity indicator 使用
- **If gate fires**：按 concern category AND spatial proximity group items。Concern categories 是此 step 中分配的 broad labels（error handling、validation、type safety、naming、performance 等）-- 不是 free-text；使用 fixed category list，保证 labels consistent and comparable。使用 technical design section 的 decision matrix 判断 actionable clusters
- 发现 clusters 时，为每个 cluster synthesize 一个 `<cluster-brief>` XML block：theme、affected files/areas、hypothesis 和 thread IDs list。verify-loop re-entry 时，加入 previous cycle 中 just fixed files 作为 additional context
- 不在任何 cluster 中的 items 保留为 individual items（preserving existing behavior）
- 如果 gate fired 但 thematic analysis 后没有 clusters，则所有 items 按 individual 处理（gate false positive -- 只多付出 analysis cost）
- Renumber subsequent steps（重新编号后续 steps；current Step 3 becomes Step 4, etc.）

**遵循的模式:**
- Existing same-file grouping at SKILL.md lines 107-113 -- semantically extend this concept（语义上扩展该概念）
- ce:review skill 的 merge/dedup pipeline across personas -- pre-dispatch cross-item analysis 的 precedent

**测试场景:**
- Happy path：5 items across different files，其中 3 个在 same directory shared validation theme -> gate fires（volume >= 4），detect cluster for the 3 validation items，其余 2 个 individually dispatched
- Edge case：3 items about same theme on same file -> gate does NOT fire（below volume threshold, not a re-entry）。Same-file grouping 处理 conflict avoidance。如果 first pass 漏掉 deeper issue，verify 发现 new feedback 后，re-entry 会在 second pass 捕捉
- Edge case：2 个 unrelated items 位于不同 files -> gate does NOT fire，cluster analysis skipped entirely
- Edge case：verify-loop re-entry 且只有 1 个 new item -> gate fires（re-entry signal），analysis runs with context about just-fixed files
- Happy path：1 个 clustered group + 2 个 isolated items -> cluster gets a brief in `<cluster-brief>` XML block，isolated items pass through unchanged
- Edge case：gate fires（volume），4 个 items 在 same file 但主题都不同 -> analysis runs，finds no thematic cluster，proceeds with same-file grouping only（false positive gate, low cost）
- Edge case：items 位于 same directory subtree（e.g., `src/auth/login.ts` and `src/auth/middleware.ts`）-> proximate，eligible for clustering
- Edge case：2 个 items 在完全 unrelated files 中有相同 theme -> NOT clustered（no spatial proximity）

**验证:**
- Gate check 每次 pass 都以 near-zero cost 运行（2 structural checks: item count and re-entry flag）
- Cluster analysis 仅在 gate fires 时运行
- common case（1-3 items）完全 skip cluster analysis
- Same-file grouping continues to work independently for conflict avoidance regardless of whether the gate fires（无论 gate 是否触发，same-file grouping 继续独立用于 conflict avoidance）
- Renumbering 在全文 consistent。Specific cross-references to update：(1) "skip steps 3-7 and go straight to step 8"（line 67），(2) "verification step (step 7)"（line 111），(3) "proceed to step 6"（line 117），(4) "repeat from step 1"（line 189），(5) "step 2"（line 222），(6) Targeted Mode "Full Mode steps 5-6"（line 267）

---

- [x] **Unit 2: 修改 dispatch logic 以支持 cluster-aware processing**

**目标:** 修改 Steps 3-4（Plan and Implement），让 clusters dispatch 一个带 cluster brief 和所有 related threads 的 agent，而 isolated items 像之前一样 individual dispatch。

**需求:** R2, R4

**依赖:** Unit 1

**文件:**
- 修改: `plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md`

**做法:**
- 在 Plan step 中，task items 现在同时包含 clusters（with their briefs）和 isolated items
- 在 Implement step 中，对每个 cluster：dispatch ONE pr-comment-resolver agent，接收 `<cluster-brief>` XML block、cluster 中所有 thread details，以及先 read broader area before fixing 的 instruction
- 对 isolated items：exactly as today dispatch（one agent per thread，same-file grouping still applies）
- Batching rule 调整：clusters 无论包含多少 threads，都算 1 dispatch unit；batching of 4 applies to dispatch units（clusters + isolated items），not raw thread count
- Sequential fallback ordering：当 platform 不支持 parallel dispatch 时，先 dispatch cluster units（higher-leverage），再 dispatch isolated items
- cluster agent 返回每个 handled thread 的 one summary（same verdict structure），以及一个 `cluster_assessment` field，描述 broader investigation revealed 什么，以及采取 holistic 还是 individual approach

**遵循的模式:**
- Existing same-file grouping and batching logic at SKILL.md lines 107-113（现有 same-file grouping 和 batching logic）
- pr-comment-resolver 的 multi-thread-on-same-file handling -- similar pattern, extended to multi-thread-on-same-theme

**测试场景:**
- Happy path：1 个包含 3 threads 的 cluster + 2 个 isolated threads -> 3 个 dispatch units（1 cluster agent + 2 individual agents），within batch-of-4 limit
- Happy path：cluster agent 在 prompt 中 receives `<cluster-brief>` XML block 和全部 3 个 thread details
- Edge case：8 个 isolated items，没有 clusters -> existing behavior unchanged（2 batches of 4）
- Edge case：sequential fallback -> clusters dispatched before isolated items（clusters 先于 isolated items dispatch）
- Edge case：2 个 clusters（各 3 个）+ 2 个 isolated -> 4 个 dispatch units（2 cluster agents + 2 individual agents）
- Happy path：cluster agent returns per-thread verdicts（每个 thread 一个 summary，结构与 individual agents 相同）

**验证:**
- Clustered threads 由 single agent dispatch 处理，并以 cluster brief 作为 context
- Isolated threads 像之前一样 individually dispatched
- Batching counts dispatch units, not raw threads（batching 计算 dispatch units，而不是 raw threads）

---

- [x] **Unit 3: 扩展 pr-comment-resolver 以支持 cluster investigation**

**目标:** 为 pr-comment-resolver agent 添加 cluster-aware workflow，使其可以接收 cluster brief，并在 making targeted fixes 前 investigate broader area。

**需求:** R2

**依赖:** Unit 2

**文件:**
- 修改: `plugins/compound-engineering/agents/workflow/ce-pr-comment-resolver.agent.md`

**做法:**
- 向 agent 添加 "Cluster Mode" section，结构为 mode detection table（following ce:review's pattern）：如果 prompt 中存在 `<cluster-brief>` XML block，则 activate cluster mode；否则 standard single-thread mode
- Cluster mode workflow：(1) Parse `<cluster-brief>` block，获得 theme、area、file paths、thread IDs 和 hypothesis。(2) Read broader area -- 不只读 referenced lines，而是 full file(s) 和 same directory 中 closely related code。(3) Assess individual comments 是否是 deeper structural issue 的 symptoms。(4) 如果是：make holistic fix 处理 root cause，然后 verify broader fix resolves each thread。(5) 如果不是：像 standard mode 一样逐个 fix each thread。
- agent 返回 standard per-thread verdict summaries，以及 `cluster_assessment` field：简短描述 broader investigation revealed 什么，以及采取 holistic 还是 individual approach。orchestrator 的 Summary step 使用该 field 向用户呈现 cluster investigation results
- 添加 1-2 个展示 cluster-aware evaluation 的 examples（例如 3 条 error handling comments -> agent reads broader area，identifies missing error boundary pattern，adds it，resolves all 3 threads）
- 更新 agent frontmatter description，反映它处理 one or more related threads（例如 "Evaluates and resolves one or more related PR review threads -- assesses validity, implements fixes, and returns structured summaries with reply text. Spawned by the resolve-pr-feedback skill."）
- 没有 `<cluster-brief>` block 时，preserve existing single-thread behavior unchanged

**遵循的模式:**
- Existing multi-thread-on-same-file handling in the agent（agent 中已有 multi-thread-on-same-file handling；按 file grouped 时已能 sequentially 处理 multiple threads）
- evaluation rubric 的 existing structure -- cluster mode 只是在对每个 thread 应用 rubric 前增加 preliminary "read broader area" step

**测试场景:**
- Happy path：agent receives 关于 3 个 functions 中 "missing validation" 的 cluster brief -> reads full file，identifies validation pattern gap，adds validation helper and applies to all 3 locations，returns 3 `fixed` verdicts + cluster_assessment
- Happy path：agent receives cluster brief but determines individual fixes suffice（comments 偶然在 same area，但 root causes unrelated）-> fixes individually，cluster_assessment says "individual fixes appropriate"
- Edge case：cluster brief + 1 个 actually `not-addressing` 的 thread -> agent still investigates broadly for the valid threads，returns `not-addressing` for the invalid one
- Happy path：未提供 `<cluster-brief>` block -> existing single-thread behavior unchanged（including when dispatched by todo-resolve, which never sends a cluster brief）
- Integration：cluster agent 的 per-thread verdicts 正确流入 orchestrator 的 commit/reply/resolve steps
- Integration：cluster_assessment field 被 Summary step 消费，用于向用户呈现 investigation results

**验证:**
- 当 `<cluster-brief>` block 存在时，agent 在 fixing 前 reads broader area
- Agent returns per-thread verdicts compatible with orchestrator's existing commit/reply/resolve flow（agent 返回与现有 commit/reply/resolve flow 兼容的 per-thread verdicts）
- 未提供 `<cluster-brief>` block 时，existing single-thread behavior is preserved
- `<cluster-brief>` XML delimiter prevents accidental cluster mode activation from other consumers（e.g., todo-resolve）

---

- [x] **Unit 4: 添加 verify-loop re-entry handling 和 iteration cap**

**目标:** 修改 Verify step，使任何 verify-loop re-entry（fix round 后出现 new feedback）自动触发 Unit 1 的 cluster analysis gate，并添加 iteration cap 防止 infinite loops。

**需求:** R3, R6

**依赖:** Unit 1

**文件:**
- 修改: `plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md`

**做法:**
- 在 Verify step 中 re-fetching feedback 后，如果仍有 new threads：记录本 cycle 中 just fixed 的 files and themes，然后 loop back to Triage（Step 2）。Step 2.5 中的 cluster analysis gate 会自动触发，因为 "verify-loop re-entry" 是其 gate signals 之一。无需 separate comparison 或 concern-category matching -- cluster analysis step 自己使用 just-fixed context 处理 thematic grouping
- re-entry 时，将 previous cycle 中 modified files list 传给 cluster analysis step，让它评估 new feedback 是否关联 just-fixed areas
- 添加 iteration cap：2 个 fix-verify cycles 后，向用户 surface remaining issues，并提供 recurring pattern context，而不是继续 loop。措辞："Multiple rounds of feedback on [area/theme] suggest a deeper issue. Here's what we've fixed so far and what keeps appearing."（consistent with ce:review's `max_rounds: 2` bounded re-review loop）
- iteration cap applies per-run, not per-cluster（iteration cap 按 run 生效，而不是按 cluster）

**遵循的模式:**
- Existing verify-and-repeat logic at SKILL.md lines 186-189（现有 verify-and-repeat logic）
- `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md` 中的 whack-a-mole state machine pattern
- existing `needs-human` escalation pattern in the skill -- iteration cap 使用同样 "surface to user with structured context" approach
- ce:review `max_rounds: 2` bounded loop precedent（bounded loop 先例）

**测试场景:**
- Happy path：fix 3 issues，verify re-fetch finds 2 new issues -> re-entry triggers gate，cluster analysis runs with just-fixed context，new items may form a cluster with just-fixed area context（可能借助 just-fixed area context 形成 cluster）
- Happy path：fix 3 issues，verify re-fetch finds 1 个 different file 上的 unrelated issue -> re-entry triggers gate，cluster analysis runs but finds no cluster（1 item, different area），proceeds with individual dispatch
- Edge case：2 个 fix-verify cycles -> after 2nd cycle，surface to user with "recurring pattern" framing instead of looping again
- Edge case：fix round resolves everything，verify finds zero new threads -> clean exit, no re-entry（干净退出，无 re-entry）
- Edge case：re-entry with only 1 个 new item on a file that was just fixed -> gate fires（re-entry），cluster analysis has just-fixed context to assess the connection
- Integration：verify-loop re-entry feeds into Unit 1 的同一个 gated cluster analysis step（not a separate mechanism）

**验证:**
- 任何 verify-loop re-entry 都会 triggers the cluster analysis gate
- Cluster analysis step 在 re-entry 时 receives just-fixed file context
- Iteration cap prevents infinite fix-verify loops（iteration cap 防止无限 fix-verify loops）
- Cross-cycle detection 不需要 separate concern-category matching 或 structural comparison

## 系统级影响

- **Interaction graph:** resolve-pr-feedback skill dispatches pr-comment-resolver agents。此 change 修改 agents 接收的 context（`<cluster-brief>` XML block）以及 orchestrator 决定 dispatch grouping 的方式。下游 commit/reply/resolve flow unchanged -- cluster agents 返回相同 per-thread verdict structure。`cluster_assessment` field 进入 Summary step，作为新 section："Cluster investigations: [count clusters investigated, what was found, holistic vs individual approach taken]."
- **Error propagation:** 如果 cluster analysis fails 或 produces no clusters，skill fallback 到 existing individual dispatch。cluster analysis step 是 additive -- failure 意味 existing behavior，而不是 broken workflow。"Fails" 指 orchestrator 从 analysis 产生 zero clusters -- 此时所有 items individually dispatched。用户看不出与 existing behavior 的差异。
- **State lifecycle risks:** cross-cycle detection 比较 "just resolved" threads 与 "newly appeared" threads。该 comparison 在 single skill run 内完成，不 persist state across runs。无需 new state storage。
- **API surface parity:** todo-resolve skill 也使用 pr-comment-resolver，但 dispatch individual todos，而不是 PR feedback clusters。todo-resolve 无需 changes -- pr-comment-resolver 的 cluster mode 只有在存在 cluster brief 时激活。
- **Unchanged invariants:** Targeted mode（single URL）完全 unaffected -- 它是 separate entry path，永不触发 cluster analysis。verdict taxonomy、reply format、GraphQL scripts 和 commit/push flow 全部 unchanged。没有 `<cluster-brief>` block 时，pr-comment-resolver agent 的 existing single-thread behavior preserved，确保 todo-resolve 和其他 consumers unaffected。

## 风险与依赖

| Risk | Mitigation |
|------|------------|
| Cluster detection is too aggressive（groups unrelated items） | Require both thematic similarity AND spatial proximity。decision matrix 有 clear thresholds。如果 false positives 出现，prompt wording easy to tune。 |
| Cluster detection is too conservative（misses real patterns） | Low threshold（2+ items）。Agent time is cheap -- false positive clusters 只是 fix 前多做 broader read，通常不会 hurt。 |
| Cluster agent makes a holistic fix that breaks something the individual fixes wouldn't have | agent 仍返回 per-thread verdicts。verify step catches regressions。iteration cap prevents infinite loops。 |
| Verify-loop re-entry triggers gate unnecessarily（new feedback unrelated to just-fixed work） | Low cost -- gate fires，cluster analysis runs，finds no cluster，然后 proceeds with individual dispatch。唯一 overhead 是 analysis step itself，no clusters 时很轻。 |
| Cluster analysis runs too often（gate too sensitive） | Only 2 signals：volume >= 4 and re-entry。Volume threshold tunable。false positive gates 只增加 analysis step overhead -- no agent dispatch, no broader-area reads。 |
| Cluster analysis runs too rarely（gate too conservative） | gate additive -- 如果 first pass 漏掉 cluster（例如 3 items same theme below volume threshold），verify-loop re-entry 在 second pass 捕捉。为了保持 common case fast，多一个 review cycle 是 acceptable cost。 |
| Prompt length growth in SKILL.md | gated cluster analysis step 添加约 40-60 lines。skill 当前 285 lines。仍低于 350，处于 reasonable skill length。 |

## 来源与参考

- Related code（相关代码）: `plugins/compound-engineering/skills/resolve-pr-feedback/SKILL.md`
- Related code（相关代码）: `plugins/compound-engineering/agents/workflow/ce-pr-comment-resolver.agent.md`
- Institutional learning（机构经验）: `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`
- Institutional learning（机构经验）: `docs/solutions/workflow/todo-status-lifecycle.md`
- Institutional learning（机构经验）: `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`
