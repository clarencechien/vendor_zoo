// ============================================================
// build.mjs — 打包出貨目錄 dist/（只含遊戲本體，約 2.5MB）
// 用法：node tools/build.mjs
// Cloudflare 部署請以 dist/ 為輸出目錄，避免把 node_modules/、
// assets_raw/(30MB 原始素材)、reference/ 等開發用檔案一起上傳。
// ============================================================
import { rmSync, mkdirSync, cpSync, existsSync } from "fs";

const SHIP = [
  "index.html",
  "sw.js",
  "manifest.webmanifest",
  "_headers",
  "js",
  "assets",
];

rmSync("dist", { recursive: true, force: true });
mkdirSync("dist");
for (const p of SHIP) {
  if (!existsSync(p)) { console.error(`缺 ${p}，先跑 node tools/optimize_assets.mjs?`); process.exit(1); }
  cpSync(p, `dist/${p}`, { recursive: true });
}
console.log("dist/ 打包完成：", SHIP.join(", "));
