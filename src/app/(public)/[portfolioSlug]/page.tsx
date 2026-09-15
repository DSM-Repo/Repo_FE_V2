import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { isReservedPortfolioSlug } from '@/shared/lib/portfolioSlug'
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

  notFound()
}

export default async function PortfolioPage({ params }: PortfolioPageProps) {
  const { portfolioSlug } = await params

  if (isReservedPortfolioSlug(portfolioSlug)) {
    notFound()
  }

  notFound()
}
