<overview>
Testing agent-native apps 需要不同于 traditional unit testing 的 approaches。你测试的是 agent 是否达成 outcomes，而不是它是否调用了 specific functions。本 guide 提供 concrete testing patterns，用来验证你的 app 是否真正 agent-native。
</overview>

<testing_philosophy>
## Testing Philosophy（测试理念）

### Test Outcomes, Not Procedures（测试 outcomes，而不是 procedures）

**Traditional（procedure-focused，面向 procedure）：**
```typescript
// Testing that a specific function was called with specific args
expect(mockProcessFeedback).toHaveBeenCalledWith({
  message: "Great app!",
  category: "praise",
  priority: 2
});
```

**Agent-native（outcome-focused，面向 outcome）：**
```typescript
// Testing that the outcome was achieved
const result = await agent.process("Great app!");
const storedFeedback = await db.feedback.getLatest();

expect(storedFeedback.content).toContain("Great app");
expect(storedFeedback.importance).toBeGreaterThanOrEqual(1);
expect(storedFeedback.importance).toBeLessThanOrEqual(5);
// We don't care exactly how it categorized—just that it's reasonable
```

### Accept Variability（接受可变性）

Agents 每次可能用不同方式 solve problems。你的 tests 应该：
- Verify end state，而不是 path
- 接受 reasonable ranges，而不是 exact values
- 检查 required elements 是否存在，而不是 exact format
</testing_philosophy>

<can_agent_do_it_test>
## The "Can Agent Do It?" Test（Agent 能做到吗测试）

对每个 UI feature，写一个 test prompt 并 verify agent 能完成它。

### Template（模板）

```typescript
describe('Agent Capability Tests', () => {
  test('Agent can add a book to library', async () => {
    const result = await agent.chat("Add 'Moby Dick' by Herman Melville to my library");

    // Verify outcome
    const library = await libraryService.getBooks();
    const mobyDick = library.find(b => b.title.includes("Moby Dick"));

    expect(mobyDick).toBeDefined();
    expect(mobyDick.author).toContain("Melville");
  });

  test('Agent can publish to feed', async () => {
    // Setup: ensure a book exists
    await libraryService.addBook({ id: "book_123", title: "1984" });

    const result = await agent.chat("Write something about surveillance themes in my feed");

    // Verify outcome
    const feed = await feedService.getItems();
    const newItem = feed.find(item => item.bookId === "book_123");

    expect(newItem).toBeDefined();
    expect(newItem.content.toLowerCase()).toMatch(/surveillance|watching|control/);
  });

  test('Agent can search and save research', async () => {
    await libraryService.addBook({ id: "book_456", title: "Moby Dick" });

    const result = await agent.chat("Research whale symbolism in Moby Dick");

    // Verify files were created
    const files = await fileService.listFiles("Research/book_456/");
    expect(files.length).toBeGreaterThan(0);

    // Verify content is relevant
    const content = await fileService.readFile(files[0]);
    expect(content.toLowerCase()).toMatch(/whale|symbolism|melville/);
  });
});
```

### The "Write to Location" Test（写入指定位置测试）

一个关键 litmus test：agent 能否在 specific app locations 中创建 content？

```typescript
describe('Location Awareness Tests', () => {
  const locations = [
    { userPhrase: "my reading feed", expectedTool: "publish_to_feed" },
    { userPhrase: "my library", expectedTool: "add_book" },
    { userPhrase: "my research folder", expectedTool: "write_file" },
    { userPhrase: "my profile", expectedTool: "write_file" },
  ];

  for (const { userPhrase, expectedTool } of locations) {
    test(`Agent knows how to write to "${userPhrase}"`, async () => {
      const prompt = `Write a test note to ${userPhrase}`;
      const result = await agent.chat(prompt);

      // Check that agent used the right tool (or achieved the outcome)
      expect(result.toolCalls).toContainEqual(
        expect.objectContaining({ name: expectedTool })
      );

      // Or verify outcome directly
      // expect(await locationHasNewContent(userPhrase)).toBe(true);
    });
  }
});
```
</can_agent_do_it_test>

<surprise_test>
## The "Surprise Test"（惊喜测试）

设计良好的 agent-native app 会让 agent 自己 figure out creative approaches。通过给出 open-ended requests 来测试这一点。

### The Test（测试）

