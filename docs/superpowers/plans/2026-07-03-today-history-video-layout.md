# Today History Video Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the latest video for the browser's current date into a highlighted `今日運動` section and render every other video under `歷史影片`.

**Architecture:** Keep the app as a static `index.html` page loading `data.js`. Add one rendering branch for the highlighted current-day entry and one rendering branch for the searchable history list, with `data.js` order as the source of truth for same-day recency.

**Tech Stack:** HTML, inline CSS, vanilla JavaScript, Node.js `assert` validation.

---

## File Structure

- Modify: `tests/validate-html.mjs`
  - Responsibility: static validation that the page exposes the new `今日運動` and `歷史影片` structure while preserving the no-edit/no-delete/no-localStorage constraints.
- Modify: `index.html`
  - Responsibility: page structure, visual styling, and client-side rendering for today/history video grouping.
- Include unchanged if untracked: `data.js`
  - Responsibility: existing video data source. The implementation reads the existing `window.dailySportEntries` array without adding fields. If `data.js` is untracked, include it in the final commit so `index.html` and `tests/validate-html.mjs` work in a clean checkout.
- Do not stage: `README.md`, `.superpowers/`
  - These are pre-existing local changes or generated brainstorming artifacts and are outside this implementation scope.

---

### Task 1: Update Static Validation For The New Layout

**Files:**
- Modify: `tests/validate-html.mjs:11-16`

- [ ] **Step 1: Write the failing validation expectations**

Replace the current `expectations` array in `tests/validate-html.mjs` with this block:

```js
const expectations = [
  ["data script", /<script src="data\.js"><\/script>/],
  ["today heading", />今日運動</],
  ["history heading", />歷史影片/],
  ["today entry container", /id="today-entry"/],
  ["history list", /id="history-list"/],
  ["history count", /id="history-count"/],
  ["filter field", /id="search-input"/],
  ["data source usage", /window\.dailySportEntries/],
  ["today entry index helper", /findTodayEntryIndex/],
];
```

Add this assertion after the `forbiddenHtml` loop:

```js
assert.doesNotMatch(html, />影片列表</, "Old list heading should be renamed");
```

- [ ] **Step 2: Run the validation and confirm it fails**

Run:

```bash
node tests/validate-html.mjs
```

Expected: the command exits non-zero with an assertion like `Missing today heading`, because `index.html` has not been updated yet.

- [ ] **Step 3: Commit is intentionally skipped for the failing test**

Do not commit the failing test by itself in this small static app. Keep the change in the working tree and make it pass in Task 2 and Task 3 before committing.

---

### Task 2: Add The Today And History Markup And Styles

**Files:**
- Modify: `index.html:8-213`
- Modify: `index.html:235-243`

- [ ] **Step 1: Add layout and playlist-style CSS**

Insert this CSS block after the existing `.panel` rule in `index.html`:

```css
.today-section {
  margin-bottom: 18px;
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 22px;
  border-radius: 999px;
  background: #eceef4;
  color: var(--muted);
  padding: 0 8px;
  font-size: 0.76rem;
  line-height: 1;
}

.today-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 16px;
  align-items: center;
  border-left: 5px solid #665cff;
  border-radius: 8px;
  background: #201d3e;
  color: #f7f6ff;
  padding: 18px 20px;
  box-shadow: 0 18px 34px rgba(34, 31, 63, 0.18);
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
  color: #b8b3ff;
}

.today-description {
  margin: 6px 0 0;
  color: #b8b3ff;
  white-space: pre-wrap;
}

.today-date {
  color: #cbc8db;
  font-size: 0.92rem;
  white-space: nowrap;
}

.history-panel {
  margin-top: 0;
}
```

Add this mobile rule inside the existing `@media (max-width: 720px)` block:

```css
.today-card {
  grid-template-columns: 1fr;
}

.today-date {
  justify-self: start;
}
```

- [ ] **Step 2: Replace the old single list section with two sections**

Replace `index.html:235-243` with this markup:

```html
<section class="today-section" aria-labelledby="today-heading">
  <h2 class="section-heading" id="today-heading">今日運動</h2>
  <div id="today-entry"></div>
</section>

<section class="panel history-panel" aria-labelledby="history-heading">
  <div class="toolbar">
    <h2 id="history-heading">
      歷史影片
      <span class="count-badge" id="history-count">0</span>
    </h2>
    <div class="search-wrap">
      <input id="search-input" type="search" placeholder="搜尋歷史影片的日期、標題或 description">
    </div>
  </div>
  <div class="record-list" id="history-list"></div>
</section>
```

- [ ] **Step 3: Run the validation and confirm only script behavior expectations still fail**

Run:

```bash
node tests/validate-html.mjs
```

Expected: the command still exits non-zero with `Missing today entry index helper`, because the JavaScript helper has not been added yet.

---

### Task 3: Implement Today/History Rendering

**Files:**
- Modify: `index.html:250-303`

- [ ] **Step 1: Replace the `elements` object**

Replace the current `elements` object with:

```js
const elements = {
  today: document.querySelector("#today-entry"),
  historyList: document.querySelector("#history-list"),
  historyCount: document.querySelector("#history-count"),
  search: document.querySelector("#search-input"),
  totalCount: document.querySelector("#total-count"),
  latestDate: document.querySelector("#latest-date")
};
```

- [ ] **Step 2: Replace `sortEntries` and add grouping helpers**

Replace the current `sortEntries` function with this block:

