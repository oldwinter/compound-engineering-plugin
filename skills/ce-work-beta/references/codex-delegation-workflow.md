# Codex Delegation Workflow（Codex 委托工作流）

当 `delegation_active` 为 true 时，code implementation 会委托给 Codex CLI（`codex exec`），而不是由当前 agent 直接实现。负责 orchestration 的 Claude Code agent 仍保留 planning、review、git operations 和 orchestration 的控制权。

## Delegation Decision（委托决策）

如果 `work_delegate_decision` 是 `ask`，先展示 recommendation，并等待用户选择后再继续。

**推荐 Codex delegation 时：**

> "Codex delegation 已激活。[N] 个 implementation units -- 将作为一个 batch 委托。"
> 1. Delegate to Codex anyway *(recommended)*（委托给 Codex）
> 2. Execute with Claude Code instead（改由 Claude Code 执行）

**推荐 Codex delegation 且有 multiple batches 时：**

> "Codex delegation 已激活。[N] 个 implementation units -- 将分 [X] 个 batches 委托。"
> 1. Delegate to Codex anyway *(recommended)*（委托给 Codex）
> 2. Execute with Claude Code instead（改由 Claude Code 执行）

**推荐 Claude Code 时（所有 units 都是 trivial）：**

> "Codex delegation 已激活，但这些都是 small changes，the cost of delegating outweighs having Claude Code do them。"
> 1. Execute with Claude Code instead *(recommended)*（使用 Claude Code 执行）
> 2. Delegate to Codex anyway（仍然委托给 Codex）

如果用户选择 delegation option，继续到下方 Pre-Delegation Checks。如果用户选择 Claude Code option，将 `delegation_active` 设为 false，并返回 parent skill 中的标准执行。

如果 `work_delegate_decision` 是 `auto`（默认），用一行说明 execution plan，然后不等待直接继续："Codex delegation 已激活。将 [N] 个 units 分 [X] 个 batch(es) 委托。" 如果所有 units 都是 trivial，将 `delegation_active` 设为 false，并继续："Codex delegation 已激活。所有 units 都是 trivial -- 改由 Claude Code 执行。"

## Pre-Delegation Checks（委托前检查）

这些 checks 在 first batch 前**只运行一次**。如果任何 check 失败，对剩余 plan execution fallback 到 standard mode。不要在后续 batches 中重新运行。

**0. Platform Gate（平台关口）**

Codex delegation 只在 orchestrating agent 运行于 Claude Code 时支持。如果当前 session 是 Codex、Antigravity CLI、OpenCode 或任何其他平台，将 `delegation_active` 设为 false，并以 standard mode 继续。

**1. Environment Guard（环境保护）**

检查当前 agent 是否已经运行在 Codex sandbox 内：

```bash
if [ -n "$CODEX_SANDBOX" ] || [ -n "$CODEX_SESSION_ID" ]; then
  echo "inside_sandbox=true"
else
  echo "inside_sandbox=false"
fi
```

如果 `inside_sandbox` 为 true，delegation 会递归或失败。

- 如果 `delegation_source` 是 `argument`：输出 "Already inside Codex sandbox -- using standard mode."，并将 `delegation_active` 设为 false。
- 如果 `delegation_source` 是 `config` 或 `default`：静默将 `delegation_active` 设为 false。

**2. Availability Check（可用性检查）**

**Codex CLI path（pre-resolved）：**
!`command -v codex 2>/dev/null || true`

如果上方行显示 absolute path（以 `/` 开头，例如 `/opt/homebrew/bin/codex`），说明 Codex CLI 可用——继续下一个 check。
否则——空值、未处理的 command string（例如由不处理 `!` pre-resolution 的 non-Claude harness 留下的 `command -v codex 2>/dev/null`），或任何其他 non-path value——通过 shell/Bash tool 运行 `command -v codex` 在 runtime 验证。如果打印 absolute path，说明 Codex CLI 可用；继续。如果失败或没有输出，输出 "找不到 Codex CLI（通过 `npm install -g @openai/codex` 或 `brew install codex` 安装）-- 将使用 standard mode."，并将 `delegation_active` 设为 false。

