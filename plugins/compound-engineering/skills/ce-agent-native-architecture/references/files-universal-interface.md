<overview>
Files 是 agent-native applications 的 universal interface。Agents 天然熟悉 file operations：它们已经知道如何 read、write 和 organize files。本文说明 files 为什么如此有效、如何组织它们，以及用于 accumulated knowledge 的 context.md pattern。
</overview>

<why_files>
## 为什么是 Files

Agents 天然擅长处理 files。Claude Code 能工作，是因为 bash + filesystem 是最 battle-tested 的 agent interface。构建 agent-native apps 时，要顺势利用这一点。

### Agents Already Know How（Agents 已经知道怎么做）

你不需要教 agent 你的 API；它已经知道 `cat`、`grep`、`mv`、`mkdir`。File operations 是它最熟悉的 primitives。

### Files Are Inspectable（Files 可检查）

Users 可以看到 agent 创建了什么、编辑它、移动它、删除它。没有 black box。agent behavior 完全透明。

### Files Are Portable（Files 可携带）

Export 很简单。Backup 很简单。Users 拥有自己的 data。没有 vendor lock-in，没有复杂 migration paths。

### App State Stays in Sync（App State 保持同步）

在 mobile 上，如果你结合 iCloud 使用 file system，所有 devices 共享同一个 file system。agent 在一台 device 上做的 work 会出现在所有 devices 上；你不必构建 server。

### Directory Structure Is Information Architecture（目录结构就是信息架构）

filesystem 免费提供 hierarchy。`/projects/acme/notes/` 有一种 `SELECT * FROM notes WHERE project_id = 123` 没有的 self-documenting 特性。
</why_files>

<file_organization>
## File Organization Patterns（文件组织 Patterns）

> **Needs validation：** 这些 conventions 是目前有效的一种 approach，不是 prescription。应继续考虑更好的 solutions。

agent-native design 的一个通用原则：**Design for what agents can reason about.** 最好的 proxy 是它对人类是否也说得通。如果 human 看你的 file structure 就能理解发生了什么，agent 大概率也能。

### Entity-Scoped Directories（按 Entity 定范围的目录）

围绕 entities 组织 files，而不是围绕 actors 或 file types：

```
{entity_type}/{entity_id}/
├── primary content
├── metadata
└── related materials
```

**Example：** `Research/books/{bookId}/` 包含一本 book 的所有内容：full text、notes、sources、agent logs。

### Naming Conventions（命名约定）

| File Type（文件类型） | Naming Pattern（命名模式） | Example（示例） |
|-----------|---------------|---------|
| Entity data | `{entity}.json` | `library.json`, `status.json` |
| Human-readable content | `{content_type}.md` | `introduction.md`, `profile.md` |
| Agent reasoning | `agent_log.md` | Per-entity agent history |
| Primary content | `full_text.txt` | Downloaded/extracted text |
| Multi-volume | `volume{N}.txt` | `volume1.txt`, `volume2.txt` |
| External sources | `{source_name}.md` | `wikipedia.md`, `sparknotes.md` |
| Checkpoints | `{sessionId}.checkpoint` | UUID-based |
| Configuration | `config.json` | Feature settings |

### Directory Naming（目录命名）

- **Entity-scoped：** `{entityType}/{entityId}/`（例如 `Research/books/{bookId}/`）
- **Type-scoped：** `{type}/`（例如 `AgentCheckpoints/`、`AgentLogs/`）
- **Convention：** lowercase with underscores，不用 camelCase

### Ephemeral vs. Durable Separation（临时与持久分离）

将 agent working files 与用户 permanent data 分开：

```
Documents/
├── AgentCheckpoints/     # Ephemeral (can delete)
│   └── {sessionId}.checkpoint
├── AgentLogs/            # Ephemeral (debugging)
│   └── {type}/{sessionId}.md
└── Research/             # Durable (user's work)
    └── books/{bookId}/
```

### The Split: Markdown vs JSON（Markdown 与 JSON 的分工）

- **Markdown：** 用于 users 可能 read 或 edit 的 content
- **JSON：** 用于 app queries 的 structured data
</file_organization>

<context_md_pattern>
## The context.md Pattern（context.md 模式）

agent 在每个 session 开始时读取、并随着学习持续更新的文件：

```markdown
# Context

## Who I Am
Reading assistant for the Every app.

## What I Know About This User
- Interested in military history and Russian literature
- Prefers concise analysis
- Currently reading War and Peace

## What Exists
- 12 notes in /notes
- 3 active projects
- User preferences at /preferences.md

## Recent Activity
- User created "Project kickoff" (2 hours ago)
- Analyzed passage about Austerlitz (yesterday)

## My Guidelines
- Don't spoil books they're reading
- Use their interests to personalize insights

## Current State
- No pending tasks
- Last sync: 10 minutes ago
```

### Benefits（收益）

- **Agent behavior evolves without code changes** - 更新 context，behavior 就会改变
- **Users can inspect and modify** - 完全透明
- **Natural place for accumulated context** - Learnings 跨 sessions 持久化
- **Portable across sessions** - restart agent 后，knowledge 仍保留

### How It Works（工作方式）

1. Agent 在 session start 读取 `context.md`
2. Agent 学到重要内容时更新它
3. System 也可以更新它（recent activity、new resources）
4. Context 跨 sessions 持久化

### What to Include（包含什么）

