import type { ResumeBookSheetContent } from '@/shared/ui'

export const sampleResumeBookSheetContent = {
  activities: [
    { date: '2025.12.25', title: '제 1회 SCSC 온라인 해커톤 2위' },
    { date: '2025.07.18', title: '2025 교내 해커톤 우수상' },
  ],
  contests: ['제4회 2026 블레이버스 MVP 개발 해커톤', '제 1회 SCSC온라인 해커톤', '2025 교내 해커톤'],
  email: 'mare2mare6@gmail.com',
  headline: '2415 인공지능소프트웨어과',
  introduce:
    '새벽자습너무 졸립니다. 뭘 적지.. 한줄소개는 이런식으로 쭉쭉 들어갑니다. 줄넘김 가능합니다. 자기소개자기소개자기소개자기소개자기소개자기소개.. 최대 4줄이면 충분하겠지만..',
  majorName: 'Frontend Developer',
  name: '최하은',
  projects: ['TEENS', '스플', 'D-ask', 'DSG', 'Studiz', 'hear', '마음씨', 'Repo'],
  skills: ['Figma', 'illustrator', 'photoshop'],
} satisfies ResumeBookSheetContent
