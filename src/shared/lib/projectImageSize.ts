export type ProjectImageSize = {
  readonly width: number
  readonly height: number
}

export const MIN_PROJECT_IMAGE_SIZE = 40
export const MAX_PROJECT_IMAGE_SIZE = 160
export const DEFAULT_PROJECT_IMAGE_SIZE = 80

// The current API persists page content but has no dedicated image-layout fields.
const metadataPattern = /^<!-- repo:project-image-size=([^\r\n]*?) -->(?:\r?\n)?/

function isValidSize(size: ProjectImageSize): boolean {
  return [size.width, size.height].every((value) =>
    Number.isInteger(value) && value >= MIN_PROJECT_IMAGE_SIZE && value <= MAX_PROJECT_IMAGE_SIZE,
  )
}

export function readProjectImageSize(content: string): { content: string; imageSize?: ProjectImageSize } {
  const metadata = content.match(metadataPattern)
  if (!metadata) return { content }

  const dimensions = /^(\d{2,3})x(\d{2,3})$/.exec(metadata[1])
  const imageSize = dimensions ? { width: Number(dimensions[1]), height: Number(dimensions[2]) } : undefined
  return {
    content: content.slice(metadata[0].length),
    ...(imageSize && isValidSize(imageSize) ? { imageSize } : {}),
  }
}

export function writeProjectImageSize(content: string, imageSize?: ProjectImageSize): string {
  const body = readProjectImageSize(content).content
  return imageSize && isValidSize(imageSize)
    ? `<!-- repo:project-image-size=${imageSize.width}x${imageSize.height} -->\n${body}`
    : body
}
