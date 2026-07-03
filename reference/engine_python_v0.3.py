# -*- coding: utf-8 -*-
"""
外包生存模擬器 —— v0.3（搞事 App 版）
================================================
把整支貼進一個 Colab cell 執行。純標準函式庫、單一檔。
玩：跑 main()。　平衡：把檔尾 main() 換成 score_balance() / grid()。
難度：改檔案頂端 MODE = "DEV"（練習）或 "PRD"（真實）。
你是政府旗艦計畫五家龍頭之一，這是大逃殺：搞死對手、活到最後。

平衡旋鈕集中在 CONFIG；難度倍率在 DIFF；旁白模板在 NARRATION_CSV。

========================= CHANGELOG =========================
v0.3
  - [修] 旁白抽句改『加權挑選＋避開最近用過』：修掉高權重模板短期內一直重複的問題。
  - 旁白模板庫擴充至 270 條(46鍵×3~6句)、開場文案重寫。
  - 難度雙模式 MODE：DEV 練習(勝率~68%) / PRD 真實(~44%，對手記仇反撲)。
  - 仇恨值系統 + 對手反撲：你搞他就記仇、家數變少全體加碼(困獸)、
    季末 d100 vs 仇恨反撲你(放假消息啃信譽/檢舉餵你稽核/挖你人搶你案)。放血不秒殺。
  - 甩鍋改真兩難：硬扛=賠錢但罪孽不增／甩鍋成功=不賠但罪孽大增(養稽核)／
    甩鍋失敗=賠更多+雙殺。爆炸終於要取捨。
  - 接案摩擦：期初款砍、規模越大搶標 DC 越高——「爆了就搶新的」不再免費。
  - 旁白系統(B-lite)：內嵌 138 條台灣味黑色幽默模板(NARRATION_CSV)，
    引擎事件 → 抽模板填變數；之後可換 local DB。
  - 業務保底：沒業務又招不起時開放「前員工回鍋兼差$35」，去死鎖、留衰運。
  - 挖角擴大到全職位(工程師/PM/業務)，成本 $110→$165 平衡。
  - 選單瘦身 11→7 項：話術(2)榨錢/安撫二選一、移除轉包(5)、
    查核撥霧與打手牌不吃行動點(手牌每季上限 3)。
  - 平衡工具：montecarlo/score_balance/grid/knobs（依當前 MODE 計分）。

v0.2（相對 v0.1）
  - 事件袋(抽牌不放回＋冷卻) 修「勒索軟體洗版」。
  - 話術收錢冷卻，修「話術輪流收錢半無敵」。
  - 對手血條 + 互搞(檢舉/放假消息/挖角/毒模組)=「搞事 App」核心動詞。
  - 對手倒閉 → 接盤前朝毒案(縮圈)；最後一家倒 = 獨活。
  - 案子五型(政府/銀行/S&P500/小公司/傳產)各有隱藏參數，破「話術一招打天下」。

v0.1
  - 初版：真 Python 引擎當冷酷裁判（LLM/模板只上妝），
    5 行動點、案子生命週期、技術債/士氣/稽核三反作用力、甩鍋決策樹。
=============================================================
"""

import random, textwrap


# ============================================================
# 旁白系統（B-lite）：內嵌模板庫 + 載入層 + 自動填變數助手
#   之後要換成 local DB，只需改 Narrator 的資料來源即可。
# ============================================================
import csv as _csv, io as _io2, re as _re2
from collections import defaultdict as _dd

_PLACE = _re2.compile(r"\{(\w+)\}")

class Narrator:
    def __init__(self, csv_text=""):
        self.pool=_dd(list); self._recent={}
        if csv_text:
            for r in _csv.DictReader(_io2.StringIO(csv_text)):
                if not r.get("context_key") or not r.get("template"): continue
                try: w=max(1,int(float(r.get("weight",3))))
                except: w=3
                self.pool[r["context_key"].strip()].append((w, r["template"].strip()))
    def _pick(self, key):
        cands=self.pool.get(key)
        if not cands: return None
        recent=self._recent.setdefault(key, [])
        # 候選＝排除最近用過的；若全被排除就整組重來
        pool=[i for i in range(len(cands)) if i not in recent] or list(range(len(cands)))
        idx=random.choices(pool, weights=[cands[i][0] for i in pool], k=1)[0]
        recent.append(idx)
        # 記憶窗＝最多避開 (句數-1) 或 4 個，避免把候選清空
        while len(recent) > min(len(cands)-1, 4): recent.pop(0)
        return cands[idx][1]
    def has(self, key): return bool(self.pool.get(key))
    def say(self, key, **v):
        tpl=self._pick(key)
        if tpl is None: return None
        return _PLACE.sub(lambda m: str(v[m.group(1)]) if m.group(1) in v else m.group(0), tpl)

