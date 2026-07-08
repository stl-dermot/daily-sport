# Daily Sport Banner-Derived Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update the Daily Sport homepage so light mode uses the banner wall color, dark mode uses the banner floor color, the theme toggle remains, and the banner image itself is never recolored.

**Architecture:** Keep the current static architecture: one `index.html`, one `data.js`, and Node-based contract tests in `tests/validate-html.mjs`. Add one local image asset under `assets/`, update only visual CSS/HTML in `index.html`, and extend the validator so future changes cannot remove the banner, recolor it, or regress the read-only data behavior.

**Tech Stack:** Static HTML, inline CSS custom properties, vanilla JavaScript, Node `assert`/`vm` validator, PNG asset.

---

## File Structure

- Create: `assets/banner-cats-gym.png`
  - Permanent project copy of the user-approved banner from `/var/folders/n4/hthhpzrx6h5bgcds271xg4980000gp/T/codex-clipboard-2c3cf56a-9ce9-42cb-bf80-b72c7936d6e1.png`.
- Modify: `tests/validate-html.mjs`
  - Adds static visual-contract checks for the banner, banner asset, wall/floor-derived tokens, and no banner recoloring.
  - Preserves the existing VM smoke checks for data, search, thumbnails, today iframe, and theme toggle behavior.
- Modify: `index.html`
  - Adds the banner markup between the header and `今日運動`.
  - Replaces the purple generic theme tokens with banner-derived light/dark tokens.
  - Keeps the existing theme toggle JavaScript and all rendering/data behavior.

No changes to `data.js`, `worker.js`, `wrangler.jsonc`, `scripts/update-kv.sh`, or the GitHub Pages workflow.

---

### Task 1: Add Visual Contract Tests

**Files:**
- Modify: `tests/validate-html.mjs`

- [ ] **Step 1: Write failing banner/theme assertions**

Update the import at the top of `tests/validate-html.mjs`:

```js
import { existsSync, readFileSync } from "node:fs";
```

Add this asset path near the existing `html` and `data` constants:

```js
const bannerAsset = join(root, "assets", "banner-cats-gym.png");
```

Add these entries to the `expectations` array after the filter-field checks and before the theme toggle checks:

```js
  ["banner section", /<section\b(?=[^>]*\bclass="(?:[^"]*\s)?hero-banner(?:\s[^"]*)?")/],
  ["banner image", /<img\b(?=[^>]*\bclass="(?:[^"]*\s)?hero-banner-image(?:\s[^"]*)?")(?=[^>]*\bsrc="assets\/banner-cats-gym\.png")/],
  ["banner alt text", /<img\b(?=[^>]*\bsrc="assets\/banner-cats-gym\.png")(?=[^>]*\balt="[^"]*貓[^"]*健身[^"]*")/],
  ["wall theme token", /--theme-source-wall:\s*#d0aa7b/i],
  ["floor theme token", /--theme-source-floor:\s*#1d1d1f/i],
  ["hero banner image CSS", /\.hero-banner-image\s*{[^}]*object-fit:\s*cover/],
```

Add these forbidden checks to the `forbiddenHtml` array:

```js
  ["banner CSS filter", /\.hero-banner-image\s*{[^}]*filter\s*:/],
  ["banner mix blend", /\.hero-banner-image\s*{[^}]*mix-blend-mode\s*:/],
  ["banner opacity change", /\.hero-banner-image\s*{[^}]*opacity\s*:/],
  ["banner overlay pseudo element", /\.hero-banner::(?:before|after)/],
```

Add this assertion after the expectation loop and before the forbidden loop:

```js
assert.ok(existsSync(bannerAsset), "Banner asset should be committed at assets/banner-cats-gym.png");
```

- [ ] **Step 2: Run the validator and confirm it fails for the missing contract**

Run:

```bash
node tests/validate-html.mjs
```

Expected: FAIL with one of these messages before implementation:

```text
Missing banner section
```

or:

```text
Banner asset should be committed at assets/banner-cats-gym.png
```

- [ ] **Step 3: Commit the failing test**

Run:

```bash
git add tests/validate-html.mjs
git commit -m "test: add banner theme visual contract"
```

Expected: commit succeeds with only `tests/validate-html.mjs` staged.

---

### Task 2: Add Banner Asset And Homepage Visual Update

**Files:**
- Create: `assets/banner-cats-gym.png`
- Modify: `index.html`

- [ ] **Step 1: Copy the approved banner into the project**

Run:

```bash
mkdir -p assets
cp /var/folders/n4/hthhpzrx6h5bgcds271xg4980000gp/T/codex-clipboard-2c3cf56a-9ce9-42cb-bf80-b72c7936d6e1.png assets/banner-cats-gym.png
file assets/banner-cats-gym.png
```

Expected:

```text
assets/banner-cats-gym.png: PNG image data, 2172 x 724, 8-bit/color RGB, non-interlaced
```

