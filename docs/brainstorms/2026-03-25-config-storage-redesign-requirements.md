---
date: 2026-03-25
topic: config-storage-redesign
---

# Config 与 Worktree 安全 Storage 重新设计

## 问题框架

当前分支改进了 `/ce-doctor` 和 `/ce-setup`，但仍然假设了两个站不住脚的基础：

1. Plugin state 存在 repo 内的 `.context/compound-engineering/` 或 `todos/` 下，这会在 git worktrees 和 Conductor 管理的并行 checkouts 中失效。
2. 旧的 plugin flows 会写入 `compound-engineering.local.md`，repo 中仍有部分引用它，但 main 已经不再把 review-agent selection 当作活跃的 setup 关注点。任何新的 repo/user-level config system 都不应复活这个已移除的模型。

这项工作不只是 dependency setup。它需要为以下内容建立一个一致模型：

- user-level defaults（用户级默认值）
- repo-level overrides（repo 级覆盖）
- machine-local overrides（机器本地覆盖）
- worktree-safe durable storage（worktree 安全的持久 storage）
- setup 与 doctor 行为
- 当前硬编码 `compound-engineering.local.md` 或 `.context/compound-engineering/...` 的 skill instructions、docs 和 tests

本文档术语：

- `user_state_dir` = user-level Compound Engineering 目录，默认是 `~/.compound-engineering`
- `repo_state_dir` = repo-local Compound Engineering 目录，位于 `<repo>/.compound-engineering`
- per-project storage path（每项目 storage path）= `<user_state_dir>/projects/<project-slug>/`

## 合并说明

本文档是 setup、config 与 worktree-safe storage 工作的当前合并版 requirements doc。它取代较早的 setup-dependency-management 和 todo-path-consolidation brainstorm docs，并纳入并行 `gwangju` workspace 中外部 worktree-safe storage 草案。

它改变了两个较早 effort 的方向：

- dependency-management 工作仍在 scope 内，但 `/ce-setup` 不能再写入 `compound-engineering.local.md`；任何保留的 YAML config 都应是可选且最小的。
- todo-path consolidation 工作被 home-directory storage 取代。durable todo files 仍需要 dual-read migration logic，但 `.context/compound-engineering/todos/` 不再是最终状态。

## 需求

- R1. 本工作引入的任何新 plugin config 都必须使用 `repo_state_dir` 下的纯 YAML 文件，具体是 `config.yaml` 和 `config.local.yaml`。Config 是 data，不是 markdown document。
- R2. Config 必须支持三层 cascade，优先级为 `local > project > global`，并按 key 采用 first-found wins：
  - `<user_state_dir>/config.yaml`
  - `<repo_state_dir>/config.yaml`
  - `<repo_state_dir>/config.local.yaml`
- R3. Config model 只能持久化真正需要 durable storage 的 active plugin-level behavior，起点是 planning 后若仍需要的 minimal compatibility metadata。`user_state_dir` 下的 deterministic path derivation 是 runtime logic，不是 config data。
- R4. 新 config model 不得重新引入已移除的 review-agent selection 或 review-context storage 行为。Reviewer selection 现在由 `/ce:review` 自动完成，project-specific guidance 应放在 `CLAUDE.md` 或 `AGENTS.md`，而不是 plugin-managed config files。
- R5. YAML config shape 可以重组 keys（例如把 review-related settings 归到 `review` object 下），但这类 reshape 必须一致应用到所有读取或写入 config 的 skills、docs 和 tests。
- R6. 新 config format 只能包含 plugin 判断是否必须重新运行 `/ce-setup` 所需的最小 compatibility metadata。
- R7. Compatibility checks 不能只依赖 plugin semver。如果需要显式 versioning，优先使用一个 setup 或 config contract revision，回答实际问题：“是否需要重新运行 `/ce-setup`？”可选 diagnostic metadata 可以单独存储，但除非 planning 证明必要，否则 requirements 不应假设多个独立 version counters。
- R8. `/ce-setup` 必须把 legacy `compound-engineering.local.md` 视为 obsolete。如果保留的 CE contract 仍需要 machine-local persisted state，`/ce-setup` 可以写入 `repo_state_dir/config.local.yaml`；否则不应仅为镜像 deterministic runtime path derivation 而发明 stored values。由于 legacy file 已不包含任何有效的一等 CE settings，`/ce-setup` 应说明它已 obsolete，并作为 cleanup 的一部分删除它，而不是尝试 semantic migration。
- R9. `/ce-setup` 必须是执行 config cleanup 和任何剩余 compatibility migration 的 canonical place。该 flow 应可安全重复运行，并至少处理这些情况：
  - legacy `compound-engineering.local.md` 存在，且尚无 repo-local CE files
  - legacy `compound-engineering.local.md` 与 `repo_state_dir/config.local.yaml` 同时存在
  - 尚无 repo-local CE files，但 deterministic storage derivation 仍可工作
