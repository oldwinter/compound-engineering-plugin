---
title: Windsurf Global Scope Support（全局 scope 支持）
type: feat
status: completed
date: 2026-02-25
deepened: 2026-02-25
prior: docs/plans/2026-02-23-feat-add-windsurf-target-provider-plan.md (removed — superseded)
---

# Windsurf Global Scope Support（Windsurf global scope 支持）

## 实现后修订（2026-02-26）

根据 `docs/specs/windsurf.md` audit implementation 后，做了两个重要变更：

1. **Agents → Skills（not Workflows）**：Claude agents 映射到 Windsurf Skills（`skills/{name}/SKILL.md`），不是 Workflows。Skills 是 "complex multi-step tasks with supporting resources"，更适合作为 specialized expertise/personas 的概念映射。Workflows 是 "reusable step-by-step procedures"，更适合 Claude Commands（slash commands）。

2. **Workflows are flat files**：Command workflows 写入 `global_workflows/{name}.md`（global scope）或 `workflows/{name}.md`（workspace scope）。不使用 subdirectories；spec 要求 flat files。

3. **Content transforms updated**：`@agent-name` references 保持原样（Windsurf skill invocation syntax）。`/command` references 产出 `/{name}`（不是 `/commands/{name}`）。`Task agent(args)` 产出 `Use the @agent-name skill: args`。

### 最终组件映射（per spec）

| Claude Code | Windsurf | Output Path | Invocation |
|---|---|---|---|
| Agents (`.md`) | Skills | `skills/{name}/SKILL.md` | `@skill-name` or automatic |
| Commands (`.md`) | Workflows (flat) | `global_workflows/{name}.md` (global) / `workflows/{name}.md` (workspace) | `/{workflow-name}` |
| Skills (`SKILL.md`) | Skills (pass-through) | `skills/{name}/SKILL.md` | `@skill-name` |
| MCP servers | `mcp_config.json` | `mcp_config.json` | N/A |
| Hooks | Skipped with warning | N/A | N/A |
| CLAUDE.md | Skipped | N/A | N/A |

### 修订中变更的文件

- `src/types/windsurf.ts`：`agentWorkflows` → `agentSkills: WindsurfGeneratedSkill[]`
- `src/converters/claude-to-windsurf.ts`：`convertAgentToSkill()`、updated content transforms
- `src/targets/windsurf.ts`：Skills 写为 `skills/{name}/SKILL.md`，workflows 为 flat
- Tests 已更新以匹配

---

## 增强摘要

**Deepened on（深化日期）：** 2026-02-25
**Research agents used（使用的 research agents）：** architecture-strategist、kieran-typescript-reviewer、security-sentinel、code-simplicity-reviewer、pattern-recognition-specialist
**External research（外部调研）：** Windsurf MCP docs、Windsurf tutorial docs

### Deepening 带来的关键改进
1. **HTTP/SSE servers should be INCLUDED**：Windsurf 支持全部 3 种 transport types（stdio、Streamable HTTP、SSE）。原 plan 错误地跳过它们。
2. **File permissions: use `0o600`**：`mcp_config.json` 包含 secrets，不能 world-readable。增加 secure write support。
3. **Extract `resolveTargetOutputRoot` to shared utility**：两个 commands 都重复这段逻辑；新增 scope 会让重复更糟。先抽取。
4. **Bug fix: missing `result[name] = entry`**：全部 5 个 review agents 都发现了 `buildMcpConfig` sample code 中的 copy-paste bug。
5. **`hasPotentialSecrets` to shared utility**：当前在 sync.ts 中，会被重复。抽取到 `src/utils/secrets.ts`。
6. **Windsurf `mcp_config.json` is global-only**：按 Windsurf docs，没有 per-project MCP config support。Workspace scope 为 forward-compatibility 写入它，但 emit warning。
7. **Windsurf supports `${env:VAR}` interpolation**：可考虑为 secrets 写入 env var references，而不是 literal values。

