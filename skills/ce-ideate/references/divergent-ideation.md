# Divergent Ideation（Phase 2）

在 Phase 2 开始时读取本文件：Phase 1 grounding 和任何 Phase 1.5 evidence scouts 完成之后，且在构建任何 ideation dispatch prompt 之前。它定义 ideation fleet、dispatch payload、frames、per-idea output contract，以及 post-merge synthesis steps。Model tier names（extraction / generation / ceiling）在 SKILL.md 的 Model Tiers 中定义。

## Fleet

按 Model Tiers fleet dispatch parallel ideation sub-agents。省略 `mode` 参数，让用户配置的 permission settings 生效。默认 fleet 是 **5 个 agents 覆盖全部六个 frames**：

- **3 个 generation-tier agents**，每个对应一个 evidence-driven frame（Pain and friction；Inversion, removal, or automation；Leverage and compounding）。这些 frames 依赖 evidence，dossiers 承担 heavy lifting，因此 mid-tier model 在这里表现足够好。
- **2 个 ceiling-tier agents** 负责 ceiling frames，也就是 strong model 的 reasoning 本身就是产物、不能 tier down 的地方：一个处理 Cross-domain analogy；另一个同时处理 Assumption-breaking and reframing **plus** Constraint-flipping（两者是 cousins，都会 invert givens；一个 agent 同时持有二者作为 starting biases）。

Fleet variants：**surprise-me** 和 **`go deep`** dispatch 6 个 agents，每个 frame 一个，全部 ceiling-tier。**Issue-tracker mode** 只有当 Phase 0.2 检测到 issue-tracker intent 且 issue intelligence agent 返回 usable themes 时，才 dispatch 4 个 agents（见下方 override：cluster-derived frames capped at 4，使用 generation tier；padded frames 保留其 native tier）。Phase 1 的 insufficient-issue-signal fallback 使用默认 5-agent fleet。

每个 frame 目标约 6-8 个 ideas（two-frame agent 对每个 frame 都以此为目标），default path 约产生 36-48 个 raw ideas，issue-tracker mode 的 4 frames 约产生 24-32 个；default path 中 dedupe 后大约 25-30 个 survive，4-frame path 更少。当 volume overrides 适用时调整 per-frame targets（例如 "100 ideas" 提高目标，"top 3" 可能改为降低 survivor count）。

## Dispatch Payload（cache-friendly, long-context ordered）

构建一个 shared grounding block，并让它在本 run 的每个 ideation dispatch 中 byte-identical。相同 prefixes 可让带 prompt caching 的平台复用昂贵部分。Longform shared material 放前面；agent-specific task 放最后：

- `<grounding>` — consolidated grounding summary，包括 evidence gists 和 `<scratch-dir>` 下 dossier files 的 absolute paths（所有 agents 字节完全一致）。指示每个 agent 在生成前读取 dossier files：它们是 bases 会引用的 evidence layer；gists 只是 orientation，不是 evidence。Elsewhere modes 中唯一的 dossiers 是 user-supplied research dossiers（如存在）；否则 grounding summary 本身就是 evidence layer。
- `<constraints>` — 用户 prompt、focus hint，以及任何 *User-named references*：违反这些的 ideas 无论 basis 如何都 out。
- `<background>` — grounding 中的其他一切（codebase context、additional context、learnings、external context、user-supplied research）：informative，不 directive。它可以提供 idea 的 basis，但当用户命名了不同 focus 时，不能把 ideation 拉向 corpus 中最 loud 的内容。
- `<axes>` — Phase 1.5 axis list（如存在）。
- `<task>` — frame assignment、per-frame volume target、ambition charter、verification-read budget 和 per-idea output contract；只生成 raw candidates（critique 之后再做）。

`<constraints>`/`<background>` split 是防止 grounding noise（用户未命名的无关 `FEEDBACK.md`、tangentially-cited prior-art result）违背 user intent 塑造 survivors 的主要防线。用 tags 机械地保持这一区分，而不是 prose hedging。用户提供的 *research* artifacts 即使被用户命名，也属于 background：提供 evidence 不等于下 directive；只有 directive files（按 Phase 1 routing test）进入 `<constraints>`。

**Ambition charter（逐字包含在每个 ideation dispatch 中）：**

