# Plugin Instructions（Plugin 运行约定）

这些 instructions 适用于 `plugins/compound-engineering/` 下的工作。
它们补充 repo root 的 `AGENTS.md`。

# Compounding Engineering Plugin Development（Compound Engineering Plugin 开发）

## Runtime vs Authoring Context（Runtime 与 Authoring Context）

**此 plugin 的 `AGENTS.md` 和 `CLAUDE.md` 文件是 authoring context，不会随已安装 plugin 一起分发。** Skills 会被 package 并安装到 end-user environments（用户自己的 repos，或者甚至不是 git repos 的 folders）中；在那里它们会读取 *用户的* `AGENTS.md`/`CLAUDE.md`，不是本 repo 的文件。

后果：

- 约束 skill *runtime* behavior 的 behavioral rules 必须放在 skill 自身内部，即 `SKILL.md` 或其 `references/` 下的 files。放在本文件中的 guidance 在 runtime 不可见。
- 当两个或更多 skills 共享 behavioral principle 时，把 guidance 复制到每个 skill 中（短规则 inline，长规则放 `references/`）。没有 cross-skill shared-file mechanism（见下方 "File References in Skills"）。当 reference file 在多个 skills 中重复存在时（例如 `ce-compound/references/` 和 `ce-compound-refresh/references/` 中都有 `concepts-vocabulary.md`），edits 必须在同一 commit 中应用到每一份 copy。Copies 之间的 drift 会让 agent behavior 根据加载的 skill 不同而不一致。
- 不要建议把 ce-ideate、ce-brainstorm、ce-plan 或任何其他 skill 的 runtime guidance 放到本 AGENTS.md 或 repo-root AGENTS.md 中。这些文件只影响 contributors 如何编辑 plugin。

这个点很容易漏掉，因为 authoring 感觉像 using：你在本 repo 内运行并编辑 plugin，repo 的 AGENTS.md 会被加载，但这种加载不会跟随已安装 skill 进入用户环境。

## Versioning Requirements（版本要求）

**IMPORTANT**：Routine PRs 不应为此 plugin cut releases。

Repo 使用 automated release process 准备 plugin releases，包括 version selection 和 changelog generation。因为多个 PRs 可能在下一次 release 前 merge，contributors 无法从单个 PR 内知道最终 released version。

**如果 `bun run release:validate` 报告 drift，请查看 `docs/solutions/workflow/release-please-version-drift-recovery.md`**，其中包含 file-relationship map、recovery decision tree（forward-sync vs. backward-revert vs. `release-as` pin）和 worked examples。该文档回答下面规则没有覆盖的问题：*为什么这些 files 是 release-managed、它们如何通过 `extra-files` 和 `linked-versions` 同步，以及违反下面规则时该怎么办。*

### Contributor Rules（Contributor 规则）

- 不要在 normal feature PR 中手工 bump `.claude-plugin/plugin.json` version。
- 不要在 normal feature PR 中手工 bump `.cursor-plugin/plugin.json` version。
- 不要在 normal feature PR 中手工 bump `.codex-plugin/plugin.json` version；release-please 会通过 `.github/release-please-config.json` 中的 `extra-files` 管理它，与 Claude 和 Cursor entries 平行。
- 不要在 normal feature PR 中手工 bump `.claude-plugin/marketplace.json` plugin version。
- 除了添加或删除 plugin，不要手工编辑 `.agents/plugins/marketplace.json`。Claude、Cursor 和 Codex marketplaces 之间的 plugin-list、name 和 description drift 会被 `bun run release:validate` 捕捉。
- 不要为 normal feature PR 在 canonical root `CHANGELOG.md` 中 cut release section。
- 如果 actual change 需要，更新 substantive docs，例如 `README.md`、component tables、usage instructions 或 counts，避免它们变得不准确。

### Pre-Commit Checklist（提交前检查清单）

提交任何 changes 前：

- [ ] `.claude-plugin/plugin.json` 中没有 manual release-version bump
- [ ] `.cursor-plugin/plugin.json` 中没有 manual release-version bump
- [ ] `.codex-plugin/plugin.json` 中没有 manual release-version bump
- [ ] `.claude-plugin/marketplace.json` 中没有 manual release-version bump
- [ ] 没有向 root `CHANGELOG.md` 添加 manual release entry
- [ ] `bun run release:validate` 通过（强制 Claude/Cursor/Codex manifest parity）
- [ ] README.md component counts 已验证
- [ ] README.md tables 准确（agents、commands、skills）
- [ ] plugin.json description 与当前 counts 匹配

### Directory Structure（目录结构）

```text
agents/
└── ce-*.md  # All agents live flat under agents/, prefixed with ce-

skills/
├── ce-*/          # Core workflow skills (ce-plan, ce-code-review, etc.)
└── */             # All other skills
```

Agents 在 `README.md` 中按 topic 分组（Review、Document Review、Research、Design、Workflow、Docs）方便阅读；这些分组是概念分组，不是 filesystem subdirectories。

> **Note:** Commands 已在 v2.39.0 迁移为 skills。所有旧的
> `/command-name` slash commands 现在位于 `skills/command-name/SKILL.md`
> 下，并在 Claude Code 中以相同方式工作。其他 targets 可能会以不同方式 convert 或 map 这些 references。

