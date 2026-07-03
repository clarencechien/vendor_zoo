# engine.js ↔ Python v0.3 Monte Carlo 對拍報告

- 日期：2026-07-03
- Python 基準：`tools/py_baseline.py`（exec `reference/engine_python_v0.3.py`，直接呼叫其 `montecarlo()`）
- JS 版：`node tools/montecarlo.mjs 2000`（mulberry32 播種，bot 語意逐項對齊 `_auto_input_factory`）

## 勝率對照

| 模式×策略 | Python | JS | 差 |
|---|---|---|---|
| DEV aggressive（搞事流） | **69.0%**（n=3000） | **69.2%** | +0.2 |
| DEV clean（老實流） | 10.7%（n=1000） | 11.6% | +0.9 |
| DEV talkonly（擺爛流） | 32.2%（n=1000） | 32.6% | +0.4 |
| PRD aggressive | **45.2%**（n=3000） | **45.2%** | ±0 |
| PRD clean | 9.1%（n=1000） | 9.4% | +0.3 |
| PRD talkonly | 21.8%（n=1000） | 20.6% | −1.2 |

全部落在抽樣誤差內（n=1000 的標準誤約 ±1.5%）。
交接驗收目標：DEV~68% ✅ / PRD~44-45% ✅ / 擺爛流 20-35% 且最差於搞事流 ✅。

## 其他指標對照（agg = 搞事流）

| 指標 | Python | JS |
|---|---|---|
| DEV agg 搞死中位 | 4 家 | 4 家（均 3.5） |
| PRD agg 搞死中位 | 3 家 | 3 家（均 3.0） |
| DEV agg 存活均季 | 9.00 | 8.9 |
| PRD agg 存活均季 | 8.77 | 8.8 |
| agg 士氣中位 | 66 | 66-67 |
| 死因 | 幾乎全為現金死 | 同（其中少數標為「稽核死」＝決策A的 cosmetic 重標：稽核罰款為壓垮現金的最後一根稻草時） |

## 備註

- 「稽核死」在 Python 中永遠不會出現（`death_cause` 只有現金/士氣）；JS 版依已確認的
  決策 A，當 `cash + 本季稽核罰款 ≥ 0 > cash` 時把現金死重標為稽核死——
  勝負判定不變（LOSE 仍是 LOSE），僅影響結局插圖，對拍不受影響。
- 追求分布對齊而非逐 seed 對齊（兩邊 RNG 呼叫序無法一致）。
- 重現方式：`python3 tools/py_baseline.py 1000`、`node tools/montecarlo.mjs 2000`。
