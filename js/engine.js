// ============================================================
// engine.js — Vendor Zoo 乙方動物園 純遊戲邏輯
//
// 逐函式對照 reference/engine_python_v0.3.py 翻寫。零 DOM、零 console，
// 所有隨機走注入的 rng（js/rng.js），數值一律引用 js/config.js。
//
// 兩類 API：
//  1) 玩家動作 = 普通函式，參數一次帶齊，回傳 {ok, apSpent, events}
//     前置不符（沒錢/沒人/超載/冷卻）→ ok:false 且不扣行動點（同 Python 回 False）
//  2) 季初/季末 = generator（seasonStartFlow / seasonEndFlow），
//     跑到玩家決策點 yield {decision, ...}，用 gen.next(answer) 續跑。
//     Monte Carlo 用 runFlow(gen, decide) 同步驅動；UI 彈 modal 後續跑。
//
// 戰報：所有狀態變化 emit 結構化事件 {key, vars} 進 g.log（key 對齊
// Python 旁白 context_key；引擎專屬訊息用 sys.* 前綴），narration.js 負責變文字。
// ============================================================

import {
  CONFIG, DIFF, ARCH, ARCH_CLIENTS, ARCH_PROJECT, RIVAL_NAMES,
  NEWS_HURT, NEWS_FLAT, CARD_JUNK, CARD_PAID, CARD_BASIC,
  SURN, GIV, RULES,
} from "./config.js";

// ---------- 小工具 ----------
const D = (g, k) => DIFF[g.mode][k];
const A = (c) => ARCH[c.atype];
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
// Python int()：正數截斷 = floor（本引擎所有 int() 場合皆為正數）
const int = Math.floor;

export const staffOf = (g, role) => g.staff.filter((s) => s.role === role);
export const engineers = (g) => staffOf(g, "工程師");
export const salesOf = (g) => staffOf(g, "業務");
export const pmCount = (g) => staffOf(g, "PM").length;
export const load = (g) => g.cases.length / Math.max(1, pmCount(g));
export const liveRivals = (g) => g.rivals.filter((r) => r.alive);
export const caseLight = (c) =>
  c.risk >= RULES.light.red_at ? "red" : c.risk >= RULES.light.yellow_at ? "yellow" : "green";
export const findCase = (g, id) => g.cases.find((c) => c.id === id) || null;

function emit(g, key, vars = {}) {
  const e = { season: g.season, key, vars };
  g.log.push(e);
  return e;
}

// 擲骰：d20；d==20 必成、d==1 必敗（同 Python roll()）
export function roll(g, bonus, dc, label) {
  const d = g.rng.randint(1, 20);
  const tot = d + bonus;
  const ok = d === 20 || (d !== 1 && tot >= dc);
  emit(g, "sys.roll", { label, d, bonus, tot, dc, ok, crit: d === 20, fumble: d === 1 });
  return { ok, crit: d === 20, fumble: d === 1, d, tot, dc };
}

// ---------- 事件袋（抽牌不放回 + 冷卻；同 Python Bag）----------
// 全在冷卻中 → pop 最後一張且「不記冷卻」，袋空重洗——語意逐行對齊。
function makeBag(items, cooldown) {
  return { items: items.slice(), bag: [], cd: {}, cooldown };
}
function bagDraw(g, bag, keyOf) {
  if (!bag.bag.length) {
    bag.bag = bag.items.slice();
    g.rng.shuffle(bag.bag);
  }
  for (let i = 0; i < bag.bag.length; i++) {
    const key = keyOf(bag.bag[i]);
    if (g.season - (bag.cd[key] ?? -99) >= bag.cooldown) {
      bag.cd[key] = g.season;
      return bag.bag.splice(i, 1)[0];
    }
  }
  return bag.bag.pop();
}

// ---------- 建局 ----------
function mkStaff(g, role) {
  const lo = role === "業務" ? RULES.init.stat_lo_sales : RULES.init.stat_lo_other;
  return {
    role,
    name: g.rng.choice(SURN) + g.rng.choice(GIV),
    stat: g.rng.randint(lo, RULES.init.stat_hi),
    quality: g.rng.randint(...RULES.init.quality),
  };
}

function mkCase(g, atype, subcontracted, sat, risk, inherited = false) {
  g.caseSeq += 1;
  return {
    id: g.caseSeq, atype,
    name: g.rng.choice(ARCH_PROJECT[atype]),
    client: g.rng.choice(ARCH_CLIENTS[atype]),
    subcontracted, sat, risk,
    rebound: 0, lastUpsell: -9, inherited, lockin: false,
  };
}

