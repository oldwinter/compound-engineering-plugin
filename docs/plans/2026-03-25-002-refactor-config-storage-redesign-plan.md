---
title: "refactor: 重新设计 compound-engineering 的 config 和 worktree-safe storage"
type: refactor
status: active
date: 2026-03-25
deepened: 2026-03-25
origin: docs/brainstorms/2026-03-25-config-storage-redesign-requirements.md
---

# 重新设计 Compound Engineering 的 Config 和 Worktree-Safe Storage

## 概览

用 two-scope state model 替换 legacy repo-local config and storage assumptions：

- `user_state_dir` 用于 user-level CE state 和 per-project durable storage
- `repo_state_dir` 用于 repo-local CE config

本 work 保留本 branch 上已添加的 new `/ce-doctor` + `/ce-setup` dependency flow，但将其指向 new state contract，并把 durable plugin state 从 `.context/compound-engineering/...` 和 `todos/` 迁出。

## 问题框架

当前 plugin 仍把 repo-local `.context/compound-engineering/...` 和 legacy `compound-engineering.local.md` 视为 stable runtime contracts。这会在 git worktrees 间 break，setup migration undefined，并让旧 assumptions 泄漏到 docs、tests 和 converter fixtures 中。Main 也已移除 setup-managed reviewer selection，因此本 refactor 不得在新的 config file 中重新创建该 model。（see origin: `docs/brainstorms/2026-03-25-config-storage-redesign-requirements.md`）

## 需求追踪

- R1-R10. 在 `repo_state_dir` 下引入 YAML config，保持 compatibility metadata minimal，并让 `/ce-setup` 成为 legacy config 的唯一 migration owner。
- R11-R16. 在 `AGENTS.md` 中 codify standard config/storage contract section，保持 cross-agent and low-friction，并在 core entry skills 加 `/ce-doctor` 中 centralize migration warnings。
- R17-R23. 将 durable CE state resolve 到 `user_state_dir/projects/<project-slug>/`，preserve legacy todo reads，并将 future durable writes 移到那里。
- R24-R31. 围绕 new config/storage contract 扩展 `/ce-doctor` 和 `/ce-setup`，同时保留 registry-driven dependency flow 和 fresh scans。
- R32-R33. 从 skills、tests 和 converter surfaces 移除 old config/storage contract，不引入 provider-specific paths。

## 范围边界

- 不将 review-agent selection 或 review-context storage 重新引入 plugin-managed config。
- 不主动将 historical per-run scratch directories 从 repo-local `.context/compound-engineering/...` 迁出。
- 不添加 garbage collection 或 pruning orphaned per-project directories。
- 不将 `compound-engineering.local.md` 作为 long-term dual-write format 保留；只把它视为 legacy migration input。
- 不把此 work 扩展为 project dependency management，例如 `bundle install`、app setup 或 team-authored config workflows；只铺设 repo-local config structure。

## 上下文与调研

### 相关代码和模式

