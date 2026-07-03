// ============================================================
// config.js — Vendor Zoo 乙方動物園 平衡數值
//
// ★ 唯一真相來源：reference/engine_python_v0.3.py 的 CONFIG / DIFF / ARCH。
//   本檔為逐字搬移，禁止自行發明數值；改動時必須與 Python 版同步
//   （Python 版保留當平衡實驗室 grid()/score_balance()）。
//
// 除了 Python 的三大表，引擎內散落的字面數值也集中到 RULES 區塊，
// 每一條都註記 Python 來源函式，方便對拍時逐條核對。
// ============================================================

// ---- CONFIG（對應 engine_python_v0.3.py CONFIG dict）----
export const CONFIG = {
  seasons_to_survive: 15,
  actions_per_season: 5,
  start_cash: 1000,
  salary: { "業務": 12, "PM": 15, "工程師": 22 },
  rent: 15,

  risk_explode_at: 100,
  risk_rise_base: [8, 16],

  bid_dc_base: 10,
  bid_dc_per_load: 3,
  bid_dc_per_rival: 1,          // 用 (存活對手-1)，少墊一點
  bid_buzzword: 1,              // buzzword 保底加成（小）
  max_cases_per_pm: 2,

  upsell_base: [150, 300],      // 乘上案型 upsell_mult
  upsell_cooldown: 2,           // 同一案幾季內不能再收

  rescue_dc: 12, rescue_cost: 80, rescue_risk_cut: [35, 55], rescue_sin_cut: 6,
  soothe_dc: 11, soothe_sat_gain: 18,
  resub_risk_shift: 25, resub_rep_hit: 5, resub_rebound: [16, 30], // v0.3 已移除轉包動作，保留數值不接 UI

  draw_cost: 90,
  blame_sin_base: 15, blame_risk_cut: 40,

  morale_cost: 60, morale_gain: 16,
  recon_cost: 40,

  sat_sue_at: 20, sue_penalty: [120, 240],

  audit_interval: [4, 6], audit_sin_soft: 45, audit_penalty: [100, 320],

  cards_per_season: 3,
  morale_start: 70, morale_decay: 5, morale_disaster_at: 15,
  morale_pm_buffer: 1,          // 每個 PM 減緩 1 點衰減（中階主管穩住團隊）
  morale_decay_floor: 2,
  morale_lowpressure: 1,
  morale_rival_hurt: 1,
  morale_rival_collapse: 3,
  morale_mess: 2,               // 搞同行成功 → 出一口氣

  event_chance: 0.6, event_double: 0.22, event_cooldown: 3,

  // 對手
  rival_hp_start: [46, 66],
  rival_ambient_dmg: [-2, 6],   // 淨值略向上：放著不管對手會回血，逼你主動搞
  inherit_risk: [55, 80],       // 接盤毒案的隱藏起始風險
  kill_windfall: [300, 500],    // 搞死一家 → 接收市場（大獎勵，讓搞同行成為主線）
  rival_pressure: 11,           // 每季每個「還活著的對手」扣現金 → 壓擺爛、獎勵清場
  mess_report_dmg: [40, 56],    // 檢舉削血
  mess_rumor_dmg: [12, 22],     // 放假消息削血
  mess_poach_dmg: [24, 36],     // 挖角削血
  card_poison_dmg: [48, 66],    // 毒模組卡削血
};

// ---- 難度倍率（對應 DIFF；DEV 練習 ~68% / PRD 真實 ~44%）----
export const DIFF = {
  DEV: { bid_income: 1.15, kill_windfall: 1.15, penalty: 0.6,  audit: 0.5,
         rival_hp: 0.85, grudge: 0.0, retal: 0.35 },  // B：不記私仇、反撲溫和
  PRD: { bid_income: 1.2,  kill_windfall: 1.1,  penalty: 0.82, audit: 0.72,
         rival_hp: 0.92, grudge: 1.0, retal: 0.52 },  // C：記私仇、終盤困獸全開
};

