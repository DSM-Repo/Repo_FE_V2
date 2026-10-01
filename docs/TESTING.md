# Testing Strategy

이 문서는 Repo-V2의 현재 테스트 전략입니다. 사용자 흐름은 Playwright, API 파서·요청 처리는 Node 내장 test runner로 검증합니다. 전체 acceptance 기준은 [MVP 검증 명세](exec-plans/002-mvp-test-spec-20261001.md)를 따릅니다.

## 테스트 레벨

- Unit Test
- Integration Test
- E2E Test: Playwright
- Visual/Manual QA: Playwright screenshot 또는 수동 QA로 시작

## 중요 테스트 대상

### 문서형 에디터

- 작성 내용 저장/복원
- 텍스트 스타일 유지
- 이미지/링크 유지
- 빈 상태 처리
- 긴 문서 처리

### PDF 변환

- 필수 상단 정보 포함
- 문서형 본문 반영
- 이미지/링크 처리
- 페이지 나눔 안정성
- 변환 실패 처리

### 권한별 라우팅

- 비로그인 접근 제한
- 학생 전용 화면 접근
- 선생님 전용 화면 접근
- 내부 도서관 공통 접근

### 선생님 기능

- 학생 조회/검색/반별 조회
- 제출완료/미제출 표시
- 공개 상태 변경
- 피드백 추가/수정/삭제
- 전공 생성/삭제/조회

### 도서관

- 레주메북 목록 조회
- PDF 열람
- 다운로드
- 전공/반 필터
- 이름 검색
- 빠른 이동

## MVP 완료 체크리스트 초안

- [ ] 학생이 포트폴리오를 작성하고 저장할 수 있다.
- [ ] 필수 상단 정보가 누락 없이 표시된다.
- [ ] PDF 변환 결과를 열람할 수 있다.
- [ ] 선생님이 학생 제출 상태를 확인할 수 있다.
- [ ] 선생님이 피드백을 관리할 수 있다.
- [ ] 내부 사용자가 도서관을 열람할 수 있다.

## 현재 검증 명령

```bash
pnpm lint
pnpm test:unit
pnpm exec next typegen
pnpm typecheck
pnpm build
pnpm test:e2e
```

`pnpm build`는 Next production build 뒤 postbuild에서 vinext/Workers build와 Next route type 생성을 수행합니다. Playwright의 기본 실행 표면은 Next 서버이므로 Workers 검증은 별도로 필요합니다.

## Mock 격리

- 모든 `tests/e2e/*.spec.ts`는 `test-fixtures.ts`의 `test`/`expect`와 공통 `apiBaseUrl`을 사용합니다.
- 기본 API 주소는 운영 서버가 아닌 `http://api.repo.test`입니다. 빌드와 테스트의 `NEXT_PUBLIC_API_BASE_URL`은 동일해야 합니다.
- 명시한 `page.route` mock이 처리하지 않은 API/fetch/XHR는 차단하고 해당 테스트를 실패시킵니다. 같은 origin의 `/api/backend/`도 차단하여 로컬 프록시를 통한 원격 변경을 막습니다. 외부 이미지 등 미등록 asset도 네트워크로 보내지 않습니다.
- 실이미지 표시를 검사하는 테스트는 해당 asset을 실제 이미지 fixture로 명시해야 합니다. 차단된 이미지를 정상 표시 증거로 계산하지 않습니다.
- `mock-network.spec.ts`에서 미등록 원격 요청/로컬 프록시 차단과 명시 mock 우선순위를 검사합니다.
- 합성 JWT와 mock 응답은 실제 서버의 권한·영속성·CORS 증거가 아닙니다. live 검증은 D13의 폐기 가능한 staging 계정/리소스와 합의된 명령이 준비된 뒤 별도로 수행합니다.

## Fresh 서버와 실패 증거

Playwright는 기존 서버를 재사용하지 않습니다. 사용하지 않는 port를 선택합니다.

```bash
PLAYWRIGHT_PORT=3114 pnpm test:e2e
```

CI 모드에서는 같은 소스와 API 환경으로 `pnpm build`를 먼저 실행하고 `CI=1 PLAYWRIGHT_PORT=3114 pnpm test:e2e`를 실행합니다. CI는 lint/unit/typecheck/build/E2E를 수행하고 실패 시 `test-results/`의 trace·screenshot 및 `playwright-report/`를 해당 SHA의 아티팩트로 보존합니다.

## 남은 검증

- 실제 서버 계약/학생·교사 계정 및 저장·공개·피드백 영속성
- 서버 PDF 생성·내용·다운로드·학생/반 페이지 인덱스
- Workers runtime 및 KV/IMAGES/CDN 공개 무효화
- 시각적 회귀 기준과 비교 이미지 관리 정책

이 항목들은 mock 통과만으로 완료 처리하지 않습니다.
