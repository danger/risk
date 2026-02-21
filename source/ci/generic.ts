import type { CISource } from "./ci-source.ts"

/**
 * Generic CI detection using environment variables.
 * Works with any CI that sets DANGER_GITHUB_API_TOKEN and either
 * DANGER_PR_URL or (DANGER_REPO_SLUG + DANGER_PR_ID).
 */
export function createGenericCISource(env: Record<string, string | undefined>): CISource | undefined {
  // Need at least a token to talk to GitHub
  const token = env.DANGER_GITHUB_API_TOKEN || env.GITHUB_TOKEN
  if (!token) return undefined

  let repoSlug: string | undefined
  let pullRequestID: string | undefined

  // Option 1: Full PR URL like https://github.com/owner/repo/pull/123
  if (env.DANGER_PR_URL) {
    const match = env.DANGER_PR_URL.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/)
    if (match) {
      repoSlug = match[1]
      pullRequestID = match[2]
    }
  }

  // Option 2: Explicit repo slug and PR ID
  if (!repoSlug && env.DANGER_REPO_SLUG) {
    repoSlug = env.DANGER_REPO_SLUG
  }
  
  if (!pullRequestID && env.DANGER_PR_ID) {
    pullRequestID = env.DANGER_PR_ID
  }

  if (!repoSlug || !pullRequestID) return undefined

  return {
    name: "Generic CI",
    isCI: true,
    isPR: true,
    repoSlug,
    pullRequestID,
    commitHash: env.DANGER_COMMIT_SHA,
  }
}
