---
title: Codex Conversion Skills、Prompts 与 Canonical Entry Points
category: architecture
tags: [codex, converter, skills, prompts, workflows, deprecation]
created: 2026-03-15
last_refreshed: 2026-06-20
severity: medium
component: codex-target
problem_type: convention
root_cause: outdated_target_model
---

# Codex Conversion Skills、Prompts 与 Canonical Entry Points

## 问题

Codex target 有两个互相冲突的 assumptions：

1. `ce:brainstorm` 和 `ce:plan` 这样的 compound workflow entrypoints 在 docs 中被当作 slash-command-style surfaces。
2. Codex converter 将这些 entries 安装为 copied skills，而不是 generated prompts。

这为 cross-workflow handoffs 创造了不一致 runtime。Copied skill content 仍包含 Claude-style references，例如 `/ce:plan`，但 copied `SKILL.md` files 没有应用 Codex-native translation，也没有清晰的 canonical Codex entrypoint model 来表示这些 workflow skills。

## 我们学到的内容

### 1. Codex 同时支持 skills 和 prompts，但它们是不同 surfaces

- Skills 从 skill roots 加载，例如 `~/.codex/skills`；较新的 Codex code 也支持 `.agents/skills`。
- Prompts 是 `.codex/prompts` 下单独的 explicit entrypoint surface。
- skill 不会自动成为 prompt，prompt 也不会自动成为 skill。

对本 repo 而言，这意味着像 `ce:plan` 这样的 copied skill 只是一项 skill，除非 converter 也为它生成 prompt wrapper。

### 2. Codex skill names 来自 directory name

Codex 从 skill directory basename 推导 skill name，而不是从我们 normalized hyphenated converter name 推导。

Implication（影响）：

- `~/.codex/skills/ce:plan` 会加载为 skill `ce:plan`
- 将其 rewrite 为 `ce-plan` 对 skill-to-skill references 是错误的

### 3. 原始 bug 是结构性的，不只是措辞问题

问题不在于 `ce:brainstorm` 需要略微不同的 prose。真正问题是：

- copied skills 绕过了 Codex-specific transformation
- workflow handoffs 引用的 surface 在 installed Codex artifacts 中没有清晰表示

### 4. Deprecated `workflows:*` aliases 会在 Codex 中增加噪声

`workflows:*` names 只为 Claude 中的 backward compatibility 存在。

将它们复制到 Codex 会：

- duplicate user-facing entrypoints（重复的用户可见入口）
- 使 handoff rewriting 复杂化
- 增加哪个 name 是 canonical 的歧义

对 Codex 而言，更简单的模型是将 `ce:*` 视为唯一 canonical workflow namespace，并从 installed output 中省略 `workflows:*` aliases。

## 推荐的 Codex Model

对 workflow entrypoints 使用两层 mapping：

1. **Skills 仍是 implementation units**
   - 使用精确 names 复制 canonical workflow skills，例如 `ce:plan`
   - 为所有 Codex skill references 保留精确 skill names

2. **Prompts 是 explicit entrypoint layer**
   - 为 canonical user-facing workflow entrypoints 生成 prompt wrappers
   - 使用 Codex-safe prompt slugs，例如 `ce-plan`、`ce-work`、`ce-review`
   - Prompt wrappers delegate 到精确 underlying skill name，例如 `ce:plan`

这给 Codex 一个清晰的 manual invocation surface，同时在内部保留真实 loaded skill names。

## Rewrite Rules（重写规则）

将 copied `SKILL.md` content 转换到 Codex 时：

- 指向 canonical workflow entrypoints 的 references 应指向 generated prompt wrappers
  - `/ce:plan` -> `/prompts:ce-plan`
  - `/ce:work` -> `/prompts:ce-work`
- deprecated aliases 的 references 应 canonicalize 到现代 `ce:*` prompt
  - `/workflows:plan` -> `/prompts:ce-plan`
- 指向 non-entrypoint skills 的 references 应使用精确 skill name，而不是 normalized alias
- 实际由 Claude commands 转换成的 Codex prompts 可以继续使用 `/prompts:...`

### Regression hardening（回归加固）

rewrite copied `SKILL.md` files 时，只 rewrite 已知 workflow 和 command references。

不要 rewrite 任意 slash-shaped text，例如：

- `/users` 或 `/settings` 这样的 application routes
- `/state` 或 `/ops` 这样的 API path segments
- `https://www.proofeditor.ai/...` 这样的 URLs

Unknown slash references 应在 copied skill content 中保持不变。否则 Codex install 在 canonicalize workflow handoffs 时，会 silently corrupt unrelated skills。

从 `~/.claude/skills` 加载的 personal skills 也需要 tolerant metadata parsing：

- malformed YAML frontmatter 不应导致整个 skill 消失
- 保持 directory name 作为 stable skill name
- 将 frontmatter metadata 视为 best-effort

## Future Entry Points（未来入口）

不要在 converter 中 hard-code workflow names allowlist。

改用稳定规则：

- `ce:*` = canonical workflow entrypoint
  - 自动生成 prompt wrapper
- `workflows:*` = deprecated alias
  - 从 Codex output 中省略
  - 将 references rewrite 到 canonical `ce:*` target
- non-`ce:*` skills = 默认 skill-only
  - 如果某个 non-`ce:*` skill 也应成为 prompt entrypoint，用 Codex-specific metadata 显式标记

这意味着未来的 `ce:ideate` 这类 skills 无需手动 converter changes 即可工作。

## Implementation Guidance（实现指导）

对于 Codex target：

1. 解析足够的 skill frontmatter，以区分 command-like entrypoint skills 与 background skills
2. 从 Codex installation 中过滤 deprecated `workflows:*` alias skills
3. 为 canonical `ce:*` workflow skills 生成 prompt wrappers
4. 对 copied `SKILL.md` files 应用 Codex-specific transformation
5. 内部保留精确 Codex skill names
6. 更新 README language，使 Codex entrypoints 被记录为 Codex-native surfaces，而不是假设它们与 Claude slash commands 完全相同

## 预防

再次修改 Codex converter 前：

1. 验证 target surface 是 skill、prompt，还是两者都是
2. 检查 Codex 如何从 installed artifacts 推导 names
3. 在复制 deprecated aliases 前决定哪些 names 是 canonical
4. 为 copied skill content 添加 tests，而不只是 generated prompt content

## 相关文件

- `src/converters/claude-to-codex.ts`
- `src/targets/codex.ts`
- `src/types/codex.ts`
- `src/utils/codex-content.ts`
- `src/utils/legacy-cleanup.ts`
- `tests/codex-converter.test.ts`
- `tests/codex-writer.test.ts`
- `tests/legacy-cleanup.test.ts`
- `.codex-plugin/plugin.json`
- `README.md`
- `skills/ce-brainstorm/SKILL.md`
- `skills/ce-plan/SKILL.md`
- `docs/solutions/integrations/native-plugin-install-strategy.md`
