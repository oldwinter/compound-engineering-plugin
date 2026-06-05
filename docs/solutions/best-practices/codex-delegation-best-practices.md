---
title: "Codex Delegation 最佳实践"
date: 2026-04-01
category: best-practices
module: "Codex delegation / skill design"
problem_type: convention
component: tooling
severity: medium
applies_when:
  - Designing delegation to external models (Codex, future delegates) in orchestrator skills
  - Authoring or editing SKILL.md files where token cost matters
  - Choosing whether to delegate plan execution or implement directly
  - Writing delegation prompts for secondary agents
tags:
  - codex-delegation
  - token-economics
  - skill-design
  - batching
  - orchestration-cost
  - prompt-engineering
  - ce-work-beta
---

# Codex Delegation 最佳实践

## 背景

在围绕 `ce-work-beta` 构建 Codex delegation 的六轮 evaluation 中，我们收集了 Claude Code（orchestrator）与 Codex（delegated executor）之间编排工作的 token economics 定量数据。核心问题是：什么时候把 plan units delegate 给 Codex 真的能节省 Claude tokens？哪些 architectural patterns 控制成本？

Delegation model：`ce-work-beta` 收到包含 N 个 implementation units 的 plan，然后决定直接执行（standard mode），还是通过 `codex exec` delegate 给 Codex。Delegation 每个 batch 有固定 orchestration overhead（写 prompt file、调用 codex exec、result classification、commit），约 4-5k Claude tokens。Claude 不亲自写的每个 code unit 大约节省 3-5k tokens。crossover 取决于每次 delegation call batching 了多少 units。

Evaluation 覆盖 iterations 1-6，在 delegation 和 standard modes 下测试 small（1-2 units）、medium（4 units）、large（7 units）和 extra-large（10 units）plans，并在 isolated worktrees 中进行真实 code implementation 和 test verification。

---

## 指南

### Token Economics（token 经济性）

Delegation 每个 batch 有固定 orchestration cost（prompt generation、codex exec、result classification 和 commit 约 4-5k Claude tokens），并有每个 unit 的 variable savings（避免 Claude 写 code 约 3-5k Claude tokens）。crossover 取决于每次 call batching 多少 units。

**按 plan size 划分的 crossover:**

| Plan size | Units | Delegate tokens | Standard tokens | Overhead | Verdict（结论） |
|-----------|-------|----------------|-----------------|----------|---------|
| Small (bug fix) | 1 | 51k | 38k | +34% | 不值得为 token savings 使用 |
| Small (new feature) | 1 | 63k | 42k | +50% | 不值得为 token savings 使用 |
| Medium | 4 | 54k | 53k | +2% | 边际 |
| Large | 7 | 62k | 62k | +1% | Break-even |
| Extra-large | 10 | 54k | 62k* | **-13%** | Delegation 更便宜 |

*Standard mode 从 7-unit baseline 外推。XL delegate cost（54k）低于 7-unit standard cost（62k），因为 orchestration 被更多 units amortized。

**How it scales（扩展方式）:** batch 中每增加一个 unit，会节省约 3-5k Claude tokens，同时不增加 orchestration cost。Orchestration 是 per-batch，不是 per-unit。一个 10-unit plan 分成 2 batches 时，无论每个 batch 包含 5 units 还是 50 lines of code，orchestration 都约 8-10k。

**crossover point 约为 5-7 units。** 低于它时，orchestration overhead 占主导。高于它时，code-writing savings 占主导。用户仍可能在 crossover 以下选择 delegation，用于 cost arbitrage（Codex tokens 比 Claude tokens 便宜）或 coding preference。

**Wall clock time cost（实际耗时成本）:** 因 codex exec latency，delegation 慢 1.7-2.2x：

| Plan size | Delegate time | Standard time | Slowdown（变慢幅度） |
|-----------|---------------|---------------|----------|
| Medium (4 units) | 353s | 188s | 1.9x |
| Large (7 units) | 569s | 254s | 2.2x |
| Extra-large (10 units) | 574s | ~300s* | ~1.9x |

