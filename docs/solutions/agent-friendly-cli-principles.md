# 构建 Agent-Friendly CLIs：实践原则

CLI 天然适合 agents：text in、text out，且设计上可组合。对大多数面向开发者的 agent 工作来说，它们也比 MCP 更实际：LLMs 已经从训练数据中知道常见 CLI tools，因此没有 schema overhead。一个 MCP server 在回答单个问题前，仅加载 tool definitions 就可能消耗数万 tokens；而一次 CLI call 只消耗 command 和 output。MCP 在 agents 需要 per-user auth 和 structured governance 时值得承担复杂度；但对开发者日常构建和使用的 tools，一个设计良好的 CLI 更快、更便宜，也更可靠。

不过细节仍会绊住 agents：它们无法回答的 interactive prompts、没有 examples 的 help pages、只说 "invalid input" 却不解释的 error messages、把有用 data 埋在 formatting 里的 output。随着 agents 成为 developer tooling 的真实消费者，CLI design 需要显式考虑它们。

本 guide 综合 Anthropic 的 tool-design guidance、Command Line Interface Guidelines project、CLI-Anything，以及 practitioner experience，形成 **7 条实践原则**，用于评估一个 CLI 只是能被 agents 勉强使用，还是已经为它们很好地 optimized。

这不是 generic CLI style guide。它是一个 rubric，用于评估那些意图与 AI agents 良好协作的 CLIs。

---

## 如何使用此 Rubric

本 guide 有意带有明确立场，但它 **不是 pass/fail**。

使用每条 finding 将 CLI 分为三个 levels：

| Level | 含义 | 对 agents 的典型影响 |
|---|---|---|
| Blocker | 阻止可靠 agent use | Hangs、需要 human intervention，或让 output 难以 recover |
| Friction | Agents 可以使用，但低效或不可靠 | 更多 retries、浪费 tokens、brittle parsing、额外 tool calls |
| Optimization | 提升 speed、cost 和 robustness | 更好的 agent throughput、更低 token cost、更少 corrective loops |

实践中，应按 **command type** 评估 commands，而不只在 CLI level 评估：

| Command type | 最重要的原则 |
|---|---|
| Read/query commands | Structured output、bounded output、composability |
| Mutating commands | Non-interactive execution、actionable errors、safety、可行时 idempotence |
| Streaming/logging commands | Filtering、truncation controls、clean stderr/stdout behavior |
| Interactive/bootstrap commands | Automation escape hatch、`--no-input`、scriptable alternatives |
| Bulk/export commands | Pagination、range selection、machine-readable output |

这能让 rubric 更实际。例如 idempotence 对许多 mutating commands 很关键，但不是每个 `tail -f` 风格 command 都需要满足它。

---

## 7 条原则

| # | 原则 | 为什么重要 |
|---|-----------|---------------|
| 1 | Automation paths 默认 non-interactive | Agents 无法可靠回答 prompts 或 navigate TUI flows |
| 2 | Structured、parseable output | Agents 需要 stable data contracts，而不是 presentation formatting |
| 3 | Progressive help discovery | Agents 会逐步探索 tools，并受益于 concrete examples |
| 4 | Fail fast with actionable errors | 当 errors 明确告诉下一步如何修正时，agents recover 得更好 |
| 5 | Safe retries and explicit mutation boundaries | Agents 会 retry、resume 和 recover；commands 不能让这变危险 |
| 6 | Composable and predictable command structure | Agents 会 chain commands，并依赖 consistent affordances |
| 7 | Bounded, high-signal responses | 额外 output 会消耗 context、time 和 tool budget |

---

## 1. Automation Paths 默认 Non-Interactive

**原则：** 任何 agent 可能合理 automate 的 command，都应该能在无 prompts 的情况下 invoke。Interactive mode 仍可存在，但它应是 convenience layer，而不是唯一路径。

CLI Guidelines project 强烈支持此原则：如果 stdin 不是 TTY，command 就不应 prompt，且 `--no-input` 应完全禁用 prompting。从 agent-tooling guidance 推出的更广义结论很直接：会停下来等待 human intervention 的 tools 不适合 autonomous execution。

**好的形态：**