- R10. 当 legacy `compound-engineering.local.md` 与新的 repo-local CE files 同时存在时，新的 CE contract 具有权威性。`/ce-setup` 应说明 legacy file 已 obsolete 并删除它，而不是尝试把已移除 settings 合并回新模型。

- R11. `AGENTS.md` 必须把 config/storage contract section 定义为标准 skill authoring criterion：每个 skill 都应包含批准后的 compact header，即使该特定 skill 当前不消费 config values，以便 contract 在整个 plugin 中保持一致。
- R12. 标准 config section 及其 instructions 必须 coding-agent cross-compatible。它们不能假设 Claude Code-only 或 Codex-only tool names、interaction patterns 或 permission models。
- R13. 标准 config section 必须优化速度和执行可靠性：
  - 偏好最少 reads/tool calls
  - config 建立后避免不必要的 shell fallbacks
  - 在平台允许时减少 permission prompts
  - wording 保持简洁，使 agents 更可能正确执行
- R14. 依赖 config 或 storage 的 independently invocable skills 必须使用一个标准 full preamble，它要：
  - 优先使用 caller-passed resolved values
  - deterministic resolve `repo_state_dir`、`user_state_dir` 和 per-project storage path
  - 在 local、project 和 global YAML layers 存在时，按相同 precedence rules 读取它们
  - 当需要 migration 或 rerun 时 warning 并 route 到 `/ce-setup`
  - 当无法安全 resolve canonical config 或 storage 时，继续 degraded behavior，而不是写入 legacy 或 guessed fallback paths
  `AGENTS.md` 还必须定义并 enforce delegation rule：当 parent skill spawned agent 需要 configuration 或 storage values 时，parent skill 必须把 resolved values 传入 agent prompt，而不是让 spawned agent 重新 resolve，除非该 agent 本身是 independently invocable。
- R15. Migration warning behavior 必须 centralized，而不是在整个 plugin 中重复。少量 core entry skills，包括 `/ce-setup`、`/ce-doctor`、`/ce:brainstorm`、`/ce:plan`、`/ce:work` 和 `/ce:review`，必须检测 legacy-only 或 conflicting config states，并引导用户运行 `/ce-setup` 进行 migration。Non-core skills 不应各自实现自己的 migration flow。
- R16. Core entry skills 和 `/ce-doctor` 必须使用 compatibility metadata 区分用户真正关心的 actionable states：
  - 尚无 new config
  - legacy-only 或 conflicting config 存在，且 `/ce-setup` 必须迁移它
  - new config 存在，但低于 required contract，且必须重新运行 `/ce-setup`
  - config 已是 current，无需 rerun

- R17. 所有 durable plugin storage 都必须 resolve 到 repo tree 外的 `user_state_dir` 下，确定 `user_state_dir` 的 fallback chain 为：
  - `$COMPOUND_ENGINEERING_HOME`
  - 当设置了 `XDG_DATA_HOME` 时，使用 `$XDG_DATA_HOME/compound-engineering`
  - `~/.compound-engineering`
- R18. Durable per-project storage 必须位于 `<user_state_dir>/projects/<project-slug>/`，其中 slug 在同一 repo 的不同 worktrees 之间 deterministic 且 stable。
- R19. Project identity 必须从 shared repo identity resolve，使同一 repo 的所有 worktrees 在 `user_state_dir` 下共享同一个 per-project storage path。主要 identity source 是 `git rev-parse --path-format=absolute --git-common-dir`，directory-safe slug 应派生为 `<sanitized-repo-name>-<short-hash>`。Non-git contexts 必须有 deterministic fallback。
- R20. 标准 full preamble 必须足以让 independently invocable skills deterministic resolve canonical per-project storage path，而不要求 `/ce-setup` 预先把该 path 写入 config。
- R21. 读取或写入 durable plugin state 的 skills 必须使用 `user_state_dir` 下的 per-project storage path，而不是 repo-local `.context/compound-engineering/...` 或 `todos/` paths。
- R22. Durable todo files 必须保留从 repo-local `todos/` 和 `.context/compound-engineering/todos/` 的 legacy read compatibility，直到它们自然清空。新的 todo writes 只能写入 `<user_state_dir>/projects/<project-slug>/todos/`。
- R23. Per-run scratch 和 run-artifact directories 不需要从 repo-local `.context/compound-engineering/...` 主动 migration；新的 writes 移到 `<user_state_dir>/projects/<project-slug>/<workflow>/...`。

