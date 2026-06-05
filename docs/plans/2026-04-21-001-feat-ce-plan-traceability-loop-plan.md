---
title: "feat: ce-plan U-IDs 和 origin traceability loop"
type: feat
status: active
date: 2026-04-21
---

# feat: ce-plan U-IDs and origin traceability loop（origin 可追踪闭环）

## 概览

关闭 PR #629 打开的 brainstorm -> plan -> work traceability loop。PR #629 为 `ce-brainstorm` requirements docs 增加了 stable IDs（`A`、`F`、`AE`）和 Deep-product tier，并将 Scope Boundaries section 拆分；同时轻量更新了 `ce-plan` 和 `ce-work`，让它们将这些 IDs 作为 constraints *carry forward*。但 plan template 本身从未更新以暴露新的 origin IDs，Implementation Units 也没有自己的 stable IDs。因此执行侧诸如 "blocked on Unit 3" 这样的引用会在编辑后变得 ambiguous；origin actors/flows/acceptance examples 对任何没有打开 upstream brainstorm doc 的 plan 读者也不可见。

本 PR 用五个聚焦变更完成闭环：

1. 为 Implementation Units 提供 plan-local stable `U-IDs`，并用 stability rule 保证 deepening reorder 后仍稳定。
2. 在 Requirements Trace 下添加 conditional Origin Trace sub-blocks（Actors、Key Flows、Acceptance Examples），仅当 origin doc 提供它们时出现。
3. Scope Boundaries 三路拆分：仅由 Deep-product origin 触发，并将 plan-local subsection 从含糊的 "Deferred to Separate Tasks" 重命名为 **Deferred to Follow-Up Work**。
4. 为 test scenarios 提供 sparse-by-design AE-link convention（`Covers AE2.`），让 Acceptance Example disambiguation 能传播到 enforcement。
5. Planning-side Alternatives rule 镜像 brainstorm：alternatives 的差异在 *how*，不在 *what*。

另有支撑 machinery：Phase 5.1 finalization checklist 更新、`deepening-workflow.md` checklist 更新（包括在最容易发生 renumber accident 的位置给出 U-ID stability warning），以及同步更新 `ce-work` 和 `ce-work-beta`，使 U-IDs 作为 task-label prefixes、blocker/verification references 保留到 execution。

---

## Change Matrix（变更矩阵）

| File | Change | Unit |
|------|--------|------|
| `plugins/compound-engineering/skills/ce-plan/SKILL.md` | U-ID format + stability rule (Phase 3.3, 3.5, template) | U1 |
| `plugins/compound-engineering/skills/ce-plan/SKILL.md` | Origin Trace sub-blocks + Scope Boundaries three-way split + rename to "Deferred to Follow-Up Work" | U2 |
| `plugins/compound-engineering/skills/ce-plan/SKILL.md` | AE-link convention + Alternatives rule + Phase 5.1 checklist updates | U3 |
| `plugins/compound-engineering/skills/ce-plan/references/deepening-workflow.md` | U-ID stability warning + origin A/F/AE preservation checks | U4 |
| `plugins/compound-engineering/skills/ce-work/SKILL.md` + `plugins/compound-engineering/skills/ce-work-beta/SKILL.md` | U-ID recognition in blockers/verification + task label prefix rule | U5 |

---

## 问题框架

### 当前问题

- **Implementation Units 没有 stable identifier。** plan 引用 "Unit 1, Unit 2..."，这是 positional label，在 units reorder 或 split 后会 renumber。PR #629 已更新 `ce-work` 和 `ce-work-beta`，使它们在 blockers 和 verification 中引用 R/A/F/AE IDs，但它们无法无歧义地引用 *哪个 unit* 被 blocked。Deepening（Phase 5.3）会 reorder 或 split units，恰恰是最需要 stability 的时候。
- **Origin A/F/AE IDs 在 plan output 中不可见。** `ce-plan` SKILL.md 文本说要将 origin A/F/AE *preserve* 为 Implementation Units 必须 honor 的 constraints，但 plan template 没有任何 surface 显示它们。实现者或 reviewer 阅读 plan 时，必须打开 origin requirements doc 才能看到该 plan 关联哪些 actors、flows 或 acceptance examples。
- **Scope Boundaries 无法表达 product-tier distinction。** PR #629 在 Deep-product brainstorms 中引入了 `Deferred for later`（product sequencing）vs `Outside this product's identity`（positioning rejection）。plan template 只有 `Deferred to Separate Tasks`，这是不同概念（PR-level implementation sequencing）。当前既无法 carry forward origin 的 product-tier scope split；而且现有名称 "Deferred to Separate Tasks" 本身也含糊，因为 "task" 与 `TaskCreate`/`TaskList` tooling 重叠，且该 section 内容是 PRs/issues/repos，不是 tasks。
- **Acceptance Examples 没有 enforcement link。** AE 被加入 brainstorm 的目的，是通过 canonical scenarios 消除 ambiguous requirements 的歧义。如果 test scenarios 不链接到 AE-IDs，这个 disambiguation 会衰减：实现者可能写出通过 R3 字面文本的 tests，却错过本应钉住 R3 含义的 AE1 scenario。
- **Plan alternatives 可能重新争论 product questions。** 如果没有 planning-side 规则镜像 brainstorm 的 "alternatives differ on what" 规则，plans 可能重新生成 product-shape alternatives（例如 "should we build for end users or operators?"），而这些本应在 brainstorm 阶段定下来。

