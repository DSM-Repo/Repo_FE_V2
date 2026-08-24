import { expect, test } from '@playwright/test'

test('gives each resume book sheet a unique landmark name', async ({ page }) => {
  await page.goto('/resume-books/1')

  await expect(page.getByRole('article', { name: '최하은 포트폴리오 왼쪽 페이지' })).toBeVisible()
  await expect(page.getByRole('article', { name: '최하은 포트폴리오 오른쪽 페이지' })).toBeVisible()
})
