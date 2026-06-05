---
title: "feat: 将 Claude MCP servers 同步到所有 supported providers"
type: feat
date: 2026-03-03
status: completed
deepened: 2026-03-03
---

# feat: 将 Claude MCP servers 同步到全部 supported providers

## 概览

扩展 `sync` command，让 user 的 local Claude Code MCP configuration 能传播到该 CLI 可以合理支持的每个 provider，而不是只支持当前 partial set。

今天，`sync` 已经会 symlink Claude skills，并为一部分 targets sync MCP servers。缺口在于 install/convert support 的增长远快于 sync support，因此 `README.md` 中的 product promise 已 drift，无法匹配 `src/commands/sync.ts` 的实际行为。

这个 feature 应关闭 parity gap，同时不改变 core sync contract：

- Claude 仍是 personal skills 和 MCP servers 的 source of truth。
- Skills 保持 symlinked，而不是 copied。
- Destination tool 中 existing user config 尽可能保留。
- Target-specific MCP formats 保持 target-specific。

## 问题陈述

当前 implementation 有三个具体问题：

1. `sync` 只知道 `opencode`、`codex`、`pi`、`droid`、`copilot` 和 `gemini`，而 install/convert 现在也支持 `kiro`、`windsurf`、`openclaw` 和 `qwen`。
2. `sync --target all` 依赖 stale detection metadata，其中仍包含 `cursor`，但漏掉 newer supported tools。
3. 即使对于一些已 supported targets，现有 MCP sync support 也不完整：
   - `codex` 只 emit stdio servers，并 silent drop remote MCP servers。
   - `droid` 仍是 skills-only，虽然 Factory 现在已经 document `mcp.json`。

用户影响：

- user 可以将 plugin install 到更多 providers，但不能将 personal Claude setup sync 到这些 providers。
- `sync --target all` 不再意味着 "all supported tools"。
- 在 Claude 中有 remote MCP servers 的 users 会根据 target 获得 partial results。

## 调研摘要

### 没有相关 Brainstorm

我检查了 `docs/brainstorms/` 中最近的 brainstorms，过去 14 天内没有发现与该 feature 相关的 document。

### 内部发现

- `src/commands/sync.ts:15-125` hardcode sync target list、output roots 和 per-target dispatch。它漏掉 `windsurf`、`kiro`、`openclaw` 和 `qwen`。
- `src/utils/detect-tools.ts:15-22` 仍检测 `cursor`，但不检测 `windsurf`、`kiro`、`openclaw` 或 `qwen`。
- `src/parsers/claude-home.ts:11-19` 已经为 sync 提供完全正确的 inputs：personal skills 加 `settings.json` `mcpServers`。
- `src/sync/codex.ts:25-91` 只 serialize stdio MCP servers，虽然 Codex 支持 remote MCP config。
- `src/sync/droid.ts:6-21` symlink skills，但完全忽略 MCP。
- Target writers 已编码多个 missing MCP formats 和 merge behaviors：
  - `src/targets/windsurf.ts:65-92`
  - `src/targets/kiro.ts:68-91`
  - `src/targets/openclaw.ts:34-42`
  - `src/targets/qwen.ts:9-15`
- `README.md:89-123` 承诺 "Sync Personal Config"，但只记录旧 target subset。

### 机构经验

`docs/solutions/adding-converter-target-providers.md:20-32` 和 `docs/solutions/adding-converter-target-providers.md:208-214` 强化了该 feature 的正确 pattern：

- 保持 target mappings 显式，
- 将 MCP conversion 视为 target-specific，
- 对 unsupported features 发出 warning，而不是强行制造 fake parity，
- 并为每个 mapping 添加 tests。

Note：本 repo 中不存在 `docs/solutions/patterns/critical-patterns.md`，所以没有 critical-patterns file 可应用。

### 外部发现

官方 docs 证实 missing targets 并不等价，因此不能用 generic JSON pass-through 解决。