NARRATION_CSV = r"""context_key,tone,weight,template
event.stroke,黑色幽默,4,{eng}突然在辦公室倒下送醫，臨走前還念念不忘下午要進《{case}》的版控。
event.stroke,冷笑話,3,{eng}過勞被救護車載走，主管第一時間關心『那他的筆電密碼是多少』？
event.stroke,悲涼,2,深夜辦公室警報響起，{eng}被抬上擔架，《{case}》的架構從此成為傳說。
event.delrepo,黑色幽默,4,{eng}遞辭呈前順手 rm -rf 了《{case}》整包 repo，備份？主管說『雲端不是會自動存嗎』。
event.delrepo,冷笑話,3,{eng}把《{case}》的庫刪得乾乾淨淨，只留一句 commit message：『祝貴公司順利』。
event.delrepo,悲涼,2,《{case}》的原始碼隨著{eng}的離職一起消失，就像從來沒存在過。
event.sales_flee,黑色幽默,4,業務{sales}留下了一句『我去外面拿合約』，就帶著 {amount}萬 訂金徹底登出人間。
event.sales_flee,竊喜,3,業務{sales}捲款 {amount}萬 跑路了，好險他走之前有把《{case}》的驗收單騙到手。
event.sales_flee,假掰新聞,3,快訊：外包業務{sales}人間蒸發，同行爆料其捲走 {amount}萬 後已定居海外。
event.client_bankrupt,黑色幽默,4,驚聞《{case}》的甲方倒閉，主管安慰大家：『至少不用再改那個通靈需求了。』
event.client_bankrupt,悲涼,3,《{case}》的尾款隨著甲方的破產化為烏有，幾個月的加班只換來滿滿的功德。
event.client_bankrupt,假掰新聞,3,財經快訊：大企業客戶破產重組，外包商《{case}》的 {amount}萬 尾款恐將打水漂。
event.cloud,黑色幽默,4,雲端服務全區大當機，各專案工程師齊聚茶水間，慶祝這難得的合法薪水小偷時光。
event.cloud,假掰新聞,3,快訊：跨國雲端機房驚傳斷線，全台資訊主管開始狂拜乖乖，案子風險全面暴增。
event.cloud,冷笑話,3,雲端機房大當機，主管大發雷霆：『為什麼雲端也會壞？雲不是在天上嗎？』
event.leftpad,黑色幽默,4,開源套件作者因為跟網友吵架怒刪套件，《{case}》瞬間連鎖崩潰，滿螢幕都是紅字。
event.leftpad,冷笑話,3,一個在 GitHub 上只有 10 顆星的開源套件下架了，《{case}》的整個前端隨之蒸發。
event.leftpad,平述,3,因為底層開源套件無預警遭刪除，《{case}》遭遇嚴重編譯失敗，風險急遽上升。
event.vip_crash,黑色幽默,4,長官視察當天，《{case}》完美示範了什麼叫『展示必當機定律』，長官臉色比螢幕還黑。
event.vip_crash,冷笑話,3,長官剛點下『確定』，《{case}》當場噴出藍白畫面，業務連忙解釋這是最新護眼模式。
event.vip_crash,悲涼,2,在長官關切的眼神中，《{case}》無情地跳出 Out of Memory，全場陷入死寂。
event.vip_ok,竊喜,5,長官視察時《{case}》竟然奇蹟般沒當機，你笑著和長官握手合照，這張照片值回票價。
event.vip_ok,黑色幽默,4,《{case}》在 Demo 時發揮了 120% 的穩定度順利騙過長官，合照順便蹭了一波熱度。
event.vip_ok,平述,3,長官視察圓滿落幕，《{case}》驚險過關，合照留念為公司信譽加分不少。
event.poached,悲涼,3,{rival} 用兩倍薪水挖走了你的王牌工程師{eng}（產能 {stat}），留下一堆看不懂的代碼。
event.poached,黑色幽默,4,{eng}被 {rival} 挖走了，臨走前發訊息說：『那邊至少有免費的零食和勞健保。』
event.poached,冷笑話,3,王牌{eng}跳槽到 {rival}，你安慰自己：『很好，他去用技術債禍害對手了。』
event.media_exposed,假掰新聞,4,獨家爆料：某知名外包商的甩鍋黑歷史遭記者起底，多起《{case}》的延宕爭議浮上檯面。
event.media_exposed,黑色幽默,3,你的經典甩鍋話術上了週刊頭條，網友紛紛表示：『這就是台灣科技業的日常嘛。』
event.media_exposed,悲涼,2,記者揭露了公司的外包黑幕，客戶紛紛打來關切，累積的信譽一夕之間化為烏有。
event.media_clean,竊喜,4,記者在公司的專案資料夾裡翻了半天，因為看不懂那些疊床架屋的架構，最後悻悻然離開。
event.media_clean,黑色幽默,3,爆料記者查不到把柄，因為我們的帳目跟《{case}》的代碼一樣，亂到連 AI 都理不出來。
event.media_clean,平述,3,媒體爆料無疾而終，記者查無具體違規事證，公司驚險避開一場公關危機。
event.windfall,竊喜,5,那筆拖了兩年的陳年應收帳款竟然突然入帳了！ {amount}萬 的意外之財讓公司原地滿血。
event.windfall,黑色幽默,4,已經倒閉的前甲方突然清算資產，匯來了 {amount}萬 欠款，會計還以為是詐騙集團。
event.windfall,平述,3,收到過往專案的催收尾款 {amount}萬，公司現金流獲得極大緩解。
event.ransom,黑色幽默,4,勒索軟體鎖住了公司 NAS，駭客在 readme 留下錢包地址，親切索討 {amount}萬 贖金。
event.ransom,冷笑話,3,公司 NAS 被勒索軟體加密，駭客要 {amount}萬 贖金，但裡面其實只有迷片跟過期簡報。
event.ransom,假掰新聞,3,快訊：知名軟體公司遭新型勒索軟體肆虐，駭客開價 {amount}萬，正考驗管理層的智慧。
news.rival_hurt,假掰新聞,4,業界快訊：{rival} 的『AI 驅動雲原生區塊鏈平台』被拆穿，底層是一顆共用 Excel。
news.rival_hurt,竊喜,4,聽說 {rival} 承接的銀行案在半夜大爆炸，他們的工程師已經在機房睡了三天三夜。
news.rival_hurt,黑色幽默,3,{rival} 宣稱導入最新敏捷開發，結果因為每天都在開 Daily，完全沒時間寫 Code。
news.industry,假掰新聞,4,產業動態：數位轉型旗艦計畫預算再度追加，立委質詢痛批多數案子都是『新瓶裝舊酒』。
news.industry,冷笑話,3,業界傳聞：某大廠決定全面淘汰舊系統，改用由 {rival} 用特製 Excel 寫成的核心架構。
news.industry,假掰新聞,3,最新消息：政府宣布將加強軟體採購稽核，業界普遍認為這只會增加更多無意義的報告。
action.upsell_win,竊喜,5,靠著完美的嘴砲成功唬到肥羊，針對《{case}》追加了變更費 {amount}萬，今天又有和牛吃了。
action.upsell_win,黑色幽默,4,你把一個 bug 包裝成『未來擴充介面』，成功向甲方騙到 {amount}萬 的功能變更預算。
action.upsell_win,平述,3,對《{case}》進行追加預算談判成功，順利取得變更設計費 {amount}萬。
action.upsell_stiff,黑色幽默,3,面對預算死板的（{ctype}），你使出渾身解數，最後也只從《{case}》裡寒酸地擠出 {amount}萬。
action.upsell_stiff,悲涼,3,雖然嘴皮子都磨破了，但這種（{ctype}）的預算比石頭還硬，最終只擠出了 {amount}萬。
action.upsell_stiff,平述,3,由於（{ctype}）的預算僵化，追加變更費的嘗試受到限制，僅勉強收回 {amount}萬。
action.upsell_fail,黑色幽默,4,甲方不僅沒買單你的追加功能，還當場摔筆質問：『這不是原本合約就該含的嗎？』
action.upsell_fail,冷笑話,3,話術失敗，甲方看穿了你的意圖，冷冷地說：『我們是 {ctype}，不是盤子。』
action.upsell_fail,平述,3,追加變更預算遭甲方嚴正拒絕，雙方合作關係一度陷入緊張。
action.rescue,黑色幽默,4,狂燒加班費派資深工程師下去救《{case}》，終於把系統從死亡邊緣拉回來，罪孽稍微洗掉了一點。
action.rescue,悲涼,3,工程師們一邊哭一邊改《{case}》的技術債，風險雖然降了，但肝指數也全面亮紅燈。
action.rescue,平述,3,投入核心人力全面搶救《{case}》，成功降低專案風險並修補了部分系統漏洞。
action.resub,黑色幽默,4,完美發揮中間商精神！把《{case}》用三成預算再往下轉包給更嫩的下家，這顆球踢得又高又遠。
action.resub,冷笑話,3,《{case}》被你成功套娃外包，現在連你都不知道到底是誰在寫這份原始碼了。
action.resub,平述,3,將《{case}》部分模組轉包給下游廠商，藉此分散專案風險與開發壓力。
action.mess_report,黑色幽默,4,一封精準的匿名檢舉信寄給了監理機關，{rival} 違規外包的證據確鑿，當場被扣了 {dmg} 點血。
action.mess_report,竊喜,4,檢舉達人上身！檢舉 {rival} 專案經理沒有證照，看著監理機關找上他，他慘扣 {dmg} 血。
action.mess_report,假掰新聞,3,爆料成功，監理機關突擊檢查 {rival} 的專案進度，對手防線大亂，承受 {dmg} 點傷害。
action.mess_rumor,黑色幽默,4,在業界群組放出『{rival} 財務吃緊快倒了』的假消息，客戶紛紛開始動搖，對手當場內傷 -{dmg} 血。
action.mess_rumor,冷笑話,3,散布 {rival} 要引進廉價外包的謠言，搞得他們客戶人心惶惶，成功削弱對手 {dmg} 點血量。
action.mess_rumor,竊喜,3,謠言滿天飛！客戶開始質疑 {rival} 的續航力，對手在驚慌中慘扣 {dmg} 血。
action.mess_poach,竊喜,5,重金從 {rival} 那裡挖來了靈魂工程師{eng}（產能 {stat}），對手痛失大將，當場慘扣 {dmg} 血。
action.mess_poach,黑色幽默,4,你用每天供應免費手搖飲的承諾挖走 {rival} 的{eng}（產能 {stat}），對手氣到吐血 -{dmg}。
action.mess_poach,平述,3,成功挖角 {rival} 的核心開發人員{eng}（產能 {stat}），對手元氣大傷，承受 {dmg} 點打擊。
action.morale,黑色幽默,4,忍痛發了總共 {amount}萬 的獎金，工程師們看在錢的份上，眼神裡終於又有了短暫的靈魂。
action.morale,冷笑話,3,砸了 {amount}萬 發獎金，大家紛紛表示：『謝謝老闆，這樣我又能多撐兩個月不去看身心科了。』
action.morale,平述,3,發放專案激勵獎金共 {amount}萬，有效拉抬了團隊低迷已久的士氣。
card.poison,黑色幽默,4,你把一堆寫死 hardcode 的毒模組包裝成『成熟資產』便宜賣給 {rival}，坑得他當場暴扣 {dmg} 血。
card.poison,冷笑話,3,這套『成熟資產』裡滿滿都是十年前的雷，{rival} 當成寶買回去，系統直接內傷 -{dmg} 血。
card.poison,竊喜,4,完美的特洛伊木馬！將垃圾模組塞給 {rival}，看著他 debug 到崩潰並狂扣 {dmg} 血，心裡真爽。
card.lockin,黑色幽默,5,透過各種特製的非標準介面，將《{case}》深度綁死進甲方的核心，現在他恨透你卻完全換不掉你。
card.lockin,冷笑話,4,《{case}》的架構亂到只有你能通靈，甲方評估換掉你的代價是動搖國本，只好一輩子跪求你維護。
card.lockin,平述,3,成功實施廠商鎖定策略，使《{case}》成為甲方不可或缺的核心，牢牢掌握主導權。
card.refactor,黑色幽默,4,發動緊急重構！把《{case}》裡那些堆疊了三年的複製貼上代碼全部清掉，風險與罪孽奇蹟般大降。
card.refactor,悲涼,3,全團隊不眠不休三天三夜重構《{case}》，雖然風險大降，但地上也多了好幾把頭髮。
card.refactor,平述,3,執行《{case}》的架構優化與程式碼重構，顯著降低了系統潛在風險與技術債。
card.pr,黑色幽默,4,砸大錢找公關公司洗白，買了幾篇『數位轉型楷模』的報導，信譽大幅回補，罪孽瞬間洗清。
card.pr,假掰新聞,3,公關戰大勝！各大科技媒體同步刊登公司誠信經營專題，過往的甩鍋黑歷史被包裝成共創雙贏。
card.pr,平述,3,透過危機公關與和解程序，成功挽回公司社會形象，信譽獲得顯著回補。
card.disaster_cash,竊喜,5,把《{case}》因為我們自己搞砸的爛帳，包裝成『因應法規變更之系統調整』寄給甲方，反而爽進帳 {amount}萬！
card.disaster_cash,黑色幽默,4,系統越爛越賺錢！《{case}》出大包後，你順理成章開了一張 {amount}萬 的緊急搶修帳單，甲方還邊哭邊簽字。
card.disaster_cash,冷笑話,3,把災難變成財富密碼，靠著修復《{case}》自己產生的 bug，又向甲方成功敲詐了 {amount}萬。
blame.win,黑色幽默,4,你搬出『{method}』，甲方將信將疑地收下了這口鍋——《{case}》的爛帳，從此與你無關。
blame.win,冷笑話,3,靠著『{method}』的話術，成功讓《{case}》的責任全落到別人頭上，甲方雖然氣炸但拿你沒轍。
blame.win,竊喜,4,甩鍋成功！一句『{method}』就把《{case}》的延宕責任推得乾乾淨淨，今天又順利下班了。
blame.fail,黑色幽默,4,甩鍋當場翻車！甲方拿出聯絡紀錄當面拆穿，主管冷笑著說：『你當我們 {ctype} 沒人懂技術嗎？』
blame.fail,悲涼,3,精心編造的藉口被甲方工程師一秒戳破，現場氣氛尷尬到極點，信譽與關係徹底惡化。
blame.fail,平述,3,推卸責任的嘗試以失敗告終，遭甲方高層當場駁回，雙方信任基礎完全破裂。
blame.sue,假掰新聞,4,甩鍋大失敗！甲方氣到直接發出律師函，法院正式提告要求公司賠償 {amount}萬 的專案損失。
blame.sue,黑色幽默,3,這次鍋太重沒甩掉，反而砸碎了自己的腳，甲方憤而提告，公司帳戶當場被扣走 {amount}萬。
blame.sue,悲涼,2,法律途徑見！甲方拒絕任何協商並正式起訴，法官判決我方需賠償 {amount}萬，損失極其慘重。
season.terminate,假掰新聞,5,重磅：身為 {ctype} 的甲方忍無可忍，正式宣布終止《{case}》的合約，並依法求償 {amount}萬。
season.terminate,黑色幽默,4,甲方高層拍桌怒吼：『這系統連小學生寫的都不如！』隨即中止合約，丟來一張 {amount}萬 的求償單。
season.terminate,悲涼,3,《{case}》還是走到了終點。甲方憤而解約並求償 {amount}萬，幾季的努力化為泡影。
season.explode,黑色幽默,4,累積了三年的 {ctype} 技術債在今晚全面炸開，《{case}》系統崩潰，客服電話被憤怒的民眾打爆。
season.explode,冷笑話,3,當初為了趕進度留下的地雷同時引爆，《{case}》完美癱瘓，畫面上的 Loading 轉了一輩子。
season.explode,假掰新聞,4,快訊：某大型 {ctype} 核心系統《{case}》傳出全面癱瘓，疑似因長期技術債未清導致連鎖潰敗。
explode.scapegoat,黑色幽默,4,在記者會上把工程師{eng}推出去揹『人為疏失』的黑鍋，雖然公司帳面乾淨了，但團隊士氣瞬間崩盤。
explode.scapegoat,冷笑話,3,你告訴媒體是{eng}按錯鍵，完美保住了公司名譽，但留下來的工程師看你的眼神都充滿了戒備。
explode.scapegoat,悲涼,2,為了安撫甲方，{eng}成了最完美的替罪羔羊。他默默收拾行李離開，帶走了團隊最後的信任。
explode.eat,黑色幽默,4,甩不掉也推不掉，你只好咬緊牙關硬扛，認賠 {amount}萬 來收拾《{case}》留下的史詩級殘局。
explode.eat,悲涼,3,所有的藉口都失效了，公司被迫自掏腰包 {amount}萬 進行緊急搶修，這季的利潤全部吐了回去。
explode.eat,平述,3,面對無法規避的系統災難，公司決定自行吸收 {amount}萬 的虧損，全力收拾專案殘局。
rival.collapse,竊喜,5,{rival} 週轉不靈，正式退出旗艦計畫。你笑著接收了他的殘骸與客戶，+{amount}萬 入帳。
rival.collapse,假掰新聞,4,快訊：老牌軟體商 {rival} 驚傳倒閉，旗下多項政府標案停擺，市場將由同行接手，帶進 {amount}萬 產值。
rival.collapse,黑色幽默,4,{rival} 終於被自己的技術債壓垮宣布破產，你一邊幫他上香，一邊開心地收編他的客戶和 {amount}萬 市場。
rival.inherit,黑色幽默,4,政府半強迫你接下 {rival} 倒閉後留下的《{case}》——這是一個 {ctype} 中沒文件、沒交接的前朝神仙毒案。
rival.inherit,冷笑話,3,你接手了 {rival} 的遺產《{case}》[{ctype}]，打開代碼的那一刻，你覺得這根本是歷史文物考古。
rival.inherit,悲涼,2,被迫接下 {rival} 留下的《{case}》[{ctype}] 爛攤子，沒有交接、沒有架構圖，只有滿滿的詛咒。
audit.clean,黑色幽默,4,監理機關的稽核翻了翻報表，被我們精美的簡報與假資料完美欺騙，有驚無險過關。
audit.clean,竊喜,3,稽核人員查無異常！看來把技術債包裝成『未開放隱藏功能』的策略成功騙過了所有人。
audit.clean,平述,3,順利通過監理機關的專案稽核，所有帳目與合規指標皆符合標準，安全過關。
audit.dodged,黑色幽默,4,大限將至！但在最後關頭你靠著強大的政商公關，成功把稽核小組『擺平』了，下不為例。
audit.dodged,竊喜,4,稽核來勢洶洶，好在公關經理送禮送得及時，對方收起放大鏡，暗示這次先放你一馬。
audit.dodged,平述,3,透過積極的公關協調與高層溝通，成功延緩並規避了本次嚴格的官方稽核。
audit.fined,假掰新聞,4,重罰通報：監理機關查出該公司嚴重的甩鍋史與龐大技術債，依法重罰 {amount}萬 並登上媒體頭條。
audit.fined,黑色幽默,3,稽核一翻開程式碼就吐了，直接認定為重大違規，開出一張 {amount}萬 的罰單，順便幫你上了新聞。
audit.fined,悲涼,2,逃得過初一逃不過十五，稽核清算技術債，重罰 {amount}萬，公司的黑歷史這下全台皆知了。
ending.survive,黑色幽默,4,15季過去了，你活了下來。你的義大利麵代碼已經深深纏進全國系統，客戶雖然恨透你卻永遠換不掉你。
ending.survive,悲涼,3,你活了下來，但代價是團隊的靈魂與名譽。公司成了一台只會蓋章和甩鍋的無情合約機器。
ending.survive,冷笑話,3,恭喜通關！公司既沒壯大也沒倒閉，靠著幾套會自動產生 bug 的系統，成功達成了 IT 界的永續經營。
ending.solo,黑色幽默,5,你熬死了所有對手，獨活到最後。政府養出了一隻靠吃同伴屍體長大、全台拔不掉的核心資訊怪物——就是你。
ending.solo,竊喜,5,戰場上只剩下你了！對手全被你的甩鍋和毒模組坑殺，從今天起，全台灣的肥單都是你的了。
ending.solo,假掰新聞,4,產業終局：該公司完成市場大壟斷，成為國內唯一的特大型軟體中間商，徹底掌控所有採購生殺大權。
ending.lose_cash,悲涼,4,現金流徹底斷鏈，發薪日當天辦公室空無一人。這家曾經叱吒風雲的中間商，就此默默倒閉。
ending.lose_cash,黑色幽默,3,帳戶餘額歸零，連買乖乖的錢都沒了。公司因發不出薪水宣告破產，工程師們連夜搬走了人體工學椅。
ending.lose_cash,假掰新聞,4,快訊：知名軟體顧問公司因資金週轉不靈，驚傳惡性倒閉，數十起進行中的專案陷入停擺。
ending.lose_morale,悲涼,4,團隊集體崩潰，工程師跟業務集體離職。空蕩蕩的辦公室裡只剩下無人維護的伺服器，公司正式解體。
ending.lose_morale,黑色幽默,3,最後一個會看代碼的人也登出了。由於徹底無人可用，公司連履約的簡報都做不出來，只能黯然解散。
ending.lose_morale,冷笑話,3,大家都不幹了！士氣歸零的下場就是集體去開雞排店，這家外包顧問公司正式走入歷史。
ending.lose_audit,假掰新聞,5,重磅：因長期舞弊與重大技術詐欺，該公司遭到監理機關全面清算，永久剔除於旗艦計畫外並勒令解散。
ending.lose_audit,黑色幽默,4,稽核終極大審判！公司的甩鍋與假帳全部見光，法院一紙公文下來，公司直接被強制勒令解散。
ending.lose_audit,悲涼,3,清算的名單上印著公司的名字。在監理機關的鐵腕執法下，所有標案被沒收，公司就此灰飛煙滅。
event.stroke,黑色幽默,4,{eng}連續加班 72 小時後中風送醫，手裡還緊握著寫到一半的《{case}》說明書。
event.stroke,冷笑話,3,{eng}累倒送醫，醫生說他心跳只剩 404 Not Found，《{case}》專案戰力瞬間歸零。
event.stroke,悲涼,2,{eng}被救護車載走時，群組還在跳《{case}》的修改需求，他的位置只剩一杯冷掉的黑咖啡。
event.sales_flee,黑色幽默,4,業務 {sales} 捲走《{case}》訂金 {amount}萬 潛逃，據說他留下的最後一句話是『我去跑外送了』。
event.sales_flee,竊喜,3,業務 {sales} 拿著 {amount}萬 潛逃去澳洲，幸好他逃跑前把《{case}》合約簽完了，這算職災吧？
event.sales_flee,平述,3,業務 {sales} 帶著專案訂金 {amount}萬 搞失蹤，桌上只留下一本『財富自由的秘密』。
event.client_bankrupt,黑色幽默,4,《{case}》的甲方無預警倒閉，辦公室只剩被查封的椅子，剩下 {amount}萬 尾款直接蒸發。
event.client_bankrupt,悲涼,2,辛辛苦苦做完《{case}》，換來的卻是甲方公司的清算破產通知，{amount}萬 尾款成了一紙空文。
event.client_bankrupt,假掰新聞,3,快訊：{ctype} 驚傳財務危機倒閉，承包商苦等之 {amount}萬 工程尾款恐將血本無歸。
event.cloud,黑色幽默,4,雲端全區大當機，機房綠色乖乖過期，《{case}》跟著全球網路一起陷入永夜。
event.cloud,冷笑話,3,雲端服務商說他們有 99.9% 可用性，很不幸，今天就是那剩下的 0.1%，所有專案全面停擺。
event.cloud,平述,3,全球雲端服務中斷，《{case}》系統瞬間與外界斷聯，專案風險指數直線飆升。
event.leftpad,黑色幽默,4,開源套件作者因為不爽被大廠指責而刪除套件，導致《{case}》在編譯時全面崩潰。
event.leftpad,冷笑話,3,一個十一行的開源套件被作者下架，《{case}》整座義大利麵程式碼城堡當場倒塌。
event.leftpad,平述,3,《{case}》依賴的國外底層套件無預警遭作者刪除，專案瞬間卡死在編譯階段。
event.vip_crash,黑色幽默,5,長官視察日，主秘一按按鈕《{case}》直接跳藍畫面，全場官員一臉尷尬地看著你。
event.vip_crash,冷笑話,3,千算萬算，沒算到《{case}》會在長官點擊 Demo 的那零點一秒跳出內部錯誤訊息。
event.vip_crash,悲涼,2,排練了十次的《{case}》Demo，在長官蒞臨的關鍵時刻，無情地跳出了 NullPointerException。
event.vip_ok,竊喜,4,長官視察日，《{case}》剛好沒出包，你成功蹭到一張與局長的握手合照，信譽大增。
event.vip_ok,黑色幽默,4,全靠前端工程師寫死 Mock 資料，長官視察《{case}》順利通過，還誇獎介面很流暢。
event.vip_ok,冷笑話,3,《{case}》在長官點擊時奇蹟般地沒崩潰，你偷偷把手背在後面擦掉掌心的冷汗。
event.poached,黑色幽默,4,{rival} 開出雙倍薪水，挖走了你的王牌工程師 {eng}，順便帶走了《{case}》的所有架構秘密。
event.poached,悲涼,3,{eng} 留下一句『這裡看不到未來』，便跳槽到 {rival}，臨走前帶走了 {stat} 點產能。
event.poached,平述,3,王牌工程師 {eng} 禁不起高薪誘惑跳槽至 {rival}，你的團隊頓時失去 {stat} 點的核心產能。
event.media_exposed,假掰新聞,4,驚爆！網路媒體專題起底，披露你將《{case}》爛帳甩鍋給實習生的黑歷史，引發網民熱議。
event.media_exposed,黑色幽默,4,記者把你的甩鍋對話紀錄做成懶人包上傳，網民封你為『外包界甩鍋達人』，信譽重創。
event.media_exposed,悲涼,2,過去靠『{method}』脫身的醜聞被媒體爆料，原本要談的 {ctype} 案子當場告吹。
event.media_clean,竊喜,4,週刊記者在公司樓下蹲點三天，翻遍了《{case}》的垃圾桶也找不到把柄，最後悻悻然離開。
event.media_clean,冷笑話,3,記者想查你的專案弊案，卻發現你的程式碼亂到連資深駭客都看不懂，只好放棄報導。
event.media_clean,平述,3,外部稽核與媒體聯手調查《{case}》，但因甩鍋紀錄藏得太深，查無實據，無功而返。
event.windfall,竊喜,5,五年前那個《{case}》的陳年應收帳款，今天突然莫名其妙入帳了 {amount}萬，賺爛了！
event.windfall,黑色幽默,4,過期的 {ctype} 專案突然撥款 {amount}萬，看來是甲方會計做帳做錯，你趕緊默默收下。
event.windfall,平述,3,歷史專案《{case}》的尾款 {amount}萬 終於通過審核並匯入戶頭，稍微緩解了燃眉之急。
event.ransom,黑色幽默,4,勒索軟體鎖住了公司所有的開發 NAS，畫面上跳出紅字，索討比特幣折合新台幣 {amount}萬。
event.ransom,冷笑話,3,駭客入侵了《{case}》的伺服器，但發現裡面都是垃圾扣，於是只索討了少少 {amount}萬 的清潔費。
event.ransom,平述,3,全公司源碼備份碟遭惡意勒索軟體加密，駭客留下電子郵件勒索金額高達 {amount}萬。
news.rival_hurt,竊喜,4,聽說 {rival} 承包的 {ctype} 標案今天在驗收時系統當機，局長當場大發雷霆，真是大快人心。
news.rival_hurt,黑色幽默,4,{rival} 的資深架構師在 PTT 爆料內部黑幕，指控高層天天逼大家寫義大利麵程式碼，股價重挫。
news.industry,假掰新聞,4,立法院今日針對數位轉型旗艦計畫進行質詢，多位立委痛批國內 {ctype} 資訊品質流於形式。
news.industry,冷笑話,3,業界傳聞：某知名外包商為了應付勞檢，規定工程師下班後必須改用遠端連線繼續無薪加班。
news.industry,平述,3,經濟部宣布加碼推動全新資訊服務升級專案，各大外包顧問公司已開始摩拳擦掌準備搶標。
action.upsell_win,竊喜,5,你靠著『AI 賦能高併發架構』的話術唬住甲方，成功追加了 《{case}》 的變更費 {amount}萬。
action.upsell_win,黑色幽默,4,只是把網頁按鈕從方形改到圓形，你搬出使用者體驗大道理，跟甲方多收了 {amount}萬 的需求變更費。
action.upsell_win,冷笑話,3,甲方竟然相信了你的『量子優化雲端架構』，爽快地在《{case}》追加合約上簽字，進帳 {amount}萬。
action.upsell_stiff,平述,3,你試圖對《{case}》追加預算，但這種 {ctype} 預算卡得很死，磨了半天只勉強擠出 {amount}萬。
action.upsell_stiff,黑色幽默,3,這家 {ctype} 出了名的鐵公雞，你講得天花亂綴，最後《{case}》也只肯多給 {amount}萬 的茶水費。
action.upsell_stiff,悲涼,2,好不容易說服甲方修改《{case}》功能，但受限於合約法規，最終只拿到了微薄的 {amount}萬 補助。
action.upsell_fail,黑色幽默,4,你把『重啟伺服器』包裝成高級維護方案推銷，結果被甲方技術長當場識破，場面一度十分尷尬。
action.upsell_fail,悲涼,3,想對《{case}》獅子大開口追加預算，結果甲方不但沒買單，還覺得你把他們當肥羊耍，關係降到冰點。
action.upsell_fail,冷笑話,3,話術太假掰，連對資訊一竅不通的甲方窗口都聽不下去，直接退回了你的《{case}》預算變更申請。
action.rescue,平述,3,不得不發包或派幾名工程師去救《{case}》，天天熬夜爆肝，總算把專案風險給壓了下去。
action.rescue,黑色幽默,4,你派出了最會通霄加班的肝帝團隊接管《{case}》，用新鮮的肝換取專案風險的些微下降。
action.rescue,悲涼,3,為了挽救快要夭折的《{case}》，工程師們只能一邊擦眼淚一邊重寫程式碼，勉強洗掉了一點罪孽。
action.resub,黑色幽默,4,你把《{case}》以三分之一的價格轉包給更下游的工作室，完美地將皮球踢給了沒經驗的大學生。
action.resub,冷笑話,3,《{case}》轉包成功！你現在不是開發商，你只是個尊貴的『規格書搬運工』與『爛攤子中轉站』。
action.resub,平述,3,將《{case}》的部分核心開發工作發包給更下游的中小企業，成功分散了專案暴斃的風險。
action.mess_report,竊喜,4,你具名向主管機關檢舉 {rival} 違反資安規定，監理機關立刻上門稽查，看著他當場扣了 {dmg} 點血。
action.mess_report,黑色幽默,4,一封匿名檢舉信，告發 {rival} 專案經理偽造簽入紀錄，成功引來勞檢，害他當場失血 {dmg} 點。
action.mess_report,平述,3,檢舉 {rival} 的外包原始碼抄襲開源專案，驚動了監理機關介入調查，重挫其體力 {dmg} 點。
action.mess_rumor,竊喜,4,你在科技業群組放出 {rival} 現金流斷裂、快要倒閉的假消息，急得他的客戶紛紛動搖，使其扣血 {dmg} 點。
action.mess_rumor,黑色幽默,4,小道消息指出 {rival} 負責人準備捲款潛逃，雖然是假的，但成功引發客戶集體恐慌，讓他大失血 {dmg} 點。
action.mess_rumor,冷笑話,3,你造謠說 {rival} 辦公室的綠色乖乖全部換成了黃色五香，客戶一聽嚇得紛紛抽單，重傷他 {dmg} 點血。
action.mess_poach,竊喜,5,成功從 {rival} 那裡挖角了資深工程師 {eng}，現賺 {stat} 點產能，還順手砍了對手 {dmg} 點血。
action.mess_poach,黑色幽默,4,用每天免費供應下午茶的條件，就把 {rival} 的核心開發者 {eng} 給拐了過來，害對方重傷失血 {dmg} 點。
action.mess_poach,平述,3,挖角對手大將 {eng}，不僅為公司注入 {stat} 點產能，更直接打擊了 {rival} 的開發進度，使其扣血 {dmg} 點。
action.morale,黑色幽默,4,為了挽回快崩潰的團隊士氣，你忍痛發了總計 {amount}萬 的獎金，工程師們看在錢的面子上決定再熬一晚。
action.morale,冷笑話,3,發放了總額 {amount}萬 的『爆肝安慰獎金』，雖然治不好黑眼圈，但至少大家看螢幕的眼神多了一點光。
action.morale,平述,3,提撥 {amount}萬 作為階段性達標獎金發放給基層，團隊低迷的士氣終於迎來了顯著的回升。
card.poison,黑色幽默,4,你把一個埋滿了死結與記憶體漏失的毒模組包裝成『成熟資產』賣給 {rival}，坑得他當場大失血 {dmg} 點。
card.poison,竊喜,5,高明！將充滿歷史技術債的舊架構包裝成企業級解決方案塞給 {rival}，害他們維護到吐血，狂扣 {dmg} 點。
card.poison,冷笑話,3,{rival} 滿心歡喜地收下了你分享的『資深架構元件』，卻不知那是個定時炸彈，當場炸掉他 {dmg} 點血。
card.lockin,黑色幽默,5,你把《{case}》寫得像迷宮一樣，除了你沒人看得懂，甲方雖然恨透了你，但為了系統運作根本換不掉你。
card.lockin,竊喜,4,成功將專案程式碼與你的個人伺服器綁定，這下《{case}》徹底綁死在甲方核心，他們一輩子都得付你維護費。
card.lockin,冷笑話,3,《{case}》的底層充斥著只有你能解開的神秘黑魔法，甲方技術長看了搖頭嘆氣，卻也只能乖乖續約。
card.refactor,平述,3,下定決心對《{case}》進行全面性的緊急重構，清理了大量歷史垃圾程式碼，風險與罪孽雙雙大降。
card.refactor,黑色幽默,4,工程師不眠不休把《{case}》的義大利麵條理順成了通心粉，雖然還是麵，但專案風險總算大幅下降了。
card.refactor,悲涼,3,刪除了數萬行沒人敢動的陳年舊碼後，《{case}》奇蹟般地變快了，過去累積的專案罪孽也隨之洗清。
card.pr,黑色幽默,4,砸下大筆預算和解公關，找網紅拍片宣導公司對社會的資訊貢獻，罪孽瞬間大降，信譽補滿。
card.pr,假掰新聞,3,發布新聞稿澄清之前的專案爭議，並宣布成立數位公益基金，成功扭轉企業形象，信譽大幅回補。
card.pr,平述,3,透過專業公關團隊進行危機處理與媒體洗地，平息了《{case}》的負面輿論，罪孽大降、信譽回升。
card.disaster_cash,竊喜,5,高招！你把《{case}》因為自己疏失產生的爛帳，包裝成『非預期系統環境優化』寄給甲方，反而進帳 {amount}萬。
card.disaster_cash,黑色幽默,4,《{case}》系統炸裂，你卻藉機向甲方宣稱需要緊急調度專家支援，最後居然順利收到了 {amount}萬 的急件處理費。
card.disaster_cash,冷笑話,3,把專案的災難現場變成提款機，甲方為了息事寧人，居然乖乖支付了專案善後特別預算 {amount}萬。
blame.win,竊喜,4,憑著三寸不爛之舌用『{method}』成功把《{case}》的出包甩鍋給協力廠商，自己拍拍屁股完美脫身。
blame.win,冷笑話,3,開會時用『{method}』把系統崩潰解釋成天災，甲方雖然氣到火冒三丈，卻找不到法律依據告你。
blame.fail,黑色幽默,4,甩鍋翻車！你試圖用話術搪塞，卻被甲方的資深資訊顧問當場用 log 紀錄打臉，信譽徹底掃地。
blame.fail,悲涼,3,甩鍋失敗的代價是沉重的，甲方當場拆穿了你的謊言，雙方關係徹底惡化，再也沒有合作可能。
blame.fail,平述,3,在《{case}》的危機檢討會上編造藉口失敗，被甲方點出核心關鍵，甩鍋計畫當場破功。
blame.sue,悲涼,4,甩鍋大失敗，甲方徹底失去耐性直接提告，法庭判決公司必須賠償高達 {amount}萬 的違約損失。
blame.sue,假掰新聞,4,最新消息：因《{case}》系統延宕且惡意推諉責任，承包商遭甲方正式起訴，恐將面臨 {amount}萬 的天價索賠。
blame.sue,黑色幽默,4,你想把鍋甩給實習生，結果甲方氣到直接請律師發存證信函，這下非但沒脫身，還要倒貼 {amount}萬 賠償金。
season.terminate,悲涼,4,《{case}》這口爛井終究引來了惡果，這家 {ctype} 甲方忍無可忍，正式宣告終止合約並依法求償 {amount}萬。
season.terminate,假掰新聞,4,快訊：由於長期的專案品質不佳，該 {ctype} 決定與承接商終止《{case}》契約，並追討 {amount}萬 的賠償金。
season.terminate,黑色幽默,4,甲方窗口哭著說他再也不想看到你的臉，隨後寄來了《{case}》解約通知書，順便附帶了一張 {amount}萬 的求償帳單。
season.explode,黑色幽默,5,經年累月堆積的技術債終於在今天集體引爆，《{case}》這座由 {ctype} 委託的巨型義大利麵系統宣告全面崩潰。
season.explode,悲涼,4,再多的補丁也救不回底層的腐爛，隨著最後一隻蟲的觸發，《{case}》[{ctype}] 系統在跨年夜徹底炸裂。
season.explode,冷笑話,3,《{case}》[{ctype}] 的技術債多到連資料庫都選擇放棄思考，系統在今天正式宣告陣亡，神仙難救。
explode.scapegoat,黑色幽默,4,你把寫出第一行程式碼的工程師 {eng} 推出去揹上『人為疏失』的黑鍋，雖然帳面乾淨了，但全隊士氣瞬間見底。
explode.scapegoat,悲涼,3,為了應付甲方的怒火，你開除了無辜的 {eng} 來當作祭品，看著他落寞收拾桌子的背影，辦公室一片死寂。
explode.scapegoat,平述,3,將《{case}》崩潰的責任全數歸咎於工程師 {eng} 的操作不當，成功對外交代，卻也徹底摧毀了團隊內部信任。
explode.eat,平述,3,無路可退，你只能選擇硬扛下所有責任，自掏腰包砸下 {amount}萬 預算，沒日沒夜地收拾《{case}》留下的殘局。
explode.eat,悲涼,4,甩鍋招式全部失效，你只得認賠 {amount}萬，逼著所有人吞下胃藥，留下來應付《{case}》這爛攤子。
explode.eat,黑色幽默,4,你一邊痛哭一邊簽下 {amount}萬 的虧損支票，這就是試圖用雞腿換大卡車專案的最終代價，《{case}》的殘局還是得自己收。
rival.collapse,黑色幽默,4,天道好還！對手 {rival} 因為技術債炸裂宣告破產，你趁火打劫接收了他們的市場份額，順便進帳 {amount}萬。
rival.collapse,假掰新聞,4,快訊：資深外包商 {rival} 今日驚傳倒閉，其原有的市場份額預計將由同行瓜分，估計帶來約 {amount}萬 的商機。
rival.inherit,黑色幽默,4,政府半強迫你接下 {rival} 倒閉後留下的《{case}》[{ctype}]，這是一個沒有任何文件、全靠通靈開發的神仙毒案。
rival.inherit,悲涼,4,上頭一紙公文，命令你限期接手 {rival} 放棄的《{case}》[{ctype}]，面對毫無交接的前朝遺毒，你欲哭無淚。
rival.inherit,冷笑話,3,恭喜獲得福袋！你被強迫繼承了 {rival} 的遺產——一個充滿詛咒、架構成謎的 《{case}》[{ctype}] 專案。
audit.clean,平述,3,監理機關的專業稽核上門抽查，好在帳面做得很乾淨，各項指標皆符合規範，有驚無險地順利過關。
audit.clean,黑色幽默,4,靠著會計與專案經理聯手打造的完美假帳，監理機關翻了半天沒看出端倪，《{case}》成功躲過一劫。
audit.clean,竊喜,3,稽核人員翻看著漏洞百出的系統，卻被你準備的精美簡報給唬了過去，拍拍你的肩膀宣布順利結案。
audit.dodged,黑色幽默,4,官方稽核風雨欲來，你連夜請高層喝茶、找公關居中協調，終於大事化小，下不為例。
audit.dodged,竊喜,4,眼看稽核就要查到關鍵的甩鍋紀錄，你及時發動公關攻勢轉移焦點，成功擺平了這場滅頂之災。
audit.dodged,平述,3,面對監理機關的步步逼近，你動用人脈進行了一場教科書級的公關游擊戰，成功讓稽核雷聲大雨點小地落幕。
audit.fined,假掰新聞,5,震驚！監理機關查出你長年甩鍋與隱瞞技術債的惡劣行徑，依法重罰 {amount}萬，並登上財經版頭條。
audit.fined,悲涼,4,稽核大刀砍下，你過去隱瞞的所有爛帳被一次翻出，不僅要繳納 {amount}萬 的罰鍰，商譽更是毀於一旦。
audit.fined,黑色幽默,4,監理機關不費吹灰之力就查到了你隱藏的技術債，一張 {amount}萬 的罰單直接寄到公司，這下全業界都知道了。
ending.survive,悲涼,5,15 季過去了，你活了下來。你做出的那坨義大利麵程式碼早已深深纏進了全國資訊系統，客戶雖然恨你，卻永遠換不掉你。
ending.survive,黑色幽默,4,你成功生存了下來。公司沒有創造任何科技奇蹟，但憑藉著無人能解的核心架構，你們成了大企業拔不掉的吸血水蛭。
ending.survive,平述,3,撐過了漫長的 15 季，雖然名聲狼藉，但靠著與各大甲方的利益綑綁，這家外包公司成功在市場上站穩了腳步。
ending.solo,黑色幽默,5,對手全數覆滅，你獨自存活。政府本想培育資訊航母群，卻養出了一隻靠著吃同伴屍體長大、再也拔不掉的資訊怪物——就是你。
ending.solo,竊喜,5,市場上再也沒有對手。你熬死了所有同行，獨吞了所有的肥大標案，你就是這個外包食物鏈最頂端的終極霸主。
ending.solo,悲涼,4,舉目望去，四周已是一片焦土。你靠著不斷地下包與甩鍋熬死了所有人，成為了這座由技術債築成的荒蕪帝國裡唯一的孤王。
ending.lose_cash,悲涼,5,現金流徹底斷鏈，下個月的薪水一毛也發不出來，工程師們默默收拾行李離開，公司在無聲中宣告倒閉。
ending.lose_cash,假掰新聞,4,財經快訊：知名軟體外包商因長期過度擴張與工程款延宕，今日因現金斷鏈正式宣告破產倒閉。
ending.lose_cash,黑色幽默,4,存摺餘額歸零，連買綠色乖乖的錢都付不出來。你站在空無一人的辦公室裡，終於明白外包中間商不是那麼好當的。
ending.lose_morale,悲涼,5,無止盡的加班與甩鍋終於壓垮了所有人，團隊集體崩潰離職，看著空蕩蕩的辦公室，你明白這家公司已經徹底解體。
ending.lose_morale,黑色幽默,4,工程師與業務在同一個下午集體退群，辦公室裡只剩下一台還在瘋狂報錯的伺服器，無人可用，公司正式完蛋。
ending.lose_morale,平述,3,團隊士氣徹底歸零，員工成群結隊向勞工局申訴，公司因核心開發與業務人員流失殆盡，被迫宣告解散。
ending.lose_audit,假掰新聞,5,突發：監理機關完成對該外包商的全面清算，因情節重大，正式將其踢出國家旗艦計畫並勒令解散。
ending.lose_audit,黑色幽默,4,監理機關丟來一份厚達千頁的犯罪與欺瞞報告，直接撤銷了你的營業執照，你的外包帝國在公權力面前煙消雲散。
ending.lose_audit,悲涼,4,所有的甩鍋手段在國家級的清算面前都成了笑話，公司被強制註銷並逐出所有政府專案，落得個身敗名裂的下場。
"""

