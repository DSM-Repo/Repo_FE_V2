export type CropPosition = { readonly x: number; readonly y: number; readonly zoom: number }
export type ImageDimensions = { readonly width: number; readonly height: number }

export function getProfileCrop(dimensions: ImageDimensions, position: CropPosition) {
  const size = Math.min(dimensions.width, dimensions.height) / position.zoom
  return {
    size,
    x: (dimensions.width - size) * position.x,
    y: (dimensions.height - size) * position.y,
  }
}

export function moveProfileCrop(
  dimensions: ImageDimensions,
  position: CropPosition,
  movement: { readonly x: number; readonly y: number },
): CropPosition {
  const { size } = getProfileCrop(dimensions, position)
  const clamp = (value: number) => Math.min(1, Math.max(0, value))
  return {
    ...position,
    x: dimensions.width > size ? clamp(position.x - movement.x * size / (dimensions.width - size)) : 0.5,
    y: dimensions.height > size ? clamp(position.y - movement.y * size / (dimensions.height - size)) : 0.5,
  }
}

export async function exportProfileCrop(image: HTMLImageElement, position: CropPosition, name: string): Promise<File> {
  const crop = getProfileCrop({ width: image.naturalWidth, height: image.naturalHeight }, position)
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('사진을 자를 수 없습니다. 다른 브라우저에서 다시 시도해주세요.')
  context.drawImage(image, crop.x, crop.y, crop.size, crop.size, 0, 0, 512, 512)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('사진을 변환하지 못했습니다. 다시 시도해주세요.')
  return new File([blob], `${name.replace(/\.[^.]+$/, '')}-profile.png`, { type: 'image/png' })
}
