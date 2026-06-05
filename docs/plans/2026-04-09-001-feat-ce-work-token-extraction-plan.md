---
title: "feat(ce-work): 通过提取 late-sequence references 减少 token usage"
type: feat
status: completed
date: 2026-04-09
---

# feat(ce-work): 通过提取 late-sequence references 降低 token usage

## 概览

将 "conditional and late-sequence extraction" pattern（在 PR #489 中为 ce:plan 建立）应用到 ce:work 和 ce:work-beta。两个 skills 都在整个 Phase 2 execution loop 中携带 Phase 3/4 shipping content，却还没有使用它。把这类 late-sequence content extract 到 on-demand reference files，可以消除这种 compounding context cost。

## 问题框架

ce:work sessions 是 plugin 中持续时间最长的 skill -- 典型 execution session 会在 Phase 0-4 中涉及 20-60+ tool calls。Phase 3（quality check）和 Phase 4（ship it）content，加上重复的 Quality Checklist 与 Code Review Tiers summary sections，在整个 Phase 2 execution loop 中都跟随 context，却直到最后才使用。这让 token cost 随 message count 成比例 compound。

ce:work-beta 已经把 Codex delegation workflow extract 到 `references/codex-delegation-workflow.md`（315 lines），但它的 Phase 3/4 content 与 stable 有相同 late-sequence problem。两个 variants 都能从同样的 extraction 中获益。

## 需求追踪

- R1. 将 late-sequence blocks（Phase 3 + Phase 4 + Quality Checklist + Code Review Tiers）extract 到 ce:work 的 on-demand reference file
- R2. 对 ce:work-beta extract 同样的 late-sequence blocks
- R3. 按 AGENTS.md "Conditional and Late-Sequence Extraction" rule，用每处 1-3 行 stub 替换 extracted blocks
- R4. 更新 contract tests，使 assertions 在内容移动后从 reference files 读取

## 范围边界

- 不改变任何 behavioral content -- 纯粹为 token efficiency 重构
- 不 extract Phase 0、Phase 1 或 Phase 2 content（core execution loop 中需要）
- 不 extract Key Principles 或 Common Pitfalls（小型 general-purpose guidance，会贯穿使用）
- 不 extract ce:work-beta 的 Argument Parsing 或 Codex Delegation Mode sections（已处理或早期需要）
- Beta 与 stable 处在不同 evolutionary track -- extraction 遵循同一 pattern，但 files 独立，不 shared

## 上下文与研究

### 相关代码与模式

- `plugins/compound-engineering/skills/ce-plan/SKILL.md` -- 已建立的 extraction pattern 与 stub syntax
- `plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md` -- late-sequence extraction 示例
- `plugins/compound-engineering/skills/ce-brainstorm/references/handoff.md` -- 另一个 late-sequence extraction（ce:brainstorm 已做）
- `plugins/compound-engineering/skills/ce-work-beta/references/codex-delegation-workflow.md` -- beta 已经为 conditional delegation workflow 使用 extraction
- `tests/pipeline-review-contract.test.ts` -- 现有 ce:work（lines 9-98）与 ce:work-beta（lines 100-219）contract tests
- `plugins/compound-engineering/AGENTS.md` -- "Conditional and Late-Sequence Extraction" rule

### 组织内经验

- PR #489 验证：extract 约 36% 的 ce:plan，可在每个 session 中节省约 130,000-167,000 context tokens，并且没有 premature reference file reads
- ce:brainstorm 已经应用同一 pattern（Phase 3/4 extract 到 `references/requirements-capture.md` 与 `references/handoff.md`）

## 关键技术决策

- **把 Phase 3 + Phase 4 + Quality Checklist + Code Review Tiers bundle 到一个 reference file：** 它们都在 workflow 的同一点使用（所有 Phase 2 tasks 完成后）。Quality Checklist 是 "Before creating PR"，Code Review Tiers 重复 Phase 3 Step 2 -- 属于同一 workflow stage。一个文件比四个更简单。这匹配 ce:brainstorm 对 late-sequence content 使用的 bundling strategy。
- **Key Principles、Common Pitfalls 保留在 SKILL.md：** 它们较小（合计约 40 行），并在整个 execution 中提供 behavioral guardrails。extract 它们节省很少，且有损 execution quality 风险。
- **Stable 与 beta 使用独立 reference files：** 根据 AGENTS.md skill self-containment rules，每个 skill 的 references directory 是自己的 unit。Beta 已有包含 `codex-delegation-workflow.md` 的 `references/` directory；shipping workflow file 放在旁边。Stable 新建自己的 `references/` directory。

## 实现单元

- [x] **Unit 1：为 ce:work 创建 `references/shipping-workflow.md`**

