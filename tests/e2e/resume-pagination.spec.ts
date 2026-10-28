import type { Locator } from '@playwright/test'

import { authenticateAs, createTestAccessToken } from './auth-fixtures'
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

for (const width of [390, 1280]) {
  for (const input of ['typing', 'composition', 'paste']) {
    test(`${input}: pagination continues typing at the original caret at ${width}px`, async ({ page }, testInfo) => {
      await authenticateAs(page, 'STUDENT')
      const pages = createPages(2)
      pages[1].content = ''
      const mocks = await mockResume(page, pages)
      await page.setViewportSize({ width, height: 900 })
      await page.goto('/resume?resumeId=resume-id&mode=edit')
      if (width === 390) await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
      const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
      await editor.focus()
      if (input === 'composition') {
        await editor.evaluate((element, paragraphs) => {
          element.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
          element.textContent = paragraphs.join('\n')
          const range = document.createRange()
          range.selectNodeContents(element)
          range.collapse(false)
          window.getSelection()!.removeAllRanges()
          window.getSelection()!.addRange(range)
          element.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true, inputType: 'insertCompositionText' }))
        }, projectParagraphs)
        await expect(editor).toBeFocused()
        await expect(editor).toContainText(projectParagraphs.at(-1)!)
        await expect(page.getByRole('textbox', { name: '4쪽 추가 내용', exact: true })).toHaveCount(0)
        await editor.dispatchEvent('compositionend', { data: '했습니다.' })
      } else if (input === 'paste') {
        await pasteProject(page)
      } else {
        await editor.fill(projectParagraphs.join('\n'))
      }
      const continuation = page.getByRole('textbox', { name: '4쪽 추가 내용', exact: true })
      await expect(continuation).toBeFocused()
      await page.keyboard.insertText('계속입력')
      await expect(continuation).toContainText(`${projectParagraphs.at(-1)}계속입력`)
      if (input === 'typing' && width === 390) {
        await page.screenshot({ path: testInfo.outputPath('mobile-continuation-caret.png'), fullPage: true })
      }
      await page.getByRole('button', { name: '저장', exact: true }).click()
      await expect.poll(() => mocks.getSavedPages()?.length).toBe(4)
      const savedText = mocks.getSavedPages()!.slice(1).map(item => item.content).join('\n')
      for (const paragraph of projectParagraphs) expect(savedText.split(paragraph)).toHaveLength(2)
      expect(savedText.endsWith(`${projectParagraphs.at(-1)}계속입력`)).toBe(true)
    })
  }
}

for (const tag of ['strong', 'a']) {
  test(`pagination preserves native typing behavior at a ${tag} boundary`, async ({ page }) => {
    await authenticateAs(page, 'STUDENT')
    const pages = createPages(2)
    pages[1].content = ''
    const mocks = await mockResume(page, pages)
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/resume?resumeId=resume-id&mode=edit')
    const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
    await editor.focus()
    const paste = (paragraphs: readonly string[]) => editor.evaluate((element, { paragraphs, tag }) => {
      const clipboardData = new DataTransfer()
      clipboardData.setData('text/html', paragraphs.slice(0, -1).map(paragraph => `<p>${paragraph}</p>`).join('')
        + `<p><${tag}${tag === 'a' ? ' href="https://example.test/details"' : ''}>서식 끝</${tag}></p>`)
      element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
    }, { paragraphs, tag })
    await paste([])
    await expect(editor.locator(tag)).toHaveText('서식 끝')
    await page.keyboard.insertText('후속')
    await expect(editor).toHaveAttribute('data-markdown-value', /후속/)
    const baselineMarkdown = (await editor.getAttribute('data-markdown-value'))!
    const baselineFormattedText = await editor.locator(tag).textContent()
    await editor.fill('')
    await paste(projectParagraphs)
    const continuation = page.getByRole('textbox', { name: '4쪽 추가 내용', exact: true })
    await expect(continuation).toBeFocused()
    await page.keyboard.insertText('후속')
    await expect(continuation.locator(tag)).toHaveText(baselineFormattedText!)
    await expect(continuation).toContainText('서식 끝후속')
    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect.poll(() => mocks.getSavedPages()?.length).toBe(4)
    expect(mocks.getSavedPages()![3].content.endsWith(baselineMarkdown)).toBe(true)
  })
}

