import { styleText } from "node:util"
import { parseSharedArgs } from "./parse-args.ts"
import { detectCISource } from "../ci/detect.ts"
import { executeDanger } from "../runner/executor.ts"

export async function runCI(argv: string[]): Promise<void> {
  const args = parseSharedArgs(argv)

  if (args.help) {
    printCIHelp()
    return
  }

  // Detect CI environment
  const source = detectCISource(process.env)
  if (!source) {
    console.log("Could not detect a CI environment. Is this running on CI?")
    console.log("You can set DANGER_GITHUB_API_TOKEN + DANGER_PR_URL for generic CI support.")
    return
  }

  if (!source.isPR) {
    console.log("Skipping Danger: this run is not for a pull request.")
    return
  }

  // Get GitHub token
  const token = process.env.DANGER_GITHUB_API_TOKEN || process.env.GITHUB_TOKEN
  if (!token) {
    console.error(
      styleText("red", "No GitHub API token found. Set DANGER_GITHUB_API_TOKEN or GITHUB_TOKEN.")
    )
    process.exitCode = 1
    return
  }

  const baseURL = args.baseUrl || process.env.DANGER_GITHUB_API_BASE_URL

  await executeDanger(source, token, {
    dangerfile: args.dangerfile,
    dangerID: args.id,
    textOnly: args.textOnly,
    failOnErrors: args.failOnErrors,
    verbose: args.verbose,
    noPublishCheck: args.noPublishCheck,
    newComment: args.newComment,
    removePreviousComments: args.removePreviousComments,
  }, baseURL)
}

function printCIHelp(): void {
  console.log(`
Usage: danger ci [options]

Runs a Dangerfile on CI against the current pull request.

Options:
  -d, --dangerfile <path>      Path to the Dangerfile (default: dangerfile.ts)
  --id <id>                    Unique identifier for this danger run (default: "Danger")
  -t, --text-only              Only output to STDOUT, don't post comments
  --fail-on-errors             Exit with code 1 if there are failures
  -v, --verbose                Enable verbose logging
  --no-publish-check           Don't set commit status
  --new-comment                Always create a new comment
  --remove-previous-comments   Remove previous comments before posting
  --base-url <url>             GitHub API base URL (for GitHub Enterprise)
  -h, --help                   Show this help
`)
}
