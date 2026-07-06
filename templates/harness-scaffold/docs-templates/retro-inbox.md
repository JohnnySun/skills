# Harness 自我反思 Inbox

> AI 在 session 結束前把「本 session 暴露的 harness 問題」追加到這裡；
> 週 retro 消費，轉成機關化工單或明確拒絕。條目只增不刪；處理完改 status。
> 消費工作流見 harness-operate skill。
>
> 格式（一條一個 `###`）：
> ```
> ### YYYY-MM-DD <一句話標題>
> - signal: 觸發反思的信號（deny/bypass/誤射/漏攔/流程摩擦）
> - 現象: 具體發生了什麼（可复現的描述）
> - 提案: 建議的機關化修法（hook 規則/lint/eval/流程）
> - status: new | consuming(<YYYY-MM-DD>) | converted(<WO/commit>) | rejected(<原因>)
> （consuming = 消費認領鎖兼當日打卡：pull → 改狀態單獨 commit → 立即 push；
>  push 被拒先 rebase：認領行起衝突＝撞鎖換條，無衝突重 push。本檔不得標
>  merge=union（會吃掉撞鎖衝突）。早於今日的 consuming 是殭屍鎖，優先回收）
> ```
