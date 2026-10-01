import { expect, test, apiBaseUrl } from './test-fixtures'

import { authenticateWithAccessToken, createTestAccessToken } from './auth-fixtures'


const teacherAccessToken = createTestAccessToken('TEACHER')

test.beforeEach(async ({ page }) => {
  await authenticateWithAccessToken(page, teacherAccessToken)
  await page.route(`${apiBaseUrl}/resume/students`, async (route) => {
    expect(route.request().headers()['authorization']).toBe(`Bearer ${teacherAccessToken}`)

    await route.fulfill({
      body: JSON.stringify({
        classNumber: null,
        grade: null,
        lastUpdatedAt: '2026-09-20T09:30:00.000Z',
        numberOfData: 4,
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
            majorName: null,
            name: '이작성',
            number: 2,
            schoolNumber: '1102',
            studentId: 2,
            submissionStatus: 'ONGOING',
            submitted: false,
          },
          {
            classNumber: 2,
            grade: 2,
            majorName: '백엔드',
            name: '김제출',
            number: 3,
            resumeId: 'resume-3',
            schoolNumber: '2203',
            studentId: 3,
            submissionStatus: 'RELEASED',
            submitted: true,
          },
          {
            classNumber: 3,
            grade: 3,
            majorName: null,
            name: '김제출연',
            number: 4,
            schoolNumber: '3304',
            studentId: 4,
            submissionStatus: 'DELETED',
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
  await expect(dialog.getByText('2203 김제출')).toHaveCount(0)
  await expect(dialog.getByText('3304 김제출연')).toHaveCount(0)
})

test('searches all classes by name without selecting a class', async ({ page }) => {
  await page.goto('/students')

  await page.getByRole('searchbox', { name: '학생 이름 검색' }).fill('  김제출  ')

  const results = page.getByRole('region', { name: '전체 학생 검색 결과' })
  await expect(results.getByRole('link')).toHaveCount(2)
  const firstStudent = results.getByRole('link', { name: /1101 김제출/ })
  await expect(firstStudent).toContainText('1학년 1반')
  await expect(firstStudent).toHaveAttribute('href', '/students/resume-1')
  const sameNameStudent = results.getByRole('link', { name: /2203 김제출/ })
  await expect(sameNameStudent).toContainText('2학년 2반')
  await expect(sameNameStudent).toHaveAttribute('href', '/students/resume-3')
  await expect(sameNameStudent).toContainText('공개됨')
  const missingResume = results.getByRole('button', { name: /3304 김제출연/ })
  await expect(missingResume).toBeDisabled()
  await expect(missingResume).toContainText('3학년 3반')
  await expect(missingResume).toContainText('삭제됨')
  await expect(results.getByText('1102 이작성')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('keeps the class cards when the search is cleared or whitespace only', async ({ page }) => {
  await page.goto('/students')
  const search = page.getByRole('searchbox', { name: '학생 이름 검색' })
  await search.fill('김제출')
  await expect(page.getByRole('region', { name: '전체 학생 검색 결과' })).toBeVisible()

  for (const query of ['', '   ']) {
    await search.fill(query)
    await expect(page.getByRole('region', { name: '전체 학생 검색 결과' })).toHaveCount(0)
    await expect(page.getByLabel('학년별 반 목록').getByRole('button')).toHaveCount(12)
    await expect(page.getByRole('button', { name: /1반 2명/ })).toBeVisible()
  }
})

test('shows an empty search result after a successful lookup', async ({ page }) => {
  await page.goto('/students')

  await page.getByRole('searchbox', { name: '학생 이름 검색' }).fill('없는학생')

  const results = page.getByRole('region', { name: '전체 학생 검색 결과' })
  await expect(results.getByText('검색 결과가 없습니다.')).toBeVisible()
  await expect(results.getByRole('link')).toHaveCount(0)
  await expect(results.getByRole('alert')).toHaveCount(0)
})

test('shows a lookup failure instead of an empty search result', async ({ page }) => {
  await page.route(`${apiBaseUrl}/resume/students`, (route) =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
  )
  await page.goto('/students')

  await page.getByRole('searchbox', { name: '학생 이름 검색' }).fill('김제출')

  const results = page.getByRole('region', { name: '전체 학생 검색 결과' })
  await expect(results.getByRole('alert')).toBeVisible()
  await expect(results.getByText('검색 결과가 없습니다.')).toHaveCount(0)
  await expect(results.getByRole('link')).toHaveCount(0)
})

test('preserves dialog focus and restores global results after Escape', async ({ page }) => {
  await page.goto('/students')
  await page.getByRole('searchbox', { name: '학생 이름 검색' }).fill('김제출')
  const results = page.getByRole('region', { name: '전체 학생 검색 결과' })
  await expect(results.getByRole('link')).toHaveCount(2)
  const classTrigger = page.getByRole('button', { name: /1반 2명/ })

  await classTrigger.click()

  await expect(page.getByRole('button', { name: '반 상세 닫기' })).toBeFocused()
  await expect(page.locator('section[aria-labelledby="students-title"] > div').first()).toHaveAttribute('inert', '')
  await expect(page.getByRole('dialog').getByRole('link')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(classTrigger).toBeFocused()
  await expect(results.getByRole('link')).toHaveCount(2)
})
