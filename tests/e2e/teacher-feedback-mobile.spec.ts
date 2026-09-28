import { expect, test } from '@playwright/test'

import { authenticateAs } from './auth-fixtures'

test('keeps unavailable teacher controls visible and disabled on narrow screens', async ({ page }) => {
  await authenticateAs(page, 'TEACHER')
  await page.setViewportSize({ height: 854, width: 720 })
  await page.goto('/students/1')

  await expect(page.getByText('학생 이력서를 불러올 수 없습니다.')).toBeVisible()
  await expect(page.getByLabel('학생 이력서 검토 설정')).toBeVisible()
  await expect(page.getByRole('button', { name: /피드백 추가/ })).toBeDisabled()
  await expect(page.getByRole('switch', { name: '피드백 보기' })).toBeDisabled()
})
