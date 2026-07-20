# `ce-explain`

## 摘要（TL;DR）

把它指向一个 concept、一个 diff、一个 idea，或你最近一段 work，它会生成一份写给你个人的 dense、visual explainer。可选 check-in 会让材料真正留下来：diff 模式中先预测再揭示，exercise 模式中回答后得到纠正。

## 调用示例

```text
# 根据 diff 解释最近的 code change
/ce-explain teach me how the changes in the last three commits work

# 讲解 external technical concept
/ce-explain Ruby garbage compaction

# 为 meeting preparation 构建 timeline
/ce-explain build a timeline of what changed since Monday

# 把早期 idea 转成 visual thinking artifact
/ce-explain my idea of caching explainers per repository
```

## 问题

Agent-driven development 移除了过去手写代码带来的学习过程。你通过 agents ship work，很少阅读代码，也不再积累“亲手打过一遍”会强迫你形成的理解。成本出现两次：自己项目上的 comprehension debt，以及会议中需要解释上周发生了什么时的 recall gaps。Plugin 的其他 skills 会为 *repo* 捕获 knowledge（`/ce-compound`），或判断 options（`/ce-pov`）；没有一个是在教 *你*。

## 方案

一个 skill，支持四种输入形状：

- **Concept**：如果 topic 触及当前 repo，就基于 repo grounding；否则作为完全 external topic 处理（interview prep 也算）。
- **Diff**：理解不是你亲手写的 change，并使用 predict-then-reveal：在任何解释出现前，你先说你认为它做了什么。
- **Idea**：把你的 idea 当作 fixed given，解释 implications 和 trade-offs；绝不 scope 或 rank，那属于 brainstorm/ideate。
- **Work recap**：“what did I do this week?” 从 git activity 和 project docs 中回答，几分钟内可吸收，适合会前准备。

Explainer 以 HTML-first（按需 markdown）生成，默认 show-n-tell：结构用 diagrams，代码用 annotated snippets，recap 用 timelines。Artifact 会先写到稳定 temp 位置，然后 skill 才询问你要放到哪里：artifact surface、本地文件，或检测到的 destination（Proof、Thinkroom 等）。只有真实可用的 destinations 才会出现。

## 新颖之处

1. **Predict-then-reveal for diffs.** Turn 在展示 raw change 并要求你预测后结束。任何 interpretive content 都不会提前泄露；随后 reveal 会精确指出你的 prediction 漏掉了什么。命名这个 gap 本身就是教学。
2. **Check-in lives in the session, not the artifact.** 文档保持 display-only；exercises 在 chat 中提出，skill 可以检查并纠正你的答案。
3. **Skippable by design.** Routine recap 会跳过 check-in；你也始终可以拒绝。有些东西不需要 learning loop。
4. **Capability-detected destinations.** Destination ask 只展示环境支持的选项，本地文件是永远存在的底线。Artifact 会在询问前已经落盘，所以全部拒绝也不会丢失。
5. **Honest external grounding.** 没有 web access 的 external topics 会 fallback 到 model knowledge，并在 artifact 中标记为 unverified，绝不伪装成已检查。

## 何时使用

- Agent 刚落了一个 change，而你没有完全跟上，希望 *understand* 它，而不只是 review 它。
- 你反复遇到一个 concept，却一直只是点头。
- Interview 或 presentation prep，需要材料进脑子，而不是只放在 doc 里。
- Standup 或 meeting 前：“catch me up on what I did.”

## 放在 workflow 中使用

`ce-explain` 位于 core loop 之外。只要 comprehension 落后于 shipping，就调用它。当 explanation 浮现出可改进内容时，closing 会把它们 route onward：new-capability ideas 进入 `/ce-ideate`，code-clarity findings 进入 `/ce-simplify-code`，UI/UX polish observations 交给你带入 `/ce-polish`。

## 单独使用

完全 standalone。它不需要 plan，不需要 brainstorm；在任何 repo 中都可用。External topics 甚至不需要 repo。

## Reference

| Argument | Effect |
|----------|--------|
| free text | 按形状分类为 concept、idea、diff 或 recap |
| `diff:<ref-or-range>` | 强制对该 change 使用 diff mode |
| `since:<window\|date\|ref>` | 强制对该 window 使用 recap mode（默认 last 7 days） |
| `output:md` | 生成 Markdown artifact，而不是 HTML |
| *(bare)* | 询问要解释什么 |

## FAQ

**Artifact 会写到哪里？** 在 destination ask 前，它会写到 `/tmp/compound-engineering-<effective-uid>/ce-explain/<run-id>/`；选择 destination 会把它 copy 出去。该 path 是 temporary；想保留就选择 destination。

**这是面向人的 ce-compound 吗？** 大致可以这么理解。Learning 教 repo 的 future work；explainer 教你。二者互补，不互相替代。

**它以后能 quiz me / track what I've learned 吗？** v1 不能。没有 library、spaced repetition 或 progress state。稳定 run-dir layout 是未来 library 可以构建的 hook。

## See Also

- [`/ce-pov`](./ce-pov.md) — 当你需要对外部事物做 verdict，而不是学一课
- [`/ce-compound`](./ce-compound.md) — 当 knowledge 属于 repo，而不只是你的脑中
- [`/ce-ideate`](./ce-ideate.md) — explanation 浮现出的 improvement ideas 会落到这里
