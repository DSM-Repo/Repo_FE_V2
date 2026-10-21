import { apiBaseUrl, expect, test } from './test-fixtures'

import { authenticateAs } from './auth-fixtures'

for (const width of [390, 720]) {
  test(`keeps teacher review controls usable on narrow screens at ${width}px`, async ({ page }, testInfo) => {
    await authenticateAs(page, 'TEACHER')
    await page.route(`${apiBaseUrl}/resume/students/1`, async (route) => {
      await route.fulfill({
        json: {
          email: 'student@dsm.hs.kr',
          id: 'resume-id',
          introduce: '제출 전 이력서',
          isPublic: false,
          majorName: 'Frontend Developer',
          name: '김학생',
          pages: [{ content: '모바일에서도 볼 수 있는 이력서입니다.', id: 'profile-page', index: 0, type: 'PROFILE' }],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-10-01T08:00:00.000Z',
          skills: ['React'],
          submissionStatus: 'ONGOING',
        },
      })
    })
    await page.route(`${apiBaseUrl}/feedback?documentId=resume-id`, async (route) => {
      await route.fulfill({
        json: {
          feedbacks: [],
          numberOfData: 0,
        },
      })
    })
    await page.setViewportSize({ height: 854, width })
    await page.goto('/students/1')

    await expect(page.getByText('김학생')).toBeVisible()
    await expect(page.getByLabel('학생 이력서 검토 설정')).toBeVisible()
    await expect(page.getByRole('button', { name: /피드백 추가/ })).toBeEnabled()
    const sheet = await page.getByLabel('김학생 이력서 1쪽').boundingBox()
    const addButton = await page.getByRole('button', { name: /피드백 추가/ }).boundingBox()
    const settings = await page.getByLabel('학생 이력서 검토 설정').boundingBox()
    expect(sheet).not.toBeNull()
    expect(addButton).not.toBeNull()
    expect(settings).not.toBeNull()
    expect(sheet!.x).toBeGreaterThanOrEqual(0)
    expect(sheet!.x + sheet!.width).toBeLessThanOrEqual(width)
    const controlsOverlap = addButton!.x < settings!.x + settings!.width
      && addButton!.x + addButton!.width > settings!.x
      && addButton!.y < settings!.y + settings!.height
      && addButton!.y + addButton!.height > settings!.y
    expect(controlsOverlap, '피드백 추가 버튼과 공개·피드백 보기 설정은 겹치지 않아야 합니다.').toBe(false)
    if (width === 390) {
      await page.screenshot({ path: testInfo.outputPath('mobile-390-feedback-review.png'), fullPage: true })
    }
    await page.getByRole('button', { name: /피드백 추가/ }).click()
    await expect(page.getByText('피드백을 남길 위치를 선택해주세요.')).toBeVisible()
    await page.getByRole('button', { name: '현재 페이지 중앙에 추가' }).click()
    await expect(page.getByRole('textbox', { name: '새 피드백', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '피드백 저장' })).toBeVisible()
    await expect(page.getByRole('button', { name: '피드백 작성 취소' })).toBeVisible()
    const composer = await page.getByRole('dialog', { name: '피드백 작성' }).boundingBox()
    expect(composer).not.toBeNull()
    expect(composer!.x).toBeGreaterThanOrEqual(0)
    expect(composer!.x + composer!.width).toBeLessThanOrEqual(width)
    expect(composer!.y).toBeGreaterThanOrEqual(0)
    expect(composer!.y + composer!.height).toBeLessThanOrEqual(854)
    if (width === 390) {
      await page.screenshot({ path: testInfo.outputPath('mobile-390-feedback-composer.png'), fullPage: true })
    }
    await page.getByRole('button', { name: '피드백 작성 취소' }).click()
    await expect(page.getByRole('switch', { name: '이력서 공개' })).toBeEnabled()
    await expect(page.getByRole('switch', { name: '피드백 보기' })).toBeEnabled()
  })
}
