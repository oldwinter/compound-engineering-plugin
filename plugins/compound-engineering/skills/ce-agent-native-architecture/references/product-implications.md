<overview>
Agent-native architecture 不只影响产品如何构建，也影响产品的感觉。本文涵盖 complexity 的 progressive disclosure、通过 agent usage 发现 latent demand，以及设计与 stakes 和 reversibility 匹配的 approval flows。
</overview>

<progressive_disclosure>
## Progressive Disclosure of Complexity（复杂度的渐进披露）

最好的 agent-native applications 一开始很简单，但拥有几乎无穷的 power。

### The Excel Analogy（Excel 类比）

Excel 是 canonical example：你可以用它做 grocery list，也可以构建 complex financial models。同一个 tool，使用深度可以完全不同。

Claude Code 也有这种特质：可以修一个 typo，也可以 refactor 整个 codebase。interface 一样，都是 natural language；但 capability 会随 ask 的复杂度扩展。

### The Pattern（模式）

Agent-native applications 应该追求这种形态：

**Simple entry：** Basic requests 可立即工作，没有 learning curve
```
User: "Organize my downloads"
Agent: [Does it immediately, no configuration needed]
```

**Discoverable depth：** Users 在探索中发现自己能做更多
```
User: "Organize my downloads by project"
Agent: [Adapts to preference]

User: "Every Monday, review last week's downloads"
Agent: [Sets up recurring workflow]
```

**No ceiling：** Power users 可以用你未预料的方式推动 system
```
User: "Cross-reference my downloads with my calendar and flag
       anything I downloaded during a meeting that I haven't
       followed up on"
Agent: [Composes capabilities to accomplish this]
```

### How This Emerges（它如何涌现）

这不是你直接设计出来的东西。它会**从 architecture 中自然 emerge：**

1. 当 features 是 prompts 且 tools 是 composable 的...
2. Users 可以从简单请求开始（"organize my downloads"）...
3. 并逐渐 discover complexity（"every Monday, review last week's..."）...
4. 而你不需要显式构建每一个 level

agent 会在 users 当前所在的位置与他们相遇。

### Design Implications（设计启示）

- **Don't force configuration upfront** - 让 users 立即开始
- **Don't hide capabilities** - 让 capabilities 通过使用被发现
- **Don't cap complexity** - 如果 agent 能做，就允许 users 提出
- **Do provide hints** - 帮助 users 发现 what's possible
</progressive_disclosure>

<latent_demand_discovery>
## Latent Demand Discovery（潜在需求发现）

Traditional product development：想象 users 想要什么，构建它，再看你是否猜对。

Agent-native product development：构建 capable foundation，观察 users 要 agent 做什么，再 formalize emerge 出来的 patterns。

### The Shift（转变）

**Traditional approach（传统方式）：**
```
1. Imagine features users might want
2. Build them
3. Ship
4. Hope you guessed right
5. If wrong, rebuild
```

**Agent-native approach（Agent-native 方式）：**
```
1. Build capable foundation (atomic tools, parity)
2. Ship
3. Users ask agent for things
4. Observe what they're asking for
5. Patterns emerge
6. Formalize patterns into domain tools or prompts
7. Repeat
```

### The Flywheel（飞轮）

```
Build with atomic tools and parity
           ↓
Users ask for things you didn't anticipate
           ↓
Agent composes tools to accomplish them
(or fails, revealing a capability gap)
           ↓
You observe patterns in what's being requested
           ↓
Add domain tools or prompts to optimize common patterns
           ↓
(Repeat)
```

### What You Learn（你会学到什么）

**当 users 提出请求且 agent 成功：**
- 这是 real need
- 你的 architecture 支持它
- 如果它很 common，考虑用 domain tool optimize

**当 users 提出请求但 agent 失败：**
- 这是 real need
- 你有 capability gap
- 修复 gap：add tool、fix parity、improve context

**当 users 没有请求某事：**
- 也许他们不需要
- 也许他们不知道这事可能（capability hiding）

### Implementation（实现）

**Log agent requests（记录 agent requests）：**
```typescript
async function handleAgentRequest(request: string) {
  // Log what users are asking for
  await analytics.log({
    type: 'agent_request',
    request: request,
    timestamp: Date.now(),
  });

  // Process request...
}
```

**Track success/failure（跟踪成功/失败）：**
```typescript
async function completeAgentSession(session: AgentSession) {
  await analytics.log({
    type: 'agent_session',
    request: session.initialRequest,
    succeeded: session.status === 'completed',
    toolsUsed: session.toolCalls.map(t => t.name),
    iterations: session.iterationCount,
  });
}
```

