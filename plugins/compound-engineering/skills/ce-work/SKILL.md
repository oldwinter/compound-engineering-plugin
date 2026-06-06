---
name: ce-work
description: 在保持质量并完成 features 的同时高效执行 work
argument-hint: "[Plan doc path 或 work 描述。留空则自动使用最新 plan doc]"
---

# Work Execution Command（工作执行命令）

在保持质量并完成 features 的同时高效执行 work。

## Introduction（简介）

此 command 接收 work document（plan 或 specification）或描述 work 的 bare prompt，并系统性执行。重点是通过快速理解 requirements、遵循 existing patterns，并全程保持质量来 **shipping complete features**。

## Input Document（输入文档）

<input_document> #$ARGUMENTS </input_document>

## Execution Workflow（执行流程）

### Phase 0: Input Triage（输入分诊）

根据 `<input_document>` 中提供的内容决定如何继续。

**Plan document**（input 是 existing plan 或 specification 的 file path）：先读取 plan metadata，markdown plan 读取 YAML frontmatter，HTML plan 读取 visible header text（两种格式携带同一组 fields）。如果它带有 `execution: knowledge-work`，这是 **non-code plan**：读取 `references/non-code-execution.md` 并遵循该 carve-out，而不是继续本 workflow 的其余部分。否则（field 缺省或为 `execution: code`）→ 跳到 Phase 1 并运行正常 code lifecycle。（marker check 放在 plan-document handling 内部，因为检测 marker 必须先有文件；下方 "Bare prompt" 不受影响。）

**Bare prompt**（input 是 work 描述，而不是 file path）：

1. **Scan the work area（扫描工作区域）**

   - 基于 prompt 识别 likely to change 的 files
   - 查找这些 areas 的 existing test files（搜索 import、reference 或与 implementation files 共享名称的 test/spec files）
   - 记录 affected areas 中的 local patterns 和 conventions

2. **Assess complexity and route（评估复杂度并路由）**

   | Complexity（复杂度） | Signals（信号） | Action（动作） |
   |-----------|---------|--------|
   | **Trivial** | 1-2 files，无 behavioral change（typo、config、rename） | 进入 Phase 1 step 2（environment setup），然后直接实现：不建 task list，不进 execution loop。如果 change 触及 behavior-bearing code，应用 Test Discovery |
   | **Small / Medium** | Clear scope，少于约 10 个 files | 从 discovery 构建 task list。进入 Phase 1 step 2 |
   | **Large** | Cross-cutting、architectural decisions、10+ files、触及 auth/payments/migrations | 告知用户这会受益于 `/ce-brainstorm` 或 `/ce-plan`，用于浮现 edge cases 和 scope boundaries。尊重用户选择。如果继续，构建 task list 并进入 Phase 1 step 2 |

---

### Phase 1: Quick Start（快速开始）

1. **Read Plan and Clarify（读取 Plan 并澄清）**（如果从 Phase 0 带 bare prompt 到达，则跳过）

   - 完整读取 work document。Plans 可以是 markdown（`.md`）或 HTML（`.html`）：两种格式都按线性文本读取。HTML plans 携带与 markdown plans 相同的 section names 和 IDs，只是被 semantic HTML elements（`<section>`、`<article>` 等）包裹；section-finding 方式相同（对 section names 做 substring match，忽略 HTML wrapper noise）。
   - 当 auto-detect latest plan（blank invocation）时，同时 glob `docs/plans/*.md` 和 `docs/plans/*.html`，并不考虑 extension 选择最新文件。
   - 将 plan 视为 decision artifact，而不是 execution script。
   - 如果 plan 包含 `Implementation Units`、`Work Breakdown`、`Requirements`（或 legacy `Requirements Trace`）、`Files`、`Test Scenarios` 或 `Verification` 等 sections，将它们作为 execution 的 primary source material。
   - 检查每个 implementation unit 上的 `Execution note`：它们携带该 unit 的 execution posture signal（例如 test-first 或 characterization-first）。创建 tasks 时记录它们。
   - 检查 `Deferred to Implementation` 或 `Implementation-Time Unknowns` section：这些是 planner 有意留给你在 execution 期间解决的问题。开始前记录它们，让它们影响你的 approach，而不是在 mid-task 才 surprise 你。
   - 检查 `Scope Boundaries` section：这些是 explicit non-goals。如果 implementation 开始把你拉向 adjacent work，回头参考它们。
   - Review plan 中提供的任何 references 或 links。
   - 如果用户在本 session 中明确要求 TDD、test-first 或 characterization-first execution，即使 plan 没有 `Execution note`，也要遵守。
   - 如果任何内容 unclear 或 ambiguous，现在询问 clarifying questions。
   - 如果上方需要 clarifying questions，就让用户 approval resolved answers。如果不需要 clarifications，不做单独 approval step，直接继续：plan scope 是 plan 的 authority，不是要重新谈判的东西。
   - **不要跳过这一步**：现在提问比构建错误内容更好。
   - **execution 期间不要编辑 plan body。** plan 是 decision artifact；progress 存在于 git commits 和 task tracker 中。ce-work 期间唯一的 plan mutation 是 shipping 时最终 `status: active → completed` flip（见 `references/shipping-workflow.md` Phase 4 Step 2）。Legacy plans 可能在 unit headings 上包含 `- [ ]` / `- [x]` marks：将它们作为 state 忽略；per-unit completion 通过读取当前 file state 在 execution 期间确定。

