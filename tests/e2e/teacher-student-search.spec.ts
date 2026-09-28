import { expect, test } from '@playwright/test'

import { authenticateWithAccessToken, createTestAccessToken } from './auth-fixtures'

const apiBaseUrl = 'http://52.78.201.218'
const teacherAccessToken = createTestAccessToken('TEACHER')

test.beforeEach(async ({ page }) => {
  await authenticateWithAccessToken(page, teacherAccessToken)
  await page.route(`${apiBaseUrl}/resume/students`, async (route) => {
    expect(route.request().headers()['authorization']).toBe(`Bearer ${teacherAccessToken}`)

    await route.fulfill({
      body: JSON.stringify({
        lastUpdatedAt: '2026-09-20T09:30:00.000Z',
        numberOfData: 2,
        schoolYear: 2026,
        students: [
          {
            classNumber: 1,
            grade: 1,
            majorName: '프론트엔드',
            name: '김제출',
            number: 1,
            resumeId: 'resume-1',
            schoolNumber: '1101',
            studentId: 1,
            submissionStatus: 'SUBMITTED',
            submitted: true,
            submittedAt: '2026-09-19T01:00:00.000Z',
          },
          {
            classNumber: 1,
            grade: 1,
            majorName: '백엔드',
            name: '이작성',
            number: 2,
            schoolNumber: '1102',
            studentId: 2,
            submissionStatus: 'ONGOING',
            submitted: false,
          },
        ],
      }),
      contentType: 'application/json',
      status: 200,
    })
  })
})

test('renders API student statuses and filters the selected class by name', async ({ page }) => {
  // Given: the teacher opens student management with two students in class 1-1.
  await page.goto('/students')

  const searchField = page.getByRole('searchbox', { name: '학생 이름 검색' })
  const classTrigger = page.getByRole('button', { name: /1반 2명/ }).first()

  // When: class 1-1 is opened.
  await classTrigger.click()

  // Then: submitted and missing resumes are distinguished using API data.
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('1101 김제출')).toBeVisible()
  await expect(dialog.getByText('제출 완료')).toBeVisible()
  await expect(dialog.getByRole('link', { name: /1101 김제출.*레주메 보러가기/ })).toHaveAttribute(
    'href',
    '/students/resume-1',
  )
  await expect(dialog.getByText('1102 이작성')).toBeVisible()
  await expect(dialog.getByText('작성 중')).toBeVisible()
  await expect(dialog.getByRole('button', { name: /1102 이작성.*이력서 없음/ })).toBeDisabled()

  await page.getByRole('button', { name: '반 상세 닫기' }).click()
  await searchField.fill('김제출')
  await classTrigger.click()
  await expect(dialog.getByText('1101 김제출')).toBeVisible()
  await expect(dialog.getByText('1102 이작성')).toHaveCount(0)
})
