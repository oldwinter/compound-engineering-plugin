---
name: ce-agent-native-architecture
description: 构建将 agents 作为 first-class citizens 的应用。设计 autonomous agents、创建 MCP tools、实现 self-modifying systems，或构建“功能是由 agents 在 loop 中操作而达成的 outcomes”的应用时使用此 skill。
---

<overview>
## Agent-Native Architecture（Agent-native 架构）

Agent-native applications 将 agents 视为 first-class citizens。功能不是写在代码里的函数，而是 agent 使用 tools 在 loop 中达成的 outcomes。驱动 Claude Code 的同一套架构，也可以驱动远超 coding 范围的应用。

**五个核心原则：**

1. **Parity** — 用户能通过 UI 做到的任何事，agent 都能通过 tools 达成。
2. **Granularity** — Tools 是 atomic primitives；features 是由 prompt 定义的 outcomes。要改变行为，编辑 prose，而不是代码。
3. **Composability** — 新功能 = 新 prompts，而不是新代码。Atomic tools + parity 让这成为可能。
4. **Emergent Capability** — Agent 能完成你没有显式设计过的事情。开放式请求会揭示 latent demand。
5. **Improvement Over Time** — Apps 通过累积 context（例如 `context.md` 文件）和 prompt refinement 变得更好，而不需要发布代码。

要深入了解这些原则如何转化为 architectural patterns，请阅读 `references/architecture-patterns.md`。
</overview>

<intake>
## 你需要哪方面的 agent-native architecture 帮助？

1. **Design architecture（架构设计）** - 从零规划新的 agent-native system
2. **Files & workspace（文件与 workspace）** - Files as universal interface、shared workspace patterns
3. **Tool design（工具设计）** - Primitive tools、dynamic capability discovery、CRUD completeness
4. **Domain tools（领域工具）** - 什么时候添加 domain tools，什么时候继续使用 primitives
5. **Execution patterns（执行模式）** - Completion signals、partial completion、context limits
6. **System prompts（系统 prompts）** - 定义 agent behavior 和 judgment criteria
7. **Context injection（上下文注入）** - 将 runtime app state 注入 agent prompts
8. **Action parity（动作对等）** - 确保 agents 能做用户能做的一切
9. **Self-modification（自我修改）** - 让 agents 能安全地演化自己
10. **Product design（产品设计）** - Progressive disclosure、latent demand、approval patterns
11. **Mobile patterns（移动端模式）** - iOS storage、background execution、checkpoint/resume
12. **Testing（测试）** - 测试 agent-native apps 的 capability 和 parity
13. **Refactoring（重构）** - 让现有代码更 agent-native
14. **Review / checklists（审查 / 检查清单）** - Architecture checklist、anti-patterns、success criteria

选择一个编号，或描述你想做什么。等待回复后再继续。
</intake>

<routing>
| Response | Read |
|----------|------|
| 1, "design", "architecture", "plan" | `references/architecture-patterns.md`, then apply the checklist in `references/checklists.md` |
| 2, "files", "workspace", "filesystem" | `references/files-universal-interface.md` and `references/shared-workspace-architecture.md` |
| 3, "tool", "mcp", "primitive", "crud" | `references/mcp-tool-design.md` |
| 4, "domain tool", "when to add" | `references/from-primitives-to-domain-tools.md` |
| 5, "execution", "completion", "loop" | `references/agent-execution-patterns.md` |
| 6, "prompt", "system prompt", "behavior" | `references/system-prompt-design.md` |
| 7, "context", "inject", "runtime", "dynamic" | `references/dynamic-context-injection.md` |
| 8, "parity", "ui action", "capability map" | `references/action-parity-discipline.md` |
| 9, "self-modify", "evolve", "git" | `references/self-modification.md` |
| 10, "product", "progressive", "approval", "latent demand" | `references/product-implications.md` |
| 11, "mobile", "ios", "android", "background", "checkpoint" | `references/mobile-patterns.md` |
| 12, "test", "testing", "verify", "validate" | `references/agent-native-testing.md` |
| 13, "refactor", "existing", "migrate" | `references/refactoring-to-prompt-native.md` |
| 14, "review", "audit", "anti-pattern", "checklist", "success criteria" | `references/checklists.md` |

读取 reference 后，将这些 patterns 应用到用户的具体上下文。
</routing>

<reference_index>
## Reference Files（参考文件）

**Core patterns（核心 patterns）：**
- `references/architecture-patterns.md` — Event-driven、unified orchestrator、agent-to-UI；完整覆盖五个原则
- `references/files-universal-interface.md` — 为什么是 files、organization、context.md
- `references/mcp-tool-design.md` — Tool design、dynamic capability discovery、CRUD
- `references/from-primitives-to-domain-tools.md` — 什么时候从 primitives 升级为 domain tools
- `references/agent-execution-patterns.md` — Completion signals、partial completion、context limits
- `references/system-prompt-design.md` — Features as prompts、judgment criteria

**Disciplines（实践纪律）：**
- `references/dynamic-context-injection.md` — Runtime context injection
- `references/action-parity-discipline.md` — Capability mapping、parity workflow
- `references/shared-workspace-architecture.md` — Shared data space、UI integration
- `references/product-implications.md` — Progressive disclosure、latent demand、approval
- `references/agent-native-testing.md` — Testing outcomes、parity tests
- `references/checklists.md` — Architecture checklist、anti-patterns、success criteria

**Platform-specific（平台特定）：**
- `references/mobile-patterns.md` — iOS storage、checkpoint/resume、cost awareness
- `references/self-modification.md` — Git-based evolution、guardrails
- `references/refactoring-to-prompt-native.md` — 迁移现有代码
</reference_index>