- [plugins/compound-engineering/skills/ce-setup/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-setup/SKILL.md) 当前只关注 dependency setup；review-agent configuration 已在 main 上移除。
- [plugins/compound-engineering/skills/ce-doctor/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/SKILL.md) 和 [plugins/compound-engineering/skills/ce-doctor/scripts/check-health](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/scripts/check-health) 已提供 shared diagnostic surface 和 script-first dependency checks。
- [plugins/compound-engineering/skills/ce-brainstorm/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-brainstorm/SKILL.md)、[plugins/compound-engineering/skills/ce-plan/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-plan/SKILL.md) 和 [plugins/compound-engineering/skills/ce-work/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-work/SKILL.md) 是 concrete core entry skills，当前缺少 shared migration-warning contract。
- [plugins/compound-engineering/skills/todo-create/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/todo-create/SKILL.md)、[plugins/compound-engineering/skills/todo-triage/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/todo-triage/SKILL.md) 和 [plugins/compound-engineering/skills/todo-resolve/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/todo-resolve/SKILL.md) encode current todo path contract and legacy-drain semantics。
- [plugins/compound-engineering/skills/ce-review/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-review/SKILL.md)、[plugins/compound-engineering/skills/feature-video/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/feature-video/SKILL.md) 和 [plugins/compound-engineering/skills/deepen-plan/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/deepen-plan/SKILL.md) 是仍 hardcoding `.context/compound-engineering/...` 的 highest-signal per-run artifact consumers。
- Converter/test surfaces 仍在 [tests/converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/converter.test.ts)、[tests/codex-converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/codex-converter.test.ts)、[tests/copilot-converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/copilot-converter.test.ts)、[tests/pi-converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/pi-converter.test.ts)、[tests/review-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/review-skill-contract.test.ts)、[src/utils/codex-agents.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/src/utils/codex-agents.ts) 和 [src/converters/claude-to-pi.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/src/converters/claude-to-pi.ts) 中 encode old contract。
- [docs/solutions/skill-design/beta-skills-framework.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/skill-design/beta-skills-framework.md) 是 active solution doc，仍引用 old config contract，因此 doc sweep 不能只限 tests 和 plugin README。
- Repo-level instruction surfaces（repo 级 instruction surfaces）位于 [AGENTS.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/AGENTS.md) 和 [plugins/compound-engineering/AGENTS.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/AGENTS.md)。

### 机构经验

- [docs/solutions/skill-design/compound-refresh-skill-improvements.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/skill-design/compound-refresh-skill-improvements.md)：keep skill instructions platform-agnostic，avoid hardcoded tool names，并 prefer dedicated file tools over shell exploration 以 reduce prompts。
- [docs/solutions/workflow/todo-status-lifecycle.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/workflow/todo-status-lifecycle.md)：todo status is load-bearing；任何 path migration 都必须 preserve pending/ready/complete pipeline，而不是 flattening it。
- [docs/solutions/codex-skill-prompt-entrypoints.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/codex-skill-prompt-entrypoints.md)：copied `SKILL.md` content often passed through mostly as-is，因此 skill wording 必须在没有 target-specific rewriting assumptions 时仍 meaningful。

### 外部参考

- 无。repo 已包含本轮 planning pass 所需的足够 current patterns。

## 关键技术决策