### 影响所有变更的设计约束

`ce-plan` 必须在没有 origin doc 时仍然有用。并非每个用户都会先运行 `ce-brainstorm`；piecemeal use 是有意支持的。此处引入的每个 origin-derived structure 都必须在 template 中显式 conditional，且在 origin absent 时有明确 fallback，并且 no-origin path 不应产生 broken sections（empty headers、dangling references）。

这就是本 PR 同时引入的 **conditionality design rule**。

---

## 需求追踪

**Plan template structure（plan template 结构）**
- R1. Implementation Units 带 stable `U-IDs`，可承受 reordering、splitting 和 deletion。New units 取 next unused number；gaps 允许存在；existing IDs 永不 renumber。
- R2. 当 origin doc 提供 Actors/Key Flows/Acceptance Examples 时，plan template 在 Requirements Trace sub-block 中显示它们；origin absent 或 non-Deep tier 时干净省略该 sub-block。
- R3. plan template 支持 Deep-product origin 下的三路 Scope Boundaries split（`Deferred for later` + `Outside this product's identity` + `Deferred to Follow-Up Work`），origin absent 或 non-product-tier 时 collapse 为单一 list。
- R4. 在 `ce-plan/SKILL.md` 中出现的 "Deferred to Separate Tasks" subsection 全部重命名为 **Deferred to Follow-Up Work**，包括 Phase 5.1 review checklist references。

**Workflow rules and conventions（workflow rules 与 conventions）**
- R5. 直接 enforce origin Acceptance Example 的 test scenarios 以 `Covers AE<N>.`（或 `Covers F<N> / AE<N>.`）为前缀。该 convention 是 sparse-by-design：大多数 test scenarios 比 AEs 更细粒度，不链接。
- R6. Planning-side Alternatives rule（Phase 4.1b）说明：alternatives 的差异在于 work *如何* build；微小 implementation variants 属于 Key Technical Decisions；product-shape alternatives 属于 `ce-brainstorm`。

**Review and deepening machinery（review 与 deepening 机制）**
- R7. Phase 5.1 finalization checklist 使用 judgment-call phrasing（"origin R/F/AE that affects implementation"）执行新 contract，而不是机械的 "every ID appears" checks。所有 origin-related checks 都由 "if origin exists" guard。
- R8. `deepening-workflow.md` checklist 增加 explicit U-ID stability warning（deepening 在 reorder 或 split 时不得 renumber units），以及 origin A/F/AE preservation checks。

**Execution-side recognition（执行侧识别）**
- R9. `ce-work/SKILL.md` 和 `ce-work-beta/SKILL.md` 在 blockers、deferred-work notes、task summaries 和 final verification 中，除了 `R/A/F/AE` 也识别 `U-ID`。从 plan units 创建 tasks 时，task labels 包含 U-ID prefix（例如 "U3: Add parser coverage"），让 blockers 和 summaries 引用同一 anchor。

**Validation（验证）**
- R10. 变更后 `bun test` 和 `bun run release:validate` 通过。

### 成功标准

- 从带 A/F/AE IDs 的 brainstorm 生成的 plan，会在 Requirements Trace section 中显示这些 IDs，而实现者无需打开 origin doc。
- 从没有 upstream brainstorm 的 feature description 生成的 plan，会渲染干净 template，没有 empty origin-related headers 或 dangling references。
- 在 deepening 中 reorder units 的 plan 保留原始 U-IDs（例如 U1、U3、U5 以新顺序存在是可以的；renumber 为 U1、U2、U3 不可以）。
- `ce-work` 在 blocker 中引用 "U3" 时，可以无歧义匹配到 source plan 中的特定 Implementation Unit，无论 plan 自 work 开始以来是否被编辑。
- 直接 enforce AE1 canonical scenario 的 test scenario 带 `Covers AE1.`，使 disambiguation 可 audit。

---

## 范围边界

- 本 PR 不引入新的 plan-depth tier。不存在 "Deep-product-plan" classification。Lightweight / Standard / Deep 保持不变。
- 不新增 top-level template sections。Origin trace 位于现有 Requirements Trace section 内。
- 不新增 `U` 之外的 ID namespaces。Open Questions 不获得 Q-IDs。
- 不重命名 `Implementation Units`。
- 不拆分 `ce-plan` 为多个 skills。
- 不提供 fixed-category decision checklists（Programming language、Database 等）：这对 `ce-plan` 的开放范围是错误 abstraction。
- 不做 source code、schema 或 test changes。这是 skill-content（Markdown）PR。唯一运行的命令是 `bun test` 和 `bun run release:validate` 用于 validation。