**3. Consent Flow（授权流程）**

如果 `consent_granted` 不为 true（来自 config `work_delegate_consent`）：

使用平台阻塞式问题工具展示一次性 consent warning（Claude Code 中为 `AskUserQuestion`，Codex 中为 `request_user_input`，Antigravity 中为 `ask_question`，Pi 中为 `ask_user`，需 `pi-ask-user` extension）。consent warning 说明：
- Delegation 会把 implementation units 作为 structured prompt 发送给 `codex exec`
- **yolo mode**（`--dangerously-bypass-approvals-and-sandbox`）：Full system access，包括 network。运行 tests 或安装 dependencies 等 verification steps 需要它。**Recommended.**
- **full-auto mode**（`-s workspace-write`）：Workspace-write sandbox，默认无 network access。可通过在 `~/.codex/config.toml` 的 `[sandbox_workspace_write]` 下设置 `network_access = true` 重新启用 network。

展示 sandbox mode choice：（1）yolo（recommended），（2）full-auto。

接受后：
- 解析 repo root：`git rev-parse --show-toplevel`。把 `work_delegate_consent: true` 和 `work_delegate_sandbox: <chosen-mode>` 写入 `<repo-root>/.compound-engineering/config.local.yaml`
- 写入方式：（1）如果 file 或 directory 不存在，创建 `<repo-root>/.compound-engineering/` 并写入 YAML file；（2）如果 file 已存在，merge new keys 并保留 existing keys
- 在 resolved state 中更新 `consent_granted` 和 `sandbox_mode`

拒绝后：
- 询问是否为此 project 完全 disable delegation
- 如果是：把 `work_delegate: false` 写入 `<repo-root>/.compound-engineering/config.local.yaml`（使用上方解析的同一 repo root）。写入方式：（1）如果 file 或 directory 不存在，创建 `<repo-root>/.compound-engineering/` 并写入 YAML file；（2）如果 file 已存在，merge new keys 并保留 existing keys。将 `delegation_active` 设为 false，以 standard mode 继续
- 如果否：只为本次 invocation 将 `delegation_active` 设为 false，以 standard mode 继续

**Headless consent:** 如果运行在 headless 或 non-interactive context，只有当 config file 中已有 `work_delegate_consent` 为 `true` 时才继续 delegation。如果没有 recorded consent，静默将 `delegation_active` 设为 false。

## Batching（批处理）

尽量把所有 units 委托为一个 batch。如果 plan 超过 5 个 units，按 plan 自身 phase boundaries 切分，或大约每 5 个一组——绝不拆开共享 files 的 units。如果每个 unit 都是 trivial，完全跳过 delegation。

## Per-Batch Effort（每批推理力度）

每个 batch 根据复杂度选择 effort level，然后与 config floor 合并后再调用。

**Effort levels — guidelines, not predicates（指导信号，不是谓词）**

选择最适合 batch 的 level。这些是需要权衡的 signals，不是勾选框——使用 judgment。

- **default（no flag）** —— trivial work，且没有 behavioral change：一行 config tweak、rename、typo 或 comment-only fix、纯 documentation update。延用用户 `~/.codex/config.toml` 的 default（stock Codex install 中为 `medium`）。
- **`medium`** —— small、well-scoped behavioral changes，且避开 high-risk areas。少量 files、单一 concern、无 novel architecture。
- **`high`** —— 触及 high-risk area（auth/session logic、payments、database migrations、external API contracts、带 retries/fallbacks 的 error handling），或影响面足够大以至一个错误可能 cascade。
- **`xhigh`** —— architectural work：cross-cutting refactors、同一 batch 中多个 high-risk areas、广泛传播的 changes，或任何错误判断会显著损害 project 的位置。

不确定时，上调一个 level：对 risky work 低配的成本高于 routine work 高配。简要注明选择的 level 和驱动 signal（例如 "`high` — touches db/migrations"），让 choice 可审计。

