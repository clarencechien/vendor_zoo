// ============================================================
// ui.js — DOM 渲染 + UI 元件（card / sheet / log / toast / 渲染）
// 單向資料流：main.js 呼叫 engine 改 game → render(visibleState) 重畫。
// 迷霧鐵律：本檔只讀 visibleState()，隱藏數字進不來。
// ============================================================

import { RIVAL_LOGO_KEY, RIVAL_INTRO, ARCH } from "./config.js";

// ---- 資產路徑 ----
const A = "assets/";
export const IMG = {
  office: A + "backgrounds/office_bg.webp",
  title: A + "backgrounds/title_screen.webp",
  spr: (k) => A + `sprites/emp_${k}.webp`,
  rival: (k) => A + `rivals/rival_logo_${k}.webp`,
  caseIco: (k) => A + `cases/case_${k}.webp`,
  hud: (k) => A + `hud/hud_${k}.webp`,
  btn: (k) => A + `buttons/btn_${k}.webp`,
  evt: (k) => A + `events/${k}.webp`,
};
export const CASE_ICO = { "政府案": "gov", "銀行案": "bank", "S&P500案": "sp500", "小公司案": "small", "傳產案": "legacy" };
const ROLE_SPR = { "工程師": "eng_m", PM: "pm_f", "業務": "sales_m" };

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// ---- 靜態圖一次掛上 ----
export function initChrome() {
  $("i_season").src = IMG.hud("season");
  $("i_coin").src = IMG.hud("coin");
  $("i_audit").src = IMG.hud("audit");
  $("b_bid").src = IMG.btn("bid"); $("b_mess").src = IMG.btn("mess");
  $("b_ops").src = IMG.btn("ops"); $("b_hand").src = IMG.btn("hand"); $("b_end").src = IMG.btn("end");
  $("office").style.backgroundImage = `url(${IMG.office})`;
  // 標題圖走 CSS 變數：海報本體與寬螢幕的模糊底共用同一張
  $("titleScreen").style.setProperty("--titleimg", `url(${IMG.title})`);
}

// ---- 主渲染（讀 visibleState）----
export function render(v) {
  $("seasonTxt").textContent = `第 ${Math.min(v.season, v.seasonsToSurvive)}/${v.seasonsToSurvive} 季`;
  $("modeTag").textContent = v.mode === "PRD" ? "真實" : "";
  $("cashTxt").textContent = "$" + v.cash.toLocaleString("en-US");
  $("cashTxt").style.color = v.cash < 200 ? "var(--bad)" : "";
  $("apRow").innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<img src="${IMG.hud("ap")}" class="${i < v.actionsLeft ? "" : "off"}">`).join("");
  $("moraleRow").innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<img src="${IMG.hud("morale")}" class="${i < v.moraleHearts ? "" : "off"}">`).join("");
  $("auditTxt").textContent = "情報:" + v.auditWind;

  // 對手
  $("rivalRow").innerHTML = v.rivals.map((r, i) => {
    const logo = IMG.rival(RIVAL_LOGO_KEY[r.name] || "M");
    const body = r.alive
      ? `<div class="rb"><i style="width:${r.hpBar}%"></i></div>`
      : `<div class="rdead">☠ 已倒閉</div>`;
    return `<div class="rival${r.alive ? "" : " dead"}" data-rival="${i}"><div class="rtop"><img class="rlogo" src="${logo}"><span class="rn">${esc(r.name)}</span></div>${body}</div>`;
  }).join("");

  // 案子
  $("ccount").textContent = `(${v.cases.length})`;
  const L = { green: "lg", yellow: "ly", red: "lr" };
  $("cscroll").innerHTML = v.cases.length
    ? v.cases.map((c) => {
        const note = c.inherited ? "接盤" : c.subcontracted ? "下包" : "自做";
        return `<div class="ccard" data-case="${c.id}"><span class="clight ${L[c.light]}"></span><img src="${IMG.caseIco(CASE_ICO[c.atype])}"><div class="cnm">${esc(c.name)}${c.lockin ? "🔒" : ""}</div><div class="ctype">${esc(c.atype)}·${note}</div></div>`;
      }).join("")
    : `<div style="font-size:11px;color:var(--ink-soft);padding:8px 2px">（目前手上沒案子——去搶標吧）</div>`;

  // 員工立繪：預設坐姿（辦公室日常感、比例最穩）；士氣崩到谷底才 orz
  const pose = v.morale >= 25 ? "sit" : "orz";
  const cnt = { "工程師": 0, PM: 0, "業務": 0 };
  for (const s of v.staff) cnt[s.role] = (cnt[s.role] || 0) + 1;
  for (const [role, elId] of [["工程師", "emp_eng"], ["PM", "emp_pm"], ["業務", "emp_sales"]]) {
    const el = $(elId);
    el.querySelector(".badge").textContent = "×" + cnt[role];
    el.querySelector("img").src = IMG.spr(`${ROLE_SPR[role]}_${pose}`);
    el.classList.toggle("none", !cnt[role]);
  }
  $("d_hand").querySelector(".tx").textContent = `手牌 ${v.hand.length}`;
}

