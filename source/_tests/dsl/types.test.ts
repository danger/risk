import { describe, it, expect } from "vitest"
import { isInline } from "../../dsl/types.ts"
import type { Violation } from "../../dsl/types.ts"

describe("types", () => {
  describe("isInline", () => {
    it("returns true when both file and line are present", () => {
      const v: Violation = { message: "test", file: "a.ts", line: 1 }
      expect(isInline(v)).toBe(true)
    })

    it("returns false when file is missing", () => {
      const v: Violation = { message: "test", line: 1 }
      expect(isInline(v)).toBe(false)
    })

    it("returns false when line is missing", () => {
      const v: Violation = { message: "test", file: "a.ts" }
      expect(isInline(v)).toBe(false)
    })

    it("returns false when both file and line are missing", () => {
      const v: Violation = { message: "test" }
      expect(isInline(v)).toBe(false)
    })
  })
})
