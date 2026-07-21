# `ce-doc-review`

> 使用 parallel persona agents review requirements 或 plan documents，浮现 role-specific issues。

`ce-doc-review` 是 **document review** skill，是 docs side chain 上 `/ce-code-review` 的 sibling。它分析 requirements doc 或 implementation plan，根据 doc 内容选择 reviewer personas（product framing、design surfaces、security implications、scope sprawl），并行分派它们，然后 auto-apply safe fixes，并把其余 findings 路由到 structured four-option interaction（per-finding walk-through、auto-resolve with best judgment、append to Open Questions、report-only）。

Compound-engineering ideation chain 是 `/ce-ideate -> /ce-brainstorm -> /ce-plan -> /ce-work`。`ce-doc-review` 是 **review `ce-brainstorm` 和 `ce-plan` 产物的 skill**：在它们各自的 Phase 4 / Phase 5.3.8 handoffs 被调用；也可在你想对磁盘上的 doc 做 structured review 时直接调用。

---

## 摘要（TL;DR）

| 问题 | 答案 |
|----------|--------|
| 它做什么？ | 根据 doc content 选择 reviewer personas，并行分派，应用 `safe_auto` fixes，并把 remaining findings 路由到 structured interaction |
| 何时使用？ | `ce-brainstorm` 生成 requirements doc 后；`ce-plan` 写出 plan 后；把两者交给 implementation 前 |
| 产出什么？ | 应用了 `safe_auto` fixes 的 updated doc，外加对 `gated_auto` / `manual` findings 的 structured handling |
| 模式 | Interactive（direct invocation）、Headless（从 `/ce-plan` chain 调用时默认） |

---

## 调用示例

```text
# 以 interactive 方式 review 指定 requirements 或 plan 文档
/ce-doc-review docs/plans/notification-mute.md

# 让 skill 查找最新的 planning 文档
/ce-doc-review
```

---

## 问题

Document review 比 code review 在几个方面更难：

- **No type checker**：requirements doc 内部矛盾时，没有 compiler error
- **No execution**：你不能 "run" 一个 plan 来判断 scope 是否匹配 goals
- **Generalist review collapses**："looks good" 会漏掉 design gap、security implication、unstated scope expansion
- **Interleaved concerns**：product framing、security、design、scope 和 feasibility 需要不同 lenses，但单个 reviewer 会优先其中一个
- **Findings lack ownership**："consider revising" 不说明谁决定、该做什么
- **Rejected findings re-surface**：因为 rejection 没记录，同一问题一轮又一轮被 flag

## 解决方案

`ce-doc-review` 把 document review 作为带 explicit gates 的 structured pipeline：

- 面向 coherence 和 feasibility 的 **always-on personas**
- 根据 doc content 选择的 **conditional personas**：product-lens、design-lens、security-lens、scope-guardian、adversarial
- 带 bounded concurrency 的 **parallel persona dispatch**
- **Synthesis pipeline**：cross-persona agreement promotion、contradiction resolution，以及 three-tier routing（`safe_auto`、`gated_auto`、`manual` + FYI）
- **Decision primer**：round-to-round suppression，避免 rejected findings 反复出现，并验证 applied findings
- **Four-option interaction（四选项交互）**：per-finding walk-through、auto-resolve with best judgment、append to Open Questions、report-only

---

## 新颖之处

### 1. Doc-content-aware persona selection（按 doc content 选择 persona）

Conditional personas 根据 doc 实际内容激活，而不是 keyword matching：

- **`product-lens-reviewer`**：当 doc 对 build 什么和为什么提出可 challenge 的 claims，或 proposed work 具有 strategic weight（trajectory、identity、adoption、opportunity cost）时
- **`design-lens-reviewer`**：当 doc 包含 UI/UX references、user flows、interaction descriptions 或 visual design language 时
- **`security-lens-reviewer`**：当 doc 触及 auth、public APIs、data handling、PII、payments、third-party trust boundaries 时
- **`scope-guardian-reviewer`**：当 doc 有多个 priority tiers、大量 requirements，或 scope-boundary language 看起来 misaligned 时
- **`adversarial-document-reviewer`**：当 doc 触及 high-stakes domains（auth、payments、migrations）、提出 new abstractions、有 missing 或 extended origin、包含 requirements-shape premise content，或呈现 explicit alternatives 时

