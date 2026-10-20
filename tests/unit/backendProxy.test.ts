/// <reference types="../../src/types/cloudflare-sockets.d.ts" />
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import test, { afterEach } from 'node:test'
import { GET, POST } from '../../src/app/api/backend/[...path]/route.js'

const encoder = new TextEncoder()
const context = { params: Promise.resolve({ path: ['image'] }) }
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const originalFetch = globalThis.fetch
const originalBase = process.env.BACKEND_API_BASE_URL
const socketKey = '__backendProxyTestConnect'
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'cloudflare:sockets') return { url: 'test:backend-socket', shortCircuit: true }
    return next(specifier, context)
  },
  load(url, context, next) {
    if (url === 'test:backend-socket') return {
      format: 'module', shortCircuit: true,
      source: `export const connect = (...args) => Reflect.get(globalThis, '${socketKey}')(...args)`,
    }
    return next(url, context)
  },
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator)
  else Reflect.deleteProperty(globalThis, 'navigator')
  if (originalBase === undefined) delete process.env.BACKEND_API_BASE_URL
  else process.env.BACKEND_API_BASE_URL = originalBase
  Reflect.deleteProperty(globalThis, socketKey)
})

function socketFixture(wire: string | null, failWrite = false) {
  process.env.BACKEND_API_BASE_URL = 'http://192.0.2.1'
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { userAgent: 'Cloudflare-Workers' } })
  const writes: Uint8Array[] = []
  let closes = 0
  let cancelled = false
  const readable = new ReadableStream<Uint8Array>({
    start(controller) {
      if (wire !== null) { controller.enqueue(encoder.encode(wire)); controller.close() }
    },
    cancel() { cancelled = true },
  })
  const writable = new WritableStream<Uint8Array>({
    write(chunk) { if (failWrite) throw new Error('write failed'); writes.push(chunk) },
  })
  Reflect.set(globalThis, socketKey, () => ({ readable, writable, close() { closes += 1 } }))
  return { writes, readable, writable, get closes() { return closes }, get cancelled() { return cancelled } }
}

test('invalid backend URL returns the standard 502', async () => {
  process.env.BACKEND_API_BASE_URL = 'not a URL'
  const response = await GET(new Request('http://app/api/backend/image'), context)
  assert.equal(response.status, 502)
  assert.equal(await response.text(), 'Backend API proxy request failed.')
})

test('Node HTTP IPv4 uses fetch and preserves query, allowlisted headers and binary body', async () => {
  process.env.BACKEND_API_BASE_URL = 'http://127.0.0.1:8080/base/'
  const body = new Uint8Array([0, 255, 13, 10])
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), 'http://127.0.0.1:8080/base/image?x=a%2Bb&x=2')
    assert.deepEqual([...new Headers(init?.headers)], [
      ['accept', 'application/json'], ['authorization', 'Bearer fixture'],
      ['content-type', 'multipart/form-data; boundary=fixture'], ['refresh-token', 'fixture-refresh'],
    ])
    assert.deepEqual(new Uint8Array(await new Response(init?.body).arrayBuffer()), body)
    assert.equal(init?.redirect, 'manual')
    return new Response('ok')
  }
  const response = await POST(new Request('http://app/api/backend/image?x=a%2Bb&x=2', {
    method: 'POST', body, headers: { accept: 'application/json', authorization: 'Bearer fixture',
      'content-type': 'multipart/form-data; boundary=fixture', 'refresh-token': 'fixture-refresh', cookie: 'excluded' },
  }), context)
  assert.equal(await response.text(), 'ok')
})

for (const status of [204, 304]) test(`Workers TCP ${status} has null body and closes socket`, async () => {
  const socket = socketFixture(`HTTP/1.1 ${status} Empty\r\nContent-Length: 10\r\n\r\n`)
  const response = await GET(new Request('http://app/api/backend/image'), context)
  assert.equal(response.status, status)
  assert.equal(response.body, null)
  assert.equal(socket.closes, 1)
})

test('Workers TCP accepts chunk extensions and trailers and preserves request bytes', async () => {
  const socket = socketFixture('HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n4;foo="bar"\r\ntest\r\n0\r\nX-End: yes\r\n\r\n')
  const response = await POST(new Request('http://app/api/backend/image?q=1', { method: 'POST', body: 'data', headers: { authorization: 'Bearer fixture' } }), context)
  assert.equal(await response.text(), 'test')
  const wire = socket.writes.map((chunk) => new TextDecoder().decode(chunk)).join('')
  assert.match(wire, /^POST \/image\?q=1 HTTP\/1.1\r\n/)
  assert.match(wire, /authorization: Bearer fixture\r\n/)
  assert.match(wire, /content-length: 4\r\n/)
  assert.ok(wire.endsWith('\r\n\r\ndata'))
  assert.equal(socket.closes, 1)
})

