export type Major = {
  readonly createdAt?: string
  readonly majorId: number
  readonly name: string
}

export type MajorStudent = {
  readonly classNumber?: number
  readonly grade: number
  readonly name: string
  readonly number?: number
  readonly resumeId?: string
  readonly schoolNumber: string
  readonly submissionStatus?: 'DELETED' | 'ONGOING' | 'RELEASED' | 'SUBMITTED'
  readonly submitted?: boolean
  readonly submittedAt?: string
  readonly studentId: number
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

export type MajorStudentList = {
  readonly classNumber?: number
  readonly grade?: number
  readonly majorId: number
  readonly majorName: string
  readonly numberOfData: number
  readonly students: readonly MajorStudent[]
}

export type MajorStudentsInput = MajorAuthInput & {
  readonly classNumber?: number
  readonly grade?: number
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

export type MajorStudentListResult =
  | {
      readonly kind: 'success'
      readonly value: MajorStudentList
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
