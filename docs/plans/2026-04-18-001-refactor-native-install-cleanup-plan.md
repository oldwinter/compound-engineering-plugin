---
title: "refactor: 将 installs 重新聚焦到 native packages 和 shared skill cleanup"
type: refactor
status: active
date: 2026-04-18
---

# 将 installs 重新聚焦到 native packages 和 shared skill cleanup

## 概览

围绕当前 agent-harness behavior 重做 install strategy：

- 在可以安装完整 Compound Engineering payload 的地方使用 native package/plugin installers。
- 避免把 CE-owned installs 写入 `~/.agents`，因为其中的 shared skills 可能 shadow native plugin installs，例如 Copilot。
- 除非 harness package format 明确支持 bundled agents，否则 agents 保持 target-native。
- 为 old CE-owned flat installs、renamed skills、removed skills、converted-agent skills、prompts、commands 和 target-specific artifacts 添加 first-class cleanup path。

本 plan supersedes Copilot-only native plugin plan，因为同一决策现在影响 Codex、Gemini、Pi、OpenCode 和所有 retained custom converter targets。

## 问题框架

当前 CLI 诞生时，多数 targets 都没有 native package/plugin support。现在情况不再统一：

- Claude Code 有 native plugin marketplaces。
- Copilot CLI 有 plugin marketplaces，并能 install repo-hosted plugins。
- Gemini CLI 有 native extensions 和 shared `~/.agents/skills` skill discovery。
- Pi 有通过 `pi install` 的 native packages，也读取 `~/.agents/skills`。
- Codex 有 native plugins，但当前 public docs 仍让 non-official distribution 依赖 local/repo/personal marketplace files。
- OpenCode 也读取 `~/.agents/skills`，但 CE 默认应避免该 root，因为它会 shadow Copilot plugin skills。
- Windsurf 不再需要 active support，应从 user-facing conversion/install flows 中 deprecate，同时为旧 CE artifacts 保留 cleanup。

同时，legacy installs 会留下 stale flat artifacts。例子包括 removed skills（如 `reproduce-bug`）、renamed workflows（`workflows:*` -> `ce:*`）、旧 prompt files，以及旧 converters flatten 成 skills 的 agents。不能删除整个 `~/.agents/skills` 或 `~/.codex/skills`，因为 users 可能在其中有 non-CE skills。

## 需求追踪

- R1. 当 native installers 能用 reasonable user flow 安装完整 useful payload 时，prefer native installers
- R2. 不把 CE-owned installs 写入 `~/.agents`；将它视为 legacy cleanup surface only
- R3. 在 harness supports agents 时，preserve target-specific agent behavior
- R4. 只有 targets 缺少 compatible agent packaging or invocation 时，才继续 convert agents to skills
- R5. Track all CE legacy skills、agents、commands、prompts 和 generated aliases，让 cleanup 可以移除 stale CE-owned artifacts 而不碰 user-owned items
- R6. 任何 remaining custom install path 都必须在每次 install 时运行 legacy cleanup
- R7. Native-install targets 必须有 documented one-time cleanup command，用户在从 old Bun installs 切换前可以运行
- R8. Forward installs 必须写 manifest，使 removed or renamed artifacts 可清理，而不需要永远扩展 hand-maintained legacy list
- R9. README 和 target specs 必须清晰区分 native installer paths 与 legacy/custom converter paths
- R10. Deprecate Windsurf support，并为旧 CE Windsurf installs 保留 cleanup

## 外部调研摘要

