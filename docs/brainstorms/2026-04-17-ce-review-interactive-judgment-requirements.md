---
date: 2026-04-17
topic: ce-review-interactive-judgment
---

# ce:review Interactive Judgment Loop（交互式判断循环）

## 问题框架

`ce:review` 的 Interactive mode 会生成 report、auto-apply `safe_auto` fixes，然后提出一个 bucket-level policy question，将所有剩余 `gated_auto` 和 `manual` findings 作为一组处理。findings 本身以 pipe-delimited table 呈现，并按 severity 分组。

两个问题反复出现：

1. **Judgment calls 很难做。** 当 finding 需要 human judgment 时，table row 很少给出足够 context 让用户有信心决策。用户被要求 approve 或 defer 一整 bucket findings，但他们并没有逐条理解。
2. **High-volume feedback 无法推理。** 一个产生 8-12 findings 的 review 会变成滚动 table，用户无法有效参与。没有办法对 individual items 做有意义回应，唯一选择是“approve the whole bucket”或“defer the whole bucket”。

结果是 Interactive mode 大多退化为 rubber-stamping 或 wholesale deferral。`gated_auto` / `manual` routing 中的 "judgment" 从未真正按 per-finding 被执行。

## 需求

**`safe_auto` fixes 之后的 routing**

- R1. `safe_auto` fixes 被应用后，如果仍有任何 `gated_auto` 或 `manual` findings，Interactive mode 呈现一个 four-option routing question，替代当前 bucket-level policy question。
- R2. 如果 `safe_auto` 后剩余 `gated_auto` / `manual` findings 为零，则跳过 routing question。Interactive mode 在进入 final-next-steps flow 前显示简短 completion summary（例如 "All findings resolved — N `safe_auto` fixes applied."）。
- R3. routing question 只有在 detection high-confidence 时才 inline 命名检测到的 tracker（例如 "File a Linear ticket per finding"），也就是 tracker 在 `CLAUDE.md` / `AGENTS.md` 或等价 project documentation 中被明确命名。detection lower-confidence 时，label 使用 generic form（例如 "File an issue per finding"），agent 在执行任何 ticket creation 前向用户确认 tracker。
- R4. 四个 routing options（路由选项）是：
  - (A) `Review each finding one by one — accept the recommendation or choose another action`（逐条 review 每个 finding，接受 recommendation 或选择其他 action）
  - (B) `LFG. Apply the agent's best-judgment action per finding`（LFG：按 agent 对每条 finding 的最佳判断执行 action）
  - (C) `File a [TRACKER] ticket per finding without applying fixes`（不应用 fixes，为每条 finding 创建一个 [TRACKER] ticket）
  - (D) `Report only — take no further action`（仅报告，不采取进一步 action）
- R5. Routing option C 是 batch-defer shortcut：它为每个 pending `gated_auto` / `manual` finding filed tickets，不做 per-finding confirmation。walk-through 自己的 Defer option 是 per-finding；C 会跳过该 interactivity。

**Per-finding walk-through（逐条 finding 演练，routing option: Review）**

- R6. 当用户选择 walk-through 时，findings 按 severity order（P0 first）一次呈现一个。每个 per-finding question 以 position indicator 开头（例如 "Finding 3 of 8 (P1):"），让用户判断还剩多少 decisions。
- R7. 每个 per-finding question 包含：bug 做了什么的 plain-English statement、severity、confidence、proposed fix（diff 或 concrete action），以及为什么该 fix 正确的简短 reasoning（可用时 grounded in codebase patterns）。
- R8. Per-finding options：
  - `Apply the proposed fix`（应用 proposed fix）
  - `Defer — file a [TRACKER] ticket`（延后处理，创建 [TRACKER] ticket）
  - `Skip — don't apply, don't track`（跳过，不应用也不跟踪）
  - `LFG the rest — apply the agent's best judgment to this and remaining findings`（剩余部分交给 LFG：对当前和剩余 findings 应用 agent 的最佳判断）
