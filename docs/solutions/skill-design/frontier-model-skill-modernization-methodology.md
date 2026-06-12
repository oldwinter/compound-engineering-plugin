---
title: Frontier-model skill 现代化方法论
date: 2026-06-10
category: skill-design
module: compound-engineering
problem_type: design_pattern
component: development_workflow
severity: medium
applies_when:
  - "根据当前 frontier-model prompting guidance review 或 modernize 现有 skill"
  - "决定压缩枚举式 judgment examples，还是在 SKILL.md 中保留 protocol text 原文"
  - "设计 model-tier vocabulary 和 sub-agent fleets 的 degradation rules"
  - "把 load-bearing skill content 抽取到 reference files，并配套 inline load stubs"
  - "用 injected-subagent evals 验证 skill prose changes，而不是依赖 cached plugin dispatch"
tags:
  - skill-design
  - prompting-guidance
  - frontier-models
  - model-tiers
  - context-window
  - reference-extraction
  - load-reliability
  - subagent-evals
---

# Frontier-Model Skill 现代化方法论

## Context（背景）

我们根据 Claude Fable 5 prompting guide 和 Claude prompting best-practices doc，modernize 了 `ce-ideate` skill（一个约 13-agent 的 ideation orchestrator），随后用 transcript-graded eval 验证结果。Review 浮现了一套可重复的方法论，可把任何 orchestration-heavy skill 提升到 frontier-model 标准：该 skill 从 424 行降到 372 行（-12%），同时还 *增加* 了 capability（model tiering、file-based data flow、ceiling-raising dispatch mechanics），eval 的 8 个 mechanical assertions 中 6 个通过、0 个失败。本文把这套 sequence 泛化，让下一个 skill review（ce-plan、ce-brainstorm、ce-code-review 等）从 playbook 开始，而不是重新发现。

---

## Guidance（指导）

按顺序执行这些步骤。每一步都有命名 test 或 rule：应用 test，不要即兴判断。

### 1. Audit：把每个 prescriptive block 分类为 PROTOCOL 或 JUDGMENT

从头到尾读取 skill，并标注每个 instruction block：

- **PROTOCOL** — *要做什么*：output-format resolution order、cache file shapes、scratch paths、read budgets、agent counts、checkpoint mechanics。它们清晰明确，不消耗强模型能力，而且没有它们 workflow 会机械性破坏。**完整保留 prescription。**（`git-workflow-skills-need-explicit-state-machines.md` 是 canonical example：这类 protocol content 一旦 softening 成 prose 就会退化。）
- **JUDGMENT** — *如何思考*：枚举式 example lists、多行 sample classification tables、围绕单一原则的多段阐释。Frontier model 已经具备该能力；prescription 只会收窄它。**可以考虑压缩。**

Test：*只给 principle，强模型是否会正确行动？* 如果是，它就是 JUDGMENT。如果没有它 skill 会产生错误 file paths、错误 agent counts 或 broken handoffs，它就是 PROTOCOL。

这细化了（而不是替代）plugin `AGENTS.md` Skill Design Principles 中的三层 prescription model：hard rules / strong guidance / trust。Protocol 对应 hard rules；protocol-vs-judgment test 决定其他 block 应落在哪一层。

### 2. 删减任何内容前，先确立 orchestrator-model floor

只有当 skill 现实中会运行在 frontier models 上时，裁剪 JUDGMENT prescription 才安全。在 review notes 中明确写出 floor argument。对 ce-ideate 来说：任何在任何平台上启动 13-agent workflow 的用户都会选择 frontier model，所以 floor 成立。如果某个 skill 可能运行在 small models 上（例如轻量 formatting skill），就保留更多 scaffolding。Fable guide 的 warning 是锚点："Skills developed for prior models are often too prescriptive for Claude Fable 5 and can degrade output quality."

### 3. Prune：把每个 JUDGMENT block 压缩成 principle + 一个 contrast pair

