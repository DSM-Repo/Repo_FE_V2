<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE TASKS TO COMPLETION WITHOUT ASKING FOR PERMISSION.
DO NOT STOP TO ASK "SHOULD I PROCEED?" — PROCEED. DO NOT WAIT FOR CONFIRMATION ON OBVIOUS NEXT STEPS.
IF BLOCKED, TRY AN ALTERNATIVE APPROACH. ONLY ASK WHEN TRULY AMBIGUOUS OR DESTRUCTIVE.
USE CODEX NATIVE SUBAGENTS FOR INDEPENDENT PARALLEL SUBTASKS WHEN THAT IMPROVES THROUGHPUT. THIS IS COMPLEMENTARY TO OMX TEAM MODE.
<!-- END AUTONOMY DIRECTIVE -->

# Repo-V2 Agent Map

Repo-V2는 대덕소프트마이스터고등학교 학생을 위한 이력서/포트폴리오 관리 플랫폼입니다.

## 작업 전 우선 확인 문서

1. `docs/index.md` — 문서 지도와 읽는 순서
2. `docs/PRODUCT_VISION.md` — 서비스 핵심 가치와 방향
3. `docs/REQUIREMENTS.md` — MVP 범위, 요구사항, non-goals
4. `docs/USER_ROLES.md` / `docs/USER_FLOWS.md` — 사용자 역할과 핵심 흐름
5. `docs/FRONTEND_ARCHITECTURE.md` — Next.js App Router 기반 단일 앱 + 권한별 라우팅 구조
6. `docs/TECH_STACK.md` — 확정된 기본 스택과 남은 미결정 항목
7. `docs/DECISIONS.md` — 확정된 결정과 미결정 사항

## 작성 원칙

- 문서와 대화는 한국어를 우선한다.
- 코드, 파일명, 타입명, 컴포넌트명, API 명세는 영어 사용을 허용한다.
- 모르는 내용은 확정하지 말고 `TODO` 또는 `Open Question`으로 남긴다.
- 기본 프론트 스택은 `pnpm` + Next.js App Router + React + TypeScript + ESLint + Playwright 방향으로 확정한다.
- 문서형 에디터, PDF 변환, 상태 관리, form/validation 등 남은 항목은 사용자 최종 결정 전까지 확정하지 않는다.
