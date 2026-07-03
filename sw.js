// sw.js — Vendor Zoo 離線快取（cache-first 全量預快取）
const VERSION = "vz-v1";
const CORE = [
  ".",
  "index.html",
  "manifest.webmanifest",
  "js/config.js", "js/rng.js", "js/engine.js",
  "js/narration.js", "js/narration_data.js", "js/ui.js", "js/main.js",
  "assets/backgrounds/office_bg.webp",
  "assets/backgrounds/title_screen.webp",
  "assets/buttons/btn_bid.webp",
  "assets/buttons/btn_bonus.webp",
  "assets/buttons/btn_draw.webp",
  "assets/buttons/btn_end.webp",
  "assets/buttons/btn_hand.webp",
  "assets/buttons/btn_hire.webp",
  "assets/buttons/btn_mess.webp",
  "assets/buttons/btn_ops.webp",
  "assets/buttons/btn_recon.webp",
  "assets/buttons/btn_rescue.webp",
  "assets/buttons/btn_talk.webp",
  "assets/cases/case_bank.webp",
  "assets/cases/case_gov.webp",
  "assets/cases/case_legacy.webp",
  "assets/cases/case_small.webp",
  "assets/cases/case_sp500.webp",
  "assets/events/end_lose_audit.webp",
  "assets/events/end_lose_cash.webp",
  "assets/events/end_lose_morale.webp",
  "assets/events/end_solo.webp",
  "assets/events/end_survive.webp",
  "assets/events/evt_audit.webp",
  "assets/events/evt_explode.webp",
  "assets/events/evt_rival_down.webp",
  "assets/events/evt_windfall.webp",
  "assets/hud/hud_ap.webp",
  "assets/hud/hud_audit.webp",
  "assets/hud/hud_coin.webp",
  "assets/hud/hud_hand.webp",
  "assets/hud/hud_morale.webp",
  "assets/hud/hud_season.webp",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
  "assets/rivals/rival_logo_G.webp",
  "assets/rivals/rival_logo_H.webp",
  "assets/rivals/rival_logo_M.webp",
  "assets/rivals/rival_logo_T.webp",
  "assets/sprites/emp_eng_m_orz.webp",
  "assets/sprites/emp_eng_m_sit.webp",
  "assets/sprites/emp_eng_m_stand.webp",
  "assets/sprites/emp_pm_f_orz.webp",
  "assets/sprites/emp_pm_f_sit.webp",
  "assets/sprites/emp_pm_f_stand.webp",
  "assets/sprites/emp_sales_m_orz.webp",
  "assets/sprites/emp_sales_m_sit.webp",
  "assets/sprites/emp_sales_m_stand.webp",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit ||
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(e.request, copy));
        return res;
      })
    )
  );
});