**目标：** 将 Phase 3（Quality Check）、Phase 4（Ship It）、Quality Checklist 和 Code Review Tiers extract 到 stable skill 的单个 reference file。

**需求：** R1, R3

**依赖：** None

**文件：**
- Create（新增）: `plugins/compound-engineering/skills/ce-work/references/shipping-workflow.md`
- Modify（修改）: `plugins/compound-engineering/skills/ce-work/SKILL.md`

**做法：**
- 将 Phase 3（lines 271-315）、Phase 4（lines 317-374）、Quality Checklist（lines 408-423）和 Code Review Tiers（lines 425-435）移入新 reference file
- 添加 header comment："This file contains the shipping workflow (Phase 3-4). Load it only when all Phase 2 tasks are complete and execution transitions to quality check."
- 在 SKILL.md 中用 2-line stub 替换 Phase 3 + Phase 4，说明 condition，并引用 backtick path
- 删除 SKILL.md 底部 standalone Quality Checklist 与 Code Review Tiers sections（它们已 consolidated 到 reference file）

**遵循的模式：**
- `plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md` -- 带 header comment 与 stub pattern 的 late-sequence extraction
- `plugins/compound-engineering/skills/ce-brainstorm/references/handoff.md` -- brainstorm shipping phase 的同一 pattern

**测试场景：**
- Happy path：SKILL.md stub 包含指向 `references/shipping-workflow.md` 的 backtick path，并说明 loading condition
- Happy path：reference file 包含 Phase 3（quality checks、code review、final validation、operational validation plan）与 Phase 4（screenshots、commit/PR、plan status update、notify user），以及 quality checklist 和 code review tiers
- Edge case：SKILL.md 不包含 `gh pr create` -- line 35 的现有 contract test 继续通过，因为该 string 从未在 ce:work SKILL.md 中

**验证：**
- SKILL.md line count 减少约 130 行（445 -> ~315）
- Reference file 包含所有 Phase 3、Phase 4、Quality Checklist 和 Code Review Tiers content
- SKILL.md stub 清楚说明何时 load reference

---

- [x] **Unit 2：为 ce:work-beta 创建 `references/shipping-workflow.md`**

**目标：** 从 ce:work-beta 中 extract 同样的 late-sequence shipping content，放入它已存在的 references directory，与现有 `codex-delegation-workflow.md` 并列。

**需求：** R2, R3

**依赖：** None（可与 Unit 1 parallel）

**文件：**
- Create（新增）: `plugins/compound-engineering/skills/ce-work-beta/references/shipping-workflow.md`
- Modify（修改）: `plugins/compound-engineering/skills/ce-work-beta/SKILL.md`

**做法：**
- 将 Phase 3（lines 336-381）、Phase 4（lines 382-438）、Quality Checklist（lines 481-496）和 Code Review Tiers（lines 498-508）移入新 reference file
- 使用与 Unit 1 相同的 header comment pattern
- 用同样的 2-line stub pattern 替换
- 删除 standalone Quality Checklist 与 Code Review Tiers sections
- Beta 额外的 Phase 2 subsection（"Frontend Design Guidance"，lines 322-328）保留在 SKILL.md，因为 execution 期间会使用
- Codex Delegation Mode stub（lines 442-444）保持不动 -- 它是单独 extraction

**Sync decision:** 将 extraction 传播到 beta -- 这是同样适用于两个 variants 的 structural optimization。shipping workflow content 在 stable 与 beta 间相同。

**遵循的模式：**
- Unit 1 的 stable variant 输出
- Beta 现有 `codex-delegation-workflow.md` extraction 作为 precedent

**测试场景：**
- Happy path：beta SKILL.md stub 包含指向 `references/shipping-workflow.md` 的 backtick path
- Happy path：beta reference file 包含与 stable reference 相同的 Phase 3/4 content
- Edge case：现有 `codex-delegation-workflow.md` reference 未被触碰

**验证：**
- Beta SKILL.md line count 减少约 130 行（518 -> ~388）
- Beta `references/` directory 现在同时包含 `codex-delegation-workflow.md` 与 `shipping-workflow.md`

---

- [x] **Unit 3：更新 contract tests**

**目标：** 更新现有 contract tests，使内容移动后的 assertions 从 reference files 读取，并添加 stub pointer tests。

**需求：** R4

**依赖：** Unit 1, Unit 2

**文件：**
- Modify（修改）: `tests/pipeline-review-contract.test.ts`

**做法：**

