# Frontend Architecture

## 기본 방향

Repo-V2는 단일 프론트엔드 앱으로 시작하며, 장기적으로 외부에 보여주는 포트폴리오/레주메북 제품을 지향합니다.

- 단일 앱
- Next.js App Router + React + TypeScript 기반
- 권한별 라우팅
- feature 단위 분리
- shared layer로 공통 UI/API/types/utils 관리
- 공개 페이지는 SEO/GEO/AEO를 고려해 metadata, sitemap, robots, JSON-LD, semantic content 구조를 목표로 합니다. 현재 slug 페이지는 metadata와 본문 모두 `notFound()`이며 sitemap/robots 파일과 공개 데이터 연동은 후속 작업입니다.

## 현재 구조

2026-10-01 소스 기준이며, route group 이름은 URL에 포함되지 않습니다.

```txt
src/
  app/
    layout.tsx
    globals.css
    (public)/
    (auth)/
    (student)/
    (teacher)/
    api/backend/[...path]/route.ts
    component-showcase/
  features/
    auth/
    user/
    student-home/
    resume/
    feedback/
    library/
    major/
    notification/
  shared/
    ui/
    api/
    lib/
    styles/
```

이력서 편집 화면은 `src/app/(student)/resume`에, API 경계는 `src/features/resume/api`에 있습니다. 초기 후보였던 `student`, `teacher`, `resume-editor`, `pdf` feature를 현재 디렉터리로 가정하지 않습니다. PDF 경계 신설은 서버 계약 D10 확정 이후 검토합니다.

## 실행 및 배포 구성

- [package.json](../package.json)의 `dev`/`build`/`start`는 Next를 실행합니다. `pnpm build`의 `postbuild`는 `vinext build && next typegen`도 실행합니다.
- [playwright.config.ts](../playwright.config.ts)는 Next 서버에서 E2E를 실행합니다. Workers 동작 검증과는 별개입니다.
- [vite.config.ts](../vite.config.ts)는 vinext, Cloudflare plugin, KV/CDN cache, images optimizer를 사용하는 현재 배포 설정입니다. 초기 Vite SPA scaffold의 잔재가 아닙니다.
- [wrangler.jsonc](../wrangler.jsonc)는 Workers의 ASSETS/IMAGES/VINEXT_KV_CACHE 바인딩을 선언합니다. 선언만으로 원격 리소스와 배포 권한이 검증된 것은 아닙니다.

## 라우팅 방향

- 로그인 전 공개 영역
- 외부 공개 포트폴리오/레주메북 영역
- 로그인 후 공통 영역
- 학생 전용 route
- 선생님 전용 route
- 내부 사용자 공통 도서관 route
- `학생 관리` route는 선생님 전용 route로 분리하고, 학생 권한 내비게이션에는 노출하지 않는다.

| URL | `src/app` 아래 구현 | 현재 역할/상태 |
| --- | --- | --- |
| `/` | `(public)/page.tsx` | 랜딩 |
| `/login`, `/signup` | `(auth)/login/page.tsx`, `(auth)/signup/page.tsx` | 인증 |
| `/home`, `/resume` | `(student)/home/page.tsx`, `(student)/resume/page.tsx` | student guard |
| `/students`, `/students/[studentId]` | `(teacher)/students/page.tsx`, `(teacher)/students/[studentId]/page.tsx` | teacher guard, 상세 본문 연결 후속 |
| `/majors` | `(teacher)/majors/page.tsx` | teacher guard |
| `/library` | `(public)/library/page.tsx` | 내부 도서관, 클라이언트 토큰으로 API 조회 |
| `/resume-books/[bookId]` | `(public)/resume-books/[bookId]/page.tsx` | 현재 bookId를 숫자 studentId로 해석하는 HTML 시트 |
| `/[portfolioSlug]` | `(public)/[portfolioSlug]/page.tsx` | 공개 조회 미연결, 항상 404 |
| `/component-showcase` | `component-showcase/page.tsx` | 공통 UI 확인 |

