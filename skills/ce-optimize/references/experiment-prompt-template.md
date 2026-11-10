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

CRITICAL: Do not modify any file outside the mutable scope. The measurement harness and evaluation data are immutable, which means the metric cannot be changed, not that it cannot be gamed: a gain from anything other than doing the work the metric stands for, or one that breaks a constraint below, is reverted by the orchestrator however well it scores.
</scope-rules>

<constraints>
{constraints}
</constraints>

<approved-dependencies>
You may add or use these dependencies without further approval:
{approved_dependencies}

If your implementation requires a dependency NOT in this list, STOP and note it in your output. Do not install unapproved dependencies.
</approved-dependencies>

<source-digest>
What you need to know about the material this target works on and the current approach:

{source_digest}
</source-digest>

<failure-evidence>
Worst cases from the current best that bear on this hypothesis, with what went wrong. Use them to check your change against real failures. The hypothesis still decides what you implement, and it may replace the approach rather than fix these cases:

{failure_cases}
</failure-evidence>

<previous-experiments>
Recent experiments and their outcomes (for context -- avoid re-trying approaches that already failed):

{recent_experiment_summaries}
</previous-experiments>

<instructions>
1. Read the mutable files your change touches. Rely on the source digest for the rest of the material, and open other files only when the hypothesis depends on a detail the digest lacks
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

## Delta for `execution.backend: remote`: measure and report（自行测量并上报）

Remote worker 在自己的机器上有独立 checkout，orchestrator 看不到它的 tree。把下面这段追加到上方 template 中（同一个 prompt 内），并用它替换 template 的第 4 条指令（“Do NOT run the measurement harness”）。template 其余部分不变：scope、constraints 和 dependency 规则完全相同。

```
<remote-worker>
You are running detached, on your own checkout. The orchestrator will not see your tree; it sees only the branch you push and the result you report.

Base: commit {base_sha} on branch {optimization_branch}. Before changing anything, verify your HEAD is exactly {base_sha}. If it is not, check it out; if you cannot, stop and report that.

After implementing the hypothesis, measure PAIRED on this machine, using the immutable harness as-is:
1. Baseline: check out {base_sha} (stash or branch your change), run `{measurement_command}` {sample_count} time(s), record every sample.
2. Candidate: restore your change, run the same command the same number of times, record every sample.
Alternate baseline and candidate runs when {sample_count} > 1. Never edit the measurement command, its working directory, or any file in the immutable scope; a changed harness makes your result unusable.

Commit your mutable-scope changes, and nothing else, with the message `optimize({spec_name}): exp-{iteration} <hypothesis, short>`. That commit is the candidate; its SHA is `head_sha`.

Then write `result.yaml` at the repo root of your checkout with exactly this shape:
  experiment: {iteration}
  base_sha: {base_sha}
  head_sha: <the candidate commit's SHA>
  machine: <a stable identifier for this machine or worker>
  measured_at: <ISO 8601>
  baseline:  { gates: {...}, metrics: { <name>: { aggregate: <n>, samples: [...] } }, diagnostics: {...} }
  candidate: { gates: {...}, metrics: { <name>: { aggregate: <n>, samples: [...] } }, diagnostics: {...} }
  correctness: <checks you ran and their results, or "none">
Include the harness's per-case `cases` object and any cost, tokens, or latency fields in each snapshot only when the harness emits them; do not compute them yourself.
Commit `result.yaml` alone on top of the candidate commit, so the pushed tip's parent is `head_sha`, and push to `{result_ref}`. Do not push to {optimization_branch} or any other branch.

Your final message is the structured result: the pushed ref, head_sha, machine, and the two aggregates. Report an unapproved dependency, a base mismatch, or a harness you could not run as a blocker instead of a result.
</remote-worker>
```

The worker's numbers are its own claim. The orchestrator runs `decide.mjs` on the paired snapshots and, before any keep, obtains a confirmation measurement the worker did not produce (`references/loop.md` 3.4).

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
| `{source_digest}` | `source-digest.md` in the run's scratch directory | Worker 需要了解的 target material 与当前做法 |
| `{failure_cases}` | `worst_cases` on the current best（kept experiment entry 或 baseline） | 与该 hypothesis 相关的 cases 及原因；缺失时为 "none recorded" |
| `{recent_experiment_summaries}` | Rolling window (last 10) from experiment log | Compact summaries：hypothesis、outcome、learnings |
| `{base_sha}` (remote only) | `git rev-parse optimize/<spec-name>` at dispatch | Worker 必须从该 commit 开始，并将其作为 baseline 测量 |
| `{optimization_branch}` (remote only) | `optimize/<spec-name>` | 让 worker 知道不应 push 到哪个 branch |
| `{result_ref}` (remote only) | `optimize-exp/<spec-name>/exp-<NNN>` | Worker push 的 branch；orchestrator 拉取它来收集结果 |
| `{measurement_command}` (remote only) | Spec `measurement.command`（+ `working_directory`） | 原样运行；harness 不可修改 |
| `{sample_count}` (remote only) | `ladder` 模式的探索 pair 为 `1`；`repeat` 为 `repeat_count`；`stable` 为 `1` | 每侧的 paired samples；`decide.mjs` 可通过后续 dispatch 要求更多 |

## Notes（说明）

  - 此 template 同时适用于 subagent、Codex 和 remote dispatch。没有 platform-specific assumptions；只有 `remote` 会追加 measure-and-report 增量。
  - 对 Codex dispatch：将 filled template 写到 temp file，并通过 stdin pipe（`cat /tmp/optimize-exp-XXXXX.txt | codex exec --skip-git-repo-check - 2>&1`）。
  - 对 subagent dispatch：将 filled template 作为 subagent prompt 传入。
  - 保持 `{recent_experiment_summaries}` 简洁：每个 experiment 2-3 行，只取最近 10 个。不要包含完整 experiment log。
  - Worker 不应读取完整 experiment log 或 strategy digest。它只接收 orchestrator 提供的内容。
