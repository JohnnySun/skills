# 能力合格後的成本路由

價格決定「**同樣足夠好時選誰**」，不決定「任務需要多強的模型」。模型 tier
只決定提示厚度；成本路由在 tier 和任務最低能力門檻都已確定後才開始。

## 先分清三種決定

1. **平台預設**：若任務指定採用 Claude Code 或 Codex 的官方預設，保留該預設，
   不由本規則覆蓋。
2. **提示層級**：按 [SKILL.md](../SKILL.md) 的歸層與執行面，決定派工要加還是
   刪腳手架。不得因模型便宜而降低必要的提示層級。
3. **可選模型路由**：只在平台允許手選的模型中，依下方證據與成本規則選擇。

## 路由流程

### 1. 寫出任務的能力門檻

先記錄任務形狀與失敗代價：

- **品質優先**：不可逆操作、資安/資料風險、跨服務診斷、長自主實作。先取在
  該類任務有最佳獨立證據的配置；價格不推翻已坐實的品質領先。
- **成本可優先**：可拆分、可重跑、格式固定、外置驗證充分的批次工作。這可降低
  **任務能力門檻**，讓更多已合格配置參與成本比較；選中的配置仍按其行為證據決定
  prompt tier，並補齊格式與驗證契約。
- **中間帶**：日常 agentic coding。先找能力合格 cohort，再用成本打破平手。

模型名、代次與單一綜合分數不能替代這一步。

### 2. 建立可比較的能力 cohort

每一筆證據都要帶上 **模型 ID + effort / thinking 設定 + agent harness + 評測日期**。
不同 effort、不同工具 harness 或不同 benchmark 版本不能直接視為同一配置。

候選進 cohort 的依據按強度排序：

1. 同任務類型的可重現獨立評測，以及本專案的盲測 / A-B 評測；
2. 多個任務相關評測的交叉一致結果；
3. 僅用於初篩的綜合指數與 roster。

模型所有者的 benchmark 只能描述其主張，不能單獨證明它優於競爭者。若只有
所有者資料或不存在可比配置，標為**未坐實**：不要冠上「性價比之王」，先跑
本地小型 eval。

「Index 差 ≤3」只表示本 roster 的 tier 邊界可把模型暫列同層；它不是 agentic
coding、長上下文或工具使用的品質平手判定。某模型若在任務相關的獨立評測中持續
領先，便不是成本可直接替代的平手。

### 3. 在 cohort 內比較有效 token 成本

使用模型所有者公開的 token 價格，不使用客戶端的 pool、訂閱折扣、legacy
surcharge 或自家性能排行榜。Composer 類自研模型則以其所有者公開的 token
價格作為價格來源，但性能仍需獨立證據。

對預估 token 組合算：

```text
estimated_cost =
  input_tokens × input_rate
  + cached_input_tokens × cache_read_rate
  + cache_write_tokens × cache_write_rate
  + output_tokens × output_rate
  + documented per-tool charges
```

沒有工作負載 token 記錄時，明說採用的 input/output/cache 假設，不得只拿 input
單價宣稱較便宜。reasoning effort、agent 的工具回合數、輸出長度、cache 命中率和
快檔都會改變總成本。

## 2026-07-10 證據快照（只作起點）

下列不是永久排行，也不能把不同 harness 的分數直接搬到另一個客戶端；它提供
開始本地校準前的候選與價格來源。

