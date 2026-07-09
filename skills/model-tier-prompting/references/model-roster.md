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
> **證據等級**：leaderboard（LMArena / Artificial Analysis）Elo 名次只是
> 歸層的**旁證**，本表由排名推導的落位一律標「（啟發式）」。真正決定層級的是
> 行為（字面遵循度、拆腳手架後是否更好、自我驗證可信度），不是 Elo 幾分。

## 怎麼讀這張表

- **層級**：對應 SKILL.md 三層。決定你的提示要**加腳手架**還是**拆腳手架**。
- **Cursor 選項名**：Cursor 模型選單（Settings › Models）裡看到的名字；空白＝
  當前 Cursor 選單未內建（可能需 Add Model 或 BYOK，或根本不在 Cursor 生態）。
  Cursor 選單比 Claude Code / Xcode 大得多，故本表對 Cursor 可選項給重點覆蓋。
- **建議檔位/旋鈕**：遵循 SKILL.md「參數先於提示」——先調這個，再改提示文本。
- 邊界模型（frontier ↔ 主力之間）標「邊界」，並說明「在什麼檔位/場景下按哪層對待」。

---

## Tier 1 — Frontier-agentic（頂級旗艦）

缺的是**授權與邊界**不是能力。提示要：why / 驗收 / 什麼不該做 / 證據錨定進度 /
自主權聲明。要**刪**：CoT 步驟、逐條行為列舉、強制節拍、推理復述、上下文倒數。

| 模型 | 供應商 | 層級 | Cursor 選項名 | 建議檔位/旋鈕 | 備註 |
|---|---|---|---|---|---|
| Claude Fable 5 | Anthropic | Frontier-agentic | `Claude Fable 5` | `effort` 高～max；adaptive thinking | 當前 LMArena 文字榜 / Artificial Analysis 智慧指數 #1（約領先次名數分）。約 Opus 4.8 兩倍成本（$10/$50）。Cursor 內需資料留存/隱私模式核可；觸發安全 guardrail 的請求會自動改路由到 Opus。跨多日長自主、平行子代理的首選。 |
| Claude Opus 4.8（max/thinking） | Anthropic | 邊界：主力↔Frontier | `Claude Opus 4.8` | `effort` max + thinking；Cursor 需 Max Mode | 榜上緊貼 Fable 5。**低/中檔位按主力對待**（字面化、可預測）；**max + thinking 跑開放式難題時按 frontier 對待**（拆腳手架、給邊界）。SKILL.md 正典把 Opus 4.8 列主力代表——本列只說明「頂檔位時行為上探」，不改正典落位。 |
| GPT-5.5（high/xhigh） | OpenAI | 邊界：主力↔Frontier | `GPT-5.5` | reasoning effort high/xhigh；Cursor 需 Max Mode | GPT 系當前旗艦（$5/$30，最貴的 GPT）。比 GPT-5.4 更省 token、長任務續航更好。xhigh 開放式任務按 frontier 對待，一般編碼管線按主力。 |
| Gemini 3.1 Pro | Google | 邊界：主力↔Frontier | `Gemini 3.1 Pro` | thinking / reasoning 拉高 | Google 當前主力旗艦，榜上 frontier 段。Cursor Pro 預設開啟。多模態與長上下文強。開放式難題按 frontier，日常按主力。 |
| Muse Spark | Meta | 邊界（啟發式） | （Cursor 未內建） | 依供應商 | Meta 的 frontier 級專有模型，LMArena ~1485–1493。Cursor 選單目前無；列此供跨生態歸層參考。落位啟發式。 |

> 純 frontier（無邊界標註）目前只有 **Claude Fable 5** 一款可明確坐實；其餘旗艦
> 在「頂檔位＝frontier 行為、常檔位＝主力行為」之間游移，故標「邊界」。遇到
> 邊界模型，**先看你要跑的檔位與任務開放度**再決定加/拆腳手架，不要只看名字。

---

## Tier 2 — 主力（Strong workhorse）

缺的是**範圍與觸發時機**。指令被**字面**遵循、不自動推廣。提示要：明確範圍 /
工具使用時機 / 正面範例 / review 覆蓋率聲明。效果不好**先升檔位再改提示**。

