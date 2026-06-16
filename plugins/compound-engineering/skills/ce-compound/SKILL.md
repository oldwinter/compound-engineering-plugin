---
name: ce-compound
description: 记录最近解决的问题，用于 compound 团队知识，或维护项目共享领域词汇表 CONCEPTS.md。
argument-hint: "[optional: 简短 context] [mode:headless] "
---

# /ce-compound

协调多个并行 subagents，记录最近解决的问题。

## Purpose（目的）

在 context 仍新鲜时捕获 problem solutions，在 `docs/solutions/` 中创建带 YAML frontmatter 的结构化文档，便于搜索和未来引用。使用 parallel subagents 以获得最高效率。

**为什么叫 "compound"？** 每个被记录的 solution 都会 compound 团队知识。第一次解决问题需要 research。记录下来，下一次类似问题只需几分钟。Knowledge compounds。

## Usage（用法）

```bash
/ce-compound                            # 记录最近的 fix
/ce-compound [brief context]            # 提供额外 context hint
/ce-compound mode:headless              # automation 使用的非交互 run
/ce-compound mode:headless [context]    # 带 context hint 的非交互 run
```

## CONCEPTS.md Bootstrap Requests（引导请求）

如果 invocation 明确是从零创建或 bootstrap `CONCEPTS.md`，而不是记录一个 solved problem，不要运行 normal phases：`ce-compound` 只会作为记录真实 learning 的 side effect 填充 `CONCEPTS.md`（它 seed 的是 *learning's area*，不是 whole repo；见 Phase 2.4）。Repo-wide concept-map creation 是 `ce-compound-refresh` 的职责。将 standalone bootstrap request 重定向到 `ce-compound-refresh`（它会询问是 build concept map 还是 run refresh cycle），然后退出。

## Mode Detection（模式检测）

检查 `$ARGUMENTS` 中是否有 `mode:headless` token。以 `mode:` 开头的 tokens 是 flags，不是 context：在将剩余内容作为 brief context hint 前，先从 arguments 中移除 `mode:headless`。

| Mode（模式） | When（何时） | Behavior（行为） |
|------|------|----------|
| **Interactive**（default） | 没有 mode token | 询问 Full vs Lightweight，询问 session history（仅 Full），为 Discoverability Check consent 提示，最后显示 "What's next?" |
| **Headless** | arguments 中有 `mode:headless` | 没有 blocking questions。运行 **Full mode without session history**。如果存在 gap，静默应用 Discoverability Check edit。跳过 Phase 3 specialized reviews。以 structured terminal report 结束：没有 "What's next?" menu。 |

Headless mode 用于 automations 和无人回答问题的 skill-to-skill invocation。Doc 本身与 interactive Full run 产物相同：classification work（track、category、overlap）遵循相同规则，且不会向 artifact 写入额外内容。一旦检测到，headless mode 适用于整个 run。

## Pre-resolved Context（预解析 Context）

**Git branch（pre-resolved）：** !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`

如果上方 line 解析为 plain branch name（如 `feat/my-branch`），在 Phase 1 的 `ce-sessions` invocation payload 中包含它，这样 orchestrator 不会浪费一轮去推导。如果它仍包含 backtick command string 或为空，省略它并让 `ce-sessions` 在 runtime 推导。

## Support Files（支持文件）

这些 files 是 workflow 的 durable contract。在需要它们的 step 按需读取；不要在 skill start 时 bulk-load。

- `references/schema.yaml`：canonical frontmatter fields 和 enum values（validating YAML 时读取）
- `references/yaml-schema.md`：从 problem_type 到 directory 的 category mapping（classifying 时读取）
- `references/concepts-vocabulary.md`：CONCEPTS.md format 和 inclusion rules（Phase 2.4 中 domain terms surface 时读取）
- `assets/resolution-template.md`：new docs 的 section structure（assembling 时读取）
- `scripts/validate-frontmatter.py`：frontmatter parser-safety validator（Phase 2 step 8 中通过 documented existence guard 运行；仅 Claude Code 可通过 `${CLAUDE_SKILL_DIR}` resolve，其它平台使用 manual-checklist fallback）

Spawning subagents 时，将 relevant file contents 放进 task prompt，让它们无需 cross-skill paths 也拥有 contract。

## Execution Strategy（执行策略）

**在 headless mode 中**，跳过下面两个问题，直接进入 **Full Mode**，且 session history disabled。Phase 1 的 session-history step（step 4）省略。直接进入 research。

**在 interactive mode 中**，继续前使用平台 blocking question tool 向用户呈现两个 options：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中展示 options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。

```
1. Full (recommended) — 完整 compound workflow。Research、
   cross-reference 并 review 你的 solution，产出能够 compound
   团队知识的 documentation。

2. Lightweight — 相同 documentation，single pass。更快且使用
   更少 tokens，但不会 detect duplicates，也不会 cross-reference
   existing docs。最适合 simple fixes 或接近 context limits 的 long sessions。
