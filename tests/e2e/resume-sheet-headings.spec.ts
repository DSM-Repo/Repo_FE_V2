import { expect, test } from '@playwright/test'

test('uses a consistent heading hierarchy inside each resume book sheet', async ({ page }) => {
  await page.goto('/resume-books/1')

  const leftSheet = page.getByRole('article').first()

  await expect(leftSheet.getByRole('heading', { level: 2, name: '최하은' })).toBeVisible()
  await expect(leftSheet.getByRole('heading', { level: 3, name: '기술스택' })).toBeVisible()
  await expect(leftSheet.getByRole('heading', { level: 4, name: '대회' })).toBeVisible()
})