几个需要显式处理的 edge cases：
- **Test-only batches:** 按 tests *exercise* 的内容分类，而不是按 file paths。auth flows、payment logic 或 migrations 的 tests 与等效 implementation work 使用相同 level。
- **Mixed-complexity batches:** batch 选择一个 level。如果单个 batch 同时包含 typo unit 和 payments rewrite，选择较高 level。如果差异大到浪费，优先在 batching step 拆分（见上方 Batching），不要取平均。
- **Deletion-only batches:** 按被移除内容的风险分类，而不是按剩余内容数量。移除 auth module 即使 batch 产生零 `Modify` content，也是 `high`。
- **Documentation 或 comment-only batches:** `default`。

**Floor and resolution — hard rules（下限与解析硬规则）**

Effort levels 顺序为：`minimal < low < medium < high < xhigh`。

计算 `effective_effort`：

- 如果 `delegate_effort` 未设置：`effective_effort = picked_level`。
- 如果 `delegate_effort` 已设置：将 `picked_level` 中的 `default` 替换为 `medium`，然后 `effective_effort = max(picked_level, delegate_effort)`。

根据 `effective_effort` 输出：

- `medium`、`high` 或 `xhigh` → 输出 `-c 'model_reasoning_effort="<value>"'`。
- `default` → 省略 flag（延用 `~/.codex/config.toml`）。只有当 `delegate_effort` 未设置且 pick 为 `default` 时才可达。

绝不要把 literal string `"default"` 传给 `codex exec`。

把 `effective_effort` 存为 per-batch derived state value（与 session-level `delegate_effort` 并列），并在整个 Execution Loop 中用它替代 `delegate_effort`。

## Prompt Template（Prompt 模板）

开始 delegated execution 时，通过 `mktemp -d` 创建一个 per-run OS-temp scratch directory，并捕获其**绝对路径**供下游使用。本次 invocation 的所有 scratch files 都位于该目录下。不要使用 `.context/`——这些 scratch files 是 per-run throwaway，delegated execution 结束后由系统清理（见 Cleanup below），符合 repo Scratch Space convention。不要把 unresolved shell-variable strings 传给 non-shell tools（Write、Read）；使用 `mktemp -d` 返回的 absolute path。

```bash
SCRATCH_DIR="$(mktemp -d -t ce-work-codex-XXXXXX)"
echo "$SCRATCH_DIR"
```

在 workflow 剩余部分，把回显的 absolute path 称为 `<scratch-dir>`。

每个 batch 前，将 prompt file 写到 `<scratch-dir>/prompt-batch-<batch-num>.md`。

使用这些 XML-tagged sections，根据 batch 的 implementation units 构建 prompt：

