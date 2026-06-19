import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'logic', environment: 'node', include: ['src/**/*.test.ts'] }
      }
    ]
  }
})