### Deferred to Follow-Up Work（延后跟进工作）

- Plan-section matrix（类似 PR #629 中 brainstorm tier-by-section matrix）。值得做；当前 inclusion rules 分散在 Phase 3/4 中，但这是 standalone documentation cleanup，不属于 traceability loop。
- 在 plan output 中加入 detected "Existing Technology" callout，显示 plan 继承了什么 vs 引入了什么。
- 带 "when to revisit" column 的 "Deferred Decisions" table。
- 捕获 U-ID/R-ID/AE-link traceability convention 的 `docs/solutions/` write-up。按 repo convention，这类内容在 change ships *之后* 才写入，因此应在该 PR merge 后的 follow-up `ce-compound` pass 中完成。

---

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/ce-brainstorm/references/requirements-capture.md` - PR #629 的 section matrix 和 triggered-section format 建立了 template-author conventions（R/A/F/AE prefix style、`Covers:` back-references、conditional sections）。Plan-side changes 逐字镜像这些 conventions。
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md` - Phase 0.3 的 Deep-product detection logic 是 plan template 中触发 three-way Scope Boundaries split 的 upstream signal。
- `plugins/compound-engineering/skills/ce-plan/SKILL.md` - Phase 0.3 已有关于 preserving A/F/AE IDs 和 Scope Boundaries subsections 的 placeholder text。本 PR 通过让它们在 plan output 中可见来完成工作。
- `plugins/compound-engineering/skills/ce-work/SKILL.md` line 297 + `ce-work-beta/SKILL.md` line 362 - "Track Progress" sections 中现有 R/A/F/AE recognition guidance 是添加 U-ID 的接入点。

### 组织内经验

- `docs/solutions/skill-design/research-agent-pipeline-separation.md` - 确认 brainstorm/plan/work pipeline 有意按 information type 分离，plan 是交给 ce-work 的 **sole handoff artifact**。这支撑 conditionality design rule：ce-work 必须能仅从 plan file 读到它需要的一切，所以 U-IDs 必须存在于 plan 中，而不是要求回读 brainstorm。
- `docs/solutions/skill-design/beta-skills-framework.md` 和 `docs/solutions/skill-design/beta-promotion-orchestration-contract.md` - 确认 contract 变化时，ce-work 和 ce-work-beta 必须原子同步。U-ID recognition guidance 同样适用于两个 surfaces；sync decision 必须按 repo convention 显式说明。
- `docs/solutions/best-practices/conditional-visual-aids-in-generated-documents.md` - 确立 conditional document sections 应由 observable content patterns 触发，而不是 size/depth/tier proxies。验证了 Origin Trace sub-blocks 采用 "trigger on origin doc presence" 模型，而不是 "trigger on plan tier"。
- `docs/solutions/best-practices/ce-pipeline-end-to-end-learnings.md` - 指出 doc-review 能可靠捕获 "unit adds a thing the plan's own scope boundary forbade"。Scope Boundaries three-way split 正是 doc-review 应捕获矛盾的 architectural template change。同时强化：不要把两个 semantic meanings 混进同一个 identifier；保持 U-ID 和 R-ID 语义清晰。
- `docs/solutions/skill-design/ce-doc-review-calibration-patterns.md` - "Coverage/rendering count invariants need a single source of truth." 适用于 U-ID generation：Implementation Unit heading 是 authoritative location；ce-work 的 blocker/verification recognition 只读取，不生成。

### 外部参考

- 未使用。这是对 in-repo Markdown 的 skill-content change；未咨询外部 docs 或 framework behavior。

---

## 关键技术决策

