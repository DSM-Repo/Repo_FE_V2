export type LibraryBookGroup = {
  readonly cohort: number
  readonly date: number
  readonly year: number
}

export type LibraryBookListResult =
  | {
      readonly books: readonly LibraryBookGroup[]
      readonly kind: 'success'
    }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'server-error'
      readonly message: string
    }

export type LibrarySearchInput = {
  readonly date?: number
  readonly keyword?: string
  readonly major?: string
  readonly page?: number
  readonly size?: number
}

export type LibrarySearchStudent = {
  readonly major: string
  readonly studentId: number
  readonly studentName: string
}

export type LibrarySearchResult =
  | {
      readonly kind: 'success'
      readonly students: readonly LibrarySearchStudent[]
      readonly totalElements: number
    }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'server-error'
      readonly message: string
    }

export type LibraryResumeInput = {
  readonly studentId: number
}

export type LibraryResumePage = {
  readonly content: string
  readonly id: string
  readonly index: number
}

export type LibraryResume = {
  readonly cohort: number
  readonly date: number
  readonly email: string
  readonly introduce: string
  readonly majorName: string
  readonly name: string
  readonly pages: readonly LibraryResumePage[]
  readonly portfolioUrl: string
  readonly profileImageUrl: string
  readonly releasedAt: string
  readonly resumeId: string
  readonly studentId: number
  readonly studentNumber: string
  readonly year: number
}

export type LibraryResumeResult =
  | {
      readonly kind: 'success'
      readonly resume: LibraryResume
    }
  | {
      readonly kind: 'configuration-error' | 'network-error' | 'not-found' | 'server-error'
      readonly message: string
    }
