export type Major = {
  readonly majorId: number
  readonly name: string
}

export type MajorList = {
  readonly majors: readonly Major[]
  readonly numberOfData: number
}

export type MajorAuthInput = {
  readonly accessToken: string
}

export type MajorCreateInput = MajorAuthInput & {
  readonly name: string
}

export type MajorDeleteInput = MajorAuthInput & {
  readonly majorId: number
}

export type MajorListResult =
  | {
      readonly kind: 'success'
      readonly value: MajorList
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type MajorCreateResult =
  | {
      readonly kind: 'success'
      readonly major: Major
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type MajorDeleteResult =
  | {
      readonly kind: 'success'
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
