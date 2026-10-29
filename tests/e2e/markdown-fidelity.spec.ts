import { authenticateAs } from './auth-fixtures'
import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

async function openEditor(page: Page) {
  await authenticateAs(page, 'STUDENT')
  let resume = {
    email: 'student@dsm.hs.kr', id: 'resume-id', introduce: '', isPublic: false,
    majorName: '', name: '오혜민', pages: [{ content: '', id: 'profile', index: 0, type: 'PROFILE' }],
    portfolioUrl: '', profileImageUrl: '', savedAt: '2026-10-29T00:00:00Z', skills: [], submissionStatus: 'ONGOING',
  }
  await page.route(`${apiBaseUrl}/user`, route => route.fulfill({ status: 500 }))
  await page.route(`${apiBaseUrl}/major`, route => route.fulfill({ json: { majors: [], numberOfData: 0 } }))
  await page.route(`${apiBaseUrl}/resume/resume-id`, route => route.fulfill({ json: resume }))
  await page.route(`${apiBaseUrl}/feedback?*`, route => route.fulfill({ json: { content: [], totalElements: 0 } }))
  await page.route(`${apiBaseUrl}/resume/save`, async route => {
    const body = route.request().postDataJSON() as { pages: typeof resume.pages }
    resume = { ...resume, pages: body.pages }
    await route.fulfill({ json: { resumeId: resume.id, savedAt: resume.savedAt } })
  })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  return { editor: page.getByRole('textbox', { name: '1쪽 추가 내용', exact: true }), getContent: () => resume.pages[0].content }
}

test('separate quotes and repeated empty paragraphs survive save and reopening', async ({ page }) => {
  const { editor, getContent } = await openEditor(page)
  await editor.evaluate(element => {
    element.innerHTML = '<blockquote>첫째</blockquote><blockquote>둘째</blockquote><div><br></div><div><br></div><div><br></div><div>끝</div>'
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  })
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(getContent).toBe('> 첫째\n<!-- repo:quote-break -->\n> 둘째\n\n\n\n끝')
  const preview = page.getByLabel('이력서 미리보기')
  await expect(preview.locator('blockquote')).toHaveCount(2)
  await expect(preview).not.toContainText('repo:quote-break')
  await expect(preview.locator('p').filter({ has: page.locator('br') })).toHaveCount(3)
  await page.getByRole('button', { name: '이력서 수정하기', exact: true }).click()
  await expect(editor.locator('blockquote')).toHaveCount(2)
  await expect(editor.locator('div').filter({ has: page.locator('br') })).toHaveCount(3)
})

test('quote lists and empty formatting serialize without losing markers or adding ghost headings', async ({ page }) => {
  const { editor, getContent } = await openEditor(page)
  await editor.evaluate(element => {
    element.innerHTML = '<blockquote><ul><li><b>굵은 항목</b></li><li><i>기울임 항목</i></li></ul></blockquote><h4><b><br></b></h4><div><b></b><br></div>'
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }))
  })
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(getContent).toBe('> - **굵은 항목**\n> - *기울임 항목*\n\n')
  const preview = page.getByLabel('이력서 미리보기')
  await expect(preview.locator('blockquote li')).toHaveCount(2)
  await expect(preview.locator('blockquote strong')).toHaveText('굵은 항목')
  await expect(preview.locator('blockquote em')).toHaveText('기울임 항목')
  await expect(preview).not.toContainText('####')
  await page.getByRole('button', { name: '이력서 수정하기', exact: true }).click()
  await expect(editor.locator('blockquote li')).toHaveCount(2)
})

test('bullet toolbar keeps its containing quote intact', async ({ page }) => {
  const { editor, getContent } = await openEditor(page)
  await editor.pressSequentially('> ')
  await page.keyboard.insertText('인용 안 항목')
  await page.getByRole('article', { name: '이력서 작성 1쪽', exact: true }).getByRole('button', { name: '글머리 기호', exact: true }).click()
  await expect(editor.locator('blockquote li')).toHaveText('인용 안 항목')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(getContent).toBe('> - 인용 안 항목')
  await expect(page.getByLabel('이력서 미리보기').locator('blockquote li')).toHaveText('인용 안 항목')
})

test('repeated Enter presses retain each blank line after saving', async ({ page }) => {
  const { editor, getContent } = await openEditor(page)
  await editor.pressSequentially('첫째')
  await editor.press('Enter')
  await editor.press('Enter')
  await editor.press('Enter')
  await page.keyboard.insertText('끝')
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(getContent).toBe('첫째\n\n\n끝')
  await expect(page.getByLabel('이력서 미리보기').locator('p').filter({ has: page.locator('br') })).toHaveCount(2)
  await page.getByRole('button', { name: '이력서 수정하기', exact: true }).click()
  await expect(editor.locator('div').filter({ has: page.locator('br') })).toHaveCount(2)
})
