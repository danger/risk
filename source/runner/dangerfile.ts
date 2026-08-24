import { existsSync, realpathSync } from "node:fs"
import { resolve, join } from "node:path"
import { pathToFileURL } from "node:url"
import { _getResults, _injectGlobals } from "../index.ts"
import { runAllScheduledTasks } from "./context.ts"
import { _setDangerfileURL } from "./danger-loader.ts"
import type { DangerRuntimeContainer } from "../dsl/results.ts"

/** The default dangerfile names to look for, in priority order */
const DANGERFILE_NAMES = [
  "dangerfile.ts",
  "dangerfile.js",
  "Dangerfile.ts",
  "Dangerfile.js",
  "dangerfile.mts",
  "dangerfile.mjs",
]

/**
 * Resolve the path to the Dangerfile.
 * If a specific path is given, use it. Otherwise, search for defaults.
 */
export function resolveDangerfilePath(specified?: string): string | undefined {
  if (specified) {
    const abs = resolve(process.cwd(), specified)
    return existsSync(abs) ? abs : undefined
  }

  for (const name of DANGERFILE_NAMES) {
    const abs = join(process.cwd(), name)
    if (existsSync(abs)) return abs
  }

  return undefined
}

/**
 * Execute a Dangerfile and return the results.
 * The singleton DSL must be populated before calling this.
 */
export async function runDangerfile(dangerfilePath: string): Promise<DangerRuntimeContainer> {
  // Inject globals for backwards compat
  _injectGlobals()

  // Dynamic import the dangerfile. Flag it to the resolve hook first, so it
  // loads as ESM even in a project without "type": "module". Node resolves
  // symlinks when it resolves a specifier, so this has to be the real path
  // for the hook's URL comparison to match.
  const fileURL = pathToFileURL(realpathSync(dangerfilePath)).href
  _setDangerfileURL(fileURL)
  const mod = await import(fileURL)

  // If there's a default export function, call it
  if (typeof mod.default === "function") {
    await mod.default()
  }

  // Run scheduled async tasks
  const results = _getResults()
  await runAllScheduledTasks(results)

  return results
}
