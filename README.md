# Repo-V2

Repo-V2는 대덕소프트마이스터고등학교 학생을 위한 이력서/포트폴리오 관리 플랫폼입니다.

## Frontend Base

- Package Manager: `pnpm`
- Framework: Next.js App Router
- Runtime: React
- Language: TypeScript
- Lint: ESLint
- Tests: Playwright E2E + Node unit test runner
- Workers build: vinext + Vite + Cloudflare plugin

학생/교사/도서관 화면과 일부 API 연동이 구현되어 있습니다. 현재 `/home`·`/resume`은 학생, `/students`·`/majors`는 교사, `/library`는 내부 공통 경로입니다. 공개 slug와 서버 PDF/Viewer 등 남은 MVP 범위는 [승인 실행 계획](docs/exec-plans/001-mvp-completion-20261001.md)을 따릅니다. PDF 변환은 서버 책임이며 클라이언트 계약과 Viewer 기술은 미정입니다.

## Local Run

```bash
pnpm install
pnpm dev
```

Node.js 22 이상과 `package.json`의 고정 pnpm 버전을 사용합니다. Next 개발 서버 기본 주소는 `http://localhost:3000`입니다.

`NEXT_PUBLIC_API_BASE_URL`은 클라이언트 API 기준 URL입니다. 브라우저에 노출되는 공개 설정이므로 비밀값을 넣지 않습니다.
HTTPS 배포 화면에서 HTTP 백엔드를 사용하면 클라이언트는 자동으로 같은 출처의 `/api/backend/*` 프록시를 사용합니다. 프록시 대상은 `BACKEND_API_BASE_URL`, `NEXT_PUBLIC_API_BASE_URL`, 코드의 기본 origin 순으로 선택합니다. HTTP IPv4 전송은 Workers sockets 경로이므로 Next 로컬 동작과 별도 검증이 필요합니다. 자세한 설정은 [로컬 환경](docs/LOCAL_ENVIRONMENT.md)을 확인합니다.

## Verification

```bash
pnpm lint
pnpm test:unit
pnpm exec next typegen
pnpm typecheck
pnpm build
pnpm exec playwright test --list
pnpm test:e2e
```

`pnpm build`는 Next build 후 postbuild에서 vinext build와 Next typegen도 실행합니다. `pnpm build:vinext`는 Workers 빌드만 수행합니다. `vite.config.ts`와 `wrangler.jsonc`는 현재 배포 설정입니다. Playwright는 Next 서버를 사용하며 `--list`는 테스트 발견만 확인합니다. `pnpm check`에는 unit/E2E/Next build가 포함되지 않습니다. 실행 격리와 증거 기준은 [테스트 문서](docs/TESTING.md)를 따릅니다.

## Docs

작업 전 [문서 인덱스](docs/index.md)를 기준으로 제품 방향, 요구사항, 프론트엔드 구조, 기술 스택 문서를 확인합니다. 초기 설계 결정과 과거 QA 판정은 현재 구현/검증 상태와 구분합니다.
