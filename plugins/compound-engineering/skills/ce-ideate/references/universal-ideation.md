# Universal Ideation Facilitator（通用 Ideation 引导器）

当 ce-ideate 检测到完全没有 software surface 的 elsewhere-mode topic 时加载本文件：naming（独立于 product）、narrative writing、personal decisions、non-digital business strategy、physical-product design。涉及 software artifact（page、app、feature、flow、product）的 topics 会路由到 elsewhere-software，并且不加载本文件，即使 ideas 是关于该 artifact 的 copy、UX 或 visual design。

Phase 1 elsewhere-mode grounding 会在本 reference 接管前运行；user-context synthesis 和 web-research 会 feed 下方 facilitation。对 elsewhere-non-software，默认跳过 learnings-researcher，因为 CWD 的 `docs/solutions/` 几乎总是包含无法迁移到 non-digital topics 的 engineering patterns。本文件替换的是 Phase 2 的 software-flavored frame dispatch 和 post-ideation wrap-up；repo-specific codebase scan 在 elsewhere mode 中永不运行。吸收这些 principles，并使用 Phase 1 grounding summary 作为输入，在 topic 的 native domain 中 facilitate ideation。

让 ideation 有质量的机制会保留：generate many、critique adversarially、present survivors with reasons。改变的只有 work framing。

---

## Your role（你的角色）

做 divergent thinking partner，而不是 delivery service。用户来到这里，是为了获得比自己单独生成更强的 candidate set，而不是单个 recommendation。抵制过早 converge 的冲动。Premature favorite 会 anchor conversation，并挤掉尚未浮现的更好 candidates。

根据 stakes 匹配 tone。对 business 或 product decisions（pricing、positioning、roadmap），先从 constraints 和 tradeoffs 入手。对 creative work（naming、narrative、visual concepts），先带出 energy 和 range。对 personal decisions，先处理 values，再处理 mechanics。

## How to start（如何开始）

根据 scope 匹配 depth：

- **Quick**：用户现在就想要 starter set。生成一轮，简短 critique，展示 3-5 个 survivors，结束。
- **Standard**：light intake（一个或两个问题）、一轮 generation、adversarial critique，展示 5-7 个 survivors。
- **Full**：rich intake、多个 frames parallel、deep critique，展示带 strong rationale 的 5-7 个 survivors。

询问任何问题前先应用 discrimination test。把用户已说明 context 的某一部分换成 contrasting alternative，是否会 materially 改变哪些 ideas survive？如果是，该 context 是 load-bearing；继续。如果不是，问 1-3 个 narrowly chosen questions。遵循 SKILL.md Phase 0.2 的 questioning principles：只问 **subject**（要 ideate 什么）或 **substance**（Phase 1 agents 需要什么才能说出具体内容）；永远不要问 solution direction、constraints、audience、tone 或 success criteria。这些属于 `ce-brainstorm`。基于用户已提供内容继续，而不是从 template 开始。每个回答后，再次应用 test 再决定是否问下一个。遇到 dismissive responses（"idk just go"）就停止，并把真正的 "no constraint" answers 当作真实答案。

**Grounding freshness。** Phase 1 elsewhere-mode grounding（默认 user-context synthesis + web-research；non-software 跳过 learnings，见 SKILL.md Phase 1）已在本 reference 接管前运行，其 outputs feed 下方 generation。如果这里的 intake answers materially refine 了 topic 或 constraints：new scope、different audience、原 grounding 未覆盖的 domain shift，则在生成 ideas 前，基于 refined topic 重新 dispatch 受影响的 Phase 1 agents。该 guardrail 对应 SKILL.md Phase 0.4 的规则：当 intake 改变要行动的 scope 时，mode 和 grounding 需要重新评估；基于 stale grounding ranking 有可能 surfacing 适配错误 topic 的 ideas。

当用户一开始提供 rich context（paste、brief、existing draft）时，用一行确认理解并跳过 intake。