2. **Setup Environment（设置环境）**

   首先检查 current branch：

   ```bash
   current_branch=$(git branch --show-current)
   default_branch=$(git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null | sed 's@^refs/remotes/origin/@@')

   # Fallback if remote HEAD isn't set
   if [ -z "$default_branch" ]; then
     default_branch=$(git rev-parse --verify origin/main >/dev/null 2>&1 && echo "main" || echo "master")
   fi
   ```

   **如果已经在 feature branch 上**（不是 default branch）：

   首先，检查 branch name 是否 **meaningful**：像 `feat/crowd-sniff` 或 `fix/email-validation` 这样的名称会告诉未来读者 work 是什么。Auto-generated worktree names（例如 `worktree-jolly-beaming-raven`）或其他 opaque names 则不会。

   如果 branch name meaningless 或 auto-generated，继续前建议重命名：
   ```bash
   git branch -m <meaningful-name>
   ```
   从 plan title 或 work description 派生新名称（例如 `feat/crowd-sniff`）。将 rename 作为 recommended option，与 continuing as-is 一起呈现。

   然后询问："继续在 `[current_branch]` 上工作，还是创建新 branch？"
   - 如果继续（无论是否 rename），进入 step 3
   - 如果创建新 branch，遵循下方 Option A 或 B

   **如果在 default branch 上**，选择如何继续：

   **Option A：Create a new branch（创建新 branch）**
   ```bash
   git pull origin [default_branch]
   git checkout -b feature-branch-name
   ```
   使用基于 work 的 meaningful name（例如 `feat/user-authentication`、`fix/email-validation`）。

   **Option B：Use a worktree（使用 worktree，推荐用于 parallel development）**
   ```bash
   skill: ce-worktree
   # The skill will create a new branch from the default branch in an isolated worktree
   ```

   **Option C：Continue on the default branch（继续在 default branch 上）**
   - 需要 explicit user confirmation
   - 只有在用户明确说 "yes, commit to [default_branch]" 后才继续
   - 没有 explicit permission 时，绝不要直接 commit 到 default branch

   **Recommendation（建议）**：以下情况使用 worktree：
   - 你想同时处理多个 features
   - 你想在 experimenting 时保持 default branch clean
   - 你计划频繁切换 branches

3. **Create Task List（创建 Task List）**（如果 Phase 0 已构建，或 Phase 0 路由为 Trivial，则跳过）
   - 使用平台 task tracking tool（Claude Code 中的 `TaskCreate`/`TaskUpdate`/`TaskList`、Codex 中的 `update_plan`，或其他 harness 的等价工具）将 plan 拆成 actionable tasks
   - 从 plan 的 implementation units、dependencies、files、test targets 和 verification criteria 派生 tasks
   - 当 plan 为 Implementation Units 定义 U-IDs 时，将 unit 的 U-ID 作为 task subject 前缀保留（例如 "U3: Add parser coverage"）。这让 blocker references、deferred-work notes 和 final summaries 锚定到 plan 使用的同一 identifier，因此跨 plan edits 的 progress 和 traceability 保持清晰
   - 当存在时，将每个 unit 的 `Execution note` 带入 task
   - 对每个 unit，实现前读取 `Patterns to follow` field：这些指向要 mirror 的 specific files 或 conventions
   - 使用每个 unit 的 `Verification` field 作为该 task 的 primary "done" signal
   - 不要期待 plan 包含 implementation code、micro-step TDD instructions 或 exact shell commands
   - 包含 tasks 之间的 dependencies
   - 基于需要先做什么排序
   - 包含 testing 和 quality check tasks
   - 保持 tasks specific 且 completable