export function newGame(mode, rng) {
  const g = {
    mode, rng,
    season: 1,
    cash: CONFIG.start_cash,
    reputation: RULES.init.reputation,
    sin: RULES.init.sin,
    morale: CONFIG.morale_start,
    staff: [], cases: [], hand: [],
    moraleHist: [], deathCause: null,
    actionsLeft: CONFIG.actions_per_season,
    auditIn: rng.randint(...CONFIG.audit_interval),
    frontroomUsed: {}, gameOver: false, result: null, wonEarly: false,
    cardsPlayed: 0, caseSeq: 0, log: [],
    eventBag: makeBag(EVENT_ORDER, CONFIG.event_cooldown),
    newsBag: makeBag(
      [...NEWS_HURT.map((t) => ({ k: "H", t })), ...NEWS_FLAT.map((t) => ({ k: "F", t }))],
      RULES.seasonStart.news_cooldown
    ),
    rivals: [],
    _auditFine: 0, // 本季稽核罰款（決策A：稽核死 cosmetic 判定用）
  };
  g.rivals = RIVAL_NAMES.slice(0, 4).map((n) => ({
    name: n,
    hp: int(rng.randint(...CONFIG.rival_hp_start) * D(g, "rival_hp")),
    alive: true,
    hate: RULES.init.rival_hate_start,
    messedThisSeason: false,
  }));
  // 開局陣容：業務1 / PM2 / 工程師2（同 Python _setup 順序）
  for (const [role, n] of RULES.init.staff) {
    for (let i = 0; i < n; i++) g.staff.push(mkStaff(g, role));
  }
  // 繼承 2~3 案，其一藏雷
  const nCases = rng.randint(...RULES.init.cases_n);
  for (let i = 0; i < nCases; i++) {
    const atype = rng.choice(Object.keys(ARCH));
    const risk = i === 0
      ? rng.randint(...RULES.init.first_case_risk)
      : rng.randint(...RULES.init.other_case_risk);
    g.cases.push(mkCase(g, atype, true, rng.randint(...RULES.init.case_sat), risk));
  }
  g.hand = CARD_BASIC.map(([name, kind]) => ({ name, kind }));
  return g;
}

// ---------- 迷霧視圖（UI 只准讀這個；risk/sat/sin/hate/auditIn 數字不外流）----------
export function visibleState(g) {
  const auditWind =
    g.auditIn <= 0 ? "本季稽核" : g.auditIn <= 1 ? "逼近" : g.auditIn <= 3 ? "隱約" : "無";
  return {
    mode: g.mode, season: g.season, seasonsToSurvive: CONFIG.seasons_to_survive,
    cash: g.cash, actionsLeft: g.actionsLeft,
    morale: g.morale,
    moraleHearts: clamp(Math.round(g.morale / RULES.moraleBar.per_heart), 0, RULES.moraleBar.hearts),
    auditWind,
    staff: g.staff.map((s) => ({ role: s.role, name: s.name, stat: s.stat })),
    cases: g.cases.map((c) => ({
      id: c.id, atype: c.atype, name: c.name, client: c.client,
      light: caseLight(c), note: ARCH[c.atype].note,
      subcontracted: c.subcontracted, inherited: c.inherited, lockin: c.lockin,
    })),
    rivals: g.rivals.map((r) => ({
      name: r.name, alive: r.alive, hpBar: clamp(r.hp, 0, 100), // 絕對刻度 0-100，同 Python bar()
    })),
    hand: g.hand.map((c) => ({ name: c.name, kind: c.kind })),
    cardsPlayed: g.cardsPlayed, cardsPerSeason: CONFIG.cards_per_season,
    gameOver: g.gameOver, wonEarly: g.wonEarly, result: g.result, deathCause: g.deathCause,
  };
}

// ---------- 動作共用回傳 ----------
const fail = (g, key, vars) => ({ ok: false, apSpent: false, events: [emit(g, key, vars)] });

// ---------- 1 搶標 ----------
export function actionBid(g) {
  if (!salesOf(g).length) return fail(g, "sys.bid_no_sales");
  if (g.cases.length >= pmCount(g) * CONFIG.max_cases_per_pm)
    return fail(g, "sys.bid_overload", { pm: pmCount(g), cases: g.cases.length });
  const atype = g.rng.choice(Object.keys(ARCH));
  const bonus = Math.max(...salesOf(g).map((s) => s.stat)) + CONFIG.bid_buzzword;
  const scaleDc = int(g.cases.length / 2); // 規模越大越難再接
  const dc = CONFIG.bid_dc_base + int(load(g)) * CONFIG.bid_dc_per_load +
    Math.max(0, liveRivals(g).length - 1) * CONFIG.bid_dc_per_rival + scaleDc;
  emit(g, "sys.bid_type", { atype, note: ARCH[atype].note });
  const r = roll(g, bonus, dc, "搶標");
  const events = [];
  if (r.ok) {
    let up = int(g.rng.randint(...RULES.bid.upfront) * D(g, "bid_income"));
    if (r.crit) up = int(up * RULES.bid.crit_mult);
    g.cash += up;
    g.cases.push(mkCase(g, atype, true,
      g.rng.randint(...RULES.bid.new_case_sat), g.rng.randint(...RULES.bid.new_case_risk)));
    events.push(emit(g, "sys.bid_win", { atype, amount: up }));
  } else {
    const cost = g.rng.randint(...RULES.bid.fail_cost);
    g.cash -= cost;
    events.push(emit(g, "sys.bid_fail", { atype, amount: cost }));
  }
  return { ok: true, apSpent: true, events, roll: r };
}

