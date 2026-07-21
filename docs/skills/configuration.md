# Compound Engineering 配置

Compound Engineering 将可选的 checkout-local 默认值保存在 `.compound-engineering/config.local.yaml` 中。打开同一 checkout 的所有受支持 harness 都会共享此文件，因此在 Claude Code 中设置的偏好，在 Codex 或 Cursor 打开同一 checkout 时也可见。

运行 `/ce-setup` 创建或修复该文件及其 `.gitignore` 覆盖。已提交的 `.compound-engineering/config.local.example.yaml` 列出了可用设置；只取消注释你要修改的 key。不要在此文件中放置 credential、CLI command 或 harness flag。

## Config 与 instructions 的关系

Config 是 local default，不是另一份 agent-instructions 文件：

- 当前任务的 direct instruction 优先于冲突的 config preference。
- Harness 已加载的 active session、project/user instructions 可以覆盖或收窄 config。根据 harness 不同，project instructions 可能来自 `AGENTS.md`、`CLAUDE.md` 或其他原生机制。
- 每个 skill 的 runtime contract 仍负责决定设置是否适用。例如，pipeline execution 会强制 planning artifact 使用 markdown，而 model elevation 会在任何能够访问 requested model 的 harness 上生效。
- 某些 skill 会为自己的 routing 定义更具体的 preference order；对应 skill 页面会说明该顺序。

该文件被 gitignore 且属于单个 checkout，因此 linked worktree 不会自动继承它。CE Work 会在创建 detached worker worktree 前解析 delegation，因此已选定 route 会带入该 run；直接在另一个 worktree 中打开的独立 interactive session 则使用该 worktree 自己的 config。

## 选项

所有设置都是可选的。被注释的示例仅用于文档说明，不会生效。

| Consumer | Options | Purpose 和 values |
|---|---|---|
| [`ce-ideate`](./ce-ideate.md)、[`ce-brainstorm`](./ce-brainstorm.md)、[`ce-plan`](./ce-plan.md) | `ideate_output`、`brainstorm_output`、`plan_output` | Artifact format：`md` 或 `html`。Ideation 默认 HTML，brainstorm/plan 默认 markdown；pipeline context 强制 markdown。 |
| [`ce-plan`](./ce-plan.md) | `plan_skip_scoping_confirm` | `true` 跳过正常的 pre-plan scope confirmation，默认 `false`；不会抑制真实 blocker 或 post-plan menu。 |
| [`ce-plan`](./ce-plan.md)、[`ce-brainstorm`](./ce-brainstorm.md) | `plan_model`、`brainstorm_model` | Model elevation：将 reasoning-heavy step 交给命名 model（例如 `fable`、`opus`），而非 session model。值为 model alias；prompt request 可覆盖。会在所有 harness 生效：host 原生提供时走原生，否则走 Claude CLI，再否则 inline。无默认值（关闭 elevation）。 |
| [`ce-work`](./ce-work.md)、[`lfg`](./lfg.md) | `work_engine_mode`、`work_engine_preferences` | 有序 implementation-author preferences。Mode 为 `off`、`prefer` 或 `require`；每项包含 `harness` 和可选 `model`。参见[实现路由](#implementation-routing)。 |
| [`ce-code-review`](./ce-code-review.md)、[`ce-doc-review`](./ce-doc-review.md) | `cross_model_peer` | 首选 cross-model review target：`codex`、`claude`、`grok`、`cursor` 或 `composer`。Review skills 仍会应用 host-independence 和 route-availability gates。 |
| [`ce-commit-push-pr`](./ce-commit-push-pr.md) | `pr_teaching_section`、`pr_teaching_archive`、`auto_babysit` | 切换 PR concept teaching、选择 explainer archival，或退出默认 babysit handoff。默认分别为 `true`、`false`、`true`。 |
| [`ce-product-pulse`](./ce-product-pulse.md) | `pulse_product_name`、`pulse_lookback_default`、`pulse_primary_event`、`pulse_value_event`、`pulse_completion_events` | Product identity、reporting window，以及代表 engagement、value 和 completion 的 events。Setup interview 会写入这些值。 |
| [`ce-product-pulse`](./ce-product-pulse.md) | `pulse_quality_scoring`、`pulse_quality_dimension`、`pulse_analytics_source`、`pulse_tracing_source`、`pulse_payments_source`、`pulse_db_enabled` | 可选 quality scoring 和 read-only data-source routing。 |
| [`ce-product-pulse`](./ce-product-pulse.md) | `pulse_metric_sources`、`pulse_pending_metrics`、`pulse_excluded_metrics` | Per-metric source override，以及应显示为 pending 或排除的 strategy metrics。 |
| [`ce-promote`](./ce-promote.md) | `ce_promote_spiral_optout` | `true` 抑制一次性的 Spiral setup offer；删除该 key 可重新启用。 |
| [`ce-sweep`](./ce-sweep.md) | `feedback_sources`、`sweep_state_path`、`sweep_ack_cap`、`sweep_lease_ttl_minutes`、`sweep_shared_branch` | Feedback connectors、durable state location、acknowledgment circuit breaker、lease expiry 和可选 push-gated shared-branch coordination。Setup interview 会写入这些值。 |

## 实现路由

Work engine list 相对于 host，而不是绑定 checkout 通常使用的 harness：

```yaml
work_engine_mode: prefer
work_engine_preferences:
  - harness: cursor
    model: composer
  - harness: codex
    model: "gpt-5.6"
  - harness: claude
```

支持的 harness 为 `codex`、`claude`、`grok` 和 `cursor`。省略 `model` 时使用该 harness 的 configured default。Composer 是通过 Cursor 访问的 model family，因此应使用 `harness: cursor` 和 `model: composer` 请求。

`ce-work` 按顺序遍历该列表，并跳过与当前 host/default model 等价的项。同一 harness 中另一个显式 model 仍然 eligible。使用 `prefer` 时，不可用的列表会回退到 native implementation 并披露；使用 `require` 时，interactive CE Work run 会在弱化 route 前询问，而 LFG 和其他 headless caller 会阻塞。

当前任务的措辞可以为单次 run 选择其他 route 而不修改 config，例如“use Codex for implementation”或“only use Composer for implementation”。Assignment 仅作用于 implementation；host 仍负责 validation、integration、commit 和调用 workflow 的其余部分。

## 安全维护

- 保持该文件被 gitignore。它可能包含 local integration choices，不应作为 team policy 提交。
- 持久化的 team-wide instructions 应写入项目正常的 agent-instructions 机制，而不是此文件。
- 一次性选择优先使用 per-run instruction；同一 checkout 跨 session 使用的默认值再写入 config。
- Plugin 升级后重新运行 `/ce-setup`，刷新已提交的示例并诊断 retired 或 malformed settings。
