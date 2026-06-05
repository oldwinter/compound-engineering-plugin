---
title: "feat: 将 repo releases 迁移到 manual release-please，并使用 centralized changelog"
type: feat
status: active
date: 2026-03-17
origin: docs/brainstorms/2026-03-17-release-automation-requirements.md
---

# feat: 将 repo releases 迁移到 manual release-please，并使用 centralized changelog

## 概览

用基于 `release-please` 的 repo-owned release system 替换当前 single-line `semantic-release` flow 和 maintainer-local `release-docs` workflow。新系统包含一个持续累积的 release PR、显式 component version ownership、由 release automation 拥有的 metadata/count updates，以及 centralized root `CHANGELOG.md`。新模型通过将 generated release PR 的 merge 作为 release action 来保持 manual release timing，同时允许 dry-run previews，并在新的 merges 落到 `main` 后自动维护 release PR。

## 问题框架

当前 repo 将一个 automated root CLI release line 与 manual plugin release conventions 以及 stale docs/tooling 混合在一起。`publish.yml` 在每次 push 到 `main` 时 publish，`.releaserc.json` 只理解 root package，`release-docs` 仍编码过时的 repo structure，plugin-level version/changelog ownership 不一致。结果是 root changelog history、plugin manifests、computed counts 和 contributor guidance 之间 drift。origin requirements 定义了不同目标：manual release timing、整个 repo 一个 release PR、independent component versions、untouched plugins 不 bump、centralized changelog ownership、CI-owned release authority。（见 origin: docs/brainstorms/2026-03-17-release-automation-requirements.md）

## 需求追踪

- R1. Manual release；不要在每次 merge 到 `main` 时 publish
- R2. Batched releasable changes 可以累积在 `main`
- R3. 整个 repo 使用一个 release PR，并自动累积 releasable merges
- R4. `cli`、`compound-engineering`、`coding-tutor`、`marketplace` 独立 version bumps
- R5. Untouched components 不 bump
- R6. Root `CHANGELOG.md` 保持 canonical
- R7. Root changelog 使用 top-level component-version entries
- R8. 保留 existing changelog history
- R9. `plugins/compound-engineering/CHANGELOG.md` 不再是 canonical
- R10. 将 `release-docs` 从 release authority 中 retire
- R11. 用 narrow scripts 替换 `release-docs`
- R12. Release automation 拥有 versions、counts 和 release metadata
- R13. 支持无 side effects 的 dry run
- R14. Dry run summarize proposed component bumps、changelog entries 和 blockers
- R15. Marketplace version bumps 只针对 marketplace-level changes
- R16. Plugin version changes 不 imply marketplace version bumps
- R17. Plugin-only content changes 不 force CLI version bumps
- R18. 保持当前 install behavior compatibility，即 npm CLI 在 runtime 从 GitHub fetch plugin content
- R19. Release flow 可由 maintainers 或 AI agents 通过 CI trigger
- R20. 模型必须能扩展到 additional plugins
- R21. Conventional release intent signals 仍 required，但 titles 中的 component scopes 保持 optional
- R22. Component ownership 主要由 changed files 推断，而不是仅由 title scopes 决定
- R23. Repo enforce parseable conventional PR 或 merge titles，但不要求每个 change 都有 component scope
- R24. Manual CI release 支持 exceptional cases 的 explicit bump overrides，无需 fake commits
- R25. Bump overrides 是 per-component，而不是只能 repo-wide
- R26. Dry run 清楚展示 inferred bump 和 applied override

## 范围边界

- 不改变 Claude Code 如何消费 marketplace/plugin version fields
- v1 不做 non-Claude harnesses 的 end-user auto-update discovery flow
- 不采用 per-plugin canonical changelog model
- v1 不做 fully automatic timed release cadence

## 背景与调研

### 相关代码和模式

- `.github/workflows/publish.yml` 当前在每次 push 到 `main` 时运行 `npx semantic-release`；这是要 retire 的行为。
- `.releaserc.json` 是当前 single-line release configuration，只写 `CHANGELOG.md` 和 `package.json`。
- `package.json` 已暴露 repo-maintenance scripts，是添加 release preview/validation script entrypoints 的自然位置。
- `src/commands/install.ts` 通过 clone GitHub repo 并读取 runtime 的 `plugins/<name>` 来 resolve named plugin installs；这意味着 CLI code 未改变时，plugin content releases 可以保持独立于 npm CLI releases。
- `.claude-plugin/marketplace.json`、`plugins/compound-engineering/.claude-plugin/plugin.json` 和 `plugins/coding-tutor/.claude-plugin/plugin.json` 是当前需要 explicit ownership 的 version-bearing metadata surfaces。
- `.claude/commands/release-docs.md` 已 stale，并混合 docs generation、metadata synchronization、validation 和 release guidance；应替换，而不是就地 modernize。
- `docs/plans/` 中的 existing planning docs 使用每个 plan 一个文件、带 `origin` 的 frontmatter，以及 dependency-ordered implementation units 和 explicit file paths；本 plan 遵循该模式。