// ---------- 2 話術（榨錢/安撫）----------
export function actionTalk(g, caseId, kind /* 'upsell' | 'soothe' */) {
  if (!salesOf(g).length) return fail(g, "sys.talk_no_sales");
  const c = findCase(g, caseId);
  if (!c) return fail(g, "sys.no_case");
  const bonus = Math.max(...salesOf(g).map((s) => s.stat));
  if (kind === "upsell") {
    if (g.season - c.lastUpsell < CONFIG.upsell_cooldown)
      return fail(g, "sys.upsell_cooldown", { case: c.name });
    const r = roll(g, bonus, RULES.talk.upsell_dc, `話術榨錢・${c.atype}`);
    // 注意：冷卻與滿意度在擲骰「後、判定前」就套用 → 失敗一樣扣（同 Python）
    c.lastUpsell = g.season;
    c.sat -= A(c).upsell_sat;
    const events = [];
    if (r.ok) {
      let gain = int(g.rng.randint(...CONFIG.upsell_base) * A(c).upsell_mult);
      if (r.crit) gain = int(gain * RULES.talk.upsell_crit_mult);
      g.cash += gain;
      const key = A(c).upsell_mult < 0.5 ? "action.upsell_stiff" : "action.upsell_win";
      events.push(emit(g, key, { case: c.name, ctype: c.atype, amount: gain }));
    } else {
      events.push(emit(g, "action.upsell_fail", { ctype: c.atype }));
    }
    return { ok: true, apSpent: true, events, roll: r };
  }
  // 安撫
  const r = roll(g, bonus, CONFIG.soothe_dc, "話術安撫");
  const events = [];
  if (r.ok) {
    c.sat = Math.min(100, c.sat + CONFIG.soothe_sat_gain);
    events.push(emit(g, "sys.soothe_win", { case: c.name }));
  } else {
    events.push(emit(g, "sys.soothe_fail", { case: c.name }));
  }
  return { ok: true, apSpent: true, events, roll: r };
}

// ---------- 3 救火 ----------
export function actionRescue(g, caseId) {
  if (!engineers(g).length) return fail(g, "sys.rescue_no_eng");
  if (g.cash < CONFIG.rescue_cost) return fail(g, "sys.no_cash");
  const c = findCase(g, caseId);
  if (!c) return fail(g, "sys.no_case");
  g.cash -= CONFIG.rescue_cost; // 費用擲骰前先扣（同 Python）
  const bonus = Math.max(...engineers(g).map((e) => e.stat));
  const r = roll(g, bonus, CONFIG.rescue_dc, "工程師救火");
  let cut = g.rng.randint(...CONFIG.rescue_risk_cut);
  cut = r.crit ? int(cut * RULES.rescue.crit_mult) : r.ok ? cut : int(cut / RULES.rescue.fail_divisor);
  c.risk = Math.max(0, c.risk - cut);
  g.sin = Math.max(0, g.sin - CONFIG.rescue_sin_cut);
  g.morale -= RULES.rescue.morale_cost; // 無下限，死活只在季末判（同 Python）
  return { ok: true, apSpent: true, events: [emit(g, "action.rescue", { case: c.name, cut })], roll: r };
}

// ---------- 4 搞同行 ----------
export function actionMess(g, rivalName, how /* 'report' | 'rumor' | 'poach' */) {
  if (!liveRivals(g).length) return fail(g, "sys.no_rival");
  const r = g.rivals.find((x) => x.name === rivalName && x.alive);
  if (!r) return fail(g, "sys.no_rival");
  const rule = RULES.mess[how];
  if (!rule) return fail(g, "sys.bad_input");
  if (g.cash < rule.cost) return fail(g, "sys.no_cash");
  g.cash -= rule.cost;
  const events = [];
  if (how === "report") {
    const dmg = g.rng.randint(...CONFIG.mess_report_dmg);
    r.hp -= dmg;
    g.sin += rule.sin;
    g.morale = Math.min(100, g.morale + CONFIG.morale_mess);
    r.hate += int(rule.hate * D(g, "grudge"));
    r.messedThisSeason = true;
    events.push(emit(g, "action.mess_report", { rival: r.name, dmg }));
  } else if (how === "rumor") {
    const dmg = g.rng.randint(...CONFIG.mess_rumor_dmg);
    r.hp -= dmg;
    g.morale = Math.min(100, g.morale + CONFIG.morale_mess);
    r.hate += int(rule.hate * D(g, "grudge"));
    r.messedThisSeason = true;
    events.push(emit(g, "action.mess_rumor", { rival: r.name, dmg }));
  } else {
    const dmg = g.rng.randint(...CONFIG.mess_poach_dmg);
    r.hp -= dmg;
    r.hate += int(rule.hate * D(g, "grudge"));
    r.messedThisSeason = true;
    const role = g.rng.choice(["工程師", "PM", "業務"]); // 挖角職位隨機（同 Python）
    const s = mkStaff(g, role);
    g.staff.push(s);
    g.morale = Math.min(100, g.morale + CONFIG.morale_mess);
    events.push(emit(g, "action.mess_poach", { rival: r.name, eng: s.name, stat: s.stat, dmg, role }));
  }
  if (r.hp <= 0) events.push(emit(g, "sys.rival_tottering", { rival: r.name }));
  return { ok: true, apSpent: true, events };
}