两个 always-on（`coherence-reviewer`、`feasibility-reviewer`）每次 review 都跑。Conditional personas 在 doc content 值得时增加 depth。

Personas 还会 **按 doc shape 收窄 techniques**。对于带 `Origin:` 的 plan-shape docs，也就是 premise 已在 brainstorm 中 pressure-tested，`product-lens-reviewer`、`adversarial-document-reviewer` 和 `scope-guardian-reviewer` 会抑制 premise-level techniques，只运行 implementation-level checks（technical assumptions、decision stress-testing、architectural alternatives、deferred-work scope creep）。对于 requirements-shape docs，它们运行完整 technique set。`feasibility-reviewer` 反过来：shadow-path tracing、implementability 和 migration mechanics 只用于 plan-shape docs；requirements docs 上只运行紧凑的 "would this direction force a fundamental rework?" check。Doc-type classification 在 orchestrator 中只做一次（content-shape signals：frontmatter、R-IDs vs U-IDs、section structure），并通过 `Origin:` slot 传给每个 persona，避免 personas 自己重复分类。

### 2. 带三层 routing 的 synthesis pipeline

所有 personas 返回后，synthesis 会：

- 根据 schema validate 每个 finding
- 应用 anchor-based gate（丢弃无法 anchor 到 actual doc content 的 findings）
- 跨 personas deduplicate
- **基于 cross-persona agreement promote findings**：两个 reviewers 发现同一 issue 会提高 priority
- Resolve contradictions（不同 personas 对做法意见不一）
- Auto-promote 达标的 safe-auto candidates
- 将 findings route 到三层：`safe_auto`（直接应用）、`gated_auto` / `manual`（用户决定）、FYI（advisory only）

Output 是一个 consolidated set，而不是每个 persona raw output 的 flat list。

### 3. Decision primer（决策 primer）：round-to-round suppression

当用户在同一 session 中运行多轮（应用一些 findings，留下其余，再跑一轮），decision primer 会 carry forward 什么被 applied、什么被 rejected：

- **Applied findings** 回流，使 round-N+1 personas 可以 verify fix 是否真的 landed
- **Rejected findings**（skip / defer / acknowledge）通过 fingerprint + evidence-substring overlap matching 被 suppress，避免同一 issue 再次浮现

Primer 使用 evidence-snippet（每个 finding evidence 的前约 120 chars）做 overlap test，而不只靠 title fingerprint。没有 snippet 时，suppression 会退化为 title-only，要么 rejected findings 重新出现，要么过度 suppress。

### 4. Four-option interaction model（四选项交互模型）

当 findings 落入 `gated_auto` / `manual` tiers 时，用户选择处理方式：

| 选项 | 效果 |
|--------|--------|
| Per-finding walk-through | 逐个 finding 处理；apply、skip、defer to Open Questions 或 acknowledge |
| Auto-resolve with best judgment | Skill 应用它判断 safe 的内容；用户在 commit 前 review bulk preview |
| Append to Open Questions | 所有 findings 作为 batch defer 到 doc 的 `## Open Questions` section |
| Report-only | 不编辑；report 留在 chat 中 |

Walk-through 本身支持中途 "auto-resolve the rest" escape；当用户已经 review 足够内容、信任其余时可使用。

### 5. Mass changes 前的 bulk-action preview

当用户选择 "Auto-resolve with best judgment"、"Append to Open Questions"，或在 walk-through 中途 escape 到 "Auto-resolve the rest" 时，skill 会在 apply 前展示每个 change 的 preview。Preview 包含 section、finding title、action（apply / skip / defer / acknowledge）和 brief rationale。用户 confirm 或 cancel。这是 bulk operations 的 safety valve：用户在内容落地前看到将发生什么。

### 6. Two modes：Interactive 和 Headless

| Mode | When | Behavior |
|------|------|----------|
| **Interactive** | Direct user invocation，或 caller post-generation menu 中选择 `Run deeper doc review` | Routing question、per-finding walk-through、bulk-preview confirmations |
| **Headless** _(chained invocation default)_ | `mode:headless`；`/ce-plan` Phase 5.3.8 默认 | 静默应用 `safe_auto`；其他 findings 作为 structured text 返回；在 caller 下一步 menu 上方展示 one-line summary；无 prompts |