### 组织内 learnings

- `docs/solutions/plugin-versioning-requirements.md` 已编码重要约束：version bumps 和 changelog entries 应由 release-owned，而不是在 routine feature PRs 中添加。migration 应保留该原则，同时将 authority 移入 CI。

### 外部参考

- `release-please` release PR model 支持维护 standing release PR，并在更多 work 落到 default branch 时更新。
- `release-please` manifest mode 支持 multi-component repos 和 per-component extra file updates，非常适合 plugin manifests 和 marketplace metadata。
- GitHub Actions `workflow_dispatch` 提供稳定的 manual trigger surface for dry-run preview workflows。

## 关键技术决策

- **Use `release-please` for version planning and release PR lifecycle**：repo 需要一个 accumulating release PR，且包含多个 independently versioned components；这比 `semantic-release` 更接近 `release-please` 的 native model。
- **Keep one centralized root changelog**：root `CHANGELOG.md` 保持 canonical changelog。Release automation 必须把 component-labeled entries render 到这个单一 file 中，而不是将 canonical history 分散到 plugin-local changelog files。
- **Use top-level component-version entries in the root changelog**：每个 released component version 在 `CHANGELOG.md` 中拥有自己的 top-level entry，heading 包含 component name、version、release date。这样在保留 single centralized file 的同时，保持 independent version history 可读。
- **Treat component versioning and changelog rendering as related but separate concerns**：`release-please` 可以拥有 component version bumps 和 release PR state，但 root changelog formatting 可能需要 repo-specific rendering logic，以保留单一可读 canonical file。
- **Use explicit release scripts for repo-specific logic**：Count computation、metadata sync、dry-run summaries 和 root changelog shaping 应位于 versioned scripts，而不是隐藏在 maintainer-local command prompts 中。
- **Preserve current plugin delivery assumptions**：除非 `src/` 中 converter/installer behavior 改变，否则 plugin content updates 不 force CLI version bumps。
- **Marketplace is catalog-scoped**：Marketplace version bumps 取决于 marketplace file changes，如 plugin additions/removals 或 marketplace metadata edits，而不是 routine plugin release version updates。
- **Use conventional type as release intent, not mandatory component scope**：`feat`、`fix` 和 explicit breaking-change markers 仍是重要 release signals，但 PR 或 merge titles 中的 component scope 是 optional，不应成为 routine compound-engineering work 的强制要求。
- **File ownership is authoritative for component selection**：Optional title scope 可以帮助 notes 和 validation，但决定哪些 components bump 的应是 changed-file ownership rules。
- **Support manual bump overrides as an explicit escape hatch**：默认仍用 inferred bumping，但 CI-driven release flow 应允许 per-component `patch` / `minor` / `major` overrides，处理 exceptional cases，无需在 `main` 上制造 synthetic commits。
- **Deprecate, do not rely on, legacy changelog/docs surfaces**：`plugins/compound-engineering/CHANGELOG.md` 和 `release-docs` 应停止作为 live authorities；新 flow 稳定后，它们应被 removed、frozen，或缩减成 pointer guidance。

## Root changelog 格式

Root `CHANGELOG.md` 应保持唯一 canonical changelog，并使用 component-version entries，而不是 repo-wide release-event entries。

### 格式规则

- 每个 released component 拥有自己的 top-level entry。
- Entry headings 包含 component name、version 和 release date。
- 单一 root file 中 entries 按 newest-first 排序。
- 当多个 components 从同一个 merged release PR release 时，它们作为相邻 entries 出现，并使用相同 date。
- 每个 entry 只包含与该 component 相关的 changes。
- File 保留简短 header note，说明它是 repo 的 canonical changelog，且 versions 是 component-scoped。
- Historical root changelog entries 保持原样；migration 只添加 note，并从 cutover release 开始改变新 entries 的 formatting。

### 推荐 heading 形态

```md
## compound-engineering v2.43.0 - 2026-04-10

### Features
- ...

### Fixes
- ...
```

更多示例:

```md
## coding-tutor v1.2.2 - 2026-04-18

### Fixes
- ...

## marketplace v1.3.0 - 2026-04-18

### Changed
- Added `new-plugin` to the marketplace catalog.

## cli v2.43.1 - 2026-04-21

### Fixes
- Correct OpenClaw install path handling.
```

### 迁移规则