## Debugging Plugin Bugs（调试 Plugin Bugs）

此 plugin 的 developers 也会通过自己的 marketplace install（`~/.claude/plugins/`）使用它。当 developer 报告他们使用某个 skill 或 agent 时遇到 bug，已安装版本可能比 repo 旧。请在 `~/.claude/plugins/` 下 glob component name，并把 installed content 与 repo version diff。

- **Repo already has the fix**：developer 的 install stale。告诉他们 reinstall plugin，或用 `--plugin-dir` 从 repo checkout 加载 skills。不需要 code change。
- **Both versions have the bug**：正常进行 fix。

Important：不能因为 developer 的 installed plugin 可能过期，就排除 old 和 current repo versions 都有 bug 的可能。正确做法仍然是修复 repo version。

## Naming Convention（命名约定）

**所有 skills 和 agents** 都使用 `ce-` prefix，以明确标识它们是 compound-engineering components：

- `/ce-brainstorm` - planning 前探索 requirements 和 approaches
- `/ce-plan` - 创建 implementation plans
- `/ce-code-review` - 运行 comprehensive code reviews
- `/ce-work` - 系统执行 work items
- `/ce-compound` - 记录 solved problems

**为什么用 `ce-`？** Claude Code 内置 `/plan` 和 `/review` commands。`ce-` prefix（compound-engineering 的缩写）让这些 components 属于此 plugin 一目了然。使用 hyphen 而不是 colon，是为了避免 Windows filesystem issues，并让 directory names 与 frontmatter names 对齐。

**Agents** 遵循同一 convention：`ce-adversarial-reviewer`、`ce-learnings-researcher` 等。从 skills 中引用 agents 时，使用裸 `ce-<agent-name>` 形式（例如 `ce-adversarial-reviewer`）；`ce-` prefix 足以跨 plugins 保持唯一。

**每个新 skill 和 agent 都必须使用 `ce-` prefix，没有例外。** 三个 legacy skills（`every-style-editor`、`file-todos`、`lfg`）早于该规则，仍保持无 prefix；它们在 `tests/frontmatter.test.ts` 中被 pin 为唯一允许的例外。不要向该 allowlist 添加条目。添加新 skill 时，directory name、SKILL.md `name:` frontmatter 和任何 README references 都必须以 `ce-` 开头。Frontmatter test 会强制这一点，缺 prefix 会失败。

## Known External Limitations（已知外部限制）

**Proof HITL 会显示一个 ghost "AI collaborator" agent**（记录于 2026-04-16，未来可能变化）：Proof API 会在任何无 header 的 `/state` read 下，用 synthetic `ai:auto-<hash>` identity 自动加入，因此由 `skills/proof/` HITL workflow 创建的 docs 会在 `Compound Engineering` 旁显示一个 phantom participant。唯一的抑制方式是在 create 时设置 `ownerId: "agent:ai:compound-engineering"`，但这会把 document ownership 转给 agent，阻止用户把它 claim 到自己的 Proof library，所以我们不使用它。把它视为 cosmetic noise；不要重新引入 `ownerId` workaround。Upstream tracking: https://github.com/EveryInc/proof/issues/951。

## Skill Design Principles（Skill 设计原则）

Skills 是给 intelligent agent 的 guardrails，不是给非智能执行器的 step-by-step controller。下面原则来自真实世界测试，应指导未来 skill edits。

**按 failure mode 校准 prescription level。** 大致三层：

- **Hard rules** 用于 deterministic safety（例如 "don't silently `cd` to another repo and write outputs there"）。Agent judgment 不应变化；failure mode 足够糟糕，机械遵守是正确的。
- **Strong guidance with examples** 用于有明确 bias 需要教的 judgment calls（例如用 bad-vs-good pairs 说明 "name the decision; don't expand it"）。具体 examples 比抽象原则更能教学，但要 anchoring 在 principle level，以便 agent generalize。
- **Trust** 用于 prescription 会造成伤害的场景：codebase exploration tactics、问多少 clarifying questions、何时依赖 memory、prose phrasing。Over-prescription 会剥夺 agent 的 intelligence 和 memory。

双向匹配 level 和 failure mode。Over-prescribing 会产生 rote output；under-prescribing 会产生 inconsistent behavior 和 drifted artifacts。正确测试是：能否说出该 prescription 防止的具体 bad outcome？如果可以，prescription justified。如果 rule 只是为了 "to be safe" 而没有具体 failure mode，倾向 trust。

**SKILL.md content 在 session start 缓存；references 按需加载。** 含义：

- 对 load-bearing rules（必须可靠触发的 rules），把 strong language 放在 SKILL.md 中相关 phase 顶部，而不只是 reference 中。References 可能被跳过；SKILL.md 总会加载。
- 同一 rule 在 SKILL.md 和 reference 中重复时，两者必须一起更新。Drift 会产生 confusing agent behavior：agent 会遵循它加载到的那份 copy。
- 如果 SKILL.md inline content 描述了 reference 中也有的内容，会让 reference 显得 optional（"I have enough from inline"）。对于应 always load 的 references，减少 inline alternative，或让 inline 内容严格只是 load instruction。

