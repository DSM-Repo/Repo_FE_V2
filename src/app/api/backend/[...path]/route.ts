const DEFAULT_BACKEND_API_BASE_URL = 'http://52.78.201.218'
const BACKEND_API_BASE_URL =
  process.env.BACKEND_API_BASE_URL?.trim() || process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BACKEND_API_BASE_URL

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

async function proxyBackendRequest(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params
  const method = request.method.toUpperCase()
  const body = method === 'GET' || method === 'HEAD' ? undefined : await request.arrayBuffer()

  try {
    const upstreamResponse = await fetch(getBackendApiUrl(path, request.url), {
      body,
      headers: getForwardHeaders(request),
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
