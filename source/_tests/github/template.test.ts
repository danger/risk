import { describe, it, expect } from "vitest"
import {
  template,
  inlineTemplate,
  dangerIDToString,
  dangerSignature,
} from "../../github/template.ts"
import type { DangerResults } from "../../dsl/results.ts"
import { emptyResults } from "../../dsl/results.ts"

describe("template", () => {
  it("includes the dangerID in an HTML comment", () => {
    const html = template("my-id", emptyResults())
    expect(html).toContain("DangerID: danger-id-my-id;")
  })

  it("renders fails in a table", () => {
    const results: DangerResults = {
      ...emptyResults(),
      fails: [{ message: "Something broke" }],
    }
    const html = template("test", results)
    expect(html).toContain("Fails")
    expect(html).toContain("Something broke")
    expect(html).toContain(":no_entry_sign:")
  })

  it("renders warnings in a table", () => {
    const results: DangerResults = {
      ...emptyResults(),
      warnings: [{ message: "Be careful" }],
    }
    const html = template("test", results)
    expect(html).toContain("Warnings")
    expect(html).toContain("Be careful")
    expect(html).toContain(":warning:")
  })

  it("renders messages in a table", () => {
    const results: DangerResults = {
      ...emptyResults(),
      messages: [{ message: "FYI" }],
    }
    const html = template("test", results)
    expect(html).toContain("Messages")
    expect(html).toContain("FYI")
  })

  it("renders markdowns outside the table", () => {
    const results: DangerResults = {
      ...emptyResults(),
      markdowns: [{ message: "## Details\nSome markdown" }],
    }
    const html = template("test", results)
    expect(html).toContain("## Details\nSome markdown")
  })

  it("includes commit ID in signature when provided", () => {
    const html = template("test", emptyResults(), "abc123")
    expect(html).toContain("against abc123")
  })

  it("includes the danger signature", () => {
    const html = template("test", emptyResults())
    expect(html).toContain("dangerJS")
    expect(html).toContain("danger.systems/js")
  })
})

describe("inlineTemplate", () => {
  it("includes file and line info", () => {
    const results: DangerResults = {
      ...emptyResults(),
      fails: [{ message: "Bad code" }],
    }
    const html = inlineTemplate("test", results, "src/index.ts", 42)
    expect(html).toContain("File: src/index.ts;")
    expect(html).toContain("Line: 42;")
    expect(html).toContain("Bad code")
  })
})

describe("dangerIDToString", () => {
  it("formats the danger ID", () => {
    expect(dangerIDToString("test")).toBe("DangerID: danger-id-test;")
  })
})

describe("dangerSignature", () => {
  it("uses custom runtime info when provided", () => {
    const results: DangerResults = {
      ...emptyResults(),
      meta: { runtimeName: "CustomTool", runtimeHref: "https://example.com" },
    }
    const sig = dangerSignature(results)
    expect(sig).toContain("CustomTool")
    expect(sig).toContain("https://example.com")
  })
})
