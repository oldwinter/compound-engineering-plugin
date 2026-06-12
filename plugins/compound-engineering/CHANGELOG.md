# 更新日志

此文件不再是 compound-engineering release 的 canonical changelog。

历史条目保留如下，但新的 release history 记录在根目录 [`CHANGELOG.md`](../../CHANGELOG.md)。

compound-engineering plugin 的所有 notable changes 都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)，
本项目遵循 [Semantic Versioning](https://semver.org/spec/v2.0.0.html)。

## [3.13.0](https://github.com/oldwinter/compound-engineering-plugin/compare/compound-engineering-v3.12.0...compound-engineering-v3.13.0) (2026-06-12)


### Features

* **ce-dogfood-beta:** add diff-scoped browser QA dogfood skill ([#848](https://github.com/oldwinter/compound-engineering-plugin/issues/848)) ([0aa6b55](https://github.com/oldwinter/compound-engineering-plugin/commit/0aa6b55a8026728de75aee0ff6ae5a0e006028c5))
* **ce-ideate:** distill user-supplied research files into dossiers ([#931](https://github.com/oldwinter/compound-engineering-plugin/issues/931)) ([a82a358](https://github.com/oldwinter/compound-engineering-plugin/commit/a82a358050bf44781c8f84f9b110702648fff27b))
* **ce-ideate:** improve for Fable model ([#924](https://github.com/oldwinter/compound-engineering-plugin/issues/924)) ([622fbfa](https://github.com/oldwinter/compound-engineering-plugin/commit/622fbfa60de346101e3177af243c79430b189a42))
* **ce-plan,ce-brainstorm:** contract-driven sections + optional HTML output ([#826](https://github.com/oldwinter/compound-engineering-plugin/issues/826)) ([11e12e5](https://github.com/oldwinter/compound-engineering-plugin/commit/11e12e5739c6691a2020eb8b70a944587e7f265f))
* **ce-plan:** approach-altitude plan-for-a-plan with ce-work non-code carve-out ([#905](https://github.com/oldwinter/compound-engineering-plugin/issues/905)) ([fbd0faf](https://github.com/oldwinter/compound-engineering-plugin/commit/fbd0fafd9358ab708b15fdc0030615525a0cd684))
* **ce-promote:** add ce-promote skill for post-ship announcement copy ([#888](https://github.com/oldwinter/compound-engineering-plugin/issues/888)) ([0939187](https://github.com/oldwinter/compound-engineering-plugin/commit/09391874b4be1a248bc7d627b0ebd5c29f0c886b))
* HTML-first ideation docs and a status-free plan model ([#921](https://github.com/oldwinter/compound-engineering-plugin/issues/921)) ([e74e298](https://github.com/oldwinter/compound-engineering-plugin/commit/e74e29864fbfa2f800fc3e08509e2966e4947f1e))
* **skill:** introduce CONCEPTS.md as shared vocabulary substrate ([#838](https://github.com/oldwinter/compound-engineering-plugin/issues/838)) ([7c4bb16](https://github.com/oldwinter/compound-engineering-plugin/commit/7c4bb16123412d97ded593fc785d206ecb9684bc))


### Bug Fixes

* **agents:** rename .agent.md to .md for VS Code Copilot tool access ([#846](https://github.com/oldwinter/compound-engineering-plugin/issues/846)) ([796bea7](https://github.com/oldwinter/compound-engineering-plugin/commit/796bea75b74f3b101b53f7cc1c108aece0979e6b))
* **ce-brainstorm,ce-plan:** add conceptual-diagram affordance to brainstorm docs ([#871](https://github.com/oldwinter/compound-engineering-plugin/issues/871)) ([e5e3fc3](https://github.com/oldwinter/compound-engineering-plugin/commit/e5e3fc3630c026ae0eae6637d8b7a342af862e66))
* **ce-brainstorm,ce-plan:** restore default-on requirements grouping ([#868](https://github.com/oldwinter/compound-engineering-plugin/issues/868)) ([5c88212](https://github.com/oldwinter/compound-engineering-plugin/commit/5c88212c1fd310d27033e7e8508e782e1f19cfdc))
* **ce-commit-push-pr:** require user-visible bug summaries ([#853](https://github.com/oldwinter/compound-engineering-plugin/issues/853)) ([67d2736](https://github.com/oldwinter/compound-engineering-plugin/commit/67d273622e40a7b28f18c95f65379a36726ca558))
* **ce-compound:** drop date suffix from generated doc filenames ([#849](https://github.com/oldwinter/compound-engineering-plugin/issues/849)) ([ac1c6d9](https://github.com/oldwinter/compound-engineering-plugin/commit/ac1c6d9a997d4f8eaba1ba55d8b44500ca393cd4))
* **ce-plan:** add answer-seeking disposition to universal planning ([#886](https://github.com/oldwinter/compound-engineering-plugin/issues/886)) ([ece9fa1](https://github.com/oldwinter/compound-engineering-plugin/commit/ece9fa1f1f40a267b3ab7c4aa94126e3f5623b09))
* **ce-plan:** honor explicit external-research requests and route them by intent ([#875](https://github.com/oldwinter/compound-engineering-plugin/issues/875)) ([b3e396d](https://github.com/oldwinter/compound-engineering-plugin/commit/b3e396d0bfd7be0c672cb7193a5cfa40675e6979))
* **ce-polish:** promote from beta to stable ([#880](https://github.com/oldwinter/compound-engineering-plugin/issues/880)) ([63b6b26](https://github.com/oldwinter/compound-engineering-plugin/commit/63b6b260c345ba70ce9d9a393eeedefb64e4e0a0))
* **ce-release-notes:** placeholder links ([#915](https://github.com/oldwinter/compound-engineering-plugin/issues/915)) ([b625049](https://github.com/oldwinter/compound-engineering-plugin/commit/b6250490bec4c0488d68ad66d72bd99f6edb95fd))
* **ce-resolve-pr-feedback:** drop clustering, default to merit-based fixing ([#893](https://github.com/oldwinter/compound-engineering-plugin/issues/893)) ([3e77a7b](https://github.com/oldwinter/compound-engineering-plugin/commit/3e77a7bd8450fef7270f8b46c0f1865fd7125741))
* **ce-resolve-pr-feedback:** fail loudly when repo auto-detection fails ([#908](https://github.com/oldwinter/compound-engineering-plugin/issues/908)) ([bb0c9ab](https://github.com/oldwinter/compound-engineering-plugin/commit/bb0c9ab4ee596d546f2965222e0ec8c2a097ae53))
* **ce-resolve-pr-feedback:** prevent replies landing on wrong PR from GHE node ID mismatch ([#910](https://github.com/oldwinter/compound-engineering-plugin/issues/910)) ([6f9ab03](https://github.com/oldwinter/compound-engineering-plugin/commit/6f9ab03a031c054a8046659926251fb6c149269f))
* **ce-sessions:** emit repo root path instead of basename subshell ([#873](https://github.com/oldwinter/compound-engineering-plugin/issues/873)) ([253dba8](https://github.com/oldwinter/compound-engineering-plugin/commit/253dba80dd08c111edae3f7fdc8fac998ec0d5cb))
* **commit:** auto-create feature branch on default branch ([#856](https://github.com/oldwinter/compound-engineering-plugin/issues/856)) ([26a8025](https://github.com/oldwinter/compound-engineering-plugin/commit/26a802551e44d12b837ac5d3e33fc7ffacbbf354))
* **html-rendering:** constrain measure and surface execution notes ([#870](https://github.com/oldwinter/compound-engineering-plugin/issues/870)) ([1051132](https://github.com/oldwinter/compound-engineering-plugin/commit/1051132d04153c3045fc4c929cff32882c6934fe))
* reduce verbosity and remove HTML comments from generated docs ([#906](https://github.com/oldwinter/compound-engineering-plugin/issues/906)) ([debc915](https://github.com/oldwinter/compound-engineering-plugin/commit/debc915c5886a22c049e871304b7f991363e1155))
* **simplify-code:** guard against over-simplification and behavior drift ([#859](https://github.com/oldwinter/compound-engineering-plugin/issues/859)) ([673dcfa](https://github.com/oldwinter/compound-engineering-plugin/commit/673dcfacb8089476961a0f7d5d1b3a7ac2a84c37))
* **skills:** enforce content conventions in CI and fix violations ([#930](https://github.com/oldwinter/compound-engineering-plugin/issues/930)) ([c8e7d90](https://github.com/oldwinter/compound-engineering-plugin/commit/c8e7d908fa7e230dc8723639ea48498e3e499f3c))

## [3.12.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.11.2...compound-engineering-v3.12.0) (2026-06-09)


### Features

* HTML-first ideation docs and a status-free plan model ([#921](https://github.com/EveryInc/compound-engineering-plugin/issues/921)) ([e74e298](https://github.com/EveryInc/compound-engineering-plugin/commit/e74e29864fbfa2f800fc3e08509e2966e4947f1e))


### Bug Fixes

* **ce-release-notes:** placeholder links ([#915](https://github.com/EveryInc/compound-engineering-plugin/issues/915)) ([b625049](https://github.com/EveryInc/compound-engineering-plugin/commit/b6250490bec4c0488d68ad66d72bd99f6edb95fd))

## [3.11.2](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.11.1...compound-engineering-v3.11.2) (2026-06-06)


### Bug Fixes

* **ce-resolve-pr-feedback:** fail loudly when repo auto-detection fails ([#908](https://github.com/EveryInc/compound-engineering-plugin/issues/908)) ([bb0c9ab](https://github.com/EveryInc/compound-engineering-plugin/commit/bb0c9ab4ee596d546f2965222e0ec8c2a097ae53))
* **ce-resolve-pr-feedback:** prevent replies landing on wrong PR from GHE node ID mismatch ([#910](https://github.com/EveryInc/compound-engineering-plugin/issues/910)) ([6f9ab03](https://github.com/EveryInc/compound-engineering-plugin/commit/6f9ab03a031c054a8046659926251fb6c149269f))

## [3.11.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.11.0...compound-engineering-v3.11.1) (2026-06-05)


### 修复

* 降低冗长度，并从 generated docs 移除 HTML comments ([#906](https://github.com/EveryInc/compound-engineering-plugin/issues/906)) ([debc915](https://github.com/EveryInc/compound-engineering-plugin/commit/debc915c5886a22c049e871304b7f991363e1155))

## [3.11.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.10.0...compound-engineering-v3.11.0) (2026-06-04)


### 功能

* **ce-plan:** 添加 approach-altitude plan-for-a-plan，并配套 ce-work non-code carve-out ([#905](https://github.com/EveryInc/compound-engineering-plugin/issues/905)) ([fbd0faf](https://github.com/EveryInc/compound-engineering-plugin/commit/fbd0fafd9358ab708b15fdc0030615525a0cd684))


### 修复

* **ce-polish:** 从 beta 提升到 stable ([#880](https://github.com/EveryInc/compound-engineering-plugin/issues/880)) ([63b6b26](https://github.com/EveryInc/compound-engineering-plugin/commit/63b6b260c345ba70ce9d9a393eeedefb64e4e0a0))

## [3.10.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.9.4...compound-engineering-v3.10.0) (2026-06-03)


### 功能

* **ce-promote:** 添加用于 ship 后 announcement copy 的 ce-promote skill ([#888](https://github.com/EveryInc/compound-engineering-plugin/issues/888)) ([0939187](https://github.com/EveryInc/compound-engineering-plugin/commit/09391874b4be1a248bc7d627b0ebd5c29f0c886b))
* **skill:** 引入 CONCEPTS.md 作为 shared vocabulary substrate ([#838](https://github.com/EveryInc/compound-engineering-plugin/issues/838)) ([7c4bb16](https://github.com/EveryInc/compound-engineering-plugin/commit/7c4bb16123412d97ded593fc785d206ecb9684bc))


### 修复

* **ce-resolve-pr-feedback:** 移除 clustering，默认按 merit-based fixing 处理 ([#893](https://github.com/EveryInc/compound-engineering-plugin/issues/893)) ([3e77a7b](https://github.com/EveryInc/compound-engineering-plugin/commit/3e77a7bd8450fef7270f8b46c0f1865fd7125741))

## [3.9.4](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.9.3...compound-engineering-v3.9.4) (2026-05-31)


### 修复

* **ce-plan:** 为 universal planning 添加 answer-seeking disposition ([#886](https://github.com/EveryInc/compound-engineering-plugin/issues/886)) ([ece9fa1](https://github.com/EveryInc/compound-engineering-plugin/commit/ece9fa1f1f40a267b3ab7c4aa94126e3f5623b09))

## [3.9.3](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.9.2...compound-engineering-v3.9.3) (2026-05-28)


### 修复

* **ce-plan:** 尊重显式 external-research 请求，并按 intent 路由 ([#875](https://github.com/EveryInc/compound-engineering-plugin/issues/875)) ([b3e396d](https://github.com/EveryInc/compound-engineering-plugin/commit/b3e396d0bfd7be0c672cb7193a5cfa40675e6979))
* **ce-sessions:** 输出 repo root path，而不是 basename subshell ([#873](https://github.com/EveryInc/compound-engineering-plugin/issues/873)) ([253dba8](https://github.com/EveryInc/compound-engineering-plugin/commit/253dba80dd08c111edae3f7fdc8fac998ec0d5cb))

## [3.9.2](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.9.1...compound-engineering-v3.9.2) (2026-05-27)


### 修复

* **ce-brainstorm,ce-plan:** 为 brainstorm docs 添加 conceptual-diagram affordance ([#871](https://github.com/EveryInc/compound-engineering-plugin/issues/871)) ([e5e3fc3](https://github.com/EveryInc/compound-engineering-plugin/commit/e5e3fc3630c026ae0eae6637d8b7a342af862e66))

## [3.9.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.9.0...compound-engineering-v3.9.1) (2026-05-27)


### 修复

* **ce-brainstorm,ce-plan:** 恢复 default-on requirements grouping ([#868](https://github.com/EveryInc/compound-engineering-plugin/issues/868)) ([5c88212](https://github.com/EveryInc/compound-engineering-plugin/commit/5c88212c1fd310d27033e7e8508e782e1f19cfdc))
* **html-rendering:** 约束 measure，并 surface execution notes ([#870](https://github.com/EveryInc/compound-engineering-plugin/issues/870)) ([1051132](https://github.com/EveryInc/compound-engineering-plugin/commit/1051132d04153c3045fc4c929cff32882c6934fe))

## [3.9.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.8.4...compound-engineering-v3.9.0) (2026-05-26)


### 功能

* **ce-dogfood-beta:** 添加 diff-scoped browser QA dogfood skill ([#848](https://github.com/EveryInc/compound-engineering-plugin/issues/848)) ([0aa6b55](https://github.com/EveryInc/compound-engineering-plugin/commit/0aa6b55a8026728de75aee0ff6ae5a0e006028c5))
* **ce-plan,ce-brainstorm:** contract-driven sections + 可选 HTML output ([#826](https://github.com/EveryInc/compound-engineering-plugin/issues/826)) ([11e12e5](https://github.com/EveryInc/compound-engineering-plugin/commit/11e12e5739c6691a2020eb8b70a944587e7f265f))


### 修复

* **ce-commit-push-pr:** 要求 user-visible bug summaries ([#853](https://github.com/EveryInc/compound-engineering-plugin/issues/853)) ([67d2736](https://github.com/EveryInc/compound-engineering-plugin/commit/67d273622e40a7b28f18c95f65379a36726ca558))
* **commit:** 在 default branch 上自动创建 feature branch ([#856](https://github.com/EveryInc/compound-engineering-plugin/issues/856)) ([26a8025](https://github.com/EveryInc/compound-engineering-plugin/commit/26a802551e44d12b837ac5d3e33fc7ffacbbf354))
* **simplify-code:** 防止 over-simplification 和 behavior drift ([#859](https://github.com/EveryInc/compound-engineering-plugin/issues/859)) ([673dcfa](https://github.com/EveryInc/compound-engineering-plugin/commit/673dcfacb8089476961a0f7d5d1b3a7ac2a84c37))

## [3.8.4](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.8.3...compound-engineering-v3.8.4) (2026-05-21)


### 修复

* **agents:** 将 `.agent.md` 重命名为 `.md`，以支持 VS Code Copilot tool access ([#846](https://github.com/EveryInc/compound-engineering-plugin/issues/846)) ([796bea7](https://github.com/EveryInc/compound-engineering-plugin/commit/796bea75b74f3b101b53f7cc1c108aece0979e6b))
* **ce-compound:** 从生成的 doc filenames 移除 date suffix ([#849](https://github.com/EveryInc/compound-engineering-plugin/issues/849)) ([ac1c6d9](https://github.com/EveryInc/compound-engineering-plugin/commit/ac1c6d9a997d4f8eaba1ba55d8b44500ca393cd4))
* **ce-proof:** 为 Proof v2 更新 HITL flow ([#847](https://github.com/EveryInc/compound-engineering-plugin/issues/847)) ([2a46670](https://github.com/EveryInc/compound-engineering-plugin/commit/2a46670958e8c102ea32cb2c532fb00a5e29f6e4))

## [3.8.3](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.8.2...compound-engineering-v3.8.3) (2026-05-17)


### 修复

* **ce-coherence-reviewer:** 从 tool allowlist 移除 Bash ([#837](https://github.com/EveryInc/compound-engineering-plugin/issues/837)) ([82b8af4](https://github.com/EveryInc/compound-engineering-plugin/commit/82b8af415d9ca5577577fa80da0a6119fc8b661e))
* **ce-commit-push-pr:** 围绕一个 core principle 重写 pr-description ([#841](https://github.com/EveryInc/compound-engineering-plugin/issues/841)) ([fd88fd8](https://github.com/EveryInc/compound-engineering-plugin/commit/fd88fd8fd71ccba9d12e9f33a8c1dc99709c6d02))
* **ce-plan:** 将 synthesis gate output inline 到 SKILL.md ([#822](https://github.com/EveryInc/compound-engineering-plugin/issues/822)) ([39cb9da](https://github.com/EveryInc/compound-engineering-plugin/commit/39cb9da3a1a90a7ce7418f7a64d7ff3c8f9a917c))
* **ce-web-researcher:** 允许使用任意 web tool，而不只限 Claude built-ins ([#836](https://github.com/EveryInc/compound-engineering-plugin/issues/836)) ([6fa1277](https://github.com/EveryInc/compound-engineering-plugin/commit/6fa1277e573b6bec5d94d5b42431b6a4cad5b030))

## [3.8.2](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.8.1...compound-engineering-v3.8.2) (2026-05-14)


### 修复

* **ce-brainstorm:** 清理 scoping synthesis 和 Q&A interaction ([#829](https://github.com/EveryInc/compound-engineering-plugin/issues/829)) ([6df3f96](https://github.com/EveryInc/compound-engineering-plugin/commit/6df3f965808a67368d24ddd4816a6bed18df7cdb))

## [3.8.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.8.0...compound-engineering-v3.8.1) (2026-05-11)


### 修复

* **ce-code-review:** 用 prose-driven base detection 替换 resolve-base.sh ([#815](https://github.com/EveryInc/compound-engineering-plugin/issues/815)) ([d090bde](https://github.com/EveryInc/compound-engineering-plugin/commit/d090bde0ff1bbc33ec3c3b2049cb4687e9d76532))
* **ce-plan:** 将 synthesis confirmation 压缩为 prose + call-outs ([#819](https://github.com/EveryInc/compound-engineering-plugin/issues/819)) ([60c1c93](https://github.com/EveryInc/compound-engineering-plugin/commit/60c1c938d5bbf70abd0af08af3d2c9ede0d1b89d))

## [3.8.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.7.3...compound-engineering-v3.8.0) (2026-05-10)


### 功能

* **ce-compound:** 添加 `mode:headless` 以支持 non-interactive use ([#813](https://github.com/EveryInc/compound-engineering-plugin/issues/813)) ([9b45a83](https://github.com/EveryInc/compound-engineering-plugin/commit/9b45a83d7ed2534669656fb3abf6a2c23e2e4f59))

## [3.7.3](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.7.2...compound-engineering-v3.7.3) (2026-05-08)


### 修复

* **ce-resolve-pr-feedback:** 对 GraphQL connections 分页 ([#807](https://github.com/EveryInc/compound-engineering-plugin/issues/807)) ([07a6d52](https://github.com/EveryInc/compound-engineering-plugin/commit/07a6d52879ed715e179ff11daaee47e02bc6ecc9))

## [3.7.2](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.7.1...compound-engineering-v3.7.2) (2026-05-08)


### 修复

* **ce-sessions:** 解锁 Claude Code 上的 session-history ([#800](https://github.com/EveryInc/compound-engineering-plugin/issues/800)) ([81710ef](https://github.com/EveryInc/compound-engineering-plugin/commit/81710efad5666831715a630b04554a35946afb1d))

## [3.7.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.7.0...compound-engineering-v3.7.1) (2026-05-08)


### 修复

* **ce-debug:** 调整 triage 规模并收紧 hypothesis discipline ([#796](https://github.com/EveryInc/compound-engineering-plugin/issues/796)) ([6fc57c5](https://github.com/EveryInc/compound-engineering-plugin/commit/6fc57c501f2e4a6978a91b41337026cf25086646))

## [3.7.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.6.1...compound-engineering-v3.7.0) (2026-05-07)


### 功能

* **lfg:** 允许 model invocation，并在 PR 后添加 CI autofix loop ([#788](https://github.com/EveryInc/compound-engineering-plugin/issues/788)) ([d316971](https://github.com/EveryInc/compound-engineering-plugin/commit/d316971b20d734ab914cb81093c56810c3b14fa7))


### 修复

* **ce-ideate:** 约束 scope，并添加 topic-surface decomposition ([#787](https://github.com/EveryInc/compound-engineering-plugin/issues/787)) ([168fad4](https://github.com/EveryInc/compound-engineering-plugin/commit/168fad4ac246b55972b84b7b2a0f1da08a481d7c))

## [3.6.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.6.0...compound-engineering-v3.6.1) (2026-05-06)


### 修复

* **doc-review:** 降低 plans 上的 review noise，并按 doc shape 限定 personas scope ([#780](https://github.com/EveryInc/compound-engineering-plugin/issues/780)) ([8349e75](https://github.com/EveryInc/compound-engineering-plugin/commit/8349e750b856d267b74fbbeb2fb135e4ff73eb91))

## [3.6.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.5.0...compound-engineering-v3.6.0) (2026-05-05)


### 功能

* **ce-work-beta:** 为 Codex delegation batches 添加 adaptive effort selection ([#759](https://github.com/EveryInc/compound-engineering-plugin/issues/759)) ([3e03365](https://github.com/EveryInc/compound-engineering-plugin/commit/3e03365d54b5ec909ba75adfc15b870f2e5a9b53))


### 修复

* **ce-doc-review:** 阻止把删除 diagram 作为 fix recommendation ([#775](https://github.com/EveryInc/compound-engineering-plugin/issues/775)) ([1f3c646](https://github.com/EveryInc/compound-engineering-plugin/commit/1f3c6466e4eb4e1b584c658953dfb1ca98dd3335))
* **ce-doc-review:** 收紧 finding resolution routing ([#769](https://github.com/EveryInc/compound-engineering-plugin/issues/769)) ([5427863](https://github.com/EveryInc/compound-engineering-plugin/commit/542786320bc155d48823e58162d6a474b54be671))
* **ce-plan:** 将 Implementation Units 渲染为 headings，而不是 bulleted list items ([#766](https://github.com/EveryInc/compound-engineering-plugin/issues/766)) ([be2efd7](https://github.com/EveryInc/compound-engineering-plugin/commit/be2efd7d7605c483ea9f068c6190b81a9d68e942))
* **ce-work-beta:** 用 single-command form 替换 semicolon pre-resolution ([#758](https://github.com/EveryInc/compound-engineering-plugin/issues/758)) ([5139ff1](https://github.com/EveryInc/compound-engineering-plugin/commit/5139ff13e9102e9db821fbeffa5e2abc49014dd6))
* **ce-work-beta:** 将 Codex sandbox flags 更新到当前 CLI syntax ([#770](https://github.com/EveryInc/compound-engineering-plugin/issues/770)) ([7ff3472](https://github.com/EveryInc/compound-engineering-plugin/commit/7ff3472cabb4dfe7141b55429ed2bc6b02a7b5e9))
* **ce-worktree:** 相对 skill dir 解析 script path，而不是 user CWD ([#772](https://github.com/EveryInc/compound-engineering-plugin/issues/772)) ([4cc1ee6](https://github.com/EveryInc/compound-engineering-plugin/commit/4cc1ee6fe2a353cd0b8e7466ec27e9556b042ee3))
* **review:** escape finding table cells 中的 literal pipes ([#779](https://github.com/EveryInc/compound-engineering-plugin/issues/779)) ([c7fc674](https://github.com/EveryInc/compound-engineering-plugin/commit/c7fc6743264440c2b0093607572764a0ce451b5d))

## [3.5.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.4.2...compound-engineering-v3.5.0) (2026-05-04)


### 功能

* **riffrec-feedback-analysis:** 添加带 three-path routing 的 Riffrec feedback skill ([#747](https://github.com/EveryInc/compound-engineering-plugin/issues/747)) ([dde9256](https://github.com/EveryInc/compound-engineering-plugin/commit/dde9256362db90606d052c662dc8f2f0ae6b620b))

## [3.4.2](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.4.1...compound-engineering-v3.4.2) (2026-05-04)


### 修复

* **ce-code-review:** 保持 finding 编号稳定 ([#754](https://github.com/EveryInc/compound-engineering-plugin/issues/754)) ([e856756](https://github.com/EveryInc/compound-engineering-plugin/commit/e8567566b7ed779ea1964d6ffe97e8cb4ca79d73))
* **ce-commit-push-pr:** 为 PR descriptions 使用 body-file ([#757](https://github.com/EveryInc/compound-engineering-plugin/issues/757)) ([a84cb75](https://github.com/EveryInc/compound-engineering-plugin/commit/a84cb759d078787f1e2f4a0ce2eda9d8680b7c90))
* **ce-compound, ce-sessions:** 从 `!` backtick 中移除 bash parameter expansion ([#752](https://github.com/EveryInc/compound-engineering-plugin/issues/752)) ([9539bf0](https://github.com/EveryInc/compound-engineering-plugin/commit/9539bf045deba099a20d306b2b118e3b019c633c))
* **ce-polish-beta:** 支持 Bash 3.2 project detection ([#755](https://github.com/EveryInc/compound-engineering-plugin/issues/755)) ([caf5e12](https://github.com/EveryInc/compound-engineering-plugin/commit/caf5e1251caeeed45ed2e18eb366fc25d90f38be))

## [3.4.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.4.0...compound-engineering-v3.4.1) (2026-05-01)


### 修复

* **ce-setup:** 检测 codex global skills ([#739](https://github.com/EveryInc/compound-engineering-plugin/issues/739)) ([887db6b](https://github.com/EveryInc/compound-engineering-plugin/commit/887db6b2ade997a2723debc15b5baf34fcf52fb4))
* **code-review:** 向 JSON-pipeline reviewer agents 授予 Write ([#741](https://github.com/EveryInc/compound-engineering-plugin/issues/741)) ([520a9eb](https://github.com/EveryInc/compound-engineering-plugin/commit/520a9ebea039f4f5d984cd7f31d8b8e60a9e0bc6))

## [3.4.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.3.2...compound-engineering-v3.4.0) (2026-05-01)


### 功能

* **ce-simplify-code:** 添加用于简化近期 code changes 的 skill ([#735](https://github.com/EveryInc/compound-engineering-plugin/issues/735)) ([2d20757](https://github.com/EveryInc/compound-engineering-plugin/commit/2d207574123782722116bd3d93f9f5756fab4dd3))
* **ce-strategy,ce-product-pulse:** 添加用于 upstream anchor 和 outcome pulse 的 PM skills ([#614](https://github.com/EveryInc/compound-engineering-plugin/issues/614)) ([cb8f9b3](https://github.com/EveryInc/compound-engineering-plugin/commit/cb8f9b348391d28f31ce367b9ff308980939c96f))
* **ce-strategy:** 将 strategy doc 移到 root 并添加 frontmatter ([#732](https://github.com/EveryInc/compound-engineering-plugin/issues/732)) ([265cb42](https://github.com/EveryInc/compound-engineering-plugin/commit/265cb4280f22bbd2fd5cc45e338371442b6c1692))


### 修复

* **ce-commit-push-pr:** 对 badge model-slug examples 中的括号做 URL encode ([#725](https://github.com/EveryInc/compound-engineering-plugin/issues/725)) ([3873b9e](https://github.com/EveryInc/compound-engineering-plugin/commit/3873b9e9de483cfe91eaed295a6b736d0a2e1168))
* **ce-compound,ce-sessions:** 在预解析 git branch 时处理 non-git CWD ([#731](https://github.com/EveryInc/compound-engineering-plugin/issues/731)) ([5e04534](https://github.com/EveryInc/compound-engineering-plugin/commit/5e045341372fc95d284268d514a53da5722c81d2))
* **ce-plan:** 收敛 rich-context invocations 中的 synthesis drift ([#729](https://github.com/EveryInc/compound-engineering-plugin/issues/729)) ([15c1cde](https://github.com/EveryInc/compound-engineering-plugin/commit/15c1cde7b353d8f309b5a2de94bafb99380d787a))
* **ce-sessions:** 修复 722 ce-compound 和 ce-sessions permission error ([#723](https://github.com/EveryInc/compound-engineering-plugin/issues/723)) ([8f80466](https://github.com/EveryInc/compound-engineering-plugin/commit/8f804669b184bc68ef6dbab4669fe0e431d8271a))
* **review:** 默认使用 harness-native code review，并在有风险时 escalate ([#721](https://github.com/EveryInc/compound-engineering-plugin/issues/721)) ([d217660](https://github.com/EveryInc/compound-engineering-plugin/commit/d217660b3d37acf38227abf5c57ba6f390ccaa1e))

## [3.3.2](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.3.1...compound-engineering-v3.3.2) (2026-04-29)


### 修复

* **ce-code-review:** 对 previous-comments persona 增加 comment gate，以跳过空 PR ([#720](https://github.com/EveryInc/compound-engineering-plugin/issues/720)) ([09fa18b](https://github.com/EveryInc/compound-engineering-plugin/commit/09fa18bcc1f130b7af26dfc53974776f1434b53d))
* **ce-code-review:** 要求进入 walk-through 时加载 walkthrough.md ([#718](https://github.com/EveryInc/compound-engineering-plugin/issues/718)) ([5ac1a06](https://github.com/EveryInc/compound-engineering-plugin/commit/5ac1a063a9c154bb586a5f2b2ad17ef59990c0b6))

## [3.3.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.3.0...compound-engineering-v3.3.1) (2026-04-28)


### 修复

* **review:** subagent slots 已满时排队 reviewers ([#716](https://github.com/EveryInc/compound-engineering-plugin/issues/716)) ([d69a772](https://github.com/EveryInc/compound-engineering-plugin/commit/d69a772bb8682da23fa0b6a293245768e573254b))

## [3.3.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.2.0...compound-engineering-v3.3.0) (2026-04-28)


### 功能

* **ce-brainstorm,ce-plan:** 在 doc-write 前展示 agent 的 scope synthesis ([#705](https://github.com/EveryInc/compound-engineering-plugin/issues/705)) ([41e7f72](https://github.com/EveryInc/compound-engineering-plugin/commit/41e7f72ab697b3aee9b4a740794daa55317f44d1))


### 修复

* **ce-code-review:** 在 dispatch point 重申 model override ([#681](https://github.com/EveryInc/compound-engineering-plugin/issues/681)) ([9751d1a](https://github.com/EveryInc/compound-engineering-plugin/commit/9751d1a30a39fcfe17a9e052d32dbc9a5deafd02))
* **ce-compound-refresh:** 删除前检查 inbound links ([#713](https://github.com/EveryInc/compound-engineering-plugin/issues/713)) ([e806522](https://github.com/EveryInc/compound-engineering-plugin/commit/e806522caab45f07f7bd3f06d6b1333068c538cd))
* **ce-doc-review:** 收紧 suggested_fix 和 why_it_matters 规则 ([#702](https://github.com/EveryInc/compound-engineering-plugin/issues/702)) ([dd08094](https://github.com/EveryInc/compound-engineering-plugin/commit/dd080943e0bff65416c5a3b16bcc6c3e1d26524f))
* **ce-plan:** inline post-generation menu routing，让 option 1 真正启动 `/ce-work` ([#715](https://github.com/EveryInc/compound-engineering-plugin/issues/715)) ([0c515c0](https://github.com/EveryInc/compound-engineering-plugin/commit/0c515c06fe7efc77baf29b5512a768c930d50ba0))
* **ce-work-beta:** 将 model 和 reasoning effort 交给 Codex config 决定 ([#704](https://github.com/EveryInc/compound-engineering-plugin/issues/704)) ([4b5f28d](https://github.com/EveryInc/compound-engineering-plugin/commit/4b5f28da9746aae8f2c5dd715d7029d0ab2758a6))
* **commit-push-pr:** 从 fresh remote base 创建 branch，防止 stale-base contamination ([#708](https://github.com/EveryInc/compound-engineering-plugin/issues/708)) ([cd2fc67](https://github.com/EveryInc/compound-engineering-plugin/commit/cd2fc67c3f2db9b98de16a10d2a1e8e11700985e))
* **skills:** 替换 permission check 会阻塞的 shell antipatterns ([#711](https://github.com/EveryInc/compound-engineering-plugin/issues/711)) ([1f0a77b](https://github.com/EveryInc/compound-engineering-plugin/commit/1f0a77bcc1e4edbf1b7979ea5cd13d1e553d4662))

## [3.2.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.1.0...compound-engineering-v3.2.0) (2026-04-26)


### 功能

* **ce-compound:** 添加 frontmatter parser-safety validator ([#697](https://github.com/EveryInc/compound-engineering-plugin/issues/697)) ([7eea2d1](https://github.com/EveryInc/compound-engineering-plugin/commit/7eea2d1cfe5c177e2d144b1e12f4957c75dac556))


### 修复

* **ce-code-review:** 按 AGENTS.md 将 run artifacts 从 `.context/` 移到 `/tmp` ([#690](https://github.com/EveryInc/compound-engineering-plugin/issues/690)) ([85e9a20](https://github.com/EveryInc/compound-engineering-plugin/commit/85e9a2073b09295b1a0771d4775d42b7142fd172))
* **ce-code-review:** 用 best-judgment auto-resolve 替换 LFG ([#685](https://github.com/EveryInc/compound-engineering-plugin/issues/685)) ([9ba41a1](https://github.com/EveryInc/compound-engineering-plugin/commit/9ba41a14cadfe2eee75fe50485f72f38b09df00b))
* **ce-code-review:** 收紧 safe_auto/gated_auto 边界的 autofix_class rubric ([#695](https://github.com/EveryInc/compound-engineering-plugin/issues/695)) ([ad9577e](https://github.com/EveryInc/compound-engineering-plugin/commit/ad9577e7329cba31cffba71815cac6cef290ae1b))
* **ce-debug:** 默认走 commit-and-PR，并收紧 learning offer ([#693](https://github.com/EveryInc/compound-engineering-plugin/issues/693)) ([e21156e](https://github.com/EveryInc/compound-engineering-plugin/commit/e21156eeb7e1502a37bf7d4a30fdc6a3287eed7a))
* **ce-debug:** delegate commit/PR 并添加 branch check ([#683](https://github.com/EveryInc/compound-engineering-plugin/issues/683)) ([1284290](https://github.com/EveryInc/compound-engineering-plugin/commit/1284290af27139c2df192488099626688fd4898b))
* **ce-demo-reel:** 等待 network idle 并拒绝 blank frames ([#692](https://github.com/EveryInc/compound-engineering-plugin/issues/692)) ([f30404e](https://github.com/EveryInc/compound-engineering-plugin/commit/f30404e57bcbf7866c1a9524f4392f7dff8f3a0b))
* **ce-doc-review:** 将 LFG path 重命名为 best-judgment，避免 `/lfg` collision ([#691](https://github.com/EveryInc/compound-engineering-plugin/issues/691)) ([50bf65e](https://github.com/EveryInc/compound-engineering-plugin/commit/50bf65e88c556eaa1ae10c7d88d8e646274d7ae0))
* **ce-resolve-pr-feedback:** 为有害 suggestions 添加 declined verdict ([#694](https://github.com/EveryInc/compound-engineering-plugin/issues/694)) ([bd72818](https://github.com/EveryInc/compound-engineering-plugin/commit/bd72818609054f6d173cf141641799fa729cc668))
* **ce-work:** codify parallel subagent dispatch 的 worktree isolation ([#698](https://github.com/EveryInc/compound-engineering-plugin/issues/698)) ([053c1db](https://github.com/EveryInc/compound-engineering-plugin/commit/053c1db25511843b5967b3d04427b172ede98d25))
* **session-historian:** 限制 deep-dives、添加 keyword filter primitive，并收紧 dispatch ([#699](https://github.com/EveryInc/compound-engineering-plugin/issues/699)) ([a91270c](https://github.com/EveryInc/compound-engineering-plugin/commit/a91270ccd2d5fba3e035275b7af2c4fec3f90b1c))
* **skills:** 替换 permission check 会阻塞的 case statements ([#701](https://github.com/EveryInc/compound-engineering-plugin/issues/701)) ([5952b20](https://github.com/EveryInc/compound-engineering-plugin/commit/5952b20d7f2a056f8d7d8719a2d20b6615aca9e4))

## [3.1.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.0.7...compound-engineering-v3.1.0) (2026-04-24)


### 功能

* **ce-brainstorm:** 在 Phase 2 前用 prose 探测 rigor gaps ([#677](https://github.com/EveryInc/compound-engineering-plugin/issues/677)) ([304a975](https://github.com/EveryInc/compound-engineering-plugin/commit/304a975d02b362eac8e715e482f0118ee623da91))
* **ce-brainstorm:** 添加 product-tier，并支持 end-to-end ID traceability ([#629](https://github.com/EveryInc/compound-engineering-plugin/issues/629)) ([bd77d55](https://github.com/EveryInc/compound-engineering-plugin/commit/bd77d5550a492974a26b648df4a9dc556acb9dec))
* **ce-code-review:** 添加 Swift/iOS stack-specific reviewer persona ([#638](https://github.com/EveryInc/compound-engineering-plugin/issues/638)) ([701ae10](https://github.com/EveryInc/compound-engineering-plugin/commit/701ae10c2dfc60fa50fed11f596c61a0906b3cc4))
* **ce-commit-push-pr:** judgment 允许时跳过 evidence prompt ([#663](https://github.com/EveryInc/compound-engineering-plugin/issues/663)) ([75cf4d6](https://github.com/EveryInc/compound-engineering-plugin/commit/75cf4d603da4d2449658ddfe97b374a1f9c67362))
* **ce-debug:** 增加 environment sanity、assumption audit 和更多 techniques ([#649](https://github.com/EveryInc/compound-engineering-plugin/issues/649)) ([cce95fb](https://github.com/EveryInc/compound-engineering-plugin/commit/cce95fb814a69a1414af4bee34933cbc117d2449))
* **ce-demo-reel:** 添加 local save，作为 catbox upload 的替代方式 ([#647](https://github.com/EveryInc/compound-engineering-plugin/issues/647)) ([fdf5fe4](https://github.com/EveryInc/compound-engineering-plugin/commit/fdf5fe4af56dab1f40cbf83e2e761997bce8c939))
* **ce-ideate:** 添加 subject gate、surprise-me 和 warrant contract ([#671](https://github.com/EveryInc/compound-engineering-plugin/issues/671)) ([6514b1f](https://github.com/EveryInc/compound-engineering-plugin/commit/6514b1fce5df62582673fe7274c97a90e9aea45c))
* **ce-plan:** 向 plan template 添加 U-IDs 和 origin trace ([#632](https://github.com/EveryInc/compound-engineering-plugin/issues/632)) ([44ce9dd](https://github.com/EveryInc/compound-engineering-plugin/commit/44ce9dd127ccbc300b18051aa2bf7c718112a79c))
* **ce-proof:** 扩展 triggers 并呈现 markdown viewing ([#618](https://github.com/EveryInc/compound-engineering-plugin/issues/618)) ([e0f2a4f](https://github.com/EveryInc/compound-engineering-plugin/commit/e0f2a4f9d748124fecb41114856690f88f8fc2e9))
* **ce-setup:** 检查 ast-grep CLI 和 agent skill ([#653](https://github.com/EveryInc/compound-engineering-plugin/issues/653)) ([23dc11b](https://github.com/EveryInc/compound-engineering-plugin/commit/23dc11b95ae46dc6be0308306de5c8f16329fe49))
* **ce-test-browser:** 添加 free-port scan 和 auto-server start ([f8720da](https://github.com/EveryInc/compound-engineering-plugin/commit/f8720da3d1ba9e6d9fc161a6377f3ba83a8ab978))
* **ce-test-browser:** 只在 pipeline mode 中启用 port scan 和 auto-start ([22d493b](https://github.com/EveryInc/compound-engineering-plugin/commit/22d493b192108970a3d54378f8de2fd72ac62863))
* **codex:** 添加 native plugin install manifests 和 agents-only converter ([#616](https://github.com/EveryInc/compound-engineering-plugin/issues/616)) ([3ed4a4f](https://github.com/EveryInc/compound-engineering-plugin/commit/3ed4a4fa0f6f4d08144ae7598af391b4f070b649))
* **lfg:** 添加 ce-commit-push-pr step，并移除 ralph-loop ([1f20c38](https://github.com/EveryInc/compound-engineering-plugin/commit/1f20c3842d26a02ed8baca13eb737ca635320719))
* **pi:** 通过 pi-subagents + pi-ask-user 提供 first-class support ([#651](https://github.com/EveryInc/compound-engineering-plugin/issues/651)) ([7ddfbed](https://github.com/EveryInc/compound-engineering-plugin/commit/7ddfbed33b08e5ad0dc56a3ecc19adb9a10ebb2c))


### 修复

* **ce-brainstorm:** 在 universal flow 中强制执行 Interaction Rules ([#669](https://github.com/EveryInc/compound-engineering-plugin/issues/669)) ([494313e](https://github.com/EveryInc/compound-engineering-plugin/commit/494313e8ebf7635f18087a4091d2ba5ef98c0eba))
* **ce-debug:** 防止 handoffs 卡住，并读取完整 issue thread ([#646](https://github.com/EveryInc/compound-engineering-plugin/issues/646)) ([86d9a2c](https://github.com/EveryInc/compound-engineering-plugin/commit/86d9a2c55f49eb49dbbc3d918ce859dbe273d44e))
* **ce-demo-reel:** 防止 recorded demos 泄露 secrets ([#664](https://github.com/EveryInc/compound-engineering-plugin/issues/664)) ([9ddcd22](https://github.com/EveryInc/compound-engineering-plugin/commit/9ddcd22aee55e538d53d7d14aaf0ebebce84cae5))
* **ce-ideate:** 收紧 bug intent、surprise-me dispatch，并移除 authoring refs ([#672](https://github.com/EveryInc/compound-engineering-plugin/issues/672)) ([f0433d9](https://github.com/EveryInc/compound-engineering-plugin/commit/f0433d9150b0c62a1fd65db7ffdb08a7c45fdb7f))
* **ce-learnings-researcher:** 移除 unreadable schema path reference ([#630](https://github.com/EveryInc/compound-engineering-plugin/issues/630)) ([05ea109](https://github.com/EveryInc/compound-engineering-plugin/commit/05ea109bdb68c6f7686d7ab4f52518d9a23a903e))
* **ce-proof:** 修正 op shapes，并添加 retry/batch discipline ([#658](https://github.com/EveryInc/compound-engineering-plugin/issues/658)) ([a9fd842](https://github.com/EveryInc/compound-engineering-plugin/commit/a9fd8421f42d598e8d85c4cb50cbec0fa3d6af46))
* **ce-resolve-pr-feedback:** 停止丢弃 unresolved 和 actionable feedback ([#617](https://github.com/EveryInc/compound-engineering-plugin/issues/617)) ([153bea8](https://github.com/EveryInc/compound-engineering-plugin/commit/153bea8669d63848f57942e842cd58ed664e7435))
* **ce-test-browser:** 在 pipeline mode 中跳过 headed/headless question ([47350c3](https://github.com/EveryInc/compound-engineering-plugin/commit/47350c3e4e612fa341d8e43e4d1709ab391fbe42))
* **ce-update:** 与 main plugin.json 比较，而不是 release tags ([#660](https://github.com/EveryInc/compound-engineering-plugin/issues/660)) ([351d12e](https://github.com/EveryInc/compound-engineering-plugin/commit/351d12ec5b795bff4c5e633e9a64644f045340c6))
* **ce-update:** 从 CLAUDE_PLUGIN_ROOT parent 推导 cache dir ([#645](https://github.com/EveryInc/compound-engineering-plugin/issues/645)) ([6155b9d](https://github.com/EveryInc/compound-engineering-plugin/commit/6155b9de3c2d60ca424386f2dfcb0dfa7668f2c1))
* **ce-update:** 用 claude plugin update 替换 cache sweep ([#656](https://github.com/EveryInc/compound-engineering-plugin/issues/656)) ([b9ae6b7](https://github.com/EveryInc/compound-engineering-plugin/commit/b9ae6b758d0d538648cc4dbb09dfb0fa8c0858fb))
* **lfg:** 使用 platform-neutral skill references ([#642](https://github.com/EveryInc/compound-engineering-plugin/issues/642)) ([b104ce4](https://github.com/EveryInc/compound-engineering-plugin/commit/b104ce46bea4b1b9b0e9cfbdd9203dbc5a0aa510))
* **main:** 恢复 version drift、修复 stale test，并记录 learnings ([#678](https://github.com/EveryInc/compound-engineering-plugin/issues/678)) ([bc8ae1a](https://github.com/EveryInc/compound-engineering-plugin/commit/bc8ae1a6b5375f7fbb8120104b3222391da470bb))
* **question-tool:** 当 tool 看似不可用时停止 silent skips ([#620](https://github.com/EveryInc/compound-engineering-plugin/issues/620)) ([d359cc7](https://github.com/EveryInc/compound-engineering-plugin/commit/d359cc7e2f4dd5e920e7daa6dbd1eddc8f53bc19))
* **skills:** 将 skill descriptions 限制在 harness limit 内 ([#643](https://github.com/EveryInc/compound-engineering-plugin/issues/643)) ([13f95ba](https://github.com/EveryInc/compound-engineering-plugin/commit/13f95ba6392f86aa8dd9b4430b84f0b7523c6c89))
* **skills:** 明确 plan 是 decision artifact，progress 来自 git ([#666](https://github.com/EveryInc/compound-engineering-plugin/issues/666)) ([c33bf70](https://github.com/EveryInc/compound-engineering-plugin/commit/c33bf70f46b74979651c7229544743604b965713))

## [3.0.7] - 2026-04-24

### 修复
- **ce-test-browser:** 在 pipeline mode (`mode:pipeline`) 中完全跳过 headed/headless question；没有用户在场时，agents 曾会永久阻塞在 `AskUserQuestion`

## [3.0.6] - 2026-04-24

### 变更
- **ce-test-browser:** port scan 和 server auto-start 现在只在 pipeline mode (`mode:pipeline` / `PIPELINE_MODE=1`) 中发生；manual invocations 会按原样使用 preferred port，并要求用户自行启动 server
- **lfg:** step 6 现在会把 `mode:pipeline` 传给 `ce-test-browser`，让 parallel LFG runs 自动占用不冲突的 ports

## [3.0.5] - 2026-04-24

### 变更
- **ce-test-browser:** 启动前始终查找 free port；从 preferred port 向上扫描，让 parallel agents 不再在 3000 上冲突；如果没有 listener，会在占用的 port 上 auto-start dev server

## [3.0.4] - 2026-04-24

### 变更
- **lfg:** 将 `ce-commit-push-pr` 添加为 step 8，让完整 autonomous workflow 以 pushed branch 和 open PR 结束，而不只是 `<promise>DONE</promise>`

## [3.0.3](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.0.2...compound-engineering-v3.0.3) (2026-04-24)


### 修复

* **ce-ideate:** 收紧 bug intent、surprise-me dispatch，并移除 authoring refs ([#672](https://github.com/EveryInc/compound-engineering-plugin/issues/672)) ([f0433d9](https://github.com/EveryInc/compound-engineering-plugin/commit/f0433d9150b0c62a1fd65db7ffdb08a7c45fdb7f))

## [3.0.2](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.0.1...compound-engineering-v3.0.2) (2026-04-24)


### 功能

* **ce-commit-push-pr:** judgment 允许时跳过 evidence prompt ([#663](https://github.com/EveryInc/compound-engineering-plugin/issues/663)) ([75cf4d6](https://github.com/EveryInc/compound-engineering-plugin/commit/75cf4d603da4d2449658ddfe97b374a1f9c67362))
* **ce-ideate:** 添加 subject gate、surprise-me 和 warrant contract ([#671](https://github.com/EveryInc/compound-engineering-plugin/issues/671)) ([6514b1f](https://github.com/EveryInc/compound-engineering-plugin/commit/6514b1fce5df62582673fe7274c97a90e9aea45c))


### 修复

* **ce-brainstorm:** 在 universal flow 中强制执行 Interaction Rules ([#669](https://github.com/EveryInc/compound-engineering-plugin/issues/669)) ([494313e](https://github.com/EveryInc/compound-engineering-plugin/commit/494313e8ebf7635f18087a4091d2ba5ef98c0eba))
* **ce-demo-reel:** 防止 recorded demos 泄露 secrets ([#664](https://github.com/EveryInc/compound-engineering-plugin/issues/664)) ([9ddcd22](https://github.com/EveryInc/compound-engineering-plugin/commit/9ddcd22aee55e538d53d7d14aaf0ebebce84cae5))
* **ce-update:** 与 main plugin.json 比较，而不是 release tags ([#660](https://github.com/EveryInc/compound-engineering-plugin/issues/660)) ([351d12e](https://github.com/EveryInc/compound-engineering-plugin/commit/351d12ec5b795bff4c5e633e9a64644f045340c6))
* **skills:** 明确 plan 是 decision artifact，progress 来自 git ([#666](https://github.com/EveryInc/compound-engineering-plugin/issues/666)) ([c33bf70](https://github.com/EveryInc/compound-engineering-plugin/commit/c33bf70f46b74979651c7229544743604b965713))

## [3.0.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v3.0.0...compound-engineering-v3.0.1) (2026-04-23)


### 修复

* **ce-proof:** 修正 op shapes，并添加 retry/batch discipline ([#658](https://github.com/EveryInc/compound-engineering-plugin/issues/658)) ([a9fd842](https://github.com/EveryInc/compound-engineering-plugin/commit/a9fd8421f42d598e8d85c4cb50cbec0fa3d6af46))
* **ce-update:** 用 claude plugin update 替换 cache sweep ([#656](https://github.com/EveryInc/compound-engineering-plugin/issues/656)) ([b9ae6b7](https://github.com/EveryInc/compound-engineering-plugin/commit/b9ae6b758d0d538648cc4dbb09dfb0fa8c0858fb))

## [3.0.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.68.1...compound-engineering-v3.0.0) (2026-04-22)


### ⚠ 破坏性变更

* **cli:** 将所有 skills 和 agents 重命名为一致的 ce- prefix ([#503](https://github.com/EveryInc/compound-engineering-plugin/issues/503))

### 功能

* **ce-brainstorm:** 添加 product-tier，并支持 end-to-end ID traceability ([#629](https://github.com/EveryInc/compound-engineering-plugin/issues/629)) ([bd77d55](https://github.com/EveryInc/compound-engineering-plugin/commit/bd77d5550a492974a26b648df4a9dc556acb9dec))
* **ce-code-review:** 添加 Swift/iOS stack-specific reviewer persona ([#638](https://github.com/EveryInc/compound-engineering-plugin/issues/638)) ([701ae10](https://github.com/EveryInc/compound-engineering-plugin/commit/701ae10c2dfc60fa50fed11f596c61a0906b3cc4))
* **ce-debug:** 增加 environment sanity、assumption audit 和更多 techniques ([#649](https://github.com/EveryInc/compound-engineering-plugin/issues/649)) ([cce95fb](https://github.com/EveryInc/compound-engineering-plugin/commit/cce95fb814a69a1414af4bee34933cbc117d2449))
* **ce-demo-reel:** 添加 local save，作为 catbox upload 的替代方式 ([#647](https://github.com/EveryInc/compound-engineering-plugin/issues/647)) ([fdf5fe4](https://github.com/EveryInc/compound-engineering-plugin/commit/fdf5fe4af56dab1f40cbf83e2e761997bce8c939))
* **ce-plan:** 向 plan template 添加 U-IDs 和 origin trace ([#632](https://github.com/EveryInc/compound-engineering-plugin/issues/632)) ([44ce9dd](https://github.com/EveryInc/compound-engineering-plugin/commit/44ce9dd127ccbc300b18051aa2bf7c718112a79c))
* **ce-proof:** 扩展 triggers 并呈现 markdown viewing ([#618](https://github.com/EveryInc/compound-engineering-plugin/issues/618)) ([e0f2a4f](https://github.com/EveryInc/compound-engineering-plugin/commit/e0f2a4f9d748124fecb41114856690f88f8fc2e9))
* **ce-resolve-pr-feedback:** 去除 bot noise，并集中 test runs ([#610](https://github.com/EveryInc/compound-engineering-plugin/issues/610)) ([b35de99](https://github.com/EveryInc/compound-engineering-plugin/commit/b35de997884e9d6cf69ef19c983d9e61cf9e4bd8))
* **ce-resolve-pr-feedback:** 将 clustering 收紧为仅 cross-round ([#611](https://github.com/EveryInc/compound-engineering-plugin/issues/611)) ([2dd0a6e](https://github.com/EveryInc/compound-engineering-plugin/commit/2dd0a6e6c73abcd74c3709583e03cace63116cdf))
* **ce-review:** 向 Interactive mode 添加 per-finding judgment loop ([#590](https://github.com/EveryInc/compound-engineering-plugin/issues/590)) ([27cbaf8](https://github.com/EveryInc/compound-engineering-plugin/commit/27cbaf8161af8aad3260b58d0d9de03d6180a66c))
* **ce-setup:** 检查 ast-grep CLI 和 agent skill ([#653](https://github.com/EveryInc/compound-engineering-plugin/issues/653)) ([23dc11b](https://github.com/EveryInc/compound-engineering-plugin/commit/23dc11b95ae46dc6be0308306de5c8f16329fe49))
* **codex:** 添加 native plugin install manifests 和 agents-only converter ([#616](https://github.com/EveryInc/compound-engineering-plugin/issues/616)) ([3ed4a4f](https://github.com/EveryInc/compound-engineering-plugin/commit/3ed4a4fa0f6f4d08144ae7598af391b4f070b649))
* **doc-review, learnings-researcher:** 调整 tiers、chain grouping，并重写流程 ([#601](https://github.com/EveryInc/compound-engineering-plugin/issues/601)) ([c1f68d4](https://github.com/EveryInc/compound-engineering-plugin/commit/c1f68d4d55ebf6085eaa7c177bf5c2e7a2cfb62c))
* **pi:** 通过 pi-subagents + pi-ask-user 提供 first-class support ([#651](https://github.com/EveryInc/compound-engineering-plugin/issues/651)) ([7ddfbed](https://github.com/EveryInc/compound-engineering-plugin/commit/7ddfbed33b08e5ad0dc56a3ecc19adb9a10ebb2c))


### 修复

* **ce-compound:** 对以 reserved indicators 开头的 YAML array items 加 quote ([#613](https://github.com/EveryInc/compound-engineering-plugin/issues/613)) ([d8436b9](https://github.com/EveryInc/compound-engineering-plugin/commit/d8436b9a3c5b5370e51ec168a251ccb45f0d826e))
* **ce-debug:** 防止 handoffs 卡住，并读取完整 issue thread ([#646](https://github.com/EveryInc/compound-engineering-plugin/issues/646)) ([86d9a2c](https://github.com/EveryInc/compound-engineering-plugin/commit/86d9a2c55f49eb49dbbc3d918ce859dbe273d44e))
* **ce-gemini-imagegen:** 将 Pillow 下限提升到 10.3.0，以清除 4 个 CVEs ([#608](https://github.com/EveryInc/compound-engineering-plugin/issues/608)) ([e152428](https://github.com/EveryInc/compound-engineering-plugin/commit/e1524287f73ea1ec9598aa63c05a31745ff503c7))
* **ce-learnings-researcher:** 移除 unreadable schema path reference ([#630](https://github.com/EveryInc/compound-engineering-plugin/issues/630)) ([05ea109](https://github.com/EveryInc/compound-engineering-plugin/commit/05ea109bdb68c6f7686d7ab4f52518d9a23a903e))
* **ce-plan:** 关闭 exit gates 并尊重 user-named resources ([#597](https://github.com/EveryInc/compound-engineering-plugin/issues/597)) ([d8e87c1](https://github.com/EveryInc/compound-engineering-plugin/commit/d8e87c17907b53bead27c223c5f10c7e765d67d8))
* **ce-plan:** inline handoff menu，让 post-plan options 不再被跳过 ([#615](https://github.com/EveryInc/compound-engineering-plugin/issues/615)) ([9497a00](https://github.com/EveryInc/compound-engineering-plugin/commit/9497a00d90bdedf6d1741aa4cf1287fb139ed990))
* **ce-plan:** 在 non-software catch-all 前运行 ambiguity gate ([#598](https://github.com/EveryInc/compound-engineering-plugin/issues/598)) ([49249d7](https://github.com/EveryInc/compound-engineering-plugin/commit/49249d73170b64046a9a6ba38186d483f28047bd))
* **ce-pr-description:** 限制 description size 并添加 pre-apply preview ([#605](https://github.com/EveryInc/compound-engineering-plugin/issues/605)) ([409b07f](https://github.com/EveryInc/compound-engineering-plugin/commit/409b07fbc75148f2c149c1e66744549f5f1dcd58))
* **ce-release-notes:** 在 description 中用 backtick 包裹 `<skill-name>` token ([#603](https://github.com/EveryInc/compound-engineering-plugin/issues/603)) ([2aee4d4](https://github.com/EveryInc/compound-engineering-plugin/commit/2aee4d42031892e7937640a003d11fad82420944))
* **ce-resolve-pr-feedback:** 停止丢弃 unresolved 和 actionable feedback ([#617](https://github.com/EveryInc/compound-engineering-plugin/issues/617)) ([153bea8](https://github.com/EveryInc/compound-engineering-plugin/commit/153bea8669d63848f57942e842cd58ed664e7435))
* **ce-update:** 从 CLAUDE_PLUGIN_ROOT parent 推导 cache dir ([#645](https://github.com/EveryInc/compound-engineering-plugin/issues/645)) ([6155b9d](https://github.com/EveryInc/compound-engineering-plugin/commit/6155b9de3c2d60ca424386f2dfcb0dfa7668f2c1))
* **ce-work:** 拒绝把 plan 重新划分成 human-time phases ([#600](https://github.com/EveryInc/compound-engineering-plugin/issues/600)) ([b575e49](https://github.com/EveryInc/compound-engineering-plugin/commit/b575e49c291371b178775a2bd50dbb1cc16210f5))
* **lfg:** 使用 platform-neutral skill references ([#642](https://github.com/EveryInc/compound-engineering-plugin/issues/642)) ([b104ce4](https://github.com/EveryInc/compound-engineering-plugin/commit/b104ce46bea4b1b9b0e9cfbdd9203dbc5a0aa510))
* **question-tool:** 当 tool 看似不可用时停止 silent skips ([#620](https://github.com/EveryInc/compound-engineering-plugin/issues/620)) ([d359cc7](https://github.com/EveryInc/compound-engineering-plugin/commit/d359cc7e2f4dd5e920e7daa6dbd1eddc8f53bc19))
* **skills:** 将 skill descriptions 限制在 harness limit 内 ([#643](https://github.com/EveryInc/compound-engineering-plugin/issues/643)) ([13f95ba](https://github.com/EveryInc/compound-engineering-plugin/commit/13f95ba6392f86aa8dd9b4430b84f0b7523c6c89))


### 代码重构

* **cli:** 将所有 skills 和 agents 重命名为一致的 ce- prefix ([#503](https://github.com/EveryInc/compound-engineering-plugin/issues/503)) ([5c0ec91](https://github.com/EveryInc/compound-engineering-plugin/commit/5c0ec9137a7350534e32db91e8bad66f02693716))

## [2.68.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.68.0...compound-engineering-v2.68.1) (2026-04-18)


### 修复

* **ce-compound-refresh:** 恢复 ce:compound hand-off ([#591](https://github.com/EveryInc/compound-engineering-plugin/issues/591)) ([821c69c](https://github.com/EveryInc/compound-engineering-plugin/commit/821c69c567269ed617c56d95564f7ba1d883f364))
* **ce-pr-description:** 将 return block 标记为 hand-off ([#593](https://github.com/EveryInc/compound-engineering-plugin/issues/593)) ([cc78551](https://github.com/EveryInc/compound-engineering-plugin/commit/cc78551e7cac788d5e43efc835c040f696e5b936))
* **git-commit-push-pr:** 在 delegate hand-off 后应用 PR description ([#594](https://github.com/EveryInc/compound-engineering-plugin/issues/594)) ([1afd63c](https://github.com/EveryInc/compound-engineering-plugin/commit/1afd63cc764173368a30cbd92af704f5b7602e6d))

## [2.68.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.67.0...compound-engineering-v2.68.0) (2026-04-17)


### 功能

* **ce-ideate:** mode-aware v2 ideation 流程 ([#588](https://github.com/EveryInc/compound-engineering-plugin/issues/588)) ([12aaad3](https://github.com/EveryInc/compound-engineering-plugin/commit/12aaad31ebd17686db1a75d1d3575da79d1dad2b))
* **ce-release-notes:** 添加用于浏览 plugin release history 的 skill ([#589](https://github.com/EveryInc/compound-engineering-plugin/issues/589)) ([59dbaef](https://github.com/EveryInc/compound-engineering-plugin/commit/59dbaef37607354d103113f05c13b731eecbb690))
* **proof, ce-brainstorm, ce-plan, ce-ideate:** HITL review-loop mode 支持 ([#580](https://github.com/EveryInc/compound-engineering-plugin/issues/580)) ([e7cf0ae](https://github.com/EveryInc/compound-engineering-plugin/commit/e7cf0ae9571e260a00db458dd8e2281c37f1ec8b))

## [2.67.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.66.1...compound-engineering-v2.67.0) (2026-04-17)


### 功能

* **ce-polish-beta:** 在 /ce:review 和 merge 之间添加 human-in-the-loop polish phase ([#568](https://github.com/EveryInc/compound-engineering-plugin/issues/568)) ([070092d](https://github.com/EveryInc/compound-engineering-plugin/commit/070092d997bcc3306016e9258150d3071f017ef8))


### 修复

* **ce-plan, ce-brainstorm:** 提供可靠的 interactive handoff menus ([#575](https://github.com/EveryInc/compound-engineering-plugin/issues/575)) ([3d96c0f](https://github.com/EveryInc/compound-engineering-plugin/commit/3d96c0f074faf56fcdc835a0332e0f475dc8425f))
* **ce-pr-description:** 通过 temp file hand off PR body ([#581](https://github.com/EveryInc/compound-engineering-plugin/issues/581)) ([c89f18a](https://github.com/EveryInc/compound-engineering-plugin/commit/c89f18a1151aa289bcc293dc26ff49a011782c7b))
* **resolve-pr-feedback:** 解锁 /loop scheduling ([#582](https://github.com/EveryInc/compound-engineering-plugin/issues/582)) ([4ccadcf](https://github.com/EveryInc/compound-engineering-plugin/commit/4ccadcfd3fb3a08666aa4c808a123500bb14ac46))


### 其他维护

* **claude-permissions-optimizer:** 移除该 skill，改用 /less-permission-prompts ([#583](https://github.com/EveryInc/compound-engineering-plugin/issues/583)) ([729fa19](https://github.com/EveryInc/compound-engineering-plugin/commit/729fa191b60305d8f3761f6441d1d3d15c5f48aa))

## [2.66.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.66.0...compound-engineering-v2.66.1) (2026-04-16)


### 修复

* **ce-compound, ce-compound-refresh:** 使用 injected memory block ([#569](https://github.com/EveryInc/compound-engineering-plugin/issues/569)) ([0b3d4b2](https://github.com/EveryInc/compound-engineering-plugin/commit/0b3d4b283c8e3165931816607cf86017d8273bbe))

## [2.66.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.65.0...compound-engineering-v2.66.0) (2026-04-15)


### 功能

* **ce-optimize:** 用于调优 system prompts / vector clustering / 评估不同 code solution 等任务的 auto-research loop ([#446](https://github.com/EveryInc/compound-engineering-plugin/issues/446)) ([8f20aa0](https://github.com/EveryInc/compound-engineering-plugin/commit/8f20aa0406a7cda4ff11da45b971e38681650678))
* **ce-pr-description:** 添加专注于 PR description generation 的 skill ([#561](https://github.com/EveryInc/compound-engineering-plugin/issues/561)) ([8ec6d33](https://github.com/EveryInc/compound-engineering-plugin/commit/8ec6d339fee38cf4306e6586f726486cbae713b0))


### 修复

* **ce-plan:** 关闭会让 skill 放弃 direct invocations 的 escape hatches ([#554](https://github.com/EveryInc/compound-engineering-plugin/issues/554)) ([e4d5f24](https://github.com/EveryInc/compound-engineering-plugin/commit/e4d5f241bd3945784905a32d7fb7ef9305c621e8))
* **ce-review:** 始终 fetch base branch，防止 stale merge-base ([#544](https://github.com/EveryInc/compound-engineering-plugin/issues/544)) ([4e0ed2c](https://github.com/EveryInc/compound-engineering-plugin/commit/4e0ed2cc8ddadf6d5504210e1210728e6f7cc9aa))
* **ce-update:** 在 cache path 中使用正确的 marketplace name ([#566](https://github.com/EveryInc/compound-engineering-plugin/issues/566)) ([d8305dd](https://github.com/EveryInc/compound-engineering-plugin/commit/d8305dd159ebe9d89df9c4af5a7d0fb2b128801b))
* **ce-work,ce-work-beta:** 为 parallel subagent dispatch 添加 safety checks ([#557](https://github.com/EveryInc/compound-engineering-plugin/issues/557)) ([5cae4d1](https://github.com/EveryInc/compound-engineering-plugin/commit/5cae4d1dab212d7e438f0b081986e987c860d4d5))
* **document-review, review:** 将 reviewer agents 限制为 read-only tools ([#553](https://github.com/EveryInc/compound-engineering-plugin/issues/553)) ([e45c435](https://github.com/EveryInc/compound-engineering-plugin/commit/e45c435b996f7c0bf5ae0e23c0ab95b3fbd9204c))
* **git-commit-push-pr:** 将 descriptions 重写为 net result，而不是 changelog ([#558](https://github.com/EveryInc/compound-engineering-plugin/issues/558)) ([a559903](https://github.com/EveryInc/compound-engineering-plugin/commit/a55990387d48fa7af598880746ff862cc8f10acd))

## [2.65.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.64.0...compound-engineering-v2.65.0) (2026-04-11)


### 功能

* **ce-setup:** 添加 unified setup skill，支持 dependency management 和 config bootstrapping ([#345](https://github.com/EveryInc/compound-engineering-plugin/issues/345)) ([354dbb7](https://github.com/EveryInc/compound-engineering-plugin/commit/354dbb75828f0152f4cbbb3b50ce4511fa6710c7))


### 修复

* **ce-demo-reel:** 为 reviewable approval gate 添加 two-stage upload ([#546](https://github.com/EveryInc/compound-engineering-plugin/issues/546)) ([5454053](https://github.com/EveryInc/compound-engineering-plugin/commit/545405380dba78bc0efd35f7675e8c27d99bf8c9))
* **cleanup:** 移除 rclone、agent-browser、lint 和 bug-reproduction-validator ([#545](https://github.com/EveryInc/compound-engineering-plugin/issues/545)) ([1372b2c](https://github.com/EveryInc/compound-engineering-plugin/commit/1372b2cffd06989dee8eb9df26d7c94ac30f032a))

## [2.64.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.63.1...compound-engineering-v2.64.0) (2026-04-10)


### 功能

* **ce-debug:** 添加 systematic debugging skill ([#543](https://github.com/EveryInc/compound-engineering-plugin/issues/543)) ([e38223a](https://github.com/EveryInc/compound-engineering-plugin/commit/e38223ae91921ebacabd10ff7cd1105ba3c10b25))
* **ce-demo-reel:** 添加带 Python capture pipeline 的 demo reel skill ([#541](https://github.com/EveryInc/compound-engineering-plugin/issues/541)) ([b979143](https://github.com/EveryInc/compound-engineering-plugin/commit/b979143ad0460a985dd224e7f1858416d79551fb))
* **ce-plan:** 添加 output structure 和 scope sub-categorization ([#542](https://github.com/EveryInc/compound-engineering-plugin/issues/542)) ([f3cc754](https://github.com/EveryInc/compound-engineering-plugin/commit/f3cc7545e5eca0c3774b2803fa5515ff98a8fc1e))
* **ce-review:** 添加 compact returns，以在 merge 期间减少 orchestrator context ([#535](https://github.com/EveryInc/compound-engineering-plugin/issues/535)) ([a5ce094](https://github.com/EveryInc/compound-engineering-plugin/commit/a5ce09477291766ffc03e0ae4e9e1e0f80560c2b))
* **ce-update:** 添加 plugin version check skill 和 ce_platforms filtering ([#532](https://github.com/EveryInc/compound-engineering-plugin/issues/532)) ([d37f0ed](https://github.com/EveryInc/compound-engineering-plugin/commit/d37f0ed16f94aaec2a7b435a0aaa018de5631ed3))
* **ce-work-beta:** 添加 beta Codex delegation mode ([#476](https://github.com/EveryInc/compound-engineering-plugin/issues/476)) ([31b0686](https://github.com/EveryInc/compound-engineering-plugin/commit/31b0686c2e88808381560314f10ce276c86e11e2))
* **ce-work:** 通过抽取 late-sequence references 降低 token usage ([#540](https://github.com/EveryInc/compound-engineering-plugin/issues/540)) ([bb59547](https://github.com/EveryInc/compound-engineering-plugin/commit/bb59547a2efdd4e7213c149f51abd9c9a17016dd))
* **session-historian:** 添加 cross-platform session history agent 和 /ce-sessions skill ([#534](https://github.com/EveryInc/compound-engineering-plugin/issues/534)) ([3208ec7](https://github.com/EveryInc/compound-engineering-plugin/commit/3208ec71f8f2209abc76baf97e3967406755317d))
* **slack-researcher:** 添加 /ce-slack-research skill 并改进 agent ([#538](https://github.com/EveryInc/compound-engineering-plugin/issues/538)) ([042ee73](https://github.com/EveryInc/compound-engineering-plugin/commit/042ee732398d1f41b9b91953569a54e40303332d))


### 修复

* **ce-compound:** 添加 explicit mode prompt，并做 lightweight rename ([#528](https://github.com/EveryInc/compound-engineering-plugin/issues/528)) ([0ae91dc](https://github.com/EveryInc/compound-engineering-plugin/commit/0ae91dcc298721e5b2c4ab6d1fc6f76a13b6f67c))
* **git-commit-push-pr:** 从 badge table 移除 harness slug ([#539](https://github.com/EveryInc/compound-engineering-plugin/issues/539)) ([044a035](https://github.com/EveryInc/compound-engineering-plugin/commit/044a035e77298c4b8d2152ac2cba36fc00f5b99a))

## [2.63.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.63.0...compound-engineering-v2.63.1) (2026-04-07)


### 修复

* **ce-review:** 向 reviewer subagent template 添加 recursion guard ([#527](https://github.com/EveryInc/compound-engineering-plugin/issues/527)) ([bafe9f0](https://github.com/EveryInc/compound-engineering-plugin/commit/bafe9f0968054c78db23e7e7f4d5dbc2ddb4a450))
* **document-review:** 将 autofix classification 扩展到 trivial fixes 之外 ([#524](https://github.com/EveryInc/compound-engineering-plugin/issues/524)) ([9a82222](https://github.com/EveryInc/compound-engineering-plugin/commit/9a82222aba25d6e64355053fca5954f3dfbd8285))

## [2.63.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.62.1...compound-engineering-v2.63.0) (2026-04-06)


### 功能

* **ce-plan,ce-brainstorm:** 为 non-software tasks 添加 universal planning 和 brainstorming ([#519](https://github.com/EveryInc/compound-engineering-plugin/issues/519)) ([320a045](https://github.com/EveryInc/compound-engineering-plugin/commit/320a04524142830a40a44bd72c4bf5d30931221c))
* **slack-researcher:** 添加 Slack organizational context research agent ([#495](https://github.com/EveryInc/compound-engineering-plugin/issues/495)) ([b3960ec](https://github.com/EveryInc/compound-engineering-plugin/commit/b3960ec64b212d1c8f3885370762e0f124354c28))


### 修复

* **document-review:** 向 reviewer subagent template 添加 recursion guard ([#523](https://github.com/EveryInc/compound-engineering-plugin/issues/523)) ([36d8119](https://github.com/EveryInc/compound-engineering-plugin/commit/36d811916637b3436aafd548319e077b6248bae3))
* **review,work:** 在 subagent dispatch 中省略 mode parameter，以尊重 user permissions ([#522](https://github.com/EveryInc/compound-engineering-plugin/issues/522)) ([949bdef](https://github.com/EveryInc/compound-engineering-plugin/commit/949bdef909ea71e9c5b885e31c028809f0f25017))
* **slack-researcher:** 将 Slack research 改为 opt-in，并 surface workspace identity ([#521](https://github.com/EveryInc/compound-engineering-plugin/issues/521)) ([6f9069d](https://github.com/EveryInc/compound-engineering-plugin/commit/6f9069df7ac3551677f8f7a1cd7ad51946f88847))

## [2.62.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.62.0...compound-engineering-v2.62.1) (2026-04-05)


### 修复

* **ce-brainstorm:** 通过抽取 late-sequence content 降低 token cost ([#511](https://github.com/EveryInc/compound-engineering-plugin/issues/511)) ([bdeb793](https://github.com/EveryInc/compound-engineering-plugin/commit/bdeb7935fcdb147b73107177769c2e968463d93f))
* **ce-ideate,ce-review:** 降低 token cost 和 latency ([#515](https://github.com/EveryInc/compound-engineering-plugin/issues/515)) ([f4e0904](https://github.com/EveryInc/compound-engineering-plugin/commit/f4e09044ba4073f9447d783bfb7a72326ff7bf6b))
* **document-review:** 将 pattern-resolved findings 提升为 auto ([#507](https://github.com/EveryInc/compound-engineering-plugin/issues/507)) ([b223e39](https://github.com/EveryInc/compound-engineering-plugin/commit/b223e39a6374566fcc4ae269811d62a2e97c4827))
* **document-review:** 降低 token cost 和 latency ([#509](https://github.com/EveryInc/compound-engineering-plugin/issues/509)) ([9da73a6](https://github.com/EveryInc/compound-engineering-plugin/commit/9da73a60919bfc025efc2ca8b4000c45a7a27b42))
* **git-commit-push-pr:** 简化 PR probe pre-resolution ([#513](https://github.com/EveryInc/compound-engineering-plugin/issues/513)) ([f6544eb](https://github.com/EveryInc/compound-engineering-plugin/commit/f6544eba0e6851b8772bb9920583ffda5c80cccc))

## [2.62.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.61.0...compound-engineering-v2.62.0) (2026-04-03)


### 功能

* **ce-plan:** 通过抽取 conditional references 降低 token usage ([#489](https://github.com/EveryInc/compound-engineering-plugin/issues/489)) ([fd562a0](https://github.com/EveryInc/compound-engineering-plugin/commit/fd562a0d0255d203d40fd53bb10d03a284a3c0e5))
* **git-commit-push-pr:** pre-resolve context 以减少 bash calls ([#488](https://github.com/EveryInc/compound-engineering-plugin/issues/488)) ([bbd4f6d](https://github.com/EveryInc/compound-engineering-plugin/commit/bbd4f6de56963fc3cdb3131773d7e29d523ce549))


### 修复

* **agents:** 移除会导致 recursive self-invocation 的 self-referencing example blocks ([#496](https://github.com/EveryInc/compound-engineering-plugin/issues/496)) ([2c90aeb](https://github.com/EveryInc/compound-engineering-plugin/commit/2c90aebe3b14af996859df7d0c3a45a8f060d9a9))
* **ce-compound:** 添加 stack-aware reviewer routing，并移除 phantom agents ([#497](https://github.com/EveryInc/compound-engineering-plugin/issues/497)) ([1fc075d](https://github.com/EveryInc/compound-engineering-plugin/commit/1fc075d4cae199904464d43096d01111c365d02d))
* **git-commit-push-pr:** 从 PR descriptions 中过滤 fix-up commits ([#484](https://github.com/EveryInc/compound-engineering-plugin/issues/484)) ([428f4fd](https://github.com/EveryInc/compound-engineering-plugin/commit/428f4fd548926b104a0ee617b02f9ce8b8e8d5e5))
* **mcp:** 移除 bundled context7 MCP server ([#486](https://github.com/EveryInc/compound-engineering-plugin/issues/486)) ([afdd9d4](https://github.com/EveryInc/compound-engineering-plugin/commit/afdd9d44651f834b1eed0b20e401ffbef5c8cd41))
* **resolve-pr-feedback:** 将 PR comment text 视为 untrusted input ([#490](https://github.com/EveryInc/compound-engineering-plugin/issues/490)) ([1847242](https://github.com/EveryInc/compound-engineering-plugin/commit/184724276a54dfc5b5fbe01f07e381b9163e8f24))

## [2.61.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.60.0...compound-engineering-v2.61.0) (2026-04-01)


### 功能

* **cli-readiness-reviewer:** 添加用于 CLI agent readiness 的 conditional review persona ([#471](https://github.com/EveryInc/compound-engineering-plugin/issues/471)) ([c56c766](https://github.com/EveryInc/compound-engineering-plugin/commit/c56c7667dfe45cfd149cf2fbfeddb35e96f8d559))
* **product-lens-reviewer:** 添加 domain-agnostic activation criteria 和 strategic consequences ([#481](https://github.com/EveryInc/compound-engineering-plugin/issues/481)) ([804d78f](https://github.com/EveryInc/compound-engineering-plugin/commit/804d78fc8463be8101719b263d1f5ef0480755a6))
* **resolve-pr-feedback:** 添加 cross-invocation cluster analysis ([#480](https://github.com/EveryInc/compound-engineering-plugin/issues/480)) ([7b8265b](https://github.com/EveryInc/compound-engineering-plugin/commit/7b8265bd81410b28a4160657a7c6ac0d7f1f1cb2))


### 修复

* **ce-plan, ce-brainstorm:** 在 generated documents 中强制使用 repo-relative paths ([#473](https://github.com/EveryInc/compound-engineering-plugin/issues/473)) ([33a8d9d](https://github.com/EveryInc/compound-engineering-plugin/commit/33a8d9dc118a53a35cd15e0e6e44b3592f58ac4f))

## [2.60.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.59.0...compound-engineering-v2.60.0) (2026-03-31)


### 功能

* **ce-brainstorm:** 向 requirements documents 添加 conditional visual aids ([#437](https://github.com/EveryInc/compound-engineering-plugin/issues/437)) ([bd02ca7](https://github.com/EveryInc/compound-engineering-plugin/commit/bd02ca7df04cf2c1c6301de3774e99d283d3d3ca))
* **ce-compound:** 在 instruction files 中添加 `docs/solutions/` discoverability check ([#456](https://github.com/EveryInc/compound-engineering-plugin/issues/456)) ([5ac8a2c](https://github.com/EveryInc/compound-engineering-plugin/commit/5ac8a2c2c8c258458307e476d6693cc387deb27e))
* **ce-compound:** 添加用于 bug vs knowledge learnings 的 track-based schema ([#445](https://github.com/EveryInc/compound-engineering-plugin/issues/445)) ([739109c](https://github.com/EveryInc/compound-engineering-plugin/commit/739109c03ccd45474331625f35730924d17f63ef))
* **ce-plan:** 向 plan documents 添加 conditional visual aids ([#440](https://github.com/EveryInc/compound-engineering-plugin/issues/440)) ([4c7f51f](https://github.com/EveryInc/compound-engineering-plugin/commit/4c7f51f35bae56dd9c9dc2653372910c39b8b504))
* **ce-plan:** 添加用于 on-demand plan strengthening 的 interactive deepening mode ([#443](https://github.com/EveryInc/compound-engineering-plugin/issues/443)) ([ca78057](https://github.com/EveryInc/compound-engineering-plugin/commit/ca78057241ec64f36c562e3720a388420bdb347f))
* **ce-review:** 强制 table format、要求 question tool，并修复 autofix_class calibration ([#454](https://github.com/EveryInc/compound-engineering-plugin/issues/454)) ([847ce3f](https://github.com/EveryInc/compound-engineering-plugin/commit/847ce3f156a5cdf75667d9802e95d68e6b3c53a4))
* **ce-review:** 通过 confidence rubric、FP suppression 和 intent verification 改善 signal-to-noise ([#434](https://github.com/EveryInc/compound-engineering-plugin/issues/434)) ([03f5aa6](https://github.com/EveryInc/compound-engineering-plugin/commit/03f5aa65b098e2ab8e25670594e0f554ea3cafbe))
* **ce-work:** worktree name 无意义时建议 branch rename ([#451](https://github.com/EveryInc/compound-engineering-plugin/issues/451)) ([e872e15](https://github.com/EveryInc/compound-engineering-plugin/commit/e872e15efa5514dcfea84a1a9e276bad3290cbc3))
* **cli-agent-readiness-reviewer:** 添加 smart output defaults criterion ([#448](https://github.com/EveryInc/compound-engineering-plugin/issues/448)) ([a01a8aa](https://github.com/EveryInc/compound-engineering-plugin/commit/a01a8aa0d29474c031a5b403f4f9bfc42a23ad78))
* **git-commit-push-pr:** 向 PR descriptions 添加 conditional visual aids ([#444](https://github.com/EveryInc/compound-engineering-plugin/issues/444)) ([44e3e77](https://github.com/EveryInc/compound-engineering-plugin/commit/44e3e77dc039d31a86194b0254e4e92839d9d5e9))
* **git-commit-push-pr:** 通过 skill preprocessing 预计算 shield badge version ([#464](https://github.com/EveryInc/compound-engineering-plugin/issues/464)) ([6ca7aef](https://github.com/EveryInc/compound-engineering-plugin/commit/6ca7aef7f33ebdf29f579cb4342c209d2bd40aad))
* **resolve-pr-feedback:** 添加 gated feedback clustering，以检测 systemic issues ([#441](https://github.com/EveryInc/compound-engineering-plugin/issues/441)) ([a301a08](https://github.com/EveryInc/compound-engineering-plugin/commit/a301a082057494e122294f4e7c1c3f5f87103f35))
* **skills:** 清理 ce:* skills 中的 argument-hint ([#436](https://github.com/EveryInc/compound-engineering-plugin/issues/436)) ([d2b24e0](https://github.com/EveryInc/compound-engineering-plugin/commit/d2b24e07f6f2fde11cac65258cb1e76927238b5d))
* **test-xcode:** 向 skill description 添加 triggering context ([#466](https://github.com/EveryInc/compound-engineering-plugin/issues/466)) ([87facd0](https://github.com/EveryInc/compound-engineering-plugin/commit/87facd05dac94603780d75acb9da381dd7c61f1b))
* **testing:** 关闭 ce:work、ce:plan 和 testing-reviewer 中的 testing gap ([#438](https://github.com/EveryInc/compound-engineering-plugin/issues/438)) ([35678b8](https://github.com/EveryInc/compound-engineering-plugin/commit/35678b8add6a603cf9939564bcd2df6b83338c52))


### 修复

* **ce-brainstorm:** 在 Phase 1.1 中区分 verification 和 technical design ([#465](https://github.com/EveryInc/compound-engineering-plugin/issues/465)) ([8ec31d7](https://github.com/EveryInc/compound-engineering-plugin/commit/8ec31d703fc9ed19bf6377da0a9a29da935b719d))
* **ce-compound:** 对 "What's next?" prompt 要求 question tool ([#460](https://github.com/EveryInc/compound-engineering-plugin/issues/460)) ([9bf3b07](https://github.com/EveryInc/compound-engineering-plugin/commit/9bf3b07185a4aeb6490116edec48599b736dc86f))
* **ce-plan:** 强化 auto deepening 后 mandatory document-review 的要求 ([#450](https://github.com/EveryInc/compound-engineering-plugin/issues/450)) ([42fa8c3](https://github.com/EveryInc/compound-engineering-plugin/commit/42fa8c3e084db464ee0e04673f7c38cd422b32d6))
* **ce-plan:** 将 confidence-gate pass 路由到 document-review ([#462](https://github.com/EveryInc/compound-engineering-plugin/issues/462)) ([1962f54](https://github.com/EveryInc/compound-engineering-plugin/commit/1962f546b5e5288c7ce5d8658f942faf71651c81))
* **ce-work:** 默认强制调用 code review ([#453](https://github.com/EveryInc/compound-engineering-plugin/issues/453)) ([7f3aba2](https://github.com/EveryInc/compound-engineering-plugin/commit/7f3aba29e84c3166de75438d554455a71f4f3c22))
* **document-review:** 在 Phase 5 menu 中展示 contextual next-step ([#459](https://github.com/EveryInc/compound-engineering-plugin/issues/459)) ([2b7283d](https://github.com/EveryInc/compound-engineering-plugin/commit/2b7283da7b48dc073670c5f4d116e58255f0ffcb))
* **git-commit-push-pr:** 静默处理预期内的 no-pr gh exit ([#439](https://github.com/EveryInc/compound-engineering-plugin/issues/439)) ([1f49948](https://github.com/EveryInc/compound-engineering-plugin/commit/1f499482bc65456fa7dd0f73fb7f2fa58a4c5910))
* **resolve-pr-feedback:** 添加 actionability filter，并将 cluster gate 降到 3+ ([#461](https://github.com/EveryInc/compound-engineering-plugin/issues/461)) ([2619ad9](https://github.com/EveryInc/compound-engineering-plugin/commit/2619ad9f58e6c45968ec10d7f8aa7849fe43eb25))
* **review:** 加固 ce-review base resolution ([#452](https://github.com/EveryInc/compound-engineering-plugin/issues/452)) ([638b38a](https://github.com/EveryInc/compound-engineering-plugin/commit/638b38abd267d415ad2d6b72eba3dfe12beefad9))

## [2.59.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.58.1...compound-engineering-v2.59.0) (2026-03-29)


### 功能

* **ce-review:** 为 programmatic callers 添加 headless mode ([#430](https://github.com/EveryInc/compound-engineering-plugin/issues/430)) ([3706a97](https://github.com/EveryInc/compound-engineering-plugin/commit/3706a9764b6e73b7a155771956646ddef73f04a5))
* **ce-work:** 接受 bare prompts 并添加 test discovery ([#423](https://github.com/EveryInc/compound-engineering-plugin/issues/423)) ([6dabae6](https://github.com/EveryInc/compound-engineering-plugin/commit/6dabae6683fb2c37dc47616f172835eacc105d11))
* **document-review:** 将 batch_confirm tier 合并到 auto ([#432](https://github.com/EveryInc/compound-engineering-plugin/issues/432)) ([0f5715d](https://github.com/EveryInc/compound-engineering-plugin/commit/0f5715d562fffc626ddfde7bd0e1652143710a44))
* **review:** 让 review 在 pipeline skills 中成为 mandatory ([#433](https://github.com/EveryInc/compound-engineering-plugin/issues/433)) ([9caaf07](https://github.com/EveryInc/compound-engineering-plugin/commit/9caaf071d9b74fd938567542167768f6cdb7a56f))

## [2.58.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.58.0...compound-engineering-v2.58.1) (2026-03-28)


### 其他维护

* **compound-engineering:** 同步 compound-engineering versions

## [2.57.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.56.1...compound-engineering-v2.57.0) (2026-03-28)


### 功能

* **document-review:** 为 programmatic callers 添加 headless mode ([#425](https://github.com/EveryInc/compound-engineering-plugin/issues/425)) ([4e4a656](https://github.com/EveryInc/compound-engineering-plugin/commit/4e4a6563b4aa7375e9d1c54bd73442f3b675f100))

## [2.56.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.56.0...compound-engineering-v2.56.1) (2026-03-28)


### 修复

* **onboarding:** 用 skip rule 解决 section count contradiction ([#421](https://github.com/EveryInc/compound-engineering-plugin/issues/421)) ([d2436e7](https://github.com/EveryInc/compound-engineering-plugin/commit/d2436e7c933129784c67799a5b9555bccce2e46d))

## [2.56.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.55.0...compound-engineering-v2.56.0) (2026-03-28)


### 功能

* **ce-plan:** 添加 decision matrix form、unchanged invariants 和 risk table format ([#417](https://github.com/EveryInc/compound-engineering-plugin/issues/417)) ([ccb371e](https://github.com/EveryInc/compound-engineering-plugin/commit/ccb371e0b7917420f5ca2c58433f5fc057211f04))


### 修复

* **cli-agent-readiness-reviewer:** 移除 improvements 的 top-5 cap ([#419](https://github.com/EveryInc/compound-engineering-plugin/issues/419)) ([16eb8b6](https://github.com/EveryInc/compound-engineering-plugin/commit/16eb8b660790f8de820d0fba709316c7270703c1))
* **document-review:** 强制 interactive questions 并修复 autofix classification ([#415](https://github.com/EveryInc/compound-engineering-plugin/issues/415)) ([d447296](https://github.com/EveryInc/compound-engineering-plugin/commit/d44729603da0c73d4959c372fac0198125a39c60))

## [2.55.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.54.1...compound-engineering-v2.55.0) (2026-03-27)


### 功能

* 添加用于 code 和 documents 的 adversarial review agents ([#403](https://github.com/EveryInc/compound-engineering-plugin/issues/403)) ([5e6cd5c](https://github.com/EveryInc/compound-engineering-plugin/commit/5e6cd5c90950588fb9b0bc3a5cbecba2a1387080))
* 添加 CLI agent-readiness reviewer 和 principles guide ([#391](https://github.com/EveryInc/compound-engineering-plugin/issues/391)) ([13aa3fa](https://github.com/EveryInc/compound-engineering-plugin/commit/13aa3fa8465dce6c037e1bb8982a2edad13f199a))
* 添加 project-standards-reviewer，作为 always-on ce:review persona ([#402](https://github.com/EveryInc/compound-engineering-plugin/issues/402)) ([b30288c](https://github.com/EveryInc/compound-engineering-plugin/commit/b30288c44e500013afe30b34f744af57cae117db))
* **ce-brainstorm:** 按 logical concern 对 requirements 分组，并收紧 autofix classification ([#412](https://github.com/EveryInc/compound-engineering-plugin/issues/412)) ([90684c4](https://github.com/EveryInc/compound-engineering-plugin/commit/90684c4e8272b41c098ef2452c40d86d460ea578))
* **ce-plan:** 在 plan 和 work skills 中强化 test scenario guidance ([#410](https://github.com/EveryInc/compound-engineering-plugin/issues/410)) ([615ec5d](https://github.com/EveryInc/compound-engineering-plugin/commit/615ec5d3feb14785530bbfe2b4a50afe29ccbc47))
* **ce-review:** 添加 base: 和 plan: arguments，并抽取 scope detection ([#405](https://github.com/EveryInc/compound-engineering-plugin/issues/405)) ([914f9b0](https://github.com/EveryInc/compound-engineering-plugin/commit/914f9b0d9822786d9ba6dc2307a543ae5a25c6e9))
* **document-review:** 添加 smarter autofix、batch-confirm 和 error/omission classification ([#401](https://github.com/EveryInc/compound-engineering-plugin/issues/401)) ([0863cfa](https://github.com/EveryInc/compound-engineering-plugin/commit/0863cfa4cbebcd121b0757abf374e5095d42f989))
* **onboarding:** 添加 consumer perspective 并拆分 architecture diagrams ([#413](https://github.com/EveryInc/compound-engineering-plugin/issues/413)) ([31326a5](https://github.com/EveryInc/compound-engineering-plugin/commit/31326a54584a12c473944fa488bea26410fd6fce))


### 修复

* 为 plugin frontmatter 添加 strict YAML validation ([#399](https://github.com/EveryInc/compound-engineering-plugin/issues/399)) ([0877b69](https://github.com/EveryInc/compound-engineering-plugin/commit/0877b693ced341cec699ea959dc39f8bd78f33ef))
* 将 compound-docs 合并到 ce-compound skill ([#390](https://github.com/EveryInc/compound-engineering-plugin/issues/390)) ([daddb7d](https://github.com/EveryInc/compound-engineering-plugin/commit/daddb7d72f280a3bd9645c54d091844c198a324d))
* 在 test-xcode skill 中记录 SwiftUI Text link tap limitation ([#400](https://github.com/EveryInc/compound-engineering-plugin/issues/400)) ([6ddaec3](https://github.com/EveryInc/compound-engineering-plugin/commit/6ddaec3b6ed5b6a91aeaddadff3960714ef10dc1))
* 通过更好的 state handling 加固 git workflow skills ([#406](https://github.com/EveryInc/compound-engineering-plugin/issues/406)) ([f83305e](https://github.com/EveryInc/compound-engineering-plugin/commit/f83305e22af09c37f452cf723c1b08bb0e7c8bdf))
* 通过 triage、prioritization 和 stack-aware search 改进 agent-native-reviewer ([#387](https://github.com/EveryInc/compound-engineering-plugin/issues/387)) ([e792166](https://github.com/EveryInc/compound-engineering-plugin/commit/e7921660ad42db8e9af56ec36f36ce8d1af13238))
* 替换 skills 中失效的 markdown link refs ([#392](https://github.com/EveryInc/compound-engineering-plugin/issues/392)) ([506ad01](https://github.com/EveryInc/compound-engineering-plugin/commit/506ad01b4f056b0d8d0d440bfb7821f050aba156))

## [2.54.1](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.54.0...compound-engineering-v2.54.1) (2026-03-26)


### 修复

* 防止 PR descriptions 中出现 orphaned opening paragraphs ([#393](https://github.com/EveryInc/compound-engineering-plugin/issues/393)) ([4b44a94](https://github.com/EveryInc/compound-engineering-plugin/commit/4b44a94e23c8621771b8813caebce78060a61611))

## [2.54.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.53.0...compound-engineering-v2.54.0) (2026-03-26)


### 功能

* 添加新的 `onboarding` skill，用于为 repo 创建 onboarding guide ([#384](https://github.com/EveryInc/compound-engineering-plugin/issues/384)) ([27b9831](https://github.com/EveryInc/compound-engineering-plugin/commit/27b9831084d69c4c8cf13d0a45c901268420de59))
* 用 ce:review delegation 替换 manual review agent config ([#381](https://github.com/EveryInc/compound-engineering-plugin/issues/381)) ([fed9fd6](https://github.com/EveryInc/compound-engineering-plugin/commit/fed9fd68db283c64ec11293f88a8ad7a6373e2fe))


### 修复

* 向 commit skills 添加 default-branch guard ([#386](https://github.com/EveryInc/compound-engineering-plugin/issues/386)) ([31f07c0](https://github.com/EveryInc/compound-engineering-plugin/commit/31f07c00473e9d8bd6d447cf04081c0a9631e34a))
* 将 commit-push-pr descriptions 限定到 full branch diff ([#385](https://github.com/EveryInc/compound-engineering-plugin/issues/385)) ([355e739](https://github.com/EveryInc/compound-engineering-plugin/commit/355e7392b21a28c8725f87a8f9c473a86543ce4a))

## [2.53.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.52.0...compound-engineering-v2.53.0) (2026-03-25)


### 功能

* 添加 git commit 和 branch helper skills ([#378](https://github.com/EveryInc/compound-engineering-plugin/issues/378)) ([fe08af2](https://github.com/EveryInc/compound-engineering-plugin/commit/fe08af2b417b707b6d3192a954af7ff2ab0fe667))
* 改进 `resolve-pr-feedback` skill ([#379](https://github.com/EveryInc/compound-engineering-plugin/issues/379)) ([2ba4f3f](https://github.com/EveryInc/compound-engineering-plugin/commit/2ba4f3fd58d4e57dfc6c314c2992c18ba1fb164b))
* 用 net-result focus 和 badging 改进 commit-push-pr skill ([#380](https://github.com/EveryInc/compound-engineering-plugin/issues/380)) ([efa798c](https://github.com/EveryInc/compound-engineering-plugin/commit/efa798c52cb9d62e9ef32283227a8df68278ff3a))
* 将 orphaned stack-specific reviewers 集成到 ce:review ([#375](https://github.com/EveryInc/compound-engineering-plugin/issues/375)) ([ce9016f](https://github.com/EveryInc/compound-engineering-plugin/commit/ce9016fac5fde9a52753cf94a4903088f05aeece))


### 修复

* 防护 CONTEXTUAL_RISK_FLAGS lookup，避免 prototype pollution ([#377](https://github.com/EveryInc/compound-engineering-plugin/issues/377)) ([8ebc77b](https://github.com/EveryInc/compound-engineering-plugin/commit/8ebc77b8e6c71e5bef40fcded9131c4457a387d7))

## [2.52.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.51.0...compound-engineering-v2.52.0) (2026-03-25)


### 功能

* 向 `ce:compound` 和 `ce:compound-refresh` skills 添加 consolidation support 和 overlap detection ([#372](https://github.com/EveryInc/compound-engineering-plugin/issues/372)) ([fe27f85](https://github.com/EveryInc/compound-engineering-plugin/commit/fe27f85810268a8e713ef2c921f0aec1baf771d7))
* 优化 `ce:compound` 的 speed 和 effectiveness ([#370](https://github.com/EveryInc/compound-engineering-plugin/issues/370)) ([4e3af07](https://github.com/EveryInc/compound-engineering-plugin/commit/4e3af079623ae678b9a79fab5d1726d78f242ec2))
* 将 `ce:review-beta` promote 为 stable `ce:review` ([#371](https://github.com/EveryInc/compound-engineering-plugin/issues/371)) ([7c5ff44](https://github.com/EveryInc/compound-engineering-plugin/commit/7c5ff445e3065fd13e00bcd57041f6c35b36f90b))
* rationalize todo skill names 并优化 skills ([#368](https://github.com/EveryInc/compound-engineering-plugin/issues/368)) ([2612ed6](https://github.com/EveryInc/compound-engineering-plugin/commit/2612ed6b3d86364c74dc024e4ce35dde63fefbf6))

## [2.51.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.50.0...compound-engineering-v2.51.0) (2026-03-24)


### 功能

* 添加带 structured persona pipeline 的 `ce:review-beta` ([#348](https://github.com/EveryInc/compound-engineering-plugin/issues/348)) ([e932276](https://github.com/EveryInc/compound-engineering-plugin/commit/e9322768664e194521894fe770b87c7dabbb8a22))
* 将 ce:plan-beta 和 deepen-plan-beta promote 为 stable ([#355](https://github.com/EveryInc/compound-engineering-plugin/issues/355)) ([169996a](https://github.com/EveryInc/compound-engineering-plugin/commit/169996a75e98a29db9e07b87b0911cc80270f732))
* 用 persona-based review 重设计 `document-review` skill ([#359](https://github.com/EveryInc/compound-engineering-plugin/issues/359)) ([18d22af](https://github.com/EveryInc/compound-engineering-plugin/commit/18d22afde2ae08a50c94efe7493775bc97d9a45a))

## [2.50.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.49.0...compound-engineering-v2.50.0) (2026-03-23)


### 功能

* **ce-work:** 添加 Codex delegation mode ([#328](https://github.com/EveryInc/compound-engineering-plugin/issues/328)) ([341c379](https://github.com/EveryInc/compound-engineering-plugin/commit/341c37916861c8bf413244de72f83b93b506575f))
* 用 GitHub native video upload 改进 `feature-video` skill ([#344](https://github.com/EveryInc/compound-engineering-plugin/issues/344)) ([4aa50e1](https://github.com/EveryInc/compound-engineering-plugin/commit/4aa50e1bada07e90f36282accb3cd81134e706cd))
* 用 layered architecture 和 visual verification 重写 `frontend-design` skill ([#343](https://github.com/EveryInc/compound-engineering-plugin/issues/343)) ([423e692](https://github.com/EveryInc/compound-engineering-plugin/commit/423e69272619e9e3c14750f5219cbf38684b6c96))


### 修复

* 为 frontend-design skill description 加 quote ([#353](https://github.com/EveryInc/compound-engineering-plugin/issues/353)) ([86342db](https://github.com/EveryInc/compound-engineering-plugin/commit/86342db36c0d09b65afe11241e095dda2ad2cdb0))

## [2.49.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.48.0...compound-engineering-v2.49.0) (2026-03-22)


### 功能

* 向 parallel skills 添加 execution mode toggle 和 context pressure bounds ([#336](https://github.com/EveryInc/compound-engineering-plugin/issues/336)) ([216d6df](https://github.com/EveryInc/compound-engineering-plugin/commit/216d6dfb2c9320c3354f8c9f30e831fca74865cd))
* 修复所有 targets 的 skill transformation pipeline ([#334](https://github.com/EveryInc/compound-engineering-plugin/issues/334)) ([4087e1d](https://github.com/EveryInc/compound-engineering-plugin/commit/4087e1df82138f462a64542831224e2718afafa7))
* 改进 reproduce-bug skill、同步 agent-browser，并清理 redundant skills ([#333](https://github.com/EveryInc/compound-engineering-plugin/issues/333)) ([affba1a](https://github.com/EveryInc/compound-engineering-plugin/commit/affba1a6a0d9320b529d429ad06fd5a3b5200bd8))

## [2.48.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.47.0...compound-engineering-v2.48.0) (2026-03-22)


### 功能

* **git-worktree:** 在 new worktrees 中 auto-trust mise 和 direnv configs ([#312](https://github.com/EveryInc/compound-engineering-plugin/issues/312)) ([cfbfb67](https://github.com/EveryInc/compound-engineering-plugin/commit/cfbfb6710a846419cc07ad17d9dbb5b5a065801c))
* 让 skills 在 coding agents 之间 platform-agnostic ([#330](https://github.com/EveryInc/compound-engineering-plugin/issues/330)) ([52df90a](https://github.com/EveryInc/compound-engineering-plugin/commit/52df90a16688ee023bbdb203969adcc45d7d2ba2))

## [2.47.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.46.0...compound-engineering-v2.47.0) (2026-03-20)


### 功能

* 通过添加 structured technology scan 改进 `repo-research-analyst` ([#327](https://github.com/EveryInc/compound-engineering-plugin/issues/327)) ([1c28d03](https://github.com/EveryInc/compound-engineering-plugin/commit/1c28d0321401ad50a51989f5e6293d773ac1a477))


### 修复

* **skills:** 在 lfg/slfg 中将 ralph-wiggum references 更新为 ralph-loop ([#324](https://github.com/EveryInc/compound-engineering-plugin/issues/324)) ([ac756a2](https://github.com/EveryInc/compound-engineering-plugin/commit/ac756a267c5e3d5e4ceb2f99939dbb93491ac4d2))

## [2.46.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.45.0...compound-engineering-v2.46.0) (2026-03-20)


### 功能

* 向 plan-beta skills 添加 optional high-level technical design ([#322](https://github.com/EveryInc/compound-engineering-plugin/issues/322)) ([3ba4935](https://github.com/EveryInc/compound-engineering-plugin/commit/3ba4935926b05586da488119f215057164d97489))

## [2.45.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.44.0...compound-engineering-v2.45.0) (2026-03-19)


### 功能

* 编辑 resolve_todos_parallel skill，以支持完整 todo lifecycle ([#292](https://github.com/EveryInc/compound-engineering-plugin/issues/292)) ([88c89bc](https://github.com/EveryInc/compound-engineering-plugin/commit/88c89bc204c928d2f36e2d1f117d16c998ecd096))
* 将 claude code auto memory 集成为 ce:compound 和 ce:compound-refresh 的 supplementary data source ([#311](https://github.com/EveryInc/compound-engineering-plugin/issues/311)) ([5c1452d](https://github.com/EveryInc/compound-engineering-plugin/commit/5c1452d4cc80b623754dd6fe09c2e5b6ae86e72e))

## [2.44.0](https://github.com/EveryInc/compound-engineering-plugin/compare/compound-engineering-v2.43.0...compound-engineering-v2.44.0) (2026-03-18)


### 功能

* **plugin:** 向 ce:plan-beta 和 ce:work 添加 execution posture signaling ([#309](https://github.com/EveryInc/compound-engineering-plugin/issues/309)) ([748f72a](https://github.com/EveryInc/compound-engineering-plugin/commit/748f72a57f713893af03a4d8ed69c2311f492dbd))

## [2.39.0] - 2026-03-10

### 新增

- **ce:compound context budget precheck** — context 受限时发出 warning，并提供 compact-safe mode，避免 mid-compound compaction ([#235](https://github.com/EveryInc/compound-engineering-plugin/pull/235))
- **ce:plan daily sequence numbers** — Plan filenames 现在包含 3-digit daily sequence number（例如 `2026-03-10-001-feat-...`），以防 collision ([#238](https://github.com/EveryInc/compound-engineering-plugin/pull/238))
- **ce:review serial mode** — 传入 `--serial` flag（或在配置了 6+ agents 时 auto-detect），按顺序运行 review agents，防止 context limit crashes ([#237](https://github.com/EveryInc/compound-engineering-plugin/pull/237))
- **agent-browser inspection & debugging commands** — 向 agent-browser skill 添加 JS eval、console/errors、network、storage、device emulation、element debugging、recording/tracing、tabs 和 advanced mouse commands ([#236](https://github.com/EveryInc/compound-engineering-plugin/pull/236))
- **test-browser port detection** — 从 CLAUDE.md、package.json 或 .env files auto-detect dev server port；支持 `--port` flag ([#233](https://github.com/EveryInc/compound-engineering-plugin/pull/233))
- **lfg phase gating** — 在 /lfg steps 之间添加 explicit GATE checks，以强制 plan-before-work ordering ([#231](https://github.com/EveryInc/compound-engineering-plugin/pull/231))

### 修复

- **Context7 API key auth** — MCP server config 现在通过 `x-api-key` header 传递 `CONTEXT7_API_KEY`，避免 anonymous rate limits ([#232](https://github.com/EveryInc/compound-engineering-plugin/pull/232))
- **CLI: MCP server merge order** — `sync` 现在会用 plugin values 正确覆盖同名 MCP servers，而不是保留 stale entries

### 移除

- **every-style-editor agent** — 移除 duplicate agent；功能已作为 `every-style-editor` skill 存在 ([#234](https://github.com/EveryInc/compound-engineering-plugin/pull/234))

### 贡献者

- Matt Van Horn ([@mvanhorn](https://x.com/mvanhorn)) — PRs #231–#238

---

## [2.38.1] - 2026-03-01

### 修复

- **Cross-platform `AskUserQuestion` fallback** — `setup` skill 和 `create-new-skill`/`add-workflow` workflows 现在包含 "Interaction Method" preamble，指示 non-Claude LLMs（Codex、Gemini、Copilot、Kiro）使用 numbered lists 而不是 `AskUserQuestion`，防止 silent auto-configuration。([#204](https://github.com/EveryInc/compound-engineering-plugin/issues/204))
- **Codex AGENTS.md `AskUserQuestion` mapping** — 从 "ask the user in chat" 强化为支持 multi-select 的 structured numbered-list guidance，并加入 "never skip or auto-configure" rule。
- **Skill compliance checklist** — 向 `CLAUDE.md` 添加 `AskUserQuestion` lint rule，防止复发。

---

## [2.38.0] - 2026-03-01

### 变更
- `workflows:plan`, `workflows:work`, `workflows:review`, `workflows:brainstorm`, `workflows:compound` 重命名为 `ce:plan`, `ce:work`, `ce:review`, `ce:brainstorm`, `ce:compound`，以提高清晰度；`ce:` prefix 能明确标识这些是 compound-engineering commands

### 已弃用
- `workflows:*` commands — 五个命令仍作为 aliases 可用，会转发到对应 `ce:*` 命令并显示 deprecation notice。未来版本会移除。

---

## [2.37.2] - 2026-03-01

### 新增

- **CLI: auto-detect install targets** — `bunx @every-env/compound-plugin install compound-engineering --to all` 会 auto-detect 已安装的 AI coding tools，并用一个命令安装到所有 targets。([#191](https://github.com/EveryInc/compound-engineering-plugin/pull/191))
- **CLI: Gemini sync** — `sync --target gemini` 会把 personal skills symlink 到 `.gemini/skills/`，并将 MCP servers merge 到 `.gemini/settings.json`。([#191](https://github.com/EveryInc/compound-engineering-plugin/pull/191))
- **CLI: sync defaults to `--target all`** — 不带 target 运行 `sync` 现在会自动 sync 到所有 detected tools。([#191](https://github.com/EveryInc/compound-engineering-plugin/pull/191))

---

## [2.37.1] - 2026-03-01

### 修复

- **`/workflows:review` rendering** — 修复 broken markdown output："Next Steps" items 3 & 4 和 Severity Breakdown 不再泄漏到 Summary Report template 外；修复 section numbering（之前从 5 跳到 7，现在正确）；移除 orphaned fenced code block delimiters，避免整个 End-to-End Testing section 被渲染为 code block；并修复 section 1 中未闭合的 quoted string。([#214](https://github.com/EveryInc/compound-engineering-plugin/pull/214)) — thanks [@XSAM](https://github.com/XSAM)!
- **`.worktrees` gitignore** — 向 `.gitignore` 添加 `.worktrees/`，防止 `git-worktree` skill 创建的 worktree directories 被 tracked。([#213](https://github.com/EveryInc/compound-engineering-plugin/pull/213)) — thanks [@XSAM](https://github.com/XSAM)!

---

## [2.37.0] - 2026-03-01

### 新增

- **`proof` skill** — 通过 Proof web API 和 local bridge 创建、编辑、评论和分享 markdown documents。支持 document creation、track-changes suggestions、comments 和 bulk rewrites。创建 shared documents 不需要 authentication。
- **`/workflows:brainstorm` 中的 optional Proof sharing** — "Share to Proof" 现在是 Phase 4 handoff 的 menu option，让你按需上传 brainstorm document，而不是每次运行都自动上传。
- **`/workflows:plan` 中的 optional Proof sharing** — "Share to Proof" 现在是 Post-Generation Options 的 menu option，让你按需上传 plan file，而不是自动上传。

---

## [2.36.0] - 2026-03-01

### 新增

- **OpenClaw install target** — `bunx @every-env/compound-plugin install compound-engineering --to openclaw` 现在会把 plugin 安装到 OpenClaw 的 extensions directory。([#217](https://github.com/EveryInc/compound-engineering-plugin/pull/217)) — thanks [@TrendpilotAI](https://github.com/TrendpilotAI)!
- **Qwen Code install target** — `bunx @every-env/compound-plugin install compound-engineering --to qwen` 现在会把 plugin 安装到 Qwen Code 的 extensions directory。([#220](https://github.com/EveryInc/compound-engineering-plugin/pull/220)) — thanks [@rlam3](https://github.com/rlam3)!
- **Windsurf install target** — `bunx @every-env/compound-plugin install compound-engineering --to windsurf` 会把 plugins 转成 Windsurf format。Agents 变成 Windsurf skills，commands 变成 flat workflows，MCP servers 写入 `mcp_config.json`。默认 global scope（`~/.codeium/windsurf/`）；project-level output 使用 `--scope workspace`。([#202](https://github.com/EveryInc/compound-engineering-plugin/pull/202)) — thanks [@rburnham52](https://github.com/rburnham52)!

### 修复

- **`create-agent-skill` / `heal-skill` YAML crash** — 包含 special characters 的 `argument-hint` values 现在会正确 quote，防止 Claude Code TUI 中的 YAML parse errors。([#219](https://github.com/EveryInc/compound-engineering-plugin/pull/219)) — thanks [@solon](https://github.com/solon)!
- **`resolve-pr-parallel` skill name** — 从 `resolve_pr_parallel`（underscore）重命名为 `resolve-pr-parallel`（hyphen），以匹配 standard naming convention。([#202](https://github.com/EveryInc/compound-engineering-plugin/pull/202)) — thanks [@rburnham52](https://github.com/rburnham52)!

---

## [2.35.2] - 2026-02-20

### 变更

- **`/workflows:plan` brainstorm integration** — 当 plan 找到 brainstorm document 时，现在会在全文中 heavily reference 它。向 plan templates 添加 `origin:` frontmatter field、final review 中的 brainstorm cross-check，以及三个 plan templates（MINIMAL、MORE、A LOT）底部的 "Sources" section。Brainstorm decisions 会通过显式 references（`see brainstorm: <path>`）带入后续流程，并在 finalizing 前强制 scan，确保不会遗漏内容。

---

## [2.35.1] - 2026-02-18

### 变更

- **`/workflows:work` system-wide test check** — 向 task execution loop 添加 "System-Wide Test Check"。在将 task 标为 done 前，强制回答五个问题：运行时会触发哪些 callbacks/middleware？tests 是否覆盖真实链路还是只测 mocked isolation？failure 是否会留下 orphaned state？还有哪些 interfaces 需要同样 change？各层的 error strategies 是否一致？包含 leaf-node changes 的 skip criteria。还向 "Test Continuously" section 添加 integration test guidance。
- **`/workflows:plan` system-wide impact templates** — 向 MORE 和 A LOT plan templates 添加 "System-Wide Impact" section（interaction graph、error propagation、state lifecycle、API surface parity、integration test scenarios），作为 planning 期间标记 risks 的 lightweight prompts。

---

## [2.35.0] - 2026-02-17

### 修复

- **`/lfg` and `/slfg` first-run failures** — 当未安装 `ralph-wiggum` skill 时，将 ralph-loop step 改为 optional 并 graceful fallback (#154)。在所有 steps 中添加显式 "do not stop" instruction (#134)。
- **`/workflows:plan` not writing file in pipeline** — 在 Post-Generation Options 前添加 mandatory "Write Plan File" step，并包含显式 Write tool instructions。现在任何 interactive prompts 前都会先把 file 写入磁盘 (#155)。也添加 pipeline-mode note：从 LFG/SLFG 调用时跳过 AskUserQuestion calls (#134)。
- **Agent namespace typo in `/workflows:plan`** — `Task spec-flow-analyzer(...)` 现在使用完整 qualified name `Task compound-engineering:workflow:spec-flow-analyzer(...)`，防止 Claude prepend 错误的 `workflows:` prefix (#193)。

---

## [2.34.0] - 2026-02-14

### 新增

- **Gemini CLI target** — 新增 [Gemini CLI](https://github.com/google-gemini/gemini-cli) converter target。使用 `--to gemini` 安装时，会将 agents 转换到 `.gemini/skills/*/SKILL.md`，commands 转换到 `.gemini/commands/*.toml`（TOML format，含 `description` + `prompt`），MCP servers 转换到 `.gemini/settings.json`。Skills 原样 pass through（相同的 SKILL.md standard）。Namespaced commands 会创建目录结构（`workflows:plan` → `commands/workflows/plan.toml`）。新增 29 个 tests。([#190](https://github.com/EveryInc/compound-engineering-plugin/pull/190))

---

## [2.33.1] - 2026-02-13

### 变更

- **`/workflows:plan` command** - 所有 plan templates 现在都在 YAML frontmatter 中包含 `status: active`。Plans 创建时为 `status: active`，work 完成时标记为 `status: completed`。
- **`/workflows:work` command** - Phase 4 现在会在 shipping 后将 plan frontmatter 从 `status: active` 更新为 `status: completed`。Agents 可通过 grep status 区分 current vs historical plans。

---

## [2.33.0] - 2026-02-12

### 新增

- **`setup` skill** — review agents 的 interactive configurator
  - Auto-detects project type（Rails、Python、TypeScript 等）
  - 两条路径："Auto-configure"（one click）或 "Customize"（选择 stack、focus areas、depth）
  - 在 project root 写入 `compound-engineering.local.md`（tool-agnostic，适用于 Claude、Codex、OpenCode）
  - 没有 settings file 时由 `/workflows:review` 自动调用
- **`/workflows:review` 中的 `learnings-researcher`** — always-run agent，会在 `docs/solutions/` 中搜索与 PR 相关的 past issues
- **接入 `/workflows:review` 的 `schema-drift-detector`** — 用于带 migrations PRs 的 conditional agent

### 变更

- **`/workflows:review`** — 现在从 `compound-engineering.local.md` settings file 读取 review agents。若 file 不存在，则 fallback 为调用 setup skill。
- **`/workflows:work`** — Review agents 现在可通过 settings file 配置
- **`/release-docs` command** — 从 plugin 移到 local `.claude/commands/`（repo maintenance，不分发）

### 移除

- **`/technical_review` command** — 已被 configurable review agents 取代

---

## [2.32.0] - 2026-02-11

### 新增

- **Factory Droid target** — 新增 [Factory Droid](https://docs.factory.ai) converter target。使用 `--to droid` 安装时，会将 agents、commands 和 skills 输出到 `~/.factory/`。包括 tool name mapping（Claude → Factory）、namespace prefix stripping、Task syntax conversion 和 agent reference rewriting。新增 13 个 tests（9 converter + 4 writer）。([#174](https://github.com/EveryInc/compound-engineering-plugin/pull/174))

---

## [2.31.1] - 2026-02-09

### 变更

- **`dspy-ruby` skill** — 完整重写到 DSPy.rb v0.34.3 API：`.call()` / `result.field` patterns、`T::Enum` classes、`DSPy::Tools::Base` / `Toolset`。添加 events system、lifecycle callbacks、fiber-local LM context、GEPA optimization、evaluation framework、typed context pattern、BAML/TOON schema formats、storage system、score reporting、RubyLLM adapter。5 个 reference files（2 个新增：toolsets、observability），3 个 asset templates 重写。

## [2.31.0] - 2026-02-08

### 新增

- **`document-review` skill** — 通过 structured review 优化 brainstorm 和 plan ([@Trevin Chow](https://github.com/trevin))
- **`/sync` command** — 跨机器同步 Claude Code personal config ([@Terry Li](https://github.com/terryli))

### 变更

- **Context token optimization（降低 79%）** — Plugin 曾消耗 316% 的 context description budget，导致 Claude Code silent exclude components。现在为 65%，仍有增长空间：
  - 所有 29 个 agent descriptions 从平均约 1,400 chars 缩短到约 180 chars（examples 移到 agent body）
  - 18 个 manual commands 标记 `disable-model-invocation: true`（有 side-effect 的 commands，如 `/lfg`、`/deploy-docs`、`/triage` 等）
  - 6 个 manual skills 标记 `disable-model-invocation: true`（`orchestrating-swarms`、`git-worktree`、`skill-creator`、`compound-docs`、`file-todos`、`resolve-pr-parallel`）
- **git-worktree**：移除 worktree creation 的 confirmation prompt ([@Sam Xie](https://github.com/XSAM))
- **防止 subagents 在 compound workflow 中写 intermediary files** ([@Trevin Chow](https://github.com/trevin))

### 修复

- 修复 hook entries 没有 matcher 时的 crash ([@Roberto Mello](https://github.com/robertomello))
- 修复 `.git` 是 file 而不是 directory 时的 git-worktree detection ([@David Alley](https://github.com/davidalley))
- 在 sync 覆盖前备份 existing config files ([@Zac Williams](https://github.com/zacwilliams))
- 记录新的 repository URL ([@Aarni Koskela](https://github.com/aarnikoskela))
- 修正 Plugin component counts：29 agents、24 commands、18 skills

---

## [2.30.0] - 2026-02-05

### 新增

- **`orchestrating-swarms` skill** - multi-agent orchestration 的 comprehensive guide
  - 覆盖 primitives：Agent、Team、Teammate、Leader、Task、Inbox、Message、Backend
  - 记录两种 spawning methods：subagents vs teammates
  - 解释全部 13 个 TeammateTool operations
  - 包含 orchestration patterns：Parallel Specialists、Pipeline、Self-Organizing Swarm
  - 详述 spawn backends：in-process、tmux、iterm2
  - 提供完整 workflow examples
- **`/slfg` command** - `/lfg` 的 swarm-enabled variant，使用 swarm mode 进行 parallel execution

### 变更

- **`/workflows:work` command** - 添加 optional Swarm Mode section，用于 coordinated agents 的 parallel execution

---

## [2.29.0] - 2026-02-04

### 新增

- **`schema-drift-detector` agent** - 检测 PR 中无关的 schema.rb changes
  - 将 schema.rb diff 与 PR 中的 migrations 对比
  - 捕获来自其他 branches 的 columns、indexes 和 tables
  - 防止意外包含 local database state
  - 提供清晰 fix instructions（checkout + migrate）
  - 对任何包含 database changes 的 PR 都是 essential pre-merge check

---

## [2.28.0] - 2026-01-21

### 新增

- **`/workflows:brainstorm` command** - Guided ideation flow，用于快速扩展 options (#101)

### 变更

- **`/workflows:plan` command** - deep dives 前的 smarter research decision logic (#100)
- **Research checks** - research flows 中 mandatory API deprecation validation (#102)
- **Docs** - 标明 experimental OpenCode/Codex providers 和 install defaults
- **CLI defaults** - `install` 默认从 GitHub 拉取，并将 OpenCode/Codex output 写到 global locations

### 合并的 PRs

- [#102](https://github.com/EveryInc/compound-engineering-plugin/pull/102) feat(research): 添加 mandatory API deprecation validation
- [#101](https://github.com/EveryInc/compound-engineering-plugin/pull/101) feat: 添加 /workflows:brainstorm command 和 skill
- [#100](https://github.com/EveryInc/compound-engineering-plugin/pull/100) feat(workflows:plan): 添加 smart research decision logic

### 贡献者

非常感谢让这个 release 成为可能的 community contributors！

- **[@tmchow](https://github.com/tmchow)** - Brainstorm workflow、research decision logic（2 个 PRs）
- **[@jaredmorgenstern](https://github.com/jaredmorgenstern)** - API deprecation validation 工作

---

## [2.27.0] - 2026-01-20

### 新增

- **`/workflows:plan` command** - Interactive Q&A refinement phase（交互式 Q&A refinement 阶段） (#88)
  - 生成 initial plan 后，现在会提供 targeted questions refinement
  - 针对 ambiguous requirements、edge cases 或 technical decisions 最多询问 5 个问题
  - 在 finalization 前整合 answers，以强化 plan

### 变更

- **`/workflows:work` command** - Incremental commits 和 branch safety (#93)
  - 现在每完成一个 task 就 commit，而不是最后 batch
  - 在开始 work 前添加 branch protection checks
  - 通过 per-task commits 提供更好的 progress tracking

### 修复

- **`dhh-rails-style` skill** - 修复 broken markdown table formatting (#96)
- **Documentation** - 将 hardcoded year references 从 2025 更新为 2026 (#86, #91)

### 贡献者

非常感谢让这个 release 成为可能的 community contributors！

- **[@tmchow](https://github.com/tmchow)** - plans 的 Interactive Q&A、incremental commits、year updates（3 PRs!）
- **[@ashwin47](https://github.com/ashwin47)** - Markdown table 修复
- **[@rbouschery](https://github.com/rbouschery)** - Documentation 年份更新

### 摘要

- 共 27 agents、23 commands、14 skills、1 个 MCP server

---

## [2.26.5] - 2026-01-18

### 变更

- **`/workflows:work` command** - 现在会在 tasks 完成时标记 plan document 中的 checkboxes
  - 每个 task 后添加 update original plan file（`[ ]` → `[x]`）的 step
  - 确保 work 完成时没有 unchecked checkboxes
  - 让 plan 成为展示 progress 的 living document

---

## [2.26.4] - 2026-01-15

### 变更

- **`/workflows:work` command** - PRs 现在包含 Compound Engineered badge
  - 更新 PR template，在底部加入链接到 plugin repo 的 badge
  - 向 quality checklist 添加 badge requirement
  - Badge 提供 attribution，并链接到创建该 PR 的 plugin

---

## [2.26.3] - 2026-01-14

### 变更

- **`design-iterator` agent** - 现在会在 iterations 开始时 auto-load design skills
  - 添加 "Step 0: Discover and Load Design Skills (MANDATORY)" section
  - 从 ~/.claude/skills/、.claude/skills/ 和 plugin cache 发现 skills
  - 将 user context 映射到 relevant skills（Swiss design → swiss-design skill 等）
  - 在 iterating 前读取 SKILL.md files，把 principles 加载进 context
  - 提取 key principles：grid specs、typography rules、color philosophy、layout principles
  - Skills 会贯穿 ALL iterations，以保持 consistent design language

---

## [2.26.2] - 2026-01-14

### 变更

- **`/test-browser` command** - 明确只使用 agent-browser CLI
  - 添加显式 "CRITICAL: Use agent-browser CLI Only" section
  - 添加 warning："DO NOT use Chrome MCP tools (mcp__claude-in-chrome__*)"
  - 添加 Step 0：testing 前验证 agent-browser installation
  - 在底部添加完整 CLI reference section
  - 添加 Next.js route mapping patterns

---

## [2.26.1] - 2026-01-14

### 变更

- **`best-practices-researcher` agent** - 现在 going online 前会先检查 skills
  - Phase 1：从 plugin、global 和 project directories 发现并读取 relevant SKILL.md files
  - Phase 2：只有 skills 覆盖不足时，才 online 搜索 additional best practices
  - Phase 3：用清晰 source attribution 合成所有 findings（skill-based > official docs > community）
  - Skill mappings：Rails → dhh-rails-style，Frontend → frontend-design，AI → agent-native-architecture 等
  - 对 trivial/common patterns，优先使用 curated skill knowledge，而不是 external sources

---

## [2.26.0] - 2026-01-14

### 新增

- **`/lfg` command** - 完整 autonomous engineering workflow
  - 从 plan 到 PR 编排完整 feature development
  - 运行：plan → deepen-plan → work → review → resolve todos → test-browser → feature-video
  - 使用 ralph-loop 完成 autonomous completion
  - 从 local command 迁移，并更新为使用 `/test-browser` 而不是 `/playwright-test`

### 摘要

- 共 27 agents、21 commands、14 skills、1 个 MCP server

---

## [2.25.0] - 2026-01-14

### 新增

- **`agent-browser` skill** - 使用 Vercel agent-browser CLI 的 browser automation
  - Navigate、click、fill forms、take screenshots 等操作
  - 使用 ref-based element selection（比 Playwright 更简单）
  - 支持 headed 或 headless mode

### 变更

- **用 agent-browser 替换 Playwright MCP** - 为所有 browser-related features 提供更简单的 browser automation：
  - `/test-browser` command - 现在使用带 headed/headless mode option 的 agent-browser CLI
  - `/feature-video` command - 使用 agent-browser 截图
  - `design-iterator` agent - 通过 agent-browser 做 browser automation
  - `design-implementation-reviewer` agent - Screenshot comparison 能力
  - `figma-design-sync` agent - Design verification 能力
  - `bug-reproduction-validator` agent - Bug reproduction 能力
  - `/review` workflow - Screenshot capabilities
  - `/work` workflow - Browser testing 能力

- **`/test-browser` command** - 添加 "Step 0"，询问 user 想要 headed（visible）还是 headless browser mode

### 移除

- **Playwright MCP server** - 被 agent-browser CLI 替换（更简单，没有 MCP overhead）
- **`/playwright-test` command** - 重命名为 `/test-browser`

### 摘要

- 共 27 agents、20 commands、14 skills、1 个 MCP server

---

## [2.23.2] - 2026-01-09

### 变更

- **`/reproduce-bug` command** - 通过 Playwright visual reproduction 增强：
  - 添加 Phase 2，使用 browser automation 做 visual bug reproduction
  - 提供 step-by-step guide，用于导航到 affected areas
  - 在每个 reproduction step capture screenshot
  - Console error checking（console 错误检查）
  - 用 clicks、typing 和 snapshots 复现 user flow
  - 用 4 个清晰 phases 改进 documentation structure

### 摘要

- 共 27 agents、21 commands、13 skills、2 个 MCP servers

---

## [2.23.1] - 2026-01-08

### 变更

- **Agent model inheritance** - 全部 26 个 agents 现在使用 `model: inherit`，以匹配 user configured model。只有 `lint` 为 cost efficiency 保留 `model: haiku`。（fixes #69）

### 摘要

- 共 27 agents、21 commands、13 skills、2 个 MCP servers

---

## [2.23.0] - 2026-01-08

### 新增

- **`/agent-native-audit` command** - Comprehensive agent-native architecture review（全面的 agent-native architecture review）
  - 启动 8 个 parallel sub-agents，每个 core principle 一个
  - Principles（原则）：Action Parity、Tools as Primitives、Context Injection、Shared Workspace、CRUD Completeness、UI Integration、Capability Discovery、Prompt-Native Features
  - 每个 agent 产生 specific score（X/Y format with percentage）
  - 生成包含 overall score 和 top 10 recommendations 的 summary report
  - 支持通过 argument audit 单个 principle

### 摘要

- 共 27 agents、21 commands、13 skills、2 个 MCP servers

---

## [2.22.0] - 2026-01-05

### 新增

- **`rclone` skill** - 上传 files 到 S3、Cloudflare R2、Backblaze B2 和其他 cloud storage providers

### 变更

- **`/feature-video` command** - 增强内容：
  - 用于 video/GIF creation 的更好 ffmpeg commands（proper scaling、framerate control）
  - cloud uploads 的 rclone integration
  - 将 screenshots copy 到 project folder
  - 改进 upload options workflow

### 摘要

- 共 27 agents、20 commands、13 skills、2 个 MCP servers

---

## [2.21.0] - 2026-01-05

### 修复

- merge conflict resolution 后清理 version history

### 摘要

本 release 整合了所有近期工作：
- 用于 recording PR demos 的 `/feature-video` command
- 用于 enhanced planning 的 `/deepen-plan` command
  - `create-agent-skills` skill rewrite（official spec compliance）
  - `agent-native-architecture` skill major expansion
  - `dhh-rails-style` skill consolidation（merged dhh-ruby-style）
  - 共 27 agents、20 commands、12 skills、2 个 MCP servers

---

## [2.20.0] - 2026-01-05

### 新增

- **`/feature-video` command** - 使用 Playwright 录制 features 的 video walkthroughs

### 变更

- **`create-agent-skills` skill** - 完整重写，以匹配 Anthropic official skill specification

### 移除

- **`dhh-ruby-style` skill** - 合并到 `dhh-rails-style` skill

---

## [2.19.0] - 2025-12-31

### 新增

- **`/deepen-plan` command** - plans 的 power enhancement。接收 existing plan，并为每个 major section 运行 parallel research sub-agents，以添加：
  - Best practices 和 industry patterns
  - Performance optimizations（性能优化）
  - UI/UX improvements（if applicable，如适用）
  - Quality enhancements 和 edge cases
  - Real-world implementation examples（真实世界实现示例）

  结果是一个 deeply grounded、production-ready plan，包含 concrete implementation details。

### 变更

- **`/workflows:plan` command** - 将 `/deepen-plan` 添加为 post-generation menu 的 option 2。添加 note：如果启用了 ultrathink，会自动运行 deepen-plan 以获得最大深度。

## [2.18.0] - 2025-12-25

### 新增

- **`agent-native-architecture` skill** - 添加 **Dynamic Capability Discovery** pattern 和 **Architecture Review Checklist**：

  **mcp-tool-design.md 中的新 patterns：**
  - **Dynamic Capability Discovery** - 对 external APIs（HealthKit、HomeKit、GraphQL），构建一个 discovery tool（`list_*`），在 runtime 返回 available capabilities；再配一个接收 strings（不是 enums）的 generic access tool。API 负责 validate，而不是你的 code。这意味着 agents 可以在不改 code 的情况下使用新的 API capabilities。
  - **CRUD Completeness** - agent 能 create 的每个 entity，也必须可 read、update、delete。Incomplete CRUD = broken action parity。

  **SKILL.md 中新增：**
  - **Architecture Review Checklist** - 将 reviewer findings 更早推入 design phase。覆盖 tool design（dynamic vs static、CRUD completeness）、action parity（capability map、edit/delete）、UI integration（agent → UI communication）和 context injection。
  - **Option 11: API Integration** - 新增 intake option，用于连接 HealthKit、HomeKit、GraphQL 等 external APIs
  - **New anti-patterns:** Static Tool Mapping（为每个 API endpoint 构建独立 tools）、Incomplete CRUD（create-only tools）
  - 向 success criteria checklist 添加 **Tool Design Criteria** section

  **shared-workspace-architecture.md 中新增：**
  - **iCloud File Storage for Multi-Device Sync** - 将 iCloud Documents 用作 shared workspace，可在不构建 sync layer 的情况下获得免费、自动的 multi-device sync。包含 implementation pattern、conflict handling、entitlements，以及何时不该使用它。

### 理念

本次更新 codify 了 **agent-native apps** 的一个关键 insight：当集成 external APIs 且 agent 应该拥有与 user 相同的 access 时，使用 **Dynamic Capability Discovery**，而不是 static tool mapping。不要构建 `read_steps`、`read_heart_rate`、`read_sleep`...，而应构建 `list_health_types` + `read_health_data(dataType: string)`。Agent 发现 available capabilities，API validate type。

Note：此 pattern 专门用于遵循 "whatever the user can do, the agent can do" philosophy 的 agent-native apps。对于 intentionally limited capabilities 的 constrained agents，static tool mapping 可能更合适。

---

## [2.17.0] - 2025-12-25

### 增强

- **`agent-native-architecture` skill** - 基于构建 Every Reader iOS app 的 real-world learnings 做 major expansion。添加 5 个 new reference documents，并扩展现有文档：

  **新增 References：**
  - **dynamic-context-injection.md** - 如何将 runtime app state 注入 agent system prompts。覆盖 context injection patterns、要注入的 context（resources、activity、capabilities、vocabulary）、Swift/iOS 和 TypeScript 的 implementation patterns，以及 context freshness。
  - **action-parity-discipline.md** - 确保 agents 能做 users 能做的一切的 workflow。包括 capability mapping templates、parity audit process、PR checklists、parity tool design 和 context parity guidelines。
  - **shared-workspace-architecture.md** - agents 和 users 在同一 data space 中工作的 patterns。覆盖 directory structure、file tools、UI integration（file watching、shared stores）、agent-user collaboration patterns 和 security considerations。
  - **agent-native-testing.md** - agent-native apps 的 testing patterns。包括 "Can Agent Do It?" tests、Surprise Test、automated parity testing、integration testing 和 CI/CD integration。
  - **mobile-patterns.md** - iOS/Android 的 mobile-specific patterns。覆盖 background execution（checkpoint/resume）、permission handling、cost-aware design（model tiers、token budgets、network awareness）、offline handling 和 battery awareness。

  **更新 References：**
  - **architecture-patterns.md** - 添加 3 个 new patterns：Unified Agent Architecture（one orchestrator, many agent types）、Agent-to-UI Communication（shared data store、file watching、event bus）和 Model Tier Selection（fast/balanced/powerful）。

  **更新 Skill Root：**
  - **SKILL.md** - 扩展 intake menu（现在有 10 个 options，包括 context injection、action parity、shared workspace、testing、mobile patterns）。添加 5 个 new agent-native anti-patterns（Context Starvation、Orphan Features、Sandbox Isolation、Silent Actions、Capability Hiding）。用 agent-native 和 mobile-specific checklists 扩展 success criteria。

- **`agent-native-reviewer` agent** - 用覆盖所有 new patterns 的 comprehensive review process 显著增强。现在会检查 action parity、context parity、shared workspace、tool design（primitives vs workflows）、dynamic context injection 和 mobile-specific concerns。包含 detailed anti-patterns、output format template、quick checks（"Write to Location" test、Surprise test）以及 mobile-specific verification。

### 理念

这些更新 operationalize 了构建 agent-native mobile apps 时得到的关键 insight：**"The agent should be able to do anything the user can do, through tools that mirror UI capabilities, with full context about the app state."** 触发这些 changes 的 failure case 是：user 说 "write something in my reading feed" 时，agent 反问 "what reading feed?"，因为它既没有 `publish_to_feed` tool，也没有关于 "feed" 含义的 context。

## [2.16.0] - 2025-12-21

### 增强

- **`dhh-rails-style` skill** - 大幅扩展 reference documentation，纳入 Marc Köhlbrugge's Unofficial 37signals Coding Style Guide 的 patterns：
  - **controllers.md** - 添加 authorization patterns、rate limiting、Sec-Fetch-Site CSRF protection、request context concerns
  - **models.md** - 添加 validation philosophy、let it crash philosophy（bang methods）、default values with lambdas、Rails 7.1+ patterns（normalizes、delegated types、store accessor）、带 touch chains 的 concern guidelines
  - **frontend.md** - 添加 Turbo morphing best practices、Turbo frames patterns、6 个 new Stimulus controllers（auto-submit、dialog、local-time 等）、Stimulus best practices、view helpers、caching with personalization、broadcasting patterns
  - **architecture.md** - 添加 path-based multi-tenancy、database patterns（UUIDs、state as records、hard deletes、counter caches）、background job patterns（transaction safety、error handling、batch processing）、email patterns、security patterns（XSS、SSRF、CSP）、Active Storage patterns
  - **gems.md** - 添加扩展版 what-they-avoid section（service objects、form objects、decorators、CSS preprocessors、React/Vue），以及包含 Minitest/fixtures patterns 的 testing philosophy

### 致谢

- Reference patterns 源自 [Marc Köhlbrugge's Unofficial 37signals Coding Style Guide](https://github.com/marckohlbrugge/unofficial-37signals-coding-style-guide)

## [2.15.2] - 2025-12-21

### 修复

- **All skills** - 修复 12 个 skills 中的 spec compliance issues：
  - Reference files 现在使用 proper markdown links（`[file.md](./references/file.md)`），而不是 backtick text
  - Descriptions 现在按 skill-creator spec 使用第三人称（"This skill should be used when..."）
  - 受影响 skills：agent-native-architecture、andrew-kane-gem-writer、compound-docs、create-agent-skills、dhh-rails-style、dspy-ruby、every-style-editor、file-todos、frontend-design、gemini-imagegen

### 新增

- **CLAUDE.md** - 添加 Skill Compliance Checklist，包含确保 new skills 满足 spec requirements 的 validation commands

## [2.15.1] - 2025-12-18

### 变更

- **`/workflows:review` command** - Section 7 现在会检测 project type（Web、iOS 或 Hybrid）并提供 appropriate testing。Web projects 使用 `/playwright-test`，iOS projects 使用 `/xcode-test`，hybrid projects 可同时运行两者。

## [2.15.0] - 2025-12-18

### 新增

- **`/xcode-test` command** - 使用 XcodeBuildMCP 在 simulator 上 build 和 test iOS apps。自动检测 Xcode project、build app、launch simulator，并运行 test suite。包含 flaky tests 的 retries。

- **`/playwright-test` command** - 在当前 PR 或 branch 影响的 pages 上运行 Playwright browser tests。检测 changed files、映射 affected routes、生成/运行 targeted tests，并带 screenshots 报告 results。
