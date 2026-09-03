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

`NEXT_PUBLIC_AUTH_API_BASE_URL`은 로그인 화면이 호출할 auth API origin입니다. 브라우저에 노출되는 공개 설정이므로 비밀값을 넣지 않습니다.

## Verification

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Docs

작업 전 `docs/index.md`를 기준으로 제품 방향, 요구사항, 프론트엔드 구조, 기술 스택 문서를 확인합니다.
