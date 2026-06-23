import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isReservedPortfolioSlug, normalizePortfolioSlug } from '@/shared/lib/portfolioSlug'
import { getSamplePortfolioResume, samplePortfolioResume } from '@/shared/fixtures/examples/publicExamples'
import { PortfolioResumeSheet } from '@/shared/ui'

import styles from '../publicRoute.module.css'

function getPortfolioDisplayName(decodedSlug: string) {
  return decodedSlug === '오혜민' ? samplePortfolioResume.name : decodedSlug
}
type PortfolioPageProps = {
  params: Promise<{
    portfolioSlug: string
  }>
}

export async function generateMetadata({ params }: PortfolioPageProps): Promise<Metadata> {
  const { portfolioSlug } = await params

  if (isReservedPortfolioSlug(portfolioSlug)) {
    notFound()
  }

  const decodedSlug = normalizePortfolioSlug(portfolioSlug)

  const displayName = getPortfolioDisplayName(decodedSlug)

  return {
    title: `${displayName} 포트폴리오`,
    description: `${displayName} 학생의 공개 포트폴리오`,
  }
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { portfolioSlug } = await params

  if (isReservedPortfolioSlug(portfolioSlug)) {
    notFound()
  }

  const decodedSlug = normalizePortfolioSlug(portfolioSlug)
  const displayName = getPortfolioDisplayName(decodedSlug)
  const portfolio = getSamplePortfolioResume(displayName)

  return (
    <main>
      <div className={styles.resumePageShell}>
        <PortfolioResumeSheet {...portfolio} />
      </div>
    </main>
  )
}
