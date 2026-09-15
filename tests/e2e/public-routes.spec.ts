import { expect, test } from '@playwright/test'

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
    await page.route('http://127.0.0.1:8080/library', async (route) => {
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
    await page.route('http://127.0.0.1:8080/library', async (route) => {
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
})