- R9. 对没有 concrete fix 可应用的 findings（advisory-only），option A 变为 `Acknowledge — mark as reviewed`。Defer、Skip 和 LFG the rest 保持不变。
- R10. per-finding question 上的 "Override" 表示选择另一个 preset action（用 Defer 或 Skip 代替 Apply）；不做 inline freeform custom fix authoring。想要 custom fix 的用户选择 Skip，并在 flow 外手动编辑。

当只剩一个 `gated_auto` / `manual` finding 时，walk-through wording 适配 N=1（例如 "Review the finding" 而不是 "Review each finding one by one"），并 suppress `LFG the rest`，因为不存在 subsequent findings 可 bulk-handle。

**LFG path（LFG 路径，routing option: LFG）**

- R11. LFG 应用 agent 在 walk-through 中会推荐的 per-finding action：Apply、Defer 或 Skip。没有单独 confidence threshold；confidence 已经影响 agent 推荐什么。top-level LFG option 覆盖每个 `gated_auto` / `manual` finding；walk-through 的 `LFG the rest`（R8）覆盖当前 finding 和所有尚未 decided 的 findings。两者共享同一 per-finding mechanic 和同一 bulk preview（R13-R14）。
- R12. LFG（以及 `LFG the rest`）在执行后生成单一 completion report，至少包含：
  - per-finding entries，含 title、severity、action taken（Applied / Deferred / Skipped / Acknowledged）、Deferred entries 的 tracker URL 或 in-session task reference，以及 Skipped entries 的 one-line reason（grounded in finding confidence 或 content）
  - 按 action 汇总的 counts
  - 所有 failures 显式 call out（fix application failed、ticket creation failed）
  - 现有 end-of-review verdict

**Bulk action preview（批量动作预览）**

- R13. 执行任何 bulk action 前，top-level LFG（routing option B）、top-level File tickets（routing option C）或 walk-through `LFG the rest`（R8），Interactive mode 都呈现 compact plan preview，并询问用户用 `Proceed` confirm 或用 `Cancel` back out。两个 options。preview 中不做 per-item decisions；per-item decisioning 是 walk-through 的职责。
- R14. preview content 按 agent 计划执行的 action 对 findings 分组（例如 `Applying (N):`、`Filing [TRACKER] tickets (N):`、`Skipping (N):`、`Acknowledging (N):`）。每个 finding 在其 bucket 下占一行，写成 framing-quality bar（R22-R25）的压缩形式：observable behavior over code structure，除非定位 issue 需要，否则不出现 function 或 variable names。对于 walk-through `LFG the rest`，preview 只覆盖 remaining findings，并注明多少已经 decided（例如 "LFG plan — 5 remaining findings (3 already decided)"）。

**Recommendation tie-breaking（推荐动作平局裁决）**

- R15. 当 merged findings 携带来自 contributing reviewers 的 conflicting recommendations（例如一个 reviewer 说 Apply，另一个说 Defer）时，synthesis 使用 `Skip > Defer > Apply` 顺序选择最 conservative action，使 LFG 和 walk-through behavior deterministic，并可 post-hoc audit。

**Defer behavior 和 tracker detection（Defer 行为与 tracker 检测）**

- R16. Defer actions（来自 walk-through、LFG path 或 routing option C）会在 project tracker 中 file ticket。
- R17. tracker detection 的 SKILL.md instruction 保持 minimal：agent 从显而易见的 documentation（主要是 `CLAUDE.md` / `AGENTS.md`）判断 project tracker，而不是枚举 checklist 要读哪些文件。
- R18. 当 tracker detection uncertain 时，agent 优先 durable external trackers，而不是 in-session-only primitives，并在执行任何 Defer action 前向用户说明 fallback behavior 和 durability trade-off。
- R19. 如果 Defer action 在 ticket-creation time 失败（API error、auth expiry、rate limit、malformed body），agent inline surface failure，并提供：retry、fallback 到下一个 available sink，或将 finding 转为 Skip，并在 completion report 中记录 error。不允许 silent failure。
- R20. 当没有 external tracker 可检测，且当前 platform 没有 harness task-tracking primitive（例如 CI contexts、没有 task binding 的 converted targets）时，菜单不提供 Defer option。routing question 和 walk-through 省略 Defer paths，并由 agent 告知用户原因。
- R21. internal `.context/compound-engineering/todos/` system **不是** fallback chain 的一部分。它正在 deprecation path 上，本 work 不得扩展它。

