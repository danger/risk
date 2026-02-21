import { describe, it, expect, beforeEach } from "vitest"
import {
  danger,
  results,
  fail,
  warn,
  message,
  markdown,
  schedule,
  _setDangerDSL,
  _resetResults,
  _getResults,
  _injectGlobals,
} from "../index.ts"
import type { DangerDSLType } from "../dsl/danger-dsl.ts"

const fakeDSL = {
  git: { modified_files: ["a.ts"] },
  github: { pr: { title: "Test PR" } },
  utils: {},
} as unknown as DangerDSLType

describe("singleton index module", () => {
  beforeEach(() => {
    _resetResults()
  })

  describe("_setDangerDSL / danger", () => {
    it("populates the danger singleton", () => {
      _setDangerDSL(fakeDSL)
      expect(danger).toBe(fakeDSL)
      expect(danger.git.modified_files).toEqual(["a.ts"])
    })
  })

  describe("_resetResults", () => {
    it("clears all results", () => {
      fail("oops")
      warn("careful")
      expect(results.fails).toHaveLength(1)
      expect(results.warnings).toHaveLength(1)

      _resetResults()
      // After reset, the module-level `results` is a new object
      const fresh = _getResults()
      expect(fresh.fails).toHaveLength(0)
      expect(fresh.warnings).toHaveLength(0)
    })
  })

  describe("fail", () => {
    it("pushes to results.fails", () => {
      fail("broken")
      const r = _getResults()
      expect(r.fails).toHaveLength(1)
      expect(r.fails[0].message).toBe("broken")
    })

    it("supports file and line", () => {
      fail("error", "file.ts", 10)
      const r = _getResults()
      expect(r.fails[0]).toEqual({ message: "error", file: "file.ts", line: 10 })
    })
  })

  describe("warn", () => {
    it("pushes to results.warnings", () => {
      warn("heads up")
      const r = _getResults()
      expect(r.warnings).toHaveLength(1)
      expect(r.warnings[0].message).toBe("heads up")
    })
  })

  describe("message", () => {
    it("pushes to results.messages", () => {
      message("info")
      const r = _getResults()
      expect(r.messages).toHaveLength(1)
      expect(r.messages[0].message).toBe("info")
    })

    it("supports file as string arg", () => {
      message("info", "file.ts", 5)
      const r = _getResults()
      expect(r.messages[0]).toEqual({
        message: "info",
        file: "file.ts",
        line: 5,
        icon: undefined,
      })
    })

    it("supports options object with icon", () => {
      message("info", { file: "file.ts", line: 3, icon: ":rocket:" })
      const r = _getResults()
      expect(r.messages[0]).toEqual({
        message: "info",
        file: "file.ts",
        line: 3,
        icon: ":rocket:",
      })
    })
  })

  describe("markdown", () => {
    it("pushes to results.markdowns", () => {
      markdown("## Title")
      const r = _getResults()
      expect(r.markdowns).toHaveLength(1)
      expect(r.markdowns[0].message).toBe("## Title")
    })
  })

  describe("schedule", () => {
    it("pushes to results.scheduled", () => {
      const fn = async () => {}
      schedule(fn)
      const r = _getResults()
      expect(r.scheduled).toHaveLength(1)
    })
  })

  describe("_injectGlobals", () => {
    it("sets danger and functions on globalThis", () => {
      _setDangerDSL(fakeDSL)
      _injectGlobals()

      const g = globalThis as any
      expect(g.danger).toBe(fakeDSL)
      expect(typeof g.fail).toBe("function")
      expect(typeof g.warn).toBe("function")
      expect(typeof g.message).toBe("function")
      expect(typeof g.markdown).toBe("function")
      expect(typeof g.schedule).toBe("function")
    })
  })
})
