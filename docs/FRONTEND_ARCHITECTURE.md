# Frontend Architecture

## 기본 방향

Repo-V2는 단일 프론트엔드 앱으로 시작하며, 장기적으로 외부에 보여주는 포트폴리오/레주메북 제품을 지향합니다.

- 단일 앱
- Next.js App Router + React + TypeScript 기반
- 현재 repository는 Vite scaffold이며, Next.js 전환은 별도 작업 단위로 수행
- 권한별 라우팅
- feature 단위 분리
- shared layer로 공통 UI/API/types/utils 관리
- 공개 페이지는 SEO/GEO/AEO를 고려해 metadata, sitemap, robots, JSON-LD, semantic content 구조를 우선합니다.

## 권장 구조 초안

```txt
src/
  app/
    routes/
    providers/
    guards/
  pages/
  features/
    auth/
    student/
    teacher/
    resume-editor/
    feedback/
    library/
    pdf/
    major/
  shared/
    ui/
    api/
    types/
    utils/
    constants/
```

이 구조는 최종 확정이 아니라 초기 설계 후보입니다.

## 라우팅 방향

- 로그인 전 공개 영역
- 외부 공개 포트폴리오/레주메북 영역
- 로그인 후 공통 영역
- 학생 전용 route
- 선생님 전용 route
- 내부 사용자 공통 도서관 route

예시:

```txt
app/
  (public)/
    page.tsx
    portfolios/[studentId]/page.tsx
    resume-books/[bookId]/page.tsx
  (auth)/
    login/page.tsx
    library/page.tsx
    library/[bookId]/page.tsx
    student/resume/page.tsx
    teacher/students/page.tsx
    teacher/students/[studentId]/page.tsx
    teacher/majors/page.tsx
```

TODO: 실제 URL 구조는 Figma 화면과 사용자 흐름을 보고 확정한다.

## 권한 처리 방향

- 프론트엔드는 route guard로 UX 수준의 접근 제어를 제공한다.
- 실제 보안은 백엔드 authorization이 책임진다.
- 학생/선생님 모두 접근 가능한 공통 기능은 별도 shared route로 둔다.

## API 연동 방향

초기에는 feature별 API 경계를 둔다.

```txt
features/auth/api
features/student/api
features/teacher/api
features/resume-editor/api
features/feedback/api
features/library/api
features/pdf/api
features/major/api
```

도메인 후보:

- `auth`
- `users`
- `students`
- `majors`
- `resumes`
- `resume-documents`
- `feedback`
- `libraries`
- `pdf`
- `files`

상세 API 계약은 아직 확정하지 않는다. 백엔드 설계가 구체화되면 별도 `API_CONTRACTS.md` 분리를 검토한다.

## 레거시 구조를 그대로 따르지 않는 이유

레거시는 `student`, `teacher`, `main` 앱이 분리되어 있었지만 Repo-V2는 다음 이유로 단일 앱이 더 적합합니다.

- 공통 UI와 비즈니스 로직이 많다.
- 내부 도서관은 로그인 사용자 전체가 접근한다.
- URL과 배포 환경을 역할별로 분리할 필요가 없다.
- 프론트 앱 분리는 보안 경계가 아니며, 백엔드 권한 검증이 더 중요하다.

## Open Questions

- 관리자성 기능은 선생님 feature에 포함할 것인가, 별도 admin feature로 분리할 것인가?
- 에디터와 PDF Viewer는 독립 feature로 분리할 만큼 규모가 커질 것인가?
- Next.js 전환 후 API route/server action을 사용할 것인가, 별도 백엔드 API만 사용할 것인가?
