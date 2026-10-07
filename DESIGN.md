# EmberEVO implemented design

## Overview

A Traditional Chinese research reading interface for people exploring crypto tokens and NFTs, including non-AI projects. The design is an original restrained dark editorial workspace: a fixed desktop navigation rail, clear page title and scope notice, compact index cards, and a separate research-change column. It uses text branding only; no supplied logo was available. All demo screens keep DEMO_DATA visible. The board and detail screens reuse the same project and status components.

Source of truth: `src/style.css`, `src/ui/components.ts`, `src/main.ts`. Native HTML links, buttons, labeled fields and disclosure elements provide interactions. No canvas/WebGL, remote fonts, image assets, animation library or framework UI dependency is required.

## Colors

All values are CSS sRGB hex primitives mapped to semantic roles in `src/style.css:1`.

| Role | Semantic token | Value |
| --- | --- | --- |
| Page | `--bg` | `#101820` |
| Navigation / inset fields | `--sidebar` | `#0d141b` |
| Cards | `--surface` | `#141e28` |
| Raised card footer / neutral badges | `--surface-raised` | `#192530` |
| Structural separators | `--line` | `#2a3a47` |
| Control outlines | `--control-border` | `#647786` |
| Primary text | `--text` | `#e8edf0` |
| Supporting text | `--muted` | `#a7b5c0` |
| Links, emphasis and focus | `--accent`, `--focus` | `#e7c78b` |
| Primary action fill | `--accent-solid` | `#d6b575` |
| Demo notice / selected nav | `--accent-bg` | `#27251e` |
| Evidence context | `--evidence` / `--evidence-bg` | `#8ec8bd` / `#19332f` |
| Withdrawal / unconfirmed | `--warning` / `--warning-bg` | `#efb18e` / `#392b25` |

The original hex system is intentionally small. Orange and teal distinguish research context, accompanied by explicit labels. There are no price colors or safety gradients. One warm filled primary action leads a page; secondary actions use neutral surfaces. Measured rendered contrast pairs and scope are in `evidence/browser-results.json`; full state/color compliance is not claimed.

## Typography

The UI stack is `'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', system-ui, sans-serif`. No font files are bundled; exact CJK glyph appearance depends on the host. Georgia / Times New Roman is used for the text wordmark, monograms and index numbers. SFMono-Regular / Consolas / monospace is used for hashes and stable identifiers.

`--text-display` is `clamp(1.9rem, 2.6vw, 2.75rem)` with 1.3 line height, weight 600 and -0.035em tracking; at ≤38rem h1 is 1.875rem. Global h2 is 1.5rem, h3 1.125rem. Component headings use 1–1.4rem according to density. Body is 1rem/1.65; research paragraphs and card descriptions use .875rem or .8125rem. Utility captions are .75rem/.8125rem, with deliberately smaller 8–11px English micro-identifiers and secondary metadata in dense areas. These smallest annotations are supplementary. System fallback rendering was inspected in Chromium; the precise installed font face and screen-reader pronunciation were not verified.

Headings balance lines; descriptions use pretty wrapping. Long research text, IDs and URLs wrap instead of clipping. Descriptions cap at 64–68ch, explanatory reading content at 72ch. Dynamic numeric values use tabular numbers. Inputs are 16px on narrow viewports to avoid mobile input zoom. Useful text remains selectable; selected text uses gold with a dark foreground.

## Layout

Reusable spacing primitives are 4, 8, 12, 16, 24, 32 and 48px. Cards use 22–28px inset content, section gaps 24–40px. The desktop rail is 232px; content has 40px padding and a 1696px maximum width. The topbar is 76px tall. Footer shares the content edges.

- Above 110rem: content padding grows to 56px; the overview uses three index columns with a 308px research sidebar.
- Default desktop: overview index is two columns with a 272px research sidebar; board is three columns; four research questions form one row.
- At ≤80rem: rail is 204px; research sidebar moves below the index; the board and question cards use two columns.
- At ≤56rem: navigation becomes a static header with three native links. The hero stacks; counts use two columns. Report intro and evidence layout stack. The mobile World link remains in the footer, with the same fixed destination.
- At ≤38rem: project/board/question/about cards stack into one column; search occupies a full row and two filter controls share the next. Comparisons display each claim and its versions vertically. No dashboard scaling, required fullscreen or horizontal carousel is used.

Browser checks cover all four primary routes at 320, 390, 896, 1440 and 1920 CSS px. No document horizontal overflow was found in those checked states. Native 200% zoom and physical device behavior were not checked.

## Elevation & Depth

The interface is mostly flat. Dark page, card and inset tones communicate grouping; 1px borders communicate structure. The selected navigation link has a 2px inset accent edge. Timeline dots have a 4px background-colored ring. There are no floating modals, backdrop blur, gradient text, large drop shadows or ornamental graphics that compete with research.

## Shapes

`--radius` is 12px for cards and panels; `--radius-sm` is 6px for inputs, buttons and smaller insets. Badges/chips are 4px; monograms 10px; switch tracks 20px. The shapes follow their role. Inline SVG paths share 1.6px strokes and currentColor. Monograms are text initials for invented projects, not copied logos or brand assets.

## Components

- `html` and `sourceLink` (`src/ui/html.ts`): escaped text composition and validated HTTPS links with visible destinations. Only application templates produce markup.
- `projectCard` (`src/ui/components.ts`): project identity, explicit status, asset chips, reason/coverage and current report pointer. `compact` supports board density; reading mode retains detailed card content.
- `badge`, `pointer`, `claimCard`, `reportMeta`, `emptyState`: shared labels, evidence/withdrawal tones, four-question cards, date roles and recoverable empty states. Status is independent of evidence completeness.
- `pageHeader`, `demoNotice`, `filters`, `results` (`src/main.ts`): page introduction, permanent context, loaded-only search and native select filters. Search changes only the result region so focus remains in the field. A stable live region announces result counts.
- `reportDetails`, `comparison`, `history`: safe evidence excerpts, readable source destinations, separate version states and stable-claim comparisons. Native `<details>` preserves access to evidence without an overlay.
- `.button` has primary, default, quiet and disabled appearances. Buttons and form controls are at least 44px tall. Project actions are 36px on desktop, 44px on mobile. Contextual links retain normal inline behavior; footer links have a 24px minimum height.
- Native keyboard navigation, a first-tab skip link, 3px gold focus outline, and route focus on h1 are implemented. Comparison fields use explicit `for`/`id` associations. Off/empty/loading/error states explain what happened and provide a relevant next action.

Hover colors are limited to hover-capable pointers. Optional transitions are 150ms on named background/border properties. The .96 press response and transitions occur only under `prefers-reduced-motion: no-preference`; reduced motion is static. Forced-colors focus uses Highlight. No autoplay or continuous animation exists.

## Do's and Don'ts

Reuse pageHeader, demoNotice, the shared repository and projectCard when adding a page. Use the existing grid breakpoints, semantic colors and visible text states. Choose a single primary action and keep research prose at a readable measure. Keep full identity and evidence accessible.

Do not add fake prices, safety scores, live-looking sample counters, unvalidated raw HTML, remote embeds or synthetic images presented as project logos. Do not introduce a second current-version resolver. Do not replace null with zero or hide the demo marker. New routes must retain hash routing and the fixed World URL. New integrations must preserve the separation between UI, domain validation and read-only adapters.