NAR = Narrator(csv_text=NARRATION_CSV)
_G = None   # 指向當前 Game，供 narr() 自動補變數

def narr(key, **kw):
    """抽旁白並自動補齊 case/ctype/rival/eng/sales 等變數；沒模板則回 None。"""
    g=_G; d=dict(kw)
    if g is not None:
        if "case" not in d and getattr(g,"cases",None):
            c=random.choice(g.cases); d.setdefault("case",c.name); d.setdefault("ctype",c.atype)
        if "rival" not in d:
            rs=[r for r in g.rivals if r.alive] or list(getattr(g,"rivals",[]))
            if rs: d["rival"]=random.choice(rs).name
        if "eng" not in d and g.staff_of("工程師"): d["eng"]=random.choice(g.staff_of("工程師"))["name"]
        if "sales" not in d and g.staff_of("業務"): d["sales"]=random.choice(g.staff_of("業務"))["name"]
    d.setdefault("case","某專案"); d.setdefault("ctype","某案"); d.setdefault("rival","某同業")
    d.setdefault("eng","某工程師"); d.setdefault("sales","某業務")
    d.setdefault("amount","若干"); d.setdefault("dmg","不少"); d.setdefault("stat","?"); d.setdefault("method","那套說法")
    return NAR.say(key, **d)

