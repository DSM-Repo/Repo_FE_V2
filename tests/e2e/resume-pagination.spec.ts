import type { Locator } from '@playwright/test'

import { authenticateAs } from './auth-fixtures'
import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

type ResumePage = {
  content: string
  id?: string
  index: number
  project?: { name: string; summary: string; startDate: string; endDate: string; imageUrl: string }
  type: 'PROFILE' | 'PROJECT' | 'FREE'
}

const viewers = [
  { name: 'student', path: '/resume?resumeId=resume-id', role: 'STUDENT' },
  { name: 'teacher', path: '/students/1', role: 'TEACHER' },
  { name: 'library', path: '/library?date=2026', role: 'STUDENT' },
  { name: 'book', path: '/resume-books/1', role: 'STUDENT' },
] as const

function createPages(count: number): ResumePage[] {
  return Array.from({ length: count }, (_, index) => {
    const type = index === 0 ? 'PROFILE' : index % 2 === 1 ? 'PROJECT' : 'FREE'
    return {
      content: `## 페이지 ${index + 1} 본문\n끝까지 확인할 수 있는 ${index + 1}쪽 내용입니다.`,
      id: `page-${index + 1}`,
      index,
      type,
      ...(type === 'PROJECT' ? { project: {
        name: `프로젝트 ${index + 1}`, summary: '페이지 이동 검증', startDate: '2026-03', endDate: '2026-10', imageUrl: '',
      } } : {}),
    }
  })
}

async function mockResume(page: Page, pages: ResumePage[]) {
  let document = {
    email: 'student@dsm.hs.kr', id: 'resume-id', introduce: '자기소개 제목\n자기소개 내용',
    isPublic: true, majorName: 'Frontend', name: '오혜민', pages,
    portfolioUrl: '', profileImageUrl: '', savedAt: '2026-10-27T08:00:00.000Z',
    skills: ['React'], submissionStatus: 'ONGOING',
  }
  let savedPages: ResumePage[] | undefined
  for (const path of ['/resume/resume-id', '/resume/students/1']) {
    await page.route(`${apiBaseUrl}${path}`, route => route.fulfill({ json: document }))
  }
  await page.route(`${apiBaseUrl}/user`, route => route.fulfill({ json: {
    name: '오혜민', major: 'Frontend', introduce: document.introduce, profileImageUrl: null,
    classInfo: { grade: 2, classNumber: 2, number: 1, schoolNumber: '2201' },
  } }))
  await page.route(`${apiBaseUrl}/major`, route => route.fulfill({ json: { majors: [], numberOfData: 0 } }))
  await page.route(`${apiBaseUrl}/feedback?documentId=resume-id`, route => route.fulfill({ json: { content: [], totalElements: 0 } }))
  await page.route(`${apiBaseUrl}/library`, route => route.fulfill({ json: [{ cohort: 10, date: 2026, year: 2 }] }))
  await page.route(`${apiBaseUrl}/library/search?*`, route => route.fulfill({ json: {
    content: [{ major: 'Frontend', studentId: 1, studentName: '오혜민', studentNumber: '2201' }], totalElements: 1,
  } }))
  await page.route(`${apiBaseUrl}/library/1`, route => route.fulfill({ json: {
    ...document, cohort: 10, date: 2026, year: 2, resumeId: 'resume-id', studentId: 1,
    studentNumber: '2201', releasedAt: '2026-10-27T08:00:00.000Z',
  } }))
  await page.route(`${apiBaseUrl}/resume/save`, async route => {
    const body = route.request().postDataJSON() as { pages: ResumePage[] }
    savedPages = body.pages
    document = { ...document, pages: body.pages.map((item, index) => ({ ...item, id: item.id || `saved-page-${index}` })) }
    await route.fulfill({ json: { resumeId: document.id, savedAt: document.savedAt } })
  })
  return { getSavedPages: () => savedPages }
}

async function expectInViewport(locator: Locator, page: Page) {
  await expect(locator).toBeVisible()
  const bounds = await locator.boundingBox()
  const viewport = page.viewportSize()
  expect(bounds).not.toBeNull()
  expect(viewport).not.toBeNull()
  expect(bounds!.x).toBeGreaterThanOrEqual(0)
  expect(bounds!.y).toBeGreaterThanOrEqual(0)
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport!.width)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport!.height)
}

