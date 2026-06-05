---
title: "fix: 关闭 PR #568 feedback 中指出的 ce-polish-beta detection gaps"
type: fix
status: active
date: 2026-04-16
---

# fix: 关闭 PR #568 feedback 中指出的 ce-polish-beta detection gaps

## 概览

处理 @tmchow 在 EveryInc/compound-engineering-plugin#568 中指出的 `ce-polish-beta` 四个具体 detection/resolution gaps：

1. Framework coverage - Nuxt、SvelteKit、Remix、Astro 会 fall through 到 `unknown`（commenter 称它们是 "table stakes alongside Next and Vite"）
2. Monorepo blind spot - `detect-project-type.sh` 只检查 repo root，因此包含 `apps/web/next.config.js` 的 Turborepo 返回 `unknown`
3. Package-manager detection 只在 prose 中有 documented，但未实现；Next/Vite stubs 在 pnpm/yarn/bun projects 中会静默写入 `npm run dev`
4. Port cascade lossy - `.env` reader 不 strip quotes 或 trailing comments，`AGENTS.md`/`CLAUDE.md` grep 会命中无关 doc references，且不 probe `next.config.*` / `vite.config.*` / `config/puma.rb` / `docker-compose.yml`

四项都是已发布 beta skill 中的 detection/resolution bugs（`disable-model-invocation: true`，因此没有 auto-trigger regression risk）。Fix scope 是该 skill 自己的 `scripts/` 与 `references/` trees，以及 `SKILL.md` 中 Phase 3 wiring。

## 问题框架

Polish 的 dev-server lifecycle（SKILL.md 中 Phase 3）有三项 resolution jobs：

- **这是什么 project type？** -> `scripts/detect-project-type.sh`
- **如何启动它？** -> `references/dev-server-<type>.md` 中的 per-type recipe，被替换进 `launch.json` stub
- **它会绑定哪个 port？** -> `references/dev-server-detection.md` 中已 documented 的 inline cascade

这三项目前都会在常见但未处理的 shapes（monorepos、Nuxt/Astro、pnpm-only repos、quoted `.env` values）上失败。用户第一次在 skill bootstrap 时覆盖的四种 project types（rails、next、vite、procfile）之外运行 polish 时，就会遇到这些 gaps。Fallback - "ask the user to author `.claude/launch.json`" - 可用，但把 discovery problem 推给了用户，而这本该由 skill 自己完成。

Feedback 是该 skill 与原计划之外 reviewer 的第一次真实接触，并且与 `references/dev-server-vite.md`（"SvelteKit, SolidStart, Qwik City, and Astro all use Vite... Different default ports apply"）和 `references/dev-server-next.md`（"Monorepo roots: users should set `cwd`... to the specific Next app"）中已经 flagged 的 hazards 对齐。Skill 早知道这些是 gaps 并 punt 了；本 plan 关闭这个 punt。

## 需求追踪

- **R1.** Nuxt、SvelteKit、Astro 和 Remix 被识别为 first-class project types（不再 fall through 到 `unknown`）。
- **R2.** `detect-project-type.sh` 在 monorepo workspace 内（bounded depth）找到 framework config，并返回 type + relative `cwd`，使 stub-writer 可在无用户介入时填充 `launch.json` 中的 `cwd`。
- **R3.** Next 和 Vite stubs 使用 lockfile 指示的 package manager（`pnpm` / `yarn` / `bun` / `npm`），而不是 hard-coding `npm`。
- **R4.** Port resolution 优先使用 authoritative config files（framework config、`config/puma.rb`、`Procfile.dev`、`docker-compose.yml`），而不是 prose references。`.env` parsing 正确 strip surrounding quotes 和 trailing `# comment`。移除 noisy `AGENTS.md`/`CLAUDE.md` grep。
- **R5.** Existing users 不 regression。此前 correctly detected 的 repos 继续 detect 到相同 type；已有 `.claude/launch.json` 的 repos 不受影响（launch.json 仍 wins）。
- **R6.** 每个 new 或 modified script 在 `tests/skills/` 中有 unit-test coverage，镜像现有 `ce-polish-beta-dev-server.test.ts` harness（tmp git repo、Bun.spawn、exit-code + stdout assertions）。

## 范围边界

- **不**新增 Python（Django、Flask、FastAPI）、Go、Elixir/Phoenix、Deno/Fresh、Angular、Gatsby、Expo、Electron、Tauri、Storybook 或 Ruby non-Rails（Sinatra、Hanami）。Trevor 将这些列为 gaps；它们各自都需要 recipe file 和 dev-server conventions，合计会让 skill surface area 近乎翻倍。Defer to a follow-up plan。
- **不**改变 `.claude/launch.json` priority - launch.json always wins over auto-detect。本 plan 只改善 launch.json absent 时 auto-detect 的行为。
- **不**重写 IDE handoff、kill-by-port 或 Phase 3.5/3.6 的 reachability probe。它们不受影响。
- **不**改变 headless-mode semantics。所有 new scripts 都是 probes；它们不 mutate state，因此 headless rules（"never write .claude/launch.json, never kill without token"）保持不变。
- **不**新增超出 conservative regex 的 framework config parser。Arbitrary JS/TS config files 可以通过 computed expressions 设置 `port`，regex 捕获不到；probe miss 时，cascade fall through 到 framework defaults。记录为 best-effort，而非 authoritative。
- **不**bump plugin version、marketplace version 或 writing a release entry。按 repo `AGENTS.md`，release-please owns that。

## 背景与调研

### 相关代码和模式

