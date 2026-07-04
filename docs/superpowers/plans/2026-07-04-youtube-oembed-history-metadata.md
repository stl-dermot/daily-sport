# YouTube oEmbed History Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show YouTube oEmbed thumbnails and author names in the `歷史影片` list without adding duration, CRUD, storage, or build tooling.

**Architecture:** Keep the static `index.html` + `data.js` shape. `data.js` remains the manually maintained source of date/title/url/description, while `index.html` renders history rows immediately and then asynchronously enriches YouTube history rows from `https://www.youtube.com/oembed`. Metadata stays in an in-memory `Map`, keyed by video URL, so search and re-rendering do not repeat completed requests.

**Tech Stack:** HTML, inline CSS, vanilla JavaScript `fetch`, YouTube oEmbed JSON, Node.js `assert` and `vm` smoke validation.

---

## File Structure

- Modify: `tests/validate-html.mjs`
  - Responsibility: static checks plus executable smoke tests for the oEmbed endpoint, thumbnail rendering, author rendering, fetch failure fallback, URL encoding, no-duration guard, and existing no-CRUD guard.
- Modify: `index.html`
  - Responsibility: history-row media styling, oEmbed endpoint construction, in-memory metadata cache, async metadata loading, and history row render path.
- Do not modify: `data.js`
  - Responsibility: current manually maintained exercise video records. oEmbed metadata must be runtime-only and not written back into `data.js`.
- Do not stage: `README.md`
  - It is already dirty in this checkout and is unrelated to this oEmbed implementation unless the user explicitly asks to include it.
- Do not stage: `.superpowers/`
  - Visual companion artifacts are not product code.

---

### Task 1: Add Failing oEmbed Validation

**Files:**
- Modify: `tests/validate-html.mjs`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Add static expectations for oEmbed history metadata**

In `tests/validate-html.mjs`, insert these expectation rows in the existing `expectations` array after the `"today media full width"` expectation:

```js
  ["youtube oembed endpoint", /https:\/\/www\.youtube\.com\/oembed/],
  ["oembed metadata cache", /const oEmbedMetadataCache = new Map\(\)/],
  ["oembed loader", /function loadOEmbedMetadata/],
  ["oembed endpoint helper", /function getYoutubeOEmbedUrl/],
  ["history record media class", /record-media/],
  ["history record thumbnail class", /record-thumbnail/],
  ["history record author class", /record-author/],
```

- [ ] **Step 2: Add no-duration guards**

In the same file, after the existing `assert.doesNotMatch(html, />影片列表</, "Old list heading should be renamed");` line, add:

```js
assert.doesNotMatch(html, /播放時長|getDuration|duration/i, "History metadata should not include duration UI or APIs");
```

- [ ] **Step 3: Extend `runApp()` with fake fetch support**

In `runApp(entries, today = "2026-07-03", options = {})`, add `fetch: options.fetch,` to the context object next to `URL,`:

```js
  const context = createContext({
    Date: createFakeDate(today),
    URL,
    fetch: options.fetch,
    document: {
      documentElement,
      querySelector(selector) {
        return elements.get(selector) ?? null;
      },
    },
```

- [ ] **Step 4: Add an async flush helper**

Add this helper after `runApp()`:

```js
async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
```

- [ ] **Step 5: Make the history smoke YouTube URL valid for metadata tests**

In the existing `smokeEntries` array, replace the first entry URL:

```js
    url: "https://youtu.be/FirstSame1",
```

with:

```js
    url: "https://youtu.be/FirstSame1A",
```

The existing `getYoutubeVideoId()` helper validates 11-character YouTube IDs, so this test URL must use an 11-character ID.

- [ ] **Step 6: Add oEmbed success and URL encoding smoke tests**

Insert this block after the existing assertion `assert.doesNotMatch(smokeHistory, /<iframe\b/, "History list should not render iframe embeds");`:

```js
const oEmbedRequests = [];
const oEmbedApp = runApp(smokeEntries, "2026-07-03", {
  fetch: async (requestUrl) => {
    oEmbedRequests.push(String(requestUrl));
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          title: "Remote oEmbed title",
          author_name: "Remote Trainer",
          author_url: "https://www.youtube.com/@remote-trainer",
          thumbnail_url: "https://i.ytimg.com/vi/FirstSame1A/hqdefault.jpg",
          thumbnail_width: 480,
          thumbnail_height: 360,
        };
      },
    };
  },
});

await flushAsyncWork();

const oEmbedHistory = oEmbedApp.elements.get("#history-list").innerHTML;
assert.equal(oEmbedRequests.length, 1, "Only YouTube history rows should request oEmbed metadata");

const requestedOEmbedUrl = new URL(oEmbedRequests[0]);
assert.equal(
  `${requestedOEmbedUrl.origin}${requestedOEmbedUrl.pathname}`,
  "https://www.youtube.com/oembed",
  "oEmbed requests should use the YouTube oEmbed endpoint",
);
assert.equal(
  requestedOEmbedUrl.searchParams.get("url"),
  "https://youtu.be/FirstSame1A",
  "oEmbed requests should encode the original video URL",
);
assert.equal(requestedOEmbedUrl.searchParams.get("format"), "json", "oEmbed requests should ask for JSON");
assert.match(oEmbedHistory, /class="record-thumbnail"/, "Successful oEmbed metadata should render a thumbnail image");
assert.match(oEmbedHistory, /src="https:\/\/i\.ytimg\.com\/vi\/FirstSame1A\/hqdefault\.jpg"/, "Thumbnail should use oEmbed thumbnail_url");
assert.match(oEmbedHistory, /alt="First same day entry"/, "Thumbnail alt text should use the local title");
assert.match(oEmbedHistory, /Remote Trainer/, "Successful oEmbed metadata should render author_name");
assert.doesNotMatch(oEmbedHistory, /Remote oEmbed title/, "Local data.js title should stay authoritative for visible row title");
```

- [ ] **Step 7: Add oEmbed failure fallback smoke tests**

Insert this block after the success smoke tests from Step 6:

```js
const failingOEmbedRequests = [];
const failingOEmbedApp = runApp(smokeEntries, "2026-07-03", {
  fetch: async (requestUrl) => {
    failingOEmbedRequests.push(String(requestUrl));
    return {
      ok: false,
      status: 404,
      async json() {
        return {};
      },
    };
  },
});

await flushAsyncWork();

const failingOEmbedHistory = failingOEmbedApp.elements.get("#history-list").innerHTML;
assert.equal(failingOEmbedRequests.length, 1, "Failed oEmbed requests should still be attempted once per YouTube history URL");
assert.match(failingOEmbedHistory, /First same day entry/, "Failed oEmbed should preserve the local title");
assert.match(failingOEmbedHistory, /Earlier same-day entry should stay in history/, "Failed oEmbed should preserve the local description");
assert.doesNotMatch(failingOEmbedHistory, /record-thumbnail/, "Failed oEmbed should not render a broken thumbnail image");
```

- [ ] **Step 8: Add non-YouTube no-fetch smoke test**

Insert this block after the failure smoke tests from Step 7:

```js
const nonYoutubeFetchRequests = [];
const nonYoutubeHistoryApp = runApp(
  [
    {
      date: "2026-07-03",
      title: "Today workout",
      url: "https://www.youtube.com/watch?v=TodayOnly1A",
      description: "Today card is not enriched by oEmbed",
    },
    {
      date: "2026-07-02",
      title: "External history workout",
      url: "https://example.test/history",
      description: "External history URLs should not call YouTube oEmbed",
    },
  ],
  "2026-07-03",
  {
    fetch: async (requestUrl) => {
      nonYoutubeFetchRequests.push(String(requestUrl));
      return {
        ok: true,
        status: 200,
        async json() {
          return {};
        },
      };
    },
  },
);

await flushAsyncWork();

assert.equal(nonYoutubeFetchRequests.length, 0, "Non-YouTube history URLs should not call YouTube oEmbed");
assert.match(
  nonYoutubeHistoryApp.elements.get("#history-list").innerHTML,
  /External history workout/,
  "Non-YouTube history rows should still render local content",
);
```

- [ ] **Step 9: Run validation and confirm it fails before implementation**

Run:

```bash
node tests/validate-html.mjs
```

Expected: `FAIL` before implementation, with one of these messages:

```text
Missing youtube oembed endpoint
```

or:

```text
Successful oEmbed metadata should render a thumbnail image
```

Do not commit this failing state.

---

### Task 2: Implement History Row oEmbed Rendering

