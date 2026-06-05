<overview>
用于构建 agent-native systems 的 architectural patterns。这些 patterns 来自五个 core principles：Parity、Granularity、Composability、Emergent Capability 和 Improvement Over Time。

Features 是 agents 在 loop 中运行后达成的 outcomes，不是你编写的 functions。Tools 是 atomic primitives。agent 应用 judgment；prompt 定义 outcome。

另见：
- [files-universal-interface.md](./files-universal-interface.md)：file organization 和 context.md patterns
- [agent-execution-patterns.md](./agent-execution-patterns.md)：completion signals 和 partial completion
- [product-implications.md](./product-implications.md)：progressive disclosure 和 approval patterns
</overview>

<pattern name="event-driven-agent">
## Event-Driven Agent Architecture（事件驱动 Agent Architecture）

agent 作为 long-lived process 运行并响应 events。Events 变成 prompts。

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Loop                                │
├─────────────────────────────────────────────────────────────┤
│  Event Source → Agent (Claude) → Tool Calls → Response      │
└─────────────────────────────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐    ┌──────────┐    ┌───────────┐
    │ Content │    │   Self   │    │   Data    │
    │  Tools  │    │  Tools   │    │   Tools   │
    └─────────┘    └──────────┘    └───────────┘
    (write_file)   (read_source)   (store_item)
                   (restart)       (list_items)
```

**Key characteristics（关键特征）：**
- Events（messages、webhooks、timers）触发 agent turns
- Agent 基于 system prompt 决定如何 respond
- Tools 是 IO primitives，不是 business logic
- State 通过 data tools 在 events 之间 persist

**Example（示例）：Discord feedback bot**
```typescript
// Event source
client.on("messageCreate", (message) => {
  if (!message.author.bot) {
    runAgent({
      userMessage: `New message from ${message.author}: "${message.content}"`,
      channelId: message.channelId,
    });
  }
});

// System prompt defines behavior
const systemPrompt = `
When someone shares feedback:
1. Acknowledge their feedback warmly
2. Ask clarifying questions if needed
3. Store it using the feedback tools
4. Update the feedback site

Use your judgment about importance and categorization.
`;
```
</pattern>

<pattern name="two-layer-git">
## Two-Layer Git Architecture（双层 Git Architecture）

对 self-modifying agents，将 code（shared）与 data（instance-specific）分开。

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub (shared repo)                     │
│  - src/           (agent code)                              │
│  - site/          (web interface)                           │
│  - package.json   (dependencies)                            │
│  - .gitignore     (excludes data/, logs/)                   │
└─────────────────────────────────────────────────────────────┘
                          │
                     git clone
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Instance (Server)                           │
│                                                              │
│  FROM GITHUB (tracked):                                      │
│  - src/           → pushed back on code changes             │
│  - site/          → pushed, triggers deployment             │
│                                                              │
│  LOCAL ONLY (untracked):                                     │
│  - data/          → instance-specific storage               │
│  - logs/          → runtime logs                            │
│  - .env           → secrets                                 │
└─────────────────────────────────────────────────────────────┘
```

**为什么这有效：**
- Code 和 site 受 version control 管理（GitHub）
- Raw data 保持 local（instance-specific）
- Site 从 data 生成，因此 reproducible
- 通过 git history automatic rollback
</pattern>

<pattern name="multi-instance">
## Multi-Instance Branching（多实例分支）

每个 agent instance 有自己的 branch，同时共享 core code。

```
main                        # Shared features, bug fixes
├── instance/feedback-bot   # Every Reader feedback bot
├── instance/support-bot    # Customer support bot
└── instance/research-bot   # Research assistant
```

**Change flow（变更流）：**
| Change Type（变更类型） | Work On（在哪工作） | Then（然后） |
|-------------|---------|------|
| Core features | main | Merge to instance branches |
| Bug fixes | main | Merge to instance branches |
| Instance config | instance branch | Done |
| Instance data | instance branch | Done |

**Sync tools（同步 tools）：**
```typescript
tool("self_deploy", "Pull latest from main, rebuild, restart", ...)
tool("sync_from_instance", "Merge from another instance", ...)
tool("propose_to_main", "Create PR to share improvements", ...)
```
</pattern>

<pattern name="site-as-output">
## Site as Agent Output（将 Site 作为 Agent Output）

agent 将生成和维护 website 作为 natural output，而不是通过 specialized site tools。

```
Discord Message
      ↓
Agent processes it, extracts insights
      ↓
Agent decides what site updates are needed
      ↓
Agent writes files using write_file primitive
      ↓
Git commit + push triggers deployment
      ↓
Site updates automatically
```

**Key insight（关键洞察）：** 不要构建 site generation tools。给 agent file tools，并在 prompt 中教它如何创建 good sites。

