import { describe, it, expect, vi } from "vitest"
import { updateOrCreateComment, deleteMainComment, updateCommitStatus } from "../../github/commenter.ts"
import { createMockAPI, loadFixture } from "../fixtures/mockGitHubAPI.ts"
import { emptyResults } from "../../dsl/results.ts"
import { dangerIDToString } from "../../github/template.ts"

describe("updateOrCreateComment", () => {
  it("creates a new comment when no existing comment exists", async () => {
    const api = createMockAPI()
    // No existing danger comments
    api.octokit.paginate = vi.fn().mockResolvedValue([])

    const results = { ...emptyResults(), warnings: [{ message: "Watch out!" }] }
    const options = { dangerID: "test-danger" }

    const url = await updateOrCreateComment(api, options, results)
    expect(url).toBeTruthy()
    expect(api.octokit.issues.createComment).toHaveBeenCalled()
  })

  it("updates an existing comment when one exists", async () => {
    const api = createMockAPI()
    const dangerMarker = dangerIDToString("test-danger")
    // Return a comment that contains the danger marker
    api.octokit.paginate = vi.fn().mockResolvedValue([
      { id: "42", body: `Previous results ${dangerMarker}`, user: { login: "bot" } },
    ])

    const results = { ...emptyResults(), warnings: [{ message: "Updated warning" }] }
    const options = { dangerID: "test-danger" }

    const url = await updateOrCreateComment(api, options, results)
    expect(url).toBeTruthy()
    expect(api.octokit.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 42 })
    )
  })

  it("deletes the comment when results are empty and a comment exists", async () => {
    const api = createMockAPI()
    const dangerMarker = dangerIDToString("test-danger")
    api.octokit.paginate = vi.fn().mockResolvedValue([
      { id: "42", body: `Previous results ${dangerMarker}`, user: { login: "bot" } },
    ])

    const results = emptyResults()
    const options = { dangerID: "test-danger" }

    const url = await updateOrCreateComment(api, options, results)
    expect(url).toBeUndefined()
    expect(api.octokit.issues.deleteComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 42 })
    )
  })

  it("does nothing when results are empty and no comment exists", async () => {
    const api = createMockAPI()
    api.octokit.paginate = vi.fn().mockResolvedValue([])

    const results = emptyResults()
    const options = { dangerID: "test-danger" }

    const url = await updateOrCreateComment(api, options, results)
    expect(url).toBeUndefined()
    expect(api.octokit.issues.createComment).not.toHaveBeenCalled()
    expect(api.octokit.issues.updateComment).not.toHaveBeenCalled()
  })

  it("always creates a new comment when newComment option is set", async () => {
    const api = createMockAPI()
    api.octokit.paginate = vi.fn().mockResolvedValue([])

    const results = { ...emptyResults(), fails: [{ message: "Failure!" }] }
    const options = { dangerID: "test-danger", newComment: true }

    const url = await updateOrCreateComment(api, options, results)
    expect(url).toBeTruthy()
    expect(api.octokit.issues.createComment).toHaveBeenCalled()
    expect(api.octokit.issues.updateComment).not.toHaveBeenCalled()
  })

  it("does not create comment when newComment is set but results are empty", async () => {
    const api = createMockAPI()

    const results = emptyResults()
    const options = { dangerID: "test-danger", newComment: true }

    const url = await updateOrCreateComment(api, options, results)
    expect(url).toBeUndefined()
    expect(api.octokit.issues.createComment).not.toHaveBeenCalled()
  })

  it("removes previous comments when removePreviousComments is set", async () => {
    const api = createMockAPI()
    const dangerMarker = dangerIDToString("test-danger")
    api.octokit.paginate = vi.fn()
      .mockResolvedValueOnce([ // First call: deleteMainComment lookups
        { id: "10", body: `Old ${dangerMarker}`, user: { login: "bot" } },
        { id: "20", body: `Old2 ${dangerMarker}`, user: { login: "bot" } },
      ])
      .mockResolvedValueOnce([]) // Second call: getDangerCommentIDs in main flow

    const results = { ...emptyResults(), warnings: [{ message: "New warning" }] }
    const options = { dangerID: "test-danger", removePreviousComments: true }

    await updateOrCreateComment(api, options, results)
    // Should have deleted the previous comments
    expect(api.octokit.issues.deleteComment).toHaveBeenCalledTimes(2)
    // Should have created a new one
    expect(api.octokit.issues.createComment).toHaveBeenCalled()
  })
})

describe("deleteMainComment", () => {
  it("deletes all danger comments", async () => {
    const api = createMockAPI()
    const dangerMarker = dangerIDToString("test-danger")
    api.octokit.paginate = vi.fn().mockResolvedValue([
      { id: "10", body: `Comment ${dangerMarker}`, user: { login: "bot" } },
      { id: "20", body: `Another ${dangerMarker}`, user: { login: "bot" } },
    ])

    const result = await deleteMainComment(api, "test-danger")
    expect(result).toBe(true)
    expect(api.octokit.issues.deleteComment).toHaveBeenCalledTimes(2)
  })

  it("returns false when no comments to delete", async () => {
    const api = createMockAPI()
    api.octokit.paginate = vi.fn().mockResolvedValue([])

    const result = await deleteMainComment(api, "test-danger")
    expect(result).toBe(false)
  })
})

describe("updateCommitStatus", () => {
  it("sets success when no fails", async () => {
    const api = createMockAPI()
    const results = { ...emptyResults(), warnings: [{ message: "warn" }] }

    await updateCommitStatus(api, results, "https://example.com", "Danger")
    expect(api.octokit.repos.createCommitStatus).toHaveBeenCalledWith(
      expect.objectContaining({ state: "success" })
    )
  })

  it("sets failure when there are fails", async () => {
    const api = createMockAPI()
    const results = { ...emptyResults(), fails: [{ message: "fail" }] }

    await updateCommitStatus(api, results, "https://example.com", "Danger")
    expect(api.octokit.repos.createCommitStatus).toHaveBeenCalledWith(
      expect.objectContaining({ state: "failure" })
    )
  })

  it("uses the provided dangerID as context", async () => {
    const api = createMockAPI()
    const results = emptyResults()

    await updateCommitStatus(api, results, undefined, "my-danger-run")
    expect(api.octokit.repos.createCommitStatus).toHaveBeenCalledWith(
      expect.objectContaining({ context: "my-danger-run" })
    )
  })

  it("uses the provided commit hash", async () => {
    const api = createMockAPI()
    const results = emptyResults()

    await updateCommitStatus(api, results, undefined, "Danger", "abc123")
    expect(api.octokit.repos.createCommitStatus).toHaveBeenCalledWith(
      expect.objectContaining({ sha: "abc123" })
    )
  })
})
