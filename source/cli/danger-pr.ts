import { styleText } from "node:util"
import { parseSharedArgs } from "./parse-args.ts"
import { createFakeCISource } from "../ci/fake.ts"
import { executeDanger } from "../runner/executor.ts"

export async function runPR(argv: string[]): Promise<void> {
  const args = parseSharedArgs(argv)

  if (args.help) {
    printPRHelp()
    return
  }

  // Expect a PR URL as the positional argument
  const prURL = args.positionals[0]
  if (!prURL) {
    console.error(styleText("red", "Please provide a GitHub PR URL."))
    console.error("Usage: danger pr <pr_url>")
    process.exitCode = 1
    return
  }

  // Parse the PR URL
  const match = prURL.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/)
  if (!match) {
    console.error(styleText("red", `Could not parse PR URL: ${prURL}`))
    console.error("Expected format: https://github.com/owner/repo/pull/123")
    process.exitCode = 1
    return
  }

  const repoSlug = match[1]
  const prNumber = match[2]

  // Get GitHub token
  const token = process.env.DANGER_GITHUB_API_TOKEN || process.env.GITHUB_TOKEN
  if (!token) {
    console.error(
      styleText("red", "No GitHub API token found. Set DANGER_GITHUB_API_TOKEN or GITHUB_TOKEN.")
    )
    process.exitCode = 1
    return
  }

  const source = createFakeCISource(repoSlug, prNumber)
  const baseURL = args.baseUrl || process.env.DANGER_GITHUB_API_BASE_URL

  await executeDanger(source, token, {
    dangerfile: args.dangerfile,
    dangerID: args.id,
    textOnly: true, // Always text-only for `danger pr`
    failOnErrors: args.failOnErrors,
    verbose: args.verbose,
    noPublishCheck: true,
    newComment: false,
    removePreviousComments: false,
  }, baseURL)
}

function printPRHelp(): void {
  console.log(`
Usage: danger pr [options] <pr_url>

Emulate running Danger against an existing GitHub Pull Request.
Results are printed to STDOUT only (never posted as comments).

Arguments:
  pr_url                       GitHub PR URL (e.g. https://github.com/owner/repo/pull/123)

Options:
  -d, --dangerfile <path>      Path to the Dangerfile (default: dangerfile.ts)
  --id <id>                    Unique identifier for this danger run (default: "Danger")
  --fail-on-errors             Exit with code 1 if there are failures
  -v, --verbose                Enable verbose logging
  -h, --help                   Show this help
`)
}
