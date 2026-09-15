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
