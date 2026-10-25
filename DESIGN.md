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
| Display/mega | `--repo-font-display-mega-*` | Landing final CTA only |
| Display/large | `--repo-font-display-large-*` | Landing hero headline only |
| Display/medium | `--repo-font-display-medium-*` | Landing line-art statement only |
| Display/small | `--repo-font-display-small-*` | Landing gradient CTA supporting lines |
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

### LandingPage
- **Source**: Figma `okhxw8EuxX4OTiZDkXpCcT`, node `1647:33411` (`랜딩페이지시안1`)
- **Structure**: 1920px reference canvas translated into a responsive public homepage with dark hero, 1360px feature rail, resume-document visuals, feedback preview, CTA strip, and footer
- **Geometry**: desktop content follows the Figma 1360px inner width, 64px header side padding, 380px hero left anchor, and 732px hero media anchor through fluid `clamp()` constraints
- **States**: CTA links expose hover and focus outlines without changing layout
- **Assets**: Figma-exported media lives under `/assets/landing/*` to avoid temporary Figma asset URLs
- **Responsive**: desktop preserves the Figma two-column staging; tablet/mobile stacks content and scales display typography through declared display tokens

### LibraryBook
- **Structure**: fixed-ratio book cover link using `/assets/library-book-cover.svg` as the cover source, with year, generation, grade, and action text layered above it
- **States**: default, hover, focus

### PortfolioUrlModal
- **Structure**: dialog panel with title, description, input and actions
- **States**: default, error, pending through disabled actions
- **Accessibility**: dialog role and labelled title

### StudentHomeProgress
- **Data**: user information, resume progress and notifications load independently from `/user`, `/user/progress` and `/alram`.
- **States**: the progress panel announces loading and displays the server error message on failure. Only a successful response displays a progress bar; an unknown value is never shown as 0%. Other home sections remain usable when one request fails.

### ProfileImageCrop
- **Structure**: a native modal dialog, at most 440px wide, contains a square preview up to 280px, a circular profile guide, three labelled range controls and cancel/apply actions. Charcoal surfaces and existing body/tiny typography keep it compact.
- **Interaction**: drag the photo or use arrow keys to move it; zoom ranges from 1× to 3×. Horizontal and vertical sliders provide keyboard and touch alternatives. The preview and exported square use the same crop geometry and preserve the original image ratio.
- **States**: loading, ready, conversion pending and readable error; applying uploads a 512px square PNG, while cancel/Escape uploads nothing. Object URLs are released on close.
- **Accessibility**: native dialog focus trapping and restoration, labelled controls, visible focus and an announced error. The panel scrolls within the viewport on small screens; movement is immediate without animation.

### StudentClassDialog
- **Scroll ownership**: a viewport-bounded flex column keeps the class heading, update time, divider and close button visible; only the student list scrolls, with `min-height: 0` and `overflow-y: auto`.
- **Responsive**: the panel fits the overlay's available height on desktop, short windows and mobile; its usual minimum height shrinks when the viewport requires it.
- **Reference**: frontend layout mechanics `scroll-body-shell`; the StyleGallery reference host was unavailable during this targeted scroll repair.

### AuthCard
- **Structure**: 340px dark brand panel + 470px light form panel
- **Variants**: login, signup step, reversed teacher login
- **States**: default, pending, error, success
- **Responsive**: desktop uses a stable 810px by 484px card; mobile reflows to a single 430px column

### AuthAccountPrompt
- **Structure**: 14px muted prompt plus semibold route link below the primary action
- **Variants**: signup link from login, login link from signup
- **Layout**: positioned outside the form flow so adding it does not resize the authentication card
- **Accessibility**: visible link text names the destination action

### ResumeEditorSheet
- **Structure**: document-sized editable sheet with compact identity header, muted intro panel, skill chips, markdown activity/project body, and optional QR/project image placeholder
- **Variants**: profile page, project page, free page
- **States**: editable text, placeholder, focus, empty skill list, hover-revealed skill delete
- **Layout**: mirrors the resume preview density rather than form density; controls keep transparent document styling and use existing typography tokens
- **Accessibility**: editable fields keep labels through visually hidden text, toolbar buttons expose action labels, and focus remains visible without changing sheet geometry

### TeacherResumeFeedback
- **Source**: Figma `okhxw8EuxX4OTiZDkXpCcT`, nodes `700:59455` (목록) and `700:59554` (선택 및 삭제)
- **Layout**: user-requested compact revision uses a 320px desktop panel, 52px header, 44px rows and 12px list gaps; selected feedback actions stay at the panel bottom.
- **Typography**: student and teacher row titles and details use body/tiny (14px); dates use body/very-tiny (12px), below the title.
- **Content**: the first line is the summary. Expanded content contains only subsequent lines; a single-line comment has no duplicate detail block.
- **Markers**: student and teacher documents use a 36px balloon with a 26px author glyph. The 2026-10-25 third screenshot is the shape contract: the author and message are separate, with a gap of 0.4 times the marker size. The title-only message has a broad curved upper-left corner, a square lower-left corner and a rounded right end, including when it opens to the left. Its height matches the marker; its minimum width is 2.8 times the marker size, capped by the available document space and 240px. Status badges and completion icons stay in the feedback panel rather than inside the message. A transparent hover bridge keeps the message open across the gap.
- **States**: viewing, expanded detail, selection, deletion pending, deletion failure, placement, draft and creation pending are distinct. Viewing alone never places a new feedback marker.
- **Accessibility**: list triggers expose expanded state, selection has labelled controls, placement has a keyboard-accessible page-center action, and Escape cancels drafting. Narrow viewports keep the composer and panel actions reachable.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
| --- | --- | --- | --- |
| Micro | 120ms | ease-out | Button and row feedback |
| Standard | 200ms | ease-in-out | Modal and selected state shifts |
| Landing reveal | 480ms | cubic-bezier(0.2, 0, 0, 1) | Public landing hero line and section entry |
| Landing scroll | IntersectionObserver reveal | cubic-bezier(0.2, 0, 0, 1) | Public landing sections revealed when entering the viewport |

Only `transform`, `opacity`, `filter`, background, border, and color transitions are used in this component pass.
Landing motion follows a Toss-style reveal pattern: line-level 16px y-offsets, fast opacity settling, nearly no blur, no decorative scale, and internal staggered groups. Reduced-motion users receive the fully settled layout without transform animation.

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
