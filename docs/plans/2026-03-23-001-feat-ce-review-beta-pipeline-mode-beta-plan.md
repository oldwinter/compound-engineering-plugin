---
title: "feat: 让 ce:review-beta 具备 autonomous 能力并适合 pipeline"
type: feat
status: active
date: 2026-03-23
origin: direct user request and planning discussion on ce:review-beta standalone vs. autonomous pipeline behavior
---

# 让 ce:review-beta 具备自主执行能力并适合 pipeline

## 概览

将 `ce:review-beta` 从纯 interactive standalone review workflow 重新设计为 policy-driven review engine，支持三个 explicit modes：`interactive`、`autonomous` 和 `report-only`。 redesign 应保留当前 standalone UX 以便 manual review，同时支持 automated workflows 中的 hands-off review 和 safe autofix，并为不应 auto-fix 的事项定义清晰的 residual-work handoff。本 plan 仍只限 beta；promote 到 stable `ce:review` 以及任何 `lfg` / `slfg` cutover，都应在 beta behavior 验证后通过 follow-up plan 完成。

## 问题框架

`ce:review-beta` 当前在一个 loop 里混合了三项职责：

1. Review and synthesis（review 与 synthesis）
2. 对要修复内容的 human approval
3. Local fixing、re-review，以及 push/PR next steps

这对 standalone 使用可以接受，但对 autonomous orchestration 形状不对：

- `lfg` 当前把 review 作为 downstream resolution 和 browser testing 之前的 upstream producer
- `slfg` 当前并行运行 review 和 browser testing；只有 review non-mutating 时才安全
- `resolve-todo-parallel` 期待 durable residual-work contract（`todos/`），而 `ce:review-beta` 当前试图 inline resolve accepted findings
- findings schema 缺少 routing metadata，因此 severity 承担了过多职责；urgency 和 autofix eligibility 是不同关注点

结果是 workflow 难以安全 promote：它可以是 interactive、autonomous 或 mutation-owning，但如果没有 explicit mode model 和更清晰的 ownership boundaries，就不能同时满足三者。

## 需求追踪

- R1. `ce:review-beta` 支持 explicit execution modes：`interactive`（default）、`autonomous` 和 `report-only`
- R2. `autonomous` mode 从不向用户提问、不等待 approval，只应用 policy-allowed safe fixes
- R3. `report-only` mode 严格 read-only，可安全地与其他 read-only verification steps 并行运行
- R4. Findings 通过 explicit fixability metadata routing，而不是仅靠 severity
- R5. `ce:review-beta` 能为 `safe_auto` findings 运行一个 bounded in-skill autofix pass，然后 re-review changed scope
- R6. Residual actionable findings 作为 durable downstream work artifacts 输出；advisory outputs 保持 report-only
- R7. CE helper outputs（`learnings`、`agent-native`、`schema-drift`、`deployment-verification`）会保留，但只有部分转为 actionable work items
- R8. beta contract 明确 future orchestration constraints，避免后续 `lfg` / `slfg` cutover 在同一 checkout 上并发运行 mutating review 和 browser testing
- R9. interaction mode、routing 和 orchestration boundaries 的重复 regression classes 获得 lightweight contract coverage

## 范围边界