- `plugins/compound-engineering/skills/ce-polish-beta/scripts/detect-project-type.sh` - 当前 root-only classifier，含 precedence rules（rails beats procfile，真正 disambiguation 时返回 `multiple`）
- `plugins/compound-engineering/skills/ce-polish-beta/scripts/read-launch-json.sh` - 现有 script 会 emit sentinel outputs（`__NO_LAUNCH_JSON__`、`__INVALID_LAUNCH_JSON__`、`__MISSING_CONFIGURATIONS__`、`__CONFIG_NOT_FOUND__`）。Sentinel pattern 是 new scripts signaling "no match, fall through" 时应遵循的 convention。
- `plugins/compound-engineering/skills/ce-polish-beta/scripts/parse-checklist.sh` - set-unsafe `set -u`、bash regex（`[[ =~ ]]`）和 awk/jq composition within a single script 的 pattern。New scripts 应匹配该 style（不使用 `set -euo pipefail`；按 convention，existing scripts 只用 `set -u`）。
- `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-<rails|next|vite|procfile>.md` - per-type recipe 形态：Signature、Start command、Port、Stub generation、Common gotchas
- `plugins/compound-engineering/skills/ce-polish-beta/references/launch-json-schema.md` - 按 project type 分组的 stub templates；需要 parameterize 的 stub-writer block
- `tests/skills/ce-polish-beta-dev-server.test.ts` - test harness pattern: tmp git repo、touch signature files、通过 `Bun.spawn` invoke script、assert `exitCode` + `stdout.trim()`。所有 new scripts 遵循此形态。
- `plugins/compound-engineering/skills/ce-polish-beta/SKILL.md` Phase 3.2（lines 272-291）- project-type routing table；需要扩展以支持 new types 和 `<type>@<cwd>` return variant 的 surface
- `plugins/compound-engineering/skills/ce-polish-beta/SKILL.md` Phase 3.3（lines 293-303）- stub-writer；package-manager substitution 与 `cwd` population 落地位置

### 组织内 learnings

没有直接适用项；此工作扩展的是同一 skill 中已 proven 的 patterns。

### 跨仓库参考（仅供信息）

`plugins/compound-engineering/skills/test-browser/SKILL.md` 有一个 inline port cascade；polish 的 `dev-server-detection.md` 是它的 copy（按 self-contained-skill rule）。本 plan 不修改 `test-browser`；两个 cascades 继续按设计保持 independent。Maintainers note：如果 test-browser 未来采用 parallel resolve-port script，需要更新两个 skills 的 standard manual-sync note。

## 关键技术决策

- **决策：`detect-project-type.sh` 在 root 返回 `<type>`，对 monorepo hits 返回 `<type>@<cwd>`，绝不只返回 `<cwd>`。** 理由：为 90% root-detection case 保持 existing single-token protocol intact；downstream readers 在存在 `@` 时 split。选择 `@` 而非 `:`，因为 `:` 已保留给 outer multi-hit separator（见下方）。备选方案：返回 structured JSON。否决原因：`scripts/` 中其他 scripts 返回 plain-text tokens，consumers 用 `case`/`awk` 处理它们；JSON 会强迫一个今日只用 bash builtins 的 detector 依赖 `jq`。

- **决策：Output grammar 对 single hits 使用 `<type>` 或 `<type>@<cwd>`，对 multi-hits 使用 `multiple` 或 `multiple:<type>@<cwd>,<type>@<cwd>,...`。** 四个具体 shapes：
- `next`（root single hit）
- `next@apps/web`（monorepo single hit）
- `multiple`（root multiple signatures - existing behavior, unchanged）
  - `multiple:next@apps/web,rails@apps/api`（跨 monorepo workspaces 的 multiple hits，即使 types 相同，也始终 emit 为 `type@path` pairs）
  理由：`:` 是 outer multi-hit delimiter，`@` 是 inner type-path delimiter，使 grammar 在 naive `awk -F:` 或 bash parameter expansion 下无歧义。在 script header comment 中明确记录，避免 callers 误读。

- **决策：New scripts 接受 optional path 作为 positional argument，而不是 `--cwd`。** 理由：`scripts/` 中每个 existing script 都使用 positional args（`parse-checklist.sh <path>`、`classify-oversized.sh <path> <path>`），或通过 `git rev-parse --show-toplevel` derive cwd。Flag-parsing 会成为新 convention。遵循现有 pattern：optional positional path 默认是 `git rev-parse --show-toplevel`。

- **决策：Expected-no-result sentinels 以 0 退出，而不是 1。** 理由：`read-launch-json.sh` 中 existing convention（该文件 lines 20-21 header comment）将 non-zero exit 只保留给 operational failure（missing `jq`、no git root）。`__NO_PACKAGE_JSON__` 等 sentinels exit 0 并在 stdout 输出 sentinel；callers pattern-match stdout，而不是 exit code。

- **决策：stderr 上不输出 provenance。** 理由：现有所有 scripts 的 stderr 都只保留给 `ERROR: ...` messages。Provenance（"resolved_from: framework_config"）会破坏该 convention。`resolve-port.sh` 在 stdout emit single-line integer，匹配 existing scripts 的 simplicity。如果未来 debugging 对 provenance 有真实需求，在 follow-up 中添加 second script 或 `--verbose` mode，而不是 speculative。

- **决策：Monorepo probe 的 depth cap 是 3，且仅当 root detection 返回 `unknown` 时才 walk。** 理由：depth 3 覆盖常见 layouts（`apps/web/next.config.js`、`packages/frontend/vite.config.ts`、`services/api/next.config.js`）。无条件运行会拖慢 common case，并在 root 已是 known type 但 nested elsewhere 存在 example configs（fixtures、templates）时产生 false positives。Depth 3 是 hard cap，因为更深 nesting 通常意味着用户已经需要 author `launch.json`。

