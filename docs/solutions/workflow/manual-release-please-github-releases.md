---
title: "用 GitHub Releases 手动运行 release-please，支持 multi-component plugin 与 marketplace releases"
category: workflow
date: 2026-03-17
last_refreshed: 2026-06-23
created: 2026-03-17
severity: process
component: release-automation
tags:
  - release-please
  - github-releases
  - marketplace
  - plugin-versioning
  - ci
  - automation
  - release-process
---

# 用 GitHub Releases 手动运行 release-please，支持 multi-component plugin 与 marketplace releases

## 问题

repo 曾经只有 npm CLI 的一条 automated release path，但实际 release model 分散在：

- root-only `semantic-release`（仅 root 的 `semantic-release`）
- 通过 `release-docs` 进行的 local maintainer workflow
- 多个带 version 的 metadata files
- 不一致的 release-note ownership

这让在 `main` 上 batch merges 很困难，让多个 maintainers 共享 release responsibility 很困难，也很容易让 release notes、plugin manifests、marketplace metadata 和 computed counts 之间 drift out of sync。

## 根因

Release intent、component ownership、release-note ownership 和 metadata synchronization 被拆散在不同 systems 中：

- PRs merge 到 `main` 时离 actual publish event 太近
- 只有 root CLI 有真正 CI-owned release path
- plugin 与 marketplace releases 依赖 local knowledge 和 stale docs
- repo 有多个 release surfaces（`cli`、`compound-engineering`、`coding-tutor`、`marketplace`），但没有 single release authority

相邻的 contributor-guidance 问题让情况更糟：root `CLAUDE.md` 已变成大型、陈旧、部分重复的 instruction file，而 `AGENTS.md` 才是更好的 canonical repo guidance surface。

## 解决方案

将 repo 迁移到 manual `release-please` model，使用一个 standing release PR 和 explicit component ownership。

关键决策：

- 对五个 release components 使用 `release-please` manifest mode：
  - `cli`
  - `compound-engineering`
  - `coding-tutor`
  - `marketplace`（Claude marketplace，`.claude-plugin/`）
  - `cursor-marketplace`（Cursor marketplace，`.cursor-plugin/`）
- Release timing 保持 manual：实际 release 发生在 generated release PR merge 时。
- 在 push 到 `main` 时自动维护 release PR。
- 使用 GitHub release PRs 和 GitHub Releases 作为新 releases 的 canonical release-notes surface。
- 用 repo-owned scripts 替换 `release-docs`，负责 preview、metadata sync 和 validation。
- PR title scopes 保持 optional；用 file paths 决定 affected components。
- 使 `AGENTS.md` canonical，并将 root `CLAUDE.md` 缩减为 compatibility shim。

## 发现的关键约束

`release-please` 不允许 package changelog paths 使用 `..` 向上 traverse。

第一次 live run 失败时直接暴露了这一点：

- Treat GitHub Releases as the canonical release-notes surface.
- Keep root `CHANGELOG.md` as a pointer to GitHub Releases.
- Validate `.github/release-please-config.json` in CI so unsupported changelog paths fail before the workflow reaches GitHub Actions.

这意味着 multi-component repo 无法使用如下 `changelog-path` values，强行把 subpackage release entries 写回同一个 shared root changelog file：

- `../../CHANGELOG.md`
- `../CHANGELOG.md`

实际修复是：

- 在 `.github/release-please-config.json` 中对所有 components 设置 `skip-changelog: true`
- 把 GitHub Releases 作为 canonical release-notes surface
- 将 `CHANGELOG.md` 缩减为简单 pointer file
- 加 repo validation，在 merge 前捕获 illegal upward changelog paths

## 最终 Release 流程

迁移后：

1. Normal feature PRs merge 到 `main`。
2. `Release PR` workflow 更新 repo 的一个 standing release PR。
3. 额外 releasable merges 会累积进同一个 release PR。
4. Maintainers 可以 inspect standing release PR，或运行 manual preview flow。
5. actual release 仅在 generated release PR merge 时发生。
6. 只有当 `cli` component 是该 release 的一部分时，npm publish 才运行。
7. Component-specific release notes 通过 GitHub releases 发布，例如 `cli-vX.Y.Z` 和 `compound-engineering-vX.Y.Z`。

## Component 规则

- PR title 决定 release intent：
  - `feat` => minor
  - `fix` / `perf` / `refactor` / `revert` => patch
  - `!` => major
