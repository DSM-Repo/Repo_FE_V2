import { expect, test } from '@playwright/test'

import { authenticateAs } from './auth-fixtures'

test.describe('teacher student portfolio review', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'TEACHER')
  })

  test('keeps the teacher-only review route available', async ({ page }) => {
    await page.goto('/students/1')
    await expect(page).toHaveURL(/\/students\/1$/)
    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByText('학생 관리')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('does not report success for teacher actions that have no backend contract', async ({ page }) => {
    await page.setViewportSize({ height: 854, width: 1528 })
    await page.goto('/students/1')

    await expect(page.getByLabel('학생 포트폴리오 검토')).toBeVisible()
    await expect(page.getByText('학생 이력서를 불러올 수 없습니다.')).toBeVisible()
    await expect(page.getByText('교사가 학생의 이력서 본문을 조회하는 API가 아직 제공되지 않았습니다.')).toBeVisible()
    await expect(page.getByRole('button', { name: '필터 열기' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '전체 PDF 다운로드' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /피드백 추가/ })).toBeDisabled()
    await expect(page.getByRole('switch', { name: '이력서 공개' })).toBeDisabled()
    await expect(page.getByRole('switch', { name: '피드백 보기' })).toBeDisabled()
    await expect(page.getByRole('status')).toHaveCount(0)
  })
})
