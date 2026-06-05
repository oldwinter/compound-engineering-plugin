---
date: 2026-04-24
topic: surface-scope-earlier
---

# 在 ce-brainstorm 和 ce-plan 中更早 Surface Scope

## 问题框架

Issue #676（jrdncstr）反馈：CE 对 greenfield/low-stakes work 很好用，但在 brownfield codebases 中会变成负担：brainstorms 和 plans 达到 300+ 行，artifacts 过度防御，rewrites 持续存在，不管怎么 steering，PRs 都保持 1000+ 行。他建议添加 `--pragmatic` flag。

表层建议（mode 或 flag）不是正确 fix。**Scope under-visibility 是 upstream cause；artifact density 和 PR diff size 是 downstream symptoms。** ce-brainstorm 和 ce-plan 都会将 user input + agent inference synthesize 成 interpretation，但用户直到 doc 落地才看到该 synthesis。用户在 dialogue 中同意了许多单项内容，却从未看到整体；agent 做出大量 inferences（尤其在 ce-plan solo invocation 中，Phase 0.4 bootstrap 按设计很简短），然后基于 unverified scope 写文档。write-time 的 surprise 意味着 rework，而 rework 在下游看起来像 artifact bloat。

**Working hypothesis：** 修复 cause，也就是在 doc-write 前向用户 surface synthesis，symptoms 就会缓解。如果没有缓解，density-control tools（calibrated exemplars、defensive sections 的 brevity passes）将成为 follow-up。现在把它们与 cause fix 一起发布会混淆 attribution（到底哪个机制有效？），为可能不需要的价值增加 maintenance surface，并在测试 cause fix 是否能消解症状前追逐症状。

fix 位于 templates 和 phase additions 中：不新增 mode，不新增 flag，不新增 user-facing classification question。Scope tiers 保持不变。

