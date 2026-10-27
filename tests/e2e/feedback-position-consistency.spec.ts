import { apiBaseUrl, expect, test } from './test-fixtures'
import { authenticateAs, createTestAccessToken } from './auth-fixtures'

for (const type of ['PROFILE', 'PROJECT', 'FREE'] as const) {
  test(`teacher placement stays on the same ${type} content in student review after resize`, async ({ page }, testInfo) => {
    const document = {
      email: 'student@dsm.hs.kr', id: 'resume-id', introduce: '자기소개 제목\n자기소개 본문',
      isPublic: false, majorName: 'Frontend Developer', name: '위치검증 학생',
      pages: [{
        id: 'target-page', index: 0, type,
        content: '## 위치 검증 대상\n줄바꿈 위치가 유지되어야 하는 긴 문장입니다. '.repeat(8),
        ...(type === 'PROJECT' ? { project: {
          name: '좌표 검증 프로젝트', summary: '프로젝트 요약', startDate: '2026-03', endDate: '2026-09', imageUrl: '',
        } } : {}),
      }],
      portfolioUrl: '', profileImageUrl: '', savedAt: '2026-10-01T08:00:00.000Z',
      skills: ['React', 'TypeScript'], submissionStatus: 'SUBMITTED',
    }
    let created: { pageId: string; x: number; y: number; comment: string } | undefined
    await authenticateAs(page, 'TEACHER')
    for (const path of ['/resume/students/1', '/resume/resume-id']) {
      await page.route(`${apiBaseUrl}${path}`, route => route.fulfill({ json: document }))
    }
    await page.route(`${apiBaseUrl}/user`, route => route.fulfill({ json: {
      name: '현재 사용자 정보의 더 긴 이름', major: '현재 사용자 정보의 다른 전공', introduce: null, profileImageUrl: null,
      classInfo: { grade: 2, classNumber: 2, number: 1, schoolNumber: '2201' },
    } }))
    await page.route(`${apiBaseUrl}/major`, route => route.fulfill({ json: { majors: [], numberOfData: 0 } }))
    await page.route(`${apiBaseUrl}/user/refresh`, route => route.fulfill({ status: 503 }))
    await page.route(`${apiBaseUrl}/feedback?documentId=resume-id`, route => route.fulfill({ json: {
      content: created ? [{ ...created, id: 'feedback-created', status: 'PENDING', completedAt: null,
        createdAt: '2026-10-01T08:30:00.000Z', teacher: { name: '담임 선생님' } }] : [],
      totalElements: created ? 1 : 0,
    } }))
    await page.route(`${apiBaseUrl}/feedback`, async route => {
      created = route.request().postDataJSON()
      await route.fulfill({ status: 201, json: {
        feedbackId: 'feedback-created', pageId: created?.pageId, x: created?.x, y: created?.y,
        createdAt: '2026-10-01T08:30:00.000Z',
      } })
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/students/1')
    const sheet = page.getByRole('article').first()
    const target = sheet.getByRole('heading', { name: '위치 검증 대상', exact: true }).first()
    await expect(target).toBeVisible()
    await page.getByRole('button', { name: /피드백 추가/ }).click()
    await target.click()
    await page.getByRole('textbox', { name: '새 피드백', exact: true }).fill('이 위치를 확인해주세요.')
    await page.getByRole('button', { name: '피드백 저장' }).click()
    const marker = sheet.getByRole('button', { name: '피드백 위치: 이 위치를 확인해주세요.' })
    await expect(marker).toBeVisible()
    await expect.poll(() => sheet.evaluate(element => Math.abs(
      element.getBoundingClientRect().width - element.parentElement!.getBoundingClientRect().width,
    ))).toBeLessThan(0.1)
    const relativeTarget = await target.evaluate(element => {
      const bounds = element.getBoundingClientRect()
      const documentBounds = element.closest('article')!.getBoundingClientRect()
      return {
        x: (bounds.x - documentBounds.x) / documentBounds.width,
        y: (bounds.y - documentBounds.y) / documentBounds.height,
        width: bounds.width / documentBounds.width,
        height: bounds.height / documentBounds.height,
      }
    })
    await page.screenshot({ path: testInfo.outputPath('teacher-placement.png'), fullPage: true })
    await page.evaluate(token => localStorage.setItem('repo.auth.accessToken', token), createTestAccessToken('STUDENT'))
    await page.goto('/resume?resumeId=resume-id&mode=feedback')
    for (const width of [1920, 1280, 390]) {
      await page.setViewportSize({ width, height: 1080 })
      await expect(marker).toBeVisible()
      await expect.poll(async () => {
        const bounds = await target.boundingBox()
        const documentBounds = await sheet.boundingBox()
        if (!bounds || !documentBounds) return 1
        return Math.abs((bounds.y - documentBounds.y) / documentBounds.height - relativeTarget.y)
      }).toBeLessThan(0.002)
      const bounds = (await target.boundingBox())!
      const documentBounds = (await sheet.boundingBox())!
      const markerBounds = (await marker.boundingBox())!
      expect(markerBounds.width).toBeCloseTo(36, 0)
      expect((bounds.x - documentBounds.x) / documentBounds.width).toBeCloseTo(relativeTarget.x, 2)
      expect(bounds.width / documentBounds.width).toBeCloseTo(relativeTarget.width, 2)
      expect(bounds.height / documentBounds.height).toBeCloseTo(relativeTarget.height, 2)
      expect((markerBounds.x + markerBounds.width / 2 - documentBounds.x) / documentBounds.width).toBeCloseTo(created!.x, 2)
      expect((markerBounds.y + markerBounds.height / 2 - documentBounds.y) / documentBounds.height).toBeCloseTo(created!.y, 2)
      await page.screenshot({ path: testInfo.outputPath(`student-review-${width}.png`), fullPage: true })
    }
    if (type === 'PROFILE') {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.getByRole('button', { name: '이력서 수정하기' }).click()
      await page.getByLabel('자기소개 제목').fill('아직 저장하지 않은 변경')
      await page.getByText('피드백 보기', { exact: true }).click()
      await expect(sheet).toContainText('위치검증 학생')
      await expect(sheet).not.toContainText('아직 저장하지 않은 변경')
      await page.getByRole('button', { name: '이력서 수정하기' }).click()
      await expect(page.getByLabel('자기소개 제목')).toHaveValue('아직 저장하지 않은 변경')
    }
  })
}
