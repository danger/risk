import { describe, it, expect } from "vitest"
import {
  emptyResults,
  isEmptyResults,
  isMarkdownOnlyResults,
  inlineResults,
  regularResults,
  mergeResults,
  validateResults,
  sortResults,
  resultsIntoInlineResults,
  sortInlineResults,
} from "../../dsl/results.ts"
import type { DangerResults } from "../../dsl/results.ts"

describe("results", () => {
  describe("emptyResults", () => {
    it("returns a fresh empty results object", () => {
      const r = emptyResults()
      expect(r.fails).toEqual([])
      expect(r.warnings).toEqual([])
      expect(r.messages).toEqual([])
      expect(r.markdowns).toEqual([])
    })

    it("returns a new object each time", () => {
      const a = emptyResults()
      const b = emptyResults()
      expect(a).not.toBe(b)
    })
  })

  describe("isEmptyResults", () => {
    it("returns true for empty results", () => {
      expect(isEmptyResults(emptyResults())).toBe(true)
    })

    it("returns false when there are fails", () => {
      const r = emptyResults()
      r.fails.push({ message: "fail" })
      expect(isEmptyResults(r)).toBe(false)
    })

    it("returns false when there are markdowns", () => {
      const r = emptyResults()
      r.markdowns.push({ message: "md" })
      expect(isEmptyResults(r)).toBe(false)
    })
  })

  describe("isMarkdownOnlyResults", () => {
    it("returns false for empty results", () => {
      expect(isMarkdownOnlyResults(emptyResults())).toBe(false)
    })

    it("returns true when only markdowns exist", () => {
      const r = emptyResults()
      r.markdowns.push({ message: "md" })
      expect(isMarkdownOnlyResults(r)).toBe(true)
    })

    it("returns false when fails exist alongside markdowns", () => {
      const r = emptyResults()
      r.markdowns.push({ message: "md" })
      r.fails.push({ message: "fail" })
      expect(isMarkdownOnlyResults(r)).toBe(false)
    })
  })

  describe("inlineResults / regularResults", () => {
    const mixed: DangerResults = {
      fails: [
        { message: "inline fail", file: "a.ts", line: 1 },
        { message: "regular fail" },
      ],
      warnings: [{ message: "inline warn", file: "b.ts", line: 2 }],
      messages: [{ message: "regular msg" }],
      markdowns: [
        { message: "inline md", file: "c.ts", line: 3 },
        { message: "regular md" },
      ],
    }

    it("inlineResults returns only violations with file+line", () => {
      const r = inlineResults(mixed)
      expect(r.fails).toHaveLength(1)
      expect(r.fails[0].message).toBe("inline fail")
      expect(r.warnings).toHaveLength(1)
      expect(r.messages).toHaveLength(0)
      expect(r.markdowns).toHaveLength(1)
    })

    it("regularResults returns only violations without file+line", () => {
      const r = regularResults(mixed)
      expect(r.fails).toHaveLength(1)
      expect(r.fails[0].message).toBe("regular fail")
      expect(r.warnings).toHaveLength(0)
      expect(r.messages).toHaveLength(1)
      expect(r.markdowns).toHaveLength(1)
    })
  })

  describe("mergeResults", () => {
    it("combines violations from both results", () => {
      const a: DangerResults = {
        fails: [{ message: "f1" }],
        warnings: [],
        messages: [{ message: "m1" }],
        markdowns: [],
      }
      const b: DangerResults = {
        fails: [{ message: "f2" }],
        warnings: [{ message: "w1" }],
        messages: [],
        markdowns: [{ message: "md1" }],
      }
      const merged = mergeResults(a, b)
      expect(merged.fails).toHaveLength(2)
      expect(merged.warnings).toHaveLength(1)
      expect(merged.messages).toHaveLength(1)
      expect(merged.markdowns).toHaveLength(1)
    })
  })

  describe("validateResults", () => {
    it("passes for valid results", () => {
      expect(() => validateResults(emptyResults())).not.toThrow()
    })

    it("throws when a key is missing", () => {
      const bad = { fails: [], warnings: [], messages: [] } as any
      expect(() => validateResults(bad)).toThrow("markdowns")
    })

    it("throws when a violation has no message", () => {
      const bad: DangerResults = {
        fails: [{ message: "" }],
        warnings: [],
        messages: [],
        markdowns: [],
      }
      // empty string is falsy
      expect(() => validateResults(bad)).toThrow("message")
    })
  })

  describe("sortResults", () => {
    it("sorts violations by file then line", () => {
      const r: DangerResults = {
        fails: [
          { message: "c", file: "z.ts", line: 10 },
          { message: "a", file: "a.ts", line: 5 },
          { message: "b", file: "a.ts", line: 1 },
          { message: "d" },
        ],
        warnings: [],
        messages: [],
        markdowns: [],
      }
      const sorted = sortResults(r)
      expect(sorted.fails.map((f) => f.message)).toEqual(["d", "b", "a", "c"])
    })
  })

  describe("resultsIntoInlineResults", () => {
    it("groups violations by file and line", () => {
      const r: DangerResults = {
        fails: [{ message: "fail1", file: "a.ts", line: 1 }],
        warnings: [{ message: "warn1", file: "a.ts", line: 1 }],
        messages: [{ message: "msg1", file: "b.ts", line: 5 }],
        markdowns: [],
      }
      const inline = resultsIntoInlineResults(r)
      expect(inline).toHaveLength(2)

      const aResult = inline.find((i) => i.file === "a.ts")!
      expect(aResult.line).toBe(1)
      expect(aResult.fails).toEqual(["fail1"])
      expect(aResult.warnings).toEqual(["warn1"])

      const bResult = inline.find((i) => i.file === "b.ts")!
      expect(bResult.messages).toEqual(["msg1"])
    })

    it("ignores non-inline violations", () => {
      const r: DangerResults = {
        fails: [{ message: "no file" }],
        warnings: [],
        messages: [],
        markdowns: [],
      }
      expect(resultsIntoInlineResults(r)).toHaveLength(0)
    })
  })

  describe("sortInlineResults", () => {
    it("sorts by file then line", () => {
      const inline = [
        { file: "z.ts", line: 1, fails: [], warnings: [], messages: [], markdowns: [] },
        { file: "a.ts", line: 5, fails: [], warnings: [], messages: [], markdowns: [] },
        { file: "a.ts", line: 1, fails: [], warnings: [], messages: [], markdowns: [] },
      ]
      const sorted = sortInlineResults(inline)
      expect(sorted[0].file).toBe("a.ts")
      expect(sorted[0].line).toBe(1)
      expect(sorted[1].file).toBe("a.ts")
      expect(sorted[1].line).toBe(5)
      expect(sorted[2].file).toBe("z.ts")
    })
  })
})
