import type { Metadata } from 'next'

import { AuthLoginPage } from '@/features/auth/ui'

export const metadata: Metadata = {
  title: '로그인',
}

export default function LoginPage() {
  return <AuthLoginPage />
}