- **Keep the state vocabulary to two named directories.** 使用 `user_state_dir` 和 `repo_state_dir`，并把 per-project storage path 视为 derived subpath `<user_state_dir>/projects/<project-slug>/`，而不是命名第三个 root。
- **Standardize on header plus selective preamble.** 每个 skill 携带一个 compact config/storage header，保证 vocabulary 和 fallback behavior consistent。只有 independently invocable、会 diagnose config state 或 read/write durable CE state 的 skills 携带 full config-resolution preamble。Parent skills 会把 resolved values 传给 spawned agents，除非 child 本身 independently invocable。
- **Do not revive legacy review config.** `compound-engineering.local.md` 是 obsolete cleanup input only。任何 surviving YAML config 只应存储 real persisted CE state，例如 minimal compatibility metadata，而不是 runtime 可以 deterministically derive 的 values。
- **Keep migration state user-action oriented.** runtime 只需要区分四种 practical states：no new config yet、legacy/conflicting config that needs migration、stale compatibility contract that requires rerunning `/ce-setup`、current config。除非 execution 发现 user-visible remediation 差异，否则不拆分 "migration version" 和 "setup version"。
- **Make `/ce-setup` the only writer of migration state.** `/ce-doctor` 负责 diagnose，entry skills 负责 warn，但只有 `/ce-setup` reconcile legacy and new config。
- **Treat path derivation as runtime contract, not persisted config.** Independently invocable config/storage consumers 应从 standard preamble 直接 derive `user_state_dir`、`repo_state_dir` 和 per-project path。`/ce-setup` 不应为了让 later skills work 而预写 derived per-project path。
- **Treat project identity as a shared-storage guarantee.** per-project path 必须从 shared repo identity resolve，而不是 current checkout identity。使用 `git rev-parse --path-format=absolute --git-common-dir` 作为 primary identity source，使 linked worktrees map 到同一个 CE project。directory slug 形式为 `<sanitized-repo-name>-<short-hash>`，其中 repo name 来自 `${git_common_dir%/.git}` basename，hash 来自 full absolute `git_common_dir`。如果 git identity 无法 resolve，execution 可用 deterministic absolute-path fallback，但 worktree-safe path 必须是 default contract。
- **Degrade instead of blocking on missing CE state.** Core entry skills 应 emit short migration warning 并指向 `/ce-setup`，但 missing CE config or storage 默认不阻塞 main workflow。Full-preamble skills 应尽可能 derive canonical paths，否则 locally degrade：不要写 legacy 或 guessed fallback paths，report what could not be persisted，并在 main task still safe to complete 时继续。
- **Preserve todo migration semantics, not per-run artifact history.** Todos 在 drain period 中保留 dual-read compatibility；per-run artifact directories 只 change future writes。
- **Keep one active planning chain.** Current operational surfaces 应直接 adopt new contract，earlier setup/todo requirements and plan docs 应 fold into this plan，而不是作为 competing active guidance 留存。
- **Use contract tests for prompt surfaces that now matter operationally.** Existing converter and review contract tests already validate prompt text；添加 setup/ce-doctor 或 storage-focused contract coverage，而不是只依赖 manual inspection。

## 开放问题

### 规划期间已解决

- **本 plan 是否假设 review-agent config 仍存在？** 否。Main 已移除 setup-managed reviewer selection，因此本 refactor 不得重新创建它。
- **storage vocabulary 是否保留 named project root variable？** 否。使用 `user_state_dir` 和 `repo_state_dir`；直接引用 `<user_state_dir>/projects/<project-slug>/`。
- **per-project slug 如何 derive？** 使用来自 `git rev-parse --path-format=absolute --git-common-dir` 的 shared git identity，然后 derive human-friendly directory-safe slug as `<sanitized-repo-name>-<short-hash>`。这有意在同 repo linked worktrees 间 stable，并在 separate clones 间不同。
- **哪些 skills 应带 migration warnings？** concrete warning surfaces 是 [plugins/compound-engineering/skills/ce-setup/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-setup/SKILL.md)、[plugins/compound-engineering/skills/ce-doctor/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/SKILL.md)、[plugins/compound-engineering/skills/ce-brainstorm/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-brainstorm/SKILL.md)、[plugins/compound-engineering/skills/ce-plan/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-plan/SKILL.md)、[plugins/compound-engineering/skills/ce-work/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-work/SKILL.md) 和 [plugins/compound-engineering/skills/ce-review/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-review/SKILL.md)。Non-core skills 只有在 independently invocable 且实际需要 config 或 durable storage 时才 inherit contract。
- **是否 rewrite every old reference？** 否。Active docs and tests 应 adopt new contract。Historical requirements/plans preserved for traceability，仅在它们可能被误认为 current runtime guidance 时 annotate。
- **是否需要 external research？** 否。repo 已包含 relevant prompt、converter 和 lifecycle patterns。

### 推迟到实现阶段

- **Compatibility metadata shape:** plan 假设 minimal compatibility contract，但 execution 应在 surrounding prompt text 更新后 finalize 它是 single revision key 还是 small structured object。
- **Shared reference artifact vs. AGENTS-only wording:** plan 假设 `AGENTS.md` 是 config/storage contract section 的 primary source of truth。execution 可决定 separate reference file 是否 materially reduces duplication。

## 高层技术设计

> *这说明 intended approach，是给 review 的 directional guidance，不是 implementation specification。实施 agent 应将其视为 context，而不是要复刻的代码。*

