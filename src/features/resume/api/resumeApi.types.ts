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

export type ResumeVisibilityInput = {
  readonly accessToken: string
  readonly isPublic: boolean
}

export type ResumeSubmissionInput = {
  readonly accessToken: string
}

export type ResumeVisibility = {
  readonly isPublic: boolean
}

export type ResumeSubmission = {
  readonly resumeId: string
  readonly submissionStatus: string
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

export type ResumeVisibilityResult =
  | ({
      readonly kind: 'success'
    } & ResumeVisibility)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type ResumeSubmissionResult =
  | ({
      readonly kind: 'success'
    } & ResumeSubmission)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
