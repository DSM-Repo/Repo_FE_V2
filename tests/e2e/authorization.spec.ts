import { expect, test, apiBaseUrl } from './test-fixtures'

import { authenticateAs, authenticateWithAccessToken, createTestAccessToken, type TestAuthRole } from './auth-fixtures'



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
  for (const failure of ['network', 'server'] as const) {
    test(`retains refresh credentials and offers retry after ${failure} failure`, async ({ page }) => {
      await authenticateWithAccessToken(page, createExpiredAccessToken('STUDENT'), 'retained-refresh')
      let rejectCredentials = false
      await page.route(`${apiBaseUrl}/user/refresh`, async (route) => {
        expect(route.request().headers()['refresh-token']).toBe('retained-refresh')
        if (rejectCredentials) await route.fulfill({ status: 401 })
        else if (failure === 'network') await route.abort('failed')
        else await route.fulfill({ status: 503 })
      })
      await page.goto('/home')
      await expect(page.getByRole('alert').filter({ hasText: failure === 'network' ? 'auth API' : '토큰 재발급' })).toBeVisible()
      await expect(page.getByRole('button', { name: '다시 시도' })).toBeEnabled()
      await expect(page).toHaveURL(/\/home$/)
      expect(await page.evaluate(() => localStorage.getItem('repo.auth.refreshToken'))).toBe('retained-refresh')
      rejectCredentials = true
      await page.getByRole('button', { name: '다시 시도' }).click()
      await expect(page).toHaveURL(/\/login$/)
      expect(await page.evaluate(() => localStorage.getItem('repo.auth.refreshToken'))).toBeNull()
    })
  }

  test('does not restore a session when guard refresh arrives after logout', async ({ page }) => {
    await authenticateWithAccessToken(page, createExpiredAccessToken('STUDENT'), 'old-refresh')
    let release: () => void = () => undefined
    const gate = new Promise<void>((resolve) => { release = resolve })
    let started: () => void = () => undefined
    const requested = new Promise<void>((resolve) => { started = resolve })
    await page.route(`${apiBaseUrl}/user/refresh`, async (route) => {
      started()
      await gate
      await route.fulfill({ json: { accessToken: createTestAccessToken('STUDENT') } })
    })
    await page.goto('/home')
    await requested
    await page.evaluate(() => {
      localStorage.removeItem('repo.auth.accessToken')
      localStorage.removeItem('repo.auth.refreshToken')
    })
    release()
    await expect(page).toHaveURL(/\/login$/)
    expect(await page.evaluate(() => localStorage.getItem('repo.auth.accessToken'))).toBeNull()
  })

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
    await page.route(`${apiBaseUrl}/alram`, async (route) => {
      await route.fulfill({ json: [] })
    })

    // When: the student opens a teacher-only route directly.
    await page.goto('/students')

    // Then: the student returns to the student home.
    await expect(page).toHaveURL(/\/home$/)
  })

  test('redirects a teacher away from a student route', async ({ page }) => {
    // Given: the browser has a server-issued teacher role token.
    await authenticateAs(page, 'TEACHER')
    await page.route(`${apiBaseUrl}/resume/students`, (route) =>
      route.fulfill({ json: { classNumber: null, grade: null, lastUpdatedAt: '', numberOfData: 0, schoolYear: 2026, students: [] } }),
    )

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