**Framing quality（跨领域 framing 质量）**

- R22. 每个描述 finding 的 user-facing surface，包括 per-finding walk-through questions、LFG completion reports 和 Defer actions filed ticket bodies，都用 plain English 解释 problem 和 fix，使读者无需打开文件也能理解。
- R23. framing 以 bug 的 *observable behavior* 开头（用户、attacker 或 operator 会看到什么），而不是 code structure。Function 和 variable names 只在 reader 需要它们来定位 issue 时出现。
- R24. framing 解释 *why the fix works*，不只是解释它改了什么。当 codebase 中存在 similar pattern 时，reference 它，让 recommendation grounded。
- R25. framing 保持 tight：大约两到四句，加上用于 grounding 的最少 code。更长 framing 是 regression。

*同一 finding 的 illustrative pair：weak vs. strong framing：*

> **Weak（较弱，code-citation style）：**
> *orders_controller.rb:42 — missing authorization check. Add `current_user.owns?(account)` guard before query.*
> 中文含义：`orders_controller.rb:42` 缺少 authorization check；在 query 前添加 `current_user.owns?(account)` guard。
>
> **Strong（较强，framed for a human）：**
> *Any signed-in user can read another user's orders by pasting the target account ID into the URL. The controller looks up the account and returns its orders without verifying the current user owns it. Adding a one-line ownership guard before the lookup matches the pattern already used in the shipments controller for the same attack.*
> 中文含义：任何已登录用户都能把目标 account ID 粘到 URL 中读取他人的 orders；controller 查找 account 并返回 orders，却没有验证 current user 是否拥有它。在 lookup 前加一行 ownership guard，与 shipments controller 已用于同类攻击的 pattern 一致。

- R26. R22-R25 依赖 reviewer personas 产出 framing-suitable `why_it_matters` 和 `evidence` fields。如果 planning-phase sample 显示现有 persona outputs 达不到这个 bar，则 persona prompt upgrades（或 synthesis-time rewrite pass）与本 work 同时或更早落地。

**Mode boundaries（mode 边界）**

- R27. 只有 Interactive mode 改变 behavior。Autofix、Report-only 和 Headless modes 保持不变。
- R28. 现有 post-review "final next steps" flow（push fixes / create PR / exit）只在有一个或多个 fixes 被应用到 working tree 时运行。在 routing option C（File tickets per finding）和 option D（Report only）之后跳过；当 LFG 或 walk-through 完成但没有任何 Apply action 时也跳过。

## 成功标准

- 面对一个 high-stakes finding 的用户，无需重新阅读文件也能对 fix 有信心地决策。
- 面对 8+ findings 的 review，用户有清晰路径逐项参与，或用一次 keystroke trust agent judgment。
- 用户开始 walk-through 后注意力耗尽时，可以 mid-flow bail 到 bulk action，而不会丢失后面的 findings。
- Deferred findings 落入团队实际 tracker，而不是会被遗忘的 `.context/` file。
- LFG runs 感觉 honest：completion report 清楚说明什么被 applied 以及为什么，让用户能 post-hoc audit agent judgment。
- 对有三个或更多 `gated_auto` / `manual` findings 的 reviews，Review 被选择的比例有意义；LFG 不应过度成为 default，因此 intervention 真正提升 engagement，而不是给 rubber-stamp 换名字。
- Interactive mode 的 first-time user 在选择前就理解哪些 routing options 会产生 external side effects（fixes applied to working tree、tickets filed in external tracker），无需 external docs。