- R24. `/ce-doctor` 必须保持 standalone entry point，并从 dependency/env checks 扩展为同时报告 config 与 storage health：
  - resolved config layers（已解析的 config layers）
  - resolved `user_state_dir`（已解析的 `user_state_dir`）
  - resolved `repo_state_dir`（已解析的 `repo_state_dir`）
  - resolved per-project storage path（已解析的 per-project storage path）
  - legacy `compound-engineering.local.md` 是否存在
  - 是否尚无 repo-local CE file
  - 是否因 legacy file 仍存在或 compatibility metadata stale 而需要 setup attention
  - 是否因 stored compatibility metadata 低于 required contract 而需要重新运行 setup
  - `.compound-engineering/config.local.yaml` 是否安全 gitignored
- R25. `/ce-doctor` 必须继续使用 centralized dependency registry，列出已知 CLIs、MCP-backed capabilities、相关 environment variables、install guidance、tiering，以及依赖它们的 skills/agents。
- R26. `/ce-doctor` 保持 informational only。它报告 dependency、env、config 和 storage status，但除 diagnostics 外不安装工具，也不 mutate user config。
- R27. `/ce-setup` 必须继续包含该分支中已设计的 dependency 与 environment flow，但其输出和 guidance 必须面向新的 storage contract 以及任何保留的 YAML config state，而不是发明 skills 可 deterministic derive 的 persisted path values。
- R28. 如果 `.compound-engineering/config.local.yaml` 是保留的 CE contract 的一部分，且没有被安全 gitignored，`/ce-setup` 必须解释为什么该文件是 machine-local，并提出添加合适 `.gitignore` entry。
- R29. `/ce-setup` 必须按 tier 展示缺失的 installable dependencies，逐项提供安装选项并取得 user approval，验证每个 install，并在 flow 中适当位置提示相关 environment variables。
- R30. 对同时有 MCP 和 CLI paths 的 dependencies，diagnostics 与 setup 必须先检测 MCP availability，再检测 CLI availability，只有两者都不能满足 dependency 时才提供 CLI installation。
- R31. Dependency 与 env checks 每次运行都必须 fresh scan，而不是依赖 persisted installation state。

- R32. Skill content、docs 和 tests 必须停止把 `.context/compound-engineering/...` 与 `compound-engineering.local.md` 当作 stable contract。
- R33. Config 与 storage contract 必须在 Claude Code、Codex、Gemini CLI、OpenCode、Copilot 和 Conductor worktrees 之间保持 tool-agnostic。本工作不应引入新的 provider-specific config paths。

## 成功标准

- 用户可以在 main checkout 或任何 worktree 中运行 `/ce-setup`，并得到同一个 resolved project storage location。
- 需要 CE state 的 independently invocable skills 可以派生同一个 canonical per-project storage path，而不要求 `/ce-setup` 预先写入该 path。
- 使用 legacy config format 的用户通过 `/ce-setup` 获得清晰 migration path，而不需要每个 individual skill 发明自己的 migration behavior。
- Core skills 与 `/ce-doctor` 可以判断是否必须重新运行 `/ce-setup`，而不依赖 raw plugin semver comparisons 或多个不必要 version counters。
- Todos 和其他 durable workflow artifacts 可跨 worktrees 使用，无需 symlinks、git hooks 或 manual copying。
- 已有 repo-local todo files 的用户不会失去访问 unresolved work 的能力。
- Legacy `compound-engineering.local.md` files 会由 `/ce-setup` 在简短说明后清理，不会复活已移除的 review-agent selection behavior。
- `/ce-doctor` 可以在同一份 report 中说明 dependency gaps 与 config/storage misconfiguration。
- `/ce-setup` 可以安全地把 `.compound-engineering/config.local.yaml` 纳入 gitignore，而不是事后只 warning。
- dependency registry 仍是 `/ce-doctor` 与 `/ce-setup` 的 single source of truth，而不是把 dependency metadata 拆散到多个 docs 或 skills。
- Provider conversion tests 与 plugin docs 反映新 contract，而不是旧 file/path names。

## 范围边界

- 不要在 `/ce-setup` 中加入完整 team-managed authoring workflow 来管理 tracked project config；读取 project layer 在 scope 内，authoring 是独立 effort。
- 不要把 per-run scratch 或 historical run artifacts 从 `.context/compound-engineering/...` 自动迁出。
- 不要在此 change 中加入 storage garbage collection 或 project-directory pruning。
- 不要在 migration 后长期支持 markdown-frontmatter config format；legacy support 只用于 import/migration，不用于 dual-write。
- 不要为此 feature 引入 provider-specific config directories。
- 不要在没有 explicit user approval 的情况下 auto-install dependencies。
- 不要把本工作扩展到 project dependency management，例如 `bundle install`、`npm install` 或 app-specific environment setup。