- 保留全部 existing root changelog history as published。
- 在顶部附近添加短 migration note，说明从 cutover release 开始，entries 在 root file 中按 component version 记录。
- 不尝试将所有 older entries rewrite 或 normalize 成新结构。
- cutover 后，`plugins/compound-engineering/CHANGELOG.md` 不应再接收新的 canonical entries。

## Component release 规则

Release system 应使用显式 file-to-component ownership rules，确保 unchanged components 不会意外 bump。

### Component 定义

- **`cli`**：npm-distributed `@every-env/compound-plugin` package 及其 release-owned root metadata。
- **`compound-engineering`**：rooted at `plugins/compound-engineering/` 的 plugin。
- **`coding-tutor`**：rooted at `plugins/coding-tutor/` 的 plugin。
- **`marketplace`**：rooted at `.claude-plugin/` 的 marketplace-level metadata，以及未来任何 repo-owned marketplace-only surfaces。

### File-to-component mapping（文件到 component 映射）

#### `cli`

应 trigger `cli` release 的 changes：

- `src/**`
- `package.json`
- `bun.lock`
- 验证 root CLI behavior 的 CLI-only tests 或 fixtures：
  - `tests/cli.test.ts`
  - 其他 subject 是 CLI itself 的 top-level tests
- Release-owned root files，仅当它们反映 CLI release，而不是 another component：
  - root `CHANGELOG.md` entry generation for the `cli` component（为 `cli` component 生成 root changelog entry）

单独存在时不应 trigger `cli` 的 changes：

- `plugins/**` 下的 plugin content changes
- `.claude-plugin/**` 下的 marketplace metadata changes
- Docs 或 brainstorm/plan documents，除非 repo 显式决定 docs-only changes 对 CLI 是 releasable

#### `compound-engineering`（compound-engineering component）

应 trigger `compound-engineering` release 的 changes：

- `plugins/compound-engineering/**`
- 主要目的为验证 compound-engineering content 或由该 plugin 派生 conversion results 的 tests 或 fixtures
- compound-engineering plugin 的 release-owned metadata updates：
  - `plugins/compound-engineering/.claude-plugin/plugin.json`
- Root `CHANGELOG.md` entry generation for the `compound-engineering` component（为 `compound-engineering` component 生成 root changelog entry）

单独存在时不应 trigger `compound-engineering` 的 changes：

- `plugins/coding-tutor/**`
- `src/**` 中的 root CLI implementation changes
- Marketplace-only metadata changes（仅 marketplace metadata 的 changes）

#### `coding-tutor`（coding-tutor component）

应 trigger `coding-tutor` release 的 changes：

- `plugins/coding-tutor/**`
- 主要目的为验证 coding-tutor content 或由该 plugin 派生 conversion results 的 tests 或 fixtures
- coding-tutor plugin 的 release-owned metadata updates：
  - `plugins/coding-tutor/.claude-plugin/plugin.json`
- Root `CHANGELOG.md` entry generation for the `coding-tutor` component（为 `coding-tutor` component 生成 root changelog entry）

单独存在时不应 trigger `coding-tutor` 的 changes：

- `plugins/compound-engineering/**`
- `src/**` 中的 root CLI implementation changes
- Marketplace-only metadata changes（仅 marketplace metadata 的 changes）

#### `marketplace`（marketplace component）

应 trigger `marketplace` release 的 changes：

- `.claude-plugin/marketplace.json`
- 如果 repo 后续引入，future marketplace-only docs 或 config files
- 添加 new plugin directory 到 `plugins/`，且伴随 marketplace catalog changes
- 从 marketplace catalog 移除 plugin
- Marketplace metadata changes，如 owner info、catalog description 或 catalog-level structure changes

单独存在时不应 trigger `marketplace` 的 changes：

- 对 existing plugin manifests 的 routine version bumps
- `plugins/compound-engineering/**` 或 `plugins/coding-tutor/**` 下的 plugin-only content changes
- `src/**` 中的 root CLI implementation changes

### Multi-component 规则

- 单个 merged PR 在改变多个 components 各自拥有的 files 时，可以 trigger multiple components。
- Plugin content change 加 CLI behavior change 应同时 release plugin 和 `cli`。
- 添加 new plugin 至少应 release new plugin 和 `marketplace`；只有 CLI behavior、plugin discovery logic 或 install UX 也改变时才 release `cli`。
- Root `CHANGELOG.md` 不应作为 component detection 的 primary signal；它是 release output，不是 input。
- Release flow 生成的 release-owned metadata writes 不应在后续 runs 中 recursively 触发 unrelated component bumps。

### Release intent 规则

