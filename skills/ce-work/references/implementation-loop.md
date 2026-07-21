# 实现循环

1. **任务执行循环**

按优先级处理每个 task：

当选定 engine 为 cross-model execution 时，本循环仍负责 unit ordering、evidence selection、actual-scope inspection、authoritative verification 和 incremental canonical commits，但 worker authoring 遵循 `references/cross-model-execution.md` 中的 serial external-unit protocol。Detached process completion 只是 authoring evidence；controller 记录 host-owned canonical commit 之前，不得将 task 标记为完成。任何 preserved 或 restoration-blocked unit 都会在 fallback、retry 或下一个 unit 前停止本循环。

```text
while (tasks remain):
  - 将 task 标为 in-progress
  - 读取 plan 引用或 Phase 0 discovery 发现的文件
  - **若 unit 工作已存在且符合 plan intent**（文件已有预期 capability，或当前代码已满足 unit 的 `Verification` criteria），说明它可能已在之前的 branch/session ship。验证匹配后将 task 标为完成并继续，不要静默重新实现
  - 在 codebase 中查找类似 pattern
  - 查找待修改 implementation files 对应的既有 test files（Test Discovery，见下文）
  - 在改变 behavior 前为 task 选择 evidence strategy：使用既有 failing test；更新或强化 existing test；新增 failing test；增加 characterization coverage；或记录 deliberate no-test exception 与 replacement verification
  - 对 behavior-bearing change，只要当前 code/test surface 现实可行，即使 plan 没有 `Execution note`，也默认 test-first 或 characterization-first
  - Evidence strategy 要求 pre-implementation proof 时，现在创建/更新/强化 test 或 characterization coverage，并在修改 production code 前确认 expected failure 或 baseline capture
  - 按 existing conventions 实现
  - 增加、更新或删除与 implementation change 匹配的其余 tests（见 Test Discovery）
  - 运行 System-Wide Test Check（见下文）
  - 修改后运行 tests
  - 评估 testing coverage：该 task 是否改变 behavior？若是，是否检查 existing tests，并新增、更新、强化 test，或有意识地保持不变且说明原因？若未新增/修改 tests，理由是否明确（如 pure config、无 behavioral change、manual-only surface）并配有 replacement verification？
  - 记录 task verification evidence：behavior-change signal、检查过的 existing tests、added/changed/unchanged tests、适用时观察到的 red failure 或 characterization、verification run，以及任何 exception reason
  - 将 task 标为 completed
  - 评估 incremental commit（见下文）
```

对于 parallel wave，每个 canonical result 都会让循环停在 host-owned integration stop。检查 actual result 而不是 declared scope；针对推进后的 tree 重新判断 independence，并按 committed prerequisites 重新计算 readiness。受影响的 dependents 保持 queued。只有 failed apply/verification 已精确恢复且 prior integration lock 已释放，不受影响的 sibling 才能继续。应在新 base 上重新 dispatch stale/colliding result、明确解决冲突，或 serial 完成；不要把 conflict-free apply 当成 semantic proof。反复 collision 或 broad edits 会禁用本次 run 的后续 parallel waves。

Unit 带有 `Execution note` 时，应遵循其 intent，不要匹配固定词表。若 note 要求 proof-first，在实现 unit 前先编写或定位相关 failing test；要求 characterization 时，改变前捕获 existing behavior；要求避开 unit coverage 时，运行指定 replacement verification 并记录普通 tests 不适合作为 proof 的原因。没有 `Execution note` 时，根据 code/test discovery 作同样判断：behavior 改变且 seam 现实可行时升级为 proof-first 或 characterization-first；只有 task 非 behavioral 或 exception 经过明确判断时才 pragmatically 继续。

Execution evidence guardrails：

- Proof-first 时不要在同一步编写 test 与 implementation。
- 修改 implementation 前，不得跳过“新增或修改的 test 因预期原因失败”的验证。
- Proof-first 时不要超出当前 behavior slice 过度实现。
- Existing test 是正确归属时，不要新增重复 regression test；更新或强化该 test，然后在改 code 前观察 failure。
- Trivial rename、pure configuration、pure styling、generated artifact 和 manual-only surface 可跳过 proof-first discipline，但要记录原因与 replacement verification 后继续。

