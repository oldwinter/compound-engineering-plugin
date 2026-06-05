---
title: 自动检测 install targets 并添加 Gemini sync
type: feat
status: completed
date: 2026-02-14
completed_date: 2026-02-14
completed_by: "Claude Opus 4.6"
actual_effort: "Completed in one session"
---

# 自动检测 Install Targets 并添加 Gemini Sync

## 概览

converter CLI 的两项相关改进：

1. **`install --to all`** -- auto-detect 已安装的 AI coding tools，并用一条 command convert to all of them
2. **`sync --target gemini`** -- 添加 Gemini CLI 作为 sync target（当前缺失），然后添加 `sync --target all`，将 personal config sync 到所有 detected tools

## 问题陈述

用户当前必须运行 6 条 separate commands 才能 install to all targets：

```bash
bunx @every-env/compound-plugin install compound-engineering --to opencode
bunx @every-env/compound-plugin install compound-engineering --to codex
bunx @every-env/compound-plugin install compound-engineering --to droid
bunx @every-env/compound-plugin install compound-engineering --to cursor
bunx @every-env/compound-plugin install compound-engineering --to pi
bunx @every-env/compound-plugin install compound-engineering --to gemini
```

同样，sync 也需要 per target 单独运行 commands。而且 Gemini sync 还不存在。

## 验收标准

### Auto-detect install（自动检测安装）

- [x] `install --to all` 检测已安装 tools，并 install 到每一个
- [x] Detection 检查每个 tool 的 config directories 和/或 binaries
- [x] 打印哪些 tools 被 detected、哪些被 skipped
- [x] 没有 detection signal 的 tools 会被 skipped（not errored）
- [x] `convert --to all` 也可用（same detection logic）
- [x] Existing `--to <target>` behavior unchanged（既有行为不变）
- [x] detection logic 和 `all` target handling 有 tests

### Gemini sync（Gemini 同步）

- [x] `sync --target gemini` symlink skills，并将 MCP servers 写入 `.gemini/settings.json`
- [x] MCP servers merged into existing `settings.json`（与 writer 使用相同 pattern）
- [x] `gemini` 已添加到 `sync.ts` 的 `validTargets`
- [x] Gemini sync 有 tests

### Sync all（同步全部）

- [x] `sync --target all` sync 到所有 detected tools
- [x] 复用与 install 相同的 detection logic
- [x] 打印 synced 内容与位置的 summary

## 实现

### Phase 1：Tool Detection Utility（tool 检测工具）

**创建 `src/utils/detect-tools.ts`**

```typescript
import os from "os"
import path from "path"
import { pathExists } from "./files"

export type DetectedTool = {
  name: string
  detected: boolean
  reason: string // e.g. "found ~/.codex/" or "not found"
}

export async function detectInstalledTools(): Promise<DetectedTool[]> {
  const home = os.homedir()
  const cwd = process.cwd()

  const checks: Array<{ name: string; paths: string[] }> = [
    { name: "opencode", paths: [path.join(home, ".config", "opencode"), path.join(cwd, ".opencode")] },
    { name: "codex", paths: [path.join(home, ".codex")] },
    { name: "droid", paths: [path.join(home, ".factory")] },
    { name: "cursor", paths: [path.join(cwd, ".cursor"), path.join(home, ".cursor")] },
    { name: "pi", paths: [path.join(home, ".pi")] },
    { name: "gemini", paths: [path.join(cwd, ".gemini"), path.join(home, ".gemini")] },
  ]

  const results: DetectedTool[] = []
  for (const check of checks) {
    let detected = false
    let reason = "not found"
    for (const p of check.paths) {
      if (await pathExists(p)) {
        detected = true
        reason = `found ${p}`
        break
      }
    }
    results.push({ name: check.name, detected, reason })
  }
  return results
}

export async function getDetectedTargetNames(): Promise<string[]> {
  const tools = await detectInstalledTools()
  return tools.filter((t) => t.detected).map((t) => t.name)
}
```

**Detection heuristics（检测启发式）：**

| Tool | Check paths | Notes |
|------|------------|-------|
| OpenCode | `~/.config/opencode/`, `.opencode/` | XDG config or project-local |
| Codex | `~/.codex/` | Global only |
| Droid | `~/.factory/` | Global only |
| Cursor | `.cursor/`, `~/.cursor/` | Project-local or global |
| Pi | `~/.pi/` | Global only |
| Gemini | `.gemini/`, `~/.gemini/` | Project-local or global |

