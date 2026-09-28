import type { Page } from '@playwright/test'

export type TestAuthRole = 'STUDENT' | 'TEACHER'

export function createTestAccessToken(role: TestAuthRole) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1_000) + 3_600,
      role,
      sub: `${role.toLowerCase()}@dsm.hs.kr`,
    }),
  ).toString('base64url')

  return `${header}.${payload}.test-signature`
}

export async function authenticateWithAccessToken(
  page: Page,
  accessToken: string,
  refreshToken = 'test-refresh-token',
) {
  await page.addInitScript(
    ({ accessToken: token, refreshToken: refresh }) => {
      if (window.sessionStorage.getItem('repo.e2e.auth-seeded')) {
        return
      }

      window.localStorage.setItem('repo.auth.accessToken', token)
      window.localStorage.setItem('repo.auth.refreshToken', refresh)
      window.sessionStorage.setItem('repo.e2e.auth-seeded', 'true')
    },
    { accessToken, refreshToken },
  )
}

export async function authenticateAs(page: Page, role: TestAuthRole) {
  await authenticateWithAccessToken(page, createTestAccessToken(role), `${role.toLowerCase()}-refresh-token`)
}
