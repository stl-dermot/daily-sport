# 歷史影片 oEmbed metadata 設計

## 背景

目前 `index.html` 從 `data.js` 的 `window.dailySportEntries` 讀取資料，頁面維持唯讀：今日運動獨立顯示，其餘資料顯示在「歷史影片」列表。使用者希望透過 `https://www.youtube.com/oembed` 取得 metadata，讓歷史影片列表顯示縮圖和播放時長。

實際確認 YouTube oEmbed 回傳包含 `thumbnail_url`、`thumbnail_width`、`thumbnail_height`、`title`、`author_name`、`author_url`、`provider_name`、`html` 等欄位，但不包含播放時長。使用者已確認本次採用「只做 oEmbed 能提供的 metadata：縮圖、標題、作者，不顯示播放時長」。

## 已確認需求

- 維持靜態頁，不新增框架、建置流程或後端。
- 維持 `data.js` 為人工維護的資料來源，資料欄位仍以 date、title、url、description 為主。
- 不新增表單、編輯、刪除、匯出或 `localStorage`。
- 歷史影片列表透過 YouTube oEmbed 取得 metadata。
- 歷史影片列表顯示縮圖，並可補充顯示 oEmbed 作者名稱。
- 不顯示播放時長，因為 YouTube oEmbed 不提供該欄位。
- 今日運動區塊維持現有 iframe 顯示，不納入本次 metadata 視覺調整。

## 設計

頁面仍由 `index.html` 直接執行，不新增依賴。歷史影片列表會先用 `data.js` 的原始資料立即渲染，再非同步補上 oEmbed metadata。

歷史影片每筆資料新增一個 media 區塊：

- 預設狀態顯示 16:9 placeholder。
- oEmbed 成功後顯示 `thumbnail_url`。
- 縮圖使用 entry URL 作為連結，點擊開啟原始影片。
- 若 oEmbed 回傳 `author_name`，在標題下方顯示作者名稱。
- 標題仍優先使用 `data.js` 裡的 title，避免遠端 metadata 改動影響人工整理的文案；oEmbed title 可作為圖片 alt/title 的補充。

## 資料流

1. `render()` 依既有規則切出今日運動與歷史影片。
2. `renderHistoryEntries()` 先用 local entry 資料輸出歷史列表，每筆 article 具備穩定的 `data-entry-id`。
3. 對於有 YouTube URL 的歷史 entry，呼叫 `loadOEmbedMetadata(entry)`。
4. `loadOEmbedMetadata()` 建立 `https://www.youtube.com/oembed?url=<encoded>&format=json` 請求。
5. metadata 以 URL 為 key 快取在記憶體 `Map`，避免搜尋或重新 render 時重複請求。
6. oEmbed 成功後只更新對應 article 的 media/author 區塊。
7. oEmbed 失敗時記錄失敗狀態，該筆保留 placeholder 與原始文字內容。

## 錯誤處理

- 非 YouTube URL 不呼叫 oEmbed，保留現有純文字顯示。
- oEmbed HTTP error、JSON parse error 或網路錯誤不阻斷整頁。
- 若搜尋後該筆已不在 DOM，metadata 成功回來時不做更新。
- 所有遠端字串都經過既有 `escapeHtml()` 後才寫入 DOM。

## 測試

更新 `tests/validate-html.mjs`：

- 檢查 HTML 使用 `https://www.youtube.com/oembed`。
- 檢查歷史列表有 thumbnail/media 區塊與 placeholder 樣式。
- 用 fake `fetch` 驗證 oEmbed URL 會正確 encode 原始影片 URL。
- 驗證 oEmbed 成功時會渲染 thumbnail 與 author。
- 驗證 oEmbed 失敗時仍顯示原始 title、description，且不讓測試 app throw。
- 驗證頁面不包含 duration/播放時長 UI。
- 保留既有 no-CRUD guard：不得出現 form、edit、delete、export、`localStorage`。

## 不在本次範圍

- 自動取得或顯示播放時長。
- 引入 YouTube Data API、IFrame Player API 或 API key。
- 將 oEmbed 結果寫回 `data.js`。
- 改動今日運動 iframe 行為。
- 新增 CRUD 或本機儲存功能。
