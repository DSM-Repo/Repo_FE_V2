export type ResumePage = {
  readonly content: string
  readonly id: string
  readonly index: number
}

export type Resume = {
  readonly id: string
  readonly introduce: string
  readonly isPublic: boolean
  readonly majorName: string
  readonly name: string
  readonly pages: readonly ResumePage[]
  readonly portfolioUrl: string
  readonly profileImageUrl: string
  readonly savedAt: string
  readonly submissionStatus: string
}

export type ResumeDetailInput = {
  readonly accessToken: string
  readonly resumeId: string
}

export type ResumeDetailResult =
  | {
      readonly kind: 'success'
      readonly resume: Resume
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'not-found' | 'server-error'
      readonly message: string
    }
