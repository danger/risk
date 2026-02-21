import type { GitHubAPIClient } from "./api.ts"
import {
  getPullRequestInfo,
  getPullRequestCommits,
  getPullRequestFiles,
  getPullRequestDiff,
  getReviews,
  getReviewerRequests,
  getIssue,
  getFileContents,
} from "./api.ts"
import type {
  GitHubDSL,
  GitHubJSONDSL,
  GitHubAPIPR,
  GitHubUtilsDSL,
} from "./types.ts"
import type { DangerDSLType, DangerUtilsDSL } from "../dsl/danger-dsl.ts"
import type { GitDSL } from "../dsl/git-dsl.ts"
import { buildGitJSONDSL } from "./diff.ts"
import { buildGitDSL } from "../dsl/git-dsl-builder.ts"

/**
 * Build the full DangerDSLType from GitHub API data.
 */
export async function buildDangerDSL(api: GitHubAPIClient): Promise<DangerDSLType> {
  // Fetch all data in parallel
  const [pr, commits, files, reviews, requestedReviewers, issue, fullDiff] = await Promise.all([
    getPullRequestInfo(api),
    getPullRequestCommits(api),
    getPullRequestFiles(api),
    getReviews(api),
    getReviewerRequests(api),
    getIssue(api),
    getPullRequestDiff(api),
  ])

  const thisPR: GitHubAPIPR = {
    owner: pr.base.repo.owner.login,
    repo: pr.base.repo.name,
    pull_number: pr.number,
    number: pr.number,
  }

  const githubJSON: GitHubJSONDSL = {
    issue,
    pr,
    thisPR,
    commits,
    reviews,
    requested_reviewers: requestedReviewers,
  }

  // Build GitHub Utils
  const githubUtils: GitHubUtilsDSL = buildGitHubUtils(api, pr)

  // Summary markdown storage
  let summaryMarkdown: string | undefined

  const githubDSL: GitHubDSL = {
    ...githubJSON,
    api: api.octokit,
    utils: githubUtils,
    setSummaryMarkdown: (md: string) => {
      summaryMarkdown = md
    },
  }

  // Build Git DSL
  const gitJSON = buildGitJSONDSL(files)
  // Map GitHubCommit[] to GitCommit[] (the inner .commit has the platform-agnostic data)
  const gitCommits = commits.map((c) => ({
    ...c.commit,
    sha: c.sha,
    url: c.url,
  }))
  const gitDSL: GitDSL = buildGitDSL(
    { ...gitJSON, commits: gitCommits },
    fullDiff,
    api,
    pr.base.sha,
    pr.head.sha
  )

  // Build Utils DSL
  const utils: DangerUtilsDSL = {
    href(href: string, text: string): string | null {
      if (!href && !text) return null
      if (!href) return text
      if (!text) return `<a href="${href}">${href}</a>`
      return `<a href="${href}">${text}</a>`
    },
    sentence(array: string[]): string {
      if (array.length === 0) return ""
      if (array.length === 1) return array[0]
      const last = array[array.length - 1]
      const rest = array.slice(0, -1)
      return `${rest.join(", ")} and ${last}`
    },
  }

  const dsl: DangerDSLType = {
    git: gitDSL,
    github: githubDSL,
    utils,
  }

  // Attach getter for summary markdown (used by executor)
  ;(dsl as any)._getSummaryMarkdown = () => summaryMarkdown

  return dsl
}

