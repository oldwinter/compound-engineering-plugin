---
title: "feat: 为 non-software tasks 添加 universal planning support"
type: feat
status: completed
date: 2026-04-05
origin: docs/brainstorms/2026-04-05-universal-planning-requirements.md
---

# feat: 为 non-software tasks 添加 universal planning support

## 概览

ce:plan 当前会对 non-software tasks self-gate，因为它的 description、trigger phrases 和 workflow phases 都是 software-specific。本 plan 在 Phase 0 中添加 detection stub，尽早识别 non-software tasks，并 route 到 dedicated reference file（`references/universal-planning.md`），其中包含 domain-agnostic planning workflow。software path 完全不变。

## 问题框架

用户会把 `/ce:plan` 用于任何 multi-step planning：trip itineraries、study plans、team offsites。model 因 ce:plan 的 language signal 指向 software-only use 而拒绝。structured thinking（ambiguity assessment、research、sequencing、dependencies）是 domain-agnostic；只有当前 implementation 是 software-specific。（see origin: `docs/brainstorms/2026-04-05-universal-planning-requirements.md`）

## 需求追踪

- R1. 更新 ce:plan YAML description 和 trigger phrases，支持 non-software planning
- R2. 在 Phase 0 尽早 detect non-software tasks
- R3. Error policy：uncertain 时默认 software，ambiguous 时询问
- R4. Verify ce:brainstorm doesn't self-gate（confirmed: it doesn't；无需 changes）
- R5. Non-software path loads `references/universal-planning.md`，跳过 Phases 0.2 through 5.1（all software-specific phases）
- R6. planning 前做 ambiguity assessment
- R7. Focused inline Q&A（聚焦 inline Q&A，~3 questions guideline）
- R8. Quality principles 引导 output，而不是作为 template
- R9. Web research capability（Phase 2 extension；不在本 plan 中）
- R10. Local file interaction（Phase 2 extension；不在本 plan 中）
- R11. Reference file extraction（reference file 抽取），用于 token cost management
- R12. 对 software users 的 token cost increase negligible

## 范围边界

- Software planning path 不修改：Phases 0.2-5.4 零变化
- ce:brainstorm 不修改：已验证 domain-agnostic，无 self-gating
- ce:work 不修改：保持 software-only
- R9（web research）和 R10（local files）延后到 Phase 2 extension
- 无 domain-specific templates，仅 quality principles
- Pipeline mode（LFG/SLFG）：non-software tasks produce a stop message, not a plan（输出 stop message，而不是 plan）

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/ce-plan/SKILL.md`：688-line skill with phased workflow（0.1-5.4）。Detection 插入 Phase 0.1b（resume 后、requirements doc search 前）。
- `plugins/compound-engineering/skills/ce-plan/references/`：existing reference files 通过 backtick paths 加载：`deepening-workflow.md`（Phase 5.3）、`plan-handoff.md`（Phase 5.4）、`visual-communication.md`（Phase 4.4）。Pattern："read `references/<file>.md` for [what it contains]"
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`：description domain-agnostic（"Explore requirements and approaches through collaborative dialogue"）。不 self-gate。
- `plugins/compound-engineering/skills/lfg/SKILL.md`：pipeline gate at step 2："Verify that the ce:plan workflow produced a plan file in `docs/plans/`. If no plan file was created, run `/ce:plan $ARGUMENTS` again." 必须 graceful handle non-software。
- `plugins/compound-engineering/skills/slfg/SKILL.md`：similar pipeline，step 2 records plan path from `docs/plans/`。

### 组织内经验

- `docs/solutions/skill-design/beta-skills-framework.md`：Config-driven routing within a single SKILL.md 因 instruction blending risk 被 rejected。本 approach（early detection stub branches to reference file）是 recommended pattern："clear, early context-detection phase that sets the mode before instructions diverge."
- `docs/solutions/skill-design/compound-refresh-skill-improvements.md`：Auto-detection of context to switch modes 不可靠；explicit arguments 更安全。通过 R3 error policy mitigate（default to software, ask when uncertain）。已知 tradeoff，值得 monitor。
- `docs/solutions/skill-design/research-agent-pipeline-separation.md`：不要为 non-software tasks 完全 skip research；应 substitute rather than remove。Core path 将 research defer 到 Phase 2 extension。
- `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`：conditional behavior 使用 explicit state checks，而不是 prose-described hedging。Detection 使用 structured signal lists，而不是 vague instructions。

