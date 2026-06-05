# Post-Ideation Workflow（Ideation 后工作流）

在 Phase 2 ideation agents 返回，且 orchestrator 已将其 outputs merge 和 dedupe 成 master candidate list 后读取本文件。Phase 2 完成前不要加载。

## Phase 3：Adversarial Filtering（对抗式筛选）

批判性 review 每个 candidate idea。orchestrator 直接执行此 filtering；不要为 critique dispatch sub-agents。

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
- **below ambition floor**（未通过 meeting-test：不值得 team discussion；但 Phase 0.5 检测到 tactical focus signals 时，此 criterion waived）
- **subject-replacement**（放弃或替换 ideation subject，而不是在其上操作；例如 "pivot to an unrelated domain"、"become a different organization"）
- **scope overrun**（超出 asked scope，而不是在其中 ideating；例如用户询问一个 flow、stage 或 section，却提议修改整个 product）。仅当 basis 明确证明 expansion 合理时允许；默认 reject 或 downgrade。

使用一致 rubric 为 survivors 评分，权衡：groundedness in stated context、**basis strength**（`direct:` > `external:` > `reasoned:`；none excluded，但其他条件相同 direct-evidence ideas 得分更高）、expected value、novelty、pragmatism、leverage on future work、implementation burden、overlap with stronger ideas，以及 **axis spread**（当 Phase 1.5 产出 axis list 时）。其他条件相同时，覆盖 topic surface 的 survivor sets 优于聚集在单一 axis 的 sets。

**Axis coverage as a list-level concern.** 当 axes 已定义时，axis spread 按 survivor set 评估，而不是 per-idea。完成 per-idea filtering 后，检查 survivor set：如果 axis coverage 不均衡，且 under-represented axes 上存在更强 candidates，在提升 borderline candidates 时优先考虑 spread。Phase 2 的 recovery dispatch 应已为空 axes surface candidates；这里是 survivor selection 的 polish step。如果某个 axis 尽管 recovery 后（或因为 recovery hit 2-axis cap）仍有 zero survivors，在 rejection summary 中将其记录为 deliberate gap，而不是 oversight。

Target output（目标输出）：
- 默认保留 5-7 个 survivors
- 如果 survive 太多，运行第二轮更严格 pass
- 如果少于 5 个 survive，如实报告，而不是降低标准

## Phase 4：Present the Survivors（呈现保留想法）

**Checkpoint B (V17).** presenting 前，写入 `<scratch-dir>/survivors.md`（使用 Phase 1 中捕获的 absolute path），内容包含 survivor list 和 key context（focus hint、grounding summary、rejection summary）。这会在用户到达 persistence menu 前保护 post-critique state。Best-effort：如果写入失败（disk full、permissions），记录 warning 并继续；checkpoint 不是 load-bearing。复用 Phase 1 生成的同一个 `<run-id>` 和 `<scratch-dir>`；运行结束时不清理（保留 run directory，让 V15 cache 在同一 session 的不同 run-ids 间仍可复用；见 Phase 6）。

向用户呈现 surviving ideas。terminal review loop 本身就是完整 ideation cycle；persistence 是 opt-in（Phase 5），refinement 在 conversation 中发生，没有 file 或 network cost（Phase 6）。

只以 structured form 呈现 surviving ideas：

- title（标题）
- description（描述）
- **axis（轴）** (when Phase 1.5 produced an axis list)
- **basis（依据）** (tagged `direct:` / `external:` / `reasoned:`, with the quoted evidence, cited source, or written-out argument)
- rationale（理由：basis 如何连接到 move 的 significance）
- downsides（缺点）
- confidence score（置信度分数）
- estimated complexity（预估复杂度）

然后包含 brief rejection summary，让用户看到哪些内容被考虑过并 cut。

保持 presentation concise。允许 brief follow-up questions 和 lightweight clarification。

## Phase 5：Persistence（持久化，Opt-In，Mode-Aware）

Persistence 是 opt-in。terminal review loop 是完整 ideation cycle。Refinement loops 在 conversation 中发生，没有 file 或 network cost。只有当用户明确选择 save、share 或 hand off（Phase 6 中选择）时，才触发 persistence。