**Files:**
- Modify: `index.html`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Replace history row CSS with thumbnail-ready layout**

In `index.html`, replace the `.record`, `.record:hover`, `.record-handle`, `.record-main`, `.record-date`, `.record-title`, `.record-title a`, `.record-title a:hover`, and `.record-description` CSS block with:

```css
      .record {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px;
        background: var(--row-bg);
        transition: background 140ms ease, border-color 140ms ease;
      }

      .record:hover {
        background: var(--row-hover);
        border-color: color-mix(in srgb, var(--primary) 32%, var(--line));
      }

      .record-media {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 112px;
        aspect-ratio: 16 / 9;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface-muted);
        color: var(--muted);
        overflow: hidden;
        text-decoration: none;
      }

      .record-media:hover {
        border-color: var(--primary);
      }

      .record-media-placeholder {
        padding: 8px;
        text-align: center;
        font-size: 0.78rem;
        line-height: 1.25;
      }

      .record-thumbnail {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .record-main {
        min-width: 0;
      }

      .record-date {
        display: inline-flex;
        align-items: center;
        justify-self: end;
        min-height: 28px;
        border-radius: 999px;
        background: var(--surface-muted);
        color: var(--primary-strong);
        padding: 0 9px;
        font-size: 0.86rem;
        font-weight: 750;
      }

      .record-title {
        margin: 0 0 5px;
        font-size: 1.08rem;
        line-height: 1.35;
        letter-spacing: 0;
      }

      .record-title a {
        text-decoration-color: color-mix(in srgb, var(--primary) 40%, transparent);
        text-underline-offset: 3px;
      }

      .record-title a:hover {
        color: var(--primary);
      }

      .record-author {
        margin: 0 0 5px;
        color: var(--primary-strong);
        font-size: 0.86rem;
        font-weight: 700;
      }

      .record-description {
        margin: 0;
        color: var(--muted);
        white-space: pre-wrap;
      }
```

- [ ] **Step 2: Update mobile CSS for thumbnail rows**

In the `@media (max-width: 720px)` block, replace the existing `.record` and `.record-date` mobile rules with:

```css
        .record {
          grid-template-columns: 96px minmax(0, 1fr);
        }

        .record-media {
          width: 96px;
        }

        .record-date {
          grid-column: 2;
          justify-self: start;
        }
```

- [ ] **Step 3: Add oEmbed cache constants after `entries`**

In the inline script, immediately after:

```js
      const entries = Array.isArray(window.dailySportEntries) ? window.dailySportEntries : [];
```

add:

```js
      const oEmbedMetadataCache = new Map();
      const oEmbedPendingUrls = new Set();
```

- [ ] **Step 4: Add oEmbed helper functions after `getYoutubeEmbedUrl()`**

Insert this code immediately after the existing `getYoutubeEmbedUrl(entry)` function:

```js
      function getYoutubeOEmbedUrl(url) {
        const endpoint = new URL("https://www.youtube.com/oembed");
        endpoint.searchParams.set("url", url);
        endpoint.searchParams.set("format", "json");
        return endpoint.toString();
      }

      function getLoadedOEmbedMetadata(entry) {
        const url = getEntryValue(entry, "url");
        const cached = oEmbedMetadataCache.get(url);
        return cached?.status === "loaded" ? cached.metadata : null;
      }

      function canLoadOEmbedMetadata(entry) {
        const url = getEntryValue(entry, "url");
        return Boolean(url && getYoutubeVideoId(url) && typeof fetch === "function");
      }

      function loadOEmbedMetadata(entry) {
        const url = getEntryValue(entry, "url");

        if (!canLoadOEmbedMetadata(entry) || oEmbedMetadataCache.has(url) || oEmbedPendingUrls.has(url)) {
          return;
        }

        oEmbedPendingUrls.add(url);

        fetch(getYoutubeOEmbedUrl(url))
          .then((response) => {
            if (!response.ok) {
              throw new Error(`YouTube oEmbed failed with ${response.status}`);
            }
            return response.json();
          })
          .then((metadata) => {
            oEmbedMetadataCache.set(url, {
              status: "loaded",
              metadata: metadata && typeof metadata === "object" ? metadata : {},
            });
          })
          .catch(() => {
            oEmbedMetadataCache.set(url, { status: "failed" });
          })
          .finally(() => {
            oEmbedPendingUrls.delete(url);
            render();
          });
      }
```

