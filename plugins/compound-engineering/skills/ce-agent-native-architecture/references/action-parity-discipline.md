<overview>
一种 structured discipline，用来确保 agents 能做 users 能做的一切。每个 UI action 都应该有一个 equivalent agent tool。这不是一次性检查，而是集成到 development workflow 中的 ongoing practice。

**Core principle：** 添加 UI feature 时，在同一个 PR 中添加 corresponding tool。
</overview>

<why_parity>
## Why Action Parity Matters（为什么 Action Parity 重要）

**Failure case（失败案例）：**
```
User: "Write something about Catherine the Great in my reading feed"
Agent: "What system are you referring to? I'm not sure what reading feed means."
```

用户可以通过 UI publish 到自己的 feed。但 agent 没有 `publish_to_feed` tool。fix 很简单：添加 tool。但这个 insight 很深：

**用户能通过 UI 执行的每个 action，都必须有 agent 可调用的 equivalent tool。**

缺少这种 parity 时：
- Users 会要求 agents 做它们做不到的事
- Agents 会对本该理解的 features 提澄清问题
- agent 相比 direct app usage 显得受限
- Users 会失去对 agent capabilities 的信任
</why_parity>

<capability_mapping>
## The Capability Map（能力地图）

维护一张从 UI actions 到 agent tools 的 structured map：

| UI Action | UI Location | Agent Tool | System Prompt Reference |
|-----------|-------------|------------|-------------------------|
| View library | Library tab | `read_library` | "View books and highlights" |
| Add book | Library → Add | `add_book` | "Add books to library" |
| Publish insight | Analysis view | `publish_to_feed` | "Create insights for Feed tab" |
| Start research | Book detail | `start_research` | "Research books via web search" |
| Edit profile | Settings | `write_file(profile.md)` | "Update reading profile" |
| Take screenshot | Camera | N/A (user action) | — |
| Search web | Chat | `web_search` | "Search the internet" |

**每次添加 features 时都更新这张表。**

### Template for Your App（你的 App 模板）

```markdown
# Capability Map - [Your App Name]

| UI Action | UI Location | Agent Tool | System Prompt | Status |
|-----------|-------------|------------|---------------|--------|
| | | | | ⚠️ Missing |
| | | | | ✅ Done |
| | | | | 🚫 N/A |
```

Status meanings（状态含义）：
- ✅ Done：Tool 已存在，且已在 system prompt 中 documented
- ⚠️ Missing：UI action 存在，但没有 agent equivalent
- 🚫 N/A：User-only action（例如 biometric auth、camera capture）
</capability_mapping>

<parity_workflow>
## The Action Parity Workflow（Action Parity 工作流）

### When Adding a New Feature（添加新 Feature 时）

merge 任何添加 UI functionality 的 PR 前：

```
1. What action is this?
   → "User can publish an insight to their reading feed"

2. Does an agent tool exist for this?
   → Check tool definitions
   → If NO: Create the tool

3. Is it documented in the system prompt?
   → Check system prompt capabilities section
   → If NO: Add documentation

4. Is the context available?
   → Does agent know what "feed" means?
   → Does agent see available books?
   → If NO: Add to context injection

5. Update the capability map
   → Add row to tracking document
```

### PR Checklist（PR 检查清单）

添加到你的 PR template：

```markdown
## Agent-Native Checklist（Agent-Native 检查清单）

- [ ] Every new UI action has a corresponding agent tool
- [ ] System prompt updated to mention new capability
- [ ] Agent has access to same data UI uses
- [ ] Capability map updated
- [ ] Tested with natural language request
```
</parity_workflow>

<parity_audit>
## The Parity Audit（Parity 审计）

定期 audit app 中的 action parity gaps：

### Step 1: List All UI Actions（列出所有 UI Actions）

遍历每个 screen，列出 users 可以做什么：

```
Library Screen:
- View list of books
- Search books
- Filter by category
- Add new book
- Delete book
- Open book detail

Book Detail Screen:
- View book info
- Start research
- View highlights
- Add highlight
- Share book
- Remove from library

Feed Screen:
- View insights
- Create new insight
- Edit insight
- Delete insight
- Share insight

Settings:
- Edit profile
- Change theme
- Export data
- Delete account
```

