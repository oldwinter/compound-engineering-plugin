# Extensive analysis path（扩展分析路径）

当输入是较长 recording（超过约 60 秒）、包含多个 issues、requirements 或 workflow walkthroughs，或用户明确想要 requirements material 时，使用此路径。目标是生成完整的 Compound Engineering-compatible artifact set，供 `ce-brainstorm` 使用。

## Workflow（工作流）

1. 运行 analyzer：

   ```bash
   python scripts/analyze_riffrec_zip.py /path/to/input
   ```

   当 artifact 应存放在特定位置时，使用 `--output-dir <dir>`。在有 `docs/brainstorms/` 的 repo 中，默认 output 位于 `docs/brainstorms/riffrec-feedback/` 下。

2. 读取生成的 `analysis.md`、`problem-analysis.md`、`review-prompt.md` 和 `requirements-kickoff.md`。

3. Brainstorm 前读取 `source-materials.md`。它是 original raw feedback location、transcript、local-only frames、chunks、analysis artifacts 和 screenshot paths 的 source-of-truth manifest。用它让 brainstorm 和 planning 可 trace 回 original feedback evidence。

4. 使用 platform image-view tool 检查 extracted screenshots 中的 high-signal moments。优先查看因 verbal complaints 附近 click events、failed network requests、console errors 或 repeated interaction 而被选中的 screenshots。

5. 使用 `review-prompt.md` 中的 frame review structure 填写或 refine `problem-analysis.md`。最终 problem analysis 必须精确包含这些 top-level categories：

   - **Visual/UI Problems（视觉/UI 问题）**
   - **Functional Problems（功能问题）**
   - **Requirements（需求）**
   - **Usability/UX Problems（可用性/UX 问题）**

   每个 numbered item 应描述 problem、location、UI element、frame reference，以及可用时的 relevant transcript context。聚焦 WHAT is wrong，而不是 HOW to fix it。

6. 将 evidence 转换为 requirements。保持这些 categories 彼此区分：

   - **Observed facts（观察事实）:** transcript quotes、click targets、request statuses、screenshot contents。
   - **Inferences（推断）:** likely user intent、likely broken control、suspected missing state。
   - **Requirements:** 解决 problem 所需的 product behavior。

7. 当当前 workspace 包含 product source code 时，在 brainstorm 前或期间运行 source-mapping pass。使用 transcript language、visible UI labels、screenshot paths、route names 和 generated requirements，在 codebase 中搜索 likely components、controllers、services、models、tests 和 state stores。对更大的 sessions，按 product area 拆分 mapping，并在可用时使用 sub-agents，让 independent areas 能 parallel inspect。

8. 将 source mapping 作为 suspected implementation surfaces 添加到 brainstorm material；除非 code 清楚证明，否则不要当成 proven root cause。包含 confidence levels 和 short evidence notes，说明每个 file 或 component 为什么 relevant。

9. 始终继续进入 brainstorm。一旦 `analysis.md`、`problem-analysis.md`、`source-materials.md` 和 `requirements-kickoff.md` 存在，说 "Analysis complete. Ready to brainstorm the findings." 然后立即用生成的 `requirements-kickoff.md` 加载 `ce-brainstorm` skill，除非用户明确只要求 extract 或 analyze artifacts。

10. 在 brainstorm 中，先请用户确认 captured requirements："Did this capture the requirements correctly, and what is missing, wrong, or grouped badly?" 在 brainstorm 已确认或修正 requirements 前，不要进入 planning。

## Automatic handoff（自动交接）

正常使用中，不要在 extraction 后结束 workflow。Intended sequence 是：

1. Run the analyzer（运行 analyzer）。
2. 读取 `source-materials.md`，让 brainstorm 直接链接到 raw feedback、transcript、frames 和 analysis artifacts。
3. 当 evidence 需要 human-visible interpretation 时，检查或 refine `problem-analysis.md`。
4. 用 `requirements-kickoff.md` 加载 `ce-brainstorm` skill。
5. 请用户 confirm、correct 或 regroup captured requirements。
6. 让 `ce-brainstorm` 在 `docs/brainstorms/` 下生成 durable requirements doc。

只有当用户明确要求 raw artifacts、transcript、screenshots 或不进入 brainstorming 的 analysis 时，才在 step 1 或 2 后停止。

## Capture scale（捕获范围）

宁可 over-capture，不要 under-capture。此路径的目的，是把 product feedback 保存为供后续 AI work 使用的 structured data，而不是在 extraction 阶段决定什么值得 implementation。

分析 feedback source 时：