// ---------- 5 付費抽強卡 ----------
// 回傳 needsTarget（'rival'|'case'|null）；有目標需求時卡存 g.pendingDraw，
// UI/bot 再呼叫 resolveDrawnCard(g, target)。無目標需求立即結算。
export function actionDraw(g) {
  if (g.cash < CONFIG.draw_cost) return fail(g, "sys.no_cash");
  g.cash -= CONFIG.draw_cost;
  const [name, kind] = g.rng.choice(CARD_PAID);
  const d = g.rng.randint(1, 20);
  const events = [emit(g, "sys.draw", { name, d })];
  if (d === 1) {
    g.reputation -= RULES.draw.fumble_rep;
    events.push(emit(g, "sys.draw_fumble", {}));
    return { ok: true, apSpent: true, events, drawn: null, needsTarget: null };
  }
  const card = { name, kind };
  const needsTarget =
    kind === "attack_rival" ? "rival" : kind === "lockin" || kind === "blame" ? "case" : null;
  if (!needsTarget) {
    events.push(...resolveCard(g, card, {}));
    return { ok: true, apSpent: true, events, drawn: card, needsTarget: null };
  }
  g.pendingDraw = card;
  return { ok: true, apSpent: true, events, drawn: card, needsTarget };
}

export function resolveDrawnCard(g, target /* {rivalName?, caseId?} */) {
  const card = g.pendingDraw;
  if (!card) return { ok: false, apSpent: false, events: [] };
  g.pendingDraw = null;
  return { ok: true, apSpent: false, events: resolveCard(g, card, target || {}) };
}

// ---------- 6 發獎金 ----------
export function actionMorale(g) {
  if (g.cash < CONFIG.morale_cost) return fail(g, "sys.no_cash");
  g.cash -= CONFIG.morale_cost;
  const gain = Math.max(
    RULES.morale.gain_min,
    int(CONFIG.morale_gain * (1 - g.morale / RULES.morale.gain_curve_div))
  );
  g.morale = Math.min(100, g.morale + gain);
  return { ok: true, apSpent: true, events: [emit(g, "action.morale", { amount: CONFIG.morale_cost, gain })] };
}

// ---------- 7 招人 ----------
export function actionHire(g, role /* '工程師'|'PM'|'業務'|'回鍋' */) {
  const rescueHire = !salesOf(g).length && g.cash < RULES.hire.rescue_hire_cash_below;
  if (role === "回鍋") {
    if (!rescueHire) return fail(g, "sys.bad_input");
    if (g.cash < RULES.hire.rescue_hire_cost) return fail(g, "sys.no_cash");
    g.cash -= RULES.hire.rescue_hire_cost;
    const s = mkStaff(g, "業務");
    s.stat = g.rng.randint(...RULES.hire.rescue_hire_stat);
    g.staff.push(s);
    return { ok: true, apSpent: true, events: [emit(g, "sys.hire_rescue", { name: s.name, stat: s.stat })] };
  }
  const cost = RULES.hire.cost[role];
  if (!cost) return fail(g, "sys.bad_input");
  if (g.cash < cost) return fail(g, "sys.no_cash");
  g.cash -= cost;
  const s = mkStaff(g, role);
  g.staff.push(s);
  return { ok: true, apSpent: true, events: [emit(g, "sys.hire", { name: s.name, role, stat: s.stat, cost })] };
}

// ---------- p 打手牌（免行動點，每季上限 3）----------
export function playCard(g, handIdx, target /* {rivalName?, caseId?} */) {
  if (g.cardsPlayed >= CONFIG.cards_per_season) return fail(g, "sys.cards_maxed");
  if (!g.hand.length) return fail(g, "sys.hand_empty");
  if (handIdx < 0 || handIdx >= g.hand.length) return fail(g, "sys.bad_input");
  const card = g.hand.splice(handIdx, 1)[0];
  const events = resolveCard(g, card, target || {});
  g.cardsPlayed += 1;
  return { ok: true, apSpent: false, events };
}

// ---------- r 查核撥霧（免行動點、$40）----------
export function actionRecon(g, caseId) {
  if (g.cash < CONFIG.recon_cost) return fail(g, "sys.no_cash");
  const c = findCase(g, caseId);
  if (!c) return fail(g, "sys.no_case");
  g.cash -= CONFIG.recon_cost;
  const nr = clamp(c.risk + g.rng.randint(-RULES.recon.noise, RULES.recon.noise), 0, 100);
  const ns = clamp(c.sat + g.rng.randint(-RULES.recon.noise, RULES.recon.noise), 0, 100);
  return {
    ok: true, apSpent: false,
    events: [emit(g, "sys.recon", { case: c.name, risk: nr, sat: ns })],
    reading: { risk: nr, sat: ns },
  };
}

