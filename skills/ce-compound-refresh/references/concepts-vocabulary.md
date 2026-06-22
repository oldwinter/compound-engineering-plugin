# CONCEPTS.md vocabulary rules（词汇规则）

`CONCEPTS.md` 定义在此 codebase 中具有特定含义的词汇，是 `docs/solutions/` 和 AGENTS.md 无需重新定义即可引用的 substrate。文件位于 repo root。Terms 通过两种方式进入：accretion 和 seeding（见下文）；任一路径首次产生 qualifying entry 时创建该文件。

## Terms 如何进入：accretion 和 seeding

两条路径会填充此文件，并覆盖不同 gaps：

- **Accretion** — 某个 learning 暴露了含义并不 obvious 的 term，因此将其定义。这能可靠捕获 *peripheral* terms，因为 friction 会让它们浮现。
- **Seeding** — 某次 run 主动定义其工作区域的 **core domain nouns**。这会捕获 accretion 永远触及不到的 *stable-central* terms：系统围绕其构建的 nouns 很少出错，因此很少出现在 learning 中，但它们恰恰是读者 orient 所需的内容。没有 seeding，文件会填满 peripheral mechanics，却永远不说明项目本身是什么。

### Seed goal（seed 目标）

定义该区域 **declared domain model** 暴露出的、达到 qualifying bar 的 core domain nouns（见 "What earns a slot"）。数量由 codebase 决定：seed 每个真正 qualifies 的 term，不为了凑数量而添加，也不从 declared model 之外拉取内容来膨胀数量。小 domain 产出少量 terms；大 domain 产出更多。边界是 **source**（scope 内区域的 declared domain model：schema、core types、primary models、top-level domain docs，而不是 full-codebase trawl）和 **bar**（同一个 "a new engineer would need this defined" 测试），绝不是固定数量。

### Scope of a seed（seed 范围）

- **Scoped run** — learning capture，或收窄到某个区域的 refresh — 只 seed 该区域的 core nouns，并且只定义它实际对照 code 调查过的 terms。它不会去拿从未接触过的 repo-wide nouns。
- **Repo-wide bootstrap** — 明确的 "create CONCEPTS.md" request — seed 整个项目的 declared domain model。这是唯一会产出 coherent "what is this project" glossary 的路径；scoped run 做不到，也不应假装能做到。

## Be opinionated（明确取舍）

当团队用多个词表示同一概念时，选择最佳词并 retire 其余词。将 retired synonyms 作为 aliases 记录在 entry 上（见 "Per entry"）。Settled distinctions 放到末尾的 Flagged ambiguities。Glossary 不是团队曾经用过的所有词的记录，而是团队 agreed-upon vocabulary。

## The file stands on its own（文件应能独立成立）

每个 entry 都要能向无法访问其他内容的读者解释其 concept：没有 codebase、没有 PR history、没有 architecture meetings、没有 Slack。这排除了：

- Implementation specifics（实现细节：file paths、class names、function signatures、table names、library calls）
- Entries 上的 status fields、dates、owners
- 来自 code 的 examples 或 current-config values：会变化的 specific thresholds、counts 或 enum values。说明 behavior，而不是 number：写 "each skill sets its own actionable threshold"，而不是 "surfaces at 50, fixes at 75."
- 指向 PRs、issues、channels 或 roadmap milestones 的 links
- Version-specific claims（版本特定 claim："currently uses X; migrating to Y"）

`CONCEPTS.md` 内 entries 之间的 cross-references 可以使用，因为它们能 internally resolve。General programming vocabulary（caches、queues、jobs、sessions）和 everyday domain English 也不需要重新定义。但如果某个 entry 依赖另一个 *project-specific* term 才能讲通，那个 term 也必须在这里定义；未定义的 project-specific sibling 本身就是候选新增项。

## What earns a slot（什么值得占一个条目）

当某个 term 在这里的含义足够精确，以至于 new engineer 需要定义才能理解 conversations、tickets 或 code，它就 qualifies。General programming vocabulary 不属于这里，即使用得很多也一样。

## Per entry（单个条目）

Definition 是一句话：该 term 在此 domain 中是什么意思，是什么让它不同于相邻概念。带有 non-obvious behavioral rules（lifecycle、cancellation semantics、ownership invariants）的 term 可以有第二段说明这些 rules，但绝不用于展开 definition 本身。

当存在 retired synonyms 时，在 definition 正下方用 aliases line 列出：*Avoid: Booking, appointment*。Entities 通常比 value types 需要更多深度；status concepts 可能需要 transition notes。

## Relationships（可选）

当 entries 之间的 relationships 承载 load-bearing meaning（ownership、cardinality、跨 entries 的 lifecycle dependencies）时，在文件或 cluster 顶部附近用 `## Relationships` section 捕获它们。当 entries 不依赖 structural context 也能独立成立时，跳过该 section；relationships 只适用于 structure 是 terms meaningful 的一部分的 domains，不是 routine section。

## Organization（组织方式）

按 domain relationship cluster concepts：entities 与其 states，processes 与其 stages，让读者轻松看到 structure。文件较小时 flat list 也可行。随着文件增长重塑结构。

## Flagged ambiguities（文件末尾的歧义记录）

当两个 terms 曾被 interchangeable 使用，而团队已确定 distinction 时，用 one-line note 记录 resolution：*"'account' had been used for both Customer and User — these are distinct."* 此 section 是团队已形成 opinions 的 audit trail。

## 一个 illustrative entry：展示 shape，不是 template

```
## Booking

### Reservation
A future commitment to seat a Party at a specified date and time.
*Avoid:* Booking, appointment

A Reservation owns its Party but does not own a Table — Tables are acquired only when the Party arrives, through a Seating. Lifecycle: Booked, Seated, Completed, No-Show. Cancellation before a Seating is non-destructive; cancellation after a Seating is recorded as a No-Show.

### Party
The guests committed to a Reservation. Each Reservation has exactly one Party. Party size is the count promised at booking, not the count who arrive.

### Table
A physical seating unit with fixed capacity. Tables are shared resources — they do not belong to Reservations and are allocated only on the day-of through Seatings.

### Seating
The act of placing a Party at a Table once the Party arrives. A Reservation has at most one Seating; a Table accumulates many Seatings across its lifetime.
```
