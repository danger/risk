import { Octokit } from "@octokit/rest"
import type { RepoMetaData } from "../dsl/types.ts"
import type {
  GitHubPRDSL,
  GitHubCommit,
  GitHubReview,
  GitHubReviewers,
  GitHubIssue,
  GitHubIssueComment,
} from "./types.ts"
import { dangerIDToString } from "./template.ts"

/** A file returned by the GitHub PR files endpoint */
export interface GitHubFile {
  sha: string
  filename: string
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged"
  additions: number
  deletions: number
  changes: number
  patch?: string
  previous_filename?: string
}

/** The GitHub API handle - a plain data object with an Octokit instance and repo context */
export interface GitHubAPIClient {
  octokit: Octokit
  owner: string
  repo: string
  prNumber: number
}

/** Create a GitHub API client */
export function createGitHubAPI(
  repoMetadata: RepoMetaData,
  token: string,
  baseURL?: string
): GitHubAPIClient {
  const [owner, repo] = repoMetadata.repoSlug.split("/")
  const prNumber = parseInt(repoMetadata.pullRequestID, 10)

  const octokit = new Octokit({
    auth: token,
    baseUrl: baseURL || "https://api.github.com",
    userAgent: "risk/danger-js",
  })

  return { octokit, owner, repo, prNumber }
}

// --- PR Data ---

export async function getPullRequestInfo(api: GitHubAPIClient): Promise<GitHubPRDSL> {
  const { data } = await api.octokit.pulls.get({
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
  })
  return data as unknown as GitHubPRDSL
}

export async function getPullRequestCommits(api: GitHubAPIClient): Promise<GitHubCommit[]> {
  const commits = await api.octokit.paginate(api.octokit.pulls.listCommits, {
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
    per_page: 100,
  })
  return commits as unknown as GitHubCommit[]
}

export async function getPullRequestFiles(api: GitHubAPIClient): Promise<GitHubFile[]> {
  const files = await api.octokit.paginate(api.octokit.pulls.listFiles, {
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
    per_page: 100,
  })
  return files as GitHubFile[]
}

export async function getPullRequestDiff(api: GitHubAPIClient): Promise<string> {
  const { data } = await api.octokit.pulls.get({
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
    mediaType: { format: "diff" },
  })
  return data as unknown as string
}

export async function getReviews(api: GitHubAPIClient): Promise<GitHubReview[]> {
  const reviews = await api.octokit.paginate(api.octokit.pulls.listReviews, {
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
    per_page: 100,
  })
  return reviews as unknown as GitHubReview[]
}

export async function getReviewerRequests(api: GitHubAPIClient): Promise<GitHubReviewers> {
  const { data } = await api.octokit.pulls.listRequestedReviewers({
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
  })
  return data as unknown as GitHubReviewers
}

export async function getIssue(api: GitHubAPIClient): Promise<GitHubIssue> {
  const { data } = await api.octokit.issues.get({
    owner: api.owner,
    repo: api.repo,
    issue_number: api.prNumber,
  })
  return { labels: data.labels } as GitHubIssue
}

// --- File Contents ---

export async function getFileContents(
  api: GitHubAPIClient,
  path: string,
  repoSlug?: string,
  ref?: string
): Promise<string> {
  const [fileOwner, fileRepo] = repoSlug
    ? repoSlug.split("/")
    : [api.owner, api.repo]

  try {
    const { data } = await api.octokit.repos.getContent({
      owner: fileOwner,
      repo: fileRepo,
      path,
      ref,
    })

    if ("content" in data && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString()
    }
    return ""
  } catch {
    return ""
  }
}

// --- Comments ---

export async function getPullRequestComments(api: GitHubAPIClient): Promise<GitHubIssueComment[]> {
  const comments = await api.octokit.paginate(api.octokit.issues.listComments, {
    owner: api.owner,
    repo: api.repo,
    issue_number: api.prNumber,
    per_page: 100,
  })
  return comments as unknown as GitHubIssueComment[]
}

export async function getDangerCommentIDs(api: GitHubAPIClient, dangerID: string): Promise<string[]> {
  const comments = await getPullRequestComments(api)
  const dangerMarker = dangerIDToString(dangerID)
  return comments
    .filter((c) => c.body.includes(dangerMarker))
    .map((c) => c.id)
}

export async function postPRComment(api: GitHubAPIClient, body: string): Promise<any> {
  const { data } = await api.octokit.issues.createComment({
    owner: api.owner,
    repo: api.repo,
    issue_number: api.prNumber,
    body,
  })
  return data
}

export async function updateCommentWithID(api: GitHubAPIClient, commentID: string, body: string): Promise<any> {
  const { data } = await api.octokit.issues.updateComment({
    owner: api.owner,
    repo: api.repo,
    comment_id: parseInt(commentID, 10),
    body,
  })
  return data
}

export async function deleteCommentWithID(api: GitHubAPIClient, commentID: string): Promise<boolean> {
  try {
    await api.octokit.issues.deleteComment({
      owner: api.owner,
      repo: api.repo,
      comment_id: parseInt(commentID, 10),
    })
    return true
  } catch {
    return false
  }
}

// --- Inline Comments (PR Review Comments) ---

export async function getPullRequestInlineComments(api: GitHubAPIClient, dangerID: string): Promise<any[]> {
  const comments = await api.octokit.paginate(api.octokit.pulls.listReviewComments, {
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
    per_page: 100,
  })
  const marker = dangerIDToString(dangerID)
  return comments.filter((c: any) => c.body.includes(marker))
}

export async function postInlinePRComment(
  api: GitHubAPIClient,
  body: string,
  commitId: string,
  path: string,
  line: number
): Promise<any> {
  const { data } = await api.octokit.pulls.createReviewComment({
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
    body,
    commit_id: commitId,
    path,
    line,
  })
  return data
}

export async function postInlinePRReview(
  api: GitHubAPIClient,
  commitId: string,
  comments: Array<{ body: string; path: string; line: number }>
): Promise<any> {
  const { data } = await api.octokit.pulls.createReview({
    owner: api.owner,
    repo: api.repo,
    pull_number: api.prNumber,
    commit_id: commitId,
    event: "COMMENT",
    comments: comments.map((c) => ({
      body: c.body,
      path: c.path,
      line: c.line,
    })),
  })
  return data
}

export async function updateInlinePRComment(api: GitHubAPIClient, body: string, commentId: number): Promise<any> {
  const { data } = await api.octokit.pulls.updateReviewComment({
    owner: api.owner,
    repo: api.repo,
    comment_id: commentId,
    body,
  })
  return data
}

export async function deleteInlineComment(api: GitHubAPIClient, commentId: number): Promise<boolean> {
  try {
    await api.octokit.pulls.deleteReviewComment({
      owner: api.owner,
      repo: api.repo,
      comment_id: commentId,
    })
    return true
  } catch {
    return false
  }
}

// --- Status ---

export async function updateStatus(
  api: GitHubAPIClient,
  passed: boolean | "pending",
  message: string,
  url?: string,
  dangerID?: string,
  commitHash?: string
): Promise<boolean> {
  const sha = commitHash || (await getPullRequestInfo(api)).head.sha
  const state = passed === "pending" ? "pending" : passed ? "success" : "failure"

  try {
    await api.octokit.repos.createCommitStatus({
      owner: api.owner,
      repo: api.repo,
      sha,
      state,
      context: dangerID || "Danger",
      description: message.substring(0, 140),
      target_url: url,
    })
    return true
  } catch {
    return false
  }
}
