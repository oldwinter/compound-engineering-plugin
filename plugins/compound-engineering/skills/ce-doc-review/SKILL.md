---
name: ce-doc-review
description: 使用并行 persona agents review requirements 或 plan documents，发现各角色特定的问题。当存在 requirements document 或 plan document，且用户想改进它时使用。
argument-hint: "[mode:headless] [path/to/document.md 文档路径]"
---

# Document Review（文档审查）

通过 multi-persona analysis review requirements 或 plan documents。并行派发 specialized reviewer agents，自动应用 `safe_auto` fixes，并通过四选项交互（per-finding walk-through、auto-resolve with best judgment、Append-to-Open-Questions、Report-only）路由剩余 findings 供用户决策。

## Interactive mode rules（交互模式规则）

- **任何问题触发前，预加载平台 question tool。** 在 Claude Code 中，`AskUserQuestion` 是 deferred tool，session start 时它的 schema 不可用。在 Interactive-mode work 开始时（routing question、per-finding walk-through questions、bulk-preview Proceed/Cancel 和 Phase 5 terminal question 之前），用 query `select:AskUserQuestion` 调用 `ToolSearch` 以加载 schema。要在 Interactive flow 顶部 eager 地加载一次，不要等到第一个提问点。Codex、Gemini 和 Pi 不需要这个 preload。
- **只有当 harness 真正缺少 blocking question tool 时，才使用 numbered-list fallback**：`ToolSearch` 没有返回匹配、tool call 明确失败，或 runtime mode 不暴露它（例如 `request_user_input` 不可用的 Codex edit modes）。pending schema load 不是 fallback trigger；按 pre-load rule 先调用 `ToolSearch`。在 genuine-fallback 情况下，以编号列表呈现 options 并等待用户回复，绝不要静默跳过问题。因为 tool 麻烦、模型处于 report-formatting mode，或指令埋在长 skill 里，就把问题渲染为 narrative text，这是 bug。需要用户决策的问题，必须触发 tool，或明确 fallback。
- **Subagent dispatch 使用 bounded parallelism。** 尊重 active-subagent limit；把 spawn errors as backpressure, not reviewer failure，并 queue the remainder，等 slot 释放后继续。

## Phase 0：Detect Mode（检测模式）

检查 skill arguments 是否包含 `mode:headless`。Arguments 可能包含 document path、`mode:headless`，或两者都有。以 `mode:` 开头的 tokens 是 flags，不是 file paths：从 arguments 中剥离它们，并将剩余 token（如有）作为 Phase 1 的 document path。

如果存在 `mode:headless`，后续 workflow 设置为 **headless mode**。

**Headless mode** 改变 interaction model，而不是 classification boundaries。ce-doc-review 仍使用相同判断来决定每个 finding 属于哪个 tier。唯一差异是 non-safe_auto findings 的交付方式：

- `safe_auto` fixes 会静默应用（与 interactive 相同）
- `gated_auto`、`manual` 和 FYI findings 会以 structured text 返回给 caller 处理：没有 blocking-question prompts，没有 interactive routing
- Phase 5 立即返回 "Review complete"（无 routing question，无 terminal question）

caller 收到保留原始 classifications 的 findings，并决定如何处理。

Callers 通过在 skill arguments 中包含 `mode:headless` 来调用 headless mode，例如：

```
Skill("ce-doc-review", "mode:headless docs/plans/my-plan.md")
```

如果不存在 `mode:headless`，skill 会以默认 interactive mode 运行，包含 `references/walkthrough.md` 和 `references/bulk-preview.md` 中记录的 routing question、walk-through 和 bulk-preview behaviors。

## Phase 1：Get and Analyze Document（获取并分析文档）

**如果提供了 document path：** 读取它，然后继续。

**如果未指定 document（interactive mode）：** 询问要 review 哪个 document，或使用 file-search/glob tool（例如 Claude Code 中的 Glob）在 `docs/brainstorms/` 或 `docs/plans/` 中查找最新文件。

**如果未指定 document（headless mode）：** 输出 "Review failed: headless mode requires a document path. Re-invoke with: Skill(\"ce-doc-review\", \"mode:headless <path>\")"，不要派发 agents。

### Classify Document Type（分类文档类型）