`(public)` 디렉터리 자체는 익명 열람 허용을 뜻하지 않습니다. 도서관은 로그인 토큰을 요구하며 실제 authorization은 서버 책임입니다. 교사 상세의 studentId/resumeId 식별자 정합성은 D05, 도서관 book identity는 D11에서 확인합니다.

### 공개 포트폴리오 URL 정책

공개 포트폴리오 URL은 사용자 친화적인 slug 기반으로 설계합니다.

예시:

```txt
/오혜민
```

정책:

- 외부 공개 포트폴리오 URL에는 `studentId`를 직접 노출하지 않습니다. 현재 내부 도서관의 숫자 ID 경로와 구분합니다.
- 한글 slug를 허용합니다.
- 브라우저와 서버 내부에서는 한글 path가 percent-encoding될 수 있으므로, 저장/조회 시에는 canonical slug 값을 기준으로 처리합니다.
- slug는 공개 URL 네임스페이스에서 unique해야 합니다.
- `/home`, `/resume`, `/students`, `/majors`, `/library`, `/login`, `/signup`, `/resume-books`, `/component-showcase`, `/api` 등 실제 앱 경로와 충돌하지 않아야 합니다. 현재 예약어 구현의 보완은 S08/D09 범위입니다.
- 중복 slug가 발생하면 suffix 또는 별도 식별 규칙을 둡니다.
- 공개 URL slug 변경 이력/redirect 정책은 후속 결정으로 둡니다.

## 권한 처리 방향

- 프론트엔드는 route guard로 UX 수준의 접근 제어를 제공한다.
- 실제 보안은 백엔드 authorization이 책임진다.
- 학생/선생님 모두 접근 가능한 공통 기능은 별도 shared route로 둔다.

## API 연동 방향

현재 feature별 API 경계:

```txt
features/auth/api
features/user/api
features/resume/api
features/feedback/api
features/library/api
features/major/api
features/notification/api
```

초기 설계 당시 도메인 후보 (현재 폴더/API 명세와 구분):

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

현재 HttpClient 요청과 미확정 서버 계약은 [계약 및 결정 목록](exec-plans/003-mvp-contract-decisions-20261001.md)을 따른다. 백엔드 상세 계약 문서 분리는 후속 검토 대상으로 보존한다.

- HTTPS 화면에서 HTTP API를 사용하면 `src/shared/api/clientApiBaseUrl.ts`가 같은 출처의 `/api/backend/*`로 전환한다. 해당 API route의 HTTP IPv4 전송은 Workers sockets를 사용하므로 Next에서의 E2E와 Workers 검증을 구분한다.
- `POST /image`는 multipart의 `image` 파일 필드를 사용하며 프로필/프로젝트 업로드에 연결되어 있다. 본문 이미지와 실환경 검증은 D03/S04에 남아 있다.
- PDF 생성/변환은 서버 책임이다. 프론트 요청/상태/결과 계약과 Viewer 선택은 D10 대기이며, 현재 도서관의 HTML 시트는 PDF Viewer 구현이 아니다.

## 레거시 구조를 그대로 따르지 않는 이유

레거시는 `student`, `teacher`, `main` 앱이 분리되어 있었지만 Repo-V2는 다음 이유로 단일 앱이 더 적합합니다.

- 공통 UI와 비즈니스 로직이 많다.
- 내부 도서관은 로그인 사용자 전체가 접근한다.
- URL과 배포 환경을 역할별로 분리할 필요가 없다.
- 프론트 앱 분리는 보안 경계가 아니며, 백엔드 권한 검증이 더 중요하다.

## Open Questions

- 관리자성 기능은 선생님 feature에 포함할 것인가, 별도 admin feature로 분리할 것인가?
- 에디터와 PDF Viewer는 독립 feature로 분리할 만큼 규모가 커질 것인가?
- 현재 backend proxy API route 외에 server action/API route 책임을 확장할 것인가?
- 공개 URL slug 중복/예약어/변경/redirect 정책은 어떻게 관리할 것인가?