```text
user_state_dir/
  config.yaml                      # optional global defaults / compatibility state if needed
  projects/
    <project-slug>/
      todos/
      ce-review/<run-id>/
      deepen-plan/<run-id>/
      feature-video/<run-id>/
      ...

<repo>/repo_state_dir/
  config.yaml                      # optional tracked repo-level CE config (reserved / future)
  config.local.yaml                # optional machine-local CE config; gitignore this file, not the whole directory

Resolution flow:
1. Resolve repo_state_dir as `<repo>/.compound-engineering`
2. Resolve user_state_dir from the documented fallback chain
3. Derive the per-project path under user_state_dir/projects/<project-slug>/
4. Read config layers only when they exist and the skill needs persisted CE values
5. If compatibility or migration state is stale, route the user to /ce-setup

Project slug:
- identity source: `git rev-parse --path-format=absolute --git-common-dir`
- readable prefix: sanitized basename of `${git_common_dir%/.git}`
- stable suffix: short hash of the full absolute `git_common_dir`
- format: `<sanitized-repo-name>-<short-hash>`

Action model:
- no repo-local CE file yet -> warn only when relevant, `/ce-doctor` explains current state, `/ce-setup` initializes or refreshes if needed
- legacy `compound-engineering.local.md` present -> warn in core entry skills, `/ce-doctor` explains that it is obsolete, `/ce-setup` deletes it after explanation
- new config below required contract -> warn in core entry skills, `/ce-doctor` explains rerun requirement, `/ce-setup` refreshes
- current config -> proceed with no migration warning
- canonical storage can be derived but CE state is incomplete -> proceed using canonical paths and warn when relevant
- canonical storage cannot be derived safely -> do not write to legacy or guessed fallback paths; degrade locally, report what could not be persisted, and direct the user to `/ce-setup`
```

## 实施单元

- [ ] **Unit 1：Codify state contract 和 authoring rules**

**目标：** 在触碰 individual skills 前，建立 `user_state_dir` / `repo_state_dir` terminology 和 standard config/storage contract section，作为 single prompt-authoring contract。

**需求：** R1-R5, R11-R14, R31-R32

**依赖：** None

**文件：**
- 修改： [AGENTS.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/AGENTS.md)
- 修改： [plugins/compound-engineering/AGENTS.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/AGENTS.md)
- 修改： [plugins/compound-engineering/README.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/README.md)

**方法：**
- 更新 repo 和 plugin instruction surfaces，使 skill authors 有一套 stable vocabulary 和 two-tier authoring contract 可 copy：
- 每个 skill 都需要 compact header
- 只有 independently invocable config/storage consumers 需要 full config-resolution preamble
- Clarify `repo_state_dir` 用于 repo-local CE config，`user_state_dir` 用于 user-level CE state，per-project path 由后者 derive。
- 明确定义 compact header contents：state vocabulary、skill 是否自行 resolve config 或 expects caller-passed values，以及当 required config/storage cannot be resolved safely 时 warn or route to `/ce-setup` 的规则。
- 明确定义 full preamble trigger：仅用于 independently invocable 且会 diagnose migration/config state 或 read/write durable CE-owned state 的 skills。
- 明确定义 full preamble contents：
- 优先使用 caller-passed resolved values
- deterministically resolve `repo_state_dir`、`user_state_dir` 和 per-project path
- 仅在需要且存在时 read config layers
- 当需要 migration 或 rerun 时 warn 并 route to `/ce-setup`
- 当 canonical storage 无法 derive 时，不写入 legacy 或 guessed fallback paths
- 默认 locally degrade 并报告哪些内容无法 persist，而不是 blocking the main task
- 保持 guidance capability-first and cross-platform，following current plugin AGENTS conventions。

**遵循的模式：**
- 参考：[plugins/compound-engineering/AGENTS.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/AGENTS.md)
- 参考：[docs/solutions/skill-design/compound-refresh-skill-improvements.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/skill-design/compound-refresh-skill-improvements.md)

