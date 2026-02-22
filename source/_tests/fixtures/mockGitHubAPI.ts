import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { vi } from "vitest"
import type { GitHubAPIClient } from "../../github/api.ts"

const fixturesDir = resolve(import.meta.dirname, ".")

/** Load a JSON fixture file */
export function loadFixture(name: string): any {
  const raw = readFileSync(resolve(fixturesDir, name), "utf-8")
  return JSON.parse(raw)
}

/** Load a text fixture file */
export function loadTextFixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), "utf-8").replace(/\r/g, "")
}

/**
 * Create a mock GitHubAPIClient that returns fixtured data.
 * All Octokit methods are mocked with vi.fn().
 */
export function createMockAPI(): GitHubAPIClient {
  const pr = loadFixture("github_pr.json")
  const commits = loadFixture("github_commits.json")
  const issue = loadFixture("github_issue.json")
  const reviews = loadFixture("reviews.json")
  const requestedReviewers = loadFixture("requested_reviewers.json")
  const diff = loadTextFixture("github_diff.diff")
  const comments = loadFixture("github_comments.json")

  // Build a files list from the diff (matching what the GitHub API returns)
  const files = buildFilesFromPR(pr)

  const octokit = {
    pulls: {
      get: vi.fn().mockImplementation(({ mediaType }: any = {}) => {
        if (mediaType?.format === "diff") {
          return Promise.resolve({ data: diff })
        }
        return Promise.resolve({ data: pr })
      }),
      listCommits: vi.fn(),
      listFiles: vi.fn(),
      listReviews: vi.fn(),
      listRequestedReviewers: vi.fn().mockResolvedValue({
        data: { users: requestedReviewers, teams: [] },
      }),
      listReviewComments: vi.fn(),
      createReviewComment: vi.fn().mockResolvedValue({ data: {} }),
      createReview: vi.fn().mockResolvedValue({ data: {} }),
      updateReviewComment: vi.fn().mockResolvedValue({ data: {} }),
      deleteReviewComment: vi.fn().mockResolvedValue({}),
    },
    issues: {
      get: vi.fn().mockResolvedValue({ data: issue }),
      listComments: vi.fn(),
      createComment: vi.fn().mockResolvedValue({
        data: { id: 999, html_url: "https://github.com/artsy/emission/pull/327#issuecomment-999" },
      }),
      updateComment: vi.fn().mockResolvedValue({
        data: { id: 999, html_url: "https://github.com/artsy/emission/pull/327#issuecomment-999" },
      }),
      deleteComment: vi.fn().mockResolvedValue({}),
    },
    repos: {
      getContent: vi.fn().mockImplementation(({ path, ref }: any) => {
        // Only return fixture content for known files (tsconfig.json)
        if (path === "tsconfig.json") {
          try {
            const fixture = loadFixture(`static_file.${ref}.json`)
            return Promise.resolve(fixture)
          } catch {
            // fall through
          }
        }
        return Promise.resolve({ data: { content: "", encoding: "base64" } })
      }),
      createCommitStatus: vi.fn().mockResolvedValue({}),
    },
    paginate: vi.fn().mockImplementation((method: any, params: any) => {
      if (method === octokit.pulls.listCommits) return Promise.resolve(commits)
      if (method === octokit.pulls.listFiles) return Promise.resolve(files)
      if (method === octokit.pulls.listReviews) return Promise.resolve(reviews)
      if (method === octokit.pulls.listReviewComments) return Promise.resolve([])
      if (method === octokit.issues.listComments) return Promise.resolve(comments)
      return Promise.resolve([])
    }),
  } as any

  return {
    octokit,
    owner: "artsy",
    repo: "emission",
    prNumber: 327,
  }
}

/**
 * Build a simplified files array representing the PR changes.
 * Derived from the diff fixture.
 */
function buildFilesFromPR(_pr: any): any[] {
  return [
    { sha: "1", filename: "CHANGELOG.md", status: "modified", additions: 1, deletions: 0, changes: 1 },
    { sha: "2", filename: "data/schema.graphql", status: "modified", additions: 40, deletions: 0, changes: 40 },
    { sha: "3", filename: "data/schema.json", status: "modified", additions: 448, deletions: 38, changes: 486 },
    { sha: "4", filename: "externals/metaphysics", status: "modified", additions: 1, deletions: 1, changes: 2 },
    { sha: "5", filename: "lib/__mocks__/react-relay.js", status: "modified", additions: 3, deletions: 1, changes: 4 },
    { sha: "6", filename: "lib/components/artist/about.js", status: "modified", additions: 1, deletions: 1, changes: 2 },
    { sha: "7", filename: "lib/components/gene/about.js", status: "added", additions: 30, deletions: 0, changes: 30 },
    { sha: "8", filename: "lib/components/gene/biography.js", status: "added", additions: 32, deletions: 0, changes: 32 },
    { sha: "9", filename: "lib/components/gene/header.js", status: "modified", additions: 16, deletions: 8, changes: 24 },
    { sha: "10", filename: "lib/components/related_artists/index.js", status: "added", additions: 51, deletions: 0, changes: 51 },
    { sha: "11", filename: "lib/components/related_artists/related_artist.js", status: "added", additions: 43, deletions: 0, changes: 43 },
    { sha: "12", filename: "lib/components/artist/related_artists/index.js", status: "removed", additions: 0, deletions: 49, changes: 49 },
    { sha: "13", filename: "lib/components/artist/related_artists/related_artist.js", status: "removed", additions: 0, deletions: 42, changes: 42 },
    { sha: "14", filename: "lib/components/gene/about_gene.js", status: "removed", additions: 0, deletions: 25, changes: 25 },
    { sha: "15", filename: "lib/containers/__tests__/__snapshots__/gene-tests.js.snap", status: "modified", additions: 72, deletions: 14, changes: 86 },
    { sha: "16", filename: "lib/containers/__tests__/gene-tests.js", status: "modified", additions: 42, deletions: 6, changes: 48 },
    { sha: "17", filename: "lib/containers/gene.js", status: "modified", additions: 60, deletions: 15, changes: 75 },
    { sha: "18", filename: "tsconfig.json", status: "modified", additions: 2, deletions: 1, changes: 3 },
  ]
}