### 新发现的考虑事项
- Backup files 会带着 secrets 累积且永不 cleanup：cap at 3 backups
- Workspace `mcp_config.json` 可能被 commit 到 git：提示 `.gitignore`
- `WindsurfMcpServerEntry` type 需要 `serverUrl` field 以支持 HTTP/SSE servers
- Simplicity reviewer 建议将 scope 作为 windsurf-specific CLI 处理，而不是 generic `TargetHandler` fields；但 brainstorm 明确选择 "generic with windsurf as first adopter"。**Decision: keep generic approach**，并用 JSDoc 记录 `defaultScope` 与 `supportedScopes` 的关系。

---

## 概览

向 converter CLI 添加 generic `--scope global|workspace` flag，并以 Windsurf 作为第一个 adopter。Global scope 写入 `~/.codeium/windsurf/`，让 workflows、skills 和 MCP servers 在所有 projects 中可用。同时，将 MCP handling 从 human-readable setup doc（`mcp-setup.md`）升级为 proper machine-readable config（`mcp_config.json`），并移除 AGENTS.md generation（plugin 的 CLAUDE.md 包含 development-internal instructions，不是 user-facing content）。

## 问题陈述 / 动机

当前 Windsurf converter（v0.10.0）将所有内容写到 project-level `.windsurf/`，要求每个 project 重新 install。Windsurf 支持 skills（`~/.codeium/windsurf/skills/`）和 MCP config（`~/.codeium/windsurf/mcp_config.json`）的 global paths。Users 应该 install 一次，就在所有地方获得 capabilities。

此外，v0.10.0 MCP output 是 markdown setup guide，不是真正 integration。Windsurf 直接读取 `mcp_config.json`，因此我们应写入该 file。

## 相对 v0.10.0 的 Breaking Changes

这是一次 **minor version bump**（v0.11.0），包含对 experimental Windsurf target 的 intentional breaking changes：

1. **Default output location changed**：`--to windsurf` 现在默认 global scope（`~/.codeium/windsurf/`）。旧行为使用 `--scope workspace`。
2. **AGENTS.md no longer generated**：old files 保留原地（不删除）。
3. **`mcp-setup.md` replaced by `mcp_config.json`**：proper machine-readable integration。Old files 保留原地。
4. **Env var secrets included with warning**：之前 redacted，现在 included（config file 要工作必须这样）。
5. **`--output` semantics changed**：`--output` 现在指定 direct target directory（不是创建 `.windsurf/` 的 parent）。

## 方案提议

### 阶段 0：抽取 Shared Utilities（前置）

**文件：** `src/utils/resolve-output.ts`（new）, `src/utils/secrets.ts`（new）

#### 0a. 将 `resolveTargetOutputRoot` 抽取为 shared utility

`install.ts` 和 `convert.ts` 都有几乎相同的 `resolveTargetOutputRoot` functions，且已经开始 divergence（`hasExplicitOutput` 存在于 install.ts，但 convert.ts 中没有）。新增 scope 会让重复更糟。

- [x] 创建 `src/utils/resolve-output.ts`，包含 unified function：

```typescript
import os from "os"
import path from "path"
import type { TargetScope } from "../targets"

export function resolveTargetOutputRoot(options: {
  targetName: string
  outputRoot: string
  codexHome: string
  piHome: string
  hasExplicitOutput: boolean
  scope?: TargetScope
}): string {
  const { targetName, outputRoot, codexHome, piHome, hasExplicitOutput, scope } = options
  if (targetName === "codex") return codexHome
  if (targetName === "pi") return piHome
  if (targetName === "droid") return path.join(os.homedir(), ".factory")
  if (targetName === "cursor") {
    const base = hasExplicitOutput ? outputRoot : process.cwd()
    return path.join(base, ".cursor")
  }
  if (targetName === "gemini") {
    const base = hasExplicitOutput ? outputRoot : process.cwd()
    return path.join(base, ".gemini")
  }
  if (targetName === "copilot") {
    const base = hasExplicitOutput ? outputRoot : process.cwd()
    return path.join(base, ".github")
  }
  if (targetName === "kiro") {
    const base = hasExplicitOutput ? outputRoot : process.cwd()
    return path.join(base, ".kiro")
  }
  if (targetName === "windsurf") {
    if (hasExplicitOutput) return outputRoot
    if (scope === "global") return path.join(os.homedir(), ".codeium", "windsurf")
    return path.join(process.cwd(), ".windsurf")
  }
  return outputRoot
}
```

