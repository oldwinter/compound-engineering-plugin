---
title: "Dispatch sub-agents 时传 paths，而不是 content"
category: skill-design
problem_type: design_pattern
component: tooling
root_cause: inadequate_documentation
resolution_type: workflow_improvement
severity: medium
tags: [orchestration, subagent, token-efficiency, skill-design, multi-agent]
date: 2026-03-26
---

## 问题

编排需要 codebase reference material（config files、standards docs 等）的 sub-agents 时，在 sub-agent prompt 中传完整文件内容会膨胀 context，并让 orchestrator 预先执行昂贵且可能不会被使用的工作。

## 症状

- Orchestrator skill 读取多个文件，将其内容拼接成一个 block（例如包含完整 CLAUDE.md/AGENTS.md content 的 `<standards>`），并注入 sub-agent prompt
- Sub-agent 会收到全部 content，不管其中有多少与其具体任务相关
- 在带有 directory-scoped config files 的 repos 中，orchestrator 必须在调用单个 sub-agent 前发现并读取每个文件
- 即使 agent 只需要特定 sections，sub-agent prompts 也会随 reference files 数量线性增长

## 无效做法

让 orchestrator 读取所有相关文件内容，并在 content block 中传入。这是 ce-code-review 中 `ce-project-standards-reviewer` agent 的初始做法：Stage 3b 收集所有 CLAUDE.md/AGENTS.md content，放入 `<standards>` block 并传给 sub-agent prompt。

问题：
- Orchestrator 执行了昂贵的读取工作，其中一部分可能被浪费
- Sub-agent prompt 被它可能不会完全使用的 content 膨胀
- 随 directory-scoped config files 数量增长，扩展性很差
- Sub-agent 失去决定哪些内容相关的 agency

## 解决方案

将 discovery（便宜）与 reading（昂贵）分离。orchestrator 通过 glob 或 search 发现 file paths，传递 path list，然后 sub-agent 只读取自己需要的 files 和 sections。

**来自 Anthropic code-review command 的 pattern（模式）：**

> "Use another Haiku agent to give you a list of file paths to (but not the contents of) any relevant CLAUDE.md files from the codebase: the root CLAUDE.md file (if one exists), as well as any CLAUDE.md files in the directories whose files the pull request modified"

中文含义：使用另一个 Haiku agent 给出相关 `CLAUDE.md` 文件路径列表，而不是文件内容；包括 root `CLAUDE.md`（如果存在），以及 PR 修改文件所在目录中的任何 `CLAUDE.md`。

reviewing agents 随后接收这些 paths，并自行读取文件。

**我们在 ce-code-review 中的应用方式：**

1. Stage 3b：orchestrator 在 changed directories 中 glob CLAUDE.md/AGENTS.md paths，输出 `<standards-paths>` block
2. Sub-agent prompt：`ce-project-standards-reviewer` 自行读取列出的文件，定位与 changed file types 相关的 sections
3. Standalone fallback：如果不存在 `<standards-paths>` block，agent 独立发现 paths

**通用模板：**

```
Orchestrator:
1. Discover paths (glob/search) -> emit <reference-paths> block
2. Pass path list to sub-agent

Sub-agent:
1. If <reference-paths> present, read listed files
2. If absent, discover paths independently (standalone fallback)
3. Read only sections relevant to the specific task
```

## 为什么有效

Discovery 很便宜；读取和处理文件内容很昂贵。sub-agent 离任务更近（它知道自己在 review 什么），也更适合决定哪些文件的哪些 sections 相关。这是应用到 agent orchestration 的 lazy evaluation：在知道需要 content 之前，不要支付读取成本。

## 预防

设计会调用需要 repo reference material 的 sub-agents 的 orchestrator skills 时：

1. **默认 path-passing。** Orchestrator 发现 paths，sub-agent 读取 content。
2. **包含 standalone fallback。** 如果 paths block 不存在，sub-agent 自行发现 paths。这同时支持 orchestrated 和 standalone invocation。
3. **Content-passing 可接受的场景：** reference material 小、静态，并保证每次 invocation 都会完整消费（例如 sub-agent 始终完整需要的 50 行以下 JSON schema）。
4. **重构信号：** 如果发现 orchestrator 在调用 sub-agents 前读取文件内容，将它视为 path-passing pattern 的候选。

## Instruction phrasing 比 meta-rules 更重要

实测表明，skill 如何措辞 search instruction 会显著影响 tool call count。对于同一任务（为 changed paths 查找 ancestor CLAUDE.md/AGENTS.md files）：

| Instruction phrasing | Claude Code tool calls | Codex shell commands |
|---|---|---|
| "for each changed file, walk its ancestor directories and check for X at each level" | 14 | 2 |
| "find all X in the repo, then filter to ancestors of changed files" | 2 | 2 |

"per-item walk" 措辞会导致 Claude Code 对每个目录层级分别 glob。"bulk find, then filter" 措辞总共只产生两次 globs。Codex 对两种措辞都更稳健（无论哪种，它都会写 Python script 批量处理）。

当不确定 instruction phrasing 是否高效时，提交前做实测。`claude -p` 和 `codex exec` 都支持 JSON output，可揭示 tool call counts：

```bash
# Claude Code: stream-json + verbose shows each tool call
claude -p "instruction here" --output-format stream-json --verbose 2>/dev/null > out.jsonl

# Codex: --json shows command_execution events
codex exec --json --full-auto "instruction here" > out.jsonl
```

对于 instructions 会驱动 search 或 file discovery 的 orchestration-heavy skills，这很值得做：一个很小的措辞变化可能造成 tool calls、latency 和 token cost 的巨大差异。不是每条 instruction 都需要 benchmark，但当 skill 会在每次 review 或每次 plan 中运行时，成本会复合增长。

## 相关

- `docs/solutions/skill-design/compound-refresh-skill-improvements.md` — 建立了 "no shell commands for file operations in subagents"；这是互补 pattern，强调让 sub-agents 使用合适工具，而不是由 orchestrator 代替它们读取
- `docs/solutions/skill-design/script-first-skill-architecture.md` — 互补 pattern：scripts 预处理大型数据集，让 orchestrators 不加载 raw data
- `docs/solutions/agent-friendly-cli-principles.md` — Principle #7（Bounded, High-Signal Responses）强调 agents 会为额外输出支付真实成本；paths 是 bounded，content 不是
