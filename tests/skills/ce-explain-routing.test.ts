import { readFileSync } from "fs"
import path from "path"
import { describe, expect, test } from "bun:test"

const SKILL_PATH = path.join(process.cwd(), "skills/ce-explain/SKILL.md")
const SKILL_BODY = readFileSync(SKILL_PATH, "utf8")
const CHECK_IN_PATH = path.join(process.cwd(), "skills/ce-explain/references/check-in.md")
const CHECK_IN_BODY = readFileSync(CHECK_IN_PATH, "utf8")
const DESTINATIONS_PATH = path.join(
  process.cwd(),
  "skills/ce-explain/references/destinations.md",
)
const DESTINATIONS_BODY = readFileSync(DESTINATIONS_PATH, "utf8")
const HTML_REFERENCE_PATH = path.join(
  process.cwd(),
  "skills/ce-explain/references/explainer-html.md",
)
const HTML_REFERENCE_BODY = readFileSync(HTML_REFERENCE_PATH, "utf8")

// Regression guard mirroring tests/skills/ce-plan-handoff-routing.test.ts
// (issue #714 class): SKILL.md content caches at session start while reference
// files load on demand, so the bare per-option action for the Phase 6
// destination ask and the outbound handoffs MUST live inline in SKILL.md —
// not solely in references/destinations.md. Symptom when this regresses: the
// agent renders the destination menu, the user picks an option, and the agent
// stops in prose without firing the action.
describe("ce-explain destination and handoff routing", () => {
  const phaseStart = SKILL_BODY.indexOf("### Phase 6")

  test("SKILL.md contains the Phase 6 destination-ask region", () => {
    expect(
      phaseStart,
      "ce-explain SKILL.md no longer contains the '### Phase 6' heading — the test anchor needs updating, or the destination ask was removed.",
    ).toBeGreaterThan(-1)
  })

  const phaseRegion = phaseStart > -1 ? SKILL_BODY.slice(phaseStart) : ""

  test("inline routing exists for every destination option", () => {
    const optionFragments: { name: string; fragment: string }[] = [
      { name: "Claude Artifact", fragment: "Claude Artifact" },
      { name: "Publish publicly to ht-ml.app", fragment: "公开发布到 ht-ml.app" },
      { name: "Local file", fragment: "Local file" },
      { name: "Publish to Proof", fragment: "Publish to Proof" },
      { name: "Send to Thinkroom", fragment: "Send to Thinkroom" },
      { name: "Leave it", fragment: "Leave it" },
    ]
    for (const { name, fragment } of optionFragments) {
      const escaped = fragment.replace(/[.*+?^${}()|[\]\\`]/g, "\\$&")
      // Bullet form: `- **<fragment>**` then a separator and at least one
      // non-newline character of action text on the SAME line ([ \t]*, not
      // \s*, so an empty-action bullet cannot match by spilling into the next
      // bullet's leading `-`). The separator requires surrounding whitespace
      // (` — ` / ` - `) so a mid-word hyphen in a qualifier like
      // "(auto-generated)" cannot satisfy the action-separator match.
      const inlineRoutingPattern = new RegExp(
        `^- \\*\\*[^\\n]*${escaped}[^\\n]*\\*\\*[^\\n]*[ \\t][—-][ \\t]+[^\\n]+`,
        "m",
      )
      expect(
        inlineRoutingPattern.test(phaseRegion),
        `ce-explain SKILL.md Phase 6 is missing inline routing for destination option "${name}". The bare per-option action MUST live in SKILL.md (not solely in references/destinations.md). See docs/solutions/skill-design/post-menu-routing-belongs-inline.md.`,
      ).toBe(true)
    }
  })

  test("ce-ideate and ce-simplify-code handoffs use the skill-invocation primitive", () => {
    for (const target of ["ce-ideate", "ce-simplify-code"]) {
      const bullet = phaseRegion.match(
        new RegExp(`^- \\*\\*[^\\n]+\\*\\*[^\\n]*\`${target}\`[^\\n]+`, "m"),
      )
      expect(
        bullet,
        `ce-explain SKILL.md Phase 6 is missing the inline handoff bullet naming ${target}.`,
      ).not.toBeNull()
      expect(
        /skill[\s-]?invocation|Skill tool|skill primitive/i.test(bullet![0]),
        `ce-explain SKILL.md ${target} handoff must name the skill-invocation primitive so the agent fires the invocation rather than announcing a handoff in prose.`,
      ).toBe(true)
    }
  })

  test("ce-polish handoff is user-run, never skill-invoked", () => {
    // ce-polish sets disable-model-invocation: true (pinned in
    // EXPECTED_USER_INVOKED_SKILLS in tests/skill-conventions.test.ts), so the
    // model cannot dispatch it via the Skill tool. The routing must present
    // observations in chat and tell the user to run /ce-polish themselves.
    const polishBullet = phaseRegion.match(/^- \*\*[^\n]*polish[^\n]*\*\*[^\n]+/im)
    expect(
      polishBullet,
      "ce-explain SKILL.md Phase 6 is missing the inline UI/UX polish handoff bullet.",
    ).not.toBeNull()
    const line = polishBullet![0]
    expect(
      /tell the user to run\s+`\/ce-polish`|user-invoked only/i.test(line),
      "ce-explain SKILL.md polish handoff must present observations in chat and route to a user-run /ce-polish.",
    ).toBe(true)
    expect(
      /invoke the `ce-polish` skill/i.test(line),
      "ce-explain SKILL.md polish handoff must NOT instruct invoking ce-polish via the skill primitive — it is user-invoked only (disable-model-invocation).",
    ).toBe(false)
  })

  test("predict-then-reveal ordering rule is inline in SKILL.md", () => {
    // R13: the leak-proof ordering is load-bearing and must not live only in
    // references/check-in.md, which an agent might not load before acting.
    expect(
      /结束 turn/i.test(SKILL_BODY) &&
        /prediction turn 结束前/i.test(SKILL_BODY),
      "ce-explain SKILL.md must carry the predict-then-reveal ordering rule inline (show raw change only, take the prediction, end the turn).",
    ).toBe(true)
  })

  test("check-in makes the explainer the recommended first choice", () => {
    const explainerChoice = CHECK_IN_BODY.indexOf("Just the explainer (Recommended)")
    const quizChoice = CHECK_IN_BODY.indexOf("Quiz me")
    expect(explainerChoice).toBeGreaterThan(-1)
    expect(quizChoice).toBeGreaterThan(explainerChoice)
    expect(CHECK_IN_BODY).not.toMatch(/Quiz me \(Recommended\)/i)
    expect(CHECK_IN_BODY).toMatch(/Just the explainer[^\n]+跳过 prediction 和 exercises/i)
    expect(CHECK_IN_BODY).toMatch(/Predict-then-reveal[\s\S]+仅当用户的确切选择为 \*\*Quiz me\*\* 时运行此 section/i)
    expect(CHECK_IN_BODY).toMatch(/Exercises \(concepts, ideas, dense recaps\)[\s\S]+仅当用户的确切选择为 \*\*Quiz me\*\* 时运行此 section/i)
  })

  test("only the exact Quiz me choice enables prediction and exercises", () => {
    const phase3Start = SKILL_BODY.indexOf("### Phase 3")
    const phase4Start = SKILL_BODY.indexOf("### Phase 4")
    const phase5Start = SKILL_BODY.indexOf("### Phase 5")
    const phase6Start = SKILL_BODY.indexOf("### Phase 6")
    const phase3 = SKILL_BODY.slice(phase3Start, phase4Start)
    const phase5 = SKILL_BODY.slice(phase5Start, phase6Start)

    expect(phase3).toMatch(/把用户 Phase 3 的确切选择记录为/i)
    expect(phase3).toMatch(/只有 \*\*Quiz me\*\* 启用 prediction 和 exercise mechanics/i)
    expect(phase3).toMatch(/\*\*Just the explainer\*\* 跳过两者，但仍组成并展示 report/i)
    expect(phase3).toMatch(/Diff mode 且选择 Quiz me/i)
    expect(phase5).toMatch(/仅当记录的 Phase 3 确切选择为 \*\*Quiz me\*\*/i)
    expect(phase5).toMatch(/选择 \*\*Just the explainer\*\* 时跳过本 phase/i)
  })

  test("recap evidence is dispatched directly without a main-agent pre-scan", () => {
    expect(SKILL_BODY).toMatch(/直接分派一个 generic subagent/i)
    expect(SKILL_BODY).toMatch(/不要在主对话中预先扫描、计数或描述 window/i)
  })

  test("Claude Artifact owns its adaptation and ht-ml requires post-warning confirmation", () => {
    expect(DESTINATIONS_BODY).toMatch(/把 canonical `\$RUN_DIR\/explainer\.html` 交给 tool/i)
    expect(DESTINATIONS_BODY).toMatch(/Tool 负责适配其 artifact runtime/i)
    expect(DESTINATIONS_BODY).toMatch(/不要预处理 HTML/i)
    expect(DESTINATIONS_BODY).not.toContain("extract-artifact-fragment.py")
    expect(DESTINATIONS_BODY).toMatch(/页面是公开的，可能被索引、爬取、复制或归档/i)
    expect(DESTINATIONS_BODY).toMatch(/初始请求明确选择了 ht-ml\.app/i)
    expect(DESTINATIONS_BODY).toMatch(/在任何 publish 前取得警告后的明确确认/i)
    expect(DESTINATIONS_BODY).toMatch(/初始请求本身也不算确认/i)
    expect(DESTINATIONS_BODY).toMatch(/如果无法取得确认，不得发布；保留 canonical `\$RUN_DIR\/explainer\.html` 并报告其 local path/i)
    expect(SKILL_BODY).toMatch(/警告前的请求不算确认/i)
    expect(SKILL_BODY).toMatch(/如果无法取得确认，不得发布；保留 canonical HTML，并报告本地 `\$RUN_DIR\/explainer\.html` path/i)
    expect(SKILL_BODY).toMatch(/公开发布到 ht-ml\.app[^\n]+读取并遵循 `references\/destinations\.md` 的 ht-ml\.app sub-flow/i)
    expect(DESTINATIONS_BODY).toMatch(/ht-ml\.app 或通用 HTML-publishing capability/i)
    expect(DESTINATIONS_BODY).toMatch(/skill-invocation primitive/i)
    expect(DESTINATIONS_BODY).toMatch(/直接调用检测到的 tool、connector 或 browser capability/i)
    expect(DESTINATIONS_BODY).toMatch(/不要假设特定 skill name 或 installation path/i)
    expect(DESTINATIONS_BODY).toContain("https://ht-ml.app/llms.txt")
    expect(DESTINATIONS_BODY).not.toContain("scripts/publish-ht-ml.sh")
    expect(DESTINATIONS_BODY).toMatch(/绝不 headlessly 发布/i)
  })

  test("HTML output pins stable metadata and preserves baseline constraints", () => {
    expect(HTML_REFERENCE_BODY).toMatch(/精确 field labels `Date`、`Input shape`、`Subject`/)
    expect(HTML_REFERENCE_BODY).toMatch(/`Input shape` 必须是 `concept`、`diff`、`idea` 或 `recap` 之一/)
    expect(HTML_REFERENCE_BODY).toMatch(/`Subject` 点明 topic、ref 或 recap window/)
    expect(HTML_REFERENCE_BODY).toMatch(/No companion `\.css`, `\.js`, or `\.svg` files/)
    expect(HTML_REFERENCE_BODY).toMatch(/No external requests of any kind/)
    expect(HTML_REFERENCE_BODY).toMatch(
      /No forms, no click handlers, no embedded quizzes, no "submit" affordances, no scripts/,
    )
    expect(HTML_REFERENCE_BODY).toMatch(/Class names and element IDs are ASCII-only/)
  })
})