| Target | 官方 MCP / skills 位置 | 关键备注 |
| --- | --- | --- |
| Factory Droid | `~/.factory/mcp.json`, `.factory/mcp.json`, `~/.factory/skills/` | 支持 `stdio` 和 `http`；user config 会覆盖 project config。 |
| Windsurf | `~/.codeium/windsurf/mcp_config.json`, `~/.codeium/windsurf/skills/` | 支持 `stdio`、Streamable HTTP 和 SSE；remote config 使用 `serverUrl` 或 `url`。 |
| Kiro | `~/.kiro/settings/mcp.json`, `.kiro/settings/mcp.json`, `~/.kiro/skills/` | 支持 user 和 workspace config；remote MCP support 是在本 repo 的 local Kiro spec 写成之后新增的。 |
| Qwen Code | `~/.qwen/settings.json`, `.qwen/settings.json`, `~/.qwen/skills/`, `.qwen/skills/` | 支持 `stdio`、`http` 和 `sse`；official docs 表示优先使用 `http`，`sse` 被视为 legacy/deprecated。 |
| OpenClaw | `~/.openclaw/skills`, `<workspace>/skills`, `~/.openclaw/openclaw.json` | Skills 已有清晰文档；generic MCP server config surface 在 official docs 中不够清晰，因此承诺 implementation 前需要验证 MCP sync。 |

其他重要 findings：

- Kiro 当前官方行为 supersedes local repo spec 中 "workspace only" 和 "stdio only" 的说法。
- Qwen 当前 docs 明确区分 `httpUrl` 和 legacy SSE `url`；盲目复制 Claude 的 `url` 过于 lossy。
- Factory 和 Windsurf 都支持 remote MCP，因此 `droid` 不应继续被视为 skills-only。

## 方案提议

### 产品决策

将这项工作视为 **sync parity for MCP-capable providers**，而不是 one-off patch。

也就是说，本 feature 应：

- 为 provider 有 documented skills/MCP surface 的 targets 添加 missing sync targets，
- upgrade partial implementations，避免 existing sync support drop valid Claude MCP data，
- 替换 stale detection metadata，让 `sync --target all` 再次 truthful。

### 范围

#### 范围内

- 为以下 targets 增加 MCP sync coverage：
  - `droid`
  - `windsurf`
  - `kiro`
  - `qwen`
- 扩展 `codex` sync，支持 remote MCP servers。
- 为 newly supported sync targets 添加 provider detection。
- 为所有 synced targets 保持 skills syncing。
- 更新 CLI help text、README sync docs 和 tests。

#### 有条件 / Validation Gate

- `openclaw` skills sync 很直接；如果 target 加入 `sync`，应包含它。
- `openclaw` MCP sync 只有在 config surface 已通过 current upstream docs 或 current upstream source 验证后才实现。如果验证失败，feature 应明确 skip OpenClaw MCP sync 并 warning，而不是 invent format。

#### 范围外

- 将所有 existing sync targets 标准化到 user-level paths。
- 重做 install/convert output roots。
- Hook sync（hook 同步）。
- 完整 rewrite target writers（重写 target writers）。

### 设计决策

#### 0. 除非本 feature 明确新增 target，否则保持 existing sync roots 稳定

不要借此 feature 迁移 existing `copilot` 和 `gemini` sync behavior。

向后兼容规则：

- existing targets 保持 current sync roots，除非 correctness bug 强制改变，
- newly added sync targets 使用 provider documented personal/global config surface，
- future root migration 放到 separate plan。

该 feature 完成后的 planned sync roots：

| Target | Sync root | 说明 |
| --- | --- | --- |
| `opencode` | `~/.config/opencode` | 不变 |
| `codex` | `~/.codex` | 不变 |
| `pi` | `~/.pi/agent` | 不变 |
| `droid` | `~/.factory` | root 不变，新增 MCP file |
| `copilot` | `.github` | 为 backward compatibility 保持不变 |
| `gemini` | `.gemini` | 为 backward compatibility 保持不变 |
| `windsurf` | `~/.codeium/windsurf` | 新增 |
| `kiro` | `~/.kiro` | 新增 |
| `qwen` | `~/.qwen` | 新增 |
| `openclaw` | `~/.openclaw` | 新增，MCP 仍需 validation gate |

#### 1. 添加专用 sync target registry

不要继续把 `sync.ts` 扩展成 hand-maintained switch statement。

创建 dedicated sync registry，例如：

### `src/sync/registry.ts`（sync registry）

```ts
import os from "os"
import path from "path"
import type { ClaudeHomeConfig } from "../parsers/claude-home"

export type SyncTargetDefinition = {
  name: string
  detectPaths: (home: string, cwd: string) => string[]
  resolveOutputRoot: (home: string, cwd: string) => string
  sync: (config: ClaudeHomeConfig, outputRoot: string) => Promise<void>
}
```

