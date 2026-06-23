# Tracker Detection and Defer Execution（Tracker 检测与 Defer 执行）

本 reference 说明如何将 residual actionable findings 提交到项目 tracker。由 caller workflows 加载（例如 `ce-work` Residual Work Gate，或 `lfg` residual handling）；不由 `ce-code-review` 加载，因为它在报告后停止。

---

## Execution Modes（执行模式）

Tracker-defer 有两种 execution modes。由 caller 选择其中一种；detection、fallback chain 和 ticket composition 共用。

### Interactive mode（Interactive 模式）

当用户选择 file tickets 时，由 `ce-work` Residual Work Gate 以及类似 caller flows 使用。所有 user-facing prompts 都会触发：

- 本 session 中第一次使用 generic（non-named）label 的 Defer，会确认实际 tracker 选择。
- Execution failures 会用 Retry / Fall back to next sink / Convert to Skip 进行 prompt。
- routing question 中的 labels 会反映 `named_sink_available`（命名 tracker）与 fallback generics 的区别。

### Non-interactive mode（Non-interactive 模式）

由 `lfg` 这类不得 prompt 的 autonomous callers 使用。所有 blocking questions 都跳过；fallback chain 按顺序静默执行。行为：

- 第一次 generic-label Defer 不确认；直接继续。
- execution failure 时，不提示，自动 fall to next tier。记录 failure。
- 当整个 chain exhaustion（每个 tier 都失败或没有 sink 可用）时，将 findings 返回到 `no_sink` bucket，让 caller 能 route 到其他 surface（例如 inline 到 PR description 中）。
- 返回结构化结果：`{ filed: [{ finding_id, tracker, url }], failed: [{ finding_id, tracker, reason }], no_sink: [{ finding_id, title, severity, file, line }] }`。

caller 决定如何向用户展示结果。non-interactive mode 将 "no sink available" 视为产生数据的 outcome，而不是 prompt trigger。

---

## Detection（检测）

agent 从显而易见的文档中判断项目 tracker。Primary source：项目 active instructions 和 conventions 已在 context 中；无需打开或点名具体 instruction files。只有当相关 instructions 不在 context 中时才直接读文件：例如负责当前区域的 subdirectory-scoped instruction file，或 fresh subagent 没有拿到项目 instructions。Supplementary signals（当 primary documentation 模糊时）：`CONTRIBUTING.md`、`README.md`、`.github/` 下的 PR templates、repo 中可见的 tracker URLs。

tracker 可以通过 MCP tool（例如 Linear MCP server）、CLI（例如 `gh`）或 direct API 暴露。都可接受。detection output 是一个带有两个 availability flags 的 tuple：一个专门针对 named tracker（驱动 Interactive mode 中的 label confidence），另一个针对完整 fallback chain（驱动是否提供 Defer）：

```
{ tracker_name, confidence, named_sink_available, any_sink_available }
```

含义：
- `tracker_name` — human-readable name（"Linear"、"GitHub Issues"、"Jira"），或当 detection 无法识别具体 tracker 时为 `null`
- `confidence` — 当 tracker 在文档中明确命名（或通过指向特定 project/workspace 的 linked URL 指明）且无歧义地是项目 canonical tracker 时为 `high`；当信号薄弱、冲突或仅暗示时为 `low`
- `named_sink_available` — 仅当 agent 能实际调用检测到的 tracker（MCP tool 已加载、CLI 已认证，或 API credentials 位于 environment）时为 `true`；当 tracker 已记录但没有 tool 可达，或完全未找到 tracker 时为 `false`。驱动 label confidence：inline tracker naming 要求它为 `true`。
- `any_sink_available` — 当 fallback chain 中任一 tier（named tracker 或通过 `gh` 的 GitHub Issues）可在本 session 中调用时为 `true`。驱动 Interactive mode 中是否提供 Defer，也驱动 Non-interactive mode 中的 `no_sink` bucket。

Detection 是 reasoning-based。不要维护枚举式待读文件 checklist。读取显而易见的 sources 并形成可靠结论；当 obvious sources 无法 resolve 时，label 回退到 generic wording，并由 agent 在执行前向用户确认（仅 Interactive mode）。

---

## Probe timing and caching（探测时机与缓存）

Availability probes **每个 session 最多运行一次**，且**仅在 Defer execution 即将发生时**运行。绝不在 review start 时投机运行，绝不 per-Defer，绝不 per-walk-through-finding。cached tuple 会复用于同一次运行中的每个 Defer action。

典型 probe sequence：

