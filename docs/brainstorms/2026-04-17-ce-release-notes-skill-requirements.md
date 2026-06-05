---
date: 2026-04-17
topic: ce-release-notes-skill
---

# `ce-release-notes` Skill

## 问题框架

`compound-engineering` plugin 发布频繁——通常每周多次。通过 marketplace 安装 plugin 的用户很难跟上变化：skill renames、新 behaviors、retired commands 或 relevant fixes。release history 已公开存在于 GitHub 上（`EveryInc/compound-engineering-plugin` 的 release-please-generated GitHub Releases），但翻 release pages 来回答 “what happened to the deepen-plan skill?” 这类问题，是用户不会愿意做的摩擦。

此 skill 在 plugin 的 GitHub Releases 之上提供 conversational interface，让用户可以问 “what's new?” 或具体问题，并在不离开 Claude Code 的情况下获得 grounded、version-cited answer。

**Premise note（前提说明）：** 上述 user-pain claim 基于快速 release cadence，而不是 cited support asks 或 telemetry。我们接受 residual risk：如果 conversational-lookup framing 最终弱于 discoverability 或 release-page bookmarking，该 skill 可能 adoption 较低。

## 需求

**Invocation and Modes（调用与模式）**
- R1. Skill 通过 slash command `/ce:release-notes` 调用（匹配 `/ce:plan`、`/ce:brainstorm` 等 sibling skills 使用的 `ce:` namespace convention）。skill directory 是 `plugins/compound-engineering/skills/ce-release-notes/`；SKILL.md `name:` frontmatter field 是 `ce:release-notes`（colon form，不是 dash）——这才会产生 `/ce:release-notes` slash command。（多个 existing `ce-` skills 使用 `name: ce-x`，且不会 slash-invoked；这个 skill 需要 colon form 匹配 R1。）
- R2. Bare invocation（`/ce:release-notes`）返回 recent releases summary。
- R3. Argument invocation（`/ce:release-notes <question or topic>`）返回对用户问题的 direct answer，并基于 relevant release(s)。
- R4. **v1 is slash-only invocation.** SKILL.md frontmatter 设置 `disable-model-invocation: true`，因此只有用户显式输入 `/ce:release-notes` 时 skill 才触发。Auto-invocation 推迟到 possible v2，等 dogfooding 显示用户明确想要 conversational triggering，并且经过 prompt corpus 验证的 gating description 已 validated。

**Data Source（数据源）**
- R5. source of truth 是 `EveryInc/compound-engineering-plugin` 的 GitHub Releases API。**Layered access strategy:** 有 `gh` CLI 时优先使用它（authenticated、consistent JSON output、better error messages、higher rate limits）。当 `gh` 缺失或未 authenticated 时，fallback 到对 `https://api.github.com/repos/EveryInc/compound-engineering-plugin/releases`（或 equivalent paginated endpoint）的 anonymous HTTPS。repo 是 public，因此 anonymous reads 可用；60 req/hr-per-IP unauth'd limit 对该 skill invocation frequency 足够。
- R6. 只考虑带 `compound-engineering-v*` prefix 的 releases。Sibling tags（`cli-v*`、`coding-tutor-v*`、`marketplace-v*`、`cursor-marketplace-v*`）会被过滤掉，即使 `cli` 和 `compound-engineering` 通过 release-please 的 `linked-versions` plugin 共享 version numbers。
- R7. 不做 local caching，不 fallback 到 `CHANGELOG.md` files。始终 fetch live。
- R8. 当**两条** access paths 都失败时（例如 no network、GitHub API outage、anonymous fallback rate-limit exhaustion），skill 必须以 actionable message graceful fail。单独 missing `gh` 不是 failure——skill 静默使用 anonymous fallback。

**Output — Summary Mode（输出：摘要模式）**
- R9. Default window 是最近 10 个 plugin releases。
- R10. Per-release section format：version + publish date + release-please-generated changelog body（已按 `Features`、`Bug Fixes` 等 grouped），只做 minimal trimming——release sizes vary，所以不要强加 uniform highlight count。
- R11. 每个 release section 链接到其 GitHub release URL，方便用户阅读 full notes。

