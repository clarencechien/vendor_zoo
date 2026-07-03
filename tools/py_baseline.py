# 跑 Python 引擎的 Monte Carlo 當對拍基準（不改引擎，exec 進 __main__ 后呼叫 montecarlo）
import json, sys
src = open('reference/engine_python_v0.3.py', encoding='utf-8').read().split('if __name__')[0]
exec(compile(src, 'engine_python_v0.3', 'exec'), globals())

N = int(sys.argv[1]) if len(sys.argv) > 1 else 1000
out = {}
for mode in ["DEV", "PRD"]:
    globals()['MODE'] = mode
    out[mode] = {}
    for pol in ["aggressive", "clean", "talkonly"]:
        m = montecarlo(pol, n=N, quiet=True)
        out[mode][pol] = m
        print(f"[{mode}][{pol:10s}] win {m['win']:.1%}  solo {m['solo']:.1%}  kill_med {m['kill_med']}  morale_med {m['morale_med']}  seasons {m['seasons_mean']:.1f}  deaths {m['deaths']}", flush=True)
json.dump(out, open('/tmp/claude-0/-home-user-vendor-zoo/84745571-8c24-51af-88fe-63b65b10f709/scratchpad/py_baseline.json', 'w'))
print("DONE")
