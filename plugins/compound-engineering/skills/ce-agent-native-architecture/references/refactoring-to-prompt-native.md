<overview>
如何将 existing agent code refactor 到遵循 prompt-native principles。目标：把 behavior 从 code 移到 prompts 中，并将 tools 简化为 primitives。
</overview>

<diagnosis>
## 诊断非 Prompt-Native 代码

你的 agent 不是 prompt-native 的迹象：

**把 workflows 写进 code 的 tools：**
```typescript
// RED FLAG: Tool contains business logic
tool("process_feedback", async ({ message }) => {
  const category = categorize(message);        // Logic in code
  const priority = calculatePriority(message); // Logic in code
  await store(message, category, priority);    // Orchestration in code
  if (priority > 3) await notify();            // Decision in code
});
```

**Agent 只是在调用 functions，而不是自己判断：**
```typescript
// RED FLAG: Agent is just a function caller
"Use process_feedback to handle incoming messages"
// vs.
"When feedback comes in, decide importance, store it, notify if high"
```

**对 agent capability 设置 artificial limits：**
```typescript
// RED FLAG: Tool prevents agent from doing what users can do
tool("read_file", async ({ path }) => {
  if (!ALLOWED_PATHS.includes(path)) {
    throw new Error("Not allowed to read this file");
  }
  return readFile(path);
});
```

**指定 HOW 而不是 WHAT 的 prompts：**
```markdown
// RED FLAG: Micromanaging the agent
When creating a summary:
1. Use exactly 3 bullet points
2. Each bullet must be under 20 words
3. Format with em-dashes for sub-points
4. Bold the first word of each bullet
```
</diagnosis>

<refactoring_workflow>
## 分步骤重构

**Step 1：识别 workflow tools**

列出所有 tools。标记任何符合以下条件的 tool：
- 有 business logic（categorize、calculate、decide）
- 编排多个 operations
- 代表 agent 做 decisions
- 包含 conditional logic（基于 content 的 if/else）

**Step 2：提取 primitives**

对每个 workflow tool，识别 underlying primitives：

| Workflow Tool | 隐藏的 Primitives |
|---------------|-------------------|
| `process_feedback` | `store_item`, `send_message` |
| `generate_report` | `read_file`, `write_file` |
| `deploy_and_notify` | `git_push`, `send_message` |

**Step 3：把 behavior 移到 prompt**

将 workflow tools 中的 logic 取出，用自然语言表达：

```typescript
// Before (in code):
async function processFeedback(message) {
  const priority = message.includes("crash") ? 5 :
                   message.includes("bug") ? 4 : 3;
  await store(message, priority);
  if (priority >= 4) await notify();
}
```

```markdown
// After (in prompt):
## Feedback Processing

When someone shares feedback:
1. Rate importance 1-5:
   - 5: Crashes, data loss, security issues
   - 4: Bug reports with clear reproduction steps
   - 3: General suggestions, minor issues
2. Store using store_item
3. If importance >= 4, notify the team

Use your judgment. Context matters more than keywords.
```

**Step 4：将 tools 简化为 primitives**

```typescript
// Before: 1 workflow tool
tool("process_feedback", { message, category, priority }, ...complex logic...)

// After: 2 primitive tools
tool("store_item", { key: z.string(), value: z.any() }, ...simple storage...)
tool("send_message", { channel: z.string(), content: z.string() }, ...simple send...)
```

**Step 5：移除 artificial limits**

```typescript
// Before: Limited capability
tool("read_file", async ({ path }) => {
  if (!isAllowed(path)) throw new Error("Forbidden");
  return readFile(path);
});

// After: Full capability
tool("read_file", async ({ path }) => {
  return readFile(path);  // Agent can read anything
});
// Use approval gates for WRITES, not artificial limits on READS
```

**Step 6：按 outcomes 测试，而不是按 procedures 测试**

不要测试 "does it call the right function?"，要测试 "does it achieve the outcome?"

```typescript
// Before: Testing procedure
expect(mockProcessFeedback).toHaveBeenCalledWith(...)

// After: Testing outcome
// Send feedback → Check it was stored with reasonable importance
// Send high-priority feedback → Check notification was sent
```
</refactoring_workflow>

<before_after>
## Before/After 示例

**Example 1：Feedback Processing（反馈处理）**

Before（之前）：
```typescript
tool("handle_feedback", async ({ message, author }) => {
  const category = detectCategory(message);
  const priority = calculatePriority(message, category);
  const feedbackId = await db.feedback.insert({
    id: generateId(),
    author,
    message,
    category,
    priority,
    timestamp: new Date().toISOString(),
  });

  if (priority >= 4) {
    await discord.send(ALERT_CHANNEL, `High priority feedback from ${author}`);
  }

  return { feedbackId, category, priority };
});
```