当用户在 Phase 6 选择需要 durable record 的选项（Open and iterate in Proof、Brainstorm、Save and end）时，先确保 record 存在。当用户选择 keep refining 时，除非用户要求，否则不需要 record。

**Mode-determined defaults（由 mode 决定的默认值）:**

| Action | Repo mode default | Elsewhere mode default |
|---|---|---|
| Save | `docs/ideation/YYYY-MM-DD-<topic>-ideation.md` | Proof |
| Share | Proof（additional） | Proof（primary） |
| Brainstorm handoff | `ce-brainstorm` | `ce-brainstorm`（universal-brainstorming） |
| End | Conversation only is fine | Conversation only is fine |

任一 mode 都可在 explicit request 下使用另一 destination（"save to Proof even though this is repo mode"、"save to a local file even though this is elsewhere"）。直接尊重这些 overrides。

### 5.1 File Save（repo mode 默认；elsewhere mode 按需）

1. 确保 `docs/ideation/` 存在
2. 选择 file path：
   - `docs/ideation/YYYY-MM-DD-<topic>-ideation.md`
   - `docs/ideation/YYYY-MM-DD-open-ideation.md` when no focus exists
3. 写入或更新 ideation document

使用此结构，仅在必要时省略明显 irrelevant fields：

```markdown
---
date: YYYY-MM-DD
topic: <kebab-case-topic>
focus: <optional focus hint>
mode: <repo-grounded | elsewhere-software | elsewhere-non-software>
---

# Ideation: <Title>

## Grounding Context
[Grounding summary from Phase 1 — labeled "Codebase Context" in repo mode, "Topic Context" in elsewhere mode]

## Topic Axes
[3-5 axes from Phase 1.5, one per line, OR a single line `Decomposition skipped — atomic subject` / `Decomposition skipped — surprise-me mode` when Phase 1.5 was skipped. Omit this section entirely if not applicable.]

## Ranked Ideas

### 1. <Idea Title>
**Description:** [Concrete explanation]
**Axis:** [Topic axis this idea targets — omit when decomposition was skipped]
**Basis:** [`direct:` / `external:` / `reasoned:` — quoted, cited, or written-out argument]
**Rationale:** [How the basis connects to the move's significance]
**Downsides:** [Tradeoffs or costs]
**Confidence:** [0-100%]
**Complexity:** [Low / Medium / High]
**Status:** [Unexplored / Explored]

## Rejection Summary

| # | Idea | Reason Rejected |
|---|------|-----------------|
| 1 | <Idea> | <Reason rejected> |

[When applicable, append axis-coverage gaps as their own rows so the gap is visible:]
| - | axis: <name> | recovery skipped (cap reached) — no survivors on this axis |
```

如果 resuming：
- 就地更新 existing file
- 保留 explored markers

### 5.2 Proof Save（elsewhere mode 默认；repo mode 按需）

以 HITL review mode 将 ideation content hand off 给 `ce-proof` skill。它会上传 doc，运行 iterative review loop（用户在 Proof 中 annotate，agent ingest feedback、apply agreed edits，并在线程中 replies/resolves），并且（在 repo mode 中）将 reviewed markdown 同步回 `docs/ideation/`。

以 HITL-review mode 加载 `ce-proof` skill，参数为：

- **source content:** Phase 4 的 survivors 和 rejection summary（在 repo mode 中，这是 5.1 写入的文件；在 elsewhere mode 中，渲染到 temp file 作为 upload source）
- **doc title:** `Ideation: <topic>` 或 ideation doc 的 H1
- **identity（身份）:** `ai:compound-engineering` / `Compound Engineering`
- **recommended next step:** `/ce-brainstorm`（显示在 proof skill 的最终 terminal output 中）

当此 hand-off 失败时，由 Phase 6.5 的 Proof failure ladder 处理。

**Caller-aware return.** 下方 return-rule bullets 描述默认 control flow，但下一步取决于哪个 Phase 6 option 调用了 Proof save。为 caller 应用正确 branch：