4. **Choose Execution Strategy（选择执行策略）**

   创建 task list 后，基于 plan 的 size 和 dependency structure 决定如何 execute：

   | Strategy（策略） | When to use（何时使用） |
   |----------|-------------|
| **Inline** | 1-2 个 small tasks，或需要 mid-flight user interaction 的 tasks。**bare-prompt work 的默认项**：bare prompts 很少产出足够 structured context 来 justify subagent dispatch |
| **Serial subagents** | 3+ tasks 且彼此有 dependencies。每个 subagent 获得聚焦一个 unit 的 fresh context window：防止许多 tasks 中的 context degradation。需要 plan-unit metadata（Goal、Files、Approach、Test scenarios） |
| **Parallel subagents** | 3+ tasks 且通过 Parallel Safety Check（下方）。同时 dispatch independent units，在 prerequisites 完成后运行 dependent units。需要 plan-unit metadata |

   **Parallel Safety Check**：选择 parallel dispatch 前必需：

   1. 从每个 candidate unit 的 `Files:` section（Create、Modify 和 Test paths）构建 file-to-unit mapping
   2. 检查 intersection：任何 file path 出现在 2+ units 中就表示 overlap
   3. **如果发现 overlap 且 worktree isolation 不可用**：downgrade 到 serial subagents。记录原因（例如 "Units 2 and 4 share `config/routes.rb` — using serial dispatch"）。Serial subagents 仍提供 context-window isolation，且没有 shared-directory write races。
   4. **如果发现 overlap 且 worktree isolation 可用**：parallel dispatch 仍安全：subagents 在 isolation 中工作，overlap 会作为 predictable merge conflict 浮现，由 orchestrator 通过下方 post-batch flow 处理。记录 predicted overlap，让 post-batch flow 知道哪些 merges 可能发生 conflicts。

   即使没有 file overlap，共享 orchestrator working directory 的 parallel subagents 也会面临 git index contention（concurrent staging/committing 会 corrupt index）和 test interference（concurrent test runs 会拾取彼此的 in-progress changes）。Worktree isolation 消除两者；下方 shared-directory fallback constraints 用于缓解它们。

   **Subagent isolation**：给每个 parallel subagent 自己的 working tree：
   - **Claude Code（`Agent` tool）：** 传入 `isolation: "worktree"` 和 `run_in_background: true`。harness 会在 `.claude/worktrees/agent-<id>` 下创建 per-subagent worktree，并位于自己的 branch。依赖它前，验证 `.claude/worktrees/` 已 gitignored。
   - **没有 built-in worktree isolation 的其他平台**（例如 Codex `spawn_agent`、Pi `subagent`）：subagents 共享 orchestrator 的 directory。

   **Subagent dispatch** 使用可用的 subagent 或 task spawning mechanism。对每个 unit，给 subagent：
   - 完整 plan file path（用于 overall context）
   - 该 specific unit 的 Goal、Files、Approach、Execution note、Patterns、Test scenarios 和 Verification
   - 与该 unit 相关的任何 resolved deferred questions
   - 指令：检查该 unit 的 test scenarios 是否覆盖所有 applicable categories（happy paths、edge cases、error paths、integration），并在写 tests 前补足 gaps

   **Shared-directory fallback constraints**：仅当 worktree isolation 不可用时应用：
   - 指示每个 subagent："Do not stage files (`git add`), create commits, or run the project test suite. The orchestrator handles testing, staging, and committing after all parallel units complete."
   - 这些 constraints 防止 concurrent subagents 之间的 git index contention 和 test interference。
   - worktree isolation active 时，省略这些 constraints：subagents 可以在自己的 worktree branch 内 stage、commit 并运行其 unit tests。

   **Permission mode：** dispatching subagents 时省略 `mode` 参数，让用户配置的 permission settings 生效。不要传 `mode: "auto"`：它会 override `bypassPermissions` 等 user-level settings。

   **每个 subagent 完成后（serial mode）：**
   1. Review subagent 的 diff：确认 changes 符合该 unit 的 scope 和 `Files:` list
   2. 运行相关 test suite，确认 tree healthy
   3. 如果 tests 失败，先 diagnose 并修复，再继续：不要在 broken tree 上 dispatch dependent units
   4. 更新 task list（不要编辑 plan body：progress 由 commit 承载）
   5. Dispatch 下一个 unit

   **一个 parallel subagent batch 全部完成后（worktree-isolated mode）：**
   1. 等待当前 parallel batch 中所有 subagent 完成。
   2. 对每个已完成 subagent，按 dependency order：review 该 worktree 相对 orchestrator branch 的 diff。如果 subagent 没有 commit 自己的 work，就在该 worktree 内 stage 并 commit。
   3. 按 dependency order 依次将每个 subagent branch merge 到 orchestrator branch。**如果出现 merge conflict，abort merge（`git merge --abort`），并针对 now-merged tree 以 serial 方式重新 dispatch 冲突 unit**：静默手动 resolve 等于选择一边并丢掉另一个 unit 的 intent。（Parallel Safety Check 中预测的 overlap 会在这里以 conflict 形式浮现，而不是在 shared-directory mode 中变成静默数据丢失。）
   4. 每次 merge 后运行相关 test suite。如果 tests 失败，先 diagnose 并修复，再 merge 下一个 branch。
   5. 更新 task list（progress 由 merge commits 承载）。
   6. Merge 后移除每个 subagent 的 worktree 并删除其 branch。使用 subagent result 返回的 absolute path 和 branch name。
      - 先 unlock worktree：harness 会锁定 per-subagent worktrees：`git worktree unlock <absolute-path>`
      - 移除 worktree：`git worktree remove <absolute-path>`
      - 删除 branch：`git branch -d <branch-name>`（branch 默认会比 worktree 活得更久；不清理会累积 orphan branch。小写 `-d` 会拒绝删除 unmerged branch，这正是需要的安全性；如果失败，先调查再考虑 force）
   7. Dispatch 下一批 independent units，或下一个 dependent unit。

   **一个 parallel subagent batch 全部完成后（shared-directory fallback）：**
   1. 等待当前 parallel batch 中所有 subagent 完成后，再处理任何 result
   2. Cross-check discovered file collisions：比较 batch 中所有 subagent 实际修改的 files（不只看它们声明的 `Files:` lists）。Subagents 可能创建或修改 plan 阶段未预期的 files：这是正常的，因为 plans 描述 *what* 而不是 *how*。只有同一 batch 中 2+ subagents 修改了同一个 file，collision 才重要。在 shared working directory 中，只有最后写入者的版本会保留，另一个 unit 对该 file 的 changes 会丢失。如果发现 collision：先 commit 所有 units 中没有冲突的 files，再针对 shared file serial 重新运行 affected units，让每个 unit 基于彼此已 committed work 继续
   3. 对每个完成的 unit，按 dependency order：review diff、运行相关 test suite、只 stage 该 unit 的 files，并用从该 unit 的 Goal 派生的 conventional message commit
   4. 如果 commit 一个 unit 的 changes 后 tests 失败，先 diagnose 并修复，再 commit 下一个 unit
   5. 更新 task list（不要编辑 plan body：progress 由刚创建的 commits 承载）
   6. Dispatch 下一批 independent units，或下一个 dependent unit

