# 外包生存模擬器 — 素材製作清單 (Batch 1)

> 風格基準 = 已定稿的 key art（社畜養成記那張）。**每個 prompt 都繼承同一套 STYLE BIBLE**，確保一致。
> 流程：GPT-5.5 逐個生 → 透明 PNG → 照「檔名」存 → 丟回來我組進 mockup。
> 大圖(key art)保留當**標題/主選單背景**，零件一律**單獨重新生**（不從大圖切）。

---

## ★ STYLE BIBLE（貼在每個 prompt 前面，或確認 GPT 記住）

```
STYLE: detailed pixel-art illustration, same art style as the reference
key art — chunky black outlines, warm saturated colors, soft cartoon
shading with volume (NOT flat 8-bit, NOT realistic, NOT 3D). Cute but
tired "corporate shachiku" tone, dark-comedy undertone.
PALETTE: warm PICO-8-adjacent (deep navy, warm browns, teal/green,
gold, coral red, cream). High readability, crisp pixel edges.
BACKGROUND: fully transparent (alpha), no drop shadow, no ground shadow,
subject centered, clean 1px silhouette edges, nothing cropped.
```

**角色物種（固定，不可中途換）**：鱷魚=老闆／倉鼠=PM／虎斑貓=工程師／狐狸=業務／三花招財貓=吉祥物。
**姓名池（台灣正體，隨機配立繪）**：
- 男：陳冠廷、林彥廷、黃士豪、張家豪、吳承翰、鄭宇軒
- 女：林怡君、王淑芬、張雅婷、陳品妍、李思妤、黃鈺婷

---

## 類別 1 — 員工立繪包（會動、最先用）

每個職位 = **虎斑貓(工程師)/倉鼠(PM)/狐狸(業務)**，各做 **男 + 女** 兩款外觀，
每款 **3 種姿勢**：`stand`(全身站姿) / `sit`(中性坐姿半身) / `orz`(崩潰跪姿 Orz)。
→ Batch1 先做 **工程師♂ / PM♀ / 業務♂ 各 3 姿勢 = 9 張**跑通流程，其餘款式 Batch2 再擴。

**檔名規則**：`emp_{職位}_{性別}_{姿勢}.png`（例 `emp_eng_m_orz.png`）
尺寸目標：站姿 128×192、坐姿/跪姿 128×128（透明背景，生大沒關係，組裝再縮）。

### 1a. 工程師（虎斑貓・男）
```
[STYLE BIBLE]
A male tabby-cat office ENGINEER, anthropomorphic (human body, cat head),
wearing a dark hoodie over a shirt, big headphones around neck, visible
eye-bags, exhausted programmer vibe.
POSE: full-body standing, front view, arms relaxed, neutral tired face.
Single character, centered, transparent background.
```
- `emp_eng_m_stand.png` — 上面這段(standing, neutral tired)
- `emp_eng_m_sit.png` — 改 POSE：`sitting at a desk chair, upper-body, hands on keyboard, mild dead-eyes stare`
- `emp_eng_m_orz.png` — 改 POSE：`kneeling on the floor in the "Orz" despair pose (on hands and knees, head down), blue sweat drops, totally defeated`

### 1b. PM（倉鼠・女）
```
[STYLE BIBLE]
A female hamster office PROJECT MANAGER, anthropomorphic, chubby cheeks
stuffed, wearing a neat blouse with a lanyard, frazzled overworked vibe,
one sweat drop.
POSE: full-body standing, front view, holding a clipboard, forced smile.
Single character, centered, transparent background.
```
- `emp_pm_f_stand.png` — standing, holding clipboard, forced smile
- `emp_pm_f_sit.png` — `sitting, upper-body, buried behind a stack of paperwork, tired frown`
- `emp_pm_f_orz.png` — `kneeling Orz despair pose, papers scattered around, sweat drops`

### 1c. 業務（狐狸・男）
```
[STYLE BIBLE]
A male fox office SALESPERSON, anthropomorphic, sly confident grin,
wearing a sharp navy suit with green tie, slicked look.
POSE: full-body standing, front view, one hand giving a thumbs-up / finger-gun, smug.
Single character, centered, transparent background.
```
- `emp_sales_m_stand.png` — standing, smug thumbs-up
- `emp_sales_m_sit.png` — `sitting, upper-body, phone to ear, fake big smile, sweet-talking a client`
- `emp_sales_m_orz.png` — `kneeling Orz despair pose, phone dropped, smug grin finally broken`