> This ideation exists so the user can choose a direction worth building — the output's value is decided by whether one idea changes what they do next. Generate the smartest, most inventive ideas your frame can reach: ideas a strong team would say "we have to do this" about. Your first few ideas will be the obvious ones — treat them as warm-up, and keep only the ones that still earn their place after the non-obvious ideas exist. If an idea would appear in a generic listicle about this topic, sharpen it with grounding evidence or drop it. Anchor every idea in specific entries from the grounding.

**Verification reads（repo mode）。** Agent 做完 internal cut 后，可以花最多 5 次 targeted reads（`go deep` 下 10 次），沿 dossier `file:line` pointers 验证或加深将要提交 ideas 的 bases。`direct:` basis 必须 quote agent 实际读过的一行（在 dossier 或 repo 中），绝不能是 guessed citation。Elsewhere modes 对 user-supplied context 做 verification（包括按需读取 user-research dossiers），而不是读取 repo files。

## Frames

为每个 sub-agent 分配其 frame（或 frame pair），作为 **starting bias，而不是 constraint**。Prompt 每个 agent 从 assigned perspective 开始，但跟随任何 promising thread；跨多个 frames 的 cross-cutting ideas 很有价值。

**Frame selection（mode-symmetric：repo 和 elsewhere modes 使用相同六个 frames）：**

1. **Pain and friction** — user、operator 或 topic-level pain points；持续 slow、broken 或 annoying 的内容。
2. **Inversion, removal, or automation** — invert 某个 painful step、完全 remove it，或 automate it away。
3. **Assumption-breaking and reframing** — 哪些被当作 fixed，其实是 choice；向上一级或侧向 reframe。
4. **Leverage and compounding** — 一旦做出就让许多 future moves 更便宜或更强的 choices；second-order effects。
5. **Cross-domain analogy** — 通过询问 completely different fields 如何解决 structurally analogous problem 来生成 ideas。grounding domain 是用户 topic；analogy domain 可以是任何其他地方（other industries、biology、games、infrastructure、history）。越过 obvious analogy，推进到 non-obvious ones。
6. **Constraint-flipping** — 将 obvious constraint 反转到 opposite 或 extreme。如果 budget 是 10x 或 0 呢？如果 team 是 100 人或 1 人呢？如果没有 users，或有 1M 呢？即使 constraint flip 本身不现实，也使用 resulting design 作为 candidate。

**Issue-tracker mode override（仅 repo mode）。** 当 issue-tracker intent active 且 issue intelligence agent 返回 themes 时：每个 high/medium-confidence theme 成为一个 frame。如果 cluster-derived frames 少于 3 个，则按上方顺序从 6-frame default pool 补齐。总数 cap 为 4：issue-tracker mode 有意保持 tighter dispatch。Theme frames 使用 generation tier（themes 是 evidence-driven）；padded frames 保留其 native tier。

**Axis spread instruction。** 当 axis list 存在时，指示每个 sub-agent 将 ideas 分布到多个 axes：frame 的 lens 适用于每个 axis，但 ideas 不应全部 cluster 在一个 axis 上。每个 idea 都必须标记其 target axis。Frame 是 lens；axis list 是 surface map。一个 plausibly reaches 某 axis 的 frame，应先在那里产出至少一个 idea，再在不同 axis 上 double up。当 decomposition 被跳过（atomic subject 或 surprise-me）时，完全省略 axis instruction：不要在 dispatch time 发明 axes。

**Surprise-me mode addendum。** 当 Phase 0.2 路由到 surprise-me 时，在每个 sub-agent 的 dispatch prompt 中包含此额外指令：

> No user-specified subject. Through your frame's lens, explore the Phase 1 material and identify the subject(s) you find most interesting for this frame. Different frames finding different subjects is the feature — cross-subject divergence is what makes surprise-me valuable. Each idea still carries a basis; the basis may include identification of the subject itself (why *this* subject is worth ideating on through your lens, citing what in the Phase 1 material signals it).

## Per-Idea Output Contract（所有 frames、所有 modes 统一）

每个 sub-agent 对每个 idea 返回此结构：

- **title**
- **summary**（2-4 句）
- **axis** — 当 Phase 1.5 产出 axis list 时必需。选择该 idea 最核心 target 的一个 axis；不要跨越。decomposition 被跳过时完全省略。
- **basis**（required, tagged）— 以下之一：
  - `direct:` quoted line / specific file / named issue / explicit user-supplied context
  - `external:` named prior art, domain research, adjacent pattern, with source
  - `reasoned:` explicit first-principles argument for why this move likely applies — not a gesture；argument 要写出来
