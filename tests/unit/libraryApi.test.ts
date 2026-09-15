import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_AUTH_API_BASE_URL = 'https://api.example.test'

const libraryApi = await import('../../src/features/library/api/libraryApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('getLibraryBooks requests public library groups and returns parsed books', async () => {
  let requestedUrl = ''
  let requestedMethod = ''

  globalThis.fetch = async (input, init) => {
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

  const result = await libraryApi.getLibraryBooks()

  assert.equal(requestedUrl, 'https://api.example.test/library')
  assert.equal(requestedMethod, 'GET')
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

  const result = await libraryApi.getLibraryBooks()

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '도서관 조회 응답 형식이 올바르지 않습니다.',
  })
})
