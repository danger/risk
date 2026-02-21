import { describe, it, expect } from "vitest"
import { buildGitJSONDSL } from "../../github/diff.ts"
import type { GitHubFile } from "../../github/api.ts"

describe("buildGitJSONDSL", () => {
  it("categorizes added files as created", () => {
    const files: GitHubFile[] = [
      { sha: "a", filename: "new.ts", status: "added", additions: 10, deletions: 0, changes: 10 },
    ]
    const dsl = buildGitJSONDSL(files)
    expect(dsl.created_files).toEqual(["new.ts"])
    expect(dsl.modified_files).toEqual([])
    expect(dsl.deleted_files).toEqual([])
  })

  it("categorizes removed files as deleted", () => {
    const files: GitHubFile[] = [
      { sha: "a", filename: "old.ts", status: "removed", additions: 0, deletions: 5, changes: 5 },
    ]
    const dsl = buildGitJSONDSL(files)
    expect(dsl.deleted_files).toEqual(["old.ts"])
    expect(dsl.created_files).toEqual([])
  })

  it("categorizes modified files", () => {
    const files: GitHubFile[] = [
      { sha: "a", filename: "changed.ts", status: "modified", additions: 3, deletions: 1, changes: 4 },
    ]
    const dsl = buildGitJSONDSL(files)
    expect(dsl.modified_files).toEqual(["changed.ts"])
  })

  it("categorizes renamed files as modified", () => {
    const files: GitHubFile[] = [
      { sha: "a", filename: "new-name.ts", status: "renamed", additions: 0, deletions: 0, changes: 0, previous_filename: "old-name.ts" },
    ]
    const dsl = buildGitJSONDSL(files)
    expect(dsl.modified_files).toEqual(["new-name.ts"])
  })

  it("handles mixed file statuses", () => {
    const files: GitHubFile[] = [
      { sha: "a", filename: "added.ts", status: "added", additions: 10, deletions: 0, changes: 10 },
      { sha: "b", filename: "modified.ts", status: "modified", additions: 5, deletions: 2, changes: 7 },
      { sha: "c", filename: "deleted.ts", status: "removed", additions: 0, deletions: 8, changes: 8 },
    ]
    const dsl = buildGitJSONDSL(files)
    expect(dsl.created_files).toEqual(["added.ts"])
    expect(dsl.modified_files).toEqual(["modified.ts"])
    expect(dsl.deleted_files).toEqual(["deleted.ts"])
  })
})
