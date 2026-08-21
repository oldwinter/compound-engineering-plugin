# Compound Engineering 配置

Compound Engineering 将可选的 checkout-local 默认值保存在 `.compound-engineering/config.local.yaml` 中。打开同一 checkout 的所有受支持 harness 都会共享此文件，因此在 Claude Code 中设置的偏好，在 Codex 或 Cursor 打开同一 checkout 时也可见。

运行 `/ce-setup` 创建或修复该文件及其 `.gitignore` 覆盖。已提交的 `.compound-engineering/config.local.example.yaml` 列出了可用设置；只取消注释你要修改的 key。不要在此文件中放置 credential、CLI command 或 harness flag。

## Artifact root

默认情况下，CE 写入的所有 artifact folders 都位于 `docs/` 下，例如 `docs/plans/` 和 `docs/solutions/`。如果项目已把 `docs/` 用作 Obsidian vault、文档站点等受版本控制内容，可用 `docs_root` 把 CE artifact root 迁移到任意 repo-relative folder；未设置时，行为与现状 byte-identical。

`docs_root` 按 local-first 的两层顺序读取，首个非空值生效：先读上述 checkout-local `config.local.yaml`，再读受版本控制的 `.compound-engineering/config.yaml`。优先使用 tracked file，才能让每个 clone 和 worktree 共享设置；local file 只属于单个 checkout。（Tracked `config.yaml` 是通用 config layer，目前只有 `docs_root` 使用它。）

`docs_root` 与其它设置有两个关键区别：

- **Repo-relative 且必须验证。** 值必须解析到 repository 内的目录，不能是 absolute path，不能通过 `../` 或 symlink 逃出 repo，不能等于 repo root，也不能位于 `.git/` 下。目录不存在时，会在首次写入时创建。
- **Fail closed。** 其它设置无效时会回退默认值；不可用的 `docs_root` 会让 skill 直接报错停止，因为静默回退到 `docs/` 会把 CE artifacts 写进用户刻意避开的目录。`/ce-setup` 会报告 resolved root 及其来源 layer。

`docs_root` 不会让 artifacts 脱离 ephemeral workspace 持久化，因为 root 仍在 repo 内，会随 checkout 一起存在或消失。跨 worktree 共享 artifacts 属于独立的 repo-external storage 问题。

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
| all artifact-writing skills | `docs_root` | 所有 CE artifact subdirectories 的 repo-relative root。未设置时为 `docs`，且行为与当前一致；设置后是 CE 唯一读写位置。详见 [Artifact root](#artifact-root)。这是唯一 fail closed 而不是回退默认值的 setting。 |
| [`ce-ideate`](./ce-ideate.md)、[`ce-brainstorm`](./ce-brainstorm.md)、[`ce-plan`](./ce-plan.md) | `ideate_output`、`brainstorm_output`、`plan_output` | Artifact format：`md` 或 `html`。Ideation 默认 HTML，brainstorm/plan 默认 markdown；pipeline context 强制 markdown。 |
| [`ce-plan`](./ce-plan.md) | `plan_skip_scoping_confirm` | `true` 跳过正常的 pre-plan scope confirmation，默认 `false`；不会抑制真实 blocker 或 post-plan menu。 |
| [`ce-plan`](./ce-plan.md)、[`ce-brainstorm`](./ce-brainstorm.md) | `plan_model`、`brainstorm_model` | Model elevation：将 reasoning-heavy step 交给命名 model（例如 `fable`、`opus`），而非 session model。值为 model alias；prompt request 或 orchestrator 的 `plan_model:<alias>` carrier（例如来自 `lfg`，pipeline mode 也生效）可覆盖。会在所有 harness 生效：host 原生提供时走原生，否则走 Claude CLI，再否则 inline。无默认值（关闭 elevation）。 |
| [`ce-work`](./ce-work.md)、[`lfg`](./lfg.md) | `work_engine_mode`、`work_engine_preferences` | 有序 implementation-author preferences。Mode 为 `off`、`prefer` 或 `require`；每项包含 `harness` 和可选 `model`。参见[实现路由](#implementation-routing)。 |
| [`ce-code-review`](./ce-code-review.md)、[`ce-doc-review`](./ce-doc-review.md) | `cross_model_review_mode`、`cross_model_peer`、`cross_model_model`、`cross_model_effort` | `cross_model_review_mode` 为 `auto`（默认）或 `off`，用于允许或关闭自动跨模型审查；`cross_model_peer` 指定首选目标：`codex`、`claude`、`grok`、`cursor` 或 `composer`；`cross_model_model` 与 `cross_model_effort` 可固定具体模型及推理强度。Review skills 仍会应用 host-independence 和 route-availability gates，无法遵循的设置会明确跳过，不会静默替换。 |
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

`ce-work` 按顺序遍历该列表，并跳过与当前 host/default model 等价的项。同一 harness 中另一个显式 model 仍然 eligible。无论使用 `prefer` 还是 `require`，不可用的列表都会回退到当前 harness 和 session model 的 native implementation，并披露一次。只要 route 仍可用，`require` 就会固定请求的 external identity；它绝不会授权未请求的 external recipient，也不会让 route 不可用变成 blocker。

当前任务的措辞可以为单次 run 选择其他 route 而不修改 config，例如“use Codex for implementation”或“only use Composer for implementation”。Assignment 仅作用于 implementation；host 仍负责 validation、integration、commit 和调用 workflow 的其余部分。

## 安全维护

- 如需 team defaults，请提交 `config.yaml`。如果 `config.local.yaml` 包含个人或仅限当前 checkout 的选项，请勿提交（`/ce-setup` 可以添加 `.compound-engineering/*.local.yaml`）。
- 持久化的 team-wide instructions 应写入项目正常的 agent-instructions 机制。CE key 的 team defaults 可以写入 `config.yaml`。
- 一次性选择优先使用 per-run instruction。
- Plugin 升级后重新运行 `/ce-setup`，刷新已提交的示例并诊断 retired 或 malformed settings。