## 关键决策

- **Home-directory storage 是 durable answer：** repo-local `.context` 适合 single checkout 的 scratch，但对 shared multi-worktree state 来说是错误 primitive。
- **Plain YAML 替代 legacy markdown config format：** 如果本工作引入 plugin-managed config，应通过 `repo_state_dir` 中的文件实现，而不是扩展 `compound-engineering.local.md`。
- **Legacy review config 不是目标模型：** main 已经移除 setup-managed reviewer selection。新 config system 应聚焦当前 setup-owned state，例如 storage 与 compatibility metadata，而不是用新文件重建 reviewer preferences。
- **Compatibility metadata 应保持最小：** plugin semver alone 过于粗糙，但修复方式不是到处加 version fields。只保留回答是否必须重新运行 `/ce-setup` 所需的 metadata。
- **Migration 应只有一个 owner：** `/ce-setup` 执行 migration，`/ce-doctor` 报告 migration state，少量 entry skills 发出 warning。把 migration logic 分散到每个 skill 会制造 drift 和不一致 user experience。
- **Todo migration 值得特殊处理：** unlike per-run artifacts，todo files 有 multi-session lifecycle。过渡期保留 read compatibility 是值得的。
- **Standard preamble，而不是 universal prompt bloat：** 为 independently invocable config/storage consumers 使用一个 shared config-loading pattern，并让 parent skills 把 resolved values 传给 delegates。要求每个 skill 即使不用 config 也加载它，会增加 carrying cost，收益不足。
- **Standard section 属于 AGENTS.md：** skill-level config instructions 应 codified as repo authoring rule，使未来 skills 继承同一结构而不是 drift。
- **Cross-agent 与 low-friction wording 很重要：** config section 应围绕 capability classes、minimal reads 和 low-prompt execution patterns 编写，使其在 Claude Code、Codex、Gemini、OpenCode、Copilot 和 Conductor 中都表现良好。
- **`/ce-doctor` 与 `/ce-setup` 保持耦合但 distinct：** doctor 诊断；setup 安装/配置。新 architecture 应深化这种关系，而不是替代它。
- **本分支的 dependency design 继续保留：** registry-driven checks、tiered installs、env var prompting 和 MCP-first detection 仍在 scope 内。只是它们需要面向新的 config/storage contract。
- **Gitignore safety 是 feature 的一部分，不是 follow-up：** 如果 `/ce-setup` 在 repos 中写入 `.compound-engineering/config.local.yaml`，plugin 还必须验证用户不会意外 commit 它。gitignore rule 应针对该 machine-local file，而不是整个 `.compound-engineering/` directory。

## 依赖与假设

- 当前 `/ce-doctor` dependency registry 与 install flow 仍是 dependency 部分的起点。
- 当前引用 `.context/compound-engineering/...` 或 `compound-engineering.local.md` 的 skills 和 docs 需要一次 inventory-based update pass。
- 断言旧 config names 或旧 storage paths 的 converter 与 contract tests 属于 affected surface，不是 incidental cleanup。
- `git worktree` metadata 在普通 git repos 中可用；planning 仍需定义 non-git contexts 与 edge cases 的确切 fallback behavior。

## 未决问题

### 延后到 Planning 阶段

- [Affects R3][Technical] 为任何保留的 setup-owned config（例如 compatibility metadata）以及仍属于 plugin-managed config 的 future plugin-level keys 选择确切 YAML shape。
- [Affects R5][Technical] 定义最小 compatibility metadata shape，可靠判断 plugin 是否必须重新运行 `/ce-setup`，并且只有在 materially improves behavior 时才加入额外 diagnostic metadata。
- [Affects R15][Technical] 决定何时 plugin change 应 bump setup 或 migration requirement，何时应视为 backward-compatible。
- [Affects R17][Technical] 为 git repos、linked worktrees 和 non-git directories 定义精确 slugging 与 fallback algorithm。
- [Affects R21][Technical] 决定 legacy todo read compatibility 保留多久，以及在哪里记录 eventual removal。
- [Affects R13][Technical] 盘点需要 direct config/storage loading 的 independently invocable skills，以及只需 parent-passed values 的 skills。
- [Affects R23][Technical] 定义 config/storage warnings 与 migration guidance 的 doctor output format。
- [Affects R30][Needs research] 盘点所有编码旧 config/storage contract 的 docs、tests 和 conversion fixtures。

## 下一步

-> `/ce:plan` 制定 phased implementation plan：先 codify 新 config schema 与 migration strategy，再更新 `/ce-setup` 与 `/ce-doctor`，然后迁移 storage consumers 和 tests。