**把 orthogonal decisions 拆成 sequential questions。** 当 blocking question 的 options 横跨多个 decision axes（例如 "where to operate" 加 "which skill to use"）时，用户必须同时思考两个 axes，单个 options 也会变得 underspecified。一次处理一个 decision 的 sequential menus 会产生更清晰的 interaction shapes：用户先解决一个 axis，再看到下一个 follow-up。Location vs. skill routing、scope-tier vs. depth，以及其他 multi-axis questions 都受益于这种拆分。

**Process exhaust 不进入 artifacts。** Engineering process metadata，例如 "captured at Phase X.Y" notes、指向下一个 skill 的 `## Next Steps`、italic provenance lines，不属于 user-facing docs。Doc readers 想要的是 doc，不需要追踪哪个 engineering phase 生成了哪个 section。Skill state 保持在 chat 中（可交互、可行动），durable content 保持在 artifact 中。

**区分 process exhaust 和 audit content。** 为 agent 自己 bookkeeping 而存在的 sections 是 exhaust；因为 downstream readers 需要了解 artifact authorship 才存在的 sections 是 audit content，属于 doc。测试标准是：移除该 section 是否会降低 downstream reader 正确评估 artifact 的能力。

Non-interactive modes 可能产生 audit gaps，但只有当 *对应 interactive mode* 会验证 headless run 跳过的内容时才成立。按 skill 比较，而不是按 mode 比较。如果 interactive ce-plan 会带用户逐条走过每个 requirement，而 headless ce-plan 跳过 walkthrough，那么 headless artifact 包含读者无法判断是否经过 user-confirmed 的 decisions；`## Assumptions` section 就是 audit content。如果 interactive ce-compound 只问 meta-questions（Full vs Lightweight、session-history、"What's next?"），而 substantive inferences（track、category、filename、overlap）在两种 modes 中都是 agent decisions，那么只在 headless 中标注它们会误导读者，暗示 interactive runs 验证了实际没有验证的内容。Reader 需要知道 *本来会* 被 user-validated 的是什么；如果两种 modes 都不验证这些 inferences，该 section 就是伪装成 audit 的 process exhaust。

**通过运行 spec 来测试它，而不只是阅读。** 真实测试会暴露 desk review 漏掉的 failure modes：load reliability、plugin caching across sessions、agent interpretation drift、menu shapes conflation、与用户 repo layout 的 edge-case interactions。测试揭示 unexpected behavior 时，先问三个问题再 tightening spec：

- Agent behavior 真的错了吗，还是它表达了比 rule 编码更好的 judgment？
- SKILL.md 和 references 之间是否 spec drift，导致 agent 看到 inconsistent rules？
- 这是 load-reliability（rule 没被看到）还是 rule-content（rule 被看到但产生错误 output）？

答案不同，fix 也不同。有时 "fix the spec" 意味着放松 over-prescription，而不是添加更多 rules。有时正确答案是 "accept the variance"，因为 agent 对该 case 的 adaptation 是正确的。

## Skill Compliance Checklist（Skill 合规检查清单）

添加或修改 skills 时，验证它符合 skill spec：

### YAML Frontmatter (Required，必需)

- [ ] `name:` 存在并匹配 directory name（lowercase-with-hyphens）
- [ ] `description:` 存在，并描述 **它做什么、什么时候使用**（按 official spec："Explains code with diagrams. Use when exploring how code works."）
- [ ] `description:` 不超过 1024 characters；一些 coding harnesses 会拒绝更长的 skill descriptions。由 `tests/frontmatter.test.ts` 强制。
- [ ] 如果 `description:` value 包含 colons，需要用 single 或 double quotes 包起来；unquoted colons 会破坏 `js-yaml` strict parsing，并让 `install --to opencode/codex` crash。运行 `bun test tests/frontmatter.test.ts` 验证。
- [ ] `description:` value 不包含 raw angle-bracket tokens，例如 `<skill-name>`、`<tag>` 或 `<placeholder>`；Cowork 的 plugin validator 会把 descriptions 当作 HTML parsing，并因 unknown tags 以 generic "Plugin validation failed" banner 拒绝（见 issue #602）。Claude Code 会容忍它们，所以 bug 只在 downstream 暴露。用 backticks 包住 token（`` `<skill-name>` ``），或改写句子。由 `tests/frontmatter.test.ts` 强制。

### Reference File Inclusion (Required if references/ exists，存在 references/ 时必需)

- [ ] 不要使用 `[filename.md](./references/filename.md)` 这样的 markdown links；agents 会把它们解释为 CWD-relative path 的 Read instructions，而 CWD 从来不是 skill directory，所以会失败。
- [ ] **Default: use backtick paths.** 大多数 reference files 应用 backtick paths 引用，让 agent 按需加载：
  ```text
  `references/architecture-patterns.md`
  ```
  这让 skill 保持 lean，避免 load time token footprint 膨胀。适用于：large reference docs、routing-table targets、code scaffolds、executable scripts/templates。