该 registry 成为以下内容的 single source of truth：

- 有效的 `sync` targets，
- `sync --target all` detection，
- output root resolution（输出 root 解析），
- dispatch（分发）。

这样可以避免当前以下文件之间 drift：

- `src/commands/sync.ts`
- `src/utils/detect-tools.ts`
- `README.md`

#### 2. 保留 sync semantics，而不是 writer semantics

不要直接复用 install target writers 进行 sync。

原因：

- writers 多数 copy skill directories，
- sync intentional 地 symlink skills，
- writers 通常 emit full plugin/install bundles，
- sync 只需要 personal skills 加 MCP config。

不过，target-specific MCP conversion helpers 应在 practical 时抽取或复用，避免 sync 和 writer logic 再次 diverge。

#### 3. 保持 merge behavior additive，同名冲突时 Claude 胜出

对 JSON-based targets：

- 保留 unrelated user keys,
- 保留 unrelated user MCP servers,
- 但如果 Claude 和 target config 中存在 same server name，sync 时 Claude 的 value 应 overwrite 该 server entry。

Codex 保持 special case：

- 继续使用 managed marker block，
- 移除 previous managed block，
- 从 Claude 重写 managed block，
- 保持 `config.toml` 其余内容不变。

#### 4. 对可能包含 secrets 的 config writes 做安全写入

任何可能包含 MCP headers 或 env vars 的 config file 都应在平台已有 pattern 支持时用 restrictive permissions 写入。

至少：

- `config.toml`
- `mcp.json`
- `mcp_config.json`
- `settings.json`

应尽可能遵循 repo existing "secure write" conventions。

#### 5. 不要静默转换 ambiguous remote transports

Qwen 和未来 targets 可能区分 Streamable HTTP 与 legacy SSE。

使用 mapping rule：

- 如果 Claude 显式提供 `type: "sse"` 或 equivalent known signal，则 map 到 target 的 SSE field，
- 否则对 remote URLs 优先使用 target 的 HTTP form，
- 当 target 要求比 Claude 提供更多 specificity 时，log warning。

## Provider 映射计划

### 需要升级的现有 Targets

#### Codex（现有 target）

当前问题：

- 只 sync stdio servers。

实现：

- 扩展 `syncToCodex()`，使 remote MCP servers 被 serialize 到 Codex TOML format，而不是 dropped。
- 保持 existing marker-based idempotent section handling。

说明：

- 这是 correctness fix，不是 new target。

#### Droid / Factory（现有 target）

当前问题：

- 尽管当前官方 MCP support 已存在，sync 仍是 skills-only。

实现：

- 向 `src/sync/droid.ts` 添加 MCP config writing 到 `~/.factory/mcp.json`。
- 与 existing `mcpServers` merge。
- 支持 `stdio` 和 `http`。

### 新 Sync Targets

#### Windsurf（新增 Sync Target）

添加 `src/sync/windsurf.ts`：

- 将 Claude skills symlink 到 `~/.codeium/windsurf/skills/`
- 将 MCP servers merge 到 `~/.codeium/windsurf/mcp_config.json`
- 支持 `stdio`、Streamable HTTP 和 SSE
- remote HTTP config 优先使用 `serverUrl`
- 保留 unrelated existing servers
- 使用 secure permissions 写入

参考实现：

- `src/targets/windsurf.ts:65-92`

#### Kiro（新增 Sync Target）

添加 `src/sync/kiro.ts`：

- 将 Claude skills symlink 到 `~/.kiro/skills/`
- 将 MCP servers merge 到 `~/.kiro/settings/mcp.json`
- 同时支持 local 和 remote MCP servers
- 保留 `mcp.json` 中已有的 user config

重要：

- 当 repository local Kiro spec 与 official 2025-2026 Kiro docs/blog posts 冲突时，本 feature 必须将 local spec 视为 stale。

参考实现：

- `src/targets/kiro.ts:68-91`

#### Qwen（新增 Sync Target）

添加 `src/sync/qwen.ts`：

- 将 Claude skills symlink 到 `~/.qwen/skills/`
- 将 MCP servers merge 到 `~/.qwen/settings.json`
- 直接 map stdio
- 默认将 remote URLs map 到 `httpUrl`
- 仅当 Claude transport 明确表示 SSE 时 emit legacy SSE `url`