### Phase 2：Gemini Sync（Gemini 同步）

**创建 `src/sync/gemini.ts`**

Follow the Cursor sync pattern（`src/sync/cursor.ts`），因为两者都使用包含 `mcpServers` key 的 JSON config：

```typescript
import path from "path"
import { symlinkSkills } from "../utils/symlink"
import { backupFile, pathExists, readJson, writeJson } from "../utils/files"
import type { ClaudeMcpServer } from "../types/claude"

export async function syncToGemini(
  skills: { name: string; sourceDir: string }[],
  mcpServers: Record<string, ClaudeMcpServer>,
  outputRoot: string,
): Promise<void> {
  const geminiDir = path.join(outputRoot, ".gemini")

  // Symlink skills
  if (skills.length > 0) {
    const skillsDir = path.join(geminiDir, "skills")
    await symlinkSkills(skills, skillsDir)
  }

  // Merge MCP servers into settings.json
  if (Object.keys(mcpServers).length > 0) {
    const settingsPath = path.join(geminiDir, "settings.json")
    let existing: Record<string, unknown> = {}
    if (await pathExists(settingsPath)) {
      await backupFile(settingsPath)
      try {
        existing = await readJson<Record<string, unknown>>(settingsPath)
      } catch {
        console.warn("Warning: existing settings.json could not be parsed and will be replaced.")
      }
    }

    const existingMcp = (existing.mcpServers && typeof existing.mcpServers === "object")
      ? existing.mcpServers as Record<string, unknown>
      : {}

    const merged = { ...existing, mcpServers: { ...existingMcp, ...convertMcpServers(mcpServers) } }
    await writeJson(settingsPath, merged)
  }
}

function convertMcpServers(servers: Record<string, ClaudeMcpServer>) {
  const result: Record<string, Record<string, unknown>> = {}
  for (const [name, server] of Object.entries(servers)) {
    const entry: Record<string, unknown> = {}
    if (server.command) {
      entry.command = server.command
      if (server.args?.length) entry.args = server.args
      if (server.env && Object.keys(server.env).length > 0) entry.env = server.env
    } else if (server.url) {
      entry.url = server.url
      if (server.headers && Object.keys(server.headers).length > 0) entry.headers = server.headers
    }
    result[name] = entry
  }
  return result
}
```

**更新 `src/commands/sync.ts`：**

- 将 `"gemini"` 添加到 `validTargets` array
- 从 `../sync/gemini` import `syncToGemini`
- 在 switch 中添加 `"gemini"` case，调用 `syncToGemini(skills, mcpServers, outputRoot)`

### Phase 3：将 `--to all` 接入 Install 和 Convert

**修改 `src/commands/install.ts`：**

```typescript
import { detectInstalledTools } from "../utils/detect-tools"

// In args definition, update --to description:
to: {
  type: "string",
  default: "opencode",
  description: "Target format (opencode | codex | droid | cursor | pi | gemini | all)",
},

// In run(), before the existing target lookup:
if (targetName === "all") {
  const detected = await detectInstalledTools()
  const activeTargets = detected.filter((t) => t.detected)

  if (activeTargets.length === 0) {
    console.log("No AI coding tools detected. Install at least one tool first.")
    return
  }

  console.log(`Detected ${activeTargets.length} tools:`)
  for (const tool of detected) {
    console.log(`  ${tool.detected ? "✓" : "✗"} ${tool.name} — ${tool.reason}`)
  }

  // Install to each detected target
  for (const tool of activeTargets) {
    const handler = targets[tool.name]
    const bundle = handler.convert(plugin, options)
    if (!bundle) continue
    const root = resolveTargetOutputRoot(tool.name, outputRoot, codexHome, piHome, hasExplicitOutput)
    await handler.write(root, bundle)
    console.log(`Installed ${plugin.manifest.name} to ${tool.name} at ${root}`)
  }

  // Codex post-processing
  if (activeTargets.some((t) => t.name === "codex")) {
    await ensureCodexAgentsFile(codexHome)
  }
  return
}
```

**在 `src/commands/convert.ts` 中做相同变更**，使用它自己的 `resolveTargetOutputRoot` version。

### Phase 4：将 `--target all` 接入 Sync