// Cross-file parity guard (issue #1057): SKILL.md Phase 3 and
// references/check-in.md deliberately BOTH carry the predict-then-reveal
// protocol — the inline copy is load-bearing (AGENTS.md: "Inline the Trigger,
// Not the Content"; the routing test above guards its presence), and the
// reference holds the on-demand detail. Two independently-editable copies of
// a safety-critical protocol can drift silently, so each load-bearing
// invariant must survive in both files. These are structural matches, not
// verbatim prose locks — the two copies already word the protocol slightly
// differently, and future wording improvements are fine as long as every
// invariant stays present in both.
describe("ce-explain predict-then-reveal parity between SKILL.md and references/check-in.md", () => {
  const invariants: { name: string; pattern: RegExp }[] = [
    {
      name: "the prediction question (what the change does, and why it was made)",
      pattern: /(?:what do(?:es)?\s+(?:you think\s+)?this change do(?:es)?\b[\s\S]{0,40}?why (?:was it|it was) made|这项 change 做了什么[，,]\s*为什么要这样改)/i,
    },
    {
      name: "the turn-end rule (end the turn after the prediction prompt)",
      pattern: /(?:end the turn|结束 turn)/i,
    },
    {
      name: "the never-same-message rule (no explanation in the prediction-prompt message)",
      pattern: /(?:same message as the prediction prompt|prediction prompt 的同一条消息)/i,
    },
  ]

  const copies: { label: string; body: string }[] = [
    { label: "SKILL.md", body: SKILL_BODY },
    { label: "references/check-in.md", body: CHECK_IN_BODY },
  ]

  for (const { name, pattern } of invariants) {
    for (const { label, body } of copies) {
      test(`${label} carries ${name}`, () => {
        expect(
          pattern.test(body),
          `ce-explain ${label} no longer carries ${name}. The predict-then-reveal protocol is duplicated across SKILL.md and references/check-in.md by design; if the wording changed, keep the invariant present in BOTH copies (matching ${pattern}) so the copies cannot drift apart silently.`,
        ).toBe(true)
      })
    }
  }
})
