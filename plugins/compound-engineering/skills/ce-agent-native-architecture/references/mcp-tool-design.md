<overview>
如何按照 prompt-native principles 设计 MCP tools。Tools 应该是 enable capability 的 primitives，而不是 encode decisions 的 workflows。

**Core principle：** 用户能做什么，agent 就应该能做什么。不要 artificially limit agent；给它 power user 会拥有的同一组 primitives。
</overview>

<principle name="primitives-not-workflows">
## Tools 是 Primitives，不是 Workflows

**错误做法：** encode business logic 的 tools
```typescript
tool("process_feedback", {
  feedback: z.string(),
  category: z.enum(["bug", "feature", "question"]),
  priority: z.enum(["low", "medium", "high"]),
}, async ({ feedback, category, priority }) => {
  // Tool decides how to process
  const processed = categorize(feedback);
  const stored = await saveToDatabase(processed);
  const notification = await notify(priority);
  return { processed, stored, notification };
});
```

**正确做法：** enable any workflow 的 primitives
```typescript
tool("store_item", {
  key: z.string(),
  value: z.any(),
}, async ({ key, value }) => {
  await db.set(key, value);
  return { text: `Stored ${key}` };
});

tool("send_message", {
  channel: z.string(),
  content: z.string(),
}, async ({ channel, content }) => {
  await messenger.send(channel, content);
  return { text: "Sent" };
});
```

agent 基于 system prompt 决定 categorization、priority，以及何时 notify。
</principle>

<principle name="descriptive-names">
## Tools 应该有描述性、Primitive 的名称

Names 应描述 capability，而不是 use case：

| 错误 | 正确 |
|-------|-------|
| `process_user_feedback` | `store_item` |
| `create_feedback_summary` | `write_file` |
| `send_notification` | `send_message` |
| `deploy_to_production` | `git_push` |

prompt 告诉 agent *何时*使用 primitives。tool 只提供 *capability*。
</principle>

<principle name="simple-inputs">
## Inputs 应该简单

Tools 接收 data。它们不接收 decisions。

**错误：** Tool 接收 decisions
```typescript
tool("format_content", {
  content: z.string(),
  format: z.enum(["markdown", "html", "json"]),
  style: z.enum(["formal", "casual", "technical"]),
}, ...)
```

**正确：** Tool 接收 data，agent 决定 format
```typescript
tool("write_file", {
  path: z.string(),
  content: z.string(),
}, ...)
// Agent decides to write index.html with HTML content, or data.json with JSON
```
</principle>

<principle name="rich-outputs">
## Outputs 应该丰富

返回足够信息，让 agent 可以 verify 和 iterate。

**错误：** Minimal output
```typescript
async ({ key }) => {
  await db.delete(key);
  return { text: "Deleted" };
}
```

**正确：** Rich output
```typescript
async ({ key }) => {
  const existed = await db.has(key);
  if (!existed) {
    return { text: `Key ${key} did not exist` };
  }
  await db.delete(key);
  return { text: `Deleted ${key}. ${await db.count()} items remaining.` };
}
```
</principle>

<design_template>
## Tool 设计模板

```typescript
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export const serverName = createSdkMcpServer({
  name: "server-name",
  version: "1.0.0",
  tools: [
    // READ operations
    tool(
      "read_item",
      "Read an item by key",
      { key: z.string().describe("Item key") },
      async ({ key }) => {
        const item = await storage.get(key);
        return {
          content: [{
            type: "text",
            text: item ? JSON.stringify(item, null, 2) : `Not found: ${key}`,
          }],
          isError: !item,
        };
      }
    ),

    tool(
      "list_items",
      "List all items, optionally filtered",
      {
        prefix: z.string().optional().describe("Filter by key prefix"),
        limit: z.number().default(100).describe("Max items"),
      },
      async ({ prefix, limit }) => {
        const items = await storage.list({ prefix, limit });
        return {
          content: [{
            type: "text",
            text: `Found ${items.length} items:\n${items.map(i => i.key).join("\n")}`,
          }],
        };
      }
    ),

    // WRITE operations
    tool(
      "store_item",
      "Store an item",
      {
        key: z.string().describe("Item key"),
        value: z.any().describe("Item data"),
      },
      async ({ key, value }) => {
        await storage.set(key, value);
        return {
          content: [{ type: "text", text: `Stored ${key}` }],
        };
      }
    ),

    tool(
      "delete_item",
      "Delete an item",
      { key: z.string().describe("Item key") },
      async ({ key }) => {
        const existed = await storage.delete(key);
        return {
          content: [{
            type: "text",
            text: existed ? `Deleted ${key}` : `${key} did not exist`,
          }],
        };
      }
    ),

    // EXTERNAL operations
    tool(
      "call_api",
      "Make an HTTP request",
      {
        url: z.string().url(),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
        body: z.any().optional(),
      },
      async ({ url, method, body }) => {
        const response = await fetch(url, { method, body: JSON.stringify(body) });
        const text = await response.text();
        return {
          content: [{
            type: "text",
            text: `${response.status} ${response.statusText}\n\n${text}`,
          }],
          isError: !response.ok,
        };
      }
    ),
  ],
});
```
</design_template>

