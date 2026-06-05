---
date: 2026-03-27
topic: ce-skill-prefix-rename
---

# 所有 Skills 与 Agents 使用一致的 `ce-` Prefix

## 问题框架（Problem Frame）

随着 Claude Code plugin ecosystem 增长，`setup`、`plan`、`review`、`frontend-design` 这类 generic skill names 会在用户安装多个 plugins 时冲突。输入 `/plan` 会展示每个 plugin 的 plan skill，迫使用户扫描 descriptions。Agent names 也会跨 plugins 冲突 -- `adversarial-reviewer` 或 `security-reviewer` 这类 generic names 足够常见，多个 plugins 都可能定义它们。compound-engineering plugin 当前混用不一致：8 个 core workflow skills 使用 `ce:` colon prefix，另外 33 个完全无 prefix。Agents 使用冗长的 3-segment references（`compound-engineering:<category>:<agent-name>`），既笨重，又因为 agents 将有唯一 `ce-` prefix 而可简化。这造成 collision risk、令人困惑的 naming taxonomy，以及不必要冗长的 agent references。

将所有 owned skills 与 agents 标准化为 `ce-` hyphen prefix，可以消除 collisions，创建一致 namespace，简化 agent references，并移除在 Windows 上需要 filesystem sanitization 的 colon character。

