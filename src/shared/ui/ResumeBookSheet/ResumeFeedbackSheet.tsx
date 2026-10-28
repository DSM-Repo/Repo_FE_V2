'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import { ResumeBookSheet, type ResumeBookSheetProps } from './ResumeBookSheet'
import styles from './ResumeFeedbackSheet.module.css'

export function ResumeFeedbackSheet({ className, pagesPerSpread = 2, ...props }: ResumeBookSheetProps & { readonly pagesPerSpread?: number }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ width: 864 * 551 / 780, scale: 1 })

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const container = viewport.closest<HTMLElement>('[data-resume-viewport]')
    const document = viewport.firstElementChild as HTMLElement | null
    if (!container || !document) return

    const updateLayout = () => {
      const headerHeight = parseFloat(getComputedStyle(viewport).getPropertyValue('--repo-size-header-min-height')) || 64
      const narrow = window.innerWidth <= 980
      const reservedHeight = window.innerWidth <= 760 ? 384 : 140
      const availableWidth = Math.min(container.clientWidth, window.innerWidth - (narrow ? 48 : 176), 1380)
      const documentWidth = parseFloat(getComputedStyle(document).width)
      const documentHeight = parseFloat(getComputedStyle(document).height)
      const width = Math.max(1, Math.min(
        documentWidth,
        (availableWidth - (pagesPerSpread === 1 ? 0 : 148)) / pagesPerSpread,
        (window.innerHeight - headerHeight - reservedHeight) * documentWidth / documentHeight,
      ))
      const scale = width / documentWidth
      setLayout((current) => Math.abs(current.width - width) < 0.01 ? current : { width, scale })
    }
    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(container)
    window.addEventListener('resize', updateLayout)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateLayout)
    }
  }, [pagesPerSpread])

  return (
    <div
      className={[className, styles.viewport].filter(Boolean).join(' ')}
      ref={viewportRef}
      style={{ width: layout.width, flexBasis: layout.width, '--resume-feedback-scale': layout.scale } as CSSProperties}
    >
      <ResumeBookSheet {...props} className={styles.document} />
    </div>
  )
}
