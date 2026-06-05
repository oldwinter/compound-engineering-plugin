---
title: "refactor: 将 deepen-plan 合并进 ce:plan，作为 automatic confidence check"
type: refactor
status: completed
date: 2026-03-26
origin: docs/brainstorms/2026-03-26-merge-deepen-into-plan-requirements.md
---

# 将 deepen-plan 合并进 ce:plan，作为 automatic confidence check

## 概览

把 deepen-plan skill 的 confidence-gap evaluation 和 targeted research agent dispatching 吸收到 ce:plan 中，作为 automatic post-write phase。移除 standalone skill 形态的 deepen-plan。用户不再决定是否 deepen -- agent 会自行评估并报告它正在 strengthening 什么。

## 问题框架

ce:plan 和 deepen-plan skills 组成了 sequential workflow，其中用户会被提供一个选择（"want to deepen?"），但这件事 agent 比用户更能评估。deepen-plan 运行时已经 self-gates（skips Lightweight，acting 前先 scores confidence gaps）。用户决策增加 friction，却不增加 value。（see origin: docs/brainstorms/2026-03-26-merge-deepen-into-plan-requirements.md）

## 需求追踪

- R1. ce:plan 在 initial plan 写完后自动 evaluates and deepens its own output，不向用户请求 approval
- R2. deepening 运行时，ce:plan 报告它在 strengthening 哪些 sections，以及为什么（transparency without requiring a decision）
- R3. Lightweight plans 默认 skip deepening，除非检测到 high-risk topics
- R4. 对 Standard 和 Deep plans，ce:plan 用 checklist-first、risk-weighted scoring 给 confidence gaps 打分；如果没有 gaps 超过 threshold，则报告 "confidence check passed" 并继续
- R5. 发现 gaps 时，ce:plan dispatches targeted research agents，只 strengthen weak sections
- R6. deepen-plan 作为 standalone command 被移除；re-deepening 通过 ce:plan resume mode 用相同 confidence-gap evaluation 处理（除非用户显式请求，否则不强制 deepening）
- R7. 移除 "Run deepen-plan" post-generation option；post-generation options 更简单

## 范围边界

