export type ResumeMarkdownImageSize = {
  readonly width: number
  readonly height: number
}

export const MIN_MARKDOWN_IMAGE_SIZE = 24
export const MAX_MARKDOWN_IMAGE_WIDTH = 512
export const MAX_MARKDOWN_IMAGE_HEIGHT = 640

function toDimension(value: unknown, maximum: number): number | undefined {
  const number = typeof value === 'number' ? value
    : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN
  return Number.isInteger(number) && number >= MIN_MARKDOWN_IMAGE_SIZE && number <= maximum ? number : undefined
}

export function parseMarkdownImageSize(width: unknown, height: unknown): ResumeMarkdownImageSize | undefined {
  const parsedWidth = toDimension(width, MAX_MARKDOWN_IMAGE_WIDTH)
  const parsedHeight = toDimension(height, MAX_MARKDOWN_IMAGE_HEIGHT)
  return parsedWidth !== undefined && parsedHeight !== undefined ? { width: parsedWidth, height: parsedHeight } : undefined
}

export function readMarkdownImageSize(token: string): ResumeMarkdownImageSize | undefined {
  const dimensions = /\{width=([^\s{}]+) height=([^\s{}]+)\}$/.exec(token)
  return dimensions ? parseMarkdownImageSize(dimensions[1], dimensions[2]) : undefined
}

export function formatMarkdownImageSize(size?: ResumeMarkdownImageSize): string {
  return size && parseMarkdownImageSize(size.width, size.height) ? `{width=${size.width} height=${size.height}}` : ''
}

// Capture groups stay aligned across editor rendering, reading, and page slicing.
export function createResumeMarkdownInlinePattern(): RegExp {
  return /(!\[([^\]]*)\]\(([^)]+)\)(?:\{width=[^{}\r\n]*\})?|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*|<u>([\s\S]*?)<\/u>)/g
}
