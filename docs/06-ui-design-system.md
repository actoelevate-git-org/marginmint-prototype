# 6. UI & design system

**Goal:** a calm, precise, information-dense B2B product in the spirit of Stripe and Linear. No decorative gradients, no oversized cards, no noise.

## 6.1 Design tokens (`tailwind.config.ts`)

| Token | Value | Use |
|-------|-------|-----|
| `forest` | `#14532D` (+ `600`, `900`, `950`) | Primary buttons, active states, sidebar (`forest-950`) |
| `emerald` | `#16A34A` | Brand accent, focus rings, logo |
| `mint` | `#DCFCE7` | Demo badge, "Filtered" chip |
| `ink` | `#111827` | Primary text |
| `muted` | `#6B7280` | Secondary text |
| `canvas` | `#F8FAFC` | Page background |
| `line` | `#E5E7EB` | Borders, dividers |
| `gain.text` / `gain.soft` | `#15803D` / `#F0FDF4` | Positive change, success |
| `loss.text` / `loss.soft` | `#B91C1C` / `#FEF2F2` | Negative values, errors |
| `warning.text` / `warning.soft` | `#B45309` / `#FFFBEB` | Attention-required |
| `chart.*` | see 6.4 | Chart series only |

- **Typography:** Inter via `next/font` (`--font-sans`), with system fallbacks. Body text is mostly 13 px, page titles 20 px semibold, KPI values 22 px semibold. Financial columns use `.num` (tabular figures) so digits line up.
- **Radius:** 4 to 8 px. **Shadow:** a single subtle `shadow-card`; `shadow-popover` for floating layers.
- **Focus:** a visible 2 px emerald outline on every focusable element.
- **Motion:** minimal. `prefers-reduced-motion` disables animations.

## 6.2 Layout

- **Desktop (≥ 1024 px):** fixed 240 px dark-green sidebar, grouped as *Analyse*, *Operate* and *Workspace*.
- **Below 1024 px:** a hamburger opens the same navigation in a slide-in sheet (`MobileNav` + Radix Dialog).
- **Top bar (sticky):** workspace name, "Demo workspace" badge with an explanatory tooltip, "Demo data as of … IST", and the **global filters** (only on pages where they apply; see `NAV_ITEMS[].filters` in `lib/navigation.ts`).
- **Content:** max width 1440 px, 16 px side gutter on phones.
- **Phones (400 px):** verified with true device emulation. No page scrolls sideways; wide tables scroll **inside** their card.

### Global filters (`components/layout/global-filters.tsx`)

- Date range: **Today / 7D / 30D / 90D / Custom** (a popover with two date inputs, validated: start ≤ end, end ≤ today).
- Marketplace: All / Amazon India / Flipkart / Shopify / D2C website.
- Writes to the URL (`router.push`), resets pagination, and shows a spinner while the server re-renders.
- The sidebar carries `range/start/end/marketplace` across sections, so switching pages keeps the same view.

## 6.3 Component library (`src/components/ui/`)

| Component | Purpose / notes |
|-----------|-----------------|
| `Button`, `buttonVariants` | Variants: default (forest), secondary, ghost, link. Sizes: default, sm, icon. Use `buttonVariants()` on `<a>`/`<Link>` |
| `Card`, `CardHeader`, `CardContent`, `CardFooter` | Standard surface. `Card` is `min-w-0` so charts can't stretch grid columns |
| `Table`, `TableContainer`, `THead`, `TBody`, `Tr`, `Th`, `Td` | `align="right"` on numeric cells applies tabular figures. `TableContainer` is `relative overflow-x-auto` (see 6.6) |
| `SortHeader` | Sortable column header; a `Link` that toggles `sort`/`dir` in the URL; sets `aria-sort` |
| `Pagination` | "Showing x–y of N", Previous/Next links |
| `TabLinks` | Link-based segmented filter with counts (status tabs, sort presets, source switch) |
| `SegmentedControl` | Client-side radio group for view-only state (Daily/Weekly, Chart/Table) |
| `SearchForm` | GET form that keeps the other params as hidden inputs; works without JS |
| `Badge`, `StatusBadge` | Status pills always have **icon + text** (never colour alone) |
| `Delta` | Arrow icon + signed text + screen-reader "Up/Down" |
| `StatTile`, `StatGrid` | Summary tiles on list pages |
| `Tooltip`, `InfoTooltip` | Radix tooltip; `InfoTooltip` is a focusable "i" button that explains financial terms |
| `Notice` | Info/warning callout |
| `EmptyState` | Icon, title, explanation and an action to recover |
| `Skeleton` | Loading placeholders (used by `app/(app)/loading.tsx`) |
| `PageHeader` | Eyebrow, title, description and actions |
| `Input`, `NativeSelect` | Styled native controls (fully accessible) |
| `Sheet` | Slide-in drawer (mobile navigation) |

Feature components live in `components/dashboard`, `components/orders` and `components/integrations`.

## 6.4 Charts

Implemented with Recharts in client components. The palette was **run through a colour-vision-deficiency validator** rather than chosen by eye:

| Series | Colour |
|--------|--------|
| Net sales | `#2A78D6` (blue, with a 10% area wash) |
| Gross profit | `#EB6834` (orange) |
| Net profit | `#16A34A` (green) |
| Waterfall deductions | `#94A3B8` (neutral slate, so status colours stay reserved) |
| Loss result | `#DC2626` |

Validator result: lightness band, chroma and contrast pass. The worst colour-blind pair (orange ↔ green, ΔE 7.4) sits in the "needs secondary encoding" band, so **every multi-series chart has a legend, hover tooltips, and a Table view**.

Chart rules followed:
- One y-axis only (all series are rupees). Never dual-axis.
- 2 px lines, hairline gridlines, recessive axes, compact INR tick labels.
- Unknown values are gaps (`connectNulls={false}`), not zeros.
- The waterfall includes a screen-reader-only table of exact values.
- A single-day range shows "Not enough points for a trend" instead of a lone dot.

## 6.5 UX rules the code follows

1. **No fake controls.** Anything not implemented is either absent or a **disabled** button with a visible reason (e.g. "Import CSV: needs the database layer").
2. **Every data view has loading, empty and error states.** Empty states always offer a way out ("Clear search and status").
3. **Never colour alone.** Status = icon + label; negative numbers also carry a minus sign.
4. **Explain jargon.** COGS, contribution, ROAS, ACOS, return rate, settlement difference: each has an `InfoTooltip`.
5. **Be honest about data.** Demo vs synced is always labelled; estimates are labelled as estimates.
6. **Keyboard and screen reader:** skip link, `aria-current` on nav, `aria-sort` on tables, `role="radiogroup"` on toggles, `aria-busy` on pending forms, `role="alert"` on errors.

## 6.6 Gotchas we hit (so you don't)

| Problem | Cause | Fix in the code |
|---------|-------|-----------------|
| Page scrolled sideways on phones | Grid children default to `min-width: auto`, and Recharts SVGs pushed columns wider | `min-w-0` on `Card`, `StatTile` and the main wrapper |
| Still scrolled sideways on tables | `sr-only` text in sortable headers is `position: absolute`; the scroll wrapper wasn't positioned, so it escaped the clip | `TableContainer` is `relative overflow-x-auto` |
| Overview overflowed by 20 px | Tables ignore `sr-only`'s 1 px width | Wrap the screen-reader table in a `div.sr-only` |
| Charts blank in headless screenshots | Captured before hydration | Not a bug; use a longer render wait |
| A "400 px" Chrome window rendered at ~500 px | Desktop Chrome enforces a minimum window width | Test phone widths with DevTools device emulation, not window size |
