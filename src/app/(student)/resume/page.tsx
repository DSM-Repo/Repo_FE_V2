import { Suspense } from 'react'

import { StudentResumePageContent } from './StudentResumePageContent'
import styles from './page.module.css'

export default function StudentResumePage() {
  return (
    <Suspense fallback={<main className={styles.page} />}>
      <StudentResumePageContent />
    </Suspense>
  )
}