- [ ] **Exception: `@` inline for small structural files**：skill 没有它无法工作、且在约 150 lines 以下的 structural files（schemas、output contracts、subagent dispatch templates）。在单独一行使用 `@` file inclusion：
  ```text
  @./references/schema.json
  ```
  它会相对 SKILL.md resolve，并在 model 看到前替换成内容。如果 file 超过约 150 lines，即使 always needed，也优先使用 backtick path。
- [ ] 对 agent 需要 *execute* 的 files（scripts、shell templates），始终使用 backtick paths；`@` 会把 script inline 为 text content，而不是保留 executable file。

### Conditional and Late-Sequence Extraction（条件内容与后段内容抽取）

Skill content 在 trigger time 加载后，会被带入后续每条 message：每次 tool call、agent dispatch 和 response。这种 carrying cost 会在 session 中 compound。对于 orchestrate 多次 tool 或 agent calls 的 skills，如果 blocks 是 conditional（只在特定 conditions 下执行）或 late-sequence（很多 prior calls 后才需要），且占 skill 的 meaningful share（约 20%+），就提取到 `references/`。Skill 做的 tool/agent calls 越多，就越应积极提取。把 extracted blocks 替换为 1-3 行 stub，说明 condition 并给出 backtick path reference（例如 "Read `references/deepening-workflow.md`"）。不要对 extracted blocks 使用 `@`，因为它会在 load time inline content，抵消 extraction。

### Writing Style（写作风格）

- [ ] 使用 imperative/infinitive form（verb-first instructions）
- [ ] 避免 second person（"you should"），使用 objective language（"To accomplish X, do Y"）

### Rationale Discipline（Rationale 纪律）

`SKILL.md` 中每一行都会在每次 invocation 时加载。只在 rationale 会改变 agent runtime behavior 时保留它；如果没有这句话 behavior 也不会不同，就删掉。

把 rationale 放在覆盖它的 highest-level location；在行为发生处重述 behavioral directives。一个 500-line skill 不应依赖 agent 在第 400 行还记得第 9 行。Portability notes、防止 agent 原本不会犯的 mistakes，以及关于本 repo authoring rules 的 meta-commentary 应放在 commit messages 或 `docs/solutions/`，不要放在 skill body。

### Cross-Platform User Interaction（跨平台用户交互）

- [ ] 当 skill 需要问用户问题时，指示使用 platform 的 blocking question tool，并列出 known equivalents（Claude Code 中 `AskUserQuestion`，Codex 中 `request_user_input`，Gemini 中 `ask_user`，Pi 中通过 `pi-ask-user` extension 使用 `ask_user`）
- [ ] 对 Claude Code，还要指示如果 schema 尚未 loaded，先通过 `ToolSearch` 使用 `select:AskUserQuestion` 加载 `AskUserQuestion`；`AskUserQuestion` 是 deferred tool，不会在 session start 时可用。Pending schema load 不是 fallback 到 text 的有效理由。
- [ ] 包含 fallback：当 harness 中没有 blocking tool 或 call errors（例如 Codex edit modes 中 `request_user_input` 不可用，或 `ToolSearch` 没有 match）时，在 chat 中展示 numbered options 并等待用户回复；绝不要 silently skip question。
- [ ] **Narrow exception for legitimate option overflow:** 当 menu 有 5 个或更多真正 relevant options，且每个都是 distinct destination 或 workflow，删除任何一个都会损失真实用户选择时，用 chat 中的 numbered list，而不是强行裁到 4-option cap。谨慎使用，不要把它当成逃避 blocking tool 的便利出口。默认仍然是 blocking tool。调用 exception 前，验证 (a) 没有 option 可删，(b) 没有两个 options 可合并，(c) 没有 option 更适合作为 contextual prose 展示（例如 menu 旁的 nudge）。如果任一 reduction 可行，优先 reduction 而不是 fallback。Exception 适用时，加一句 free-form input 也被接受的提示（例如 "Pick a number or describe what you want."），让 numbered list 保留 blocking tool 的 open-endedness。

> **Platform-behavior note (April 2026, may change):** 上述 specifics 反映当前 behavior：`AskUserQuestion` 在 Claude Code 中是 deferred，Codex 的 `request_user_input` 只在 Plan mode 暴露。如果 Anthropic 把 `AskUserQuestion` 改为 non-deferred tool，或 Codex 在 edit modes 暴露 `request_user_input`，请重新审视该 guidance，不要无限期携带 workaround。假设这些 constraints 仍然成立前先 verify。

### Interactive Question Tool Design（交互式问题工具设计）

Blocking question menus（`AskUserQuestion` / `request_user_input` / `ask_user`）的设计规则。违反这些规则会在 secondary description text 被隐藏或 labels 被截断的 harnesses 中静默降低 UX。

