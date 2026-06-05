---
date: 2026-03-30
topic: cli-readiness-review-persona
---

# ce:review 中的 CLI Agent-Readiness Review Persona

## 问题框架

`cli-agent-readiness-reviewer` agent 作为 standalone deep-audit tool 存在，但只有 developers 知道它存在并显式调用时才受益。多数 CLI code 通过 `ce:review` review，而它没有 CLI-specific lens。Agent-readiness issues（prose-only output、missing `--json`、interactive prompts without bypass、unbounded list output）会在没有任何 review persona 覆盖的情况下 ship。

把 CLI readiness 作为 ce:review 中的 conditional persona，可以让这类 expertise 自动发生——developer 运行正常 review，即可和 security、performance 及其他 concerns 一起获得 CLI agent-readiness findings。

## 需求

**Persona Selection（persona 选择）**

- R1. ce:review 的 orchestrator 基于 diff analysis 选择 CLI readiness persona（与 security-reviewer、performance-reviewer 等相同 pattern）——不是 always-on
- R2. Activation signals：diff 触及 CLI command definitions、argument parsing、CLI framework usage 或 command handler implementations。orchestrator 使用 judgment（不是 keyword matching），与其他 conditional personas 的激活方式一致
- R3. 与 agent-native-reviewer scope 不重叠：CLI readiness 评估 CLI command structure 和 agent-friendliness；agent-native 评估 UI/agent tool parity。如果同一个 diff 同时触及 CLI 和 UI code，两者都可能激活——它们的 findings 处理不同 concerns。Overlap 可能存在，并在 synthesis 中处理，而不是机械阻止

**Persona Behavior（persona 行为）**

- R4. dispatch 后，persona self-scopes：识别 framework，从 diff 检测 changed commands，并按 standalone `cli-agent-readiness-reviewer` agent 的 7 principles 评估（作为 reference material 使用，不直接 dispatch）
- R5. persona 按 ce:review 的 standard JSON findings schema 返回 findings（与其他 conditional personas 相同）。对跨多个 files 或涉及 missing capabilities 的 design-level findings，使用最相关 command handler file 作为 canonical location
- R6. Severity mapping：Blocker -> P1，Friction -> P2，Optimization -> P3。severity ceiling 是 P1——CLI readiness issues 会让 CLI 更难被 agents 使用，但不会 crash 或 corrupt
- R7. Autofix class：所有 findings 使用 autofix_class `manual` 或 `advisory`，owner 为 `human`。CLI readiness findings 是 design decisions（JSON schema design、flag semantics、error message content），不应 auto-applied
- R8. Framework-idiomatic recommendations：findings 引用具体 framework 的 patterns（例如对 Click 写 “add `@click.option('--json', ...)`”，而不是 generic “add a --json flag”）

**Integration（集成）**

- R9. 在 `agents/review/` 中创建新的 lightweight persona agent file，将 7 principles 精炼为面向 code review 的 persona，产出 structured JSON findings。把它加入 `ce-review/references/persona-catalog.md` 的 cross-cutting conditional section，包含 activation description 和 severity guidance。
- R10. existing standalone `cli-agent-readiness-reviewer` agent 保持不变——它仍可 direct invocation 和 whole-CLI audits。new persona 引用相同 principles，但针对 ce:review 的 dispatch pattern 和 output format 优化

## 成功标准

- 在修改 CLI command handlers 的 PR 上运行 ce:review，会在用户没有请求的情况下，在 review report 中包含 CLI readiness findings
- 在只修改 React components 或 Rails views 的 PR 上运行 ce:review，不会 dispatch CLI readiness persona
- Findings 使用与检测到的 CLI framework 匹配的 framework-specific language
- 所有 findings severity 都是 P1、P2 或 P3（绝不 P0），autofix_class 是 `manual` 或 `advisory`

## 范围边界

- 不修改 standalone `cli-agent-readiness-reviewer` agent
- 不把 CLI awareness 加入 ce:brainstorm 或 ce:plan（deferred——仅 ce:review 已覆盖最高价值场景）
- 不为 CLI readiness findings 引入 autofix

## 关键决策

- **New persona agent file**：`agents/review/` 中的 lightweight agent，将 standalone agent 的 7 principles 精炼为 structured JSON findings。这与其他 conditional persona 的工作方式一致（security-reviewer、performance-reviewer 等都是 separate agent files）。standalone agent 的 narrative report format 不匹配 ce:review 的 JSON findings schema，而 dispatch-time prompt surgery 会很 fragile。
- **Conditional, not always-on**：遵循现有 pattern，orchestrator 基于 diff content 选择 personas。persona 绝不在 non-CLI diffs 上运行。
- **Persona self-scopes**：dispatch 后，persona 自己做 framework detection 和 subcommand identification。ce:review 的 orchestrator 只决定是否 dispatch，不判断使用什么 framework。
- **No autofix**：所有 findings 都 route 到 human review。CLI readiness issues 需要 design judgment。
- **Severity ceiling is P1**：CLI readiness issues 不会 crash software——它们让 agents 更难使用。最高合理 severity 是 P1（should fix），不是 P0（must fix before merge）。

## 待决问题

### 延后到 Planning

- [Affects R9][Needs research] new persona 应直接包含 standalone agent content 的多少，多少只 reference？standalone agent 超过 24K（最大的 review agent）——persona 应小很多，把 principles 精炼成 code-review-oriented checks，而不是复刻完整 Framework Idioms Reference。
- [Affects R4][Needs research] persona 是否应在每次 dispatch 时评估全部 7 principles，还是像 standalone agent 那样按 command type 优先排序，并限制 findings 数量以避免 review 被 low-signal items 淹没？

## 下一步

-> `/ce:plan` 进行 structured implementation planning
