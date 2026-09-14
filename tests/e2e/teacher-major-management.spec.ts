import { expect, test } from '@playwright/test'

test.describe('teacher major management', () => {
  test('renders the teacher-only major list and active navigation', async ({ page }) => {
    await page.goto('/majors')

    await expect(page.getByRole('heading', { level: 1, name: '전공 관리' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByText('전공 관리')).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('region', { name: '전공 목록' }).getByRole('button')).toHaveCount(0)
  })

  test('validates, adds, and announces a major', async ({ page }) => {
    await page.goto('/majors')

    const majorInput = page.getByRole('textbox', { name: '추가할 전공 이름' })
    await page.getByRole('button', { name: /전공 추가/ }).click()

    await expect(page.getByText('전공명을 입력해 주세요.')).toBeVisible()
    await expect(majorInput).toHaveAttribute('aria-invalid', 'true')

    await majorInput.fill('Backend Developer')
    await page.getByRole('button', { name: /전공 추가/ }).click()

    await expect(page.getByRole('status')).toContainText('전공이 추가되었습니다.')
    await expect(page.getByRole('region', { name: '전공 목록' }).getByRole('button')).toHaveCount(1)
    await expect(majorInput).toHaveValue('')
  })

  test('shows an empty student state for a newly added major', async ({ page }) => {
    await page.goto('/majors')

    await page.getByRole('textbox', { name: '추가할 전공 이름' }).fill('Backend Developer')
    await page.getByRole('button', { name: /전공 추가/ }).click()
    await page.getByRole('region', { name: '전공 목록' }).getByRole('button', { name: 'Backend Developer' }).click()

    await expect(page.getByText('해당 전공에 소속된 학생이 없습니다.')).toBeVisible()
  })

  test('deletes the selected major with a toast', async ({ page }) => {
    await page.goto('/majors')

    await page.getByRole('textbox', { name: '추가할 전공 이름' }).fill('Backend Developer')
    await page.getByRole('button', { name: /전공 추가/ }).click()
    await page.getByRole('region', { name: '전공 목록' }).getByRole('button', { name: 'Backend Developer' }).click()

    await page.getByRole('button', { name: '전공 삭제' }).click()

    await expect(page.getByRole('status')).toContainText('전공이 삭제되었습니다.')
    await expect(page.getByRole('region', { name: '전공 목록' }).getByRole('button')).toHaveCount(0)
  })
})
