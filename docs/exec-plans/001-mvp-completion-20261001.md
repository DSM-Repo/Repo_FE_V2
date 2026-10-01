# Repo-V2 남은 MVP 전체 실행 계획

작성일: 2026-10-01 (Asia/Seoul). 조사 기준 커밋: `224d5e2`.
상태: 계획 작성 완료 및 1차 구현·회귀 검증 완료. 전체 MVP 구현은 아직 진행 중이다.

## 현재 실행 상태 (2026-10-01)

계획의 첫 실행 단위로 S01 단위 테스트 러너, S02 인증 갱신·백엔드 프록시 일부, S03 학생 편집 저장/업로드 경쟁 상태, S06 교사 전체 학생 검색, S11 네트워크 mock guard와 CI 회귀 검증을 반영했다. 제품 범위 전체를 완료한 것으로 해석하지 않는다.

현재 검증 결과: 단위 테스트 113/113, 러너 회귀 5/5, Playwright E2E 96/96, lint, typecheck, production build 모두 통과.

남은 주요 제품 범위: S04 학생 공개/제출, S05 교사 CRUD·피드백·공개 제어, S07 서버 PDF 변환, S08 내부 도서관, S09/S10 공개·운영 통합, D13 live staging 검증.

## 목표와 계획 완료 기준

학생 작성 -> 저장/제출 -> 교사 확인/피드백 -> 공개 -> 서버 PDF 변환 -> 내부 도서관 열람/다운로드 흐름을 완성한다. 제품 기준은 `docs/PRODUCT_VISION.md:5`, `docs/REQUIREMENTS.md:5`, `docs/USER_FLOWS.md:3`이다.

계획 완료는 아래 조건으로 판단한다. 제품 완료와 구분한다.

- 요구사항마다 현재 코드 근거, 후속 작업 ID, 검증 ID가 연결되어 있다.
- 미확정 정책은 결정 담당, 필요한 자료, 막히는 작업, 해제 조건까지 기록한다.
- 기존 구현을 다시 만드는 단계가 아니라 보완 지점과 회귀 보호 범위를 명시한다.
- 서버 의존 작업과 지금 시작 가능한 프론트 작업을 구분한다.
- 별도 검토자가 실행 순서, 근거, 누락, 테스트 가능성을 확인한다.

상세 테스트 기준은 [테스트 명세](002-mvp-test-spec-20261001.md), 서버/제품 결정은 [계약 및 결정 목록](003-mvp-contract-decisions-20261001.md)을 따른다. 이 계획의 S 작업 ID, R 요구 ID, T 검증 ID, D 결정 ID를 후속 이슈와 PR에도 유지한다.

## 조사 범위와 증거 수준

확인한 문서: `docs/index.md`, `PRODUCT_VISION.md`, `REQUIREMENTS.md`, `USER_ROLES.md`, `USER_FLOWS.md`, `FRONTEND_ARCHITECTURE.md`, `TECH_STACK.md`, `DECISIONS.md`, `DESIGN_SYSTEM.md`, `UI_UX_DIRECTION.md`, `PUBLISHING.md`, `QUALITY.md`, `TESTING.md`, `LOCAL_ENVIRONMENT.md`, `GIT_WORKFLOW.md`, `QA_REPORT_2026-09-20.md`, `docs/exec-plans/README.md`, 루트 `README.md`와 `DESIGN.md`.

확인한 구현 범위: `src/app`의 학생/교사/인증/공개 경로, `src/features`의 auth/user/resume/feedback/major/library/notification API와 연결 UI, 문서 시트/QR/slug/공통 내비게이션, `tests/unit`, `tests/e2e`, 실행 스크립트, Next/vinext/Workers 및 CI/배포 설정.

기존 계획은 `.omx/plans`의 문서 확정, Next 전환, Playwright 기준, 학생 홈 계획과 대조했다. 초기 후보만 있는 `docs/exec-plans/README.md:47`을 구현 완료 기록으로 취급하지 않는다. `.omx`/`.omo`의 과거 QA 아티팩트는 현재 실행 증거가 아니다. 비밀 환경파일과 실제 토큰은 조사하지 않았다.

| 증거 | 이번 확인 결과 | 한계 |
| --- | --- | --- |
| `git status --short` | 시작 시 변경 없음 | 작업 기준 시점만 의미 |
| `pnpm lint` | exit 0 | 사용자 흐름 미검증 |
| `pnpm typecheck` | exit 0 | 서버 명세 일치 미검증 |
| `pnpm test:unit` | 65 pass, 0 fail/skip | fetch mock 기반 |
| `pnpm exec playwright test --list` | 13개 spec, 71개 시나리오 발견 | E2E 실행/통과를 의미하지 않음 |
| 현재 소스 조사 | 구현/연결 여부 확인 | 경쟁 상태 등은 재현 후 확정 |
| 2026-09-20 QA | 과거 문제와 수정/잔여 기록 참조 | 현재 코드 및 원격 리소스 상태와 대조 필요 |

이번 계획 작성 중 production build, E2E 실행, 실제 API 변경, 메일 발송, 배포는 수행하지 않았다.

## 현재 상태에서 중요한 차이

