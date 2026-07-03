# 插圖生產流水線（一張表 + 逐張 prompt）

一張一張去 GPT 生。**檔名必須和表格一致**——遊戲已預先接好所有檔位，圖一上傳就自動顯示，
不用改任何 code（圖沒到位時自動退回 emoji/立繪，不破圖）。

---

## 0. 使用說明（每張都照這 4 步）

1. **開新對話生圖**，貼上：`§1 共用風格` ＋ 該張的 `場景 prompt`。
2. **一定要附參考圖**（風格一致的最大關鍵）：把已完成的 `assets/events/intro.webp`
   和 `assets/events/difficulty.webp` 當風格參考一起丟進去，跟 GPT 說「照這個畫風、同一個世界觀」。
3. 生出來**存成表格指定的檔名**（`.png`），上傳到 GitHub 分支
   `assets_raw/events/<檔名>.png`（放 `assets/events/` 也行，我會歸位）。
4. 回這裡跟我說生了哪幾張，我 `git pull` →（透明就直接壓／白底先去背）→ WebP → 自動生效。

> 技術規格（每張都一樣）：**1536×1024 橫幅、透明背景、PNG、無任何文字/浮水印**。
> 主體置中偏下（卡片頂部只露約 120–180px 高，構圖重心放中下段）。

---

## 1. 共用風格（每個 prompt 前面都貼這段）

```
Style: warm-toned semi-pixel painterly illustration, cozy retro management-game
art, anthropomorphic office animals in business suits, thick dark outlines, soft
painterly shading with subtle pixel texture, warm ochre/amber palette, Taiwanese
office / government setting, dark-comedy humor. Match the attached reference
images (same art style, same world). Transparent background, clean cutout, no
checkerboard, no baked ground shadow. Landscape 3:2 (1536x1024). No text, no
letters, no logos, no watermark.
```

物種聖經（畫錯就跳戲，務必固定）：
**鱷魚=老闆**(戴墨鏡深色西裝，主角) / **倉鼠=PM** / **虎斑貓=工程師**(戴耳機、黑眼圈) /
**狐狸=業務** / **三花招財貓=吉祥物** / **貓頭鷹=稽查官員/長官**(灰西裝圓框眼鏡)。
對手四家只用動物代稱、輕暗示不指名。

---

## 2. 主表（狀態：✅已完成 / ⬜待生成）