### Step 2: Check Tool Coverage（检查 Tool 覆盖）

对每个 action，verify：

```
✅ View list of books      → read_library
✅ Search books            → read_library (with query param)
⚠️ Filter by category     → MISSING (add filter param to read_library)
⚠️ Add new book           → MISSING (need add_book tool)
✅ Delete book             → delete_book
✅ Open book detail        → read_library (single book)

✅ Start research          → start_research
✅ View highlights         → read_library (includes highlights)
⚠️ Add highlight          → MISSING (need add_highlight tool)
⚠️ Share book             → MISSING (or N/A if sharing is UI-only)

✅ View insights           → read_library (includes feed)
✅ Create new insight      → publish_to_feed
⚠️ Edit insight           → MISSING (need update_feed_item tool)
⚠️ Delete insight         → MISSING (need delete_feed_item tool)
```

### Step 3: Prioritize Gaps（确定 Gaps 优先级）

不是所有 gaps 都一样：

**High priority（users 会要求这个）：**
- Add new book（添加新书）
- Create/edit/delete content（创建、编辑、删除内容）
- Core workflow actions（核心 workflow actions）

**Medium priority（中优先级，occasional requests）：**
- Filter/search variations（过滤/搜索变体）
- Export functionality（导出功能）
- Sharing features（分享功能）

**Low priority（很少通过 agent 请求）：**
- Theme changes（主题变更）
- Account deletion（账户删除）
- 属于 UI-preference 的 settings
</parity_audit>

<tool_design_for_parity>
## Designing Tools for Parity（为 Parity 设计 Tools）

### Match Tool Granularity to UI Granularity（让 Tool 粒度匹配 UI 粒度）

如果 UI 对 "Edit" 和 "Delete" 有 separate buttons，考虑 separate tools：

```typescript
// Matches UI granularity
tool("update_feed_item", { id, content, headline }, ...);
tool("delete_feed_item", { id }, ...);

// vs. combined (harder for agent to discover)
tool("modify_feed_item", { id, action: "update" | "delete", ... }, ...);
```

### Use User Vocabulary in Tool Names（在 Tool 名中使用用户词汇）

```typescript
// Good: Matches what users say
tool("publish_to_feed", ...);  // "publish to my feed"
tool("add_book", ...);         // "add this book"
tool("start_research", ...);   // "research this"

// Bad: Technical jargon
tool("create_analysis_record", ...);
tool("insert_library_item", ...);
tool("initiate_web_scrape_workflow", ...);
```

### Return What the UI Shows（返回 UI 展示的内容）

如果 UI 显示带 details 的 confirmation，tool 也应该如此：

```typescript
// UI shows: "Added 'Moby Dick' to your library"
// Tool should return the same:
tool("add_book", async ({ title, author }) => {
  const book = await library.add({ title, author });
  return {
    text: `Added "${book.title}" by ${book.author} to your library (id: ${book.id})`
  };
});
```
</tool_design_for_parity>

<context_parity>
## Context Parity（上下文对等）

无论用户看到什么，agent 都应该能够 access。

### The Problem（问题）

```swift
// UI shows recent analyses in a list
ForEach(analysisRecords) { record in
    AnalysisRow(record: record)
}

// But system prompt only mentions books, not analyses
let systemPrompt = """
## Available Books
\(books.map { $0.title })
// Missing: recent analyses!
"""
```

用户能看到自己的 reading journal。agent 看不到。这会造成 disconnect。

### The Fix（修复）

```swift
// System prompt includes what UI shows
let systemPrompt = """
## Available Books
\(books.map { "- \($0.title)" }.joined(separator: "\n"))

## Recent Reading Journal
\(analysisRecords.prefix(10).map { "- \($0.summary)" }.joined(separator: "\n"))
"""
```

### Context Parity Checklist（Context Parity 检查清单）

对 app 中每个 screen：
- [ ] 这个 screen 显示什么 data？
- [ ] 这些 data 是否对 agent available？
- [ ] agent 是否能 access 相同 detail level？
</context_parity>

<continuous_parity>
## Maintaining Parity Over Time（持续维护 Parity）

### Git Hooks / CI Checks（Git Hooks / CI 检查）

