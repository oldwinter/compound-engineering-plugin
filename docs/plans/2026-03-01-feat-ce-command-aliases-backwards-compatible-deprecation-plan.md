---
title: "feat: 添加 ce:* command aliases，并向后兼容地 deprecate workflows:*"
type: feat
status: complete
date: 2026-03-01
---

# feat: 添加 `ce:*` Command Aliases，并 backward-compatible deprecate `workflows:*`

## 概览

将五个 `workflows:*` commands rename 为 `ce:*`，让它们更清楚地属于 compound-engineering。保留 `workflows:*` 可用，作为 thin deprecation wrappers，向用户 warning 并 forward 到 new commands。

## 问题陈述 / 动机

当前 `workflows:plan`、`workflows:work`、`workflows:review`、`workflows:brainstorm` 和 `workflows:compound` commands 使用 `workflows:` prefix -- 这是 generic namespace，不能 signal 其来源。用户不会立刻把它们与 compound-engineering plugin 关联起来。

`ce:` prefix 更短、更 memorable，并且明确标识它们是 compound-engineering commands -- 这与其他 plugin commands 已使用 `compound-engineering:` 作为 namespace 的方式一致。

## 提议方案

### 1. 创建新的 `ce:*` Commands（Primary）

创建 `commands/ce/` directory，包含五个 new command files。每个 file 从当前 `workflows:*` counterpart 获取完整 implementation content，并将 `name:` frontmatter 更新为 new name。

| New Command | Source Content |
|-------------|---------------|
| `ce:plan` | `commands/workflows/plan.md` |
| `ce:work` | `commands/workflows/work.md` |
| `ce:review` | `commands/workflows/review.md` |
| `ce:brainstorm` | `commands/workflows/brainstorm.md` |
| `ce:compound` | `commands/workflows/compound.md` |

### 2. 将 `workflows:*` 转为 Deprecation Wrappers（向后兼容）

用 thin wrapper 替换每个 `workflows:*` command 的完整内容：
1. 向用户显示 visible deprecation warning
2. 用同样 `$ARGUMENTS` invoke new `ce:*` command

Example wrapper body（wrapper body 示例）:

```markdown
---
name: workflows:plan
description: "[DEPRECATED] Use /ce:plan instead. Renamed for clarity."
argument-hint: "[feature description]"
---

> ⚠️ **Deprecated:** `/workflows:plan` has been renamed to `/ce:plan`.
> Please update your workflow to use `/ce:plan` instead.
> This alias will be removed in a future version.

/ce:plan $ARGUMENTS
```

### 3. 更新所有内部引用

grep 显示 `workflows:*` 的 references **远多于** `lfg`/`slfg`。以下全部必须更新为指向 new `ce:*` names：

**Orchestration commands（更新为 new names）:**
- `commands/lfg.md` -- `/workflows:plan`、`/workflows:work`、`/workflows:review`
- `commands/slfg.md` -- `/workflows:plan`、`/workflows:work`、`/workflows:review`

**会 cross-reference 的 command bodies（更新为 new names）:**
- `commands/workflows/brainstorm.md` -- 多次引用 `/workflows:plan`（它会变成 deprecated wrapper，所以应 forward 到 `/ce:plan`）
- `commands/workflows/compound.md` -- self-references 和 `/workflows:plan` references
- `commands/workflows/plan.md` -- 多次引用 `/workflows:work`
- `commands/deepen-plan.md` -- 引用 `/workflows:work`、`/workflows:compound`

**Agents（更新为 new names）:**
- `agents/review/code-simplicity-reviewer.md` -- 引用 `/workflows:plan` 和 `/workflows:work`
- `agents/research/git-history-analyzer.md` -- 引用 `/workflows:plan`
- `agents/research/learnings-researcher.md` -- 引用 `/workflows:plan`

**Skills（更新为 new names）:**
- `skills/document-review/SKILL.md` -- 引用 `/workflows:brainstorm`、`/workflows:plan`
- `skills/git-worktree/SKILL.md` -- 广泛引用 `/workflows:review`、`/workflows:work`
- `skills/ce-setup/SKILL.md` -- 引用 `/workflows:review`、`/workflows:work`
- `skills/brainstorming/SKILL.md` -- 多次引用 `/workflows:plan`
- `skills/file-todos/SKILL.md` -- 引用 `/workflows:review`

**其他 commands（更新为 new names）:**
- `commands/test-xcode.md` -- 引用 `/workflows:review`

**Historical docs（保持原样 -- 有意记录 old names）:**
- `docs/plans/*.md` -- old plan files，historical record
- `docs/brainstorms/*.md` -- historical
- `docs/solutions/*.md` -- historical
- `tests/fixtures/` -- converter 的 test fixtures（故意使用 `workflows:*` 测试 namespace handling）
- `CHANGELOG.md` historical entries -- 不 rewrite history

### 4. 更新文档

