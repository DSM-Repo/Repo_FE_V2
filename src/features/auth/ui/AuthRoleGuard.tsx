'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  clearAuthTokens,
  getSavedAuthRole,
  getSavedRefreshToken,
  refreshAuthToken,
  saveAuthAccessToken,
  type AuthLoginRole,
} from '@/features/auth/api'

type AuthRoleGuardProps = {
  readonly children: ReactNode
  readonly requiredRole: AuthLoginRole
}

const roleHomePath = {
  student: '/home',
  teacher: '/students',
} as const satisfies Record<AuthLoginRole, string>

async function getAuthorizedRole() {
  const savedRole = getSavedAuthRole()

  if (savedRole) {
    return savedRole
  }

  const refreshToken = getSavedRefreshToken()

  if (!refreshToken) {
    return undefined
  }

  const refreshResult = await refreshAuthToken({ refreshToken })

  if (refreshResult.kind !== 'success') {
    return undefined
  }

  saveAuthAccessToken(refreshResult.token.accessToken)

  return getSavedAuthRole()
}

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

      const role = await getAuthorizedRole()

      if (!isActive) {
        return
      }

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