压缩规则：用底层 principle 和一个最小 contrast pair 替换 enumeration，让边界清楚到无法误解。ce-ideate 中的一个例子：vague-phrase examples 列表被压缩为 "`browser sniff` is identifiable, `quick wins` is not — vagueness is about referent, not length." 一个 pair 足以承载 distinction；七行 table 不会承载更多。也要去重：三处重复 boilerplate 变成一个完整副本 + pointers。这匹配更广泛的原则：优先用 principles + named test，而不是枚举 specifics；specifics 会 drift。（auto memory [claude]）

### 4. Tier：语义化定义 cost tiers，一次定义，到处按名称引用

在 SKILL.md 中集中定义三档；其他地方只引用 tier name，不引用 model name：

- **Extraction tier** — 最便宜的 capable model。用于 scouts、retrieval、quoting。
- **Generation tier** — mid-tier model。用于 evidence-driven generation、mechanical verification。
- **Ceiling tier** — *通过省略 model parameter 继承 orchestrator 的模型*。永远不要为 ceiling 命名具体 model。

随 tiers 一起传递的规则：

- Per-platform model hints 遵循 plugin 现有的 platform-enumeration pattern（与 blocking-question tools 使用相同 shape）；不要在 pass-through skill content 中固定其他 vendors 的 model names，命名 drift 比 release cadence 更快。注意：converter 会把 `model:` params 传播到所有 targets（见 `best-practices/ce-pipeline-end-to-end-learnings.md`），所以 tier hints 不是 Claude-only decoration。
- **Degradation rule**：当平台的 subagent primitive 缺少 per-agent model selection 时，所有 dispatch 都使用 inherited model，同时保留 read budgets / output caps。成本控制来自结构，而不是 tiering。把这条 rule 写进 skill；它在我们的 eval 中正确触发（harness 没有 nested dispatch）。
- **Architecture principle**：分离 evidence-gathering（cheap extraction scouts 产出 quote+pointer dossiers）和 ceiling reasoning（强模型只用于 choke points：ceiling framing、cross-cutting synthesis、final arbitration）。这比把 uniform fleet 喂给 thin summary 更便宜，也更 grounded。

### 5. 优化 context：只抽取 conditional / late content，并把 bulk data 移到文件

两个独立杠杆：

- **Reference extraction 只对 CONDITIONAL 或 LATE-SEQUENCE content 有收益。** 早期 unconditional content 没有收益：它一开始就会被读取并随身携带，还多一次 read round-trip。Test：*这段 content 执行前会发生多少 turns 的其他工作？它是否可能完全不执行？* ce-ideate 的 Phase 2（约 100 行，占文件约 22%，在 5-8 turns grounding 后运行）符合；Phase 0 gating 不符合。
- **Data flows 通常比 prose 更占 context。** 两者都要估算：5 个 scouts × 150 行 dossiers ≈ 10k tokens，如果 inline 返回，后续每 turn 都要携带，超过整个 SKILL.md（约 6k）。修复：subagents 把 outputs 写入 scratch files（`/tmp/compound-engineering/<skill>/<run-id>/...`），只返回 3-5 行 gist；downstream agents 接收 paths 并自己读取文件。这在既有 path-passing pattern（`skill-design/pass-paths-not-content-to-subagents.md`）基础上加入 gist refinement：orchestrator 只保留足够 routing 的 orientation，不携带 bulk。

### 6. Load-stub design：让抽取出的 references 信息不对称

Soft pointer（"see references/X.md for details"）会被跳过。抽取 load-bearing content 时，inline stub 必须满足五个属性：

1. **Load-instruction-only** — 没有 spec、没有 contract、没有可 improvisation 的内容。把 "should load" 变成 "不 load 就无法继续"。
2. **准确说明 reference 包含什么**，并说明这些 details 在 main body 中没有出现。
3. **用 skill 自己的术语说明 skipping 的 failure mode**（例如 "improvising produces unverifiable candidates — the precise failure this skill exists to prevent"）。
4. **关闭 inline-information leaks** — 任何因其他原因仍保留 inline 的数字或 detail，都要明确 disclaimer（例如 "the fleet counts in Phase 0.6 are cost transparency, not the dispatch spec"）。
5. **预先阻断 rationalizations**（例如 "'Quickly' means smaller volume targets, not skipping the reference"）。

