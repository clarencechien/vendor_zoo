// ============================================================
// fix_assets.mjs — 修素材去背問題（就地覆寫 assets_raw，改完跑 optimize_assets.mjs）
// 1) 四張結局圖（solo/survive/lose_cash/lose_audit）：假透明棋盤格底 →
//    邊界 flood-fill 去近白低彩度背景 + 清被包圍的棋盤格內洞 + 邊緣收縮 1px 防白邊
// 2) 立繪：保留最大連通塊，清掉 AI 生圖殘留的漂浮碎片（如業務坐姿旁的對話框殘片）
// ============================================================
import sharp from "sharp";

const BG_TONE = 226;   // RGB 都高於此
const BG_CHROMA = 16;  // 且 max-min 低於此 → 視為背景候選（近白低彩度）

function idx(w, x, y) { return (y * w + x) * 4; }

async function loadRGBA(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}
async function saveRGBA({ data, w, h }, path) {
  await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path);
}

// ---- 結局圖：去棋盤格假透明底 ----
async function cutoutChecker(path) {
  const img = await loadRGBA(path);
  const { data, w, h } = img;
  const isBgCand = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    return Math.min(r, g, b) >= BG_TONE && Math.max(r, g, b) - Math.min(r, g, b) <= BG_CHROMA;
  };
  // 1) 邊界 flood-fill
  const cleared = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, 0, x, h - 1); }
  for (let y = 0; y < h; y++) { stack.push(0, y, w - 1, y); }
  const seeds = [];
  for (let k = 0; k < stack.length; k += 2) seeds.push([stack[k], stack[k + 1]]);
  const q = [];
  for (const [x, y] of seeds) {
    const p = y * w + x;
    if (!cleared[p] && isBgCand(p * 4)) { cleared[p] = 1; q.push(p); }
  }
  while (q.length) {
    const p = q.pop();
    const x = p % w, y = (p / w) | 0;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (!cleared[np] && isBgCand(np * 4)) { cleared[np] = 1; q.push(np); }
    }
  }
  // 2) 被包圍的棋盤格內洞：背景候選連通塊 ≥200px、且同時含亮暗兩種棋盤色調 → 清
  const seen = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) {
    if (seen[p] || cleared[p] || !isBgCand(p * 4)) continue;
    const comp = [p]; seen[p] = 1;
    let lo = 0, hi = 0;
    for (let qi = 0; qi < comp.length; qi++) {
      const cp = comp[qi];
      const v = Math.min(data[cp * 4], data[cp * 4 + 1], data[cp * 4 + 2]);
      if (v <= 250) lo++; else hi++;
      const cx = cp % w, cy = (cp / w) | 0;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (!seen[np] && !cleared[np] && isBgCand(np * 4)) { seen[np] = 1; comp.push(np); }
      }
    }
    const tot = comp.length;
    if (tot >= 200 && lo / tot >= 0.15 && hi / tot >= 0.15) for (const cp of comp) cleared[cp] = 1;
  }
  // 3) 套用 + 邊緣收縮 1px（緊鄰被清區的保留像素 → 半透明，消白邊）
  for (let p = 0; p < w * h; p++) if (cleared[p]) data[p * 4 + 3] = 0;
  const alpha = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) alpha[p] = data[p * 4 + 3];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (!alpha[p]) continue;
    let nearClear = false;
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      if (cleared[ny * w + nx]) { nearClear = true; break; }
    }
    if (nearClear) data[p * 4 + 3] = Math.min(data[p * 4 + 3], 110);
  }
  const clearedN = cleared.reduce((a, b) => a + b, 0);
  await saveRGBA(img, path);
  console.log(`${path}: 清掉 ${(100 * clearedN / (w * h)).toFixed(0)}% 背景`);
}

// ---- 立繪：保留最大連通塊（清漂浮碎片）----
async function keepLargestComponent(path) {
  const img = await loadRGBA(path);
  const { data, w, h } = img;
  const solid = (p) => data[p * 4 + 3] > 8;
  const label = new Int32Array(w * h).fill(-1);
  const comps = [];
  for (let p = 0; p < w * h; p++) {
    if (!solid(p) || label[p] !== -1) continue;
    const id = comps.length;
    const comp = [p]; label[p] = id;
    for (let qi = 0; qi < comp.length; qi++) {
      const cp = comp[qi];
      const cx = cp % w, cy = (cp / w) | 0;
      // 8-連通，斜角相接也算同塊（避免誤砍細線相連的道具）
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const np = ny * w + nx;
        if (solid(np) && label[np] === -1) { label[np] = id; comp.push(np); }
      }
    }
    comps.push(comp);
  }
  comps.sort((a, b) => b.length - a.length);
  const main = comps[0]?.length || 0;
  let removed = 0;
  for (let i = 1; i < comps.length; i++) {
    // 小於主體 3% 的漂浮塊 = 殘片；大的（可能是道具）保留
    if (comps[i].length < main * 0.03) {
      for (const p of comps[i]) data[p * 4 + 3] = 0;
      removed += comps[i].length;
    }
  }
  await saveRGBA(img, path);
  console.log(`${path}: ${comps.length} 塊，主體 ${main}px，清掉碎片 ${removed}px`);
}

for (const f of ["end_solo", "end_survive", "end_lose_cash", "end_lose_audit"]) {
  await cutoutChecker(`assets_raw/events/${f}.png`);
}
for (const f of [
  "emp_eng_m_stand", "emp_eng_m_sit", "emp_eng_m_orz",
  "emp_pm_f_stand", "emp_pm_f_sit", "emp_pm_f_orz",
  "emp_sales_m_stand", "emp_sales_m_sit", "emp_sales_m_orz",
]) {
  await keepLargestComponent(`assets_raw/sprites/${f}.png`);
}
console.log("done");
