# Agent Instructions（Agent 运行约定）

本仓库主要承载 `compound-engineering` coding-agent plugin，以及用于分发它的 Claude Code marketplace/catalog metadata。

它还包含：

- 把 Claude Code plugins 转换为其他 agent platform formats 的 Bun/TypeScript CLI
- `plugins/` 下的其他 plugins，例如 `coding-tutor`
- CLI、marketplace 和 plugins 共用的 release 与 metadata infrastructure

`AGENTS.md` 是 canonical repo instruction file。根目录 `CLAUDE.md` 只作为仍会查找它的 tools 和 conversions 的 compatibility shim。

## Quick Start（快速开始）

```bash
bun install
bun test                  # full test suite
bun run release:validate  # check plugin/marketplace consistency
```

## Working Agreement（工作约定）

- **Branching:** 任何非平凡 change 都创建 feature branch。如果已经在任务正确 branch 上，继续使用；除非明确要求，不要创建额外 branches 或 worktrees。
- **Merge policy:** 所有到 `main` 的 changes 都通过 pull requests。禁止 direct pushes 和 direct merges；`main` 上的 branch protection 要求 `test` status check 通过。Direct path 会绕过 `release:validate`、test suite 和 PR title validation；过去的 direct merges 造成过 version drift，需要多 PR 恢复（见 `docs/solutions/workflow/release-please-version-drift-recovery.md`）。
- **Safety:** 不要删除或覆盖 user data。避免 destructive commands。
- **Testing:** 修改 parsing、conversion 或 output 后运行 `bun test`。
- **Release versioning:** Releases 由 release automation 准备，不由普通 feature PRs 准备。Repo 现在有多个 release components（`cli`、`compound-engineering`、`coding-tutor`、`marketplace`）。GitHub release PRs 和 GitHub Releases 是新 releases 的 canonical release-notes surface；根 `CHANGELOG.md` 只是指向该历史的指针。使用 `feat:`、`fix:` 等 conventional titles，让 release automation 能分类 change intent；但 routine PRs 不要手工 bump release-owned versions，也不要手写 release notes。
- **Linked versions (cli + compound-engineering):** `linked-versions` release-please plugin 会让 `cli` 和 `compound-engineering` 保持同一 version。这是有意的，用于简化 CLI 与其随附 plugin 的 version tracking。结果是：只有 plugin changes 的 release 仍会 bump CLI version（反之亦然）。CLI changelog 也可能包含 `exclude-paths` 通常会过滤的 commits，因为 `linked-versions` 在强制 synced bump 时会覆盖 exclusion logic。这是已知 upstream release-please limitation，不是 misconfiguration。不要把 linked-version bumps 标记为 unnecessary。
- **Output Paths:** OpenCode output 保持在 `opencode.json` 和 `.opencode/{agents,skills,plugins}`。对 OpenCode，commands 写到 `~/.config/opencode/commands/<name>.md`；`opencode.json` 做 deep-merge（绝不 wholesale overwrite）。
- **Scratch Space:** 默认使用 OS temp。只有在下面规则明确 justified 时才使用 `.context/`。
  - **Default: OS temp**：覆盖大多数 scratch，包括 per-run throwaway 和 cross-invocation reusable，不管是否存在 repo、其他 skills 是否会读取这些文件。Stable OS-temp prefix 对 cross-skill 和 cross-invocation coordination 的支持与 in-repo path 一样好；repo-adjacency 很少是真正相关的属性。
    - **Per-run throwaway**: `mktemp -d -t <prefix>-XXXXXX`（OS 负责 cleanup）。用于只消费一次并丢弃的文件，例如 captured screenshots、stitched GIFs、intermediate build outputs、recordings、delegation prompts/results、single-run checkpoints。生成的 path 是 opaque 的（macOS 上会落到 `$TMPDIR`/`/var/folders/...` 下），这适合用户不需要访问的 throwaway files。
    - **Cross-invocation reusable**: stable path `/tmp/compound-engineering/<skill-name>/<run-id>/`，**不要**用 `mktemp -d`，这样同一 skill 的后续 invocations 能发现 sibling run-ids。直接使用 `/tmp`，不要使用 `$TMPDIR`，让 paths 保持可访问：macOS 上 `$TMPDIR` 会解析到 `/var/folders/64/.../T/`，对想 inspect checkpoints、grep 或 copy out 的用户很不友好。`$TMPDIR` 的 per-user isolation 对 cross-invocation reusable scratch 没有价值，因为用户本来就是 intended audience。用于按 session key 的 caches、需要在 loose session 内 context compaction 后存活的 checkpoints，或任何同一 skill 后续 runs 需要定位 prior outputs 的 state。
  - **Exception: `.context/`**：仅当 artifact 真正绑定到 CWD repo，并且至少满足以下之一时使用：
    - (a) **User-curated**：用户预计会在 skill 外 inspect、manipulate 或手动 curate artifact（例如 per-repo TODO database、在同一 checkout 跨 sessions 存活的 per-spec optimization log）。
    - (b) **Repo+branch-inseparable**：artifact 的意义与这个特定 repo 或 branch 不可分离（例如用户期望在同一 checkout 恢复的 branch-specific resume state）。
    - (c) **Path is core UX**：把 artifact path 告诉用户是 skill output 的核心部分，并且 repo-relative location 比 OS-temp path 更容易沟通。
    放到 `.context/compound-engineering/<workflow-or-skill-name>/` 下；如果可能并发运行，加 per-run subdirectory；按 artifact lifecycle 决定 cleanup behavior（per-run scratch 成功后清理；user-curated state 持久保留）。"Shared between skills" 本身不够充分，OS temp 同样能处理。
  - **Durable outputs**（plans、specs、learnings、docs、final deliverables）属于 `docs/` 或其他 repo-tracked location，不属于任一 scratch tier。
  - **Cross-platform note（跨平台说明）:** `/tmp` 在 macOS（symlink 到 `/private/tmp`）、Linux 和 WSL 上可写。`mktemp -d -t <prefix>-XXXXXX` 三者也都可用。这里 authored 的 skills 假设 Unix-like shells；native Windows 不是当前 target。
