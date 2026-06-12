# Plan Handoff（Plan 交接）

本文件包含 plan 写入后的指令：document review、生成后选项和 issue 创建。仅在 plan 文件已经写入，且 confidence check（5.3.1-5.3.7）完成后加载。

## 5.3.8 Document Review（文档审查）

**Format gate（格式门禁）.** 本阶段仅在 `OUTPUT_FORMAT=md` 时运行（在 SKILL.md Phase 0.0 中解析）。`ce-doc-review` 的 mutation 机制是 markdown 专用的：它的 walkthrough 会通过平台 edit tool 将 `gated_auto`/`manual` 修复作为“单文件 markdown 改动”应用，并且 Append-to-Open-Questions flow 会插入 `##`/`###` markdown 标题（见 ce-doc-review skill 中的 walkthrough 和 open-questions-defer references）。如果对 HTML artifact 运行这些 mutator，会产生格式错误的输出。在 ce-doc-review 获得 HTML-aware mutation 前，HTML plans 完全跳过本阶段。

**当 `OUTPUT_FORMAT=html` 时：** 跳过 ce-doc-review 调用。捕获一个合成的 "skipped" envelope，让 5.4 的菜单摘要行能明确说明限制：
- `fixes_applied = 0`
- `proposed_fixes_count = 0`, `decisions_count = 0`, `fyi_count = 0`
- `skipped_reason = "output_format_html"`

然后直接进入 Final Checks（5.3.9）。不要因此阻塞；5.3 的 confidence check 已经强化了 plan。生成后菜单中的自由文本 review 请求，在 HTML 运行中应被拒绝，并提示切换到 `output:md`（见 5.4）；在 ce-doc-review 获得 HTML-aware mutation 前，HTML plans 不提供 review。

**当 `OUTPUT_FORMAT=md` 时：** 对 plan 文件运行带 `mode:headless` 的 `ce-doc-review` skill。将 `mode:headless <plan-path>` 作为 skill arguments 传入。对于 markdown plan，一旦到达本步骤，它就是强制的；不要因为 confidence check 已经运行就跳过。两个工具捕获的是不同类别的问题。

本阶段默认使用 headless，因为多数用户在 planning 后想开始工作，而不是预先裁定每个 reviewer concern。Headless 会静默应用 `safe_auto` 修复，并返回结构化 findings 文本；没有 walkthrough，没有 per-finding routing，也没有 blocking prompts。生成后菜单（见 5.4）将 `Run deeper doc review` 作为一等选项，让用户在需要时选择完整 interactive walkthrough。

confidence check 和 ce-doc-review 是互补的：
- confidence check 强化 rationale、sequencing、risk treatment 和 grounding
- Document-review 检查 coherence、feasibility、scope alignment，并暴露 role-specific issues

捕获 headless envelope，让它驱动生成后菜单上方的上下文摘要：
- auto-applied fixes 数量
- remaining findings 数量，按面向用户的 bucket 拆分（proposed fixes、decisions、FYI observations）
- decisions 和 proposed fixes 的 severity breakdown（尤其是 P0/P1 数量，因为它们值得用户明确关注）

当 ce-doc-review 返回 "Review complete" 后，进入 Final Checks。

**Pipeline mode（Pipeline 模式）:** Pipeline runs（LFG 或任何 `disable-model-invocation` context）会在 Phase 0.0 强制 `OUTPUT_FORMAT=md`，所以 pipeline mode 中上面的 format gate 永远不会选择 HTML skip path。Pipeline runs 总是用 `mode:headless` 和 plan path 调用 `ce-doc-review`；此阶段的 headless mode 与 interactive default 相同。Pipeline mode 不提供进一步 routing；caller 决定如何处理返回的 findings。将控制权交还给 caller 前，先处理所有 P0/P1 findings。

## 5.3.9 Final Checks and Cleanup（最终检查与清理）

进入生成后选项前：
- 确认 plan 在具体方面更强，而不仅仅是更长
- 确认 planning boundary 保持完整
- 当存在 origin document 时，确认 origin decisions 被保留

如果使用了 artifact-backed mode：
- plan 安全更新后，清理临时 scratch directory
- 如果当前平台不适合清理，说明 artifacts 留在何处

