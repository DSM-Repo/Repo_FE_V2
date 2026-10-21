import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

import { authenticateAs } from './auth-fixtures'

const firstComment = '소개를 구체적으로 작성해주세요.\n두 번째 줄도 전체 내용으로 확인할 수 있어야 합니다.'
const lastComment = '마지막 페이지의 경험을 보완해주세요.\n맡은 역할과 결과를 함께 적어주세요.'

async function mockFeedbackReview(page: Page, options: {
  readonly failLastDelete?: boolean
  readonly firstComment?: string
  readonly firstX?: number
} = {}) {
  const createdBodies: Record<string, unknown>[] = []
  const deletedIds: string[] = []
  let failLastDelete = options.failLastDelete ?? false
  let feedbacks = [
    { id: 'feedback-first', pageId: 'profile-page', comment: options.firstComment ?? firstComment, x: options.firstX ?? 0.3, y: 0.3 },
    { id: 'feedback-last', pageId: 'last-page', comment: lastComment, x: 0.4, y: 0.5 },
  ].map((feedback) => ({
    ...feedback,
    completedAt: null,
    createdAt: '2026-10-01T07:00:00.000Z',
    status: 'PENDING',
    teacher: { name: '담임 선생님' },
  }))

  await authenticateAs(page, 'TEACHER')
  await page.route(`${apiBaseUrl}/user/refresh`, async (route) => {
    await route.fulfill({ status: 503, json: { message: '인증 갱신 서버에 일시적으로 연결할 수 없습니다.' } })
  })
  await page.route(`${apiBaseUrl}/resume/students/1`, async (route) => {
    await route.fulfill({ json: {
      email: 'student@dsm.hs.kr',
      id: 'resume-id',
      introduce: '자기소개\n프로젝트를 만드는 학생입니다.',
      isPublic: false,
      majorName: 'Frontend Developer',
      name: '테스트 학생',
      pages: [
        { id: 'profile-page', index: 0, type: 'PROFILE', content: '첫 페이지 본문' },
        { id: 'project-page', index: 1, type: 'PROJECT', content: '프로젝트 본문', project: {
          name: '프로젝트', summary: '프로젝트 요약', startDate: '2026-03', endDate: '2026-09', imageUrl: '',
        } },
        { id: 'last-page', index: 2, type: 'FREE', content: '마지막 페이지 본문' },
      ],
      portfolioUrl: '',
      profileImageUrl: '',
      savedAt: '2026-10-01T08:00:00.000Z',
      skills: ['React'],
      submissionStatus: 'SUBMITTED',
    } })
  })
  await page.route(`${apiBaseUrl}/feedback?documentId=resume-id`, async (route) => {
    await route.fulfill({ json: { content: feedbacks, totalElements: feedbacks.length } })
  })
  await page.route(`${apiBaseUrl}/feedback`, async (route) => {
    expect(route.request().method()).toBe('POST')
    const body: Record<string, unknown> = route.request().postDataJSON()
    createdBodies.push(body)
    await route.fulfill({ status: 201, json: {
      feedbackId: 'feedback-created',
      pageId: body.pageId,
      x: body.x,
      y: body.y,
      createdAt: '2026-10-01T08:30:00.000Z',
    } })
  })
  await page.route(`${apiBaseUrl}/feedback/*`, async (route) => {
    expect(route.request().method()).toBe('DELETE')
    const id = new URL(route.request().url()).pathname.split('/').at(-1) ?? ''
    deletedIds.push(id)
    if (failLastDelete && id === 'feedback-last') {
      await route.fulfill({ status: 403, json: { error: { message: '이 피드백은 작성자만 삭제할 수 있습니다.' } } })
      return
    }
    feedbacks = feedbacks.filter((feedback) => feedback.id !== id)
    await route.fulfill({ status: 204 })
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/students/1')
  await expect(page.getByLabel('테스트 학생 이력서 1쪽')).toBeVisible()

  return {
    createdBodies,
    deletedIds,
    allowLastDelete: () => { failLastDelete = false },
  }
}

test('only composes after placement is requested and hides markers with feedback view off', async ({ page }) => {
  const mocks = await mockFeedbackReview(page)
  const sheet = page.getByLabel('테스트 학생 이력서 1쪽')
  await sheet.click({ position: { x: 80, y: 160 } })
  await expect(page.getByRole('dialog', { name: '피드백 작성' })).toHaveCount(0)
  await expect(page.getByRole('complementary', { name: '피드백 목록' })).toHaveCount(0)

  await page.getByRole('switch', { name: '피드백 보기' }).click()
  const marker = page.getByRole('button', { name: '피드백 위치: 소개를 구체적으로 작성해주세요.' })
  await expect(marker).toBeVisible()
  await expect(page.getByRole('textbox', { name: '새 피드백', exact: true })).toHaveCount(0)
  const markerBox = await marker.boundingBox()
  expect(markerBox).not.toBeNull()
  expect(markerBox!.width).toBeLessThanOrEqual(36)
  expect(markerBox!.height).toBeLessThanOrEqual(36)
  await expect(marker.locator('svg')).toHaveCount(1)
  await expect(marker.locator('img')).toHaveCount(0)

  await page.getByRole('switch', { name: '피드백 보기' }).click()
  await expect(marker).toHaveCount(0)
  await expect(page.getByRole('complementary', { name: '피드백 목록' })).toHaveCount(0)
  expect(mocks.createdBodies).toHaveLength(0)
})

test('saves the selected project page and noncentral coordinates, then closes the composer', async ({ page }) => {
  const mocks = await mockFeedbackReview(page)
  await page.getByRole('button', { name: /피드백 추가/ }).click()
  await expect(page.getByText('피드백을 남길 위치를 선택해주세요.')).toBeVisible()
  const projectSheet = page.getByLabel('테스트 학생 이력서 2쪽')
  const sheetBox = await projectSheet.boundingBox()
  expect(sheetBox).not.toBeNull()
  await projectSheet.click({ position: { x: sheetBox!.width * 0.23, y: sheetBox!.height * 0.67 } })
  await expect(page.getByRole('textbox', { name: '새 피드백', exact: true })).toBeFocused()
  await page.getByRole('textbox', { name: '새 피드백', exact: true }).fill('선택한 프로젝트 위치에 남기는 피드백')
  await page.getByRole('button', { name: '피드백 저장' }).click()
  await expect.poll(() => mocks.createdBodies.length).toBe(1)
  expect(mocks.createdBodies[0]).toMatchObject({
    comment: '선택한 프로젝트 위치에 남기는 피드백', documentId: 'resume-id', pageId: 'project-page',
  })
  expect(mocks.createdBodies[0].x).toBeCloseTo(0.23, 2)
  expect(mocks.createdBodies[0].y).toBeCloseTo(0.67, 2)
  await expect(page.getByRole('dialog', { name: '피드백 작성' })).toHaveCount(0)
  await expect(page.getByRole('switch', { name: '피드백 보기' })).toBeChecked()
  await expect(page.getByRole('complementary', { name: '피드백 목록' }).getByRole('button', { name: /선택한 프로젝트 위치에 남기는 피드백/ })).toBeVisible()
  await expect(projectSheet.getByRole('button', { name: '피드백 위치: 선택한 프로젝트 위치에 남기는 피드백' })).toBeVisible()
})

test('cancels placement and discards a composer draft with Escape or the cancel button', async ({ page }) => {
  const mocks = await mockFeedbackReview(page)
  const addButton = page.getByRole('button', { name: /피드백 추가/ })
  await addButton.click()
  await page.keyboard.press('Escape')
  await expect(page.getByText('피드백을 남길 위치를 선택해주세요.')).toHaveCount(0)
  for (const cancelWithEscape of [true, false]) {
    await addButton.click()
    await page.getByRole('button', { name: '현재 페이지 중앙에 추가' }).click()
    await page.getByRole('textbox', { name: '새 피드백', exact: true }).fill('저장하지 않을 임시 내용')
    if (cancelWithEscape) await page.keyboard.press('Escape')
    else await page.getByRole('button', { name: '피드백 작성 취소' }).click()
    await expect(page.getByRole('dialog', { name: '피드백 작성' })).toHaveCount(0)
    await expect(addButton).toBeFocused()
  }
  await addButton.click()
  await page.getByRole('button', { name: '현재 페이지 중앙에 추가' }).click()
  await expect(page.getByRole('textbox', { name: '새 피드백', exact: true })).toHaveValue('')
  await expect(page.getByRole('button', { name: '피드백 저장' })).toBeDisabled()
  expect(mocks.createdBodies).toHaveLength(0)
})

test('expands only feedback details without repeating the title and navigates to an offscreen page', async ({ page }, testInfo) => {
  await mockFeedbackReview(page)
  await page.getByRole('switch', { name: '피드백 보기' }).click()
  const panel = page.getByRole('complementary', { name: '피드백 목록' })
  const firstRow = panel.getByRole('button', { name: /소개를 구체적으로 작성해주세요/ })
  await expect(firstRow).toHaveAttribute('aria-expanded', 'false')
  await firstRow.click()
  await expect(firstRow).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.getByText(firstComment.split('\n')[0], { exact: true })).toHaveCount(1)
  await expect(panel.getByRole('paragraph')).toHaveText(firstComment.split('\n').slice(1).join('\n'))
  await expect(panel.getByText(firstComment, { exact: true })).toHaveCount(0)
  await firstRow.click()
  await expect(firstRow).toHaveAttribute('aria-expanded', 'false')
  await expect(panel.getByRole('paragraph')).toHaveCount(0)

  await expect(page.getByLabel('테스트 학생 이력서 3쪽')).toHaveCount(0)
  const lastRow = panel.getByRole('button', { name: /마지막 페이지의 경험을 보완해주세요/ })
  await lastRow.click()
  await expect(lastRow).toHaveAttribute('aria-expanded', 'true')
  await expect(panel.getByText(lastComment.split('\n')[0], { exact: true })).toHaveCount(1)
  await expect(panel.getByRole('paragraph')).toHaveText(lastComment.split('\n').slice(1).join('\n'))
  await expect(panel.getByText(lastComment, { exact: true })).toHaveCount(0)
  const lastSheet = page.getByLabel('테스트 학생 이력서 3쪽')
  await expect(lastSheet).toBeVisible()
  const marker = lastSheet.getByRole('button', { name: '피드백 위치: 마지막 페이지의 경험을 보완해주세요.' })
  await expect(marker).toBeVisible()
  await expect(marker.locator('..')).toHaveAttribute('data-selected', 'true')
  await page.screenshot({ path: testInfo.outputPath('desktop-feedback-expanded.png'), fullPage: true })
})

for (const firstX of [0.3, 0.9]) {
  test(`keeps compact hover content aligned and a single-line comment unduplicated at x=${firstX}`, async ({ page }, testInfo) => {
    await mockFeedbackReview(page, { firstComment: '2345', firstX })
    await page.getByRole('switch', { name: '피드백 보기' }).click()
    const panel = page.getByRole('complementary', { name: '피드백 목록' })
    const row = panel.getByRole('button', { name: /2345/ })
    await row.click()
    await expect(row).toHaveAttribute('aria-expanded', 'true')
    await expect(panel.getByText('2345', { exact: true })).toHaveCount(1)
    await expect(panel.getByRole('paragraph')).toHaveCount(0)

    const sheet = page.getByLabel('테스트 학생 이력서 1쪽')
    const marker = sheet.getByRole('button', { name: '피드백 위치: 2345' })
    await marker.hover()
    const tooltip = marker.locator('..').locator(':scope > div')
    await expect(tooltip).toHaveCSS('opacity', '1')
    const [avatarBox, glyphBox, tooltipBox, titleBox, statusBox, sheetBox] = await Promise.all([
      marker.boundingBox(), marker.locator('svg').boundingBox(), tooltip.boundingBox(),
      tooltip.getByText('2345', { exact: true }).boundingBox(),
      tooltip.getByText('선택됨', { exact: true }).boundingBox(), sheet.boundingBox(),
    ])
    expect(avatarBox).not.toBeNull()
    expect(glyphBox).not.toBeNull()
    expect(tooltipBox).not.toBeNull()
    expect(titleBox).not.toBeNull()
    expect(statusBox).not.toBeNull()
    expect(sheetBox).not.toBeNull()
    expect(avatarBox!.width).toBeLessThanOrEqual(36)
    expect(avatarBox!.height).toBeLessThanOrEqual(36)
    expect(glyphBox!.width).toBeLessThanOrEqual(26)
    expect(glyphBox!.height).toBeLessThanOrEqual(26)
    expect(tooltipBox!.width).toBeLessThanOrEqual(240)
    expect(Math.abs(tooltipBox!.y - avatarBox!.y)).toBeLessThanOrEqual(1)
    expect(Math.abs(tooltipBox!.height - avatarBox!.height)).toBeLessThanOrEqual(1)
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(statusBox!.x)
    expect(tooltipBox!.x).toBeGreaterThanOrEqual(sheetBox!.x)
    expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(sheetBox!.x + sheetBox!.width)
    if (firstX > 0.5) {
      expect(tooltipBox!.x + tooltipBox!.width).toBeLessThanOrEqual(avatarBox!.x + 4.5)
    } else {
      expect(tooltipBox!.x).toBeGreaterThanOrEqual(avatarBox!.x + avatarBox!.width - 4.5)
    }
    await page.screenshot({ path: testInfo.outputPath(`desktop-feedback-hover-${firstX > 0.5 ? 'left' : 'right'}.png`), fullPage: true })
  })
}

for (const partialFailure of [false, true]) {
  test(`deletes selected feedback and ${partialFailure ? 'retains failed selections with the server message for retry' : 'removes all successful rows and markers'}`, async ({ page }, testInfo) => {
    const mocks = await mockFeedbackReview(page, { failLastDelete: partialFailure })
    await page.getByRole('switch', { name: '피드백 보기' }).click()
    const panel = page.getByRole('complementary', { name: '피드백 목록' })
    await panel.getByRole('button', { name: '선택하기' }).click()
    await panel.getByRole('checkbox', { name: '소개를 구체적으로 작성해주세요. 선택' }).check()
    await panel.getByRole('checkbox', { name: '마지막 페이지의 경험을 보완해주세요. 선택' }).check()
    await expect(panel.getByText('2개 선택됨')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath('desktop-feedback-selected-for-deletion.png'), fullPage: true })
    await panel.getByRole('button', { name: '피드백 삭제' }).click()
    await expect.poll(() => mocks.deletedIds.length).toBe(2)
    expect([...mocks.deletedIds].sort()).toEqual(['feedback-first', 'feedback-last'])
    await expect(panel.getByText('소개를 구체적으로 작성해주세요.', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '피드백 위치: 소개를 구체적으로 작성해주세요.' })).toHaveCount(0)

    if (partialFailure) {
      await expect(page.getByText('이 피드백은 작성자만 삭제할 수 있습니다.', { exact: true })).toBeVisible()
      await expect(panel.getByText('1개 선택됨')).toBeVisible()
      await expect(panel.getByRole('checkbox', { name: '마지막 페이지의 경험을 보완해주세요. 선택' })).toBeChecked()
      await page.screenshot({ path: testInfo.outputPath('desktop-feedback-partial-delete-error.png'), fullPage: true })
      mocks.allowLastDelete()
      await panel.getByRole('button', { name: '피드백 삭제' }).click()
      await expect.poll(() => mocks.deletedIds.length).toBe(3)
      expect(mocks.deletedIds[2]).toBe('feedback-last')
    }
    await expect(page.getByText('피드백을 삭제했습니다.')).toBeVisible()
    await expect(panel.getByText('아직 받은 피드백이 없습니다.')).toBeVisible()
    await expect(panel.getByRole('checkbox')).toHaveCount(0)
  })
}