// ---------- 卡片結算（同 Python resolve_card）----------
function resolveCard(g, card, target) {
  const events = [];
  const maxRiskCase = () =>
    g.cases.length ? g.cases.reduce((a, b) => (b.risk > a.risk ? b : a)) : null;
  switch (card.kind) {
    case "junk": {
      g.morale = Math.min(100, g.morale + RULES.card.junk_morale);
      events.push(emit(g, "sys.card_junk", { name: card.name }));
      break;
    }
    case "cash": {
      const c = maxRiskCase();
      if (!c) { events.push(emit(g, "sys.card_wasted", { name: card.name })); break; }
      const gain = g.rng.randint(...RULES.card.cash.gain);
      g.cash += gain;
      g.sin += RULES.card.cash.sin;
      c.risk = Math.max(0, c.risk - RULES.card.cash.risk_cut);
      events.push(emit(g, "card.disaster_cash", { case: c.name, amount: gain }));
      break;
    }
    case "attack_rival": {
      let r = target.rivalName
        ? g.rivals.find((x) => x.name === target.rivalName && x.alive)
        : null;
      if (!r) r = liveRivals(g)[0] || null; // 同 Python：沒選到就 fallback 第一家
      if (!r) { events.push(emit(g, "sys.card_wasted", { name: card.name })); break; }
      const dmg = g.rng.randint(...CONFIG.card_poison_dmg);
      r.hp -= dmg;
      g.sin += RULES.card.poison.sin; // 注意：不加仇恨（以 Python 程式碼為準）
      const c = maxRiskCase();
      if (c) c.risk = 0;
      events.push(emit(g, "card.poison", { rival: r.name, dmg }));
      if (r.hp <= 0) events.push(emit(g, "sys.rival_tottering", { rival: r.name }));
      break;
    }
    case "lockin": {
      let c = target.caseId ? findCase(g, target.caseId) : null;
      if (!c && g.cases.length) c = g.cases[0];
      if (c) {
        c.sat = Math.max(0, c.sat - RULES.card.lockin.sat_cost);
        c.lockin = true;
        events.push(emit(g, "card.lockin", { case: c.name }));
      }
      break;
    }
    case "launder": {
      const c = maxRiskCase();
      if (card.name.includes("重構") && c) {
        c.risk = Math.max(0, c.risk - RULES.card.refactor.risk_cut);
        g.sin = Math.max(0, g.sin - RULES.card.refactor.sin_cut);
        g.cash -= RULES.card.refactor.cost;
        events.push(emit(g, "card.refactor", { case: c.name }));
      } else {
        g.sin = Math.max(0, g.sin - RULES.card.pr.sin_cut);
        g.reputation = Math.min(100, g.reputation + RULES.card.pr.rep_gain);
        g.cash -= RULES.card.pr.cost;
        events.push(emit(g, "card.pr", {}));
      }
      break;
    }
    case "blame": {
      let c = target.caseId ? findCase(g, target.caseId) : null;
      if (!c && g.cases.length) c = g.cases[0];
      if (c) events.push(...doBlame(g, c, card.name));
      break;
    }
  }
  return events;
}

// ---------- 甩鍋（真兩難；同 Python do_blame）----------
function doBlame(g, c, method) {
  const events = [];
  const bonus = salesOf(g).length ? Math.max(...salesOf(g).map((s) => s.stat)) : 0;
  let dc = RULES.blame.dc_base + A(c).blame_dc;
  if (method.includes("前朝")) {
    if (g.frontroomUsed[c.id]) {
      events.push(emit(g, "sys.frontroom_spent", { case: c.name }));
      return events; // 不擲骰直接失效（卡已消耗），同 Python
    }
    g.frontroomUsed[c.id] = true;
    dc += Math.max(0, int((RULES.blame.frontroom_dc[0] - g.reputation) / RULES.blame.frontroom_dc[1]));
  } else if (method.includes("簽核") || method.includes("甲方")) {
    dc += Math.max(0, int((RULES.blame.signed_dc[0] - c.sat) / RULES.blame.signed_dc[1]));
  } else if (method.includes("不可抗力")) {
    dc += Math.max(0, int((RULES.blame.force_majeure_dc[0] - g.reputation) / RULES.blame.force_majeure_dc[1]));
  }
  const r = roll(g, bonus, dc, `甩鍋・${method}・${c.atype}`);
  if (r.ok) {
    // 成功 = 不賠錢，但罪孽大增（延遲帳單，餵稽核）
    c.risk = Math.max(0, c.risk - CONFIG.blame_risk_cut);
    c.sat -= RULES.blame.win.sat_cost;
    g.sin += int(CONFIG.blame_sin_base * A(c).audit_w * RULES.blame.win.sin_mult);
    events.push(emit(g, "blame.win", { case: c.name, ctype: c.atype, method }));
  } else {
    // 失敗 = 立刻賠一筆（比硬扛還多），雙殺 + 少量罪孽
    const pen = int(g.rng.randint(...RULES.blame.fail.penalty) * D(g, "penalty") * A(c).explode_mult);
    g.cash -= pen;
    g.reputation -= RULES.blame.fail.rep;
    c.sat -= RULES.blame.fail.sat;
    g.sin += int(CONFIG.blame_sin_base * A(c).audit_w * RULES.blame.fail.sin_mult);
    events.push(emit(g, "blame.fail", { case: c.name, ctype: c.atype }));
    events.push(emit(g, "blame.sue", { amount: pen }));
  }
  return events;
}

// ============================================================
// 季初流程（generator；勒索軟體會 yield 決策）
// ============================================================
const EVENT_ORDER = [
  "stroke", "delrepo", "sales_flee", "ransom", "client_bankrupt",
  "cloud", "leftpad", "vip", "poached", "media", "windfall",
];
const EVENT_TITLES = {
  stroke: "工程師中風", delrepo: "刪庫跑路", sales_flee: "業務捲款", ransom: "勒索軟體",
  client_bankrupt: "甲方倒閉", cloud: "雲端當機", leftpad: "套件刪庫", vip: "長官視察",
  poached: "王牌被挖角", media: "媒體爆料", windfall: "天上掉錢",
};

const randCase = (g) => (g.cases.length ? g.rng.choice(g.cases) : null);

