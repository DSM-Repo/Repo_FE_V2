import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'

const feedbackApi = await import('../../src/features/feedback/api/feedbackApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('createFeedback sends the feedback position with bearer auth and returns parsed creation data', async () => {
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
      JSON.stringify({
        createdAt: '2026-09-14T10:05:42.213Z',
        feedbackId: 'feedback-id',
        pageId: 'page-id',
        x: 0.1,
        y: 0.2,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 201,
      },
    )
  }

  const result = await feedbackApi.createFeedback({
    accessToken: 'access-token',
    comment: '내용을 더 구체적으로 작성해주세요.',
    documentId: 'resume-id',
    pageId: 'page-id',
    x: 0.1,
    y: 0.2,
  })

  assert.equal(requestedUrl, 'https://api.example.test/feedback')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(
    requestedBody,
    JSON.stringify({
      comment: '내용을 더 구체적으로 작성해주세요.',
      documentId: 'resume-id',
      pageId: 'page-id',
      x: 0.1,
      y: 0.2,
    }),
  )
  assert.deepEqual(result, {
    createdAt: '2026-09-14T10:05:42.213Z',
    feedbackId: 'feedback-id',
    kind: 'success',
    pageId: 'page-id',
    x: 0.1,
    y: 0.2,
  })
})

test('createFeedback returns server-error when the response body is not created feedback', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ feedbackId: 'feedback-id' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 201,
    })

  const result = await feedbackApi.createFeedback({
    accessToken: 'access-token',
    comment: '내용을 더 구체적으로 작성해주세요.',
    documentId: 'resume-id',
    pageId: 'page-id',
    x: 0.1,
    y: 0.2,
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '피드백 생성 응답 형식이 올바르지 않습니다.',
  })
})

test('createFeedback returns forbidden when feedback creation is rejected by auth', async () => {
  globalThis.fetch = async () => new Response(null, { status: 403 })

  const result = await feedbackApi.createFeedback({
    accessToken: 'access-token',
    comment: '내용을 더 구체적으로 작성해주세요.',
    documentId: 'resume-id',
    pageId: 'page-id',
    x: 0.1,
    y: 0.2,
  })

  assert.deepEqual(result, {
    kind: 'forbidden',
    message: '피드백을 작성할 권한이 없습니다. 다시 로그인해주세요.',
  })
})

test('applyFeedback sends selected feedback ids with bearer auth and returns parsed batch result', async () => {
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
      JSON.stringify({
        failed: [{ feedbackId: 'feedback-2', reason: '이미 처리된 피드백입니다.' }],
        successCount: 1,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await feedbackApi.applyFeedback({
    accessToken: 'access-token',
    applied: true,
    feedbackIds: ['feedback-1', 'feedback-2'],
  })

  assert.equal(requestedUrl, 'https://api.example.test/feedback/apply')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(
    requestedBody,
    JSON.stringify({
      applied: true,
      feedbackIds: ['feedback-1', 'feedback-2'],
    }),
  )
  assert.deepEqual(result, {
    failed: [{ feedbackId: 'feedback-2', reason: '이미 처리된 피드백입니다.' }],
    kind: 'success',
    successCount: 1,
  })
})

test('applyFeedback returns server-error when the response body is not batch result', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ successCount: 1 }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await feedbackApi.applyFeedback({
    accessToken: 'access-token',
    applied: false,
    feedbackIds: ['feedback-1'],
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '피드백 일괄 반영 응답 형식이 올바르지 않습니다.',
  })
})

test('completeFeedback sends the feedback id with bearer auth and returns parsed status', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(JSON.stringify({ feedbackId: '66c74063c92f1d2d087e9013', status: 'COMPLETED' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await feedbackApi.completeFeedback({
    accessToken: 'access-token',
    feedbackId: '66c74063c92f1d2d087e9013',
  })

  assert.equal(requestedUrl, 'https://api.example.test/feedback/66c74063c92f1d2d087e9013/complete')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    feedbackId: '66c74063c92f1d2d087e9013',
    kind: 'success',
    status: 'COMPLETED',
  })
})