**Review patterns（复盘 patterns）：**
- Users 最常要求什么？
- 什么在失败？为什么？
- 什么会受益于 domain tool？
- 什么需要更好的 context injection？

### Example: Discovering "Weekly Review"（示例：发现 "Weekly Review"）

```
Week 1: Users start asking "summarize my activity this week"
        Agent: Composes list_files + read_file, works but slow

Week 2: More users asking similar things
        Pattern emerges: weekly review is common

Week 3: Add prompt section for weekly review
        Faster, more consistent, still flexible

Week 4: If still common and performance matters
        Add domain tool: generate_weekly_summary
```

你不必猜 weekly review 会流行。你发现了它。
</latent_demand_discovery>

<approval_and_agency>
## Approval and User Agency（审批与用户能动性）

当 agents 执行 unsolicited actions，也就是不是响应 explicit requests、而是自己做事时，你需要决定授予多少 autonomy。

> **Note：** 这个 framework 适用于 unsolicited agent actions。如果用户明确要求 agent 做某事（"send that email"），那已经是 approval；agent 直接做即可。

### The Stakes/Reversibility Matrix（风险/可逆性矩阵）

考虑两个 dimensions：
- **Stakes：** 如果出错，影响有多大？
- **Reversibility：** undo 有多容易？

| Stakes（风险） | Reversibility（可逆性） | Pattern（模式） | Example（示例） |
|--------|---------------|---------|---------|
| Low | Easy | **Auto-apply** | Organizing files |
| Low | Hard | **Quick confirm** | Publishing to a private feed |
| High | Easy | **Suggest + apply** | Code changes with undo |
| High | Hard | **Explicit approval** | Sending emails, payments |

### Patterns in Detail（模式细节）

**Auto-apply（低风险，易回滚）：**
```
Agent: [Organizes files into folders]
Agent: "I organized your downloads into folders by type.
        You can undo with Cmd+Z or move them back."
```
User 不需要 approve；这很容易 undo，且影响不大。

**Quick confirm（低风险，难回滚）：**
```
Agent: "I've drafted a post about your reading insights.
        Publish to your feed?"
        [Publish] [Edit first] [Cancel]
```
因为 stakes 低，所以 one-tap confirm 即可；但 un-publish 很难。

**Suggest + apply（高风险，易回滚）：**
```
Agent: "I recommend these code changes to fix the bug:
        [Shows diff]
        Apply? Changes can be reverted with git."
        [Apply] [Modify] [Cancel]
```
展示将发生什么，并说明 reversal 路径。

**Explicit approval（高风险，难回滚）：**
```
Agent: "I've drafted this email to your team about the deadline change:
        [Shows full email]
        This will send immediately and cannot be unsent.
        Type 'send' to confirm."
```
要求 explicit action，并让 consequences 清晰。

### Implementation（实现）

```swift
enum ApprovalLevel {
    case autoApply       // Just do it
    case quickConfirm    // One-tap approval
    case suggestApply    // Show preview, ask to apply
    case explicitApproval // Require explicit confirmation
}

func approvalLevelFor(action: AgentAction) -> ApprovalLevel {
    let stakes = assessStakes(action)
    let reversibility = assessReversibility(action)

    switch (stakes, reversibility) {
    case (.low, .easy): return .autoApply
    case (.low, .hard): return .quickConfirm
    case (.high, .easy): return .suggestApply
    case (.high, .hard): return .explicitApproval
    }
}

func assessStakes(_ action: AgentAction) -> Stakes {
    switch action {
    case .organizeFiles: return .low
    case .publishToFeed: return .low
    case .modifyCode: return .high
    case .sendEmail: return .high
    case .makePayment: return .high
    }
}

func assessReversibility(_ action: AgentAction) -> Reversibility {
    switch action {
    case .organizeFiles: return .easy  // Can move back
    case .publishToFeed: return .hard  // People might see it
    case .modifyCode: return .easy     // Git revert
    case .sendEmail: return .hard      // Can't unsend
    case .makePayment: return .hard    // Money moved
    }
}
```

### Self-Modification Considerations（自我修改注意事项）

当 agents 可以修改自己的 behavior（changing prompts、updating preferences、adjusting workflows）时，目标是：

1. **Visibility：** User 可以看到 changed 什么
2. **Understanding：** User 理解 effects
3. **Rollback：** User 可以 undo changes

