---
title: "feat: 为 ce:ideate 添加 issue-grounded ideation mode"
type: feat
status: complete
date: 2026-03-16
origin: docs/brainstorms/2026-03-16-issue-grounded-ideation-requirements.md
---

# feat: 为 ce:ideate 添加 issue-grounded ideation mode

## 概览

添加一个 issue intelligence agent，并将其集成到 ce:ideate：当用户 argument 表明希望把 issue-tracker data 作为 input 时，skill 会 fetch、cluster 并 analyze GitHub issues，然后用得到的 themes 驱动 ideation frames。该 agent 在 ce:ideate 之外也可独立使用，用于理解 project 的 issue landscape。

## 问题陈述 / 动机

ce:ideate 当前只基于 codebase context 和 past learnings 进行 ideation。团队的 issue trackers 包含关于真实 user pain、recurring failures 和 severity patterns 的丰富 signal，而这些会被 ideation 漏掉。目标是基于 bug patterns 产生 strategic improvement ideas（"invest in collaboration reliability"），而不是 individual bug fixes（"fix LIVE_DOC_UNAVAILABLE"）。

（参见 brainstorm: docs/brainstorms/2026-03-16-issue-grounded-ideation-requirements.md -- R1-R9）

## 提议方案

两个 deliverables：

1. **New agent**：`issue-intelligence-analyst` in `agents/research/` -- 通过 `gh` CLI fetch GitHub issues，按 theme cluster，并返回 structured analysis。可 standalone 使用。
2. **ce:ideate modifications**：从 arguments 检测 issue-tracker intent，作为第三个 Phase 1 scan dispatch agent，并使用 hybrid strategy 从 issue clusters 派生 Phase 2 ideation frames。

## 技术方案

### Deliverable 1：Issue Intelligence Analyst Agent（Issue intelligence 分析 agent）

**文件**: `plugins/compound-engineering/agents/research/ce-issue-intelligence-analyst.agent.md`

**Frontmatter（元数据）:**
```yaml
---
name: issue-intelligence-analyst
description: "Fetches and analyzes GitHub issues to surface recurring themes, pain patterns, and severity trends. Use when understanding a project's issue landscape, analyzing bug patterns for ideation, or summarizing what users are reporting."
model: inherit
---
```

**Agent methodology（按执行顺序）:**

1. **Precondition checks** -- 按顺序 verify，任何 failure 都 fail fast 并给出 clear message：
   - 当前目录是 git repo
   - 存在 GitHub remote（prefer `upstream` over `origin` 以处理 fork workflows）
   - `gh` CLI is installed
   - `gh auth status` succeeds

