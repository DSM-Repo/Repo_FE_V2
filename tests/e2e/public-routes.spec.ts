import { expect, test, apiBaseUrl } from './test-fixtures'

const accessTokenStorageKey = 'repo.auth.accessToken'

const testAccessToken = 'e2e-access-token'

function createLibraryResume(input: {
  readonly major?: string
  readonly name: string
  readonly pageCount?: number
  readonly studentId: number
  readonly studentNumber?: string
}) {
  const majorName = input.major ?? '백엔드'

  return {
    cohort: 9,
    date: 2026,
    email: `student${input.studentId}@example.test`,
    introduce: `${input.name} 자기소개입니다.`,
    majorName,
    name: input.name,
    pages: Array.from({ length: input.pageCount ?? 1 }, (_, index) => ({
      content: `# ${input.name} ${index + 1}쪽\n${majorName} 포트폴리오입니다.`,
      id: `page-${input.studentId}-${index + 1}`,
      index,
    })),
    portfolioUrl: `https://portfolio.example.test/${input.studentId}`,
    profileImageUrl: '',
    releasedAt: '2026-09-15T14:54:37.468Z',
    resumeId: `resume-${input.studentId}`,
    studentId: input.studentId,
    studentNumber: input.studentNumber ?? `301${String(input.studentId).padStart(2, '0')}`,
    year: 3,
  }
}

