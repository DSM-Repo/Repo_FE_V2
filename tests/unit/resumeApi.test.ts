import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_AUTH_API_BASE_URL = 'https://api.example.test'

const resumeApi = await import('../../src/features/resume/api/resumeApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('getResumeById sends the resume id with bearer auth and returns parsed resume data', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify({
        id: '66c73ec4c92f1d2d087e9012',
        introduce: '사용자 소개',
        isPublic: true,
        majorName: 'Frontend Developer',
        name: '홍길동',
        pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }],
        portfolioUrl: 'https://repo.example.test/hong',
        profileImageUrl: 'https://repo.example.test/profile.png',
        savedAt: '2026-09-07T14:35:06.220Z',
        submissionStatus: 'ONGOING',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await resumeApi.getResumeById({
    accessToken: 'access-token',
    resumeId: '66c73ec4c92f1d2d087e9012',
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/66c73ec4c92f1d2d087e9012')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    resume: {
      id: '66c73ec4c92f1d2d087e9012',
      introduce: '사용자 소개',
      isPublic: true,
      majorName: 'Frontend Developer',
      name: '홍길동',
      pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }],
      portfolioUrl: 'https://repo.example.test/hong',
      profileImageUrl: 'https://repo.example.test/profile.png',
      savedAt: '2026-09-07T14:35:06.220Z',
      submissionStatus: 'ONGOING',
    },
  })
})

test('getResumeById returns server-error when the response body is not a resume', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: 'resume-id' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await resumeApi.getResumeById({
    accessToken: 'access-token',
    resumeId: 'resume-id',
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '이력서 조회 응답 형식이 올바르지 않습니다.',
  })
})

test('updateResumeVisibility sends the public flag with bearer auth and returns parsed visibility', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''
  let requestedBody = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''
    requestedBody = String(init?.body)

    return new Response(JSON.stringify({ isPublic: false }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await resumeApi.updateResumeVisibility({
    accessToken: 'access-token',
    isPublic: false,
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/visibility')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedBody, JSON.stringify({ isPublic: false }))
  assert.deepEqual(result, {
    isPublic: false,
    kind: 'success',
  })
})

test('updateResumeVisibility returns server-error when the response body is not visibility state', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ public: true }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await resumeApi.updateResumeVisibility({
    accessToken: 'access-token',
    isPublic: true,
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '공개 여부 변경 응답 형식이 올바르지 않습니다.',
  })
})
