<overview>
用于构建 robust agent loops 的 agent execution patterns。本文涵盖 agents 如何 signal completion、为 resume 跟踪 partial progress、选择 appropriate model tiers，以及处理 context limits。
</overview>

<completion_signals>
## Completion Signals（完成信号）

Agents 需要一种 explicit 方式来表示 "I'm done."

### Anti-Pattern: Heuristic Detection（反模式：启发式检测）

通过 heuristics 检测 completion 很 fragile：

- 连续 iterations 没有 tool calls
- 检查 expected output files
- Tracking "no progress" states（跟踪“无进展”状态）
- Time-based timeouts（基于时间的超时）

这些方式会在 edge cases 中失效，并产生 unpredictable behavior。

### Pattern: Explicit Completion Tool（模式：显式 Completion Tool）

提供一个 `complete_task` tool，它：
- 接收 accomplished 内容的 summary
- 返回停止 loop 的 signal
- 在所有 agent types 中工作方式一致

```typescript
tool("complete_task", {
  summary: z.string().describe("Summary of what was accomplished"),
  status: z.enum(["success", "partial", "blocked"]).optional(),
}, async ({ summary, status = "success" }) => {
  return {
    text: summary,
    shouldContinue: false,  // Key: signals loop should stop
  };
});
```

### ToolResult Pattern（ToolResult 模式）

组织 tool results 时，将 success 与 continuation 分开：

```swift
struct ToolResult {
    let success: Bool           // Did tool succeed?
    let output: String          // What happened?
    let shouldContinue: Bool    // Should agent loop continue?
}

// 三种常见情况：
extension ToolResult {
    static func success(_ output: String) -> ToolResult {
        // Tool succeeded, keep going
        ToolResult(success: true, output: output, shouldContinue: true)
    }

    static func error(_ message: String) -> ToolResult {
        // Tool failed but recoverable, agent can try something else
        ToolResult(success: false, output: message, shouldContinue: true)
    }

    static func complete(_ summary: String) -> ToolResult {
        // Task done, stop the loop
        ToolResult(success: true, output: summary, shouldContinue: false)
    }
}
```

### Key Insight（关键洞察）

**这不同于 success/failure：**

- tool 可以 **succeed** 并 signal **stop**（task complete）
- tool 可以 **fail** 并 signal **continue**（recoverable error，try something else）

```typescript
// Examples:
read_file("/missing.txt")
// → { success: false, output: "File not found", shouldContinue: true }
// Agent can try a different file or ask for clarification

complete_task("Organized all downloads into folders")
// → { success: true, output: "...", shouldContinue: false }
// Agent is done

write_file("/output.md", content)
// → { success: true, output: "Wrote file", shouldContinue: true }
// Agent keeps working toward the goal
```

### System Prompt Guidance（System Prompt 指导）

告诉 agent 何时 complete：

```markdown
## Completing Tasks

When you've accomplished the user's request:
1. Verify your work (read back files you created, check results)
2. Call `complete_task` with a summary of what you did
3. Don't keep working after the goal is achieved

If you're blocked and can't proceed:
- Call `complete_task` with status "blocked" and explain why
- Don't loop forever trying the same thing
```
</completion_signals>

<partial_completion>
## Partial Completion（部分完成）

对 multi-step tasks，在 task level 跟踪 progress，以支持 resume capability。

### Task State Tracking（Task 状态跟踪）

```swift
enum TaskStatus {
    case pending      // Not yet started
    case inProgress   // Currently working on
    case completed    // Finished successfully
    case failed       // Couldn't complete (with reason)
    case skipped      // Intentionally not done
}

struct AgentTask {
    let id: String
    let description: String
    var status: TaskStatus
    var notes: String?  // Why it failed, what was done
}

struct AgentSession {
    var tasks: [AgentTask]

    var isComplete: Bool {
        tasks.allSatisfy { $0.status == .completed || $0.status == .skipped }
    }

    var progress: (completed: Int, total: Int) {
        let done = tasks.filter { $0.status == .completed }.count
        return (done, tasks.count)
    }
}
```

### UI Progress Display（UI 进度展示）

向 users 展示正在发生什么：

```
Progress: 3/5 tasks complete (60%)
✅ [1] Find source materials
✅ [2] Download full text
✅ [3] Extract key passages
❌ [4] Generate summary - Error: context limit exceeded
⏳ [5] Create outline - Pending
```

### Partial Completion Scenarios（部分完成场景）

**Agent 在 finishing 前 hit max iterations：**
- 一些 tasks completed，一些 pending
- checkpoint 保存 current state
- resume 从 left off 的地方继续，而不是从头开始

