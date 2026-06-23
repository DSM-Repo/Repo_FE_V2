import { expect, test } from '@playwright/test'

test.describe('public route smoke', () => {
  test('renders the public home route', async ({ request }) => {
    const response = await request.get('/')

    expect(response.status()).toBe(200)
    await expect(response).toBeOK()
    const body = await response.text()

    expect(body).toContain('대덕소프트마이스터고 학생을 위한 포트폴리오 플랫폼')
    expect(body).toContain('공개 포트폴리오 예시')
  })

  test('renders a Korean public portfolio slug', async ({ request }) => {
    const response = await request.get('/오혜민')

    expect(response.status()).toBe(200)
    await expect(response).toBeOK()
    const body = await response.text()
    const normalizedBody = body.replaceAll(/<!--.*?-->/g, '')

    expect(normalizedBody).toContain('홍길동')
    expect(normalizedBody).toContain('기술스택')
    expect(normalizedBody).toContain('2415')
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
