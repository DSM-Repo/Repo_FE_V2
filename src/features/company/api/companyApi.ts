'use client'

import { sendAuthenticatedRequest } from '../../auth/api/authenticatedRequest'
import { buildClientApiUrl, getClientApiConfig } from '../../../shared/api/clientApiBaseUrl'
import { readServerErrorMessage } from '../../../shared/api/serverErrorMessage'

export type Company = {
  readonly companyId: number | string
  readonly name: string
  readonly code: string
  readonly createdAt: string
}

type CompanyResult<T> =
  | { readonly kind: 'success'; readonly value: T }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'duplicate-name' | 'server-error'
      readonly message: string
    }

const companyApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
const invalidResponse = { kind: 'server-error', message: '기업 계정 API 응답 형식이 올바르지 않습니다.' } as const

function isCompany(value: unknown): value is Company {
  return (
    typeof value === 'object' &&
    value !== null &&
    'companyId' in value &&
    (typeof value.companyId === 'number' || typeof value.companyId === 'string') &&
    'name' in value &&
    typeof value.name === 'string' &&
    'code' in value &&
    typeof value.code === 'string' &&
    'createdAt' in value &&
    typeof value.createdAt === 'string'
  )
}

async function readCompanyJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    if (error instanceof Error) return undefined
    throw error
  }
}

async function requestCompany<T>(
  accessToken: string,
  path: string,
  init: RequestInit,
  onSuccess: (response: Response) => Promise<CompanyResult<T>>,
): Promise<CompanyResult<T>> {
  const config = getClientApiConfig(companyApiBaseUrl, 'API 주소가 설정되지 않았습니다.')
  if (config.kind === 'invalid') {
    return { kind: 'configuration-error', message: config.message }
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${accessToken}`)
  const response = await sendAuthenticatedRequest({
    init: { ...init, headers },
    networkErrorMessage: '기업 계정 API에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    timeoutMs: 8_000,
    url: buildClientApiUrl(config.baseUrl, path).href,
  })

  if (response.kind !== 'response') return response

  try {
    if (response.value.ok) return await onSuccess(response.value)

    if (init.method === 'POST' && response.value.status === 409) {
      return { kind: 'duplicate-name', message: '이미 등록된 회사 이름입니다.' }
    }

    return {
      kind: 'server-error',
      message: await readServerErrorMessage(response.value, '기업 계정 요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'),
    }
  } finally {
    response.complete()
  }
}

export function getCompanies(accessToken: string): Promise<CompanyResult<readonly Company[]>> {
  return requestCompany(accessToken, 'company', { cache: 'no-store', method: 'GET' }, async (response) => {
    const body = await readCompanyJson(response)
    const companies = typeof body === 'object' && body !== null && 'companies' in body ? body.companies : body
    return Array.isArray(companies) && companies.every(isCompany)
      ? { kind: 'success', value: companies }
      : invalidResponse
  })
}

export function createCompany(accessToken: string, name: string): Promise<CompanyResult<Company>> {
  return requestCompany(
    accessToken,
    'company',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    },
    async (response) => {
      const company = await readCompanyJson(response)
      return isCompany(company) ? { kind: 'success', value: company } : invalidResponse
    },
  )
}

export function deleteCompany(accessToken: string, companyId: Company['companyId']): Promise<CompanyResult<undefined>> {
  return requestCompany(
    accessToken,
    `company/${encodeURIComponent(String(companyId))}`,
    { method: 'DELETE' },
    async () => ({ kind: 'success', value: undefined }),
  )
}