- 保留现有 persona ensemble、confidence gate 和 synthesis model 作为 base architecture
- 不重写每个 reviewer persona 的 prompt，除非需要让它们 emit metadata
- 不引入新的 general-purpose orchestration framework；尽量复用 existing skill patterns
- 不 auto-fix deployment checklists、residual risks 或其他 advisory-only outputs
- 除非 review skill 的 frontmatter 或 references 需要，否则不做 broad converter/platform work
- Beta 是本 plan 唯一 implementation target；stable promotion 有意延后到 validation 后的 follow-up plan

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-review-beta/SKILL.md`
  - 当前 staged review pipeline，包含 interactive severity acceptance、inline fixer、re-review offer 和 post-fix push/PR actions
- `plugins/compound-engineering/skills/ce-review-beta/references/findings-schema.json`
  - 当前 structured persona finding contract；缺少 autonomous handling 所需的 routing metadata
- `plugins/compound-engineering/skills/ce-review/SKILL.md`
  - 当前 stable review workflow；会创建 durable `todos/` artifacts，而不是 inline fix findings
- `plugins/compound-engineering/skills/resolve-todo-parallel/SKILL.md`
  - 现有 residual-work resolver；在 work externalized 后并行处理 items
- `plugins/compound-engineering/skills/file-todos/SKILL.md`
  - 现有 review -> triage -> todo -> resolve integration contract
- `plugins/compound-engineering/skills/lfg/SKILL.md`
  - Sequential orchestrator；其 future cutover constraints 应影响 beta contract，即使本 plan 不修改它
- `plugins/compound-engineering/skills/slfg/SKILL.md`
  - Swarm orchestrator；当前 review/browser parallelism 定义了重要 future integration constraint，即使本 plan 不修改它
- `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md`
  - explicit `mode:autonomous` argument handling 和 conservative non-interactive behavior 的强 repo precedent
- `plugins/compound-engineering/skills/ce-plan/SKILL.md`
  - pipeline mode skipping interactive questions 的强 repo precedent

### 组织内 learnings

- `docs/solutions/skill-design/compound-refresh-skill-improvements.md`
  - explicit autonomous mode 优于 tool-based auto-detection
  - autonomous mode 中的 ambiguous cases 应保守记录，而不是猜测
  - report structure 应区分 applied actions 和 recommended follow-up
- `docs/solutions/skill-design/beta-skills-framework.md`
  - Beta skills 在 validated 前应保持 isolated
  - Promotion 是 rewiring `lfg` / `slfg` 的合适时机；这超出本 plan scope

### 外部调研决策

Skipped。这是 repo-internal orchestration 和 skill-design change，已有本地 patterns 足以覆盖 autonomous mode、beta promotion 和 residual-work handling。

## 关键技术决策

- **使用 explicit mode arguments，而不是 auto-detection。** 遵循 `ce:compound-refresh`，要求 `mode:autonomous` / `mode:report-only` arguments。Interactive 仍是 default。这避免把 "no question tool" 和 "headless workflow" 混为一谈。
- **语义上拆分 review 与 mutation，而不是创建两个 separate skills。** `ce:review-beta` 应始终执行相同 review and synthesis stages。Mutation behavior 变成 mode-controlled phase，叠在其上。
- **按 fixability routing，而不是 severity。** 添加 explicit per-finding routing fields，例如 `autofix_class`、`owner` 和 `requires_verification`。Severity 仍表示 urgency；不再暗示谁来处理。
- **保留一个 in-skill fixer，但仅用于 `safe_auto` findings。** 当前 "one fixer subagent" 规则仍适合 consistent-tree edits。变化在于 fixer 由 policy 和 routing metadata 选择，而不是由 interactive severity prompt 选择。
- **同时输出 ephemeral 和 durable outputs。** 使用 `.context/compound-engineering/ce-review-beta/<run-id>/` 保存 per-run machine-readable report；仅对属于 downstream 的 unresolved actionable findings 创建 durable `todos/` items。
- **按 artifact class 处理 CE helper outputs。**
  - `learnings-researcher`：contextual/advisory，除非有 concrete finding corroborates it
  - `agent-native-reviewer`：通常是 `gated_auto` 或 `manual`；当 fix 纯 local/mechanical 时偶尔是 `safe_auto`
  - `schema-drift-detector`：默认 `manual` 或 `gated_auto`；绝不默认 blind auto-fix
  - `deployment-verification-agent`：始终 advisory / operational，绝不 autofix
- **设计 beta contract，使 future orchestration cutover 安全。** beta 必须明确 mutating review 不能与 browser testing 在同一 checkout 上并发运行。该要求属于 validation 和 future cutover criteria，不是在同一 plan 中重写 `slfg`。
- **把 push / PR creation decisions 移出 autonomous review。** Interactive standalone mode 可以继续提供 next-step prompts。Autonomous 和 report-only modes 在 producing fixes and/or residual artifacts 后停止；未来 parent workflow 决定 commit、push 和 PR timing。
- **添加 lightweight contract tests。** 重复 regressions 来自 instruction-boundary drift。这里即便 behavior 是 prompt-driven，string- 和 structure-level contract tests 也是值得的。

## 开放问题

### 规划期间已解决

- **`ce:review-beta` 是否保留任何 embedded fix loop？** 是，但只在 explicit mode/policy 下用于 `safe_auto` findings。Residual work 会 hand off。
- **autonomous mode 是否应从 lack of interactivity 推断？** 否。使用 explicit `mode:autonomous`。
- **`slfg` 是否应继续并行 review 和 browser testing？** 不应在 review 可 mutate checkout 后继续并行。应在 stabilized tree 上，在 mutating review phase 之后运行 browser testing。
- **Residual work 应用 `todos/`、`.context/` 还是两者？** 两者都用。`.context` 保存 run artifact；`todos/` 只用于 durable unresolved actionable work。

### 延后到实现阶段

- `findings-schema.json` 中的 exact metadata field names
- `report-only` 是否应暗含不同于 `interactive` / `autonomous` 的 default output template section ordering
- residual `todos/` 是由 `ce:review-beta` 直接创建，还是通过一个 shared helper/reference template 创建，该 template 同时供 review 和 resolver flows 使用

## 高层技术设计

这展示 intended approach，是 directional guidance for review，不是 implementation specification。implementing agent 应将其视为 context，而不是要照抄的 code。

```text
review stages -> synthesize -> classify outputs by autofix_class/owner
               -> if mode=report-only: emit report + stop
               -> if mode=interactive: acquire policy from user
               -> if mode=autonomous: use policy from arguments/defaults
               -> run single fixer on safe_auto set
               -> verify tests + focused re-review
               -> emit residual todos for unresolved actionable items
               -> emit advisory/report sections for non-actionable outputs
