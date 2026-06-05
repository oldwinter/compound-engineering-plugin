---
date: 2026-04-01
topic: cross-invocation-cluster-analysis
---

# resolve-pr-feedback 的 Cross-Invocation Cluster Analysis

## 问题框架

resolve-pr-feedback skill 的 cluster analysis 当前由两个 signals gate：volume（3+ items）和 verify-loop re-entry（同一次 invocation 内第 2+ pass）。verify-loop signal 实际上已经 dead——它要求 push 和 verify 之间出现新的 review threads，但 automated reviewers 需要几分钟，而 verify 在 push 后几秒内运行。这个 timing gap 让 gate 最好也只是 unreliable；在 automated reviewers 的常见情况下，则不可能触发。

这使 volume 成为唯一有效 gate。skill 错过了 clustering 最初设计要处理的准确场景：reviewer 在多个 rounds 中围绕同一 *class* of problem 发表 feedback，而每轮只有 1-2 个 threads。单独看，没有任何一轮触发 volume gate。但合起来看，存在清晰 recurring pattern——例如 “three separate rounds of feedback all about missing convergence behavior in target writers”。skill 应该后退一步，对 problem class 做 holistic investigation，而不是对每个 instance 打 band-aid。

## 需求

**Detection Signal（检测信号）**

- R1. 用 cross-invocation awareness signal 替代 verify-loop re-entry gate signal。triage 前，skill 检查自己之前是否在同一个 PR 上 resolved threads。它自己的 prior reply comments 就是 evidence。
- R2. 如果存在 prior resolutions，且自上次 resolution 以来出现了新的 unresolved feedback，就构成 re-entry signal——即使只有 1 个 new item。如果没有找到 prior resolutions（first invocation），cross-invocation signal 不触发，processing 继续使用 volume gate 作为唯一 cluster trigger。
- R3. volume gate（3+ items）作为 parallel trigger 保持不变。两个 gates 取 OR：任一触发即运行 cluster analysis。

**Cost Control（成本控制）**

- R9. Cross-invocation detection 不得增加 GraphQL API calls。existing `get-pr-comments` query 应拓宽为在一次 call 中同时返回 unresolved 和 resolved threads（包含 skill replies）。所有 cross-invocation analysis——detection、overlap check、clustering——都在这一次 call 已放入 memory 的 data 上运行。
- R10. Cross-invocation clustering scope 限定为最近 N 个 resolution rounds（不是全部 history）。“round” 指一次 skill invocation 中 resolved 的 threads 集合。这会限制 skill 处理的数据量，不受 PR history length 影响。Planning 应确定合适 N；2-3 rounds 可能足够，因为 recurring patterns 通常出现在 recent history。
- R11. 当 cross-invocation signal 触发但 volume gate 未触发时，skill 先运行 lightweight overlap check：用已 fetch 的 data 比较 new 和 prior threads 的 concern categories 与 file paths。只有当 category 或 spatial overlap 存在时，才 promote 到 full clustering。如果没有 overlap，跳过 clustering，单独处理 new thread(s)。

**Clustering Input（聚类输入）**

- R4. 当 cross-invocation signal 触发且 overlap confirmed（R11）时，cluster analysis 同时考虑 new thread(s) 和最近 N rounds 中 previously-resolved threads 作为 input。这能检测同一 concern category 是否跨 rounds 反复出现。
- R5. previously-resolved threads 与 new threads 一起参与 category assignment 和 spatial grouping，因此 clusters 可以跨 rounds。

**Cross-Invocation Clusters 上的 Resolver 行为**

- R6. 当 cross-invocation cluster 形成时，resolver agent 评估 prior fixes，并应用三种 modes 之一：
  - **Band-aid fixes** — prior fixes 处理了 symptoms，而不是 root cause。作为 holistic fix 的一部分重新检查并可能重做它们。
  - **Correct but incomplete** — prior fixes 在自己的 scope 内是正确的，但 recurring pattern 表明同样问题可能存在于 untouched sibling code 中。保留 prior fixes，修复 new thread，并主动调查该 pattern 是否扩展到尚未被 reviewer flag 的 code。这是 highest-value mode——它能捕获 “three rounds of the same concern category in different files means there are probably more files with the same issue.”
  - **Sound and independent** — prior fixes 充分，new thread 虽然被 clustering 命中但确实无关。只把 prior context 用作 awareness。
- R7. cluster brief XML 增加 `<prior-resolutions>` element，列出 previously-resolved thread IDs 及其 concern categories，并带 reply timestamps（createdAt），以建立跨 rounds 的 ordering，让 resolver agent 拥有完整 cross-round picture。

