import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'

const resumeApi = await import('../../src/features/resume/api/resumeApi.js')
const userApi = await import('../../src/features/user/api/userApi.js')

const originalFetch = globalThis.fetch
const originalClearTimeout = globalThis.clearTimeout
const originalSetTimeout = globalThis.setTimeout

test.afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.clearTimeout = originalClearTimeout
})

test('updateUserMajor sends the selected major id with bearer auth', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''
  let requestedContentType = ''
  let requestedBody = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''
    requestedContentType = new Headers(init?.headers).get('Content-Type') ?? ''
    requestedBody = String(init?.body ?? '')

    return new Response(null, { status: 204 })
  }

  const result = await userApi.updateUserMajor({
    accessToken: 'student-access-token',
    majorId: 2,
  })

  assert.equal(requestedUrl, 'https://api.example.test/user')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedAuthorization, 'Bearer student-access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(requestedBody, JSON.stringify({ majorId: 2 }))
  assert.deepEqual(result, { kind: 'success' })
})

test('getStudentResumeStatuses sends class filters and returns parsed submission statuses', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  // Given: the teacher status endpoint returns submitted and unsubmitted students.
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify({
        classNumber: 2,
        grade: 1,
        lastUpdatedAt: '2026-09-20T09:00:00Z',
        numberOfData: 2,
        schoolYear: 2026,
        students: [
          {
            classNumber: 2,
            grade: 1,
            majorName: 'Frontend',
            name: '김학생',
            number: 1,
            resumeId: 'resume-1',
            schoolNumber: '1201',
            studentId: 11,
            submissionStatus: 'SUBMITTED',
            submitted: true,
            submittedAt: '2026-09-19T12:00:00Z',
          },
          {
            classNumber: 2,
            grade: 1,
            majorName: null,
            name: '이학생',
            number: 2,
            resumeId: null,
            schoolNumber: '1202',
            studentId: 12,
            submissionStatus: 'ONGOING',
            submitted: false,
            submittedAt: null,
          },
        ],
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  // When: a teacher requests one class.
  const result = await resumeApi.getStudentResumeStatuses({
    accessToken: 'teacher-access-token',
    classNumber: 2,
    grade: 1,
  })

  // Then: the API contract is preserved for the teacher UI.
  assert.equal(requestedUrl, 'https://api.example.test/resume/students?grade=1&classNumber=2')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer teacher-access-token')
  assert.deepEqual(result, {
    classNumber: 2,
    grade: 1,
    kind: 'success',
    lastUpdatedAt: '2026-09-20T09:00:00Z',
    numberOfData: 2,
    schoolYear: 2026,
    students: [
      {
        classNumber: 2,
        grade: 1,
        majorName: 'Frontend',
        name: '김학생',
        number: 1,
        resumeId: 'resume-1',
        schoolNumber: '1201',
        studentId: 11,
        submissionStatus: 'SUBMITTED',
        submitted: true,
        submittedAt: '2026-09-19T12:00:00Z',
      },
      {
        classNumber: 2,
        grade: 1,
        majorName: '',
        name: '이학생',
        number: 2,
        schoolNumber: '1202',
        studentId: 12,
        submissionStatus: 'ONGOING',
        submitted: false,
      },
    ],
  })
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
        pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0, type: 'PROFILE' }],
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
      email: '',
      id: '66c73ec4c92f1d2d087e9012',
      introduce: '사용자 소개',
      isPublic: true,
      majorName: 'Frontend Developer',
      name: '홍길동',
      pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0, type: 'PROFILE' }],
      portfolioUrl: 'https://repo.example.test/hong',
      profileImageUrl: 'https://repo.example.test/profile.png',
      savedAt: '2026-09-07T14:35:06.220Z',
      skills: [],
      submissionStatus: 'ONGOING',
    },
  })
})