- **§6.2 Open and iterate in Proof.** Behavior 是 mode-aware：
    - *Repo mode:* 每种 status 都返回 Phase 6 menu。Proof-reviewed content 现在已 local synced，用户通常还有 repo 中的 follow-up action（brainstorm toward a plan、save and end 或 keep refining）。
    - *Elsewhere mode:* 成功 Proof return（`proceeded` 或 `done_for_now`）后 cleanly exit：叙述 artifact 位于 `docUrl`（如适用，包含任何 stale-local note），然后停止。Proof iteration 在 elsewhere mode 中常是 terminal act；用户已得到所需内容后再强制菜单选择会产生 decision fatigue。只有 `aborted` branch 返回 Phase 6 menu，让用户 retry 或选择其他 path。
- **§6.3 Brainstorm a selected idea.** 成功 Proof return（`proceeded` 或 `done_for_now`）后，**不要**停在 Phase 6 menu；应用下方 per-status handling（包括任何 stale-local pull offer）后，继续进入 §6.3 的 remaining bullets（将 chosen idea 标记为 `Explored`，然后加载 `ce-brainstorm`）。只有 `aborted` branch 返回 Phase 6 menu，因为没有写入 durable record。
- **§6.4 Save and end.** 成功 Proof return（`proceeded` 或 `done_for_now`）后 cleanly exit：叙述 ideation 已保存，surface `docUrl`（以及 local-path note，如适用），然后停止。**不要**重新询问 Phase 6 question；用户已经选择结束。只有 `aborted` branch 返回 Phase 6 menu，让用户 retry 或选择其他 path。

当 proof skill 交还控制权时：

- `status: proceeded` 且 `localSynced: true` → 磁盘上的 ideation doc 现在反映了 review。对 invoking branch 应用上方 caller-aware return rule。
- `status: proceeded` 且 `localSynced: false` → reviewed version 位于 Proof 的 `docUrl`，但 local copy 已陈旧。使用 proof skill 的 Pull workflow，询问是否将 Proof doc 拉取到 `localPath`。应用上方 caller-aware return rule；如果 pull 被拒绝，包含一行 note，说明 `<localPath>` 相比 Proof 已陈旧，避免下一次 handoff（或最终 exit narration）静默读取旧内容。Placement：当 caller-aware rule 返回 menu 时放在 Phase 6 menu 上方；§6.3 时放在 `ce-brainstorm` handoff preamble 中；§6.2 elsewhere / §6.4 时放在 final save/exit narration 旁。
- `status: done_for_now` → 如果用户离开前在 Proof 中编辑过，磁盘上的 doc 可能已陈旧。询问是否将 Proof doc 拉取到 `localPath`，让 local ideation artifact 保持同步，然后应用上方 caller-aware return rule。`done_for_now` 表示用户停止 HITL loop；不表示他们结束整个 ideation session，除非 caller-aware rule 退出（§6.2 elsewhere mode 或 §6.4）。如果 pull 被拒绝，在上一 bullet 描述的 placement 加入 stale-local note。
- `status: aborted` → 无论 caller 如何，不做更改并回退到 Phase 6 menu。未写入 durable record，因此 §6.3 不得继续 brainstorm handoff，§6.4 不得结束；menu 允许用户 retry 或选择其他 path。

## Phase 6：Refine or Hand Off（精修或交接）

使用平台 blocking question tool 询问下一步：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或调用报错时（例如 Codex edit modes），才回退到聊天中的编号选项；不能因为需要 schema load 就回退。绝不要静默跳过问题。

**Question:** "Agent 接下来应该做什么？"

提供以下四个 options（labels self-contained，且 distinguishing word front-loaded，让 options 被截断时仍保持 distinct）：

1. **Refine the ideation in conversation (or stop here — no save)** — 添加 ideas、re-evaluate 或 deepen analysis。没有 file 或 network side effects；选择后任何时候结束 conversation 都是 valid no-save exit。
2. **Open and iterate in Proof** — 将 ideation 保存到 Proof，并进入 proof skill 的 HITL review loop：通过 Proof editor 中的 comments 迭代；在 repo mode 中，reviewed edits 会 sync 回 `docs/ideation/`。
3. **Brainstorm a selected idea** — 以 chosen idea 作为 seed 加载 `ce-brainstorm`。orchestrator 先使用 Phase 5 的 mode default 写入 durable record。
4. **Save and end** — 使用 mode default persist ideation（repo mode 中为 file，elsewhere mode 中为 Proof），然后结束。