| 模型 | 供應商 | 層級 | Cursor 選項名 | 建議檔位/旋鈕 | 備註 |
|---|---|---|---|---|---|
| Claude Opus 4.8 | Anthropic | 主力 | `Claude Opus 4.8` | `effort`（low→max）+ adaptive thinking；Max Mode 開長上下文 | SKILL.md 正典的主力代表。有 fast 變體（`claude-opus-4-8-fast`）。強字面化、少反覆，適合調好的管線。 |
| Claude Sonnet 5 | Anthropic | 主力 | `Claude Sonnet 5` | `effort` + thinking | 新一代 Sonnet（用新 tokenizer，同輸入 token 數會偏高）。發布促銷價。日常主力。 |
| Claude Opus 4.6 / 4.7 | Anthropic | 主力 | `Claude 4.6 Opus` / `Claude 4.7 Opus` | `effort` + thinking | 前代 Opus，仍是紮實主力；4.7 有 fast/研究預覽變體（很貴）。 |
| Claude Sonnet 4.6 | Anthropic | 主力 | `Claude 4.6 Sonnet` | `effort` + thinking | Cursor Pro 預設。性價比主力，日常編碼常用。 |
| Grok 4.5 | Cursor × SpaceXAI | 主力（啟發式；供應商稱 Opus-class） | `Grok 4.5`（Cursor 一方模型/旗艦） | reasoning；有 fast 變體（$4/$18）；base $2/$6 | 2026-07-08 發布，與 Cursor 合訓的 MoE。**成本/token 效率是最大賣點**：約 Opus 4.8 的 4.2× token 效率、80 TPS。獨立 benchmark：Terminal-Bench 2.1 逼近 GPT-5.5，DeepSWE 1.1 明顯落後 Fable/GPT-5.5，SWE-Bench Pro 部分配置勝 Opus 4.8。**「Opus-class」是廠商說法，第三方獨立分數尚未齊備**，故落主力（啟發式）。歐盟暫不可用。長跑編碼/知識工作性價比首選。 |
| Composer 2.5 | Cursor | 主力（編碼特化，偏快） | `Composer 2.5` | 檔位少、預設快；適合互動編碼 | Cursor 自訓、為 agentic coding 調校，$0.5/$2.5 很便宜、快。能力介於主力↔快速經濟：**互動編碼按主力用，開放式難推理按經濟層給腳手架**。First-party pool、免 Cursor Token Rate。 |
| GPT-5.4 | OpenAI | 主力 | `GPT-5.4` | reasoning effort（含 `gpt-5.4` high）+ verbosity；Cursor 需 Max Mode | GPT 主力檔，長上下文（Max Mode 至 1M）。cached input 九折。 |
| GPT-5.3 Codex | OpenAI | 主力（編碼特化） | `GPT-5.3 Codex` | `gpt-5.3-codex-high` 等 reasoning effort；Cursor 需 Max Mode | Codex 系代理編碼強項。Cursor Pro 預設集內。 |
| GPT-5.2 / GPT-5.2 Codex | OpenAI | 主力 | `GPT-5.2` / `GPT-5.2 Codex` | `gpt-5.2-high` 等 reasoning effort | 前代主力，仍紮實。 |
| GPT-5.1 Codex Max / GPT-5.1 Codex / GPT-5-Codex | OpenAI | 主力（編碼特化） | 同名（多為預設隱藏，需啟用） | reasoning effort | Codex 家族，代理式編碼；Max 為長任務變體。 |
| GPT-5 / GPT-5 Fast | OpenAI | 主力 | `GPT-5` / `GPT-5 Fast`（預設隱藏） | `gpt-5-high` 等；Fast 為 2× 價換速度 | 前代旗艦，仍屬主力段。 |
| Gemini 3 Pro | Google | 主力 | `Gemini 3 Pro`（預設隱藏） | thinking / reasoning | Gemini 前代 Pro，主力段。 |
| DeepSeek V4 Pro | DeepSeek | 主力（開源；啟發式） | （Cursor 未內建；BYOK/自部署） | thinking 開關／部署方檔位 | LMArena「frontier-adjacent」band。開源權重主力代表之一。落位啟發式。 |
| Qwen 3.7 Max | Alibaba | 主力（啟發式） | （Cursor 未內建） | reasoning 版本／thinking | 榜上 frontier-adjacent（~1450 段）。開源生態強主力。 |
| GLM 5.2 | Z.ai | 主力（開源；啟發式） | `GLM 5.2`（預設隱藏） | thinking 開關；vLLM guided decoding 可用 | LMArena ~1488。**注意**：tier-matrix 用「GLM 級」泛指經濟型開源主流那一檔，指的是較小/較舊 GLM；GLM 5.2 這個具體型號已上探到主力段——正是「具體型號要查本表、不要照泛稱套層」的示範。 |
| Kimi K2.7 Code | Moonshot | 主力（編碼特化；啟發式） | `Kimi K2.7 Code`（預設隱藏） | 依部署 | Moonshot 編碼向模型，Cursor 選單內。落位啟發式。 |
| Llama 4 Maverick | Meta | 主力偏下（開源；啟發式） | （Cursor 未內建） | 部署方檔位 | LMArena「strong/capable」band。開源，適合可控管線。落位啟發式。 |

> **檔位名跨代不等值**：新一代的 medium ≈ 上一代的 high。跨代遷移按**觀察到的
> 思考長度**對齊，不按檔位名（見 tier-matrix.md）。新一代主力多不接受
> temperature（會 400）——要多樣性改用「提案 N 個方向→選→實作」。

---

## Tier 3 — 快速經濟（Fast economy）

