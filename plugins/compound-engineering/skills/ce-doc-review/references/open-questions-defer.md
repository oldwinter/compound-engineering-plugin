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

对每个 deferred finding，append 一个包含以下字段的 bullet-point entry。可见内容是 reader-friendly summary；entry 上的 HTML comment 持久化 dedup-key fields，让 Step 4 的 compound-key check 能在 retries 和 same-day reruns 中可靠运行，而不要求 entry format 本身携带 machine-oriented metadata：

```
- **{title}** — {section} ({severity}, {reviewer}, confidence {confidence})

  {why_it_matters}

  <!-- dedup-key: section="{normalized_section}" title="{normalized_title}" evidence="{evidence_fingerprint}" -->
```

字段来自 finding 的 schema：

- `{title}` — finding 的 title field
- `{section}` — finding 的 section field，保持原样（human-readable）
- `{severity}` — P0 / P1 / P2 / P3
- `{reviewer}` — 产出该 finding 的 persona（dedup 后为 confidence anchor 最高的 persona；若有多个 co-flagging personas，则全部 surface）
- `{confidence}` — integer anchor（`50`、`75` 或 `100`），不带小数点或百分号
- `{why_it_matters}` — 完整 why_it_matters 文本，保留 subagent template 中的 framing guidance

HTML-comment fields（machine-readable，由 Step 4 dedup 使用）：

- `{normalized_section}` — `normalize(section)`（lowercase、punctuation-stripped、whitespace-collapsed）
- `{normalized_title}` — `normalize(title)`（同样 normalization）
- `{evidence_fingerprint}` — finding 第一条 evidence quote 的前约 120 chars，保留 word-boundary，然后 sanitized 以便嵌入单行 HTML-comment；当 finding 没有 evidence 时为空字符串。Sanitization（按顺序应用，且在 120-char slice 前应用，让生成的 fingerprint 保持在预算内）：
  1. 将任何连续 whitespace（包括 newlines、carriage returns 和 tabs）折叠为单个空格。
  2. 移除任何 `-->`（HTML-comment terminator）以及任何散落的 `<!--` sequence；每个替换为单个空格。这可防止 evidence 提前关闭 dedup-key comment 或注入 nested comment。
  3. 将双引号字符替换为 `\"`（quote escaping，与之前相同）。
  4. Trim leading/trailing whitespace（去除首尾空白）。

  sanitized fingerprint 必须是单行，且没有嵌入的 `-->`，这样 dedup-key comment 才能被 Step 4 的 compound-key reconstruction 解析。为新 finding 计算 fingerprint 时，应用此 sanitization；从 existing entry 读回时，将解析出的 `evidence="..."` value 视为已 sanitized，并逐字比较。

不要在 appended entry 中包含 `suggested_fix` 或完整 `evidence` array。它们位于 review run artifact 中（如适用），不属于文档的 Open Questions section；entry 是给稍后返回的读者看的 concern summary，不是完整 decision packet。HTML-comment dedup-key line 是可靠 idempotence 所需的最小 machine-oriented metadata，并刻意保持为带简单 `key="value"` shape 的单行，这样 retry 无需 markdown parser 即可解析。

### Step 4：Idempotence on compound-key collisions（compound-key 冲突时保持幂等）

如果同一 `### From YYYY-MM-DD review` subsection 下已存在相同 compound key 的 entry，不要 append duplicate。这可能发生在：

- 同一 review session 将同一 finding 第二次 re-route 到 Defer（少见，但可能通过 walk-through Defer 后的 best-judgment-the-rest 发生）
- orchestrator 在 partial failure 后 retry

**Compound key for dedup:** `normalize(section) + normalize(title) + evidence_fingerprint`，从每个 existing entry 的 `<!-- dedup-key: ... -->` HTML comment 重建（见 Step 3 entry format）。对于即将 append 的新 finding，从 finding 的 schema data 计算相同字段；对于 existing entries，从 HTML comment 中解析。三个字段全部匹配才算 match。

- `normalize(section)` 和 `normalize(title)` 使用与 synthesis step 3.3 dedup 相同的 normalization（lowercase、strip punctuation、collapse whitespace）
- `evidence_fingerprint` 是 finding 第一条 evidence quote 的前约 120 个字符，并按 Step 3 sanitization（whitespace 折叠为单空格、移除 `-->` 和散落的 `<!--`、转义 quotes）。decision primer 使用同一 slice；见 `SKILL.md` 中的 "Decision primer"。当新 finding 没有 evidence 可用时，仅回退到 section+title。当 existing entry 的 HTML comment 有 `evidence=""` 时，将该 entry 视为 evidence-less，并在该比较中也回退到 section+title。如果 existing entry 的 dedup-key comment malformed（例如 pre-sanitization entry 中 newline 或 `-->` sequence 将 comment 拆成多行），按下方 legacy-fallback rule 处理该 entry，而不是尝试 partial reconstruction。

Title-only dedup 不够：同一文档中的两个不同 findings（即使在同一 review date）如果 sections 和 evidence 不同，也可能合法共享一个短 title。只使用 `{title}` 会静默丢弃其中一个，造成 user-visible backlog context 丢失。compound key 镜像 R29/R30 matching predicate（`section + title + evidence-substring overlap`），让 cross-round 和 intra-round dedup 行为一致。

**Legacy entries without dedup-key comments:** 此格式之前写入的 entries（如果仍存在）没有 HTML comment。当 Step 4 遇到这种 entry 时，对该 entry 回退到 title-only comparison；不完美，但严格好于 duplicate-appending。这是 legacy data 的 backwards-compat behavior，不是 sanctioned format。

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

  <!-- dedup-key: section="risks" title="alias compatibilitytheater concern" evidence="the alias exists without documented external consumers" -->

```

After appending two findings in a 2026-04-18 session（在 2026-04-18 session 中追加两个 findings 后）:

```markdown
## Risks

...existing content...

## Deferred / Open Questions

### From 2026-04-10 review

- **Alias compatibility-theater concern** — Risks (P1, scope-guardian, confidence 75)

  The alias exists without documented external consumers...

  <!-- dedup-key: section="risks" title="alias compatibilitytheater concern" evidence="the alias exists without documented external consumers" -->

### From 2026-04-18 review

- **Unit 2/3 merge judgment call** — Scope Boundaries (P2, scope-guardian, confidence 75)

  The two units update consumer sites that deploy together. Splitting
  adds dependency tracking without enabling independent delivery.

  <!-- dedup-key: section="scope boundaries" title="unit 23 merge judgment call" evidence="the two units update consumer sites that deploy together" -->

- **Strawman alternatives on migration strategy** — Unit 3 Files (P2, coherence, confidence 75)

  The fix options list (a) through (c) as alternatives, but (b) and (c)
  are "accept the regression" framings that don't solve the problem the
  finding describes.

  <!-- dedup-key: section="unit 3 files" title="strawman alternatives on migration strategy" evidence="the fix options list a through c as alternatives but b and c" -->
```
