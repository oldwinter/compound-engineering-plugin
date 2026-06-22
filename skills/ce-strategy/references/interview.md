# Strategy Interview（策略访谈）

由 `SKILL.md` 在 Phase 1 开始时加载，并在 Phase 2 中按 section 重新访问。下面每个 section 都一一对应 `strategy-template.md` 中的一个 section。

对每个 section：提出 opening question，按 quality bar 评估答案；当答案落入已命名 anti-pattern 时 push back；并用用户自己的语言捕获最终答案。

## Overall Rules（总体规则）

1. **Ask, don't prescribe（提问，不替用户规定）。** 不要为开放式答案（problem、approach、persona）提供菜单选项。使用 free-form responses。multi-select 只保留给 routing decisions。
2. **Push back once, maybe twice（反推一轮，必要时两轮）。** 如果第一次答案较弱，点明具体问题并提出更尖锐的问题。如果第二次答案仍弱，捕获用户已给出的内容，并在 draft 中注明该 section 值得重新访问。不要让 interview 失控循环。
3. **Quote the user back at them（把用户原话还给用户）。** 挑战答案时，逐字使用用户自己的话。Paraphrasing 会软化挑战，也更容易被忽略。
4. **Keep each answer to 1-3 sentences（每个答案保持 1-3 句）。** 更长答案通常在隐藏模糊之处。如果用户写了一段话，让他们选出最重要的那一句。
5. **Don't leak the anti-pattern names（不要泄露 anti-pattern 名称）。** 用户不需要听到 "that's a vanity metric"；直接问后续更尖锐的问题。

---

## 1. Target Problem（目标问题）

**Opening question（开场问题）：** "这个 product 解决的核心问题是什么 - 以及这个问题难在哪里？"

强答案会说明 target user 所处的具体情境，指出该情境*现在*难在哪里（crux、constraint、某个不容易绕开的东西），并且可证伪；你能想象该问题不存在的状态，并知道差异。

**Anti-patterns and pushback（反模式与反推）：**

- **Goal stated as problem**（"the problem is we need to grow revenue"）-> "那是 goal，不是 problem。现实世界中是什么让这个 goal 难以达成？你要改变谁的 situation？"
- **Vague wish**（"people need better tools for X"）-> "具体是谁的 situation？他们在做什么？他们今天会尝试什么，为什么不奏效？"
- **Symptom, not cause**（"users churn after 30 days"）-> "那是 symptom。用户的世界里发生了什么，让他们不再关心？底层 condition 是什么？"
- **Too broad**（"communication at work is broken"）-> "那是 civilization-scale problem。把它收窄到你真的能影响的 situation - 哪些 users，在做什么，什么时候最痛？"
- **Feature-shaped**（"there's no good way to do [specific workflow] with AI"）-> "那是 missing feature，不是底层 problem。用户想要什么 outcome，而这个 feature 会给他们那个 outcome？"

**Capture:** 一到两句，说明用户情境和 crux。不要包含 solution language。

---

## 2. Our Approach（我们的 Approach）

**Opening question（开场问题）：** "面对这个 problem，你的 approach 是什么 - 哪个 commitment 或 principle 让它变得可处理？"

这是 guiding choice：产品如何竞争或运作，从而让许多下游决策变得更容易。它不是产品本身，也不是 feature list。

强答案是一种 choice（暗示明确*不*追求的 alternatives），既足够 general，可指导很多决策，又足够 specific，可排除一些东西；听起来更像 "we win by [doing X differently]"，而不是 "we do [a list of things]"。

**Anti-patterns and pushback（反模式与反推）：**

- **Fluff / values**（"we're customer-obsessed and move fast"）-> "那些是 values，不是 approach。相比用户可选的其他 products，你在做什么*不同*的事？如果答案适用于任何公司，它就不是你的 approach。"
- **Feature list**（"we're building AI-powered X, Y, and Z"）-> "那是 feature list。什么 underlying bet 让你选择这些 features，而不是其他 features？什么 principle 在指导你 ship 什么？"
- **Product description as approach**（"we use AI to draft replies"）-> "那是 product 做什么，但其中的*选择*是什么？每个 competitor 都会说同样的话。你的 approach 应该说出你在做、而 obvious alternative 没做的东西 - 是 grounding choice、trust-building commitment，还是 workflow bet？你押注了什么他们没有押注的东西？"
- **Goal restated**（"our approach is to be the market leader"）-> "那仍然是 goal。Product 如何获胜？你做了什么 competitors 没做的选择？"
- **Multiple approaches at once**（"we're going deep on enterprise, self-serve, and a consumer app"）-> "选一个作为 guiding approach。其他方向仍然可以推进，但其中一个要组织其余方向。是哪一个？"
- **Doesn't connect to the problem**（problem: "users can't trust AI output"; approach: "build a fast, beautiful UI"）-> "这个 approach 如何解决你命名的 problem？如果二者之间没有线索，那其中一个就是错的。"

**Capture:** 一到两句。理想情况下以 "...so that [outcome tied to the problem]" 结尾或暗示该结构。

---

## 3. Who It's For（服务对象）

**Opening question（开场问题）：** "Primary user 是谁，他们雇用这个 product 来完成什么 job？"

Jobs-to-be-done framing：用户不是人口统计标签，而是处于某种情境中、试图取得进展的人。

强答案会命名一个 primary persona（允许额外 personas，但它们是 secondary），用 role 或 situation 而非 demographic 识别他们，并用动词短语陈述一个具体 job。

