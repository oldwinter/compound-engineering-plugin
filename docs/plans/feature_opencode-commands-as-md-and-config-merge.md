# Feature: OpenCode Commands 改为 .md Files、Config Merge 和 Permissions Default 修复

**类型:** feature + bug fix（consolidated）
**日期:** 2026-02-20
**起点:** Branch `main` at commit `174cd4c`
**创建 feature branch:** `feature/opencode-commands-md-merge-permissions`
**基线测试:** 180 pass, 0 fail（开始前运行 `bun test` 确认）

---

## 上下文

### 面向用户的目标

运行 `bunx @every-env/compound-plugin install compound-engineering --to opencode` 时，当前存在三个问题：

1. **Commands overwrite `opencode.json`**：Plugin commands 被写入 `opencode.json` 的 `command` key，这会替换 user 的 existing configuration file（writer 执行 `writeJson(configPath, bundle.config)`，即 full overwrite）。user 会丢失个人 settings（model、theme、provider keys、之前配置的 MCP servers）。

2. **Commands should be `.md` files, not JSON**：OpenCode 支持将 commands 定义为 `~/.config/opencode/commands/` 下的独立 `.md` files。这是 additive 且 non-destructive 的形式：每个 command 一个文件，永不触碰 `opencode.json`。

3. **`--permissions broad` is the default and pollutes global config**：`--permissions` flag 默认是 `"broad"`，每次 install 都会把 14 个 `permission: allow` entries 和 14 个 `tools: true` entries 写入 `opencode.json`。这些是影响所有 OpenCode sessions 的 global settings，不只是 plugin commands。即使 `--permissions from-commands` 在语义上也是错的：它把 per-command `allowedTools` restrictions union 成一个 global block，反转了 restriction semantics（一个只允许 `Read` 的 command 与一个允许 `Bash` 的 command 合并后，会产生 global `bash: allow`）。

### 本计划完成后的预期行为

- Commands 写为带 YAML frontmatter（`description`、`model`）的 `~/.config/opencode/commands/<name>.md`。`command` key 永不写入 `opencode.json`。
- `opencode.json` 进行 deep-merge（而不是 overwrite）：existing user keys 保留，plugin 的 MCP servers 被添加。冲突时 user values 胜出。
- `--permissions` 默认改为 `"none"`：除非 user 显式传入 `--permissions broad` 或 `--permissions from-commands`，否则不向 `opencode.json` 写入 `permission` 或 `tools` entries。

### 相关文件路径

| File | `main` 上当前状态 | 变更内容 |
|---|---|---|
| `src/types/opencode.ts` | `OpenCodeBundle` 没有 `commandFiles` field。有 `OpenCodeCommandConfig` type 和 `OpenCodeConfig` 上的 `command` field。 | 添加 `OpenCodeCommandFile` type。向 `OpenCodeBundle` 添加 `commandFiles`。移除 `OpenCodeCommandConfig` type 和 `OpenCodeConfig` 上的 `command` field。 |
| `src/converters/claude-to-opencode.ts` | `convertCommands()` 返回 `Record<string, OpenCodeCommandConfig>`。结果设置到 `config.command`。`applyPermissions()` 写入 `config.permission` 和 `config.tools`。 | `convertCommands()` 返回 `OpenCodeCommandFile[]`。永不设置 `config.command`。`applyPermissions()` 本身不改。 |
| `src/targets/opencode.ts` | `writeOpenCodeBundle()` 执行 `writeJson(configPath, bundle.config)`，即 full overwrite。没有 `commandsDir`。没有 merge logic。 | 向 path resolver 添加 `commandsDir`。写入 command `.md` files，并先 backup。用 `mergeOpenCodeConfig()` 替代 overwrite：读取 existing、deep-merge、写回。 |
| `src/commands/install.ts` | `--permissions` 默认是 `"broad"`（line 51）。 | 将 default 改为 `"none"`。更新 description string。 |
| `src/utils/files.ts` | 已有 `readJson()`、`pathExists()`、`backupFile()`。 | 无需改动：utilities 已存在。 |
| `tests/converter.test.ts` | Tests 引用 `bundle.config.command`（lines 19、74、202-214、243）。Test `"maps commands, permissions, and agents"` 测试 `from-commands` mode。 | 全部更新为使用 `bundle.commandFiles`。重命名 permission-related test，明确它是 opt-in behavior。 |
| `tests/opencode-writer.test.ts` | 4 个 tests，bundles 中没有 `commandFiles`。`"backs up existing opencode.json before overwriting"` test 期望 full overwrite。 | 向所有 existing bundles 添加 `commandFiles: []`。重写 backup test，使其测试 merge behavior。新增 command file writing 和 merge tests。 |
| `tests/cli.test.ts` | 10 个 tests。没有检查 commands directory。 | 新增 `--permissions none` default test。新增 command `.md` file existence test。 |
| `AGENTS.md` | Line 10: "Keep OpenCode output at `opencode.json` and `.opencode/{agents,skills,plugins}`." | 更新为记录 commands 写入 `commands/<name>.md`，`opencode.json` 会 deep-merge。 |
| `README.md` | Line 54: "OpenCode output is written to `~/.config/opencode` by default, with `opencode.json` at the root..." | 更新为记录 `.md` command files、merge behavior、`--permissions` default。 |

