import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'

const userApi = await import('../../src/features/user/api/userApi.js')

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
        pathname: '/resume',
      },
    },
  })

  return {
    assignedLocations,
    values,
  }
}

test('getUserMe requests logged-in user info with bearer auth', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify({
        classInfo: {
          classNumber: 4,
          grade: 2,
          number: 15,
          schoolNumber: '2415',
        },
        introduce: '나만의 이력서를 작성 중입니다.',
        major: '인공지능소프트웨어과',
        name: '홍길동',
        profileImageUrl: 'https://cdn.example.test/profile.png',
        progress: {
          sections: [
            {
              completed: true,
              key: 'PROFILE',
              name: '내 정보',
            },
          ],
          totalPercent: 35,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await userApi.getUserMe({ accessToken: 'access-token' })

  assert.equal(requestedUrl, 'https://api.example.test/user')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    user: {
      classInfo: {
        classNumber: 4,
        grade: 2,
        number: 15,
        schoolNumber: '2415',
      },
      introduce: '나만의 이력서를 작성 중입니다.',
      major: '인공지능소프트웨어과',
      name: '홍길동',
      profileImageUrl: 'https://cdn.example.test/profile.png',
      progress: {
        sections: [
          {
            completed: true,
            key: 'PROFILE',
            name: '내 정보',
          },
        ],
        totalPercent: 35,
      },
    },
  })
})

test('getUserMe accepts nullable optional profile fields from user info', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        classInfo: {
          classNumber: 1,
          grade: 2,
          number: 10,
          schoolNumber: '2110',
        },
        introduce: '새벽자습너무 졸립니다.',
        major: null,
        name: '오혜민',
        profileImageUrl: null,
        progress: {
          sections: [
            {
              completed: true,
              key: 'PROFILE',
              name: '프로필',
            },
          ],
          totalPercent: 33,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  const result = await userApi.getUserMe({ accessToken: 'access-token' })

  assert.deepEqual(result, {
    kind: 'success',
    user: {
      classInfo: {
        classNumber: 1,
        grade: 2,
        number: 10,
        schoolNumber: '2110',
      },
      introduce: '새벽자습너무 졸립니다.',
      major: null,
      name: '오혜민',
      profileImageUrl: null,
      progress: {
        sections: [
          {
            completed: true,
            key: 'PROFILE',
            name: '프로필',
          },
        ],
        totalPercent: 33,
      },
    },
  })
})

test('getUserMe refreshes an expired access token and retries user info', async () => {
  const { assignedLocations, values } = installBrowserAuthState('refresh-token')
  const requestedHeaders: string[] = []
  const requestedUrls: string[] = []

  globalThis.fetch = async (input, init) => {
    const requestUrl = String(input)
    const headers = new Headers(init?.headers)

    requestedUrls.push(requestUrl)
    requestedHeaders.push(headers.get('Authorization') ?? headers.get('Refresh-Token') ?? '')

    if (requestUrl === 'https://api.example.test/user' && requestedUrls.length === 1) {
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

    return new Response(
      JSON.stringify({
        classInfo: {
          classNumber: 1,
          grade: 2,
          number: 10,
          schoolNumber: '2110',
        },
        introduce: '재발급 후 조회했습니다.',
        major: null,
        name: '오혜민',
        profileImageUrl: null,
        progress: {
          sections: [],
          totalPercent: 33,
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await userApi.getUserMe({ accessToken: 'expired-token' })

  assert.equal(values.get('repo.auth.accessToken'), 'reissued-token')
  assert.deepEqual(assignedLocations, [])
  assert.deepEqual(requestedUrls, ['https://api.example.test/user', 'https://api.example.test/user/refresh', 'https://api.example.test/user'])
  assert.deepEqual(requestedHeaders, ['Bearer expired-token', 'refresh-token', 'Bearer reissued-token'])
  assert.equal(result.kind, 'success')
})

test('getUserMe returns server-error when the response body is not user info', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ name: '홍길동' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await userApi.getUserMe({ accessToken: 'access-token' })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '내 정보 조회 응답 형식이 올바르지 않습니다.',
  })
})

test('getUserMe returns forbidden when user info is rejected by auth', async () => {
  globalThis.fetch = async () => new Response(null, { status: 403 })

  const result = await userApi.getUserMe({ accessToken: 'access-token' })

  assert.deepEqual(result, {
    kind: 'forbidden',
    message: '내 정보를 조회할 권한이 없습니다. 다시 로그인해주세요.',
  })
})
