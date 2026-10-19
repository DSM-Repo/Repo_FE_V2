type JsonRecord = { readonly [key: string]: unknown }

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonemptyMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

export async function readServerErrorMessage(response: Response, fallbackMessage: string): Promise<string> {
  let text: string
  try {
    text = await response.text()
  } catch (error) {
    if (error instanceof Error) return fallbackMessage
    throw error
  }

  if (!text.trim()) return fallbackMessage

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch (error) {
    if (error instanceof SyntaxError) return text
    throw error
  }

  if (isRecord(body)) {
    const nestedMessage = isRecord(body['error']) ? nonemptyMessage(body['error']['message']) : undefined
    if (nestedMessage !== undefined) return nestedMessage
    for (const key of ['message', 'error', 'detail', 'reason'] as const) {
      const message = nonemptyMessage(body[key])
      if (message !== undefined) return message
    }
  }

  return nonemptyMessage(body) ?? fallbackMessage
}