```typescript
describe('Agent Creativity Tests', () => {
  test('Agent can handle open-ended requests', async () => {
    // Setup: user has some books
    await libraryService.addBook({ id: "1", title: "1984", author: "Orwell" });
    await libraryService.addBook({ id: "2", title: "Brave New World", author: "Huxley" });
    await libraryService.addBook({ id: "3", title: "Fahrenheit 451", author: "Bradbury" });

    // Open-ended request
    const result = await agent.chat("Help me organize my reading for next month");

    // The agent should do SOMETHING useful
    // We don't specify exactly what—that's the point
    expect(result.toolCalls.length).toBeGreaterThan(0);

    // It should have engaged with the library
    const libraryTools = ["read_library", "write_file", "publish_to_feed"];
    const usedLibraryTool = result.toolCalls.some(
      call => libraryTools.includes(call.name)
    );
    expect(usedLibraryTool).toBe(true);
  });

  test('Agent finds creative solutions', async () => {
    // Don't specify HOW to accomplish the task
    const result = await agent.chat(
      "I want to understand the dystopian themes across my sci-fi books"
    );

    // Agent might:
    // - Read all books and create a comparison document
    // - Research dystopian literature and relate it to user's books
    // - Create a mind map in a markdown file
    // - Publish a series of insights to the feed

    // We just verify it did something substantive
    expect(result.response.length).toBeGreaterThan(100);
    expect(result.toolCalls.length).toBeGreaterThan(0);
  });
});
```

### What Failure Looks Like（失败长什么样）

```typescript
// FAILURE: Agent can only say it can't do that
const result = await agent.chat("Help me prepare for a book club discussion");

// Bad outcome:
expect(result.response).not.toContain("I can't");
expect(result.response).not.toContain("I don't have a tool");
expect(result.response).not.toContain("Could you clarify");

// If the agent asks for clarification on something it should understand,
// you have a context injection or capability gap
```
</surprise_test>

<parity_testing>
## Automated Parity Testing（自动化 Parity 测试）

确保每个 UI action 都有 agent equivalent。

### Capability Map Testing（Capability Map 测试）

```typescript
// capability-map.ts
export const capabilityMap = {
  // UI Action: Agent Tool
  "View library": "read_library",
  "Add book": "add_book",
  "Delete book": "delete_book",
  "Publish insight": "publish_to_feed",
  "Start research": "start_research",
  "View highlights": "read_library",  // same tool, different query
  "Edit profile": "write_file",
  "Search web": "web_search",
  "Export data": "N/A",  // UI-only action
};

// parity.test.ts
import { capabilityMap } from './capability-map';
import { getAgentTools } from './agent-config';
import { getSystemPrompt } from './system-prompt';

describe('Action Parity', () => {
  const agentTools = getAgentTools();
  const systemPrompt = getSystemPrompt();

  for (const [uiAction, toolName] of Object.entries(capabilityMap)) {
    if (toolName === 'N/A') continue;

    test(`"${uiAction}" has agent tool: ${toolName}`, () => {
      const toolNames = agentTools.map(t => t.name);
      expect(toolNames).toContain(toolName);
    });

    test(`${toolName} is documented in system prompt`, () => {
      expect(systemPrompt).toContain(toolName);
    });
  }
});
```

### Context Parity Testing（Context Parity 测试）

```typescript
describe('Context Parity', () => {
  test('Agent sees all data that UI shows', async () => {
    // Setup: create some data
    await libraryService.addBook({ id: "1", title: "Test Book" });
    await feedService.addItem({ id: "f1", content: "Test insight" });

    // Get system prompt (which includes context)
    const systemPrompt = await buildSystemPrompt();

    // Verify data is included
    expect(systemPrompt).toContain("Test Book");
    expect(systemPrompt).toContain("Test insight");
  });

  test('Recent activity is visible to agent', async () => {
    // Perform some actions
    await activityService.log({ action: "highlighted", bookId: "1" });
    await activityService.log({ action: "researched", bookId: "2" });

    const systemPrompt = await buildSystemPrompt();

    // Verify activity is included
    expect(systemPrompt).toMatch(/highlighted|researched/);
  });
});
```
</parity_testing>

<integration_testing>
## Integration Testing（集成测试）

测试从 user request 到 outcome 的 full flow（完整流程）。