### 既有上下文（调研前）

- **No `docs/decisions/` directory on `main`**：ADRs 将在该 plan 中 fresh 创建。
- **No prior plans touch the same area**：`2026-02-08-feat-convert-local-md-settings-for-opencode-codex-plan.md` 讨论 command bodies 中的 path rewriting，但不涉及 command output format 或 permissions。
- **OpenCode docs（通过 context7 MCP 确认，library `/sst/opencode`）：**
  - Command `.md` frontmatter 支持：`description`、`agent`、`model`。不支持 `permission` 或 `tools`。放在 `~/.config/opencode/commands/`（global）或 `.opencode/commands/`（project）。
  - Agent `.md` frontmatter 支持：`description`、`mode`、`model`、`temperature`、`tools`、`permission`。放在 `~/.config/opencode/agents/` 或 `.opencode/agents/`。
  - `opencode.json` 是以下内容的唯一位置：`mcp`、global `permission`、global `tools`、`model`、`provider`、`theme`、`server`、`compaction`、`watcher`、`share`。

### 已拒绝方案

**1. 将 `allowedTools` 映射到 per-agent `.md` frontmatter permissions。**
拒绝：Claude commands 不是 agents。没有 per-command-to-per-agent mapping。Commands 不指定要用哪个 agent 运行。即便指定了，将多个 commands 的 restrictions union 到单个 agent permissions 上也会丢失 per-command scoping。Agent `.md` files 确实支持 frontmatter 中的 `permission`，但这要求创建 synthetic agents 只为承载 permissions，既误导又脆弱。

**2. 将 permissions 写入 command `.md` file frontmatter。**
拒绝：OpenCode command `.md` files 只支持 `description`、`agent`、`model` frontmatter。没有 `permission` 或 `tools` key。已通过 context7 docs 确认。其他 key 会被静默忽略。

**3. 保留 `from-commands` 作为 default，但修复 flattening logic。**
拒绝：不存在把 per-command tool restrictions flatten 成 single global permission block 的正确方式。任何 flattening 都会丢失信息并反转语义。

**4. 完全移除 `--permissions` flag。**
拒绝：有些 users 可能希望为了方便将 permissions 写入 `opencode.json`。保留 flag 但修改 default，可以保留 optionality。

**5. 同时把 commands 写为 `.md` files 和 `opencode.json` 的 `command` block。**
拒绝：冗余，并且违背避免污染 `opencode.json` 的目标。`.md` files 是唯一 output format。

---

## 决策记录

### 决策 1: Commands 输出为独立 `.md` files，永不写入 `opencode.json`

- **决策:** `convertCommands()` 返回 `OpenCodeCommandFile[]`（每个 command 一个带 YAML frontmatter 的 `.md` file）。`command` key 永不设置到 `OpenCodeConfig`。writer 为每个 file 创建 `<commandsDir>/<name>.md`。
- **上下文:** OpenCode 支持两种等价 command formats：config 中的 JSON 和 `.md` files。`.md` format 是 additive（new files），不是 destructive（rewriting JSON）。这与 agents 和 skills 已作为 `.md` files 处理的方式一致。
- **已拒绝替代方案:** JSON-only（destructive）、both formats（redundant）。见上方已拒绝方案。
- **假设:** OpenCode runtime 从 `commands/` directory resolve commands。已通过 docs 确认。
- **反转触发条件:** 如果 OpenCode deprecates `.md` command files，或 format 发生 incompatible change。

### 决策 2: `opencode.json` deep-merge，而不是 overwrite

- **决策:** `writeOpenCodeBundle()` 读取 existing `opencode.json`（如果存在），deep-merge plugin-provided keys（MCP servers，以及当 `--permissions` 不是 `none` 时的 permission/tools），不覆盖 user-set values，然后写入 merged result。冲突时 user keys 总是胜出。
- **上下文:** Users 的 `opencode.json` 中有个人 configuration（API keys、model preferences、themes、existing MCP servers）。当前 full-overwrite 会破坏所有这些内容。
- **已拒绝替代方案:** 完全跳过写 `opencode.json`：拒绝，因为 MCP servers 必须写在那里（MCP 没有 `.md` alternative）。
- **假设:** `src/utils/files.ts` 已有 `readJson()` 和 `pathExists()`。existing file 中 malformed JSON 应 warn 并 fall back 到 plugin-only config（不要 crash，不要 destroy）。
- **反转触发条件:** 如果 OpenCode 增加单独的 plugin MCP server registration 机制，不涉及 `opencode.json`。

