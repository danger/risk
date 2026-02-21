import { Violation, isInline } from "./types.ts"

/**
 * The representation of what running a Dangerfile generates.
 */
export interface DangerResults {
  /** Failed messages */
  fails: Violation[]
  /** Warning messages */
  warnings: Violation[]
  /** Info messages */
  messages: Violation[]
  /** Markdown messages to attach at the bottom of the comment */
  markdowns: Violation[]
  /** GitHub-specific result metadata */
  github?: {
    /** Markdown for GitHub Actions step summary */
    stepSummary?: string
  }
  /** Meta information about the runtime */
  meta?: {
    runtimeName: string
    runtimeHref: string
  }
}

/**
 * Extends DangerResults with scheduled async functions
 * collected during Dangerfile evaluation.
 */
export interface DangerRuntimeContainer extends DangerResults {
  /** Asynchronous functions to be run after parsing */
  scheduled?: any[]
}

/**
 * Inline results grouped by file and line.
 */
export interface DangerInlineResults {
  /** Path to the file */
  file: string
  /** Line in the file */
  line: number
  /** Failed messages */
  fails: string[]
  /** Warning messages */
  warnings: string[]
  /** Info messages */
  messages: string[]
  /** Markdown messages */
  markdowns: string[]
}

/** An empty DangerResults */
export const emptyResults = (): DangerResults => ({
  fails: [],
  warnings: [],
  messages: [],
  markdowns: [],
})

/** Whether results have no violations at all */
export const isEmptyResults = (results: DangerResults): boolean =>
  [...results.fails, ...results.warnings, ...results.messages, ...results.markdowns].length === 0

/** Whether results contain only markdown (no fails/warnings/messages) */
export const isMarkdownOnlyResults = (results: DangerResults): boolean =>
  results.markdowns.length > 0 &&
  [...results.fails, ...results.warnings, ...results.messages].length === 0

/** Returns only the inline violations from results */
export function inlineResults(results: DangerResults): DangerResults {
  return {
    fails: results.fails.filter(isInline),
    warnings: results.warnings.filter(isInline),
    messages: results.messages.filter(isInline),
    markdowns: results.markdowns.filter(isInline),
  }
}

/** Returns only the non-inline violations from results */
export function regularResults(results: DangerResults): DangerResults {
  return {
    fails: results.fails.filter((m) => !isInline(m)),
    warnings: results.warnings.filter((m) => !isInline(m)),
    messages: results.messages.filter((m) => !isInline(m)),
    markdowns: results.markdowns.filter((m) => !isInline(m)),
    meta: results.meta,
    github: results.github,
  }
}

/** Concat all the violations into new results */
export function mergeResults(results1: DangerResults, results2: DangerResults): DangerResults {
  return {
    fails: results1.fails.concat(results2.fails),
    warnings: results1.warnings.concat(results2.warnings),
    messages: results1.messages.concat(results2.messages),
    markdowns: results1.markdowns.concat(results2.markdowns),
    meta: results1.meta || results2.meta,
    github: results1.github || results2.github,
  }
}

/** Validates that results have the expected structure */
export function validateResults(results: DangerResults): void {
  const { fails, warnings, messages, markdowns } = results
  const props: Record<string, Violation[]> = { fails, warnings, messages, markdowns }

  for (const [name, violations] of Object.entries(props)) {
    if (!violations) {
      throw new Error(
        `Results did not include ${name}.\n\n${JSON.stringify(results, null, "  ")}`
      )
    }
    for (const v of violations) {
      if (!v.message) {
        throw new Error(
          `A violation in ${name} did not include \`message\`.\n\n${JSON.stringify(v, null, "  ")}`
        )
      }
    }
  }
}

/** Sort violations by file and line */
export function sortResults(results: DangerResults): DangerResults {
  const sortByFile = (a: Violation, b: Violation): number => {
    if (a.file === undefined && b.file === undefined) return 0
    if (a.file === undefined) return -1
    if (b.file === undefined) return 1

    if (a.file === b.file) {
      if (a.line === undefined && b.line === undefined) return 0
      if (a.line === undefined) return -1
      if (b.line === undefined) return 1
      return a.line - b.line
    }

    return a.file < b.file ? -1 : 1
  }

  return {
    fails: results.fails.sort(sortByFile),
    warnings: results.warnings.sort(sortByFile),
    messages: results.messages.sort(sortByFile),
    markdowns: results.markdowns.sort(sortByFile),
    meta: results.meta,
    github: results.github,
  }
}

/** Convert results into grouped inline results */
export function resultsIntoInlineResults(results: DangerResults): DangerInlineResults[] {
  const dangerInlineResults: DangerInlineResults[] = []
  const kinds = ["fails", "warnings", "messages", "markdowns"] as const

  for (const kind of kinds) {
    for (const violation of results[kind]) {
      if (violation.file && violation.line) {
        const existing = dangerInlineResults.find(
          (r) => r.file === violation.file && r.line === violation.line
        )
        if (existing) {
          existing[kind].push(violation.message)
        } else {
          const inlineResult: DangerInlineResults = {
            file: violation.file,
            line: violation.line,
            fails: [],
            warnings: [],
            messages: [],
            markdowns: [],
          }
          inlineResult[kind].push(violation.message)
          dangerInlineResults.push(inlineResult)
        }
      }
    }
  }

  return dangerInlineResults
}

/** Sort inline results by file and line */
export function sortInlineResults(inlineResults: DangerInlineResults[]): DangerInlineResults[] {
  return inlineResults
    .map((i) => ({
      ...i,
      fails: i.fails.sort(),
      warnings: i.warnings.sort(),
      messages: i.messages.sort(),
      markdowns: i.markdowns.sort(),
    }))
    .sort((a, b) => {
      if (a.file !== b.file) return a.file < b.file ? -1 : 1
      return a.line - b.line
    })
}
