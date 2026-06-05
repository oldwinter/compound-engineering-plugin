# Gemini CLI Spec（Gemini CLI 规格：GEMINI.md、Commands、Skills、Subagents、Extensions）

最后验证：2026-04-18

## 主要来源

```
https://github.com/google-gemini/gemini-cli
https://geminicli.com/docs/get-started/configuration/
https://geminicli.com/docs/cli/custom-commands/
https://geminicli.com/docs/cli/skills/
https://geminicli.com/docs/cli/creating-skills/
https://geminicli.com/docs/core/subagents/
https://geminicli.com/docs/extensions/reference/
https://developers.googleblog.com/subagents-have-arrived-in-gemini-cli/
https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html
```

## Config locations（配置位置）

- User-level config（用户级配置）：`~/.gemini/settings.json`
- Project-level config（项目级配置）：`.gemini/settings.json`
- 对多数 settings，Project-level 优先于 user-level。
- GEMINI.md context file 位于 project root（类似 CLAUDE.md）。

## GEMINI.md context file（上下文文件）

- 位于 project root 的 markdown file，会加载进每个 session 的 context。
- 用于 project-wide instructions、coding standards 和 conventions。
- 等同于 Claude Code 的 CLAUDE.md。

## Custom commands（TOML format，自定义命令）

- Custom commands 是存储在 `.gemini/commands/` 中的 TOML files。
- Command name 从 file path 派生：`.gemini/commands/git/commit.toml` 变成 `/git:commit`。
- Directory-based namespacing（基于目录的命名空间）：subdirectories 创建 namespaced commands。
- 每个 command file 有两个 fields：
  - `description` (string)：在 `/help` 中显示的一行描述
  - `prompt` (string)：发送给 model 的 prompt
- 支持 placeholders：
  - `{{args}}` — user-provided arguments
  - `!{shell}` — shell command 的 output
  - `@{file}` — file contents
- 示例：

```toml
description = "Create a git commit with a good message"
prompt = """
Look at the current git diff and create a commit with a descriptive message.

User request: {{args}}
"""
```

## Skills（SKILL.md standard，SKILL.md 标准）

- skill 是包含 `SKILL.md` 以及 optional supporting files 的 folder。
- Workspace skills 位于 `.gemini/skills/` 或 `.agents/skills/` alias。
- User skills 位于 `~/.gemini/skills/` 或 `~/.agents/skills/` alias。
- Extension skills 位于 installed extension 的 `skills/` directory。
- Compound Engineering managed Gemini installs 应使用 Gemini-owned roots（`~/.gemini/skills`、`~/.gemini/agents`、`~/.gemini/commands`），而不是 `~/.agents/skills`，因为 `~/.agents/skills` 可能 shadow Copilot plugin skills。
- `SKILL.md` 使用 YAML frontmatter，包含 `name` 和 `description` fields。
- Gemini 基于 description matching，通过 `activate_skill` tool 按需激活 skills。
- `description` field 很关键——Gemini 用它决定何时 activate skill。
- Format 与 Claude Code 的 SKILL.md standard 相同。
- Example（示例）：

```yaml
---
name: security-reviewer
description: 用于 review code 中的 security vulnerabilities 和 OWASP compliance
---

# Security Reviewer

Detailed instructions for security review...
```

## Subagents（subagents，子 agent）

- Gemini CLI 支持以带 YAML frontmatter 的 Markdown files 定义 custom subagents。
- Project subagents 位于 `.gemini/agents/*.md`。
- User subagents 位于 `~/.gemini/agents/*.md`。
- Extension subagents 位于 installed extension 的 `agents/*.md` directory。
- 当前 Gemini docs、`/agents reload` command text，以及 Gemini CLI 0.38.2 implementation 只命名 `.gemini/agents` 和 `~/.gemini/agents` 作为 local subagent discovery。`.agents/skills` 和 `~/.agents/skills` aliases 适用于 skills；Gemini 当前不会读取 `~/.agents/agents` 或 `.agents/agents` 作为 subagent discovery paths。
- Subagents 可通过 `@agent-name` 显式调用，或按 description 自动选择。
- Subagents 在 isolated context loops 中运行，并可拥有 restricted tool access。
- Subagents 即使授予 wildcard tool access，也不能调用其他 subagents。

示例：

```yaml
---
name: security-auditor
description: 专门发现 code 中的 security vulnerabilities。
kind: local
tools:
  - read_file
  - grep_search
model: inherit
max_turns: 10
---

You are a ruthless Security Auditor.
```

## MCP server configuration（MCP server 配置）

