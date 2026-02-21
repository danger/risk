import parseDiff from "parse-diff"
import type { GitHubFile } from "./api.ts"
import type { GitJSONDSL } from "../dsl/git-dsl.ts"

/**
 * Build a GitJSONDSL from the GitHub PR files list.
 */
export function buildGitJSONDSL(files: GitHubFile[]): Pick<GitJSONDSL, "modified_files" | "created_files" | "deleted_files"> {
  const modified_files: string[] = []
  const created_files: string[] = []
  const deleted_files: string[] = []

  for (const file of files) {
    switch (file.status) {
      case "added":
        created_files.push(file.filename)
        break
      case "removed":
        deleted_files.push(file.filename)
        break
      case "modified":
      case "changed":
        modified_files.push(file.filename)
        break
      case "renamed":
        // Renamed files appear as modified
        modified_files.push(file.filename)
        break
    }
  }

  return { modified_files, created_files, deleted_files }
}

/** Parse a unified diff string into structured chunks */
export function parseUnifiedDiff(diffString: string) {
  return parseDiff(diffString)
}

/**
 * Extract the diff for a specific file from a full PR diff.
 */
export function diffForFileFromFullDiff(fullDiff: string, filename: string) {
  const parsed = parseDiff(fullDiff)
  return parsed.find((f) => f.to === filename || f.from === filename)
}
