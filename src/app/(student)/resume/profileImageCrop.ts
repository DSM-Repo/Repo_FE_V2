export type CropPosition = { readonly x: number; readonly y: number; readonly zoom: number }
export type ImageDimensions = { readonly width: number; readonly height: number }
export type CropCorner = 'nw' | 'ne' | 'sw' | 'se'

const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value))

function toCropPosition(dimensions: ImageDimensions, crop: { x: number; y: number; size: number }): CropPosition {
  return {
    x: dimensions.width > crop.size ? clamp(crop.x / (dimensions.width - crop.size), 0, 1) : 0.5,
    y: dimensions.height > crop.size ? clamp(crop.y / (dimensions.height - crop.size), 0, 1) : 0.5,
    zoom: Math.min(dimensions.width, dimensions.height) / crop.size,
  }
}

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
  const crop = getProfileCrop(dimensions, position)
  return toCropPosition(dimensions, {
    ...crop,
    x: crop.x + movement.x * dimensions.width,
    y: crop.y + movement.y * dimensions.height,
  })
}

export function resizeProfileCrop(
  dimensions: ImageDimensions,
  position: CropPosition,
  corner: CropCorner,
  movement: { readonly x: number; readonly y: number },
): CropPosition {
  const crop = getProfileCrop(dimensions, position)
  const left = corner === 'nw' || corner === 'sw'
  const top = corner === 'nw' || corner === 'ne'
  const anchorX = left ? crop.x + crop.size : crop.x
  const anchorY = top ? crop.y + crop.size : crop.y
  const maximum = Math.min(left ? anchorX : dimensions.width - anchorX, top ? anchorY : dimensions.height - anchorY)
  const delta = ((left ? -movement.x : movement.x) + (top ? -movement.y : movement.y)) / 2
  const size = clamp(crop.size + delta, Math.min(dimensions.width, dimensions.height) / 3, maximum)
  return toCropPosition(dimensions, {
    size,
    x: left ? anchorX - size : anchorX,
    y: top ? anchorY - size : anchorY,
  })
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
