---
title: "fix: 重构 session-history orchestration，避免 subagent Skill-tool deadlock"
type: fix
status: completed
date: 2026-05-08
---

# fix: 重构 session-history orchestration，避免 subagent Skill-tool deadlock

## 摘要

将所有 session-history orchestration 逻辑从 `ce-session-historian` subagent 移到 `ce-sessions` skill（main context）中，因为这里允许使用 Skill tool。该 agent 缩小为仅负责 synthesis：接收 `mktemp` scratch 空间中预提取出的文件路径，并返回 findings prose。`ce-compound` Phase 1 不再直接 dispatch historian，而是通过平台的 skill-invocation primitive（Claude Code 中是 `Skill`，其他 target 使用等价机制）把 session-history 工作委托给 `ce-sessions` skill。关闭 #794。

---

## 问题框架

`ce-session-historian` 会被 `/ce-compound` Phase 1 和 `/ce-sessions` 作为 subagent dispatch，它的第一个具体动作是 `Skill(ce-session-inventory)`。Claude Code 不允许 subagents 调用 `Skill` tool（[anthropics/claude-code#38719](https://github.com/anthropics/claude-code/issues/38719)）。这个调用会无限停在 `Initializing…`，最终在 orchestrator 侧表现为伪造的 "user doesn't want to proceed with this tool use" 拒绝。#794 中已做经验确认：同一个 skill、同一组 args、同一台机器，唯一差异是 dispatch context（orchestrator 可运行；subagent 会卡住）。修复必须是结构性的，而不是 workaround：移除所有让 subagent 调用 `Skill` 的 code path。

---

## 需求

- R1. `/ce-sessions [question]` 以及选择 session history 的 `/ce-compound` Phase 1 必须能在 Claude Code 上成功完成，不会卡在 `Initializing…`，也不会浮现伪造的用户拒绝错误。
- R2. 重构后的 session-history flow 中，任何 subagent 都不得调用 `Skill` tool。完整 orchestration 必须运行在 main conversation context。
- R3. 必须保留现有 session-history 能力：跨平台发现（Claude Code、Codex、Cursor）、branch 和 keyword filtering、scan-window widening 逻辑、top-5 deep-dive cap、skeleton + errors extraction modes、time-budget discipline。
- R4. 不得让非 Claude Code targets（Codex、Cursor、Gemini、OpenCode、Pi、Kiro）回退。所有 script invocation 必须使用跨平台可移植模式（bare relative paths，不使用 `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_SKILL_DIR}`）。
- R5. 重构后 `bun run release:validate` 和 `bun test` 必须通过。
- R6. 合并后关闭 issue #794。

---

## 范围边界

- 验证或修复 Codex/Cursor 上的同一架构模式：尚未确认它们存在同样的 subagent-Skill-tool 限制。如果出现，另做 follow-up。
- 重命名 `ce-session-historian` 以反映它的 synthesis-only 角色：这只是 kosmetics，并会增加 blast radius（legacy-cleanup registries、conversion writers、test fixtures）。
- 新增 session-history features（更大的 `head:N`、新的 extraction modes、当前行为之外的 additional output schemas）：只保留既有能力，不加 feature。
- 修复 Claude Code 的平台级 subagent 限制：这不是我们的代码。

---

## 上下文与调研

### 相关代码与模式

- `plugins/compound-engineering/skills/ce-sessions/SKILL.md`：目前只是一个 thin wrapper，会 dispatch `ce-session-historian`；将改写为 orchestrator。
- `plugins/compound-engineering/agents/ce-session-historian.agent.md`：目前指示 `Skill(ce-session-inventory)` 和 `Skill(ce-session-extract)`（lines 102-108）；将重构为 synthesis-only。
- `plugins/compound-engineering/skills/ce-session-inventory/scripts/{discover-sessions.sh,extract-metadata.py}`：scripts 移入 `ce-sessions/scripts/`。
- `plugins/compound-engineering/skills/ce-session-extract/scripts/{extract-skeleton.py,extract-errors.py}`：scripts 移入 `ce-sessions/scripts/`。
- `plugins/compound-engineering/skills/ce-compound/SKILL.md` Phase 1 lines 175-198：historian-dispatch block；替换为通过平台 skill-invocation primitive 对 `ce-sessions` 的 semantic-prose invocation。
- `plugins/compound-engineering/skills/ce-clean-gone-branches/SKILL.md` line 17、`ce-resolve-pr-feedback/SKILL.md` line 45、`ce-optimize/SKILL.md` lines 272/315/324：已建立的 `bash scripts/<name>` portable invocation pattern（slash-invoked skills、没有 `context: fork`、没有 platform variables）。
- `plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md` line 57：一个 skill 调用另一个 skill 的既有 semantic-prose convention：*"Invoke the `ce-X` skill via the platform's skill-invocation primitive (`Skill` in Claude Code, `Skill` in Codex, the equivalent on Gemini/Pi)"*。ce-compound 对 ce-sessions 的 delegation 遵循这个形式。
- `plugins/compound-engineering/skills/ce-demo-reel/SKILL.md` lines 109-117：`mktemp -d -t <prefix>-XXXXXX` per-run throwaway scratch pattern 的最清晰镜像。
- `plugins/compound-engineering/skills/ce-plan/references/deepening-workflow.md` lines 170-177：捕获 absolute scratch path 并将其传入 subagent dispatch prompt 的模式。
- `tests/session-history-scripts.test.ts` lines 4-19：`INVENTORY_SCRIPTS_DIR`、`EXTRACT_SCRIPTS_DIR` 常量和 `scriptsDirFor()` dispatcher；折叠成指向 `ce-sessions/scripts/` 的单一 `SCRIPTS_DIR`。
- `tests/skills/ce-plan-handoff-routing.test.ts`：regression test 模式（module load 时读 agent file，用 regex assertions 检查 body content）。
- `src/utils/legacy-cleanup.ts`：`STALE_SKILL_DIRS`（line 22，line 89 附近的 "Removed skills (no replacement)" cluster）和 `LEGACY_ONLY_SKILL_DESCRIPTIONS`（line 253）。
- `src/data/plugin-legacy-artifacts.ts` lines 18-237：`EXTRA_LEGACY_ARTIFACTS_BY_PLUGIN["compound-engineering"].skills[]`，按字母排序。
- `docs/skills/ce-sessions.md` lines 110、175-176：指向将被删除的 skill directories 的链接；删除后会 404。

### 组织内 learnings

- `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`：直接适用。它确立了 orchestrator-does-discovery / subagent-does-reading split、通过 paths 做 file-mediated handoff，以及 per-item walk vs. bulk-find-then-filter 会影响 tool call 数量的经验发现。synthesis subagent 仍应以某种 standalone form 可被调用（见 Open Questions）。
- `docs/solutions/skill-design/script-first-skill-architecture.md`：强化这次移动：classification rules 留在 scripts 中作为 single source of truth；不要把它们重复进 synthesis agent 的 prose。Script 产出，model 负责呈现。
- `docs/solutions/skill-design/compound-refresh-skill-improvements.md` Solution #5：subagents 使用 native file-search/read tools（例如 Claude Code 中的 Read），而不是 shell `cat`。synthesis-only historian 必须用 Read 读取 scratch-dir files。
- `docs/solutions/skill-design/research-agent-pipeline-separation.md`：foreground vs. background dispatch placement 是刻意设计。当前 `/ce-compound` Phase 1 historian dispatch 是 foreground，因为 session files 位于 CWD 外部。重构后这个理由改变（orchestrator skill 在 main context 处理访问）；要明确记录新的 placement。
- `docs/solutions/skill-design/post-menu-routing-belongs-inline.md`：load-bearing logic 必须放在会可靠执行的位置，而不是可能静默加载失败的位置。这强化了把 orchestration 从 agent（subagent context 中 Skill 不可达）移到 skill（main context）的决定。
- `docs/solutions/best-practices/ce-pipeline-end-to-end-learnings.md`：synthesis subagents 必须引用真实 evidence，而不是 vibe-summarize。这会继承到新 agent 的 output schema。

### 外部参考

- [anthropics/claude-code#38719](https://github.com/anthropics/claude-code/issues/38719)：已关闭，但架构限制仍然成立。Subagents 不能调用 Skill tool。

---

## 关键技术决策

- **将 scripts 移入 `ce-sessions/scripts/`，并使用 bare relative-path invocations（`bash scripts/<name>`）**：这是 repo AGENTS.md 中记录的 portable pattern，且三个现有 slash-invoked skills（`ce-clean-gone-branches`、`ce-resolve-pr-feedback`、`ce-optimize`）已在实践中使用。避免 `${CLAUDE_PLUGIN_ROOT}` / `${CLAUDE_SKILL_DIR}`（Claude-Code-only）以及 `${CLAUDE_SKILL_DIR:-.}` fallback（假设其他 targets 会把 CWD 设为 skill dir，未验证）。U2 Verification 包含 marketplace-install smoke test，用来确认非 `--plugin-dir` install 中 runtime CWD resolution 真实可用；plugin AGENTS.md 的 "Permission gate" caveat 警告 runtime Bash tool 可能不会从 skill dir 解析 relative paths，而现有 slash-command precedents 与该警告相反，所以 merge 前做一次经验验证是低成本保险。
- **`ce-compound` 通过平台 skill-invocation primitive 委托给 `ce-sessions`，使用 semantic prose，而不是字面 `Skill(...)` call**：遵循 `ce-plan/references/plan-handoff.md` line 57 的既有 convention，以及 plugin AGENTS.md "Cross-Platform Reference Rules"（"prefer semantic wording such as 'load the `ce-doc-review` skill' rather than slash syntax"）。Semantic prose 让每个 target 的 converter 路由到其 native primitive（Claude Code 中是 `Skill`，Codex/Gemini/Pi 上是等价机制）。如果在 SKILL.md body 中写字面 `Skill(ce-sessions, ...)` tool-call expression，会在 skill 通过 converters 原样发往非 Claude targets 时传播 Claude-Code-specific syntax。该架构的核心假设是：平台的 skill-invocation primitive 可从正在执行的 skill body 内工作，而不只限直接 slash command。当前 planning workflow 已经经验验证了这一点：ce-plan 从自身 skill body 内调用 ce-doc-review，并成功 resolve。
- **Synthesis subagent 在 dispatch prompt 中接收 file paths，并通过平台 native file-read tool（Claude Code 中的 Read）读取**：遵循 `pass-paths-not-content-to-subagents` 先例。Inventory output（较小）通过 main-context tool results 流转，因为 orchestrator 需要用它做 filter/rank judgment。每个 session 的 skeleton/errors output 会由 extraction scripts 直接写入 scratch files（通过 U2 新增的 `--output PATH` arg），extraction content 不会往返 main-context tool results。这就是 synthesizer subagent 的价值：extraction bytes 隔离在它的 subagent context 中，orchestrator 的 working state 保持轻量（只有 paths + 小 inventory + final findings prose）。
- **删除 agent 的 "Conversational mode" framing**：当前 agent file 宣称有两种模式（compound enrichment、conversational），但今天没有 caller 绕过 `/ce-sessions` 或 `/ce-compound` 直接调用该 agent。去掉 dual-mode framing 会简化 synthesis-only spec。如果后续需要 conversational direct dispatch，可以通过明确的 standalone-mode wiring 重新引入。
- **把被删除的 skills 加入全部三个 legacy-cleanup lookups**：`src/utils/legacy-cleanup.ts` 中的 `STALE_SKILL_DIRS`、`src/data/plugin-legacy-artifacts.ts` 中的 `EXTRA_LEGACY_ARTIFACTS_BY_PLUGIN["compound-engineering"].skills[]`，以及 `legacy-cleanup.ts` 中的 `LEGACY_ONLY_SKILL_DESCRIPTIONS`。descriptions map 是必须的，因为这些 skills 没有当前 ce-* replacement；`loadLegacyFingerprints` 会 fallback 到该 map 进行 upgrade ownership fingerprinting。
- **通过 dispatch ordering 保留 `/ce-compound` Phase 1 wall-clock parallelism**：当前 Phase 1 会并行 dispatch 三个 background research subagents，并同时以前景方式运行 historian，设计目的明确写着 historian "runs while the background agents work, adding no wall-clock time." 如果天真地在 parallel block 之前调用 ce-sessions skill-invocation primitive，会把 ce-sessions 串行放在 research subagents 前面，显著回退 wall-clock time。修复方式：先启动三个 background research subagents（Context Analyzer、Solution Extractor、Related Docs Finder），再发起对 `ce-sessions` 的 skill-invocation primitive call。同步的 skill call 会阻塞 ce-compound 的 main-context turn 直到 ce-sessions 返回，但已经 dispatch 的 background subagents 会在底层继续并行运行，因此保留现有 wall-clock benefit。U4 Approach 明确指定该顺序，避免 implementer 重新推导。

---

## 待解决问题

### 规划期间已解决

- **Cross-platform script path resolution**：使用 bare `bash scripts/<name>`（由 codebase precedent 解决：`ce-clean-gone-branches`、`ce-resolve-pr-feedback`、`ce-optimize` 都在 slash-invoked skill bodies 中可移植地使用它）。
- **Scripts 放在哪里**：`ce-sessions/scripts/` 作为单一 home（由 scope dialogue 解决：`ce-session-inventory` 和 `ce-session-extract` 会删除；它们的 script directories 折叠进现在直接使用这些 scripts 的 orchestrator skill）。
- **Skill-from-skill-body invocation legitimacy**：经验验证已完成：当前 session 的 `/ce-plan` Phase 5.3.8 从正在运行的 ce-plan skill body 内调用 `Skill(ce-doc-review, "mode:headless ...")`，调用成功 resolve，并 dispatch 三个 reviewer agents 后返回 findings。没有 deadlock，也没有 `Initializing…` hang。这明确了 #794 的经验确认表里留下的歧义："main session" 包括任何 non-subagent context，也包括当前正在执行的 skill body。
- **Skill-to-skill invocation form**：按 `plan-handoff.md` line 57 和 plugin AGENTS.md "Cross-Platform Reference Rules" 使用 semantic prose（"Invoke the `ce-sessions` skill via the platform's skill-invocation primitive (`Skill` in Claude Code, equivalent on other targets)"）。在 SKILL.md body 中写字面 `Skill(ce-sessions, ...)` syntax，会在 skill 通过 converters 原样发往非 Claude targets 时传播 Claude-Code-specific surface。
- **Inventory through main context vs. files**：通过 main context。Inventory output 很小（真实 session count 下约 30-50KB），orchestrator 需要基于它做 selection。每个 session 的 skeleton/errors output 则通过 U2 新增的 extract scripts `--output PATH` arg 完全绕开 main context：extraction content 直接写入 scratch，永不往返 orchestrator tool results。
- **README skill-count update**：不需要。Counts 使用 `38+` / `50+` 的 `+` suffix（已研究验证）。`ce-session-inventory` 和 `ce-session-extract` 不在 skill table 中（agent-facing primitives，有意从 user-facing inventory 隐藏）。
- **plugin.json description count update**：不需要。三个 plugin.json variants（Claude、Cursor、Codex）description 都不含计数（已研究验证）。

### 推迟到实现阶段

- **Scratch file naming convention**：大概率使用 `{session-id}.skeleton.txt` 和 `{session-id}.errors.txt`，但 exact naming 在写 `ce-sessions/SKILL.md` 时决定。
- **Tail-extract conditional logic placement**：目前 agent 会判断是否在 `head:200` skeleton 后对看似不完整的 sessions 跟进 `tail:50` extract。重构后这个判断放在 ce-sessions（orchestrator）中。具体实现是主动 pre-extract everything，还是检查 head output 后再 tail re-run，留到 implementation 期间决定。
- **Errors-mode extraction triggering**：目前 agent 会按 session selective 地决定。可以由 ce-sessions upfront 决定并 pre-extract，也可以让 synthesizer signal 它需要额外 extracts。先推迟；最简单路径是 "ce-sessions extracts skeleton always, errors only when scan window suggests dead-end value"，使用现有 per-session signals。
- **Standalone-mode dispatch path for the synthesis agent**：按 `pass-paths-not-content-to-subagents` precedent，sub-agents 应保持可直接 dispatch。删除 conversational mode 后，需要决定 synthesis agent body 是否仍记录 "no paths block in dispatch → return 'no relevant prior sessions'" fallback。大概率需要（防御未来 direct-dispatch use cases）；写的时候确认。

---

## 已考虑的替代方案

我们讨论过三种架构形态来关闭 #794。所选方案（把所有 orchestration 移入 `ce-sessions`，把 agent 改为 synthesis-only）是三者中范围最广的；本节记录为什么较窄选项被拒绝。

- **Option A：把 agent 重构为在 subagent context 里通过 Bash 直接调用 scripts**（issue #794 的 "Suggested resolution path 1"）。最小 diff：把 agent body 中的两个 `Skill(ce-session-inventory)` 和 `Skill(ce-session-extract)` 调用改成底层 `bash scripts/discover-sessions.sh ...` 和 `python3 scripts/extract-skeleton.py ...` invocations。agent 作为 subagent 可正常运行，直到撞上 Skill；subagent 中的 Bash 不受限制。**拒绝原因**：这个方案遇到同样的 script-path-resolution 问题，但没有同样的答案。Slash-invoked *skills* 有成熟的 sibling-`scripts/` convention（ce-clean-gone-branches、ce-resolve-pr-feedback、ce-optimize），runtime Bash 能可移植解析。这个 plugin 中的 *agents* 没有类似 convention：agent files 平铺在 `agents/` 下，没有 sibling `scripts/` dir，plugin 内也没有其他 agent 从 body 中通过 Bash 调用 scripts。要让 Option A 工作，agent 需要 (a) Claude-Code-only `${CLAUDE_PLUGIN_ROOT}` reference（R4 regression），或 (b) 新建 agent-side sidecar-scripts convention（codex converter 的 `collectReferencedSidecarDirs` 机制可以携带它，但 plugin 其他部分不遵循该模式，所以会为一个 agent 建立新 convention）。所选方案改为复用已被三个 existing skills 演练过的 slash-command `<skill>/scripts/` convention。

- **Option B：让 orchestrator 预取 inventory 并把它传入 subagent 的 dispatch prompt**（issue #794 的 "Suggested resolution path 2"）。orchestrator 跑一次 `ce-session-inventory`，把 JSONL inventory 放进 historian 的 dispatch prompt；historian 仍负责 selection + per-session extraction。**拒绝原因**：historian 会对每个 selected session 迭代运行 `ce-session-extract`（每次最多 5 次调用），而当前架构中这些也是 Skill-tool call。Option B 只修复 inventory call，仍留下 per-session extract calls 卡在同一个 subagent-Skill-tool deadlock。预先抓取所有 sessions 的 extraction content 会破坏 selection logic（你会在决定哪 5 个需要 deep-dive 前就 extract sessions）。完整修复必须把每个 Skill-tool call 都移出 subagent context，也就是所选方案。

- **Option C（所选）：把所有 orchestration 移入 `ce-sessions` skill（main context）；把 agent 改造成 synthesis-only，读取预提取的 scratch files。** 结构性关闭 deadlock：任何 Skill-tool call 都不会源自 subagent context。ce-sessions 自身是 slash-command skill，因此继承既有 `<skill>/scripts/` cross-platform-portable invocation pattern。synthesis-only agent 成为干净的 handoff point：接收 file paths、通过 native file-read tool 读取、返回 prose findings。代价是改动范围更大：六个 implementation units，而 Option A 只需要两个。但每个 unit 都是独立有意义的工作（script home consolidation、orchestrator promotion、agent simplification、ce-compound delegation refactor、regression test、清理 now-callerless wrapping skills）。#794 的具体 deadlock 是 forcing function，但更大的重构还顺手关闭其他 latent issues：删除两个本质上只是 script holders 的 `user-invocable: false` skills，简化 agent 的责任面，并让 orchestration 在 main context 中更可测试，使 slash-creator 的 eval workflow 能覆盖它。

第四种选项是 **彻底删除 synthesis subagent，让 orchestrator inline synthesis**，review 中提出过。拒绝原因：采用 extract scripts `--output PATH` arg（U2）后，synthesizer 的具体价值是 *context isolation*。Extraction content 通过 Read 进入 synthesizer 的 subagent context，而不是 orchestrator context。删除 synthesizer 会迫使 orchestrator 自己 Read scratch files，使所有 extraction bytes 进入 main-context tool results，这正是 `--output PATH` change 想避免的累积增长。synthesizer 的价值就在于 file-mediated handoff 干净。

---

## 高层技术设计

> *这说明预期 approach，是给 review 的方向性指导，不是 implementation specification。实现 agent 应把它当作 context，而不是要复写的代码。*

```
BEFORE (broken on Claude Code subagent context)
  /ce-compound  /ce-sessions
        \           /
         \         /
    Agent(ce-session-historian)  ← runs in subagent context
              |
              |  Skill(ce-session-inventory)   ← HANGS at "Initializing…"
              |  Skill(ce-session-extract)     ← HANGS at "Initializing…"
              |
              v
        synthesis text

AFTER (Skill tool only invoked from main context)
  /ce-compound  (skill, main context — launches parallel research subagents first,
                 then invokes ce-sessions via the platform's skill-invocation primitive
                 so the parallel research keeps running while ce-sessions executes)
       |
       v
  /ce-sessions  (skill, main context)
       |
       |  bash scripts/discover-sessions.sh ... | tr '\n' '\0' \
       |     | xargs -0 python3 scripts/extract-metadata.py --cwd-filter <repo>
       |       → inventory JSONL (held in main context for filter/rank judgment)
       |
       |  filter by branch / window / keyword / top-5 cap
       |
       |  mktemp -d -t ce-sessions-XXXXXX → $SCRATCH
       |
       |  for each selected session, scripts write directly to scratch (no stdout
       |  round-trip through main context):
       |    python3 scripts/extract-skeleton.py --output $SCRATCH/{session-id}.skeleton.txt < <file>
       |    (optionally) python3 scripts/extract-errors.py --output $SCRATCH/{session-id}.errors.txt < <file>
       |
       |  Dispatch ce-session-historian via the platform's subagent primitive
       |  with prompt = {problem_topic, scratch_dir, [{path, platform, branch?, ts, ...}], output_schema}
       v
  ce-session-historian  (subagent, synthesis-only)
       |
       |  for each path: read via native file-read tool   ← no Skill calls
       |  synthesize per output schema
       v
  findings prose returned to /ce-sessions  →  returned to /ce-compound  →  folded into doc
```

该 bug 结构性消失，因为 subagent 不再调用 Skill tool。每个 `Skill(...)` call 都位于 main conversation context，而这是已验证可工作的路径。

---

## 实现单元

### U1. 将 scripts 移入 `ce-sessions/scripts/` 并重定向 test paths

**目标：** 将四个 extraction scripts relocation 到 `ce-sessions/scripts/` 下作为纯文件移动，并更新 test suite 让它在新位置找到它们。完成本 unit 后，scripts 位于新路径，script test suite 针对新路径通过；其他行为尚不改变。

**需求：** R3, R5

**依赖：** 无

**文件：**
- 移动：`plugins/compound-engineering/skills/ce-session-inventory/scripts/discover-sessions.sh` → `plugins/compound-engineering/skills/ce-sessions/scripts/discover-sessions.sh`
- 移动：`plugins/compound-engineering/skills/ce-session-inventory/scripts/extract-metadata.py` → `plugins/compound-engineering/skills/ce-sessions/scripts/extract-metadata.py`
- 移动：`plugins/compound-engineering/skills/ce-session-extract/scripts/extract-skeleton.py` → `plugins/compound-engineering/skills/ce-sessions/scripts/extract-skeleton.py`
- 移动：`plugins/compound-engineering/skills/ce-session-extract/scripts/extract-errors.py` → `plugins/compound-engineering/skills/ce-sessions/scripts/extract-errors.py`
- 修改：`tests/session-history-scripts.test.ts`（将 `INVENTORY_SCRIPTS_DIR` 和 `EXTRACT_SCRIPTS_DIR` constants 折叠为指向新路径的单一 `SCRIPTS_DIR`；按 tests 引用方式简化或删除 `scriptsDirFor()` dispatcher）

**方法：**
- 通过 `git mv` 做纯文件移动以保留 blame。
- Scripts 彼此没有 internal cross-references（已验证：`discover-sessions.sh` 不直接调用 `extract-metadata.py`；pipe 在 skill body 中组合），所以 script content 不需要改。
- Test path update 是机械的：research findings 显示 constants 位于 `tests/session-history-scripts.test.ts` lines 4-19。

**遵循模式：**
- `<skill>/scripts/` 目录下的 co-located scripts：与 `ce-clean-gone-branches/scripts/`、`ce-optimize/scripts/`、`ce-resolve-pr-feedback/scripts/` 相同。

**测试场景：**
- 测试预期：path constant update 后，`tests/session-history-scripts.test.ts` 继续通过。Test cases 本身不需要 behavior changes；`tests/fixtures/session-history/` fixtures 保持不变。
- 集成：每个 script 的 `git log --follow` 能在移动后保留 history。

**验证：**
- `bun test tests/session-history-scripts.test.ts` 通过。
- 四个 scripts 存在于 `plugins/compound-engineering/skills/ce-sessions/scripts/`，且不再存在于旧路径。

---

### U2. 将 `ce-sessions/SKILL.md` 改写为完整 session-history orchestrator

**目标：** 将当前 32 行 thin-wrapper SKILL.md 替换为完整 orchestrator：发现 sessions、filter/rank、extract content 到 `mktemp` scratch dir、dispatch synthesis-only historian，并返回 findings text。完成本 unit 后，直接调用 `/ce-sessions`，以及从另一个 skill（例如 `ce-compound` Phase 1）调用 `ce-sessions`，都会运行新 flow。

**需求：** R1, R2, R3, R4

**依赖：** U1（scripts 必须先位于新位置，SKILL.md 才能引用它们）

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-sessions/SKILL.md`（full rewrite）
- 修改：`plugins/compound-engineering/skills/ce-sessions/scripts/extract-skeleton.py`（新增 `--output PATH` arg；设置时将 output 写入指定文件而不是 stdout，并向 stdout emit 一行 `{"_meta": ..., "wrote": "<path>", "bytes": N}` status）
- 修改：`plugins/compound-engineering/skills/ce-sessions/scripts/extract-errors.py`（同样支持 `--output PATH`，parallel API）
- 修改：`tests/session-history-scripts.test.ts`（为两个 extract scripts 的新 `--output PATH` mode 增加 coverage：file 被写入、stdout emit status line、未传 flag 时保留原 stdout-mode behavior）

**方法：**
- **Frontmatter:** 保留 `name: ce-sessions`，更新 `description` 以反映 orchestrator role（比当前更长；按 `tests/frontmatter.test.ts` 保持在 1024 chars 内）。
- **Pre-resolved git branch**（existing）：保留当前 SKILL.md 使用的 `!`-backtick `git rev-parse --abbrev-ref HEAD` line；orchestrator 将 branch 传入 selection logic，并在相关时传入 synthesis dispatch prompt。
- **Step 1 — Discover and inventory:** 使用与当前 `ce-session-inventory/SKILL.md` line 27-31 **完全同形**的 discover-then-extract-metadata pipeline，并原样保留 null-delimited xargs hardening：
  ```
  bash scripts/discover-sessions.sh <repo> <days> [--platform <platform>] \
    | tr '\n' '\0' \
    | xargs -0 python3 scripts/extract-metadata.py --cwd-filter <repo>
  ```
  `tr '\n' '\0' | xargs -0` segment 是 load-bearing：它把 newline-delimited file paths 转成 null-delimited args，使 `extract-metadata.py` 以 batch mode（positional file args）运行。删除它会静默回退到 single-file stdin mode 并产出错误 output。main context 接收 JSONL inventory。把当前 historian agent 中的 time-range mapping table 移植过来，让 orchestrator 拥有 scan-window selection。
- **Step 2 — Filter and rank:** 将 historian 的 branch filter、keyword-filter（用 `--keyword K1,K2,...` 重新调用 discover/extract pipeline）、scan-window enforcement、current-session exclusion、top-5 deep-dive cap 移植到 orchestrator。同样逻辑，不同 host。
- **Step 3 — Scratch dir:** `mktemp -d -t ce-sessions-XXXXXX` → 捕获 absolute path；传入 Step 4 和 Step 5。
- **Step 4 — Per-session extraction（file-mediated，无 stdout round-trip）：** 对每个 selected session，用新增 `--output` flag 调用 extraction scripts，使 content 直接写入 scratch file：
  ```
  python3 scripts/extract-skeleton.py --output "$SCRATCH/{session-id}.skeleton.txt" < <file>
  ```
  Script 只在 stdout 返回短 status line（bytes written、parse errors）；bulk extraction content 不进入 main-context tool results。Conditional tail extract 和 errors extract（也支持 `--output`）遵循现有 historian heuristics。新增 `--output` flag 是 additive：未传时 scripts 行为与原来完全一致，保留现有 test coverage 和任何 manual / agent-driven invocations。
- **Step 5 — Dispatch synthesis subagent:** 通过平台 subagent primitive dispatch `ce-session-historian`（省略 `mode` 参数，让用户 permission settings 生效）。传入：problem topic、scratch dir、每个 selected session 的 `{path, platform, branch, ts, ...}` list、output schema。按现有 dispatch convention 使用 mid-tier model（例如 Claude Code 中的 `model: "sonnet"`）。
- **Step 6 — Return findings:** 将 synthesizer 的 text output 原样返回给 caller；如果 discovery / keyword filter 返回零结果，则返回 "no relevant prior sessions"。

**执行说明：** SKILL.md changes 无法被 `bun test` 直接测试；按 AGENTS.md（"Validating Agent and Skill Changes"）使用 `/skill-creator` 针对下面 test scenarios evaluate behavior。

**遵循模式：**
- `plugins/compound-engineering/skills/ce-clean-gone-branches/SKILL.md` lines 14-22：带 `__NONE__` sentinel handling pattern 的 bash script invocation。
- `plugins/compound-engineering/skills/ce-demo-reel/SKILL.md` lines 109-117：`mktemp -d -t <prefix>-XXXXXX` 每次运行临时 scratch pattern。
- `plugins/compound-engineering/skills/ce-plan/references/deepening-workflow.md` lines 170-177：捕获 absolute scratch path；将它传入 subagent dispatch prompt。
- 按 repo AGENTS.md "Cross-Platform User Interaction" section 做 cross-platform user-interaction blocks（ce-sessions 在无 args 调用时询问 question；当前 SKILL.md 已处理）。

**测试场景：**
- 正常路径：对 fixture-backed Claude Code session store 调用 `/ce-sessions "did we decide where notification mute state lives"` → orchestrator 运行 discover + extract-metadata，选择 ≤ 5 sessions，通过 `--output` 把 skeletons 提取到 scratch，dispatch synthesizer → 返回 prose findings。
- 边界情况（Empty inventory）：scan window 内没有 session files → orchestrator 返回 "no relevant prior sessions"，不 dispatch synthesizer，也不创建 scratch dir。
- 边界情况（Zero keyword matches）：branch filter 结果为零，keyword filter 返回 `files_matched: 0` → orchestrator 返回 "no relevant prior sessions"，不 dispatch synthesizer。
- 边界情况（Scan widening）：narrow scan 返回零，request 暗示 longer history → orchestrator 按 time-range table 扩大 window，重新调用 discover，重试 selection。
- 错误路径（Parse errors）：inventory `_meta` 报告 `parse_errors > 0` → orchestrator 在 dispatch prompt 中注明 partial 并继续；synthesizer 在 findings 中标记 partial。
- 错误路径（Script `--output` write fails）：scratch path 不可写（disk full、permission）→ script 返回 non-zero，orchestrator 向 user 明确 surface error，不 dispatch synthesizer。
- 集成（No subagent Skill calls）：grep runtime trace，确认没有 `Skill(...)` tool call 源自 dispatched historian。
- 集成（Skill primitive from skill body）：从 `ce-compound` 的 skill body 内通过平台 skill-invocation primitive 调用 `ce-sessions`，能无 hang 返回 findings text。当前 `ce-plan → ce-doc-review` invocation path 已经经验验证此场景；这里将它锁定到 ce-compound 的具体 call-site。
- 集成（Script invocation from runtime Bash）：当 ce-sessions 作为 slash-invoked skill 在 marketplace-cached install（不是 `--plugin-dir`）中运行时，`bash scripts/discover-sessions.sh` 和 `python3 scripts/extract-skeleton.py --output ...` 可正确 resolve。这处理 repo-root AGENTS.md（"relative paths resolve to skill dir on all platforms"）和 plugin AGENTS.md "Permission gate"（"runtime Bash CWD is user's project, not skill dir"）之间的矛盾。
- Cumulative context check：对 5-session fixture 调用 `/ce-sessions` → run 完成后，orchestrator 的 tool-result bytes 中归因于 extraction content 的部分受限于 script status lines（总计几百 bytes），而不是 skeleton/errors content 本身。

**验证：**
- 针对上述 test scenarios 的 `/skill-creator` eval 通过。
- `bun test tests/frontmatter.test.ts` 通过（description length、ce- prefix、no angle brackets 等）。
- `bun test tests/skill-shell-safety.test.ts` 通过（任何新的 `!`-backtick pre-resolution lines 都符合 safety）。
- `bun test tests/session-history-scripts.test.ts` 覆盖 modified extract scripts 的 stdout-mode（existing behavior）和 `--output PATH` mode。
- **Marketplace-install smoke test**（manual）：通过 `/plugin install` fresh install（不是 `--plugin-dir`）后，调用 `/ce-sessions "what did we work on this week"` 并确认 orchestrator 的 `bash scripts/...` invocations 能 resolve。如果失败并报 `No such file or directory`，说明 cross-platform-portable-relative-path assumption 错误，架构必须转向 `${CLAUDE_SKILL_DIR}` + pinned `allowed-tools`（Claude-Code-only path；把 R4 当作已知 regression）。Fail-fast 优于发布 broken release。

---

### U3. 将 `ce-session-historian.agent.md` 重构为 synthesis-only

**目标：** 将 agent 缩减为 synthesis：它接收 problem topic + dispatch prompt 中的 extracted file paths，使用 native file-read tool（Claude Code 中的 Read）读取 files，并按现有 output schema 返回 prose findings。删除所有 `Skill(...)` invocations 和 orchestration logic（discovery、selection、extraction primitives、time-range mapping）；这些现在都位于 `ce-sessions`。

**需求：** R1, R2, R3

**依赖：** U2（orchestrator 的 dispatch shape 决定 agent 的 input contract；两者必须一致）

**文件：**
- 修改：`plugins/compound-engineering/agents/ce-session-historian.agent.md`（substantial rewrite）

**方法：**
- **删除：** "Extraction Primitives" section（lines 100-108）、"Methodology" Steps 1 / 3 / 4 / 5（orchestration now in ce-sessions）、time-range mapping table、branch-filter 和 keyword-filter rules、deep-dive cap、以及所有 `Skill(ce-session-inventory)` / `Skill(ce-session-extract)` / "Invoke them through the Skill tool" prose。
- **删除：** lines 11-13 的 "two modes" framing（compound enrichment + conversational）：今天没有实际 caller 用绕过 orchestrator 的 mode dispatch agent。替换为 single-purpose framing。
- **保留：** Guardrails section（no thinking-block leakage、never read whole session files into context、technical content not personal content、fail-fast on access errors）。
- **保留：** Step 6 的 synthesis methodology（Investigation journey、User corrections、Decisions and rationale、Error patterns、Evolution across sessions、Cross-tool blind spots、Staleness caveat）。
- **保留：** output format（尊重 caller-supplied schema；否则使用 default header line）。
- **添加：** input-contract section，记录 dispatch prompt shape：`{problem_topic, scratch_dir, [{path, platform, branch?, ts, ...}], output_schema}`。Agent 使用 native file-read tool 读取每个 `path`；永不直接读取 source session files。
- **添加：** 按 `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md` 增加 standalone fallback：当 dispatch prompt 没有 paths 时，返回 "no relevant prior sessions"，而不是尝试任何 Skill 或 Bash discovery（防御 future direct-dispatch）。

**执行说明：** 按 AGENTS.md 使用 `/skill-creator` 做 behavioral testing。Plugin agent definition 会在 session start 时缓存，因此 iterative testing 需要 skill-creator 的 content-injection workflow 或新 session。

**遵循模式：**
- `docs/solutions/skill-design/compound-refresh-skill-improvements.md` Solution #5：subagents 使用 native file-read tools，而不是 shell。
- Output schema prose（default 和 caller-supplied）：从当前 agent 的 Output section 原样移植。

**测试场景：**
- 正常路径：dispatch prompt 带 problem topic + 3 个有效 scratch paths → agent 用 Read 读取每个 path，按 output schema synthesize，并在 time budget 内返回 prose findings。
- 边界情况（Empty paths）：dispatch prompt 带空 paths array → agent 不调用任何 tools，返回 "no relevant prior sessions"。
- 边界情况（Caller-supplied schema）：dispatch prompt 指定 custom output schema → agent 原样尊重该 schema，省略自己的 header。
- 错误路径（Unreadable file）：一个 path Read error → agent 标注 partial extraction，并从其余 files synthesize。
- 集成（No Skill calls）：trace agent 的 tool-call list，确认没有 `Skill(...)` calls。由 U5 regression test 捕获。
- 集成（Cross-tool synthesis）：paths 跨 Claude Code + Codex + Cursor → 当确有信息价值时，synthesis 包含 Cross-tool blind spots。

**验证：**
- 静态检查：agent file 不包含 `Skill(ce-session-inventory)`、`Skill(ce-session-extract)` 或 "Invoke them through the Skill tool" prose。由 U5 锁定。
- `/skill-creator` eval 覆盖上述 test scenarios。

---

### U4. 更新 `ce-compound/SKILL.md` Phase 1，通过 skill-invocation primitive 委托给 `ce-sessions`

**目标：** 将 `ce-compound` Phase 1 中的 direct historian-dispatch block 替换为对 `ce-sessions` skill 的 delegation，通过平台 skill-invocation primitive 调用。接收 findings text；Phase 2 中现有 fold-into-doc flow 保持不变。通过正确排序 invocation 保留与其他 Phase 1 research subagents 的 wall-clock parallelism。

**需求：** R1, R4, R6

**依赖：** U2（ce-sessions orchestrator 必须存在且可工作）、U3（由 ce-sessions 间接调用的 historian agent 必须已重构）

**文件：**
- 修改：`plugins/compound-engineering/skills/ce-compound/SKILL.md`（Phase 1 historian-dispatch block，lines 175-198）

**方法：**
- **Replace** "Session Historian (foreground, after launching the above — only if the user opted in)" block 为对 `ce-sessions` 的 delegation。按 `ce-plan/references/plan-handoff.md` line 57 和 plugin AGENTS.md "Cross-Platform Reference Rules" 使用**既有 semantic-prose convention**：
  > *Invoke the `ce-sessions` skill via the platform's skill-invocation primitive (`Skill` in Claude Code, `Skill` in Codex, the equivalent on Gemini/Pi), passing the problem topic and time window as the skill argument.*
  > 中文含义：通过平台的 skill-invocation primitive 调用 `ce-sessions` skill（Claude Code 和 Codex 中是 `Skill`，Gemini/Pi 使用等价机制），并把 problem topic 和 time window 作为 skill argument 传入。

  不要在 SKILL.md body 里写字面 `Skill(ce-sessions, ...)` tool-call expression，因为这会在 skill 通过 converters 原样发送给非 Claude targets 时传播 Claude-Code-specific syntax（R4 regression）。
- **明确指定 dispatch ordering 以保留 wall-clock parallelism**：当前 Phase 1 设计会 dispatch 三个 background research subagents（`Context Analyzer`、`Solution Extractor`、`Related Docs Finder`）并同时运行 foreground historian，明确目的是让 historian "runs while the background agents work, adding no wall-clock time"（current SKILL.md line 105）。新顺序：**先 launch 三个 background research subagents；再发出对 `ce-sessions` 的 skill-invocation primitive call。** Skill call 对 `ce-compound` main-context turn 来说是 synchronous（会 block 直到 ce-sessions 返回），但已经 dispatch 的 background subagents 会在底层继续并行运行，因此即使 concurrency primitive 从 "foreground subagent" 变成 "synchronous skill call"，wall-clock benefit 仍得以保留。在重写的 Phase 1 prose 中内联记录该 rationale，避免后续 refactor 重新倒置顺序。
- **Carry the dispatch payload forward**：pre-resolved branch（lines 25-27 已预先 resolve）、problem topic（按现有 dispatch shape 用一句话）、显式 time window（默认 7 days）、以及现有 single-line filter rule。ce-sessions 从 skill argument string 中解析这些信息。
- **Preserve Phase 1 contract**，按 `pass-paths-not-content-to-subagents.md` 和 ce-pipeline-end-to-end-learnings：
  - Conditional invocation（用户拒绝 session history 时 skip；lightweight mode 中完全跳过）保留。
  - Text-only return 保留。
  - Phase 2 的 fold-into-doc behavior（当前 SKILL.md sections 222-227）不变。

**遵循模式：**
- `plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md` line 57：一个 skill 调用另一个 skill 的 canonical semantic-prose form。镜像该 phrasing structure。
- 当前 lines 182-198 的 Phase 1 dispatch-prompt template：复用 "tight prompt" discipline（single-line filter rule、explicit time window、problem topic as one sentence）。

**测试场景：**
- 正常路径：`/ce-compound` Full mode，user 选择 session history → background research subagents launch，然后 ce-compound delegate 给 ce-sessions 并收到 findings → fold into "What Didn't Work" / "Context" sections。
- Wall-clock 检查：`/ce-compound` Full mode 且 session history opt-in → end-to-end runtime 约等于 `max(ce-sessions, slowest background subagent)`，而不是两者之和。可通过在 fixture-backed run 上与今天 foreground-subagent baseline 对比测量。
- 边界情况（User declines session history）：Phase 1 不 invoke ce-sessions；现有 Phase 1 parallel research（Context Analyzer、Solution Extractor、Related Docs Finder）不变。
- 边界情况（Lightweight mode）：不询问 session-history follow-up question；不 invoke ce-sessions。
- 边界情况（返回 "no relevant prior sessions"）：findings string 等于 no-results sentinel → Phase 2 fold-in 按现有逻辑 skip。
- 集成（No subagent Skill calls）：由 ce-sessions 间接 dispatch 的 historian 在 subagent context 中运行，但永不 invoke Skill（由 U5 regression test 锁定）。
- 集成（Cross-platform conversion）：`bun convert --to codex|cursor|gemini` 后，converted ce-compound 的 Phase 1 prose 仍以每个 target primitive 可路由的方式描述 skill invocation。Semantic prose 能完整 survive conversion，而字面 `Skill(ce-sessions, ...)` 会泄漏 Claude-Code-specific syntax。

**验证：**
- `/skill-creator` eval of `/ce-compound` against a fixture-backed session store 通过。
- 重写后的 ce-compound/SKILL.md Phase 1 block 包含 semantic-prose form（匹配 plan-handoff.md line 57 shape），且不包含字面 `Skill(ce-sessions, ...)` tool-call expression。
- Dispatch block 不再包含 `Agent(ce-session-historian)` 或 `Task ce-session-historian` direct calls。

---

### U5. 添加针对 agent file body 的 regression test

**目标：** 用静态 test 锁定 no-`Skill(...)`-from-subagent invariant；如果 agent file 被回退到旧形态，test 会失败。防止后续 edits 意外重新引入 deadlock。

**需求：** R2

**依赖：** U3（agent 必须先被重构，test 才能 assert 新形态）

**文件：**
- 创建：`tests/skills/ce-session-historian-no-skill-tool.test.ts`

**方法：**
- 在 module load 时通过 `readFileSync` 读取 `plugins/compound-engineering/agents/ce-session-historian.agent.md`。
- 三个 assertions：
  1. `expect(body).not.toMatch(/Skill\(\s*["'`]?ce-session-inventory/)`：任何 quote style 下都没有 `Skill(ce-session-inventory)` invocation。
  2. `expect(body).not.toMatch(/Skill\(\s*["'`]?ce-session-extract/)`：没有 `Skill(ce-session-extract)` invocation。
  3. `expect(body).not.toMatch(/Invoke them through the Skill tool/i)`：broken pattern 的 prose fingerprint 不存在。

**遵循模式：**
- `tests/skills/ce-plan-handoff-routing.test.ts`：module load 时读 SKILL.md，一次性 regex-anchor scope，iterate expected fragments。形状相同。

**测试场景：**
- 正常路径：针对 refactored agent（post-U3）file，test 通过。
- 回归检查：本地把 agent revert 到当前（broken）状态，test 失败。这就是该 test 购买的价值。

**验证：**
- `bun test tests/skills/ce-session-historian-no-skill-tool.test.ts` 针对 post-U3 state 通过。

---

### U6. Cleanup：删除 unused skills，注册为 legacy，并修复 doc broken links

**目标：** 删除现在 callerless 的 `ce-session-inventory` 和 `ce-session-extract`，将它们登记进所有三个 legacy-cleanup lookups，让现有 flat-installs 在 upgrade 时 sweep，并修复 user-facing docs 中现在会断的 cross-references。

**需求：** R5, R6

**依赖：** U1（scripts 已移出这些 skill dirs）、U2（没有 caller 再 invoke 它们）、U3（agent 不再 invoke 它们）

**文件：**
- Delete（删除）: `plugins/compound-engineering/skills/ce-session-inventory/`（directory and all contents；U1 移动 scripts 后只剩 `SKILL.md`）
- Delete（删除）: `plugins/compound-engineering/skills/ce-session-extract/`（同上）
- Modify（修改）: `src/utils/legacy-cleanup.ts`：将 `ce-session-inventory` 和 `ce-session-extract` 加入 `STALE_SKILL_DIRS`（"Removed skills (no replacement)" cluster）以及 `LEGACY_ONLY_SKILL_DESCRIPTIONS`（使用被删除 skills frontmatter 中逐字复制的 `description:` strings）
- Modify（修改）: `src/data/plugin-legacy-artifacts.ts`：将 `ce-session-inventory` 和 `ce-session-extract` 加入 `EXTRA_LEGACY_ARTIFACTS_BY_PLUGIN["compound-engineering"].skills[]`，按字母排序
- Modify（修改）: `docs/skills/ce-sessions.md`：修复 lines 110、175-176 的 broken `See Also` links；可改指向 `ce-sessions/scripts/<script>` 或直接删除 entries（这些是 agent-facing primitives，不再是单独 user-discoverable skills，所以删除更干净）

**方法：**
- 最后删除两个 skill directories，在 U1-U4 land 之后。按 repo AGENTS.md "removing a skill" checklist，registry updates 与 directory deletions 放在同一 commit。
- 在 `EXTRA_LEGACY_ARTIFACTS_BY_PLUGIN["compound-engineering"].skills[]` 中按字母插入 `ce-session-extract` 和 `ce-session-inventory`；根据 research，大概分别位于 `ce-review-beta` / `ce-update` 和 `ce-reproduce-bug` / `ce-review` 附近。
- 对 `LEGACY_ONLY_SKILL_DESCRIPTIONS`，删除前从 skills frontmatter 复制 `description:` strings。按该 file docstring，这些 strings 是 ownership-fingerprint proofs。
- 对 `docs/skills/ce-sessions.md`：lines 110、175-176 指向将被删除的 skill directories。删除 bullets 比重写更干净（user-facing doc 不应把读者引到不再存在的 internal-only skill dirs）。

**遵循模式：**
- `src/utils/legacy-cleanup.ts` line 89 的 "Removed skills (no replacement)" comment block：新 entries 的既有 cluster。
- `src/utils/legacy-cleanup.ts` `LEGACY_ONLY_SKILL_DESCRIPTIONS` entries（lines 253-284）：保持 alphabetical sort 和 verbatim-description discipline。
- `src/data/plugin-legacy-artifacts.ts` skills array：alphabetical sort，不加 comment。

**测试场景：**
- 测试预期：无。纯 cleanup，不新增待测 behavior。现有 `tests/legacy-registry-invariants.test.ts` 会通过（deleted directories 不再 match current-skill names）。
- 验证（Registry tests）：现有 `tests/legacy-registry-invariants.test.ts`、`tests/legacy-cleanup.test.ts` 和 `tests/plugin-legacy-artifacts.test.ts` 继续通过。
- 验证（Marketplace parity）：`bun run release:validate` 通过。
- 验证（Broken links）：modified `docs/skills/ce-sessions.md` 不包含指向 `../../plugins/compound-engineering/skills/ce-session-inventory/` 或 `../../plugins/compound-engineering/skills/ce-session-extract/` 的 markdown links。

**验证：**
- `bun test` 通过。
- `bun run release:validate` 通过。
- `plugins/compound-engineering/skills/ce-session-inventory/` 和 `plugins/compound-engineering/skills/ce-session-extract/` 不再存在于磁盘。

---

## 系统级影响

- **交互图：**
  - `/ce-sessions`（user-facing slash）→ ce-sessions skill orchestrator → ce-session-historian synthesis subagent → 返回 findings。
  - `/ce-compound` Phase 1 → 先 launch background research subagents（Context Analyzer / Solution Extractor / Related Docs Finder）→ 再通过平台 skill-invocation primitive 调用 ce-sessions → ce-sessions orchestrator → historian → 返回 findings → folded into doc Phase 2。
  - 重构后 historian agent 只有一种 caller（ce-sessions orchestrator）。通过 `Agent(ce-session-historian)` 直接 dispatch 不是 supported pattern；agent 的 standalone fallback 会优雅返回 "no relevant prior sessions"。
- **错误传播：**
  - Script execution errors（permission、missing files）通过 non-zero exit codes surface 给 orchestrator；orchestrator 按现有 fail-fast guardrail 向 user 报告问题并停止。
  - Synthesizer 对个别 files 的 Read errors → 在 findings 中注明 partial extraction；仍从其余 files synthesize。
- **状态生命周期风险：**
  - `mktemp -d` scratch dir 是 per-run throwaway。OS 负责 cleanup。不需要显式 cleanup，但 skill 末尾的一行 `rm -rf "$SCRATCH"` 无害且能表达意图。
  - Plugin agent 和 skill 会在 session start 时缓存（见 repo AGENTS.md "Validating Agent and Skill Changes"）：dev 期间测试需要 `/skill-creator` content-injection 或 fresh session；当前 session cache 不会反映 file edits。
- **API surface parity（API surface parity，API 表面对等性）：**
  - ce-compound 对 ce-sessions 的 delegation 使用既有 semantic-prose convention（见 `ce-plan/references/plan-handoff.md` line 57 和 plugin AGENTS.md "Cross-Platform Reference Rules"），不是字面 `Skill(ce-sessions, ...)` tool-call expression。这样避免在 skill 通过 converters 原样发往 Codex/Cursor/Gemini/OpenCode/Pi/Kiro 时泄漏 Claude-Code-specific syntax。每个 target 的 converter 在 install time 路由 semantic prose 到 native primitive。
  - Cross-platform conversion writers（`src/converters/claude-to-codex.ts`、`claude-to-gemini.ts` 等）将 agent 和 skill content 作为 opaque text 处理，并且已会复制 `<skill>/scripts/` 下的 script directories。按 U6 的 legacy-cleanup machinery，script move 和 skill deletion 应能 cleanly round-trip 到每个 target writer。
- **集成覆盖：**
  - End-to-end：选择 session history opt-in 的 `/ce-compound` Full mode 完成且无 hangs（issue #794 closure 的 headline test）。
  - End-to-end：带 question 的 `/ce-sessions` 完成且无 hangs。
  - Cross-platform：`bun test` 覆盖 script behavior；SKILL.md / agent.md changes 通过 `/skill-creator` 验证。
- **不变的 invariants：**
  - Cross-platform session discovery（Claude Code、Codex、Cursor）：script behavior 不变。
  - Output schemas（default historian header；caller-supplied schema 原样尊重）：保留。
  - Time-range table、branch filter、keyword filter、top-5 deep-dive cap：从 agent 移到 orchestrator，但逻辑保留。
  - `/ce-compound` Phase 2 fold-in behavior：不变。
  - `/ce-sessions` 面向 user 的 empty argument question prompt：保留。

---

## 风险与依赖

| 风险 | 缓解措施 |
|------|------------|
| Plugin agent and skill definitions cache at session start; in-session edits do not propagate（见 repo AGENTS.md）。Dev 期间 iterative testing 可能测到 stale content。 | 按 AGENTS.md "Validating Agent and Skill Changes" 使用 `/skill-creator` eval workflow。只有 skill-creator 不能隔离变量时才重启 sessions。 |
| 将 methodology 从 subagent 移到 orchestrator 可能产生细微 behavior drift：judgment calls（何时 widen、derive 哪些 keywords）在 main context（opus / orchestrator）而不是 subagent（sonnet historian）执行。 | 从 agent 原样移植 methodology rules。在 ce-sessions/SKILL.md 中明确记录 model-tier shift，避免未来 refactor 引入 silent drift。 |
| Slash-invoked skills 中的跨平台 script-path resolution：repo-root AGENTS.md 称 relative paths 在所有平台从 skill dir resolve；plugin AGENTS.md "Permission gate" 警告 runtime Bash CWD 是 user project 而非 skill dir。docs 中存在矛盾。 | U2 Verification 包含 marketplace-install smoke test（非 `--plugin-dir`），调用 `/ce-sessions` 并确认 `bash scripts/...` 可 resolve。如果失败，fallback 到 `${CLAUDE_SKILL_DIR}` + pinned `allowed-tools`（把 R4 当作 known regression，并触发 follow-up plan 处理其他 targets）。现有 precedents（ce-clean-gone-branches、ce-resolve-pr-feedback、ce-optimize）说明 relative-path form 应可工作，但 merge 前经验验证是低成本保险。 |
| 如果在 parallel background research subagents launch 之前发起 ce-sessions skill-invocation primitive call，`/ce-compound` Phase 1 wall-clock parallelism 会回退。 | U4 Approach 明确 pin dispatch ordering：先 launch background research subagents，再 invoke ce-sessions。Background subagents 会在同步 skill call 底层继续运行。U4 Test scenarios 包含与当前 foreground baseline 的 wall-clock comparison。 |
| Legacy-cleanup descriptions map（`LEGACY_ONLY_SKILL_DESCRIPTIONS`）要求逐字历史 `description:` strings。 | 删除前从 deleted skills frontmatter 复制 strings。两个 strings 都短且稳定。 |

---

## 文档与运行说明

- **Skill documentation sync**（`docs/skills/ce-sessions.md`）：高层 user-facing description（"Search and ask questions about your coding agent session history"）不变。"How it works" mechanics 发生变化（orchestration 从 agent 移到 skill），但 doc 的抽象层级不 surface 这些细节。U6 中只做最小 edit：修复指向 deleted skill dirs 的 broken `See Also` links。不需要同步 mechanics-level prose。
- **Stable/Beta sync**：`ce-sessions` 和 `ce-session-historian` 都没有 `-beta` counterpart。不需要 sync action。
- **CHANGELOG / release**：release-please 负责；不要手改。Conventional commit prefix `fix(ce-sessions): `（或 `fix(session-history): `）会按 AGENTS.md 正确分类。
- **Rollout**：标准 merge-to-main；不需要 migration 或 feature-flag。该 bug 当前正在破坏 Claude Code 上的 session-history features；fix 可 clean land。

---

## 来源与参考

- **原始 issue**：[EveryInc/compound-engineering-plugin#794](https://github.com/EveryInc/compound-engineering-plugin/issues/794)：`ce-session-historian` 在 Claude Code 下 deadlock：subagent 不能 invoke `Skill(ce-session-inventory)`。
- **上游 tracker**：[anthropics/claude-code#38719](https://github.com/anthropics/claude-code/issues/38719)：Allow subagents to invoke skills for parallel workflow execution（已关闭；架构限制仍然存在）。
- **组织内 learnings**：
  - `docs/solutions/skill-design/pass-paths-not-content-to-subagents.md`
  - `docs/solutions/skill-design/script-first-skill-architecture.md`
  - `docs/solutions/skill-design/compound-refresh-skill-improvements.md`
  - `docs/solutions/skill-design/research-agent-pipeline-separation.md`
  - `docs/solutions/skill-design/post-menu-routing-belongs-inline.md`
  - `docs/solutions/best-practices/ce-pipeline-end-to-end-learnings.md`
- **Repo 约定**：
  - `plugins/compound-engineering/AGENTS.md`：Plugin Maintenance、Skill Compliance Checklist、Permission gate on extracted scripts（说明 `!` pre-resolution scope）。
  - Repo-root `AGENTS.md`：Plugin Maintenance、Adding a New Plugin、Script Path References in Skills、Plugin Maintenance 中的 "removing a skill" cleanup-registry checklist。
- **Pattern 先例**：
  - `plugins/compound-engineering/skills/ce-clean-gone-branches/SKILL.md`、`ce-resolve-pr-feedback/SKILL.md`、`ce-optimize/SKILL.md`：slash-invoked skill bodies 中的 bare relative-path script invocations。
  - `plugins/compound-engineering/skills/ce-plan/references/plan-handoff.md` line 57：一个 skill 调用另一个 skill 的 semantic-prose convention，ce-compound 对 ce-sessions 的 delegation 会镜像它。
  - `plugins/compound-engineering/skills/ce-demo-reel/SKILL.md`、`ce-plan/references/deepening-workflow.md`、`ce-work-beta/references/codex-delegation-workflow.md`：`mktemp -d` scratch + path-to-subagent patterns。
  - `tests/skills/ce-plan-handoff-routing.test.ts`：新 U5 test 的 regression test pattern。