```js
function getEntryValue(entry, key) {
  return entry?.[key] == null ? "" : String(entry[key]);
}

function sortEntries(items) {
  return [...items].sort((a, b) => {
    const dateCompare = getEntryValue(b, "date").localeCompare(getEntryValue(a, "date"));
    if (dateCompare !== 0) return dateCompare;
    return getEntryValue(a, "title").localeCompare(getEntryValue(b, "title"), "zh-Hant");
  });
}

function getTodayString(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function findTodayEntryIndex(items, today = getTodayString()) {
  let latestIndex = -1;

  items.forEach((entry, index) => {
    if (getEntryValue(entry, "date") === today) {
      latestIndex = index;
    }
  });

  return latestIndex;
}

function getSearchText(entry) {
  return [
    getEntryValue(entry, "date"),
    getEntryValue(entry, "title"),
    getEntryValue(entry, "url"),
    getEntryValue(entry, "description")
  ].join(" ").toLowerCase();
}
```

- [ ] **Step 3: Add render helpers after `escapeHtml`**

Insert this block after the existing `escapeHtml` function:

```js
function renderTodayEntry(entry) {
  if (!entry) {
    elements.today.innerHTML = '<div class="empty-state">今天還沒有運動影片</div>';
    return;
  }

  elements.today.innerHTML = `
    <article class="today-card">
      <div>
        <h3 class="today-title">
          <a href="${escapeHtml(getEntryValue(entry, "url"))}" target="_blank" rel="noopener noreferrer">${escapeHtml(getEntryValue(entry, "title"))}</a>
        </h3>
        <p class="today-description">${escapeHtml(getEntryValue(entry, "description"))}</p>
      </div>
      <span class="today-date">${escapeHtml(getEntryValue(entry, "date"))}</span>
    </article>
  `;
}

function renderHistoryEntries(items, query) {
  const filtered = sortEntries(items).filter((entry) => getSearchText(entry).includes(query));

  elements.historyCount.textContent = items.length;

  if (items.length === 0) {
    elements.historyList.innerHTML = '<div class="empty-state">目前沒有歷史影片</div>';
    return;
  }

  if (filtered.length === 0) {
    elements.historyList.innerHTML = '<div class="empty-state">沒有符合條件的歷史影片</div>';
    return;
  }

  elements.historyList.innerHTML = filtered
    .map((entry) => `
      <article class="record">
        <span class="record-date">${escapeHtml(getEntryValue(entry, "date"))}</span>
        <h3 class="record-title">
          <a href="${escapeHtml(getEntryValue(entry, "url"))}" target="_blank" rel="noopener noreferrer">${escapeHtml(getEntryValue(entry, "title"))}</a>
        </h3>
        <p class="record-description">${escapeHtml(getEntryValue(entry, "description"))}</p>
      </article>
    `)
    .join("");
}
```

- [ ] **Step 4: Replace the `render` function**

Replace the current `render` function with:

```js
function render() {
  const query = elements.search.value.trim().toLowerCase();
  const sortedEntries = sortEntries(entries);
  const todayEntryIndex = findTodayEntryIndex(entries);
  const todayEntry = todayEntryIndex >= 0 ? entries[todayEntryIndex] : null;
  const historyEntries = entries.filter((entry, index) => index !== todayEntryIndex);

  elements.totalCount.textContent = entries.length;
  elements.latestDate.textContent = sortedEntries.length ? getEntryValue(sortedEntries[0], "date") : "-";

  renderTodayEntry(todayEntry);
  renderHistoryEntries(historyEntries, query);
}
```

- [ ] **Step 5: Run the validation and confirm it passes**

Run:

```bash
node tests/validate-html.mjs
```

Expected: the command exits with code `0` and prints no assertion error.

---

### Task 4: Browser Check And Commit

**Files:**
- Verify: `index.html`
- Verify: `tests/validate-html.mjs`

- [ ] **Step 1: Start a static server**

Run:

```bash
python3 -m http.server 8000
```

Expected: terminal output includes `Serving HTTP on :: port 8000` or `Serving HTTP on 0.0.0.0 port 8000`.

- [ ] **Step 2: Open the page and verify behavior**

Open:

```text
http://localhost:8000/index.html
```

Expected visible behavior:

- The top section heading reads `今日運動`.
- With the current `data.js` on July 3, 2026, the highlighted card shows `30 MIN LOW IMPACT FULL BODY - No Repeats, No Jumping, No Equipment (Warm Up & Cool Down Included)`.
- The lower section heading reads `歷史影片` with a count badge of `1`.
- The history list shows `30 MIN NO JUMPING HIIT CARDIO - ALL STANDING Workout - No Equipment - No Repeat, Low Impact`.
- Typing a matching term in search filters only the history list.

- [ ] **Step 3: Stop the static server**

Stop the `python3 -m http.server 8000` process with `Ctrl-C`.

Expected: the server exits and no longer occupies port `8000`.

- [ ] **Step 4: Review the final diff**

Run:

```bash
git diff -- index.html tests/validate-html.mjs
```

Expected: the diff only changes the static validation expectations and the `index.html` layout/rendering logic for today/history grouping.

- [ ] **Step 5: Commit the implementation files only**

Run:

```bash
git add index.html tests/validate-html.mjs data.js
git commit -m "Update daily sport video layout"
```

Expected: the commit succeeds and does not include `README.md` or `.superpowers/`. The commit includes `data.js` only if it was untracked so the static page and validation test are self-contained.