### Phase 2: Execute（执行）

1. **Task Execution Loop（Task 执行循环）**

   按 priority order 处理每个 task：

   ```
   while (tasks remain):
     - 将 task 标记为 in-progress
     - 读取 plan 引用的 files，或 Phase 0 中发现的 files
     - **如果 unit 的 work 已经存在且符合 plan intent**（files 已具备预期 capability，或当前 code 已满足该 unit 的 `Verification` criteria），说明 work 很可能已经在先前 branch 或 session 中 shipped。验证匹配后，将 task 标记完成并继续。不要静默重新实现。
     - 在 codebase 中查找 similar patterns
     - 为正在修改的 implementation files 找到 existing test files（Test Discovery，见下方）
     - 按 existing conventions 实现
     - 添加、更新或移除 tests，使其匹配 implementation changes（见下方 Test Discovery）
     - 运行 System-Wide Test Check（见下方）
     - Changes 后运行 tests
     - 评估 testing coverage：这个 task 是否改变 behavior？如果是，是否写入或更新了 tests？如果没有添加 tests，理由是否明确且有意（例如 pure config、无 behavioral change）？
     - 将 task 标记为 completed
     - 评估是否 incremental commit（见下方）
   ```

   当 unit 携带 `Execution note` 时，遵守它。对于 test-first units，先为该 unit 写 failing test，再实现。对于 characterization-first units，先捕获 existing behavior，再修改。没有 `Execution note` 的 units，务实推进。

   Execution posture 的 guardrails：
   - test-first 时，不要在同一步里同时写 test 和 implementation
   - 实现 fix 或 feature 前，不要跳过验证 new test 会失败
   - test-first 时，不要超出当前 behavior slice 过度实现
   - trivial renames、pure configuration 和 pure styling work 可以跳过 test-first discipline

   **Test Discovery**：实现某个 file 的 changes 前，先找到它的 existing test files（搜索 import、reference 该 implementation file，或与其共享 naming patterns 的 test/spec files）。如果 plan 指定了 test scenarios 或 test files，从那里开始，再检查 plan 可能未列出的额外 test coverage。Implementation files 的 changes 应配套对应 test updates：new behavior 写 new tests，changed behavior 修改 tests，deleted behavior 移除或更新 tests。

   **Test Scenario Completeness**：为 feature-bearing unit 写 tests 前，检查 plan 的 `Test scenarios` 是否覆盖该 unit 适用的所有 categories。如果某类缺失，或 scenarios 很模糊（例如只写 "validates correctly"，没有说明 inputs 和 expected outcomes），先基于该 unit 自身 context 补足，再写 tests：

   | Category（类别） | When it applies（适用时机） | How to derive if missing（缺失时如何推导） |
   |----------|----------------|------------------------|
   | **Happy path** | 对 feature-bearing units 始终适用 | 读取 unit 的 Goal 和 Approach，找出 core input/output pairs |
   | **Edge cases** | 当 unit 有 meaningful boundaries（inputs、state、concurrency）时 | 识别 boundary values、empty/nil inputs 和 concurrent access patterns |
   | **Error/failure paths** | 当 unit 有 failure modes（validation、external calls、permissions）时 | 枚举该 unit 应 reject 的 invalid inputs、应 enforce 的 permission/auth denials，以及应处理的 downstream failures |
   | **Integration** | 当 unit 跨 layers（callbacks、middleware、multi-service）时 | 识别 cross-layer chain，并写一个不使用 mocks 的 scenario 来 exercise 它 |

   **System-Wide Test Check**：将 task 标记 done 前，暂停并询问：

   | Question（问题） | What to do（处理方式） |
   |----------|------------|
   | **运行时会触发什么？** Callbacks、middleware、observers、event handlers：从你的 change 向外 trace 两层。 | 阅读实际 code（不是 docs）：你触及的 models 上的 callbacks、request chain 中的 middleware、`after_*` hooks。 |
   | **我的 tests 是否 exercise 真实链路？** 如果每个 dependency 都被 mock，test 只能证明你的 logic *in isolation* 工作，不能证明 interaction 正确。 | 至少写一个 integration test，使用 real objects 穿过完整 callback/middleware chain。对会相互作用的 layers 不使用 mocks。 |
   | **Failure 是否会留下 orphaned state？** 如果 code 在调用 external service 前持久化 state（DB row、cache、file），service 失败时会怎样？Retry 会不会创建 duplicates？ | 用 real objects trace failure path。如果 risky call 前创建了 state，测试 failure 会 clean up，或 retry 是 idempotent。 |
   | **还有哪些 interfaces 暴露这个行为？** Mixins、DSLs、alternative entry points（Agent vs Chat vs ChatMethods）。 | Grep related classes 中的 method/behavior。如果需要 parity，现在补上，不要当作 follow-up。 |
   | **Error strategies 在各 layer 间是否一致？** Retry middleware + application fallback + framework error handling：是否冲突或造成 double execution？ | 列出每个 layer 的 specific error classes。验证你的 rescue list 匹配 lower layer 实际 raise 的内容。 |

   **何时跳过：** 没有 callbacks、没有 state persistence、没有 parallel interfaces 的 leaf-node changes。如果 change 是 purely additive（new helper method、new view partial），这个 check 只需 10 秒，答案通常是 "nothing fires, skip."

   **何时最重要：** 任何触及带 callbacks 的 models、带 fallback/retry 的 error handling，或通过 multiple interfaces 暴露的 functionality 的 change。