```bash
# Human at a terminal (TTY detected) — prompts fill in missing inputs
$ blog-cli publish
? Status? (use arrow keys)
    draft
  > published
    scheduled
? Status? published
? Path to content: my-post.md
Published "My Post" to personal

# Agent or script (no TTY, or --no-input) — flags only, no prompts
$ blog-cli publish --content my-post.md --yes
Published "My Post" to personal (post_id: post_8k3m)
```

- `Blocker`: 常见 automation command 无法无 prompt 运行
- `Friction`: 部分 prompts 可绕过，但 subcommands 间 behavior 不一致
- `Optimization`: 每条 automation path 都支持 explicit flags 和 global non-interactive mode

推荐特征：

- 支持 `--no-input` 或 `--non-interactive`
- 检测 TTY vs non-TTY，且 stdin 非 interactive 时绝不 prompt
- 在合适场景支持 `--yes` / `--force` 绕过 confirmation
- 通过 flags、files 或 stdin 接受 structured input

**评估目标：** 验证 commands 在 non-interactive execution 中不会 hang 等待 input。

**一个实用检查（POSIX shell + Python 3 example）：**

```bash
python3 - <<'PY'
import subprocess, sys

cmd = ["blog-cli", "publish", "--content", "my-post.md"]
try:
    result = subprocess.run(
        cmd,
        stdin=subprocess.DEVNULL,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        timeout=10,
    )
    print("exit:", result.returncode)
    print("PASS: command exited without hanging")
except subprocess.TimeoutExpired:
    print("FAIL: command hung waiting for input")
    sys.exit(1)
PY
```

根据环境调整机制。关键是 test purpose：**detach stdin and enforce a timeout**。

---

## 2. Structured、Parseable Output（结构化、可解析输出）

**原则：** 返回 data 的 commands 应暴露 stable machine-readable representation 和 predictable process semantics。

Anthropic 明确建议 tools 返回 meaningful context，并针对 token efficiency optimize tool responses。CLIG 明确建议 `--json`、clean stdout/stderr separation，以及在 non-TTY contexts 中 suppress presentation formatting。本 document 将这些 guidance 扩展为 agent use 的 CLI-evaluation rule。

**好的形态：**

```bash
# Human-readable
$ blog-cli publish --content my-post.md
Published "My Post" to personal
URL: https://personal.blog.dev/my-post
Post ID: post_8k3m

# Machine-readable
$ blog-cli publish --content my-post.md --json
{"title":"My Post","url":"https://personal.blog.dev/my-post","post_id":"post_8k3m","status":"published"}
```

- `Blocker`: output 只有 prose、tables 或 ANSI-heavy formatting，没有 stable parse path
- `Friction`: 部分 commands 支持 structured output，但 coverage 不一致，或 stderr/stdout 混杂
- `Optimization`: 所有 data-bearing commands 都提供 stable machine-readable mode，并包含 useful identifiers

推荐特征：

- 在 data-bearing commands 上支持 `--json` 或其他清晰 documented machine-readable format
- Success 使用 exit code `0`，failure 使用 non-zero
- 将 result data 写入 stdout，将 diagnostics/logs/errors 写入 stderr
- 返回 meaningful fields，例如 names、URLs、status 和 IDs
- 非 TTY 时 suppress color、spinners 和 decorative output

**评估目标：** 验证 structured output valid、稳定到足以 parse，且与 diagnostics cleanly separated。

**一个实用检查（POSIX shell + Python 3 example）：**

```bash
blog-cli publish --content my-post.md --json 2>stderr.txt | python3 -c '
import json, sys
data = json.load(sys.stdin)
required = ["title", "url", "post_id", "status"]
missing = [field for field in required if field not in data]
sys.exit(1 if missing else 0)
'
echo "json-valid: $?"
test ! -s stderr.txt
echo "stderr-empty-on-success: $?"
rm -f stderr.txt
```

---

## 3. Progressive Help Discovery（渐进式帮助发现）

**原则：** Agents 很少能从一份 giant document 学会 CLI。它们会 probe top-level help，再 probe subcommand help，再看 examples。Help 应支持这种 workflow。

