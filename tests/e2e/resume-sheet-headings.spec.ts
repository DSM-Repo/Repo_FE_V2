import { expect, test } from '@playwright/test'

test('does not render resume book sheet headings when no document data is loaded', async ({ page }) => {
  await page.goto('/resume-books/1')

  await expect(page.getByText('공개된 포트폴리오 문서가 없습니다.')).toBeVisible()
  await expect(page.getByRole('article')).toHaveCount(0)
})