通过阅读 document 的 **content shape** 分类，而不是根据 file path。Path 是 tie-breaker hint，不是 primary signal：放在 `docs/plans/` 下的 brainstorm-style doc 仍应分类为 `requirements`，而 `docs/brainstorms/` 下的 plan-shaped doc 仍应分类为 `plan`。下面的 reviewers 会根据该 classification 采用不同操作，因此把 plan-shaped doc 错分为 requirements doc（或反过来）会产生嘈杂或审查不足的 findings。

使用这些 signals 来决定：

**`requirements` signals（描述“构建什么”的文档）：**
- Frontmatter fields，例如 `actors:`、`flows:`、`acceptance_examples:`，或携带 brainstorm-shaped values 的 `status:`
- Section headings，例如 `Acceptance Examples`、`Actors`、`Key Flows`、`User Flows`、`Outstanding Questions`、`Resolve Before Planning`
- `R1`、`R2`、`A1`、`F1`、`AE1` 形式的 numbered identifiers：requirement、actor、flow 和 acceptance-example IDs
- Prose framing 聚焦 user/business problem、behavior、scope boundaries、success criteria
- 没有 implementation units，没有 per-unit file lists，没有附到 units 上的 test scenarios

**`plan` signals（描述“如何构建”的文档）：**
- Frontmatter fields，例如 `type: feat|fix|refactor`、`origin: docs/brainstorms/...`
- Section headings，例如 `Implementation Units`、`Output Structure`、`Key Technical Decisions`、`Risks & Dependencies`、`System-Wide Impact`
- `U1`、`U2` 形式的 numbered identifiers：implementation unit IDs
- 名为 `Goal`、`Files`、`Approach`、`Test scenarios`、`Verification` 的 per-unit fields
- 要 create/modify/test 的 repo-relative file paths
- Prose framing 聚焦 technical decisions、sequencing 和 implementer-facing detail

**Tie-breaker rule。** 当 content signals 混合或稀疏时，回退到 path：`docs/brainstorms/` → `requirements`，`docs/plans/` → `plan`。当两个 path location 都不适用时，以 dominant content shape 为准；如果 shape 真正模糊，默认 `requirements`（更保守的 classification，会激活更少 plan-specific feasibility checks）。

通过 subagent template 中的 `{document_type}` slot 将 classification result 传给每个 persona。Personas 会读取它并相应调整分析。

### Select Conditional Personas（选择条件 Personas）

分析 document content，决定激活哪些 conditional personas。检查这些 signals：

**product-lens** -- 当 document 对“构建什么、为什么构建”提出可挑战的 claims，或 proposed work 具有超出眼前问题的 strategic weight 时激活。系统用户可以是 end users、developers、operators、maintainers 或任何其他 audience，标准是 domain-agnostic。检查任一 leg：

*Leg 1 — Premise claims:* document 对构建什么或为什么构建下注，而 knowledgeable stakeholder 可以合理挑战它；不只是描述任务或重述已知 requirements：
- 所述 need 并非从 existing context 中不言自明，而是 non-obvious 或 debatable 的 problem framing
- 可能存在 alternatives（implicit 或 explicit）的 solution selection
- 明确排序 built vs deferred 的 prioritization decisions
- 预测具体 user outcomes 的 goal statements，而不是只重述 constraints 或描述 deliverables

*Leg 2 — Strategic weight:* 即使 premise 成立，proposed work 也可能影响 system trajectory、user perception 或 competitive positioning：
- 会塑造系统如何被感知，或系统以什么为人所知的 changes
- 影响 adoption、onboarding 或 cognitive load 的 complexity/simplicity bets
- 打开或关闭 future directions 的 work（path dependencies、architectural commitments）
- Opportunity cost implications：构建这个意味着不构建其他东西

**design-lens** -- 当 document 包含以下内容时激活：
- UI/UX references、frontend components 或 visual design language
- User flows（用户流程）、wireframes（线框）、screen/page/view mentions
- Interaction descriptions（交互描述：forms、buttons、navigation、modals）
- responsive behavior（响应式行为）或 accessibility references

**security-lens** -- 当 document 包含以下内容时激活：
- Auth/authorization mentions、login flows（登录流程）、session management
- 暴露给 external clients 的 API endpoints
- Data handling（数据处理）、PII、payments、tokens、credentials、encryption
- 带 trust boundary implications 的 third-party integrations