1. `docs/index.md:8`의 구현 전 상태와 실제 구현이 다르다. Playwright 추가 예정도 이미 설정된 `package.json:14`, `playwright.config.ts:8`과 다르다. `docs/DECISIONS.md:187`의 PDF 책임 미정은 `docs/REQUIREMENTS.md:64`의 서버 책임과 대조해야 한다.
2. 수동/자동 저장과 프로필/프로젝트 이미지 업로드는 연결되어 있다. 다만 업로드 결과가 오래된 draft를 병합하고, 이름은 편집되지만 저장 payload에는 없다. `src/app/(student)/resume/StudentResumePageContent.tsx:795`, `:889`, `src/features/resume/api/resumeHttpClient.ts:49`.
3. 학생 공개/제출 API는 있으나 학생 화면에 호출이 연결되어 있지 않다. 교사 상세의 공개와 피드백 컨트롤도 비활성 상태다. `src/features/resume/api/resumeHttpClient.ts:114`, `src/app/(teacher)/students/[studentId]/page.tsx:34`.
4. 외부 slug 페이지는 항상 404다. 외부 URL을 QR로 넣는 기능은 학생 공개 slug 발급 기능과 별개다. `src/app/(public)/[portfolioSlug]/page.tsx:18`, `src/app/(student)/resume/StudentResumePageContent.tsx:707`.
5. 전공 CRUD와 학생 제출 현황 목록은 연결되었으나 전공별 학생은 상수 빈 배열이며 교사 상세 링크의 경로명은 studentId, 전달값은 resumeId다. `src/app/(teacher)/majors/page.tsx:38`, `src/app/(teacher)/students/page.tsx:335`.
6. 도서관은 학년도별 학생 HTML 시트를 보여준다. 실제 PDF Viewer, 다운로드, 변환 작업 흐름은 없다. 현재 `[bookId]`는 숫자 학생 ID를 해석한다. `src/app/(public)/resume-books/[bookId]/page.tsx:92`, `src/features/library/api/libraryApi.types.ts:5`.
7. 공통 인증은 401/403을 함께 재발급하고 재발급 장애에도 세션을 지운다. 프록시는 HTTP IPv4 경로에서 Workers sockets를 직접 사용한다. `src/features/auth/api/authenticatedRequest.ts:24`, `src/app/api/backend/[...path]/route.ts:167`.
8. CI는 unit을 실행하지 않고 배포 workflow는 CI 성공과 독립적이다. E2E 런타임은 Next, 배포 런타임은 vinext/Workers다. `.github/workflows/ci.yml:40`, `.github/workflows/deploy.yml:8`, `playwright.config.ts:6`.

## 요구사항 추적표

상태의 '연결됨'은 코드에서 호출을 확인했다는 뜻이다. 운영 환경 완료나 실제 서버 영속성을 뜻하지 않는다. '부분'은 구현 공백, '계약 확인'은 서버 부재로 단정할 수 없는 클라이언트 전제다.

