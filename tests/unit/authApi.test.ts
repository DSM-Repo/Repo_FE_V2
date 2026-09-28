import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://auth.example.test'

const authApi = await import('../../src/features/auth/api/authApi.js')

const originalFetch = globalThis.fetch

function createAccessToken(role: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ exp: 4_102_444_800, role, sub: 'user@dsm.hs.kr' })).toString('base64url')

  return `${header}.${payload}.test-signature`
}

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('loginWithAuthApi returns the role encoded by the access token', async () => {
  // Given: the server returns a student JWT after login.
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        accessToken: createAccessToken('STUDENT'),
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  // When: the login response is parsed.
  const result = await authApi.loginWithAuthApi({
    email: 'student@dsm.hs.kr',
    password: 'repo-password',
  })

  // Then: the trusted token role is returned with the token.
  assert.equal(result.kind, 'success')
  if (result.kind !== 'success') {
    assert.fail('Expected a successful login result.')
  }
  assert.equal(result.token.role, 'student')
})

test('loginWithAuthApi rejects an access token without a supported role', async () => {
  // Given: the server response has a structurally valid JWT with an unknown role.
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        accessToken: createAccessToken('ADMIN'),
        refreshToken: 'refresh-token',
        tokenType: 'Bearer',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  // When: the login response is parsed.
  const result = await authApi.loginWithAuthApi({
    email: 'admin@dsm.hs.kr',
    password: 'repo-password',
  })

  // Then: the response is rejected instead of guessing a frontend role.
  assert.deepEqual(result, {
    kind: 'server-error',
    message: '로그인 응답 형식이 올바르지 않습니다.',
  })
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
