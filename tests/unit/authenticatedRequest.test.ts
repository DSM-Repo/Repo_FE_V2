import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://auth.example.test'
const { sendAuthenticatedRequest } = await import('../../src/features/auth/api/authenticatedRequest.js')
const storage = await import('../../src/features/auth/api/authTokenStorage.js')
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
const originalFetch = globalThis.fetch
let redirects = 0

function deferred<T>() {
  let resolve: (value: T) => void = () => assert.fail('Uninitialized deferred')
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

const request = () => sendAuthenticatedRequest({
  url: 'https://auth.example.test/protected',
  init: { headers: { Authorization: 'Bearer old' } },
  timeoutMs: 1000,
  networkErrorMessage: 'offline',
})

test.beforeEach(() => {
  const values = new Map<string, string>()
  redirects = 0
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    location: { pathname: '/home', assign: () => { redirects += 1 } },
  } })
  storage.saveAuthTokens({ accessToken: 'old', refreshToken: 'refresh' })
})

test.afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
  else Reflect.deleteProperty(globalThis, 'window')
})

for (const status of [401, 403]) {
  test(`shares refresh across three concurrent ${status} responses`, async () => {
    // Given: expired requests overlap a pending refresh.
    const refresh = deferred<Response>()
    const started = deferred<void>()
    let refreshCount = 0
    let retries = 0
    globalThis.fetch = async (url, init) => {
      if (String(url).endsWith('/refresh')) {
        refreshCount += 1
        started.resolve()
        return refresh.promise
      }
      if (new Headers(init?.headers).get('Authorization') === 'Bearer fresh') {
        retries += 1
        return new Response(null, { status: 204 })
      }
      return new Response(null, { status })
    }
    // When: three requests recover together.
    const pending = Promise.all([request(), request(), request()])
    await started.promise
    refresh.resolve(Response.json({ accessToken: 'fresh' }))
    const results = await pending
    for (const result of results) if (result.kind === 'response') result.complete()
    // Then: one refresh supplies exactly one retry per request.
    assert.equal(refreshCount, 1)
    assert.equal(retries, 3)
    assert.equal(storage.getSavedAccessToken(), 'fresh')
  })
}

for (const change of ['logout', 'login'] as const) {
  for (const status of [200, 401]) {
    test(`ignores late refresh ${status} after ${change}`, async () => {
      // Given: a refresh belongs to the old session.
      const refresh = deferred<Response>()
      const started = deferred<void>()
      let calls = 0
      globalThis.fetch = async (url) => {
        calls += 1
        if (String(url).endsWith('/refresh')) { started.resolve(); return refresh.promise }
        return new Response(null, { status: 401 })
      }
      // When: session changes before refresh completion, even with identical tokens.
      const pending = request()
      await started.promise
      if (change === 'logout') storage.clearAuthTokens()
      else storage.saveAuthTokens({ accessToken: 'old', refreshToken: 'refresh' })
      refresh.resolve(status === 200 ? Response.json({ accessToken: 'stale' }) : new Response(null, { status }))
      const result = await pending
      if (result.kind === 'response') result.complete()
      // Then: no stale write, retry, or redirect occurs.
      assert.equal(storage.getSavedAccessToken(), change === 'logout' ? undefined : 'old')
      assert.equal(calls, 2)
      assert.equal(redirects, 0)
    })
  }
}

for (const status of [0, 400, 429, 500, 503, 401, 403]) {
  test(`handles refresh failure ${status} without clearing recoverable sessions`, async () => {
    // Given: refresh either fails transiently or explicitly rejects credentials.
    globalThis.fetch = async (url) => {
      if (!String(url).endsWith('/refresh')) return new Response(null, { status: 401 })
      if (status === 0) throw new TypeError('offline')
      return new Response(null, { status })
    }
    // When: an expired request attempts recovery.
    const result = await request()
    if (result.kind === 'response') result.complete()
    // Then: only the existing invalid-refresh statuses end the session.
    const invalid = status === 401 || status === 403
    assert.equal(storage.getSavedRefreshToken(), invalid ? undefined : 'refresh')
    assert.equal(redirects, invalid ? 1 : 0)
  })
}

test('reuses refreshed access token when an older rejection arrives late', async () => {
  // Given: the second expired request stays pending across a successful refresh.
  const late = deferred<Response>()
  let originals = 0
  let refreshes = 0
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/refresh')) { refreshes += 1; return Response.json({ accessToken: 'fresh' }) }
    if (new Headers(init?.headers).get('Authorization') === 'Bearer fresh') return new Response(null, { status: 204 })
    originals += 1
    return originals === 2 ? late.promise : new Response(null, { status: 401 })
  }
  // When: the delayed rejection arrives after the first request has recovered.
  const first = request()
  const second = request()
  const firstResult = await first
  if (firstResult.kind === 'response') firstResult.complete()
  late.resolve(new Response(null, { status: 401 }))
  const secondResult = await second
  if (secondResult.kind === 'response') secondResult.complete()
  // Then: the late request uses the saved token without another refresh.
  assert.equal(refreshes, 1)
  assert.equal(secondResult.kind === 'response' && secondResult.value.status, 204)
})

test('retries only once and preserves session when the resource still returns 403', async () => {
  // Given: refresh succeeds but the resource is forbidden.
  let calls = 0
  globalThis.fetch = async (url) => {
    calls += 1
    return String(url).endsWith('/refresh') ? Response.json({ accessToken: 'fresh' }) : new Response(null, { status: 403 })
  }
  // When: the request exhausts its one retry.
  const result = await request()
  if (result.kind === 'response') result.complete()
  // Then: resource denial alone does not prove invalid refresh credentials.
  assert.equal(calls, 3)
  assert.equal(storage.getSavedAccessToken(), 'fresh')
  assert.equal(redirects, 0)
})

test('keeps the rejected response body deadline after a transient refresh failure', async (context) => {
  // Given: a rejected resource body stalls and refresh is unavailable.
  context.mock.timers.enable({ apis: ['setTimeout'] })
  let signal: AbortSignal | null | undefined
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith('/refresh')) return new Response(null, { status: 503 })
    signal = init?.signal
    return new Response(new ReadableStream({ start(controller) {
      signal?.addEventListener('abort', () => controller.error(new DOMException('Aborted', 'AbortError')))
    } }), { status: 401 })
  }
  // When: the caller reads the fallback body past the request deadline.
  const result = await request()
  assert.equal(result.kind, 'response')
  if (result.kind !== 'response') assert.fail('Expected response')
  const rejected = assert.rejects(result.value.text(), { name: 'AbortError' })
  context.mock.timers.tick(1000)
  await rejected
  result.complete()
  // Then: the original body is aborted while session credentials survive.
  assert.equal(signal?.aborted, true)
  assert.equal(storage.getSavedRefreshToken(), 'refresh')
})
