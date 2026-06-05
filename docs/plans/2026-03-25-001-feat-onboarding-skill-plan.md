---
title: "feat: 添加 onboarding skill，通过 repo crawl 生成 ONBOARDING.md"
type: feat
status: complete
date: 2026-03-25
origin: docs/brainstorms/2026-03-25-vonboarding-skill-requirements.md
---

# feat: 添加 onboarding skill，通过 repo crawl 生成 ONBOARDING.md

## 概览

向 compound-engineering plugin 添加 `/onboarding` skill，它会 crawl repository，并在 repo root 生成 `ONBOARDING.md`。该 skill 使用 bundled inventory script 做 deterministic data gathering，用 model judgment 做 narrative synthesis，产出一份帮助新 contributors 理解 codebase 的文档，而不要求 creator 亲自解释。

## 问题框架

当 codebase 通过 AI-assisted "vibe coding" 构建时，creator 可能并不完全理解自己的 architecture。新 team members 缺少贡献所需的 mental model。onboarding document 从 code 本身重建这个 mental model。

primary audience 是 human developers。能服务 human comprehension 的文档也适合作为 agent context，但反过来不成立。（see origin: `docs/brainstorms/2026-03-25-vonboarding-skill-requirements.md`）

## 需求追踪

- R1. 一个名为 `onboarding` 的 skill，crawl repository 并在 repo root 生成 `ONBOARDING.md`
- R2. skill 始终从零 regenerate full document；不做 surgical updates 或 diffing
- R3. fixed filename（`ONBOARDING.md`）是唯一 state；exists means refresh, doesn't exist means create
- R4. 固定五个 sections：What is this thing? / How is it organized? / Key concepts / Primary flow / Where do I start?
- R5. 当 existing docs 与某 section 直接相关时 inline-link；不设 separate references section
- R6. 首先面向 human comprehension 编写：clear prose，而不是 structured data
- R7. 在 visual aids（ASCII diagrams、markdown tables）能提升 readability over prose 时使用
- R8. 全文使用 proper markdown formatting：file names、paths、commands、code references 和 technical terms 用 backticks

## 范围边界

- 不 infer 或 fabricate design rationale
- 不评估 fragility 或 risk areas
- 不生成 README.md、CLAUDE.md、AGENTS.md 或其他 document
- 不保留 previous version 中的 hand-edits
- 无 `ce:` prefix -- standalone utility skill
- 不新增 agents -- skill 使用 bundled script 加 model 自己的 file-reading 和 writing capabilities

## 上下文与研究

### 相关代码与模式

- Skills 位于 `plugins/compound-engineering/skills/<name>/SKILL.md`，可选 `scripts/`、`references/`、`assets/` directories
- Skills 从 directory structure auto-discovered -- 不在 `plugin.json` 中 registration
- SKILL.md 需要 YAML frontmatter，包含 `name` 和 `description` fields
- Arguments 通过 XML tag 中的 `#$ARGUMENTS` interpolation 接收
- Platform-agnostic interaction：使用 capability-class tool descriptions，并提供 platform hints
- Reference files 必须是 proper markdown links，而不是 bare backtick paths

### 组织内经验

- **Script-first skill architecture**（`docs/solutions/skill-design/script-first-skill-architecture.md`）：将 deterministic processing 移入 bundled scripts；model 只做 judgment work。节省 60-75% tokens。此处作为 hybrid 使用 -- script gather structural inventory，model 读取 key files 并写 prose。
- **Compound-refresh skill improvements**（`docs/solutions/skill-design/compound-refresh-skill-improvements.md`）：先 triage 再问（不要问用户要 document 什么）；platform-agnostic tool references；subagents 应使用 file tools 而不是 shell；不要跨 phases 有 contradictory rules。
- `plugins/compound-engineering/AGENTS.md` 中的 Skill compliance checklist：imperative voice、no second person、cross-platform question tool patterns、markdown-linked references。

## 关键技术决策

- **Hybrid script-first architecture**：inventory script 处理 deterministic work（file tree、manifest parsing、framework detection、entry point identification、doc discovery）。model 处理 judgment work（读取 key files、理解 architecture、trace flows、写 prose）。这遵循 institutional pattern，避免把 tokens 浪费在 mechanical directory traversal 上。

- **No sub-agent dispatch**：五个 sections 相互依赖 -- 理解 architecture 会影响 primary flow，domain terms 会跨 sections 出现。single model pass 比独立 sub-agents 写孤立 sections 更 coherent。inventory script 提供 model 所需的 structural grounding。

- **No `repo-research-analyst` dependency**：该 agent 产出面向 planning skills 的 research-formatted output。使用它会增加一层 indirection（research output -> re-synthesis into human prose）。更简单的 inventory script 给 model raw facts，让它直接为 human audience 写作。

