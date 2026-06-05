---
date: 2026-03-28
topic: ce-review-headless-mode
---

# ce:review Headless Mode（Headless 模式）

## 问题框架

ce:review 当前有三种 modes（interactive、autofix、report-only），但它们都假设某种 direct user interaction，或有不适合 programmatic callers 的 mode-specific behaviors。当另一个 skill 需要把 code review results 作为 structured input 时，没有办法调用 ce:review 而不让它尝试 prompt user，或带着 interactive-session assumptions 应用 fixes。

document-review 在 PR #425 中用 `mode:headless` pattern 解决了同样问题。ce:review 也需要这个 capability，这样它可以被其他 workflows 当作 utility skill 使用。

## 需求

**Argument Parsing（参数解析）**
- R1. 添加 `mode:headless` argument，并与 existing mode flags 一起 parse

**Runtime Behavior（运行时行为）**
- R2. 在 headless mode 中，静默应用 `safe_auto` fixes（匹配 autofix behavior）
- R4. headless mode 中没有 `AskUserQuestion` 或其他 interactive prompts
- R5. 以清晰 completion signal 结束，让 callers 能检测 review 完成

**Output Format（输出格式）**
- R3. 将所有 non-auto findings（`gated_auto`、`manual`、`advisory`）作为 structured text output 返回，保留其 original classifications（severity、autofix_class、owner、confidence、evidence[]、pre_existing）
- R6. 遵循 document-review 的 structural output pattern（相同 envelope format、相同 section headings、类似 parsing heuristics），同时根据 ce:review 自己的 schema 适配 per-finding fields

## 成功标准

- 另一个 skill 可以用 `mode:headless` 调用 ce:review，接收 structured findings，并在没有任何 user interaction 的情况下对其采取行动
- Output envelope（section headings、severity grouping、completion signal）与 document-review 的 headless output 在结构上保持一致，因此 callers 可以对二者使用相似 consumption pattern，同时 per-finding fields 反映 ce:review 自己的 schema

## 范围边界

- 不改变 existing three modes（interactive、autofix、report-only）
- 不新增 reviewer personas，也不改变 review pipeline 本身
- 本变更不构建 specific caller workflow——只启用 capability

## 关键决策

- **Apply safe_auto fixes in headless**：匹配 document-review pattern，其中 auto-fixes 被静默应用，其他所有内容返回给 caller 处理
- **Structural consistency with document-review, not schema compatibility**：相同 envelope 和 section headings，但 per-finding fields 使用 ce:review 自己的 schema（它有不同的 autofix_class values、owner、pre_existing 等）。Callers 需要对 individual findings 做 skill-aware parsing

## 待决问题

### 延后到 Planning

- [Affects R3][Technical] exact structured output format——是否逐字 mirror document-review 的 text format，还是适配 ce:review 更丰富的 findings schema（包含 `autofix_class`、`evidence[]`、`pre_existing` 等 document-review 没有的 fields）？
- [Affects R1][Technical] `mode:headless` 如何与 existing mode parsing 交互——是第四种 mode，还是修改 report-only/autofix behavior 的 overlay？
- [Affects R5][Technical] completion signal 是什么样子——"Review complete (headless mode)" 文本，还是更 structured envelope？
- [Affects R2][Technical] headless mode 是否应像 autofix 一样写 run artifacts（`.context/compound-engineering/ce-review/<run-id>/`）并创建 durable todo files，还是像 report-only 一样 suppress？
- [Affects R1][Technical] headless mode 应如何处理 Stage 1 中的 checkout/branch switching？Programmatic callers 可能需要 checkout 保持 stable（像 report-only），即使 headless 会应用 fixes（像 autofix）。
- [Affects R1][Technical] 当 headless 收到 conflicting mode flags（例如 `mode:headless` + existing mode flags）或缺少 diff scope（no changes、no PR）时的 error behavior。
- [Affects R2][Technical] headless mode 是否应支持像 autofix 一样的 bounded re-review rounds（max_rounds: 2），还是 single-pass？

## 下一步

-> `/ce:plan` 进行结构化 implementation planning
