import { describe, it, expect } from "vitest"
import { buildGitDSL } from "../../dsl/git-dsl-builder.ts"
import { buildGitJSONDSL } from "../../github/diff.ts"
import { createMockAPI, loadFixture, loadTextFixture } from "../fixtures/mockGitHubAPI.ts"
import type { GitDSL } from "../../dsl/git-dsl.ts"
import type { GitHubAPIClient } from "../../github/api.ts"

function createGitDSL(): { gitDSL: GitDSL; api: GitHubAPIClient; baseSHA: string; headSHA: string } {
  const api = createMockAPI()
  const pr = loadFixture("github_pr.json")
  const files = [
    { sha: "1", filename: "CHANGELOG.md", status: "modified" as const, additions: 1, deletions: 0, changes: 1 },
    { sha: "2", filename: "data/schema.graphql", status: "modified" as const, additions: 40, deletions: 0, changes: 40 },
    { sha: "3", filename: "data/schema.json", status: "modified" as const, additions: 448, deletions: 38, changes: 486 },
    { sha: "4", filename: "externals/metaphysics", status: "modified" as const, additions: 1, deletions: 1, changes: 2 },
    { sha: "5", filename: "lib/__mocks__/react-relay.js", status: "modified" as const, additions: 3, deletions: 1, changes: 4 },
    { sha: "6", filename: "lib/components/artist/about.js", status: "modified" as const, additions: 1, deletions: 1, changes: 2 },
    { sha: "7", filename: "lib/components/gene/about.js", status: "added" as const, additions: 30, deletions: 0, changes: 30 },
    { sha: "8", filename: "lib/components/gene/biography.js", status: "added" as const, additions: 32, deletions: 0, changes: 32 },
    { sha: "9", filename: "lib/components/gene/header.js", status: "modified" as const, additions: 16, deletions: 8, changes: 24 },
    { sha: "10", filename: "lib/components/related_artists/index.js", status: "added" as const, additions: 51, deletions: 0, changes: 51 },
    { sha: "11", filename: "lib/components/related_artists/related_artist.js", status: "added" as const, additions: 43, deletions: 0, changes: 43 },
    { sha: "12", filename: "lib/components/artist/related_artists/index.js", status: "removed" as const, additions: 0, deletions: 49, changes: 49 },
    { sha: "13", filename: "lib/components/artist/related_artists/related_artist.js", status: "removed" as const, additions: 0, deletions: 42, changes: 42 },
    { sha: "14", filename: "lib/components/gene/about_gene.js", status: "removed" as const, additions: 0, deletions: 25, changes: 25 },
    { sha: "15", filename: "lib/containers/__tests__/__snapshots__/gene-tests.js.snap", status: "modified" as const, additions: 72, deletions: 14, changes: 86 },
    { sha: "16", filename: "lib/containers/__tests__/gene-tests.js", status: "modified" as const, additions: 42, deletions: 6, changes: 48 },
    { sha: "17", filename: "lib/containers/gene.js", status: "modified" as const, additions: 60, deletions: 15, changes: 75 },
    { sha: "18", filename: "tsconfig.json", status: "modified" as const, additions: 2, deletions: 1, changes: 3 },
  ]

  const fullDiff = loadTextFixture("github_diff.diff")
  const gitJSON = buildGitJSONDSL(files)
  const baseSHA = pr.base.sha
  const headSHA = pr.head.sha

  const commits = loadFixture("github_commits.json")
  const gitCommits = commits.map((c: any) => ({
    ...c.commit,
    sha: c.sha,
    url: c.url,
  }))

  const gitDSL = buildGitDSL(
    { ...gitJSON, commits: gitCommits },
    fullDiff,
    api,
    baseSHA,
    headSHA
  )

  return { gitDSL, api, baseSHA, headSHA }
}

