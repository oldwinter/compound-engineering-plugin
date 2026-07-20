# `ce-product-pulse`

> 生成 time-windowed pulse report，说明用户体验到了什么、product 表现如何：usage、quality、errors、值得 investigating 的 signals。每次一页。

`ce-product-pulse` 是 **observation-loop** skill。它针对给定 time window（24h、7d、1h 等）查询 product data sources，并生成一页 report，覆盖 usage、performance、errors 和 follow-ups。Report 保存到 `docs/pulse-reports/`，成为 what users experienced 的 browseable timeline：team 对 product 在真实世界表现的 working memory。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-product-pulse` **closes the outer loop**：features shipped 后，pulse 从 real usage surface signals，反馈到 ideation（"what's worth exploring?"）和 brainstorming（"what does this need to be?"）。结合 upstream anchor `ce-strategy` 和捕获 learnings 的 `ce-compound`，这条 chain 成为 feedback system，而不是 one-way pipeline。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 针对 time window 查询 analytics、tracing、payments（以及可选 read-only DB），生成 single-page report |
| 何时使用 | "Run a pulse"、weekly recap、launch-day check、"how are we doing"、`/ce-product-pulse 7d` |
| 产出什么 | 保存到 `docs/pulse-reports/YYYY-MM-DD_HH-MM.md` 的 report；chat 中 surface key points |
| 下一步 | 将 follow-ups 送到 `/ce-ideate` 或 `/ce-brainstorm`；用 native tools investigate specific issues |

---

## 调用示例

```text
# 使用已配置的默认窗口；未配置时使用 24 小时
/ce-product-pulse

# Review 一周窗口
/ce-product-pulse 7d

# 运行较窄的 launch check，同时仍考虑 ingestion delay
/ce-product-pulse 1h

