import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

import { authenticateAs } from './auth-fixtures'

function createResumeResponse(submissionStatus = 'SUBMITTED', isPublic = false) {
  return {
    email: 'student@dsm.hs.kr',
    id: 'resume-id',
    introduce: '한줄 자기소개\n문제를 제품으로 풀어내는 개발자입니다.',
    isPublic,
    majorName: 'Frontend Developer',
    name: '김학생',
    pages: [
      { content: '기술스택과 활동을 정리했습니다.', id: 'profile-page', index: 0, type: 'PROFILE' },
      {
        content: '프로젝트 상세 설명입니다.',
        id: 'project-page',
        index: 1,
        project: {
          endDate: '2026-09',
          imageUrl: '',
          name: 'Repo',
          startDate: '2026-03',
          summary: '학생 포트폴리오 관리 서비스',
        },
        type: 'PROJECT',
      },
    ],
    portfolioUrl: '',
    profileImageUrl: '',
    savedAt: '2026-10-01T08:00:00.000Z',
    skills: ['TypeScript', 'React'],
    submissionStatus,
  }
}

async function mockTeacherResumeReview(
  page: Page,
  options: { readonly isPublic?: boolean; readonly submissionStatus?: string } = {},
) {
  let visibilityRequestBody = ''
  let createdFeedbackRequestBody = ''
  await page.route(`${apiBaseUrl}/resume/students/1`, async (route) => {
    await route.fulfill({
      json: createResumeResponse(options.submissionStatus, options.isPublic ?? false),
    })
  })
  await page.route(`${apiBaseUrl}/resume/students/1/visibility`, async (route) => {
    visibilityRequestBody = route.request().postData() ?? ''
    await route.fulfill({
      json: { isPublic: true },
    })
  })
  await page.route(`${apiBaseUrl}/feedback?documentId=resume-id`, async (route) => {
    await route.fulfill({
      json: {
        content: [
          {
            comment: '프로젝트 성과를 숫자로 표현해보세요.',
            completedAt: null,
            createdAt: '2026-10-01T07:00:00.000Z',
            id: 'feedback-1',
            pageId: 'project-page',
            status: 'PENDING',
            teacher: { name: '담임 선생님' },
            x: 0.42,
            y: 0.36,
          },
        ],
        totalElements: 1,
      },
    })
  })
  await page.route(`${apiBaseUrl}/feedback`, async (route) => {
    createdFeedbackRequestBody = route.request().postData() ?? ''
    await route.fulfill({
      json: {
        createdAt: '2026-10-01T08:30:00.000Z',
        feedbackId: 'feedback-created',
        pageId: 'profile-page',
        x: 0.5,
        y: 0.5,
      },
      status: 201,
    })
  })

  return {
    getCreatedFeedbackRequestBody: () => createdFeedbackRequestBody,
    getVisibilityRequestBody: () => visibilityRequestBody,
  }
}