- [x] 更新 `install.ts`，import 并调用 shared utility 中的 `resolveTargetOutputRoot`
- [x] 更新 `convert.ts`，import 并调用 shared utility 中的 `resolveTargetOutputRoot`
- [x] 向 `convert.ts` 添加 `hasExplicitOutput` tracking（当前缺失）

### Research Insights（阶段 0）

**Architecture review：** 两个 commands 将以同一 signature 调用同一 function。这消除 divergence，并确保 scope resolution 拥有 single source of truth。两个 commands 中的 `--also` loop 也会使用这个 function，并传入 `handler.defaultScope`。

**Pattern review：** 这遵循与 `src/utils/resolve-home.ts` 中 `resolveTargetHome` 相同的 extraction pattern。

#### 0b. 将 `hasPotentialSecrets` 抽取为 shared utility

当前位于 `sync.ts:20-31`。相同 regex pattern 也以 `redactEnvValue` 形式出现在 `claude-to-windsurf.ts:223`。抽取以避免第三份 copy。

- [x] 创建 `src/utils/secrets.ts`：

```typescript
const SENSITIVE_PATTERN = /key|token|secret|password|credential|api_key/i

export function hasPotentialSecrets(
  servers: Record<string, { env?: Record<string, string> }>,
): boolean {
  for (const server of Object.values(servers)) {
    if (server.env) {
      for (const key of Object.keys(server.env)) {
        if (SENSITIVE_PATTERN.test(key)) return true
      }
    }
  }
  return false
}
```

- [x] 更新 `sync.ts`，从 shared utility import
- [x] 在新的 windsurf converter 中使用

### 阶段 1：Types and TargetHandler

**文件：** `src/types/windsurf.ts`, `src/targets/index.ts`

#### 1a. 更新 WindsurfBundle type

```typescript
// src/types/windsurf.ts
export type WindsurfMcpServerEntry = {
  command?: string
  args?: string[]
  env?: Record<string, string>
  serverUrl?: string
  headers?: Record<string, string>
}

export type WindsurfMcpConfig = {
  mcpServers: Record<string, WindsurfMcpServerEntry>
}

export type WindsurfBundle = {
  agentWorkflows: WindsurfWorkflow[]
  commandWorkflows: WindsurfWorkflow[]
  skillDirs: WindsurfSkillDir[]
  mcpConfig: WindsurfMcpConfig | null
}
```

- [x] 移除 `agentsMd: string | null`
- [x] 用 `mcpConfig: WindsurfMcpConfig | null` 替换 `mcpSetupDoc: string | null`
- [x] 添加 `WindsurfMcpServerEntry`（同时支持 stdio 和 HTTP/SSE）以及 `WindsurfMcpConfig` types

### Research Insights（阶段 1a）

**Windsurf docs confirm：** 三种 transport types：stdio（`command` + `args`）、Streamable HTTP（`serverUrl`）和 SSE（`serverUrl` 或 `url`）。`WindsurfMcpServerEntry` type 必须支持全部三种，因此 `command` optional，并增加 `serverUrl` 和 `headers` fields。

**TypeScript reviewer：** 如果想要 strict typing，可考虑将 `WindsurfMcpServerEntry` 做成 discriminated union。但由于它镜像 JSON config structure，带 optional fields 的 flat type 更 pragmatically simpler。

#### 1b. 向 TargetHandler 添加 TargetScope

```typescript
// src/targets/index.ts
export type TargetScope = "global" | "workspace"

export type TargetHandler<TBundle = unknown> = {
  name: string
  implemented: boolean
  /**
   * Default scope when --scope is not provided.
   * Only meaningful when supportedScopes is defined.
   * Falls back to "workspace" if absent.
   */
  defaultScope?: TargetScope
  /** Valid scope values. If absent, the --scope flag is rejected for this target. */
  supportedScopes?: TargetScope[]
  convert: (plugin: ClaudePlugin, options: ClaudeToOpenCodeOptions) => TBundle | null
  write: (outputRoot: string, bundle: TBundle) => Promise<void>
}
```

