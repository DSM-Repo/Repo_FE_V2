export type ResumePageType = 'PROFILE' | 'PROJECT'

export type ResumeProject = {
  readonly endDate: string
  readonly imageUrl: string
  readonly name: string
  readonly startDate: string
  readonly summary: string
}

export type ResumePage = {
  readonly content: string
  readonly id: string
  readonly index: number
  readonly project?: ResumeProject
  readonly type: ResumePageType
}

export type Resume = {
  readonly email: string
  readonly id: string
  readonly introduce: string
  readonly isPublic: boolean
  readonly majorName: string
  readonly name: string
  readonly pages: readonly ResumePage[]
  readonly portfolioUrl: string
  readonly profileImageUrl: string
  readonly savedAt: string
  readonly skills: readonly string[]
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

export type ResumeSaveInput = {
  readonly accessToken: string
  readonly email: string
  readonly introduce: string
  readonly pages: readonly ResumePage[]
  readonly portfolioUrl: string
  readonly skills: readonly string[]
}

export type ResumeAutoSaveInput = {
  readonly accessToken: string
  readonly pages: readonly ResumePage[]
}

export type ResumeSubmissionInput = {
  readonly accessToken: string
}

export type ResumeStudentStatusListInput = {
  readonly accessToken: string
  readonly classNumber?: number
  readonly grade?: number
}

export type ResumeVisibility = {
  readonly isPublic: boolean
}

export type ResumeSubmission = {
  readonly resumeId: string
  readonly submissionStatus: string
}

export type ResumeSave = {
  readonly resumeId: string
  readonly savedAt: string
}

export type ResumeAutoSave = ResumeSave & {
  readonly autoSaved: boolean
}

export type ResumeSubmissionStatus = 'DELETED' | 'ONGOING' | 'RELEASED' | 'SUBMITTED'

export type ResumeStudentStatus = {
  readonly classNumber: number
  readonly grade: number
  readonly majorName: string
  readonly name: string
  readonly number: number
  readonly resumeId?: string
  readonly schoolNumber: string
  readonly studentId: number
  readonly submissionStatus: ResumeSubmissionStatus
  readonly submitted: boolean
  readonly submittedAt?: string
}

export type ResumeStudentStatusListResult =
  | {
      readonly classNumber: number | undefined
      readonly grade: number | undefined
      readonly kind: 'success'
      readonly lastUpdatedAt: string
      readonly numberOfData: number
      readonly schoolYear: number | undefined
      readonly students: readonly ResumeStudentStatus[]
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
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

export type ResumeSaveResult =
  | ({
      readonly kind: 'success'
    } & ResumeSave)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type ResumeAutoSaveResult =
  | ({
      readonly kind: 'success'
    } & ResumeAutoSave)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
