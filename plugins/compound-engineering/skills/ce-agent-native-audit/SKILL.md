---
name: ce-agent-native-audit
description: 运行带原则评分的 comprehensive agent-native architecture review
argument-hint: "[可选：要 audit 的 specific principle]"
disable-model-invocation: true
---

# Agent-Native Architecture Audit（Agent-Native 架构审计）

根据 agent-native architecture principles 对 codebase 进行 comprehensive review，为每个 principle 启动 parallel sub-agents，并生成带评分的 report。

## 要 Audit 的 Core Principles

1. **Action Parity** - "Whatever the user can do, the agent can do"（用户能做的，agent 也能做）
2. **Tools as Primitives** - "Tools provide capability, not behavior"（Tools 提供 capability，而不是 behavior）
3. **Context Injection** - "System prompt includes dynamic context about app state"（System prompt 包含 app state 的 dynamic context）
4. **Shared Workspace** - "Agent and user work in the same data space"（Agent 和 user 在同一 data space 中工作）
5. **CRUD Completeness** - "Every entity has full CRUD (Create, Read, Update, Delete)"（每个 entity 都有完整 CRUD）
6. **UI Integration** - "Agent actions immediately reflected in UI"（Agent actions 会立即反映到 UI）
7. **Capability Discovery** - "Users can discover what the agent can do"（Users 能发现 agent 可以做什么）
8. **Prompt-Native Features** - "Features are prompts defining outcomes, not code"（Features 是定义 outcomes 的 prompts，而不是 code）

## Workflow（工作流）

### Step 1：加载 Agent-Native Skill

首先调用 agent-native-architecture skill，理解所有 principles：

```
/ce-agent-native-architecture
```

选择 option 7（action parity）以加载完整 reference material。

### Step 2：启动 Parallel Sub-Agents（并行 Sub-Agents）

使用平台的 subagent primitive 启动 8 个 parallel sub-agents（Claude Code 中用带 `subagent_type: Explore` 的 `Agent`，Codex 中用带 `agent_type: "explorer"` 的 `spawn_agent`，Pi 中通过 `pi-subagents` extension 使用带 `agent: "scout"` 的 `subagent`），每个 principle 一个 agent。每个 agent 应该：

1. 枚举 codebase 中的 ALL instances（user actions、tools、contexts、data stores 等）
2. 根据该 principle 检查 compliance
3. 提供 SPECIFIC SCORE，例如 "X out of Y (percentage%)"
4. 列出具体 gaps 和 recommendations

<sub-agents>

**Agent 1：Action Parity（Action Parity 审计）**
```
Audit for ACTION PARITY - "Whatever the user can do, the agent can do."

Tasks:
1. Enumerate ALL user actions in frontend (API calls, button clicks, form submissions)
   - Search for API service files, fetch calls, form handlers
   - Check routes and components for user interactions
2. Check which have corresponding agent tools
   - Search for agent tool definitions
   - Map user actions to agent capabilities
3. Score: "Agent can do X out of Y user actions"

Format:
## Action Parity Audit
### User Actions Found
| Action | Location | Agent Tool | Status |
### Score: X/Y (percentage%)
### Missing Agent Tools
### Recommendations
```

**Agent 2：Tools as Primitives（Tools as Primitives 审计）**
```
Audit for TOOLS AS PRIMITIVES - "Tools provide capability, not behavior."

Tasks:
1. Find and read ALL agent tool files
2. Classify each as:
   - PRIMITIVE (good): read, write, store, list - enables capability without business logic
   - WORKFLOW (bad): encodes business logic, makes decisions, orchestrates steps
3. Score: "X out of Y tools are proper primitives"

Format:
## Tools as Primitives Audit
### Tool Analysis
| Tool | File | Type | Reasoning |
### Score: X/Y (percentage%)
### Problematic Tools (workflows that should be primitives)
### Recommendations
```

**Agent 3：Context Injection（Context Injection 审计）**
```
Audit for CONTEXT INJECTION - "System prompt includes dynamic context about app state"

Tasks:
1. Find context injection code (search for "context", "system prompt", "inject")
2. Read agent prompts and system messages
3. Enumerate what IS injected vs what SHOULD be:
   - Available resources (files, drafts, documents)
   - User preferences/settings
   - Recent activity
   - Available capabilities listed
   - Session history
   - Workspace state

Format:
## Context Injection Audit
### Context Types Analysis
| Context Type | Injected? | Location | Notes |
### Score: X/Y (percentage%)
### Missing Context
### Recommendations
```

**Agent 4：Shared Workspace（Shared Workspace 审计）**
```
Audit for SHARED WORKSPACE - "Agent and user work in the same data space"

Tasks:
1. Identify all data stores/tables/models
2. Check if agents read/write to SAME tables or separate ones
3. Look for sandbox isolation anti-pattern (agent has separate data space)

Format:
## Shared Workspace Audit
### Data Store Analysis
| Data Store | User Access | Agent Access | Shared? |
### Score: X/Y (percentage%)
### Isolated Data (anti-pattern)
### Recommendations
```