```

在 interactive mode 中，不要 pre-select mode，不要跳过此 prompt，继续前等待用户选择。（Headless mode 按上方 "**In headless mode**" 规则绕过此 prompt 并直接运行 Full：这些 "do not skip" directives 不适用于 headless。）

**如果用户选择 Full**（仅 interactive mode），继续前询问一个 follow-up question。检测当前运行的 harness（Claude Code、Codex 或 Cursor）并询问：

```
是否还要搜索你的 [harness name] session history，
寻找有助于 Compound process 的相关 knowledge？这会增加
时间和 token 用量。
```

如果用户回答 yes，在 Phase 1 中调用 `ce-sessions`（见 step 4）。如果 no，则跳过。不要在 lightweight mode 或 headless mode 中询问。

---

### Full Mode（完整模式）

<critical_requirement>
**Primary deliverable 是 ONE file：最终 documentation。**

Phase 1 subagents 向 orchestrator 返回 TEXT DATA。它们不得使用 Write、Edit 或创建任何 files。只有 orchestrator 写 files。除 Phase 2 solution doc 外，其它 writes 是 maintenance side effects，而不是 additional deliverables；缺失时创建也是预期行为，不违反此规则：
- **`CONCEPTS.md`**：Phase 2.4（Vocabulary Capture）中 qualifying domain term surface 时创建或更新。
- **A project instruction file**（AGENTS.md 或 CLAUDE.md）：Discoverability Check 发现 gap 时进行 small edit。

两者都确保 future agents 能 discover 并 ground in knowledge store；二者都不改变 documentation 是 single deliverable 的事实。
</critical_requirement>

### Phase 0.5: Auto Memory Scan（自动 Memory 扫描）

启动 Phase 1 subagents 前，检查注入 system prompt 的 auto-memory block 中是否有与正在记录的问题相关的 notes。

1. 查找 system prompt context 中已存在、标记为 "user's auto-memory" 的 block（仅 Claude Code）：MEMORY.md entries 会内联在那里
2. 如果 block 缺失、为空，或当前不是 Claude-Code platform，跳过此 step 并原样进入 Phase 1
3. 扫描 entries，寻找与正在记录的问题相关的内容：使用 semantic judgment，而不是 keyword matching
4. 如果找到 relevant entries，准备一个带 label 的 excerpt block：

```
## 来自 auto memory 的补充 notes
将其作为 additional context，而不是 primary evidence。Conversation history
和 codebase findings 优先于这些 notes。