<example name="feedback-server">
## 示例：Feedback Storage Server

这个 server 提供存储 feedback 的 primitives。它不决定如何 categorize 或 organize feedback；那是 agent 通过 prompt 完成的工作。

```typescript
export const feedbackMcpServer = createSdkMcpServer({
  name: "feedback",
  version: "1.0.0",
  tools: [
    tool(
      "store_feedback",
      "Store a feedback item",
      {
        item: z.object({
          id: z.string(),
          author: z.string(),
          content: z.string(),
          importance: z.number().min(1).max(5),
          timestamp: z.string(),
          status: z.string().optional(),
          urls: z.array(z.string()).optional(),
          metadata: z.any().optional(),
        }).describe("Feedback item"),
      },
      async ({ item }) => {
        await db.feedback.insert(item);
        return {
          content: [{
            type: "text",
            text: `Stored feedback ${item.id} from ${item.author}`,
          }],
        };
      }
    ),

    tool(
      "list_feedback",
      "List feedback items",
      {
        limit: z.number().default(50),
        status: z.string().optional(),
      },
      async ({ limit, status }) => {
        const items = await db.feedback.list({ limit, status });
        return {
          content: [{
            type: "text",
            text: JSON.stringify(items, null, 2),
          }],
        };
      }
    ),

    tool(
      "update_feedback",
      "Update a feedback item",
      {
        id: z.string(),
        updates: z.object({
          status: z.string().optional(),
          importance: z.number().optional(),
          metadata: z.any().optional(),
        }),
      },
      async ({ id, updates }) => {
        await db.feedback.update(id, updates);
        return {
          content: [{ type: "text", text: `Updated ${id}` }],
        };
      }
    ),
  ],
});
```

随后 system prompt 告诉 agent *如何*使用这些 primitives：

```markdown
## Feedback Processing

When someone shares feedback:
1. Extract author, content, and any URLs
2. Rate importance 1-5 based on actionability
3. Store using feedback.store_feedback
4. If high importance (4-5), notify the channel

Use your judgment about importance ratings.
```
</example>

<principle name="dynamic-capability-discovery">
## Dynamic Capability Discovery 与 Static Tool Mapping

**这个 pattern 专为 agent-native apps 设计**，适用于你希望 agent 对 external API 拥有 full access 的场景，也就是拥有用户会拥有的同等 access。它遵循核心 agent-native principle："Whatever the user can do, the agent can do."

如果你在构建 limited capabilities 的 constrained agent，static tool mapping 可能是 intentional。但对集成 HealthKit、HomeKit、GraphQL 或类似 APIs 的 agent-native apps：

**Static Tool Mapping（Agent-Native 的 Anti-pattern）：**
为每个 API capability 构建 individual tools。它总会 out of date，并将 agent 限制在你预想过的能力中。

```typescript
// ❌ Static: Every API type needs a hardcoded tool
tool("read_steps", async ({ startDate, endDate }) => {
  return healthKit.query(HKQuantityType.stepCount, startDate, endDate);
});

tool("read_heart_rate", async ({ startDate, endDate }) => {
  return healthKit.query(HKQuantityType.heartRate, startDate, endDate);
});

tool("read_sleep", async ({ startDate, endDate }) => {
  return healthKit.query(HKCategoryType.sleepAnalysis, startDate, endDate);
});

// When HealthKit adds glucose tracking... you need a code change
```

**Dynamic Capability Discovery（Preferred，动态能力发现，首选）：**
构建一个发现 available 内容的 meta-tool，以及一个可以 access anything 的 generic tool。

```typescript
// ✅ Dynamic: Agent discovers and uses any capability

// Discovery tool - returns what's available at runtime
tool("list_available_capabilities", async () => {
  const quantityTypes = await healthKit.availableQuantityTypes();
  const categoryTypes = await healthKit.availableCategoryTypes();

  return {
    text: `Available health metrics:\n` +
          `Quantity types: ${quantityTypes.join(", ")}\n` +
          `Category types: ${categoryTypes.join(", ")}\n` +
          `\nUse read_health_data with any of these types.`
  };
});

// Generic access tool - type is a string, API validates
tool("read_health_data", {
  dataType: z.string(),  // NOT z.enum - let HealthKit validate
  startDate: z.string(),
  endDate: z.string(),
  aggregation: z.enum(["sum", "average", "samples"]).optional()
}, async ({ dataType, startDate, endDate, aggregation }) => {
  // HealthKit validates the type, returns helpful error if invalid
  const result = await healthKit.query(dataType, startDate, endDate, aggregation);
  return { text: JSON.stringify(result, null, 2) };
});
```

**何时使用每种 approach：**

| Dynamic (Agent-Native) | Static (Constrained Agent) |
|------------------------|---------------------------|
| Agent 应 access 用户能 access 的任何东西 | Agent 有 intentional limited scope |
| 有很多 endpoints 的 external API（HealthKit、HomeKit、GraphQL） | fixed operations 的 internal domain |
| API 独立于你的 code 演化 | Tightly coupled domain logic |
| 你想要 full action parity | 你想要 strict guardrails |

