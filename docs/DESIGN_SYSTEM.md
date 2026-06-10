# Design System

이 문서는 Figma 디자인에서 확정된 디자인 시스템을 코드로 옮기기 위한 정리 자리입니다. 현재는 초안이며 실제 값은 TODO로 남깁니다.

## UI Reference

- 참고 영상: https://www.youtube.com/watch?v=fR8tsJ2r7Eg

영상은 UI 컴포넌트 구성과 화면 완성도 논의에 참고하되, Repo-V2의 Figma 디자인과 제품 목적을 우선합니다.

## Tokens

### Colors

2026-06-09 기준, 1차 퍼블리싱에서 사용할 color token을 아래처럼 시작합니다.

| Category | Name | HEX | CSS variable |
| --- | --- | --- | --- |
| GRAY | 50 | `#FFFFFF` | `--repo-gray-50` |
| GRAY | 100 | `#F8F8F8` | `--repo-gray-100` |
| GRAY | 200 | `#E2E2E2` | `--repo-gray-200` |
| GRAY | 300 | `#C9C9C9` | `--repo-gray-300` |
| GRAY | 400 | `#ADADAD` | `--repo-gray-400` |
| GRAY | 500 | `#919191` | `--repo-gray-500` |
| GRAY | 600 | `#747474` | `--repo-gray-600` |
| GRAY | 700 | `#565656` | `--repo-gray-700` |
| GRAY | 800 | `#3A3A3A` | `--repo-gray-800` |
| GRAY | 900 | `#1F1F1F` | `--repo-gray-900` |
| GRAY | 950 | `#111111` | `--repo-gray-950` |
| MAIN | Disabled | `#C8D7C6` | `--repo-main-disabled` |
| MAIN | Lighter | `#88EF75` | `--repo-main-lighter` |
| MAIN | main | `#37E517` | `--repo-main` |
| MAIN | Darker | `#38C11F` | `--repo-main-darker` |
| BGMAIN | point | `#C0EF7E` | `--repo-bg-main-point` |
| BGMAIN | Lighter | `#97BC62` | `--repo-bg-main-lighter` |
| BGMAIN | main | `#586F37` | `--repo-bg-main` |
| STATE | Info | `#2F80ED` | `--repo-state-info` |
| STATE | Success | `#27AE60` | `--repo-state-success` |
| STATE | Warning | `#E2B93B` | `--repo-state-warning` |
| STATE | Error | `#EB5757` | `--repo-state-error` |
| TEXT | Black | `#000000` | `--repo-text-black` |

구현 위치:

- `src/shared/styles/colors.css`
- `src/app/layout.tsx`에서 전역 style로 import

운영 기준:

- 색상 token은 CSS variable로 관리합니다.
- 컴포넌트에서는 hex 값을 직접 쓰기보다 semantic alias 또는 token 변수를 우선 사용합니다.
- 현재 전역 placeholder 화면은 gray/main/bgmain token을 기반으로 연결합니다.
- 색상 의미가 명확해지는 시점에 `surface`, `border`, `text`, `brand`, `state` 계열 semantic token을 추가할 수 있습니다.

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

### Button

#### Button 1 / Default

프로젝트 내부에서 공통으로 사용하는 기본 클릭 버튼입니다.

구현 위치:

- `src/shared/ui/Button`

시각값:

| 항목 | 값 |
| --- | --- |
| Width | `Hug(92px)` / 코드에서는 `width: fit-content`, `min-width: 92px` |
| Height | `Hug(43px)` / 코드에서는 `min-height: 43px` |
| Radius | `12px` |
| Padding | `12px 32px` |
| Background | `BGMAIN/point` / `--repo-bg-main-point` |
| Hover background | `BGMAIN/Lighter` / `--repo-bg-main-lighter` |
| Text color | `GRAY/50 (#FFFFFF)` / `--repo-gray-50` |
| Typography | `Title Tiny` |
| Font | `Pretendard` |
| Weight | `600` |
| Size | `16px` |
| Line Height | `120%` |
| Letter Spacing | `0` |

상태:

- `default`와 `hover`를 구현합니다.
- `pressed`, `focus`, `disabled`, `loading`은 아직 시각값이 제공되지 않았으므로 구현하지 않습니다.

동작:

- 클릭 가능한 기본 버튼입니다.
- 버튼 내부에 API 호출이나 페이지 전용 비즈니스 로직을 넣지 않습니다.

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

- spacing/radius/shadow token도 CSS variables로 확장할 것인가?
- 컴포넌트 variant 명명 규칙은 어떻게 할 것인가?
- Figma 컴포넌트명과 코드 컴포넌트명을 얼마나 맞출 것인가?
- Radix UI를 기본 primitive로 채택할 것인가?
