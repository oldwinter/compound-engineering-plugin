# Post-Ideation Workflow（Ideation 后工作流）

在 Phase 2 ideation agents 返回，且 orchestrator 已将其 outputs merge 和 dedupe 成 master candidate list 后读取本文件。Phase 2 完成前不要加载。

## Phase 3：Adversarial Filtering（对抗式筛选）

批判性 review 每个 candidate idea。Critique 分两层运行：先用 fresh-context verifier，再由 orchestrator arbitration。Fresh-context verification 优于 self-critique：orchestrator 自己 synthesized 了其中一些 candidates，并携带完整 generation history，因此会被 anchor；而没看过 generation 的 verifier 不会。

1. **Basis verification（一个 generation-tier sub-agent，见 SKILL.md Model Tiers）。** Dispatch 一个 verifier，其 payload 只包含 consolidated grounding summary（包括 evidence gists 和 dossier file paths；需要时它自己读取 dossier files）以及 merged candidate list，不包含任何 generation history。Prompt 它 refute：对每个 candidate，检查 stated basis 是否实际支持 claimed move，`direct:` quotes 是否在 cited 位置真实存在（repo mode 中通过读取 file spot-check），`external:` prior art 是否真实且 relevantly analogous，`reasoned:` arguments 是否站得住，以及 idea 是否真正通过 meeting-test。它返回每个 candidate 的 verdict（sound / weak / refuted）和 one-line reason。Verifier 没写这些 ideas，所以它的 meeting-test judgment 优先于 generators 的 self-attestation。`go deep`（Phase 0.5）下，dispatch 第二个 ceiling-tier critic，使用相同 fresh-context payload，专注 novelty 和 feasibility。

2. **Orchestrator arbitration。** Orchestrator 做 final cut，权衡 verifier verdicts 但不受其绑定；当 context 中的 evidence 与 verdict 矛盾时，可以 overrule，并在 rejection reason 中说明。

如果 verifier dispatch 失败（platform limits、errors），fallback 到 orchestrator-only filtering，并在 rejection summary 中注明 degradation。

除非明确 refining，否则本阶段不要生成 replacement ideas。

为每个 rejected idea 写一行 reason。

Rejection criteria（拒绝标准）：
- too vague（太模糊）
- not actionable（不可执行）
- duplicates a stronger idea（重复了更强的 idea）
- not grounded in the stated context（没有基于已陈述 context）
- too expensive relative to likely value（相对预期价值成本太高）
- already covered by existing workflows or docs（已被现有 workflows 或 docs 覆盖）
- interesting，但更适合作为 brainstorm variant，而不是 product improvement
- **unjustified — no articulated basis**（sub-agent 未提供 `direct:`、`external:` 或 `reasoned:` justification，或 stated basis 实际上不支持 claimed move）
- **basis refuted by verification**（verifier 发现 cited quote 不存在、prior art 被 mischaracterized，或 reasoned argument 不成立，并且 orchestrator 同意）
- **below ambition floor**（未通过 meeting-test：不值得 team discussion；但 Phase 0.5 检测到 tactical focus signals 时，此 criterion waived）
- **subject-replacement**（放弃或替换 ideation subject，而不是在其上操作；例如 "pivot to an unrelated domain"、"become a different organization"）
- **scope overrun**（超出 asked scope，而不是在其中 ideating；例如用户询问一个 flow、stage 或 section，却提议修改整个 product）。仅当 basis 明确证明 expansion 合理时允许；默认 reject 或 downgrade。

使用一致 rubric 为 survivors 评分，权衡：groundedness in stated context、**basis strength**（`direct:` > `external:` > `reasoned:`；none excluded，但其他条件相同 direct-evidence ideas 得分更高）、expected value、novelty、pragmatism、leverage on future work、implementation burden、overlap with stronger ideas，以及 **axis spread**（当 Phase 1.5 产出 axis list 时）。其他条件相同时，覆盖 topic surface 的 survivor sets 优于聚集在单一 axis 的 sets。