- [x] 添加 `TargetScope` type export
- [x] 向 `TargetHandler` 添加带 JSDoc 的 `defaultScope?` 和 `supportedScopes?`
- [x] 设置 windsurf target：`defaultScope: "global"`、`supportedScopes: ["global", "workspace"]`
- [x] 其他 targets 不改（它们没有 scope fields，flag ignored）

### Research Insights（阶段 1b）

**Simplicity review：** 认为这是 premature generalization（8 个 targets 中只有 1 个使用 scopes）。建议以 windsurf-specific 方式处理 scope，并用 `if (targetName !== "windsurf")` guard。**Decision: keep generic approach**，遵循 brainstorm decision "Generic with windsurf as first adopter"，但用 JSDoc 记录 invariant。

**TypeScript review：** 建议用 grouped object `ScopeConfig` 防止出现 `defaultScope` without `supportedScopes`。JSDoc approach 更简单，目前足够。

**Architecture review：** 向 `TargetHandler` 添加 optional fields 遵循 Open/Closed Principle：existing targets 不受影响。Clean extension。

### 阶段 2：Converter Changes

**文件：** `src/converters/claude-to-windsurf.ts`

#### 2a. 移除 AGENTS.md generation

- [x] 移除 `buildAgentsMd()` function
- [x] 从 return value 移除 `agentsMd`

#### 2b. 用 MCP config 替换 MCP setup doc

- [x] 移除 `buildMcpSetupDoc()` function
- [x] 移除 `redactEnvValue()` helper
- [x] 添加 `buildMcpConfig()`，返回 `WindsurfMcpConfig | null`
- [x] 包含 **all** env vars（包括 secrets）：不 redact
- [x] 使用 `src/utils/secrets.ts` 中 shared `hasPotentialSecrets()`
- [x] 包含 **both** stdio 和 HTTP/SSE servers（Windsurf 支持全部 transport types）

```typescript
function buildMcpConfig(
  servers?: Record<string, ClaudeMcpServer>,
): WindsurfMcpConfig | null {
  if (!servers || Object.keys(servers).length === 0) return null

  const result: Record<string, WindsurfMcpServerEntry> = {}
  for (const [name, server] of Object.entries(servers)) {
    if (server.command) {
      // stdio transport
      const entry: WindsurfMcpServerEntry = { command: server.command }
      if (server.args?.length) entry.args = server.args
      if (server.env && Object.keys(server.env).length > 0) entry.env = server.env
      result[name] = entry
    } else if (server.url) {
      // HTTP/SSE transport
      const entry: WindsurfMcpServerEntry = { serverUrl: server.url }
      if (server.headers && Object.keys(server.headers).length > 0) entry.headers = server.headers
      if (server.env && Object.keys(server.env).length > 0) entry.env = server.env
      result[name] = entry
    } else {
      console.warn(`Warning: MCP server "${name}" has no command or URL. Skipping.`)
      continue
    }
  }

  if (Object.keys(result).length === 0) return null

  // Warn about secrets (don't redact — they're needed for the config to work)
  if (hasPotentialSecrets(result)) {
    console.warn(
      "Warning: MCP servers contain env vars that may include secrets (API keys, tokens).\n" +
      "   These will be written to mcp_config.json. Review before sharing the config file.",
    )
  }

  return { mcpServers: result }
}
```

### Research Insights（阶段 2）

**Windsurf docs（critical correction）：** Windsurf 在 `mcp_config.json` 中支持 **stdio、Streamable HTTP 和 SSE** transports。HTTP/SSE servers 使用 `serverUrl`（不是 `url`）。原 plan 错误地计划跳过 HTTP/SSE servers。现在已修正：包含所有 transport types。

**All 5 review agents flagged：** 原始 code sample 缺少 `result[name] = entry`：entry 被 build 但从未存入。上方已修复。

**Security review：** Warning message 应列出触发检测的具体 env var names。增强版：

```typescript
if (hasPotentialSecrets(result)) {
  const flagged = Object.entries(result)
    .filter(([, s]) => s.env && Object.keys(s.env).some(k => SENSITIVE_PATTERN.test(k)))
    .map(([name]) => name)
  console.warn(
    `Warning: MCP servers contain env vars that may include secrets: ${flagged.join(", ")}.\n` +
    "   These will be written to mcp_config.json. Review before sharing the config file.",
  )
}
```