**agent-native default 是 Dynamic。** 只有当你 intentional limiting agent capabilities 时才使用 Static。

**完整 Dynamic Pattern：**

```swift
// 1. Discovery tool: What can I access?
tool("list_health_types", "Get available health data types") { _ in
    let store = HKHealthStore()

    let quantityTypes = HKQuantityTypeIdentifier.allCases.map { $0.rawValue }
    let categoryTypes = HKCategoryTypeIdentifier.allCases.map { $0.rawValue }
    let characteristicTypes = HKCharacteristicTypeIdentifier.allCases.map { $0.rawValue }

    return ToolResult(text: """
        Available HealthKit types:

        ## Quantity Types (numeric values)
        \(quantityTypes.joined(separator: ", "))

        ## Category Types (categorical data)
        \(categoryTypes.joined(separator: ", "))

        ## Characteristic Types (user info)
        \(characteristicTypes.joined(separator: ", "))

        Use read_health_data or write_health_data with any of these.
        """)
}

// 2. Generic read: Access any type by name
tool("read_health_data", "Read any health metric", {
    dataType: z.string().describe("Type name from list_health_types"),
    startDate: z.string(),
    endDate: z.string()
}) { request in
    // Let HealthKit validate the type name
    guard let type = HKQuantityTypeIdentifier(rawValue: request.dataType)
                     ?? HKCategoryTypeIdentifier(rawValue: request.dataType) else {
        return ToolResult(
            text: "Unknown type: \(request.dataType). Use list_health_types to see available types.",
            isError: true
        )
    }

    let samples = try await healthStore.querySamples(type: type, start: startDate, end: endDate)
    return ToolResult(text: samples.formatted())
}

// 3. Context injection: Tell agent what's available in system prompt
func buildSystemPrompt() -> String {
    let availableTypes = healthService.getAuthorizedTypes()

    return """
    ## Available Health Data

    You have access to these health metrics:
    \(availableTypes.map { "- \($0)" }.joined(separator: "\n"))

    Use read_health_data with any type above. For new types not listed,
    use list_health_types to discover what's available.
    """
}
```

**收益：**
- Agent 可以使用任何 API capability，包括 code shipped 后新增的 capability
- API 是 validator，而不是你的 enum definition
- 更小的 tool surface（2-3 tools vs N tools）
- Agent 通过询问自然 discover capabilities
- 适用于任何有 introspection 的 API（HealthKit、GraphQL、OpenAPI）
</principle>

<principle name="crud-completeness">
## CRUD 完整性

agent 能 create 的每种 data type，都应该能 read、update 和 delete。Incomplete CRUD = broken action parity。

**Anti-pattern：Create-only tools（反模式：只支持 create 的 tools）**
```typescript
// ❌ Can create but not modify or delete
tool("create_experiment", { hypothesis, variable, metric })
tool("write_journal_entry", { content, author, tags })
// User: "Delete that experiment" → Agent: "I can't do that"
```

**正确：每个 entity 都有 Full CRUD**
```typescript
// ✅ Complete CRUD
tool("create_experiment", { hypothesis, variable, metric })
tool("read_experiment", { id })
tool("update_experiment", { id, updates: { hypothesis?, status?, endDate? } })
tool("delete_experiment", { id })

tool("create_journal_entry", { content, author, tags })
tool("read_journal", { query?, dateRange?, author? })
tool("update_journal_entry", { id, content, tags? })
tool("delete_journal_entry", { id })
```

**CRUD Audit（CRUD 审计）：**
对 app 中每个 entity type，verify：
- [ ] Create：Agent 可以 create new instances
- [ ] Read：Agent 可以 query/search/list instances
- [ ] Update：Agent 可以 modify existing instances
- [ ] Delete：Agent 可以 remove instances

如果缺少任何 operation，users 迟早会提出请求，agent 就会失败。
</principle>

<checklist>
## MCP Tool 设计检查清单

**基础：**
- [ ] Tool names 描述 capability，而不是 use case
- [ ] Inputs 是 data，不是 decisions
- [ ] Outputs 是 rich 的（足够 agent verify）
- [ ] CRUD operations 是 separate tools（不是一个 mega-tool）
- [ ] tool implementations 中没有 business logic
- [ ] Error states 通过 `isError` 清晰传达
- [ ] Descriptions 解释 tool 做什么，而不是何时使用它

**Dynamic Capability Discovery（for agent-native apps，面向 agent-native apps）：**
- [ ] 对 agent 应拥有 full access 的 external APIs，使用 dynamic discovery
- [ ] 为每个 API surface 包含一个 `list_*` 或 `discover_*` tool
- [ ] 当 API 负责 validate 时，使用 string inputs（不是 enums）
- [ ] runtime 将 available capabilities 注入 system prompt
- [ ] 只有 intentional limiting agent scope 时才使用 static tool mapping

**CRUD 完整性：**
- [ ] 每个 entity 都有 create、read、update、delete operations
- [ ] 每个 UI action 都有 corresponding agent tool
- [ ] Test（测试）："Can the agent undo what it just did?"
</checklist>