## How to decompose（如何分解）

生成前，将 topic 分解为 3-5 个 orthogonal **axes**，命名*应思考 subject 的哪些方面*。"How to generate" 中的 frames 决定*如何思考*（lens）；axes 决定*思考什么*（surface）。没有 explicit axes，同一 topic 即使通过六种 lenses 解读六次，仍会留下大部分 surface 未被检查；lens diversity 不会自行产生 surface coverage。

此 step 是 facilitator 自己的 analysis：不使用 sub-agent，不做 additional research。Phase 1 grounding 提供 substance。

Axes 应该：

- **数量为 3-5。** 更少表示 atomic，跳过 decomposition。更多会 fragment coverage。
- **Orthogonal。** 单个 idea 应落在一个 axis 上，而不是横跨多个。
- **Derived from grounding**，不是来自 generic template。
- **处于同一 level** 的 granularity。
- **用 topic 自身语言命名**，不要用关于 ideation 的 meta-language。

**Worked examples（illustrative，不是 template）：**

- "Name my new coffee shop" → atomic；skip decomposition（candidate *就是* name）
- "Plot ideas for a short story" → atomic；skip decomposition（candidate *就是* plot）
- "Brand strategy for a launch" → axes 可能是：positioning；visual identity；voice；launch channels；pricing/packaging
- "Career options for the next 5 years" → axes 可能是：domain（industry/role）；structure（employee/founder/freelance）；geography；growth ambition；financial floor

**Skip condition。** 许多 elsewhere-non-software topics 天然就是 atomic：单个 name、tagline 或 one-shot creative output。当无法浮现 3+ orthogonal axes 时，跳过 decomposition，并在 grounding summary 中注明 `Decomposition skipped — atomic subject`。

**Surprise-me skip。** Surprise-me mode 中没有 settled subject；跳过 decomposition，并注明 `Decomposition skipped — surprise-me mode`。

在 generation 开头记录 axes（或 skip-reason）。Generation 会跨 axes 分配 ideas；convergence 会把 axis spread 与其他 rubric criteria 一起加权。

## How to generate（如何生成）

在 critique 任何 idea 前，先生成完整 candidate list。使用与 software ideation 相同的六个 frames，并用 domain-agnostic language 描述。每个 frame 是 **starting bias，不是 constraint**；跨 frames 追踪 promising threads。

- **Pain and friction（痛点与摩擦）**：topic 当前状态中，什么持续 annoying、slow 或 broken？生成移除或减少 friction 的 ideas。
- **Inversion, removal, automation（反转、移除、自动化）**：如果某一步被 inverted、entirely removed 或 automated away，会发生什么？即使 inversion 本身不现实，其结果也常是 candidate。
- **Assumption-breaking and reframing（打破假设与重构框架）**：什么被当作 fixed，但其实是 choice？把 problem 向上一层或侧向 reframe。
- **Leverage and compounding（杠杆与复利）**：哪些 choices 一旦做出，会让许多 future moves 更便宜或更强？寻找 second-order effects。
- **Cross-domain analogy（跨领域类比）**：完全不同领域如何解决 structurally similar problem？Grounding domain 是用户 topic；analogy domain 可以是任何其他地方（other industries、biology、games、infrastructure、history）。越过 obvious analogy，推进到 non-obvious ones。
- **Constraint-flipping（约束翻转）**：把 obvious constraint 反转到 opposite 或 extreme。如果 budget 是 10x 或 0 会怎样？如果只有一个 constraint 而不是十个，或有十个而不是一个，会怎样？即使 flip 本身不现实，也把 resulting design 作为 candidate。

每个 frame 目标 5-8 个 ideas。**当 axes 存在时，跨 axes 分配 ideas**：每个 frame 的 lens 都适用于每个 axis，但 ideas 不应全部 cluster 在一个 axis 上。给每个 idea 标记其 target axis。生成后，merge 和 dedupe；扫描 cross-cutting combinations（最多 3-5 个 additions；surprise-me mode 中可以更多，因为不同 frames 常发现不同 subjects，而 combinations 是 magic layer）。

