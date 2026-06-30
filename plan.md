# Stellar Shield — 48h Plan

四八時限・星盾（Stellar Shield）築程：

## 起手 (Entrypoint)
立 `contracts/`。引 Soroban 暨 ZK 庫。

## 里程碑暨細務 (Milestones & Tasks)

### 一（0-12h）: Noir 憑證流 (Credentials)
* **電路 (Circuit)**: `nargo new`。撰 credential 電路（驗餘額、年歲、白名單）。
* **契約 (Contract)**: 撰 `zk_credential`。引 `rs-soroban-ultrahonk` 驗證。
* **測試 (Test)**: 擬 proof。測契約驗證邏輯。

### 二（12-24h）: R0 + Noir 資薪流 (Payroll)
* **客端 (Guest)**: 撰 R0 程式（驗 CSV 總額、憑證）。
* **電路 (Circuit)**: 撰 Noir 隱蔽轉賬電路。
* **契約 (Contract)**: 撰 `private_treasury`。合 R0 + Noir 雙驗證器。
* **發放 (Dist)**: 憑證校驗 → 撥款。

### 三（24-36h）: Circom 投票流 (Voting)
* **電路 (Circuit)**: 撰 Circom 投票電路（防重投、隱選擇）。
* **編譯 (Compile)**: 產 Groth16 密鑰。
* **契約 (Contract)**: 撰 `private_governance`。引 Groth16 驗證器。累積計票。

### 四（36-48h）: 前端與部署 (Frontend & Deploy)
* **錢包 (Wallet)**: 聯 Freighter。
* **產證 (Prover)**: 集成瀏覽器端 proof 產出（Noir JS, snarkjs）。
* **合流 (Integrate)**: 聯 Soroban RPC 提交交易。
* **部署 (Deploy)**: 投 Testnet。錄製演示。
