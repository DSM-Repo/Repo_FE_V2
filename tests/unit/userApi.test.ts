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

test('getUserMe accepts the separate user response without progress with bearer auth', async () => {
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
        introduce: null,
        major: null,
        name: '오혜민',
        profileImageUrl: null,
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
      introduce: null,
      major: null,
      name: '오혜민',
      profileImageUrl: null,
    },
  })
})

for (const introduce of [undefined, 123, false, {}, []]) {
  test(`getUserMe rejects invalid introduce ${JSON.stringify(introduce)}`, async () => {
    globalThis.fetch = async () =>
      Response.json({
        classInfo: { classNumber: 1, grade: 1, number: 1, schoolNumber: '1101' },
        introduce,
        major: null,
        name: '신규 학생',
        profileImageUrl: null,
      })

    assert.deepEqual(await userApi.getUserMe({ accessToken: 'access-token' }), {
      kind: 'server-error',
      message: '내 정보 조회 응답 형식이 올바르지 않습니다.',
    })
  })
}

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

test('getUserMe preserves server error.message for every HTTP error status', async () => {
  for (let status = 400; status <= 599; status += 1) {
    const message = `  서버 원문 ${status}: \\n재시도 조건을 확인하세요.  `
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: { message }, message: '대체하면 안 되는 상위 메시지' }),
      { headers: { 'Content-Type': 'application/json' }, status },
    )

    const result = await userApi.getUserMe({ accessToken: 'access-token' })

    assert.deepEqual(result, {
      kind: status === 401 || status === 403 ? 'forbidden' : 'server-error',
      message,
    }, `HTTP ${status}`)
  }
})

test('updateUserMajor preserves server error.message for every HTTP error status', async () => {
  for (let status = 400; status <= 599; status += 1) {
    const message = `  서버 원문 ${status}: \\n재시도 조건을 확인하세요.  `
    globalThis.fetch = async () => new Response(
      JSON.stringify({ error: { message }, message: '대체하면 안 되는 상위 메시지' }),
      { headers: { 'Content-Type': 'application/json' }, status },
    )

    const result = await userApi.updateUserMajor({ accessToken: 'access-token', majorId: 1 })

    assert.deepEqual(result, {
      kind: status === 401 || status === 403 ? 'forbidden' : 'server-error',
      message,
    }, `HTTP ${status}`)
  }
})

test('getUserProgress reads total and section percentages independently with bearer auth', async () => {
  // Given: the separate progress response contains partially completed sections.
  const progress = {
    sections: [
      { completed: true, key: 'PROFILE', name: '내 정보', percent: 100 },
      { completed: false, key: 'ACTIVITY', name: '활동', percent: 40 },
      { completed: false, key: 'PROJECT', name: '프로젝트', percent: 10 },
    ],
    totalPercent: 50,
  }
  const requests: { url: string; method: string; authorization: string }[] = []
  globalThis.fetch = async (input, init) => {
    requests.push({
      url: String(input),
      method: init?.method ?? '',
      authorization: new Headers(init?.headers).get('Authorization') ?? '',
    })
    return Response.json(progress)
  }

  // When: progress is requested without a user-info response.
  const result = await userApi.getUserProgress({ accessToken: 'access-token' })

  // Then: the response percentages survive rather than becoming boolean-derived values.
  assert.deepEqual(result, { kind: 'success', progress })
  assert.deepEqual(requests, [{ url: 'https://api.example.test/user/progress', method: 'GET', authorization: 'Bearer access-token' }])
})

test('getUserProgress accepts all-zero percentages for a new student', async () => {
  // Given: a student has not created a resume.
  const progress = {
    sections: [
      { completed: false, key: 'PROFILE', name: '내 정보', percent: 0 },
      { completed: false, key: 'ACTIVITY', name: '활동', percent: 0 },
      { completed: false, key: 'PROJECT', name: '프로젝트', percent: 0 },
    ],
    totalPercent: 0,
  }
  globalThis.fetch = async () => Response.json(progress)

  // When: the separate progress endpoint is read.
  const result = await userApi.getUserProgress({ accessToken: 'access-token' })

  // Then: zero is valid progress, not an invalid or missing response.
  assert.deepEqual(result, { kind: 'success', progress })
})

