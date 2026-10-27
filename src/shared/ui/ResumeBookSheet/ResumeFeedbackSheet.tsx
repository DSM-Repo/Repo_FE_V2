'use client'

import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

import { FEEDBACK_PAGE_WIDTH } from '@/shared/lib/feedbackPosition'

import { ResumeBookSheet, type ResumeBookSheetProps } from './ResumeBookSheet'
import styles from './ResumeFeedbackSheet.module.css'

export function ResumeFeedbackSheet({ className, ...props }: ResumeBookSheetProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const updateScale = () => setScale(viewport.getBoundingClientRect().width / FEEDBACK_PAGE_WIDTH)
    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={[className, styles.viewport].filter(Boolean).join(' ')}
      ref={viewportRef}
      style={{ '--resume-feedback-scale': scale } as CSSProperties}
    >
      <ResumeBookSheet {...props} className={styles.document} />
    </div>
  )
}
