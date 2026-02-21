import type { CISource } from "./ci-source.ts"

/**
 * A fake CI source for testing and `danger pr`.
 */
export function createFakeCISource(repoSlug: string, pullRequestID: string): CISource {
  return {
    name: "Fake Testing CI",
    isCI: true,
    isPR: true,
    repoSlug,
    pullRequestID,
  }
}
