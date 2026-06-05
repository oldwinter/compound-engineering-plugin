---
title: "feat: 随 Claude manifests 一起发布 Codex-format plugin manifests"
type: feat
status: active
date: 2026-04-20
---

# feat: 随 Claude manifests 一起发布 Codex-format plugin manifests

## 概览

在 repo 中随现有 Claude-format manifests 一起添加 Codex-format plugin manifests（`.agents/plugins/marketplace.json` 加每个 plugin 的 `.codex-plugin/plugin.json`），让 Codex users 可以通过 native `codex plugin marketplace add EveryInc/compound-engineering-plugin` flow 安装 CE 的 skills。

Codex 的 native plugin spec 不支持 agents，因此仍需要现有 Bun converter（`bunx @every-env/compound-plugin install compound-engineering --to codex`）来完成 CE install。为了避免用户同时运行两个 flows 时发生 skill double-registration，Bun converter 的 `--to codex` 默认行为改为 **agents-only**；opt-in 的 `--include-skills` flag 可为 standalone installs 重新启用 full bundle。README 会记录两步 flow。

## 问题框架

Codex 是 CE installable set 中唯一仍依赖 Bun converter 才能完成 baseline（skills）install 的 target。其他工具要么已有 native support（Claude Code、Cursor、Copilot、Droid、Qwen），要么根本没有 native install mechanism（OpenCode、Pi、Gemini、Kiro）。Codex 实际上有 native plugin format，我们只是还没有发布对应 manifests。

发布 Codex manifests 会：

* 让 Codex 在 discovery 和 lifecycle 上进入与 Copilot/Droid/Qwen 相同的 “native install” tier（通过 `codex plugin` install/uninstall/update）

* 不改变 agent install path（按 spec 和我们的 empirical test，native Codex plugin install 不注册 custom agents）

* 成本约为每个 plugin 两个手写 JSON files 加一个小的 release-infra extension，因为 repo 已经支持 dual-format manifests（Claude + Cursor），添加第三种 format 是 parallel entry，不是新 pattern

## 需求追踪

* R1. `codex plugin marketplace add <local-clone>` 必须成功并注册 CE plugin

* R2. `codex plugin install compound-engineering` 必须把 CE 的 skills 安装到预期 Codex skill location

* R3. `.codex-plugin/plugin.json` 中的 plugin version 必须在 release 时自动与 `.claude-plugin/plugin.json` 保持同步

* R4. 如果 Codex manifests 与 Claude manifests 漂移不同步（plugin list mismatch、name mismatch、version mismatch），`bun run release:validate` 必须失败

* R5. README 记录 Codex native install flow，并包含 agents 的 followup step

* R6. 不回归现有 Claude、Cursor、Copilot、Droid、Qwen 或 Bun-converter install paths

## 范围边界

* Native Codex plugin install 只处理 skills（Codex spec 不注册 custom agents 或 slash commands）。Agents 仍通过 Bun converter 流转；Unit 9 会修改 converter 默认行为，使其默认不 emit skills，以防 double-registration。

* Commands 不通过 native Codex plugin install 安装（Codex spec limitation）。这只影响发布 commands 的 `coding-tutor` plugin。需要 commands 的 coding-tutor users 使用 `--include-skills` 运行 Bun converter。

* 不做 single-command hybrid UX（两步 `codex plugin install` + `bunx ... --to codex` flow 只文档化，不自动化）。当 Codex native 支持 custom agents 后，这会过时；到那时整个 `--to codex` converter path 都会 deprecated。

* 不包含 logo asset，省略 `interface.logo`；有 branded icon 后可在 followup 添加

* 不添加 Codex-specific skill frontmatter fields（`metadata.priority`、`metadata.pathPatterns`、`metadata.bashPatterns`）；这些是 trigger-tuning extensions，registration 不需要，可在 followups 中按 skill 添加

* 本计划不包含 remote-repo install 的 empirical test。README 中记录的 remote `codex plugin marketplace add EveryInc/compound-engineering-plugin` flow 无法从 feature branch 测试，因为 Codex 会 fetch remote 的 default branch。Remote-install verification 是 merge 后、release tag 前的独立手工步骤：clone 已 merge 的 `main`，对它运行 remote install command，确认 skills 注册。如果 remote path 失败，发布 fix-forward PR，而不是 rollback。`source: { source: "local", path: "./plugins/<name>" }` 已经被 empirical verification 证明是 bundled 和 remote-cloned marketplaces 都正确的 schema（见 Resolved Open Questions），因此最可能的 remote-vs-local divergence，也就是 schema，已经降低风险

### 推迟到单独任务

* 将 `codex plugin install` 与 agent followup 打包为单个 command 的 hybrid install UX：等 Codex native spec 更稳定后另起 future plan

* 为 discoverability 调整 Codex-specific skill metadata（priority、path patterns、bash patterns）：随着 use patterns 出现，在 followups 中按 skill 评估

* Plugin logo asset design：交给 design，之后再加入

* 一旦 Codex native 支持 custom agents，完全移除 `--to codex` Bun converter path；到那时 `codex plugin install` 本身就足够

## 上下文与调研

### 相关代码与模式

* `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json` — 现有 dual-format marketplace manifests（Cursor mirror Claude schema；Codex 会 diverge）

* `plugins/compound-engineering/.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json` — 现有 dual plugin manifests（name/description/version/author/homepage/keywords 的 source of truth）