No-save exit 无需 dedicated menu option 也受支持。选择 option 1 并停止 conversation，或使用 question tool 的 free-text escape 直接说明；persistence 是 opt-in，且 terminal review loop 已经是完整 ideation cycle。

completion 时不要删除本次 run 的 scratch directory（Phase 1 中解析出的 `<scratch-dir>`）。V15 web-research cache 是 session-scoped，并会被同一 session 中后续 ideation invocations 跨 run-ids 复用（见 `references/web-research-cache.md`）；per-run cleanup 会破坏这种复用。Checkpoint A（`raw-candidates.md`）和 Checkpoint B（`survivors.md`）留下成本很低，并符合 repo 的 Scratch Space cross-invocation-reusable convention；OS 会处理最终 cleanup。

### 6.1 在 Conversation 中精修 Ideation

按 intent route refinement：

- `add more ideas` or `explore new angles` -> return to Phase 2
- `re-evaluate` or `raise the bar` -> return to Phase 3
- `dig deeper on idea #N` -> expand only that idea's analysis

refinement 期间不触发 persistence。用户准备 persist 时，可以选择 Save and end（或 Brainstorm，或 Open and iterate in Proof）。

refinement 后结束，或根本不 refinement 直接结束，都是 valid no-save exit。没有 required next step；在这里停止 conversation 不留下 durable artifact，这符合 opt-in persistence contract。

### 6.2 在 Proof 中打开并迭代

以 §6.2 作为 caller，通过 §5.2 调用 Proof HITL review path。在 repo mode 中，先确保 local file 存在（运行 §5.1），让 HITL sync-back 有 target；在 elsewhere mode 中，§5.2 照常渲染到 temp file。两种情况下都遵守 Phase 5 的 "ensure a record exists first" contract。

为 §6.2 branch 应用 §5.2 的 caller-aware return rule；behavior 是 mode-aware。在 repo mode 中，每种 status 都返回 Phase 6 menu，让用户在 Proof review 已反映到 local file 后选择 follow-up（brainstorm toward a plan、save-and-end 或 keep refining）。在 elsewhere mode 中，成功 Proof return 后 cleanly exit，因为 Proof iteration 常是 terminal act；artifact 位于 `docUrl`，且是 canonical record；只有 `aborted` status 返回 menu。

如果 Proof handoff 失败，由 §6.5 Proof Failure Ladder 管理 recovery。

### 6.3 Brainstorm 选中的 Idea

- 根据 Phase 5 的 mode default 写入或更新 durable record（repo mode 中为 file，elsewhere mode 中为 Proof）。当这一路径经过 §5.2 Proof Save 时，应用 §5.2 的 caller-aware return rule：成功 Proof return 后继续到下一 bullet，而不是弹回 Phase 6 menu。如果 Proof 返回 `aborted`（未写入 durable record），回到 Phase 6 menu，且**不要**继续 brainstorm handoff。
- 在 saved record 中将 chosen idea 标记为 `Explored`
- 以 chosen idea 作为 seed 加载 `ce-brainstorm` skill

**Repo mode only:** **不要**跳过 brainstorming 并从 ideation output 直接进入 `ce-plan`；`ce-plan` 需要 brainstorm-grounded requirements。在 elsewhere modes 中，ideation（或 ideation + Proof iteration）是合法 terminal state；brainstorming 是对某个 idea 的 optional deeper development，而不是这些 modes 中不存在的 implementation ladder 上的 required next rung。

### 6.4 Save and End（保存并结束）

通过 mode default persist（repo mode 中 5.1，elsewhere mode 中 5.2），然后结束。如果用户要求使用 non-default destination，尊重该 explicit request。

