import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_AUTH_API_BASE_URL = 'https://auth.example.test'

const authApi = await import('../../src/features/auth/api/authApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('refreshAuthToken posts the refresh token header and returns a new access token', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedRefreshToken = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedRefreshToken = new Headers(init?.headers).get('Refresh-Token') ?? ''

    return new Response(JSON.stringify({ accessToken: 'new-access-token' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await authApi.refreshAuthToken({
    refreshToken: 'refresh-token',
  })

  assert.equal(requestedUrl, 'https://auth.example.test/user/refresh')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedRefreshToken, 'refresh-token')
  assert.deepEqual(result, {
    kind: 'success',
    message: '토큰을 재발급했습니다.',
    token: {
      accessToken: 'new-access-token',
    },
  })
})

test('refreshAuthToken returns invalid-refresh-token for rejected refresh credentials', async () => {
  globalThis.fetch = async () => new Response(null, { status: 401 })

  const result = await authApi.refreshAuthToken({
    refreshToken: 'expired-refresh-token',
  })

  assert.deepEqual(result, {
    kind: 'invalid-refresh-token',
    message: '다시 로그인해주세요.',
  })
})

for (const responseBody of ['', '{']) {
  const responseDescription = responseBody ? 'invalid JSON' : 'no JSON body'

  test(`refreshAuthToken returns a handled server error when the response has ${responseDescription}`, async () => {
    globalThis.fetch = async () =>
      new Response(responseBody, {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      })

    const result = await authApi.refreshAuthToken({
      refreshToken: 'refresh-token',
    })

    assert.deepEqual(result, {
      kind: 'server-error',
      message: '토큰 재발급 응답 형식이 올바르지 않습니다.',
    })
  })
}
