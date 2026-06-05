---
date: 2026-05-19
topic: vscode-copilot-agent-tool-access
---

# CE Plugin 的 VS Code Copilot Agent Tool Access

## 问题框架

当 Compound Engineering plugin 通过 "Chat: Install Plugin from Source" 安装到 VS Code 时，CE subagents（reviewers、researchers 等）无法读取 workspace files。调用 `ce-correctness-reviewer` 会产生：

```
ACCESS_FAILED No filesystem read tool is available in this session to read README.md
```

与此同时，`Explore` 这类 built-in subagents 在同一 session 中可以成功，证明 VS Code Copilot host 确实向 subagents 提供 workspace access -- 但前提是 tools 在 agent frontmatter 中正确声明。

root cause 是 converter pipeline 中的 gap：

1. Claude agent `.agent.md` files 声明 tools（`tools: Read, Grep, Glob, Bash`），但 parser 从未捕获它们。
2. Copilot converter 有意 drop tools，emit 的 agents 没有 `tools` field。
3. VS Code Copilot 将缺失 `tools` field 解读为 custom plugin agents "no tools granted"（这与 converter 原先假设的 omit means defaults 相反）。

这让所有 CE subagents 在 Copilot 下 inert -- 它们可以 reasoning，但无法 inspect code。

---

## 参与者

- A1. **在 VS Code Copilot 中使用 CE 的 developer**: 调用 CE skills 和 agents，期望它们能 read/search/execute workspace。
- A2. **CE converter pipeline**: 解析 Claude plugin source，将 agents/skills 转为 Copilot-compatible format，并写入 output files。
- A3. **VS Code Copilot host**: 加载 plugin agent definitions，基于 frontmatter declarations grant tools，并 dispatch subagents。

---

## 关键流程

- F1. **Subagent tool access（broken path，故障路径）**
  - **触发:** 用户调用一个 dispatch reviewer/researcher subagent 的 CE skill。
  - **参与者:** A1, A3
  - **步骤:**
    1. 用户调用 `/compound-engineering:ce-code-review`
    2. Skill 将 `ce-correctness-reviewer` 作为 subagent dispatch
    3. VS Code Copilot 加载 agent definition，发现没有 `tools` field
    4. Subagent 没有收到 filesystem tools
    5. Subagent 无法读取任何文件
  - **结果:** Review 因 tool-access error 失败。
  - **覆盖:** R1, R2, R3

- F2. **Subagent tool access（fixed path，修复路径）**
  - **触发:** 与 F1 相同，但 fix 已应用。
  - **参与者:** A1, A2, A3
  - **步骤:**
    1. Parser 从 Claude agent frontmatter 捕获 `tools`
    2. Converter maps Claude tools to Copilot aliases（`read`、`search`、`execute` 等）
    3. emitted `.agent.md` 包含 `tools: [read, search, execute]`
    4. VS Code Copilot 将声明的 tools grant 给 subagent
    5. Subagent 成功读取 workspace files
  - **结果:** CE reviewers 和 researchers 以完整 workspace access 运行。
  - **覆盖:** R1, R2, R3, R4

---

## 需求

**Parser：捕获 agent tools**

- R1. Claude parser（`src/parsers/claude.ts` `loadAgents`）必须 parse agent frontmatter 中的 `tools` field，并将其填充到 `ClaudeAgent` type 上。
- R2. `ClaudeAgent` type（`src/types/claude.ts`）必须包含 optional `tools?: string[]` field。

**Converter：将 tools 映射到 Copilot aliases**

- R3. Copilot converter（`src/converters/claude-to-copilot.ts`）必须将 Claude tool names 映射到 VS Code Copilot tool aliases，并在 agent frontmatter 中 emit `tools` array。Mapping:
  - `Read` → `read`
  - `Grep`, `Glob` → `search`
  - `Glob` → `search`（与 Grep deduplicated）
  - `Bash` → `execute`
  - `Write`, `Edit`, `Patch`, `MultiEdit` → `edit`
  - `WebFetch`, `WebSearch` → `web`
  - `TodoRead`, `TodoWrite` → `todo`
  - `Task` → `agent`
  - MCP tool references（例如 `mcp__context7__*`）→ omitted（无法映射到 Copilot built-in aliases）
- R4. Output deduplication：emitted `tools` array 必须只包含 unique values（例如 `Grep` + `Glob` 都映射到 `search`，只 emit 一次 `search`）。
- R5. 如果 source agent 未声明 tools，converter 必须 omit `tools` field（保留 genuinely no tool declarations 的 agents 的当前行为）。

**Copilot type：支持 tools field**

