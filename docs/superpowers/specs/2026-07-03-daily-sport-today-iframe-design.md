# Daily Sport Today Iframe Design

## Goal

Change the `今日運動` section so the latest workout for the current date is directly playable in the page through an embedded YouTube iframe. Keep the existing B-style visual direction, dark / light mode, and the `歷史影片` list behavior unchanged.

## Current Context

- `data.js` exposes `window.dailySportEntries`.
- `index.html` selects the latest entry whose `date` matches today's local date by using the last matching original array index.
- The selected today entry renders in `#today-entry`.
- Every other entry renders in `#history-list` under the `歷史影片` title.
- The search input filters only history rows.
- The theme toggle changes `document.documentElement.dataset.theme` without persistent storage.

## Approved Layout

Use option A from the iframe layout comparison:

- The today card remains a distinct section under `今日運動`.
- The video iframe becomes the first and largest element in the today card.
- The iframe uses a stable 16:9 aspect ratio and fills the card width.
- The title, description, and date render below the iframe.
- On desktop and mobile, the today card stays a single vertical stack to keep the iframe readable.
- History rows do not embed iframes; they remain compact link rows under `歷史影片`.

## Component Behavior

### Today Entry

When the selected today entry has a valid YouTube URL:

- Render a responsive iframe using the derived embed URL.
- Keep the title as an external link to the original video URL.
- Render description and date below the title.
- Preserve current escaping for user-visible text and URL attributes.

When the selected today entry has no valid embeddable YouTube URL:

- Do not render a broken iframe.
- Fall back to the existing text/link style for the today card.
- Keep the empty-state message unchanged when there is no today entry.

### URL Parsing

Add a small helper that extracts YouTube video IDs from common URL forms:

- `https://www.youtube.com/watch?v=<id>`
- `https://youtu.be/<id>`
- `https://www.youtube.com/shorts/<id>`
- URLs with additional query parameters after the video ID.

The helper returns an empty value for unsupported or malformed URLs. The render path uses that result to decide whether to show the iframe.

### Theme And Responsive Styling

- Reuse the current CSS token system for dark and light colors.
- Keep border radius at 8px or less.
- Add a framed media area that works in both modes.
- Use `aspect-ratio: 16 / 9` so the iframe keeps a stable layout.
- Ensure long titles and descriptions still wrap with the existing overflow guard.

### Accessibility And Embed Attributes

The iframe should include:

- `title` based on the workout title.
- `loading="lazy"`.
- `allowfullscreen`.
- A standard YouTube permission allowlist for playback.
- A referrer policy appropriate for embedded media.

The title link remains keyboard accessible and uses the existing focus styling.

## Data Flow

1. Read `window.dailySportEntries`.
2. Find the current date's latest entry using the existing `findTodayEntryIndex` behavior.
3. Pass the selected entry into `renderTodayEntry`.
4. `renderTodayEntry` derives an embed URL from `entry.url`.
5. If the embed URL exists, render the iframe layout.
6. If the embed URL does not exist, render the fallback today card.
7. Render all non-selected entries through the existing history list.

## Out Of Scope

- No persistent theme setting.
- No editing, deleting, adding, exporting, or importing entries.
- No iframe embeds in `歷史影片`.
- No change to the today selection rule.
- No new dependency or build step.

## Testing Plan

Update `tests/validate-html.mjs` to verify:

- The today card renders an iframe for a normal YouTube watch URL.
- The iframe uses `https://www.youtube.com/embed/<id>`.
- The iframe includes accessible title and expected embed attributes.
- `youtu.be` and `youtube.com/shorts` URLs are parsed.
- Missing or unsupported URLs do not render an empty or broken iframe.
- The latest same-day entry is still selected as today.
- The selected today entry is still excluded from history.
- History search still filters only `歷史影片`.
- Theme toggle behavior remains unchanged.
