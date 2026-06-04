# Local Environment

로컬 개발 환경 문서입니다. 확정된 항목은 명시하고, 아직 정하지 않은 항목은 TODO로 남깁니다.

## Runtime

현재 로컬 확인 기준:

- Node.js: `v20.20.2`

Vite 기반 개발을 위해 Node.js 20.19+ 또는 22.12+ 계열을 기준으로 둡니다. 팀 표준 Node.js 버전은 추후 `.nvmrc`, `.node-version`, Volta, mise 등 중 하나로 고정할 수 있습니다.

## Package Manager

Repo-V2는 패키지 매니저로 `pnpm`을 사용합니다.

- 확정일: 2026-06-04
- 이유: 설치 속도, 디스크 효율, 의존성 엄격성, 향후 workspace/monorepo 확장성
- 고정 방식: `package.json`의 `packageManager` 필드
- Lockfile: `pnpm-lock.yaml`

## Frontend Base Stack

Repo-V2는 현재 다음 프론트엔드 기본 스택으로 시작합니다.

- React
- React DOM
- TypeScript
- Vite
- ESLint

Next.js는 아직 확정하지 않았으며, 추후 별도 검토합니다.

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
- mock API 사용 여부
- PDF 변환 서버 로컬 실행 여부

## Verification Commands

```bash
pnpm lint
pnpm build
```
