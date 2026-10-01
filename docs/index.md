# Repo-V2 문서 인덱스

이 디렉터리는 Repo-V2의 제품 이해, 요구사항, 구조, 품질 기준을 정리하는 프로젝트 하네스입니다.

## 현재 상태

2026-10-01 코드 대조 기준입니다. 구현 연결 여부와 실제 서버 검증 완료를 구분합니다.

- Next.js App Router + React + TypeScript 앱이며 `pnpm`과 ESLint를 사용한다. 개발/E2E는 Next, 배포 빌드는 vinext + Cloudflare Workers 구성이다.
- 학생 홈·이력서 저장/자동저장·프로필/프로젝트 이미지 업로드, 교사 학생 현황·전공 CRUD, 도서관 HTML 열람 화면과 API가 연결되어 있다.
- Playwright 설정과 `test:e2e`, Node 기반 `test:unit` 명령이 존재한다. 설정 존재는 테스트 통과나 MVP 완료를 뜻하지 않는다.
- 공개 slug 조회, 교사 본문/피드백, 제출·공개 UI, PDF 변환/Viewer 등 남은 작업은 [MVP 실행 계획](exec-plans/001-mvp-completion-20261001.md)의 S00~S11을 따른다.
- PDF 변환 책임은 서버로 확정했다. 요청/상태/결과 API와 Viewer 선택, 에디터 저장 포맷, 상태 관리, form/validation은 [계약 및 결정 목록](exec-plans/003-mvp-contract-decisions-20261001.md)의 D02/D10 등 후속 결정으로 남긴다.
- Figma 기반 화면과 공통 UI가 구현되어 있다. 디자인 기준은 [DESIGN.md](../DESIGN.md)와 [디자인 시스템](DESIGN_SYSTEM.md), 현재 URL은 [프론트 구조](FRONTEND_ARCHITECTURE.md)를 따른다.

초기 문서 하네스의 '제품 기능 구현 전' 및 구현 제외 표현은 당시 범위의 기록이다. 현재 작업 범위는 요구사항과 승인된 실행 계획으로 판단한다. [2026-09-20 QA](QA_REPORT_2026-09-20.md)의 이미지 HOLD도 과거 판정이며, 현재 multipart 구현과 실환경 검증의 공백은 [기술 스택](TECH_STACK.md)에서 구분한다.

## 추천 읽기 순서

1. `PRODUCT_VISION.md`
2. `REQUIREMENTS.md`
3. `USER_ROLES.md`
4. `USER_FLOWS.md`
5. `FRONTEND_ARCHITECTURE.md`
6. `TECH_STACK.md`
7. `UI_UX_DIRECTION.md`
8. `DESIGN_SYSTEM.md`
9. `PUBLISHING.md`
10. `QUALITY.md`
11. `TESTING.md`
12. `LOCAL_ENVIRONMENT.md`
13. `DECISIONS.md`
14. `GIT_WORKFLOW.md`
15. `exec-plans/README.md`

## 문서 역할

| 문서 | 역할 |
| --- | --- |
| `PRODUCT_VISION.md` | 서비스가 해결하려는 문제와 핵심 가치 |
| `REQUIREMENTS.md` | MVP 요구사항, 후순위, non-goals, API 전제 |
| `USER_ROLES.md` | 학생/선생님/내부 사용자/외부 사용자 역할 |
| `USER_FLOWS.md` | 실제 사용 흐름 |
| `DECISIONS.md` | 결정 로그와 미결정 사항 |
| `GIT_WORKFLOW.md` | 커밋, 이슈, PR 운영 기준 |
| `TECH_STACK.md` | 현재 기술 구성과 미정 기술의 후보 비교 기준 |
| `FRONTEND_ARCHITECTURE.md` | 현재 라우트/런타임과 후속 구조 방향 |
| `UI_UX_DIRECTION.md` | 제품 UI/UX 방향 |
| `DESIGN_SYSTEM.md` | 구현된 토큰/공통 UI와 남은 디자인 결정 |
| `PUBLISHING.md` | Figma 퍼블리싱 기준 |
| `QUALITY.md` | 품질 기준 |
| `TESTING.md` | 테스트 전략 |
| `LOCAL_ENVIRONMENT.md` | 로컬 개발 환경 정리 |
| `exec-plans/` | 승인된 실행 계획, 테스트 명세, 계약 결정 목록 |

## 문서 관리 규칙

- 새로운 사실은 가장 가까운 주제 문서에 먼저 반영한다.
- 확정된 중요한 결정은 `DECISIONS.md`에도 기록한다.
- 불확실한 내용은 단정하지 않고 `TODO` 또는 `Open Question`으로 남긴다.
- `MVP_SCOPE.md`와 `API_CONTRACTS.md`는 초기에는 별도 문서로 만들지 않는다.
  - MVP 범위는 `REQUIREMENTS.md`에 포함한다.
  - API 전제와 도메인 초안은 `REQUIREMENTS.md`와 `FRONTEND_ARCHITECTURE.md`에 포함한다.