**Axis coverage as a list-level concern.** 当 axes 已定义时，axis spread 按 survivor set 评估，而不是 per-idea。完成 per-idea filtering 后，检查 survivor set：如果 axis coverage 不均衡，且 under-represented axes 上存在更强 candidates，在提升 borderline candidates 时优先考虑 spread。Phase 2 的 recovery dispatch 应已为空 axes surface candidates；这里是 survivor selection 的 polish step。如果某个 axis 尽管 recovery 后（或因为 recovery hit 2-axis cap）仍有 zero survivors，在 rejection summary 中将其记录为 deliberate gap，而不是 oversight。

Target output（目标输出）：
- 默认保留 5-7 个 survivors
- 如果 survive 太多，运行第二轮更严格 pass
- 如果少于 5 个 survive，如实报告，而不是降低标准

## Phase 4：Write and Present the Deliverable（写入并呈现 Deliverable）

Ideation artifact 会 **automatically** 自动产出：persistence is **not opt-in**。Filtering 后，先写 deliverable，再展示 concise summary，并按格式打开它。完整内容存在文件里；session 只展示 orienting summary，让 reader 实际阅读 rich format。

**Checkpoint B (V17).** 写 deliverable 前，写入 `<scratch-dir>/survivors.md`（Phase 1 中的 absolute path），内容包含 survivor list 和 key context（focus hint、grounding summary、rejection summary）。Best-effort：如果写入失败，记录 warning 并继续；checkpoint 不是 load-bearing。复用 Phase 1 生成的同一个 `<run-id>` / `<scratch-dir>`。

### 4.1 Write the Deliverable（自动，所有 modes）

`OUTPUT_FORMAT`（在 SKILL.md Phase 0.0 resolve；默认 `html`）决定 extension。每次 run 都写文件：不要等用户请求。

1. **Resolve target directory and extension（解析目标目录和扩展名）。**
   - Extension 跟随 `OUTPUT_FORMAT`（默认 `.html`；override 时 `.md`）。
   - **Repo mode：** 确保 `docs/ideation/` 存在（不存在则创建）。
   - **Elsewhere mode 且 `docs/ideation/` 已存在：** 使用它。
   - **否则（无 repo，或 elsewhere 且无 `docs/ideation/`）：** 写入本 run 的 CE temp area，即 Phase 1 resolve 的 `<scratch-dir>`（`/tmp/compound-engineering/ce-ideate/<run-id>/`）。**不要**写入用户 current working directory，也**不要**为与 repo 无关的 subject 创建 `docs/ideation/` tree。Announce absolute path，并说明它是 temporary（`/tmp` reboot 后会清理；想保留就移动它）。
2. **Choose file path：** `<dir>/YYYY-MM-DD-<topic>-ideation.<ext>`；无 focus 时用 `<dir>/YYYY-MM-DD-open-ideation.<ext>`。
3. **Load section contract and rendering reference（从 Phase 0.0 deferred）：** 读取 `references/ideation-sections.md`，并读取与 `OUTPUT_FORMAT` 匹配的 format-rendering reference：`md` 用 `references/markdown-rendering.md`，`html` 用 `references/html-rendering.md`。
4. **Write document：** 按这些 references 写入。`ideation-sections.md` 定义 section contract（metadata、Grounding Context、Topic Axes、Ranked Ideas 及 per-idea fields、Rejection Summary）；rendering reference 定义 resolved format 如何呈现。两种格式内容相同，presentation 不同。
   - **写入失败**（无 writable path、permissions）：announce failure，并提供 custom path（validate writable；创建 parent dirs）。绝不要静默丢失 survivors。

**Resume：** 就地更新 existing file，并使用其 existing format（按 SKILL.md Phase 0.1 format precedence）；保留 prior ideas 和 rejection summary，在其上追加，而不是覆盖。

### 4.2 Present a Concise Summary（不是完整 deliverable）

完整 cards、rationale、downsides、diagrams 和 rejection table 都在文件中。**不要**在 session 中复刻它们：把整个 deliverable 作为 chat text 重新打印会破坏 rich format，让 reader 在看到文件前先读一遍 plain text。只展示 tight orientation：

