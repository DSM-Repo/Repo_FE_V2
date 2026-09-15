import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = '   '
process.env.NEXT_PUBLIC_AUTH_API_BASE_URL = 'https://fallback-api.example.test'

const feedbackApi = await import('../../src/features/feedback/api/feedbackApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('createFeedback falls back to auth API base URL when feedback API base URL is blank', async () => {
  let requestedUrl = ''

  globalThis.fetch = async (input) => {
    requestedUrl = String(input)

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

  assert.equal(requestedUrl, 'https://fallback-api.example.test/feedback')
  assert.equal(result.kind, 'success')
})
