import type { Locator } from '@playwright/test'

import { authenticateAs } from './auth-fixtures'
import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

type SavedPage = { id: string; index: number; type: string; content: string }

async function prepareEditor(page: Page) {
  await authenticateAs(page, 'STUDENT')
  let document = {
    email: 'student@dsm.hs.kr', id: 'resume-id', introduce: '자기소개 제목\n자기소개 내용',
    isPublic: true, majorName: 'Frontend', name: '오혜민', portfolioUrl: '', profileImageUrl: '',
    savedAt: '2026-10-29T00:00:00.000Z', skills: [], submissionStatus: 'ONGOING',
    pages: [
      { id: 'profile-id', index: 0, type: 'PROFILE', content: '기존 내용' },
      { id: 'project-id', index: 1, type: 'PROJECT', content: '', project: { name: '프로젝트', imageUrl: '', summary: '', startDate: '', endDate: '' } },
    ] as SavedPage[],
  }
  let savedPages: SavedPage[] | undefined
  await page.route(`${apiBaseUrl}/resume/resume-id`, route => route.fulfill({ json: document }))
  await page.route(`${apiBaseUrl}/user`, route => route.fulfill({ json: {
    name: '오혜민', major: 'Frontend', introduce: document.introduce, profileImageUrl: null,
    classInfo: { grade: 2, classNumber: 2, number: 1, schoolNumber: '2201' },
  } }))
  await page.route(`${apiBaseUrl}/major`, route => route.fulfill({ json: { majors: [], numberOfData: 0 } }))
  await page.route(`${apiBaseUrl}/feedback?documentId=resume-id`, route => route.fulfill({ json: { content: [], totalElements: 0 } }))
  await page.route(`${apiBaseUrl}/resume/save`, async route => {
    savedPages = (route.request().postDataJSON() as { pages: SavedPage[] }).pages
    document = { ...document, pages: savedPages.map((item, index) => ({ ...item, id: item.id || `saved-${index}` })) }
    await route.fulfill({ json: { resumeId: document.id, savedAt: document.savedAt, pages: document.pages.map(({ id, index }) => ({ id, index })) } })
  })
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  return { getSavedPages: () => savedPages, editor: page.getByRole('textbox', { name: '1쪽 추가 내용', exact: true }) }
}

async function paste(editor: Locator, text: string, html = '') {
  await editor.evaluate((element, data) => {
    const clipboardData = new DataTransfer()
    clipboardData.setData('text/plain', data.text)
    if (data.html) clipboardData.setData('text/html', data.html)
    element.dispatchEvent(new ClipboardEvent('paste', { clipboardData, bubbles: true, cancelable: true }))
  }, { text, html })
}

test('undo and redo target the most recent rich paste while preserving earlier typing', async ({ page }) => {
  const { editor } = await prepareEditor(page)
  await editor.click()
  await editor.press('ControlOrMeta+End')
  await page.keyboard.insertText(' 먼저 쓴 내용')
  await paste(editor, '최근 붙여넣기', '<p><strong>최근 붙여넣기</strong></p>')
  await expect(editor).toContainText('최근 붙여넣기')
  await editor.press('ControlOrMeta+z')
  await expect(editor).not.toContainText('최근 붙여넣기')
  await expect(editor).toContainText('먼저 쓴 내용')
  await expect(editor).toContainText('기존 내용')
  await editor.press('ControlOrMeta+Shift+z')
  await expect(editor).toContainText('최근 붙여넣기')
  await editor.evaluate(element => element.dispatchEvent(new InputEvent('beforeinput', {
    inputType: 'historyUndo', bubbles: true, cancelable: true,
  })))
  await expect(editor).not.toContainText('최근 붙여넣기')
  await editor.evaluate(element => element.dispatchEvent(new InputEvent('beforeinput', {
    inputType: 'historyRedo', bubbles: true, cancelable: true,
  })))
  await expect(editor).toContainText('최근 붙여넣기')
})

test('one undo restores the document before a paste that added pages', async ({ page }) => {
  const { editor, getSavedPages } = await prepareEditor(page)
  await editor.click()
  await editor.press('ControlOrMeta+End')
  const pasted = Array.from({ length: 90 }, (_, index) => `붙여넣은 활동 ${index + 1}`).join('\n')
  await paste(editor, pasted)
  // Pagination moves focus into the continuation editor; undo must include those new pages.
  const continuation = page.locator('[contenteditable="true"]:focus')
  await expect(continuation).toContainText('붙여넣은 활동')
  await expect(continuation).not.toHaveAttribute('aria-label', '1쪽 추가 내용')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(editor).toContainText('기존 내용')
  await expect(editor).not.toContainText('붙여넣은 활동')
  await editor.press('ControlOrMeta+End')
  await paste(editor, pasted)
  await expect(continuation).toContainText('붙여넣은 활동')
  await expect(continuation).not.toHaveAttribute('aria-label', '1쪽 추가 내용')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(editor).not.toContainText('붙여넣은 활동')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => getSavedPages()?.length).toBe(2)
  expect(getSavedPages()!.map(({ id }) => id)).toEqual(['profile-id', 'project-id'])
  expect(getSavedPages()![0].content).toBe('기존 내용')
})

test('deleting a formatted heading does not save invisible markdown markers', async ({ page }) => {
  const { editor, getSavedPages } = await prepareEditor(page)
  await editor.fill('내용')
  await editor.press('ControlOrMeta+a')
  await page.getByRole('button', { name: '제목 4', exact: true }).first().click()
  await page.getByRole('button', { name: '굵게', exact: true }).first().click()
  await editor.press('ControlOrMeta+a')
  await editor.press('Backspace')
  await page.getByRole('button', { name: '굵게', exact: true }).first().click()
  await page.keyboard.insertText('다시 쓴 일반 글')
  await expect(editor).toContainText('다시 쓴 일반 글')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => getSavedPages()?.[0].content).toContain('다시 쓴 일반 글')
  expect(getSavedPages()![0].content).not.toMatch(/#{5}|\*{4}/)
})
