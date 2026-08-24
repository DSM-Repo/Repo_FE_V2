import { expect, test } from '@playwright/test'

test('keeps feedback controls available on narrow screens', async ({ page }) => {
  await page.setViewportSize({ height: 854, width: 720 })
  await page.goto('/students/1')

  await page.getByRole('button', { name: /피드백 추가/ }).click()

  await expect(page.getByLabel('피드백 저장')).toBeVisible()
  await expect(page.getByLabel('학생 이력서 검토 설정')).toBeVisible()
  await expect(page.getByRole('button', { name: '임시저장' })).toBeVisible()
  await expect(page.getByRole('switch', { name: '피드백 보기' })).toBeVisible()
})
