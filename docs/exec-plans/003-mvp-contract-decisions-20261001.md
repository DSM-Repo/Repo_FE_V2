# Repo-V2 계약 및 결정 목록

기준일: 2026-10-01. 상위 문서: [전체 실행 계획](001-mvp-completion-20261001.md).
목적: 미정 사항을 임의 확정하지 않으면서 후속 작업의 시작 조건을 구체화한다.

## 이미 결정된 기준

- pnpm + Next App Router + React + TypeScript + ESLint + Playwright. `docs/TECH_STACK.md:7`.
- 현재 배포는 vinext/Cloudflare 구성이다. 이는 코드상 사용 사실이며 사용자와 합의되지 않은 신규 framework 선택이 아니다. `package.json:16`, `vite.config.ts:8`.
- PDF 생성/변환은 서버 책임이다. 클라이언트는 요청/상태/결과를 연동한다. `docs/REQUIREMENTS.md:64`.
- 학생과 선생님 모두 공개 변경 가능, 마지막 변경값이 최종이다. `docs/REQUIREMENTS.md:45`.
- 한글 slug/unique/예약 경로 충돌 방지는 기본 공개 요구다. slug 변경/redirect 고도화 정책은 미정이다. `docs/REQUIREMENTS.md:51`.
- 이미지 클라이언트 계약은 `POST /image`, multipart `image`, JPEG/PNG/WebP, 파일 50MB/요청 55MB다. 실제 서버/CDN 일치는 별도 검증한다. `docs/REQUIREMENTS.md:126`, `src/features/resume/api/resumeHttpClient.ts:165`.
- typography/color는 기존 tokens와 `DESIGN.md`를 따른다. 데스크톱 1440x900~1920x1080 우선, 좁은 화면 기본 방어 유지. `docs/UI_UX_DIRECTION.md:7`, `docs/PUBLISHING.md:28`.

Markdown 문자열, page 좌표, QR 구현은 '현재 구현'이며 사용자 최종 기술 선택으로 승격하지 않는다. 새 editor/PDF/form/state 라이브러리는 사용자의 기술 결정 전 확정하지 않는다.

## 결정과 서버 의존성

각 항목의 담당은 역할이다. 특정 사람에게 이미 요청/승인받았다는 뜻은 아니다. 현재 아래 결정은 합의 증거가 없는 부분을 포함한다. 계약 해제에는 명세와 대표 응답 또는 staging 재현 결과가 필요하다.

