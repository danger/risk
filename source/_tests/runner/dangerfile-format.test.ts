import { describe, it, expect, afterAll } from "vitest"
import { createWorkspace, type Workspace } from "../fixtures/dangerfile-workspace.ts"

/**
 * Node picks a Dangerfile's module format from the nearest package.json `type`
 * field. Most projects don't set it, which makes the default CommonJS — so
 * without the format override in the resolve hook, the `dangerfile.ts` the
 * README tells people to write fails with "Cannot use import statement outside
 * a module" in the majority of projects.
 */

const workspaces: Workspace[] = []
const workspace = (type: "commonjs" | "module") => {
  const ws = createWorkspace(type)
  workspaces.push(ws)
  return ws
}

afterAll(() => workspaces.forEach((ws) => ws.cleanup()))

const DANGERFILE = `import { danger, warn } from "danger"\nwarn("ran against " + danger.github.pr.title)\n`
const expected = [{ message: "ran against A PR" }]

describe("Dangerfile module format", () => {
  it("loads an ESM dangerfile.ts in a project without \"type\": \"module\"", () => {
    expect(workspace("commonjs").run("dangerfile.ts", DANGERFILE).warnings).toEqual(expected)
  })

  it("loads an ESM dangerfile.ts in a project with \"type\": \"module\"", () => {
    expect(workspace("module").run("dangerfile.ts", DANGERFILE).warnings).toEqual(expected)
  })

  it("loads a dangerfile.mts in a project without \"type\": \"module\"", () => {
    expect(workspace("commonjs").run("dangerfile.mts", DANGERFILE).warnings).toEqual(expected)
  })

  it("strips types from a dangerfile in a CommonJS project", () => {
    const results = workspace("commonjs").run(
      "dangerfile.ts",
      `import { warn } from "danger"\n` +
        `const reasons: string[] = ["typed", "and stripped"]\n` +
        `warn(reasons.join(" "))\n`
    )
    expect(results.warnings).toEqual([{ message: "typed and stripped" }])
  })
})
