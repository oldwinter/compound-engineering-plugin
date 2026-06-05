---
title: "refactor: 将所有 skills 和 agents 重命名为统一的 ce- prefix"
type: refactor
status: completed
date: 2026-03-27
origin: docs/brainstorms/2026-03-27-ce-skill-prefix-rename-requirements.md
deepened: 2026-03-27
---

# 将所有 skills 和 agents 重命名为统一的 `ce-` prefix

## 概览

将 compound-engineering-owned 的全部 37 个 skills 和全部 49 个 agents 重命名为统一的 `ce-` hyphen prefix，以消除与其他 plugins 的 namespace collisions，并移除需要 filesystem sanitization 的 colon character。Agent files 在其现有 category subdirs 内加 `ce-` prefix；3-segment fully-qualified references（`compound-engineering:<category>:<agent>`）简化为 `<category>:ce-<agent>`（drop plugin prefix，保留 category）。这是一次 cross-cutting mechanical rename，会触及 skill directories、agent files、frontmatter、cross-references、converter source code、tests 和 documentation。

## 问题框架

Generic skill names（`setup`、`plan`、`review`）在用户安装多个 Claude Code plugins 时会 collide。当前 naming 不一致：8 个 core workflow skills 使用 `ce:` colon prefix，而另外 33 个没有 prefix。Agent references 使用 verbose 3-segment format（`compound-engineering:review:adversarial-reviewer`）。统一为 `ce-` 可以消除 collisions，使 directory names 与 frontmatter names 对齐，并简化 agent references。（见 origin: docs/brainstorms/2026-03-27-ce-skill-prefix-rename-requirements.md）

## 需求追踪

- R1. 所有 owned skills AND agents 采用 `ce-` hyphen prefix
- R2. `ce:` colon prefix -> `ce-` hyphen prefix（例如 `ce:plan` -> `ce-plan`）
- R3. Unprefixed skills and agents prepend `ce-`（例如 `setup` -> `ce-setup`，`repo-research-analyst` -> `ce-repo-research-analyst`）
- R4. `git-*` skills 替换 prefix 为 `ce-`（例如 `git-commit` -> `ce-commit`）
- R5. `report-bug-ce` normalize 为 `ce-report-bug`
- R6. `agent-browser` 和 `rclone` excluded（upstream）
- R7. `lfg` 和 `slfg` excluded（memorable names），但更新 internal references（R12）
- R8. Skill/agent frontmatter `name:` 必须 match；directories reflect new names
- R9. 更新所有 cross-references（slash commands、fully-qualified、prose、descriptions、intra-skill paths）
- R10. 更新 active documentation（README、AGENTS.md）；historical docs left as-is
- R11. 更新引用 skill names 的 agent prompt files
- R11b. 更新引用 agent names 的 skill prompt files
- R11c. Agent references `compound-engineering:<category>:<agent>` 简化为 `<category>:ce-<agent>`
- R12. 更新 lfg/slfg orchestration chains（skill AND agent invocations）
- R13. 保留 sanitization infrastructure；添加 lint assertion for no-colon invariant
- R14-R16. Tests pass，release:validate passes（测试和 release validation 通过）
- R17. 更新 Codex converter hardcoded `ce:` checks
- R18. 适当更新 test fixtures
- R19. Grep sanity check: new names correct，old names 不在 active code 中残留

## 范围边界

- 不移除 `sanitizePathName()`（为 future colons 保留 defense-in-depth）
- 不添加 backward-compatibility aliases（clean break）
- 不更新 `docs/` 中 historical docs
- 不重命名 `agent-browser`、`rclone`、`lfg`、`slfg`
- 所有 renames 使用 `git mv`；fallback only with notification
- 整个 change 使用 single commit

## 上下文与调研

### 相关代码与模式

- `src/parsers/claude.ts:108` - 从 frontmatter `data.name` 读取 Skill name，fallback 到 dir basename
- `src/utils/files.ts:84-86` - `sanitizePathName()` 将 colons 替换为 hyphens
- `src/converters/claude-to-codex.ts:180-195` - 对 canonical workflow skills 的 hardcoded `ce:` prefix checks
- `src/utils/codex-content.ts:75-86` - Codex flat naming 使用的 `normalizeCodexName()`
- `tests/path-sanitization.test.ts` - 加载 real plugin 的 collision detection test

### 组织内 Learnings

- `docs/solutions/integrations/colon-namespaced-names-break-windows-paths.md` - 记录 colon/hyphen duality 和 three-layer sanitization（target writers、sync paths、converter dedupe sets）。此次 rename 后，CE skills 的 duality 被消除，但 sanitization 仍为其他 plugins 保留。
- `docs/solutions/codex-skill-prompt-entrypoints.md` - Codex 从 directory basenames 派生 skill names。`isCanonicalCodexWorkflowSkill()` function 识别哪些 skills 获得 prompt wrappers。Rename 后，ALL skills 都以 `ce-` 开头，因此 prefix-based detection 会失效，需要改为 frontmatter-field-based detection。
- `docs/solutions/skill-design/beta-skills-framework.md` - 验证 rename 后 stale cross-references 会造成 routing bugs。Rename 后必须搜索所有 SKILL.md files 中的 old names。

