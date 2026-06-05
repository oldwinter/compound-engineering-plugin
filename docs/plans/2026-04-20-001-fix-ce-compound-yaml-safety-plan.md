---
title: "fix(ce-compound): quote 以 reserved indicators 开头的 YAML array items"
type: fix
status: active
date: 2026-04-20
---

# fix(ce-compound): quote 以 reserved indicators 开头的 YAML array items

## 概览

当 frontmatter 中任何 array-of-strings field（主要是 `symptoms:`、`applies_when:`、`tags:`、`related_components:`）的 array item 以 backtick（`` ` ``）或其他 YAML 1.2 reserved indicator 开头时，`/ce-compound` 会输出 invalid YAML frontmatter。Strict parsers（`yq`、`js-yaml` strict、PyYAML）会拒绝该文件。现有 angle-bracket-token guardrail（issue #602，已在 #603 修复）不能泛化到 array-item scalars。需要教 `ce-compound` 和 `ce-compound-refresh` skills quote unsafe array items，并添加 regression test，防止未来 prompt edits 静默丢失该规则。

## 问题框架

YAML 1.2 将 `` ` `` 保留为 scalar 开头的 indicator character。当前 frontmatter-writing subagent（或 Lightweight-mode orchestrator）将 markdown-style backtick-wrapped shell commands 写成 array items 时，输出视觉上是正确 markdown，但语法上是 invalid YAML。Strict parsers 会拒绝该文件；`ce-learnings-researcher` 的 grep-first retrieval 仍可匹配 substrings，掩盖了问题，用户会静默积累 unparseable files。Issue #606 提供了 reproduction、impact 和 suggested fix。

## 需求追踪

- R1. 新 `ce-compound` output（Full 和 Lightweight modes）在 array items 以 reserved indicator characters 开头时，仍能生成 strict YAML 1.2 可 parse 的 frontmatter。
- R2. `ce-compound-refresh` Replace-flow subagent output 达到同样标准。
- R3. YAML-safety rule 作为 durable contract 记录在 authoritative schema files 中，而不只在 prompt prose 中。
- R4. 如果该 rule 从 prompts 或 schema contract 中移除，regression test 会失败，防止 silent drift。
- R5. 已存在于 `docs/solutions/` 下的 broken files 不在 scope 内。

## 范围边界

- 不 auto-repair 用户 repos 中现有 invalid frontmatter。
- 不向 `ce-compound` 添加 runtime YAML validator step。
- 不修改 frontmatter schema fields、enum values 或 track rules。
- 不将 quoting guidance 扩展到 `description:` 或其他 scalar fields，超出 #603 已覆盖范围。

### 推迟到独立任务

- 用于修复 `docs/solutions/` 中现有 broken files 的 one-shot cleanup utility。
- 对其他写 frontmatter 的 skills 做更广泛 YAML-safety audit。

## 上下文与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-compound/SKILL.md` — Phase 2 step 5 validates frontmatter；Lightweight mode step 3 单 pass 写入。
- `plugins/compound-engineering/skills/ce-compound/references/schema.yaml` — authoritative frontmatter contract，含 `validation_rules` list。
- `plugins/compound-engineering/skills/ce-compound/references/yaml-schema.md` — human-readable quick reference。
- `plugins/compound-engineering/skills/ce-compound/assets/resolution-template.md` — 两个 tracks 的 concrete frontmatter examples。
- `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md` — Replace flow dispatches subagent，并将三个 support files 作为 source of truth。
- `tests/compound-support-files.test.ts` — 强制两个 skills 之间三份 support files byte-identical。**Edits must be applied to both skill copies.**
- `tests/frontmatter.test.ts` — 验证 plugin `SKILL.md` frontmatter 的 strict YAML parseability。

### 机构经验

- Issue #602 / PR #603 修复了 `description:` 中类似 bug，方式是：(a) skill prompt 中一句话，(b) regression test。这里应用同样形态。
- 根据 plugin `AGENTS.md` Rationale Discipline：rule body 位于 on-demand reference files，而不是 `SKILL.md`。

## 关键技术决策