需要重构的 tests（部分 assertions 移到 reference file，negative assertions 可留在 SKILL.md）：
- "requires code review before shipping"（line 10）-- positive assertions（`"2. **Code Review**"`、tier names、`ce:review`、`mode:autofix`、quality checklist review line）从 `references/shipping-workflow.md` 读取；negative assertions（`not.toContain("Consider Code Review")`、`not.toContain("Code Review** (Optional)")`）继续读 SKILL.md，确认 extraction completeness
- "delegates commit and PR to dedicated skills"（line 28）-- positive assertions（`git-commit-push-pr`、`git-commit`）从 `references/shipping-workflow.md` 读取；negative assertions（`not.toContain("gh pr create")`）继续读 SKILL.md
- "ce:work-beta mirrors review and commit delegation"（line 39）-- 从 beta reference 与 beta SKILL.md 使用同样 dual-read pattern
- "quality checklist says Testing addressed"（line 66）-- positive assertion（`"Testing addressed"`）从 `references/shipping-workflow.md` 读取；negative assertions（`not.toContain("Tests pass...")`）继续读 SKILL.md
- "ce:work-beta mirrors testing deliberation and checklist changes"（line 77）-- testing deliberation 继续读 beta SKILL.md；checklist assertions 读 beta reference

保持不变的 tests（内容未 extract）：
- "includes per-task testing deliberation in execution loop"（line 52）-- Phase 2 content，保留在 SKILL.md
- "ce:work remains the stable non-delegating surface"（line 91）-- 检查 SKILL.md 中 absence of delegation content
- 所有 ce:work-beta delegation contract tests（lines 100-219）-- 检查 SKILL.md stubs 与 delegation reference

新增 tests：
- Stub pointer test：SKILL.md 包含 backtick path `references/shipping-workflow.md`（stable 与 beta 都测）
- Negative test：SKILL.md 不直接包含 `"2. **Code Review**"`（确认 extraction，而不是 duplication）

**遵循的模式：**
- `tests/pipeline-review-contract.test.ts` lines 283-289 -- PR #489 的 stub pointer test pattern（`"SKILL.md stub points to plan-handoff reference"`）

**测试场景：**
- Happy path：更新 file paths 后，所有现有 ce:work 与 ce:work-beta contract tests 通过
- Happy path：new stub pointer tests 验证两个 SKILL.md files 都引用 `shipping-workflow.md`
- Edge case：检查 Phase 2 content（testing deliberation、delegation routing）的 tests 仍读 SKILL.md，不变

**验证：**
- `bun test tests/pipeline-review-contract.test.ts` passes
- 没有 contract test 从 SKILL.md 读取已移动到 reference file 的 content

## 系统级影响

- **Interaction graph:** 无 behavioral change -- content 被 restructuring，而非 modified。agent 读取相同 instructions，只是从 reference file 读取而不是 inline。
- **Error propagation:** 如果 runtime 读取 reference file 失败，agent 会缺少 shipping instructions。风险低，因为 file reads 可靠，且 files 与 skill co-located。
- **API surface parity:** Stable 和 beta 都获得同样 extraction。Beta 现有 Codex delegation reference 未受影响。
- **Integration coverage:** `tests/pipeline-review-contract.test.ts` 中的 contract tests 是主要 integration surface。
- **Unchanged invariants:** Phase 0-2 execution behavior、subagent dispatch、test discovery 和所有其他 execution-time content 保持 inline 且不变。

## 风险与依赖

| 风险 | 缓解 |
|------|------------|
| 如果 file paths 改变，contract tests 会破 | Unit 3 明确更新所有 affected tests |
| Agent 没有在正确时间 load reference file | Stub wording 遵循 PR #489 与 ce:brainstorm validated pattern |
| Beta-specific content 被意外丢失 | Unit 2 只 extract 与 stable 相同的 Phase 3/4 content；delegation stubs/references 不触碰 |

## Token 节省估算

| Skill | Extraction | 行数 | 估算 tokens | 加载时机 |
|---|---|---|---|---|
| ce:work | `references/shipping-workflow.md` | ~130 | ~2,200 | All Phase 2 tasks complete |
| ce:work-beta | `references/shipping-workflow.md` | ~130 | ~2,200 | All Phase 2 tasks complete |

**ce:work reduction:** 445 lines（约 6,500 tokens）-> 约 315 lines（约 4,600 tokens）-- **约 29% reduction**

**ce:work-beta reduction:** 518 lines（约 7,600 tokens）-> 约 388 lines（约 5,700 tokens）-- **约 25% reduction**

**Per-session savings（each skill）:** 对典型 40-message execution session：
- Shipping workflow: 约 2,200 tokens x 约 32 messages before it's needed = **约 70,400 context tokens per session**

## 来源与参考

- Related PRs: #489（ce:plan extraction -- 建立该 pattern）
- Related code: `plugins/compound-engineering/AGENTS.md`（extraction rule）
- Precedent: ce:brainstorm 已将此 pattern 应用于其 Phase 3/4 content