**Test Discovery**：修改文件前，找到它的 existing test files（搜索 import、reference 或与 implementation filename 有相同 naming pattern 的 test/spec files）。Plan 指定 test scenarios/files 时，从那里开始，再检查 plan 可能遗漏的额外 coverage。Implementation files 的变化应伴随对应 test updates：新 behavior 用 new test，changed behavior 修改 test，deleted behavior 删除或更新 test。

**Evidence Strategy**：Test discovery 决定 proof 应放在哪里：

| 情况 | 操作 |
|---|---|
| Existing test 已因 intended behavior 失败 | 将其作为 red evidence，不要添加 duplicate test |
| Existing test 覆盖 contract，但断言 old/wrong expectation | 更新该 test，运行并在 implementation 前确认 expected failure |
| Existing test 过度 mock 或遗漏真实 chain | 有边界地强化/重构，然后确认它因正确原因失败 |
| 没有 existing test 覆盖 behavior | 添加能证明 behavior slice 的最小 focused failing test 或 characterization test |
| Testing 不适合该 task | 在 task 完成前记录 no-test exception 与 replacement verification |

**Test Scenario Completeness**：为 feature-bearing unit 编写 tests 前，检查 plan 的 `Test scenarios` 是否覆盖所有适用类别。若缺失，或 scenario 含糊（例如只说“validates correctly”，没有 input 和 expected outcome），根据 unit context 补充：

| 类别 | 适用场景 | 缺失时如何推导 |
|---|---|---|
| **Happy path** | 所有 feature-bearing unit | 从 unit Goal/Approach 读取 core input/output pairs |
| **Edge cases** | Unit 存在 meaningful boundaries（input、state、concurrency） | 识别 boundary values、empty/nil inputs 和 concurrent access patterns |
| **Error/failure paths** | Unit 存在 failure modes（validation、external calls、permissions） | 枚举应拒绝的 invalid inputs、应执行的 permission/auth denials，以及应处理的 downstream failures |
| **Integration** | Unit 跨 layer（callbacks、middleware、multi-service） | 识别 cross-layer chain，编写不使用 mock 的 scenario 来执行它 |

**System-Wide Test Check**：将 task 标为完成前，停下来检查：

| 问题 | 处理方式 |
|---|---|
| **运行时会触发什么？** Callback、middleware、observer、event handler，向外追踪两层。 | 读取实际 code（不是 docs），检查所触及 model 的 callback、request chain middleware 和 `after_*` hooks。 |
| **Tests 是否执行真实 chain？** 若所有 dependency 都被 mock，test 只证明 isolated logic，不能证明 interaction。 | 至少写一个使用真实 object 贯穿完整 callback/middleware chain 的 integration test；不要 mock 发生交互的 layers。 |
| **Failure 会留下 orphaned state 吗？** Code 在 external service 前持久化 DB row、cache 或 file 时，service failure 会怎样？Retry 会重复吗？ | 用真实 object 追踪 failure path。若 risky call 前已创建 state，测试 failure 会 cleanup，或 retry 是 idempotent。 |
| **还有哪些 interface 暴露它？** Mixin、DSL、alternative entry point（Agent、Chat、ChatMethods）。 | 在相关 class 中搜索 method/behavior；需要 parity 时现在补齐，不要留 follow-up。 |
| **各 layer 的 error strategy 一致吗？** Retry middleware、application fallback、framework error handling 会冲突或 double execution 吗？ | 列出每层的具体 error classes，确认 rescue list 与 lower layer 实际抛出的内容匹配。 |

**何时跳过：** 没有 callback、state persistence、parallel interface 的 leaf-node change。Purely additive change（new helper method、new view partial）只需快速确认“nothing fires, skip”。

**最重要的场景：** 触及带 callback 的 model、包含 fallback/retry 的 error handling，或通过多个 interface 暴露的 functionality。