| 檔名 | 卡片情境 | 狀態 | 一句話場景 |
|---|---|---|---|
| intro | 開場故事 | ✅ | 簽約記者會、五獎牌、鱷魚與貓頭鷹握手 |
| difficulty | 難度選擇 | ✅ | 鱷魚背影站岔路，左童話城堡右魔王城 |
| evt_explode | 季末引爆 | ✅(原素材) | 系統爆炸藍屏冒煙 |
| evt_audit | 稽核 | ✅(原素材) | 貓頭鷹稽查員翻帳 |
| evt_rival_down | 對手倒閉 | ✅(原素材) | 對手動物倒地、你接收 |
| evt_windfall | 天上掉錢 | ✅(原素材) | 金幣雨 |
| end_survive/solo/lose_cash/lose_morale/lose_audit | 五結局 | ✅(原素材) | — |
| **evt_ransom** | 勒索軟體(決策) | ⬜ | 獾駭客鎖住 NAS、紅字勒索信 |
| **evt_bankrupt** | 甲方倒閉 | ⬜ | 貼封條的甲方辦公室、跳票 |
| **evt_cloud** | 雲端當機 | ⬜ | 雲朵機房冒煙、動物拜乖乖 |
| **evt_leftpad** | 套件刪庫 | ⬜ | 積木塔抽掉一塊整座垮 |
| **evt_poached** | 王牌被挖角 | ⬜ | 對手用釣竿釣走戴耳機的貓工程師 |
| **evt_media_bad** | 黑歷史上頭條 | ⬜ | 記者鳥群圍拍、鱷魚老闆遮臉 |
| **evt_media_ok** | 查無實據 | ⬜ | 記者翻垃圾桶一無所獲、狐狸業務裝無辜 |
| **evt_vip_ok** | 視察過關 | ⬜ | 鱷魚與貓頭鷹長官握手合照、比讚 |
| **evt_terminate** | 甲方解約 | ⬜ | 甲方拍桌撕合約、丟求償單 |
| **evt_inherit** | 接盤毒案(決策/結果) | ⬜ | 政府硬塞發霉紙箱前朝毒案 |
| **evt_blame_win** | 甩鍋成功 | ⬜ | 鱷魚把鍋推給不在場的人、下庄 |
| **evt_blame_fail** | 甩鍋翻車 | ⬜ | 甲方投影出證據、鱷魚冒汗 |
| **evt_explode_eat** | 硬扛認賠 | ⬜ | 鱷魚咬牙簽認賠支票 |
| **evt_scapegoat** | 推替死鬼 | ⬜ | 記者會把貓工程師推出去揹鍋 |
| **evt_stroke** | 工程師過勞 | ⬜(現用立繪) | 貓工程師趴桌、救護車 |
| **evt_delrepo** | 刪庫跑路 | ⬜(現用立繪) | 貓工程師拎箱走、螢幕 rm -rf |
| **evt_sales_flee** | 業務捲款 | ⬜(現用立繪) | 狐狸拖行李箱奔機場 |
| **evt_vip_crash** | 視察當機 | ⬜(現用立繪) | 長官點下去藍屏、全場尷尬 |
| **act_bid_win** | 得標 | ⬜ | 狐狸業務舉得標單歡呼、彩帶 |
| **act_bid_fail** | 標飛了 | ⬜ | 得標單被風吹走、狐狸傻眼 |
| **act_mess_report** | 檢舉出手 | ⬜ | 匿名檢舉信投進監理機關信箱 |
| **act_mess_rumor** | 放假消息 | ⬜ | 狐狸在群組打字、謠言擴散 |
| **act_mess_poach** | 挖角成功 | ⬜ | 用手搖飲釣走對手員工 |
| **act_tottering** | 對手瀕死 | ⬜ | 對手動物血條見底、跪地冒煙 |
| **act_morale** | 發獎金 | ⬜ | 發雞排+紅包、員工眼裡有光 |
| **act_hire** | 招募 | ⬜ | 新動物員工抱紙箱報到 |
| **act_draw_fumble** | 抽卡失敗 | ⬜ | 印錯公司名的新聞稿 |
| **card_poison** | 毒模組 | ⬜ | 包裝精美的毒模組禮盒送對手 |
| **card_lockin** | 綁架條款 | ⬜ | 義大利麵程式碼纏住甲方大樓 |
| **card_refactor** | 緊急重構 | ⬜ | 貓工程師深夜大掃除刪舊碼 |
| **card_pr** | 公關洗白 | ⬜ | 獎盃+「數位轉型楷模」報導 |
| **card_disaster_cash** | 災難變現 | ⬜ | 火場前笑著開帳單 |

> 「現用立繪」四張：目前用員工立繪權充、堪用；要升級成專屬情境圖再生，優先度低。

---

## 3. 逐張場景 prompt（貼在 §1 之後）

### evt_ransom — 勒索軟體
`A grumpy badger hacker in a hoodie sits smugly beside a company NAS server wrapped in glowing red chains and a padlock; the server screen shows a menacing red ransom note; a small crocodile boss in the background clutches his wallet in despair.`
中：戴帽 T 的獾駭客得意坐在被紅色鎖鏈與掛鎖纏住的 NAS 旁，螢幕跳紅字勒索信；背景小小的鱷魚老闆抱著錢包絕望。

### evt_bankrupt — 甲方倒閉
`A shuttered client office building with official red seizure seals across the door, an overturned chair, a "closed / bankrupt" notice; a fox salesman outside holding an unpaid invoice that dissolves into dust.`
中：貼滿紅色查封條的甲方辦公室、翻倒的椅子、倒閉公告；門外狐狸業務手拿化成灰的欠款單。

### evt_cloud — 雲端當機
`A giant cloud-shaped server room short-circuiting with sparks and smoke; office animals gathered below praying to a stack of green "乖乖" snack packs placed on the servers (well-known Taiwanese IT superstition), everything offline.`
中：雲朵造型機房短路冒火花濃煙；下方動物員工對著疊在伺服器上的綠色乖乖膜拜，全線離線。

### evt_leftpad — 套件刪庫
`A towering jenga-like stack of code blocks; one tiny brick at the very bottom labeled with a small package icon is being pulled out by a distant hand, the whole tower toppling; a tabby-cat engineer watches in horror.`
中：高聳的積木程式碼塔，最底層一塊小小的（套件圖示）被遠方的手抽走、整座傾倒；虎斑貓工程師驚恐旁觀。

### evt_poached — 王牌被挖角
`A rival animal boss in a suit reels in a headphone-wearing tabby-cat engineer with a fishing rod baited with a bubble-tea cup; the cat drifts away clutching his keyboard, your side reaching out too late.`
中：對手動物老闆用綁著手搖飲的釣竿，把戴耳機的虎斑貓工程師釣走；貓抱著鍵盤飄離，你這邊伸手已來不及。

