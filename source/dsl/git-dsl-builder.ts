import picomatch from "picomatch"
import type { GitHubAPIClient } from "../github/api.ts"
import { getFileContents } from "../github/api.ts"
import type {
  GitDSL,
  GitJSONDSL,
  GitMatchResult,
  TextDiff,
  StructuredDiff,
  JSONPatch,
  JSONDiff,
  JSONDiffValue,
} from "./git-dsl.ts"
import { diffForFileFromFullDiff } from "../github/diff.ts"

/**
 * Build a full GitDSL from JSON data + API access.
 */
export function buildGitDSL(
  jsonDSL: GitJSONDSL,
  fullDiff: string,
  api: GitHubAPIClient,
  baseSHA: string,
  headSHA: string
): GitDSL {
  const allFiles = [
    ...jsonDSL.modified_files,
    ...jsonDSL.created_files,
    ...jsonDSL.deleted_files,
  ]

  return {
    ...jsonDSL,
    base: baseSHA,
    head: headSHA,

    fileMatch(...patterns: string[]): GitMatchResult {
      const isMatch = picomatch(patterns)

      const modified = jsonDSL.modified_files.filter(isMatch)
      const created = jsonDSL.created_files.filter(isMatch)
      const deleted = jsonDSL.deleted_files.filter(isMatch)
      const edited = [...modified, ...created]

      return {
        modified: modified.length > 0,
        created: created.length > 0,
        edited: edited.length > 0,
        deleted: deleted.length > 0,
        getKeyedPaths() {
          return { modified, created, edited, deleted }
        },
      }
    },

    async diffForFile(filename: string): Promise<TextDiff | null> {
      const fileDiff = diffForFileFromFullDiff(fullDiff, filename)
      if (!fileDiff) return null

      const chunks = fileDiff.chunks || []
      const added: string[] = []
      const removed: string[] = []

      for (const chunk of chunks) {
        for (const change of chunk.changes) {
          if (change.type === "add") {
            added.push(change.content.slice(1)) // Remove leading +
          } else if (change.type === "del") {
            removed.push(change.content.slice(1)) // Remove leading -
          }
        }
      }

      // Get before/after file contents
      const [before, after] = await Promise.all([
        filename === fileDiff.from
          ? getFileContents(api, filename, undefined, baseSHA)
          : Promise.resolve(""),
        filename === fileDiff.to
          ? getFileContents(api, filename, undefined, headSHA)
          : Promise.resolve(""),
      ])

      return {
        before,
        after,
        diff: chunks.map((c) => c.changes.map((ch) => ch.content).join("\n")).join("\n"),
        added: added.join("\n"),
        removed: removed.join("\n"),
      }
    },

    async structuredDiffForFile(filename: string): Promise<StructuredDiff | null> {
      const fileDiff = diffForFileFromFullDiff(fullDiff, filename)
      if (!fileDiff) return null

      return {
        chunks: fileDiff.chunks.map((chunk) => ({
          content: chunk.content,
          changes: chunk.changes.map((change) => ({
            type: change.type === "add" ? "add" as const
              : change.type === "del" ? "del" as const
              : "normal" as const,
            content: change.content,
            ln: (change as any).ln,
            ln1: (change as any).ln1,
            ln2: (change as any).ln2,
          })),
          oldStart: chunk.oldStart,
          oldLines: chunk.oldLines,
          newStart: chunk.newStart,
          newLines: chunk.newLines,
        })),
        fromPath: fileDiff.from,
      }
    },

    async JSONPatchForFile(filename: string): Promise<JSONPatch | null> {
      if (!allFiles.includes(filename)) return null

      const [before, after] = await Promise.all([
        getFileContents(api, filename, undefined, baseSHA),
        getFileContents(api, filename, undefined, headSHA),
      ])

      try {
        const beforeJSON = before ? JSON.parse(before) : {}
        const afterJSON = after ? JSON.parse(after) : {}
        const diff = generateJSONPatch(beforeJSON, afterJSON)
        return { before: beforeJSON, after: afterJSON, diff }
      } catch {
        return null
      }
    },

    async JSONDiffForFile(filename: string): Promise<JSONDiff> {
      const [before, after] = await Promise.all([
        getFileContents(api, filename, undefined, baseSHA),
        getFileContents(api, filename, undefined, headSHA),
      ])

      try {
        const beforeJSON = before ? JSON.parse(before) : {}
        const afterJSON = after ? JSON.parse(after) : {}
        return generateJSONDiff(beforeJSON, afterJSON)
      } catch {
        return {}
      }
    },

    async linesOfCode(pattern?: string): Promise<number | null> {
      const { parseUnifiedDiff } = await import("../github/diff.ts")
      const parsed = parseUnifiedDiff(fullDiff)

      let total = 0
      for (const file of parsed) {
        const filename = file.to || file.from || ""
        if (pattern && !picomatch.isMatch(filename, pattern)) continue

        for (const chunk of file.chunks) {
          for (const change of chunk.changes) {
            if (change.type === "add") total++
            else if (change.type === "del") total--
          }
        }
      }

      return total
    },
  }
}

/** Simple JSON patch generator (subset of rfc6902) */
function generateJSONPatch(before: any, after: any, path = ""): any[] {
  const ops: any[] = []

  if (typeof before !== typeof after) {
    ops.push({ op: "replace", path: path || "/", value: after })
    return ops
  }

  if (Array.isArray(before) && Array.isArray(after)) {
    // Simple: if arrays differ, replace
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      ops.push({ op: "replace", path: path || "/", value: after })
    }
    return ops
  }

  if (typeof before === "object" && before !== null) {
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])
    for (const key of allKeys) {
      const keyPath = `${path}/${key}`
      if (!(key in before)) {
        ops.push({ op: "add", path: keyPath, value: after[key] })
      } else if (!(key in after)) {
        ops.push({ op: "remove", path: keyPath, value: before[key] })
      } else {
        ops.push(...generateJSONPatch(before[key], after[key], keyPath))
      }
    }
    return ops
  }

  if (before !== after) {
    ops.push({ op: "replace", path: path || "/", value: after })
  }

  return ops
}

/** Generate a simplified JSON diff */
function generateJSONDiff(before: any, after: any): JSONDiff {
  const result: JSONDiff = {}

  if (typeof before !== "object" || typeof after !== "object") return result
  if (before === null || after === null) return result

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    const bVal = before[key]
    const aVal = after[key]

    if (JSON.stringify(bVal) === JSON.stringify(aVal)) continue

    const diffValue: JSONDiffValue = { before: bVal, after: aVal }

    if (Array.isArray(bVal) && Array.isArray(aVal)) {
      diffValue.added = aVal.filter((v: any) => !bVal.includes(v))
      diffValue.removed = bVal.filter((v: any) => !aVal.includes(v))
    } else if (
      typeof bVal === "object" && bVal !== null &&
      typeof aVal === "object" && aVal !== null &&
      !Array.isArray(bVal) && !Array.isArray(aVal)
    ) {
      const bKeys = Object.keys(bVal)
      const aKeys = Object.keys(aVal)
      diffValue.added = aKeys.filter((k) => !bKeys.includes(k)) as any
      diffValue.removed = bKeys.filter((k) => !aKeys.includes(k)) as any
    }

    result[key] = diffValue
  }

  return result
}