缺的是**過程與格式**。經典提示工程在這層全額有效：步驟清單 / 輸出格式契約 /
few-shot / XML 區塊 / 明確停止條件。**驗證外置**（測試、上層 agent、獨立
verifier）——不要指望它自查。

| 模型 | 供應商 | 層級 | Cursor 選項名 | 建議檔位/旋鈕 | 備註 |
|---|---|---|---|---|---|
| Claude 4.5 Haiku | Anthropic | 快速經濟 | `Claude 4.5 Haiku`（預設隱藏） | `effort` 低檔即可 | SKILL.md 正典的經濟層 Haiku 代表。便宜快，格式契約要寫死。 |
| GPT-5.4 Mini | OpenAI | 快速經濟 | `GPT-5.4 Mini`（預設隱藏） | reasoning effort 低；cached 九折 | GPT-5.4 的小快變體。 |
| GPT-5.4 Nano | OpenAI | 快速經濟（最省） | `GPT-5.4 Nano`（預設隱藏） | 低 | 最小 GPT-5.4，成本優先。開放判斷別交給它。 |
| GPT-5 Mini | OpenAI | 快速經濟 | `GPT-5 Mini`（預設隱藏） | 低 | 前代 mini。 |
| GPT-5.1 Codex Mini | OpenAI | 快速經濟（編碼） | `GPT-5.1 Codex Mini`（預設隱藏） | reasoning effort | 4× rate limit（相對 5.1 Codex）；量大、格式固定的編碼子任務。 |
| Gemini 3.5 Flash | Google | 快速經濟 | `Gemini 3.5 Flash` | thinking 低/關 | Flash 系當前檔，快、便宜。 |
| Gemini 3 Flash / 2.5 Flash | Google | 快速經濟 | `Gemini 3 Flash` / `Gemini 2.5 Flash`（預設隱藏） | thinking 低/關 | 前代 Flash。批量、格式化任務。 |
| Composer 2.5 Fast | Cursor | 快速經濟（編碼特化，最快） | `Composer 2.5 Fast` | 預設快檔 | Free plan 唯一可選項。互動編碼可上探主力；開放推理按經濟層給腳手架。 |
| Composer 1 | Cursor | 快速經濟 | `Composer 1`（預設隱藏） | 快 | 前代 Composer。 |
| GLM（較小/較舊檔）、Gemma 4、Mistral Small 3、Phi-4、DeepSeek V4 Flash | Z.ai / Google / Mistral / Microsoft / DeepSeek | 快速經濟（開源；啟發式） | 多數 Cursor 未內建（BYOK/自部署） | thinking 開關／部署方檔位；vLLM guided decoding | tier-matrix「GLM 等開源主流」泛指的就是這一檔。格式契約 + few-shot + 外置驗證是必需。落位啟發式。 |

---

## 來源（2026-07-09 查證）

- Cursor 可選模型與說明：<https://cursor.com/help/models-and-usage/available-models>
- Cursor Models & Pricing（完整型號 / 價格 / 隱藏預設 / reasoning 變體）：<https://cursor.com/docs/models-and-pricing>
- Grok 4.5 官方（SpaceXAI，$2/$6、token 效率、80 TPS、歐盟暫缺）：<https://x.ai/news/grok-4-5>
- Grok 4.5（Cursor 官方 blog，一方模型、fast 變體 $4/$18）：<https://cursor.com/blog/grok-4-5>
- Grok 4.5 獨立 benchmark 解讀（DeepSWE / Terminal-Bench / SWE-Bench Pro 混合結果、廠商 Opus-class 說法未經第三方坐實）：<https://the-decoder.com/grok-4-5-is-so-cheap-compared-to-fable-5-and-gpt-5-5-that-benchmark-gaps-may-not-matter-much/>
- LMArena 文字榜（Elo 名次，快照 2026-07-01）：<https://arena.ai/leaderboard/text>
- Chatbot Arena+ 聚合（Arena Elo / Coding / AAII / ARC-AGI）：<https://openlm.ai/chatbot-arena/>
- LMArena Elo band 對照（frontier / strong / capable / economy 分帶）：<https://www.swfte.com/lmarena>
- Claude Fable 5 獨立評測彙整（Artificial Analysis #1、Arena #1）：<https://aivy.com.au/news/claude-fable-5-review/>

**未坐實 / 交待給讀者**：

- Grok 4.5「Opus-class」為廠商自評，第三方獨立分數（LMArena / Artificial
  Analysis 等）發布時尚未齊備；本表落主力層為啟發式，若後續獨立分數上探請回填。
- 所有開源權重模型（DeepSeek / Qwen / GLM / Llama / Kimi 等）的落位以
  leaderboard band 推導，標「啟發式」；具體部署（量化、檔位、推理版）會顯著
  影響實際表現，實戰前用歸層探針坐實。
- Cursor 選單為分平台/分方案動態清單，且頻繁改版；「Cursor 選項名」欄以
  2026-07-09 的 Models & Pricing 頁為準，實際以你帳號的 Settings › Models 為準。
