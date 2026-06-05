# Persona Catalog（Persona 目录）

14 个 reviewer personas 分为 always-on、cross-cutting conditional 和 stack-specific conditional layers，另有 CE-specific agents。Orchestrator 使用此 catalog 选择每次 review 要 spawn 哪些 reviewers。

## Always-on（始终启用，4 personas + 2 CE agents）

每次 review 都 spawn，无论 diff content 如何。

**Persona agents（persona agents，结构化 JSON 输出）：**

| Persona | Agent | Focus（关注点） |
|---------|-------|-------|
| `correctness` | `ce-correctness-reviewer` | Logic errors、edge cases、state bugs、error propagation、intent compliance |
| `testing` | `ce-testing-reviewer` | Coverage gaps、weak assertions、brittle tests、missing edge case tests |
| `maintainability` | `ce-maintainability-reviewer` | Structural quality、complexity deletion、1k-line regressions、coupling、type-boundary leaks、dead code、premature abstraction |
| `project-standards` | `ce-project-standards-reviewer` | CLAUDE.md 与 AGENTS.md compliance -- frontmatter、references、naming、cross-platform portability、tool selection |

**CE agents（unstructured output，单独 synthesize）：**

| Agent | Focus（关注点） |
|-------|-------|
| `ce-agent-native-reviewer` | 验证 new features 是否 agent-accessible |
| `ce-learnings-researcher` | 搜索 docs/solutions/ 中与此 PR modules 和 patterns 相关的 past issues |

## Conditional（条件启用，7 personas）

当 orchestrator 在 diff 中识别出 relevant patterns 时 spawn。Orchestrator 会读取 full diff 并 reasoning selection；这是 agent judgment，不是 keyword matching。

| Persona | Agent | Select when diff touches...（diff 触及这些内容时选择） |
|---------|-------|---------------------------|
| `security` | `ce-security-reviewer` | Auth middleware、public endpoints、user input handling、permission checks、secrets management |
| `performance` | `ce-performance-reviewer` | Database queries、ORM calls、loop-heavy data transforms、caching layers、async/concurrent code |
| `api-contract` | `ce-api-contract-reviewer` | Route definitions、serializer/interface changes、event schemas、exported type signatures、API versioning |
| `data-migration` | `ce-data-migration-reviewer` | Migration files、schema dumps（`db/schema.rb`、`structure.sql`）、backfill scripts、data transformations — **不包括**没有 migration artifacts 的 model/query-only changes |
| `reliability` | `ce-reliability-reviewer` | Error handling、retry logic、circuit breakers、timeouts、background jobs、async handlers、health checks |
| `adversarial` | `ce-adversarial-reviewer` | Diff 有 >=50 行 changed non-test、non-generated、non-lockfile lines，或触及 auth、payments、data mutations、external API integrations 或其他 high-risk domains |
| `previous-comments` | `ce-previous-comments-reviewer` | **PR-only AND comment-gated.** 正在 review 的 PR 有 prior review rounds 留下的 existing review comments 或 review threads。当 Stage 1 未收集到 PR metadata，或 Stage 1 的 `hasPriorComments` flag 为 false（PR 上没有 `reviews` 且没有 `comments`）时，完全跳过。 |

## Stack-Specific Conditional（stack-specific 条件启用，2 personas）

这些 reviewers 覆盖 always-on personas 不专长的 runtime behavior。Structural 和 maintainability concerns 属于 always-on `maintainability` persona；不要为了 philosophy 或 convention-only passes 额外 spawn stack reviewers。

| Persona | Agent | Select when diff touches...（diff 触及这些内容时选择） |
|---------|-------|---------------------------|
| `julik-frontend-races` | `ce-julik-frontend-races-reviewer` | Stimulus/Turbo controllers、DOM event wiring、timers、async UI flows、animations，或带 race potential 的 frontend state transitions |
| `swift-ios` | `ce-swift-ios-reviewer` | Swift files、SwiftUI views、UIKit controllers、`.entitlements`、`PrivacyInfo.xcprivacy`、`.xcdatamodeld`、`Package.swift`、`Package.resolved`、storyboards、XIBs，或 `.pbxproj` 中 semantic build-setting / target-membership / code-signing changes |

## CE Conditional Agents（CE 条件 agents，migration-specific）

当 migration-artifact gate 适用**且** change 有风险（destructive DDL、backfills、NOT NULL without default、column renames/drops）时，spawn `ce-deployment-verification-agent`。Schema drift 和 migration safety 属于 `data-migration` persona，不属于 separate CE agents。

| Agent | Focus（关注点） |
|-------|-------|
| `ce-deployment-verification-agent` | 带 SQL verification queries 和 rollback procedures 的 Go/No-Go deployment checklist |

## Selection rules（选择规则）

1. **始终 spawn 全部 4 个 always-on personas**，以及 2 个 CE always-on agents。
2. **对每个 cross-cutting conditional persona**，orchestrator 读取 diff，并判断该 persona domain 是否相关。这是 judgment call，不是 keyword match。
3. **对每个 stack-specific conditional persona**，以 file types 和 changed patterns 为起点，然后判断 diff 是否真的为该 reviewer 引入 meaningful work。不要仅因为某个 config 或 generated file 恰好匹配 extension，就 spawn language-specific reviewers。
4. **对 `data-migration`**，仅当 diff 包含 migration 或 schema artifacts（`db/migrate/*`、`db/schema.rb`、`db/structure.sql`、Alembic/Flyway/Liquibase paths，或 explicit backfill/data-transform scripts）时 spawn。没有这些文件的 model-only 或 query-only changes **不要** spawn。
5. **对 CE conditional agents**，当 migration-artifact gate 适用且 change 有风险时（见上文），spawn `ce-deployment-verification-agent`。
6. **Announce the team** 后再 spawn，并为每个 selected conditional reviewer 提供 one-line justification。