| ID | 요구사항 / 근거 | 현재 상태와 구현 근거 | 작업 | 검증 |
| --- | --- | --- | --- | --- |
| R01 | 로그인·역할별 접근 (`docs/USER_FLOWS.md:5`, `docs/USER_ROLES.md:35`) | 로그인/guard 연결, 보호 경로 일부만 E2E. `src/features/auth/ui/AuthRoleGuard.tsx:50` | S02 | T01,T02,T03 |
| R02 | 이름·학번·학과 (`docs/REQUIREMENTS.md:10`) | 이름 편집 미영속, 학번/학과 표시 전용. `src/app/(student)/resume/ResumeEditorSheet.tsx:354` | S03,S04,D01 | T08 |
| R03 | 이메일·한 줄/상세 소개 (`docs/REQUIREMENTS.md:14`) | 입력/저장 연결, 이름·필수값 정책과 함께 검증 필요. `src/app/(student)/resume/StudentResumePageContent.tsx:889` | S04 | T08,T09 |
| R04 | 관련 링크·기술스택 (`docs/REQUIREMENTS.md:15`) | QR 외부 URL/스택 연결, 본문 링크 편집 부족. `src/app/(student)/resume/markdownEditorModel.tsx:83` | S04 | T09,T10,T12 |
| R05 | 문서 본문·크기·Bold·인용 (`docs/REQUIREMENTS.md:19`) | Markdown 직렬화/툴바 연결, IME/붙여넣기/복합 스타일 공백. `src/app/(student)/resume/markdownEditorModel.tsx:1` | S03,S04,D02 | T05,T09,T11 |
| R06 | 이미지 첨부 (`docs/REQUIREMENTS.md:25`) | 프로필/프로젝트 업로드 연결; 본문 이미지는 링크 렌더. `src/shared/ui/ResumeBookSheet/ResumeBookSheet.tsx:163` | S03,S04,D03 | T05,T10 |
| R07 | 저장·재조회·자동저장 (`docs/USER_FLOWS.md:9`) | 수동/3분 무입력 자동저장 연결, 경쟁/복원 보완. `src/app/(student)/resume/StudentResumePageContent.tsx:867` | S03 | T04,T05,T06,T07 |
| R08 | 페이지 제한 없음 (`docs/REQUIREMENTS.md:27`) | 프로젝트 페이지 추가 연결, 긴 시트 overflow 위험. `src/app/(student)/resume/StudentResumePageContent.tsx:752`, `src/shared/ui/ResumeBookSheet/ResumeBookSheet.module.css:3` | S03,S04 | T07,T11 |
| R09 | 학생 공개 on/off (`docs/REQUIREMENTS.md:26`) | API만 존재, UI 미연결. `src/features/resume/api/resumeHttpClient.ts:114` | S05 | T13 |
| R10 | 제출/미제출 현황 (`docs/REQUIREMENTS.md:34`, `docs/USER_FLOWS.md:40`) | 현황 연결, 제출/취소 API는 UI 미연결. `src/features/resume/api/resumeHttpClient.ts:125`, `src/app/(teacher)/students/page.tsx:47` | S05,S06,D04 | T14,T15 |
| R11 | 교사 학생·반 조회·이름 검색 (`docs/REQUIREMENTS.md:31`) | 조회 연결, 검색은 선택한 반 안에서만 표시. `src/app/(teacher)/students/page.tsx:177` | S06,D05 | T15 |
| R12 | 교사 본문 열람 (`docs/USER_FLOWS.md:41`) | 상세 고정 안내, studentId/resumeId 불일치. `src/app/(teacher)/students/[studentId]/page.tsx:20`, `src/app/(teacher)/students/page.tsx:335` | S06,D05 | T16 |
| R13 | 교사 공개 변경·마지막 값 (`docs/REQUIREMENTS.md:37`, `:45`) | 교사 스위치 disabled, 대상 지정 계약 필요. `src/app/(teacher)/students/[studentId]/page.tsx:43` | S06,D06 | T17 |
| R14 | 전공 생성·삭제 (`docs/REQUIREMENTS.md:38`) | 호출 연결, 삭제 충돌/학생 소속 재조회 보완. `src/app/(teacher)/majors/page.tsx:178` | S06,D07 | T18 |
| R15 | 전공별 학생 조회 (`docs/REQUIREMENTS.md:40`) | 학생 배열 빈 상수, hasStudents=false. `src/app/(teacher)/majors/page.tsx:38`, `:58` | S06,D07 | T18 |
| R16 | 원하는 위치 피드백 CRUD (`docs/REQUIREMENTS.md:41`) | API 있지만 교사 UI 미연결, 좌표 정책 미정. `src/features/feedback/api/feedbackApi.types.ts:1` | S07,D08 | T19,T20 |
| R17 | 학생 피드백 반영 흐름 (`docs/USER_FLOWS.md:43`, 현재 구현 회귀) | 목록/완료/미완료/일괄 반영 연결. `src/app/(student)/resume/StudentResumePageContent.tsx:643` | S07 | T21 |
| R18 | 공개 slug·한글·unique·예약어 (`docs/REQUIREMENTS.md:51`) | 항상 404, 실제 앱 경로 예약 목록 부족. `src/shared/lib/portfolioSlug.ts:1` | S08,D09 | T22,T23 |
| R19 | 공개 off 외부 제한 (`docs/USER_FLOWS.md:29`) | 실데이터 공개 조회 없음, 캐시 무효화 계약 필요 | S05,S08,D06,D09 | T13,T17,T22 |
| R20 | 서버 PDF 변환 (`docs/REQUIREMENTS.md:61`) | 서버 책임 결정됨, 요청/상태/결과 계약 대기. `docs/REQUIREMENTS.md:127` | S09,D10 | T24,T25 |
| R21 | 교사 레주메북 변환 (`docs/REQUIREMENTS.md:63`) | 버튼/대상 조건/재시도 UI 없음. `src/app/(public)/library/LibraryPageContent.tsx:236` | S09,D10 | T24,T26 |
| R22 | 내부 사용자 도서관·목록 (`docs/REQUIREMENTS.md:69`) | 토큰 필요, 책은 date/cohort/year 그룹. `src/features/library/api/libraryApi.types.ts:5` | S10,D11 | T27,T28 |
| R23 | PDF 열람·다운로드 (`docs/REQUIREMENTS.md:71`) | HTML 시트만 존재, PDF URL 모델 없음 | S09,S10,D10 | T25,T29 |
| R24 | 반/학생 빠른 이동 (`docs/REQUIREMENTS.md:73`) | 학생 상세 링크만 존재, PDF 위치 인덱스 없음 | S10,D10 | T30 |
| R25 | 전공/반 필터·이름 검색 (`docs/REQUIREMENTS.md:74`) | 이름/date/더 보기 연결, 전공 UI·반 계약 부재. `src/features/library/api/libraryHttpClient.ts:57` | S10,D11 | T28,T30 |
| R26 | 홈/알림 조회·읽음·삭제 (기존 연결 유지, `docs/REQUIREMENTS.md:125`) | 연결됨, 단일 알림 유형·nullable 계약 검토. `src/features/notification/api/notificationApi.ts:53` | S02,S11 | T31 |
| R27 | 기본 접근성·데스크톱/좁은 화면 (`docs/PUBLISHING.md:30`, `:38`) | 개별 테스트 있음, 새 기능 focus/긴 한글/실이미지 검증 필요 | 각 작업,S11 | T32 |
| R28 | 공개 페이지 metadata/semantic (`docs/FRONTEND_ARCHITECTURE.md:12`) | slug metadata도 항상 404, sitemap/robots 없음 | S08,D09 | T23 |
| R29 | 품질·배포·문서 (`docs/QUALITY.md:11`, `:18`) | stale 문서, mock/live·Next/Workers 게이트 불일치 | S00,S01,S11 | T00,T33,T34,T35 |

## 우선순위와 의존 순서

P1: 데이터 유실 방지, 인증/권한, 학생 공개/교사 대상 식별, mock 격리. P2: 교사/도서관/PDF 요구 완성, 계약 일치, 문서/QA. 반응형 세부 고도화와 외부 기업용 탐색은 후순위다.

| 작업 | 선행 조건 | 독립 진행 가능한 부분 | 완료 증거 |
| --- | --- | --- | --- |
| S00 현황 문서 정합성 | 현재 조사 | 전체 | T00 결과·변경 문서 |
| S01 검증 환경/기준 | 현재 테스트/CI | fixture 격리·runner/아티팩트 | T33 결과 |
| S02 인증/프록시 | D12 중 오류/재발급 계약 | mock 재현·회귀 작성 | T01~T03,T34 |
| S03 에디터 데이터 보존 | S01 | UI race 재현/수정 전체 | T04~T07 |
| S04 작성 경험 완성 | S03; D01~D03 | 긴 문서/링크 UX 재현 | T08~T12 |
| S05 학생 공개/제출 | S02,S03; D04,D06 | 현 API 기반 mock/UI | T13,T14 |
| S06 교사/전공 관리 | S02; D05~D07 | 목록 검색·이름/ID 회귀 | T15~T18 |
| S07 피드백 | S06 본문/page ID; D08 | 파서/부분 성공 회귀 | T19~T21 |
| S08 공개 slug/metadata | S05; D09 | 예약어·malformed slug unit | T22,T23 |
| S09 PDF/변환 | 서버 D10 제공; D02 출력 정합성 | 확정 전 상태 설계/테스트 명세 | T24~T26 |
| S10 도서관/PDF 열람 | S09; D10,D11 | 역할 nav·HTML 누락·검색/필터 | T27~T30 |
| S11 통합 QA/배포 게이트 | S01~S10; staging D13 | CI gate·홈 알림 회귀 | T31~T35 |

