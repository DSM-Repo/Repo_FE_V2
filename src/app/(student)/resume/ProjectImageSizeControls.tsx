'use client'

import { useState, type FocusEvent, type KeyboardEvent } from 'react'

import {
  DEFAULT_PROJECT_IMAGE_SIZE,
  MAX_PROJECT_IMAGE_SIZE,
  MIN_PROJECT_IMAGE_SIZE,
  type ProjectImageSize,
} from '@/shared/lib/projectImageSize'

import styles from './ResumeEditorSheet.module.css'

export function ProjectImageSizeControls({ size, onChange }: {
  readonly size?: ProjectImageSize
  readonly onChange: (size: ProjectImageSize | undefined) => void
}) {
  const width = size?.width ?? DEFAULT_PROJECT_IMAGE_SIZE
  const height = size?.height ?? DEFAULT_PROJECT_IMAGE_SIZE
  const [widthInput, setWidthInput] = useState(String(width))
  const [heightInput, setHeightInput] = useState(String(height))

  const commit = (axis: 'width' | 'height', event: FocusEvent<HTMLInputElement>) => {
    const raw = event.target.valueAsNumber
    const fallback = axis === 'width' ? width : height
    const value = Number.isFinite(raw)
      ? Math.min(MAX_PROJECT_IMAGE_SIZE, Math.max(MIN_PROJECT_IMAGE_SIZE, Math.round(raw)))
      : fallback
    if (axis === 'width') setWidthInput(String(value))
    else setHeightInput(String(value))
    if (value !== fallback) onChange({ width, height, [axis]: value })
  }
  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    event.currentTarget.blur()
  }

  return (
    <details className={styles.projectImageSize} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.currentTarget.open = false
        event.currentTarget.querySelector('summary')?.focus()
      }
    }}>
      <summary>이미지 크기</summary>
      <div className={styles.projectImageSizePanel}>
        <label>
          가로 (px)
          <input aria-label="프로젝트 이미지 가로" type="number" min={MIN_PROJECT_IMAGE_SIZE} max={MAX_PROJECT_IMAGE_SIZE}
            step={1} value={widthInput} onChange={(event) => setWidthInput(event.target.value)}
            onBlur={(event) => commit('width', event)} onKeyDown={commitOnEnter} />
        </label>
        <label>
          세로 (px)
          <input aria-label="프로젝트 이미지 세로" type="number" min={MIN_PROJECT_IMAGE_SIZE} max={MAX_PROJECT_IMAGE_SIZE}
            step={1} value={heightInput} onChange={(event) => setHeightInput(event.target.value)}
            onBlur={(event) => commit('height', event)} onKeyDown={commitOnEnter} />
        </label>
        <span>{MIN_PROJECT_IMAGE_SIZE}–{MAX_PROJECT_IMAGE_SIZE}px · 원본 비율 유지</span>
        <button type="button" onClick={() => {
          setWidthInput(String(DEFAULT_PROJECT_IMAGE_SIZE))
          setHeightInput(String(DEFAULT_PROJECT_IMAGE_SIZE))
          onChange(undefined)
        }}>기본 크기로</button>
      </div>
    </details>
  )
}