- `CHANGELOG.md` -- 添加 new entry，记录 rename 和 deprecation
- `plugins/compound-engineering/README.md` -- 更新 command table，列出 `ce:*` as primary，并注明 `workflows:*` 是 deprecated aliases
- `plugins/compound-engineering/CLAUDE.md` -- 更新 command listing 和 "Why `workflows:`?" section
- Root `README.md` -- 更新 command table（lines 133-136）

### 5. Converter / bunx Install Script 注意事项

`bunx` install script（`src/commands/install.ts`）**只写 files，从不 delete**。这有两个 implications：

**Now（deprecated wrappers 存在期间）:** 没有 stale file problem。该 change 后运行 `bunx install compound-engineering --to gemini` 会：
- 写入 `commands/ce/plan.toml`（new primary）
- 写入 `commands/workflows/plan.toml`（deprecated wrapper，带 deprecation content）

两者正确 coexist。用户重新 run install 会得到两者。

**Future（deprecated wrappers 最终删除时）:** 旧 `commands/workflows/` files 会在用户 converted targets 中 remain stale。那时需要 cleanup step -- 例如：
- Manual instructions（手动说明）: "Delete `.gemini/commands/workflows/` after upgrading"
- OR 在 install script 中加入 cleanup pass，删除 known-renamed command directories

目前只需在 plan 中记录：当 `workflows:*` wrappers 最终 drop 时，stale cleanup 是 known future concern。

## 技术注意事项

### Command Naming（命名）

`ce:` prefix 映射到 `commands/ce/` directory。这遵循现有 convention：`workflows:plan` 映射到 `commands/workflows/plan.md`。

### Deprecation Warning Display（弃用警告显示）

由于 commands 由 Claude 执行，wrapper body 中的 deprecation message 会在新 command 运行前作为 Claude response 展示给用户。`>` blockquote markdown 会渲染为 styled callout。

deprecated wrappers **不应** 使用 `disable-model-invocation: true` -- Claude 需要 process body 来显示 warning 并 invoke new command。

### Deprecation Wrapper Mechanism（弃用 wrapper 机制）

deprecated wrappers **必须** 使用 `disable-model-invocation: true`。这与 `lfg.md` 使用的 mechanism 相同 -- CLI runtime 解析 body 并直接执行 slash command invocations。没有它，Claude 会把 body 当成 text 读取，无法真正 invoke `/ce:plan`。

wrapper body 中的 deprecation notice 会变成 printed note（与 `lfg` step descriptions 相同），不是 styled Claude response。这可以接受 -- 它仍传达 message。

### Context Token Budget（context token 预算）

5 个 new `ce:*` commands 会向 context budget 添加 descriptions。保持 descriptions short（under 120 chars）。5 个 deprecated `workflows:*` wrappers 使用 minimal descriptions（tagged as deprecated），以最小化 budget impact。

### Count Impact（数量影响）

Command count 保持 22（5 new `ce:*` + 5 updated `workflows:*` wrappers = net zero change）。counts 不需要 version bump。

## 验收标准

- [ ] 创建 `commands/ce/` directory，包含 5 个 new command files
- [ ] 每个 `ce:*` command 包含来自其 `workflows:*` counterpart 的完整 implementation
- [ ] 每个 `ce:*` command frontmatter `name:` field 设置为 `ce:plan`、`ce:work` 等
- [ ] 每个 `workflows:*` command 替换为 thin deprecation wrapper
- [ ] Deprecation wrapper 显示清晰 ⚠️ warning，包含 new command name
- [ ] Deprecation wrapper 用 `$ARGUMENTS` invoke new `ce:*` command
- [ ] `lfg.md` 更新为使用 `ce:plan`、`ce:work`、`ce:review`
- [ ] `slfg.md` 更新为使用 `ce:plan`、`ce:work`、`ce:review`
- [ ] 所有 agent `.md` files 更新（code-simplicity-reviewer、git-history-analyzer、learnings-researcher）
- [ ] 所有 skill `SKILL.md` files 更新（document-review、git-worktree、setup、brainstorming、file-todos）
- [ ] `commands/deepen-plan.md` 和 `commands/test-xcode.md` 更新
- [ ] `CHANGELOG.md` updated with deprecation notice（更新 deprecation notice）
- [ ] `plugins/compound-engineering/README.md` command table updated（更新 command table）
- [ ] `plugins/compound-engineering/CLAUDE.md` command listing updated（更新 command listing）
- [ ] Root `README.md` command table updated（更新 root `README.md` command table）
- [ ] Validate: `/ce:plan "test feature"` works end-to-end（端到端可用）
- [ ] Validate: `/workflows:plan "test feature"` shows deprecation warning and continues（显示 deprecation warning 并继续）
- [ ] Re-run `bunx install compound-engineering --to [target]` and confirm both `ce/` and `workflows/` output dirs are written correctly（重新运行并确认两个 output dirs 写入正确）

## 实施步骤

### Step 1: 创建 `commands/ce/` directory，包含 5 个 new files

对每个 command，copy source file，并只更新 `name:` frontmatter field：

