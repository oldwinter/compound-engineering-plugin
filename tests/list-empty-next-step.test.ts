import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import os from "os"
import path from "path"

const repoRoot = path.join(import.meta.dir, "..")
const cli = path.join(repoRoot, "src", "index.ts")

async function runList(cwd: string) {
  const proc = Bun.spawn(["bun", "run", cli, "list"], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  const exitCode = await proc.exited
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  return { exitCode, stdout, stderr }
}

describe("list empty next step", () => {
  test("empty cwd says to rerun from a plugin root", async () => {
    const cwd = await fs.mkdtemp(path.join(os.tmpdir(), "ce-list-empty-"))
    const { exitCode, stdout, stderr } = await runList(cwd)
    if (exitCode !== 0) {
      throw new Error(`list failed (exit ${exitCode}).\nstdout: ${stdout}\nstderr: ${stderr}`)
    }
    expect(stdout).toContain("No Claude plugins found.")
    expect(stdout).toContain(".claude-plugin/plugin.json")
    expect(stdout).toContain("bun run list")
  })

  test("this clone root still lists compound-engineering", async () => {
    const { exitCode, stdout, stderr } = await runList(repoRoot)
    if (exitCode !== 0) {
      throw new Error(`list failed (exit ${exitCode}).\nstdout: ${stdout}\nstderr: ${stderr}`)
    }
    expect(stdout).toContain("compound-engineering")
    expect(stdout).not.toContain("No Claude plugins found.")
  })
})
