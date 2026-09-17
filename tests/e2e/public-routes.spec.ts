import { expect, test } from '@playwright/test'

const accessTokenStorageKey = 'repo.auth.accessToken'
const apiBaseUrl = 'http://52.78.201.218'
const testAccessToken = 'e2e-access-token'

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
      expect(url.searchParams.get('size')).toBe('20')

      await route.fulfill({
        body: JSON.stringify({
          content: [
            { major: '백엔드', studentId: 1, studentName: '김태균' },
            { major: '프론트엔드', studentId: 2, studentName: '오혜민' },
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

    await page.goto('/library?date=2026')

    await expect(page.getByRole('heading', { name: '도서관' })).toBeVisible()
    await expect(page.getByRole('link', { name: /김태균/ })).toHaveAttribute('href', '/resume-books/1')
    await expect(page.getByRole('link', { name: /오혜민/ })).toBeVisible()
  })

  test('loads the next public student search page when more students exist', async ({ page }) => {
    const firstPageStudents = Array.from({ length: 20 }, (_, index) => ({
      major: '백엔드',
      studentId: index + 1,
      studentName: `학생${index + 1}`,
    }))

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

      expect(route.request().headers()['authorization']).toBe(`Bearer ${testAccessToken}`)
      expect(url.searchParams.get('date')).toBe('2026')
      expect(url.searchParams.get('size')).toBe('20')

      await route.fulfill({
        body: JSON.stringify({
          content:
            pageNumber === '1'
              ? [{ major: '백엔드', studentId: 21, studentName: '학생21' }]
              : firstPageStudents,
          totalElements: 21,
        }),
        contentType: 'application/json',
        headers: {
          'access-control-allow-origin': '*',
        },
        status: 200,
      })
    })

    await page.goto('/library?date=2026')

    await expect(page.getByRole('link', { name: '학생1 백엔드 이력서 보기' })).toBeVisible()
    await expect(page.getByRole('link', { name: /학생21/ })).toHaveCount(0)
    await page.getByRole('button', { name: '더 보기' }).click()

    await expect(page.getByRole('link', { name: /학생21/ })).toBeVisible()
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
    await expect(page.getByText('30101 | 백엔드 | student@example.com')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'API 설계와 테스트 자동화를 좋아합니다.' })).toBeVisible()
    await expect(page.getByText('문서화')).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: '협업 과정' })).toBeVisible()
  })
})
