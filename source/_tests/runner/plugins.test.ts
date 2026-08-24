import { describe, it, expect, beforeAll, afterAll } from "vitest"
import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { createWorkspace, type Workspace } from "../fixtures/dangerfile-workspace.ts"

/**
 * Integration tests for the plugin infrastructure.
 *
 * A `danger-plugin-*` package imports from "danger", not from "risk". For a
 * plugin to work, two things have to hold:
 *
 *   1. The "danger" specifier resolves to "risk" for both `import` and
 *      `require` — plugins predate ESM, so most of them are still CJS.
 *   2. The plugin gets the *same* module instance as the Dangerfile, so
 *      `warn()` from inside a plugin lands in the same results container.
 */

let ws: Workspace

beforeAll(() => {
  ws = createWorkspace()
  ws.writePlugin("danger-plugin-esm", { cjs: false })
  ws.writePlugin("danger-plugin-cjs", { cjs: true })
}, 60_000)

afterAll(() => ws?.cleanup())

describe("plugin infrastructure", () => {
  it("resolves `danger` to `risk` for an ESM plugin", () => {
    const results = ws.run("dangerfile.ts", `import plugin from "danger-plugin-esm"\nplugin()\n`)
    expect(results.warnings).toEqual([{ message: "danger-plugin-esm saw A PR" }])
  })

  it("resolves `danger` to `risk` for a CJS plugin", () => {
    // Most published danger-plugin-* packages are CJS and call require("danger").
    // This only works because we use module.registerHooks(), which hooks the CJS
    // loader too — module.register() is ESM-only.
    const results = ws.run("dangerfile.ts", `import plugin from "danger-plugin-cjs"\nplugin()\n`)
    expect(results.warnings).toEqual([{ message: "danger-plugin-cjs saw A PR" }])
  })

  it("shares one results container between the Dangerfile and its plugins", () => {
    const results = ws.run(
      "dangerfile.ts",
      `import esm from "danger-plugin-esm"\n` +
        `import cjs from "danger-plugin-cjs"\n` +
        `import { message } from "danger"\n` +
        `esm()\ncjs()\nmessage("from the dangerfile")\n`
    )
    expect(results.warnings.map((w: any) => w.message)).toEqual([
      "danger-plugin-esm saw A PR",
      "danger-plugin-cjs saw A PR",
    ])
    expect(results.messages).toEqual([{ message: "from the dangerfile" }])
  })

  it("lets a Dangerfile import `risk` and `danger` interchangeably", () => {
    const results = ws.run(
      "dangerfile.ts",
      `import { warn } from "danger"\nimport { message } from "risk"\n` +
        `warn("via danger")\nmessage("via risk")\n`
    )
    expect(results.warnings).toEqual([{ message: "via danger" }])
    expect(results.messages).toEqual([{ message: "via risk" }])
  })

  it("exposes both require and import conditions, so CJS plugins can load risk", () => {
    const root = resolve(import.meta.dirname, "../../..")
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"))
    expect(pkg.exports["."].require).toBeDefined()
    expect(pkg.exports["."].import).toBeDefined()
  })
})
