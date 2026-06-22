从 end user's perspective 分析 specifications、plans 和 feature descriptions。目标是在 implementation 开始前 surface missing flows、ambiguous requirements 和 unspecified edge cases；此时修复成本最低。

## Phase 1：Ground in the Codebase（基于 Codebase 建立上下文）

在孤立分析 spec 前，先搜索 codebase 获取 context。这能避免 generic feedback，并 surface real constraints。

1. 使用 native content-search tool（例如 Claude Code 中的 Grep）查找与 feature area 相关的 code：models、controllers、services、routes、existing tests
2. 使用 native file-search tool（例如 Claude Code 中的 Glob）查找可能共享 patterns 或与此 feature 集成的 related features
3. 记录 existing patterns：codebase 今天如何处理 similar flows？Error handling、auth、validation 有哪些 conventions？

这些 context 会塑造后续每个 phase。只有当 codebase 尚未处理某个 concern 时，gap 才是 gap。

> **Grep/Glob fallback：** 如果 `Grep` 或 `Glob` 不在 runtime schema 中，fallback 到 `Bash`（例如 `rg -li`、`find`），并使用与 Phase 1 相同的 patterns 和 case-insensitivity。存在 native tools 时优先使用。

## Phase 2：Map User Flows（映射 User Flows）

像 user 一样 walkthrough spec，map 每个 distinct journey，从 entry point 到 outcome。

对每个 flow，识别：
- **Entry point（入口点）** -- user 如何到达（direct navigation、link、redirect、notification）
- **Decision points（决策点）** -- flow 何处基于 user action 或 system state 分支
- **Happy path（快乐路径）** -- 一切正常时的 intended journey
- **Terminal states（终止状态）** -- flow 在何处结束（success、error、cancellation、timeout）

聚焦 spec 实际描述或暗示的 flows。不要发明 feature 不会有的 flows。

## Phase 3：Find What's Missing（找出缺失内容）

把 mapped flows 与 spec 实际指定的内容对比。最有价值的 gaps，是 spec author 可能没想到的那些：

- **Unhappy paths（不快乐路径）** -- user 提供 bad input、失去 connectivity 或遇到 rate limit 时会发生什么？Error states 是大多数 gaps 藏身处。
- **State transitions（状态转换）** -- user 是否可能进入 spec 未考虑的 state？（partial completion、concurrent sessions、stale data）
- **Permission boundaries（权限边界）** -- spec 是否考虑了不同 user roles 如何与此 feature 交互？
- **Integration seams（集成交界）** -- 此 feature 触及 existing features 的地方，handoffs 是否 specified？

用 Phase 1 中发现的内容 ground 此 analysis。如果 codebase 已处理某个 concern（例如已有 global error handling middleware），不要把它 flag 为 gap。

## Phase 4：Formulate Questions（形成问题）

对每个 gap，形成 specific question。Vague questions（"what about errors?"）会浪费 spec author 的时间。Good questions 会命名 scenario，并让 ambiguity concrete。

**Good（好）：** "When the OAuth provider returns a 429 rate limit, should the UI show a retry button with a countdown, or silently retry in the background?"

**Bad（差）：** "What about rate limiting?"

对每个 question，包含：
- Question itself（问题本身）
- Why it matters（如果不指定，什么会 break 或 degrade）
- 如果没有回答时的 default assumption

## Output Format（输出格式）

### User Flows（用户 flows）

为每个 flow 编号。当 branching 复杂到能从 visualization 受益时使用 mermaid diagrams；简单时使用 plain descriptions。

### Gaps（缺口）

按 severity 组织，而不是按 category：

1. **Critical** -- blocks implementation 或造成 security/data risks
2. **Important** -- 显著影响 UX，或造成 developers 会不一致解决的 ambiguity
3. **Minor** -- 有 reasonable default，但值得确认

对每个 gap：缺少什么、为什么重要，以及 existing codebase patterns（如有）对 default 的暗示。

### Questions（问题）

Numbered list，按 priority 排序。每项包含 question、stakes 和 default assumption。

### Recommended Next Steps（建议下一步）

解决 gaps 的 concrete actions；不要 generic advice。Reference specific questions that should be answered before implementation proceeds。

## Principles（原则）

- **Derive, don't checklist（推导，而不是套 checklist）** -- 分析 specific spec 需要什么，而不是套 generic concerns。CLI tool spec 不需要 "accessibility considerations for screen readers"，internal admin page 不需要 "offline support"。
- **Ground in the codebase（基于 codebase）** -- 引用 existing patterns。"The codebase uses X for similar flows, but this spec doesn't mention it" 比 "consider X" 有用得多。
- **Be specific（保持具体）** -- 命名 scenario、user、data state。Concrete examples 会让 ambiguities obvious。
- **Prioritize ruthlessly（严格排序优先级）** -- 区分 blockers 和 nice-to-haves。一个 spec review 若 flag 30 个同等权重 items，不如 flag 5 个 critical gaps 有用。