test.describe('teacher student portfolio review', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'TEACHER')
  })

  test('keeps the teacher-only review route available', async ({ page }) => {
    await mockTeacherResumeReview(page)

    await page.goto('/students/1')
    await expect(page).toHaveURL(/\/students\/1$/)
    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByText('학생 관리')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('loads a student resume, publishes it, and opens feedback with the student resume API', async ({ page }) => {
    const mocks = await mockTeacherResumeReview(page)
    await page.route(`${apiBaseUrl}/library`, async (route) => {
      await route.fulfill({ json: [] })
    })
    await page.route(`${apiBaseUrl}/library/search?*`, async (route) => {
      await route.fulfill({
        json: { content: [], totalElements: 0 },
      })
    })
    await page.route(`${apiBaseUrl}/library/1`, async (route) => {
      await route.fulfill({
        json: { message: '공개 상세 반영 중입니다.' },
        status: 404,
      })
    })
    await page.setViewportSize({ height: 854, width: 1528 })

    await page.goto('/students/1')

    await expect(page.getByLabel('학생 포트폴리오 검토')).toBeVisible()
    await expect(page.getByText('학생 이력서를 불러올 수 없습니다.')).toHaveCount(0)
    await expect(page.getByText('김학생')).toBeVisible()
    await expect(page.getByText('TypeScript')).toBeVisible()
    await expect(page.getByLabel('김학생 이력서 1쪽')).toHaveCSS('aspect-ratio', '423 / 599')
    const sheetBox = await page.getByLabel('김학생 이력서 1쪽').boundingBox()
    expect(sheetBox).not.toBeNull()
    expect(sheetBox?.width).toBeGreaterThan(360)
    expect(sheetBox ? sheetBox.height / sheetBox.width : 0).toBeCloseTo(599 / 423, 1)
    await expect(page.getByRole('button', { name: '필터 열기' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '전체 PDF 다운로드' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /피드백 추가/ })).toBeEnabled()

    await page.getByRole('button', { name: /피드백 추가/ }).click()
    await expect(page.getByRole('complementary', { name: '피드백 목록' })).toBeVisible()
    await expect(page.getByLabel('새 피드백')).toBeFocused()
    await page.getByLabel('새 피드백').fill('프로젝트 성과를 구체적으로 적어주세요.')
    await page.getByRole('button', { name: '피드백 저장' }).click()
    await expect.poll(() => {
      const body = mocks.getCreatedFeedbackRequestBody()
      return body ? JSON.parse(body) : undefined
    }).toEqual({
      comment: '프로젝트 성과를 구체적으로 적어주세요.',
      documentId: 'resume-id',
      pageId: 'profile-page',
      x: 0.5,
      y: 0.5,
    })
    await expect(page.getByText('피드백을 추가했습니다.')).toBeVisible()
    const feedbackPanel = page.getByRole('complementary', { name: '피드백 목록' })
    await expect(feedbackPanel.getByRole('button', { name: /프로젝트 성과를 구체적으로 적어주세요/ })).toBeVisible()

    await page.getByRole('switch', { name: '이력서 공개' }).click()
    await expect.poll(() => mocks.getVisibilityRequestBody()).toBe(JSON.stringify({ isPublic: true }))
    await expect(page.getByText('이력서를 도서관에 공개했습니다.')).toBeVisible()

    await expect(feedbackPanel).toBeVisible()
    await expect(feedbackPanel.getByRole('button', { name: /프로젝트 성과를 숫자로 표현해보세요/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole('switch', { name: '이력서 공개' })).toBeChecked()
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '도서관' }).click()
    await page.getByRole('link', { name: '2026 11기 2학년 포트폴리오 열람' }).click()
    await page.getByRole('link', { name: /김학생/ }).click()
    await expect(page.getByLabel('김학생 이력서 1쪽')).toBeVisible()
    await expect(page.getByText('기술스택과 활동을 정리했습니다.')).toBeVisible()
  })

  test('keeps the resume sheets clear of the feedback button on short desktop viewports', async ({ page }) => {
    await mockTeacherResumeReview(page)
    await page.setViewportSize({ height: 702, width: 927 })

    await page.goto('/students/1')

    const sheetBox = await page.getByLabel('김학생 이력서 1쪽').boundingBox()
    const feedbackButtonBox = await page.getByRole('button', { name: /피드백 추가/ }).boundingBox()

    expect(sheetBox).not.toBeNull()
    expect(feedbackButtonBox).not.toBeNull()
    expect(sheetBox?.width).toBeGreaterThan(280)
    expect(sheetBox ? sheetBox.height / sheetBox.width : 0).toBeCloseTo(599 / 423, 1)
    expect(sheetBox && feedbackButtonBox ? sheetBox.y + sheetBox.height : Number.POSITIVE_INFINITY).toBeLessThan(
      feedbackButtonBox?.y ?? 0,
    )
  })

  test('keeps the publication switch clickable and shows the server rejection for pre-submit resumes', async ({ page }) => {
    await mockTeacherResumeReview(page, { submissionStatus: 'ONGOING' })
    await page.route(`${apiBaseUrl}/resume/students/1/visibility`, async (route) => {
      await route.fulfill({
        json: { message: '제출 전 이력서는 공개할 수 없습니다.' },
        status: 400,
      })
    })

    await page.goto('/students/1')

    await expect(page.getByText('김학생')).toBeVisible()
    await expect(page.getByRole('switch', { name: '이력서 공개' })).toBeEnabled()
    await page.getByRole('switch', { name: '이력서 공개' }).click()
    await expect(page.getByText('제출 전 이력서는 공개할 수 없습니다.')).toBeVisible()
    await expect(page.getByRole('switch', { name: '피드백 보기' })).toBeEnabled()
  })

  test('publishes a submitted resume when the visibility API returns no body', async ({ page }) => {
    let visibilityRequestBody = ''

    await page.route(`${apiBaseUrl}/resume/students/1`, async (route) => {
      await route.fulfill({
        json: createResumeResponse('SUBMITTED', false),
      })
    })
    await page.route(`${apiBaseUrl}/resume/students/1/visibility`, async (route) => {
      visibilityRequestBody = route.request().postData() ?? ''
      await route.fulfill({ status: 204 })
    })
    await page.route(`${apiBaseUrl}/feedback?documentId=resume-id`, async (route) => {
      await route.fulfill({
        json: { feedbacks: [], numberOfData: 0 },
      })
    })

    await page.goto('/students/1')
    await page.getByRole('switch', { name: '이력서 공개' }).click()

    await expect.poll(() => visibilityRequestBody).toBe(JSON.stringify({ isPublic: true }))
    await expect(page.getByText('이력서를 도서관에 공개했습니다.')).toBeVisible()
    await expect(page.getByRole('switch', { name: '이력서 공개' })).toBeChecked()
  })
})