**Anti-patterns and pushback（反模式与反推）：**

- **Too many primary personas**（"it's for founders, PMs, engineers, and designers"）-> "如果它面向 everyone，它就不真正面向 anyone。谁最重要？其他人仍然可以受益，但其中一个必须驱动 product decisions。"
- **Demographic framing**（"25-45 year old professionals"）-> "那是 demographic，不是 user。是什么事情让他们拿起这个 product？"
- **Role without situation**（"PMs"）-> "PMs 在做什么？Running a roadmap review？半夜写 spec？说服 skeptical eng lead？Situation 才是 product 发挥作用的地方。"
- **Generic job**（"they want to be more productive"）-> "具体在哪件事上更 productive？他们雇用这个 product 来做*什么*？越具体，下游 product decisions 越好。"

**Capture:** Persona name 加 JTBD sentence。例如："Solo founders running their own roadmap. They're hiring the product to keep strategy and execution aligned without a PM on staff."

---

## 4. Key Metrics（关键指标）

**Opening question（开场问题）：** "哪 3-5 个 metrics 能告诉你这个 approach 是否奏效？"

Metrics 是 feedback loop。糟糕 metrics 会在产品变差时制造进步幻觉。

强答案保持在 3-5 个（不是 10 个），混合 leading 和 lagging（一些每周变化，一些每季度变化），并且如果产品变差，它们应该有可能回退。

**Anti-patterns and pushback（反模式与反推）：**

- **Vanity metrics**（"total signups, total pageviews, cumulative users"）-> "这些都可能在 product 变差时继续上涨。当 users 真正得到 value 时，什么会变化？"
- **Too many**（"here are 12 metrics we watch"）-> "Dashboard 不是 strategy。选 3-5 个你愿意用一个季度押注的 metrics。其他 metrics 告诉你的东西，是这几个无法告诉你的吗？"
- **Outputs, not outcomes**（"ship velocity, deploys per week"）-> "那些衡量 team，不是 product。如果 team velocity 翻倍但 users 不在乎，你会称它为胜利吗？"
- **Can only go up**（"cumulative hours saved"）-> "只能上涨的 metric 告诉你的东西很少。有没有 rate、ratio，或可能 regress 的东西？"
- **Unmeasurable**（"user delight"）-> "具体怎么测？如果你无法定义周二怎么检查它，它就是 aspirational，不是 metric。"

**Capture:** 3-5 项列表。每项带一行定义。如果已知，注明每项在哪里 measured（analytics、DB、qualitative 等）。如果 measurement 未定义，询问："Where does this metric live today? If nowhere, is this something you can start measuring?"

---

## 5. Tracks（工作 Tracks）

**Opening question（开场问题）：** "为了执行这个 approach，你正在投入哪 2-4 条 work tracks？"

Tracks 是 strategy kernel 中 coherent-actions 的一半：从 approach 流出的具体 investment areas。它们不是 feature lists，也不是个人 todo items。每个 track 都是一个命名的 *domain of work*。

强答案保持在 2-4 个（不是 8 个，也不是 1 个），清晰连接回 approach，并且足够宽，让多个 features 能存在于每个 track 内。

**Anti-patterns and pushback（反模式与反推）：**

- **Feature list in disguise**（"track 1: Slack integration; track 2: mobile app; track 3: dark mode"）-> "那些是 features。每个 feature 属于哪个 *investment area*？'Integrations' 可能是一条 track，Slack、Teams 和 Discord 是其中的 candidates。"
- **Too many tracks**（"we have 7 tracks this quarter"）-> "7 条 tracks 会让每条都饿着注意力。哪 3 条是 load-bearing？其他要么 fold in，要么 drop。"
- **Doesn't connect to approach**（approach: "win by being the easiest to onboard"; track: "enterprise SSO"）-> "这条 track 如何服务 approach？如果它是 separate bet，就把它命名为 separate bet。如果它对 onboarding 是 load-bearing，就解释 link。"
- **Too vague**（"improve the product"）-> "每条 track 都是 'improve the product'。具体哪个 investment area 与其他不同？"
- **One track only** -> "只有一条 track 时，就没有真正的 choice。Product 需要擅长的 2-3 件事是什么，它们有什么不同？"

**Capture:** 2-4 个 tracks。每个 track 包含：name、一行 purpose，以及它为什么服务 approach 的简短说明。

---

## 6. Milestones（可选）

**Opening question（开场问题）：** "有没有值得锚定的 dated milestones - launch、fundraise、conference、renewal？如果没有就 skip。"

只捕获 externally visible、真实的 milestones。避免把它变成 internal schedule。

默认跳过。不要推动用户编造 milestones。如果他们命名了若干项，连同日期逐字捕获。

---

## 7. Not Working On（可选）

**Opening question（开场问题）：** "有没有你们明确决定现在*不做*、且值得命名的事？这里记录的是 team 总是容易被诱惑去做的事。"

这是 clarity tool，不是 blocker list。默认跳过。如果用户命名 items，每项一句。不要鼓励长列表。

---

## 8. Marketing（可选）

**Opening question（开场问题）：** "有没有希望 doc 承载的 positioning 或 narrative language - one-liner、tagline、key message？还没有就 skip。"

默认跳过。如有内容，保持在 2-3 行。

---

## After the Interview（访谈之后）

捕获 sections 1-5（以及用户参与的任何 optional sections）后，读取 `strategy-template.md` 并填充。写入前先在聊天中呈现完整 draft。提供一轮 edit。然后写入 `STRATEGY.md`。
