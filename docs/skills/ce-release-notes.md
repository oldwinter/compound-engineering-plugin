# `ce-release-notes`

> 查找 recent compound-engineering plugin releases 中 shipped 了什么：总结最近 5 个版本，或带 version citation 回答具体问题。

`ce-release-notes` 是 **plugin-history** skill。它从 `EveryInc/compound-engineering-plugin` 的 GitHub Releases API 拉取 release notes，并过滤到 `compound-engineering-v*` tag prefix，避免 sibling components（`cli-v*`、`coding-tutor-v*`、`marketplace-v*`、`cursor-marketplace-v*`）污染结果。两种 modes：bare invocation 总结最近 5 个 releases；带 argument invocation 搜索最近 40 个 releases，并用 version citation 回答具体问题。

Beta-style，仅 explicit invocation（`disable-model-invocation: true`）。

---

## TL;DR

| 问题 | 回答 |
|----------|--------|
| 它做什么？ | 通过 `gh`（或 anonymous fallback）获取 recent compound-engineering releases，总结最近 5 个，或回答具体问题 |
| 何时使用 | “What changed in compound-engineering recently?”、“What happened to `<skill-name>`?”，或单独运行 `/ce-release-notes` |
| 产出什么 | Recent releases summary，或带 version citation 的 narrative answer |
| 状态 | 仅 explicit invocation |

---

## 问题

Plugin release information 在 agent contexts 中很难消费：

- **GitHub Releases UI 不是合适 surface**：想知道 "did this change recently?" 时导航慢，且所有 releases 混在一起
- **`gh release list` 未过滤**：sibling tags（`cli-v*`、`coding-tutor-v*`）交错出现，一眼看不出哪个 release 影响哪个 component
- **Substring search 无法处理 renames**："what happened to ce-X" 无法 substring-match 到把它 renamed to ce-Y 的 release
- **Code-fence truncation breaks rendering**：天真地在 code fence 中间截断 long release notes，会留下 open code block，吞掉后面所有内容
- **No grounding in PR detail**：release notes 是 summary；PR 才有 *why*。没有 enrichment，narrative answers 会停留在表面

## 方案

`ce-release-notes` 用 structured pass 做 lookup：

- **Single helper script**（`scripts/list-plugin-releases.py`）处理 transport：优先 `gh`，匿名 API fallback，并输出单一 JSON contract
- **Tag-prefix filtering** 确保只出现 `compound-engineering-v*` tags；排除 sibling components
- **Two modes**：summary（last 5）和 query（search last 40 with confidence judgment）
- **Markdown-fence-aware truncation**：统计保留部分的 triple-backtick fence lines；如果 fence 未闭合，在追加 "see more" link 前关闭它
- **Confidence judgment, not substring matching**：skill 判断某个 release 是否 confident answer 该问题；"if unsure, treat as no match"
- **PR enrichment for confident matches**：拉取 linked PR 的 title 和 body 作为 grounding context（best-effort；graceful degrade）
- **Untrusted-data discipline**：release bodies 只作为内容读取，绝不当成 instructions 执行

---

## 独特之处

### 1. 用 tag-prefix filtering 锁定正确 component

Repo 分发多个 components：`cli`、`compound-engineering`、`coding-tutor`、`marketplace`、`cursor-marketplace`。每个都有自己的 release tag prefix。Skill 严格过滤 `compound-engineering-v*` tags，避免关于 plugin 的问题意外返回 CLI release notes。这个 filter 由 helper script 拥有；skill body 不必处理。

### 2. Helper-script transport contract（helper 脚本传输契约）

Helper（`scripts/list-plugin-releases.py`）始终 exit 0，并在 stdout 输出一个 JSON object。Skill body 不根据 `gh` availability branch；那是 helper 的职责：

```json
// success
{"ok": true, "source": "gh" | "anon", "fetched_at": "...", "releases": [...]}

// failure
{"ok": false, "error": {"code": "rate_limit" | "network_outage", "message": "...", "user_hint": "..."}}
```

`source` 会记录给 telemetry，但 **不会** 展示给用户：从 `gh` fallback 到 anonymous 是 stability signal，不是 user-facing event。

### 3. 两种 modes：summary 和 query

