import type { ResolveHookSync } from "node:module"

/**
 * The Dangerfile currently being evaluated, as a file URL.
 * Set by the runner just before it imports it.
 */
let dangerfileURL: string | undefined

/** @internal Tell the resolve hook which file is the Dangerfile */
export function _setDangerfileURL(url: string): void {
  dangerfileURL = url
}

/**
 * Module resolve hook, registered via module.registerHooks() at CLI startup.
 *
 * It does two things:
 *
 *  1. Redirects `danger` to `risk`, so existing Dangerfiles and the
 *     `danger-plugin-*` ecosystem keep working. registerHooks (unlike
 *     register) also covers `require`, which most plugins still use.
 *
 *  2. Forces the Dangerfile itself to be treated as ESM. Node decides that
 *     from the nearest package.json `type` field, so in a project without
 *     `"type": "module"` a `dangerfile.ts` would otherwise be loaded as
 *     CommonJS and every `import` in it would throw.
 */
export const resolve: ResolveHookSync = (specifier, context, nextResolve) => {
  if (specifier === "danger") {
    return nextResolve("risk", context)
  }

  const resolved = nextResolve(specifier, context)

  if (resolved.url === dangerfileURL && /\.m?ts$/.test(resolved.url)) {
    return { ...resolved, format: "module-typescript" }
  }

  return resolved
}