[relevant entries here]
```

5. 将此 block 作为 additional context 传给 Phase 1 中 Context Analyzer 和 Solution Extractor 的 task prompts。如果任何 memory notes 最终进入 final documentation（例如作为 investigation steps 或 root cause analysis 的一部分），用 "(auto memory [claude])" 标记，让 future readers 清楚其来源。

如果没有找到 relevant entries，不传递 memory context，继续 Phase 1。

### Phase 1: Research（研究）

启动 research subagents。每个 subagent 向 orchestrator 返回 text data。

**Dispatch order（派发顺序）：**
- 并行启动 `Context Analyzer`、`Solution Extractor` 和 `Related Docs Finder`（background）
- **然后** 通过平台的 skill-invocation primitive 调用 `ce-sessions` skill（见下方 step 4）：仅当用户 opt in session history 时。该 skill call 从 orchestrator 的 main-context turn 看是 synchronous，但已 dispatch 的 background subagents 仍在底层 parallel 运行，所以保留 wall-clock benefit（`max(ce-sessions, slowest background subagent)`，而不是二者相加）。如果在 parallel block 前发起 skill call，会把 ce-sessions 串行放在 research subagents 前面，导致 wall-clock time 回退。

<parallel_tasks>

#### 1. **Context Analyzer（上下文分析器）**
   - 提取 conversation history
   - 读取 `references/schema.yaml` 进行 enum validation 和 **track classification**
   - 从 problem_type 判断 track（bug 或 knowledge）
   - 识别 problem type、component 和 track-appropriate fields：
- **Bug track（bug 轨道）**：symptoms、root_cause、resolution_type
- **Knowledge track（knowledge 轨道）**：applies_when（symptoms/root_cause/resolution_type optional）
   - 将 auto memory excerpts（如果 orchestrator 提供）作为 supplementary evidence 纳入
   - 读取 `references/yaml-schema.md`，用于映射 category 到 `docs/solutions/`
   - 使用 `[sanitized-problem-slug].md` pattern 建议 filename：不加 date suffix，即使 target directory 中已有 files 使用 date suffix；`date:` frontmatter field 才是 canonical creation date
   - 返回：YAML frontmatter skeleton（必须包含从 problem_type 映射出的 `category:` field）、category directory path、suggested filename，以及适用的 track
   - 不要从 memory 发明 enum values、categories 或 frontmatter fields；读取上方 schema 和 mapping files
   - 不要将 bug-track fields 强行套到 knowledge-track learnings，反之亦然

#### 2. **Solution Extractor（Solution 提取器）**
   - 读取 `references/schema.yaml` 进行 track classification（bug vs knowledge）
   - 基于 problem_type track 调整 output structure
   - 将 auto memory excerpts（如果 orchestrator 提供）作为 supplementary evidence 纳入：conversation history 和 verified fix 优先；如果 memory notes 与 conversation 矛盾，将该矛盾标记为 cautionary context

   **Bug track output sections（bug 轨道输出 sections）：**

   - **Problem**：用 1-2 句话描述 issue
   - **Symptoms（症状）**：observable symptoms（error messages、behavior）
   - **What Didn't Work**：failed investigation attempts 及其失败原因
   - **Solution**：actual fix，包含 code examples（适用时包含 before/after）
   - **Why This Works**：root cause explanation，以及 solution 为什么能解决它
   - **Prevention**：避免 recurrence 的 strategies、best practices 和 test cases。适用时包含 concrete code examples（例如 gem configurations、test assertions、linting rules）

   **Knowledge track output sections（knowledge 轨道输出 sections）：**

   - **Context**：是什么 situation、gap 或 friction 触发此 guidance
   - **Guidance**：practice、pattern 或 recommendation；有用时带 code examples
   - **Why This Matters**：遵循或不遵循此 guidance 的 rationale 和 impact
   - **When to Apply**：此 guidance 适用的 conditions 或 situations
   - **Examples**：展示该 practice in action 的 concrete before/after 或 usage examples

#### 3. **Related Docs Finder（相关 Docs 查找器）**
   - 搜索 `docs/solutions/` 中的 related documentation
   - 识别 cross-references 和 links
   - 查找 related GitHub issues
   - 标记任何现在可能 stale、contradicted 或 overly broad 的 related learning 或 pattern docs
   - **评估 overlap**：与即将创建的新 doc 在五个维度上比较：problem statement、root cause、solution approach、referenced files 和 prevention rules。Score：
     - **High**：4-5 个 dimensions match：本质上是同一个问题再次被解决
     - **Moderate**：2-3 个 dimensions match：同一 area，但角度或 solution 不同
     - **Low**：0-1 个 dimensions match：相关但不同
   - 返回：Links、relationships、refresh candidates 和 overlap assessment（score + matched dimensions）

   **Search strategy（搜索策略，grep-first filtering for efficiency）：**

   1. 从 problem context 提取 keywords：module names、technical terms、error messages、component types
   2. 如果 problem category 清晰，将 search 缩小到匹配的 `docs/solutions/<category>/` directory
   3. 读取任何 content 前，使用 native content-search tool（例如 Claude Code 中的 Grep）预筛 candidate files。并行运行多个 case-insensitive searches，目标是 frontmatter fields。下面是 template patterns：替换成实际 keywords：
      - `title:.*<keyword>`
      - `tags:.*(<keyword1>|<keyword2>)`
      - `module:.*<module name>`
      - `component:.*<component>`
   4. 如果 search 返回 >25 candidates，用更 specific patterns 重跑。如果 <3，扩大到 full content search
   5. 只读取 candidate files 的 frontmatter（前 30 行）来评分 relevance
   6. 只完整读取 strong/moderate matches
   7. 返回 distilled links 和 relationships，而不是 raw file contents

   **GitHub issue search（GitHub issue 搜索）：**

   优先使用 `gh` CLI 搜索 related issues：`gh issue list --search "<keywords>" --state all --limit 5`。如果未安装 `gh`，且 GitHub MCP tools（例如 `unblocked` data_retrieval）可用，则 fallback 到它们。如果两者都不可用，跳过 GitHub issue search，并在 output 中说明已跳过。

</parallel_tasks>

#### 4. **Session History via `ce-sessions`**（synchronous skill call，在启动 parallel block 后，仅当用户 opt in）
   - 如果用户在 follow-up question 中拒绝 session history、正在 lightweight mode 运行，或正在 headless mode 运行，则 **完全跳过**。
   - 通过平台的 skill-invocation primitive 调用 `ce-sessions` skill（Claude Code 中的 `Skill`、Codex 中的 `Skill`、Gemini/Pi 上的等价工具）。将下方 dispatch payload 作为 skill argument string 传入。`ce-sessions` 在 main context 中运行：它负责 discovery、branch/keyword filtering、scan-window selection、deep-dive cap、per-session extraction 到 `mktemp` scratch dir，以及 dispatch synthesis-only `ce-session-historian` subagent。compound orchestrator 只需传递 topic 和 time window，并读回 findings text。

   **Dispatch payload：保持 tight。** 冗长、keyword-rich 的 payload 会让 ce-sessions 继续扩大范围。使用此形状：

   - **Pre-resolved context**（仅当上方 values cleanly resolved；否则省略）：repo name、current git branch。
   - **Time window**：明确 `7 days`，除非正在记录的问题明显跨越更长 arc。
   - **Problem topic**：一句话命名 concrete issue：error message、module name、什么坏了以及如何修复。不要写 paragraph；不要写 related topics 的 bullet list。
   - **Filter rule（一行）**："Only surface findings directly relevant to this specific problem. Ignore unrelated work from the same sessions or branches."
   - **Output schema（输出 schema）**：

     ```
     Structure your response with these sections (omit any with no findings):
     - What was tried before
     - What didn't work
     - Key decisions
     - Related context
     ```

   不要追加 additional context blocks、exclusion lists 或 topic-keyword bullets：verbose payloads 会授权 ce-sessions 继续扩大 search，并快速 compound wall time。如果需要 keyword search，ce-sessions 会基于 topic 内部决定。
   - 返回：prior sessions 的 findings structured digest，或未找到时返回 "no relevant prior sessions"。
   - **ce-sessions 是最终 Phase 1 input，不是 workflow stop。** 它返回后，将其 output 作为最后一个 input，直接进入 Phase 2：不要 emit summary，也不要暂停等待用户。"no relevant prior sessions" 返回仍是 valid input；documentation 会在没有 session context 的情况下写入。

### Phase 2：Assembly & Write（组装与写入）

<sequential_tasks>

**继续前等待所有 Phase 1 inputs 完成**：三个 parallel subagents，以及用户 opt in 时的 synchronous `ce-sessions` skill call。ce-sessions 虽然是 skill 而不是 subagent，但仍是 Phase 1 input。

Orchestrating agent（main conversation）执行以下 steps：

1. 收集 Phase 1 subagents 的所有 text results
2. 决定写什么前，**检查 Related Docs Finder 的 overlap assessment**：

   | Overlap | Action |
   |---------|--------|
   | **High**：existing doc 覆盖相同 problem、root cause 和 solution | **Update existing doc**，加入 fresher context（new code examples、updated references、additional prevention tips），而不是创建 duplicate。Existing doc 的 path 和 structure 保持不变。 |
   | **Moderate**：相同 problem area，但 angle、root cause 或 solution 不同 | 正常 **Create new doc**。为 Phase 2.5 标记 overlap，以推荐 consolidation review。 |
   | **Low or none** | 正常 **Create new doc**。 |

   选择 update 而不是 create 的原因：两个描述同一 problem 和 solution 的 docs 必然 drift apart。Newer context 更 fresh、更可信，因此将其 fold into existing doc，而不是创建一个立刻需要 consolidation 的第二份 doc。

   Updating existing doc 时，保留其 file path 和 frontmatter structure。更新 solution、code examples、prevention tips 和任何 stale references。向 frontmatter 添加 `last_updated: YYYY-MM-DD` field。除非 problem framing 发生 material shift，否则不要更改 title。

3. **纳入 session history findings**（如果可用）。当 `ce-sessions` 返回 relevant prior-session context 时：
   - 将 investigation dead ends 和 failed approaches 放入 **What Didn't Work** section（bug track）或 **Context** section（knowledge track）
   - 使用 cross-session patterns 丰富 **Prevention** 或 **Why This Matters** sections
   - 用 "(session history)" 标记 session-sourced content，让 future readers 清楚其来源
   - 如果 findings 很薄或为 "no relevant prior sessions"，不使用 session context 继续
4. 从收集到的 pieces 组装完整 markdown file；为 new docs 读取 `assets/resolution-template.md` 获取 section structure
5. 根据 `references/schema.yaml` validate YAML frontmatter，包括 array items 的 YAML-safety quoting rule（YAML-safety quoting rule for array items；见 `references/yaml-schema.md` > YAML Safety Rules）
6. 需要时创建 directory：`mkdir -p docs/solutions/[category]/`
7. 写入 file：updated existing doc，或新的 `docs/solutions/[category]/[filename].md`
8. **Validate parser-safety of the written frontmatter**，捕获 prose rules 漏掉的 silent-corruption issues：malformed `---` delimiter lines、scalar values 中未 quote 的 ` #`（silent comment truncation），以及 scalar values 中未 quote 的 `: `（silent mapping confusion）。Bundled validator 位于 **skill bundle 内部**；在 Claude Code 中 `${CLAUDE_SKILL_DIR}` resolve 为 skill directory，但 runtime Bash tool 的 CWD 是用户 project，因此不带 `${CLAUDE_SKILL_DIR}` prefix 的 project-relative path 会 miss。通过 existence guard 运行，让无法 locate script 的平台（例如 native Codex/Gemini installs，`${CLAUDE_SKILL_DIR}` unset）fallback 到 manual check，而不是 silent skip protection：

   ```bash
   if [ -n "${CLAUDE_SKILL_DIR}" ] && [ -f "${CLAUDE_SKILL_DIR}/scripts/validate-frontmatter.py" ]; then
     python3 "${CLAUDE_SKILL_DIR}/scripts/validate-frontmatter.py" <output-path>
   else
     echo "Bundled validate-frontmatter.py not resolvable on this platform; applying the parser-safety checklist manually."
   fi
   ```

   - **如果 script 已运行：** exit 0 表示 parser-safe；exit 1 表示 stderr 会命名 offending field(s)：quote value(s)、rewrite doc，并重新运行直到 exit 0。Validation 失败时不要 declare success。
   - **如果 script 未运行**（else branch）：手动应用 validator checks，并匹配它的 exact scope；检查更广可能导致 validator 本不会要求的 edits。继续前通过 quote whole value 修复任何 violation：
     1. Opening 和 closing frontmatter delimiters 各自必须是一行内容为 `---` 的 line（trailing whitespace 可以；`----` 或 `---extra` 不是 valid delimiter）。
     2. 对每个 **top-level** mapping entry（`key: value`，无 leading indentation），如果 value **尚未 quoted 或 structured**（不以 `"`, `'`, `[`, `{`, `|`, 或 `>` 开头）：value 不得包含 unquoted ` #`（space-then-hash，YAML 会将其视为 comment 并 silent truncate），也不得包含 unquoted `: `（colon-then-space，strict YAML 可能读成 nested mapping）。如果出现任一情况，quote whole value。
     Nested values、array items 和 already-quoted values 不在这里的 scope 内（array-item quoting 由上方 schema/YAML-safety step 处理）。然后在 completion output 中说明 bundled script validator 在此平台 unavailable，已手动应用 checks。

   Validator 不 enforce schema rules，也不 flag YAML reserved-indicator characters（那些会 downstream 产生 loud parser errors，而非 silent corruption：out of scope）。仅使用 Python 3 stdlib（无 PyYAML 或其它 deps）。

