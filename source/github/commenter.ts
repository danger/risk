import type { GitHubAPIClient } from "./api.ts"
import {
  getDangerCommentIDs,
  postPRComment,
  updateCommentWithID,
  deleteCommentWithID,
  updateStatus,
} from "./api.ts"
import type { DangerResults } from "../dsl/results.ts"
import { isEmptyResults } from "../dsl/results.ts"
import { template } from "./template.ts"

export interface CommenterOptions {
  /** The unique ID for this danger run */
  dangerID: string
  /** Whether to always create a new comment (vs update existing) */
  newComment?: boolean
  /** Whether to remove all previous comments and create fresh */
  removePreviousComments?: boolean
}

/**
 * Post or update results as a comment on the PR.
 * Returns the comment URL if posted, or undefined if the comment was deleted.
 */
export async function updateOrCreateComment(
  api: GitHubAPIClient,
  options: CommenterOptions,
  results: DangerResults,
  commitID?: string
): Promise<string | undefined> {
  const comment = template(options.dangerID, results, commitID)
  const empty = isEmptyResults(results)

  if (options.removePreviousComments) {
    await deleteMainComment(api, options.dangerID)
  }

  if (options.newComment) {
    if (!empty) {
      const data = await postPRComment(api, comment)
      return data.html_url
    }
    return undefined
  }

  const existingIDs = await getDangerCommentIDs(api, options.dangerID)

  if (existingIDs.length > 0) {
    if (empty) {
      await deleteCommentWithID(api, existingIDs[0])
      return undefined
    }
    const data = await updateCommentWithID(api, existingIDs[0], comment)
    return data.html_url
  }

  if (!empty) {
    const data = await postPRComment(api, comment)
    return data.html_url
  }

  return undefined
}

/**
 * Delete the main Danger comment for this dangerID.
 */
export async function deleteMainComment(
  api: GitHubAPIClient,
  dangerID: string
): Promise<boolean> {
  const existingIDs = await getDangerCommentIDs(api, dangerID)
  let deleted = false
  for (const id of existingIDs) {
    await deleteCommentWithID(api, id)
    deleted = true
  }
  return deleted
}

/**
 * Update the commit status on the PR.
 */
export async function updateCommitStatus(
  api: GitHubAPIClient,
  results: DangerResults,
  commentURL?: string,
  dangerID?: string,
  commitHash?: string
): Promise<boolean> {
  const hasFails = results.fails.length > 0
  const message = hasFails
    ? "Found some issues. Don't worry, everything is fixable."
    : "All good!"

  return updateStatus(
    api,
    !hasFails,
    message,
    commentURL,
    dangerID || "Danger",
    commitHash
  )
}