1. Consult 项目 context 中已有 instructions 查找 tracker references；不要打开或点名具体 instruction files。只有当相关 instructions 不在 context 中时才直接读文件（subdirectory scope，或 fresh subagent）。如果没有找到，设置 `tracker_name = null`、`confidence = low`。
2. **当找到 named tracker 时 probe 它。** 对 GitHub Issues，运行 `gh auth status` 和 `gh repo view --json hasIssuesEnabled`。对 Linear 或其他 connector/MCP-backed trackers，先通过平台 tool-discovery primitive（例如 Claude Code 中的 `ToolSearch`）发现可用 tools，不要因为 unloaded tool 不存在就假定缺失；然后确认发现的 tool 响应。对 API-backed trackers，在平台暴露 credentials 的位置验证（environment、connector auth 或 documented secrets location），而不只看 shell env vars。根据 probe result 设置 `named_sink_available`。
3. **Probe GitHub Issues fallback 以计算 `any_sink_available`。** 即使 named tracker 已找到并 probe，`gh` 对 `no_sink` bucket decision 仍重要，这样在没有 documented tracker 但 `gh` 可用的运行中仍会提供 Defer。
   - 如果 `named_sink_available = true`：`any_sink_available = true`（不需要进一步 probes）。
   - 否则，通过 `gh auth status` + `gh repo view --json hasIssuesEnabled` probe GitHub Issues（如果 step 2 已 probe，则跳过）。如果可用，`any_sink_available = true`。
   - 否则，`any_sink_available = false`。

当 Interactive mode 的 routing question 被完全跳过时（R2 zero-findings case），不运行 probes。当 cached tuple 在 session 中复用时，session 第一次 probe 得到的任何 `named_sink_available = true` 都保持 cached；不要 per Defer 重新 probe。

---

## Label logic（label 逻辑，Interactive mode）

- 当 `confidence = high` 且 `named_sink_available = true`：routing question 的 option C 和 walk-through 的 per-finding Defer option 都逐字包含 tracker name。例如：`File a Linear ticket per finding`、`Defer — file a Linear ticket`。
- 当 `any_sink_available = true`，但 `confidence = low` 或 `named_sink_available = false`（实际使用 fallback tier）时：labels 使用 generic 表述：`File an issue per finding`、`Defer — file a ticket`。在本 session 第一次执行 Defer 前，agent 使用平台 blocking question tool 向用户确认实际 tracker 选择。
- 当 `any_sink_available = false`：routing question 省略 option C，walk-through per-finding options 省略 option B（Defer），并且 agent 在 routing question stem 中告诉用户原因。

Non-interactive mode 完全跳过 label decisions；它会对检测到的 sink 静默执行。

---

## Fallback chain（兜底链路）

当 named tracker 不可用或没有命名 tracker 时，按此顺序 fall back。优先使用项目检测到的 tracker；仅当未找到 named tracker 或 named tracker 不可达时才使用 `gh`。

1. **Named tracker**（agent 可直接调用的 MCP tool、CLI 或 API，由上方 Detection 识别）
2. **GitHub Issues via `gh`** — 当 `gh auth status` 成功且当前 repo 已启用 issues（`gh repo view --json hasIssuesEnabled` 返回 `true`）时
3. **No sink** — findings 保留在 review report 的 residual-work section（Interactive mode），或返回到 `no_sink` bucket 供 caller route（Non-interactive mode）。agent 不通过 transient surface 重新展示它们。

以前该 chain 包含第三个 in-session fallback tier。该 tier 已移除，因为 in-session tasks 不能跨 session 存活，因此不满足 Defer action 的 "durable filing" 意图。当不存在 durable tracker 时，正确行为是将 findings 留在 report 中（Interactive），或返回给 caller（Non-interactive）。

---

## Ticket composition（Ticket 组成）

每个 Defer action 都会创建一个 ticket，内容如下，并根据 tracker capabilities 调整：

- **Title（标题）：** merged finding 的 `title`（schema 上限 10 words）。
- **Body（正文）:**
  - Plain-English problem statement — 从 contributing reviewer 的 artifact file `/tmp/compound-engineering/ce-code-review/<run-id>/{reviewer}.json` 读取 persona-produced `why_it_matters`，使用与 agent mode 相同的 `file + line_bucket(line, +/-3) + normalize(title)` 匹配（见 SKILL.md Stage 6 detail enrichment）。当没有 artifact match 可用时，回退到 merged finding 的 `title`、`severity`、`file` 和 `suggested_fix`（如存在）；这些字段在 merge-tier compact return 中有保证。
  - Suggested fix（当 finding 的 `suggested_fix` 中存在时）。
  - Evidence（来自 reviewer artifact 的 direct quotes）。
