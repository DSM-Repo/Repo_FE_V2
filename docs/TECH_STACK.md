# Tech Stack Evaluation

이 문서는 Repo-V2 기술 스택의 확정 항목과 아직 검토가 필요한 항목을 구분해 정리합니다.

## 확정된 기본 프론트엔드 스택

2026-06-09 기준, Repo-V2는 장기적으로 외부에 보여주는 포트폴리오/레주메북 제품을 지향하므로 SEO/GEO/AEO 대응이 가능한 Next.js App Router 기반으로 전환 완료했습니다.

| 영역 | 결정 | 근거 |
| --- | --- | --- |
| Package Manager | `pnpm` | 설치 속도, 디스크 효율, 의존성 엄격성, 향후 workspace/monorepo 확장성 |
| Framework | Next.js App Router | 공개 포트폴리오/레주메북의 SEO/GEO/AEO, metadata, sitemap, server rendering 전략에 적합 |
| App Runtime | React | Next.js의 기반 런타임이며 컴포넌트 기반 퍼블리싱에 적합 |
| Language | TypeScript | 타입 안정성과 AI/사람 모두의 코드 이해 가능성 향상 |
| Lint | ESLint | 현재 프로젝트 검증 명령으로 사용 |
| E2E / Acceptance Test | Playwright | 사용자 흐름, 권한별 라우팅, 공개 페이지, PDF/도서관 흐름 검증에 적합 |

현재 `package.json` 기준 주요 버전 범위:

- `next`: `^16.2.7`
- `react`: `^19.2.6`
- `react-dom`: `^19.2.6`
- `typescript`: `~6.0.2`
- `eslint`: `^9.39.4`
- `eslint-config-next`: `^16.2.7`
- `pnpm`: `packageManager` 필드로 고정

TODO: Playwright 설정과 `test:e2e` script는 다음 작업 단위에서 반영한다.

## 아직 확정하지 않은 항목

- 문서형 에디터 라이브러리 또는 직접 구현 여부
- PDF 변환 방식
- 상태 관리 라이브러리
- form/validation 라이브러리
- CI에서 실행할 최소 검증 명령

## 최우선 평가 기준

### 문서형 에디터 구현 난이도

서비스 핵심은 이력서/포트폴리오 작성 경험입니다. 따라서 editor/form/document 관련 선택을 신중히 해야 합니다.

비교 기준:

- 텍스트 스타일링 지원
- 이미지/링크/인용 지원
- block 기반 구조 지원 여부
- 저장/복원 안정성
- 피드백 연결 가능성
- PDF 변환과의 궁합
- 커스터마이징 난이도

### Figma 디자인 구현 정확도

Repo-V2는 UI/UX 변화가 크므로 디자인 구현 정확도가 중요합니다.

비교 기준:

- 컴포넌트 단위 구현 편의성
- 디자인 토큰 적용 편의성
- 반응형 구현 난이도
- 애니메이션/상호작용 구현 난이도

## 비즈니스 로직 평가 기준

- 백엔드 API 연동 편의성
- 배포/성능/SEO 기준
- 유지보수성과 확장성
- 권한별 라우팅 구성 편의성
- form 상태 관리와 validation 구성 편의성

## 후보를 비교할 때 확인할 질문

- 문서형 에디터를 직접 만들 것인가, 라이브러리를 사용할 것인가?
- PDF 변환은 브라우저 렌더링 기반인가, 서버 렌더링 기반인가?
- 에디터 저장 포맷과 PDF 변환 포맷 사이의 변환 비용은 어느 정도인가?
- Figma 디자인을 컴포넌트 시스템으로 안정적으로 옮길 수 있는가?
- 팀원이 빠르게 개발할 수 있는가?

## TODO

- 문서형 에디터 후보 정리
- PDF 변환 방식 후보 정리
- 상태 관리/form 라이브러리 후보 정리
- Playwright 설정 및 테스트 스크립트 추가

## Next.js 결정 메모

Next.js는 단순 라우팅 라이브러리가 아니라 프레임워크 전환입니다. Repo-V2는 장기적으로 외부 공개 포트폴리오/레주메북을 제공할 가능성이 크고, SEO/GEO/AEO 대응이 제품 가치에 포함되므로 Next.js App Router를 채택합니다.

Next.js에서 우선 활용할 영역:

- 공개 포트폴리오/레주메북 페이지의 metadata
- sitemap / robots
- JSON-LD structured data
- semantic content 구조
- 공개 페이지의 server/static rendering
- 내부 인증/에디터 화면은 필요 구간만 Client Component로 분리

## Non-decision

이 문서는 확정된 기본 프론트엔드 스택을 기록하지만, editor/PDF/form/state 등 미결정 항목은 확정하지 않습니다.

## Decisions

### 2026-06-04 — Package Manager

- Decision: Repo-V2는 패키지 매니저로 `pnpm`을 사용한다.
- Reason: 초기 전환 비용이 작고, 설치 속도/디스크 효율/의존성 엄격성/향후 workspace 확장성 측면에서 적합하다.
- Constraint: 최종 기술 스택 결정은 사용자가 한다.
- Follow-up: `package.json`의 `packageManager` 필드와 `pnpm-lock.yaml`을 기준으로 개발/CI 명령을 통일한다.

### 2026-06-04 — Frontend Base Stack

- Decision: 초기 scaffold는 React + TypeScript + Vite 기반이었다.
- Reason: 당시 프로젝트가 이미 해당 조합으로 구성되어 있었고, 초기 scaffold로 빠르게 시작하기에 적합했다.
- Status: Superseded by `2026-06-09 — Next.js App Router 전환 구현`.
- Follow-up: 문서형 에디터, PDF 변환, 상태 관리, form/validation, 테스트 도구를 순차적으로 결정한다.

### 2026-06-04 — Next.js App Router 전환 결정

- Decision: Repo-V2는 Vite scaffold에서 Next.js App Router 기반으로 전환한다.
- Reason: 장기적으로 학생 포트폴리오/레주메북을 외부에 보여주는 제품이므로 SEO/GEO/AEO 대응, metadata, sitemap, structured data, server/static rendering 전략이 중요하다.
- Constraint: 실제 마이그레이션은 `2026-06-09 — Next.js App Router 전환 구현` 작업 단위에서 수행했다.
- Follow-up: public/internal layout, sitemap, robots, JSON-LD 기준을 구체화한다.

### 2026-06-04 — Test Tool

- Decision: Repo-V2의 핵심 테스트 도구는 `Playwright`로 시작한다.
- Reason: 사용자 경험 흐름, 권한별 라우팅, 공개 페이지, PDF/도서관 흐름처럼 제품 관점 acceptance test가 중요하고, 팀 경험도 Playwright에 있다.
- Constraint: unit/component 테스트 도구는 실제 필요가 생기면 추가 도입한다.
- Follow-up: `pnpm test:e2e` 스크립트와 CI 검증에 Playwright를 포함한다.
