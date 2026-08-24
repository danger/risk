import { describe, it, expect } from "vitest"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "../../..")
const cli = join(root, "source/cli/danger.ts")

const runCLI = (...args: string[]) =>
  execFileSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf-8" })

describe("danger CLI", () => {
  it("prints the version from package.json", () => {
    const { version } = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"))
    expect(runCLI("--version").trim()).toBe(version)
  })

  it("prints help with no arguments", () => {
    const out = runCLI()
    expect(out).toContain("Usage: danger <command>")
    expect(out).toContain("--version")
  })

  it("exits non-zero on an unknown command", () => {
    expect(() => runCLI("nope")).toThrow(/Unknown command/)
  })
})