**scope-guardian** -- 当 document 包含以下内容时激活：
- 多个 priority tiers（P0/P1/P2、must-have/should-have/nice-to-have）
- 较大的 requirement count（>8 个 distinct requirements 或 implementation units）
- Stretch goals、nice-to-haves 或 "future work" sections
- 看起来与 stated goals 不一致的 scope boundary language
- 没有清晰连接到 requirements 的 goals

**adversarial** -- 当 document 包含 high-value challenge surface 时激活，而不是仅因 structural complexity。带有 stated rationale 的 routine plans 本身不是 adversarial signal；当唯一 signal 是“this plan is well-structured”时，premise/assumption work 会重新审理已 settled questions。满足以下任一条件时激活：

- document 是带有 2+ challengeable claims（problem framing、solution selection、prioritization、predicted outcomes）的 **requirements document**：premise scrutiny 是 brainstorm phase 的核心
- document 触及 **high-stakes domain**：auth、payments、billing、data migrations、privacy/compliance、external integrations、cryptography，不论 doc type 或 size
- document **提出新的 abstraction、framework 或 significant architectural pattern**，不论 doc type
- document 是 **没有 `origin:` requirements doc 的 plan**（greenfield bootstrap）：premise 没有在上游验证
- document 是 **显式扩展其 origin requirements doc scope 的 plan**（new actors、new flows、deferred-then-restored features）
- document 包含 **explicit alternatives section** 或 unresolved tradeoffs：adversarial 有助于 stress-test 选定方向

Do NOT 对来自 validated origin requirements doc、保持 scope 内、且未引入 high-stakes domains 或 new abstractions 的 routine plan document 激活 adversarial。plan 的 structural decisions（更多 units、更多 rationale）本身不是 adversarial signal；那是 plan 在做自己的工作。

## Phase 2：Announce and Dispatch Personas（宣布并派发 Personas）

### Announce the Review Team（宣布 Review Team）

告诉用户哪些 personas 会 review，以及为什么。对 conditional personas，包含 justification：

```
Reviewing with:
- ce-coherence-reviewer (always-on)
- ce-feasibility-reviewer (always-on)
- ce-scope-guardian-reviewer -- plan has 12 requirements across 3 priority levels
- ce-security-lens-reviewer -- plan adds API endpoints with auth flow
```

### Build Agent List（构建 Agent 列表）

始终包含：
- `ce-coherence-reviewer`
- `ce-feasibility-reviewer`

添加已激活的 conditional personas：
- `ce-product-lens-reviewer`
- `ce-design-lens-reviewer`
- `ce-security-lens-reviewer`
- `ce-scope-guardian-reviewer`
- `ce-adversarial-document-reviewer`

### Dispatch（派发）

使用平台的 subagent primitive 以 **bounded parallelism** 派发 agents（例如 Claude Code 中的 `Agent`、Codex 中的 `spawn_agent`、Pi 中通过 `pi-subagents` extension 使用 `subagent`）。省略 `mode` 参数，让用户配置的 permission settings 生效。尊重当前 harness 的 active-subagent limit：将 selected reviewers 入队，只派发 harness 接受的数量，并在 reviewers 完成后填充释放的 slots。将 active-agent/thread/concurrency-limit spawn errors 视为 backpressure，而不是 reviewer failure：让 reviewer 保持 queued，并在 slot 释放后重试。只有在 successful dispatch 后 timeout/fail，或 dispatch 因 non-capacity reason 失败时，才将 reviewer 记录为 failed。

每个 agent 接收由下方 subagent template 构建、并填入这些 variables 的 prompt：

| Variable | Value |
|----------|-------|
| `{persona_file}` | Full content of the agent's markdown file |
| `{schema}` | Content of the findings schema included below |
| `{document_type}` | Phase 1 classification 得到的 "requirements" 或 "plan" |
| `{document_path}` | document 的 path |
| `{origin_path}` | document 的 `origin:` frontmatter field 值（如果存在），或缺失时的 literal string `none`。会根据 origin 调整的 personas（product-lens、adversarial、scope-guardian）读取此 slot 来 gate technique suppression；它们自己 do NOT 重新解析 frontmatter。Phase 1 读取期间只提取一次。 |
| `{document_content}` | document 全文 |
| `{decision_primer}` | 当前 session 中累计的 prior-round decisions，或 round 1 的空 `<prior-decisions>` block。见下方 "Decision primer"。 |

