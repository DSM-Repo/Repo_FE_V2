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

## 2026-05-27 — 초기 기술 스택 결정은 후보 비교로 시작한다

- Decision: 초기 하네스에서는 기술 스택을 확정하지 않고 후보 비교 기준만 정리한다.
- Context: 핵심 기능이 문서형 에디터, PDF 변환, Figma 구현, API 연동과 밀접하다.
- Alternatives:
  - 지금 바로 스택을 확정한다.
  - 후보 비교 기준을 먼저 정리한다.
- Reason: 문서형 에디터와 PDF 변환 안정성이 제품 핵심에 직접 영향을 주므로 충분한 비교가 필요하다.
- Risk: 결정이 늦어지면 구현 착수가 지연될 수 있다.
- Status: Narrowed by 2026-06-04 decisions. 기본 프론트 스택은 확정했고, editor/PDF/state/form 계열은 추가 결정이 필요하다.
- Follow-up: `TECH_STACK.md` 기준으로 남은 후보를 비교한다.

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
- Context: 초기에는 Vite + React + TypeScript 단일 앱이었고, 이후 Next.js App Router로 전환했다.
- Alternatives:
  - 기존 `npm`과 `package-lock.json`을 유지한다.
  - `yarn` 또는 `bun`을 사용한다.
- Reason: 초기 전환 비용이 작고, 설치 속도, 디스크 효율, 의존성 엄격성, 향후 workspace/monorepo 확장성 측면에서 `pnpm`이 적합하다.
- Risk: 팀원이 `pnpm` 또는 Corepack 사용에 익숙하지 않으면 초기 온보딩 비용이 생길 수 있다.
- Follow-up: `package.json`의 `packageManager` 필드와 `pnpm-lock.yaml`을 기준으로 로컬/CI 명령을 통일한다.

## 2026-06-04 — 초기 프론트엔드 scaffold는 React + TypeScript + Vite였다

- Decision: Repo-V2의 초기 scaffold는 React + TypeScript + Vite 기반이었다.
- Context: 당시 프로젝트가 Vite, React, TypeScript, ESLint 기반으로 구성되어 있었다.
- Alternatives:
  - Next.js로 전환한 뒤 퍼블리싱을 시작한다.
  - 프레임워크 후보 비교를 끝낼 때까지 퍼블리싱을 보류한다.
- Reason: 초기 scaffold로는 빠른 시작과 단순성이 좋았다.
- Risk: 이후 SSR/SSG, 서버 컴포넌트, 파일/이미지 처리, 라우팅 정책에서 Next.js가 더 적합하다고 판단되면 전환 비용이 생길 수 있다.
- Status: Superseded by `2026-06-09 — Next.js App Router 전환 구현`.
- Follow-up: 문서형 에디터, PDF 변환, 상태 관리, form/validation은 순차적으로 결정한다.

## 2026-06-04 — Next.js App Router로 전환한다

- Decision: Repo-V2는 Vite scaffold에서 Next.js App Router 기반으로 전환한다.
- Context: Repo-V2는 장기적으로 학생 포트폴리오와 레주메북을 외부에 보여주는 제품을 지향하며, SEO뿐 아니라 GEO/AEO 대응도 중요하다.
- Alternatives:
  - Vite SPA를 유지한다.
  - React Router 또는 TanStack Router를 도입한다.
- Reason: Next.js는 라우팅뿐 아니라 metadata, sitemap, robots, server/static rendering, structured data 전략을 함께 가져갈 수 있어 공개 포트폴리오/레주메북 제품 방향에 더 적합하다.
- Risk: 기존 Vite scaffold에서 전환 비용이 생기고, 내부 인증/에디터 화면에서 Client Component 경계 관리가 필요하다.
- Follow-up: public/internal layout, sitemap, robots, JSON-LD 기준을 구체화한다.

## 2026-06-09 — Next.js App Router 전환 구현

- Decision: Vite scaffold를 제거하고 Next.js App Router 기반 실행 환경으로 전환했다.
- Context: 퍼블리싱을 시작하기 전 프레임워크 기준을 고정해야 재작업을 줄일 수 있다.
- Changed:
  - `next dev`, `next build`, `next start` scripts로 전환
  - `src/app/layout.tsx`, `src/app/(public)/page.tsx`, `src/app/(public)/[portfolioSlug]/page.tsx` 생성
  - Vite config/entry 제거