- File paths 决定 component ownership：
  - `src/**`, `package.json`, `bun.lock`, `tests/cli.test.ts` => `cli`
  - `plugins/compound-engineering/**` => `compound-engineering`
  - `plugins/coding-tutor/**` => `coding-tutor`
  - `.claude-plugin/marketplace.json` => `marketplace`
  - `.cursor-plugin/marketplace.json` => `cursor-marketplace`
- Optional title scopes 仅 advisory。

这保持 titles 简单，同时仍让 release system 决定正确 component bump。

## 示例

### 一个 merge 落地，但还没有 cut release

- 一个 `fix:` PR merge 到 `main`
- standing release PR 更新
- 尚未 publish 任何内容

### release 前又有更多 work 落地

- 后续一个 `feat:` PR merge 到 `main`
- 同一个 open release PR 更新，以包含两项 changes
- pending bump 可根据全部 unreleased work 增加

### 仅 Plugin 的 release

- change 只落在 `plugins/coding-tutor/**` 下
- 只有 `coding-tutor` 应 bump
- `compound-engineering`、`marketplace` 和 `cli` 应保持不动
- 除非 `cli` 也是该 release 的一部分，否则 npm publish 不应运行

### 仅 Marketplace 的 release

- 新 plugin 加入 catalog，或 marketplace metadata changes
- `marketplace` bumps
- 现有 plugin versions 不需要仅因 catalog changed 而 bump

### 例外的手动 bump

- Maintainers 认为 inferred bump 太小
- 使用 preview/release override path，而不是制造 fake commits
- release 仍通过同一个 CI-owned process

## Release Notes 模型

- Pending release state 可在一个 standing release PR 中看到。
- Published release history 以 GitHub Releases 为 canonical。
- Component identity 由 component-specific tags 承载，例如：
  - `cli-vX.Y.Z`
  - `compound-engineering-vX.Y.Z`
  - `coding-tutor-vX.Y.Z`
  - `marketplace-vX.Y.Z`
  - `cursor-marketplace-vX.Y.Z`
- Root `CHANGELOG.md` 只是指向 GitHub Releases 的 pointer，不是新 releases 的 canonical source。

## 关键文件

- `.github/release-please-config.json`
- `.github/.release-please-manifest.json`
- `.github/workflows/release-pr.yml`
- `.github/workflows/release-preview.yml`
- `.github/workflows/ci.yml`
- `src/release/components.ts`
- `src/release/metadata.ts`
- `scripts/release/preview.ts`
- `scripts/release/sync-metadata.ts`
- `scripts/release/validate.ts`
- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`

## 预防措施

- Release authority 只留在 CI。
- 不重新引入 local maintainer-only release flows 或 hand-managed version bumps。
- 保持 `AGENTS.md` canonical。如果某个 tool 仍需要 `CLAUDE.md`，只把它作为 compatibility shim。
- 如果工具原生不支持，不要尝试把 multi-component release notes 强行写回一个 committed changelog file。
- 在 CI 中 validate `.github/release-please-config.json`，使 unsupported changelog-path values 在 workflow 到达 GitHub Actions 前失败。
- 任何 plugin inventories、release-owned descriptions 或 marketplace entries 可能变化时，运行 `bun run release:validate`。
- 当 generic concern 不需要 repo-specific logic 时，偏好 maintained CI actions，而不是 custom validation。

## 验证清单

Merge 前：

- 确认 PR title 通过 semantic validation。
- 运行 `bun test`。
- 运行 `bun run release:validate`。
- 对 representative changed files 运行 `bun run release:preview ...`。

将 release-system changes merge 到 `main` 后：

- 验证 exactly one standing release PR 被创建或更新。
- 确认 ordinary merges 到 `main` 不会直接 publish npm。
- 检查 release PR 的 component selection、versions 和 metadata updates 是否正确。

Merge generated release PR 前：

- 验证 untouched components 不变。
- 验证 `marketplace` 只因 marketplace-level changes bump。
- 验证 plugin-only changes 不 imply `cli`，除非 `src/` 也 changed。

Merge generated release PR 后：

- 确认 npm publish 只在 `cli` 是 release 一部分时运行。
- 确认没有只包含 generated churn 的 recursive follow-up release PR。
- 确认 expected component GitHub releases 已创建，且 release-owned metadata 与 released components 匹配。

## 相关文档

- `docs/solutions/plugin-versioning-requirements.md`
- `docs/solutions/adding-converter-target-providers.md`
- `AGENTS.md`