```

## 实现单元

- [x] **Unit 1：为 ce:review-beta 添加 explicit mode handling 和 routing metadata**

**目标:** 给 `ce:review-beta` 一个清晰 execution contract，用于 standalone、autonomous 和 read-only pipeline use。

**需求:** R1, R2, R3, R4, R7

**依赖:** None

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-review-beta/SKILL.md`
- 修改: `plugins/compound-engineering/skills/ce-review-beta/references/findings-schema.json`
- 修改: `plugins/compound-engineering/skills/ce-review-beta/references/review-output-template.md`
- 修改: `plugins/compound-engineering/skills/ce-review-beta/references/subagent-template.md`（if routing metadata needs to be spelled out in spawn prompts）

**做法:**
- 在 `SKILL.md` 顶部附近添加 Mode Detection section，使用 `ce:compound-refresh` 已建立的 `mode:autonomous` argument pattern
- 与 `mode:autonomous` 并列引入 `mode:report-only`
- 将所有 interactive question instructions 限定为只适用于 interactive mode
- 用 routing-oriented fields 扩展 `findings-schema.json`，例如：
  - `autofix_class`: `safe_auto | gated_auto | manual | advisory`
  - `owner`: `review-fixer | downstream-resolver | human | release`
  - `requires_verification`: boolean
- 更新 review output template，让 final report 可以区分：
  - 已应用的 fixes
  - residual actionable work（剩余 actionable work）
  - advisory / operational notes（advisory / operational notes，建议性 / 运维性 notes）

**遵循的模式:**
- `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md` 的 explicit autonomous mode structure
- `plugins/compound-engineering/skills/ce-plan/SKILL.md` 的 pipeline-mode question skipping

**测试场景:**
- Interactive mode 仍 presents questions and next-step prompts
- `mode:autonomous` 从不提问，也不等待 user input
- `mode:report-only` 不执行 edits，也不执行 commit/push/PR actions
- helper-agent output 可以保留在 final report 中，而不被视为 auto-fixable work

