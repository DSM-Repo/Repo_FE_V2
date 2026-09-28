# Repo-V2

Repo-V2는 대덕소프트마이스터고등학교 학생을 위한 이력서/포트폴리오 관리 플랫폼입니다.

## Frontend Base

- Package Manager: `pnpm`
- Framework: Next.js App Router
- Runtime: React
- Language: TypeScript
- Lint: ESLint

## Local Run

```bash
pnpm install
pnpm dev
```

`NEXT_PUBLIC_API_BASE_URL`은 브라우저에서 모든 백엔드 API 요청을 보낼 origin입니다. 브라우저에 노출되는 공개 설정이므로 비밀값을 넣지 않습니다.
HTTPS 배포 화면에서 HTTP 백엔드를 사용하면 브라우저가 Mixed Content로 직접 요청을 차단하므로, 클라이언트는 자동으로 같은 출처의 `/api/backend/*` 프록시를 통해 백엔드에 연결합니다. 프록시의 실제 대상은 `BACKEND_API_BASE_URL`로 재정의할 수 있으며 기본값은 현재 백엔드 origin입니다.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Docs

작업 전 `docs/index.md`를 기준으로 제품 방향, 요구사항, 프론트엔드 구조, 기술 스택 문서를 확인합니다.