function* fireEvent(g) {
  const key = bagDraw(g, g.eventBag, (k) => k);
  emit(g, "sys.event_fired", { key, title: EVENT_TITLES[key] });
  const R = RULES.events;
  switch (key) {
    case "stroke": {
      if (engineers(g).length) {
        const v = g.rng.choice(engineers(g));
        g.staff.splice(g.staff.indexOf(v), 1);
        emit(g, "event.stroke", { eng: v.name });
      } else emit(g, "sys.event_dud", { key });
      break;
    }
    case "delrepo": {
      const c = randCase(g);
      if (c) {
        c.risk = Math.min(100, c.risk + R.delrepo.risk);
        g.morale -= R.delrepo.morale;
        emit(g, "event.delrepo", { case: c.name });
      } else emit(g, "sys.event_dud", { key });
      break;
    }
    case "sales_flee": {
      if (salesOf(g).length) {
        const v = g.rng.choice(salesOf(g));
        g.staff.splice(g.staff.indexOf(v), 1);
        const s = g.rng.randint(...R.sales_flee.cash);
        g.cash -= s;
        emit(g, "event.sales_flee", { sales: v.name, amount: s });
      } else emit(g, "sys.event_dud", { key });
      break;
    }
    case "ransom": {
      const amt = g.rng.randint(...R.ransom.amount);
      emit(g, "event.ransom", { amount: amt });
      const pay = yield { decision: "ransom", amount: amt };
      if (pay) {
        g.cash -= amt;
        emit(g, "sys.ransom_paid", { amount: amt });
      } else {
        const c = randCase(g);
        if (c) c.risk = Math.min(100, c.risk + R.ransom.refuse_risk);
        emit(g, "sys.ransom_refused", { case: c ? c.name : null });
      }
      break;
    }
    case "client_bankrupt": {
      const c = randCase(g);
      if (c) {
        emit(g, "event.client_bankrupt", { case: c.name });
        g.cases.splice(g.cases.indexOf(c), 1);
      } else emit(g, "sys.event_dud", { key });
      break;
    }
    case "cloud": {
      for (const c of g.cases) c.risk = Math.min(100, c.risk + R.cloud.risk_all);
      emit(g, "event.cloud", {});
      break;
    }
    case "leftpad": {
      const c = randCase(g);
      if (c) {
        c.risk = Math.min(100, c.risk + R.leftpad.risk);
        emit(g, "event.leftpad", { case: c.name });
      }
      break;
    }
    case "vip": {
      const c = randCase(g);
      if (!c) { emit(g, "sys.event_dud", { key }); break; }
      if (c.risk > R.vip.crash_risk_above) {
        g.reputation -= R.vip.crash_rep;
        emit(g, "event.vip_crash", { case: c.name });
      } else {
        g.reputation += R.vip.ok_rep;
        emit(g, "event.vip_ok", { case: c.name });
      }
      break;
    }
    case "poached": {
      if (engineers(g).length) {
        const v = engineers(g).reduce((a, b) => (b.stat > a.stat ? b : a));
        g.staff.splice(g.staff.indexOf(v), 1);
        emit(g, "event.poached", { eng: v.name, stat: v.stat });
      } else emit(g, "sys.event_dud", { key });
      break;
    }
    case "media": {
      if (g.sin > R.media.exposed_sin_above) {
        g.reputation -= R.media.rep;
        emit(g, "event.media_exposed", {});
      } else emit(g, "event.media_clean", {});
      break;
    }
    case "windfall": {
      const b = g.rng.randint(...R.luck.cash);
      g.cash += b;
      emit(g, "event.windfall", { amount: b });
      break;
    }
  }
}

export function* seasonStartFlow(g) {
  // 業界快訊（H 類真削血）
  const news = bagDraw(g, g.newsBag, (it) => it.k);
  const live = liveRivals(g);
  if (news.k === "H" && live.length) {
    const target = g.rng.choice(live);
    const dmg = g.rng.randint(...RULES.seasonStart.news_hurt_dmg);
    target.hp -= dmg;
    g.morale = Math.min(100, g.morale + CONFIG.morale_rival_hurt);
    emit(g, "news.rival_hurt", { rival: target.name, text: news.t.replace("{r}", target.name), dmg });
  } else {
    emit(g, "news.industry", { text: news.t });
  }
  // 對手自然消長（無上限，可回超過初始值——同 Python）
  for (const r of live) r.hp += g.rng.randint(...CONFIG.rival_ambient_dmg);
  // 意外事件
  const ch = CONFIG.event_chance + (g.morale < CONFIG.morale_disaster_at ? RULES.seasonStart.event_chance_desperate : 0);
  let fired = 0;
  if (g.rng.random() < ch) {
    yield* fireEvent(g); fired++;
    if (g.rng.random() < CONFIG.event_double) { yield* fireEvent(g); fired++; }
  }
  if (fired === 0) emit(g, "sys.calm", {});
}

// ============================================================
// 季末流程（generator；引爆處置、接盤 yield 決策）
// 順序嚴格照 Python end_season。
// ============================================================
function rivalRetaliation(g) {
  const alive = liveRivals(g);
  const n = alive.length;
  if (!n) return;
  for (const r of alive) {
    const floor = RULES.retaliation.hate_floor[0] + (4 - n) * RULES.retaliation.hate_floor[1];
    r.hate = Math.max(r.hate, floor);
    if (!r.messedThisSeason) r.hate = Math.max(0, r.hate - RULES.retaliation.hate_decay);
    r.messedThisSeason = false;
    const eff = r.hate * D(g, "retal");
    if (g.rng.randint(1, 100) <= eff) doRetaliate(g, r);
  }
}

