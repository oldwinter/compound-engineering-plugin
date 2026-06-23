---
name: ce-product-pulse
description: "生成一个带时间窗口的 pulse 报告，说明用户体验到了什么以及产品表现如何：使用情况、质量、错误和值得调查的信号。当用户说 'run a pulse'、'show me the pulse'、'how are we doing'、'weekly recap'、'launch-day check'，或传入 '24h'、'7d' 这类时间窗口时使用。通过 .compound-engineering/config.local.yaml 配置，并将报告保存到 docs/pulse-reports/。"
argument-hint: "[回看窗口，例如 '24h'、'7d'、'1h'；默认 24h]"
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
---

# Product Pulse（产品 Pulse）

`ce-product-pulse` 会针对给定时间窗口查询产品的数据源，并生成一份紧凑的单页报告，覆盖使用情况、性能、错误和 followup。报告保存到 `docs/pulse-reports/`，关键点会在聊天中呈现。

这个 skill 不会修改产品、数据库或任何外部系统。它唯一的写入是追加到 `.compound-engineering/config.local.yaml` 的 pulse 设置（统一的 CE 本地配置，gitignored，machine-local），以及报告文件（`docs/pulse-reports/...`）。MCP 和其他数据源工具只能以只读方式调用；如果某个工具提供写入模式，不要使用。

## 交互方式

默认使用平台的阻塞式提问工具：Claude Code 中的 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`）、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中不存在阻塞工具，或调用报错（例如 Codex edit modes）时，才退回到聊天中的编号选项；不要仅因为需要加载 schema 就退回。绝不能静默跳过问题。

一次只问一个问题。multi-select 只留给首次配置。

## 回看窗口

<lookback> #$ARGUMENTS </lookback>

将参数解释为时间窗口。常见形式：

- `24h`、`48h`、`72h` - 向前回看的小时数
- `7d`、`30d` - 向前回看的天数
- `1h` - 短窗口（发布期间很有用）

如果参数为空，默认使用配置中的 `pulse_lookback_default`（在 Phase 0 解析）；如果它也未设置，则回落到硬默认值 `24h`。如果参数无法解析，请用户澄清。

对窗口上界应用 **15 分钟 trailing buffer**。许多 analytics 和 tracing 工具有摄取延迟；直接查询到 `now` 会低估最近事件。对于 `24h` 窗口，查询 `[now - 24h - 15m, now - 15m]`。

## 核心原则

1. **像 founder 一样阅读。** 不使用硬编码阈值。默认不要把事情标成“bad”或“good”，呈现数字，让读者判断。
2. **单页。** 目标是 30-40 行终端输出。如果报告变长，就删减。
3. **保存的报告中不包含 PII。** 写入磁盘的报告不要包含用户邮箱、账号 ID 或消息内容。
4. **能并行则并行，关键处串行。** Analytics 和 tracing 查询并行运行。数据库查询串行运行，以避免负载。
5. **通过保存报告形成记忆。** 每次运行都写入 `docs/pulse-reports/`，这样过去的 pulse 可以作为 timeline 浏览。
6. **数据库访问只能只读。** 如果数据库被用作数据源，连接必须是只读的。interview 拒绝接受读写凭据。数据库访问是可选的；很多产品只靠 analytics 和 tracing 就能完成 pulse。
7. **可用时由 strategy 播种。** 如果 `STRATEGY.md` 存在，interview 会在提问前读取它，并把产品名和关键指标作为种子带入后续配置。数据源设置的目标，是接上实际衡量这些指标所需的连接。

## 执行流程

### Phase 0：按配置状态路由

**Read config。** Repo root 在 skill load 时 pre-resolved：
!`git rev-parse --show-toplevel 2>/dev/null || true`

如果上方行是 absolute path，将其用作 `<repo-root>`。如果为空，或仍显示 backtick command string（non-Claude harness 没有运行 pre-resolution），则在 runtime 用 shell tool 运行 `git rev-parse --show-toplevel` 解析 `<repo-root>`。然后用 native file-read tool（例如 Claude Code 中的 Read、Codex 中的 read_file）读取 `<repo-root>/.compound-engineering/config.local.yaml`。如果 root 无法解析或文件不存在，视为首次运行。否则提取下方 "Config keys" 中列出的 `pulse_*` keys。

**Config keys（配置键）:**
- `pulse_product_name` -- string，用于报告标题。路由必需：如果未设置，skill 未配置。
- `pulse_lookback_default` -- `1h`、`24h`、`7d`、`30d` 之一（默认：`24h`）
- `pulse_primary_event` -- string，engagement event 名称
- `pulse_value_event` -- string，value-realization event 名称
- `pulse_completion_events` -- 由逗号分隔的 0-3 个 event 名称
- `pulse_quality_scoring` -- `true` 或默认 `false`（仅 AI 产品）
- `pulse_quality_dimension` -- 当 `pulse_quality_scoring` 为 true 时按 1-5 打分的 string；否则忽略
- `pulse_analytics_source` -- 标识 analytics provider 的 string（例如 `posthog`、`mixpanel`、`custom`）
- `pulse_tracing_source` -- 标识 tracing provider 的 string（例如 `sentry`、`datadog`、`custom`）
- `pulse_payments_source` -- 标识 payments provider 的 string（例如 `stripe`、`custom`）；未使用时省略
- `pulse_db_enabled` -- `true` 或默认 `false`；为 `true` 时，只读 DB 访问是 pulse 的一部分
- `pulse_metric_sources` -- 由逗号分隔的 `metric=source` 对，为每个 strategy metric 指定 source override（例如 `retention_d7=posthog,nps=delighted`）。未列出的 Strategy metrics 回落到 `pulse_analytics_source`，并带 `(default source)` 标记渲染，让隐式路由可见。
- `pulse_pending_metrics` -- 由逗号分隔的 strategy-doc metric 名称，表示等待埋点的指标；在 instrumentation 落地前，每份 pulse report 中都渲染为 `no data`
- `pulse_excluded_metrics` -- 由逗号分隔的 strategy-doc metric 名称，表示有意从 pulse 中排除的指标；该指标仍保留在 `STRATEGY.md`，但不会出现在 pulse reports 中

**Routing（路由）:**

- **`pulse_product_name` 未设置（或配置文件缺失）** -> 首次运行。进入 Phase 1（interview），然后进入 Phase 2。
- **`pulse_product_name` 已设置** -> 跳到 Phase 2。

如果参数是 `setup`、`reconfigure` 或 `edit config`，无论配置状态如何，都进入 Phase 1。

### Phase 1：首次运行 Interview

#### 1.0 从 strategy 播种（如果可用）

提问前，使用原生文件读取工具读取 `STRATEGY.md`。如果文件存在，提取：

- YAML frontmatter 中 `name` 键的产品名；如果 frontmatter 缺失，则回退到 H1 标题（去掉末尾的 ` Strategy` 后缀，例如 `# Spiral Strategy` -> `Spiral`）
- `## Key metrics` section 中的关键指标列表，每行一个

