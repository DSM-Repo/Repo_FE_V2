import assert from 'node:assert/strict'
import test from 'node:test'
import { readServerErrorMessage } from '../../src/shared/api/serverErrorMessage.js'

for (const status of [400, 401, 403, 404, 409, 422, 429, 500, 503]) {
  test(`preserves error.message verbatim for HTTP ${status}`, async () => {
    const message = '  서버 오류\n다시 확인하세요.  '
    const response = Response.json({ error: { message }, message: 'ignored' }, { status })
    assert.equal(await readServerErrorMessage(response, 'fallback'), message)
  })
}

for (const body of [{ message: 'top level' }, { detail: 'detail' }, { error: 'error' }, 'string']) {
  test(`supports existing message format ${JSON.stringify(body)}`, async () => {
    const expected = typeof body === 'string' ? body : Object.values(body)[0]
    assert.equal(await readServerErrorMessage(Response.json(body), 'fallback'), expected)
  })
}

test('preserves plain text and uses fallback only without a usable message', async () => {
  assert.equal(await readServerErrorMessage(new Response(' plain text '), 'fallback'), ' plain text ')
  for (const body of ['', '  ', '{}', '{"error":{"message":null}}', '{"message":" "}', '[]']) {
    assert.equal(await readServerErrorMessage(new Response(body), 'fallback'), 'fallback')
  }
})

test('handles failed body reads without replacing the error with a parsing exception', async () => {
  const response = new Response(new ReadableStream({ start(controller) { controller.error(new TypeError('broken stream')) } }))
  assert.equal(await readServerErrorMessage(response, 'fallback'), 'fallback')
})
