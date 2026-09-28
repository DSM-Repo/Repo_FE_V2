import type { ReactNode } from 'react'

import { AuthRoleGuard } from '@/features/auth/ui'

type TeacherLayoutProps = {
  readonly children: ReactNode
}

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return <AuthRoleGuard requiredRole="teacher">{children}</AuthRoleGuard>
}