- **why_it_matters** — 将 basis 连接到该 move 的 significance
- **meeting_test** — 一行确认这值得 team discussion（当 Phase 0.5 检测到 tactical focus signals 时豁免）

Basis 是 required，不是 optional。如果 sub-agent 无法阐明至少一种 basis，该 idea 不 surface。要防止的 failure mode 是 generic "AI-slop" ideas：听起来 plausible，但缺少用户可验证的 basis。

**Generation rules（所有 frames、所有 modes 统一）：**

- 每个 idea 都携带 articulated basis。Unjustified speculation 不 surface，无论听起来多 plausible。
- 偏向你的 frame 自然产生的 basis type：pain/inversion/leverage 倾向 `direct:`；analogy 和 constraint-flipping 倾向 `reasoned:`；assumption-breaking 混合。但不要排除其他 basis types。
- 将 meeting-test 作为 default floor：这个 idea 是否值得 team discussion？如果不值得，它低于 floor，不 surface。只有 Phase 0.5 检测到 tactical focus signals 时，floor 才放松。
- 保持在 subject identity 内。Product expansions、new surfaces、new markets、retirements 和 architectural pivots 在 basis 支持时都是 fair game。Subject-replacement moves（abandoning the project、pivoting to unrelated domains、becoming a different organization）无论 basis 如何都 out。
- **Honor the asked scope。** 当 focus hint 命名 subject 的某一部分（larger product 中的 flow、stage、section 或 feature，例如 "account settings"、"onboarding flow"、"pricing page copy"、"gameplay rules"）时，在 *该 scope 内* 以 full ambition ideate。将 surface 扩展到整个 subject：当用户命名一个 slice 时，却提出 broader product 的 fundamental changes，即使没有发生 subject-replacement，也是 scope mismatch。Big-picture thinking 仍适用；它只是运行在用户命名的 bounded surface 内，而不是扩大 surface。

## After All Sub-Agents Return

1. Merge and dedupe 成一个 master candidate list。
2. Synthesize cross-cutting combinations：扫描来自不同 frames、组合后更强的 ideas。在 specified mode 中，预计最多 3-5 个 additions。**在 surprise-me mode 中，cross-cutting 是 magic layer**：frames 经常收敛到 overlapping subjects，或发现 complementary angles；预计 5-8 个 additions，并更关注此步骤。将跨多个 frame-chosen subjects 的 combinations 作为 distinctive surprise-me output pattern 呈现。
3. **Axis-coverage check（当 Phase 1.5 产出 axis list 时；否则跳过）。** dedupe 后统计每个 axis 的 ideas。对任何 zero ideas 的 axis，dispatch 一个 recovery sub-agent（任何 unused frame，或 lens 最适合 missing axis 的 frame，例如 usability axes 用 Pain & friction，distribution 或 compounding axes 用 Cross-domain analogy；使用该 frame 的 native tier）专门 target 该 axis。Recovery dispatch 携带相同 per-idea output contract，目标约 3-5 个 ideas。**Recovery 总数 cap 为 2 axes**：如果第一轮后超过 2 个 axes 为空，接受 thin coverage 而不是进一步 fan out。Recovery 返回后，merge 进 master list 并再次 dedupe。在 rejection summary 中将未 recovered 的 empty axes 记录为 "axis: <name> — recovery skipped (cap reached)"，让 gap 对用户可见。
4. 如果提供了 focus，将 merged list 向其加权，但不排除更强的 adjacent ideas。
5. 有理由时，让 ideas 分布到多个 dimensions：workflow/DX、reliability、extensibility、missing capabilities、docs/knowledge compounding、quality/maintenance、leverage on future work。

**Checkpoint A (V17)。** cross-cutting synthesis step 完成且 raw candidate list consolidated 后，立即写入 `<scratch-dir>/raw-candidates.md`（使用 Phase 1 捕获的 absolute path），内容包含带 sub-agent attribution 的完整 candidate list。这会在 Phase 3 critique 可能 compact context 之前，保护最昂贵的 output（parallel ideation dispatches + dedupe）。Best-effort：如果写入失败（disk full、permissions），log warning 并继续；checkpoint 不是 load-bearing。run 结束时不 cleanup（run directory 会保留，让 V15 cache 在同一 session 中跨 run-ids 可复用：见 Phase 5）。

当 merge、synthesis 和 axis-coverage steps 完成后，回到 SKILL.md Phase 2 的 closing instruction，并在任何 critique 开始前加载 `references/post-ideation-workflow.md`。
