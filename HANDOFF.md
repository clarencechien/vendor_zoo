# Vendor Zoo 乙方動物園 — Claude Code 交接包

> 一款黑色喜劇 IT 外包大逃殺手機遊戲。你(Claude Code)接手的任務：**把已完成的視覺 mockup + 已驗證的 Python 遊戲引擎，合併成一個能玩的純前端 JS 網頁遊戲(單頁 + RWD + PWA)**。
> 這份是總交接文件。所有需要的東西都在這個資料夾裡。

---

## 0. TL;DR — 你要做什麼

1. 讀 `reference/SPEC_web.md`（完整規格）+ `reference/engine_python_v0.3.py`（遊戲邏輯真相來源）。
2. 把 Python 引擎的邏輯**翻寫成 JavaScript**（`engine.js`），對齊 CONFIG/DIFF 數值。
3. 把 `reference/mockup_v10.html`（已完成的視覺殼）**接上 engine**：動作按鈕觸發真邏輯、狀態渲染回 UI、事件/結局用真插圖。
4. 把 mockup 內嵌的 base64 圖**改成從 `assets/` 外部載入**（mockup 現在 3.2MB 太肥）。
5. 做成 **PWA**（manifest + service worker，可加主畫面、離線可玩）。
6. 保留 Python 引擎當**平衡實驗室**（`grid()`/`score_balance()` 用），JS 版當出貨遊戲；兩者 CONFIG 數值要同步。

**驗收**：JS 引擎能單獨跑 Monte Carlo，勝率對拍 Python 版（DEV~68% / PRD~44%，擺爛流被壓在 20-35%）。

---

## 1. 遊戲一句話

你是政府「旗艦計畫」五家軟體龍頭之一的**外包中間商老闆**（乙方）。這是大逃殺：撐過 15 季，或搞死其他四家獨活。核心動詞是**搞同行**（檢舉／放假消息／挖角／塞毒模組）。你搞的每一手都記帳——技術債會爆、團隊會崩、稽核會來、被搞的對手會記仇反撲。**表面萌(動物社畜)，內裡黑色幽默。**

台灣正體中文，用詞在地（影片非視頻、軟體非軟件、網路非網絡…）。

---

## 2. 資料夾內容

```
vendor_zoo_handoff/
├── HANDOFF.md                  ← 本文件
├── reference/
│   ├── engine_python_v0.3.py   ← ★遊戲邏輯真相來源(能跑，含 main()/grid()/score_balance())
│   ├── SPEC_web.md             ← ★完整規格書(狀態/公式/CONFIG/DIFF/UI/PWA/驗收清單)
│   ├── mockup_v10.html         ← ★視覺殼(暖色像素皮，全真素材，3.2MB 因內嵌 base64)
│   └── ASSET_manifest_batch1-3.md  ← 素材製作規格(風格聖經、prompt、命名規則)
└── assets/                     ← 所有素材 PNG(透明去背，已切好)
    ├── backgrounds/  office_bg.png(辦公室背景) / title_screen.png(開場標題，上方留白給logo、下方留白給start鈕)
    ├── sprites/      emp_{eng|pm|sales}_{m|f}_{stand|sit|orz}.png(員工立繪 3職×3姿)
    ├── rivals/       rival_logo_{M|H|T|G}.png(對手動物logo：鯨/象/虎/河馬)
    ├── cases/        case_{gov|bank|sp500|small|legacy}.png(案型icon)
    ├── hud/          hud_{season|coin|ap|morale|audit|hand}.png
    ├── buttons/      btn_{bid|mess|ops|hand|end}.png(5大類) + btn_{talk|rescue|bonus|hire|recon|draw}.png(子選單)
    └── events/       evt_{explode|audit|rival_down|windfall}.png(事件) + end_{survive|solo|lose_cash|lose_morale|lose_audit}.png(5結局)
```

---

## 3. 目標架構（純前端 A 方案）

**單一 `index.html` + 外部 assets + JS 模組**。無後端、離線可玩。

