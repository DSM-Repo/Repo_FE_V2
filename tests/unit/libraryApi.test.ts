import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_AUTH_API_BASE_URL = 'https://api.example.test'

const libraryApi = await import('../../src/features/library/api/libraryApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('getLibraryBooks requests public library groups and returns parsed books', async () => {
  let requestedAuthorization = ''
  let requestedUrl = ''
  let requestedMethod = ''

  globalThis.fetch = async (input, init) => {
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''

    return new Response(
      JSON.stringify([
        { cohort: 9, date: 2026, year: 3 },
        { cohort: 10, date: 2027, year: 2 },
      ]),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await libraryApi.getLibraryBooks({ accessToken: 'access-token' })

  assert.equal(requestedUrl, 'https://api.example.test/library')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    books: [
      { cohort: 9, date: 2026, year: 3 },
      { cohort: 10, date: 2027, year: 2 },
    ],
    kind: 'success',
  })
})

test('getLibraryBooks returns server-error when the response body is not a library group list', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify([{ cohort: '9', date: 2026, year: 3 }]), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await libraryApi.getLibraryBooks({ accessToken: 'access-token' })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '도서관 조회 응답 형식이 올바르지 않습니다.',
  })
})

test('searchLibraryStudents requests public students with date and keyword filters', async () => {
  let requestedAuthorization = ''
  let requestedUrl = ''
  let requestedMethod = ''

  globalThis.fetch = async (input, init) => {
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''

    return new Response(
      JSON.stringify({
        content: [{ major: '백엔드', studentId: 1, studentName: '김태균' }],
        totalElements: 1,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await libraryApi.searchLibraryStudents({
    accessToken: 'access-token',
    date: 2026,
    keyword: '김태균',
  })
  const url = new URL(requestedUrl)

  assert.equal(url.origin, 'https://api.example.test')
  assert.equal(url.pathname, '/library/search')
  assert.equal(url.searchParams.get('keyword'), '김태균')
  assert.equal(url.searchParams.get('date'), '2026')
  assert.equal(url.searchParams.get('page'), '0')
  assert.equal(url.searchParams.get('size'), '20')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    students: [{ major: '백엔드', studentId: 1, studentName: '김태균' }],
    totalElements: 1,
  })
})

test('searchLibraryStudents returns server-error when the response body is not a search page', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ content: [{ major: '백엔드', studentId: '1', studentName: '김태균' }] }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await libraryApi.searchLibraryStudents({ accessToken: 'access-token', date: 2026 })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '학생 검색 응답 형식이 올바르지 않습니다.',
  })
})

test('getLibraryResumeByStudentId requests one public resume and returns parsed resume', async () => {
  let requestedAuthorization = ''
  let requestedUrl = ''
  let requestedMethod = ''

  globalThis.fetch = async (input, init) => {
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''

    return new Response(
      JSON.stringify({
        cohort: 9,
        date: 2026,
        email: 'student@example.com',
        introduce: '문제를 끝까지 파고드는 백엔드 개발자입니다.',
        majorName: '백엔드',
        name: '김태균',
        pages: [{ content: 'API 설계와 테스트 자동화를 좋아합니다.', id: 'page-1', index: 0 }],
        portfolioUrl: 'https://portfolio.example.test',
        profileImageUrl: 'https://cdn.example.test/profile.png',
        releasedAt: '2026-09-15T14:54:37.468Z',
        resumeId: 'resume-1',
        studentId: 1,
        studentNumber: '30101',
        year: 3,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await libraryApi.getLibraryResumeByStudentId({ accessToken: 'access-token', studentId: 1 })

  assert.equal(requestedUrl, 'https://api.example.test/library/1')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    resume: {
      cohort: 9,
      date: 2026,
      email: 'student@example.com',
      introduce: '문제를 끝까지 파고드는 백엔드 개발자입니다.',
      majorName: '백엔드',
      name: '김태균',
      pages: [{ content: 'API 설계와 테스트 자동화를 좋아합니다.', id: 'page-1', index: 0 }],
      portfolioUrl: 'https://portfolio.example.test',
      profileImageUrl: 'https://cdn.example.test/profile.png',
      releasedAt: '2026-09-15T14:54:37.468Z',
      resumeId: 'resume-1',
      studentId: 1,
      studentNumber: '30101',
      year: 3,
    },
  })
})

test('getLibraryResumeByStudentId returns not-found when the public resume is unavailable', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 })

  const result = await libraryApi.getLibraryResumeByStudentId({ accessToken: 'access-token', studentId: 1 })

  assert.deepEqual(result, {
    kind: 'not-found',
    message: '공개된 이력서를 찾을 수 없습니다.',
  })
})