## 范围边界

- 不新增 `ce:fix` skill。所有变更都位于 `ce:review` 内。
- 本 work 不修改 findings schema、persona agents、merge/dedup pipeline 或 autofix-mode residual-todo creation。
- walk-through 中不做 inline freeform fix authoring。walk-through 是 decision loop，不是 pair-programming surface。
- "approve the fix's intent but write a variant" case 在 v1 中明确不支持。处于该情形的用户选择 Skip，并在 flow 外手动编辑；如果想跟踪 variant，手动 file ticket。
- 不修改 Autofix、Report-only 或 Headless mode behavior。
- pre-menu findings table format（pipe-delimited、severity-grouped）有意保持不变。walk-through 是 high-volume feedback 的 engagement surface；table 只需要足够 scannable，能到达 routing menu。如果需要，重构 table format 是独立 follow-up。
- phasing out internal `.context/compound-engineering/todos/` system 以及 `/todo-create`、`/todo-triage`、`/todo-resolve` skills 是长期方向，但不纳入本 redesign。单独 follow-up 覆盖该 cleanup。
- 当前 bucket-level policy question wording（`Review and approve specific gated fixes` / `Leave as residual work` / `Report only`）会被移除，并由 four-option routing question 替代。不提供 backward-compatibility shim。

## 关键决策

- **扩展 Interactive mode，不新增 skill。** Review 和 fix 保持 colocated；review artifact、routing metadata 和 fixer subagent 已经接线。单独 `ce:fix` skill 会 split state，并增加 reintegration cost，收益不明确。
- **Upfront four-option routing，而不是藏在 walk-through 中的 escape hatch。** LFG 和 tracker-deferral 对许多 reviews 是合法 primary intents，不是 fallbacks。将它们作为 walk-through 的 peers 呈现，更符合用户真实 engagement 方式。
- **LFG = auto-accept recommendations，而不是单独 confidence policy。** 保持 mental model 简单。Confidence 已经嵌入 agent 对某个 finding 推荐 Apply、Defer 或 Skip 的过程。
- **Tracker detection 是 reasoning-based，不是 rote。** Agents 足够聪明，会阅读 obvious documentation。SKILL.md 中枚举文件 checklist 是纯 rationale-discipline tax，并把 agent 限制在我们恰好列出的 sources 上。
- **Harness task tracking 是 last-resort fallback，不是 internal todos。** 与 internal todo system 的 deprecation direction 对齐。诚实说明 in-session tasks 不会在 session 之后存活。
- **walk-through 中的 Override = 选择另一个 preset action。** 不提供 freeform custom fixes。保持 interaction 是 decision loop，避免变成 pair-programming transcript。想要 custom fixes 的用户 Skip 并手动编辑。
- **Internal-todos deprecation 对一些用户会带来 durability regression。** 一部分用户今天把 `.context/compound-engineering/todos/` 当作 persistent defer storage；从 fallback chain 移除它意味着这些用户会失去 Defer actions 的 cross-session durability，直到他们在 `CLAUDE.md` / `AGENTS.md` 中记录 tracker，或更大的 phase-out 落地。这项 trade 被承认且 deliberate，不是 silent regression；mitigation 是 Scope Boundaries 中提到的单独 phase-out cleanup。

## 依赖与假设

