import { readFileSync } from "node:fs"
import type { CISource } from "./ci-source.ts"

/**
 * Detect GitHub Actions CI environment.
 * Reads the event payload from GITHUB_EVENT_PATH to extract PR info.
 */
export function createGitHubActionsCISource(env: Record<string, string | undefined>): CISource | undefined {
  if (!env.GITHUB_WORKFLOW) return undefined
  if (!env.GITHUB_EVENT_PATH) return undefined

  let event: any
  try {
    event = JSON.parse(readFileSync(env.GITHUB_EVENT_PATH, "utf-8"))
  } catch {
    return undefined
  }

  // PR events have a pull_request key
  const pr = event.pull_request
  if (!pr) return undefined

  const repoSlug = pr.base?.repo?.full_name || env.GITHUB_REPOSITORY || ""
  const pullRequestID = String(pr.number)
  const commitHash = pr.head?.sha || env.GITHUB_SHA

  return {
    name: "GitHub Actions",
    isCI: true,
    isPR: true,
    repoSlug,
    pullRequestID,
    commitHash,
    ciRunURL: env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
      ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
      : undefined,
  }
}