### 决策 3: `--permissions` default 从 `"broad"` 改为 `"none"`

- **决策:** `--permissions` CLI flag default 从 `"broad"` 改为 `"none"`。除非 user 显式 opt in，否则不向 `opencode.json` 写入 `permission` 或 `tools` keys。
- **上下文:** `"broad"` 静默写入 14 个 global tool permissions。`"from-commands"` 有 semantic inversion bug（把 per-command restrictions union 成 global allows）。二者都会 destructive 地影响 user config。`applyPermissions()` 已在 `"none"` mode 下 short-circuit（line 299: `if (mode === "none") return`），所以无需修改该 function。
- **已拒绝替代方案:** 修复 `from-commands` flattening：global-only target 下不可能正确。完全移除 flag：对 power users 过度限制。
- **假设:** `applyPermissions()` 在 mode `"none"` 下会让 `config.permission` 和 `config.tools` 保持 `undefined`。
- **反转触发条件:** 如果 OpenCode 增加 per-command permission scoping，`from-commands` 可能重新有语义意义。

---

## 待创建 ADRs

创建 `docs/decisions/` directory（`main` 上不存在）。ADRs 遵循 `AGENTS.md` numbering convention：`0001-short-title.md`。

### ADR 0001: OpenCode commands 写为 `.md` files，而不是写进 `opencode.json`

- **上下文:** OpenCode 支持两种等价 custom command formats。写入 `opencode.json` 要求 overwrite 或 merge user 的 config file。写 `.md` files 是 additive 且 non-destructive。
- **决策:** OpenCode target 始终将 commands 作为 individual `.md` files 输出到 `commands/` subdirectory。本工具永不将 `command` key 写入 `opencode.json`。
- **后果:**
  - 正向：Installs non-destructive。Commands 作为 individual files 可见，易检查。与 agents/skills handling 一致。
  - 负向：检查 `opencode.json` 的 users 看不到 plugin commands；必须查看 `commands/`。
  - 中性：要求 OpenCode >= 支持 command file 的版本（已确认 stable）。

### ADR 0002: Plugin merge 到 existing `opencode.json`，而不是替换它

- **上下文:** Users 有 existing `opencode.json` files，包含 personal configuration。install command 之前会 backup 并完整替换该 file，破坏 user settings。
- **决策:** `writeOpenCodeBundle` 读取 existing `opencode.json`（如果存在），在不覆盖 user-set values 的前提下 deep-merge plugin-provided keys，并写回 merged result。冲突时 user keys 总是胜出。
- **后果:**
  - 正向：User config 在 installs 间保留。对 user-set values 来说 re-installs 是 idempotent。
  - 负向：如果 user 已有同名 MCP server entry，plugin 不能 remove 或 update 它。
  - 中性：为安全起见，仍会创建 pre-merge file backup。

### ADR 0003: 默认不把 global permissions 写入 `opencode.json`

- **上下文:** Claude commands 携带 `allowedTools` 作为 per-command restrictions。OpenCode 没有 per-command permission mechanism。将 per-command restrictions 写成 global permissions 在语义上错误，并污染 user 的 global config。
- **决策:** `--permissions` default 为 `"none"`。除非 user 显式传入 `--permissions broad` 或 `--permissions from-commands`，plugin 永不向 `opencode.json` 写入 `permission` 或 `tools`。
- **后果:**
  - 正向：User 的 global OpenCode permissions 永不被静默修改。
  - 负向：依赖 auto-set permissions 的 users 现在必须显式传 flag。
  - 中性：`"broad"` 和 `"from-commands"` modes 仍按文档作为 opt-in 使用。

---

## 假设与失效触发条件

- **假设:** OpenCode command `.md` frontmatter 支持 `description`、`agent`、`model`，且不支持 `permission` 或 `tools`。
  - **如果变化:** converter 可以在 command frontmatter 中 emit per-command permissions，让 `from-commands` mode 语义正确。Phase 2 需要新 code path。

- **假设:** `readJson()` 和 `pathExists()` 存在于 `src/utils/files.ts` 且按预期工作。
  - **如果变化:** Phase 4 的 merge logic 需要替代 I/O utilities。

- **假设:** `applyPermissions()` 在 mode `"none"` 下于 line 299 early return，且不会设置 `config.permission` 或 `config.tools`。
  - **如果变化:** Phase 4 的 merge logic 可能仍会 merge stale data。实现前验证。

- **假设:** `main` 上 commit `174cd4c` 运行 `bun test` 时 180 tests pass。
  - **如果变化:** 在理解 discrepancy 前不要继续。