def sayline(key, prefix="  ", **kw):
    """印一句旁白；若該 key 沒模板，回傳 False 讓呼叫端印原本的備援文字。"""
    s=narr(key, **kw)
    if s is None: return False
    print(prefix+s); return True


# ============================================================
CONFIG = {
    "seasons_to_survive": 15,
    "actions_per_season": 5,
    "start_cash": 1000,
    "salary": {"業務": 12, "PM": 15, "工程師": 22},
    "rent": 15,

    "risk_explode_at": 100,
    "risk_rise_base": (8, 16),

    "bid_dc_base": 10,
    "bid_dc_per_load": 3,
    "bid_dc_per_rival": 1,          # 用 (存活對手-1)，少墊一點
    "bid_buzzword": 1,              # buzzword 保底加成（小）
    "max_cases_per_pm": 2,

    "upsell_base": (150, 300),      # 乘上案型 upsell_mult
    "upsell_cooldown": 2,           # 同一案幾季內不能再收

    "rescue_dc": 12, "rescue_cost": 80, "rescue_risk_cut": (35, 55), "rescue_sin_cut": 6,
    "soothe_dc": 11, "soothe_sat_gain": 18,
    "resub_risk_shift": 25, "resub_rep_hit": 5, "resub_rebound": (16, 30),

    "draw_cost": 90,
    "blame_sin_base": 15, "blame_risk_cut": 40,

    "morale_cost": 60, "morale_gain": 16,
    "recon_cost": 40,

    "sat_sue_at": 20, "sue_penalty": (120, 240),

    "audit_interval": (4, 6), "audit_sin_soft": 45, "audit_penalty": (100, 320),

    "cards_per_season": 3,
    "morale_start": 70, "morale_decay": 5, "morale_disaster_at": 15,
    "morale_pm_buffer": 1,          # 每個 PM 減緩 1 點衰減（中階主管穩住團隊）
    "morale_decay_floor": 2,
    "morale_lowpressure": 1,
    "morale_rival_hurt": 1,
    "morale_rival_collapse": 3,
    "morale_mess": 2,               # 搞同行成功 → 出一口氣

    "event_chance": 0.6, "event_double": 0.22, "event_cooldown": 3,

    # 對手
    "rival_hp_start": (46, 66),
    "rival_ambient_dmg": (-2, 6),    # 淨值略向上：放著不管對手會回血，逼你主動搞
    "inherit_risk": (55, 80),       # 接盤毒案的隱藏起始風險
    "kill_windfall": (300, 500),    # 搞死一家 → 接收市場（大獎勵，讓搞同行成為主線）
    "rival_pressure": 11,           # 每季每個「還活著的對手」扣現金 → 壓擺爛、獎勵清場
    "mess_report_dmg": (40, 56),    # 檢舉削血
    "mess_rumor_dmg": (12, 22),     # 放假消息削血
    "mess_poach_dmg": (24, 36),     # 挖角削血
    "card_poison_dmg": (48, 66),    # 毒模組卡削血
}

# ============================================================

# ── 難度模式開關（DEV 練習≈7成勝率 / PRD 真實≤5成）──
MODE = "DEV"        # 改這行切換：DEV(練習,寬鬆) 或 PRD(真實,硬核)
DIFF = {
    "DEV": dict(bid_income=1.15, kill_windfall=1.15, penalty=0.6, audit=0.5,
                rival_hp=0.85, grudge=0.0, retal=0.35),   # B：不記私仇、反撲溫和
    "PRD": dict(bid_income=1.2, kill_windfall=1.1, penalty=0.82, audit=0.72,
                rival_hp=0.92, grudge=1.0, retal=0.52),   # C：記私仇、終盤困獸全開
}
def D(k): return DIFF[MODE][k]