- `commands/ce/plan.md` -- copy `commands/workflows/plan.md`, set `name: ce:plan`
- `commands/ce/work.md` -- copy `commands/workflows/work.md`, set `name: ce:work`
- `commands/ce/review.md` -- copy `commands/workflows/review.md`, set `name: ce:review`
- `commands/ce/brainstorm.md` -- copy `commands/workflows/brainstorm.md`, set `name: ce:brainstorm`
- `commands/ce/compound.md` -- copy `commands/workflows/compound.md`, set `name: ce:compound`

### Step 2: 用 deprecation wrappers 替换 `commands/workflows/*.md`

使用 `disable-model-invocation: true`，让 CLI runtime 直接 invoke `/ce:<command>`。deprecation note 作为 step description printed。

每个 wrapper 的 template:

```markdown
---
name: workflows:<command>
description: "[DEPRECATED] Use /ce:<command> instead — renamed for clarity."
argument-hint: "[...]"
disable-model-invocation: true
---

NOTE: /workflows:<command> is deprecated. Please use /ce:<command> instead. This alias will be removed in a future version.

/ce:<command> $ARGUMENTS
```

### Step 3: 更新所有内部 references

**Orchestration commands（编排 commands）:**
- `commands/lfg.md` -- replace `/workflows:plan`, `/workflows:work`, `/workflows:review`
- `commands/slfg.md` -- same

**Command bodies（command body 文案）:**
- `commands/deepen-plan.md` -- replace `/workflows:work`, `/workflows:compound`
- `commands/test-xcode.md` -- replace `/workflows:review`
- deprecated `workflows/brainstorm.md`、`workflows/compound.md`、`workflows/plan.md` wrappers -- body text 中指向其他 `workflows:*` commands 的 references 也应更新为 `ce:*`（因为用户阅读它们时应看到 new names）

**Agents（agent 文案）:**
- `agents/review/code-simplicity-reviewer.md`
- `agents/research/git-history-analyzer.md`
- `agents/research/learnings-researcher.md`

**Skills（skill 文案）:**
- `skills/document-review/SKILL.md`
- `skills/git-worktree/SKILL.md`
- `skills/ce-setup/SKILL.md`
- `skills/brainstorming/SKILL.md`
- `skills/file-todos/SKILL.md`

### Step 4: 更新 documentation

**`plugins/compound-engineering/CHANGELOG.md`** -- Add under new version section（添加到新 version section 下）:
```
### Changed
- `workflows:plan`, `workflows:work`, `workflows:review`, `workflows:brainstorm`, `workflows:compound` renamed to `ce:plan`, `ce:work`, `ce:review`, `ce:brainstorm`, `ce:compound` for clarity

### Deprecated
- `workflows:*` commands — use `ce:*` equivalents instead. Aliases remain functional and will be removed in a future version.
```

**`plugins/compound-engineering/README.md`** -- 更新 commands table，列出 `ce:*` as primary，并显示 `workflows:*` as deprecated aliases。

**`plugins/compound-engineering/CLAUDE.md`** -- 更新 command listing 和 "Why `workflows:`?" section，反映 new `ce:` namespace。

**Root `README.md`** -- 更新 command table（lines 133-136）。

### Step 5: 验证 converter output

更新后，重新运行 bunx install script，确认两个 targets 都被写出：

```bash
bunx @every-env/compound-plugin install compound-engineering --to gemini --output /tmp/test-output
ls /tmp/test-output/.gemini/commands/
# Should show both: ce/ and workflows/
```

`workflows/` output 会包含 deprecation wrapper content。`ce/` output 会有 full implementation。

**Future cleanup note:** 当 `workflows:*` wrappers 最终移除时，用户必须手动删除 converted targets 中 stale `workflows/` directories（`.gemini/commands/workflows/`、`.codex/commands/workflows/` 等）。届时考虑在 CHANGELOG 中添加 migration note。

### Step 6: 运行 `/release-docs` 更新 docs site

## 依赖与风险

- **风险:** 用户在 CLAUDE.md files 或 scripts 中保存了 `workflows:*` commands references。**缓解:** deprecation wrappers 继续 indefinitely functional。
- **风险:** Context token budget 略增（5 个 new command descriptions）。**缓解:** 保持所有 descriptions short。Deprecated wrappers 使用 minimal descriptions。
- **风险:** 如果 update partial，`lfg`/`slfg` orchestration break。**缓解:** 在同一 commit 更新两者。

## 来源与参考

- Existing commands（现有 commands）: `plugins/compound-engineering/commands/workflows/*.md`
- Orchestration commands（编排 commands）: `plugins/compound-engineering/commands/lfg.md`, `plugins/compound-engineering/commands/slfg.md`
- Plugin metadata（plugin 元数据）: `plugins/compound-engineering/.claude-plugin/plugin.json`
- Changelog（变更日志）: `plugins/compound-engineering/CHANGELOG.md`
- README（README 文档）: `plugins/compound-engineering/README.md`
