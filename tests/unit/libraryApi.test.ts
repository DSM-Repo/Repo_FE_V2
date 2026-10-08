import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'

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
        content: [{ classNumber: 4, grade: 2, major: '백엔드', studentId: 1, studentName: '김태균' }],
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
    students: [{ classNumber: 4, grade: 2, major: '백엔드', studentId: 1, studentName: '김태균' }],
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
        pages: [{ content: 'API 설계와 테스트 자동화를 좋아합니다.', id: 'page-1', index: 0, type: 'PROFILE' }],
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
      pages: [{ content: 'API 설계와 테스트 자동화를 좋아합니다.', id: 'page-1', index: 0, type: 'PROFILE' }],
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

test('getLibraryResumeByStudentId accepts nullable profile image from library resume response', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        cohort: 11,
        date: 2026,
        email: 'taekyun0117@dsm.hs.kr',
        introduce: '백엔드 김태균입니다\n문제를 정의하고 생각하는 개발자',
        majorName: 'Backend',
        name: '김태균',
        pages: [
          {
            content: '---\n- 2026.08.06 - softwave 참관',
            id: '3d5ae3e3-60fa-4730-91ac-8c15fb9fe516',
            index: 0,
            project: null,
            type: 'PROFILE',
          },
        ],
        portfolioUrl: 'https://github.com/DSM-Repo/Repo_BE_V2',
        profileImageUrl: null,
        releasedAt: '2026-10-06T04:13:03.628',
        resumeId: '6abc64ee9bd1dbbed64d9027',
        studentId: 3,
        studentNumber: '2205',
        year: 2,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  const result = await libraryApi.getLibraryResumeByStudentId({ accessToken: 'access-token', studentId: 3 })

  assert.equal(result.kind, 'success')
  if (result.kind === 'success') {
    assert.equal(result.resume.profileImageUrl, '')
    assert.equal(result.resume.name, '김태균')
    assert.equal(result.resume.pages[0]?.id, '3d5ae3e3-60fa-4730-91ac-8c15fb9fe516')
    assert.equal(result.resume.pages[0]?.type, 'PROFILE')
  }
})

test('getLibraryResumeByStudentId preserves project pages from library resume response', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        cohort: 11,
        date: 2026,
        email: 'student@example.com',
        introduce: '프로젝트를 깊게 만드는 개발자입니다.',
        majorName: 'Frontend Developer',
        name: '최하은',
        pages: [
          {
            content: '프로필 본문',
            id: 'profile-page',
            index: 0,
            project: null,
            type: 'profile',
          },
          {
            content: '프로젝트 본문',
            id: 'project-page',
            index: 1,
            project: {
              endDate: '2026.10',
              imageUrl: '/projects/repo.png',
              name: 'Repo',
              startDate: '2026.09',
              summary: '학생 포트폴리오 관리 서비스',
            },
            type: 'project',
          },
        ],
        portfolioUrl: 'https://portfolio.example.test',
        profileImageUrl: null,
        releasedAt: '2026-10-06T04:13:03.628',
        resumeId: 'resume-2',
        studentId: 4,
        studentNumber: '2401',
        year: 2,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  const result = await libraryApi.getLibraryResumeByStudentId({ accessToken: 'access-token', studentId: 4 })

  assert.equal(result.kind, 'success')
  if (result.kind === 'success') {
    assert.equal(result.resume.pages[0]?.type, 'PROFILE')
    assert.equal(result.resume.pages[1]?.type, 'PROJECT')
    assert.deepEqual(result.resume.pages[1]?.project, {
      endDate: '2026.10',
      imageUrl: 'https://api.example.test/projects/repo.png',
      name: 'Repo',
      startDate: '2026.09',
      summary: '학생 포트폴리오 관리 서비스',
    })
  }
})

test('getLibraryResumeByStudentId resolves root-relative profile image urls against the API base URL', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        cohort: 11,
        date: 2026,
        email: 'taekyun0117@dsm.hs.kr',
        introduce: '백엔드 김태균입니다',
        majorName: 'Backend',
        name: '김태균',
        pages: [
          {
            content: '내용',
            id: '3d5ae3e3-60fa-4730-91ac-8c15fb9fe516',
            index: 0,
            type: 'PROFILE',
          },
        ],
        portfolioUrl: 'https://github.com/DSM-Repo/Repo_BE_V2',
        profileImageUrl: '/profiles/taekyun.png',
        releasedAt: '2026-10-06T04:13:03.628',
        resumeId: '6abc64ee9bd1dbbed64d9027',
        studentId: 3,
        studentNumber: '2205',
        year: 2,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  const result = await libraryApi.getLibraryResumeByStudentId({ accessToken: 'access-token', studentId: 3 })

  assert.equal(result.kind, 'success')
  if (result.kind === 'success') {
    assert.equal(result.resume.profileImageUrl, 'https://api.example.test/profiles/taekyun.png')
  }
})

test('getLibraryResumeByStudentId returns not-found when the public resume is unavailable', async () => {
  globalThis.fetch = async () => new Response(null, { status: 404 })

  const result = await libraryApi.getLibraryResumeByStudentId({ accessToken: 'access-token', studentId: 1 })

  assert.deepEqual(result, {
    kind: 'not-found',
    message: '공개된 이력서를 찾을 수 없습니다.',
  })
})