- MCP servers 配置在 `settings.json` 的 `mcpServers` key 下。
- 与 Claude Code 使用相同 MCP protocol；config location 不同。
- stdio transport 支持 `command`、`args`、`env`。
- HTTP/SSE transport 支持 `url`、`headers`。
- Additional Gemini-specific fields（Gemini 专属附加字段）：`cwd`、`timeout`、`trust`、`includeTools`、`excludeTools`。
- 示例：

```json
{
  "mcpServers": {
    "context7": {
      "url": "https://mcp.context7.com/mcp"
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-playwright"]
    }
  }
}
```

## Hooks（hooks，钩子）

- Gemini 支持 hooks：`BeforeTool`、`AfterTool`、`SessionStart` 等。
- Hooks 使用不同于 Claude Code hooks 的格式（matchers-based）。
- plugin converter 不转换它们——会发出 warning。

## Extensions（扩展）

- Extensions 是 Gemini CLI 的 distributable packages。
- 使用 `gemini extensions install <github-url-or-local-path>` 安装。
- 不同于 `gemini skills install`，当前 Gemini extension docs 和本地 `gemini extensions install --help` 输出都没有列出从 monorepo subdirectory 安装 extension 的 `--path` flag。
- Remote extension installs 不是 local-only。Gemini 支持 Git repository distribution 和 GitHub Releases。
- 对 public gallery discovery 和常规 remote install，`gemini-extension.json` 必须位于 GitHub repository 或 release archive 的 absolute root。
- Gemini CLI 会把 installed extensions 复制到 `~/.gemini/extensions`。
- `gemini extensions link <path>` 为 local development 创建 symlink，而不是复制 extension。
- Extension management commands 从 shell 运行，不在 Gemini interactive mode 内运行。install/update 后重启 Gemini session，使 commands 和 extension changes 生效。
- Extensions 可 bundle commands、skills、subagents、hooks、MCP servers、context files、policies、settings 和 themes。
- 每个 extension root 必须包含 `gemini-extension.json`。
- Extension commands 位于 `commands/*.toml`。
- Extension skills 位于 `skills/<name>/SKILL.md`。
- Extension subagents 位于 `agents/*.md`。
- 对 Compound Engineering 来说，native extension packaging 现在很可能是 Gemini 的 primary distribution path，因为它能保留 commands、skills 和 subagents。Direct `.gemini/` writes 应视为 legacy/custom install path，除非保留用于 local development。
- 由于此 repo 是 monorepo，plugin 位于 `plugins/compound-engineering/` 下，public Gemini extension distribution 可能需要 generated extension-root source、dedicated extension repo，或 root 是 Gemini extension root 的 distribution branch。
- Interim CE distribution 应继续使用 Bun installer，但 writer 应改为安装到 `~/.gemini/{skills,agents,commands}`，并在 `~/.gemini/compound-engineering` 下放 manifest。

### Extension root shape（Extension 根目录结构）

可分发的 Gemini extension source 应如下：

```text
gemini-extension.json
GEMINI.md                    # optional context file
skills/<skill-name>/SKILL.md
commands/<command>.toml
agents/<agent-name>.md
hooks/hooks.json             # optional
policies/*.toml              # optional
package.json                 # optional, if the extension has runtime code
```

Minimal manifest（最小 manifest）：

```json
{
  "name": "compound-engineering",
  "version": "1.0.0",
  "description": "Compound Engineering workflows for Gemini CLI",
  "contextFileName": "GEMINI.md"
}
```

Relevant manifest fields（相关 manifest 字段）：

- `name`：Required。本地 CLI validation 允许 letters、numbers 和 dashes；docs 推荐 lowercase numbers/dashes，并期望 extension directory name 匹配。
- `version`：Required。如果不是 standard semver，validation 会 warn。
- `description`：Optional，但 public gallery 会使用。
- `contextFileName`：Optional。当存在时默认 `GEMINI.md`。
- `mcpServers`：Optional。像 user `settings.json` MCP servers 一样加载，但 extension MCP config 会忽略 `trust`。
- `settings`：Optional install-time/user configuration prompts；values 存储在 extension `.env` 中，敏感值存 keychain。
- `excludeTools`、`migratedTo`、`plan`、`themes`：Optional target-specific behavior。

### Install commands（安装命令）

从 root 是 extension root 的 GitHub repository 安装：

```bash
gemini extensions install https://github.com/EveryInc/compound-engineering-gemini
```

从 branch、tag 或 commit 安装：

```bash
gemini extensions install https://github.com/EveryInc/compound-engineering-gemini --ref stable
```

从 local extension root 安装：

```bash
gemini extensions install ./dist/gemini-extension
```

为 development link local extension root：

```bash
gemini extensions link ./dist/gemini-extension
```

