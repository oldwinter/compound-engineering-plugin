---
title: "Release-please version drift recovery（版本漂移恢复）"
category: workflow
date: 2026-04-24
created: 2026-04-24
severity: high
component: release-automation
problem_type: workflow_issue
tags:
  - release-please
  - version-drift
  - plugin-versioning
  - recovery-playbook
  - linked-versions
  - extra-files
---

# Release-please version drift recovery（version drift 恢复）

## 问题

手动编辑由 release 管理的 version field（任何列在 `extra-files` 中的 `plugin.json`、`package.json`，或 release-please manifest）会造成 drift，后果包括：

- 在每个 PR 的 CI 上破坏 `bun run release:validate`
- 如果不纠正，下一次 release-please run 可能导致 version regression
- 很容易意外引入 -- feature commit 中的一行 edit 即可
- 至少有三条有效 recovery paths，每条都有不同的 user-impact trade-offs

本文档是在检测到 drift 时使用的 playbook。它存在是因为从零调查成本很高，且错误选择可能让情况更糟。

## 文件关系图（File relationship map）

repo 有五个 release components。每个 component 拥有一个或多个 files。Release-please 读取 manifest，并写入 extra-files。

```
.github/.release-please-manifest.json       (release-please memory: last released per component)
├── "."                                     → cli component              (v = X.Y.Z)
├── "plugins/compound-engineering"          → compound-engineering       (v = X.Y.Z)
├── "plugins/coding-tutor"                  → coding-tutor               (v = A.B.C)
├── ".claude-plugin"                        → marketplace                (v = M.N.O)
└── ".cursor-plugin"                        → cursor-marketplace         (v = P.Q.R)

.github/release-please-config.json          (component config: extra-files, plugins)
└── "plugins": [{ type: "linked-versions", components: ["cli", "compound-engineering"] }]
    ← forces cli and compound-engineering to bump together

Each component's extra-files get rewritten by release-please when a release is cut:

  cli (".")                               compound-engineering
  ├── package.json ($.version)            ├── .claude-plugin/plugin.json  ($.version)
                                          ├── .cursor-plugin/plugin.json  ($.version)
                                          └── .codex-plugin/plugin.json   ($.version)

  coding-tutor                            marketplace / cursor-marketplace
  ├── .claude-plugin/plugin.json          ├── marketplace.json ($.metadata.version)
  ├── .cursor-plugin/plugin.json
  └── .codex-plugin/plugin.json
```

**关键 invariants：**

- component 的 `extra-files` list 中每个 file 必须共享同一 version。
- 因为 `linked-versions`，**`cli` 与 `compound-engineering` 必须始终处于同一 version。** 这意味着 `package.json`（cli）和三个 `compound-engineering/*/plugin.json` files 一起移动。
- Marketplace components（`.claude-plugin`、`.cursor-plugin`）是 **independent** -- 它们有自己的 versions，不随 plugin bumps 移动。
- `bun run release:validate` enforce 这些 invariants。它的 error message 会指出发生 drift 的 file(s)。

## Release-please 如何跟踪 versions

Release-please 把 **manifest 视为 "last released version per component" 的 source of truth**。Extra-files 是 release-please 在 release 期间写入的 outputs。流程是：

1. Push 到 `main` 触发 `release-pr` workflow
2. Release-please 读取 manifest，了解上次 released version
3. Release-please 遍历自上个 release tag 以来的 conventional commits
4. Release-please 计算 next version（`feat:` → minor，`fix:` → patch 等）
5. Release-please 打开或更新一个 "chore: release main" PR，其中：
   - 将 manifest bump 到 new version
   - 将每个 `extra-file` bump 到 new version
6. release PR merge 后，cut release（git tag，可选 npm publish）

正常操作下，**humans 永远不直接触碰 manifest 或 extra-files**。两者由 release-please 在 release PR 中一起更新。Drift 就是这个保证被破坏的状态。

## Drift detection（drift 检测）

`bun run release:validate` 通过 `.github/workflows/ci.yml` 在每个 PR 和每次 push 到 `main` 上运行。以下情况会失败：

- 同一 component 内任意两个 `extra-files` version 不一致
- marketplace plugin-list 在 `.claude-plugin`、`.cursor-plugin` 和 `.agents/plugins` 之间不对称
- Codex manifest 缺少 required fields 或其 `skills` directory
- Claude/Cursor/Codex plugin.json files 之间 description drift（用 `write: true` 自动纠正）

