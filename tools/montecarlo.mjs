// ============================================================
// montecarlo.mjs — JS 引擎無頭模擬，對拍 Python 版勝率
//
// 用法：node tools/montecarlo.mjs [n]
//
// 三策略 port 自 Python POLICIES；bot 語意逐項對齊 _auto_input_factory：
//  - buffer 制：buf 空了才重新問 policy；動作失敗(ok:false)不扣行動點但消耗 buffer
//  - 話術一律榨錢、目標一律第一個案子；救火也是第一個案子（bot 的 pick_case = cases[0]）
//  - 搞同行：搞法隨機 1/2/3、目標第一家活著的對手
//  - 決策：贖金隨機 y/n、引爆隨機 [硬扛,不可抗力,不可抗力,推甲方]、接盤必接、招人=工程師
// ============================================================

import { makeRng } from "../js/rng.js";
import { CONFIG } from "../js/config.js";
import {
  newGame, beginSeason, seasonStartFlow, seasonEndFlow, runFlow, finalResult,
  actionBid, actionTalk, actionRescue, actionMess, actionMorale, actionHire,
  engineers, pmCount, liveRivals,
} from "../js/engine.js";

// ---- 策略（照抄 Python pol_*）----
function polAggressive(g) { // 搞同行流（主玩法）
  const t = [];
  if (g.morale < 45 && g.cash > 70) t.push("6");
  if (engineers(g).length === 0 && g.cash > 130) t.push("7");
  const smoky = g.cases.filter((c) => c.risk >= 55);
  if (smoky.length && engineers(g).length && g.cash > 110) t.push("3");
  if (g.cash > 220 && liveRivals(g).length) t.push("4");
  if (g.cases.length && g.cash < 400) t.push("2");
  if (g.cases.length < pmCount(g) * 2 - 1 && g.cash > 150) t.push("1");
  t.push("e");
  return t;
}
function polClean(g) { // 老實流
  const t = [];
  if (g.morale < 50 && g.cash > 70) t.push("6");
  if (engineers(g).length === 0 && g.cash > 130) t.push("7");
  const smoky = g.cases.filter((c) => c.risk >= 45);
  if (smoky.length && engineers(g).length && g.cash > 90) t.push("3");
  if (g.cases.length) t.push("2");
  if (g.cases.length < pmCount(g) * 2 - 1 && g.cash > 60) t.push("1");
  t.push("e");
  return t;
}
function polTalkonly(g) { // 純話術擺爛流（應該最差）
  return g.cases.length ? ["2", "2", "1", "e"] : ["1", "1", "e"];
}
const POLICIES = { aggressive: polAggressive, clean: polClean, talkonly: polTalkonly };

// ---- bot 指令 → 引擎呼叫（同 _auto_input_factory 的作答）----
function execCmd(g, cmd, rng) {
  switch (cmd) {
    case "1": return actionBid(g);
    case "2": return actionTalk(g, g.cases[0]?.id, "upsell");
    case "3": return actionRescue(g, g.cases[0]?.id);
    case "4": {
      const how = rng.choice(["report", "rumor", "poach"]);
      const r = liveRivals(g)[0];
      return r ? actionMess(g, r.name, how) : { ok: false, apSpent: false };
    }
    case "6": return actionMorale(g);
    case "7": return actionHire(g, "工程師");
    default: return { ok: false, apSpent: false };
  }
}

function playOne(policyName, mode, seed) {
  const rng = makeRng(seed);
  const g = newGame(mode, rng);
  const policy = POLICIES[policyName];
  const decide = (req) => {
    if (req.decision === "ransom") return rng.choice([true, false]);
    if (req.decision === "explode") return rng.choice(["eat", "force", "force", "signed"]);
    if (req.decision === "inherit") return true;
    return null;
  };
  while (!g.gameOver && !g.wonEarly && g.season <= CONFIG.seasons_to_survive) {
    beginSeason(g);
    runFlow(seasonStartFlow(g), decide);
    let buf = [];
    while (g.actionsLeft > 0 && !g.gameOver) {
      if (!buf.length) buf = policy(g);
      const cmd = buf.shift();
      if (cmd === "e") break;
      const res = execCmd(g, cmd, rng);
      if (res.apSpent) g.actionsLeft -= 1;
    }
    runFlow(seasonEndFlow(g), decide);
    g.season += 1;
  }
  return g;
}

