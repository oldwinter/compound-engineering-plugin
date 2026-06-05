---
date: 2026-03-16
topic: issue-grounded-ideation
---

# ce:ideate 的 Issue-Grounded Ideation Mode

## 问题框架

当 team 想对改进进行 ideate 时，issue tracker 中包含丰富 signal：真实 user pain、反复出现的 failures 和 severity patterns。但 ce:ideate 当前只查看 codebase 和 past learnings。Teams 必须先手动 synthesize issue patterns，再进行 ideation；或者在缺少 context 的情况下 ideate，从而错过用户实际遇到的问题。

目标不是 “fix individual bugs”，而是 “generate strategic improvement ideas grounded in the patterns your issue tracker reveals”。关于同一 failure mode 的 25 个 duplicate bugs 是 collaboration reliability 的 signal，不是 25 个 separate problems。

## 需求

- R1. 当用户 argument 表示他们想把 issue-tracker data 作为 input 时（例如 “bugs”、“github issues”、“open issues”、“what users are reporting”、“issue patterns”），ce:ideate 在 existing Phase 1 scans 旁边激活 issue intelligence step
- R2. 新增 **issue intelligence agent**，负责 fetch、cluster、deduplicate 和 analyze issues，返回 structured theme analysis——不是 individual issues list
- R3. agent fetch **open issues** 加 **recently closed issues**（约 30 天），过滤掉作为 duplicate、won't-fix 或 not-planned 关闭的 issues。Recently fixed issues 也包含在内，因为它们显示哪些 areas 有足够 pain 值得行动。
- R4. Issue clusters 使用 **hybrid strategy** 驱动 Phase 2 的 ideation frames：从 clusters 派生 frames，当 clusters 少于 4 个时，用 default frames（例如 “assumption-breaking”、“leverage/compounding”）补齐。这确保 ideas 基于真实 pain patterns，同时保持 ideation diversity。
- R5. existing Phase 1 scans（codebase context + learnings search）仍 parallel 运行——issue analysis 是 additive context，不是 replacement
- R6. issue intelligence agent 从 current directory 的 git remote 检测 repository
- R7. v1 从 GitHub issues via `gh` CLI 开始。设计 agent prompt 和 output structure，使 Linear 或其他 trackers 后续可以加入，而不需要重构 ideation flow。
- R8. issue intelligence agent 在 ce:ideate 外部也应独立有用——用户或其他 workflows 可以直接 dispatch 它来 summarize issue themes、理解 current landscape，或对 recent activity 做 reasoning。它的 output 应 self-contained，不与 ideation-specific context 耦合。
- R9. agent output 必须在 **theme level** 沟通，而不是 individual-issue level。每个 theme 应表达：pattern 是什么、为什么重要（user impact、severity、frequency、trend direction），以及它对 system 发出什么 signal。output 应帮助 human 或 agent 不读取 individual issues 也能完全理解每个 theme 的重要性和形态。

## 成功标准

- 在一个有 noisy/duplicate issues 的 repo（例如 proof 的 25+ LIVE_DOC_UNAVAILABLE variants）上运行 `/ce:ideate bugs`，会产生 clustered themes，而不是 individual issues 的复述
- surviving ideas 是 strategic improvements（“invest in collaboration reliability infrastructure”），不是 bug fixes（“fix LIVE_DOC_UNAVAILABLE”）
- issue intelligence agent 的 output 足够 structured，让 ideation sub-agents 能 meaningful 地处理 themes
- Ideation quality 至少与 default mode 一样好，并额外获得 issue grounding 的收益

## 范围边界

- v1 只支持 GitHub issues（Linear 是 future extension）
- 不做 issue triage 或 management——这是用于 ideation input 的 read-only analysis
- 不改变 Phase 3（adversarial filtering）或 Phase 4（presentation）——只影响 Phase 1 和 Phase 2 frame derivation
- issue intelligence agent 是新的 agent file，不是修改 existing research agent
- agent 设计为 ce:ideate 组合使用的 standalone capability，而不是 ideation-internal module
- 假设环境中 `gh` CLI 可用且已 authenticated
- 当 repo issues 太少，无法 meaningful cluster（例如 open+recent 少于 5 个）时，agent 应报告这一点，ce:ideate 应 fallback 到 default ideation，并向用户说明

## 关键决策

- **Pattern-first, not issue-first**：output 是基于 bug patterns 的 improvement ideas，不是 prioritized bug list。ideation instructions 已经防止 “just fix bug #534” thinking。
- **Hybrid frame strategy**：clusters 派生 ideation frames，当 signal 稀薄时用 defaults 补齐。纯 cluster-derived frames 可能太少；纯 default frames 可能忽略 issue signal。
- **Flexible argument detection**：使用 intent-based parsing（“reasonable interpretation rather than formal parsing”），与现有 volume hint system 保持一致。不要 rigid keyword matching。
- **Open + recently closed**：包含 recently fixed issues 能提供更丰富 pattern data——显示哪些 areas 曾值得行动，而不只是当前坏掉了什么。
- **Additive to Phase 1**：issue analysis 作为第三个 parallel agent，与 codebase scan 和 learnings search 并行运行。三者都进入 grounding summary。
- **Titles + labels + sample bodies**：读取所有 issues 的 titles 和 labels（便宜），然后读取每个 emerging cluster 的 2-3 个 representative issues 的 full bodies。这同时处理 well-labeled repos（labels 驱动 clustering，bodies confirm）和 poorly-labeled repos（bodies 驱动 clustering）。避免读取所有 bodies，因为 scale 上 expensive。

## 待决问题

### 延后到 Planning

- [Affects R2][Technical] issue intelligence agent 应返回什么 structured output format？可能是 theme clusters，包含：theme name、issue count、severity distribution、representative issue titles 和 one-line synthesis。
- [Affects R3][Technical] 如何通过 `gh` CLI 检测 GitHub close reasons（completed vs not-planned vs duplicate）？可能需要 `gh issue list --state closed --json stateReason` 或 label-based filtering。
- [Affects R4][Technical] “too few clusters” 的 threshold 是多少？当前想法是少于 4 个 clusters 时用 default frames 补齐，但可能需要 tuning。
- [Affects R6][Technical] 如何从 git remote 提取 GitHub repo？使用 standard `gh repo view --json nameWithOwner`，或 parse remote URL。
- [Affects R7][Needs research] Linear integration 会是什么样？只是替换 fetch mechanism，还是 Linear 的 project/cycle structure 会改变 clustering approach？
- [Affects R2][Technical] 每个 cluster 要读取的 sample bodies 精确数量（starting point：每 cluster 2-3 个）。

## 下一步

→ `/ce:plan` 进行 structured implementation planning
