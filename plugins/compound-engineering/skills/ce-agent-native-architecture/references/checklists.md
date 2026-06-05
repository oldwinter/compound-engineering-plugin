<overview>
面向 agent-native systems 的整合 review material：设计阶段的 architecture checklist、需要避免的 anti-patterns，以及验证已构建系统的 success criteria。按当下需要抽取对应 section。
</overview>

<architecture_checklist>
## Architecture Checklist（架构检查清单）

设计 agent-native system 时，在 **implementation 前**验证这些项。

### Core Principles（核心原则）
- [ ] **Parity:** 每个 UI action 都有对应 agent capability
- [ ] **Granularity:** Tools 是 primitives；features 是 prompt-defined outcomes
- [ ] **Composability:** 新 features 可仅通过 prompts 添加
- [ ] **Emergent Capability:** Agent 能处理你 domain 中的 open-ended requests

### Tool Design（Tool 设计）
- [ ] **Dynamic vs Static:** 对于 agent 应有 full access 的 external APIs，使用 dynamic capability discovery
- [ ] **CRUD Completeness:** 每个 entity 都有 create、read、update 和 delete
- [ ] **Primitives not Workflows:** Tools 提供 capability，不编码 business logic
- [ ] **API as Validator:** 当 API 负责验证时，使用 `z.string()` inputs，而不是 `z.enum()`

### Files & Workspace（Files 与 Workspace）
- [ ] **Shared Workspace:** Agent 和 user 在同一 data space 中工作
- [ ] **context.md Pattern:** Agent 读取/更新 context file 来积累 knowledge
- [ ] **File Organization:** 使用 consistent naming 的 entity-scoped directories

### Agent Execution（Agent 执行）
- [ ] **Completion Signals:** Agent 有明确的 `complete_task` tool（不是 heuristic detection）
- [ ] **Partial Completion:** Multi-step tasks 跟踪进度以便 resume
- [ ] **Context Limits:** 从一开始就为 bounded context 设计

### Context Injection（Context 注入）
- [ ] **Available Resources:** System prompt 包含现有资源（files、data、types）
- [ ] **Available Capabilities:** System prompt 用 user vocabulary 记录 tools
- [ ] **Dynamic Context:** 长 session 中 context 会 refresh（或提供 `refresh_context` tool）

### UI Integration（UI 集成）
- [ ] **Agent → UI:** Agent changes 反映到 UI 中（shared service、file watching 或 event bus）
- [ ] **No Silent Actions:** Agent writes 会立即触发 UI updates
- [ ] **Capability Discovery:** Users 能了解 agent 能做什么

### Mobile（如适用）
- [ ] **Checkpoint/Resume:** 优雅处理 iOS app suspension
- [ ] **iCloud Storage:** iCloud-first，并为 multi-device sync 提供 local fallback
- [ ] **Cost Awareness（成本感知）：** Model tier selection（Haiku/Sonnet/Opus）
</architecture_checklist>

<anti_patterns>
## Anti-Patterns（反模式）

### Common Approaches That Aren't Fully Agent-Native（并非完全 Agent-Native 的常见做法）

这些做法不一定错误；它们可能适合你的 use case。但它们不同于本 skill 描述的 architecture。

**Agent as router** — agent 判断用户想要什么，然后调用正确函数。agent 的 intelligence 被用于 route，而不是 act。只使用了 agent 能力的一小部分。

**Build the app, then add agent** — 你用传统方式（代码）构建 features，然后暴露给 agent。agent 只能做你的 features 已经能做的事。你不会得到 emergent capability。

**Request/response thinking** — Agent 接收 input，做一件事，返回 output。它漏掉了 loop：agent 接收要达成的 outcome，持续操作直到完成，并沿途处理 unexpected situations。

**Defensive tool design** — 从 defensive programming 借来的 over-constrained tool inputs（strict enums、每层 validation）。安全，但会阻止 agent 做你未预料到的事。

**Happy path in code, agent just executes** — 传统软件在代码中处理 edge cases。Agent-native 让 agent 用 judgment 处理 edge cases。如果你的代码处理了所有 edge cases，agent 就只是 caller。

---

### Specific Anti-Patterns（具体反模式）

**THE CARDINAL SIN（首要错误）：Agent executes your code instead of figuring things out**

