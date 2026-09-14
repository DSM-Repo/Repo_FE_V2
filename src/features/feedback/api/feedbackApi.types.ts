export type FeedbackCreateInput = {
  readonly accessToken: string
  readonly comment: string
  readonly documentId: string
  readonly pageId: string
  readonly x: number
  readonly y: number
}

export type FeedbackApplyInput = {
  readonly accessToken: string
  readonly applied: boolean
  readonly feedbackIds: readonly string[]
}

export type FeedbackCompleteInput = {
  readonly accessToken: string
  readonly feedbackId: string
}

export type FeedbackPendingInput = FeedbackCompleteInput

export type FeedbackCreate = {
  readonly createdAt: string
  readonly feedbackId: string
  readonly pageId: string
  readonly x: number
  readonly y: number
}

export type FeedbackApplyFailure = {
  readonly feedbackId: string
  readonly reason: string
}

export type FeedbackApply = {
  readonly failed: readonly FeedbackApplyFailure[]
  readonly successCount: number
}

export type FeedbackComplete = {
  readonly feedbackId: string
  readonly status: string
}

export type FeedbackPending = FeedbackComplete

export type FeedbackCreateResult =
  | ({
      readonly kind: 'success'
    } & FeedbackCreate)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type FeedbackApplyResult =
  | ({
      readonly kind: 'success'
    } & FeedbackApply)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type FeedbackCompleteResult =
  | ({
      readonly kind: 'success'
    } & FeedbackComplete)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type FeedbackPendingResult =
  | ({
      readonly kind: 'success'
    } & FeedbackPending)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