## 关键技术决策

- **Codex canonical skill detection via frontmatter field**: Rename 后，`startsWith("ce-")` 会匹配 ALL skills。与其使用 hardcoded allowlist（fragile、poor discoverability），不如向 8 个 workflow SKILL.md frontmatter files 添加 `codex-prompt: true`，扩展 `ClaudeSkill` type 加 `codexPrompt?: boolean`，并在 `loadSkills()` 中 parse。Converter 随后检查 `skill.codexPrompt === true`，而不是 name patterns。这遵循 codebase grain（parser 已提取 frontmatter fields），并在复制 workflow skill templates 时自然传播。New workflow skills discoverable，因为 field 就在 skill definition 处。
- **`workflows:` alias mapping**: `toCanonicalWorkflowSkillName()` 当前从 `workflows:plan` 生成 `ce:plan`。更新为生成 `ce-plan`。`isDeprecatedCodexWorkflowAlias()` check（`startsWith("workflows:")`）不受影响。
- **Converter content-transformation is idempotent — no other converter code changes needed**: 所有 6 个带 slash-command rewriting 的 converters（Windsurf、Droid、Kiro、Copilot、Pi、Codex）都使用 generic `normalizeName()`，通过 `.replace(/[:\s]+/g, "-")` 将 colons 替换为 hyphens。因此 `/ce:plan` 和 `/ce-plan` 都 normalize 为 `ce-plan`，输出 identical。4 个无 slash-command rewriting 的 converters（OpenClaw、Qwen、OpenCode、Gemini）会 pass skill content through untransformed。只需要更新 Codex 的 `isCanonicalCodexWorkflowSkill()` function。
- **Droid converter behavioral change (expected, beneficial)**: Droid 的 `flattenCommandName()` 会 strip last colon 前的所有内容：`/ce:plan` -> `/plan`。Rename 后，`/ce-plan` 无 colon，因此 pass through 为 `/ce-plan`。这会在 Droid target output 中保留 `ce-` prefix，是 improvement。无需 code change，content change 会自动产生该效果。
- **Test fixture strategy**: 测试 compound-engineering-specific behavior 的 fixtures（Codex prompt wrappers、review skill contracts）更新为 `ce-plan`。测试 abstract colon handling 的 fixtures（path-sanitization）改为 non-CE names，例如 `other:skill`，以保留 colon path coverage。
- **Agent rename in place (no flattening)**: 保留 category subdirs 以组织文件。Agent files 在 category dir 内加 `ce-` prefix：`agents/review/adversarial-reviewer.md` -> `agents/review/ce-adversarial-reviewer.md`。References drop `compound-engineering:` plugin prefix，但保留 category：`compound-engineering:review:adversarial-reviewer` -> `review:ce-adversarial-reviewer`。
- **Major version bump**: 这是影响所有用户的 breaking change；plugin version 将 major bump 以 signal。
- **git mv required**: 按 requirements，所有 renames 使用 `git mv` 以 preserve history。Fallback only with notification。
- **Single atomic commit**: 所有 directory renames、content changes、code changes 和 test updates 放在一个 commit 中。Intermediate states 会导致 broken tests 和 stale references。

## 开放问题

### 规划期间已解决

- **Codex `isCanonicalCodexWorkflowSkill` fix strategy**: 使用 `codex-prompt: true` frontmatter field，而不是 prefix check 或 hardcoded allowlist。遵循 codebase grain、self-documenting，并会通过 skill template copying 自然传播。
- **Other converter content-transformation**: 已验证所有 6 个带 slash-command rewriting 的 converters 使用 generic `normalizeName()`，对 colon/hyphen idempotent。除了 Codex `isCanonicalCodexWorkflowSkill` 外，无需 code changes。
- **Commit strategy**: Single commit。PR 是 review artifact。
- **Test fixtures for colon handling**: 将 path-sanitization tests 中的 `ce:plan` examples 改为 `other:skill`，使 colon sanitization 仍被测试，且不依赖 CE skill names。
- **`/sync` stale reference in README**: 在 documentation pass 中清理。
- **Cross-reference scope：** exhaustive inventory 找到 24 个 files，跨 7 种 reference patterns 约 100+ replacements（见 Unit 3）。

### 推迟到实现阶段

- AGENTS.md 中 "Why `ce-`?" rationale rewrite 的 exact wording，取决于所有 name changes 后 surrounding context 的阅读效果
- 是否还有除已识别 5 个外的 agent files 含 skill name references；implementer 应 comprehensive grep

## 实现单元

- [ ] **Unit 1：Skill directory renames（skill 目录重命名）**

