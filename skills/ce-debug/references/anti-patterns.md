# Debugging Anti-Patterns（调试反模式）

形成 hypotheses 前先读取本文件。这些 patterns 描述 debugging 最常见的走偏方式。它们在当下感觉很 productive，这正是危险之处。

---

## Prediction Quality（预测质量）

Prediction requirement 的存在是为了防止 symptom-fixing。Prediction 测试的是对 bug 的理解是否正确，而不只是某个 fix 是否让 error 消失。

**Bad prediction（坏 prediction，重述 hypothesis）：**
> Hypothesis（假设）: The null pointer is because `user` is not initialized.
> Prediction（预测）: `user` will be null when I log it.

这只是重新描述 symptom。如果 hypothesis 正确，它就不可能错，因此无法捕获错误 hypothesis。

**Good prediction（好 prediction，测试 non-obvious 内容）：**
> Hypothesis（假设）: The null pointer is because the auth middleware skips initialization on cached requests.
> Prediction（预测）: Non-cached requests to the same endpoint will NOT produce the null pointer, and the `X-Cache` header will be present on failing requests.

这会测试不同 code path 和不同 observable。如果 prediction 错了（cached 和 non-cached requests 都失败），即使 "initializing user earlier" 恰好修复了 immediate error，hypothesis 也是错的。

**Rule of thumb：** 好的 prediction 会命名尚未查看的东西。如果确认 prediction 只需要查看已经识别出的同一行 code，该 prediction 没有添加 information。

---

## Shotgun Debugging（霰弹式调试）

一次修改多个东西来 "see if it helps."

**How it feels（主观感觉）：** Productive。正在改东西、跑 tests、推进 progress。

**What actually happens（实际发生）：** 如果 bug 消失了，不知道是哪项 change 修好的。如果 bug 仍存在，不知道哪些 changes 相关。引入了 variables，而不是消除它们。

**The fix（修复方式）：** 一个 hypothesis、一个 change、一个 test。如果第一个 change 没有修复，先 revert，再尝试下一个。Changes 应该增进 understanding，而不是在 codebase 中累积。

---

## Confirmation Bias（确认偏误）

把 ambiguous evidence 解释为支持当前 hypothesis。

**How it looks（表现形式）：**
- 某条 log line *可能*支持你的 theory，于是你把它当作 proof
- 修改后某个 test 通过，于是你宣称 bug 已修复，却没有检查该 test 是否实际 exercise failure path
- Error message 略有变化，于是你将其解释为 "getting closer"，而不是识别为不同 failure mode

**The defense（防御方式）：** 宣称 hypothesis confirmed 前，先问："What evidence would DISPROVE this hypothesis?" 如果无法说出什么会改变你的想法，你不是在 testing，而是在 justifying。

---

## "It Works Now, Move On"（现在能用了，就继续）

某个 change 后 bug 不再出现。诱惑是宣布胜利并继续。

**When this is a trap（何时是陷阱）：** 如果无法解释该 change 为什么修复了 bug，即从你的 change 穿过系统到 symptom 的完整 causal chain，可能发生了：
- 修复了 symptom，但 root cause 仍在
- 引入了 mask bug 而非解决 bug 的 change
- 在 timing 上走运（尤其是 intermittent bugs）

**The test（测试）：** 能否不用 "somehow" 或 "I think" 向别人解释 fix？如果不能，root cause 尚未 confirmed。

---

## 即将 shortcut 的信号

这些感觉像 reasonable next steps。它们是 investigation 正被跳过的 warning signs。

**先提出 fix，再解释 cause。** 如果 "I think we should change..." 先于 "the root cause is..." 出现，暂停。Fix 可能是对的，但没有 confirmed causal chain 就无法知道。先解释 cause。

**没有 new information 就尝试下一次。** 2-3 个 hypotheses 失败后，如果没有从 failures 中学到新东西就尝试第 4 个，这不是 debugging，而是带着越来越多 frustration 的 guessing。停止，并诊断 previous hypotheses 为什么失败（见 smart escalation）。

**没有 evidence 的 certainty。** 在阅读 relevant code 前就觉得 "I know what this is"。Experienced developers 有强 pattern-matching instincts，而且正确频率足以让它们在错误时变得危险。即使自信，也要读 code。

**Minimizing the scope。** "It is probably just..." 中的 "just" 暗示 problem 很小。Small problems 不会抵抗 2-3 次 fix attempts。如果仍在 debugging，它就不是 "just" anything。

**把 environmental differences 当作 irrelevant。** 当某物在一个 environment 中工作、在另一个中失败，environments 之间的差异就是 investigation。不要 dismiss；systematically compare 它们。

---

## Smart Escalation Patterns（聪明升级模式）

当 2-3 个 hypotheses 已测试但没有 confirmed，问题不是 "I need hypothesis #4." 问题通常是以下之一：

**Different subsystems keep appearing。** Hypothesis 1 指向 auth，hypothesis 2 指向 database，hypothesis 3 指向 caching。此 scatter pattern 表示 bug 不在任一单独 subsystem 中，而在它们之间的 interaction，或横跨它们的 architectural assumption 中。这是 design problem，不是 localized bug。

**Evidence contradicts itself。** Logs 说 X 发生了，但 code 让 X 不可能发生。Test 以 error A 失败，但产生 error A 的 code path 无法从 test 到达。当 evidence 矛盾时，mental model 是错的。退一步。不带任何关于它做什么的 assumptions，从 entry point 重新读 code。

**Works locally, fails elsewhere。** 最常见 causes：environment variables、dependency versions、file system differences（case sensitivity、path separators）、timing differences（faster/slower machines）和 data differences（test fixtures vs production data）。Systematically compare 两个 environments，而不是直接 debug code。

**Fix works but prediction was wrong。** 这是最危险的 pattern。Bug 看似修复了，但识别出的 causal chain 是错的。真正 cause 仍然存在，并会再次浮现。继续 investigation：找到的是 coincidental fix，不是 root cause。