| ID | 질문 / 현재 근거 | 결정 담당·필요 자료 | 막히는 작업 | 해제 조건 |
| --- | --- | --- | --- | --- |
| D01 | 이름/학번/학과의 원천은 계정인가 편집 문서인가? 이름 input은 있으나 save에 없음. `src/app/(student)/resume/ResumeEditorSheet.tsx:354`, `src/features/resume/api/resumeHttpClient.ts:49` | 제품 사용자+backend, 수정 가능한 필드·계정 변경 API·필수 검증 정책 | S04/R02~R03 | 필드별 read/write/readonly와 조회 경로, draft vs 제출 validation 확정 |
| D02 | Markdown/page/project 형식과 기존 문서 보존, 긴 문서/이탈/복원 정책. `src/features/resume/api/resumeApi.types.ts:12`, `src/app/(student)/resume/markdownEditorModel.tsx:185` | 사용자 기술 결정+backend, 저장 예시·허용 구문·revision/page ID·PDF 입력 예시 | S04,S09; S03 이탈 정책 | 기존 문서 round trip 및 출력 지원 범위, 변경 포맷 시 migration/recovery 규칙 확정 |
| D03 | 본문 업로드 asset/삭제·빈 profile/project image 해제, 이미지 CDN/용량. `src/features/resume/api/resumeHttpClient.ts:49`, `src/features/resume/api/resumeApi.ts:744` | backend+사용자 기술 결정, multipart 명세·정상/413/415/권한 응답·해제 payload | S04/R06 | 브라우저 실제 업로드/조회 가능, empty omission과 명시 삭제 구분, 본문 asset 저장 위치 확정 |
| D04 | 작성/제출/공개 상태 관계, 제출 후 편집/취소/필수 필드. `src/features/resume/api/resumeApi.types.ts:114`, `src/app/(teacher)/students/page.tsx:47` | 제품 사용자+backend, 상태 enum/전이·submit/cancel 대표 응답·현황 계산 기준 | S05,S06 | `submitted`와 상태 일관성, 저장->제출 순서·실패/중복/취소 정책 확정 |
| D05 | 교사 비공개 본문 조회 및 studentId/resumeId/documentId/pageId. `src/app/(teacher)/students/page.tsx:335`, `src/app/(teacher)/students/[studentId]/page.tsx:28` | backend, 교사 조회 명세·권한·문서 없음·직접 ID access 응답 | S06,S07 | 정확한 대상 key/route 규칙과 교사 조회 대표 응답 확보; 현재 서버 미제공이라는 UI 문구만으로 부재 단정 금지 |
| D06 | 교사 대상 공개 mutation, 학생/교사 동시 변경 및 off cache/파일 영향. `src/features/resume/api/resumeHttpClient.ts:114` | backend+제품 사용자, 대상 key·최종 상태/version·invalidations/감사 로그 필요 여부 | S05,S06,S08 | 자기 문서와 교사 대상 변경 권한·서버 last-write 의미·off 차단 범위 확정 |
| D07 | 전공별 학생 조회·ID/이름 매칭·연도/반·삭제 시 소속 정책. `src/app/(teacher)/majors/page.tsx:38`, `src/features/major/api/majorHttpClient.ts:65` | backend+제품 사용자, 기존 현황 재사용 가능성/major ID·학생 연결·409·삭제 정책 | S06 | 데이터 있는 전공 조회 가능, 동일 이름/삭제/미지정 학생 처리 규칙 확정 |
| D08 | 피드백 anchor 단위/좌표계/문서 변경, completedAt nullable/status/ID, delete body. `src/features/feedback/api/feedbackApi.types.ts:1`, `src/features/feedback/api/feedbackApi.ts:189` | backend+제품 사용자, page+x/y 현재 계약·정규화 좌표 또는 block/range 후보·미완료/삭제페이지 응답 | S07 | 위치 persistence·삭제/재배치 의미·CRUD 응답 상태와 nullable 규칙·부분 실패 구조 확정 |
| D09 | slug 발급/unique/canonical/조회/off 응답/예약어/변경·redirect·색인. `src/shared/lib/portfolioSlug.ts:1`, `src/app/(public)/[portfolioSlug]/page.tsx:18` | backend+제품 사용자, 공개 익명 API·slug field·충돌 응답·실 route 목록·metadata 노출 기준 | S08 | 한글 slug 정상 조회 및 충돌/off 검증 가능, 이름/외부 portfolioUrl/slug field 구분; 변경 미지원이면 명시 |
| D10 | PDF job endpoint/대상/snapshot/상태/retry/result/book/file/index/access. `docs/USER_FLOWS.md:68`, `src/features/library/api/libraryApi.types.ts:5` | 서버 PDF 담당+제품 사용자+사용자 Viewer 기술 결정, 실제 PDF/학생 page span 인덱스·대표 job 응답 | S09,S10 | 서버 job을 staging에서 요청/조회/완료/실패 가능, 결과 PDF+download 권한+학생/반 위치 계약 확보 |
| D11 | 도서관 book ID/date/cohort/year, 필터/권한/모델. `src/app/(public)/library/LibraryPageContent.tsx:87`, `src/features/library/api/libraryHttpClient.ts:57` | backend+제품 사용자, group/book identity·classNumber/major/keyword/page·공통 권한·전체 문서 모델 | S10 | 같은 date 다른 그룹 구분, 전공/반/검색 서버 동작과 역할별 열람 및 PDF route 합의 |
| D12 | 401 vs 403/refresh 회전·동시성·일시 장애, 교사 계정, nullable/204 응답 및 알림 확장. `src/features/auth/api/authenticatedRequest.ts:24`, `src/features/auth/api/authApi.ts:61`, `src/features/notification/api/notificationApi.ts:53` | backend+제품 사용자, 정상/만료/권한/일시 장애 응답, 교사 계정 경로·알림 종류/대상·role별 user shape | S02,S07,S11 | auth retry/세션 종료 규칙, operation별 success status/body/nullable/error enum, live 학생/교사 흐름 검증 가능 |
| D13 | mock/live 분리·staging 권한·CORS·환경 origin·Workers transport/cache·배포 gate. `playwright.config.ts:5`, `src/app/api/backend/[...path]/route.ts:167`, `.github/workflows/deploy.yml:8` | 프로젝트 환경 담당+backend, 폐기 가능한 학생 A/B/교사 T·HTTP/HTTPS staging·격리 KV/IMAGES·환경 설정 | S01 live,S02 Workers,S11 | same-SHA staging 테스트/롤백 가능, 필요한 권한/바인딩의 실제 작동 증거; credentials 값은 문서에 보관 금지 |
| D14 | 관리자/졸업생/공개 이력/페이지 삭제·정렬/다중 관련 링크·알림 페이지네이션 후속 정책 | 제품 사용자, 기존 요구와 우선순위 (`docs/USER_ROLES.md:60`, `docs/REQUIREMENTS.md:47`) | 관련 확장만; 기본 MVP 흐름은 계속 | 필요성이 확정될 때 별도 요구/범위/검증 정의; 기본 공개 제한·본문 링크는 후순위로 밀지 않음 |

