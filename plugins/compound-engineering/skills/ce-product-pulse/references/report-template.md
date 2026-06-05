# Pulse Report Template（Pulse 报告模板）

在 queries 返回后，由 `SKILL.md` 于 Phase 2.3 加载。使用 query results 填写 template。目标总长度：30-40 行。

## 填写规则

- 使用真实数字，不用 ranges 或 hedges。如果某个数字不确定，inline 注明 source。
- Percent deltas 比较 current window 与 previous equal-length window（例如 `24h` 对比前一个 `24h`）。如果无法比较，省略 delta，不要编造。
- 不要 hardcoded thresholds。除非 reader 在 setup 时要求 threshold-based annotation，否则不要把事物标为 "high" 或 "low"，也不要把任何内容标红。
- 不要 PII。不要 emails、account IDs、message content。
- Headlines 位于页面顶部。如果 reader 只读前 3 行，也应知道发生的最重要事情。
- 如果存在 `STRATEGY.md`，组装 report 前重新读取其 `## Key metrics` section。对每个 strategy metric，决定如何 render：
  - 如果 metric name 出现在 `pulse_excluded_metrics`，从 report 中省略。
  - 如果 metric name 出现在 `pulse_pending_metrics`，在 Usage section 中包含它，并标记为 `no data (instrumentation pending)`。
  - 否则解析该 metric 的 source：在 `pulse_metric_sources`（`metric=source` pairs 的 CSV）中查找；如果存在，使用该 source。如果不存在，fallback 到 `pulse_analytics_source`，并在 metric line 后追加 `(default source)`，让 implicit routing 可见。然后 query 并 render metric 的 current value 和 delta。如果 query 没有返回 value，仍包含它并标记为 `no data`。

## Template（模板）

下面的 block 是要写入的 literal content。用 query output 替换每个 `{{placeholder}}`。删除本次 run 没有可用 data 的 lines。

~~~markdown
# {{product_name}} Pulse - {{window}} - {{YYYY-MM-DD HH:MM}} {{TZ}}

## Headlines

- {{one-line headline capturing the most notable thing in the window}}
- {{optional second headline}}
- {{optional third headline}}

## Usage

- **Primary engagement:** {{N events}} ({{delta vs prior window}})
- **Value realization:** {{N events}} ({{delta}}) - {{ratio vs engagement}}
- **Completions / conversions:**
  - {{conversion event 1}}: {{N}} ({{delta}})
  - {{conversion event 2}}: {{N}} ({{delta}})
- **Strategy metrics (if carried forward):**
  - {{metric name}}: {{value}} ({{delta}})
- **Quality sample (if configured):** {{distribution e.g. "8x 5, 1x 4, 1x 2"}}

## System performance

- **Latency:** p50 {{ms}}, p95 {{ms}}, p99 {{ms}} ({{delta vs prior window}})
- **Top errors** (top 5 by count, descending):
  1. **{{error signature}}** - {{N occurrences}} - {{one-line context, no PII}}
  2. **{{error signature}}** - {{N occurrences}} - {{one-line context}}
  3. **{{error signature}}** - {{N occurrences}} - {{one-line context}}
  4. **{{error signature}}** - {{N occurrences}} - {{one-line context}}
  5. **{{error signature}}** - {{N occurrences}} - {{one-line context}}

## Followups

- {{One thing worth investigating next - specific enough to act on}}
- {{Another thing worth investigating}}
- {{3-5 items max; trim if thin}}

---
_Source windows: analytics [{{start}} -> {{end}}], tracing [{{start}} -> {{end}}], payments [{{start}} -> {{end}}]. Trailing buffer: 15m. Saved to `docs/pulse-reports/{{YYYY-MM-DD}}_{{HH-MM}}.md`._
~~~

## Variations（变体）

- **未配置 system performance tool：** 省略整个 `## System performance` section。Report 保持 Headlines / Usage / Followups。
- **未 opt in quality scoring：** 省略 quality sample line。
- **Single-source setup（analytics only）：** 从 footer 中省略 tracing 和 payments source windows。
- **Setup 时自定义了 error count**（例如 top 3 而不是 top 5）：遵循 configured count。不要超出 query 返回结果去 pad 或 trim。

## Post-write checklist（写入后检查清单）

保存并展示到 chat 前：

- [ ] 总长度为 30-40 行（上下浮动 5 行）。
- [ ] Headlines 存在，并以最 notable item 开头。
- [ ] 没有 hardcoded thresholds（"high error rate"、"low conversion"）。
- [ ] 没有 PII。扫描 error signatures 和 followups，确保没有 user emails、IDs 或 message snippets。
- [ ] Top 5 errors（或 configured count），不是 top 10。如果 query 返回更多，trim。
- [ ] 从 config carry forward 的 strategy metrics 已在 Usage 中 render，或标记为 `no data`。
- [ ] Followups 具体：每一条都应作为句子可执行。
- [ ] Filename 和文件内 timestamp 使用相同 wall-clock time。

## Chat 中展示什么

写入文件后，回复：

- 原样贴出 Headlines section
- 如果 action 看起来 urgent，贴出 top Followup
- 保存的 file path，让用户可以打开完整 report

不要把完整 report 粘贴到 chat 中；file 才是 artifact。
