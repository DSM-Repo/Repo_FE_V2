# Decisions

중요한 제품/기술/구조 결정을 기록합니다.

## 결정 기록 형식

```md
## YYYY-MM-DD — 결정 제목

- Decision:
- Context:
- Alternatives:
- Reason:
- Risk:
- Follow-up:
```

## 2026-05-27 — 단일 프론트엔드 앱으로 시작한다

- Decision: Repo-V2는 단일 앱 + 권한별 라우팅 + feature 단위 분리로 시작한다.
- Context: 학생/선생님/도서관 기능 사이에 공통 UI, 공통 API, 공통 비즈니스 로직이 많다.
- Alternatives:
  - 레거시처럼 `student`, `teacher`, `main` 앱을 분리한다.
  - 단일 앱 안에서 역할별 route를 분리한다.
- Reason: URL과 배포 환경을 꼭 분리할 필요가 없고, 초기 유지보수와 공통 기능 재사용 측면에서 단일 앱이 유리하다.
- Risk: 선생님 전용 기능이 커질 경우 route guard와 feature 경계를 엄격히 관리해야 한다.
- Follow-up: 백엔드 authorization과 프론트 route guard 기준을 함께 설계한다.

## 2026-05-27 — 기술 스택 최종 확정은 보류한다

- Decision: 초기 하네스에서는 기술 스택을 확정하지 않고 후보 비교 기준만 정리한다.
- Context: 핵심 기능이 문서형 에디터, PDF 변환, Figma 구현, API 연동과 밀접하다.
- Alternatives:
  - 지금 바로 스택을 확정한다.
  - 후보 비교 기준을 먼저 정리한다.
- Reason: 문서형 에디터와 PDF 변환 안정성이 제품 핵심에 직접 영향을 주므로 충분한 비교가 필요하다.
- Risk: 결정이 늦어지면 구현 착수가 지연될 수 있다.
- Follow-up: `TECH_STACK.md` 기준으로 후보를 비교한다.

## 2026-05-27 — MVP와 API 계약 문서는 초기에는 분리하지 않는다

- Decision: `MVP_SCOPE.md`와 `API_CONTRACTS.md`는 초기에는 별도 작성하지 않는다.
- Context: MVP 범위는 요구사항과 강하게 붙어 있고, API 상세 계약은 아직 백엔드 설계 전이다.
- Reason: 초기 문서 중복을 줄이기 위해 MVP는 `REQUIREMENTS.md`, API 전제는 `REQUIREMENTS.md`와 `FRONTEND_ARCHITECTURE.md`에 흡수한다.
- Follow-up: 백엔드 상세 설계가 시작되면 `API_CONTRACTS.md`를 분리할 수 있다.

## Open Questions

- 관리자 역할 분리가 필요한가?
- PDF 변환 책임을 어느 계층에 둘 것인가?
- 문서형 에디터 저장 포맷은 무엇으로 할 것인가?