2. **Incremental Commits（增量提交）**

   完成每个 task 后，评估是否创建 incremental commit：

   | 何时 commit... | 何时不要 commit... |
   |----------------|---------------------|
   | Logical unit complete（model、service、component） | 只是 larger unit 的 small part |
   | Tests pass + meaningful progress | Tests failing |
   | 即将切换 contexts（backend → frontend） | Purely scaffolding，且无 behavior |
   | 即将尝试 risky/uncertain changes | Commit message 只能写 "WIP" |

   **Heuristic：** "Can I write a commit message that describes a complete, valuable change?" 如果可以，就 commit。如果 message 会变成 "WIP" 或 "partial X"，就等待。

   如果 plan 有 Implementation Units，将它们作为 commit boundaries 的初始 guide，但要根据 implementation 期间的发现调整。如果 unit 比预期更大，可能需要多个 commits；small related units 也可能一起 land。使用每个 unit 的 Goal 来帮助确定 commit message。

   **Commit workflow（提交 workflow）：**
   ```bash
   # 1. Verify tests pass (use project's test command)
   # Examples: bin/rails test, npm test, pytest, go test, etc.

   # 2. Stage only files related to this logical unit (not `git add .`)
   git add <files related to this logical unit>

   # 3. Commit with conventional message
   git commit -m "feat(scope): description of this unit"
   ```

   **Handling merge conflicts（处理 merge conflicts）：** 如果 rebasing 或 merging 期间出现 conflicts，立即 resolve。Incremental commits 会让 conflict resolution 更容易，因为每个 commit 都小而聚焦。

   **Note（备注）：** Incremental commits 使用干净的 conventional messages，不带 attribution footers。最终 Phase 4 commit/PR 包含完整 attribution。

   **Parallel subagent mode（并行 subagent 模式）：** Commit ownership 按 isolation mode 拆分（见 Phase 1 Step 4）：
   - **Worktree-isolated：** subagents 可以在自己的 worktree branch 内 stage 和 commit；orchestrator 在 batch 后按 dependency order merge 这些 branches。
   - **Shared-directory fallback：** subagents 不 commit；orchestrator 在整个 parallel batch 完成后 stage 并 commit 每个 unit。