- **假设:** `src/utils/frontmatter.ts` 中的 `formatFrontmatter()` 处理 `Record<string, unknown>` data 和 string body，生成有效 YAML frontmatter。它过滤 `undefined` values（line 35）。它已通过 `formatYamlLine()` 支持 nested objects/arrays。
  - **如果变化:** Phase 2 的 command file content generation 会产出 malformed output。

- **假设:** `src/utils/files.ts` 中的 `backupFile()` 在 file 不存在时返回 `null`，存在时返回 backup path。missing files 不 throw。
  - **如果变化:** Phase 4 的 backup-before-write for command files 需要 error handling。

---

## 阶段

### Phase 1: 添加 `OpenCodeCommandFile` type 并更新 `OpenCodeBundle`

**内容:** 在 `src/types/opencode.ts` 中：
- 新增 type `OpenCodeCommandFile`，包含 `name: string`（command name，用作 filename stem）和 `content: string`（完整 file content：YAML frontmatter + body）。
- 向 `OpenCodeBundle` 添加 `commandFiles: OpenCodeCommandFile[]` field。
- 从 `OpenCodeConfig` 移除 `command?: Record<string, OpenCodeCommandConfig>`。
- 完全移除 `OpenCodeCommandConfig` type（lines 23-28）。

**原因:** 这是后续所有 phases 依赖的 foundational type change。Commands 从 config object 移到 bundle 中的 individual file entries。

**先写测试:**

File（文件）: `tests/converter.test.ts`

在做任何 type changes 前，先更新 test file 以反映新 shape。existing tests 将失败，因为它们引用 `bundle.config.command`，且 `OpenCodeBundle` 尚没有 `commandFiles`。

需要修改的 tests（type changes 后会 fail，Phase 2 后 pass）：
- `"maps commands, permissions, and agents"`（line 11）：将 `bundle.config.command?.["workflows:review"]` 改为 `bundle.commandFiles.find(f => f.name === "workflows:review")`。将 `bundle.config.command?.["plan_review"]` 改为 `bundle.commandFiles.find(f => f.name === "plan_review")`。
- `"normalizes models and infers temperature"`（line 60）：将 `bundle.config.command?.["workflows:work"]` 改为检查 `bundle.commandFiles.find(f => f.name === "workflows:work")`，并解析其 frontmatter 检查 model。
- `"excludes commands with disable-model-invocation from command map"`（line 202）：将 `bundle.config.command?.["deploy-docs"]` 改为 `bundle.commandFiles.find(f => f.name === "deploy-docs")`。
- `"rewrites .claude/ paths to .opencode/ in command bodies"`（line 217）：将 `bundle.config.command?.["review"]?.template` 改为访问 `bundle.commandFiles.find(f => f.name === "review")?.content`。

同时更新 `tests/opencode-writer.test.ts`：
- 向全部 4 个 existing tests 中的每个 `OpenCodeBundle` literal 添加 `commandFiles: []`（lines 20、43、67、98）。这些 bundles 当前只有 `config`、`agents`、`plugins`、`skillDirs`。

**实现:**

在 `src/types/opencode.ts`：
1. 移除 lines 23-28（`OpenCodeCommandConfig` type）。
2. 从 `OpenCodeConfig` 移除 line 10（`command?: Record<string, OpenCodeCommandConfig>`）。
3. 在 line 47 后添加：
```typescript
export type OpenCodeCommandFile = {
  name: string    // command name, used as the filename stem: <name>.md
  content: string // full file content: YAML frontmatter + body
}
```
4. 向 `OpenCodeBundle` 添加 `commandFiles: OpenCodeCommandFile[]`（放在 `agents` 和 `plugins` 之间）。

在 `src/converters/claude-to-opencode.ts`：
- 更新 line 11 的 import：移除 `OpenCodeCommandConfig`。添加 `OpenCodeCommandFile`。

**需要的代码注释:**
- 在 `OpenCodeBundle` 的 `commandFiles` field 上方添加：`// Commands are written as individual .md files, not in opencode.json. See ADR-001.`

**验证:** `bun test` 会显示 converter tests failures（它们引用旧 command format）。这是预期的；Phase 2 会修复。

---

### Phase 2: 将 `convertCommands()` 改为 emit `.md` command files

**内容:** 在 `src/converters/claude-to-opencode.ts` 中：
- 重写 `convertCommands()`（line 114），让它返回 `OpenCodeCommandFile[]`，而不是 `Record<string, OpenCodeCommandConfig>`。
- 每个 command 变成一个带 YAML frontmatter（`description`，optional `model`）和 body（应用 Claude path rewriting 后的 template text）的 `.md` file。
- 在 `convertClaudeToOpenCode()`（line 64）：用 `commandFiles` 替换 `commandMap`。移除 `config.command` assignment。向 returned bundle 添加 `commandFiles`。