| Harness | Shared `~/.agents/skills` | Native package/plugin install | Agent support path | Planning conclusion（planning 结论） |
| --- | --- | --- | --- | --- |
| Claude Code | 不是此 repo 的 primary install path | Yes，`/plugin marketplace add` + `/plugin install` | Plugin `agents/` | 将 Claude native plugin 保持为 canonical。Claude 不需要 Bun install。 |
| Codex | Yes，但 CE 应避免使用，以防 Copilot plugin shadowing。Codex 在当前本地行为中也会 discover `~/.codex/skills`。 | Yes，但当前 docs 描述的是 official plugin directory 加 local repo/personal marketplace files。 | Custom agents 是 `~/.codex/agents` 或 `.codex/agents` 下的 TOML，不是 `~/.agents/agents`。 | 保留 custom Codex install。将 CE skills 写到 `~/.codex/skills/compound-engineering`，并将 Claude agents 转成 `~/.codex/agents` 下的 flat Codex TOML custom agents。 |
| Copilot CLI | Yes。Docs 列出 project `.agents/skills` 和 personal `~/.agents/skills`。 | Yes。`copilot plugin marketplace add OWNER/REPO`，然后 `copilot plugin install NAME@MARKETPLACE`。Copilot 可读取现有 `.claude-plugin/marketplace.json` 和 `.claude-plugin/plugin.json`。 | Personal `~/.copilot/agents`、project `.github/agents`、Claude-compatible `~/.claude/agents` / `.claude/agents`，以及 plugin `agents/`。没有 documented `~/.agents/agents`。 | 使用现有 Claude plugin metadata，将 Copilot 迁移到 native plugin distribution。移除 user-facing Bun install。 |
| Gemini CLI | Yes，但 CE 应避免使用，以防 Copilot plugin shadowing。 | Yes。`gemini extensions install <github-url-or-local-path>`，但 monorepo subdirectory install 未 documented。 | Project `.gemini/agents`、user `~/.gemini/agents` 和 extension `agents/`。已验证的 `.agents/*` alias 适用于 skills，不适用于 subagents。 | 目前保留 custom Bun install 到 `~/.gemini/{skills,agents,commands}`；稍后再重新评估 native extension distribution。 |
| Pi | Yes。Docs 列出 `~/.agents/skills` 和 `.agents/skills`。 | Yes。`pi install npm:...`、`pi install git:...`、URL 或 local path。 | Core Pi 没有内建 subagents；subagents 由 extension/package 提供。Packages 可以 bundle extensions、skills、prompts、themes。 | 如果能干净打包现有 compat extension、prompts 和 skills，则优先使用 Pi package。在此之前，保留 custom writer 和 cleanup。 |
| OpenCode | Yes，但 CE 应避免使用，以防 Copilot plugin shadowing。 | Partial。OpenCode 有 plugins/config，但当前 target design 中没有等价的 repo marketplace install 来承载完整 payload。 | Agents 是 `~/.config/opencode/agents` 或 `.opencode/agents` 下的 OpenCode markdown/config。 | 保留 agents/config 的 custom writer；默认不要通过 `~/.agents/skills` 共享 pass-through skills。 |
| Factory Droid | 当前未确认 `~/.agents/skills`；docs 提到 `.factory/skills`、`~/.factory/skills` 和 project `.agent/skills` compatibility。 | Yes。`droid plugin marketplace add <repo>`，然后 `droid plugin install NAME@MARKETPLACE`。Droid 可直接安装 Claude Code-compatible plugins。 | Plugin agents 通过 native plugin translation path 加载。 | 将 Droid 移到 native plugin distribution，并移除 user-facing Bun install。 |
| Kiro | 当前 docs 中未确认 `~/.agents/skills`。 | 有 import flows，但当前 target 中没有 CE-wide plugin install path。 | Agents 是 `.kiro/agents` JSON + prompt files。 | 保留 custom writer。 |
| Windsurf | 不再与 CE support 相关。 | N/A | 当前 converter 将 agents 映射为 skills。 | Deprecate/remove user-facing support；为旧 CE Windsurf installs 保留 legacy cleanup。 |
| Qwen Code | 不需要 shared `~/.agents` conclusion。 | Extension-oriented target 已有 per-plugin root。 | Qwen 支持 target-native agents。 | 保留 custom writer/package output。 |

已检查来源：

