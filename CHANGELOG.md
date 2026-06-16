# 更新日志

## [3.13.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.12.0...cli-v3.13.0) (2026-06-15)


### Features

* **ce-code-review:** add thematic triage grouping ([#845](https://github.com/EveryInc/compound-engineering-plugin/issues/845)) ([8092abe](https://github.com/EveryInc/compound-engineering-plugin/commit/8092abead5ab04355f55fb5ccddedfffd28c8901))
* **ce-ideate:** improve for Fable model ([#924](https://github.com/EveryInc/compound-engineering-plugin/issues/924)) ([622fbfa](https://github.com/EveryInc/compound-engineering-plugin/commit/622fbfa60de346101e3177af243c79430b189a42))


### Bug Fixes

* **ce-compound:** guard validate-frontmatter.py on non-Claude platforms ([#947](https://github.com/EveryInc/compound-engineering-plugin/issues/947)) ([5e6ecca](https://github.com/EveryInc/compound-engineering-plugin/commit/5e6eccabb10e46fb2c149d06f82c4f46299e44b5))
* **ce-worktree:** replace bundled-script creator with a portable isolation guardrail ([#948](https://github.com/EveryInc/compound-engineering-plugin/issues/948)) ([3437de3](https://github.com/EveryInc/compound-engineering-plugin/commit/3437de3049ea975bceec2688940d696e16cc5f87))
* **config-read:** read config via native tool, not $() pre-resolution ([#942](https://github.com/EveryInc/compound-engineering-plugin/issues/942)) ([0757e85](https://github.com/EveryInc/compound-engineering-plugin/commit/0757e859d21e860a1fc0424bfcbbb35a1e597771))
* **release:** bump marketplace catalogs for coding-tutor removal ([#951](https://github.com/EveryInc/compound-engineering-plugin/issues/951)) ([d4cb8ee](https://github.com/EveryInc/compound-engineering-plugin/commit/d4cb8eec0db5dc279f1671d3c362022c7617f615))
* **skills:** enforce content conventions in CI and fix violations ([#930](https://github.com/EveryInc/compound-engineering-plugin/issues/930)) ([c8e7d90](https://github.com/EveryInc/compound-engineering-plugin/commit/c8e7d908fa7e230dc8723639ea48498e3e499f3c))

## [3.12.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.11.2...cli-v3.12.0) (2026-06-09)


### Features

* HTML-first ideation docs and a status-free plan model ([#921](https://github.com/EveryInc/compound-engineering-plugin/issues/921)) ([e74e298](https://github.com/EveryInc/compound-engineering-plugin/commit/e74e29864fbfa2f800fc3e08509e2966e4947f1e))

## [3.11.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.11.1...cli-v3.11.2) (2026-06-06)


### Miscellaneous Chores

* **cli:** Synchronize compound-engineering versions

## [3.11.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.11.0...cli-v3.11.1) (2026-06-05)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.11.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.10.0...cli-v3.11.0) (2026-06-04)


### 修复

* **ce-polish:** 从 beta 提升到 stable ([#880](https://github.com/EveryInc/compound-engineering-plugin/issues/880)) ([63b6b26](https://github.com/EveryInc/compound-engineering-plugin/commit/63b6b260c345ba70ce9d9a393eeedefb64e4e0a0))

## [3.10.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.9.4...cli-v3.10.0) (2026-06-03)


### 功能

* **skill:** 引入 CONCEPTS.md 作为 shared vocabulary substrate ([#838](https://github.com/EveryInc/compound-engineering-plugin/issues/838)) ([7c4bb16](https://github.com/EveryInc/compound-engineering-plugin/commit/7c4bb16123412d97ded593fc785d206ecb9684bc))

## [3.9.4](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.9.3...cli-v3.9.4) (2026-05-31)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.9.3](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.9.2...cli-v3.9.3) (2026-05-28)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.9.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.9.1...cli-v3.9.2) (2026-05-27)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.9.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.9.0...cli-v3.9.1) (2026-05-27)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.9.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.8.4...cli-v3.9.0) (2026-05-26)


### 功能

* **ce-plan,ce-brainstorm:** contract-driven sections + 可选 HTML output ([#826](https://github.com/EveryInc/compound-engineering-plugin/issues/826)) ([11e12e5](https://github.com/EveryInc/compound-engineering-plugin/commit/11e12e5739c6691a2020eb8b70a944587e7f265f))

## [3.8.4](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.8.3...cli-v3.8.4) (2026-05-21)


### 修复

* **agents:** 将 `.agent.md` 重命名为 `.md`，以支持 VS Code Copilot tool access ([#846](https://github.com/EveryInc/compound-engineering-plugin/issues/846)) ([796bea7](https://github.com/EveryInc/compound-engineering-plugin/commit/796bea75b74f3b101b53f7cc1c108aece0979e6b))

## [3.8.3](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.8.2...cli-v3.8.3) (2026-05-17)


### 修复

* **ce-coherence-reviewer:** 从 tool allowlist 移除 Bash ([#837](https://github.com/EveryInc/compound-engineering-plugin/issues/837)) ([82b8af4](https://github.com/EveryInc/compound-engineering-plugin/commit/82b8af415d9ca5577577fa80da0a6119fc8b661e))

## [3.8.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.8.1...cli-v3.8.2) (2026-05-14)


### 修复

* **codex:** profile installs 尊重 CODEX_HOME ([#830](https://github.com/EveryInc/compound-engineering-plugin/issues/830)) ([a0a08a1](https://github.com/EveryInc/compound-engineering-plugin/commit/a0a08a17cb178655baeabe4045b5164b3a5cef58))

## [3.8.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.8.0...cli-v3.8.1) (2026-05-11)


### 修复

* **ce-code-review:** 用 prose-driven base detection 替换 resolve-base.sh ([#815](https://github.com/EveryInc/compound-engineering-plugin/issues/815)) ([d090bde](https://github.com/EveryInc/compound-engineering-plugin/commit/d090bde0ff1bbc33ec3c3b2049cb4687e9d76532))

## [3.8.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.7.3...cli-v3.8.0) (2026-05-10)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.7.3](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.7.2...cli-v3.7.3) (2026-05-08)


### 修复

* **ce-resolve-pr-feedback:** 对 GraphQL connections 分页 ([#807](https://github.com/EveryInc/compound-engineering-plugin/issues/807)) ([07a6d52](https://github.com/EveryInc/compound-engineering-plugin/commit/07a6d52879ed715e179ff11daaee47e02bc6ecc9))

## [3.7.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.7.1...cli-v3.7.2) (2026-05-08)


### 修复

* **ce-sessions:** 解锁 Claude Code 上的 session-history ([#800](https://github.com/EveryInc/compound-engineering-plugin/issues/800)) ([81710ef](https://github.com/EveryInc/compound-engineering-plugin/commit/81710efad5666831715a630b04554a35946afb1d))

## [3.7.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.7.0...cli-v3.7.1) (2026-05-08)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.7.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.6.1...cli-v3.7.0) (2026-05-07)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.6.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.6.0...cli-v3.6.1) (2026-05-06)


### 修复

* **doc-review:** 降低 plans 上的 review noise，并按 doc shape 限定 personas scope ([#780](https://github.com/EveryInc/compound-engineering-plugin/issues/780)) ([8349e75](https://github.com/EveryInc/compound-engineering-plugin/commit/8349e750b856d267b74fbbeb2fb135e4ff73eb91))

## [3.6.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.5.0...cli-v3.6.0) (2026-05-05)


### 功能

* 将 hooks 转换为 Codex target 的 `.codex/hooks.json` ([#742](https://github.com/EveryInc/compound-engineering-plugin/issues/742)) ([60b66dd](https://github.com/EveryInc/compound-engineering-plugin/commit/60b66dd904c3a81e0a25dd3bc61e2d94d8837f86))


### 修复

* **ce-plan:** 将 Implementation Units 渲染为 headings，而不是 bulleted list items ([#766](https://github.com/EveryInc/compound-engineering-plugin/issues/766)) ([be2efd7](https://github.com/EveryInc/compound-engineering-plugin/commit/be2efd7d7605c483ea9f068c6190b81a9d68e942))
* **ce-worktree:** 相对 skill dir 解析 script path，而不是 user CWD ([#772](https://github.com/EveryInc/compound-engineering-plugin/issues/772)) ([4cc1ee6](https://github.com/EveryInc/compound-engineering-plugin/commit/4cc1ee6fe2a353cd0b8e7466ec27e9556b042ee3))

## [3.5.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.4.2...cli-v3.5.0) (2026-05-04)


### 功能

* **riffrec-feedback-analysis:** 添加带 three-path routing 的 Riffrec feedback skill ([#747](https://github.com/EveryInc/compound-engineering-plugin/issues/747)) ([dde9256](https://github.com/EveryInc/compound-engineering-plugin/commit/dde9256362db90606d052c662dc8f2f0ae6b620b))

## [3.4.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.4.1...cli-v3.4.2) (2026-05-04)


### 修复

* **ce-code-review:** 保持 finding numbers 稳定 ([#754](https://github.com/EveryInc/compound-engineering-plugin/issues/754)) ([e856756](https://github.com/EveryInc/compound-engineering-plugin/commit/e8567566b7ed779ea1964d6ffe97e8cb4ca79d73))
* **ce-compound, ce-sessions:** 从 `!` backtick 移除 bash parameter expansion ([#752](https://github.com/EveryInc/compound-engineering-plugin/issues/752)) ([9539bf0](https://github.com/EveryInc/compound-engineering-plugin/commit/9539bf045deba099a20d306b2b118e3b019c633c))

## [3.4.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.4.0...cli-v3.4.1) (2026-05-01)


### 修复

* **ce-setup:** 检测 codex global skills ([#739](https://github.com/EveryInc/compound-engineering-plugin/issues/739)) ([887db6b](https://github.com/EveryInc/compound-engineering-plugin/commit/887db6b2ade997a2723debc15b5baf34fcf52fb4))
* **code-review:** 向 JSON-pipeline reviewer agents 授予 Write ([#741](https://github.com/EveryInc/compound-engineering-plugin/issues/741)) ([520a9eb](https://github.com/EveryInc/compound-engineering-plugin/commit/520a9ebea039f4f5d984cd7f31d8b8e60a9e0bc6))

## [3.4.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.3.2...cli-v3.4.0) (2026-05-01)


### 功能

* **ce-strategy,ce-product-pulse:** 添加用于 upstream anchor 和 outcome pulse 的 PM skills ([#614](https://github.com/EveryInc/compound-engineering-plugin/issues/614)) ([cb8f9b3](https://github.com/EveryInc/compound-engineering-plugin/commit/cb8f9b348391d28f31ce367b9ff308980939c96f))
* **ce-strategy:** 将 strategy doc 移到 root，并添加 frontmatter ([#732](https://github.com/EveryInc/compound-engineering-plugin/issues/732)) ([265cb42](https://github.com/EveryInc/compound-engineering-plugin/commit/265cb4280f22bbd2fd5cc45e338371442b6c1692))


### 修复

* **ce-compound,ce-sessions:** 在 pre-resolved git branch 中处理 non-git CWD ([#731](https://github.com/EveryInc/compound-engineering-plugin/issues/731)) ([5e04534](https://github.com/EveryInc/compound-engineering-plugin/commit/5e045341372fc95d284268d514a53da5722c81d2))
* **ce-sessions:** 修复 722 ce-compound 和 ce-sessions permission error ([#723](https://github.com/EveryInc/compound-engineering-plugin/issues/723)) ([8f80466](https://github.com/EveryInc/compound-engineering-plugin/commit/8f804669b184bc68ef6dbab4669fe0e431d8271a))
* **review:** 默认使用 harness-native code review，并在有风险时 escalate ([#721](https://github.com/EveryInc/compound-engineering-plugin/issues/721)) ([d217660](https://github.com/EveryInc/compound-engineering-plugin/commit/d217660b3d37acf38227abf5c57ba6f390ccaa1e))

## [3.3.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.3.1...cli-v3.3.2) (2026-04-29)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.3.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.3.0...cli-v3.3.1) (2026-04-28)


### 修复

* **review:** subagent slots 满时 queue reviewers ([#716](https://github.com/EveryInc/compound-engineering-plugin/issues/716)) ([d69a772](https://github.com/EveryInc/compound-engineering-plugin/commit/d69a772bb8682da23fa0b6a293245768e573254b))

## [3.3.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.2.0...cli-v3.3.0) (2026-04-28)


### 修复

* **ce-code-review:** 在 dispatch point 重新声明 model override ([#681](https://github.com/EveryInc/compound-engineering-plugin/issues/681)) ([9751d1a](https://github.com/EveryInc/compound-engineering-plugin/commit/9751d1a30a39fcfe17a9e052d32dbc9a5deafd02))
* **ce-plan:** inline post-generation menu routing，让 option 1 真正启动 /ce-work ([#715](https://github.com/EveryInc/compound-engineering-plugin/issues/715)) ([0c515c0](https://github.com/EveryInc/compound-engineering-plugin/commit/0c515c06fe7efc77baf29b5512a768c930d50ba0))
* **ce-work-beta:** 将 model 和 reasoning effort 交给 Codex config ([#704](https://github.com/EveryInc/compound-engineering-plugin/issues/704)) ([4b5f28d](https://github.com/EveryInc/compound-engineering-plugin/commit/4b5f28da9746aae8f2c5dd715d7029d0ab2758a6))
* **skills:** 替换被 permission check 阻止的 shell antipatterns ([#711](https://github.com/EveryInc/compound-engineering-plugin/issues/711)) ([1f0a77b](https://github.com/EveryInc/compound-engineering-plugin/commit/1f0a77bcc1e4edbf1b7979ea5cd13d1e553d4662))

## [3.2.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.1.0...cli-v3.2.0) (2026-04-26)


### 功能

* **ce-compound:** 添加 frontmatter parser-safety validator ([#697](https://github.com/EveryInc/compound-engineering-plugin/issues/697)) ([7eea2d1](https://github.com/EveryInc/compound-engineering-plugin/commit/7eea2d1cfe5c177e2d144b1e12f4957c75dac556))


### 修复

* **ce-code-review:** 按 AGENTS.md 要求将 run artifacts 从 `.context/` 移到 `/tmp` ([#690](https://github.com/EveryInc/compound-engineering-plugin/issues/690)) ([85e9a20](https://github.com/EveryInc/compound-engineering-plugin/commit/85e9a2073b09295b1a0771d4775d42b7142fd172))
* **ce-code-review:** 用 best-judgment auto-resolve 替换 LFG ([#685](https://github.com/EveryInc/compound-engineering-plugin/issues/685)) ([9ba41a1](https://github.com/EveryInc/compound-engineering-plugin/commit/9ba41a14cadfe2eee75fe50485f72f38b09df00b))
* **ce-code-review:** 收紧 safe_auto/gated_auto boundary 的 autofix_class rubric ([#695](https://github.com/EveryInc/compound-engineering-plugin/issues/695)) ([ad9577e](https://github.com/EveryInc/compound-engineering-plugin/commit/ad9577e7329cba31cffba71815cac6cef290ae1b))
* **ce-debug:** delegate commit/PR，并添加 branch check ([#683](https://github.com/EveryInc/compound-engineering-plugin/issues/683)) ([1284290](https://github.com/EveryInc/compound-engineering-plugin/commit/1284290af27139c2df192488099626688fd4898b))
* **ce-demo-reel:** 等待 network idle，并拒绝 blank frames ([#692](https://github.com/EveryInc/compound-engineering-plugin/issues/692)) ([f30404e](https://github.com/EveryInc/compound-engineering-plugin/commit/f30404e57bcbf7866c1a9524f4392f7dff8f3a0b))
* **ce-doc-review:** 将 LFG path 重命名为 best-judgment，避免 /lfg collision ([#691](https://github.com/EveryInc/compound-engineering-plugin/issues/691)) ([50bf65e](https://github.com/EveryInc/compound-engineering-plugin/commit/50bf65e88c556eaa1ae10c7d88d8e646274d7ae0))
* **session-historian:** 限制 deep-dives，添加 keyword filter primitive，并收紧 dispatch ([#699](https://github.com/EveryInc/compound-engineering-plugin/issues/699)) ([a91270c](https://github.com/EveryInc/compound-engineering-plugin/commit/a91270ccd2d5fba3e035275b7af2c4fec3f90b1c))
* **skills:** 替换被 permission check 阻止的 case statements ([#701](https://github.com/EveryInc/compound-engineering-plugin/issues/701)) ([5952b20](https://github.com/EveryInc/compound-engineering-plugin/commit/5952b20d7f2a056f8d7d8719a2d20b6615aca9e4))

## [3.1.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.0.7...cli-v3.1.0) (2026-04-24)


### 功能

* **ce-ideate:** 添加 subject gate、surprise-me 和 warrant contract ([#671](https://github.com/EveryInc/compound-engineering-plugin/issues/671)) ([6514b1f](https://github.com/EveryInc/compound-engineering-plugin/commit/6514b1fce5df62582673fe7274c97a90e9aea45c))
* **ce-setup:** 检查 ast-grep CLI 和 agent skill ([#653](https://github.com/EveryInc/compound-engineering-plugin/issues/653)) ([23dc11b](https://github.com/EveryInc/compound-engineering-plugin/commit/23dc11b95ae46dc6be0308306de5c8f16329fe49))
* **codex:** 添加 native plugin install manifests + agents-only converter ([#616](https://github.com/EveryInc/compound-engineering-plugin/issues/616)) ([3ed4a4f](https://github.com/EveryInc/compound-engineering-plugin/commit/3ed4a4fa0f6f4d08144ae7598af391b4f070b649))
* **pi:** 通过 pi-subagents + pi-ask-user 提供 first-class support ([#651](https://github.com/EveryInc/compound-engineering-plugin/issues/651)) ([7ddfbed](https://github.com/EveryInc/compound-engineering-plugin/commit/7ddfbed33b08e5ad0dc56a3ecc19adb9a10ebb2c))


### 修复

* **ce-update:** 对比 main plugin.json，而不是 release tags ([#660](https://github.com/EveryInc/compound-engineering-plugin/issues/660)) ([351d12e](https://github.com/EveryInc/compound-engineering-plugin/commit/351d12ec5b795bff4c5e633e9a64644f045340c6))
* **ce-update:** 从 CLAUDE_PLUGIN_ROOT parent 派生 cache dir ([#645](https://github.com/EveryInc/compound-engineering-plugin/issues/645)) ([6155b9d](https://github.com/EveryInc/compound-engineering-plugin/commit/6155b9de3c2d60ca424386f2dfcb0dfa7668f2c1))
* **lfg:** 使用 platform-neutral skill references ([#642](https://github.com/EveryInc/compound-engineering-plugin/issues/642)) ([b104ce4](https://github.com/EveryInc/compound-engineering-plugin/commit/b104ce46bea4b1b9b0e9cfbdd9203dbc5a0aa510))
* **main:** 恢复 version drift，修复 stale test，并记录 learnings ([#678](https://github.com/EveryInc/compound-engineering-plugin/issues/678)) ([bc8ae1a](https://github.com/EveryInc/compound-engineering-plugin/commit/bc8ae1a6b5375f7fbb8120104b3222391da470bb))
* **release:** 移除 stale release-as pin ([#674](https://github.com/EveryInc/compound-engineering-plugin/issues/674)) ([ab44d89](https://github.com/EveryInc/compound-engineering-plugin/commit/ab44d89b0b2b1f7dd57d9ce1604d42b0c11f6415))
* **skills:** 将 skill descriptions 限制在 harness limit 内 ([#643](https://github.com/EveryInc/compound-engineering-plugin/issues/643)) ([13f95ba](https://github.com/EveryInc/compound-engineering-plugin/commit/13f95ba6392f86aa8dd9b4430b84f0b7523c6c89))

## [3.0.3](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.0.2...cli-v3.0.3) (2026-04-24)


### 修复

* **release:** 移除 stale release-as pin ([#674](https://github.com/EveryInc/compound-engineering-plugin/issues/674)) ([ab44d89](https://github.com/EveryInc/compound-engineering-plugin/commit/ab44d89b0b2b1f7dd57d9ce1604d42b0c11f6415))

## [3.0.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.0.1...cli-v3.0.2) (2026-04-24)


### 功能

* **ce-ideate:** 添加 subject gate、surprise-me 和 warrant contract ([#671](https://github.com/EveryInc/compound-engineering-plugin/issues/671)) ([6514b1f](https://github.com/EveryInc/compound-engineering-plugin/commit/6514b1fce5df62582673fe7274c97a90e9aea45c))


### 修复

* **ce-update:** 对比 main plugin.json，而不是 release tags ([#660](https://github.com/EveryInc/compound-engineering-plugin/issues/660)) ([351d12e](https://github.com/EveryInc/compound-engineering-plugin/commit/351d12ec5b795bff4c5e633e9a64644f045340c6))

## [3.0.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v3.0.0...cli-v3.0.1) (2026-04-23)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [3.0.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.68.1...cli-v3.0.0) (2026-04-22)


### ⚠ 破坏性变更

* **cli:** 将所有 skills 和 agents 重命名为一致的 ce- prefix ([#503](https://github.com/EveryInc/compound-engineering-plugin/issues/503))

### 功能

* **ce-review:** 为 Interactive mode 添加 per-finding judgment loop ([#590](https://github.com/EveryInc/compound-engineering-plugin/issues/590)) ([27cbaf8](https://github.com/EveryInc/compound-engineering-plugin/commit/27cbaf8161af8aad3260b58d0d9de03d6180a66c))
* **ce-setup:** 检查 ast-grep CLI 和 agent skill ([#653](https://github.com/EveryInc/compound-engineering-plugin/issues/653)) ([23dc11b](https://github.com/EveryInc/compound-engineering-plugin/commit/23dc11b95ae46dc6be0308306de5c8f16329fe49))
* **codex:** 添加 native plugin install manifests + agents-only converter ([#616](https://github.com/EveryInc/compound-engineering-plugin/issues/616)) ([3ed4a4f](https://github.com/EveryInc/compound-engineering-plugin/commit/3ed4a4fa0f6f4d08144ae7598af391b4f070b649))
* **doc-review, learnings-researcher:** tiers、chain grouping 和 rewrite ([#601](https://github.com/EveryInc/compound-engineering-plugin/issues/601)) ([c1f68d4](https://github.com/EveryInc/compound-engineering-plugin/commit/c1f68d4d55ebf6085eaa7c177bf5c2e7a2cfb62c))
* **pi:** 通过 pi-subagents + pi-ask-user 提供 first-class support ([#651](https://github.com/EveryInc/compound-engineering-plugin/issues/651)) ([7ddfbed](https://github.com/EveryInc/compound-engineering-plugin/commit/7ddfbed33b08e5ad0dc56a3ecc19adb9a10ebb2c))


### 修复

* **ce-compound:** quote 以 reserved indicators 开头的 YAML array items ([#613](https://github.com/EveryInc/compound-engineering-plugin/issues/613)) ([d8436b9](https://github.com/EveryInc/compound-engineering-plugin/commit/d8436b9a3c5b5370e51ec168a251ccb45f0d826e))
* **ce-release-notes:** 在 description 中用 backtick 包裹 `<skill-name>` token ([#603](https://github.com/EveryInc/compound-engineering-plugin/issues/603)) ([2aee4d4](https://github.com/EveryInc/compound-engineering-plugin/commit/2aee4d42031892e7937640a003d11fad82420944))
* **ce-update:** 从 CLAUDE_PLUGIN_ROOT parent 派生 cache dir ([#645](https://github.com/EveryInc/compound-engineering-plugin/issues/645)) ([6155b9d](https://github.com/EveryInc/compound-engineering-plugin/commit/6155b9de3c2d60ca424386f2dfcb0dfa7668f2c1))
* **lfg:** 使用 platform-neutral skill references ([#642](https://github.com/EveryInc/compound-engineering-plugin/issues/642)) ([b104ce4](https://github.com/EveryInc/compound-engineering-plugin/commit/b104ce46bea4b1b9b0e9cfbdd9203dbc5a0aa510))
* **skills:** 将 skill descriptions 限制在 harness limit 内 ([#643](https://github.com/EveryInc/compound-engineering-plugin/issues/643)) ([13f95ba](https://github.com/EveryInc/compound-engineering-plugin/commit/13f95ba6392f86aa8dd9b4430b84f0b7523c6c89))


### 代码重构

* **cli:** 将所有 skills 和 agents 重命名为一致的 ce- prefix ([#503](https://github.com/EveryInc/compound-engineering-plugin/issues/503)) ([5c0ec91](https://github.com/EveryInc/compound-engineering-plugin/commit/5c0ec9137a7350534e32db91e8bad66f02693716))

## [2.68.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.68.0...cli-v2.68.1) (2026-04-18)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [2.68.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.67.0...cli-v2.68.0) (2026-04-17)


### 功能

* **ce-ideate:** mode-aware v2 ideation（模式感知 v2 构思） ([#588](https://github.com/EveryInc/compound-engineering-plugin/issues/588)) ([12aaad3](https://github.com/EveryInc/compound-engineering-plugin/commit/12aaad31ebd17686db1a75d1d3575da79d1dad2b))
* **ce-release-notes:** 添加用于浏览 plugin release history 的 skill ([#589](https://github.com/EveryInc/compound-engineering-plugin/issues/589)) ([59dbaef](https://github.com/EveryInc/compound-engineering-plugin/commit/59dbaef37607354d103113f05c13b731eecbb690))

## [2.67.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.66.1...cli-v2.67.0) (2026-04-17)


### 功能

* **ce-polish-beta:** 在 /ce:review 和 merge 之间添加 human-in-the-loop polish phase ([#568](https://github.com/EveryInc/compound-engineering-plugin/issues/568)) ([070092d](https://github.com/EveryInc/compound-engineering-plugin/commit/070092d997bcc3306016e9258150d3071f017ef8))


### 修复

* **ce-plan, ce-brainstorm:** 提供 reliable interactive handoff menus ([#575](https://github.com/EveryInc/compound-engineering-plugin/issues/575)) ([3d96c0f](https://github.com/EveryInc/compound-engineering-plugin/commit/3d96c0f074faf56fcdc835a0332e0f475dc8425f))


### 其他维护

* **claude-permissions-optimizer:** 删除 skill，改用 /less-permission-prompts ([#583](https://github.com/EveryInc/compound-engineering-plugin/issues/583)) ([729fa19](https://github.com/EveryInc/compound-engineering-plugin/commit/729fa191b60305d8f3761f6441d1d3d15c5f48aa))

## [2.66.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.66.0...cli-v2.66.1) (2026-04-16)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [2.66.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.65.0...cli-v2.66.0) (2026-04-15)


### 修复

* **converters:** 保留 Codex agent sidecar scripts ([#563](https://github.com/EveryInc/compound-engineering-plugin/issues/563)) ([ee8e402](https://github.com/EveryInc/compound-engineering-plugin/commit/ee8e4028972252620f0dbfdbe1240204d22e6ea1))
* **converters:** no-MCP install 时保留 Codex config ([#564](https://github.com/EveryInc/compound-engineering-plugin/issues/564)) ([ed778e6](https://github.com/EveryInc/compound-engineering-plugin/commit/ed778e62f1e0e8621df94e5d461b20833cff33e2))

## [2.65.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.64.0...cli-v2.65.0) (2026-04-11)


### 功能

* **ce-setup:** 带 dependency management 和 config bootstrapping 的 unified setup skill ([#345](https://github.com/EveryInc/compound-engineering-plugin/issues/345)) ([354dbb7](https://github.com/EveryInc/compound-engineering-plugin/commit/354dbb75828f0152f4cbbb3b50ce4511fa6710c7))

## [2.64.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.63.1...cli-v2.64.0) (2026-04-10)


### 功能

* **ce-demo-reel:** 添加带 Python capture pipeline 的 demo reel skill ([#541](https://github.com/EveryInc/compound-engineering-plugin/issues/541)) ([b979143](https://github.com/EveryInc/compound-engineering-plugin/commit/b979143ad0460a985dd224e7f1858416d79551fb))
* **ce-update:** 添加 plugin version check skill 和 ce_platforms filtering ([#532](https://github.com/EveryInc/compound-engineering-plugin/issues/532)) ([d37f0ed](https://github.com/EveryInc/compound-engineering-plugin/commit/d37f0ed16f94aaec2a7b435a0aaa018de5631ed3))
* **ce-work-beta:** 添加 beta Codex delegation mode ([#476](https://github.com/EveryInc/compound-engineering-plugin/issues/476)) ([31b0686](https://github.com/EveryInc/compound-engineering-plugin/commit/31b0686c2e88808381560314f10ce276c86e11e2))
* **ce-work:** 通过提取 late-sequence references 减少 token usage ([#540](https://github.com/EveryInc/compound-engineering-plugin/issues/540)) ([bb59547](https://github.com/EveryInc/compound-engineering-plugin/commit/bb59547a2efdd4e7213c149f51abd9c9a17016dd))
* **session-historian:** 添加 cross-platform session history agent 和 /ce-sessions skill ([#534](https://github.com/EveryInc/compound-engineering-plugin/issues/534)) ([3208ec7](https://github.com/EveryInc/compound-engineering-plugin/commit/3208ec71f8f2209abc76baf97e3967406755317d))


### 修复

* **openclaw:** 使用 sync plugin registration ([#498](https://github.com/EveryInc/compound-engineering-plugin/issues/498)) ([2c05c43](https://github.com/EveryInc/compound-engineering-plugin/commit/2c05c43dc8b66ae37501e42a9747c07d82002185))

## [2.63.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.63.0...cli-v2.63.1) (2026-04-07)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [2.63.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.62.1...cli-v2.63.0) (2026-04-06)


### 其他维护

* **cli:** 同步 compound-engineering versions

## [2.62.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.62.0...cli-v2.62.1) (2026-04-05)


### 修复

* **ce-brainstorm:** 通过提取 late-sequence content 降低 token cost ([#511](https://github.com/EveryInc/compound-engineering-plugin/issues/511)) ([bdeb793](https://github.com/EveryInc/compound-engineering-plugin/commit/bdeb7935fcdb147b73107177769c2e968463d93f))
* **cli:** 解决 repo-wide `tsc --noEmit` type errors ([#512](https://github.com/EveryInc/compound-engineering-plugin/issues/512)) ([3fa0c81](https://github.com/EveryInc/compound-engineering-plugin/commit/3fa0c815b286c9e11b28dc04c803529e73b79c1b))

## [2.62.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.61.0...cli-v2.62.0) (2026-04-03)


### 功能

* **ce-plan:** 通过提取 conditional references 减少 token usage ([#489](https://github.com/EveryInc/compound-engineering-plugin/issues/489)) ([fd562a0](https://github.com/EveryInc/compound-engineering-plugin/commit/fd562a0d0255d203d40fd53bb10d03a284a3c0e5))


### 修复

* **converters:** 修复 OpenCode subagent model 和 FQ agent name resolution ([#483](https://github.com/EveryInc/compound-engineering-plugin/issues/483)) ([577db53](https://github.com/EveryInc/compound-engineering-plugin/commit/577db53a2d2e237e900ef2079817cfe63df2d725))
* **converters:** 从 Copilot agent frontmatter 移除 invalid tools/infer ([#493](https://github.com/EveryInc/compound-engineering-plugin/issues/493)) ([6dcb4a3](https://github.com/EveryInc/compound-engineering-plugin/commit/6dcb4a3c553c94e95cb15b5af59aeb6693e6fd61))
* **mcp:** 移除 bundled context7 MCP server ([#486](https://github.com/EveryInc/compound-engineering-plugin/issues/486)) ([afdd9d4](https://github.com/EveryInc/compound-engineering-plugin/commit/afdd9d44651f834b1eed0b20e401ffbef5c8cd41))

## [2.61.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.60.0...cli-v2.61.0) (2026-04-01)


### 功能

* **release:** 记录 linked-versions policy ([#482](https://github.com/EveryInc/compound-engineering-plugin/issues/482)) ([96345ac](https://github.com/EveryInc/compound-engineering-plugin/commit/96345acf217333726af0dcfdaa24058a149365bb))
* **skill-design:** 记录 skill file isolation 和 platform variable constraints ([#469](https://github.com/EveryInc/compound-engineering-plugin/issues/469)) ([0294652](https://github.com/EveryInc/compound-engineering-plugin/commit/0294652395cb62d5569f73ebfea543cfe8b514d6))


### 修复

* **converters:** 写入 MCP servers 时保留 user config ([#479](https://github.com/EveryInc/compound-engineering-plugin/issues/479)) ([c65a698](https://github.com/EveryInc/compound-engineering-plugin/commit/c65a698d932d02e5fb4a948db4d000e21ed6ba4f))

## [2.60.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.59.0...cli-v2.60.0) (2026-03-31)


### 功能

* **ce-brainstorm:** 为 requirements documents 添加 conditional visual aids ([#437](https://github.com/EveryInc/compound-engineering-plugin/issues/437)) ([bd02ca7](https://github.com/EveryInc/compound-engineering-plugin/commit/bd02ca7df04cf2c1c6301de3774e99d283d3d3ca))
* **ce-compound:** 在 instruction files 中添加 docs/solutions/ discoverability check ([#456](https://github.com/EveryInc/compound-engineering-plugin/issues/456)) ([5ac8a2c](https://github.com/EveryInc/compound-engineering-plugin/commit/5ac8a2c2c8c258458307e476d6693cc387deb27e))
* **ce-compound:** 为 bug vs knowledge learnings 添加 track-based schema ([#445](https://github.com/EveryInc/compound-engineering-plugin/issues/445)) ([739109c](https://github.com/EveryInc/compound-engineering-plugin/commit/739109c03ccd45474331625f35730924d17f63ef))
* **ce-plan:** 为 plan documents 添加 conditional visual aids ([#440](https://github.com/EveryInc/compound-engineering-plugin/issues/440)) ([4c7f51f](https://github.com/EveryInc/compound-engineering-plugin/commit/4c7f51f35bae56dd9c9dc2653372910c39b8b504))
* **ce-plan:** 添加用于 on-demand plan strengthening 的 interactive deepening mode ([#443](https://github.com/EveryInc/compound-engineering-plugin/issues/443)) ([ca78057](https://github.com/EveryInc/compound-engineering-plugin/commit/ca78057241ec64f36c562e3720a388420bdb347f))
* **ce-review:** 强制 table format、要求 question tool，并修复 autofix_class calibration ([#454](https://github.com/EveryInc/compound-engineering-plugin/issues/454)) ([847ce3f](https://github.com/EveryInc/compound-engineering-plugin/commit/847ce3f156a5cdf75667d9802e95d68e6b3c53a4))
* **ce-review:** 通过 confidence rubric、FP suppression 和 intent verification 改善 signal-to-noise ([#434](https://github.com/EveryInc/compound-engineering-plugin/issues/434)) ([03f5aa6](https://github.com/EveryInc/compound-engineering-plugin/commit/03f5aa65b098e2ab8e25670594e0f554ea3cafbe))
* **ce-work:** 当 worktree name 无意义时建议 branch rename ([#451](https://github.com/EveryInc/compound-engineering-plugin/issues/451)) ([e872e15](https://github.com/EveryInc/compound-engineering-plugin/commit/e872e15efa5514dcfea84a1a9e276bad3290cbc3))
* **cli-agent-readiness-reviewer:** 添加 smart output defaults criterion ([#448](https://github.com/EveryInc/compound-engineering-plugin/issues/448)) ([a01a8aa](https://github.com/EveryInc/compound-engineering-plugin/commit/a01a8aa0d29474c031a5b403f4f9bfc42a23ad78))
* **converters:** 跨 targets 集中处理 model field normalization ([#442](https://github.com/EveryInc/compound-engineering-plugin/issues/442)) ([f93d10c](https://github.com/EveryInc/compound-engineering-plugin/commit/f93d10cf60a61b13c7765198d69f7c4cfa268ed6))
* **git-commit-push-pr:** 为 PR descriptions 添加 conditional visual aids ([#444](https://github.com/EveryInc/compound-engineering-plugin/issues/444)) ([44e3e77](https://github.com/EveryInc/compound-engineering-plugin/commit/44e3e77dc039d31a86194b0254e4e92839d9d5e9))
* **git-commit-push-pr:** 通过 skill preprocessing 预计算 shield badge version ([#464](https://github.com/EveryInc/compound-engineering-plugin/issues/464)) ([6ca7aef](https://github.com/EveryInc/compound-engineering-plugin/commit/6ca7aef7f33ebdf29f579cb4342c209d2bd40aad))
* **model:** 为 cross-platform model normalization 添加 MiniMax provider prefix ([#463](https://github.com/EveryInc/compound-engineering-plugin/issues/463)) ([e372b43](https://github.com/EveryInc/compound-engineering-plugin/commit/e372b43d30378321ac815fe1ae101c1d5634d321))
* **resolve-pr-feedback:** 添加 gated feedback clustering 以检测 systemic issues ([#441](https://github.com/EveryInc/compound-engineering-plugin/issues/441)) ([a301a08](https://github.com/EveryInc/compound-engineering-plugin/commit/a301a082057494e122294f4e7c1c3f5f87103f35))
* **skills:** 清理 ce:* skills 中的 argument-hint ([#436](https://github.com/EveryInc/compound-engineering-plugin/issues/436)) ([d2b24e0](https://github.com/EveryInc/compound-engineering-plugin/commit/d2b24e07f6f2fde11cac65258cb1e76927238b5d))
* **test-xcode:** 向 skill description 添加 triggering context ([#466](https://github.com/EveryInc/compound-engineering-plugin/issues/466)) ([87facd0](https://github.com/EveryInc/compound-engineering-plugin/commit/87facd05dac94603780d75acb9da381dd7c61f1b))
* **testing:** 关闭 ce:work、ce:plan 和 testing-reviewer 中的 testing gap ([#438](https://github.com/EveryInc/compound-engineering-plugin/issues/438)) ([35678b8](https://github.com/EveryInc/compound-engineering-plugin/commit/35678b8add6a603cf9939564bcd2df6b83338c52))


### 修复

* **ce-brainstorm:** 在 Phase 1.1 中区分 verification 与 technical design ([#465](https://github.com/EveryInc/compound-engineering-plugin/issues/465)) ([8ec31d7](https://github.com/EveryInc/compound-engineering-plugin/commit/8ec31d703fc9ed19bf6377da0a9a29da935b719d))
* **ce-compound:** 为 "What's next?" prompt 要求 question tool ([#460](https://github.com/EveryInc/compound-engineering-plugin/issues/460)) ([9bf3b07](https://github.com/EveryInc/compound-engineering-plugin/commit/9bf3b07185a4aeb6490116edec48599b736dc86f))
* **ce-plan:** 强化 auto deepening 后的 mandatory document-review ([#450](https://github.com/EveryInc/compound-engineering-plugin/issues/450)) ([42fa8c3](https://github.com/EveryInc/compound-engineering-plugin/commit/42fa8c3e084db464ee0e04673f7c38cd422b32d6))
* **ce-plan:** 将 confidence-gate pass 路由到 document-review ([#462](https://github.com/EveryInc/compound-engineering-plugin/issues/462)) ([1962f54](https://github.com/EveryInc/compound-engineering-plugin/commit/1962f546b5e5288c7ce5d8658f942faf71651c81))
* **ce-work:** 默认强制 code review invocation ([#453](https://github.com/EveryInc/compound-engineering-plugin/issues/453)) ([7f3aba2](https://github.com/EveryInc/compound-engineering-plugin/commit/7f3aba29e84c3166de75438d554455a71f4f3c22))
* **document-review:** 在 Phase 5 menu 中显示 contextual next-step ([#459](https://github.com/EveryInc/compound-engineering-plugin/issues/459)) ([2b7283d](https://github.com/EveryInc/compound-engineering-plugin/commit/2b7283da7b48dc073670c5f4d116e58255f0ffcb))
* **git-commit-push-pr:** 安静处理 expected no-pr `gh` exit ([#439](https://github.com/EveryInc/compound-engineering-plugin/issues/439)) ([1f49948](https://github.com/EveryInc/compound-engineering-plugin/commit/1f499482bc65456fa7dd0f73fb7f2fa58a4c5910))
* **resolve-pr-feedback:** 添加 actionability filter，并将 cluster gate 降到 3+ ([#461](https://github.com/EveryInc/compound-engineering-plugin/issues/461)) ([2619ad9](https://github.com/EveryInc/compound-engineering-plugin/commit/2619ad9f58e6c45968ec10d7f8aa7849fe43eb25))
* **review:** 加固 ce-review base resolution ([#452](https://github.com/EveryInc/compound-engineering-plugin/issues/452)) ([638b38a](https://github.com/EveryInc/compound-engineering-plugin/commit/638b38abd267d415ad2d6b72eba3dfe12beefad9))

## [2.59.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.58.1...cli-v2.59.0) (2026-03-29)


### 功能

* **ce-review:** 为 programmatic callers 添加 headless mode ([#430](https://github.com/EveryInc/compound-engineering-plugin/issues/430)) ([3706a97](https://github.com/EveryInc/compound-engineering-plugin/commit/3706a9764b6e73b7a155771956646ddef73f04a5))
* **ce-work:** 接受 bare prompts，并添加 test discovery ([#423](https://github.com/EveryInc/compound-engineering-plugin/issues/423)) ([6dabae6](https://github.com/EveryInc/compound-engineering-plugin/commit/6dabae6683fb2c37dc47616f172835eacc105d11))
* **document-review:** 将 batch_confirm tier 折叠到 auto ([#432](https://github.com/EveryInc/compound-engineering-plugin/issues/432)) ([0f5715d](https://github.com/EveryInc/compound-engineering-plugin/commit/0f5715d562fffc626ddfde7bd0e1652143710a44))
* **review:** 在 pipeline skills 中强制 review ([#433](https://github.com/EveryInc/compound-engineering-plugin/issues/433)) ([9caaf07](https://github.com/EveryInc/compound-engineering-plugin/commit/9caaf071d9b74fd938567542167768f6cdb7a56f))

## [2.58.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.58.0...cli-v2.58.1) (2026-03-28)


### 修复

* **release:** 用 linked-versions plugin 对齐 cli 和 compound-engineering versions ([0bd29c7](https://github.com/EveryInc/compound-engineering-plugin/commit/0bd29c7f2e930fc1198cc7ae833394bfabd47c40))

## [2.58.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.57.1...cli-v2.58.0) (2026-03-28)


### 功能

* **document-review:** 为 programmatic callers 添加 headless mode ([#425](https://github.com/EveryInc/compound-engineering-plugin/issues/425)) ([4e4a656](https://github.com/EveryInc/compound-engineering-plugin/commit/4e4a6563b4aa7375e9d1c54bd73442f3b675f100))

## [2.57.1](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.57.0...cli-v2.57.1) (2026-03-28)


### 修复

* **onboarding:** 用 skip rule 解决 section count contradiction ([#421](https://github.com/EveryInc/compound-engineering-plugin/issues/421)) ([d2436e7](https://github.com/EveryInc/compound-engineering-plugin/commit/d2436e7c933129784c67799a5b9555bccce2e46d))

## [2.57.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.56.0...cli-v2.57.0) (2026-03-28)


### 功能

* **ce-plan:** 添加 decision matrix form、unchanged invariants 和 risk table format ([#417](https://github.com/EveryInc/compound-engineering-plugin/issues/417)) ([ccb371e](https://github.com/EveryInc/compound-engineering-plugin/commit/ccb371e0b7917420f5ca2c58433f5fc057211f04))


### 修复

* **cli-agent-readiness-reviewer:** 移除 improvements 的 top-5 cap ([#419](https://github.com/EveryInc/compound-engineering-plugin/issues/419)) ([16eb8b6](https://github.com/EveryInc/compound-engineering-plugin/commit/16eb8b660790f8de820d0fba709316c7270703c1))
* **document-review:** 强制 interactive questions，并修复 autofix classification ([#415](https://github.com/EveryInc/compound-engineering-plugin/issues/415)) ([d447296](https://github.com/EveryInc/compound-engineering-plugin/commit/d44729603da0c73d4959c372fac0198125a39c60))

## [2.56.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.55.0...cli-v2.56.0) (2026-03-27)


### 功能

* 添加用于 code 和 documents 的 adversarial review agents ([#403](https://github.com/EveryInc/compound-engineering-plugin/issues/403)) ([5e6cd5c](https://github.com/EveryInc/compound-engineering-plugin/commit/5e6cd5c90950588fb9b0bc3a5cbecba2a1387080))
* 添加 CLI agent-readiness reviewer 和 principles guide ([#391](https://github.com/EveryInc/compound-engineering-plugin/issues/391)) ([13aa3fa](https://github.com/EveryInc/compound-engineering-plugin/commit/13aa3fa8465dce6c037e1bb8982a2edad13f199a))
* 将 project-standards-reviewer 添加为 always-on ce:review persona ([#402](https://github.com/EveryInc/compound-engineering-plugin/issues/402)) ([b30288c](https://github.com/EveryInc/compound-engineering-plugin/commit/b30288c44e500013afe30b34f744af57cae117db))
* **ce-brainstorm:** 按 logical concern 分组 requirements，并收紧 autofix classification ([#412](https://github.com/EveryInc/compound-engineering-plugin/issues/412)) ([90684c4](https://github.com/EveryInc/compound-engineering-plugin/commit/90684c4e8272b41c098ef2452c40d86d460ea578))
* **ce-plan:** 跨 plan 和 work skills 强化 test scenario guidance ([#410](https://github.com/EveryInc/compound-engineering-plugin/issues/410)) ([615ec5d](https://github.com/EveryInc/compound-engineering-plugin/commit/615ec5d3feb14785530bbfe2b4a50afe29ccbc47))
* **ce-review:** 添加 `base:` 和 `plan:` arguments，并提取 scope detection ([#405](https://github.com/EveryInc/compound-engineering-plugin/issues/405)) ([914f9b0](https://github.com/EveryInc/compound-engineering-plugin/commit/914f9b0d9822786d9ba6dc2307a543ae5a25c6e9))
* **document-review:** smarter autofix、batch-confirm 和 error/omission classification ([#401](https://github.com/EveryInc/compound-engineering-plugin/issues/401)) ([0863cfa](https://github.com/EveryInc/compound-engineering-plugin/commit/0863cfa4cbebcd121b0757abf374e5095d42f989))
* **onboarding:** 添加 consumer perspective，并拆分 architecture diagrams ([#413](https://github.com/EveryInc/compound-engineering-plugin/issues/413)) ([31326a5](https://github.com/EveryInc/compound-engineering-plugin/commit/31326a54584a12c473944fa488bea26410fd6fce))


### 修复

* 为 plugin frontmatter 添加 strict YAML validation ([#399](https://github.com/EveryInc/compound-engineering-plugin/issues/399)) ([0877b69](https://github.com/EveryInc/compound-engineering-plugin/commit/0877b693ced341cec699ea959dc39f8bd78f33ef))
* 澄清 markdown product code 的 commit prefix selection ([#407](https://github.com/EveryInc/compound-engineering-plugin/issues/407)) ([4a60ee2](https://github.com/EveryInc/compound-engineering-plugin/commit/4a60ee23b77c942111f3935d325ca5c80424ceb2))
* 将 compound-docs 合并进 ce-compound skill ([#390](https://github.com/EveryInc/compound-engineering-plugin/issues/390)) ([daddb7d](https://github.com/EveryInc/compound-engineering-plugin/commit/daddb7d72f280a3bd9645c54d091844c198a324d))
* 整合 local dev README，并修复 shell aliases ([#396](https://github.com/EveryInc/compound-engineering-plugin/issues/396)) ([1bd63c2](https://github.com/EveryInc/compound-engineering-plugin/commit/1bd63c2c8931b63bcafe960ea6353372ea85512a))
* 在 test-xcode skill 中记录 SwiftUI Text link tap limitation ([#400](https://github.com/EveryInc/compound-engineering-plugin/issues/400)) ([6ddaec3](https://github.com/EveryInc/compound-engineering-plugin/commit/6ddaec3b6ed5b6a91aeaddadff3960714ef10dc1))
* 用更好的 state handling 加固 git workflow skills ([#406](https://github.com/EveryInc/compound-engineering-plugin/issues/406)) ([f83305e](https://github.com/EveryInc/compound-engineering-plugin/commit/f83305e22af09c37f452cf723c1b08bb0e7c8bdf))
* 通过 triage、prioritization 和 stack-aware search 改进 agent-native-reviewer ([#387](https://github.com/EveryInc/compound-engineering-plugin/issues/387)) ([e792166](https://github.com/EveryInc/compound-engineering-plugin/commit/e7921660ad42db8e9af56ec36f36ce8d1af13238))
* 替换 skills 中损坏的 markdown link refs ([#392](https://github.com/EveryInc/compound-engineering-plugin/issues/392)) ([506ad01](https://github.com/EveryInc/compound-engineering-plugin/commit/506ad01b4f056b0d8d0d440bfb7821f050aba156))
* 清理 skill/agent names 中的 colons，以兼容 Windows path ([#398](https://github.com/EveryInc/compound-engineering-plugin/issues/398)) ([b25480a](https://github.com/EveryInc/compound-engineering-plugin/commit/b25480af9eb1e69efa2fe30a8e7048f4c6aaa53c))

## [2.55.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.54.0...cli-v2.55.0) (2026-03-26)


### 功能

* 为 worktree workflows 添加 branch-based plugin install ([#395](https://github.com/EveryInc/compound-engineering-plugin/issues/395)) ([e09a742](https://github.com/EveryInc/compound-engineering-plugin/commit/e09a7426be6ba1cd86122e7519abfe3376849ade))


### 修复

* 防止 PR descriptions 中出现 orphaned opening paragraphs ([#393](https://github.com/EveryInc/compound-engineering-plugin/issues/393)) ([4b44a94](https://github.com/EveryInc/compound-engineering-plugin/commit/4b44a94e23c8621771b8813caebce78060a61611))

## [2.54.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.53.0...cli-v2.54.0) (2026-03-26)


### 功能

* 添加新的 `onboarding` skill，用于为 repo 创建 onboarding guide ([#384](https://github.com/EveryInc/compound-engineering-plugin/issues/384)) ([27b9831](https://github.com/EveryInc/compound-engineering-plugin/commit/27b9831084d69c4c8cf13d0a45c901268420de59))
* 用 ce:review delegation 替换 manual review agent config ([#381](https://github.com/EveryInc/compound-engineering-plugin/issues/381)) ([fed9fd6](https://github.com/EveryInc/compound-engineering-plugin/commit/fed9fd68db283c64ec11293f88a8ad7a6373e2fe))


### 修复

* 为 commit skills 添加 default-branch guard ([#386](https://github.com/EveryInc/compound-engineering-plugin/issues/386)) ([31f07c0](https://github.com/EveryInc/compound-engineering-plugin/commit/31f07c00473e9d8bd6d447cf04081c0a9631e34a))
* 通过优先使用 bundled plugins 实现 one-step codex installs ([#383](https://github.com/EveryInc/compound-engineering-plugin/issues/383)) ([f819e43](https://github.com/EveryInc/compound-engineering-plugin/commit/f819e435a54f5d7df558df5a6bee1e616a5da837))
* 将 commit-push-pr descriptions 限定到 full branch diff ([#385](https://github.com/EveryInc/compound-engineering-plugin/issues/385)) ([355e739](https://github.com/EveryInc/compound-engineering-plugin/commit/355e7392b21a28c8725f87a8f9c473a86543ce4a))

## [2.53.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.52.0...cli-v2.53.0) (2026-03-25)


### 功能

* 添加 git commit 和 branch helper skills ([#378](https://github.com/EveryInc/compound-engineering-plugin/issues/378)) ([fe08af2](https://github.com/EveryInc/compound-engineering-plugin/commit/fe08af2b417b707b6d3192a954af7ff2ab0fe667))
* 改进 `resolve-pr-feedback` skill ([#379](https://github.com/EveryInc/compound-engineering-plugin/issues/379)) ([2ba4f3f](https://github.com/EveryInc/compound-engineering-plugin/commit/2ba4f3fd58d4e57dfc6c314c2992c18ba1fb164b))
* 用 net-result focus 和 badging 改进 commit-push-pr skill ([#380](https://github.com/EveryInc/compound-engineering-plugin/issues/380)) ([efa798c](https://github.com/EveryInc/compound-engineering-plugin/commit/efa798c52cb9d62e9ef32283227a8df68278ff3a))
* 将 orphaned stack-specific reviewers 集成进 ce:review ([#375](https://github.com/EveryInc/compound-engineering-plugin/issues/375)) ([ce9016f](https://github.com/EveryInc/compound-engineering-plugin/commit/ce9016fac5fde9a52753cf94a4903088f05aeece))


### 修复

* 保护 CONTEXTUAL_RISK_FLAGS lookup，避免 prototype pollution ([#377](https://github.com/EveryInc/compound-engineering-plugin/issues/377)) ([8ebc77b](https://github.com/EveryInc/compound-engineering-plugin/commit/8ebc77b8e6c71e5bef40fcded9131c4457a387d7))

## [2.52.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.51.0...cli-v2.52.0) (2026-03-25)


### 功能

* 为 `ce:compound` 和 `ce:compound-refresh` skills 添加 consolidation support 和 overlap detection ([#372](https://github.com/EveryInc/compound-engineering-plugin/issues/372)) ([fe27f85](https://github.com/EveryInc/compound-engineering-plugin/commit/fe27f85810268a8e713ef2c921f0aec1baf771d7))
* 为 conductor support 添加 minimal config ([#373](https://github.com/EveryInc/compound-engineering-plugin/issues/373)) ([aad31ad](https://github.com/EveryInc/compound-engineering-plugin/commit/aad31adcd3d528581e8b00e78943b21fbe2c47e8))
* 优化 `ce:compound` speed 和 effectiveness ([#370](https://github.com/EveryInc/compound-engineering-plugin/issues/370)) ([4e3af07](https://github.com/EveryInc/compound-engineering-plugin/commit/4e3af079623ae678b9a79fab5d1726d78f242ec2))
* 将 `ce:review-beta` promote 为 stable `ce:review` ([#371](https://github.com/EveryInc/compound-engineering-plugin/issues/371)) ([7c5ff44](https://github.com/EveryInc/compound-engineering-plugin/commit/7c5ff445e3065fd13e00bcd57041f6c35b36f90b))
* 理顺 todo skill names，并优化 skills ([#368](https://github.com/EveryInc/compound-engineering-plugin/issues/368)) ([2612ed6](https://github.com/EveryInc/compound-engineering-plugin/commit/2612ed6b3d86364c74dc024e4ce35dde63fefbf6))

## [2.51.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.50.0...cli-v2.51.0) (2026-03-24)


### 功能

* 添加带 structured persona pipeline 的 `ce:review-beta` ([#348](https://github.com/EveryInc/compound-engineering-plugin/issues/348)) ([e932276](https://github.com/EveryInc/compound-engineering-plugin/commit/e9322768664e194521894fe770b87c7dabbb8a22))
* 将 ce:plan-beta 和 deepen-plan-beta promote 为 stable ([#355](https://github.com/EveryInc/compound-engineering-plugin/issues/355)) ([169996a](https://github.com/EveryInc/compound-engineering-plugin/commit/169996a75e98a29db9e07b87b0911cc80270f732))
* 用 persona-based review 重新设计 `document-review` skill ([#359](https://github.com/EveryInc/compound-engineering-plugin/issues/359)) ([18d22af](https://github.com/EveryInc/compound-engineering-plugin/commit/18d22afde2ae08a50c94efe7493775bc97d9a45a))

## [2.50.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.49.0...cli-v2.50.0) (2026-03-23)


### 功能

* **ce-work:** 添加 Codex delegation mode ([#328](https://github.com/EveryInc/compound-engineering-plugin/issues/328)) ([341c379](https://github.com/EveryInc/compound-engineering-plugin/commit/341c37916861c8bf413244de72f83b93b506575f))
* 用 GitHub native video upload 改进 `feature-video` skill ([#344](https://github.com/EveryInc/compound-engineering-plugin/issues/344)) ([4aa50e1](https://github.com/EveryInc/compound-engineering-plugin/commit/4aa50e1bada07e90f36282accb3cd81134e706cd))
* 用 layered architecture 和 visual verification 重写 `frontend-design` skill ([#343](https://github.com/EveryInc/compound-engineering-plugin/issues/343)) ([423e692](https://github.com/EveryInc/compound-engineering-plugin/commit/423e69272619e9e3c14750f5219cbf38684b6c96))


### 修复

* quote frontend-design skill description（为 frontend-design skill description 加引号） ([#353](https://github.com/EveryInc/compound-engineering-plugin/issues/353)) ([86342db](https://github.com/EveryInc/compound-engineering-plugin/commit/86342db36c0d09b65afe11241e095dda2ad2cdb0))

## [2.49.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.48.0...cli-v2.49.0) (2026-03-22)


### 功能

* 为 parallel skills 添加 execution mode toggle 和 context pressure bounds ([#336](https://github.com/EveryInc/compound-engineering-plugin/issues/336)) ([216d6df](https://github.com/EveryInc/compound-engineering-plugin/commit/216d6dfb2c9320c3354f8c9f30e831fca74865cd))
* 修复跨所有 targets 的 skill transformation pipeline ([#334](https://github.com/EveryInc/compound-engineering-plugin/issues/334)) ([4087e1d](https://github.com/EveryInc/compound-engineering-plugin/commit/4087e1df82138f462a64542831224e2718afafa7))
* 改进 reproduce-bug skill、同步 agent-browser，并清理 redundant skills ([#333](https://github.com/EveryInc/compound-engineering-plugin/issues/333)) ([affba1a](https://github.com/EveryInc/compound-engineering-plugin/commit/affba1a6a0d9320b529d429ad06fd5a3b5200bd8))


### 修复

* 为 Conductor gitignore `.context/` directory ([#331](https://github.com/EveryInc/compound-engineering-plugin/issues/331)) ([0f6448d](https://github.com/EveryInc/compound-engineering-plugin/commit/0f6448d81cbc47e66004b4ecb8fb835f75aeffe2))

## [2.48.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.47.0...cli-v2.48.0) (2026-03-22)


### 功能

* **git-worktree:** 在 new worktrees 中 auto-trust mise 和 direnv configs ([#312](https://github.com/EveryInc/compound-engineering-plugin/issues/312)) ([cfbfb67](https://github.com/EveryInc/compound-engineering-plugin/commit/cfbfb6710a846419cc07ad17d9dbb5b5a065801c))
* 让 skills 在 coding agents 间 platform-agnostic ([#330](https://github.com/EveryInc/compound-engineering-plugin/issues/330)) ([52df90a](https://github.com/EveryInc/compound-engineering-plugin/commit/52df90a16688ee023bbdb203969adcc45d7d2ba2))

## [2.47.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.46.0...cli-v2.47.0) (2026-03-20)


### 功能

* 通过添加 structured technology scan 改进 `repo-research-analyst` ([#327](https://github.com/EveryInc/compound-engineering-plugin/issues/327)) ([1c28d03](https://github.com/EveryInc/compound-engineering-plugin/commit/1c28d0321401ad50a51989f5e6293d773ac1a477))


### 修复

* **skills:** 在 lfg/slfg 中将 ralph-wiggum references 更新为 ralph-loop ([#324](https://github.com/EveryInc/compound-engineering-plugin/issues/324)) ([ac756a2](https://github.com/EveryInc/compound-engineering-plugin/commit/ac756a267c5e3d5e4ceb2f99939dbb93491ac4d2))

## [2.46.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.45.0...cli-v2.46.0) (2026-03-20)


### 功能

* 向 plan-beta skills 添加 optional high-level technical design ([#322](https://github.com/EveryInc/compound-engineering-plugin/issues/322)) ([3ba4935](https://github.com/EveryInc/compound-engineering-plugin/commit/3ba4935926b05586da488119f215057164d97489))


### 修复

* **ci:** 向 release publish job 添加 npm registry auth ([#319](https://github.com/EveryInc/compound-engineering-plugin/issues/319)) ([3361a38](https://github.com/EveryInc/compound-engineering-plugin/commit/3361a38108991237de51050283e781be847c6bd3))

## [2.45.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.44.0...cli-v2.45.0) (2026-03-19)


### 功能

* 编辑 resolve_todos_parallel skill，以支持 complete todo lifecycle ([#292](https://github.com/EveryInc/compound-engineering-plugin/issues/292)) ([88c89bc](https://github.com/EveryInc/compound-engineering-plugin/commit/88c89bc204c928d2f36e2d1f117d16c998ecd096))
* 将 claude code auto memory 集成为 ce:compound 和 ce:compound-refresh 的 supplementary data source ([#311](https://github.com/EveryInc/compound-engineering-plugin/issues/311)) ([5c1452d](https://github.com/EveryInc/compound-engineering-plugin/commit/5c1452d4cc80b623754dd6fe09c2e5b6ae86e72e))


### 修复

* 将 cursor-marketplace 添加为 release-please component ([#315](https://github.com/EveryInc/compound-engineering-plugin/issues/315)) ([838aeb7](https://github.com/EveryInc/compound-engineering-plugin/commit/838aeb79d069b57a80d15ff61d83913919b81aef))

## [2.44.0](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.43.2...cli-v2.44.0) (2026-03-18)


### 功能

* **plugin:** 向 ce:plan-beta 和 ce:work 添加 execution posture signaling ([#309](https://github.com/EveryInc/compound-engineering-plugin/issues/309)) ([748f72a](https://github.com/EveryInc/compound-engineering-plugin/commit/748f72a57f713893af03a4d8ed69c2311f492dbd))

## [2.43.2](https://github.com/EveryInc/compound-engineering-plugin/compare/cli-v2.43.1...cli-v2.43.2) (2026-03-18)


### 修复

* 启用 release-please labeling，使其能找到自己的 PRs ([a7d6e3f](https://github.com/EveryInc/compound-engineering-plugin/commit/a7d6e3fbba862d4e8b4e1a0510f0776e9e274b89))
* 重新启用 changelogs，让 release PRs 能正确累积 ([516bcc1](https://github.com/EveryInc/compound-engineering-plugin/commit/516bcc1dc4bf4e4756ae08775806494f5b43968a))
* 将 release-please search depth 从 500 降到 50 ([f1713b9](https://github.com/EveryInc/compound-engineering-plugin/commit/f1713b9dcd0deddc2485e8cf0594266232bf0019))
* 移除破坏 release creation 的 close-stale-PR step ([178d6ec](https://github.com/EveryInc/compound-engineering-plugin/commit/178d6ec282512eaee71ab66d45832d22d75353ec))

## 更新日志

此 repository 的 release notes 现在位于 GitHub Releases：

https://github.com/EveryInc/compound-engineering-plugin/releases

Multi-component releases 会发布到 component-specific tags，例如：

- `cli-vX.Y.Z`
- `compound-engineering-vX.Y.Z`
- `coding-tutor-vX.Y.Z`
- `marketplace-vX.Y.Z`

不要在这里添加新的 release entries。新的 release notes 由 GitHub 中的 release automation 管理。
