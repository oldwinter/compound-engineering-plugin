---
title: 添加新的 Converter Target Providers
category: architecture
tags: [converter, target-provider, plugin-conversion, multi-platform, pattern]
created: 2026-02-23
last_refreshed: 2026-06-23
severity: medium
component: converter-cli
problem_type: architecture_pattern
root_cause: architectural_pattern
---

# 添加新的 Converter Target Providers

## 问题

当为新的 AI platform 添加支持时，converter CLI architecture 要求 types、converters、writers、CLI integration 和 tests 之间保持一致实现。如果没有文档化的 patterns 和 learnings，新 targets 的实现会更慢，也更容易出现 architecture inconsistency。

## 方案

compound-engineering-plugin 使用一个已验证的 **6-phase target provider pattern**，并已应用到本 repo 维护的 converter targets。一些较旧的 converter modules 仍留在 tests 或 cleanup paths 中用于 compatibility，但当 harness 支持 native package/plugin mechanism 时，新的 user-facing installs 应优先使用 native mechanism。

1. **OpenCode**（primary target，reference implementation，主要参考实现）
2. **Codex**（second target，established pattern，已验证 pattern）
3. **Pi**（MCPorter ecosystem，MCPorter 生态）
4. **Antigravity CLI**（content transformation patterns，内容转换 patterns）
5. **Compatibility converter modules**，例如 Copilot、Droid 和 Kiro（在 regression coverage 或 cleanup support 仍然重要时保留）
6. **Historical removed targets**，例如 Windsurf、OpenClaw 和 Qwen（仅作为 archived lessons 使用）

每个 implementation 都精确遵循该 architecture，以确保 consistency 和 maintainability。

## 架构：6 阶段 Pattern

### Phase 1：Type Definitions（类型定义，`src/types/{target}.ts`）

**目的：** 为 intermediate bundle format 定义 TypeScript types

**关键模式：**

```typescript
// Exported bundle type used by converter and writer
export type {TargetName}Bundle = {
  // Component arrays matching the target format
  agents?: {TargetName}Agent[]
  commands?: {TargetName}Command[]
  skillDirs?: {TargetName}SkillDir[]
  mcpServers?: Record<string, {TargetName}McpServer>
  // Target-specific fields
  setup?: string  // Instructions file content
}

// Individual component types
export type {TargetName}Agent = {
  name: string
  content: string  // Full file content (with frontmatter if applicable)
  category?: string  // e.g., "agent", "rule", "playbook"
  meta?: Record<string, unknown>  // Target-specific metadata
}
```

**关键经验：**

- 始终包含 `content` field（完整 file text），而不是拆解后的 fields；这更简单，也匹配文件写入方式
- 对 complex sections 使用 intermediate types，让 section building 可以独立测试
- 除非必要，避免在 base bundle 中放 target-specific fields；目标是跨 targets 共享 structure
- 如果 target 有 file-type variants（agents vs. commands vs. rules），包含 `category` field

**参考实现：**
- OpenCode：`src/types/opencode.ts`（command + agent split，command 与 agent 拆分）
- Codex：`src/types/codex.ts`（agents plus optional copied skills，agents 与 optional copied skills）
- Pi：`src/types/pi.ts`（plugin/extension output，plugin/extension 输出）
- Antigravity：`src/types/antigravity.ts`（extension-style output，extension 风格输出）

---

### Phase 2：Converter（转换器，`src/converters/claude-to-{target}.ts`）

**目的：** 将 Claude Code plugin format 转换为 target-specific bundle format

**关键模式：**

```typescript
export type ClaudeTo{Target}Options = ClaudeToOpenCodeOptions  // Reuse common options

export function convertClaudeTo{Target}(
  plugin: ClaudePlugin,
  _options: ClaudeTo{Target}Options,
): {Target}Bundle {
  // Pre-scan: build maps for cross-reference resolution (agents, commands)
  // Needed if target requires deduplication or reference tracking
  const refMap: Record<string, string> = {}
  for (const agent of plugin.agents) {
    refMap[normalize(agent.name)] = macroName(agent.name)
  }

  // Phase 1: Convert agents
  const agents = plugin.agents.map(a => convert{Target}Agent(a, usedNames, refMap))

  // Phase 2: Convert commands (may depend on agent names for dedup)
  const commands = plugin.commands.map(c => convert{Target}Command(c, usedNames, refMap))

  // Phase 3: Handle skills (usually pass-through, sometimes conversion)
  const skillDirs = plugin.skills.map(s => ({ name: s.name, sourceDir: s.sourceDir }))

  // Phase 4: Convert MCP servers (target-specific prefixing/type mapping)
  const mcpConfig = convertMcpServers(plugin.mcpServers)

  // Phase 5: Warn on unsupported features
  if (plugin.hooks && Object.keys(plugin.hooks.hooks).length > 0) {
    console.warn("Warning: {Target} does not support hooks. Hooks were skipped.")
  }

  return { agents, commands, skillDirs, mcpConfig }
}
```

