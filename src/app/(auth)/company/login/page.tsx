import type { Metadata } from 'next'

import { CompanyCodeLogin } from '@/features/auth/ui'

export const metadata: Metadata = {
  title: '기업 로그인',
}

export default function CompanyLoginPage() {
  return <CompanyCodeLogin />
}