**目标：** 通过 `git mv` 重命名全部 29 个需要新名字的 skill directories。

**需求：** R1, R3, R4, R5, R8

**依赖：** 无（first unit）

**文件：**
- `git mv` `plugins/compound-engineering/skills/` 下 29 个 directories：
  - 4 个 git-* replacements: `git-commit/` -> `ce-commit/`, `git-commit-push-pr/` -> `ce-commit-push-pr/`, `git-worktree/` -> `ce-worktree/`, `git-clean-gone-branches/` -> `ce-clean-gone-branches/`
  - 1 个 normalization: `report-bug-ce/` -> `ce-report-bug/`
  - 24 个 prefix additions: `agent-native-architecture/` -> `ce-agent-native-architecture/`, `agent-native-audit/` -> `ce-agent-native-audit/`, `andrew-kane-gem-writer/` -> `ce-andrew-kane-gem-writer/`, `changelog/` -> `ce-changelog/`, `claude-permissions-optimizer/` -> `ce-claude-permissions-optimizer/`, `deploy-docs/` -> `ce-deploy-docs/`, `dhh-rails-style/` -> `ce-dhh-rails-style/`, `document-review/` -> `ce-document-review/`, `dspy-ruby/` -> `ce-dspy-ruby/`, `every-style-editor/` -> `ce-every-style-editor/`, `feature-video/` -> `ce-feature-video/`, `frontend-design/` -> `ce-frontend-design/`, `gemini-imagegen/` -> `ce-gemini-imagegen/`, `onboarding/` -> `ce-onboarding/`, `orchestrating-swarms/` -> `ce-orchestrating-swarms/`, `proof/` -> `ce-proof/`, `reproduce-bug/` -> `ce-reproduce-bug/`, `resolve-pr-feedback/` -> `ce-resolve-pr-feedback/`, `setup/` -> `ce-setup/`, `test-browser/` -> `ce-test-browser/`, `test-xcode/` -> `ce-test-xcode/`, `todo-create/` -> `ce-todo-create/`, `todo-resolve/` -> `ce-todo-resolve/`, `todo-triage/` -> `ce-todo-triage/`
- 8 个 `ce:` skills 不需要 directory rename（dirs already use hyphens: `ce-brainstorm/`, `ce-plan/`, etc.）

**方法：**
- 顺序执行所有 `git mv` operations
- 4 个 excluded skills 保持：`agent-browser/`、`rclone/`、`lfg/`、`slfg/`

**验证：**
- 全部 41 个 skill directories 以正确 names 存在
- `git status` 显示 29 个 renames tracked

---

- [ ] **Unit 1b：Agent file renames（原地重命名 agent 文件）**

**目标：** 在现有 category subdirs 内，为全部 49 个 agent files 加 `ce-` prefix。

**需求：** R1, R3, R8

**依赖：** 无（可与 Unit 1 parallel）

**文件：**
- 在 category subdirs 内 `git mv` 49 个 agent files：`agents/<category>/<name>.md` -> `agents/<category>/ce-<name>.md`
- 保留 category subdirs：`design/`、`docs/`、`document-review/`、`research/`、`review/`、`workflow/`

**方法：**
- 对每个 agent file 执行：`git mv agents/<category>/<name>.md agents/<category>/ce-<name>.md`
- 49 个完整 mappings 见 requirements doc 中的 complete agent rename map

**验证：**
- category subdirs 下有 49 个 `ce-*.md` files
- Category directory structure 不变
- `git status` 显示 49 个 renames tracked

---

- [ ] **Unit 2：Frontmatter and description updates（frontmatter 与 description 更新）**

**目标：** 更新全部 37 个 renamed skills 的 `SKILL.md` 中 `name:` 和 `description:` fields。向 8 个 workflow skills 添加 `codex-prompt: true`。

**需求：** R1, R2, R3, R4, R5, R8, R9, R17

**依赖：** Unit 1（directories exist at new paths）

**文件：**
- Modify（修改）: renamed skill directories 中全部 37 个 `SKILL.md` files
  - 8 个 `ce:` skills: frontmatter 中 `name: ce:X` 改为 `name: ce-X`
  - 29 个 others: `name: X` 改为 `name: ce-X`（按 appropriate prefix rule）
  - 更新引用 old skill names 的 `description:` fields（confirmed: `ce-work-beta` references "ce:work"，`setup` references "ce:review"，`ce-plan` references "ce:brainstorm"）
  - 为 8 个 workflow skills frontmatter blocks 添加 `codex-prompt: true`: `ce-brainstorm`, `ce-compound`, `ce-compound-refresh`, `ce-ideate`, `ce-plan`, `ce-review`, `ce-work`, `ce-work-beta`

**方法：**
- 对每个 SKILL.md，edit YAML frontmatter `name:` field
- 搜索每个 `description:` field 中 old skill names 的 references 并更新
- 将 `codex-prompt: true` field 添加到 8 个 workflow skill frontmatter blocks
- 使用 requirements doc 中的 rename map 作为 authoritative mapping

