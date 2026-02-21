import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { createGitHubActionsCISource } from "../../ci/github-actions.ts"
import { readFileSync } from "node:fs"

vi.mock("node:fs", () => ({
  readFileSync: vi.fn(),
}))

const mockedReadFileSync = vi.mocked(readFileSync)

describe("createGitHubActionsCISource", () => {
  it("returns undefined when GITHUB_WORKFLOW is not set", () => {
    expect(createGitHubActionsCISource({})).toBeUndefined()
  })

  it("returns undefined when GITHUB_EVENT_PATH is not set", () => {
    expect(createGitHubActionsCISource({ GITHUB_WORKFLOW: "CI" })).toBeUndefined()
  })

  it("returns undefined when event has no pull_request", () => {
    mockedReadFileSync.mockReturnValue(JSON.stringify({ action: "push" }))
    const result = createGitHubActionsCISource({
      GITHUB_WORKFLOW: "CI",
      GITHUB_EVENT_PATH: "/tmp/event.json",
    })
    expect(result).toBeUndefined()
  })

  it("returns a CI source for a PR event", () => {
    const event = {
      pull_request: {
        number: 42,
        head: { sha: "abc123" },
        base: { repo: { full_name: "owner/repo" } },
      },
    }
    mockedReadFileSync.mockReturnValue(JSON.stringify(event))

    const result = createGitHubActionsCISource({
      GITHUB_WORKFLOW: "CI",
      GITHUB_EVENT_PATH: "/tmp/event.json",
    })

    expect(result).toBeDefined()
    expect(result!.name).toBe("GitHub Actions")
    expect(result!.isCI).toBe(true)
    expect(result!.isPR).toBe(true)
    expect(result!.repoSlug).toBe("owner/repo")
    expect(result!.pullRequestID).toBe("42")
    expect(result!.commitHash).toBe("abc123")
  })

  it("builds a CI run URL when env vars are present", () => {
    const event = {
      pull_request: {
        number: 1,
        head: { sha: "def456" },
        base: { repo: { full_name: "org/project" } },
      },
    }
    mockedReadFileSync.mockReturnValue(JSON.stringify(event))

    const result = createGitHubActionsCISource({
      GITHUB_WORKFLOW: "CI",
      GITHUB_EVENT_PATH: "/tmp/event.json",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "org/project",
      GITHUB_RUN_ID: "12345",
    })

    expect(result!.ciRunURL).toBe("https://github.com/org/project/actions/runs/12345")
  })
})
