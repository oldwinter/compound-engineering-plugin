<overview>
如何将 dynamic runtime context 注入 agent system prompts。agent 需要知道 app 中存在什么，才知道自己能处理什么。Static prompts 不够；agent 需要看到与用户相同的 context。

**Core principle：** 用户的 context 就是 agent 的 context。
</overview>

<why_context_matters>
## 为什么需要 Dynamic Context Injection？

static system prompt 告诉 agent 它 CAN 做什么。Dynamic context 告诉它基于用户 actual data，它 RIGHT NOW 能做什么。

**Failure case（失败案例）：**
```
User: "Write a little thing about Catherine the Great in my reading feed"
Agent: "What system are you referring to? I'm not sure what reading feed means."
```

agent 失败是因为它不知道：
- 用户 library 中有哪些 books
- "reading feed" 是什么
- 它有哪些 tools 可以 publish 到那里

**The fix（修复方式）：** 将关于 app state 的 runtime context 注入 system prompt。
</why_context_matters>

<pattern name="context-injection">
## The Context Injection Pattern（Context 注入模式）

动态构建 system prompt，并包含 current app state：

```swift
func buildSystemPrompt() -> String {
    // Gather current state
    let availableBooks = libraryService.books
    let recentActivity = analysisService.recentRecords(limit: 10)
    let userProfile = profileService.currentProfile

    return """
    # Your Identity

    You are a reading assistant for \(userProfile.name)'s library.

    ## Available Books in User's Library

    \(availableBooks.map { "- \"\($0.title)\" by \($0.author) (id: \($0.id))" }.joined(separator: "\n"))

    ## Recent Reading Activity

    \(recentActivity.map { "- Analyzed \"\($0.bookTitle)\": \($0.excerptPreview)" }.joined(separator: "\n"))

    ## Your Capabilities

    - **publish_to_feed**: Create insights that appear in the Feed tab
    - **read_library**: View books, highlights, and analyses
    - **web_search**: Search the internet for research
    - **write_file**: Save research to Documents/Research/{bookId}/

    When the user mentions "the feed" or "reading feed", they mean the Feed tab
    where insights appear. Use `publish_to_feed` to create content there.
    """
}
```
</pattern>

<what_to_inject>
## 注入哪些 Context

### 1. Available Resources（可用资源）
agent 可以访问哪些 data/files？

```swift
## Available in User's Library

Books:
- "Moby Dick" by Herman Melville (id: book_123)
- "1984" by George Orwell (id: book_456)

Research folders:
- Documents/Research/book_123/ (3 files)
- Documents/Research/book_456/ (1 file)
```

### 2. Current State（当前状态）
用户最近做了什么？current context 是什么？

```swift
## Recent Activity

- 2 hours ago: Highlighted passage in "1984" about surveillance
- Yesterday: Completed research on "Moby Dick" whale symbolism
- This week: Added 3 new books to library
```

### 3. Capabilities Mapping（能力映射）
哪些 tool 映射到哪些 UI feature？使用用户的 language。

```swift
## What You Can Do

| User Says | You Should Use | Result |
|-----------|----------------|--------|
| "my feed" / "reading feed" | `publish_to_feed` | Creates insight in Feed tab |
| "my library" / "my books" | `read_library` | Shows their book collection |
| "research this" | `web_search` + `write_file` | Saves to Research folder |
| "my profile" | `read_file("profile.md")` | Shows reading profile |
```

### 4. Domain Vocabulary（领域词汇）
解释用户可能使用的 app-specific terms。

```swift
## Vocabulary

- **Feed**: The Feed tab showing reading insights and analyses
- **Research folder**: Documents/Research/{bookId}/ where research is stored
- **Reading profile**: A markdown file describing user's reading preferences
- **Highlight**: A passage the user marked in a book
```
</what_to_inject>

<implementation_patterns>
## Implementation Patterns（实现模式）

### Pattern 1：Service-Based Injection（基于 Service 的注入，Swift/iOS）

```swift
class AgentContextBuilder {
    let libraryService: BookLibraryService
    let profileService: ReadingProfileService
    let activityService: ActivityService

    func buildContext() -> String {
        let books = libraryService.books
        let profile = profileService.currentProfile
        let activity = activityService.recent(limit: 10)

        return """
        ## Library (\(books.count) books)
        \(formatBooks(books))

        ## Profile
        \(profile.summary)

        ## Recent Activity
        \(formatActivity(activity))
        """
    }

    private func formatBooks(_ books: [Book]) -> String {
        books.map { "- \"\($0.title)\" (id: \($0.id))" }.joined(separator: "\n")
    }
}

// Usage in agent initialization
let context = AgentContextBuilder(
    libraryService: .shared,
    profileService: .shared,
    activityService: .shared
).buildContext()

let systemPrompt = basePrompt + "\n\n" + context
```

### Pattern 2：Hook-Based Injection（基于 Hook 的注入，TypeScript）

