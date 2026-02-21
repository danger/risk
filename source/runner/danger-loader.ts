/**
 * Custom ESM loader that redirects `import 'danger'` to `risk`.
 * Registered via module.register() at CLI startup.
 *
 * This enables backwards compatibility with existing Dangerfiles
 * that use `import { danger, fail, warn } from 'danger'`.
 */

interface ResolveContext {
  conditions: string[]
  parentURL?: string
}

type NextResolve = (specifier: string, context: ResolveContext) => Promise<{ url: string }>

export async function resolve(
  specifier: string,
  context: ResolveContext,
  nextResolve: NextResolve
) {
  if (specifier === "danger") {
    // Redirect 'danger' imports to 'risk'
    return nextResolve("risk", context)
  }
  return nextResolve(specifier, context)
}
