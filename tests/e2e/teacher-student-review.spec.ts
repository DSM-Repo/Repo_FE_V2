import { expect, test } from '@playwright/test'

test.describe('teacher student portfolio review', () => {
  test('opens the teacher-only review route from the student list', async ({ page }) => {
    await page.goto('/students')
    await page.getByRole('button', { name: /1반/ }).first().click()

    const firstStudentLink = page.getByRole('link', { name: /레주메 보러가기/ }).first()
    await expect(firstStudentLink).toHaveAttribute('href', '/students/1')

    await firstStudentLink.click()
    await expect(page).toHaveURL(/\/students\/1$/)
    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByText('학생 관리')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('provides feedback, visibility, save, and page controls instead of library tools', async ({ page }) => {
    await page.goto('/students/1')

    await expect(page.getByLabel('학생 포트폴리오 검토')).toBeVisible()
    await expect(page.getByRole('article', { name: /최하은 포트폴리오/ })).toHaveCount(2)
    await expect(page.getByRole('button', { name: '필터 열기' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '전체 PDF 다운로드' })).toHaveCount(0)

    const feedbackSwitch = page.getByRole('switch', { name: '피드백 보기' })
    await expect(feedbackSwitch).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByRole('button', { name: '피드백 내용 보기' })).toHaveCount(0)

    await page.getByRole('button', { name: /피드백 추가/ }).click()
    await expect(page.getByRole('button', { name: '임시저장' })).toBeVisible()
    await expect(page.getByRole('button', { name: '저장', exact: true })).toBeVisible()
    await expect(feedbackSwitch).toHaveAttribute('aria-checked', 'true')
    await expect(page.getByRole('button', { name: '피드백 내용 보기' })).toHaveCount(3)

    await feedbackSwitch.click()
    await expect(page.getByRole('button', { name: '피드백 내용 보기' })).toHaveCount(0)

    await page.getByRole('button', { name: '다음 페이지' }).last().click()
    await expect(page.getByLabel('현재 페이지')).toHaveText('3 / 5')

    await page.getByRole('button', { name: '임시저장' }).click()
    await expect(page.getByRole('status')).toContainText('피드백을 임시저장했습니다.')
  })

  test('reports a visibility update failure without changing the switch', async ({ page }) => {
    await page.goto('/students/1?error=visibility')

    const visibilitySwitch = page.getByRole('switch', { name: '이력서 공개' })
    await visibilitySwitch.click()

    await expect(page.getByLabel('학생 포트폴리오 검토').getByRole('alert')).toContainText(
      '이력서 공개 상태 변경에 실패하였습니다.',
    )
    await expect(visibilitySwitch).toHaveAttribute('aria-checked', 'false')
  })
})