- **Character encoding（字符编码）:**
  - **Identifiers**（file names、agent names、command names）：只用 ASCII，converters 和 regex patterns 依赖它。
  - **Markdown tables（Markdown 表格）:** 使用 pipe-delimited（`| col | col |`），不要使用 box-drawing characters。
  - **Prose and skill content（正文与 skill content）:** Unicode 可以使用（emoji、标点等）。Code blocks 和 terminal examples 中优先使用 ASCII arrows（`->`、`<-`），不要用 Unicode arrows。

## Directory Layout（目录结构）

```text
src/              CLI entry point, parsers, converters, target writers
plugins/          Plugin workspaces (compound-engineering, coding-tutor)
.claude-plugin/   Claude marketplace catalog metadata
tests/            Converter, writer, and CLI tests + fixtures
docs/             Requirements, plans, solutions, and target specs
CONCEPTS.md       Shared domain vocabulary (glossary of project-specific terms)
```

## Repo Surfaces（仓库影响面）

本 repo 的 changes 可能影响以下一个或多个 surfaces：

- `plugins/compound-engineering/` 下的 `compound-engineering`
- `.claude-plugin/` 下的 Claude marketplace catalog
- `src/` 和 `package.json` 中的 converter/install CLI
- `plugins/coding-tutor/` 等 secondary plugins

不要在未检查 affected files 归属的情况下，假设某个 repo change "just CLI" 或 "just plugin"。

## Plugin Maintenance（Plugin 维护）

修改 `plugins/compound-engineering/` 内容时：

