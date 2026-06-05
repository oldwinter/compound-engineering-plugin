---
date: 2026-03-17
topic: release-automation
---

# Release Automation 与 Changelog Ownership

## 问题框架

repository 当前只有一个面向 npm CLI 的 automated release flow，但更大的 release story 分散在 CI、manual maintainer workflows、stale docs 和多个 version surfaces 之间。这让 intentional batching 变难，让多个 maintainers 共享 release responsibility 变难，也让 changelogs、plugin manifests 和 component counts 等 derived metadata 很容易 drift out of sync。目标是迁移到支持 intentional batching、independent component versioning、centralized history 和 CI-owned release authority 的 release model，同时不强迫 untouched plugins bump version。

## 需求

- R1. release process 必须手动触发；merge 到 `main` 不得自动 publish release。
- R2. release system 必须支持 batching：releasable merges 可在 `main` 上累积，直到 maintainers 决定 cut a release。
- R3. release system 必须维护整个 repo 的 single release PR；该 PR 保持 open 直到 merged，并自动累积之后 merge 到 `main` 的 releasable changes。
- R4. release system 必须支持这些 components 的 independent version bumps：`cli`、`compound-engineering`、`coding-tutor` 和 `marketplace`。
- R5. release system 不得 bump untouched plugins 或 unrelated components。
- R6. release system 必须保留一个 centralized root `CHANGELOG.md` 作为 repository canonical changelog。
- R7. root changelog 必须按 component version 记录 top-level entries，而不是要求每个 plugin 有 separate changelog files。
- R8. migration 期间必须保留 existing root changelog history；new release model 不得以丢失 continuity 的方式 discard 或 rewrite historical entries。
- R9. migration 后，`plugins/compound-engineering/CHANGELOG.md` 不再被视为 canonical changelog。
- R10. release process 必须替换当前 `release-docs` workflow；`release-docs` 不再作为 release authority 或 required release step。
- R11. narrow scripts 必须替换 `release-docs` responsibilities，包括 metadata synchronization、count calculation、仍需要时的 docs generation，以及 validation。
- R12. Release automation 必须是 version bumps、changelog writes 和 computed metadata updates（例如 agents、skills、commands 或类似 release-owned descriptions 数量）的 sole authority。
- R13. release flow 必须支持 dry-run mode，summarize 将会发生什么，但不 publish、tag 或 commit release changes。
- R14. Dry run output 必须清楚 summarize 哪些 components 会 release、proposed version bumps、将新增的 changelog entries，以及任何 blocking validation failures。
- R15. Marketplace version bumps 只应发生在 marketplace-level changes 上，例如 marketplace metadata changes 或 catalog 中添加/移除 plugins。
- R16. 仅更新 plugin version 不应要求 marketplace version bump。
- R17. 当 CLI code 本身未变时，Plugin-only content changes 应可 release，而不需要 CLI version bump。
- R18. release model 必须兼容当前 install behavior：`bunx @every-env/compound-plugin install ...` 运行 npm CLI，但 runtime 从 GitHub repository fetch named plugin content。
- R19. release process 必须能由 maintainer 或 AI agent 通过 CI 触发，不要求 local maintainer-only skill。
- R20. resulting model 必须能扩展到 future plugins，而不需要 repo 永久 special-case `compound-engineering`。
- R21. release model 必须继续依赖 conventional release intent signals（`feat`、`fix`、breaking changes 等），但 commit 或 PR titles 中的 component scopes 应保持 optional，而非 required。
- R22. Release automation 必须主要从 changed files 推断 component ownership，而不是只依赖 commit 或 PR title scopes。
- R23. repo 应强约束 parseable conventional PR 或 merge titles，足以让 release tooling classify change type，同时避免每个 change 都强制 component scoping。
- R24. manual CI-driven release workflow 必须支持 exceptional cases 的 explicit bump overrides，至少 `patch`、`minor` 和 `major`，不要求 maintainers 仅为 coerce release 创建 fake 或 empty commits。
- R25. Bump overrides 必须能按 component 表达，而不是只有 repo-wide override。
- R26. Dry run output 必须清楚展示每个 affected component 的 inferred bump 和 any applied manual override。