- **决策：从 monorepo probe 中排除 `node_modules/`、`.git/`、`vendor/`、`dist/`、`build/`、`coverage/`、`.next/`、`.nuxt/`、`.svelte-kit/`、`.turbo/`、`tmp/`、`fixtures/`。** 理由：这些 directories 会携带作为 fixtures 或 build output 的 config files，并非用户拥有。若不排除，含 `node_modules/next/.../examples/` 的 Rails app 会被识别为 Next，含 test fixtures 的 monorepo 会 surface false positives。

- **决策：`resolve-package-manager.sh` 返回一个 token（`npm` / `pnpm` / `yarn` / `bun`）和 start command（分别是 stdout line 1 与 line 2），使 stub-writer substitution 具备 deterministic。** 理由：`pnpm dev` 和 `bun run dev` 使用不同 argv shapes。只返回 single-token 会迫使 consumer 维护 lookup table；emit binary 和 canonical args 可把所有 PM-specific knowledge 保持在一个地方（resolver）。

- **决策：`resolve-port.sh` 替代 inline `dev-server-detection.md` cascade。** 理由：cascade 当前位于 skill prose 且含 silently-buggy shell（unstripped quotes、noisy grep）。将其 lift 到 tested script，并遵循 sentinel-output convention，使 behavior 可 assert，并在同一处修 bugs。`dev-server-detection.md` 变成指向 script 的 thin pointer，同时保留 framework-default table。

- **决策：Port cascade 先 probe authoritative config files，其次 `.env*`，最后 default。** 理由：Trevor 的核心 complaint 是当前 cascade 优先使用 *prose*（AGENTS.md）而不是 *config*（next.config.js、config/puma.rb）。翻转 ordering 恢复 "the code is the source of truth"。

- **决策：完全移除 `AGENTS.md` / `CLAUDE.md` grep。** 理由：需要 override 的用户有 explicit `--port` / `port:` CLI token 和 `.claude/launch.json` escape hatch。Grep instruction files for port numbers 更常命中 unrelated mentions（"connects to Stripe on port 8443"、"example: localhost:3000"），而不是 real override。

- **决策：Framework config probes 使用 conservative regex，并将 misses 视为 "no pin, fall through"。** 理由：可靠 parse arbitrary JS/TS 需要 JS runtime，而 polish 不 ship 这个。Regex 捕获 `port: 3000`、`port: "3000"` 和 `server: { port: 3000 }` literals，覆盖 common patterns。Missed ports fall through to framework default，与今日行为相同，只是多了更多捕获 explicit value 的机会。

## 开放问题

### 规划期间已解决

- **Remix 应该获得 dedicated signature，还是 route through Vite？** 结论：两者都要。Classic Remix 携带 `remix.config.js` 而无 Vite；Remix 2.x+ 携带 `vite.config.ts`。Classic pattern 在 detector 中有 own signature，因此无歧义 resolve；new Remix 继续 resolve 为 `vite`（现有 Vite recipe 已 document SvelteKit/Astro/etc. as framework-on-Vite）。`remix` recipe 记录两条 paths。

- **Monorepo probe 应该返回所有 matches，还是只返回一个？** 结论：如果只有 single match 返回一个；如果有 several，返回带 `<type>@<path>` pairs 的 `multiple`。Depth <=3 处有多个 matches 是 existing `multiple` sentinel 本来要处理的 genuine disambiguation case；new output 是 `multiple:next@apps/web,next@apps/admin`，使 Phase 3.2 中 interactive prompt 能列出 options。

- **SKILL.md 在哪里 document 新的 `<type>@<cwd>` format？** 结论：扩展现有 Phase 3.2 routing table，加入 "Paths with `@<cwd>` suffix" paragraph，并更新 Phase 3.3 在 present 时 substitute `cwd`。不新增 top-level section。

- **Port resolver 是否需要 parse `docker-compose.yml`？** 结论：需要，但只做轻量解析 - 在名为 `web` / `app` / `frontend` 的 service 下的 `ports:` key 中，grep `- "<port>:<port>"`。完整 YAML parsing out of scope；line-anchored regex 捕获 common compose shape，并在 exotic configs 上 gracefully miss。

### 延后到实现阶段

- **Framework config port probes 的 exact regex。** 从 `port:\s*[0-9]+` 和 `port:\s*["']?[0-9]+["']?` 开始；如 tests 暴露 false positives 再 tighten。Unit 4 owns this。
- **`pnpm dev` 应该是 `pnpm dev` 还是 `pnpm run dev`。** 两者都可用；按 implementation 时 current pnpm docs 中更 idiomatic 的选择，并 pin 到 resolver lookup table。
- **是否应该先 probe `bun.lock` 再 probe `bun.lockb`。** Bun 最近在 binary (`bun.lockb`) 之外加入 text lockfile format（`bun.lock`）；priority 可能无关紧要（正常只存在一个），但 resolver 在两者同时存在时应 deterministic。

## 实现单元

- [x] **Unit 1: 为 Nuxt、Astro、Remix、SvelteKit 添加 first-class recipes**

**目标:** 为四个 "table stakes" JS frontend frameworks 提供 own reference recipes，含 correct ports、start commands 和 stub templates，使它们不再 fall through 到 `unknown`。

**需求:** R1, R6

**依赖:** 无（recipe files 是 additive；直到 Unit 2 扩展 detector 才会 activate）

