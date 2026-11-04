'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import {
  MIN_MARKDOWN_IMAGE_SIZE,
  MAX_MARKDOWN_IMAGE_WIDTH,
  MAX_MARKDOWN_IMAGE_HEIGHT,
  type ResumeMarkdownImageSize,
} from '@/shared/lib/resumeMarkdownImageSize'
import { Button } from '@/shared/ui'

import modalStyles from './ProfileImageCropModal.module.css'
import styles from './MarkdownImageSizeDialog.module.css'

export type MarkdownImagePreview = {
  readonly src: string
  readonly width: number
  readonly height: number
  readonly naturalWidth: number
  readonly naturalHeight: number
}

export function MarkdownImageSizeDialog({ image, onCancel, onConfirm }: {
  readonly image: MarkdownImagePreview
  readonly onCancel: () => void
  readonly onConfirm: (size: ResumeMarkdownImageSize | undefined) => void
}) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [width, setWidth] = useState(String(image.width || 128))
  const [height, setHeight] = useState(String(image.height || 128))
  const [isDefault, setIsDefault] = useState(false)
  const dimension = (raw: string, max: number) => Math.min(max, Math.max(MIN_MARKDOWN_IMAGE_SIZE, Math.round(Number(raw) || MIN_MARKDOWN_IMAGE_SIZE)))
  const size = { width: dimension(width, MAX_MARKDOWN_IMAGE_WIDTH), height: dimension(height, MAX_MARKDOWN_IMAGE_HEIGHT) }
  const reset = () => {
    const naturalWidth = image.naturalWidth || 128
    const naturalHeight = image.naturalHeight || 128
    const scale = Math.min(1, MAX_MARKDOWN_IMAGE_WIDTH / naturalWidth, 128 / naturalHeight)
    setWidth(String(Math.round(naturalWidth * scale)))
    setHeight(String(Math.round(naturalHeight * scale)))
    setIsDefault(true)
  }

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])

  const cancel = () => {
    dialogRef.current?.close()
    onCancel()
  }

  return createPortal(
    <dialog aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className={modalStyles.dialog}
      onCancel={event => { event.preventDefault(); cancel() }} ref={dialogRef}>
      <div className={modalStyles.content}>
        <header>
          <h2 className={modalStyles.title} id={`${id}-title`}>본문 이미지 크기 조절</h2>
          <p className={modalStyles.description} id={`${id}-description`}>이력서에 표시할 크기를 정해주세요. 원본 이미지 비율은 유지됩니다.</p>
        </header>
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Preview uses the same image URL already displayed in the document. */}
          <img alt="본문 이미지 미리보기" src={image.src} data-default={isDefault || undefined} style={isDefault ? undefined : size} />
        </div>
        <div className={styles.controls}>
          <label>가로 (px)
            <input aria-label="본문 이미지 가로" type="number" min={MIN_MARKDOWN_IMAGE_SIZE} max={MAX_MARKDOWN_IMAGE_WIDTH}
              value={width} onChange={event => { setWidth(event.target.value); setIsDefault(false) }} onBlur={() => setWidth(String(size.width))} />
          </label>
          <label>세로 (px)
            <input aria-label="본문 이미지 세로" type="number" min={MIN_MARKDOWN_IMAGE_SIZE} max={MAX_MARKDOWN_IMAGE_HEIGHT}
              value={height} onChange={event => { setHeight(event.target.value); setIsDefault(false) }} onBlur={() => setHeight(String(size.height))} />
          </label>
          <p>가로 24–512px · 세로 24–640px</p>
          <button type="button" onClick={reset}>기본 크기로</button>
        </div>
        <div className={modalStyles.actions}>
          <Button variant="bordered-dark" onClick={cancel}>취소</Button>
          <Button onClick={() => { dialogRef.current?.close(); onConfirm(isDefault ? undefined : size) }}>적용하기</Button>
        </div>
      </div>
    </dialog>, document.body,
  )
}
