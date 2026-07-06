# Daily Sport Thumbnail Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move history thumbnails from runtime YouTube oEmbed metadata to the explicit `thumbnail` field in `data.js`.

**Architecture:** Keep the static, read-only app shape. `data.js` remains the only manual data source, while `index.html` directly reads `entry.thumbnail` for history row images and falls back to the existing placeholder when the field is absent. Runtime oEmbed fetch, oEmbed cache, and oEmbed author display are removed because they no longer have an approved data source.

**Tech Stack:** Static HTML, browser JavaScript, `data.js`, Node 24 validation scripts using `node:assert` and `node:vm`.

---

## File Structure

- Modify `tests/validate-html.mjs`: update validation expectations from oEmbed metadata to explicit `thumbnail` fields, keep no-CRUD and no-duration guards, and add runtime assertions that no fetch is used for thumbnails.
- Modify `data.js`: add a `thumbnail` property to each seeded entry.
- Modify `index.html`: remove oEmbed helper/cache/loader/author code and update `renderHistoryMedia(entry)` to read `entry.thumbnail` directly.
- Modify `README.md`: document the expected `thumbnail` field for manually maintained entries.

## Task 1: Update Validation For Thumbnail Field Contract

**Files:**
- Modify: `tests/validate-html.mjs`

- [ ] **Step 1: Replace static oEmbed expectations with thumbnail-field expectations**

In `tests/validate-html.mjs`, replace these entries in the `expectations` array:

```js
  ["youtube oembed endpoint", /https:\/\/www\.youtube\.com\/oembed/],
  ["oembed metadata cache", /const oEmbedMetadataCache = new Map\(\)/],
  ["oembed loader", /function loadOEmbedMetadata/],
  ["oembed endpoint helper", /function getYoutubeOEmbedUrl/],
  ["history record media class", /record-media/],
  ["history record thumbnail class", /record-thumbnail/],
  ["history record author class", /record-author/],
```

with:

```js
  ["history record media class", /record-media/],
  ["history record thumbnail class", /record-thumbnail/],
  ["history thumbnail field usage", /getEntryValue\(entry,\s*"thumbnail"\)/],
```

- [ ] **Step 2: Add forbidden oEmbed assertions**

In the `forbiddenHtml` array, add these entries after the existing `localStorage` guard:

```js
  ["youtube oembed endpoint", /https:\/\/www\.youtube\.com\/oembed/],
  ["oembed metadata cache", /oEmbedMetadataCache/],
  ["oembed pending urls", /oEmbedPendingUrls/],
  ["oembed loader", /loadOEmbedMetadata/],
  ["oembed endpoint helper", /getYoutubeOEmbedUrl/],
  ["oembed author rendering", /renderHistoryAuthor|record-author/],
```

- [ ] **Step 3: Add data thumbnail assertions**

After the existing `assert.match(data, /description:/, "Missing description field");` line, add:

```js
assert.match(data, /thumbnail:/, "Missing thumbnail field");
assert.match(
  data,
  /thumbnail:\s*"https:\/\/i\.ytimg\.com\/vi\/HuYoYJX9pgU\/hqdefault\.jpg"/,
  "Missing seeded thumbnail URL",
);
```

- [ ] **Step 4: Add thumbnail values to smoke test entries**

Replace the `smokeEntries` constant with:

```js
const smokeEntries = [
  {
    date: "2026-07-03",
    title: "First same day entry",
    url: "https://youtu.be/FirstSame1A?si=abc123&feature=share",
    thumbnail: "https://cdn.example.test/first-same-day.jpg",
    description: "Earlier same-day entry should stay in history",
  },
  {
    date: "2026-07-02",
    title: "Yesterday history entry",
    url: "https://example.test/yesterday",
    thumbnail: "https://cdn.example.test/yesterday.jpg",
    description: "Regular history entry",
  },
  {
    date: "2026-07-03",
    title: "Last same day entry",
    url: "https://www.youtube.com/watch?v=LastSame99A&feature=share",
    thumbnail: "https://cdn.example.test/last-same-day.jpg",
    description: "today-only-keyword",
  },
];
```

- [ ] **Step 5: Replace the oEmbed runtime test block**

Delete the block from `const oEmbedRequests = [];` through the assertion that checks `External history URLs should preserve the local description`.

Insert this replacement at the same location:

```js
const thumbnailFetchRequests = [];
const thumbnailApp = runApp(smokeEntries, "2026-07-03", {
  fetch: async (requestUrl) => {
    thumbnailFetchRequests.push(String(requestUrl));
    throw new Error("History thumbnails should not use fetch");
  },
});

await flushAsyncWork();

const thumbnailHistory = thumbnailApp.elements.get("#history-list").innerHTML;
assert.equal(thumbnailFetchRequests.length, 0, "History thumbnails should not call fetch");
assert.match(thumbnailHistory, /class="record-thumbnail"/, "History rows with thumbnail should render an image");
assert.match(
  thumbnailHistory,
  /src="https:\/\/cdn\.example\.test\/first-same-day\.jpg"/,
  "History thumbnail should use entry.thumbnail",
);
assert.match(thumbnailHistory, /alt="First same day entry"/, "Thumbnail alt text should use the local title");
assert.match(thumbnailHistory, /First same day entry/, "Local data.js title should stay authoritative");
assert.doesNotMatch(thumbnailHistory, /Remote Trainer|Remote oEmbed title/, "Runtime metadata should not render");

const missingThumbnailApp = runApp(
  [
    {
      date: "2026-07-03",
      title: "Today workout",
      url: "https://www.youtube.com/watch?v=TodayOnly1A",
      thumbnail: "https://cdn.example.test/today.jpg",
      description: "Today card keeps iframe behavior",
    },
    {
      date: "2026-07-02",
      title: "History without thumbnail",
      url: "https://example.test/history",
      description: "Missing thumbnails should use the placeholder",
    },
  ],
  "2026-07-03",
  {
    fetch: async (requestUrl) => {
      throw new Error(`Missing thumbnail should not fetch ${requestUrl}`);
    },
  },
);

await flushAsyncWork();

const missingThumbnailHistory = missingThumbnailApp.elements.get("#history-list").innerHTML;
assert.match(missingThumbnailHistory, /History without thumbnail/, "Rows without thumbnail should still render local content");
assert.match(missingThumbnailHistory, /Missing thumbnails should use the placeholder/, "Rows without thumbnail should preserve description");
assert.match(missingThumbnailHistory, /record-media-placeholder/, "Rows without thumbnail should render a placeholder");
assert.doesNotMatch(missingThumbnailHistory, /record-thumbnail/, "Rows without thumbnail should not render a thumbnail image");
assert.doesNotMatch(missingThumbnailHistory, /<img\b/, "Rows without thumbnail should not render a broken image element");
```

- [ ] **Step 6: Extend missing-URL coverage to thumbnail rows**

In the later `missingUrlApp` fixture, replace the history entry:

```js
  {
    date: "2026-07-02",
    title: "History missing URL",
    url: "",
    description: "No link should be rendered",
  },
```

with:

```js
  {
    date: "2026-07-02",
    title: "History missing URL",
    url: "",
    thumbnail: "https://cdn.example.test/history-missing-url.jpg",
    description: "No link should be rendered",
  },
```

Then add this assertion after the existing history missing URL assertions:

```js
assert.match(
  missingUrlApp.elements.get("#history-list").innerHTML,
  /src="https:\/\/cdn\.example\.test\/history-missing-url\.jpg"/,
  "History thumbnails without URLs should render without an empty link",
);
```

- [ ] **Step 7: Run the focused validation and verify it fails**

Run:

```bash
node tests/validate-html.mjs
```

Expected: FAIL before implementation. The failure should mention at least one missing `thumbnail` contract or unexpected oEmbed code.

- [ ] **Step 8: Commit the failing validation change**

Run:

```bash
git add tests/validate-html.mjs
git commit -m "test: require thumbnail field source"
```

Expected: a commit containing only `tests/validate-html.mjs`.

## Task 2: Implement Data-Backed History Thumbnails

**Files:**
- Modify: `data.js`
- Modify: `index.html`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Add thumbnail fields to seeded data**

In `data.js`, add `thumbnail` after each `url`.

For the first entry, use:

```js
    thumbnail: "https://i.ytimg.com/vi/HuYoYJX9pgU/hqdefault.jpg",
```

For the second entry, use:

```js
    thumbnail: "https://i.ytimg.com/vi/5LwN80lJvZc/hqdefault.jpg",
```