for (const section of [
  { completed: true, key: 'PROFILE', name: '내 정보' },
  { completed: true, key: 'PROFILE', name: '내 정보', percent: null },
  { completed: true, key: 'PROFILE', name: '내 정보', percent: '100' },
  { completed: true, key: 'PROFILE', name: '내 정보', percent: 42.5 },
  { completed: true, key: 'UNKNOWN', name: '내 정보', percent: 100 },
]) {
  test(`getUserProgress rejects malformed sections: ${JSON.stringify(section)}`, async () => {
    // Given: the API violates its section schema.
    globalThis.fetch = async () => Response.json({ sections: [section], totalPercent: 50 })

    // When: that response is parsed.
    const result = await userApi.getUserProgress({ accessToken: 'access-token' })

    // Then: the client does not invent a completion percentage.
    assert.deepEqual(result, { kind: 'server-error', message: '이력서 완성도 조회 응답 형식이 올바르지 않습니다.' })
  })
}

test('getUserProgress refreshes an expired access token and retries only progress', async () => {
  // Given: the progress request requires a refreshed access token.
  const { assignedLocations, values } = installBrowserAuthState('refresh-token')
  const requests: { url: string; authorization: string }[] = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    requests.push({ url, authorization: new Headers(init?.headers).get('Authorization') ?? '' })
    if (requests.length === 1) return new Response(null, { status: 401 })
    if (url.endsWith('/user/refresh')) return Response.json({ accessToken: 'refreshed-progress-token' })
    return Response.json({ sections: [], totalPercent: 0 })
  }

  // When: progress is loaded with an expired token.
  const result = await userApi.getUserProgress({ accessToken: 'expired-token' })

  // Then: the retried endpoint uses the new token without requesting user info.
  assert.equal(result.kind, 'success')
  assert.deepEqual(requests, [
    { url: 'https://api.example.test/user/progress', authorization: 'Bearer expired-token' },
    { url: 'https://api.example.test/user/refresh', authorization: '' },
    { url: 'https://api.example.test/user/progress', authorization: 'Bearer refreshed-progress-token' },
  ])
  assert.equal(values.get('repo.auth.accessToken'), 'refreshed-progress-token')
  assert.deepEqual(assignedLocations, [])
})

test('getUserProgress preserves server error.message for every HTTP error status', async () => {
  for (let status = 400; status <= 599; status += 1) {
    // Given: each rejected HTTP response carries a server-owned message.
    const message = `  완성도 서버 원문 ${status}\n다시 확인하세요.  `
    globalThis.fetch = async () => Response.json({ error: { message }, message: '대체 메시지' }, { status })

    // When: progress fails independently.
    const result = await userApi.getUserProgress({ accessToken: 'access-token' })

    // Then: the exact server message is retained for the progress panel.
    assert.deepEqual(result, { kind: status === 401 || status === 403 ? 'forbidden' : 'server-error', message }, `HTTP ${status}`)
  }
})

test('getUserProgress reports malformed JSON without masking it as zero progress', async () => {
  // Given: the endpoint returned an invalid JSON document.
  globalThis.fetch = async () => new Response('{', { status: 200 })

  // When: the progress response is read.
  const result = await userApi.getUserProgress({ accessToken: 'access-token' })

  // Then: a schema error is returned rather than successful zero values.
  assert.deepEqual(result, { kind: 'server-error', message: '이력서 완성도 조회 응답 형식이 올바르지 않습니다.' })
})

test('getUserProgress reports a failed network request separately from user information', async () => {
  // Given: the progress endpoint cannot be reached.
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }

  // When: progress is requested.
  const result = await userApi.getUserProgress({ accessToken: 'access-token' })

  // Then: the failure identifies the progress endpoint.
  assert.deepEqual(result, { kind: 'network-error', message: '이력서 완성도 API에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.' })
})