**Windsurf env var interpolation：** Windsurf 支持 `mcp_config.json` 中的 `${env:VARIABLE_NAME}` syntax。Future enhancement：为 secrets 写入 env var references，而不是 literal values。v0.11.0 out of scope（需要进一步研究哪些 fields 支持 interpolation）。

### 阶段 3：Writer Changes

**文件：** `src/targets/windsurf.ts`, `src/utils/files.ts`

#### 3a. 简化 writer — 移除 AGENTS.md 和 double-nesting guard

Writer 始终直接写入 `outputRoot`。CLI 根据 scope resolve 正确 output root。

- [x] 移除 AGENTS.md writing block（lines 10-17）
- [x] 移除 `resolveWindsurfPaths()`：不再需要
- [x] 将 workflows、skills 和 MCP config 直接写入 `outputRoot`

### Research Insights（阶段 3a）

**Pattern review（dissent）：** 其他每个 writer（kiro、copilot、gemini、droid）都有 `resolve*Paths()` function 和 double-nesting guard。移除它会让 Windsurf 成为唯一由 CLI 完全拥有 nesting 的 target。这造成 `write()` contract 不一致。

**Resolution：** 接受 divergence：Windsurf 语义确实不同（global vs workspace）。在 `TargetHandler.write()` 上添加 JSDoc comment，记录某些 writers 可能 apply additional nesting，而 Windsurf writer 期望 final resolved path。长期来看，其他 targets 可在 separate refactor 中迁移到该 pattern。

#### 3b. 用 JSON config merge 替换 MCP setup doc

遵循 Kiro pattern（`src/targets/kiro.ts:68-92`），并添加 security hardening：

- [x] 如存在，读取 existing `mcp_config.json`
- [x] overwrite 前 backup（`backupFile()`）
- [x] Parse existing JSON（corrupted 时 warn and replace；添加 `!Array.isArray()` guard）
- [x] 在 `mcpServers` key 下 merge：plugin entries overwrite same-name entries，user entries preserved
- [x] Preserve existing file 中所有 other top-level keys
- [x] 用 **restrictive permissions**（`0o600`）写入 merged result
- [x] 写入 workspace scope 时 emit warning（Windsurf `mcp_config.json` 按 docs 是 global-only）

```typescript
// MCP config merge with security hardening
if (bundle.mcpConfig) {
  const mcpPath = path.join(outputRoot, "mcp_config.json")
  const backupPath = await backupFile(mcpPath)
  if (backupPath) {
    console.log(`Backed up existing mcp_config.json to ${backupPath}`)
  }

  let existingConfig: Record<string, unknown> = {}
  if (await pathExists(mcpPath)) {
    try {
      const parsed = await readJson<unknown>(mcpPath)
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        existingConfig = parsed as Record<string, unknown>
      }
    } catch {
      console.warn("Warning: existing mcp_config.json could not be parsed and will be replaced.")
    }
  }

  const existingServers =
    existingConfig.mcpServers &&
    typeof existingConfig.mcpServers === "object" &&
    !Array.isArray(existingConfig.mcpServers)
      ? (existingConfig.mcpServers as Record<string, unknown>)
      : {}
  const merged = { ...existingConfig, mcpServers: { ...existingServers, ...bundle.mcpConfig.mcpServers } }
  await writeJsonSecure(mcpPath, merged)  // 0o600 permissions
}
```

### Research Insights（阶段 3b）

**Security review（HIGH）:** 当前 `src/utils/files.ts` 中的 `writeJson()` 使用 default umask（`0o644`），world-readable。sync targets 都对 secret-containing files 使用 `{ mode: 0o600 }`。Windsurf writer（以及 Kiro writer）也必须如此。

**Implementation:** 添加 `writeJsonSecure()` helper，或向 `writeJson()` 添加 `mode` parameter：

```typescript
// src/utils/files.ts
export async function writeJsonSecure(filePath: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2)
  await ensureDir(path.dirname(filePath))
  await fs.writeFile(filePath, content + "\n", { encoding: "utf8", mode: 0o600 })
}
```