// ---- ticker / log / toast ----
export function tick(html) { $("tick").innerHTML = html; }
export function logLine(icon, text, detail) {
  const it = document.createElement("div");
  it.className = "logitem";
  it.innerHTML = `<b>${icon}</b> ${esc(text)}${detail ? ` <span class="d">${esc(detail)}</span>` : ""}`;
  $("items").prepend(it);
}
let toastTimer = null;
export function toast(text, ms = 1800) {
  const t = $("toast");
  t.textContent = text;
  t.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("on"), ms);
}

// ---- 未決 Promise 保險 ----
// 任何新 sheet/card 蓋掉舊的時，先把舊的以「取消(null)」結掉。
// 沒有這層，被蓋掉的 await 永遠不 resolve → busy 旗標卡死 → 全遊戲沒反應。
let sheetSettle = null; // 進行中的 pickSheet resolver
let cardSettle = null;  // 進行中的 card resolver
function settleSheet(val) { if (sheetSettle) { const s = sheetSettle; sheetSettle = null; s(val); } }
function settleCard(val) { if (cardSettle) { const s = cardSettle; cardSettle = null; s(val); } }

// ---- 事件卡（Promise 化：await 玩家點選）----
// spec: {cls, tag, evt|spr|emoji, title, key, body, choices:[{label, sub, value, disabled, dismiss}]}
export function card(spec) {
  settleCard(null); // 蓋掉前一張未決卡 → 視為取消
  return new Promise((resolve) => {
    cardSettle = resolve;
    const art = spec.evt
      ? `<img class="evtart" src="${IMG.evt(spec.evt)}">`
      : spec.spr
        ? `<img class="spr" src="${IMG.spr(spec.spr)}">`
        : `<span class="emoji">${spec.emoji || "🃏"}</span>`;
    const box = $("cardBox");
    box.className = "card " + (spec.cls || "");
    const choices = spec.choices?.length ? spec.choices : [{ label: "確認", dismiss: true, value: null }];
    box.innerHTML =
      `<div class="cart">${art}<span class="ctag">${esc(spec.tag || "")}</span></div>` +
      `<div class="cbody"><div class="kk">${esc(spec.key || "")}</div><h3>${esc(spec.title)}</h3>` +
      `<p>${esc(spec.body || "")}</p><div class="choices">` +
      choices.map((c, i) =>
        `<button class="opt ${c.dismiss ? "dismiss" : ""}" data-i="${i}" ${c.disabled ? "disabled" : ""}>${esc(c.label)}${c.sub ? `<small>${esc(c.sub)}</small>` : ""}</button>`
      ).join("") + `</div></div>`;
    $("scrim2").classList.add("on");
    const settle = (val) => {
      $("scrim2").classList.remove("on");
      if (cardSettle === resolve) cardSettle = null;
      resolve(val);
    };
    box.querySelectorAll(".opt").forEach((b) => {
      b.onclick = () => settle(choices[+b.dataset.i].value);
    });
    // 純告知卡（只有一個選項）點背景也能關，連點事件串更順；決策卡必須點選項
    $("scrim2").onclick = (e) => {
      if (e.target === $("scrim2") && choices.length === 1 && !choices[0].disabled) settle(choices[0].value);
    };
  });
}