권장 시작 순서: S00/S01 -> S02와 S03 -> S04/S05 -> S06/S07/S08 -> S09/S10 -> S11. 서버 계약 D05,D06,D09,D10,D11은 초기에 병렬로 협의한다. S09가 막혀도 S03~S08 및 S10의 HTML/내비게이션 회귀를 진행한다. 미확정 PDF API 경로나 라이브러리를 임의로 만들어 구현 완료로 표시하지 않는다.

단계 완료와 전체 시나리오 통과를 분리한다. 단계 완료는 해당 단계에서 제공하는 UI/API의 mock·회귀 및 확보된 live 계약 검증이다. 아직 만들지 않은 후속 화면의 검증은 S11 통합 대장에 `NOT RUN` 또는 `BLOCKED`로 넘긴다. S08의 선행 조건인 S05 완료는 공개 mutation·상태 재조회까지이며, 익명 공개 on/off의 전체 T13은 S08 이후 검증한다. S04의 교사/도서관/PDF 콘텐츠 일치도 각각 S06/S10/S09 이후 검증한다. 후속 검증을 넘겼다는 이유로 R 요구사항이나 T 시나리오 전체를 PASS로 기록하지 않는다.

## 실행 단계

### S00. 문서와 현재 구현 상태 맞추기

대상: `docs/index.md`, `docs/REQUIREMENTS.md`, `docs/FRONTEND_ARCHITECTURE.md`, `docs/TECH_STACK.md`, `docs/DECISIONS.md`, `docs/TESTING.md`, `docs/LOCAL_ENVIRONMENT.md`, `docs/DESIGN_SYSTEM.md`, 루트 `README.md`.

1. 구현 전 표현과 초기 설계 단계 non-goals를 역사적 문맥으로 제한한다. 현재 URL `/home`, `/resume`, `/students`, `/majors`, `/library`를 실제 route group에 대응한다.
2. Next 앱과 vinext/Workers 배포를 함께 기록한다. Vite 설정은 현재 배포 구성에 쓰이므로 초기 scaffold 잔재라고 삭제하지 않는다. `vite.config.ts:8`.
3. Playwright/unit/CI 현재 명령, 이미지 multipart 계약, 서버 PDF 책임을 기록한다. `docs/QA_REPORT_2026-09-20.md:62`의 이미지 HOLD는 과거 기록으로 보존하고 새 문서에서 최신 코드와 구분한다.
4. `docs/DESIGN_SYSTEM.md:95`의 존재하지 않는 fixture 참조 및 typography/spacing/radius 기준을 `DESIGN.md`/실제 token과 대조한다. 정책 미결정은 삭제하지 않고 D 목록으로 연결한다.

완료: T00. 문서에서 현재 사실과 제품 선택이 구분되며 과거 기록을 현재 판정으로 읽을 수 없어야 한다.

### S01. 검증 환경을 재현 가능하게 만들기

대상: `playwright.config.ts`, `tests/e2e/auth-fixtures.ts`, 각 E2E mock, `scripts/run-unit-tests.mjs`, `.github/workflows/ci.yml`.

1. 모든 mock origin을 공통 설정으로 사용하고 등록하지 않은 원격 API 요청은 실패시킨다. 앱 asset/로컬 서버 요청은 허용한다. mock 테스트가 실제 메일/업로드/저장에 도달하지 않아야 한다.
2. unit 신규 spec 발견과 고유 임시 출력 경로를 마련한다. 현재 수동 목록(`scripts/run-unit-tests.mjs:20`)에 새 테스트 누락이 생기지 않게 검증한다. 기존 runner/Node test를 우선 활용하고 새 의존성은 별도 결정 전 추가하지 않는다.
3. 실패 trace/screenshot/report 보존, 빌드 SHA·runtime·환경 기록, 기존 서버 재사용 방지 경로를 추가한다. mock suite와 폐기 가능한 staging live 검증을 별도 명령으로 분리한다.
4. CI에 unit/typecheck를 명시하고 최종 배포 게이트는 S11에서 동일 SHA로 연결한다.

완료: T33. 네트워크 누출·unit spec 누락·서버 재사용 오류를 의도적으로 발생시켜 gate가 실패하는 증거를 남긴다.

### S02. 인증·응답 처리·프록시 안정화

대상: `src/features/auth/api/{authenticatedRequest,authApi,authHttpClient,authTokenStorage,authAccessToken}.ts`, `src/features/auth/ui/{AuthRoleGuard,AuthSignupPage}.tsx`, `src/shared/api/clientApiBaseUrl.ts`, `src/app/api/backend/[...path]/route.ts`.

