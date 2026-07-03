# Daily Sport Light/Dark Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the daily sport page toward the selected B playlist-inspired visual style and add non-persistent light/dark mode support.

**Architecture:** Keep the existing static `index.html` architecture with inline CSS and vanilla JavaScript. Preserve the current `data.js` source, latest-today selection, history-only search, and smoke coverage while adding CSS-variable themes and one page-local toggle button.

**Tech Stack:** HTML, inline CSS, vanilla JavaScript, Node.js `assert` and `vm` smoke validation.

---

## File Structure

- Modify: `tests/validate-html.mjs`
  - Responsibility: static checks plus executable smoke tests for data/rendering behavior and theme-toggle behavior.
- Modify: `index.html`
  - Responsibility: visual system, theme variables, page markup, theme toggle behavior, and existing video rendering.
- Do not modify: `data.js`
  - Responsibility: existing video records. Theme work must not require data changes.
- Do not stage: `README.md`
  - It is an existing unrelated dirty file in this checkout.

---

### Task 1: Add Failing Theme Toggle Validation

**Files:**
- Modify: `tests/validate-html.mjs:12-223`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Extend static expectations**

Replace the current `expectations` array with this block:

```js
const expectations = [
  ["data script", /<script src="data\.js"><\/script>/],
  ["today heading", />今日運動</],
  ["history heading", />歷史影片/],
  ["today entry container", /id="today-entry"/],
  ["history list", /id="history-list"/],
  ["history count", /id="history-count"/],
  ["filter field", /id="search-input"/],
  ["theme toggle", /id="theme-toggle"/],
  ["theme toggle helper", /function toggleTheme/],
  ["theme CSS system preference", /prefers-color-scheme:\s*dark/],
  ["theme CSS dark override", /html\[data-theme="dark"\]/],
  ["theme CSS light override", /html\[data-theme="light"\]/],
  ["data source usage", /window\.dailySportEntries/],
  ["today entry index helper", /findTodayEntryIndex/],
];
```

Add this assertion after the `forbiddenHtml` loop:

```js
assert.doesNotMatch(html, /document\.cookie|localStorage|sessionStorage/, "Theme preference should not be persisted");
```

- [ ] **Step 2: Extend the fake DOM harness**

Replace the `FakeElement` class with this implementation:

```js
class FakeElement {
  constructor() {
    this._innerHTML = "";
    this._textContent = "";
    this.attributes = new Map();
    this.listeners = new Map();
    this.value = "";
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.textContent = stripTags(this._innerHTML);
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  dispatch(type) {
    const handler = this.listeners.get(type);
    if (handler) {
      handler({ type, target: this });
    }
  }

  click() {
    this.dispatch("click");
  }
}
```

- [ ] **Step 3: Replace `runApp` with a theme-aware harness**

Replace the current `runApp` function with this implementation:

```js
function runApp(entries, today = "2026-07-03", options = {}) {
  const documentElement = { dataset: {} };
  const elements = new Map([
    ["#today-entry", new FakeElement()],
    ["#history-list", new FakeElement()],
    ["#history-count", new FakeElement()],
    ["#search-input", new FakeElement()],
    ["#theme-toggle", new FakeElement()],
    ["#total-count", new FakeElement()],
    ["#latest-date", new FakeElement()],
  ]);

  function matchMedia(query) {
    return {
      matches: query.includes("prefers-color-scheme: dark") ? Boolean(options.prefersDark) : false,
      media: query,
      addEventListener() {},
      removeEventListener() {},
    };
  }

  const context = createContext({
    Date: createFakeDate(today),
    document: {
      documentElement,
      querySelector(selector) {
        return elements.get(selector) ?? null;
      },
    },
    window: {
      dailySportEntries: entries.map((entry) => ({ ...entry })),
      matchMedia,
    },
  });

  appScript.runInContext(context);

  return {
    elements,
    documentElement,
    search(query) {
      const searchInput = elements.get("#search-input");
      searchInput.value = query;
      searchInput.dispatch("input");
    },
    toggleTheme() {
      elements.get("#theme-toggle").click();
    },
  };
}
```

