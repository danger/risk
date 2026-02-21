import type { GitCommit } from "../dsl/types.ts"
import type { Octokit } from "@octokit/rest"

// This is `danger.github` inside the JSON

export interface GitHubJSONDSL {
  /** The issue metadata for a code review session */
  issue: GitHubIssue
  /** The PR metadata for a code review session */
  pr: GitHubPRDSL
  /** The PR metadata formatted for use with the GitHub API client */
  thisPR: GitHubAPIPR
  /** The GitHub commit metadata for a code review session */
  commits: GitHubCommit[]
  /** The reviews left on this pull request */
  reviews: GitHubReview[]
  /** The people/teams requested to review this PR */
  requested_reviewers: GitHubReviewers
}

// This is `danger.github`

/** The GitHub metadata for your PR */
export interface GitHubDSL extends GitHubJSONDSL {
  /**
   * An authenticated API so you can extend danger's behavior
   * using the GitHub v3 API. This is an @octokit/rest instance.
   */
  api: Octokit
  /** A scope for useful functions related to GitHub */
  utils: GitHubUtilsDSL
  /**
   * Sets a markdown summary which shows on the overview page for the
   * results of all steps in your CI job.
   */
  setSummaryMarkdown: (markdown: string) => void
}

/** Useful functions for GitHub-related work */
export interface GitHubUtilsDSL {
  /**
   * Creates HTML for a sentence of clickable links for an array of paths.
   * Uses the source of the PR as the target.
   */
  fileLinks(paths: string[], useBasename?: boolean, repoSlug?: string, branch?: string): string

  /**
   * Downloads a file's contents via the GitHub API.
   */
  fileContents(path: string, repoSlug?: string, ref?: string): Promise<string>

  /**
   * An API for creating, updating and closing an issue.
   */
  createUpdatedIssueWithID: (
    id: string,
    content: string,
    config: { title: string; open: boolean; owner: string; repo: string }
  ) => Promise<string>

  /**
   * An API for creating or setting a label on an issue.
   */
  createOrAddLabel: (
    labelConfig: { name: string; color: string; description: string },
    repoConfig?: { owner: string; repo: string; id: number }
  ) => Promise<void>

  /**
   * An API for creating or updating a PR with file changes.
   */
  createOrUpdatePR: (
    config: {
      title: string
      body: string
      owner?: string
      repo?: string
      commitMessage: string
      newBranchName: string
      baseBranch: string
    },
    fileMap: any
  ) => Promise<any>
}

/**
 * A GitHub Issue. Refers to the issue that makes up the Pull Request.
 */
export interface GitHubIssue {
  /** The labels associated with this issue */
  labels: GitHubIssueLabel[]
}

export interface GitHubIssueLabel {
  /** The identifying number of this label */
  id: number
  /** The URL that links to this label */
  url: string
  /** The name of the label */
  name: string
  /** The color associated with this label */
  color: string
}

export interface GitHubIssueComment {
  /** UUID for the comment */
  id: string
  /** The User who made the comment */
  user: GitHubUser
  /** Textual representation of comment */
  body: string
}

/**
 * An exact copy of the PR's reference JSON.
 */
