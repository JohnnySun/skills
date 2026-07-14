# 模型分級快照（roster）

> **這是一份帶日期的拋棄式快照，不是正典。** 快照日期：**2026-07-10**。
>
> 正典是三層的**層級特徵** + SKILL.md 的**歸層探針**——「模型名會過時，
> 層級特徵不會」。本表只把「當下哪個真實模型 ≈ 哪一層」變成便利查表，它
> **一定會過時**：模型名、檔位語義、供應商旋鈕都在變。
>
> **使用規則**：要找的模型不在表上、或表看起來過時（新代已出、供應商改名、
> benchmark 翻盤）→ 別信本表，跑 SKILL.md 的[歸層探針](../SKILL.md#未知模型歸層)，
> 用結論回填這裡並更新快照日期。層級名（Frontier-agentic / 主力 / 快速經濟）
> 是穩定契約，**不要改**；只更新「哪個模型落哪層」。
>
> **工具無關**：本表只列**模型名 + Intelligence Index**，不綁定任何客戶端。
> 拿你自己環境裡可選的模型名，對照下表模型名歸層即可——你有理解力，不需要
> 一份逐客戶端的選單對照。
>
> **證據等級**：本快照用下方來源所列的 Intelligence Index 當**落位的數字錨**
> （見下方邊界規則），讓每個落位有可查的數字、不靠感覺。
> 分數決定**何時應重審**，不直接決定提示厚度：真正決定層級的是行為
> （字面遵循度、拆腳手架後是否更好、自我驗證可信度）。近分模型要一起重審，
> 但不得跳過歸層探針或等價的 per-model 行為證據。
> 純由排名或未查證分數推導的落位一律標「（啟發式）」。

## 分層邊界規則

用本快照選定的 Intelligence Index 當數字錨；它約束重審時機，不取代行為證據：

1. **近分觸發重審，不是自動同層**：兩模型 Index 差距在噪音內（**≤ 3 分**）→
   對兩者都跑歸層探針或查對應的 per-model 行為證據。分數接近本身既不能把一個
   已驗證的 frontier 降成主力，也不能把另一個模型直接升上去。
2. **Frontier 以行為為門檻**：有證據顯示模型在拆腳手架、長自主、子代理授權與
   推理可見性限制上符合 Tier 1，才進 Frontier-agentic。Index 榜首且領先次名
   ≥ 4 分是強烈的**校準旁證**，不是充分或必要條件。近分新模型只觸發雙方的行為
   重審，不覆寫既有行為證據；供應商的「旗艦／frontier」產品定位也不是 Tier 1
   證據。
3. **快速經濟**：mini / flash / nano / small 與小型開源，Index 明顯低於主力
   密集帶（或未列入 AA 榜）。這層驗證外置，分數只作參考。

> **為什麼 frontier 要收窄**：三層編碼的是**提示方向**（加腳手架 vs 拆腳手架），
> 不是「誰比較強」。數字用來發現可能需要重審的相近模型；歸層探針與 per-model
> 指引才判定實際提示行為。供應商的「frontier」產品定位不能替代這兩步。

## 怎麼讀這張表

- **層級**：表按三層分節，模型所在的節即其層級。層級決定提示要**加腳手架**
  還是**拆腳手架**。
- **Intelligence Index**：本快照採用的數字依據；精確版本、日期與來源在文末。
  「—」＝未列入本快照榜單或未查證（改標啟發式旁證）。
- **備註**：一句話說明落位理由，並附該層關鍵旋鈕（effort / reasoning effort /
  thinking 開關）——遵循 SKILL.md「參數先於提示」，先調旋鈕再改提示文本。

---

## Tier 1 — Frontier-agentic（頂級旗艦）

缺的是**授權與邊界**不是能力。提示要：why / 驗收 / 什麼不該做 / 證據錨定進度 /
自主權聲明。要**刪**：CoT 步驟、逐條行為列舉、強制節拍、推理復述、上下文倒數。

**進場門檻**：已驗證的 Tier 1 提示行為（見邊界規則）。Index 排名與差距只作
校準旁證；近分新模型發布時，重跑探針而不自動重分層。

| 模型 | 供應商 | Intelligence Index | 備註（含旋鈕） |
|---|---|---|---|
| Claude Fable 5 | Anthropic | **60（#1；Sol(max)=59）** | 官方 per-model 指引支持 Tier 1 的拆腳手架、自主權、證據錨定進度與不要求推理復述。Sol 的近分觸發重審，**不**在無相反行為證據時把 Fable 降為主力。旋鈕：effort 高～max、adaptive thinking。 |
| Claude Mythos 5（同級） | Anthropic | 未單列（隨 Fable 的行為證據） | 官方 per-model 指引與 Fable 並列為同一提示模式；待獨立探針出現相反證據前保留 Tier 1。 |

> Tier 1 表列模型的落位來自明確的提示行為證據，而非當期榜單差距。新模型不能因
> 名字響亮升 frontier；已驗證模型也不會只因近分模型出現而自動降級。

---

## Tier 2 — 主力（Strong workhorse）

缺的是**範圍與觸發時機**。指令被**字面**遵循、不自動推廣。提示要：明確範圍 /
工具使用時機 / 正面範例 / review 覆蓋率聲明。效果不好**先升檔位再改提示**。

**這層是「今日強通用模型」的家**：包含已有主力行為證據，或仍待歸層探針的強
通用模型。Index 約 40–60 的密集帶可優先排查，但不會透過相鄰分數傳遞分層。
下表按 Index 由高到低排。

| 模型 | 供應商 | Intelligence Index | 備註（含旋鈕） |
|---|---|---|---|
| GPT-5.6 Sol（`gpt-5.6-sol`；`gpt-5.6` alias） | OpenAI | **59（max，#2）** | Tier 2 依據是 GPT-5.6 per-model 指引：保留明確約束／授權邊界／驗收，給輕量任務結構；近分不是理由。歸層探針可在本機行為相反時推翻此落位。旋鈕：`reasoning.effort`、`reasoning.mode`、`text.verbosity`。 |
| Claude Opus 4.8 | Anthropic | **56** | SKILL.md 正典的主力代表；與 Sol 近分會要求兩者的行為證據可追溯，不改變其既有主力提示策略。有 fast 變體。旋鈕：effort low→max + adaptive thinking。 |
| GPT-5.5 | OpenAI | **55（xhigh）／53（high）** | GPT 系前代旗艦（$5/$30），既有行為落位為主力。旋鈕：reasoning effort high／xhigh。 |
| Grok 4.5 | SpaceXAI | **54（high）** | 強主力；成本／token 效率是路由旁證，不改提示層級。歐盟暫不可用。旋鈕：reasoning；有 fast 變體。 |
| Claude Opus 4.7 | Anthropic | **54** | 前代 Opus，仍與當代旗艦同帶。紮實主力。旋鈕：effort + thinking。 |
| Claude Sonnet 5 | Anthropic | **53** | 新一代 Sonnet，就在主力帶。新 tokenizer（同文字 token 偏高 ~30%）；不接受 temperature（400）。旋鈕：effort（預設 high）+ adaptive thinking（預設開）。 |
| GPT-5.6 Luna（`gpt-5.6-luna`） | OpenAI | **51（max，#15）** | 與 Sol 共用 GPT-5.6 的 per-model 主力提示指引：明確約束／授權邊界／驗收 + 輕量結構；Index=51 不是分層理由。max 的性能分數不能外推到較低 effort；實際使用先調 `reasoning.effort` + `text.verbosity`，並可用歸層探針覆核。 |
| GLM 5.2 | Z.ai | **51（max；開源之首）** | 開源權重第一，已上探主力帶（> Gemini 3.1 Pro 的 46）。示範「具體型號要查本表、別照 tier-matrix『GLM 級』泛稱套經濟層」。旋鈕：thinking 開關。 |
| GPT-5.6 Terra（`gpt-5.6-terra`） | OpenAI | **49（high，#21）** | 與 Sol 共用 GPT-5.6 的 per-model 主力提示指引：明確約束／授權邊界／驗收 + 輕量結構；Index=49 和「平衡型」命名都不是分層理由。較低 effort 的能力仍須個別校準，並可用歸層探針覆核。 |
| Claude Sonnet 4.6 | Anthropic | —（前代，主力偏下；啟發式） | 性價比主力，日常編碼常用。旋鈕：effort + thinking。 |
| Gemini 3.1 Pro | Google | **46** | 發布時曾以**舊 v4.0** 短暫登頂（~57），但**當前 v4.1 是 46**、低於 GPT-5.5(55)／Grok(54) 一整帶（~9 分）→ 不進 frontier，歸主力（回應「非 GPT-5.5 的 peer」）。多模態、1M 上下文、~142 TPS。旋鈕：thinking／reasoning 拉高。 |
| DeepSeek V4 Pro | DeepSeek | **44（max；開源並列首）** | 與 MiniMax M3 並列開源前段。成本奇低（~$0.04/task）。旋鈕：thinking 開關／部署方檔位。 |
| MiniMax M3 | MiniMax | **44（開源並列首）** | 與 DeepSeek V4 Pro 並列開源榜首。主力偏下。 |
| Kimi K2.6／K2.7 Code | Moonshot | **43／42** | K2.7 Code 編碼向、輸出極快（~307 TPS）。主力偏下的開源／編碼特化。 |
| Gemini 3 Pro | Google | **40（估，#32）** | 前代 Gemini Pro，AA 標估值（獨立評測待補）。主力帶下緣。 |
| Muse Spark | Meta | —（未列 AA；LMArena ~1485–1493，啟發式） | AA Index **未查得**；僅 Elo 旁證，既非榜首亦未拉開間距 → 不進 frontier，歸主力（回應「非 GPT-5.5 的 peer」）。實戰前跑歸層探針坐實。 |
| Qwen 3.7 Max | Alibaba | —（LMArena ~1450，啟發式） | AA 當期分未查得。開源生態強主力。 |
| Composer 2.5 | Cursor | —（編碼特化，偏快；啟發式） | 為 agentic coding 調校，便宜快。互動編碼按主力用，開放式難推理按經濟層給腳手架。AA 未單列通用 Index。 |
| GPT-5.4 | OpenAI | —（前代主力；啟發式） | 長上下文。旋鈕：reasoning effort + verbosity。 |
| GPT-5.3 Codex | OpenAI | —（編碼特化；啟發式） | Codex 系代理編碼強項。旋鈕：reasoning effort。 |
| GPT-5.2／5.2 Codex、GPT-5.1 Codex Max／Codex、GPT-5／GPT-5 Fast | OpenAI | —（前代／編碼特化；啟發式） | GPT 前代主力與 Codex 家族，仍紮實。 |
| Llama 4 Maverick | Meta | —（LMArena「strong」；啟發式） | 開源，適合可控管線。主力偏下。 |

> **檔位名跨代不等值**：新一代的 medium ≈ 上一代的 high。跨代遷移按**觀察到的
> 思考長度**對齊，不按檔位名（見 tier-matrix.md）。新一代主力多不接受
> temperature（會 400）——要多樣性改用「提案 N 個方向→選→實作」。
> **近分不傳遞提示策略**：近分只表示要並列檢查行為；每個模型都要以自己的
> per-model 指引、歸層探針與精確配置決定提示厚度，不能用分數鏈條傳遞分層。

---

## Tier 3 — 快速經濟（Fast economy）

缺的是**過程與格式**。經典提示工程在這層全額有效：步驟清單 / 輸出格式契約 /
few-shot / XML 區塊 / 明確停止條件。**驗證外置**（測試、上層 agent、獨立
verifier），不要指望它自查。Index 明顯低於主力密集帶（多數未列入 AA 榜前段）。

| 模型 | 供應商 | Intelligence Index | 備註（含旋鈕） |
|---|---|---|---|
| Claude 4.5 Haiku | Anthropic | —（低於主力帶，精確值未查得） | SKILL.md 正典的經濟層 Haiku 代表。格式契約要寫死。旋鈕：effort 低檔。 |
| GPT-5.4 Mini | OpenAI | —（同上） | GPT-5.4 小快變體（AA 對比強於 4.5 Haiku，仍遠低於主力帶）。旋鈕：reasoning effort 低。 |
| GPT-5.4 Nano | OpenAI | —（最省） | 最小 GPT-5.4，成本優先。開放判斷別交給它。 |
| GPT-5 Mini／GPT-5.1 Codex Mini | OpenAI | — | 前代 mini／編碼 mini（4× rate limit）；量大、格式固定的子任務。 |
| Gemini 3.5 Flash | Google | —（精確值未查得；速度-智慧 Pareto 前緣領先） | 2026-05 發布。Flash 系當前檔，快、便宜。旋鈕：thinking 低／關。 |
| Gemini 3 Flash／2.5 Flash／Flash-Lite | Google | — | 前代 Flash。批量、格式化任務。 |
| Composer 2.5 Fast | Cursor | — | 編碼特化最快檔。互動編碼可上探主力；開放推理按經濟層給腳手架。 |
| Composer 1 | Cursor | — | 前代 Composer。 |
| DeepSeek V4 Flash | DeepSeek | —（最便宜 ~$0.01/1M，1M 上下文） | 經濟層開源，超長上下文。 |
| GLM（較小／較舊）、Gemma 4、Mistral Small、Phi-4、Qwen3.5 小檔、gpt-oss-20B | Z.ai／Google／Mistral／Microsoft／Alibaba／OpenAI | —（開源；啟發式） | tier-matrix「GLM 等開源主流」泛指這一檔。格式契約 + few-shot + 外置驗證是必需。 |

---

## 來源（2026-07-10 查證）

**智慧分數（落位數字錨）— Artificial Analysis Intelligence Index v4.1：**

- 模型總表 / 榜單（Fable 5=60、Opus 4.8=56、GPT-5.5 xhigh=55、Grok 4.5 high=54、Opus 4.7=54、Sonnet 5=53；開源首 GLM 5.2 max=51）：<https://artificialanalysis.ai/models>
- 目前榜首 / 次名（Fable 5=60、GPT-5.6 Sol max=59，領先僅 1 分；Sol xhigh=58、high=56）：<https://artificialanalysis.ai/models>
- GPT-5.6 Sol（max）Index 59、#2：<https://artificialanalysis.ai/models/gpt-5-6-sol>
- GPT-5.6 Terra（high）Index 49、#21：<https://artificialanalysis.ai/models/gpt-5-6-terra-high>
- GPT-5.6 Luna（max）Index 51、#15：<https://artificialanalysis.ai/models/gpt-5-6-luna>
- Grok 4.5（high）Index 54：<https://artificialanalysis.ai/models/grok-4-5?intelligence=artificial-analysis-intelligence-index>
- GPT-5.5（xhigh）Index 55：<https://artificialanalysis.ai/models/gpt-5-5?intelligence=artificial-analysis-intelligence-index>
- Claude Opus 4.8（max）Index 56：<https://artificialanalysis.ai/models/claude-opus-4-8?intelligence=artificial-analysis-intelligence-index>
- Claude Fable 5（with Opus 4.8 fallback）Index 60、#1：<https://artificialanalysis.ai/models/claude-fable-5?intelligence=artificial-analysis-intelligence-index>
- Claude Sonnet 5（max）Index 53：<https://artificialanalysis.ai/models/claude-sonnet-5?intelligence=artificial-analysis-intelligence-index>
- Gemini 3.1 Pro Preview Index 46（當前 v4.1；發布時舊 v4.0 曾 ~57）：<https://artificialanalysis.ai/models/gemini-3-1-pro-preview?intelligence=artificial-analysis-intelligence-index>
- Gemini 3 Pro Preview Index 40（估）：<https://artificialanalysis.ai/models/gemini-3-pro?intelligence=artificial-analysis-intelligence-index>
- GLM-5.2（max）Index 51（開源之首）：<https://artificialanalysis.ai/models/glm-5-2>
- Index v4.1 方法論與開源榜（DeepSeek V4 Pro 44、MiniMax M3 44、Kimi K2.6 43、MiMo-V2.5-Pro 42；歷史榜單差距不能覆寫當前行為落位）：<https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-1>

**提示層級校準（各層「該怎麼提示」的定性依據）— Anthropic 官方 per-model 指南：**

- Claude Fable 5 / Mythos 5（frontier：拆腳手架、自主權、證據錨定進度、勿要求復述推理否則 refusal）：<https://platform.claude.com/docs/zh-TW/build-with-claude/prompt-engineering/prompting-claude-fable-5>
- Claude Opus 4.8（主力：字面遵循、明確範圍、覆蓋率聲明、升 effort 先於改提示）：<https://platform.claude.com/docs/zh-TW/build-with-claude/prompt-engineering/prompting-claude-opus-4-8>
- Claude Sonnet 5（主力：字面遵循、adaptive thinking 預設開、不接受 temperature）：<https://platform.claude.com/docs/zh-TW/build-with-claude/prompt-engineering/prompting-claude-sonnet-5>

**旁證（供未列 AA 榜者的啟發式落位與供應商事實）：**

- OpenAI GPT-5.6 發布（2026-07-09；Sol／Terra／Luna 為一般可用）：<https://openai.com/index/gpt-5-6/>
- OpenAI 模型目錄（正式 model ID：`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`；`gpt-5.6` 是 Sol alias）：<https://developers.openai.com/api/docs/models>
- OpenAI GPT-5.6 指引（沿用 GPT-5.5 提示準則；明確約束／授權邊界／驗收 + 輕量任務結構，支持本表 Tier 2 行為落位；另含 effort、standard/pro mode 與 alias）：<https://developers.openai.com/api/docs/guides/latest-model>
- OpenAI 部署指引（`text.verbosity` 是控制輸出長度的主要旋鈕）：<https://developers.openai.com/api/docs/guides/deployment-checklist>
- Grok 4.5 官方（$2/$6、token 效率、歐盟暫缺）：<https://x.ai/news/grok-4-5>
- LMArena 文字榜（Elo 名次）：<https://arena.ai/leaderboard/text>

**未坐實 / 交待給讀者（flag）：**

- **Muse Spark**：AA Index **未查得**，落主力靠 LMArena Elo 旁證（~1485–1493）
  +「既非榜首亦未拉開間距」的規則推論；實戰前用歸層探針坐實。
- **快速經濟層多數模型**（Haiku 4.5、GPT-5.4 Mini/Nano、Gemini 3.5 Flash 等）
  的**精確 Index 值未查得**（未列 AA 榜前段或僅見於對比頁）；本表只確認其
  「明顯低於主力密集帶」，未標具體分數。
- **Gemini 3 Pro = 40** 為 AA 標示的**估值**（獨立評測待補）。
- **Gemini 3.1 Pro** 的 ~57 是**舊 v4.0** 的短暫登頂值；本表採**當前 v4.1**
  的 46（#13），兩者非同一把尺，勿混用。
- 開源權重模型的落位受具體部署（量化、檔位、推理版）顯著影響，實戰前坐實。
- **GPT-5.6**：本表記錄的是 AA 已公布的特定 effort 配置（Sol=max、Terra=high、
  Luna=max），不是不帶檔位的永久性能標籤；不同 effort 的 AA Index 另計。三者的
  Tier 2 提示落位來自家族共用的 per-model 指引，不來自分數或「frontier／flagship／
  balanced」行銷用語；本倉歸層探針可在觀察到相反行為時推翻。
