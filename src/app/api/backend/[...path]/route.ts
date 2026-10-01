const DEFAULT_BACKEND_API_BASE_URL = 'http://52.78.201.218'
const MAX_BODY_BYTES = 55 * 1024 * 1024
const UPSTREAM_TIMEOUT_MS = 30_000
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

function getBackendApiUrl(path: readonly string[], requestUrl: string) {
  const targetUrl = new URL(path.map((segment) => encodeURIComponent(segment)).join('/'), getNormalizedBackendOrigin())
  targetUrl.search = new URL(requestUrl).search

  return targetUrl
}

function getNormalizedBackendOrigin() {
  const backendUrl = new URL(
    process.env.BACKEND_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BACKEND_API_BASE_URL,
  )

  if (backendUrl.protocol !== 'http:' && backendUrl.protocol !== 'https:') {
    throw new Error('BACKEND_API_BASE_URL must use http or https.')
  }

  return backendUrl.href.endsWith('/') ? backendUrl.href : `${backendUrl.href}/`
}

function getForwardHeaders(request: Request) {
  const headers = new Headers()

  for (const headerName of ['accept', 'authorization', 'content-type', 'refresh-token']) {
    const value = request.headers.get(headerName)

    if (value) {
      headers.set(headerName, value)
    }
  }

  return headers
}

function isIpv4Address(hostname: string) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

function findHeaderBoundary(bytes: Uint8Array) {
  for (let index = 0; index <= bytes.length - 4; index += 1) {
    if (bytes[index] === 13 && bytes[index + 1] === 10 && bytes[index + 2] === 13 && bytes[index + 3] === 10) {
      return index
    }
  }

  return -1
}

function findLineEnd(bytes: Uint8Array, startIndex: number) {
  for (let index = startIndex; index <= bytes.length - 2; index += 1) {
    if (bytes[index] === 13 && bytes[index + 1] === 10) {
      return index
    }
  }

  return -1
}

function concatBytes(chunks: Uint8Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }

  return result
}