- 一行 counts 和 path，例如：`Wrote 7 ranked ideas (36 raw, 13 cut) across 5 axes → <absolute path>`。
- Ranked list，**每个 survivor 一行**：`1. <Title> · <axis> · Conf <High/Med/Low> · Cx <S/M/L>`。
- 用一句话 call out top pick。
- 如果某个 axis 有 zero survivors，用一行注明（deliberate gap）。

这个 ranked list 同时是用户在 Phase 5 选择 idea 时引用的 index。Terminal-only readers 仍然获得 usable view；深入内容只需打开文件。

### 4.3 Open It（打开它）

- **HTML：** 在 interactive session 中，best-effort 使用平台 open primitive 打开 browser（macOS `open`、Linux `xdg-open`、Windows `start`）；始终打印 absolute path，方便 reopen 或 share。Headless / pipeline runs 中跳过 auto-open（无 interactive surface），只打印 path。

## Phase 5：Next Steps（下一步）

使用平台 blocking question tool 询问下一步：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用）、Codex 中的 `request_user_input`、Antigravity 中的 `ask_question`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错时（例如 Codex edit modes），才退回聊天中的 numbered options；不要因为需要 schema load 就退回。绝不要静默跳过问题。接受 free-text answers。

Deliverable 已经存在（Phase 4），所以 menu 只决定 **what next**：没有 "save" step。

**Stem:** "Your ideation is saved to `<path>`. What next?"

提供四个 options（labels self-contained，并把 distinguishing word 放前面，避免截断后混淆）。Option 1 是 **format-keyed**：每次 run 只渲染两个 labels 中与 `OUTPUT_FORMAT` 匹配的一个。

1. *(当 `OUTPUT_FORMAT=html`)* **Open in browser** — 打开已保存的 HTML deliverable（如果已打开，则重新打开）。
   *(当 `OUTPUT_FORMAT=md`)* **Publish to Proof** — 将已保存 markdown 发布到 Proof，并获得 shareable link。
4. **Done — keep the file and stop.**

**Adjacent nudge（prose，不占 option slot）：** "Don't want it kept? Say 'discard' and the agent deletes the file." 通过 free text 处理（见 §5.5）；仅适用于本次新建文件，永远不删除 resumed 或 pre-existing doc。

如果用户 inline 已命名 idea（例如 "brainstorm the table tool"、"tighten the highlighter idea"），§5.2 / §5.3 跳过 "which idea?" follow-up。

### 5.1 Open in Browser (html) / Publish to Proof (md)

- **HTML — Open in browser。** 尽可能通过平台 primitive 重新打开 saved file；否则打印 absolute path。随后回到 Phase 5 menu。没有 Proof；HTML file 是 canonical record。
- **Markdown — Publish to Proof。** Local markdown file 已在 Phase 4 写入并保持 canonical；调用 `ce-proof` publish，返回 shareable URL。Proof 是 markdown-only，cannot ingest HTML；Proof failure 时，auto-written local file 保持 intact。

### 5.2 Brainstorm One Idea

1. **Identify the idea** by number or name（如果用户已命名则跳过）。根据 Phase 4.2 的 ranked list 匹配。
2. **从 orchestrator context 中已有的 idea substance 构建 focused seed。** do **not** pass the whole file：那既浪费又噪声（其它 survivors、grounding、rejection table 与定义这个 idea 无关；HTML 还带 CSS/SVG chrome）。也不要只传 file pointer：这会迫使 `ce-brainstorm` 重新 open 并 extract orchestrator 已经持有的 idea。Seed 采用 feature-description shape：

   > `<title> — <description>. Basis: <basis/evidence>. Why it matters: <rationale>. Known tradeoffs: <downsides>.`

   Basis/evidence 会直接 feed `ce-brainstorm` 的 product-pressure-test，避免它重新推导已有信息。追加一行 provenance pointer：`(Seeded from ce-ideate: <path>, idea "<title>")`，用于记录 origin，并允许 brainstorm 在需要时 pull adjacent detail，而不是强迫它读取全部内容。
3. **Load `ce-brainstorm` skill** with that seed。Saved file 已经是 record；无需额外 write step。

