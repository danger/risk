# risk

A smaller [Danger JS](https://danger.systems/js) runtime with a narrower scope: GitHub only, ESM only, Node 22+. Three runtime dependencies.

Full documentation lives at [danger.systems/js](https://danger.systems/js) — the Dangerfile API is the same.

## Installation

```sh
yarn add risk --dev
```

## Usage

Create a `dangerfile.ts` in your project root:

```ts
import { danger, warn, fail, message, markdown } from "risk"

if (!danger.github.pr.body.length) {
  fail("Please add a description to your PR.")
}

const bigPR = danger.github.pr.additions + danger.github.pr.deletions > 500
if (bigPR) {
  warn("This PR is quite large. Consider splitting it up.")
}

message(`This PR modifies ${danger.git.modified_files.length} file(s).`)
```

Existing Dangerfiles that `import { danger } from "danger"` will also work — a built-in ESM loader handles the redirect.

### Commands

**`danger ci`** — Run on CI against the current pull request.

```sh
danger ci [options]
```

| Option | Description |
|---|---|
| `-d, --dangerfile <path>` | Path to Dangerfile (default: `dangerfile.ts`) |
| `--id <id>` | Unique identifier for this run (default: `"Danger"`) |
| `-t, --text-only` | Print to stdout instead of posting comments |
| `--fail-on-errors` | Exit with code 1 if there are failures |
| `--new-comment` | Always create a new comment |
| `--remove-previous-comments` | Remove previous Danger comments |
| `--base-url <url>` | GitHub API base URL (for GitHub Enterprise) |

**`danger pr <url>`** — Test your Dangerfile against an existing PR without posting comments.

```sh
danger pr https://github.com/owner/repo/pull/123
```

### GitHub Actions

```yaml
- run: yarn danger ci
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

For other CI providers, set `DANGER_GITHUB_API_TOKEN` and either `DANGER_PR_URL` or `DANGER_REPO_SLUG` + `DANGER_PR_ID`.

### GitHub Enterprise

Set `--base-url` or the `DANGER_GITHUB_API_BASE_URL` environment variable to your GHE API endpoint.

## What's different from Danger JS

- **GitHub only** — no GitLab or BitBucket support
- **ESM only** — no CommonJS, no Babel transpilation
- **Node 22+** — uses native type stripping, `fetch`, `parseArgs`, `styleText`
- **Single process** — no subprocess/runner model
- **3 runtime deps** — `@octokit/rest`, `parse-diff`, `picomatch`

## Releasing

```sh
# Update CHANGELOG.md with the new version, then:
yarn release <patch|minor|major>
```

This bumps `package.json`, commits, tags, and pushes. The [publish workflow](.github/workflows/publish.yml) handles creating the GitHub release and publishing to npm.