开始 interview 时先展示提取结果：说明找到了 strategy doc，展示播种得到的产品名和将带入 event/data setup 的关键指标列表，并邀请用户在继续前修正。

如果 `STRATEGY.md` 不存在，请在聊天中明确说明：当前没有 strategy doc，将从零开始 setup，并提到如果先运行 `ce-strategy`，它之后可以为 pulse 播种。

#### 1.1 Interview（访谈）

读取 `references/interview.md`。这一步不可选：pushback 规则、反模式示例和 metric-to-source 映射逻辑都在里面。

按以下顺序运行 interview：

1. Product name（产品名：确认或编辑播种值）
2. Primary engagement event（主要 engagement event）
3. Value-realization event（价值实现 event）
4. Completions 或 conversions（0-3 个）
5. Quality scoring（质量评分，opt-in，仅 AI 产品）
6. Data sources（数据源）- 为每个已同意的 metric 和 event 接上连接。倾向推荐 MCP。拒绝读写数据库访问。DB 完全可选。
7. System performance（系统性能）- 为 top errors 和 latency 做一段简短的推荐设置。用户很少对此有强烈偏好；呈现默认值并接受。
8. Default lookback window（默认回看窗口）

对每个 section 应用 `references/interview.md` 中的 pushback 规则。把用户提出的每个 metric、event 和 signal 都放到 `references/interview.md` 的 "Overall Rules" 中定义的 **SMART bar**（specific, measurable, actionable, relevant, timely）下判断；对任何模糊、虚荣或不可行动的内容提出 pushback。

如果用户提供读写数据库访问，拒绝并提供 `references/interview.md` 第 6 节记录的替代方案。

将捕获到的配置按 flat `pulse_*` keys 写入 `<repo-root>/.compound-engineering/config.local.yaml`，schema 使用 `references/interview.md` 中 "Config file shape" 下的定义。用 `git rev-parse --show-toplevel` 解析 repo root。写入方式：(1) 如果文件或目录不存在，创建 `.compound-engineering/` 并写入 YAML 文件；(2) 如果文件存在，将新 key 合并进已有 YAML，保留任何非 pulse key（例如 `work_delegate_*`）不变。如果 `.compound-engineering/config.local.yaml` 尚未被 repo 的 `.gitignore` 覆盖，写入前先提出添加该条目。把最终 pulse block 展示给用户，并提供一轮编辑机会。

