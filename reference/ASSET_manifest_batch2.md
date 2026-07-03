# 外包生存模擬器 — 素材製作清單 Batch 2（按鈕 icon + 辦公室背景）

> 繼承 Batch1 的 **STYLE BIBLE**（跟封面/立繪同風格：厚塗像素插畫、粗黑描邊、暖飽和色）。
> 本批兩包：**① 按鈕 icon sheet（11 個，透明、無文字、無方塊底）　② 空辦公室背景圖（無角色）**。
> 生完照檔名存，丟回來我切/鋪進 mockup。

---

## ★ 共用規則（務必寫進 prompt）
```
STYLE: detailed pixel-art illustration, same style as the established
game (chunky black outlines, warm saturated colors, soft cartoon shading).
CRITICAL: NO text, NO letters, NO Chinese characters anywhere.
CRITICAL: NO background tile, NO colored square behind the icon,
fully TRANSPARENT background (alpha). Each icon is just the object/glyph
itself, floating, centered, clean 1px edges, no drop shadow.
```
> ⚠ 上次那張是「彩色方塊+文字」的截圖不能用——這次一定要**只有圖示本體、透明背景、不要方塊、不要字**。

---

## 包 ① 按鈕 ICON SHEET（11 個 glyph，透明無底無字）

**排版建議**：叫 GPT 生成 **一張 sheet，網格排列（例如 3 列 × 4 欄），每格一個 icon，格與格之間留間距，全透明背景**。或一個一個單獨生也行（更好切）。
**尺寸**：每個 icon 目標 64×64；生大沒關係。
**風格**：像遊戲 UI 圖示，立體一點、可愛、粗描邊，但**不要**放在任何方塊/圓角底上。

### 5 大類按鈕
| 檔名 | 用途 | 圖示 | prompt 尾巴 |
|---|---|---|---|
| btn_bid.png | 接案 | 木槌/法槌（搶標） | `a wooden auction gavel icon` |
| btn_mess.png | 搞同行 | 間諜/黑帽墨鏡臉（陰險） | `a sneaky spy face with black hat and sunglasses icon` |
| btn_ops.png | 經營 | 交叉的扳手+槌子（維運） | `crossed wrench and hammer tools icon` |
| btn_hand.png | 手牌 | 一疊撲克牌 | `a fan of playing cards icon` |
| btn_end.png | 結束季 | 門/離開箭頭 | `an exit door icon` |

### 子選單動作
| 檔名 | 用途 | 圖示 | prompt 尾巴 |
|---|---|---|---|
| btn_talk.png | 話術 | 對話框（嘴砲） | `a speech bubble icon` |
| btn_rescue.png | 救火 | 滅火器 | `a red fire extinguisher icon` |
| btn_bonus.png | 發獎金 | 一疊金幣 | `a stack of gold coins icon` |
| btn_hire.png | 招人 | 識別證/員工證 | `an employee ID badge lanyard icon` |
| btn_recon.png | 查核 | 放大鏡 | `a magnifying glass icon` |
| btn_draw.png | 抽卡 | 帶問號的卡牌 | `a mystery card with question mark icon` |

**單個 prompt 範例（接案）**：
```
[STYLE BIBLE + 共用規則]
A wooden auction gavel icon, detailed pixel-art, chunky black outline,
warm wood tones, floating centered on a fully transparent background,
NO text, NO tile, NO square behind it, no shadow. Game UI icon.
```

---

## 包 ② 空辦公室背景圖（無角色，給立繪疊上去）

**用途**：鋪在主畫面舞台當背景，員工立繪站在前面。所以**畫面裡不能有任何角色/動物**，只有空的辦公室環境。
**比例**：直式偏方，建議 **3:4 或 1:1**（舞台區是橫向的中段，太寬會被裁；給我一張中間資訊夠、兩側可延伸的構圖最好）。
**尺寸**：越大越好（之後我縮）。

**構圖要點**（配合 UI）：
- 場景：明亮清新的新創辦公室，暖木色地板、木質牆、**大片落地窗看城市天際線**（可帶一點台北 101 剪影，但別太搶）、書櫃/檔案夾/盆栽/獎盃點綴。
- **地板佔下方約 1/3**（立繪會站在這排），地板要留空、不要放桌椅擋住立繪站位。
- 上半是窗景+牆面裝飾。
- **不要有任何人物或動物**、不要有文字。
- 光線：白天、明亮、溫暖，帶點反差的「表面美好」感。

**prompt**：
```
[STYLE BIBLE]
A detailed pixel-art illustration of an EMPTY bright modern startup
office interior — warm wooden floor, wood-panel walls, large windows
showing a clean city skyline (subtle Taipei 101 silhouette), bookshelves
with binders, potted plants, a small trophy, cozy cheerful morning light.
Kairosoft / Game Dev Story aesthetic, chunky outlines, warm saturated
palette, soft shading.
COMPOSITION: the lower third is OPEN wooden floor (leave it clear, no
desks blocking, characters will stand here), upper two-thirds is windows
and wall decor. Slightly ironic "too-perfect" cheerful mood.
CRITICAL: absolutely NO people, NO animals, NO characters, NO text.
Empty room only. Aspect ratio 3:4 portrait-ish.
```

---

## 生成小抄
1. 每個 prompt 開頭都貼 STYLE BIBLE + 共用規則。
2. icon：反覆強調 **no text / no tile / transparent / centered**。
3. 背景：反覆強調 **empty, no people, no animals, no text, floor kept clear**。
4. 風格飄掉就加 `same style as the 社畜養成記 key art, chunky outlines, soft shading`。
5. 生完檢查：icon 有沒有殘留方塊底；背景有沒有跑出角色。有問題回報我。

## Batch2 交付
- 11 個按鈕 icon（透明無底無字）
- 1 張空辦公室背景圖（無角色）
→ 回傳後我：切 icon 貼進 5 大類 + 子選單、把背景鋪進舞台、立繪站上去。