function doRetaliate(g, r) {
  const R = RULES.retaliation;
  const h = r.hate;
  if (h < R.tier1_below) {
    g.reputation -= g.rng.randint(...R.tier1_rep);
    emit(g, "sys.retal_rumor", { rival: r.name });
  } else if (h < R.tier2_below) {
    g.sin += g.rng.randint(...R.tier2_sin);
    emit(g, "sys.retal_report", { rival: r.name });
  } else {
    if (engineers(g).length && g.rng.random() < R.tier3_poach_chance) {
      const v = g.rng.choice(engineers(g));
      g.staff.splice(g.staff.indexOf(v), 1);
      emit(g, "sys.retal_poach", { rival: r.name, eng: v.name });
    } else {
      const smoky = g.cases.filter((c) => c.risk >= R.tier3_smoky_risk);
      if (smoky.length) {
        const c = g.rng.choice(smoky);
        g.cases.splice(g.cases.indexOf(c), 1);
        emit(g, "sys.retal_steal_case", { rival: r.name, case: c.name });
      } else {
        g.reputation -= g.rng.randint(...R.tier3_rep);
        emit(g, "sys.retal_smear", { rival: r.name });
      }
    }
  }
}

function audit(g) {
  const R = RULES.audit;
  emit(g, "sys.audit_start", {});
  if (g.sin < CONFIG.audit_sin_soft) {
    emit(g, "audit.clean", {});
    g.sin = Math.max(0, g.sin - R.clean_sin_wash);
    return;
  }
  const d = g.rng.randint(1, 20);
  const thr = R.dodge_thr[0] + int((g.sin - CONFIG.audit_sin_soft) / R.dodge_thr[1]);
  emit(g, "sys.audit_roll", { d, thr });
  if (d >= thr) {
    emit(g, "audit.dodged", {});
    g.sin = Math.max(0, g.sin - R.dodge_sin_wash);
  } else {
    const p = int(
      (g.rng.randint(...CONFIG.audit_penalty) + (g.sin - CONFIG.audit_sin_soft) * R.fined.sin_x3) *
        D(g, "audit")
    );
    g.cash -= p;
    g._auditFine += p;
    g.reputation -= R.fined.rep;
    g.sin = Math.max(0, g.sin - R.fined.sin_wash);
    emit(g, "audit.fined", { amount: p });
  }
}

function checkEnd(g) {
  if (g.cash < 0 && !g.gameOver) {
    g.gameOver = true;
    // 決策A（cosmetic）：稽核罰款是壓垮現金的最後一根稻草 → 稽核死結局
    const auditDeath = g._auditFine > 0 && g.cash + g._auditFine >= 0;
    g.deathCause = auditDeath ? "稽核" : "現金";
    g.result = auditDeath
      ? "監理機關重罰清算，公司被勒令解散。"
      : "現金斷鏈，發不出薪水，公司倒閉。";
  }
  if (g.morale <= 0 && !g.gameOver) {
    g.gameOver = true;
    g.deathCause = "士氣";
    g.result = "團隊集體崩潰、無人可用，公司解體。";
  }
}

