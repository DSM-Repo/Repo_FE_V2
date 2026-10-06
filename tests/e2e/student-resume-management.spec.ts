import type { Locator } from '@playwright/test'

import { apiBaseUrl, expect, test } from './test-fixtures'

import { authenticateAs } from './auth-fixtures'

const studentResumeIdStorageKey = 'repo.resume.id.student%40dsm.hs.kr'

async function expectLocatorsDoNotOverlap(first: Locator, second: Locator) {
  const [firstBox, secondBox] = await Promise.all([first.boundingBox(), second.boundingBox()])

  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()

  if (!firstBox || !secondBox) {
    return
  }

  const horizontalOverlap = Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width) - Math.max(firstBox.x, secondBox.x)
  const verticalOverlap = Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height) - Math.max(firstBox.y, secondBox.y)

  expect(horizontalOverlap > 0.5 && verticalOverlap > 0.5).toBe(false)
}

function raceResume(id: string, introduce: string) {
  return {
    email: '', id, introduce, isPublic: false, majorName: '', name: '',
    pages: [
      { content: '', id: `${id}-profile`, index: 0, type: 'PROFILE' },
      { content: '', id: `${id}-project`, index: 1, type: 'PROJECT' },
    ],
    portfolioUrl: '', profileImageUrl: '', savedAt: '2026-09-20T10:00:00.000Z',
    skills: [], submissionStatus: 'ONGOING',
  }
}

