import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

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
  ["data source usage", /window\.dailySportEntries/],
  ["today entry index helper", /findTodayEntryIndex/],
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

assert.doesNotMatch(html, />影片列表</, "Old list heading should be renamed");

assert.match(data, /window\.dailySportEntries\s*=\s*\[/, "Missing data array");
assert.match(data, /date:\s*"2026-07-03"/, "Missing seeded date");
assert.match(data, /url:\s*"https:\/\/www\.youtube\.com\/watch\?v=HuYoYJX9pgU"/, "Missing seeded URL");
assert.match(data, /description:/, "Missing description field");