Validate local extension root（验证 local extension root）：

```bash
gemini extensions validate ./dist/gemini-extension
```

Uninstall（卸载）：

```bash
gemini extensions uninstall compound-engineering
```

### Release options（发布选项）

Gemini 支持两种 remote release shapes：

1. **Git repository:** 用户安装 repository URL。repository root 必须包含 `gemini-extension.json`。
2. **GitHub Releases:** 用户仍安装 repository URL。Gemini 可以使用 latest release archive，或通过 `--ref` 使用 release tag；custom archives 必须 self-contained，并且 archive root 包含 `gemini-extension.json`。

public Gemini extension gallery 会索引带 `gemini-cli-extension` topic、且 `gemini-extension.json` 位于 repository 或 release archive root 的 public GitHub repositories。

### Compound Engineering packaging implications（打包影响）

当前 `plugins/compound-engineering/` source root 还不是有效 Gemini extension root，因为它缺少 `gemini-extension.json`：

```bash
gemini extensions validate plugins/compound-engineering
# Configuration file not found at .../plugins/compound-engineering/gemini-extension.json
```

只添加这个 manifest 会让 root validate，但不足以正确 packaging agents：

- CE agents 当前位于 nested category directories，例如 `agents/review/correctness-reviewer.md`。
- Gemini 在 `@google/gemini-cli` 0.38.2 中的 local loader 只读取 extension `agents/` directory 下的 direct `*.md` files。
- Gemini agent frontmatter 很严格。CE 的 Claude-authored agent frontmatter 可能包含 Claude-only fields，例如 `color`；部分 files 使用 Claude string-form `tools: Read, Grep, Glob, Bash`，而 Gemini 期望 `tools` 是 valid Gemini tool names 的 array。

因此，proper CE Gemini extension 应该是 generated 或 normalized，而不是 Claude plugin root 加一个 manifest。这不意味着要把 agent prompts 重写成 bespoke Gemini-only instructions。agent bodies 和多数 `name`/`description`/`model` frontmatter 通常可以 pass through。generated extension 应该：

- Copy pass-through（原样复制）未被 Gemini 排除的 `skills/<skill>/SKILL.md` directories。
- 将 Claude agents 转换为 flat Gemini-compatible subagents，放在 `agents/<agent-name>.md`。
- Strip 或 translate Claude-only frontmatter fields。
- 将 Claude tool names 转换为 Gemini tool names；如果没有可靠 mapping，则 omit tools。
- 仅当 CE 再次 ship source commands 时，才生成 Gemini `commands/*.toml`。
- 在 generated extension root 包含 `gemini-extension.json`。
- 在 tests 中使用 `gemini extensions validate <generated-root>`。

Interim Bun installer 也需要同样 normalization，只是 output root 是 `~/.gemini` 而不是 extension root：

```text
~/.gemini/skills/<skill-name>/SKILL.md
~/.gemini/agents/<agent-name>.md
~/.gemini/commands/*.toml
~/.gemini/compound-engineering/install-manifest.json
```

2026-04-18 使用 Gemini CLI 0.38.2 的 local smoke test：

- 一个直接 extension agent 使用 CE/Claude-style `tools: Read, Grep, Glob, Bash` 加 `color: blue`，因 Gemini validation errors 加载失败：`tools: Expected array, received string` 和 `Unrecognized key(s) in object: 'color'`。
- 一个位于 `agents/review/nested-agent.md` 的 nested extension agent 没有产生 validation error，因为 loader 只扫描 `agents/` 下的 direct files；它没有被 discovered。

不要把 CE agents 放在 `~/.agents/agents` 作为 shared cross-harness agent root。Gemini 当前不会读取它；如果 Gemini 之后添加该 alias，Claude/Copilot-shaped frontmatter 也可能成为 compatibility problem。对 Gemini，使用带 normalized `agents/*.md` files 的 native extension，或使用 legacy/custom install 到 `~/.gemini/agents` 并配合 cleanup。

如果同一个 Gemini agent name 存在于多个 Gemini-read locations，Gemini 先注册 user agents，再注册 project agents，最后注册 extension agents。后注册会按 name 覆盖早注册。这会避免 duplicate visible agent tools，但 `~/.gemini/agents` 中的 stale CE files 仍可能 emit validation errors，或在 extension disabled 时 mask behavior，因此 cleanup 仍然必要。

## Settings.json structure（settings.json 结构）

```json
{
  "model": "gemini-2.5-pro",
  "mcpServers": { ... },
  "tools": {
    "sandbox": true
  }
}
```

- plugin conversion 期间只写入 `mcpServers` key。
- 其他 settings（model、tools、sandbox）是 user-specific，out of scope。
