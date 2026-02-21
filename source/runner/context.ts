import type { DangerDSLType } from "../dsl/danger-dsl.ts"
import type { DangerRuntimeContainer } from "../dsl/results.ts"
import type { MarkdownString } from "../dsl/types.ts"

/** A function with a callback, which Danger wraps in a Promise */
export type CallbackableFn = (callback: (done: any) => void) => void

/**
 * Types of things which Danger will schedule for you.
 * Recommended: just throw in an `async () => { [...] }` function.
 */
export type Scheduleable = Promise<any> | Promise<void> | CallbackableFn

/**
 * The DangerContext is the set of functions and values available
 * to a Dangerfile at runtime.
 */
export interface DangerContext {
  /**
   * Register async code to evaluate. Use `schedule` when you need
   * to do async work in a Dangerfile.
   */
  schedule(asyncFunction: Scheduleable): void

  /** Highlights critical issues. Shown inside a HTML table. */
  fail(message: MarkdownString, file?: string, line?: number): void

  /** Highlights low-priority issues. Shown inside a HTML table. */
  warn(message: MarkdownString, file?: string, line?: number): void

  /** Adds an info message to the Danger table. */
  message(message: MarkdownString, file?: string, line?: number): void
  /** Adds an info message with optional icon/file/line via options object. */
  message(
    message: MarkdownString,
    opts?: { file?: string; line?: number; icon?: MarkdownString }
  ): void

  /** Adds raw markdown into the Danger comment, under the table. */
  markdown(message: MarkdownString, file?: string, line?: number): void

  /** The root Danger object with all metadata. */
  danger: DangerDSLType

  /** The current results of a Danger run. */
  results: DangerRuntimeContainer
}

/**
 * Creates a Danger context. This provides all of the global functions
 * which are available to the Danger eval runtime.
 */
export function contextForDanger(dsl: DangerDSLType): DangerContext {
  const results: DangerRuntimeContainer = {
    fails: [],
    warnings: [],
    messages: [],
    markdowns: [],
    scheduled: [],
  }

  const schedule = (fn: any) => results.scheduled?.push(fn)

  const fail = (message: MarkdownString, file?: string, line?: number) =>
    results.fails.push({ message, file, line })

  const warn = (message: MarkdownString, file?: string, line?: number) =>
    results.warnings.push({ message, file, line })

  const message = (
    msg: MarkdownString,
    opts?: string | { file?: string; line?: number; icon?: MarkdownString },
    lineArg?: number
  ) => {
    let file: string | undefined
    let line: number | undefined
    let icon: MarkdownString | undefined

    if (typeof opts === "string") {
      file = opts
      line = lineArg
    } else if (typeof opts === "object") {
      ;({ file, line, icon } = opts)
    }

    results.messages.push({ message: msg, file, line, icon })
  }

  const markdown = (message: MarkdownString, file?: string, line?: number) =>
    results.markdowns.push({ message, file, line })

  return {
    schedule,
    fail,
    warn,
    message,
    markdown,
    results,
    danger: dsl,
  }
}

/**
 * Run all scheduled async tasks from a Danger run.
 */
export async function runAllScheduledTasks(results: DangerRuntimeContainer): Promise<void> {
  if (!results.scheduled || results.scheduled.length === 0) return

  for (const task of results.scheduled) {
    if (typeof task === "function") {
      // Could be a callback-style function or an async function
      const result = task()
      if (result && typeof result.then === "function") {
        await result
      }
    } else if (task && typeof task.then === "function") {
      // It's a promise directly
      await task
    }
  }
}