- [ ] **Step 4: Add executable theme smoke tests**

Insert this block after the existing history search smoke assertions:

```js
const themeApp = runApp(smokeEntries);
const themeButton = themeApp.elements.get("#theme-toggle");

assert.equal(themeButton.textContent, "Dark", "Light default should offer switching to dark");
assert.equal(themeButton.getAttribute("aria-pressed"), "false", "Light default should not be pressed");

themeApp.toggleTheme();
assert.equal(themeApp.documentElement.dataset.theme, "dark", "First theme toggle should force dark theme");
assert.equal(themeButton.textContent, "Light", "Dark mode should offer switching to light");
assert.equal(themeButton.getAttribute("aria-pressed"), "true", "Dark mode should be pressed");

themeApp.toggleTheme();
assert.equal(themeApp.documentElement.dataset.theme, "light", "Second theme toggle should force light theme");
assert.equal(themeButton.textContent, "Dark", "Light mode should offer switching to dark");
assert.equal(themeButton.getAttribute("aria-pressed"), "false", "Light mode should not be pressed");

const preferredDarkApp = runApp(smokeEntries, "2026-07-03", { prefersDark: true });
assert.equal(preferredDarkApp.elements.get("#theme-toggle").textContent, "Light", "System dark default should offer switching to light");
assert.equal(preferredDarkApp.elements.get("#theme-toggle").getAttribute("aria-pressed"), "true", "System dark default should be pressed");

themeApp.search("today-only-keyword");
themeApp.toggleTheme();
assert.match(
  themeApp.elements.get("#today-entry").innerHTML,
  /Last same day entry/,
  "Theme toggle should not hide the today card",
);
assert.match(
  themeApp.elements.get("#history-list").innerHTML,
  /沒有符合條件的歷史影片/,
  "Theme toggle should not reset history search",
);
```

- [ ] **Step 5: Run validation and confirm it fails**

Run:

```bash
node tests/validate-html.mjs
```

Expected: exits non-zero with an assertion such as `Missing theme toggle`, because production markup and JavaScript are not implemented yet.

---

### Task 2: Add Light/Dark Theme Variables And Visual Polish CSS

**Files:**
- Modify: `index.html:8-303`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Replace theme variables**

Replace the existing `:root` block with this full CSS block:

```css
:root {
  color-scheme: light;
  --bg: #f6f7f4;
  --surface: #ffffff;
  --surface-muted: #edf2ec;
  --surface-raised: #ffffff;
  --text: #1f2522;
  --muted: #626d68;
  --subtle: #7a8580;
  --line: #d8ded8;
  --primary: #176b5b;
  --primary-strong: #0d4c40;
  --accent: #665cff;
  --accent-soft: #ecebff;
  --today-bg: #ffffff;
  --today-text: #1f2522;
  --today-muted: #626d68;
  --row-bg: #ffffff;
  --input-bg: #ffffff;
  --shadow: 0 18px 34px rgba(39, 50, 45, 0.1);
  --soft-shadow: 0 10px 24px rgba(39, 50, 45, 0.07);
}

@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
    --bg: #101018;
    --surface: #15151e;
    --surface-muted: #1d1d27;
    --surface-raised: #171720;
    --text: #f6f5fb;
    --muted: #aaa8b7;
    --subtle: #7c7b8a;
    --line: #2b2b38;
    --primary: #8f87ff;
    --primary-strong: #b8b3ff;
    --accent: #7167ff;
    --accent-soft: #24204a;
    --today-bg: #231f47;
    --today-text: #ffffff;
    --today-muted: #b8b3ff;
    --row-bg: #171720;
    --input-bg: #171720;
    --shadow: none;
    --soft-shadow: none;
  }
}

html[data-theme="light"] {
  color-scheme: light;
  --bg: #f6f7f4;
  --surface: #ffffff;
  --surface-muted: #edf2ec;
  --surface-raised: #ffffff;
  --text: #1f2522;
  --muted: #626d68;
  --subtle: #7a8580;
  --line: #d8ded8;
  --primary: #176b5b;
  --primary-strong: #0d4c40;
  --accent: #665cff;
  --accent-soft: #ecebff;
  --today-bg: #ffffff;
  --today-text: #1f2522;
  --today-muted: #626d68;
  --row-bg: #ffffff;
  --input-bg: #ffffff;
  --shadow: 0 18px 34px rgba(39, 50, 45, 0.1);
  --soft-shadow: 0 10px 24px rgba(39, 50, 45, 0.07);
}

html[data-theme="dark"] {
  color-scheme: dark;
  --bg: #101018;
  --surface: #15151e;
  --surface-muted: #1d1d27;
  --surface-raised: #171720;
  --text: #f6f5fb;
  --muted: #aaa8b7;
  --subtle: #7c7b8a;
  --line: #2b2b38;
  --primary: #8f87ff;
  --primary-strong: #b8b3ff;
  --accent: #7167ff;
  --accent-soft: #24204a;
  --today-bg: #231f47;
  --today-text: #ffffff;
  --today-muted: #b8b3ff;
  --row-bg: #171720;
  --input-bg: #171720;
  --shadow: none;
  --soft-shadow: none;
}
```