- **U-ID format mirrors R/A/F/AE exactly.** bullet 开头 plain prefix（`U1.`），不加粗。unit heading line 变为 `- [ ] U1. **Name**`，使 checkbox、ID 和 name 在同一行可见。理由：PR #629 有意选择这种格式，让视觉上有区别但不增加 table 或 bold-label overhead。偏离会让实现者连续读取四个 ID namespaces 时产生不对称。
- **U-IDs are plan-local, not session-global.** 每个 plan 自己从 U1 开始编号。不需要 cross-plan uniqueness，因为 downstream consumer 不会跨 plans 引用 units。Plan-local scope 让 namespace 简单，避免 coordination problems。
- **U-ID stability rule lives in two places: Phase 3.5 (where units are defined) AND template comments (Phase 4.2).** Deepening（Phase 5.3）是最可能发生 accidental-renumber 的路径：agent 重组 units 时可能会 "tidy up" numbering。在两处声明规则：一次在 mint new units 的位置，一次在 agent 正在编辑的 template surface 中可见，从两个入口防止事故。
- **Origin Trace is a sub-block under existing Requirements Trace, not a new top-level section.** 理论上新增 top-level `## Origin` section 更干净，但它会在 no-origin mode 消失，并为 common case 增加 ceremony。Sub-blocks 保持 section count 扁平，并让 section 自然降级。
- **Scope Boundaries three-way split triggers on observable origin content**（origin 中存在 `Outside this product's identity` subsection），而不是 "Deep-product origin" tier flag。这样避免 plan 需要知道 origin 的 tier classification；它只检查 origin doc 中实际存在的内容。与 `conditional-visual-aids-in-generated-documents.md` 一致。
- **Renamed "Deferred to Separate Tasks" -> "Deferred to Follow-Up Work."** 三个原因："task" 与 `TaskCreate`/`TaskList` tooling 重叠；该 section 内容是 PRs/issues/repos（不是 "tasks"）；另一个考虑过的名称 "Out of Scope for This Plan" 读起来像真正 non-goals，会与 carry-forward 的 "Outside this product's identity" subsection 冲突。"Follow-Up Work" 精确表达 *有意不在本 plan 中，但仍属于整体 effort*。
- **AE-link uses "should when applicable," not "may."** "May" 太弱；agents 在压力下会跳过 optional rules。"Should when directly enforces" 用真实条件 gate 规则（test 必须 directly enforce AE），同时在条件满足时强制遵循。
- **U-ID recognition in ce-work and ce-work-beta is identical.** 此处不适用 experimental delegate-mode divergence。PR #629 中的 R-ID/A/F/AE guidance 已原子发布到两者。Sync decision：propagate to both，这是 shared traceability contract。
- **Phase 5.1 checklist phrasing avoids "every ID appears."** 机械 coverage rules 会诱发 compliance theater。更好的措辞是："every origin R/F/AE *that affects implementation* is referenced or explicitly deferred." Judgment call（"that affects implementation"）是关键，避免 ID spam。
- **No documentation update to README.md component counts.** 本 PR 不增删 skills、agents 或 commands。Plugin surface area 不变。

---

## 开放问题

### 规划期间已解决

- **Should test scenarios linking to AE-IDs use `Covers` or `Enforces`?** Resolved: `Covers` - 与 brainstorm 中 AE definitions 上的 `Covers: R-IDs` convention 对称，读者看到两个 docs 时会看到相同 vocabulary。
- **Should U-IDs be bolded like the unit name (`**U1**`)?** Resolved: no - PR #629 明确为 R/A/F/AE 选择 plain-prefix format，因为 prefix 本身已具备视觉辨识度；双重加粗会产生 visual noise，并偏离既有格式。
- **Should the plan template carry forward the origin's tier classification (Lightweight/Standard/Deep-feature/Deep-product) in the frontmatter?** Resolved: no - plan tier 是 planning concern；origin tier 是 brainstorm 如何 classify scope 的 artifact。耦合两者会造成误导性 dependency。Conditional content 由 observable origin doc patterns 触发（例如存在 `Outside this product's identity` subsection），而不是 propagated tier flag。

### 延后到实现阶段

- **Exact wording of the U-ID stability rule in template comments.** template comment 必须简短（template comments 对 skill 每个用户可见），但要对 deepening case 无歧义。最终措辞会在 implementation 中结合实际 template content 草拟。
- **Whether to add an HTML comment or inline note next to the renamed "Deferred to Follow-Up Work" subsection**，解释它与 carried-forward "Deferred for later" 的区别。Implementer 应在看到 rendered three-way split 后评估；如果名称本身在 context 中足够清楚，就不需要 clarifying note。
- **Whether `ce-work-beta`'s task creation guidance has any beta-specific divergence that would block applying the U-ID prefix rule identically.** Implementer 应在应用 change 前 side-by-side diff 两个 task-creation sections，确认没有意外 divergence。

---

## 实现单元

- [x] **U1：`ce-plan/SKILL.md` 中的 U-IDs 和 stability rule**

**目标：** 为 Implementation Units 引入 stable plan-local `U-IDs`，并让 stability rule 同时出现在定义 units 的 workflow phase 和 agent 填写的 template 中。

**需求：** R1

**依赖：** 无

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-plan/SKILL.md`

