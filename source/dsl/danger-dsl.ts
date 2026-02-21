import type { GitDSL } from "./git-dsl.ts"
import type { GitHubDSL } from "../github/types.ts"

/**
 * The Danger Utils DSL contains utility functions
 * that are specific to universal Danger use-cases.
 */
export interface DangerUtilsDSL {
  /**
   * Creates a link using HTML.
   *
   * If `href` and `text` are falsy, null is returned.
   * If `href` is falsy and `text` is truthy, `text` is returned.
   * If `href` is truthy and `text` is falsy, an <a> tag is returned with `href` as its href and text value.
   * Otherwise, an <a> tag is returned with the `href` and `text` inserted as expected.
   */
  href(href: string, text: string): string | null

  /**
   * Converts an array of strings into a sentence.
   */
  sentence(array: string[]): string
}

/**
 * The Danger DSL provides the metadata for introspection
 * in order to create your own rules.
 */
export interface DangerDSLType {
  /** Details specific to the git changes within the code changes */
  readonly git: GitDSL
  /**
   * The GitHub metadata. This covers things like PR info,
   * comments and reviews on the PR, label metadata, commits with
   * GitHub user identities and some useful utility functions
   * for displaying links to files.
   *
   * Provides an authenticated API so you can work directly
   * with the GitHub API via `danger.github.api` (an @octokit/rest instance).
   */
  readonly github: GitHubDSL
  /**
   * Functions which are globally useful in most Dangerfiles. Right
   * now, these functions are around making sentences of arrays, or
   * for making href links easily.
   */
  readonly utils: DangerUtilsDSL
}