---

## 類別 2 — 對手 LOGO（動物簡化 logo，非立繪，各自主色）

**風格另立**：不是立繪，是**扁平幾何、單色系、企業 logo 感的動物剪影/吉祥物頭像**，像 app icon。
共用描述：
```
A flat minimalist corporate LOGO icon (app-icon style), a simple
geometric animal silhouette/mascot, bold single-hue color scheme,
thick clean shapes, slight retro pixel edge. Centered on transparent
background. NOT detailed illustration — simple, iconic, readable at small size.
```
檔名：`rival_logo_{代號}.png`，尺寸 96×96。

| 檔名 | 對手(影射) | 動物意象 | 主色 | prompt 尾巴 |
|---|---|---|---|---|
| rival_logo_M.png | 社群巨獸(美商M社) | 章魚/鯨魚 | 藍色系 #29ADFF | `a blue octopus/whale mascot logo, friendly-but-eats-everything` |
| rival_logo_H.png | 海量低價外包(印度H社) | 螞蟻群/大象 | 橘色系 #FFA300 | `an orange ant-swarm or elephant logo, mass-labor feel` |
| rival_logo_T.png | 政府標案常勝(本土T社) | 老虎/龍 | 紅金 #FF004D+#FFEC27 | `a red-gold tiger/dragon crest logo, bureaucratic prestige` |
| rival_logo_G.png | 併購狂(G社) | 貪吃蛇/河馬 | 紫綠 #83769C+#00E436 | `a purple-green hungry-snake/hippo logo, swallowing/merger theme` |

---

## 類別 3 — 案型 ICON（5 種，木牌或圓章感）

```
[STYLE BIBLE, but icon-scale]
A small game ICON representing a project/client type, detailed pixel-art,
bold outline, sits on a small wooden plate or badge, transparent background,
readable at 64px. Single icon centered.
```
檔名：`case_{型}.png`，尺寸 96×96。

| 檔名 | 案型 | 意象(可沿用 key art 既有畫法) |
|---|---|---|
| case_gov.png | 政府案 | 國會/公家機關建築(圓頂) |
| case_bank.png | 銀行案 | 銀行柱式建築 / 金庫 |
| case_sp500.png | S&P500案 | 雲端 / 地球 / 摩天樓群 |
| case_small.png | 小公司案 | 小店鋪 / 鐵捲門小招牌 |
| case_legacy.png | 傳產案 | 工廠齒輪 / 老機台 |

---

## 類別 4 — HUD ICON（狀態列小圖，像 key art 頂排那種）

```
[STYLE BIBLE, tiny-icon scale]
A tiny crisp pixel-art UI icon, bold outline, high contrast, single object
centered, transparent background, readable at 24-32px.
```
檔名：`hud_{名}.png`，尺寸 48×48。

| 檔名 | 用途 | 意象 | 色 |
|---|---|---|---|
| hud_season.png | 季/日曆 | 撕頁日曆 | 藍白 |
| hud_coin.png | 現金 | 金幣($) | 金 #FFEC27 |
| hud_ap.png | 行動點 | 菱形寶石 pip | 橘 #FFA300 |
| hud_morale.png | 士氣 | 像素愛心 | 紅 #FF004D |
| hud_audit.png | 稽核風聲 | 喇叭/警示 | 灰藍 |
| hud_hand.png | 手牌 | 撲克牌 | 米白 |

---

## 生成小抄（給 GPT-5.5 的提醒，避免踩雷）
1. **一次一張、逐個生**，開頭都先貼 STYLE BIBLE 再接該素材描述。
2. 明講 **transparent background / no shadow / centered / nothing cropped**。
3. 若風格飄掉（變寫實/變3D/變扁平8-bit），加一句 `same detailed pixel illustration style as the 社畜養成記 key art, chunky outlines, soft shading`。
4. 動物**認得出**最重要：貓要虎斑、倉鼠要頰囊、狐狸要尖臉紅毛、鱷魚要墨鏡。
5. 生完檢查邊緣有沒有殘留色塊；有的話回報我，或用去背工具修。

## Batch1 交付清單（先做這 24 張跑通流程）
- 員工 9 張：eng_m / pm_f / sales_m × (stand/sit/orz)
- 對手 logo 4 張
- 案型 icon 5 張
- HUD icon 6 張
→ 生完丟回來，我組進 mockup、對齊網格，看整體協不協調，再開 Batch2 補齊各職位男女款(擴到你要的各 10-15 種)。
