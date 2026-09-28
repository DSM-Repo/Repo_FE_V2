const DEFAULT_BACKEND_API_BASE_URL = 'http://52.78.201.218'
const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BACKEND_API_BASE_URL
const textDecoder = new TextDecoder()
const textEncoder = new TextEncoder()

function getBackendApiUrl(path: readonly string[], requestUrl: string) {
  const targetUrl = new URL(path.map((segment) => encodeURIComponent(segment)).join('/'), getNormalizedBackendOrigin())
  targetUrl.search = new URL(requestUrl).search

  return targetUrl
}

function getNormalizedBackendOrigin() {
  const backendUrl = new URL(BACKEND_API_BASE_URL)

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

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
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

    if (!Number.isFinite(chunkSize)) {
      throw new Error('Invalid chunk size from backend API.')
    }

    offset = lineEnd + 2

    if (chunkSize === 0) {
      break
    }

    chunks.push(bytes.subarray(offset, offset + chunkSize))
    offset += chunkSize + 2
  }

  return concatBytes(chunks)
}

async function readAllBytes(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }

  return concatBytes(chunks)
}

function createHttpResponseFromBytes(bytes: Uint8Array) {
  const boundaryIndex = findHeaderBoundary(bytes)

  if (boundaryIndex < 0) {
    throw new Error('Invalid HTTP response from backend API.')
  }

  const headerText = textDecoder.decode(bytes.subarray(0, boundaryIndex))
  const [statusLine = '', ...headerLines] = headerText.split('\r\n')
  const [, statusCodeText, ...statusTextParts] = statusLine.split(' ')
  const status = Number.parseInt(statusCodeText ?? '', 10)
  const headers = new Headers()

  for (const headerLine of headerLines) {
    const separatorIndex = headerLine.indexOf(':')

    if (separatorIndex > 0) {
      headers.append(headerLine.slice(0, separatorIndex), headerLine.slice(separatorIndex + 1).trim())
    }
  }

  const bodyBytes = bytes.subarray(boundaryIndex + 4)
  const isChunked = headers.get('transfer-encoding')?.toLowerCase().includes('chunked') ?? false
  const body = isChunked ? decodeChunkedBody(bodyBytes) : bodyBytes

  headers.delete('connection')
  headers.delete('content-length')
  headers.delete('transfer-encoding')

  return new Response(toArrayBuffer(body), {
    headers,
    status: Number.isFinite(status) ? status : 502,
    statusText: statusTextParts.join(' '),
  })
}

async function fetchBackendViaTcp(targetUrl: URL, method: string, headers: Headers, body: ArrayBuffer | undefined) {
  const { connect } = await import('cloudflare:sockets')
  const socket = connect({ hostname: targetUrl.hostname, port: Number(targetUrl.port || 80) }, { secureTransport: 'off' })
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
    await writer.write(textEncoder.encode(requestHead))

    if (body) {
      await writer.write(new Uint8Array(body))
    }

    await writer.close()

    return createHttpResponseFromBytes(await readAllBytes(socket.readable))
  } finally {
    socket.close()
  }
}

async function proxyBackendRequest(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const method = request.method.toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()
  const targetUrl = getBackendApiUrl(path, request.url)
  const headers = getForwardHeaders(request)

  try {
    if (targetUrl.protocol === 'http:' && isIpv4Address(targetUrl.hostname)) {
      return await fetchBackendViaTcp(targetUrl, method, headers, body)
    }

    const upstreamResponse = await fetch(targetUrl, {
      body,
      headers,
      method,
      redirect: 'manual',
    })

    return new Response(upstreamResponse.body, {
      headers: new Headers(upstreamResponse.headers),
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
    })
  } catch (error) {
    console.error('Backend API proxy request failed.', error)

    return new Response('Backend API proxy request failed.', { status: 502 })
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