Approval flows 是实现这一点的一种方式。带 easy rollback 的 audit logs 也可以。**原则是：make it legible.**

```swift
// When agent modifies its own prompt
func agentSelfModify(change: PromptChange) async {
    // Log the change
    await auditLog.record(change)

    // Create checkpoint for rollback
    await createCheckpoint(currentState)

    // Notify user (could be async/batched)
    await notifyUser("I've adjusted my approach: \(change.summary)")

    // Apply change
    await applyChange(change)
}
```
</approval_and_agency>

<capability_visibility>
## Capability Visibility（能力可见性）

Users 需要发现 agent 能做什么。Hidden capabilities 会导致 underutilization。

### The Problem（问题）

```
User: "Help me with my reading"
Agent: "What would you like help with?"
// Agent doesn't mention it can publish to feed, research books,
// generate introductions, analyze themes...
```

agent 能做这些事，但 user 不知道。

### Solutions（解决方案）

**Onboarding hints（onboarding 提示）：**
```
Agent: "I can help you with your reading in several ways:
        - Research any book (web search + save findings)
        - Generate personalized introductions
        - Publish insights to your reading feed
        - Analyze themes across your library
        What interests you?"
```

**Contextual suggestions（上下文建议）：**
```
User: "I just finished reading 1984"
Agent: "Great choice! Would you like me to:
        - Research historical context?
        - Compare it to other books in your library?
        - Publish an insight about it to your feed?"
```

**Progressive revelation（渐进揭示）：**
```
// After user uses basic features
Agent: "By the way, you can also ask me to set up
        recurring tasks, like 'every Monday, review my
        reading progress.' Just let me know!"
```

### Balance（平衡）

- **Don't overwhelm**：不要 upfront 展示所有 capabilities
- **Do reveal**：通过使用自然 reveal capabilities
- **Don't assume**：不要假设 users 会自己发现
- **Do make**：相关时让 capabilities visible
</capability_visibility>

<designing_for_trust>
## Designing for Trust（为信任而设计）

Agent-native apps 需要 trust。Users 正在把 significant capability 交给 AI。通过以下方式建立 trust：

### Transparency（透明度）

- 展示 agent 正在做什么（tool calls、progress）
- 在重要时解释 reasoning
- 让所有 agent work 都 inspectable（files、logs）

### Predictability（可预测性）

- 对 similar requests 保持 consistent behavior
- 明确何时需要 approval 的 patterns
- agent 可 access 的内容没有 surprises

### Reversibility（可逆性）

- agent actions 易于 undo
- significant changes 前有 checkpoints
- 明确 rollback paths

### Control（控制权）

- User 可随时 stop agent
- User 可调整 agent behavior（prompts、preferences）
- 如有需要，User 可限制 capabilities

### Implementation（实现）

```swift
struct AgentTransparency {
    // Show what's happening
    func onToolCall(_ tool: ToolCall) {
        showInUI("Using \(tool.name)...")
    }

    // Explain reasoning
    func onDecision(_ decision: AgentDecision) {
        if decision.needsExplanation {
            showInUI("I chose this because: \(decision.reasoning)")
        }
    }

    // Make work inspectable
    func onOutput(_ output: AgentOutput) {
        // All output is in files user can see
        // Or in visible UI state
    }
}
```
</designing_for_trust>

<checklist>
## Product Design Checklist（产品设计检查清单）

### Progressive Disclosure（渐进披露）
- [ ] Basic requests 立即可用（no config）
- [ ] Depth 可通过使用 discover
- [ ] complexity 没有 artificial ceiling
- [ ] 提供 capability hints

### Latent Demand Discovery（潜在需求发现）
- [ ] Agent requests 被 logged
- [ ] Success/failure 被 tracked
- [ ] Patterns 被定期 reviewed
- [ ] Common patterns 被 formalized into tools/prompts

### Approval & Agency（审批与能动性）
- [ ] 每个 action type 都已 assessed stakes
- [ ] 每个 action type 都已 assessed reversibility
- [ ] Approval pattern 匹配 stakes/reversibility
- [ ] Self-modification 是 legible 的（visible、understandable、reversible）

### Capability Visibility（能力可见性）
- [ ] Onboarding 会揭示关键 capabilities
- [ ] 提供 contextual suggestions
- [ ] 不期待 users 自己 guess what's possible

### Trust（信任）
- [ ] Agent actions 是 transparent 的
- [ ] Behavior 是 predictable 的
- [ ] Actions 是 reversible 的
- [ ] User 拥有 control
</checklist>