# 重新运行 source 与 metric setup interview
/ce-product-pulse reconfigure
```

选择能回答问题的最短窗口：launch check 和每周 operating review 不应使用同一时间跨度。

---

## 问题

多数 "how are we doing?" reports 以可预测方式失败：

- **Dashboard sprawl**：6 个 tools 上 40 个 metrics；没人读
- **Threshold theater**：基于猜测 thresholds 的 red/yellow/green，不匹配 product 真实 operating ranges
- **Stale by ingestion lag**：最近 15 分钟 analytics under-reported，导致 "what just happened?" 答案错误
- **PII bleed into reports**：emails、account IDs、message content 进入 saved files 和 Slack threads
- **Mutating side effects**：一个 "report generation" tool 意外写 database 或 marks events
- **No memory**：pulses 留在 chat 里，不在 disk 上；无法比较 last week 和 this week
- **No anchor**：pulse 测量碰巧 instrumented 的东西，而不是 strategy 说重要的东西

## 方案

`ce-product-pulse` 以 explicit invariants 运行 structured observation pass：

- **Single-page output**（30-40 lines）：sprawl 是 attention 的敌人
- **Read like a founder**：没有 thresholds、没有 red/yellow/green；呈现 numbers，由 reader 判断
- **15-minute trailing buffer**：每个 query 的 upper bound 是 `now - 15m`，避免 ingestion-lag under-reporting
- **No PII in saved reports**：emails、account IDs、message content 不写入 disk
- **Read-only invariant**：每个 data source 都以 read-only 查询；如果配置 database，connection 必须 read-only（interview 拒绝 read-write credentials）
- **Strategy-seeded**：存在 `STRATEGY.md` 时，interview 读取它并从中 seed metrics；data-source setup 连接实际测量 strategy 说重要的指标
- **Memory through saved reports**：每次运行写入 `docs/pulse-reports/`，让 past pulses 成为 browseable timeline

---

## 独特之处

### 1. Single-page constraint：硬性 30-40 lines

Report 限定为四个 sections（Headlines、Usage、System performance、Followups），目标 30-40 lines。薄的 sections 保持薄；不会为了填空间 padding。Constraint 强迫 report surface what matters，而不是 what is available。

### 2. "Read like a founder"：无 thresholds

Skill 从不标记 "good" 或 "bad"。它呈现 numbers，让 reader 判断。Hardcoded thresholds（例如 "p95 > 500ms is red"）会制造 theater：那是 threshold-setter 的猜测，不是 product signal。读 pulse 的 founder 知道自己的 product 什么算正常；skill 尊重这一点。

### 3. Strategy-seeded interview（由 strategy seed 的访谈）

当 `STRATEGY.md` 存在时，first-run setup 会先读取它，再提问。它 surface seeded product name 和 key metrics list，interview 将 data sources 接上，使这些 metrics 被实际测量。结果：pulse reports 测量 strategy 说重要的内容，而不是 coincidentally instrumented 的内容。没有 strategy doc 时，skill 会明确 note，并从头 setup。

### 4. Read-only invariant（只读不变式）

Skill 永不 mutate product、database 或任何 external system。唯一 writes 是追加 pulse settings 到 `.compound-engineering/config.local.yaml`（gitignored、machine-local）和 report file（`docs/pulse-reports/...`）。MCP 和其他 data-source tools 都 read-only 调用；如果 tool 提供 write modes，不使用。

对于 database access，interview **拒绝** read-write credentials，并指向 alternatives（read replicas、BI views、snapshot exports）。DB access 是 optional；很多 products 只用 analytics + tracing 就能完成 pulse。

### 5. 15-minute trailing buffer（15 分钟尾部缓冲）

许多 analytics 和 tracing tools 有 ingestion lag；query 到 `now` 会 under-report 最近 events。每个 query window 的 upper bound 都是 `now - 15m`。对于 `24h` window，skill 查询 `[now - 24h - 15m, now - 15m]`。Buffer 对 reader 不可见，但消除了 "why does the pulse say zero events in the last hour?" 的常见困惑。

### 6. PII-free saved reports（无 PII 的保存报告）

Saved reports 只包含 count distributions 和 anonymized notes：没有 user emails、account IDs 或 message content。启用 optional quality scoring（AI products）时，低分 sessions 只得到简短 anonymized note 描述 failure mode，而不是 message text。这让 saved reports 可安全 commit、share 或 browse。

### 7. Parallel + serial query dispatch（并行加串行查询）

Phase 2.1 并行分派 analytics、tracing 和 payments queries（不同 tools、无 shared load），然后 serially 运行 read-only DB queries（一次一个，scoped，无 full-table scans）。这种 split 避免对 production database 造成意外 load，同时有效利用 wall-clock budget。

### 8. SMART metric pushback（SMART metric 反推）

Interview 对用户提出的每个 metric、event 和 signal 应用 SMART bar（specific、measurable、actionable、relevant、timely）。Vanity metrics 会被 push back，vague metrics 会被 sharpen。结果是 config 产出 signal，而不是 noise。

### 9. Optional quality scoring with discipline（有纪律的可选 quality scoring）

对于 AI products，sampled sessions 的 quality scoring（按 defined dimension 1-5）是 opt-in。Discipline：normal sessions 默认给 4 或 5；1-3 只用于 clear failure modes（wrong answer、user got stuck、error surfaced）。如果所有 session 都是 3，bar 太严格；如果全是 5，bar 太松。Report 携带 score distribution，而不是 session content。

### 10. Memory through saved reports（通过保存报告形成记忆）

每次 pulse 都写入 `docs/pulse-reports/YYYY-MM-DD_HH-MM.md`（local time）。Past pulses 可 grep、diff、discard：它们是 team 对 product 表现的 working memory。Saved-reports folder 是 working memory，不是 data warehouse。100 个 reports 后，这条 timeline 就成了可滚动查看的真实 artifact。

---

## 快速示例

周一早晨，你想看看周末表现。运行 `/ce-product-pulse 72h`。

Skill 检测到这是 configured project（`.compound-engineering/config.local.yaml` 中设置了 `pulse_product_name`），所以跳过 interview，直接进入 Phase 2。它应用 15-minute trailing buffer：`[Friday 5:45pm — Monday 8:45am]`。

Phase 2.1 并行分派：PostHog query（primary engagement event count、value-realization、completion ratio）、Sentry query（error counts by category、latency p50/p95/p99、top error signatures）、Stripe query（new customers、churn、revenue delta）。然后 serially 运行 read-only DB query（按 tier 查询 active-user count 的小 scoped query）。

Phase 2.2 抽样 10 个 sessions 做 quality scoring（你的 product 是 AI，且 quality scoring enabled）。分布返回：7x5、2x4、1x2：一个 session 因明显 wrong answer 走偏。

Phase 2.3 填充 report template：Headlines（3 lines）、Usage section（engagement、value、completion、quality sample）、System performance（latency、top 5 errors with one-line explanations）、Followups（failed-quality session 值得 investigating；一个 error pattern 周环比上升）。

Report 写到 `docs/pulse-reports/2026-05-04_08-45.md`。Headlines 和 top Followup 在 chat 中 surface。你看到 followup，决定用 `/ce-debug` 调查上升的 error pattern。

---

## 何时使用

在以下情况使用 `ce-product-pulse`：

- 想获得某个 time window 内用户体验的 snapshot（24h、7d、post-launch）
- Launch 刚发生，想做 1h 或 4h early signal check
- Team 做 weekly "how are we doing" recap
- 想 surface follow-ups 供 ideation 或 debugging，而不是盯四个 dashboards

以下情况跳过 `ce-product-pulse`：

- 正在 deep investigation specific issue -> 使用 native tools（Sentry、PostHog 等）
- 需要 real-time alerting -> 那是 monitoring，不是 pulse
- 想知道 "what shipped" -> 那是 git log + PR list，不是 pulse（pulse 关注 user experience 和 system performance，不是 changelog content）

---

## 作为 Workflow 的一部分使用

`ce-product-pulse` 闭合 outer feedback loop：

```text
                    /ce-strategy ──┐
                                    ↓ (key metrics seed pulse)
   ↗── /ce-product-pulse ──────────┐
   │       (followups)             ↓ (signals feed into)
   │                          /ce-ideate → /ce-brainstorm → /ce-plan → /ce-work
   │                                                                      ↓
   └──────────────────────────────────────────────────── shipped ─────────┘
                       (the pulse measures what shipped, in production)
