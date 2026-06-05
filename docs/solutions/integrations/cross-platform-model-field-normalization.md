---
title: "Target converters 的跨平台 model field normalization"
date: 2026-03-29
category: integration-issues
module: src/converters
problem_type: integration_issue
component: tooling
symptoms:
  - "Target platforms received raw Claude model aliases (e.g., 'sonnet') they could not resolve"
  - "Qwen converter mapped model aliases to wrong canonical names (claude-sonnet instead of claude-sonnet-4-6)"
  - "OpenClaw and Copilot passed through unnormalized model values in formats the target could not use"
  - "Duplicated CLAUDE_FAMILY_ALIASES and normalizeModel logic across converters with divergent alias values"
root_cause: config_error
resolution_type: code_fix
severity: medium
tags:
  - model-normalization
  - converters
  - cross-platform
  - opencode
  - qwen
  - droid
  - copilot
  - openclaw
  - codex
---

# Target converters 的跨平台 model field normalization

## 问题

Claude Code 在 agent 和 command frontmatter 中使用 bare model aliases（`model: sonnet`、`model: haiku`、`model: opus`）。每个 target platform 对 model field 期待不同 format，但 converters 处理不一致：有些直接 pass through raw values，有些复制了 normalization logic 但 alias mappings 错误。

## 症状

- OpenClaw 原样透传 `model: sonnet`，但该 platform 期待 `anthropic/claude-sonnet-4-6`，因此 invalid
- Qwen 将 `sonnet` 映射到 `anthropic/claude-sonnet`，而不是 `anthropic/claude-sonnet-4-6`（其本地 `CLAUDE_FAMILY_ALIASES` 副本中 alias 错误）
- Copilot 原样透传 Claude model IDs，例如 `claude-sonnet-4-20250514`；Copilot 使用 display-name format（"Claude Opus 4.5"），不是 model IDs
- Codex 不输出 model field，这是正确行为，但只是偶然（没有有意处理）
- Droid 原样透传，这是正确行为，但未记录为 intentional
- OpenCode 和 Qwen converters 中存在两份 `CLAUDE_FAMILY_ALIASES`，且 values 分歧

## 无效做法

- **Passing model through as-is**：适用于 Droid（Factory 原生解析 bare aliases），但破坏 OpenClaw/Qwen/OpenCode
- **将 bare aliases 映射到不完整 model names**：Qwen 的 `sonnet` -> `claude-sonnet` 是错误的；正确是 `claude-sonnet-4-6`
- **假设所有 targets 需要同一 model format**：每个平台的期待从根本上不同
- **假设 Codex skills 支持 frontmatter 中的 model overrides**：并不支持；Rust source `SkillFrontmatter` struct 已确认仅有 `name` 和 `description`
- **初始假设 Qwen 应完全 drop model**：错误；Qwen 是 multi-provider，并通过带 `anthropic` provider config 的 `settings.json` 支持 Anthropic models
- **初始假设 Copilot 不支持 models**：错误；Copilot 支持包括 Claude 在内的 multi-model，但精确 format 不确定（display names vs model IDs）

## 解决方案

创建 `src/utils/model.ts`，提供 shared normalization utilities：

```typescript
// Single source of truth for bare Claude family aliases
export const CLAUDE_FAMILY_ALIASES: Record<string, string> = {
  haiku: "claude-haiku-4-5",
  sonnet: "claude-sonnet-4-6",
  opus: "claude-opus-4-6",
}

// Resolve bare alias without provider prefix (used by Droid)
export function resolveClaudeFamilyAlias(model: string): string

// Add provider prefix based on naming conventions
export function addProviderPrefix(model: string): string

// Combined: resolve + prefix (used by OpenCode, Qwen, OpenClaw)
export function normalizeModelWithProvider(model: string): string
```

每个 converter 使用合适的 shared utility：

| Target | Behavior（行为） | Output for `model: sonnet`（输出） |
|--------|----------|----------------------------|
| OpenCode | Resolve alias + add provider prefix | `anthropic/claude-sonnet-4-6` |
| Droid | Pass through as-is | `sonnet` |
| Copilot | Drop entirely | (omitted) |
| Codex | Drop entirely | (omitted) |

> **Note（说明）：** 本文写于 converter set 还包含 Qwen 和 OpenClaw 时；二者当时都使用 "Resolve alias + add provider prefix" 行为。它们后来都已被移除，改用 native plugin install，见 `docs/solutions/integrations/native-plugin-install-strategy.md`。该 pattern 仍适用于任何未来使用 `provider/model-id` format 的 multi-provider target。

---

## 为什么有效

每个平台的 model handling requirements 从根本上不同：

**会 normalize 的 platforms（OpenCode、Qwen、OpenClaw）：** 这些是 multi-provider platforms，支持 Anthropic、OpenAI、Google 和其他 model providers。它们需要 `anthropic/claude-sonnet-4-6` 这样的 provider-prefixed IDs，将 requests route 到正确 backend。`normalizeModelWithProvider` function 会解析 bare aliases 并添加合适 prefix。

**Droid（Factory）— pass-through：** Factory 是 multi-provider，但会在内部原生解析 Claude bare aliases（`sonnet`、`opus`、`haiku`）。Pass-through 正确且更简单；无需 normalize 到 Factory 也接受但不要求的 format。Factory 也接受完整 dated model IDs，例如 `claude-sonnet-4-5-20250929`，以及带 `custom:` 前缀的 non-Anthropic models。