After（之后）：
```typescript
// Simple storage primitive
tool("store_feedback", async ({ item }) => {
  await db.feedback.insert(item);
  return { text: `Stored feedback ${item.id}` };
});

// Simple message primitive
tool("send_message", async ({ channel, content }) => {
  await discord.send(channel, content);
  return { text: "Sent" };
});
```

System prompt（系统 prompt）：
```markdown
## Feedback Processing

When someone shares feedback:
1. Generate a unique ID
2. Rate importance 1-5 based on impact and urgency
3. Store using store_feedback with the full item
4. If importance >= 4, send a notification to the team channel

Importance guidelines:
- 5: Critical (crashes, data loss, security)
- 4: High (detailed bug reports, blocking issues)
- 3: Medium (suggestions, minor bugs)
- 2: Low (cosmetic, edge cases)
- 1: Minimal (off-topic, duplicates)
```

**Example 2：Report Generation（报告生成）**

Before（之前）：
```typescript
tool("generate_weekly_report", async ({ startDate, endDate, format }) => {
  const data = await fetchMetrics(startDate, endDate);
  const summary = summarizeMetrics(data);
  const charts = generateCharts(data);

  if (format === "html") {
    return renderHtmlReport(summary, charts);
  } else if (format === "markdown") {
    return renderMarkdownReport(summary, charts);
  } else {
    return renderPdfReport(summary, charts);
  }
});
```

After（之后）：
```typescript
tool("query_metrics", async ({ start, end }) => {
  const data = await db.metrics.query({ start, end });
  return { text: JSON.stringify(data, null, 2) };
});

tool("write_file", async ({ path, content }) => {
  writeFileSync(path, content);
  return { text: `Wrote ${path}` };
});
```

System prompt（系统 prompt）：
```markdown
## Report Generation

When asked to generate a report:
1. Query the relevant metrics using query_metrics
2. Analyze the data and identify key trends
3. Create a clear, well-formatted report
4. Write it using write_file in the appropriate format

Use your judgment about format and structure. Make it useful.
```
</before_after>

<common_challenges>
## 常见重构挑战

**"But the agent might make mistakes!"（但 agent 可能会犯错！）**

是的，所以你可以 iterate。修改 prompt 来添加 guidance：
```markdown
// Before
Rate importance 1-5.

// After (if agent keeps rating too high)
Rate importance 1-5. Be conservative—most feedback is 2-3.
Only use 4-5 for truly blocking or critical issues.
```

**"The workflow is complex!"（但 workflow 很复杂！）**

复杂 workflows 仍然可以用 prompts 表达。agent 是 smart 的。
```markdown
When processing video feedback:
1. Check if it's a Loom, YouTube, or direct link
2. For YouTube, pass URL directly to video analysis
3. For others, download first, then analyze
4. Extract timestamped issues
5. Rate based on issue density and severity
```

**"We need deterministic behavior!"（我们需要确定性行为！）**

有些 operations 应该留在 code 中。这没问题。Prompt-native 不是全有或全无。

保留在 code 中：
- Security validation（安全验证）
- Rate limiting（速率限制）
- Audit logging（审计日志）
- Exact format requirements（精确格式要求）

移到 prompts 中：
- Categorization decisions（分类决策）
- Priority judgments（优先级判断）
- Content generation（内容生成）
- Workflow orchestration（workflow 编排）

**"What about testing?"（那测试怎么办？）**

测试 outcomes，而不是 procedures：
- "Given this input, does the agent achieve the right result?"（给定这个输入，agent 是否达成正确结果？）
- "Does stored feedback have reasonable importance ratings?"（存储的 feedback 是否有合理的重要性评分？）
- "Are notifications sent for truly high-priority items?"（真正高优先级的 items 是否发送了通知？）
</common_challenges>

<checklist>
## 重构检查清单

诊断：
- [ ] 已列出所有包含 business logic 的 tools
- [ ] 已识别对 agent capability 的 artificial limits
- [ ] 已发现 micromanage HOW 的 prompts

重构：
- [ ] 已从 workflow tools 中提取 primitives
- [ ] 已将 business logic 移到 system prompt
- [ ] 已移除 artificial limits
- [ ] 已将 tool inputs 简化为 data，而不是 decisions

验证：
- [ ] Agent 使用 primitives 达成相同 outcomes
- [ ] Behavior 可通过编辑 prompts 改变
- [ ] 可在不新增 tools 的情况下添加 new features
</checklist>