- 捕获 transcript 或 frames 中出现的每个 distinct problem、bug、request、expectation、confusion point 和 "note to self"。
- 可能时为每个 issue 包含来自 source material 的 concrete examples：timestamp、transcript phrase、screenshot path、clicked UI element、email/thread ID 或 observed state。
- 可能时包含 concrete source-code mapping：likely component/service/controller/model/test files、route 或 API endpoint names、relevant state variables 和 confidence level。该 mapping 应让后续 implementation agent 明显知道从哪里开始看。
- 如果只有 video 可用，从 visible UI labels、layout、URLs、route names、copied text、screenshots 和 transcript references 推断 likely screens 和 components。明确标记 uncertain mappings，而不是省略。
- 如果只有 audio 或 notes 可用，且 repo 存在，则从 product terminology 和 workflow descriptions 映射到 likely code areas，并将 mapping 标为 transcript-derived。
- Analysis 期间不要丢弃 lower-priority items。需要时将它们标为 lower priority 或 secondary，但保留 representation。
- 将 capture 与 prioritization 分开。Brainstorm 后续可能 regroup、split、defer 或 reject items，但 first requirements pass 应保留 full signal。
- 如果 feedback session 包含许多 issues，创建 comprehensive capture document，并说明 planning 应将其拆分成更小 plans。
- 将 source mapping 视为 supporting material，而不是 filter。如果 problem 尚无法映射到 code，保留 problem，并将 source mapping 标为 unknown。

## Source mapping grounding（source mapping 证据锚定）

将 feedback 映射到 source code 时，将每个 mapping 分类为：

- **Likely buggy surface:** code path 存在，并直接处理 observed behavior。
- **Missing or incomplete surface:** feedback 命名了某个 behavior，但 repo 中尚无清晰 UI、route、controller action 或 component 实现它。
- **Indirect surface:** code 与 behavior 相邻，但确切 interaction 可能通过 rendered email content、third-party UI、generated HTML 或其他 layer 发生。
- **Unknown:** 尚未找到 grounded source mapping。

每个 source mapping 应包含：

- Requirement/example ids，例如 `R14`、`AE4` 或 `EX17`。
- 可行时包含带 line numbers 的 file paths。
- 来自 code 的 short evidence note，而不只是 file guess。
- Confidence：`High`、`Medium`、`Low` 或 `Unknown`。

优先说 "I did not find a current inbox implementation for this surface"，而不是强行给 speculative mapping。Missing surfaces 是有用的 product findings，应留在 brainstorm 中。

## Output shape（输出形状）

Analyzer 会写入：

- `analysis.md`: session summary、transcript、selected moments、screenshot links、candidate findings 和 review checklist。
- `problem-analysis.md`: visual、functional、requirement 和 UX findings 的 categorized problem statement scaffold。
- `review-prompt.md`: 为 deeper visual analysis pass 准备的 filled prompt，包含 screenshot paths 和 transcript。
- `source-materials.md`: manifest，链接 original source location、local-only raw files、transcript locations、chunks、local-only frames 和 generated artifacts。
- `requirements-kickoff.md`: CE-friendly requirements starter，包含 Problem Frame、Actors、Key Flows、R-IDs、Acceptance Examples、Success Criteria、Scope Boundaries、Questions 和 Next Steps。
- `analysis.json`: structured session、event、transcript、moment 和 artifact metadata。
- `frames/`: 为 selected moments 提取的 PNG screenshots。默认 local-only。
- `raw/`: extracted zip contents 和 copied source media。默认 local-only。

当单个 transcription request 过大时，long media 会按 chunks transcription。Chunk transcripts 包含 timestamp prefixes，让 review pass 仍能将 discussion points 连接到 approximate video regions。

对 audio-only 或 notes-only sources，visual sections 会刻意说明没有 frames 可用。在这些情况下，只从 transcript 或 notes 中提取 functional problems、requirements 和 UX friction。

## Review heuristics（Review 启发式）

当 moments 包含以下内容时选择：

- Verbal complaint cues（口头抱怨线索）："weird"、"doesn't work"、"can't"、"broken"、"bug"、"problem"、"confusing"、"should"。
- Complaint 前后不久对 controls 的 clicks。
- 对同一 control 的 repeated clicks。
- Known development noise 之外的 failed requests。
- Console errors、uncaught exceptions 或 failed form submissions。
- Visible toasts、validation errors、disabled controls、empty states 或 surprising navigation。

Script findings 是刻意 conservative 的。将 candidate finding 转为 requirement 前，要一起查看 screenshots 和 transcript。
