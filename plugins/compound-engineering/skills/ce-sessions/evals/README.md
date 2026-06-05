# ce-sessions terminology-preservation eval suite（术语保留评估套件）

## Purpose（目的）

验证 PR #838（`feat(concepts): introduce CONCEPTS.md as shared vocabulary substrate`）引入的一个 load-bearing assumption：ce-sessions findings 是否保留了足够的 terminology resolution context，让 ce-compound Phase 2.4 的 vocabulary capture 能提取 qualifying domain terms。

如果 ce-sessions 只返回 high-level 的 “here's what was discussed” summaries，并丢掉具体 coined terms 和 resolution context，那么把它的 output 接入 ce-compound 的 vocabulary-capture scan 只是装饰。如果它返回 terms 及其 rationale，wiring 就像宣传的一样有效。

此 suite 严格聚焦 terminology-preservation question。它不评估 ce-sessions 的 general search quality、response shape 或任何其他属性。

## Files（文件）

| File | Purpose（用途） |
|------|---------|
| `evals.json` | Test case definitions with prompts, expected terminology by criticality tier, expected context items, and ground-truth pointers (PR numbers + merge commits) |
| `grader.md` | Grading rubric — two-stage (programmatic substring + LLM context-preservation), per-run + aggregate metrics, risk attribution |
| `README.md` | 本文件 |

## Test cases at a glance（测试用例概览）

| # | Name（名称） | Risk tested（测试的风险） | Ground truth（真实依据） |
|---|------|-------------|--------------|
| 1 | synthesis-gate-recovery | Synthesis loss (distinctive term) | PR #822 (merged 2026-05-15) |
| 2 | mode-headless-semantic-alignment | Synthesis loss (multi-piece nuance) | PR #813 (merged 2026-05-10) |
| 3 | tangential-term-recovery | Indexing gap | PRs #822, #819, #829 |
| 4 | near-miss-false-positive | False positive on shared keyword | Anti-PR: #813 |

## Design rationale（设计理由）

**为什么是这四个 cases。** 每个 case 隔离 load-bearing assumption 的一个 distinct failure mode：

- **Eval 1** 使用单个 distinctive coined term（"synthesis gate"），因此失败会成为 synthesis loss 的明确证据。如果 ce-sessions 在询问自己 work 时不能 verbatim 返回该 term，assumption 就 broken。
- **Eval 2** 测试一个 multi-piece design decision（rename + cross-skill alignment + principle refinement）。通过它说明 ce-sessions 保留 nuance，而不只是保留显眼 coined nouns。
- **Eval 3** 是 indexing-gap test。query 提到 "ce-plan workflow improvements"，但没有命名任何 synthesis-gate terminology。Phase 2.4 的真实使用场景是 broad-topic queries 希望 surface terminology——如果 eval 3 失败而 eval 1 通过，说明 ce-sessions 只有在 query 直接命名 terms 时才能 retrieve terms，也就是说 ce-compound 的 wiring 对实际 use case 来说只是装饰。
- **Eval 4** 是 discriminating-power test。如果 ce-sessions 把 ce-compound mode:headless feature work 作为与 CI/CD server-deployment query 相关的内容 surface，false-positive findings 会把错误 vocabulary 喂给 Phase 2.4。

**为什么 two-stage grading。** Programmatic substring matching（Stage 1）能便宜地捕获最糟情况：distinctive terms 完全被丢掉。LLM-graded context preservation（Stage 2）捕获更微妙的情况：term 存活了，但其 rationale 被 summary 掉——这会让 Phase 2.4 看见 term，却无法写出有用的 CONCEPTS.md entry，因为 *why* it qualifies 的 context 没了。

**为什么关注 variance across runs。** ce-sessions 涉及 LLM synthesis step（session-historian subagent）。Single-run pass/fail 是误导信号，因为同一个 prompt 在不同 invocations 上可能产出不同 findings。每个 eval 3 runs 的 protocol 能捕获这样的问题：assumption 平均成立，但实践中失败频率高到不可靠。

## How to run（framework-driven，运行方式）