function buildGitHubUtils(api: GitHubAPIClient, pr: any): GitHubUtilsDSL {
  return {
    fileLinks(paths: string[], useBasename = true, repoSlug?: string, branch?: string): string {
      const slug = repoSlug || pr.head.repo.full_name
      const ref = branch || pr.head.ref
      return paths
        .map((path: string) => {
          const name = useBasename ? path.split("/").pop()! : path
          const href = `https://github.com/${slug}/blob/${ref}/${path}`
          return `<a href="${href}">${name}</a>`
        })
        .join(", ")
    },

    async fileContents(path: string, repoSlug?: string, ref?: string): Promise<string> {
      return getFileContents(api, path, repoSlug, ref)
    },

    async createUpdatedIssueWithID(
      id: string,
      content: string,
      config: { title: string; open: boolean; owner: string; repo: string }
    ): Promise<string> {
      const marker = `<!-- DANGER-ID: ${id} -->`
      const body = `${content}\n\n${marker}`

      const { data: issues } = await api.octokit.issues.listForRepo({
        owner: config.owner,
        repo: config.repo,
        state: "all",
        creator: "app/github-actions",
        per_page: 100,
      })

      const existing = issues.find((i: any) => i.body?.includes(marker))
      if (existing) {
        await api.octokit.issues.update({
          owner: config.owner,
          repo: config.repo,
          issue_number: existing.number,
          body,
          state: config.open ? "open" : "closed",
          title: config.title,
        })
        return existing.html_url!
      }

      const { data: newIssue } = await api.octokit.issues.create({
        owner: config.owner,
        repo: config.repo,
        title: config.title,
        body,
      })
      return newIssue.html_url!
    },

    async createOrAddLabel(
      labelConfig: { name: string; color: string; description: string },
      repoConfig?: { owner: string; repo: string; id: number }
    ): Promise<void> {
      const owner = repoConfig?.owner || pr.base.repo.owner.login
      const repo = repoConfig?.repo || pr.base.repo.name
      const issueNumber = repoConfig?.id || pr.number

      try {
        await api.octokit.issues.createLabel({
          owner, repo,
          name: labelConfig.name,
          color: labelConfig.color,
          description: labelConfig.description,
        })
      } catch {
        // Label may already exist
      }

      await api.octokit.issues.addLabels({
        owner, repo,
        issue_number: issueNumber,
        labels: [labelConfig.name],
      })
    },

    async createOrUpdatePR(
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
    ): Promise<any> {
      const owner = config.owner || pr.base.repo.owner.login
      const repo = config.repo || pr.base.repo.name

      const { data: baseRef } = await api.octokit.git.getRef({
        owner, repo,
        ref: `heads/${config.baseBranch}`,
      })

      const blobs = await Promise.all(
        Object.entries(fileMap).map(async ([path, content]) => {
          const { data } = await api.octokit.git.createBlob({
            owner, repo,
            content: content as string,
            encoding: "utf-8",
          })
          return { path, sha: data.sha, mode: "100644" as const, type: "blob" as const }
        })
      )

      const { data: tree } = await api.octokit.git.createTree({
        owner, repo,
        tree: blobs,
        base_tree: baseRef.object.sha,
      })

      const { data: commit } = await api.octokit.git.createCommit({
        owner, repo,
        message: config.commitMessage,
        tree: tree.sha,
        parents: [baseRef.object.sha],
      })

      try {
        await api.octokit.git.createRef({
          owner, repo,
          ref: `refs/heads/${config.newBranchName}`,
          sha: commit.sha,
        })
      } catch {
        await api.octokit.git.updateRef({
          owner, repo,
          ref: `heads/${config.newBranchName}`,
          sha: commit.sha,
        })
      }

      try {
        const { data: newPR } = await api.octokit.pulls.create({
          owner, repo,
          title: config.title,
          body: config.body,
          head: config.newBranchName,
          base: config.baseBranch,
        })
        return newPR
      } catch {
        const { data: prs } = await api.octokit.pulls.list({
          owner, repo,
          head: `${owner}:${config.newBranchName}`,
          state: "open",
        })
        if (prs.length > 0) {
          const { data: updated } = await api.octokit.pulls.update({
            owner, repo,
            pull_number: prs[0].number,
            title: config.title,
            body: config.body,
          })
          return updated
        }
      }
    },
  }
}