从 doc-producing skills chain 调用时，Headless 是 default：`/ce-plan` Phase 5.3.8 以 headless 调用它，让 routine plans autofix 并 surface summary line，不阻塞用户。Interactive 用于 direct invocation，或用户从 post-generation menu opt into `Run deeper doc review`。

### 7. 带 backpressure 的 bounded parallelism

Persona dispatch 尊重 harness 的 active-subagent limit。Selected reviewers 会排队；skill 分派 harness 可接受的数量，并在 reviewers 完成后填充 freed slots。Active-agent / concurrency-limit spawn errors 被视为 backpressure（slot 释放后 retry），不是 reviewer failure。只有 successful dispatch 后 timeout 或非 capacity 原因失败，才记录 reviewer failed。

### 8. Coverage transparency（覆盖透明度）

Output 会说明哪些 personas 运行了、哪些 signals 激活了它们，以及是否有失败或 timeout。用户不用解析 internal state，也能 audit "did the right reviewers actually look at this"。

### 9. Cross-model judgment pass（跨模型判断 pass）

当对应 lenses 被激活时，**conditional judgment trio**（`adversarial-document-reviewer`、`product-lens-reviewer`、`security-lens-reviewer`）还会交给**一个不同于 host 的 model provider**，在独立的 read-only process 中运行。这三个 lenses 的输出最容易随 model 改变，分别负责 premise falsification、strategic-claim challenge 和 threat coverage。因此，第二个真正独立的 model 能发现 host model 漏掉的 findings；peer return 与对应 in-process twin 达成一致，是 synthesis 中最强的 promotion signal（不同 model providers、不同 processes）。更趋同的 lenses（coherence、scope-guardian）和 always-on feasibility lens 保持 single-model；特意排除 feasibility，是为了让该 pass 保持 conditional，避免每次 review 都启动 peer。

除了这些 focused twins，还会运行一次 **whole-document sweep**：由不同 provider 的 peer 以 general reviewer 身份 review *整篇* document（不限定 lens），并以 `whole-doc-<provider>` 身份 fold in。这样，不同 model 可以跨**所有** sections（feasibility、coherence、scope）寻找 blind spots，而不只检查 trio 负责的 premise lenses。它只增加一次调用，并通过 dedup fingerprint 与任意 in-process finding 交叉印证，因而无需 per-lens fan-out 就能获得广覆盖。对于 unified plan，focused trio peers 只 review 与对应 in-process twin 完全相同的 slice，以形成真实 corroboration；sweep 则刻意阅读完整 document，以获得 breadth。两种 mode 互为补充。

**Which target runs the peer** is auto-chosen and overridable. Host harness and serving family are tracked separately so the pass can exclude same-model checks. Preference precedence is conversation, `cross_model_peer:` in `.compound-engineering/config.local.yaml`, active project instructions, then `codex → claude → grok → composer`. `Cursor` is also accepted explicitly and means `cursor-agent` using its configured default/Auto model; `Composer` means a Composer model through Cursor; Grok prefers its native CLI and may use a sanctioned Grok-via-Cursor route. Cursor Auto is not promoted as independent corroboration unless a receipt proves a different serving family. See the [configuration reference](./configuration.md) for the shared local-config contract.

Skill 会先尝试声明的 model/route mappings。当当前 CLI 拒绝 obsolete 或 incompatible adapter default 时，可以在同一 target/family 以及 hard read-only、host-exclusion、authority、egress boundaries 内发现最接近的 compatible equivalent，并记录 substitution 与 actual route。显式指定的 user model 或新增接收内容的 intermediary 绝不能静默变化：route selection 必须返回 host，完成必要 disclosure 并取得 sanction。第二个 target 仍只在显式设置 `CROSS_MODEL_MAX_PEERS=2` 时启用，失败继续保持 non-blocking。