test.describe('student resume management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateAs(page, 'STUDENT')
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({ status: 500 })
    })
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({ majors: [], numberOfData: 0 }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          email: '',
          id: 'resume-id',
          introduce: '',
          isPublic: false,
          majorName: '',
          name: '',
          pages: [
            { content: '', id: 'server-page-1', index: 0, type: 'PROFILE' },
            { content: '', id: 'server-page-2', index: 1, type: 'PROJECT' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-20T10:00:00.000Z',
          skills: [],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
  })

  for (const target of ['프로필', '프로젝트']) {
    test(`race: delayed ${target} upload preserves typing and skills`, async ({ page }) => {
      const upload = Promise.withResolvers<void>()
      const started = Promise.withResolvers<void>()
      await page.route(`${apiBaseUrl}/image`, async (route) => {
        started.resolve()
        await upload.promise
        await route.fulfill({ json: { imageUrl: new URL('/race-image.png', page.url()).href, key: 'race-image.png' }, status: 201 })
      })
      await page.goto('/resume?mode=edit')
      const chooser = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: `${target} 이미지 추가` }).click()
      await (await chooser).setFiles({ buffer: Buffer.from('png'), mimeType: 'image/png', name: 'race.png' })
      await started.promise
      await page.getByLabel('자기소개 제목').fill('업로드 중 최신 입력')
      await page.getByLabel('프로젝트 이름').fill('최신 프로젝트')
      await page.getByLabel('1쪽 추가 내용').fill('업로드 중 본문')
      await page.getByRole('textbox', { exact: true, name: '기술스택' }).fill('TypeScript')
      await page.getByRole('textbox', { exact: true, name: '기술스택' }).press('Enter')
      upload.resolve()
      await expect(page.getByRole('button', { name: `${target} 이미지 변경` })).toBeVisible()
      await expect(page.getByLabel('자기소개 제목')).toHaveValue('업로드 중 최신 입력')
      await expect(page.getByLabel('프로젝트 이름')).toHaveValue('최신 프로젝트')
      await expect(page.getByLabel('1쪽 추가 내용')).toContainText('업로드 중 본문')
      await expect(page.getByRole('list', { name: '기술스택 태그' })).toContainText('TypeScript')
    })
  }

  test('race: cancelled upload cannot revive a draft or overwrite a new upload', async ({ page }) => {
    const oldUpload = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    let uploads = 0
    await page.route(`${apiBaseUrl}/image`, async (route) => {
      uploads += 1
      if (uploads === 1) {
        started.resolve()
        await oldUpload.promise
        await route.fulfill({ json: { imageUrl: new URL('/old.png', page.url()).href, key: 'old.png' }, status: 201 })
      } else {
        await route.fulfill({ json: { imageUrl: new URL('/new.png', page.url()).href, key: 'new.png' }, status: 201 })
      }
    })
    await page.goto('/resume?mode=edit')
    await page.getByLabel('자기소개 제목').fill('취소할 내용')
    for (const attempt of [0, 1]) {
      const chooser = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: '프로젝트 이미지 추가' }).click()
      await (await chooser).setFiles({ buffer: Buffer.from('png'), mimeType: 'image/png', name: 'race.png' })
      if (attempt === 0) {
        await started.promise
        await page.getByRole('button', { name: '작성 취소' }).click()
        await page.getByRole('button', { name: '이력서 수정하기' }).click()
        await page.getByLabel('자기소개 제목').fill('새 편집 내용')
      }
    }
    const image = page.getByRole('button', { name: '프로젝트 이미지 변경' }).locator('img')
    await expect(image).toHaveAttribute('src', new URL('/new.png', page.url()).href)
    const finished = page.waitForEvent('requestfinished', (request) => request.url() === `${apiBaseUrl}/image`)
    oldUpload.resolve()
    await finished
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('새 편집 내용')
    await expect(image).toHaveAttribute('src', new URL('/new.png', page.url()).href)
  })

  test('race: late document A cannot overwrite loaded document B', async ({ page }) => {
    const oldLoad = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    await page.route(`${apiBaseUrl}/resume/race-a`, async (route) => {
      started.resolve()
      await oldLoad.promise
      await route.fulfill({ json: raceResume('race-a', '늦은 A') })
    })
    await page.route(`${apiBaseUrl}/resume/race-b`, (route) => route.fulfill({ json: raceResume('race-b', '현재 B') }))
    await page.goto('/resume?resumeId=race-a&mode=edit')
    await started.promise
    await expect(page.getByLabel('자기소개 제목')).toHaveCount(0)
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeDisabled()
    await page.evaluate(() => window.history.pushState(null, '', '/resume?resumeId=race-b&mode=edit'))
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('현재 B')
    const finished = page.waitForEvent('requestfinished', (request) => request.url() === `${apiBaseUrl}/resume/race-a`)
    oldLoad.resolve()
    await finished
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('현재 B')
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), studentResumeIdStorageKey)).toBe('race-b')
  })

  test('race: failed lookup cannot save a blank replacement and can retry', async ({ page }) => {
    let saves = 0
    let loads = 0
    await page.route(`${apiBaseUrl}/resume/race-failed`, async (route) => {
      loads += 1
      await route.fulfill(loads === 1 ? { status: 500 } : { json: raceResume('race-failed', '복구된 원본') })
    })
    await page.route('**/resume/save', async (route) => {
      saves += 1
      await route.fulfill({ status: 500 })
    })
    await page.goto('/resume?resumeId=race-failed&mode=edit')
    await expect(page.getByRole('button', { name: '이력서 다시 불러오기' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeDisabled()
    await expect(page.getByLabel('자기소개 제목')).toHaveCount(0)
    expect(saves).toBe(0)
    await page.getByRole('button', { name: '이력서 다시 불러오기' }).click()
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('복구된 원본')
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeEnabled()
  })

  test('race: delayed upload from document A cannot change document B', async ({ page }) => {
    const upload = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    await page.route(`${apiBaseUrl}/image`, async (route) => {
      started.resolve()
      await upload.promise
      await route.fulfill({ json: { imageUrl: new URL('/old-document.png', page.url()).href, key: 'old-document.png' }, status: 201 })
    })
    await page.route(`${apiBaseUrl}/resume/race-b`, (route) => route.fulfill({ json: raceResume('race-b', '현재 B') }))
    await page.goto('/resume?resumeId=resume-id&mode=edit')
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: '프로필 이미지 추가' }).click()
    await (await chooser).setFiles({ buffer: Buffer.from('png'), mimeType: 'image/png', name: 'race.png' })
    await started.promise
    await page.evaluate(() => window.history.pushState(null, '', '/resume?resumeId=race-b&mode=edit'))
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('현재 B')
    const finished = page.waitForEvent('requestfinished', (request) => request.url() === `${apiBaseUrl}/image`)
    upload.resolve()
    await finished
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('현재 B')
    await expect(page.getByRole('button', { name: '프로필 이미지 변경' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '프로필 이미지 추가' })).toBeEnabled()
  })

  test('race: late post-save lookup cannot restore the previous document', async ({ page }) => {
    const lookup = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    await page.route('**/resume/save', (route) => route.fulfill({
      json: { resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' },
    }))
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      started.resolve()
      await lookup.promise
      await route.fulfill({ json: raceResume('resume-id', '늦은 저장 조회') })
    })
    await page.route(`${apiBaseUrl}/resume/race-b`, (route) => route.fulfill({ json: raceResume('race-b', '현재 B') }))
    await page.goto('/resume?mode=edit')
    await page.getByLabel('자기소개 제목').fill('첫 저장')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await started.promise
    await page.evaluate(() => window.history.pushState(null, '', '/resume?resumeId=race-b&mode=edit'))
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('현재 B')
    const finished = page.waitForEvent('requestfinished', (request) => request.url() === `${apiBaseUrl}/resume/resume-id`)
    lookup.resolve()
    await finished
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))
    await expect(page).toHaveURL('/resume?resumeId=race-b&mode=edit')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('현재 B')
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeEnabled()
    await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), studentResumeIdStorageKey)).toBe('race-b')
  })

  test('race: typing during manual save stays editable and the next save preserves page IDs', async ({ page }) => {
    const save = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    const payloads: unknown[] = []
    await page.route('**/resume/save', async (route) => {
      payloads.push(route.request().postDataJSON())
      if (payloads.length === 1) {
        started.resolve()
        await save.promise
      }
      await route.fulfill({ json: { resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' } })
    })
    await page.goto('/resume?resumeId=resume-id&mode=edit')
    await page.getByLabel('자기소개 제목').fill('첫 저장 내용')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await started.promise
    await page.getByLabel('자기소개 제목').fill('아직 저장하지 않은 내용')
    save.resolve()
    await expect(page.getByRole('status')).toContainText('저장되지 않은 변경사항이 있습니다.')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('아직 저장하지 않은 내용')
    await expect(page).toHaveURL(/mode=edit/)
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    expect(payloads).toEqual([
      expect.objectContaining({ introduce: '첫 저장 내용' }),
      expect.objectContaining({ introduce: '아직 저장하지 않은 내용', pages: [
        expect.objectContaining({ id: 'server-page-1' }),
        expect.objectContaining({ id: 'server-page-2' }),
      ] }),
    ])
  })

  test('race: cancelling added pages restores a visible saved page', async ({ page }) => {
    await page.goto('/resume?mode=edit')
    const next = page.getByRole('button', { name: '다음 페이지' })
    await page.getByLabel('프로젝트 이름').fill('첫 프로젝트')
    await next.click()
    await page.getByRole('button', { name: '프로젝트 페이지 추가' }).click()
    await next.click()
    await page.getByRole('button', { name: '프로젝트 페이지 추가' }).click()
    await next.click()
    await page.getByRole('button', { name: '작성 취소' }).click()
    await expect(page.getByLabel('이력서 미리보기').getByRole('article')).toHaveCount(2)
    await expect(page.getByRole('button', { name: '이전 페이지' })).toBeDisabled()
    await expect(page.getByText('2 / 2')).toBeVisible()
  })

  test('race: failed upload preserves text and allows retry', async ({ page }) => {
    let uploads = 0
    await page.route(`${apiBaseUrl}/image`, async (route) => {
      uploads += 1
      await route.fulfill(uploads === 1
        ? { status: 500 }
        : { json: { imageUrl: new URL('/retried.png', page.url()).href, key: 'retried.png' }, status: 201 })
    })
    await page.goto('/resume?mode=edit')
    await page.getByLabel('자기소개 제목').fill('실패해도 유지')
    for (const attempt of [0, 1]) {
      const chooser = page.waitForEvent('filechooser')
      await page.getByRole('button', { name: '프로필 이미지 추가' }).click()
      await (await chooser).setFiles({ buffer: Buffer.from('png'), mimeType: 'image/png', name: 'race.png' })
      if (attempt === 0) {
        await expect(page.getByRole('alert').filter({ hasText: '이미지 업로드에 실패했습니다' })).toBeVisible()
        await expect(page.getByRole('button', { name: '프로필 이미지 추가' })).toBeEnabled()
        await expect(page.getByLabel('자기소개 제목')).toHaveValue('실패해도 유지')
      }
    }
    await expect(page.getByRole('button', { name: '프로필 이미지 변경' }).locator('img')).toHaveAttribute('src', new URL('/retried.png', page.url()).href)
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('실패해도 유지')
  })

  test('race: page ID lookup after saving preserves newer text and assigns IDs to the next save', async ({ page }) => {
    const lookup = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    const payloads: unknown[] = []
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      started.resolve()
      await lookup.promise
      await route.fulfill({ json: raceResume('resume-id', '첫 저장') })
    })
    await page.route('**/resume/save', async (route) => {
      payloads.push(route.request().postDataJSON())
      await route.fulfill({ json: { resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' } })
    })
    await page.goto('/resume?mode=edit')
    await page.getByLabel('자기소개 제목').fill('첫 저장')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await started.promise
    await page.getByLabel('자기소개 제목').fill('조회 중 추가 입력')
    lookup.resolve()
    await expect(page.getByRole('status')).toContainText('저장되지 않은 변경사항이 있습니다.')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('조회 중 추가 입력')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    expect(payloads[1]).toMatchObject({ introduce: '조회 중 추가 입력', pages: [
      { id: 'resume-id-profile' }, { id: 'resume-id-project' },
    ] })
  })

  test('race: failed page ID lookup reports partial success and retries on the next save', async ({ page }) => {
    let lookups = 0
    const payloads: unknown[] = []
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      lookups += 1
      await route.fulfill(lookups === 1 ? { status: 500 } : { json: raceResume('resume-id', '보존된 입력') })
    })
    await page.route('**/resume/save', async (route) => {
      payloads.push(route.request().postDataJSON())
      await route.fulfill({ json: { resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' } })
    })
    await page.goto('/resume?mode=edit')
    await page.getByLabel('자기소개 제목').fill('보존된 입력')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect(page.getByRole('alert').filter({ hasText: '이력서는 저장했지만 페이지 정보를 다시 불러오지 못했습니다.' })).toBeVisible()
    await expect(page).toHaveURL('/resume?resumeId=resume-id')
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeEnabled()
    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('보존된 입력')
    await page.getByLabel('자기소개 제목').fill('취소할 추가 입력')
    await page.getByRole('button', { name: '작성 취소' }).click()
    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('보존된 입력')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect(page.getByRole('status')).toContainText('이력서를 저장했습니다.')
    expect(lookups).toBe(2)
    expect(payloads).toEqual([
      expect.objectContaining({ introduce: '보존된 입력' }),
      expect.objectContaining({ introduce: '보존된 입력' }),
    ])
  })

  for (const query of ['mode=feedback', 'mode=edit&panel=writing']) {
    test(`race: same document ${query} navigation keeps dirty input and its idle deadline`, async ({ page }) => {
      let lookups = 0
      let autoSaves = 0
      await page.clock.install()
      await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
        lookups += 1
        await route.fulfill({ json: raceResume('resume-id', '조회 원본') })
      })
      await page.route('**/resume/auto-save', async (route) => {
        autoSaves += 1
        expect(route.request().postDataJSON()).toMatchObject({ introduce: '유지할 미저장 입력' })
        await route.fulfill({ json: { autoSaved: true, resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' } })
      })
      await page.goto('/resume?resumeId=resume-id&mode=edit')
      await expect(page.getByLabel('자기소개 제목')).toHaveValue('조회 원본')
      const initialLookups = lookups
      await page.getByLabel('자기소개 제목').fill('유지할 미저장 입력')
      await page.clock.runFor(0)
      await page.clock.fastForward(90_000)
      await page.evaluate((nextQuery) => window.history.pushState(null, '', `/resume?resumeId=resume-id&${nextQuery}`), query)
      await expect(page).toHaveURL(`/resume?resumeId=resume-id&${query}`)
      await expect(page.getByLabel('자기소개 제목')).toHaveValue('유지할 미저장 입력')
      await page.clock.runFor(0)
      await page.clock.fastForward(89_000)
      expect(autoSaves).toBe(0)
      await page.clock.fastForward(1_000)
      await expect.poll(() => autoSaves).toBe(1)
      await expect(page.getByRole('status')).toContainText('변경사항을 자동 저장했습니다.')
      expect(lookups).toBe(initialLookups)
    })
  }

  test('race: typing resets the 180 second idle deadline and pending manual save excludes autosave', async ({ page }) => {
    const manualSave = Promise.withResolvers<void>()
    const started = Promise.withResolvers<void>()
    let autoSaves = 0
    await page.clock.install()
    await page.route('**/resume/auto-save', async (route) => {
      autoSaves += 1
      expect(route.request().postDataJSON()).toMatchObject({ introduce: '새 입력' })
      await route.fulfill({ json: { autoSaved: true, resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' } })
    })
    await page.route('**/resume/save', async (route) => {
      started.resolve()
      await manualSave.promise
      await route.fulfill({ json: { resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' } })
    })
    await page.goto('/resume?resumeId=resume-id&mode=edit')
    await page.getByLabel('자기소개 제목').fill('이전 입력')
    await page.clock.runFor(0)
    await page.clock.fastForward(179_000)
    await page.getByLabel('자기소개 제목').fill('새 입력')
    await page.clock.runFor(0)
    await page.clock.fastForward(179_000)
    expect(autoSaves).toBe(0)
    await page.clock.fastForward(1_000)
    await expect.poll(() => autoSaves).toBe(1)
    await expect(page.getByRole('status')).toContainText('변경사항을 자동 저장했습니다.')
    await page.getByLabel('자기소개 제목').fill('수동 저장')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await started.promise
    await page.clock.fastForward(7_000)
    expect(autoSaves).toBe(1)
    manualSave.resolve()
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await page.clock.fastForward(180_000)
    expect(autoSaves).toBe(1)
  })

  test('opens resume management in preview mode before editing', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume')

    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '이력서 관리' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('button', { name: '이력서 수정하기' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toHaveCount(0)
    await expect(page.getByRole('button', { exact: true, name: '제출' })).toHaveCount(0)
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await expect(page.getByLabel('이력서 페이지 도구')).toHaveCount(0)

    await page.getByRole('button', { name: '이력서 수정하기' }).click()

    await expect(page.getByRole('button', { name: '작성 취소' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '제출' })).toBeVisible()
    await expect(page.getByLabel('이름').first()).toHaveValue('')
    await expect(page.getByLabel('학번 전공')).toHaveText('')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('')
    await expect(page.getByText('2 / 2')).toBeVisible()
    await page.getByRole('button', { name: '작성 취소' }).click()

    await expect(page.getByRole('button', { name: '이력서 수정하기' })).toBeVisible()
    await expect(page.getByLabel('이력서 페이지 도구')).toHaveCount(0)
  })

  test('submits the resume with the draft body from edit mode', async ({ page }) => {
    let saveRequestCount = 0
    let submitRequestBody: unknown

    await page.route('**/resume/save', async (route) => {
      saveRequestCount += 1
      await route.fulfill({ status: 500 })
    })
    await page.route(`${apiBaseUrl}/resume/submit`, async (route) => {
      submitRequestBody = route.request().postDataJSON()
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', submissionStatus: 'SUBMITTED' }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume')
    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    await page.getByLabel('자기소개 제목').fill('제출할 이력서')
    await page.getByRole('button', { exact: true, name: '제출' }).click()

    await expect.poll(() => submitRequestBody).toMatchObject({ introduce: '제출할 이력서' })
    expect(saveRequestCount).toBe(0)
    await expect(page.getByRole('status')).toContainText('이력서를 제출했습니다.')
    await expect(page.getByRole('button', { name: '이력서 수정하기' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toHaveCount(0)
    await expect(page).toHaveURL('/resume?resumeId=resume-id')
  })

  test('waits for the student response instead of flashing sample identity data', async ({ page }) => {
    let releaseUserRequest: (() => void) | undefined

    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await new Promise<void>((resolve) => {
        releaseUserRequest = resolve
      })
      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '',
          major: null,
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 0 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume?mode=edit')

    await expect(page.getByText('학생 정보를 불러오는 중입니다.')).toBeVisible()
    await expect(page.getByLabel('이름').first()).toHaveAttribute('placeholder', '이름을 입력해주세요.')
    await expect(page.getByLabel('학번 전공')).toHaveText('')
    await expect(page.getByText('홍길동', { exact: true })).toHaveCount(0)
    await expect(page.getByText('2415 인공지능소프트웨어과', { exact: true })).toHaveCount(0)

    await expect.poll(() => typeof releaseUserRequest).toBe('function')
    releaseUserRequest?.()

    await expect(page.getByLabel('이름').first()).toHaveValue('오혜민')
    await expect(page.getByLabel('학번 전공')).toHaveText('2110 소프트웨어개발과')
  })

  test('stacks loading messages instead of overlapping them', async ({ page }) => {
    const releaseUserRequest = Promise.withResolvers<void>()
    const releaseResumeRequest = Promise.withResolvers<void>()

    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await releaseUserRequest.promise
      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '',
          major: null,
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 0 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await releaseResumeRequest.promise
      await route.fulfill({
        body: JSON.stringify({
          email: '',
          id: 'resume-id',
          introduce: '',
          isPublic: false,
          majorName: '',
          name: '',
          pages: [
            { content: '', id: 'server-page-1', index: 0, type: 'PROFILE' },
            { content: '', id: 'server-page-2', index: 1, type: 'PROJECT' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-20T10:00:00.000Z',
          skills: [],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume?resumeId=resume-id&mode=edit')

    const userLoadingMessage = page.getByText('학생 정보를 불러오는 중입니다.')
    const resumeLoadingMessage = page.getByText('이력서를 불러오는 중입니다.')
    await expect(userLoadingMessage).toBeVisible()
    await expect(resumeLoadingMessage).toBeVisible()
    await expectLocatorsDoNotOverlap(userLoadingMessage, resumeLoadingMessage)

    releaseUserRequest.resolve()
    releaseResumeRequest.resolve()
  })

  test('renders edit controls and feedback drawer state', async ({ page }) => {
    let applyRequestBody: unknown

    await page.route((url) => url.href === `${apiBaseUrl}/feedback?documentId=resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          feedbacks: [
            {
              completedAt: '',
              content: '문장 근거를 한 줄 더 추가해보세요.',
              createdAt: '2026-09-20T10:00:00.000Z',
              feedbackId: 'feedback-1',
              pageDeleted: false,
              pageId: 'server-page-1',
              status: 'PENDING',
              teacherName: '김선생',
              x: 0.38,
              y: 0.42,
            },
            {
              completedAt: '2026-09-22T10:00:00.000Z',
              content: '프로젝트 성과를 숫자로 표현해보세요.',
              createdAt: '2026-09-21T10:00:00.000Z',
              feedbackId: 'feedback-2',
              pageDeleted: false,
              pageId: 'server-page-2',
              status: 'COMPLETED',
              teacherName: '이선생',
              x: 0.58,
              y: 0.36,
            },
          ],
          numberOfData: 2,
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/feedback/apply`, async (route) => {
      applyRequestBody = route.request().postDataJSON()
      const feedbackIds = Array.isArray((applyRequestBody as { feedbackIds?: unknown }).feedbackIds)
        ? (applyRequestBody as { feedbackIds: unknown[] }).feedbackIds
        : []
      await route.fulfill({
        body: JSON.stringify({ failed: [], successCount: feedbackIds.length }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?resumeId=resume-id&mode=feedback')

    await expect(page.getByRole('button', { name: '작성 취소' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeVisible()
    await expect(page.getByLabel('활동 작성 도구')).toBeVisible()
    await expect(page.getByLabel('프로젝트 작성 도구')).toBeVisible()
    const feedbackPanel = page.getByRole('complementary', { name: '피드백 목록' })

    await expect(feedbackPanel).toBeVisible()
    await expect(page.getByRole('heading', { name: '피드백 목록' })).toBeVisible()
    await expect(feedbackPanel.getByRole('button', { name: /문장 근거를 한 줄 더 추가해보세요/ })).toBeVisible()
    await expect(feedbackPanel.getByRole('button', { name: /프로젝트 성과를 숫자로 표현해보세요/ })).toBeVisible()
    await expect(feedbackPanel.getByText('0개 선택됨 · 미완료 1개 · 완료 1개')).toBeVisible()
    await expect(feedbackPanel.getByText('미완료', { exact: true })).toBeVisible()
    await expect(feedbackPanel.getByText('완료', { exact: true })).toBeVisible()
    await expect(
      page.locator('article[aria-label="이력서 작성 1쪽"]').getByRole('button', { name: /피드백 위치: 문장 근거를 한 줄 더 추가해보세요/ }),
    ).toBeVisible()
    const secondPageFeedbackMarker = page
      .locator('article[aria-label="이력서 작성 2쪽"]')
      .getByRole('button', { name: /피드백 위치: 프로젝트 성과를 숫자로 표현해보세요/ })
    await expect(secondPageFeedbackMarker).toBeVisible()
    await secondPageFeedbackMarker.click()
    await expect(feedbackPanel.getByText('0개 선택됨 · 미완료 1개 · 완료 1개')).toBeVisible()
    await expect(feedbackPanel.getByRole('paragraph').filter({ hasText: '프로젝트 성과를 숫자로 표현해보세요.' })).toBeVisible()
    await feedbackPanel.getByRole('button', { name: /문장 근거를 한 줄 더 추가해보세요/ }).click()

    const headerBox = await page.locator('main > div > div > header').boundingBox()
    const feedbackPanelBox = await feedbackPanel.boundingBox()

    expect(headerBox).not.toBeNull()
    expect(feedbackPanelBox).not.toBeNull()
    if (headerBox && feedbackPanelBox) {
      expect(headerBox.x + headerBox.width).toBeLessThanOrEqual(feedbackPanelBox.x + 1)
    }

    await expect(feedbackPanel.getByText('1개 선택됨 · 미완료 1개 · 완료 1개')).toBeVisible()
    await feedbackPanel.getByRole('button', { exact: true, name: '완료 처리하기' }).click()

    await expect.poll(() => applyRequestBody).toEqual({ applied: true, feedbackIds: ['feedback-1'] })
    await expect(page.getByRole('status')).toContainText('1개 피드백을 완료 처리했습니다.')
  })

  test('allows writing a resume before opening an existing resume', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const nameInput = page.getByLabel('이름').first()
    const introInput = page.getByLabel('자기소개 제목')
    const pageContentInput = page.getByLabel('1쪽 추가 내용')

    await nameInput.fill('김레포')
    await introInput.fill('저는 지금 이력서를 직접 작성하고 있습니다.')
    await pageContentInput.fill('첫 번째 페이지에 들어갈 추가 내용입니다.')

    await expect(nameInput).toHaveValue('김레포')
    await expect(introInput).toHaveValue('저는 지금 이력서를 직접 작성하고 있습니다.')
    await expect(pageContentInput).toContainText('첫 번째 페이지에 들어갈 추가 내용입니다.')
  })

  test('moves from the one-line introduction to ordinary text on Enter', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const introTitleInput = page.getByLabel('자기소개 제목')
    const introBodyInput = page.getByLabel('자기소개 내용')
    const initialBox = await introBodyInput.boundingBox()

    await introTitleInput.fill('첫 번째 줄')
    await introTitleInput.press('Enter')
    await expect(introBodyInput).toBeFocused()
    await introBodyInput.fill('두 번째 줄\n세 번째 줄\n네 번째 줄')

    await expect(introTitleInput).toHaveValue('첫 번째 줄')
    await expect(introBodyInput).toHaveValue('두 번째 줄\n세 번째 줄\n네 번째 줄')
    await expect
      .poll(async () => (await introBodyInput.boundingBox())?.height ?? 0)
      .toBeGreaterThan(initialBox?.height ?? 0)
  })

  test('saves the one-line introduction and following body as one API value', async ({ page }) => {
    let savedIntroduction = ''

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { introduce: string }
      savedIntroduction = requestBody.introduce
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume?mode=edit')

    await page.getByLabel('자기소개 제목').fill('한 줄 소개')
    await page.getByLabel('자기소개 제목').press('Enter')
    await page.getByLabel('자기소개 내용').fill('일반 텍스트 첫 줄\n일반 텍스트 둘째 줄')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect.poll(() => savedIntroduction).toBe('한 줄 소개\n일반 텍스트 첫 줄\n일반 텍스트 둘째 줄')
  })

  test('adds technology stack tags with Enter and saves them', async ({ page }) => {
    let savedSkills: readonly string[] = []

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { skills: readonly string[] }
      savedSkills = requestBody.skills
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume?mode=edit')

    const skillInput = page.getByRole('textbox', { exact: true, name: '기술스택' })

    await skillInput.fill('React')
    await skillInput.press('Enter')
    await skillInput.fill('TypeScript')
    await skillInput.press('Enter')
    await skillInput.fill('안녕')
    await skillInput.dispatchEvent('keydown', { code: 'Enter', isComposing: true, key: 'Enter', keyCode: 229 })
    await expect(page.getByRole('list', { name: '기술스택 태그' }).getByText('안녕', { exact: true })).toHaveCount(0)
    await skillInput.press('Enter')

    await expect(skillInput).toHaveValue('')
    await expect(page.getByRole('list', { name: '기술스택 태그' }).getByText('React', { exact: true })).toBeVisible()
    await expect(page.getByRole('list', { name: '기술스택 태그' }).getByText('TypeScript', { exact: true })).toBeVisible()
    await expect(page.getByRole('list', { name: '기술스택 태그' }).getByText('안녕', { exact: true })).toHaveCount(1)
    await expect(page.getByRole('list', { name: '기술스택 태그' }).getByText('녕', { exact: true })).toHaveCount(0)

    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedSkills).toEqual(['React', 'TypeScript', '안녕'])
  })

  test('uploads a project image and saves the returned image url', async ({ page }) => {
    let imageUploadRequested = false
    let imageUploadContentType = ''
    let savedProjectImageUrl = ''

    await page.route(`${apiBaseUrl}/image`, async (route) => {
      imageUploadRequested = true
      imageUploadContentType = route.request().headers()['content-type'] ?? ''
      await route.fulfill({
        body: JSON.stringify({
          imageUrl: 'https://cdn.example.test/dsm_repo/project.png',
          key: 'dsm_repo/project.png',
        }),
        contentType: 'application/json',
        status: 201,
      })
    })
    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as {
        pages: Array<{ project?: { imageUrl?: string } }>
      }
      savedProjectImageUrl = requestBody.pages[1]?.project?.imageUrl ?? ''
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: '프로젝트 이미지 추가' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      buffer: Buffer.from('fake png bytes'),
      mimeType: 'image/png',
      name: 'project.png',
    })

    await expect.poll(() => imageUploadRequested).toBe(true)
    expect(imageUploadContentType).toContain('multipart/form-data')
    await expect(page.getByRole('button', { name: '프로젝트 이미지 변경' })).toBeVisible()

    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect.poll(() => savedProjectImageUrl).toBe('https://cdn.example.test/dsm_repo/project.png')
  })

  test('resolves a root-relative uploaded project image url before previewing and saving', async ({ page }) => {
    let savedProjectImageUrl = ''
    const png1x1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lH9fWAAAAABJRU5ErkJggg==',
      'base64',
    )

    await page.route(`${apiBaseUrl}/image`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          imageUrl: '/relative-project.png',
          key: 'dsm_repo/relative-project.png',
        }),
        contentType: 'application/json',
        status: 201,
      })
    })
    await page.route(`${apiBaseUrl}/relative-project.png`, async (route) => {
      await route.fulfill({
        body: png1x1,
        contentType: 'image/png',
        status: 200,
      })
    })
    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as {
        pages: Array<{ project?: { imageUrl?: string } }>
      }
      savedProjectImageUrl = requestBody.pages[1]?.project?.imageUrl ?? ''
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: '프로젝트 이미지 추가' }).click()
    const fileChooser = await fileChooserPromise
    await fileChooser.setFiles({
      buffer: Buffer.from('fake png bytes'),
      mimeType: 'image/png',
      name: 'project.png',
    })

    const projectImage = page.getByRole('button', { name: '프로젝트 이미지 변경' }).locator('img')
    await expect(projectImage).toBeVisible()
    await expect.poll(async () => projectImage.evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth)).toBe(1)

    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect.poll(() => savedProjectImageUrl).toBe(`${apiBaseUrl}/relative-project.png`)
  })

  test('adds a portfolio URL as a QR code and saves the URL', async ({ page }) => {
    let savedPortfolioUrl = ''

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { portfolioUrl: string }
      savedPortfolioUrl = requestBody.portfolioUrl
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    await page.getByRole('button', { name: '포트폴리오 URL 추가' }).click()
    await expect(page.getByRole('dialog', { name: '자신의 메인 url을 입력해주세요.' })).toBeVisible()
    await expect(page.getByRole('textbox', { name: '메인 URL' })).toHaveCSS('color', 'rgb(255, 255, 255)')

    await page.getByRole('textbox', { name: '메인 URL' }).fill('github.com/mare2mare6')
    await page.getByRole('button', { name: '확인' }).click()
    await expect(page.getByText('http:// 또는 https://로 시작하는 URL을 입력해주세요.')).toBeVisible()

    await page.getByRole('textbox', { name: '메인 URL' }).fill('https://github.com/mare2mare6')
    await page.getByRole('button', { name: '확인' }).click()

    await expect(page.getByText('URL을 QR 코드로 추가했습니다.')).toBeVisible()
    const qrButton = page.getByRole('button', { name: '포트폴리오 URL 변경' })
    const qrImage = qrButton.getByRole('img', { name: '포트폴리오 QR 코드' })
    await expect(qrImage).toBeVisible()
    await expect(qrButton).toHaveCSS('border-top-width', '0px')
    await expect
      .poll(async () => {
        const [buttonBox, imageBox] = await Promise.all([qrButton.boundingBox(), qrImage.boundingBox()])

        return {
          height: imageBox && buttonBox ? Math.round(imageBox.height / buttonBox.height) : 0,
          width: imageBox && buttonBox ? Math.round(imageBox.width / buttonBox.width) : 0,
        }
      })
      .toEqual({ height: 1, width: 1 })

    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedPortfolioUrl).toBe('https://github.com/mare2mare6')
    await expect(page.getByRole('link', { name: '포트폴리오 QR 코드' })).toHaveAttribute('href', 'https://github.com/mare2mare6')
  })

  test('loads teacher-managed majors and updates the selected student major', async ({ page }) => {
    let updatedMajorId: number | undefined

    await page.route(`${apiBaseUrl}/user`, async (route) => {
      if (route.request().method() === 'PATCH') {
        const requestBody = route.request().postDataJSON() as { majorId: number }
        updatedMajorId = requestBody.majorId
        await route.fulfill({ status: 204 })
        return
      }

      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '',
          major: null,
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 0 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          majors: [
            { majorId: 1, name: 'Frontend Developer' },
            { majorId: 2, name: 'Backend Developer' },
          ],
          numberOfData: 2,
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume?mode=edit')

    const majorSelect = page.getByRole('button', { name: '희망 전공' })
    await expect(majorSelect).toContainText('전공미정')

    await majorSelect.click()
    await expect(page.getByRole('option', { name: 'Frontend Developer' })).toBeVisible()
    await page.getByRole('option', { name: 'Backend Developer' }).click()

    await expect.poll(() => updatedMajorId).toBe(2)
    await expect(majorSelect).toContainText('Backend Developer')
    await expect(page.getByText('전공을 변경했습니다.')).toBeVisible()
  })

  test('derives the department from the first two digits of the school number', async ({ page }) => {
    let schoolNumber = '1101'

    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: Number(schoolNumber[0]), number: 1, schoolNumber },
          introduce: '',
          major: null,
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 0 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    for (const [nextSchoolNumber, expectedDepartment] of [
      ['1101', '공통과정'],
      ['2210', '소프트웨어개발과'],
      ['3310', '임베디드소프트웨어과'],
      ['3410', '인공지능소프트웨어과'],
    ] as const) {
      schoolNumber = nextSchoolNumber
      await page.goto('/resume?mode=edit')
      await expect(page.getByLabel('학번 전공')).toHaveText(`${nextSchoolNumber} ${expectedDepartment}`)
    }
  })

  test('keeps the profile header text from overlapping on a scaled resume sheet', async ({ page }) => {
    await page.setViewportSize({ height: 720, width: 1180 })
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          major: 'Frontend Developer',
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 60 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/major`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          majors: [{ majorId: 1, name: 'Frontend Developer' }],
          numberOfData: 1,
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          email: 'student@example.com',
          id: 'resume-id',
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          isPublic: false,
          majorName: 'Frontend Developer',
          name: '오혜민',
          pages: [
            { content: '', id: 'page-1', index: 0, type: 'PROFILE' },
            { content: '', id: 'page-2', index: 1, type: 'PROJECT' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-20T10:00:00.000Z',
          skills: ['React'],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume?resumeId=resume-id&mode=edit')

    const editSheet = page.getByRole('article', { name: '이력서 작성 1쪽' })
    await expect(editSheet).toBeVisible()
    await expectLocatorsDoNotOverlap(editSheet.getByLabel('이름'), editSheet.getByLabel('희망 전공'))
    await expectLocatorsDoNotOverlap(editSheet.getByLabel('희망 전공'), editSheet.getByLabel('학번 전공'))
    await expectLocatorsDoNotOverlap(editSheet.getByLabel('학번 전공'), editSheet.getByLabel('이메일'))

    await page.goto('/resume?resumeId=resume-id')

    const previewSheet = page.getByRole('article', { name: '오혜민 이력서 1쪽' })
    await expect(previewSheet).toBeVisible()
    await expectLocatorsDoNotOverlap(previewSheet.getByRole('heading', { name: '오혜민' }), previewSheet.getByLabel('희망 전공'))
    await expectLocatorsDoNotOverlap(previewSheet.getByLabel('희망 전공'), previewSheet.getByLabel('학번 및 이메일'))
  })

  test('keeps the selected major beside the student name in view mode', async ({ page }) => {
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          major: 'Frontend Developer',
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 60 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          email: 'student@example.com',
          id: 'resume-id',
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          isPublic: false,
          majorName: 'Frontend Developer',
          name: '오혜민',
          pages: [
            { content: '', id: 'page-1', index: 0, type: 'PROFILE' },
            { content: '', id: 'page-2', index: 1, type: 'PROJECT' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-20T10:00:00.000Z',
          skills: ['React'],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume?resumeId=resume-id')

    const firstSheet = page.getByRole('article', { name: '오혜민 이력서 1쪽' })
    await expect(firstSheet.getByLabel('희망 전공')).toHaveText('Frontend Developer')
    await expect(firstSheet.getByLabel('학번 및 이메일')).toHaveText('2110 소프트웨어개발과 | student@example.com')
    await expect(page.getByRole('button', { name: '비공개' })).toHaveCount(0)
  })

  test('renders stored html paragraphs as resume text instead of visible tag text', async ({ page }) => {
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          major: 'Frontend Developer',
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 60 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          email: 'student@example.com',
          id: 'resume-id',
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          isPublic: false,
          majorName: 'Frontend Developer',
          name: '오혜민',
          pages: [
            {
              content: '<p>첫 번째 문단입니다.</p><p><strong>강조된 두 번째 문단입니다.</strong></p>',
              id: 'page-1',
              index: 0,
              type: 'PROFILE',
            },
            { content: '', id: 'page-2', index: 1, type: 'PROJECT' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-20T10:00:00.000Z',
          skills: ['React'],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume?resumeId=resume-id')

    const firstSheet = page.getByRole('article', { name: '오혜민 이력서 1쪽' })
    await expect(firstSheet.getByText('첫 번째 문단입니다.')).toBeVisible()
    await expect(firstSheet.locator('strong')).toContainText('강조된 두 번째 문단입니다.')
    await expect(firstSheet.getByText('<p>')).toHaveCount(0)
    await expect(firstSheet.getByText('</p>')).toHaveCount(0)
  })

  test('edits formatted content while saving markdown source', async ({ page }) => {
    let savedActivityContent = ''

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { pages: Array<{ content: string }> }
      savedActivityContent = requestBody.pages[0]?.content ?? ''
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })

    await expect(pageContentInput).toHaveAttribute('data-placeholder', '활동 내용과 날짜, 상세를 입력해주세요.')
    await expect(page.getByText('활동 내용과 날짜, 상세를 입력해주세요.', { exact: true })).toHaveCount(0)

    await pageContentInput.fill('안녕')
    await pageContentInput.press('ControlOrMeta+A')
    await page.getByRole('article', { name: '이력서 작성 1쪽' }).getByRole('button', { name: '굵게' }).click()

    await expect(pageContentInput.locator('strong, b')).toHaveText('안녕')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('**안녕**')
  })

  test('pastes Notion formatted content with images into free pages before the project template', async ({ page }) => {
    let savedPages: Array<{ content: string; index: number; type: string }> = []
    const pastedParagraphs = Array.from(
      { length: 24 },
      (_, index) => `<p>노션에서 붙여넣은 긴 활동 문단 ${index + 1}입니다. 문제 정의와 해결 과정을 함께 적었습니다.</p>`,
    ).join('')
    const pastedHtml = `
      <h2>노션 활동 정리</h2>
      <p><strong>강조된 성과</strong>와 <u>밑줄 메모</u>를 유지합니다.</p>
      <ul><li>서식 있는 목록 첫 줄</li><li>서식 있는 목록 둘째 줄</li></ul>
      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lb74JwAAAABJRU5ErkJggg==" alt="노션 이미지" />
      <p><a href="https://cdn.example.test/notion-capture.png">Screenshot 2026-06-17 at 09.53.01.png</a></p>
      ${pastedParagraphs}
    `

    await page.route(`${apiBaseUrl}/image`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({ key: 'dsm_repo/uploaded-paste.png', link: '/uploaded-paste.png' }),
        contentType: 'application/json',
        status: 201,
      })
    })
    await page.route(`${apiBaseUrl}/uploaded-paste.png`, async (route) => {
      await route.fulfill({
        body: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lH9fWAAAAABJRU5ErkJggg==',
          'base64',
        ),
        contentType: 'image/png',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          classInfo: { classNumber: 1, grade: 2, number: 10, schoolNumber: '2110' },
          introduce: '',
          major: 'Frontend',
          name: '오혜민',
          profileImageUrl: null,
          progress: { sections: [], totalPercent: 60 },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { pages: Array<{ content: string; index: number; type: string }> }
      savedPages = requestBody.pages
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const firstPageContent = page.getByRole('textbox', { name: '1쪽 추가 내용' })
    await firstPageContent.evaluate((editor, html) => {
      const clipboardData = new DataTransfer()
      clipboardData.setData('text/html', html)
      clipboardData.setData('text/plain', '노션 활동 정리')
      clipboardData.items.add(new File(['png'], 'clipboard-image.png', { type: 'image/png' }))
      editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
    }, pastedHtml)

    await expect(firstPageContent.locator('h2')).toHaveText('노션 활동 정리')
    await expect(firstPageContent.locator('strong')).toHaveText('강조된 성과')
    await expect(firstPageContent.locator('u')).toHaveText('밑줄 메모')
    await expect(firstPageContent.locator('img[alt="노션 이미지"]')).toBeVisible()
    await expect(firstPageContent.locator('img[alt="Screenshot 2026-06-17 at 09.53.01.png"]')).toBeVisible()
    await expect(firstPageContent.locator('img[alt="clipboard-image.png"]')).toBeVisible()
    await expect
      .poll(async () =>
        firstPageContent
          .locator('img[alt="clipboard-image.png"]')
          .evaluate((image) => image instanceof HTMLImageElement && image.naturalWidth),
      )
      .toBe(1)

    const secondPage = page.getByRole('article', { name: '이력서 작성 2쪽' })
    await expect(secondPage.getByLabel('프로젝트 이름')).toHaveCount(0)

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (await page.getByLabel('프로젝트 이름').count()) {
        break
      }

      await page.getByRole('button', { name: '다음 페이지' }).click()
    }

    await expect(page.getByLabel('프로젝트 이름')).toBeVisible()

    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedPages.at(-1)?.type).toBe('PROJECT')
    expect(savedPages[0]).toMatchObject({ index: 0, type: 'PROFILE' })
    expect(savedPages.slice(1, -1).every((savedPage, index) => savedPage.type === 'FREE' && savedPage.index === index + 1)).toBe(true)
    expect(savedPages.at(-1)?.index).toBe(savedPages.length - 1)
    const savedPastedContent = savedPages.map((savedPage) => savedPage.content).join('\n\n')
    expect(savedPastedContent).toContain('## 노션 활동 정리')
    expect(savedPastedContent).toContain('**강조된 성과**')
    expect(savedPastedContent).toContain('<u>밑줄 메모</u>')
    expect(savedPastedContent).toContain('![노션 이미지](data:image/png;base64')
    expect(savedPastedContent).toContain('![Screenshot 2026-06-17 at 09.53.01.png](https://cdn.example.test/notion-capture.png)')
    expect(savedPastedContent).toContain(`![clipboard-image.png](${apiBaseUrl}/uploaded-paste.png)`)
    expect(savedPages[1]?.content).toContain('노션에서 붙여넣은 긴 활동 문단')

    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (await page.getByRole('article', { name: '오혜민 이력서 2쪽' }).count()) {
        break
      }

      await page.getByRole('button', { name: '이전 페이지' }).click()
    }

    const secondPreviewPage = page.getByRole('article', { name: '오혜민 이력서 2쪽' })
    await expect(secondPreviewPage.locator('img, p, h1, h2, h3, h4, ul')).not.toHaveCount(0)
    await expect(secondPreviewPage.getByText('오혜민')).toHaveCount(0)
    await expect(secondPreviewPage.getByText('2110')).toHaveCount(0)
    await expect(secondPreviewPage.getByLabel('프로필 이미지')).toHaveCount(0)
  })

  test('preserves plain markdown block boundaries when pasting and saving resume content', async ({ page }) => {
    let savedPages: Array<{ content: string; index: number; type: string }> = []
    const pastedMarkdown = `#### 비전공자와의 소통 문제

- 기관 담당자와 소통하면서 개발자가 중요하게 생각하는 문제와 실제 운영자가 중요하게 생각하는 문제가 다르다는 점을 깨달았습니다.
- 서버 장애가 발생했을 때 개발팀은 클라우드 인프라, 장애 원인, 서버 비용, 복구 방식 등을 설명했지만, 담당자가 원하는 것은 복잡한 기술 설명이 아니라 지금 서비스가 정상적으로 사용 가능한지였습니다.

---

## 회고

프로젝트 초기에는 요구 기능을 빠짐없이 구현하고, FSD 같은 아키텍처로 코드를 잘 나누는 것에 집중했다.

## Activity

---

- **2025 전국 5개교 S/W 아이디어톤 학생 대표** 2025.05.12
- **학생회 임원 (전교부회장)** 2025.07 ~ 2026.08
- **FE & AI 멘토링 (스터디)** 2025.07 ~ 현재 진행 중`

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { pages: Array<{ content: string; index: number; type: string }> }
      savedPages = requestBody.pages
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume?mode=edit')
    const firstPageContent = page.getByRole('textbox', { name: '1쪽 추가 내용' })

    await firstPageContent.evaluate((editor, markdown) => {
      const clipboardData = new DataTransfer()
      clipboardData.setData('text/plain', markdown)
      editor.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData }))
    }, pastedMarkdown)

    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedPages[0]?.content ?? '').toContain('#### 비전공자와의 소통 문제')

    const savedContent = savedPages.map((savedPage) => savedPage.content).join('\n')
    expect(savedContent).toMatch(/#### 비전공자와의 소통 문제\s*\n+- 기관 담당자와 소통하면서/)
    expect(savedContent).toMatch(/---\s*\n+## 회고\s*\n+프로젝트 초기에는/)
    expect(savedContent).toMatch(/## Activity\s*\n+---\s*\n+- \*\*2025 전국 5개교 S\/W 아이디어톤 학생 대표\*\* 2025\.05\.12/)
    expect(savedContent).not.toContain('문제기관 담당자')
    expect(savedContent).not.toContain('한다.Activity')
  })

  test('renders the markdown toolbar as three icon groups', async ({ page }) => {
    await page.goto('/resume?mode=edit')

    const toolbar = page.getByLabel('활동 작성 도구')

    await expect(toolbar.locator('[data-markdown-tool-icon]')).toHaveCount(12)
    await expect(toolbar.locator('[data-markdown-tool-separator]')).toHaveCount(2)
    await expect(toolbar.locator('[data-markdown-tool-icon]').first()).toHaveCSS('width', '16px')
    await expect(toolbar.locator('[data-markdown-tool-icon]').first()).toHaveCSS('height', '16px')
    await expect
      .poll(() => toolbar.locator('[data-markdown-tool-icon]').evaluateAll((icons) => icons.map((icon) => icon.getAttribute('data-markdown-tool-icon'))))
      .toEqual(['heading', 'heading', 'heading', 'heading', 'bold', 'italic', 'underline', 'quote', 'bullet-list', 'divider', 'link', 'image'])

    for (const label of ['제목 1', '제목 2', '제목 3', '제목 4', '굵게', '기울임', '밑줄', '인용', '글머리 기호', '구분선', '링크', '이미지']) {
      await expect(toolbar.getByRole('button', { name: label })).toBeVisible()
    }
  })

  test('turns leading markdown shortcuts into Notion-style blocks', async ({ page }) => {
    let savedActivityContent = ''

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { pages: Array<{ content: string }> }
      savedActivityContent = requestBody.pages[0]?.content ?? ''
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume?mode=edit')

    let pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })

    await pageContentInput.fill('기본 본문')
    await expect(pageContentInput).toHaveCSS('font-size', '12px')
    await pageContentInput.fill('')

    for (const { fontSize, markdown, selector, shortcut, text } of [
      { fontSize: '24px', markdown: '# 프로젝트 경험', selector: 'h1', shortcut: '#', text: '프로젝트 경험' },
      { fontSize: '20px', markdown: '## 맡은 역할', selector: 'h2', shortcut: '##', text: '맡은 역할' },
      { fontSize: '18px', markdown: '### 문제 해결', selector: 'h3', shortcut: '###', text: '문제 해결' },
      { fontSize: '16px', markdown: '#### 회고', selector: 'h4', shortcut: '####', text: '회고' },
      { fontSize: '12px', markdown: '> 사용자 피드백', selector: 'blockquote', shortcut: '>', text: '사용자 피드백' },
    ]) {
      await pageContentInput.fill('')
      await pageContentInput.pressSequentially(shortcut)
      await pageContentInput.press('Space')

      await expect
        .poll(() =>
          pageContentInput.evaluate((editor) => {
            const selection = window.getSelection()
            const anchor = selection?.anchorNode
            const element = anchor instanceof HTMLElement ? anchor : anchor?.parentElement

            return {
              html: editor.innerHTML,
              selectionTag: element?.closest('h1, h2, h3, h4, blockquote')?.tagName.toLowerCase(),
            }
          }),
        )
        .toMatchObject({ selectionTag: selector })

      await page.keyboard.insertText(text)

      await expect(pageContentInput.locator(selector)).toHaveText(text)
      await expect(pageContentInput.locator(selector)).toHaveCSS('font-size', fontSize)
      await expect(pageContentInput).not.toContainText(markdown)
    }

    await pageContentInput.fill('')
    await pageContentInput.pressSequentially('-')
    await pageContentInput.press('Space')
    await page.keyboard.insertText('목록 내용')

    await expect(pageContentInput.locator('ul')).toBeVisible()
    await expect(pageContentInput.locator('li')).toHaveText('목록 내용')
    await expect(pageContentInput.locator('li')).toHaveCSS('font-size', '12px')

    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('- 목록 내용')

    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })
    savedActivityContent = ''
    await pageContentInput.fill('')
    await pageContentInput.pressSequentially('---')
    await pageContentInput.press('Space')

    await expect(pageContentInput.locator('hr')).toBeVisible()
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('---')
  })

  test('preserves Shift Enter line breaks when saving markdown blocks', async ({ page }) => {
    let savedActivityContent = ''

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as { pages: Array<{ content: string }> }
      savedActivityContent = requestBody.pages[0]?.content ?? ''
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume?mode=edit')

    let pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })

    await pageContentInput.fill('활동 첫 줄')
    await pageContentInput.press('Shift+Enter')
    await page.keyboard.insertText('활동 둘째 줄')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('활동 첫 줄\n활동 둘째 줄')

    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })
    savedActivityContent = ''
    await pageContentInput.fill('')
    await pageContentInput.pressSequentially('#')
    await pageContentInput.press('Space')
    await page.keyboard.insertText('제목 첫 줄')
    await pageContentInput.press('Shift+Enter')
    await page.keyboard.insertText('제목 둘째 줄')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('# 제목 첫 줄\n제목 둘째 줄')

    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })
    savedActivityContent = ''
    await pageContentInput.fill('')
    await pageContentInput.pressSequentially('>')
    await pageContentInput.press('Space')
    await page.keyboard.insertText('인용 첫 줄')
    await pageContentInput.press('Shift+Enter')
    await page.keyboard.insertText('인용 둘째 줄')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('> 인용 첫 줄\n> 인용 둘째 줄')
  })

  test('shows only the cursor without a focus border on resume writing fields', async ({ page }) => {
    await page.goto('/resume?mode=edit')

    for (const field of [
      page.getByLabel('이름').first(),
      page.getByLabel('자기소개 제목'),
      page.getByLabel('자기소개 내용'),
      page.getByRole('textbox', { name: '1쪽 추가 내용' }),
      page.getByLabel('프로젝트 이름'),
      page.getByRole('textbox', { name: '프로젝트 소개' }),
      page.getByRole('textbox', { name: '2쪽 추가 내용' }),
    ]) {
      await field.focus()
      await expect
        .poll(() =>
          field.evaluate((element) => {
            const style = getComputedStyle(element)

            return {
              backgroundColor: style.backgroundColor,
              outlineStyle: style.outlineStyle,
            }
          }),
        )
        .toEqual({ backgroundColor: 'rgba(0, 0, 0, 0)', outlineStyle: 'none' })
    }
  })

  test('keeps the blank resume fields reachable on tablet', async ({ page }) => {
    await page.setViewportSize({ height: 1024, width: 768 })
    await page.goto('/resume')

    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    const secondPageContentInput = page.getByLabel('2쪽 추가 내용')

    await secondPageContentInput.fill('태블릿에서도 두 번째 페이지 추가 내용을 작성합니다.')

    await expect(secondPageContentInput).toContainText('태블릿에서도 두 번째 페이지 추가 내용을 작성합니다.')
  })

  test('navigates to the add-page sheet and creates another project page', async ({ page }) => {
    let savedPages: Array<{ index: number; project?: { name?: string }; type: string }> = []

    await page.route('**/resume/save', async (route) => {
      const requestBody = route.request().postDataJSON() as {
        pages: Array<{ index: number; project?: { name?: string }; type: string }>
      }
      savedPages = requestBody.pages
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    await page.getByLabel('프로젝트 이름').fill('첫 프로젝트')
    await page.getByRole('button', { name: '다음 페이지' }).click()

    await expect(page.getByRole('button', { name: '프로젝트 페이지 추가' })).toBeVisible()
    await page.getByRole('button', { name: '프로젝트 페이지 추가' }).click()

    const thirdPage = page.getByRole('article', { name: '이력서 작성 3쪽' })
    await expect(thirdPage).toBeVisible()
    await expect(page.getByText('3 / 3')).toBeVisible()
    await thirdPage.getByLabel('프로젝트 이름').fill('Repo Project V2')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect.poll(() => savedPages).toHaveLength(3)
    expect(savedPages[2]).toMatchObject({
      index: 2,
      project: { name: 'Repo Project V2' },
      type: 'PROJECT',
    })
  })

  test('saves the blank resume as a new resume', async ({ page }) => {
    let saveRequestCount = 0

    await page.route(`${apiBaseUrl}/user`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          classInfo: {
            classNumber: 1,
            grade: 2,
            number: 10,
            schoolNumber: '2110',
          },
          introduce:
            '새벽자습너무 졸립니다. 뭘 적지.. 한줄소개는 이런식으로 쭉쭉 들어갑니다. 줄넘김 가능합니다. 자기소개자기소개자기소개자기소개자기소개자기소개..',
          major: null,
          name: '오혜민',
          profileImageUrl: null,
          progress: {
            sections: [],
            totalPercent: 0,
          },
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          email: 'student@example.com',
          id: 'resume-id',
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          isPublic: false,
          majorName: '2110',
          name: '오혜민',
          pages: [
            { content: '# 첫 번째 페이지 내용\n**굵은 내용**', id: 'server-page-1', index: 0, type: 'PROFILE' },
            {
              content: '## 프로젝트 회고',
              id: 'server-page-2',
              index: 1,
              project: {
                endDate: '2026-09-18',
                imageUrl: null,
                name: 'Repo',
                startDate: '2026-09-01',
                summary: '디지털 레주메 플랫폼',
              },
              type: 'PROJECT',
            },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-17T09:00:00.000Z',
          skills: ['React', 'TypeScript'],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route('**/resume/save', async (route) => {
      saveRequestCount += 1
      const requestBody: unknown = route.request().postDataJSON()

      if (saveRequestCount === 1) {
        expect(requestBody).toEqual({
          email: 'student@example.com',
          introduce: '사용자 경험을 개선하는 개발자입니다.',
          pages: [
            { content: '# 첫 번째 페이지 내용\n**굵은 내용**', index: 0, type: 'PROFILE' },
            {
              content: '## 프로젝트 회고',
              index: 1,
              project: {
                endDate: '2026-09-18',
                name: 'Repo',
                startDate: '2026-09-01',
                summary: '디지털 레주메 플랫폼',
              },
              type: 'PROJECT',
            },
          ],
          portfolioUrl: '',
          skills: ['React', 'TypeScript'],
        })
      } else {
        expect(requestBody).toMatchObject({
          pages: [
            { content: '# 첫 저장 뒤 수정한 내용', id: 'server-page-1', index: 0, type: 'PROFILE' },
            { id: 'server-page-2', index: 1, type: 'PROJECT' },
          ],
        })
      }

      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-17T09:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume')

    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    await expect(page.getByLabel('이름').first()).toHaveValue('오혜민')
    await expect(page.getByLabel('학번 전공')).toHaveText('2110 소프트웨어개발과')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('')
    await page.getByLabel('이메일').first().fill('student@example.com')
    await page.getByLabel('자기소개 제목').fill('사용자 경험을 개선하는 개발자입니다.')
    const skillInput = page.getByRole('textbox', { exact: true, name: '기술스택' })
    await skillInput.fill('React')
    await skillInput.press('Enter')
    await skillInput.fill('TypeScript')
    await skillInput.press('Enter')
    await page.getByLabel('1쪽 추가 내용').fill('# 첫 번째 페이지 내용\n**굵은 내용**')
    await page.getByLabel('프로젝트 이름').fill('Repo')
    await page.getByLabel('프로젝트 시작일').fill('2026-09-01')
    await page.getByLabel('프로젝트 종료일').fill('2026-09-18')
    await page.getByRole('textbox', { name: '프로젝트 소개' }).fill('디지털 레주메 플랫폼')
    await page.getByLabel('2쪽 추가 내용').fill('## 프로젝트 회고')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect(page.getByRole('status')).toContainText('이력서를 저장했습니다.')
    await expect(page.getByRole('button', { name: '비공개' })).toHaveCount(0)
    await expect(page).toHaveURL('/resume?resumeId=resume-id')
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await expect(page.getByLabel('이력서 페이지 도구')).toHaveCount(0)
    await expect(page.evaluate((storageKey) => window.localStorage.getItem(storageKey), studentResumeIdStorageKey)).resolves.toBe(
      'resume-id',
    )
    const secondPreviewPage = page.getByRole('article', { name: '오혜민 이력서 2쪽' })
    await expect(secondPreviewPage.getByRole('heading', { name: 'Repo' })).toBeVisible()
    await expect(secondPreviewPage.getByText('2026-09-01 ~ 2026-09-18')).toBeVisible()
    await expect(secondPreviewPage.getByText('디지털 레주메 플랫폼')).toBeVisible()
    await expect(secondPreviewPage.getByText('사용자 경험을 개선하는 개발자입니다.')).toHaveCount(0)

    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    await page.getByLabel('1쪽 추가 내용').fill('첫 저장 뒤 수정한 내용')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect(page.getByRole('status')).toContainText('이력서를 저장했습니다.')
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    expect(saveRequestCount).toBe(2)
  })

  test('omits empty optional project fields when saving a new resume', async ({ page }) => {
    await page.route('**/resume/save', async (route) => {
      expect(route.request().postDataJSON()).toEqual({
        email: '',
        introduce: '',
        pages: [
          { content: '', index: 0, type: 'PROFILE' },
          { content: '', index: 1, type: 'PROJECT' },
        ],
        portfolioUrl: '',
        skills: [],
      })

      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume')

    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect(page.getByRole('status')).toContainText('이력서를 저장했습니다.')
  })

  test('updates a loaded resume with server page ids and preserves unedited free pages', async ({ page }) => {
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          email: 'student@example.com',
          id: 'resume-id',
          introduce: '기존 자기소개',
          isPublic: false,
          majorName: '2110 인공지능소프트웨어과',
          name: '오혜민',
          pages: [
            { content: '기존 활동', id: 'server-page-1', index: 0, type: 'PROFILE' },
            { content: '', id: 'server-page-2', index: 1, type: 'PROJECT' },
            { content: '추가 자유 페이지', id: 'server-page-3', index: 2, type: 'FREE' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-19T10:00:00.000Z',
          skills: [],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route('**/resume/save', async (route) => {
      expect(route.request().postDataJSON()).toMatchObject({
        pages: [
          { content: '수정한 활동', id: 'server-page-1', index: 0, type: 'PROFILE' },
          { content: '', id: 'server-page-2', index: 1, type: 'PROJECT' },
          { content: '추가 자유 페이지', id: 'server-page-3', index: 2, type: 'FREE' },
        ],
      })

      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:05:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume?resumeId=resume-id&mode=edit')
    const activityInput = page.getByLabel('1쪽 추가 내용')

    await expect(activityInput).toContainText('기존 활동')
    await activityInput.fill('수정한 활동')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect(page.getByRole('status')).toContainText('이력서를 저장했습니다.')
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await expect(page.getByLabel('이력서 페이지 도구')).toHaveCount(0)
  })

  test('restores the last saved resume when reopening resume management', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('repo.resume.id.student%40dsm.hs.kr', 'resume-id')
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          id: 'resume-id',
          introduce: '저장된 자기소개',
          isPublic: false,
          majorName: '2110 인공지능소프트웨어과',
          name: '오혜민',
          pages: [
            { content: '저장된 활동', id: 'server-page-1', index: 0, type: 'PROFILE' },
            { content: '', id: 'server-page-2', index: 1, type: 'PROJECT' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-20T10:05:00.000Z',
          skills: [],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume')

    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await expect(page.getByLabel('이력서 페이지 도구')).toHaveCount(0)
    await page.getByRole('button', { name: '이력서 수정하기' }).click()

    await expect(page.getByLabel('자기소개 제목')).toHaveValue('저장된 자기소개')
    await expect(page.getByLabel('1쪽 추가 내용')).toContainText('저장된 활동')
  })

  test('restores a legacy saved resume id when reopening resume management', async ({ page }) => {
    let resumeRequestCount = 0

    await page.addInitScript(() => {
      window.localStorage.setItem('repo.resume.id', 'resume-id')
    })
    await page.route(`${apiBaseUrl}/resume/resume-id`, async (route) => {
      resumeRequestCount += 1
      await route.fulfill({
        body: JSON.stringify({
          id: 'resume-id',
          introduce: '레거시 저장 이력서',
          isPublic: false,
          majorName: 'Backend',
          name: '김레포',
          pages: [
            { content: '레거시 활동', id: 'server-page-1', index: 0, type: 'PROFILE' },
            { content: '', id: 'server-page-2', index: 1, type: 'PROJECT' },
          ],
          portfolioUrl: '',
          profileImageUrl: '',
          savedAt: '2026-09-20T10:05:00.000Z',
          skills: [],
          submissionStatus: 'ONGOING',
        }),
        contentType: 'application/json',
        status: 200,
      })
    })

    await page.goto('/resume')

    await expect.poll(() => resumeRequestCount).toBe(1)
    await expect(page.evaluate(() => window.localStorage.getItem('repo.resume.id.student%40dsm.hs.kr'))).resolves.toBe('resume-id')
    await expect(page.evaluate(() => window.localStorage.getItem('repo.resume.id'))).resolves.toBeNull()
    await expect(page.getByLabel('이력서 미리보기')).toBeVisible()
    await page.getByRole('button', { name: '이력서 수정하기' }).click()

    await expect(page.getByLabel('자기소개 제목')).toHaveValue('레거시 저장 이력서')
    await expect(page.getByLabel('1쪽 추가 내용')).toContainText('레거시 활동')
  })

  test('shows a fixed toast after manual save', async ({ page }) => {
    await page.route('**/resume/save', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume')

    await page.getByRole('button', { name: '이력서 수정하기' }).click()
    await page.getByLabel('자기소개 제목').fill('임시저장할 한줄소개')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    const toast = page.getByRole('status')
    await expect(toast).toContainText('이력서를 저장했습니다.')
    await expect(toast.locator('..')).toHaveCSS('position', 'fixed')
  })

  test('auto-saves all resume fields after three minutes without user input', async ({ page }) => {
    let autoSaveRequestCount = 0

    await page.clock.install()
    await page.route('**/resume/auto-save', async (route) => {
      autoSaveRequestCount += 1
      expect(route.request().postDataJSON()).toMatchObject({
        email: 'student@example.com',
        introduce: '3분 뒤 저장되는 한줄소개',
        portfolioUrl: '',
        skills: [],
      })
      await route.fulfill({
        body: JSON.stringify({ autoSaved: true, resumeId: 'resume-id', savedAt: '2026-09-20T10:03:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume?mode=edit')

    await page.getByLabel('이메일').first().fill('student@example.com')
    await page.getByLabel('자기소개 제목').fill('3분 뒤 저장되는 한줄소개')
    await page.clock.runFor(0)

    await page.clock.fastForward(179_000)
    expect(autoSaveRequestCount).toBe(0)

    await page.clock.fastForward(1_000)
    await expect.poll(() => autoSaveRequestCount).toBe(1)
    await expect(page.getByRole('status')).toContainText('변경사항을 자동 저장했습니다.')
  })

  test('stops auto-save after a released resume conflict', async ({ page }) => {
    let autoSaveRequestCount = 0

    await page.clock.install()
    await page.route('**/resume/auto-save', async (route) => {
      autoSaveRequestCount += 1
      await route.fulfill({
        body: JSON.stringify({ message: '공개된 이력서는 수정할 수 없습니다.' }),
        contentType: 'application/json',
        status: 409,
      })
    })
    await page.goto('/resume?mode=edit')

    await page.getByLabel('자기소개 제목').fill('공개 후 수정 시도')
    await page.clock.fastForward(180_000)

    await expect.poll(() => autoSaveRequestCount).toBe(1)
    await expect(page.getByRole('alert').filter({ hasText: '공개된 이력서는 수정할 수 없습니다.' })).toBeVisible()

    await page.getByLabel('이메일').first().fill('blocked@example.com')
    await page.clock.fastForward(180_000)

    expect(autoSaveRequestCount).toBe(1)
  })
})
