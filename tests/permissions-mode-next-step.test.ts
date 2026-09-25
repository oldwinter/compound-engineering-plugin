import { describe, expect, test } from "bun:test"
import path from "path"

const repoRoot = path.join(import.meta.dir, "..")
const cli = path.join(repoRoot, "src", "index.ts")

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  // Invoke the file directly. `bun run … --help` is bun's own help on some CI
  // bun builds, so it never reaches citty.
  const proc = Bun.spawn(["bun", cli, ...args], {
    cwd: repoRoot,
    stdout: "pipe",
    stderr: "pipe",
  })
  const exitCode = await proc.exited
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  return { exitCode, stdout, stderr }
}

describe("permissions mode next step", () => {
  test("install --help advertises from-commands, not the singular typo", async () => {
    const { exitCode, stdout, stderr } = await runCli(["install", "--help"])
    const help = `${stdout}\n${stderr}`
    expect(exitCode).toBe(0)
    expect(help).toContain("from-commands")
    expect(help).not.toMatch(/from-command(?!s)/)
  })

  test("install --permissions from-command lists valid modes", async () => {
    const { exitCode, stdout, stderr } = await runCli([
      "install",
      ".",
      "--permissions",
      "from-command",
    ])
    const output = `${stdout}\n${stderr}`
    expect(exitCode).not.toBe(0)
    expect(output).toContain("Unknown permissions mode: from-command")
    expect(output).toContain("Use one of: none, broad, from-commands")
    expect(output).not.toContain("Installed ")
  })

  test("convert --permissions from-command lists valid modes", async () => {
    const { exitCode, stdout, stderr } = await runCli([
      "convert",
      ".",
      "--permissions",
      "from-command",
    ])
    const output = `${stdout}\n${stderr}`
    expect(exitCode).not.toBe(0)
    expect(output).toContain("Unknown permissions mode: from-command")
    expect(output).toContain("Use one of: none, broad, from-commands")
    expect(output).not.toContain("Converted ")
  })
})
