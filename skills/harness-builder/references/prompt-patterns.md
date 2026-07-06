# 約束層文本 pattern：反偷懶提示詞的寫法

約束層（CLAUDE.md / AGENTS.md / skill）的目標是讓 agent 在沒有 gate 的地方
也大概率做對。本文蒸餾兩個來源：Bun（oven-sh/bun，超大型 OSS 的 agent 化
開發）與本方法論的參考實現工程（見 worked-example.md）的實證做法。

## P1. 重新定義「完成」，而不是追加要求

弱寫法是加待辦（「記得跑測試」），強寫法是改判定——讓「沒做 X」在語義上
等於「任務失敗」，agent 無法在自我敘事裡把它標記為完成：

> Bun 原文："All changes must be tested — if you're not testing your changes,
> you're not done."
> Bun 原文："Get your tests to pass. If you didn't run the tests, your code
> does not work."（不可反駁的邏輯短路）
> Bun 原文："Your test is NOT VALID if it passes with `USE_SYSTEM_BUN=1`."

參考實現的對應寫法：「窄跑只能用於開發迭代，**不算收環**」——同樣是判定式措辭。

## P2. 機械化 Red：用「舊版本也綠」判定測試無效

TDD 的「確認失敗原因符合預期」通常靠自覺。Bun 把它機械化成雙跑證明：

> "Verify your test fails with `USE_SYSTEM_BUN=1 bun test <file>` and passes
> with `bun bd test <file>`."

用不含改動的舊 binary 跑新測試——舊版本也綠，就證明測試根本沒測到你的改動。
移植方式：任何有「舊版本可執行」的工程都適用（舊 HEAD worktree、上一版
image、系統安裝版 vs 本地 build）。這是「假測試」的機器判定，值得配 hook。

## P3. 空洞斷言獵殺清單（具體反例 > 抽象原則）

「不要只測 mock」「要充分測試」都太抽象，agent 無法字面匹配自己的行為。
Bun 給的是可獵殺的具體 pattern：

> "Every assertion must be able to fail, and assert the strongest invariant."
> "Hunt vacuous patterns: un-awaited `.rejects`/`.resolves`, expects inside
> catch blocks…"
> "Prove the test fails for the RIGHT reason."

同理適用於實作層的偷懶黑名單：

> "Don't write: `// TODO fix later`, stub implementations, `⚠️ incomplete`"
> "Every line you add must be demonstrably live."
> "Delete dead code in the same PR that makes it dead."
> "Never add production code solely to make a test writable."

**寫法要領**：每條禁令都給出可字面匹配的反例字串。agent 生成代碼時會對照
到具體 token，抽象原則對不上。

## P4. 匯報層誠實獨立立規

「假完成報告」與「假實作」是兩個病，要分開立規。Bun 明文：

> "NEVER overstate what you got done or what actually works in commits, PRs
> or in messages to the user."
> "Never swallow a failure or signal success on one." / "never warn-and-exit-zero"

注意 "warn-and-exit-zero" 下放到了每個 operation 層級——腳本吞掉失敗然後
exit 0，是 harness 世界裡最陰險的謊言（上游一切綠，實際什麼都沒驗）。

## P5. 事故敘事 > 感嘆號

對灰色地帶（agent 需要判斷的場景），解釋 why 比堆疊 MUST 有效。參考實現
的部署憲章寫了「兩類真實發生過的事故」（覆蓋事故/丟失事故），紅測試協議
寫了「事後考古成本十倍」——agent 讀到因果鏈後能推廣到未列舉的情況。
純威嚇（NEVER/ALWAYS）保留給有明確反例字串的具體行為。全大寫節制使用，
只給最高優先級的少數詞（CRITICAL / NEVER / NOT VALID），通貨膨脹會使其失效。

## P6. 提示詞 ↔ 機關一一對應

最重要的結構原則：**約束層每寫一條 Never，強制層對應一個 deny。**

Bun 的教科書案例：CLAUDE.md 說 "Never use bun test directly"，
`.claude/hooks/pre-bash-guard.js` 就真的 deny `bun test <file>` 直跑
（會跑到舊 binary）、deny 從 root 無檔名跑全量、deny `timeout` 包 `bun bd`。
提示詞教正確做法，hook 攔錯誤做法，兩層互為備份。

寫 CLAUDE.md 時的自查法：逐條規則標注機關落點；標不出來的規則要麼補機關，
要麼顯式標記「待機關化」——不要讓讀者（包括未來的自己）誤以為它有約束力。

## P7. 主檔只留常駐律，深度知識拆 skill

CLAUDE.md 的每個字都佔每個 session 的上下文預算。Bun 把 7 個窄領域拆進
`.claude/skills/`（主檔只留構建/測試/架構/PR 通用律）；參考實現把 57k 的
設計規範拆成 5 個按需觸發的 skill，主檔留 16k 核心。

判定標準：這段內容是「每個 session 都需要」還是「特定任務才需要」？
後者拆出去，配觸發機制（hook 按路徑/關鍵字注入建議）。

## P8. 用戶可感語言與內部語言分層

harness 規則文本是內部語言（給 agent 讀，術語越精確越好）；但如果工程有
outbound 面（用戶通知、發布文案），要為它單獨立規（黑名單詞表 + 翻譯練習表
+ 送出前 checklist），因為 agent 默認會把內部敘事洩漏到用戶文案裡。

## 反模式清單

- **規則堆積無落點**：CLAUDE.md 長成法典但零 hook/CI —— agent 高壓下按丟失
  上下文的優先序隨機遵守。
- **警告通脹**：每條都 IMPORTANT，等於沒有 IMPORTANT。
- **只寫禁止不寫替代**：deny 訊息與規則都要指路（「不要 X，改用 Y」），
  否則 agent 會發明第三種錯法。
- **規則與現實漂移無檢查**：規則引用的腳本/路徑改名後文本沒人更新——
  用 live 一致性檢查腳本把「文檔引用的東西存在」也變成不變量。