- Repo 应继续要求 conventional release intent markers，如 `feat:`、`fix:` 和 explicit breaking change notation。
- `feat(coding-tutor): ...` 这类 component scopes 是 optional，并应保持 optional。
- 当 scope 存在时，应把它作为 advisory metadata，用来改善 release note grouping 或 mismatch detection。
- 当没有 scope 时，release automation 仍应通过 changed-file ownership 正确决定 affected components。
- Docs-only、planning-only 或 maintenance-only titles，如 `docs:` 或 `chore:`，即便不 imply releasable component bump，也应保持 parseable。

### Manual override 规则

- Automatic bump inference 对所有 components 仍是 default。
- Manual CI workflow 应支持至少 `patch`、`minor` 和 `major` override values。
- Overrides 应可 per component 选择，而不是只提供 repo-wide override。
- Overrides 应被视为 exceptional operational controls，而不是 normal release path。
- 存在 override 时，release output 应同时显示：
  - inferred bump（推断 bump）
  - override-applied bump（应用 override 后的 bump）
- Overrides 应影响 prepared release state，而无需 maintainers 在 `main` 上添加 fake commits。

### 歧义解析规则

- 如果 file 主要支持某个 plugin 的 content 或 fixtures，则 map 到该 plugin，而不是 `cli`。
- 如果 `src/` 中的 shared utility 改变所有 installs/conversions 的 behavior，即便 immediate motivation 来自某个 plugin，也视为 `cli` change。
- 如果 change 只更新 docs、brainstorms、plans 或 repo instructions，默认 no release，除非 repo 后续有意添加 docs-only release semantics。
- 未来引入 new plugin 时，应将其添加为自己的 explicit component，而不是 fold into `marketplace` 或 `cli`。

## Release workflow 行为

Release flow 应有三种 distinct modes，并共享同一 component-detection 和 metadata-rendering logic。

### Release PR maintenance（Release PR 维护）

- 在 pushes to `main` 时自动运行。
- 如果不存在 release PR，则为 repo 创建一个。
- 当 additional releasable changes 落到 `main` 时，更新 existing open release PR。
- 只包含由 release-intent parsing + file ownership rules 选中的 components。
- 只在 release PR branch 上更新 release-owned files，不直接更新 `main`。
- 该 maintenance step 永不 publish npm、创建 final GitHub releases 或 tag versions。

Maintained release PR 应使这些 outputs 可见：
- component version bumps（component version bump，component 版本 bump）
- draft root changelog entries（root changelog 草稿 entries）
- release-owned metadata changes，如 plugin version fields 和 computed counts

### Manual dry run（手动 dry run）

- 只通过 `workflow_dispatch` 运行。
- 计算当前 open release PR 应包含（或如果不存在会创建）的同一 release result。
- 在 workflow output 中产出 human-readable summary，并可选 artifact。
- 验证 component ownership、conventional release intent、metadata sync、count updates 和 root changelog rendering。
- 不 push commits、不 create 或 update branches、不 merge PRs、不 publish packages、不 create tags、不 create GitHub releases。

Dry-run summary 应包含：
- detected releasable components（检测到的可 release components）
- 每个 component 的 current version -> proposed version
- draft root changelog entries（root changelog 草稿 entries）
- would change 的 metadata files
- blocking validation failures 和 non-blocking warnings

### Actual release execution（实际 release 执行）

- 只在 generated release PR 被 intentionally merged 时发生。
- Merge 会把 release-owned version 和 changelog changes 写入 `main`。
- Post-merge release automation 只对 merged release 中包含的 components 执行 publish steps。
- 只有 `cli` component 是 merged release 的一部分时，才运行 npm publish。
- Non-CLI component releases 即使不进行 npm publish，仍更新 canonical version surfaces 和 release notes。

### 安全规则

- Ordinary feature merges to `main` 绝不能自行 publish。
- Dry run 必须保持 side-effect free。
- Release PR maintenance、dry run 和 post-merge release 必须使用同一 underlying release-state computation。
- Release-generated version 和 metadata writes 不得递归触发一个只包含自身 generated churn 的 follow-up release。
- Release PR merge 保持 auditable manual boundary；不要用 manual workflow 中的 direct-to-main release commits 替代它。

## 开放问题

### 规划期间已解决

