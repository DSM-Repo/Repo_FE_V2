# Decisions

중요한 제품/기술/구조 결정을 기록합니다.

## 결정 기록 형식

```md
## YYYY-MM-DD — 결정 제목

- Decision:
- Context:
- Alternatives:
- Reason:
- Risk:
- Follow-up:
```

## 2026-05-27 — 단일 프론트엔드 앱으로 시작한다

- Decision: Repo-V2는 단일 앱 + 권한별 라우팅 + feature 단위 분리로 시작한다.
- Context: 학생/선생님/도서관 기능 사이에 공통 UI, 공통 API, 공통 비즈니스 로직이 많다.
- Alternatives:
  - 레거시처럼 `student`, `teacher`, `main` 앱을 분리한다.
  - 단일 앱 안에서 역할별 route를 분리한다.
- Reason: URL과 배포 환경을 꼭 분리할 필요가 없고, 초기 유지보수와 공통 기능 재사용 측면에서 단일 앱이 유리하다.
- Risk: 선생님 전용 기능이 커질 경우 route guard와 feature 경계를 엄격히 관리해야 한다.
- Follow-up: 백엔드 authorization과 프론트 route guard 기준을 함께 설계한다.

## 2026-05-27 — 기술 스택 최종 확정은 보류한다

- Decision: 초기 하네스에서는 기술 스택을 확정하지 않고 후보 비교 기준만 정리한다.
- Context: 핵심 기능이 문서형 에디터, PDF 변환, Figma 구현, API 연동과 밀접하다.
- Alternatives:
  - 지금 바로 스택을 확정한다.
  - 후보 비교 기준을 먼저 정리한다.
- Reason: 문서형 에디터와 PDF 변환 안정성이 제품 핵심에 직접 영향을 주므로 충분한 비교가 필요하다.
- Risk: 결정이 늦어지면 구현 착수가 지연될 수 있다.
- Follow-up: `TECH_STACK.md` 기준으로 후보를 비교한다.

## 2026-05-27 — MVP와 API 계약 문서는 초기에는 분리하지 않는다

- Decision: `MVP_SCOPE.md`와 `API_CONTRACTS.md`는 초기에는 별도 작성하지 않는다.
- Context: MVP 범위는 요구사항과 강하게 붙어 있고, API 상세 계약은 아직 백엔드 설계 전이다.
- Reason: 초기 문서 중복을 줄이기 위해 MVP는 `REQUIREMENTS.md`, API 전제는 `REQUIREMENTS.md`와 `FRONTEND_ARCHITECTURE.md`에 흡수한다.
- Follow-up: 백엔드 상세 설계가 시작되면 `API_CONTRACTS.md`를 분리할 수 있다.

## 2026-05-28 — 커밋 메시지는 Udacity 기반 Repo-V2 형식을 사용한다

- Decision: 커밋 제목은 `type(#이슈번호) :: 커밋 내용` 형식을 사용하고, 내용은 명사형 또는 작업 결과 중심의 짧은 구문으로 작성한다.
- Context: Udacity Git Commit Message Style Guide를 참고하되, GitHub 이슈 번호를 제목에서 바로 확인하고 싶다.
- Alternatives:
  - Udacity 원문처럼 `type: Subject`만 사용한다.
  - Conventional Commits 형식만 사용한다.
- Reason: 이슈 기반 작업 흐름과 커밋 히스토리 가독성을 함께 유지하기 좋다.
- Risk: 이슈가 없는 초기 작업은 형식이 어색할 수 있다.
- Follow-up: Issue/PR 템플릿이 준비되면 `GIT_WORKFLOW.md`에 반영한다. 커밋 제목에서는 `~한다`, `~했다`, `~하기` 같은 서술형 표현을 피한다.

## 2026-06-04 — 패키지 매니저는 pnpm을 사용한다

- Decision: Repo-V2는 패키지 매니저로 `pnpm`을 사용한다.
- Context: 현재 프로젝트는 Vite + React + TypeScript 단일 앱이며, 기술 스택을 확정하고 퍼블리싱을 시작할 준비를 하고 있다.
- Alternatives:
  - 기존 `npm`과 `package-lock.json`을 유지한다.
  - `yarn` 또는 `bun`을 사용한다.
- Reason: 초기 전환 비용이 작고, 설치 속도, 디스크 효율, 의존성 엄격성, 향후 workspace/monorepo 확장성 측면에서 `pnpm`이 적합하다.
- Risk: 팀원이 `pnpm` 또는 Corepack 사용에 익숙하지 않으면 초기 온보딩 비용이 생길 수 있다.
- Follow-up: `package.json`의 `packageManager` 필드와 `pnpm-lock.yaml`을 기준으로 로컬/CI 명령을 통일한다.

## 2026-06-04 — 초기 프론트엔드 기본 스택은 React + TypeScript + Vite로 시작한다

- Decision: Repo-V2의 퍼블리싱과 초기 프론트엔드 구현은 React + TypeScript + Vite 기반으로 시작한다.
- Context: 현재 프로젝트가 이미 Vite, React, TypeScript, ESLint 기반으로 구성되어 있고, 퍼블리싱을 시작할 수 있는 상태다.
- Alternatives:
  - Next.js로 전환한 뒤 퍼블리싱을 시작한다.
  - 프레임워크 후보 비교를 끝낼 때까지 퍼블리싱을 보류한다.
- Reason: 현재 핵심 과제는 학생/선생님/도서관 화면을 빠르게 퍼블리싱하며 제품 흐름을 검증하는 것이고, Vite 기반 React 앱은 초기 구현 속도와 단순성이 좋다.
- Risk: 이후 SSR/SSG, 서버 컴포넌트, 파일/이미지 처리, 라우팅 정책에서 Next.js가 더 적합하다고 판단되면 전환 비용이 생길 수 있다.
- Follow-up: Next.js 도입 여부는 별도 검토한다. 문서형 에디터, PDF 변환, 상태 관리, form/validation, 테스트 도구는 순차적으로 결정한다.

## Open Questions

- 관리자 역할 분리가 필요한가?
- PDF 변환 책임을 어느 계층에 둘 것인가?
- 문서형 에디터 저장 포맷은 무엇으로 할 것인가?
- Next.js 도입이 Repo-V2의 인증/권한 라우팅, PDF 변환, 파일 처리, 배포 구조에 실질적 이득을 주는가?
