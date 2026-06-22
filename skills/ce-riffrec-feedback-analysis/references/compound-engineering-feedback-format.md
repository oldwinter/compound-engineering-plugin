# Compound Engineering Feedback Format（Compound Engineering 反馈格式）

将 Riffrec evidence 转换为 durable brainstorm 或 planning input 时，使用此形态。

## Finding（Finding 条目）

```markdown
### F1. <Short problem title>

- **Severity:** P0/P1/P2/P3
- **Observed:** <What happened, grounded in transcript/events/screenshots>
- **Expected:** <What the user appeared to expect or what the product should do>
- **Evidence:** <Moment IDs and screenshot links>
- **Confidence:** High/Medium/Low, with reason
- **Requirement candidates:** R1, R2
```

## Requirements Kickoff（Requirements 启动材料）

```markdown
---
date: YYYY-MM-DD
topic: <topic>
---

# <Topic Title>

## Problem Frame

<Who is affected, what is changing, and why it matters.>

---

## Actors

- A1. User: <Role in the recorded workflow>
- A2. Product surface: <System under test>
- A3. Agent/assistant, if relevant: <Role in the workflow>

---

## Key Flows

- F1. Recorded feedback triage
  - **Trigger:** A Riffrec zip is available for review.
  - **Actors:** A1, A2
  - **Steps:** <3-7 product steps seen in the recording>
  - **Outcome:** <What should be true after the fix>
  - **Covered by:** R1, R2

---

## Requirements

**Observed product behavior**
- R1. <Concrete product behavior requirement>

**Feedback evidence and reviewability**
- R2. <Requirement about making the issue observable or preventing recurrence>

---

## Acceptance Examples

- AE1. **Covers R1.** Given <state>, when <action>, <outcome>.

---

## Success Criteria

- <Human outcome>
- <Downstream agent handoff quality>

---

## Scope Boundaries

- <Deliberate non-goal>

---

## Key Decisions

- <Decision>: <Rationale>

---

## Dependencies / Assumptions

- <Material dependency or assumption>

---

## Outstanding Questions

### Resolve Before Planning

- <Only product questions that block planning>

### Deferred to Planning

- [Technical] <Questions better answered during codebase exploration>

---

## Next Steps

-> /ce-brainstorm to confirm, correct, and regroup the captured requirements before any planning.
```

## Evidence Rules（证据规则）

- 优先使用 moment IDs 和 screenshot links，而不是 prose-only claims。
- 当 screenshot 无法证明 intent 时，将 visual interpretation 标记为 inference。
- Requirements 应描述 product behavior，而不是 implementation details。
- 不要在 CE docs 中包含 absolute local paths；尽可能使用 repo-relative paths。
