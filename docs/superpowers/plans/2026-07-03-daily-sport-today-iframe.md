# Daily Sport Today Iframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the latest `今日運動` entry as an embedded YouTube iframe while keeping all other videos in the `歷史影片` list.

**Architecture:** Keep the existing static app shape: `data.js` remains the data source, `index.html` keeps inline CSS and vanilla JavaScript, and `tests/validate-html.mjs` remains the executable smoke harness. Add a focused YouTube URL parser and route only the selected today entry through the iframe layout; history rendering, search, theme toggling, and today-selection rules stay unchanged.

**Tech Stack:** HTML, inline CSS, vanilla JavaScript, Node.js `assert` and `vm` smoke validation.

---

## File Structure

- Modify: `tests/validate-html.mjs`
  - Responsibility: static checks plus executable smoke tests for iframe rendering, YouTube URL parsing, fallback behavior, existing history behavior, and existing theme behavior.
- Modify: `index.html`
  - Responsibility: today-card media styling, YouTube embed URL derivation, iframe render path, and fallback today-card render path.
- Do not modify: `data.js`
  - Responsibility: current video records; iframe support must derive from existing `url` values.
- Do not stage: `README.md`
  - It is an existing unrelated dirty file in this checkout.
- Do not stage: `.superpowers/`
  - It contains brainstorming visual-companion artifacts only.

---

### Task 1: Add Failing Iframe Validation

**Files:**
- Modify: `tests/validate-html.mjs:12-302`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Add static expectations for iframe support**

Insert these entries into the existing `expectations` array after `["today entry index helper", /findTodayEntryIndex/],`:

```js
  ["youtube video id helper", /function getYoutubeVideoId/],
  ["youtube embed helper", /function getYoutubeEmbedUrl/],
  ["today media class", /today-media/],
  ["today video class", /today-video/],
  ["today iframe aspect ratio", /aspect-ratio:\s*16\s*\/\s*9/],
```

- [ ] **Step 2: Use embeddable URLs in the smoke records**

Replace the current `smokeEntries` block with this block:

```js
const smokeEntries = [
  {
    date: "2026-07-03",
    title: "First same day entry",
    url: "https://youtu.be/FirstSame1",
    description: "Earlier same-day entry should stay in history",
  },
  {
    date: "2026-07-02",
    title: "Yesterday history entry",
    url: "https://example.test/yesterday",
    description: "Regular history entry",
  },
  {
    date: "2026-07-03",
    title: "Last same day entry",
    url: "https://www.youtube.com/watch?v=LastSame99A&feature=share",
    description: "today-only-keyword",
  },
];
```

- [ ] **Step 3: Assert the today iframe render path**

Insert this block after the existing assertions that verify the latest same-day entry is selected and excluded from history:

```js
assert.match(smokeToday, /<iframe\b/, "Today card should render an iframe for a YouTube URL");
assert.match(smokeToday, /class="today-video"/, "Today iframe should use the today video class");
assert.match(
  smokeToday,
  /src="https:\/\/www\.youtube\.com\/embed\/LastSame99A"/,
  "Today iframe should use the derived YouTube embed URL",
);
assert.match(smokeToday, /title="Last same day entry"/, "Today iframe should use the entry title as its accessible title");
assert.match(smokeToday, /loading="lazy"/, "Today iframe should lazy load");
assert.match(smokeToday, /allowfullscreen/, "Today iframe should allow fullscreen playback");
assert.match(smokeToday, /referrerpolicy="strict-origin-when-cross-origin"/, "Today iframe should include a referrer policy");
assert.doesNotMatch(smokeHistory, /<iframe\b/, "History list should not render iframe embeds");
```

- [ ] **Step 4: Add URL variant and fallback smoke tests**

Insert this block before the final `assert.match(html, /overflow-wrap:\s*anywhere/, ...)` assertion:

```js
const shortUrlApp = runApp([
  {
    date: "2026-07-03",
    title: "Short URL workout",
    url: "https://youtu.be/ShortsOk12",
    description: "Short URL should embed",
  },
]);

assert.match(
  shortUrlApp.elements.get("#today-entry").innerHTML,
  /src="https:\/\/www\.youtube\.com\/embed\/ShortsOk12"/,
  "youtu.be URLs should embed",
);

const shortsPathApp = runApp([
  {
    date: "2026-07-03",
    title: "Shorts path workout",
    url: "https://www.youtube.com/shorts/ShortPath1A?feature=share",
    description: "Shorts path should embed",
  },
]);

assert.match(
  shortsPathApp.elements.get("#today-entry").innerHTML,
  /src="https:\/\/www\.youtube\.com\/embed\/ShortPath1A"/,
  "youtube.com/shorts URLs should embed",
);

const unsupportedUrlApp = runApp([
  {
    date: "2026-07-03",
    title: "Unsupported URL workout",
    url: "https://example.test/not-youtube",
    description: "Unsupported URL should fall back",
  },
]);

const unsupportedToday = unsupportedUrlApp.elements.get("#today-entry").innerHTML;
assert.doesNotMatch(unsupportedToday, /<iframe\b/, "Unsupported today URLs should not render iframes");
assert.doesNotMatch(unsupportedToday, /src=""/, "Unsupported today URLs should not render empty iframe sources");
assert.match(unsupportedToday, /Unsupported URL workout/, "Unsupported today URLs should still render title text");
```

- [ ] **Step 5: Strengthen the missing URL fallback assertions**

Add this assertion after the existing missing URL assertions for `missingUrlApp`:

```js
assert.doesNotMatch(missingUrlApp.elements.get("#today-entry").innerHTML, /<iframe\b/, "Missing today URL should not render an iframe");
```

- [ ] **Step 6: Run validation and confirm it fails before implementation**

Run:

```bash
node tests/validate-html.mjs
```

Expected: failure before implementation, with one of these messages:

```text
Missing youtube video id helper
```

or:

```text
Today card should render an iframe for a YouTube URL
```

Do not commit this failing state.

---

### Task 2: Implement Today Iframe Rendering

**Files:**
- Modify: `index.html:237-291`
- Modify: `index.html:425-463`
- Modify: `index.html:596-627`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Replace the today-card CSS with iframe-ready styles**

Replace the current `.today-card`, `.equalizer-icon`, `.today-title`, `.today-title a`, `.today-title a:hover`, `.today-description`, and `.today-date` CSS block with this block:

```css
      .today-card {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        border: 1px solid var(--line);
        border-left: 5px solid var(--primary);
        border-radius: 8px;
        background: var(--today-bg);
        color: var(--today-text);
        overflow: hidden;
        box-shadow: var(--shadow);
      }

      .today-card--fallback {
        grid-template-columns: auto minmax(0, 1fr) auto;
        gap: 14px;
        align-items: center;
        padding: 16px 18px;
      }

      .today-media {
        aspect-ratio: 16 / 9;
        border-bottom: 1px solid var(--line);
        background: #000000;
      }

      .today-video {
        display: block;
        width: 100%;
        height: 100%;
        border: 0;
        background: #000000;
      }

      .today-copy {
        padding: 16px 18px 18px;
      }

      .equalizer-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 34px;
        height: 34px;
        border-radius: 8px;
        background: var(--today-icon-bg);
        color: var(--primary);
        font-size: 0.78rem;
        letter-spacing: 1px;
        line-height: 1;
      }

      .today-title {
        margin: 0;
        font-size: 1.05rem;
        line-height: 1.35;
        letter-spacing: 0;
      }

      .today-title a {
        color: inherit;
        text-decoration: none;
      }

      .today-title a:hover {
        color: var(--primary-strong);
      }

      .today-description {
        margin: 6px 0 0;
        color: var(--today-muted);
        white-space: pre-wrap;
      }

      .today-date {
        display: inline-flex;
        align-items: center;
        margin-top: 10px;
        border-radius: 999px;
        background: var(--today-icon-bg);
        color: var(--today-muted);
        padding: 3px 9px;
        font-size: 0.92rem;
        font-weight: 750;
        white-space: nowrap;
      }

      .today-card--fallback .today-date {
        justify-self: end;
        margin-top: 0;
        background: transparent;
        padding: 0;
        font-weight: 400;
      }
```

- [ ] **Step 2: Update the mobile fallback selector**

Inside the existing `@media (max-width: 720px)` block, replace:

```css
        .today-card {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .today-date {
          grid-column: 2;
          justify-self: start;
        }
```

with:

```css
        .today-card--fallback {
          grid-template-columns: auto minmax(0, 1fr);
        }

        .today-card--fallback .today-date {
          grid-column: 2;
          justify-self: start;
        }
```

