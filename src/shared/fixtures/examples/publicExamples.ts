import type { InternalHref } from '@/shared/lib/internalHref'

export const samplePortfolioHref = '/오혜민' satisfies InternalHref
export const sampleResumeBookHref = '/resume-books/sample' satisfies InternalHref

export const samplePortfolioResume = {
  name: '홍길동',
  majorStatus: '전공미정',
  headline: '안녕하세요 저는 디자이너가 되고 싶은 인간입니다',
  intro:
    '새벽잠실너무 졸립니다. 밀 적지.. 한줄소개는 이런식으로 쭉쭉 들어갑니다.\n줄넘김 가능합니다. 자기소개자기소개자기소개까지 소개까지 소개까지소개까지... 최대 4줄이면 충분하겠지만..\n줄이 이런식으로\n길어지면 폼도 자동으로 늘어납니다.',
  studentNumber: '2415',
  department: '인공지능소프트웨어과',
  email: 'mare2mare6@gmail.com',
  skills: ['Figma', 'illustrator', 'photoshop'],
  activities: [
    { dateLabel: '2025.12.25', description: '제 1회 SCSC 온라인 해커톤 2위' },
    { dateLabel: '2025.07.18', description: '2025 교내 해커톤 우수상' },
  ],
}

export function getSamplePortfolioResume(displayName: string) {
  return {
    ...samplePortfolioResume,
    name: displayName,
  }
}