### End-to-End Flow Tests（端到端 Flow 测试）

```typescript
describe('End-to-End Flows', () => {
  test('Research flow: request → web search → file creation', async () => {
    // Setup
    const bookId = "book_123";
    await libraryService.addBook({ id: bookId, title: "Moby Dick" });

    // User request
    await agent.chat("Research the historical context of whaling in Moby Dick");

    // Verify: web search was performed
    const searchCalls = mockWebSearch.mock.calls;
    expect(searchCalls.length).toBeGreaterThan(0);
    expect(searchCalls.some(call =>
      call[0].query.toLowerCase().includes("whaling")
    )).toBe(true);

    // Verify: files were created
    const researchFiles = await fileService.listFiles(`Research/${bookId}/`);
    expect(researchFiles.length).toBeGreaterThan(0);

    // Verify: content is relevant
    const content = await fileService.readFile(researchFiles[0]);
    expect(content.toLowerCase()).toMatch(/whale|whaling|nantucket|melville/);
  });

  test('Publish flow: request → tool call → feed update → UI reflects', async () => {
    // Setup
    await libraryService.addBook({ id: "book_1", title: "1984" });

    // Initial state
    const feedBefore = await feedService.getItems();

    // User request
    await agent.chat("Write something about Big Brother for my reading feed");

    // Verify feed updated
    const feedAfter = await feedService.getItems();
    expect(feedAfter.length).toBe(feedBefore.length + 1);

    // Verify content
    const newItem = feedAfter.find(item =>
      !feedBefore.some(old => old.id === item.id)
    );
    expect(newItem).toBeDefined();
    expect(newItem.content.toLowerCase()).toMatch(/big brother|surveillance|watching/);
  });
});
```

### Failure Recovery Tests（失败恢复测试）

```typescript
describe('Failure Recovery', () => {
  test('Agent handles missing book gracefully', async () => {
    const result = await agent.chat("Tell me about 'Nonexistent Book'");

    // Agent should not crash
    expect(result.error).toBeUndefined();

    // Agent should acknowledge the issue
    expect(result.response.toLowerCase()).toMatch(
      /not found|don't see|can't find|library/
    );
  });

  test('Agent recovers from API failure', async () => {
    // Mock API failure
    mockWebSearch.mockRejectedValueOnce(new Error("Network error"));

    const result = await agent.chat("Research this topic");

    // Agent should handle gracefully
    expect(result.error).toBeUndefined();
    expect(result.response).not.toContain("unhandled exception");

    // Agent should communicate the issue
    expect(result.response.toLowerCase()).toMatch(
      /couldn't search|unable to|try again/
    );
  });
});
```
</integration_testing>

<snapshot_testing>
## Snapshot Testing for System Prompts（System Prompts 快照测试）

随时间 track system prompts 和 context injection 的 changes。

```typescript
describe('System Prompt Stability', () => {
  test('System prompt structure matches snapshot', async () => {
    const systemPrompt = await buildSystemPrompt();

    // Extract structure (removing dynamic data)
    const structure = systemPrompt
      .replace(/id: \w+/g, 'id: [ID]')
      .replace(/"[^"]+"/g, '"[TITLE]"')
      .replace(/\d{4}-\d{2}-\d{2}/g, '[DATE]');

    expect(structure).toMatchSnapshot();
  });

  test('All capability sections are present', async () => {
    const systemPrompt = await buildSystemPrompt();

    const requiredSections = [
      "Your Capabilities",
      "Available Books",
      "Recent Activity",
    ];

    for (const section of requiredSections) {
      expect(systemPrompt).toContain(section);
    }
  });
});
```
</snapshot_testing>

<manual_testing>
## Manual Testing Checklist（手动测试检查清单）

有些东西最好在 development 中 manually testing：

### Natural Language Variation Test（自然语言变体测试）

对同一个 request 尝试多种 phrasings：

```
"Add this to my feed"
"Write something in my reading feed"
"Publish an insight about this"
"Put this in the feed"
"I want this in my feed"
```

如果 context injection 正确，它们都应该能工作。

### Edge Case Prompts（边界情况 Prompts）

```
"What can you do?"
→ Agent should describe capabilities

"Help me with my books"
→ Agent should engage with library, not ask what "books" means

"Write something"
→ Agent should ask WHERE (feed, file, etc.) if not clear

"Delete everything"
→ Agent should confirm before destructive actions
```

