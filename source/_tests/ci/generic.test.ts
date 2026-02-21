import { describe, it, expect } from "vitest"
import { createGenericCISource } from "../../ci/generic.ts"

describe("createGenericCISource", () => {
  it("returns undefined when no token is set", () => {
    expect(createGenericCISource({})).toBeUndefined()
  })

  it("returns undefined when token exists but no PR info", () => {
    expect(createGenericCISource({ DANGER_GITHUB_API_TOKEN: "tok" })).toBeUndefined()
  })

  it("detects from DANGER_PR_URL", () => {
    const result = createGenericCISource({
      DANGER_GITHUB_API_TOKEN: "tok",
      DANGER_PR_URL: "https://github.com/owner/repo/pull/123",
    })
    expect(result).toBeDefined()
    expect(result!.repoSlug).toBe("owner/repo")
    expect(result!.pullRequestID).toBe("123")
  })

  it("detects from DANGER_REPO_SLUG + DANGER_PR_ID", () => {
    const result = createGenericCISource({
      GITHUB_TOKEN: "tok",
      DANGER_REPO_SLUG: "org/project",
      DANGER_PR_ID: "42",
    })
    expect(result).toBeDefined()
    expect(result!.repoSlug).toBe("org/project")
    expect(result!.pullRequestID).toBe("42")
  })

  it("includes commit hash when available", () => {
    const result = createGenericCISource({
      DANGER_GITHUB_API_TOKEN: "tok",
      DANGER_PR_URL: "https://github.com/owner/repo/pull/1",
      DANGER_COMMIT_SHA: "abc123",
    })
    expect(result!.commitHash).toBe("abc123")
  })
})