| Section（Section） | Purpose（用途） |
|---------|---------|
| Who I Am | Agent identity and role（Agent 身份与角色） |
| What I Know About This User | Learned preferences, interests（已学习到的偏好与兴趣） |
| What Exists | Available resources, data（可用资源与 data） |
| Recent Activity | continuity 所需 context |
| My Guidelines | Learned rules and constraints（已学习到的规则与 constraints） |
| Current State | Session status, pending items（Session 状态与 pending items） |
</context_md_pattern>

<files_vs_database>
## Files vs. Database（Files 与 Database）

> **Needs validation：** 这个 framing 受 mobile development 启发。对 web apps 来说，tradeoffs 不同。

| Use files for...（适合用 files） | Use database for...（适合用 database） |
|------------------|---------------------|
| users 应 read/edit 的 content | High-volume structured data |
| 受益于 version control 的 configuration | 需要 complex queries 的 data |
| Agent-generated content | Ephemeral state（sessions、caches） |
| 任何受益于 transparency 的内容 | 有 relationships 的 data |
| Large text content | 需要 indexing 的 data |

**The principle：** Files 用于 legibility，databases 用于 structure。拿不准时选 files；它们更透明，users 总能 inspect。

### When Files Work Best（Files 最适合的情况）

- Scale 较小（一个 user's library，而不是数百万 records）
- Transparency 比 query speed 更重要
- Cloud sync（iCloud、Dropbox）能很好处理 files

### Hybrid Approach（混合方案）

即使你因 performance 需要 database，也可以考虑维护一个 agent 使用的 file-based "source of truth"，并将其 sync 到 database 供 UI 查询：

```
Files (agent workspace):
  Research/book_123/introduction.md

Database (UI queries):
  research_index: { bookId, path, title, createdAt }
```
</files_vs_database>

<conflict_model>
## Conflict Model（冲突模型）

如果 agents 和 users 写同一批 files，你需要 conflict model。

### Current Reality（当前现实）

大多数 implementations 通过 atomic writes 使用 **last-write-wins**：

```swift
try data.write(to: url, options: [.atomic])
```

这很简单，但可能丢失 changes。

### Options（选项）

| Strategy（策略） | Pros（优点） | Cons（缺点） |
|----------|------|------|
| **Last write wins** | Simple | Changes can be lost |
| **Agent checks before writing** | 保留 user edits | More complexity |
| **Separate spaces** | No conflicts | Less collaboration |
| **Append-only logs** | Never overwrites | Files grow forever |
| **File locking** | Safe concurrent access | Complexity, can block |

### Recommended Approaches（推荐做法）

**对 agents 频繁写入的 files（logs、status）：** Last-write-wins 可以接受。Conflicts 很少。

**对 users 会 edit 的 files（profiles、notes）：** 考虑 explicit handling：
- Agent overwriting 前检查 modification time
- 或将 agent output 与 user-editable content 分开
- 或使用 append-only pattern

### iCloud Considerations（iCloud 注意事项）

iCloud sync 会增加 complexity。发生 sync conflicts 时，它会创建 `{filename} (conflict).md` files。需要 monitor 这些文件：

```swift
NotificationCenter.default.addObserver(
    forName: .NSMetadataQueryDidUpdate,
    ...
)
```

### System Prompt Guidance（System Prompt 指导）

在 system prompt 中告诉 agent conflict model：

```markdown
## Working with User Content

When you create content, the user may edit it afterward. Always read
existing files before modifying them—the user may have made improvements
you should preserve.

If a file has been modified since you last wrote it, ask before overwriting.
```
</conflict_model>

<examples>
## Example：Reading App File Structure（阅读 App 文件结构示例）

```
Documents/
├── Library/
│   └── library.json              # Book metadata
├── Research/
│   └── books/
│       └── {bookId}/
│           ├── full_text.txt     # Downloaded content
│           ├── introduction.md   # Agent-generated, user-editable
│           ├── notes.md          # User notes
│           └── sources/
│               ├── wikipedia.md  # Research gathered by agent
│               └── reviews.md
├── Chats/
│   └── {conversationId}.json     # Chat history
├── Profile/
│   └── profile.md                # User reading profile
└── context.md                    # Agent's accumulated knowledge
```

**工作方式：**

1. User adds book → 在 `library.json` 创建 entry
2. Agent downloads text → 保存到 `Research/books/{id}/full_text.txt`
3. Agent researches → 保存到 `sources/`
4. Agent generates intro → 保存到 `introduction.md`
5. User edits intro → agent 下次 read 时看到 changes
6. Agent 用 learnings 更新 `context.md`
</examples>

<checklist>
## Files as Universal Interface Checklist（Files as Universal Interface 检查清单）

### Organization（组织方式）
- [ ] Entity-scoped directories（entity 作用域目录，`{type}/{id}/`）
- [ ] Consistent naming conventions（一致的命名约定）
- [ ] Ephemeral vs durable separation（临时内容与持久内容分离）
- [ ] Markdown 用于 human content，JSON 用于 structured data

### context.md
- [ ] Agent 在 session start 读取 context
- [ ] Agent 学习时更新 context
- [ ] 包含：identity、user knowledge、what exists、guidelines
- [ ] 跨 sessions 持久化

### Conflict Handling（冲突处理）
- [ ] 已定义 conflict model（last-write-wins、check-before-write 等）
- [ ] system prompt 中有 agent guidance
- [ ] iCloud conflict monitoring（如适用）

### Integration（集成）
- [ ] UI observes file changes（或 shared service）
- [ ] Agent 可以 read user edits
- [ ] User 可以 inspect agent output
</checklist>