**验证:**
- `tests/review-skill-contract.test.ts` 断言 three mode markers 和 interactive scoping rules
- `bun run release:validate` passes

- [x] **Unit 2：围绕 policy-driven safe autofix 和 bounded re-review 重设计 fix loop**

**目标:** 用同时适合 interactive 和 autonomous contexts 的 fix loop，替换当前 severity-prompt-centric fix loop。

**需求:** R2, R4, R5, R7

**依赖:** Unit 1

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-review-beta/SKILL.md`
- 新增: `plugins/compound-engineering/skills/ce-review-beta/references/fix-policy.md`（if the classification and policy table becomes too large for `SKILL.md`）
- 修改: `plugins/compound-engineering/skills/ce-review-beta/references/review-output-template.md`

**做法:**
- 将 "Severity Acceptance" 作为主要 decision point，替换为按 `autofix_class` grouping synthesized findings 的 classification stage
- 在 interactive mode 中，只对 classification 后仍 ambiguous 的 policy decisions 询问用户
- 在 autonomous mode 中，使用 conservative defaults：
- apply `safe_auto`（应用 `safe_auto`）
- leave `gated_auto`, `manual`, and `advisory` unresolved（保留 `gated_auto`、`manual` 和 `advisory` unresolved）
- 为 consistency 保留 "exactly one fixer subagent" 规则
- 用 `max_rounds`（例如 2）限制 loop，并在任何 applied fix set 后要求 targeted verification 加 focused re-review
- 将 commit / push / PR creation steps 限制在 interactive mode only；autonomous 和 report-only modes 在 emit outputs 后停止

**遵循的模式:**
- `docs/solutions/skill-design/compound-refresh-skill-improvements.md` 的 applied-vs-recommended distinction
- Existing `ce-review-beta` single-fixer rule（现有 `ce-review-beta` single-fixer 规则）

**测试场景:**
- `safe_auto` testing finding 在 autonomous mode 中无需 user input 即可 fixed and re-reviewed
- `gated_auto` API contract 或 authz finding 会作为 residual actionable work 保留，而不是 auto-fixed
- deployment checklist 保持 advisory，绝不会进入 fixer queue
- zero findings 完全 skip fix phase
- Re-review bounded，不会无限 recurse

**验证:**
- `tests/review-skill-contract.test.ts` 断言 autonomous mode 在 fix path 中没有 mandatory user-question step
- Manual dry run：从头读完 fix-loop prose，确认没有 mutation-owning step 位于 policy gate 之外

- [x] **Unit 3：定义 residual artifact 和 downstream handoff behavior**

**目标:** 让 autonomous review 与 downstream workflows compatible，而不是争夺 ownership。

**需求:** R5, R6, R7

**依赖:** Unit 2

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-review-beta/SKILL.md`
- 修改: `plugins/compound-engineering/skills/resolve-todo-parallel/SKILL.md`
- 修改: `plugins/compound-engineering/skills/file-todos/SKILL.md`
- 新增: `plugins/compound-engineering/skills/ce-review-beta/references/residual-work-template.md`（if a dedicated durable-work shape helps keep review prose smaller）

**做法:**
- 在 `.context/compound-engineering/ce-review-beta/<run-id>/` 下写 per-run review artifact，包含：
- synthesized findings（已综合的 findings）
- what was auto-fixed（已 auto-fixed 的内容）
- what remains unresolved（仍 unresolved 的内容）
- advisory-only outputs（仅 advisory 的 outputs）
- 仅为 `owner` 是 downstream resolution 的 unresolved actionable findings 创建 durable `todos/` items
- 更新 `resolve-todo-parallel`，显式认可该 source，让 residual review work 可被拾取，而不假装所有事项都来自 stable `ce:review`
- 更新 `file-todos` integration guidance 以反映新 flow：
- review-beta autonomous -> residual todos -> resolve-todo-parallel（review-beta autonomous 到 residual todos 再到 resolve-todo-parallel）
  - advisory-only outputs 不会成为 todos

