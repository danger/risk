/** The interface for a CI provider */
export interface CISource {
  /** The name of the CI provider */
  readonly name: string
  /** Whether we're running in CI */
  readonly isCI: boolean
  /** Whether the CI run is for a pull request */
  readonly isPR: boolean
  /** The repo slug, e.g. "danger/danger-js" */
  readonly repoSlug: string
  /** The pull request number as a string */
  readonly pullRequestID: string
  /** The commit hash, if available */
  readonly commitHash?: string
  /** The URL to the CI run, if available */
  readonly ciRunURL?: string
}
