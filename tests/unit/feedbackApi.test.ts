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