重要：

- 在 docs/comments 中 capture deprecation note：SSE 是 legacy，所以 HTTP 是 default remote mapping。

#### OpenClaw（新增 Sync Target）

只有在 implementation 期间验证通过时，才添加 `src/sync/openclaw.ts`：

- 将 skills symlink 到 `~/.openclaw/skills`
- 如果 official/current upstream contract 已确认，则可选 merge MCP config into `~/.openclaw/openclaw.json`

如果 MCP config 无法验证，fallback behavior：

- 只 sync skills，
- emit warning：OpenClaw MCP sync 被 skip，因为 official config surface 不够清晰。

## 实施阶段

### 阶段 1：Registry 和 shared helpers

文件：

- `src/commands/sync.ts`
- `src/utils/detect-tools.ts`
- `src/sync/registry.ts`（new）
- `src/sync/skills.ts` or `src/utils/symlink.ts` extension
- 可选 `src/sync/mcp-merge.ts`

任务：

- 将 sync target metadata 移入单一 registry
- 让 `validTargets` derive from registry
- 让 `sync --target all` 使用 registry
- 更新 detection，使其包含 supported sync targets，而不是 stale `cursor`
- 为 validated skill symlinking 抽取 shared helper

### 阶段 2：升级 existing partial targets

文件：

- `src/sync/codex.ts`
- `src/sync/droid.ts`
- `tests/sync-droid.test.ts`
- 新增或扩展 `tests/sync-codex.test.ts`

任务：

- 为 Codex sync 添加 remote MCP support
- 为 Droid sync 添加 MCP config writing
- 保留 current skill symlink behavior

### 阶段 3：添加 missing sync targets

文件：

- `src/sync/windsurf.ts`
- `src/sync/kiro.ts`
- `src/sync/qwen.ts`
- 可选 `src/sync/openclaw.ts`
- `tests/sync-windsurf.test.ts`
- `tests/sync-kiro.test.ts`
- `tests/sync-qwen.test.ts`
- 可选 `tests/sync-openclaw.test.ts`

任务：

- 为每个 target 实现 skill symlink + MCP merge
- 将 output paths 对齐到 target documented personal config surface
- secure writes 和 corrupted-config fallbacks

### 阶段 4：CLI、docs 和 detection parity

文件：

- `src/commands/sync.ts`
- `src/utils/detect-tools.ts`
- `tests/detect-tools.test.ts`
- `tests/cli.test.ts`
- `README.md`
- 可选 `docs/specs/kiro.md`

任务：

- 更新 `sync` help text 和 summary output
- 确保 `sync --target all` 只 report real sync-capable tools
- 记录 newly supported sync targets
- 如果同一 change 中更新 repository docs，修正 stale Kiro assumptions

## SpecFlow 分析

### 主要用户流程

#### Flow 1：显式同步到一个 target

1. User 运行 `bunx @every-env/compound-plugin sync --target <provider>`
2. CLI 加载 `~/.claude/skills` 和 `~/.claude/settings.json`
3. CLI resolve provider 的 sync root
4. Skills 被 symlinked
5. MCP config 被 merged
6. CLI 打印 destination path 和 completion summary

#### Flow 2：同步到全部检测到的 tools

1. User 运行 `bunx @every-env/compound-plugin sync`
2. CLI 检测 installed/supported tools
3. CLI 打印发现了哪些 tools、跳过了哪些
4. CLI 按顺序 sync 每个 detected target
5. CLI 打印 per-target success lines

#### Flow 3：已存在 config

1. User 已有 destination config file(s)
2. Sync 读取并 parse existing file
3. Existing unrelated keys 被 preserved
4. Claude MCP entries merge in（合并 Claude MCP entries）
5. Corrupt config 产生 warning，并触发 replacement behavior

### 需要考虑的边界情况

- Claude 有零 MCP servers：skills 仍 sync，不写 config file。
- Claude 有 remote MCP servers：支持 remote config 的 targets 接收它们；unsupported transports 会 warn，不 crash。
- Existing target config 是 invalid JSON/TOML：warn 并替换 managed portion。
- Skill name 包含 path traversal characters：skip with warning，与 current behavior 相同。
- symlink 目标位置已存在 real directory：safe skip，不删除 user data。
- `sync --target all` 检测到有 skills support 但 MCP support 不清楚的 tool：只 sync documented subset，并 explicit warn。

