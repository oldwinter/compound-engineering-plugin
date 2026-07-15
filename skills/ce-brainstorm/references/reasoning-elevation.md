# Fable Elevation（仅 Claude Code）

只有在 Claude Code host check（见下方 gate）明确为 positive 后，才加载这个 reference。它包含完整的 elevation engine；调用方 `SKILL.md` 只保留一个不含 model name 的 pointer。绝不要把本文件的任何部分 inline 到 always-loaded `SKILL.md` 中；其他 harness 上的 silent no-op 依赖这段文本永远不在非 Claude context 中发布。

Elevation 通过 subagent 把 reasoning-heavy authoring/interpretation step 分派给更强的 reasoning model（在 Claude Code 中为 **Fable**），让使用较便宜 session model 的用户无需切换整个 session，也能得到 high-reasoning result。

## Mechanical host gate：第一个有序 step

在读取任何 Fable config key、解析 Fable intent 或输出任何 Fable string 之前，使用与 `ce-code-review` 相同的 env-var union 自我识别 host：

```bash
if [ -n "${CURSOR_AGENT:-}${CURSOR_CONVERSATION_ID:-}" ]; then HOST=cursor;
elif [ "${CLAUDECODE:-}" = "1" ]; then HOST=claude;
elif [ -n "${CODEX_SANDBOX:-}${CODEX_SESSION_ID:-}${CODEX_THREAD_ID:-}${CODEX_CI:-}" ]; then HOST=codex;
else HOST=unknown; fi;
echo "HOST: $HOST"
```

这些都是 **host-provided environment variables**：Claude Code runtime 设置 `CLAUDECODE=1`，Cursor 设置 `CURSOR_AGENT` / `CURSOR_CONVERSATION_ID`，Codex 设置 `CODEX_*` markers。该 skill 只读取它们，绝不自行设置。必须真正 **使用 shell tool 运行这项检查**，并 **根据输出的 `HOST:` 行分支**。`echo` 是 load-bearing：variable 设置在 shell process 内，command 退出后就会消失；如果不读取打印值，就没有可观测的 host 可用于 gate。不能从 context 推断该值。

只有当 `HOST=claude` 时才继续 elevation。当 host 为 `cursor`、`codex` 或 `unknown` 时，elevation 关闭且 inert：不读取 Fable config，不解析 intent，不 dispatch，不提及 Fable。这些 host 上偶然出现的 "use fable" prompt 由 SKILL.md pointer 处理，不会命名 model。

## Activation resolution（仅在 `HOST=claude` 后）

按优先级 resolve 每个 skill 的 boolean：

1. **In-prompt intent**：对本次 run 的 prompt 做 reasoning。Affirmative intent（"use fable"、"get fable help"、"have fable plan this"）→ elevate。Negative intent（"don't use fable"、"no fable"）→ 不 elevate。Intent 需要 *reasoning，而不是 keyword matching*：仅仅把 "fable" 作为 subject matter 提及（例如 "design a fable-generator feature"）不构成 activation。
2. **Config**：否则使用 per-skill key：ce-plan 用 `plan_use_fable`，ce-brainstorm 用 `brainstorm_use_fable`。读取方式必须与该 skill 在 Phase 0.0 resolve `plan_output` / `brainstorm_output` 的方式完全相同：如果 skill 已有 pre-resolved repo root，就使用它；否则运行 `git rev-parse --show-toplevel`，然后使用 native file-read tool 读取 `<repo-root>/.compound-engineering/config.local.yaml`。该 skill 在 Phase 0.0 已经读过一次这个 file；如果结果仍在 context 中，直接复用，不要重读。忽略被 comment（`#` prefix）的 lines。`true` → elevate；missing / commented / invalid / `false` / no file → off。
3. **Pipeline runs**：pipeline / `disable-model-invocation` runs 没有 prompt，因此只根据 config resolve；如果 key 开启，则 elevate。它仍然受 host gate 约束：复制到非 Claude harness 的 config 绝不会触发 elevation。