**遵循模式：**
- Frontmatter format（frontmatter 格式）：`name: ce-plan`（no colons）
- 保持 `description:` prose style 与 existing descriptions 一致

**测试场景：**
- 每个 SKILL.md 都有与其 directory name 匹配的 `name:` field
- 无 `name:` field 包含 colon character
- 正好 8 个 SKILL.md files 带 `codex-prompt: true`

**验证：**
- `grep -r "^name: ce:" plugins/compound-engineering/skills/` 返回 zero results
- 每个 `name:` matches containing directory name
- `grep -rl "codex-prompt: true" plugins/compound-engineering/skills/` 返回 exactly 8 files

---

- [ ] **Unit 3：Intra-skill cross-reference updates（skill 内 cross-reference 更新）**

**目标：** 更新 SKILL.md content 内所有 skill-to-skill references（不包括 frontmatter）。Exhaustive inventory: 20 个 SKILL.md files，7 种 reference patterns，约 100+ individual replacements。

**需求：** R9, R12

**依赖：** Unit 2

**文件：**
- Modify（20 个含 cross-references 的 SKILL.md files）：
  - `skills/ce-plan/SKILL.md` - 约 8 个 `/ce:work` refs + 7 个 `document-review` backtick refs
  - `skills/ce-brainstorm/SKILL.md` - 约 12 个 `/ce:plan`, `/ce:work` refs + 1 个 `document-review` ref
  - `skills/ce-compound/SKILL.md` - 约 7 个 `/ce:compound-refresh`, `/ce:plan` refs
  - `skills/ce-ideate/SKILL.md` - `/ce:brainstorm`, `/ce:plan` refs
  - `skills/ce-review/SKILL.md` - routing table refs + 2 个 `todo-create` backtick refs
  - `skills/ce-work/SKILL.md` - `/ce:plan`, `/ce:review` + `skill: git-worktree` loader ref
  - `skills/ce-work-beta/SKILL.md` - 与 ce-work 相同 + `frontend-design` backtick ref
  - `skills/lfg/SKILL.md` - `/ce:plan`, `/ce:work`, `/ce:review` + `/compound-engineering:todo-resolve`, `:test-browser`, `:feature-video`
  - `skills/slfg/SKILL.md` - 与 lfg 相同 patterns
  - `skills/ce-worktree/SKILL.md` - `/ce:review`, `/ce:work` + 20 个 `${CLAUDE_PLUGIN_ROOT}/skills/git-worktree/` path refs + 2 个 `call git-worktree skill` self-refs
  - `skills/ce-todo-create/SKILL.md` - `/ce:review` + `todo-triage` backtick ref + `/todo-resolve`, `/todo-triage` slash refs
  - `skills/ce-todo-triage/SKILL.md` - `todo-create` backtick ref + 2 个 `/todo-resolve` slash refs
  - `skills/ce-todo-resolve/SKILL.md` - `/ce:compound` + 2 个 `.context/compound-engineering/todo-resolve/` scratch paths
  - `skills/ce-agent-native-audit/SKILL.md` - `/compound-engineering:agent-native-architecture` + bare name ref
  - `skills/ce-test-browser/SKILL.md` - `agent-browser` backtick ref + `todo-create` backtick ref + 4 个 `/test-browser` self-refs
  - `skills/ce-feature-video/SKILL.md` - 3 个 `agent-browser` backtick refs + 5 个 `/feature-video` self-refs + 11 个 `.context/compound-engineering/feature-video/` scratch paths
  - `skills/ce-reproduce-bug/SKILL.md` - `agent-browser` backtick ref
  - `skills/ce-frontend-design/SKILL.md` - `agent-browser` backtick ref
  - `skills/ce-report-bug/SKILL.md` - `/report-bug-ce` self-ref
  - `skills/ce-document-review/SKILL.md` - skill reference patterns（verify agent refs vs skill refs）

**方法：**
- 需要更新的七种 reference patterns：
  1. `/ce:X` -> `/ce-X`（workflow skills 的 slash command invocations）
  2. `ce:X` -> `ce-X`（workflow skills 无 slash 的 prose mentions）
  3. `/compound-engineering:X` -> `/compound-engineering:ce-X`（为获得 `ce-` prefix 的 skills 更新 fully-qualified skill refs，例如 `/compound-engineering:todo-resolve` -> `/compound-engineering:ce-todo-resolve`）
  4. `${CLAUDE_PLUGIN_ROOT}/skills/git-worktree/` -> `${CLAUDE_PLUGIN_ROOT}/skills/ce-worktree/`（intra-skill paths，skill 内路径）
  5. Backtick skill refs: `` `document-review` `` -> `` `ce-document-review` ``，`` `todo-create` `` -> `` `ce-todo-create` ``，`skill: git-worktree` -> `skill: ce-worktree` 等
  6. Self-referencing slash commands（自引用 slash commands）: `/test-browser` -> `/ce-test-browser`, `/feature-video` -> `/ce-feature-video`, `/todo-resolve` -> `/ce-todo-resolve`, `/report-bug-ce` -> `/ce-report-bug`
  7. Scratch space paths（scratch 空间路径）: `.context/compound-engineering/feature-video/` -> `.context/compound-engineering/ce-feature-video/`, `.context/compound-engineering/todo-resolve/` -> `.context/compound-engineering/ce-todo-resolve/`

