# 外包生存模擬器 — 素材製作清單 Batch 3（事件卡 + 結局插圖）

> 繼承 STYLE BIBLE（同封面/立繪：厚塗像素插畫、粗黑描邊、暖飽和色）。
> 本批 = **9 張去背插圖**（4 高頻事件 + 5 結局），**帶指定動物角色**、透明背景、我用 CSS 套卡框。
> 物種聖經（固定）：**鱷魚=老闆、倉鼠=PM、虎斑貓=工程師、狐狸=業務、三花招財貓=吉祥物**。

---

## ★ 共用規則（貼在每個 prompt 前）
```
STYLE: detailed pixel-art illustration, same style as the game's key art
and character sprites — chunky black outlines, warm saturated colors, soft
cartoon shading with volume. Cute but dark-comedy corporate tone.
CHARACTERS: anthropomorphic animals in office wear, MATCH the established
species — crocodile=boss, hamster=PM, tabby cat=engineer, fox=salesperson.
CRITICAL: NO text, NO letters, NO speech bubbles.
CRITICAL: fully TRANSPARENT background (alpha), no background scene box,
no card frame, subject group centered, clean edges, no drop shadow.
A single illustrated scene (characters + key props), floating on transparent bg.
```
- 尺寸：每張目標 ~320×220（生大沒關係）。
- **要有角色但不要整個房間**——只畫角色+關鍵道具，背景透明（卡框我用 CSS 套）。

---

## A. 4 張高頻事件卡

### evt_explode.png — 系統爆炸（季末引爆，最常出現）
```
[共用規則]
A tabby-cat engineer in a hoodie PANICKING at a desktop computer that is
literally exploding — sparks, smoke, red error glow, flying debris, a
"blue screen" monitor cracking. The cat throws both paws up in despair,
blue sweat drops. Dark comedy. Transparent background, no text.
```

### evt_audit.png — 監理稽核（監理機關上門）
```
[共用規則]
A stern INSPECTOR animal (a bespectacled owl or a strict badger in a
grey government suit) holding a clipboard and a magnifying glass,
frowning and pointing accusingly. Beside it, a nervous sweating fox
salesperson hiding a stack of shady documents behind its back.
Tense audit scene. Transparent background, no text.
```
> 稽查員動物可用 **貓頭鷹**(嚴肅、大眼睛好認) 或 **獾**；擇一固定。

### evt_rival_down.png — 對手倒閉（縮圈爽點）
```
[共用規則]
A rival company mascot (a cartoon whale/tiger/elephant style logo-creature)
lying defeated with X_X eyes and a tombstone / "bankrupt" cracked sign,
while a smug fox salesperson in a suit happily rakes in gold coins from
the ruins. Schadenfreude vibe, gold coins flying. Transparent background,
no text.
```

### evt_windfall.png — 天上掉錢（好事件）
```
[共用規則]
A tabby-cat and a hamster office worker looking up in delighted shock as
gold coins and cash rain down from above onto them, sparkles, happy teary
eyes, arms up to catch the money. Lucky windfall joy. Transparent
background, no text.
```

---

## B. 5 張結局插圖

### end_survive.png — 存活（撐過15季，名聲爛但活著）
```
[共用規則]
A tired but triumphant tabby-cat boss-ish figure standing on a small hill
of tangled cables and old servers, planting a little flag, exhausted smile,
sunset glow. "Survived but hollow" bittersweet tone. Transparent bg, no text.
```

### end_solo.png — 獨活（熬死所有對手，變成怪物）
```
[共用規則]
A crocodile boss in sunglasses sitting on a THRONE made of defeated rival
mascots and broken servers, holding a golden trophy, evil satisfied grin,
surrounded by scattered gold. "Last monster standing" dark-comedy triumph.
Transparent background, no text.
```

### end_lose_cash.png — 現金死（燒光倒閉）
```
[共用規則]
A crocodile boss and staff animals with empty turned-out pockets, an empty
cracked piggy bank, dust and a single rolling coin, everyone slumped in
despair over an empty cash box. Bankrupt gloom. Transparent bg, no text.
```

### end_lose_morale.png — 士氣死（團隊集體崩潰離職）
```
[共用規則]
An empty office chair spinning, animal employees (cat, hamster, fox)
walking away with cardboard boxes of their belongings, backs turned,
one lone server blinking. Mass-resignation desolation. Transparent bg,
no text.
```

### end_lose_audit.png — 稽核死（被監理機關清算勒令解散）
```
[共用規則]
A stern inspector owl/badger stamping a big "revoked" seal (no letters —
just a red circular stamp mark) while a crocodile boss is dragged away
comically by the collar, papers flying. Regulatory doom, dark comedy.
Transparent background, no text.
```

---

## 生成小抄
1. 每張開頭貼共用規則；反覆強調 **transparent / no text / no card frame / no room box**。
2. 動物**物種要對**：鱷魚老闆、倉鼠PM、虎斑貓工程師、狐狸業務；稽查員固定一種(貓頭鷹或獾)。
3. 情緒對比是重點（崩潰/奸笑/狂喜/絕望），黑色喜劇感。
4. 生完檢查有沒有跑出文字或方塊底；有就回報我調 prompt。
5. 檔名照上面存。

## 交付
- A 事件 4 張：evt_explode / evt_audit / evt_rival_down / evt_windfall
- B 結局 5 張：end_survive / end_solo / end_lose_cash / end_lose_morale / end_lose_audit
→ 回傳後我去背、套 CSS 卡框、接進事件/結局卡系統。
