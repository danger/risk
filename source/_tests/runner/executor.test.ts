import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { executeDanger, type ExecutorOptions } from "../../runner/executor.ts"
import { createMockAPI } from "../fixtures/mockGitHubAPI.ts"
import type { CISource } from "../../ci/ci-source.ts"

// Mock the modules that executeDanger depends on
vi.mock("../../github/api.ts", async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    createGitHubAPI: vi.fn(),
  }
})

vi.mock("../../github/github.ts", async (importOriginal) => {
  const actual = await importOriginal<any>()
  return {
    ...actual,
    buildDangerDSL: vi.fn(),
  }
})

vi.mock("../../github/commenter.ts", () => ({
  updateOrCreateComment: vi.fn().mockResolvedValue("https://github.com/test/pr#comment-1"),
  updateCommitStatus: vi.fn().mockResolvedValue(true),
}))

vi.mock("../../runner/dangerfile.ts", () => ({
  resolveDangerfilePath: vi.fn().mockReturnValue("/fake/dangerfile.ts"),
  runDangerfile: vi.fn().mockResolvedValue({
    fails: [],
    warnings: [],
    messages: [],
    markdowns: [],
    scheduled: [],
  }),
}))

import { createGitHubAPI } from "../../github/api.ts"
import { buildDangerDSL } from "../../github/github.ts"
import { updateOrCreateComment, updateCommitStatus } from "../../github/commenter.ts"
import { resolveDangerfilePath, runDangerfile } from "../../runner/dangerfile.ts"

const defaultOptions: ExecutorOptions = {
  dangerID: "test-danger",
  textOnly: false,
  failOnErrors: false,
  verbose: false,
  noPublishCheck: false,
  newComment: false,
  removePreviousComments: false,
}

const fakeCISource: CISource = {
  name: "Fake CI",
  isCI: true,
  isPR: true,
  repoSlug: "artsy/emission",
  pullRequestID: "327",
  commitHash: "abc123",
}

describe("executeDanger", () => {
  let mockAPI: ReturnType<typeof createMockAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAPI = createMockAPI()
    vi.mocked(createGitHubAPI).mockReturnValue(mockAPI)
    vi.mocked(buildDangerDSL).mockResolvedValue({
      git: { modified_files: [], created_files: [], deleted_files: [], commits: [], base: "base", head: "head" } as any,
      github: { pr: { number: 327 }, setSummaryMarkdown: vi.fn() } as any,
      utils: { href: vi.fn(), sentence: vi.fn() },
    } as any)
    // Reset exitCode
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = undefined
  })

  it("creates a GitHub API client", async () => {
    await executeDanger(fakeCISource, "TOKEN", defaultOptions)

    expect(createGitHubAPI).toHaveBeenCalledWith(
      { repoSlug: "artsy/emission", pullRequestID: "327" },
      "TOKEN",
      undefined
    )
  })

  it("builds the Danger DSL", async () => {
    await executeDanger(fakeCISource, "TOKEN", defaultOptions)

    expect(buildDangerDSL).toHaveBeenCalledWith(mockAPI)
  })

  it("resolves and runs the dangerfile", async () => {
    await executeDanger(fakeCISource, "TOKEN", defaultOptions)

    expect(resolveDangerfilePath).toHaveBeenCalled()
    expect(runDangerfile).toHaveBeenCalledWith("/fake/dangerfile.ts")
  })

  it("posts results to GitHub", async () => {
    await executeDanger(fakeCISource, "TOKEN", defaultOptions)

    expect(updateOrCreateComment).toHaveBeenCalled()
    expect(updateCommitStatus).toHaveBeenCalled()
  })

  it("passes commenter options through", async () => {
    const options = {
      ...defaultOptions,
      newComment: true,
      removePreviousComments: true,
      dangerID: "custom-id",
    }

    await executeDanger(fakeCISource, "TOKEN", options)

    expect(updateOrCreateComment).toHaveBeenCalledWith(
      mockAPI,
      expect.objectContaining({
        dangerID: "custom-id",
        newComment: true,
        removePreviousComments: true,
      }),
      expect.anything(),
      fakeCISource.commitHash
    )
  })

  it("does not post commit status when noPublishCheck is true", async () => {
    const options = { ...defaultOptions, noPublishCheck: true }
    await executeDanger(fakeCISource, "TOKEN", options)

    expect(updateOrCreateComment).toHaveBeenCalled()
    expect(updateCommitStatus).not.toHaveBeenCalled()
  })

  it("sets exitCode to 1 when failOnErrors is true and there are fails", async () => {
    vi.mocked(runDangerfile).mockResolvedValueOnce({
      fails: [{ message: "Something failed" }],
      warnings: [],
      messages: [],
      markdowns: [],
      scheduled: [],
    })

    const options = { ...defaultOptions, failOnErrors: true }
    await executeDanger(fakeCISource, "TOKEN", options)

    expect(process.exitCode).toEqual(1)
  })

  it("does not set exitCode when failOnErrors is false and there are fails", async () => {
    vi.mocked(runDangerfile).mockResolvedValueOnce({
      fails: [{ message: "Something failed" }],
      warnings: [],
      messages: [],
      markdowns: [],
      scheduled: [],
    })

    await executeDanger(fakeCISource, "TOKEN", defaultOptions)

    expect(process.exitCode).not.toEqual(1)
  })

  it("handles dangerfile execution errors gracefully", async () => {
    vi.mocked(runDangerfile).mockRejectedValueOnce(new Error("Syntax error in dangerfile"))

    await executeDanger(fakeCISource, "TOKEN", defaultOptions)

    // Should still post results (with the error as a fail)
    expect(updateOrCreateComment).toHaveBeenCalledWith(
      mockAPI,
      expect.anything(),
      expect.objectContaining({
        fails: [expect.objectContaining({ message: expect.stringContaining("Syntax error") })],
      }),
      expect.anything()
    )
  })

  it("prints to stdout instead of posting when textOnly is true", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    vi.mocked(runDangerfile).mockResolvedValueOnce({
      fails: [],
      warnings: [{ message: "A warning" }],
      messages: [],
      markdowns: [],
      scheduled: [],
    })

    const options = { ...defaultOptions, textOnly: true }
    await executeDanger(fakeCISource, "TOKEN", options)

    expect(updateOrCreateComment).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it("exits with error when no dangerfile is found", async () => {
    vi.mocked(resolveDangerfilePath).mockReturnValueOnce(undefined)
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

    await executeDanger(fakeCISource, "TOKEN", defaultOptions)

    expect(process.exitCode).toEqual(1)
    expect(runDangerfile).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it("passes baseURL to createGitHubAPI", async () => {
    await executeDanger(fakeCISource, "TOKEN", defaultOptions, "https://ghe.example.com/api/v3")

    expect(createGitHubAPI).toHaveBeenCalledWith(
      expect.anything(),
      "TOKEN",
      "https://ghe.example.com/api/v3"
    )
  })
})
