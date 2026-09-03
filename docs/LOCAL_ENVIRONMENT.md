# Local Environment

로컬 개발 환경 문서입니다. 확정된 항목은 명시하고, 아직 정하지 않은 항목은 TODO로 남깁니다.

## Runtime

현재 로컬 확인 기준:

- Node.js: `v22.23.2`

vinext와 Wrangler의 실행 요구사항에 맞춰 Node.js 22 이상을 기준으로 둡니다. 저장소의 `.node-version`을 사용해 팀 표준 버전을 맞춥니다.

## Package Manager

Repo-V2는 패키지 매니저로 `pnpm`을 사용합니다.

- 확정일: 2026-06-04
- 이유: 설치 속도, 디스크 효율, 의존성 엄격성, 향후 workspace/monorepo 확장성
- 고정 방식: `package.json`의 `packageManager` 필드
- Lockfile: `pnpm-lock.yaml`

## Frontend Base Stack

Repo-V2는 다음 프론트엔드 기본 스택으로 실행합니다.

- Next.js App Router
- React
- React DOM
- TypeScript
- ESLint
- Playwright

Next.js 전환은 완료되었습니다. Playwright 설정은 별도 작업 단위에서 반영합니다.

## Environment Variables

현재 확정된 로컬 환경 변수:

| 변수명 | 예시 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_AUTH_API_BASE_URL` | `http://localhost:8080` | 브라우저에서 인증 요청을 보낼 백엔드 origin입니다. |

`NEXT_PUBLIC_` 변수는 클라이언트 번들에 포함되는 공개 설정입니다. 토큰, 비밀번호, Workers Secret 같은 비밀값을 넣지 않습니다.

아직 미확정인 환경 변수 범주:

- 인증 토큰 저장/갱신 관련 설정
- 파일 업로드 URL
- PDF 변환 서버 URL
- 배포 환경 구분

TODO: 인증 세션 저장과 권한 라우팅 정책이 확정되면 관련 변수를 별도 작업에서 정한다.

## Local Run

```bash
pnpm install
pnpm dev
```

`pnpm dev`는 Next.js dev server를 실행합니다.

## Backend 연결

백엔드 연결 주소는 환경변수로 관리합니다.

TODO:

- 로컬 백엔드 사용 여부
- 인증 토큰 저장/갱신 정책
- PDF 변환 서버 로컬 실행 여부

## Verification Commands

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm test:e2e -- auth-login.spec.ts
```