- Codex skills：`https://developers.openai.com/codex/skills`
- Codex plugins：`https://developers.openai.com/codex/plugins` 和 `https://developers.openai.com/codex/plugins/build`
- Codex subagents：`https://developers.openai.com/codex/subagents`
- Copilot agents/skills/plugins：`https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/create-custom-agents-for-cli`, `https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-skills`, `https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference`
- Gemini skills/subagents/extensions：`https://geminicli.com/docs/cli/skills/`, `https://geminicli.com/docs/core/subagents/`, `https://geminicli.com/docs/extensions/reference/`, `https://developers.googleblog.com/subagents-have-arrived-in-gemini-cli/`
- Pi skills/packages：`https://buildwithpi.ai/README.md`, `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/skills.md`, `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md`
- OpenCode skills/agents：`https://opencode.ai/docs/skills`, `https://opencode.ai/docs/agents/`
- Factory Droid skills：`https://docs.factory.ai/cli/configuration/skills`
- Kiro skills/agents：`https://kiro.dev/docs/skills/`, `https://kiro.dev/docs/cli/custom-agents/configuration-reference/`

## 关键决策

### 1. 不要让 `~/.agents` 成为 CE-managed install root

Codex 将 `~/.agents/plugins/marketplace.json` document 为 personal marketplace file，而不是 cross-harness plugin installation convention。Copilot 将 plugins 安装到 `~/.copilot/installed-plugins`，Gemini 将 extensions 安装到 `~/.gemini/extensions`，Pi packages 通过 Pi settings 加 npm/git/local package storage 安装。

`~/.agents/skills` 作为 CE-managed install root 也不安全。Copilot 会优先加载 personal/project skills，再加载 plugin skills，并按 `SKILL.md` 的 `name` deduplicate。为另一个 target 安装到 `~/.agents/skills` 的 CE skill 可能 silently shadow Copilot native plugin 中的 same skill。

将 `~/.agents` 视为 legacy cleanup surface，而不是 forward install surface。

### 2. 按 target 使用 native package distribution，而不是一个 universal folder

Native targets 应使用 target-native packaging：

- Claude：复用 existing `.claude-plugin` marketplace/plugin。
- Copilot: 复用 existing `.claude-plugin` marketplace/plugin metadata. 不添加 parallel `.github/plugin` surface，除非未来出现必要 Copilot-only manifest field。
- Gemini: 暂时使用 custom Bun install to `~/.gemini/{skills,agents,commands}`；未来仍可能做 `gemini-extension.json` distribution。
- Pi：带 `package.json` `pi` manifest 的 npm/git/local package。
- Codex: `~/.codex/skills/compound-engineering`、`~/.codex/agents`，以及 optional future `.codex-plugin/plugin.json`；但在 remote install UX verified 前，不 retire custom install。

### 3. Agents 不能通过 `~/.agents` portable

`~/.agents/skills` 越来越常见。primary sources checked for Codex、Copilot 或 Gemini 中没有 document `~/.agents/agents`。Agent support 必须保持 per target：

- Copilot agents：位于 `~/.copilot/agents`、`.github/agents`、Claude-compatible `.claude/agents` / `~/.claude/agents` 或 plugin `agents` 下的 markdown agent files。
- Gemini sub-agents：位于 `.gemini/agents`、`~/.gemini/agents` 或 extension `agents/` 下的 markdown files。
- Codex custom agents: TOML files under `.codex/agents` / `~/.codex/agents`. CE 应从 Claude Markdown agents 生成这些，而不是把它们 degrade into skills。
- OpenCode agents：位于 `.opencode/agents` / `~/.config/opencode/agents` 下的 markdown/config。
- Kiro agents：位于 `.kiro/agents` 下的 JSON configs 和 prompt files。
- Pi: no built-in subagents；如果 CE 需要 subagent behavior，则 package an extension。

这意味着 previous "convert agents to skills" behavior 对缺少 compatible agent packaging 的 targets 仍是 legitimate，但不应应用到 Copilot 和 Gemini，除非有意 degrade。Gemini 的 2026 年 4 月 subagent support 让这一点更重要：Gemini output 应把 CE agents 作为 subagents packaged under Gemini-owned roots，而 `~/.agents` 保持 cleanup-only。

### 4. Cleanup 必须是 product feature，而不是 incidental writer behavior

当前 `src/data/plugin-legacy-artifacts.ts` 中的 cleanup work 方向正确，但过于 writer-bound。需要 standalone cleanup command，让 users 在从 old Bun installs 切换到 native harness installers 前运行。