describe("Git DSL", () => {
  it("sets the modified/created/deleted files", () => {
    const { gitDSL } = createGitDSL()

    expect(gitDSL.modified_files).toEqual([
      "CHANGELOG.md",
      "data/schema.graphql",
      "data/schema.json",
      "externals/metaphysics",
      "lib/__mocks__/react-relay.js",
      "lib/components/artist/about.js",
      "lib/components/gene/header.js",
      "lib/containers/__tests__/__snapshots__/gene-tests.js.snap",
      "lib/containers/__tests__/gene-tests.js",
      "lib/containers/gene.js",
      "tsconfig.json",
    ])

    expect(gitDSL.created_files).toEqual([
      "lib/components/gene/about.js",
      "lib/components/gene/biography.js",
      "lib/components/related_artists/index.js",
      "lib/components/related_artists/related_artist.js",
    ])

    expect(gitDSL.deleted_files).toEqual([
      "lib/components/artist/related_artists/index.js",
      "lib/components/artist/related_artists/related_artist.js",
      "lib/components/gene/about_gene.js",
    ])
  })

  it("sets base and head SHAs", () => {
    const { gitDSL, baseSHA, headSHA } = createGitDSL()

    expect(gitDSL.base).toBe(baseSHA)
    expect(gitDSL.head).toBe(headSHA)
  })

  it("sets up commit data correctly", () => {
    const { gitDSL } = createGitDSL()
    const firstCommit = gitDSL.commits[0]

    expect(firstCommit.sha).toBe("13da2c844def1f4262ee440bd86fb2a3b021718b")
    expect(firstCommit.message).toBe("WIP on Gene")
    expect(firstCommit.author.name).toBe("Orta Therox")
    expect(firstCommit.author.email).toBe("orta.therox@gmail.com")
    expect(firstCommit.author.date).toBe("2016-09-30T13:52:14Z")
  })

  describe("fileMatch", () => {
    it("matches modified files", () => {
      const { gitDSL } = createGitDSL()
      const match = gitDSL.fileMatch("**/*.json")

      expect(match.modified).toBe(true)
      expect(match.getKeyedPaths().modified).toContain("data/schema.json")
      expect(match.getKeyedPaths().modified).toContain("tsconfig.json")
    })

    it("matches created files", () => {
      const { gitDSL } = createGitDSL()
      const match = gitDSL.fileMatch("lib/components/gene/**")

      expect(match.created).toBe(true)
      expect(match.getKeyedPaths().created).toContain("lib/components/gene/about.js")
      expect(match.getKeyedPaths().created).toContain("lib/components/gene/biography.js")
    })

    it("matches deleted files", () => {
      const { gitDSL } = createGitDSL()
      const match = gitDSL.fileMatch("lib/components/artist/related_artists/**")

      expect(match.deleted).toBe(true)
      expect(match.getKeyedPaths().deleted).toContain("lib/components/artist/related_artists/index.js")
    })

    it("returns false for non-matching patterns", () => {
      const { gitDSL } = createGitDSL()
      const match = gitDSL.fileMatch("*.py")

      expect(match.modified).toBe(false)
      expect(match.created).toBe(false)
      expect(match.deleted).toBe(false)
      expect(match.edited).toBe(false)
    })

    it("edited includes both modified and created", () => {
      const { gitDSL } = createGitDSL()
      const match = gitDSL.fileMatch("lib/**")

      expect(match.edited).toBe(true)
      const edited = match.getKeyedPaths().edited
      // Should include both modified and created
      expect(edited).toContain("lib/components/gene/about.js") // created
      expect(edited).toContain("lib/components/gene/header.js") // modified
    })
  })

  describe("linesOfCode", () => {
    it("counts the total lines of code", async () => {
      const { gitDSL } = createGitDSL()
      const loc = await gitDSL.linesOfCode()
      expect(loc).toBeTypeOf("number")
      expect(loc).toBeGreaterThan(0)
    })

    it("allows filtering by file path pattern", async () => {
      const { gitDSL } = createGitDSL()
      const allLoc = await gitDSL.linesOfCode()
      const libLoc = await gitDSL.linesOfCode("lib/**")

      expect(libLoc).toBeTypeOf("number")
      expect(libLoc).toBeLessThan(allLoc!)
    })
  })

  describe("diffForFile", () => {
    it("returns a diff for a modified file", async () => {
      const { gitDSL } = createGitDSL()
      const diff = await gitDSL.diffForFile("tsconfig.json")

      expect(diff).not.toBeNull()
      expect(diff!.diff).toBeTruthy()
      expect(diff!.before).toBeDefined()
      expect(diff!.after).toBeDefined()
      expect(diff!.added).toBeDefined()
      expect(diff!.removed).toBeDefined()
    })

    it("returns null for files not in the diff", async () => {
      const { gitDSL } = createGitDSL()
      const result = await gitDSL.diffForFile("nonexistent-file.json")

      expect(result).toBeNull()
    })

    it("includes added and removed lines", async () => {
      const { gitDSL } = createGitDSL()
      const diff = await gitDSL.diffForFile("CHANGELOG.md")

      expect(diff).not.toBeNull()
      // The CHANGELOG had a line added
      expect(diff!.added).toContain("GeneVC now shows about information")
    })
  })

  describe("structuredDiffForFile", () => {
    it("returns structured diff with chunks", async () => {
      const { gitDSL } = createGitDSL()
      const diff = await gitDSL.structuredDiffForFile("tsconfig.json")

      expect(diff).not.toBeNull()
      expect(diff!.chunks).toBeDefined()
      expect(diff!.chunks.length).toBeGreaterThan(0)
    })

    it("chunks contain changes with types", async () => {
      const { gitDSL } = createGitDSL()
      const diff = await gitDSL.structuredDiffForFile("CHANGELOG.md")

      expect(diff).not.toBeNull()
      const changes = diff!.chunks[0].changes
      expect(changes.length).toBeGreaterThan(0)
      // Each change has a type
      for (const change of changes) {
        expect(["add", "del", "normal"]).toContain(change.type)
      }
    })

    it("returns null for files not in the diff", async () => {
      const { gitDSL } = createGitDSL()
      const result = await gitDSL.structuredDiffForFile("nonexistent.json")

      expect(result).toBeNull()
    })
  })

  describe("JSONPatchForFile", () => {
    it("returns null for files not in the change list", async () => {
      const { gitDSL } = createGitDSL()
      const empty = await gitDSL.JSONPatchForFile("fuhqmahgads.json")
      expect(empty).toEqual(null)
    })

    it("handles showing a patch for two different JSON files", async () => {
      const { gitDSL, api, baseSHA, headSHA } = createGitDSL()
      const before = { a: "Hello, world", b: 1, c: ["one", "two", "three"] }
      const after = { a: "o, world", b: 3, c: ["one", "two", "three", "four"] }

      // Override getContent to return our test data
      api.octokit.repos.getContent = (({ ref }: any) => {
        const obj = ref === baseSHA ? before : after
        const content = Buffer.from(JSON.stringify(obj)).toString("base64")
        return Promise.resolve({ data: { content, encoding: "base64" } })
      }) as any

      const patch = await gitDSL.JSONPatchForFile("data/schema.json")
      expect(patch).not.toBeNull()
      expect(patch!.before).toEqual(before)
      expect(patch!.after).toEqual(after)
      expect(patch!.diff.length).toBeGreaterThan(0)
    })
  })

  describe("JSONDiffForFile", () => {
    it("returns empty object for files not in the change list", async () => {
      const { gitDSL } = createGitDSL()
      const empty = await gitDSL.JSONDiffForFile("fuhqmahgads.json")
      expect(empty).toEqual({})
    })

    it("handles showing a diff for two different JSON files", async () => {
      const { gitDSL, api, baseSHA } = createGitDSL()
      const before = {
        a: "Hello, world",
        b: 1,
        c: ["one", "two", "three"],
        d: ["one", "two", "three"],
        e: ["one", "two", "three"],
      }
      const after = {
        a: "o, world",
        b: 3,
        c: ["one", "two", "three", "four"],
        d: ["one", "two"],
        e: ["five", "one", "three"],
      }

      api.octokit.repos.getContent = (({ ref }: any) => {
        const obj = ref === baseSHA ? before : after
        const content = Buffer.from(JSON.stringify(obj)).toString("base64")
        return Promise.resolve({ data: { content, encoding: "base64" } })
      }) as any

      const diff = await gitDSL.JSONDiffForFile("data/schema.json")

      expect(diff.a).toEqual({ after: "o, world", before: "Hello, world" })
      expect(diff.b).toEqual({ after: 3, before: 1 })
      expect(diff.c.added).toEqual(["four"])
      expect(diff.c.removed).toEqual([])
      expect(diff.d.removed).toEqual(["three"])
      expect(diff.e.added).toEqual(["five"])
      expect(diff.e.removed).toEqual(["two"])
    })

    it("handles a package.json-style diff", async () => {
      const { gitDSL, api, baseSHA } = createGitDSL()
      const before = {
        dependencies: {
          "babel-polyfill": "^6.20.0",
          chalk: "^1.1.1",
          commander: "^2.9.0",
          debug: "^2.6.0",
        },
        devDependencies: {
          "babel-cli": "^6.16.0",
          "babel-plugin-syntax-async-functions": "^6.13.0",
          "babel-plugin-transform-flow-strip-types": "^6.8.0",
        },
      }
      const after = {
        dependencies: {
          chalk: "^1.2.1",
          commander: "^2.9.0",
          debug: "^2.6.0",
        },
        devDependencies: {
          "babel-cli": "^6.16.0",
          "babel-plugin-typescript": "^2.2.0",
          "babel-plugin-syntax-async-functions": "^6.13.0",
          "babel-plugin-transform-flow-strip-types": "^6.8.0",
        },
      }

      api.octokit.repos.getContent = (({ ref }: any) => {
        const obj = ref === baseSHA ? before : after
        const content = Buffer.from(JSON.stringify(obj)).toString("base64")
        return Promise.resolve({ data: { content, encoding: "base64" } })
      }) as any

      const diff = await gitDSL.JSONDiffForFile("data/schema.json")

      expect(diff.dependencies.removed).toEqual(["babel-polyfill"])
      expect(diff.devDependencies.added).toEqual(["babel-plugin-typescript"])
    })
  })
})
