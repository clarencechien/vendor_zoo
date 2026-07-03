// ============================================================
// rng.js — 可播種 PRNG（mulberry32）
// 引擎所有隨機都走注入的 rng 物件 → Monte Carlo 可重現。
// 語意對齊 Python random：randint 兩端含、choice、shuffle(Fisher-Yates)。
// ============================================================

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) {
  const f = mulberry32(seed);
  return {
    seed,
    random: f,
    // 兩端含，同 Python random.randint(a, b)
    randint(a, b) { return a + Math.floor(f() * (b - a + 1)); },
    choice(arr) { return arr[Math.floor(f() * arr.length)]; },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(f() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    chance(p) { return f() < p; },
  };
}