**原因:** 这是实现 ADR-001 的核心 conversion logic change。

**先写测试:**

File（文件）: `tests/converter.test.ts`

Tests 已在 Phase 1 更新为引用 `bundle.commandFiles`。现在它们需要通过。Specific assertions：

1. 将 `"maps commands, permissions, and agents"` 重命名为 `"from-commands mode: maps allowedTools to global permission block"`，明确它测试 opt-in mode，而不是 default。
   - Assert `bundle.config.command` is `undefined`（type 上已不存在，但访问返回 `undefined`）。
   - Assert `bundle.commandFiles.find(f => f.name === "workflows:review")` is defined（断言存在）。
   - Assert `bundle.commandFiles.find(f => f.name === "plan_review")` is defined（断言存在）。
   - Permission assertions 保持不变（它们显式测试 `from-commands` mode）。

2. `"normalizes models and infers temperature"`（规范化 models 并推断 temperature）：
   - 在 `bundle.commandFiles` 中找到 `workflows:work`，用 `parseFrontmatter()` 解析其 frontmatter，assert `data.model === "openai/gpt-4o"`。

3. `"excludes commands with disable-model-invocation from command map"` 重命名为 `"excludes commands with disable-model-invocation from commandFiles"`：
   - Assert `bundle.commandFiles.find(f => f.name === "deploy-docs")` is `undefined`（断言不存在）。
   - Assert `bundle.commandFiles.find(f => f.name === "workflows:review")` is defined（断言存在）。

4. `"rewrites .claude/ paths to .opencode/ in command bodies"`（在 command bodies 中重写 `.claude/` paths）：
   - 在 `bundle.commandFiles` 中找到 `review`，assert `content` contains `"compound-engineering.local.md"`。

5. 新增 test：`"command .md files include description in frontmatter"`：
   - 创建 minimal `ClaudePlugin`，包含一个 command（`name: "test-cmd"`、`description: "Test description"`、`body: "Do the thing"`）。
   - 使用 `permissions: "none"` convert。
   - 找到 command file，parse frontmatter，assert `data.description === "Test description"`。
   - Assert frontmatter 后的 body contains `"Do the thing"`。

**实现:**

在 `src/converters/claude-to-opencode.ts` 中：

替换 lines 114-128（`convertCommands` function）：
```typescript
// Commands are written as individual .md files rather than entries in opencode.json.
// Chosen over JSON map because opencode resolves commands by filename at runtime (ADR-001).
function convertCommands(commands: ClaudeCommand[]): OpenCodeCommandFile[] {
  const files: OpenCodeCommandFile[] = []
  for (const command of commands) {
    if (command.disableModelInvocation) continue
    const frontmatter: Record<string, unknown> = {
      description: command.description,
    }
    if (command.model && command.model !== "inherit") {
      frontmatter.model = normalizeModel(command.model)
    }
    const content = formatFrontmatter(frontmatter, rewriteClaudePaths(command.body))
    files.push({ name: command.name, content })
  }
  return files
}
```

替换 lines 64-87（`convertClaudeToOpenCode` function body）：
- 修改 line 69：`const commandFiles = convertCommands(plugin.commands)`
- 修改 lines 73-77（config construction）：移除 `command: ...` line。Config 应只包含 `$schema` 和 `mcp`。
- 修改 line 81-86（return）：在 return 中用 `commandFiles, plugins` 替换 `plugins`（向 returned bundle 添加 `commandFiles` field）。

**需要的代码注释:**
- 在 `convertCommands()` 上方添加：`// Commands are written as individual .md files rather than entries in opencode.json.` 和 `// Chosen over JSON map because opencode resolves commands by filename at runtime (ADR-001).`

**验证:** 运行 `bun test tests/converter.test.ts`。所有 converter tests 必须通过。然后运行 `bun test`：writer tests 仍可能 fail（它们期望旧 bundle shape；Phase 1 test updates 已处理），但 converter tests 通过。

---

### Phase 3: 向 path resolver 添加 `commandsDir` 并写入 command files

**内容:** 在 `src/targets/opencode.ts` 中：
- 向 `resolveOpenCodePaths()` 的 return value 为两个 branches（global 和 custom output dir）添加 `commandsDir`。
- 在 `writeOpenCodeBundle()` 中 iterate `bundle.commandFiles`，以 backup-before-overwrite 方式写入 `<commandsDir>/<name>.md`。

**原因:** 这为 command `.md` files 创建 file output mechanism。与 Phase 4（merge logic）分开，便于测试。

**先写测试:**

File（文件）: `tests/opencode-writer.test.ts`

新增 tests：