- **Should release timing remain manual?** 是。Release PR 可自动维护，但 release 只在 generated release PR 被 intentionally merged 时发生。
- **Should the release PR update automatically as more merges land on `main`?** 是。这是核心 batching behavior，应保持 automatic。
- **Should release preview be distinct from release execution?** 是。Dry run 应是 side-effect-free manual workflow，预览同一 release state 但不 mutate branches 或 publish。
- **Should root changelog history stay centralized?** 是。Root `CHANGELOG.md` 保持 canonical，避免 fragmented history。
- **What changelog structure best fits the centralized model?** Root changelog 中的 top-level component-version entries 是 preferred format。它保持 file centralized，同时让 independent version history 可读。
- **What should drive component bumps?** Explicit file-to-component ownership rules。`src/**` 驱动 `cli`，每个 `plugins/<name>/**` tree 驱动自己的 plugin，`.claude-plugin/marketplace.json` 驱动 `marketplace`。
- **How strict should conventional formatting be?** Conventional type 应被要求到足以支持 release tooling 和 release-note generation，但 component scope 应保持 optional，以匹配 repo work style。
- **Should exceptional manual bumping be supported?** 是。Release workflow 应暴露 per-component patch/minor/major override controls，而不是要求 synthetic commits 操纵 inferred versions。
- **Should marketplace version bump when only a listed plugin version changes?** 不。Marketplace bumps 保留给 marketplace-level changes。
- **Should `release-docs` remain part of release authority?** 不。它应 retire，并由 narrow scripts 替换。

### 延后到实现阶段

- 哪种具体 `release-please` config 与 custom post-processing 组合能产生选定的 root changelog output，而不与 tool 对抗太多？
- Conventional-format enforcement 应作用于 PR titles、squash-merge titles、commit messages，还是它们的组合？
- Migration 稳定后，`plugins/compound-engineering/CHANGELOG.md` 应直接删除，还是替换为短 pointer note？
- Release preview 应直接调用 `release-please` dry-run mode，还是由 repo-owned script 基于 component rules 和当前 git state 计算同一 summary？
- Final post-merge release execution 应放在 dedicated publish workflow 中，并 keyed off merged release PR state，还是留在 renamed/adapted current `publish.yml`？
- Override inputs 是只编码在 release workflow inputs 中，还是也持久化到 generated release PR body 以便 auditability？

## 实现单元

- [x] **Unit 1: 定义新的 release component model 和 config scaffolding**

**目标:** 用面向 release-please 的 repo configuration 替换 single-line semantic-release configuration，表达四个 release components 及其 version surfaces。

**需求:** R1, R3, R4, R5, R15, R16, R17, R20

**依赖:** None

**文件:**
- 新增: `.release-please-config.json`
- 新增: `.release-please-manifest.json`
- 修改: `package.json`
- 修改: `.github/workflows/publish.yml`
- 删除或 freeze: `.releaserc.json`

**做法:**
- 为 `cli`、`compound-engineering`、`coding-tutor` 和 `marketplace` 定义 components。
- 使用 manifest configuration，让 version lines 独立，并避免 untouched components bump。
- 重做 existing publish workflow，使其不再在每次 push to `main` 时 release，而是支持 release-please-driven model。
- 添加 release preview、metadata sync 和 validation 的 package scripts，让 CI 调用 stable entrypoints，而不是内联 release logic。
- 定义 repo 的 release-intent contract：conventional type required、breaking changes explicit、component scope optional、file ownership authoritative。
- 定义 override contract：per-component `auto | patch | minor | major`，默认 `auto`。

**遵循的模式:**
- Root 下的 existing repo-level config files（`package.json`、`.releaserc.json`、`.github/workflows/*.yml`）
- `docs/solutions/plugin-versioning-requirements.md` 中记录的 current release ownership

**测试场景:**
- Plugin-only change map 到该 plugin component，不 imply CLI 或 marketplace bump。
- Marketplace metadata/catalog change 只 map 到 marketplace。
- `src/` CLI behavior change map 到 CLI component。
- Combined change 在一个 release PR 内产生 multiple component updates。
- 类似 `fix: adjust ce:plan-beta wording` 的 title 在没有 component scope 时仍 valid，并能通过 files 得到正确 component mapping。
- Manual override 可以将一个 component inferred patch bump 提升到 minor，而不影响 unrelated components。

**验证:**
- Repo 包含所有 versioned components 的单一 authoritative release configuration model。
- 旧的 automatic-on-push semantic-release path 已移除或 inert。
- Package scripts 存在 preview/sync/validate entrypoints。
- Release intent rules 已记录，且不强制 routine CE work 使用 repetitive component scoping。

- [x] **Unit 2: 构建 repo-owned release scripts，用于 metadata sync、counts 和 preview**

**目标:** 用 explicit scripts 替换 `release-docs` 和 ad-hoc release bookkeeping，计算 release-owned metadata updates 并生成 dry-run summaries。

**需求:** R10, R11, R12, R13, R14, R18, R19

**依赖:** Unit 1

**文件:**
- 新增: `scripts/release/sync-metadata.ts`
- 新增: `scripts/release/render-root-changelog.ts`
- 新增: `scripts/release/preview.ts`
- 新增: `scripts/release/validate.ts`
- 修改: `package.json`

