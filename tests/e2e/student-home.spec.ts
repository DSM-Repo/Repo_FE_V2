import { expect, test } from '@playwright/test'

test.describe('student home page', () => {
  test('renders the student dashboard content and navigation state', async ({ page }) => {
    await page.goto('/home')

    const mainNavigation = page.getByRole('navigation', { name: '주요 메뉴' })
    await expect(mainNavigation.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')
    await expect(mainNavigation.getByRole('link', { name: '이력서 관리' })).toHaveAttribute(
      'href',
      '/student/resume',
    )
    await expect(mainNavigation.getByRole('link', { name: '도서관' })).toHaveAttribute('href', '/library')

    await expect(page.getByRole('heading', { level: 1, name: /홍길동/ })).toBeVisible()
    await expect(page.getByText('Frontend Developer')).toBeVisible()
    await expect(page.getByText(/한줄소개가/)).toBeVisible()
    await expect(page.getByRole('progressbar', { name: '이력서 완성도 17%' })).toHaveAttribute(
      'aria-valuenow',
      '17',
    )
  })

  test('links to resume management and library from shortcut cards', async ({ page }) => {
    await page.goto('/home')

    await expect(page.getByRole('link', { name: /이력서 관리 바로가기/ })).toHaveAttribute(
      'href',
      '/student/resume',
    )
    await expect(page.getByRole('link', { name: /도서관 바로가기/ })).toHaveAttribute('href', '/library')
  })

  test('uses decorative assets inside shortcut cards', async ({ page }) => {
    await page.goto('/home')

    const resumeShortcut = page.getByRole('link', { name: /이력서 관리 바로가기/ })
    const libraryShortcut = page.getByRole('link', { name: /도서관 바로가기/ })

    await expect(resumeShortcut.locator('img')).toHaveCount(2)
    await expect(resumeShortcut.locator('img').first()).toHaveAttribute(
      'src',
      /\/assets\/student-home\/resume-/,
    )
    await expect(resumeShortcut.locator('img').nth(1)).toHaveAttribute(
      'src',
      /\/assets\/student-home\/resume-/,
    )
    await expect(resumeShortcut.getByRole('img')).toHaveCount(0)

    await expect(libraryShortcut.locator('img')).toHaveCount(2)
    await expect(libraryShortcut.locator('img').first()).toHaveAttribute(
      'src',
      /\/assets\/student-home\/library-/,
    )
    await expect(libraryShortcut.locator('img').nth(1)).toHaveAttribute(
      'src',
      /\/assets\/student-home\/library-/,
    )
    await expect(libraryShortcut.getByRole('img')).toHaveCount(0)
  })

  test('keeps resume shortcut copy separated from decorative document art on desktop', async ({ page }) => {
    await page.setViewportSize({ height: 924, width: 1640 })
    await page.goto('/home')

    const resumeShortcut = page.getByRole('link', { name: /이력서 관리 바로가기/ })
    const titleBox = await resumeShortcut.locator('strong').boundingBox()
    const frontDocumentBox = await resumeShortcut.locator('img').nth(1).boundingBox()

    expect(titleBox).not.toBeNull()
    expect(frontDocumentBox).not.toBeNull()
    expect(frontDocumentBox!.x).toBeGreaterThanOrEqual(titleBox!.x + titleBox!.width + 20)
  })

  test('renders the notification list with eight items', async ({ page }) => {
    await page.goto('/home')

    const notifications = page.getByRole('region', { name: '알림 목록' })
    await expect(notifications.getByRole('heading', { name: '알림 목록' })).toBeVisible()
    await expect(notifications.getByRole('listitem')).toHaveCount(8)
  })

  test('keeps dashboard columns from overlapping on desktop', async ({ page }) => {
    await page.setViewportSize({ height: 854, width: 1528 })
    await page.goto('/home')

    await expect
      .poll(async () => {
        const [progressPanel, shortcuts, notificationPanel] = await Promise.all([
          page.getByRole('region', { name: '이력서 완성도' }).boundingBox(),
          page.getByLabel('바로가기').boundingBox(),
          page.getByRole('region', { name: '알림 목록' }).boundingBox(),
        ])

        if (!progressPanel || !shortcuts || !notificationPanel) {
          return false
        }

        return [progressPanel, shortcuts].every((element) => element.x + element.width <= notificationPanel.x)
      })
      .toBe(true)
  })

  test('keeps primary sections visible without horizontal overflow on narrow screens', async ({ page }) => {
    await page.setViewportSize({ height: 844, width: 390 })
    await page.goto('/home')

    await expect(page.getByRole('heading', { level: 1, name: /홍길동/ })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: '이력서 완성도 17%' })).toBeVisible()
    await expect(page.getByRole('link', { name: /이력서 관리 바로가기/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: '알림 목록' })).toBeVisible()

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  })
})