test('pagination at a heading boundary preserves heading and divider blocks', async ({ page }) => {
  await authenticateAs(page, 'STUDENT')
  const pages = createPages(2)
  pages[1].content = [...projectParagraphs.slice(0, 16), '## 경계 제목', '---', ...projectParagraphs.slice(16, 20)].join('\n')
  const mocks = await mockResume(page, pages)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await editor.focus()
  await editor.evaluate(element => {
    const range = document.createRange()
    range.setStartBefore(element.querySelector('h2')!)
    range.collapse(true)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  })
  const continuation = page.getByRole('textbox', { name: '3쪽 추가 내용', exact: true })
  await expect(continuation).toBeFocused()
  await page.keyboard.insertText('후속')
  await expect(continuation.locator('h2')).toHaveText('후속경계 제목')
  await expect(continuation.locator('hr')).toHaveCount(1)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.getSavedPages()?.length).toBe(3)
  expect(mocks.getSavedPages()![2].content).toContain('## 후속경계 제목\n---')
})

test('image-only paste continues typing after the final image on the following page', async ({ page }) => {
  await authenticateAs(page, 'STUDENT')
  const pages = createPages(2)
  pages[1].content = ''
  const mocks = await mockResume(page, pages)
  await page.route('**/image-*.png', route => route.fulfill({
    contentType: 'image/png',
    body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lH9fWAAAAABJRU5ErkJggg==', 'base64'),
  }))
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await editor.focus()
  await editor.evaluate(element => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/html', Array.from({ length: 2 }, (_, index) => `<p><img alt="그림${index}" src="/image-${index}.png"></p>`).join(''))
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
  })
  const continuation = page.getByRole('textbox', { name: '3쪽 추가 내용', exact: true })
  await expect(continuation).toBeFocused()
  await page.keyboard.insertText('이미지 다음 내용')
  await expect(continuation).toContainText('이미지 다음 내용')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.getSavedPages()?.length).toBe(3)
  const saved = mocks.getSavedPages()!.slice(1).map(item => item.content).join('\n')
  for (let index = 0; index < 2; index++) expect(saved.split(`![그림${index}]`)).toHaveLength(2)
  expect(saved.endsWith('이미지 다음 내용')).toBe(true)
})

test('splitting in the middle of bold text preserves its caret and formatting', async ({ page }) => {
  await authenticateAs(page, 'STUDENT')
  const pages = createPages(2)
  pages[1].content = projectParagraphs.map((paragraph, index) => index === 25 ? '**가나다라마바사**' : paragraph).join('\n')
  const mocks = await mockResume(page, pages)
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await editor.focus()
  await editor.locator('strong').evaluate(element => {
    const range = document.createRange()
    range.setStart(element.firstChild!, 2)
    range.collapse(true)
    window.getSelection()!.removeAllRanges()
    window.getSelection()!.addRange(range)
  })
  await page.keyboard.insertText('중간')
  const continuation = page.getByRole('textbox', { name: '3쪽 추가 내용', exact: true })
  await expect(continuation).toBeFocused()
  await page.keyboard.insertText('후속')
  await expect(continuation.locator('strong')).toHaveText('가나중간후속다라마바사')
  await page.getByRole('button', { name: '이전 페이지', exact: true }).click()
  const next = page.getByRole('button', { name: '다음 페이지', exact: true })
  await next.click()
  await expect(next).toBeFocused()
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => mocks.getSavedPages()?.length).toBe(4)
  expect(mocks.getSavedPages()![2].content).toContain('**가나중간후속다라마바사**')
})

async function pasteProject(page: Page) {
  const editor = page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true })
  await editor.fill('')
  await editor.evaluate((element, paragraphs) => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/html', paragraphs.map(paragraph => `<p>${paragraph}</p>`).join(''))
    clipboardData.setData('text/plain', paragraphs.join('\n\n'))
    element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
  }, projectParagraphs)
}