**做法:**
- `sync-metadata.ts` 应拥有 count calculation，以及 manifest descriptions、version mirrors 等 release-owned metadata fields 的 synchronized writes。
- `render-root-changelog.ts` 应按约定的 component-version format 生成 centralized root changelog entries。
- `preview.ts` 应 summarize proposed component bumps、generated changelog entries、affected files 和 validation blockers，不 mutate repo、不 publish。
- `validate.ts` 应为 component counts、manifest consistency 和 changelog formatting expectations 提供 stable CI check。
- `preview.ts` 应接受 optional per-component overrides，并在 summary output 中显示 inferred 和 effective bump levels。

**遵循的模式:**
- Repo 中其他地方已使用的 TypeScript/Bun scripting
- Root package scripts 作为 stable repo entrypoints

**测试场景:**
- Count calculation 在 agents/skills 改变时正确更新 plugin descriptions。
- Preview output 只包含 changed components。
- Preview mode 不做 file writes。
- 当 manifest counts 或 version ownership rules drift 时，Validation fails。
- Root changelog renderer 生成 component-version entries，且 headings 稳定排序。
- 使用 override 时，Preview output 清楚区分 inferred bump 与 override-applied bump。

**验证:**
- `release-docs` responsibilities 已被 explicit scripts 覆盖。
- Dry run 可在 CI 中无 side effects 地运行。
- Metadata/count drift 可在 release 前 deterministic 地检测。

- [x] **Unit 3: 在 CI 中接入 release PR maintenance 和 manual release execution**

**目标:** 为 repo 建立一个 standing release PR，随着新 releasable work 落地自动更新，同时保持实际 release action 是 manual。

**需求:** R1, R2, R3, R13, R14, R19

**依赖:** Units 1-2

**文件:**
- 新增: `.github/workflows/release-pr.yml`
- 新增: `.github/workflows/release-preview.yml`
- 修改: `.github/workflows/ci.yml`
- 修改: `.github/workflows/publish.yml`

**做法:**
- `release-pr.yml` 应在 push to `main` 时运行，并维护整个 repo 的 standing release PR。
- 实际 release event 应保持为 merge generated release PR；ordinary merges to `main` 不应 automatic publish。
- `release-preview.yml` 应使用 `workflow_dispatch`，带 explicit dry-run inputs，并将 human-readable summary 发布到 workflow logs 和/或 artifacts。
- 决定 npm publish 是保留在 `publish.yml`，还是移动到 release-please-driven workflow，但必须确保它只在 CLI component 确实 release 时运行。
- 保持 normal `ci.yml` 聚焦 verification，而非 publishing。
- 对 PR 或 merge titles 添加 lightweight validation for release-intent formatting，但不要求 component scopes。
- 确保 release PR maintenance、dry run 和 post-merge publish 都调用同一 underlying release-state computation，避免 drift。
- 添加 per-component bump overrides 的 workflow inputs，确保 maintainer 或 AI agent 显式 invoke 时能塑造 prepared release state。

**遵循的模式:**
- `.github/workflows/` 中 existing GitHub workflow layout
- 当前 `publish.yml` 中 existing manual `workflow_dispatch`

**测试场景:**
- 普通 merge 到 `main` 会 update 或 create release PR，但不 publish。
- Manual dry-run workflow 生成 summary，无 tags、commits 或 publishes。
- Merge release PR 后，只为 changed components 创建 release。
- 不包含 CLI 的 release 不尝试 npm publish。
- PR title `feat: add new plan-beta handoff guidance` 无 component scope 也通过 validation。
- 如果 explicit scope 与 file ownership 明确冲突，可 surface warning 或 failure。
- 第二个 releasable merge 到 `main` 会更新 existing open release PR，而不是创建 competing release PR。
- release PR open 时执行 dry run，报告与 PR contents 相同的 proposed component set 和 versions。
- Merge release PR 不立即创建一个只包含 release-generated metadata churn 的 follow-up release PR。
- Manual workflow 可以 override 一个 component 到 `major`，并保持其他 components 使用 inferred `auto`。

**验证:**
- Maintainers 可检查 current release PR，看到 pending release batch。
- Dry-run 和 actual-release paths distinct 且 safe。
- Release system 可通过 CI trigger，不依赖 local maintainer-only tooling。
- 同一 proposed release state 在 release PR maintenance、dry run、post-merge release execution 中一致可见。
- 可以无 synthetic commits on `main` 地执行 exceptional release overrides。

- [x] **Unit 4: 集中 changelog ownership，并 retire plugin-local canonical release history**

