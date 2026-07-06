# Daily Sport Thumbnail Field Design

## Background

`daily-sport` is a static, read-only HTML page. `index.html` reads
`window.dailySportEntries` from `data.js`, renders the latest matching entry as
today's workout, and renders the rest as history.

The current history thumbnail behavior depends on YouTube oEmbed at runtime.
The user confirmed the new behavior should be option A: add a `thumbnail` field
to `data.js`, use that field directly for history thumbnails, and show the
existing placeholder when a row has no thumbnail. The page should not call
oEmbed as a fallback.

## Confirmed Requirements

- Keep the page static and read-only.
- Keep `data.js` as the manually maintained data source.
- Add `thumbnail` to each seeded entry in `data.js`.
- Read history thumbnails directly from `entry.thumbnail`.
- If `thumbnail` is missing or blank, render the placeholder state instead of a
  broken image.
- Do not call `https://www.youtube.com/oembed` for history thumbnails.
- Do not add form, edit, delete, export, `localStorage`, or a backend.
- Keep the today iframe behavior unchanged.

## Data Shape

Each entry should use this shape:

```js
{
  id: "2026-07-03-huyoyjx9pgu",
  date: "2026-07-03",
  title: "30 MIN NO JUMPING HIIT CARDIO - ALL STANDING Workout - No Equipment - No Repeat, Low Impact",
  url: "https://www.youtube.com/watch?v=HuYoYJX9pgU",
  thumbnail: "https://i.ytimg.com/vi/HuYoYJX9pgU/hqdefault.jpg",
  description: "..."
}
```

`thumbnail` is the only source used by the history list image. The code should
not derive a thumbnail URL from `url` during rendering.

## Rendering Design

`renderHistoryMedia(entry)` should:

- Read `url`, `title`, and `thumbnail` from the entry.
- Render `<img class="record-thumbnail">` only when `thumbnail` is present.
- Use the entry title as the image alt text.
- Keep the current link behavior: when `url` exists, clicking the thumbnail or
  placeholder opens the original video URL in a new tab.
- Render the placeholder when `thumbnail` is absent.

The oEmbed-specific helpers, cache, pending-url tracking, loader, and author
rendering should be removed because their only remaining source is the runtime
oEmbed response.

## Error Handling

- Missing `thumbnail` should not create an `<img>` tag.
- Empty or non-string `thumbnail` values should behave like missing values
  through the existing `getEntryValue()` normalization.
- Bad image URLs may still fail at the browser network layer; the app should not
  add new runtime recovery behavior for that case.
- All rendered URL and text values still pass through `escapeHtml()`.

## Testing

Update `tests/validate-html.mjs` to verify:

- `data.js` includes `thumbnail` fields for the seeded entries.
- History rows render `record-thumbnail` using `entry.thumbnail`.
- A row without `thumbnail` renders a placeholder and no image tag.
- The app does not call `fetch` to load history thumbnails.
- The HTML no longer requires oEmbed helpers, oEmbed endpoint strings, oEmbed
  cache, or author rendering.
- Existing safeguards remain: no duration UI, no CRUD UI, no export, and no
  persistent storage.

## Out Of Scope

- Automatically deriving thumbnails from YouTube IDs.
- Falling back to YouTube oEmbed.
- Displaying YouTube author metadata.
- Displaying playback duration.
- Changing today's iframe behavior.
- Adding data editing UI or persistence.