# 案子類型：隱藏參數（玩家看得到「類型」，看不到這些數字）
#   upsell_mult   話術收錢有效度
#   upsell_sat    每次收錢暗扣的滿意度
#   blame_dc      甩鍋難度加成（越高越難甩）
#   audit_w       在這案使壞，罪孽的加權（銀行/政府超高）
#   explode_mult  引爆威力倍率
#   bankrupt      每季倒閉機率（小公司高）
#   loyal         忠誠度（傳產高→不易終止合約）
#   income_mult   維護收入倍率
# ============================================================
ARCH = {
 "政府案":   dict(upsell_mult=0.35, upsell_sat=10, blame_dc=2,  audit_w=1.6, explode_mult=1.6, bankrupt=0.00, loyal=0.6, income_mult=1.2, note="採購法僵化、審計部盯、爆了上新聞"),
 "銀行案":   dict(upsell_mult=0.70, upsell_sat=14, blame_dc=9,  audit_w=2.2, explode_mult=2.2, bankrupt=0.00, loyal=0.4, income_mult=1.4, note="金管會/個資/資安，在這使壞＝自殺"),
 "S&P500案": dict(upsell_mult=1.50, upsell_sat=10, blame_dc=7,  audit_w=1.0, explode_mult=1.2, bankrupt=0.02, loyal=0.3, income_mult=1.5, note="預算深、愛buzzword，但會自己稽核你"),
 "小公司案": dict(upsell_mult=0.80, upsell_sat=16, blame_dc=-3, audit_w=0.4, explode_mult=0.8, bankrupt=0.18, loyal=0.2, income_mult=0.7, note="好唬好甩鍋，但常倒閉收不到尾款"),
 "傳產案":   dict(upsell_mult=0.30, upsell_sat=8,  blame_dc=0,  audit_w=0.4, explode_mult=0.9, bankrupt=0.03, loyal=0.9, income_mult=1.0, note="老闆精不信話術，但死忠、綁得住"),
}
ARCH_CLIENTS = {
 "政府案": ["某市交通局","某中央部會","某縣民政處","某國稅局分局","某水利署","某農業署"],
 "銀行案": ["某公股銀行","某民營金控","某證券商","某壽險公司"],
 "S&P500案": ["某美系雲端巨頭","某跨國半導體廠","某全球零售集團","某跨國藥廠"],
 "小公司案": ["某餐飲新創","某社區診所","某電商小賣家","某地方補習班"],
 "傳產案": ["某老字號製造廠","某水產加工廠","某螺絲大王","某紡織老廠"],
}
ARCH_PROJECT = {
 "政府案": ["戶政雲端遷移","智慧路燈物聯網","稅務入口網改版","長照媒合平台","警政資料庫整併"],
 "銀行案": ["核心帳務系統","網銀 App 改版","反洗錢監控系統","信用卡風控平台"],
 "S&P500案": ["全球 ERP 導入","AI 客服平台","供應鏈可視化","資料湖建置"],
 "小公司案": ["訂位系統","進銷存小工具","官網改版","會員 App"],
 "傳產案": ["MES 產線系統","倉儲管理系統","老 ERP 續命","報工看板"],
}

RIVAL_NAMES = ["美商 M社", "印度商 H社", "本土 T社", "併購狂 G社", "新貴 I社"]

# 業界快訊：多數會「真的削對手血」（幸災樂禍 → 進度感）
NEWS_HURT = [
    "{r} 承接的報稅系統上線首日崩潰3小時，董事長對鏡頭鞠躬90度。",
    "{r} 首席架構師連夜刪庫跑路，聽說轉行去開手搖店了。",
    "{r} 被爆用實習生冒充資深顧問，甲方氣到開記者會。",
    "{r} 的『AI區塊鏈雲原生』方案，被拆穿底層是一顆 Excel。",
    "{r} 因個資外洩被開罰，罰單比合約還大。",
    "{r} 得標後才發現規格是對手代寫的綁標局，整組躺平。",
]
NEWS_FLAT = [
    "旗艦計畫辦公室重申：任何一家出事，其案源將轉由存活廠商承接。",
    "業界傳言某龍頭把同一批工程師掛在五個標案上，被審計部約談。",
    "立委質詢：五家龍頭的旗艦計畫預算，是不是在養蚊子？",
]

# ============================================================
# 卡片
# ============================================================
CARD_JUNK = [
    ("發雞排安撫", "junk"), ("連夜貼AI標籤", "junk"),
    ("叫業務再打場高爾夫", "junk"), ("找乩童收驚機房", "junk"),
]
CARD_PAID = [
    ("災難變現・開帳單", "cash"),
    ("毒模組甩對手", "attack_rival"),
    ("綁架條款", "lockin"),
    ("緊急重構", "launder"),
    ("和解公關", "launder"),
]
CARD_BASIC = [("這是前朝的鍋","blame"), ("甲方已簽核","blame"), ("純屬不可抗力","blame")]

# ============================================================
# 事件袋（抽牌不放回 + 冷卻）—— 修勒索洗版
# ============================================================
class Bag:
    def __init__(self, items, cooldown):
        self.items = list(items); self.bag = []; self.cd = {}; self.cooldown = cooldown
    def draw(self, season):
        if not self.bag:
            self.bag = self.items[:]; random.shuffle(self.bag)
        for i, it in enumerate(self.bag):
            key = it[0] if isinstance(it, tuple) else it
            if season - self.cd.get(key, -99) >= self.cooldown:
                self.cd[key] = season
                return self.bag.pop(i)
        return self.bag.pop()

# ---- 意外事件（大富翁式）----
def _rc(g): return random.choice(g.cases) if g.cases else None
def _live_rivals(g): return [r for r in g.rivals if r.alive]

def ev_stroke(g):
    if g.eng():
        v=random.choice(g.eng()); g.staff.remove(v)
        sayline("event.stroke", eng=v['name'])
    else: print("  ⚡ 傳出工程師過勞，但你根本沒工程師可倒。")
def ev_delrepo(g):
    c=_rc(g)
    if c: c.risk=min(100,c.risk+45); g.morale-=8; sayline("event.delrepo", case=c.name)
    else: print("  ⚡ 沒 repo 可刪。")
def ev_sales_flee(g):
    if g.sales():
        v=random.choice(g.sales()); g.staff.remove(v); s=random.randint(80,180); g.cash-=s
        sayline("event.sales_flee", sales=v['name'], amount=s)
    else: print("  ⚡ 沒業務可捲款，反而省了。")
def ev_ransom(g):
    amt=random.randint(60,140)
    sayline("event.ransom", amount=amt)
    ans=input("  付贖金？(y/n) > ").strip().lower()
    if ans=="y": g.cash-=amt; print(f"  → 付了 ${amt}萬 贖回。")
    else:
        c=_rc(g)
        if c: c.risk=min(100,c.risk+35)
        print("  → 拒付！省了錢，但資料受損，最危險的案子風險 +35。")
def ev_bankrupt_hit(g):
    c=_rc(g)
    if c: sayline("event.client_bankrupt", case=c.name); g.cases.remove(c)
    else: print("  ⚡ 沒案子受影響。")
def ev_cloud(g):
    for c in g.cases: c.risk=min(100,c.risk+15)
    sayline("event.cloud")
def ev_leftpad(g):
    c=_rc(g)
    if c: c.risk=min(100,c.risk+30); sayline("event.leftpad", case=c.name)
def ev_vip(g):
    c=_rc(g)
    if not c: print("  ⚡ 沒案子可丟臉。"); return
    if c.risk>50: g.reputation-=8; sayline("event.vip_crash", case=c.name)
    else: g.reputation+=4; sayline("event.vip_ok", case=c.name)
def ev_poach_me(g):
    if g.eng():
        v=max(g.eng(),key=lambda s:s["stat"]); g.staff.remove(v)
        sayline("event.poached", eng=v['name'], stat=v['stat'])
    else: print("  ⚡ 沒工程師可被挖。")
def ev_media(g):
    if g.sin>40: g.reputation-=12; sayline("event.media_exposed")
    else: sayline("event.media_clean")
def ev_luck(g):
    b=random.randint(60,140); g.cash+=b; sayline("event.windfall", amount=b)

EVENTS = [
    ("工程師中風",ev_stroke),("刪庫跑路",ev_delrepo),("業務捲款",ev_sales_flee),
    ("勒索軟體",ev_ransom),("甲方倒閉",ev_bankrupt_hit),("雲端當機",ev_cloud),
    ("套件刪庫",ev_leftpad),("長官視察",ev_vip),("王牌被挖角",ev_poach_me),
    ("媒體爆料",ev_media),("天上掉錢",ev_luck),
]

# ============================================================
# 資料結構
# ============================================================
SURN=list("陳林黃張李王吳劉蔡楊許鄭謝洪郭"); GIV=["志明","淑芬","家豪","雅婷","俊傑","怡君","建宏","美玲","柏翰","冠廷","雅雯","宗翰"]

class Case:
    _n=0
    def __init__(self, atype, subcontracted, sat, risk, inherited=False):
        Case._n+=1; self.id=Case._n
        self.atype=atype
        self.name=random.choice(ARCH_PROJECT[atype])
        self.client=random.choice(ARCH_CLIENTS[atype])
        self.subcontracted=subcontracted
        self.sat=sat            # 隱藏
        self.risk=risk          # 隱藏
        self.rebound=0
        self.last_upsell=-9
        self.inherited=inherited
    @property
    def a(self): return ARCH[self.atype]
    def light(self):
        return "🔴" if self.risk>=70 else ("🟡" if self.risk>=40 else "🟢")

class Rival:
    def __init__(self, name):
        self.name=name; self.hp=int(random.randint(*CONFIG["rival_hp_start"])*D("rival_hp")); self.alive=True
        self.hate=10; self.messed_this_season=False
    def bar(self):
        n=max(0,min(10,round(self.hp/10)))
        return "█"*n + "░"*(10-n)

class Game:
    def __init__(self):
        c=CONFIG
        self.season=1; self.cash=c["start_cash"]; self.reputation=70; self.sin=0
        self.morale=c["morale_start"]; self.staff=[]; self.cases=[]; self.hand=[]
        self.morale_hist=[]; self.death_cause=None
        self.actions_left=c["actions_per_season"]
        self.audit_in=random.randint(*c["audit_interval"])
        self.frontroom_used={}; self.game_over=False; self.result=None; self.won_early=False
        global _G; _G=self
        self.event_bag=Bag(EVENTS, c["event_cooldown"])
        self.news_bag=Bag([("H",n) for n in NEWS_HURT]+[("F",n) for n in NEWS_FLAT], 2)
        self.rivals=[Rival(n) for n in RIVAL_NAMES[:4]]
        self._setup()
    def _setup(self):
        self.staff=[self._mk("業務"),self._mk("PM"),self._mk("PM"),self._mk("工程師"),self._mk("工程師")]
        # 繼承 2~3 案，其一為藏雷
        for i in range(random.randint(2,3)):
            atype=random.choice(list(ARCH))
            risk=random.randint(60,80) if i==0 else random.randint(20,45)
            self.cases.append(Case(atype, True, random.randint(45,70), risk))
        self.hand=[{"name":n,"kind":k} for n,k in CARD_BASIC]
    def _mk(self,role):
        lo = 2 if role=="業務" else 1
        return {"role":role,"name":random.choice(SURN)+random.choice(GIV),
                "stat":random.randint(lo,5),"quality":random.randint(1,5)}
    def staff_of(self,r): return [s for s in self.staff if s["role"]==r]
    def pm_count(self): return len(self.staff_of("PM"))
    def eng(self): return self.staff_of("工程師")
    def sales(self): return self.staff_of("業務")
    def load(self): return len(self.cases)/max(1,self.pm_count())

# ============================================================
def roll(bonus,dc,label):
    d=random.randint(1,20); tot=d+bonus
    ok = d==20 or (d!=1 and tot>=dc)
    tag = "  ★大成功" if d==20 else ("  ☠大失敗" if d==1 else "")
    print(f"  🎲 {label}：d20({d})+{bonus}={tot}（線{dc}）→ {'成功' if ok else '失敗'}{tag}")
    return ok, d==20, d==1

def wrap(s,ind="  "): return textwrap.fill(s,width=60,initial_indent=ind,subsequent_indent=ind)

def dashboard(g):
    print("\n"+"━"*54)
    print(f"📅 第{g.season}季／存活{CONFIG['seasons_to_survive']}季   行動點 {g.actions_left}/{CONFIG['actions_per_season']}   💰 ${g.cash}萬")
    print(f"😐 士氣 {mbar(g.morale)}   👷 工程師{len(g.eng())}/PM{g.pm_count()}/業務{len(g.sales())}")
    audit = "‼️本季稽核" if g.audit_in<=0 else ("逼近" if g.audit_in<=1 else ("隱約" if g.audit_in<=3 else "無"))
    print(f"⚖️  稽核風聲：{audit}")
    print("─"*54 + "  🏴 對手戰況（你只看得到血條）")
    for r in g.rivals:
        status = f"{r.bar()}" if r.alive else "☠已倒閉"
        print(f"   {r.name:8s} {status}")
    print("─"*54)
    if g.cases:
        for c in g.cases:
            tag = "接盤" if c.inherited else ("下包" if c.subcontracted else "自做")
            print(f"   #{c.id} {c.light()} 《{c.name}》 [{c.atype}] {c.client}（{tag}）")
    else:
        print("   （目前手上沒有案子）")
    print("🎴 手牌：" + " ".join(f"[{x['name']}]" for x in g.hand) if g.hand else "🎴 手牌：（空）")
    print("━"*54)

def mbar(m):
    n=max(0,min(5,round(m/20))); return "●"*n+"○"*(5-n)+f"({m})"

