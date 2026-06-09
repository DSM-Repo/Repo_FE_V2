# Design System

이 문서는 Figma 디자인에서 확정된 디자인 시스템을 코드로 옮기기 위한 정리 자리입니다. 현재는 초안이며 실제 값은 TODO로 남깁니다.

## UI Reference

- 참고 영상: https://www.youtube.com/watch?v=fR8tsJ2r7Eg

영상은 UI 컴포넌트 구성과 화면 완성도 논의에 참고하되, Repo-V2의 Figma 디자인과 제품 목적을 우선합니다.

## Tokens

### Colors

TODO: Figma 색상 토큰을 정리한다.

### Typography

2026-06-09 기준, 1차 퍼블리싱에서 사용할 typography token을 아래처럼 시작합니다.

| Name | Weight | Size | Height | CSS utility |
| --- | ---: | ---: | ---: | --- |
| Label Medium | 400 | 16px | 120% | `.text-label-medium` |
| Body very Tiny | 400 | 12px | 120% | `.text-body-very-tiny` |
| Body Tiny | 400 | 14px | 120% | `.text-body-tiny` |
| Body Small | 400 | 16px | 120% | `.text-body-small` |
| Body Medium | 400 | 18px | 120% | `.text-body-medium` |
| Body Medium2 | 600 | 18px | 120% | `.text-body-medium-2` |
| Body Large | 400 | 20px | 120% | `.text-body-large` |
| Title Tiny | 600 | 16px | 120% | `.text-title-tiny` |
| Title Small | 600 | 24px | 120% | `.text-title-small` |
| Title s-Medium | 600 | 32px | 120% | `.text-title-s-medium` |
| Title Medium | 600 | 36px | 120% | `.text-title-medium` |
| Title Large | 600 | 48px | 120% | `.text-title-large` |
| resume small | 600 | 10px | 120% | `.text-resume-small` |
| resume major | 200 | 16px | 120% | `.text-resume-major` |

구현 위치:

- `src/shared/styles/typography.css`
- `src/app/layout.tsx`에서 전역 style로 import

운영 기준:

- 모든 typography token은 CSS variable과 utility class를 함께 둡니다.
- `Body very Tiny`와 `resume small`은 보조 정보, PDF/이력서 내부의 제한된 정보 밀도 표현에만 사용합니다.
- 일반 본문 기본값은 `Body Small` 이상을 우선합니다.
- Figma token명이 바뀌면 CSS utility class 변경 전에 이 문서를 먼저 갱신합니다.

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