**Important:** manifest 中 last-released version 的 memory 当前 **不会** 直接与 extra-files 校验。这意味着如果所有 extra-files 都一致为 X.Y.Z，但 manifest 认为 last release 是 W.X.Y（W<X），今天的 `release:validate` 会通过。它会在下一次 release-please run 中失败，因为 release-please 会尝试从 W.X.Y 往下 bump。

## Recovery decision tree（恢复决策树）

检测到 drift 时，在编辑任何内容前先选择 recovery path。

```
release:validate reports drift
    ↓
1. Identify which component(s) have drifted. Check:
    - extra-files vs each other within the component
    - extra-files vs the manifest entry for that component
    - linked-versions: is cli in sync with compound-engineering?
    ↓
2. Is anyone installed at the drifted (higher) version?
    ├── YES (or unknown — developers using `/plugin install --dev` from main)
    │       → Forward-sync: update all lower files UP to match the drifted high
    │
    └── NO (can verify no git tag, no npm publish, no marketplace cache entry)
            → Backward-revert: revert the drifted file DOWN to match the rest
```

### Path A：Forward-sync（向前同步）

当任何用户可能已在本地安装 drifted version 时使用（最常见 -- 从 main checkout 运行 `/plugin install` 的 developers 会得到 `.claude-plugin/plugin.json` 中的 version）。

**变更范围（Scope of changes）：**

- affected component(s) 内所有 extra-files → bump up 到 drifted version
- affected component 的 `.github/.release-please-manifest.json` entry → bump 以匹配
- **如果 affected component 是 `compound-engineering` 或 `cli`：** 因为 `linked-versions`，两者都要 bump：
  - manifest 的 `plugins/compound-engineering` 与 `.` entries 一起更新
  - `package.json`（cli 的 extra-file）和所有三个 compound-engineering plugin.json files 一起更新

**Why the manifest edit is necessary:** 没有它时，下一次 release-please run 读取到 "last released was W.X.Y"（stale manifest value），计算 next version 为 W.X.(Y+1)，并把 W.X.(Y+1) 写到 extra-files -- 导致任何处在 forward-synced version 的用户 regression。

**这是 release-please 针对 out-of-band releases 的 documented recovery pattern。** manifest file 被纳入 git 正是为了在 release-please normal flow 外发生 release 时手动纠正。

### Path B：Backward-revert（向后回退）

当你能确认无人安装 drifted version 时使用。要求：

- drifted version 没有 git tag（例如 `git tag -l | grep <version>`）
- 没有 npm publish（例如 `npm view @every-env/compound-plugin versions`）
- drifted version 没有 marketplace release
- 自 drift 引入以来没有 team member pull main（很难验证；若 drift 已存在超过约一小时，假设 YES）

**变更范围（Scope of changes）：**

- drifted extra-file(s) → revert DOWN 到 manifest 的 value
- Manifest 和 `package.json`（cli）不变 -- 它们已经正确

**This is simpler（这更简单）**（修改更少 files，无 manifest edit）**但有 user regression 风险**，如果任何人已安装 drifted high version。他们的 local cache dir（例如 `~/.claude/plugins/cache/.../compound-engineering/<drifted>/`）会变成 orphaned，而把 version field 视为 monotonic 的 tooling 可能拒绝 downgrade 或发出 warnings。

### Path C（路径 C）：`release-as` pin

当你希望 release-please 自己通过 normal release PR 执行 sync，而不是手动编辑 manifest 时使用。

**变更范围（Scope of changes）：**

- Forward-sync 所有 extra-files UP 到 drifted version（与 Path A 相同）
- 在 `.github/release-please-config.json` 中为每个 affected component 添加 `"release-as": "<drifted+1>"`
- 不编辑 manifest
- 下一次 release-please run 生成 release PR，把所有东西 bump 到 `<drifted+1>`，高于 drifted version，从而避免 regression

**Caveat（注意）：** release PR merge 后必须移除 `release-as` pin -- 否则后续每次 release 都会固定到同一 version。repo 曾被 stale `release-as` pins 咬过（见 `ab44d89b`），因此 Path C 通常比 Path A overhead 更大。除非有明确理由让 release-please drive bump，否则偏好 Path A。