Creating new doc 时，除非用户明确要求不同 structure，否则保留 `assets/resolution-template.md` 中的 section order。

</sequential_tasks>

### Phase 2.4：Vocabulary Capture（词汇捕获）

**首先，读取 `references/concepts-vocabulary.md`。** 这是 unconditional。不要凭 memory 预判没有任何 term qualifies：reference 的 criteria 并不显然，qualifying terms 常常存在于 surrounding conversation，而不是 new doc 本身。读取 reference 是此 phase 后续步骤成立的前提。

然后，应用这些 criteria，扫描 new doc **以及** surrounding conversation，寻找 qualifying domain terms。如果 repo root 存在 `CONCEPTS.md`，添加 missing qualifying terms，并在出现 new precision 时 refine existing entries。如果不存在且至少一个 qualifying term surfaced，则创建它。

**创建时 seed learning's area：不要只写一个孤立 term。** 当 `CONCEPTS.md` 尚不存在时，除了 surfaced term，也要按照 `references/concepts-vocabulary.md` 中的 **Seed goal** 和 **Scope of a seed** rules，seed 此 learning 触及 area 的 core domain nouns。Seed scoped to learning's area（fix 触及的 modules 和 domain），只定义这里调查过的 terms；不要延伸到 repo-wide nouns。这会锚定 surfaced term，避免它悬在 undefined siblings 旁边。Repo-wide concept map 是 `ce-compound-refresh` 的 bootstrap path，不是这个 workflow 的职责。