```

在 configured project 中：

- `STRATEGY.md`（来自 `/ce-strategy`）seed 被测量的 metrics
- `/ce-product-pulse` 产出 report 并 surface follow-ups
- Follow-ups 反馈到 `/ce-ideate`（what's worth exploring）、`/ce-debug`（what's broken）或 `/ce-brainstorm`（what to build next）

Pulse 不替代 dashboards、tracing 或 analytics；它把它们 consolidation 成 single-page read，让 team 把 attention 花在少数重要内容上，而不是从四个 sources 重新推导 "what happened"。

---

## 单独使用

Skill 直接用 lookback window 调用：

- **Default 24h（默认 24 小时）**：`/ce-product-pulse`
- **Specific window（指定窗口）**：`/ce-product-pulse 7d`、`/ce-product-pulse 1h`（launch check）、`/ce-product-pulse 30d`
- **Reconfigure**：`/ce-product-pulse setup`（或 `reconfigure`、`edit config`）重新运行 interview
- **First run**：没有 config 时运行 `/ce-product-pulse` 会触发 setup interview，然后运行 pulse

---

## 输出 Artifact（产物）

```text
docs/pulse-reports/YYYY-MM-DD_HH-MM.md  (local time)
```

四个 sections（总目标 30-40 lines）：

- **Headlines**：2-3 行总结 window
- **Usage**：primary engagement、value realization、completions、quality sample distribution（启用时）
- **System performance**：latency（p50/p95/p99）和 top 5 errors by count，附 one-line explanations
- **Followups**：1-5 个值得 investigating 的事项

Past reports 保留在 folder 中，形成 browseable timeline。该 folder 用于 grep、diff 和偶尔 prune，而不是 curated。

---

## 参考

| Argument（参数） | Effect（效果） |
|----------|--------|
| _(empty)_ | 使用 config 中的 `pulse_lookback_default`（未设则 `24h`） |
| `24h`, `48h`, `72h`, `7d`, `30d`, `1h` | Trailing time window |
| `setup` / `reconfigure` / `edit config` | 无视 config state，重新运行 interview |

Configuration 位于 `.compound-engineering/config.local.yaml`（gitignored、machine-local）中的 `pulse_*` keys：product name、primary event、value event、completion events、quality scoring、quality dimension、analytics source、tracing source、payments source、DB enabled、per-metric source overrides、pending metrics、excluded metrics、default lookback。

---

## 常见问题

**为什么 report 中没有 thresholds？**
因为 thresholds 除非针对 specific product 校准，否则就是 theater；为每个 metric 校准 thresholds 比 pulse 本身还麻烦。读 pulse 的 founder 知道什么算正常；report 尊重这一点。如果数字不对，reader 会注意到；如果没问题，就不打扰。

**为什么有 15-minute trailing buffer？**
多数 analytics 和 tracing tools 有 ingestion lag，最近 15 分钟 events 会 under-reported。没有 buffer 时，每个 "what just happened?" pulse 都会低估 recent activity。Buffer 不可见，但消除常见混淆。

**为什么 database access 必须 read-only？**
因为 "generate a report" tool 绝不应意外 mutate production data。Interview 拒绝 read-write credentials，并指向 alternatives（read replicas、BI views、snapshot exports）。很多 products 完全不需要 DB access；analytics + tracing 足够。

**为什么 report 是 single page？**
Sprawl 是 attention 的敌人。40 metrics 的 dashboards 会产生 attention sprawl；带四个正确 sections 的一页 report 强迫 reader 注意重要内容。需要更深时，native tools 仍然在那里。

**它和 `STRATEGY.md` 有什么关系？**
First-run interview 会在 `STRATEGY.md` 存在时 seed product name 和 key metrics。Pulse 测量 strategy 说重要的东西，而不是碰巧 instrumented 的东西。没有 strategy doc 时，skill 会 note 并从头 setup。

**支持 scheduling 吗？**
支持。First-run setup 会提供通过 harness available scheduling primitive 设置 recurring pulse 的选项（存在时用 in-plugin `schedule` skill，或 cron/GitHub Actions 等 platform-native options）。Scheduling 永不自动发生；需要 explicit confirmation。

**Non-Claude-Code platforms 呢？**
只要有 read-only data-source tools，skill 就可在任何 platform 上工作。Config 在 runtime resolve：skill 使用 shell tool 运行 `git rev-parse --show-toplevel`，然后读取 config file，因此这里没有 harness-specific 机制。Interview 永不 inline schedule；它 hand off 给 harness 暴露的 scheduling primitive。

---

## 了解更多

"Read like a founder" posture 和 single-page constraint 都是 deliberate。40 metrics dashboards 会产生 attention sprawl；带正确四个 sections 的一页 report 让 reader 关注重要内容。Saved-reports folder 设计为 working memory：past pulses 可 grep、diff、discard。

---

## 另见

- [`ce-strategy`](./ce-strategy.md) - seed pulse 测量的 metrics
- [`ce-ideate`](./ce-ideate.md) - surfaced signals 的常见 follow-up destination
- [`ce-debug`](./ce-debug.md) - pulse surface error patterns 后的常见 follow-up
- [`ce-brainstorm`](./ce-brainstorm.md) - pulse follow-up 需要 scope clarification before fixing 时使用
