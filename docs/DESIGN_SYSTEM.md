# Design System

이 문서는 Figma 디자인에서 확정된 디자인 시스템을 코드로 옮기기 위한 정리 자리입니다. 현재는 초안이며 실제 값은 TODO로 남깁니다.

## UI Reference

- 참고 영상: https://www.youtube.com/watch?v=fR8tsJ2r7Eg

영상은 UI 컴포넌트 구성과 화면 완성도 논의에 참고하되, Repo-V2의 Figma 디자인과 제품 목적을 우선합니다.

## Tokens

### Colors

TODO: Figma 색상 토큰을 정리한다.

### Typography

TODO: 제목, 본문, 캡션, 버튼 텍스트 기준을 정리한다.

### Spacing

TODO: spacing scale을 정리한다.

### Radius / Shadow

TODO: radius와 shadow 기준을 정리한다.

## Components

초기 관리 대상:

- Button
- Input
- Search
- Modal
- Sidebar
- Tag
- Switch
- Dropdown
- Tab
- Toast
- Editor Toolbar
- PDF Viewer Controls
- Student List Item
- Feedback Marker

## Component Strategy

- UI 컴포넌트는 headless/primitive 기반 사고를 우선합니다.
- 공통 UI는 `shared/ui` 또는 Next.js 전환 후 동등한 shared layer에 둡니다.
- UI 컴포넌트 내부에 비즈니스 로직을 넣지 않습니다.
- feature별 비즈니스 로직은 `features/*` 또는 route-specific layer에 둡니다.
- 접근성이 중요한 컴포넌트는 Radix UI 같은 headless primitive 도입을 우선 검토합니다.

## Status 표현

- 제출완료
- 미제출
- 공개
- 비공개
- 변환 중
- 변환 완료
- 피드백 있음

## 문서형 에디터 관련 UI

TODO:

- toolbar 구조
- block 삽입 UI
- 이미지 업로드 UI
- 링크 삽입 UI
- 피드백 표시 UI

## Open Questions

- 디자인 토큰을 CSS variables로 관리할 것인가?
- 컴포넌트 variant 명명 규칙은 어떻게 할 것인가?
- Figma 컴포넌트명과 코드 컴포넌트명을 얼마나 맞출 것인가?
- Radix UI를 기본 primitive로 채택할 것인가?
