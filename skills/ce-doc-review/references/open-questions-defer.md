# Open Questions Deferral（开放问题延后）

本 reference 定义 Defer action 的 in-doc append 机制。当用户对某个 finding 选择 Defer（来自 walk-through，或来自 bulk-preview Append-to-Open-Questions path）时，会将该 finding 的 entry 追加到被 review 文档末尾的 `## Deferred / Open Questions` section。

仅 Interactive mode。由 `references/walkthrough.md`（per-finding Defer option）和 `references/bulk-preview.md`（routing option C Proceed）调用。

---

## Append flow（追加流程）

### Step 1：Locate or create the Open Questions section（定位或创建 Open Questions section）

扫描文档中是否已有 `## Deferred / Open Questions` heading（对完整 heading text 做 case-sensitive match）。按位置处理：

- **Heading 位于文档末尾（最后一个 `##`-level section）：** 在此 section 内末尾 append new content。
- **Heading 位于文档中部（不是最后一个 `##`-level section）：** 仍在该位置已有 heading 内 append。不要在末尾创建 duplicate；这是用户刻意放置的 section。
- **Heading 不存在：** 在文档末尾创建 `## Deferred / Open Questions`。如果文档有 trailing horizontal-rule separator（`---`）或 trailing footer（table、links section），将新 section 插在其上方。如果文档只有 frontmatter 而没有 body，在 frontmatter block 之后创建 section（不要在 byte 0）。

### Step 2：Locate or create the timestamped subsection（定位或创建带时间戳的 subsection）

在 Open Questions section 内，扫描是否有匹配当前 review date 的 subsection heading：`### From YYYY-MM-DD review`。行为：

- **Subsection 存在：** 向其中 append new entries。同一 review session 中的多个 Defer actions 累积在同一 subsection 下。
- **Subsection 不存在：** 在 Open Questions section 内创建 `### From YYYY-MM-DD review` 作为最后一个 subsection。为可读性，在 heading 前插入一个空行。

Date format：ISO 8601 calendar date（`YYYY-MM-DD`）。如果同一 session 内同一天对同一文档发生多次 reviews，它们仍共享同一 subsection。跨天 same-document reviews 会得到不同 subsections，这是预期行为。

### Step 3：Format and append the entry（格式化并追加 entry）

对每个 deferred finding，append 一个 reader-facing bullet-point entry。Entry 不携带 HTML comment：markdown rendering contract 禁止混入 HTML，而且 Step 4 dedup 需要的每个字段都能从可见 entry text 重建：

```
- **{title}** — {section} ({severity}, {reviewer}, confidence {confidence})

  {why_it_matters}
```

字段来自 finding 的 schema：

- `{title}` — finding 的 title field
- `{section}` — finding 的 section field，保持原样（human-readable）
- `{severity}` — P0 / P1 / P2 / P3
- `{reviewer}` — 产出该 finding 的 persona（dedup 后为 confidence anchor 最高的 persona；若有多个 co-flagging personas，则全部 surface）
- `{confidence}` — integer anchor（`50`、`75` 或 `100`），不带小数点或百分号
- `{why_it_matters}` — 完整 why_it_matters 文本，保留 subagent template 中的 framing guidance

不要在 appended entry 中包含 `suggested_fix` 或完整 `evidence` array。它们位于 review run artifact 中（如适用），不属于文档的 Open Questions section；entry 是给稍后返回的读者看的 concern summary，不是完整 decision packet。

### Step 4：Idempotence on compound-key collisions（compound-key 冲突时保持幂等）

如果同一 `### From YYYY-MM-DD review` subsection 下已存在相同 compound key 的 entry，不要 append duplicate。这可能发生在：

- 同一 review session 将同一 finding 第二次 re-route 到 Defer（少见，但可能通过 walk-through Defer 后的 best-judgment-the-rest 发生）
- orchestrator 在 partial failure 后 retry

**Compound key for dedup:** `normalize(section) + normalize(title) + why_fingerprint`。三者都从 visible entry 重建，因此不需要 hidden metadata：

- `normalize(section)` 和 `normalize(title)` 使用与 synthesis step 3.3 dedup 相同的 normalization（lowercase、strip punctuation、collapse whitespace）。对于新 finding，从 schema 计算；对于 existing entry，从 rendered bullet 中解析 `{title}`（bold leader）和 `{section}`（em-dash 与 opening `(` 之间的 text）。
- `why_fingerprint` 是 entry 的 `{why_it_matters}` prose 的前约 120 chars，保留 word-boundary，并将任何连续 whitespace 折叠为单个空格。因为 why_it_matters 会逐字渲染到 entry 中，retry 或 reread 时可以从 visible bullet 重新计算同一个 fingerprint。当 why_it_matters 为空时，仅回退到 `normalize(section) + normalize(title)`。

