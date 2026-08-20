# Repo-V2 Design System

## 1. Atmosphere & Identity

Repo-V2 is a dark, quiet school-work surface: compact, direct, and built for repeated student and teacher workflows. The signature is layered charcoal UI with bright submission status accents, where rows and cards feel tappable without decorative noise.

## 2. Color

### Palette

| Role | Token | Value | Usage |
| --- | --- | --- | --- |
| Surface/page | `--repo-gray-100` | `#F8F8F8` | App background |
| Surface/dark | `--repo-bg-main` | `#181819` | Header, footer, primary rows |
| Surface/dark-muted | `--repo-bg-main-lighter` | `#212124` | Active dark rows, selected nav |
| Surface/dark-raised | `--repo-bg-main-point` | `#43434B` | Secondary rows, filled controls |
| Text/inverse | `--repo-gray-50` | `#FFFFFF` | Text on dark surfaces |
| Text/muted | `--repo-gray-500` | `#919191` | Secondary dark-surface labels |
| Text/disabled | `--repo-gray-400` | `#ADADAD` | Placeholder and inactive labels |
| Accent/success | `--repo-main` | `#37E517` | Submitted state |
| Status/error | `--repo-state-error` | `#EB5757` | Error text |

### Rules

- 모든 글자 크기, 굵기, 행간은 `--repo-font-*` 토큰 또는 해당 토큰을 사용하는 텍스트 유틸리티만 사용합니다.
- 모든 색상은 이 문서의 color token 또는 `src/shared/styles/colors.css`에 선언된 `--repo-*` 토큰만 사용합니다.
- 기능 구현 중 필요한 글자/색상 값이 토큰에 없으면 CSS에 임의 값을 쓰지 말고 먼저 디자인 토큰을 추가하고 이 문서에 용도를 기록합니다.
- 예외적으로 SVG/이미지 내부 표현, QR/픽셀 패턴, 외부 에셋 원본 색처럼 디자인 토큰으로 제어할 수 없는 값만 raw value를 허용합니다.
- Dark primitives use tonal-shift depth before shadows.
- Green is reserved for submitted/success status.
- Error red appears only with validation feedback.

## 3. Typography

### Scale

| Level | Token | Usage |
| --- | --- | --- |
| Title/large | `--repo-font-title-large-*` | Page-level emphasis only |
| Title/medium | `--repo-font-title-medium-*` | Large modal emphasis and rare showcase headings |
| Title/small | `--repo-font-title-small-*` | Primary row labels, card titles, modal headings |
| Title/tiny | `--repo-font-title-tiny-*` | Navigation, buttons |
| Body/large | `--repo-font-body-large-*` | Prominent row metadata |
| Body/medium | `--repo-font-body-medium-*` | Input text and row actions |
| Body/small | `--repo-font-body-small-*` | Default form text |
| Body/tiny | `--repo-font-body-tiny-*` | Footer/legal text |

### Font Stack

- Primary: Pretendard, system UI fallback.

### Rules

- Letter spacing remains `0`.
- Body text stays at or above 14px.
- 새 UI에서 `font-size`, `font-weight`, `line-height`를 직접 숫자로 지정하는 것은 금지합니다. 반드시 typography token을 참조합니다.

## 4. Spacing & Layout

### Base Unit

All spacing derives from 4px.

| Token | Value | Usage |
| --- | --- | --- |
| `--space-2` | 8px | Tight icon and text clusters |
| `--space-3` | 12px | Compact row gaps |
| `--space-4` | 16px | Form and row internal spacing |
| `--space-5` | 20px | Default inset |
| `--space-6` | 24px | Card inset |
| `--space-8` | 32px | Component groups |
| `--space-10` | 40px | Large cards and modal rhythm |

### Grid

- Desktop publishing target: 1440px to 1920px wide.
- Components are fluid by default and receive width from their parent.
- Reusable controls target app-scale CSS pixels, not exported screenshot pixels: rows 56px, headers 64px, inputs 56px by default.
- Mobile support is basic reflow protection, not final polish for this milestone.

## 5. Components

### AppHeader
- **Structure**: `header > Logo + nav + action`
- **Variants**: student, teacher, public
- **States**: nav default, selected, focus
- **Accessibility**: landmark header, current page conveyed through `aria-current`
- **Motion**: 120ms background and color transition

### LinkRow
- **Structure**: row button/link with primary text, optional status/date, optional trailing text, chevron
- **Variants**: submitted, missing, neutral
- **States**: default, active, focus
- **Accessibility**: interactive element supplies an accessible label through visible text

### ClassCard
- **Structure**: large rounded button with class name, count, chevron
- **Variants**: default, selected
- **States**: default, hover, focus

### TextSlot
- **Structure**: label, display text, optional editable input-like slot, optional error
- **Variants**: compact, wide
- **States**: read, edit, error

### MajorInputGroup
- **Structure**: stacked input rows with validation text
- **States**: default, error

### SearchField
- **Structure**: rounded input with search icon button
- **States**: default, focus

### MajorList
- **Structure**: section label plus full-width major rows
- **States**: row default, selected, focus

### AppFooter
- **Structure**: footer with product name, address, phone lines, legal links
- **Accessibility**: footer landmark

### LibraryBook
- **Structure**: fixed-ratio book cover link using `/assets/library-book-cover.svg` as the cover source, with year, generation, grade, and action text layered above it
- **States**: default, hover, focus

### PortfolioUrlModal
- **Structure**: dialog panel with title, description, input and actions
- **States**: default, error, pending through disabled actions
- **Accessibility**: dialog role and labelled title

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 120ms | ease-out | Button and row feedback |
| Standard | 200ms | ease-in-out | Modal and selected state shifts |

Only `transform`, `opacity`, background, border, and color transitions are used in this component pass.

## 7. Depth & Surface

### Strategy

Mixed tonal-shift with restrained shadows for raised cards and modal surfaces.

| Level | Value | Usage |
| --- | --- | --- |
| Book | `0 14px 32px rgba(17, 17, 17, 0.28)` | Library book card |
| Modal | `0 20px 60px rgba(17, 17, 17, 0.18)` | URL modal |

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA.
- Every interactive primitive exposes visible focus.
- Components must tolerate long Korean labels without overlap.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
| --- | --- | --- | --- |
| Pixel-perfect reference matching | Shared component showcase | User requested final visual drift to be handled in later QA | Final publishing QA |