**Format-specific composition（特定格式组合）.** 当 `OUTPUT_FORMAT=html`（在 SKILL.md Phase 0.0 中解析）时，plan 会写成单个自包含 `.html` 文件；不存在 markdown sibling。阅读 `references/html-rendering.md` 获取 composition rules：invariants、precedence stack、format principles、agent-consumability rules 和 post-compose audit。下游 consumers（ce-work、人类读者）读取的 artifact 是该 `.html` 文件。`ce-doc-review` 目前不是 HTML consumer；它的 mutation 机制今天仍是 markdown-only，因此 HTML plans 会跳过 5.3.8 doc-review pass，直到这个缺口补上。

当 `OUTPUT_FORMAT=md` 时，按 `references/markdown-rendering.md` 直接写 markdown。不组合 HTML。

本次运行中的所有 mutation 都稳定后（initial write、deepening synthesis、当 `OUTPUT_FORMAT=md` 时的 ce-doc-review `safe_auto` fixes、如有则 HITL Proof resync），单一路径上的 artifact 即反映最终状态。HTML runs 跳过 ce-doc-review autofix step（见 5.3.8 format gate）。

## 5.4 Post-Generation Options（生成后选项）

**Pipeline mode（Pipeline 模式）:** 如果由 LFG 等 automated workflow 或任何 `disable-model-invocation` context 调用，跳过下面的 interactive menu，并立即将控制权交还给 caller。plan 文件已写入，confidence check 已运行，ce-doc-review 也已运行；caller（例如 lfg）决定下一步。

**Path format（路径格式）:** 聊天输出中的文件引用使用 absolute paths；relative paths 在大多数终端中不会自动链接为可点击项。

**菜单上方摘要行（始终）：** 打印一行简洁文本，总结 headless review 状态，例如：`Doc review applied 3 fixes. 2 decisions, 1 proposed fix, 4 FYI observations remain (1 at P1).` 当没有应用修复且没有 findings 剩余时，打印 `Doc review clean — no fixes needed.` 当 envelope 带有 `skipped_reason: output_format_html`（HTML run，依据 Phase 5.3.8 format gate）时，打印 `Doc review skipped — ce-doc-review is markdown-only today; the HTML plan was not reviewed.`，让用户知道 autofix pass 没有在该 artifact 上运行。这一行说明 autofix pass 做了什么（或没做什么），让用户有上下文来选择下面的菜单选项。

**Question（问题）:** "Plan ready at `<absolute path to plan>`. What would you like to do next?"

**Options（选项）:**
1. **Start `/ce-work`** (recommended) - 在当前 session 中开始实现此 plan
2. **Run deeper doc review** - 交互式走查剩余 findings（完整 ce-doc-review walkthrough）
3. **Create Issue** - 从此 plan 在已配置的 issue tracker（GitHub 或 Linear）中创建 tracked issue
4. **Open in Proof (web app) — review and comment to iterate with the agent** - 在 Every 的 Proof editor 中打开文档，通过评论与 agent 迭代，或复制链接分享给他人。**仅当 `OUTPUT_FORMAT=md` 时渲染。**
4. **Open in browser** - 在本地打开 HTML plan 文件用于 review 和分享。**仅当 `OUTPUT_FORMAT=html` 时渲染。**
5. **Done for now** - 暂停；plan 文件已保存，之后可恢复

**Option 4 format-keyed label（Option 4 的格式相关标签）.** 在 exclusive output mode 下，plan 只存在为一个 artifact：`.md` 或 `.html`，绝不同时存在。渲染与已产出格式匹配的 option 4 标签。Proof 作用于 markdown plans（它摄取 `.md` source 并重写 markdown），所以不适用于 HTML runs；browser option 则直接打开本地 `.html` 文件。两种模式下 `/ce-work` 都仍是推荐选项；`ce-work` 可读取任一格式（见 ce-work skill 的 plan-input handling）。

**Menu rendering（菜单渲染）:** 该菜单有 5 个选项，超过 `AskUserQuestion` 的 4-option cap。根据 AGENTS.md 中对合法 option overflow 的窄例外，将此菜单作为聊天中的编号列表渲染，并带上提示 "Pick a number or describe what you want."，而不是删减选项来适配 cap。每个选项都是独立 destination/workflow，删除任何一个都会丢失真实用户选择（deeper review、issue creation、Proof、ce-work 和 pause 在实践中都分别被请求）。在 blocking question tools 没有选项上限的平台上（例如 Codex `request_user_input`、Pi `ask_user`），使用平台 blocking tool 提供全部 5 个选项。当平台 blocking tool 不可用或报错时（例如 Codex edit modes 中未暴露 `request_user_input`，或 `ask_user` 返回 no match），回退到同样的聊天编号列表渲染，并带 "Pick a number or describe what you want." 提示；这与 `AskUserQuestion` overflow path 的 fallback 相同。绝不要静默跳过问题。

