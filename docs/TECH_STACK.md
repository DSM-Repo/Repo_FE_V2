# Tech Stack Evaluation

이 문서는 Repo-V2 기술 스택의 확정 항목과 아직 검토가 필요한 항목을 구분해 정리합니다.

## 확정된 기본 프론트엔드 스택

2026-06-04 기준, 퍼블리싱과 초기 프론트엔드 구현은 아래 스택으로 시작합니다.

| 영역 | 결정 | 근거 |
| --- | --- | --- |
| Package Manager | `pnpm` | 설치 속도, 디스크 효율, 의존성 엄격성, 향후 workspace/monorepo 확장성 |
| App Runtime | React | 현재 프로젝트가 React 기반으로 구성되어 있고, 컴포넌트 기반 퍼블리싱에 적합 |
| Language | TypeScript | 타입 안정성과 AI/사람 모두의 코드 이해 가능성 향상 |
| Build Tool | Vite | 현재 프로젝트가 Vite 기반이며, 빠른 dev server와 단순한 프론트엔드 퍼블리싱 흐름에 적합 |
| Lint | ESLint | 현재 프로젝트 검증 명령으로 사용 |

현재 `package.json` 기준 주요 버전 범위:

- `react`: `^19.2.6`
- `react-dom`: `^19.2.6`
- `typescript`: `~6.0.2`
- `vite`: `^8.0.12`
- `@vitejs/plugin-react`: `^6.0.1`
- `eslint`: `^10.3.0`
- `pnpm`: `packageManager` 필드로 고정

## 아직 확정하지 않은 항목

- 문서형 에디터 라이브러리 또는 직접 구현 여부
- PDF 변환 방식
- 상태 관리 라이브러리
- form/validation 라이브러리
- 테스트 도구
- CI에서 실행할 최소 검증 명령
- Next.js 도입 여부

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
- 테스트 도구 후보 정리
- Next.js 도입 필요성 검토

## Next.js 검토 메모

Next.js는 아직 도입 결정이 아닙니다. 이후 다음 기준으로 별도 검토합니다.

- Repo-V2에 SSR/SSG/서버 컴포넌트가 실제로 필요한가?
- 인증/권한별 라우팅이 Vite SPA보다 Next.js에서 더 단순해지는가?
- PDF 변환, 이미지 처리, 파일 업로드 흐름에 이점이 있는가?
- 퍼블리싱 속도와 팀 온보딩 비용을 높이지 않는가?
- 백엔드가 별도로 설계되는 상황에서 Next.js API route/server action이 필요한가?
- 현재 Vite 기반 구조에서 Next.js로 전환할 만큼의 명확한 제품/운영 이득이 있는가?

## Non-decision

이 문서는 확정된 기본 프론트엔드 스택을 기록하지만, editor/PDF/form/testing/Next.js 등 미결정 항목은 확정하지 않습니다.

## Decisions

### 2026-06-04 — Package Manager

- Decision: Repo-V2는 패키지 매니저로 `pnpm`을 사용한다.
- Reason: 초기 전환 비용이 작고, 설치 속도/디스크 효율/의존성 엄격성/향후 workspace 확장성 측면에서 적합하다.
- Constraint: 최종 기술 스택 결정은 사용자가 한다.
- Follow-up: `package.json`의 `packageManager` 필드와 `pnpm-lock.yaml`을 기준으로 개발/CI 명령을 통일한다.

### 2026-06-04 — Frontend Base Stack

- Decision: 퍼블리싱과 초기 프론트엔드 구현은 React + TypeScript + Vite 기반으로 시작한다.
- Reason: 현재 프로젝트가 이미 해당 조합으로 구성되어 있고, 초기 퍼블리싱 속도와 컴포넌트 기반 구현에 적합하다.
- Constraint: Next.js 도입 여부는 별도 검토 전까지 확정하지 않는다.
- Follow-up: 문서형 에디터, PDF 변환, 상태 관리, form/validation, 테스트 도구를 순차적으로 결정한다.