- [ ] **Step 2: Remove oEmbed state declarations**

In `index.html`, remove:

```js
      const oEmbedMetadataCache = new Map();
      const oEmbedPendingUrls = new Set();
```

- [ ] **Step 3: Remove oEmbed helper functions**

In `index.html`, delete these complete functions:

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
          .then(
            (metadata) => {
              oEmbedMetadataCache.set(url, {
                status: "loaded",
                metadata: metadata && typeof metadata === "object" ? metadata : {},
              });
              oEmbedPendingUrls.delete(url);
              renderCurrentHistoryEntries();
            },
            () => {
              oEmbedMetadataCache.set(url, { status: "failed" });
              oEmbedPendingUrls.delete(url);
              renderCurrentHistoryEntries();
            },
          )
          .finally(() => {
            oEmbedPendingUrls.delete(url);
          });
      }
```

- [ ] **Step 4: Update `renderHistoryMedia(entry)`**

Replace the body of `renderHistoryMedia(entry)` with:

```js
        const url = getEntryValue(entry, "url");
        const thumbnailUrl = getEntryValue(entry, "thumbnail");
        const title = getEntryValue(entry, "title");

        if (thumbnailUrl) {
          const thumbnailImage = `<img class="record-thumbnail" src="${escapeHtml(thumbnailUrl)}" alt="${escapeHtml(title)}" loading="lazy">`;

          if (!url) {
            return `<div class="record-media">${thumbnailImage}</div>`;
          }

          return `
            <a class="record-media" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">
              ${thumbnailImage}
            </a>
          `;
        }

        const label = getYoutubeVideoId(url) ? "縮圖未設定" : "影片";

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
```

- [ ] **Step 5: Remove author rendering**

In `index.html`, delete:

```js
      function renderHistoryAuthor(entry) {
        const metadata = getLoadedOEmbedMetadata(entry);
        const authorName = getEntryValue(metadata, "author_name");

        return authorName ? `<p class="record-author">${escapeHtml(authorName)}</p>` : "";
      }
```

Then remove this line from the history row template:

```js
                ${renderHistoryAuthor(entry)}
```

- [ ] **Step 6: Stop loading oEmbed after rendering**

In `renderHistoryEntries(items, query)`, remove:

```js
        filtered.forEach(loadOEmbedMetadata);
```

- [ ] **Step 7: Run the focused validation and verify it passes**

Run:

```bash
node tests/validate-html.mjs
```

Expected: PASS with no output and exit code 0.

- [ ] **Step 8: Commit the implementation**

Run:

```bash
git add data.js index.html tests/validate-html.mjs
git commit -m "feat: source thumbnails from data"
```

Expected: a commit containing `data.js`, `index.html`, and `tests/validate-html.mjs`.

## Task 3: Document Data Entry Shape And Run Full Verification

**Files:**
- Modify: `README.md`
- Test: `tests/validate-html.mjs`
- Test: `tests/validate-workflow.mjs`

- [ ] **Step 1: Update README data instructions**

Replace the second paragraph of `README.md` with:

```md
可直接打開 `index.html` 查看每日運動影片網址與 description；資料請維護在 `data.js` 的 `window.dailySportEntries` 陣列。每筆資料包含 `id`、`date`、`title`、`url`、`thumbnail`、`description`，其中 `thumbnail` 會直接用在歷史影片列表的縮圖。
```

- [ ] **Step 2: Run HTML validation**

Run:

```bash
node tests/validate-html.mjs
```

Expected: PASS with no output and exit code 0.

- [ ] **Step 3: Run workflow validation**

Run:

```bash
node tests/validate-workflow.mjs
```

Expected: PASS with no output and exit code 0.

- [ ] **Step 4: Inspect final diff**

Run:

```bash
git diff -- data.js index.html tests/validate-html.mjs README.md
```

Expected: the diff only shows the approved thumbnail-field behavior, removal of oEmbed runtime thumbnail code, and README documentation for `thumbnail`.

- [ ] **Step 5: Commit documentation**

Run:

```bash
git add README.md
git commit -m "docs: document thumbnail field"
```

Expected: a commit containing only `README.md`.

- [ ] **Step 6: Confirm clean working tree**

Run:

```bash
git status --short --branch
```

Expected: no unstaged or staged files. The branch may be ahead of `origin/main`.