**文件:**
- 新增: `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-nuxt.md`
- 新增: `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-astro.md`
- 新增: `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-remix.md`
- 新增: `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-sveltekit.md`
- 修改: `plugins/compound-engineering/skills/ce-polish-beta/references/launch-json-schema.md`（add 4 stub templates）

**做法:**
- 精确 mirror `dev-server-next.md` structure：Signature / Start command / Port / Stub generation / Common gotchas
- 按 current framework docs 设置 defaults：Nuxt port 3000、Astro port 4321、Remix port 3000（classic）或 5173（Vite）、SvelteKit port 5173
- 每个 recipe 的 "Common gotchas" section 记录用户实际会遇到的 interactions：Nuxt 的 Nitro、Astro 的 SSR vs SSG dev behavior、Remix 的 classic-vs-Vite fork、SvelteKit 的 adapter-free dev mode
- `launch-json-schema.md` 中 stub templates 匹配现有 Next/Vite/Rails/Procfile pattern

**遵循的模式:**
- `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-next.md` 提供整体形态
- `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-vite.md` 提供 framework-on-Vite notes（与 SvelteKit 和 new Remix relevant）

**测试场景:** Test expectation: none - reference markdown 由模型 consume，不 assert。Unit 5 integration test 覆盖当 respective signatures 存在时会正确选择这些 recipes。

**验证:**
- 四个 new reference files 存在，并含全部五个 required sections
- `launch-json-schema.md` 有所有四个 new types 的 stub templates
- 读者进入新 recipe 后，无需离开文件即可回答 "what command do I run, at what port, with what launch.json stub?"

- [x] **Unit 2: 用 new signatures 和 monorepo probe 扩展 detect-project-type.sh**

**目标:** Detector 在 repo root 识别 Nuxt/Astro/Remix/SvelteKit；当 root detection 返回 `unknown` 时，下降最多 depth 3 到 workspaces，按需 emit `<type>` 或 `<type>@<cwd>`。

**需求:** R1, R2, R5