**测试场景：**
- New skill author 不需要推断 hidden terminology，就能确定 config 从哪里读取，以及 durable project state 存放在哪里。
- skill author 可以从 contract 判断某个 skill 只需要 compact header，还是需要 full config-resolution preamble。
- spawned helper/delegate skill 可以依赖 caller-passed resolved values，而不是重新读取 config layers。
- documented config section 在 Claude Code、Codex、Gemini 和 copied-skill targets 中仍然成立。

**验证：**
- 两个 AGENTS files 描述同一 contract，没有冲突的 path terminology。
- plan 不再把 “header vs full preamble” 留作 implementation-time choice。
- README 不再暗示 CE runtime state 属于 repo-local `.context/compound-engineering/...`。

- [ ] **Unit 2：将 `/ce-setup` 和 `/ce-doctor` 迁移到新的 config and migration contract**

**目标：** 让 `/ce-setup` own obsolete-file cleanup 和任何 surviving compatibility migration work；让 `/ce-doctor` 除 dependencies 外，也 diagnose compatibility、storage state 和 gitignore safety；并给 core entry skills 一套 consistent migration-warning contract。

**需求：** R6-R10, R15-R16, R20, R24-R31

**依赖：** Unit 1

**文件：**
- 修改： [plugins/compound-engineering/skills/ce-setup/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-setup/SKILL.md)
- 修改： [plugins/compound-engineering/skills/ce-doctor/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/SKILL.md)
- 修改： [plugins/compound-engineering/skills/ce-brainstorm/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-brainstorm/SKILL.md)
- 修改： [plugins/compound-engineering/skills/ce-plan/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-plan/SKILL.md)
- 修改： [plugins/compound-engineering/skills/ce-work/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-work/SKILL.md)
- 修改： [plugins/compound-engineering/skills/ce-review/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-review/SKILL.md)
- 修改： [plugins/compound-engineering/skills/ce-doctor/scripts/check-health](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/scripts/check-health)
- 修改： [plugins/compound-engineering/skills/ce-doctor/references/dependency-registry.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/references/dependency-registry.md)
- 新增： [tests/ce-setup-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/ce-setup-skill-contract.test.ts)
- 新增： [tests/ce-doctor-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/ce-doctor-skill-contract.test.ts)
- 新增： [tests/entry-skill-config-warning-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/entry-skill-config-warning-contract.test.ts)

**方法：**
- 将当前 “dependency-only setup” language 替换为也会 explain why obsolete `compound-engineering.local.md` files no longer used，并在解释后 remove；只有 surviving CE contract 真的需要 persisted state 时才写 machine-local config。
- 扩展 doctor script 和 wrapper skill，使其 report resolved config layers when present、derived per-project storage path、legacy file 是否仍需 cleanup，以及 `.compound-engineering/config.local.yaml` 存在或 expected 时的 repo-local gitignore safety。
- 让 `/ce-setup` 成为 gitignore safety 和 diagnostics 的 remediation path：如果 `.compound-engineering/config.local.yaml` should exist 且未 ignored，`/ce-setup` 应 explain why the file is machine-local，并 offer to add `.gitignore` entry。
- 向 core entry skills 添加 short shared warning contract，让它们从相同 states route users toward `/ce-setup`，同时 full-preamble skills locally degrade，而不是 blocking 或 writing to stale paths。
- 保持 dependency detection registry-driven and MCP-aware，但更新 output model，使 dependency gaps 和 config/storage gaps share one diagnostic report。

**遵循的模式：**
- 参考：[plugins/compound-engineering/skills/ce-doctor/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/SKILL.md)
- 参考：[plugins/compound-engineering/skills/ce-doctor/scripts/check-health](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/scripts/check-health)
- 参考：[tests/review-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/review-skill-contract.test.ts)

