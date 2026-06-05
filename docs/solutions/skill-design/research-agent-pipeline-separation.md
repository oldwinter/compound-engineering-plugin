---
title: Research agent dispatch 有意在 skill pipeline 中分段
date: 2026-04-05
category: skill-design
module: compound-engineering
problem_type: architecture_pattern
component: tooling
severity: low
applies_when:
  - Evaluating whether ce-repo-research-analyst or ce-learnings-researcher calls in ce-plan duplicate work from ce-brainstorm or ce-work
  - Adding a new research agent and deciding which pipeline stage should dispatch it
  - Considering pass-through optimizations like the Slack researcher pattern (commit f7a14b76)
tags:
  - research-agent
  - pipeline
  - skill-design
  - deduplication
  - ce-plan
  - ce-brainstorm
  - ce-work
---

# Research agent dispatch 在 skill pipeline 中有意分离

## 背景

在优化 Slack researcher agent、避免 ce-brainstorm 与 ce-plan 之间的 redundant work 之后（commit f7a14b76 on `tmchow/slack-analyst-agent`），一个自然问题出现了：`ce-repo-research-analyst` 和 `ce-learnings-researcher` 是否也存在相同 duplication problem？二者都会在 ce-plan Phase 1.1 中每次 dispatch，不管 ce-brainstorm 是否产出了 origin document。

调查确认没有 duplication。三个 workflow stages 操作的是有意分离的信息类型，research agent dispatch 也清晰遵循这个分离。

## 指南

brainstorm -> plan -> work pipeline 按信息类型分离 research：

**ce-brainstorm** 收集 *product context*（WHAT to build）。它执行 inline "Existing Context Scan"——面向 product questions 的 surface-level file discovery。它**不** dispatch `ce-repo-research-analyst` 或 `ce-learnings-researcher`。它的 output 是覆盖 product decisions、scope 和 success criteria 的 requirements document，并有意排除 implementation details。

**ce-plan** 收集 *implementation context*（HOW to build it）。它总是在 Phase 1.1 dispatch `ce-repo-research-analyst`（technology、architecture、patterns）和 `ce-learnings-researcher`。这些 agent 产出 tech stack versions、architectural patterns、conventions、file paths，以及来自 `docs/solutions/` 的 institutional knowledge。这些内容进入 plan document 的 Context & Research、Patterns to Follow、Files 和 Key Technical Decisions sections。`ce-repo-research-analyst` output 还驱动 Phase 1.2 中是否需要 external research agents 的 decisions。

**ce-work** 不独立收集 research context。它读取 plan document，并使用其中 embedded research findings 指导 implementation。对 bare prompts（no plan），它只做 lightweight inline scan——不 dispatch agent。plan document 就是 ce-plan research 到 ce-work 的 handoff mechanism。

当 ce-plan 从 ce-brainstorm 接收 origin document 时，它把该文档作为 primary input（Phase 0.3）读取，但仍运行 research agents，因为它们收集的是 categorically different information。

## 为什么重要

- **Prevents false optimizations.** 如果不理解 information type separation，contributor 可能在存在 brainstorm document 时跳过 ce-plan 的 research agents，从而破坏 plan 产出 implementation-ready guidance 的能力。
- **Clarifies when pass-through optimizations ARE warranted.** Slack researcher 是真正的 redundancy：ce-brainstorm 和 ce-plan 都为 overlapping information dispatch 同一个 agent。fix 会传递 existing context，让 agent 聚焦 gaps。对 `ce-repo-research-analyst` 和 `ce-learnings-researcher` 来说，不存在这种 redundancy，因为只有 ce-plan dispatch 它们。
- **Protects the plan document's role as the sole handoff artifact.** ce-work 依赖 plan 包含完整 implementation context。如果跳过 ce-plan research agents，ce-work 会收到 incomplete plan 并被迫 improvises。

## 适用时机

- 评估 pipeline stages 之间的 research agent calls 是否 redundant 时——检查多个 stages 是否为 overlapping information types dispatch 同一个 agent。
- 添加 new research agent 时——分类它收集的是 product context（brainstorm）、implementation context（plan）还是 execution context（work），并只从匹配 stage dispatch。
- 考虑像 Slack pattern 这样的 pass-through optimization 时——前提是两个 stages 独立 dispatch 同一个 agent。如果只有一个 stage dispatch 该 agent，不需要 optimization。

## 示例

**无需 optimization（本案例）：**
即使存在 brainstorm document，ce-plan 也总是调用 `ce-repo-research-analyst`。ce-brainstorm 也调用它吗？不——brainstorm 只做 inline product-focused scan。这些 calls 不 redundant；不需要 change。

**需要 optimization（Slack pattern）：**
ce-brainstorm 和 ce-plan 都 dispatch `ce-slack-researcher`。Fix：当 ce-plan 在 origin document 中发现 Slack context 时，把它传给 `ce-slack-researcher`，让 agent 聚焦 gaps。agent 仍会被调用——只是从更好的 baseline 开始。

**Anti-pattern -- 错误跳过 agents：**
当存在 origin document 时，从 ce-plan 移除 `ce-repo-research-analyst`，理由是 “brainstorm already scanned the repo”。结果 plan 缺少 architectural patterns、file paths 和 convention details。ce-work 会产出忽略 existing patterns 的 code。

**新 agent 的正确 stage placement：**
一个识别 library versions 和 compatibility constraints 的 "dependency-analyzer" agent 收集 implementation context（HOW）。它属于 ce-plan 的 Phase 1.1，而不是 ce-brainstorm。ce-work 会通过 plan document 消费其 findings。

## 相关内容

- `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md` -- related agent dispatch optimization pattern（token efficiency，不是 deduplication）
- `docs/solutions/skill-design/beta-skills-framework.md` -- 记录 pipeline chain 和接入其中的 beta-skills rollout pattern
- `docs/solutions/best-practices/ce-pipeline-end-to-end-learnings.md` -- 将该 framing 向下游扩展（document-review、ce-code-review、resolve-pr-feedback），包含运行完整 pipeline end-to-end 实现 feature 的 meta-observations
- Commit f7a14b76 on `tmchow/slack-analyst-agent` -- 触发本 analysis 的 Slack researcher pass-through optimization
- GitHub issue #492 -- `ce-repo-research-analyst` self-recursion bug（已修复，属于 separate concern）
