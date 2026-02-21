#!/usr/bin/env node --experimental-strip-types --no-warnings

import { register } from "node:module"
import { runCI } from "./danger-ci.ts"
import { runPR } from "./danger-pr.ts"

// Register the custom loader that maps `import 'danger'` -> `risk`
register("../runner/danger-loader.ts", import.meta.url)

const subcommand = process.argv[2]
const subArgs = process.argv.slice(3)

switch (subcommand) {
  case "ci":
    await runCI(subArgs)
    break

  case "pr":
    await runPR(subArgs)
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

function printHelp(): void {
  console.log(`
Usage: danger <command> [options]

Commands:
  ci      Run Danger on CI against the current pull request
  pr      Emulate running Danger against a GitHub PR URL

Run "danger <command> --help" for more information.
`)
}