**关键排除项 — do NOT update：**
- `agent-browser` references - 此 skill 被 excluded from renaming（R6, upstream）。许多 skills 以 `the \`agent-browser\` skill` 形式引用它；这些必须保持原样
- `rclone` references - 同样 excluded
- `lfg`/`slfg` references - excluded from renaming（R7），但其 internal refs 要更新

**Note:** Agent references 例如 `compound-engineering:review:code-simplicity-reviewer` **现在 in scope**（R11c）- 将在 Unit 3b 更新。

**测试场景：**
- `grep -r "/ce:" plugins/compound-engineering/skills/` returns zero results（排除 agent refs 如 `compound-engineering:category:agent` 后）
- lfg/slfg chains 引用 new skill names
- ce-worktree script paths 指向 `ce-worktree/` directory
- renamed skills 的 backtick patterns 中无 stale bare skill name references

**验证：**
- 任何 SKILL.md 中无 stale `/ce:` skill references
- 对 renamed skills，无 stale `/compound-engineering:todo-resolve`（无 `ce-` prefix）patterns
- 无 stale bare `document-review`, `todo-create`, `git-worktree` backtick refs（已替换为 `ce-` prefixed names）

---

- [ ] **Unit 3b：跨 skills 和 agents 更新 agent references**

**目标：** 更新 skills 和 agent files 中的全部 agent references。将 3-segment refs 的 `compound-engineering:` plugin prefix drop，保留 `<category>:ce-<agent>`。更新 agent frontmatter `name:` fields。

**需求：** R8, R11, R11b, R11c, R12

**依赖：** Unit 1b（agent files at new paths）

**文件：**
- Modify（修改）: 全部 49 个 agent `.md` files - 更新 frontmatter `name:` 为 `ce-<agent-name>`
- Modify（修改）: 所有以 `compound-engineering:<category>:<agent>` pattern 引用 agents 的 skill SKILL.md files（许多文件：ce-plan、ce-review、ce-brainstorm、ce-ideate、ce-document-review、ce-work、ce-work-beta、ce-orchestrating-swarms、ce-resolve-pr-feedback、lfg、slfg 等）
- Modify（修改）: 通过 fully-qualified names 引用其他 agents 的 agent files
- Modify（修改）: 可能引用 old format 的 agent `description:` frontmatter fields
- Modify（修改）: `project-standards-reviewer` agent - 其 review criteria 显式 enforce old 3-segment convention；需要 conceptual update

**方法：**
- 更新全部 49 个 agent frontmatter `name:` fields 为 `ce-<agent-name>`
- 在 ALL skill and agent files 中替换所有 `compound-engineering:<category>:<agent>` references 为 `<category>:ce-<agent>`。关键 patterns：
  1. `Task compound-engineering:<category>:<agent>` -> `Task <category>:ce-<agent>`（skills 中 Task tool invocations）
  2. `subagent_type: compound-engineering:<category>:<agent>` -> `subagent_type: <category>:ce-<agent>`（orchestrating-swarms 等）
  3. `` `compound-engineering:<category>:<agent>` `` -> `` `<category>:ce-<agent>` ``（prose 中 backtick references）
  4. fully-qualified agent names 的 bare prose mentions
- Agent files 中引用 skill names 的部分由 Unit 6 处理；但引用 OTHER agents 的 old names 在这里更新
- 按 R12 更新 lfg/slfg agent invocations
- 更新 `project-standards-reviewer` agent 的 review criteria，使其 enforce `<category>:ce-<agent>` format，而不是 `compound-engineering:<category>:<agent>`

**测试场景：**
- `grep -r "compound-engineering:" plugins/compound-engineering/skills/ plugins/compound-engineering/agents/` 对 agent references 返回 zero results（skill fully-qualified refs 如 `/compound-engineering:ce-todo-resolve` 仍可能存在）
- 每个 agent frontmatter `name:` 都以 `ce-` 开头

**验证：**
- active skill/agent files 中无 `compound-engineering:<category>:<agent>` references
- 全部 49 个 agent `name:` fields updated
- `project-standards-reviewer` enforce new naming convention

---

- [ ] **Unit 4：Codex converter and parser updates（Codex converter 与 parser 更新）**

**目标：** 将 Codex converter hardcoded `ce:` prefix logic 替换为 frontmatter-driven `codex-prompt` field。更新 parser 和 types 支持新 field。