- 如果 plugin behavior、inventory 或 usage 发生变化，更新 `plugins/compound-engineering/README.md` 等 substantive docs。
- 不要在 plugin 或 marketplace manifests 中手工 bump release-owned versions。
- 不要手工向 `CHANGELOG.md` 添加 release entries，也不要把它当作 new releases 的 canonical source。
- 如果 agents、commands、skills、MCP servers 或 release-owned descriptions/counts 可能改变，运行 `bun run release:validate`。
- 删除 skill、agent 或 command 时，把它的 name 加到两个 cleanup registries 中，以便 upgrade 时清扫 stale flat-install artifacts：
  - `src/utils/legacy-cleanup.ts` 中的 `STALE_SKILL_DIRS` / `STALE_AGENT_NAMES` / `STALE_PROMPT_FILES`
  - `src/data/plugin-legacy-artifacts.ts` 中的 `EXTRA_LEGACY_ARTIFACTS_BY_PLUGIN["compound-engineering"]`

Useful validation commands（常用验证命令）：

```bash
bun run release:validate
cat .claude-plugin/marketplace.json | jq .
cat plugins/compound-engineering/.claude-plugin/plugin.json | jq .
```

## Validating Agent and Skill Changes（验证 Agent 和 Skill 变更）

由于 Claude Code 加载 plugins 的方式，对 plugin agent 或 skill 的 behavioral changes（`plugins/*/agents/` 或 `plugins/*/skills/` 下任何内容）需要不同于 mechanical code changes 的 validation path。

- **使用 `skill-creator` skill 测试 changes。** Skill-creator 专门为此设计：它会 spawn 一个 generic subagent，并在 dispatch 时把 agent 或 skill content 注入 subagent prompt，所以每次 run 都会从磁盘读取当前 source。调用 `/skill-creator` 并使用它的 eval workflow，而不是临时 workaround。

- **Plugin agent 和 skill definitions 都会在 session start 时缓存。** 一旦 Claude Code session 打开，dispatch typed agent（例如 `Agent({subagent_type: "compound-engineering:ce-session-historian"})`）会运行 session 开始时加载到 memory 中的 copy。Skills 也一样：调用 `Skill ce-session-inventory` 会经过 cached skill loader，所以同一 session start 后的 skill script edits 也不能用这条路径测试。Session start 之后对任一层的 file edits 都不会在同一 session 中传播。任何围绕同一 session 中 typed-agent dispatch 或 Skill-tool invocation 建立的 iteration loop，测试的都是 pre-edit content，不是你的 changes。

- **不要编辑 `~/.claude/plugins/cache/` 或 `~/.claude/plugins/marketplaces/` 来试图强制 reload。** 这些 paths 是 user machine state，不是 repo-managed。修改它们不能可靠绕过 in-session cache（已观察到不行），还有被 plugin updates 静默覆盖的风险，而且测试层级也不对。Skill-creator pattern 才是正确路径；如果确实需要 typed-agent dispatch path 的 freshly-loaded behavior，请重启 Claude Code session，但快速 iteration 优先用 skill-creator。

- **Mechanical changes 不受此限制。** Skill scripts（例如 `extract-metadata.py`）、parser logic、conversion code，以及任何 `bun test` 覆盖的内容，始终运行当前 source。Caching issue 只影响通过 plugin loader dispatch 的 LLM-driven agent 或 skill prose behavior。

## Coding Conventions（编码约定）

- 在 platform 之间转换时，优先 explicit mappings，而不是 implicit magic。
- 把 target-specific behavior 放在 dedicated converters/writers 中，不要把 conditionals 散落到无关文件。
- 保留 installed targets 的 stable output paths 和 merge semantics；不要随意改变 generated file locations。
- 添加或修改 target 时，同步更新 fixtures/tests，不要把 docs 或 examples 当作足够 proof。

## Commit Conventions（提交约定）