test('completeFeedback returns server-error when the response body is not feedback status', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ feedbackId: '66c74063c92f1d2d087e9013' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await feedbackApi.completeFeedback({
    accessToken: 'access-token',
    feedbackId: '66c74063c92f1d2d087e9013',
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '피드백 완료 응답 형식이 올바르지 않습니다.',
  })
})

test('pendingFeedback sends the feedback id with bearer auth and returns parsed status', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(JSON.stringify({ feedbackId: '66c74063c92f1d2d087e9013', status: 'PENDING' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await feedbackApi.pendingFeedback({
    accessToken: 'access-token',
    feedbackId: '66c74063c92f1d2d087e9013',
  })

  assert.equal(requestedUrl, 'https://api.example.test/feedback/66c74063c92f1d2d087e9013/pending')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    feedbackId: '66c74063c92f1d2d087e9013',
    kind: 'success',
    status: 'PENDING',
  })
})

test('pendingFeedback returns server-error when the response body is not feedback status', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ feedbackId: '66c74063c92f1d2d087e9013' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await feedbackApi.pendingFeedback({
    accessToken: 'access-token',
    feedbackId: '66c74063c92f1d2d087e9013',
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '피드백 미반영 응답 형식이 올바르지 않습니다.',
  })
})

test('updateFeedback sends edited feedback content with bearer auth and returns parsed feedback', async () => {
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
      JSON.stringify({
        content: '수정된 피드백입니다.',
        id: '66c74063c92f1d2d087e9013',
        pageId: 'page-id',
        teacherName: '김선생',
        updatedAt: '2026-09-14T10:15:00.435Z',
        x: 0.1,
        y: 0.2,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await feedbackApi.updateFeedback({
    accessToken: 'access-token',
    comment: '수정된 피드백입니다.',
    feedbackId: '66c74063c92f1d2d087e9013',
    pageId: 'page-id',
    x: 0.1,
    y: 0.2,
  })

  assert.equal(requestedUrl, 'https://api.example.test/feedback/66c74063c92f1d2d087e9013')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(
    requestedBody,
    JSON.stringify({
      comment: '수정된 피드백입니다.',
      pageId: 'page-id',
      x: 0.1,
      y: 0.2,
    }),
  )
  assert.deepEqual(result, {
    content: '수정된 피드백입니다.',
    id: '66c74063c92f1d2d087e9013',
    kind: 'success',
    pageId: 'page-id',
    teacherName: '김선생',
    updatedAt: '2026-09-14T10:15:00.435Z',
    x: 0.1,
    y: 0.2,
  })
})

test('updateFeedback returns server-error when the response body is not updated feedback', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: '66c74063c92f1d2d087e9013' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await feedbackApi.updateFeedback({
    accessToken: 'access-token',
    comment: '수정된 피드백입니다.',
    feedbackId: '66c74063c92f1d2d087e9013',
    pageId: 'page-id',
    x: 0.1,
    y: 0.2,
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '피드백 수정 응답 형식이 올바르지 않습니다.',
  })
})

test('getFeedbackById sends the feedback id with bearer auth and returns parsed feedback detail', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify({
        content: '피드백 내용입니다.',
        createdAt: '2026-09-14T10:21:30.455Z',
        feedbackId: '66c74063c92f1d2d087e9013',
        pageDeleted: true,
        pageId: 'page-id',
        status: 'PENDING',
        x: 0.1,
        y: 0.2,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await feedbackApi.getFeedbackById({
    accessToken: 'access-token',
    feedbackId: '66c74063c92f1d2d087e9013',
  })

  assert.equal(requestedUrl, 'https://api.example.test/feedback/66c74063c92f1d2d087e9013')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    content: '피드백 내용입니다.',
    createdAt: '2026-09-14T10:21:30.455Z',
    feedbackId: '66c74063c92f1d2d087e9013',
    kind: 'success',
    pageDeleted: true,
    pageId: 'page-id',
    status: 'PENDING',
    x: 0.1,
    y: 0.2,
  })
})

test('getFeedbackById returns server-error when the response body is not feedback detail', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ feedbackId: '66c74063c92f1d2d087e9013' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await feedbackApi.getFeedbackById({
    accessToken: 'access-token',
    feedbackId: '66c74063c92f1d2d087e9013',
  })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '피드백 조회 응답 형식이 올바르지 않습니다.',
  })
})