**Output — Query Mode（输出：查询模式）**
- R12. Search window 是最近 20 个 plugin releases——fixed cap，不 expansion。20 个 releases 已经是相当大的 corpus（多周 cadence）。如果在该 window 内找不到 matching content，报告 "not found"，并按 R14 surface GitHub releases page link，让用户可以继续手动搜索。
- R13. **When a confident match is found**，answer 是 direct narrative response，并引用答案来源的 specific release version(s)（例如 “The `deepen-plan` skill was renamed to `ce-debug` in `v2.45.0`”）。包含 cited release 的 link。release body 本身是每个 change 一条 terse one-line conventional-commit bullet，带 linked PR number；对 query-mode synthesis，skill 应 follow linked PR(s)（例如 `gh pr view <N>`），用 richer PR description 为 narrative 提供 grounding，而不只依赖 commit subject。（已对 `v2.65.0`–`v2.67.0` release bodies 和 PR #568 验证。）
- R14. **When no confident match is found**（按 R12 search window 后）**或 answer uncertain**，直接说明，不要猜测——并 surface GitHub releases page link，方便用户进一步调查。

## 成功标准
- 通过 marketplace 安装 plugin 的用户可以运行 `/ce:release-notes`，并立即看到 compound-engineering plugin 最近 shipped 的内容（不是 CLI noise，也不是其他 plugins）。
- 用户可以问 `/ce:release-notes what happened to deepen-plan?`，并获得带 version citation 的 direct narrative answer，不需要打开 browser tab。
- skill 对没有安装 `gh` 的用户也能工作（silent anonymous-API fallback），只有当两条 access paths 都失败时才产生清晰 error。

## 范围边界
- **Out of scope（范围外）：** 覆盖 `cli`、`coding-tutor`、`marketplace` 或 `cursor-marketplace` releases。只 surface `compound-engineering` plugin releases。
- **Out of scope（范围外）：** “What's coming next” / unreleased changes。skill 不窥探 open release-please PR。只 summarize shipped releases。
- **Out of scope（范围外）：** Local caching、CHANGELOG.md parsing，或 GitHub Releases API 之外的任何 source。
- **Out of scope（范围外）：** Per-PR 或 per-commit drill-down *作为 primary user-facing surface*。Query mode 可以 follow PR links 获取 context（按 R13），但 skill 不 browse arbitrary commits，也不把 PR-level navigation 暴露为 separate mode。
- **Out of scope（范围外）：** v1 不支持 window size 或 output format customization flags。Defaults 固定；用户可在 chat 中追问来 drill deeper。

## 关键决策
- **Plugin-only filter (excludes `cli-v*`):** Linked versions 意味着 `2.67.0` bump 可能包含 CLI-only 或 plugin-only changes；同时 surface 两者会 dilute user-facing signal。关心 plugin behavior 的用户不应被迫 mentally filter CLI noise。
- **GitHub Releases over CHANGELOG.md:** GitHub Releases 是 shipped 内容的 authoritative source，不需要 repo checkout 即可访问（多数 plugin 用户没有 checkout），且 release-please-generated body 已经按 markdown grouped，可直接 display。
- **Slash-only invocation in v1 (no auto-invoke):** 当前没有 sibling `ce:*` skill auto-invokes。让它成为第一个，会引入难以 validate 的 gating problem（skill description 是唯一 lever，failure modes 是 silent：要么在无关 projects 的 “what's new?” prompts 上触发，要么在真正 CE-shaped questions 上不触发）。Slash-only 同时满足两个 stated user journeys（`/ce:release-notes` bare summary 和 `/ce:release-notes <question>`），且无 gating risk。Auto-invoke 推迟到 possible v2，等 dogfooding 显示 conversational triggering 确实需要，并存在经过测试的 gating description。
- **Layered data access (`gh` preferred, anonymous public API fallback):** repo 是 public，因此 anonymous reads 可用，60 req/hr unauth'd limit 远高于该 skill invocation frequency。分层意味着没有安装 `gh` 的用户仍能获得价值，而不是被 “install gh and retry” message 拦住。有 `gh` 时优先使用它，以获得 cleaner error handling、consistent JSON output 和 authenticated rate limits。
- **No local caching:** `gh release list` 很快（metadata 约 1s；bodies 有一些成本），release queries 不频繁；caching 会增加 carrying cost（invalidation、`.context/` location），却没有 meaningful payoff。reversal cost 低——如果真实 latency 或 frequency problem 出现，之后可添加 caching。
- **Two-mode design instead of always-query:** bare-invocation summary 服务 casual “what have I missed?” use case，它与 “what specifically happened to X?” 有实质区别。一个 skill 通过干净的 argument convention 覆盖两者。
- **Distinct from the existing `changelog` skill:** plugin 已 ship 一个 `changelog` skill，用于生成 recent activity 的 witty daily/weekly changelog summaries。它服务的是另一种 use case（work 的 narrative recap），不同于本 skill 针对 shipped GitHub Releases 的 version-aware release-notes lookup。二者 complementary，不 redundant。

