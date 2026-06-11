import { notFound } from 'next/navigation'

import { ComponentPreview } from '@/dev/ComponentPreview'

export default function ComponentPreviewPage() {
  if (process.env.NODE_ENV !== 'development') {
    notFound()
  }

  return <ComponentPreview />
}