- **Authoritative rule 位于 `schema.yaml` `validation_rules` 和新的 `yaml-schema.md` "YAML Safety Rules" section。** Subagents 在写入时读取这些内容。
- **SKILL.md files 在 frontmatter-writing spots 添加 one-line pointers。**
- **Template files 在每个 frontmatter block 上方添加 preamble comment**，让 pattern-matching subagents 能看到它。
- **Regression test 断言 prompt-surface presence**（不是 runtime output validity），沿用 #603 pattern。
- **Mirror discipline：** 三份 support files 在两个 skills 之间 byte-identical。

## 未决问题

### Planning 期间已解决

- *Where does the rule live?（规则放在哪里？）* -> Support files（contract surface）。
- *Which reserved characters?（哪些 reserved characters？）* -> `` ` ``、`[`、`*`、`&`、`!`、`|`、`>`、`%`、`@`、`?`，以及 `": "` substring trap。
- *Test strategy?（测试策略？）* -> Prompt presence，而不是 runtime output。
- *Field scope?（字段范围？）* -> Field-agnostic（"any array-of-strings frontmatter field"）。

## 实施单元

- [ ] **Unit 1：向 `schema.yaml` 和 `yaml-schema.md` 添加 YAML-safety rule**

**文件：**

- Modify（修改）: `plugins/compound-engineering/skills/ce-compound/references/schema.yaml`
- Modify（修改）: `plugins/compound-engineering/skills/ce-compound/references/yaml-schema.md`
- Modify（修改）: `plugins/compound-engineering/skills/ce-compound-refresh/references/schema.yaml`
- Modify（修改）: `plugins/compound-engineering/skills/ce-compound-refresh/references/yaml-schema.md`

**方法：** 向 `schema.yaml` 的 `validation_rules` append 一个 entry。向 `yaml-schema.md` 添加新的 "## YAML Safety Rules" section，包含 indicator-character list、`": "` trap 和 before/after example。Mirror 到两个 skills。

**验证：** `bun test tests/compound-support-files.test.ts tests/frontmatter.test.ts` passes。

- [ ] **Unit 2：向 `ce-compound/SKILL.md` 添加 frontmatter-writing pointers**

**文件：** `plugins/compound-engineering/skills/ce-compound/SKILL.md`

**方法：** 在 Phase 2 step 5 和 Lightweight mode step 3 中，添加指向 `references/yaml-schema.md > YAML Safety Rules` 的 one-line pointer。

- [ ] **Unit 3：向 `ce-compound-refresh/SKILL.md` 添加 pointer，并添加 template preambles**

**文件：**

- Modify（修改）: `plugins/compound-engineering/skills/ce-compound-refresh/SKILL.md`
- Modify（修改）: `plugins/compound-engineering/skills/ce-compound/assets/resolution-template.md`
- Modify（修改）: `plugins/compound-engineering/skills/ce-compound-refresh/assets/resolution-template.md`

**方法：** 向 Replace-flow subagent dispatch 添加 one-line reminder。在两个 template copies 的每个 frontmatter block 上方添加 HTML comment preamble。

- [ ] **Unit 4：添加 YAML-safety rule presence regression test**

**文件：** `tests/compound-support-files.test.ts`（extend）

**方法：** 添加 `describe("ce-compound YAML safety rule presence", ...)` block，断言：`validation_rules` 包含 YAML-safety entry，`yaml-schema.md` 有 "YAML Safety Rules" heading，`resolution-template.md` references the rule，两个 `SKILL.md` files 都指向该 rule。

## 风险与依赖

| Risk（风险） | Mitigation（缓解措施） |
|------|------------|
| LLM ignores the rule（LLM 忽略规则） | Three complementary surfaces（schema、yaml-schema、template preamble）。 |
| Future edits drop the rule（未来编辑删除规则） | Regression test（Unit 4）。 |
| Mirror drift（镜像漂移） | Existing `compound-support-files.test.ts` enforces byte-identity。 |

## 来源与参考

- Issue（issue）：EveryInc/compound-engineering-plugin#606
- Prior art（先例）：PR #603 (`fix(ce-release-notes): backtick-wrap <skill-name> token`)
- Related tests（相关测试）：`tests/frontmatter.test.ts`, `tests/compound-support-files.test.ts`
