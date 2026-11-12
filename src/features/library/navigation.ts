import { getAuthRoleFromAccessToken } from '@/features/auth/api'
import { teacherNavigationItems } from '@/features/teacher/navigation'
import type { AppHeaderItem } from '@/shared/ui'

const libraryItem = { href: '/library', label: '도서관', value: 'library' } satisfies AppHeaderItem
const libraryNavigationItems = [libraryItem]
const studentNavigationItems = [
  { href: '/home', label: '홈', value: 'home' },
  { href: '/resume', label: '이력서 관리', value: 'resume' },
  libraryItem,
] satisfies readonly AppHeaderItem[]

export function getLibraryNavigationItems(accessToken: string | undefined): readonly AppHeaderItem[] {
  const role = accessToken ? getAuthRoleFromAccessToken(accessToken, { ignoreExpiration: true }) : undefined

  switch (role) {
    case 'teacher':
      return teacherNavigationItems
    case 'student':
      return studentNavigationItems
    default:
      return libraryNavigationItems
  }
}