Related（相关）: [GitHub Issue #337](https://github.com/EveryInc/compound-engineering-plugin/issues/337)

## 需求（Requirements）

进行 files 和 folders rename 时，必须尽可能使用 `git mv`，以保持简单、显式 intent 和 history preservation。如果 fallback，需通知发生了什么以及原因。

### 命名规则（Naming Rules）

- R1. 所有 compound-engineering-owned skills 和 agents 采用 `ce-` hyphen prefix
- R2. 当前使用 `ce:` colon prefix 的 skills 改为 `ce-` hyphen prefix（例如 `ce:plan` -> `ce-plan`）
- R3. 当前无 prefix 的 Skills 和 Agents 加上 `ce-` 前缀（例如 `setup` -> `ce-setup`，`frontend-design` -> `ce-frontend-design`，`repo-research-analyst` -> `ce-repo-research-analyst`）
- R4. `git-*` skills 用 `ce-` 替换 `git-` prefix（例如 `git-commit` -> `ce-commit`，`git-worktree` -> `ce-worktree`）
- R5. `report-bug-ce` normalize 为 `ce-report-bug`（drop redundant suffix）

### 排除项（Exclusions）

- R6. `agent-browser` 和 `rclone` excluded（来自 upstream，不是我们的 skills）
- R7. `lfg` 和 `slfg` excluded from renaming（短且 memorable 的 workflow entry points），但其 internal skill invocations 必须按 R12 更新

### 传播更新（Propagation）

- R8. Rename 后，skill 与 agent frontmatter `name:` field 必须匹配（不再有 colon-vs-hyphen divergence）。Directories 在适用时也需要反映 new names。
- R9. 更新所有 cross-references：skill-to-skill invocations（`/ce:plan` -> `/ce-plan`）、fully-qualified references（`/compound-engineering:todo-resolve` -> `/compound-engineering:ce-todo-resolve`）、`Skill("compound-engineering:...")` programmatic invocations、prose mentions、skill `description:` frontmatter fields，以及 intra-skill path references（`${CLAUDE_PLUGIN_ROOT}/skills/<old-name>/...`）
- R10. 更新 active documentation：root README、plugin README、AGENTS.md。注意：AGENTS.md 的 "Why `ce:`?" rationale section（lines 53-60）需要 conceptual rewrite，解释 `ce-` convention，而不是简单 find-and-replace。`docs/` 中 historical docs（past brainstorms、plans、solutions）保持原样 -- 它们是 past decisions 的记录。
- R11. 更新引用 skill names 的 agent prompt files。
- R11b. 更新引用 Agent names 的 skill prompt files。
- R11c. Agent references drop `compound-engineering:` plugin prefix，并保留 category。agent name 本身获得 `ce-` prefix。（例如 `compound-engineering:review:adversarial-reviewer` -> `review:ce-adversarial-reviewer`）
- R12. lfg 和 slfg orchestration chains 更新为使用 new skill names（lfg/slfg 本身按 R7 不 rename，但其 internal skill 和 agent invocations 必须反映 new names）
- R13. 保留 Converter infrastructure：`sanitizePathName()` 和 colon-handling logic 作为未来保护，不删除。添加 test assertion，确保没有 skill `name:` field 包含 colon，使 sanitizer 成为 defense-in-depth，而不是 silent workaround。
- R17. 更新 `src/converters/claude-to-codex.ts` 中 Codex converter 的 `isCanonicalCodexWorkflowSkill()` 与 `toCanonicalWorkflowSkillName()`，匹配 `ce-` prefix pattern（当前 hardcodes `ce:` prefix check）。相应更新 `tests/codex-converter.test.ts` 和 `tests/codex-writer.test.ts` 中的 test fixtures。

### 测试（Testing）

- R14. Path sanitization tests 更新以反映 new naming（collision detection 仍然工作）
- R15. 所有 changes 后 `bun test` passes
- R16. 所有 changes 后 `bun run release:validate` passes
- R18. Converter test fixtures 中 hardcode `ce:plan` 等、且测试 compound-engineering plugin behavior 的，更新为 `ce-plan`。测试其他 plugins 的 abstract colon-handling 的 fixtures 可保留。
- R19. Sanity check：对每个 skill 和 agent name grep，确认 new names 正确，old names 不持续存在，除 historical planning、requirements 等 docs 外。

---

## 完整 Rename Map（Complete Rename Map）

### Excluded (no change) - 4 skills（排除项，不变）

| Current Name | Reason |
|---|---|
| `agent-browser` | External/upstream |
| `rclone` | External/upstream |
| `lfg` | Exception (memorable name) |
| `slfg` | Exception (memorable name) |

### `ce:` -> `ce-` (frontmatter only, dirs already match) - 8 skills（仅 frontmatter，dirs 已匹配）

| Current Name | New Name | Dir Rename? |
|---|---|---|
| `ce:brainstorm` | `ce-brainstorm` | No |
| `ce:compound` | `ce-compound` | No |
| `ce:compound-refresh` | `ce-compound-refresh` | No |
| `ce:ideate` | `ce-ideate` | No |
| `ce:plan` | `ce-plan` | No |
| `ce:review` | `ce-review` | No |
| `ce:work` | `ce-work` | No |
| `ce:work-beta` | `ce-work-beta` | No |

### `git-*` -> `ce-*` (replace prefix) - 4 skills（替换 prefix）

| Current Name | New Name | Dir Rename |
|---|---|---|
| `git-clean-gone-branches` | `ce-clean-gone-branches` | `git-clean-gone-branches/` -> `ce-clean-gone-branches/` |
| `git-commit` | `ce-commit` | `git-commit/` -> `ce-commit/` |
| `git-commit-push-pr` | `ce-commit-push-pr` | `git-commit-push-pr/` -> `ce-commit-push-pr/` |
| `git-worktree` | `ce-worktree` | `git-worktree/` -> `ce-worktree/` |

### 特殊规范化（Special normalization）- 1 skill

| Current Name | New Name | Dir Rename |
|---|---|---|
| `report-bug-ce` | `ce-report-bug` | `report-bug-ce/` -> `ce-report-bug/` |

### 标准 prefix 添加（Standard prefix addition）- 24 skills

| Current Name | New Name | Dir Rename |
|---|---|---|
| `agent-native-architecture` | `ce-agent-native-architecture` | `agent-native-architecture/` -> `ce-agent-native-architecture/` |
| `agent-native-audit` | `ce-agent-native-audit` | `agent-native-audit/` -> `ce-agent-native-audit/` |
| `andrew-kane-gem-writer` | `ce-andrew-kane-gem-writer` | `andrew-kane-gem-writer/` -> `ce-andrew-kane-gem-writer/` |
| `changelog` | `ce-changelog` | `changelog/` -> `ce-changelog/` |
| `claude-permissions-optimizer` | `ce-claude-permissions-optimizer` | `claude-permissions-optimizer/` -> `ce-claude-permissions-optimizer/` |
| `deploy-docs` | `ce-deploy-docs` | `deploy-docs/` -> `ce-deploy-docs/` |
| `dhh-rails-style` | `ce-dhh-rails-style` | `dhh-rails-style/` -> `ce-dhh-rails-style/` |
| `document-review` | `ce-document-review` | `document-review/` -> `ce-document-review/` |
| `dspy-ruby` | `ce-dspy-ruby` | `dspy-ruby/` -> `ce-dspy-ruby/` |
| `every-style-editor` | `ce-every-style-editor` | `every-style-editor/` -> `ce-every-style-editor/` |
| `feature-video` | `ce-feature-video` | `feature-video/` -> `ce-feature-video/` |
| `frontend-design` | `ce-frontend-design` | `frontend-design/` -> `ce-frontend-design/` |
| `gemini-imagegen` | `ce-gemini-imagegen` | `gemini-imagegen/` -> `ce-gemini-imagegen/` |
| `onboarding` | `ce-onboarding` | `onboarding/` -> `ce-onboarding/` |
| `orchestrating-swarms` | `ce-orchestrating-swarms` | `orchestrating-swarms/` -> `ce-orchestrating-swarms/` |
| `proof` | `ce-proof` | `proof/` -> `ce-proof/` |
| `reproduce-bug` | `ce-reproduce-bug` | `reproduce-bug/` -> `ce-reproduce-bug/` |
| `resolve-pr-feedback` | `ce-resolve-pr-feedback` | `resolve-pr-feedback/` -> `ce-resolve-pr-feedback/` |
| `setup` | `ce-setup` | `setup/` -> `ce-setup/` |
| `test-browser` | `ce-test-browser` | `test-browser/` -> `ce-test-browser/` |
| `test-xcode` | `ce-test-xcode` | `test-xcode/` -> `ce-test-xcode/` |
| `todo-create` | `ce-todo-create` | `todo-create/` -> `ce-todo-create/` |
| `todo-resolve` | `ce-todo-resolve` | `todo-resolve/` -> `ce-todo-resolve/` |
| `todo-triage` | `ce-todo-triage` | `todo-triage/` -> `ce-todo-triage/` |

**Total（总计）: 37 skills renamed, 4 excluded (41 skills total)**

### Agent renames（agent rename）- 49 agents

所有 agents 都在现有 category subdirs 内加 `ce-` prefix。References 中 drop `compound-engineering:` plugin prefix，保留 `<category>:ce-<agent-name>` format。Category subdirs 保留用于 organization。

| Current File | New File | Old Reference | New Reference |
|---|---|---|---|
| `agents/design/design-implementation-reviewer.md` | `agents/design/ce-design-implementation-reviewer.md` | `compound-engineering:design:design-implementation-reviewer` | `design:ce-design-implementation-reviewer` |
| `agents/design/design-iterator.md` | `agents/design/ce-design-iterator.md` | `compound-engineering:design:design-iterator` | `design:ce-design-iterator` |
| `agents/design/figma-design-sync.md` | `agents/design/ce-figma-design-sync.md` | `compound-engineering:design:figma-design-sync` | `design:ce-figma-design-sync` |
| `agents/docs/ankane-readme-writer.md` | `agents/docs/ce-ankane-readme-writer.md` | `compound-engineering:docs:ankane-readme-writer` | `docs:ce-ankane-readme-writer` |
| `agents/document-review/adversarial-document-reviewer.md` | `agents/document-review/ce-adversarial-document-reviewer.md` | `compound-engineering:document-review:adversarial-document-reviewer` | `document-review:ce-adversarial-document-reviewer` |
| `agents/document-review/coherence-reviewer.md` | `agents/document-review/ce-coherence-reviewer.md` | `compound-engineering:document-review:coherence-reviewer` | `document-review:ce-coherence-reviewer` |
| `agents/document-review/design-lens-reviewer.md` | `agents/document-review/ce-design-lens-reviewer.md` | `compound-engineering:document-review:design-lens-reviewer` | `document-review:ce-design-lens-reviewer` |
| `agents/document-review/feasibility-reviewer.md` | `agents/document-review/ce-feasibility-reviewer.md` | `compound-engineering:document-review:feasibility-reviewer` | `document-review:ce-feasibility-reviewer` |
| `agents/document-review/product-lens-reviewer.md` | `agents/document-review/ce-product-lens-reviewer.md` | `compound-engineering:document-review:product-lens-reviewer` | `document-review:ce-product-lens-reviewer` |
| `agents/document-review/scope-guardian-reviewer.md` | `agents/document-review/ce-scope-guardian-reviewer.md` | `compound-engineering:document-review:scope-guardian-reviewer` | `document-review:ce-scope-guardian-reviewer` |
| `agents/document-review/security-lens-reviewer.md` | `agents/document-review/ce-security-lens-reviewer.md` | `compound-engineering:document-review:security-lens-reviewer` | `document-review:ce-security-lens-reviewer` |
| `agents/research/best-practices-researcher.md` | `agents/research/ce-best-practices-researcher.md` | `compound-engineering:research:best-practices-researcher` | `research:ce-best-practices-researcher` |
| `agents/research/framework-docs-researcher.md` | `agents/research/ce-framework-docs-researcher.md` | `compound-engineering:research:framework-docs-researcher` | `research:ce-framework-docs-researcher` |
| `agents/research/git-history-analyzer.md` | `agents/research/ce-git-history-analyzer.md` | `compound-engineering:research:git-history-analyzer` | `research:ce-git-history-analyzer` |
| `agents/research/issue-intelligence-analyst.md` | `agents/research/ce-issue-intelligence-analyst.md` | `compound-engineering:research:issue-intelligence-analyst` | `research:ce-issue-intelligence-analyst` |
| `agents/research/learnings-researcher.md` | `agents/research/ce-learnings-researcher.md` | `compound-engineering:research:learnings-researcher` | `research:ce-learnings-researcher` |
| `agents/research/repo-research-analyst.md` | `agents/research/ce-repo-research-analyst.md` | `compound-engineering:research:repo-research-analyst` | `research:ce-repo-research-analyst` |
| `agents/review/adversarial-reviewer.md` | `agents/review/ce-adversarial-reviewer.md` | `compound-engineering:review:adversarial-reviewer` | `review:ce-adversarial-reviewer` |
| `agents/review/agent-native-reviewer.md` | `agents/review/ce-agent-native-reviewer.md` | `compound-engineering:review:agent-native-reviewer` | `review:ce-agent-native-reviewer` |
| `agents/review/api-contract-reviewer.md` | `agents/review/ce-api-contract-reviewer.md` | `compound-engineering:review:api-contract-reviewer` | `review:ce-api-contract-reviewer` |
| `agents/review/architecture-strategist.md` | `agents/review/ce-architecture-strategist.md` | `compound-engineering:review:architecture-strategist` | `review:ce-architecture-strategist` |
| `agents/review/cli-agent-readiness-reviewer.md` | `agents/review/ce-cli-agent-readiness-reviewer.md` | `compound-engineering:review:cli-agent-readiness-reviewer` | `review:ce-cli-agent-readiness-reviewer` |
| `agents/review/cli-readiness-reviewer.md` | `agents/review/ce-cli-readiness-reviewer.md` | `compound-engineering:review:cli-readiness-reviewer` | `review:ce-cli-readiness-reviewer` |
| `agents/review/code-simplicity-reviewer.md` | `agents/review/ce-code-simplicity-reviewer.md` | `compound-engineering:review:code-simplicity-reviewer` | `review:ce-code-simplicity-reviewer` |
| `agents/review/correctness-reviewer.md` | `agents/review/ce-correctness-reviewer.md` | `compound-engineering:review:correctness-reviewer` | `review:ce-correctness-reviewer` |
| `agents/review/data-integrity-guardian.md` | `agents/review/ce-data-integrity-guardian.md` | `compound-engineering:review:data-integrity-guardian` | `review:ce-data-integrity-guardian` |
| `agents/review/data-migration-expert.md` | `agents/review/ce-data-migration-expert.md` | `compound-engineering:review:data-migration-expert` | `review:ce-data-migration-expert` |
| `agents/review/data-migrations-reviewer.md` | `agents/review/ce-data-migrations-reviewer.md` | `compound-engineering:review:data-migrations-reviewer` | `review:ce-data-migrations-reviewer` |
| `agents/review/deployment-verification-agent.md` | `agents/review/ce-deployment-verification-agent.md` | `compound-engineering:review:deployment-verification-agent` | `review:ce-deployment-verification-agent` |
| `agents/review/dhh-rails-reviewer.md` | `agents/review/ce-dhh-rails-reviewer.md` | `compound-engineering:review:dhh-rails-reviewer` | `review:ce-dhh-rails-reviewer` |
| `agents/review/julik-frontend-races-reviewer.md` | `agents/review/ce-julik-frontend-races-reviewer.md` | `compound-engineering:review:julik-frontend-races-reviewer` | `review:ce-julik-frontend-races-reviewer` |
| `agents/review/kieran-python-reviewer.md` | `agents/review/ce-kieran-python-reviewer.md` | `compound-engineering:review:kieran-python-reviewer` | `review:ce-kieran-python-reviewer` |
| `agents/review/kieran-rails-reviewer.md` | `agents/review/ce-kieran-rails-reviewer.md` | `compound-engineering:review:kieran-rails-reviewer` | `review:ce-kieran-rails-reviewer` |
| `agents/review/kieran-typescript-reviewer.md` | `agents/review/ce-kieran-typescript-reviewer.md` | `compound-engineering:review:kieran-typescript-reviewer` | `review:ce-kieran-typescript-reviewer` |
| `agents/review/maintainability-reviewer.md` | `agents/review/ce-maintainability-reviewer.md` | `compound-engineering:review:maintainability-reviewer` | `review:ce-maintainability-reviewer` |
| `agents/review/pattern-recognition-specialist.md` | `agents/review/ce-pattern-recognition-specialist.md` | `compound-engineering:review:pattern-recognition-specialist` | `review:ce-pattern-recognition-specialist` |
| `agents/review/performance-oracle.md` | `agents/review/ce-performance-oracle.md` | `compound-engineering:review:performance-oracle` | `review:ce-performance-oracle` |
| `agents/review/performance-reviewer.md` | `agents/review/ce-performance-reviewer.md` | `compound-engineering:review:performance-reviewer` | `review:ce-performance-reviewer` |
| `agents/review/previous-comments-reviewer.md` | `agents/review/ce-previous-comments-reviewer.md` | `compound-engineering:review:previous-comments-reviewer` | `review:ce-previous-comments-reviewer` |
| `agents/review/project-standards-reviewer.md` | `agents/review/ce-project-standards-reviewer.md` | `compound-engineering:review:project-standards-reviewer` | `review:ce-project-standards-reviewer` |
| `agents/review/reliability-reviewer.md` | `agents/review/ce-reliability-reviewer.md` | `compound-engineering:review:reliability-reviewer` | `review:ce-reliability-reviewer` |
| `agents/review/schema-drift-detector.md` | `agents/review/ce-schema-drift-detector.md` | `compound-engineering:review:schema-drift-detector` | `review:ce-schema-drift-detector` |
| `agents/review/security-reviewer.md` | `agents/review/ce-security-reviewer.md` | `compound-engineering:review:security-reviewer` | `review:ce-security-reviewer` |
| `agents/review/security-sentinel.md` | `agents/review/ce-security-sentinel.md` | `compound-engineering:review:security-sentinel` | `review:ce-security-sentinel` |
| `agents/review/testing-reviewer.md` | `agents/review/ce-testing-reviewer.md` | `compound-engineering:review:testing-reviewer` | `review:ce-testing-reviewer` |
| `agents/workflow/bug-reproduction-validator.md` | `agents/workflow/ce-bug-reproduction-validator.md` | `compound-engineering:workflow:bug-reproduction-validator` | `workflow:ce-bug-reproduction-validator` |
| `agents/workflow/lint.md` | `agents/workflow/ce-lint.md` | `compound-engineering:workflow:lint` | `workflow:ce-lint` |
| `agents/workflow/pr-comment-resolver.md` | `agents/workflow/ce-pr-comment-resolver.md` | `compound-engineering:workflow:pr-comment-resolver` | `workflow:ce-pr-comment-resolver` |
| `agents/workflow/spec-flow-analyzer.md` | `agents/workflow/ce-spec-flow-analyzer.md` | `compound-engineering:workflow:spec-flow-analyzer` | `workflow:ce-spec-flow-analyzer` |

**Total（总计）: 49 agents renamed in place (category subdirs preserved)**

---

## 成功标准（Success Criteria）

- 每个 owned skill（4 个 exclusions 除外）在 directory name 和 frontmatter 中都有 `ce-` prefix
- 每个 agent 在其 category subdir 内的 filename 和 frontmatter 中都有 `ce-` prefix
- skills、agents、docs 和 orchestration chains 中所有 cross-references 使用 new names
- 所有 3-segment agent references（`compound-engineering:<category>:<agent>`）简化为 `<category>:ce-<agent>`
- `bun test` 和 `bun run release:validate` pass
- 任何 skill `name:` field 中不再有 colon characters（虽然 sanitization infra 保留）
- Slash command invocations 使用 new names 工作（例如 `/ce-plan`）
- lfg 和 slfg orchestration chains 引用 new skill 与 agent names（R12）
- Grep sanity check 确认 active code 中没有 old names（R19）

## 范围边界（Scope Boundaries）

- **不移除 sanitization infrastructure** -- `sanitizePathName()` 继续作为未来任何 colons 的保护
- **不添加 backward-compatibility aliases** -- 没有 alias mechanism；这是 clean break
- **不 rename external skills** -- `agent-browser` 和 `rclone` 是 upstream
- **不 rename lfg/slfg** -- 保留为 memorable exceptions
- **Historical docs 不更新** -- `docs/` 中 past brainstorms、plans 和 solutions 引用 old names；这是 expected and acceptable（它们是 historical records）。R10 仅适用于 active docs（README、AGENTS.md），不适用于 historical docs。

## 关键决策（Key Decisions）

- **Hyphen over colon**：`ce-` 而不是 `ce:` -- 消除 filesystem sanitization divergence，并更 portable
- **git-* replaces prefix**：`git-commit` -> `ce-commit`，而不是 `ce-git-commit` -- 避免 verbose double-prefix
- **report-bug-ce normalizes（规范化 report-bug-ce）**：drop redundant `-ce` suffix -> `ce-report-bug`
- **Agents renamed in place**：保留 category subdirs 用于 organization。Agent files 在其 category dir 内加 `ce-` prefix。3-segment refs drop plugin prefix：`compound-engineering:review:adversarial-reviewer` -> `review:ce-adversarial-reviewer`。
- **Major version bump**：这是 breaking change；plugin version 会 bump major version 来 signal。
- **Clean break, no aliases**：用户立即学习 new names；old names 停止工作
- **Preserve sanitization**：即使当前没有 skills 使用 colons，也保留 colon-handling code -- future-proofing
- **git mv required**：所有 renames 用 `git mv` 保留 history。只有通知后才 fallback。

## 依赖与假设（Dependencies / Assumptions）

- 通过 `git mv` 进行 skill directory renames 可保留 git history。Commit strategy（single vs multiple commits）deferred to planning。
- lfg/slfg 会同时通过 short name（`/ce:plan`）和 fully-qualified（`/compound-engineering:todo-resolve`）引用其他 skills -- 两种 patterns 都需要更新
- README 可能包含 stale skill references（例如 `/sync`）-- 在 R10 documentation pass 中 cleanup

## 未决问题（Outstanding Questions）

### 延后到规划阶段（Deferred to Planning）

- [Affects R9][Needs research] 每个 SKILL.md、agent file 和 doc 中所有需要更新的 cross-reference 的 exact inventory -- planner 应全面 grep
- [Affects R8][Technical] directory renames 应通过 `git mv` 在单个 commit 中完成，还是拆成多个 commits 以提升 reviewability？
- [Affects R14, R18][Technical] 哪些具体 test assertions 引用 skill names 并需要更新？哪些 test fixtures 测 compound-engineering behavior（应更新）vs abstract colon-handling（可保留）？

## 下一步（Next Steps）

-> `/ce:plan` 做 structured implementation planning（它本身也会作为本工作的一部分 rename 为 `/ce-plan`）
