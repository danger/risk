import { describe, it, expect } from "vitest"
import { contextForDanger, runAllScheduledTasks } from "../../runner/context.ts"
import type { DangerDSLType } from "../../dsl/danger-dsl.ts"

const fakeDSL = {
  git: {},
  github: {},
  utils: {},
} as unknown as DangerDSLType

describe("contextForDanger", () => {
  it("creates a context with empty results", () => {
    const ctx = contextForDanger(fakeDSL)
    expect(ctx.results.fails).toEqual([])
    expect(ctx.results.warnings).toEqual([])
    expect(ctx.results.messages).toEqual([])
    expect(ctx.results.markdowns).toEqual([])
    expect(ctx.results.scheduled).toEqual([])
  })

  it("exposes the DSL as danger", () => {
    const ctx = contextForDanger(fakeDSL)
    expect(ctx.danger).toBe(fakeDSL)
  })

  describe("fail", () => {
    it("adds a fail violation", () => {
      const ctx = contextForDanger(fakeDSL)
      ctx.fail("something broke")
      expect(ctx.results.fails).toHaveLength(1)
      expect(ctx.results.fails[0].message).toBe("something broke")
    })

    it("supports file and line", () => {
      const ctx = contextForDanger(fakeDSL)
      ctx.fail("error", "src/index.ts", 42)
      expect(ctx.results.fails[0]).toEqual({
        message: "error",
        file: "src/index.ts",
        line: 42,
      })
    })
  })

  describe("warn", () => {
    it("adds a warning violation", () => {
      const ctx = contextForDanger(fakeDSL)
      ctx.warn("careful")
      expect(ctx.results.warnings).toHaveLength(1)
      expect(ctx.results.warnings[0].message).toBe("careful")
    })
  })

  describe("message", () => {
    it("adds a message violation", () => {
      const ctx = contextForDanger(fakeDSL)
      ctx.message("info")
      expect(ctx.results.messages).toHaveLength(1)
      expect(ctx.results.messages[0].message).toBe("info")
    })

    it("supports file and line as positional args", () => {
      const ctx = contextForDanger(fakeDSL)
      ctx.message("info", "file.ts", 10)
      expect(ctx.results.messages[0]).toEqual({
        message: "info",
        file: "file.ts",
        line: 10,
        icon: undefined,
      })
    })

    it("supports options object with icon", () => {
      const ctx = contextForDanger(fakeDSL)
      ctx.message("info", { file: "file.ts", line: 5, icon: ":tada:" })
      expect(ctx.results.messages[0]).toEqual({
        message: "info",
        file: "file.ts",
        line: 5,
        icon: ":tada:",
      })
    })
  })

  describe("markdown", () => {
    it("adds a markdown violation", () => {
      const ctx = contextForDanger(fakeDSL)
      ctx.markdown("## Header")
      expect(ctx.results.markdowns).toHaveLength(1)
      expect(ctx.results.markdowns[0].message).toBe("## Header")
    })
  })

  describe("schedule", () => {
    it("adds scheduled functions", () => {
      const ctx = contextForDanger(fakeDSL)
      const fn = async () => {}
      ctx.schedule(fn)
      expect(ctx.results.scheduled).toHaveLength(1)
    })
  })
})

describe("runAllScheduledTasks", () => {
  it("runs async functions", async () => {
    let ran = false
    const results = {
      fails: [],
      warnings: [],
      messages: [],
      markdowns: [],
      scheduled: [async () => { ran = true }],
    }
    await runAllScheduledTasks(results)
    expect(ran).toBe(true)
  })

  it("runs promises", async () => {
    let ran = false
    const results = {
      fails: [],
      warnings: [],
      messages: [],
      markdowns: [],
      scheduled: [
        new Promise<void>((resolve) => {
          ran = true
          resolve()
        }),
      ],
    }
    await runAllScheduledTasks(results)
    expect(ran).toBe(true)
  })

  it("does nothing when no scheduled tasks", async () => {
    const results = {
      fails: [],
      warnings: [],
      messages: [],
      markdowns: [],
      scheduled: [],
    }
    await expect(runAllScheduledTasks(results)).resolves.toBeUndefined()
  })

  it("runs multiple tasks in order", async () => {
    const order: number[] = []
    const results = {
      fails: [],
      warnings: [],
      messages: [],
      markdowns: [],
      scheduled: [
        async () => { order.push(1) },
        async () => { order.push(2) },
        async () => { order.push(3) },
      ],
    }
    await runAllScheduledTasks(results)
    expect(order).toEqual([1, 2, 3])
  })
})