Defense in depth：让 downstream phases 锚定在 *不同* reference files 上（rejection criteria、section contract），这样 skipped load 会显性失败，而不是静默退化。

这是 `skill-design/post-menu-routing-belongs-inline.md` 的补充：always-on content 要 inline；真正 conditional 或 late-sequence、但触发时必须读取的内容，使用 information-asymmetric stub。

### 7. Eval verification：fresh subagent + mechanical transcript grading

- **绕过 cache。** Plugin skill / agent definitions 会在 session start 时 cache；typed invocation 测到的是 stale copy。改为 spawn fresh subagent，让它从 disk 读取 skill source 并遵循它。
- **从 transcript grading，不从 self-report grading。** 把 JSONL parse 成 tool-call timeline，并做 mechanical assertions：Read-event ordering against generation checkpoints（例如 extracted-reference Read 落在 scout writes 之后、candidates checkpoint 之前）；orchestrator 对 bulk data files 的 Reads 为零；filesystem artifacts 存在、名称正确、section contract 完整。
- **知道 harness limits 并记录。** 没有 nested dispatch 的 eval subagent *无法* 验证 dispatch payload shape 或 fleet tiering；把这些 assertions 标为 "not testable"，不要糊弄。它 *可以* 验证 load ordering、file contracts、volume/format overrides 和 degradation-rule behavior。要补齐缺口，需要 main-session run。
- 跟随 skill 时遇到的 errors 是 skill findings，不是噪声。（auto memory [claude]）

### 8. Ceiling mechanics：在 dispatches 中显式要求 above-and-beyond behavior

Floor-guarding（basis requirements、rejection criteria）能防止坏 output；它不会产生 ambitious output。来自 best-practices doc：

- **Ambition charter**，逐字包含在每个 generation dispatch 中：intent framing（为什么 output 重要）、warm-up framing（"your first few ideas are warm-up; keep only those that earn their place after the non-obvious ones exist"），以及 anti-genericness test（"if it would appear in a generic listicle, sharpen or drop"）。
- **Fresh-context verifiers over self-critique**（按 Fable guide）：orchestrator 给自己的 synthesis 打分会被 anchor；一个从没看过 generation、被 prompt 去 *refute* 的 verifier 不会。
- **Dispatch payload structure**：XML tags（`<grounding> <constraints> <background> <task>`）；longform shared material 放前，task 放最后（documented long-context gain）；parallel dispatches 使用 byte-identical shared prefix 以复用 prompt cache；通过 tags 机械区分 constraint-vs-background，而不是靠 prose。

---

## Why This Matters（为什么重要）

为 prior model generations 编写的 skills 会同时积累两种相反债务：过多 JUDGMENT prescription（Fable guide 警告这会主动降低 frontier-model output 质量），以及过少面向 cost、context、verification 的 PROTOCOL infrastructure。朴素的 "shorten it" 会砍错东西；朴素的 "harden it" 会膨胀错东西。PROTOCOL/JUDGMENT split 加上有序 sequence 解决了这个张力：在模型强的地方 prune，在 workflow 机械化的地方 prescribe。

ce-ideate 应用该方法后的可量化结果：

- SKILL.md：424 -> 372 行（-12%），同时增加 model tiering、file-based dossier flow、information-asymmetric stub 和 ambition charter。仅三处 judgment-prescription cuts 就回收约 16 行，verification run 中没有 behavior loss。
- Context math：inline dossiers 会让每 turn 多携带约 10k tokens，超过整个 SKILL.md（约 6k）。file+gist pattern 把这部分完全移出 orchestrator window。
- Eval：8 个 mechanical assertions 中 6 个通过，2 个正确报告为 untestable（dispatch-less harness 中的 nested-dispatch assertions），0 个失败。Degradation rule 按设计触发。Degraded inline run：14 分钟，208k tokens。
- Cost architecture：cheap extraction scouts 将 quote+pointer dossiers 输入 ceiling-tier choke points，比 uniform inherited-model fleet 喂 thin summary 更便宜，也更 grounded。

---

## When to Apply（何时应用）

Review 满足以下一项或多项的 skill 时，运行这套 sequence：