test('long project paste becomes following pages without losing the next project or saved text', async ({ page }, testInfo) => {
  await authenticateAs(page, 'STUDENT')
  const pages = createPages(4).filter(item => item.type !== 'FREE').map((item, index) => ({ ...item, index }))
  const mocks = await mockResume(page, pages)
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  await pasteProject(page)
  await expect(page.getByRole('textbox', { name: '4쪽 추가 내용', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '이전 페이지', exact: true }).click()
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
  await expect(page.getByRole('textbox', { name: '4쪽 추가 내용', exact: true })).toBeFocused()
  await page.getByRole('button', { name: '이전 페이지', exact: true }).click()
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
  await expect(page.locator('[contenteditable="true"]:focus')).toHaveAttribute('id', /resume-page-content-[23]/)
  await page.getByRole('button', { name: '이전 페이지', exact: true }).click()
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

for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 390, height: 900 }, { width: 390, height: 1080 }]) {
  test(`readers share the restored document geometry at ${viewport.width}x${viewport.height}px`, async ({ page }, testInfo) => {
    await authenticateAs(page, 'STUDENT')
    const pages = createPages(2)
    const lines = Array.from({ length: 10 }, (_, index) => `- 활동 ${index + 1}: 학생별 이력서 내용과 문서 표시 기준 및 프로젝트 경험을 함께 확인하는 활동 기록입니다.`)
    pages[0].content = '## 활동 기록\n' + lines.join('\n')
    await mockResume(page, pages)
    await page.setViewportSize(viewport)
    let baseline: { width: number; height: number; lastLineY: number } | undefined
    for (const viewer of viewers) {
      if (baseline) await page.evaluate(token => localStorage.setItem('repo.auth.accessToken', token), createTestAccessToken(viewer.role))
      await page.goto(viewer.path)
      const sheet = sheets(page).first()
      const lastLine = sheet.getByText(lines[9].slice(2), { exact: true })
      await expectTextInsideSheet(lastLine)
      await expect.poll(() => sheet.evaluate(element => (element as HTMLElement).offsetWidth)).toBe(610)
      await expect(sheet).toHaveCSS('height', '864px')
      await expect(sheet.getByText('오혜민', { exact: true })).toHaveCSS('font-size', '24px')
      await expect(sheet.getByText('student@dsm.hs.kr', { exact: false })).toHaveCSS('font-size', '16.8px')
      await expect.poll(async () => parseFloat(await lastLine.evaluate(element => getComputedStyle(element).fontSize))).toBeCloseTo(10, 2)
      const geometry = await sheet.evaluate(element => {
        const bounds = element.getBoundingClientRect()
        const bodyLines = [...element.querySelectorAll('li')].filter(item => item.textContent?.startsWith('활동 '))
        const lastLine = bodyLines.at(-1)!
        return { width: bounds.width, height: bounds.height,
          lastLineY: (lastLine.getBoundingClientRect().bottom - bodyLines[0].getBoundingClientRect().top) / bounds.height }
      })
      if (viewport.width === 1920) {
        expect(geometry.width).toBeCloseTo(864 * 551 / 780, 0)
        expect(geometry.height).toBeCloseTo(864, 0)
      }
      if (baseline) {
        expect(geometry.width).toBeCloseTo(baseline.width, 0)
        expect(geometry.height).toBeCloseTo(baseline.height, 0)
        expect(geometry.lastLineY).toBeCloseTo(baseline.lastLineY, 3)
      } else baseline = geometry
      if (viewer.name === 'library' || viewer.name === 'book') {
        const previous = (await page.getByRole('button', { name: '이전 페이지', exact: true }).boundingBox())!
        const next = (await page.getByRole('button', { name: '다음 페이지', exact: true }).boundingBox())!
        expect(next.x).toBeGreaterThan(previous.x + previous.width)
      }
      const sheetBounds = (await sheet.boundingBox())!
      for (const name of ['이전 페이지', '다음 페이지']) {
        const arrow = (await page.getByRole('button', { name, exact: true }).boundingBox())!
        expect(arrow.x + arrow.width <= sheetBounds.x + 0.5 || arrow.x >= sheetBounds.x + sheetBounds.width - 0.5 || arrow.y >= sheetBounds.y + sheetBounds.height - 0.5).toBe(true)
      }
      await page.screenshot({ path: testInfo.outputPath(`${viewer.name}-restored-size.png`), fullPage: true })
    }
  })
}