**Security review（MEDIUM）:** Backup files 继承 default permissions。确保 source 可能包含 secrets 时，`backupFile()` 也为 backup copy 设置 `0o600`。

**Security review（MEDIUM）:** Workspace `mcp_config.json` 可能被 commit 到 git。写入 workspace scope 后 emit warning：

```
Warning: .windsurf/mcp_config.json may contain secrets. Ensure it is in .gitignore.
```

**TypeScript review:** `readJson<Record<string, unknown>>` assertion 不安全：valid JSON array 或 string 能 parse 但不符合 type。已添加 `!Array.isArray()` guard。

**TypeScript review:** `bundle.mcpConfig` null check 足够；non-null 时 `mcpServers` 保证有 entries（converter 对 empty servers 返回 null）。从 `bundle.mcpConfig && Object.keys(...)` 简化。

**Windsurf docs（important）:** `mcp_config.json` 是 **global configuration only**：Windsurf 没有 per-project MCP config support。将它写入 `.windsurf/` workspace scope 可能不会被 Windsurf discover。Workspace scope emit warning 但仍写入 file 以便 forward-compatibility。

#### 3c. 更新后的 writer structure

```typescript
export async function writeWindsurfBundle(outputRoot: string, bundle: WindsurfBundle): Promise<void> {
  await ensureDir(outputRoot)

  // Write agent workflows
  if (bundle.agentWorkflows.length > 0) {
    const agentDir = path.join(outputRoot, "workflows", "agents")
    await ensureDir(agentDir)
    for (const workflow of bundle.agentWorkflows) {
      validatePathSafe(workflow.name, "agent workflow")
      const content = formatFrontmatter({ description: workflow.description }, `# ${workflow.name}\n\n${workflow.body}`)
      await writeText(path.join(agentDir, `${workflow.name}.md`), content + "\n")
    }
  }

  // Write command workflows
  if (bundle.commandWorkflows.length > 0) {
    const cmdDir = path.join(outputRoot, "workflows", "commands")
    await ensureDir(cmdDir)
    for (const workflow of bundle.commandWorkflows) {
      validatePathSafe(workflow.name, "command workflow")
      const content = formatFrontmatter({ description: workflow.description }, `# ${workflow.name}\n\n${workflow.body}`)
      await writeText(path.join(cmdDir, `${workflow.name}.md`), content + "\n")
    }
  }

  // Copy skill directories
  if (bundle.skillDirs.length > 0) {
    const skillsDir = path.join(outputRoot, "skills")
    await ensureDir(skillsDir)
    for (const skill of bundle.skillDirs) {
      validatePathSafe(skill.name, "skill directory")
      const destDir = path.join(skillsDir, skill.name)
      const resolvedDest = path.resolve(destDir)
      if (!resolvedDest.startsWith(path.resolve(skillsDir))) {
        console.warn(`Warning: Skill name "${skill.name}" escapes skills/. Skipping.`)
        continue
      }
      await copyDir(skill.sourceDir, destDir)
    }
  }

  // Merge MCP config (see 3b above)
  if (bundle.mcpConfig) {
    // ... merge logic from 3b
  }
}
```

### 阶段 4：CLI Wiring

**文件：** `src/commands/install.ts`, `src/commands/convert.ts`

#### 4a. 向两个 commands 添加 `--scope` flag

```typescript
scope: {
  type: "string",
  description: "Scope level: global | workspace (default varies by target)",
},
```

- [x] 向 `install.ts` 添加 `scope` arg
- [x] 向 `convert.ts` 添加 `scope` arg

#### 4b. 使用 type guard 验证 scope

使用 proper type guard，而不是 unsafe `as TargetScope` cast：

```typescript
function isTargetScope(value: string): value is TargetScope {
  return value === "global" || value === "workspace"
}

