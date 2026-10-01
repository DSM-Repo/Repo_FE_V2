# Local Environment

로컬 개발 환경 문서입니다. 확정된 항목은 명시하고, 아직 정하지 않은 항목은 TODO로 남깁니다.

## Runtime

저장소의 [package.json](../package.json)은 Node.js `>=22`, [.node-version](../.node-version)은 `22`를 지정합니다. 이는 저장소 기준이며 현재 실행 중인 로컬 patch 버전은 `node --version`으로 확인합니다.

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

Next.js 전환과 [Playwright 설정](../playwright.config.ts)은 반영되어 있습니다. `tests/e2e`의 Playwright와 `tests/unit`의 Node test runner를 사용합니다. vinext + Vite + Cloudflare Workers 배포 구성은 [프론트 구조](FRONTEND_ARCHITECTURE.md)에 기록합니다.

## Environment Variables

현재 확정된 로컬 환경 변수:

| 변수명 | 예시 | 설명 |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:8080` | 클라이언트 API 기준 URL입니다. 예시는 별도 로컬 백엔드가 있을 때만 유효합니다. HTTPS 화면 + HTTP API 조합은 같은 출처의 `/api/backend/*`로 전환합니다. |
| `BACKEND_API_BASE_URL` | `http://localhost:8080` | 서버 프록시 대상 재정의. 없으면 `NEXT_PUBLIC_API_BASE_URL`, 이후 코드의 기본 origin 순으로 사용합니다. |
| `PLAYWRIGHT_PORT` | `3100` | E2E Next 서버 포트. 기본값은 3000입니다. |
| `CI` | `1` | 현재 Playwright에서 이미 빌드된 Next 서버를 시작합니다. 빌드는 사전에 필요하며, 기존 서버 재사용은 CI 여부와 무관하게 꺼져 있습니다. |

`NEXT_PUBLIC_` 변수는 클라이언트 번들에 포함되는 공개 설정입니다. 토큰, 비밀번호, Workers Secret 같은 비밀값을 넣지 않습니다.

추가 계약이 필요한 환경 설정:

- 폐기 가능한 staging/live 테스트 origin과 계정 공급 (D13)
- 서버 PDF 요청/상태/결과 URL과 권한 (D10)

현재 access/refresh token 저장은 `src/features/auth/api/authTokenStorage.ts`의 localStorage 구현이며 환경 변수로 주입하지 않습니다. 파일 업로드는 공통 API URL의 `POST /image`를 사용합니다. 이 구현 사실은 최종 인증/파일 계약 검증을 뜻하지 않습니다. D 번호는 [계약 및 결정 목록](exec-plans/003-mvp-contract-decisions-20261001.md)을 참조합니다.

## Local Run

```bash
pnpm install
pnpm dev
```

`pnpm dev`는 Next.js dev server를 기본 `http://localhost:3000`에서 실행합니다. 포트가 사용 중이면 `pnpm dev --port 3002`처럼 빈 포트를 지정합니다. `/home`·`/resume`은 학생, `/students`·`/majors`는 교사 경로이며 `/library`는 내부 공통 도서관입니다.

`pnpm dev:vinext`는 3001 포트의 vinext 개발 경로이고, `pnpm build:vinext` 후 `pnpm start:vinext`는 `dist/server/wrangler.json`을 사용하는 Wrangler 실행 경로입니다. 현재 [Wrangler 설정](../wrangler.jsonc)에 원격 KV 연결이 있으므로 이를 완전한 오프라인 테스트로 간주하지 않습니다.

## Backend 연결

백엔드 연결 주소는 환경변수로 관리합니다. 저장소가 로컬 백엔드를 제공하지는 않습니다. 기본 원격 origin이나 과거 QA 로그를 테스트 격리/실서버 성공의 증거로 사용하지 않습니다.

`src/app/api/backend/[...path]/route.ts`의 HTTP IPv4 전송은 `cloudflare:sockets`를 사용합니다. Next 로컬 테스트만으로 Workers 프록시/캐시/이미지 바인딩까지 검증했다고 판단하지 않습니다.

TODO:

- 로컬 백엔드 사용 여부
- 인증 재발급/권한 오류의 서버 계약 (D12)
- PDF 변환 서버 로컬 실행 여부

## Verification Commands

```bash
pnpm lint
pnpm test:unit
pnpm exec next typegen
pnpm typecheck
pnpm build
pnpm exec playwright test --list
pnpm test:e2e -- auth-login.spec.ts
pnpm test:e2e
```

- `next typegen`은 새 checkout에서 typecheck 전에 Next route 타입을 생성합니다.
- `pnpm build`는 Next build와 postbuild의 vinext build/Next typegen을 포함합니다. Workers 빌드만 확인할 때는 `pnpm build:vinext`를 사용합니다.
- `--list`는 테스트 발견 확인이며 실행/통과 증거가 아닙니다. E2E는 Next 서버를 사용하며 기존 서버를 재사용하지 않습니다. 테스트 기본 API는 `http://api.repo.test`이고 빌드와 테스트의 API 환경을 일치시킵니다.
- `pnpm check`는 lint/typecheck/vinext build만 수행합니다. unit/E2E 전체 검증을 대체하지 않습니다.
- 실제 실행/격리/증거 기준은 [테스트 문서](TESTING.md)와 [T00/T33 테스트 명세](exec-plans/002-mvp-test-spec-20261001.md)를 따릅니다. 원격 mutation과 배포는 이 로컬 검증 명령에 포함하지 않습니다.