**做法：**
- 在 Phase 3.3（"Break Work into Implementation Units"）增加简短说明：units 带 stable U-IDs，在 Phase 3.5 分配。说明 reordering、splitting 或 deleting units 不会 renumber existing U-IDs；new units 取 next unused number；gaps 允许存在。
- 在 Phase 3.5（"Define Each Implementation Unit"）更新 unit format description，在 unit bullet line 开头加入 U-ID prefix。保留其他 unit fields（Goal、Requirements、Dependencies 等）不变。
- 在 Phase 4.2 的 core plan template 中，将 example unit heading 从 `- [ ] **Unit 1: [Name]**` 改为 `- [ ] U1. **[Name]**`。在 Implementation Units section 上方立即添加 template comment，重申 stability rule，使其在 editing surface 可见。
- Cross-check SKILL.md 其他 sections 中是否仍以 positional name（"Unit 1"）引用 units，且与新格式不一致。如发现，更新为 U-ID style。

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-brainstorm/references/requirements-capture.md` - R/A/F/AE prefix format（plain prefix，不加粗；`R1.` 而不是 `**R1.**`）。

**测试场景：**
- Happy path: 变更后 example template unit heading 读作 `- [ ] U1. **[Name]**`。Phase 3.3 和 Phase 3.5 都包含 stability-rule statement。Template 在 Implementation Units section 附近有可见 comment 重申该规则。
- Edge case: 一个由更新后 skill 生成的 plan，在 deepening 中一个 unit 被 split、另一个被 reordered，仍保留原始 U-IDs（不 renumber）。New units 取 next unused number。
- Integration: agent 读取 `ce-work` blocker reference "U3" 时，即使 plan 自 work 开始后被编辑过，也能无歧义定位对应 unit。

**验证：**
- `ce-plan/SKILL.md` Phase 3.3、3.5 和 Phase 4.2 template 都一致引用 U-ID format。
- Stability rule 至少出现在 Phase 3.5，以及 Implementation Units section 附近的 template comment 中。
- 快速 skim SKILL.md 剩余部分，没有发现会与新格式冲突的 positional "Unit N" references。

---

- [x] **U2：`ce-plan/SKILL.md` 中的 Origin Trace sub-block、Scope Boundaries three-way split 和 rename**

**目标：** 通过 Requirements Trace 下的 conditional sub-block，让 origin A/F/AE IDs 在 plan output 中可见；origin 为 Deep-product 时支持 three-way Scope Boundaries split；将 "Deferred to Separate Tasks" 全部重命名为 "Deferred to Follow-Up Work"。

**需求：** R2, R3, R4

**依赖：** 无（与同一文件中的 U1 edits 独立；commit 时协调）

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-plan/SKILL.md`

**做法：**
- 在 Phase 4.2 core plan template 的 Requirements Trace section 下，添加三个 optional sub-block lines：`**Origin actors:**`、`**Origin flows:**`、`**Origin acceptance examples:**`。每行带一行说明该填什么。用 HTML comment 包围这些 sub-blocks，说明只有当 origin document 提供对应 section 时才 include，否则完全 omit。
- 在 Phase 4.2 template 的 Scope Boundaries section 中，将现有单一 `### Deferred to Separate Tasks` subsection block 替换为 conditional structure：
  - Default（无 origin，或 non-product-tier origin）：一个 explicit non-goals 的 bulleted list。仍允许在 implementation 有意拆分时加入可选 `### Deferred to Follow-Up Work` subsection。
  - Triggered（Deep-product origin，通过 origin 中存在 `Outside this product's identity` subsection 检测）：三个 subsections - `### Deferred for later`（从 origin carry forward，product-tier sequencing）、`### Outside this product's identity`（从 origin carry forward，positioning rejection）、`### Deferred to Follow-Up Work`（plan-local，拆到其他 PRs/issues/repos 的 implementation work）。
- 用 template comments 包围 conditional structure，说明 trigger condition 和 no-origin fallback。
- 搜索 `ce-plan/SKILL.md` 中所有其他 "Deferred to Separate Tasks" references（例如 Phase 5.1 review checklist），并重命名为 "Deferred to Follow-Up Work"。

**遵循的模式：**
- Conditionality: 每个 conditional block 周围加 HTML comment，说明 trigger 和 no-origin fallback。镜像 `requirements-capture.md` 中 brainstorm template 的 "include when triggered" comment style。

**测试场景：**
- Happy path (with origin): 从 Deep-product brainstorm 生成的 plan，会在 Requirements Trace section 中填充全部三个 Origin sub-blocks，并在 Scope Boundaries section 中使用 three-way split。
- Edge case (no origin): 从没有 upstream brainstorm 的 feature description 生成的 plan，只渲染 Requirements Trace section 中的 R-ID bullets（无 empty `**Origin actors:**` line、无 dangling header），Scope Boundaries section 为单一 list。无 broken structure。
- Edge case (Deep-feature origin, not Deep-product): Origin Trace sub-blocks 可被填充（A/F/AE 可在任何 tier 触发时出现），但 Scope Boundaries collapse 为 single list，因为 origin 不含 `Outside this product's identity`。
- Integration: Renamed subsection wording 在 template、Phase 5.1 checklist references 和 SKILL.md 内其他 cross-references 中一致。

**验证：**
- Phase 4.2 template Requirements Trace section 显示三个 optional sub-block lines，并带 HTML-comment triggers。
- Phase 4.2 template Scope Boundaries section 显示 conditional three-way split，并带 HTML-comment triggers。
- 在 `ce-plan/SKILL.md` 中搜索 "Deferred to Separate Tasks" 返回零结果。
- 搜索 "Deferred to Follow-Up Work" 在 template 和 Phase 5.1 中均有 matches。

---

- [x] **U3：`ce-plan/SKILL.md` 中的 AE-link convention、Alternatives rule 和 Phase 5.1 checklist updates**

**目标：** 添加三个较小的 workflow rules：test scenarios 的 AE-link convention、镜像 brainstorm 的 planning-side Alternatives rule，以及执行新 origin-traceability contract 的 Phase 5.1 finalization checklist entries，且使用 judgment-call phrasing。

**需求：** R5, R6, R7

