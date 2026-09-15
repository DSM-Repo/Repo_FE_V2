import { expect, test } from '@playwright/test'

test.describe('student resume management', () => {
  test('renders the Figma-style resume spread in view mode', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume')

    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '이력서 관리' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('button', { name: '이력서 수정하기' })).toBeVisible()
    await expect(page.getByRole('button', { name: '제출' })).toBeVisible()
    await expect(page.getByRole('article', { name: /이력서/ })).toHaveCount(2)
    await expect(page.getByText('2 / 5')).toBeVisible()
  })

  test('renders edit controls and feedback drawer state', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=feedback')

    await expect(page.getByRole('button', { name: '임시저장' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeVisible()
    await expect(page.getByLabel('이력서 편집 도구')).toBeVisible()
    await expect(page.getByRole('complementary', { name: '피드백 목록' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '피드백 목록' })).toBeVisible()
    await expect(page.getByText('피드백 제목')).toHaveCount(8)
  })

  test('allows writing a resume before opening an existing resume', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const nameInput = page.getByLabel('이름').first()
    const introInput = page.getByLabel('자기소개 내용').first()
    const pageContentInput = page.getByLabel('1쪽 추가 내용')

    await nameInput.fill('김레포')
    await introInput.fill('저는 지금 이력서를 직접 작성하고 있습니다.')
    await pageContentInput.fill('첫 번째 페이지에 들어갈 추가 내용입니다.')

    await expect(nameInput).toHaveValue('김레포')
    await expect(introInput).toHaveValue('저는 지금 이력서를 직접 작성하고 있습니다.')
    await expect(pageContentInput).toHaveValue('첫 번째 페이지에 들어갈 추가 내용입니다.')
  })
})