1. D12에 맞춰 세션 만료와 권한 없음, 재발급의 일시 장애와 무효 refresh를 구분한다. 동시에 여러 요청이 실패해도 재발급을 공유하고 오래된 세션 응답이 새 로그인/로그아웃 상태를 바꾸지 않도록 한다. JWT 해석은 UX이고 실제 authorization은 서버 책임이다.
2. 로그인/재발급 응답 본문 읽기까지 timeout·network error·invalid JSON을 정형화한다. 재시도 횟수와 `complete()` 호출을 검증한다.
3. 회원가입 이메일 발송/검증/비밀번호 일치/완료/중복 계정/만료 코드/재발송을 mock으로 검증한다. 교사 가입 UI를 임의로 추가하지 않고 계정 공급은 D12로 확인한다.
4. 프록시의 환경 URL 검증, query/메서드/허용 헤더, multipart, 204/304 등 본문 없는 응답, chunked/깨진 HTTP 응답, upstream timeout을 검증한다. HTTP IPv4 sockets 경로와 HTTPS fetch 경로를 구분한다. Next 서버에서 `cloudflare:sockets`를 사용할 수 있다고 가정하지 않는다.
5. 50MB 파일을 프록시가 전체 메모리에 읽는 현재 경로(`src/app/api/backend/[...path]/route.ts:204`)의 제한과 서버 55MB 요청 한도를 함께 검증한다. 원격 timeout/종료 후 소켓·읽기 취소가 정리되어야 한다. transport 재설계가 필요하면 D13에 근거를 남긴다.

완료: T01~T03,T34. 모든 보호 경로와 직접 API 요청에서 역할/소유권이 맞고, 일시 장애가 입력 유실이나 잘못된 성공 표시를 유발하지 않는다.

### S03. 에디터 데이터 유실 위험 먼저 해결

대상: `src/app/(student)/resume/StudentResumePageContent.tsx`, `ResumeEditorSheet.tsx`, `MarkdownTextarea.tsx`, `src/features/resume/api/resumeIdStorage.ts`, 관련 E2E.

1. 지연 upload/load/save와 라우트 변경을 이용해 T04~T07 실패 재현 테스트를 먼저 작성한다.
2. 업로드 결과는 최신 draft의 대상 이미지 필드만 갱신한다. 요청 시작 문서/페이지와 현재 문서/페이지가 다르면 결과를 잘못 적용하지 않는다. dirty revision 갱신도 보존한다.
3. 조회 중 편집/저장 정책을 명시하고 이전 조회 응답은 새 문서를 덮어쓰지 못하게 한다. 실패 상태에서 빈 draft를 기존 문서에 저장하지 않는다.
4. 수동 저장 중 추가 입력이 있으면 최신 변경이 저장되거나 편집 상태/미저장 표시가 유지되어야 한다. 저장 이후 IDs 재조회가 실패해도 성공/실패 범위를 분리하고 재시도 가능해야 한다.
5. 자동저장 180초 무입력 기준을 유지한다. 취소/페이지 추가 후 현재 페이지 위치를 유효 범위로 복원한다. 새 계정 로그인에서 이전 계정 resumeId가 사용되지 않는지 검증한다.
6. 미저장 이탈 보호/복원 정책을 D02로 정하고 최소한 저장되지 않은 변경을 숨기지 않는다. 문서 삭제/정렬은 별도 요구 확정 전 범위에 추가하지 않는다.

완료: T04~T07. 동일 문서의 입력과 page ID가 저장/재조회 후 보존되고 실패 후 다시 작업할 수 있다.

### S04. 필수정보·본문·이미지·QR 작성 흐름 완성

대상: `ResumeEditorSheet.tsx`, `MarkdownTextarea.tsx`, `markdownEditorModel.tsx`, `StudentResumePageContent.tsx`, `src/features/resume/api`, `src/shared/ui/{ResumeBookSheet,PortfolioUrlModal,QrCode}`, `src/shared/lib/qrCode.ts`.

1. D01에 따라 이름/학번/학과를 수정할 수 있으면 실제 mutation과 조회로 보존하고, 계정 원천정보이면 편집 가능한 척하는 입력을 정리한다. 임시저장은 미완성 문서를 허용하고 제출 필수 검증은 D04로 분리한다.
2. 한 줄/상세 소개, 이메일, 관련 링크, 스택, 프로젝트·기간, FREE/PROFILE/PROJECT 페이지가 round trip에서 보존되어야 한다. 스택 확정 전 텍스트의 저장/blur 처리도 결정한다.
3. 링크 입력·수정·취소와 본문 이미지 업로드/삽입을 연결한다. `https://` placeholder만 넣는 버튼은 완성으로 처리하지 않는다. 본문 이미지가 edit/preview/교사/도서관/PDF에서 실제 이미지로 나타나야 한다.
4. URL protocol 검사를 편집 DOM 생성과 보기 시트 모두에 적용한다. `src/app/(student)/resume/markdownEditorModel.tsx:215`와 `src/shared/ui/ResumeBookSheet/ResumeBookSheet.tsx:104`의 차이를 제거한다. HTML 붙여넣기는 임의 스크립트/위험 URL을 실행하지 않으며 직렬화 지원 범위 밖 텍스트도 조용히 소실시키지 않는다.
5. 한국어 IME, Enter/Shift+Enter, 스타일 조합, 링크/이미지의 앞뒤 cursor, undo/redo, 긴 문서를 검증한다. 고정 높이/overflow에 본문이 숨으면 열람 방식과 PDF 페이지 나눔 기준을 D02로 결정한다.
6. QR은 기존 외부 portfolioUrl 용도를 유지하며 새 slug와 혼동하지 않는다. 한국어/percent-encoding/길이 초과와 실제 디코딩을 검증한다. `src/shared/ui/QrCode/QrCode.tsx:17`의 여백 설정은 외관만으로 성공 판단하지 않는다.