**依赖：** U1, U2（Phase 5.1 checklist 引用这些 units 引入的新 template structures 和 U-ID concept）

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-plan/SKILL.md`

**做法：**
- 在 Phase 3.5（"Define Each Implementation Unit"）的 **Test scenarios** bullet 下，添加简短 AE-link guidance："When a test scenario directly enforces an origin Acceptance Example, prefix it with `Covers AE<N>.` (or `Covers F<N> / AE<N>.`). Do not force AE links onto tests that only cover lower-level implementation details." 将其放在现有 Test scenarios description 的句子中，而不是新 sub-bullet：这是 convention，不是 category。
- 在 Phase 4.1b（"Optional Deep Plan Extensions"）的 "Alternative Approaches Considered" 条目下，追加 planning-side rule，用一两句话说明："Alternatives differ on *how* the work is built — architecture, sequencing, boundaries, integration pattern, rollout strategy. Tiny implementation variants belong in Key Technical Decisions, not Alternatives. Product-shape alternatives belong in `ce-brainstorm`, not here."
- 在 Phase 5.1（"Review Before Writing"）加入新的 checklist bullets：
  - "If origin document exists with A/F/AE IDs, every origin R/F/AE *that affects implementation* is referenced in Requirements Trace, a U-ID unit, test scenarios, verification, scope boundaries, or explicitly deferred. Actors are carried forward when they affect behavior, permissions, UX, orchestration, handoff, or verification. No origin section is silently dropped."（引用的 checklist 文案）
  - "U-IDs are unique within the plan and follow the stability rule — no two units share an ID; reordering or splitting did not renumber existing units."（引用的 checklist 文案）
  - 将现有 "Scope Boundaries... `### Deferred to Separate Tasks`" check 更新为 renamed subsection name。
  - "If origin was Deep-product (origin contains `Outside this product's identity`), the plan's Scope Boundaries section preserves the three-way split."（引用的 checklist 文案）
- 所有 origin-related checklist additions 都必须由 "If origin document exists" guard，使 no-origin path 自然跳过。

**遵循的模式：**
- Phase 5.1 existing bullet style - short imperative，每个 bullet 一个 concern。
- Judgment-call phrasing: "that affects implementation" / "when applicable"，而不是 "every ID must appear."

**测试场景：**
- Happy path: Phase 3.5 在 Test scenarios description 中包含 AE-link guidance sentence。Phase 4.1b 的 Alternative Approaches Considered entry 包含 planning-side rule。Phase 5.1 包含新的 origin-traceability bullets 和 U-ID stability check，且均有 no-origin guard。
- Edge case: 对无 origin doc 的 plan 做 Phase 5.1 review 时，origin-related bullets cleanly skip（"If origin document exists" guard short-circuits）。
- Integration: 重新阅读 SKILL.md 的 agent 遵循新规则：提出 architecture/sequencing 层面的 alternatives，而不是 product shape；直接 enforce AE1 的 test scenario 以 `Covers AE1.` 为前缀；finalization 时 flag 被 silently dropped 的 origin sections。

**验证：**
- Phase 3.5 包含 AE-link guidance。
- Phase 4.1b 的 Alternatives entry 包含 planning mirror rule。
- Phase 5.1 包含新 bullets，所有 origin-related entries 均由 "If origin document exists" guard。
- Phase 5.1 中引用 renamed subsection 的 entry 使用 "Deferred to Follow-Up Work"。

---

- [x] **U4：`deepening-workflow.md` checklist updates（checklist 更新）**

**目标：** 更新 deepening machinery，使新 contract 在 plans 实际被强化的位置得到 enforce。最关键新增项：在最可能发生 renumber-accident 的位置放置 U-ID stability warning。

**需求：** R8