- **Universal inventory script**：script 必须通过 manifests 和 conventional directory locations 检测，可跨任意 language/framework 工作。它不 parse code ASTs，也不读取 file contents -- 这些是 model tasks。

- **No explicit create/refresh mode**：skill 始终 regenerate。SKILL.md 不需要根据 `ONBOARDING.md` 是否存在 branch -- behavior 相同。

## 开放问题

### 规划期间已解决

- **Orchestration strategy**：Single-pass with bundled inventory script。每 section 一个 sub-agent 会造成 overlapping crawls，并丢失 cross-section coherence。document 足够短，适合 one model pass。
- **Primary flow strategy**：由 inventory guide entry point tracing。script 识别 entry points；model 读取 primary one，并沿 imports 和 calls 追踪 main user-facing path。
- **Section depth/length**：不规定 line counts。guiding principle：每个 section 简洁回答其 question，使新人能读完整篇。总阅读时间应少于 10 minutes。
- **Doc relevance heuristic**：writing 时用 model judgment。inventory 列出 existing docs；当 model 写到某 topic 且 discovered doc relevant 时，inline link。无 programmatic relevance scoring。

### 延后到实现阶段

- inventory script output 的 exact JSON schema -- 写 script 并针对 real repos 时 refine shape
- 每个 ecosystem 要检查哪些 conventional entry point locations -- script implementation 时 enumerate
- SKILL.md 中 section writing guidance 的精确 wording -- implementation 中迭代

## 实现单元

- [ ] **Unit 1：创建 inventory script**

  **目标：** 构建 Node.js script，生成任意 repository 的 structured JSON inventory，让 model 有 map 可用，而不把 tokens 消耗在 directory traversal 上。

  **需求：** R1（crawl mechanism）, R5（doc discovery）

  **依赖：** 无

  **文件：**
  - 新增：`plugins/compound-engineering/skills/onboarding/scripts/inventory.mjs`
  - 测试：`tests/onboarding-inventory.test.ts`

  **做法：**

  script 接受 optional `--root <path>` argument（默认 cwd），向 stdout 写 JSON。收集：

  - **Project identity（项目身份）**：从最近的 manifest 获取 name（package.json `name`、Cargo.toml `[package].name`、go.mod module path 等），fallback 到 directory name。
  - **Languages and frameworks（语言与框架）**：从 manifest files 检测，使用与 `repo-research-analyst` Phase 0.1 相同的 ecosystem mapping table。从每个 found manifest 抽取 language、major framework dependencies 和 versions。可检测时包含 package manager 和 test framework。
  - **Directory structure（目录结构）**：Top-level directories，以及 `src/`、`lib/`、`app/`、`pkg/`、`internal/`（或 equivalents）下一层。限制为最多 2 层深度。排除 `node_modules/`、`.git/`、`vendor/`、`target/`、`dist/`、`build/`、`__pycache__/`、`.next/`、`.cache/` 和其他 common build/dependency directories。
  - **Entry points（入口点）**：按 detected ecosystem 检查 conventional locations：
  - Node/TS：`src/index.*`, `src/main.*`, `src/app.*`, `index.*`, `server.*`, `app.*`, `pages/`, `app/`（Next.js）
    - Python：`main.py`, `app.py`, `manage.py`, `src/<project>/`, `__main__.py`
    - Ruby：`config/routes.rb`, `app/controllers/`, `bin/rails`, `config.ru`
    - Go：`main.go`, `cmd/*/main.go`
    - Rust：`src/main.rs`, `src/lib.rs`
    - General（通用）：`Makefile`, `Procfile` targets
  - **Scripts/commands（脚本/命令）**：从 `package.json` scripts、Makefile targets 或 equivalent 中 extract。重点关注 dev、build、test、start、lint commands。
  - **Existing documentation（现有文档）**：在 repo root 和 common doc directories（`docs/`、`doc/`、`documentation/`、`docs/solutions/`、`wiki/`）中查找 markdown files。只列 paths，不读 contents。
  - **Test infrastructure（测试基础设施）**：检测 test directories 与 config files（`tests/`、`test/`、`spec/`、`__tests__/`、`jest.config.*`、`vitest.config.*`、`.rspec`、`pytest.ini`、`conftest.py`）

  Output shape（方向性说明 -- exact fields will be refined during implementation）：
  ```
  {
    "name": "...",
    "languages": [...],
    "frameworks": [...],
    "packageManager": "...",
    "testFramework": "...",
    "structure": { "topLevel": [...], "srcLayout": [...] },
    "entryPoints": [...],
    "scripts": { ... },
    "docs": [...],
    "testInfra": { "dirs": [...], "config": [...] }
  }
  ```

  script 必须：
  - 只使用 Node.js built-in modules（`fs`、`path`、`child_process` for git-tracked file list if useful）
  - 即使 manifests missing 或 unparseable，也 exit 0 并 output valid JSON（输出有效 JSON）
  - fast（快速）-- 无 network calls、无 AST parsing、bounded directory traversal
  - gracefully handle monorepos（优雅处理 monorepos：列出 workspace structure，不 recurse into every package）

  **遵循的模式：**
  - `skills/claude-permissions-optimizer/scripts/extract-commands.mjs` -- script-first pattern、JSON output、CLI flags、仅使用 Node.js built-ins

  **测试场景：**
  - Script 为 minimal repo（just a README）产生 valid JSON（有效 JSON）
  - Script 从 `package.json` 检测 Node.js ecosystem
  - Script 检测 polyglot repo 中的 multiple languages
  - Script 遵守 directory depth limits（目录深度限制）
  - Script 排除 common build/dependency directories（常见 build/dependency directories）
  - manifests malformed 时，script exits 0 with empty/partial JSON（以空/部分 JSON 退出 0）
  - Script 至少为 Node、Python 和 Ruby ecosystems 找到 entry points
  - Script 能发现 standard locations 中的 docs

  **验证：**
  - 针对 compound-engineering repo 运行 script，产生 sensible output（合理输出）
  - JSON output 可正常 parse，无 error
  - Script 在 typical repo 上 5 秒内完成