**测试场景：**
- Legacy `compound-engineering.local.md` exists（存在 legacy `compound-engineering.local.md`）；`/ce-doctor` reports obsolete-file cleanup needed，`/ce-setup` becomes next action。
- Legacy file and new repo-local CE files both exist；`/ce-doctor` reports legacy file obsolete，并且 `/ce-setup` deletes it without attempting semantic merge。
- New config exists but compatibility metadata is stale（new config 存在但 compatibility metadata 过期）；`/ce-doctor` asks for rerun without relying on raw plugin semver。
- `.compound-engineering/config.local.yaml` required but not gitignored；`/ce-doctor` reports issue and `/ce-setup` offers to add `.gitignore` entry。
- `ce:brainstorm` and `ce:plan` warn and continue，因为它们仍能 safely read/write durable docs without project-state writes。
- `ce:work` and `ce:review` share same warning vocabulary，derive canonical paths when possible，并在 otherwise report degraded persistence 而不是 writing to legacy paths。
- Dependency checks still distinguish CLI-present、MCP-present、missing states（dependency checks 仍区分这些状态）。

**验证：**
- `/ce-setup` prompt no longer implies a legacy markdown config target。
- `/ce-doctor` output contract covers config/storage state in addition to dependency health。
- `/ce-doctor` checks `.compound-engineering/config.local.yaml` gitignore safety rather than old repo-local storage paths。
- `/ce-setup` can remediate `.compound-engineering/config.local.yaml` gitignore safety instead of only surfacing problem。
- Core entry skills no longer invent their own migration wording or remediation instructions（core entry skills 不再自创 migration wording 或 remediation instructions）。
- Canonical per-project storage is derivable without `/ce-setup` having to pre-write that path into config（无需 `/ce-setup` 预写 path 到 config，也能 derive canonical per-project storage）。
- New contract tests pin migration/reporting language so future edits do not regress it（new contract tests 固定 migration/reporting language，防止未来回退）。

- [ ] **Unit 3：将 todo system 移到 per-project durable storage，并保留 legacy reads**

**目标：** 将 durable todo lifecycle re-home 到 `<user_state_dir>/projects/<project-slug>/todos/`，同时 preserve existing legacy-drain behavior from `todos/` and `.context/compound-engineering/todos/`。

**需求：** R17-R23, R31-R32

**依赖：** Unit 2

**文件：**
- 修改： [plugins/compound-engineering/skills/todo-create/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/todo-create/SKILL.md)
- 修改： [plugins/compound-engineering/skills/todo-triage/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/todo-triage/SKILL.md)
- 修改： [plugins/compound-engineering/skills/todo-resolve/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/todo-resolve/SKILL.md)
- 修改： [plugins/compound-engineering/skills/ce-review/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-review/SKILL.md)
- 修改： [plugins/compound-engineering/skills/test-browser/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/test-browser/SKILL.md)
- 修改： [plugins/compound-engineering/skills/test-xcode/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/test-xcode/SKILL.md)
- 新增： [tests/todo-storage-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/todo-storage-contract.test.ts)

**方法：**
- 更新 `todo-create`，将 `user_state_dir` 下的 per-project path 视为 canonical，但在 drain period 结束前，read/ID-generation story 中保留两个 legacy directories。
- Keep status lifecycle unchanged：`pending` and `ready` remain load-bearing，只有 storage location changes。
- 更新所有 todo-producing skills，使其 defer to `todo-create` conventions，而不是 inline hardcoding canonical paths。

**遵循的模式：**
- 参考：[docs/solutions/workflow/todo-status-lifecycle.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/workflow/todo-status-lifecycle.md)
- 参考：[plugins/compound-engineering/skills/todo-create/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/todo-create/SKILL.md)