## 코드상 기존 요청 목록

아래는 HttpClient가 현재 보내는 요청이며 서버의 확정 명세라고 단정하지 않는다. 새 계약도 이 경계를 우선 확장한다. 현재 spelling `alram`을 근거 없이 바꾸지 않는다.

| 도메인 | 현재 method/path | 누락/검증 대상 |
| --- | --- | --- |
| auth | POST `/user/login`, `/user/signup`, `/user/email/send`, `/user/email/verify`, `/user/refresh` | D12 role/교사 계정/refresh/성공 status/메일 오류 |
| user | GET `/user`, PATCH `/user` `{majorId}` | D01 원천정보, D12 역할별 shape/전공 ID·해제 |
| resume | GET `/resume/{resumeId}`, GET `/resume/students`, PATCH `/resume/visibility`, POST `/resume/save`, `/resume/auto-save`, `/resume/submit`, `/resume/submit/cancel` | D04~D06 제출/대상 key/교사 body/동시 변경 |
| image | POST `/image` multipart `image` | D03 실제 파일·CDN·명시 이미지 제거 |
| major | GET/POST `/major`, DELETE `/major/{majorId}` | D07 소속 조회/중복·삭제 충돌 |
| feedback | POST/GET `/feedback`, GET/PATCH/DELETE `/feedback/{id}`, PATCH `/feedback/apply`, `/feedback/{id}/complete`, `/feedback/{id}/pending` | D08 좌표/status/nullable/ID/body 및 부분 성공 |
| library | GET `/library`, `/library/search`, `/library/{studentId}` | D10~D11 PDF/book/index/전공·반/nullable·full document |
| notification | GET `/alram`, PATCH/DELETE `/alram/{id}` | D12 종류/대상/204·nullable, D14 페이지네이션 |
| public slug/PDF | 현존하는 별도 client 없음 | D09/D10 확정 이후 method/path/type 신설 |

근거: `src/features/auth/api/authHttpClient.ts:88`, `src/features/user/api/userHttpClient.ts:59`, `src/features/resume/api/resumeHttpClient.ts:80`, `src/features/major/api/majorHttpClient.ts:65`, `src/features/feedback/api/feedbackHttpClient.ts:68`, `src/features/library/api/libraryHttpClient.ts:93`, `src/features/notification/api/notificationHttpClient.ts:69`.

## 계약 기록 형식과 완료 판정

각 계약은 다음 정보를 기록한다.

1. 결정일/담당 역할/합의 근거, method/path, actor와 ownership 조건.
2. request/response 예시, required/optional/nullable, enum, 숫자·파일 제한.
3. success status와 body 유무, 401/403/404/409/422/413/415/5xx/timeout의 의미.
4. mutation 이후 재조회, 중복 실행/retry, revision/last-write, cache invalidation.
5. 실제 staging 재현 또는 명세 근거, 연결된 R/S/T ID, 기존 데이터 호환성.

서버 계약 없는 기능은 'UI 준비', 'mock 확인', 'live 대기'로 기록할 수 있으나 'MVP 완료'로 승격하지 않는다. 필요한 결정 하나가 막히면 관련 작업만 대기하고 독립적인 데이터 보존/회귀/문서 작업은 이어간다.
