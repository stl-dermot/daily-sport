# 今日運動與歷史影片版面設計

## 背景

目前 `index.html` 會把 `data.js` 的 `window.dailySportEntries` 全部排序後顯示在同一個「影片列表」。使用者希望最新的今日運動項目獨立顯示，其餘影片放在下方列表，列表標題改為「歷史影片」，視覺參考深色 playlist queue 樣式。

## 已確認需求

- 資料格式維持不變，仍由 `data.js` 的 `window.dailySportEntries` 提供。
- 「今日最新」定義為：`data.js` 中日期等於瀏覽器今日日期的最後一筆資料。
- 上方獨立區塊顯示「今日運動」，只放今日最新一筆。
- 下方列表標題改為「歷史影片」，包含今日最新以外的所有資料。
- 歷史列表保留搜尋功能；搜尋只篩選歷史影片，不影響今日運動卡片。
- 點擊今日卡片的影片標題或歷史列表每筆影片標題會開啟影片 URL。

## 版面設計

頁面維持單頁靜態 HTML，不新增框架或建置流程。

上方「今日運動」採用獨立 highlight card：

- 深色背景與左側紫色強調線，對應參考圖的 currently playing 區塊。
- 主要資訊為影片 title，下方顯示 description，右側顯示日期。
- 卡片在手機版改為兩欄或單欄堆疊，避免長 title 擠壓日期。

下方「歷史影片」採用 compact list：

- toolbar 標題由「影片列表」改為「歷史影片」。
- 顯示歷史筆數 badge。
- 每筆保留日期、title、description，樣式較今日卡片低調。
- 目前不加入刪除、編輯、拖曳排序或播放控制。

## 資料流

1. 讀取 `window.dailySportEntries`，若不是陣列則使用空陣列。
2. 使用本機日期產生今日字串，格式為 `YYYY-MM-DD`。
3. 從原始陣列找出所有今日資料，取最後一筆的原始陣列索引作為 `todayEntryIndex`。
4. `historyEntries` 為所有原始陣列索引不是 `todayEntryIndex` 的資料。
5. 歷史列表仍依日期新到舊排序；同日期依 title 排序，沿用目前可預期的列表行為。
6. 搜尋時只在 `historyEntries` 內比對 date、title、url、description。

## 空狀態與錯誤處理

- 沒有今日資料時，「今日運動」顯示簡潔空狀態，不阻斷歷史列表。
- 沒有歷史資料時，「歷史影片」顯示「目前沒有歷史影片」。
- 搜尋無結果時顯示「沒有符合條件的歷史影片」。
- 缺少欄位時以空字串處理並經過 HTML escape，避免破壞 DOM。

## 測試

更新 `tests/validate-html.mjs`：

- 檢查頁面包含 `今日運動` 與 `歷史影片`。
- 檢查今日卡片與歷史列表容器存在。
- 保留既有檢查：使用 `data.js`、`window.dailySportEntries`、搜尋欄位，以及不得出現 localStorage、編輯、刪除、JSON 匯出等功能。

## 不在本次範圍

- 修改資料來源格式。
- 新增後台管理、表單、排序操作、刪除或編輯功能。
- 依 YouTube API 抓取縮圖、長度或頻道資料。
