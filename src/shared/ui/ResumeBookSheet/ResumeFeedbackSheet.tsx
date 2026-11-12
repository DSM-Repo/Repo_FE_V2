'use client'

import { useLayoutEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'

import { ResumeBookSheet, type ResumeBookSheetProps } from './ResumeBookSheet'
import styles from './ResumeFeedbackSheet.module.css'

export function ResumeDocumentViewport({ className, pagesPerSpread = 2, children }: { readonly className?: string; readonly pagesPerSpread?: number; readonly children: ReactNode }) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [layout, setLayout] = useState({ width: 864 * 551 / 780, scale: 1 })

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const container = viewport.closest<HTMLElement>('[data-resume-viewport]')
    const heightContainer = viewport.closest<HTMLElement>('[data-resume-height]')
    const document = viewport.firstElementChild as HTMLElement | null
    if (!container || !document) return
    let active = true
    const fonts = viewport.ownerDocument.fonts
    const resumeFont = '16px "Repo Resume Pretendard"'
    const sample = '이력서'
    const isFontPending = !fonts.check(resumeFont, sample)
    viewport.inert = isFontPending
    viewport.setAttribute('aria-busy', String(isFontPending))
    if (isFontPending) {
      const finishFontLoad = () => {
        if (active) {
          viewport.inert = false
          viewport.setAttribute('aria-busy', 'false')
        }
      }
      void fonts.load(resumeFont, sample).then(finishFontLoad, finishFontLoad)
    }

    const updateLayout = () => {
      const headerHeight = parseFloat(getComputedStyle(viewport).getPropertyValue('--repo-size-header-min-height')) || 64
      const narrow = window.innerWidth <= 980
      const reservedHeight = window.innerWidth <= 760 ? 384 : 140
      const availableHeight = Math.min(
        window.innerHeight - headerHeight - reservedHeight,
        heightContainer ? heightContainer.clientHeight - (window.innerWidth <= 760 ? 41 : 0) : Infinity,
      )
      const availableWidth = Math.min(container.clientWidth, window.innerWidth - (narrow ? 48 : 176), 1380)
      const navigationWidth = parseFloat(getComputedStyle(container).getPropertyValue('--resume-navigation-width'))
      const horizontalSpace = Number.isFinite(navigationWidth) ? navigationWidth + (pagesPerSpread === 1 ? 0 : 20) : pagesPerSpread === 1 ? 0 : 148
      const documentWidth = parseFloat(getComputedStyle(document).width)
      const documentHeight = parseFloat(getComputedStyle(document).height)
      const width = Math.max(1, Math.min(
        documentWidth,
        (availableWidth - horizontalSpace) / pagesPerSpread,
        availableHeight * documentWidth / documentHeight,
      ))
      const scale = width / documentWidth
      setLayout((current) => Math.abs(current.width - width) < 0.01 ? current : { width, scale })
    }
    updateLayout()
    const observer = new ResizeObserver(updateLayout)
    observer.observe(container)
    if (heightContainer) observer.observe(heightContainer)
    window.addEventListener('resize', updateLayout)
    return () => {
      active = false
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
      {children}
    </div>
  )
}

export function ResumeFeedbackSheet({ className, pagesPerSpread = 2, ...props }: ResumeBookSheetProps & { readonly pagesPerSpread?: number }) {
  return <ResumeDocumentViewport className={className} pagesPerSpread={pagesPerSpread}><ResumeBookSheet {...props} className={styles.document} /></ResumeDocumentViewport>
}
