// ============================================================
// narration.js — 旁白系統（對應 Python Narrator + narr()）
//
// 抽句演算法（v0.3 修過的版本，務必維持）：
//   加權隨機挑選 ＋ 避開最近用過的（recent 窗 = min(句數-1, 4)）。
//   ⚠ 不可改回「權重＝在袋裡放幾份」的舊寫法——高權重句會短期重複。
//
// 佔位符 {eng}{sales}{rival}{case}{ctype}{amount}{dmg}{stat}{method}，
// 缺的由 fillVars() 自動兜底（隨機取當前案/對手/員工名，或通用詞）。
//
// 旁白用獨立 RNG（預設 Math.random）——不共用引擎的播種 rng，
// 免得文案抽句影響 Monte Carlo 對拍。
// ============================================================

import { NARRATION } from "./narration_data.js";

const PLACE = /\{(\w+)\}/g;

export function makeNarrator(random = Math.random) {
  const pool = new Map(); // key -> [{w, tpl}]
  for (const [key, w, tpl] of NARRATION) {
    if (!pool.has(key)) pool.set(key, []);
    pool.get(key).push({ w, tpl });
  }
  const recent = new Map(); // key -> [idx,...]

  function pick(key) {
    const cands = pool.get(key);
    if (!cands || !cands.length) return null;
    const used = recent.get(key) || [];
    // 候選＝排除最近用過的；若全被排除就整組重來
    let idxs = [];
    for (let i = 0; i < cands.length; i++) if (!used.includes(i)) idxs.push(i);
    if (!idxs.length) idxs = cands.map((_, i) => i);
    // 加權隨機
    const totW = idxs.reduce((s, i) => s + cands[i].w, 0);
    let x = random() * totW;
    let chosen = idxs[idxs.length - 1];
    for (const i of idxs) {
      x -= cands[i].w;
      if (x < 0) { chosen = i; break; }
    }
    used.push(chosen);
    // 記憶窗自適應：小池(≤6句)維持 HANDOFF 規格的 min(n-1,4)；
    // 擴充後的大池(10-14句)放大到 60%，10刷內幾乎不見重複
    const win = Math.min(cands.length - 1, Math.max(4, Math.floor(cands.length * 0.6)));
    while (used.length > win) used.shift();
    recent.set(key, used);
    return cands[chosen].tpl;
  }

  return {
    has: (key) => pool.has(key),
    say(key, vars = {}) {
      const tpl = pick(key);
      if (tpl === null) return null;
      return tpl.replace(PLACE, (m, name) => (name in vars ? String(vars[name]) : m));
    },
    keys: () => [...pool.keys()],
  };
}

// 自動兜底（對應 Python narr()）：從 game 狀態補 case/ctype/rival/eng/sales，
// 再補通用預設值，保證模板不留 {xxx}。
export function fillVars(g, vars = {}, random = Math.random) {
  const d = { ...vars };
  const rc = (arr) => arr[Math.floor(random() * arr.length)];
  if (g) {
    if (!("case" in d) && g.cases?.length) {
      const c = rc(g.cases);
      d.case = c.name;
      if (!("ctype" in d)) d.ctype = c.atype;
    }
    if (!("rival" in d)) {
      const rs = g.rivals?.filter((r) => r.alive) ?? [];
      const all = rs.length ? rs : g.rivals ?? [];
      if (all.length) d.rival = rc(all).name;
    }
    const engs = g.staff?.filter((s) => s.role === "工程師") ?? [];
    if (!("eng" in d) && engs.length) d.eng = rc(engs).name;
    const sls = g.staff?.filter((s) => s.role === "業務") ?? [];
    if (!("sales" in d) && sls.length) d.sales = rc(sls).name;
  }
  d.case ??= "某專案"; d.ctype ??= "某案"; d.rival ??= "某同業";
  d.eng ??= "某工程師"; d.sales ??= "某業務";
  d.amount ??= "若干"; d.dmg ??= "不少"; d.stat ??= "?"; d.method ??= "那套說法";
  return d;
}

// 一步到位：抽句＋兜底。沒模板回 null（呼叫端用備援文字）。
export function narrate(narrator, g, key, vars = {}, random = Math.random) {
  return narrator.say(key, fillVars(g, vars, random));
}
