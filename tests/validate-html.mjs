import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";
import { Script, createContext } from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const html = readFileSync(join(root, "index.html"), "utf8");
const data = readFileSync(join(root, "data.js"), "utf8");

const expectations = [
  ["data script", /<script src="data\.js"><\/script>/],
  ["today heading", />今日運動</],
  ["history heading", />歷史影片/],
  ["today entry container", /id="today-entry"/],
  ["history list", /id="history-list"/],
  ["history count", /id="history-count"/],
  ["filter field", /id="search-input"/],
  ["filter field aria label", /id="search-input"[^>]*aria-label="搜尋歷史影片"/],
  ["theme toggle", /id="theme-toggle"/],
  ["theme toggle button class", /<button\b(?=[^>]*\sid="theme-toggle")(?=[^>]*\sclass="(?:[^"]*\s)?theme-toggle(?:\s[^"]*)?")/],
  ["theme toggle function", /function toggleTheme/],
  ["system dark media query", /prefers-color-scheme:\s*dark/],
  ["dark theme override", /html\[data-theme="dark"\]/],
  ["light theme override", /html\[data-theme="light"\]/],
  ["opaque focus ring token", /--focus-ring:\s*#[0-9a-fA-F]{6}/],
  ["focus visible outline token", /outline:\s*2px solid var\(--focus-ring\)/],
  ["focus visible outline offset", /outline-offset:\s*3px/],
  ["focus visible halo", /box-shadow:\s*0 0 0 4px color-mix\(in srgb,\s*var\(--focus-ring\)\s*22%,\s*transparent\)/],
  ["data source usage", /window\.dailySportEntries/],
  ["today entry index helper", /findTodayEntryIndex/],
  ["youtube video id helper", /function getYoutubeVideoId/],
  ["youtube embed helper", /function getYoutubeEmbedUrl/],
  ["today media class", /today-media/],
  ["today video class", /today-video/],
  ["today iframe aspect ratio", /aspect-ratio:\s*16\s*\/\s*9/],
];

for (const [label, pattern] of expectations) {
  assert.match(html, pattern, `Missing ${label}`);
}

const forbiddenHtml = [
  ["entry form", /id="entry-form"/],
  ["localStorage", /localStorage/],
  ["edit action", /data-action="edit"|editEntry|編輯/],
  ["delete action", /data-action="delete"|deleteEntry|刪除/],
  ["JSON export button", /id="export-json"|exportEntries|匯出 JSON/],
];

for (const [label, pattern] of forbiddenHtml) {
  assert.doesNotMatch(html, pattern, `Unexpected ${label}`);
}

assert.doesNotMatch(html, /document\.cookie|localStorage|sessionStorage/, "Theme should not use persistent storage");
assert.doesNotMatch(html, />影片列表</, "Old list heading should be renamed");

assert.match(data, /window\.dailySportEntries\s*=\s*\[/, "Missing data array");
assert.match(data, /date:\s*"2026-07-03"/, "Missing seeded date");
assert.match(data, /url:\s*"https:\/\/www\.youtube\.com\/watch\?v=HuYoYJX9pgU"/, "Missing seeded URL");
assert.match(data, /description:/, "Missing description field");

const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert.equal(inlineScripts.length, 1, "Expected one inline app script");

const appScript = new Script(inlineScripts[0], { filename: "index.html inline script" });

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

  addEventListener(type, handler) {
    this.listeners.set(type, handler);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) ?? null;
  }

  click() {
    this.dispatch("click");
  }

  dispatch(type) {
    const handler = this.listeners.get(type);
    if (handler) {
      handler({ type, target: this });
    }
  }
}