CLIG 直接建议 concise help、examples、subcommand help 和 deeper docs links。Anthropic 也展示了 precise tool descriptions 和 examples 会显著改善 tool-use behavior。这里的推论是：CLI help 应被设计成 layered runtime documentation。

**好的形态：**

```bash
$ blog-cli --help
Usage: blog-cli <command>

Commands:
  publish     Publish content
  posts       List and manage posts

$ blog-cli publish --help
Publish a markdown file to your blog.

Options:
  --content   Path to markdown file
  --status    Post status (draft, published, scheduled; default: published)
  --yes       Skip confirmation prompt
  --json      Output as JSON
  --dry-run   Preview without publishing

Examples:
  blog-cli publish --content my-post.md
  blog-cli publish --content my-post.md --status draft
  blog-cli publish --content my-post.md --dry-run
```

- `Blocker`: subcommands 难以 discover，或 `--help` 缺失/不完整
- `Friction`: help 存在，但缺少 concrete invocation patterns 或 required argument guidance
- `Optimization`: help layered、concise、example-driven，并在需要时指向 deeper docs

推荐特征：

- Top-level help 清晰列出 commands
- Subcommand help 包含 synopsis、required inputs、key flags，并为 non-trivial commands 至少提供一个 concrete example
- Common flags 靠前出现
- 需要时从 help 链接 deeper docs

**评估目标：** 验证 agent 无需离开 CLI 或阅读 source code，即可 discover 如何 invoke command。

**比 `grep example` 更好的检查：**

对每个重要 subcommand，检查 help 是否包含以下四项：

1. 一行 purpose
2. Concrete invocation pattern（具体调用模式）
3. Required arguments 或 required flags
4. 最重要 modifiers 或 safety flags

如果缺少其中一项，通常视为 `Friction`。若缺少多项，则对 discoverability 来说是 `Blocker`。

---

## 4. Fail Fast，并提供 Actionable Errors

**原则：** command 失败时，error 应帮助 agent 修正下一次尝试。

这直接受到 Anthropic guidance 支持：error responses 应传达具体、actionable improvements，而不是 opaque codes 或 tracebacks。CLIG 也建议 clear error handling 和 concise output。

**好的形态：**

```bash
# Bad
$ blog-cli publish
Error: missing required arguments

# Better
$ blog-cli publish
Error: --content is required.
Usage: blog-cli publish --content <file> [--status <status>]
Available statuses: draft, published, scheduled
Example: blog-cli publish --content my-post.md
```

- `Blocker`: failures 含糊、silent，或埋在 stack traces 中
- `Friction`: errors 说明哪里失败，但没说明如何 correct
- `Optimization`: errors 包含 correction path、valid values 和附近 examples

推荐特征：

- 包含 correct syntax 或 usage pattern
- Validation 失败时建议 valid values
- 在 side effects 前 early validate
- 默认优先 actionable text，而不是 raw tracebacks

**评估目标：** 验证 failed invocation 会告诉下一位 caller 如何成功。

**一个实用检查：**

```bash
error_output=$(blog-cli publish 2>&1 >/dev/null)
exit_code=$?
printf '%s\n' "$error_output"
echo "exit=$exit_code"
```

按以下问题评估 error：

- 是否说明哪里错了？
- 是否展示 correct invocation shape？
- 是否建议 valid values 或 next steps？

如果只有第一个问题为 yes，通常是 `Friction`，不是 `Optimization`。

---

## 5. Safe Retries 与 Explicit Mutation Boundaries

**原则：** Agents 会 retry、resume，有时会 replay commands。Mutating commands 应在可行时让这件事安全，而 dangerous mutations 应显式。

本 section 有意比 sources 稍进一步。Anthropic 强调 clear boundaries、careful tool selection，以及 destructive tools 的 annotations；CLIG 强调 confirmations、`--force` 和 `--dry-run`。从 agent-readiness 角度，实际综合结论是：retries 必须足够安全，automation 才不会 reckless。

**好的形态：**

```bash
# Repeating the same command does not create duplicate work
$ blog-cli publish --content my-post.md
Published "My Post" to personal (post_id: post_8k3m)

$ blog-cli publish --content my-post.md
Already published "My Post" to personal, no changes (post_id: post_8k3m)

# Dangerous mutation is explicit
$ blog-cli posts delete --slug my-post --confirm
```

