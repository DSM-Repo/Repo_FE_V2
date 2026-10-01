import { apiBaseUrl, expect, test } from './test-fixtures'

import { authenticateAs } from './auth-fixtures'

test('keeps teacher review controls usable on narrow screens', async ({ page }) => {
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
  await page.setViewportSize({ height: 854, width: 720 })
  await page.goto('/students/1')

  await expect(page.getByText('김학생')).toBeVisible()
  await expect(page.getByLabel('학생 이력서 검토 설정')).toBeVisible()
  await expect(page.getByRole('button', { name: /피드백 추가/ })).toBeDisabled()
  await expect(page.getByRole('switch', { name: '이력서 공개' })).toBeDisabled()
  await expect(page.getByRole('switch', { name: '피드백 보기' })).toBeEnabled()
})