function sheets(page: Page) {
  return page.getByRole('article', { name: /^오혜민 이력서 \d+쪽$/ })
}

async function expectTextInsideSheet(text: Locator) {
  await expect(text).toBeVisible()
  await expect.poll(() => text.evaluate(element => {
    const content = element.getBoundingClientRect()
    const sheet = element.closest('article')!.getBoundingClientRect()
    return Math.max(sheet.left - content.left, sheet.top - content.top, content.right - sheet.right, content.bottom - sheet.bottom)
  })).toBeLessThanOrEqual(1)
}

for (const viewer of viewers) {
  for (const width of [390, 1280]) {
    test(`${viewer.name}: all four pages remain reachable at ${width}px`, async ({ page }, testInfo) => {
      await authenticateAs(page, viewer.role)
      await mockResume(page, createPages(4))
      await page.setViewportSize({ width, height: 900 })
      await page.goto(viewer.path)

      const previous = page.getByRole('button', { name: '이전 페이지', exact: true })
      const next = page.getByRole('button', { name: '다음 페이지', exact: true })
      const pageSize = width === 390 ? 1 : 2
      await expect(previous).toBeDisabled()
      for (let firstPage = 1; firstPage <= 4; firstPage += pageSize) {
        await expect(sheets(page)).toHaveCount(pageSize)
        for (let currentPage = firstPage; currentPage < firstPage + pageSize; currentPage += 1) {
          await expect(page.getByRole('heading', { name: `페이지 ${currentPage} 본문`, exact: true })).toBeVisible()
          await expectTextInsideSheet(page.getByText(`끝까지 확인할 수 있는 ${currentPage}쪽 내용입니다.`, { exact: true }))
        }
        await expectInViewport(previous, page)
        await expectInViewport(next, page)
        if (firstPage + pageSize <= 4) {
          await expect(next).toBeEnabled()
          await next.click()
        }
      }
      await expect(page.getByRole('article', { name: '오혜민 이력서 4쪽', exact: true })).toBeVisible()
      await expect(next).toBeDisabled()
      await page.screenshot({ path: testInfo.outputPath(`${viewer.name}-page-4-${width}.png`), fullPage: true })
      await previous.click()
      await expect(page.getByRole('heading', { name: `페이지 ${4 - pageSize} 본문`, exact: true })).toBeVisible()
    })
  }

  test(`${viewer.name}: an odd last page is not duplicated and resize preserves navigation`, async ({ page }) => {
    await authenticateAs(page, viewer.role)
    await mockResume(page, createPages(5))
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto(viewer.path)
    const previous = page.getByRole('button', { name: '이전 페이지', exact: true })
    const next = page.getByRole('button', { name: '다음 페이지', exact: true })
    await expect(page.getByRole('heading', { name: '페이지 1 본문', exact: true })).toBeVisible()
    await next.click()
    await next.click()
    await expect(sheets(page)).toHaveCount(1)
    await expect(page.getByRole('heading', { name: '페이지 5 본문', exact: true })).toBeVisible()
    await expect(next).toBeDisabled()

    await page.setViewportSize({ width: 390, height: 900 })
    await expect(sheets(page)).toHaveCount(1)
    await expect(page.getByRole('heading', { name: '페이지 5 본문', exact: true })).toBeVisible()
    await previous.click()
    await expect(page.getByRole('heading', { name: '페이지 4 본문', exact: true })).toBeVisible()
    await page.setViewportSize({ width: 1280, height: 900 })
    await expect(sheets(page)).toHaveCount(2)
    await expect(page.getByRole('heading', { name: '페이지 4 본문', exact: true })).toBeVisible()
    await next.click()
    await expect(page.getByRole('heading', { name: '페이지 5 본문', exact: true })).toBeVisible()
    await expect(next).toBeDisabled()
    await previous.click()
    await previous.click()
    await expect(page.getByRole('heading', { name: '페이지 1 본문', exact: true })).toBeVisible()
    await expect(previous).toBeDisabled()
  })
}

const projectParagraphs = Array.from({ length: 40 }, (_, index) => `프로젝트 기록 ${String(index + 1).padStart(2, '0')}: 구현 과정과 결과를 정리했습니다.`)

