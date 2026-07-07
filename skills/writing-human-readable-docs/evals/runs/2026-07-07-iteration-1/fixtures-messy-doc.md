# 關於 RelayGW v2 灰度切流以及 affinity 遷移的說明

各位注意一下，這次 RelayGW v2 上了之後 affinity 的 key 格式從 rg:aff:{cid} 換成了 rg2:aff:{cid}:{bucket}，因為 v1 的 singleflight 在高併發下會擊穿導致 upstream 重複建連，所以 v2 引入了 bucket 分片並且把 TTL 從 300 調到了 900，大家的服務如果有直接讀 redis 的要改一下，另外 prewarm 腳本也換了，原來的 scripts/prewarm.sh 不要再跑了跑了也沒用因為 key 格式不對。

灰度是按 tenant 維度切的，目前切了 5%，下週三切 50%，下下週一全量，如果你的 tenant 在灰度名單裡那麼流量會走 v2 的 endpoint 也就是 relay-v2.internal:8443，注意 v2 是 mTLS 的，證書要從 vault 的 secret/relay/v2/client 下面拉，v1 那套 basic auth 在 v2 是不認的，401 了不要來問為什麼，先檢查證書。

另外說一下超時，v2 的默認 connect timeout 是 2s read timeout 是 30s，比 v1 的 5s/60s 收緊了，因為我們觀察到 p99 其實只有 1.2s，長超時只會讓故障時的隊列堆積更嚴重，如果你的調用真的需要更長超時（比如批量接口）可以在 header 里帶 X-Relay-Timeout 覆蓋，但是上限 120s，超過會被 cap。

還有 metrics 的事，v1 的 relay_request_total 這些指標在 v2 都改了前綴叫 rgw2_request_total，dashboard 要自己去改，我們不會幫每個團隊改 dashboard，grafana 上有個模板叫 RGW2-template 可以 clone。

affinity 遷移窗口期間（就是灰度期間）雙寫是開著的，也就是 v1 和 v2 的 key 都會寫，所以 redis 內存會漲大概 15%，容量緊的集群自己評估一下，窗口結束後 v1 的 key 會自然過期不用手動清。對了 singleflight 擊穿的事如果想了解細節可以去看 RFC-2841，裡面有壓測數據，這裡就不展開了。

有問題找 @relay-oncall，別私聊我。