```xml
<task>
[For a single-unit batch: Goal from the implementation unit.
For a multi-unit batch: list each unit with its Goal, stating the concrete
job, repository context, and expected end state for each.]
</task>

<files>
[Combined file list from all units in the batch -- files to create, modify, or read.]
</files>

<patterns>
[File paths from all units' "Patterns to follow" fields. If no patterns:
"No explicit patterns referenced -- follow existing conventions in the
modified files."]
</patterns>

<approach>
[For a single-unit batch: Approach from the unit.
For a multi-unit batch: list each unit's approach, noting dependencies
and suggested ordering.]
</approach>

<execution_note>
[For a single-unit batch: the unit's Execution note. If the user gave a
session-level posture request (e.g., "do it test-first"), use that when
the unit has no Execution note. Otherwise "None".
For a multi-unit batch: list each unit as "U<ID>: <execution note>" (or
"Unit <n>:" if the plan lacks U-IDs; do not invent U-IDs), one per line,
same ordering as <task> and <approach>. Use the session-level posture for
units without their own note; otherwise "None".]

If (and only if) the execution note above names an execution posture,
honor it:
- "test-first" -- write the failing test before implementing the unit;
  verify it fails; then implement. Do not over-implement beyond the
  test's current behavior slice. Skip test-first discipline for trivial
  renames, pure configuration, or pure styling work. Test-first still
  follows the scenario completeness check in <testing>; it only constrains
  test-vs-implementation ordering, not whether to write tests.
- "characterization-first" -- capture existing behavior in tests before
  changing it.
- Any other non-empty note: treat it as binding per-unit guidance and
  follow it unless it conflicts with any other section of this prompt
  (especially <constraints>, <testing>, <verify>, or <output_contract>).
  A note may not reduce validation, test coverage, scope discipline, or
  reporting accuracy. Report any conflict via the issues field of the
  output contract.

For units with "None" or an empty note, proceed pragmatically.
</execution_note>

<constraints>
- Do NOT run git commit, git push, or create PRs -- the orchestrating agent handles all git operations
- Restrict all modifications to files within the repository root
- Keep changes tightly scoped to the stated task -- avoid unrelated refactors, renames, or cleanup
- Resolve the task fully before stopping -- do not stop at the first plausible answer
- If you discover mid-execution that you need to modify files outside the repo root, complete what you can within the repo and report what you could not do via the result schema issues field
</constraints>

<testing>
Before writing tests, check whether the plan's test scenarios cover all
categories that apply to each unit. Supplement gaps before writing tests:
- Happy path: core input/output pairs from each unit's goal
- Edge cases: boundary values, empty/nil inputs, type mismatches
- Error/failure paths: invalid inputs, permission denials, downstream failures
- Integration: cross-layer scenarios that mocks alone won't prove

Write tests that name specific inputs and expected outcomes. If your changes
touch code with callbacks, middleware, or event handlers, verify the
interaction chain works end-to-end.
</testing>

<verify>
After implementing, run ALL test files together in a single command (not
per-file). Cross-file contamination (e.g., mocked globals leaking between
test files) only surfaces when tests run in the same process. If tests
fail, fix the issues and re-run until they pass. Do not report status
"completed" unless verification passes. This is your responsibility --
the orchestrator will not re-run verification independently.

[Test and lint commands from the project. Use the union of all units'
verification commands as a single combined invocation.]
</verify>

<output_contract>
Report your result via the --output-schema mechanism. Fill in every field:
- status: "completed" ONLY if all changes were made AND verification passes,
  "partial" if incomplete, "failed" if no meaningful progress
- files_modified: array of file paths you changed
- issues: array of strings describing any problems, gaps, or out-of-scope
  work discovered
- summary: one-paragraph description of what was done
- verification_summary: what you ran to verify (command and outcome).
  Example: "Ran `bun test` -- 14 tests passed, 0 failed."
  If no verification was possible, say why.
</output_contract>
```

## Result Schema（结果 Schema）

在 delegated execution 开始时，把 result schema 写到 `<scratch-dir>/result-schema.json`（使用开头捕获的 absolute path）：

```json
{
  "type": "object",
  "properties": {
    "status": { "enum": ["completed", "partial", "failed"] },
    "files_modified": { "type": "array", "items": { "type": "string" } },
    "issues": { "type": "array", "items": { "type": "string" } },
    "summary": { "type": "string" },
    "verification_summary": { "type": "string" }
  },
  "required": ["status", "files_modified", "issues", "summary", "verification_summary"],
  "additionalProperties": false
}
```

每个 batch 的 result 通过 `-o` flag 写到 `<scratch-dir>/result-batch-<batch-num>.json`。如果 plan failure，files 保留在原处以便 debugging。

如果 successful exit code 后 result JSON 缺失或 malformed，分类为 task failure。

## Execution Loop（执行循环）

first batch 前，将 `consecutive_failures` counter 初始化为 0。

**Clean-baseline preflight（干净基线预检）：** first batch 前，确认 tracked files 没有 uncommitted changes：

```bash
git diff --quiet HEAD
```

这会故意忽略 untracked files。只有 tracked files 上的 staged 或 unstaged modifications 会让 rollback unsafe。不过，如果 untracked files 出现在 batch planned Files list 的路径上，rollback（`git clean -fd -- <paths>`）会删除它们。若检测到此类 overlap，警告用户，并建议在继续前 commit 或 stash 这些 files。