async function pasteProject(page: Page) {
  const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await editor.fill('')
  await editor.evaluate((element, paragraphs) => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/html', paragraphs.map(paragraph => `<p>${paragraph}</p>`).join(''))
    clipboardData.setData('text/plain', paragraphs.join('\n\n'))
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
  }, projectParagraphs)
  await expect(editor).toContainText(projectParagraphs[0])
}

test('long project paste becomes following pages without losing the next project or saved text', async ({ page }, testInfo) => {
  await authenticateAs(page, 'STUDENT')
  const pages = createPages(4).filter(item => item.type !== 'FREE').map((item, index) => ({ ...item, index }))
  const mocks = await mockResume(page, pages)
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  await pasteProject(page)
  const firstProjectContent = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await expect(firstProjectContent).not.toContainText(projectParagraphs.at(-1)!)
  await firstProjectContent.focus()
  await firstProjectContent.getByText(projectParagraphs[0], { exact: true }).evaluate(element => {
    const selection = window.getSelection()!
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  })
  await page.keyboard.insertText('후')
  await expect(firstProjectContent).toContainText(`${projectParagraphs[0]}후`)
  await expect(firstProjectContent).not.toContainText(projectParagraphs.at(-1)!)
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  await expect(page.getByRole('article', { name: '이력서 작성 3쪽', exact: true })).toBeVisible()
  await expect(page.getByRole('article', { name: '이력서 작성 3쪽', exact: true }).getByLabel('프로젝트 이름')).toHaveCount(0)
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  await expect(page.getByRole('article', { name: '이력서 작성 5쪽', exact: true }).getByLabel('프로젝트 이름')).toHaveValue('프로젝트 4')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.getSavedPages()?.length).toBe(5)
  const savedPages = mocks.getSavedPages()!
  expect(savedPages.map(item => item.type)).toEqual(['PROFILE', 'PROJECT', 'FREE', 'FREE', 'PROJECT'])
  expect(savedPages.at(-1)?.id).toBe('page-4')
  expect(savedPages.at(-1)?.content).toBe(pages.at(-1)?.content)
  expect(savedPages[1].content).toContain(`${projectParagraphs[0]}후`)
  const savedText = savedPages.slice(1, -1).map(item => item.content).join('\n\n')
  for (const paragraph of projectParagraphs) expect(savedText.split(paragraph)).toHaveLength(2)
  await testInfo.attach('saved-project-pages', { body: JSON.stringify(savedPages, null, 2), contentType: 'application/json' })

  await expect(page).toHaveURL(/\/resume\?resumeId=resume-id$/)
  await expect(page.getByRole('button', { name: '이력서 수정하기', exact: true })).toBeVisible()
  await page.reload()
  const next = page.getByRole('button', { name: '다음 페이지', exact: true })
  const previous = page.getByRole('button', { name: '이전 페이지', exact: true })
  const expectPageContentInside = async (pageNumber: number) => {
    const sheet = page.getByRole('article', { name: `오혜민 이력서 ${pageNumber}쪽`, exact: true })
    await expect(sheet).toBeVisible()
    const blocks = sheet.locator('p, h1, h2, h3, h4').filter({ hasText: /\S/ })
    expect(await blocks.count()).toBeGreaterThan(0)
    for (const block of await blocks.all()) await expectTextInsideSheet(block)
  }

  await page.setViewportSize({ width: 1280, height: 900 })
  await expectPageContentInside(2)
  await next.click()
  await expectPageContentInside(3)
  await expectPageContentInside(4)
  await expectTextInsideSheet(page.getByText(projectParagraphs.at(-1)!, { exact: true }))
  await page.screenshot({ path: testInfo.outputPath('project-continuation-preview-1280.png'), fullPage: true })

  await page.setViewportSize({ width: 390, height: 900 })
  await expect(sheets(page)).toHaveCount(1)
  await expect(page.getByRole('article', { name: '오혜민 이력서 3쪽', exact: true })).toBeVisible()
  await previous.click()
  for (const pageNumber of [2, 3, 4]) {
    await expectPageContentInside(pageNumber)
    await page.screenshot({ path: testInfo.outputPath(`project-continuation-page-${pageNumber}-390.png`), fullPage: true })
    if (pageNumber < 4) await next.click()
  }

  await page.setViewportSize({ width: 1920, height: 1080 })
  await expect(sheets(page)).toHaveCount(2)
  await previous.click()
  await expect(page.getByRole('article', { name: '오혜민 이력서 1쪽', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '이력서 수정하기', exact: true }).click()
  await next.click()
  await expect(page.getByRole('textbox', { name: '4쪽 추가 내용', exact: true })).toContainText(projectParagraphs.at(-1)!)
  await page.screenshot({ path: testInfo.outputPath('project-continuation-restored.png'), fullPage: true })
})

