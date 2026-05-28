# Repo-V2 문서 인덱스

이 디렉터리는 Repo-V2의 제품 이해, 요구사항, 구조, 품질 기준을 정리하는 프로젝트 하네스입니다.

## 현재 상태

- 서비스 방향 정리 완료
- 초기 문서 하네스 작성 단계
- 제품 기능 구현 전
- 기술 스택 최종 확정 전
- Figma 디자인은 존재하지만, 이 문서 세트에서는 세부 퍼블리싱 계획을 아직 확정하지 않음

## 추천 읽기 순서

1. `PRODUCT_VISION.md`
2. `REQUIREMENTS.md`
3. `USER_ROLES.md`
4. `USER_FLOWS.md`
5. `FRONTEND_ARCHITECTURE.md`
6. `TECH_STACK.md`
7. `UI_UX_DIRECTION.md`
8. `DESIGN_SYSTEM.md`
9. `PUBLISHING.md`
10. `QUALITY.md`
11. `TESTING.md`
12. `LOCAL_ENVIRONMENT.md`
13. `DECISIONS.md`
14. `GIT_WORKFLOW.md`
15. `exec-plans/README.md`

## 문서 역할

| 문서 | 역할 |
| --- | --- |
| `PRODUCT_VISION.md` | 서비스가 해결하려는 문제와 핵심 가치 |
| `REQUIREMENTS.md` | MVP 요구사항, 후순위, non-goals, API 전제 |
| `USER_ROLES.md` | 학생/선생님/내부 사용자/외부 사용자 역할 |
| `USER_FLOWS.md` | 실제 사용 흐름 |
| `DECISIONS.md` | 결정 로그와 미결정 사항 |
| `GIT_WORKFLOW.md` | 커밋, 이슈, PR 운영 기준 |
| `TECH_STACK.md` | 기술 스택 후보 비교 기준 |
| `FRONTEND_ARCHITECTURE.md` | 프론트엔드 구조 방향 |
| `UI_UX_DIRECTION.md` | 제품 UI/UX 방향 |
| `DESIGN_SYSTEM.md` | 디자인 시스템 정리 자리 |
| `PUBLISHING.md` | Figma 퍼블리싱 기준 |
| `QUALITY.md` | 품질 기준 |
| `TESTING.md` | 테스트 전략 |
| `LOCAL_ENVIRONMENT.md` | 로컬 개발 환경 정리 |
| `exec-plans/` | 구현 전 실행 계획 저장 위치 |

## 문서 관리 규칙

- 새로운 사실은 가장 가까운 주제 문서에 먼저 반영한다.
- 확정된 중요한 결정은 `DECISIONS.md`에도 기록한다.
- 불확실한 내용은 단정하지 않고 `TODO` 또는 `Open Question`으로 남긴다.
- `MVP_SCOPE.md`와 `API_CONTRACTS.md`는 초기에는 별도 문서로 만들지 않는다.
  - MVP 범위는 `REQUIREMENTS.md`에 포함한다.
  - API 전제와 도메인 초안은 `REQUIREMENTS.md`와 `FRONTEND_ARCHITECTURE.md`에 포함한다.
