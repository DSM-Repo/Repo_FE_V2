import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`
const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://52.78.201.218'
const startCommand = `pnpm exec next start -H localhost -p ${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
  },
  webServer: {
    command: process.env.CI ? startCommand : `pnpm build && ${startCommand}`,
    env: {
      NEXT_PUBLIC_API_BASE_URL: apiBaseURL,
    },
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