test('project paste at the five-page limit warns and retains every paragraph', async ({ page }, testInfo) => {
  await authenticateAs(page, 'STUDENT')
  const mocks = await mockResume(page, createPages(5))
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  await pasteProject(page)
  await expect(page.getByText('이력서는 최대 5쪽입니다. 붙여넣은 내용은 유지되며, 내용을 줄이면 페이지를 나눌 수 있습니다.', { exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })).toContainText(projectParagraphs.at(-1)!)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.getSavedPages()?.length).toBe(5)
  const savedPages = mocks.getSavedPages()!
  for (const paragraph of projectParagraphs) expect(savedPages[1].content.split(paragraph)).toHaveLength(2)
  expect(savedPages.slice(2).map(item => item.id)).toEqual(['page-3', 'page-4', 'page-5'])
  await testInfo.attach('page-limit-preserved-content', { body: JSON.stringify(savedPages, null, 2), contentType: 'application/json' })
})

test('ordinary project input is split without a paste event and saves every paragraph once', async ({ page }, testInfo) => {
  await authenticateAs(page, 'STUDENT')
  const pages = createPages(2)
  pages[1].content = ''
  const mocks = await mockResume(page, pages)
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await editor.fill(projectParagraphs.join('\n'))
  await expect(editor).toContainText(projectParagraphs[0])
  await expect(editor).not.toContainText(projectParagraphs.at(-1)!)
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  await expect(page.getByRole('article', { name: '이력서 작성 3쪽', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '4쪽 추가 내용', exact: true })).toContainText(projectParagraphs.at(-1)!)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.getSavedPages()?.length).toBe(4)
  const savedPages = mocks.getSavedPages()!
  expect(savedPages.map(item => item.type)).toEqual(['PROFILE', 'PROJECT', 'FREE', 'FREE'])
  const savedText = savedPages.slice(1).map(item => item.content).join('\n')
  for (const paragraph of projectParagraphs) expect(savedText.split(paragraph)).toHaveLength(2)
  expect(savedText.replace(/\s+/g, ' ').trim()).toBe(projectParagraphs.join(' '))
  await testInfo.attach('ordinary-input-saved-pages', { body: JSON.stringify(savedPages, null, 2), contentType: 'application/json' })
})

test('one long project paragraph spans pages while preserving all text', async ({ page }, testInfo) => {
  await authenticateAs(page, 'STUDENT')
  const pages = createPages(2)
  pages[1].content = ''
  const mocks = await mockResume(page, pages)
  const paragraph = '프로젝트 작업 내용을 확인했습니다. '.repeat(90).trim()
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await editor.fill(paragraph)
  await expect.poll(() => editor.textContent()).not.toBe(paragraph)
  await expect(editor).toContainText('프로젝트 작업 내용을 확인했습니다.')
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  await expect(page.getByRole('article', { name: '이력서 작성 3쪽', exact: true })).toBeVisible()
  await expect(page.getByRole('textbox', { name: '3쪽 추가 내용', exact: true })).toContainText('프로젝트 작업 내용을 확인했습니다.')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.getSavedPages()?.length ?? 0).toBeGreaterThan(2)
  const savedPages = mocks.getSavedPages()!
  expect(savedPages.length).toBeLessThanOrEqual(5)
  expect(savedPages[1].type).toBe('PROJECT')
  expect(savedPages.slice(2).every(item => item.type === 'FREE')).toBe(true)
  const savedText = savedPages.slice(1).map(item => item.content).join(' ')
  expect(savedText.replace(/\s+/g, ' ').trim()).toBe(paragraph.replace(/\s+/g, ' ').trim())
  await testInfo.attach('long-paragraph-saved-pages', { body: JSON.stringify(savedPages, null, 2), contentType: 'application/json' })
})
