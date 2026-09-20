import { expect, test } from '@playwright/test'

import { authenticateWithAccessToken, createTestAccessToken } from './auth-fixtures'

const apiBaseUrl = 'http://52.78.201.218'
const teacherAccessToken = createTestAccessToken('TEACHER')

test.describe('teacher major management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateWithAccessToken(page, teacherAccessToken)
  })

  test('renders the teacher-only major list and active navigation', async ({ page }) => {
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${teacherAccessToken}`)

      await route.fulfill({
        body: JSON.stringify({ majors: [], numberOfData: 0 }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/majors')

    await expect(page.getByRole('heading', { level: 1, name: '전공 관리' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByText('전공 관리')).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('region', { name: '전공 목록' }).getByRole('button')).toHaveCount(0)
  })

  test('validates, adds, and announces a major', async ({ page }) => {
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          body: JSON.stringify({ majors: [], numberOfData: 0 }),
          contentType: 'application/json',
          status: 200,
        })
        return
      }

      expect(route.request().method()).toBe('POST')
      expect(route.request().headers()['authorization']).toBe(`Bearer ${teacherAccessToken}`)
      expect(route.request().postDataJSON()).toEqual({ name: 'Backend Developer' })

      await route.fulfill({
        body: JSON.stringify({ majorId: 1, name: 'Backend Developer' }),
        contentType: 'application/json',
        status: 201,
      })
    })

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
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({ majors: [{ majorId: 1, name: 'Backend Developer' }], numberOfData: 1 }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/majors')

    await page.getByRole('region', { name: '전공 목록' }).getByRole('button', { name: 'Backend Developer' }).click()

    await expect(page.getByText('해당 전공에 소속된 학생이 없습니다.')).toBeVisible()
  })

  test('deletes the selected major with a toast', async ({ page }) => {
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({ majors: [{ majorId: 1, name: 'Backend Developer' }], numberOfData: 1 }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/major/1`, async (route) => {
      expect(route.request().method()).toBe('DELETE')
      expect(route.request().headers()['authorization']).toBe(`Bearer ${teacherAccessToken}`)

      await route.fulfill({
        status: 204,
      })
    })

    await page.goto('/majors')

    await page.getByRole('region', { name: '전공 목록' }).getByRole('button', { name: 'Backend Developer' }).click()

    await page.getByRole('button', { name: '전공 삭제' }).click()

    await expect(page.getByRole('status')).toContainText('전공이 삭제되었습니다.')
    await expect(page.getByRole('region', { name: '전공 목록' }).getByRole('button')).toHaveCount(0)
  })
})