**创建时，对 borderline terms 保持 conservative qualifying bar。** Borderline term，或伪装成 entity 的 class/table/file name，推迟到后续 run：clear core nouns 会被 seeded，borderline ones 等待。Conservatism 关注 quality，而不是 count；对 existing file 的 updates 遵循 normal criteria。

**Bootstrapping file 时，在 `# Concepts` heading 下以此 preamble 开头**，然后在下方添加 qualifying entries：

> 本项目的 shared domain vocabulary：具有项目特定含义的 entities、named processes 和 status concepts。先用 core domain vocabulary seed，随后随着 ce-compound 和 ce-compound-refresh 处理 learnings 而积累；可以直接编辑。这里只是 glossary，不是 spec，也不是 catch-all。

**Refresh 你触及的任何 entry 的 coherence neighborhood。** 添加或编辑 entry 时，也要 inspect 其 *coherence neighborhood*：它的 cluster siblings，以及它 cross-reference 或 reference 它的 terms。在该 neighborhood 内做两件事：修复 glossary violations（implementation specifics：file paths、class names、function signatures、current-config values），并 refresh 由该 learning 自身 evidence 显示已 drift 的 entries。边界：只限 neighborhood，绝不做 full-file audit；只基于手头已有 evidence refresh；如果判断某个 neighbor 需要此 learning 未做的 investigation，将其标记给 `ce-compound-refresh`，不要猜测编辑。测试标准：编辑后，读者是否会发现 touched entry 的 siblings 或 referenced terms 与它不一致？Broader audit 是 `ce-compound-refresh` 的职责。

如果应用 reference criteria 后没有 terms qualified，在 success output 中明确记录该结果（例如 "Vocabulary capture: scanned, no qualifying terms"）。不要静默跳过：可见的 scan-and-no-result record 是 reference 已被 consult 的 audit signal。

**所有 mode 都静默 apply edits：interactive、lightweight 或 headless 中都不提示用户。** Vocabulary capture 是 compounding 的 side effect，不是用户每次 run 要做的 decision。Lightweight mode 通过自己的 single-pass step 触达这里（见 Lightweight Mode），并运行 **update-only** version：它 refine existing `CONCEPTS.md`，但将 creation/seeding 推迟到 Full run。

### Phase 2.5：Selective Refresh Check（选择性刷新检查）

写入 new learning 后，判断这个 new solution 是否构成 older docs 应 refresh 的 evidence。

`ce-compound-refresh` **不是** default follow-up。仅当 new learning 暗示某个 older learning 或 pattern doc 现在可能 inaccurate 时，选择性使用。

当以下一个或多个条件为 true 时，invoke `ce-compound-refresh` 是合理的：

1. Related learning 或 pattern doc 推荐的 approach 已被 new fix 反驳
2. New fix 明确 supersedes older documented solution
3. 当前 work 包含 refactor、migration、rename 或 dependency upgrade，可能使 older docs 中的 references invalid
4. Pattern doc 现在看起来 overly broad、outdated，或不再受 refreshed reality 支持
5. Related Docs Finder 在同一 problem space 中浮现 high-confidence refresh candidates
6. Related Docs Finder 报告与 existing doc 有 **moderate overlap**：可能存在值得 focused review 的 consolidation opportunities

当以下情况出现时，invoke `ce-compound-refresh` **不**合理：

1. 没有找到 related docs
2. Related docs 仍看起来与 new learning 一致
3. Overlap 很 superficial，且不改变 prior guidance
4. Refresh 需要 broad historical review，但 evidence 很弱

使用以下 rules：

- 如果有 **one obvious stale candidate**，在 new learning 写入后用 narrow scope hint invoke `ce-compound-refresh`
- 如果有 **multiple candidates in the same area**，询问用户是否为该 module、category 或 pattern set 运行 targeted refresh
- 如果 context 已经 tight，或你在 lightweight mode，不要自动扩展到 broad refresh；改为推荐将 `ce-compound-refresh` 作为下一步，并提供 scope hint
- **在 headless mode 中**，绝不 invoke `ce-compound-refresh`，也不询问用户。在 terminal report 的 "Refresh recommendation" line 中浮现 recommended scope hint，让 caller 决定

Invoking 或 recommending `ce-compound-refresh` 时，明确要传入的 argument。优先选择最窄的有用 scope：

- 当一个 learning 或 pattern doc 很可能是 stale artifact 时，用 **specific file**
- 当多个 related docs 可能需要 review 时，用 **module or component name**
- 当 drift 集中在一个 solutions area 时，用 **category name**
- 当 stale guidance 位于 `docs/solutions/patterns/` 时，用 **pattern filename or pattern topic**

Examples（示例）:

- `/ce-compound-refresh plugin-versioning-requirements`
- `/ce-compound-refresh payments`
- `/ce-compound-refresh performance-issues`
- `/ce-compound-refresh critical-patterns`

当 change 在一个 domain、category 或 pattern area 内 cross-cutting 时，单个 scope hint 仍可能扩展到多个 related docs。

除非用户明确想要 broad sweep，否则不要无 argument invoke `ce-compound-refresh`。

始终先 capture new learning。Refresh 是 targeted maintenance follow-up，不是 documentation 的 prerequisite。

### Discoverability Check（可发现性检查）

Learning 写入且 refresh decision 做出后，检查 project instruction files 是否会引导 agent 在 documented area 开始 work 前 discover 并 search `docs/solutions/`。这每次都运行：只有 agents 能找到 knowledge store 时，它才会 compound value。

