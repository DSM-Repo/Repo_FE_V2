'use client'

export function clearLegacyLibraryCache() {
  if (typeof window === 'undefined') {
    return
  }

  for (const key of [
    'repo.library.recentResumes',
    'repo.library.recentStudents',
    'repo.library.recentGroups',
    'repo.resume.visibilityOverrides',
  ]) {
    window.localStorage.removeItem(key)
  }
}