**Test coverage cost（测试覆盖成本）:** 如果 prompt 中没有 explicit testing guidance，Codex 生成的 tests 比 Claude 少 15-43%。在 prompt 中加入 `<testing>` section 后，大 plans 的差距缩小约 35%（见 Prompt Engineering section）。

**Evolution across iterations（迭代演进）：**

| Iteration | Architecture | Medium delegate tokens | Change（变化） |
|-----------|-------------|----------------------|--------|
| 3 | Per-unit loop, all content in SKILL.md body (776 lines) | 58k | Baseline |
| 4 | Added optimizations to body (~810 lines) | 79k | +38%（更差，因为 body growth 压过 savings） |
| 5 | Extracted to reference file, batched model (514 lines) | 61k | 从 iter-4 降 -23%，回到 baseline |
| 6 | Added `<testing>` to prompt | 54k | -7%（且 test quality 更好） |

iteration 4 的关键教训：把内容加进 skill body 会增加每次 tool call 的成本。节省少量 tool calls、但给 body 增加 50+ lines 的优化，可能 net negative。

### Skill body size 是 multiplicative cost driver

主导公式：

```
total_token_cost ~ skill_body_lines x tokens_per_line x num_tool_calls
```

减少 tool calls 是线性帮助。减少 skill body size 是 **multiplicative** 帮助，因为它影响整个 session 中每一个剩余 tool call。在 iteration 4 中，将 optimization instructions 直接加入 SKILL.md body，尽管这些 optimizations 在结构上合理，仍导致 token *increase*，因为更大的 body 在每个后续 tool call 上的成本超过了优化节省。

**Threshold rule:** 如果内容超过约 50 行，并且只在少数 invocations 中使用，就移到 reference file。始终需要的内容保留在 body。

### 降低成本的 architecture patterns（按影响排序）

**1. 将 conditional content extract 到 reference files。**
把 delegation-specific content（约 250 lines）从 SKILL.md body 移到 `references/codex-delegation-workflow.md`，使 skill 从 776 行降到 514 行。这在 non-delegation run 中节省约 15k Claude tokens -- body 减少 34%，影响每个 tool call。reference 只在 delegation active 时加载一次。

**2. Batch execution，而不是 per-unit execution。**
在一次 `codex exec` call 中发送所有 units（或约 5 个一组），把 orchestration 从 O(N) 降到 O(ceil(N/batch_size))。10-unit plan：2 batches x 约 4-5k = 8-10k orchestration，而 per-unit delegation 是 10 x 4-5k = 40-50k。

**3. 把 verify/test-fix loop delegate 给 Codex。**
原设计中 Codex 写 code，orchestrator 独立运行 tests 来 verify。这让 verification cost 翻倍 -- Claude 重新运行 Codex 已跑过的同一批 tests，每个 batch 增加一次 tool call，并为 "completed but verify failed" 添加 classification logic（result table 的第 6 个 signal）。把 verification 放入 delegation prompt（"run tests, fix failures, do not report completed unless tests pass"）可以消除这次 round-trip。

safety net 是 circuit breaker，而不是 orchestrator 重新跑 tests。如果 Codex 报告 "completed" 但代码实际坏了，failure 会在三个 catch points 之一浮现：(1) result schema -- Codex 在无法让 tests pass 时报告 "failed" 或 "partial"，触发 rollback；(2) circuit breaker -- 3 次 consecutive failures 禁用 delegation，并 fallback 到 standard mode，由 Claude 按完整 Phase 2 testing guidance 实现；(3) Phase 3 quality check -- shipping 前无论 execution mode 都运行 full test suite。orchestrator 不需要独立 verify 每个 batch，因为这些 layered catches 能防止坏代码 shipping。关键设计 insight 是：trust delegate's self-report，用 circuit breaker 防 systematic failure，最后 verify whole。

**4. 缓存 pre-delegation checks。**
Environment guard、CLI availability 和 consent checks 在第一个 batch 前运行一次，而不是 per-unit 或 per-batch。它们不会在 execution 中途变化。

