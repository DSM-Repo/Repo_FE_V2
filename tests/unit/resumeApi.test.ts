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

test('submitResume sends bearer auth and returns parsed submission state', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(JSON.stringify({ resumeId: 'resume-id', submissionStatus: 'SUBMITTED' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await resumeApi.submitResume({
    accessToken: 'access-token',
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/submit')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    resumeId: 'resume-id',
    submissionStatus: 'SUBMITTED',
  })
})

test('cancelResumeSubmission sends bearer auth and returns parsed submission state', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(JSON.stringify({ resumeId: 'resume-id', submissionStatus: 'ONGOING' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await resumeApi.cancelResumeSubmission({
    accessToken: 'access-token',
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/submit/cancel')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    resumeId: 'resume-id',
    submissionStatus: 'ONGOING',
  })
})

test('submitResume returns server-error when the response body is not submission state', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ resumeId: 'resume-id' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await resumeApi.submitResume({
    accessToken: 'access-token',
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '이력서 제출 응답 형식이 올바르지 않습니다.',
  })
})

test('saveResume sends resume content with bearer auth and returns parsed save state', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''
  let requestedContentType = ''
  let requestedBody = ''

  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers)

    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = headers.get('Authorization') ?? ''
    requestedContentType = headers.get('Content-Type') ?? ''
    requestedBody = String(init?.body)

    return new Response(JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-10T14:03:35.469Z' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await resumeApi.saveResume({
    accessToken: 'access-token',
    introduce: '사용자 소개',
    pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }],
    portfolioUrl: 'https://repo.example.test/hong',
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/save')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(
    requestedBody,
    JSON.stringify({
      introduce: '사용자 소개',
      pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }],
      portfolioUrl: 'https://repo.example.test/hong',
    }),
  )
  assert.deepEqual(result, {
    kind: 'success',
    resumeId: 'resume-id',
    savedAt: '2026-09-10T14:03:35.469Z',
  })
})

test('autoSaveResume sends pages with bearer auth and returns parsed auto-save state', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''
  let requestedContentType = ''
  let requestedBody = ''

  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers)

    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = headers.get('Authorization') ?? ''
    requestedContentType = headers.get('Content-Type') ?? ''
    requestedBody = String(init?.body)

    return new Response(
      JSON.stringify({ autoSaved: true, resumeId: 'resume-id', savedAt: '2026-09-10T14:03:53.700Z' }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await resumeApi.autoSaveResume({
    accessToken: 'access-token',
    pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }],
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/auto-save')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(requestedBody, JSON.stringify({ pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }] }))
  assert.deepEqual(result, {
    autoSaved: true,
    kind: 'success',
    resumeId: 'resume-id',
    savedAt: '2026-09-10T14:03:53.700Z',
  })
})

test('saveResume returns server-error when the response body is not save state', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ resumeId: 'resume-id' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await resumeApi.saveResume({
    accessToken: 'access-token',
    introduce: '사용자 소개',
    pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }],
    portfolioUrl: 'https://repo.example.test/hong',
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '이력서 저장 응답 형식이 올바르지 않습니다.',
  })
})

test('autoSaveResume returns server-error when the response body is not auto-save state', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ resumeId: 'resume-id', savedAt: '2026-09-10T14:03:53.700Z' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await resumeApi.autoSaveResume({
    accessToken: 'access-token',
    pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0 }],
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '이력서 자동 저장 응답 형식이 올바르지 않습니다.',
  })
})
