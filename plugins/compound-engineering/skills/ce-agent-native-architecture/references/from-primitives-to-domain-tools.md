<overview>
从 pure primitives 开始：bash、file operations、basic storage。这会证明 architecture 可行，并揭示 agent 实际需要什么。随着 patterns 浮现，再 deliberate 地添加 domain-specific tools。本文说明何时以及如何从 primitives 演化到 domain tools，以及何时 graduate to optimized code。
</overview>

<start_with_primitives>
## 从 Pure Primitives 开始

每个 agent-native system 都从尽可能 atomic 的 tools 开始：

- `read_file` / `write_file` / `list_files`
- `bash`（处理其他所有事）
- Basic storage（基础存储，`store_item` / `get_item`）
- HTTP requests（HTTP 请求，`fetch_url`）

**为什么从这里开始：**

1. **证明 architecture 可行** - 如果它能用 primitives 工作，说明 prompts 在发挥作用
2. **揭示真实需求** - 你会发现哪些 domain concepts 重要
3. **最大灵活性** - Agent 可以做任何事，而不只是你预想过的事
4. **迫使 prompts 变好** - 你不能依赖 tool logic 当 crutch

### 示例：Starting Primitive

```typescript
// Start with just these
const tools = [
  tool("read_file", { path: z.string() }, ...),
  tool("write_file", { path: z.string(), content: z.string() }, ...),
  tool("list_files", { path: z.string() }, ...),
  tool("bash", { command: z.string() }, ...),
];

// Prompt handles the domain logic
const prompt = `
When processing feedback:
1. Read existing feedback from data/feedback.json
2. Add the new feedback with your assessment of importance (1-5)
3. Write the updated file
4. If importance >= 4, create a notification file in data/alerts/
`;
```
</start_with_primitives>

<when_to_add_domain_tools>
## 何时添加 Domain Tools

随着 patterns 浮现，你会想添加 domain-specific tools。这是好事，但要 deliberate。

### Vocabulary Anchoring（词汇锚定）

**添加 domain tool 的时机：** agent 需要理解 domain concepts。

`create_note` tool 比 "write a file to the notes directory with this format" 更能教会 agent 你的 system 中 "note" 是什么意思。

```typescript
// Without domain tool - agent must infer structure
await agent.chat("Create a note about the meeting");
// Agent: writes to... notes/? documents/? what format?

// With domain tool - vocabulary is anchored
tool("create_note", {
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).optional(),
}, async ({ title, content, tags }) => {
  // Tool enforces structure, agent understands "note"
});
```

### Guardrails（护栏）

**添加 domain tool 的时机：** 某些 operations 需要 validation 或 constraints，不应留给 agent judgment。

```typescript
// publish_to_feed might enforce format requirements or content policies
tool("publish_to_feed", {
  bookId: z.string(),
  content: z.string(),
  headline: z.string().max(100),  // Enforce headline length
}, async ({ bookId, content, headline }) => {
  // Validate content meets guidelines
  if (containsProhibitedContent(content)) {
    return { text: "Content doesn't meet guidelines", isError: true };
  }
  // Enforce proper structure
  await feedService.publish({ bookId, content, headline, publishedAt: new Date() });
});
```

### Efficiency（效率）

**添加 domain tool 的时机：** 常见 operations 需要很多 primitive calls。

```typescript
// Primitive approach: multiple calls
await agent.chat("Get book details");
// Agent: read library.json, parse, find book, read full_text.txt, read introduction.md...

// Domain tool: one call for common operation
tool("get_book_with_content", { bookId: z.string() }, async ({ bookId }) => {
  const book = await library.getBook(bookId);
  const fullText = await readFile(`Research/${bookId}/full_text.txt`);
  const intro = await readFile(`Research/${bookId}/introduction.md`);
  return { text: JSON.stringify({ book, fullText, intro }) };
});
```
</when_to_add_domain_tools>

<the_rule>
## Domain Tools 的规则

**Domain tools 应代表用户视角下的一个 conceptual action。**

它们可以包含 mechanical validation，但**关于做什么、是否做的 judgment 属于 prompt**。