// ---- bottom sheet ----
export function sheet(html) {
  settleSheet(null); // 蓋掉前一個未決選單 → 視為取消
  $("sheetBox").innerHTML = `<button class="x" id="sheetX">✕</button>` + html;
  $("scrim").classList.add("on");
  $("sheetX").onclick = closeSheet;
  $("scrim").onclick = (e) => { if (e.target === $("scrim")) closeSheet(); };
}
export function closeSheet() {
  settleSheet(null);
  $("scrim").classList.remove("on");
}

// sheet 形式的選擇器（Promise 化，回 null = 取消）
export function pickSheet(title, sub, options /* [{html, value, disabled}] */) {
  return new Promise((resolve) => {
    sheet(`<h3>${title}</h3><p class="sub">${sub || ""}</p><div class="optgrid" id="pickGrid">` +
      options.map((o, i) => `<button class="opt" data-i="${i}" ${o.disabled ? "disabled" : ""}>${o.html}</button>`).join("") +
      `</div>`);
    sheetSettle = resolve; // sheet() 已把上一個未決者以 null 結掉
    const done = (val) => {
      if (sheetSettle === resolve) sheetSettle = null;
      $("scrim").classList.remove("on");
      resolve(val);
    };
    document.querySelectorAll("#pickGrid .opt").forEach((b) => {
      b.onclick = () => done(options[+b.dataset.i].value);
    });
    $("sheetX").onclick = () => done(null);
    $("scrim").onclick = (e) => { if (e.target === $("scrim")) done(null); };
  });
}

// 案子選擇器（共用：話術/救火/查核/手牌目標）
export function pickCase(v, title, sub) {
  const L = { green: "🟢", yellow: "🟡", red: "🔴" };
  return pickSheet(title, sub || "點一個案子", v.cases.map((c) => ({
    html: `<img class="subic" src="${IMG.caseIco(CASE_ICO[c.atype])}">${L[c.light]} ${esc(c.name)}<small>${esc(c.atype)}·${esc(c.client)}</small>`,
    value: c.id,
  })));
}

// 對手選擇器
export function pickRival(v, title, sub) {
  return pickSheet(title, sub || "點一家對手", v.rivals.filter((r) => r.alive).map((r) => ({
    html: `<img class="subic" src="${IMG.rival(RIVAL_LOGO_KEY[r.name])}">${esc(r.name)}`,
    value: r.name,
  })));
}

// ---- 對手簡介泡泡 ----
export function rivalPop(ev, v, idx) {
  ev.stopPropagation();
  const r = v.rivals[idx];
  const p = $("pop");
  const hp = r.alive ? `戰力約 <em>${r.hpBar}%</em>（只見血條）` : `<em>已倒閉</em>`;
  p.innerHTML = `<h4 style="display:flex;align-items:center;gap:6px"><img src="${IMG.rival(RIVAL_LOGO_KEY[r.name])}" style="width:26px;height:26px">${esc(r.name)}</h4><div>${esc(RIVAL_INTRO[r.name] || "")}</div><div style="margin-top:6px;font-size:10px;color:var(--ink-soft)">${hp}</div>`;
  const c = ev.currentTarget.getBoundingClientRect();
  p.style.left = Math.min(c.left, innerWidth - 250) + "px";
  p.style.top = c.bottom + 6 + "px";
  p.classList.add("on");
}
document.addEventListener("click", (e) => {
  if (!e.target.closest(".rival") && !e.target.closest(".pop")) $("pop")?.classList.remove("on");
});