如果 tracked files dirty，停止并展示 options：（1）commit current changes，（2）显式 stash（`git stash push -m "pre-delegation"`），（3）continue in standard mode（将 `delegation_active` 设为 false）。不要 auto-stash user changes。

**Delegation invocation（委托调用）：** 对每个 batch，将以下步骤作为**独立 Bash tool calls**执行（不要合并成一个）：

**Step A — Launch（启动；background，separate Bash call）：**

写入 prompt file，然后使用 `run_in_background: true` 设置在 tool parameter 上做一次 Bash tool call。该 call 立即返回，没有 timeout ceiling。

把 setup 时捕获的 literal absolute path 替换到下方每个 `<scratch-dir>` 中。每个 Bash tool call 都启动 fresh shell，因此 setup snippet 中的 `$SCRATCH_DIR` variable 不会保留；未解析的 `$SCRATCH_DIR` 会展开为空并破坏 result detection。

```bash
# Substitute the resolved sandbox_mode value (yolo or full-auto) from the skill state
SANDBOX_MODE="<sandbox_mode>"

# Resolve sandbox flag
if [ "$SANDBOX_MODE" = "full-auto" ]; then
  SANDBOX_FLAG="-s workspace-write"
else
  SANDBOX_FLAG="--dangerously-bypass-approvals-and-sandbox"
fi

codex exec \
  $SANDBOX_FLAG \
  --output-schema "<scratch-dir>/result-schema.json" \
  -o "<scratch-dir>/result-batch-<batch-num>.json" \
  - < "<scratch-dir>/prompt-batch-<batch-num>.md"
```

**Conditional flags（条件 flags）** —— 只有当对应 skill-state value 已设置时，才包含每一行：

- 如果 `delegate_model` 已设置，在 `$SANDBOX_FLAG` 前插入一行 `  -m "<delegate_model>" \`。
- 如果 `effective_effort` 是 `medium`、`high` 或 `xhigh`（按上文 Per-Batch Effort 解析），在 `$SANDBOX_FLAG` 前插入一行 `  -c 'model_reasoning_effort="<effective_effort>"' \`。当 `effective_effort` 为 `default`（只有在 `delegate_effort` 未设置且 pick 为 `default` 时可能），省略该行——绝不要传 literal string `"default"`。

当任一 value 未设置时，完全省略其行——Codex 从用户的 `~/.codex/config.toml`（最终从 CLI 自身 built-in default）解析 default。不要用 placeholder string 替代 unset values。

Critical（关键）：`run_in_background: true` 必须作为 **Bash tool parameter** 设置，而不是 shell `&` suffix。tool parameter 才会移除 timeout ceiling。foreground Bash call 内的 shell `&` 仍会命中 2-minute default timeout。

当存在 `-c` flag 时，quoting 很关键：整个 key=value 使用 single quotes，TOML string value 内部使用 double quotes。示例：`-c 'model_reasoning_effort="high"'`。

不要临时发挥 CLI flags，也不要修改此 invocation template，除非是记录过的 conditional insertions。

**Step B — Poll（轮询；foreground，separate Bash calls）：**

launch call 返回后，发起一个**新的、独立的** foreground Bash tool call，poll result file。这保持 agent turn active，避免用户干扰 working tree。

把 setup 时捕获的 literal absolute path 替换为 `<scratch-dir>`。Step A 的 shell variable 不会在 separate Bash tool calls 之间保留。

```bash
RESULT_FILE="<scratch-dir>/result-batch-<batch-num>.json"
for i in $(seq 1 6); do
  test -s "$RESULT_FILE" && echo "DONE" && exit 0
  sleep 10