export interface GitHubPRDSL {
  /** The UUID for the PR */
  number: number
  /** The state for the PR */
  state: "closed" | "open" | "locked" | "merged"
  /** Has the PR been locked to contributors only? */
  locked: boolean
  /** The title of the PR */
  title: string
  /** The markdown body message of the PR */
  body: string
  /** ISO6801 Date string for when PR was created */
  created_at: string
  /** ISO6801 Date string for when PR was updated */
  updated_at: string
  /** Optional ISO6801 Date string for when PR was closed */
  closed_at: string | null
  /** Optional ISO6801 Date string for when PR was merged */
  merged_at: string | null
  /** Merge reference for the _other_ repo */
  head: GitHubMergeRef
  /** Merge reference for _this_ repo */
  base: GitHubMergeRef
  /** The User who submitted the PR */
  user: GitHubUser
  /** The User who is assigned the PR */
  assignee: GitHubUser
  /** The Users who are assigned to the PR */
  assignees: GitHubUser[]
  /** Is in draft state? */
  draft: boolean
  /** Has the PR been merged yet? */
  merged: boolean
  /** The number of comments on the PR */
  comments: number
  /** The number of review-specific comments on the PR */
  review_comments: number
  /** The number of commits in the PR */
  commits: number
  /** The number of additional lines in the PR */
  additions: number
  /** The number of deleted lines in the PR */
  deletions: number
  /** The number of changed files in the PR */
  changed_files: number
  /** The link back to this PR as user-facing */
  html_url: string
  /** How does the PR author relate to this repo/org? */
  author_association:
    | "COLLABORATOR"
    | "CONTRIBUTOR"
    | "FIRST_TIMER"
    | "FIRST_TIME_CONTRIBUTOR"
    | "MEMBER"
    | "NONE"
    | "OWNER"
}

/** A GitHub-specific implementation of a git commit */
export interface GitHubCommit {
  /** The raw commit metadata */
  commit: GitCommit
  /** The SHA for the commit */
  sha: string
  /** The URL for the commit on GitHub */
  url: string
  /** The GitHub user who wrote the code */
  author: GitHubUser
  /** The GitHub user who shipped the code */
  committer: GitHubUser
  /** An array of parent commit shas */
  parents: any[]
}

/** A GitHub user account */
export interface GitHubUser {
  /** Generic UUID */
  id: number
  /** The handle for the user/org */
  login: string
  /** Whether the user is an org, or a user */
  type: "User" | "Organization" | "Bot"
  /** The URL for a user's image */
  avatar_url: string
  /** The href for a user's page */
  href: string
}

/** A GitHub Repo */
export interface GitHubRepo {
  /** Generic UUID */
  id: number
  /** The name of the repo, e.g. "Danger-JS" */
  name: string
  /** The full name of the owner + repo, e.g. "Danger/Danger-JS" */
  full_name: string
  /** The owner of the repo */
  owner: GitHubUser
  /** Is the repo publicly accessible? */
  private: boolean
  /** The textual description of the repo */
  description: string
  /** Is the repo a fork? */
  fork: boolean
  /** Is someone assigned to this PR? */
  assignee: GitHubUser
  /** Are there people assigned to this PR? */
  assignees: GitHubUser[]
  /** The root web URL for the repo */
  html_url: string
}

export interface GitHubMergeRef {
  /** The human display name for the merge reference, e.g. "artsy:master" */
  label: string
  /** The reference point for the merge, e.g. "master" */
  ref: string
  /** The reference point for the merge (SHA) */
  sha: string
  /** The user that owns the merge reference */
  user: GitHubUser
  /** The repo from which the reference comes from */
  repo: GitHubRepo
}

/**
 * A GitHub review on a PR.
 * While a review is pending, it will only have a user.
 */
export interface GitHubReview {
  /** The user requested to review, or the user who completed the review */
  user: GitHubUser
  /** If there is a review, this provides the ID for it */
  id?: number
  /** If there is a review, the body of the review */
  body?: string
  /** If there is a review, the commit ID this review was made on */
  commit_id?: string
  /** The state of the review */
  state?: "APPROVED" | "REQUEST_CHANGES" | "COMMENT" | "PENDING"
}

/** Provides the current PR in an easily used way for params in `github.api` calls */
export interface GitHubAPIPR {
  /** The repo owner */
  owner: string
  /** The repo name */
  repo: string
  /** The PR number */
  pull_number: number
  /**
   * The PR number
   * @deprecated use `pull_number` instead
   */
  number: number
}

export interface GitHubReviewers {
  /** Users that have been requested */
  users: GitHubUser[]
  /** Teams that have been requested */
  teams: any[]
}