- **Multi-agent orchestration skills** — 任何 dispatch subagent fleets 的 skill（tiering、file-flow、dispatch-payload steps 只在这里重要）。
- **超过约 300 行的 skills** — 大到 conditional/late-sequence extraction 和 judgment pruning 有可衡量收益。
- **frontier models 之前写成的 skills**（或当前 Fable guide 之前）— 很可能 judgment over-prescribed、protocol under-built。
- **把 bulk data inline 到 dispatch prompts 或 return values 的 skills** — 任何 subagent output 作为 content 而不是 path 重新进入 orchestrator window 的地方。
- **用 soft "see reference" pointers 保护 load-bearing content 的 skills** — 即使不应用其余步骤，也要应用 step 6。

当 skill 很短且 unconditional（extraction 不会有收益），或它可能运行在 non-frontier models 上（step-2 floor 不成立，需要保留 scaffolding）时，跳过或缩小规模。结构性 changes 一定要配合 step-7 eval；永远不要只凭 agent self-report 就 ship。

---

## Examples（示例）

**1. Judgment enumeration -> principle + one contrast pair**

Before（vague phrases 的枚举列表，加上 7 行 sample classification table）：

```text
Vague subjects include: "quick wins", "low-hanging fruit", "improvements",
"polish", "cleanup", "things to fix", ...
[+ 7-row table classifying sample subjects as vague/identifiable]
```

After：

```text
A subject is workable when it names an identifiable referent:
`browser sniff` is identifiable, `quick wins` is not — vagueness is
about referent, not length.
```

**2. Inline bulk data -> file + gist**

Before（scout 返回完整 dossier，orchestrator 永久携带它）：

```text
Return your complete evidence dossier (~150 lines of quotes + pointers)
in your final message.
```

After：

```text
Write your dossier to /tmp/compound-engineering/<skill>/<run-id>/evidence-<axis-slug>.md.
Return only a 3-5 line gist plus the file path. Downstream agents read
the file themselves; the orchestrator never does.
```

**3. Soft pointer -> information-asymmetric stub**

Before：

```text
Phase 2: Divergent ideation. See references/divergent-ideation.md for details
on the fleet structure. Dispatch the agents and collect candidates.
```

After：

```text
Phase 2: Read references/divergent-ideation.md now. It contains the fleet
spec, per-agent dispatch contract, and volume targets — none of which appear
in this main body. Dispatch prompts cannot be correctly constructed without
it; improvising them produces unverifiable candidates — the precise failure
this skill exists to prevent. The fleet counts in Phase 0.6 are cost
transparency, not the dispatch spec. "Quickly" means smaller volume targets,
not skipping the reference.
```

Before version 留下了足够 inline 内容（phase name、"dispatch the agents"），让 agent 可以即兴补全；after version 让未读取时无法继续，命名 skip-failure，关闭 leak，并预先阻断 "we're in a hurry" 的 rationalization。

---

## Related（相关）

- `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md` — 向 subagents 传 path 的既有 precedent；step 5 在此基础上加入 gist refinement。
- `docs/solutions/skill-design/post-menu-routing-belongs-inline.md` — 同一 load-reliability failure 的互补杠杆：always-on content inline；conditional content 使用 load-stub（step 6）。
- `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md` — 必须保留完整 prescription 的 PROTOCOL content canonical example（step 1）。
- `docs/solutions/skill-design/script-first-skill-architecture.md` — 互补的 token-optimization pattern（用 bundled scripts 替代 model-context work）。
- `docs/solutions/skill-design/safe-auto-rubric-calibration.md` — 早期 eval-methodology precedent（fixture-based grading、variance awareness），与 step 7 一致。
- `docs/solutions/best-practices/ce-pipeline-end-to-end-learnings.md` — 证明 `model:` params 会传播到所有 conversion targets（step 4）。
- Plugin `AGENTS.md` -> Skill Design Principles — 本方法论细化的 prescription-calibration framework；以及 step 5 operationalize 的 conditional/late-sequence extraction rule。
- GitHub issues #714 和 #374 — 与 step 6 处理的问题同属一类的历史 reference-load failures。