- `Blocker`: retry mutating command 很容易 duplicate 或 corrupt state，且无 warning
- `Friction`: destructive commands 可 script，但 preview 或 state feedback 很少
- `Optimization`: 可行时 retries safe，destructive intent explicit 且 inspectable

推荐特征：

- 对 consequential mutations，在可行时提供 `--dry-run`
- 对 dangerous operations 使用 explicit destructive flags
- Success output 返回足够 state，便于 verify 发生了什么
- Domain 允许时，让 duplicate application 成为 no-op 或可明确检测

重要范围说明：

- 对 **create/update/deploy/apply** commands，idempotence 或 duplicate detection 通常很有价值
- 对 **append/send/trigger/run-now** commands，精确 idempotence 可能不可行；此时 CLI 至少应让 mutation boundaries explicit，并返回 audit-friendly identifiers

**评估目标：** 验证 retrying 或 re-running command 不会出人意料地危险。

**实用检查：**

- 将同一个 low-risk mutating command 运行两次并比较 outcomes
- 检查 destructive commands 是否暴露 preview、confirmation-bypass 或 explicit-danger affordances
- 检查 success output 是否包含 identifiers，使 agent 能判断自己是否重复了工作

---

## 6. Composable 且 Predictable 的 Command Structure

**原则：** Agents 通过 chaining commands 解决任务。它们受益于能接受 stdin、产生 clean stdout、且 naming 与 subcommand structure 可预测的 CLIs。

CLIG 强烈支持 composition：支持 stdin/stdout、`-` 作为 pipes、clean stderr separation，并尽可能 order-independent argument handling。Anthropic 另建议选择 thoughtful、composable tools，而不是迫使 agents 经历许多 low-level steps。CLI evaluation 的实际综合点是：consistency plus pipeability。

**好的形态：**

```bash
cat posts.json | blog-cli posts import --stdin
blog-cli posts list --json | blog-cli posts validate --stdin
blog-cli posts list --status draft --limit 5 --json | jq -r '.[].title'
```

- `Blocker`: commands 无法参与 pipelines，或 invocation structure 不一致
- `Friction`: 部分 commands pipeable，但 naming 和 structure unpredictable
- `Optimization`: CLI 易于 chain，因为 inputs、outputs 和 subcommand patterns regular

推荐特征：

- 当 input 合理来自另一条 command 时，接受 flags、files 或 stdin
- 在涉及 file paths 时支持 `-` 作为 stdin/stdout alias
- 相关 resources 的 command structures 保持一致
- 对 ambiguous multi-field operations 优先使用 flags；将 positional arguments 保留给 familiar、conventional cases
- 避免要求 users 记住 arbitrary ordering rules for flags and subcommands

**评估目标：** 验证 commands 可 chain，而无需 brittle adapters 或 special-case knowledge。

**实用检查：**

- 当 input 逻辑上来自另一条 command 时，command 能否 consume stdin 或 `-`？
- data command 的 output 能否 pipe 到另一 tool，而不需要 strip logs 或 ANSI codes？
- Related commands 是否使用类似 verb/resource patterns？

这比要求每个 CLI 都采用特定 grammar（例如 `resource verb`）更好的 evaluation axis。

---

## 7. Bounded、High-Signal Responses（有边界、高信号响应）

**原则：** Agents 为每一行额外 output 付出真实成本。Large outputs 有时合理，但 CLI 应让 narrow、relevant responses 成为 default path。

这与 Anthropic 的 token-efficiency guidance 直接一致：对 large responses 使用 pagination、filtering、truncation 和 sensible defaults，并引导 agents 使用 narrowing strategies。本 document 为 CLIs 增加一个 practical optimization stance：command 可能 usable，但仍然 wasteful。

**好的形态：**

```bash
# Broad but bounded
$ blog-cli posts list --limit 25
Showing 25 of 312 posts
To narrow results: blog-cli posts list --status published --since 7d --limit 10

# More precise
$ blog-cli posts list --tag javascript --status published --since 30d --limit 10 --json
```