## 关键技术决策

- **Detection as explicit state checks, not prose**：Detection 使用 enumerated software signals（code references、programming languages、APIs 等），并基于 presence/absence classify，而不是 vague heuristic matching。遵循 state-machine learning。
- **Reference file extraction justified**：non-software workflow 是约 80-100 行完全不同的 phase instructions。根据 Plugin AGENTS.md compliance checklist，这超过 "~20% of skill content, conditional" extraction threshold。
- **Self-contained reference file**：`references/universal-planning.md` 自己处理 write 与 handoff，不复用 Phase 5.2 和 plan-handoff.md，因为 handoff options 差异很大（no ce:work、no issue creation、user-chosen file location）。这重复约 8 行 Proof upload logic 和 file-write step。接受 tradeoff：self-containment 比在 software phases 中穿插 conditional notes 更易维护。
- **Pipeline mode stop signal**：在 pipeline mode 中，detection 输出 clear message 并 stop。LFG/SLFG 添加 one-line 处理，graceful stop 而不是 retry。
- **No ce:brainstorm changes**：已验证 domain-agnostic。non-software tasks 上 repo scan waste 可接受；优化它是 separate concern。

## 开放问题

### 规划期间已解决

- **Detection heuristics**：使用 explicit signal lists（software: code/repo/language/API/database/test references；non-software: clearly non-software domain + no software signals）。uncertain 时 default to software。
- **Quality principles**：可执行步骤、按依赖排序、考虑时间、标明资源、包含应急方案、细节适度、格式适配具体 domain。
- **ce:brainstorm self-gating**：Confirmed domain-agnostic。无需 changes。
- **LFG/SLFG contract**：ce:plan 输出 stop message；LFG/SLFG 添加 note graceful handle non-software。
- **Plan file location**：通过 prompt 用户选择（docs/plans/ if exists、CWD、/tmp 或 custom）。

### 延后到实现阶段

- **Exact detection wording**：signal lists 已定义，但 exact phrasing 会在 implementation 中 refine，避免 instruction blending。
- **Quality principle effectiveness**：可能需要通过多样化 non-software prompts 的 manual testing 调优。
- **Research opt-in UX（Phase 2 extension）**：当 non-software path 判断 external research 会改善 plan 时，先 prompt 用户再 dispatch -- 不 auto-research。这样让 token cost 受 user control。Frame as: "I think researching [topics] would improve this plan. Want me to look into it?"
- **Haiku model for research agents（Phase 2 extension）**：在 Claude Code 中运行时，用 `model: "haiku"` dispatch web research sub-agents。Web search 与 result synthesis 不需要 Opus-level reasoning。这显著降低 Anthropic multi-agent research system patterns 中记录的 15x token overhead。Agent tool 的 `model` parameter 直接支持。
- **Research decomposition pattern（Phase 2 extension）**：根据 Anthropic multi-agent research findings，将 planning goal 分解为 2-5 个 independent research questions，并 parallel dispatch web searches，而不是 sequential queries。根据 task complexity scale research depth（simple tasks 0 searches，medium 2-3，complex 5+）。先 broad queries，再基于 findings narrow。

## 实现单元

- [ ] **Unit 1：更新 ce:plan YAML frontmatter**

**目标：** 更新 skill description 和 argument-hint，包含 non-software planning triggers，使 model 将 non-software requests route 到 ce:plan。

**需求：** R1

**依赖：** 无

**文件：**
- Modify（修改）：`plugins/compound-engineering/skills/ce-plan/SKILL.md`（lines 1-4, YAML frontmatter）

**做法：**
- 更新 `description`，加入 non-software planning triggers。保持 software triggers intact；将 non-software ones 并列加入。
- **Routing boundary with ce:brainstorm**：ce:plan 用于将已决定的 task structuring 成 actionable plan；ce:brainstorm 用于 uncertain 时探索做什么。在 trigger phrasing 中包含这个 distinction -- 例如 ce:plan triggers on "plan this"、"break this down"、"create a plan for [specific goal]"；ce:brainstorm triggers on "help me think through"、"what should we build"、"I'm not sure about scope."
- 更新 `argument-hint`，包含 non-software examples。
- 保持 description concise -- 避免宽泛到 model over-routes to ce:plan。自然处包含 negative signal（例如 "for exploratory or ambiguous requests, prefer ce:brainstorm first" -- 已存在则保留）。