## 依赖与假设
- 用户有 **either** `gh` CLI（preferred path）**or** 到 `api.github.com` 的 outbound HTTPS access（anonymous fallback path）。按 R5，missing `gh` alone 不是 failure。
- 60 req/hr anonymous limit 是 per source IP，不是 per user。使用 shared NAT egress 的用户（corporate networks、VPN exit nodes）原则上可能集体耗尽 budget，即使 individual usage 很低。鉴于 skill invocation pattern，我们接受其为 low-likelihood；若实践中出现，鼓励 `gh auth login`，而不是添加 caching。
- repo `EveryInc/compound-engineering-plugin` 仍是 canonical source。（如果 plugin 移动 repos，skill 中 hardcoded repo reference 必须更新。）
- release-please 继续使用 `compound-engineering-v*` tag prefix 和 conventional-commit-grouped release body format。release-please configuration 变化可能破坏 R6 或 R10。

## 待决问题

### 延后到 Planning
- [Affects R10][Technical] summary 是否应对 individual release bodies 施加 maximum-length cap（区别于 R10 的 no-uniform-highlight-count rule），避免单个 30-bullet release 主导 summary view？实现期间根据真实 release sizes 决定。
- [Affects R8][Technical] 当两条 access paths 都失败时的 exact failure messages（network down、GitHub outage、anonymous rate-limit hit）。确保 actionable（指向 GitHub releases URL 作为 manual fallback）。
- [Affects R5][Technical] anonymous fallback 的 implementation choice：shell out 到 `curl` + `jq`，还是使用其他 HTTP client。根据 cross-platform portability requirements 决定（注意：AGENTS.md 的 “Platform-Specific Variables in Skills” rules 适用，因为此 skill 会转换到 Codex/Gemini/OpenCode）。
- [Affects R13, R14][Technical] 定义 gate R13（direct narrative answer）vs. R14（say-so-plainly）的 “confident match” criterion。选项包括对 release bodies 做 keyword/substring match、通过 embedding 做 semantic match，或使用带 explicit confidence prompt 的 LLM judgment。planning 期间按 cost 和 accuracy tradeoffs 决定。
- [Affects R4][Needs research] 如果/当 v2 auto-invoke 被重新考虑，定义真实 gate。由于 v1 没有可观察的 auto-invoke surface，“dogfooding shows users want it” 按当前写法不可证伪——v2 trigger 需要 concrete source of evidence（explicit user requests、带 telemetry 的 opt-in beta flag，或 stated time-box for revisiting）。
- [Affects R5][Technical] repo reference（`EveryInc/compound-engineering-plugin`）应 hardcoded 在 skill 中，还是从 `.claude-plugin/plugin.json`（`homepage`/`repository` field）派生以提升 portability？Hardcoding 更简单；derivation 可在未来 repo move 时避免 skill edits。planning 期间按 portability vs. complexity tradeoff 决定。
- [Affects R10][Technical] Release-please body format drift handling：R10 假设 `Features`/`Bug Fixes` markdown grouping。决定是 (a) 如果 release-please config changes 则接受 silent degradation，(b) defensive parse 并 fallback to raw rendering，还是 (c) detect drift 并 surface warning。Low priority——release-please config 一直稳定。

## 下一步
- `/ce:plan docs/brainstorms/2026-04-17-ce-release-notes-skill-requirements.md` for structured implementation planning.