- [ ] **Unit 2：创建 SKILL.md**

  **目标：** 编写 skill definition，orchestrate inventory script、guided file reading 和 narrative synthesis，生成 `ONBOARDING.md`。

  **需求：** R1, R2, R3, R4, R5, R6, R7, R8

  **依赖：** Unit 1

  **文件：**
  - 新增：`plugins/compound-engineering/skills/onboarding/SKILL.md`

  **做法：**

  SKILL.md 包含：

  1. **Frontmatter（frontmatter）**: `name: onboarding`，description 覆盖 what it does 与 when to use，`argument-hint` 用于 optional scope/focus hints。

  2. **Execution flow**，包含三个 phases：

     **Phase 1: Gather inventory（收集 inventory）.** 运行 bundled script。Parse JSON output。这给 model structural map，无需读取每个 file。

     **Phase 2: Read key files（读取关键文件）.** 由 inventory 指引，读取理解 codebase 必需的 files：
     - README.md（if exists，若存在）-- project purpose and setup（项目目的和 setup）
     - script 识别出的 primary entry points
     - Route/controller files（理解 primary flow）
     - 揭示 architecture 的 configuration files（例如 docker-compose、database config）
     - discovered documentation files 的 sample（用于 Phase 3 inline linking）

     将 reading cap 在合理文件数（约 10-15 key files），避免 context bloat。entry points 和 routes 优先于 config files。使用 native file-read tool，不用 shell commands。

     **Phase 3: Write ONBOARDING.md（写入 ONBOARDING.md）.** 综合全部信息成五个 sections。每 section guidance：

     - **What is this thing?** -- 从 README、manifest descriptions 和 entry point examination 提取。说明 purpose、who it's for、what problem it solves。无法判断时 plain say so，不 fabricate。
     - **How is it organized?** -- 使用 inventory structure 和 key files 中学到的信息。描述 architecture、key modules 及其连接方式。用 ASCII directory tree 展示 high-level structure。列 modules/responsibilities 时用 markdown table。
     - **Key concepts / domain terms** -- 从 code（class names、module names、database tables、API endpoints）提取 domain vocabulary，并每个用一句话解释。用 markdown table（`| Term | Definition |`）提升 scanability。这些是新人谈论 codebase 所需词汇。
     - **Primary flow** -- 从 user perspective 追踪一条 concrete path。从 app 的主要行为开始（例如 "when a user submits an order..."），然后 walk through code path：哪个 file 处理 request、调用哪些 services、data 存在哪里。用 ASCII flow diagram visualize path（例如 `Request -> Router -> Controller -> Service -> DB`）。每步引用 specific file paths。
     - **Where do I start?** -- 来自 README 或 scripts 的 dev setup。如何 run app、如何 run tests。常见 change types 应从哪里开始（例如 "to add a new API endpoint, look at `src/routes/`"）。列出 2-3 个 most common change patterns。

     对每个 section：如果 discovered documentation file 与 section 正在解释的内容直接相关，inline link 它（例如 "authentication uses token-based middleware -- see `docs/solutions/auth-pattern.md` for details"）。不要创建 separate references section。若无 relevant docs，该 section standalone。

  3. **Quality bar（质量门槛）**: 写 file 前 verify：
     - 每个 section answers its question without padding
     - 无 fabricated design rationale 或 fragility assessments
     - document 中 referenced file paths 实际存在于 inventory
     - prose 面向 human developer，不格式化为 agent-consumable structured data
     - Existing docs 只在 directly relevant 时 inline linked，不收集到 appendix
     - 所有 file names、paths、commands、code references 和 technical terms 使用 backtick formatting
     - Markdown styling 全文一致（headers、bold、code blocks、tables）

  4. **Post-generation options（生成后选项）**: 写完后使用 platform's blocking question tool 提供 options：
     - Open the file for review（打开文件以供 review）
     - Commit the file（commit 该文件）
     - Done（完成）

  **遵循的模式：**
  - `skills/ce-plan/SKILL.md` -- research-then-write orchestration、platform-agnostic tool references
  - `skills/claude-permissions-optimizer/SKILL.md` -- script-first execution pattern
  - `plugins/compound-engineering/AGENTS.md` 中的 Skill compliance checklist

  **测试场景：**
  - skill description 可由 "generate onboarding", "onboard new contributor", "create ONBOARDING.md", "document this codebase for new developers" 触发
  - skill 首先运行 inventory script
  - skill 读取 inventory identified key files（inventory 标识的关键文件），而不是 arbitrary files
  - generated ONBOARDING.md contains exactly five sections（生成的 ONBOARDING.md 正好包含五个 sections）
  - skill 不询问用户要 document 什么 -- 它自主 triage
  - ONBOARDING.md 中 referenced file paths 对应 repo 中真实 files

  **验证：**
  - SKILL.md 通过 compliance checklist（无 hardcoded tool names、imperative voice、markdown-linked scripts、platform-agnostic question patterns）
  - 针对 real repo 运行 skill，会产生包含全部 five sections 的 readable ONBOARDING.md
  - 重新运行 skill 会从零 regenerate file（no diffing or updating behavior）