**遵循的模式：**
- ce:brainstorm 的 description style：domain-agnostic framing with specific trigger phrases

**测试场景：**
- Happy path：`/ce:plan a 3 day trip to Disney World` triggers ce:plan（之前不会）
- Happy path：`/ce:plan plan the auth refactor` 仍 triggers ce:plan（no regression）
- Edge case：对话式 "help me plan my team offsite"：model 应把 ce:plan 视为候选（不只是 ce:brainstorm）

**验证：**
- Description 同时包含 software 和 non-software trigger phrases
- Argument-hint 包含 non-software example

---

- [ ] **Unit 2：向 ce:plan SKILL.md 添加 detection stub**

**目标：** 在 resume check（0.1）后、requirements doc search（0.2）前插入 non-software detection phase（0.1b），classify task，并在 appropriate 时 branch 到 non-software path。

**需求：** R2, R3, R11, R12, pipeline scope boundary

**依赖：** Unit 3（reference file must exist for detection stub to function in testing, though SKILL.md edit can be written first）

**文件：**
- Modify：`plugins/compound-engineering/skills/ce-plan/SKILL.md`（在 Phase 0.1 后插入 new section，约 line 75）

**做法：**
- New section `#### 0.1b Detect Non-Software Task` 放在 Phase 0.1（resume）与 Phase 0.2（find upstream requirements doc）之间
- **Resume/deepen interaction**：如果 Phase 0.1 识别到 frontmatter 中带 `domain: non-software` 的 existing plan，则 route 到 `references/universal-planning.md` 做 editing/deepening，而不是 short-circuit 到 Phase 5.3。`domain` frontmatter field 是 authoritative signal，不重新 classify 用户 input。
- 将 software signals 和 non-software signals 列为 explicit lists（来自 learnings 的 state-machine pattern）。**Distinguish task-type from topic-domain**：signal 是 "task 是否涉及 building/modifying/architecting software"，而不是 "task 是否提到 software topics"。关于 Rust 的 study guide 是 non-software；Rust library refactor 是 software。
- interactive mode 中检测到 non-software：instruction to read `references/universal-planning.md` and follow that workflow，skip all subsequent software phases
- pipeline mode 中检测到 non-software：output stop message，解释 LFG/SLFG 不支持 non-software，并 stop。使用与 Phases 5.2/5.3 相同的 pipeline detection pattern："If invoked from an automated workflow such as LFG, SLFG, or any disable-model-invocation context."
- uncertain 时：default to software path，或 genuinely ambiguous 时 ask user
- Target：约 20-25 lines of SKILL.md content（因 resume handling 与 task-vs-topic distinction 略大）

**遵循的模式：**
- Existing reference file loading pattern（现有 reference file 加载 pattern）："read `references/deepening-workflow.md` for..."（ce:plan SKILL.md line 681）
- `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md` 中的 state-machine detection pattern

**测试场景：**
- Happy path："plan a 3 day Disney trip" → 检测为 non-software，加载 reference file
- Happy path："plan the database migration for multi-tenancy" → 检测为 software，继续 normal flow
- Edge case："plan a migration" 没有其他 context → uncertain，询问用户或 default to software
- Edge case："create a study guide for learning Rust" → 虽然提到 programming language，仍是 non-software task。task 是 producing educational content，不是 building/modifying software。应 route to non-software path。
- Edge case："refactor the Rust authentication module" → software task。task involves modifying code（任务涉及修改代码）。
- Error path：Pipeline mode + non-software task → outputs stop message，不写 plan file
- Integration：Software task after detection stub → Phases 0.2-5.4 与之前完全一致地继续（no regression）

**验证：**
- Software tasks 通过 detection，zero behavioral change
- Non-software tasks route 到 `references/universal-planning.md`
- Pipeline mode + non-software 会 produces a stop message
- Detection stub 约 15-20 lines（negligible token cost per R12）

---

- [ ] **Unit 3：创建 `references/universal-planning.md`**

