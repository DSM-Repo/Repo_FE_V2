export type HistoryAuthInput = {
  readonly accessToken: string
}

export type HistoryItem = {
  readonly content: string
  readonly date: string
  readonly historyId: string
}

export type HistoryMutationInput = HistoryAuthInput & {
  readonly content: string
  readonly date: string
}

export type HistoryUpdateInput = HistoryMutationInput & {
  readonly historyId: string
}

export type HistoryDeleteInput = HistoryAuthInput & {
  readonly historyId: string
}

export type HistoryListResult =
  | {
      readonly histories: readonly HistoryItem[]
      readonly kind: 'success'
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type HistoryMutationResult =
  | ({
      readonly kind: 'success'
    } & HistoryItem)
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }

export type HistoryDeleteResult =
  | {
      readonly kind: 'success'
    }
  | {
      readonly kind: 'configuration-error' | 'forbidden' | 'network-error' | 'server-error'
      readonly message: string
    }