- Reason: 공개 페이지 SEO/GEO/AEO와 slug 기반 공개 URL을 Next.js App Router 기준으로 시작하기 위함이다.
- Risk: Playwright, sitemap, robots, JSON-LD, public/internal layout 세부 기준은 아직 별도 작업이 필요하다.
- Follow-up: 퍼블리싱 첫 화면 전 Playwright smoke 설정과 metadata/structured data 기준을 확정한다.

## 2026-06-04 — 테스트 도구는 Playwright로 시작한다

- Decision: Repo-V2의 핵심 테스트 도구는 `Playwright`로 시작한다.
- Context: 사용자는 Playwright 경험이 있고, test는 항상 포함하기를 원한다.
- Alternatives:
  - Vitest + Testing Library를 먼저 도입한다.
  - 테스트 도구 결정을 미룬다.
- Reason: Repo-V2는 사용자 흐름, 권한별 라우팅, 공개 페이지, PDF/도서관 흐름 검증이 중요하므로 제품 관점 E2E/acceptance test를 우선하는 것이 적합하다.
- Risk: 세밀한 unit test가 필요한 영역에서는 Playwright만으로 테스트 비용이 커질 수 있다.
- Follow-up: unit/component test가 필요한 시점에 Vitest 또는 Testing Library 추가 도입을 검토한다.

## 2026-06-09 — 1차 퍼블리싱은 웹 데스크톱 기준으로 진행한다

- Decision: Repo-V2 1차 퍼블리싱은 `1440 × 900`부터 `1920 × 1080`까지의 웹 데스크톱 화면을 기준으로 한다.
- Context: 사용자는 모바일/태블릿보다 웹 데스크톱 기준의 완성도를 우선하고 싶다.
- Alternatives:
  - 모바일까지 MVP 반응형 범위에 포함한다.
  - 모든 breakpoint를 동시에 설계한다.
- Reason: 초기 퍼블리싱 속도와 화면 완성도를 높이기 위해 우선 기준을 좁힌다.
- Risk: 모바일/태블릿 사용성은 후속 작업으로 밀린다.
- Follow-up: 1차 퍼블리싱 후 모바일/태블릿 최적화 필요성을 재검토한다.

## 2026-06-09 — UI 참고 영상과 headless 컴포넌트 전략을 참고한다

- Decision: UI 논의에는 `https://www.youtube.com/watch?v=fR8tsJ2r7Eg` 참고 영상을 사용하고, 컴포넌트는 headless/primitive 기반 전략을 우선 검토한다.
- Context: 사용자는 UI 컴포넌트 내부에 비즈니스 로직을 최소화하는 방향을 선호한다.
- Alternatives:
  - 모든 UI를 직접 구현한다.
  - shadcn/ui 같은 완성형 조합을 그대로 사용한다.
- Reason: 접근성과 재사용성을 확보하면서 feature 로직과 UI primitive를 분리하기 좋다.
- Risk: primitive 기반 구현은 초기 조립 비용이 생길 수 있다.
- Follow-up: Radix UI 도입 여부와 shared UI wrapper 기준을 확정한다.

## 2026-06-09 — 공개 포트폴리오 URL은 slug 기반으로 설계한다

- Decision: 공개 포트폴리오 URL은 `studentId` 노출 대신 사용자 친화적인 slug 기반으로 설계한다.
- Context: Repo-V2는 장기적으로 학생 포트폴리오를 외부에 보여주는 제품이며, 사용자가 읽고 공유하기 쉬운 URL이 중요하다.
- Alternatives:
  - `/portfolios/[studentId]`처럼 내부 식별자 기반 URL을 사용한다.
  - UUID 또는 숫자 ID 기반 URL을 사용한다.
- Reason: slug 기반 URL은 학생 이름/브랜드를 드러내기 쉽고, 외부 공유 및 SEO/GEO/AEO 맥락에서 더 사용자 친화적이다.
- Risk: 한글 slug는 내부적으로 percent-encoding될 수 있고, 중복/예약어/변경/redirect 정책이 필요하다.
- Follow-up: slug unique 정책, 예약어, 변경 이력, redirect 정책을 백엔드/API 설계 때 결정한다.