function stripTags(value) {
  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countMatches(value, pattern) {
  return [...String(value).matchAll(pattern)].length;
}

function createFakeDate(today) {
  const fixedNow = new Date(`${today}T12:00:00`);

  return class FakeDate extends Date {
    constructor(...args) {
      if (args.length === 0) {
        super(fixedNow.getTime());
      } else {
        super(...args);
      }
    }

    static now() {
      return fixedNow.getTime();
    }
  };
}

function runApp(entries, today = "2026-07-03", options = {}) {
  const elements = new Map([
    ["#today-entry", new FakeElement()],
    ["#history-list", new FakeElement()],
    ["#history-count", new FakeElement()],
    ["#search-input", new FakeElement()],
    ["#total-count", new FakeElement()],
    ["#latest-date", new FakeElement()],
    ["#theme-toggle", new FakeElement()],
  ]);

  const documentElement = { dataset: {} };

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
      matchMedia(query) {
        return {
          matches: query === "(prefers-color-scheme: dark)" ? Boolean(options.prefersDark) : false,
          media: query,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
        };
      },
    },
  });

  appScript.runInContext(context);

  return {
    documentElement,
    elements,
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

const smokeApp = runApp(smokeEntries);
const smokeToday = smokeApp.elements.get("#today-entry").innerHTML;
const smokeHistory = smokeApp.elements.get("#history-list").innerHTML;
const smokeToggle = smokeApp.elements.get("#theme-toggle");

assert.equal(smokeToggle.textContent, "深色模式：關", "Light default should show dark mode off");
assert.equal(smokeToggle.getAttribute("aria-label"), "深色模式", "Theme toggle should have a stable accessible name");
assert.equal(smokeToggle.getAttribute("aria-pressed"), "false", "Light default should not be pressed");

smokeApp.toggleTheme();
assert.equal(smokeApp.documentElement.dataset.theme, "dark", "First click should set dark theme");
assert.equal(smokeToggle.textContent, "深色模式：開", "Dark theme should show dark mode on");
assert.equal(smokeToggle.getAttribute("aria-label"), "深色模式", "Theme toggle accessible name should stay stable in dark mode");
assert.equal(smokeToggle.getAttribute("aria-pressed"), "true", "Dark theme should be pressed");

smokeApp.toggleTheme();
assert.equal(smokeApp.documentElement.dataset.theme, "light", "Second click should set light theme");
assert.equal(smokeToggle.textContent, "深色模式：關", "Light theme should show dark mode off after second click");
assert.equal(smokeToggle.getAttribute("aria-label"), "深色模式", "Theme toggle accessible name should stay stable after returning to light");
assert.equal(smokeToggle.getAttribute("aria-pressed"), "false", "Light theme should not be pressed after second click");

assert.match(smokeToday, /Last same day entry/, "Last original same-day item should render as today");
assert.doesNotMatch(smokeToday, /First same day entry/, "Earlier same-day item should not render as today");
assert.match(smokeHistory, /First same day entry/, "Only the selected today index should be excluded from history");
assert.doesNotMatch(smokeHistory, /Last same day entry/, "Selected today item should be excluded from history");
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

smokeApp.search("today-only-keyword");
assert.match(
  smokeApp.elements.get("#today-entry").innerHTML,
  /Last same day entry/,
  "History search should not hide the today card",
);
assert.match(
  smokeApp.elements.get("#history-list").innerHTML,
  /沒有符合條件的歷史影片/,
  "History search should show no-match empty state when only today matches",
);

smokeApp.toggleTheme();
assert.match(
  smokeApp.elements.get("#today-entry").innerHTML,
  /Last same day entry/,
  "Theme toggle should not hide the today card after search",
);
assert.match(
  smokeApp.elements.get("#history-list").innerHTML,
  /沒有符合條件的歷史影片/,
  "Theme toggle should not reset no-match history state",
);

const preferredDarkApp = runApp(smokeEntries, "2026-07-03", { prefersDark: true });
const preferredDarkToggle = preferredDarkApp.elements.get("#theme-toggle");
assert.equal(preferredDarkToggle.textContent, "深色模式：開", "Preferred dark app should show dark mode on");
assert.equal(preferredDarkToggle.getAttribute("aria-label"), "深色模式", "Preferred dark app should keep the stable accessible name");
assert.equal(preferredDarkToggle.getAttribute("aria-pressed"), "true", "Preferred dark app should start pressed");

const noTodayApp = runApp([smokeEntries[1]]);
assert.match(noTodayApp.elements.get("#today-entry").innerHTML, /今天還沒有運動影片/, "Missing today empty state");

const noHistoryApp = runApp([smokeEntries[2]]);
assert.match(noHistoryApp.elements.get("#history-list").innerHTML, /目前沒有歷史影片/, "Missing history empty state");
assert.equal(noHistoryApp.elements.get("#history-count").textContent, "0", "History count should be zero with no history");

const missingUrlApp = runApp([
  {
    date: "2026-07-03",
    title: "Today missing URL",
    url: "",
    description: "No link should be rendered",
  },
  {
    date: "2026-07-02",
    title: "History missing URL",
    url: "",
    description: "No link should be rendered",
  },
]);

assert.doesNotMatch(missingUrlApp.elements.get("#today-entry").innerHTML, /<a\b[^>]*href=""/, "Today title should not render an empty href");
assert.doesNotMatch(missingUrlApp.elements.get("#history-list").innerHTML, /<a\b[^>]*href=""/, "History title should not render an empty href");
assert.match(missingUrlApp.elements.get("#today-entry").innerHTML, /Today missing URL/, "Today title text should still render");
assert.match(missingUrlApp.elements.get("#history-list").innerHTML, /History missing URL/, "History title text should still render");
assert.doesNotMatch(missingUrlApp.elements.get("#today-entry").innerHTML, /<iframe\b/, "Missing today URL should not render an iframe");

assert.equal(countMatches(missingUrlApp.elements.get("#history-list").innerHTML, /<article class="record">/g), 1);

const shortUrlApp = runApp([
  {
    date: "2026-07-03",
    title: "Short URL workout",
    url: "https://youtu.be/ShortsOk123",
    description: "Short URL should embed",
  },
]);

assert.match(
  shortUrlApp.elements.get("#today-entry").innerHTML,
  /src="https:\/\/www\.youtube\.com\/embed\/ShortsOk123"/,
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

assert.match(html, /overflow-wrap:\s*anywhere/, "Missing long text wrapping guard");
