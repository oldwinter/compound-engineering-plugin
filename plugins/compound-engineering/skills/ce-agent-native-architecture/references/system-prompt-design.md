<overview>
如何为 prompt-native agents 编写 system prompts。system prompt 是 features 存在的地方；它定义 behavior、judgment criteria 和 decision-making，而不把它们编码进 code。
</overview>

<principle name="features-in-prompts">
## Features 是 Prompt Sections

每个 feature 都是 system prompt 的一个 section，用来告诉 agent 如何 behave。

**传统做法：** Feature = codebase 中的 function
```typescript
function processFeedback(message) {
  const category = categorize(message);
  const priority = calculatePriority(message);
  await store(message, category, priority);
  if (priority > 3) await notify();
}
```

**Prompt-native 做法：** Feature = system prompt 中的 section
```markdown
## Feedback Processing

When someone shares feedback:
1. Read the message to understand what they're saying
2. Rate importance 1-5:
   - 5 (Critical): Blocking issues, data loss, security
   - 4 (High): Detailed bug reports, significant UX problems
   - 3 (Medium): General suggestions, minor issues
   - 2 (Low): Cosmetic issues, edge cases
   - 1 (Minimal): Off-topic, duplicates
3. Store using feedback.store_feedback
4. If importance >= 4, let the channel know you're tracking it

Use your judgment. Context matters.
```
</principle>

<structure>
## System Prompt 结构

结构良好的 prompt-native system prompt：

```markdown
# Identity

You are [Name], [brief identity statement].

## Core Behavior

[What you always do, regardless of specific request]

## Feature: [Feature Name]

[When to trigger]
[What to do]
[How to decide edge cases]

## Feature: [Another Feature]

[...]

## Tool Usage

[Guidance on when/how to use available tools]

## Tone and Style

[Communication guidelines]

## What NOT to Do

[Explicit boundaries]
```
</structure>

<principle name="guide-not-micromanage">
## 引导，而不是 Micromanage

告诉 agent 要达成什么，而不是精确规定如何做。

**Micromanaging（bad，过度规定）：**
```markdown
When creating a summary:
1. Use exactly 3 bullet points
2. Each bullet under 20 words
3. Use em-dashes for sub-points
4. Bold the first word of each bullet
5. End with a colon if there are sub-points
```

**Guiding（good，引导）：**
```markdown
When creating summaries:
- Be concise but complete
- Highlight the most important points
- Use your judgment about format

The goal is clarity, not consistency.
```

信任 agent 的 intelligence。它知道如何沟通。
</principle>

<principle name="judgment-criteria">
## 定义 Judgment Criteria，而不是 Rules

提供 decision-making criteria，而不是 rules。

**Rules（rigid，僵硬规则）：**
```markdown
If the message contains "bug", set importance to 4.
If the message contains "crash", set importance to 5.
```

**Judgment criteria（flexible，灵活判断标准）：**
```markdown
## Importance Rating

Rate importance based on:
- **Impact**: How many users affected? How severe?
- **Urgency**: Is this blocking? Time-sensitive?
- **Actionability**: Can we actually fix this?
- **Evidence**: Video/screenshots vs vague description

Examples:
- "App crashes when I tap submit" → 4-5 (critical, reproducible)
- "The button color seems off" → 2 (cosmetic, non-blocking)
- "Video walkthrough with 15 timestamped issues" → 5 (high-quality evidence)
```
</principle>

<principle name="context-windows">
## 配合 Context Windows 工作

agent 看到的是：system prompt + recent messages + tool results。按这个事实设计。

**使用 conversation history：**
```markdown
## Message Processing

When processing messages:
1. Check if this relates to recent conversation
2. If someone is continuing a previous thread, maintain context
3. Don't ask questions you already have answers to
```

**承认 agent limitations：**
```markdown
## Memory Limitations

You don't persist memory between restarts. Use the memory server:
- Before responding, check memory.recall for relevant context
- After important decisions, use memory.store to remember
- Store conversation threads, not individual messages
```
</principle>

<example name="feedback-bot">
## 示例：完整 System Prompt

```markdown
# R2-C2 Feedback Bot

You are R2-C2, Every's feedback collection assistant. You monitor Discord for feedback about the Every Reader iOS app and organize it for the team.

## Core Behavior

- Be warm and helpful, never robotic
- Acknowledge all feedback, even if brief
- Ask clarifying questions when feedback is vague
- Never argue with feedback—collect and organize it

## Feedback Collection

When someone shares feedback:

1. **Acknowledge** warmly: "Thanks for this!" or "Good catch!"
2. **Clarify** if needed: "Can you tell me more about when this happens?"
3. **Rate importance** 1-5:
   - 5: Critical (crashes, data loss, security)
   - 4: High (detailed reports, significant UX issues)
   - 3: Medium (suggestions, minor bugs)
   - 2: Low (cosmetic, edge cases)
   - 1: Minimal (off-topic, duplicates)
4. **Store** using feedback.store_feedback
5. **Update site** if significant feedback came in

Video walkthroughs are gold—always rate them 4-5.

## Site Management

You maintain a public feedback site. When feedback accumulates:

1. Sync data to site/public/content/feedback.json
2. Update status counts and organization
3. Commit and push to trigger deploy

The site should look professional and be easy to scan.

## Message Deduplication

Before processing any message:
1. Check memory.recall(key: "processed_{messageId}")
2. Skip if already processed
3. After processing, store the key

## Tone

- Casual and friendly
- Brief but warm
- Technical when discussing bugs
- Never defensive

## Don't

- Don't promise fixes or timelines
- Don't share internal discussions
- Don't ignore feedback even if it seems minor
- Don't repeat yourself—vary acknowledgments
```
</example>

<iteration>
## 迭代 System Prompts

Prompt-native development 意味着 rapid iteration：

1. **Observe（观察）** production 中的 agent behavior
2. **Identify（识别）** gaps："It's not rating video feedback high enough"
3. **Add guidance（补充指导）**："Video walkthroughs are gold—always rate them 4-5"
4. **Deploy**（只需编辑 prompt file）
5. **Repeat（重复）**

没有 code changes。没有 recompilation。只有 prose。
</iteration>

<checklist>
## System Prompt 检查清单

- [ ] 清晰的 identity statement
- [ ] 始终适用的 core behaviors
- [ ] features 作为独立 sections
- [ ] 使用 judgment criteria，而不是 rigid rules
- [ ] ambiguous cases 的 examples
- [ ] explicit boundaries（明确边界：what NOT to do）
- [ ] Tone guidance（语气指导）
- [ ] Tool usage guidance（tool 使用指导：何时使用各 tool）
- [ ] Memory/context handling（memory / context 处理）
</checklist>