**目标：** 编写替代 software-specific phases 的 non-software planning workflow。包含 ambiguity assessment、focused Q&A、quality principles、file location prompt 和 handoff。

**需求：** R5, R6, R7, R8

**依赖：** Unit 2（detection stub references this file）

**文件：**
- Create（创建）：`plugins/compound-engineering/skills/ce-plan/references/universal-planning.md`

**做法：**
- Self-contained workflow with 5 steps：(1) assess ambiguity，(2) focused Q&A if needed，(3) structure the plan using quality principles，(4) prompt for file location，(5) write file and present handoff options。Research capability（R9）在 Phase 2 实现时添加 -- v1 不放 placeholder step。
- Quality principles inline 定义：actionable steps、dependency-sequenced、time-aware、resource-identified、contingency-aware、appropriately detailed、domain-appropriate format、research-aware（当 model 缺乏 domain knowledge 时，offer to research before planning -- prompt user first, don't auto-research）
- File location prompt：docs/plans/（if exists）、CWD、/tmp 或 custom path。使用 platform's question tool。
- Handoff options：open in editor、share to Proof、done。NO ce:work（software-only）或 issue creation。
- Non-software plans 的 frontmatter：`title`、`status`、`date` 和 `domain: non-software`。Omit `type`、`origin`、`deepened`。`domain` field 是 resume/deepen flows 和 downstream consumers（LFG gate、ce:work）识别 non-software plans 的 marker。
- Filename convention：`YYYY-MM-DD-<descriptive-name>-plan.md`（无 sequence number 或 type prefix）
- Target：约 80-100 lines
- 遵循 cross-platform interaction rules：使用 "the platform's question tool" 并给出 named examples

**遵循的模式：**
- ce:plan existing reference files（`deepening-workflow.md`、`plan-handoff.md`）-- header comment 说明何时/为何 load file
- Plugin AGENTS.md compliance checklist 中的 cross-platform question tool references
- 未来 sub-references 使用 backtick-path references

**测试场景：**
- Happy path：Clear request（清晰请求，"plan a 3 day Disney trip with 2 kids ages 11 and 13"）→ skips Q&A，produces structured itinerary-style plan
- Happy path：Ambiguous request（"plan my team offsite"）→ asks 1-3 clarifying questions，然后 produces event-style plan
- Happy path：File location prompt 只在 directory exists 时显示 docs/plans/；不存在时 fallback 到 CWD/tmp/custom
- Edge case：Very simple request（非常简单的请求，"plan dinner tonight"）→ minimal plan，appropriately brief
- Edge case：Complex request（复杂请求，"plan a 3-month study curriculum for the GRE"）→ detailed plan with phases、resources、milestones
- Integration：Handoff options 不包含 ce:work 或 issue creation

**验证：**
- Non-software tasks 产出 domain-appropriate structured plans（不是 software plan template）
- Q&A fires only when needed，最多约 3 questions
- File 写入 user-chosen location
- Handoff options 适合 non-software

---

- [ ] **Unit 4：更新 LFG/SLFG pipeline handling**

**目标：** 向 LFG 和 SLFG skills 添加 one-line note，使它们 graceful handle non-software detection，而不是无限 retry。

**需求：** Pipeline scope boundary

**依赖：** Unit 2（detection stub produces the stop message）

**文件：**
- Modify：`plugins/compound-engineering/skills/lfg/SKILL.md`（line 14 后，即 ce:plan gate 之后）
- Modify：`plugins/compound-engineering/skills/slfg/SKILL.md`（line 13 后，即 ce:plan step 之后）

**做法：**
- 将 LFG gate 改写为 explicit 3-branch state check（不是在 existing gate 后附 advisory note）："If ce:plan produced a plan file in `docs/plans/`, proceed. If ce:plan reported the task is non-software and stopped, stop the pipeline and inform the user that LFG requires software tasks. Otherwise, run `/ce:plan $ARGUMENTS` again."
- non-software branch 必须出现在 retry branch 前，确保 precedence。
- SLFG step 2 采用 similar rewrite。
- 每个 change 保持 2-3 sentences。

**遵循的模式：**
- LFG/SLFG existing gate language style（现有 gate language style）

