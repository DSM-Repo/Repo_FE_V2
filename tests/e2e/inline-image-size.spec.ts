import type { Locator } from '@playwright/test'

import { authenticateAs, createTestAccessToken } from './auth-fixtures'
import { apiBaseUrl, expect, test, type Page } from './test-fixtures'

const firstImageUrl = 'https://images.repo.test/project-overview.svg'
const secondImageUrl = 'https://images.repo.test/project-result.svg'
const originalContent = `## 구현 과정\n![프로젝트 개요](${firstImageUrl})\n![프로젝트 결과](${secondImageUrl})\n이미지 뒤에 작성한 설명`
const resizedContent = originalContent.replace(`](${firstImageUrl})`, `](${firstImageUrl}){width=320 height=180}`)

type SavedPage = {
  readonly id: string
  readonly index: number
  readonly type: string
  readonly content: string
  readonly project?: { readonly name: string; readonly summary: string; readonly startDate: string; readonly endDate: string; readonly imageUrl: string }
}

async function prepareResume(page: Page, width: number, options: {
  readonly content?: string
  readonly summary?: string
  readonly imageUrl?: string
} = {}) {
  await authenticateAs(page, 'STUDENT')
  let document = {
    id: 'resume-id', name: '오혜민', email: 'student@dsm.hs.kr', majorName: 'Frontend',
    introduce: '자기소개 제목\n자기소개 내용', profileImageUrl: '', portfolioUrl: '', skills: [],
    isPublic: true, submissionStatus: 'ONGOING', savedAt: '2026-11-04T00:00:00Z',
    pages: [
      { id: 'profile-id', index: 0, type: 'PROFILE', content: '활동 내용' },
      { id: 'project-id', index: 1, type: 'PROJECT', content: options.content ?? originalContent,
        project: { name: '본문 이미지 프로젝트', summary: options.summary ?? '', startDate: '', endDate: '', imageUrl: options.imageUrl ?? '' } },
    ] satisfies SavedPage[],
  }
  let savedPages: readonly SavedPage[] | undefined
  for (const path of ['/resume', '/resume/students/1']) {
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
    ...document, cohort: 10, date: 2026, year: 2, resumeId: document.id, studentId: 1,
    studentNumber: '2201', releasedAt: '2026-11-04T00:00:00Z',
  } }))
  await page.route(`${apiBaseUrl}/resume/save`, async route => {
    const body: { pages: typeof document.pages } = route.request().postDataJSON()
    savedPages = body.pages
    document = { ...document, pages: body.pages.map(item => ({ ...item, id: item.id || `saved-page-${item.index}` })) }
    await route.fulfill({ json: {
      resumeId: document.id, savedAt: document.savedAt, pages: document.pages.map(({ id, index }) => ({ id, index })),
    } })
  })
  for (const [url, imageWidth, imageHeight] of [[firstImageUrl, 240, 120], [secondImageUrl, 160, 90]] as const) {
    await page.route(url, route => route.fulfill({
      contentType: 'image/svg+xml',
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}"><rect width="100%" height="100%" fill="#526678"/><circle cx="80" cy="45" r="24" fill="#fff"/></svg>`,
    }))
  }
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/resume?resumeId=resume-id&mode=edit')
  if (width === 390) await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  return {
    editor: page.getByRole('textbox', { name: '2쪽 추가 내용', exact: true }),
    getSavedContent: () => savedPages?.find(item => item.id === 'project-id')?.content,
    getSavedPages: () => savedPages,
  }
}

async function expectSize(image: Locator, width: number, height: number) {
  await expect(image).toBeVisible()
  await expect(image).toHaveCSS('width', `${width}px`)
  await expect(image).toHaveCSS('height', `${height}px`)
  await expect(image).toHaveCSS('object-fit', 'contain')
}