2. **Fetch issues** -- priority-aware，minimal fields（不取 bodies、不取 comments）：

   **Priority-aware open issue fetching（感知优先级的 open issue 抓取）:**
   - 首先 scan available labels 检测 priority signals：`gh label list --json name --limit 100`
   - 如果存在 priority/severity labels（例如 `P0`、`P1`、`priority:critical`、`severity:high`、`urgent`）：
     - 先 fetch high-priority issues：`gh issue list --state open --label "{high-priority-labels}" --limit 50 --json number,title,labels,createdAt`
     - 再用 remaining issues backfill 到最多 100 total：`gh issue list --state open --limit 100 --json number,title,labels,createdAt`（deduplicate already-fetched）
     - 这确保 500-issue repo 中的 50 个 P0 总会被 analyze，而不会埋在 100 个最近 P3 之下
   - 如果没有 priority labels，按 recency（default `gh` sort）fetch up to 100：`gh issue list --state open --limit 100 --json number,title,labels,createdAt`

   **Recently closed issues（最近关闭的 issues）:**
   - `gh issue list --state closed --limit 50 --json number,title,labels,createdAt,stateReason,closedAt` -- client-side filter 到 last 30 days，排除 `stateReason: "not_planned"`，以及 labels 匹配 common won't-fix patterns（`wontfix`、`won't fix`、`duplicate`、`invalid`、`by design`）的 issues

3. **First-pass clustering** -- 核心 analytical step。把 issues 分组为代表 **systemic weakness 或 user pain areas** 的 themes，而不是 individual bugs。这是 agent output 有价值的原因。

   **Clustering approach（聚类方法）:**
   - labels 存在时，将它们作为 strong clustering hints（例如 `subsystem:collab` group collaboration issues）。当 labels 缺失或不一致时，按 title similarity 和 inferred problem domain cluster。
   - 按 **root cause 或 system area** cluster，而不是 symptom。proof repo 示例：25 个提到 `LIVE_DOC_UNAVAILABLE` 的 issues 和 5 个提到 `PROJECTION_STALE` 的 issues 是 symptoms -- theme 是 "collaboration write path reliability." 在 system level cluster，而不是 error-message level。
   - 跨多个 themes 的 issues 应放入 primary cluster 并注明 cross-reference，而不是在 clusters 间 duplicate。
   - 相关时区分 issue sources：bot/agent-generated issues（例如 `agent-report` label）通常与 human-reported issues 有不同 signal quality。记录每个 cluster 的 source mix -- 25 个 agent reports、0 个 human reports 的 theme，与 5 个 human reports、2 个 agent reports 的 theme 不同。
   - 分开 bugs 与 enhancement requests。两者都是 valid input，但代表不同 signal（current pain vs. desired capability）。
   - 目标 3-8 themes。少于 3 表示 issues 太 homogeneous 或 repo issues 太少。多于 8 表示 clustering 太 granular -- merge related themes。

   **What makes a good cluster（好 cluster 的标准）:**
   - 命名 systemic concern，而不是 specific error 或 ticket
   - product 或 engineering leader 会把它识别为 "an area we need to invest in"
   - 在 strategic level actionable（能驱动 initiative，而不只是 patch）

4. **Sample body reads** -- 对每个 emerging cluster，使用 individual `gh issue view {number} --json body` calls 读取 2-3 个 representative issues（most recent 或 most reacted）的 full body。用这些来：
   - 确认 cluster grouping 正确（titles can be misleading）
   - 理解 symptoms 背后的 actual user/operator experience
   - 识别 metadata 中没有捕获的 severity 和 impact signals
   - surface 已讨论的 proposed solutions 或 workarounds

5. **Theme synthesis** -- 对每个 cluster 输出：
   - `theme_title`: 简短 descriptive name
   - `description`: pattern 是什么，以及它对 system 发出什么 signal
   - `why_it_matters`: user impact、severity distribution、frequency
   - `issue_count`: 该 cluster 中 issue 数量
   - `trend_direction`: increasing/stable/decreasing（比较该 cluster 中 last 30 days opened vs closed）
   - `representative_issues`: top 3 issue numbers with titles
   - `confidence`: high/medium/low，基于 label consistency 和 cluster coherence

6. **Return structured output** -- themes 按 issue count descending 排序，附 summary line，包含 total issues analyzed、cluster count 和 date range covered。

**Output format（returned to caller，返回给调用方的输出格式）:**

```markdown
## Issue Intelligence Report

**Repo:** {owner/repo}
**Analyzed:** {N} open + {M} recently closed issues ({date_range})
**Themes identified:** {K}

### Theme 1: {theme_title}
**Issues:** {count} | **Trend:** {increasing/stable/decreasing} | **Confidence:** {high/medium/low}

{description — what the pattern is and what it signals}

**Why it matters:** {user impact, severity, frequency}

**Representative issues:** #{num} {title}, #{num} {title}, #{num} {title}

### Theme 2: ...

