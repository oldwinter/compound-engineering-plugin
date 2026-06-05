# ce-sessions terminology-preservation grader（术语保留评分器）

此 grader 评估 ce-sessions findings 是否保留了足够的 terminology resolution context，使 downstream vocabulary capture（ce-compound Phase 2.4）能够工作。它**不是** ce-sessions 的 general quality grader；这里的窄问题是：“Phase 2.4 是否能从这些 findings 中提取 qualifying domain terms？”

## Inputs to the grader（grader 输入）

对每个 eval run，grader 接收：

1. **The eval definition**，来自 `evals.json`（terms、tiers、expected_context、notes）。
2. **The findings text**，即 ce-sessions 返回给 orchestrating agent 的文本。
3. **(Optional) The full agent transcript**，即 ce-sessions invocation 的完整 agent transcript（如可用）；这有助于区分 “ce-sessions 返回了这段内容，但 agent paraphrased it” 与 “ce-sessions verbatim 返回了这段内容”。

## Two-stage grading（两阶段评分）

### Stage 1 — Programmatic term recall（程序化术语召回，substring match）

对 `expected_terms` 中每个 entry：
- 如果 term（case-insensitive、substring match）出现在 findings text 任意位置，score 1。
- 否则 score 0。

按 tier 聚合：
- `must_recall` =（must-tier terms 中 scored 1 的数量）/（must-tier terms 总数）
- `should_recall` =（should-tier terms 中 scored 1 的数量）/（should-tier terms 总数）
- `may_recall` =（may-tier terms 中 scored 1 的数量）/（may-tier terms 总数）

**Stage 1 pass criterion（Stage 1 通过标准）：** `must_recall == 1.0`（每个 must-tier term 都出现）。

如果 Stage 1 失败，说明 ce-sessions 正在丢弃最 distinctive coined terms——synthesis loss 很严重，Stage 2 moot。记录 failure 并停止。

### Stage 2 — Context preservation（上下文保留，LLM-graded）

对 `expected_context` 中每个 entry：

阅读 findings text。判断 expected context item 是 **preserved with rationale** 还是 **mentioned without context**。应用此 rubric：

- **`preserved` (1.0)** — finding text 讨论了 term，以及它的 meaning、role 或背后的 reasoning。示例："synthesis gate was introduced to prevent ce-plan from silently proceeding past synthesis without showing the user a Stated/Inferred/Out of scope summary."
- **`keyword_only` (0.0)** — finding 提到了 term，但没有表达它为什么重要或含义是什么。示例："the user worked on the synthesis gate."
- **`absent` (0.0)** — term 完全没有出现在 relevant section。

**Stage 2 pass criterion（Stage 2 通过标准）：** `expected_context` 中每个 entry 都 score `preserved`。

对 eval id #4（near-miss-false-positive），Stage 2 改为检查 `must_not_contain_in_relevant_findings`：
- 对每个 `must_not` entry，搜索 findings。
- 如果该 entry 作为 **relevant result** 出现（而不是例如 “not relevant — different context” caveat），Stage 2 失败。
- “Not relevant” mentions 可以接受；把 ce-compound mode:headless feature PR work 当成回答 CI/CD deployment query 的相关内容 surface，才是 failure mode。

## Aggregating across runs（跨 runs 聚合，variance）

对每个 eval，运行 prompt N 次（默认来自 `variance_protocol.runs_per_eval` 的 3 次）。

每个 run 捕获：
- Stage 1 的 `must_recall`、`should_recall`、`may_recall`
- Stage 2 的 `context_preservation_rate`（preserved count / expected_context count）
- `stage_1_pass` (bool)、`stage_2_pass` (bool)

每个 eval 计算：
- `mean_must_recall`、`stddev_must_recall`
- `mean_context_preservation`、`stddev_context_preservation`
- `runs_passed`（stage_1_pass 和 stage_2_pass 均为 true 的 run count）

**Eval-level pass criteria（eval 级通过标准）：**
- `mean_must_recall >= 0.80`
- `stddev_must_recall < 0.20`
- `runs_passed >= 2 of 3`（更高 N 时按比例）

## Outputs（输出）

把 per-run grades 写到 `<workspace>/iteration-N/eval-<ID>/grading.json`：

```json
{
  "eval_id": 1,
  "eval_name": "synthesis-gate-recovery",
  "run_index": 0,
  "stage_1": {
    "must_recall": 1.0,
    "should_recall": 0.83,
    "may_recall": 0.33,
    "passed": true,
    "matched_terms_by_tier": {
      "must": ["synthesis gate", "ce-plan"],
      "should": ["Phase 0.7", "Stated", "Inferred", "Out of scope", "Phase 5.1.5"],
      "may": ["synthesis-summary.md"]
    },
    "missed_terms_by_tier": {
      "should": ["call-outs"],
      "may": ["silent proceeding is not allowed"]
    }
  },
  "stage_2": {
    "context_results": [
      {"item": "synthesis gate purpose preserved", "verdict": "preserved", "evidence": "<quoted snippet from findings>"},
      {"item": "Stated/Inferred/Out of scope as buckets", "verdict": "keyword_only", "evidence": "<quoted snippet>"}
    ],
    "context_preservation_rate": 0.5,
    "passed": false
  },
  "overall_passed": false
}
```

然后跨 runs 聚合到每个 eval 的 summary，路径为 `<workspace>/iteration-N/eval-<ID>/summary.json`。

## 分别呈现三类风险

eval design 会分离 signal，因此 failure 会指向某一种 risk：

| Risk（风险） | Signal（信号） | Where it surfaces（呈现位置） |
|------|--------|-------------------|
| Synthesis loss（distinctive terms dropped，综合丢失显著术语） | Stage 1 must-tier fails on eval #1 or #2 | grading.json `stage_1.must_recall < 1.0` |
| Synthesis loss（nuance lost, term kept，术语保留但细微含义丢失） | Stage 1 passes, Stage 2 fails on eval #1 or #2 | grading.json `stage_1.passed: true, stage_2.passed: false` |
| Indexing gap（tangential terminology not surfaced，相关术语未呈现） | Eval #3 fails Stage 1 should-tier | grading.json eval-3 `should_recall == 0` despite related sessions existing |
| Variance（方差） | Same eval passes on some runs, fails on others | summary.json `stddev_must_recall >= 0.20` or `runs_passed < N` |
| False positive（误报） | Eval #4 surfaces the ce-compound mode:headless work as relevant to CI/CD deployment query | grading.json eval-4 `stage_2.passed: false` |