此 suite 通过 `skill-creator` framework 运行，不手工运行。framework 会 parallel spawn subagents 调用 ce-sessions，捕获 findings 到 workspace，打分、聚合并打开 viewer。

**Workspace location（workspace 位置）：** `/tmp/compound-engineering/ce-sessions/evals/iteration-<N>/`（按 repo AGENTS.md scratch conventions——`/tmp` 用于 cross-invocation reusable scratch，可 grep/inspection）。

**One subagent dispatch per eval × per run（每个 eval、每次 run 调度一个 subagent）。** 每个 dispatched subagent 接收 eval prompt，调用 `/ce-sessions <prompt>`，verbatim 捕获 findings text，并写入 `<workspace>/iteration-<N>/eval-<ID>-<name>/run-<R>/findings.txt`。

默认 `runs_per_eval: 3` 且 4 个 evals 时，每次 run pass 有 12 个 with-skill subagent dispatches。

**Baseline runs are optional and not part of the initial pass（baseline runs 可选，且不属于 initial pass）。** skill-creator 的标准 flow 会为每个 eval spawn 一个 baseline subagent（without the skill），用于比较 with-skill vs without-skill。对本用例来说，这个比较 signal 较弱，因为问题都需要 session access——baseline agent 没有 session history，自然无法 recover terminology。grader 的 pass/fail 来自 against ground truth 的 terminology-preservation grading，而不是 with/without delta。如果想要 baselines 作为 sanity-check control（确认 ce-sessions 是 recovered terms 的来源），可以额外运行 4 个 without skill path 的 dispatches。

**Grading（评分）。** 所有 with-skill runs 返回后，dispatch 一个 grader subagent，读取每个 `findings.txt` 并应用 `grader.md` 的 two-stage rubric。grader 为每个 run 写 `grading.json`，并为每个 eval 聚合到 `summary.json`。

**Viewer（查看器）。** grading 后，对 workspace iteration directory 运行 `python <skill-creator-path>/eval-viewer/generate_review.py`。viewer 会把 findings 与 expected terms 并排渲染，让你逐 run eyeball context preservation。

## Ground truth caveats（真实依据注意事项）

- eval suite 假设用户的 session history 包含产生 PR #813 和 #822 的 sessions。如果这些 sessions 在其他机器上，或已不在 session storage 中，eval 1 和 2 会因非 ce-sessions defect 的原因失败。
- 运行前确认相关 sessions 可访问。Quick sanity check：`/ce-sessions "what did I do on 2026-05-10?"`——如果 ce-sessions 返回该日期附近的 content，则 history 存在。
- 如果 history 缺失，把 eval results 视为 inconclusive，而不是反对 assumption 的证据。

## Interpreting outcomes（解读结果）

| Outcome | Interpretation | Action |
|---------|----------------|--------|
| All 4 evals pass with low variance | Assumption holds. ce-compound Phase 2.4 wiring works as advertised. | Ship PR #838. |
| Eval 1 or 2 fails Stage 1 | Synthesis loss is severe — distinctive coined terms are being dropped. | Investigate ce-session-historian's synthesis prompt; consider tightening it to preserve verbatim terminology. Revise PR #838's claims accordingly. |
| Eval 1 or 2 passes Stage 1 but fails Stage 2 | Terms survive but rationale is lost. | Phase 2.4 will see terms but may not write good entries. Consider whether the wiring still delivers value, or whether the historian needs to preserve more context. |
| Eval 3 fails while 1 and 2 pass | Indexing gap — terms only retrievable when queried by name. | The Phase 2.4 wiring is decorative for the broad-topic use case. Reconsider whether to ship the session-search scan input, or change how Phase 2.4 queries ce-sessions. |
| High variance | Mechanism works but unreliably. | Multiple invocations within ce-compound's flow would help, or accept it as a best-effort enhancement rather than load-bearing. |
| Eval 4 fails | False-positive risk to vocabulary feed. | Tighten Phase 2.4 to score-rank findings before feeding them to the vocabulary scan, or accept that some noise enters the file. |
