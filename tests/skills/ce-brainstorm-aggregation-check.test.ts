import { describe, expect, test } from "bun:test"
import { readFile } from "node:fs/promises"
import path from "node:path"

const skillPath = path.join(process.cwd(), "skills/ce-brainstorm/SKILL.md")
const sectionsPath = path.join(
  process.cwd(),
  "skills/ce-brainstorm/references/brainstorm-sections.md",
)
const markdownRenderingPath = path.join(
  process.cwd(),
  "skills/ce-brainstorm/references/markdown-rendering.md",
)
const htmlRenderingPath = path.join(
  process.cwd(),
  "skills/ce-brainstorm/references/html-rendering.md",
)

describe("ce-brainstorm integration scope check", () => {
  test("treats named sources as coverage before splitting implementation work", async () => {
    const skill = await readFile(skillPath, "utf8")
    const corePrinciplesStart = skill.indexOf("## Core Principles")
    const interactionRulesStart = skill.indexOf("## Interaction Rules")
    const corePrinciples = skill.slice(corePrinciplesStart, interactionRulesStart)

    expect(corePrinciplesStart).toBeGreaterThanOrEqual(0)
    expect(interactionRulesStart).toBeGreaterThan(corePrinciplesStart)
    expect(corePrinciples).toContain("Do not turn coverage into decomposition")
    expect(corePrinciples).toContain(
      "treat named devices, providers, and data sources as coverage requirements, not automatically as separate integration workstreams",
    )
    expect(corePrinciples).toContain(
      "Split them only when a shared access path cannot satisfy a named requirement",
    )
    expect(corePrinciples).toContain(
      "Leave connector selection to planning unless that choice materially changes product scope or behavior",
    )
  })

  test("narrows multi-outcome requests to one coherent work unit without creating a parent roadmap", async () => {
    const skill = await readFile(skillPath, "utf8")
    const phase03Start = skill.indexOf("#### 0.3 Assess Scope")
    const phase1Start = skill.indexOf("### Phase 1: Understand the Idea")
    const phase03 = skill.slice(phase03Start, phase1Start)

    expect(phase03Start).toBeGreaterThanOrEqual(0)
    expect(phase1Start).toBeGreaterThan(phase03Start)
    expect(phase03).toContain("连贯工作 gate")
    expect(phase03).toContain("多个可独立规划的 product outcome")
    expect(phase03).toContain("询问本次 brainstorm 应负责哪一个领域")
    expect(phase03).toContain("作为 Requirements、Flows、Acceptance Examples")
    expect(phase03).toContain("把这个边界带入 Goal Capsule")
    expect(phase03).toContain("不创建 parent plan 或 roadmap")
  })

  test("preserves the broader relationship in plain language with bullets before diagrams", async () => {
    const sections = await readFile(sectionsPath, "utf8")
    const sectionStart = sections.indexOf("语义角色 `work-relationships`")
    const sectionEnd = sections.indexOf("\n\n- **Actors**", sectionStart)
    const relationshipContract = sections.slice(sectionStart, sectionEnd)

    expect(sectionStart).toBeGreaterThanOrEqual(0)
    expect(sectionEnd).toBeGreaterThan(sectionStart)
    expect(relationshipContract).toContain("浅层缩进 bullet")
    expect(relationshipContract).toContain("缩进只用于组织")
    expect(relationshipContract).toContain("当前理解，不是已承诺的 roadmap")
    expect(relationshipContract).toContain("默认不使用")
    expect(relationshipContract).toContain("非线性 cross-links、fan-in 或 fan-out")
    expect(relationshipContract).toContain("不要创建或同步独立 master map")
  })

  test("gives the relationship section a format-specific semantic role independent of its heading", async () => {
    const sections = await readFile(sectionsPath, "utf8")
    const markdown = await readFile(markdownRenderingPath, "utf8")
    const html = await readFile(htmlRenderingPath, "utf8")
    const readinessStart = sections.indexOf("## 规划就绪检查")
    const readinessEnd = sections.indexOf("## Product Contract hard floor", readinessStart)
    const readinessCheck = sections.slice(readinessStart, readinessEnd)

    expect(sections).toContain("语义角色 `work-relationships`")
    expect(sections).toContain("即使可见 heading")
    expect(readinessStart).toBeGreaterThanOrEqual(0)
    expect(readinessEnd).toBeGreaterThan(readinessStart)
    expect(readinessCheck).toContain("coherent-work gate 拆分了更大的请求")
    expect(readinessCheck).toContain("必须存在 `work-relationships`")
    expect(readinessCheck).toContain("<!-- ce-section: work-relationships -->")
    expect(readinessCheck).toContain('data-ce-section="work-relationships"')
    expect(markdown).toContain("<!-- ce-section: work-relationships -->")
    expect(markdown).toMatch(/唯一例外.*contract-defined invisible semantic marker/s)
    expect(html).toContain('data-ce-section="work-relationships"')
    expect(html).toContain("即使 visible heading 改变")
  })
})