- [ ] **Step 5: Add history metadata render helpers before `renderHistoryEntries()`**

Insert this code immediately before the existing `renderHistoryEntries(items, query)` function:

```js
      function renderHistoryMedia(entry) {
        const url = getEntryValue(entry, "url");
        const metadata = getLoadedOEmbedMetadata(entry);
        const thumbnailUrl = getEntryValue(metadata, "thumbnail_url");
        const title = getEntryValue(entry, "title");

        if (thumbnailUrl) {
          return `
            <a class="record-media" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
              <img class="record-thumbnail" src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(title)}" loading="lazy">
            </a>
          `;
        }

        const label = getYoutubeVideoId(url) ? "載入縮圖" : "影片";

        if (url) {
          return `
            <a class="record-media record-media-placeholder" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
              <span>${escapeHtml(label)}</span>
            </a>
          `;
        }

        return `
          <div class="record-media record-media-placeholder" aria-hidden="true">
            <span>${escapeHtml(label)}</span>
          </div>
        `;
      }

      function renderHistoryAuthor(entry) {
        const metadata = getLoadedOEmbedMetadata(entry);
        const authorName = getEntryValue(metadata, "author_name");

        return authorName ? `<p class="record-author">${escapeHtml(authorName)}</p>` : "";
      }
```

- [ ] **Step 6: Update `renderHistoryEntries()` row markup and loader trigger**

Inside `renderHistoryEntries(items, query)`, replace the existing `elements.historyList.innerHTML = filtered.map(...).join("");` block with:

```js
        elements.historyList.innerHTML = filtered
          .map((entry) => `
            <article class="record">
              ${renderHistoryMedia(entry)}
              <div class="record-main">
                ${renderEntryTitle(entry, "record-title")}
                ${renderHistoryAuthor(entry)}
                <p class="record-description">${escapeHtml(getEntryValue(entry, "description"))}</p>
              </div>
              <span class="record-date">${escapeHtml(getEntryValue(entry, "date"))}</span>
            </article>
          `)
          .join("");

        filtered.forEach(loadOEmbedMetadata);
```

- [ ] **Step 7: Run validation and confirm it passes**

Run:

```bash
node tests/validate-html.mjs
```

Expected: `PASS` with exit code `0` and no output.

- [ ] **Step 8: Run JavaScript syntax checks**

Run:

```bash
node --check data.js
node --check tests/validate-html.mjs
```

Expected: both commands exit `0` with no output.

- [ ] **Step 9: Commit implementation**

Run:

```bash
git add index.html tests/validate-html.mjs
git commit -m "feat: show youtube oembed metadata in history"
```

Expected: commit includes only `index.html` and `tests/validate-html.mjs`. Do not stage `README.md`.

---

### Task 3: Final Verification and Index Refresh

**Files:**
- No source edits expected.
- Verify: `index.html`, `tests/validate-html.mjs`, `data.js`

- [ ] **Step 1: Run final validation**

Run:

```bash
node tests/validate-html.mjs
node --check data.js
node --check tests/validate-html.mjs
```

Expected: all commands exit `0`; `node tests/validate-html.mjs` prints no output.

- [ ] **Step 2: Confirm no forbidden feature regressed**

Run:

```bash
rg -n "localStorage|sessionStorage|entry-form|data-action=\"edit\"|data-action=\"delete\"|exportEntries|播放時長|getDuration|duration" index.html tests/validate-html.mjs
```

Expected: matches may appear only in `tests/validate-html.mjs` assertions that forbid those strings. There must be no matching production code in `index.html`.

- [ ] **Step 3: Refresh codebase-memory index**

Run the MCP indexer with:

```text
index_repository(repo_path="/Users/dermot/Workspace/stl/daily-sport", mode="fast", persistence=false)
```

Expected: project status returns `indexed`.

- [ ] **Step 4: Inspect final git state**

Run:

```bash
git status --short
git show --stat --name-status --oneline HEAD
```

Expected:

```text
 M README.md
```

may remain in `git status --short` because it predates this implementation. The newest implementation commit should list only:

```text
M	index.html
M	tests/validate-html.mjs
```

If the plan document itself is committed separately before implementation, it should not be included in the implementation commit.