**依赖:** Unit 1（detector 返回 new types 前，必须已有 recipes，否则 Phase 3.2 routing in Unit 5 会 dead-end）

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-polish-beta/scripts/detect-project-type.sh`
- 新增: `tests/skills/ce-polish-beta-project-type.test.ts`

**做法:**
- 保持现有 root-scan precedence block intact（rails beats procfile，single-match 返回 `<type>`）
- 添加 root signature checks：`nuxt.config.{js,mjs,ts}`、`astro.config.{js,mjs,ts}`、`remix.config.{js,ts}` 和 `svelte.config.{js,mjs,ts}`
- 当 root-scan yields zero matches 时，运行 shallow `find` with `-maxdepth 3`，排除 `node_modules`、`.git`、`vendor`、`dist`、`build`、`coverage`、`.next`、`.nuxt`、`.svelte-kit`、`.turbo`、`tmp`、`fixtures`，寻找任何 supported signature filename
- 将 hits 收集为 `(type, relative-dir)` pairs。按 pair deduplicate
- Single hit -> emit `<type>@<cwd>`（如果 hit 是 `.`，则 emit bare `<type>`）
- Multiple hits -> emit `multiple:<type1>@<cwd1>,<type2>@<cwd2>,...`（始终包含 type prefix，使 grammar 在 naive `awk -F:` 处理 outer separator 时无歧义）
- Zero monorepo hits -> emit `unknown`，保持不变
- **Header comment requirements:** 显式记录 output grammar（四种 concrete shapes：`<type>` / `<type>@<cwd>` / `multiple` / `multiple:<type>@<cwd>,...`）、depth cap 3 及 rationale、exclusion list。Callers 不应被迫从 examples reverse-engineer grammar。

**执行备注:** Test-first - 添加 new test file，覆盖每个 new signature、monorepo single-hit、monorepo multi-hit、exclusion of `node_modules` 和 unchanged-root-detection regression cases。先 run suite red，再修改 detector 到 green。该 script 对 dev-server startup load-bearing 且无 production telemetry；tests 是唯一 safety net。

**遵循的模式:**
- 现有 `detect-project-type.sh` precedence block（rails-before-procfile）
- `tests/skills/ce-polish-beta-dev-server.test.ts` 提供 test harness shape

**测试场景:**
- Happy path: root 中的 `nuxt.config.ts` -> `nuxt`
- Happy path: root 中的 `astro.config.mjs` -> `astro`
- Happy path: root 中的 `remix.config.js` -> `remix`
- Happy path: root 中的 `svelte.config.js` -> `sveltekit`
- Happy path: Turborepo layout 中的 `apps/web/next.config.js` -> `next@apps/web`
- Happy path: pnpm-workspace layout 中的 `packages/frontend/vite.config.ts` -> `vite@packages/frontend`
- Edge case: `apps/web/next.config.js` 和 `apps/admin/next.config.js` -> `multiple:next@apps/web,next@apps/admin`
- Edge case: `apps/web/next.config.js` 和 `apps/api/Gemfile+bin/dev` -> `multiple:next@apps/web,rails@apps/api`
- Edge case: `node_modules/next/examples/...` 内的 signature -> ignored（root returns `unknown`）
- Edge case: depth 4 的 signature（`projects/app/web/client/next.config.js`）-> ignored
- Edge case: signature 与 root 中的 `bin/dev`+`Gemfile` 并存 -> returns `rails`（root wins，no probe runs）
- Regression: signatures present at root 时，existing 4-type root detection unchanged
- 回归测试：`Procfile.dev` + `bin/dev` + `Gemfile` -> still returns `rails`，not `multiple`

**验证:**
- 全部 12 个 test scenarios pass
- 在真实 Turborepo 中运行 `bash scripts/detect-project-type.sh` 返回 `next@apps/web`（或匹配的 app path）
- 在 plugin 自身 repo root 中运行仍返回 existing detection（或 `unknown`，匹配 prior behavior）

- [x] **Unit 3：Package-manager resolver script（package-manager 解析脚本）**

**目标:** 新增 `resolve-package-manager.sh`，emit project package manager（`npm` / `pnpm` / `yarn` / `bun`）以及 canonical dev-server argv，使 stub-writer 可 deterministic substitute 两者，无需 in-agent judgment。

**需求:** R3, R6

**依赖:** 无

**文件:**
- 新增: `plugins/compound-engineering/skills/ce-polish-beta/scripts/resolve-package-manager.sh`
- 新增: `tests/skills/ce-polish-beta-package-manager.test.ts`

**做法:**
- 接受 optional path 作为 positional argument（第一个 positional）；缺省时通过 `git rev-parse --show-toplevel` 默认到 repo root
- 在 resolved path 中，按 priority order 检查 lockfiles：`pnpm-lock.yaml` -> `yarn.lock` -> `bun.lockb` / `bun.lock` -> `package-lock.json`
- stdout emit 两行：line 1 = token（`npm` | `pnpm` | `yarn` | `bun`），line 2 = canonical command tail as space-separated argv（例如 npm/bun 为 `run dev`，pnpm/yarn 为 `dev`）
- 仅当存在 `package.json` 且无匹配 lockfile 时 fall through 到 `npm` + `run dev`（匹配 prior hardcoded behavior，因此 vanilla projects 无 regression）。如果 path 是 valid directory 但没有 `package.json`，不要 fall through 到 `npm` - 而是 emit sentinel（见下一 bullet），使 callers 可区分 "JavaScript project with no lockfile" 和 "not a JavaScript project at all"
- 如果 path 是 valid directory 但无 `package.json`，在 stdout emit sentinel `__NO_PACKAGE_JSON__` 并 exit 0（expected-no-match，匹配 `read-launch-json.sh` sentinel convention - callers pattern-match stdout，不看 exit code）
- 当 `bun.lockb`（binary）和 `bun.lock`（text）同时存在于同一目录时，优先 `bun.lock`（text）。理由：Bun 的 text lockfile 是更新的 canonical format；binary format 是 legacy variant。正常只存在一个，但 resolver 在两者同时存在时必须 deterministic pick。
- 如果 path 本身不存在或不是 directory，在 stderr emit `ERROR:` 并 exit 1（operational failure，与 expected-no-match 不同）
- **Header comment requirements:** 记录 two-line stdout grammar（line 1 = binary，line 2 = argv tail）、lockfile priority order 及原因、sentinel-vs-error exit-code split

**遵循的模式:**
- `plugins/compound-engineering/skills/ce-polish-beta/scripts/read-launch-json.sh` 提供 sentinel outputs and exit codes 模式
- Existing `detect-project-type.sh` 提供 simple lockfile-presence checks 模式

**测试场景:**
- Happy path: 存在 `pnpm-lock.yaml` -> stdout: `pnpm\ndev`
- Happy path: 存在 `yarn.lock` -> stdout: `yarn\ndev`
- Happy path: 存在 `bun.lockb` -> stdout: `bun\nrun dev`
- Happy path: 存在 `bun.lock`（text format）-> stdout: `bun\nrun dev`
- Happy path: 存在 `package-lock.json` -> stdout: `npm\nrun dev`
- Happy path: 无 lockfile，但存在 `package.json` -> stdout: `npm\nrun dev`（safe default）
- Edge case: 同时存在 `pnpm-lock.yaml` 和 `yarn.lock` -> stdout: `pnpm\ndev`（priority order wins）
- Edge case: positional path 指向 `apps/web` - 从 subdir 读取 lockfile，而不是 repo root
- Edge case: positional path 指向没有 `package.json` 的目录 -> stdout `__NO_PACKAGE_JSON__`, exit 0（expected-no-match sentinel）
- Edge case: 无 positional arg，且不在 git repo 中 -> stderr `ERROR:` + exit 1（operational failure）
- Edge case: positional path 存在但目录不存在 -> stderr `ERROR:` + exit 1（operational failure）

**验证:**
- 全部 test scenarios pass
- 从真实 pnpm repo 运行返回 `pnpm\ndev`
- 从真实 npm repo 运行返回 `npm\nrun dev`

- [x] **Unit 4: 带 authoritative config probes 的 port resolver script**

**目标:** 新增 `resolve-port.sh`，按 priority order probe config files（framework config -> `config/puma.rb` -> `Procfile.dev` -> `docker-compose.yml` -> `package.json` scripts -> `.env*` -> default），正确 parse `.env` values（strip quotes 和 `# comment`），并 drop `AGENTS.md`/`CLAUDE.md` grep。

**需求:** R4, R6

**依赖:** 无

**文件:**
- 新增: `plugins/compound-engineering/skills/ce-polish-beta/scripts/resolve-port.sh`
- 新增: `tests/skills/ce-polish-beta-resolve-port.test.ts`
- 修改: `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-detection.md`