## 2026-06-09 — 퍼블리싱 mock data는 단순 object로 시작한다

- Decision: 백엔드/API 설계 전 퍼블리싱 단계의 mock data는 단순 object로 시작하고, MSW는 바로 도입하지 않는다.
- Context: 현재 목적은 화면 구조와 상태 표현을 빠르게 확인하는 것이다.
- Alternatives:
  - MSW를 즉시 도입한다.
  - mock API 서버를 별도로 만든다.
- Reason: 초기 퍼블리싱에는 네트워크 계층 시뮬레이션보다 단순하고 빠른 mock object가 더 적합하다.
- Risk: API 에러/지연/실패 시나리오 검증은 부족할 수 있다.
- Follow-up: API 연동 또는 E2E 시나리오가 구체화되면 MSW 도입을 재검토한다.

## 2026-06-09 — 퍼블리싱 작업은 GitHub Issue Form으로 관리한다

- Decision: 퍼블리싱/디자인 시스템/UI 컴포넌트 작업은 `.github/ISSUE_TEMPLATE/01-publishing-task.yml` Issue Form을 기본 템플릿으로 사용한다.
- Context: 퍼블리싱 작업은 디자인 기준, 구현 범위, 완료 기준, 검증 명령이 매번 함께 고정되어야 한다.
- Alternatives:
  - Markdown issue template만 사용한다.
  - blank issue를 허용한다.
- Reason: GitHub Issue Form은 필수 입력과 체크박스를 통해 작업 기준 누락을 줄일 수 있어 Repo-V2의 AI native 작업 흐름에 더 적합하다.
- Risk: template chooser 반영은 해당 파일이 GitHub 기본 브랜치에 push된 뒤 웹 UI에서 확인할 수 있다.
- Follow-up: 실제 작업 흐름을 보며 field와 label을 조정한다.

## 2026-06-09 — typography token을 CSS variable과 utility class로 시작한다

- Decision: 1차 퍼블리싱 typography token은 `src/shared/styles/typography.css`의 CSS variable과 utility class로 관리한다.
- Context: 퍼블리싱 첫 작업은 Figma typography 표를 코드 기준으로 고정하는 디자인 시스템 작업이다.
- Alternatives:
  - 문서에만 typography 표를 둔다.
  - TypeScript token object만 둔다.
  - CSS-in-JS 또는 styling library 도입 후 token을 정의한다.
- Reason: 현재 styling library가 확정되지 않았으므로 CSS variable은 Next.js 전역 style과 잘 맞고, utility class는 퍼블리싱 중 빠르게 적용하기 쉽다.
- Risk: 색상/spacing/radius token과 component variant 체계는 아직 별도 확정이 필요하다.
- Follow-up: Figma 전체 token이 확정되면 typography 외 token도 같은 방식으로 확장한다.

## 2026-06-09 — color token을 CSS variable로 시작한다

- Decision: 1차 퍼블리싱 color token은 `src/shared/styles/colors.css`의 CSS variable로 관리한다.
- Context: 퍼블리싱을 진행하려면 Figma 색상표를 코드와 문서의 단일 기준으로 고정해야 한다.
- Alternatives:
  - 색상표를 문서에만 둔다.
  - 컴포넌트별로 hex 값을 직접 사용한다.
  - styling library 확정 후 token을 정의한다.
- Reason: CSS variable은 현재 Next.js 전역 style과 잘 맞고, styling library 결정 전에도 안정적으로 재사용할 수 있다.
- Risk: semantic color alias와 component state color 체계는 실제 컴포넌트 구현 중 추가 정리가 필요하다.
- Follow-up: Button/Input/Status 등 공통 컴포넌트 구현 시 semantic token을 보강한다.

## Open Questions

- 관리자 역할 분리가 필요한가?
- PDF 변환 책임을 어느 계층에 둘 것인가?
- 문서형 에디터 저장 포맷은 무엇으로 할 것인가?
- Next.js API route/server action을 사용할 것인가, 별도 백엔드 API만 사용할 것인가?
- 공개 URL slug 중복/예약어/변경/redirect 정책은 어떻게 관리할 것인가?