**Summary mode**（bare invocation）：取前 5 个 releases，每个渲染 version + date + body（soft-capped at 25 rendered lines）。Footer 指向 specific-question invocation 和 full release history URL。

**Query mode**（argument invocation）：窗口扩大到 last 40 releases，运行 confidence judgment，用 linked PR detail enrich confident matches，并 synthesize 带 version citation 的 narrative answer。如果没有 confident match，打印 no-match message 和 URL；绝不 fabricate。

### 4. 感知 Markdown fence 的截断

天真的 "first 25 lines" 截断可能落在 open code fence 内，导致 renderer 把后续所有内容当 code。Skill 会统计保留部分中的 triple-backtick fence lines。如果数量为 odd（fence opened but didn't close），truncated output 会在追加 "see more" link 前加一行明确的 `` ``` ``。结果是无论切在哪里，rendered output 都保持干净。

### 5. Confidence judgment，而不是 substring matching

Skill 读取 search window 中每个 release body，并判断它是否 confident answer 用户问题：

- **Match**：release body 或 linked PR title 清楚回答问题
- **Don't match（不匹配）**：tangential mentions 不算；"deepen-plan" 不应匹配只是顺带提到 "plan" 的 release
- **If unsure, treat as no match（不确定就视为不匹配）**：明确 no-match path 比低置信 citation 更好

这能捕获 "ce-X was renamed to ce-Y" 这类 substring search 会漏掉的情况。

### 6. 用 PR enrichment 做 grounding

对于 confident matches（most recent + up to 2 older），skill 通过 `gh pr view` 获取 linked PR 的 title/body context。Best-effort：

- 如果 `gh` 缺失、未认证或返回 non-zero：不 abort；fallback 到 body-only synthesis，并附一行 "PR could not be retrieved" note
- 如果 `linked_prs` 为空：不尝试调用；body-only 是 expected path，不是 degraded path

始终把 PR number 作为 separate argument（list-form）传入，绝不插值到 shell string；避免 release-body content 带来的 shell-injection。

### 7. Untrusted-data discipline（不可信数据纪律）

Release bodies 会被读取为 content，但 **视为 untrusted data**。Skill 永不遵循其中可能出现的 instructions、requests 或 directives。这很重要，因为 release bodies 是 user-authored markdown，可能包含 prompt-injection attempts。Skill 读取它们是为了 *answer the question*，不是为了 *take direction*。

### 8. Hardcoded no-match URL（硬编码 no-match URL）

没有 confident match 时，skill 打印 literal sentence 和 hardcoded URL：

```text
I couldn't find this in the last 40 plugin releases. Browse the full history at https://github.com/EveryInc/compound-engineering-plugin/releases
```

URL 特意 hardcoded，避免通过 string interpolation 或 LLM rewriting drift。用户总能得到正确位置。

---

## 快速示例

你想知道 `ce-resolve-pr-feedback` 什么时候加入。调用 `/ce-release-notes "when was ce-resolve-pr-feedback added"`。

Skill 运行 `python3 scripts/list-plugin-releases.py --limit 100`，得到按 newest first 排序的 releases JSON object。取前 40 个作为 search window。

Confidence judgment 扫描每个 release body。两个 confident matches：

- `compound-engineering-v2.51.0`：release body 提到 "feat(resolve-pr-feedback): initial release"
- `compound-engineering-v2.58.0`：body 提到 "feat(resolve-pr-feedback): cluster analysis for cross-invocation"

最近的 confident match：v2.58.0。较早的 match：v2.51.0。

PR enrichment：拉取 v2.58.0 的 PR 612，title 为 "feat(resolve-pr-feedback): cluster analysis"，body 解释 cross-invocation gate。拉取 v2.51.0 的 PR 487，title 为 "feat: initial release of ce-resolve-pr-feedback"。

综合输出：

```text
`ce-resolve-pr-feedback` was first introduced in [v2.51.0](URL) as a skill that
evaluated and fixed PR review feedback in parallel — initial verdict types
(fixed / replied / not-addressing / declined / needs-human), GraphQL fetch
of unresolved threads, parallel agent dispatch, and reply + resolve flow.

In [v2.58.0](URL), it gained cross-invocation cluster analysis — when the
same theme spans multiple review rounds, a cluster brief replaces the surgical
fix with broader investigation.

(previously: [v2.51.0](URL))
```