1. `"writes command files as .md in commands/ directory"`（将 command files 作为 `.md` 写入 commands/ directory）：
   - 创建 bundle，其中一个 `commandFiles` entry：`{ name: "my-cmd", content: "---\ndescription: Test\n---\n\nDo something." }`。
   - 使用 output root `path.join(tempRoot, ".config", "opencode")`（global-style）。
   - Assert `exists(path.join(outputRoot, "commands", "my-cmd.md"))` is true（断言文件存在）。
   - 读取 file，assert content matches（带 trailing newline：`content + "\n"`）。

2. `"backs up existing command .md file before overwriting"`（覆盖前备份 existing command `.md` file）：
   - 预先创建 `commands/my-cmd.md` 并写入 old content。
   - 写入 bundle，其中 `commandFiles` 包含 `my-cmd`。
   - Assert `commands/` directory 中存在 `.bak.` file。
   - Assert new content 已写入。

**实现:**

在 `resolveOpenCodePaths()` 中：
- 在 global branch（line 39-46）添加 `commandsDir: path.join(outputRoot, "commands")`，并加 comment：`// .md command files; alternative to the command key in opencode.json`
- 在 custom branch（line 49-56）添加 `commandsDir: path.join(outputRoot, ".opencode", "commands")`，同样 comment。

在 `writeOpenCodeBundle()` 中：
- 在 agents loop（line 18）后添加：
```typescript
const commandsDir = paths.commandsDir
for (const commandFile of bundle.commandFiles) {
  const dest = path.join(commandsDir, `${commandFile.name}.md`)
  const cmdBackupPath = await backupFile(dest)
  if (cmdBackupPath) {
    console.log(`Backed up existing command file to ${cmdBackupPath}`)
  }
  await writeText(dest, commandFile.content + "\n")
}
```

**需要的代码注释:**
- 在 `resolveOpenCodePaths` 两个 branches 中 `commandsDir` inline comment：`// .md command files; alternative to the command key in opencode.json`

**验证:** 运行 `bun test tests/opencode-writer.test.ts`。两个新 command file tests 必须通过。Existing tests 也必须继续通过（Phase 1 updates 已加入 `commandFiles: []`）。

---

### Phase 4: 用 deep-merge 替换 config overwrite

**内容:** 在 `src/targets/opencode.ts` 中：
- 用对 new `mergeOpenCodeConfig()` function 的调用替换 `writeJson(paths.configPath, bundle.config)`（line 13）。
- `mergeOpenCodeConfig()` 读取 existing `opencode.json`（如果存在），使用 user-wins-on-conflict strategy merge plugin-provided keys，并返回 merged config。
- 从 `../utils/files` import `pathExists` 和 `readJson`（添加到 line 2 existing import）。

**原因:** 这实现 ADR-002：user existing config 在 installs 间被保留。

**先写测试:**

File（文件）: `tests/opencode-writer.test.ts`

修改 existing test 并新增 tests：

1. 将 `"backs up existing opencode.json before overwriting"`（line 88）重命名为 `"merges plugin config into existing opencode.json without destroying user keys"`：
   - 预先创建 `opencode.json`：`{ $schema: "https://opencode.ai/config.json", custom: "value" }`。
   - 写入 bundle，其中 `config: { $schema: "...", mcp: { "plugin-server": { type: "local", command: "uvx", args: ["plugin-srv"] } } }`。
   - Assert merged config 同时包含 `custom: "value"`（user key）和 `mcp["plugin-server"]`（plugin key）。
   - Assert backup file exists with original content（断言 backup file 存在且保留 original content）。

2. 新增：`"merges mcp servers without overwriting user entries"`：
   - 预先创建 `opencode.json`：`{ mcp: { "user-server": { type: "local", command: "uvx", args: ["user-srv"] } } }`。
   - 写入 bundle，其中 `config.mcp` 包含 `"plugin-server"`（new）和 `"user-server"`（conflict，args 不同）。
   - Assert both servers exist in merged output（断言两个 servers 都存在于 merged output）。
   - Assert `user-server` 保留 user original args（user wins on conflict）。
   - Assert `plugin-server` present with plugin args（断言 `plugin-server` 带 plugin args 存在）。

3. 新增：`"preserves unrelated user keys when merging opencode.json"`：
   - 预先创建 `opencode.json`：`{ model: "my-model", theme: "dark", mcp: {} }`。
   - 写入 bundle：`config: { $schema: "...", mcp: { "plugin-server": ... }, permission: { "bash": "allow" } }`。
   - Assert `model` 和 `theme` 被保留。
   - Assert plugin additions present（断言 plugin additions 存在）。

**实现:**

在 `src/targets/opencode.ts` line 2 添加 imports：
```typescript
import { backupFile, copyDir, ensureDir, pathExists, readJson, writeJson, writeText } from "../utils/files"
import type { OpenCodeBundle, OpenCodeConfig } from "../types/opencode"
```