- `Blocker`: routine query command 默认 dump 巨大 output，且无 narrowing controls
- `Friction`: narrowing 存在，但 defaults 过宽，或 truncation 不给 guidance
- `Optimization`: defaults bounded、filters obvious，truncation 教下一条更好的 query

推荐特征：

- 对可能 large 的 result sets，支持 filtering、pagination、range selection 和 limits
- 有帮助时提供 concise vs detailed response modes
- Truncating 时解释如何 narrow 或 page query
- 先返回 semantic identifiers 和 summaries，再返回 raw detail

关于阈值：

- 默认 response 舒适地低于几百行，对 agents 通常是强 optimization
- 如果 command 天生 export-oriented 或 data volume 是 intrinsic，更大的 default 不必然错误
- 评估时，优先问 default 是否 **proportionate to the common task**，而不是把固定行数当 hard fail

**评估目标：** 验证 agents 能得到 relevant answers，而无需先为 unnecessary data dump 付费。

**实用检查：**

- 比较 default output 与 filtered output，检查 narrowing 是否显著降低 volume
- 检查 command 是否暴露 `--limit`、filters、time bounds、selectors 或 pagination
- 如果 default output 很大，检查该 command 是否明确是 export/bulk command，而不是 routine query surface

作为 heuristic，除非 command 明确 bulk-oriented 且有相应 documentation，否则默认 output 超过约 500 行可视为 likely `Friction` signal。

---

## 快速评估 Checklist

使用此表快速评估 CLI，同时避免把每个问题都假装成 binary：

| # | Check | 你在测试什么 | 缺失时的典型 severity |
|---|-------|----------------------|-----------------------------|
| 1 | Non-interactive path | command 能否在 stdin detached 且无 prompt 下运行？ | `Blocker` |
| 2 | Structured output | Agents 能否无需 scrape prose 得到 machine-readable output？ | `Blocker` or `Friction` |
| 3 | Discoverable help | Agent 能否仅通过 `--help` 找到 invocation shape？ | `Friction` |
| 4 | Actionable errors | Failure 是否教下一次正确 invocation？ | `Friction` |
| 5 | Safe mutation boundaries | Retries、destructive actions 和 previews 是否被显式处理？ | `Blocker` or `Friction` |
| 6 | Composition | command 能否干净参与 pipelines？ | `Friction` |
| 7 | Bounded output | defaults 对常见 agent tasks 是否合理 scoped？ | `Friction` or `Optimization` |

---

## 推荐评估流程

评估真实 CLI 时，按以下顺序 review：

1. 按 type 选择 representative commands：一个 read command、一个 mutating command、一个 bulk/logging command，以及任何 intentional interactive workflow。
2. 先检查 automation blockers：prompts、unusable help、prose-only output、mixed stdout/stderr。
3. 接着检查 recovery quality：error messages、validation、stable identifiers、repeatability。
4. 最后检查 optimization：narrowing defaults、concise modes、consistent structure、pipeability。

这样可以避免在确认 agents 是否根本可用之前，就因缺少 optimizations 对 CLI 过度扣分。

---

## 来源

### 主要来源

- [Writing effective tools for agents — Anthropic Engineering](https://www.anthropic.com/engineering/writing-tools-for-agents) — 关于 meaningful context、token efficiency、actionable errors 和 evaluation-driven optimization 的 tool design guidance primary source。
- [Command Line Interface Guidelines](https://clig.dev/) — 关于 help、stdout/stderr separation、interactivity、arguments/flags 和 composability 的 CLI behavior primary source。
- [CLI-Anything](https://clianything.org/) — 有用的 agent-CLI reference point，强调 self-description、composability、JSON output 和 deterministic behavior。最好视作 practitioner framework，而不是 standards source。

### 其他参考

- [Why CLI is the New MCP — OneUptime](https://oneuptime.com/blog/post/2026-02-03-cli-is-the-new-mcp/view) — 关于 CLI 为什么仍是强 agent integration surface 的 opinionated ecosystem commentary。
- [How to Write a Good Spec for AI Agents — Addy Osmani](https://addyosmani.com/blog/good-spec/) — 与 layered documentation 和 context budgeting 相关，但不是 CLI-specific guidance 的 primary source。