- [ ] **Step 2: Add base button and focus styling**

Insert this block after the existing `input` rule:

```css
button {
  font: inherit;
}

:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--accent) 42%, transparent);
  outline-offset: 3px;
}
```

- [ ] **Step 3: Replace the header/stat styling**

Replace the existing `.stats`, `.stat`, `.stat strong`, and `.stat span` rules with this block:

```css
.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 280px;
}

.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.stat {
  display: inline-flex;
  align-items: baseline;
  gap: 7px;
  min-height: 34px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--text);
  padding: 0 12px;
  box-shadow: var(--soft-shadow);
}

.stat strong {
  display: inline;
  font-size: 0.98rem;
  line-height: 1;
}

.stat span {
  display: inline;
  color: var(--muted);
  font-size: 0.78rem;
}

.theme-toggle {
  min-height: 34px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-raised);
  color: var(--text);
  padding: 0 13px;
  cursor: pointer;
  box-shadow: var(--soft-shadow);
}

.theme-toggle:hover {
  border-color: var(--accent);
  color: var(--primary-strong);
}
```

- [ ] **Step 4: Replace today-card and row styling**

Replace the existing `.today-card`, `.today-title`, `.today-title a`, `.today-title a:hover`, `.today-description`, and `.today-date` rules with:

```css
.today-card {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  border: 1px solid var(--line);
  border-left: 5px solid var(--accent);
  border-radius: 8px;
  background: var(--today-bg);
  color: var(--today-text);
  padding: 17px 19px;
  box-shadow: var(--shadow);
}

.equalizer-icon {
  color: var(--accent);
  font-size: 1.25rem;
  letter-spacing: -0.18em;
  line-height: 1;
}

.today-title {
  margin: 0;
  color: var(--today-text);
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
  color: var(--muted);
  font-size: 0.92rem;
  white-space: nowrap;
}
```

Replace the existing `.search-wrap input`, `.search-wrap input:focus`, `.record`, `.record-date`, `.record-title`, `.record-title a`, `.record-title a:hover`, and `.record-description` rules with:

```css
.search-wrap input {
  width: 100%;
  min-height: 38px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--input-bg);
  color: var(--text);
  padding: 0 14px;
  outline: 0;
  transition: border-color 140ms ease, box-shadow 140ms ease, background 140ms ease;
}

.search-wrap input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
}

.record {
  display: grid;
  grid-template-columns: 22px minmax(0, 1fr) auto;
  gap: 14px;
  align-items: center;
  min-height: 70px;
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 12px 16px;
  background: var(--row-bg);
}

.record-handle {
  color: var(--subtle);
  font-size: 1.1rem;
  line-height: 1;
}

.record-date {
  color: var(--muted);
  font-size: 0.86rem;
  white-space: nowrap;
}

.record-title {
  margin: 0 0 4px;
  color: var(--text);
  font-size: 1.02rem;
  line-height: 1.35;
  letter-spacing: 0;
}

.record-title a {
  text-decoration-color: color-mix(in srgb, var(--primary) 36%, transparent);
  text-underline-offset: 3px;
}

.record-title a:hover {
  color: var(--primary-strong);
}

.record-description {
  margin: 0;
  color: var(--muted);
  white-space: pre-wrap;
}
```

- [ ] **Step 5: Update panel, badge, empty, and mobile styling**

Change `.panel`, `.count-badge`, and `.empty-state` to use variables:

```css
.panel {
  background: transparent;
  border: 0;
  border-top: 1px solid var(--line);
  border-radius: 0;
  box-shadow: none;
  padding: 22px 0 0;
}
```

```css
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  min-height: 22px;
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--muted);
  padding: 0 8px;
  font-size: 0.76rem;
  line-height: 1;
}
```

```css
.empty-state {
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: var(--surface-raised);
  color: var(--muted);
  padding: 26px 18px;
  text-align: center;
}
```

Inside the existing `@media (max-width: 720px)` block, replace the `.stats` and `.today-card`/`.today-date` mobile rules with:

```css
.header-actions,
.stats {
  width: 100%;
  min-width: 0;
  justify-content: flex-start;
}

.today-card,
.record {
  grid-template-columns: 24px minmax(0, 1fr);
}

.today-date,
.record-date {
  grid-column: 2;
  justify-self: start;
}
```

- [ ] **Step 6: Run validation and confirm it still fails on missing markup/JS**

Run:

```bash
node tests/validate-html.mjs
```

Expected: exits non-zero on `Missing theme toggle` or `Missing theme toggle helper`. CSS is present, but markup and JavaScript are not finished.

---

### Task 3: Add Theme Toggle Markup And Playlist Icons

**Files:**
- Modify: `index.html:307-340`
- Modify: `index.html:426-458`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Update header markup**

Replace the current stats block in the header with:

```html
<div class="header-actions">
  <div class="stats" aria-label="紀錄統計">
    <div class="stat">
      <strong id="total-count">0</strong>
      <span>總紀錄</span>
    </div>
    <div class="stat">
      <strong id="latest-date">-</strong>
      <span>最新日期</span>
    </div>
  </div>
  <button class="theme-toggle" id="theme-toggle" type="button" aria-pressed="false" aria-label="Switch to dark mode">Dark</button>
</div>
```

- [ ] **Step 2: Add an accessible search label**

Replace the search input markup with:

```html
<input id="search-input" type="search" aria-label="搜尋歷史影片" placeholder="搜尋歷史影片的日期、標題或 description">
```

- [ ] **Step 3: Update today card rendering with the equalizer icon**

Replace the `elements.today.innerHTML` template inside `renderTodayEntry` with:

```js
elements.today.innerHTML = `
  <article class="today-card">
    <span class="equalizer-icon" aria-hidden="true">▮▮▮</span>
    <div>
      ${renderEntryTitle(entry, "today-title")}
      <p class="today-description">${escapeHtml(getEntryValue(entry, "description"))}</p>
    </div>
    <span class="today-date">${escapeHtml(getEntryValue(entry, "date"))}</span>
  </article>
`;
```

- [ ] **Step 4: Update history row rendering with the handle icon and date column**

Replace the `.map((entry) => ... )` template inside `renderHistoryEntries` with:

```js
.map((entry) => `
  <article class="record">
    <span class="record-handle" aria-hidden="true">☰</span>
    <div>
      ${renderEntryTitle(entry, "record-title")}
      <p class="record-description">${escapeHtml(getEntryValue(entry, "description"))}</p>
    </div>
    <span class="record-date">${escapeHtml(getEntryValue(entry, "date"))}</span>
  </article>
`)
```

- [ ] **Step 5: Run validation and confirm JavaScript helper still fails**

Run:

```bash
node tests/validate-html.mjs
```

Expected: exits non-zero on `Missing theme toggle helper` or a theme toggle smoke assertion because behavior is not implemented yet.

---

### Task 4: Implement Non-Persistent Theme Toggle Behavior

**Files:**
- Modify: `index.html:347-478`
- Test: `tests/validate-html.mjs`

- [ ] **Step 1: Add `themeToggle` to the `elements` object**

Replace the `elements` object with:

```js
const elements = {
  today: document.querySelector("#today-entry"),
  historyList: document.querySelector("#history-list"),
  historyCount: document.querySelector("#history-count"),
  search: document.querySelector("#search-input"),
  themeToggle: document.querySelector("#theme-toggle"),
  totalCount: document.querySelector("#total-count"),
  latestDate: document.querySelector("#latest-date")
};
```

- [ ] **Step 2: Add theme helper functions**

Insert this block after `escapeHtml`:

```js
function getSystemTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getCurrentTheme() {
  return document.documentElement.dataset.theme || getSystemTheme();
}

function getNextTheme() {
  return getCurrentTheme() === "dark" ? "light" : "dark";
}

function updateThemeToggle() {
  const currentTheme = getCurrentTheme();
  const nextTheme = currentTheme === "dark" ? "Light" : "Dark";

  elements.themeToggle.textContent = nextTheme;
  elements.themeToggle.setAttribute("aria-label", `Switch to ${nextTheme.toLowerCase()} mode`);
  elements.themeToggle.setAttribute("aria-pressed", String(currentTheme === "dark"));
}

function toggleTheme() {
  document.documentElement.dataset.theme = getNextTheme();
  updateThemeToggle();
}
```

- [ ] **Step 3: Register the theme toggle without changing existing render order**

Replace the existing listener/render footer with:

```js
elements.search.addEventListener("input", render);
elements.themeToggle.addEventListener("click", toggleTheme);
updateThemeToggle();
render();
```

- [ ] **Step 4: Run validation and confirm it passes**

Run:

```bash
node tests/validate-html.mjs
```

Expected: exits `0` with no assertion output.

---

### Task 5: Browser Verification And Commit

**Files:**
- Verify: `index.html`
- Verify: `tests/validate-html.mjs`

- [ ] **Step 1: Start a static server**

Run:

```bash
python3 -m http.server 8000
```

Expected: terminal output includes `Serving HTTP on` and port `8000`.

- [ ] **Step 2: Open and verify the page visually**

Open:

```text
http://localhost:8000/index.html
```

Expected visible behavior:

- Light mode keeps an off-white page and polished pill stats.
- The `今日運動` card has a purple left accent and equalizer icon.
- The `歷史影片` rows have a left handle icon, compact spacing, and date on the right on desktop.
- Search input appears as a pill in the history header.
- The theme toggle starts as `Dark` when the browser is in light mode.
- Clicking the toggle changes the page to dark mode and the toggle label changes to `Light`.
- Clicking again returns to light mode and the label changes to `Dark`.
- A search query remains active after toggling theme.

- [ ] **Step 3: Stop the static server**

Stop the server with `Ctrl-C`.

Expected: port `8000` is released.

- [ ] **Step 4: Run final automated checks**

Run:

```bash
node tests/validate-html.mjs
git diff --check
```

Expected: both commands exit `0`.

- [ ] **Step 5: Commit implementation files only**

Run:

```bash
git add index.html tests/validate-html.mjs
git commit -m "Polish daily sport light dark UI"
```

Expected: commit succeeds. `README.md` remains unstaged if it was dirty before this work.
