import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import {
  COMPATIBILITY_CONVERTERS,
  convertToFlagDescription,
  implementedConvertTargetNames,
  targets,
  unknownConvertTargetMessage,
} from "../src/targets"

const repoRoot = path.join(import.meta.dir, "..")

describe("convert target registry", () => {
  test("every claude-to-*.ts is either a convert target or a compatibility converter, not both", async () => {
    const convertersDir = path.join(repoRoot, "src", "converters")
    const files = (await fs.readdir(convertersDir)).filter(
      (name) => name.startsWith("claude-to-") && name.endsWith(".ts"),
    )
    const convertNames = new Set(Object.keys(targets))
    const compatNames = new Set<string>(COMPATIBILITY_CONVERTERS)

    expect(files.length).toBeGreaterThan(0)
    for (const file of files) {
      const host = file.slice("claude-to-".length, -".ts".length)
      const inConvert = convertNames.has(host)
      const inCompat = compatNames.has(host)
      if (!(inConvert || inCompat)) {
        throw new Error(`${file} must be listed in targets or COMPATIBILITY_CONVERTERS`)
      }
      if (inConvert && inCompat) {
        throw new Error(`${file} cannot be both a convert target and a compatibility converter`)
      }
    }

    for (const name of convertNames) {
      expect(compatNames.has(name)).toBe(false)
    }
  })

  test("convert and install --to help matches implemented registry keys", async () => {
    const expected = convertToFlagDescription()
    expect(expected).toBe(`Target format (${implementedConvertTargetNames().join(" | ")} | all)`)
    expect(implementedConvertTargetNames()).toEqual(["opencode", "codex", "pi", "antigravity"])

    for (const file of ["convert.ts", "install.ts"] as const) {
      const source = await fs.readFile(path.join(repoRoot, "src", "commands", file), "utf8")
      expect(source).toContain("description: convertToFlagDescription()")
    }
  })

  test("unknown --to lists valid targets before loading a plugin", async () => {
    const missingSource = "./does-not-exist-plugin"

    const kiro = Bun.spawn(["bun", "run", "src/index.ts", "convert", missingSource, "--to", "kiro"], {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
    })
    const [kiroExit, kiroErr] = await Promise.all([
      kiro.exited,
      new Response(kiro.stderr).text(),
      new Response(kiro.stdout).text(),
    ])
    expect(kiroExit).not.toBe(0)
    expect(kiroErr).toContain(unknownConvertTargetMessage("kiro"))
    expect(kiroErr).toContain("Use one of: opencode, codex, pi, antigravity, all")
    expect(kiroErr).not.toContain("Could not find")

    const foo = Bun.spawn(["bun", "run", "src/index.ts", "install", missingSource, "--to", "foo"], {
      cwd: repoRoot,
      stdout: "pipe",
      stderr: "pipe",
    })
    const [fooExit, fooErr] = await Promise.all([
      foo.exited,
      new Response(foo.stderr).text(),
      new Response(foo.stdout).text(),
    ])
    expect(fooExit).not.toBe(0)
    expect(fooErr).toContain(unknownConvertTargetMessage("foo"))
    expect(fooErr).not.toContain("native plugin install only")
    expect(fooErr).not.toContain("Could not find")
    expect(fooErr).not.toContain("Local plugin path not found")
  })
})