**当没有 actionable findings 剩余或 doc review 被跳过时，隐藏 `Run deeper doc review`。** 仅当 headless envelope 报告 `proposed_fixes_count + decisions_count > 0` 时显示 option 2，即至少存在一个 confidence anchor 为 `75` 或 `100` 的 `gated_auto` 或 `manual` finding。其他情况都移除该选项，包括 FYI-only 状态。FYI observations（anchor `50`）不会进入 `ce-doc-review` 的 interactive routing question 或 walkthrough；该流程仅对 actionable findings 开门。因此只有 FYI 可看的 `Run deeper doc review` 选项会成为死路：ce-doc-review 会重新分派 persona team，找到相同 FYIs，跳过 routing question，并落到 terminal question，而没有任何可 walk through 的内容。用户为一次没有参与界面的 dispatch 付出了成本。**当 envelope 带有 `skipped_reason: output_format_html` 时也移除 option 2**；ce-doc-review 的 mutation 机制今天是 markdown-only（见 Phase 5.3.8 format gate），HTML plan 上的 `Run deeper doc review` 选项会进入同一个 markdown-oriented walkthrough，而 format gate 正是为了阻止它。当 option 2 被移除时，菜单变为 4 个选项（上面的 1、3、4、5），在 Claude Code 上回退到 `AskUserQuestion`，并在显示时重新编号为 1-4，让用户看到干净序列。菜单上方摘要行仍在存在 FYI 时说明 FYI count（`Doc review applied 3 fixes. 2 FYI observations remain.`），让用户看到发现了什么，即使没有对应菜单动作；FYIs 可见于菜单旁一起渲染的 headless envelope text。

根据选择进行 routing（裸 per-option routing 也内联写在 SKILL.md 中，避免未加载本 reference 时遗漏；下面的复杂 sub-flows 是本 reference 仍存在的原因）：
- **Start `/ce-work`** -> 通过平台的 skill-invocation primitive（Claude Code 中的 `Skill`、Codex 中的 `Skill`、Gemini/Pi 中的等价物）调用 `ce-work` skill，并将 plan path 作为 skill argument 传入。不要只是告诉用户输入 `/ce-work`；现在就触发调用，让 plan 在本 session 中执行。
- **Run deeper doc review** -> 在 plan path 上重新调用 `ce-doc-review` skill，且**不带** `mode:headless`，让 interactive routing question 和 walkthrough 触发。headless pass 已经应用了 `safe_auto` fixes 并在 session 中记录了 findings，所以 interactive pass 从 headless 停止处继续；其 R29 suppression rule 会防止上一轮 Skipped/Deferred entries 再次 raised。返回后，用刷新后的 counts 重新渲染此菜单，让用户选择下一步。
- **Create Issue** -> 按下面的 Issue Creation section 执行
- **Open in Proof (web app) — review and comment to iterate with the agent** -> 以 HITL-review mode 加载 `ce-proof` skill，参数为：
- source file（源文件）: `docs/plans/<plan_filename>.md`
- doc title（文档标题）: `Plan: <plan title from frontmatter>`
- identity（身份）: `ai:compound-engineering` / `Compound Engineering`
  - recommended next step: `/ce-work`（显示在 ce-proof skill 的最终 terminal output 中）

  遵循 ce-proof skill 中的 HITL review reference。它会上传 plan，提示用户在 Proof web UI 中 review，摄取过滤后的 comment threads，通过当前 Proof edit APIs 应用已同意 edits，在线程内 reply/resolve，并在 proceed 时将最终 markdown 原子同步回 plan 文件。

  注意：Proof flow 仅在 `OUTPUT_FORMAT=md` 时运行（菜单也只在那时渲染该选项）。Proof 摄取 markdown；HTML plans 使用 local browser option。

  当 ce-proof skill 返回：
  - `status: proceeded` 且 `localSynced: true` -> 磁盘上的 plan 现在反映了 review。重新渲染菜单前，对更新后的 plan 重新运行 `ce-doc-review`；HITL 可能实质性重写 plan body，所以之前的 ce-doc-review pass 不再覆盖当前文件，并且 5.3.8 要求在提供任何 handoff option 前完成 review。然后带着刷新的 residual findings 返回生成后选项。
  - `status: proceeded` 且 `localSynced: false` -> reviewed version 位于 Proof 的 `docUrl`，但 local copy 已陈旧。使用 ce-proof skill 的 Pull workflow，询问是否将 Proof doc 拉取到 `localPath`。如果已 pull，重新渲染 options 前，对拉取后的文件重新运行 `ce-doc-review`（同样的 5.3.8 理由：local plan 被 pull 实质性更新）。如果用户拒绝 pull，在菜单上方加入一行说明 `<localPath>` 相比 Proof 已陈旧；否则 `Start /ce-work` 或 `Create Issue` 会静默使用 review 前副本。
  - `status: done_for_now` -> 如果用户离开前在 Proof 中编辑过，磁盘上的 plan 可能已陈旧。询问是否将 Proof doc 拉取到 `localPath`，以保持 local plan file 同步。如果已 pull，重新渲染 options 前，对拉取后的文件重新运行 `ce-doc-review`（同样的 5.3.8 理由）。如果用户拒绝 pull，在菜单上方加入 stale-local note。`done_for_now` 表示用户停止 HITL loop；并不表示他们结束了整个 plan session，仍可能想开始工作或创建 issue。
  - `status: aborted` -> 不做更改，回到 options。

  如果初始 upload 失败（network error、Proof API down），短暂等待后重试一次。如果仍失败，告诉用户 upload 没有成功，并简要说明原因，然后返回 options；不要让用户困惑为什么该选项没有效果。
