---
date: 2026-04-05
topic: universal-planning
---

# Universal Planning：ce:plan 和 ce:brainstorm 的非软件任务支持

## 问题框架

用户自然会用 `/ce:plan` 来规划任何 multi-step task——trip itineraries、study plans、content strategies、research workflows。目前 model 会 self-gate 并拒绝 non-software tasks，因为 ce:plan 的语言高度 software-centric（“implementation units”、“test scenarios”、“repo patterns”）。这迫使用户回到 unstructured prompting 处理 non-software work，失去让 ce:plan 有价值的 structured thinking。

ce:plan 背后的 structured thinking——拆解 ambiguity、researching context、sequencing steps、identifying dependencies——本质上 domain-agnostic。skill 的 value proposition 不应局限于 software。

**为什么用 conditional path，而不是只 softening language：** softening SKILL.md 中的 self-gating language 更便宜，也可能停止 refusal。但 ce:plan 对 non-software tasks 的价值来自 structured workflow——ambiguity assessment、research orchestration、quality-guided output 和 durable plan file。如果没有 non-software path，model 会尝试在 non-software task 上执行 software-specific phases（repo research、implementation units、test scenarios），结果比 direct prompt 更差。conditional path 让 non-software tasks 受益于 structured thinking，而不必和 software-specific structure 对抗。

