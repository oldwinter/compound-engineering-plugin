---
title: "refactor: 将 dspy-ruby skill 更新到 DSPy.rb v0.34.3 API"
type: refactor
date: 2026-02-09
---

# 将 dspy-ruby Skill 更新到 DSPy.rb v0.34.3 API

## 问题

`dspy-ruby` skill 使用了过时 API patterns（`.forward()`、`result[:field]`、inline `T.enum([...])`、`DSPy::Tool`），并缺少 10+ 项 features（events、lifecycle callbacks、GEPA、evaluation framework、BAML/TOON、storage 等）。

## 解决方案

以 engineering skill 为基础（它已经使用正确 API），用 official docs content 增强，并重写所有 reference files 和 templates。

### Source Priority（来源优先级，发生冲突时）

1. **Official docs** (`../dspy.rb/docs/src/`) — API correctness 的 source of truth（正确性的真源）
2. **Engineering skill** (`../engineering/.../dspy-rb/SKILL.md`) — structure/style 的 source of truth（结构与风格的真源）
3. **NavigationContext brainstorm** — 仅用于 Typed Context pattern

## 待更新文件

### Core（核心，SKILL.md）

1. **`skills/dspy-ruby/SKILL.md`** — 从 engineering base 复制，然后：
   - 修正 frontmatter：`name: dspy-rb` → `name: dspy-ruby`，保留长 description 格式
   - 在 "Guidelines for Claude" 前添加 sections：Events System、Lifecycle Callbacks、Fiber-Local LM Context、Evaluation Framework、GEPA Optimization、Typed Context Pattern、Schema Formats (BAML/TOON)
   - 使用 markdown links 更新 Resources section，包含 5 个 references + 3 个 assets
   - 将任何 backtick references 修正为 markdown link 格式

### References（references，按主题 doc batches 重写）

2. **`references/core-concepts.md`** — 重写
   - Source（来源）：`core-concepts/signatures.md`、`modules.md`、`predictors.md`、`advanced/complex-types.md`
   - 覆盖：signatures（Date/Time types、T::Enum、defaults、field descriptions、BAML/TOON、recursive types）、modules（.call() API、lifecycle callbacks、instruction update contract）、predictors（全部 4 种 types、concurrent predictions）、type system（discriminators、union types）

3. **`references/toolsets.md`** — 新增
   - Source（来源）：`core-concepts/toolsets.md`、`toolsets-guide.md`
   - 覆盖：Tools::Base、Tools::Toolset DSL、type safety with Sorbet sigs、schema generation、built-in toolsets、testing

4. **`references/providers.md`** — 重写
   - Source（来源）：`llms.txt.erb`、engineering SKILL.md、`core-concepts/module-runtime-context.md`
   - 覆盖：per-provider adapters、RubyLLM unified adapter、Rails initializer、fiber-local LM context（`DSPy.with_lm`）、feature-flagged model selection、compatibility matrix

5. **`references/optimization.md`** — 重写
   - Source（来源）：`optimization/miprov2.md`、`gepa.md`、`evaluation.md`、`production/storage.md`
   - 覆盖：MIPROv2（dspy-miprov2 gem、AutoMode presets）、GEPA（dspy-gepa gem、feedback maps）、Evaluation（DSPy::Evals、built-in metrics、DSPy::Example）、Storage（ProgramStorage）

6. **`references/observability.md`** — 新增
   - Source（来源）：`production/observability.md`、`core-concepts/events.md`、`advanced/observability-interception.md`
   - 覆盖：event system（module-scoped + global）、dspy-o11y gems、Langfuse（env vars）、score reporting（DSPy.score()）、observation types、DSPy::Context.with_span

### Assets（assets，重写到当前 API）

7. **`assets/signature-template.rb`** — T::Enum classes、`description:` kwarg、Date/Time types、defaults、union types、`.call()` / `result.field` usage examples（用法示例）

8. **`assets/module-template.rb`** — `.call()` API、`result.field`、Tools::Base、lifecycle callbacks（生命周期 callbacks）、`DSPy.with_lm`、`configure_predictor`

9. **`assets/config-template.rb`** — RubyLLM adapter、`structured_outputs: true`、`after_initialize` Rails pattern、dspy-o11y env vars、feature-flagged model selection（由 feature flag 控制的 model selection）

### Metadata（元数据）

10. **`.claude-plugin/plugin.json`** — Version（版本）`2.31.0` → `2.31.1`

11. **`CHANGELOG.md`** — 在 `### Changed` 下添加 `[2.31.1] - 2026-02-09` entry

## 验证

```bash
# No old API patterns
grep -n '\.forward(\|result\[:\|T\.enum(\[\|DSPy::Tool[^s]' plugins/compound-engineering/skills/dspy-ruby/SKILL.md

# No backtick references
grep -E '`(references|assets|scripts)/' plugins/compound-engineering/skills/dspy-ruby/SKILL.md

# Frontmatter correct
head -4 plugins/compound-engineering/skills/dspy-ruby/SKILL.md

# JSON valid
cat plugins/compound-engineering/.claude-plugin/plugin.json | jq .

# All files exist
ls plugins/compound-engineering/skills/dspy-ruby/{references,assets}/
```

## 成功标准

- [x] 所有 API patterns 已更新（`.call()`、`result.field`、`T::Enum`、`Tools::Base`）
- [x] 新 features 已覆盖：events、callbacks、fiber-local LM、GEPA、evals、BAML/TOON、storage、score API、RubyLLM、typed context
- [x] 5 个 reference files 存在（core-concepts、toolsets、providers、optimization、observability）
- [x] 3 个 asset templates 已更新到当前 API
- [x] YAML frontmatter：`name: dspy-ruby`，description 同时包含 "what" 和 "when"
- [x] 所有 reference links 使用 `[file.md](./references/file.md)` 格式
- [x] 写作风格：imperative form，不使用 "you should"
- [x] Version 已 bump 到 `2.31.1`，CHANGELOG 已更新
- [x] Verification commands 全部通过

## 来源材料

- Engineering skill（engineering skill，工程 skill）：`/Users/vicente/Workspaces/vicente.services/engineering/plugins/engineering-skills/skills/dspy-rb/SKILL.md`
- Official docs（官方文档）：`/Users/vicente/Workspaces/vicente.services/dspy.rb/docs/src/`
- NavigationContext brainstorm（NavigationContext brainstorm，NavigationContext 头脑风暴）：`/Users/vicente/Workspaces/vicente.services/observo/observo-server/docs/brainstorms/2026-02-09-typed-navigation-context-brainstorm.md`