**测试场景：**
- New todo creation 写入 `user_state_dir` 下的 per-project path。
- 当 legacy directories 和 new canonical path 中都存在 IDs 时，Next-ID generation 避免 collisions。
- `todo-triage` 和 `todo-resolve` 仍能从两个 legacy locations 找到 pending/ready items。
- `ce:review`、`test-browser` 和 `test-xcode` 继续创建 actionable todos，且不嵌入 stale paths。

**验证：**
- Todo contract tests 证明 canonical-write + legacy-read behavior。
- 不再有 todo-producing skill 声称 `.context/compound-engineering/todos/` 是 long-term canonical location。

- [ ] **Unit 4：将 per-run artifact skills 移到 derived per-project paths**

**目标：** 将 per-run artifact instructions 从 repo-local `.context/compound-engineering/...` 改指向 `<user_state_dir>/projects/<project-slug>/<workflow>/...`，不尝试 historical migration。

**需求：** R17-R23, R31-R32

**依赖：** Unit 2

**文件：**
- 修改： [plugins/compound-engineering/skills/ce-review/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-review/SKILL.md)
- 修改： [plugins/compound-engineering/skills/deepen-plan/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/deepen-plan/SKILL.md)
- 修改： [plugins/compound-engineering/skills/feature-video/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/feature-video/SKILL.md)
- 修改： [tests/review-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/review-skill-contract.test.ts)
- 新增： [tests/storage-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/storage-skill-contract.test.ts)

**方法：**
- 更新 run-artifact instructions，使用 derived per-project path terminology，而不是 hardcoded `.context/compound-engineering/...`。
- 尽量让 report-only prohibitions path-agnostic，使 policy survive future directory changes。
- 不为 old artifact directories 添加 active migration logic；只改变 future-write instructions。

**遵循的模式：**
- 参考：[plugins/compound-engineering/skills/ce-review/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-review/SKILL.md)
- 参考：[tests/review-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/review-skill-contract.test.ts)

**测试场景：**
- `ce:review` contract tests 仍 enforce artifact-writing rules，但基于 new path vocabulary。
- `feature-video` 和 `deepen-plan` examples 不再要求 repo-local `.context/compound-engineering/...`。
- Report-only guidance 仍禁止 externalized writes，无论 exact path wording 如何。

**验证：**
- highest-signal per-run artifact skills 不再将 `.context/compound-engineering/...` 视为 runtime contract。
- Storage contract tests pin new path expectations，防止 future edits 回退。

- [ ] **Unit 5：从 converter 和 compatibility surfaces 移除 old contract**

**目标：** 更新 converter instructions、fixtures 和 contract tests，使 installed targets 不再 assert `compound-engineering.local.md`、`todos/` 或 `.context/compound-engineering/...` 作为 stable CE contract。

**需求：** R31-R32

**依赖：** Units 1-4

**文件：**
- 修改： [src/utils/codex-agents.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/src/utils/codex-agents.ts)
- 修改： [src/converters/claude-to-pi.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/src/converters/claude-to-pi.ts)
- 修改： [docs/solutions/skill-design/beta-skills-framework.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/skill-design/beta-skills-framework.md)
- 修改： [tests/converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/converter.test.ts)
- 修改： [tests/codex-converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/codex-converter.test.ts)
- 修改： [tests/copilot-converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/copilot-converter.test.ts)
- 修改： [tests/pi-converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/pi-converter.test.ts)

**方法：**
- 将 literal assertions about legacy config/todo paths 替换为 assertions about new state vocabulary，或替换为 conversion 后仍 platform-agnostic 的 skill text。
- 更新 PI/Codex helper text，使 converted skill guidance 不再教 stale todo/config locations。
- 更新 active solution docs that still present old runtime contract as current guidance；clearly historical plan/requirements docs 保持 intact，除非需要 brief superseded note。
- 保持 path rewriting logic minimal；如果 new wording 足够 target-agnostic，prefer updating fixtures/tests over adding new target-specific rewriting behavior。