**做法:**
- 接受 optional positional path 作为第一个 positional argument（缺省时为 `git rev-parse --show-toplevel`）- 与 `parse-checklist.sh` 和 Unit 3 resolver 一致
- 接受 optional `--type <rails|next|vite|nuxt|astro|remix|sveltekit|procfile>` flag 以限定运行哪些 probes（例如为 Next 跳过 `config/puma.rb`）。Type 是 classification，不是 path，因此 flag form 合理且可与 positional path 区分
- 接受 optional `--port <n>` flag 作为 explicit override（存在时立即 emit，先于任何 probing）
- Probe order（probe 顺序，first hit wins）：
  1. 显式 `--port` flag
  2. Framework config: `next.config.*` / `vite.config.*` / `nuxt.config.*` / `astro.config.*` - 对 `port:\s*["']?[0-9]+["']?` 或 `server.port\s*=\s*[0-9]+` 使用 conservative regex。只接受 numeric literals；reject value 为 variable reference 的 matches（例如 `process.env.PORT`、`getPort()`），避免 emit misleading default
  3. Rails：`config/puma.rb` `port\s+[0-9]+`
  4. Procfile：扫描 `Procfile.dev` 的 `web:` line，查找 `-p <n>` / `--port <n>`
  5. `docker-compose.yml`: service named `web` / `app` / `frontend` 下，`ports:` 中第一行 `"<n>:<n>"`
  6. `package.json` 的 `dev`/`start` script，查找 `--port <n>` / `-p <n>`
  7. `.env*` files: 按 override order **`.env.local` -> `.env.development` -> `.env`** 检查（first hit wins，匹配多数 JS frameworks 的 convention：`.env.local` overrides `.env.development` overrides `.env`）。Parse `PORT=<n>`，strip surrounding `"` 或 `'`，并在 trimming whitespace 后截断 `#`
  8. Framework default（由 lookup table emit：rails/next/nuxt/remix=3000，vite/sveltekit=5173，astro=4321，procfile=3000，unknown=3000）
- 在 stdout emit resolved port as single line。**不 emit provenance** - stderr 保留给 `ERROR:` messages，匹配 `read-launch-json.sh` 和 `parse-checklist.sh` 中现有 convention。如果未来 debugging demand 出现，在 follow-up 中添加 `--verbose` mode，而不是 speculative。
- Rewrite `dev-server-detection.md`：移除 inline bash cascade；该文件成为 navigable pointer（"Port resolution runs via `scripts/resolve-port.sh`"），同时保留 framework-default table 和 probe-order rationale。加入 explicit **sync-note block**，列出与 `test-browser` inline cascade 的三个 intentional divergences：(a) quote stripping on `.env` values，(b) comment stripping on `.env` values，(c) removal of the `AGENTS.md`/`CLAUDE.md` grep。该 block 告诉 future maintainer 在任一 skill 中什么不应被 "fix" 回对称
- **Header comment requirements:** 记录 probe-order rationale（config-before-prose）、`.env` parsing contract（quote + comment stripping），以及有意省略 `AGENTS.md`/`CLAUDE.md` grepping 的原因

**执行备注:** Test-first - `.env` parsing bugs 是重点。先写 quoted、single-quoted、comment-trailed、whitespace-padded 和 multi-line forms 的 cases，再实现。

**遵循的模式:**
- `references/dev-server-detection.md` 中 existing cascade for probe order（improved, not replaced wholesale）
- `scripts/parse-checklist.sh` for bash regex patterns and awk/sed composition
- `scripts/read-launch-json.sh` for sentinel conventions and stderr-for-diagnostics

**测试场景:**
- Happy path：显式 `--port 8080` -> `8080`
- Happy path：带 `port: 4000` 的 `next.config.js` -> `4000`
- Happy path：带 `server: { port: 4000 }` 的 `next.config.ts` -> `4000`
- Happy path：带 `port 3001` 的 `config/puma.rb` -> `3001`（rails type）
- Happy path（正常路径）：`Procfile.dev` `web: bundle exec puma -p 4567` -> `4567`
- Happy path：`docker-compose.yml` 包含 `web:\n  ports:\n    - "9000:9000"` -> `9000`
- Happy path（正常路径）：`package.json` `"dev": "next dev --port 4000"` -> `4000`
- 边界情况：`.env` `PORT=3001` -> `3001`
- 边界情况：`.env` `PORT="3001"` -> `3001`（quotes stripped）
- 边界情况：`.env` `PORT='3001'` -> `3001`（single quotes stripped）
- 边界情况：`.env` `PORT=3001 # dev only` -> `3001`（comment stripped）
- 边界情况：`.env` `PORT="3001" # quoted+commented` -> `3001`
- 边界情况：`.env` `  PORT = 3001  ` -> `3001`（whitespace tolerated）
- 边界情况：`.env.local` `PORT=4000` + `.env` `PORT=3000` both present -> `4000`（`.env.local` precedence）
- 边界情况：`.env.development` `PORT=4000` + `.env` `PORT=3000` both present -> `4000`（`.env.development` precedence）
- 边界情况：`.env.local` `PORT=4000` + `.env.development` `PORT=5000` both present -> `4000`（`.env.local` beats `.env.development`）
- 边界情况：multiple probes hit - framework config wins over `.env`（priority order）
- 边界情况：no probe matches, `--type next` -> `3000`（default）
- 边界情况：no probe matches, `--type vite` -> `5173`
- 边界情况：no probe matches, `--type astro` -> `4321`
- 边界情况：no probe matches, no `--type` -> `3000`（unknown default）
- Error path（错误路径）：malformed `docker-compose.yml` - probe misses, falls through（no crash）
- Error path（错误路径）：computed port（`port: getPort()`）的 `next.config.js` - regex misses, falls through
- Error path（错误路径）：`next.config.js` with `port: process.env.PORT || 3000` - probe rejects variable reference and falls through to `.env` / default（不把 `3000` 当 framework-config hit emit）
- Error path（错误路径）：positional path does not exist -> stderr `ERROR:` + exit 1（operational failure, not a fall-through）
- 回归测试：`AGENTS.md` mentioning port `8443` in prose - ignored（grep removed）
- 回归测试：`CLAUDE.md` mentioning `localhost:3000` in examples - ignored

