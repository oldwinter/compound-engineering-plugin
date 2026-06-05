# Judge Evaluation Prompt Template（Judge 评估 Prompt 模板）

此 template 由 orchestrator 用于 dispatch batched LLM-as-judge evaluation calls。每个 judge sub-agent 会评估一批 sampled output items，并返回 structured JSON scores。

Orchestrator（编排器）：
1. 读取 experiment output
2. 按 stratification config 选择 samples（使用 fixed seed）
3. 将 samples 分组为 `judge.batch_size` 大小的 batches
4. 使用此 template dispatch `ceil(sample_size / batch_size)` 个 parallel sub-agents
5. 聚合返回的 JSON scores

---

## Item Evaluation Template（Item 评估模板）

```
You are a quality judge evaluating output items for an optimization experiment.

Your job is to score each item using the rubric below and return structured JSON. Be consistent and calibrated -- the same quality level should get the same score across items.

<rubric>
{rubric}
</rubric>

<items>
{items_json}
</items>

<output-contract>
Return ONLY a valid JSON array. No prose, no markdown, no explanation outside the JSON.

Each element must have:
- "item_id": the identifier of the item being evaluated (string or number, matching the input)
- All fields requested by the rubric (scores, counts, etc.)
- "ambiguous": true if you cannot confidently score this item (e.g., insufficient context, borderline case). When ambiguous, still provide your best-guess score but flag it.

Example output format (adapt field names to match the rubric):
[
  {"item_id": "cluster-42", "score": 4, "distinct_topics": 1, "outlier_count": 0, "ambiguous": false},
  {"item_id": "cluster-17", "score": 2, "distinct_topics": 3, "outlier_count": 2, "ambiguous": false},
  {"item_id": "cluster-99", "score": 3, "distinct_topics": 2, "outlier_count": 1, "ambiguous": true}
]

Rules:
- Evaluate each item independently
- Score based on the rubric, not on how other items in this batch scored
- If an item is empty or has only 1 element when it should have more, score it based on what is present
- For very large items (many elements), focus on a representative subset and note if quality varies across the item
- Every item in the batch MUST appear in your output
</output-contract>
```

## Singleton Evaluation Template（Singleton 评估模板）

```
You are a quality judge evaluating singleton items -- items that are currently NOT in any group/cluster.

Your job is to determine whether each singleton should have been grouped with an existing cluster, or whether it is genuinely unique. Return structured JSON.

<rubric>
{singleton_rubric}
</rubric>

<singletons>
{singletons_json}
</singletons>

<existing-clusters>
A summary of existing clusters for reference (titles/themes only, not full contents):
{cluster_summaries}
</existing-clusters>

<output-contract>
Return ONLY a valid JSON array. No prose, no markdown, no explanation outside the JSON.

Each element must have:
- "item_id": the identifier of the singleton
- All fields requested by the singleton rubric (should_cluster, best_cluster_id, confidence, etc.)

Example output format (adapt field names to match the rubric):
[
  {"item_id": "issue-1234", "should_cluster": true, "best_cluster_id": "cluster-42", "confidence": 4},
  {"item_id": "issue-5678", "should_cluster": false, "best_cluster_id": null, "confidence": 5}
]

Rules:
- A singleton that genuinely has no match in existing clusters should get should_cluster: false
- A singleton that clearly belongs in an existing cluster should get should_cluster: true with the cluster ID
- High confidence (4-5) means you are very sure. Low confidence (1-2) means the item is borderline.
- Every singleton in the batch MUST appear in your output
</output-contract>
```

## Variable Reference（变量参考）

| Variable | Source | Description |
|----------|--------|-------------|
| `{rubric}` | Spec `metric.judge.rubric` | User-defined scoring rubric |
| `{items_json}` | Sampled output items | 要 evaluate 的 items JSON array（一个 batch） |
| `{singleton_rubric}` | Spec `metric.judge.singleton_rubric` | 用于 singleton evaluation 的 user-defined rubric |
| `{singletons_json}` | Sampled singleton items | 要 evaluate 的 singleton items JSON array |
| `{cluster_summaries}` | Experiment output | 用于 singleton reference 的 existing clusters summary（titles/themes） |

## Notes（说明）

- 默认为 Haiku 设计：prompts 对 smaller models 来说 concise 且 well-structured
- Rubric 是 immutable measurement harness 的一部分；experiment agent 不能修改它
- Items 上的 `ambiguous` flag 帮助 orchestrator 识别 noisy evaluations，而不强迫给出 bad scores
- 对 singleton evaluation，orchestrator 提供 cluster summaries（不是 full contents）以保持 judge context lean
- 每个 sub-agent 独立 evaluate 一个 batch；sub-agents 看不到彼此 results
