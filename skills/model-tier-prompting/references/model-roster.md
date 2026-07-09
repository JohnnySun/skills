# 模型分級快照（roster）

> **這是一份帶日期的拋棄式快照，不是正典。** 快照日期：**2026-07-09**。
>
> 正典是三層的**層級特徵** + SKILL.md 的**歸層探針**——「模型名會過時，
> 層級特徵不會」。本表只是把「當下哪個真實模型 ≈ 哪一層、該用在哪」變成
> 便利查表。它**一定會過時**：模型名、檔位語義、供應商旋鈕都在變。
>
> **使用規則**：要找的模型不在表上、或表看起來過時（新代已出、Cursor 選單
> 改版、benchmark 翻盤）→ 別信本表，跑 SKILL.md 的[歸層探針](../SKILL.md#未知模型歸層)，
> 用結論回填這裡並更新快照日期。層級名（Frontier-agentic / 主力 / 快速經濟）
> 是穩定契約，**不要改**；只更新「哪個模型落哪層」。
>
> **證據等級**：本次校準用 **Artificial Analysis Intelligence Index（v4.1）**
> 的智慧分數當**落位的數字錨**（見下方邊界規則），讓每個落位都有一個可查的
> 數字、不靠感覺。但數字仍只是**旁證**：真正決定層級的是行為（字面遵循度、
> 拆腳手架後是否更好、自我驗證可信度）。分數只坐實「同不同層」，不改「這層
> 該怎麼提示」。純由排名/未查證分數推導的落位一律標「（啟發式）」。

## 分層邊界規則（本次校準依據，讓後續更新自洽）

用 Artificial Analysis Intelligence Index（v4.1，2026-07-09 快照）當數字錨，
規則有兩條，缺一不可：

1. **同分同層（peers share a tier）**：兩個模型的 Index 分數在噪音內
   （**差距 ≤ 3 分**）→ **必須落同一層**。不允許把 54 分的判 frontier、
   55 分的判主力這種自相矛盾的落位。
2. **Frontier 收窄到「榜首且拉開間距」**：只有**同時**滿足
   「Index 位居榜首」**且**「與次名拉開真實間距（**≥ 4 分**）」的模型才進
   Frontier-agentic。當前唯一坐實者：**Claude Fable 5 = 60**（領先次名
   Opus 4.8 的 56 達 4 分）；Mythos 5 級同屬此列。
   - **強但非頂**的通用旗艦（Opus 4.8 / GPT-5.5 / Grok 4.5 / Sonnet 5 /
     Gemini 3.1 Pro …）擠在 **~40–56 這條密集帶**、彼此差距在噪音內、無一與
     榜首拉開間距 → 一律歸**主力**，按 Index 由高到低排序/註記。
     「當前最強**可用**模型」（Opus 4.8, 56）≠「frontier」——它離榜首 4 分、
     且與 GPT-5.5/Grok 4.5/Sonnet 5 同帶，故是主力之首而非另立一層。
3. **快速經濟**：mini / flash / nano / small 與小型開源，Index 明顯低於主力
   密集帶（或根本未列入 AA 榜的小模型）。這層驗證外置，分數只作參考。

> 為什麼 frontier 要收窄：三層編碼的是**提示方向**（加腳手架 vs 拆腳手架），
> 不是「誰比較強」。Anthropic 的 per-model 提示指南顯示，Fable 5 這一級才
> 需要「刪 CoT、刪逐條列舉、給自主權與證據錨定」的拆腳手架式提示，且對
> 復述內部推理會觸發 refusal；而 Opus 4.8 / Sonnet 5 的指南講的仍是**字面
> 遵循、明確範圍、覆蓋率聲明、升檔位**——那是主力層的提示語言。落位跟著
> 「該怎麼提示」走，Index 只是把「誰和誰同帶」量化坐實。

## 怎麼讀這張表

- **層級**：對應 SKILL.md 三層。決定你的提示要**加腳手架**還是**拆腳手架**。
- **Intelligence Index**：Artificial Analysis 智慧指數 v4.1（2026-07-09）。
  是落位的數字依據；「—」＝未列入 AA 榜或未查證（改標啟發式旁證）。
- **Cursor 選項名**：Cursor 模型選單（Settings › Models）裡看到的名字；空白＝
  當前 Cursor 選單未內建（可能需 Add Model 或 BYOK，或根本不在 Cursor 生態）。
  Cursor 選單比 Claude Code / Xcode 大得多，故本表對 Cursor 可選項給重點覆蓋。
- **建議檔位/旋鈕**：遵循 SKILL.md「參數先於提示」——先調這個，再改提示文本。

---

## Tier 1 — Frontier-agentic（頂級旗艦）

缺的是**授權與邊界**不是能力。提示要：why / 驗收 / 什麼不該做 / 證據錨定進度 /
自主權聲明。要**刪**：CoT 步驟、逐條行為列舉、強制節拍、推理復述、上下文倒數。

**進場門檻（見上方邊界規則）**：Index 榜首**且**領先次名 ≥ 4 分。當前只有一款。

| 模型 | 供應商 | Intelligence Index | Cursor 選項名 | 建議檔位/旋鈕 | 備註 |
|---|---|---|---|---|---|
| Claude Fable 5 | Anthropic | **60（#1，領先次名 4 分）** | `Claude Fable 5` | `effort` 高～max；adaptive thinking（無手動 budget） | AA Intelligence Index v4.1 榜首 60，比次名 Opus 4.8（56）高 4 分，是唯一與整群拉開間距者。約 Opus 4.8 兩倍成本（$10/$50）。**注意**：AA 記為「目前不可直接使用（with Opus 4.8 fallback）」——觸發安全 guardrail（攻擊性 cyber、生命科學、提取摘要化思考）的請求會自動改路由到 Opus 4.8。Cursor 內需資料留存/隱私模式核可。跨多日長自主、平行子代理的首選。提示要拆腳手架：給 why/邊界/證據錨定進度/自主權聲明，**不要**要求復述推理（會觸發 refusal）。 |
| Claude Mythos 5（同級） | Anthropic | 同 Fable 5 級（未單列） | （視發布） | 同 Fable 5 | Anthropic 官方 per-model 指南把 Fable 5 / Mythos 5 並列為同一提示模式。落此層。 |

> 純 frontier 目前只有 **Claude Fable 5 / Mythos 5 級**一款可明確坐實：它是
> 唯一「榜首且與次名拉開 ≥4 分間距」的模型。所有其他當代旗艦（含「當前最強
> 可用」的 Opus 4.8）都擠在主力密集帶裡，**不因為名字響亮就升 frontier**。

---

## Tier 2 — 主力（Strong workhorse）

缺的是**範圍與觸發時機**。指令被**字面**遵循、不自動推廣。提示要：明確範圍 /
工具使用時機 / 正面範例 / review 覆蓋率聲明。效果不好**先升檔位再改提示**。

**這層是「今日強通用模型」的家**：Index ~40–56 的密集帶，彼此差距多在噪音內
（同分同層），無一與榜首拉開間距。下表按 Index 由高到低排。

| 模型 | 供應商 | Intelligence Index | Cursor 選項名 | 建議檔位/旋鈕 | 備註 |
|---|---|---|---|---|---|
| Claude Opus 4.8 | Anthropic | **56（#2）** | `Claude Opus 4.8` | `effort`（low→max）+ adaptive thinking；Max Mode 開長上下文 | **當前最強「可用」模型**，但離榜首 Fable 5 有 4 分、且與 GPT-5.5/Grok 4.5/Sonnet 5 同帶 → 主力之首，非 frontier。SKILL.md 正典的主力代表。有 fast 變體（`claude-opus-4-8-fast`）。官方指南講的是字面遵循、覆蓋率聲明、升檔位——主力層的提示語言。 |
| GPT-5.5 | OpenAI | **55（xhigh，#3）／53（high）** | `GPT-5.5` | reasoning effort high/xhigh；Cursor 需 Max Mode | GPT 系當前旗艦（$5/$30，最貴的 GPT）。xhigh=55 與 Opus 4.8(56)、Grok 4.5(54) 差距 ≤2 分 → **與它們同層（主力）**，正是「同分同層」規則要修掉的舊落位不一致。 |
| Grok 4.5 | Cursor × SpaceXAI | **54（high，#4）** | `Grok 4.5`（Cursor 一方模型/旗艦） | reasoning；有 fast 變體（$4/$18）；base $2/$6 | 2026-07-08 發布。AA Index 54，與 GPT-5.5(55)、Opus 4.8(56) 差 ≤2 分——**這正好回應舊表的不一致**：Grok 4.5 與 GPT-5.5 是同帶 peers，兩者必須同層，故一起落主力（不再一個 frontier 一個主力）。廠商「Opus-class」說法現由 AA 獨立分數坐實（同帶）。成本/token 效率是最大賣點（約 Opus 4.8 的 4.2× token 效率、~87 TPS、$2/$6）。歐盟暫不可用。長跑編碼/知識工作性價比首選。 |
| Claude Opus 4.7 | Anthropic | **54（#5）** | `Claude 4.7 Opus` | `effort` + thinking | 前代 Opus，AA Index 54，仍與當代旗艦同帶。紮實主力；有 fast/研究預覽變體（很貴）。 |
| Claude Sonnet 5 | Anthropic | **53** | `Claude Sonnet 5` | `effort`（預設 high）+ adaptive thinking（預設開） | 新一代 Sonnet，AA Index 53，就在主力密集帶。用新 tokenizer（同輸入 token 數偏高 ~30%）；不接受 temperature（400）。發布促銷價。日常主力。 |
| GLM 5.2 | Z.ai | **51（max；開源之首）** | `GLM 5.2`（預設隱藏） | thinking 開關；vLLM guided decoding 可用 | AA Index 51，是**開源權重第一**、已上探主力帶（高於 Gemini 3.1 Pro 的 46）。**注意**：tier-matrix 用「GLM 級」泛指經濟型開源那一檔，指的是較小/較舊 GLM；GLM 5.2 這個具體型號已是主力——正是「具體型號要查本表、不要照泛稱套層」的示範。 |
| Claude Sonnet 4.6 | Anthropic | —（前代，主力偏下） | `Claude 4.6 Sonnet` | `effort` + thinking | Cursor Pro 預設。性價比主力，日常編碼常用。落位啟發式（AA 未單列當期分）。 |
| Gemini 3.1 Pro | Google | **46（#13）** | `Gemini 3.1 Pro` | thinking / reasoning 拉高 | Google 主力旗艦。**發布時曾以舊 v4.0 指數短暫登頂（~57）**，但在**當前 v4.1 指數上是 46（#13）**，明顯低於 GPT-5.5(55)/Grok(54) 一整帶（差 ~9 分）→ 依規則**不進 frontier，歸主力**（回應「Gemini 3.1 Pro 不是 GPT-5.5 的 peer」）。多模態、長上下文（1M）、速度快（~142 TPS）是賣點。Cursor Pro 預設開啟。 |
| DeepSeek V4 Pro | DeepSeek | **44（max；開源並列首）** | （Cursor 未內建；BYOK/自部署） | thinking 開關／部署方檔位 | AA Index 44，與 MiniMax M3 並列開源前段。成本奇低（~$0.04/task，比 GPT-5.5 便宜 20×+）。開源主力代表之一。 |
| MiniMax M3 | MiniMax | **44（開源並列首）** | （Cursor 未內建；BYOK/自部署） | 部署方檔位 | 與 DeepSeek V4 Pro 並列開源榜首（44）。落主力偏下。 |
| Kimi K2.6 / K2.7 Code | Moonshot | **43 / 42** | `Kimi K2.7 Code`（預設隱藏） | 依部署 | Moonshot 系；K2.6=43、K2.7 Code=42（編碼向，輸出極快 ~307 TPS）。主力偏下的開源/編碼特化。 |
| Gemini 3 Pro | Google | **40（估，#32）** | `Gemini 3 Pro`（預設隱藏） | thinking / reasoning | 前代 Gemini Pro，AA Index 40（估值，獨立評測待補）。主力帶下緣。 |
| Muse Spark | Meta | —（未列 AA；LMArena ~1485–1493，啟發式） | （Cursor 未內建） | 依供應商 | Meta 的專有旗艦。**AA Intelligence Index 未查得**；僅 LMArena Elo 旁證（~1485–1493），既非榜首也未拉開間距 → 依規則**不進 frontier，歸主力**（回應「Muse Spark 不是 GPT-5.5 的 peer」）。落位啟發式，實戰前跑歸層探針坐實。 |
| Qwen 3.7 Max | Alibaba | —（LMArena ~1450 段，啟發式） | （Cursor 未內建） | reasoning 版本／thinking | AA 當期分未查得；LMArena frontier-adjacent 段。開源生態強主力。落位啟發式。 |
| Composer 2.5 | Cursor | —（編碼特化，偏快） | `Composer 2.5` | 檔位少、預設快；適合互動編碼 | Cursor 自訓、為 agentic coding 調校，$0.5/$2.5、快。能力介於主力↔快速經濟：**互動編碼按主力用，開放式難推理按經濟層給腳手架**。First-party pool、免 Cursor Token Rate。AA 未單列通用 Index。 |
| GPT-5.4 | OpenAI | —（前代主力） | `GPT-5.4` | reasoning effort（含 `gpt-5.4` high）+ verbosity；Cursor 需 Max Mode | GPT 前代主力，長上下文（Max Mode 至 1M）。cached input 九折。落位啟發式。 |
| GPT-5.3 Codex | OpenAI | —（編碼特化） | `GPT-5.3 Codex` | `gpt-5.3-codex-high` 等 reasoning effort；Cursor 需 Max Mode | Codex 系代理編碼強項。Cursor Pro 預設集內。 |
| GPT-5.2 / 5.2 Codex、GPT-5.1 Codex Max/Codex、GPT-5 / GPT-5 Fast | OpenAI | —（前代/編碼特化） | 同名（多為預設隱藏，需啟用） | reasoning effort | GPT 前代主力與 Codex 家族，仍紮實。落位啟發式。 |
| Llama 4 Maverick | Meta | —（LMArena「strong」段，啟發式） | （Cursor 未內建） | 部署方檔位 | 開源，適合可控管線。主力偏下。落位啟發式。 |

> **檔位名跨代不等值**：新一代的 medium ≈ 上一代的 high。跨代遷移按**觀察到的
> 思考長度**對齊，不按檔位名（見 tier-matrix.md）。新一代主力多不接受
> temperature（會 400）——要多樣性改用「提案 N 個方向→選→實作」。
> **同帶 peers 提示互通**：Index 差距 ≤3 分的模型（Opus 4.8 / GPT-5.5 /
> Grok 4.5 / Opus 4.7 / Sonnet 5）用同一套主力層提示策略，別為單一名字另調。

---

## Tier 3 — 快速經濟（Fast economy）

缺的是**過程與格式**。經典提示工程在這層全額有效：步驟清單 / 輸出格式契約 /
few-shot / XML 區塊 / 明確停止條件。**驗證外置**（測試、上層 agent、獨立
verifier）——不要指望它自查。Index 明顯低於主力密集帶（多數未列入 AA 榜前段）。

| 模型 | 供應商 | Intelligence Index | Cursor 選項名 | 建議檔位/旋鈕 | 備註 |
|---|---|---|---|---|---|
| Claude 4.5 Haiku | Anthropic | —（低於主力帶，未查得精確值） | `Claude 4.5 Haiku`（預設隱藏） | `effort` 低檔即可 | SKILL.md 正典的經濟層 Haiku 代表。便宜快，格式契約要寫死。 |
| GPT-5.4 Mini | OpenAI | —（低於主力帶，未查得精確值） | `GPT-5.4 Mini`（預設隱藏） | reasoning effort 低；cached 九折 | GPT-5.4 的小快變體（AA 對比顯示強於 4.5 Haiku，但遠低於主力帶）。 |
| GPT-5.4 Nano | OpenAI | —（最省） | `GPT-5.4 Nano`（預設隱藏） | 低 | 最小 GPT-5.4，成本優先。開放判斷別交給它。 |
| GPT-5 Mini / GPT-5.1 Codex Mini | OpenAI | — | `GPT-5 Mini` / `GPT-5.1 Codex Mini`（預設隱藏） | reasoning effort 低 | 前代 mini / 編碼 mini（4× rate limit）；量大、格式固定的子任務。 |
| Gemini 3.5 Flash | Google | —（未查得精確值；速度-智慧 Pareto 前緣領先） | `Gemini 3.5 Flash` | thinking 低/關 | 2026-05 發布，AA 稱其在「智慧 vs 速度」Pareto 前緣領先。Flash 系當前檔，快、便宜。 |
| Gemini 3 Flash / 2.5 Flash / Flash-Lite | Google | — | `Gemini 3 Flash` / `Gemini 2.5 Flash`（預設隱藏） | thinking 低/關 | 前代 Flash。批量、格式化任務。 |
| Composer 2.5 Fast | Cursor | — | `Composer 2.5 Fast` | 預設快檔 | Free plan 唯一可選項。互動編碼可上探主力；開放推理按經濟層給腳手架。 |
| Composer 1 | Cursor | — | `Composer 1`（預設隱藏） | 快 | 前代 Composer。 |
| DeepSeek V4 Flash | DeepSeek | —（最便宜 ~$0.01/1M，1M 上下文） | （Cursor 未內建；BYOK/自部署） | thinking 開關／部署方檔位 | AA 榜上最便宜之一（$0.01 blended），超長上下文。經濟層開源。 |
| GLM（較小/較舊檔）、Gemma 4、Mistral Small、Phi-4、Qwen3.5 小檔、gpt-oss-20B | Z.ai / Google / Mistral / Microsoft / Alibaba / OpenAI | —（開源；啟發式） | 多數 Cursor 未內建（BYOK/自部署） | thinking 開關／部署方檔位；vLLM guided decoding | tier-matrix「GLM 等開源主流」泛指的就是這一檔。格式契約 + few-shot + 外置驗證是必需。落位啟發式。 |

---

## 來源（2026-07-09 查證）

**智慧分數（落位數字錨）— Artificial Analysis Intelligence Index v4.1：**

- 模型總表 / 榜單（Fable 5=60、Opus 4.8=56、GPT-5.5 xhigh=55、Grok 4.5 high=54、Opus 4.7=54、Sonnet 5=53；開源首 GLM 5.2 max=51）：<https://artificialanalysis.ai/models>
- Grok 4.5（high）Index 54、#4、$2/$6、~87 TPS、500k 上下文：<https://artificialanalysis.ai/models/grok-4-5?intelligence=artificial-analysis-intelligence-index>
- GPT-5.5（xhigh）Index 55、#3、$5/$30：<https://artificialanalysis.ai/models/gpt-5-5?intelligence=artificial-analysis-intelligence-index>
- Claude Opus 4.8（max）Index 56、#2：<https://artificialanalysis.ai/models/claude-opus-4-8?intelligence=artificial-analysis-intelligence-index>
- Claude Fable 5（with Opus 4.8 fallback）Index 60、#1、領先 4 分：<https://artificialanalysis.ai/models/claude-fable-5?intelligence=artificial-analysis-intelligence-index>
- Claude Sonnet 5（max）Index 53：<https://artificialanalysis.ai/models/claude-sonnet-5?intelligence=artificial-analysis-intelligence-index>
- Gemini 3.1 Pro Preview Index 46、#13（當前 v4.1；發布時曾以舊 v4.0 短暫登頂 ~57）：<https://artificialanalysis.ai/models/gemini-3-1-pro-preview?intelligence=artificial-analysis-intelligence-index>
- Gemini 3 Pro Preview Index 40（估）：<https://artificialanalysis.ai/models/gemini-3-pro?intelligence=artificial-analysis-intelligence-index>
- GLM-5.2（max）Index 51（開源之首）：<https://artificialanalysis.ai/models/glm-5-2>
- Index v4.1 方法論與開源榜（DeepSeek V4 Pro 44、MiniMax M3 44、Kimi K2.6 43、MiMo-V2.5-Pro 42；Fable 5 領先 4 分但目前不可用）：<https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-1>

**提示層級校準（各層「該怎麼提示」的定性依據）— Anthropic 官方 per-model 指南：**

- Claude Fable 5 / Mythos 5（frontier：拆腳手架、自主權、證據錨定進度、勿要求復述推理否則 refusal）：<https://platform.claude.com/docs/zh-TW/build-with-claude/prompt-engineering/prompting-claude-fable-5>
- Claude Opus 4.8（主力：字面遵循、明確範圍、覆蓋率聲明、升 effort 先於改提示）：<https://platform.claude.com/docs/zh-TW/build-with-claude/prompt-engineering/prompting-claude-opus-4-8>
- Claude Sonnet 5（主力：字面遵循、adaptive thinking 預設開、不接受 temperature）：<https://platform.claude.com/docs/zh-TW/build-with-claude/prompt-engineering/prompting-claude-sonnet-5>

**Cursor 可選模型 / 價格 / 隱藏預設：**

- Cursor 可選模型與說明：<https://cursor.com/help/models-and-usage/available-models>
- Cursor Models & Pricing（完整型號 / 價格 / 隱藏預設 / reasoning 變體）：<https://cursor.com/docs/models-and-pricing>
- Grok 4.5 官方（$2/$6、token 效率、歐盟暫缺）：<https://x.ai/news/grok-4-5>
- Grok 4.5（Cursor 官方 blog，一方模型、fast 變體 $4/$18）：<https://cursor.com/blog/grok-4-5>

**旁證（Elo，僅用於未列 AA 榜者的啟發式落位）：**

- LMArena 文字榜（Elo 名次）：<https://arena.ai/leaderboard/text>

**未坐實 / 交待給讀者（flag）：**

- **Muse Spark**：AA Intelligence Index **未查得**，落主力靠 LMArena Elo 旁證
  （~1485–1493）+「既非榜首亦未拉開間距」的規則推論；實戰前用歸層探針坐實。
- **快速經濟層多數模型**（Haiku 4.5、GPT-5.4 Mini/Nano、Gemini 3.5 Flash 等）
  的**精確 Index 值未查得**（未列入 AA 榜前段或僅見於對比頁）；本表只確認其
  「明顯低於主力密集帶」，未標具體分數。
- **Gemini 3 Pro = 40** 為 AA 標示的**估值**（獨立評測待補）。
- **Gemini 3.1 Pro** 的 57 是**舊 v4.0** 指數的短暫登頂值；本表採**當前 v4.1**
  的 46（#13），兩者非同一把尺，勿混用。
- 所有開源權重模型的落位受具體部署（量化、檔位、推理版）顯著影響，實戰前坐實。
- Cursor 選單為分平台/分方案動態清單且頻繁改版；「Cursor 選項名」以
  2026-07-09 的 Models & Pricing 頁為準，實際以你帳號的 Settings › Models 為準。