1. 识别哪些 root-level instruction files 存在（AGENTS.md、CLAUDE.md 或二者）。读取 file(s)，判断哪个持有 substantive content：一个 file 可能只是 `@`-includes 另一个的 shim（例如 `CLAUDE.md` 只包含 `@AGENTS.md`，或反之）。Substantive file 是 assessment 和 edit target；忽略 shims。如果二者都不存在，完全跳过此 check。
2. 评估阅读 instruction files 的 agent 是否会学到三件事：
   - 存在一个可搜索的 documented solutions knowledge store
   - 足够理解其 structure 以有效 search（category organization、YAML frontmatter fields 如 `module`、`tags`、`problem_type`）
   - 何时 search 它（在 documented areas 中 implementing features、debugging issues 或 making decisions 前；learnings 可能涵盖 bugs、best practices、workflow patterns 或其他 institutional knowledge）

   这是 semantic assessment，不是 string match。信息可以是 architecture section 中的一行、gotchas section 中的 bullet、分散在多处，或完全不使用精确 path `docs/solutions/`。使用 judgment：如果 agent 读完 file 后会合理 discover 并使用 knowledge store，则 check passes。

3. 如果 spirit 已经满足，无需 action，继续。
4. 如果不满足：
   a. 基于 file 的 existing structure、tone 和 density，识别 mention 自然适合的位置。创建 new section 前，检查信息是否可以作为 closest related section 中的一行：architecture tree、directory listing、documentation section 或 conventions block。向 existing section 添加一行几乎总是优于 new headed section。只有当 file 有明确 sectioned structure 且没有任何 remotely related 内容时，才把 new section 作为 last resort。
   b. Draft 能传达三件事的 smallest addition。匹配 file 的 existing style 和 density。Addition 应描述 knowledge store 本身，而不是 plugin：没有 plugin 的 agent 也应能从中受益。

      Tone 保持 informational，而不是 imperative。将 timing 表达为 description，而不是 instruction：使用 "relevant when implementing or debugging in documented areas"，而不是 "check before implementing or debugging."。像 "always search before implementing" 这样的 imperative directives 会在 workflow 已有 dedicated search step 时造成 redundant reads。目标是 awareness：agents 知道 folder 存在、里面有什么，然后自行判断何时 consult。

      Calibration examples（不是 templates：按 file 调整）：

      When there's an existing directory listing or architecture section（当已有 directory listing 或 architecture section 时）— add a line:
      ```
      docs/solutions/  # documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (module, tags, problem_type)
      ```

      When nothing in the file is a natural fit（当文件中没有自然位置时）— a small headed section is appropriate:
      ```
      ## Documented Solutions

      `docs/solutions/` — documented solutions to past problems (bugs, best practices, workflow patterns), organized by category with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when implementing or debugging in documented areas.
      ```
   c. 在 full interactive mode 中，向用户解释其重要性：在此 repo 中工作的 agents（包括 fresh sessions、other tools，或没有 plugin 的 collaborators）如果 instruction file 没有浮现 `docs/solutions/`，就不会知道要检查它。展示 proposed change 及其位置，然后使用平台 blocking question tool 获取 consent 后再 edit：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中展示 proposal；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。Lightweight mode 中输出 one-liner note 并继续。Headless mode 中不提示，直接 apply edit，并在 terminal report 的 "Instruction-file edit" 下浮现。

5. **如果 repo root 存在 `CONCEPTS.md`，为它运行 parallel discoverability check。** 评估 instruction file 是否会引导 agent discover 项目的 shared domain vocabulary。使用与上方 `docs/solutions/` check 相同的 workflow：相同 target file、相同 edit-placement judgment、相同 per-mode consent-then-edit interaction shape。向 existing section 添加一行几乎总是优于 new headed section。当没有其它位置适合时的 calibration example：

   ```
   CONCEPTS.md  # shared domain vocabulary (entities, named processes, status concepts) — relevant when orienting to the codebase or discussing domain concepts
   ```

   **如果 `CONCEPTS.md` 不存在，完全跳过此 step**：绝不要为项目尚未采用的 artifact nag。跳过时，此 step 不产生 output，也不 edit。

### Phase 3：Optional Enhancement（可选增强）

**继续前等待 Phase 2 完成。**

**在 headless mode 中完全跳过 Phase 3**，以 bound token usage：caller 没有 human-in-the-loop 去处理 reviewer findings；如果 downstream automations 想要这轮 pass，它们可以自行运行 specialized reviewers。

<parallel_tasks>

根据 problem type，可选 invoke specialized agents review documentation：

- **performance_issue（性能问题）** → `ce-performance-oracle`
- **security_issue（安全问题）** → `ce-security-sentinel`
- **database_issue（数据库问题）** → `ce-data-integrity-guardian`
- 任何 code-heavy issue → 始终运行 `ce-code-simplicity-reviewer`，确保 examples minimal 且清晰。Diff 中的 structural concerns 在同一 work 经过 `/ce-code-review`（maintainability persona）时已经覆盖。

</parallel_tasks>

---

### Lightweight Mode（轻量模式）

<critical_requirement>
**Single-pass alternative：相同 documentation，更少 tokens。**

此 mode 完全跳过 parallel subagents。Orchestrator 用 single pass 执行所有 work，产出相同 solution document，但不进行 cross-referencing 或 duplicate detection。

Headless mode 强制 Full，不进入 Lightweight：automations 获得 cross-reference 和 overlap detection benefits，同时没有 interactive overhead。
</critical_requirement>

Orchestrator（main conversation）在一个 sequential pass 中执行以下全部内容：