**目标:** 使 root changelog 成为唯一 canonical changelog，同时 preserve history 并防止未来 fragmentation。

**需求:** R6, R7, R8, R9

**依赖:** Units 1-3

**文件:**
- 修改: `CHANGELOG.md`
- 修改或替换: `plugins/compound-engineering/CHANGELOG.md`
- 可选新增: `plugins/coding-tutor/CHANGELOG.md`，仅当需要 non-canonical pointer 或 future placeholder 时

**做法:**
- 在 root changelog 顶部附近添加 migration note，说明它是 repo 和 future releases 的 canonical changelog。
- 将 future canonical entries 按约定 heading shape render 到 root file，作为 top-level component-version entries。
- 停止把 future canonical entries 写入 `plugins/compound-engineering/CHANGELOG.md`。
- 按 implementation 中发现的最不 confusing 路径，将 plugin-local changelog 替换成 short pointer note 或 frozen historical file。
- 保持 existing root changelog entries intact；不要 retroactively rewrite historical releases into a new structure。

**遵循的模式:**
- Existing Keep a Changelog-style root file（现有 Keep a Changelog 风格 root file）
- Brainstorm decision：centralized history 优于 fragmented per-plugin changelogs

**测试场景:**
- Historical root changelog entries 在 migration 后保持 intact。
- New generated entries 按 intended component-version format 出现在 root changelog。
- Same day release 的 multiple components 作为 separate adjacent entries 出现，而不是 merge 成一个 release-event block。
- Component-specific notes 不 leak unrelated changes 到错误 entry。
- Plugin-local CE changelog 不再作为 live release target。

**验证:**
- Maintainer 阅读 repo 时能无歧义识别唯一 canonical changelog。
- 没有 history 丢失或被静默 rewrite。

- [x] **Unit 5: 移除 legacy release guidance，并替换为 new authority model**

**目标:** 更新 repo instructions 和 docs，让 contributors 遵循 new release system，而不是 obsolete semantic-release 或 `release-docs` guidance。

**需求:** R10, R11, R12, R19, R20

**依赖:** Units 1-4

**文件:**
- 修改: `AGENTS.md`
- 修改: `CLAUDE.md`
- 修改: `plugins/compound-engineering/AGENTS.md`
- 修改: `docs/solutions/plugin-versioning-requirements.md`
- 删除: `.claude/commands/release-docs.md`，或替换为 deprecation stub

**做法:**
- 更新所有 contributor-facing docs，描述 release PR maintenance、manual release merge、centralized root changelog ownership，以及新的 sync/preview/validate scripts。
- 移除指示 contributors 运行 `release-docs` 或依赖 stale docs-generation assumptions 的 references。
- 保留规则：ordinary PRs 不应 hand-bump release-owned metadata；但把该规则指向 release automation，而不是 local maintainer slash command。
- 明确记录 release-intent policy：conventional type required、component scope optional、breaking changes explicit。

**遵循的模式:**
- 已作为 authoritative workflow docs 使用的 existing contributor guidance files

**测试场景:**
- 无 user-facing doc 仍将 `release-docs` 指向 required release workflow。
- 无 contributor guidance 仍声称 CE plugin-local changelog authority。
- Release ownership guidance 在 root 与 plugin-level instruction files 中一致。

**验证:**
- 新 maintainer 可仅凭 docs 理解 release process，无 hidden local workflows。
- Docs 不再编码 obsolete repo structure 或 stale release surfaces。

- [x] **Unit 6: 为 component detection、metadata sync 和 release preview 添加 automated coverage**

**目标:** 通过测试 component rules、metadata updates 和 preview behavior，保护 new release model 不回退。

**需求:** R4, R5, R12, R13, R14, R15, R16, R17

**依赖:** Units 1-5

**文件:**
- 新增: `tests/release-metadata.test.ts`
- 新增: `tests/release-preview.test.ts`
- 新增: `tests/release-components.test.ts`
- 修改: `package.json`

**做法:**
- 添加 fixture-driven tests，覆盖 file-change-to-component mapping。
- 对 representative release cases 的 dry-run summaries 做 snapshot 或 assert。
- 验证 metadata sync 只更新 expected files 和 counts。
- 覆盖 marketplace-specific rule，确保 plugin-only version changes 不 trigger marketplace bumps。
- 明确编码 ambiguity-resolution cases，让 future contributors 添加 new plugins 时不需要猜 component should bump。
- 增加 release-intent parsing 的 validation coverage，确保 conventional titles required，但 optional scopes omitted 时不 block。
- 增加 override-path coverage，确保 manual bump overrides scoped、visible、且 preview side-effect free。

**遵循的模式:**
- `tests/` 下 existing top-level Bun test files
- converters 和 writers 使用的 current fixture-driven testing style

