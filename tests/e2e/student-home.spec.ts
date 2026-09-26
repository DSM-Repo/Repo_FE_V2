import { expect, test } from '@playwright/test'

import { authenticateWithAccessToken, createTestAccessToken } from './auth-fixtures'

const apiBaseUrl = 'http://52.78.201.218'
const studentAccessToken = createTestAccessToken('STUDENT')
const defaultUser = {
  classInfo: {
    classNumber: 1,
    grade: 1,
    number: 1,
    schoolNumber: '1101',
  },
  introduce: '',
  major: null,
  name: '테스트 학생',
  profileImageUrl: null,
  progress: {
    sections: [],
    totalPercent: 0,
  },
} as const

test.describe('student home page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateWithAccessToken(page, studentAccessToken)
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({
        body: JSON.stringify(defaultUser),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/alram`, async (route) => {
      await route.fulfill({
        body: JSON.stringify([]),
        contentType: 'application/json',
        status: 200,
      })
    })
  })

  test('keeps the loading state from flashing a missing-profile message', async ({ page }) => {
    let releaseUserRequest: (() => void) | undefined

    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await new Promise<void>((resolve) => {
        releaseUserRequest = resolve
      })
      await route.fulfill({
        body: JSON.stringify(defaultUser),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/home')

    await expect(page.getByText('내 정보를 불러오는 중입니다.')).toBeVisible()
    await expect(page.getByText('내 정보가 없습니다.')).toHaveCount(0)

    expect(releaseUserRequest).toBeDefined()
    releaseUserRequest?.()

    await expect(page.getByRole('heading', { level: 1, name: /테스트 학생/ })).toBeVisible()
  })

  test('renders the student dashboard content and navigation state', async ({ page }) => {
    await page.goto('/home')

    const mainNavigation = page.getByRole('navigation', { name: '주요 메뉴' })
    await expect(mainNavigation.getByRole('link', { name: '홈' })).toHaveAttribute('aria-current', 'page')
    await expect(mainNavigation.getByRole('link', { name: '이력서 관리' })).toHaveAttribute(
      'href',
      '/resume',
    )
    await expect(mainNavigation.getByRole('link', { name: '도서관' })).toHaveAttribute('href', '/library')

    await expect(page.getByRole('heading', { level: 1, name: /테스트 학생/ })).toBeVisible()
    await expect(page.getByText('이력서를 저장하면 홈에서 내 정보를 확인할 수 있습니다.')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: '이력서 완성도 0%' })).toHaveAttribute(
      'aria-valuenow',
      '0',
    )
  })

  test('renders logged-in user info and resume progress from API', async ({ page }) => {
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${studentAccessToken}`)

      await route.fulfill({
        body: JSON.stringify({
          classInfo: {
            classNumber: 4,
            grade: 2,
            number: 15,
            schoolNumber: '2415',
          },
          introduce: '나만의 이력서를 작성 중입니다.',
          major: '인공지능소프트웨어과',
          name: '홍길동',
          profileImageUrl: '',
          progress: {
            sections: [
              { completed: true, key: 'PROFILE', name: '내 정보' },
              { completed: false, key: 'ACTIVITY', name: '활동' },
              { completed: false, key: 'PROJECT', name: '프로젝트' },
            ],
            totalPercent: 35,
          },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/home')

    await expect(page.getByRole('heading', { level: 1, name: /홍길동/ })).toBeVisible()
    await expect(page.getByText('2415 인공지능소프트웨어과')).toBeVisible()
    await expect(page.getByText('나만의 이력서를 작성 중입니다.')).toBeVisible()
    await expect(page.getByRole('progressbar', { name: '이력서 완성도 35%' })).toHaveAttribute('aria-valuenow', '35')
    await expect(page.getByText('완료')).toHaveCount(1)
  })

  test('redirects to login when auth reissue fails after protected API rejection', async ({ page }) => {
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      expect(route.request().headers()['authorization']).toBe(`Bearer ${studentAccessToken}`)

      await route.fulfill({
        status: 401,
      })
    })
    await page.route(`${apiBaseUrl}/user/refresh`, async (route) => {
      expect(route.request().headers()['refresh-token']).toBe('test-refresh-token')

      await route.fulfill({
        status: 403,
      })
    })

    await page.goto('/home')

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.evaluate(() => window.localStorage.getItem('repo.auth.accessToken'))).resolves.toBeNull()
    await expect(page.evaluate(() => window.localStorage.getItem('repo.auth.refreshToken'))).resolves.toBeNull()
  })

  test('links to resume management and library from shortcut cards', async ({ page }) => {
    await page.goto('/home')

    await expect(page.getByRole('link', { name: /이력서 관리 바로가기/ })).toHaveAttribute(
      'href',
      '/resume',
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

  test('renders the empty notification state', async ({ page }) => {
    await page.goto('/home')

    const notifications = page.getByRole('region', { name: '알림 목록' })
    await expect(notifications.getByRole('heading', { name: '알림 목록' })).toBeVisible()
    await expect(notifications.getByText('새 알림이 없습니다.')).toBeVisible()
    await expect(notifications.getByRole('listitem')).toHaveCount(0)
  })

  test('renders notifications and lets a student mark one as read and delete it', async ({ page }) => {
    await page.route(`${apiBaseUrl}/alram`, async (route) => {
      await route.fulfill({
        body: JSON.stringify([
          {
            alramId: 'alram-1',
            content: '새 피드백이 도착했습니다.',
            createdAt: '2026-09-26T09:30:00.000Z',
            feedbackId: 'feedback-1',
            isRead: false,
            resumeId: 'resume-1',
            type: 'FEEDBACK_CREATED',
          },
        ]),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/alram/alram-1`, async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          body: JSON.stringify({ isRead: true }),
          contentType: 'application/json',
          status: 200,
        })
        return
      }

      await route.fulfill({
        status: 204,
      })
    })

    await page.goto('/home')

    const notifications = page.getByRole('region', { name: '알림 목록' })
    const item = notifications.getByRole('listitem').filter({ hasText: '새 피드백이 도착했습니다.' })
    await expect(item).toBeVisible()

    await item.getByRole('button', { name: '읽음' }).click()
    await expect(item.getByRole('button', { name: '읽음' })).toBeDisabled()

    await item.getByRole('button', { name: '삭제' }).click()
    await expect(notifications.getByRole('listitem')).toHaveCount(0)
    await expect(notifications.getByText('새 알림이 없습니다.')).toBeVisible()
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

    await expect(page.getByRole('heading', { level: 1, name: /테스트 학생/ })).toBeVisible()
    await expect(page.getByRole('progressbar', { name: '이력서 완성도 0%' })).toBeVisible()
    await expect(page.getByRole('link', { name: /이력서 관리 바로가기/ })).toBeVisible()
    await expect(page.getByRole('heading', { name: '알림 목록' })).toBeVisible()

    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true)
  })
})