1. **Extract from conversation**：从 conversation history 识别 problem 和 solution。同时扫描注入 system prompt 的 "user's auto-memory" block（如果存在，仅 Claude Code）：将任何 relevant notes 作为 conversation history 旁的 supplementary context。将任何纳入 final doc 的 memory-sourced content 标记为 "(auto memory [claude])"
2. **Classify**：读取 `references/schema.yaml` 和 `references/yaml-schema.md`，然后判断 track（bug vs knowledge）、category 和 filename
3. **Write minimal doc**：使用 `assets/resolution-template.md` 中适合 track 的 template 创建 `docs/solutions/[category]/[filename].md`，包含：
   - 带 track-appropriate fields 的 YAML frontmatter，并应用 array items 的 YAML-safety quoting rule（YAML-safety quoting rule for array items；见 `references/yaml-schema.md` > YAML Safety Rules）
   - Bug track：Problem、root cause、带 key code snippets 的 solution、一个 prevention tip
   - Knowledge track：Context、带 key examples 的 guidance、一个 applicability note
4. **Vocabulary capture（update-only）**：如果 repo root 存在 `CONCEPTS.md`，读取 `references/concepts-vocabulary.md`，然后扫描 new doc 和 conversation，寻找 qualifying terms，并静默 add/refine entries（criteria 同 Phase 2.4）。Lightweight mode 中 **不要** bootstrap 或 seed：如果 `CONCEPTS.md` 不存在，将 creation 推迟到拥有 seeding 责任的 Full run。在 output 中记录 outcome（例如 "Vocabulary: 1 entry refined" 或 "scanned, no qualifying terms"）。如果你 refined 了 `CONCEPTS.md`，且快速读取 `AGENTS.md`/`CLAUDE.md` 后发现其中没有 surfaced 它，在下方 output 中添加 discoverability tip：lightweight 只给 **tips**，不编辑 instruction files（该 edit 属于 Full run）。
5. **跳过 specialized agent reviews**（Phase 3），以 conserve context

   **Lightweight output（轻量模式输出）：**
```
✓ Documentation complete (lightweight mode)

File created:
- docs/solutions/[category]/[filename].md

[If discoverability check found instruction files don't surface the knowledge store:]
Tip: Your AGENTS.md/CLAUDE.md doesn't surface docs/solutions/ to agents —
a brief mention helps all agents discover these learnings.

[If CONCEPTS.md was refined this run and isn't surfaced in the instruction files:]
Tip: Your AGENTS.md/CLAUDE.md doesn't surface CONCEPTS.md —
a one-line mention helps agents find the shared vocabulary.

Note: This was created in lightweight mode. For richer documentation
(cross-references, detailed prevention strategies, specialized reviews),
re-run /ce-compound in a fresh session.
```

**不启动 subagents。不运行 parallel tasks。Solution doc 是 one deliverable**（Phase 2.4 的 update-only vocabulary capture 也可能 refine existing `CONCEPTS.md`）。

Lightweight mode 中会跳过 overlap check（无 Related Docs Finder subagent）。这意味着 lightweight mode 可能创建与 existing doc overlap 的 doc。这可以接受：`ce-compound-refresh` 会在后续捕获。只有存在 obvious narrow refresh target 时才建议 `ce-compound-refresh`。不要从 lightweight session 扩展到 large refresh sweep。

---

## What It Captures（捕获内容）

- **Problem symptom（问题症状）**：精确 error messages、observable behavior
- **Investigation steps tried（尝试过的调查步骤）**：what didn't work 以及 why
- **Root cause analysis（根因分析）**：technical explanation
- **Working solution（有效 solution）**：带 code examples 的 step-by-step fix
- **Prevention strategies（预防策略）**：未来如何避免
- **Cross-references（交叉引用）**：related issues 和 docs 的 links

## Preconditions（前置条件）

<preconditions enforcement="advisory">
  <check condition="problem_solved">
    Problem has been solved (not in-progress)（问题已解决，不是进行中）
  </check>
  <check condition="solution_verified">
    Solution has been verified working（solution 已验证可用）
  </check>
  <check condition="non_trivial">
    Non-trivial problem (not simple typo or obvious error)（非平凡问题，不是简单 typo 或明显错误）
  </check>
</preconditions>

## What It Creates（产物）

**Organized documentation（组织化 documentation）：**

- File（文件）: `docs/solutions/[category]/[filename].md`

**Categories auto-detected from problem（从 problem 自动检测出的 categories）：**

Bug track（bug 轨道）:
- build-errors/：build 错误
- test-failures/：test 失败
- runtime-errors/：runtime 错误
- performance-issues/：performance 问题
- database-issues/：database 问题
- security-issues/：security 问题
- ui-bugs/：UI bugs
- integration-issues/：integration 问题
- logic-errors/：logic 错误

Knowledge track（knowledge 轨道）:
- architecture-patterns/：architectural 或 structural patterns（agent/skill/pipeline/workflow shape decisions）
- design-patterns/：可复用的 non-architectural design approaches（content generation、interaction patterns、prompt shapes）
- tooling-decisions/：带 durable rationale 的 language、library 或 tool choices
- conventions/：team-agreed way of doing something，被记录下来以便跨人员流动存续
- workflow-issues/：workflow 问题
- developer-experience/：developer experience 问题
- documentation-gaps/：documentation 缺口
- best-practices/：仅 fallback；当没有更窄的 knowledge-track value 适用时使用

## Common Mistakes to Avoid（常见错误）

| ❌ Wrong | ✅ Correct |
|----------|-----------|
| Subagents 写入 `context-analysis.md`、`solution-draft.md` 这类 files | Subagents 返回 text data；orchestrator 写入一个 final file |
| Research 和 assembly 并行运行 | Research completes → then assembly runs |
| Workflow 期间创建多个 files | 写入或更新一个 solution doc：`docs/solutions/[category]/[filename].md`（外加 optional maintenance writes：Phase 2.4 创建/更新 `CONCEPTS.md`，以及为 discoverability 做 small instruction-file edit） |
| Existing doc 已覆盖相同 problem 时仍创建 new doc | 检查 overlap assessment；overlap high 时 update existing doc |

