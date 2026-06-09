# Local Environment

로컬 개발 환경 문서입니다. 확정된 항목은 명시하고, 아직 정하지 않은 항목은 TODO로 남깁니다.

## Runtime

현재 로컬 확인 기준:

- Node.js: `v20.20.2`

현재 Vite scaffold와 향후 Next.js 전환 모두를 고려해 Node.js 20.19+ 또는 22.12+ 계열 이상을 기준으로 둡니다. 팀 표준 Node.js 버전은 추후 `.nvmrc`, `.node-version`, Volta, mise 등 중 하나로 고정할 수 있습니다.

## Package Manager

Repo-V2는 패키지 매니저로 `pnpm`을 사용합니다.

- 확정일: 2026-06-04
- 이유: 설치 속도, 디스크 효율, 의존성 엄격성, 향후 workspace/monorepo 확장성
- 고정 방식: `package.json`의 `packageManager` 필드
- Lockfile: `pnpm-lock.yaml`

## Frontend Base Stack

Repo-V2는 다음 프론트엔드 기본 스택으로 전환합니다.

- Next.js App Router
- React
- React DOM
- TypeScript
- ESLint
- Playwright

현재 repository는 Vite scaffold 상태입니다. Next.js와 Playwright 설정은 별도 마이그레이션 작업 단위에서 반영합니다.

## Environment Variables

예상 환경 변수 범주:

- API base URL
- 인증 관련 설정
- 파일 업로드 URL
- PDF 변환 서버 URL
- 배포 환경 구분

TODO: 실제 변수명은 백엔드/배포 설계 후 확정한다.

## Local Run

```bash
pnpm install
pnpm dev
```

## Backend 연결

백엔드도 새로 설계될 예정입니다.

TODO:

- 로컬 백엔드 사용 여부
- PDF 변환 서버 로컬 실행 여부

## Mock Data

퍼블리싱 단계에서는 단순 object 기반 mock data로 시작합니다.

- MSW는 바로 도입하지 않습니다.
- API 에러/지연/네트워크 시나리오 검증이 필요해지는 시점에 MSW를 재검토합니다.
- mock data는 화면 퍼블리싱과 상태 표현 확인을 위한 최소 데이터로 유지합니다.

## Verification Commands

```bash
pnpm lint
pnpm build
```