* `.github/release-please-config.json` — `plugins/compound-engineering` 和 `plugins/coding-tutor` packages 已为 `.claude-plugin/plugin.json` 和 `.cursor-plugin/plugin.json` 列出 `extra-files`；Codex 会在每处添加第三个 entry

* `.github/.release-please-manifest.json` — 按 release-please package 跟踪 versions；Cursor marketplace（`.cursor-plugin`）是 separate tracked package；Codex marketplace spec 没有 `version` field，因此 Codex 大概率不需要自己的 tracked package（见 Key Technical Decisions）

* `src/release/components.ts` — 声明 release components（`marketplace`、`cursor-marketplace`、CLI、per-plugin）及其 source-of-truth file paths

* `src/release/metadata.ts` — 读取各类 marketplace + plugin manifests，并 cross-check / update versions 和 descriptions 的 sync engine

* `src/release/config.ts` — validator stubs（目前只检查 `changelog-path` shape）；为 Codex-consistency rules 在这里或 `metadata.ts` 中扩展

* `scripts/release/validate.ts` — `bun run release:validate` 运行的 entry point；消费上述内容

* `tests/release-components.test.ts`, `tests/release-config.test.ts`, `tests/release-metadata.test.ts` — release infra 的 existing test coverage；随 code changes 一起扩展

### 外部参考

