'use client'

import { useEffect } from 'react'

const MOTION_ROOT_SELECTOR = '[data-landing-root]'
const MOTION_TARGET_SELECTOR = '[data-landing-motion]'

export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(MOTION_ROOT_SELECTOR)
    const targets = Array.from(document.querySelectorAll<HTMLElement>(MOTION_TARGET_SELECTOR))

    if (!root || targets.length === 0) {
      return
    }

    root.dataset.motionReady = 'true'

    const reveal = (target: HTMLElement) => {
      target.dataset.landingMotionState = 'visible'
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      targets.forEach(reveal)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          const target = entry.target

          if (target instanceof HTMLElement) {
            reveal(target)
            observer.unobserve(target)
          }
        })
      },
      {
        rootMargin: '0px 0px -10% 0px',
        threshold: 0.05,
      },
    )

    targets.forEach((target) => observer.observe(target))

    return () => observer.disconnect()
  }, [])

  return null
}