## Success Output（成功输出）

### Headless mode（Headless 模式）

Emit structured terminal report 并结束 turn。没有 "What's next?" question，没有 blocking prompt。以 `Documentation complete` 作为 terminal signal 结束，让 callers 可检测 completion。

```
✓ Documentation complete (headless mode)

File: docs/solutions/<category>/<filename>.md  (created | updated)
Track: <bug | knowledge>
Category: <category>
Overlap: <none | low | moderate — see <path> | high — existing doc updated>
Instruction-file edit: <none needed | applied to <path> | gap noted, not applied>
CONCEPTS.md: <scanned, no qualifying terms | created with N entries (M seeded from the learning's area) | updated — N added, N refined>
Refresh recommendation: <none | scope hint for /ce-compound-refresh>

Documentation complete
```

当没有 doc 被写入时（例如 headless 在 problem 尚未 solved 的 session 中被 invoke），emit structured failure，并以 `Documentation skipped` 结束，让 callers 能区分 success 与 no-op：

```
✗ Documentation skipped (headless mode)

Reason: <一句话解释 — 例如 "conversation history 中未检测到已解决问题" 或 "solution 尚未验证">

Documentation skipped
```

### Interactive Mode（交互模式）

```
✓ Documentation complete

Auto memory: 2 relevant entries used as supplementary evidence

Subagent Results:
  ✓ Context Analyzer: Identified performance_issue in brief_system, category: performance-issues/
  ✓ Solution Extractor: 3 code fixes, prevention strategies
  ✓ Related Docs Finder: 2 related issues
  ✓ Session History: 3 prior sessions on same branch, 2 failed approaches surfaced

Specialized Agent Reviews (Auto-Triggered):
  ✓ ce-performance-oracle: Validated query optimization approach
  ✓ ce-code-simplicity-reviewer: Solution is appropriately minimal

Files written:
- docs/solutions/performance-issues/n-plus-one-brief-generation.md (created)
- CONCEPTS.md (created with 3 entries: BriefSystem, EmailQueue, Brief Status)

This documentation will be searchable for future reference when similar
issues occur in the Email Processing or Brief System modules.

下一步？
1. Continue workflow (recommended)
2. Link related documentation
3. Update other references
4. View documentation
5. Other
```

**显示上方 interactive success output 后，使用平台 blocking question tool 呈现 "What's next?" options：** Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 并设置 `select:AskUserQuestion`）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 没有 blocking tool 或调用报错（例如 Codex edit modes）时，才 fallback 到 chat 中展示 numbered options；不要因为需要 schema load 就 fallback。绝不要静默跳过问题。没有用户选择前，不要继续 workflow 或结束 turn。（仅 interactive mode：headless 按上方 headless block 跳过。）

**Alternate interactive output（因 high overlap 更新 existing doc 时）：** 在 headless mode 中，此情况通过上方 headless terminal report 的 `Overlap: high — existing doc updated` line 表达，而不是单独 output block。

```
✓ Documentation updated (existing doc refreshed with current context)

Overlap detected: docs/solutions/performance-issues/n-plus-one-queries.md
  Matched dimensions: problem statement, root cause, solution, referenced files
  Action: Updated existing doc with fresher code examples and prevention tips

File updated:
- docs/solutions/performance-issues/n-plus-one-queries.md (added last_updated: 2026-03-24)
```

## The Compounding Philosophy（复利理念）

这会创建 compounding knowledge system：

1. 第一次解决 "N+1 query in brief generation" → Research（30 min）
2. 记录 solution → docs/solutions/performance-issues/n-plus-one-briefs.md（5 min）
3. 下次出现类似 issue → Quick lookup（2 min）
4. Knowledge compounds → Team gets smarter（knowledge 复利，团队变得更聪明）

Feedback loop（反馈循环）：

```
Build → Test → Find Issue → Research → Improve → Document → Validate → Deploy
    ↑                                                                      ↓
    └──────────────────────────────────────────────────────────────────────┘
```

**每个 engineering work unit 都应该让后续 work 更容易，而不是更难。**

## Auto-Invoke（自动触发）

<auto_invoke> <trigger_phrases> - "that worked" - "it's fixed" - "working now" - "problem solved" </trigger_phrases>

<manual_override> 使用 /ce-compound [context] 立即记录，无需等待 auto-detection。 </manual_override> </auto_invoke>

## Output（输出）

将 final learning 直接写入 `docs/solutions/`。

## Applicable Specialized Agents（适用的 Specialized Agents）

基于 problem type，这些 agents 可增强 documentation：

### Code Quality & Review（代码质量与 Review）
- **ce-code-simplicity-reviewer**：确保 solution code minimal 且清晰
- **ce-pattern-recognition-specialist**：识别 anti-patterns 或 repeating issues

### Specific Domain Experts（特定领域专家）
- **ce-performance-oracle**：分析 performance_issue category solutions
- **ce-security-sentinel**：review security_issue solutions 中的 vulnerabilities
- **ce-data-integrity-guardian**：review database_issue migrations 和 queries

### Enhancement & Research（增强与研究）
- **ce-best-practices-researcher**：用 industry best practices 丰富 solution
- **ce-framework-docs-researcher**：链接 framework/library documentation references

### When to Invoke（何时调用）
- **Auto-triggered（自动触发）** (optional): Agents can run post-documentation for enhancement
- **Manual trigger（手动触发）**: User can invoke agents after /ce-compound completes for deeper review

## Related Commands（相关命令）

- `/research [topic]` - Deep investigation（深度调查；searches docs/solutions/ for patterns）
- `/ce-plan` - Planning workflow（规划 workflow；references documented solutions）