// ---- 五案型隱藏參數（對應 ARCH；玩家看得到 note，看不到數字）----
export const ARCH = {
  "政府案":   { upsell_mult: 0.35, upsell_sat: 10, blame_dc: 2,  audit_w: 1.6, explode_mult: 1.6, bankrupt: 0.00, loyal: 0.6, income_mult: 1.2, note: "採購法僵化、審計部盯、爆了上新聞" },
  "銀行案":   { upsell_mult: 0.70, upsell_sat: 14, blame_dc: 9,  audit_w: 2.2, explode_mult: 2.2, bankrupt: 0.00, loyal: 0.4, income_mult: 1.4, note: "金管會/個資/資安，在這使壞＝自殺" },
  "S&P500案": { upsell_mult: 1.50, upsell_sat: 10, blame_dc: 7,  audit_w: 1.0, explode_mult: 1.2, bankrupt: 0.02, loyal: 0.3, income_mult: 1.5, note: "預算深、愛buzzword，但會自己稽核你" },
  "小公司案": { upsell_mult: 0.80, upsell_sat: 16, blame_dc: -3, audit_w: 0.4, explode_mult: 0.8, bankrupt: 0.18, loyal: 0.2, income_mult: 0.7, note: "好唬好甩鍋，但常倒閉收不到尾款" },
  "傳產案":   { upsell_mult: 0.30, upsell_sat: 8,  blame_dc: 0,  audit_w: 0.4, explode_mult: 0.9, bankrupt: 0.03, loyal: 0.9, income_mult: 1.0, note: "老闆精不信話術，但死忠、綁得住" },
};

export const ARCH_CLIENTS = {
  "政府案":   ["某市交通局","某中央部會","某縣民政處","某國稅局分局","某水利署","某農業署"],
  "銀行案":   ["某公股銀行","某民營金控","某證券商","某壽險公司"],
  "S&P500案": ["某美系雲端巨頭","某跨國半導體廠","某全球零售集團","某跨國藥廠"],
  "小公司案": ["某餐飲新創","某社區診所","某電商小賣家","某地方補習班"],
  "傳產案":   ["某老字號製造廠","某水產加工廠","某螺絲大王","某紡織老廠"],
};

export const ARCH_PROJECT = {
  "政府案":   ["戶政雲端遷移","智慧路燈物聯網","稅務入口網改版","長照媒合平台","警政資料庫整併"],
  "銀行案":   ["核心帳務系統","網銀 App 改版","反洗錢監控系統","信用卡風控平台"],
  "S&P500案": ["全球 ERP 導入","AI 客服平台","供應鏈可視化","資料湖建置"],
  "小公司案": ["訂位系統","進銷存小工具","官網改版","會員 App"],
  "傳產案":   ["MES 產線系統","倉儲管理系統","老 ERP 續命","報工看板"],
};

// 取前 4 家為本局對手（同 Python RIVAL_NAMES[:4]）
export const RIVAL_NAMES = ["美商 M社", "印度商 H社", "本土 T社", "併購狂 G社", "新貴 I社"];

// 業界快訊（多數會真的削對手血）
export const NEWS_HURT = [
  "{r} 承接的報稅系統上線首日崩潰3小時，董事長對鏡頭鞠躬90度。",
  "{r} 首席架構師連夜刪庫跑路，聽說轉行去開手搖店了。",
  "{r} 被爆用實習生冒充資深顧問，甲方氣到開記者會。",
  "{r} 的『AI區塊鏈雲原生』方案，被拆穿底層是一顆 Excel。",
  "{r} 因個資外洩被開罰，罰單比合約還大。",
  "{r} 得標後才發現規格是對手代寫的綁標局，整組躺平。",
];
export const NEWS_FLAT = [
  "旗艦計畫辦公室重申：任何一家出事，其案源將轉由存活廠商承接。",
  "業界傳言某龍頭把同一批工程師掛在五個標案上，被審計部約談。",
  "立委質詢：五家龍頭的旗艦計畫預算，是不是在養蚊子？",
];

// ---- 卡片 ----
export const CARD_JUNK = [
  ["發雞排安撫", "junk"], ["連夜貼AI標籤", "junk"],
  ["叫業務再打場高爾夫", "junk"], ["找乩童收驚機房", "junk"],
];
export const CARD_PAID = [
  ["災難變現・開帳單", "cash"],
  ["毒模組甩對手", "attack_rival"],
  ["綁架條款", "lockin"],
  ["緊急重構", "launder"],
  ["和解公關", "launder"],
];
export const CARD_BASIC = [["這是前朝的鍋","blame"], ["甲方已簽核","blame"], ["純屬不可抗力","blame"]];

// ---- 姓名池（引擎隨機組合姓+名；UI 名冊優先用 HANDOFF §9 的固定名池，用完再 fallback 這組）----
export const SURN = ["陳","林","黃","張","李","王","吳","劉","蔡","楊","許","鄭","謝","洪","郭"];
export const GIV  = ["志明","淑芬","家豪","雅婷","俊傑","怡君","建宏","美玲","柏翰","冠廷","雅雯","宗翰"];