### 已经假设的关键产品决策

- `sync` 保持 additive and non-destructive。
- 当 provider 有 documented personal config location 时，sync roots 可以不同于 install roots。
- OpenClaw MCP support 是 validation-gated，而不是 assumed。

## 验收标准

### 功能需求

- [x] `sync --target` 接受 `windsurf`、`kiro` 和 `qwen`，以及 existing targets。
- [x] `sync --target droid` 将 MCP servers 写入 Factory documented `mcp.json` format，而不是保持 skills-only。
- [x] `sync --target codex` 同步 stdio 和 remote MCP servers。
- [x] `sync --target all` 只检测 sync-capable supported tools，并包含 new targets。
- [x] Claude personal skills 继续 symlinked，而不是 copied。
- [x] Merge 期间保留 existing destination config keys 中与 MCP 无关的内容。
- [x] Existing same-named MCP entries 对 sync-managed targets 从 Claude refresh。
- [x] Unsafe skill names 被 skipped，不删除 user content。
- [x] 如果 OpenClaw MCP sync 未验证，CLI warn 并 skip OpenClaw MCP sync，而不是写 invented format。

### 非功能需求

- [x] 可能包含 secrets 的 MCP config files 在 supported 时以 restrictive permissions 写入。
- [x] Corrupt destination config files 会 warn 并 cleanly recover。
- [x] New sync code 不在多个位置 duplicate target detection metadata。
- [x] Remote transport mapping explicit and tested，尤其是 Qwen 和 Codex。

### Quality gates（质量门）

- [x] 为每个 new or upgraded provider 添加 target-level sync tests。
- [x] 更新 `tests/detect-tools.test.ts`，覆盖 new detection rules 并移除 stale cursor expectations。
- [x] 添加或扩展 `sync --target all` 的 CLI coverage。
- [x] `bun test` passes（通过）。

## 测试计划

### Unit / integration tests（单元 / 集成测试）

新增或扩展：

- `tests/sync-codex.test.ts`
  - remote URL server 被 emitted（输出 remote URL server）
  - existing non-managed TOML content 被 preserved（保留现有非 managed TOML 内容）
- `tests/sync-droid.test.ts`
  - 写入 `mcp.json`
  - 与 existing file merge
- `tests/sync-windsurf.test.ts`
  - 写入 `mcp_config.json`
- merge existing servers（合并已有 servers）
- preserve HTTP/SSE fields（保留 HTTP/SSE fields）
- `tests/sync-kiro.test.ts`
  - 写入 `settings/mcp.json`
  - 支持 user-scope root
- preserve remote servers（保留 remote servers）
- `tests/sync-qwen.test.ts`
  - 写入 `settings.json`
  - 将 remote servers map 到 `httpUrl`
  - 仅在明确指示时 emit legacy SSE
- 如果实现，则添加 `tests/sync-openclaw.test.ts`
- skills path（skills 路径）
  - MCP behavior 或 explicit skip warning

### CLI tests（CLI 测试）

扩展 `tests/cli.test.ts`，或添加 focused sync CLI coverage：

- `sync --target windsurf`
- `sync --target kiro`
- `sync --target qwen`
- `sync --target all` 搭配 detected new tool homes
- `sync --target all` 不再 surface unsupported `cursor`

## 风险与缓解

### 风险：local specs 相比 current provider docs 已过期

影响：

- 只按 local docs implementation 会产出错误 paths 和 transport support。

缓解：

- 当 official 2025-2026 docs/blog posts supersede local specs 时，以 official docs 为 source of truth
- 更新该 feature 触及的明显 stale repo docs

### 风险：remote MCP servers 的 transport ambiguity

影响：

- Claude `url` 可能在区分 HTTP vs SSE 的 targets 上 map 错。

缓解：

- target 推荐时优先 HTTP
- 只有 Claude transport 显式时 emit legacy SSE
- lossy mapping 时 warn

### 风险：OpenClaw MCP surface 文档不足

影响：

- 写 guessed MCP config 会创建 broken 或 misleading feature。

缓解：

- implementation 期间 validation gate
- 若 validation fails，则 ship OpenClaw skills sync only，并将 MCP 记录为 follow-up

### 风险：`sync --target all` 仍容易再次 drift

影响：

- future providers 被加进 install/convert，但 sync 继续漏掉。

缓解：

