import { expect, test } from '@playwright/test'

import { authenticateAs } from './auth-fixtures'

const apiBaseUrl = 'http://52.78.201.218'

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

  test('opens a blank resume in write mode by default', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume')

    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '이력서 관리' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('button', { name: '임시저장' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeVisible()
    await expect(page.getByLabel('이름').first()).toHaveValue('')
    await expect(page.getByLabel('학번 전공')).toHaveValue('')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('')
    await expect(page.getByRole('button', { name: '이력서 수정하기' })).toHaveCount(0)
    await expect(page.getByText('2 / 5')).toBeVisible()
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

    await page.goto('/resume')

    await expect(page.getByText('학생 정보를 불러오는 중입니다.')).toBeVisible()
    await expect(page.getByLabel('이름').first()).toHaveAttribute('placeholder', '이름을 입력해주세요.')
    await expect(page.getByLabel('학번 전공')).toHaveAttribute('placeholder', '학번과 전공을 입력해주세요.')
    await expect(page.getByText('홍길동', { exact: true })).toHaveCount(0)
    await expect(page.getByText('2415 인공지능소프트웨어과', { exact: true })).toHaveCount(0)

    expect(releaseUserRequest).toBeDefined()
    releaseUserRequest?.()

    await expect(page.getByLabel('이름').first()).toHaveValue('오혜민')
    await expect(page.getByLabel('학번 전공')).toHaveValue('2110')
  })

  test('renders edit controls and feedback drawer state', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=feedback')

    await expect(page.getByRole('button', { name: '임시저장' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeVisible()
    await expect(page.getByLabel('활동 작성 도구')).toBeVisible()
    await expect(page.getByLabel('프로젝트 작성 도구')).toBeVisible()
    await expect(page.getByRole('complementary', { name: '피드백 목록' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '피드백 목록' })).toBeVisible()
    await expect(page.getByText('피드백 제목')).toHaveCount(8)
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

  test('supports a four-line self introduction that grows with line breaks', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const introInput = page.getByLabel('자기소개 제목')
    const initialBox = await introInput.boundingBox()

    expect(await introInput.evaluate((element) => element.tagName)).toBe('TEXTAREA')
    await introInput.fill('첫 번째 줄\n두 번째 줄\n세 번째 줄\n네 번째 줄')

    await expect(introInput).toHaveValue('첫 번째 줄\n두 번째 줄\n세 번째 줄\n네 번째 줄')
    await expect
      .poll(async () => (await introInput.boundingBox())?.height ?? 0)
      .toBeGreaterThan(initialBox?.height ?? 0)
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

    await expect(skillInput).toHaveValue('')
    await expect(page.getByRole('list', { name: '기술스택 태그' }).getByText('React', { exact: true })).toBeVisible()
    await expect(page.getByRole('list', { name: '기술스택 태그' }).getByText('TypeScript', { exact: true })).toBeVisible()

    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedSkills).toEqual(['React', 'TypeScript'])
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

    const majorSelect = page.getByLabel('희망 전공')
    await expect(majorSelect).toContainText('Frontend Developer')
    await expect(majorSelect).toContainText('Backend Developer')

    await majorSelect.selectOption({ label: 'Backend Developer' })

    await expect.poll(() => updatedMajorId).toBe(2)
    await expect(majorSelect).toHaveValue('2')
    await expect(page.getByText('전공을 변경했습니다.')).toBeVisible()
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
    await expect(firstSheet.getByLabel('학번 및 이메일')).toHaveText('2110 | student@example.com')
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

  test('keeps the blank resume fields reachable on tablet', async ({ page }) => {
    await page.setViewportSize({ height: 1024, width: 768 })
    await page.goto('/resume')

    const secondPageContentInput = page.getByLabel('2쪽 추가 내용')

    await secondPageContentInput.fill('태블릿에서도 두 번째 페이지 추가 내용을 작성합니다.')

    await expect(secondPageContentInput).toContainText('태블릿에서도 두 번째 페이지 추가 내용을 작성합니다.')
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
            { content: '첫 저장 뒤 수정한 내용', id: 'server-page-1', index: 0, type: 'PROFILE' },
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

    await expect(page.getByLabel('이름').first()).toHaveValue('오혜민')
    await expect(page.getByLabel('학번 전공')).toHaveValue('2110')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue(
      '새벽자습너무 졸립니다. 뭘 적지.. 한줄소개는 이런식으로 쭉쭉 들어갑니다. 줄넘김 가능합니다. 자기소개자기소개자기소개자기소개자기소개자기소개..',
    )
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
    await expect(page.getByRole('button', { name: '비공개' })).toBeVisible()
    await expect(page).toHaveURL('/resume?resumeId=resume-id&mode=edit')
    await expect(page.evaluate(() => window.localStorage.getItem('repo.resume.id'))).resolves.toBe('resume-id')

    await page.getByLabel('1쪽 추가 내용').fill('첫 저장 뒤 수정한 내용')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect(page.getByRole('status')).toContainText('이력서를 저장했습니다.')
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
    await expect(activityInput).toContainText('수정한 활동')
  })

  test('restores the last saved resume when reopening resume management', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('repo.resume.id', 'resume-id')
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

    await expect(page.getByLabel('자기소개 제목')).toHaveValue('저장된 자기소개')
    await expect(page.getByLabel('1쪽 추가 내용')).toContainText('저장된 활동')
  })

  test('shows a fixed toast after manual temporary save', async ({ page }) => {
    await page.route('**/resume/auto-save', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ autoSaved: true, resumeId: 'resume-id', savedAt: '2026-09-20T10:00:00.000Z' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.goto('/resume')

    await page.getByLabel('자기소개 제목').fill('임시저장할 한줄소개')
    await page.getByRole('button', { name: '임시저장' }).click()

    const toast = page.getByRole('status')
    await expect(toast).toContainText('이력서를 임시저장했습니다.')
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
    await page.goto('/resume')

    await page.getByLabel('이메일').first().fill('student@example.com')
    await page.getByLabel('자기소개 제목').fill('3분 뒤 저장되는 한줄소개')
    await page.clock.runFor(0)

    await page.clock.fastForward(179_999)
    expect(autoSaveRequestCount).toBe(0)

    await page.clock.fastForward(1)
    await expect.poll(() => autoSaveRequestCount).toBe(1)
    await expect(page.getByRole('status')).toContainText('변경사항을 자동 저장했습니다.')
  })
})
