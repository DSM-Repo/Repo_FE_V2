import { authenticateAs } from './auth-fixtures'
import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

type PageBody = { id?: string; index: number; type: string; content: string }

async function mockResume(page: Page) {
  let document = {
    id: 'capacity-resume', name: '오혜민', email: 'student@dsm.hs.kr', majorName: 'Frontend',
    introduce: '자기소개 제목\n자기소개', profileImageUrl: '', portfolioUrl: '',
    skills: ['React'], savedAt: '2026-10-29T00:00:00.000Z', isPublic: false, submissionStatus: 'ONGOING',
    pages: [
      { id: 'profile-id', index: 0, type: 'PROFILE', content: '' },
      { id: 'project-id', index: 1, type: 'PROJECT', content: '' },
    ] as PageBody[],
  }
  let saved: PageBody[] | undefined
  await page.route(`${apiBaseUrl}/resume/capacity-resume`, route => route.fulfill({ json: document }))
  await page.route(`${apiBaseUrl}/user`, route => route.fulfill({ json: {
    name: '오혜민', major: 'Frontend', introduce: document.introduce, profileImageUrl: null,
    classInfo: { grade: 2, classNumber: 2, number: 1, schoolNumber: '2201' },
  } }))
  await page.route(`${apiBaseUrl}/major`, route => route.fulfill({ json: { majors: [], numberOfData: 0 } }))
  await page.route(`${apiBaseUrl}/feedback?documentId=capacity-resume`, route => route.fulfill({ json: { content: [], totalElements: 0 } }))
  await page.route(`${apiBaseUrl}/resume/save`, async route => {
    saved = (route.request().postDataJSON() as { pages: PageBody[] }).pages
    document = { ...document, pages: saved.map((item, index) => ({ ...item, id: item.id || `new-${index}` })) }
    await route.fulfill({ json: { resumeId: document.id, savedAt: document.savedAt, pages: document.pages.map(({ id, index }) => ({ id, index })) } })
  })
  return { saved: () => saved }
}

for (const viewport of [{ width: 1366, height: 768 }, { width: 1920, height: 1080 }]) {
  test.describe(`Windows document capacity ${viewport.width}`, () => {
    test.use({ viewport, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36' })
    test('short lines use available document height instead of an eighteen-line limit', async ({ page }, testInfo) => {
      await authenticateAs(page, 'STUDENT')
      const mocks = await mockResume(page)
      await page.goto('/resume?resumeId=capacity-resume&mode=edit')
      const editor = page.getByRole('textbox', { name: '1쪽 추가 내용', exact: true })
      const text = Array.from({ length: 19 }, (_, index) => `활동 ${index + 1}`).join('\n')
      await editor.fill(text)
      await expect(editor).toContainText('활동 19')
      await expect(page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })).toBeVisible()
      // The second authored page remains the existing PROJECT rather than a generated FREE page.
      await expect(page.getByLabel('프로젝트 이름', { exact: true })).toBeVisible()
      const measurement = await editor.evaluate(element => {
        const sheet = element.closest('article')!
        const scale = sheet.getBoundingClientRect().height / sheet.clientHeight
        const bottom = element.lastElementChild?.getBoundingClientRect().bottom ?? element.getBoundingClientRect().bottom
        return { width: sheet.clientWidth, height: sheet.clientHeight, fontSize: getComputedStyle(element).fontSize, remaining: (sheet.getBoundingClientRect().bottom - bottom) / scale }
      })
      expect(measurement.width).toBe(610)
      expect(measurement.height).toBe(864)
      expect(measurement.fontSize).toBe('10px')
      expect(measurement.remaining).toBeGreaterThan(20)
      await page.screenshot({ path: testInfo.outputPath('windows-editor-capacity.png'), fullPage: true })
      await testInfo.attach('document-capacity', { body: JSON.stringify(measurement), contentType: 'application/json' })
      await page.getByRole('button', { name: '저장', exact: true }).click()
      await expect.poll(() => mocks.saved()?.length).toBe(2)
      expect(mocks.saved()![0].content).toBe(text)
      const reader = page.getByLabel('이력서 미리보기').locator('article').first()
      const readerSize = await reader.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight }))
      expect(readerSize).toEqual({ width: measurement.width, height: measurement.height })
      await page.screenshot({ path: testInfo.outputPath('windows-saved-capacity.png'), fullPage: true })
    })

    test('overflow splits and remains saveable without dropping text or page identities', async ({ page }) => {
      await authenticateAs(page, 'STUDENT')
      const mocks = await mockResume(page)
      await page.goto('/resume?resumeId=capacity-resume&mode=edit')
      const editor = page.getByRole('textbox', { name: '1쪽 추가 내용', exact: true })
      const text = Array.from({ length: 65 }, (_, index) => `활동 ${index + 1}`).join('\n')
      await editor.fill(text)
      await expect(page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })).toBeVisible()
      await page.getByRole('button', { name: '저장', exact: true }).click()
      await expect.poll(() => mocks.saved()?.length ?? 0).toBeGreaterThan(2)
      const saved = mocks.saved()!
      expect(saved.filter(item => item.type !== 'PROJECT').map(item => item.content).join('')).toBe(text)
      expect(saved[0].id).toBe('profile-id')
      expect(saved.at(-1)?.id).toBe('project-id')
      expect(saved.slice(1, -1).every(item => item.id === '')).toBe(true)
    })
  })
}

test('a long bold list inside a quote preserves its formatting across automatic pages', async ({ page }) => {
  await authenticateAs(page, 'STUDENT')
  const mocks = await mockResume(page)
  await page.goto('/resume?resumeId=capacity-resume&mode=edit')
  const text = '인용 안에서 진행한 프로젝트 내용을 정리합니다. '.repeat(180).trim()
  await page.getByRole('textbox', { name: '1쪽 추가 내용', exact: true }).fill(`> - **${text}**`)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.saved()?.length ?? 0).toBeGreaterThan(2)
  const contentPages = mocks.saved()!.filter(item => item.type !== 'PROJECT')
  expect(contentPages.length).toBeGreaterThan(1)
  for (const item of contentPages) {
    expect(item.content).toMatch(/^> - \*\*[\s\S]+\*\*$/)
  }
  expect(contentPages.map(item => item.content.slice(6, -2)).join('')).toBe(text)
  await expect(page.getByLabel('이력서 미리보기').locator('blockquote li strong').first()).toBeVisible()
})
