import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["source/**/_tests/**/*.test.ts"],
  },
})