// ============================================================
// RULES — Python 引擎內散落的字面數值，集中列出（值不可動）。
// 每條標註來源函式；engine.js 一律引用這裡，不寫魔術數字。
// ============================================================
export const RULES = {
  // Game.__init__ / _setup
  init: {
    reputation: 70, sin: 0,
    staff: [["業務",1],["PM",2],["工程師",2]],       // 開局陣容
    cases_n: [2, 3],                                  // 繼承 2~3 案
    first_case_risk: [60, 80],                        // 其一藏雷
    other_case_risk: [20, 45],
    case_sat: [45, 70],
    rival_hate_start: 10,
    stat_lo_sales: 2, stat_lo_other: 1, stat_hi: 5,   // _mk 能力值
    quality: [1, 5],                                  // 目前引擎未使用，保留欄位
  },
  // start_season
  seasonStart: {
    news_hurt_dmg: [4, 10],          // H 類快訊真削血
    news_cooldown: 2,                // news_bag 冷卻（key 為 H/F 類別）
    event_chance_desperate: 0.25,    // 士氣 < morale_disaster_at 時事件率加成
  },
  // a_bid
  bid: {
    upfront: [110, 220],             // 期初款 ×D(bid_income)，大成功 ×1.5
    crit_mult: 1.5,
    fail_cost: [8, 20],              // 流標倒賠投標成本
    new_case_sat: [50, 75],
    new_case_risk: [15, 35],
  },
  // a_talk
  talk: {
    upsell_dc: 12,
    upsell_crit_mult: 1.4,
    // 注意：last_upsell 與 sat -= upsell_sat 在擲骰「前」就套用 → 榨錢失敗一樣扣滿意度、進冷卻
  },
  // a_rescue：成功 cut=randint(rescue_risk_cut)；大成功 ×1.5；失敗 cut÷3(整除)；morale -2（不設下限）
  rescue: { crit_mult: 1.5, fail_divisor: 3, morale_cost: 2 },
  // a_mess_rival（費用以 Python 程式碼為準；選單文字的 $80 是 Python 自身筆誤）
  mess: {
    report: { cost: 60,  sin: 7,  hate: 25 },
    rumor:  { cost: 40,  sin: 0,  hate: 12 },
    poach:  { cost: 165, sin: 0,  hate: 20 },  // 挖角職位隨機（工程師/PM/業務）
  },
  // a_draw：d1 → 信譽 -6 卡作廢（行動點與 $90 照扣）；其餘抽到立即結算
  draw: { fumble_rep: 6 },
  // a_morale：gain = max(4, floor(morale_gain × (1 - morale/120)))
  morale: { gain_min: 4, gain_curve_div: 120 },
  // a_recon：回報值 = 真值 ± 10 隨機誤差，夾在 0-100
  recon: { noise: 10 },
  // a_hire
  hire: {
    cost: { "工程師": 120, "PM": 150, "業務": 100 },
    rescue_hire_cost: 35,            // 保底：沒業務且現金 <100 才開放
    rescue_hire_cash_below: 100,
    rescue_hire_stat: [1, 2],
  },
  // resolve_card
  card: {
    junk_morale: 3,
    cash: { gain: [200, 420], sin: 15, risk_cut: 20 },      // 對最高風險案
    poison: { sin: 12 },             // 對手扣 card_poison_dmg；自己最高風險案 risk 歸 0。注意：Python 不加仇恨（SPEC §8 寫 +25 為誤）
    lockin: { sat_cost: 8, income_mult: 1.8 },
    refactor: { risk_cut: 50, sin_cut: 25, cost: 60 },      // 名字含「重構」且有案子時
    pr: { sin_cut: 25, rep_gain: 8, cost: 40 },
  },
  // do_blame
  blame: {
    dc_base: 11,                     // + 案型 blame_dc
    frontroom_dc: [70, 5],           // 前朝：dc += max(0,(70-reputation)//5)，每案一次
    signed_dc: [60, 4],              // 甲方已簽核：dc += max(0,(60-sat)//4)
    force_majeure_dc: [70, 6],       // 不可抗力：dc += max(0,(70-reputation)//6)
    win: { sat_cost: 12, sin_mult: 1.6 },   // 成功：risk-=blame_risk_cut, sin += blame_sin_base×audit_w×1.6
    fail: { penalty: [120, 220], rep: 8, sat: 10, sin_mult: 0.4 },  // ×D(penalty)×explode_mult
  },
  // explode（季末引爆選單）
  explode: {
    scapegoat: { risk_to: 30, morale: 15 },  // 燒工程師
    blame_risk_cap: 55,                       // 走甩鍋後 risk = min(risk, 55)
    eat: { loss: [80, 180], risk_to: 40, sin_cut: 4 },  // 硬扛 ×explode_mult×D(penalty)
  },
  // rival_retaliation
  retaliation: {
    hate_floor: [10, 18],            // floor = 10 + (4-存活家數)×18
    hate_decay: 5,                   // 沒被你搞的季 -5
    tier1_below: 40, tier1_rep: [4, 8],
    tier2_below: 70, tier2_sin: [8, 16],
    tier3_poach_chance: 0.5,         // >70：50% 挖你工程師，否則搶冒煙案(risk>=40)，都沒有則 rep-(6~12)
    tier3_smoky_risk: 40, tier3_rep: [6, 12],
  },
  // collapse_rival
  collapse: {
    inherit_atypes: ["政府案","銀行案","S&P500案"],  // 龍頭留下的多是大案
    inherit_sat: [30, 50],
    refuse: { rep: 12, cash: 80 },
  },
  // audit
  audit: {
    clean_sin_wash: 10,              // sin < soft：過關洗 10
    dodge_thr: [10, 6],              // thr = 10 + (sin-soft)//6
    dodge_sin_wash: 10,
    fined: { sin_x3: 3, rep: 15, sin_wash: 15 },  // p=(randint(audit_penalty)+(sin-soft)×3)×D(audit)
  },
  // end_season
  seasonEnd: {
    inherited_extra_rise: 6,         // 接盤案每季多 +6 風險
    income_base: 45,
    income_risk_knee: 40,            // risk<40 全額
    income_risk_div: 55,             // 否則 max(-0.15, 1-(risk-40)/55)
    income_risk_floor: -0.15,
  },
  // 事件（EVENTS 的數值效果）
  events: {
    delrepo: { risk: 45, morale: 8 },
    sales_flee: { cash: [80, 180] },
    ransom: { amount: [60, 140], refuse_risk: 35 },
    cloud: { risk_all: 15 },
    leftpad: { risk: 30 },
    vip: { crash_risk_above: 50, crash_rep: 8, ok_rep: 4 },
    media: { exposed_sin_above: 40, rep: 12 },
    luck: { cash: [60, 140] },
  },
  // UI 紅綠燈門檻（Case.light()）
  light: { red_at: 70, yellow_at: 40 },
  // 士氣血條（mbar：round(morale/20) 顆，滿 5 顆）
  moraleBar: { per_heart: 20, hearts: 5 },
};