export function* seasonEndFlow(g) {
  const c = CONFIG;
  g._auditFine = 0;
  emit(g, "sys.season_settle", { season: g.season });
  let income = 0;
  // 風險上升 + 維護收入（收入在爆炸/倒閉/提告「之前」結算——同 Python）
  for (const cs of g.cases) {
    const rise = g.rng.randint(...c.risk_rise_base) + cs.rebound +
      (cs.inherited ? RULES.seasonEnd.inherited_extra_rise : 0);
    cs.rebound = 0;
    cs.risk = Math.min(100, cs.risk + rise);
    const base = RULES.seasonEnd.income_base;
    const rf = cs.risk < RULES.seasonEnd.income_risk_knee
      ? 1.0
      : Math.max(RULES.seasonEnd.income_risk_floor,
          1 - (cs.risk - RULES.seasonEnd.income_risk_knee) / RULES.seasonEnd.income_risk_div);
    income += int(base * A(cs).income_mult * rf * (cs.lockin ? RULES.card.lockin.income_mult : 1));
  }
  // 小公司倒閉
  for (const cs of [...g.cases]) {
    if (g.rng.random() < A(cs).bankrupt) {
      g.cases.splice(g.cases.indexOf(cs), 1);
      emit(g, "event.client_bankrupt", { case: cs.name, ctype: cs.atype });
    }
  }
  // 滿意度過低 → 提告（傳產忠誠高不易告）
  for (const cs of [...g.cases]) {
    if (cs.sat < c.sat_sue_at && g.rng.random() > A(cs).loyal) {
      const p = int(g.rng.randint(...c.sue_penalty) * A(cs).explode_mult * D(g, "penalty"));
      g.cash -= p;
      g.reputation -= 10;
      g.cases.splice(g.cases.indexOf(cs), 1);
      emit(g, "season.terminate", { case: cs.name, ctype: cs.atype, amount: p });
    }
  }
  // 引爆 → 處置決策（snapshot，同 Python _hits）
  const hits = g.cases.filter((cs) => cs.risk >= c.risk_explode_at);
  for (const cs of hits) {
    emit(g, "season.explode", { case: cs.name, ctype: cs.atype });
    // 答案：'eat'|'frontroom'|'force'|'signed'|'scapegoat'
    const ans = yield {
      decision: "explode", caseId: cs.id, caseName: cs.name, atype: cs.atype,
      canScapegoat: engineers(g).length > 0,
      frontroomSpent: !!g.frontroomUsed[cs.id],
    };
    if (ans === "scapegoat" && engineers(g).length) {
      const v = g.rng.choice(engineers(g));
      g.staff.splice(g.staff.indexOf(v), 1);
      cs.risk = RULES.explode.scapegoat.risk_to;
      g.morale -= RULES.explode.scapegoat.morale;
      emit(g, "explode.scapegoat", { eng: v.name });
    } else if (ans === "frontroom" || ans === "force" || ans === "signed") {
      const method = { frontroom: "這是前朝的鍋", force: "純屬不可抗力", signed: "甲方已簽核" }[ans];
      doBlame(g, cs, method);
      cs.risk = Math.min(cs.risk, RULES.explode.blame_risk_cap);
    } else {
      // 硬扛認賠（預設，同 Python else 分支）
      const loss = int(g.rng.randint(...RULES.explode.eat.loss) * A(cs).explode_mult * D(g, "penalty"));
      g.cash -= loss;
      cs.risk = RULES.explode.eat.risk_to;
      g.sin = Math.max(0, g.sin - RULES.explode.eat.sin_cut);
      emit(g, "explode.eat", { amount: loss, case: cs.name, ctype: cs.atype });
    }
  }
  // 對手倒閉結算 → 縮圈接盤
  for (const r of g.rivals) {
    if (r.alive && r.hp <= 0) {
      r.alive = false;
      g.morale = Math.min(100, g.morale + c.morale_rival_collapse);
      const windfall = int(g.rng.randint(...c.kill_windfall) * D(g, "kill_windfall"));
      g.cash += windfall;
      emit(g, "rival.collapse", { rival: r.name, amount: windfall });
      const atype = g.rng.choice(RULES.collapse.inherit_atypes); // 龍頭留下的多是大案
      const accept = yield { decision: "inherit", rival: r.name, atype };
      if (!accept) {
        g.reputation -= RULES.collapse.refuse.rep;
        g.cash -= RULES.collapse.refuse.cash;
        emit(g, "sys.inherit_refused", { rival: r.name });
      } else {
        const cs = mkCase(g, atype, true,
          g.rng.randint(...RULES.collapse.inherit_sat),
          g.rng.randint(...c.inherit_risk), true);
        g.cases.push(cs);
        emit(g, "rival.inherit", { rival: r.name, case: cs.name, ctype: atype });
      }
    }
  }
  if (!liveRivals(g).length && !g.gameOver) g.wonEarly = true;
  // 對手仇恨反撲（放血）
  if (!g.wonEarly) rivalRetaliation(g);
  // 稽核
  g.auditIn -= 1;
  if (g.auditIn <= 0) {
    audit(g);
    g.auditIn = g.rng.randint(...c.audit_interval);
  }
  // 財務
  const payroll = g.staff.reduce((s, x) => s + c.salary[x.role], 0) + c.rent;
  const pressure = liveRivals(g).length * c.rival_pressure;
  g.cash += income - payroll - pressure;
  emit(g, "sys.finance", { income, payroll, pressure, staff: g.staff.length, cash: g.cash });
  // 士氣
  const decay = Math.max(c.morale_decay_floor, c.morale_decay - pmCount(g) * c.morale_pm_buffer);
  g.morale = Math.max(0, g.morale - decay);
  if (!hits.length) g.morale = Math.min(100, g.morale + c.morale_lowpressure); // 沒爆炸的一季，喘口氣
  g.moraleHist.push(g.morale);
  // 補牌（只補垃圾）
  while (g.hand.length < 3) {
    const [name, kind] = g.rng.choice(CARD_JUNK);
    g.hand.push({ name, kind });
  }
  checkEnd(g);
}

// ============================================================
// 驅動器
// ============================================================
// 同步驅動 generator（Monte Carlo 用）：decide(req) 立即回答案
export function runFlow(gen, decide) {
  let input;
  for (;;) {
    const { value, done } = gen.next(input);
    if (done) return;
    input = decide(value);
  }
}

// 開新一季（重置行動點/出牌數；主迴圈歸 UI 或 MC runner 管）
export function beginSeason(g) {
  g.actionsLeft = CONFIG.actions_per_season;
  g.cardsPlayed = 0;
}

// 一局結束後的結果標籤（won_early 蓋過 gameOver——同季殺光對手又倒帳仍判獨活，
// 黑色幽默 feature，同 Python main() 的判定順序）
export function finalResult(g) {
  if (g.wonEarly) return "WIN_SOLO";
  if (g.gameOver) return "LOSE";
  return "WIN";
}

export function endingKey(g) {
  if (g.wonEarly) return "ending.solo";
  if (g.gameOver)
    return { "現金": "ending.lose_cash", "士氣": "ending.lose_morale", "稽核": "ending.lose_audit" }[g.deathCause] || "ending.lose_cash";
  return "ending.survive";
}
