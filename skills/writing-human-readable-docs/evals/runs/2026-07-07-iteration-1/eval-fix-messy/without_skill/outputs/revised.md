# RelayGW v2 灰度切流與 Affinity 遷移說明

> 適用對象：所有接入 RelayGW（relay 服務）的業務工程師。不需要了解 relay 內部實作細節，只需要知道「我的服務要改什麼」。

## 一句話總結

RelayGW 正在從 v1 灰度切換到 v2。如果你的服務**有直接讀 Redis 裡的 affinity key**、**有寫死超時時間**、或**有自己的 Grafana dashboard**，你都需要照下面的清單動手改；其他情況只需要留意切流時程即可。

---

## 1. 這次改了什麼

| 項目 | v1（現行） | v2（新版） |
|---|---|---|
| Affinity Redis key 格式 | `rg:aff:{cid}` | `rg2:aff:{cid}:{bucket}` |
| Affinity key TTL | 300 秒 | 900 秒 |
| 服務入口（Endpoint） | 原本的 v1 endpoint | `relay-v2.internal:8443` |
| 身份驗證方式 | Basic Auth | **mTLS**（Basic Auth 在 v2 完全不吃） |
| Connect timeout（預設） | 5 秒 | 2 秒 |
| Read timeout（預設） | 60 秒 | 30 秒 |
| 監控指標前綴 | `relay_request_total` | `rgw2_request_total` |
| Prewarm 腳本 | `scripts/prewarm.sh` | 新腳本（見下方「你需要做的事」） |

**為什麼 key 格式要改、超時要收緊：** v1 在高併發下，同一個 key 的多個請求會互相卡住（術語叫 singleflight 擊穿），導致對下游重複建立連線。v2 用 bucket 分片的方式把 key 拆開，緩解這個問題；同時團隊觀察到實際請求 p99 只要 1.2 秒，所以把預設逾時收緊到 2 秒 / 30 秒，避免真的出問題時，過長的逾時讓排隊塞車更嚴重。想看背後的壓測數據可以查 **RFC-2841**，這裡不展開。

---

## 2. 灰度時程

灰度是按「租戶（tenant）」為單位切的，不是全站一次切換。

| 階段 | 灰度比例 | 時間 |
|---|---|---|
| 目前 | 5% | 已上線 |
| 下一階段 | 50% | 下週三 |
| 全量 | 100% | 下下週一 |

**如何知道自己受影響：** 如果你的 tenant 被排進灰度名單，你的流量就會走 v2 endpoint（`relay-v2.internal:8443`），並套用上面表格裡 v2 的所有規則（mTLS、新逾時、新 key 格式）。灰度期間你的 tenant 有可能還沒被切到，屆時流量仍走 v1、規則不變。

---

## 3. 你需要做的事（Checklist）

### 3.1 如果你的服務會直接讀 Redis 裡的 affinity key
- [ ] 把讀取 key 的邏輯從 `rg:aff:{cid}` 改成新格式 `rg2:aff:{cid}:{bucket}`。
- [ ] **停用舊的 `scripts/prewarm.sh`**：這支腳本是針對舊 key 格式寫的，v2 上線後它抓的 key 已經對不上，繼續跑也不會有效果，請改用新版 prewarm 腳本（若尚未取得，請洽 `@relay-oncall`）。

### 3.2 如果你被切到 v2 endpoint
- [ ] 改用 mTLS 憑證，從 Vault 的 `secret/relay/v2/client` 路徑下載用戶端憑證。
- [ ] 移除舊的 Basic Auth 邏輯（v2 不接受 Basic Auth，硬打會直接收到 401）。
- [ ] 若呼叫真的需要比 30 秒更長的處理時間（例如批次型 API），可以在請求帶上 header `X-Relay-Timeout` 自訂逾時秒數，**上限 120 秒**，超過會被強制截斷成 120 秒。

### 3.3 如果你有自己維護監控 Dashboard
- [ ] 指標名稱要跟著改：`relay_request_total` → `rgw2_request_total`（前綴變了，其餘沿用）。
- [ ] Dashboard 需要各團隊自行更新，relay 團隊不會逐一協助改。Grafana 上已提供範本 **`RGW2-template`**，可直接 clone 後修改。

### 3.4 容量評估（如果你的 Redis 集群資源本來就吃緊）
- [ ] 灰度期間（affinity 遷移窗口）v1 與 v2 的 key 會**同時寫入（雙寫）**，預期讓 Redis 記憶體用量增加約 **15%**。若你的集群容量本來就緊張，請提前評估是否需要擴容。
- [ ] 灰度窗口結束後，v1 的舊 key 會**自然過期**，不需要手動清除。

---

## 4. 常見問題

**Q：切到 v2 之後打 API 收到 401，怎麼辦？**
A：v2 只認 mTLS，不接受 v1 的 Basic Auth。先確認你是否已經改用從 Vault `secret/relay/v2/client` 拉下來的憑證，這是最常見的原因。

**Q：我沒改任何 timeout 設定，但請求變得比較容易逾時？**
A：v2 預設 connect timeout（2 秒）與 read timeout（30 秒）都比 v1 更嚴格。如果你的呼叫本來就需要較長時間（例如批次接口），可用 header `X-Relay-Timeout` 覆蓋，最高可設到 120 秒。

**Q：想知道 v1 為什麼會有重複建連的問題、v2 的壓測數據？**
A：詳見 RFC-2841，裡面有完整的壓測數據，本文件不重複說明。

---

## 5. 有問題找誰

有任何問題請洽 **`@relay-oncall`**，不要私訊個人。
