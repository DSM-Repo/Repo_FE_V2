export type AuthLoginRole = 'student' | 'teacher'
export type AuthSignupRole = 'STUDENT'

export type AuthEmailSendInput = {
  readonly email: string
}

export type AuthEmailVerifyInput = {
  readonly code: string
  readonly email: string
}

export type AuthEmailSendResult =
  | {
      readonly kind: 'success'
      readonly message: string
    }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'server-error'
      readonly message: string
    }

export type AuthEmailVerifyResult =
  | {
      readonly kind: 'success'
      readonly message: string
    }
  | {
      readonly kind: 'configuration-error' | 'invalid-code' | 'network-error' | 'server-error'
      readonly message: string
    }

export type AuthLoginInput = {
  readonly email: string
  readonly password: string
}

export type AuthLoginToken = {
  readonly accessToken: string
  readonly refreshToken: string
  readonly tokenType: string
}

export type AuthLoginResult =
  | {
      readonly kind: 'success'
      readonly message: string
      readonly token: AuthLoginToken
    }
  | {
      readonly kind: 'configuration-error' | 'invalid-credentials' | 'network-error' | 'server-error'
      readonly message: string
    }

export type AuthRefreshInput = {
  readonly refreshToken: string
}

export type AuthRefreshToken = {
  readonly accessToken: string
}

export type AuthRefreshResult =
  | {
      readonly kind: 'success'
      readonly message: string
      readonly token: AuthRefreshToken
    }
  | {
      readonly kind: 'configuration-error' | 'invalid-refresh-token' | 'network-error' | 'server-error'
      readonly message: string
    }

export type AuthSignupInput = {
  readonly email: string
  readonly password: string
  readonly role: AuthSignupRole
  readonly studentClass: number
  readonly studentGrade: number
  readonly studentName: string
  readonly studentNumber: number
}

export type AuthSignupResult =
  | {
      readonly kind: 'success'
      readonly message: string
    }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'server-error'
      readonly message: string
    }
