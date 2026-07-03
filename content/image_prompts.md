# 生圖 Prompt 庫（可直接餵 GPT-5.5 / gpt-image）

> 風格錨定原則：**餵參考圖 > 純文字**。生成時把 `assets/backgrounds/title_screen.webp`
> 或 `assets/events/evt_explode.webp` 一起當 style reference 送進去，一致性最穩。
>
> 共用風格 token（每個 prompt 都帶）：
> `warm-toned semi-pixel painterly illustration, cozy retro management-game art,
> anthropomorphic office animals in business suits, thick dark outlines, soft
> painterly shading with subtle pixel texture, warm ochre/amber palette, Taiwanese
> office setting, dark-comedy tone`
>
> 物種聖經（固定，別畫錯）：鱷魚=老闆(戴墨鏡深色西裝) / 倉鼠=PM / 虎斑貓=工程師(戴耳機黑眼圈) /
> 狐狸=業務 / 三花招財貓=吉祥物 / 貓頭鷹=稽查官員。
>
> 產出後流程：存成 PNG 丟 `assets_raw/events/<檔名>.png` → `node tools/fix_assets.mjs`
> （去背/清碎片）→ `node tools/optimize_assets.mjs`（轉 WebP）→ 已自動接上（見下方「接線」）。

---

## intro — 開場故事卡「歡迎加入國家隊（笑）」

- **檔名**：`intro`（→ `assets/events/intro.webp`）
- **接線**：已完成。`js/main.js` 開場故事卡 `evt:"intro"`；圖未到位時自動退回 emoji 🏛️🦊。
- **尺寸/格式**：1536×1024（橫幅 3:2），透明背景，PNG。
- **場景**：政府旗艦計畫的簽約記者會——不是主畫面那張辦公室合照，是「上台領獎」的一刻。

### Prompt（英文，直接貼）

```
Warm-toned semi-pixel painterly illustration, cozy retro management-game art,
dark-comedy tone. Scene: a government "National Flagship Program" award/signing
press conference in a Taiwanese official auditorium. A long table draped in cloth
with FIVE identical clear acrylic award plaques lined up in a row under a banner.
Center stage: a crocodile CEO in a dark business suit and black sunglasses (the
player character) shaking hands with a stern owl government official in a grey
suit and round glasses. Behind them, four rival vendor bosses (other
anthropomorphic animals in suits) stand in a row, all smiling for the cameras but
side-eyeing each other with visible distrust. Camera flashes, red carpet,
national flags, a podium with microphones. Thick dark outlines, soft painterly
shading with subtle pixel texture, warm ochre and amber palette, cinematic
wide composition, slight low angle. Transparent background behind the group
(clean cutout, no checkerboard, no ground shadow baked in). No text, no watermark,
no logos.
```

### 中文補充（若工具吃中文更準，可附在 prompt 後）

暖色像素感手繪、復古經營遊戲風、黑色幽默。場景：政府「旗艦計畫」頒獎簽約記者會，長桌鋪布、
五塊一模一樣的透明壓克力獎牌一字排開。中央：戴墨鏡深色西裝的鱷魚老闆（主角）與穿灰西裝、
戴圓框眼鏡的貓頭鷹官員握手。後方四家對手動物老闆西裝筆挺、對鏡頭微笑卻互相斜眼提防。
鎂光燈、紅地毯、國旗、麥克風講台。粗黑描邊、柔和手繪上色帶像素顆粒、暖赭琥珀色調、
電影感寬構圖、微仰角。透明背景乾淨去背（不要棋盤格、不要烙進地面陰影）。無文字浮水印。

---

## difficulty — 難度卡「活下去的兩條路」

- **檔名**：`difficulty`（→ `assets/events/difficulty.webp`）
- **接線**：已完成。`js/main.js` 難度卡 `evt:"difficulty"`；圖未到位時退回 emoji ⚔️🦊。
  左鈕（🏰 練習/DEV）＝畫面左邊童話城堡；右鈕（🏯 真實/PRD）＝畫面右邊魔王城。
- **尺寸/格式**：1536×1024（橫幅 3:2），透明背景，PNG。
- **梗**：岔路抉擇 meme——鱷魚老闆背影站在正中央岔路口，左右天差地別。

### Prompt（英文，直接貼）

```
Warm-toned semi-pixel painterly illustration, cozy retro management-game art,
light-hearted meme composition. A crocodile CEO in a dark business suit and black
sunglasses stands from behind at a forked road, seen from slightly behind and
below, scratching his head, facing a choice. LEFT PATH: a sunny bright fairytale
storybook castle on green rolling hills, rainbow, fluffy clouds, cute pastel
banners, cheerful and easy — a signpost reading nothing (no text). RIGHT PATH: a
menacing dark demon-lord fortress on a jagged cliff, blood-red sky, lava, spikes,
lightning, ominous and hardcore. The fork splits clearly down the middle of the
frame. Thick dark outlines, soft painterly shading with subtle pixel texture,
warm palette on the left half, cold red/purple palette on the right half,
cinematic wide composition, humorous contrast. Transparent background above the
horizon and around the scene (clean cutout, no checkerboard, no baked ground
shadow). No text, no letters on signs, no watermark.
```

### 中文補充（若工具吃中文更準，附在 prompt 後）

暖色像素感手繪、復古經營遊戲風、輕鬆 meme 構圖。戴墨鏡深色西裝的鱷魚老闆背影站在正中央岔路口、
微仰角、抓頭猶豫。左路：晴朗明亮的童話故事書城堡、綠色草丘、彩虹、蓬鬆雲朵、可愛粉彩旗幟，
輕鬆愜意。右路：險惡的魔王城堡立在鋸齒懸崖、血紅天空、熔岩、尖刺、閃電，硬核壓迫。
岔路從畫面正中清楚一分為二。粗黑描邊、柔和手繪上色帶像素顆粒、左半暖色右半冷紅紫、
電影感寬構圖、反差幽默。地平線以上與四周透明去背（乾淨、不要棋盤格、不要烙地面陰影）。
無文字、路牌無字、無浮水印。

### 上傳方式（同 intro）

存 PNG → GitHub 分支 `assets_raw/events/difficulty.png`（或 `assets/events/` 我會歸位）→ 告訴我 →
我 `git pull` 後：**若已透明**直接 optimize；**若白底**先 fix_assets 去背 → optimize，自動生效。

---

> 其餘事件/行動卡的插圖清單見 `docs/ART_TODO.md`；逐張補時在此追加對應 prompt。