**测试场景:**
- 只改 `plugins/coding-tutor/**`，确认 only `coding-tutor` bumps。
- 只改 `plugins/compound-engineering/**`，确认 only CE bumps。
- 只改 marketplace catalog metadata，确认 only marketplace bumps。
- 只改 `src/**`，确认 only CLI bumps。
- Combined `src/**` + plugin change yields both component bumps（`src/**` + plugin change 同时产生两个 component bumps）。
- Docs only change 默认 no component bumps。
- 添加 new plugin directory + marketplace catalog entry，确认 new-plugin + marketplace bump，不 force unrelated existing plugin bumps。
- Dry-run preview list 与 component detector 识别出的 components 相同。
- Conventional `fix:` / `feat:` titles without scope pass validation（无 scope 的 conventional `fix:` / `feat:` titles 通过验证）。
- Explicit breaking-change markers 被识别。
- Optional scopes 存在时，可与 file ownership 比较，但不 mandatory。
- Preview 中 override 一个 component，确认只有该 component 的 effective bump 改变。
- Override 不为 untouched components 创建 phantom bumps。

**验证:**
- Release model 由 automated tests 覆盖，而不只是 CI trial runs。
- Future plugin additions 可低风险遵循同一 component-detection pattern。

## 系统级影响

- **Interaction graph:** Release config、CI workflows、metadata-bearing JSON files、contributor docs 和 changelog generation 全部耦合。plan 刻意拆分 configuration、scripting、release PR maintenance 和 documentation cleanup，使某一层变化时不会遮蔽另一层。
- **Error propagation:** Release metadata drift 应在 preview/validation 中 fail，先于 release PR 或 publish path 继续。CI 需要清晰 failure reporting，因为 release mistakes 会影响 user-facing version surfaces。
- **State lifecycle risks:** Partial migration 风险高。旧 release authority 和新 release authority 同时运行，可能 double-write changelog entries、version fields 或 publish flows。migration 应在信任新路径前显式 disable old path。
- **API surface parity:** `AGENTS.md`、`CLAUDE.md` 和 plugin-level instructions 中的 contributor-facing workflows 必须都描述同一 release authority model，否则 maintainers 会继续使用 legacy local commands。
- **Integration coverage:** Scripts unit tests 不够。release PR maintenance、dry-run preview 和 conditional CLI publish 之间的 workflow interaction 需要至少一个 CI 中的 integration-level verification path。

## 风险与依赖

- `release-please` 可能无法原生表达想要的 exact root changelog shape；可能需要 custom rendering。
- 如果 migration 期间 old semantic-release 和 new release-please flows overlap，很可能出现 duplicate 或 conflicting release writes。
- Version-bearing metadata 与 descriptive/count-bearing metadata 的区别必须保持明确；否则 scripts 可能覆盖应保持 manual 的 user-edited documentation。
- Release preview quality 很重要。如果 dry run vague 或 noisy，maintainers 会绕过它，manual batching 目标会削弱。
- 移除 `release-docs` 可能暴露其他 hidden docs/deploy assumptions，尤其是 GitHub Pages 或 docs generation 仍依赖 stale paths 的情况。

## 文档 / 运营备注

- 记录唯一 canonical release path：push to `main` 时维护 release PR、manual dispatch dry-run preview、merge generated release PR 时 actual release。
- 记录唯一 canonical changelog：root `CHANGELOG.md`。
- 为 contributors 记录一条规则：ordinary feature PRs 不 hand-bump release-owned versions 或 changelog entries。
- 在 old release instructions 容易被重新发现的位置添加短 migration note，尤其是 `plugins/compound-engineering/CHANGELOG.md` 附近和已移除的 `release-docs` command。
- Merge 后，运行一次 live GitHub Actions validation pass，端到端确认 `release-please` tag/output wiring 和 conditional CLI publish behavior。

## 来源与参考

- **Origin document（来源文档）:** [docs/brainstorms/2026-03-17-release-automation-requirements.md](docs/brainstorms/2026-03-17-release-automation-requirements.md)
- Existing release workflow（现有 release workflow）: `.github/workflows/publish.yml`
- Existing semantic-release config（现有 semantic-release config）: `.releaserc.json`
- Existing release-owned guidance（现有 release-owned guidance）: `docs/solutions/plugin-versioning-requirements.md`
- Legacy repo-maintenance command to retire（待 retire 的 legacy repo-maintenance command）: `.claude/commands/release-docs.md`
- Install behavior reference（install behavior 参考）: `src/commands/install.ts`
- External docs（外部文档）: `release-please` manifest and release PR documentation, GitHub Actions `workflow_dispatch`
