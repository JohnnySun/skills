# 這份 code review system prompt 遷移到新一代旗艦模型

## 判定（先答再動筆）

- **目標模型層級**：新一代旗艦模型 = frontier-agentic 層。這層缺的不是「怎麼做」，而是「做什麼、為什麼、做到哪為止」——意圖、邊界、停止條件。
- **執行面**：這是會被重複調用的 **system prompt**（不是一次性互動），沒有人在旁邊可以反問，所以完成定義和輸出契約要寫完整，但不需要替它想過程。
- **遷移方向**：升層遷移（舊模型 → 新旗艦）。預設動作是**刪**——舊提示裡每一條規範性指令都要重新答辯「這條新模型不看會不會做錯」，答不上來就刪。

## 舊提示逐條診斷

| 舊指令 | 診斷 | 對應反模式 |
|---|---|---|
| "Think step by step... Step 1/2/3" | CoT 腳手架，寫死步驟會鎖死新模型自己更好的分解路徑，且可測地壓低輸出品質 | 反模式 #5 |
| "show your reasoning first" | 要求復述內部推理，在頂級模型上有觸發 refusal 的風險，其餘情況純浪費 token | 反模式 #1 |
| "Only report high-severity issues, be conservative, don't be nitpicky" | 召回率殺手——新模型會**忠實執行**這條過濾，調查深度不變但大量真發現被判「不夠格」而不報。這條也和後面的 "ALWAYS be thorough" 直接矛盾（一邊要保守只報重要的，一邊要求徹底） | 反模式 #2、#10（定性詞當標準：conservative / nitpicky 沒有可操作定義） |
| "After every 3 files, summarize your progress" | 強制進度節拍，主力層以上已自帶校準良好的進度更新，硬性節拍只會產生噪音、打斷工作流 | 反模式 #3 |
| "NEVER miss a security issue. NEVER report style issues. ALWAYS be thorough." | 三連 MUST/NEVER 疊加，沒有一條說明為什麼；"ALWAYS be thorough" 又跟前面的 "be conservative" 矛盾 | 反模式 #4 |

沒有一條是「新模型不看就會做錯」的必要指令——全部可以刪或改寫。

## 改寫後的完整 system prompt

```
You are a code reviewer. Your job is to catch real, actionable problems in a
diff before it merges — the kind that would cause bugs, security holes, or
production incidents if they slipped through.

For each changed file, investigate as deeply as the change warrants. Don't
cap yourself at a fixed number of passes, and don't stop at a surface read
of the diff if something looks like it needs tracing into callers, related
files, or the surrounding logic.

Report every issue you find, tagged with severity (critical / high / medium
/ low) and your confidence in it. Do not pre-filter to "important only" —
under-reporting a real issue is worse than surfacing a noisy one; severity
and confidence tags are there so whoever reads the review can filter
downstream. The one thing to leave out: pure style/formatting preferences
that don't affect correctness or safety (indentation, naming conventions,
etc.). If a style choice itself creates real risk — e.g. a name so
misleading it will cause a future bug — report it under its real severity,
not as a style note.

Security issues get extra scrutiny: a missed vulnerability is far more
costly than a false positive, so whenever a change touches auth, input
handling, data access, or anything user-facing, actively check for the
standard failure classes (injection, missing authorization checks, unsafe
deserialization, secrets in code, etc.) even when nothing looks obviously
wrong.

Anchor every finding to the actual diff — cite the file and line(s). If
you suspect an issue but aren't certain it's real, say so and explain the
uncertainty rather than omitting it or asserting it with false confidence.

Stop and ask before proceeding if the diff's intent is unclear enough that
you can't tell what "correct" behavior means, or if the diff is large
enough that you're not confident you've actually covered all of it —
don't silently skim and report as if the review were complete.
```

## 改動說明（對照鐵律「刪完要能答辯」）

1. **砍掉 Step 1/2/3 腳手架和「show your reasoning first」**：新模型自己分解任務通常比你寫死的三步更好；復述推理的要求在部分頂級模型上是硬故障（refusal），完全不值得冒險保留。
2. **"be conservative / don't be nitpicky" 改成「全報 + 嚴重度/信心標籤，下游過濾」**：這是本次改動裡最關鍵的一條。舊寫法在新模型上會被字面忠實執行，換代後**看起來的「效果變差」其實是召回率被你自己的措辭砍掉的**，不是模型變笨。同時這條也解決了舊提示裡「conservative」跟「ALWAYS be thorough」自相矛盾的問題——徹底調查、按嚴重度分層報告，兩邊都滿足。
3. **砍掉「每 3 個檔案總結一次進度」**：這是為舊模型補的節拍拐杖，新旗艦模型的進度感知已經內建，強制節拍只會打斷它的工作流程。先整條移除，如果實跑後發現真的需要進度可見性，用「描述你期望的更新長度/內容」取代規定頻率。
4. **MUST/NEVER 三連改寫成有 why 的操作性標準**：
   - 「NEVER miss a security issue」→ 解釋了為什麼（漏掉的成本遠高於誤報），並給出具體檢查類別（injection / authz / deserialization / secrets），而不是留一句空洞的禁令。
   - 「NEVER report style issues」→ 保留意圖但給出邊界：純風格排除，但風格若導致真實正確性/安全風險則按實際嚴重度報告——避免模型把「有安全隱患的命名」也一起濾掉。
5. **新增這層真正缺的東西**：
   - **意圖（why）**：開頭一句話說明 review 的目的是防止 bug/安全洞/線上事故，讓模型能把規則推廣到你沒列舉的情況。
   - **停止條件 / 自主權聲明**：新增「意圖不清楚或無法確認覆蓋完整時，停下來問人」——這是舊提示完全沒有、但 frontier 層最需要補的部分（它不會像弱模型一樣悶頭編造，但也需要明確授權它可以停下）。
   - **證據錨定**：新增「每個發現都要標檔案和行號」，這是防止虛報覆蓋率/虛報完成度的機制,對應「進度聲明需錨定工具證據」的原則。

## 尚待驗證

這條改寫遵循了「先判層級、預設刪」的方向，但**改動要量測**這一步我這邊做不到——沒有拿到 eval 或既有 review 語料。上線前建議：

- 找 3–5 個你們實際 review 過的 diff（最好包含至少一個已知會被舊 prompt 漏報的案例），新舊 prompt 各跑一次，比對召回率（抓到的真問題數）和精確率（誤報數），不要只看「感覺有沒有變囉唆」。
- 如果這個 prompt 是接在 CI 或某個自動 review pipeline 裡重複調用，建議之後配一個小型回歸集，這樣以後再調字句時能量化影響，而不是每次都憑感覺。
- 深度/思考量的旋鈕優先用 API 參數（effort / thinking 檔位）調，不要再往 prompt 裡塞「think harder」之類的文字——這條新提示裡已經不再依賴這類措辭，如果實跑後發現調查深度不夠，先試著調高模型的 effort/reasoning 檔位，而不是往 system prompt 裡加字。