// ---- 事件清單（名稱 → engine.js 內對應 handler；順序照 Python EVENTS）----
export const EVENT_KEYS = [
  "stroke",        // 工程師中風
  "delrepo",       // 刪庫跑路
  "sales_flee",    // 業務捲款
  "ransom",        // 勒索軟體（y/n 決策）
  "client_bankrupt", // 甲方倒閉
  "cloud",         // 雲端當機
  "leftpad",       // 套件刪庫
  "vip",           // 長官視察
  "poached",       // 王牌被挖角
  "media",         // 媒體爆料
  "windfall",      // 天上掉錢
];

// ---- UI 專用文案（不影響平衡）----
export const RIVAL_INTRO = {
  "美商 M社":   "什麼都想做的社群巨獸。天天喊敏捷，工程師卻都在假裝忙。",
  "印度商 H社": "報價低到你懷疑人生的海量外包軍團，人多便宜品質看緣分。",
  "本土 T社":   "政府標案常勝軍。簡報永遠比系統華麗，得標靠關係。",
  "併購狂 G社": "靠買公司長大的四不像。什麼都併，就是不會整合。",
};
export const RIVAL_LOGO_KEY = { "美商 M社": "M", "印度商 H社": "H", "本土 T社": "T", "併購狂 G社": "G" };

// HANDOFF §9 台灣正體姓名池（UI 名冊優先取用，純外觀）
export const NAME_POOL_M = ["陳冠廷","林彥廷","黃士豪","張家豪","吳承翰","鄭宇軒"];
export const NAME_POOL_F = ["林怡君","王淑芬","張雅婷","陳品妍","李思妤","黃鈺婷"];

export const DEFAULT_MODE = "DEV";
