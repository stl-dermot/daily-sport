# Daily Sport Light/Dark Visual Design

## Background

The current daily sport page already separates the latest current-day video into `今日運動` and all other entries into `歷史影片`. The next change is visual polish: keep the conservative B direction from the mockup, make the interface feel closer to the provided playlist queue screenshot, and add light/dark mode support.

## Confirmed Direction

- Use the B visual direction: preserve the current light, clean sports-record feel while making the cards and rows more like the screenshot.
- Add both light and dark themes.
- Default theme follows the browser/system `prefers-color-scheme`.
- Add a page-level theme toggle button for Light/Dark.
- Do not use `localStorage`; the manual toggle only lasts for the current page load.
- Keep all data behavior unchanged:
  - `data.js` remains the source.
  - The latest current-day entry remains the last matching original array item.
  - Search still filters only `歷史影片`.
  - Missing URL handling remains plain text, not an empty link.

## Visual System

The page remains a single static `index.html` with inline CSS and vanilla JavaScript.

Use CSS variables for color, border, shadow, and surface values:

- `:root` defines the light theme.
- `@media (prefers-color-scheme: dark)` defines the default dark theme.
- `html[data-theme="light"]` and `html[data-theme="dark"]` override system preference after the user clicks the toggle.

Light mode should keep the current soft off-white background and green-neutral text direction, but improve hierarchy with pill stats, stronger card spacing, and cleaner list rows.

Dark mode should follow the screenshot more closely:

- Near-black page background.
- Dark purple highlighted `今日運動` card.
- Purple left accent and small equalizer/bars icon.
- Dark list rows with muted gray text.
- Subtle dividers rather than heavy borders.

## Layout

Header:

- Keep the title `STL 每日運動影片紀錄`.
- Keep the supporting copy.
- Replace boxy stats with compact pill/chip style stats.
- Add a theme toggle button near the stats.
- The toggle label should show the mode it will switch to, for example `Dark` in light mode and `Light` in dark mode.

Today section:

- Keep heading text `今日運動`.
- Render the existing today card as a playlist-style highlighted card:
  - left purple accent,
  - small equalizer/bars icon,
  - title and description in the content column,
  - date aligned to the right on desktop.
- On mobile, stack date below the title/description and keep text from overflowing.

History section:

- Keep heading text `歷史影片` and count badge.
- Style search as a rounded pill input in the history header.
- Render each history item as a compact row:
  - left handle/list icon,
  - title and description,
  - date on the right on desktop.
- On mobile, stack the date below the text and make the search input full width.

## Interaction

Theme toggle behavior:

1. On load, use system preference unless `data-theme` was already set by script.
2. Clicking the toggle sets `document.documentElement.dataset.theme` to the opposite mode.
3. The toggle text and `aria-pressed` update immediately.
4. No persistence is written to `localStorage`, cookies, or URL parameters.

Search behavior:

- Existing history-only filtering remains unchanged.
- Theme changes do not reset the search query.

## Accessibility

- The theme toggle is a real `<button>`.
- The toggle has an `aria-label` that describes the action.
- `aria-pressed` reflects whether dark mode is currently active.
- Search keeps an accessible label, either visible or via `aria-label`.
- Color contrast must remain readable in both themes.
- Focus states must be visible in both themes.

## Tests

Update `tests/validate-html.mjs` to preserve existing coverage and add theme checks:

- Static checks for the theme toggle button id/class.
- Static check that the page does not use `localStorage`.
- Extend the fake DOM harness with `document.documentElement.dataset` and click dispatch support for the toggle button.
- Smoke test that clicking the toggle sets `document.documentElement.dataset.theme`.
- Smoke test that the toggle can switch back.
- Smoke test that history search still works after a theme toggle.
- Existing smoke coverage for latest today selection, history exclusion, empty states, missing URL handling, and wrapping guard must remain.

## Out Of Scope

- Persisting theme choice across page reloads.
- Changing `data.js`.
- Adding build tooling, a framework, or external dependencies.
- Changing video grouping, search scope, or title link behavior.
- Adding playback controls, thumbnails, YouTube API calls, editing, deletion, or sorting controls.