```markdown
## Site Management

You maintain a public feedback site. When feedback comes in:
1. Use write_file to update site/public/content/feedback.json
2. If the site's React components need improvement, modify them
3. Commit changes and push to trigger Vercel deploy

The site should be:
- Clean, modern dashboard aesthetic
- Clear visual hierarchy
- Status organization (Inbox, Active, Done)

You decide the structure. Make it good.
```
</pattern>

<pattern name="approval-gates">
## Approval Gates Pattern（Approval Gates 模式）

对 dangerous operations，将 "propose" 与 "apply" 分开。

```typescript
// Pending changes stored separately
const pendingChanges = new Map<string, string>();

tool("write_file", async ({ path, content }) => {
  if (requiresApproval(path)) {
    // Store for approval
    pendingChanges.set(path, content);
    const diff = generateDiff(path, content);
    return {
      text: `Change requires approval.\n\n${diff}\n\nReply "yes" to apply.`
    };
  } else {
    // Apply immediately
    writeFileSync(path, content);
    return { text: `Wrote ${path}` };
  }
});

tool("apply_pending", async () => {
  for (const [path, content] of pendingChanges) {
    writeFileSync(path, content);
  }
  pendingChanges.clear();
  return { text: "Applied all pending changes" };
});
```

**需要 approval 的内容：**
- src/*.ts (agent code，agent 代码)
- package.json (dependencies，依赖)
- system prompt changes（system prompt 变更）

**不需要 approval 的内容：**
- data/* (instance data，实例数据)
- site/* (generated content，生成内容)
- docs/* (documentation，文档)
</pattern>

<pattern name="unified-agent-architecture">
## Unified Agent Architecture（统一 Agent Architecture）

一个 execution engine，多个 agent types。所有 agents 使用相同 orchestrator，但 configurations 不同。

```
┌─────────────────────────────────────────────────────────────┐
│                    AgentOrchestrator                         │
├─────────────────────────────────────────────────────────────┤
│  - Lifecycle management (start, pause, resume, stop)        │
│  - Checkpoint/restore (for background execution)            │
│  - Tool execution                                            │
│  - Chat integration                                          │
└─────────────────────────────────────────────────────────────┘
          │                    │                    │
    ┌─────┴─────┐        ┌─────┴─────┐        ┌─────┴─────┐
    │ Research  │        │   Chat    │        │  Profile  │
    │   Agent   │        │   Agent   │        │   Agent   │
    └───────────┘        └───────────┘        └───────────┘
    - web_search         - read_library       - read_photos
    - write_file         - publish_to_feed    - write_file
    - read_file          - web_search         - analyze_image
```

**Implementation（实现）：**

```swift
// All agents use the same orchestrator
let session = try await AgentOrchestrator.shared.startAgent(
    config: ResearchAgent.create(book: book),  // Config varies
    tools: ResearchAgent.tools,                 // Tools vary
    context: ResearchAgent.context(for: book)   // Context varies
)

// Agent types define their own configuration
struct ResearchAgent {
    static var tools: [AgentTool] {
        [
            FileTools.readFile(),
            FileTools.writeFile(),
            WebTools.webSearch(),
            WebTools.webFetch(),
        ]
    }

    static func context(for book: Book) -> String {
        """
        You are researching "\(book.title)" by \(book.author).
        Save findings to Documents/Research/\(book.id)/
        """
    }
}

struct ChatAgent {
    static var tools: [AgentTool] {
        [
            FileTools.readFile(),
            FileTools.writeFile(),
            BookTools.readLibrary(),
            BookTools.publishToFeed(),  // Chat can publish directly
            WebTools.webSearch(),
        ]
    }

    static func context(library: [Book]) -> String {
        """
        You help the user with their reading.
        Available books: \(library.map { $0.title }.joined(separator: ", "))
        """
    }
}
```

**Benefits（收益）：**
- 所有 agent types 共享 consistent lifecycle management
- Automatic checkpoint/resume（对 mobile 很 critical）
- Shared tool protocol（共享 tool 协议）
- 容易添加 new agent types
- Centralized error handling and logging（集中式 error handling 和 logging）
</pattern>

<pattern name="agent-to-ui-communication">
## Agent-to-UI Communication（Agent 到 UI 通信）

当 agents 执行 actions 时，UI 应立即 reflect。user 应该看到 agent 做了什么。

**Pattern 1：Shared Data Store（推荐）**

Agent 通过 UI observe 的同一个 service 写入：

```swift
// Shared service
class BookLibraryService: ObservableObject {
    static let shared = BookLibraryService()
    @Published var books: [Book] = []
    @Published var feedItems: [FeedItem] = []

    func addFeedItem(_ item: FeedItem) {
        feedItems.append(item)
        persist()
    }
}

// Agent tool writes through shared service
tool("publish_to_feed", async ({ bookId, content, headline }) => {
    let item = FeedItem(bookId: bookId, content: content, headline: headline)
    BookLibraryService.shared.addFeedItem(item)  // Same service UI uses
    return { text: "Published to feed" }
})

// UI observes the same service
struct FeedView: View {
    @StateObject var library = BookLibraryService.shared

    var body: some View {
        List(library.feedItems) { item in
            FeedItemRow(item: item)
            // Automatically updates when agent adds items
        }
    }
}
```

**Pattern 2：File System Observation（文件系统观察）**

对 file-based data，watch file system：

```swift
class ResearchWatcher: ObservableObject {
    @Published var files: [URL] = []
    private var watcher: DirectoryWatcher?

    func watch(bookId: String) {
        let path = documentsURL.appendingPathComponent("Research/\(bookId)")

        watcher = DirectoryWatcher(path: path) { [weak self] in
            self?.reload(from: path)
        }

        reload(from: path)
    }
}

// Agent writes files
tool("write_file", { path, content }) -> {
    writeFile(documentsURL.appendingPathComponent(path), content)
    // DirectoryWatcher triggers UI update automatically
}
```

**Pattern 3：Event Bus（跨 Component）**

用于有多个 independent components 的 complex apps：

```typescript
// Shared event bus
const agentEvents = new EventEmitter();

// Agent tool emits events
tool("publish_to_feed", async ({ content }) => {
    const item = await feedService.add(content);
    agentEvents.emit('feed:new-item', item);
    return { text: "Published" };
});

// UI components subscribe
function FeedView() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const handler = (item) => setItems(prev => [...prev, item]);
        agentEvents.on('feed:new-item', handler);
        return () => agentEvents.off('feed:new-item', handler);
    }, []);

    return <FeedList items={items} />;
}
```

**What to avoid（要避免的做法）：**

```swift
// BAD: UI doesn't observe agent changes
// Agent writes to database directly
tool("publish_to_feed", { content }) {
    database.insert("feed", content)  // UI doesn't see this
}

// UI loads once at startup, never refreshes
struct FeedView: View {
    let items = database.query("feed")  // Stale!
}
```
</pattern>

<pattern name="model-tier-selection">
## Model Tier Selection（Model 层级选择）

不同 agents 需要不同 intelligence levels。使用能达成 outcome 的最便宜 model。

| Agent Type（Agent 类型） | Recommended Tier（推荐层级） | Reasoning（理由） |
|------------|-----------------|-----------|
| Chat/Conversation | Balanced | Fast responses，good reasoning |
| Research | Balanced | Tool loops，不是 ultra-complex synthesis |
| Content Generation | Balanced | Creative，但不是 synthesis-heavy |
| Complex Analysis | Powerful | Multi-document synthesis，nuanced judgment |
| Profile/Onboarding | Powerful | Photo analysis，complex pattern recognition |
| Simple Queries | Fast/Haiku | Quick lookups，simple transformations |

**Implementation（实现）：**

```swift
enum ModelTier {
    case fast      // claude-3-haiku: Quick, cheap, simple tasks
    case balanced  // claude-3-sonnet: Good balance for most tasks
    case powerful  // claude-3-opus: Complex reasoning, synthesis
}

struct AgentConfig {
    let modelTier: ModelTier
    let tools: [AgentTool]
    let systemPrompt: String
}

// Research agent: balanced tier
let researchConfig = AgentConfig(
    modelTier: .balanced,
    tools: researchTools,
    systemPrompt: researchPrompt
)

// Profile analysis: powerful tier (complex photo interpretation)
let profileConfig = AgentConfig(
    modelTier: .powerful,
    tools: profileTools,
    systemPrompt: profilePrompt
)

// Quick lookup: fast tier
let lookupConfig = AgentConfig(
    modelTier: .fast,
    tools: [readLibrary],
    systemPrompt: "Answer quick questions about the user's library."
)
```

**Cost optimization strategies（成本优化策略）：**
- 从 balanced tier 开始，只有 quality insufficient 时才 upgrade
- 对每 turn 很简单的 tool-heavy loops 使用 fast tier
- 将 powerful tier 留给 synthesis tasks（comparing multiple sources）
- 考虑 per turn token limits 来控制 costs
</pattern>

<design_questions>
## Questions to Ask When Designing（设计时要问的问题）

1. **哪些 events trigger agent turns？**（messages、webhooks、timers、user requests）
2. **agent 需要哪些 primitives？**（read、write、call API、restart）
3. **哪些 decisions 应由 agent 做？**（format、structure、priority、action）
4. **哪些 decisions 应 hardcoded？**（security boundaries、approval requirements）
5. **agent 如何 verify its work？**（health checks、build verification）
6. **agent 如何从 mistakes 中 recover？**（git rollback、approval gates）
7. **UI 如何知道 agent 改变了 state？**（shared store、file watching、events）
8. **每种 agent type 需要什么 model tier？**（fast、balanced、powerful）
9. **agents 如何共享 infrastructure？**（unified orchestrator、shared tools）
</design_questions>
