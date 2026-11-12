import type { AppHeaderItem } from '@/shared/ui'

export const teacherNavigationItems = [
  { href: '/majors', label: '전공 관리', value: 'majors' },
  { href: '/students', label: '학생 관리', value: 'students' },
  { href: '/companies', label: '기업 계정 관리', value: 'companies' },
  { href: '/library', label: '도서관', value: 'library' },
] satisfies readonly AppHeaderItem[]
