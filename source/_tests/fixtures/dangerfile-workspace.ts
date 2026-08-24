import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, existsSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dirname, "../../..")
const dist = join(root, "dist")

/** Mirrors the two lines danger.ts runs at startup, then evaluates a Dangerfile. */
const DRIVER = `
import { registerHooks } from "node:module"
const { resolve } = await import(${JSON.stringify(join(dist, "runner/danger-loader.js"))})
registerHooks({ resolve })

const { _setDangerDSL, _resetResults } = await import("risk")
const { runDangerfile } = await import(${JSON.stringify(join(dist, "runner/dangerfile.js"))})

_resetResults()
_setDangerDSL({ github: { pr: { title: "A PR" } } })
const results = await runDangerfile(process.argv[2])
console.log(JSON.stringify(results))
`

export interface Workspace {
  /** Adds a node_modules/<name> package that imports from "danger" */
  writePlugin(name: string, opts: { cjs: boolean }): void
  /** Writes a Dangerfile, runs it in a real node process, returns the results */
  run(filename: string, source: string): any
  cleanup(): void
}

/**
 * A throwaway project with `risk` installed, for exercising the real module
 * resolution rules that a Dangerfile hits.
 *
 * `type` is the package.json "type" field: "commonjs" is the default for the
 * ecosystem, and the case where Node would otherwise refuse to load an ESM
 * Dangerfile.
 */
export function createWorkspace(type: "commonjs" | "module" = "commonjs"): Workspace {
  // The exports map and the built loader are part of what's under test
  if (!existsSync(join(dist, "index.js"))) {
    execFileSync("npx", ["tsc"], { cwd: root, stdio: "inherit" })
  }

  const dir = mkdtempSync(join(tmpdir(), "risk-dangerfile-"))
  mkdirSync(join(dir, "node_modules"), { recursive: true })
  symlinkSync(root, join(dir, "node_modules", "risk"), "dir")
  writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fixture", private: true, type }))
  writeFileSync(join(dir, "driver.mjs"), DRIVER)

  return {
    writePlugin(name, { cjs }) {
      const pluginDir = join(dir, "node_modules", name)
      mkdirSync(pluginDir, { recursive: true })
      writeFileSync(
        join(pluginDir, "package.json"),
        JSON.stringify({ name, version: "1.0.0", main: "index.js", ...(cjs ? {} : { type: "module" }) })
      )
      writeFileSync(
        join(pluginDir, "index.js"),
        cjs
          ? `const { danger, warn } = require("danger")\n` +
              `module.exports = function () { warn("${name} saw " + danger.github.pr.title) }\n`
          : `import { danger, warn } from "danger"\n` +
              `export default function () { warn("${name} saw " + danger.github.pr.title) }\n`
      )
    },

    run(filename, source) {
      const dangerfile = join(dir, filename)
      writeFileSync(dangerfile, source)
      const stdout = execFileSync(process.execPath, [join(dir, "driver.mjs"), dangerfile], {
        cwd: dir,
        encoding: "utf-8",
      })
      return JSON.parse(stdout)
    },

    cleanup() {
      rmSync(dir, { recursive: true, force: true })
    },
  }
}
