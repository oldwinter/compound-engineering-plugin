---
title: "Colon-namespaced skill names 会破坏 Windows filesystem paths"
date: 2026-03-26
category: integration-issues
module: cli-converter
problem_type: integration_issue
component: tooling
symptoms:
  - "在 Windows 上运行 bun convert 时出现 ENOTDIR error"
  - "mkdir 因 '.config\\opencode\\skills\\ce:brainstorm' 失败"
  - "所有 target writers（opencode、codex、copilot 等）都会产生 colon paths"
root_cause: config_error
resolution_type: code_fix
severity: high
related_issues:
  - "https://github.com/EveryInc/compound-engineering-plugin/issues/366"
related_components:
  - targets
  - sync
  - converters
tags:
  - windows
  - cross-platform
  - path-sanitization
  - skill-names
  - colons
---

# Colon-namespaced skill names 会破坏 Windows filesystem paths

## 问题

包含 colons 的 skill names（例如 `ce:brainstorm`、`ce:plan`）被所有 target writers 和 sync paths 直接用作 directory names。Colons 在 Windows filenames 中非法，因此会在 `bun convert` 或 `bun install` 期间导致 `ENOTDIR` errors。

## 症状

```
{ [Error: ENOTDIR: not a directory, mkdir '.config\opencode\skills\ce:brainstorm']
  code: 'ENOTDIR',
  path: '.config\\opencode\\skills\\ce:brainstorm',
  syscall: 'mkdir',
  errno: -20 }
```

这影响了每个 target（OpenCode、Codex、Copilot、Gemini、Kiro、Droid、Pi，以及当时存在的其他 targets），因为它们都在 `path.join()` 调用中直接使用 `skill.name`。

## 无效做法

一开始曾考虑用 `/`（forward slash）作为替换字符，将 `ce:brainstorm` 变成 nested directories `ce/brainstorm/`。该方案被拒绝，因为：

1. 它为本质上只是 character-replacement 的问题引入了不必要的 directory nesting
2. `isValidSkillName` 和 `validatePathSafe` functions 会拒绝 `/` 和 `\`，因此 sanitized names 会无法通过现有 validation
3. Source directories 已经使用 hyphens（`skills/ce-brainstorm/`），因此 output 应与之匹配

## 解决方案

在 `src/utils/files.ts` 中添加 `sanitizePathName()`，将 colons 替换为 hyphens：

```typescript
export function sanitizePathName(name: string): string {
  return name.replace(/:/g, "-")
}
```

应用在两层：

### Layer 1：Target writers（target writers，目标 writer）

每个 target writer 在构造 output paths 时，都用 `sanitizePathName()` 包装 skill/agent names：

```typescript
// Before
await copyDir(skill.sourceDir, path.join(skillsRoot, skill.name))

// After
await copyDir(skill.sourceDir, path.join(skillsRoot, sanitizePathName(skill.name)))
```

目前已应用于 `src/targets/{opencode,codex,gemini,kiro,pi,managed-artifacts}.ts`。（最初编写此 fix 时，单独的 `src/sync/` directory 也包含 path-construction logic，需要同样处理。该层后来已合并进 target writers。）

### Layer 2：Converter dedupe sets 和 manifests

在 writers 中 sanitize paths 产生了一个次生 bug：converter dedupe logic 使用未 sanitize 的 names，因此 pass-through skill `ce:plan` 与 normalized 为 `ce-plan` 的 generated skill 不会检测到 collision，二者都会写入磁盘上的 `skills/ce-plan/`。

已在维护 dedupe sets 的 converters 中修复，目前是 `src/converters/claude-to-copilot.ts`：

- `usedSkillNames.add(sanitizePathName(skill.name))` instead of raw `skill.name`

任何未来维护 name-collision set 或输出 manifest 的 converter 都必须应用相同 sanitization，使 in-memory set 与 on-disk paths 匹配。

## 为什么有效

核心问题是 logical name domain（colons 作为 namespace separators）与 filesystem domain（colons 在 Windows 上非法）不匹配。该 fix 在边界处 sanitize：names 在 data structures 和 frontmatter 中保留 colons，但 paths 使用 hyphens。这与 source directory convention 匹配（`skills/ce-brainstorm/`，frontmatter 为 `name: ce:brainstorm`）。

## 预防

### 1. Collision detection test（冲突检测测试）

`tests/path-sanitization.test.ts` 中的测试会加载真实 compound-engineering plugin，并验证 sanitization 后没有两个 skill 或 agent names 发生 collision：

```typescript
test("no two skill names collide after sanitization", async () => {
  const plugin = await loadClaudePlugin(pluginRoot)
  const sanitized = plugin.skills.map((skill) => sanitizePathName(skill.name))
  const unique = new Set(sanitized)
  expect(unique.size).toBe(sanitized.length)
})
```

### 2. 将 names 添加到 filesystem paths 时

从 skill、agent 或 component names 构造 output paths 时，始终使用 `sanitizePathName()`。绝不要在 target writers 或 sync files 中将 `skill.name` 或 `agent.name` 直接传给 `path.join()`。

### 3. 在 converters 中构建 dedupe sets 时

如果 converter 为 collision detection 保留 names，reserved names 必须 sanitize，以匹配 writer 在磁盘上生成的内容。set 中的 raw names + generators 产生的 normalized names = 漏掉 collisions。

### 4. 与 `resolveCommandPath` 的不一致

注意，`resolveCommandPath`（用于 commands）会将 colons 转成 nested directories（`ce:plan` -> `ce/plan.md`），而 `sanitizePathName`（用于 skills/agents）会转成 hyphens（`ce:plan` -> `ce-plan`）。这是有意的：commands 和 skills 是不同 surfaces，具有不同 resolution patterns。如果新增 component type，需决定适合哪种 pattern，并记录选择。