3. **Follow Existing Patterns（遵循现有模式）**

   - Plan 应引用 similar code：先读这些 files
   - 精确匹配 naming conventions
   - 尽可能复用 existing components
   - 遵循 project coding standards（见 AGENTS.md；只有 repo 仍保留 compatibility shim 时才使用 CLAUDE.md）
   - 拿不准时，grep similar implementations

4. **Test Continuously（持续测试）**

   - 每个 significant change 后运行 relevant tests
   - 不要等到最后才 test
   - 立即修复 failures
   - 为 new behavior 添加 new tests，为 changed behavior 更新 tests，为 deleted behavior 移除 tests
   - **带 mocks 的 unit tests 证明 logic in isolation。使用 real objects 的 integration tests 证明 layers 能协同工作。** 如果 change 触及 callbacks、middleware 或 error handling，两者都需要。

5. **Simplify as You Go（边做边简化）**

   完成一组 related implementation units 后（或每 2-3 个 units），review 最近 changed files，寻找 simplification opportunities：合并 duplicated patterns、提取 shared helpers、提升 code reuse 和效率。使用 subagents 时这尤其有价值，因为每个 agent 都在 isolated context 中工作，看不到跨 units 逐渐浮现的 patterns。

   不要每完成一个 unit 就 simplify：早期 patterns 可能看起来重复，但在后续 units 中会有意分化。等到自然 phase boundary，或注意到 accumulated complexity 后再做。

   如果 **`ce-simplify-code`** 可用，在 phase boundaries 调用它（尤其是进入 Phase 3 前且 diff >=30 lines 时）。否则，自己 review changed files，寻找 reuse 和 consolidation opportunities。

6. **Figma Design Sync（Figma 设计同步，适用时）**

   对于带 Figma designs 的 UI work：

   - 按 design specs 实现 components
   - 迭代使用 ce-figma-design-sync agent 对比
   - 修复识别出的 visual differences
   - 重复直到 implementation 匹配 design