向每个 agent 传入 **full document**，不要拆成 sections。

### Decision Primer（决策引导）

在 round 1（没有 prior decisions）中，将 `{decision_primer}` 设为：

```
<prior-decisions>
Round 1 — no prior decisions.
</prior-decisions>
```

在 round 2+（当前 interactive session 中已有一轮或多轮 prior rounds）中，累计 prior-round decisions 并渲染为：

```
<prior-decisions>
Round 1 — applied (N entries):
- {section}: "{title}" ({reviewer}, {confidence})
  Evidence: "{evidence_snippet}"

Round 1 — rejected (M entries):
- {section}: "{title}" — Skipped because {reason}
  Evidence: "{evidence_snippet}"
- {section}: "{title}" — Deferred to Open Questions because {reason or "no reason provided"}
  Evidence: "{evidence_snippet}"
- {section}: "{title}" — Acknowledged without applying because {reason or "no suggested_fix — user acknowledged"}
  Evidence: "{evidence_snippet}"

Round 2 — applied (N entries):
...
</prior-decisions>
```

每个 entry 都携带 `Evidence:` line，因为 synthesis R29（rejected-finding suppression）和 R30（fix-landed verification）都会把 evidence-substring overlap check 用作 matching predicate 的一部分。如果 primer 中没有 evidence snippet，orchestrator 无法计算 `>50%` overlap test，只能回退到 fingerprint-only matching，这会重新浮现 rejected findings，或过度 suppress。`{evidence_snippet}` 是 finding 的第一条 evidence quote，截断到前约 120 字符（在边界保留完整 words），并转义内部 quotes。如果一个 finding 有多条 evidence entries，使用第一条；其余留在 run artifact 中，overlap check 不需要。

在当前 session 的所有 rounds 中累计。Skip、Defer 和 Acknowledge actions 为 suppression purposes 都计为 "rejected"：每个都表示用户认为该 finding 在本轮不值得 action（Acknowledge 是 no-fix-guard variant：用户看到没有 `suggested_fix` 的 finding，没有明确 defer 或 skip，而是记录 acknowledgement；对 round-to-round suppression 来说，它在语义上等同于 Skip）。Applied findings 保留在 applied list 上，让 round-N+1 personas 能验证 fixes landed（见 `references/synthesis-and-presentation.md` 中的 R30）。

Cross-session persistence 不在 scope 内。对同一 document 的新 ce-doc-review invocation 会从新的 round 1 开始，且没有 carried primer，即使 prior sessions 已将 findings deferred 到 document 的 Open Questions section。

**Error handling：** 如果某个 agent 失败或 timeout，继续使用已完成 agents 的 findings。在 Coverage section 中注明 failed agent。不要因为单个 agent failure 阻塞整个 review。

**Dispatch limit：** 即使在最大规模（7 agents）下，也使用 bounded parallel dispatch。如果 harness cap 低于 selected team size，将剩余项入队，并在 active reviewers 完成时启动它们。

## Phases 3-5：Synthesis、Presentation 和 Next Action

所有 dispatched agents 返回后，读取 `references/synthesis-and-presentation.md`，了解 synthesis pipeline（validate、anchor-based gate、dedup、cross-persona agreement promotion、resolve contradictions、auto-promotion、按三层 tier 路由并带 FYI subsection）、`safe_auto` fix application、headless-envelope output，以及 handoff 到 routing question。

对于四选项 routing question 和 per-finding walk-through（interactive mode），读取 `references/walkthrough.md`。对于 best-judgment routing、Append-to-Open-Questions 和 walk-through `Auto-resolve with best judgment on the rest` 所使用的 bulk-action preview，读取 `references/bulk-preview.md`。不要在 agent dispatch 完成前加载这些文件。

---

## Included References（内联参考）

### Subagent Template（Subagent 模板）

@./references/subagent-template.md

### Findings Schema（Findings Schema，finding schema）

@./references/findings-schema.json
