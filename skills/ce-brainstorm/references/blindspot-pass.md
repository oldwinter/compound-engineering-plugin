# Blindspot Pass（盲区梳理）

这个 skill 的 interview 机制假设用户能够评估它所问的内容。当用户不了解某个 territory 时，这个假设会失效：问题提取到的是猜测，而不是 requirements。Blindspot pass 把用户的 unknown unknowns 转成 known unknowns：它映射 flagged territory 的 decision surface，让用户在现在已经能评估的 options 中选择，而不是凭空生成答案。

Blindspot pass 是 decision map，不是 tutorial。检查每个 item：它最终必须导向用户会在本次 brainstorm 中决定、delegate 或明确 defer 的事项。不会影响任何 decision 的 item 只是 domain trivia，应删除。

## 触发条件

两种 signal 会 arm 该 pass：

- **Opening signal**：用户明确表明自己缺少该 domain 或 topic 所涉及 territory 的 working knowledge，例如 "I know nothing about X"、"never touched the auth modules"、"I don't know what's possible here"、"I don't know what I should be asking"。
- **Mid-dialogue signal**：用户对需要 domain judgment 的问题连续两次回答 "I don't know"、"whatever you think"、"you decide" 之类的内容，显示他们 *无法评估* 问题实质。

**无法评估 vs. 尚未决定：防止过度触发的 guard。** 能理解 options、只是还没选定的用户需要正常 interview，而不是 teaching pass。只有 signal 显示用户完全无法权衡 options 时才提供。向仅仅犹豫未决的 domain expert 提供 blindspot pass 就是 failure mode；当 signal 存在歧义时，继续 interview。

## Gate

Gate **按 territory 限定，而不是覆盖整个 conversation**。关于用户自身 problem、users、evidence 和 priorities 的问题正常进行，因为用户才是这些内容的 authority。Gate 只在进入 *flagged territory* 的第一个 substantive question 之前触发；flagged territory 指用户无法评估的 domain 或 system area。

绝不要静默切换为教学。Offer 必须是 blocking question（Interaction Rule 4），每个 flagged territory 只问一次。如果用户拒绝，不要在该 territory 重复 offer；按正常 rigor-probe discipline，用 recommended defaults 填补 gaps，并记录为 explicit assumptions。

**Non-interactive degradation：** 在没有用户可以回答的 pipeline 或 headless run 中，绝不触发 offer。将 flagged territory 视为用户已拒绝 offer：把 recommended defaults 记录为 explicit assumptions，然后继续。

## Offer 文案

使用下列文案，并替换 territory：

> 这件事的一部分落在你已标记为不熟悉的领域（<territory>）。我可以先映射 decision surface：你会面对哪些 decisions、每个 decision 有哪些 realistic options，以及我会默认选什么，让你做的是选择而不是猜测。也可以继续用问题推进，由我用 defaults 填补 gaps，并将它们记录为 assumptions。你更倾向哪一种？

两个 options：**先映射该领域** / **继续提问**（defaults 记为 assumptions）。

## 构建 map

编写前先做 grounding：

- **In-repo territory**（codebase 中的 module、subsystem 或 pattern）：使用 Phase 1.1 grounding，即 scout dossier 和 targeted reads。如果 scout 尚未返回，等待它，或直接读取相关 area；不要只靠 model knowledge 映射 in-repo territory。
- **External domain**（repo 外的 technology、practice 或 field）：使用当前可访问的 web tools 做 research。完全没有 web tool 时可以使用 model knowledge，但每个这类 item 都必须标记 **未验证：来自 model knowledge，未对照当前 sources 检查**。

**Territory 会关闭那些本就不该问用户的问题。** 在把 item 放进 map 前，检查 codebase 或 sources 是否已经回答了它。如果已回答，它就不是 decision：将问题与找到的答案、citation 一起作为 settled ground 展示，而不是做成 option menu。Map 只保留真正需要用户 judgment 的内容。但在屏幕外关闭的问题不算关闭；由 territory 回答的 items 必须显示，绝不静默 resolve。

Grounding 时要专门寻找 hazards：会静默造成伤害的事情（wrong-by-default data、会让 bad rows 通过的 filters、会损坏 output 的 escaping）；code 强制但没有 doc 说明的 unwritten conventions；以及对同一任务曾经 half-built 或 reverted 的 attempts。前一次 attempt 失败的原因通常就是 landmine。

Map 包含 **3-7 个 items**，直接在 chat 中提供。每个 item 都必须是用户将面对的 **decision**，或者约束某个 decision 的 **hazard**，且最多 4 行。超过这个长度就是在教学，而不是 framing decision；应精简：

- 用用户的 vocabulary 说明 decision 或 hazard 是什么。当 term of art 不可避免时，定义它，并说明了解该词后用户能够决定什么。
- 说明它 *为什么对当前 topic 重要*。将其绑定到用户说过的内容，而不是笼统谈论该 domain；hazard 需说明它会如何改变 task。
- 仅限 decisions：列出 2-4 个 realistic options，每个 option 用一个 clause 说明当前最重要的 trade-off。只列出用户选择后你仍会 defend 的 options。用 map 自己已经排除的 options 凑满 menu，得到的是 strawman，而不是 choice。已排除的 option 应作为 why-it-matters 中的一个 clause（例如 "subdomain isolation is closed — single-domain config"），绝不放进 menu。
- 仅限 decisions：直接说明 recommended default。

Hazard 不是投票，因此没有 option menu，也没有 default。当 hazard 迫使用户在多个真正可行的 mitigations 中选择时，该 choice 应成为独立的 decision item，hazard 则是它的 why-it-matters。

Highest-stakes item 应排在最前，而不是获得更长篇幅。Depth 应放在用户选中后的 walk-through 中，而不是 map 里。

按用户答案对 product shape 的改变幅度排序：architecture-changing decisions 在前，hazards 和 reversible choices 在后。不要为凑数填到 7 个；只有三个真实 decisions 的 territory 就只需三个 items。

## 重新进入 dialogue

Map 展示完后，询问 **一个** multi-select blocking question（合法的 Rule 3 compatible set）：*"这些项目中，你想现在逐一讨论哪些？任何未选项都会采用 recommended default，并记录为 explicit assumption。"*

然后：

- **Selected decisions**：每 turn 讨论一个，使用基于已知信息的 single-select menus。Pass 之后，即使 Rule 5 通常更偏好 open-ended，对 mapped options 使用 menu 也是正确形式：options 不再引导答案，而是帮用户回忆刚刚了解的内容。
- **Unselected decisions 和 hazards**：把 recommended default（或 hazard constraint）记录为 explicit assumption，方式与记录 rigor-probe uncertainty 相同：software route 写入 Product Contract，universal route 写入 synthesis。
- **"我想真正学会这一项"**：提供把该 item handoff 给 `ce-explain` skill 的选项（只 offer，不要 auto-fire）。用户返回后恢复 brainstorm，或在等待期间用 default 继续。

Pass 绝不自行 resolve decisions，也绝不取代 dialogue。它只运行一次，把 blindspots 转成用户能回答的问题，然后让正常 flow，即 rigor probes、approaches 和 synthesis，在充分了解的基础上继续。

## Universal route（通用路由）

Pass 在 non-software route 上以相同规则适用，例如陌生的 craft、market 或 process："I need to grade this video but don't know what color grading is"。Grounding 来自 web research 或已标记的 model knowledge；delegated defaults 作为 named assumptions 写入 wrap-up synthesis，而不是 Product Contract。