- [ ] **Step 2: Replace the theme variables in `index.html`**

Replace the current `:root`, `@media (prefers-color-scheme: dark)`, and `html[data-theme="dark"]` token blocks with these banner-derived tokens. Keep the rest of the CSS after the token blocks in place.

```css
      :root,
      html[data-theme="light"] {
        color-scheme: light;
        --theme-source-wall: #d0aa7b;
        --theme-source-floor: #1d1d1f;
        --bg: #d0aa7b;
        --bg-soft: #d8b886;
        --surface: rgba(226, 190, 130, 0.74);
        --surface-muted: rgba(95, 73, 43, 0.2);
        --text: #171612;
        --muted: #4c4336;
        --line: rgba(93, 69, 37, 0.46);
        --primary: #7fa34a;
        --primary-strong: #2f4a27;
        --accent-orange: #f4a53d;
        --accent-soft: rgba(244, 165, 61, 0.18);
        --input-bg: rgba(226, 190, 130, 0.58);
        --chip-bg: #20231f;
        --chip-text: #f4ead8;
        --chip-muted: #d5bf8d;
        --today-bg: rgba(226, 190, 130, 0.4);
        --today-text: #171612;
        --today-muted: #4c4336;
        --today-icon-bg: rgba(127, 163, 74, 0.2);
        --row-bg: #151b17;
        --row-hover: #1f281f;
        --row-text: #f4ead8;
        --row-muted: #b9aa91;
        --empty-bg: rgba(226, 190, 130, 0.32);
        --date-bg: #5c4b27;
        --date-text: #f4d38a;
        --focus-ring: #2f4a27;
        --shadow: 0 16px 32px rgba(55, 37, 18, 0.2);
        --chip-shadow: 0 8px 18px rgba(36, 27, 16, 0.2);
      }

      @media (prefers-color-scheme: dark) {
        :root {
          color-scheme: dark;
          --theme-source-wall: #d0aa7b;
          --theme-source-floor: #1d1d1f;
          --bg: #1d1d1f;
          --bg-soft: #242628;
          --surface: rgba(29, 31, 29, 0.92);
          --surface-muted: rgba(111, 90, 53, 0.26);
          --text: #f4ead8;
          --muted: #b9aa91;
          --line: rgba(111, 90, 53, 0.5);
          --primary: #7fa34a;
          --primary-strong: #a8c970;
          --accent-orange: #f4a53d;
          --accent-soft: rgba(127, 163, 74, 0.18);
          --input-bg: rgba(17, 24, 20, 0.9);
          --chip-bg: rgba(28, 31, 27, 0.92);
          --chip-text: #f4ead8;
          --chip-muted: #d5bf8d;
          --today-bg: rgba(17, 24, 20, 0.72);
          --today-text: #f4ead8;
          --today-muted: #b9aa91;
          --today-icon-bg: rgba(127, 163, 74, 0.2);
          --row-bg: #111814;
          --row-hover: #1d251d;
          --row-text: #f4ead8;
          --row-muted: #b9aa91;
          --empty-bg: rgba(17, 24, 20, 0.64);
          --date-bg: #5c4b27;
          --date-text: #f4d38a;
          --focus-ring: #a8c970;
          --shadow: 0 18px 40px rgba(0, 0, 0, 0.34);
          --chip-shadow: none;
        }
      }

      html[data-theme="dark"] {
        color-scheme: dark;
        --theme-source-wall: #d0aa7b;
        --theme-source-floor: #1d1d1f;
        --bg: #1d1d1f;
        --bg-soft: #242628;
        --surface: rgba(29, 31, 29, 0.92);
        --surface-muted: rgba(111, 90, 53, 0.26);
        --text: #f4ead8;
        --muted: #b9aa91;
        --line: rgba(111, 90, 53, 0.5);
        --primary: #7fa34a;
        --primary-strong: #a8c970;
        --accent-orange: #f4a53d;
        --accent-soft: rgba(127, 163, 74, 0.18);
        --input-bg: rgba(17, 24, 20, 0.9);
        --chip-bg: rgba(28, 31, 27, 0.92);
        --chip-text: #f4ead8;
        --chip-muted: #d5bf8d;
        --today-bg: rgba(17, 24, 20, 0.72);
        --today-text: #f4ead8;
        --today-muted: #b9aa91;
        --today-icon-bg: rgba(127, 163, 74, 0.2);
        --row-bg: #111814;
        --row-hover: #1d251d;
        --row-text: #f4ead8;
        --row-muted: #b9aa91;
        --empty-bg: rgba(17, 24, 20, 0.64);
        --date-bg: #5c4b27;
        --date-text: #f4d38a;
        --focus-ring: #a8c970;
        --shadow: 0 18px 40px rgba(0, 0, 0, 0.34);
        --chip-shadow: none;
      }
```

- [ ] **Step 3: Update shared CSS to use the new tokens**

Patch these selectors in `index.html`:

