# 第一次部署服務到 Staging

給剛入職的工程師，說明如何把服務部署到 staging 環境。

## 前置準備

1. 到 IT portal 申請 **deployer 角色**（審批約需半天，請提早申請）。
2. 確認已連上**公司 VPN**。

## 部署步驟

1. 登入：
   ```
   dctl login staging
   ```
2. 部署服務：
   ```
   dctl deploy <service> --env staging
   ```
   約需 3 分鐘完成。

## 驗證部署成功

- 執行 `dctl status <service>`，確認狀態為 `healthy`。
- 開啟瀏覽器造訪 `https://staging.example.com/healthz`，確認回應為 `200`。

兩項都通過才算部署成功。

## 回滾

如果部署後發現問題，執行：
```
dctl rollback <service>
```

## 常見坑

- **未連 VPN 時執行 `dctl login` 會直接卡住直到 timeout**，畫面上不會顯示任何 VPN 相關的錯誤訊息。如果 `dctl login` 卡住沒反應，第一件事先檢查 VPN 是否連上，不要花時間查其他原因。