**需求：** R17

**依赖：** Unit 2（8 个 workflow SKILL.md files 必须在 frontmatter 中有 `codex-prompt: true`）

**文件：**
- 修改：`src/types/claude.ts` - 将 `codexPrompt?: boolean` 添加到 `ClaudeSkill` type
- 修改：`src/parsers/claude.ts` - 在 `loadSkills()` 中从 frontmatter 提取 `codex-prompt`
- 修改：`src/converters/claude-to-codex.ts`
- 用 `skill.codexPrompt === true` check 替换 `isCanonicalCodexWorkflowSkill(name)`
- 更新 `toCanonicalWorkflowSkillName`，生成 `ce-` 而不是 `ce:`

**方法：**
- 将 `codexPrompt?: boolean` 添加到 `ClaudeSkill` type，放在 existing fields 如 `disableModelInvocation` 附近
- 在 `loadSkills()` 中从 frontmatter 提取 `codex-prompt`: `codexPrompt: data['codex-prompt'] === true`
- 在 Codex converter 中，将 `isCanonicalCodexWorkflowSkill` 改为接受 skill object（而不只是 name），并检查 `skill.codexPrompt === true`。这可能需要调整 call sites，传 full skill 而不是 `skill.name`
- 更新 `toCanonicalWorkflowSkillName` 生成 `ce-` prefix: `ce-${name.slice("workflows:".length)}`
- `isDeprecatedCodexWorkflowAlias` function（`startsWith("workflows:")`）无需 change
- 无需其他 converter code changes - 其他 content transformations 对 colon/hyphen 均 idempotent

**遵循模式：**
- `src/parsers/claude.ts` 中 existing frontmatter field extraction pattern（见 `disableModelInvocation` extraction）
- `src/types/claude.ts` 中 existing `ClaudeSkill` type field pattern

**测试场景：**
- 带 `codex-prompt: true` 的 skill 被识别为 workflow skill
- 无该 field（或 `codex-prompt: false`）的 skill 不是 workflow skill
- `toCanonicalWorkflowSkillName("workflows:plan")` 返回 `"ce-plan"`
- 真实 plugin 中 8 个 workflow skills parse 后全部有 `codexPrompt: true`

**验证：**
- Codex converter 通过 frontmatter field 正确识别 8 个 canonical workflow skills
- `workflows:*` aliases map 到 `ce-*` names
- Converter code 中不再有 hardcoded skill name checks

---

- [ ] **Unit 5：Test fixture updates（测试 fixture 更新）**

**目标：** 更新所有 hardcoded skill names 的 test files，以反映新 `ce-` prefix。

**需求：** R14, R15, R18

**依赖：** Unit 4（converter changes affect test expectations）

**文件：**
- 修改（compound-engineering specific fixtures - update to `ce-plan`）：
  - `tests/codex-converter.test.ts` - 约 10 个 fixtures with `ce:plan`, `ce:brainstorm`
  - `tests/codex-writer.test.ts` - 约 5 个 fixtures
- `tests/review-skill-contract.test.ts` - `/ce:review` 的 string assertions
- `tests/compound-support-files.test.ts` - describe label
- `tests/release-metadata.test.ts` - mkdir and file content
- `tests/release-components.test.ts` - commit message parsing
- `tests/release-preview.test.ts` - title fixture
  - Writer tests（都有 `ce:plan` fixtures）: `tests/kiro-writer.test.ts`, `tests/pi-writer.test.ts`, `tests/droid-writer.test.ts`, `tests/gemini-writer.test.ts`, `tests/copilot-writer.test.ts`, `tests/windsurf-writer.test.ts`
- `tests/windsurf-converter.test.ts` - collision dedup fixture
- `tests/copilot-converter.test.ts` - collision detection fixture
  - `tests/openclaw-converter.test.ts` - fixture
  - `tests/claude-home.test.ts` - frontmatter fixture
- 修改（abstract colon-handling - change to non-CE example）：
  - `tests/path-sanitization.test.ts` - 将 `ce:brainstorm`/`ce:plan` examples 改为 `other:skill`/`other:tool`，以保留 colon sanitization coverage
- 添加: `tests/path-sanitization.test.ts` 中的 assertion，确认无 CE skill name 包含 colon（R13 lint requirement）

**方法：**
- 对 CE-specific tests：机械替换 `ce:plan` 为 `ce-plan`，`ce:brainstorm` 为 `ce-brainstorm` 等
- 对 path-sanitization tests：将 CE examples 替换为 generic colon examples，以维持 `sanitizePathName()` colon path coverage
- 添加新 test case，加载 real plugin，并 assert 每个 skill 都满足 `!skill.name.includes(":")`

**测试场景：**
- 所有 existing test assertions 在新 fixture values 下仍 pass
- Path sanitization test 仍覆盖 colon-to-hyphen conversion（使用 non-CE example）
- 新 no-colon invariant test passes