配置写入后，运行 `references/interview.md` 第 9 节中的 **scheduling recommendation**：提出设置 recurring run，让用户按节奏收到 pulse，而不必记得手动运行。接受 yes/no/later。如果用户选择 yes，交给当前 harness 暴露的 scheduling primitive：如果已安装，则用 plugin 内的 `schedule` skill；否则说明 scheduling 是平台特定的（cron、GitHub Actions、host 自己的 automation），并给出一段简短提示说明需要运行什么。不要 inline schedule。然后进入 Phase 2。

### Phase 2：运行 Pulse

如果运行过 Phase 1（首次运行，或参数为 `setup`/`reconfigure`），请使用原生文件读取工具从 repo root 重新读取 `.compound-engineering/config.local.yaml`，以吸收 Phase 1 review step 中接受的任何编辑。否则，使用 Phase 0 已提取的 `pulse_*` 值。对任何未设置项应用硬默认值（见 Phase 0 的 "Config keys"）。

#### 2.1 分发查询

以下查询以 **并行** 方式运行（不同工具，无共享负载）：

- 窗口内的 product analytics query（primary event count、value-realization count、completions、conversion ratios）
- 窗口内的 application tracing query（按类别统计的错误数、latency distribution、top error signatures）
- 如果已配置，运行窗口内的 payments query（new customers、churn、revenue delta）

在并行批次之后，以下查询以 **串行** 方式运行：

- Read-only database queries。一次一个。只做紧凑、限定范围的查询。绝不要对大表做 full-table scan。如果某个 DB query 代价很高，跳过并注明 "DB query skipped (estimated cost too high)"。

#### 2.2 可选：Sample Quality Scoring

如果 `pulse_quality_scoring` 为 `true`（仅 AI 产品），从窗口内采样最多 10 个 sessions 或 conversations，并按 `pulse_quality_dimension` 记录的维度为每个样本打 1-5 分。

**Scoring discipline：** 当 session 看起来正常时，默认给 4 或 5。1-3 分留给具有明确 failure mode 的 session（产品给出错误答案、用户卡住、错误浮现）。如果每个 session 都是 3 分，标准太严；如果每个 session 都是 5 分，标准太松。

**score summary 中不包含 PII。** 记录一个 count distribution（例如 "8x 5, 1x 4, 1x 2"），并对任何低于 4 分的 session 写一条简短匿名说明。保存的报告中不要包含消息内容或用户标识符。

#### 2.3 组装报告

读取 `references/report-template.md`。用查询结果填充模板。四个 section，顺序如下：

1. **Headlines** - 用 2-3 行总结窗口
2. **Usage（使用情况）** - primary engagement、value realization、completions、quality sample
3. **System performance** - latency（p50/p95/p99）和按数量排序的 top 5 errors，每个错误一行说明
4. **Followups** - 1-5 件值得调查的事

总长度保持在 30-40 行。如果某个 section 信息少，就保持简短；不要填充。

#### 2.4 写入报告

使用运行时本地时间，保存到 `docs/pulse-reports/YYYY-MM-DD_HH-MM.md`。如果 `docs/pulse-reports/` 不存在，创建它。

在聊天中展示 Headlines 和最重要的 Followup。提供完整文件路径，让用户可以打开保存的报告。

### Phase 3：Routine Hook（例行 hook）

首次 setup 已经提供过 scheduling（见 Phase 1.1 末尾）。Phase 3 是面向 ad-hoc run 的轻量提醒：

- 如果参数是已知 schedule keyword（`daily`、`hourly`、`weekly`），说明本次运行是 ad-hoc，并建议通过 harness 可用的 primitive（如果存在，则使用 plugin 内的 `schedule` skill；否则使用 platform-native 选项）设置 recurring runs。
- 如果没有记录 schedule，且这是用户第三次或更晚的 pulse run，提醒一次 scheduling 可用。不要每次都提醒。

绝不要自动 schedule。任何 scheduling handoff 都需要明确确认。

## 这个 Skill 不做什么

- 不报告 "what shipped"。已发布的工作存在于 issue tracker 和 commit history 中，不在这里。Pulse 严格关注用户体验和系统性能。
- 不设置阈值，也不向用户告警。由读者解释。
- 不在保存的报告中持久化 PII。
- 不修改数据库或任何外部系统。所有查询都是只读的。
- 不替代 tracing dashboards 或 analytics tools。它整合的是一次单页阅读；深度调查仍使用原生工具。

## 了解更多

"read like a founder" 的姿态和单页约束都是刻意设计的。包含 40 个指标的 dashboards 会让注意力发散；一页、四个正确 section 会迫使读者注意真正重要的东西。saved-reports 文件夹被设计为团队 working memory，而不是 data warehouse：过去的 pulses 可 grep、可 diff，也可以丢弃。