**验证:**
- 全部 20+ test scenarios pass
- 在 plugin 自身 repo root 运行返回 `3000`（default，因为无 framework config）
- 针对 synthetic Rails repo（`config/puma.rb port 3001`）运行返回 `3001`
- `dev-server-detection.md` 不再包含 inline shell；它描述 probe order 和 framework-default table

- [x] **Unit 5: 将 new scripts 和 signatures 接入 SKILL.md Phase 3**

**目标:** SKILL.md Phase 3.2 路由四个 new types 并处理 `<type>@<cwd>` format；Phase 3.3 将 package-manager + cwd substitute 到 stubs；port resolution 调用 `resolve-port.sh`，而不是 inline cascade。

**需求:** R1, R2, R3, R4, R5

**依赖:** Units 1-4（recipes、signatures、resolvers 都已存在）

**文件:**
- 修改: `plugins/compound-engineering/skills/ce-polish-beta/SKILL.md`（Phase 3.2 routing table、Phase 3.3 stub-writer logic、bottom references list）

**做法:**
- Phase 3.2 routing table 增加四行 new rows（nuxt、astro、remix、sveltekit）
- Phase 3.2 在 table 下添加 paragraph："When the detector returns `<type>@<cwd>`, route by `<type>` as usual, and carry `<cwd>` into the stub-writer for Phase 3.3. When the detector returns `multiple:<type1>@<cwd1>,<type2>@<cwd2>,...`, the interactive prompt lists the `<type>@<cwd>` pairs and asks the user to pick one; headless mode emits the standard `multiple` failure with the pair list appended."
- Phase 3.3 stub-writer logic 更新："For Next/Vite/Nuxt/Astro/Remix/SvelteKit stubs, call `resolve-package-manager.sh` (passing `<cwd>` as the positional arg when present) and substitute the emitted binary and args into `runtimeExecutable` / `runtimeArgs`. When the detector emitted `<type>@<cwd>`, populate the stub's `cwd` field with that value. For port, call `resolve-port.sh [<cwd>] --type <type>` and substitute the emitted port."
- SKILL.md 底部 references list 增加三个 new reference files（Unit 1）和两个 new scripts（Units 3 and 4）
- "Cascade" section 中保留 `dev-server-detection.md` reference，但 description 改为 "Port-resolution documentation — the runtime path is `scripts/resolve-port.sh`"

**遵循的模式:**
- Existing Phase 3.2 table structure and prose（保持 table format，添加 rows）
- Existing Phase 3.3 stub-writer prose（保持 imperative style，添加 substitution bullets）
- Existing reference list at SKILL.md bottom（scripts/references groups 内 alphabetic）

**测试场景:**
- Test expectation: none - SKILL.md content 由模型 consume。其 documented behavior 由 Units 2、3 和 4 unit tests assert。

**验证:**
- `bun test tests/skills/ce-polish-beta-*` passes（all old + new tests green）
- `bun run release:validate` passes（SKILL.md structure intact，无 broken references）
- 读取 SKILL.md Phase 3 start-to-finish，reader 可 trace："detector says `next@apps/web`" -> "Phase 3.3 substitutes pm+port+cwd from resolvers into Next stub" -> "final stub has `cwd: apps/web`, `runtimeExecutable: pnpm`, `port: 3001`"
- 四个 new reference files 和两个 new scripts 出现在 SKILL.md references list

## 高层技术设计

> *这说明预期做法，并作为 review 的方向性指导，而不是实现规范。实现 agent 应把它当作上下文，而不是要逐字复刻的代码。*

**修复后 Phase 3 的数据流:**

```
    .claude/launch.json exists? ──yes──▶ use it verbatim ──▶ Phase 3.5
          │
          no
          ▼
    detect-project-type.sh
          │
          ├─ rails | next | vite | procfile | nuxt | astro | remix | sveltekit
          │         │
          │         ▼
          │    load references/dev-server-<type>.md
          │    (recipe: command, default port, gotchas)
          │
          ├─ <type>@<cwd>     (monorepo hit, depth ≤ 3)
          │         │
          │         ▼
          │    load recipe + remember cwd for stub-writer
          │
          ├─ multiple[:<type>@<cwd>,...]   (disambiguation needed)
          │         │
          │         ▼
          │    interactive: user picks <type>@<cwd> pair
          │    headless: fail with pair list
          │
          └─ unknown          (no signature anywhere in scan scope)
                    │
                    ▼
               interactive: ask for exec/args/port
               headless: fail

    ── stub-writer (Phase 3.3) ──────────────────────────

    pm = resolve-package-manager.sh [<cwd>]   (Next/Vite/Nuxt/Astro/Remix/SvelteKit)
    port = resolve-port.sh [<cwd>] --type <type>

    stub = template(type).with(
             runtimeExecutable = pm.bin,
             runtimeArgs       = pm.args,
             port              = port,
             cwd               = cwd if present
           )
```

**`resolve-port.sh` 的 probe order（first hit wins）:**