test.describe('public route smoke', () => {
  test('renders the public landing page', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /이력서, 온라인으로/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Repo 사용하기' }).first()).toBeVisible()
  })

  test('does not render a public portfolio slug without loaded data', async ({ request }) => {
    const response = await request.get('/오혜민')

    expect(response.status()).toBe(404)
  })

  test('does not treat the reserved dev slug as a public portfolio', async ({ request }) => {
    const response = await request.get('/dev')

    expect(response.status()).toBe(404)
  })

  test('does not expose the component preview in production', async ({ request }) => {
    const response = await request.get('/dev/component-preview')

    expect(response.status()).toBe(404)
  })

  test('renders public library groups from the library API', async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: accessTokenStorageKey, value: testAccessToken },
    )
    await page.route(`${apiBaseUrl}/library`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${testAccessToken}`)

      await route.fulfill({
        body: JSON.stringify([
          { cohort: 9, date: 2026, year: 3 },
          { cohort: 10, date: 2027, year: 2 },
        ]),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })

    await page.goto('/library')

    await expect(page.getByRole('link', { name: '2026 9기 3학년 포트폴리오 열람' })).toBeVisible()
    await expect(page.getByRole('link', { name: '2027 10기 2학년 포트폴리오 열람' })).toHaveAttribute(
      'href',
      '/library?date=2027',
    )
    await expect(page.getByText('공개된 포트폴리오 책이 없습니다.')).toHaveCount(0)
  })

  test('keeps a newly published library group visible while the library API catches up', async ({ page }) => {
    await page.addInitScript(
      ({ accessKey, groupKey, value }) => {
        window.localStorage.setItem(accessKey, value)
        window.localStorage.setItem(groupKey, JSON.stringify([{ cohort: 11, date: 2026, year: 2 }]))
      },
      { accessKey: accessTokenStorageKey, groupKey: 'repo.library.recentGroups', value: testAccessToken },
    )
    await page.route(`${apiBaseUrl}/library`, async (route) => {
      await route.fulfill({
        json: { message: '도서관 반영 중입니다.' },
        status: 500,
      })
    })

    await page.goto('/library')

    await expect(page.getByRole('link', { name: '2026 11기 2학년 포트폴리오 열람' })).toBeVisible()
    await expect(page.getByText('도서관 반영 중입니다.')).toHaveCount(0)
  })

  test('keeps a newly published student visible in the selected library date while search catches up', async ({ page }) => {
    await page.addInitScript(
      ({ accessKey, resumeKey, studentKey, value }) => {
        window.localStorage.setItem(accessKey, value)
        window.localStorage.setItem(
          studentKey,
          JSON.stringify([{ date: 2026, major: 'Frontend Developer', studentId: 1, studentName: '김학생' }]),
        )
        window.localStorage.setItem(
          resumeKey,
          JSON.stringify([
            {
              cohort: 9,
              date: 2026,
              email: 'student1@example.test',
              introduce: '김학생 자기소개입니다.',
              majorName: 'Frontend Developer',
              name: '김학생',
              pages: [{ content: '# 김학생 1쪽', id: 'page-1-1', index: 0 }],
              portfolioUrl: 'https://portfolio.example.test/1',
              profileImageUrl: '',
              releasedAt: '2026-09-15T14:54:37.468Z',
              resumeId: 'resume-1',
              studentId: 1,
              studentNumber: '30101',
              year: 3,
            },
          ]),
        )
      },
      {
        accessKey: accessTokenStorageKey,
        resumeKey: 'repo.library.recentResumes',
        studentKey: 'repo.library.recentStudents',
        value: testAccessToken,
      },
    )
    await page.route(`${apiBaseUrl}/library/search?*`, async (route) => {
      await route.fulfill({
        json: { content: [], totalElements: 0 },
      })
    })
    await page.route(`${apiBaseUrl}/library`, async (route) => {
      await route.fulfill({ json: [] })
    })
    await page.route(`${apiBaseUrl}/library/1`, async (route) => {
      await route.fulfill({
        json: { message: '공개 상세 반영 중입니다.' },
        status: 404,
      })
    })

    await page.goto('/library?date=2026')

    await expect(page.getByLabel('김학생 이력서 1쪽')).toBeVisible()
    await expect(page.getByText('공개된 학생 이력서가 없습니다.')).toHaveCount(0)
  })

  test('allows scrolling when the library API returns multiple rows on desktop', async ({ page }) => {
    const groups = Array.from({ length: 12 }, (_, index) => ({
      cohort: 12 - index,
      date: 2027 - index,
      year: index % 2 === 0 ? 3 : 2,
    }))

    await page.setViewportSize({ height: 720, width: 1280 })
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: accessTokenStorageKey, value: testAccessToken },
    )
    await page.route(`${apiBaseUrl}/library`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${testAccessToken}`)

      await route.fulfill({
        body: JSON.stringify(groups),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })

    await page.goto('/library')
    await page.getByRole('link', { name: '2027 12기 3학년 포트폴리오 열람' }).waitFor()

    const initialScrollY = await page.evaluate(() => window.scrollY)
    await page.getByRole('link', { name: '2016 1기 2학년 포트폴리오 열람' }).scrollIntoViewIfNeeded()
    const scrolledY = await page.evaluate(() => window.scrollY)

    expect(initialScrollY).toBe(0)
    expect(scrolledY).toBeGreaterThan(0)
    await expect(page.getByRole('link', { name: '2016 1기 2학년 포트폴리오 열람' })).toBeVisible()
  })

  test('renders public students for a selected library date', async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: accessTokenStorageKey, value: testAccessToken },
    )
    await page.route(`${apiBaseUrl}/library`, async (route) => {
      await route.fulfill({
        body: JSON.stringify([{ cohort: 9, date: 2026, year: 3 }]),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/library/search?*`, async (route) => {
      const url = new URL(route.request().url())

      expect(route.request().headers()['authorization']).toBe(`Bearer ${testAccessToken}`)
      expect(url.searchParams.get('date')).toBe('2026')
      expect(url.searchParams.get('page')).toBe('0')
      expect(url.searchParams.get('size')).toBe('100')

      await route.fulfill({
        body: JSON.stringify({
          content: [
            { major: '백엔드', studentId: 1, studentName: '김태균', studentNumber: '30102' },
            { major: '프론트엔드', studentId: 2, studentName: '오혜민', studentNumber: '30101' },
          ],
          totalElements: 2,
        }),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/library/1`, async (route) => {
      await route.fulfill({ json: createLibraryResume({ major: '백엔드', name: '김태균', studentId: 1, studentNumber: '30102' }) })
    })
    await page.route(`${apiBaseUrl}/library/2`, async (route) => {
      await route.fulfill({
        json: createLibraryResume({ major: '프론트엔드', name: '오혜민', studentId: 2, studentNumber: '30101' }),
      })
    })

    await page.goto('/library?date=2026')

    await expect(page.getByRole('heading', { name: '도서관' })).toBeVisible()
    await expect(page.getByLabel('오혜민 이력서 1쪽')).toBeVisible()
    await expect(page.getByLabel('김태균 이력서 1쪽')).toBeVisible()
  })

  test('loads every public student search page when more students exist', async ({ page }) => {
    const firstPageStudents = Array.from({ length: 100 }, (_, index) => ({
      major: '백엔드',
      studentId: index + 1,
      studentNumber: `301${String(index + 1).padStart(2, '0')}`,
      studentName: `학생${index + 1}`,
    }))
    const requestedPages: string[] = []

    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: accessTokenStorageKey, value: testAccessToken },
    )
    await page.route(`${apiBaseUrl}/library`, async (route) => {
      await route.fulfill({
        body: JSON.stringify([{ cohort: 9, date: 2026, year: 3 }]),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/library/search?*`, async (route) => {
      const url = new URL(route.request().url())
      const pageNumber = url.searchParams.get('page')
      requestedPages.push(pageNumber ?? '')

      expect(route.request().headers()['authorization']).toBe(`Bearer ${testAccessToken}`)
      expect(url.searchParams.get('date')).toBe('2026')
      expect(url.searchParams.get('size')).toBe('100')

      await route.fulfill({
        body: JSON.stringify({
          content:
            pageNumber === '1'
              ? [{ major: '백엔드', studentId: 101, studentName: '학생101', studentNumber: '30201' }]
              : firstPageStudents,
          totalElements: 101,
        }),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })
    await page.route(new RegExp(`${apiBaseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/library/\\d+$`), async (route) => {
      const studentId = Number(new URL(route.request().url()).pathname.split('/').at(-1))
      const studentName = studentId === 101 ? '학생101' : `학생${studentId}`

      await route.fulfill({
        json: createLibraryResume({
          name: studentName,
          studentId,
          studentNumber: studentId === 101 ? '30201' : `301${String(studentId).padStart(2, '0')}`,
        }),
      })
    })

    await page.goto('/library?date=2026')

    await expect(page.getByLabel('학생1 이력서 1쪽')).toBeVisible()
    await expect.poll(() => requestedPages).toEqual(['0', '1'])
    await expect(page.getByRole('button', { name: '더 보기' })).toHaveCount(0)
  })

  test('renders one public library resume from the student detail API', async ({ page }) => {
    await page.addInitScript(
      ({ key, value }) => window.localStorage.setItem(key, value),
      { key: accessTokenStorageKey, value: testAccessToken },
    )
    await page.route(`${apiBaseUrl}/library/1`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${testAccessToken}`)

      await route.fulfill({
        body: JSON.stringify({
          cohort: 9,
          date: 2026,
          email: 'student@example.com',
          introduce: '문제를 끝까지 파고드는 백엔드 개발자입니다.',
          majorName: '백엔드',
          name: '김태균',
          pages: [
            { content: '# API 설계와 테스트 자동화를 좋아합니다.\n**문서화**를 중요하게 생각합니다.', id: 'page-1', index: 0 },
            { content: '## 협업 과정\n진행 과정을 기록합니다.', id: 'page-2', index: 1 },
          ],
          portfolioUrl: 'https://portfolio.example.test',
          profileImageUrl: 'https://cdn.example.test/profile.png',
          releasedAt: '2026-09-15T14:54:37.468Z',
          resumeId: 'resume-1',
          studentId: 1,
          studentNumber: '30101',
          year: 3,
        }),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })

    await page.goto('/resume-books/1')

    await expect(page.getByRole('heading', { name: '김태균 이력서' })).toBeVisible()
    await expect(page.getByRole('button', { name: '전체 PDF 다운로드' })).toBeVisible()
    await expect(page.getByLabel('목록으로 돌아가기')).toHaveAttribute('href', '/library?date=2026')
    await expect(page.getByRole('heading', { level: 1, name: 'API 설계와 테스트 자동화를 좋아합니다.' })).toBeVisible()
    await expect(page.getByText('문서화')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: '협업 과정' })).toBeVisible()
  })
})