**Agent 在某个 task 上失败：**
- Task 标记为 `.failed`，error 写入 notes
- 其他 tasks 可以继续（由 agent 决定）
- Orchestrator 不会 automatically abort entire session

**task 中途发生 Network error：**
- Current iteration throws（当前 iteration 抛错）
- Session 标记为 `.failed`
- Checkpoint 保存截至该点的 messages
- 可从 checkpoint resume

### Checkpoint Structure（Checkpoint 结构）

```swift
struct AgentCheckpoint: Codable {
    let sessionId: String
    let agentType: String
    let messages: [Message]          // Full conversation history
    let iterationCount: Int
    let tasks: [AgentTask]           // Task state
    let customState: [String: Any]   // Agent-specific state
    let timestamp: Date

    var isValid: Bool {
        // Checkpoints expire (default 1 hour)
        Date().timeIntervalSince(timestamp) < 3600
    }
}
```

### Resume Flow（恢复流程）

1. app launch 时 scan valid checkpoints
2. 向 user 展示："You have an incomplete session. Resume?"
3. resume 时：
   - 将 messages restore 到 conversation
   - restore task states（恢复 task 状态）
   - 从 left off 的位置继续 agent loop
4. dismiss 时：
   - delete checkpoint（删除 checkpoint）
   - 如果 user 再试，从 fresh start 开始
</partial_completion>

<model_tier_selection>
## Model Tier Selection（模型层级选择）

不同 agents 需要不同 intelligence levels。使用能达成 outcome 的最便宜 model。

### Tier Guidelines（层级指南）

| Agent Type（Agent 类型） | Recommended Tier（推荐层级） | Reasoning（理由） |
|------------|-----------------|-----------|
| Chat/Conversation | Balanced (Sonnet) | Fast responses、good reasoning |
| Research | Balanced (Sonnet) | Tool loops，不是 ultra-complex synthesis |
| Content Generation | Balanced (Sonnet) | Creative 但不是 synthesis-heavy |
| Complex Analysis | Powerful (Opus) | Multi-document synthesis、nuanced judgment |
| Profile Generation | Powerful (Opus) | Photo analysis、complex pattern recognition |
| Quick Queries | Fast (Haiku) | Simple lookups、quick transformations |
| Simple Classification | Fast (Haiku) | High volume、simple decisions |

### Implementation（实现）

```swift
enum ModelTier {
    case fast      // claude-3-haiku: Quick, cheap, simple tasks
    case balanced  // claude-sonnet: Good balance for most tasks
    case powerful  // claude-opus: Complex reasoning, synthesis

    var modelId: String {
        switch self {
        case .fast: return "claude-3-haiku-20240307"
        case .balanced: return "claude-sonnet-4-20250514"
        case .powerful: return "claude-opus-4-20250514"
        }
    }
}

struct AgentConfig {
    let name: String
    let modelTier: ModelTier
    let tools: [AgentTool]
    let systemPrompt: String
    let maxIterations: Int
}

// Examples
let researchConfig = AgentConfig(
    name: "research",
    modelTier: .balanced,
    tools: researchTools,
    systemPrompt: researchPrompt,
    maxIterations: 20
)

let quickLookupConfig = AgentConfig(
    name: "lookup",
    modelTier: .fast,
    tools: [readLibrary],
    systemPrompt: "Answer quick questions about the user's library.",
    maxIterations: 3
)
```

### Cost Optimization Strategies（成本优化策略）

1. **Start with balanced, upgrade if quality insufficient（从 balanced 开始，质量不足时再 upgrade）**
2. 对每 turn 很简单的 **tool-heavy loops 使用 fast tier**
3. **将 powerful tier 留给 synthesis tasks**（comparing multiple sources）
4. **考虑 per turn token limits** 来控制 costs
5. **Cache expensive operations（缓存昂贵操作）** 以避免 repeated calls
</model_tier_selection>

<context_limits>
## Context Limits（Context 限制）

Agent sessions 可以无限延展，但 context windows 不行。从一开始就为 bounded context 设计。

### The Problem（问题）

```
Turn 1: User asks question → 500 tokens
Turn 2: Agent reads file → 10,000 tokens
Turn 3: Agent reads another file → 10,000 tokens
Turn 4: Agent researches → 20,000 tokens
...
Turn 10: Context window exceeded
```

### Design Principles（设计原则）

**1. Tools should support iterative refinement（Tools 应支持迭代式细化）**

不要 all-or-nothing；设计成 summary → detail → full：

