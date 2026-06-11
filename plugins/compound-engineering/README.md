# Compounding Engineering Plugin（Compound Engineering Plugin）

每次使用都会变得更聪明的 AI-powered development tools。让每个工程工作单元都比上一个更容易。

## Getting Started（开始使用）

安装后，在任意 project 中运行 `/ce-setup`。它会诊断你的 environment、安装缺失工具，并在一个交互式流程中 bootstrap project config。

## Components（组件）

| Component（组件） | Count（数量） |
|-----------|-------|
| Agents | 43 |
| Skills | 39 |

## Skills（Skills，技能）

Skills 是工程工作的主要入口，以 slash commands 调用。许多 skills 的详细 user-facing documentation 位于 [`docs/skills/`](../../docs/skills/)；下面带链接的 skill 名会指向对应页面（purpose、novel mechanics、use cases、chain position）。没有独立 docs 的 skills 仍会列出；source tree 中的 `SKILL.md` 是权威说明。

### Core Workflow（核心 workflow）

`ce-strategy` 在上游锚定 loop；`ce-product-pulse` 用 user outcomes 的读取来闭环。

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-strategy`](../../docs/skills/ce-strategy.md) | 创建或维护 `STRATEGY.md`，记录产品的 target problem、approach、persona、key metrics 和 tracks。可重复运行以更新。`/ce-ideate`、`/ce-brainstorm`、`/ce-plan` 会在它存在时读取作为 grounding |
| [`/ce-ideate`](../../docs/skills/ce-ideate.md) | 可选 big-picture ideation：生成并严格评估 grounded ideas，然后把最强的一个 route into brainstorming。默认将 ranked ideation artifact 写成单个 self-contained HTML file（面向 human readers）；传入 `output:md` 可写成 markdown（互斥：html 或 md，永远不会两者同时生成） |
| [`/ce-brainstorm`](../../docs/skills/ce-brainstorm.md) | 通过交互式 Q&A 思考 feature 或 problem，并在 planning 前写出尺寸合适的 requirements doc。传入 `output:html` 可把 doc 写成单个 self-contained HTML file，而不是 markdown（互斥：md 或 html，不会两者同时生成） |
| [`/ce-plan`](../../docs/skills/ce-plan.md) | 为任何 multi-step task 创建结构化 plans，包括 software features、research workflows、events、study plans，并自动进行 confidence checking。传入 `output:html` 可把 plan 写成单个 self-contained HTML file，而不是 markdown（互斥：md 或 html，不会两者同时生成） |
| [`/ce-code-review`](../../docs/skills/ce-code-review.md) | 使用 tiered persona agents、confidence gating 和 dedup pipeline 的 structured code review |
| [`/ce-work`](../../docs/skills/ce-work.md) | 系统执行 work items |
| [`/ce-debug`](../../docs/skills/ce-debug.md) | 系统找出 root causes 并修复 bugs；追踪 causal chains，形成 testable hypotheses，并实现 test-first fixes |
| [`/ce-compound`](../../docs/skills/ce-compound.md) | 记录已解决的问题，让 team knowledge compound |
| [`/ce-compound-refresh`](../../docs/skills/ce-compound-refresh.md) | 刷新 stale 或 drifting learnings，并决定 keep、update、replace 或 archive |
| [`/ce-optimize`](../../docs/skills/ce-optimize.md) | 用 parallel experiments、measurement gates 和 LLM-as-judge quality scoring 运行 iterative optimization loops |
| [`/ce-product-pulse`](../../docs/skills/ce-product-pulse.md) | 生成单页、time-windowed report，覆盖 usage、performance、errors 和 followups。保存到 `docs/pulse-reports/`，形成可浏览的用户体验 timeline |

### Research & Context（研究与 context）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-sessions`](../../docs/skills/ce-sessions.md) | 查询 Claude Code、Codex 和 Cursor 的 session history |
| [`/ce-slack-research`](../../docs/skills/ce-slack-research.md) | 搜索 Slack 中已解释的 organizational context，包括 decisions、constraints 和 discussion arcs |
| [`ce-riffrec-feedback-analysis`](../../docs/skills/ce-riffrec-feedback-analysis.md) | 把 [Riffrec](https://github.com/kieranklaassen/riffrec) recordings、videos、audio 或 notes 转换为 structured feedback。会在 setup、quick bug report 和 extensive analysis 之间 route，并 hand off 给 `ce-brainstorm` |

### Git Workflow（Git workflow，Git 工作流）

| Skill | Description（说明） |
|-------|-------------|
| [`ce-clean-gone-branches`](../../docs/skills/ce-clean-gone-branches.md) | 清理 remote tracking branch 已消失的 local branches |
| [`ce-commit`](../../docs/skills/ce-commit.md) | 用表达价值的 message 创建 git commit |
| [`ce-commit-push-pr`](../../docs/skills/ce-commit-push-pr.md) | Commit、push 并打开带 adaptive description 的 PR；也可更新现有 PR description，或只生成 description 而不 commit |
| [`ce-worktree`](../../docs/skills/ce-worktree.md) | 管理 Git worktrees 以支持 parallel development |

### Workflow Utilities（Workflow 工具）

| Skill | Description（说明） |
|-------|-------------|
| [`/ce-demo-reel`](../../docs/skills/ce-demo-reel.md) | 为 PRs 捕获 visual demo reel（GIF demos、terminal recordings、screenshots），并按 project type 选择 tier |
| [`/ce-promote`](../../docs/skills/ce-promote.md) | 为已发布 feature 起草 user-facing announcement copy（X post、changelog blurb、LinkedIn、email）；安装 Spiral CLI 时进行 voice matching，未安装时提供轻量 editorial & social expertise |
| [`/ce-report-bug`](../../docs/skills/ce-report-bug.md) | 报告 compound-engineering plugin 的 bug |
| [`/ce-resolve-pr-feedback`](../../docs/skills/ce-resolve-pr-feedback.md) | 并行处理 PR review feedback |
| [`/ce-test-browser`](../../docs/skills/ce-test-browser.md) | 在 PR 影响的 pages 上运行 browser tests |
| [`/ce-test-xcode`](../../docs/skills/ce-test-xcode.md) | 使用 XcodeBuildMCP 在 simulator 上 build 和 test iOS apps |
| [`/ce-setup`](../../docs/skills/ce-setup.md) | 诊断 environment、安装缺失工具并 bootstrap project config |
| [`/ce-update`](../../docs/skills/ce-update.md) | 检查 compound-engineering plugin version 并修复 stale cache（仅 Claude Code） |
| [`/ce-release-notes`](../../docs/skills/ce-release-notes.md) | 总结最近的 compound-engineering plugin releases，或带 version citation 回答过去 release 的问题 |

### Development Frameworks（开发框架）

| Skill | Description（说明） |
|-------|-------------|
| `ce-agent-native-architecture` | 使用 prompt-native architecture 构建 AI agents |
| `ce-dhh-rails-style` | 用 DHH 的 37signals 风格编写 Ruby/Rails 代码 |
| [`ce-frontend-design`](../../docs/skills/ce-frontend-design.md) | 创建 production-grade frontend interfaces |
| [`ce-polish`](../../docs/skills/ce-polish.md) | 对话式 UX polish：启动 dev server、在 browser 中打开 feature，并共同迭代；自动检测 8 种 frameworks。仅手动调用 |

### Review & Quality（Review 与质量）

| Skill | Description（说明） |
|-------|-------------|
| [`ce-doc-review`](../../docs/skills/ce-doc-review.md) | 使用 parallel persona agents review documents，产出 role-specific feedback |
| [`/ce-simplify-code`](../../docs/skills/ce-simplify-code.md) | 简化 recent code changes，提升 reuse、quality 和 efficiency；parallel reviewers 找问题，应用 fixes，并用 tests 验证 behavior |

### Content & Collaboration（内容与协作）

| Skill | Description（说明） |
|-------|-------------|
| [`ce-proof`](../../docs/skills/ce-proof.md) | 通过 Proof collaborative editor 创建、编辑和 share documents |

### Automation & Tools（Automation 与工具）

| Skill | Description（说明） |
|-------|-------------|
| `ce-gemini-imagegen` | 使用 Google 的 Gemini API 生成和编辑图片 |

### Beta / Experimental（Beta / 实验性）

| Skill | Description（说明） |
|-------|-------------|
| `ce-dogfood-beta` | 对 active branch 做 diff-scoped browser QA：构建每个 change 的 exhaustive test matrix，用 agent-browser 驱动 app，然后 auto-fix issues、添加 regression tests，并为每个 fix commit，直到 green |
| `/lfg` | 完整 autonomous engineering workflow |

## Agents（Agents，代理）

Agents 是由 skills 调用的 specialized subagents；通常不直接调用它们。

### Review（Review，代码 Review）

| Agent | Description（说明） |
|-------|-------------|
| `ce-agent-native-reviewer` | 验证 features 是否 agent-native（action + context parity） |
| `ce-api-contract-reviewer` | 检测 breaking API contract changes |
| `ce-architecture-strategist` | 分析 architectural decisions 和 compliance |
| `ce-code-simplicity-reviewer` | 做 simplicity 和 minimalism 的最终检查 |
| `ce-correctness-reviewer` | 检查 logic errors、edge cases、state bugs |
| `ce-data-integrity-guardian` | 关注 database migrations 和 data integrity |
| `ce-data-migration-reviewer` | 检查 schema drift、migration safety、mapping verification、deploy-window |
| `ce-deployment-verification-agent` | 为高风险 data changes 创建 Go/No-Go deployment checklists |
| `ce-julik-frontend-races-reviewer` | Review JavaScript/Stimulus code 中的 race conditions |
| `ce-maintainability-reviewer` | 检查 coupling、complexity、naming、dead code |
| `ce-pattern-recognition-specialist` | 分析代码中的 patterns 和 anti-patterns |
| `ce-performance-oracle` | Performance analysis 和 optimization |
| `ce-performance-reviewer` | 带 confidence calibration 的 runtime performance review |
| `ce-reliability-reviewer` | Production reliability 和 failure modes |
| `ce-security-reviewer` | 带 confidence calibration 的 exploitable vulnerabilities review |
| `ce-security-sentinel` | Security audits 和 vulnerability assessments |
| `ce-swift-ios-reviewer` | Swift 和 iOS code review，包括 SwiftUI state、retain cycles、concurrency、Core Data threading、accessibility |
| `ce-testing-reviewer` | 检查 test coverage gaps 和 weak assertions |
| `ce-project-standards-reviewer` | 检查 CLAUDE.md 和 AGENTS.md compliance |
| `ce-adversarial-reviewer` | 构造跨 component boundaries 的 failure scenarios 来打破 implementations |

### Document Review（文档 Review）

| Agent | Description（说明） |
|-------|-------------|
| `ce-coherence-reviewer` | Review documents 的 internal consistency、contradictions 和 terminology drift |
| `ce-design-lens-reviewer` | Review plans 是否缺少 design decisions、interaction states 和 AI slop risk |
| `ce-feasibility-reviewer` | 评估 proposed technical approaches 是否经得起现实检验 |
| `ce-product-lens-reviewer` | 挑战 problem framing、评估 scope decisions、指出 goal misalignment |
| `ce-scope-guardian-reviewer` | 挑战 unjustified complexity、scope creep 和 premature abstractions |
| `ce-security-lens-reviewer` | 在 plan level 评估 security gaps（auth、data、APIs） |
| `ce-adversarial-document-reviewer` | 挑战 premises、暴露 unstated assumptions，并 stress-test decisions |

### Research（研究）

| Agent | Description（说明） |
|-------|-------------|
| `ce-best-practices-researcher` | 收集 external best practices 和 examples |
| `ce-framework-docs-researcher` | 研究 framework documentation 和 best practices |
| `ce-git-history-analyzer` | 分析 git history 和 code evolution |
| `ce-issue-intelligence-analyst` | 分析 GitHub issues，提炼 recurring themes 和 pain patterns |
| `ce-learnings-researcher` | 搜索 institutional learnings，找到相关 past solutions |
| `ce-repo-research-analyst` | 研究 repository structure 和 conventions |
| `ce-session-historian` | 搜索过去 Claude Code、Codex 和 Cursor sessions，寻找相关 investigation context |
| `ce-slack-researcher` | 搜索 Slack，寻找与当前 task 相关的 organizational context |
| `ce-web-researcher` | 执行 iterative web research，并返回 structured external grounding（prior art、adjacent solutions、market signals、cross-domain analogies） |

### Design（Design，设计）

| Agent | Description（说明） |
|-------|-------------|
| `ce-design-implementation-reviewer` | 验证 UI implementations 是否匹配 Figma designs |
| `ce-design-iterator` | 通过系统化 design iterations 迭代 refine UI |
| `ce-figma-design-sync` | 同步 web implementations 与 Figma designs |

### Workflow（Workflow，工作流）

| Agent | Description（说明） |
|-------|-------------|
| `ce-pr-comment-resolver` | 处理 PR comments 并实现 fixes |
| `ce-spec-flow-analyzer` | 分析 user flows 并识别 specifications 中的 gaps |

### Docs（Docs，文档）

| Agent | Description（说明） |
|-------|-------------|
| `ce-ankane-readme-writer` | 按 Ankane-style template 为 Ruby gems 创建 READMEs |

## Installation（安装）

当前跨 Claude Code、Codex、Cursor、Copilot、Droid、Qwen 和 converter-backed targets 的安装说明，见 repo root 的 [Install section](../../README.md#install)。

然后运行 `/ce-setup` 检查 environment 并安装推荐工具。

## Version History（版本历史）

Canonical release history 见 repo root 的 [CHANGELOG.md](../../CHANGELOG.md)。

## License（License，许可证）

MIT