- [ ] 每个 option label 必须 self-contained；一些 harnesses 只 render label，不 render description，因此 label 本身必须传达 option 做什么。
- [ ] Total options 保持 4 个或更少（`AskUserQuestion` 在目标 platforms 上 cap 为 4）。
- [ ] 不要提供 "still working" / "I'll come back" options；blocking tool 本来就会等待，这类 options 是 no-op wrappers。如果用户需要先去做别的事，直接把 prompt 留着即可。
- [ ] 在 labels 和 stems 中用 third person 指代 agent（"the agent"）；first-person "me" / "I'll" 在 tool-mediated exchange 中很 ambiguous，因为不清楚说话者是 user、agent 还是 tool。
- [ ] 从用户 intent 来写 labels，不要暴露 system internal state；每个 option 应能补全用户视角的 "I want to ___"，避免泄露 `end-sync` 或 `phase-3` 这类 mode names。
- [ ] 用 question stem 作为 first-time mechanics 的 teaching surface；在那里教 mechanic（例如 "Highlight text in Proof to leave a comment"），不要放在可能被隐藏的 option descriptions 中。
- [ ] 重命名 display label 时，在同一 edit 中重命名匹配的 routing block（`**If user selects "X":**`）；model 会按 verbatim label string 匹配 selections，漏改会静默破坏 routing。
- [ ] 当 options 有共同前缀时，把区别性词语前置；"Proceed to planning" 和 "Proceed directly to work" 截断后看起来一样，应把 differentiator 放在前 3-4 个词。
- [ ] 当 artifact ambiguous 时，写清 target；多个 artifacts（Proof doc、local markdown、cached copy）共存时，"save to my local file" 比 "save to my file" 好。
- [ ] 保持 menu voice 一致；同一组中混用 imperative（"Pause"）和 user-voice status（"I'm done — save…"）会显得由不同 agents 编写。

### Cross-Platform Task Tracking（跨平台任务跟踪）

- [ ] 当 skill 需要创建或跟踪 tasks，描述 intent（例如 "create a task list"），并列出 known equivalents（Claude Code 中 `TaskCreate`/`TaskUpdate`/`TaskList`，Codex 中 `update_plan`）。
- [ ] 不要引用 `TodoWrite` 或 `TodoRead`；它们是已被 `TaskCreate`/`TaskUpdate`/`TaskList` 替换的 legacy Claude Code tools。

### Cross-Platform Sub-Agent Dispatch（跨平台 Sub-Agent Dispatch）

- [ ] 当 skill dispatch sub-agents，指示使用 platform 的 subagent primitive，并列出 known equivalents（Claude Code 中 `Agent`/`Task`，Codex 中 `spawn_agent`，Pi 中通过 `pi-subagents` extension 使用 `subagent`）。
- [ ] 优先 bounded parallel execution：尊重 platform active-subagent limits，queue overflow work，并把 limit-related spawn errors 视作 backpressure。对不支持 parallel dispatch 的 platforms，包含 sequential fallback。
- [ ] 优先使用本 plugin 随附的 sub-agents（`ce-*`），而不是 platform built-ins。Built-ins 在每个 target 上名字不同（例如 Claude Code 的 `Explore` 在 Codex 中是 `spawn_agent` 的 `agent_type` `explorer`，在 Pi 中通过 `pi-subagents` 是 `scout`）；使用自己的 agents 可以避免 enumeration tax。例外：当 built-in 有值得保留的明确优势时，在 call site inline 枚举各平台 equivalents，让 model 能在每个 target 正确 route。

### Script Path References in Skills（Skills 中的脚本路径引用）

- [ ] 在 bash code blocks 中，用 relative paths 引用 co-located scripts（例如 `bash scripts/my-script ARG`），不要用 `${CLAUDE_PLUGIN_ROOT}` 或其他 platform-specific variables。
- [ ] 所有 platforms 都会相对 skill directory resolve script paths；不需要 env var prefix。
- [ ] 用 backtick path 引用 script（例如 `` `scripts/my-script` ``），让 agents 能 locate 它；bash code block 已经提供 invocation，不需要 markdown link。

### Cross-Platform Reference Rules（跨平台引用规则）

此 plugin author 一次，然后转换到其他 agent platforms。Commands 和 agents 会在 conversion 期间 transform，但 `plugin.skills` 通常几乎原样复制。

- [ ] 因此，在 command 或 agent content 中使用 slash references 是可接受的，只要它们指向真实 published commands；target-specific conversion 可以 remap。
- [ ] 在 pass-through `SKILL.md` 内，不要假设 slash references 会为另一个 platform remap。按照 skill 被原样复制后仍有意义的方式写 references。
- [ ] 当一个 skill 引用另一个 skill，优先使用 semantic wording，例如 "load the `ce-doc-review` skill"，而不是 slash syntax。
- [ ] 只有在引用真实 published command 或 workflow（例如 `/ce-work` 或 `/ce-compound`）时才使用 slash syntax。

### Tool Selection in Agents and Skills（Agents 和 Skills 中的 Tool 选择）

探索 codebases 的 agents 和 skills 必须优先使用 native tools，而不是 shell commands。

原因：shell-heavy exploration 会在 sub-agent workflows 中造成可避免的 permission prompts；native file-search、content-search 和 file-read tools 可以避免这一点。