**5. 批量 scratch cleanup。**
在 end-of-plan 清理 `.context/` delegation artifacts，而不是 per-unit 清理。更少 tool calls，同样 outcome。

### Plan quality 决定 delegation decisions 的质量

每个 delegation decision -- 是否 delegate、如何 batch、prompt 中包含什么 -- 都依赖 plan file 提供的信息。orchestrator 的聪明程度只能等于它读取的 plan。

| Plan signal | What it enables |
|-------------|----------------|
| Unit count and scope | crossover decision（5-7 unit threshold） |
| File lists per unit | "Don't split units that share files" batching rule |
| Test scenarios per unit | 转发给 Codex 的 `<testing>` prompt section；thin plan scenarios 会产生 thin Codex tests，无论 prompt engineering 如何 |
| Verification commands | 成为 `<verify>` section；缺失 verification 意味着 Codex 无法确认自己的工作 |
| Triviality signals (Goal, Approach) | 是否考虑 delegation（"config change" vs "recursive validation engine"） |
| Dependencies between units | >5 units plans 的 batch boundary decisions |

结构良好的 ce:plan output 会提供以上全部内容。手写 requirements doc 或 TODO list 可能提供很少甚至没有 -- delegation logic 仍可工作（skill 处理 non-standard plans），但 decisions 的信息量更少。例如，没有 explicit file lists 时，batching rule 无法检查 shared files；没有 test scenarios 时，Codex prompt 的 `<testing>` section 就没有补充材料。

这并不意味着 delegation 要求 ce:plan output。它意味着 delegation quality 会随 plan structure 成比例改善。投入 structured plans 的用户会获得更聪明的 delegation decisions。轻量 plans 的用户也能使用 delegation，但会做 conservative choices（例如 single-batch everything、generic test guidance）。

### 为 delegation quality 做 prompt engineering

没有 explicit testing guidance 时，Codex 生成的 tests 比 Claude 少 15-43%。三个 prompt additions 可以缩小这个差距：

**`<testing>` section** -- 包含 Test Scenario Completeness guidance（happy path、edge cases、error paths、integration）。这让 large plans 中 Codex test output 改进约 35%。Codex 会实现 prompt 要求的内容；它不会从 context 中推断 quality standards。

**Combined `<verify>` command** -- 要求用单个 command 运行 ALL test files，而不是 per-file。Per-file verification 会漏掉 cross-file contamination -- eval 中观察到，一个 test file 中 mocked `globalThis.fetch` 泄漏到了同一 bun process 中运行的 integration tests。

**Light system-wide check** -- "If your changes touch callbacks, middleware, or event handlers, verify the interaction chain end-to-end." 这一句话能抓住 Codex 否则会漏掉的 architectural issues。

### Batching 策略

把所有 units 放进一个 batch。如果 plan 超过 5 units，就拆成约 5 个一组的 batches，且绝不拆开共享 files 的 units。如果每个 unit 都 trivial，则完全跳过 delegation。

Batches 之间：报告 progress，然后除非用户介入，否则立即继续。checkpoint 的存在是为了让用户 *can* steer，而不是要求他们 *must* steer。

### 用户选择很重要

即使 delegation 对 Claude token savings 不最优，用户也可能更偏好它：

- **Cost arbitrage** -- 在用户的 usage plan 中，Codex tokens 可能更便宜
- **Coding preference** -- 用户可能更喜欢 Codex 在某些 tasks 上的 implementation style
- **Usage conservation** -- 用户可能专门想节省 Claude Code usage

`work_delegate_decision` setting（`auto`/`ask`）支持这一点。在 `ask` mode 中，skill 会给出 recommendation 和 rationale，但允许用户 override。当建议不要 delegation 时："Codex delegation active, but these are small changes where the cost of delegating outweighs having Claude Code do them." 用户仍可选择 "Delegate to Codex anyway."

---

## 为什么重要

