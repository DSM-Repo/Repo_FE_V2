import { expect, test } from '@playwright/test'

test.describe('auth login route', () => {
  test('renders the student login view and switches to teacher login', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: '학생 로그인' })).toBeVisible()
    await expect(page.getByLabel('이메일')).toBeVisible()
    const passwordInput = page.getByLabel('비밀번호', { exact: true })

    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: '비밀번호 보이기' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: '비밀번호 숨기기' })).toBeVisible()
    await expect(page.getByRole('button', { name: '로그인' })).toBeDisabled()

    await page.getByRole('button', { name: '선생님으로 전환하기' }).click()

    await expect(page.getByRole('heading', { name: '선생님 로그인' })).toBeVisible()
    await expect(page.getByText('DSM선생님을 위한 이력서 관리 플랫폼, Repo')).toBeVisible()
    await expect(page.getByRole('button', { name: '학생으로 전환하기' })).toBeVisible()
  })
})