```bash
#!/bin/bash
# pre-commit hook: check for new UI actions without tools

# Find new SwiftUI Button/onTapGesture additions
NEW_ACTIONS=$(git diff --cached --name-only | xargs grep -l "Button\|onTapGesture")

if [ -n "$NEW_ACTIONS" ]; then
    echo "⚠️  New UI actions detected. Did you add corresponding agent tools?"
    echo "Files: $NEW_ACTIONS"
    echo ""
    echo "Checklist:"
    echo "  [ ] Agent tool exists for new action"
    echo "  [ ] System prompt documents new capability"
    echo "  [ ] Capability map updated"
fi
```

### Automated Parity Testing（自动化 Parity 测试）

```typescript
// parity.test.ts
describe('Action Parity', () => {
  const capabilityMap = loadCapabilityMap();

  for (const [action, toolName] of Object.entries(capabilityMap)) {
    if (toolName === 'N/A') continue;

    test(`${action} has agent tool: ${toolName}`, () => {
      expect(agentTools.map(t => t.name)).toContain(toolName);
    });

    test(`${toolName} is documented in system prompt`, () => {
      expect(systemPrompt).toContain(toolName);
    });
  }
});
```

### Regular Audits（定期审计）

安排 periodic reviews：

```markdown
## Monthly Parity Audit

1. Review 本月 merged 的所有 PRs
2. 检查每个 PR 是否新增 UI actions
3. Verify tool coverage
4. 更新 capability map
5. 用 natural language requests 测试
```
</continuous_parity>

<examples>
## Real Example：The Feed Gap（真实案例：Feed 缺口）

**Before：** Every Reader 有一个 feed 用来显示 insights，但没有 agent tool 可以 publish 到那里。

```
User: "Write something about Catherine the Great in my reading feed"
Agent: "I'm not sure what system you're referring to. Could you clarify?"
```

**Diagnosis（诊断）：**
- ✅ UI action：User can publish insights from the analysis view（User 可以从 analysis view 发布 insights）
- ❌ Agent tool：No `publish_to_feed` tool（没有 `publish_to_feed` tool）
- ❌ System prompt：No mention of "feed" or how to publish（没有提到 "feed" 或如何发布）
- ❌ Context：Agent didn't know what "feed" meant（Agent 不知道 "feed" 是什么）

**Fix：**

```swift
// 1. Add the tool
tool("publish_to_feed",
    "Publish an insight to the user's reading feed",
    {
        bookId: z.string().describe("Book ID"),
        content: z.string().describe("The insight content"),
        headline: z.string().describe("A punchy headline")
    },
    async ({ bookId, content, headline }) => {
        await feedService.publish({ bookId, content, headline });
        return { text: `Published "${headline}" to your reading feed` };
    }
);

// 2. Update system prompt
"""
## Your Capabilities

- **Publish to Feed**: Create insights that appear in the Feed tab using `publish_to_feed`.
  Include a book_id, content, and a punchy headline.
"""

// 3. Add to context injection
"""
When the user mentions "the feed" or "reading feed", they mean the Feed tab
where insights appear. Use `publish_to_feed` to create content there.
"""
```

**After（之后）：**
```
User: "Write something about Catherine the Great in my reading feed"
Agent: [Uses publish_to_feed to create insight]
       "Done! I've published 'The Enlightened Empress' to your reading feed."
```
</examples>

<checklist>
## Action Parity Checklist（Action Parity 检查清单）

对每个带 UI changes 的 PR：
- [ ] Listed all new UI actions（列出所有新的 UI actions）
- [ ] Verified agent tool exists for each action（确认每个 action 都有 agent tool）
- [ ] Updated system prompt with new capabilities（用新 capabilities 更新 system prompt）
- [ ] Added to capability map（添加到 capability map）
- [ ] Tested with natural language request（用 natural language request 测试）

对 periodic audits：
- [ ] Walked through every screen（走查每个 screen）
- [ ] Listed all possible user actions（列出所有可能的 user actions）
- [ ] Checked tool coverage for each（检查每个 action 的 tool coverage）
- [ ] Prioritized gaps by likelihood of user request（按用户请求可能性为 gaps 排序）
- [ ] Created issues for high-priority gaps（为 high-priority gaps 创建 issues）
</checklist>
