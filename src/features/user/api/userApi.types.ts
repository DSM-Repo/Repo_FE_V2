export type UserClassInfo = {
  readonly classNumber: number
  readonly grade: number
  readonly number: number
  readonly schoolNumber: string
}

export type UserProgressSection = {
  readonly completed: boolean
  readonly key: string
  readonly name: string
}

export type UserProgress = {
  readonly sections: readonly UserProgressSection[]
  readonly totalPercent: number
}

export type UserMe = {
  readonly classInfo: UserClassInfo
  readonly introduce: string
  readonly major: string | null
  readonly name: string
  readonly profileImageUrl: string | null
  readonly progress: UserProgress
}

export type UserMeInput = {
  readonly accessToken: string
}

export type UserMajorUpdateInput = UserMeInput & {
  readonly majorId: number
}

export type UserMeResult =
  | {
      readonly kind: 'success'
      readonly user: UserMe
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type UserMajorUpdateResult =
  | {
      readonly kind: 'success'
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