Custom writers 仍应自动 invoke cleanup。Native installers 无法清理 unrelated roots 中的 old CE artifacts，因此 users 需要 explicit CE cleanup command。

### 5. Legacy inventory 应从 git history 生成并验证

hand-maintained legacy list 应由 script 支撑，该 script 扫描 git history 中的 historical plugin inventories：

- `plugins/compound-engineering/skills/*`
- `plugins/compound-engineering/agents/*`
- `plugins/compound-engineering/commands/*`
- historical `prompts/*` 或 converted command outputs
- 每个 target 的 renamed colon/underscore/hyphen variants

结果应作为 data commit，tests 应在 current or historical source inventory 包含 untracked CE artifact 时失败。

## 实施单元

- [ ] **Unit 1：添加 platform install strategy spec**

**目标：** 用一个 repo-owned matrix 替换 ad hoc target assumptions，用于 native vs custom install、shared-skill support 和 agent support。

**需求：** R1, R2, R3, R4, R9

**文件：**
- 新增：`docs/solutions/integrations/native-plugin-install-strategy.md`
- 修改：`README.md`
- 按需修改：`docs/specs/codex.md`, `docs/specs/copilot.md`, `docs/specs/gemini.md`, `docs/specs/opencode.md`

**方法：**
- 记录为什么 CE 尽管有 broad discovery support，仍避免使用 `~/.agents/skills`。
- 记录 target-native package locations 和 install commands。
- 将每个 current target 标记为 `native-primary`、`custom-primary` 或 `hybrid`。
- 显式列出 source Claude agents 会变成 target agents 还是 generated skills。

**测试场景：**
- README 不再暗示所有 targets 都需要相同 Bun install path。
- Target specs 对某个 target 使用 native install 还是 custom writer 保持一致。

---

- [ ] **Unit 2：构建 standalone CE cleanup command**

**目标：** 给 users 一条 command，用于在 migrating to native installers 前或过程中，移除 old installs 留下的 stale CE-owned artifacts。

**需求：** R5, R6, R7, R8

**文件：**
- 新增：`src/commands/cleanup.ts`
- 新增或修改：`src/cleanup/*`
- 修改：`src/index.ts`
- 修改：`src/targets/*` custom writers，让它们调用 shared cleanup helpers
- 修改：`tests/cli.test.ts`
- 在 `tests/` 下添加 targeted cleanup tests

**方法：**
- 添加 command，例如 `compound cleanup compound-engineering --targets codex,copilot,gemini,pi,opencode,droid --apply`。
- 默认 dry-run，除非 existing CLI convention strongly favors direct action。
- 将 matched legacy artifacts 移到 timestamped backup，而不是 hard-delete。
- 只触碰 known CE-owned artifacts、existing install-manifest entries，以及 targets are CE-managed 的 symlinks。
- 覆盖 `~/.agents/skills`, `~/.codex/skills`, `~/.codex/prompts`, `~/.copilot/skills`, `~/.copilot/agents`, `~/.gemini/skills`, `~/.gemini/agents`, `~/.gemini/commands`, `~/.pi/agent/{skills,prompts,extensions}`, `~/.config/opencode/{skills,agents,commands,plugins}`, `~/.factory/{skills,commands,droids}`, deprecated `~/.codeium/windsurf/{skills,workflows,mcp_config.json}` 和其他 current writer roots。

**测试场景：**
- Dry run 报告 stale `reproduce-bug`，但不移动它。
- Apply 将 stale CE artifacts 移到 backup。
- 同一 parent directory root 下的 Non-CE skill 被 preserved。
- `~/.agents/skills` 中的 CE-managed symlink 被安全移除或移动。
- CE-looking path 中的 real user-owned directory 会被跳过，除非 manifest/history 证明 CE ownership。

---

- [ ] **Unit 3：生成并验证 historical CE artifact manifest**

**目标：** 当 skills or agents 被 removed、renamed 或 converted 时，防止 future cleanup gaps。

**需求：** R5, R8

**文件：**
- 修改：`src/data/plugin-legacy-artifacts.ts`
- 新增：`scripts/generate-legacy-artifacts.ts` 或类似脚本
- 新增：`tests/plugin-legacy-artifacts-history.test.ts`
- 修改：existing `tests/plugin-legacy-artifacts.test.ts`

