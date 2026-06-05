---
date: 2026-03-25
topic: onboarding-skill
---

# Onboarding：Codebase Onboarding Document Generator（代码库 Onboarding 文档生成器）

## 问题框架

Onboarding 是 software 中的通用问题，但在快速变化的 codebases 中更尖锐：无论是 AI-assisted development、rapid prototyping，还是单纯一个 ship 速度快于 document 速度的 team，code 都比 documentation 写得更快。传统假设“creator 可以解释 codebase”会失效，因为他们一开始可能就没有完全理解它，或 codebase 已经演化到超出任何单个人的 mental model。New team members（以及被带进 project 的 AI agents）会缺少有效贡献所需的 mental model。

primary audience 是 human developers。对 human comprehension 有效的文档，也会作为 agent context 有效；反过来则不成立。

## 需求

- R1. 一个名为 `onboarding` 的 skill，crawl repository 并在 repo root 生成 `ONBOARDING.md`
- R2. skill 始终从头 regenerate 完整 document——不做 surgical updates，也不与 previous version diff
- R3. document 有 fixed filename（`ONBOARDING.md`），因此 skill 可以检测是否已存在；existence 是唯一 state——没有 separate mode flag
- R4. document 正好包含五个 sections，每个 section 都必须回答新 contributor 在 first hour 会问的问题，才能证明自己值得存在：
  - **What is this thing?（这是什么？）** — Purpose、who it's for、what problem it solves
  - **How is it organized?（它如何组织？）** — Architecture、key modules、它们如何连接，以及 system 依赖哪些 external components（databases、APIs、services、env vars）
  - **Key concepts and abstractions（关键概念与抽象）** — 讨论和推理此 codebase 所需的 vocabulary 和 architectural patterns
  - **Primary flow（主流程）** — 穿过 system 的一个 concrete path，展示 pieces 如何连接（app 做的 main thing）
  - **Where do I start?（从哪里开始？）** — Dev setup、如何运行、在哪里做常见类型 changes
- R5. crawl 期间，如果发现 `docs/solutions/` 或其他 existing documentation，且它与某个 section 的 content 直接相关，就在该 section 内 inline link。不要创建 separate references/further-reading section。如果没有 relevant docs，document 自成一体，不提及它们缺失。
- R6. document 首先为 human comprehension 编写——clear prose，而不是 agent-formatted structured data
- R7. 在 visual aids 能比 prose 提高 readability 时使用它们——ASCII diagrams、markdown tables。Architecture overviews 和 flow traces 尤其受益于 diagrams。
- R8. 全文使用 proper markdown formatting——file names、paths、commands、code references 和 technical terms 使用 backticks。一致 styling 最大化 legibility。

## 成功标准

- 新 contributor 阅读 `ONBOARDING.md` 后，能够充分理解 codebase 并开始改动，而不需要 creator 解释
- 即使 creator 自己也没有完全理解 architecture，document 仍有用
- 在演化后的 codebase 上再次运行 skill，会产出 accurate、current document（不会携带 stale information）

## 范围边界

- 不尝试推断或编造 design rationale（“why was X chosen over Y”）——creator 可能也不知道，把 guesses 当事实更糟
- 不评估 fragility 或 risk areas——这需要 agent 不具备的 production behavior judgment
- 不生成 README.md、CLAUDE.md、AGENTS.md 或任何其他 document——只生成 `ONBOARDING.md`
- regeneration 时不保留 previous version 的 hand-edits——如果用户需要 durable authored context，它应位于其他 docs 中（skill 可以发现并 link）
- 没有 `ce:` prefix——这是 standalone utility skill，不属于 core workflow

## 关键决策

- **Always regenerate, never update（始终重新生成，不做更新）**：读取旧 document 再更新，意味着 agent 要同时做两件事（理解 codebase + fact-check old doc）。这比 regenerate 更慢，也更容易出错。
- **Five sections, no more（只保留五个 section）**：每个 section 都必须通过回答新成员真的会问的问题来证明自己。不要有 “just in case” 的 speculative sections。
- **Inline linking only（只做 inline link）**：Existing docs 在 relevant sections 内 surface，而不是收集到 appendix。这是 opportunistic 的——没有可 link 内容时也没问题。
- **Human-first writing（human-first 写作）**：document 面向 human readers。agent utility 是 clear prose 的自然副作用，不是独立 design goal。

## 待决问题

### 延后到 Planning

- [Affects R1][Technical] skill 应如何 orchestrate crawl——single-pass，还是为不同 sections dispatch sub-agents？
- [Affects R4][Technical] 哪种 crawl strategy 能产出最好的 "Primary flow" section——entry point tracing、route analysis，还是其他方法？
- [Affects R4][Needs research] 每个 section 合适的 depth/length target 是什么，才能有用而不变成 wall of text？
- [Affects R5][Technical] 什么 heuristic 用来判断 discovered doc 与某个 section “directly relevant”，而不是 noise？

## 下一步

-> `/ce:plan` 进行结构化 implementation planning
