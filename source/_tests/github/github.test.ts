import { describe, it, expect } from "vitest"
import { buildDangerDSL } from "../../github/github.ts"
import { createMockAPI, loadFixture } from "../fixtures/mockGitHubAPI.ts"

describe("buildDangerDSL", () => {
  it("builds the full DSL from GitHub API data", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.git).toBeTruthy()
    expect(dsl.github).toBeTruthy()
    expect(dsl.utils).toBeTruthy()
  })

  it("gets the correct PR number", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.pr.number).toEqual(327)
  })

  it("gets the correct PR title", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.pr.title).toEqual(
      "Adds support for showing the metadata and trending Artists to a Gene VC"
    )
  })

  it("gets the commits", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.commits.length).toBeGreaterThan(0)
    expect(dsl.github.commits[0].commit.url).toEqual(
      "https://api.github.com/repos/artsy/emission/git/commits/13da2c844def1f4262ee440bd86fb2a3b021718b"
    )
  })

  it("gets the reviews", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.reviews[0].id).toEqual(2332973)
  })

  it("gets the requested reviewers", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.requested_reviewers.users[0].id).toEqual(12397828)
  })

  it("sets thisPR correctly", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.thisPR).toEqual({
      owner: "artsy",
      repo: "emission",
      pull_number: 327,
      number: 327,
    })
  })

  it("sets the issue labels", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.issue.labels).toBeDefined()
  })

  it("provides an octokit API instance", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.api).toBeDefined()
    expect(dsl.github.api).toBe(api.octokit)
  })

  it("provides utils.href", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.utils.href("https://example.com", "Example")).toEqual(
      '<a href="https://example.com">Example</a>'
    )
  })

  it("provides utils.sentence", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.utils.sentence(["a", "b", "c"])).toEqual("a, b and c")
    expect(dsl.utils.sentence(["a"])).toEqual("a")
    expect(dsl.utils.sentence([])).toEqual("")
  })

  it("provides setSummaryMarkdown", async () => {
    const api = createMockAPI()
    const dsl = await buildDangerDSL(api)

    expect(dsl.github.setSummaryMarkdown).toBeTypeOf("function")
    dsl.github.setSummaryMarkdown("# Summary")
    expect((dsl as any)._getSummaryMarkdown()).toEqual("# Summary")
  })

  describe("git DSL from buildDangerDSL", () => {
    it("sets modified/created/deleted files correctly", async () => {
      const api = createMockAPI()
      const dsl = await buildDangerDSL(api)

      expect(dsl.git.modified_files).toContain("CHANGELOG.md")
      expect(dsl.git.modified_files).toContain("tsconfig.json")
      expect(dsl.git.created_files).toContain("lib/components/gene/about.js")
      expect(dsl.git.created_files).toContain("lib/components/gene/biography.js")
      expect(dsl.git.deleted_files).toContain("lib/components/artist/related_artists/index.js")
      expect(dsl.git.deleted_files).toContain("lib/components/gene/about_gene.js")
    })

    it("sets base and head SHAs from the PR", async () => {
      const api = createMockAPI()
      const pr = loadFixture("github_pr.json")
      const dsl = await buildDangerDSL(api)

      expect(dsl.git.base).toEqual(pr.base.sha)
      expect(dsl.git.head).toEqual(pr.head.sha)
    })

    it("maps commits to git format", async () => {
      const api = createMockAPI()
      const dsl = await buildDangerDSL(api)

      const firstCommit = dsl.git.commits[0]
      expect(firstCommit.sha).toEqual("13da2c844def1f4262ee440bd86fb2a3b021718b")
      expect(firstCommit.message).toEqual("WIP on Gene")
      expect(firstCommit.author.name).toEqual("Orta Therox")
      expect(firstCommit.author.email).toEqual("orta.therox@gmail.com")
    })
  })

  describe("github utils", () => {
    it("generates file links", async () => {
      const api = createMockAPI()
      const dsl = await buildDangerDSL(api)

      const links = dsl.github.utils.fileLinks(["src/foo.ts", "src/bar.ts"])
      expect(links).toContain("foo.ts")
      expect(links).toContain("bar.ts")
      expect(links).toContain("<a href=")
    })

    it("fetches file contents", async () => {
      const api = createMockAPI()
      const dsl = await buildDangerDSL(api)
      const pr = loadFixture("github_pr.json")

      const content = await dsl.github.utils.fileContents("tsconfig.json", undefined, pr.head.sha)
      expect(content).toBeTruthy()
    })
  })
})