### 摘要（Summary）

| Path | Files changed | When to use | Risk |
|---|---|---|---|
| A -- forward-sync | 3-5（extras + manifest + linked） | 任何人可能处在 drifted version（default） | 若执行正确，无风险 |
| B -- backward-revert | 1-2（仅 drifted extras） | 已确认无人处在 drifted version | 若验证错误，会 user regression |
| C -- `release-as` pin | 3-5 + config change + 后续 cleanup | 想让 release-please drive bump | 需要记得移除 pin |

## Manifest manual edits（manifest 手动编辑）

**Release-please 通常维护 `.github/.release-please-manifest.json`。** 它会在 release PR 中与 extra-files 一起更新。正常操作下 humans 不触碰它。

**Manual edits 只有一种情况是正当的**：从 out-of-band releases 或 version changes 中 recovery，如上面的 Path A。Release-please 自己的文档也指出这一点 -- manifest tracked in git 正是为了在现实与 release-please 记忆 diverges 时纠正。

如果你发现自己出于 Path A recovery 以外的任何理由编辑 manifest，停下来重新考虑。你很可能正在做 release-please 本应 own 的事。

## Worked example：2026-04-24 incident（案例）

在 `chore: release main (#675)`（cut 3.0.3）与 PR #677 之间，四个 direct-to-main merges（`1f20c384`、`f8720da3`、`22d493b1`、`47350c3e`）各自把 `.claude-plugin/plugin.json` bump 一个 patch version -- 3.0.3 → 3.0.4 → 3.0.5 → 3.0.6 → 3.0.7 -- 但没有触碰 `.cursor-plugin`、`.codex-plugin`、manifest 或 `package.json`。这些 bumps 与 feature work 一起 inline 添加，因 direct merge 到 `main` 而绕过 PR CI。

直到 PR #677 打开前，drift 一直不可见。该 PR 的 CI 在 merge commit 上运行 `release:validate`，继承了 main 的 drifted state（`.claude-plugin` 为 3.0.7，其他全为 3.0.3）。validator 因 `.cursor-plugin/plugin.json` 和 `.codex-plugin/plugin.json` 不匹配 `.claude-plugin` 而失败。

Recovery 使用 Path A（forward-sync 到 3.0.7），原因是：

- 到那时，从 local main checkout 安装 `compound-engineering` 的 developers 会在 plugin cache 中拥有 3.0.7
- Path B 会 orphan 这些 caches，并触发 version-regression warnings
- Path C 会重新引入刚刚 cleanup 掉的 `release-as` pin

PR #678 在四个 files 的五个 fields 上应用了完整 Path A fix，并更新了一个同样藏在 release-validate failure 后的 stale test assertion（commit `1f20c384` 重新编号了 `lfg/SKILL.md` 中的 steps，但没有更新 `tests/review-skill-contract.test.ts`）。具体 diff 见 PR #678 commits。

## 预防

Direct-to-main merges 是 root cause。它们绕过运行 `release:validate`、test suites 和 semantic title validation 的 PR CI。

**Branch protection on `main`** 是 enforcement。merge 前必须要求 `test` status check，且 admin bypass 应关闭（或只用于真正 emergencies）。没有 branch protection 时，AGENTS.md 的 "don't manually bump" rule 只靠 honor-system -- 这次 incident 证明它不够。

可选 complementary guards：

- **Dedicated CI job** 检测 non-release-please PR authors 的 manual version bumps。它攻击 cause 而非 symptom，并提供更清晰 error message 指向 AGENTS.md。
- **Pre-commit hook** 通过 `core.hooksPath` 在本地运行 `release:validate`。push 前抓 accident。可用 `--no-verify` 绕过，所以它是 speed-bump，不是 lock。

这些是 nice-to-haves。Branch protection 才是真正修复。

## 相关文档（Related docs）

- `docs/solutions/workflow/manual-release-please-github-releases.md` -- big-picture release model
- `docs/solutions/plugin-versioning-requirements.md` -- plugin-scoped contributor rules
- `plugins/compound-engineering/AGENTS.md` -- 含 don't-manually-bump rules 的 "Versioning Requirements" section
- `.github/release-please-config.json` -- 本文档引用的 extra-files 和 linked-versions configuration
- `src/release/metadata.ts` -- `release:validate` 运行的 `syncReleaseMetadata` function