**Repo mode only:** **不要**跳过 brainstorming 直接进入 `ce-plan`；`ce-plan` 需要 brainstorm-grounded requirements。在 elsewhere modes 中，ideation 是合法 terminal state；brainstorming 是对某个 idea 的 optional deeper development，而不是这些 modes 中不存在的 implementation ladder 上的 required next rung。

### 5.3 Iterate on One Idea

这仍停留在 ce-ideate：不 hand off 到其它 skill。它是 "poke at one idea before committing" step。

1. **Identify the idea**（number 或 name）以及用户想怎么 iterate：adjust、ask，还是 go deeper。能从 phrasing 推断则推断，否则询问。
2. **Route by intent：**
   - **Adjust**（"smaller scope"、"drop the paste-import part"、"reframe around X"）：按讨论 revise 该 idea 的 framing、scope 或 basis，然后 **rewrite saved file**，确保 deliverable 保持 current。
   - **Ask**（"why High confidence?"、"how does this compare to FigJam?"）：基于该 idea 的 basis 和 Phase 1 grounding 在 conversation 中回答。除非讨论产生用户想 capture 的 change，否则 **不 rewrite file**。
   - **Deepen**（"expand the second-order effects"）：扩展该 idea 的 analysis；只有当用户想保留时才 capture 到 file。
3. **Rewrite only on change。** 只有 idea content 确实改变时才 rewrite file；纯 Q&A 不 churn。
4. **Return to Phase 5 menu。** 通常用户下一步会 brainstorm sharpened idea（§5.2）、继续 iterate、打开文件或 finish。

### 5.4 Done

文件已经写入，所以没有 save step。

- **在 git repo 中：** offer 只 commit ideation doc（不创建 branch，不 push；如果用户拒绝，保留 uncommitted）。
- **Temp-area 或 non-repo file：** 跳过 commit offer。

然后 narrate path 并结束 session；不要返回 menu。

### 5.5 Discard（free text）

仅当文件是 **本次 run 新建** 时：删除它，确认 deletion，然后结束。对于 **resume run**（pre-existing file 被就地更新），**不要**删除：告诉用户 existing doc at `<path>` remains，不提供 destructive action。Discard 永远不是 default；只在 explicit request 时触发。

completion 时不要删除本次 run 的 scratch directory（`<scratch-dir>`）：它保存 V15 web-research cache（供同一 session 后续 ideation invocations 跨 run-ids 复用，见 `references/web-research-cache.md`）、Checkpoint A/B files、evidence dossiers，以及（no-repo case）deliverable 本身。OS 会处理最终 cleanup。

## Quality Bar（质量标准）

结束前检查：

- idea set grounded in stated context（repo mode 中为 codebase；elsewhere mode 中为 user-supplied context）
- **每个 surviving idea 都有 articulated basis**（`direct:`、`external:` 或 `reasoned:`），且实际支持 claimed move；披着 ambition 外衣的 speculation 已被 rejected，并带 reasons
- load-bearing `direct:` bases 已 against repo（或 supplied context）验证：通过 generating agent 的 verification reads 或 Phase 3 verifier，而不是 taken on faith
- **每个 surviving idea 都通过 meeting-test**，除非 Phase 0.5 检测到 tactical focus signals 并 waived floor
- **没有 surviving idea 替换 subject**，而是 operating on it
- 当 Phase 1.5 产出 axis list 时，survivor set 会 spread across axes，而不是聚集在单一 axis；任何 zero survivors 的 axis 都在 rejection summary 中记为 deliberate gap，而不是 silent absence
- candidate list 先于 filtering 生成
- 原始 many-ideas -> critique -> survivors mechanism 被保留
- 如果使用 sub-agents，它们提升 diversity，而不是替代 core workflow
- 每个 rejected idea 都有 reason
- survivors materially better than naive "give me ideas" list（survivors 明显优于朴素的“给我一些想法”列表）
- deliverable 在两种 modes 中都已自动写入（Phase 4）：存在 `docs/ideation/` 时写那里，否则写 CE temp area，绝不写入用户 CWD
- session 展示 concise summary，而不是完整 deliverable 的复刻
- acting on an idea route 到 `ce-brainstorm`（传 substance seed，而不是 whole file），而不是直接到 implementation