### Confusion Test（混淆测试）

询问那些应该存在、但可能未正确 connected 的东西：

```
"What's in my research folder?"
→ Should list files, not ask "what research folder?"

"Show me my recent reading"
→ Should show activity, not ask "what do you mean?"

"Continue where I left off"
→ Should reference recent activity if available
```
</manual_testing>

<ci_integration>
## CI/CD Integration（CI/CD 集成）

将 agent-native tests 添加到你的 CI pipeline：

```yaml
# .github/workflows/test.yml
name: Agent-Native Tests

on: [push, pull_request]

jobs:
  agent-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup
        run: npm install

      - name: Run Parity Tests
        run: npm run test:parity

      - name: Run Capability Tests
        run: npm run test:capabilities
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Check System Prompt Completeness
        run: npm run test:system-prompt

      - name: Verify Capability Map
        run: |
          # Ensure capability map is up to date
          npm run generate:capability-map
          git diff --exit-code capability-map.ts
```

### Cost-Aware Testing（成本感知测试）

Agent tests 会消耗 API tokens。管理策略：

```typescript
// Use smaller models for basic tests
const testConfig = {
  model: process.env.CI ? "claude-3-haiku" : "claude-3-opus",
  maxTokens: 500,  // Limit output length
};

// Cache responses for deterministic tests
const cachedAgent = new CachedAgent({
  cacheDir: ".test-cache",
  ttl: 24 * 60 * 60 * 1000,  // 24 hours
});

// Run expensive tests only on main branch
if (process.env.GITHUB_REF === 'refs/heads/main') {
  describe('Full Integration Tests', () => { ... });
}
```
</ci_integration>

<test_utilities>
## Test Utilities（测试工具）

### Agent Test Harness（Agent 测试 Harness）

```typescript
class AgentTestHarness {
  private agent: Agent;
  private mockServices: MockServices;

  async setup() {
    this.mockServices = createMockServices();
    this.agent = await createAgent({
      services: this.mockServices,
      model: "claude-3-haiku",  // Cheaper for tests
    });
  }

  async chat(message: string): Promise<AgentResponse> {
    return this.agent.chat(message);
  }

  async expectToolCall(toolName: string) {
    const lastResponse = this.agent.getLastResponse();
    expect(lastResponse.toolCalls.map(t => t.name)).toContain(toolName);
  }

  async expectOutcome(check: () => Promise<boolean>) {
    const result = await check();
    expect(result).toBe(true);
  }

  getState() {
    return {
      library: this.mockServices.library.getBooks(),
      feed: this.mockServices.feed.getItems(),
      files: this.mockServices.files.listAll(),
    };
  }
}

// Usage
test('full flow', async () => {
  const harness = new AgentTestHarness();
  await harness.setup();

  await harness.chat("Add 'Moby Dick' to my library");
  await harness.expectToolCall("add_book");
  await harness.expectOutcome(async () => {
    const state = harness.getState();
    return state.library.some(b => b.title.includes("Moby"));
  });
});
```
</test_utilities>

<checklist>
## Testing Checklist（测试检查清单）

Automated Tests（自动化测试）：
- [ ] 每个 UI action 都有 "Can Agent Do It?" tests
- [ ] Location awareness tests（位置感知测试，例如 "write to my feed"）
- [ ] Parity tests（对等性测试：tool exists，documented in prompt）
- [ ] Context parity tests（context 对等性测试：agent sees what UI shows）
- [ ] End-to-end flow tests（端到端 flow 测试）
- [ ] Failure recovery tests（失败恢复测试）

Manual Tests（手动测试）：
- [ ] Natural language variation（自然语言变体：multiple phrasings work）
- [ ] Edge case prompts（边界情况 prompts：open-ended requests）
- [ ] Confusion test（混淆测试：agent knows app vocabulary）
- [ ] Surprise test（惊喜测试：agent can be creative）

CI Integration（CI 集成）：
- [ ] Parity tests run on every PR（每个 PR 运行 parity tests）
- [ ] Capability tests run with API key（使用 API key 运行 capability tests）
- [ ] System prompt completeness check（system prompt 完整性检查）
- [ ] Capability map drift detection（capability map 漂移检测）
</checklist>