建議分層（可拆檔）：
- `config.js` — CONFIG / DIFF（**對齊 Python 版數值**，見 §4）
- `narration.js` — 270 條旁白模板 + 抽句（**加權挑選 + 避開最近用過**，見 §5）
- `engine.js` — 純遊戲邏輯：狀態機、擲骰、7 動作、季末結算、事件袋、仇恨反撲、稽核、勝負。**不碰 DOM**（才能單獨跑 Monte Carlo 自測、對拍 Python）
- `ui.js` — DOM 渲染 + 事件綁定；每次動作後 re-render 讀 `game` 物件（單向資料流）
- `pwa`：manifest.json + sw.js（service worker 需獨立檔才能離線）

狀態集中在單一 `game` 物件（對應 Python `Game` class）。

---

## 4. 遊戲邏輯（真相在 Python，SPEC 有全表）

**別自己發明數值**——全部從 `engine_python_v0.3.py` 的 `CONFIG` / `DIFF` / `ARCH`(案型表) 抄。`SPEC_web.md` §1-11 已整理成表格，包含：
- CONFIG 全數值、MODE(DEV/PRD) 難度倍率
- 狀態模型(Game/Case/Rival/Staff，標了哪些對玩家隱藏＝迷霧)
- 5 案型隱藏參數表(政府/銀行/S&P500/小公司/傳產，破「一招打天下」)
- 6 大公式(擲骰/搶標DC/救火/甩鍋真兩難/收入隨風險遞減/稽核延遲帳單)
- 7 動作(搶標/話術二選一/救火/搞同行/抽卡/獎金/招人 + 免費：手牌上限3/查核/看狀態)
- 事件袋(11事件，抽牌不放回+冷卻)、仇恨反撲(3-tier，放血不秒殺)、對手倒閉→接盤→獨活
- 勝負(存活/獨活/現金死/士氣死/稽核死)

**關鍵設計原則**（別改壞）：
- 迷霧：玩家看不到 risk/sat/reputation/sin/對手hate 的數字，只看紅綠燈🟢🟡🔴、血條、稽核風聲。查核撥霧是唯一解。
- 甩鍋是真兩難：硬扛賠錢但罪孽不增／甩鍋成功不賠但養稽核延遲帳單／失敗賠更多。
- 「案子全爆+隊友全死還能贏」= **feature 不是 bug**（黑色喜劇：把公司燒成灰但我贏了）。

---

## 5. 旁白系統（重要，別重蹈覆轍）

- 270 條模板 / 46 情境鍵(context_key) / 每鍵 3-6 句。**模板 CSV 內嵌在 Python 引擎的 `NARRATION_CSV`**，直接抄過去。
- 欄位：`context_key, tone, weight, template`。變數占位符：`{eng}{sales}{rival}{case}{ctype}{amount}{dmg}{stat}{method}`，缺的自動兜底。
- **抽句演算法（務必照做）**：加權隨機挑選 **＋ 避開最近用過的**(recent 窗 = min(句數-1, 4))。
  - ⚠ 不要用「權重＝在袋裡放幾份」的舊寫法——那會讓高權重句子短期內一直重複(這是已修過的 bug)。

---

## 6. UI 殼（mockup_v10.html 已完成，直接接）

mockup 已是暖色像素皮、全真素材、RWD、手機優先。結構（都在 `.app` 內）：
- 頂 bar(季/錢) → HUD 一行(行動點pip/士氣愛心/情報chip) → 對手戰況(logo+血條，點看影射簡介) → 案子清單(案型icon+風險燈，橫向捲) → 業界快訊 ticker → 辦公室舞台(背景圖+員工立繪，代表立繪+數量徽章×N，點開職位清單) → 底部5大類按鈕(跳bottom sheet子選單) → 事件卡(大插圖跳出→濃縮進戰報LOG)
- 互動全是點按鈕/bottom sheet，**不打字**(手機友善)。
- 事件/結局用 `EVT` 物件的插圖；開場隨機輪播 9 種(reload 看不同張)。

**你要做的接線**：把 mockup 裡的 demo 假資料/假流程，換成讀 `game` 物件的真狀態 + 動作呼叫 engine。mockup 的 `card()`/`sheet()`/`roster()`/`renderCases()`/`log()` 等 UI 函式可沿用。

---

## 7. 建議施工順序