function decodeChunkedBody(bytes: Uint8Array) {
  const chunks: Uint8Array[] = []
  let offset = 0

  while (offset < bytes.byteLength) {
    const lineEnd = findLineEnd(bytes, offset)

    if (lineEnd < 0) {
      throw new Error('Invalid chunked response from backend API.')
    }

    const chunkSizeText = textDecoder.decode(bytes.subarray(offset, lineEnd)).split(';')[0]?.trim() ?? ''
    const chunkSize = Number.parseInt(chunkSizeText, 16)

    if (!/^[0-9a-f]+$/i.test(chunkSizeText) || !Number.isSafeInteger(chunkSize)) {
      throw new Error('Invalid chunk size from backend API.')
    }

    offset = lineEnd + 2

    if (chunkSize === 0) {
      while (true) {
        const trailerEnd = findLineEnd(bytes, offset)
        if (trailerEnd < 0) throw new Error('Truncated chunk trailers.')
        if (trailerEnd === offset) {
          if (trailerEnd + 2 !== bytes.length) throw new Error('Unexpected bytes after chunked body.')
          return concatBytes(chunks)
        }
        const trailer = textDecoder.decode(bytes.subarray(offset, trailerEnd))
        if (!/^[!#$%&'*+.^_`|~\w-]+:/.test(trailer)) throw new Error('Invalid chunk trailer.')
        offset = trailerEnd + 2
      }
    }

    if (chunkSize > bytes.length - offset - 2 || bytes[offset + chunkSize] !== 13 || bytes[offset + chunkSize + 1] !== 10) {
      throw new Error('Truncated or invalid chunk data.')
    }
    chunks.push(bytes.subarray(offset, offset + chunkSize))
    offset += chunkSize + 2
  }

  throw new Error('Missing final chunk.')
}

class BodyLimitError extends Error {}

function withAbort<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise((resolve, reject) => {
    const abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
    operation.then(resolve, reject).finally(() => signal.removeEventListener('abort', abort))
    if (signal.aborted) abort()
  })
}

async function readAllBytes(stream: ReadableStream<Uint8Array>, signal: AbortSignal) {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let length = 0
  let complete = false

  try {
    while (true) {
      const { done, value } = await withAbort(reader.read(), signal)

      if (done) {
        complete = true
        break
      }

      length += value.byteLength
      if (length > MAX_BODY_BYTES) throw new BodyLimitError('Body exceeds 55 MiB.')
      chunks.push(value)
    }
  } finally {
    if (!complete) {
      void reader.cancel().catch((error: unknown) => console.error('Backend stream cancellation failed.', error))
    }
    reader.releaseLock()
  }

  return concatBytes(chunks)
}

function createHttpResponseFromBytes(bytes: Uint8Array<ArrayBuffer>) {
  const boundaryIndex = findHeaderBoundary(bytes)

  if (boundaryIndex < 0) {
    throw new Error('Invalid HTTP response from backend API.')
  }

  const headerText = textDecoder.decode(bytes.subarray(0, boundaryIndex))
  const [statusLine = '', ...headerLines] = headerText.split('\r\n')
  const statusMatch = /^HTTP\/1\.[01] ([2-5][0-9]{2})(?: (.*))?$/.exec(statusLine)
  if (!statusMatch) throw new Error('Invalid backend status line.')
  const status = Number(statusMatch[1])
  const headers = new Headers()

  for (const headerLine of headerLines) {
    const separatorIndex = headerLine.indexOf(':')

    if (separatorIndex > 0) {
      headers.append(headerLine.slice(0, separatorIndex), headerLine.slice(separatorIndex + 1).trim())
    } else throw new Error('Invalid backend header.')
  }

  const bodyBytes = bytes.subarray(boundaryIndex + 4)
  const encoding = headers.get('transfer-encoding')?.toLowerCase()
  const empty = status === 204 || status === 205 || status === 304
  if (encoding && encoding !== 'chunked') throw new Error('Unsupported transfer encoding.')
  const length = headers.get('content-length')
  if (!empty && length !== null && (!/^\d+$/.test(length) || Number(length) !== bodyBytes.length || encoding)) {
    throw new Error('Invalid backend content length.')
  }
  const body = empty ? null : encoding ? decodeChunkedBody(bodyBytes) : bodyBytes

  headers.delete('connection')
  headers.delete('content-length')
  headers.delete('transfer-encoding')

  return new Response(body, {
    headers,
    status,
    statusText: statusMatch[2] ?? '',
  })
}

async function fetchBackendViaTcp(targetUrl: URL, method: string, headers: Headers, body: Uint8Array<ArrayBuffer> | undefined, signal: AbortSignal) {
  const { connect } = await withAbort(import('cloudflare:sockets'), signal)
  signal.throwIfAborted()
  const socket = connect(
    { hostname: targetUrl.hostname, port: Number(targetUrl.port || 80) },
    { allowHalfOpen: true, secureTransport: 'off' },
  )
  const writer = socket.writable.getWriter()
  const requestHeaders = new Headers(headers)

  requestHeaders.set('connection', 'close')
  requestHeaders.set('host', targetUrl.host)

  if (body) {
    requestHeaders.set('content-length', String(body.byteLength))
  }

  const headerLines = [...requestHeaders.entries()].map(([name, value]) => `${name}: ${value}`)
  const requestHead = `${method} ${targetUrl.pathname}${targetUrl.search} HTTP/1.1\r\n${headerLines.join('\r\n')}\r\n\r\n`

  try {
    await withAbort(writer.write(textEncoder.encode(requestHead)), signal)

    if (body) {
      await withAbort(writer.write(body), signal)
    }

    return createHttpResponseFromBytes(await readAllBytes(socket.readable, signal))
  } finally {
    writer.releaseLock()
    void Promise.resolve(socket.close()).catch((error: unknown) => console.error('Backend socket close failed.', error))
  }
}

async function proxyBackendRequest(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error('Backend timeout.')), UPSTREAM_TIMEOUT_MS)
  const abort = () => controller.abort(request.signal.reason)
  request.signal.addEventListener('abort', abort, { once: true })
  if (request.signal.aborted) abort()
  try {
    const { path } = await withAbort(context.params, controller.signal)
    const method = request.method.toUpperCase()
    const targetUrl = getBackendApiUrl(path, request.url)
    const headers = getForwardHeaders(request)
    if (Number(request.headers.get('content-length')) > MAX_BODY_BYTES) {
      void request.body?.cancel().catch((error: unknown) => console.error('Request cancellation failed.', error))
      return new Response('Backend API request body too large.', { status: 413 })
    }
    let body: Uint8Array<ArrayBuffer> | undefined
    try {
      body = method === 'GET' || method === 'HEAD' || !request.body ? undefined : await readAllBytes(request.body, controller.signal)
    } catch (error) {
      if (error instanceof BodyLimitError) return new Response('Backend API request body too large.', { status: 413 })
      throw error
    }
    if (globalThis.navigator?.userAgent === 'Cloudflare-Workers' && targetUrl.protocol === 'http:' && isIpv4Address(targetUrl.hostname)) {
      return await fetchBackendViaTcp(targetUrl, method, headers, body, controller.signal)
    }

    const upstreamResponse = await withAbort(fetch(targetUrl, {
      body,
      headers,
      method,
      redirect: 'manual',
      signal: controller.signal,
    }), controller.signal)
    const responseBody = upstreamResponse.body ? await readAllBytes(upstreamResponse.body, controller.signal) : null

    return new Response(responseBody, {
      headers: new Headers(upstreamResponse.headers),
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
    })
  } catch (error) {
    console.error('Backend API proxy request failed.', error)

    return new Response('Backend API proxy request failed.', { status: 502 })
  } finally {
    clearTimeout(timer)
    request.signal.removeEventListener('abort', abort)
  }
}

export function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackendRequest(request, context)
}

export function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackendRequest(request, context)
}

export function PATCH(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackendRequest(request, context)
}

export function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackendRequest(request, context)
}

export function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxyBackendRequest(request, context)
}