const scopeValue = args.scope ? String(args.scope) : undefined
if (scopeValue !== undefined) {
  if (!target.supportedScopes) {
    throw new Error(`Target "${targetName}" does not support the --scope flag.`)
  }
  if (!isTargetScope(scopeValue) || !target.supportedScopes.includes(scopeValue)) {
    throw new Error(`Target "${targetName}" does not support --scope ${scopeValue}. Supported: ${target.supportedScopes.join(", ")}`)
  }
}
const resolvedScope = scopeValue ?? target.defaultScope ?? "workspace"
```

- [x] 添加 `isTargetScope` type guard
- [x] 在两个 commands 中添加 scope validation（single block，不做两份 separate checks）

### Research Insights（阶段 4b）

**TypeScript review：** 原 plan 在 validation 前使用 `scopeValue as TargetScope` cast，这是 type lie。使用 proper type guard function 保持 type system honest。

**Simplicity review：** 两步 validation（先 check supported，再 check exists）可以通过上面的 type guard approach 合成 single block。

#### 4c. 更新 output root resolution

两个 commands 现在都使用 Phase 0a 的 shared `resolveTargetOutputRoot`。

- [x] 对 primary target 调用 shared function，并传 `scope: resolvedScope`
- [x] Default scope：`target.defaultScope ?? "workspace"`（仅当 target supports scopes 时使用）

#### 4d. 处理 `--also` targets

`--scope` 只作用于 primary `--to` target。Extra `--also` targets 使用各自的 `defaultScope`。

- [x] 为 `--also` targets 传入 `handler.defaultScope`（每个使用自己的 default）
- [x] 更新两个 commands 中的 `--also` loop，使其使用 target-specific scope resolution

### Research Insights（阶段 4d）

**Architecture review：** 目前 users 无法为 `--also` target 指定 scope（例如 `--also windsurf:workspace`）。作为 v0.11.0 known limitation 接受。如果 users 需要 windsurf workspace scope，可以运行两条 separate commands。添加 code comment，说明未来 per-target scope overrides 会添加在哪里。

### 阶段 5：Tests

**文件：** `tests/windsurf-converter.test.ts`, `tests/windsurf-writer.test.ts`

#### 5a. 更新 converter tests

- [x] 移除所有 AGENTS.md tests（lines 275-303：empty plugin、CLAUDE.md missing）
- [x] 移除所有 `mcpSetupDoc` tests（lines 305-366：stdio、HTTP/SSE、redaction、null）
- [x] 更新 `fixturePlugin` default：移除 `agentsMd` 和 `mcpSetupDoc` references
- [x] 添加 `mcpConfig` tests：
  - stdio server 产生带 `command`, `args`, `env` 的 correct JSON structure
  - HTTP/SSE server 产生带 `serverUrl`, `headers` 的 correct JSON structure
  - mixed servers（stdio + HTTP）both included（两类 servers 都 included）
  - env vars included（not redacted）：verify actual values present（确认实际 values 存在）
  - `hasPotentialSecrets()` 对 sensitive keys emits console.warn
  - 没有 sensitive keys 时，`hasPotentialSecrets()` does NOT warn
  - no servers produces null mcpConfig（无 servers 时产生 null mcpConfig）
  - empty bundle has null mcpConfig（empty bundle 有 null mcpConfig）
  - 没有 command 和 URL 的 server is skipped with warning

#### 5b. 更新 writer tests

- [x] 移除 AGENTS.md tests（backup test、creation test、double-nesting AGENTS.md parent test）
- [x] 移除 double-nesting guard test（guard removed）
- [x] 移除 `mcp-setup.md` write test
- [x] 更新 `emptyBundle` fixture：移除 `agentsMd`、`mcpSetupDoc`，添加 `mcpConfig: null`
- [x] 添加 `mcp_config.json` tests：
  - writes mcp_config.json to outputRoot（写入到 outputRoot）
  - merges with existing mcp_config.json（合并 existing mcp_config.json，并 preserves user servers）
  - overwrite 前 backs up existing mcp_config.json
  - handles corrupted existing mcp_config.json（warn and replace；警告并替换）
  - handles existing mcp_config.json with array（not object）at root（处理 root 为 array 的情况）
  - handles existing mcp_config.json with `mcpServers: null`（处理 `mcpServers: null`）
  - preserves non-mcpServers keys in existing file（保留 existing file 中的 non-mcpServers keys）
  - server name collision：plugin entry wins（server name 冲突时 plugin entry 优先）
  - file permissions are 0o600（not world-readable；不是 world-readable）
- [x] 更新 full bundle test：writer 直接写入 outputRoot（无 `.windsurf/` nesting）

#### 5c. 添加 scope resolution tests

测试 shared `resolveTargetOutputRoot` function：

- [x] windsurf default scope 是 "global" → resolves to `~/.codeium/windsurf/`
- [x] Explicit `--scope workspace` → resolves to `cwd/.windsurf/`（显式 `--scope workspace` 解析到 `cwd/.windsurf/`）
- [x] `--output` overrides scope resolution（global 和 workspace 都是）
- [x] windsurf 的 invalid scope value → error
- [x] non-scope target（例如 opencode）上使用 `--scope` → error
- [x] `--also windsurf` 使用 windsurf default scope（"global"）
- [x] `isTargetScope` type guard 正确识别 valid/invalid values

### 阶段 6：Documentation

**文件：** `README.md`, `CHANGELOG.md`

- [x] 更新 README.md Windsurf section，提到 `--scope` flag 和 global default
- [x] 添加 v0.11.0 CHANGELOG entry，并记录 breaking changes
- [x] 记录 migration path：旧行为用 `--scope workspace`
- [x] 注明 Windsurf `mcp_config.json` 是 global-only（workspace MCP config 可能不会被 discover）

## 验收标准

- [x] `install compound-engineering --to windsurf` 默认写入 `~/.codeium/windsurf/`
- [x] `install compound-engineering --to windsurf --scope workspace` 写入 `cwd/.windsurf/`
- [x] `--output /custom/path` 对两个 commands 都 overrides scope
- [x] non-supporting target 上使用 `--scope` produces clear error
- [x] `mcp_config.json` 与 existing file merge（创建 backup，preserve user entries）
- [x] `mcp_config.json` 以 `0o600` permissions 写入（not world-readable）
- [x] 两种 scope 都不生成 AGENTS.md
- [x] Env var secrets included in `mcp_config.json`，并用 `console.warn` 列出 affected servers
- [x] stdio 和 HTTP/SSE MCP servers 都 included in `mcp_config.json`
- [x] 所有 existing tests 已更新，所有 new tests pass
- [x] 其他 targets 无 regressions
- [x] `resolveTargetOutputRoot` 已抽取为 shared utility（无 duplication）

## 依赖与风险

**Risk: Global workflow path is undocumented.** Windsurf 可能不会从 `~/.codeium/windsurf/workflows/` discover workflows。Mitigation：在 brainstorm 中记录为 known assumption。如果 global workflows 没有被 discover，users 可以用 `--scope workspace`。

**Risk: Breaking changes for existing v0.10.0 users.** Mitigation：清晰记录 migration path。`--scope workspace` 恢复 previous behavior。Target 是 experimental，user base 小。

**Risk: Workspace `mcp_config.json` not read by Windsurf.** 按 Windsurf docs，`mcp_config.json` 是 global-only configuration。Workspace scope 写入该 file 只是 forward-compatibility，并 emit warning。Primary use case 是 global scope。

**Risk: Secrets in `mcp_config.json` committed to git.** Mitigation：`0o600` file permissions、关于 sensitive env vars 的 console.warn、workspace scope 下关于 `.gitignore` 的 warning。

## 参考与调研

- Spec（规格）：`docs/specs/windsurf.md`（authoritative reference for component mapping）
- Kiro MCP merge pattern（Kiro MCP merge 模式）：[src/targets/kiro.ts:68-92](../../src/targets/kiro.ts)
- Sync secrets warning（sync secrets 警告）：[src/commands/sync.ts:20-28](../../src/commands/sync.ts)
- Windsurf MCP docs（Windsurf MCP 文档）：https://docs.windsurf.com/windsurf/cascade/mcp
- Windsurf Skills global path（Windsurf Skills 全局路径）：https://docs.windsurf.com/windsurf/cascade/skills
- Windsurf MCP tutorial（Windsurf MCP 教程）：https://windsurf.com/university/tutorials/configuring-first-mcp-server
- Adding converter targets（learning，经验）：[docs/solutions/adding-converter-target-providers.md](../solutions/adding-converter-target-providers.md)
- Plugin versioning（learning，经验）：[docs/solutions/plugin-versioning-requirements.md](../solutions/plugin-versioning-requirements.md)