### 错误：把 Judgment 打包进 Tool

```typescript
// WRONG - analyze_and_publish bundles judgment into the tool
tool("analyze_and_publish", async ({ input }) => {
  const analysis = analyzeContent(input);      // Tool decides how to analyze
  const shouldPublish = analysis.score > 0.7;  // Tool decides whether to publish
  if (shouldPublish) {
    await publish(analysis.summary);            // Tool decides what to publish
  }
});
```

### 正确：一个 Action，由 Agent 决定

```typescript
// RIGHT - separate tools, agent decides
tool("analyze_content", { content: z.string() }, ...);  // Returns analysis
tool("publish", { content: z.string() }, ...);          // Publishes what agent provides

// Prompt: "Analyze the content. If it's high quality, publish a summary."
// Agent decides what "high quality" means and what summary to write.
```

### 测试问题

问："Who is making the decision here?"

- 如果答案是 "the tool code" → 你已经 encoded judgment，需要 refactor
- 如果答案是 "the agent based on the prompt" → good（正确）
</the_rule>

<keep_primitives_available>
## 保持 Primitives 可用

**Domain tools 是 shortcuts，不是 gates。**

除非有具体理由限制 access（security、data integrity），否则 agent 仍应能为 edge cases 使用 underlying primitives。

```typescript
// Domain tool for common case
tool("create_note", { title, content }, ...);

// But primitives still available for edge cases
tool("read_file", { path }, ...);
tool("write_file", { path, content }, ...);

// Agent can use create_note normally, but for weird edge case:
// "Create a note in a non-standard location with custom metadata"
// → Agent uses write_file directly
```

### 何时 Gate

Gating（让 domain tool 成为唯一方式）适用于：

- **Security（安全）：** User authentication、payment processing
- **Data integrity（数据完整性）：** 必须 maintain invariants 的 operations
- **Audit requirements（审计要求）：** 必须以特定方式记录的 actions

**default 是 open。** 当你 gate 某件事时，要让它成为有明确理由的 conscious decision（有意识决策）。
</keep_primitives_available>

<graduating_to_code>
## 演进到 Code

有些 operations 出于 performance 或 reliability，需要从 agent-orchestrated 移到 optimized code。

### 演进路径

```
Stage 1: Agent uses primitives in a loop（agent 在循环中使用 primitives）
         → 灵活，证明 concept
         → 慢，可能昂贵

Stage 2: Add domain tools for common operations（为常见 operations 添加 domain tools）
         → 更快，仍由 agent-orchestrated
         → Agent still decides when/whether to use

Stage 3: For hot paths, implement in optimized code（为 hot paths 实现 optimized code）
         → 快，deterministic
         → Agent can still trigger, but execution is code
```

### 演进示例

**Stage 1：Pure primitives（纯 primitives）**
```markdown
Prompt: "When user asks for a summary, read all notes in /notes,
        analyze them, and write a summary to /summaries/{date}.md"

Agent: Calls read_file 20 times, reasons about content, writes summary
Time: 30 seconds, 50k tokens
```

**Stage 2：Domain tool（领域 tool）**
```typescript
tool("get_all_notes", {}, async () => {
  const notes = await readAllNotesFromDirectory();
  return { text: JSON.stringify(notes) };
});

// Agent still decides how to summarize, but retrieval is faster
// Time: 10 seconds, 30k tokens
```

**Stage 3：Optimized code（优化代码）**
```typescript
tool("generate_weekly_summary", {}, async () => {
  // Entire operation in code for hot path
  const notes = await getNotes({ since: oneWeekAgo });
  const summary = await generateSummary(notes);  // Could use cheaper model
  await writeSummary(summary);
  return { text: "Summary generated" };
});

// Agent just triggers it
// Time: 2 seconds, 5k tokens
```

### 注意事项

**即使一个 operation graduates to code，agent 也应该能够：**

1. 自己 trigger optimized operation
2. 对 optimized path 未处理的 edge cases fall back to primitives

Graduation 关乎 efficiency。**Parity 仍然成立。** 当你 optimize 时，agent 不应失去 capability。
</graduating_to_code>

<decision_framework>
## 决策框架