# ============================================================
# 開季：業界快訊（真削血）+ 對手自然消長 + 意外事件
# ============================================================
def start_season(g):
    kind,tmpl = g.news_bag.draw(g.season)
    live=_live_rivals(g)
    if kind=="H" and live:
        target=random.choice(live); dmg=random.randint(4,10); target.hp-=dmg
        g.morale=min(100,g.morale+CONFIG["morale_rival_hurt"])
        sayline("news.rival_hurt", prefix="📰 ", rival=target.name)
    else:
        sayline("news.industry", prefix="📰 ")
    # 對手自然消長
    for r in live:
        r.hp += random.randint(*CONFIG["rival_ambient_dmg"])
    # 意外事件
    ch=CONFIG["event_chance"] + (0.25 if g.morale<CONFIG["morale_disaster_at"] else 0)
    fired=0
    if random.random()<ch:
        fire_event(g); fired+=1
        if random.random()<CONFIG["event_double"]: fire_event(g); fired+=1
    if fired==0: print("  （表面風平浪靜……風險還在悄悄長。）")

def fire_event(g):
    name,fn=g.event_bag.draw(g.season)
    print(f"\n  🎲 意外事件：【{name}】"); fn(g)

# ============================================================
# 行動
# ============================================================
def pick_case(g,prompt):
    if not g.cases: print("  （沒有案子。）"); return None
    ids={str(c.id):c for c in g.cases}
    raw=input(f"  {prompt}（{'/'.join(ids)}，x取消）> ").strip()
    return ids.get(raw)

def pick_rival(g,prompt):
    live=_live_rivals(g)
    if not live: print("  （對手都倒光了。）"); return None
    m={str(i+1):r for i,r in enumerate(live)}
    for i,r in m.items(): print(f"     {i}) {r.name}  {r.bar()}")
    raw=input(f"  {prompt}（號碼，x取消）> ").strip()
    return m.get(raw)

def a_bid(g):
    if not g.sales(): print("  沒業務去搶標。"); return False
    if len(g.cases) >= g.pm_count()*CONFIG["max_cases_per_pm"]:
        print(f"  ❌ PM 全超載（{g.pm_count()}PM 扛 {len(g.cases)}案），沒人罩新案。先招 PM 或消化案子。"); return False
    atype=random.choice(list(ARCH))
    bonus=max(s["stat"] for s in g.sales())+CONFIG["bid_buzzword"]
    _scale_dc=len(g.cases)//2   # 規模越大越難再接
    dc=CONFIG["bid_dc_base"]+int(g.load())*CONFIG["bid_dc_per_load"]+max(0,len(_live_rivals(g))-1)*CONFIG["bid_dc_per_rival"]+_scale_dc
    print(f"  📋 這次流出的是一個【{atype}】：{ARCH[atype]['note']}")
    ok,cok,cbad=roll(bonus,dc,"搶標")
    if ok:
        up=int(random.randint(110,220)*D("bid_income")); up=int(up*1.5) if cok else up
        g.cash+=up
        g.cases.append(Case(atype,True,random.randint(50,75),random.randint(15,35)))
        print(f"  ✅ 得標！期初款 +${up}萬，直接下包出去。")
    else:
        g.cash-=random.randint(8,20); print("  ❌ 標飛了，倒賠一點投標成本。")
    return True

def a_talk(g):
    """話術：一個動作，進去選 1)榨錢 2)安撫"""
    if not g.sales(): print("  沒業務可派去動嘴。"); return False
    sub=input("  話術：1)榨錢(收變更費) 2)安撫(降客訴風險)（x取消）> ").strip()
    if sub not in ("1","2"): print("  取消。"); return False
    c=pick_case(g, "對哪個案子動話術")
    if not c: return False
    bonus=max(s["stat"] for s in g.sales())
    if sub=="1":   # 榨錢
        if g.season - c.last_upsell < CONFIG["upsell_cooldown"]:
            print(f"  \u26a0 《{c.name}》上季才剛收過，甲方翻白眼，這季收不動。"); return False
        ok,cok,cbad=roll(bonus,12,f"話術榨錢・{c.atype}")
        c.last_upsell=g.season; c.sat-=c.a["upsell_sat"]
        if ok:
            gain=int(random.randint(*CONFIG["upsell_base"]) * c.a["upsell_mult"])
            if cok: gain=int(gain*1.4)
            g.cash+=gain
            if c.a["upsell_mult"]<0.5: sayline("action.upsell_stiff", case=c.name, ctype=c.atype, amount=gain)
            else: sayline("action.upsell_win", case=c.name, amount=gain)
        else:
            sayline("action.upsell_fail", ctype=c.atype)
        return True
    else:          # 安撫
        ok,_,_=roll(bonus,CONFIG["soothe_dc"],"話術安撫")
        if ok: c.sat=min(100,c.sat+CONFIG["soothe_sat_gain"]); print("  🗣️ 把客戶哄回來了（滿意度回補，問題還在）。")
        else: print("  ❌ 客戶不吃這套。")
        return True