**Content Transformation（内容转换，`transformContentFor{Target}`）：**

应用于 agent bodies 和 command bodies，用于重写 paths、command references 和 agent mentions：

```typescript
export function transformContentFor{Target}(body: string): string {
  let result = body

  // 1. Rewrite paths (.claude/ → .github/, ~/.claude/ → ~/.{target}/)
  result = result
    .replace(/~\/\.claude\//g, `~/.${targetDir}/`)
    .replace(/\.claude\//g, `.${targetDir}/`)

  // 2. Transform Task agent calls (to natural language)
  const taskPattern = /Task\s+([a-z][a-z0-9-]*)\(([^)]+)\)/gm
  result = result.replace(taskPattern, (_match, agentName: string, args: string) => {
    const skillName = normalize(agentName)
    return `Use the ${skillName} skill to: ${args.trim()}`
  })

  // 3. Flatten slash commands (/workflows:plan → /plan)
  const slashPattern = /(?<![:\w])\/([a-z][a-z0-9_:-]*?)(?=[\s,."')\]}`]|$)/gi
  result = result.replace(slashPattern, (match, commandName: string) => {
    if (commandName.includes("/")) return match  // Skip file paths
    const normalized = normalize(commandName)
    return `/${normalized}`
  })

  // 4. Transform @agent-name references
  const agentPattern = /@([a-z][a-z0-9-]*-(?:agent|reviewer|analyst|...))/gi
  result = result.replace(agentPattern, (_match, agentName: string) => {
    return `the ${normalize(agentName)} agent`  // or "rule", "playbook", etc.
  })

  // 5. Remove examples (if target doesn't support them)
  result = result.replace(/<examples>[\s\S]*?<\/examples>/g, "")

  return result
}
```

**Deduplication Pattern（去重 pattern，`uniqueName`）：**

当 target 使用 flat namespaces（Copilot、Windsurf）或出现 name collisions 时使用：

```typescript
function uniqueName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base)
    return base
  }
  let index = 2
  while (used.has(`${base}-${index}`)) {
    index += 1
  }
  const name = `${base}-${index}`
  used.add(name)
  return name
}

function normalizeName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "item"
  const normalized = trimmed
    .toLowerCase()
    .replace(/[\\/]+/g, "-")
    .replace(/[:\s]+/g, "-")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
  return normalized || "item"
}

