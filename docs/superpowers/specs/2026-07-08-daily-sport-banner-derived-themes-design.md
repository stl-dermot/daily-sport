# Daily Sport Banner-Derived Themes Design

## Background

The current Daily Sport page is a static, read-only workout video log. It renders data from `data.js`, separates the current-day entry into `今日運動`, and lists the remaining records under `歷史影片`.

The next change is visual only: update the homepage to match the approved side-by-side mockup. The mockup shows two theme directions derived from the same pixel-art gym banner:

- Light theme: use the banner wall color as the main UI color.
- Dark theme: use the banner floor color as the main UI color.

The actual page should not show both themes side by side. It should show one active theme at a time and keep the existing theme toggle button.

## Confirmed Direction

- Keep both light and dark themes.
- Keep the `深色模式` toggle button.
- Keep the current non-persistent theme behavior:
  - initial theme follows system `prefers-color-scheme`;
  - clicking the button sets `document.documentElement.dataset.theme`;
  - no `localStorage`, cookies, or URL parameters.
- Preserve the current app behavior:
  - `data.js` remains the source of seed and remote entries;
  - `window.dailySportEntriesReady` remains the async remote-data path;
  - search filters only `歷史影片`;
  - today iframe behavior remains unchanged;
  - history thumbnail behavior remains driven by `entry.thumbnail`.
- Add the pixel-art gym banner as a real page banner.
- Do not change the banner image colors.

## Visual System

The banner is the color source and must remain visually stable:

- no CSS `filter`;
- no opacity changes;
- no blend mode;
- no dark overlay;
- no hue, saturation, brightness, or contrast adjustment.

Use an `<img>` for the banner so the original bitmap is rendered directly. The image may be sized, clipped, rounded, and bordered by CSS, but its pixels should not be recolored.

Use CSS variables for both themes. Sampled banner colors should guide the tokens:

Light theme, wall-derived:

- page background: warm wall tan, approximately `#D0AA7B`;
- muted page gradient/surface: softer tan around `#D8B886`;
- section surfaces: warm translucent tan;
- list rows: deep charcoal/olive for contrast;
- borders: warm brown/tan;
- accent orange and green should come from the banner posters and code details.

Dark theme, floor-derived:

- page background: floor charcoal, approximately `#1D1D1F` to `#242628`;
- section surfaces: dark charcoal/olive;
- list rows: deeper olive-black;
- borders: muted warm gray/brown;
- orange date pills and green focus/hover accents should remain connected to the banner palette.

Avoid the old purple dark-mode system. The new themes should feel like two modes of the same gym/coding banner, not a generic app theme.

## Layout

Header:

- Keep `STL 每日運動影片紀錄`.
- Keep `記錄每天的運動影片網址與 description。`.
- Keep stats pills for total count and latest date.
- Keep the theme toggle near the stats.
- Button text remains:
  - `深色模式：關` in light mode;
  - `深色模式：開` in dark mode.

Banner:

- Place the banner below the header and above `今日運動`.
- Make it full-width within the page shell.
- Use a stable aspect ratio and responsive height so it works on desktop and mobile.
- Preserve the important cats and gym equipment by using sensible object positioning.
- Add subtle border/radius/shadow only outside the image pixels.

Today section:

- Keep heading `今日運動`.
- Keep current empty state text `今天還沒有運動影片`.
- When a today entry exists, keep existing iframe behavior and metadata rendering.
- Style the card with the active theme tokens.

History section:

- Keep heading `歷史影片` and count badge.
- Keep rounded search input and placeholder `搜尋歷史影片的日期、標題或 description`.
- Keep rows with thumbnail, title, description, and date pill.
- Style rows like the mockup: compact, dark enough for video content, and strongly separated from the warm light background.

Mobile:

- Header, stats, and button can stack.
- Banner remains visible and recognizable.
- History rows keep thumbnail and text readable without overflow.
- Search input uses full width.

## Interaction

Theme toggle behavior stays simple:

1. On load, system preference chooses light or dark unless `data-theme` already exists.
2. Clicking the toggle switches between `light` and `dark`.
3. The button text, `aria-label`, and `aria-pressed` update immediately.
4. The toggle does not reset search state or rerender data incorrectly.
5. No theme choice is persisted.

Search behavior remains unchanged:

- It filters history rows only.
- It never hides or changes the today card.
- It still shows the existing no-match empty state.

## Accessibility

- The theme toggle remains a real `<button>`.
- `aria-label="深色模式"` remains stable.
- `aria-pressed` reflects whether dark mode is currently active.
- Focus states must remain visible in both themes.
- Text contrast must be readable against wall-derived and floor-derived backgrounds.
- Banner image needs useful alt text that identifies it as decorative/contextual site artwork without duplicating all visible pixel-art details.

## Tests

Update `tests/validate-html.mjs` to preserve current behavior and reflect the new visual contract:

- Require the banner image element and banner section/class.
- Require the theme toggle button, toggle function, system preference handling, and both explicit theme overrides.
- Require wall/floor-derived color tokens or equivalent theme custom properties.
- Forbid CSS `filter`, `mix-blend-mode`, opacity tricks, or overlay classes on the banner.
- Keep the existing no-persistence assertion: no `localStorage`, cookies, or session storage.
- Keep smoke tests for:
  - latest current-day entry selection;
  - history exclusion;
  - today iframe rendering;
  - history thumbnails from `entry.thumbnail`;
  - missing thumbnail placeholders;
  - missing URL behavior;
  - search no-match behavior;
  - theme toggle not resetting search.

Run at least:

- `node --check data.js`
- `node tests/validate-html.mjs`
- `node tests/validate-workflow.mjs`

## Out Of Scope

- Changing `data.js`.
- Changing Worker or KV behavior.
- Adding CRUD, editing, deletion, export, or in-browser persistence.
- Persisting theme choice.
- Replacing the current static HTML setup with a framework or build tool.
- Showing the light/dark comparison panel on the production page.
- Adding a visible color palette legend to the production page.