Title-only dedup 不够：同一文档中的两个不同 findings（即使在同一 review date）如果 sections 或 rationale 不同，也可能合法共享一个短 title。只使用 `{title}` 会静默丢弃其中一个，造成 user-visible backlog context 丢失。匹配 section 和 why-fingerprint 既能保持 distinct findings，也接近 R29/R30 matching predicate（`section + title + evidence-substring overlap`），让 cross-round 和 intra-round dedup 行为一致。

**已有 `dedup-key` HTML comment 的 entries:** 旧格式写入的 entries 带有 trailing `<!-- dedup-key: ... -->` comment。匹配时忽略它：上方 visible-text key 是 authoritative。如果该 entry 因其他原因被编辑，顺手移除 comment。不要再写新的 comment。

发生 collision 时，在 completion report 的 Coverage section 记录 no-op，让用户看到 duplicate 被 suppressed。Cross-subsection collisions（相同 compound key，不同日期）不 deduplicate；每次 review 都允许重新 raise 同一 concern。

---

## Concurrent edit safety（并发编辑安全）

Document edits 通过平台 edit tool 发生（Claude Code 中的 Edit 或等价工具）。每次 append 前，都从 disk 重新读取文档，以缩小 user-in-editor concurrent-write collisions 的窗口。如果文档 mtime 或 content 在 prior read 和 append attempt 之间意外变化，中止 append，并通过下方 failure path 展示情况。用户可能在 review session 中用编辑器编辑文档，同时写入会破坏文档。

orchestrator 只在内存中持有最近一次 read，而不是 persistent lock；interactive review 不需要 lock coordination，它需要 observation-before-write。

---

## Failure path（失败路径）

当 append 无法完成时（document 在 disk 上 read-only、path invalid、平台 edit tool 返回 error、检测到 concurrent-edit collision，或任何其他 write failure），通过平台 blocking question tool 向用户 inline 展示 failure，并提出以下 sub-question：

**Stem（问题主干）:** `Couldn't append the finding to Open Questions. What should the agent do?`

**Options（恰好三个；固定顺序）：**

```
A. Retry the append
B. Record the deferral in the completion report only (don't mutate the document)
C. Convert this finding to Skip
```

**Dispatch（分派）：**

- **A Retry** — 再次尝试 append。若重复失败，循环回同一个 sub-question。
- **B Record only** — 跳过 document mutation；在 completion report 中记录 Deferred action，并注明 append failed。finding 不会进入文档，但用户会在 report 中看到他们 deferred 了它。
- **C Convert to Skip** — 将 finding 记录为 Skip，并带解释性 reason（"append to Open Questions failed: <error>"）。该 finding 在 session 剩余时间被视为 no-action。

Silent failure 不可接受。如果用户没有回应 sub-question（session ends、terminal disconnects），默认选择 option B，这样即使文档未写入，in-memory decision state 也保持一致。

---

## Upstream availability signal（上游可用性信号）

walk-through 和 bulk-preview 在提供 Defer 作为选项前，会检查 append-availability。当文档已知 unwritable（例如 initial read 显示它位于 read-only filesystem 上），orchestrator 在 Phase 4 start 缓存 `append_available: false` signal，并在 walk-through menu 和 routing question 的 option C 中 suppress Defer。菜单行为见 `references/walkthrough.md` 的 "Adaptations"，preview 行为见 `references/bulk-preview.md` 的 "Edge cases"。

当 Phase 4 start 时 append-availability 为 true，但某个 individual append 在 mid-flow 失败，上方 failure path 处理该 specific finding；这不会翻转 session-level cached signal（如果 failure 是 transient，其他 findings 仍可能 append 成功）。

---

## Example appended content（追加内容示例）

Starting document state（起始文档状态）:

```markdown
## Risks

...existing content...

## Deferred / Open Questions

### From 2026-04-10 review

- **Alias compatibility-theater concern** — Risks (P1, scope-guardian, confidence 75)

  The alias exists without documented external consumers...

```

After appending two findings in a 2026-04-18 session（在 2026-04-18 session 中追加两个 findings 后）:

```markdown
## Risks

...existing content...

## Deferred / Open Questions

### From 2026-04-10 review

- **Alias compatibility-theater concern** — Risks (P1, scope-guardian, confidence 75)

  The alias exists without documented external consumers...

### From 2026-04-18 review

- **Unit 2/3 merge judgment call** — Scope Boundaries (P2, scope-guardian, confidence 75)

  The two units update consumer sites that deploy together. Splitting
  adds dependency tracking without enabling independent delivery.

- **Strawman alternatives on migration strategy** — Unit 3 Files (P2, coherence, confidence 75)

  The fix options list (a) through (c) as alternatives, but (b) and (c)
  are "accept the regression" framings that don't solve the problem the
  finding describes.
```
