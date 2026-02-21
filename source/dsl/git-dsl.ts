import type { GitCommit } from "./types.ts"

/** All text diff values will be this shape */
export interface TextDiff {
  /** The value before the PR's applied changes */
  before: string
  /** The value after the PR's applied changes */
  after: string
  /** A string containing the full set of changes */
  diff: string
  /** A string containing just the added lines */
  added: string
  /** A string containing just the removed lines */
  removed: string
}

/** Git diff sliced into chunks */
export interface StructuredDiff {
  /** Git diff chunks */
  chunks: DiffChunk[]
  /** The file path pre-change */
  fromPath: string | undefined
}

/** A chunk of a structured diff */
export interface DiffChunk {
  /** The content header for this chunk */
  content: string
  /** The changes within this chunk */
  changes: DiffChange[]
  /** Old start line */
  oldStart: number
  /** Old number of lines */
  oldLines: number
  /** New start line */
  newStart: number
  /** New number of lines */
  newLines: number
}

/** A single change within a diff chunk */
export interface DiffChange {
  /** The type of change */
  type: "add" | "del" | "normal"
  /** The content of the line */
  content: string
  /** The line number in the new file (for add/normal) */
  ln?: number
  /** The line number in the old file (for del) */
  ln1?: number
  /** The line number in the new file (for normal) */
  ln2?: number
}

/** The results of running a JSON patch */
export interface JSONPatch {
  /** The JSON in a file at the PR merge base */
  before: any
  /** The JSON in a file from the PR submitter */
  after: any
  /** The set of operations to go from one JSON to another JSON */
  diff: JSONPatchOperation[]
}

/** An individual operation inside an rfc6902 JSON Patch */
export interface JSONPatchOperation {
  /** An operation type */
  op: string
  /** The JSON keypath which the operation applies on */
  path: string
  /** The changes applied */
  value: string
}

/** All JSON diff values will be this shape */
export interface JSONDiffValue {
  /** The value before the PR's applied changes */
  before: any
  /** The value after the PR's applied changes */
  after: any
  /** If both before & after are arrays, what was added */
  added?: any[]
  /** If both before & after are arrays, what was removed */
  removed?: any[]
}

/** A map of string keys to JSONDiffValue */
export interface JSONDiff {
  [name: string]: JSONDiffValue
}

/** The shape of the fileMatch response */
export interface GitMatchResult {
  /** Did any file paths match from the git modified list? */
  modified: boolean
  /** Did any file paths match from the git created list? */
  created: boolean
  /** Did any file paths match from the combination of modified and created? */
  edited: boolean
  /** Did any file paths match from the git deleted list? */
  deleted: boolean

  /** Return the list of files that matched from modified */
  getKeyedPaths(): {
    modified: string[]
    created: string[]
    edited: string[]
    deleted: string[]
  }
}

/**
 * The Git-related metadata available inside the Danger DSL (JSON-serializable).
 */
export interface GitJSONDSL {
  /** Filepaths with changes relative to the git root */
  readonly modified_files: string[]
  /** Newly created filepaths relative to the git root */
  readonly created_files: string[]
  /** Removed filepaths relative to the git root */
  readonly deleted_files: string[]
  /** The Git commit metadata */
  readonly commits: GitCommit[]
}

/** The git-specific metadata for a PR */
export interface GitDSL extends GitJSONDSL {
  /** The git commit Danger is comparing from */
  base: string
  /** The git commit Danger is comparing to */
  head: string

  /**
   * A function to match files against glob patterns.
   * Returns an object with booleans for modified/created/edited/deleted.
   *
   * @example
   * const packageJSON = danger.git.fileMatch("package.json")
   * const lockfile = danger.git.fileMatch("yarn.lock")
   *
   * if (packageJSON.modified && !lockfile.modified) {
   *    warn("You might have forgotten to run `yarn`.")
   * }
   */
  fileMatch(...patterns: string[]): GitMatchResult

  /** Offers the diff for a specific file */
  diffForFile(filename: string): Promise<TextDiff | null>

  /** Offers the structured diff for a specific file */
  structuredDiffForFile(filename: string): Promise<StructuredDiff | null>

  /**
   * Provides a JSON patch (rfc6902) between the two versions of a JSON file,
   * returns null if you don't have any changes for the file in the diff.
   */
  JSONPatchForFile(filename: string): Promise<JSONPatch | null>

  /**
   * Provides a simplified JSON diff between the two versions of a JSON file.
   */
  JSONDiffForFile(filename: string): Promise<JSONDiff>

  /**
   * Offers the overall lines of code added/removed in the diff.
   * @param pattern an optional glob pattern to filter files
   */
  linesOfCode(pattern?: string): Promise<number | null>
}