| Rank | Source | 排序原因 |
|------|--------|----------------|
| 1 | Explicit CLI `--port` | 用户意图最权威 |
| 2 | Framework config (`next.config.*` / `vite.config.*` / `nuxt.config.*` / `astro.config.*`) | Framework 自身读取这里 |
| 3 | `config/puma.rb` (rails only) | Rails server 实际绑定这里 |
| 4 | `Procfile.dev` web line | `bin/dev` / foreman 实际运行的内容 |
| 5 | `docker-compose.yml` web service ports | Container port binding，在 Docker-first dev 中通常权威 |
| 6 | `package.json` `dev`/`start` scripts | fallback 到 npm-style CLI flags |
| 7 | `.env*` (quote- and comment-stripped) | 常用 Env override |
| 8 | Framework default | 最后 fallback，使用 documented table |

## 系统级影响

- **Interaction graph:** Phase 3.2 routing consume detector output；Phase 3.3 stub-writer consume resolver output。无其他 phases touch 这些 scripts。Headless mode 的 "never mutate state" invariant 保持不变，因为所有 new scripts 都是 read-only probes。
- **Error propagation:** New scripts 遵循 sentinel-on-stdout + exit-code convention。Phase 3 已处理来自 `read-launch-json.sh` 的 sentinel outputs；new sentinels（`__NO_PACKAGE_JSON__`）集成到相同 handler shape。Unknown probes fall through to framework defaults（与今日相同），而不是 erroring。
- **State lifecycle risks:** 无。没有 persisted state changes；stub-writer 只在 interactive mode 且用户 consent 时写 `.claude/launch.json`（Phase 3.3 existing behavior, preserved）。
- **API surface parity:** 不适用 - 这是 skill-internal detection subsystem。Skill 的 public contract（argument tokens、`checklist.md` format、headless envelope shape）不变。
- **Integration coverage:** Unit 5 verification 明确 trace 一个 full monorepo + pnpm + custom-port scenario end-to-end，以捕获 per-unit tests 可能漏掉的 integration bugs。
- **未改变的 invariants:**
  - `.claude/launch.json` 始终 wins over auto-detect（Phase 3.1 unchanged）
  - root 处 `rails` 仍 beats `procfile`（existing precedence preserved）
  - Headless mode 仍 never writes `.claude/launch.json`
  - 与 `test-browser` 的 cross-skill `dev-server-detection.md` duplication note 仍是 manual-sync；本 plan 不修改 `test-browser`

## 风险与依赖

| 风险 | 缓解 |
|------|------|
| Monorepo probe false-positive（例如 fixture directory 中的 config） | Probe 的 exclusion list（`node_modules`、`fixtures` 等）；depth cap 3；`multiple` output 仍触发 user disambiguation |
| Framework config regex misses a valid port（例如 computed expression） | Fall through 到 `.env` 再到 framework default - 与今日相同，只是增加了捕获 literal 的机会。记录为 best-effort |
| Package-manager resolver picks wrong PM（例如 pnpm-migrated repo 中 stale `yarn.lock`） | Priority order 遵循 common-case lockfile precedence；用户可通过 `launch.json` override。记录在 resolver header comment 中 |
| New test files slow the suite | 每个 new test file 添加约 10-20 cases，使用 existing tmp-repo harness（在 `ce-polish-beta-dev-server.test.ts` 中已很快）；预计 measurable impact < 2 秒 |
| Changing `dev-server-detection.md` breaks a downstream reader | 该文件只在 skill 内部 referenced；无 external consumers。Grep confirms no cross-skill references before the change lands |
| Dropping `AGENTS.md`/`CLAUDE.md` port grep regresses users relying on it | 很低 - grep 最初 speculative 加入，且 lossy pattern（`localhost:3000` match）更可能在 wild 中 surface wrong values，而不是 correct ones。Explicit `--port` 和 `.claude/launch.json` 都仍是 override paths |
| Polish 的 `resolve-port.sh` 与 `test-browser` 的 inline cascade diverge 且 silent drift | Unit 4 在 `dev-server-detection.md` 内添加 explicit sync-note block，列出三项 intentional divergences（quote stripping、comment stripping、no `AGENTS.md`/`CLAUDE.md` grep）。未来 maintainer 若想通过复制 polish cascade 到 `test-browser` 或反过来 "fix" symmetry，会先遇到 sync-note。无 automated cross-skill check - 因两 skills 都内部使用且 cascade 小，可接受 |

## 文档 / 运营备注

- 更新 #568（或 follow-up PR）的 PR description，说明这些 gaps 已 fixed 并引用本 plan
- 无 marketplace release entry、version bump 或 CHANGELOG edit - release-please handles it
- 无 skill 自身 reference tree 之外的 user-facing docs
- 保留 `dev-server-detection.md` 作为 navigable doc，解释 probe order + framework defaults，尽管 implementation 现在位于 `resolve-port.sh`。Reviewers debug port issues 时仍会先进入该文件

## 来源与参考

- **来源:** @tmchow 在 EveryInc/compound-engineering-plugin#568 的 PR feedback（[comment](https://github.com/EveryInc/compound-engineering-plugin/pull/568#issuecomment-4254733274)）
- **上一份 plan:** `docs/plans/2026-04-15-001-feat-ce-polish-skill-plan.md`（此 fix 所修复的 feature）
- **相关文件:**
  - `plugins/compound-engineering/skills/ce-polish-beta/scripts/detect-project-type.sh`
  - `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-detection.md`
  - `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-next.md`
  - `plugins/compound-engineering/skills/ce-polish-beta/references/dev-server-vite.md`
  - `plugins/compound-engineering/skills/ce-polish-beta/references/launch-json-schema.md`
  - `plugins/compound-engineering/skills/ce-polish-beta/SKILL.md` (Phase 3)
- **Test harness pattern（test harness 模式）：** `tests/skills/ce-polish-beta-dev-server.test.ts`