**Trust boundary：**该 pass 会把完整 document content 嵌入 peer prompt，并发送给外部 model provider（取决于最终 peer，可能是 OpenAI、Anthropic、xAI 或 Cursor）；`CROSS_MODEL_PEERS` 限制哪些 providers 可以接收内容（未设置时采用默认顺序，设置后作为 allowlist）。Peer 从没有 project context 的空 scratch dir 启动，并保持严格 read-only；所有 routes 都拒绝 writes、network、MCP 和 subagents。Read 权限分为两级：**truly tool-less** 的 claude（`--safe-mode --tools ""`，禁用所有 built-ins 并抑制 custom behavior）与 grok（拒绝 `Read`/`Edit`/`Write`/`Bash`/`Task`/web/`mcp__*`），完全没有 read tool；以及仍有少量 read 能力的 **read-only residual** routes：codex（`-s read-only`）与 cursor-agent（`--mode ask --sandbox enabled`），它们仍允许 read tool，codex 还允许 read-only shell exec。因此，影响边界是信息披露，而不是 repo mutation；script 会为每次 cross-model send 输出一行 audit log，headless mode 下也可审计 egress。Peer prompt 仅使用 document basename，因为内容已嵌入 prompt；超大 document 会干净地 skip，而不是截断。对于本项目的 own-document threat model，codex/cursor-agent routes 的 read residual 是**可接受的**：被 review 的 doc 属于 maintainer，host agent 本来就以比 peer 更高的权限在 repo 内运行，因此 peer 能读取文件不会增加实质暴露面。

### 10. Settled-decision protection（保护已定 decision）

用户已审视并确定的 decisions 带有 `session-settled:` annotation，`ce-doc-review` 会把它视为 protected content：safe-auto pass 绝不会移除 annotation；persona 若要挑战 settled decision，必须把问题表述为 infeasibility，而不是 preference。该挑战只会展示给用户作 decision，绝不会自动应用。

---

## 快速示例

`/ce-plan` 完成了 notification-mute feature 的 Standard plan。Phase 5.3.8 以 `mode:headless` 和 plan path 调用 `/ce-doc-review`。

Skill 读取 doc，通过 content-shape signals（U-IDs、plan section structure）将其分类为 `plan`，读取 `Origin:` slot，并分析 content 以选择 conditional personas。Plan 触及 UI surface（mute toggle copy），但没有 high-stakes domains，也没有提出 new abstractions。它激活 `coherence-reviewer`（always-on）、`feasibility-reviewer`（always-on，收窄到 plan-shape techniques）和 `design-lens-reviewer`（UI surface）。Adversarial、scope-guardian、security-lens 和 product-lens skip，因为它们的 triggers 在一个有 origin 的 routine plan 上没有触发。

三个 reviewers 并行分派，返回 9 个 raw findings。Synthesis merge 成 6 个 distinct findings：2 个 `safe_auto`（typo、broken cross-reference），3 个 `gated_auto`（durability tradeoff wording、U2 test scenarios 缺 missing edge case、toggle copy 上的 design-lens flag），1 个 FYI（suggested scope clarification）。

两个 `safe_auto` 直接应用。Headless mode 返回其余 structured text：没有 walkthrough，没有 per-finding routing。Post-generation menu 上方展示单行 summary：`Doc review applied 2 fixes. 3 decisions, 1 FYI remain.` 用户选择 `Start /ce-work` 并继续。如果他们想交互处理 3 个 decisions，会选择 `Run deeper doc review`。

---

## 何时使用

在以下情况使用 `ce-doc-review`：

- `/ce-brainstorm` 刚生成 requirements doc，想在 planning 前做 structured review
- `/ce-plan` 刚生成 plan，想在 execution 前做 deeper review
- 处于 headless mode，programmatic caller（chain skills）需要 structured output 的 review
- 想在 doc 上做 round-to-round refinement；decision primer 防止 loops

以下情况跳过 `ce-doc-review`：

- Doc 极短（2-bullet plan；review overhead 超过收益）
- 想要 code review，而不是 doc review -> `/ce-code-review`
- Doc 纯 informational（learning doc、release note）；没有什么可 "review for shipping"

---

## 作为工作流的一部分使用

`ce-doc-review` 被 doc-producing skills 作为 review pass 调用：

- **`/ce-brainstorm` Phase 4**：作为 post-doc options 之一提供（"Agent review of requirements doc"）；以 interactive 运行，完整 scrutiny premise，因为验证 premise 正是 brainstorm 的意义
- **`/ce-plan` Phase 5.3.8**：confidence check 后默认以 `mode:headless` 运行。`safe_auto` fixes 静默应用；remaining findings 以 one-line summary 出现在 post-generation menu 上方，`Run deeper doc review` 作为 first-class option 提供给想要 interactive walkthrough 的用户
- **`/ce-resolve-pr-feedback`**：当 reviewer feedback 落在 brainstorm 或 plan doc，而不是 code 上时

