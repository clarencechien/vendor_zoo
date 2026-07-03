// ============================================================
// main.js — 流程接線：標題 → intro/難度 → 季循環（季初事件 → 行動 → 季末結算）→ 結局
// 引擎是唯一真相；這裡只做：呼叫動作 → 收 log → 演出（card/ticker/戰報）→ re-render。
// ============================================================

import { CONFIG } from "./config.js";
import { makeRng } from "./rng.js";
import {
  newGame, beginSeason, seasonStartFlow, seasonEndFlow, visibleState,
  actionBid, actionTalk, actionRescue, actionMess, actionDraw, resolveDrawnCard,
  actionMorale, actionHire, actionRecon, playCard, endingKey,
} from "./engine.js";
import { makeNarrator, narrate } from "./narration.js";
import {
  initChrome, render, tick, logLine, toast, card, sheet, closeSheet,
  pickSheet, pickCase, pickRival, rivalPop, caseDetail, intelPanel, rosterSheet, IMG,
} from "./ui.js";

const $ = (id) => document.getElementById(id);

let game = null;
let narrator = null;
let logCursor = 0;
let busy = false;
let endPhase = null; // 行動階段的結束 resolver
const deferred = {}; // 決策 modal 要用的旁白文字（season.explode / event.ransom）

// ---------- 偵錯系統：卡住/炸掉時看得到為什麼 ----------
// 錯誤環形緩衝 + localStorage 持久化 + 戰報抽屜「🐞 匯出偵錯」一鍵帶走
const dbgErrors = [];
function recordErr(msg) {
  const entry = { ts: new Date().toISOString(), season: game?.season, msg: String(msg).slice(0, 4000) };
  dbgErrors.push(entry);
  while (dbgErrors.length > 30) dbgErrors.shift();
  try { localStorage.setItem("vz_debug_errors", JSON.stringify(dbgErrors)); } catch {}
  try { logLine("🐞", `發生錯誤：${entry.msg.split("\n")[0]}`, "戰報→匯出偵錯 可帶走完整紀錄"); } catch {}
  try { toast("🐞 出錯了——戰報裡有「匯出偵錯」可回報", 3000); } catch {}
}
window.addEventListener("error", (e) => recordErr(`${e.message}\n${e.error?.stack || `${e.filename}:${e.lineno}`}`));
window.addEventListener("unhandledrejection", (e) => recordErr(`unhandledrejection: ${e.reason?.stack || e.reason}`));