**方法：**
- 扫描 git history 中的 CE plugin directories，并按 target normalize names。
- 仅为无法从 source directory history 恢复的 cases 保留 hand-added aliases。
- 以 stable sorted form commit generated data。
- 测试 current source artifacts 和 known removed artifacts 均被包含。

**测试场景：**
- Removed `reproduce-bug` 仍保留在 cleanup data 中。
- 如果 `document-review` rename 为 `ce-doc-review`，old 和 new cleanup-relevant names 都被 tracked。
- Historical `prompts` outputs 仍是 cleanup candidates。
- Colon、underscore 和 hyphen variants 对 Codex、Gemini、Pi 和 OpenCode 正确 normalize。

---

- [ ] **Unit 4：通过 existing Claude metadata 将 Copilot 迁移到 native plugin distribution**

**目标：** 用 Copilot marketplace/plugin install 替换 user-facing `bunx ... --to copilot`。

**需求：** R1, R3, R4, R7, R9

**文件：**
- 修改：`README.md`
- 修改：`docs/specs/copilot.md`
- 如果 direct install deprecated，则修改 CLI target registration/tests
- 重新评估/移除：`src/converters/claude-to-copilot.ts`, `src/targets/copilot.ts`, `src/types/copilot.ts`，以及不再服务 release validation 的 Copilot writer/converter tests

**方法：**
- 使用 existing root `.claude-plugin/marketplace.json`；Copilot CLI 会明确读取该 marketplace metadata。
- 使用 existing plugin-local `.claude-plugin/plugin.json`；Copilot CLI 可从 `.claude-plugin/plugin.json` discover plugin manifests。
- 记录 Copilot native install instructions：
  - `copilot plugin marketplace add EveryInc/compound-engineering-plugin`
  - `copilot plugin install compound-engineering@compound-engineering-plugin`
- 保持 plugin agents 为 agents，而不是 generated skills。
- 不创建 parallel `.github/plugin` metadata 或 `agents-copilot/` output，除非证明存在 real compatibility failure。
- 切换 old installs 前，运行或推荐 `compound cleanup compound-engineering --targets copilot,codex --apply`。
- 将 stale Copilot skills 视为 shadowing risk，而不只是 duplicate-display risk。Copilot 按 `SKILL.md` `name` deduplicates skills，采用 first-found-wins precedence，且 personal/project skill roots（如 `~/.agents/skills`）先于 plugin skills 加载。

**测试场景：**
- Existing `.claude-plugin/marketplace.json` parses，并有一个 `compound-engineering` entry whose `source` points at `plugins/compound-engineering`。
- Existing `plugins/compound-engineering/.claude-plugin/plugin.json` parses，且对 Claude 和 Copilot 都足够 valid。
- Copilot docs/spec 记录 native install commands 和 `.claude-plugin` compatibility。
- README 不再将 old direct Copilot Bun install 宣传为 primary path。
- 如果可能，在 temporary config directory 中 local-path Copilot plugin install 成功，且不修改用户真实 Copilot home。
- seeded stale `~/.agents/skills/ce-plan/SKILL.md` 在 docs/tests 或 manual verification 中 shadow plugin-provided `ce-plan`，证明即使 Copilot 不显示 duplicate skills，cleanup 也仍必需。

---

- [ ] **Unit 5：更新 Gemini custom install，并 defer extension packaging**

**目标：** 暂时让 Gemini 继续使用 custom Bun installer，但使其写入 Gemini-native skills and subagents under `~/.gemini`，不使用 `~/.agents`。

**需求：** R1, R3, R4, R7, R9

**文件：**
- 按需新增或生成：Gemini skill/agent/command payloads
- 修改：`docs/specs/gemini.md`
- 修改：`README.md`
- 重新评估：`src/converters/claude-to-gemini.ts`, `src/targets/gemini.ts`