- [ ] **Step 3: Add YouTube URL helper functions**

Insert these functions after `renderEntryTitle` and before `renderTodayEntry`:

```js
      function sanitizeYoutubeVideoId(value) {
        const videoId = value == null ? "" : String(value).trim();
        return /^[A-Za-z0-9_-]{6,}$/.test(videoId) ? videoId : "";
      }

      function getYoutubeVideoId(url) {
        const rawUrl = String(url || "").trim();

        if (!rawUrl) {
          return "";
        }

        try {
          const parsedUrl = new URL(rawUrl);
          const hostname = parsedUrl.hostname.replace(/^www\./, "");

          if (hostname === "youtube.com" || hostname === "m.youtube.com") {
            if (parsedUrl.pathname === "/watch") {
              return sanitizeYoutubeVideoId(parsedUrl.searchParams.get("v"));
            }

            const shortsMatch = parsedUrl.pathname.match(/^\/shorts\/([^/?#]+)/);
            return shortsMatch ? sanitizeYoutubeVideoId(shortsMatch[1]) : "";
          }

          if (hostname === "youtu.be") {
            const [videoId] = parsedUrl.pathname.split("/").filter(Boolean);
            return sanitizeYoutubeVideoId(videoId);
          }
        } catch {
          return "";
        }

        return "";
      }

      function getYoutubeEmbedUrl(entry) {
        const videoId = getYoutubeVideoId(getEntryValue(entry, "url"));
        return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
      }
```

- [ ] **Step 4: Replace `renderTodayEntry`**

Replace the full `renderTodayEntry` function with this implementation:

```js
      function renderTodayEntry(entry) {
        if (!entry) {
          elements.today.innerHTML = '<div class="empty-state">今天還沒有運動影片</div>';
          return;
        }

        const embedUrl = getYoutubeEmbedUrl(entry);
        const title = escapeHtml(getEntryValue(entry, "title"));
        const description = escapeHtml(getEntryValue(entry, "description"));
        const date = escapeHtml(getEntryValue(entry, "date"));

        if (!embedUrl) {
          elements.today.innerHTML = `
            <article class="today-card today-card--fallback">
              <span class="equalizer-icon" aria-hidden="true">▮▮▮</span>
              <div>
                ${renderEntryTitle(entry, "today-title")}
                <p class="today-description">${description}</p>
              </div>
              <span class="today-date">${date}</span>
            </article>
          `;
          return;
        }

        elements.today.innerHTML = `
          <article class="today-card">
            <div class="today-media">
              <iframe
                class="today-video"
                src="${escapeHtml(embedUrl)}"
                title="${title}"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
              ></iframe>
            </div>
            <div class="today-copy">
              ${renderEntryTitle(entry, "today-title")}
              <p class="today-description">${description}</p>
              <span class="today-date">${date}</span>
            </div>
          </article>
        `;
      }
```

- [ ] **Step 5: Run validation and confirm it passes**

Run:

```bash
node tests/validate-html.mjs
```

Expected: no stdout. The command exits with code `0` and prints no assertion failures.

- [ ] **Step 6: Commit implementation**

Run:

```bash
git add index.html tests/validate-html.mjs
git commit -m "Embed today workout video"
```

Expected:

```text
[main <commit>] Embed today workout video
```

Do not stage `README.md` or `.superpowers/`.

---

### Task 3: Verify Final Page Behavior

**Files:**
- Verify: `index.html`
- Verify: `tests/validate-html.mjs`

- [ ] **Step 1: Run the smoke validator again**

Run:

```bash
node tests/validate-html.mjs
```

Expected: no stdout. The command exits with code `0` and prints no assertion failures.

- [ ] **Step 2: Inspect the rendered page in the browser**

Open or refresh:

```text
file:///Users/dermot/Workspace/stl/daily-sport/index.html
```

Expected visual behavior:

- `今日運動` shows a full-width 16:9 embedded YouTube player at the top of the today card.
- The title, description, and date sit below the player.
- `歷史影片` remains a compact list and contains no iframe.
- The dark / light toggle still changes mode without clearing the history search input.

- [ ] **Step 3: Confirm only intended files are changed**

Run:

```bash
git status --short
```

Expected after the implementation commit:

```text
 M README.md
?? .superpowers/
```

These two entries are pre-existing or brainstorming-local and must remain unstaged.