**Axis-coverage check（当 axes 存在时）。** Merge 后，统计每个 axis 的 ideas。如果任何 axis 有 0 个 ideas，使用最适合该 axis 的 frame 额外生成一小批（3-5 ideas）：usability gaps 用 Pain & friction，distribution 或 compounding gaps 用 Cross-domain analogy，等等。Recovery 上限为 2 个 axes；超过后，与其继续 fan out，不如接受 thin coverage。在 rejection summary 中注明任何未 recovered 的 axis，让 gap 可见。

**Per-idea output contract（对应 SKILL.md Phase 2）：** 每个 idea 都包含 title、summary、**axis**（当 decomposition 产生 axis list 时，选择该 idea 最 centrally targets 的一个；跳过 decomposition 时省略）、**basis**（必需，标记为 `direct:` quoted evidence / `external:` named prior art or domain research / `reasoned:` written-out first-principles argument）、把 basis 与 move significance 连接起来的 why-it-matters，以及 one-line meeting-test self-check（Phase 0.5 检测到 tactical focus signals 时免除）。Basis 是必需项，不是 optional；unjustified speculation 不会 surface。

**Generation rules（生成规则）：**

- 每个 idea 都带 articulated basis。要防止的 failure mode 是缺少用户可验证 basis 的 plausible-sounding speculation。
- 偏向 frame 自然产生的 basis type：pain/inversion/leverage 倾向 `direct:`；analogy 和 constraint-flipping 倾向 `reasoned:`；但不要排除其他 types。当 frame 产生 reasoned basis 时，写出 argument，不要只是 gesture。
- 将 meeting-test 作为 default floor：这个 idea 是否值得等价于 team discussion（或 topic native domain 中对应的 "worth talking through"）？如果不值得，就低于 floor，不会 surface。只有 Phase 0.5 检测到 tactical focus signals 时，floor 才放松。
- 保持在 subject identity 内。当 basis 支持时，expansions、new surfaces、new directions、retirements 都可以。Subject-replacement moves（放弃 subject、pivot 到 unrelated domain）无论 basis 如何都排除。

**本 reference 中的 Surprise-me mode。** 当 Phase 0.2 路由到 surprise-me 时，没有 user-specified subject。通过每个 frame 的 lens 探索 Phase 1 grounding（user-context synthesis + web research），并识别对该 lens 最有趣的 subject(s)。不同 frames 找到不同 subjects 是 feature。Basis 可以包含对 subject 本身的识别：为什么该 subject 值得通过此 lens ideate，并引用 Phase 1 material 中的 signal。

## How to converge（如何收敛）

应用 adversarial critique。对每个 candidate，如果 rejected，写 one-line reason。**Basis-integrity check：** reject 任何缺少 articulated basis 的 idea、任何 stated basis 实际不支持 claimed move 的 idea（speculation dressed as ambition），以及任何替换 subject 而不是作用于 subject 的 idea。使用一致 rubric 为 survivors 打分，权衡：groundedness in stated context、**basis strength**（`direct:` > `external:` > `reasoned:`；都不排除，但其他条件相同 direct-evidence ideas 得分更高）、expected value、novelty、pragmatism、leverage、implementation burden、与更强 candidates 的 overlap，以及 **axis spread**（当 axes 已定义时）。其他条件相同，覆盖 topic surface 的 survivor sets 优于 cluster 在单一 axis 的 sets。Axis spread 是 list-level concern，不是 per-idea reject reason；在 per-idea filtering 后，在 comparable candidates 中选择时应用。

默认目标 5-7 个 survivors。如果 survive 太多，运行第二轮更严格 pass。如果少于五个 survive，如实报告，而不是降低标准。

## When to wrap up（何时收尾）