function debugDump() {
  let state = null;
  try {
    // rng(閉包)與 log(另附尾段)拿掉，其餘完整快照——偵錯用，含隱藏數字
    const { rng, log, ...rest } = game || {};
    state = JSON.parse(JSON.stringify(rest));
  } catch (e) { state = "state 序列化失敗: " + e; }
  return JSON.stringify({
    when: new Date().toISOString(),
    ua: navigator.userAgent,
    seed: game?.rng?.seed, mode: game?.mode, season: game?.season,
    hint: `用 ?seed=${game?.rng?.seed} 可重現這一局的隨機序`,
    errors: dbgErrors,
    prevSessionErrors: (() => { try { return JSON.parse(localStorage.getItem("vz_debug_errors") || "[]"); } catch { return []; } })(),
    ui: { busy, actionPhase: !!endPhase, logCursor },
    state,
    recentLog: (game?.log || []).slice(-80),
  }, null, 1);
}
async function exportDebug() {
  const dump = debugDump();
  let copied = false;
  try { await navigator.clipboard.writeText(dump); copied = true; } catch {}
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([dump], { type: "application/json" }));
    a.download = `vendorzoo-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {}
  toast(copied ? "偵錯內容已複製到剪貼簿（也下載了一份 json）" : "已下載偵錯 json", 2600);
}

// ---------- 引擎 sys.* 事件的備援文案（對齊 Python 的 print） ----------
const SYS_TEXT = {
  "sys.roll": (v) => `🎲 ${v.label}：d20(${v.d})+${v.bonus}=${v.tot}（線${v.dc}）→ ${v.ok ? "成功" : "失敗"}${v.crit ? " ★大成功" : ""}${v.fumble ? " ☠大失敗" : ""}`,
  "sys.bid_no_sales": () => "沒業務去搶標。",
  "sys.bid_overload": (v) => `❌ PM 全超載（${v.pm}PM 扛 ${v.cases}案），沒人罩新案。先招 PM 或消化案子。`,
  "sys.bid_type": (v) => `📋 這次流出的是一個【${v.atype}】：${v.note}`,
  "sys.bid_win": (v) => `✅ 得標！期初款 +$${v.amount}萬，直接下包出去。`,
  "sys.bid_fail": (v) => `❌ 標飛了。標書變廢紙，還倒貼 $${v.amount}萬 裝訂費。`,
  "sys.no_cash": () => "現金不足。",
  "sys.no_case": () => "沒有案子。",
  "sys.no_rival": () => "對手都倒光了。你環顧四周，只剩自己可以搞。",
  "sys.talk_no_sales": () => "沒業務可派去動嘴。",
  "sys.upsell_cooldown": (v) => `⚠《${v.case}》上季才剛收過，甲方翻白眼，這季收不動。`,
  "sys.soothe_win": () => "🗣️ 把客戶哄回來了（滿意度回補，問題還在）。",
  "sys.soothe_fail": () => "❌ 客戶不吃這套，還把你的話術截圖傳到內部群組。",
  "sys.rescue_no_eng": () => "沒工程師，救火隊是空的。",
  "sys.rival_tottering": (v) => `💥 ${v.rival} 撐不住了……（季末結算他的下場）`,
  "sys.draw": (v) => `🎴 花 $${CONFIG.draw_cost}萬抽卡……抽到【${v.name}】`,
  "sys.draw_fumble": () => "☠ 大失敗！新聞稿打錯公司名，信譽受損，卡作廢。",
  "sys.hire": (v) => `🧑‍💼 招到 ${v.name}（${v.role}，能力${v.stat}）-$${v.cost}萬。中間商養太多人＝薪水吃現金。`,
  "sys.hire_rescue": (v) => `🙏 拜託前員工 ${v.name} 回鍋兼差救急（業務，能力${v.stat}）-$35萬。至少還能掙扎。`,
  "sys.cards_maxed": () => `本季手段出滿 ${CONFIG.cards_per_season} 次了，做人留一手，下季再陰。`,
  "sys.hand_empty": () => "手牌空空，跟你的良心一樣。",
  "sys.card_junk": (v) => `🃏 ${v.name}：聊勝於無，士氣 +3。`,
  "sys.card_wasted": (v) => `【${v.name}】沒有可作用的目標，打空了。`,
  "sys.recon": (v) => `🕵️《${v.case}》真實引爆風險 ≈${v.risk}，客戶滿意度 ≈${v.sat}（估計，有誤差）。`,
  "sys.frontroom_spent": (v) => `⚠《${v.case}》的前朝已用過——現在前朝就是你，失效。`,
  "sys.event_fired": (v) => `🎲 意外事件：【${v.title}】`,
  "sys.event_dud": () => "（事件撲空。今天的雷，滾去別人家炸了。）",
  "sys.ransom_paid": (v) => `→ 付了 $${v.amount}萬 贖回資料，發票品名：資安顧問費。`,
  "sys.ransom_refused": (v) => v.case ? `→ 拒付！省了錢，但《${v.case}》的資料受損，風險大增。` : "→ 拒付！手上沒案子，駭客鎖了個寂寞。",
  "sys.calm": () => "（表面風平浪靜……風險還在悄悄長。）",
  "sys.season_settle": (v) => `── 第 ${v.season} 季 結算 ──`,
  "sys.retal_rumor": (v) => `🩸 ${v.rival} 放你假消息中傷，信譽被啃了一口。`,
  "sys.retal_report": (v) => `🩸 ${v.rival} 匿名檢舉你違規，監理機關開始盯上你。`,
  "sys.retal_poach": (v) => `🩸 ${v.rival} 狗急跳牆，反手挖走你的工程師${v.eng}。`,
  "sys.retal_steal_case": (v) => `🩸 ${v.rival} 趁火打劫，把你正在冒煙的《${v.case}》整碗端走了。`,
  "sys.retal_smear": (v) => `🩸 ${v.rival} 到處唱衰你，信譽下滑。`,
  "sys.audit_start": () => "⚖️ 監理機關稽核：翻你的帳本、技術債、甩鍋史……",
  "sys.audit_roll": (v) => `🎲 稽核判定：d20(${v.d}) vs 罪孽壓力 ${v.thr}`,
  "sys.finance": (v) => `💵 維護收入 +$${v.income}｜薪資租金 -$${v.payroll}（${v.staff}人）｜同業壓力 -$${v.pressure}｜季末現金 $${v.cash}萬`,
  "sys.inherit_refused": () => "你拒接，政府臉很臭。信譽 -12、公關費 -$80萬。",
  "sys.bad_input": () => "（無效操作。）",
};

function textFor(e) {
  if (narrator.has(e.key)) return narrate(narrator, game, e.key, e.vars);
  return SYS_TEXT[e.key] ? SYS_TEXT[e.key](e.vars) : null;
}
const iconFor = (k) =>
  k.startsWith("news.") ? "📰" : k.startsWith("audit") || k.includes("audit") ? "⚖️" :
  k.startsWith("sys.retal") ? "🩸" : k === "sys.finance" ? "💵" :
  k.startsWith("event.") ? "⚡" : k.startsWith("sys.roll") ? "🎲" : "•";

// ---------- 流程 log → 演出 ----------
// 這些 key 的卡片由決策 modal 呈現，文字先存起來
const DEFER = new Set(["season.explode", "event.ransom"]);
// 這些 key 演成事件卡（大插圖）
// evt = 事件插圖檔名（assets/events/<evt>.webp）；圖未到位時自動退回 spr/emoji（見 ui.js card()）。
// 待補圖清單與 prompt 見 content/image_prompts.md，檔名須與此處 evt 一致。
const CARD_KEYS = {
  "event.stroke": { tag: "意外事件", title: "工程師過勞倒下", evt: "evt_stroke", spr: "eng_m_orz" },
  "event.delrepo": { tag: "意外事件", title: "刪庫跑路", evt: "evt_delrepo", spr: "eng_m_orz" },
  "event.sales_flee": { tag: "意外事件", title: "業務捲款", evt: "evt_sales_flee", spr: "sales_m_orz" },
  "event.client_bankrupt": { tag: "甲方倒閉", title: "甲方倒了", evt: "evt_bankrupt", emoji: "🏚️" },
  "event.cloud": { tag: "意外事件", title: "雲端大當機", evt: "evt_cloud", emoji: "☁️💥" },
  "event.leftpad": { tag: "意外事件", title: "開源套件被刪", evt: "evt_leftpad", emoji: "📦🕳️" },
  "event.vip_crash": { tag: "長官視察", title: "展示必當機定律", evt: "evt_vip_crash", spr: "pm_f_orz" },
  "event.vip_ok": { cls: "good", tag: "長官視察", title: "奇蹟般沒當機", evt: "evt_vip_ok", emoji: "🤝📸" },
  "event.poached": { tag: "意外事件", title: "王牌被挖角", evt: "evt_poached", emoji: "🎣" },
  "event.media_exposed": { tag: "媒體爆料", title: "黑歷史上頭條", evt: "evt_media_bad", emoji: "📰🔥" },
  "event.media_clean": { cls: "good", tag: "媒體爆料", title: "查無實據", evt: "evt_media_ok", emoji: "📰🍵" },
  "event.windfall": { cls: "good", tag: "意外之財", title: "天上掉錢！", evt: "evt_windfall" },
  "season.terminate": { tag: "季末·解約", title: "甲方終止合約", evt: "evt_terminate", emoji: "📄🔥" },
  "audit.clean": { cls: "good", tag: "監理稽核", title: "稽核過關", evt: "evt_audit" },
  "audit.dodged": { cls: "good", tag: "監理稽核", title: "驚險擺平稽核", evt: "evt_audit" },
  "audit.fined": { tag: "監理稽核", title: "稽核重罰", evt: "evt_audit" },
  "rival.collapse": { cls: "good", tag: "對手倒閉", title: "同行倒了！", evt: "evt_rival_down" },
  "rival.inherit": { tag: "接盤", title: "接下前朝毒案", evt: "evt_inherit", emoji: "🎁💀" },
  "blame.win": { cls: "good", tag: "甩鍋", title: "甩鍋成功（延遲帳單）", evt: "evt_blame_win", emoji: "🫱🍳" },
  "blame.fail": { tag: "甩鍋", title: "甩鍋翻車", evt: "evt_blame_fail", emoji: "🫱💥" },
  "explode.eat": { tag: "季末·引爆", title: "硬扛認賠", evt: "evt_explode_eat", emoji: "🧯💸" },
  "explode.scapegoat": { tag: "季末·引爆", title: "推替死鬼", evt: "evt_scapegoat", emoji: "🐐" },
};

function takeNewLog() {
  const out = game.log.slice(logCursor);
  logCursor = game.log.length;
  return out;
}

async function presentNewLog() {
  const entries = takeNewLog();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const text = textFor(e);
    if (text == null) continue;
    logLine(iconFor(e.key), text, `${e.key}·第${e.season}季`);
    if (DEFER.has(e.key)) { deferred[e.key] = text; continue; }
    if (e.key.startsWith("news.")) { tick(`📰 <b>業界快訊</b>：${text}`); continue; }
    const ck = CARD_KEYS[e.key];
    if (ck) {
      let body = text;
      // 甩鍋翻車 + 被提告 併成一張卡
      if (e.key === "blame.fail" && entries[i + 1]?.key === "blame.sue") {
        i++;
        const t2 = textFor(entries[i]);
        logLine("⚖️", t2, `blame.sue·第${e.season}季`);
        body += "\n" + t2;
      }
      await card({ ...ck, key: e.key, body });
      render(visibleState(game));
    }
  }
}

// ---------- 決策 modal（generator yield 的答案） ----------
async function askDecision(req) {
  if (req.decision === "ransom") {
    return card({
      tag: "意外事件", title: "勒索軟體", evt: "evt_ransom", emoji: "🔐💾",
      key: "event.ransom", body: deferred["event.ransom"] || "",
      choices: [
        { label: `付贖金 $${req.amount}萬`, sub: "花錢消災", value: true },
        { label: "拒付", sub: "省錢，但資料受損、最危險的案子風險大增", value: false, dismiss: true },
      ],
    });
  }
  if (req.decision === "explode") {
    return card({
      tag: "季末·引爆", title: `技術債炸開：《${req.caseName}》`, evt: "evt_explode",
      key: "season.explode", body: deferred["season.explode"] || "",
      choices: [
        { label: "硬扛認賠", sub: "自己吞下去，錢包痛但良心乾淨（罪孽不增）", value: "eat" },
        { label: "推前朝", sub: req.frontroomSpent ? "前朝就是你，用過失效" : "甩鍋（賭）：信譽低越難唬，每案限一次", value: "frontroom", disabled: req.frontroomSpent },
        { label: "推不可抗力", sub: "甩鍋（賭）：信譽低越難唬", value: "force" },
        { label: "推甲方已簽核", sub: "甩鍋（賭）：客戶越不爽越易翻車", value: "signed" },
        { label: "推替死鬼", sub: req.canScapegoat ? "燒一名工程師，士氣重挫" : "沒有工程師可以燒", value: "scapegoat", disabled: !req.canScapegoat },
      ],
    });
  }
  if (req.decision === "inherit") {
    return card({
      tag: "縮圈·接盤", title: "政府塞案上門", evt: "evt_inherit", emoji: "🏛️📦",
      key: "rival.inherit",
      body: `旗艦計畫辦公室：『${req.rival} 留下的案子不能開天窗，就交給貴公司了。』\n這是一個【${req.atype}】前朝毒案——沒文件、沒交接、風險成謎。`,
      choices: [
        { label: "接盤", sub: "多一個案子多一份維護費……和一顆雷", value: true },
        { label: "臨陣脫逃", sub: "信譽 -12、公關費 -$80萬", value: false, dismiss: true },
      ],
    });
  }
  return null;
}

// UI 驅動 generator：跑到決策點 → 先演出累積的 log → 彈 modal → 續跑
async function runFlowUI(gen) {
  let input;
  for (;;) {
    const { value, done } = gen.next(input);
    await presentNewLog();
    if (done) break;
    input = await askDecision(value);
  }
  render(visibleState(game));
}

// ---------- 玩家動作共用包裝 ----------
// 結果呈現總表（單一真相源）。每個結果事件一筆：
//   card  — 這個事件是否要把整次動作結果升級成中央卡（否則預設 toast）
//   prio  — 一次動作若同時吐多個事件，標頭由 prio 最高者擔任（同分則先出現者）
//   art   — 當呈現為卡片時的門面（cls/tag/title/emoji|spr）
// 設計原則：例行結果走 toast（減少點擊稅）；有戲的（成敗儀式、賭注、對手瀕死）升級成卡。
// prio 讓「世界級升級」（對手瀕死）壓過觸發它的動作，標頭才不會被埋掉。
const RESULT = {
  // 搶標：儀式感動作，成敗都出卡
  "sys.bid_win":        { card: true,  prio: 3, art: { cls: "good", tag: "搶標", title: "得標！", evt: "act_bid_win", emoji: "📋✨" } },
  "sys.bid_fail":       { card: true,  prio: 3, art: { tag: "搶標", title: "標飛了", evt: "act_bid_fail", emoji: "📋💨" } },
  // 話術：榨錢大進帳(≥150，見 classifyResult)或翻車出卡，其餘 toast
  "action.upsell_win":  { card: false, prio: 3, art: { cls: "good", tag: "話術·榨錢", title: "榨錢成功", spr: "sales_m_sit" } },
  "action.upsell_stiff":{ card: false, prio: 3, art: { cls: "good", tag: "話術·榨錢", title: "只擠出一點", spr: "sales_m_sit" } },
  "action.upsell_fail": { card: true,  prio: 3, art: { tag: "話術·榨錢", title: "被看穿了", spr: "sales_m_orz" } },
  "sys.soothe_win":     { card: false, prio: 3, art: { cls: "good", tag: "話術·安撫", title: "客戶被哄回來了", spr: "sales_m_sit" } },
  "sys.soothe_fail":    { card: false, prio: 3, art: { tag: "話術·安撫", title: "客戶不吃這套", spr: "sales_m_orz" } },
  "action.rescue":      { card: false, prio: 3, art: { cls: "good", tag: "救火", title: "工程師下去救了", spr: "eng_m_sit" } },
  // 搞同行：例行 toast；真把對手打到瀕死才由 sys.rival_tottering 升級
  "action.mess_report": { card: false, prio: 3, art: { cls: "good", tag: "搞同行", title: "檢舉出手", evt: "act_mess_report", emoji: "⚖️🗡️" } },
  "action.mess_rumor":  { card: false, prio: 3, art: { cls: "good", tag: "搞同行", title: "假消息放出去了", evt: "act_mess_rumor", emoji: "🐍📢" } },
  "action.mess_poach":  { card: false, prio: 3, art: { cls: "good", tag: "搞同行", title: "挖角成功", evt: "act_mess_poach", emoji: "🎣" } },
  "sys.rival_tottering":{ card: true,  prio: 9, art: { cls: "good", tag: "搞同行", title: "對手快撐不住了！", evt: "act_tottering", emoji: "💥" } },
  "action.morale":      { card: false, prio: 3, art: { cls: "good", tag: "經營", title: "發獎金了", evt: "act_morale", emoji: "🍗💰" } },
  "sys.hire":           { card: false, prio: 3, art: { cls: "good", tag: "招募", title: "新血加入", evt: "act_hire", emoji: "🧑‍💼✨" } },
  "sys.hire_rescue":    { card: false, prio: 3, art: { cls: "good", tag: "招募", title: "前員工回鍋救急", emoji: "🙏" } },
  "sys.draw_fumble":    { card: true,  prio: 3, art: { tag: "抽卡", title: "抽卡大失敗", evt: "act_draw_fumble", emoji: "🎴☠️" } },
  // 強卡：效果都有戲，出卡
  "card.poison":        { card: true,  prio: 3, art: { cls: "good", tag: "手牌", title: "毒模組塞出去了", evt: "card_poison", emoji: "🧪🗡️" } },
  "card.lockin":        { card: true,  prio: 3, art: { cls: "good", tag: "手牌", title: "綁架條款生效", evt: "card_lockin", emoji: "🔒" } },
  "card.refactor":      { card: true,  prio: 3, art: { cls: "good", tag: "手牌", title: "緊急重構", evt: "card_refactor", emoji: "🧼" } },
  "card.pr":            { card: true,  prio: 3, art: { cls: "good", tag: "手牌", title: "公關洗白", evt: "card_pr", emoji: "🤝📰" } },
  "card.disaster_cash": { card: true,  prio: 3, art: { cls: "good", tag: "手牌", title: "災難變現", evt: "card_disaster_cash", emoji: "💰🔥" } },
  "sys.card_junk":      { card: false, prio: 3, art: { cls: "good", tag: "手牌", title: "聊勝於無", emoji: "🍗" } },
  "sys.card_wasted":    { card: false, prio: 3, art: { tag: "手牌", title: "打空了", emoji: "🃏" } },
  // 甩鍋：賭注，出卡（與 CARD_KEYS 的 blame 共用同一張圖）
  "blame.win":          { card: true,  prio: 3, art: { cls: "good", tag: "手牌·甩鍋", title: "甩鍋成功（延遲帳單）", evt: "evt_blame_win", emoji: "🫱🍳" } },
  "blame.fail":         { card: true,  prio: 3, art: { tag: "手牌·甩鍋", title: "甩鍋翻車", evt: "evt_blame_fail", emoji: "🫱💥" } },
  "sys.frontroom_spent":{ card: true,  prio: 3, art: { tag: "手牌·甩鍋", title: "前朝失效", emoji: "🫱🚫" } },
};

// 純分類：一次動作的 events → { 是否出卡、標頭 art、每行文字、toast 首選行 }
// 不碰 DOM。card 升級來自 RESULT.card、擲骰大成功/大失敗、或榨錢大進帳。
function classifyResult(events) {
  const lines = [];
  let useCard = false, headline = null, headPrio = -1, toastLine = null;
  for (const e of events) {
    const text = textFor(e);
    if (text == null) continue;
    lines.push({ key: e.key, season: e.season, text });
    const meta = RESULT[e.key];
    if (
      meta?.card ||
      (e.key === "sys.roll" && (e.vars.crit || e.vars.fumble)) ||
      (e.key === "action.upsell_win" && (e.vars.amount || 0) >= 150)
    ) useCard = true;
    if (meta?.art && meta.prio > headPrio) { headline = meta.art; headPrio = meta.prio; }
    if (e.key !== "sys.roll" && toastLine === null) toastLine = text;
  }
  return { useCard, headline, lines, toastLine };
}

// 演出：戰報一律留檔；分級決定中央卡或 toast。（blame.sue 是獨立旁白事件，
// 會自然收進 lines，不需特別 look-ahead。）
async function showActionResult(events) {
  const { useCard, headline, lines, toastLine } = classifyResult(events);
  if (!lines.length) return;
  for (const ln of lines) logLine(iconFor(ln.key), ln.text, `${ln.key}·第${ln.season}季`);
  if (useCard) {
    await card({ ...(headline || { tag: "行動", title: "結果", emoji: "🎲" }), body: lines.map((l) => l.text).join("\n") });
  } else {
    toast(toastLine ?? lines[lines.length - 1].text, 2600);
  }
}

// 動作 → 演出 → re-render → 行動點用盡自動進季末
async function doAction(callFn) {
  if (busy) return;
  busy = true;
  try {
    closeSheet();
    const res = callFn();
    const entries = takeNewLog();
    if (!res.ok) {
      const t = entries.length ? textFor(entries[0]) : "現在不行。";
      toast(t || "現在不行。");
      return;
    }
    if (res.apSpent) game.actionsLeft -= 1; // 行動點由外層扣（同 Python main loop / MC runner）
    await showActionResult(entries);
    // 抽卡抽到要選目標的強卡 → 立刻選（即抽即用，不進手牌）
    if (res.needsTarget) {
      const v = visibleState(game);
      let target = null;
      if (res.needsTarget === "rival") {
        const rn = await pickRival(v, `🎴【${res.drawn.name}】甩給哪一家？`);
        target = { rivalName: rn };
      } else {
        const cid = await pickCase(v, `🎴【${res.drawn.name}】用在哪個案子？`);
        target = { caseId: cid };
      }
      const r2 = resolveDrawnCard(game, target || {});
      takeNewLog(); // r2.events 與 log 是同批物件，推進游標即可
      await showActionResult(r2.events || []);
    }
    render(visibleState(game));
    if (res.apSpent && game.actionsLeft <= 0 && endPhase) {
      toast("行動點用盡，進入季末結算");
      const r = endPhase; endPhase = null;
      setTimeout(r, 600);
    }
  } finally {
    busy = false;
    render(visibleState(game));
  }
}

// ---------- 各按鈕的 sheet 流程 ----------
async function uiBid() {
  const v = visibleState(game);
  const pm = v.staff.filter((s) => s.role === "PM").length;
  sheet(`<h3>📋 接案</h3><p class="sub">投標後才會揭曉流出的是哪種案型（隨機），擲骰定生死。</p>
    <div style="font-size:13.5px;color:var(--ink-soft);margin-bottom:10px">目前 ${pm} 個 PM 扛 ${v.cases.length} 案（上限 ${pm * CONFIG.max_cases_per_pm}）。案子越多、對手越多，標越難搶。</div>
    <button class="opt" id="goBid">投標<small>吃 1 行動點·流標倒賠一點投標成本</small></button>
    <button class="opt dismiss" id="noBid">再想想</button>`);
  document.getElementById("goBid").onclick = () => doAction(() => actionBid(game));
  document.getElementById("noBid").onclick = closeSheet;
}

async function uiMess() {
  const v = visibleState(game);
  if (!v.rivals.some((r) => r.alive)) return toast("對手都倒光了，沒人可搞。");
  const how = await pickSheet("🗡 搞同行", "選手段（都會記在帳上……PRD 對手會記仇）", [
    { html: `檢舉他違規<small>$60·重擊·罪孽+·餵你自己的稽核</small>`, value: "report", disabled: v.cash < 60 },
    { html: `放假消息<small>$40·中傷</small>`, value: "rumor", disabled: v.cash < 40 },
    { html: `挖角他的人<small>$165·削血兼搶人（職位隨機）</small>`, value: "poach", disabled: v.cash < 165 },
  ]);
  if (!how) return;
  const rn = await pickRival(v, "要搞哪一家？");
  if (!rn) return;
  doAction(() => actionMess(game, rn, how));
}

async function uiOps() {
  const v = visibleState(game);
  const act = await pickSheet("🛠 經營", "維運、話術與人事", [
    { html: `<img class="subic" src="${IMG.btn("talk")}">話術<small>榨錢/安撫（吃1點）</small>`, value: "talk" },
    { html: `<img class="subic" src="${IMG.btn("rescue")}">救火<small>$${CONFIG.rescue_cost}·降風險洗罪孽（吃1點）</small>`, value: "rescue" },
    { html: `<img class="subic" src="${IMG.btn("bonus")}">發獎金<small>$${CONFIG.morale_cost}·回補士氣（吃1點）</small>`, value: "morale" },
    { html: `<img class="subic" src="${IMG.btn("hire")}">招人<small>工程師/PM/業務（吃1點）</small>`, value: "hire" },
    { html: `<img class="subic" src="${IMG.btn("draw")}">抽強卡<small>$${CONFIG.draw_cost}·即抽即用（吃1點）</small>`, value: "draw" },
  ]); // 查核撥霧已併入「案子詳情」（點上方案子卡）
  if (!act) return;
  if (act === "talk") {
    if (!v.cases.length) return toast("沒有案子可動嘴。");
    const cid = await pickCase(v, "💬 對哪個案子動話術？");
    if (!cid) return;
    const c = v.cases.find((x) => x.id === cid);
    const kind = await pickSheet(`💬 《${c.name}》`, "派業務動嘴——哪種？", [
      { html: `榨錢 收變更費<small>${c.upsellCooldown ? "上季剛收過，甲方翻白眼中" : "賺錢，客戶耐心暗扣"}</small>`, value: "upsell", disabled: c.upsellCooldown },
      { html: `安撫 降客訴<small>滿意度回補，問題還在</small>`, value: "soothe" },
    ]);
    if (!kind) return;
    doAction(() => actionTalk(game, cid, kind));
  } else if (act === "rescue") {
    if (!v.cases.length) return toast("沒有案子可救。");
    const cid = await pickCase(v, `🧯 派特種隊救哪個案子？（$${CONFIG.rescue_cost}）`);
    if (cid) doAction(() => actionRescue(game, cid));
  } else if (act === "morale") {
    doAction(() => actionMorale(game));
  } else if (act === "hire") {
    const opts = [
      { html: `工程師<small>$120·救火主力</small>`, value: "工程師", disabled: v.cash < 120 },
      { html: `PM<small>$150·每人多扛2案、穩士氣</small>`, value: "PM", disabled: v.cash < 150 },
      { html: `業務<small>$100·搶標話術都靠他</small>`, value: "業務", disabled: v.cash < 100 },
    ];
    if (v.hireRescue) opts.push({ html: `前員工回鍋兼差<small>$35·能力低·救急保底</small>`, value: "回鍋", disabled: v.cash < 35 });
    const role = await pickSheet("🧑‍💼 招人", "薪水每季照付，養人吃現金", opts);
    if (role) doAction(() => actionHire(game, role));
  } else if (act === "draw") {
    doAction(() => actionDraw(game));
  }
}

// 案子詳情（含查核撥霧：讀數留檔在詳情裡，$40 免行動點）
function openCaseDetail(id) {
  const v = visibleState(game);
  caseDetail(v, id, {
    reconCost: CONFIG.recon_cost,
    reconDisabled: v.cash < CONFIG.recon_cost,
    onRecon: (cid) => {
      if (busy) return;
      const res = actionRecon(game, cid);
      const entries = takeNewLog();
      for (const e of entries) logLine(iconFor(e.key), textFor(e), `${e.key}·第${e.season}季`);
      if (!res.ok) { toast(entries.length ? textFor(entries[0]) : "現在不行。"); return; }
      render(visibleState(game));
      openCaseDetail(cid); // 原地刷新，讀數直接出現在詳情裡
      toast(`🕵️ 查核完成 -$${CONFIG.recon_cost}萬`, 2000);
    },
  });
}

async function uiHand() {
  const v = visibleState(game);
  if (!v.hand.length) return toast("手牌空。");
  if (v.cardsPlayed >= v.cardsPerSeason) return toast(`本季手牌已出滿 ${v.cardsPerSeason} 張了。`);
  const KIND_SUB = { blame: "甩鍋卡：拆彈但養稽核（賭）", junk: "士氣 +3，聊勝於無" };
  const idx = await pickSheet(
    `🃏 手牌 <span style="font-size:13px;color:var(--ink-soft)">${v.cardsPlayed}/${v.cardsPerSeason}·免行動點</span>`,
    "點一張打出",
    v.hand.map((c, i) => ({ html: `【${c.name}】<small>${KIND_SUB[c.kind] || ""}</small>`, value: i }))
  );
  if (idx === null) return;
  const c = v.hand[idx];
  if (c.kind === "blame") {
    if (!v.cases.length) return toast("沒有案子可甩鍋。");
    const cid = await pickCase(v, `🫱 【${c.name}】用在哪個案子？（冒煙時可先拆彈）`);
    if (cid === null) return;
    doAction(() => playCard(game, idx, { caseId: cid }));
  } else {
    doAction(() => playCard(game, idx));
  }
}

async function uiEndSeason() {
  if (busy || !endPhase) return;
  if (document.getElementById("scrim2").classList.contains("on")) return; // 有卡片開著時不動作
  const v = visibleState(game);
  if (v.actionsLeft > 0) {
    // 玩家主動的確認 → 底部 sheet（中央卡留給「世界對你說話」）
    const go = await pickSheet(
      "🌇 收工結算？",
      `還有 ${v.actionsLeft} 點行動點沒用——季末風險會長、帳單會來`,
      [
        { html: `收工，進季末結算<small>風險成長 → 收支 → 引爆/稽核/反撲</small>`, value: true },
        { html: `再拚一下<small>回到本季行動</small>`, value: false },
      ]
    );
    if (!go) return;
  }
  if (!endPhase) return; // 等確認期間可能已被自動結算搶走
  const r = endPhase; endPhase = null;
  r();
}

// ---------- 季循環 ----------
function dockDisabled(dis) {
  for (const id of ["d_bid", "d_mess", "d_ops", "d_hand", "d_end"]) $(id).disabled = dis;
}

function waitActionsPhase() {
  dockDisabled(false);
  return new Promise((r) => { endPhase = r; });
}

async function seasonLoop() {
  while (!game.gameOver && !game.wonEarly && game.season <= CONFIG.seasons_to_survive) {
    try {
      beginSeason(game);
      dockDisabled(true);
      render(visibleState(game));
      tick(`📰 <b>第 ${game.season} 季</b>開始，錢和人依然不夠用。`);
      await runFlowUI(seasonStartFlow(game));
      await waitActionsPhase();
      dockDisabled(true);
      await runFlowUI(seasonEndFlow(game));
      game.season += 1;
      render(visibleState(game));
    } catch (err) {
      // 防當網：流程炸掉不再無聲卡死——記錄、給玩家選擇
      recordErr(err?.stack || String(err));
      endPhase = null;
      logCursor = game.log.length; // 丟棄壞掉那段未演出的 log，避免重複觸雷
      const act = await card({
        tag: "💥 引擎打滑", title: "遊戲流程出錯了", emoji: "🐞",
        body: `錯誤已記進偵錯紀錄（戰報 → 🐞 匯出偵錯，可複製回報）。\n\n${String(err).slice(0, 300)}`,
        choices: [
          { label: "硬著頭皮繼續", sub: "跳到下一季（狀態可能有點歪）", value: "next" },
          { label: "重新整理", sub: "重開遊戲", value: "reload", dismiss: true },
        ],
      });
      if (act === "reload") { location.reload(); return; }
      game.season += 1;
      render(visibleState(game));
    }
  }
  await showEnding();
}

const END_ART = {
  "ending.survive": "end_survive", "ending.solo": "end_solo",
  "ending.lose_cash": "end_lose_cash", "ending.lose_morale": "end_lose_morale",
  "ending.lose_audit": "end_lose_audit",
};
const END_TITLE = {
  "ending.survive": "存活：你撐過了旗艦計畫", "ending.solo": "獨活：你熬死了所有對手",
  "ending.lose_cash": "現金斷鏈：公司倒閉", "ending.lose_morale": "團隊崩潰：公司解體",
  "ending.lose_audit": "監理清算：勒令解散",
};
async function showEnding() {
  dockDisabled(true);
  const key = endingKey(game);
  const text = narrate(narrator, game, key, {});
  const alive = game.rivals.filter((r) => r.alive).length;
  const good = key === "ending.survive" || key === "ending.solo";
  const again = await card({
    cls: good ? "good" : "", tag: good ? "🏁 通關" : "💀 GAME OVER",
    title: END_TITLE[key], evt: END_ART[key], key,
    body: `${text}\n\n最終現金 $${game.cash}萬｜存活 ${Math.min(game.season, CONFIG.seasons_to_survive)} 季｜對手還剩 ${alive} 家`,
    choices: [{ label: "再開一局", value: true }, { label: "看看焦土（戰報）", value: false, dismiss: true }],
  });
  if (again) location.reload();
}

// ---------- 開機：標題 → 開場故事 → 難度 → 開局 ----------
// 開場拆兩拍：故事卡（沉浸帶入）→ 難度卡（精簡選擇）。
// 故事卡接 intro 插圖，圖未到位時 card() 自動退回 emoji（見 ui.js）。
const INTRO_STORY =
`記者會上，部長把五塊得標壓克力獎牌一字排開。鎂光燈下，你笑得和另外四家一樣燦爛。
『五強聯手，打造國家級軟體艦隊。』——這句寫在講稿上。
沒寫進講稿的是：預算只有一份，龍頭卻有五家。
你是夾在中間的外包顧問老闆——接肥單、轉下包、賺價差、出事就甩鍋。
散場時，隔壁桌老闆向你舉杯。你也舉杯。你們都清楚，這杯敬的是彼此的葬禮。`;

const INTRO_RULES =
`活下去只有兩條路：熬到第 15 季旗艦計畫結束，或者——把其他四家全搞死，剩你獨活。
檢舉、放假消息、挖角、塞毒模組……你搞的每一手，帳都記著。`;

async function boot() {
  initChrome();
  $("startBtn").onclick = async () => {
    $("titleScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    // 第一拍：開場故事（大插圖，純帶入）
    await card({
      tag: "開場", title: "歡迎加入國家隊（笑）",
      evt: "intro", emoji: "🏛️🦊", body: INTRO_STORY,
      choices: [{ label: "⏵ 入場", value: "go" }],
    });
    // 第二拍：難度（精簡選擇）
    const mode = await card({
      tag: "旗艦計畫", title: "活下去的兩條路", evt: "difficulty", emoji: "⚔️🦊", body: INTRO_RULES,
      choices: [
        { label: "🏰 練習模式（DEV）", sub: "寬鬆·對手不記私仇·先摸熟系統", value: "DEV" },
        { label: "🏯 真實模式（PRD）", sub: "硬核·對手記仇反撲·贏在鋼索上", value: "PRD" },
      ],
    });
    startGame(mode || "DEV");
  };

  // 靜態元件事件
  $("logBtn").onclick = () => $("logdraw").classList.toggle("on");
  $("logClose").onclick = () => $("logdraw").classList.remove("on");
  $("dbgBtn").onclick = exportDebug;
  $("intelChip").onclick = () => intelPanel(visibleState(game));
  $("emp_eng").onclick = () => rosterSheet(visibleState(game), "工程師");
  $("emp_pm").onclick = () => rosterSheet(visibleState(game), "PM");
  $("emp_sales").onclick = () => rosterSheet(visibleState(game), "業務");
  $("rivalRow").addEventListener("click", (e) => {
    const el = e.target.closest(".rival");
    if (el) rivalPop({ stopPropagation() {}, currentTarget: el }, visibleState(game), +el.dataset.rival);
  });
  $("cscroll").addEventListener("click", (e) => {
    const el = e.target.closest(".ccard");
    if (el) openCaseDetail(+el.dataset.case);
  });
  $("d_bid").onclick = uiBid;
  $("d_mess").onclick = uiMess;
  $("d_ops").onclick = uiOps;
  $("d_hand").onclick = uiHand;
  $("d_end").onclick = uiEndSeason;
  $("scrim").onclick = (e) => { if (e.target === $("scrim")) closeSheet(); };
  dockDisabled(true);
}

function startGame(mode) {
  // ?seed=123 固定一局（重現 bug / 測試用）
  const seedParam = new URLSearchParams(location.search).get("seed");
  game = newGame(mode, makeRng(seedParam ? Number(seedParam) >>> 0 : undefined));
  narrator = makeNarrator();
  logCursor = 0;
  $("items").innerHTML = "";
  logLine("🎲", `本局種子 seed=${game.rng.seed}（${mode}）`, `網址加 ?seed=${game.rng.seed} 可重現這一局`);
  render(visibleState(game));
  seasonLoop();
}

boot();