for (const width of [390, 1280]) {
  test(`inline image resizing persists across save, reload and readers at ${width}px`, async ({ page }, testInfo) => {
    const { editor, getSavedContent } = await prepareResume(page, width)
    const firstImage = editor.getByRole('img', { name: '프로젝트 개요', exact: true })
    const secondImage = editor.getByRole('img', { name: '프로젝트 결과', exact: true })
    const dialog = page.getByRole('dialog', { name: '본문 이미지 크기 조절', exact: true })

    await firstImage.click()
    await dialog.getByRole('spinbutton', { name: '본문 이미지 가로', exact: true }).fill('400')
    await dialog.getByRole('button', { name: '취소', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expectSize(firstImage, 240, 120)

    await firstImage.click()
    await dialog.getByRole('spinbutton', { name: '본문 이미지 가로', exact: true }).fill('320')
    await dialog.getByRole('spinbutton', { name: '본문 이미지 세로', exact: true }).fill('180')
    await dialog.getByRole('spinbutton', { name: '본문 이미지 세로', exact: true }).press('Tab')
    await expect(dialog.getByRole('button', { name: '적용하기', exact: true })).toBeInViewport()
    await page.screenshot({ path: testInfo.outputPath(`inline-image-size-${width}.png`) })
    await dialog.getByRole('button', { name: '적용하기', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expectSize(firstImage, 320, 180)
    await expectSize(secondImage, 160, 90)
    await expect(editor).toContainText('이미지 뒤에 작성한 설명')

    await page.getByRole('button', { name: '저장', exact: true }).click()
    await expect.poll(getSavedContent).toBe(resizedContent)
    await page.goto('/resume?resumeId=resume-id&mode=edit')
    if (width === 390) await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
    await expectSize(firstImage, 320, 180)
    await expectSize(secondImage, 160, 90)
    await expect(editor).not.toContainText('{width=')

    for (const viewer of [
      { name: 'student', role: 'STUDENT', path: '/resume?resumeId=resume-id' },
      { name: 'teacher', role: 'TEACHER', path: '/students/1' },
      { name: 'library', role: 'STUDENT', path: '/library?date=2026' },
    ] as const) {
      await page.evaluate(token => localStorage.setItem('repo.auth.accessToken', token), createTestAccessToken(viewer.role))
      await page.goto(viewer.path)
      if (width === 390) await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
      await expectSize(page.getByRole('img', { name: '프로젝트 개요', exact: true }), 320, 180)
      await expectSize(page.getByRole('img', { name: '프로젝트 결과', exact: true }), 160, 90)
      await expect(page.getByText('이미지 뒤에 작성한 설명', { exact: true })).toBeVisible()
      await page.screenshot({ path: testInfo.outputPath(`inline-image-size-${viewer.name}-${width}.png`), fullPage: true })
    }
  })
}

test('keyboard resizing can be undone, redone and reset without changing surrounding content', async ({ page }) => {
  const { editor, getSavedContent } = await prepareResume(page, 1280)
  const image = editor.getByRole('img', { name: '프로젝트 개요', exact: true })
  const dialog = page.getByRole('dialog', { name: '본문 이미지 크기 조절', exact: true })
  await image.focus()
  await image.press('Enter')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('spinbutton', { name: '본문 이미지 가로', exact: true }).fill('320')
  await dialog.getByRole('spinbutton', { name: '본문 이미지 세로', exact: true }).fill('180')
  await dialog.getByRole('button', { name: '적용하기', exact: true }).click()
  await expectSize(image, 320, 180)
  await editor.press('ControlOrMeta+z')
  await expectSize(image, 240, 120)
  await expect(editor).toContainText('이미지 뒤에 작성한 설명')
  await editor.press('ControlOrMeta+Shift+z')
  await expectSize(image, 320, 180)
  await image.click()
  await dialog.getByRole('button', { name: '기본 크기로', exact: true }).click()
  await dialog.getByRole('button', { name: '적용하기', exact: true }).click()
  await expectSize(image, 240, 120)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(getSavedContent).toBe(originalContent)
})

test('an oversized first project image moves to a continuation page without losing content', async ({ page }, testInfo) => {
  const metadata = '<!-- repo:project-image-size=160x160 -->'
  const body = `![프로젝트 개요](${firstImageUrl})\n큰 이미지 뒤에 작성한 설명`
  const { editor, getSavedPages } = await prepareResume(page, 1280, {
    content: `${metadata}\n${body}`,
    summary: '첫 번째 프로젝트 소개\n두 번째 프로젝트 소개\n세 번째 프로젝트 소개',
    imageUrl: secondImageUrl,
  })
  const availableHeight = await editor.evaluate(element => {
    const sheet = element.closest('article')
    if (!sheet) throw new Error('Project editor sheet is missing')
    const sheetRect = sheet.getBoundingClientRect()
    const scale = sheetRect.height / sheet.offsetHeight
    const editorTop = (element.getBoundingClientRect().top - sheetRect.top) / scale + sheet.scrollTop
    return sheet.clientHeight - Number.parseFloat(getComputedStyle(sheet).paddingBottom) - editorTop
  })
  expect(availableHeight).toBeLessThan(640)

  await editor.getByRole('img', { name: '프로젝트 개요', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: '본문 이미지 크기 조절', exact: true })
  await dialog.getByRole('spinbutton', { name: '본문 이미지 가로', exact: true }).fill('512')
  await dialog.getByRole('spinbutton', { name: '본문 이미지 세로', exact: true }).fill('640')
  await dialog.getByRole('button', { name: '적용하기', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(() => getSavedPages()?.map(item => item.type)).toEqual(['PROFILE', 'PROJECT', 'FREE'])
  const savedPages = getSavedPages()!
  expect(savedPages[0]).toMatchObject({ id: 'profile-id', content: '활동 내용' })
  expect(savedPages[1]).toMatchObject({ id: 'project-id', content: `${metadata}\n` })
  expect(savedPages[2].content).toBe(body.replace(`](${firstImageUrl})`, `](${firstImageUrl}){width=512 height=640}`))

  await page.goto('/resume?resumeId=resume-id')
  await page.getByRole('button', { name: '다음 페이지', exact: true }).click()
  const image = page.getByRole('img', { name: '프로젝트 개요', exact: true })
  await expectSize(image, 512, 640)
  await expect(page.getByText('큰 이미지 뒤에 작성한 설명', { exact: true })).toBeVisible()
  const overflow = await image.evaluate(element => {
    const sheet = element.closest('article')
    if (!sheet) throw new Error('Continuation reader sheet is missing')
    return element.getBoundingClientRect().bottom - sheet.getBoundingClientRect().bottom
  })
  expect(overflow).toBeLessThanOrEqual(1)
  await page.screenshot({ path: testInfo.outputPath('inline-image-size-continuation.png'), fullPage: true })
})

test('attaching a body photo opens square crop controls before upload and preserves the selected crop on save', async ({ page }, testInfo) => {
  const { editor, getSavedContent } = await prepareResume(page, 1280)
  const imageUrl = `${apiBaseUrl}/body-cropped.png`
  let uploaded: Buffer | undefined
  let uploads = 0
  await page.route(`${apiBaseUrl}/image`, async route => {
    uploads += 1
    const body = route.request().postDataBuffer()
    if (!body) throw new Error('Expected multipart image upload.')
    const form = await new Request(`${apiBaseUrl}/image`, {
      method: 'POST', headers: route.request().headers(), body: new Uint8Array(body),
    }).formData()
    const file = form.get('image')
    if (!(file instanceof File)) throw new Error('Expected cropped image file.')
    expect(file.type).toBe('image/png')
    uploaded = Buffer.from(await file.arrayBuffer())
    await route.fulfill({ status: 201, json: { imageUrl, key: 'body-cropped.png' } })
  })
  await page.route(imageUrl, route => route.fulfill({ contentType: 'image/png', body: uploaded }))
  const encodedPhoto = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 800; canvas.height = 400
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas required.')
    context.fillStyle = '#e04b50'
    context.fillRect(0, 0, 800, 400)
    context.fillStyle = '#2277cc'
    context.fillRect(400, 200, 400, 200)
    return canvas.toDataURL('image/png').split(',')[1]
  })
  const file = { name: 'body-photo.png', mimeType: 'image/png', buffer: Buffer.from(encodedPhoto, 'base64') }
  const toolbar = page.getByLabel('프로젝트 작성 도구', { exact: true })
  const dialog = page.getByRole('dialog', { name: '첨부 이미지 조정', exact: true })

  for (const cancel of [true, false]) {
    await editor.evaluate(element => {
      element.focus()
      const range = document.createRange()
      range.selectNodeContents(element)
      range.collapse(false)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    })
    const chooser = page.waitForEvent('filechooser')
    await toolbar.getByRole('button', { name: '이미지', exact: true }).click()
    await (await chooser).setFiles(file)
    await expect(dialog).toBeVisible()
    expect(uploads).toBe(0)
    await expect(editor.locator('img')).toHaveCount(2)
    if (cancel) {
      await dialog.getByRole('button', { name: '취소', exact: true }).click()
      await expect(dialog).toHaveCount(0)
      await expect(editor).toHaveAttribute('data-markdown-value', originalContent)
      continue
    }
    const selection = dialog.getByRole('group', { name: '프로필 사진 자르기 위치' })
    const before = await selection.boundingBox()
    const handle = await selection.getByRole('button', { name: '오른쪽 아래 크기 조절', exact: true }).boundingBox()
    if (!before || !handle) throw new Error('Crop selection must be measurable.')
    await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
    await page.mouse.down()
    await page.mouse.move(handle.x + handle.width / 2 - 25, handle.y + handle.height / 2 - 25)
    await page.mouse.up()
    const after = await selection.boundingBox()
    if (!after) throw new Error('Resized crop must be measurable.')
    expect(after.width).toBeLessThan(before.width)
    expect(after.width).toBeCloseTo(after.height, 1)
    await dialog.getByRole('slider', { name: '확대', exact: true }).fill('2')
    await dialog.getByRole('slider', { name: '가로 위치', exact: true }).fill('1')
    await dialog.getByRole('slider', { name: '세로 위치', exact: true }).fill('1')
    await page.screenshot({ path: testInfo.outputPath('body-attachment-crop.png') })
    await dialog.getByRole('button', { name: '적용하기', exact: true }).click()
  }

  await expect(dialog).toHaveCount(0)
  await expect.poll(() => uploads).toBe(1)
  await expect(editor.locator('img')).toHaveCount(3)
  if (!uploaded) throw new Error('Confirmed crop must be uploaded.')
  expect(uploaded.readUInt32BE(16)).toBe(512)
  expect(uploaded.readUInt32BE(20)).toBe(512)
  const pixel = await page.evaluate(async base64 => {
    const photo = new Image()
    photo.src = `data:image/png;base64,${base64}`
    await photo.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 512; canvas.height = 512
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas required.')
    context.drawImage(photo, 0, 0)
    return Array.from(context.getImageData(256, 256, 1, 1).data)
  }, uploaded.toString('base64'))
  expect(pixel).toEqual([34, 119, 204, 255])
  await expect(editor.getByRole('img', { name: 'body-photo-profile.png', exact: true })).toHaveAttribute('src', imageUrl)
  await page.getByRole('button', { name: '저장', exact: true }).click()
  await expect.poll(getSavedContent).toContain(`![body-photo-profile.png](${imageUrl})`)
  expect(getSavedContent()).toContain(originalContent)
  await page.goto('/resume?resumeId=resume-id')
  await expect(page.getByRole('img', { name: 'body-photo-profile.png', exact: true })).toHaveAttribute('src', imageUrl)
})