- **Prefix 基于 intent，而不是 file type。** 使用 conventional prefixes（`feat:`、`fix:`、`docs:`、`refactor:` 等），但按 change 做什么来分类，不按文件扩展名分类。`plugins/*/skills/`、`plugins/*/agents/` 和 `.claude-plugin/` 下的文件即使是 Markdown 或 JSON，也是 product code。只有纯文档用途的文件（`README.md`、`docs/`、`CHANGELOG.md`）才保留 `docs:`。
- **Type selection：按 intent 分类，不按 diff shape。** 当 `fix:` 和 `feat:` 都看似合适时，默认用 `fix:`：修复 broken 或 missing behavior 的 change 是 `fix:`，即使通过新增代码实现；净增行数不会把 fix 变成 `feat:`。`feat:` 只用于用户此前无法完成、且不是修复 broken behavior 的能力。其他 conventional types（`chore:`、`refactor:`、`docs:`、`perf:`、`test:`、`ci:`、`build:`、`style:`）在比二者更精确时仍为首选。Heuristic：如果今天写的 regression test 在 change 前会失败，它就是 `fix:`。用户可以针对某个 change 覆盖此默认值。
- **包含 component scope。** Scope 会原样出现在 changelog 中。选择最窄且有用的 label：skill/agent name（`document-review`、`learnings-researcher`）、plugin 或 CLI area（`coding-tutor`、`cli`），或跨域 shared area（`review`、`research`、`converters`）。不要使用 `compound-engineering`，它代表整个 plugin，对读者没有帮助。只有在没有任何单一 label 能增加 clarity 时才省略 scope。
- **没有用户明确确认，不要使用 `!` 或 `BREAKING CHANGE:` footer。** 这些 markers 会触发 release-please 自动 major version bump；即使 change 技术上 breaking，用户也可能不想做这个决定。如果 change 看起来 breaking，告知用户并让他们决定是否应用 marker。

## Adding a New Target Provider（添加新的 Target Provider）

只有当 target format 稳定、有文档、且对 tools/permissions/hooks 有清晰 mapping 时才添加 provider。使用此 checklist：

1. **Define the target entry（定义 target entry）**
   - 在 `src/targets/index.ts` 中添加新 handler，直到完整实现前设为 `implemented: false`。
   - 使用 dedicated writer module（例如 `src/targets/codex.ts`）。

2. **Define types and mapping（定义 types 和 mapping）**
   - 在 `src/types/` 下添加 provider-specific types。
   - 在 `src/converters/` 中实现 conversion logic（Claude -> provider）。
   - 保持 mappings explicit：tools、permissions、hooks/events、model naming。

3. **Wire the CLI（接入 CLI）**
   - 确保 `convert` 和 `install` 支持 `--to <provider>` 和 `--also`。
   - 保持 behavior 与 OpenCode 一致（写入 clean provider root）。

4. **Tests (required，必需测试)**
   - 扩展 `tests/fixtures/sample-plugin` 中的 fixtures。
   - 在 `tests/converter.test.ts` 中添加 mapping coverage。
   - 为新 provider output tree 添加 writer test。
   - 为 provider 添加 CLI test（类似 `tests/cli.test.ts`）。

5. **Docs（文档）**
   - 更新 README，加入新的 `--to` option 和 output locations。

## Agent References in Skills（Skills 中的 Agent 引用）

在 skill SKILL.md files 中引用 agents（例如通过 `Agent` 或 `Task` tool）时，使用裸 `ce-<agent-name>` 形式。`ce-` prefix 表示该 agent 是 compound-engineering component，足以跨 plugins 保持唯一。

Example（示例）：

- `ce-learnings-researcher`（正确）
- `learnings-researcher`（错误，必须有 `ce-` prefix；它能避免与其他 plugins 中同 short name 的 agents 冲突）

## File References in Skills（Skills 中的文件引用）

每个 skill directory 都是 self-contained unit。SKILL.md 只能使用从 skill root 出发的 relative paths 引用其自身 directory tree 内的 files（例如 `references/`、`assets/`、`scripts/`）。绝不要引用 skill directory 外的 files，不管是 relative traversal 还是 absolute path。

Broken patterns（错误模式）：

- `../other-skill/references/schema.yaml`：relative traversal 到 sibling skill
- `/home/user/plugins/compound-engineering/skills/other-skill/file.md`：指向另一个 skill 的 absolute path
- `~/.claude/plugins/cache/marketplace/compound-engineering/1.0.0/skills/other-skill/file.md`：指向 installed plugin location 的 absolute path

为什么这很重要：