**Within-Session Verify Loop（会话内验证循环）**

- R8. within-session verify loop（step 8：如果仍有 new threads，则从 step 2 repeat）继续作为 workflow mechanism 运作。同一 session 内 earlier cycles 发布的 replies 会作为 cross-invocation signal 的 prior resolutions，因此 new gate 会自然 subsume old verify-loop re-entry gate。

## 成功标准

- 同一 problem class 在 2+ rounds 中 recurring feedback，即使每轮只有 1-2 threads，也会触发 cluster analysis
- 对一个在同一 concern category 中有 prior resolutions 的 PR，单个 new thread 会产生包含 new 和 old threads 的 cluster brief
- resolver agent 能区分三种 modes：“prior fixes were band-aids, redo holistically”、“prior fixes were correct but incomplete, investigate sibling code” 和 “prior fixes were sound, this is independent”
- Token cost bounded：有 15 个 prior resolution rounds 的 PR，不会比有 3 个 rounds 的 PR 在 clustering 上花更多；multi-round PR 上的 unrelated new feedback 在 lightweight overlap check 后会完全跳过 clustering

## 范围边界

- 没有 persistent state files 或 `.context/` storage——detection 完全依赖 GitHub PR comment history
- 不改变 volume gate threshold 或 cluster spatial grouping rules
- 不改变 resolver agent 处理 standard（non-cluster）threads 的方式
- `get-pr-comments` script 当前只过滤 unresolved threads（`isResolved == false`）。按 R9，该 query 会拓宽为也返回 resolved threads——不是新增 script，只是扩大 existing one 的 filter

## 关键决策

- **Detection via own replies, not persistent state**：通过检查 PR threads 上 skill 自己的 reply comments 检测 prior resolutions。这让 skill 保持 stateless，并避免 `.context/` file management。data 已经 authoritative（GitHub 是 what was resolved 的 source of truth）。
- **Three-mode resolver assessment**：agent 区分 band-aid fixes（redo）、correct-but-incomplete fixes（保留 fixes，investigate sibling code）和 sound-and-independent fixes（仅 context）。"correct but incomplete" mode 是 highest-value case——它把 “three rounds of the same concern in different files” 转化为对 untouched code 中相同 pattern 的 proactive investigation。
- **Cross-invocation signal subsumes verify-loop signal**：within-session cycles 产生的 replies 会算作 prior resolutions，因此 new gate 可以同时处理 cross-session 和 within-session re-entry，不需要 separate verify-loop signal。
- **Bounded lookback, not full history**：Clustering 只考虑最近 N 个 resolution rounds。Recurring patterns 会出现在 recent history 中——如果同一 concern category 出现在最近 2-3 rounds，这就是 signal。再往前看会增加 cost，而没有成比例的价值。
- **Zero additional API calls**：Cross-invocation detection 通过拓宽 filter piggyback 到 existing `get-pr-comments` query 上。所有 analysis——detection、overlap check、clustering——都在 fetched data 上 in-memory 完成。没有新的 GraphQL calls。
- **Two-tier cost control**：lightweight overlap check（R11）防止不必要的 full clustering。多数 multi-round PRs 在后续 rounds 中收到 unrelated feedback；这些会在 cheap metadata comparison 后完全跳过 clustering。只有有证据会找到东西时才运行 full clustering。

## 未决问题

### 延后到 Planning 阶段

- [Affects R1][Technical] skill 应如何识别自己的 prior replies？选项包括检查 authenticated `gh` user、匹配 reply-text pattern，或二者结合。Planning 应检查 existing `resolve-pr-thread` 和 `reply-to-pr-thread` scripts 产出什么，以及什么容易 query。
- [Affects R4][Technical] previously-resolved threads 应如何与 new threads 一起表示在 triage list 中？它们需要 status marker（例如 `previously-resolved`），这样 clustering 可以包含它们，而 dispatch 会跳过不 cluster 的已 resolved threads 的 re-resolution。
- [Affects R9][Technical] existing `get-pr-comments` GraphQL query 每个 thread 返回哪些 fields？Planning 应检查 query 是否已 fetch 足够 data（file path、line range、comment body、author），能在不改变 response shape 的情况下支持 resolved 和 unresolved threads，还是需要添加 fields。
- [Affects R10][Technical] resolution round lookback 的 N 应该是多少？2-3 是 starting hypothesis。Planning 应考虑 typical PR review patterns 和更深 lookback 的边际价值。

## 下一步

-> `/ce:plan` 进行 structured implementation planning