**Agent 5：CRUD Completeness（CRUD 完整性审计）**
```
Audit for CRUD COMPLETENESS - "Every entity has full CRUD"

Tasks:
1. Identify all entities/models in the codebase
2. For each entity, check if agent tools exist for:
   - Create
   - Read
   - Update
   - Delete
3. Score per entity and overall

Format:
## CRUD Completeness Audit
### Entity CRUD Analysis
| Entity | Create | Read | Update | Delete | Score |
### Overall Score: X/Y entities with full CRUD (percentage%)
### Incomplete Entities (list missing operations)
### Recommendations
```

**Agent 6：UI Integration（UI 集成审计）**
```
Audit for UI INTEGRATION - "Agent actions immediately reflected in UI"

Tasks:
1. Check how agent writes/changes propagate to frontend
2. Look for:
   - Streaming updates (SSE, WebSocket)
   - Polling mechanisms
   - Shared state/services
   - Event buses
   - File watching
3. Identify "silent actions" anti-pattern (agent changes state but UI doesn't update)

Format:
## UI Integration Audit
### Agent Action → UI Update Analysis
| Agent Action | UI Mechanism | Immediate? | Notes |
### Score: X/Y (percentage%)
### Silent Actions (anti-pattern)
### Recommendations
```

**Agent 7：Capability Discovery（Capability Discovery 审计）**
```
Audit for CAPABILITY DISCOVERY - "Users can discover what the agent can do"

Tasks:
1. Check for these 7 discovery mechanisms:
   - Onboarding flow showing agent capabilities
   - Help documentation
   - Capability hints in UI
   - Agent self-describes in responses
   - Suggested prompts/actions
   - Empty state guidance
   - Slash commands (/help, /tools)
2. Score against 7 mechanisms

Format:
## Capability Discovery Audit
### Discovery Mechanism Analysis
| Mechanism | Exists? | Location | Quality |
### Score: X/7 (percentage%)
### Missing Discovery
### Recommendations
```

**Agent 8：Prompt-Native Features（Prompt-Native Features 审计）**
```
Audit for PROMPT-NATIVE FEATURES - "Features are prompts defining outcomes, not code"

Tasks:
1. Read all agent prompts
2. Classify each feature/behavior as defined in:
   - PROMPT (good): outcomes defined in natural language
   - CODE (bad): business logic hardcoded
3. Check if behavior changes require prompt edit vs code change

Format:
## Prompt-Native Features Audit
### Feature Definition Analysis
| Feature | Defined In | Type | Notes |
### Score: X/Y (percentage%)
### Code-Defined Features (anti-pattern)
### Recommendations
```

</sub-agents>

### Step 3：Compile Summary Report（汇总 Summary Report）

所有 agents 完成后，编译一份 summary：

```markdown
## Agent-Native Architecture Review: [Project Name]

### Overall Score Summary

| Core Principle | Score | Percentage | Status |
|----------------|-------|------------|--------|
| Action Parity | X/Y | Z% | ✅/⚠️/❌ |
| Tools as Primitives | X/Y | Z% | ✅/⚠️/❌ |
| Context Injection | X/Y | Z% | ✅/⚠️/❌ |
| Shared Workspace | X/Y | Z% | ✅/⚠️/❌ |
| CRUD Completeness | X/Y | Z% | ✅/⚠️/❌ |
| UI Integration | X/Y | Z% | ✅/⚠️/❌ |
| Capability Discovery | X/Y | Z% | ✅/⚠️/❌ |
| Prompt-Native Features | X/Y | Z% | ✅/⚠️/❌ |

**Overall Agent-Native Score: X%**

### Status Legend（状态图例）
- ✅ Excellent（80%+）
- ⚠️ Partial（50-79%）
- ❌ Needs Work（<50%）

### Top 10 Recommendations by Impact（按 Impact 排序的 Top 10 Recommendations）

| Priority | Action | Principle | Effort |
|----------|--------|-----------|--------|

### What's Working Excellently（表现优秀的地方）

[List top 5 strengths]
```

## Success Criteria（成功标准）

- [ ] 全部 8 个 sub-agents 完成各自 audits
- [ ] 每个 principle 都有 specific numeric score（X/Y format）
- [ ] Summary table 展示所有 scores 和 status indicators
- [ ] Top 10 recommendations 按 impact 排序
- [ ] Report 同时识别 strengths 和 gaps

## Optional：Single Principle Audit（单原则审计）

如果 $ARGUMENTS 指定单个 principle（例如 "action parity"），只运行该 sub-agent，并仅为该 principle 提供 detailed findings。

Valid arguments（有效参数）：
- `action parity` or `1`
- `tools` or `primitives` or `2`
- `context` or `injection` or `3`
- `shared` or `workspace` or `4`
- `crud` or `5`
- `ui` or `integration` or `6`
- `discovery` or `7`
- `prompt` or `features` or `8`