```css
      body {
        margin: 0;
        min-height: 100vh;
        background:
          radial-gradient(circle at 50% -10%, color-mix(in srgb, var(--bg-soft) 72%, transparent), transparent 42rem),
          var(--bg);
        color: var(--text);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 16px;
        line-height: 1.5;
      }

      .app-shell {
        width: min(1440px, calc(100% - 32px));
        margin: 0 auto;
        padding: 28px 0 40px;
      }

      .stat {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        background: var(--chip-bg);
        border: 1px solid var(--line);
        border-radius: 999px;
        color: var(--chip-text);
        padding: 7px 11px;
        box-shadow: var(--chip-shadow);
      }

      .stat span {
        display: inline;
        color: var(--chip-muted);
        font-size: 0.78rem;
        white-space: nowrap;
      }

      .theme-toggle {
        min-height: 36px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: var(--chip-bg);
        color: var(--chip-text);
        padding: 0 13px;
        box-shadow: var(--chip-shadow);
        cursor: pointer;
        white-space: nowrap;
      }

      .record {
        display: grid;
        grid-template-columns: 112px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: start;
        border: 1px solid var(--line);
        border-radius: 8px;
        padding: 12px;
        background: var(--row-bg);
        color: var(--row-text);
        transition: background 140ms ease, border-color 140ms ease;
      }

      .record-description {
        margin: 0;
        color: var(--row-muted);
        white-space: pre-wrap;
      }

      .record-date {
        display: inline-flex;
        align-items: center;
        justify-self: end;
        min-height: 28px;
        border-radius: 999px;
        background: var(--date-bg);
        color: var(--date-text);
        padding: 0 9px;
        font-size: 0.86rem;
        font-weight: 750;
      }
```

- [ ] **Step 4: Add banner CSS**

Insert this CSS after `.header-actions` / `.stats` styles and before `.panel`:

```css
      .hero-banner {
        margin: 0 0 18px;
        border: 1px solid var(--line);
        border-radius: 8px;
        background: var(--surface);
        box-shadow: var(--shadow);
        overflow: hidden;
      }

      .hero-banner-image {
        display: block;
        width: 100%;
        height: clamp(220px, 34vw, 420px);
        object-fit: cover;
        object-position: center;
      }
```

Do not add `filter`, `opacity`, `mix-blend-mode`, `.hero-banner::before`, or `.hero-banner::after`.

- [ ] **Step 5: Add banner markup**

Insert this section after `</header>` and before the `today-section`:

```html
      <section class="hero-banner" aria-label="首頁運動貓健身房橫幅">
        <img
          class="hero-banner-image"
          src="assets/banner-cats-gym.png"
          alt="程式貓在健身房運動的像素風 banner"
          width="2172"
          height="724"
        >
      </section>
```

- [ ] **Step 6: Run the validator and confirm it passes**

Run:

```bash
node tests/validate-html.mjs
```

Expected:

```text
```

The command should exit with status 0 and no output.

- [ ] **Step 7: Commit implementation**

Run:

```bash
git add index.html assets/banner-cats-gym.png
git commit -m "feat: apply banner-derived homepage themes"
```

Expected: commit succeeds with only `index.html` and `assets/banner-cats-gym.png` staged.

---

### Task 3: Full Verification And Visual QA

**Files:**
- Verify: `index.html`
- Verify: `data.js`
- Verify: `tests/validate-html.mjs`
- Verify: `tests/validate-workflow.mjs`

- [ ] **Step 1: Run syntax and contract checks**

Run:

```bash
node --check data.js
node tests/validate-html.mjs
node tests/validate-workflow.mjs
git diff --check
```

Expected:

```text
```

Each command should exit with status 0. `node --check data.js`, `node tests/validate-html.mjs`, `node tests/validate-workflow.mjs`, and `git diff --check` should produce no output.

- [ ] **Step 2: Start a local static server**

Run:

```bash
python3 -m http.server 8000
```

Expected:

```text
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

If port 8000 is already in use, use:

```bash
python3 -m http.server 8001
```

- [ ] **Step 3: Inspect the page in a browser**

Open:

```text
http://127.0.0.1:8000/
```

or the fallback port from Step 2.

Confirm these points visually:

- light mode uses a warm wall-derived page background;
- dark mode uses a floor-derived charcoal background;
- the `深色模式` button switches between the two;
- the banner keeps its original colors in both modes;
- no dark overlay appears on the banner;
- stats, today empty state, search input, and history rows remain readable;
- mobile width does not overflow horizontally.

- [ ] **Step 4: Stop the local server**

Press:

```text
Ctrl-C
```

Expected: server exits and no long-running session remains.

- [ ] **Step 5: Final status check**

Run:

```bash
git status --short
```

Expected after implementation commits:

```text
```

No output, unless the implementation executor intentionally leaves uncommitted screenshots or review notes out of git. Remove transient screenshots before finishing.
