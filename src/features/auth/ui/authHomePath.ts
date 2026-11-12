import type { AuthLoginRole } from '@/features/auth/api'

export const authHomePath = {
  student: '/home',
  teacher: '/students',
  company: '/library',
} as const satisfies Record<AuthLoginRole, string>
