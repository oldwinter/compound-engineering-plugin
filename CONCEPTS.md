# Concepts（概念）

本项目的共享领域词汇表，记录具有项目特定含义的实体、命名流程和状态概念。它以核心领域词汇为种子，随后随着 `ce-compound` 和 `ce-compound-refresh` 处理 learnings 而持续累积；可以直接编辑。本文件只做 glossary，不是 spec，也不是包罗万象的说明书。

## The plugin and its parts（plugin 及其组成）

### Plugin（插件）

一个可分发的 bundle，由 Skills、Agents、Commands 和 Hooks（可选 MCP servers）组成，通过单个 manifest 描述，并作为一个整体安装到 coding-agent platform 中。它是 Converter 为非 Claude Targets 转换的 artifact，也是 Marketplace 分发的对象。

### Skill（skill）

由 slash 调用、在自身目录中定义的能力，也是用户最常触达的主入口。Skill 负责 orchestration：它可以按需渐进加载自己的 reference files，并 dispatch Agents 执行有边界的工作。它不同于 Agent：Skill 由用户调用并负责协调，而 Agent 由 Skill dispatch。

### Agent（agent）

Skill dispatch 的专用、单一目标 worker，在隔离 context 中运行并返回结果，而不是与用户对话。也称为 subagent。用户不会直接调用 Agents；Skill 决定何时以及 dispatch 多少个 Agents。

## Conversion（转换）

### Target（目标平台）

Claude Code 之外的目标 coding-agent platform（OpenCode、Codex、Antigravity 等），Plugin 会被转换并安装到其中；每个 Target 都有自己的文件布局和 capability mapping。也称为 target provider。

Plugin 会以两种 scope 之一安装到 Target：global（user-wide）或 per-workspace。

### Converter（转换器）

把已解析 Plugin 转换为某个 Target 的 in-memory form 的步骤。它会显式映射 tools、permissions、hooks 和 model names，而不是依赖约定。

### Writer（写入器）

把 Target 的 converted Bundle 写到磁盘的步骤，遵循该 Target 期望的路径和 merge semantics。Writer 与 Converter 配对，每个 Target 一个。

### Bundle（bundle）

Plugin 针对单个 Target 的 in-memory converted form，即 Converter 产出、Writer 消费的 handoff。

## Skill orchestration（skill 编排）

### Model tier（模型层级）

Dispatched sub-agent 的语义 cost class：extraction（最便宜且能胜任，用于 retrieval 和 quoting）、generation（中档，用于 evidence-driven work 和 mechanical verification），或 ceiling（orchestrator 自己的模型，通过省略 model selection 继承）。Skill 只声明 tier 名称并按 tier 引用，避免在 skill content 中 hardcode model names。

当平台无法为每个 agent 单独选择模型时，所有 roles 都运行在 inherited model 上，cost control 退化为结构控制：read budgets 和 output caps。

### Evidence dossier（证据档案）

一种 bulk evidence artifact：cheap scout agent 收集的逐字 quotes 和 source pointers。它写入 scratch storage，而不是 inline 返回；orchestrator 只携带短 gist，下游 agents 自己读取完整 dossier。

### Load stub（加载桩）

当 load-bearing content 移入 reference file 后，Skill 中留下的 inline remnant：一条 load instruction，说明 reference 包含什么，以及跳过会导致什么 failure mode；同时不保留 agent 可凭空 improvises 的细节，让加载在结构上必要，而不是 advisory。

### Marketplace（marketplace）

用于分发的 catalog metadata，列出可安装 plugins 及其版本；release validation 会让它与每个 Plugin 的 manifest 保持一致。

## Compound engineering（compound engineering 方法）

### Compound engineering（compound engineering 方法）

本项目体现的方法论：组织工程工作，让每个工作单元都让下一个单元更容易；在过程中捕获可复用知识，让 toolset 随着每次使用变得更聪明。

### Pipeline（pipeline）

由 Skills 串联起来的进程，带着一项工作从 strategy 和 ideation 经过 brainstorm、plan、execution、review，最后通过捕获 learning 收尾。每个阶段把 durable artifact 交给下一个阶段；research 在真正需要它的阶段收集，而不是在后游重复收集。

### Learning（learning）

对过去问题的 documented solution，可以是 bug fix、convention 或 workflow pattern。它是 compounded knowledge 的单位，未来工作可以查找并复用。也称为 solution doc。它带有结构化 metadata（category、tags、problem type）以便检索；creation date 写在条目中，而不是文件名里。

### Pattern doc（pattern doc）

从多条 Learnings 中泛化出的更广义规则。它比单个 incident-level Learning 杠杆更高；过期时风险也更高，因为未来工作会把它当作广泛适用的指导。

## Review and workflow vocabulary（review 与 workflow 词汇）

### Reviewer persona（reviewer persona，reviewer 视角）

单一视角的 reviewer Agent，从一个特定角度评估工作，例如 security、correctness、scope、design 等。Review Skills 会 dispatch 一组 personas，并合并它们的 findings。

### Confidence anchor（confidence anchor，confidence 锚点）

固定小尺度上的离散、自评分 confidence value；每一级都绑定模型可以诚实应用的行为标准。它用于 gate 和 rank review findings，避免连续分数带来的虚假精度。每个 review Skill 设置自己的 actionable threshold；多个 personas 互相 corroborate 时，finding 会提升一级。

### Autofix class（autofix class，自动修复分类）

对 review finding 的分类，描述其 proposed fix 可以多安全地应用：静默应用、仅在用户确认后应用、留给人类处理，或记录为 advisory 且不采取 action。

### Headless mode（headless mode，无人值守模式）

一种显式 opt-in mode，让 Skill 无人值守运行、无用户 prompts；它以 written report 作为 deliverable，并保守地 defer 真正模糊的决策，而不是猜测。

### Beta skill（beta skill，beta skill）

Stable Skill 的并行副本，后缀为 `-beta`，用于在不干扰用户的情况下试行新版本。它需要手动调用（model auto-invocation 被禁用）；把它 promote 到 stable 是 orchestration change，不只是重命名，所有 caller 都必须在同一次 change 中迁移，避免静默继承 stale defaults。