- [ ] 不要指示 agents 通过 shell 使用 `find`、`ls`、`cat`、`head`、`tail`、`grep`、`rg`、`wc` 或 `tree` 来做 routine file discovery、content search 或 file reading。
- [ ] 按 capability class 描述 tools，并附 platform hints，例如 "Use the native file-search/glob tool (e.g., Glob in Claude Code)"；不要只写 Claude Code-specific tool names。
- [ ] 当 shell 是唯一选择时（例如 `ast-grep`、`bundle show`、git commands），一次只指示一个 simple command；不要 action chaining（`cmd1 && cmd2`、`cmd1 ; cmd2`），也不要 error suppression（`2>/dev/null`、`|| true`）。两个 narrow exceptions：if/while guards 内的 boolean conditions（`[ -n "$X" ] || [ -n "$Y" ]`）可以，这是正常 conditional logic，不是 action chaining。**Value-producing preparatory commands**（`VAR=$(cmd1) && cmd2 "$VAR"`）也可以，前提是 `cmd2` 严格消费 `cmd1` 的 output，并且拆分会迫使模型在多次 bash calls 间手工传递 value（例如 `BODY_FILE=$(mktemp -u) && cat > "$BODY_FILE" <<EOF ... EOF`）。Simple pipes（例如 `| jq .field`）和 output redirection（例如 `> file`）可以接受，只要不会遮蔽 failures。
- [ ] **Pre-resolution exception:** `!` backtick pre-resolution commands 在 skill load time 运行，而不是 agent runtime。它们可以使用 chaining（`&&`、`||`）、error suppression（`2>/dev/null`）和 fallback sentinels（例如 `|| echo '__NO_CONFIG__'`），以便为 model 产出 clean、parseable value。这是 environment probes（CLI availability、config file reads）的 preferred pattern；否则这些 probes 会需要带 chaining 的 runtime shell calls。Claude Code safety check 会拒绝以下形状，必须在 `!` backticks 中避免：
  - **`case ... esac`** 会被拒绝为 `Contains case_statement`。使用 `&&` chaining、pipe-to-sed，或提取到 script。
  - **`;`（semicolon command separator）** 会被拒绝为 `Unhandled node type: ;`。当 `&&` 或 `||` 能表达相同 intent 时使用它们；如果确实需要 unconditional sequencing，则提取到 script（`;` 与二者都不等价，它不管 exit code 都会运行下一个 command）。
  - **`[A] && B || C`**（同一 lexical depth 混用 `&&` 和 `||`）会被拒绝为 `ambiguous syntax with command separators`（issue #710）。把 `&&` chain 包进 subshell，使 top level 只剩 `||`：`(A && B) || C`；或者 emit raw value，让 agent prose 决定。Safe shape 示例：`` !`cat "$(git rev-parse --show-toplevel 2>/dev/null)/path/to/file" 2>/dev/null || echo '__SENTINEL__'` ``
  - **`$(...)` containing a double-quoted string**（例如 `basename "$(dirname "$common")"`）会被拒绝为 `Unhandled node type: string`（issue #709）。把 logic 提取到 `scripts/` 下的 script；不要用 parameter expansion 替代（见下一条）。
  - **Bash parameter expansion operators**（`${var%pattern}`、`${var##pattern}`、`${var#pattern}`、`${var%%pattern}`、`${var/pat/repl}`、`${var:-default}` 等）会被拒绝为 `Contains expansion`。Simple `${var}` 可以；variable name 后的 operators 不行。这意味着 `${common%/.git}`（strip-suffix）或 `${repo##*/}`（strip-prefix）不能在 `!` pre-resolution 中使用。要 derive directory name 或 strip path component，请提取到 script。

  当 logic non-trivial 时，优先提取到 skill 的 `scripts/` directory 下；safety check 只会看到 `bash <quoted-path>`，从而避开当前和未来 safety-check tightenings。`tests/skill-shell-safety.test.ts` 会强制所有四类 patterns。

  **Permission gate on extracted scripts：从 skill body 调用，不要从 `!` pre-resolution 调用。** Pre-resolution `bash "${CLAUDE_SKILL_DIR}/scripts/<name>.sh"` 形状能通过 safety check，但会在 skill-load time 触发 Claude Code permission check，而该阶段不尊重 `defaultMode: bypassPermissions`。通过 `allowed-tools` frontmatter allow-list 在 *load time* 不可靠：经验上，宽泛的 `Bash(bash *)` patterns 看起来会以 bypass on 加载，但窄的 filename-pinned patterns（例如 `Bash(bash *upstream-version.sh)`）会以 bypass off 失败。把 script invocation 移到 skill body，让它通过 runtime Bash tool 运行。真正可用需要两点：

  1. **使用 `${CLAUDE_SKILL_DIR}` 作为 script path**，不要用裸 relative paths。Runtime Bash tool 从用户 project CWD 运行，不是 skill directory；`bash scripts/<name>.sh` 会经验性地失败为 "No such file or directory"。`${CLAUDE_SKILL_DIR}` env var 在 `claude --plugin-dir` 和 standard marketplace-cached installs 中都能正确 resolve。
  2. **声明 narrow `allowed-tools` patterns**，并 pin 到每个 script filename。Runtime 下文档表明 `allowed-tools` granting 会应用，因此没有 `bypassPermissions` 的用户也能跳过 approval prompt。按 filename pin，而不是使用宽泛 `Bash(bash *)`。

  ```yaml
  allowed-tools: Bash(bash *upstream-version.sh), Bash(bash *currently-loaded-version.sh)
  ```

  ````markdown
  ## Step 1: Probe X

  Run via the Bash tool, in parallel:

  ```bash
  bash "${CLAUDE_SKILL_DIR}/scripts/upstream-version.sh"
  bash "${CLAUDE_SKILL_DIR}/scripts/currently-loaded-version.sh"
  ```
  ````

  只要 `!` pre-resolution 会调用 `bash <path>`，就使用此方式。把 pre-resolution 保留给 first token 已经匹配 common user allow rules 的 commands（`git status`、`gh api`、`cat <path>`、`command -v <name>`）。
