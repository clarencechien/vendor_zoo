# -*- coding: utf-8 -*-
"""gen_narration.py — 旁白單一真相源 content/narration.csv 的產生器
用法：python3 tools/gen_narration.py
輸出：
  1. js/narration_data.js（遊戲用）
  2. 回寫 reference/engine_python_v0.3.py 的 NARRATION_CSV 區塊（保持兩邊一致；
     旁白不影響平衡，Monte Carlo 對拍不受影響）
改文案請改 content/narration.csv，不要直接改輸出檔。"""
import csv, io, json, re, sys

rows = []
with open("content/narration.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if not r.get("context_key") or not r.get("template"):
            continue
        try:
            w = max(1, int(float(r.get("weight", 3))))
        except Exception:
            w = 3
        rows.append([r["context_key"].strip(), w, r["template"].strip()])

# lint：佔位符白名單
GENERIC = {"eng", "sales", "rival", "case", "ctype"}
LIMITED = {
    "amount": {"event.sales_flee","event.ransom","event.windfall","action.upsell_win","action.upsell_stiff","action.morale","card.disaster_cash","blame.sue","season.terminate","explode.eat","rival.collapse","audit.fined"},
    "dmg": {"action.mess_report","action.mess_rumor","action.mess_poach","card.poison"},
    "stat": {"event.poached","action.mess_poach"},
    "method": {"blame.win"},
}
# 注意：HANDOFF §5 允許缺變數自動兜底（amount→若干、method→那套說法），
# 原始 270 句有少數依賴此行為 → 這裡只警告不擋；新句在 authoring 階段已嚴格把關。
warn = []
for k, w, tpl in rows:
    for ph in re.findall(r"\{(\w+)\}", tpl):
        if ph in GENERIC or k in LIMITED.get(ph, set()) or k == "action.resub":
            continue
        warn.append(f"{k}: {{{ph}}}（將走兜底）— {tpl[:28]}")
if warn:
    print("佔位符兜底警告（不擋）：", *warn, sep="\n")
unknown = [f"{k}: {{{ph}}}" for k, w, tpl in rows for ph in re.findall(r"\{(\w+)\}", tpl)
           if ph not in GENERIC and ph not in LIMITED]
if unknown:
    print("未知佔位符（會渲染殘留，必擋）：", *unknown, sep="\n"); sys.exit(1)

# 1) narration_data.js
out = "// narration_data.js — 旁白模板（機器產生，勿手改）\n"
out += "// 單一真相源：content/narration.csv；重生：python3 tools/gen_narration.py\n"
out += "export const NARRATION = " + json.dumps(rows, ensure_ascii=False, indent=0).replace("\n[", "\n  [") + ";\n"
open("js/narration_data.js", "w", encoding="utf-8").write(out)

# 2) 回寫 Python NARRATION_CSV 區塊
csv_text = "context_key,tone,weight,template\n"
with open("content/narration.csv", encoding="utf-8") as f:
    next(f)
    csv_text += f.read().rstrip("\n") + "\n"
py = open("reference/engine_python_v0.3.py", encoding="utf-8").read()
new_py, n = re.subn(r'NARRATION_CSV = r""".*?"""',
                    'NARRATION_CSV = r"""' + csv_text + '"""', py, count=1, flags=re.S)
assert n == 1, "Python NARRATION_CSV 區塊沒找到"
open("reference/engine_python_v0.3.py", "w", encoding="utf-8").write(new_py)

from collections import Counter
c = Counter(r[0] for r in rows)
print(f"OK：{len(rows)} 句 / {len(c)} 鍵 → js/narration_data.js + Python 同步完成")
print(f"最小池 {min(c.values())}（{min(c, key=c.get)}）｜最大池 {max(c.values())}")
