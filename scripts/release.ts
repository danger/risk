#!/usr/bin/env -S node --experimental-strip-types --no-warnings

/**
 * Release script for risk.
 *
 * Usage:
 *   yarn release <patch|minor|major>
 *
 * What it does:
 *   1. Checks for clean working tree on main
 *   2. Runs tests and typecheck
 *   3. Bumps version in package.json
 *   4. Commits, tags, and pushes
 *
 * The publish.yml workflow handles the rest (GitHub release + npm publish).
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
  console.log("Usage: yarn release <patch|minor|major>")
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
run("yarn test", { stdio: "inherit" })

console.log("Running typecheck...")
run("yarn typecheck", { stdio: "inherit" })

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

// --- Commit, tag, push ---

const tag = `v${newVersion}`

run(`git add package.json`)
run(`git commit -m "Release ${tag}"`)
run(`git tag -a ${tag} -m "Release ${tag}"`)
run(`git push origin main --follow-tags`)

console.log(`\nPushed ${tag} to origin. The publish workflow will handle the rest.`)