当 path 落到 Proof save（5.2）时，为 §6.4 branch 应用 §5.2 的 caller-aware return rule：成功 Proof return 后 cleanly exit；叙述 save，surface `docUrl`（以及 pull 被拒绝时的任何 stale-local note），然后停止。**不要** loop back to Phase 6 menu；用户已经选择结束。只有 Proof 返回 `status: aborted` 时回到 menu，让用户 retry 或选择其他 path（file save、custom path 或 keep refining）。§6.5 Proof Failure Ladder 仍管理 persistent Proof failures，并以 Phase 6 menu 结束；该 failure-recovery path 与这里描述的 successful-save exit 不同。

当 path 落到 file save（5.1）时：

- 仅 offer commit ideation doc
- 不创建 branch
- 不 push
- 如果用户拒绝，保留 file uncommitted

file save（以及 optional commit）后，结束 session；不要返回 Phase 6 menu。

### 6.5 Proof Failure Ladder（Proof 失败阶梯）

`ce-proof` skill 在 surface failure 前，会对 transient failures（`STALE_BASE`、`BASE_TOKEN_REQUIRED`）内部执行 single-retry-once。proof skill 的 return contract 不向 callers 暴露 typed error classes；orchestrator 无法从外部区分 retryable 和 terminal failures。

**Orchestrator-side retry harness（刻意 minimal）：** 将 proof skill invocation 包裹在**一次**额外 best-effort retry 中，并短暂停顿（约 2 秒）。proof skill 已在内部 retry，因此这会捕获 orchestrator boundary 的 transient races，而不会叠加太多 latency。不要从 skill 外部 classify error types；不存在 detection mechanism。

通过检查 proof skill 失败前是否返回了 `docUrl`，区分 create-failure 和 ops-failure：

- **Create-failure**（未返回 `docUrl`）：retry create。
- **Ops-failure**（已返回 `docUrl`，但后续 operation 失败）：只 retry failing operation。**不要 recreate** document。

**Failure narration.** 向 terminal 叙述这次 single retry，避免 pause 看起来像 hang（"Retrying Proof... attempt 2/2"）。persistent failure 时，在显示 fallback menu 前说明 retry exhausted。

**Fallback menu after persistent failure.** 使用平台 blocking question tool。呈现这些 options（如果 CWD 不在 repo 中，则省略 option (a)）：

- "Save to `docs/ideation/` instead"（改存到 `docs/ideation/`；repo-mode 默认 destination，CWD 位于 git repo 内时可用）
- "Save to a custom path the user provides"（保存到用户提供的 custom path；validate writable，创建 parent dirs）
- "Skip save and keep the ideation in conversation"（跳过保存，只把 ideation 留在 conversation 中；no persistence）

如果 proof 在失败前返回 partial `docUrl`，将该 URL 与 fallback options 一起 surface，让用户可 recover 或 share partial record。

fallback 完成后（任意 path），继续回到 Phase 6 menu，让用户仍可 refine、iterate in Proof、brainstorm 或 save and end。

## Quality Bar（质量标准）

结束前检查：

- idea set grounded in stated context（repo mode 中为 codebase；elsewhere mode 中为 user-supplied context）
- **每个 surviving idea 都有 articulated basis**（`direct:`、`external:` 或 `reasoned:`），且实际支持 claimed move；披着 ambition 外衣的 speculation 已被 rejected，并带 reasons
- **每个 surviving idea 都通过 meeting-test**，除非 Phase 0.5 检测到 tactical focus signals 并 waived floor
- **没有 surviving idea 替换 subject**，而是 operating on it
- 当 Phase 1.5 产出 axis list 时，survivor set 会 spread across axes，而不是聚集在单一 axis；任何 zero survivors 的 axis 都在 rejection summary 中记为 deliberate gap，而不是 silent absence
- candidate list 先于 filtering 生成
- 原始 many-ideas -> critique -> survivors mechanism 被保留
- 如果使用 sub-agents，它们提升 diversity，而不是替代 core workflow
- 每个 rejected idea 都有 reason
- survivors materially better than naive "give me ideas" list（survivors 明显优于朴素的“给我一些想法”列表）
- persistence 遵循 user choice；terminal-only sessions 未写 file 或调用 Proof
- persistence 触发时，除非用户明确 override，否则遵守 mode default
- acting on an idea route 到 `ce-brainstorm`，而不是直接到 implementation