- [ ] 当 native tools 能完成 routine exploration 时，不要编码 shell recipes；编码 intent 和 preferred tool classes。
- [ ] 对 shell-only workflows（例如 `gh`、`git`、`bundle show`、project CLIs），explicit command examples 可以接受，只要它们 simple、task-scoped，且没有 chained together。

### Passing Reference Material to Sub-Agents（向 Sub-Agents 传递 Reference Material）

当 skill orchestrates 需要 codebase reference material 的 sub-agents 时，优先传 file paths，而不是 file contents。Sub-agent 只读取它需要的内容。对于小型、静态且会被完整消费的 material（例如 50 行以内的 JSON schema），传 content 可以接受。

### Sub-Agent Permission Mode（sub-agent 权限模式）

Dispatch sub-agents 时，**省略 Agent/Task tool call 上的 `mode` parameter**，除非 skill 明确需要特定 mode（例如 plan-approval workflows 需要 `mode: "plan"`）。传 `mode: "auto"` 或任何其他 value 会覆盖用户配置的 permission settings（例如 user-level config 中的 `bypassPermissions`），这绝不是 routine subagent dispatch 的预期行为。省略 `mode` 可让用户自己的 `defaultMode` setting 生效。

### Reading Config Files from Skills（从 Skills 读取 Config Files）

Plugin config 位于 repo root 的 `.compound-engineering/config.local.yaml`。该文件被 gitignore（machine-local settings），会产生两个 gotchas：

1. **Path resolution:** 永远不要相对 CWD 读取 config；用户可能从 subdirectory 调用 skill。始终从 repo root resolve。在 pre-resolution commands 中，用 `git rev-parse --show-toplevel` 查找 root。

2. **Worktrees:** Gitignored files 是 per-worktree 的。在 main checkout 中创建的 config file 不会存在于 worktrees。用 `--show-toplevel` 找 root：
   ```text
   !`cat "$(git rev-parse --show-toplevel 2>/dev/null)/.compound-engineering/config.local.yaml" 2>/dev/null || echo '__NO_CONFIG__'`
   ```
   在 git repo 外，`git rev-parse` 会 emit empty，`cat "/.compound-engineering/config.local.yaml"` 会失败（permission denied 或 not found，被 `2>/dev/null` suppress），因此 `__NO_CONFIG__` sentinel 会触发。Note：此前 pattern 用 `(top=$(...); [ -n "$top" ] && cat "$top/...")` 和 semicolon 来 guard empty-root case，但 `;` 会被 Claude Code safety checker 拒绝为 `Unhandled node type: ;`（见上方 Pre-resolution exception），因此不得在 `!` pre-resolution 中使用。

   Note：在 worktree 中，`--show-toplevel` 返回 worktree path，所以找不到 main checkout 中的 config。这可以接受；config 是 optional，使用 worktrees 的用户可以在那里添加 config file。此前 pattern 使用 `git-common-dir` 和 `${common%/.git}` derive main repo root 作为 fallback，但 bash parameter expansion operators 会被拒绝为 "Contains expansion"（见上方 Pre-resolution exception），因此没有 script 时该方法不可行。

如果两个 paths 都没有文件，fall through 到 defaults；绝不要因为 missing config fail 或 block。

### Quick Validation Command（快速验证命令）

```bash
# Check for broken markdown link references (should return nothing)
grep -E '\[.*\]\(\./references/|\[.*\]\(\./assets/|\[.*\]\(references/|\[.*\]\(assets/' skills/*/SKILL.md

# Check description format - should describe what + when
grep -E '^description:' skills/*/SKILL.md
```

## Adding Components（添加组件）

- **New skill:** 创建 `skills/<name>/SKILL.md`，包含 required YAML frontmatter（`name`、`description`）。Reference files 放在 `skills/<name>/references/`。把 skill 添加到 `README.md` 的适当 category table，并更新 skill count。
- **New agent:** 创建 `agents/ce-<name>.md`，包含 frontmatter（`ce-` prefix required）。把 agent 添加到 `README.md` 的适当 topical section（Review、Document Review、Research、Design、Workflow、Docs），并更新 agent count。

### Adding a New Plugin to This Repo（向本 Repo 添加新 Plugin）

当在 `compound-engineering` 和 `coding-tutor` 旁添加新 plugin 时，repo 会 ship 到三种 marketplace formats（Claude、Cursor、Codex）。三者必须保持 parity，否则下次运行 `bun run release:validate` 会失败。Checklist：