- **Runtime resolution:** Skills 从用户 working directory 执行，不是从 skill directory 执行。Cross-directory paths 和 absolute paths 不会按预期 resolve。
- **Unpredictable install paths:** 从 marketplace 安装的 plugins 会 cache 在 versioned paths 下。Source repo 中能工作的 absolute paths 不会匹配 installed layout，且 version segment 每次 release 都会变化。
- **Converter portability:** CLI 在转换到其他 agent platforms 时，会把每个 skill directory 作为 isolated unit 复制。Cross-directory references 会断，因为 sibling directories 不包含在 copy 内。

如果两个 skills 需要同一个 supporting file，请复制到每个 skill 的 directory。优先使用小型、self-contained reference files，而不是 shared dependencies。

> **Note (March 2026):** 该限制反映当前 Claude Code skill resolution behavior 和已知 path-resolution bugs（[#11011](https://github.com/anthropics/claude-code/issues/11011)、[#17741](https://github.com/anthropics/claude-code/issues/17741)、[#12541](https://github.com/anthropics/claude-code/issues/12541)）。如果 Anthropic 未来引入 shared-files mechanism 或 cross-skill imports，应基于 supporting documentation 重新审视此 guidance。

## Platform-Specific Variables in Skills（Skills 中的特定平台变量）

这个 plugin 会 author 一次，然后转换到多个 agent platforms（Claude Code、Codex、Gemini CLI 等）。不要在 skill content 中使用 platform-specific environment variables 或 string substitutions（例如 `${CLAUDE_PLUGIN_ROOT}`、`${CLAUDE_SKILL_DIR}`、`${CLAUDE_SESSION_ID}`、`CODEX_SANDBOX`、`CODEX_SESSION_ID`），除非提供在变量 unavailable 或 unresolved 时仍能工作的 graceful fallback。

**Preferred approach — relative paths:** 使用从 skill directory 出发的 relative paths 引用 co-located scripts 和 files（例如 `bash scripts/my-script.sh ARG`）。所有主要 platforms 都会相对于 skill directory resolve。无需 variable prefix。

**When a platform variable is unavoidable:** 使用 pre-resolution pattern（`!` backtick syntax），并在 skill content 中包含 explicit fallback instructions，让 agent 知道 value 为空、literal 或 error 时该怎么做：

```text
**Plugin version (pre-resolved):** !`jq -r .version "${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"`

If the line above resolved to a semantic version (e.g., `2.42.0`), use it.
Otherwise (empty, a literal command string, or an error), use the versionless fallback.
Do not attempt to resolve the version at runtime.
```

这同样适用于任何 platform 的 variables：从 Codex、Gemini 或其他 platform 转换来的 skill，如果假设 platform-only variables 存在且没有 fallback，也会遇到同样问题。

## Repository Docs Convention（仓库文档约定）

- **Requirements** 位于 `docs/brainstorms/`：requirements exploration 和 ideation。
- **Plans** 位于 `docs/plans/`：implementation plans 和 progress tracking。
- **Solutions** 位于 `docs/solutions/`：过去问题的 documented solutions（bugs、best practices、workflow patterns），按 category 组织，并带 YAML frontmatter（`module`、`tags`、`problem_type`）。在相关 areas implementation 或 debugging 时有用。
- **Specs** 位于 `docs/specs/`：target platform format specifications。

### Solution categories (`docs/solutions/`，solution 分类)

这个 repo 构建的是给 developers 使用的 plugin。请从最终用户（一位使用该 plugin 的 developer）视角分类 solutions，而不是从本 repo contributor 视角分类。

- **`developer-experience/`**：为 *this repo* 做贡献时的问题：local dev setup、shell aliases、test ergonomics、CI friction。如果 fix 只影响持有本 repo checkout 的人，就放这里。
- **`integrations/`**：Plugin output 在某个 target platform 或 OS 上无法正确工作的问题。Cross-platform bugs、target writer output problems 和 converter compatibility issues 放这里。
- **`workflow/`**, **`skill-design/`**：Plugin skill 和 agent design patterns、workflow improvements。

拿不准时：如果 bug 影响运行 `bun install compound-engineering` 或 `bun convert` 的人，它就是 integration 或 product issue，而不是 developer-experience。
