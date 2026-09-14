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

export type FeedbackUpdateInput = {
  readonly accessToken: string
  readonly comment: string
  readonly feedbackId: string
  readonly pageId: string
  readonly x: number
  readonly y: number
}

export type FeedbackDetailInput = {
  readonly accessToken: string
  readonly feedbackId: string
}

export type FeedbackDeleteInput = FeedbackDetailInput

export type FeedbackListInput = {
  readonly accessToken: string
  readonly documentId: string
  readonly pageId?: string
}

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

export type FeedbackUpdate = {
  readonly content: string
  readonly id: string
  readonly pageId: string
  readonly teacherName: string
  readonly updatedAt: string
  readonly x: number
  readonly y: number
}

export type FeedbackDetail = {
  readonly content: string
  readonly createdAt: string
  readonly feedbackId: string
  readonly pageDeleted: boolean
  readonly pageId: string
  readonly status: string
  readonly x: number
  readonly y: number
}

export type FeedbackListItem = FeedbackDetail & {
  readonly completedAt: string
  readonly teacherName: string
}

export type FeedbackList = {
  readonly feedbacks: readonly FeedbackListItem[]
  readonly numberOfData: number
}

export type FeedbackDelete = {
  readonly message: string
}

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

export type FeedbackUpdateResult =
  | ({
      readonly kind: 'success'
    } & FeedbackUpdate)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type FeedbackDetailResult =
  | ({
      readonly kind: 'success'
    } & FeedbackDetail)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'not-found' | 'server-error'
      readonly message: string
    }

export type FeedbackListResult =
  | ({
      readonly kind: 'success'
    } & FeedbackList)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type FeedbackDeleteResult =
  | ({
      readonly kind: 'success'
    } & FeedbackDelete)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
