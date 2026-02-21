import type { DangerDSLType } from "./dsl/danger-dsl.ts"
import type { DangerRuntimeContainer } from "./dsl/results.ts"
import type { MarkdownString } from "./dsl/types.ts"

// Re-export all types that Dangerfile authors might need
export type { DangerDSLType, DangerUtilsDSL } from "./dsl/danger-dsl.ts"
export type { DangerResults, DangerRuntimeContainer } from "./dsl/results.ts"
export type { MarkdownString, Violation, GitCommit, GitCommitAuthor } from "./dsl/types.ts"
export type {
  GitDSL,
  GitJSONDSL,
  TextDiff,
  StructuredDiff,
  JSONPatch,
  JSONDiff,
  GitMatchResult,
} from "./dsl/git-dsl.ts"
export type {
  GitHubDSL,
  GitHubPRDSL,
  GitHubUser,
  GitHubRepo,
  GitHubMergeRef,
  GitHubCommit,
  GitHubReview,
  GitHubReviewers,
  GitHubIssue,
  GitHubIssueLabel,
  GitHubIssueComment,
  GitHubAPIPR,
  GitHubUtilsDSL,
} from "./github/types.ts"

// --- Singleton state, populated by the executor before Dangerfile runs ---

/**
 * The root Danger object. Contains all of the metadata you
 * will be looking for in order to generate useful rules.
 *
 * Populated before your Dangerfile executes.
 */
export let danger: DangerDSLType = undefined as any

/**
 * The current results container. You can introspect this to see
 * whether a build has already failed.
 */
export let results: DangerRuntimeContainer = {
  fails: [],
  warnings: [],
  messages: [],
  markdowns: [],
  scheduled: [],
}

// --- Context functions that Dangerfiles call ---

/**
 * Highlights critical issues. Message is shown inside a HTML table.
 *
 * @param message the String to output
 * @param file a file which this message should be attached to
 * @param line the line which this message should be attached to
 */
export function fail(message: MarkdownString, file?: string, line?: number): void {
  results.fails.push({ message, file, line })
}

/**
 * Highlights low-priority issues. Message is shown inside a HTML table.
 *
 * @param message the String to output
 * @param file a file which this message should be attached to
 * @param line the line which this message should be attached to
 */
export function warn(message: MarkdownString, file?: string, line?: number): void {
  results.warnings.push({ message, file, line })
}

/**
 * Adds a message to the Danger table.
 *
 * @param message the String to output
 * @param fileOrOpts a file path, or an options object with file/line/icon
 * @param line the line which this message should be attached to
 */
export function message(
  msg: MarkdownString,
  fileOrOpts?: string | { file?: string; line?: number; icon?: MarkdownString },
  line?: number
): void {
  let file: string | undefined
  let resolvedLine: number | undefined
  let icon: MarkdownString | undefined

  if (typeof fileOrOpts === "string") {
    file = fileOrOpts
    resolvedLine = line
  } else if (typeof fileOrOpts === "object") {
    ;({ file, line: resolvedLine, icon } = fileOrOpts)
  }

  results.messages.push({ message: msg, file, line: resolvedLine, icon })
}

/**
 * Adds raw markdown into the Danger comment, under the table.
 *
 * @param message the String to output
 * @param file a file which this message should be attached to
 * @param line the line which this message should be attached to
 */
export function markdown(msg: MarkdownString, file?: string, line?: number): void {
  results.markdowns.push({ message: msg, file, line })
}

/**
 * Register async code to run during Danger evaluation.
 * Use this when you need to do async work in a Dangerfile.
 *
 * @param asyncFunction the function to run asynchronously
 */
export function schedule(fn: Promise<any> | Promise<void> | (() => Promise<any>)): void {
  results.scheduled?.push(fn)
}

// --- Internal functions called by the executor ---

/** @internal Set the danger DSL singleton */
export function _setDangerDSL(dsl: DangerDSLType): void {
  danger = dsl
}

/** @internal Reset the results container */
export function _resetResults(): void {
  results = {
    fails: [],
    warnings: [],
    messages: [],
    markdowns: [],
    scheduled: [],
  }
}

/** @internal Get the current results */
export function _getResults(): DangerRuntimeContainer {
  return results
}

/** @internal Inject all exports into globalThis for backwards compat */
export function _injectGlobals(): void {
  const g = globalThis as any
  g.danger = danger
  g.fail = fail
  g.warn = warn
  g.message = message
  g.markdown = markdown
  g.schedule = schedule
  g.results = results
}
