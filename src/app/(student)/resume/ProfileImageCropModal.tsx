'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'

import { Button } from '@/shared/ui'

import { exportProfileCrop, getProfileCrop, moveProfileCrop, resizeProfileCrop, type CropCorner, type CropPosition } from './profileImageCrop'
import styles from './ProfileImageCropModal.module.css'

type Props = {
  readonly title?: string
  readonly file: File
  readonly onCancel: () => void
  readonly onConfirm: (file: File) => void
}

type ImageState = { readonly kind: 'loading' } | { readonly kind: 'ready'; readonly image: HTMLImageElement } | { readonly kind: 'error'; readonly message: string }
const corners: readonly { corner: CropCorner; label: string }[] = [
  { corner: 'nw', label: '왼쪽 위 크기 조절' }, { corner: 'ne', label: '오른쪽 위 크기 조절' },
  { corner: 'sw', label: '왼쪽 아래 크기 조절' }, { corner: 'se', label: '오른쪽 아래 크기 조절' },
]

export function ProfileImageCropModal({ file, title = '프로필 사진 조정', onCancel, onConfirm }: Props) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef(true)
  const dragRef = useRef<{ x: number; y: number; position: CropPosition; corner?: CropCorner } | null>(null)
  const validationMessage = file.size === 0 ? '업로드할 이미지가 없습니다.'
    : file.size > 50 * 1024 * 1024 ? '이미지는 50MB 이하만 업로드할 수 있습니다.'
    : !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? 'JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.' : ''
  const [imageState, setImageState] = useState<ImageState>(() => validationMessage ? { kind: 'error', message: validationMessage } : { kind: 'loading' })
  const [position, setPosition] = useState<CropPosition>({ x: 0.5, y: 0.5, zoom: 1 })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    activeRef.current = true
    if (validationMessage) return () => { activeRef.current = false; dialog?.close() }
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      if (activeRef.current) setImageState({ kind: 'ready', image })
    }
    image.onerror = () => {
      if (activeRef.current) setImageState({ kind: 'error', message: '사진을 읽지 못했습니다. JPG, PNG 또는 WebP 사진을 선택해주세요.' })
    }
    image.src = url
    return () => {
      activeRef.current = false
      image.onload = null
      image.onerror = null
      URL.revokeObjectURL(url)
      dialog?.close()
    }
  }, [file, validationMessage])

  const dimensions = imageState.kind === 'ready'
    ? { width: imageState.image.naturalWidth, height: imageState.image.naturalHeight }
    : null
  const crop = dimensions ? getProfileCrop(dimensions, position) : null

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const preview = previewRef.current
    if (!drag || !preview || !dimensions || pending) return
    const movement = { x: (event.clientX - drag.x) / preview.clientWidth, y: (event.clientY - drag.y) / preview.clientHeight }
    setPosition(drag.corner
      ? resizeProfileCrop(dimensions, drag.position, drag.corner, { x: movement.x * dimensions.width, y: movement.y * dimensions.height })
      : moveProfileCrop(dimensions, drag.position, movement))
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const directions: Record<string, readonly [number, number]> = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }
    const movement = directions[event.key]
    const preview = previewRef.current
    if (!movement || !dimensions || !preview || pending) return
    event.preventDefault()
    const corner = event.target instanceof HTMLElement ? event.target.dataset.cropCorner as CropCorner | undefined : undefined
    setPosition((current) => corner
      ? resizeProfileCrop(dimensions, current, corner, { x: movement[0] * dimensions.width / preview.clientWidth, y: movement[1] * dimensions.height / preview.clientHeight })
      : moveProfileCrop(dimensions, current, { x: movement[0] / preview.clientWidth, y: movement[1] / preview.clientHeight }))
  }

  const confirm = async () => {
    if (imageState.kind !== 'ready' || pending) return
    setPending(true)
    setError('')
    try {
      const cropped = await exportProfileCrop(imageState.image, position, file.name)
      if (activeRef.current) onConfirm(cropped)
    } catch (cause) {
      if (activeRef.current) setError(cause instanceof Error ? cause.message : '사진을 변환하지 못했습니다. 다시 시도해주세요.')
    } finally {
      if (activeRef.current) setPending(false)
    }
  }

  const cancel = () => {
    activeRef.current = false
    dialogRef.current?.close()
    onCancel()
  }

  return createPortal(
    <dialog aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className={styles.dialog} onCancel={(event) => { event.preventDefault(); cancel() }} ref={dialogRef}>
      <div className={styles.content}>
        <header>
          <h2 className={styles.title} id={`${id}-title`}>{title}</h2>
          <p className={styles.description} id={`${id}-description`}>네모 영역을 움직이거나 모서리를 끌어 사진을 잘라주세요. 방향키로도 조정할 수 있어요.</p>
        </header>
        {imageState.kind === 'ready' && dimensions && crop ? <>
          <div className={styles.preview} ref={previewRef}
            style={{ width: `min(${280 * dimensions.width / Math.max(dimensions.width, dimensions.height)}px, 100%)`, aspectRatio: `${dimensions.width} / ${dimensions.height}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL with crop geometry shared by the canvas export. */}
            <img alt="프로필 사진 미리보기" draggable={false} src={imageState.image.src} />
            <div
            aria-label="프로필 사진 자르기 위치"
            className={styles.guide}
            data-profile-crop-selection=""
            style={{ left: `${crop.x / dimensions.width * 100}%`, top: `${crop.y / dimensions.height * 100}%`, width: `${crop.size / dimensions.width * 100}%`, height: `${crop.size / dimensions.height * 100}%` }}
            onKeyDown={handleKeyDown}
            onLostPointerCapture={() => { dragRef.current = null }}
            onPointerDown={(event) => {
              if (pending || event.button !== 0) return
              const target = event.target instanceof HTMLElement ? event.target.closest<HTMLButtonElement>('[data-crop-corner]') : null
              const focusTarget = target ?? event.currentTarget
              focusTarget.focus()
              event.preventDefault()
              event.currentTarget.setPointerCapture(event.pointerId)
              dragRef.current = { x: event.clientX, y: event.clientY, position, corner: target?.dataset.cropCorner as CropCorner | undefined }
            }}
            onPointerMove={handlePointerMove}
            onPointerCancel={() => { dragRef.current = null }}
            onPointerUp={(event) => {
              dragRef.current = null
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
            }}
            role="group"
            tabIndex={0}
          >
            {corners.map(({ corner, label }) => <button aria-label={label} className={styles.corner} data-crop-corner={corner}
              disabled={pending} key={corner} type="button" />)}
            </div>
          </div>
          <div className={styles.controls}>
            {([
              { key: 'zoom', label: '확대', min: 1, max: 3, value: `${Math.round(position.zoom * 100)}%` },
              { key: 'x', label: '가로 위치', min: 0, max: 1, value: `${Math.round(position.x * 100)}%` },
              { key: 'y', label: '세로 위치', min: 0, max: 1, value: `${Math.round(position.y * 100)}%` },
            ] as const).map((control) => <label className={styles.control} key={control.key}>
              <span>{control.label}</span>
              <input disabled={pending} max={control.max} min={control.min} onChange={(event) => setPosition((current) => ({ ...current, [control.key]: Number(event.target.value) }))} step="0.01" type="range" value={position[control.key]} />
              <output>{control.value}</output>
            </label>)}
          </div>
        </> : imageState.kind === 'loading' ? <p className={styles.loading} role="status">사진을 불러오는 중…</p> : <p className={styles.error} role="alert">{imageState.kind === 'error' ? imageState.message : ''}</p>}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <div className={styles.actions}>
          <Button onClick={cancel} variant="bordered-dark">취소</Button>
          <Button disabled={imageState.kind !== 'ready' || pending} onClick={() => { void confirm() }}>{pending ? '사진 처리 중…' : '적용하기'}</Button>
        </div>
      </div>
    </dialog>,
    document.body,
  )
}