See: [GitHub issue #517](https://github.com/EveryInc/compound-engineering-plugin/issues/517)

## 需求

**Skill Description 和 Trigger Language（skill 描述与触发语言）**

- R1. 更新 ce:plan 的 YAML `description` 和 trigger phrases，包含 non-software planning。model 在决定调用哪个 skill 时会读取 description——如果 triggers 只提到 software concepts，internal detection logic 永远不会触发。示例：*"Create structured plans for any multi-step task — software features, research workflows, events, study plans, or any goal that benefits from structured breakdown."*

**Detection and Routing（检测与路由）**

- R2. ce:plan 在 Phase 0 早期检测 task 是否 software-related，先于搜索 requirements docs 或启动 software-specific research agents
- R3. Detection error policy：false positives（software task routed to non-software path）比 false negatives（non-software task staying on software path）更糟，因为 false positive 会跳过 repo research 并产出 disconnected plan。detection ambiguous 时询问用户，而不是猜测。不确定时默认 software path。
- R4. ce:brainstorm：验证它是否真的会对 non-software tasks self-gate。如果不会（它的 description 已经 domain-agnostic），无需修改——其 existing Phase 4 handoff to ce:plan 已经可用。如果会 self-gate，soften gating language，让它停止拒绝。ce:plan 拥有 non-software planning path；ce:brainstorm 只需不阻塞 flow。

**ce:plan 中的 Non-Software Planning Path（Core — Phase 1）**

- R5. 检测到 non-software task 时，ce:plan 跳过 Phases 0.2-0.5 和 Phase 1（全部 software-specific），并加载 reference file（`references/universal-planning.md`），其中包含 alternative workflow。现有 Phase 5.2（Write Plan File）和 Phase 5.4（Handoff options）可复用；Phase 5.3（Confidence Check with software-specific agents）不可复用。
- R6. non-software path 评估 ambiguity：request 是否足够清晰可以直接 planning，还是需要先 clarification？
- R7. 需要 clarification 时，non-software path inline 运行 focused Q&A——最多 3 个 questions 作为 guideline，不是 hard cap——瞄准最有影响力的 clarifying questions。当剩余 ambiguity 可以 defer 到 plan execution 时停止。
- R8. plan output 由 quality principles（什么构成 great plan）引导，而不是 prescribed template。model 根据 task domain 决定 format。

**Non-Software Planning Path（Extensions — Phase 2，core validation 之后）**

- R9. 当 task 受益于 external context 时，non-software path 可以直接调用 web search（不新增 MCP integrations 或 research subsystems）。main skill inline collate findings。
- R10. 当 task 涉及 local files 时（例如 “read these materials and create a study plan”），non-software path 仍可与 local files 交互。

**Token Cost Management（token 成本管理）**

- R11. non-software path 完全放在通过 backtick paths 条件加载的 reference files 中。Main SKILL.md changes 保持最小——只有 detection stub
- R12. software planning path 完全不变——software-only users 的 token cost 增加可忽略（只有 detection stub）

## 成功标准

- `/ce:plan a 3 day trip to Disney World with 2 kids ages 11 and 13` 产出 thoughtful、structured plan，而不是拒绝
- `/ce:plan look at the materials in this folder and create a study plan` 读取 local files 并产出 study plan
- `/ce:brainstorm plan my team offsite` 产出 structured plan（需验证——可能已无需修改即可工作）
- `/ce:plan plan the database migration to support multi-tenancy` route 到 software path（boundary case——尽管有 “plan” 和 “migration”，仍是 software）
- `/ce:plan plan our team's migration to the new office` route 到 non-software path（boundary case——尽管有 “migration”，仍是 non-software）
- Software tasks 继续完全相同工作——无 regression
- Non-software detection 给 software path 增加的 tokens 可忽略

## 范围边界

- 不构建 domain-specific planning templates（travel、education 等）——model 根据 domain 适配 format
- 完全不改变 ce:plan 的 software planning path
- 不为 ce:work 或其他 downstream skills 添加 non-software support——它们仍保持 software-focused
- 不添加 MCP integrations 或 domain-specific research tools——使用 existing web research capabilities
- Pipeline mode（LFG/SLFG）：不支持 non-software tasks。Detection 应 graceful short-circuit pipeline，而不是产出 ce:work 无法执行的 plan。short-circuit contract（ce:plan 返回什么，LFG 的 retry gate 如何处理）defer 到 planning。

## 关键决策

- **ce:plan owns universal planning, not ce:brainstorm**：durable output 是 plan file。Brainstorming Q&A 是 means to an end，不是 separate non-software workflow。ce:plan 在需要时自行做 focused Q&A。
- **No prescribed template for non-software outputs**：不可能预见所有 domains。Quality principles 引导 model；format 自然生成。
- **Reference file extraction**：non-software path 放在 `references/universal-planning.md` 中，降低 token cost，避免为 software users 膨胀 main skill。
- **Default to software when uncertain**：False positives（software → non-software）比 false negatives（non-software → software）代价更高。ambiguous 时询问用户。
- **Non-software plan file location is user-chosen.** 写入前，向用户提供 options：(a) `docs/plans/` 如果存在，(b) current working directory，(c) `/tmp`，或 (d) 用户指定 path。frontmatter 省略 software-specific fields（`type: feat|fix|refactor`）。Filename convention（`YYYY-MM-DD-<descriptive-name>-plan.md`）不受 location 影响。
- **Incremental delivery**：先交付 core path（R5-R8）——detection、ambiguity assessment、quality-guided output。Extensions（R9-R10）——research orchestration、local file interaction——在 core validation 后添加。

## 未决问题

### 延后到 Planning 阶段

- [Affects R2][Technical] detection 应使用什么 heuristics？可能组合：request 是否在 software context 中引用 code/repos/files、specific programming languages、software concepts？需要处理 “plan a migration” 这类 ambiguous cases（可能是 data migration，也可能是 office migration）。Error policy（R3）约束设计：default to software，uncertain 时 ask。
- [Affects R8][Technical] 哪些 output quality principles 能产出最好的 non-software plans？planning 期间直接定义这些原则——例如 specificity、sequencing、resource identification、contingency planning——而不是单独跑 research effort。
- [Affects R9][Technical] 哪些 research mechanisms 最适合 non-software tasks？直接用 WebSearch/WebFetch，还是改造 best-practices-researcher 处理 non-software topics？等 core path validated 后再决定。
- [Affects R4][Technical] ce:brainstorm 是否真的会对 non-software tasks self-gate？构建 detection 前先验证。它的 description 看起来 domain-agnostic——可能无需修改。注意：即使它不 self-gate，其 Phase 1.1 repo scan 在 non-software task 上也会浪费 tokens。决定这是可接受，还是需要 skip。
- [Affects R5][Technical] Non-software plan file location：向用户提供 options（docs/plans/ if it exists、CWD、/tmp 或 custom path）。只有当 directory 存在时才展示 docs/plans/ option。
- [Affects pipeline][Technical] LFG/SLFG short-circuit contract：ce:plan 是写 stub file、返回 error，还是不产出 file？LFG 有 hard gate，如果没有 plan file 会 retry——contract 必须满足或绕过该 gate。

## 下一步

-> `/ce:plan` 进入 structured implementation planning（结构化实现计划）