- Metadata block（元数据块）: `Severity: <level>`, `Confidence: <score>`, `Reviewer(s): <list>`, `Finding ID: <fingerprint>`。
- **Labels（标签）**（当 tracker 支持 labels 时）：severity tag（`P0`、`P1`、`P2`、`P3`），以及当 tracker convention 支持时，从 reviewer name 派生 category label。
- **Length cap（长度上限）：** 当 composed body 会超过 tracker body length limit 时，用 `... (continued in ce-code-review run artifact: /tmp/compound-engineering/ce-code-review/<run-id>/)` 截断，并在 truncated body 和 metadata block 中都包含 finding_id，方便找到 artifact。

finding_id 是 stable fingerprint，由 `normalize(file) + line_bucket(line, +/-3) + normalize(title)` 组成；与 merge pipeline 使用的 fingerprint 相同。

---

## Failure path（失败路径）

当 ticket creation 在 execution 时失败（API error、auth expiry mid-session、rate limit、malformed body rejected、4xx/5xx response）：

**Interactive mode:** inline 展示 failure，并使用平台 blocking question tool 询问用户。

Stem（问题开头）:
> Defer failed: <tracker name> returned <error summary>. How should the agent handle this finding?（Defer 失败：<tracker name> 返回 <error summary>。agent 应如何处理这个 finding？）

Options（选项）:
- `Retry on <tracker>` — 对同一个 tracker 再尝试一次（适合 transient errors）
- `Fall back to next sink` — 将此 finding 的 Defer 移到 fallback chain 中的 next tier（例如从 Linear 到 GitHub Issues）
- `Convert to Skip — record the failure` — 放弃此 Defer，在 completion report 的 failure section 记录该 failure，并继续 walk-through 或 bulk flow

**Non-interactive mode:** 不要 prompt。自动 fall through 到 next tier。如果每个 tier 都失败，将 finding 记录到 structured return 的 `failed` bucket 并继续。如果 chain exhausted 且从未有 sink 可用，finding 最终进入 `no_sink` bucket。

当 high-confidence named tracker 在 execution 时失败，cached `named_sink_available` 会在本 session 剩余时间内设为 `false`。后续 Defer actions 直接 fall through 到 next tier，不再 retry 已确认 broken 的 sink。只有当每个 tier 都被确认 broken 时，`any_sink_available` 才降级为 `false`；一次失败的 Linear call 若通过 `gh` 成功，则保持 `any_sink_available = true`。

只有当 `ToolSearch` 明确返回 no match 或 tool call 报错，或平台没有 blocking question tool 时，才回退到编号选项并等待用户回复（仅 Interactive mode）。

---

## Per-tracker behavior（按 tracker 的行为）

execution 时每个 tracker 的具体行为。agent 可通过适当 interface（MCP、CLI 或 API）调用其中任意一种；选择取决于当前 environment 中可用的内容。

| Tracker | Interface | Invocation sketch | Body format | Labels |
|---------|-----------|-------------------|-------------|--------|
| Linear | MCP (preferred) or API | 在文档识别出的 project/workspace 中创建 issue；如果 MCP tool 暴露 user context，则 assign 给 reporter | Markdown | 如果 MCP 暴露 severity priority field，则使用它；否则在 body 中包含 severity |
| GitHub Issues | `gh issue create` | Repo 默认使用当前 repo。当 labels 存在时用 `--label` 写入 severity tag；如果 repo 没有 label fixture，则省略 `--label`。首次失败后回退到无 label issue。 | Markdown | labels 存在时使用 `--label P0` / `--label P1` / 等 |
| Jira | MCP or API | 在文档识别出的 project 中创建 issue；Jira 的 markdown dialect 不同于 GitHub；当 MCP 不处理转换时，在 body 中使用 plain text | 当 MCP 不处理 markdown 时使用 plain text | Severity priority field |
| No sink available | — | Interactive: 省略 Defer option，findings 留在 report 的 residual-work section。Non-interactive: findings 返回到 `no_sink` bucket 供 caller routing。 | — | — |

不确定时，优先选择“drop 并给出明确 user-facing notice”，而不是“静默传递并寄希望于没问题”。一个既不产生 durable artifact、也没有 user message 的 Defer 就是 data loss。

---

## Cross-platform notes（跨平台说明）

question-tool 名称因平台而异。在 Interactive mode 中，使用平台 blocking question tool（Claude Code 中的 `AskUserQuestion`、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension））。在 Claude Code 中，该 tool 应已由 Interactive-mode pre-load step 加载；如果没有，现在用 query `select:AskUserQuestion` 调用 `ToolSearch`。只有当 harness 真正缺少 blocking tool 时，才回退到聊天中的编号选项：`ToolSearch` 返回 no match、tool call 明确失败，或 runtime mode 未暴露它（例如没有 `request_user_input` 的 Codex edit modes）。pending schema load 不是 fallback trigger。绝不要静默跳过问题。

Non-interactive mode 是 platform-agnostic：它永不 prompt，所以平台 question tool 不相关。
