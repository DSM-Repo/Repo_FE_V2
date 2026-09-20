import { expect, test } from '@playwright/test'

import { authenticateAs } from './auth-fixtures'

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
})