添加 `mergeOpenCodeConfig()` function：
```typescript
async function mergeOpenCodeConfig(
  configPath: string,
  incoming: OpenCodeConfig,
): Promise<OpenCodeConfig> {
  // If no existing config, write plugin config as-is
  if (!(await pathExists(configPath))) return incoming

  let existing: OpenCodeConfig
  try {
    existing = await readJson<OpenCodeConfig>(configPath)
  } catch {
    // Safety first per AGENTS.md -- do not destroy user data even if their config is malformed.
    // Warn and fall back to plugin-only config rather than crashing.
    console.warn(
      `Warning: existing ${configPath} is not valid JSON. Writing plugin config without merging.`
    )
    return incoming
  }

  // User config wins on conflict -- see ADR-002
  // MCP servers: add plugin entries, skip keys already in user config.
  const mergedMcp = {
    ...(incoming.mcp ?? {}),
    ...(existing.mcp ?? {}), // existing takes precedence (overwrites same-named plugin entries)
  }

  // Permission: add plugin entries, skip keys already in user config.
  const mergedPermission = incoming.permission
    ? {
        ...(incoming.permission),
        ...(existing.permission ?? {}), // existing takes precedence
      }
    : existing.permission

  // Tools: same pattern
  const mergedTools = incoming.tools
    ? {
        ...(incoming.tools),
        ...(existing.tools ?? {}),
      }
    : existing.tools

  return {
    ...existing,                    // all user keys preserved
    $schema: incoming.$schema ?? existing.$schema,
    mcp: Object.keys(mergedMcp).length > 0 ? mergedMcp : undefined,
    permission: mergedPermission,
    tools: mergedTools,
  }
}
```

在 `writeOpenCodeBundle()` 中，将 line 13（`await writeJson(paths.configPath, bundle.config)`）替换为：
```typescript
const merged = await mergeOpenCodeConfig(paths.configPath, bundle.config)
await writeJson(paths.configPath, merged)
```

**需要的代码注释:**
- 在 `mergeOpenCodeConfig()` 上方添加：`// Merges plugin config into existing opencode.json. User keys win on conflict. See ADR-002.`
- 在 `...(existing.mcp ?? {})` line 上添加：`// existing takes precedence (overwrites same-named plugin entries)`
- 在 malformed JSON catch 中添加：`// Safety first per AGENTS.md -- do not destroy user data even if their config is malformed.`

**验证:** 运行 `bun test tests/opencode-writer.test.ts`。所有 tests 必须通过，包括 renamed test 和 2 个 new merge tests。

---

### Phase 5: 将 `--permissions` default 改为 `"none"`

**内容:** 在 `src/commands/install.ts` 中，将 line 51 的 `default: "broad"` 改为 `default: "none"`。更新 description string。

**原因:** 这实现 ADR-003：默认停止用 permissions 污染 user global config。

**先写测试:**

File（文件）: `tests/cli.test.ts`

新增 tests：

1. `"install --to opencode uses permissions:none by default"`（默认使用 `permissions:none`）：
   - 不带 `--permissions` flag 对 fixture plugin 运行 install。
   - 读取写入后的 `opencode.json`。
   - Assert 它不包含 `permission` key。
   - Assert 它不包含 `tools` key。

2. `"install --to opencode --permissions broad writes permission block"`（写入 permission block）：
   - 带 `--permissions broad` 对 fixture plugin 运行 install。
   - 读取写入后的 `opencode.json`。
   - Assert 它包含有 values 的 `permission` key。

**实现:**

在 `src/commands/install.ts` 中：
- Line 51：将 `default: "broad"` 改为 `default: "none"`。
- Line 52：将 description 改为 `"Permission mapping written to opencode.json: none (default) | broad | from-commands"`。

**需要的代码注释:**
- 在 `default: "none"` line 添加：`// Default is "none" -- writing global permissions to opencode.json pollutes user config. See ADR-003.`

**验证:** 运行 `bun test tests/cli.test.ts`。所有 CLI tests 必须通过，包括 2 个 new permission tests。然后运行 `bun test`，全部 tests（180 original + new ones）必须通过。

---

### Phase 6: 更新 `AGENTS.md` 和 `README.md`

**内容:** 更新 documentation，反映全部三个 changes。

**原因:** 让 future contributors 和 users 看到准确 docs。

**先写测试:** Documentation changes 不需要 tests。

**实现:**

在 `AGENTS.md` line 10，将：
```
- **Output Paths:** Keep OpenCode output at `opencode.json` and `.opencode/{agents,skills,plugins}`.
```
替换为：
```
- **Output Paths:** Keep OpenCode output at `opencode.json` and `.opencode/{agents,skills,plugins}`. For OpenCode, commands go to `~/.config/opencode/commands/<name>.md`; `opencode.json` is deep-merged (never overwritten wholesale).
```