## 成功标准

- Maintainers 可以让多个 PRs merge 到 `main`，而不立即 cut release。
- 任意时刻，maintainers 可以 inspect release PR 或 dry run，理解下一次会 ship 什么。
- 对 `coding-tutor` 的 change 不会强迫 `compound-engineering` version bump。
- plugin version bump 不会强迫 marketplace version bump，除非 marketplace-level files changed。
- release-owned metadata 和 counts 保持同步，不依赖 local slash command。
- root changelog 在 migration 前后保持 readable 和 continuous。

## 范围边界

- 此工作不要求改变 Claude Code 自身消费 plugin 和 marketplace versions 的方式。
- 此工作不要求在 v1 解决 non-Claude harnesses 的 end-user auto-update discovery。
- 此工作不要求添加 dedicated per-plugin changelog files 作为 canonical history model。
- 此工作不要求立即自动化 release timing；manual release 保持 default。

## 关键决策

- **Use `release-please` rather than a single release-line flow**：repo 现在有多个 independently versioned components，而 release PR model 匹配在 `main` 上 batch merges、直到 intentional cut release 的需求。
- **One release PR for the whole repo**：centralized release visibility 比每个 component 一个 separate PR 更重要；single release PR 仍可承载多个 component bumps。
- **Manual release timing**：release process 应自动 prepare 和 accumulate next release，但 cut release 的决定应保持 explicit。
- **Root changelog stays canonical**：对当前 repo shape 来说，centralized history 比 per-plugin changelog isolation 更重要。
- **Top-level changelog entries per component version**：这保留一个 changelog file，同时让 independent component version history 保持 readable。
- **Retire `release-docs`**：它的 responsibilities 过宽、stale 且 conflated。Release logic、docs logic 和 metadata synchronization 应分离。
- **Scripts for narrow responsibilities**：Explicit scripts 比 local repo-maintenance skill 更容易 validate、automate 并从 CI 复用。
- **Marketplace version is catalog-scoped**：Plugin version bumps alone 不应 imply marketplace release。
- **Conventional type required, component scope optional**：Release intent 仍应来自 conventional commit semantics，但要求大多数 repo changes 写 `(compound-engineering)` 会增加不必要 wording overhead。Component detection 应保持 file-driven。
- **Manual bump override is an explicit escape hatch**：Automatic bump inference 保持 default，但 maintainers 应能在 CI 中 override component release level，用于 exceptional cases，而不需要尴尬的 synthetic commits。

## 依赖与假设

- 当前 named plugins install flow 继续在 runtime 从 GitHub fetch plugin content，因此 plugin content releases 可独立于 CLI releases，除非 CLI behavior 也改变。
- Claude Code 已经尊重 marketplace 和 plugin versions，因此这些 version surfaces 仍是有意义的 release signals。

## 待决问题

### 延后到 Planning

- [Affects R3][Technical] release PR 应在每次 push 到 `main` 时自动 update，还是通过 manually triggered maintenance workflow 按需 refresh release PR state？
- [Affects R7][Technical] 什么 exact root changelog format 最能在一个 file 中平衡多个 component-version entries 的 readability 和 automation？
- [Affects R11][Technical] 哪些 responsibilities 应变成 distinct scripts，哪些可直接嵌在 CI workflow steps 中？
- [Affects R12][Technical] 哪些 release-owned metadata fields 应自动 computed，哪些应 validation 后在无 count change 时保持 untouched？
- [Affects R9][Technical] migration 后，`plugins/compound-engineering/CHANGELOG.md` 应 delete、freeze，还是替换成 short pointer note？
- [Affects R21][Technical] conventional-format enforcement 应发生在 PR titles、squash-merge titles、commits，还是组合？
- [Affects R24][Technical] manual bump overrides 应实现为直接影响 generated release PR 的 workflow inputs，还是仅在 release branch 上生成 internal release-control commit？

## 下一步

→ `/ce:plan` 进行 structured implementation planning
