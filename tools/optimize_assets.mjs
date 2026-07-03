// ============================================================
// optimize_assets.mjs — assets_raw/(30MB 原始 PNG) → assets/(WebP 出貨)
// 用法：node tools/optimize_assets.mjs
// 策略：
//  - 大圖(事件插圖/背景)：縮到顯示尺寸 2x 內 + WebP q82
//  - 立繪：高度 ≤360(顯示 120-170px 的 2x) + WebP q85（含透明）
//  - 小 icon(≤128px)：WebP 無損（維持像素感）
// ============================================================
import sharp from "sharp";
import { readdirSync, mkdirSync, statSync } from "fs";
import { join, dirname, relative } from "path";

const SRC = "assets_raw";
const OUT = "assets";

const PLANS = [
  { match: /^events\//,      resize: { width: 960, withoutEnlargement: true },  webp: { quality: 82 } },
  { match: /^backgrounds\/title_screen/, resize: { height: 1600, withoutEnlargement: true }, webp: { quality: 82 } },
  { match: /^backgrounds\//, resize: { width: 1080, withoutEnlargement: true }, webp: { quality: 82 } },
  { match: /^sprites\//,     resize: { height: 360, withoutEnlargement: true }, webp: { quality: 85 } },
  { match: /./,              resize: null, webp: { lossless: true } }, // 小 icon
];

function* walk(dir) {
  for (const f of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, f.name);
    if (f.isDirectory()) yield* walk(p);
    else if (f.name.endsWith(".png")) yield p;
  }
}

let totIn = 0, totOut = 0;
for (const src of walk(SRC)) {
  const rel = relative(SRC, src);
  const plan = PLANS.find((p) => p.match.test(rel));
  const out = join(OUT, rel.replace(/\.png$/, ".webp"));
  mkdirSync(dirname(out), { recursive: true });
  let img = sharp(src);
  if (plan.resize) img = img.resize(plan.resize);
  await img.webp(plan.webp).toFile(out);
  const a = statSync(src).size, b = statSync(out).size;
  totIn += a; totOut += b;
  console.log(`${(a / 1024).toFixed(0).padStart(6)}KB → ${(b / 1024).toFixed(0).padStart(5)}KB  ${rel}`);
}
console.log(`\nTOTAL ${(totIn / 1048576).toFixed(1)}MB → ${(totOut / 1048576).toFixed(2)}MB`);
