import { expect, test, apiBaseUrl } from './test-fixtures'

import { authenticateWithAccessToken, createTestAccessToken } from './auth-fixtures'


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
    await page.route(`${apiBaseUrl}/major/1/students`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          majorId: 1,
          majorName: 'Backend Developer',
          numberOfData: 0,
          students: [],
        }),
        contentType: 'application/json',
        status: 200,
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
    await page.route(`${apiBaseUrl}/major/1/students`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${teacherAccessToken}`)

      await route.fulfill({
        body: JSON.stringify({
          majorId: 1,
          majorName: 'Backend Developer',
          numberOfData: 0,
          students: [],
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/majors')

    await page.getByRole('region', { name: '전공 목록' }).getByRole('button', { name: 'Backend Developer' }).click()

    await expect(page.getByText('해당 전공에 소속된 학생이 없습니다.')).toBeVisible()
  })

  test('requests selected major students and filters them by grade', async ({ page }) => {
    const studentRequestUrls: string[] = []

    await page.route(`${apiBaseUrl}/major`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          majors: [
            {
              createdAt: '2023-05-23T00:00:00.000Z',
              majorId: 1,
              name: 'Frontend Developer',
            },
          ],
          numberOfData: 1,
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/major/1/students**`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${teacherAccessToken}`)
      studentRequestUrls.push(route.request().url())

      const url = new URL(route.request().url())
      const grade = url.searchParams.get('grade')
      const students =
        grade === '2'
          ? [
              {
                classNumber: 4,
                grade: 2,
                name: '최하은',
                resumeId: 'resume-1',
                schoolNumber: '2415',
                studentId: 1,
              },
            ]
          : [
              {
                classNumber: 4,
                grade: 2,
                name: '최하은',
                resumeId: 'resume-1',
                schoolNumber: '2415',
                studentId: 1,
              },
              {
                classNumber: 1,
                grade: 1,
                name: '김일학',
                resumeId: 'resume-2',
                schoolNumber: '1101',
                studentId: 2,
              },
              {
                classNumber: 3,
                grade: 3,
                name: '박삼학',
                resumeId: 'resume-3',
                schoolNumber: '3302',
                studentId: 3,
              },
            ]

      await route.fulfill({
        body: JSON.stringify({
          ...(grade ? { grade: Number(grade) } : {}),
          majorId: 1,
          majorName: 'Frontend Developer',
          numberOfData: students.length,
          students,
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/majors')

    await page.getByRole('region', { name: '전공 목록' }).getByRole('button', { name: 'Frontend Developer' }).click()

    await expect(page.getByText('생성일 : 2023.05.23')).toBeVisible()
    await expect(page.getByRole('link', { name: /2415 최하은/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /1101 김일학/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /3302 박삼학/ })).toBeVisible()

    await page.getByRole('button', { name: '2학년' }).click()

    await expect(page.getByRole('link', { name: /2415 최하은/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /1101 김일학/ })).toHaveCount(0)
    await expect(page.getByRole('link', { name: /3302 박삼학/ })).toHaveCount(0)
    expect(studentRequestUrls.map((url) => new URL(url).pathname)).toContain('/major/1/students')
    expect(studentRequestUrls.some((url) => new URL(url).searchParams.get('grade') === '2')).toBe(true)
  })

  test('deletes the selected major with a toast', async ({ page }) => {
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({ majors: [{ majorId: 1, name: 'Backend Developer' }], numberOfData: 1 }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/major/1/students`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          majorId: 1,
          majorName: 'Backend Developer',
          numberOfData: 0,
          students: [],
        }),
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