```typescript
interface ContextProvider {
  getContext(): Promise<string>;
}

class LibraryContextProvider implements ContextProvider {
  async getContext(): Promise<string> {
    const books = await db.books.list();
    const recent = await db.activity.recent(10);

    return `
## Library
${books.map(b => `- "${b.title}" (${b.id})`).join('\n')}

## Recent
${recent.map(r => `- ${r.description}`).join('\n')}
    `.trim();
  }
}

// Compose multiple providers
async function buildSystemPrompt(providers: ContextProvider[]): Promise<string> {
  const contexts = await Promise.all(providers.map(p => p.getContext()));
  return [BASE_PROMPT, ...contexts].join('\n\n');
}
```

### Pattern 3：Template-Based Injection（基于 Template 的注入）

```markdown
# System Prompt Template (system-prompt.template.md)

You are a reading assistant.

## Available Books

{{#each books}}
- "{{title}}" by {{author}} (id: {{id}})
{{/each}}

## Capabilities

{{#each capabilities}}
- **{{name}}**: {{description}}
{{/each}}

## Recent Activity

{{#each recentActivity}}
- {{timestamp}}: {{description}}
{{/each}}
```

```typescript
// Render at runtime
const prompt = Handlebars.compile(template)({
  books: await libraryService.getBooks(),
  capabilities: getCapabilities(),
  recentActivity: await activityService.getRecent(10),
});
```
</implementation_patterns>

<context_freshness>
## Context Freshness（Context 新鲜度）

Context 应在 agent initialization 时注入，并可在 long sessions 中 optional refresh。

**At initialization（初始化时）：**
```swift
// Always inject fresh context when starting an agent
func startChatAgent() async -> AgentSession {
    let context = await buildCurrentContext()  // Fresh context
    return await AgentOrchestrator.shared.startAgent(
        config: ChatAgent.config,
        systemPrompt: basePrompt + context
    )
}
```

**During long sessions（长 session 期间，可选）：**
```swift
// For long-running agents, provide a refresh tool
tool("refresh_context", "Get current app state") { _ in
    let books = libraryService.books
    let recent = activityService.recent(10)
    return """
    Current library: \(books.count) books
    Recent: \(recent.map { $0.summary }.joined(separator: ", "))
    """
}
```

**What NOT to do（不要这样做）：**
```swift
// DON'T: Use stale context from app launch
let cachedContext = appLaunchContext  // Stale!
// Books may have been added, activity may have changed
```
</context_freshness>

<examples>
## Real-World Example: Every Reader（真实示例：Every Reader）

Every Reader app 会为其 chat agent 注入 context：

```swift
func getChatAgentSystemPrompt() -> String {
    // Get current library state
    let books = BookLibraryService.shared.books
    let analyses = BookLibraryService.shared.analysisRecords.prefix(10)
    let profile = ReadingProfileService.shared.getProfileForSystemPrompt()

    let bookList = books.map { book in
        "- \"\(book.title)\" by \(book.author) (id: \(book.id))"
    }.joined(separator: "\n")

    let recentList = analyses.map { record in
        let title = books.first { $0.id == record.bookId }?.title ?? "Unknown"
        return "- From \"\(title)\": \"\(record.excerptPreview)\""
    }.joined(separator: "\n")

    return """
    # Reading Assistant

    You help the user with their reading and book research.

    ## Available Books in User's Library

    \(bookList.isEmpty ? "No books yet." : bookList)

    ## Recent Reading Journal (Latest Analyses)

    \(recentList.isEmpty ? "No analyses yet." : recentList)

    ## Reading Profile

    \(profile)

    ## Your Capabilities

    - **Publish to Feed**: Create insights using `publish_to_feed` that appear in the Feed tab
    - **Library Access**: View books and highlights using `read_library`
    - **Research**: Search web and save to Documents/Research/{bookId}/
    - **Profile**: Read/update the user's reading profile

    When the user asks you to "write something for their feed" or "add to my reading feed",
    use the `publish_to_feed` tool with the relevant book_id.
    """
}
```

**Result：** 当用户说 "write a little thing about Catherine the Great in my reading feed" 时，agent：
1. 看到 "reading feed" → 知道使用 `publish_to_feed`
2. 看到 available books → 找到 relevant book ID
3. 为 Feed tab 创建 appropriate content
</examples>

<checklist>
## Context Injection Checklist（Context 注入检查清单）

launch agent 前：
- [ ] System prompt 包含 current resources（books、files、data）
- [ ] Recent activity 对 agent 可见
- [ ] Capabilities 已映射到 user vocabulary
- [ ] Domain-specific terms 已解释
- [ ] Context 是 fresh 的（agent start 时 gathered，不是 cached）

添加 new features 时：
- [ ] New resources 已纳入 context injection
- [ ] New capabilities 已记录到 system prompt
- [ ] feature 的 user vocabulary 已映射
</checklist>