Headless mode 中，callers 接收 structured findings，并自行 route user-decision options。

---

## 单独使用

Skill 可直接作用于任何 requirements 或 plan doc：

- **Specific path（指定路径）**：`/ce-doc-review docs/plans/2026-05-04-001-feat-notification-mute-plan.md`
- **Ask the user**：无 path 调用 `/ce-doc-review` 会询问 review 哪个 doc（或 auto-find `docs/brainstorms/` 或 `docs/plans/` 中最新的）
- **Headless**：`/ce-doc-review mode:headless docs/plans/.../plan.md` 返回 structured findings，不交互 prompt

---

## 参考

| 参数 | 效果 |
|----------|--------|
| _(empty, interactive)_ | 询问要 review 哪个 doc，或 auto-find most recent |
| `<doc path>` | Review 指定 doc |
| `mode:headless <doc path>` | Headless mode；structured text output，无 prompts |

Headless mode 需要 path；没有 path 时会 error，而不是猜。

---

## 常见问题（FAQ）

**它和 `ce-code-review` 有什么区别？**
`ce-code-review` review diffs（code changes）；`ce-doc-review` review docs（requirements、plans）。不同 reviewer personas、不同 findings shape、不同 routing。二者共享 multi-persona dispatch + synthesis pattern，也使用相同 provider-selection mechanics（host attestation、preference order、codex/claude/grok/composer routes）运行 **cross-model pass**。Lens policy 不同：`ce-code-review` 只把 adversarial lens 交给 cross-model；`ce-doc-review` 会运行三项 judgment trio（adversarial、product-lens、security-lens）和 whole-doc sweep，因为 doc review 的高价值判断分散在更多 lenses。

**哪些 lenses 会 cross-model，为什么不是全部？**
只有 judgment trio（adversarial、product-lens、security-lens）拥有专门的 cross-model *twin*，因为第二个 model 的不同 priors 和 knowledge 在这些领域会产生真正不同的 findings，agreement 因而具有真实信号。Coherence 与 scope-guardian 更 convergent（第二个 model 多半只会重复），feasibility 又是 always-on；若给每个 lens 都配 twin，会导致每次 review 都 spawn peer，而不是只在值得更深 scrutiny 的 documents 上运行。不过这些 areas 并未漏掉：独立的 whole-document sweep 仍为 feasibility、coherence 和 scope 提供宽泛的 cross-model coverage，只是通过一次 general-reviewer read，而不是 per-lens twin。

**为什么 decision primer 重要？**
没有它，每轮都会重新浮现相同 findings，包括用户已经 rejected 的。Primer 使用 fingerprint + evidence-snippet matching 来 suppress rejected findings，并 verify applied fixes，让 round-to-round refinement 真正 iterate，而不是 loop。

**"Append to Open Questions" 用来做什么？**
用于用户想稍后处理、而不是现在处理的 findings。它们不会丢在 chat 里，而是 append 到 doc 的 `## Open Questions` section，让它们存活到 session 之后，并被下一个 planner / implementer 看到。

**为什么需要 bulk preview？**
因为 mass changes 值得 confirmation step。"Auto-resolve with best judgment" 听起来像 delegation，但如果 skill 静默应用 12 个 changes，你无法在没有 preview 的情况下 review，这就是 risk。Preview 会在 commit 前展示 changes，让用户可以 cancel。

**如果 persona timeout 或失败怎么办？**
Skill 会继续使用已完成 agents 的 findings，并在 Coverage section 说明 failure。单个 agent failure 不阻塞整个 review。

**它能 review requirements 和 plans 以外的文档吗？**
Personas 专门针对这两种类型调校。Review learning doc 或 release note 在机械上可行，但 persona advice 可能不适合该 artifact type。对于 broad doc review，这是合适工具；对于其他 specific types，personas 可能产生 noise。

---

## 另见（See Also）

- [`ce-brainstorm`](./ce-brainstorm.md) - 产出此 skill review 的 requirements docs
- [`ce-plan`](./ce-plan.md) - 产出此 skill review 的 plan docs；在 Phase 5.3.8 调用此 skill
- [`ce-code-review`](./ce-code-review.md) - code（diffs）的 sibling review surface