### 我是否应该添加 Domain Tool？

| 问题 | 如果是 |
|----------|--------|
| agent 是否困惑于这个 concept 的含义？ | 为 vocabulary anchoring（词汇锚定）添加 |
| 这个 operation 是否需要 agent 不应决定的 validation？ | 带 guardrails（护栏）添加 |
| 这是常见 multi-step operation 吗？ | 为 efficiency（效率）添加 |
| 改变 behavior 是否需要 code changes？ | 改为保留在 prompt 中 |

### 我是否应该 Graduate to Code？

| 问题 | 如果是 |
|----------|--------|
| 这个 operation 是否被非常频繁调用？ | 考虑 graduating |
| latency 是否显著重要？ | 考虑 graduating |
| token costs 是否成问题？ | 考虑 graduating |
| 是否需要 deterministic behavior？ | Graduate to code（演进为 code） |
| operation 是否需要 complex state management？ | Graduate to code（演进为 code） |

### 我是否应该 Gate Access？

| 问题 | 如果是 |
|----------|--------|
| 是否有 security requirement？ | 适当 gate |
| 这个 operation 是否必须 maintain data integrity？ | 适当 gate |
| 是否有 audit/compliance requirement？ | 适当 gate |
| 只是感觉 "safer"，但没有 specific risk？ | 保持 primitives 可用 |
</decision_framework>

<examples>
## 示例

### Feedback Processing（反馈处理）演进

**Stage 1：Primitives only（仅 primitives）**
```typescript
tools: [read_file, write_file, bash]
prompt: "Store feedback in data/feedback.json, notify if important"
// Agent figures out JSON structure, importance criteria, notification method
```

**Stage 2：Domain tools for vocabulary（用于词汇的 domain tools）**
```typescript
tools: [
  store_feedback,      // Anchors "feedback" concept with proper structure
  send_notification,   // Anchors "notify" with correct channels
  read_file,           // Still available for edge cases
  write_file,
]
prompt: "Store feedback using store_feedback. Notify if importance >= 4."
// Agent still decides importance, but vocabulary is anchored
```

**Stage 3：Graduated hot path（已演进的 hot path）**
```typescript
tools: [
  process_feedback_batch,  // Optimized for high-volume processing
  store_feedback,          // For individual items
  send_notification,
  read_file,
  write_file,
]
// Batch processing is code, but agent can still use store_feedback for special cases
```

### 何时不应添加 Domain Tools

**不要只是为了让事情 "cleaner" 而添加 domain tool：**
```typescript
// Unnecessary - agent can compose primitives
tool("organize_files_by_date", ...)  // Just use move_file + judgment

// Unnecessary - puts decision in wrong place
tool("decide_file_importance", ...)  // This is prompt territory
```

**如果 behavior 可能变化，不要添加 domain tool：**
```typescript
// Bad - locked into code
tool("generate_standard_report", ...)  // What if report format evolves?

// Better - keep in prompt
prompt: "Generate a report covering X, Y, Z. Format for readability."
// Can adjust format by editing prompt
```
</examples>

<checklist>
## 检查清单：从 Primitives 到 Domain Tools

### 起步
- [ ] 从 pure primitives 开始（read、write、list、bash）
- [ ] 将 behavior 写在 prompts 中，而不是 tool logic 中
- [ ] 让 patterns 从 actual usage 中浮现

### 添加 Domain Tools
- [ ] 有明确 reason：vocabulary anchoring、guardrails 或 efficiency
- [ ] Tool 代表一个 conceptual action
- [ ] Judgment 留在 prompts 中，而不是 tool code 中
- [ ] Primitives 与 domain tools 并存

### Graduating to Code（演进为 code）
- [ ] 已识别 hot path（frequent、latency-sensitive 或 expensive）
- [ ] Optimized version 不移除 agent capability
- [ ] edge cases 的 fallback to primitives 仍然有效

### Gating Decisions（gate 决策）
- [ ] 每个 gate 都有 specific reason（security、integrity、audit）
- [ ] Default 是 open access
- [ ] Gates 是 conscious decisions，不是 defaults
</checklist>