// Flatten: drops namespace prefix (workflows:plan → plan)
function flattenCommandName(name: string): string {
  const normalized = normalizeName(name)
  return normalized.replace(/^[a-z]+-/, "")  // Drop prefix before first dash
}
```

**关键经验：**

1. **预扫描 cross-references**：如果 target 需要 reference names（macros、URIs、IDs），在 conversion 前先构建 map，以避免 name collisions 并支持 deduplication。

2. **Content transformation 很脆弱**：需要充分测试。适用于 slash commands 的 patterns 可能误匹配 file paths。使用 negative lookahead 跳过 `/etc`、`/usr`、`/var` 等。

3. **简化 heuristics，信任 structural mapping**：不要尝试解析 agent body 中的 “You are...” 或 “NEVER do...” patterns。改为映射 agent.description → Overview、agent.body → Procedure、agent.capabilities → Specifications。Heuristics 在 edge cases 上容易失败，也难测试。

4. **尽早且一致地 normalize**：全程使用同一个 `normalizeName()` function。不一致的 normalization 会导致 deduplication bugs。

5. **MCP servers 需要 target-specific handling：**
   - **OpenCode:** Merge into `opencode.json`（合并到 `opencode.json`，preserve user keys）
   - **Pi:** Emit extension/package metadata without requiring CE-owned subagent extensions（输出 extension/package metadata，不要求 CE-owned subagent extensions）
   - **Antigravity:** Prefer native extension manifests and skip unsupported Claude-only surfaces（优先 native extension manifests，跳过 unsupported Claude-only surfaces）

6. **对 unsupported features 发出 warning**：Hooks 和 target-incompatible MCP types 应输出到 stderr 并继续 conversion。

**参考实现：**
- OpenCode：`src/converters/claude-to-opencode.ts`（most comprehensive，最完整）
- Codex：`src/converters/claude-to-codex.ts`（native-plugin-compatible default with legacy include-skills path，默认兼容 native plugin，并保留 legacy include-skills path）
- Pi：`src/converters/claude-to-pi.ts`（Pi plugin metadata，Pi plugin metadata）
- Antigravity：`src/converters/claude-to-antigravity.ts`（Antigravity extension output，Antigravity extension 输出）
- Windsurf：`src/converters/claude-to-windsurf.ts`（rules-based conversion，基于 rules 的转换）

---

### Phase 3：Writer（写入器，`src/targets/{target}.ts`）

**目的：** 按 target-specific directory structure 将 converted bundle 写入磁盘

**关键模式：**

```typescript
export async function write{Target}Bundle(outputRoot: string, bundle: {Target}Bundle): Promise<void> {
  const paths = resolve{Target}Paths(outputRoot)
  await ensureDir(paths.root)

  // Write each component type
  if (bundle.agents?.length > 0) {
    const agentsDir = path.join(paths.root, "agents")
    for (const agent of bundle.agents) {
      await writeText(path.join(agentsDir, `${agent.name}.ext`), agent.content + "\n")
    }
  }

  if (bundle.commands?.length > 0) {
    const commandsDir = path.join(paths.root, "commands")
    for (const command of bundle.commands) {
      await writeText(path.join(commandsDir, `${command.name}.ext`), command.content + "\n")
    }
  }

  // Copy skills (pass-through case)
  if (bundle.skillDirs?.length > 0) {
    const skillsDir = path.join(paths.root, "skills")
    for (const skill of bundle.skillDirs) {
      await copyDir(skill.sourceDir, path.join(skillsDir, skill.name))
    }
  }

  // Write generated skills (converted from commands)
  if (bundle.generatedSkills?.length > 0) {
    const skillsDir = path.join(paths.root, "skills")
    for (const skill of bundle.generatedSkills) {
      await writeText(path.join(skillsDir, skill.name, "SKILL.md"), skill.content + "\n")
    }
  }

  // Write MCP config (target-specific location and format)
  if (bundle.mcpServers && Object.keys(bundle.mcpServers).length > 0) {
    const mcpPath = path.join(paths.root, "mcp.json")  // or copilot-mcp-config.json, etc.
    const backupPath = await backupFile(mcpPath)
    if (backupPath) {
      console.log(`Backed up existing MCP config to ${backupPath}`)
    }
    await writeJson(mcpPath, { mcpServers: bundle.mcpServers })
  }

  // Write instructions or setup guides
  if (bundle.setupInstructions) {
    const setupPath = path.join(paths.root, "setup-instructions.md")
    await writeText(setupPath, bundle.setupInstructions + "\n")
  }
}

