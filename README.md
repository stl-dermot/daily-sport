# STL 每日運動影片

可直接打開 `index.html` 查看每日運動影片網址與 description；頁面會透過 `data.js` 從 Cloudflare Worker `https://daily-sport-data-api.dermot-c68.workers.dev/entries` 讀取 Workers KV 的資料，若遠端讀取失敗則回到 `data.js` 內的 seed 資料。

KV namespace 為 `daily-sport-data`（ID: `38612c3037d44f66b7f7edf8614fec4b`），資料 key 是 `entries`。每筆資料包含 `id`、`date`、`title`、`url`、`thumbnail`、`description`，其中 `thumbnail` 會直接用在歷史影片列表的縮圖。更新資料時請把完整 JSON 陣列寫入 KV，例如：

```bash
npx wrangler@latest kv key put entries --namespace-id 38612c3037d44f66b7f7edf8614fec4b --remote --path entries.json
```

也可以不用 Wrangler，改用 Cloudflare API token 搭配 curl script：

```bash
read -s CF_API_TOKEN
export CF_API_TOKEN
scripts/update-kv.sh entries.json
```

如果要把目前 `data.js` 內的 seed 資料直接同步到 KV：

```bash
read -s CF_API_TOKEN
export CF_API_TOKEN
scripts/update-kv.sh --from-data-js
```