### evt_media_bad — 黑歷史上頭條
`A swarm of paparazzi bird reporters with cameras and microphones mob a sweating crocodile boss who shields his face with a folder; tabloid flashbulbs everywhere, a scandal headline mood.`
中：一群拿相機麥克風的鳥記者圍拍冒汗的鱷魚老闆，他用資料夾遮臉；閃光燈四射，醜聞氛圍。

### evt_media_ok — 查無實據
`A reporter bird digging through an office trash can finding nothing but tangled cables and blank paper, looking defeated; a fox salesman leans on the wall with an innocent whistling expression.`
中：鳥記者翻辦公室垃圾桶只翻出纏成一團的線和白紙、一臉挫敗；狐狸業務靠牆吹口哨裝無辜。

### evt_vip_ok — 視察過關
`A crocodile boss shaking hands and posing for a photo with a stern owl government official in a grey suit; both give a thumbs up in front of a smoothly-running demo screen; camera flash, relieved cold sweat.`
中：鱷魚老闆與灰西裝貓頭鷹長官握手合照、兩者對著順跑的 Demo 螢幕比讚；鎂光燈、鬆一口氣的冷汗。

### evt_terminate — 甲方解約
`An angry client (a boss animal) slams the table and rips a contract in half, throwing a compensation claim invoice at a crocodile boss across the desk; papers flying.`
中：憤怒的甲方（動物老闆）拍桌撕合約，隔桌把求償帳單丟向鱷魚老闆；紙張飛散。

### evt_inherit — 接盤毒案（勒索與接盤決策共用）
`A crocodile boss reluctantly receives a moldy cardboard box shoved by a government owl official; the box overflows with tangled cables, a cracked hard drive and a cursed-looking floppy disk labeled with a skull; dust puffing out.`
中：鱷魚老闆不情願接下貓頭鷹官員硬塞的發霉紙箱，箱裡滿是纏線、裂開硬碟、貼骷髏的詛咒磁片；灰塵撲出。

### evt_blame_win — 甩鍋成功
`A slick crocodile boss in sunglasses smoothly gestures toward an empty chair, deflecting blame onto an absent party; the client animals nod, convinced; he loosens his collar with a sly grin.`
中：戴墨鏡的鱷魚老闆從容指向一張空椅、把責任推給不在場的人；甲方動物點頭被說服；他鬆領口賊笑。

### evt_blame_fail — 甩鍋翻車
`A crocodile boss frozen mid-excuse as the client projects an incriminating email on the big screen behind him; cold sweat, everyone staring; the blame bounces right back.`
中：鱷魚老闆藉口講到一半僵住，身後大螢幕投出打臉的證據郵件；冷汗、全場盯著他；鍋彈回自己身上。

### evt_explode_eat — 硬扛認賠
`A crocodile boss gritting his teeth signing a huge red compensation cheque with a shaking hand; a burning project dumpster behind him; he swallows the loss.`
中：鱷魚老闆咬牙、手發抖簽下一張巨額紅色認賠支票；背後是燒起來的專案垃圾桶；把虧損吞了。

### evt_scapegoat — 推替死鬼
`At a press conference podium, a crocodile boss shoves a bewildered headphone-wearing tabby-cat engineer forward to take the blame; flashbulbs on the cat; the rest of the team watches in cold silence from the shadows.`
中：記者會講台上，鱷魚老闆把一臉錯愕、戴耳機的虎斑貓工程師推上前揹鍋；閃光燈打在貓身上；其餘團隊在暗處冷眼旁觀。

### act_bid_win — 得標
`A fox salesman triumphantly holding up a winning bid document, confetti and ribbons flying, a golden glow; celebratory but slightly smug.`
中：狐狸業務高舉得標單歡呼、彩帶紙花飛舞、金光；慶祝中帶點得意。

### act_bid_fail — 標飛了
`A fox salesman with a dumbfounded face as the bid document blows away in the wind out of reach; a rubber-stamp "REJECTED" mood without text; deflated.`
中：狐狸業務傻眼看著得標單被風吹走搆不到；「槓龜」氛圍（不要文字）；洩氣。

### act_mess_report — 檢舉出手
`A sly fox hand dropping an anonymous tip-off envelope into a government "regulator" mailbox at night; a tiny surveillance/whistle motif; scheming vibe.`
中：狐狸的手在夜裡把匿名檢舉信投進政府監理機關信箱；小小的哨子/監視意象；算計感。