- cross-platform blocking question tool（`AskUserQuestion` / `request_user_input` / `ask_user`）最多 4 options。所有 menu designs 都遵守这一点。
- flow 中每个 menu 的 option labels（routing question、per-finding question、Stop-asking follow-up）必须 self-contained，为 agent 使用 third-person voice，并 front-load distinguishing word，使其在隐藏 description text 的 harnesses 中被截断时仍可辨识。
- walk-through 在每次 decision 后，将 per-finding decisions 写入 run artifact（例如 `.context/compound-engineering/ce-review/<run-id>/walkthrough-state.json`），让 partial progress 可 post-hoc inspect。正式 cross-session resumption 不在 scope 内。
- findings 已携带足够 detail（title、severity、confidence、file、line、autofix_class、suggested_fix、why_it_matters、evidence）来支持 framing requirements。如果某些 reviewers 不能可靠产出 plain-English `why_it_matters`，framing quality bar 可能需要升级这些 personas 的 prompts；下方标为 planning question。
- 现有 per-run artifact directory（`.context/compound-engineering/ce-review/<run-id>/`）和 fixer subagent flow 仍作为 applying fixes 的底层 mechanics。
- 现有 Stage 5 merge pipeline 产生的 merged finding set 只携带 merge-tier fields；detail-tier fields（`why_it_matters`、`evidence`）存在磁盘上的 per-agent artifact files 中。per-finding walk-through 会读取 contributing reviewer 的 artifact file（`.context/compound-engineering/ce-review/<run-id>/{reviewer}.json`）来 enrich 每个 merged finding，使用与 headless mode 已用的相同 `file + line_bucket(line, +/-3) + normalize(title)` matching。没有 artifact match 时（merge-synthesized finding 或 artifact write 失败），walk-through 降级为 title 加 `suggested_fix`，并 note 该 gap。
- four-option routing design 基于 cross-platform question tool 的 4-option cap。未来第五个 primary routing intent 将需要替换现有 option、chain follow-up question，或给 platform cap 施压；该 design 不为此 case 提供 pressure relief。
- Autofix mode 在本 redesign 中继续将 residual actionable work 写入 `.context/compound-engineering/todos/`，而 Interactive-LFG 和 Defer actions 按 R16-R21 route 到 external trackers。这一 temporary divergence 被承认；将 autofix mode 的 residual sink 与新的 tracker routing 对齐，是 Scope Boundaries 中引用的独立 cleanup work。

## 待解决问题

### Planning 前解决

无。所有 product decisions 已完成。

### 推迟到 Planning

- [Affects Problem Frame][Needs research] 抽样近期 `.context/compound-engineering/ce-review/<run-id>/` run artifacts，以确认 Problem Frame 所称的 rubber-stamping / wholesale-deferral failure mode。如果主导 failure 是其他东西（用户在 bucket question 前就 disengage，report 本身 unreadable），four-option routing 可能不是正确 intervention。
- [Affects R22-R26][Technical] reviewer personas 目前是否可靠产出 plain-English `why_it_matters`，或者 framing bar 是否需要 prompt upgrades 和/或 synthesis-time rewrite pass？Planning 应检查 recent review artifacts sample，再决定 R22-R25 是否可在没有 persona changes 的情况下达成。
- [Affects R18][Technical] 每个 target platform 上 fallback chain 的具体 sequencing（例如通过 `gh` 使用 GitHub Issues vs harness task tracking，如何便宜检测 `gh` availability）有意不写入 requirements，以保持 detection principle-based。Planning 解析每个 target environment 的具体 sequencing 和 detection heuristics。
- [Affects R18][Technical] 如果没有 documented tracker，且当前 platform 上 `gh` 不可用，fallback 到 harness task tracking 应 silent 发生，还是 agent 每 session 确认一次？默认 expectation：确认一次，让用户不会对 in-session-only behavior 感到意外。
- [Affects R6][Technical] walk-through 是否严格按 severity order（current default）呈现 findings，还是先按 file grouping，再在每个 file 内按 severity。许多 findings 触及同一文件时，file-grouping 可能更 coherent，但它会与 `Stop asking` semantics 交互（file-grouped bulk-accept 与 severity-first bulk-accept 应用于不同 findings）。
- [Affects R7][Needs validation] 每个 per-finding question 中展示 reviewer persona names（例如 `julik-frontend-races-reviewer`）是否有助于 user judgment，还是噪声。如果 validation 显示是噪声，从 R7 required content 中省略 reviewer attribution，或替换为短 category label。

## 下一步

`-> /ce:plan` 用于 structured implementation planning（结构化实现规划）