| 配置 | 獨立證據（精確 configuration 另見研究 memo） | 所有者 token 價格（每 M：input / cache-write 或 cache-read / output） | 路由含義 |
|---|---|---|---|
| GPT-5.6 Sol `max` | DeepSWE v1.1：73%±3%（shared `mini-swe-agent`）；GDPval-AA：1748 Elo（shared Stirrup loop）；另有 Codex native index 80 | $5 / $6.25 write、$0.50 read / $30 | 高風險 coding、知識工作都有品質先驗；不把 Codex 80 直接搬到另一個 harness。 |
| GPT-5.6 Terra `max` | DeepSWE：70%±3%；GDPval-AA：1593 Elo；另有 Codex native index 77 | $2.50 / $3.125 write、$0.25 read / $15 | 品質和成本都要的候選，仍要以當前 harness 驗證。 |
| GPT-5.6 Luna `max` | DeepSWE：67%±4%；GDPval-AA：1592 Elo；另有 Codex native index 75 | $1 / $1.25 write、$0.10 read / $6 | 低成本但可推理的候選；不因名稱自動降為格式任務專用。 |
| Grok 4.5 `high` | GDPval-AA：1542 Elo（shared Stirrup loop）；另有 Grok Build native index 76 | $2 / $0.50 read / $6 | GDPval 型工作落後 Sol；coding index 的 76 與 Sol 的 80 是不同 native harness，需本地對照。 |
| Composer 2.5 | AA 舊版 Coding Agent Index 62（評測日期與上列不同） | $0.50 / $0.20 read / $2.50 | 有獨立歷史證據但非當期同條件比較；先跑本地 eval，再宣稱 value leader。 |
| GLM-5.2 `max` | DeepSWE：44%±2%（shared `mini-swe-agent`）；GDPval-AA：1514 Elo（shared Stirrup loop）；另有 Claude Code native index 58 | $1.40 / $0.26 read / $4.40 | 價格有優勢，但兩個 shared-harness 結果皆低於 GPT-5.6 family 的列出配置。 |
| GPT-5.3 Codex (xhigh) | 本快照未找到與上述同版 Coding Agent Index 可比的配置 | $1.75 / $0.175 read / $14 | 先以本地 eval 確認，不能因「Codex」名稱或較低 input 價格自動入選。 |

**來源：**

- GPT-5.6 的三個配置、Coding Agent Index 與 token 價格：
  <https://artificialanalysis.ai/articles/gpt-5-6-has-landed>、
  <https://openai.com/index/gpt-5-6/>。
- Shared-harness coding 與 agentic knowledge-work 證據：
  <https://deepswe.datacurve.ai/>、
  <https://artificialanalysis.ai/evaluations/gdpval-aa>。
- Grok 4.5 的獨立 agent 評測與官方價格：
  <https://artificialanalysis.ai/articles/grok-4-5-brings-spacexai-to-the-the-intelligence-frontier>、
  <https://docs.x.ai/developers/models/grok-4.5>。
- Composer 2.5 的獨立評測與所有者價格：
  <https://artificialanalysis.ai/articles/cursor-composer-2-5-coding-agent-index>、
  <https://cursor.com/docs/models-and-pricing>。
- GLM-5.2 的 AA agent 結果與官方價格：
  <https://artificialanalysis.ai/agents/coding-agents>、
  <https://docs.z.ai/guides/overview/pricing>。
- GPT-5.3 Codex 的官方模型與價格：
  <https://developers.openai.com/api/docs/models/gpt-5.3-codex>。
- 完整的可比性條件、信賴區間與缺口見
  [research memo](../../../../../docs/specs/20260710-price-aware-model-routing/research.md)。

### 4. 輸出能被覆核的路由決策

每次選型至少報告：

- 任務能力門檻與選用的提示 tier；
- 入選模型的精確配置與任務相關獨立證據；
- 各候選的價格來源 URL、查閱日期、token 假設與估算成本；
- 未選品質較高候選的理由，或未選便宜候選缺少的證據；
- 需要本地 eval 的不確定性。

## 何時先跑本地 eval

以下任一項成立，不要把成本排行當結論：

- 只有不同 harness 下的分數，沒有同條件比較；
- owner 的自家 benchmark 是唯一性能證據；
- 新模型尚未有任務相關獨立資料；
- 任務風險高，而品質差距不確定；
- 估算成本依賴未知的長輸出、快取命中或工具回合。

用同一份任務集、相同工具和 effort 設定測成功率、驗證通過率、總 token、wall time
與 token 成本；只在品質達到門檻後讓成本做決勝。