**修改 `src/commands/sync.ts`：**

```typescript
import { detectInstalledTools } from "../utils/detect-tools"

// Update validTargets:
const validTargets = ["opencode", "codex", "pi", "droid", "cursor", "gemini", "all"] as const

// In run(), handle "all":
if (targetName === "all") {
  const detected = await detectInstalledTools()
  const activeTargets = detected.filter((t) => t.detected).map((t) => t.name)

  if (activeTargets.length === 0) {
    console.log("No AI coding tools detected.")
    return
  }

  console.log(`Syncing to ${activeTargets.length} detected tools...`)
  for (const name of activeTargets) {
    // call existing sync logic for each target
  }
  return
}
```

### Phase 5：Tests（测试）

**创建 `tests/detect-tools.test.ts`**

- 使用 mocked directories 测试 detection（create temp dirs, check detection）
- 测试 `getDetectedTargetNames` 只返回 detected tools
- 测试 empty detection returns empty array

**创建 `tests/gemini-sync.test.ts`**

遵循 `tests/sync-cursor.test.ts` pattern:

- 测试 skills are symlinked to `.gemini/skills/`
- 测试 MCP servers merged into `settings.json`
- 测试 existing `settings.json` is backed up
- 测试 empty skills/servers produce no output

**更新 `tests/cli.test.ts`**

- 测试 `--to all` flag is accepted
- 测试 `sync --target all` is accepted
- 测试 `sync --target gemini` is accepted

### Phase 6：Documentation（文档）

**更新 `README.md`：**

添加到 install section:
```bash
# auto-detect installed tools and install to all
bunx @every-env/compound-plugin install compound-engineering --to all
```

添加到 sync section:
```bash
# Sync to Gemini
bunx @every-env/compound-plugin sync --target gemini

# Sync to all detected tools
bunx @every-env/compound-plugin sync --target all
```

## 不做什么

- 不添加 binary detection（`which cursor`, `which gemini`）-- directory checks 足够，且不需要 shell execution
- 不添加 interactive prompts（"Install to Cursor? y/n"）-- auto-detect 是 fire-and-forget
- 不添加用于跳过 specific targets 的 `--exclude` flag -- 可用 `--to X --also Y` 做 manual selection
- 不把 Gemini 加入 `sync` symlink watcher（任何 target 都没有 watcher）

## 复杂度评估

**Low-medium change.** 所有 patterns 都已建立：
- Detection utility 是新的但简单（pathExists checks）
- Gemini sync 精确遵循 cursor sync pattern
- `--to all` 是 plumbing -- iterate detected tools through existing handlers
- 无 new dependencies needed

## 参考资料

- Cursor sync（reference pattern，参考模式）：`src/sync/cursor.ts`
- Gemini writer（merge pattern，合并模式）：`src/targets/gemini.ts`
- Install command（install command，安装命令）：`src/commands/install.ts`
- Sync command（sync command，同步命令）：`src/commands/sync.ts`
- File utilities（file utilities，文件工具）：`src/utils/files.ts`
- Symlink utilities（symlink utilities，symlink 工具）：`src/utils/symlink.ts`

## 完成摘要

### 交付内容
- Tool detection utility（`src/utils/detect-tools.ts`），包含 `detectInstalledTools()` 和 `getDetectedTargetNames()`
- Gemini sync（`src/sync/gemini.ts`），遵循 cursor sync pattern -- symlinks skills，merges MCP servers into `settings.json`
- `install --to all` 和 `convert --to all` 会 auto-detect，并 install to all detected tools
- `sync --target gemini` 已添加到 sync command
- `sync --target all` 会 sync 到所有 detected tools，并输出 summary
- 2 个 test files 中新增 8 个 tests（detect-tools + sync-gemini）

### 实现统计
- 4 个 new files，3 个 modified files
- 139 tests passing（8 new + 131 existing；139 个测试通过）
- 无 new dependencies

### Git Commits（Git commits，Git 提交）
- `e4d730d` feat: add detect-tools utility and Gemini sync with tests
- `bc655f7` feat: wire --to all into install/convert and --target all/gemini into sync
- `877e265` docs: add auto-detect and Gemini sync to README, bump to 0.8.0

### 完成详情
- **Completed By（完成者）：** Claude Opus 4.6
- **Date（日期）：** 2026-02-14
- **Session（会话）：** Single session, TDD approach
