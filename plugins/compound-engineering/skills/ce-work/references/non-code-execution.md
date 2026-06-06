# Non-Code Execution（Knowledge-Work Carve-Out）

当 Phase 0 Input Triage 发现 plan 带有 `execution: knowledge-work` 时加载。该 plan 是 non-code deliverable（synthesized document、study artifact、research write-up）的 **production plan**，通常由 `ce-plan` 的 approach-altitude flow 产出。执行它以产出 deliverable。这是少数情况分支；正常 code lifecycle 不适用，也不会在这里调用。

## What this skips（跳过什么）

**不要**运行任何 code-shipping machinery；它不适合 knowledge work：

- 不做 branch/worktree setup（Phase 1 Step 2）。
- 不从 implementation units 构建 task list；不根据 `Files:` 做 execution-strategy/subagent dispatch。
- 不做 Test Discovery、test-scenario completeness、system-wide test check。
- 不做 incremental code commits，也不运行 `references/shipping-workflow.md`（没有 PR、CI，也不对 code plan 做 `active -> completed` flip）。

## Execute the production plan（执行 production plan）

1. **完整读取 plan。** 它是描述 deliverable *如何被制作* 的 decision artifact：要读哪些 sources、如何从每个 source mining、它们如何组合、deliverable 的形状，以及用户已经确认的 forks。遵守这些 decisions。
2. **读取 plan 命名的 sources**，也就是实际 inputs（PDFs、transcripts、docs、links）。把用户命名的 resources 视为 authoritative；读取它们，不要凭 memory 工作。如果某个 named source 缺失，直说，不要替换。
3. **Synthesize and produce the deliverable**，遵循 plan 的 intended shape 和已确认 forks。这就是 approach-plan 刻意 defer 的工作。
4. **Save and report。** 将 deliverable 写到 durable、repo-tracked location，默认使用合理的 `docs/` 子路径（或 checkpoint 中用户命名的 path），并报告 absolute path，方便用户找到。是否 git commit 还是只写入文件由用户决定；可以 offer，不要强迫。

## Stay scoped to non-code deliverables（保持 non-code scope）

该 carve-out 用于 knowledge-work output。如果产出 deliverable 合理需要生成 code（script、config file、data-transform），把这个具体 sub-step route 回正常 code path，让 Test Discovery、review、commit hygiene 等 safeguards 仍然适用。不要在 carve-out 下静默产出 code。Deliverable 本身仍保持 non-code。