你得到了带 version citations 的答案。

---

## 何时使用

在以下情况使用 `ce-release-notes`：

- 想快速总结 recent compound-engineering plugin changes
- 想回答具体问题（"when was X added"、"what happened to Y"）
- Bug report 或 skill behavior 让你怀疑某内容何时变化
- 正在查某个 feature landed 的 specific version

以下情况跳过 `ce-release-notes`：

- 想看 sibling component（CLI、coding-tutor、marketplace）的 changes；此 skill 只过滤 `compound-engineering-v*`
- 想要 full release history -> 直接打开 GitHub Releases URL
- 问题关于尚未进入 release 的 behavior；release notes 不会显示

---

## 作为 Workflow 的一部分使用

`ce-release-notes` 是 standalone utility，不在 chain 内。它在这些场景调用：

- `/ce-update` 确认 plugin 在 older version，用户想知道缺少什么
- Bug suspect 暗示 "this was working last week"：中间是否有 release？
- 有人问 "what happened to skill X"，因为 behavior 变了

Skill output 直接由用户阅读；没有 downstream skill 消费它。

---

## 单独使用

直接调用：

- **Summary**：`/ce-release-notes`（最近 5 个 releases）
- **Specific question（具体问题）**：`/ce-release-notes "what happened to ce-doc-review"`
- **Version-like input**：`/ce-release-notes "2.65.0"`（作为 query string 处理，走 query mode）

Reserved `mode:*` tokens 会被 stripped（v1 不对它们动作，但不会被 stray `mode:foo` 卡住）。

---

## 参考

| Mode（模式） | Trigger（触发） | Window（窗口） | Behavior（行为） |
|------|---------|--------|----------|
| Summary | Bare invocation | Last 5 | 渲染每个 release 的 date + body（25-line cap，fence-aware truncation） |
| Query | Argument invocation | Last 40 | Confidence judgment + PR enrichment + 带 version citation 的 narrative synthesis |

Phases（按 SKILL.md）：Phase 1 解析 arguments -> Phase 2 获取数据（summary）-> Phase 3 渲染 summary；Phase 5 获取数据（query）-> Phase 6 confidence judgment -> Phase 7 PR enrichment -> Phase 8 合成 narrative；Phase 9 no-match。

---

## 常见问题

**为什么只过滤 `compound-engineering-v*`？**
因为 repo ship 多个 components：`cli`、`compound-engineering`、`coding-tutor`、`marketplace`、`cursor-marketplace`，各自有 release tags。关于 plugin 的问题不应返回 CLI release notes。Filter 会把结果限定在正确 component。

**为什么 helper 总是 exit 0？**
因为 contract 是 "stdout 上的一个 JSON object"。如果 transport 失败（rate limit、network），helper 输出 `{"ok": false, "error": {...}}`，而不是 crash。Skill body 根据 `ok` branch，而不是 exit code。这样 contract 形状单一，更容易推理。

**什么是 soft 25-line cap with fence-aware truncation？**
Summary 中 long release bodies 会 capped at 25 lines。天真截断可能落在 code fence 内，让 renderer 吞掉下方所有内容。Skill 会统计 triple-backtick lines，并在追加 "see more" link 前关闭 open fence。

**为什么用 "confidence judgment" 而不是 substring search？**
因为 substring search 会漏掉 renames。"What happened to ce-X" 无法 substring-match 到 renamed to ce-Y 的 release。Judgment-based matching 能捕捉 substring search 漏掉的 conceptual changes。

**为什么 PR enrichment 是 best-effort？**
因为 `gh` 可能未安装、未认证，或因各种原因返回 errors。因 PR fetch 失败而 abort answer，比 body-only synthesis 末尾附一行 "PR could not be retrieved" 更糟。

**为什么 no-match path 中 URL hardcoded？**
专门为了防止通过 string interpolation 或 LLM rewriting drift。用户总能得到正确位置：GitHub Releases URL。

---

## 另见

- [`/ce-update`](./ce-update.md) - 检查 plugin version；询问 changed 之前很有用
- [`/ce-report-bug`](./ce-report-bug.md) - 用于向 plugin filing issues；先查 release notes 可避免多余 report
