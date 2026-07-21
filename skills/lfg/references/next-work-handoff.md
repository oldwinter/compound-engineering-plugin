# 下一工作交接

仅在 LFG closeout、当前 pipeline 已到达 terminal state 后使用。其目的，是在不静默扩展已完成 plan 或当前 session 的前提下，为一个独立规划的 area 提供连续性。

## 判断是否值得提出 offer

从 LFG step 1 保留的 canonical plan path 开始，查找带有 `work-relationships` semantic role 的 Product Contract section：

- Markdown：`<!-- ce-section: work-relationships -->`
- HTML：`data-ce-section="work-relationships"`

Visible heading 不属于该 protocol。对于较旧且无 marker 的 plan，只有某个 Product Contract section 明确指出本 plan 负责的 area、一个或多个准备单独规划的 future areas，以及它们之间的关系时，才使用 semantic fallback。不要根据精确 heading、通用 non-goals list 或类似 roadmap 的 wish list 推断 eligibility。Section 含义有歧义时，不提出 offer。

只有已完成 work 明确属于一组更大、分开规划的 work，且至少一个 future area 尚未规划时，才值得提出 offer。排除已经 planned、completed、被刚完成 work 吸收，或 current evidence 已不再支持的 area。Residual implementation、review、PR 或 merge task 属于当前 delivery tail；它不是下一个 brainstorm candidate，也不会单独抑制有效的 future-area offer。

## 推荐下一个 area

对剩余 candidates 做判断，不要直接取第一项。根据 plan 和 pipeline learnings，优先选择：

1. 有显式 user 或 plan priority；
2. 现在可以进行有意义 brainstorm；
3. 由已完成 work 启用；
4. 能解锁最多 downstream work；
5. 能减少 foundational uncertainty；或
6. 特别受益于新鲜 implementation knowledge 的 area。

这些是 judgment criteria，不是计分系统。不要根据 document order、表面难易、措辞相似性或 plan 不支持的 dependency 进行选择。提出 offer 前，根据当前 delivery result 重新检查 candidate。

- **存在一个有依据的 winner：** 命名它，并给出最短的 concrete reason 说明为什么它应当在下一步。
- **真正并列：** 说明 current evidence 不足以在并列 areas 间选择。提出 selection-focused handoff，让 next session 决定要 brainstorm 的一个 coherent area。
- **没有 ready candidate：** 不提出 offer。

## 提出 offer，然后停止

将 offer 放在 LFG 的 `<promise>DONE</promise>` 前。保持 non-blocking，暂时不要调用 `ce-handoff`。

存在一个 winner 时，用自然语言表达为：

> 最明确的下一个 area 是 **<area>**，因为 <reason>。如果要在新的 agent session 中继续，我可以为这次 brainstorm 创建一个 `ce-handoff`。

真正并列时，列出并列 areas，并提出一个专注于选择下一个 coherent area 的 fresh-session handoff。Pipeline 仍以 DONE promise 结束；offer 是可选的连续性，不是另一个 LFG step。

## 用户稍后接受时

只有得到明确接受后，才根据 host 的 available-skills list 解析 `ce-handoff`，并使用 compact、带 label 的 next-work brief 调用 `create`。LFG 负责 recommendation；不要让 `ce-handoff` 重新发现或排序 candidates。包含：

- **Next-session objective：** brainstorm 一个 coherent next area，并生成 requirements-only unified plan。
- **Recommended area：** winner；若 session 必须选择，则提供并列 candidate set。
- **Why next：** 基于 evidence 的 selection rationale。
- **Authoritative prior plan：** repo-relative canonical plan path。
- **Relationship to completed work：** 明确的 depends-on、enables、shares 或 independent relationship。
- **Actual delivery state：** 已完成内容与当前 tail 剩余内容，例如 implemented、PR open、CI decided 或 not merged。
- **Carry-forward decisions：** 只包含约束 next area 的 prior decisions。
- **Assumptions to revalidate：** fresh brainstorm 不得当作 settled 继承的 provisional relationships 或 facts。
- **Other candidates not selected：** 当 context 可防止重复 selection work 时，列出每个 alternative 及未选择原因。
- **Artifact boundary：** 为 next area 创建单独的 requirements-only unified plan，引用 prior plan，不扩展或编辑 prior plan。

Brief 应保持 pointer-first。不要将 prior Product Contract 粘贴进去；plan 仍是 authoritative source，handoff 只说明 next session 需要决定什么。