**遵循的模式:**
- `AGENTS.md` 中的 `.context/compound-engineering/<workflow>/<run-id>/` scratch-space convention
- Existing `file-todos` review/resolution lifecycle（现有 `file-todos` review/resolution lifecycle）

**测试场景:**
- Autonomous review 只有 advisory outputs 时不创建 todos
- Autonomous review 有 2 个 unresolved actionable findings 时正好创建 2 个 residual todos
- Residual work items 排除 protected-artifact cleanup suggestions
- run artifact 足以解释 in-skill fixer 改了什么，以及剩余什么

**验证:**
- `tests/review-skill-contract.test.ts` 断言 documented `.context` 和 `todos/` handoff rules
- `bun run release:validate` passes after any skill inventory/reference changes

- [x] **Unit 4：为 mode、handoff 和 future-integration boundaries 添加 contract-focused regression coverage**

**目标:** 捕捉这些已经多次逃过 manual review 的 instruction-boundary regressions。

**需求:** R8, R9

**依赖:** Units 1-3

**文件:**
- 新增: `tests/review-skill-contract.test.ts`
- 可选修改: `package.json` only if a new test entry point is required（prefer using the existing Bun test setup without package changes）

**做法:**
- 添加 focused test，读取相关 skill files 并 assert contract-level invariants，而不是 brittle full-file snapshots
- 覆盖:
- `ce-review-beta` mode markers 和 mode-specific behavior phrases
- autonomous/report-only paths 中不存在 unconditional interactive prompts
- explicit residual-work handoff language（明确的 residual-work handoff language）
- explicit documentation that mutating review must not run concurrently with browser testing on the same checkout（明确记录 mutating review 不得与 browser testing 在同一 checkout 并发运行）
- 保持 assertions semantic and localized；避免 snapshotting large markdown files

**遵循的模式:**
- Existing Bun tests that read repository files directly for release/config validation（现有直接读取 repo 文件进行 release/config validation 的 Bun tests）

**测试场景:**
- 缺少 `mode:autonomous` block 时失败
- 在 autonomous path 重新引入 unconditional "Ask the user" text 时失败
- 缺少 residual todo handoff text 时失败
- 缺少 mutating review 与 browser testing 同 checkout 并发运行限制时失败

**验证:**
- `bun test tests/review-skill-contract.test.ts`
- full `bun test`（完整 `bun test`）

## 风险与依赖

- **过度激进的 autofix classification。**
- Mitigation：使用 conservative defaults、`gated_auto` bucket、bounded rounds 和 focused re-review
- **`ce:review-beta` 与 `resolve-todo-parallel` 之间的 dual ownership confusion。**
- Mitigation：使用 explicit owner/routing metadata 和 durable residual-work contract
- **脆弱的 contract tests。**
- Mitigation：只 assert boundary invariants，不做 full markdown snapshots
- **Promotion churn（promotion churn，promotion 过程 churn）。**
- Mitigation：在 Unit 4 contract coverage 和 manual verification pass 前保持 beta isolated

## 来源与参考

- Related skills（相关 skills）：
  - `plugins/compound-engineering/skills/ce-review-beta/SKILL.md`
  - `plugins/compound-engineering/skills/ce-review/SKILL.md`
  - `plugins/compound-engineering/skills/resolve-todo-parallel/SKILL.md`
  - `plugins/compound-engineering/skills/file-todos/SKILL.md`
  - `plugins/compound-engineering/skills/lfg/SKILL.md`
  - `plugins/compound-engineering/skills/slfg/SKILL.md`
- Institutional learnings（组织经验）：
  - `docs/solutions/skill-design/compound-refresh-skill-improvements.md`
  - `docs/solutions/skill-design/beta-skills-framework.md`
- Supporting pattern reference（支持性 pattern reference）：
  - `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md`
  - `plugins/compound-engineering/skills/ce-plan/SKILL.md`
