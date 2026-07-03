# engine.js 架構規劃（施工順序 §7 第 1 步・待確認版）

> 目標：把 `reference/engine_python_v0.3.py` 翻成純邏輯 JS，**不碰 DOM**，
> 能在 Node 跑 Monte Carlo 對拍 Python 勝率（DEV~68% / PRD~44% / 擺爛流 20-35%）。
> 平衡數值一律引用 `js/config.js`（已逐字搬移 Python CONFIG/DIFF/ARCH + 散落字面數值 RULES）。

---

## 1. 檔案分層

```
js/
├── config.js      ← ✅已完成：CONFIG/DIFF/ARCH/RULES（唯一真相=Python）
├── rng.js         ← 可播種 PRNG（mulberry32），randint/choice/shuffle/chance/d20
├── narration.js   ← 270 條模板 + 加權避重複抽句（施工第 2 步）
├── engine.js      ← 純遊戲邏輯，零 DOM、零 console、RNG 注入
├── ui.js          ← DOM 渲染 + 事件綁定（施工第 3 步，接 mockup 殼）
└── main.js        ← 開機、標題畫面、難度選擇
tools/
├── montecarlo.mjs ← Node 跑模擬，port Python 三策略 bot + score_balance 檢核
└── optimize_assets.sh ← 素材壓縮（施工第 4 步）
```

全部 ES Modules：瀏覽器 `<script type="module">` 與 Node 直接共用同一份 engine。

## 2. 狀態模型

單一 `game` 純資料物件（可 JSON 序列化 → 之後 localStorage 存檔免改造）：

```js
game = {
  mode: "DEV"|"PRD",
  season, cash, reputation, sin, morale, actionsLeft, cardsPlayed,
  auditIn, wonEarly, gameOver, result, deathCause,   // deathCause: "現金"|"士氣"|("稽核"?)
  staff:  [{ role, name, stat, quality }],
  cases:  [{ id, atype, name, client, sat, risk, subcontracted, inherited, lockin, rebound, lastUpsell }],
  rivals: [{ name, hp, alive, hate, messedThisSeason }],
  hand:   [{ name, kind }],
  frontroomUsed: {},                      // 各案「前朝」一次性
  eventBag / newsBag: { bag, cd },        // Bag 狀態（抽牌不放回+冷卻，含 news 以 H/F 為 key 的特性）
  moraleHist: [], log: [],
}
```

`visibleState(game)` 另外輸出**迷霧過濾後**的視圖給 UI（不含 risk/sat/reputation/sin/hate/auditIn
數字，只有紅綠燈、血條、稽核風聲、士氣愛心）——UI 只准讀這個，防手滑漏數字。

## 3. 引擎 API（兩類）

### 3a. 玩家動作 = 普通函式，參數一次帶齊（UI 在 bottom sheet 選完才呼叫）

```js
actionBid(g)                          // 搶標（案型在扣點後才揭曉→修 mockup 的免費釣魚洞）
actionTalk(g, caseId, "upsell"|"soothe")
actionRescue(g, caseId)
actionMess(g, rivalIdx, "report"|"rumor"|"poach")
actionDraw(g)                         // 回傳 {card, needsTarget?} → resolveDrawnCard(g, targetId)
actionMorale(g) / actionHire(g, role) / actionRecon(g, caseId)   // recon 免行動點
playCard(g, handIdx, targetId?)       // 免行動點，每季 3 張
```

每個動作回傳 `{ ok, apSpent, events: [...] }`；
`events` 是結構化戰報（`{key:"action.mess_report", vars:{rival,dmg,...}}`），
narration.js 把 key 變成台灣味旁白，UI 決定演成事件卡或 ticker。
沿用 Python 語意：**前置條件不符（沒錢/沒人/超載/冷卻）→ ok:false 且不扣行動點**。

### 3b. 季初/季末流程 = generator（中途有玩家決策要暫停）

Python 在流程中 `input()`（勒索付贖金、引爆五選一、接盤 y/n）。JS 用 generator 表達
「跑到決策點暫停 → 拿到答案續跑」，同一份程式碼兩種驅動器：

```js
function* seasonStartFlow(g) { ... yield {decision:"ransom", amount} ... }
function* seasonEndFlow(g)   { ... yield {decision:"explode", caseId}     // 答案: eat|frontroom|force_majeure|signed|scapegoat
                                    yield {decision:"inherit", rival, atype} ... }

// Monte Carlo 驅動器：同步、policy 立即作答（跑 2000 局不用 async）
runFlow(gen, botPolicy)
// UI 驅動器：yield 出決策 → 彈 modal → 玩家點按 → gen.next(answer)
```

季末結算順序**嚴格照 Python**：風險成長+收入計算 → 小公司倒閉 → 滿意度提告 →
引爆處理（逐案決策）→ 對手倒閉/接盤（逐家決策）→ 獨活判定 → 仇恨反撲 →
稽核倒數/稽核 → 現金結算 → 士氣衰減 → 補 junk 牌到 3 → 死活判定。

## 4. RNG 與對拍策略

- `rng.js`：mulberry32 可播種。引擎所有隨機都走注入的 rng → Monte Carlo 可重現。
- **不追求跟 Python 逐 seed 對齊**（randint 呼叫順序無法完全一致），追求**分布對齊**：
  同策略 n=2000 的勝率落在 Python 目標 ±3-4%。
