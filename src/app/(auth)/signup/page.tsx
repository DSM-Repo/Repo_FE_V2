import type { Metadata } from 'next'

import { AuthSignupPage } from '@/features/auth/ui'

export const metadata: Metadata = {
  title: '회원가입',
}

export default function SignupPage() {
  return <AuthSignupPage />
}
