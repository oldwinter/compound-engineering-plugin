# Product Pulse First-Run Interview（首次运行访谈）

由 `SKILL.md` 在 Phase 1 开始时加载。捕获将以 `pulse_*` keys merge 进 `.compound-engineering/config.local.yaml` 的 configuration（统一 CE local config，gitignored，machine-local），并在每次后续运行中重新读取。

对每个 section：提出 opening question，根据 quality bar 评估答案；当答案落入 named anti-pattern 时 push back；并用用户自己的语言捕获最终答案。

## Overall Rules（总体规则）

1. **Push back, but don't spiral（反推但不打转）。** 每个 section 最多一轮 pushback。如果第二次答案仍不可用，捕获用户给出的内容，在 config 中标记为 `needs-review`，然后继续。
2. **Name events in the user's own words（用用户自己的话命名事件）。** config 会被整个团队阅读；使用他们实际使用的术语，而不是 generic template。
3. **Ask about tools, not credentials（问工具，不问凭证）。** interview 捕获使用*哪个* tool 以及*什么 query shape*。不收集 API keys、tokens 或 database passwords。这些留在用户 environment 中。
4. **Honor strategy seeds（尊重 strategy seeds）。** 如果 `SKILL.md` Phase 1.0 从 `STRATEGY.md` surface 了 product name 或 key metrics list，以它们作为 defaults，并让用户编辑。不要重复询问 strategy doc 已明确回答的问题。
5. **Evaluate metrics against the SMART bar（按 SMART bar 评估 metrics）。** 用户提出的每个 event、metric 和 signal 都应是：
   - **Specific** - named event 或 named metric，不是 category。`message_sent` 通过；"engagement" 不通过。
   - **Measurable** - 你能指出返回数字的 tool 和 query。"Users like it" 不通过；"NPS score from Delighted" 通过。
   - **Actionable** - 如果数字变化，team 知道下一步做什么。"Daily active users" 单独通常不通过；将其与 conversion 或 retention signal 配对，surface 一个 decision。
   - **Relevant** - 关联到 product 的 target problem 和 persona（如果从 strategy doc seeded，则来自那里）。不连接 strategy 的 generic funnel metrics 可疑。
   - **Timely** - 在 pulse window（24h、7d 等）中读取，并反映 current state。只按季度变化的 lagging metrics 不属于 daily pulse。

   当用户提出的 metric 未通过其中一项时，通过命名具体 dimension 进行 push back："这听起来更像 vanity metric，而不是 actionable metric - 如果它变化了，我们会做什么？有没有更紧、更能驱动决策的 signal？" 不要对用户使用 "SMART" 一词；用 plain-English question。

---

## 1. Product Name（产品名称）

**Opening question（开场问题）：**

- 如果来自 strategy seed："Strategy 中的 product name 是 `{{name}}`。保留还是编辑？"
- 否则："这个 product 叫什么？"

无需 pushback。逐字捕获。

---

## 2. Primary Engagement Event（主要参与事件）

**Opening question（开场问题）：** "当有人正在使用你的 product 时，会触发哪一个单一 event？也就是能说明用户此刻处于 active 状态的那个 event。"

这是 pulse 的 heartbeat。选择一个 event：代表用户实际使用 product，而不是打开页面。

**Apply the SMART bar（应用 SMART bar）**（见 Overall Rules）。event 必须 specific（named event）、measurable（analytics tool 返回 count）、actionable（它变化时 team 会注意）、relevant（关联 product job）、timely（能在 short windows 中干净读取）。

**Engagement vs value test（参与 vs 价值测试）。** 用户命名 event 后，问自己：该 event 是在用户*使用* product 时触发，还是在用户已经*得到 value* 时触发？Engagement 更早（他们正在里面）。Value 更晚（它起效了）。如果 candidate 实际上是 value-realization，push back："这听起来像 product 已经对他们*起效*的时刻。更早发生的 event 是什么 - 也就是他们正在使用 product 的过程中？Value event 放在 section 3。" 常见 slips：`agent_accepted_draft`（value）vs `agent_received_draft`（engagement）；`ride_completed`（value）vs `ride_started`（engagement）；`question_answered_correctly`（value）vs `question_asked`（engagement）。

**Anti-patterns and pushback（反模式与反推）：**

