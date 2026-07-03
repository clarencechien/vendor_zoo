# Vendor Zoo 乙方動物園

黑色喜劇 IT 外包大逃殺手機網頁遊戲。你是政府「旗艦計畫」五家軟體龍頭之一的外包中間商老闆：
**撐過 15 季，或搞死其他四家獨活**。純前端（單頁 + RWD + PWA）、無後端、離線可玩、台灣正體中文。

## 玩 / 開發

```bash
npx http-server -p 8080        # 任何靜態伺服器都行，開 http://localhost:8080
```

- `?seed=123` 固定一局隨機序（重現 bug / 測試用；每局 seed 也會記在戰報第一條）。
- 出錯時：戰報抽屜 → **🐞 匯出偵錯**，一鍵複製含狀態快照與錯誤堆疊的 json。

## 架構

| 路徑 | 角色 |
|---|---|
| `js/config.js` | 平衡數值（**唯一真相 = `reference/engine_python_v0.3.py`** 的 CONFIG/DIFF/ARCH，改動要雙向同步） |
| `js/engine.js` | 純遊戲邏輯，零 DOM；季初/季末為 generator，玩家決策點 `yield`；UI 只讀 `visibleState()` 迷霧視圖 |
| `js/rng.js` | 可播種 PRNG（mulberry32），引擎所有隨機注入自此 |
| `js/narration.js` + `narration_data.js` | 旁白抽句（加權＋自適應避重複窗）＋ 498 句模板（機器產生，勿手改） |
| `js/ui.js` / `js/main.js` | 渲染元件與流程接線；底部 sheet=玩家操作、中央卡=世界事件（結果分級：例行 toast、有戲出卡） |
| `content/` | **文案單一真相源**：`narration.csv`（498 句）、`style_bible.md`（風格聖經）、`SCORING.md`（評分尺） |
| `sw.js` + `manifest.webmanifest` | PWA：全量預快取、離線可玩；快取版本由 build 蓋時間戳自動汰舊 |
| `assets_raw/` → `assets/` | 原始 PNG（33MB）→ 出貨 WebP（2.6MB） |
| `reference/` | Python 引擎（平衡實驗室）、SPEC、mockup、素材製作規格 |
| `docs/` | 現行文件；`docs/archived/` 為歷史紀錄（HANDOFF、施工規劃、已合併的文案驗收） |

## 工具鏈

| 指令 | 用途 |
|---|---|
| `npm run build` | 打包 `dist/`（部署唯一入口；自動蓋 sw 快取版本戳） |
| `npm run mc`（`node tools/montecarlo.mjs 2000`） | JS 引擎三策略 × DEV/PRD 勝率模擬 |
| `python3 tools/py_baseline.py 1000` | Python 引擎基準（對拍用） |
| `python3 tools/gen_narration.py` | `content/narration.csv` → `narration_data.js` ＋ 回寫 Python CSV（兩邊同步） |
| `node tools/fix_assets.mjs` | 素材入庫守門員：去假透明棋盤底、清 AI 碎片、裁名冊頭像（冪等） |
| `node tools/optimize_assets.mjs`（`npm run assets`） | `assets_raw/` → `assets/` WebP 壓縮 |

## 改東西的規矩

- **平衡數值**：只改 `js/config.js` ＋ Python 同步，改完必跑 `npm run mc` 對拍
  （目標見 `docs/PARITY_REPORT.md`：搞事流 DEV ~68% / PRD ~45%、擺爛流 20-35% 且最差）。
- **新事件/新機制**：先進 Python 實驗室設計、跑 Monte Carlo 過驗收，再移植 JS——文案歸文案、機制歸機制。
- **文案**：只改 `content/narration.csv`（評分照 `content/SCORING.md`，風格照 `style_bible.md`），
  跑 `gen_narration.py` 重生，勿直接改 `narration_data.js`。
- **素材**：新圖丟 `assets_raw/` → `fix_assets.mjs` → `optimize_assets.mjs`；缺圖清單見 `docs/ART_TODO.md`。

## 部署（Cloudflare Workers Builds）

資產目錄由版控內的 **`wrangler.jsonc`** 寫死為 `dist/`（純靜態資產 Worker），不依賴 GUI 設定。

1. Cloudflare Dashboard → Workers & Pages → 連這個 GitHub repo。
2. 該 Worker → Settings → **Build command：`npm run build`**；Deploy command 留預設（`npx wrangler deploy`）。
3. `_headers` 隨 dist 出貨（assets 長快取、sw.js/index 不快取）；sw 版本戳確保部署後客戶端自動更新。
4. 本機驗證部署包：`npm run build && npx wrangler deploy --dry-run`。

## 現況與 TODO

已完成：引擎對拍、UI 接線、素材壓縮與守門、PWA 離線、偵錯匯出、文案 498 句、可讀性/RWD 調校。

- [ ] 補事件/行動卡插圖（清單與接圖步驟：`docs/ART_TODO.md`；生圖管線規劃中，需外部圖像 API）
- [ ] 存檔續玩（localStorage 序列化 game 物件，engine 狀態已可 JSON 化）
- [ ] 各職位多款立繪（目前同款 hue-rotate 區分；規格見 `reference/ASSET_manifest_batch1.md`）
- [ ] 音效（可選配，PWA 可離線包）
- [ ] 新事件擴充（需走 Python 平衡實驗室流程）
