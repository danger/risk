/** A string that can contain markdown */
export type MarkdownString = string

/**
 * The result of a user calling warn, message, fail, or markdown.
 */
export interface Violation {
  /** The string representation */
  message: string
  /** Optional path to the file */
  file?: string
  /** Optional line in the file */
  line?: number
  /** Optional icon for table (only valid for messages) */
  icon?: string
}

/** Whether a violation is attached to a specific file and line */
export const isInline = (violation: Violation): boolean =>
  violation.file !== undefined && violation.line !== undefined

/** A platform-agnostic reference to a Git commit */
export interface GitCommit {
  /** The SHA for the commit */
  sha: string
  /** Who wrote the commit */
  author: GitCommitAuthor
  /** Who deployed the commit */
  committer: GitCommitAuthor
  /** The commit message */
  message: string
  /** Potential parent commits, and other assorted metadata */
  tree: any
  /** SHAs for the commit's parents */
  parents?: string[]
  /** Link to the commit */
  url: string
}

/** An author of a commit */
export interface GitCommitAuthor {
  /** The display name for the author */
  name: string
  /** The author's email */
  email: string
  /** ISO6801 date string */
  date: string
}

/** Metadata about the repo and PR being evaluated */
export interface RepoMetaData {
  /** The slug for the repo, e.g. "danger/danger-js" */
  repoSlug: string
  /** The PR number */
  pullRequestID: string
}