在 `README.md` line 54，将：
```
OpenCode output is written to `~/.config/opencode` by default, with `opencode.json` at the root and `agents/`, `skills/`, and `plugins/` alongside it.
```
替换为：
```
OpenCode output is written to `~/.config/opencode` by default. Commands are written as individual `.md` files to `~/.config/opencode/commands/<name>.md`. Agents, skills, and plugins are written to the corresponding subdirectories alongside. `opencode.json` (MCP servers) is deep-merged into any existing file -- user keys such as `model`, `theme`, and `provider` are preserved, and user values win on conflicts. Command files are backed up before being overwritten.
```

同时，如果 `AGENTS.md` 中没有 Repository Docs Conventions section，则新增：
```
## Repository Docs Conventions

- **ADRs** live in `docs/decisions/` and are numbered with 4-digit zero-padding: `0001-short-title.md`, `0002-short-title.md`, etc.
- **Orchestrator run reports** live in `docs/reports/`.

When recording a significant decision (new provider, output format change, merge strategy), create an ADR in `docs/decisions/` following the numbering sequence.
```

**需要的代码注释:** None.

**验证:** 阅读 updated files 并确认准确。运行 `bun test` 确认无 regressions。

---

## TDD 执行要求

执行 agent 对每个触及 source code 的 phase 都必须遵循以下顺序：

1. 先在 test file 中写 test(s)。
2. 运行 `bun test <test-file>` 并确认新增/修改 tests FAIL（red）。
3. 实现 code change。
4. 运行 `bun test <test-file>` 并确认新增/修改 tests PASS（green）。
5. 运行 `bun test`（all tests）并确认无 regressions。

**例外:** Phase 6 仅 documentation。之后运行 `bun test` 确认无 regressions，但不需要 red/green cycle。

**Phase 1 说明:** Type changes alone 会导致 test failures。Phase 1 和 Phase 2 紧密耦合：Phase 1 更新的 tests 要到 Phase 2 implementation 完成后才会 pass。执行 agent 应：
1. 在 Phase 1 更新 tests（预期 fail，包括 type errors 和 logic changes）。
2. 在 Phase 1 实现 type changes。
3. 在 Phase 2 实现 converter changes。
4. Phase 2 后确认所有 converter tests pass。

---

## 约束

**不要修改:**
- `src/converters/claude-to-opencode.ts` lines 294-417（`applyPermissions()`、`normalizeTool()`、`parseToolSpec()`、`normalizePattern()`）：这些 functions 对 `"broad"` 和 `"from-commands"` modes 是正确的。只改变触发它们的 default。
- `tests/fixtures/` 下任何 files：这些是 data files，不是 test logic。
- `src/types/claude.ts`：不改变 source types。
- `src/parsers/claude.ts`：不改变 parser logic。
- `src/utils/files.ts`：所需 utilities 已存在。不要新增 utility functions。
- `src/utils/frontmatter.ts`：已处理所需 formatting。

**不要新增依赖:** None。不要新增 npm/bun packages。

**遵循模式:**
- `tests/opencode-writer.test.ts` 中 existing writer tests 使用 `fs.mkdtemp()` 创建 temp directories，并使用本地 `exists()` helper function。
- `tests/cli.test.ts` 中 existing CLI tests 使用 `Bun.spawn()` 调用 CLI。
- `tests/converter.test.ts` 中 existing converter tests 使用 `loadClaudePlugin(fixtureRoot)` 读取 real fixtures，并用 inline `ClaudePlugin` objects 做 isolated tests。
- ADR format：遵循 `AGENTS.md` numbering convention `0001-short-title.md`，包含 sections：Status、Date、Context、Decision、Consequences、Plan Reference。
- Commits：使用 conventional commit format。Commit bodies 中 reference ADRs。
- Branch：从 `main` 创建 `feature/opencode-commands-md-merge-permissions`。

## 最终检查清单

完成全部 phases 后：
- [ ] `bun test` passes all tests（全部 tests 通过；180 original + new ones, 0 fail）
- [ ] `docs/decisions/0001-opencode-command-output-format.md` exists（文件存在）
- [ ] `docs/decisions/0002-opencode-json-merge-strategy.md` exists（文件存在）
- [ ] `docs/decisions/0003-opencode-permissions-default-none.md` exists（文件存在）
- [ ] `opencode.json` 永不 full overwrite：merge logic 已由 test 确认
- [ ] Commands 写为 `.md` files：test 已确认
- [ ] `--permissions` default 为 `"none"`：CLI test 已确认
- [ ] `AGENTS.md` 和 `README.md` 已更新，反映 new behavior
