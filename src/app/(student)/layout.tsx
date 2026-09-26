import type { ReactNode } from 'react'

import { AuthRoleGuard } from '@/features/auth/ui'

type StudentLayoutProps = {
  readonly children: ReactNode
}

export default function StudentLayout({ children }: StudentLayoutProps) {
  return <AuthRoleGuard requiredRole="student">{children}</AuthRoleGuard>
}
