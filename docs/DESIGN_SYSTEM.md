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
| BGMAIN | point | `#43434B` | `--repo-bg-main-point` |
| BGMAIN | Lighter | `#212124` | `--repo-bg-main-lighter` |
| BGMAIN | main | `#181819` | `--repo-bg-main` |
| STATE | Info | `#2F80ED` | `--repo-state-info` |
| STATE | Success | `#1BB35B` | `--repo-state-success` |
| STATE | Warning | `#F1BC19` | `--repo-state-warning` |
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


### Fixed visual contracts for issue #14

2026-06-23 기준, `LibraryBookCard`와 `PortfolioResumeSheet`는 범용 variant 시스템이 아니라 Figma 예시 화면을 코드로 고정한 초기 shared UI입니다.

- `LibraryBookCard`는 도서관/레주메북 진입용 160×220 책 커버 카드입니다. 현재 커버는 `public/assets/library-book-cover.svg` 고정 asset을 사용하며, 이 파일명/경로는 issue #14 초기 카드 계약입니다. 카드 종류가 늘어나면 `cover` 또는 `variant` 계약을 별도 결정합니다.
- `PortfolioResumeSheet`는 학생 포트폴리오 첫 자기소개/이력서 시트입니다. 사용자 지정 기준에 따라 이름은 `Title Small`, 전공 상태는 `Body Tiny`, 학번/학과/email 메타는 `Body very Tiny`를 사용합니다. `resume small` / `resume major` token은 PDF/고밀도 출력 기준이 확정될 때 별도 적용 여부를 결정합니다.
- 공개 route와 `ComponentPreview`에서 쓰는 예시 데이터는 실제 API mock이 아니라 화면 확인용 fixture이므로 `src/shared/fixtures/examples/publicExamples.ts`에 둡니다.

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


#### Button 종류 이름

Button은 `button1`, `button2`처럼 번호로 구분하지 않고 의도가 드러나는 이름을 사용합니다.

| Preview name | Code | Icon | 설명 |
| --- | --- | --- | --- |
| Filled | `<Button>` | off | 기본 filled 버튼 |
| Bordered dark | `<Button variant="bordered-dark">` | off | border가 있는 어두운 버튼 |
| Filled icon | `<Button iconRight="plus">` | on | Filled 버튼의 오른쪽 plus 아이콘 형태 |
| Bordered dark icon | `<Button variant="bordered-dark" iconRight="right-arrow">` | on | Bordered dark 버튼의 오른쪽 arrow 아이콘 형태 |

#### Button 운영 규칙

- Button 내부에 API 호출 로직을 넣지 않습니다.
- 페이지별로 다른 버튼 스타일을 임의로 만들지 않습니다.
- 비슷한 버튼을 새로 만들기 전에 이 Button 컴포넌트의 variant로 해결 가능한지 먼저 확인합니다.
- Figma canvas 위치값인 Top, Left를 버튼 스타일로 구현하지 않습니다.
- 아이콘은 우선 오른쪽 배치만 지원합니다.
- Button icon 공통 규칙을 따릅니다.
- 아이콘 색상은 버튼 text color와 동일하게 `currentColor`를 따릅니다.
- disabled 상태에서도 아이콘 색상은 disabled text color와 동일하게 처리합니다.

#### Filled

아이콘이 없는 기본 filled 버튼입니다.

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
| Disabled background | `GRAY/400` / `--repo-gray-400` |
| Text color | `GRAY/50 (#FFFFFF)` / `--repo-gray-50` |
| Typography | `Title Tiny` |
| Font | `Pretendard` |
| Weight | `600` |
| Size | `16px` |
| Line Height | `120%` |
| Letter Spacing | `0` |

상태:

- `default`, `hover`, `disabled`를 구현합니다.
- `pressed`, `focus`, `loading`은 아직 시각값이 제공되지 않았으므로 구현하지 않습니다.

동작:

- 클릭 가능한 기본 버튼입니다.
- 버튼 내부에 API 호출이나 페이지 전용 비즈니스 로직을 넣지 않습니다.

