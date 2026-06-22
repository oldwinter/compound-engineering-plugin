# YAML Frontmatter Schema（YAML Frontmatter schema，YAML 前置元数据 schema）

本目录中的 `schema.yaml` 是 `ce-compound` 写入的 `docs/solutions/` frontmatter 的 canonical contract。

将本文件作为以下内容的 quick reference：
- required fields（必填字段）
- enum values（枚举值）
- validation expectations（验证预期）
- category mapping（类别映射）
- track classification（track 分类：bug vs knowledge）

## Tracks（Track 分类）

`problem_type` 决定适用哪个 **track**。每个 track 有不同 required 和 optional fields。

| Track | problem_types | Description（说明） |
|-------|--------------|-------------|
| **Bug** | `build_error`, `test_failure`, `runtime_error`, `performance_issue`, `database_issue`, `security_issue`, `ui_bug`, `integration_issue`, `logic_error` | 已诊断并修复的 defects 和 failures |
| **Knowledge** | `best_practice`, `documentation_gap`, `workflow_issue`, `developer_experience`, `architecture_pattern`, `design_pattern`, `tooling_decision`, `convention` | Practices、patterns、conventions、decisions、workflow improvements 和 documentation。优先使用最窄适用值；`best_practice` 是 fallback。 |

## Required Fields（both tracks，两个 track 都必填）

- **module**：受影响的 module 或 area
- **date**：`YYYY-MM-DD` 格式的 ISO date
- **problem_type**：上方 Tracks table 中列出的值之一
- **component**：`rails_model`、`rails_controller`、`rails_view`、`service_object`、`background_job`、`database`、`frontend_stimulus`、`hotwire_turbo`、`email_processing`、`brief_system`、`assistant`、`authentication`、`payments`、`development_workflow`、`testing_framework`、`documentation`、`tooling` 之一
- **severity**：`critical`、`high`、`medium`、`low` 之一

## Bug Track Fields（Bug Track 字段）

Required（必填）：
- **symptoms**：包含 1-5 个 observable symptoms（errors、broken behavior）的 YAML array
- **root_cause**：`missing_association`、`missing_include`、`missing_index`、`wrong_api`、`scope_issue`、`thread_violation`、`async_timing`、`memory_leak`、`config_error`、`logic_error`、`test_isolation`、`missing_validation`、`missing_permission`、`missing_workflow_step`、`inadequate_documentation`、`missing_tooling`、`incomplete_setup` 之一
- **resolution_type**：`code_fix`、`migration`、`config_change`、`test_fix`、`dependency_update`、`environment_setup`、`workflow_improvement`、`documentation_update`、`tooling_addition`、`seed_data_update` 之一

## Knowledge Track Fields（Knowledge Track 字段）

除 shared fields 外没有额外 required fields。以下 fields 都是 optional：

- **applies_when**：此 guidance 适用的 conditions 或 situations
- **symptoms**：促成此 guidance 的 observable gaps 或 friction
- **root_cause**：如果有 specific cause，则记录 underlying cause
- **resolution_type**：如适用，记录 change type

## Optional Fields（both tracks，两个 track 均可选）

- **related_components**：涉及的其他 components
- **tags**：Search keywords，lowercase 且 hyphen-separated

## Optional Fields（bug track only，仅 bug track）

- **rails_version**：`X.Y.Z` 格式的 Rails version

## Backward Compatibility（向后兼容）

Track system 之前创建的 docs 可能在 knowledge-type problem_types 上带有 `symptoms`/`root_cause`/`resolution_type`。这些是 valid legacy docs：

- Knowledge-track doc 上存在 bug-track fields 是 harmless 的。除非该 doc 因其他原因正在重写，否则 refresh 时不要 strip 它们。
- 创建 **new** docs 时，遵循上方 track rules。

## Category Mapping（类别映射）

- `build_error` -> `docs/solutions/build-errors/`
- `test_failure` -> `docs/solutions/test-failures/`
- `runtime_error` -> `docs/solutions/runtime-errors/`
- `performance_issue` -> `docs/solutions/performance-issues/`
- `database_issue` -> `docs/solutions/database-issues/`
- `security_issue` -> `docs/solutions/security-issues/`
- `ui_bug` -> `docs/solutions/ui-bugs/`
- `integration_issue` -> `docs/solutions/integration-issues/`
- `logic_error` -> `docs/solutions/logic-errors/`
- `developer_experience` -> `docs/solutions/developer-experience/`
- `workflow_issue` -> `docs/solutions/workflow-issues/`
- `best_practice` -> `docs/solutions/best-practices/`
- `documentation_gap` -> `docs/solutions/documentation-gaps/`
- `architecture_pattern` -> `docs/solutions/architecture-patterns/`
- `design_pattern` -> `docs/solutions/design-patterns/`
- `tooling_decision` -> `docs/solutions/tooling-decisions/`
- `convention` -> `docs/solutions/conventions/`

## Validation Rules（验证规则）

1. 使用 Tracks table 从 `problem_type` 判断 track。
2. 所有 shared required fields 必须存在。
3. Bug-track docs 上必须存在 bug-track required fields（`symptoms`、`root_cause`、`resolution_type`）。
4. Knowledge-track docs 除 shared fields 外没有额外 required fields。
5. Existing knowledge-track docs 上的 bug-track fields 是 harmless 的（见 Backward Compatibility）。
6. Enum fields 必须精确匹配 allowed values。
7. Array fields 必须遵守 min/max item counts。
8. `date` 必须匹配 `YYYY-MM-DD`。
9. `rails_version` 如存在，必须匹配 `X.Y.Z`，且只适用于 bug-track docs。

## YAML Safety Rules（YAML 安全规则）

Strict YAML 1.2 parsers（`yq`、`js-yaml` strict、PyYAML）会拒绝以 reserved indicator character 开头、且作为 unquoted scalars 的 array items。为任何 array-of-strings field（`symptoms`、`applies_when`、`tags`、`related_components` 或任何 future array field）写 items 时，如果 value 以下列任一字符开头，要用 double quotes 包裹：

`` ` ``, `[`, `*`, `&`, `!`, `|`, `>`, `%`, `@`, `?`

如果 value 包含 substring `": "`，也要 quote；该 punctuation 会 confuse flow-style parsers。

Example — before（示例：之前，会破坏 strict YAML）：

    symptoms:
      - `sudo dscacheutil -flushcache` does not restore in-container mDNS

Example — after（示例：之后，可正常解析）：

    symptoms:
      - "`sudo dscacheutil -flushcache` does not restore in-container mDNS"

此规则适用于所有 array-of-strings frontmatter fields。像 `description:` 这样的 scalar string fields 有自己的 quoting rules（见 plugin `AGENTS.md` 的 "YAML Frontmatter"）。