### Minor / Unclustered
{Issues that didn't fit any theme, with a brief note}
```

该 format human-readable（standalone use），同时足够 structured 供 orchestrator consumption（ce:ideate use）。

**Data source priority（数据源优先级）:**
1. **`gh` CLI（preferred）** -- 最可靠，适用于所有 terminal environments，无 MCP dependency
2. **GitHub MCP server**（fallback）-- 如果 `gh` unavailable 但连接了 GitHub MCP server，改用其 issue listing/reading tools。clustering logic 相同；只有 fetch mechanism 改变。

如果两者都不可用，按 precondition checks gracefully fail。

**Token-efficient fetching（节省 token 的抓取策略）:**

agent 作为 sub-agent 运行，有自己的 context window。fetch 到的每个 issue data token 都会和 clustering reasoning 所需空间竞争。Minimize input，maximize analysis。

- **Metadata pass（all issues）:** 只 fetch clustering 所需 fields：`--json number,title,labels,createdAt,stateReason,closedAt`。省略 `body`、`comments`、`assignees`、`milestone` -- 它们昂贵，且 initial grouping 不需要。
- **Body reads（samples only）:** clusters 出现后，每个 cluster 用 individual `gh issue view {number} --json body` calls fetch 2-3 个 representative issues 的 full bodies。每个 cluster 选择 most reacted 或 most recent issue。
- **永远不要 bulk fetch all bodies。** 100 个 issue bodies 很容易在任何 analysis 开始前消耗 50k+ tokens。

**Tool guidance（工具指导）**（per AGENTS.md conventions）：
- 使用 `gh` CLI fetch issues（一次一个 simple command，不 chaining）
- 使用 native file-search/glob 做任何 repo exploration
- 使用 native content-search/grep 做 label 或 pattern searches
- 不要用 `&&`、`||`、`;` 或 pipes 链接 shell commands

### Deliverable 2：ce:ideate Skill Modifications（ce:ideate skill 修改）

**文件**: `plugins/compound-engineering/skills/ce-ideate/SKILL.md`

四个 targeted modifications：

#### Mod 1：Phase 0.2 -- 添加 issue-tracker intent detection

在现有 focus context 和 volume override interpretation 后，添加第三个 inference：

- **Issue-tracker intent** -- 检测用户何时希望 issue data 作为 input

detection 使用与现有 volume hints 相同的 "reasonable interpretation rather than formal parsing" approach。对 intent 明确指向 issue/bug analysis 的 arguments trigger：`bugs`、`github issues`、`open issues`、`issue patterns`、`what users are reporting`、`bug reports`。

不要对仅作为 focus 提到 bugs 的 arguments trigger：`bug in auth`、`fix the login issue` -- 这些是 focus hints。

当与其他 dimensions 组合时（例如 `top 3 bugs in authentication`）：先 parse issue trigger，再 parse volume override，remainder 是 focus hint。focus hint 缩小相关 issues；volume override 控制 survivor count。

#### Mod 2：Phase 1 -- 添加第三个 parallel agent

向 Phase 1 parallel dispatch 添加第三个编号项：

```
3. **Issue intelligence** (conditional) — if issue-tracker intent was detected in Phase 0.2,
   dispatch `compound-engineering:research:issue-intelligence-analyst` with the focus hint.
   If a focus hint is present, pass it so the agent can weight its clustering.
```

更新 grounding summary consolidation，加入独立 **Issue Intelligence** section（区别于 codebase context），使 ideation sub-agents 能区分 code-observed 与 user-reported pain points。

如果 agent 返回 error（gh not installed、no remote、auth failure），向用户 log warning（"Issue analysis unavailable: {reason}. Proceeding with standard ideation."），并继续现有 two-agent grounding。

如果 agent 返回少于 5 个 total issues，注明 "Insufficient issue signal for theme analysis"，并继续 default ideation。

#### Mod 3：Phase 2 -- Dynamic frame derivation（动态 frame 派生）

在现有 frame assignment（step 8）前添加 conditional logic：

当 issue-tracker intent active 且 issue intelligence agent 返回 themes：
- 每个 `confidence: high` 或 `confidence: medium` 的 theme 成为一个 ideation frame。frame prompt 使用 theme title 和 description 作为 starting bias。
- 如果 cluster-derived frames 少于 4 个，用 default frames 按顺序 padding："leverage and compounding effects"、"assumption-breaking or reframing"、"inversion, removal, or automation of a painful step"（这些与 issue-grounded themes 最互补，能推动超出 reported problems）
- 最多 6 个 total frames（若 themes 超过 6 个，使用按 issue count 排序的 top 6；remaining themes 进入 grounding summary 的 "minor themes"）

当 issue-tracker intent NOT active：existing behavior unchanged。

#### Mod 4：Phase 0.1 -- Resume awareness（恢复感知）

检查 recent ideation documents 时，将 issue-grounded 与 non-issue ideation 视为 distinct topics。当当前 argument 表明 issue-tracker intent 时，不应提供已有 `docs/ideation/YYYY-MM-DD-open-ideation.md` 作为 resume candidate；反之亦然。

### 变更文件

| 文件 | 变更 |
|------|--------|
| `agents/research/issue-intelligence-analyst.md` | **New file** -- agent 本体 |
| `skills/ce-ideate/SKILL.md` | **Modified** -- 4 个 targeted modifications（Phase 0.1, 0.2, 1, 2） |
| `.claude-plugin/plugin.json` | **Modified** -- increment agent count，add agent to list，update description |
| `../../.claude-plugin/marketplace.json` | **Modified** -- update description with new agent count |
| `README.md` | **Modified** -- add agent to research agents table |

### 未变更

- Phase 3（adversarial filtering）-- unchanged（不变）
- Phase 4（presentation）-- unchanged，survivors already include a one-line overview（不变，survivors 已包含一行 overview）
- Phase 5（artifact）-- unchanged，grounding summary 自然包含 issue context
- Phase 6（refine/handoff）-- unchanged（不变）
- 不修改其他 agents
- 不新增 skills

## 验收标准

- [ ] New agent file exists at `agents/research/issue-intelligence-analyst.md`，并带有 correct frontmatter
- [ ] Agent handles precondition failures gracefully（no gh、no remote、no auth），并给出 clear messages
- [ ] Agent handles fork workflows（处理 fork workflows；prefers upstream remote over origin）
- [ ] Agent uses priority-aware fetching（使用 priority-aware fetching；scans for priority/severity labels, fetches high-priority first）
- [ ] Agent 将 fetching 限制在 100 open + 50 recently closed issues
- [ ] `gh` CLI 不可用但 GitHub MCP 已连接时，Agent falls back to GitHub MCP
- [ ] Agent 将 issues cluster 成 themes，而不是 individual bug reports
- [ ] Agent 读取每个 cluster 的 2-3 个 sample bodies 用于 enrichment
- [ ] Agent output includes theme title, description, why_it_matters, issue_count, trend, representative issues, confidence（输出包含这些 structured fields）
- [ ] Agent 被直接 dispatch 时也 independently useful（not just as ce:ideate sub-agent）
- [ ] ce:ideate detects issue-tracker intent from arguments like `bugs`, `github issues`（从这类 arguments 检测 issue-tracker intent）
- [ ] ce:ideate 不会在 `bug in auth` 这类 focus hints 上 trigger issue mode
- [ ] ce:ideate 在触发时 dispatches issue intelligence agent as third parallel Phase 1 scan
- [ ] agent 失败时，ce:ideate falls back to default ideation with warning
- [ ] ce:ideate 从 issue clusters 派生 ideation frames（hybrid: clusters + default padding）
- [ ] ce:ideate caps at 6 frames, padding with defaults when < 4 clusters（最多 6 个 frames；少于 4 个 clusters 时用 defaults 补齐）
- [ ] 在 proof repo 运行 `/ce:ideate bugs` 会从 25+ LIVE_DOC_UNAVAILABLE variants 产生 clustered themes，而不是 25 个 separate ideas
- [ ] Surviving ideas 是 strategic improvements，而不是 individual bug fixes
- [ ] plugin.json, marketplace.json, README.md updated with correct counts（更新为正确 counts）

## 依赖与风险

- **`gh` CLI dependency**: agent 需要安装并认证 `gh`。通过 graceful fallback to standard ideation 缓解。
- **Issue volume**: 数千 issues 的 repos 可能产生 noisy clusters。通过 fetch cap（100 open + 50 closed）和 frame cap（6 max）缓解。
- **Label quality variance**: 没有 structured labels 的 repos 依赖 title/body clustering，可能产生 lower-confidence themes。通过 confidence field 和 sample body reads 缓解。
- **Context window**: Fetch 150 issues + read 15-20 bodies 可能在 agent context 中消耗大量 tokens。通过 metadata-only initial fetch 和 sample-only body reads 缓解。
- **Priority label detection**: 没有 standard naming convention。通过 scan available labels 并匹配 common patterns（P0/P1、priority:*、severity:*、urgent、critical）缓解。没有 priority labels 时 fallback 到 recency-based fetching。

## 来源与参考

- **Origin brainstorm（来源 brainstorm）:** [docs/brainstorms/2026-03-16-issue-grounded-ideation-requirements.md](docs/brainstorms/2026-03-16-issue-grounded-ideation-requirements.md) -- Key decisions: pattern-first ideation, hybrid frame strategy, flexible argument detection, additive to Phase 1, standalone agent
- **Exemplar agent（示例 agent）:** `plugins/compound-engineering/agents/research/ce-repo-research-analyst.agent.md` -- agent structure pattern
- **ce:ideate skill:** `plugins/compound-engineering/skills/ce-ideate/SKILL.md` -- integration target（集成目标）
- **Institutional learning（机构经验）:** `docs/solutions/skill-design/compound-refresh-skill-improvements.md` -- impact clustering pattern, platform-agnostic tool references, evidence-first interaction
- **Real-world test repo（真实测试 repo）:** `EveryInc/proof`（555 issues，25+ LIVE_DOC_UNAVAILABLE duplicates，structured labels）