**Copilot — drop：** Copilot 在 `.agent.md` frontmatter 中支持 `model` field（记录于 `docs/specs/copilot.md`），但 expected values 是 Copilot-specific display names，例如 "Claude Opus 4.5"，不是 `claude-sonnet-4-20250514` 这样的 Claude model IDs，也不是 `sonnet` 这样的 bare aliases。透传 Claude-specific values 会输出 Copilot 无法使用的字段。不同于 Droid（原生解析 `sonnet`），Copilot 没有记录对 Claude model IDs 的 resolution。Drop 更安全：spec 说 "If unset, inherits the default model."

**Codex — drop：** Codex skill frontmatter（`SKILL.md`）只支持 `name` 和 `description` fields。这已通过检查 Rust source code（`codex-rs/core-skills/src/loader.rs` 中的 `SkillFrontmatter` struct）确认。Codex 中的 model selection 是通过 `config.toml` 或 runtime `/model` command 全局设置，不是 per-skill。

---

## Target platform model field 参考

该 reference 记录截至 2026-03-29 的 research findings。下面标记为 **(removed)** 的 targets 不再有 custom Bun converters，而依赖 native plugin install。保留这些 research，供这些 targets 未来重新进入 converter set 时参考。

### OpenCode（OpenCode）

- **Model format（model 格式）：** `provider/model-id`（例如 `anthropic/claude-sonnet-4-6`）
- **Provider prefixes（provider 前缀）：** `anthropic/`、`openai/`、`google/`
- **文档:** Agents defined in `.opencode/agents/*.md`（agent 定义在 `.opencode/agents/*.md`）

### Qwen（removed，已移除）

- **Model format（model 格式）：** `provider/model-id`（例如 `anthropic/claude-sonnet-4-6`）
- **Multi-provider（多 provider）：** Yes — supports Anthropic, OpenAI, Google GenAI via `settings.json`
- **Configuration example（配置示例）：** `"anthropic": [{"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4", "envKey": "ANTHROPIC_API_KEY"}]`
- **常见误解:** Qwen is NOT limited to its own foundation model（Qwen 并不局限于自己的 foundation model）

### Droid（Factory）

- **Model format（model 格式）：** Bare names（`sonnet`、`claude-sonnet-4-5-20250929`）或 BYOK 的 `custom:<model>`
- **Native alias resolution（原生 alias 解析）：** Factory resolves `sonnet`, `opus`, `haiku` internally
- **Multi-provider（多 provider）：** Yes — supports Anthropic, OpenAI, Google, and Factory's own `droid-core`
- **文档:** Custom droids defined in `.factory/droids/*.md`（custom droids 定义在 `.factory/droids/*.md`）

### Copilot（Copilot）

- **Model format（model 格式）：** Display names（例如 "Claude Opus 4.5"、"GPT-5.2"），可能支持 array syntax `model: ['Claude Opus 4.5', 'GPT-5.2']`
- **Multi-provider（多 provider）：** Yes — supports Claude and GPT models
- **Current converter behavior（当前 converter 行为）：** Drop（Claude model IDs 不映射到 Copilot expected format）
- **备注:** Spec says "may be ignored on github.com" — model selection works in IDE but may not apply on the GitHub web platform（model selection 在 IDE 中有效，但可能不适用于 GitHub web platform）
- **文档:** Agents defined in `.github/agents/*.agent.md`（agents 定义在 `.github/agents/*.agent.md`）

### OpenClaw（removed，已移除）

- **Model format（model 格式）：** `provider/model-id`（same as OpenCode，与 OpenCode 相同）
- **文档:** Skills defined in `skills/*/SKILL.md`（skills 定义在 `skills/*/SKILL.md`）

### Codex（Codex）

- **Skill frontmatter 中的 model field:** NOT SUPPORTED（不支持）
- **Supported frontmatter fields（支持的 frontmatter 字段）：** 仅 `name`, `description`
- **Model configuration（model 配置）：** Global `config.toml`（`model = "gpt-5.4"`）or runtime `/model` command（或 runtime `/model` 命令）
- **Valid model IDs（截至 2026-03）：** `gpt-5.4`（flagship）、`gpt-5.4-mini`（fast）、`gpt-5.3-codex`（coding-specialized，coding 专用）
- **Deprecated（已弃用）：** `codex-mini-latest`（removed Feb 2026）
- **文档:** Skills defined in `.codex/skills/*/SKILL.md` or `.agents/skills/*/SKILL.md`（skills 定义在这些路径下）

---

## 预防

1. **Research before implementing（实现前先调研）：** 添加新 converter target 时，先通过 external documentation research 其 model field format，再决定 pass-through 或复制其他 converter。format 在 platforms 之间差异很大。

2. **Single source of truth（单一真源）：** `src/utils/model.ts` 中的 `CLAUDE_FAMILY_ALIASES` map 是 canonical alias map。Claude 新 model generations 发布时，在那里更新，不要在 individual converters 中更新。

3. **Test coverage（测试覆盖）：** model-related changes 后运行 `bun test`。test suite 覆盖所有 converters 的 model handling（`tests/model-utils.test.ts` 加各 converter test file）。

4. **不要从 field name 假设 format：** frontmatter 中有 `model` field，不意味着 format 在 platforms 间相同。OpenCode 要 `anthropic/claude-sonnet-4-6`，Factory 要 `sonnet`，Copilot 要 "Claude Sonnet 4"，Codex 完全不支持该字段。

5. **不确定时 drop：** 如果无法确信能生成 target expected format，省略该 field，而不是输出潜在 invalid value。多数 platforms 在 model unset 时会回退到合理 default。

## 相关 Issues

- `docs/solutions/adding-converter-target-providers.md` — Converter architecture doc；应更新以将 model normalization 作为 conversion pattern 的一部分引用
- `docs/solutions/integrations/colon-namespaced-names-break-windows-paths.md` — Structural analog：同样是 per-target boundary normalization pattern
- `docs/specs/codex.md` — Platform spec（last verified 2026-01-21）；确认 skill frontmatter limitations