단계 완료: T08~T12 중 학생 편집/preview/저장·재조회, 실제 이미지 표시, QR 디코딩 검증. 교사·도서관·PDF의 동일 콘텐츠 검증은 S06/S10/S09 제공 후 S11에서 수행한다. 해당 통합 검증 전 T10/T12 및 관련 R 전체는 미완료다. 라이브러리 교체/추가는 D02,D03 결정 없이 진행하지 않는다.

### S05. 학생 공개·제출 동작 연결

대상: `StudentResumePageContent.tsx`, `src/features/resume/api`, 학생 홈과 제출 현황 회귀.

1. 저장된 서버 공개 상태를 표시하고 학생 공개 스위치를 기존 `PATCH /resume/visibility`에 연결한다. 미저장 문서/요청 중/실패에서 상태를 명확히 처리한다.
2. 기존 제출/취소 API를 D04 정책에 맞춰 연결한다. 저장 완료 전 제출 순서, 미완성 조건, 이미 제출됨, 제출 후 편집, 취소 동작을 정한다.
3. 성공은 서버 응답 뒤 표시하고 실패는 원래 상태로 돌아가 재시도할 수 있어야 한다. 교사 변경과 경쟁하면 마지막 서버 저장값으로 재조회/동기화한다.
4. 교사 제출 현황/홈 완성도와의 반영을 검증한다. 공개 비활성화 후 공개 페이지/CDN/PDF 결과에 미치는 정책은 D06,D10을 따른다.

단계 완료: T13/T14 중 학생 공개 mutation·서버 상태 재조회·제출/취소 UI/API 검증. 공개와 제출은 독립 상태다. 교사 현황 일치는 S06 이후, 익명 공개 on 성공->off 차단은 S08 이후 S11에서 검증한다. 현재의 항상 404인 slug 페이지는 공개 off 성공 증거가 아니다.

### S06. 교사 본문·학생 검색·전공 소속·공개 상태 완성

대상: `src/app/(teacher)/students/page.tsx`, `students/[studentId]/page.tsx`, `majors/page.tsx`, `src/features/{resume,user,major}/api`.

1. 전체 이름 검색과 반별 검색을 실제 탐색 흐름으로 제공한다. 네 가지 서버 상태와 문서의 제출/미제출 표현을 D04로 대응한다.
2. D05에 따라 상세 URL의 studentId/resumeId를 통일하고 목록/직접 진입/새로고침 모두 동일 대상을 조회한다. 레주메 없는 학생, 삭제된 학생, 없는 ID, 권한 거부를 분리한다.
3. 공개 도서관 API로 비공개 학생 본문 접근을 우회하지 않는다. 합의된 교사 전용 조회로 문서/page ID/공개/제출 상태를 가져온 뒤 검토 UI를 연결한다.
4. D06 대상 지정 공개 mutation을 연결한다. 본인용 visibility API를 대상 지정 없이 교사 토큰으로 호출하지 않는다.
5. 전공별 학생 목록과 hasStudents를 실제 데이터로 산출하고 연도/반 필터를 연결한다. 가능하면 기존 전체 현황을 재사용하되 ID/이름만으로 식별 가능한지 D07로 확인한다.
6. 사용 중 전공 삭제와 중복 이름의 서버 오류를 처리한다. 선택 전공 삭제 후 학생/전공 선택 상태를 재조회하고 변경 실패를 성공처럼 표시하지 않는다.

단계 완료: T15~T18 중 실제 데이터가 있는 전공·교사 검토와 대상 공개 mutation/양측 재조회 검증. T17의 외부 cache 제한은 S08 이후 S11에서 수행한다. 현재 disabled 테스트 통과를 기능 완료로 계산하지 않는다.

### S07. 피드백 CRUD·위치·반영 흐름 완성

대상: 교사 상세, 학생 이력서 피드백 drawer, `src/features/feedback/api`, 기존 `Feedback`, `FeedbackBalloon` UI.

1. D08의 좌표/anchor·page ID 규칙을 적용해 교사가 원하는 위치에서 추가/수정/삭제한다. 변경/재배치/삭제된 페이지의 피드백을 잘못된 페이지에 그리지 않는다.
2. 생성/수정의 `feedbackId`/`id`, 미완료 `completedAt`, 삭제 페이지/nullable 필드, status enum을 서버 응답에 맞춰 정규화한다. 무조건 nullable을 허용하여 손상 데이터를 정상화하지 않는다.
3. 학생 피드백 카드에서 해당 페이지·위치로 이동하고 완료/미완료를 재조회로 보존한다. 표시 크기와 좌표가 달라도 anchor가 같은 문서 위치를 가리켜야 한다.
4. 일괄 반영 부분 실패는 성공 개수와 실패 항목/이유를 구분해 보여주고 실패한 대상만 재시도한다. 잘못된 target/다른 학생 피드백을 서버에서 거부하는지 검증한다.

완료: T19~T21. 새로고침과 교사/학생 세션 왕복 후 내용·위치·상태가 유지된다.

### S08. 공개 slug·공개 상태·metadata 연결

대상: `src/app/(public)/[portfolioSlug]/page.tsx`, `src/shared/lib/portfolioSlug.ts`, 새 공개 조회 API 경계, 확정 시 `src/app/{sitemap,robots}.ts`.

1. D09 발급/조회 계약을 사용하고 한글 canonical/인코딩/중복/예약어/변경 정책을 검증한다. 실제 경로 home/resume/library/students/majors/signup/component-showcase와 API 예약 경로를 포함한다. malformed percent-encoding이 500을 만들지 않게 한다.
2. on인 포트폴리오만 익명 조회한다. off/삭제/없는 slug는 합의된 404/접근 제한 응답이며 비공개 본문·내부 식별자가 HTML/RSC/metadata로 유출되지 않는다.
3. SSR metadata/공개 본문/canonical과 정책이 정해진 sitemap/robots/structured data를 연결한다. 메타데이터와 페이지 본문은 같은 공개 판정을 사용한다.
4. Workers/cache 정책과 공개 off/slug 변경의 무효화를 검증한다. HTML 도서관의 내부 숫자 ID URL은 외부 slug 위반으로 오인해 강제 이동하지 않는다.