done
echo "Waiting for Codex..."
```

如果输出是 "Waiting for Codex..."，再发起同一个 polling command 作为另一个 separate Bash call。重复直到输出 "DONE"，然后读取 result file 并进入 classification。

**Polling termination conditions（轮询终止条件）：** 满足以下任一条件时停止 polling：

- **Result file appears（result file 出现）**（输出 "DONE"）-- 正常进入 result classification。
- **Background process exits with non-zero code（background process 以非零 code 退出）** -- 分类为 CLI failure（row 1）。Rollback，并对所有剩余 work fallback 到 standard mode。
- **Background process exits with zero code but result file is absent（background process 以零 code 退出但 result file 缺失）** -- 分类为 task failure（row 2：exit 0，result JSON missing）。Rollback，并递增 `consecutive_failures`。
- **5 polling rounds** 经过（约 5 分钟）仍未出现 result file 且没有 background process notification -- 视为 hung process。分类为 CLI failure（row 1）。Rollback，并 fallback 到 standard mode。

**Result classification（结果分类）：** Codex 负责在内部运行 verification，并在报告前修复 failures；orchestrator 不独立重新运行 verification。

| # | Signal（信号） | Classification（分类） | Action（动作） |
|---|--------|---------------|--------|
| 1 | Exit code != 0 | CLI failure | Rollback 到 HEAD。对所有剩余 work fallback 到 standard mode。 |
| 2 | Exit code 0，result JSON missing 或 malformed | Task failure | Rollback 到 HEAD。递增 `consecutive_failures`。 |
| 3 | Exit code 0，`status: "failed"` | Task failure | Rollback 到 HEAD。递增 `consecutive_failures`。 |
| 4 | Exit code 0，`status: "partial"` | Partial success | 保留 diff。本地完成剩余 work、verify 并 commit。递增 `consecutive_failures`。 |
| 5 | Exit code 0，`status: "completed"` | Success | Commit changes。将 `consecutive_failures` 重置为 0。 |

**Result handoff — surface to user（结果交接并展示给用户）：** 读取 result JSON 后，在 commit 或 rollback 前，展示 summary，让用户看到发生了什么。格式：

> **Codex batch <batch-num> — <classification>**（Codex batch 与分类）
> <summary from result JSON>（result JSON 中的 summary）
>
> **Files:** <comma-separated list from files_modified>（files_modified 中的文件列表）
> **Verification:** <verification_summary from result JSON>（result JSON 中的 verification_summary）
> **Issues:** <issues list, or "None">（issues 列表，或 "None"）

对 failure 或 partial results，包含 classification reason（例如 “status: failed”、“result JSON missing”），这样用户理解为什么 orchestrator 要 rollback 或在本地补完。

保持简短——目标是 transparency，不是大段文字。每个 batch 一个短 block。

**Rollback procedure（回滚流程）：**

```bash
git checkout -- .
git clean -fd -- <paths from the batch's combined Files list>
```

Do NOT use bare `git clean -fd` without path arguments（不要使用不带 path arguments 的 bare `git clean -fd`）。

**Commit on success（成功后提交）：**

```bash
git add $(git diff --name-only HEAD; git ls-files --others --exclude-standard)
git commit -m "feat(<scope>): <batch summary>"
```

**Between batches（批次之间）**（plans 被拆成 multiple batches 时）：报告已完成内容、test results 和下一步。除非用户介入，否则立即继续——checkpoint 的存在是为了让用户 *可以* steer，而不是必须输入。

**Circuit breaker（熔断器）：** 3 consecutive failures 后，将 `delegation_active` 设为 false，并输出："Codex delegation 已在连续 3 次 failures 后停用 -- 剩余 units 将用 standard mode 完成。"

**Scratch cleanup（scratch 清理）：** 不需要显式 cleanup——OS temp 会最终处理（macOS `$TMPDIR` periodic purge；Linux/WSL `/tmp` reboot 或 periodic cleanup）。run 后保留 `<scratch-dir>` 也有助于在出错时保留 intermediate artifacts 供 debugging。

## Mixed-Model Attribution（混合模型归因）

当部分 units 由 Codex 执行、其他 units 在本地执行：
- 如果所有 units 都用了 delegation：归因给 Codex model
- 如果所有 units 都用了 standard mode：归因给 current agent 的 model
- 如果混合：在 PR description 中说明哪些 units delegated，并 credit both models
