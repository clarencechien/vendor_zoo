# Vendor Zoo 乙方動物園

黑色喜劇 IT 外包大逃殺手機網頁遊戲。你是政府「旗艦計畫」五家軟體龍頭之一的外包中間商老闆：
**撐過 15 季，或搞死其他四家獨活**。純前端（單頁 + RWD + PWA）、無後端、離線可玩、台灣正體中文。

## 玩

```bash
npx http-server -p 8080        # 任何靜態伺服器都行
# 開 http://localhost:8080（加 ?seed=123 可固定一局重現）
```

## 架構

| 檔案 | 角色 |
|---|---|
| `js/config.js` | 平衡數值（**唯一真相 = `reference/engine_python_v0.3.py`**，改動要雙向同步） |
| `js/engine.js` | 純遊戲邏輯，零 DOM；季初/季末為 generator，決策點 `yield` |
| `js/narration.js` + `narration_data.js` | 270 條旁白模板，加權挑選＋避開最近用過 |
| `js/ui.js` / `js/main.js` | 渲染與流程接線；UI 只讀 `visibleState()` 迷霧視圖 |
| `sw.js` + `manifest.webmanifest` | PWA：全量預快取、可加主畫面、離線可玩 |
| `reference/` | Python 引擎（平衡實驗室）、SPEC、mockup、素材規格 |
| `assets_raw/` → `assets/` | 原始 PNG(30MB) → 出貨 WebP(2.4MB)，`node tools/optimize_assets.mjs` 重建 |

## 平衡驗證（改數值後必跑）

```bash
node tools/montecarlo.mjs 2000        # JS 引擎三策略 × DEV/PRD
python3 tools/py_baseline.py 1000     # Python 基準對照
```

目標（見 `docs/PARITY_REPORT.md`）：搞事流 DEV ~68% / PRD ~45%，擺爛流 20-35% 且最差。

## 部署（Cloudflare Workers Builds）

資產目錄由版控內的 **`wrangler.jsonc`** 寫死為 `dist/`（純靜態資產 Worker），
不依賴 GUI 設定——Workers 流程的 GUI 沒有輸出目錄欄位，沒有設定檔時它會
fallback 把整個 repo 根目錄（含 `.git/`、建置時裝出的 `node_modules/`）當資產上傳，
直接爆 25MiB 單檔上限。

1. Cloudflare Dashboard → Workers & Pages → 連這個 GitHub repo。
2. 該 Worker → Settings → **Build → Build command：`npm run build`**（產出 `dist/`，約 2.8MB）。
3. Deploy command 留預設（`npx wrangler deploy`，會讀 `wrangler.jsonc` → 只上傳 `dist/`）。
4. `_headers` 會一起進 dist（assets 長快取、sw.js/index 不快取）。
5. 完成後全站走 Cloudflare CDN + 自動 HTTPS；手機開網址→「加入主畫面」即像 App。

本機驗證部署包：`npm run build && npx wrangler deploy --dry-run`。
（若改走 Pages 流程：Build command 同上、Build output directory 填 `dist` 即可；
`.assetsignore` 是根目錄誤部署時的最後保險。）
