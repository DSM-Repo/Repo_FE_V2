'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import {
  getAuthorizedRole,
  isCurrentAuthSession,
  type AuthLoginRole,
} from '@/features/auth/api'
import { Button, Toast } from '@/shared/ui'

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
  const [attempt, setAttempt] = useState(0)
  const [retryMessage, setRetryMessage] = useState<string>()

  useEffect(() => {
    let isActive = true

    const authorize = async () => {
      await Promise.resolve()

      if (!isActive) {
        return
      }

      setIsAuthorized(false)
      setRetryMessage(undefined)
      const result = await getAuthorizedRole()

      if (!isActive) {
        return
      }

      if (!isCurrentAuthSession(result.session) || result.kind === 'stale') {
        setAttempt((value) => value + 1)
        return
      }

      switch (result.kind) {
        case 'invalid':
          router.replace('/login')
          return
        case 'retryable':
          setRetryMessage(result.message)
          return
        case 'authorized':
          if (result.role !== requiredRole) {
            router.replace(roleHomePath[result.role])
            return
          }
          setIsAuthorized(true)
      }
    }

    void authorize()

    return () => {
      isActive = false
    }
  }, [attempt, requiredRole, router])

  if (retryMessage) {
    return (
      <div>
        <Toast variant="error">{retryMessage}</Toast>
        <Button onClick={() => { setRetryMessage(undefined); setAttempt((value) => value + 1) }}>다시 시도</Button>
      </div>
    )
  }

  return isAuthorized ? children : null
}
