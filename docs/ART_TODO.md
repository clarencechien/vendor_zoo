# 補圖清單（中央卡目前用 emoji / 立繪佔位的）

> 產圖規格照 `reference/ASSET_manifest_batch2.md` 的風格聖經（暖色像素、透明去背 PNG、
> 建議 1536×1024 橫幅或近方形）。產好丟進 `assets_raw/events/`，跑
> `node tools/fix_assets.mjs && node tools/optimize_assets.mjs`，再到 `js/main.js` 的
> `CARD_KEYS` / `ACTION_CARD` 把 `emoji:`/`spr:` 換成 `evt:"檔名"` 即接上。

## 已有真插圖 ✅

| key | 檔案 |
|---|---|
| season.explode（引爆決策卡） | evt_explode |
| audit.clean / dodged / fined | evt_audit |
| rival.collapse | evt_rival_down |
| event.windfall | evt_windfall |
| 五結局 | end_survive / end_solo / end_lose_cash / end_lose_morale / end_lose_audit |

## 第一優先：事件卡（emoji 佔位中）

| key | 現在的佔位 | 建議畫面 |
|---|---|---|
| event.ransom（勒索決策卡） | 🔐💾 | 獾駭客+上鎖的 NAS，螢幕紅字勒索信 |
| event.client_bankrupt | 🏚️ | 貼封條的甲方辦公室、倒閉拍賣 |
| event.cloud | ☁️💥 | 雲朵機房爆炸、動物工程師拜綠色乖乖 |
| event.leftpad | 📦🕳️ | 抽積木塔倒塌（開源套件 jenga） |
| event.poached | 🎣 | 對手用釣竿釣走戴耳機的貓工程師 |
| event.media_exposed | 📰🔥 | 記者鳥群圍拍、頭條印鱷魚老闆 |
| event.media_clean | 📰🍵 | 記者翻垃圾桶一無所獲 |
| event.vip_ok | 🤝📸 | 長官(貓頭鷹?)與鱷魚握手合照 |
| season.terminate | 📄🔥 | 甲方拍桌撕合約 |
| rival.inherit（接盤決策卡+結果卡） | 🏛️📦 / 🎁💀 | 政府硬塞的發霉紙箱（前朝毒案） |

## 第二優先：行動結果卡（出現頻率高）

| key | 現在的佔位 | 建議畫面 |
|---|---|---|
| sys.bid_win / bid_fail | 📋✨ / 📋💨 | 狐狸業務舉得標單歡呼／標單被風吹走 |
| action.mess_report | ⚖️🗡️ | 匿名檢舉信投入監理機關信箱 |
| action.mess_rumor | 🐍📢 | 狐狸在業界群組放風聲 |
| action.mess_poach | 🎣 | 我方用手搖飲釣走對手員工 |
| card.poison | 🧪🗡️ | 包裝精美的毒模組禮盒 |
| card.lockin | 🔒 | 義大利麵程式碼纏住甲方大樓 |
| card.refactor | 🧼 | 工程師貓深夜大掃除刪舊碼 |
| card.pr | 🤝📰 | 公關獎盃+「數位轉型楷模」報導 |
| card.disaster_cash | 💰🔥 | 火場前開帳單 |
| action.morale | 🍗💰 | 發雞排＋獎金的療癒畫面 |
| sys.hire | 🧑‍💼✨ | 新動物員工報到 |
| sys.draw_fumble | 🎴☠️ | 印錯公司名的新聞稿 |

## 現用立繪權充（可維持，也可換情境圖）

| key | 現在用 |
|---|---|
| event.stroke / delrepo | eng_m_orz（貓趴地） |
| event.sales_flee | sales_m_orz |
| event.vip_crash | pm_f_orz |
| action.upsell_win/stiff | sales_m_sit |
| action.upsell_fail | sales_m_orz |
| action.rescue | eng_m_sit |

## 其他

- 開場 intro 卡（🏛️🦊）可用 title_screen 局部或專屬插圖。
- 引擎打滑錯誤卡（🐞）低優先。
- 名冊頭像由 `tools/fix_assets.mjs` 自動產生（站姿立繪上緣裁 128px 方形 →
  `assets_raw/heads/`）；未來各職位多款立繪到位後改為每人專屬頭像。

## 素材品質備忘（tools/fix_assets.mjs 已修）

- end_solo / end_survive / end_lose_cash / end_lose_audit 原始檔是「假透明」
  （近白棋盤格底烙在圖上）→ 已程式去背覆寫 assets_raw。
- 立繪含 AI 生圖漂浮碎片（業務坐姿旁的對話框殘片最明顯）→ 已用
  「保留最大連通塊+清 <3% 碎片」處理全部 9 張。
- 新素材入庫前先跑 `node tools/fix_assets.mjs`（冪等，乾淨的圖不受影響）。
