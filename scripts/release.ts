#!/usr/bin/env node --experimental-strip-types --no-warnings

/**
 * Release script for risk.
 *
 * Usage:
 *   node --experimental-strip-types scripts/release.ts <patch|minor|major>
 *
 * What it does:
 *   1. Checks for clean working tree
 *   2. Runs tests and typecheck
 *   3. Bumps version in package.json
 *   4. Extracts release notes from CHANGELOG.md
 *   5. Commits, tags, and pushes
 *   6. Creates a GitHub release with the changelog entry
 *   7. Publishes to npm
 */

import { execSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

function run(cmd: string, opts?: { cwd?: string; stdio?: "inherit" | "pipe" }): string {
  const result = execSync(cmd, { cwd: root, encoding: "utf-8", stdio: opts?.stdio ?? "pipe", ...opts })
  return typeof result === "string" ? result.trim() : ""
}

function die(msg: string): never {
  console.error(`\n  Error: ${msg}\n`)
  process.exit(1)
}

// --- Parse args ---

const bump = process.argv[2] as "patch" | "minor" | "major" | undefined
if (!bump || !["patch", "minor", "major"].includes(bump)) {
  console.log("Usage: scripts/release.ts <patch|minor|major>")
  process.exit(1)
}

// --- Preflight checks ---

const status = run("git status --porcelain")
if (status) {
  die("Working tree is not clean. Commit or stash changes first.")
}

const branch = run("git branch --show-current")
if (branch !== "main") {
  die(`Must be on 'main' branch to release (currently on '${branch}').`)
}

console.log("Running tests...")
run("npm test", { stdio: "inherit" })

console.log("Running typecheck...")
run("npm run typecheck", { stdio: "inherit" })

// --- Bump version ---

const pkgPath = resolve(root, "package.json")
const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
const oldVersion: string = pkg.version

const [major, minor, patch] = oldVersion.split(".").map(Number)
const newVersion =
  bump === "major" ? `${major + 1}.0.0` :
  bump === "minor" ? `${major}.${minor + 1}.0` :
  `${major}.${minor}.${patch + 1}`

pkg.version = newVersion
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
console.log(`\nVersion: ${oldVersion} -> ${newVersion}`)

// --- Extract changelog entry ---

const changelogPath = resolve(root, "CHANGELOG.md")
const changelog = readFileSync(changelogPath, "utf-8")

// Find the section for the new version, fall back to the first section
const sections = changelog.split(/^## /m).filter(Boolean)
const currentSection = sections.find(s => s.startsWith(newVersion)) ?? sections[0]
const releaseNotes = currentSection
  ? currentSection.replace(/^\S+\s*\n/, "").trim() // Remove the version heading line
  : `Release ${newVersion}`

if (!currentSection?.startsWith(newVersion)) {
  console.log(`Warning: No CHANGELOG entry found for ${newVersion}, using first entry.`)
}

console.log(`\nRelease notes:\n${releaseNotes}\n`)

// --- Commit, tag, push ---

const tag = `v${newVersion}`

run(`git add package.json`)
run(`git commit -m "Release ${tag}"`)
run(`git tag -a ${tag} -m "Release ${tag}"`)
run(`git push origin main --follow-tags`)

console.log(`Pushed ${tag} to origin.`)

// --- GitHub release ---

console.log("Creating GitHub release...")
const releaseBody = `## ${newVersion}\n\n${releaseNotes}`
run(`gh release create ${tag} --title "${tag}" --notes ${JSON.stringify(releaseBody)}`)
console.log(`GitHub release created: https://github.com/danger/risk/releases/tag/${tag}`)

// --- npm publish ---

console.log("Publishing to npm...")
run("npm publish", { stdio: "inherit" })
console.log(`\nPublished risk@${newVersion} to npm.`)