- **Page view or visit**（"pageview"、"app opened"、"login"）-> "这些说明有人来了。我找的是说明他们确实*使用了* product 的 event。用户在做 product 本来要解决的那件事时，会触发什么？"
- **Multiple events with no clear primary**（"well, it could be X or Y or Z depending on the flow"）-> "对于 pulse，选最接近 '用户正在 active 使用 core product' 的那一个。如果两个 candidate 真的并列，选用户*用时间交换 value* 时发生的那个 - 对 async products 来说，这通常是 'contributed content'，而不是 'opened app'。"
- **Too deep in the funnel**（"purchase_completed"）-> "那是 conversion event - 我们会单独捕获。对于 primary engagement event，更早发生什么 - 也就是他们正在使用 product，而不是已经 converted 的时候？"
- **Vague**（"interaction"、"activity"）-> "你的 analytics tool 中有具体 event name 吗？我想写下 literal event name，让它可重复查询。"

**Capture:** Event name verbatim（例如 `message_sent`、`document_edited`、`ride_started`）。再加一行说明其含义。

---

## 3. Value-Realization Event（价值实现事件）

**Opening question（开场问题）：** "当用户真正得到 value - 也就是 product 交付了他们来这里要的东西时，会触发什么 event？"

不同于 engagement。Engagement 表示 "they're using it"；value-realization 表示 "they got what they wanted"。有些 products 区分清晰（engagement: `typed_in_box`; value: `got_useful_answer`）；另一些则是同一 event（engagement: `ride_requested`; value: `ride_completed`）。

**Apply the SMART bar（应用 SMART bar）。** 这里的 bar 相同：specific、measurable、actionable、relevant、timely；proxy test 尤其重要，因为 value-realization 常常被感受到，而不是被 fired。

**Anti-patterns and pushback（反模式与反推）：**

- **Same as engagement event, accidentally** -> "这和你给我的 engagement event 是同一个吗？如果是，没问题 - 有些 products 一个 event 同时覆盖二者。要确认这一点，还是有一个更晚的 signal 能说明 '这个用户得到了他们来这里要的东西'？"
- **Revenue event**（"purchase"）-> "Purchase 是 conversion event - 我们会单独捕获。对于 value-realization，我找的是用户知道 product 对他们起效的那个时刻，通常早于 payment，或与 payment 分离。"
- **Value is a feeling, not an event**（"they feel like the team aligned"、"they trust the output"）-> "这是真实的，但 pulse 不能直接测量 feeling。有什么相关的 proxy event？常见 patterns：completion event（workflow finished）、time-to-first-X metric（从打开到 output 的秒数）、short-window return rate（第二天回来）、copy/share/export event（把 output 带进真实工作）。选最接近那个 feeling 的一个。"
- **Can't name one** -> "这也很有用。如果没有 discrete event，是否有 session 或 workflow *completion* 可以替代？比如 '他们完成了打开 product 时想做的任务'。如果没有，我们会把 engagement 作为 value proxy，并在 config 中注明。"

**Capture:** Event name verbatim，或带 note 的 `same-as-engagement`，或带 note 的 `not-defined`。

---

## 4. Completion or Conversion Events（完成或转化事件）

**Opening question（开场问题）：** "有没有值得跟踪的 conversion 或 completion events - signups、upgrades、trial starts、purchases？"

Optional section。通常是 0-3 events。

**Apply the SMART bar（应用 SMART bar）**（见 Overall Rules）。每个 conversion event 都应关联一个 decision：如果 `trial_started` 变化 ±20%，team 会做什么？如果答案是 "nothing"，该 event 就是 vanity metric，不应进入 pulse。

**Anti-patterns and pushback（反模式与反推）：**

- **Long list**（"we have 12 of them"）-> "选最能推动 business 的 top 3。其他项想看时可以 ad-hoc query；pulse 保留 top 3。"
- **Non-actionable conversion**（"email_opens"、"logo_impressions"）-> "如果这个数字波动，我们会做什么？如果答案是 'nothing'，它就是 vanity metric。Funnel 更深处有没有更紧的 signal？"

**Capture:** 0-3 个 event names 的 list，每个带一行 description。

---

## 5. Quality Scoring（可选，AI products）

**Opening question（开场问题）：** "这是一个可以对 conversation 或 session 进行质量评分的 AI product 吗？如果是，我会每次 run 抽样最多 10 个 sessions，并按你定义的 dimension 给每个 session 打 1-5 分。如果不适用，请说 no。"

如果用户 opt in，询问："Sessions 应该按哪个 dimension 评分？（例如 'got to a useful answer'、'response was accurate'、'no hallucinations'。）"

**Pushback（反推）：**