// Avoid double-nesting (.target/.target/)
function resolve{Target}Paths(outputRoot: string) {
  const base = path.basename(outputRoot)
  // If already pointing at .target, write directly into it
  if (base === ".target") {
    return { root: outputRoot }
  }
  // Otherwise nest under .target
  return { root: path.join(outputRoot, ".target") }
}
```

**备份模式（仅 MCP configs）：**

MCP configs 通常已经存在且由用户手工编辑。覆盖前先备份：

```typescript
// From src/utils/files.ts
export async function backupFile(filePath: string): Promise<string | null> {
  if (!existsSync(filePath)) return null
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const dirname = path.dirname(filePath)
  const basename = path.basename(filePath)
  const ext = path.extname(basename)
  const name = basename.slice(0, -ext.length)
  const backupPath = path.join(dirname, `${name}.${timestamp}${ext}`)
  await copyFile(filePath, backupPath)
  return backupPath
}
```

**关键经验：**

1. **始终检查 double-nesting**：如果 output root 已经是 `.target`，不要再次嵌套。Pattern：
   ```typescript
   if (path.basename(outputRoot) === ".target") {
     return { root: outputRoot }  // Write directly
   }
   return { root: path.join(outputRoot, ".target") }  // Nest
   ```

2. **使用 `writeText` 和 `writeJson` helpers**：它们会一致处理 directory creation 和 line endings

3. **覆盖前备份 MCP configs**：MCP JSON files 经常被手工编辑。始终使用 timestamp 备份。

4. **Empty bundles 应优雅成功**：component array 为空时不要失败。许多 plugins 可能没有 commands 或 skills。

5. **File extensions 很重要**：精确匹配 target conventions：
   - Copilot: agents 使用 `.md`（VS Code 会把 `.agent.md` 解析为 Copilot format，并静默 drop Claude-style tool names；`.md` 会触发 Claude format detection，并将 tools 映射到 VS Code equivalents）
   - Windsurf: rules 使用 `.md`
   - OpenCode: commands 使用 `.md`

6. **Sensitive files 的 permissions**：带 API keys 的 MCP config 应使用 `0o600`：
   ```typescript
   await writeJson(mcpPath, config, { mode: 0o600 })
   ```

**参考实现：**
- Droid: `src/targets/droid.ts`（simpler pattern, good for learning，较简单、适合学习）
- Copilot: `src/targets/copilot.ts`（double-nesting pattern，双层嵌套防护 pattern）
- Windsurf: `src/targets/windsurf.ts`（rules-based output，基于 rules 的输出）

---

### Phase 4：CLI 接线

**文件：`src/targets/index.ts`**

在 global target registry 中注册新 target：

```typescript
import { convertClaudeTo{Target} } from "../converters/claude-to-{target}"
import { write{Target}Bundle } from "./{target}"
import type { {Target}Bundle } from "../types/{target}"

export const targets: Record<string, TargetHandler<any>> = {
  // ... existing targets ...
  {target}: {
    name: "{target}",
    implemented: true,
    convert: convertClaudeTo{Target} as TargetHandler<{Target}Bundle>["convert"],
    write: write{Target}Bundle as TargetHandler<{Target}Bundle>["write"],
  },
}
```

**文件：`src/commands/convert.ts` 和 `src/commands/install.ts`**

添加 output root resolution：

```typescript
// In resolveTargetOutputRoot()
if (targetName === "{target}") {
  return path.join(outputRoot, ".{target}")
}

// Update --to flag description
const toDescription = "Target format (opencode | codex | pi | antigravity | all)"
```

---

### Phase 5：同步支持（可选）

**文件：`src/sync/{target}.ts`**

如果 target 支持同步 personal skills 和 MCP servers：

```typescript
export async function syncTo{Target}(outputRoot: string): Promise<void> {
  const personalSkillsDir = path.join(expandHome("~/.claude/skills"))
  const personalSettings = loadSettings(expandHome("~/.claude/settings.json"))

  const skillsDest = path.join(outputRoot, ".{target}", "skills")
  await ensureDir(skillsDest)

  // Symlink personal skills
  if (existsSync(personalSkillsDir)) {
    const skills = readdirSync(personalSkillsDir)
    for (const skill of skills) {
      if (!isValidSkillName(skill)) continue
      const source = path.join(personalSkillsDir, skill)
      const dest = path.join(skillsDest, skill)
      await forceSymlink(source, dest)
    }
  }

  // Merge MCP servers if applicable
  if (personalSettings.mcpServers) {
    const mcpPath = path.join(outputRoot, ".{target}", "mcp.json")
    const existing = readJson(mcpPath) || {}
    const merged = {
      ...existing,
      mcpServers: {
        ...existing.mcpServers,
        ...personalSettings.mcpServers,
      },
    }
    await writeJson(mcpPath, merged, { mode: 0o600 })
  }
}
```

**文件：`src/commands/sync.ts`**

```typescript
// Add to validTargets array
const validTargets = ["opencode", "codex", "pi", "gemini", "{target}"] as const

// In resolveOutputRoot()
case "{target}":
  return path.join(process.cwd(), ".{target}")

// In main switch
case "{target}":
  await syncTo{Target}(outputRoot)
  break
