import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'

const notificationApi = await import('../../src/features/notification/api/notificationApi.js')

const originalFetch = globalThis.fetch
const originalWindow = globalThis.window

test.afterEach(() => {
  globalThis.fetch = originalFetch
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: originalWindow,
  })
})

function installBrowserAuthState(refreshToken: string) {
  const values = new Map<string, string>([['repo.auth.refreshToken', refreshToken]])
  const assignedLocations: string[] = []
  const localStorage: Storage = {
    get length() {
      return values.size
    },
    clear() {
      values.clear()
    },
    getItem(key) {
      return values.get(key) ?? null
    },
    key(index) {
      return Array.from(values.keys())[index] ?? null
    },
    removeItem(key) {
      values.delete(key)
    },
    setItem(key, value) {
      values.set(key, value)
    },
  }

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage,
      location: {
        assign(url: string) {
          assignedLocations.push(url)
        },
        pathname: '/home',
      },
    },
  })

  return {
    assignedLocations,
    values,
  }
}

test('getNotifications requests notification list with bearer auth', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify([
        {
          alramId: 'alram-1',
          content: '새 피드백이 도착했습니다.',
          createdAt: '2026-09-26T09:30:00.000Z',
          feedbackId: 'feedback-1',
          isRead: false,
          resumeId: 'resume-1',
          type: 'FEEDBACK_CREATED',
        },
      ]),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await notificationApi.getNotifications({ accessToken: 'access-token' })

  assert.equal(requestedUrl, 'https://api.example.test/alram')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    notifications: [
      {
        alramId: 'alram-1',
        content: '새 피드백이 도착했습니다.',
        createdAt: '2026-09-26T09:30:00.000Z',
        feedbackId: 'feedback-1',
        isRead: false,
        resumeId: 'resume-1',
        type: 'FEEDBACK_CREATED',
      },
    ],
  })
})

test('markNotificationRead patches a notification and parses read status', async () => {
  let requestedUrl = ''
  let requestedMethod = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''

    return new Response(JSON.stringify({ isRead: true }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await notificationApi.markNotificationRead({
    accessToken: 'access-token',
    alramId: 'alram/with/slash',
  })

  assert.equal(requestedUrl, 'https://api.example.test/alram/alram%2Fwith%2Fslash')
  assert.equal(requestedMethod, 'PATCH')
  assert.deepEqual(result, {
    isRead: true,
    kind: 'success',
  })
})

test('removeNotification deletes a notification', async () => {
  let requestedUrl = ''
  let requestedMethod = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''

    return new Response(null, {
      status: 204,
    })
  }

  const result = await notificationApi.removeNotification({
    accessToken: 'access-token',
    alramId: 'alram-1',
  })

  assert.equal(requestedUrl, 'https://api.example.test/alram/alram-1')
  assert.equal(requestedMethod, 'DELETE')
  assert.deepEqual(result, {
    kind: 'success',
  })
})

test('getNotifications refreshes an expired access token and retries notification list', async () => {
  const { assignedLocations, values } = installBrowserAuthState('refresh-token')
  const requestedHeaders: string[] = []
  const requestedUrls: string[] = []

  globalThis.fetch = async (input, init) => {
    const requestUrl = String(input)
    const headers = new Headers(init?.headers)

    requestedUrls.push(requestUrl)
    requestedHeaders.push(headers.get('Authorization') ?? headers.get('Refresh-Token') ?? '')

    if (requestUrl === 'https://api.example.test/alram' && requestedUrls.length === 1) {
      return new Response(null, { status: 401 })
    }

    if (requestUrl === 'https://api.example.test/user/refresh') {
      return new Response(JSON.stringify({ accessToken: 'reissued-token' }), {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      })
    }

    return new Response(JSON.stringify([]), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await notificationApi.getNotifications({ accessToken: 'expired-token' })

  assert.equal(values.get('repo.auth.accessToken'), 'reissued-token')
  assert.deepEqual(assignedLocations, [])
  assert.deepEqual(requestedUrls, ['https://api.example.test/alram', 'https://api.example.test/user/refresh', 'https://api.example.test/alram'])
  assert.deepEqual(requestedHeaders, ['Bearer expired-token', 'refresh-token', 'Bearer reissued-token'])
  assert.deepEqual(result, {
    kind: 'success',
    notifications: [],
  })
})

test('getNotifications returns server-error when the response body is not a notification list', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ alramId: 'alram-1' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await notificationApi.getNotifications({ accessToken: 'access-token' })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '알림 목록 응답 형식이 올바르지 않습니다.',
  })
})