// ---- 案子詳情（查核撥霧併在這裡：讀數留檔顯示）----
export function caseDetail(v, id, opts = {}) {
  const c = v.cases.find((x) => x.id === id);
  if (!c) return;
  const L = { green: "🟢 穩定", yellow: "🟡 冒煙中", red: "🔴 快引爆" };
  const note = c.inherited ? "接盤（前朝毒案，風險漲得快）" : c.subcontracted ? "下包" : "自做";
  const reconLine = c.lastRecon
    ? `🕵️ 查核讀數（第${c.lastRecon.season}季）：引爆風險 ≈<b style="color:var(--bad)">${c.lastRecon.risk}</b>／滿意度 ≈<b style="color:var(--navy)">${c.lastRecon.sat}</b>${c.lastRecon.season < v.season ? "（舊資料，風險每季都在長）" : ""}`
    : `風險/滿意度：<b style="color:var(--ink-soft)">隱藏</b>（查核撥霧才看得到數字）`;
  sheet(`<h3><img src="${IMG.caseIco(CASE_ICO[c.atype])}" style="width:40px;height:40px;vertical-align:middle;image-rendering:pixelated"> ${esc(c.name)}</h3>
    <p class="sub">${esc(c.atype)} · ${esc(c.client)} · ${note}${c.lockin ? " · 🔒已綁死" : ""}</p>
    <div style="font-size:13px;line-height:1.9">狀態：<b>${L[c.light]}</b><br>
    案型脾氣：<b style="color:var(--navy)">${esc(ARCH[c.atype].note)}</b><br>
    ${reconLine}<br>
    可對它：救火降風險 / 話術榨錢或安撫 / 甩鍋卡拆彈</div>
    ${opts.onRecon ? `<button class="opt" id="reconBtn" style="margin-top:10px" ${opts.reconDisabled ? "disabled" : ""}>🕵️ ${c.lastRecon ? "再查核一次" : "查核撥霧"}<small>$${opts.reconCost}·免行動點·看真實數字（±10 誤差）</small></button>` : ""}`);
  if (opts.onRecon) {
    const b = document.getElementById("reconBtn");
    if (b) b.onclick = () => opts.onRecon(id);
  }
}

// ---- 情報面板 ----
export function intelPanel(v) {
  const smoky = v.cases.filter((c) => c.light !== "green").length;
  sheet(`<h3>情報面板</h3><p class="sub">只給感覺不給數字</p>
    <div style="font-size:13px;line-height:1.9">⚖️ 稽核風聲：<b style="color:var(--coral)">${esc(v.auditWind)}</b><br>
    📉 信譽：<b style="color:var(--navy)">${esc(v.repFeel)}</b>${v.repFeel === "尚可" ? "，甩鍋還唬得動" : "，甩鍋越來越難唬"}<br>
    🕳️ 有 <b style="color:var(--bad)">${smoky}</b> 張案子在冒煙，記得查核<br>
    🎴 本季已出牌 ${v.cardsPlayed}/${v.cardsPerSeason}</div>`);
}

// ---- 名冊 ----
const BG = ["#e9d3a0", "#f0d7b0", "#dfe6c8", "#e8d0c8", "#d6e2e6", "#efd9e0", "#e2dcc0"];
const HUES = [0, -18, 20, -32, 38, 12, -10, 28];
const BRI = [1, 0.94, 1.06, 0.9, 1.03];
const CAP = { "工程師": "每人可救火／扛技術債", PM: "每人可扛 2 個案子", "業務": "每人可搶標／話術" };
export function rosterSheet(v, role) {
  const list = v.staff.filter((s) => s.role === role);
  const rows = list.map((e, i) => {
    const k = i + (e.name ? e.name.charCodeAt(0) : 0);
    return `<div class="remp"><img src="${IMG.spr(ROLE_SPR[role] + "_stand")}" style="background:${BG[k % BG.length]};filter:hue-rotate(${HUES[k % HUES.length]}deg) saturate(1.08) brightness(${BRI[k % BRI.length]})"><div class="info"><div class="nm">${esc(e.name)}</div><div class="st">${"★".repeat(e.stat)}${"☆".repeat(5 - e.stat)}</div></div><div class="cap">能力 ${e.stat}</div></div>`;
  }).join("");
  sheet(`<h3>${role} <span style="font-size:12px;color:var(--ink-soft)">共 ${list.length} 人</span></h3>
    <div class="rhint">${CAP[role]}　·　點「經營→招人」可增員</div>
    <div class="roster">${rows || '<div style="font-size:12px;color:var(--ink-soft)">（一個都沒有……）</div>'}</div>`);
}