```

---

### Phase 6：测试

**文件：`tests/{target}-converter.test.ts`**

使用 inline `ClaudePlugin` fixtures 测试 converter：

```typescript
describe("convertClaudeTo{Target}", () => {
  it("converts agents to {target} format", () => {
    const plugin: ClaudePlugin = {
      name: "test",
      agents: [
        {
          name: "test-agent",
          description: "Test description",
          body: "Test body",
          capabilities: ["Cap 1", "Cap 2"],
        },
      ],
      commands: [],
      skills: [],
    }

    const bundle = convertClaudeTo{Target}(plugin, {})

    expect(bundle.agents).toHaveLength(1)
    expect(bundle.agents[0].name).toBe("test-agent")
    expect(bundle.agents[0].content).toContain("Test description")
  })

  it("normalizes agent names", () => {
    const plugin: ClaudePlugin = {
      name: "test",
      agents: [
        { name: "Test Agent", description: "", body: "", capabilities: [] },
      ],
      commands: [],
      skills: [],
    }

    const bundle = convertClaudeTo{Target}(plugin, {})
    expect(bundle.agents[0].name).toBe("test-agent")
  })

  it("deduplicates colliding names", () => {
    const plugin: ClaudePlugin = {
      name: "test",
      agents: [
        { name: "Agent Name", description: "", body: "", capabilities: [] },
        { name: "Agent Name", description: "", body: "", capabilities: [] },
      ],
      commands: [],
      skills: [],
    }

    const bundle = convertClaudeTo{Target}(plugin, {})
    expect(bundle.agents.map(a => a.name)).toEqual(["agent-name", "agent-name-2"])
  })

  it("transforms content paths (.claude → .{target})", () => {
    const result = transformContentFor{Target}("See ~/.claude/config")
    expect(result).toContain("~/.{target}/config")
  })

  it("warns when hooks are present", () => {
    const spy = jest.spyOn(console, "warn")
    const plugin: ClaudePlugin = {
      name: "test",
      agents: [],
      commands: [],
      skills: [],
      hooks: { hooks: { "file:save": "test" } },
    }

    convertClaudeTo{Target}(plugin, {})
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("hooks"))
  })
})
```

**文件：`tests/{target}-writer.test.ts`**

使用 temp directories（来自 `tmp` package）测试 writer：

```typescript
describe("write{Target}Bundle", () => {
  it("writes agents to {target} format", async () => {
    const tmpDir = await tmp.dir()
    const bundle: {Target}Bundle = {
      agents: [{ name: "test", content: "# Test\nBody" }],
      commands: [],
      skillDirs: [],
    }

    await write{Target}Bundle(tmpDir.path, bundle)

    const written = readFileSync(path.join(tmpDir.path, ".{target}", "agents", "test.ext"), "utf-8")
    expect(written).toContain("# Test")
  })

  it("does not double-nest when output root is .{target}", async () => {
    const tmpDir = await tmp.dir()
    const targetDir = path.join(tmpDir.path, ".{target}")
    await ensureDir(targetDir)

    const bundle: {Target}Bundle = {
      agents: [{ name: "test", content: "# Test" }],
      commands: [],
      skillDirs: [],
    }

    await write{Target}Bundle(targetDir, bundle)

    // Should write to targetDir directly, not targetDir/.{target}
    const written = path.join(targetDir, "agents", "test.ext")
    expect(existsSync(written)).toBe(true)
  })

  it("backs up existing MCP config", async () => {
    const tmpDir = await tmp.dir()
    const mcpPath = path.join(tmpDir.path, ".{target}", "mcp.json")
    await ensureDir(path.dirname(mcpPath))
    await writeJson(mcpPath, { existing: true })

    const bundle: {Target}Bundle = {
      agents: [],
      commands: [],
      skillDirs: [],
      mcpServers: { "test": { command: "test" } },
    }

    await write{Target}Bundle(tmpDir.path, bundle)

    // Backup should exist
    const backups = readdirSync(path.dirname(mcpPath)).filter(f => f.includes("mcp") && f.includes("-"))
    expect(backups.length).toBeGreaterThan(0)
  })
})
```

**关键测试模式：**

- 分别测试 normalization、deduplication、content transformation
- 使用 inline plugin fixtures（不要使用 file-based fixtures）
- writer tests 使用 temp directories，并验证文件存在
- 测试 edge cases：empty names、empty bodies、special characters
- 测试 error handling：missing files、permission issues

---

## 文档要求

**文件：`docs/specs/{target}.md`**

记录 target format specification：

- 最后验证日期（链接到官方 docs）
- Config file locations（config file 位置：project-level vs. user-level）
- Agent/command/skill format 及 field descriptions
- MCP configuration structure（MCP config 结构）
- Character limits（如有）
- Example file（示例文件）

**文件：`README.md`**

添加到 supported targets list，并包含 usage examples。

---

## 常见陷阱与解决方案

| 陷阱 | 解决方案 |
|---------|----------|
| **Double-nesting** (`.copilot/.copilot/`) | 嵌套前检查 `path.basename(outputRoot)` |
| **Name normalization 不一致** | 全程使用单一 `normalizeName()` function |
| **Content transformation 脆弱** | 用 edge cases（file paths、URLs）测试 regex patterns |
| **Heuristic section extraction 失败** | 改用 structural mapping（description → Overview、body → Procedure） |
| **MCP config 覆盖用户 edits** | 覆盖前始终使用 timestamp 备份 |
| **Skill body 未加载** | 确认 `ClaudeSkill` 有用于读取文件的 `skillPath` field |
| **缺少 deduplication** | conversion 前构建 `usedNames` set，并传给每个 converter |
| **Unsupported features 导致静默丢失** | 始终 warn to stderr（hooks、incompatible MCP types 等） |
| **Test isolation failure** | 每个 test 使用唯一 temp directory，结束后清理 |
| **Flattening 后 command namespace collision** | 使用带 deduplication 的 `uniqueName()`，并测试多重 collisions |

---

## 添加新 Target 的 Checklist

添加新的 target provider 时使用此 checklist：

### 实现
- [ ] 创建包含 bundle 和 component types 的 `src/types/{target}.ts`
- [ ] 实现包含 converter 和 content transformer 的 `src/converters/claude-to-{target}.ts`
- [ ] 实现包含 writer 的 `src/targets/{target}.ts`
- [ ] 在 `src/targets/index.ts` 注册 target
- [ ] 更新 `src/commands/convert.ts`（添加 output root resolution，更新 help text）
- [ ] 更新 `src/commands/install.ts`（与 convert.ts 相同）
- [ ] （可选）实现 `src/sync/{target}.ts` 并更新 `src/commands/sync.ts`

### 测试
- [ ] 创建带 converter tests 的 `tests/{target}-converter.test.ts`
- [ ] 创建带 writer tests 的 `tests/{target}-writer.test.ts`
- [ ] （可选）创建带 sync tests 的 `tests/sync-{target}.test.ts`
- [ ] 运行完整 test suite：`bun test`
- [ ] 手工测试：`bun run src/index.ts convert --to {target} ./plugins/compound-engineering`

### 文档
- [ ] 创建带 format specification 的 `docs/specs/{target}.md`
- [ ] 更新 `README.md`，在列表和 usage examples 中加入 target
- [ ] 不要手工添加 release notes；release automation 拥有 GitHub release notes 和 release-owned versions

### Version bumping（版本 bump）
- [ ] 使用 conventional `feat:` 或 `fix:` title，让 release automation 能推断正确 bump
- [ ] 不要手动启动或手动 bump `package.json` 或 plugin manifests 中 release-owned version lines
- [ ] 如果 component counts 或 descriptions 变化，运行 `bun run release:validate`

---

## 参考资料

### 实现示例

**按优先级排列的 reference implementations（从易到难）：**

1. **Droid** (`src/targets/droid.ts`, `src/converters/claude-to-droid.ts`)：最简单的 pattern，适合作为学习 baseline
2. **Copilot** (`src/targets/copilot.ts`, `src/converters/claude-to-copilot.ts`)：MCP prefixing（MCP 前缀处理）、double-nesting guard（双层嵌套防护）
3. **Windsurf** (`src/targets/windsurf.ts`, `src/converters/claude-to-windsurf.ts`)：Rules-based conversion（基于 rules 的转换）
4. **OpenCode** (`src/converters/claude-to-opencode.ts`)：最全面，处理 command structure 和 config merging

### 关键工具

- `src/utils/frontmatter.ts` — `formatFrontmatter()` 和 `parseFrontmatter()`
- `src/utils/files.ts` — `writeText()`, `writeJson()`, `copyDir()`, `backupFile()`, `ensureDir()`
- `src/utils/resolve-home.ts` — 用于 `~/.{target}` path resolution 的 `expandHome()`

### 现有测试

- `tests/copilot-writer.test.ts` — 使用 temp directories 的 writer tests
- `tests/sync-copilot.test.ts` — 带 symlinks 和 config merge 的 sync pattern

---

## 相关文件

- `.claude-plugin/plugin.json` — version 和 component counts
- `CHANGELOG.md` — 指向 canonical GitHub release history
- `README.md` — 所有 targets 的 usage examples
- `docs/solutions/plugin-versioning-requirements.md` — release checklist
