import type { Metadata } from 'next'
import './globals.css'
import '@/shared/styles/colors.css'
import '@/shared/styles/typography.css'

export const metadata: Metadata = {
  title: {
    default: 'Repo',
    template: '%s | Repo',
  },
  description: '대덕소프트마이스터고 학생을 위한 이력서/포트폴리오 관리 플랫폼',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
