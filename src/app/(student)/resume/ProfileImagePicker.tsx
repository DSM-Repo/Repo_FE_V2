'use client'

import { useId, useRef, useState } from 'react'

import { Icon } from '@/shared/ui'

import { ProfileImageCropModal } from './ProfileImageCropModal'
import styles from './ResumeEditorSheet.module.css'

type Props = {
  readonly imageUrl: string
  readonly isUploading: boolean
  readonly onUpload?: (file: File) => void
}

export function ProfileImagePicker({ imageUrl, isUploading, onUpload }: Props) {
  const id = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [file, setFile] = useState<File | null>(null)

  return <>
    <input
      accept="image/jpeg,image/png,image/webp"
      className={styles.fileInput}
      id={`${id}-profile-image`}
      onChange={(event) => { setFile(event.target.files?.[0] ?? null); event.target.value = '' }}
      ref={inputRef}
      type="file"
    />
    <button
      aria-busy={isUploading}
      aria-label={imageUrl ? '프로필 이미지 변경' : '프로필 이미지 추가'}
      className={`${styles.profileImageButton} ${imageUrl ? styles.profileImageFilled : ''}`}
      disabled={isUploading || !onUpload}
      onClick={() => inputRef.current?.click()}
      ref={triggerRef}
      type="button"
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- The uploaded URL is provided by the API.
        <img alt="" src={imageUrl} />
      ) : isUploading ? <span>업로드</span> : <Icon name="plus" />}
    </button>
    {file ? <ProfileImageCropModal file={file} onCancel={() => { setFile(null); triggerRef.current?.focus() }} onConfirm={(cropped) => { setFile(null); onUpload?.(cropped) }} /> : null}
  </>
}
