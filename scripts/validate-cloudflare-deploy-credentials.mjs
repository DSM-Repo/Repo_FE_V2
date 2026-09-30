import { readFile } from 'node:fs/promises'

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim()

function fail(message) {
  console.error(`::error title=Cloudflare deploy credentials::${message}`)
  process.exit(1)
}

function getCloudflareErrorMessage(payload) {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.errors)) {
    return 'Cloudflare API returned an unknown error.'
  }

  return payload.errors
    .map((error) => {
      if (!error || typeof error !== 'object') {
        return undefined
      }

      const code = typeof error.code === 'number' || typeof error.code === 'string' ? `code ${error.code}` : 'no code'
      const message = typeof error.message === 'string' ? error.message : 'Unknown Cloudflare error'

      return `${message} (${code})`
    })
    .filter(Boolean)
    .join('; ')
}

async function readWorkerName() {
  const rawConfig = await readFile(new URL('../wrangler.jsonc', import.meta.url), 'utf8')
  const match = rawConfig.match(/"name"\s*:\s*"([^"]+)"/)

  if (!match?.[1]) {
    fail('wrangler.jsonc must include a top-level "name" field.')
  }

  return match[1]
}

async function requestCloudflare(path) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  })

  let body

  try {
    body = await response.json()
  } catch {
    body = undefined
  }

  return { body, response }
}

if (!accountId) {
  fail('Missing CLOUDFLARE_ACCOUNT_ID GitHub secret.')
}

if (!apiToken) {
  fail('Missing CLOUDFLARE_API_TOKEN GitHub secret.')
}

const tokenCheck = await requestCloudflare('/user/tokens/verify')

if (!tokenCheck.response.ok || tokenCheck.body?.success !== true) {
  fail(
    `CLOUDFLARE_API_TOKEN is not a valid active Cloudflare API token. ${getCloudflareErrorMessage(tokenCheck.body)}`,
  )
}

const workerName = await readWorkerName()
const serviceCheck = await requestCloudflare(
  `/accounts/${encodeURIComponent(accountId)}/workers/services/${encodeURIComponent(workerName)}`,
)

if (serviceCheck.response.status === 404) {
  console.log(`Cloudflare token is valid for account ${accountId}; Worker "${workerName}" does not exist yet.`)
  process.exit(0)
}

if (!serviceCheck.response.ok) {
  fail(
    [
      `CLOUDFLARE_API_TOKEN cannot access Worker "${workerName}" on account ${accountId}.`,
      getCloudflareErrorMessage(serviceCheck.body),
      'Create a token from the "Edit Cloudflare Workers" template scoped to this account, then update the GitHub CLOUDFLARE_API_TOKEN secret.',
      'Required permissions include Workers Scripts Write, Workers KV Storage Write, Account Settings Read, User Details Read, and User Memberships Read.',
    ].join(' '),
  )
}

console.log(`Cloudflare token can access Worker "${workerName}" on account ${accountId}.`)