const med = (x) => (x.length ? [...x].sort((a, b) => a - b)[Math.floor(x.length / 2)] : 0);

export function montecarlo(policyName, mode, n = 1000, baseSeed = 0) {
  const results = [], killed = [], seasons = [], moraleMed = [], deaths = {};
  for (let i = 0; i < n; i++) {
    const g = playOne(policyName, mode, baseSeed + i + 1); // +1: mulberry32 seed 0 避開
    const r = finalResult(g);
    results.push(r);
    killed.push(g.rivals.filter((x) => !x.alive).length);
    seasons.push(Math.min(g.season, CONFIG.seasons_to_survive));
    const mh = g.moraleHist.length > 5 ? g.moraleHist.slice(5) : g.moraleHist;
    if (mh.length) moraleMed.push(med(mh));
    if (r === "LOSE") deaths[g.deathCause || "其他"] = (deaths[g.deathCause || "其他"] || 0) + 1;
  }
  const count = (k) => results.filter((x) => x === k).length;
  const win = (count("WIN_SOLO") + count("WIN")) / n;
  return {
    policy: policyName, mode, n, win,
    solo: count("WIN_SOLO") / n,
    kill_med: med(killed),
    kill_mean: killed.reduce((a, b) => a + b, 0) / killed.length,
    morale_med: med(moraleMed),
    seasons_mean: seasons.reduce((a, b) => a + b, 0) / seasons.length,
    deaths,
  };
}

// ---- score_balance 六條檢核（同 Python，以搞事流為主玩法）----
export function scoreBalance(mode, n) {
  const ms = {};
  for (const name of Object.keys(POLICIES)) ms[name] = montecarlo(name, mode, n);
  const agg = ms.aggressive, talk = ms.talkonly;
  const wins = Object.values(ms).map((m) => m.win);
  const spread = Math.max(...wins) - Math.min(...wins);
  const worst = Object.values(ms).reduce((a, b) => (b.win < a.win ? b : a)).policy;
  const allDeaths = {};
  for (const m of Object.values(ms))
    for (const [k, v] of Object.entries(m.deaths)) allDeaths[k] = (allDeaths[k] || 0) + v;
  const tot = Object.values(allDeaths).reduce((a, b) => a + b, 0) || 1;
  const deathTop = Object.values(allDeaths).length ? Math.max(...Object.values(allDeaths)) / tot : 0;
  const checks = {
    c1_kill_2_3: agg.kill_med >= 2 && agg.kill_med <= 3,
    c2_win_45_60: agg.win >= 0.45 && agg.win <= 0.6,
    c3_morale_35_70: agg.morale_med >= 35 && agg.morale_med <= 70,
    c4_death_spread: deathTop <= 0.6,
    c5_talk_worst_lt40: worst === "talkonly" && talk.win < 0.4,
    c6_no_dominant: spread < 0.3,
  };
  return { ms, checks, allDeaths, spread, worst };
}

// ---- CLI ----
const n = parseInt(process.argv[2] || "1000", 10);
console.log(`JS 引擎 Monte Carlo（n=${n}／策略）`);
for (const mode of ["DEV", "PRD"]) {
  console.log(`\n== MODE ${mode} ==`);
  for (const name of Object.keys(POLICIES)) {
    const m = montecarlo(name, mode, n);
    console.log(
      `[${mode}][${name.padEnd(10)}] win ${(m.win * 100).toFixed(1)}%  solo ${(m.solo * 100).toFixed(1)}%` +
      `  kill_med ${m.kill_med}(均${m.kill_mean.toFixed(1)})  morale_med ${m.morale_med}` +
      `  seasons ${m.seasons_mean.toFixed(1)}  deaths ${JSON.stringify(m.deaths)}`
    );
  }
}