test('getStudentResumeById sends the student id with bearer auth and returns parsed resume data', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify({
        email: 'student@dsm.hs.kr',
        id: 'resume-before-submit',
        introduce: '제출 전 이력서',
        isPublic: false,
        majorName: 'Backend Developer',
        name: '김학생',
        pages: [{ content: '작성 중인 본문', id: 'page-1', index: 0, type: 'PROFILE' }],
        portfolioUrl: '',
        profileImageUrl: '',
        savedAt: '2026-09-30T12:00:00.000Z',
        skills: ['TypeScript'],
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

  const result = await resumeApi.getStudentResumeById({
    accessToken: 'teacher-access-token',
    studentId: 11,
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/students/11')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer teacher-access-token')
  assert.deepEqual(result, {
    kind: 'success',
    resume: {
      email: 'student@dsm.hs.kr',
      id: 'resume-before-submit',
      introduce: '제출 전 이력서',
      isPublic: false,
      majorName: 'Backend Developer',
      name: '김학생',
      pages: [{ content: '작성 중인 본문', id: 'page-1', index: 0, type: 'PROFILE' }],
      portfolioUrl: '',
      profileImageUrl: '',
      savedAt: '2026-09-30T12:00:00.000Z',
      skills: ['TypeScript'],
      submissionStatus: 'ONGOING',
    },
  })
})

test('getResumeById accepts nullable optional resume fields from the server contract', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        email: null,
        id: 'resume-id',
        introduce: null,
        isPublic: null,
        majorName: null,
        name: '오혜민',
        pages: [
          {
            content: '프로젝트 내용',
            id: 'project-page',
            index: 1,
            project: {
              endDate: null,
              imageUrl: null,
              name: 'Repo',
              startDate: null,
              summary: null,
            },
            type: 'PROJECT',
          },
          { content: '자유 페이지', id: 'free-page', index: 2, project: null, type: 'FREE' },
        ],
        portfolioUrl: null,
        profileImageUrl: null,
        savedAt: null,
        skills: null,
        submissionStatus: null,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )

  const result = await resumeApi.getResumeById({
    accessToken: 'access-token',
    resumeId: 'resume-id',
  })

  assert.deepEqual(result, {
    kind: 'success',
    resume: {
      email: '',
      id: 'resume-id',
      introduce: '',
      isPublic: false,
      majorName: '',
      name: '오혜민',
      pages: [
        {
          content: '프로젝트 내용',
          id: 'project-page',
          index: 1,
          project: {
            endDate: '',
            imageUrl: '',
            name: 'Repo',
            startDate: '',
            summary: '',
          },
          type: 'PROJECT',
        },
        { content: '자유 페이지', id: 'free-page', index: 2, type: 'FREE' },
      ],
      portfolioUrl: '',
      profileImageUrl: '',
      savedAt: '',
      skills: [],
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

test('getResumeById keeps the request timeout active until the response body is parsed', async () => {
  let clearTimeoutCallCount = 0

  globalThis.clearTimeout = (timeoutId) => {
    clearTimeoutCallCount += 1
    originalClearTimeout(timeoutId)
  }

  globalThis.fetch = async () => {
    const response = new Response(null, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

    Object.defineProperty(response, 'json', {
      value: async () => {
        await new Promise<void>((resolve) => originalSetTimeout(resolve, 0))
        assert.equal(clearTimeoutCallCount, 0)

        return {
          id: '66c73ec4c92f1d2d087e9012',
          introduce: '사용자 소개',
          isPublic: true,
          majorName: 'Frontend Developer',
          name: '홍길동',
          pages: [{ content: '첫 페이지 내용', id: 'page-1', index: 0, type: 'PROFILE' }],
          portfolioUrl: 'https://repo.example.test/hong',
          profileImageUrl: 'https://repo.example.test/profile.png',
          savedAt: '2026-09-07T14:35:06.220Z',
          submissionStatus: 'ONGOING',
        }
      },
    })

    return response
  }

  const result = await resumeApi.getResumeById({
    accessToken: 'access-token',
    resumeId: '66c73ec4c92f1d2d087e9012',
  })

  assert.equal(result.kind, 'success')
  assert.equal(clearTimeoutCallCount, 1)
})

test('getResumeById returns network-error when the response body stream fails', async () => {
  globalThis.fetch = async () => {
    const response = new Response(null, {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

    Object.defineProperty(response, 'json', {
      value: async () => {
        throw new TypeError('response stream failed')
      },
    })

    return response
  }

  const result = await resumeApi.getResumeById({
    accessToken: 'access-token',
    resumeId: '66c73ec4c92f1d2d087e9012',
  })

  assert.deepEqual(result, {
    kind: 'network-error',
    message: '이력서 API 응답을 읽지 못했습니다. 잠시 후 다시 시도해주세요.',
  })
})

test('updateResumeVisibility sends the student scoped public flag with bearer auth and returns parsed visibility', async () => {
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
    studentId: 11,
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/students/11/visibility')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedBody, JSON.stringify({ isPublic: false }))
  assert.deepEqual(result, {
    isPublic: false,
    kind: 'success',
  })
})

test('updateResumeVisibility falls back to the requested state when the response body is not visibility state', async () => {
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
    studentId: 11,
  })

  assert.deepEqual(result, {
    isPublic: true,
    kind: 'success',
  })
})

test('submitResume sends bearer auth and returns parsed submission state', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''
  let requestedBody: BodyInit | null | undefined
  let requestedContentType = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''
    requestedBody = init?.body
    requestedContentType = new Headers(init?.headers).get('Content-Type') ?? ''

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
  assert.equal(requestedBody, undefined)
  assert.equal(requestedContentType, '')
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
    email: 'student@example.test',
    introduce: '사용자 소개',
    pages: [{ content: '첫 페이지 내용', index: 0, type: 'PROFILE' }],
    portfolioUrl: 'https://repo.example.test/hong',
    profileImageUrl: 'https://cdn.example.test/profile.png',
    skills: ['React', 'TypeScript'],
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/save')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(
    requestedBody,
    JSON.stringify({
      email: 'student@example.test',
      introduce: '사용자 소개',
      pages: [{ content: '첫 페이지 내용', index: 0, type: 'PROFILE' }],
      portfolioUrl: 'https://repo.example.test/hong',
      profileImageUrl: 'https://cdn.example.test/profile.png',
      skills: ['React', 'TypeScript'],
    }),
  )
  assert.deepEqual(result, {
    kind: 'success',
    resumeId: 'resume-id',
    savedAt: '2026-09-10T14:03:35.469Z',
  })
})

test('uploadResumeImage sends multipart form data with bearer auth and returns uploaded image url', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''
  let requestedContentType: string | null = ''
  let requestedImage: unknown

  globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers)
    const body = init?.body

    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = headers.get('Authorization') ?? ''
    requestedContentType = headers.get('Content-Type')
    requestedImage = body instanceof FormData ? body.get('image') : null

    return new Response(
      JSON.stringify({
        imageUrl: 'https://cdn.example.test/dsm_repo/profile.png',
        key: 'dsm_repo/profile.png',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 201,
      },
    )
  }

  const result = await resumeApi.uploadResumeImage({
    accessToken: 'access-token',
    image: new File(['image-bytes'], 'profile.png', { type: 'image/png' }),
  })

  assert.equal(requestedUrl, 'https://api.example.test/image')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, null)
  assert.ok(requestedImage instanceof File)
  assert.equal(requestedImage.name, 'profile.png')
  assert.deepEqual(result, {
    imageUrl: 'https://cdn.example.test/dsm_repo/profile.png',
    key: 'dsm_repo/profile.png',
    kind: 'success',
  })
})

test('uploadResumeImage rejects uploaded image responses without an accessible image url', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        imageUrl: '4514af56-7086-4600-8257-af4a817e6.png',
        key: 'dsm_repo/4514af56-7086-4600-8257-af4a817e6.png',
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 201,
      },
    )

  const result = await resumeApi.uploadResumeImage({
    accessToken: 'access-token',
    image: new File(['image-bytes'], 'profile.png', { type: 'image/png' }),
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '이미지 업로드 응답 형식이 올바르지 않습니다.',
  })
})