- R6. `CopilotAgent` type 应支持 tools metadata，使 converter output type-safe。可以通过给 type 添加 field，或确保 frontmatter serialization path 能处理它。

**Tests：测试覆盖**

- R7. 更新 `tests/copilot-converter.test.ts`，断言声明了 tools 的 agents 生成正确 Copilot `tools` arrays。
- R8. 添加 test cases：deduplication、unknown/unmappable tools（gracefully omitted）、agents with no tools（field omitted）、agents with web/MCP tools。
- R9. 添加或更新 parser tests，验证 `tools` 从 agent frontmatter 中被捕获。

**plugin-from-source 不需要 install target**

- R10. fix 必须在 VS Code 通过 "Chat: Install Plugin from Source" 直接从 repo 加载 plugin 时生效 -- 这意味着 plugin-native `.agent.md` files 必须带有正确 Copilot `tools` frontmatter，或者 conversion 在 install time 发生。确定适用路径（见 Outstanding Questions）。

---

## 验收示例

- AE1. **覆盖 R1, R2, R3, R4。** Given a CE agent file with `tools: Read, Grep, Glob, Bash`, when the plugin is parsed and converted to Copilot format, the output `.agent.md` frontmatter includes `tools: [read, search, execute]`（尽管 source 有两个 entries，search 只出现一次）。

- AE2. **覆盖 R3, R5。** Given a CE agent file with no `tools` field, when converted to Copilot format, the output `.agent.md` frontmatter does NOT include a `tools` key.

- AE3. **覆盖 R3。** Given a CE agent with `tools: Read, Grep, Glob, Bash, WebFetch, WebSearch, mcp__context7__*`, when converted, the output is `tools: [read, search, execute, web]`（MCP reference omitted，web deduplicated）。

- AE4. **覆盖 R1, R3, R7。** Given the `ce-correctness-reviewer` agent is installed in VS Code Copilot, when it is dispatched as a subagent, it can successfully read `README.md` from the workspace.

---

## 成功标准

- CE reviewer 与 researcher subagents 通过 VS Code Copilot 调用时，可以在 workspace 中 read、search、execute。
- smoke test（调用 `ce-correctness-reviewer`，要求读取 `README.md`）返回 file content，而不是 `ACCESS_FAILED`。
- No regression：没有 declared tools 的 agents 继续按之前方式工作（tools field omitted）。
- Existing non-Copilot targets（OpenCode、Codex、Pi、Gemini、Kiro）不受影响。

---

## 范围边界

- **范围外: Changing VS Code Copilot host behavior.** 在 host documented tool-declaration mechanism 内工作。
- **范围外: Changing `/compound-engineering:ce-*` namespacing.** 这是 VS Code Copilot host 对 installed plugins 的行为。记录它，但不尝试 override。
- **范围外: `.compound-engineering/config.local.yaml` as a tool-access fix.** 该 config 控制 CE preferences（Codex delegation 等），不控制 Copilot tool grants。
- **范围外: Adding a full `copilot` install target to `src/targets/index.ts`.** immediate fix 是让 converter emit tools。dedicated install target 可稍后添加。
- **范围外: Changing how the plugin is distributed/installed.** fix 必须适配现有 "Install Plugin from Source" workflow。
- **Deferred: Copilot skill `tools` field.** Skills（SKILL.md）也可能受益于 tool declarations，但 immediate failure 在 subagents。Skill tool access 可独立处理。
- **Deferred: Registering a `copilot` target in `src/targets/index.ts`.** 这会让 `bun convert --to copilot` 成为 first-class workflow，但 plugin-from-source fix 不需要。

---

## 关键决策

- **显式 map tools，而不是无条件 emit all tools。** explicit mapping 确保 CE agents 精确获得其声明的 capabilities，符合 least privilege。给每个 agent emit `tools: [read, search, execute, edit, web, todo, agent]` 可以工作，但会授予不必要能力。
- **Omit unmappable tools（MCP references），而不是 error。** MCP tools 是 platform-specific，没有 Copilot built-in equivalent。带 warning silently dropping 是 safe default。
- **将 tools parse 为 flat string array。** Claude agent frontmatter 用 comma-separated line 声明 tools（`tools: Read, Grep, Glob, Bash`）。按 comma split 并 trim whitespace。

---

## 依赖与假设