天真的假设 -- 把工作 offload 给 secondary agent 总能节省 orchestrator tokens -- 对 small workloads 是错的，只有超过特定 threshold 才成立。如果没有这些数据，skill authors 要么完全避免 delegation（错过 large plans 的 savings），要么普遍应用它（在 small plans 上浪费 tokens）。由六轮 evaluation 的真实 token counts 得出的 5-7 unit crossover，提供了具体 decision boundary。

skill body size 是 multiplicative cost driver 这一发现，改变了整个 plugin 中 skills 的 authoring 方式。SKILL.md body 中的每一行都会在 session 的每次 tool call 上付费。这使 "extract rarely-used content to reference files" 成为 skill authors 可用的最高 leverage optimizations 之一，也把向 skill body 添加 helpful content 的直觉重新 framed 为 potential anti-pattern，尤其当该 content 是 conditional 时。

---

## 适用时机

- **在任何 orchestrator skill 中设计 delegation：** 使用 5-7 unit crossover 作为 threshold。低于它时，除非用户明确要求 delegation，否则偏好 direct execution。
- **Authoring 或 editing 任意 SKILL.md：** 审计超过约 50 行的 conditional content blocks。如果它们只适用于少数 invocations，extract 到 reference files。
- **向 skill 添加 optimization 或 guidance content：** 衡量新增 body size 的 per-call 成本是否超过 optimization savings。如果 content 只与特定 execution path 相关，它属于 reference file。
- **编写 delegation prompts：** 包含 explicit testing completeness guidance，并要求 unified test execution。不要假设 delegated agent 会推断 quality standards。
- **选择 batch sizes：** 使用最多约 5 units 的 batches，绝不拆开共享 files 的 units。

---

## 示例

**Skill body size 影响 -- iteration 4 regression：**

Iteration 3：SKILL.md 为 776 行。Medium plan（4 units）delegated cost 58k Claude tokens。
Iteration 4：向 body 添加 optimization content，SKILL.md 增长到约 810 行。同一 plan cost 79k tokens（+38%），尽管 tool calls 更少。optimization content 本身合理，但 body growth 压过了 savings。
Iteration 5：将 delegation extract 到 reference file，SKILL.md 回到 514 行。同一 plan cost 61k tokens -- 带着更多 features 回到 iter-3 水平。

**Delegation decision 示例（delegation 决策示例）：**

3-unit plan（3 个 unit 的 plan），全部 implementation:
> Standard mode recommended（推荐 standard mode）。这 3 个 units 低于效率阈值。Direct execution 使用更少 Claude tokens。

8-unit plan（8 个 unit 的 plan），混合 implementation 和 tests:
> Delegate（委托）。Batch into [units 1-5] and [units 6-8]，保持 shared-file units 在一起。Pre-delegation checks 只运行一次。Progress 在 batches 之间报告。

4-unit plan（4 个 unit 的 plan），全部 config/renames:
> Skip delegation（跳过委托）。所有 units 都很 trivial，orchestration overhead 超过任何收益。

4-unit plan（4 个 unit 的 plan），用户显式要求 delegation:
> Delegate despite marginal economics（即使收益边际也委托）。尊重 user preference。One batch，standard flow。

---

## 相关

- [Codex delegation requirements](../../brainstorms/2026-03-31-codex-delegation-requirements.md) -- 定义 delegation flow 的 origin requirements
- [Codex delegation implementation plan](../../plans/2026-03-31-001-feat-codex-delegation-plan.md) -- 含 prompt template 与 circuit breaker design 的 implementation plan
- [Pass paths not content to subagents](../skill-design/pass-paths-not-content-to-subagents.md) -- multi-agent orchestration 的 foundational token efficiency pattern
- [Script-first skill architecture](../skill-design/script-first-skill-architecture.md) -- complementary token reduction pattern（通过把 processing 移到 scripts 节省 60-75%）
- [Agent-friendly CLI principles](../agent-friendly-cli-principles.md) -- 与 `codex exec` consumption 相关的 CLI design principles