- [ ] **Unit 3：更新 README 并验证 plugin**

  **目标：** 在 plugin README 中注册 new skill，并验证 plugin consistency。

  **需求：** R1

  **依赖：** Unit 2

  **文件：**
  - 修改：`plugins/compound-engineering/README.md`

  **做法：**

  将 `onboarding` 添加到 README.md 的 **Workflow Utilities** table：

  ```
  | `/onboarding` | Generate ONBOARDING.md to help new contributors understand the codebase |
  ```

  如果 Components table 中 skill count 已不准确（当前 "40+"），更新它。

  **遵循的模式：**
  - 遵循现有 README skill table format and descriptions

  **测试场景：**
  - Skill 出现在正确的 category table 中
  - Description concise（描述简洁），并匹配 SKILL.md description intent
  - Component count accurate（component 数量准确）

  **验证：**
  - `bun run release:validate` passes（通过）
  - README skill count matches actual skill count（README 中的 skill count 与实际 skill count 一致）

## 系统级影响

- **Interaction graph（交互图）:** skill standalone -- 无 callbacks、middleware 或 cross-skill dependencies。其他 skills 不调用它。
- **Error propagation（错误传播）:** 如果 inventory script fails（malformed JSON、permission error），skill 应 report error 并 stop，而不是基于 incomplete data 写 ONBOARDING.md。
- **API surface parity（API surface 对等）:** skill 输出 file，而不是 API。无 parity concerns。
- **Integration coverage（集成覆盖）:** 针对 real repo 的 manual testing 是 primary integration check。inventory script 有 unit tests。

## 风险与依赖

- **Inventory script universality（inventory script 通用性）**: script 需要处理任意 language/framework repos。Risk：较少见 stacks 的 ecosystem detection 有 edge cases。Mitigation：从最常见 ecosystems（Node、Python、Ruby、Go、Rust）开始，其他 degrade gracefully（仍 produce structure and docs，只跳过 framework-specific entry point detection）。
- **Output quality variance（输出质量波动）**: ONBOARDING.md quality 高度依赖 model synthesis ability，随 codebase complexity 变化。Mitigation：SKILL.md 中 quality bar 设定清晰 expectations，five-section structure 限制 scope。
- **Token budget（token 预算）**: large codebases 可能产生 large inventories 或需要读取很多 files。Mitigation：inventory script caps directory depth，SKILL.md caps file reading at ~10-15 key files。

## 来源与参考

- **来源文档：** [docs/brainstorms/2026-03-25-vonboarding-skill-requirements.md](../brainstorms/2026-03-25-vonboarding-skill-requirements.md)
- Script-first architecture（script-first 架构）：[docs/solutions/skill-design/script-first-skill-architecture.md](../solutions/skill-design/script-first-skill-architecture.md)
- Compound-refresh learnings（compound-refresh learnings）：[docs/solutions/skill-design/compound-refresh-skill-improvements.md](../solutions/skill-design/compound-refresh-skill-improvements.md)
- Repo-research-analyst agent（repo-research-analyst agent）：`plugins/compound-engineering/agents/research/ce-repo-research-analyst.agent.md`
- Skill compliance checklist（skill 合规 checklist）：`plugins/compound-engineering/AGENTS.md`
