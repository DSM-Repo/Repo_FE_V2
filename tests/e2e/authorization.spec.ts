import { expect, test } from '@playwright/test'

import { authenticateAs, authenticateWithAccessToken, createTestAccessToken, type TestAuthRole } from './auth-fixtures'

const apiBaseUrl = 'http://52.78.201.218'

function createExpiredAccessToken(role: TestAuthRole) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1_000) - 60,
      role,
      sub: `${role.toLowerCase()}@dsm.hs.kr`,
    }),
  ).toString('base64url')

  return `${header}.${payload}.test-signature`
}

test.describe('protected route authorization', () => {
  test('redirects an unauthenticated visitor from a student route to login', async ({ page }) => {
    // Given: no authentication tokens are stored.

    // When: the visitor opens a student-only route directly.
    await page.goto('/home')

    // Then: the login page is the only rendered destination.
    await expect(page).toHaveURL(/\/login$/)
  })

  test('redirects a student away from a teacher route', async ({ page }) => {
    // Given: the browser has a server-issued student role token.
    await authenticateAs(page, 'STUDENT')

    // When: the student opens a teacher-only route directly.
    await page.goto('/students')

    // Then: the student returns to the student home.
    await expect(page).toHaveURL(/\/home$/)
  })

  test('redirects a teacher away from a student route', async ({ page }) => {
    // Given: the browser has a server-issued teacher role token.
    await authenticateAs(page, 'TEACHER')

    // When: the teacher opens a student-only route directly.
    await page.goto('/resume')

    // Then: the teacher returns to student management.
    await expect(page).toHaveURL(/\/students$/)
  })

  test('refreshes a stale access token before authorizing a protected route', async ({ page }) => {
    const refreshedAccessToken = createTestAccessToken('STUDENT')
    let refreshRequestCount = 0

    await authenticateWithAccessToken(page, createExpiredAccessToken('STUDENT'), 'student-refresh-token')
    await page.route(`${apiBaseUrl}/user/refresh`, async (route) => {
      refreshRequestCount += 1
      expect(route.request().headers()['refresh-token']).toBe('student-refresh-token')

      await route.fulfill({
        body: JSON.stringify({ accessToken: refreshedAccessToken }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${refreshedAccessToken}`)

      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '',
          major: null,
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 0 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/alram`, async (route) => {
      await route.fulfill({
        body: JSON.stringify([]),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/home')

    await expect(page).toHaveURL(/\/home$/)
    await expect(page.getByRole('heading', { level: 1, name: /오혜민/ })).toBeVisible()
    expect(refreshRequestCount).toBe(1)
    await expect(page.evaluate(() => window.localStorage.getItem('repo.auth.accessToken'))).resolves.toBe(refreshedAccessToken)
  })
})