- **VS Code honors `tools` in plugin agent files.** Confirmed：docs 明确说明 custom agents 使用 `tools` frontmatter field 声明 available tools。
- **"Install Plugin from Source" reads raw agent files.** Confirmed：VS Code clone repo 并直接 load files。没有 conversion step。fix 必须修改 source files 或 plugin format。
- **VS Code Claude format detection uses file extension.** docs 说明 Claude agents 是 `.claude/agents` 中的 "plain `.md` files"。CE plugin 使用 `.agent.md` -- 这很可能导致 format mis-detection。需要 empirical verification。
- **Tool set names are stable.** `read`、`search`、`execute`、`edit`、`web`、`agent`、`todos`、`vscode`、`browser` tool sets 在 May 2026 文档中已有。
- **Claude Code may or may not accept Copilot-native tool format.** 如果我们把 tools 改为 `tools: [read, search, execute]`，需要测试 Claude Code behavior。这是关键 cross-platform compatibility question。

---

## 调研发现（2026-05-20）

### Q1: "Install Plugin from Source" 如何加载 agents？

**答案: VS Code 直接读取 cloned repo 中的 raw agent files。没有 conversion step。**

来自 [VS Code Agent Plugins docs](https://code.visualstudio.com/docs/copilot/customization/agent-plugins) 的证据:
- "Run Chat: Install Plugin From Source from the Command Palette. Enter a Git repository URL and VS Code clones and installs the plugin."（文档原句）
- 缓存路径为：`%APPDATA%\Code\agentPlugins\github.com\{org}\{repo}` (Windows)
- VS Code 通过依次检查这些位置 auto-detect plugin format：`.plugin/plugin.json` → `plugin.json` (root) → `.github/plugin/plugin.json` → `.claude-plugin/plugin.json`
- CE plugin 有 `.claude-plugin/plugin.json`，所以 VS Code 将其识别为 **Claude format**

**Critical implication:** 只修 converter 不够。raw plugin files 必须携带 VS Code 能正确 interpret 的 tool declarations。

### Q2: VS Code 会自动 map Claude tool names 吗？

**答案: YES -- documented, but likely broken for this specific case.**

来自 [Custom Agents docs](https://code.visualstudio.com/docs/copilot/customization/custom-agents) 的 Claude agent format section:
> "VS Code maps Claude-specific tool names to the corresponding VS Code tools. Both the VS Code `.agent.md` format (with YAML arrays for tools) and the Claude format (with comma-separated strings) are supported."（文档原句）

不过同一 docs 也说明:
> "Agent files in the `.claude/agents` folder use **plain `.md` files**"（文档原句）

CE plugin agents 使用 `.agent.md` extension（`ce-correctness-reviewer.agent.md`），不是 plain `.md`。VS Code 对 agent files 的 Claude format detection 似乎依赖 file extension：
- `.md` in `.claude/agents/` → Claude format（comma-separated tools string, auto-mapped）
- `.agent.md` → Copilot format（VS Code tool names 的 YAML array）

**Likely root cause:** CE agent files 有 Copilot file extension（`.agent.md`），但 frontmatter 是 Claude-style（`tools: Read, Grep, Glob, Bash`）。VS Code 将其 parse 为 Copilot-format agents，并寻找 `Read`、`Grep` 这类 VS Code tool names -- 但它们不存在。Unrecognized tools 被 silently ignored，导致 agent **zero tools**。

### Q3: Canonical VS Code tool set names（规范 VS Code tool set 名称）

来自 [VS Code cheat sheet](https://code.visualstudio.com/docs/copilot/reference/copilot-vscode-features) 的 built-in tool sets:

| Tool Set | Individual Tools |
|----------|-----------------|
| `agent` | `agent/runSubagent` |
| `browser` | (experimental, multiple) |
| `edit` | `edit/createDirectory`, `edit/createFile`, `edit/editFiles`, `edit/editNotebook` |
| `execute` | `execute/runInTerminal`, `execute/getTerminalOutput`, `execute/createAndRunTask`, `execute/runNotebookCell`, `execute/testFailure` |
| `read` | `read/readFile`, `read/problems`, `read/getNotebookSummary`, `read/readNotebookCellOutput`, `read/terminalLastCommand`, `read/terminalSelection` |
| `search` | `search/changes`, `search/codebase`, `search/fileSearch`, `search/listDirectory`, `search/textSearch`, `search/usages` |
| `todos` | (todo list tool) |
| `vscode` | `vscode/askQuestions`, `vscode/extensions`, `vscode/runCommand`, `vscode/VSCodeAPI` |
| `web` | `web/fetch` |

Custom agent `tools` field accepts: tool set names（例如 `read`）、individual tool names（例如 `read/readFile`）、MCP tool names，或 `*` for all。

### Q4: `tools: []` 与 omitting `tools` 是否不同？

**Answer: Not explicitly documented.** 基于 error behavior（"No filesystem read tool is available"），unrecognized tools 的 agent 与 no tools 的 agent 行为相同 -- 都拿不到任何东西。explicit empty array 与 omission 的区别对这个 fix 来说 academic，因为真实问题是 format mismatch。

### Q5: Subagent tool inheritance

根据 docs，subagents:
- 作为 isolated instances 运行，有自己的 agent definition
- **parent** agent 需要在 tools list 中有 `agent`，并在 `agents` field 中列出 subagent
- **subagent** 使用自己的 `tools` declaration
- Built-in `Explore` 成功，是因为它是 VS Code 自带 agent，拥有 proper tool access

这确认问题在 subagent 自身 tools 如何 parse，而不是 inheritance。

---

## 修订后的问题分析

root cause 是 **format mismatch**，不是 missing converter feature：

1. CE agent files 使用 `.agent.md` extension（Copilot format indicator）
2. CE agent files 包含 Claude-style frontmatter: `tools: Read, Grep, Glob, Bash`（comma-separated string）
3. VS Code 看到 `.agent.md` → 应用 Copilot-format parsing → 寻找 VS Code tool names
4. `Read`、`Grep`、`Glob`、`Bash` 不是 valid VS Code tool names → silently dropped
5. Agent 最终得到 zero tools → "No filesystem read tool is available"

**Built-in `Explore` agent 能工作，是因为它是 VS Code 自己的 agent，带 proper Copilot-native tool declarations。**

---

## 未决问题

### 规划前需解决

- **[Affects fix strategy][Needs testing]** 将 CE agents rename 为 plain `.md`（并保留 `tools: Read, Grep, Glob, Bash`）是否会触发 VS Code 的 Claude-to-Copilot tool mapping？如果 yes，fix 只是 file extension rename。如果 no，则必须同时把 tool declarations 改成 Copilot-native format。
- **[Affects fix strategy][Needs testing]** 如果保持 `.agent.md` extension，但将 `tools` 改为 Copilot-native format（`tools: [read, search, execute]`），Claude Code 是否仍能正常工作？Claude docs 说 `tools` 是 comma-separated string -- Claude 是否也接受 YAML arrays？

### 延后到规划阶段

- **[Affects R6][Technical]** `CopilotAgent` type 是否应携带 `tools?: string[]` field，还是 converter 直接将 tools inject 到 frontmatter string、不做 type-level modeling 就足够？
- **[Affects scope][Technical]** parser change 是否也应 benefit 其他 converter targets（Codex、Gemini 等），还是这些 targets 当前以不同方式处理 tool mapping？
- **[Affects upstream][Decision]** 是否应将此报告为 VS Code bug（Claude format mapping 未应用于 Claude-format plugins 中的 `.agent.md` files）？

---

## 验证计划

Implementation 后 end-to-end verify fix：

1. **Build/convert the plugin**（构建/转换 plugin；如果需要 build step）。
2. **Install in VS Code** via "Chat: Install Plugin from Source"，指向 fork repo。
3. **Confirm plugin loaded:** 检查 VS Code extension/plugin list 显示来自 fork 的 compound-engineering。
4. **Smoke test -- subagent file read（冒烟测试：subagent 读取文件）:**
   - Invoke `/compound-engineering:ce-correctness-reviewer`（或从 skill dispatch）
   - 要求它读取 `README.md` 并报告 first heading
   - Expected: 返回内容（例如 `# fantastic-chainsaw` 或 repo 的实际 H1）
   - Failure: 返回 `ACCESS_FAILED No filesystem read tool`
5. **Comparative test -- built-in agent（对比测试：built-in agent）:**
   - 用同样 request invoke built-in `Explore`
   - Expected: 成功（baseline proof：host 提供 tools）
6. **Full flow test -- code review（全流程测试：code review）:**
   - 在 small diff 上 invoke `/compound-engineering:ce-code-review`
   - 验证 reviewer subagents 产生 referencing actual file content 的 findings
7. **Regression -- no-tools agent（回归：无 tools 的 agent）:**
   - 如果任何 CE agent legitimately has no `tools` field，验证它仍能 load without error

---

## 下一步

两个 quick empirical tests 将决定 fix strategy：

1. **Test A (file extension):** Rename one CE agent to `.md`（例如 `ce-correctness-reviewer.md`），保留 Claude-style `tools: Read, Grep, Glob, Bash`。Install plugin，invoke as subagent。如果 works → fix 是 rename all agent files。

2. **Test B (tool format):** 保持 `.agent.md` extension，将 `tools` 改为 `tools: [read, search, execute, edit]`（Copilot-native YAML array）。Install plugin，invoke as subagent。如果 works → fix 是 convert tool declarations to Copilot format。

一个 test 成功后 → `/ce-plan` 为全部 49 agent files、converter updates 和 test changes 做 full implementation。