- **Vague dimension**（"quality"、"goodness"、"helpful"、"good response"）-> "具体是哪个质量轴？这个 dimension 应该是人类看 transcript 后能稳定判断的东西。"
- **Multiple dimensions**（"accurate AND actionable"）-> "先从一个开始。之后可以编辑 config 添加 dimensions。保持一个 dimension 能让不同 runs 的 scores 可比较。现在更重要的是哪个？"
- **Reviewability test（可复核性测试）** - 用户命名 dimension 后，静默应用该检查：两个 separate reviewers 看同一 session 时，能否同意 score？如果不能，push back 一次："我们把它收紧一点 - 什么会让 reviewer 给 5 分而不是 3 分？如果你能用一句话说出区别，这个 dimension 就足够紧。" 如果用户能回答，将其作为 scoring note 与 dimension 一起捕获。如果不能，将 dimension 标记为 `needs-review` 并继续。

**Capture:** opt-in（yes/no）、dimension（如果 opted in）、scoring note（区分 5 和 3 的一句话）、scoring discipline reminder（"default to 4-5; reserve 1-3 for clear failures"）。

---

## 6. Data Sources（数据源）

**Opening framing（开场 framing）：** "现在我们把真正报告这些 events 和 metrics 所需的 connections 接起来。目标是覆盖上面所有内容的最小 sources 集合 - 一个 source 也可能足够。我们逐个 metric 走一遍。"

### 6.0 Build the metric-to-source list（建立 metric 到 source 的列表）

编译需要 source 的完整 signals list：

- The primary engagement event（section 2 中的主要参与事件）
- The value-realization event（section 3 中的价值实现事件；如果不同于 engagement）
- Each completion/conversion event（section 4 中的每个完成/转化事件）
- Each key metric carried from the strategy doc（如果 strategy 已 seeded，则包含 strategy doc 带来的每个 key metric）

对每个 entry，问一个问题："`{{event or metric}}` 存在哪里？请说出 tool 名称（例如 Mixpanel、PostHog、Amplitude、Stripe、internal DB），以及 agent 应如何 query 它。"

答案会产生（tool name、query shape）。如果多个 entries 落在同一 tool 中，将它们合并为一个 source entry。

**Persist per-strategy-metric source mapping（持久化每个 strategy metric 的 source mapping）。** 对每个 source 不同于 default 的 strategy metric（analytics-class metrics 默认 `pulse_analytics_source`，revenue/payments-class metrics 默认 `pulse_payments_source` 等），在 `pulse_metric_sources` 中将 override 记录为 `metric=source` pair。示例：如果 `pulse_analytics_source` 是 `posthog`，但 `nps` 在 Delighted 中捕获，则写入 `pulse_metric_sources: "nps=delighted"`。source 匹配 class default 的 strategy metrics 不需要 entry。没有此 mapping 时，multi-source setups 会在多次运行之间静默丢失 per-metric routing。

**Dual-source arbitration（双 source 仲裁）。** 如果单个 signal 可由两个不同 sources 回答（例如 PostHog 和 read-only DB replica 都有 search events），选择一个作为 canonical 并在 config 中命名。询问："`{{source A}}` 和 `{{source B}}` 都能覆盖这个 signal - 哪个是 source of truth？Pulse 对每个 signal 只 query 一个 source，这样不同 runs 之间数字保持一致。" 捕获 canonical source。另一个 tool 仍可用于 ad-hoc investigation，但不 wire into pulse。

**If the user says "we don't have that instrumented yet"（如果用户说“我们还没有埋点”）**（常见于 retention 或 NPS 等 strategy-seeded metrics）：提供两个 off-ramps，让用户选择。

- **Defer（延后）** - 将 metric name append 到 `pulse_pending_metrics`（CSV）。在 instrumentation landing 前，每个 pulse report 中该 metric 渲染为 `no data`。当 metric 重要且 team 会 instrument 它时，这是正确选择。
- **Drop from pulse（从 pulse 中移除）** - 将 metric name append 到 `pulse_excluded_metrics`（CSV）。metric 保留在 `STRATEGY.md` 中，但 pulse 完全跳过它。当 metric 是 aspirational 且短期不会有 data 时，这是正确选择。

不要静默跳过。每个 un-instrumented strategy metric 必须恰好落入 `pulse_pending_metrics`（显示为 `no data`）或 `pulse_excluded_metrics`（从 report 省略）之一。

### 6.1 MCP Nudge（MCP 提醒）

每个 unique source 被命名后，检查 MCP coverage：