#### Bordered Dark

아이콘이 없는 bordered dark 버튼입니다. Filled와 동일한 치수와 텍스트 스타일을 사용하되 배경색, disabled 색상, border를 분리합니다.

구현 위치:

- `src/shared/ui/Button`
- 사용 예시: `<Button variant="bordered-dark">버튼</Button>`
- Filled icon 사용 예시: `<Button iconRight="plus">버튼</Button>`
- Bordered dark icon 사용 예시: `<Button variant="bordered-dark" iconRight="right-arrow">버튼</Button>`

시각값:

| 항목 | 값 |
| --- | --- |
| Width | `Hug(92px)` / 코드에서는 `width: fit-content`, `min-width: 92px` |
| Height | `Hug(43px)` / 코드에서는 `min-height: 43px` |
| Radius | `12px` |
| Padding | `12px 32px` |
| Background | `BGMAIN/main` / `--repo-bg-main` |
| Hover background | `BGMAIN/Lighter` / `--repo-bg-main-lighter` |
| Disabled background | `GRAY/300` / `--repo-gray-300` |
| Border | `1px solid GRAY/500` / `--repo-gray-500` |
| Text color | `GRAY/50 (#FFFFFF)` / `--repo-gray-50` |
| Typography | `Title Tiny` |
| Font | `Pretendard` |
| Weight | `600` |
| Size | `16px` |
| Line Height | `120%` |
| Letter Spacing | `0` |

상태:

- `default`, `hover`, `disabled`를 구현합니다.
- `pressed`, `focus`, `loading`은 아직 시각값이 제공되지 않았으므로 구현하지 않습니다.

동작:

- 클릭 가능한 기본 버튼입니다.
- 버튼 내부에 API 호출이나 페이지 전용 비즈니스 로직을 넣지 않습니다.

### Icon

구현 위치:

- `src/shared/ui/Icon`

운영 기준:

- 공통 컴포넌트에서 사용하는 아이콘만 필요한 순서대로 추가합니다.
- 아이콘 색상은 기본적으로 `currentColor`를 사용해 부모 텍스트 색상을 따릅니다.

#### Button icon 공통 규칙

Button 내부에서 사용하는 아이콘은 Plus와 RightArrow 모두 아래 공통 규칙을 따릅니다.

| Property | Value |
| --- | --- |
| icon slot size | `16px × 16px` |
| gap | `10px` |
| icon position | 우선 `right` 기준 |
| color | text color와 동일 |
| disabled color | disabled text color와 동일 |
| stroke width | `1.8px` |
| stroke linecap | `round` |
| stroke linejoin | `round` |
| implementation color | `currentColor` |

#### Plus

Button right icon으로 사용하는 plus 아이콘입니다.

| Section | Property | Value |
| --- | --- | --- |
| Icon | Name | `Plus` |
| Icon | Usage | Button right icon |
| Icon slot | Size | `16px × 16px` |
| Border / Stroke | Width | `1.8px` |
| Border / Stroke | Linecap | `round` |
| Border / Stroke | Linejoin | `round` |
| Color | Rule | text color와 동일한 `currentColor` |
| Alignment | Position | Center alignment |

#### RightArrow

Button right icon으로 사용하는 오른쪽 화살표 아이콘입니다.

| Section | Property | Value |
| --- | --- | --- |
| Icon | Name | `RightArrow` |
| Icon | Usage | Button right icon |
| Icon slot | Size | `16px × 16px` |
| Vector layout | Width | `6px` |
| Vector layout | Height | `12px` |
| Vector layout | Top | `2px` |
| Vector layout | Left | `5px` |
| Border / Stroke | Width | `1.8px` |
| Border / Stroke | Linecap | `round` |
| Border / Stroke | Linejoin | `round` |
| Color | Rule | text color와 동일한 `currentColor` |
| Alignment | Position | Center alignment |

현재 색상 토큰에는 `GRAY/0`이 없으므로 문서에서 흰색이 필요할 때는 동일 HEX인 `GRAY/50 (#FFFFFF)`로 기록합니다.

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