```typescript
// Good: Supports iterative refinement
tool("read_file", {
  path: z.string(),
  preview: z.boolean().default(true),  // Return first 1000 chars by default
  full: z.boolean().default(false),    // Opt-in to full content
}, ...);

tool("search_files", {
  query: z.string(),
  summaryOnly: z.boolean().default(true),  // Return matches, not full files
}, ...);
```

**2. Provide consolidation tools（提供整合 tools）**

给 agents 一种在 mid-session consolidate learnings 的方式：

```typescript
tool("summarize_and_continue", {
  keyPoints: z.array(z.string()),
  nextSteps: z.array(z.string()),
}, async ({ keyPoints, nextSteps }) => {
  // Store summary, potentially truncate earlier messages
  await saveSessionSummary({ keyPoints, nextSteps });
  return { text: "Summary saved. Continuing with focus on: " + nextSteps.join(", ") };
});
```

**3. Design for truncation（为截断而设计）**

假设 orchestrator 可能 truncate early messages。Important context 应该位于：
- system prompt 中（always present）
- files 中（can be re-read）
- context.md 中的 summary

### Implementation Strategies（实现策略）

```swift
class AgentOrchestrator {
    let maxContextTokens = 100_000
    let targetContextTokens = 80_000  // Leave headroom

    func shouldTruncate() -> Bool {
        estimateTokens(messages) > targetContextTokens
    }

    func truncateIfNeeded() {
        if shouldTruncate() {
            // Keep system prompt + recent messages
            // Summarize or drop older messages
            messages = [systemMessage] + summarizeOldMessages() + recentMessages
        }
    }
}
```

### System Prompt Guidance（System Prompt 指导）

```markdown
## Managing Context

For long tasks, periodically consolidate what you've learned:
1. If you've gathered a lot of information, summarize key points
2. Save important findings to files (they persist beyond context)
3. Use `summarize_and_continue` if the conversation is getting long

Don't try to hold everything in memory. Write it down.
```
</context_limits>

<orchestrator_pattern>
## Unified Agent Orchestrator（统一 Agent Orchestrator）

一个 execution engine，多个 agent types。所有 agents 使用同一个 orchestrator，只是 configurations 不同。

```swift
class AgentOrchestrator {
    static let shared = AgentOrchestrator()

    func run(config: AgentConfig, userMessage: String) async -> AgentResult {
        var messages: [Message] = [
            .system(config.systemPrompt),
            .user(userMessage)
        ]

        var iteration = 0

        while iteration < config.maxIterations {
            // Get agent response
            let response = await claude.message(
                model: config.modelTier.modelId,
                messages: messages,
                tools: config.tools
            )

            messages.append(.assistant(response))

            // Process tool calls
            for toolCall in response.toolCalls {
                let result = await executeToolCall(toolCall, config: config)
                messages.append(.toolResult(result))

                // Check for completion signal
                if !result.shouldContinue {
                    return AgentResult(
                        status: .completed,
                        output: result.output,
                        iterations: iteration + 1
                    )
                }
            }

            // No tool calls = agent is responding, might be done
            if response.toolCalls.isEmpty {
                // Could be done, or waiting for user
                break
            }

            iteration += 1
        }

        return AgentResult(
            status: iteration >= config.maxIterations ? .maxIterations : .responded,
            output: messages.last?.content ?? "",
            iterations: iteration
        )
    }
}
```

### Benefits（收益）

- 所有 agent types 共享 consistent lifecycle management
- Automatic checkpoint/resume（对 mobile 很 critical）
- Shared tool protocol（共享 tool 协议）
- 容易添加 new agent types
- Centralized error handling and logging（集中式错误处理和日志）
</orchestrator_pattern>

<checklist>
## Agent Execution Checklist（Agent 执行检查清单）

### Completion Signals（完成信号）
- [ ] 提供 `complete_task` tool（explicit completion）
- [ ] 不使用 heuristic completion detection
- [ ] Tool results 包含 `shouldContinue` flag
- [ ] System prompt 指导何时 complete

### Partial Completion（部分完成）
- [ ] Tasks 带 status 跟踪（pending、in_progress、completed、failed）
- [ ] 保存 checkpoints 以支持 resume
- [ ] Progress 对 user visible
- [ ] Resume 从 left off 的地方继续

### Model Tiers（模型层级）
- [ ] 基于 task complexity 选择 tier
- [ ] 已考虑 cost optimization
- [ ] Fast tier 用于 simple operations
- [ ] Powerful tier reserved for synthesis（powerful tier 留给 synthesis）

### Context Limits（Context 限制）
- [ ] Tools 支持 iterative refinement（preview vs full）
- [ ] Consolidation mechanism 可用
- [ ] Important context persisted to files（重要 context 持久化到 files）
- [ ] 已定义 truncation strategy
</checklist>