1. 使用 tool name 调用 `search_mcp_registry`，查看是否存在 official 或 community MCP。不要凭 memory 猜测。
2. 如果存在且用户已经连接（询问："`{{tool}}` MCP 已经连接了吗？"），在 config 中注明 `using MCP for {{tool}}`。
3. 如果存在但用户尚未连接，建议："`{{tool}}` 有 MCP。连接它是让 agent 每次 run 都能 query 的最快方式 - 我可以调用 `suggest_connectors` 带你走一遍，或者我们可以跳过，我会把 source 记为 `manual - agent will need credentials or another path`。"
4. 如果没有 MCP，捕获 `manual`，并注明 agent 应使用何种 query shape（CLI、API 等）。

不要在本 interview 中 setup MCP connections；那是 separate flow。只记录哪些 tools 有 MCP coverage、哪些没有。

### 6.2 Database Access（可选，仅 read-only）

明确询问："你是否有 read-only database connection，希望 agent 用来读取 DB 中的 signals？只接受 read-only - 我会拒绝 read-write connection。"

**Handling the answer（处理答案）：**

- **"No" or "skip"** -> 捕获 `database: not used` 并继续。DB 完全 optional；许多 products 只从 analytics 和 tracing 报告 pulse。
- **"Yes, read-only"**（read replica、read-only user、row-level-security enforced）-> 捕获 connection shape 和可用 tables。询问 cost："For pulse queries, scans need to be cheap - what indexed columns are available, and are there any tables to avoid?"
- **"Yes, but it's my prod credential"** 或任何 connection 有 write access 的迹象 -> 拒绝："为了安全，pulse 不会 query 具有 write access 的 database，即使你的意图是 read-only。选项是：(a) 设置 read-only replica 或 read-only user，(b) 完全跳过 DB - analytics 通常足够覆盖 pulse。你想选哪个？" 在用户选择 (a) 且 verified read-only scope，或选择 (b) skip 前，不要继续。任何 framing 下都不要捕获 read-write connection。

### 6.3 Consolidated Source List（合并后的 Source 列表）

当每个 signal 都有 source（或被标记为 "covered by analytics above"）时，向用户总结 source list："我们会接入这些 sources：{{sources}}。你关心的 signal 有没有缺 source？"

在 config 中捕获最终 list。至少一个 source 可接受。

**Source-count check（source 数量检查）** - 按 ratio 判断，而不是 absolute count：

- 如果 config 有 3-4 metrics，且每个 source 覆盖 distinct one，3-4 sources 是 floor，不是 warning。不 flag，直接接受。
- 如果 config 有 1-2 metrics 却分散在 4+ sources，setup over-instrumented；flag for review 并询问："我们有 {{N}} 个 sources，但只有 {{M}} 个 metrics。有没有一个 tool 能覆盖其中大部分？"
- 无论 metric count 如何，超过 5 sources 就 flag for review。大量 sources 意味着每次运行都有大量 auth、latency 和 failure modes。

---

## 7. System Performance（系统性能）

**Opening framing（开场 framing）：** "Pulse 的 system performance 部分比较标准 - 大多数 teams 想要的是同一件事：带 context 的 top errors，以及 latency percentiles。除非你有强偏好，我会设置 recommended default。"

**Recommended default（推荐默认值，confirm or override）：**

- **Top errors:** tracing tool 中按 count descending 的 top 5 error signatures。每个 entry 包含 signature 和一行解释，说明其可能含义。
- **Latency:** window 内的 p50、p95、p99，与 prior equal-length window 比较。
- **Tracing tool（追踪工具）:** {{capture tool name if not already named in section 6}}

问一个 confirmation question："保留 recommended setup，还是 customize？"

- **Keep** -> 捕获 defaults。
- **Customize** -> 询问他们想改什么。常见 adjustments："top 3 instead of 5"、"skip latency"、"add a specific error signature to always surface"。接受并记录。

如果 section 6 未命名 tracing tool，询问："你用什么 tool 做 application tracing 和 errors？（例如 Datadog、Sentry、Honeycomb、New Relic。）如果没有可以 skip - 我会从 report 中省略 system performance section。" 跳过也可以；这种情况下 pulse 只报告 usage 和 followups。

**Capture:** tool name（或 "none"）、top-error count（默认 5）、latency opt（默认 on）。

---

## 8. Default Lookback Window（默认回看窗口）

**Opening question（开场问题）：** "未指定 time window 时，默认 lookback window 应该是多少？常见：daily ops 用 24h，weekly review 用 7d，launches 用 1h。"

Capture：单个 default（例如 `24h`）。

---

## 9. Scheduling Recommendation（调度建议）

config 写入并展示给用户后，在 hand back to Phase 2 前提供 scheduling offer。