* Codex plugin docs（Codex plugin 文档）: [developers.openai.com/codex/plugins](https://developers.openai.com/codex/plugins), [developers.openai.com/codex/plugins/build](https://developers.openai.com/codex/plugins/build)

* Canonical reference repo: `github.com/openai/plugins` — 确认 repo root 的 `.agents/plugins/marketplace.json`，以及每个 plugin 的 `.codex-plugin/plugin.json`

* Local evidence（本地证据）:

  * `~/.codex/.tmp/bundled-marketplaces/openai-bundled/.agents/plugins/marketplace.json` — bundled OpenAI example，minimal shape（捆绑 OpenAI 示例，最小 shape）

  * `~/.codex/.tmp/plugins/plugins/vercel/` — 带 skills 的 fully-featured plugin；展示 `"skills": "./skills/"` declaration pattern 和 `interface{}` block shape

### Documented Codex format（由上述来源整理）

**`.agents/plugins/marketplace.json`**（repo root；Codex clone 后会查看这里）：

```json
{
  "name": "compound-engineering-plugin",
  "interface": { "displayName": "Compound Engineering" },
  "plugins": [
    {
      "name": "compound-engineering",
      "source": { "source": "local", "path": "./plugins/compound-engineering" },
      "policy": { "installation": "AVAILABLE", "authentication": "ON_INSTALL" },
      "category": "Coding"
    }
  ]
}
```

**`plugins/<name>/.codex-plugin/plugin.json`**（plugin manifest 文件）:

```json
{
  "name": "...",
  "version": "...",
  "description": "...",
  "author": { "name": "...", "email": "...", "url": "..." },
  "homepage": "...",
  "repository": "...",
  "license": "...",
  "keywords": ["..."],
  "skills": "./skills/",
  "interface": {
    "displayName": "...",
    "shortDescription": "...",
    "longDescription": "...",
    "developerName": "...",
    "category": "Coding",
    "capabilities": ["Interactive", "Read", "Write"],
    "websiteURL": "...",
    "privacyPolicyURL": "...",
    "termsOfServiceURL": "...",
    "defaultPrompt": ["..."],
    "screenshots": []
  }
}
```

Docs 中的 required fields：`name`、`version`、`description`。其它都是 optional。Native install 会注册 skills（通过 `skills:` key）、MCP servers（`mcpServers:`）、apps（`apps:`）、hooks（`hooks:`）。Agents、commands 和 prompts 不能 declarable，也不会 auto-discovered。

## 关键技术决策

* **Commit manifests，不生成。** 手工编写，像 source 一样 versioned。release-please 通过 `extra-files` bump `.codex-plugin/plugin.json` 中的 `version`，与 Claude + Cursor 已使用的机制相同。

* **不要把 Codex marketplace 作为 release-please package 追踪。** Codex marketplace spec（`.agents/plugins/marketplace.json`）没有 `version` field，这不同于带 `metadata.version` 的 Claude 和 Cursor marketplaces。把 Codex marketplace 当作 static content；只有每个 plugin 的 `.codex-plugin/plugin.json` version 需要 automated bumping。

* **扩展 `src/release/metadata.ts` 以读取 Codex manifests 并 cross-check。** 镜像 Cursor manifests 的添加方式：读取它们，用 Claude source of truth cross-reference plugin lists 和 versions，漂移时 validation fail。

* **暂时省略 `interface.logo`。** 按 docs 为 optional；bundled OpenAI example 有 logo，但许多 listed plugins 没有。先不带 logo ship，等有 icon 后再添加。

* **不添加 Codex-specific skill frontmatter extensions。** `metadata.priority`、`metadata.pathPatterns`、`metadata.bashPatterns` 是 trigger-tuning optimizations，registration 不需要。CE skills 将继续使用当前 Claude-compatible frontmatter；Codex 会以 default trigger behavior 注册它们。

* **`coding-tutor` 仍需要 Codex manifest**，即使 native install 不会处理它的 commands。原因是 marketplace 将两个 plugins 作为一个整体列出；从 Codex marketplace 省略 coding-tutor 会与 Claude marketplace 不对称。Native install 会成功安装 coding-tutor 的 skills，但不会安装 commands；README 的 coding-tutor install instructions 会说明 commands 需要 Bun converter。

* **需要 enforce 的 validation failure modes：** Claude manifest 存在但 Codex manifest 缺失；`.claude-plugin/marketplace.json` 与 `.agents/plugins/marketplace.json` 之间 plugin list mismatch；成对 plugin.json files 之间 name mismatch；成对 plugin.json files 之间 version mismatch；声明的 `skills: "./skills/"` 指向不存在的 directory。

## 开放问题

### 规划期间已解决

* **需要发布 logo 吗？** 不需要，省略该 field。有 asset 后在 followup 添加。

* **Skills 是否应声明 Codex metadata extensions？** 不需要，先以 default trigger behavior 发布。如果 use patterns 显示需要，在 followups 中按 skill tuning。

* **Codex marketplace 是 release-please package 吗？** 不是。按 Codex spec 它没有 version field，因此保持 static。每个 plugin 的 `.codex-plugin/plugin.json` 是唯一 versioned file。

* **`coding-tutor` 是否获得 Codex manifest？** 是，为了与 Claude 保持 marketplace parity。Native install 会注册其 skills，但不会注册 commands；README 会说明该 gap。

* **`skills:` declaration 的 file paths 是 plugin-relative 还是 marketplace-relative？** Plugin-relative。`plugins/compound-engineering/.codex-plugin/plugin.json` 中的 `"skills": "./skills/"` 表示 `plugins/compound-engineering/skills/`。已通过 vercel 和 github plugin examples 确认。

* **`source: "local"` marketplace schema 是否适用于 remote-cloned marketplaces，而不仅是 bundled ones？** 是。`openai-curated` marketplace（Codex fetch、clone 并 cache 到 `~/.codex/.tmp/plugins/.agents/plugins/marketplace.json` 的真实 remote-fetched marketplace）使用完全相同的 `source: { source: "local", path: "./plugins/<name>" }` schema。“local” 指 plugin 与 marketplace repo 位于同一 repo 中，而不是“bundled with Codex”。两者使用同一 schema。

* **Codex default skill discovery 能否在 CE 的层级找到 flat `skills/<name>/SKILL.md` layouts？** 可以。Vercel reference plugin 位于 `~/.codex/.tmp/plugins/plugins/vercel/skills/`，使用与 CE ship 完全相同的 layout：flat subdirectories，每个包含 `SKILL.md`。CE 在 `plugins/compound-engineering/skills/` 下有 43 个 skill directories。Unit 7 包含 count-based assertion，用于捕获 partial-discovery regressions。

### 推迟到实现阶段

* **每个 plugin 的具体 `interface.shortDescription` / `longDescription` copy。** 使用 `.claude-plugin/plugin.json` 中的 `description` 作为 short form；从 plugin 的 README section 或现有 marketplace description 组合 longer version。可在 implementation 期间细化。

* **`codex plugin install` 是否能针对该 branch 的 local clone 成功？** empirical verification 在 implementation 期间进行。如果 plugin manifest schema 被拒绝（例如 docs 中未识别出的 required field），就迭代。

* **Codex skills mechanism 是否无需修改即可注册 CE skills？** implementation 期间做 local empirical test。CE skills 使用标准 Claude frontmatter（`name`、`description`）；Codex docs 表示这些是 required fields。预期可行。

## 实施单元

* [ ] **Unit 1：编写** **`plugins/compound-engineering/.codex-plugin/plugin.json`**

**目标：** 为 primary CE plugin 编写 Codex plugin manifest，声明 skills 并填充 interface metadata。

**需求：** R1, R2

**依赖：** 无

**文件：**

* 创建：`plugins/compound-engineering/.codex-plugin/plugin.json`

**方法：**

* 读取 `plugins/compound-engineering/.claude-plugin/plugin.json` 中的 Claude manifest，作为 source-of-truth fields（name、version、description、author、homepage、license、keywords）。

* 添加 Codex-specific fields：`skills: "./skills/"`，以及包含 `displayName`、`shortDescription`（复用 `description`）、`longDescription`（1-2 sentence pitch，可从 README lead paragraph 提取）、`developerName`（从 author 派生）、`category: "Coding"`、`capabilities: ["Interactive", "Read", "Write"]`、`websiteURL: homepage`、`privacyPolicyURL` / `termsOfServiceURL`（可用时复用 Every 现有 policy URLs；否则省略，按 docs 为 optional）、`defaultPrompt: []`（可留空或添加 2-3 个 starter prompts）的 `interface{}` block。

* 省略 `logo`（已在 Key Technical Decisions 中决定）。

* 省略 `mcpServers`、`apps`、`hooks`（CE 不 ship 这些）。

**遵循模式：**

* `plugins/compound-engineering/.claude-plugin/plugin.json` — shared fields 的 source of truth

* `~/.codex/.tmp/plugins/plugins/vercel/.codex-plugin/plugin.json`（locally cached）— `interface{}` field shape 和 `skills:` declaration 的 real-world reference

* `~/.codex/.tmp/plugins/plugins/github/.codex-plugin/plugin.json`（locally cached）— 另一个声明 skills 的 reference

**测试场景：**

* Test expectation：无 -- 纯 content addition，无 code。Functional verification 在 Unit 7（empirical install test）中完成。

**验证：**

* File exists，并能 parse 为 valid JSON

* `jq` queries 返回 expected values：`.name == "compound-engineering"`、`.skills == "./skills/"`、`.interface.displayName` non-empty

***

* [ ] **Unit 2：编写** **`plugins/coding-tutor/.codex-plugin/plugin.json`**

**目标：** 为 secondary CE plugin 编写 Codex plugin manifest。

**需求：** R1

**依赖：** 无（与 Unit 1 parallel）

**文件：**

* 创建：`plugins/coding-tutor/.codex-plugin/plugin.json`

**方法：**

* 与 Unit 1 相同，使用 `plugins/coding-tutor/.claude-plugin/plugin.json` 作为 source of truth。

* `coding-tutor` ship skills + commands。只声明 `skills: "./skills/"` — commands 无法通过 native Codex plugin install 安装（Codex spec limitation）。

* 让 `interface.longDescription` 如实说明 native install 可用内容（仅 skills）；需要 commands 的 users 通过 README 被引导到 Bun converter。

**遵循模式：**

* Unit 1（mirror structure 和 field choices）

* source of truth（真源）：`plugins/coding-tutor/.claude-plugin/plugin.json`

**测试场景：**

* Test expectation：无 -- 纯 content addition。

**验证：**

* File exists，valid JSON，`jq` queries 返回 expected values

***

* [ ] **Unit 3：编写** **`.agents/plugins/marketplace.json`**

**目标：** 在 repo root 编写 Codex marketplace manifest，列出两个 CE plugins，让 `codex plugin marketplace add <repo>` 成功。

**需求：** R1

**依赖：** Unit 1、Unit 2（marketplace 引用两个 plugin manifests）

**文件：**

* 创建：`.agents/plugins/marketplace.json`

**方法：**

* 按 Codex docs 和 bundled OpenAI example 使用 schema：

  * `name: "compound-engineering-plugin"`（匹配 Claude marketplace 的 `name`）

  * display name（显示名称）：`interface.displayName: "Compound Engineering"`

  * `plugins[]` 包含两个 entries，每个 plugin 一个；每个都使用 nested `source: { source: "local", path: "./plugins/<name>" }` shape

  * Each plugin entry（每个 plugin entry）: `policy: { installation: "AVAILABLE", authentication: "ON_INSTALL" }`, `category: "Coding"`

* 不添加 `version` field（Codex spec 不要求；让此 file 保持 static）。

* 不添加 `owner` field（Codex marketplace schema 不包含它；owner info 通过 `author` 位于各 plugin 的 `.codex-plugin/plugin.json` 中）。

**遵循模式：**

* `~/.codex/.tmp/bundled-marketplaces/openai-bundled/.agents/plugins/marketplace.json` — canonical schema reference（规范 schema 参考）

* `.claude-plugin/marketplace.json` — 用于决定列出哪些 plugins（maintain parity）

**测试场景：**

* Test expectation：无 -- 纯 content addition。

**验证：**

* File exists，valid JSON（文件存在且 JSON 有效）

* plugin count（plugin 数量）：`.plugins | length == 2`

* Plugin names 与 `.claude-plugin/marketplace.json` 中的 names 匹配

***

* [ ] **Unit 4：扩展 release-please config 以 bump** **`.codex-plugin/plugin.json`** **versions**

**目标：** 每次 release 时，release-please 在现有 `.claude-plugin/plugin.json` 和 `.cursor-plugin/plugin.json` bumps 之外，同时更新两个 `.codex-plugin/plugin.json` files 中的 `version`。

**需求：** R3

**依赖：** Unit 1 和 Unit 2（这些 files 必须存在，release-please 才能更新它们）

**文件：**

* 修改：`.github/release-please-config.json`

**方法：**

* 对 `plugins/compound-engineering` package entry，在 `extra-files` 中添加第三个 entry：

  ```
  { "type": "json", "path": ".codex-plugin/plugin.json", "jsonpath": "$.version" }
  ```

* 对 `plugins/coding-tutor` package entry 做同样添加。

* 不为 Codex marketplace 新增 top-level package — `.agents/plugins/marketplace.json` 是 static（没有 version field）。

* 不修改 CLI level 的 `exclude-paths` — `.agents/` 已在那里 excluded。

**遵循模式：**

* 同一 `extra-files` arrays 中现有 `.cursor-plugin/plugin.json` entries — 这是 mechanical parallel addition

**测试场景：**

* Test expectation：JSON file 本身无测试。Unit 5 的 validator coverage 会 exercise updated config。

**验证：**

* 本 unit 后 `bun run release:validate` 仍通过

* release-please dry-run / preview（如果 repo CI 中可用）显示两个 Codex plugin.json files 会在下一次 release 被 bumped

***

* [ ] **Unit 5：扩展 release metadata sync + validator 以覆盖 Codex manifests**

**目标：** `bun run release:validate` 会将 `.agents/plugins/marketplace.json` + `.codex-plugin/plugin.json` files 与 Claude source of truth cross-check，并在 drift 时失败。

**需求：** R4

**依赖：** Unit 1、Unit 2、Unit 3

**文件：**

* 修改：`src/release/components.ts`

* 修改：`src/release/metadata.ts`

* 修改：`scripts/release/validate.ts`（如果 Codex manifests 需要在 validate output 中单独 surfaced；如果 `syncReleaseMetadata` 已驱动全部内容，可能是 no-op）

* 测试：`tests/release-components.test.ts`、`tests/release-metadata.test.ts`（扩展）

**方法：**

* **`src/release/components.ts`：** 为 Codex manifests 声明任何新的 file-path constants。是否需要新的 "component" entry 取决于 sync engine 结构；目标是让 sync engine 知道去哪里找 Codex files，而不是让 Codex 获得自己的 release-please package。遵循现有 `.cursor-plugin/marketplace.json` / `.cursor-plugin` plugin pattern，但省略 marketplace-version tracking。

* **`src/release/metadata.ts`：** 扩展 `syncReleaseMetadata`，额外执行：

* 读取 `plugins/compound-engineering/.codex-plugin/plugin.json` 和 `plugins/coding-tutor/.codex-plugin/plugin.json`

* 读取 `.agents/plugins/marketplace.json`

* Cross-check（交叉检查）：

    * `.claude-plugin/marketplace.json` 中的每个 plugin 都在 `.agents/plugins/marketplace.json` 中有 corresponding entry（same `name`）

    * 对每个同时有两种 formats 的 plugin：`.claude-plugin/plugin.json` 和 `.codex-plugin/plugin.json` 中的 `name` 匹配

    * 对每个同时有两种 formats 的 plugin：两个 plugin.json files 中的 `version` 匹配（detect-only；release-please 通过 Unit 4 的 `extra-files` 拥有 write）

    * 对每个同时有两种 formats 的 plugin：`.claude-plugin/plugin.json` 和 `.codex-plugin/plugin.json` 中的 `description` 匹配（mirror `src/release/metadata.ts` 中现有 Claude ↔ Cursor description-sync rule）

    * 如果 `.codex-plugin/plugin.json` 声明 `skills: "./skills/"`，则 directory `plugins/<name>/skills/` 存在

  * 通过现有 `updates[]` mechanism report drift（检测到 name/version/description drift 时 `changed: true`）

  * 当 `write: true` 时，rewrite `.codex-plugin/plugin.json` 的 `description` 以匹配 Claude。**不要 rewrite `version`** — release-please 通过 Unit 4 的 `extra-files` config 拥有 version bumps，两个 authorities 写同一字段会造成 release-please 无法 reconcile 的 drift。这 mirror 现有 Cursor precedent：见 `src/release/metadata.ts` 中的 comment（"Plugin versions are not synced in marketplace.json -- the canonical version lives in each plugin's own plugin.json. Duplicating versions here creates drift that release-please can't maintain."）。

* **`scripts/release/validate.ts`：** 验证 output 仍会打印 useful summary（可能需要扩展 success message 以提到 Codex counts；stretch goal，不是 required）

**遵循模式：**

* `src/release/metadata.ts` 中现有 Cursor integration（约 lines 138-230）— 读取两个 marketplaces、cross-check plugin lists 和 descriptions、在 write 时 update versions。Codex 增加 parallel read + cross-check，但不做 marketplace version update（Codex marketplace 没有 version field）。

**测试场景：**

* Happy path：所有 manifests in sync，validator passes — 添加到 `tests/release-metadata.test.ts`

* Drift：Codex plugin.json version 落后 Claude plugin.json version，validator reports drift（不 auto-correct；release-please 拥有 bump）

* Drift：Codex plugin.json `description` 与 Claude plugin.json `description` 不同，write mode 将其 rewrite 到 match

* Drift：Codex marketplace 缺少 Claude 拥有的 plugin，validator reports drift

* Drift：Claude 和 Codex plugin.json 之间 plugin `name` mismatch，validator reports drift

* Error path：`.codex-plugin/plugin.json` 声明 `skills: "./skills/"`，但 `plugins/<name>/skills/` 不存在，validator reports drift

* Edge case：Codex marketplace 有 Claude 没有的 plugin — validator reports drift（asymmetric additions rejected，因为 Claude 是 source of truth；此 case 已在上方 `metadata.ts` cross-check bullets 中枚举）

**验证：**

* `bun test tests/release-metadata.test.ts` 通过所有 new assertions

* `bun run release:validate` 在 clean working tree 上返回 success output

***

* [ ] **Unit 6：用 Codex native install flow 更新 README**

**目标：** README 记录两步 Codex install（native plugin install 安装 skills，Bun converter followup 安装 agents）。

**需求：** R5

**依赖：** Unit 1-3（install commands 引用 manifests；它们必须存在）

**文件：**

* 修改：`README.md`

**方法：**

* 将 Codex 从 "experimental / Bun CLI" tier（line 129）提升到与 Copilot/Droid/Qwen 并列的 native-install tier。

* 添加新的 `### Codex` section，包含：

  * Native install command（native install 命令）：`codex plugin marketplace add EveryInc/compound-engineering-plugin` + `codex plugin install compound-engineering`

  * 简短说明 native install 处理 skills；如需包含 agents 的完整 CE experience，运行 followup `bunx @every-env/compound-plugin install compound-engineering --to codex`

  * 给从旧 Bun-only install 迁移的 users 的 cleanup pointer：`bunx @every-env/compound-plugin cleanup --target codex`（已存在）

* 在 Bun converter section（line 129+）中也保留 Codex，作为想要 scripted install 的 users 的 `--also` option，但重新表述为："the Bun converter remains the way to install CE's custom agents on Codex after the native plugin install."

**遵循模式：**

* 现有 `### Factory Droid` 和 `### GitHub Copilot CLI` sections（约 lines 85-110）— same shape：先 native install commands，再 cleanup note，然后 followup

* `### Qwen Code` section — 最近似 parallel，因为 Qwen 也在此 PR 中从 Bun 迁移到 native

**测试场景：**

* Test expectation：无 -- documentation。Implementation 期间 review accuracy。

**验证：**

* README lint / render 正常

* Install commands 与 `.agents/plugins/marketplace.json` 中声明的内容，以及 `.codex-plugin/plugin.json` 中的 plugin name 匹配

***

* [ ] **Unit 7：通过 local install 做 empirical verification**

**目标：** 在 branch merge 前，确认 `codex plugin marketplace add <local-repo-path>` + `codex plugin install compound-engineering` 在 working tree 上端到端可工作。

**需求：** R1, R2, R6

**依赖：** Unit 1-6

**文件：**

* 无（此 unit 是 verification，不是 code）

**方法：**

* 在 clean Codex test environment 上（或如果存在现有 `~/.codex/plugins/compound-engineering` 和 `~/.agents/skills/` state，则先 backup）：

  1. `codex plugin marketplace add <local-repo-path>` — 应成功，且没有 "marketplace file does not exist" error
  2. `codex plugin install compound-engineering` — 应注册 plugin，并将 skills copy 到 expected install location
  3. Inspect `~/.codex/plugins/compound-engineering/`（或 install 实际 landed 的位置）— 确认 CE skills 存在。**Count assertion：** installed skill count 必须匹配 source — CE 在 `plugins/compound-engineering/skills/` 下 ship 43 个 skill directories；如果 post-install 数量更少，继续前先 diagnose（表示 Codex discovery 没有 walk CE 使用的 layout，尽管 Vercel reference plugin 使用相同 pattern）
  4. Inspect `~/.agents/skills/` — 确认 skills 可通过 default trigger behavior discover
  5. 启动 Codex 并 invoke 一个 CE skill（例如 `$ce-plan`）— 应能 resolve 和 load
  6. `codex plugin uninstall compound-engineering` — 确认 clean removal
  7. 对 `coding-tutor` 做 smoke check：`codex plugin install coding-tutor` 成功，且 skills 出现；不要运行完整 install/uninstall cycle — R2 只 target `compound-engineering`；`coding-tutor` 因 marketplace parity 存在

* 如果任何 step 失败，通过 error message diagnose，并 revise relevant plugin.json 或 marketplace.json。Likely failure modes：

  * plugin.json 中漏掉 required field（fix：添加它）

  * `source{}` 或 `policy{}` shape 存在 schema mismatch（fix：adjust）

  * Skill registration silent failure（fix：inspect Codex logs，如有需要添加 trigger metadata；虽然这被决定为 out of scope，但若 empirically required，就 revisit）

* 将此 empirical test 的 findings 记录到 plan 的 `Open Questions` → `Deferred to Implementation` section，标记为 resolved。

**测试场景：**

* Happy path：native install 成功，skills discoverable

* Edge case：install + uninstall 不留下 orphan state

* Edge case：在 existing install 上 reinstall 能 cleanly replace

* Integration：从 Codex invoke installed skill 可工作

**验证：**

* `compound-engineering` 成功 install + uninstall cycle；`coding-tutor` 完成 smoke-level install

* Skills 可通过 Codex default discovery invoke；installed skill count 匹配 source

* Codex logs 中没有此前不存在的新 errors

* **Merge gate：** 此 PR merge 前 Unit 7 必须成功完成。如果 empirical install 失败，迭代 Units 1-3 manifests 直到 install 成功。不要单独 land Units 1-6 — 整个 hybrid-install promise 依赖 native install 真的能基于这些 manifests 工作；一个 ship 未测试 manifests 的 PR 会破坏任何按 README 操作的 Codex user 的 CE install story。

  ***

  * [ ] **Unit 8：用 Codex manifest contributor rules 更新 plugin AGENTS.md**

  **目标：** 扩展 `plugins/compound-engineering/AGENTS.md`，让 contributors 知道 Codex manifests 是 release-owned（不要 hand-bump），并知道添加 new plugin 时该做什么（三 marketplace parity）。

  **需求：** R3, R6

  **依赖：** Unit 1-5（files 必须存在；validator 必须 enforce AGENTS.md 描述的 rules，否则 doc 描述的是 unenforced contract）

  **文件：**

  * 修改：`plugins/compound-engineering/AGENTS.md`

  **方法：**

  * 扩展 "Versioning Requirements → Contributor Rules" section，添加 mirror 现有 Claude/Cursor rules 的 parallel Codex rules：

    * 不要手工 bump `.codex-plugin/plugin.json` version — release-please 通过 `.github/release-please-config.json` 中的 `extra-files` bump 它

    * 除了添加或删除 plugin，不要 hand-edit `.agents/plugins/marketplace.json`（name、description 和 plugin list drift 会被 `bun run release:validate` 捕获）

  * 扩展 "Pre-Commit Checklist"，加入 parallel Codex entry：

    * `[ ] No manual release-version bump in .codex-plugin/plugin.json`（不手动 bump `.codex-plugin/plugin.json` 中的 release version）

  * 添加简短 "Adding a New Plugin" subsection（或扩展 "Adding Components"），列出向 repo 添加 new plugin 时的 three-marketplace parity requirement。Checklist items：`.claude-plugin/marketplace.json` entry、`.cursor-plugin/marketplace.json` entry、`.agents/plugins/marketplace.json` entry、per-plugin `.claude-plugin/plugin.json` / `.cursor-plugin/plugin.json` / `.codex-plugin/plugin.json`、包含全部三个 `extra-files` 的 release-please config entry、运行 `bun run release:validate` 确认 consistency。

  * 在 doc 中 reference Unit 5：validator 现在会 enforce 这里描述的 rules，因此只 touch 一个 format 的 contributor 会得到清晰 CI signal。

  **遵循模式：**

  * `plugins/compound-engineering/AGENTS.md` 中现有 "Versioning Requirements" 和 "Pre-Commit Checklist" sections

  * 现有 "Adding Components" section（目前覆盖 skills + agents；扩展或补充 plugin-addition workflow）

  **测试场景：**

  * Test expectation：无 -- documentation change。Implementer 应通过重新阅读 extended sections，确认它们读起来是现有 Claude/Cursor guidance 的 coherent parallels。

  **验证：**

  * AGENTS.md render 正常；new sections 与 existing structure 集成

  * Contributor 阅读 Pre-Commit Checklist 时，会看到三种 formats（Claude、Cursor、Codex）的 parallel rules，且 language 匹配

  * Contributor 添加 new plugin 时，可按 parity checklist 操作，无需猜测要更新哪些 files

***

* [ ] **Unit 9：将 `--to codex` default 改为 agents-only，并添加 `--include-skills` flag**

**目标：** 防止 users 同时运行 Codex native plugin install 和 Bun converter 时发生 skill double-registration。让 Bun converter 的 `--to codex` default 补充 native install，而不是 duplicate 它。

**需求：** R2, R6

**依赖：** Unit 1-3（Codex manifests 存在，因此 native install 实际注册 skills）。此 unit 假设 two-step flow 是 intended happy path。

**文件：**
- 修改：`src/converters/claude-to-codex.ts`
- 修改：`src/converters/claude-to-opencode.ts`（在 shared options type 中添加 optional `codexIncludeSkills` field）
- 修改：`src/commands/install.ts`（添加 `--include-skills` flag + pass through）
- 修改：`src/commands/convert.ts`（同样的 flag + pass through）
- 修改：`src/sync/commands.ts`（在 legacy sync path 上 pin `codexIncludeSkills: true` — sync 不与 native install 配对，必须继续 emit full bundle）
- 测试：`tests/codex-converter.test.ts`（添加 agents-only tests；更新 existing full-mode tests 以显式传入 flag）
- 测试：`tests/cli.test.ts`（新增 agents-only default test；更新 existing `--to codex` tests 以传入 `--include-skills`）
- 修改：`README.md`（更新 Codex install section，解释 new default + flag）

**方法：**
- 向 `ClaudeToOpenCodeOptions` 添加 `codexIncludeSkills?: boolean`。Document 它是 Codex-only；其它 targets ignore 它。
- 在 `convertClaudeToCodex` 中，default `includeSkills = options.codexIncludeSkills ?? false`。为 false 时，返回 bundle：empty `skillDirs`、empty `prompts`、empty command-skills、empty `mcpServers`；`generatedSkills` 只包含 agent conversions。为 true 时，保持当前 full behavior。
- Agent bodies 在两种 modes 中仍应用 `transformContentForCodex`，让 `Task(...)` / slash refs 能根据 native install runtime 注册的 skill graph rewrite。
- CLI flag：`--include-skills` boolean，default false。Help text 明确说明它是 Codex-only、解释原因（与 `codex plugin install` 配对），并说明该 flag 的 transient 性质（当 Codex native 支持 custom agents 后不再需要）。
- `sync` command（legacy personal-config flow）将 flag pin 为 true — 这些 users 没有 native install 作为 option。
- Coding-tutor：不 special-case。0 agents 时，agents-only default emit empty bundle — 按 product decision 是 "bare minimum"。需要 coding-tutor commands 的 users 使用 `--include-skills`。

**遵循模式：**
- `ClaudeToOpenCodeOptions` 中 existing Cursor-specific option fields precedent（目前没有，但同样的 field-on-shared-type pattern 在其它 target-specific knobs 中使用）
- CLI flag description shape 匹配现有 `inferTemperature` / `agentMode` entries

**测试场景：**
- Happy path（agents-only default）：bundle 有 empty `skillDirs`、empty `prompts`，`generatedSkills` 只包含 agent conversions，`mcpServers` undefined
- Happy path（`--include-skills`）：existing tests 继续通过（emit full bundle）
- Edge case：0 agents 的 plugin 在 default mode 下产生 empty bundle（无 orphan state，无 conflict 可能）
- Integration：包含 `Task x(...)` 的 agent body 在 default mode 中仍被 rewritten（reference targets 仍从 full plugin populated）
- CLI：`install --to codex` default 写入 agent files，但没有 `skills/ce-plan/SKILL.md`（assert file absence）
- CLI：`install --to codex --include-skills` 写入 full tree（preserve existing behavior）
- Legacy path：`sync --target codex` 仍 emit full bundle（该 path 上 `codexIncludeSkills` pinned true）

**验证：**
- Existing Codex converter tests 在添加 `codexIncludeSkills: true` 后全部通过
- New agents-only tests 通过
- `bun test` green（无其它 regressions）
- README 反映 new default + opt-in flag

***

## 系统级影响

* **Interaction graph：** release-please 现在每次 release 会 touch 每个 plugin 的三个 plugin.json files（Claude、Cursor、Codex）。`syncReleaseMetadata` 现在读取三个 marketplaces（Claude、Cursor、Codex）。`bun run release:validate` 现在 enforce tri-format consistency。

* **Error propagation：** release validation drift 现在也会因 Codex-specific mismatches 让 builds fail。这是 CI 会 surface 的新 failure mode。可接受 — 与现有 Cursor drift checks shape 相同。

* **State lifecycle risks：** runtime 无风险 — 此 change ship static content（manifests）和 release-time checks。只使用现有 Claude/Cursor/Bun-converter flows 的 users 不会经历 code paths change。

* **API surface parity：** native Codex plugin install 是新的 distribution surface；从 Bun-converter-installed CE 升级到 native-installed CE 的 users 会短暂拥有 dual state。现有 `cleanup --target codex` command 已处理 legacy CE state；在 README 中记录 migration（Unit 6）应足够。

* **Integration coverage：** Unit 5 测试 cross-format consistency。Unit 7 端到端 empirical validate native install flow。

* **不变不变量：**

  * Bun converter（`bunx ... --to codex`）继续按原样工作 — 仍按 existing logic 将 agents 写到 `~/.codex/agents/compound-engineering/`

  * `cleanup --target codex` 继续按原样工作 — `~/.codex/compound-engineering/install-manifest.json` 中的 managed-install manifest 仍 governs agent cleanup

  * Claude、Cursor、Copilot、Droid、Qwen install paths unchanged（install paths 不变）

  * `.claude-plugin/*` 和 `.cursor-plugin/*` files unchanged

  * 不修改 `src/targets/codex.ts`、`src/converters/claude-to-codex.ts` 或任何 existing converter code — Bun converter path 对 agents 保持完整

## 风险与依赖

| Risk                                                                                                                         | Mitigation                                                                                                                                                                                                                                                           |
| :--------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex plugin.json 需要一个 docs 中未识别出的 field                                                           | Unit 7 empirical test 会在 pre-merge 捕获；迭代 manifest 直到 install 成功                                                                                                                                                                         |
| Codex skills registration 需要 `metadata.*` frontmatter extensions，而不只是 `name`/`description`            | Unit 7 empirical test 会捕获。如果确认存在，escalate 给用户：要么给 CE skills 添加 minimal default metadata（scope 内），要么接受 degraded trigger behavior，并把 full metadata tuning 推迟到后续 plan                                         |
| Release-please `extra-files` path change 静默破坏 version bump flow                                                   | Unit 5 validator 会在 release 产生 drift 后捕获它，属于 retroactive，不是 pre-merge。Merge Unit 4 前，本地运行 release-please preview/dry-run（`npx release-please manifest-pr --dry-run` 或等价命令），确认两个 `.codex-plugin/plugin.json` files 都出现在 proposed bump list 中。AGENTS.md 记录了 `linked-versions` 在 `exclude-paths` 周围有 edge cases；验证它们不会 interfere。 |
| 通过 `Task` delegate 给 agents 的 skills 在 native-only install 上静默失败。`ce-code-review`、`ce-plan`、`ce-work` 等 CE skills 会 spawn `review/`、`research/`、`workflow/` subdirectories 中的 agents。运行 native install 但跳过 `bunx ... --to codex` followup 的 users invoke 这些 skills 时，会看到像 CE broken 一样的 delegation failures。 | Unit 6 README change 是 primary mitigation（明确 two-step sequencing，并把 agent followup 标为 agent-heavy workflows 的 required step）。`cleanup --target codex` command 会把 users 指向同一 CE namespace，以获得 clean slate。**待评估 followup plan：** skill-side detection — delegating skills 检查 required agents，缺失时 emit 清晰的 "run the agent followup to enable this" message。不在本 plan scope 内。考虑到 README 明确说明，first release 可接受该风险。 |
| 除上述 delegation failure 外，users 仍可能混淆 two-step install（skills via native、agents via Bun）           | 同样通过 README 缓解。如果 post-launch confusion 常见，followup plan 可把 hybrid 自动化为单个 command。                                                                                                                                              |
| Codex marketplace schema evolves（OpenAI 更新 spec）                                                                   | 短期概率低；整理出的 schema 匹配 bundled example 和 canonical reference repo。Monitor Codex release notes；如果 marketplace.json 后续要求 `version`，届时将它添加为 `extra-files` entry                    |
| `coding-tutor` 的 commands 静默不安装，且 users 没注意                                                      | README 在 coding-tutor install section 中明确说明。可接受 gap — coding-tutor 使用较少，且 commands gap 来自 upstream（Codex spec limitation），本 repo 无法修复                                                               |

## 文档与运维说明

* README update 是主要 docs change（Unit 6）

* 不需要 CHANGELOG entry — release-please 会基于 commit messages 生成（scope 可用 `feat(install):` 或 `feat(codex):`）

* 不需要 rollout plan — 这是 pure additive content；不使用 Codex 的 users 不受影响

* Post-merge monitor：任何关于 Codex install 的 issues 应易于 triage（native install vs. Bun converter path 让 ownership 清晰）

## 来源与参考

* Codex docs（Codex 文档）: [developers.openai.com/codex/plugins](https://developers.openai.com/codex/plugins), [/codex/plugins/build](https://developers.openai.com/codex/plugins/build)

* Canonical reference（规范参考）: [github.com/openai/plugins](https://github.com/openai/plugins)

* Local evidence（本地证据）:

  * `~/.codex/.tmp/bundled-marketplaces/openai-bundled/` — OpenAI bundled marketplace example（OpenAI bundled marketplace 示例）

  * `~/.codex/.tmp/plugins/plugins/vercel/`, `~/.codex/.tmp/plugins/plugins/github/` — skills-declaring reference plugins（声明 skills 的参考 plugins）

* Related existing code（相关既有代码）:

  * 相关文件：`.github/release-please-config.json`, `src/release/metadata.ts`, `src/release/components.ts`

  * `.claude-plugin/marketplace.json`, `.cursor-plugin/marketplace.json` — prior-art dual-format precedent（dual-format 先例）

* Related PR（相关 PR）：#609（this branch）— surrounding native-install-cleanup work
