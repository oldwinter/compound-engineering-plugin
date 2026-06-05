---
date: 2026-02-17
topic: copilot-skill-naming
---

# Copilot Skill Naming：保留 Namespace

## 正在构建什么

调整 Copilot converter，让它在把 commands 转换为 skills 时保留 command namespaces。目前 `workflows:plan` 会被 flatten 成 `plan`，这个名字过于泛化，并且会在 chat suggestion UI 中与 Copilot 自身功能冲突。

## 为什么采用这个方案

`flattenCommandName` function 会 strip 掉最后一个 colon 之前的所有内容，产出 `plan`、`review`、`work` 这类对 Copilot skill discovery UI 来说过于泛化的名称。把 colons 替换为 hyphens（`workflows:plan` -> `workflows-plan`）能保留 context，同时仍符合 valid filename characters。

## 关键决策

- **用 hyphens 替换 colons**，而不是 strip prefix：`workflows:plan` -> `workflows-plan`
- **仅限 Copilot** — 其他 converters（Cursor、Droid 等）保持当前 flattening behavior
- **Content transformation 也要处理** — body text 中的 slash command references 也使用 hyphens：`/workflows:plan` -> `/workflows-plan`

## 所需变更

1. `src/converters/claude-to-copilot.ts` — 修改 `flattenCommandName`，将 colons 替换为 hyphens
2. `src/converters/claude-to-copilot.ts` — 更新 `transformContentForCopilot` 的 slash command rewriting
3. `tests/copilot-converter.test.ts` — 更新受影响 tests

## 下一步

-> 直接实现（small、well-scoped change）