**验证：**
- `bun test` passes with zero failures

---

- [ ] **Unit 6：Agent files 中的 skill-name references**

**目标：** 更新 agent `.md` files 中对 old patterns（`/ce:plan`、bare `git-worktree` 等）的 skill name references。Agent files 在 Unit 1b 后位于 `agents/ce-*.md`。

**需求：** R11

**依赖：** Unit 1b（agent files at new paths）、Unit 3b（agent frontmatter and agent-to-agent refs already done）

**文件：**
- Modify（含 skill name references 的 agent files - paths reflect post-rename location）：
  - `plugins/compound-engineering/agents/research/ce-git-history-analyzer.agent.md` - references `/ce:plan`
  - `plugins/compound-engineering/agents/research/ce-issue-intelligence-analyst.agent.md` - references `/ce:ideate`
  - `plugins/compound-engineering/agents/research/ce-learnings-researcher.agent.md` - references `/ce:plan`
  - `plugins/compound-engineering/agents/review/ce-code-simplicity-reviewer.agent.md` - references `/ce:plan`, `/ce:work`
  - `plugins/compound-engineering/agents/research/ce-best-practices-researcher.agent.md` - references `agent-native-architecture`, `git-worktree` bare names（now `ce-agent-native-architecture`, `ce-worktree`）
  - `bug-reproduction-validator` workflow agent reference - excluded，无需 change，只 verify
- Comprehensive grep 寻找其他含 old skill references 的 agent files

**方法：**
- 在 skill slash-command references 中，将 `/ce:X` 替换为 `/ce-X`
- 在 prose 中将 bare old skill names 替换为 `ce-` prefixed names
- 不更新 `agent-browser` references（R6 excluded）

**验证：**
- `grep -r "/ce:" plugins/compound-engineering/agents/` 返回 zero results
- 无 agent file 引用 old skill names（except excluded `agent-browser`）

---

- [ ] **Unit 7：Documentation updates（文档更新）**

**目标：** 更新 active documentation，以反映 new skill AND agent names。重写 naming convention rationale。将 agent reference convention 从 3-segment 更新为 flat `ce-` format。

**需求：** R10

**依赖：** Unit 1, Unit 1b（all names finalized）

**文件：**
- 修改：`plugins/compound-engineering/README.md` - skill tables、agent references
- 修改：`plugins/compound-engineering/AGENTS.md` - command listing、"Why `ce:`?" section 需要 full conceptual rewrite，解释 skills and agents 的 `ce-` convention；agent reference convention section（从 `compound-engineering:<category>:<agent>` 改为 `<category>:ce-<agent>`）
- 修改：`README.md`（root）- Workflow table、prose references、Codex output notes。清理 stale `/sync` reference。
- 修改：`AGENTS.md`（root）- 如存在 agent reference convention，则更新

**方法：**
- Skill tables：mechanical find-and-replace `/ce:X` -> `/ce-X` 和 bare skill names
- Agent references：将所有 `compound-engineering:<category>:<agent>` examples 更新为 `<category>:ce-<agent>`
- AGENTS.md：重写 naming convention section，解释 skills 和 agents 统一 `ce-` prefix；更新 "Agent References in Skills" section，反映新的 `<category>:ce-<agent>` format（原为 `compound-engineering:<category>:<agent>`）
- Root README：更新 tables，并移除 stale `/sync` skill reference
- 不更新 `docs/brainstorms/`、`docs/plans/`、`docs/solutions/` 中 historical docs

**验证：**
- Active docs 中无 old `ce:` skill names 或 `compound-engineering:<category>:<agent>` agent patterns
- AGENTS.md rationale section coherently 解释 skills 和 agents 的 `ce-` convention
- Agent reference convention 从 `compound-engineering:<category>:<agent>` 更新为 `<category>:ce-<agent>`

---

- [ ] **Unit 8：Verification sweep and commit（验证扫尾与 commit）**

**目标：** 最终验证 skills AND agents 都没有 stale references，所有 tests pass，release validation succeeds。

**需求：** R14, R15, R16, R19

**依赖：** 所有 previous units

**文件：**
- 无 new files

**方法：**
- 对整个 repo 运行 stale SKILL names 的 comprehensive grep：
  - `grep -r "ce:brainstorm\|ce:plan\|ce:review\|ce:work\|ce:ideate\|ce:compound" plugins/ src/ tests/`（historical docs 外应返回 zero）
  - `grep -r "/git-commit\b\|/git-worktree\b\|/git-clean-gone\|/report-bug-ce\b" plugins/`（应返回 zero）
  - `grep -r "/compound-engineering:todo-resolve\b\|/compound-engineering:test-browser\b\|/compound-engineering:feature-video\b\|/compound-engineering:setup\b" plugins/`（应返回 zero）