- 从 shared registry derive sync valid targets 和 detection
- 添加 tests，assert detection 和 sync target lists match expected supported names

## 考虑过的替代方案

### 1. 只向 `sync.ts` 添加更多 cases

拒绝原因：

- 当前 drift 正是这样发生的。

### 2. 直接复用 target writers

拒绝原因：

- writers copy directories and emit install bundles（writers 会复制目录并输出 install bundles）；
- sync 必须 symlink skills，并且只 manage personal config subsets（管理 personal config 子集）。

### 3. 现在就将每个 sync target 标准化到 user-level output

本 feature 拒绝原因：

- 这会改变 existing `gemini` 和 `copilot` behavior，并将 scope 扩大成 migration project。

## 文档计划

- 更新 `README.md` sync section，列出所有 supported sync targets，并 call out exceptions。
- 更新 `windsurf`、`kiro` 和 `qwen` 的 sync examples。
- 如果 OpenClaw MCP 被 skipped，明确记录。
- 如果 implementation 期间修正 repository specs，更新 `docs/specs/kiro.md` 以匹配 official current behavior。

## 成功指标

- `sync --target all` 覆盖 users 从 current CLI 中合理期待的 provider surface，只排除缺少 validated MCP config contract 的 targets。
- 包含一个 stdio server 和一个 remote server 的 Claude config 可以正确 sync 到每个 documented MCP-capable provider。
- Sync 期间不删除 user data。
- Documentation 和 CLI help 不再相对实际 behavior over-promise。

## AI pairing notes（AI pairing 备注）

- 将 official provider docs 视为比 older local notes 更 authoritative，尤其是 Kiro 和 Qwen transport handling。
- AI-generated MCP mapping code merge 前应由 human review，因为这些 config files 可能包含 secrets，lossy transport assumptions 很容易漏掉。
- 使用 implementation agent 时，按 target split work，让每个 provider 的 config contract 可独立测试。

## 参考与调研

### 内部参考

- `src/commands/sync.ts:15-125`
- `src/utils/detect-tools.ts:11-46`
- `src/parsers/claude-home.ts:11-64`
- `src/sync/codex.ts:7-92`
- `src/sync/droid.ts:6-21`
- `src/targets/windsurf.ts:13-93`
- `src/targets/kiro.ts:5-93`
- `src/targets/openclaw.ts:6-95`
- `src/targets/qwen.ts:5-64`
- `docs/solutions/adding-converter-target-providers.md:20-32`
- `docs/solutions/adding-converter-target-providers.md:208-214`
- `README.md:89-123`

### 外部参考

- Factory MCP docs（Factory MCP 文档）：https://docs.factory.ai/factory-cli/configuration/mcp
- Factory skills docs（Factory skills 文档）：https://docs.factory.ai/cli/configuration/skills
- Windsurf MCP docs（Windsurf MCP 文档）：https://docs.windsurf.com/windsurf/cascade/mcp
- Kiro MCP overview（Kiro MCP 概览）：https://kiro.dev/blog/unlock-your-development-productivity-with-kiro-and-mcp/
- Kiro remote MCP support（Kiro remote MCP 支持）：https://kiro.dev/blog/introducing-remote-mcp/
- Kiro skills announcement（Kiro skills 公告）：https://kiro.dev/blog/custom-subagents-skills-and-enterprise-controls/
- Qwen settings docs（Qwen settings 文档）：https://qwenlm.github.io/qwen-code-docs/en/users/configuration/settings/
- Qwen MCP docs（Qwen MCP 文档）：https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/
- Qwen skills docs（Qwen skills 文档）：https://qwenlm.github.io/qwen-code-docs/zh/users/features/skills/
- OpenClaw setup/config docs（OpenClaw setup/config 文档）：https://docs.openclaw.ai/start/setup
- OpenClaw skills docs（OpenClaw skills 文档）：https://docs.openclaw.ai/skills

## 后续 `/workflows-work` Step 的实施说明

建议 implementation order（实施顺序）：

1. registry + detection cleanup（registry 与 detection 清理）
2. Codex remote MCP + Droid MCP（Codex remote MCP 与 Droid MCP）
3. Windsurf + Kiro + Qwen sync modules（Windsurf、Kiro、Qwen sync modules）
4. OpenClaw validation and implementation or explicit warning path（OpenClaw 验证后实现，或走明确 warning 路径）
5. docs + tests（文档与测试）
