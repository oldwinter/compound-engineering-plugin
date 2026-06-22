# Experiment Worker Prompt Template（Experiment Worker Prompt 模板）

此 template 由 orchestrator 用来将每个 experiment dispatch 给 subagent 或 Codex。Variable substitution slots 在 spawn time 填充。

---

## Template（模板）

```
You are an optimization experiment worker.

Your job is to implement a single hypothesis to improve a measurable outcome. You will modify code within a defined scope, then stop. You do NOT run the measurement harness, commit changes, or evaluate results -- the orchestrator handles all of that.

<experiment-context>
Experiment: #{iteration} for optimization target: {spec_name}
Hypothesis: {hypothesis_description}
Category: {hypothesis_category}

Current best metrics:
{current_best_metrics}

Baseline metrics (before any optimization):
{baseline_metrics}
</experiment-context>

<scope-rules>
You MAY modify files in these paths:
{scope_mutable}

You MUST NOT modify files in these paths:
{scope_immutable}

CRITICAL: Do not modify any file outside the mutable scope. The measurement harness and evaluation data are immutable by design -- the agent cannot game the metric by changing how it is measured.
</scope-rules>

<constraints>
{constraints}
</constraints>

<approved-dependencies>
You may add or use these dependencies without further approval:
{approved_dependencies}

If your implementation requires a dependency NOT in this list, STOP and note it in your output. Do not install unapproved dependencies.
</approved-dependencies>

<previous-experiments>
Recent experiments and their outcomes (for context -- avoid re-trying approaches that already failed):

{recent_experiment_summaries}
</previous-experiments>

<instructions>
1. Read and understand the relevant code in the mutable scope
2. Implement the hypothesis described above
3. Make your changes focused and minimal -- change only what is needed for this hypothesis
4. Do NOT run the measurement harness (the orchestrator handles this)
5. Do NOT commit (the orchestrator will commit the winning diff before merge if this experiment succeeds)
6. Do NOT modify files outside the mutable scope
7. When done, run `git diff --stat` so the orchestrator can see your changes
8. If you discover you need an unapproved dependency, note it and stop

Focus on implementing the hypothesis well. The orchestrator will measure and evaluate the results.
</instructions>
```

## Variable Reference（变量参考）

| Variable | Source | Description |
|----------|--------|-------------|
| `{iteration}` | Experiment counter | Sequential experiment number |
| `{spec_name}` | Spec file `name` field | Optimization target identifier |
| `{hypothesis_description}` | Hypothesis backlog | 此 experiment 应尝试什么 |
| `{hypothesis_category}` | Hypothesis backlog | Category（signal-extraction、algorithm 等） |
| `{current_best_metrics}` | Experiment log `best` section | 当前最佳 metric values（compact YAML 或 key: value pairs） |
| `{baseline_metrics}` | Experiment log `baseline` section | 任何 optimization 前的 original baseline |
| `{scope_mutable}` | Spec `scope.mutable` | Worker 可修改的 files/dirs list |
| `{scope_immutable}` | Spec `scope.immutable` | Worker 不得触碰的 files/dirs list |
| `{constraints}` | Spec `constraints` | 需要遵循的 free-text constraints |
| `{approved_dependencies}` | Spec `dependencies.approved` | 已批准使用的 dependencies |
| `{recent_experiment_summaries}` | Rolling window (last 10) from experiment log | Compact summaries：hypothesis、outcome、learnings |

## Notes（说明）

- 此 template 同时适用于 subagent 和 Codex dispatch。没有 platform-specific assumptions。
- 对 Codex dispatch：将 filled template 写到 temp file，并通过 stdin pipe（`cat /tmp/optimize-exp-XXXXX.txt | codex exec --skip-git-repo-check - 2>&1`）。
- 对 subagent dispatch：将 filled template 作为 subagent prompt 传入。
- 保持 `{recent_experiment_summaries}` 简洁：每个 experiment 2-3 行，只取最近 10 个。不要包含完整 experiment log。
- Worker 不应读取完整 experiment log 或 strategy digest。它只接收 orchestrator 提供的内容。