**Opening framing（开场 framing）：** "Pulses 按固定节奏最有用 - 每天（或每周）一份 report 能捕捉到你否则会错过的 drift。要我设置 recurring run 吗？"

**Ask one question（只问一个问题）：**

- "Yes, daily"（是，每天）- 用户选择时间
- "Yes, weekly"（是，每周）- 用户选择星期几和时间
- "Not now - I'll run it manually"（暂时不要，我会手动运行）
- "Later - remind me after a few manual runs"（稍后，在几次手动运行后提醒我）

**Handling the answer（处理答案）：**

- **Yes（daily or weekly）** -> "我会把这交给 `schedule` skill。确认 time/day 后，它会设置 recurring job。" 不要 inline schedule；明确 hand off 给 `schedule` skill，它是 recurring tasks 的 single source of truth。在 Claude Code 上，这使用 Routines feature。
- **Not now** -> 在 config 中捕获 `schedule: manual`。不 nag。
- **Later** -> 在 config 中捕获 `schedule: ask-again-after-3-runs`。SKILL.md Phase 3 logic 会在 3 次 manual runs 后重新 surface 该 offer。

完全跳过也可以；skill 不需要 schedule 也能工作。但推荐 schedule 是正确 default，因为 pulse 的价值会通过 saved-reports timeline 复利增长；one-off runs 会损失大部分价值。

**Capture:** `schedule: daily | weekly | manual | ask-again-after-3-runs`，如适用，附 time/day。

---

## Config File Shape（配置文件形态）

interview 完成后，将 `pulse_*` block merge 到 `<repo-root>/.compound-engineering/config.local.yaml`。用 `git rev-parse --show-toplevel` resolve repo root。保留 file 中已有的任何 non-pulse keys（例如 `plan_*`）；只添加或更新 `pulse_*` keys。

如果 file 尚不存在，创建 directory 和 file。如果 `.compound-engineering/config.local.yaml` 尚未被 `.gitignore` 覆盖，写入前 offer 添加 entry。

pulse block 使用带 skill prefix 的 flat keys，从而能共享 config file，而不会拥有 unrelated settings：

~~~yaml
# --- Product pulse ---

pulse_product_name: "{{product_name}}"
pulse_lookback_default: {{24h | 7d | 1h | other}}    # default 24h if omitted
pulse_primary_event: "{{event_name}}"
pulse_value_event: "{{event_name}}"                  # may equal pulse_primary_event; omit if not defined
pulse_completion_events: "{{event,event,event}}"     # comma-separated, 0-3 events; omit if none
pulse_quality_scoring: {{true | false}}              # AI products only; default false
pulse_quality_dimension: "{{dimension}}"             # only meaningful when pulse_quality_scoring is true
pulse_analytics_source: {{posthog | mixpanel | custom | omit}}
pulse_tracing_source: {{sentry | datadog | custom | omit}}
pulse_payments_source: {{stripe | custom | omit}}    # omit if not used
pulse_db_enabled: {{true | false}}                   # default false; read-only DB access only
pulse_metric_sources: "{{metric=source,metric=source}}"  # strategy-metric -> source overrides; omit metrics that use the class default (pulse_analytics_source for analytics-class, pulse_payments_source for revenue, etc.)
pulse_pending_metrics: "{{metric,metric}}"           # strategy metrics deferred for instrumentation; render as 'no data'; omit if none
pulse_excluded_metrics: "{{metric,metric}}"          # strategy metrics intentionally not in pulse; omit if none
~~~

**Notes on what is NOT persisted in config（不会持久化到 config 的内容）：**

- **Strategy metrics carried forward**：在 report 中 surface，不作为 config 存储；它们位于 `STRATEGY.md`，每次运行从那里重新读取。
- **Per-source connection details**（URLs、API keys、query specifics）：存在于用户 MCP configuration 中，不在此 config 中。
- **Hardcoded operational settings**（15-minute trailing buffer、top-N error count、p50/p95/p99 latencies、"no PII in reports"、"parallel analytics + tracing, serial DB"）：这些是 skill behavior，不是 user config；它们位于 `SKILL.md` 并保持常量。
- **Schedule cadence**：由 `schedule` skill（或 platform-native cron）处理，不属于 pulse config。pulse skill 只 hand off；不拥有 cadence record。
- **Tracing top-N count and latency on/off**：此版本不可配置。report 始终包含 top 5 errors 和完整 p50/p95/p99 latency。如果真实需求出现，之后再添加 config keys。

写入后，在聊天中向用户 surface 生成的 `pulse_*` block。提供一轮 edits。然后返回 SKILL.md Phase 2。