- 对 stale AGENT references 运行 comprehensive grep：
  - `grep -r "compound-engineering:review:\|compound-engineering:research:\|compound-engineering:design:\|compound-engineering:workflow:\|compound-engineering:document-review:\|compound-engineering:docs:" plugins/ src/ tests/`（应返回 zero - all converted to `ce-<agent>`）
- Verify category subdirs 中 no agent files remain
- 运行 `bun test`
- 运行 `bun run release:validate`
- 修复发现的任何 stragglers
- 将所有 changes 放入 single commit

**验证：**
- `bun test` passes with zero failures
- `bun run release:validate` passes
- Active code（plugins/, src/, tests/）中无 stale skill 或 agent name references
- 无 3-segment agent references remain

## 系统级影响

- **Interaction graph:** Skill-to-skill handoff chains（`brainstorm` -> `plan` -> `work` -> `review`）是主要 interaction surface。lfg/slfg orchestrate 这些 chains。Skills 通过 `Task` 或 `subagent_type` dispatch agents - 这些从 `compound-engineering:<category>:<agent>` 改为 `<category>:ce-<agent>`。所有 handoff 和 dispatch references 必须使用 new names。
- **Error propagation:** 漏掉 cross-reference 会导致 runtime skill invocation fail with "skill not found"。Unit 8 的 grep-based verification 是主要防线。
- **State lifecycle risks:** `.context/compound-engineering/ce-review/` 中现有 scratch directories 不受影响（已使用 hyphens）。Renamed skills 的 scratch dirs（例如 `feature-video/` -> `ce-feature-video/`）会开始创建新路径；旧 runs 留下的 orphaned scratch dirs harmless 且 ephemeral。
- **Converter content-transformation (verified safe):** 所有 6 个带 slash-command rewriting 的 converters（Windsurf、Droid、Kiro、Copilot、Pi、Codex）使用 generic `normalizeName()`，对 colon/hyphen idempotent - `/ce:plan` 和 `/ce-plan` 都产生 `ce-plan`。4 个无 content transformation 的 converters（OpenClaw、Qwen、OpenCode、Gemini）pass content through unmodified。只有 Codex 的 `isCanonicalCodexWorkflowSkill()` function 需要 code changes。
- **Droid target behavioral change:** Droid 的 `flattenCommandName()` 会 strip last colon 前全部内容：`/ce:plan` -> `/plan`。Rename 后，`/ce-plan` 无 colon，因此 pass through 为 `/ce-plan`。这在 Droid target output 中保留 `ce-` prefix - 是 improvement，无需 code change。
- **API surface parity:** 对 CE skills，`sanitizePathName()` 变成 no-op，但仍对可能使用 colons 的其他 plugins functional。
- **Integration coverage:** `tests/path-sanitization.test.ts` 中 collision detection test 加载 real plugin - 将验证 rename 后 sanitized skills 不 collide。

## 风险与依赖

- **Very large diff size**: 29 个 skill directory renames + 49 个 agent file renames + 70+ files content changes。Mitigation: single commit with clear commit message；PR description with summary table。
- **Agent reference blast radius**: 3-segment `compound-engineering:<category>:<agent>` references 出现在许多 skill files（ce-plan、ce-review、ce-brainstorm、ce-ideate、ce-document-review、ce-work、ce-orchestrating-swarms、ce-resolve-pr-feedback、lfg、slfg）。全部必须更新为 `ce-<agent>`。Mitigation: Unit 8 comprehensive grep verification。
- **Missed cross-references**: 7+ distinct reference patterns across skills，加上 agent reference patterns。Mitigation: deepening 中建立 exhaustive skill inventory；对 skills 和 agents 做 grep-based verification。
- **Codex converter behavioral change**: 从 prefix-based 转为 frontmatter-field-based detection。Mitigation: explicit test scenarios；field self-documenting 且遵循 existing codebase patterns。
- **`agent-browser` exclusion discipline**: 许多 skills 引用 `the \`agent-browser\` skill` - 这些不得更新，因为 agent-browser excluded（R6）。Mitigation: Unit 3 approach notes 中有 explicit exclusion list。
- **User muscle memory**: `/ce:plan` 停止工作；`compound-engineering:review:adversarial-reviewer` format 停止工作。Mitigation: clean break intentional；major version bump signals the change。

## 来源与参考

- **Origin document（来源文档）：** [docs/brainstorms/2026-03-27-ce-skill-prefix-rename-requirements.md](docs/brainstorms/2026-03-27-ce-skill-prefix-rename-requirements.md)
- Related issue（相关 issue）：[#337](https://github.com/EveryInc/compound-engineering-plugin/issues/337)
- Related learning（相关 learning）：`docs/solutions/integrations/colon-namespaced-names-break-windows-paths.md`
- Related learning（相关 learning）：`docs/solutions/codex-skill-prompt-entrypoints.md`
- Related learning（相关 learning）：`docs/solutions/skill-design/beta-skills-framework.md`