```typescript
// WRONG - You wrote the workflow, agent just executes it
tool("process_feedback", async ({ message }) => {
  const category = categorize(message);      // Your code decides
  const priority = calculatePriority(message); // Your code decides
  await store(message, category, priority);   // Your code orchestrates
  if (priority > 3) await notify();           // Your code decides
});

// RIGHT - Agent figures out how to process feedback
tools: store_item, send_message  // Primitives
prompt: "Rate importance 1-5 based on actionability, store feedback, notify if >= 4"
```

**Workflow-shaped tools** — `analyze_and_organize` 将 judgment 捆绑进 tool。拆成 primitives，让 agent 组合它们。

**Context starvation** — Agent 不知道 app 中有哪些 resources。
```
User: "Write something about Catherine the Great in my feed"
Agent: "What feed? I don't understand what system you're referring to."
```
Fix：将 available resources、capabilities 和 vocabulary 注入 system prompt。

**Orphan UI actions** — User 能通过 UI 做某事，但 agent 无法做到。Fix：保持 parity。

**Silent actions** — Agent 改变 state，但 UI 不更新。Fix：使用带 reactive binding 的 shared data stores，或 file system observation。

**Heuristic completion detection** — 通过 heuristics 检测 agent completion（连续若干次 iteration 没有 tool calls、检查预期 output files）。脆弱。Fix：要求 agents 通过 `complete_task` tool 明确 signal completion。

**Static tool mapping for dynamic APIs** — 为 50 个 API endpoints 构建 50 个 tools，而 `discover` + `access` pattern 可提供更高 flexibility。
```typescript
// WRONG - Every API type needs a hardcoded tool
tool("read_steps", ...)
tool("read_heart_rate", ...)
tool("read_sleep", ...)

// RIGHT - Dynamic capability discovery
tool("list_available_types", ...)
tool("read_health_data", { dataType: z.string() }, ...)
```

**Incomplete CRUD** — Agent 能 create，但不能 update 或 delete。
```typescript
// User: "Delete that journal entry"
// Agent: "I don't have a tool for that"
tool("create_journal_entry", ...)  // Missing: update, delete
```
Fix：每个 entity 都需要 full CRUD。

**Sandbox isolation** — Agent 在与 user 分离的 data space 中工作。
```
Documents/
├── user_files/        ← User's space
└── agent_output/      ← Agent's space (isolated)
```
Fix：shared workspace，让双方操作同一组 files。

**Gates without reason** — Domain tool 是做某事的唯一方式，而你并没有意图限制 access。默认应开放。除非有具体 gate 理由，否则保持 primitives 可用。

**Artificial capability limits** — 因模糊 safety concerns 而不是具体 risks 限制 agent 能做什么。agent 通常应该能做 users 能做的事。
</anti_patterns>

<success_criteria>
## Success Criteria（成功标准）

当系统满足以下条件时，它就是 agent-native：

### Architecture（架构）
- [ ] agent 能达成 users 通过 UI 可达成的任何事（parity）
- [ ] Tools 是 atomic primitives；domain tools 是 shortcuts，不是 gates（granularity）
- [ ] New features 可通过编写 new prompts 添加（composability）
- [ ] agent 能完成你没有明确设计过的 tasks（emergent capability）
- [ ] 改变 behavior 意味着编辑 prompts，而不是 refactoring code

### Implementation（实现）
- [ ] System prompt 包含关于 app state 的 dynamic context
- [ ] 每个 UI action 都有对应 agent tool
- [ ] Agent tools 在 system prompt 中用 user vocabulary 记录
- [ ] Agent 和 user 在同一 data space 中工作
- [ ] Agent actions 立即反映到 UI
- [ ] 每个 entity 都有 full CRUD
- [ ] Agents 明确 signal completion（无 heuristic detection）
- [ ] 用 context.md 或等价物积累 knowledge

### Product（产品）
- [ ] Simple requests 无 learning curve，立即可用
- [ ] Power users 能将系统推向 unexpected directions
- [ ] 你通过观察 users 要 agent 做什么来学习他们想要什么
- [ ] Approval requirements 与 stakes 和 reversibility 匹配

### Mobile（如适用）
- [ ] Checkpoint/resume 能处理 app interruption
- [ ] iCloud-first storage，并带 local fallback
- [ ] Background execution 明智使用 available time
- [ ] Model tier 与 task complexity 匹配

---

### The Ultimate Test（终极测试）

向 agent 描述一个属于你 application domain、但你没有为其构建特定 feature 的 outcome。它能否弄清如何完成，并循环操作直到成功？

如果可以，系统就是 agent-native。如果它说 "I don't have a feature for that,"，architecture 仍然过度受限。
</success_criteria>