완료: T22,T23. 현재 '없는 데이터 404' 회귀를 유지하면서 정상 공개 slug 성공 시나리오도 추가한다.

### S09. 서버 PDF 변환·레주메북 생성 연결

대상: 서버 계약; 프론트 `src/features/pdf/api`(계약 확정 후 신설 후보), 교사 도서관/변환 UI, `src/features/library/api`.

1. D10에서 변환 대상(연도/기수/학년/반/전공/제출/공개), 입력 문서 revision/snapshot, job 상태, 결과 book/file ID, 다운로드 권한을 확정한다. 엔드포인트 이름과 polling 간격은 아직 미정이다.
2. 교사 요청 UI, pending/진행/성공/부분 실패/실패, 중복 클릭 방지, 새로고침 후 상태 조회를 구현한다. retry/idempotency는 서버 지원과 맞춘다.
3. 완료 후 도서관 재조회 및 결과 열람/다운로드로 연결한다. 실패했거나 오래된 job의 결과를 성공한 최신 책으로 표시하지 않는다.
4. 서버가 실제 생성한 PDF로 필수 정보·한글 폰트·본문 스타일·링크·이미지·QR·긴 문서 페이지 분할·최종 학생 인덱스를 검증한다.

완료: T24~T26. 프론트에서 PDF 엔진을 임의 구현하지 않는다. 서버 작업 완료/실파일 검증 전까지 이 단계는 미완료다.

### S10. 내부 도서관·PDF Viewer·필터·빠른 이동 완성

대상: `src/app/(public)/library`, `resume-books/[bookId]`, `src/features/library/api`, 기존 sheet/공용 필터 UI. PDF Viewer 라이브러리는 D10 이후 사용자 결정 대상이다.

1. 학생/교사/미로그인 접근과 header를 일치시킨다. 현재 상세의 학생 nav 고정을 해소한다. 내부 상세와 실제 레주메북 상세를 D11에 따라 구분한다.
2. HTML adapter가 프로필 이미지, introTitle/상세 소개, skills, page type/project를 누락하지 않도록 서버 모델과 함께 보완한다. 지원되지 않는 서버 필드를 화면에서 가짜로 채우지 않는다.
3. date만 전달하는 카드 링크를 실제 book identity/cohort/year 계약으로 맞춰 같은 연도의 여러 그룹이 섞이지 않게 한다.
4. 전공/반 필터, 이름 검색, 페이지네이션을 연결한다. 패널의 임시 선택/적용/초기화/태그 제거는 `docs/UI_UX_DIRECTION.md:56` 기준을 따른다. 조건 변경 시 cursor·이전 요청 결과·중복 더 보기 처리를 검증한다.
5. 실제 PDF를 열고 다운로드한다. 반/학생 인덱스로 PDF의 정확한 페이지로 이동하고 현재 페이지/총 페이지, 실패/빈 상태/권한 만료를 처리한다.

완료: T27~T30. HTML 시트 성공만으로 PDF 열람 요구를 완료 처리하지 않는다.

### S11. 통합 QA·배포 게이트·최종 증거

대상: `.github/workflows/{ci,deploy}.yml`, `playwright.config.ts`, `wrangler.jsonc`, `vite.config.ts`, 배포 자격검사 script, 새 날짜 QA 보고서, 홈/알림/공통 UI 회귀.

1. 알림 유형/nullable/링크 계약을 적용하고 조회·읽음·삭제·대상 문서 이동을 회귀 검증한다. 홈은 저장/전공 변경 후 사용자 정보를 일관되게 표시한다.
2. lint/unit/typecheck/Next build+E2E/vinext build를 같은 SHA 기준으로 확인한다. `pnpm check`만 실행하고 전체 검증 완료라고 하지 않는다. CI 성공 전에 deploy가 실행되지 않게 workflow를 연결한다. 단계에서 이월한 T10/T12의 교사·도서관·PDF 일치, T13/T17의 익명 공개 on 성공->off 차단을 실행해 통합 대장을 닫는다.
3. 폐기 가능한 staging 리소스/학생·교사 계정에서 실제 흐름을 검증한다. HTTPS->HTTP proxy, SSR/RSC, 직접 새로고침, CDN/KV 공개 무효화, 업로드 이미지 접근을 Workers에서 확인한다.
4. 현재 KV ID/IMAGES 선언은 존재한다(`wrangler.jsonc:15`). 과거 누락 경고를 그대로 재현 사실로 적지 않는다. credential validation의 read 성공/404 허용만으로 deploy/write 권한이 있다고 판단하지 않는다.
5. 1440x900, 1920x1080, 390x844와 기존 태블릿 회귀에서 긴 한글/실이미지/컨트롤 겹침/키보드/focus/reduced motion을 확인한다. 모바일 전면 재디자인은 이번 기본 방어 범위 밖이다.
6. 실패 로그/trace/screenshot/PDF/job 결과를 커밋과 함께 남기고, 비밀값 없이 장애 확인·rollback·배포 smoke 절차를 문서화한다. 실제 배포/원격 리소스 생성은 구체적인 대상과 기존 권한을 확인한 실행 단계다.

완료: T31~T35. 실행하지 못한 live/PDF/Workers 항목은 명시적 gap으로 남기며 MVP 완료를 선언하지 않는다.

## 위험과 대응

