'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import { clearAuthTokens, getSavedAuthRole, type AuthLoginRole } from '@/features/auth/api'

type AuthRoleGuardProps = {
  readonly children: ReactNode
  readonly requiredRole: AuthLoginRole
}

const roleHomePath = {
  student: '/home',
  teacher: '/students',
} as const satisfies Record<AuthLoginRole, string>

export function AuthRoleGuard({ children, requiredRole }: AuthRoleGuardProps) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    let isActive = true

    const authorize = async () => {
      await Promise.resolve()

      if (!isActive) {
        return
      }

      const role = getSavedAuthRole()

      if (!role) {
        clearAuthTokens()
        router.replace('/login')
        return
      }

      if (role !== requiredRole) {
        router.replace(roleHomePath[role])
        return
      }

      setIsAuthorized(true)
    }

    void authorize()

    return () => {
      isActive = false
    }
  }, [requiredRole, router])

  return isAuthorized ? children : null
}