for (const chunk of ['4\r\nab', '4\r\ntestXX0\r\n\r\n', '1z\r\nx\r\n0\r\n\r\n', '-1\r\nx\r\n0\r\n\r\n', '1\r\nx\r\n', '0\r\n']) {
  test(`Workers rejects malformed chunk ${JSON.stringify(chunk)}`, async () => {
    const socket = socketFixture(`HTTP/1.1 200 OK\r\nTransfer-Encoding: chunked\r\n\r\n${chunk}`)
    const response = await GET(new Request('http://app/api/backend/image'), context)
    assert.equal(response.status, 502)
    assert.equal(socket.closes, 1)
  })
}

test('TCP write failure releases writer and closes socket', async () => {
  const socket = socketFixture(null, true)
  assert.equal((await POST(new Request('http://app/api/backend/image', { method: 'POST', body: 'data' }), context)).status, 502)
  assert.equal(socket.closes, 1)
  assert.equal(socket.writable.locked, false)
})

for (const rejectWrite of [false, true]) test(`TCP preserves an early 403 while a large upload write ${rejectWrite ? 'fails' : 'stalls'}`, async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  socketFixture(null)
  const message = JSON.stringify({ error: { message: '인증 없음' } })
  let stopWrite: (() => void) | undefined
  let closes = 0
  let writes = 0
  const readable = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(encoder.encode(`HTTP/1.1 403 Forbidden\r\nContent-Length: ${encoder.encode(message).length}\r\n\r\n${message}`))
      controller.close()
    },
  }, { highWaterMark: 0 })
  const writable = new WritableStream<Uint8Array>({
    write() {
      writes += 1
      if (writes === 1) return
      if (rejectWrite) throw new Error('Backend stopped accepting the upload.')
      return new Promise<void>((_resolve, reject) => { stopWrite = () => reject(new Error('Socket closed.')) })
    },
  })
  Reflect.set(globalThis, socketKey, () => ({ readable, writable, close() { closes += 1; stopWrite?.() } }))
  let settled = false
  const pending = POST(new Request('http://app/api/backend/image', {
    method: 'POST', body: new Uint8Array(70 * 1024),
  }), context).then((response) => { settled = true; return response })
  await new Promise<void>((resolve) => setImmediate(resolve))
  const completedBeforeTimeout = settled
  if (!settled) t.mock.timers.tick(30_001)
  const response = await pending
  assert.equal(response.status, 403)
  assert.equal(await response.text(), message)
  assert.equal(completedBeforeTimeout, true)
  assert.equal(closes, 1)
  assert.equal(readable.locked, false)
  assert.equal(writable.locked, false)
})

test('TCP forwards a complete large binary upload before a successful response', async () => {
  socketFixture(null)
  const body = Uint8Array.from({ length: 1024 * 1024 }, (_, index) => index % 256)
  let responseController: ReadableStreamDefaultController<Uint8Array> | undefined
  const received: Uint8Array[] = []
  let receivedBytes = 0
  const readable = new ReadableStream<Uint8Array>({ start(controller) { responseController = controller } })
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      received.push(chunk)
      if (received.length > 1) receivedBytes += chunk.byteLength
      if (receivedBytes === body.length) {
        responseController?.enqueue(encoder.encode('HTTP/1.1 200 OK\r\nContent-Length: 2\r\n\r\nok'))
        responseController?.close()
      }
    },
  })
  Reflect.set(globalThis, socketKey, () => ({ readable, writable, close() {} }))
  const response = await POST(new Request('http://app/api/backend/image', { method: 'POST', body }), context)
  assert.equal(response.status, 200)
  assert.equal(await response.text(), 'ok')
  assert.match(new TextDecoder().decode(received[0]), /content-length: 1048576\r\n/)
  assert.deepEqual(Buffer.concat(received.slice(1)), Buffer.from(body))
  assert.ok(received.slice(1).every((chunk) => chunk.byteLength <= 16 * 1024))
  assert.equal(readable.locked, false)
  assert.equal(writable.locked, false)
})

test('TCP stops sending remaining upload chunks when the backend responds', async () => {
  socketFixture(null)
  let responseController: ReadableStreamDefaultController<Uint8Array> | undefined
  let writes = 0
  let uploadedBytes = 0
  const readable = new ReadableStream<Uint8Array>({ start(controller) { responseController = controller } })
  const writable = new WritableStream<Uint8Array>({
    write(chunk) {
      writes += 1
      if (writes === 1) return
      uploadedBytes += chunk.byteLength
      if (writes === 2) {
        responseController?.enqueue(encoder.encode('HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n'))
        setImmediate(() => responseController?.close())
      }
    },
  })
  Reflect.set(globalThis, socketKey, () => ({ readable, writable, close() {} }))
  const body = new Uint8Array(1024 * 1024)
  const response = await POST(new Request('http://app/api/backend/image', { method: 'POST', body }), context)
  assert.equal(response.status, 403)
  await new Promise<void>((resolve) => setImmediate(resolve))
  assert.ok(uploadedBytes > 0 && uploadedBytes < body.byteLength)
})

