import { LibraryPageContent } from './LibraryPageContent'

type LibraryPageProps = {
  readonly searchParams?: Promise<{
    readonly error?: string
  }>
}

export default async function LibraryPage({ searchParams }: LibraryPageProps) {
  const params = await searchParams
  const showsLoadError = params?.error === 'portfolio'

  return <LibraryPageContent showsLoadError={showsLoadError} />
}