如果 session model 已经是 Fable，elevation 没有意义：跳过 dispatch 和 nudge。

## Elevated dispatch（升级分派）

当 elevation 激活时，把 reasoning-heavy step 分派给 Fable subagent：

- 使用 platform subagent primitive，并对单个 agent 将 model override 为 **fable**（Claude Code `Agent`/`Task` tool 上的 `model: "fable"`）。
- 把 main agent 的完整 working context 作为 **由 subagent 自行读取的 file paths** 传递，绝不要传递重新叙述的 prose brief。如果所需内容只存在于 context，就 **把它写入你新建的 fresh scratch file**（例如在 OS temp dir 下用 `mktemp`），不要跳过或摘要：
  - **Research / grounding evidence。** ce-brainstorm 已经把 Phase 1.1 grounding dossier 写入 scratch path，直接传递。ce-plan 只在 context 中 consolidate Phase 1 research findings（Phase 1.4 会摘要，但不会写 file），因此 **立即把这些 consolidated findings serialize 到 scratch file 并传递**。Elevated author 必须解读与 inline path 完全相同的 research evidence，而不是只看最终 decisions。
  - **Dialogue / decisions。** 把该 skill 在 context 中累积的 dialogue/decisions 写入 fresh scratch file，并传递该 path。

  禁止 re-narration：main model 默认倾向压缩内容，而 lossy summary 是这项 quality bet 无法承受的 failure。因此应交付 files，而不是 summary。
- 告诉 subagent：对本次 run 而言，elevation **会在仅此一个 step 中覆盖该 skill 默认的 ceiling-tier convention**，也就是原本 reasoning-heavy step 会在 main conversation 中 inline 运行、不 dispatch 任何内容的 convention。
- 通过仍作为 orchestrator 的 main agent 转达 Fable output。

Elevated steps：**ce-plan** 负责解读 research findings 并编写 plan，合并为一次 interpret-then-author call；**ce-brainstorm** 负责生成 approaches。ce-brainstorm integration-check consult 已 defer，本版本尚未 wired。

## Transparency（透明性）

- `HOST=claude`，elevation 已触发 → 简短确认由 Fable 处理该 step。
- `HOST=claude`，已请求 Fable 但不可用（无 Fable access / dispatch 失败）→ 在 main model 上 inline 运行该 step，并简短说明 fallback。Elevation 绝不是 correctness dependency，也绝不阻塞 workflow。
- `HOST≠claude` → 保持静默（gate 已在本文件加载前停止）。

## Discoverability nudge（一次性提示）

当以下条件 **全部** 成立时，输出一行 tip，然后记录已显示：`HOST=claude`；run 完成时 elevation 未激活（没有 intent，config 关闭）；session 尚未使用 Fable；config 中 `fable_nudge` 不是 `false`；这不是 pipeline run；tip 还没有显示过一次。

"只显示一次" 由 **repo 外 stable path 上的 per-user marker file** 强制：按 user，而不是按 checkout，例如 `~/.config/compound-engineering/fable-nudge-seen`。显示前，如果 marker 存在，就跳过 nudge。显示后，创建 marker（包括其 parent dir）。Marker 不存在表示 "尚未显示"。

- **ce-plan：** `💡 提示：在 prompt 中加入 "use fable"，Fable 就会用更深的 reasoning 编写 plan，而 session model 保持不变。设置 plan_use_fable: true 可将其设为默认。`
- **ce-brainstorm：** `💡 提示：说 "use fable"，Fable 就会生成更锐利的 approaches，无需切换 session。设置 brainstorm_use_fable: true 可默认启用。`

当 elevation 已激活（重复）、处于 pipeline runs（没有 reader）或不在 Claude 上（gate 已早先停止）时，绝不显示 nudge。
