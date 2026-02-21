import { parseArgs } from "node:util"

export interface SharedCLIArgs {
  dangerfile?: string
  id: string
  textOnly: boolean
  failOnErrors: boolean
  verbose: boolean
  noPublishCheck: boolean
  newComment: boolean
  removePreviousComments: boolean
  baseUrl?: string
}

/** Shared CLI argument definitions for danger ci and danger pr */
export const sharedOptions = {
  dangerfile: { type: "string" as const, short: "d" },
  id: { type: "string" as const },
  "text-only": { type: "boolean" as const, short: "t" },
  "fail-on-errors": { type: "boolean" as const },
  verbose: { type: "boolean" as const, short: "v" },
  "no-publish-check": { type: "boolean" as const },
  "new-comment": { type: "boolean" as const },
  "remove-previous-comments": { type: "boolean" as const },
  "base-url": { type: "string" as const },
  help: { type: "boolean" as const, short: "h" },
}

export function parseSharedArgs(argv: string[]): SharedCLIArgs & { help: boolean; positionals: string[] } {
  const { values, positionals } = parseArgs({
    args: argv,
    options: sharedOptions,
    allowPositionals: true,
  })

  return {
    dangerfile: values.dangerfile as string | undefined,
    id: (values.id as string) || "Danger",
    textOnly: !!values["text-only"],
    failOnErrors: !!values["fail-on-errors"],
    verbose: !!values.verbose,
    noPublishCheck: !!values["no-publish-check"],
    newComment: !!values["new-comment"],
    removePreviousComments: !!values["remove-previous-comments"],
    baseUrl: values["base-url"] as string | undefined,
    help: !!values.help,
    positionals,
  }
}