for (const rejectWrite of [false, true]) test(`TCP times out without a response when the upload ${rejectWrite ? 'fails' : 'stalls'}`, async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const socket = socketFixture(null)
  let stopWrite: (() => void) | undefined
  let closes = 0
  let writes = 0
  const writable = new WritableStream<Uint8Array>({
    write() {
      writes += 1
      if (writes === 1) return
      if (rejectWrite) throw new Error('Upload failed.')
      return new Promise<void>((_resolve, reject) => { stopWrite = () => reject(new Error('Socket closed.')) })
    },
  })
  Reflect.set(globalThis, socketKey, () => ({ readable: socket.readable, writable, close() { closes += 1; stopWrite?.() } }))
  const pending = POST(new Request('http://app/api/backend/image', { method: 'POST', body: new Uint8Array(70 * 1024) }), context)
  await new Promise<void>((resolve) => setImmediate(resolve))
  t.mock.timers.tick(30_001)
  assert.equal((await pending).status, 502)
  assert.equal(closes, 1)
  assert.equal(socket.cancelled, true)
  assert.equal(socket.readable.locked, false)
  assert.equal(writable.locked, false)
})

test('TCP stalled response times out and cancels reader', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const socket = socketFixture(null)
  const pending = GET(new Request('http://app/api/backend/image'), context)
  await new Promise<void>((resolve) => setImmediate(resolve))
  t.mock.timers.tick(30_001)
  assert.equal((await pending).status, 502)
  assert.equal(socket.closes, 1)
  assert.equal(socket.cancelled, true)
  assert.equal(socket.readable.locked, false)
})

test('request larger than 55 MiB is rejected before forwarding', async () => {
  let calls = 0
  globalThis.fetch = async () => { calls += 1; return new Response('bad') }
  const response = await POST(new Request('http://app/api/backend/image', {
    method: 'POST', body: 'x', headers: { 'content-length': String(55 * 1024 * 1024 + 1) },
  }), context)
  assert.equal(response.status, 413)
  assert.equal(calls, 0)
})

test('Workers HTTPS uses fetch and preserves an empty 304', async () => {
  socketFixture(null)
  process.env.BACKEND_API_BASE_URL = 'https://backend.example'
  globalThis.fetch = async (input) => {
    assert.equal(String(input), 'https://backend.example/image')
    return new Response(null, { status: 304 })
  }
  const response = await GET(new Request('http://app/api/backend/image'), context)
  assert.equal(response.status, 304)
  assert.equal(response.body, null)
})

test('fetch timeout aborts upstream before headers arrive', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let signal: AbortSignal | null | undefined
  globalThis.fetch = (_input, init) => { signal = init?.signal; return new Promise(() => {}) }
  const pending = GET(new Request('http://app/api/backend/image'), context)
  await new Promise<void>((resolve) => setImmediate(resolve))
  t.mock.timers.tick(30_001)
  assert.equal((await pending).status, 502)
  assert.equal(signal?.aborted, true)
})

test('fetch slow body times out and cancels reader', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  let cancelled = false
  globalThis.fetch = async () => new Response(new ReadableStream({ cancel() { cancelled = true } }))
  const pending = GET(new Request('http://app/api/backend/image'), context)
  await new Promise<void>((resolve) => setImmediate(resolve))
  t.mock.timers.tick(30_001)
  assert.equal((await pending).status, 502)
  assert.equal(cancelled, true)
})

test('actual 55 MiB request is preserved; untrusted content-length cannot bypass limit', async (t) => {
  const limit = 55 * 1024 * 1024
  let forwarded = 0
  globalThis.fetch = async (_input, init) => {
    assert.ok(init?.body instanceof Uint8Array)
    assert.equal(init.body.byteLength, limit)
    assert.equal(init.body[limit - 1], 42)
    forwarded += 1
    return new Response(null, { status: 204 })
  }
  function request(extra: number) {
    let count = 0
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (count++ < 55) controller.enqueue(new Uint8Array(1024 * 1024).fill(42))
        else { if (extra) controller.enqueue(new Uint8Array(extra)); controller.close() }
      },
    })
    const init: RequestInit & { duplex: string } = { method: 'POST', body, duplex: 'half', headers: { 'content-length': '1' } }
    return new Request('http://app/api/backend/image', init)
  }
  assert.equal((await POST(request(0), context)).status, 204)
  assert.equal((await POST(request(1), context)).status, 413)
  assert.equal(forwarded, 1)
  t.diagnostic(`Node memory snapshot after 55 MiB boundary scenarios: ${JSON.stringify(process.memoryUsage())}`)
})
