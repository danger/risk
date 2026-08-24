## Unreleased

## 1.0

Tada! It's been 6 months of daily usage for me across a few project, and I've not wanted any features. So, I think we're good to go for more public usage.

Coming in with 1.0:

Fixed `dangerfile.ts` failing with "Cannot use import statement outside a module" in any project that doesn't set `"type": "module"` — which is most of them. Node picks a Dangerfile's module format from the nearest package.json, so the resolve hook now pins the Dangerfile to ESM.

Fixed `danger.git.linesOfCode()` returning added minus removed lines. It now reports the size of the change, matching Danger JS — previously a PR that added and deleted the same number of lines reported 0, and a delete-heavy PR reported a negative number.

Added `danger --version`.

`danger-plugin-*` packages now work, CommonJS ones included. The `danger` -> `risk` redirect moved from `module.register()` to `module.registerHooks()`, which hooks `require()` as well as `import`, and the package now exposes a `require` export condition. There's an integration test suite covering both plugin styles.

Removed the unused inline-comment template. Violations with a file and line are rendered in the main Danger comment; risk does not post onto the diff.

Dropped `--experimental-strip-types` and `--no-warnings` from the CLI shebang — type stripping is on by default from Node 22.18, so the shebang is now a plain `#!/usr/bin/env node` and works when npx links the binary directly. The minimum Node version is now 22.18.

Switched the `danger` -> `risk` import redirect from `module.register()` to `module.registerHooks()`, which is no longer deprecated on Node 26.

## 0.0.5

Try use -S in the shebang for the commands

## 0.0.4

Added TypeScript type declarations for `import { danger } from "danger"`. Opt in by adding `"types": ["risk"]` in your `tsconfig.json`.

## 0.0.1

It's the initial launch: `danger ci` and `danger pr` are added.
