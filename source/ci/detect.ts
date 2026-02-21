import type { CISource } from "./ci-source.ts"
import { createGitHubActionsCISource } from "./github-actions.ts"
import { createGenericCISource } from "./generic.ts"

/**
 * Auto-detect CI environment from process.env.
 * Returns the first matching CI source, or undefined.
 */
export function detectCISource(env: Record<string, string | undefined>): CISource | undefined {
  // Try GitHub Actions first (most common)
  const ghActions = createGitHubActionsCISource(env)
  if (ghActions) return ghActions

  // Fall back to generic env-var detection
  const generic = createGenericCISource(env)
  if (generic) return generic

  return undefined
}