**方法：**
- 将 pass-through skills 写入 `~/.gemini/skills`。
- 将 normalized flat Gemini subagents 写入 `~/.gemini/agents`。
- 如果 CE 再次 ship commands，将 command TOML files 写入 `~/.gemini/commands`。
- 将 managed manifest 写入 `~/.gemini/compound-engineering/install-manifest.json`。
- 不要将 CE-owned Gemini artifacts 写入 `~/.agents/skills`。
- 不要假设 `gemini extensions install` 支持 monorepo subdirectory 的 `--path`。Current docs 和 local help list GitHub repository URL or local path sources，而 `--path` 是为 `gemini skills install` documented。
- Defer native extension distribution，直到选择一种 installed source root 包含 `gemini-extension.json` 的形状：dedicated Gemini extension repo、generated distribution branch/package 或 release asset。
- 尽可能 preserve agent prompt bodies；必要工作是将 agent files flatten 成 direct `agents/*.md` entries，并 strip/translate Claude-specific frontmatter，例如 `color` 和 string-form `tools`。

**测试场景：**
- Bun install 写入 Gemini-owned roots，且不写入 `~/.agents/skills`。
- Gemini-specific agents 被 package 为 extension sub-agents，除非 deliberate configured，否则不 flatten into skills。
- Generated Gemini agents 是 `~/.gemini/agents` 下的 flat direct files，包含 strict Gemini-compatible frontmatter，并能无 validation errors 加载。
- Legacy `.gemini` direct install cleanup 仍从 cleanup command 运行。

---

- [ ] **Unit 6：添加或 defer Pi package distribution**

**目标：** 决定 CE 是否可通过 `pi install` 安装；如果可以，将 existing Pi output package 成 real Pi package。

**需求：** R1, R4, R6, R7, R9

**文件：**
- 新增或修改：Pi package distribution 的 package metadata
- 修改：`docs/specs/pi.md`（如果已创建），否则新增
- 修改：`README.md`
- 重新评估：`src/converters/claude-to-pi.ts`, `src/targets/pi.ts`

**方法：**
- 如果不想要求 users 手动 clone repository，prefer npm package distribution。
- 使用 `package.json` `pi` manifest package Pi resources：`skills`、`prompts` 和 `extensions`。
- 在 promote Pi native package 为 primary 前，解决 existing compat-extension conflict risk。
- 在 packaged and tested 前，保留 custom Pi writer，并让它每次 install 调用 shared cleanup。

**测试场景：**
- Pi package manifest 包含 skills/prompts/extensions。
- Existing `compound-engineering-compat.ts` 不与 popular subagent packages 冲突，或变为 conditional。
- Cleanup 移除 `~/.pi/agent` 下的 old direct writer artifacts。

---

- [x] **Unit 7：理顺 remaining custom targets 并 deprecate Windsurf**

**目标：** 明确哪些 targets 仍需要 Bun converter/install path，从 active support 中移除 Windsurf，并确保每个 retained or deprecated target 都有 cleanup coverage。

**需求：** R4, R6, R8, R9, R10

**文件：**
- 修改：`src/targets/index.ts`
- 修改：`src/targets/{codex,opencode,kiro,qwen}.ts`
- 删除：native-marketplace targets（如 Droid 和 Copilot）的 custom plugin install writers
- 删除：`src/converters/claude-to-windsurf.ts`, `src/types/windsurf.ts`, `src/targets/windsurf.ts`, `src/sync/windsurf.ts`, `tests/windsurf-*.test.ts`
- 修改：README target table
- 修改：target writer tests

