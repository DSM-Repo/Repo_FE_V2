import assert from 'node:assert/strict'
import test from 'node:test'

process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.example.test'

const majorApi = await import('../../src/features/major/api/majorApi.js')

const originalFetch = globalThis.fetch

test.afterEach(() => {
  globalThis.fetch = originalFetch
})

test('getMajors requests the major list with bearer auth and returns parsed majors', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(
      JSON.stringify({
        majors: [
          {
            majorId: 1,
            name: '백엔드',
          },
        ],
        numberOfData: 1,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
        },
        status: 200,
      },
    )
  }

  const result = await majorApi.getMajors({ accessToken: 'access-token' })

  assert.equal(requestedUrl, 'https://api.example.test/major')
  assert.equal(requestedMethod, 'GET')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    value: {
      majors: [
        {
          majorId: 1,
          name: '백엔드',
        },
      ],
      numberOfData: 1,
    },
  })
})

test('createMajor posts the major name and returns the created major', async () => {
  let requestedBody = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (_input, init) => {
    requestedBody = String(init?.body)
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(JSON.stringify({ majorId: 2, name: '프론트엔드' }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 201,
    })
  }

  const result = await majorApi.createMajor({
    accessToken: 'access-token',
    name: '프론트엔드',
  })

  assert.equal(requestedBody, JSON.stringify({ name: '프론트엔드' }))
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
    major: {
      majorId: 2,
      name: '프론트엔드',
    },
  })
})

test('deleteMajor deletes the selected major id with bearer auth', async () => {
  let requestedUrl = ''
  let requestedMethod = ''
  let requestedAuthorization = ''

  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input)
    requestedMethod = init?.method ?? ''
    requestedAuthorization = new Headers(init?.headers).get('Authorization') ?? ''

    return new Response(null, { status: 204 })
  }

  const result = await majorApi.deleteMajor({
    accessToken: 'access-token',
    majorId: 12,
  })

  assert.equal(requestedUrl, 'https://api.example.test/major/12')
  assert.equal(requestedMethod, 'DELETE')
  assert.equal(requestedAuthorization, 'Bearer access-token')
  assert.deepEqual(result, {
    kind: 'success',
  })
})

test('getMajors returns server-error when the response body is not a major list', async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ majors: [{ majorId: '1', name: '백엔드' }], numberOfData: 1 }), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    })

  const result = await majorApi.getMajors({ accessToken: 'access-token' })

  assert.deepEqual(result, {
    kind: 'server-error',
    message: '전공 API 응답 형식이 올바르지 않습니다.',
  })
})
