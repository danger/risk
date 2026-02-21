import { styleText } from "node:util"
import { writeFileSync } from "node:fs"
import type { CISource } from "../ci/ci-source.ts"
import type { GitHubAPIClient } from "../github/api.ts"
import { createGitHubAPI } from "../github/api.ts"
import { buildDangerDSL } from "../github/github.ts"
import { updateOrCreateComment, updateCommitStatus } from "../github/commenter.ts"
import type { CommenterOptions } from "../github/commenter.ts"
import { _setDangerDSL, _resetResults } from "../index.ts"
import { resolveDangerfilePath, runDangerfile } from "./dangerfile.ts"
import type { DangerResults } from "../dsl/results.ts"

export interface ExecutorOptions {
  /** Path to the dangerfile */
  dangerfile?: string
  /** Unique identifier for this danger run */
  dangerID: string
  /** Only output to STDOUT, don't post comments */
  textOnly: boolean
  /** Exit with code 1 if there are fails */
  failOnErrors: boolean
  /** Verbose logging */
  verbose: boolean
  /** Don't set commit status */
  noPublishCheck: boolean
  /** Always create a new comment instead of updating */
  newComment: boolean
  /** Remove previous comments and create fresh */
  removePreviousComments: boolean
}

/**
 * Run the full Danger pipeline:
 * 1. Build the DSL from GitHub API
 * 2. Populate the singleton
 * 3. Execute the Dangerfile
 * 4. Post results
 */
export async function executeDanger(
  source: CISource,
  token: string,
  options: ExecutorOptions,
  baseURL?: string
): Promise<void> {
  const api = createGitHubAPI(
    { repoSlug: source.repoSlug, pullRequestID: source.pullRequestID },
    token,
    baseURL
  )

  // 1. Build DSL
  if (options.verbose) console.log("Building Danger DSL...")
  const dsl = await buildDangerDSL(api)

  // 2. Populate singleton
  _resetResults()
  _setDangerDSL(dsl)

  // 3. Resolve and run the Dangerfile
  const dangerfilePath = resolveDangerfilePath(options.dangerfile)
  if (!dangerfilePath) {
    console.error(
      styleText("red", `Could not find a Dangerfile. Looked for: dangerfile.ts, dangerfile.js, Dangerfile.ts, Dangerfile.js`)
    )
    process.exitCode = 1
    return
  }

  if (options.verbose) console.log(`Running Dangerfile: ${dangerfilePath}`)

  let results: DangerResults
  try {
    results = await runDangerfile(dangerfilePath)
  } catch (error: any) {
    console.error(styleText("red", `Error running Dangerfile: ${error.message}`))
    if (options.verbose && error.stack) console.error(error.stack)
    results = {
      fails: [{ message: `Dangerfile failed to evaluate: ${error.message}` }],
      warnings: [],
      messages: [],
      markdowns: [],
    }
  }

  // 4. Handle results
  if (options.textOnly) {
    printResultsToStdout(results)
  } else {
    await postResultsToGitHub(api, results, options, source)
  }

  // Handle GitHub Actions step summary
  const summaryMarkdown = (dsl as any)._getSummaryMarkdown?.()
  if (summaryMarkdown && process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMarkdown, { flag: "a" })
  }

  // Set exit code
  if (options.failOnErrors && results.fails.length > 0) {
    process.exitCode = 1
  }
}

async function postResultsToGitHub(
  api: GitHubAPIClient,
  results: DangerResults,
  options: ExecutorOptions,
  source: CISource
): Promise<void> {
  const commenterOptions: CommenterOptions = {
    dangerID: options.dangerID,
    newComment: options.newComment,
    removePreviousComments: options.removePreviousComments,
  }

  const commentURL = await updateOrCreateComment(
    api,
    commenterOptions,
    results,
    source.commitHash
  )

  if (!options.noPublishCheck) {
    await updateCommitStatus(
      api,
      results,
      commentURL,
      options.dangerID,
      source.commitHash
    )
  }

  if (commentURL) {
    console.log(`Danger results posted to: ${commentURL}`)
  }
}

function printResultsToStdout(results: DangerResults): void {
  const { fails, warnings, messages, markdowns } = results

  if (fails.length > 0) {
    console.log(styleText("red", `\nFails (${fails.length}):`))
    for (const f of fails) {
      const location = f.file ? ` (${f.file}${f.line ? `:${f.line}` : ""})` : ""
      console.log(styleText("red", `  - ${f.message}${location}`))
    }
  }

  if (warnings.length > 0) {
    console.log(styleText("yellow", `\nWarnings (${warnings.length}):`))
    for (const w of warnings) {
      const location = w.file ? ` (${w.file}${w.line ? `:${w.line}` : ""})` : ""
      console.log(styleText("yellow", `  - ${w.message}${location}`))
    }
  }

  if (messages.length > 0) {
    console.log(`\nMessages (${messages.length}):`)
    for (const m of messages) {
      const location = m.file ? ` (${m.file}${m.line ? `:${m.line}` : ""})` : ""
      console.log(`  - ${m.message}${location}`)
    }
  }

  if (markdowns.length > 0) {
    console.log(`\nMarkdown:`)
    for (const md of markdowns) {
      console.log(md.message)
    }
  }

  if (fails.length === 0 && warnings.length === 0 && messages.length === 0 && markdowns.length === 0) {
    console.log(styleText("green", "\nAll good! No issues found."))
  }
}