在任何 persistence 前展示 survivors。每个 survivor 包含：title、description、**axis**（当 decomposition 产生 axis list 时）、**basis**（标记 `direct:` / `external:` / `reasoned:`，并带 quoted evidence、cited source 或 written-out argument）、rationale（basis 如何连接到 move significance）、downsides、confidence、complexity。然后给出简短 rejection summary，让用户看到考虑过并 cut 掉了什么，包括任何在 recovery 后仍为 zero survivors 的 axis，让 coverage gap 可见。

Persistence 是 opt-in。Terminal review loop 是完整 ideation cycle。Refinement 在 conversation 中发生，没有 file 或 network cost。只有当用户明确选择 save、share 或 hand off 时，才触发 persistence。

使用 platform 的 blocking question tool：Claude Code 中为 `AskUserQuestion`（如果 schema 尚未加载，先用 `select:AskUserQuestion` 调用 `ToolSearch`），Codex 中为 `request_user_input`，Gemini 中为 `ask_user`，Pi 中为 `ask_user`（需要 `pi-ask-user` extension）。只有当 harness 中没有 blocking tool 或 call errors（例如 Codex edit modes）时，才 fallback 到 chat 中的 numbered options；不要因为需要 schema load 就 fallback。绝不要 silently skip question。提供四个 choices：

- **Refine the ideation in conversation (or stop here — no save)**：添加 ideas、re-evaluate 或 deepen analysis，不写任何文件。选择后在任意时刻结束 conversation 都是 valid no-save exit。
- **Open and iterate in Proof**：按 `references/post-ideation-workflow.md` 中 §6.2 contract 调用 Proof HITL review path：将 survivors 上传到 Proof（由于 non-software elsewhere mode 不写 local file，先 render 到 temp file），通过 comments iterate，并在成功返回时以 Proof URL 作为 canonical record 干净退出。Proof iteration 通常是此 mode 的 terminal act，因此 flow 之后不强制另一个 menu choice。只有 `aborted` status 会返回此 menu。Persistent Proof failure 时，应用 `references/post-ideation-workflow.md` 的 §6.5 Proof Failure Ladder，确保 iteration attempt 不会没有 recovery。
- **Brainstorm a selected idea**：通过 dialogue 深入一个 idea。不同于 repo mode，这不是 implementation chain 的第一步；之后没有 `ce-plan` -> `ce-work`；universal mode 中的 `ce-brainstorm` 会进一步发展该 idea（例如把 name 扩展成 brand brief、把 plot 扩展成 outline、把 decision 扩展成 weighed framework）并在那里结束。先按 `references/post-ideation-workflow.md` §6.3 contract persist：将 survivors 保存到 Proof（elsewhere-mode default），或当用户明确要求 local file 时保存到 `docs/ideation/`，将 chosen idea 标记为 `Explored`，然后以该 idea 作为 seed 加载 `ce-brainstorm`。Proof 成功返回（`proceeded` 或 `done_for_now`）时，按 §5.2 caller-aware return rule 继续进入 brainstorm handoff；`aborted` 时，不 handoff，返回此 menu。Persistent Proof failure 时，在结束前应用 §6.5 Proof Failure Ladder，确保 brainstorm seed 通过 local-save fallback 得以保留。
- **Save and end**：将 survivors 分享到 Proof（elsewhere-mode default）并结束。只有当用户明确要求 local file 时，才改用 `docs/ideation/`。Proof failure 时（包括单次 orchestrator-side retry 后），应用 `references/post-ideation-workflow.md` 的 §6.5 Proof Failure Ladder：结束前展示 local-save fallback menu（custom path 或 skip），避免用户没有 recovery path。

No-save exit 无需 dedicated menu option 也受支持。选择 Refine 后停止 conversation，或使用 question tool 的 free-text escape 直接说明；persistence 是 opt-in，terminal review loop 已经是完整 ideation cycle。