- [ ] `.claude-plugin/marketplace.json`：把 plugin 添加到 `plugins[]`
- [ ] `.cursor-plugin/marketplace.json`：把 plugin 添加到 `plugins[]`
- [ ] `.agents/plugins/marketplace.json`：把 plugin 添加到 `plugins[]`（Codex schema: nested `source: { source: "local", path: "./plugins/<name>" }`, `policy`, `category`）
- [ ] `plugins/<name>/.claude-plugin/plugin.json`：创建并包含 `name`、`version`、`description`
- [ ] `plugins/<name>/.cursor-plugin/plugin.json`：创建并包含 matching `name`、`version`、`description`
- [ ] `plugins/<name>/.codex-plugin/plugin.json`：创建并包含 matching `name`、`version`、`description`，以及 Codex-specific fields（如果存在 skills，则 `skills: "./skills/"`，再加 `interface{}` block）
- [ ] `.github/release-please-config.json`：添加 `plugins/<name>` package entry，并为三条 plugin.json paths 添加 `extra-files`
- [ ] `.github/.release-please-manifest.json`：为新 package 添加 initial version entry
- [ ] `src/release/metadata.ts`：扩展 `syncReleaseMetadata`，为新 plugin 添加 cross-check target（遵循 `codexPluginTargets` pattern）
- [ ] 运行 `bun run release:validate`，确认它报告新 manifests 且无 drift

Validator 会强制：所有三种 marketplaces 的 plugin-list parity、每个 plugin 三个 plugin.json files 的 name/version/description parity，以及 Codex manifest 声明的任何 `skills:` directory 是否存在。注意只有 `description` drift 会在 `write: true` 时 auto-correct；version drift 是 detect-only，因为 release-please owns the write。

## Beta Skills（beta skills，beta skills）

Beta skills 使用 `-beta` suffix，并设置 `disable-model-invocation: true`，防止 accidental auto-triggering。命名、validation 和 promotion rules 见 `docs/solutions/skill-design/beta-skills-framework.md`。

**Caveat on non-beta use of `disable-model-invocation`:** 该 flag 会阻止所有通过 Skill tool 的 model-initiated invocations，包括从 `/loop` scheduled re-entry。只有用户直接输入 slash command 才能 bypass。若 skill 需要可 scheduled（例如 `resolve-pr-feedback`），不要设置此 flag；依赖 description specificity 和 argument requirements 来防止 accidental auto-fire。

### Stable/Beta Sync（Stable/Beta 同步）

修改有 `-beta` counterpart 的 skill（或反过来）时，务必检查另一个版本，并在 commit 前**明确说明 sync decision**，例如 "Propagated to beta — shared test guidance" 或 "Not propagating — this is the experimental delegate mode beta exists to test." 同步到两者、只同步 stable、只同步 beta 都可以。目标是 deliberate reasoning，而不是默认规则。

## Skill Documentation（Skill 文档）

许多 skills 有 user-facing doc 位于 `docs/skills/<skill>.md`（repo-root `docs/`，不是 `plugins/` 下），用于解释 skill 的 high-level purpose、novel mechanics 和 chain position；它与 runtime SKILL.md 分离。`docs/skills/README.md` index 会按 category 列出所有 documented skills。

修改这类 skill 时，commit 前**明确说明 skill-doc sync decision**，例如 "doc updated — added new framing for surprise-me mode" 或 "doc not updated — change is internal to Phase 2, doesn't surface at doc level." **大多数 changes 不需要 update**：internal phase refactors、prompt-tuning 和 mechanic-level bug fixes 通常不会暴露到 doc 抽象层级。

以下情况更新 skill doc：

- Skill 的 high-level purpose 或 framing 发生变化
- Highlighted novel mechanic 发生实质变化或被移除
- 出现应属于 "What Makes It Novel" 的新 mechanic
- Doc 的 quick example、FAQ 或 use cases 会误导读者

只编辑变得不准确的部分；不要为了匹配 SKILL.md 而整篇重写。没有 doc 的 skills 不需要 check；为其创建 doc 是 deliberate decision，不是 reflexive decision。为此前没有 doc 的 skill 添加 doc 时，也要从 `plugins/compound-engineering/README.md` 中该 skill row 链接过去，并把它加入 `docs/skills/README.md` 中适当 category。

## Documented Solutions（已记录的 Solutions）

`docs/solutions/` 保存过去问题的 documented solutions：bugs、architecture patterns、design patterns、tooling decisions、conventions、workflow practices 和其他 institutional knowledge。Entries 使用 YAML frontmatter，字段包括 `module`、`tags` 和 `problem_type`。Knowledge-track `problem_type` values 包括 `architecture_pattern`、`design_pattern`、`tooling_decision`、`convention`、`workflow_issue`、`developer_experience`、`documentation_gap` 和 `best_practice`（fallback）。Bug-track values 覆盖 `build_error`、`test_failure`、`runtime_error`、`performance_issue`、`database_issue`、`security_issue`、`ui_bug`、`integration_issue` 和 `logic_error`。设计新 solutions 前先搜索该目录，让 institutional memory across changes compound。

## Documentation（文档）

详细 versioning workflow 见 `docs/solutions/plugin-versioning-requirements.md`。
