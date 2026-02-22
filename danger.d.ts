/**
 * Ambient module declaration that allows `import { danger } from "danger"`
 * to resolve types when only `risk` is installed.
 *
 * At runtime, the ESM loader in danger-loader.ts redirects the import.
 */
declare module "danger" {
  export * from "risk"
}