### act_mess_rumor — 放假消息
`A fox salesman gleefully typing on a phone in an industry group chat, cartoon speech bubbles of gossip spreading outward like a virus toward a distant rival building; whisper-network vibe.`
中：狐狸業務在業界群組開心打字，八卦泡泡像病毒往遠方對手大樓擴散；耳語傳播感。

### act_mess_poach — 挖角成功
`Your crocodile boss lures a rival's employee across with a tray of free bubble-tea; the employee happily crosses over carrying a cardboard box of belongings; the rival boss fumes in the background.`
中：鱷魚老闆用一盤免費手搖飲把對手員工挖過來；員工開心抱著私物紙箱走過來；對手老闆在背景氣炸。

### act_tottering — 對手瀕死
`A rival animal boss on his knees, suit tattered, a nearly-empty health bar floating above him, smoke rising, coins spilling from his pockets; on the verge of collapse, dramatic.`
中：對手動物老闆跪地、西裝破爛，頭上血條見底、冒煙、口袋灑出硬幣；瀕臨崩潰、戲劇張力。

### act_morale — 發獎金
`A crocodile boss handing out red envelopes and a stack of fried-chicken (雞排) boxes to grateful office animals; their tired eyes light up; warm cozy relief.`
中：鱷魚老闆發紅包和一疊雞排給感激的動物員工；疲憊的眼睛亮起來；溫暖療癒。

### act_hire — 招募
`A fresh new animal employee in a slightly-too-big suit arriving at the office holding a cardboard box of belongings and a potted plant, nervous smile; existing staff peek over.`
中：一位穿著稍大西裝的新動物員工抱著私物紙箱和小盆栽報到、緊張微笑；現有員工探頭看。

### act_draw_fumble — 抽卡失敗
`A crocodile boss facepalming at a freshly printed press release with the company name misspelled/wrong; a PR disaster mood; crumpled papers.`
中：鱷魚老闆對著剛印好、公司名印錯的新聞稿扶額；公關災難氛圍；揉皺的紙。

### card_poison — 毒模組
`A beautifully gift-wrapped software module box with a ribbon, secretly leaking toxic green ooze and tiny bug icons from its seams, being handed to an unsuspecting rival animal boss.`
中：包裝精美繫緞帶的軟體模組禮盒，接縫偷偷滲出毒綠汁液和小蟲圖示，遞給毫無戒心的對手動物老闆。

### card_lockin — 綁架條款
`A client office tower completely entangled and bound by giant strands of spaghetti-code cables like chains; only the crocodile boss holds the single key; the client can't escape.`
中：甲方辦公大樓被巨大的義大利麵程式碼纜線像鎖鏈般整棟纏死綁住；只有鱷魚老闆握著唯一鑰匙；甲方逃不掉。

### card_refactor — 緊急重構
`A headphone-wearing tabby-cat engineer deep-cleaning at midnight, sweeping mountains of old tangled code into a shredder, sparkling clean result emerging; exhausted but satisfied.`
中：戴耳機的虎斑貓工程師半夜大掃除，把成山的纏結舊碼掃進碎紙機，露出乾淨清爽的成果；累但滿足。

### card_pr — 公關洗白
`A crocodile boss on a magazine cover as "digital transformation model", golden trophy and glowing headlines around him, spin-doctored halo; behind the curtain a pile of swept-under problems.`
中：鱷魚老闆登上「數位轉型楷模」雜誌封面、金獎盃與發亮標題環繞、洗白光環；布幕後是掃到一旁的問題堆。

### card_disaster_cash — 災難變現
`A crocodile boss calmly writing an "emergency repair invoice" in front of a burning server room, flames reflected in his sunglasses, coins already flowing in; profiting from his own disaster.`
中：鱷魚老闆在燒起來的機房前淡定開「緊急搶修帳單」，火光映在墨鏡上，硬幣已流進來；自己的災難自己變現。

### （選配）現用立繪四張的專屬情境
- **evt_stroke**：`headphone-wearing tabby-cat engineer collapsed face-down on a desk covered in energy-drink cans, a stretcher arriving.`
- **evt_delrepo**：`a tabby-cat engineer walking out with a box, the monitor behind showing an ominous "rm -rf" command and an empty folder.`
- **evt_sales_flee**：`a fox salesman sprinting toward the airport dragging a suitcase leaking cash, a plane ticket in his teeth.`
- **evt_vip_crash**：`an owl official pressing a demo button that instantly blue-screens; the whole room frozen in awkward silence.`
