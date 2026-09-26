export type NotificationType = 'FEEDBACK_CREATED'

export type NotificationItem = {
  readonly alramId: string
  readonly content: string
  readonly createdAt: string
  readonly feedbackId?: string
  readonly isRead: boolean
  readonly resumeId?: string
  readonly type: NotificationType
}

export type NotificationAuthInput = {
  readonly accessToken: string
}

export type NotificationReadInput = NotificationAuthInput & {
  readonly alramId: string
}

export type NotificationDeleteInput = NotificationAuthInput & {
  readonly alramId: string
}

export type NotificationListResult =
  | {
      readonly kind: 'success'
      readonly notifications: readonly NotificationItem[]
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type NotificationReadResult =
  | {
      readonly isRead: boolean
      readonly kind: 'success'
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type NotificationDeleteResult =
  | {
      readonly kind: 'success'
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
