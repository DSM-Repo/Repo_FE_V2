import { expect, test } from '@playwright/test'

const apiBaseUrl = 'http://52.78.201.218'

test.describe('student resume management', () => {
  test('opens a blank resume in write mode by default', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume')

    await expect(page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('link', { name: '이력서 관리' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    await expect(page.getByRole('button', { name: '임시저장' })).toBeVisible()
    await expect(page.getByRole('button', { exact: true, name: '저장' })).toBeVisible()
    await expect(page.getByLabel('이름').first()).toHaveValue('홍길동')
    await expect(page.getByLabel('자기소개 내용').first()).toHaveValue('')
    await expect(page.getByRole('button', { name: '이력서 수정하기' })).toHaveCount(0)
    await expect(page.getByText('2 / 5')).toBeVisible()
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
    const introInput = page.getByLabel('자기소개 내용').first()
    const pageContentInput = page.getByLabel('1쪽 추가 내용')

    await nameInput.fill('김레포')
    await introInput.fill('저는 지금 이력서를 직접 작성하고 있습니다.')
    await pageContentInput.fill('첫 번째 페이지에 들어갈 추가 내용입니다.')

    await expect(nameInput).toHaveValue('김레포')
    await expect(introInput).toHaveValue('저는 지금 이력서를 직접 작성하고 있습니다.')
    await expect(pageContentInput).toHaveValue('첫 번째 페이지에 들어갈 추가 내용입니다.')
  })

  test('previews markdown shortcuts while keeping markdown in content', async ({ page }) => {
    await page.setViewportSize({ height: 1080, width: 1920 })
    await page.goto('/resume?mode=edit')

    const pageContentInput = page.getByLabel('1쪽 추가 내용')

    await pageContentInput.click()
    await pageContentInput.pressSequentially('# 오혜민')
    await pageContentInput.press('Enter')
    await pageContentInput.pressSequentially('**안녕**')

    await expect(pageContentInput).toHaveValue('# 오혜민\n**안녕**')
    await expect(page.locator('h1').filter({ hasText: '오혜민' })).toBeVisible()
    await expect(page.locator('strong').filter({ hasText: '안녕' })).toBeVisible()
  })

  test('keeps the blank resume fields reachable on tablet', async ({ page }) => {
    await page.setViewportSize({ height: 1024, width: 768 })
    await page.goto('/resume')

    const secondPageContentInput = page.getByLabel('2쪽 추가 내용')

    await secondPageContentInput.fill('태블릿에서도 두 번째 페이지 추가 내용을 작성합니다.')

    await expect(secondPageContentInput).toHaveValue('태블릿에서도 두 번째 페이지 추가 내용을 작성합니다.')
  })

  test('saves the blank resume as a new resume', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('repo.auth.accessToken', 'access-token')
    })
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
    await page.route('**/resume/save', async (route) => {
      const requestBody: unknown = route.request().postDataJSON()

      expect(requestBody).toEqual({
        email: 'student@example.com',
        introduce: '새 이력서를 작성합니다.',
        pages: [
          { content: '# 첫 번째 페이지 내용\n**굵은 내용**', id: 'page-1', index: 0, type: 'PROFILE' },
          {
            content: '## 프로젝트 회고',
            id: 'page-2',
            index: 1,
            project: {
              endDate: '2026-09-18',
              imageUrl: '',
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
    await expect(page.getByLabel('자기소개 제목')).toHaveValue('')
    await page.getByLabel('이메일').first().fill('student@example.com')
    await page.getByLabel('자기소개 내용').first().fill('새 이력서를 작성합니다.')
    await page.getByRole('textbox', { name: '기술스택' }).fill('React, TypeScript')
    await page.getByLabel('1쪽 추가 내용').fill('# 첫 번째 페이지 내용\n**굵은 내용**')
    await page.getByLabel('프로젝트 이름').fill('Repo')
    await page.getByLabel('프로젝트 시작일').fill('2026-09-01')
    await page.getByLabel('프로젝트 종료일').fill('2026-09-18')
    await page.getByRole('textbox', { name: '프로젝트 소개' }).fill('디지털 레주메 플랫폼')
    await page.getByLabel('2쪽 추가 내용').fill('## 프로젝트 회고')
    await page.getByRole('button', { exact: true, name: '저장' }).click()

    await expect(page.getByRole('status')).toContainText('이력서를 저장했습니다.')
    await expect(page.getByRole('button', { name: '비공개' })).toBeVisible()
  })
})
