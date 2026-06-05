---
title: 新 skills 和 agents 必须使用 ce- 前缀；用测试强制执行，而不只写在 prose 中
date: 2026-05-01
category: skill-design
module: compound-engineering
problem_type: convention
component: plugins/compound-engineering
severity: low
applies_when:
  - 在 plugins/compound-engineering/skills/ 下新增 skill directory
  - 在 plugins/compound-engineering/agents/ 下新增 agent file
  - 编写或 review 引入 plugin 新组件的 PR
tags:
  - naming-convention
  - ce-prefix
  - skill-authoring
  - test-enforcement
  - plugin-conventions
related:
  - docs/solutions/skill-design/beta-skills-framework.md
related_pr: https://github.com/EveryInc/compound-engineering-plugin/pull/747
---

## 问题

`plugins/compound-engineering/AGENTS.md` 已经说明“所有 skills 和 agents 都使用 `ce-` 前缀，以便明确标识它们是 compound-engineering 组件。”但这条规则只存在于 prose 中，而且 legacy skills 与带 `ce-` 前缀的 sibling skills 一起放在同一目录中却没有前缀。软规则加上可见例外，使得一个新 skill（`riffrec-feedback-analysis`）在 PR #747 中未带前缀就被发布。用户在第一个 commit merge 后发现了这个问题，因此同一个 PR 需要追加 rename commit。（该 skill 现在是 `ce-riffrec-feedback-analysis`；曾经无前缀的 `every-style-editor` 和 `file-todos` skills 已被移除，只剩 `lfg` 是唯一豁免。）

一个有可见反例且没有机器检查的 prose convention，在实践中就是*建议性*约定。任何粗略浏览目录列表的作者看到无前缀 skill 与 `ce-brainstorm` 并列，都可能合理地认为前缀是可选的。

## 根因

有两层问题：

1. **规则未被强制执行。** 添加非 `ce-` skill 时，CI 或 test suite 中没有任何东西会失败。frontmatter test 会断言 skill 的 `name:` 与目录匹配，并且目录使用 `[a-z0-9-]+`，但不会检查 `ce-` 前缀。
2. **例外列表是隐式的。** Legacy skills 早于该规则存在。没有显式 allowlist 时，从文件系统上看，“早于规则”与“规则不适用”没有区别。

## 解决方案

让规则通过机器强制执行，并显式固定例外。

### 1. Test enforcement（测试强制）

强制逻辑位于专用测试文件 `tests/skill-agent-ce-prefix.test.ts`，它遍历 skill directories 和 agent files，并同时断言 directory/file name 与 frontmatter `name` 都带有前缀。豁免项是显式命名的 `Set`，且每个 entry 都需要书面理由：

```ts
const PREFIX = "ce-"

// Exemptions from the ce- prefix rule. Add entries here only with a written
// reason — the exemption list shouldn't become a silent junk drawer.
const SKILL_EXEMPTIONS = new Set<string>([
  // lfg ships as the public command `/lfg` (see plugins/compound-engineering/README.md).
  "lfg",
])
const AGENT_EXEMPTIONS = new Set<string>([])
```

Agents 是 `plugins/compound-engineering/agents/` 下的扁平 `.md` files，按扩展名过滤，并用与 skills 相同的方式检查：

```ts
const agentFiles = readdirSync(AGENTS_DIR, { withFileTypes: true })
  .filter((entry) =>
    entry.isFile() &&
    entry.name.endsWith(".md") &&
    !AGENT_EXEMPTIONS.has(entry.name),
  )
  .map((entry) => entry.name)
```

每条 failure message 都指向 `AGENTS.md` 的 "Naming Convention" section，让作者知道规则记录在哪里，以及如何添加有理由的豁免。（skill/agent checks 的 parallel copy 也存在于 `tests/frontmatter.test.ts`；专用文件是 canonical home。）

### 2. 强化 prose

更新 `plugins/compound-engineering/AGENTS.md`，明确前缀是 mandatory，列出 legacy exceptions，指向测试，并禁止扩展 allowlist。prose 现在写明 "no exceptions"，并告诉作者测试会失败。单靠 prose 不能防止原始错误，但与测试配对后，就形成了一个内部一致的规则体系。

### 3. Persistent author memory（持久作者记忆）

在 agent 的 per-project memory store 中保存了一条 feedback memory，让未来在该 repo 上的 sessions 自动加载规则，并在测试触发前应用它。（确切 memory path 与机器和用户有关；持久要点是这条规则同时存在于 author memory、prose 和 tests 中。）

## 预防

对于任何目前只存在于 prose 中的 plugin convention，先问：

- codebase 中是否至少有一个可见反例，可能被作者误认为是许可？
- 是否存在违反时会失败的 mechanical check？

如果第一个答案是 yes，而第二个答案是 no，该 convention 迟早会被违反。修复方式二选一：

- 添加测试来断言该 convention，并为 legacy exceptions 使用 hard-coded allowlist。
- 迁移 legacy exceptions，使规则成为 universal，不再需要 allowlist。

当迁移有风险（重命名已安装 skill 会破坏用户调用），但规则可干净地向前适用时，优先使用 allowlist pattern。

## 相关

- `plugins/compound-engineering/AGENTS.md` — Naming Convention section 现在记录规则和 allowlist。
- `tests/skill-agent-ce-prefix.test.ts` — 实现强制执行的专用测试（parallel copy 也存在于 `tests/frontmatter.test.ts`）。
- PR #747 — 原始错误，以及随之而来的 rename + enforcement。