def a_rescue(g):
    if not g.eng(): print("  沒工程師，救火隊是空的。"); return False
    if g.cash<CONFIG["rescue_cost"]: print("  現金不足，派不動。"); return False
    c=pick_case(g,"派特種隊救哪個案子")
    if not c: return False
    g.cash-=CONFIG["rescue_cost"]
    bonus=max(e["stat"] for e in g.eng())
    ok,cok,cbad=roll(bonus,CONFIG["rescue_dc"],"工程師救火")
    cut=random.randint(*CONFIG["rescue_risk_cut"]); cut=int(cut*1.5) if cok else (cut//3 if not ok else cut)
    c.risk=max(0,c.risk-cut); g.sin=max(0,g.sin-CONFIG["rescue_sin_cut"]); g.morale-=2
    sayline("action.rescue", case=c.name)
    return True

def a_mess_rival(g):
    """搞同行：檢舉 / 放假消息 / 挖角"""
    if not _live_rivals(g): print("  對手都倒光了，沒人可搞。"); return False
    print("     搞法：1) 檢舉他違規($80，重擊) 2) 放假消息($40，中傷) 3) 挖角他的人($165，削血兼搶人,職位隨機)")
    how=input("  選搞法（1-3，x取消）> ").strip()
    if how not in ("1","2","3"): print("  取消。"); return False
    r=pick_rival(g,"要搞哪一家")
    if not r: return False
    if how=="1":
        if g.cash<60: print("  錢不夠。"); return False
        g.cash-=60; dmg=random.randint(*CONFIG["mess_report_dmg"]); r.hp-=dmg; g.sin+=7; g.morale=min(100,g.morale+CONFIG["morale_mess"]); r.hate+=int(25*D("grudge")); r.messed_this_season=True
        sayline("action.mess_report", rival=r.name, dmg=dmg)
    elif how=="2":
        if g.cash<40: print("  錢不夠。"); return False
        g.cash-=40; dmg=random.randint(*CONFIG["mess_rumor_dmg"]); r.hp-=dmg; g.morale=min(100,g.morale+CONFIG["morale_mess"]); r.hate+=int(12*D("grudge")); r.messed_this_season=True
        sayline("action.mess_rumor", rival=r.name, dmg=dmg)
    else:
        if g.cash<165: print("  錢不夠。"); return False
        g.cash-=165; dmg=random.randint(*CONFIG["mess_poach_dmg"]); r.hp-=dmg; r.hate+=int(20*D("grudge")); r.messed_this_season=True
        role=random.choice(["工程師","PM","業務"])   # 挖角不限職位，全面搞對手
        s=g._mk(role); g.staff.append(s); g.morale=min(100,g.morale+CONFIG["morale_mess"])
        print(f"  🎣 從 {r.name} 挖來一名{role} {s['name']}（能力{s['stat']}），他 -{dmg} 血、你 +1 人。")
        sayline("action.mess_poach", rival=r.name, eng=s['name'], stat=s['stat'], dmg=dmg)
    if r.hp<=0: print(f"  💥 {r.name} 撐不住了……（季末結算他的下場）")
    return True

def a_play_card(g):
    if getattr(g,"cards_played",0) >= CONFIG["cards_per_season"]:
        print(f"  本季手牌已出滿 {CONFIG['cards_per_season']} 張了。"); return False
    if not g.hand: print("  手牌空。"); return False
    for i,c in enumerate(g.hand): print(f"     {i+1}) [{c['name']}] ({c['kind']})")
    raw=input("  打哪張（號碼，x取消）> ").strip()
    if not raw.isdigit() or not (1<=int(raw)<=len(g.hand)): print("  取消。"); return False
    card=g.hand.pop(int(raw)-1)
    resolve_card(g,card)
    g.cards_played=getattr(g,"cards_played",0)+1
    return True

def a_draw(g):
    if g.cash<CONFIG["draw_cost"]: print("  現金不足，抽不起。"); return False
    g.cash-=CONFIG["draw_cost"]
    name,kind=random.choice(CARD_PAID); d=random.randint(1,20)
    print(f"  🎴 花 ${CONFIG['draw_cost']}萬抽卡… d20({d}) → 抽到【{name}】")
    if d==1: g.reputation-=6; print("  ☠ 大失敗！新聞稿打錯公司名，信譽 -6，卡作廢。"); return True
    print("  （強卡不進卡位，立刻用掉。）")
    resolve_card(g,{"name":name,"kind":kind},paid=True)
    return True

def a_morale(g):
    if g.cash<CONFIG["morale_cost"]: print("  現金不足。"); return False
    g.cash-=CONFIG["morale_cost"]
    gain=max(4,int(CONFIG["morale_gain"]*(1-g.morale/120)))
    g.morale=min(100,g.morale+gain); sayline("action.morale", amount=CONFIG['morale_cost'])
    return True

def a_recon(g):
    if g.cash<CONFIG["recon_cost"]: print("  現金不足。"); return False
    c=pick_case(g,"查核哪個案子")
    if not c: return False
    g.cash-=CONFIG["recon_cost"]
    nr=max(0,min(100,c.risk+random.randint(-10,10))); ns=max(0,min(100,c.sat+random.randint(-10,10)))
    print(f"  🕵️ 《{c.name}》真實引爆風險 ≈{nr}，客戶滿意度 ≈{ns}（估計，有誤差）。")
    return True

def a_hire(g):
    # 保底：沒業務又招不起正規業務時，開放「前員工回鍋兼差」（便宜、能力偏低），避免死鎖
    rescue_hire = (not g.sales()) and g.cash < 100
    menu = "  招募：1)工程師$120 2)PM$150 3)業務$100"
    if rescue_hire: menu += " 4)前員工回鍋兼差$35(能力低)"
    role=input(menu+"（x取消）> ").strip()
    if rescue_hire and role=="4":
        if g.cash<35: print("  連兼差的錢都湊不出來了……"); return False
        g.cash-=35; s=g._mk("業務"); s["stat"]=random.randint(1,2)
        g.staff.append(s)
        print(f"  🙏 拜託前員工 {s['name']} 回鍋兼差救急（業務，能力{s['stat']}）-$35萬。至少還能掙扎。")
        return True
    mp={"1":("工程師",120),"2":("PM",150),"3":("業務",100)}
    if role not in mp: print("  取消。"); return False
    r,cost=mp[role]
    if g.cash<cost: print("  現金不足。"); return False
    g.cash-=cost; s=g._mk(r); g.staff.append(s)
    print(f"  🧑‍💼 招到 {s['name']}（{r}，能力{s['stat']}）-${cost}萬。中間商養太多人＝薪水吃現金。")
    return True

# ---- 卡片結算 ----
def resolve_card(g,card,paid=False):
    k=card["kind"]; n=card["name"]
    if k=="junk":
        g.morale=min(100,g.morale+3); print(f"  🃏 {n}：聊勝於無，士氣 +3。"); return
    if k=="cash":
        c=max(g.cases,key=lambda x:x.risk,default=None)
        if not c: print("  沒災難可變現。"); return
        gain=random.randint(200,420); g.cash+=gain; g.sin+=15; c.risk=max(0,c.risk-20)
        sayline("card.disaster_cash", case=c.name, amount=gain); return
    if k=="attack_rival":
        r=pick_rival(g,"毒模組甩給哪一家")
        if not r:
            if _live_rivals(g): r=_live_rivals(g)[0]
            else: print("  沒對手可甩。"); return
        dmg=random.randint(*CONFIG["card_poison_dmg"]); r.hp-=dmg; g.sin+=12
        c=max(g.cases,key=lambda x:x.risk,default=None)
        if c: c.risk=0
        sayline("card.poison", rival=r.name, dmg=dmg)
        if r.hp<=0: print(f"  💥 {r.name} 被你這一手送走了……（季末結算）")
        return
    if k=="lockin":
        c=pick_case(g,"綁架哪個客戶")
        if not c and g.cases: c=g.cases[0]
        if c: c.sat=max(0,c.sat-8); c.lockin=True; sayline("card.lockin", case=c.name)
        return
    if k=="launder":
        c=max(g.cases,key=lambda x:x.risk,default=None)
        if "重構" in n and c:
            c.risk=max(0,c.risk-50); g.sin=max(0,g.sin-25); g.cash-=60
            sayline("card.refactor", case=c.name)
        else:
            g.sin=max(0,g.sin-25); g.reputation=min(100,g.reputation+8); g.cash-=40
            sayline("card.pr")
        return
    if k=="blame":
        c=pick_case(g,"甩鍋卡用在哪個案子（冒煙時可先拆彈）")
        if not c and g.cases: c=g.cases[0]
        if c: do_blame(g,c,n)

def do_blame(g,c,method):
    bonus=max([s["stat"] for s in g.sales()],default=0)
    dc=11 + c.a["blame_dc"]
    note=""
    if "前朝" in method:
        if g.frontroom_used.get(c.id): print(f"  \u26a0 《{c.name}》的前朝已用過——現在前朝就是你，失效。"); return
        g.frontroom_used[c.id]=True; dc+=max(0,(70-g.reputation)//5); note="(信譽低→甲方不信)"
    elif "簽核" in method or "甲方" in method:
        dc+=max(0,(60-c.sat)//4); note="(客戶越不爽越易翻車)"
    elif "不可抗力" in method:
        dc+=max(0,(70-g.reputation)//6); note="(信譽低→唬不過)"
    ok,cok,cbad=roll(bonus,dc,f"甩鍋・{method}・{c.atype}{note}")
    if ok:
        # 成功 = 不賠錢，但罪孽大增（延遲帳單，餵稽核）
        c.risk=max(0,c.risk-CONFIG["blame_risk_cut"]); c.sat-=12
        g.sin += int(CONFIG["blame_sin_base"] * c.a["audit_w"] * 1.6)
        sayline("blame.win", case=c.name, ctype=c.atype, method=method)
    else:
        # 失敗 = 立刻賠一筆（比硬扛還多，因為你先激怒了甲方），雙殺 + 少量罪孽
        pen=int(random.randint(120,220)*D("penalty")*c.a["explode_mult"])
        g.cash-=pen; g.reputation-=8; c.sat-=10
        g.sin += int(CONFIG["blame_sin_base"] * c.a["audit_w"] * 0.4)
        sayline("blame.fail", case=c.name, ctype=c.atype)
        sayline("blame.sue", amount=pen)


# ============================================================
# 季末
# ============================================================
def rival_retaliation(g):
    """仇恨結算 + 反撲（放血不秒殺）。DEV: grudge=0 只吃家數底線、reta 弱；PRD 全開。"""
    alive=_live_rivals(g); n=len(alive)
    if n==0: return
    for r in alive:
        floor = 10 + (4 - n)*18            # 家數越少，全體仇恨底線越高（困獸）
        r.hate = max(r.hate, floor)
        if not getattr(r,"messed_this_season",False):
            r.hate = max(0, r.hate - 5)    # 你不惹他，他慢慢消氣
        r.messed_this_season=False
        eff = r.hate * D("retal")
        if random.randint(1,100) <= eff:
            _do_retaliate(g, r)

def _do_retaliate(g, r):
    h=r.hate
    if h < 40:
        g.reputation -= random.randint(4,8)
        print(f"  🩸 {r.name} 放你假消息中傷，信譽被啃了一口。")
    elif h < 70:
        g.sin += random.randint(8,16)
        print(f"  🩸 {r.name} 匿名檢舉你違規，監理機關開始盯上你（罪孽默默＋，餵了稽核）。")
    else:
        if g.eng() and random.random()<0.5:
            v=random.choice(g.eng()); g.staff.remove(v)
            print(f"  🩸 {r.name} 狗急跳牆，反手挖走你的工程師{v['name']}。")
        else:
            smoky=[c for c in g.cases if c.risk>=40]
            if smoky:
                c=random.choice(smoky); g.cases.remove(c)
                print(f"  🩸 {r.name} 趁火打劫，把你正在冒煙的《{c.name}》整碗端走了。")
            else:
                g.reputation-=random.randint(6,12)
                print(f"  🩸 {r.name} 到處唱衰你，信譽下滑。")

def end_season(g):
    c=CONFIG
    print("\n"+"="*54); print(f"　　第 {g.season} 季 結算"); print("="*54)
    income=0
    # 風險上升 + 維護收入
    for cs in g.cases:
        rise=random.randint(*c["risk_rise_base"])+cs.rebound+(6 if cs.inherited else 0); cs.rebound=0
        cs.risk=min(100,cs.risk+rise)
        base=45
        risk_factor=1.0 if cs.risk<40 else max(-0.15, 1-(cs.risk-40)/55.0)  # 壓在40以下全額，冒煙才失血
        income+=int(base*cs.a["income_mult"]*risk_factor*(1.8 if getattr(cs,"lockin",False) else 1))
    # 小公司倒閉
    for cs in list(g.cases):
        if random.random()<cs.a["bankrupt"]:
            g.cases.remove(cs); sayline("event.client_bankrupt", case=cs.name, ctype=cs.atype)
    # 滿意度過低 → 提告（傳產忠誠高不易告）
    for cs in list(g.cases):
        if cs.sat < c["sat_sue_at"] and random.random() > cs.a["loyal"]:
            p=int(random.randint(*c["sue_penalty"])*cs.a["explode_mult"]*D("penalty"))
            g.cash-=p; g.reputation-=10; g.cases.remove(cs)
            sayline("season.terminate", case=cs.name, ctype=cs.atype, amount=p)
    # 引爆 → 甩鍋樹
    _hits=[cs for cs in g.cases if cs.risk>=c["risk_explode_at"]]
    for cs in _hits:
        explode(g,cs)
    # 對手倒閉結算 → 縮圈接盤
    for r in g.rivals:
        if r.alive and r.hp<=0:
            r.alive=False; g.morale=min(100,g.morale+CONFIG["morale_rival_collapse"]); collapse_rival(g,r)
    if not _live_rivals(g) and not g.game_over:
        g.won_early=True
    # 對手仇恨反撲（放血）
    if not g.won_early:
        rival_retaliation(g)
    # 稽核
    g.audit_in-=1
    if g.audit_in<=0: audit(g); g.audit_in=random.randint(*c["audit_interval"])
    # 財務
    payroll=sum(c["salary"][s["role"]] for s in g.staff)+c["rent"]
    pressure=len(_live_rivals(g))*CONFIG["rival_pressure"]
    g.cash += income - payroll - pressure
    print(f"  💵 維護收入 +${income}｜薪資租金 -${payroll}（{len(g.staff)}人）｜季末現金 ${g.cash}萬")
    decay=max(c["morale_decay_floor"], c["morale_decay"]-g.pm_count()*c["morale_pm_buffer"])
    g.morale=max(0,g.morale-decay)
    if not _hits:
        g.morale=min(100,g.morale+c["morale_lowpressure"])   # 沒爆炸的一季，喘口氣
    g.morale_hist.append(g.morale)
    # 補牌（只在季末，且只補垃圾）——防手牌無限迴圈
    while len(g.hand)<3:
        n,k=random.choice(CARD_JUNK); g.hand.append({"name":n,"kind":k})
    check_end(g)

def explode(g,cs):
    print(); sayline("season.explode", case=cs.name, ctype=cs.atype)
    print("  這鍋怎麼處理？ 1)硬扛認賠(賠錢,罪孽不增) 2)推前朝 3)推不可抗力 4)推甲方(賭:成功不賠但養稽核/失敗賠更多) 5)推替死鬼(燒工程師)")
    ch=input("  選（1-5）> ").strip()
    if ch=="5" and g.eng():
        v=random.choice(g.eng()); g.staff.remove(v); cs.risk=30; g.morale-=15
        sayline("explode.scapegoat", eng=v['name'])
    elif ch in ("2","3","4"):
        m={"2":"這是前朝的鍋","3":"純屬不可抗力","4":"甲方已簽核"}[ch]
        do_blame(g,cs,m); cs.risk=min(cs.risk,55)
    else:
        loss=int(random.randint(80,180)*cs.a["explode_mult"]*D("penalty")); g.cash-=loss; cs.risk=40; g.sin=max(0,g.sin-4)
        sayline("explode.eat", amount=loss, case=cs.name, ctype=cs.atype)

def collapse_rival(g,r):
    windfall=int(random.randint(*CONFIG["kill_windfall"])*D("kill_windfall"))
    g.cash+=windfall
    print(); sayline("rival.collapse", rival=r.name, amount=windfall)
    live=len(_live_rivals(g))
    print(wrap(f"旗艦計畫辦公室：『{r.name} 留下的案子不能開天窗，就交給貴公司了。』"))
    atype=random.choice(["政府案","銀行案","S&P500案"])  # 龍頭留下的多是大案
    ans=input(f"  要接盤 {r.name} 的一個【{atype}】前朝毒案嗎？(y=接/n=臨陣脫逃) > ").strip().lower()
    if ans=="n":
        g.reputation-=12; g.cash-=80
        print("  你拒接，政府臉很臭。信譽 -12、公關費 -$80萬。")
    else:
        cs=Case(atype,True,random.randint(30,50),random.randint(*CONFIG["inherit_risk"]),inherited=True)
        g.cases.append(cs)
        sayline("rival.inherit", case=cs.name, ctype=atype)

def audit(g):
    print(f"\n  ⚖️⚖️ 監理機關稽核：翻你的帳本、技術債、甩鍋史……")
    if g.sin<CONFIG["audit_sin_soft"]:
        sayline("audit.clean"); g.sin=max(0,g.sin-10); return
    d=random.randint(1,20); thr=10+(g.sin-CONFIG["audit_sin_soft"])//6
    print(f"  🎲 稽核判定：d20({d}) vs 罪孽壓力 {thr}")
    if d>=thr: sayline("audit.dodged"); g.sin=max(0,g.sin-10)
    else:
        p=int((random.randint(*CONFIG["audit_penalty"])+(g.sin-CONFIG["audit_sin_soft"])*3)*D("audit"))
        g.cash-=p; g.reputation-=15; g.sin=max(0,g.sin-15)
        sayline("audit.fined", amount=p)

def check_end(g):
    if g.cash<0 and not g.game_over: g.game_over=True; g.result="現金斷鏈，發不出薪水，公司倒閉。"; g.death_cause="現金"
    if g.morale<=0 and not g.game_over: g.game_over=True; g.result="團隊集體崩潰、無人可用，公司解體。"; g.death_cause="士氣"

# ============================================================
MENU="""
  ── 本季行動（每季 5 點；p/r/s 不吃點）──
   1 搶標新案      2 話術(榨錢/安撫)    3 派工程師救火     4 🗡搞同行(檢舉/假消息/挖角)
   5 付費抽強卡    6 發獎金拉士氣       7 招人
   p 打手牌(免費,每季3張)   r 查核撥霧(免費)   s 看狀態   e 結束本季
"""
ACT={"1":a_bid,"2":a_talk,"3":a_rescue,"4":a_mess_rival,
     "5":a_draw,"6":a_morale,"7":a_hire,
     "p":a_play_card,"r":a_recon}
FREE_ACTS={"p","r"}   # 不吃行動點

def intro():
    print("="*54)
    print("　　外  包  生  存  模  擬  器")
    print("　　　　—— 搞事 App　v0.3 ——")
    print("="*54)
    print(wrap("『政府旗艦計畫』欽點五家軟體龍頭，號稱要一起壯大成國家隊。"))
    print(wrap("沒人告訴你的真相是——這是一場大逃殺。預算只有一份，龍頭卻有五家。"))
    print(wrap("你是夾在中間的外包顧問老闆：接肥單、轉下包、賺價差、出事就甩鍋。"))
    print("")
    print(wrap("　活下去的方法只有兩種：熬到旗艦計畫結束，或者——把其他四家全搞死。"))
    print(wrap("　檢舉、放假消息、挖角、塞毒模組……看著同行一家家倒下，剩你獨活。"))
    print("")
    print(wrap("⚠ 但你搞的每一手，帳都記著：技術債會爆、團隊會崩、稽核會找上門，"))
    print(wrap("　 而被你搞過的對手，會記仇、會反咬。政府想養航母群，"))
    print(wrap("　 最後往往養出一隻靠吃同伴屍體長大、再也拔不掉的怪物。"))
    print("")
    print(wrap("★ 每季 5 點行動，錢和人都不夠用。案子分政府/銀行/S&P500/小公司/傳產，"))
    print(wrap("　 各有你看不到的脾氣——同一招打天下，遲早翻車。"))
    _mn={"DEV":"🟢 練習模式（寬鬆，先摸熟系統）","PRD":"🔴 真實模式（硬核，對手記仇反撲，贏在鋼索上）"}[MODE]
    print("─"*54)
    print(wrap(f"難度：{_mn}")); print(wrap("　（改檔案頂端 MODE = \"DEV\" / \"PRD\" 切換）"))
    print("="*54)

def main():
    random.seed()
    g=Game(); intro()
    while not g.game_over and not g.won_early and g.season<=CONFIG["seasons_to_survive"]:
        g.actions_left=CONFIG["actions_per_season"]; g.cards_played=0
        print("\n\n"+"▓"*54); print(f"▓▓▓  第 {g.season} 季  ▓▓▓")
        start_season(g); dashboard(g)
        if g.game_over: break
        while g.actions_left>0 and not g.game_over:
            print(MENU); cmd=input(f"  （剩{g.actions_left}點）指令 > ").strip().lower()
            if cmd=="s": dashboard(g); continue
            if cmd=="e": print("  提早收工。"); break
            fn=ACT.get(cmd)
            if not fn: print("  無效指令。"); continue
            if cmd in FREE_ACTS:
                fn(g)                       # 免費：查核/手牌不扣點
            elif fn(g):
                g.actions_left-=1
        end_season(g); g.season+=1

    print("\n\n"+"★"*54)
    if g.won_early:
        print("　【獨活！你熬死了所有對手】")
        sayline("ending.solo", prefix="　")
    elif g.game_over:
        print("　【GAME OVER】")
        _lk={"現金":"ending.lose_cash","士氣":"ending.lose_morale","稽核":"ending.lose_audit"}.get(getattr(g,"death_cause",None),"ending.lose_cash")
        sayline(_lk, prefix="　")
    else:
        print("　【存活！你撐過了旗艦計畫】")
        sayline("ending.survive", prefix="　")
    alive=len(_live_rivals(g))
    print(f"　最終現金 ${g.cash}萬｜存活 {min(g.season,CONFIG['seasons_to_survive'])} 季｜對手還剩 {alive} 家")
    print("★"*54)




# ============================================================
# Monte Carlo 模擬器（無頭）—— 貼在遊戲檔最後，或另存同目錄
# 用法：呼叫 montecarlo(policy_name, n=2000) 掃平衡。
# 不需要真人輸入；bot 依 game 狀態自動決策。
# ============================================================
import random as _r, io as _io, sys as _sys
from collections import Counter as _C

def _auto_input_factory(state, policy):
    def fake(prompt=""):
        gm=state["game"]
        if "指令 >" in prompt:
            if not state["buf"] and gm: state["buf"]=policy(gm)
            return state["buf"].pop(0) if state["buf"] else "e"
        if "付贖金" in prompt: return _r.choice(["y","n"])
        if "選（1-5）" in prompt: return _r.choice(["1","3","3","4"])
        if "y=接" in prompt: return "y"
        if "搞法" in prompt: return _r.choice(["1","2","3"])
        if "榨錢" in prompt: return "1"   # bot 話術一律榨錢
        if "要搞哪一家" in prompt or "甩給哪一家" in prompt:
            return "1" if [x for x in gm.rivals if x.alive] else "x"
        if "招募" in prompt: return "1"
        if "哪張" in prompt: return "1"
        if "編號" in prompt or "哪個" in prompt or "綁架" in prompt:
            return str(gm.cases[0].id) if gm and gm.cases else "x"
        return "x"
    return fake

# ---- 範例策略（改這裡測不同打法是否過強）----
def pol_aggressive(gm):   # 搞同行流（聰明版：專注削同一家、缺錢先顧經濟）
    t=[]
    if gm.morale<45 and gm.cash>70: t.append("6")        # 發獎金
    if len(gm.eng())==0 and gm.cash>130: t.append("7")   # 招人
    smoky=sorted([c for c in gm.cases if c.risk>=55],key=lambda c:-c.risk)
    if smoky and gm.eng() and gm.cash>110: t.append("3") # 救火
    if gm.cash>220 and [r for r in gm.rivals if r.alive]: t.append("4")  # 搞同行
    if gm.cases and gm.cash<400: t.append("2")           # 話術(榨錢)
    if len(gm.cases) < gm.pm_count()*2 -1 and gm.cash>150: t.append("1") # 搶標
    t.append("e"); return t

def pol_clean(gm):        # 老實流：救火+顧士氣+適度搶標，不主動使壞
    t=[]
    if gm.morale<50 and gm.cash>70: t.append("6")
    if len(gm.eng())==0 and gm.cash>130: t.append("7")
    smoky=sorted([c for c in gm.cases if c.risk>=45],key=lambda c:-c.risk)
    if smoky and gm.eng() and gm.cash>90: t.append("3")
    if gm.cases: t.append("2")                           # 話術(安撫/榨錢)
    if len(gm.cases) < gm.pm_count()*2 -1 and gm.cash>60: t.append("1")
    t.append("e"); return t

def pol_talkonly(gm):     # 純話術流（應該最差）
    t=["2","2","1","e"] if gm.cases else ["1","1","e"]; return t

POLICIES={"aggressive":pol_aggressive,"clean":pol_clean,"talkonly":pol_talkonly}

def montecarlo(policy_name="aggressive", n=1000, base_seed=0, quiet=False):
    import __main__ as M
    pol=POLICIES[policy_name]
    results=[]; killed=[]; seasons=[]; morale_med=[]; deaths=[]
    for i in range(n):
        _r.seed(base_seed+i)
        state={"game":None,"buf":[]}
        OG=M.Game
        def Spy(*a,**k):
            inst=OG(*a,**k); state["game"]=inst; return inst
        M.Game=Spy
        import builtins as B; B.input=_auto_input_factory(state,pol)
        buf=_io.StringIO(); old=_sys.stdout; _sys.stdout=buf
        try: M.main()
        except Exception: pass
        _sys.stdout=old; M.Game=OG
        g=state["game"]; t=buf.getvalue()
        r="WIN_SOLO" if "熬死了所有對手" in t else ("WIN" if "撐過了旗艦計畫" in t else "LOSE")
        results.append(r)
        if g is not None:
            killed.append(sum(1 for x in g.rivals if not x.alive))
            seasons.append(min(g.season, CONFIG["seasons_to_survive"]))
            mh=g.morale_hist[5:] if len(g.morale_hist)>5 else g.morale_hist
            if mh: morale_med.append(sorted(mh)[len(mh)//2])
            if r=="LOSE": deaths.append(g.death_cause or "其他")
    c=_C(results)
    win=(c.get("WIN_SOLO",0)+c.get("WIN",0))/n
    def med(x): return sorted(x)[len(x)//2] if x else 0
    m={"policy":policy_name,"n":n,"win":win,"solo":c.get("WIN_SOLO",0)/n,
       "kill_med":med(killed),"kill_mean":(sum(killed)/len(killed) if killed else 0),
       "morale_med":med(morale_med),
       "seasons_mean":(sum(seasons)/len(seasons) if seasons else 0),
       "deaths":dict(_C(deaths)),"detail":dict(c)}
    if not quiet:
        print(f"[{policy_name:10s}] \u52dd\u7387 {win:.0%}\uff08\u7368\u6d3b {m['solo']:.0%}\uff09"
              f" \u641e\u6b7b\u4e2d\u4f4d {m['kill_med']}\u5bb6(\u5747{m['kill_mean']:.1f})"
              f" \u58eb\u6c23\u4e2d\u4f4d {m['morale_med']}"
              f" \u5b58\u6d3b\u5747 {m['seasons_mean']:.1f}\u5b63  \u6b7b\u56e0 {m['deaths']}")
    return m

def score_balance(n=1500):
    print("="*60)
    print("  \u5e73\u8861\u9a57\u6536\uff08goal\uff1a\u641e\u6b7b\u5c0d\u624b\u662f\u4e3b\u7dda\uff09")
    print("="*60)
    ms={name: montecarlo(name, n) for name in POLICIES}
    agg=ms["aggressive"]; talk=ms["talkonly"]
    wins=[m["win"] for m in ms.values()]; spread=max(wins)-min(wins)
    worst=min(ms.values(), key=lambda m:m["win"])["policy"]
    all_deaths=_C()
    for m in ms.values():
        for k,v in m["deaths"].items(): all_deaths[k]+=v
    tot=sum(all_deaths.values()) or 1
    death_top=max(all_deaths.values())/tot if all_deaths else 0
    def flag(ok): return "\u2705" if ok else "\u274c"
    print("\n  \u2500\u2500 \u76ee\u6a19\u9054\u6210\u5ea6 \u2500\u2500")
    c1=2<=agg["kill_med"]<=3
    print(f"  {flag(c1)} \u4e3b\u73a9\u6cd5\u5178\u578b\u641e\u6b7b 2-3 \u5bb6\uff1a\u4e2d\u4f4d = {agg['kill_med']} \u5bb6")
    c2=0.45<=agg["win"]<=0.60
    print(f"  {flag(c2)} \u4e3b\u73a9\u6cd5\u52dd\u7387 45-60%\uff1a{agg['win']:.0%}")
    c3=35<=agg["morale_med"]<=70
    print(f"  {flag(c3)} \u4e2d\u5f8c\u6bb5\u58eb\u6c23\u4e2d\u4f4d 35-70\uff1a{agg['morale_med']}")
    c4=death_top<=0.60
    print(f"  {flag(c4)} \u6b7b\u56e0\u5206\u6563\uff08\u5358\u4e00\u2264 60%\uff09\uff1a\u6700\u5927 {death_top:.0%}  {dict(all_deaths)}")
    c5=(worst=="talkonly") and (talk["win"]<0.40)
    print(f"  {flag(c5)} \u88ab\u52d5\u6d41\u6700\u5dee\u4e14 <40%\uff1atalkonly {talk['win']:.0%}\uff08\u6700\u5dee={worst}\uff09")
    c6=spread<0.30
    print(f"  {flag(c6)} \u7121\u7121\u6575\u89e3\uff08\u5dee <30%\uff09\uff1a\u5dee {spread:.0%}")
    passed=sum([c1,c2,c3,c4,c5,c6])
    print(f"\n  \u7e3d\u5206\uff1a{passed}/6 \u689d\u9054\u6a19")
    return ms

KNOBS = """
\u60f3\u8981\u7684\u6548\u679c            \u2192  \u8abf\u54ea\u500b CONFIG\uff08\u65b9\u5411\uff09
\u641e\u6b7b\u66f4\u591a\u5bb6           \u2192  rival_hp_start\u2193\u3001\u641e\u540c\u884c\u524a\u8840\u2191\u3001\u6bd2\u6a21\u7d44\u2191
\u641e\u6b7b\u66f4\u5c11\u5bb6           \u2192  rival_hp_start\u2191\u3001\u524a\u8840\u2193
\u58eb\u6c23\u6536\u7dca\uff08\u5225\u8eba95\uff09  \u2192  morale_lowpressure\u2193 rival_hurt\u2193 rival_collapse\u2193 pm_buffer\u2193 decay\u2191
\u58eb\u6c23\u653e\u5bec\uff08\u5225\u58a9\u843d\uff09  \u2192  \u540c\u4e0a\u53cd\u5411
\u58d3\u5236\u88ab\u52d5\u6d41           \u2192  \u7dad\u8b77\u6536\u5165\u66f4\u9661(base\u2193/\u5206\u6bcd\u2193)
\u641e\u6a19\u66f4\u597d\u4e2d           \u2192  bid_dc_base\u2193\u3001bid_buzzword\u2191
\u7a3d\u6838\u66f4\u81f4\u547d           \u2192  audit_sin_soft\u2193\u3001blame_sin_base\u2191
\u5c60\u5c0d\u624b\u4ee3\u50f9\u66f4\u9ad8       \u2192  inherit_risk\u2191
"""
def knobs(): print(KNOBS)

# ============================================================
# grid()：一鍵掃多組「殺敵更快更甜」候選，印一張比較表
#   跑法：grid()  或  grid(n=1500)
#   每組會暫時覆蓋 CONFIG，跑完自動還原。
# ============================================================
def _run3(n):
    ms={name: montecarlo(name, n, quiet=True) for name in POLICIES}
    a=ms["aggressive"]; cl=ms["clean"]; tk=ms["talkonly"]
    wins=[m["win"] for m in ms.values()]; spread=max(wins)-min(wins)
    worst=min(ms.values(), key=lambda m:m["win"])["policy"]
    return a, cl, tk, spread, worst

def grid(n=1200):
    import copy
    base=copy.deepcopy(CONFIG)
    # ── 候選組合：主要動 對手血 / 各削血 / 殺敵獎勵 ──
    cases = [
        ("hp46 p11 w300", {"rival_hp_start":(46,66),"rival_pressure":11,"kill_windfall":(300,500),"mess_report_dmg":(40,56),"mess_poach_dmg":(24,36),"card_poison_dmg":(48,66)}),
        ("hp46 p13 w300", {"rival_hp_start":(46,66),"rival_pressure":13,"kill_windfall":(300,500),"mess_report_dmg":(40,56),"mess_poach_dmg":(24,36),"card_poison_dmg":(48,66)}),
        ("hp50 p12 w350", {"rival_hp_start":(50,70),"rival_pressure":12,"kill_windfall":(350,550),"mess_report_dmg":(40,56),"mess_poach_dmg":(24,36),"card_poison_dmg":(48,66)}),
        ("hp50 p13 w400", {"rival_hp_start":(50,70),"rival_pressure":13,"kill_windfall":(400,600),"mess_report_dmg":(40,56),"mess_poach_dmg":(24,36),"card_poison_dmg":(48,66)}),
        ("hp54 p12 w400", {"rival_hp_start":(54,74),"rival_pressure":12,"kill_windfall":(400,600),"mess_report_dmg":(44,60),"mess_poach_dmg":(26,40),"card_poison_dmg":(52,72)}),
        ("hp54 p14 w450", {"rival_hp_start":(54,74),"rival_pressure":14,"kill_windfall":(450,650),"mess_report_dmg":(44,60),"mess_poach_dmg":(26,40),"card_poison_dmg":(52,72)}),
    ]
    print("="*104)
    print(f"  grid 掃描（每組 n={n}／策略）  goal：搞事流 勝率45-60% ・ 搞死中位2-3 ・ 士氣35-70 ・ talkonly<40% ・ 差<30%")
    print("="*104)
    hdr=f"{'組合':<16}{'搞事勝率':>9}{'搞死中':>7}{'獨活':>6}{'士氣中':>7}{'clean':>7}{'talk':>7}{'差':>6}   達標"
    print(hdr); print("-"*104)
    for name, ov in cases:
        for k,v in ov.items(): CONFIG[k]=v
        a,cl,tk,spread,worst=_run3(n)
        # goal checks（以搞事流為主玩法）
        g1 = 2<=a["kill_med"]<=3
        g2 = 0.45<=a["win"]<=0.60
        g3 = 35<=a["morale_med"]<=70
        g5 = (worst=="talkonly") and (tk["win"]<0.40)
        g6 = spread<0.30
        passed=sum([g1,g2,g3,g5,g6])
        flags=("K" if g1 else ".")+("W" if g2 else ".")+("M" if g3 else ".")+("T" if g5 else ".")+("S" if g6 else ".")
        print(f"{name:<16}{a['win']:>8.0%}{a['kill_med']:>7}{a['solo']:>6.0%}"
              f"{a['morale_med']:>7}{cl['win']:>7.0%}{tk['win']:>7.0%}{spread:>6.0%}   {flags} {passed}/5")
        # 還原
        for k in ov: CONFIG[k]=base[k]
    print("-"*104)
    print("  旗標：K=搞死2-3  W=勝率45-60  M=士氣35-70  T=talkonly<40且最差  S=無無敵解(差<30)")
    print("  （這裡的 5 條不含『死因分散』；那條用 score_balance() 單獨看）")



def sweep(n=1500):
    score_balance(n)

# ============================================================
# Colab 執行入口：預設玩互動版；要跑模擬把下面兩行對調
# ============================================================
if __name__=="__main__":
    main()          # ← 互動遊玩
    # sweep(1000)   # ← 平衡掃描（把上一行註解、這行取消註解）