6. **Track Progress（跟踪进度）**
   - 完成 tasks 时保持 task list updated
   - 记录 blockers 或 unexpected discoveries
   - 如果 scope expands，创建 new tasks
   - 向用户同步 major milestones
   - 当 plan 为 Implementation Units 定义 U-IDs，或 plan/origin document 携带 stable R-IDs（以及可选 A/F/AE IDs）时，在 blockers、deferred-work notes、task summaries 和 final verification 中引用它们，而不是在 routine status updates 中引用。U-IDs 将 units 锚定在 plan edits 之间；R/A/F/AE 在 brainstorm-plan handoff 之间锚定 product intent。使用 plan 提供的 IDs，不要自行发明。这能保留 traceability，同时避免 signal 被 noise 淹没。

### Phase 3-4：Quality Check and Finishing Work（质量检查和收尾）

当所有 Phase 2 tasks 完成并转入 quality check 时，必须读取 `references/shipping-workflow.md` 获取完整 shipping workflow。不要跳过。

**Code review tiers：** harness 有 built-in review 时使用 Tier 1。只有匹配 `shipping-workflow.md` 中的 escalation criteria 时才使用 Tier 2，不能因为 Tier 1 缺失就升级。

**Tier 2 分两步：先 review，再 fix。** `ce-code-review` 只做 review。它返回 findings（markdown 或 `mode:agent` JSON）；绝不编辑 checkout、commit 或 apply fixes。

当 Tier 2 适用时：

1. **Review**：调用 `ce-code-review` skill（invocation command 见 `references/review-findings-followup.md` § Fallback）。在 orchestrated workflows 中使用 `mode:agent`；有 plan 时传 `plan:<path>`，merge base 已知时传 `base:<ref>`。
2. **Apply fixes**：加载 `references/review-findings-followup.md`。只基于 JSON 过滤 eligibility，**按 file 批处理 applicable findings**，dispatch fix subagents（file sets disjoint 时 parallel）。Orchestrator merge diffs、运行 tests 并 commit；它不预先调查 findings。
3. **Residual Work Gate**：只在 followup 后进行；未解决的 actionable findings 进入 `shipping-workflow.md` 中的 gate。

Tier 1 harness-native review 仍可能 inline fix；Tier 2 始终将 review 与 apply 分离。

## Key Principles（关键原则）

### Start Fast, Execute Faster（快速开始，更快执行）

- 开始时一次性澄清，然后 execute
- 不要等待 perfect understanding：提问，然后行动
- 目标是 **finish the feature**，不是创建完美流程

### The Plan is Your Guide（Plan 是指南）

- Work documents 应引用 similar code 和 patterns
- 加载这些 references 并遵循它们
- 不要 reinvent：匹配 existing patterns

### Test As You Go（边做边测）

- 每次 change 后运行 tests，不要等到最后
- 立即修复 failures
- Continuous testing 可避免大 surprise

### Quality is Built In（质量内建）

- 遵循 existing patterns
- 为 new code 写 tests
- Push 前运行 linting
- Tier 1 可用或匹配 Tier 2 criteria 时 review（见 `shipping-workflow.md`）

### Ship Complete Features（交付完整功能）

- 继续前标记所有 tasks completed
- 不要留下 80% done 的 features
- 能 ship 的 finished feature 胜过不能 ship 的 perfect feature

## Common Pitfalls to Avoid（常见陷阱）

- **Analysis paralysis**：不要过度思考，读取 plan 并 execute
- **Skipping clarifying questions**：现在问，不要等 build 错后再问
- **Ignoring plan references**：plan 中的 links 都有原因
- **Testing at the end**：持续 test，否则后面会付出代价
- **Forgetting to track progress**：边做边更新 task status，否则会丢失已完成内容的 track
- **80% done syndrome**：finish the feature，不要过早转向
- **Skipping review without reason**：Tier 1 可用时使用；只有满足 `shipping-workflow.md` 中 criteria 时才升级到 Tier 2；两者都跳过时记录原因
- **Re-scoping the plan into human-time phases**：plan 的 Implementation Units 定义 execution scope。不要估算每个 unit 的 human-hours、提出 multi-day breakdowns，或要求用户为 "this session" 选择 subset of units。Agents 以 agent speed 执行，context-window pressure 通过 subagent dispatch（Phase 1 Step 4）处理，而不是靠 phased sessions。如果 plan-file input 确实大到无法单次 execution，明确说明，并建议用户回到 `/ce-plan` 缩小 scope，不要编造 session phases 作为 workaround。对于 bare-prompt input，Phase 0 的 Large routing 已处理 oversized work
