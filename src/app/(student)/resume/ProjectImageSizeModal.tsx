'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { DEFAULT_PROJECT_IMAGE_SIZE, type ProjectImageSize } from '@/shared/lib/projectImageSize'
import { Button } from '@/shared/ui'

import { ProjectImageSizeControls } from './ProjectImageSizeControls'
import modalStyles from './ProfileImageCropModal.module.css'
import styles from './ProjectImageSizeModal.module.css'

type ImageState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly url: string }
  | { readonly kind: 'error'; readonly message: string }

export function ProjectImageSizeModal({ file, initialSize, onCancel, onConfirm }: {
  readonly file: File
  readonly initialSize?: ProjectImageSize
  readonly onCancel: () => void
  readonly onConfirm: (size: ProjectImageSize | undefined) => void
}) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const validationMessage = file.size === 0 ? '업로드할 이미지가 없습니다.'
    : file.size > 50 * 1024 * 1024 ? '이미지는 50MB 이하만 업로드할 수 있습니다.'
    : !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? 'JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.' : ''
  const [image, setImage] = useState<ImageState>(() => validationMessage ? { kind: 'error', message: validationMessage } : { kind: 'loading' })
  const [size, setSize] = useState(initialSize)

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    if (validationMessage) return () => dialog?.close()
    const url = URL.createObjectURL(file)
    const preview = new Image()
    let active = true
    preview.onload = () => { if (active) setImage({ kind: 'ready', url }) }
    preview.onerror = () => { if (active) setImage({ kind: 'error', message: '이미지를 읽지 못했습니다. JPG, PNG 또는 WebP 이미지를 선택해주세요.' }) }
    preview.src = url
    return () => {
      active = false
      preview.onload = null
      preview.onerror = null
      URL.revokeObjectURL(url)
      dialog?.close()
    }
  }, [file, validationMessage])

  const cancel = () => {
    dialogRef.current?.close()
    onCancel()
  }

  return createPortal(
    <dialog aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} className={modalStyles.dialog}
      onCancel={event => { event.preventDefault(); cancel() }} ref={dialogRef}>
      <div className={modalStyles.content}>
        <header>
          <h2 className={modalStyles.title} id={`${id}-title`}>프로젝트 이미지 크기 조절</h2>
          <p className={modalStyles.description} id={`${id}-description`}>이력서에 표시할 가로·세로 크기를 정해주세요. 원본 이미지는 찌그러지지 않아요.</p>
        </header>
        {image.kind === 'ready' ? <>
          <div className={styles.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Local object URL is released when the dialog closes. */}
            <img alt="프로젝트 이미지 미리보기" src={image.url}
              style={{ width: size?.width ?? DEFAULT_PROJECT_IMAGE_SIZE, height: size?.height ?? DEFAULT_PROJECT_IMAGE_SIZE }} />
          </div>
          <ProjectImageSizeControls inline size={size} onChange={setSize} />
        </> : image.kind === 'loading'
          ? <p className={modalStyles.loading} role="status">이미지를 불러오는 중…</p>
          : <p className={modalStyles.error} role="alert">{image.message}</p>}
        <div className={modalStyles.actions}>
          <Button onClick={cancel} variant="bordered-dark">취소</Button>
          <Button disabled={image.kind !== 'ready'} onClick={() => {
            if (image.kind !== 'ready') return
            dialogRef.current?.close()
            onConfirm(size)
          }}>적용하기</Button>
        </div>
      </div>
    </dialog>,
    document.body,
  )
}
