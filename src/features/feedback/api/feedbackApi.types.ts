export type FeedbackCreateInput = {
  readonly accessToken: string
  readonly comment: string
  readonly documentId: string
  readonly pageId: string
  readonly x: number
  readonly y: number
}

export type FeedbackCreate = {
  readonly createdAt: string
  readonly feedbackId: string
  readonly pageId: string
  readonly x: number
  readonly y: number
}

export type FeedbackCreateResult =
  | ({
      readonly kind: 'success'
    } & FeedbackCreate)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
