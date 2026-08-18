import { expect, test } from '@playwright/test'

test.describe('auth login route', () => {
  test('renders the student login view and switches to teacher login', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: '학생 로그인' })).toBeVisible()
    const emailInput = page.getByLabel('이메일')
    const passwordInput = page.getByLabel('비밀번호', { exact: true })
    const loginButton = page.getByRole('button', { name: '로그인' })

    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()
    await expect(passwordInput).toHaveAttribute('type', 'password')
    await expect(loginButton).toBeDisabled()

    await emailInput.focus()
    await passwordInput.focus()
    await expect(page.getByText('이메일을 입력해주세요.')).toBeVisible()
    await expect(emailInput).toHaveAttribute('aria-invalid', 'true')
    await expect(emailInput).toHaveAttribute('aria-describedby', 'login-email-error')
    await page.keyboard.press('Tab')
    await expect(page.getByText('비밀번호를 입력해주세요.')).toBeVisible()
    await expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
    await expect(passwordInput).toHaveAttribute('aria-describedby', 'login-password-error')

    await page.getByRole('button', { name: '비밀번호 보이기' }).click()
    await expect(passwordInput).toHaveAttribute('type', 'text')
    await expect(page.getByRole('button', { name: '비밀번호 숨기기' })).toBeVisible()

    await emailInput.fill('student@dsm.hs.kr')
    await expect(emailInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(loginButton).toBeDisabled()
    await passwordInput.fill('repo-password')
    await expect(passwordInput).not.toHaveAttribute('aria-invalid', 'true')
    await expect(loginButton).toBeEnabled()

    await page.getByRole('button', { name: '선생님으로 전환하기' }).click()

    await expect(page.getByRole('heading', { name: '선생님 로그인' })).toBeVisible()
    await expect(page.getByText('DSM선생님을 위한 이력서 관리 플랫폼, Repo')).toBeVisible()
    await expect(page.getByRole('button', { name: '학생으로 전환하기' })).toBeVisible()
    await expect(emailInput).toHaveValue('student@dsm.hs.kr')
    await expect(passwordInput).toHaveValue('repo-password')
    await expect(loginButton).toBeEnabled()

    await loginButton.click()

    await expect(page.getByRole('button', { name: '로그인 중' })).toBeDisabled()
  })
})