**依赖：** U1, U2, U3

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-plan/references/deepening-workflow.md`

**做法：**
- 在 Implementation Units checklist（Step 5.3.3）中添加 bullets：
  - "Existing U-IDs are renumbered after a unit was reordered, split, or deleted. (U-IDs must remain stable — gaps are fine; new units take the next unused number.)"（引用的 checklist 文案）
  - "A unit realizing a flow does not cite the F-ID; a unit enforcing an Acceptance Example does not cite the AE-ID, when origin supplies them."（引用的 checklist 文案）
- 在 Requirements Trace checklist 中添加："Origin A/F/AE IDs (when present) are not preserved where planning decisions touch them, or are referenced inconsistently."
- 在 Step 5.3.7（"Synthesize and Update the Plan"）的 **Allowed changes** list 下，将现有 "Reorder or split implementation units when sequencing is weak" bullet 配上 explicit warning："When reordering or splitting units, do NOT renumber existing U-IDs. The new unit takes the next unused number; the original units retain their IDs in their new order. Renumbering breaks `ce-work` blocker/verification references."
- 在 Step 5.3.7 的 **Do not** list 中添加："Renumber existing U-IDs as part of reordering or tidying."

**遵循的模式：**
- `deepening-workflow.md` 中现有 checklist style - short imperative，每个 concern 一个 bullet，并配 example signals。

**测试场景：**
- Happy path: Implementation Units checklist 包含 U-ID stability check 和 F-ID/AE-ID citation check。Requirements Trace checklist 包含 origin preservation check。Step 5.3.7 的 Allowed/Do-not lists 显式指出 renumber prohibition。
- Edge case: Deepening 无 origin doc 的 plan 时，F-ID/AE-ID citation check 实际 no-op，因为没有 origin IDs 可 cite。U-ID stability check 无论如何都生效。
- Integration: agent 运行 deepening 将 Unit 3 拆成两个 units 时，创建 U6（next unused）并保留原 U3，只缩减其内容；不 renumber 为 "U3a/U3b"，也不重写 numbering。

**验证：**
- Implementation Units checklist 包含两个 new bullets。
- Requirements Trace checklist 包含 origin preservation bullet。
- Step 5.3.7 Allowed-changes section 显式说明 renumber prohibition 并带 paired warning。
- Step 5.3.7 Do-not list 显式禁止 renumbering。

---

- [x] **U5：`ce-work/SKILL.md` 和 `ce-work-beta/SKILL.md` 中的 U-ID recognition + task label rule**

**目标：** 关闭 execution side 的 loop。ce-work 和 ce-work-beta 在 blockers/verification/summaries 中识别 U-IDs 以及 R/A/F/AE，并在 task labels 中保留 U-ID prefix，使 blockers 和 summaries 引用同一 anchor。

**需求：** R9

**依赖：** U1（plan format 中必须先存在 U-IDs，execution-side tooling 才能引用）

**文件：**
- 修改: `plugins/compound-engineering/skills/ce-work/SKILL.md`
- 修改: `plugins/compound-engineering/skills/ce-work-beta/SKILL.md`

**做法：**
- 定位 `ce-work/SKILL.md`（当前约 line 297）和 `ce-work-beta/SKILL.md`（当前约 line 362）中现有 "Track Progress" section。PR #629 的 R-ID/A/F/AE recognition guidance 在此处。将 `U-IDs` 加入 recognized ID set："When the plan or origin document carries stable R-IDs (and optionally A/F/AE IDs), or when the plan defines U-IDs for Implementation Units, reference them in blockers, deferred-work notes, task summaries, and final verification — not routine status updates. This preserves traceability back to requirements and units without burying signal under noise."
- 定位每个 skill 的 "Create Todo List" section（ce-work step 3 约 line 115，ce-work-beta step 3 约 line 168）。在现有 "Derive tasks from the plan's implementation units..." guidance 下添加 sub-bullet："Preserve the unit's U-ID as a prefix in the task label (e.g., 'U3: Add parser coverage'). This keeps blocker references, deferred-work notes, and final summaries anchored to the same identifier the plan uses."
- 对两个 files 应用相同 changes。应用前 side-by-side diff 两个 task-creation sections，确认没有意外 divergence。按 `Stable/Beta Sync` convention，在 commit message 中明确 sync decision："Propagated to beta — shared traceability contract."

**遵循的模式：**
- 每个 skill "Track Progress" section 中现有 R-ID/A/F/AE guidance line（PR #629 添加的行）是 structural model：相同 placement、相同 tone。
- `plugins/compound-engineering/AGENTS.md` 中的 Stable/Beta sync convention - atomic update，explicit sync-decision statement。

**测试场景：**
- Happy path: agent 针对包含 U-IDs 的 plan 执行 `ce-work`，创建 "U3: Add parser coverage" 这样的 tasks，而不是只写 "Add parser coverage"。Blockers 引用 U-ID anchor。
- Edge case（plan 中无 U-IDs，例如早于此变更的 hand-written plan）：task creation 回落到 unit name，不报错、不阻塞。U-ID rule 只在 "when the plan defines U-IDs" 时应用。
- Edge case（有 U-IDs 但无 R/A/F/AE）：status updates 只使用 U-IDs；不发明 synthetic R-IDs。
- Integration: 一个 units 在 deepening 中 reorder 过的 plan 仍产生一致 task labels，因为 U-IDs 保留了 reorder 前的 anchor。稍后 resume 同一 work session 的 agent 可通过 U-ID 匹配 tasks 到 plan units。

**验证：**
- `ce-work/SKILL.md` 和 `ce-work-beta/SKILL.md` 的 "Track Progress" sections 均在 R/A/F/AE 旁引用 U-IDs。
- 两个 files 的 "Create Todo List" / task-creation sections 都包含 U-ID-prefix rule。
- 两个 files 的 diff 显示 U-ID-related additions 相同。
- commit message 中按 repo convention 明确说明 stable/beta sync decision。

---

## 系统级影响

- **Interaction graph:** brainstorm -> plan -> work pipeline 是主要受影响 surface。变更是 contract additions（新 IDs、新 sections），不是 removals 或 breaking changes。没有 U-IDs 的现有 plans 继续可用，因为 ce-work 中的 U-ID recognition 以 "when the plan defines U-IDs" gate。
- **Error propagation:** 无新增 error paths。Conditionality design rule 确保 absent origin doc -> empty no-op path，而非 failure。
- **State lifecycle risks:** 无，都是 Markdown-only changes。无 persistent state，无 migrations。
- **API surface parity:** ce-work 和 ce-work-beta 是成对 surfaces；按 Stable/Beta Sync convention，两者必须原子变更。U5 中已有记录。
- **Integration coverage:** Traceability loop 就是 integration story：`ce-plan` 中的 changes 只有在 `ce-work` 识别它们时才有用。U5 是 integration unit；如果没有 U5 同时 shipping，任何 unit 都不能独立 shippable（否则 U-IDs 出现在 plans 中但 execution 忽略它们）。
- **Unchanged invariants:** `ce-plan` 的 no-origin path 仍产生可用 plan，无 empty headers 或 dangling references。这就是 conditionality design rule 的 operational form。Phase 0.4（Planning Bootstrap）和 Phase 0.2（no upstream requirements doc）flows 保持不变。

---

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| **Conditionality leaks** - future skill change 添加 origin-derived section 却没有 conditional guards，破坏 no-origin path。 | 在 U2 的 HTML comments 中将 conditionality design rule 写得足够可见，让 future authors 能看到。计划在 post-merge `ce-compound` write-up 中将该规则捕获到 `docs/solutions/skill-design/`，使其进入 institutional memory。 |
| **Renumber-accident in deepening** - 尽管有 U-ID stability rule，agent 在 context pressure 或中途重组时仍可能 "tidy" U-IDs。 | U-ID stability 在三处重申（Phase 3.3 brief mention、Phase 3.5 definition、template comment，以及 `deepening-workflow.md` Allowed/Do-not lists）。若仍 slip，doc-review 可事后捕获。 |
| **AE-link compliance theater** - agents 为了看起来 thorough，把 `Covers AE1.` 加到其实不 enforce AE1 的 test scenarios 上。 | 规则中的 "directly enforces" qualifier 是 gating language。Phase 5.1 review 应 spot-check AE-link claims。风险有限：如果完全跳过规则，最坏也只是 tests 未链接；mechanical compliance 是可恢复 QA failure，不是 structural issue。 |
| **Stable/beta drift** - ce-work 和 ce-work-beta 在 task-creation sections 中发生 post-change divergence。 | U5 的 verification step 要求 side-by-side diff 两个 files。Stable/Beta sync convention 要求 commit message 中有 explicit sync-decision statement。 |
| **Renamed-subsection confusion** - 旧 plans 中读者看到 "Deferred to Separate Tasks"；新 plans 中读者看到 "Deferred to Follow-Up Work"。 | 不自动 migrate 旧 plans。rename 是 forward-looking template change。两个名称指向同一概念，因此 existing plans 仍可理解。无需 backwards-compat shim，因为旧 plans 不会 auto-regenerate。 |

---

## 文档 / 运行说明

- README.md component counts、agent counts、skill counts 不变。无需 README update。
- Plugin manifests（`.claude-plugin/plugin.json`、`.cursor-plugin/plugin.json`、`.codex-plugin/plugin.json`）不变。按 repo convention 不手动 version bump，release-please 负责。
- 本 PR merge 后，运行 `ce-compound` 将 U-ID/AE-link traceability convention 捕获为 `docs/solutions/skill-design/` document。Institutional learnings researcher 指出此前没有 solution doc 覆盖此约定，PR #629 + 本 PR 共同创造了该 convention。
- 无 rollout、monitoring、migration 或 feature-flag concerns。Skill content 每次 invocation 都 fresh load；无 cached state 需要 invalidation。

---

## 来源与参考

- **PR #629（正在补完的 upstream change）：** https://github.com/EveryInc/compound-engineering-plugin/pull/629
- Related code（相关代码）：
  - `plugins/compound-engineering/skills/ce-plan/SKILL.md`
  - `plugins/compound-engineering/skills/ce-plan/references/deepening-workflow.md`
  - `plugins/compound-engineering/skills/ce-work/SKILL.md`
  - `plugins/compound-engineering/skills/ce-work-beta/SKILL.md`
- `plugins/compound-engineering/skills/ce-brainstorm/references/requirements-capture.md`（PR #629's pattern source）
- `plugins/compound-engineering/skills/ce-brainstorm/SKILL.md`（PR #629's Deep-product detection）
- Related institutional learnings（相关机构经验）：
  - `docs/solutions/skill-design/research-agent-pipeline-separation.md`
  - `docs/solutions/skill-design/beta-skills-framework.md`
  - `docs/solutions/skill-design/beta-promotion-orchestration-contract.md`
  - `docs/solutions/best-practices/conditional-visual-aids-in-generated-documents.md`
  - `docs/solutions/best-practices/ce-pipeline-end-to-end-learnings.md`
  - `docs/solutions/skill-design/ce-doc-review-calibration-patterns.md`
- Plugin conventions（plugin 约定）：`plugins/compound-engineering/AGENTS.md`（Stable/Beta Sync, Skill Compliance Checklist）