| 위험 | 근거 | 대응/검증 |
| --- | --- | --- |
| 비동기 draft 덮어쓰기·늦은 응답 | `src/app/(student)/resume/StudentResumePageContent.tsx:487`, `:795`, `:967` | S03 먼저 회귀 재현, T05/T06 |
| 문서 표현/저장/PDF 불일치 | Markdown/이미지 링크/고정 높이, R05~R08 | D02,D03와 round trip/실 PDF T09~T11,T25 |
| 다른 학생/교사 대상 변경 | studentId/resumeId 혼동, 본인 visibility API | D05,D06 및 실제 ownership T16,T17 |
| 비공개 콘텐츠 cache 잔존 | `vite.config.ts:11`, `wrangler.jsonc:12` | 공개 off/삭제/slug 변경 T22,T34,T35 |
| mock 성공을 제품 성공으로 계산 | disabled/empty-state E2E | T19,T25,T29의 데이터 있는 live 증거 |
| 테스트가 운영 변경 요청을 보냄 | hardcoded API origin, 미등록 요청 차단 없음 | S01 mock 격리 후 live 분리 |
| 검증 실패 커밋 배포 | CI/deploy 독립 workflow | S11 동일 SHA 게이트 T35 |
| 미확정 기술 선택/새 종속성 도입 | `docs/TECH_STACK.md:30` | D02,D10의 사용자 기술 결정 후에만 채택 |
| 서버 의존으로 전체 작업 정지 | D05,D09,D10,D11 | 독립 UI race/fixture/파서/문서 작업 지속, 계약 없음은 blocked 표기 |

## 범위 밖과 후속 결정

외부 기업용 고급 탐색, 완전 자유형 사이트 빌더, 관리자/졸업생 정책의 신규 제품 구현, 모바일 전면 최적화, 에디터 전체 교체, 강제 페이지 삭제/정렬 기능, 신규 analytics/coverage 라이브러리 도입은 이번 계획의 확정 구현 범위 밖이다. 관련 질문은 D14로 보존한다. 공개 off 기본 동작/slug 기본 조회/PDF 요구는 후순위 고도화에 포함시켜 누락하지 않는다.

## 실행 인계와 역할

기본 실행은 Codex App에서 한 소유자가 S 작업을 수행하고 필요할 때 bounded native subagent를 사용한다. 현재 세션에서 `omx team`을 실행했다고 가정하지 않는다. 외부 API 근거가 필요하면 researcher, repo 사실은 explorer, 기술 선정은 dependency-expert를 배정한다.

| 독립 lane | 역할과 권장 reasoning | 소유 파일/선행 조건 |
| --- | --- | --- |
| 데이터 보존/작성 | executor high | S03~S05 학생 resume/관련 테스트 |
| 교사/피드백 | executor high | S06~S07 교사 route/feedback, D05~D08 후 |
| 공개/도서관 | executor high | S08~S10 public route/library, D09~D11 후 |
| 검증/배포 | test-engineer medium, verifier high | S01/S11 설정/fixture/QA 증거 |
| 독립 계획 검토 | critic 또는 momus | 계획 읽기 전용, 구현 결과 승인과 분리 |

같은 `StudentResumePageContent.tsx`, shared sheet, 공통 auth client는 여러 lane이 동시에 수정하지 않는다. shared 타입/계약 변경은 소유자가 먼저 통합하고 이후 종속 작업을 진행한다. 단순 작업은 직접 수행한다. durable goal이나 OMX team 런타임은 사용자가 명시적으로 선택할 때 해당 surface에서 실행한다.

## 최종 완료 체크리스트

- [ ] R01~R29마다 해당 T 검증의 최신 결과와 아티팩트가 있다.
- [ ] D01~D13 중 구현을 막는 결정은 합의/서버 증거가 있다. D14 후순위는 의도적으로 남는다.
- [ ] 학생 새 작성·저장·새 세션 재조회·제출·공개가 실제 서버에서 이어진다.
- [ ] 교사가 비공개 본문 조회·전공별 조회·피드백 CRUD·공개 변경을 수행한다.
- [ ] 공개 slug on/off와 cache/metadata 판정이 일치한다.
- [ ] 서버 PDF job 완료 후 실파일의 열람·다운로드·학생/반 이동이 된다.
- [ ] mock/live 및 Next/Workers 검증 결과가 구분되어 있고 실패를 생략하지 않았다.
- [ ] lint/unit/typecheck/build/E2E와 같은 SHA 배포 게이트가 통과한다.
- [ ] 문서·API 전제·실제 라우트·미결정 사항이 현재 상태를 설명한다.

## 계획 검토 기록

2026-10-01, 요구사항·UI·API·테스트/인프라 조사 결과를 S00~S11/R01~R29/T00~T35/D01~D14로 연결했다.

- 독립 읽기 전용 momus 검토: 최초 `ITERATE`, 보완 후 `OKAY`. 핵심 MVP 추적표 포함 여부와 확인한 코드 근거의 일치를 검토했다.
- 반영한 지적: S04/S05의 후속 화면 의존 검증을 S11로 분리, 공개 on 성공 후 off 차단 순서 명시, T00 문서 대조 명령과 T25 PDF 검사 절차 및 T30 다중 페이지 학생 fixture/assertion 구체화.
- 참조 검사: 코드/문서 `path:line` 142개 존재·줄 범위 유효, 상대 링크 8개 유효, R 29개/S 12개/T 36개/D 14개 정의 및 참조 일치, 문서 공백·코드 fence 검사와 `git diff --check` 통과.
- 계획 완료의 한계: 서버 계약 D01~D13 중 미확정 부분은 후속 작업의 시작 조건으로 남는다. 계획 검토는 구현 완료·실서버 동작·production build·E2E·실 PDF 검증을 대신하지 않는다.
