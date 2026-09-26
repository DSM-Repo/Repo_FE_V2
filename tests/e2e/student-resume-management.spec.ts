import { expect, test } from '@playwright/test'

import { authenticateAs } from './auth-fixtures'

const apiBaseUrl = 'http://52.78.201.218'
const studentResumeIdStorageKey = 'repo.resume.id.student%40dsm.hs.kr'

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
    await expect(page.getByLabel('학번 전공')).toHaveText('')
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('')
    await expect(page.getByRole('button', { name: '이력서 수정하기' })).toHaveCount(0)
    await expect(page.getByText('2 / 2')).toBeVisible()
    await expect(page.getByLabel('이력서 페이지 도구')).toBeVisible()
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
    await expect(page.getByLabel('학번 전공')).toHaveText('')
    await expect(page.getByText('홍길동', { exact: true })).toHaveCount(0)
    await expect(page.getByText('2415 인공지능소프트웨어과', { exact: true })).toHaveCount(0)

    await expect.poll(() => typeof releaseUserRequest).toBe('function')
    releaseUserRequest?.()

    await expect(page.getByLabel('이름').first()).toHaveValue('오혜민')
    await expect(page.getByLabel('학번 전공')).toHaveText('2110 소프트웨어개발과')
  })

  test('renders edit controls and feedback drawer state', async ({ page }) => {
    let completeRequestCount = 0
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
              x: 120,
              y: 160,
            },
            {
              completedAt: '',
              content: '프로젝트 성과를 숫자로 표현해보세요.',
              createdAt: '2026-09-21T10:00:00.000Z',
              feedbackId: 'feedback-2',
              pageDeleted: false,
              pageId: 'server-page-2',
              status: 'PENDING',
              teacherName: '이선생',
              x: 80,
              y: 220,
            },
          ],
          numberOfData: 2,
        }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/feedback/feedback-1/complete`, async (route) => {
      completeRequestCount += 1
      await route.fulfill({
        body: JSON.stringify({ feedbackId: 'feedback-1', status: 'COMPLETED' }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.route(`${apiBaseUrl}/feedback/apply`, async (route) => {
      applyRequestBody = route.request().postDataJSON()
      await route.fulfill({
        body: JSON.stringify({ failed: [], successCount: 1 }),
        contentType: 'application/json',
        status: 200,
      })
    })
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?resumeId=resume-id&mode=feedback')

    await expect(page.getByRole('button', { name: '임시저장' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeVisible()
    await expect(page.getByLabel('활동 작성 도구')).toBeVisible()
    await expect(page.getByLabel('프로젝트 작성 도구')).toBeVisible()
    const feedbackPanel = page.getByRole('complementary', { name: '피드백 목록' })

    await expect(feedbackPanel).toBeVisible()
    await expect(page.getByRole('heading', { name: '피드백 목록' })).toBeVisible()
    await expect(feedbackPanel.getByRole('button', { name: /문장 근거를 한 줄 더 추가해보세요/ })).toBeVisible()
    await expect(feedbackPanel.getByRole('button', { name: /프로젝트 성과를 숫자로 표현해보세요/ })).toBeVisible()

    await feedbackPanel.getByRole('button', { exact: true, name: '완료 처리' }).click()

    await expect.poll(() => completeRequestCount).toBe(1)
    await expect(page.getByRole('status')).toContainText('피드백을 완료 처리했습니다.')
    await expect(page.getByText('반영 완료')).toHaveCount(1)

    await feedbackPanel.getByRole('button', { exact: true, name: '전체 완료 처리' }).click()

    await expect.poll(() => applyRequestBody).toEqual({ applied: true, feedbackIds: ['feedback-2'] })
    await expect(page.getByRole('status')).toContainText('1개 피드백을 완료 처리했습니다.')
    await expect(page.getByText('반영 완료')).toHaveCount(2)
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

  test('renders the markdown toolbar as three icon groups', async ({ page }) => {
    await page.goto('/resume?mode=edit')

    const toolbar = page.getByLabel('활동 작성 도구')

    await expect(toolbar.locator('[data-markdown-tool-icon]')).toHaveCount(10)
    await expect(toolbar.locator('[data-markdown-tool-separator]')).toHaveCount(2)

    for (const label of ['제목 1', '제목 2', '제목 3', '제목 4', '굵게', '기울임', '밑줄', '인용', '링크', '이미지']) {
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

    const pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })

    for (const { fontSize, markdown, selector, shortcut, text } of [
      { fontSize: '24px', markdown: '# 프로젝트 경험', selector: 'h1', shortcut: '#', text: '프로젝트 경험' },
      { fontSize: '20px', markdown: '## 맡은 역할', selector: 'h2', shortcut: '##', text: '맡은 역할' },
      { fontSize: '18px', markdown: '### 문제 해결', selector: 'h3', shortcut: '###', text: '문제 해결' },
      { fontSize: '16px', markdown: '#### 회고', selector: 'h4', shortcut: '####', text: '회고' },
      { fontSize: '14px', markdown: '> 사용자 피드백', selector: 'blockquote', shortcut: '>', text: '사용자 피드백' },
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

    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('> 사용자 피드백')
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

    const pageContentInput = page.getByRole('textbox', { name: '1쪽 추가 내용' })

    await pageContentInput.fill('활동 첫 줄')
    await pageContentInput.press('Shift+Enter')
    await page.keyboard.insertText('활동 둘째 줄')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('활동 첫 줄\n활동 둘째 줄')

    savedActivityContent = ''
    await pageContentInput.fill('')
    await pageContentInput.pressSequentially('#')
    await pageContentInput.press('Space')
    await page.keyboard.insertText('제목 첫 줄')
    await pageContentInput.press('Shift+Enter')
    await page.keyboard.insertText('제목 둘째 줄')
    await page.getByRole('button', { exact: true, name: '저장' }).click()
    await expect.poll(() => savedActivityContent).toBe('# 제목 첫 줄\n제목 둘째 줄')

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

    const pageTools = page.getByLabel('이력서 페이지 도구')
    await expect(pageTools.getByRole('button', { name: '텍스트 작성' })).toBeVisible()
    await expect(pageTools.getByRole('button', { name: '이미지 추가 준비 중' })).toBeVisible()
    await expect(pageTools.getByRole('button', { name: '파일 업로드 준비 중' })).toBeVisible()
    await pageTools.getByRole('button', { name: '다음 페이지' }).click()

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
    await expect(page).toHaveURL('/resume?resumeId=resume-id&mode=edit')
    await expect(page.evaluate((storageKey) => window.localStorage.getItem(storageKey), studentResumeIdStorageKey)).resolves.toBe(
      'resume-id',
    )

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

    await page.clock.fastForward(179_000)
    expect(autoSaveRequestCount).toBe(0)

    await page.clock.fastForward(1_000)
    await expect.poll(() => autoSaveRequestCount).toBe(1)
    await expect(page.getByRole('status')).toContainText('변경사항을 자동 저장했습니다.')
  })
})