- `tools/montecarlo.mjs` port Python 三策略，含 bot 的細節語意：
  - buffer 制：每回合 policy 產生指令序列，動作失敗（ok:false）不扣點但消耗 buffer；
  - 決策回答同 `_auto_input_factory`：贖金隨機 y/n、引爆隨機 [硬扛,不可抗力,不可抗力,推甲方]、
    接盤必接、搞法隨機、話術一律榨錢、目標=第一家活著的對手/第一個案子、招人=工程師。
- 驗收（跑完貼報告）：
  | 指標 | 目標 |
  |---|---|
  | aggressive DEV 勝率 | ~68%（±4%）|
  | aggressive PRD 勝率 | ~44%（±4%）|
  | talkonly（擺爛流）| 20-35%，且為三策略最差 |
  | 搞死家數中位 | 2-3 |
  | 死因分散 | 單一死因 ≤60% |

## 5. Python 忠實搬移的暗角（對拍會踩的細節，先記下）

1. **榨錢失敗照樣扣滿意度+進冷卻**（`sat-=`、`last_upsell=` 在擲骰前執行）。
2. **救火失敗仍降 risk÷3**、費用擲骰前先扣、morale-2 無下限（死活只在季末判）。
3. **檢舉成本 $60**：Python 選單文字寫 $80 是它自己的筆誤，程式碼扣 60，以 60 為準。
4. **毒模組卡不加仇恨**（SPEC §8 寫 +25 與程式碼不符，以程式碼為準才對得上勝率）。
5. **收入在爆炸/倒閉/提告「之前」結算**（同一季被移除的案子仍貢獻本季維護費）。
6. Bag 語意：袋空重洗；全在冷卻中→pop 最後一張且**不記冷卻**；news bag 的冷卻 key 是
   H/F 類別 → 實際上快訊 H/F 交錯出現。
7. `won_early` 蓋過 `gameOver`（同季殺光對手又現金歸負 → 判獨活勝，黑色幽默 feature）。
8. 對手 hp 無上限（ambient 可回超過初始值）；血條顯示用絕對刻度 clamp(hp,0,100)。
9. 抽卡 d1：信譽-6、卡作廢，但 $90 與行動點照扣。
10. 搶標的案型是「扣點後才 random」——UI 不能讓玩家先看型再免費跳過（mockup 目前可以，要修）。

## 6. mockup ↔ SPEC ↔ Python 對齊檢查結果（接 UI 時要修的清單）

| # | 問題 | 處置 |
|---|---|---|
| 1 | 經營選單**缺「付費抽強卡 $90」**（btn_draw 圖有切但 sOps() 沒接） | 加進「經營」sheet |
| 2 | 手牌 sheet 是 demo 假資料（毒模組/鎖死/公關/重構其實是抽卡限定、即抽即用不進手牌）；真手牌=3 張甩鍋+junk 補牌 | 接真 `g.hand`，顯示 n/3 出牌數 |
| 3 | 引爆選單 mockup 只有 3 選項，引擎是 5（硬扛/前朝/不可抗力/推甲方/替死鬼），且三種甩鍋 DC 修正不同、前朝每案限一次 | 「甩鍋(賭)」展開成 3 說法子選 |
| 4 | mockup 搶標先看案型可免費跳過 → 可釣魚刷案型 | 投標=先扣點再揭曉+擲骰（照 Python）|
| 5 | 查核標「免費」→ 實為免行動點但花 $40 | 文案改「$40・免行動點」|
| 6 | 招人選單缺「前員工回鍋兼差 $35」保底（沒業務且現金<100 時出現） | 條件性選項 |
| 7 | 勒索 y/n、接盤 y/n 的決策卡 mockup 沒做 | 用現有 card() choices 直接支援 |
| 8 | 對手名「印度 H社」→ 引擎「印度商 H社」 | 以引擎為準 |
| 9 | 話術/救火/查核/毒模組/鎖死需**選案子或對手**，mockup 部分直接 log | sheet 內加案子/對手點選列 |
| 10 | SPEC 寫「稽核重罪→勒令解散(稽核死)」但 Python 稽核只罰錢，`deathCause` 永遠不會是稽核、end_lose_audit 插圖永遠不出場 | 見開放決策 A |

## 7. 開放決策（請確認）

- **A. 稽核死結局**：建議 cosmetic 修法——若本季稽核罰款是壓垮現金的最後一根稻草
  （罰款前 cash≥0、罰款後 <0），`deathCause` 標「稽核」放 end_lose_audit 結局圖。
  勝負判定完全不變、不影響對拍，只影響結局插圖選擇。預設：**做**。
- **B. 員工姓名**：Python 是姓×名隨機組合，HANDOFF §9 給固定 12 名池。
  建議：開局與招募先發名池（不重複），用完 fallback 隨機組合。純外觀。預設：**照此**。
- **C. 部署**：Cloudflare Pages（git 整合、免費 CDN、自動 HTTPS、支援 sw.js 離線）。
  素材壓縮 pipeline：事件圖 1536×1024/2-3MB → 縮到 960px 寬 + cwebp（PNG fallback 可免，
  2026 瀏覽器 WebP 覆蓋率無虞）；立繪縮到顯示尺寸 2 倍；預估 30MB → ~2MB，sw 全量預快取。
  預設：**照此**。

## 8. 本步驟驗收定義（過了才動 UI）

1. `node tools/montecarlo.mjs` 輸出三策略 × DEV/PRD 報告，勝率落在 §4 目標帶。
2. `score_balance` 六條檢核至少與 Python 同過同不過。
3. engine.js 內 `grep -c document\|window` = 0（純邏輯）。
