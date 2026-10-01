import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'

const historyApi = await import('../../src/features/history/api/historyApi.js')

const originalFetch = globalThis.fetch
const originalClearTimeout = globalThis.clearTimeout

test.afterEach(() => {
  globalThis.fetch = originalFetch
  globalThis.clearTimeout = originalClearTimeout
})

test('getHistories requests history list with bearer auth and returns newest dates first', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify({
        histories: [
          { content: '오래된 변경', date: '2026-09-01', historyId: 1 },
          { content: '최신 변경', date: '2026-10-01', historyId: 2 },
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

  const result = await historyApi.getHistories({ accessToken: 'access-token' })

  assert.equal(requestedUrl, 'https://api.example.test/history')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    histories: [
      { content: '최신 변경', date: '2026-10-01', historyId: '2' },
      { content: '오래된 변경', date: '2026-09-01', historyId: '1' },
    ],
    kind: 'success',
  })
})

test('createHistory posts required date and content with bearer auth', async () => {
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
    requestedBody = String(init?.body)

    return new Response(JSON.stringify({ content: '등록 내용', date: '2026-10-01', historyId: 'history-1' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await historyApi.createHistory({
    accessToken: 'teacher-access-token',
    content: '등록 내용',
    date: '2026-10-01',
  })

  assert.equal(requestedUrl, 'https://api.example.test/history')
  assert.equal(requestedMethod, 'POST')
  assert.equal(requestedAuthorization, 'Bearer teacher-access-token')
  assert.equal(requestedContentType, 'application/json')
  assert.equal(requestedBody, JSON.stringify({ content: '등록 내용', date: '2026-10-01' }))
  assert.deepEqual(result, {
    content: '등록 내용',
    date: '2026-10-01',
    historyId: 'history-1',
    kind: 'success',
  })
})

test('updateHistory patches the selected history with both required fields', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedBody = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedBody = String(init?.body)

    return new Response(JSON.stringify({ content: '수정 내용', date: '2026-10-02', historyId: 'history/with/slash' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })
  }

  const result = await historyApi.updateHistory({
    accessToken: 'teacher-access-token',
    content: '수정 내용',
    date: '2026-10-02',
    historyId: 'history/with/slash',
  })

  assert.equal(requestedUrl, 'https://api.example.test/history/history%2Fwith%2Fslash')
  assert.equal(requestedMethod, 'PATCH')
  assert.equal(requestedBody, JSON.stringify({ content: '수정 내용', date: '2026-10-02' }))
  assert.deepEqual(result, {
    content: '수정 내용',
    date: '2026-10-02',
    historyId: 'history/with/slash',
    kind: 'success',
  })
})

test('removeHistory deletes the selected history', async () => {
  let requestedUrl = ''
  let requestedMethod = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''

    return new Response(null, {
      status: 204,
    })
  }

  const result = await historyApi.removeHistory({
    accessToken: 'teacher-access-token',
    historyId: 'history-1',
  })

  assert.equal(requestedUrl, 'https://api.example.test/history/history-1')
  assert.equal(requestedMethod, 'DELETE')
  assert.deepEqual(result, {
    kind: 'success',
  })
})