**测试场景：**
- Happy path：Software task → LFG 正常继续（no regression）
- Error path：LFG 中的 non-software task → ce:plan outputs stop message → LFG gracefully stop，而不是 retry

**测试预期：无** -- LFG/SLFG 是通过 manual invocation 测试的 orchestration skills，不是 automated tests。

**验证：**
- LFG 在 ce:plan reports non-software 时不 retry
- SLFG 在 ce:plan reports non-software 时不 retry

---

- [ ] **Unit 5：验证并更新文档**

**目标：** Verify ce:brainstorm doesn't need changes（R4），按需更新 README component descriptions，运行 release validation。

**需求：** R4

**依赖：** Units 1-4

**文件：**
- Read (verify)（读取验证）：`plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`
- Possibly modify：`plugins/compound-engineering/README.md`（如果 skill descriptions 需要更新）

**做法：**
- 用 non-software prompt 手动测试 ce:brainstorm，确认它不会 refuse
- 检查 README component tables 是否需要为 ce:plan 更新 description
- 运行 `bun run release:validate` 确保 plugin consistency

**测试场景：**
- Happy path：ce:brainstorm accepts "plan my team offsite" without refusing（不会拒绝）
- Integration：`bun run release:validate` passes（通过）

**验证：**
- ce:brainstorm confirmed domain-agnostic（确认 domain-agnostic，no changes needed）
- release:validate passes（通过）
- README accurately reflects ce:plan's expanded capability（准确反映 ce:plan 的扩展能力）

## 系统级影响

- **Interaction graph:** ce:plan detection stub 每次 invocation 都会触发。Non-software detection route 到 `references/universal-planning.md`。LFG/SLFG 对 non-software graceful stop。ce:brainstorm unchanged。
- **Error propagation:** Detection uncertainty → ask user → user answers → correct path。Detection false negative（non-software → software path）→ existing refusal behavior（status quo, not worse）。Detection false positive（software → non-software path）→ disconnected plan（通过 defaulting to software mitigate）。
- **State lifecycle risks:** 无。Detection stateless；每次 invocation 开始时运行一次。
- **API surface parity:** ce:plan description change 影响所有 platforms（Claude Code、Codex、Gemini）如何 route 到 skill。converter 会按原样复制 skills 的 SKILL.md，因此无需 converter changes。
- **Integration coverage:** 需要 manual testing -- repo 中没有 automated skill behavioral tests。
- **Unchanged invariants:** 整个 software planning workflow（Phases 0.2-5.4）不触碰。software tasks 的所有 existing plans、deepening flows 和 pipeline behaviors 保持不变。

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| Detection auto-classification is unreliable（per learnings） | R3 error policy: default to software, ask when uncertain. Release 后 monitor false positive rate。 |
| Description broadening causes over-routing to ce:plan | 保持 non-software triggers 具体（"events, study plans"），不要泛化成（"any task"）。Include negative signal（"for simple questions, ask directly"）。 |
| Non-software plan quality varies without a template | Quality principles 提供 guardrails。Release 前用 diverse prompts 做 manual testing。根据 output quality 迭代 principles。 |
| LFG retry loop if stop message not handled | Unit 4 添加 explicit handling。测试 pipeline path。 |

## 文档 / 运行说明

- 如果 table entry 提到 software-only planning，更新 `plugins/compound-engineering/README.md` 中 ce:plan 的 skill description
- No changelog entry needed（无需 changelog entry，handled by release automation）
- No version bump（无需 version bump，per Plugin AGENTS.md contributor rules）

## 来源与参考

- **Origin document（来源 document）：** `docs/brainstorms/2026-04-05-universal-planning-requirements.md`
- Related code（相关 code）：`plugins/compound-engineering/skills/ce-plan/SKILL.md`, `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`, `plugins/compound-engineering/skills/lfg/SKILL.md`, `plugins/compound-engineering/skills/slfg/SKILL.md`
- Related issue（相关 issue）：[#517](https://github.com/EveryInc/compound-engineering-plugin/issues/517)
- Related learnings（相关 learnings）：`docs/solutions/skill-design/beta-skills-framework.md`, `docs/solutions/skill-design/compound-refresh-skill-improvements.md`, `docs/solutions/skill-design/git-workflow-skills-need-explicit-state-machines.md`