**方法：**
- 保留 native install 不覆盖 full payload 或缺少足够 docs 的 custom targets。
- 每个 custom install 都运行 shared cleanup。
- 从 user-facing `convert`、`install`、`sync`、README 和 target lists 中 deprecate Windsurf。
- 保留 Windsurf cleanup support，使 old CE artifacts 即使 active support 移除后仍可从 `~/.codeium/windsurf/` 移除。
- 对 Codex，保留 current custom install as primary，直到 native plugin distribution from a GitHub repo 与 Copilot/Gemini/Pi 一样简单，或 official directory publishing 可用。
- 对 Codex skills，写入 `~/.codex/skills/compound-engineering/<skill>`，manifest under `~/.codex/compound-engineering/`；不要写入 `~/.agents/skills`。
- 对 Codex agents，将 Claude Markdown agents 转为 flat TOML custom agents under `~/.codex/agents`，使用 CE-prefixed names 如 `ce-review-correctness-reviewer`，并更新 converted skill content，使 `Task`/agent references 明确要求 Codex spawn named custom agent。
- Codex skill-plus-agent split was smoke-tested on 2026-04-18：`~/.agents/skills/ce-codex-agent-smoke` 中的 skill 成功 spawn `~/.codex/agents/ce-codex-agent-smoke.toml` 中的 TOML custom agent，并返回 `CODEX_TOML_AGENT_SMOKE_OK`。
- Codex duplicate discovery was also smoke-tested on 2026-04-18：相同 skill name 安装在 `~/.agents/skills` 和 legacy `~/.codex/skills` 下时，会在 skill picker 中出现两次。Codex cleanup 必须在写入 namespaced `~/.codex/skills/compound-engineering` install 前，从两个 roots 移除 old CE-owned skills。
- Shared skill nesting was smoke-tested on 2026-04-18：Codex 能发现 `~/.agents/skills` 下的 flat、nested 和 Superpowers-style symlink-pack skills，但 Copilot 和 Gemini 只发现 flat direct `~/.agents/skills/<skill>/SKILL.md` shape。CE 无论如何都应避免这个 root，因为 Copilot shadowing。
- 对 OpenCode，除非 user explicitly opts into cross-harness shared skills 并理解 Copilot shadowing，否则不要通过 `~/.agents/skills` share pass-through skills。

**测试场景：**
- 每个 custom writer 都用正确 target roots 调用 cleanup。
- Target writer manifests 会移除 installs 之间消失的 artifacts。
- Windsurf 不再作为 active install target 被宣传或可选择。
- Cleanup 仍可识别并 back up old CE Windsurf artifacts。
- README table 与 registered target behavior 匹配。

## 顺序安排

1. 先 land strategy spec 和 cleanup command。无论下一个 native packaging target 是谁，这都会降低 migration risk。
2. 接着 promote Copilot native install，因为其 plugin marketplace flow 已 documented，且最接近 Claude model。
3. 在 Copilot 后添加 Gemini extension packaging，因为 Gemini 可通过 extensions bundle skills、commands 和 preview sub-agents。
4. 解决 extension conflict 和 npm-package shape 后再决定 Pi packaging。
5. 最后 revisit Codex native plugins；platform 支持 plugins，但 public distribution UX 对 GitHub-hosted third-party plugin 来说仍不如 Copilot/Gemini/Pi 直接。
6. Deprecate Windsurf，并保留 remaining custom targets，cleanup mandatory and manifest-backed。

## 开放问题

- cleanup command 应 default to dry-run 还是 apply？Recommendation：standalone use 默认 dry-run；custom install writers 内自动 apply。
- native package payloads 应 check in，还是 release validation 期间生成？Recommendation：如果 target package 必须存在于 repo，生成后在 CI 中 check determinism。
- existing `@every-env/compound-plugin` npm package 是否也应成为 Pi package，还是 Pi 应有更小的 dedicated npm package？Recommendation：先调查 package contents；避免让 Pi installs 背负 converter-only code。
- Codex native plugin support 是否应作为 experimental 与 custom install 一起 document？Recommendation：yes，但在 remote marketplace install end to end verified 前，不 retire custom install。

## 验证

- touching CLI、writers 或 conversion 的 implementation units 后运行 `bun test`。
- native package manifests 或 plugin inventory changes 后运行 `bun run release:validate`。
- native installers 的 manual smoke tests：
  - Claude: `/plugin install compound-engineering`
  - Copilot: `copilot plugin marketplace add EveryInc/compound-engineering-plugin` then install（然后安装）
  - Gemini: `gemini extensions install <repo-url-or-local-path>`
  - Pi: `pi install npm:<package>` or local package path（或 local package path）
- 使用 seeded temp homes 对 `~/.agents`, `~/.codex`, `~/.copilot`, `~/.gemini`, `~/.pi`, `~/.config/opencode` 和 `~/.factory` 做 cleanup smoke test。
