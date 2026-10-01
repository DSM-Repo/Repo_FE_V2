import { defineConfig } from '@playwright/test'

const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3000)
const baseURL = `http://localhost:${PORT}`
const apiBaseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://api.repo.test'
const startCommand = `pnpm exec next start -H localhost -p ${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [process.env.CI ? ['github'] : ['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: process.env.CI ? startCommand : `pnpm build && ${startCommand}`,
    env: {
      NEXT_PUBLIC_API_BASE_URL: apiBaseURL,
    },
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