Related（相关）：[GitHub Issue #676](https://github.com/EveryInc/compound-engineering-plugin/issues/676)

---

## 参与者

- A1. **ce-brainstorm agent**：生成 requirements documents。当前会进行大量 pre-write dialogue，但从不在 doc-write 前 surface whole-scope synthesis。
- A2. **ce-plan agent**：生成 implementation plans。当前 solo invocation 中 interview 很少（Phase 0.4 "keep it brief"），并且从不在 research 或 plan-write 前 surface synthesized scope。
- A3. **End-user developer**：当 artifacts over-invest 时支付 cognitive-debt cost，当 scope 被误解时支付 rework cost，当 PRs over-reach 时支付 review cost。

---

## 需求

### R1. ce-brainstorm synthesis summary（synthesis 摘要）

在 Phase 3（write requirements doc）前，ce-brainstorm 向用户 surface synthesis summary。对**所有 tiers**触发，包括 Lightweight；其价值一部分是 synthesis confirmation，另一部分是 transition checkpoint（"about to write a doc"），让用户有 permission proceed 或 redirect。

结构：

- **Stated** — 用户直接说过的内容（prompt、prior conversation、dialogue answers、approach selection）
- **Inferred** — agent 为填补 gaps 所作 assumptions（用户从未明确命名的 scope boundaries、从 intent 推导的 success criteria）
- **Out of scope** — 有意排除的 items（adjacent work、refactors、nice-to-haves）

长度：Lightweight 使用一段 paragraph 加简短 lists；Standard/Deep 使用几段 paragraphs 和显式 lists。Open prose prompt 邀请 feedback：*"Does this match your intent? Tell me what to add, remove, redirect, or that I got wrong — or just confirm to proceed."*

即使 synthesis 准确反映了用户 stated answers，用户也可 rebut（他们可能改变主意、浮现新 context、修正 unstated assumptions）。soft-cut 基于**circularity**（同一 item 被 revised 两次）触发，而不是 iteration count；跨 rounds 的 new-item revisions 不设上限。

始终作为 requirements doc 的第一 section embed。**Headless mode**（pipeline / `disable-model-invocation` context）：跳过 prompt，并 embed synthesis，但**省略 Inferred list**；pipelines 在没有 human review 的情况下消费，把 un-validated agent inferences 作为 authoritative content 传播是不安全的。

### R2. ce-plan synthesis summary（invocation-context-aware，感知调用上下文）

与 R1 相同的 Stated/Inferred/Out structure、prose、soft-cut、always-embed 和 headless behavior。两个 timing variants：

- **Solo invocation**（没有 upstream brainstorm doc）：在 **Phase 0.4 bootstrap 之后、Phase 1 research 开始前**触发。它能在 sub-agent dispatch 开销发生前捕获 scope misinterpretation。Synthesis 覆盖完整 breadth：problem frame、intended behavior、success criteria、in/out scope。这里的 "Inferred" list 尤其 load-bearing，因为 Phase 0.4 会从 brief interview 中做大量 inferences。
- **Brainstorm-sourced invocation**：在 **Phase 1 research 之后、Phase 5.2 plan-write 前**触发。Brainstorm doc + R1 已验证 WHAT。Synthesis 聚焦 brainstorm 未决定的 plan-time decisions：哪些 files/modules 会 touch（以及不会 touch）、哪些 patterns 被 extend vs. introduced new、test scope（existing-but-untested code 中哪些 in/out）、以及 tangential refactor scope。

State-machine guards（在 SKILL.md 中显式，而不是隐式）：

- 在 Phase 0.1 fast paths（resume existing plan、deepen-intent）上 skip；synthesis 是 pre-write，不适用于 doc 已存在的情况
- 当 Phase 0.4 routes out（ce-debug、ce-work、universal-planning）时 skip；agent 已离开 planning workflow
- Solo variant 在 Phase 0.2 找到 brainstorm doc 时 skip（defer 到 brainstorm-sourced variant）

Self-redirect support：如果用户浮现 "this is bigger than I thought, let me brainstorm first" 或类似内容，agent 停止，建议 alternative skill，并提供在 session 中加载它。不在 upfront 询问 "do you want to brainstorm first?"，因为这会给 common case 增加 friction。

Graceful fallback：如果 origin brainstorm doc 缺少 R1 synthesis section（旧 brainstorms、手写文档），R2 brainstorm-sourced 正常运行；其内容独立于 origin synthesis 是否存在。

### R3. ce-plan 中的 anti-expansion clause

tangential refactors 和 scope expansions 都进入 deferred-items list，而不是 active diff。Touched files 中发现 cleanup -> deferred。"While we're here, we could also..." -> deferred。Adjacent improvements -> deferred。通过设定 synthesis surface 的默认值来强化 R2。

---

## 验收示例

- AE1. **Covers R1。** 给定 brainstorm task，ce-brainstorm 在 doc-write 前 surface synthesis（Stated / Inferred / Out）。用户可以 confirm、add、remove、redirect 或 change their mind，即使 synthesis 准确反映 dialogue 中所说内容。confirmed synthesis 作为 requirements doc 第一 section embed。headless mode 中，synthesis 无 prompt embed，且不含 Inferred list。
- AE2. **Covers R2（solo）。** 给定没有 upstream brainstorm doc 的 /ce-plan invocation，在 Phase 0.4 bootstrap 后、Phase 1 research 开始前，agent surface full-breadth synthesis，并含显式 "Inferred" list。用户可以纠正（"actually I want the whole password reset feature, not just the link"），research 基于 corrected scope 运行。
- AE3. **Covers R2（brainstorm-sourced）。** 给定匹配 brainstorm doc 的 /ce-plan invocation，在 Phase 1 research 后、plan-write 前，agent surface plan-time-focused synthesis（哪些 files 会/不会 touch、哪些 patterns 被 extend、test scope、refactor scope）。假设 brainstorm-validated WHAT 已成立，不重新陈述。

---

## 成功标准

**直接验证 outcomes（结果）**（本 iteration 测试这些）：

- ce-brainstorm 和 ce-plan 都在 doc-write 前 surface scope synthesis。用户有清晰机会纠正 inferences、redirect 或 confirm。
- Solo ce-plan invocations 会在 research 开销发生前专门捕获 scope errors。
- Headless mode embeds synthesis（without Inferred），让 human PR reviewer 能看到 scope 是如何被 auto-interpreted 的。
- Greenfield protection：在本 plugin 当前 work 上做 in-repo validation，显示无 regression。

**预期 downstream effects（下游效果）**（upstream cause-fix 的后果；不直接 enforce 或 validate）：

- PR diff size 会收敛到 confirmed scope 实际需要的规模。
- rewrite frequency 下降，因为 tangential refactors 进入 deferred items（R3），而不是 active diff。
- misdirected research 的 token spend 下降，因为 solo ce-plan invocations 会在 sub-agent dispatch 前捕获 scope errors。
- Artifact density（defensive Outstanding Questions、placeholder template-tail sections）与 confirmed-scope size 成比例；这是 speculative，但足以作为 post-rollout signal，判断是否稍后需要发布 density-control tools（deferred，见 Scope Boundaries）。

如果这些 downstream effects 在 Phase A 发布后没有出现，说明 diagnosis 是错的。这是真实 signal，不是 partial win。将 jrdncstr repo（或 comparable case）的 post-rollout PR-size telemetry 视为 causal claim 的实际 validation。

---

## 范围边界

- 不添加新 mode、flag、command 或 user-facing classification question
- 不改变现有 Lightweight/Standard/Deep tier classification
- 不添加 diff-size budgets 或 PR-size gates（Goodhart concerns）
- 不修改 ce-work 或其 handoff
- 不在 ce-plan solo synthesis 中复制 ce-brainstorm dialogue（R2 solo 是 synthesis checkpoint，不是 brainstorm-style interview）
- 不触碰 auto-deepening（Phase 5.3），保留其 load-bearing depth
- 不为 headless-mode embedded synthesis 引入 automated validation（human PR reviewer 是 safety net；这是 documented limitation）
- 不扩展 ce-doc-review 来 validate synthesis sections

**Depth-calibration mechanisms deferred to follow-up：** 该 brainstorm 的早期草稿曾提出 calibrated tier exemplars、ce-brainstorm 中 defensive sections 的 targeted brevity passes，以及 plan template-tail sections 的 brevity passes。这些是 density-control tools，直接针对 *output density*。在 working hypothesis 中，scope under-visibility 是 upstream cause，density 应自然跟随 disciplined scope。将 density-control tools 与 cause fix 一起发布会混淆 attribution，增加 maintenance surface，并在测试 cause fix 是否能消解症状前追逐症状。**只有当 post-rollout signals 显示本 iteration 发布后 density problems 仍存在时，才 revisit。**

---

## 关键决策

- **Working hypothesis：scope under-visibility 是 upstream cause；density 是 downstream。** Post-rollout signals 才是实际 validation。如果 real-user feedback 显示尽管 synthesis discipline 存在，density problems 仍持续，则 density-control tools 成为 follow-up。
- **两个不同 synthesis-summary mechanisms（R1、R2），而不是一个共享机制。** ce-brainstorm 有大量 pre-write dialogue；summary 更短，作为 synthesis confirmation + transition checkpoint。ce-plan 在 solo mode 中 pre-write interview 很少；summary 更早触发（pre-research），也更详细。同样的 Stated/Inferred/Out structure，但每个 skill 的 timing 和 shape 不同。
- **ce-plan 中没有 "do you want to brainstorm first?" fork。** 显式 forks 会给 common case 增加 friction。synthesis 让用户在意识到需要 brainstorming 时 self-redirect。
- **Solo ce-plan synthesis 在 pre-research 触发，而不是 pre-write。** pre-research 能在 correction 成本低时捕获 scope errors（尚未花费 sub-agent dispatch）。
- **Brainstorm-sourced ce-plan synthesis 在 pre-write 触发，而不是 pre-research。** Brainstorm 验证 WHAT；plan-time decisions 在 research 中浮现，因此 pre-write 捕获它们。
- **Stated/Inferred/Out 是 load-bearing structure。** 它对 input richness 保持中立（one-line prompts 和 rich prior conversation 都适用），并迫使 agent 诚实说明有多少内容是 assumed，而不是 agreed。
- **Open prose，而不是 AskUserQuestion。** 在 SKILL.md 中 inline 引用 Interaction Rule 5(a)，防止未来“修复”回 menu；option sets 会泄漏 agent 对 valid corrections 的 framing。
- **Headless mode 省略 "Inferred" list。** Pipelines 在没有 human review 时消费；传播 un-validated inferences 为 authoritative 是不安全的。
- **Soft-cut 基于 circularity，而不是 iteration count。** 修正错误 synthesis 的不同 aspects 正是该机制应支持的内容。
- **始终将 synthesis embed 为 doc 第一 section。** 给 human PR reviewers 的 self-describing artifact；headless 中没有 auto-validation（接受的 limitation）。
- **分阶段交付：Phase A（ce-brainstorm）先于 Phase B（ce-plan）。** 先在较小 surface 验证更简单的 synthesis mechanism。
- **Rejected：diff budgets**（Goodhart failure mode，容易诱导指标投机）。
- **Deferred：depth-calibration mechanisms**（calibrated exemplars + brevity passes，深度校准机制）。只有 post-rollout signals 显示 density problems 持续存在时才 revisit。

---

## 依赖与假设

- 假设 ce-brainstorm Phase 2->3 boundary，以及 ce-plan Phase 0.6->1.1 boundary 和 pre-Phase-5.2 boundary，可容纳新的 synthesis-summary phases，而不需要 restructuring。planning 期间需要 codebase verification。
- 假设 skill-isolation rules 继续禁止 cross-skill references。Synthesis-summary template content 会在 ce-brainstorm 和 ce-plan reference directories 之间 duplicate。
- 假设用户会参与 synthesis summary，而不是跳过。如果用户例行 confirm without reading，该机制会退化为 invisible scope drift。值得将 prompt 构造成鼓励扫描（"look at the Inferred list — did I assume anything wrong?"）。
- ce-plan Phase 0.3（origin-doc carry-forward）必须处理 first section 是新 synthesis 的 brainstorm doc。Phase A 前验证；如果不兼容，相关 fix 与 R1 一起落入 Phase A。

---

## 未决问题

### 延后到 Planning 阶段

- [Affects R1, R2][Technical] synthesis-summary prompt template 的精确 wording。根据 learning #9（`pass-paths-not-content-to-subagents.md`），phrasing matters more than meta-rules。implementation 期间编写；如果早期 manual validation 显示 drift，则迭代。
- [Affects R1, R2][Technical] `synthesis-summary.md` content 是每个 skill 一个文件（ce-plan version 中同时包含 solo 和 brainstorm-sourced variants），还是拆分。默认：每个 skill 一个文件，在 ce-plan version 中有两个清晰标记 sections。
- [Affects R2][Technical] solo-mode prompt 使用 blocking question tool，还是 chat-output-with-natural-interrupt。Tradeoff：blocking 更可靠但增加 friction；natural interrupt friction 更低但更容易被跳过。planning 期间决定。

---

## 下一步

-> `/ce-plan` 进入 implementation planning（实现计划）。
