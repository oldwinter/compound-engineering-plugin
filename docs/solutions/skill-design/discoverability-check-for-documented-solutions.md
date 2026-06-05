---
title: Project instruction files 中 documented solutions 的 discoverability check
date: 2026-03-30
category: skill-design
module: compound-engineering
problem_type: convention
component: tooling
severity: medium
applies_when:
  - 向 knowledge-compounding skill 添加 post-write verification step
  - 确保 documented knowledge 可被 fresh sessions 中的 agents 发现
  - 设计可能修改 project instruction files 的 skills
  - onboarding 一个读取自身 instruction file 的新 agent platform
tags:
  - discoverability
  - ce-compound
  - ce-compound-refresh
  - instruction-files
  - skill-design
  - knowledge-compounding
---

# Project instruction files 中 documented solutions 的 discoverability check

## 背景

Knowledge stores，也就是 structured directories of solutions、patterns 和 learnings，只有在 agents 能找到它们时才会 compound value。一个 project 可能在 `docs/solutions/` 下积累数十篇带 YAML frontmatter、category directories 和 searchable fields 的高质量文档，但 fresh sessions 中的 agents、不同 tools，或没有 originating plugin 的 collaborators，可能完全不知道要去那里看。

root cause：project instruction files（`AGENTS.md`、`CLAUDE.md`、`.cursorrules` 等）是 universal discovery surface。每个 agent platform 都会在 session start 时读取它们。如果 instruction file 没有提到 knowledge store，agent 就没有理由搜索它，也不知道即使偶然发现后该期待什么结构。

随着 knowledge store 增长，这个 gap 成本会更高。每个未被发现的 solution 都意味着 agent 会重新推导已经记录过的东西，浪费 tokens 做 exploration，或者因为没找到 prior decision 而得出矛盾方案。

## 指导

写入或更新 knowledge store entry 后，验证 project root instruction files 是否给了 agents 足够信息来发现并使用该 store。检查分为三部分：

**1. 识别 substantive instruction file。**

Projects 经常有多个 instruction files，其中一个只是委托给另一个的 shim（例如 `CLAUDE.md` 只包含 `@AGENTS.md`）。目标应是包含实际内容的文件，而不是 shim。

**2. 语义评估 discoverability，而不是检查字符串存在。**

agent 读取 instruction file 后，应能回答三个问题：

- 这个 project 中是否存在 searchable knowledge store？
- 它的结构是什么（location、categories、metadata format）？
- 什么时候应搜索它？

这是 semantic check，不是对 path string 做 grep。某个文件可能在 directory tree 中提到 `docs/solutions/`，却没有传达它可搜索或何时使用。反过来，某个文件也可能不用精确目录 path，却完整描述 knowledge store。

**3. Draft 最小有效 addition。**

如果 discoverability 缺失，addition 应保持最小并与风格一致：

- 优先增强现有 section（directory listing、architecture description），而不是新增 headed section
- 匹配文件现有 density 和 tone：简洁文件就加简洁内容
- 使用 informational tone，而不是 imperative；描述存在什么以及何时相关，而不是发布命令

**4. 基于用户 consent 做 gate。**

不要在未询问时编辑 instruction files。interactive mode 中，展示 proposed change，并用 platform 的 question tool 请求批准。automated 或 autofix mode 中，只浮现 recommendation，不应用。

## 为什么重要

如果没有 discoverability，knowledge store 在写入它的 session 之外价值为零。compounding knowledge 的整个前提，是 future sessions 会基于 past sessions。如果 future sessions 找不到 store，每个 session 都会从零开始。

成本与 store 大小成正比：一个有 50 篇 documented solutions 但 agents 从不搜索的 project，比只有 3 篇的 project 浪费更多努力。这种浪费是 silent 的：没有 error，没有 warning，只有重复工作，以及偶尔矛盾的 decisions。

保持 addition minimal 且 informational，可避免次生问题：像 "always search the knowledge store before implementing" 这样的 imperative directives 会导致 agents 在 active workflow 已包含专用 search step 时仍做 redundant reads。instruction file 应让 store discoverable，而不是强制围绕它执行特定 workflow。

semantic approach（评估 agent 是否会发现 store）优于 syntactic matching（grep path），因为它避免 false positives（path 出现在 tree 中但没有说明 searchability）和 false negatives（description 使用不同措辞但完整传达 store purpose）。

## 适用时机

- **首次创建 knowledge store 后** — 这是最关键时刻，因为之前没有 session 有理由提到它
- **在既有 store 中写入或刷新 learning 后** — check 成本低，并能捕获 instruction files 被 refactor 或 regenerate 时丢失 discoverability note 的情况
- **onboarding 新 agent platform 时** — 如果 project 在既有 `AGENTS.md` 旁新增 `.cursorrules`，新文件也需要同样的 discoverability affordance
- **instruction files 被大幅重写时** — reorganization 可能丢掉之前存在的 mention

以下情况无需检查：

- instruction file 已在当前 session 中验证过
- knowledge store 是 plugin 的一部分，且 plugin 注入自己的 discovery mechanism（plugin 的 agents 已经知道在哪里查）

## 示例

**现有 directory listing：添加一行**

Before（之前）:

```
src/              Application source code
tests/            Test suite and fixtures
docs/             Project documentation
scripts/          Build and deploy scripts
```

After（之后）:

```
src/              Application source code
tests/            Test suite and fixtures
docs/             Project documentation
docs/solutions/   Categorized solutions with YAML frontmatter; relevant when implementing or debugging in areas with prior decisions
scripts/          Build and deploy scripts
```

一行，匹配现有风格，并传达全部三件事：store 存在、它有结构、何时使用。

---

**没有自然插入点：小 headed section**

Before（之前）:

```markdown
# Project Instructions

Use TypeScript strict mode. Run `npm test` before committing.
Prefer composition over inheritance.
```

After（之后）:

```markdown
# Project Instructions

Use TypeScript strict mode. Run `npm test` before committing.
Prefer composition over inheritance.

## Knowledge Store

`docs/solutions/` contains categorized solution documents with YAML frontmatter
(category, severity, tags). Searching this directory is useful when implementing
features or debugging issues in areas where prior decisions have been recorded.
```

---

**Shim file：跳过**

```markdown
@AGENTS.md
```

该文件完全委托给 `AGENTS.md`。discoverability note 应放在 `AGENTS.md` 中，而不是这里。向 shim file 添加内容会违背它的目的。

## 相关

- [#111](https://github.com/EveryInc/compound-engineering-plugin/issues/111) — Enhancement: Add project scaffolding for `docs/solutions/` schema + agentic feedback loops。discoverability check 是该 issue "medium-term" 建议中“让 ce-compound 检查 scaffolding”的轻量部分方案。
- [#171](https://github.com/EveryInc/compound-engineering-plugin/issues/171) — Closed-Loop Self-Improvement System。discoverability check 通过确保 agents 能找到 `docs/solutions/` content，帮助闭合该 loop 的一部分。
- `docs/solutions/skill-design/compound-refresh-skill-improvements.md` — 记录 ce-compound-refresh skill redesign。discoverability check 会向该 skill workflow 添加新 step。