- **Open in browser** -> 显示 `.html` plan 文件的 absolute path，让用户可本地打开。若平台暴露 browser-opening primitive（例如 macOS 的 `open`、Linux 的 `xdg-open`、Windows 的 `start`），agent 可直接调用；否则打印 absolute path，让用户自行打开。显示路径（或打开浏览器）后，返回生成后选项，让用户选择 follow-up action。
- **Done for now** -> 简短确认 plan 文件已保存，并结束本 turn。没有进一步明确用户提示时，不要启动 follow-up work。
- **Free-form prompts that target the findings**（例如用户没有选编号，而是输入 "review"、"walk through"、"deep review"）-> 按其选择了 `Run deeper doc review` 处理。不要在未触发 deeper review 的情况下循环回菜单。**例外：** 当 envelope 带有 `skipped_reason: output_format_html` 时，不要触发 ce-doc-review；改为回复一次 `ce-doc-review is markdown-only today; the HTML plan can't be reviewed without HTML-aware mutation support. Switch to /ce-plan output:md to regenerate as markdown if you want a review pass.`，然后循环回菜单。
- **Other free-form input** -> 接受对 plan 的修订，并循环回 options。

## Issue Creation（创建 Issue）

当用户选择 "Create Issue" 时，检测他们的 project tracker：

1. 读取 repo root 的 `AGENTS.md`（或为了兼容读取 `CLAUDE.md`），查找 `project_tracker: github` 或 `project_tracker: linear`。
2. 如果 `project_tracker: github`：

   ```bash
   gh issue create --title "<type>: <title>" --body-file <plan_path>
   ```

3. 如果 `project_tracker: linear`：

   ```bash
   linear issue create --title "<title>" --description "$(cat <plan_path>)"
   ```

4. 如果未配置 tracker，用平台 blocking question tool 询问用户使用哪个 tracker：Claude Code 中的 `AskUserQuestion`（如果 schema 未加载，先用 `ToolSearch` 和 `select:AskUserQuestion` 调用）、Codex 中的 `request_user_input`、Gemini 中的 `ask_user`、Pi 中的 `ask_user`（需要 `pi-ask-user` extension）。只有在不存在 blocking tool 或调用报错时（例如 Codex edit modes）才回退到聊天提问；不能因为需要 schema load 就回退。绝不要静默跳过。Options: `GitHub`, `Linear`, `Skip`。然后：
   - 使用上方所选 tracker 的命令继续
   - 提议通过向 `AGENTS.md` 添加 `project_tracker: <value>` 来持久化选择，其中 `<value>` 是小写 tracker key（`github` 或 `linear`），不是 display label，这样未来运行会匹配 step 1 的 detector 并跳过此 prompt
   - 如果选择 `Skip`，不创建 issue，返回 options

5. 如果检测到的 tracker CLI 未安装或未认证，展示清晰错误（例如 "`gh` CLI not found — install it or create the issue manually"），并返回 options。

issue 创建后：
- 显示 issue URL
- 使用平台 blocking question tool 询问是否继续 `/ce-work`