1. **先搬 engine.js**（不碰 UI）：翻 Python 邏輯 → 寫個 node/瀏覽器 console 的 Monte Carlo → **對拍 Python 勝率**(DEV~68%/PRD~44%/擺爛流20-35%)。這步過了才動 UI，否則地基不穩。
2. **接 narration.js**：抄 270 條 + 加權避重複抽句，驗證無漏填占位符。
3. **接 ui.js**：把 mockup 的殼接上 engine，一個動作一個動作接（搶標→話術→救火→搞同行→手牌→結束季→季末結算→事件→結局）。
4. **外部化資產**：base64 → `assets/` 外部檔載入，index.html 瘦身。
5. **PWA**：manifest + sw，測離線 + 加主畫面。
6. **開場標題畫面**：用 `title_screen.png`(上方留白疊 logo「Vendor Zoo 乙方動物園」、下方留白放 Start 鈕)，點 Start → intro 文案 → 進主畫面。intro 文案見 §8。

---

## 8. 開場 intro 文案（放標題→開始之後）

```
『政府旗艦計畫』欽點五家軟體龍頭，號稱要一起壯大成國家隊。
沒人告訴你的真相是——這是一場大逃殺。預算只有一份，龍頭卻有五家。
你是夾在中間的外包顧問老闆：接肥單、轉下包、賺價差、出事就甩鍋。

活下去的方法只有兩種：熬到旗艦計畫結束，或者——把其他四家全搞死。
檢舉、放假消息、挖角、塞毒模組……看著同行一家家倒下，剩你獨活。
```

---

## 9. 角色/世界觀設定（保持一致）

- 物種聖經(固定)：**鱷魚=老闆、倉鼠=PM、虎斑貓=工程師、狐狸=業務、三花招財貓=吉祥物**。稽查員=貓頭鷹(+獾)。
- 對手 4 家(影射真實公司，**輕暗示不指名**)：美商M社(藍鯨=社群巨獸)、印度H社(橘象=海量低價外包)、本土T社(紅金虎=政府標案常勝)、併購G社(紫綠河馬=併購狂)。
- 台灣正體姓名池：男(陳冠廷/林彥廷/黃士豪/張家豪/吳承翰/鄭宇軒)、女(林怡君/王淑芬/張雅婷/陳品妍/李思妤/黃鈺婷)。
- 多個同職位員工：主畫面只放 3 隻代表立繪+數量徽章，點開看清單(同立繪用 hue-rotate 做色調區分，之後可換多款立繪)。

---

## 10. 已知 TODO / 未完成

- 立繪只有各職位 1 款(男工程師貓/女PM倉鼠/男業務狐狸)；清單靠 CSS hue-rotate 假裝不同人。之後可補各職位 10-15 款男女變體(見 ASSET_manifest_batch1)。
- 第二波事件插圖(勒索/當機/爆料等)未生，玩到可先用 emoji 或現有立繪。
- HUD icon 已切好備用(assets/hud)，mockup 部分仍用 CSS/emoji，可全面替換。
- 存檔續玩：目前單局記憶體，要存檔就 localStorage 序列化 game 物件。
- PWA 嚴格單檔 vs 真離線取捨：sw.js 需獨立檔才能離線快取(SPEC §13 有說明)。

---

## 11. 給 Claude Code 的起手 prompt（複製這段開場）

```
我要做一個手機網頁遊戲「Vendor Zoo 乙方動物園」——黑色喜劇 IT 外包大逃殺。
純前端(單頁+RWD+PWA)、無後端、離線可玩、台灣正體中文。

資產都在這個資料夾：
- reference/engine_python_v0.3.py 是已驗證的遊戲邏輯(真相來源，能跑)
- reference/SPEC_web.md 是完整規格(狀態/公式/CONFIG/DIFF/UI/驗收)
- reference/mockup_v10.html 是已完成的視覺殼(暖色像素皮、全真素材，但圖是內嵌base64要外部化)
- assets/ 是所有切好的透明PNG素材

請先讀 HANDOFF.md 全文，然後從「施工順序 §7 第1步」開始：
把 Python 引擎翻成 engine.js(不碰DOM)，寫個 Monte Carlo 對拍 Python 的勝率
(DEV~68%/PRD~44%/擺爛流20-35%)。這步驗證過再往下接 UI。

平衡數值一律以 Python 版 CONFIG/DIFF 為準，不要自己發明。
先給我 engine.js 的架構規劃 + config.js 的數值，我確認後再實作。
```

---

祝順利。地基(邏輯)和裝潢(視覺)都備齊了，剩下把它們接起來。
