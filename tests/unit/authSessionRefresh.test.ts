import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://auth.example.test'
const { getAuthorizedRole } = await import('../../src/features/auth/api/authSessionRefresh.js')
const { sendAuthenticatedRequest } = await import('../../src/features/auth/api/authenticatedRequest.js')
const storage = await import('../../src/features/auth/api/authTokenStorage.js')
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalFetch = globalThis.fetch
const token = `header.${Buffer.from(JSON.stringify({ role: 'STUDENT' })).toString('base64url')}.signature`

function deferred<T>() {
  let resolve: (value: T) => void = () => assert.fail('Uninitialized deferred')
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

test.beforeEach(() => {
  const values = new Map<string, string>()
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    location: { pathname: '/login', assign: () => undefined },
  } })
  storage.saveAuthTokens({ accessToken: 'expired', refreshToken: 'refresh' })
})
test.afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

test('guard and API requests share one pending refresh', async () => {
  // Given: guard authorization overlaps an expired API request.
  const refresh = deferred<Response>()
  let calls = 0
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/refresh')) { calls += 1; return refresh.promise }
    return new Response(null, { status: new Headers(init?.headers).get('Authorization') === `Bearer ${token}` ? 204 : 401 })
  }
  // When: both consumers finish against the same session.
  const guard = getAuthorizedRole()
  const api = sendAuthenticatedRequest({ url: '/resource', init: {}, timeoutMs: 1000, networkErrorMessage: 'offline' })
  await new Promise<void>((resolve) => setImmediate(resolve))
  refresh.resolve(Response.json({ accessToken: token }))
  const authorization = await guard
  const result = await api
  if (result.kind === 'response') result.complete()
  // Then: exactly one refresh serves both consumers.
  assert.equal(calls, 1)
  assert.equal(authorization.kind, 'authorized')
  assert.equal(result.kind === 'response' && result.value.status, 204)
})

for (const change of ['login', 'logout'] as const) {
  for (const status of [200, 401]) {
    test(`guard ignores refresh ${status} after ${change}`, async () => {
      // Given: authorization is waiting on the old session.
      const refresh = deferred<Response>()
      globalThis.fetch = async () => refresh.promise
      const pending = getAuthorizedRole()
      // When: the session changes before refresh finishes.
      if (change === 'login') storage.saveAuthTokens({ accessToken: 'expired', refreshToken: 'refresh' })
      else storage.clearAuthTokens()
      refresh.resolve(status === 200 ? Response.json({ accessToken: token }) : new Response(null, { status }))
      const result = await pending
      // Then: even identical credentials from a new login survive unchanged.
      assert.equal(storage.getSavedAccessToken(), change === 'login' ? 'expired' : undefined)
      assert.equal(storage.getSavedRefreshToken(), change === 'login' ? 'refresh' : undefined)
      assert.equal(result.kind, 'stale')
    })
  }
}

for (const failure of [0, 503, 200]) {
  test(`guard preserves credentials and can retry after refresh failure ${failure}`, async () => {
    // Given: network, server, or malformed token response prevents authorization.
    globalThis.fetch = async () => {
      if (failure === 0) throw new TypeError('offline')
      return failure === 200 ? Response.json({ accessToken: 'malformed' }) : new Response(null, { status: failure })
    }
    // When: authorization fails, then the user retries after recovery.
    const failureResult = await getAuthorizedRole()
    assert.equal(failureResult.kind, 'retryable')
    assert.equal(storage.getSavedRefreshToken(), 'refresh')
    globalThis.fetch = async () => Response.json({ accessToken: token })
    const recovery = await getAuthorizedRole()
    // Then: recovery succeeds with the retained refresh credential.
    assert.equal(storage.getSavedAccessToken(), token)
    assert.equal(recovery.kind, 'authorized')
  })
}

for (const status of [401, 403]) {
  test(`guard clears credentials for invalid refresh ${status}`, async () => {
    // Given: the backend explicitly rejects refresh credentials.
    globalThis.fetch = async () => new Response(null, { status })
    // When: authorization attempts recovery.
    const result = await getAuthorizedRole()
    // Then: invalid authentication ends the session.
    assert.equal(storage.getSavedRefreshToken(), undefined)
    assert.equal(result.kind, 'invalid')
  })
}
