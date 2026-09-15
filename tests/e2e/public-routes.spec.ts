import { expect, test } from '@playwright/test'

test.describe('public route smoke', () => {
  test('renders the public landing page', async ({ page }) => {
    await page.goto('/')

    await expect(page).toHaveURL('/')
    await expect(page.getByRole('heading', { name: /이력서, 온라인으로/ })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Repo 사용하기' }).first()).toBeVisible()
  })

  test('does not render a public portfolio slug without loaded data', async ({ request }) => {
    const response = await request.get('/오혜민')

    expect(response.status()).toBe(404)
  })

  test('does not treat the reserved dev slug as a public portfolio', async ({ request }) => {
    const response = await request.get('/dev')

    expect(response.status()).toBe(404)
  })

  test('does not expose the component preview in production', async ({ request }) => {
    const response = await request.get('/dev/component-preview')

    expect(response.status()).toBe(404)
  })
})
