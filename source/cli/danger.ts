#!/usr/bin/env node

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { registerHooks } from "node:module"
import { resolve as resolveDangerImport } from "../runner/danger-loader.ts"
import { runCI } from "./danger-ci.ts"
import { runPR } from "./danger-pr.ts"

// Map `import 'danger'` -> `risk` so existing Dangerfiles keep working
registerHooks({ resolve: resolveDangerImport })

const subcommand = process.argv[2]
const subArgs = process.argv.slice(3)

switch (subcommand) {
  case "ci":
    await runCI(subArgs)
    break

  case "pr":
    await runPR(subArgs)
    break

  case "--version":
    console.log(version())
    break

  case "--help":
  case "-h":
  case undefined:
    printHelp()
    break

  default:
    console.error(`Unknown command: ${subcommand}`)
    printHelp()
    process.exitCode = 1
}

/** Reads the version out of our own package.json, two levels up from this file */
function version(): string {
  const pkgPath = join(import.meta.dirname, "..", "..", "package.json")
  return JSON.parse(readFileSync(pkgPath, "utf-8")).version
}

function printHelp(): void {
  console.log(`
Usage: danger <command> [options]

Commands:
  ci      Run Danger on CI against the current pull request
  pr      Emulate running Danger against a GitHub PR URL

Options:
  --version    Print the version of risk
  -h, --help   Show this help

Run "danger <command> --help" for more information.
`)
}