test('autoSaveResume sends the full resume draft with bearer auth and returns parsed auto-save state', async () => {
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
    email: 'student@example.test',
    introduce: '사용자 소개',
    pages: [{ content: '첫 페이지 내용', index: 0, type: 'PROFILE' }],
    portfolioUrl: 'https://repo.example.test/hong',
    skills: ['React', 'TypeScript'],
  })

  assert.equal(requestedUrl, 'https://api.example.test/resume/auto-save')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(
    requestedBody,
    JSON.stringify({
      email: 'student@example.test',
      introduce: '사용자 소개',
      pages: [{ content: '첫 페이지 내용', index: 0, type: 'PROFILE' }],
      portfolioUrl: 'https://repo.example.test/hong',
      skills: ['React', 'TypeScript'],
    }),
  )
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
    email: 'student@example.test',
    introduce: '사용자 소개',
    pages: [{ content: '첫 페이지 내용', index: 0, type: 'PROFILE' }],
    portfolioUrl: 'https://repo.example.test/hong',
    skills: ['React', 'TypeScript'],
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
    email: '',
    introduce: '',
    pages: [{ content: '첫 페이지 내용', index: 0, type: 'PROFILE' }],
    portfolioUrl: '',
    skills: [],
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '이력서 자동 저장 응답 형식이 올바르지 않습니다.',
  })
})