- 不改变 deepening 做什么 -- 只改变它在哪里运行，以及谁决定运行
- 丢弃 deepen-plan 的 separate-file `-deepened` option -- ce:plan 始终 in-place 写入，automatic deepening 没有理由创建 separate file
- confidence scoring checklist、agent mapping table 和 synthesis rules 从 deepen-plan 移植，而不是重写
- 不修改 ce:brainstorm 或 ce:work
- 保留 planning boundary（no code, no commands）
- 不更新引用 deepen-plan 的 historical docs -- 它们是 historical records

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-plan/SKILL.md` -- 6 phases（0-5）。Phase 5 有 sub-phases：5.1（Review）、5.2（Write）、5.3（Post-gen options）。新的 confidence check 插入到 5.2 和 5.3 之间
- `plugins/compound-engineering/skills/deepen-plan/SKILL.md` -- 409 lines，7 phases（0-6）。Phases 0-5 包含需要吸收的 logic；Phase 6 和 Post-Enhancement Options 由 ce:plan 自己的 post-gen flow 替代
- `plugins/compound-engineering/skills/lfg/SKILL.md` -- Step 3 conditionally invokes deepen-plan。必须移除
- `plugins/compound-engineering/skills/slfg/SKILL.md` -- Step 3 conditionally invokes deepen-plan。必须移除
- Skills 从 filesystem auto-discovered（plugin.json 中无 registry）。删除 directory 即删除 skill
- plan templates 中的 `deepened: YYYY-MM-DD` frontmatter field 表示 plan 已被 substantive strengthened

### 组织内 learnings

- `docs/solutions/skill-design/beta-skills-framework.md` -- workflow chain 是 `ce:brainstorm` -> `ce:plan` -> `deepen-plan` -> `ce:work`，由 lfg 和 slfg orchestrate。移除 skill 时，所有 callers 必须在同一个 PR 中 atomic update
- `docs/solutions/skill-design/beta-promotion-orchestration-contract.md` -- 将该 merge 视为 orchestration contract change。同一个 PR 中更新所有 invokes deepen-plan 的 workflows，避免 broken intermediate state
- `docs/solutions/plugin-versioning-requirements.md` -- 不手动 bump versions。更新 README counts and tables。运行 `bun run release:validate`

## 关键技术决策

- **New Phase 5.3 (Confidence Check and Deepening，新 Phase 5.3)：** 插入到当前 5.2（Write Plan File）和当前 5.3（Post-Generation Options，renumbered to 5.4）之间。这是最小 structural change -- 只有一个 sub-phase renumber。Rationale：deepening 作用于已经 written 的 plan，因此必须跟在 5.2 后；用户只应在 deepening completes or is skipped 后看到 post-gen options
- **Resume mode fast path for re-deepening（resume 模式 re-deepening 快速路径）：** 当 ce:plan 检测到 existing complete plan，且用户 request specifically about deepening 时，直接 short-circuit 到 Phase 5.3（跳过 Phases 1-4）。Rationale：重新运行完整 planning workflow 来 re-deepen 会比旧 standalone deepen-plan 贵 3-5x。fast path 保留效率
- **Pipeline mode behavior:** Deepening 在 pipeline/disable-model-invocation mode 中使用相同 gate logic 运行（Standard/Deep AND high-risk or confidence gaps）。Rationale：lfg/slfg step 3 已有等价 conditional logic；这里把相同行为内置保存
- **Remove ultrathink auto-deepen clause:** ce:plan 当前 line 625 会在 ultrathink 上 auto-runs deepen-plan。现在每次 plan run 都会 auto-evaluates deepening，因此该 clause redundant。移除它可以避免 double-deepening
- **Scratch space:** Artifact-backed research 使用 `.context/compound-engineering/ce-plan/deepen/`，并为每次 run 建 subdirectory。Rationale：遵循 AGENTS.md namespace convention for ce-plan

## 开放问题

### 规划期间已解决

- **confidence check phase 放在哪里？** 作为 Phase 5.3，位于 Write（5.2）和 Post-gen Options（renumbered 5.4）之间。Minimal structural change
- **resume mode 如何区分 incomplete plan 和 re-deepen request？** Fast path：如果 plan 看起来 complete（all sections present, units defined, status: active）且用户 request specifically about deepening，则 skip 到 Phase 5.3。否则 resume normal editing
- **deepening 是否在 pipeline mode 中运行？** 是，使用相同 gate logic。Pipeline mode 已经 skips interactive questions；deepening 不提问，只报告
- **post-gen options 中什么替代 deepen-plan？** 不替代 -- list shrink by one。如果 auto-evaluation passed，plan 已充分 grounded。不同意的用户可以用 explicit deepening instructions 重新 invoke ce:plan
- **deepening 期间 failed or empty agent results 怎么办？** 保留 deepen-plan 的 Phase 4.2 fallback："if an artifact is missing or clearly malformed, re-run that agent or fall back to direct-mode reasoning"

### 延后到实现阶段

- transparency status message（R2）的 exact wording -- 写实际 Phase 5.3 content 时决定最好
- deepen-plan Introduction section 中 `document-review` 和 `deepen-plan` 的区别是否应在 ce:plan 中保留 -- 可能作为 Phase 5.3 中的 brief note

## 实现单元

- [ ] **Unit 1：修改 ce:plan SKILL.md -- 添加 Phase 5.3，更新 Phase 0.1、post-gen options 和 template**

  **目标:** 将 deepen-plan 的 confidence-gap evaluation 和 targeted research 吸收到 ce:plan 中，作为新的 Phase 5.3。更新 Phase 0.1 以支持 re-deepen fast path。将当前 Phase 5.3 renumber 为 5.4 并 simplify。更新 plan template frontmatter comment。

  **需求:** R1, R2, R3, R4, R5, R6, R7

  **依赖:** None

  **文件:**
  - 修改: `plugins/compound-engineering/skills/ce-plan/SKILL.md`

  **做法:**

*Phase 5.3（Confidence Check and Deepening，confidence check 与 deepening）：*
  - 在当前 5.2 和 5.3 之间插入 new sub-phase
  - 从 deepen-plan 移植（not rewrite）：
    - Phase 0.2-0.3 gating logic（Lightweight skip, risk profile assessment）-> 变成 5.3 顶部的 gate
    - Phase 1 plan structure parsing -> 变成 5.3 内的一个 step（lighter version，因为 ce:plan 已知道自己的 structure）
- Phase 2 confidence scoring（the full checklist from deepen-plan lines 119-200）-> 整体移植
- Phase 3 deterministic section-to-agent mapping（lines 208-248）-> 整体移植
- Phase 3.2 agent prompt shape -> 移植
- Phase 3.3 execution mode decision（direct vs artifact-backed）-> 移植
- Phase 4 research execution（direct and artifact-backed modes）-> 移植
- Phase 5 synthesis and rewrite rules -> 移植
- Phase 6 final checks -> merged into ce:plan's existing Phase 5.1 review logic（并入 ce:plan 现有 Phase 5.1 review logic）
  - 添加 transparency reporting（R2）：dispatching agents 前报告哪些 sections 正在 strengthened，以及原因。Example："Strengthening [Key Technical Decisions, System-Wide Impact] -- decision rationale is thin and cross-boundary effects aren't mapped"
  - 添加 "confidence check passed" path（R4）：当没有 gaps 超过 threshold 时，报告并 proceed to 5.4
  - 添加 pipeline mode note：deepening 在 pipeline mode 中使用相同 gate logic 运行，无需 user interaction
  - 更新 scratch space path 为 `.context/compound-engineering/ce-plan/deepen/`
  - 移植 deepen-plan Phase 6（lines 383-385）的 scratch cleanup logic：plan safely written 后清理 temporary scratch directory。auto-deepening 意味着 users 可能完全不知道 artifacts 被创建，这一点尤其重要

*Phase 0.1（Resume mode fast path，resume 快速路径）：*
  - 添加：当 ce:plan 检测到 existing complete plan 且用户 request specifically about deepening or strengthening 时，直接 short-circuit 到 Phase 5.3
- "Complete plan" detection（complete plan 检测）：all major sections present, implementation units defined, `status: active`
  - Deepen-request detection：user input 包含 signal words，如 "deepen"、"strengthen"、"confidence"、"gaps"，或明确要求 re-deepen the plan。Normal editing requests（例如 "update the test scenarios"）不应触发 fast path
  - 保留 existing resume behavior for incomplete plans
  - 如果 plan 已有 `deepened: YYYY-MM-DD` 且没有 explicit user request to re-deepen，则应用相同 confidence-gap evaluation（R6 -- doesn't force deepening）

*Phase 5.4（Post-Generation Options，原 5.3）：*
  - 移除 option 2（"Run `/deepen-plan`"）及其 handler
  - 移除 ultrathink auto-deepen clause（line 625）
- 重新编号 remaining options（1-6 instead of 1-7）

*Plan template frontmatter（plan template frontmatter，plan template 的 frontmatter）：*
  - 将 `deepened:` line 的 comment 从 "set later by deepen-plan" 改为 "set when confidence check substantively strengthens the plan"

  **遵循的模式:**
  - deepen-plan SKILL.md 是所有 transplanted content 的 source of truth
  - ce:plan 的 existing sub-phase structure（numbered sub-phases within Phase 5）
  - ce:plan 的 existing pipeline mode handling（line 589）

  **测试场景:**
- Fresh Lightweight plan -> Phase 5.3 gate 并 skip deepening，报告 "confidence check passed"
- Fresh Standard plan with thin decisions -> Phase 5.3 identifies gaps，报告正在 strengthening 的内容，dispatches agents，updates plan
- Fresh Standard plan with strong confidence（confidence 强的 Standard plan）-> Phase 5.3 evaluates and reports "confidence check passed"
  - Pipeline mode（lfg/slfg）-> deepening 自动运行 with same gate logic，无 interactive questions
- Resume mode with explicit deepen request（带 explicit deepen request 的 resume mode）-> fast-paths to Phase 5.3
- Resume mode without deepen request（没有 deepen request 的 resume mode）-> normal plan editing flow

  **验证:**
- Phase 5.3 包含来自 deepen-plan 的 complete confidence scoring checklist
- Phase 5.3 包含来自 deepen-plan 的 complete section-to-agent mapping
- Phase 0.1 包含 re-deepen fast path
- ce:plan SKILL.md 中不再有 `/deepen-plan` references
- ultrathink clause 已移除
- Plan template frontmatter comment 已更新

---

- [ ] **Unit 2：删除 deepen-plan skill directory**

  **目标:** 从 plugin 中移除 deepen-plan skill

  **需求:** R6

  **依赖:** Unit 1（ce:plan must absorb the logic before it's deleted）

  **文件:**
  - 删除: `plugins/compound-engineering/skills/deepen-plan/SKILL.md`（entire `deepen-plan/` directory）

  **做法:**
- 删除 directory `plugins/compound-engineering/skills/deepen-plan/`
  - Skills 从 filesystem auto-discovered，因此无需 registry update

  **验证:**
- `plugins/compound-engineering/skills/deepen-plan/` no longer exists
  - listing skills 时不再出现 `deepen-plan` skill

---

- [ ] **Unit 3：更新 lfg 和 slfg orchestrators**

  **目标:** 从两个 orchestration skills 中移除 deepen-plan step，因为 ce:plan 现在内部处理 deepening

  **需求:** R1, R6

  **依赖:** Unit 1

  **文件:**
  - 修改: `plugins/compound-engineering/skills/lfg/SKILL.md`
  - 修改: `plugins/compound-engineering/skills/slfg/SKILL.md`

  **做法:**

*lfg（lfg orchestrator）：*
  - 移除 step 3（lines 16-20：conditional deepen-plan invocation and its GATE）
- 将 steps 4-9 重新编号为 3-8
  - 更新 opening instruction，移除对 step 3 plan verification 的 reference
  - 保持 step 2（`/ce:plan`）及其 GATE 不变 -- ce:plan 现在内部处理 deepening

*slfg（slfg orchestrator）：*
  - 移除 step 3（lines 14-17：conditional deepen-plan invocation）
- 将 step 4 重新编号为 3（`/ce:work`）
- 将 steps 5-10 重新编号为 4-9
  - 保持 step 2（`/ce:plan`）不变

  **遵循的模式:**
- lfg 的 existing step structure with GATE markers（带 GATE markers 的现有 step 结构）
- slfg 的 existing phase structure（Sequential, Parallel, Autofix, Finalize）

  **验证:**
  - lfg 或 slfg 中没有 `deepen-plan` 或 `deepen` references
- Step numbers sequential with no gaps（step 编号连续无缺口）
  - lfg flow 是：optional ralph-loop -> ce:plan（with GATE）-> ce:work（with GATE）-> ce:review mode:autofix -> todo-resolve -> test-browser -> feature-video -> DONE。Preserve existing GATE after ce:work
  - slfg flow 是：optional ralph-loop -> ce:plan -> ce:work（swarm）-> parallel ce:review mode:report-only + test-browser -> ce:review mode:autofix -> todo-resolve -> feature-video -> DONE

---

- [ ] **Unit 4：更新 peripheral references（外围引用）**

  **目标:** 从 README、AGENTS.md、learnings-researcher 和 document-review 中移除 stale deepen-plan references

  **需求:** R6, R7

  **依赖:** Unit 2

  **文件:**
  - 修改: `plugins/compound-engineering/README.md`
  - 修改: `plugins/compound-engineering/AGENTS.md`
  - 修改: `plugins/compound-engineering/agents/research/ce-learnings-researcher.agent.md`
  - 修改: `plugins/compound-engineering/skills/document-review/SKILL.md`

  **做法:**

*README.md（README）：*
- 从 Core Workflow table 移除 `/deepen-plan` row
- 更新 `/ce:plan` description，说明其包含 automatic confidence checking
- 验证 Components table 中 skill count 仍为 "40+"（removing 1 skill, adding 0）

*AGENTS.md（agent 约定）：*
- Line 116：将 `/deepen-plan` example 替换为另一个 valid skill（e.g., `/ce:compound` or `/changelog`）

*learnings-researcher.md（learnings researcher）：*
  - Remove the `/deepen-plan` integration point line（移除 `/deepen-plan` integration point 行）。deepening behavior 现在位于 ce:plan 内部，而 ce:plan 已在 Phase 1.1 invokes learnings-researcher。Phase 5.3 agent mapping 也为 "Context & Research" gaps 包含 learnings-researcher，因此 integration preserved

*document-review SKILL.md（document-review skill）：*
- Line 196：更新 "do not modify" caller list -- 移除 `deepen-plan-beta` 和 `ce-plan-beta`（both are stale beta names）。更新为 current accurate callers：`ce-brainstorm`, `ce-plan`

  **验证:**
  - 这些文件中没有 `deepen-plan` 或 `/deepen-plan` references
  - README Core Workflow table 少一行
- `bun run release:validate` passes

---

- [ ] **Unit 5：更新 converter 和 writer tests**

  **目标:** 将 test data 中的 deepen-plan references 替换为另一个 skill name，使 tests 仍能验证 slash-command remapping behavior

  **需求:** R6

  **依赖:** Unit 2

  **文件:**
  - 修改: `tests/codex-writer.test.ts`
  - 修改: `tests/codex-converter.test.ts`
  - 修改: `tests/droid-converter.test.ts`
  - 修改: `tests/copilot-converter.test.ts`
  - 修改: `tests/pi-converter.test.ts`
  - 修改: `tests/review-skill-contract.test.ts`

  **做法:**
  - 在每个 test file 中，将 test input data 和 expected output 中的 `deepen-plan` 替换为另一个具有相同 structural properties 的 existing skill name（non-`ce:` prefixed skill with a hyphenated name）。Good candidates：`reproduce-bug`、`git-commit` 或 `todo-resolve`
  - `review-skill-contract.test.ts` line 157：将 test description 从 "deepen-plan reviewer" 更新为 replacement skill name（或更新为反映该 test 实际验证内容 -- 它测试 `data-migration-expert` agent content）
  - 不需要 converter source code changes -- repo research confirmed no hardcoded deepen-plan references in `src/`

  **遵循的模式:**
- 每个 file 中的 existing test data structure
  - 为 clarity，在所有 test files 中使用 consistent replacement skill name

  **测试场景:**
  - 所有 existing test assertions 使用 replacement skill name 仍 pass
  - 每个 target（Codex、Droid、Copilot、Pi）仍验证 slash-command remapping behavior

  **验证:**
  - `bun test` passes
  - test files 中没有 `deepen-plan` references

---

- [ ] **Unit 6：验证 plugin consistency**

  **目标:** 确认 skill removal 不会破坏 plugin metadata 或 marketplace consistency

  **需求:** R6

  **依赖:** Units 1-5

  **文件:**
- Read（validation only，仅验证读取）: `plugins/compound-engineering/.claude-plugin/plugin.json`
- Read（validation only，仅验证读取）: `.claude-plugin/marketplace.json`

  **做法:**
- 运行 `bun run release:validate` 检查 consistency
- 运行 `bun test` 确认所有 tests pass
- 验证 active skill files 中没有 remaining `deepen-plan` references（historical docs excluded）

  **验证:**
  - `bun run release:validate` passes
  - `bun test` passes
- `grep -r "deepen-plan" plugins/compound-engineering/skills/` returns no results
- `grep -r "deepen-plan" plugins/compound-engineering/agents/` returns no results
- `grep -r "deepen-plan" plugins/compound-engineering/README.md` returns no results
  - Note: CHANGELOG.md 和 historical docs in `docs/plans/`, `docs/brainstorms/`, `docs/solutions/` 仍会包含 deepen-plan references -- 这些是 historical records，不应更新

## 系统级影响

- **Interaction graph:** ce:plan 的 Phase 5.3 dispatches 与 deepen-plan 曾使用的相同 research and review agents。agent contracts 不变 -- 只有 caller 改变。lfg 和 slfg 少一个 step，但没有新增内容，因为 ce:plan 内部处理 deepening
- **Error propagation:** 如果 Phase 5.3 中 agent dispatch 失败，保留 deepen-plan Phase 4.2 fallback：re-run the agent 或 fall back to direct-mode reasoning。即使 deepening partial fails，plan 仍会 written to disk
- **State lifecycle risks:** `deepened:` frontmatter field 仍只在 substantive changes made 时设置。由旧 standalone deepen-plan deepened 的 plans 保留其 `deepened:` date -- 无需 migration
- **API surface parity:** converter tests 使用 deepen-plan 作为 slash-command remapping 的 sample data。更新为不同 skill name 后，所有 target converters（Codex、Droid、Copilot、Pi）继续验证相同 remapping behavior
- **Integration coverage:** 同一个 PR 中 atomic update 所有 callers（lfg、slfg、ce:plan、README、AGENTS.md、learnings-researcher、document-review），防止 broken intermediate state（per learnings from beta-promotion-orchestration-contract.md）

## 风险与依赖

- **Risk: Phase 5.3 content size.** 把约 300 行 deepen-plan logic 吸收到 ce:plan，会让它显著变长（约 950+ lines）。Mitigation：content self-contained in one sub-phase；如果 token pressure 成为问题，可抽到 reference file
- **Risk: Converter test fragility.** 改变 test input data 可能暴露 converter logic 的 implicit assumptions。Mitigation：repo research confirmed no hardcoded deepen-plan references in `src/`。tests 只是把它作为 generic sample data
- **Risk: Orphaned scratch directories.** prior runs 中 existing `.context/compound-engineering/deepen-plan/` directories 不会被清理。Mitigation：这些是 ephemeral scratch files，没有 functional impact；不值得 special handling

## 来源与参考

- **Origin document（来源文档）：** [docs/brainstorms/2026-03-26-merge-deepen-into-plan-requirements.md](docs/brainstorms/2026-03-26-merge-deepen-into-plan-requirements.md)
- Deepen-plan source（deepen-plan 来源）：`plugins/compound-engineering/skills/deepen-plan/SKILL.md`
- Ce:plan source（ce:plan 来源）：`plugins/compound-engineering/skills/ce-plan/SKILL.md`
- Learnings（经验沉淀）：`docs/solutions/skill-design/beta-skills-framework.md`, `docs/solutions/skill-design/beta-promotion-orchestration-contract.md`, `docs/solutions/plugin-versioning-requirements.md`
