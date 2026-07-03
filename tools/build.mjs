// ============================================================
// build.mjs — 打包出貨目錄 dist/（只含遊戲本體，約 2.5MB）
// 用法：node tools/build.mjs
// Cloudflare 部署請以 dist/ 為輸出目錄，避免把 node_modules/、
// assets_raw/(30MB 原始素材)、reference/ 等開發用檔案一起上傳。
// ============================================================
import { rmSync, mkdirSync, cpSync, existsSync, readFileSync, writeFileSync } from "fs";

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
// sw 快取版本戳：每次 build 自動換 → 部署後舊快取整組淘汰、資產強制更新
const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
writeFileSync("dist/sw.js", readFileSync("dist/sw.js", "utf-8").replaceAll("__BUILD__", stamp));
console.log("dist/ 打包完成：", SHIP.join(", "), `(sw 版本 vz-${stamp})`);
