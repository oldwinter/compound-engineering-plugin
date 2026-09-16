import { readFileSync } from "fs"
import path from "path"
import { describe, expect, test } from "bun:test"

const README = readFileSync(path.join(import.meta.dir, "..", "README.md"), "utf8")

function section(start: string, end: string): string {
  const from = README.indexOf(start)
  const to = README.indexOf(end)
  expect(from).toBeGreaterThanOrEqual(0)
  expect(to).toBeGreaterThan(from)
  return README.slice(from, to)
}

describe("readme chinese Codex install", () => {
  test("安装中文版 has a copyable Codex CLI for this fork", () => {
    const zh = section("## 安装中文版", "## Install")
    expect(zh).toContain("codex plugin marketplace add oldwinter/compound-engineering-plugin")
    expect(zh).toContain("codex plugin add compound-engineering@compound-engineering-plugin")
    expect(zh).not.toContain("codex plugin marketplace add EveryInc/compound-engineering-plugin")
    expect(zh).toMatch(/EveryInc[\s\S]{0,80}上游英文|上游英文[\s\S]{0,80}EveryInc/)
  })

  test("English Install still documents upstream EveryInc Codex CLI", () => {
    const install = section("## Install", "## Philosophy")
    expect(install).toContain("codex plugin marketplace add EveryInc/compound-engineering-plugin")
    expect(install).not.toContain("codex plugin marketplace add oldwinter/compound-engineering-plugin")
  })
})