**遵循的模式：**
- 参考：[docs/solutions/codex-skill-prompt-entrypoints.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/solutions/codex-skill-prompt-entrypoints.md)
- Existing converter tests（现有 converter tests）见 [tests/converter.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/converter.test.ts)

**测试场景：**
- Converted command/skill bodies 不再 assert `compound-engineering.local.md` 是 canonical config target。
- PI conversion 不再将 todo workflows 描述为 `todos/ + /skill:todo-create`。
- Copilot/Codex tests 仍证明 target-specific rewriting，前提是该 target 确实拥有 path transformation。

**验证：**
- `bun test` 在 converter 和 skill-contract suites 上通过。
- 描述 current CE runtime behavior 的 active docs 不再把 `compound-engineering.local.md` 或 repo-local durable storage 当作 live contract 教给用户。
- 没有 test fixture 仍将 old CE runtime contract 编码为 expected behavior。

## 系统级影响

- **Interaction graph（交互图）:** `/ce-setup` becomes the only migration writer；`/ce-doctor` and core workflow skills become migration-state readers；todo/review/media/planning skills become consumers of derived per-project storage path。
- **Error propagation（错误传播）:** Incorrect compatibility metadata or repo-identity resolution can cause stale-path fallbacks、false “rerun setup” warnings，or storage fragmentation across worktrees。
- **State lifecycle risks:** Todo ID collisions、stale obsolete-file cleanup behavior，and accidental commits of `.compound-engineering/config.local.yaml` 是主要 durable-state hazards。
- **User-experience risks:** 如果 warning wording 在 entry skills 之间 drift，users 会收到关于 whether they can proceed or must rerun `/ce-setup` 的 contradictory guidance。
- **API surface parity:** Converter outputs and copied skills 必须继续在 Claude Code、Codex、Copilot、PI 和其他 pass-through targets 上有意义，不假设某个平台的 shell/tool naming。
- **Integration coverage:** Unit tests alone 不能证明 prompt-contract correctness；contract tests plus converter suite 需要 cover 现在 encode runtime model 的 text surfaces。

## 风险与依赖

- Legacy `compound-engineering.local.md` cleanup intentionally destructive；setup messaging 必须 explicit，让 users 理解该 file obsolete 且 no longer carries supported CE state。
- path derivation contract 依赖 stable project slug resolution across worktrees；如果 underspecified，users 可能得到 split project state。
- entry-skill warning contract 横跨多个 high-traffic workflows；如果 copy 不 deliberately short，会给 plugin most-used surfaces 增加 prompt bloat。
- Root and plugin AGENTS changes 现在是 runtime contract 的一部分；如果它们与 skill bodies drift，future skills 会 regress into mixed terminology and shell-heavy config loading。
- converter/test cleanup 依赖 new state vocabulary 的 final wording。如果 execution 再次改变 vocabulary，此处 likely churn。

## 文档与运维说明

- 当 setup/ce-doctor/storage behavior changes 时，更新 [plugins/compound-engineering/README.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/README.md)。
- 运行 `bun test`，因为 converter and contract-test surfaces directly affected。
- 运行 `bun run release:validate`，因为 skill descriptions and plugin docs are being updated。
- 不要 hand-edit release-owned versions or changelogs。

## 来源与参考

- **Origin document（来源文档）：** [docs/brainstorms/2026-03-25-config-storage-redesign-requirements.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/docs/brainstorms/2026-03-25-config-storage-redesign-requirements.md)
- Related code（相关代码）： [plugins/compound-engineering/skills/ce-doctor/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-doctor/SKILL.md)
- Related code（相关代码）： [plugins/compound-engineering/skills/ce-setup/SKILL.md](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/plugins/compound-engineering/skills/ce-setup/SKILL.md)
- Related tests（相关 tests）： [tests/review-skill-contract.test.ts](/Users/tmchow/conductor/workspaces/compound-engineering-plugin/freetown-v1/tests/review-skill-contract.test.ts)
